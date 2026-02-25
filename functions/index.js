const functions = require('firebase-functions');
const admin = require('firebase-admin');
const line = require('@line/bot-sdk');
const express = require('express');

// ══════ FIREBASE (auto-init ใน Cloud Functions) ══════
admin.initializeApp();
const db = admin.firestore();

// ══════ LINE CONFIG ══════
// ตั้งค่าด้วย:
//   firebase functions:config:set line.token="xxx" line.secret="yyy"
const lineConfig = {
  channelAccessToken: functions.config().line.token,
  channelSecret: functions.config().line.secret,
};
const client = new line.Client(lineConfig);

// ══════ CATEGORIES ══════
const EXP_CATS = [
  {
    id: 'exp_food', name: 'อาหาร/เครื่องดื่ม', icon: '🍜',
    words: ['ข้าว','กาแฟ','น้ำ','อาหาร','ก๋วยเตี๋ยว','ส้มตำ','หมู','ไก่','กุ้ง','ปลา','ผัด','ต้ม',
            'แกง','pizza','พิซซ่า','burger','ชา','ชาไข่มุก','บิงซู','ขนม','ลูกชิ้น','ซูชิ','ราเมน',
            'สุกี้','หมูกระทะ','ข้าวมันไก่','ข้าวหมูแดง','ร้านอาหาร','เบียร์','กินข้าว','ข้าวต้ม'],
  },
  {
    id: 'exp_transport', name: 'เดินทาง', icon: '🚌',
    words: ['แท็กซี่','taxi','รถ','บัส','bus','mrt','bts','รถไฟ','grab','bolt','รถเมล์',
            'ค่ารถ','น้ำมัน','เรือ','ทางด่วน','parking','จอดรถ','uber','วิน','มอเตอร์ไซค์'],
  },
  {
    id: 'exp_shop', name: 'ช้อปปิ้ง', icon: '🛍️',
    words: ['เสื้อ','กางเกง','รองเท้า','กระเป๋า','ช้อป','shop','lazada','shopee','ซื้อ','ของ',
            'ห้าง','mall','central','สยาม','ไอคอน','amazon'],
  },
  {
    id: 'exp_beauty', name: 'ความสวยงาม', icon: '💄',
    words: ['ตัดผม','ทำผม','เล็บ','เสริมสวย','spa','สปา','นวด','ครีม','เครื่องสำอาง',
            'lipstick','ลิป','แป้ง','skincare','บิวตี้'],
  },
  {
    id: 'exp_health', name: 'สุขภาพ', icon: '💊',
    words: ['หมอ','โรงพยาบาล','ยา','คลินิก','ทันตแพทย์','ฟัน','hospital','clinic',
            'gym','ออกกำลัง','วิตามิน','fitness'],
  },
  {
    id: 'exp_entertain', name: 'บันเทิง', icon: '🎬',
    words: ['หนัง','ดูหนัง','cinema','netflix','spotify','คอนเสิร์ต','เที่ยว',
            'เกม','game','bowling','คาราโอเกะ'],
  },
  {
    id: 'exp_house', name: 'ที่พัก/บ้าน', icon: '🏠',
    words: ['ค่าเช่า','เช่า','ค่าน้ำ','ค่าไฟ','internet','ค่าอินเตอร์','คอนโด','อพาร์ท','rent'],
  },
];

const INC_CATS = [
  { id: 'inc_salary',    name: 'เงินเดือน', icon: '💼', words: ['เงินเดือน','salary','เดือน'] },
  { id: 'inc_freelance', name: 'ฟรีแลนซ์',  icon: '💻', words: ['ฟรีแลนซ์','freelance','ค่าจ้าง','ค่างาน'] },
  { id: 'inc_bonus',     name: 'โบนัส',     icon: '🎁', words: ['โบนัส','bonus','รางวัล'] },
  { id: 'inc_invest',    name: 'ลงทุน',     icon: '📈', words: ['ลงทุน','ปันผล','dividend','กำไร'] },
];

const INCOME_TRIGGERS = ['รับ','ได้รับ','โอนเข้า','income','รายรับ'];

// ══════ PARSER ══════
function parseAmount(text) {
  const m = text.match(/(\d[\d,]*\.?\d*)\s*(k|K|พัน|หมื่น|แสน)?/);
  if (!m) return 0;
  let n = parseFloat(m[1].replace(/,/g, ''));
  const unit = (m[2] || '').toLowerCase();
  if (unit === 'k' || unit === 'พัน') n *= 1000;
  if (unit === 'หมื่น') n *= 10000;
  if (unit === 'แสน') n *= 100000;
  return n;
}

function parseEntry(text) {
  const amount = parseAmount(text);
  if (!amount || amount <= 0) return null;
  const lower = text.toLowerCase();

  const isIncomeTrigger = INCOME_TRIGGERS.some(w => lower.includes(w));
  const incCat = INC_CATS.find(c => c.words.some(w => lower.includes(w)));

  if (isIncomeTrigger || incCat) {
    const cat = incCat || { id: 'inc_other', name: 'รายรับอื่น', icon: '💰' };
    return { type: 'income', catId: cat.id, catName: cat.name, catIcon: cat.icon, amount };
  }

  const expCat = EXP_CATS.find(c => c.words.some(w => lower.includes(w)));
  const cat = expCat || { id: 'exp_other', name: 'อื่นๆ', icon: '📦' };
  return { type: 'expense', catId: cat.id, catName: cat.name, catIcon: cat.icon, amount };
}

// ══════ HELPERS ══════
const fmt = n => n.toLocaleString('th-TH');
const todayStr = () => new Date().toISOString().split('T')[0];
const thisYM = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

async function getUserData(userId) {
  const doc = await db.collection('dongNote').doc(userId).get();
  return doc.exists ? doc.data() : { entries: [] };
}

async function getMonthlySummary(userId) {
  const data = await getUserData(userId);
  const ym = thisYM();
  const entries = (data.entries || []).filter(e => e.date?.startsWith(ym));
  const income  = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  return { income, expense, balance: income - expense, count: entries.length };
}

// ══════ MESSAGE HANDLER ══════
async function handleMessage(event) {
  const { userId } = event.source;
  const text = event.message?.text?.trim();
  if (!text) return;

  const lower = text.toLowerCase();
  const reply = msg => client.replyMessage(event.replyToken, { type: 'text', text: msg });

  // ── Commands ──
  if (['สรุป','summary','ยอด','balance','ดูยอด'].includes(lower)) {
    const s = await getMonthlySummary(userId);
    if (s.count === 0) {
      return reply('ยังไม่มีข้อมูลเดือนนี้ 🐼\n\nลองพิมพ์ว่า\n"ข้าว 50" หรือ "เงินเดือน 20000"');
    }
    return reply(
      `📊 สรุปเดือนนี้\n\n` +
      `💚 รายรับ    ${fmt(s.income)} บาท\n` +
      `❤️ รายจ่าย  ${fmt(s.expense)} บาท\n` +
      `──────────────\n` +
      `💰 คงเหลือ  ${fmt(s.balance)} บาท\n` +
      `📝 ${s.count} รายการ`
    );
  }

  if (['รายการ','list','ล่าสุด','ดูรายการ'].includes(lower)) {
    const data = await getUserData(userId);
    const last5 = (data.entries || []).slice(-5).reverse();
    if (!last5.length) return reply('ยังไม่มีรายการ 🐼');
    const lines = last5.map(e =>
      `${e.catIcon} ${e.note || e.catName}  ${e.type === 'income' ? '+' : '-'}${fmt(e.amount)}`
    ).join('\n');
    return reply(`📋 รายการล่าสุด\n\n${lines}`);
  }

  if (['ลบ','undo','ยกเลิก','ลบล่าสุด'].includes(lower)) {
    const data = await getUserData(userId);
    const entries = data.entries || [];
    if (!entries.length) return reply('ไม่มีรายการให้ลบ 🐼');
    const removed = entries.pop();
    await db.collection('dongNote').doc(userId).update({ entries });
    return reply(`🗑️ ลบแล้ว!\n\n${removed.catIcon} ${removed.note || removed.catName}\n${fmt(removed.amount)} บาท`);
  }

  if (['ช่วยเหลือ','help','วิธีใช้','เมนู'].includes(lower)) {
    return reply(
      `🐼 돈노트 Don Note Bot\n\n` +
      `📝 บันทึกรายการ:\n` +
      `• "ข้าวมันไก่ 50"\n` +
      `• "แท็กซี่ 120"\n` +
      `• "เงินเดือน 20000"\n` +
      `• "โบนัส 5000"\n\n` +
      `📊 คำสั่ง:\n` +
      `• สรุป → ยอดเดือนนี้\n` +
      `• รายการ → 5 รายการล่าสุด\n` +
      `• ลบ → ลบรายการล่าสุด\n` +
      `• ช่วยเหลือ → เมนูนี้`
    );
  }

  // ── Parse entry ──
  const entry = parseEntry(text);
  if (!entry) {
    return reply(
      `ไม่เข้าใจ 🐼 ลองพิมพ์เช่น\n"ข้าว 50"\n"เงินเดือน 20000"\n\nหรือพิมพ์ "ช่วยเหลือ"`
    );
  }

  const newEntry = {
    id: Date.now(),
    type: entry.type,
    amount: entry.amount,
    catId: entry.catId,
    catIcon: entry.catIcon,
    catName: entry.catName,
    note: text,
    date: todayStr(),
  };

  await db.collection('dongNote').doc(userId).set(
    { entries: admin.firestore.FieldValue.arrayUnion(newEntry) },
    { merge: true }
  );

  const s = await getMonthlySummary(userId);
  const sign = entry.type === 'income' ? '+' : '-';
  const emoji = entry.type === 'income' ? '💚' : '❤️';

  return reply(
    `${emoji} บันทึกแล้ว!\n\n` +
    `${entry.catIcon} ${entry.catName}\n` +
    `${sign} ${fmt(entry.amount)} บาท\n\n` +
    `💰 คงเหลือเดือนนี้: ${fmt(s.balance)} บาท`
  );
}

// ══════ FIREBASE CLOUD FUNCTION ══════
const app = express();

app.post('/', line.middleware(lineConfig), (req, res) => {
  res.sendStatus(200);
  (req.body.events || [])
    .filter(e => e.type === 'message' && e.message?.type === 'text')
    .forEach(e => handleMessage(e).catch(console.error));
});

exports.webhook = functions
  .region('asia-east1')   // Tokyo - ใกล้ไทยที่สุด
  .https.onRequest(app);

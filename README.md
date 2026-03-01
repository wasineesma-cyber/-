# Dorm Management App

เว็บแอพจัดการหอพัก (Mock Data) สำหรับ deploy บน Vercel

## Features
- Dashboard Overview แบบเรียลไทม์จำลอง (มีเวลา sync ล่าสุด)
- Rooms Management พร้อมค้นหา/กรองสถานะห้อง
- Tenants Directory พร้อมค้นหาและเก็บข้อมูลติดต่อ + Line
- Billing & Invoices พร้อมกรองสถานะบิล
- ดูบิลที่รอชำระ พร้อม QR พร้อมเพย์แบบ dynamic จากยอดรวม
- บันทึกใบเสร็จเป็นรูปภาพ
- แชร์รายละเอียดบิลผ่าน Line

## Stack
- Next.js 14 (App Router)
- TypeScript
- `qrcode.react` สำหรับแสดง QR
- `html2canvas` สำหรับแปลงใบเสร็จเป็นรูปภาพ

## Run
```bash
npm install
npm run dev
```

## Deploy to Vercel
1. Push โค้ดขึ้น GitHub
2. Import โปรเจกต์ใน Vercel
3. Framework preset: Next.js
4. Deploy

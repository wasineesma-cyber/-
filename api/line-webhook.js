
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  // แค่ตอบ 200 เพื่อให้ LINE Verify ผ่านก่อน
  return res.status(200).send("OK");
}
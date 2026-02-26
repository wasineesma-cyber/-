export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('OK');
  }

  console.log('Webhook received');

  return res.status(200).json({ status: 'ok' });
}

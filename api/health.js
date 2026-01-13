export default async function handler(req, res) {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}

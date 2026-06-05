// Notify endpoint - internal use only, triggers push notifications
const { sendNotifications } = require('./_notify-helper');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { section, summary } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    await sendNotifications(section, summary || 'New entry added');
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Notify error:', err);
    return res.status(500).json({ error: 'Notification failed' });
  }
};

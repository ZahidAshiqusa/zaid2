// WhatsApp Webhook - Receives incoming messages and handles commands
const { loadSession, loadConfig } = require('./_whatsapp-session');
const { readFile } = require('./_github');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, from, body } = typeof req.body === 'string'
      ? JSON.parse(req.body) : req.body;

    // Extract command from message text
    const text = (body || message || '').toLowerCase().trim();

    const validCommands = [
      'itemsms', 'itemspic',
      'walletms', 'walletpic',
      'personms', 'personpic',
      'maintenancems', 'maintenancepic',
      'samplesms', 'samplespic',
      'clippingms', 'clippingpic'
    ];

    if (!validCommands.includes(text)) {
      return res.status(200).json({ ignored: true, reason: 'Not a valid command' });
    }

    // Forward to whatsapp-send handler for processing
    const sendRes = await fetch(`${req.headers.host ? 'https://' + req.headers.host : 'http://localhost'}/api/whatsapp-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: text, senderJid: from })
    });

    const result = await sendRes.json();
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

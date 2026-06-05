// Person attendance CRUD endpoint
const { readFile, readAndWrite } = require('../_github');
const { validateAuth, unauthorized } = require('../_auth-middleware');
const { sendNotifications } = require('../_notify-helper');

function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'prs_';
  for (let i = 0; i < 13; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { data } = await readFile('person');
      const sorted = data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return res.status(200).json(sorted);
    }

    if (!validateAuth(req)) return unauthorized(res);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (req.method === 'POST') {
      const updated = await readAndWrite('person', (entries) => {
        const entry = {
          id: generateId(),
          personName: body.personName || '',
          action: body.action || 'enter', // 'enter' or 'exit'
          timestamp: new Date().toISOString()
        };
        entries.push(entry);
        return entries;
      });
      const newest = updated.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
      sendNotifications('Attendance', `${newest.personName} - ${newest.action === 'enter' ? 'Checked In' : 'Checked Out'}`);
      return res.status(201).json(newest);
    }

    if (req.method === 'PUT') {
      const updated = await readAndWrite('person', (entries) => {
        const idx = entries.findIndex(e => e.id === body.id);
        if (idx === -1) return entries;
        entries[idx] = { ...entries[idx], ...body, id: entries[idx].id };
        return entries;
      });
      return res.status(200).json(updated.find(e => e.id === body.id) || { success: true });
    }

    if (req.method === 'DELETE') {
      await readAndWrite('person', (entries) => entries.filter(e => e.id !== body.id));
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Person API error:', err);
    return res.status(500).json({ error: err.message });
  }
};

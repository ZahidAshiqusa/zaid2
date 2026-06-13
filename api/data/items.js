// Items Management CRUD endpoint
const { readFile, readAndWrite } = require('../_github');
const { validateAuth, unauthorized } = require('../_auth-middleware');
const { sendNotifications } = require('../_notify-helper');

function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 13; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET - Read all items (no auth required)
    if (req.method === 'GET') {
      const { data } = await readFile('items');
      const sorted = data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return res.status(200).json(sorted);
    }

    // All mutations require auth
    if (!validateAuth(req)) return unauthorized(res);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // POST - Create new item
    if (req.method === 'POST') {
      const updated = await readAndWrite('items', (items) => {
        const newItem = {
          id: generateId(),
          name: body.name || 'Unnamed',
          number: body.number || '',
          quantity: body.quantity || 1,
          model: body.model || '',
          person: body.person || '',
          status: body.status || 'available',
          timestamp: new Date().toISOString()
        };
        items.push(newItem);
        return items;
      });
      const newest = updated.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
      sendNotifications('Items', `New item: ${newest.name}`, newest);
      return res.status(201).json(newest);
    }

    // PUT - Update item
    if (req.method === 'PUT') {
      const updated = await readAndWrite('items', (items) => {
        const idx = items.findIndex(i => i.id === body.id);
        if (idx === -1) return items;
        items[idx] = { ...items[idx], ...body, id: items[idx].id };
        return items;
      });
      const item = updated.find(i => i.id === body.id);
      return res.status(200).json(item || { success: true });
    }

    // DELETE - Remove item
    if (req.method === 'DELETE') {
      const { id } = body;
      await readAndWrite('items', (items) => items.filter(i => i.id !== id));
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Items API error:', err);
    return res.status(500).json({ error: err.message });
  }
};

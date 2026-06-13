// WhatsApp Send API - Send notifications when entries are added
const { loadSession, loadConfig } = require('./_whatsapp-session');
const { readFile } = require('./_github');

// Numbers to notify
const NOTIFY_NUMBERS = ['923244643714', '923711286436'];

/**
 * Create a Baileys socket from saved session
 */
async function createSocket() {
  const session = await loadSession();
  if (!session || !session.creds) throw new Error('WhatsApp not linked');

  const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
  const pino = require('pino');
  const fs = require('fs');
  const path = require('path');

  // Restore auth state from saved session
  const sessionDir = '/tmp/wa-send-' + Date.now();
  fs.mkdirSync(sessionDir, { recursive: true });

  // Write creds file
  fs.writeFileSync(path.join(sessionDir, 'creds.json'), JSON.stringify(session.creds));

  // Write keys files
  if (session.keys) {
    for (const [key, value] of Object.entries(session.keys)) {
      if (value && Object.keys(value).length > 0) {
        fs.writeFileSync(path.join(sessionDir, key + '.json'), JSON.stringify(value));
      }
    }
  }

  const { state } = await useMultiFileAuthState(sessionDir);
  const logger = pino({ level: 'silent' });
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    browser: ['ZAID BWP', 'Chrome', '1.0.0']
  });

  return sock;
}

/**
 * Format entry message with cool fonts and header
 */
function formatEntryMessage(section, entry) {
  const now = new Date();
  const timeStr = now.toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const header = `╔═══════════════════════╗\n`
    + `  🏢 *ZAID BWP MANAGEMENT*\n`
    + `  📱 03299931199\n`
    + `╚═══════════════════════╝`;

  let details = '';
  switch (section) {
    case 'items':
      details = `📦 *NEW ITEM ADDED*\n`
        + `━━━━━━━━━━━━━━━━━━\n`
        + `🏷️ Name: *${entry.name || 'N/A'}*\n`
        + `🔢 Serial: ${entry.number || 'N/A'}\n`
        + `👤 Person: ${entry.person || 'N/A'}\n`
        + `📋 Model: ${entry.model || 'N/A'}\n`
        + `📊 Status: ${entry.status || 'Available'}`;
      break;
    case 'wallet':
      const emoji = entry.type === 'in' ? '💰' : '💸';
      details = `${emoji} *WALLET ${entry.type === 'in' ? 'INCOME' : 'EXPENSE'}*\n`
        + `━━━━━━━━━━━━━━━━━━\n`
        + `👤 ${entry.type === 'in' ? 'From' : 'For'}: *${entry.personOrPurpose || 'N/A'}*\n`
        + `💵 Amount: *Rs. ${entry.amount || 0}*`;
      break;
    case 'person':
      details = `👷 *WORKER ${entry.action === 'enter' ? 'CHECK-IN' : 'CHECK-OUT'}*\n`
        + `━━━━━━━━━━━━━━━━━━\n`
        + `👤 Name: *${entry.personName || 'N/A'}*\n`
        + `📍 Action: ${entry.action === 'enter' ? '✅ Entered' : '🚪 Exited'}`;
      break;
    case 'maintenance':
      details = `🔧 *MAINTENANCE ${entry.category?.toUpperCase() || 'ENTRY'}*\n`
        + `━━━━━━━━━━━━━━━━━━\n`
        + `📌 Subject: *${entry.subject || 'N/A'}*\n`
        + `📝 Desc: ${entry.description || 'N/A'}\n`
        + `🏷️ Category: ${entry.category || 'General'}`;
      break;
    case 'samples':
      details = `🧪 *SAMPLE ${entry.type === 'in' ? 'RECEIVED' : 'SENT'}*\n`
        + `━━━━━━━━━━━━━━━━━━\n`
        + `👤 Person: *${entry.personName || 'N/A'}*\n`
        + `📋 Program: ${entry.program || 'N/A'}\n`
        + `📦 Pieces: ${entry.pieces || 'N/A'}`;
      break;
    case 'clipping':
      details = `✂️ *CLIPPING ${entry.type === 'in' ? 'IN' : 'OUT'}*\n`
        + `━━━━━━━━━━━━━━━━━━\n`
        + `👤 Clipper: *${entry.clipperName || 'N/A'}*\n`
        + `📐 Size: ${entry.size || 'N/A'}`;
      break;
    default:
      details = `📋 *NEW ENTRY: ${section}*\n━━━━━━━━━━━━━━━━━━\n${JSON.stringify(entry, null, 2)}`;
  }

  return `${header}\n\n${details}\n\n━━━━━━━━━━━━━━━━━━\n`
    + `⏰ *${timeStr}*\n`
    + `📌 _Powered by ZAID BWP_\n`
    + `📞 _03299931199_`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { section, entry, command, senderJid } = typeof req.body === 'string'
      ? JSON.parse(req.body) : req.body;

    // Handle command responses
    if (command) {
      return await handleCommand(command, senderJid, res);
    }

    // Handle entry notifications
    if (section && entry) {
      const message = formatEntryMessage(section, entry);

      try {
        const sock = await createSocket();

        // Wait for connection to open
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            try { sock.end(); } catch {}
            reject(new Error('Connection timeout'));
          }, 15000);

          sock.ev.on('connection.update', (update) => {
            if (update.connection === 'open') {
              clearTimeout(timeout);
              resolve();
            }
            if (update.connection === 'close') {
              clearTimeout(timeout);
              reject(new Error('Connection closed'));
            }
          });
        });

        // Send to all notify numbers
        const results = [];
        for (const num of NOTIFY_NUMBERS) {
          try {
            const jid = num + '@s.whatsapp.net';
            await sock.sendMessage(jid, { text: message });
            results.push({ number: num, status: 'sent' });
          } catch (err) {
            results.push({ number: num, status: 'failed', error: err.message });
          }
        }

        try { sock.end(); } catch {}

        return res.status(200).json({ success: true, results });
      } catch (err) {
        console.error('WhatsApp send error:', err.message);
        return res.status(200).json({
          success: false,
          error: err.message,
          message: 'WhatsApp not available - push notification sent instead'
        });
      }
    }

    return res.status(400).json({ error: 'Provide section+entry or command' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Handle incoming commands (itemsms, itemspic, etc.)
 */
async function handleCommand(command, senderJid, res) {
  try {
    const sock = await createSocket();

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 15000);
      sock.ev.on('connection.update', (update) => {
        if (update.connection === 'open') { clearTimeout(timeout); resolve(); }
        if (update.connection === 'close') { clearTimeout(timeout); reject(new Error('Closed')); }
      });
    });

    const cmd = (command || '').toLowerCase().trim();
    const targetJid = senderJid || NOTIFY_NUMBERS[0] + '@s.whatsapp.net';

    const header = `╔═══════════════════════╗\n`
      + `  🏢 *ZAID BWP MANAGEMENT*\n`
      + `  📱 03299931199\n`
      + `╚═══════════════════════╝\n\n`;

    // Map commands to sections
    const sectionMap = {
      'itemsms': 'items',
      'itemspic': 'items',
      'walletms': 'wallet',
      'walletpic': 'wallet',
      'personms': 'person',
      'personpic': 'person',
      'maintenancems': 'maintenance',
      'maintenancepic': 'maintenance',
      'samplesms': 'samples',
      'samplespic': 'samples',
      'clippingms': 'clipping',
      'clippingpic': 'clipping'
    };

    const section = sectionMap[cmd];
    if (!section) {
      await sock.sendMessage(targetJid, {
        text: header + '❌ Unknown command.\n\nAvailable commands:\n'
          + '• itemsms - Items Excel\n• itemspic - Items Image\n'
          + '• walletms - Wallet Excel\n• walletpic - Wallet Image\n'
          + '• personms - Person Excel\n• personpic - Person Image\n'
          + '• maintenancems - Maintenance Excel\n• maintenancepic - Maintenance Image\n'
          + '• samplesms - Samples Excel\n• samplespic - Samples Image\n'
          + '• clippingms - Clipping Excel\n• clippingpic - Clipping Image'
      });
      try { sock.end(); } catch {}
      return res.status(200).json({ success: true });
    }

    // Load data
    const { data } = await readFile(section);
    const entries = Array.isArray(data) ? data : [];

    if (cmd.endsWith('pic')) {
      // Send as formatted image (text-based summary)
      let text = header + `📊 *${section.toUpperCase()} DATA*\n━━━━━━━━━━━━━━━━━━\n`;
      text += `📋 Total Entries: *${entries.length}*\n\n`;

      // Show last 20 entries
      const recent = entries.slice(-20).reverse();
      recent.forEach((entry, i) => {
        const name = entry.name || entry.personName || entry.clipperName || entry.personOrPurpose || entry.subject || 'Entry';
        const num = entry.number || entry.amount || entry.size || '';
        text += `${i + 1}. *${name}* ${num ? '- ' + num : ''}\n`;
      });

      text += `\n━━━━━━━━━━━━━━━━━━\n⏰ _${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}_`;

      await sock.sendMessage(targetJid, { text });
    } else {
      // Send as Excel/CSV file
      const XLSX = require_safe('xlsx');
      let csvContent = '';

      if (entries.length > 0) {
        const headers = Object.keys(entries[0]);
        csvContent = headers.join(',') + '\n';
        entries.forEach(row => {
          csvContent += headers.map(h => {
            const val = row[h] != null ? String(row[h]).replace(/,/g, ';') : '';
            return val;
          }).join(',') + '\n';
        });
      } else {
        csvContent = 'No data available\n';
      }

      const buffer = Buffer.from(csvContent, 'utf-8');
      const fileName = `${section}_data_${new Date().toISOString().split('T')[0]}.csv`;

      await sock.sendMessage(targetJid, {
        document: buffer,
        fileName: fileName,
        mimetype: 'text/csv',
        caption: header + `📊 *${section.toUpperCase()} DATA*\n📋 ${entries.length} entries attached`
      });
    }

    try { sock.end(); } catch {}
    return res.status(200).json({ success: true });
  } catch (err) {
    try { sock?.end(); } catch {}
    return res.status(500).json({ error: err.message });
  }
}

function require_safe(name) {
  try { return require(name); } catch { return null; }
}

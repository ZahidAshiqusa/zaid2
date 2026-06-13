// WhatsApp Link API - Handles QR code generation for linking and session management
const { validateAuth, unauthorized } = require('./_auth-middleware');
const { loadSession, saveSession, saveConfig, loadConfig } = require('./_whatsapp-session');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!validateAuth(req)) return unauthorized(res);

  const { action } = req.query;

  // GET /api/whatsapp?action=status - Check if WhatsApp is linked
  if (req.method === 'GET' && action === 'status') {
    try {
      const config = await loadConfig();
      const session = await loadSession();
      return res.status(200).json({
        linked: !!(session && session.creds),
        phone: config.linkedPhone || null,
        linkedAt: config.linkedAt || null
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/whatsapp?action=link - Start WhatsApp linking (returns QR code)
  if (req.method === 'POST' && action === 'link') {
    try {
      const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
      const pino = require('pino');
      const QRCode = require('qrcode');
      const { writeFile } = require('./_github');

      // Use in-memory auth state for new linking
      const { state, saveCreds } = await useMultiFileAuthState('/tmp/wa-session');
      const logger = pino({ level: 'silent' });

      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
        version,
        logger,
        auth: state,
        browser: ['ZAID BWP', 'Chrome', '1.0.0'],
        connectTimeoutMs: 60000,
        qrTimeout: 55000
      });

      // Wait for QR code or connection
      const result = await new Promise((resolve) => {
        let qrResolved = false;
        let timeout;

        sock.ev.on('connection.update', async (update) => {
          const { connection, lastDisconnect, qr } = update;

          if (qr && !qrResolved) {
            qrResolved = true;
            // Generate QR code as data URL
            const qrDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
            resolve({ status: 'qr', qr: qrDataUrl });
          }

          if (connection === 'open') {
            // Successfully linked!
            const phone = sock.user?.id?.split(':')[0] || 'unknown';
            saveCreds();

            // Save auth state to GitHub
            const authState = {
              creds: state.creds,
              keys: Object.fromEntries(
                Object.entries(state.keys).map(([k, v]) => [k, v])
              ),
              linkedAt: new Date().toISOString(),
              phone: phone
            };

            try {
              const { sha } = await readFile_safe('whatsapp-session');
              await writeFile('whatsapp-session', authState, sha);
            } catch {
              await writeFile('whatsapp-session', authState, null);
            }

            await saveConfig({
              linked: true,
              linkedPhone: phone,
              linkedAt: new Date().toISOString()
            });

            clearTimeout(timeout);
            resolve({ status: 'linked', phone });

            setTimeout(() => {
              try { sock.end(); } catch {}
            }, 2000);
          }

          if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut && !qrResolved) {
              // Connection closed before QR was scanned
              resolve({ status: 'timeout', message: 'Connection closed. Please try again.' });
            }
          }
        });

        // Safety timeout - resolve after 55 seconds
        timeout = setTimeout(() => {
          if (!qrResolved) {
            resolve({ status: 'timeout', message: 'QR code expired. Please try again.' });
          }
          try { sock.end(); } catch {}
        }, 55000);
      });

      return res.status(200).json(result);
    } catch (err) {
      console.error('WhatsApp link error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/whatsapp?action=unlink - Unlink WhatsApp
  if (req.method === 'DELETE' && action === 'unlink') {
    try {
      const { writeFile } = require('./_github');
      // Clear session
      const { readFile: ghRead } = require('./_github');
      try {
        const { sha } = await ghRead('whatsapp-session');
        await writeFile('whatsapp-session', null, sha);
      } catch {}
      await saveConfig({ linked: false, linkedPhone: null, linkedAt: null });
      return res.status(200).json({ success: true, message: 'WhatsApp unlinked' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Invalid action. Use ?action=status|link|unlink' });
};

// Safe readFile that doesn't throw
async function readFile_safe(section) {
  try {
    const { readFile } = require('./_github');
    return await readFile(section);
  } catch {
    return { data: null, sha: null };
  }
}

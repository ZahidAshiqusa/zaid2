// WhatsApp Link API - Handles QR code generation for linking and session management
const { validateAuth, unauthorized } = require('./_auth-middleware');
const { loadSession, saveSession, saveConfig, loadConfig } = require('./_whatsapp-session');
const fs = require('fs');
const path = require('path');

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
      // --- Clean up /tmp session dir to avoid stale state ---
      const sessionDir = '/tmp/wa-link-session';
      try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch {}
      fs.mkdirSync(sessionDir, { recursive: true });

      // Dynamic import for ESM packages (baileys & pino are ESM-only)
      const baileys = await import('@whiskeysockets/baileys');
      const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = baileys;

      const pinoMod = await import('pino');
      const pino = pinoMod.default;

      const QRCode = require('qrcode');
      const { writeFile } = require('./_github');

      // --- Get Baileys version with fallback ---
      let version;
      try {
        const v = await fetchLatestBaileysVersion();
        version = v.version;
      } catch (verErr) {
        console.log('fetchLatestBaileysVersion failed, using fallback:', verErr.message);
        version = [2, 3000, 1021221121];
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      const logger = pino({ level: 'silent' });

      console.log('Creating WhatsApp socket with version:', version);

      const browser = (Browsers && Browsers.ubuntu) ? Browsers.ubuntu('ZAID BWP') : ['ZAID BWP', 'Chrome', '1.0.0'];

      const sock = makeWASocket({
        version,
        logger,
        auth: state,
        browser,
        printQRInTerminal: false
      });

      // --- Wait for QR code or connection ---
      const result = await new Promise((resolve) => {
        let qrResolved = false;
        let safetyTimeout;
        let qrCheckTimeout;

        // QR detection: if no QR in 20s, something is wrong
        qrCheckTimeout = setTimeout(() => {
          if (!qrResolved) {
            console.log('QR code not received within 20 seconds');
            qrResolved = true;
            resolve({
              status: 'error',
              message: 'QR code generation timed out. The WhatsApp service may be temporarily unavailable. Please try again.'
            });
            try { sock.end(new Error('timeout')); } catch {}
          }
        }, 20000);

        sock.ev.on('connection.update', async (update) => {
          const { connection, lastDisconnect, qr } = update;

          if (qr && !qrResolved) {
            qrResolved = true;
            clearTimeout(qrCheckTimeout);
            console.log('QR code received, generating data URL');
            try {
              const qrDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
              resolve({ status: 'qr', qr: qrDataUrl });
            } catch (qrErr) {
              console.error('QR toDataURL error:', qrErr.message);
              resolve({ status: 'error', message: 'Failed to render QR code: ' + qrErr.message });
            }
          }

          if (connection === 'open') {
            const phone = sock.user?.id?.split(':')[0] || 'unknown';
            console.log('WhatsApp connected, phone:', phone);

            try { saveCreds(); } catch {}

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
            } catch (saveErr) {
              try { await writeFile('whatsapp-session', authState, null); } catch {}
            }

            await saveConfig({
              linked: true,
              linkedPhone: phone,
              linkedAt: new Date().toISOString()
            });

            clearTimeout(safetyTimeout);
            clearTimeout(qrCheckTimeout);

            if (!qrResolved) {
              qrResolved = true;
              resolve({ status: 'linked', phone });
            }

            setTimeout(() => { try { sock.end(new Error('done')); } catch {} }, 2000);
          }

          if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            const errMessage = lastDisconnect?.error?.message || 'unknown';
            console.log('Connection closed, reason:', reason, 'error:', errMessage);

            if (!qrResolved) {
              qrResolved = true;
              clearTimeout(qrCheckTimeout);
              resolve({
                status: 'error',
                message: `Connection closed: ${errMessage}. Please try again.`
              });
            }
          }
        });

        sock.ev.on('messaging-history.set', () => {});

        safetyTimeout = setTimeout(() => {
          if (!qrResolved) {
            qrResolved = true;
            clearTimeout(qrCheckTimeout);
            resolve({ status: 'error', message: 'Session expired. Please try again.' });
          }
          try { sock.end(new Error('timeout')); } catch {}
        }, 55000);
      });

      try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch {}

      return res.status(200).json(result);
    } catch (err) {
      console.error('WhatsApp link error:', err);
      console.error('Error stack:', err.stack);
      return res.status(500).json({
        error: err.message,
        hint: 'Baileys import or initialization failed.'
      });
    }
  }

  // DELETE /api/whatsapp?action=unlink - Unlink WhatsApp
  if (req.method === 'DELETE' && action === 'unlink') {
    try {
      const { writeFile, readFile: ghRead } = require('./_github');
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

async function readFile_safe(section) {
  try {
    const { readFile } = require('./_github');
    return await readFile(section);
  } catch {
    return { data: null, sha: null };
  }
}

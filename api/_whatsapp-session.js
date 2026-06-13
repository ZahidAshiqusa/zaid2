// Internal WhatsApp session manager - stores Baileys auth state in GitHub
const { readFile, writeFile } = require('./_github');

/**
 * Load WhatsApp auth state from GitHub
 * @returns {object|null} Baileys auth state or null if not linked
 */
async function loadSession() {
  try {
    const { data } = await readFile('whatsapp-session');
    if (!data || !data.creds) return null;
    return data;
  } catch (err) {
    console.log('No WhatsApp session found:', err.message);
    return null;
  }
}

/**
 * Save WhatsApp auth state to GitHub
 * @param {object} state - Baileys auth state { creds, keys }
 */
async function saveSession(state) {
  try {
    const { sha } = await readFile('whatsapp-session');
    await writeFile('whatsapp-session', state, sha);
  } catch (err) {
    console.error('Failed to save WhatsApp session:', err.message);
  }
}

/**
 * Save WhatsApp config (linked numbers, settings)
 * @param {object} config
 */
async function saveConfig(config) {
  try {
    const { data: existing, sha } = await readFile('whatsapp-config');
    const base = (existing && !Array.isArray(existing) && typeof existing === 'object') ? existing : {};
    const merged = { ...base, ...config };
    await writeFile('whatsapp-config', merged, sha);
    return merged;
  } catch (err) {
    console.error('Failed to save WhatsApp config:', err.message);
    return null;
  }
}

/**
 * Load WhatsApp config
 * @returns {object} config with notifyNumbers, linked status, etc.
 */
async function loadConfig() {
  try {
    const { data } = await readFile('whatsapp-config');
    return data || { linked: false, notifyNumbers: [] };
  } catch {
    return { linked: false, notifyNumbers: [] };
  }
}

module.exports = { loadSession, saveSession, saveConfig, loadConfig };

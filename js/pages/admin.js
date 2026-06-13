// Admin page entry point - admin.html
import { fetchSection, createEntry, getToken } from '../shared/api.js';
import { showToast } from '../shared/notifications.js';
import { showPasswordGate, setupLogout } from '../shared/auth.js';
import { renderItems } from '../sections/items.js';
import { renderWallet } from '../sections/wallet.js';
import { renderPerson } from '../sections/person.js';
import { renderMaintenance } from '../sections/maintenance.js';
import { renderSamples } from '../sections/samples.js';
import { renderClipping } from '../sections/clipping.js';
import { initTheme } from '../shared/theme.js';

// Initialize theme toggle
initTheme();

const SECTIONS = ['items', 'wallet', 'person', 'maintenance', 'samples', 'clipping'];

async function loadSection(section) {
  try {
    const data = await fetchSection(section);
    const container = document.getElementById(`${section}-body`);
    if (!container) return;

    const opts = { isAdmin: true, onRefresh: () => loadAllSections() };

    switch (section) {
      case 'items': renderItems(container, data, opts); break;
      case 'wallet': renderWallet(container, data, opts); break;
      case 'person': renderPerson(container, data, opts); break;
      case 'maintenance': renderMaintenance(container, data, opts); break;
      case 'samples': renderSamples(container, data, opts); break;
      case 'clipping': renderClipping(container, data, opts); break;
    }
  } catch (err) {
    console.error(`Error loading ${section}:`, err);
    const container = document.getElementById(`${section}-body`);
    if (container) {
      container.innerHTML = `<div class="empty-state"><p style="color:var(--danger);">Failed to load ${section}</p></div>`;
    }
  }
}

async function loadAllSections() {
  await Promise.all(SECTIONS.map(s => loadSection(s)));
}

// Form submit handlers
function setupForms() {
  // Items submit
  document.getElementById('items-submit')?.addEventListener('click', async () => {
    const name = document.getElementById('items-name').value.trim();
    if (!name) { showToast('Error', 'Item name is required', 'error'); return; }
    try {
      await createEntry('items', {
        name,
        number: document.getElementById('items-number').value.trim(),
        person: document.getElementById('items-person').value.trim(),
        model: document.getElementById('items-model').value.trim()
      });
      document.getElementById('items-name').value = '';
      document.getElementById('items-number').value = '';
      document.getElementById('items-person').value = '';
      document.getElementById('items-model').value = '';
      document.getElementById('items-form-panel').classList.remove('active');
      showToast('Success', 'Item added successfully', 'success');
      loadAllSections();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  });

  // Wallet submit
  document.getElementById('wallet-submit')?.addEventListener('click', async () => {
    const personOrPurpose = document.getElementById('wallet-person').value.trim();
    const amount = document.getElementById('wallet-amount').value.trim();
    if (!personOrPurpose || !amount) { showToast('Error', 'Please fill all fields', 'error'); return; }
    try {
      await createEntry('wallet', {
        type: window.walletType || 'in',
        personOrPurpose,
        amount: Number(amount)
      });
      document.getElementById('wallet-person').value = '';
      document.getElementById('wallet-amount').value = '';
      document.getElementById('wallet-form-panel').classList.remove('active');
      showToast('Success', 'Wallet entry added', 'success');
      loadAllSections();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  });

  // Maintenance submit
  document.getElementById('maintenance-submit')?.addEventListener('click', async () => {
    const subject = document.getElementById('maintenance-subject').value.trim();
    if (!subject) { showToast('Error', 'Subject is required', 'error'); return; }
    const activeCat = document.querySelector('#maintenance-categories .category-btn.active');
    try {
      await createEntry('maintenance', {
        category: activeCat?.dataset.cat || 'Issue',
        subject,
        description: document.getElementById('maintenance-desc').value.trim()
      });
      document.getElementById('maintenance-subject').value = '';
      document.getElementById('maintenance-desc').value = '';
      document.getElementById('maintenance-form-panel').classList.remove('active');
      showToast('Success', 'Maintenance entry added', 'success');
      loadAllSections();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  });

  // Samples submit
  document.getElementById('samples-submit')?.addEventListener('click', async () => {
    const person = document.getElementById('samples-person').value.trim();
    if (!person) { showToast('Error', 'Person name is required', 'error'); return; }
    try {
      await createEntry('samples', {
        type: window.samplesType || 'in',
        personName: person,
        program: document.getElementById('samples-program').value.trim(),
        pieces: document.getElementById('samples-pieces').value.trim()
      });
      document.getElementById('samples-person').value = '';
      document.getElementById('samples-program').value = '';
      document.getElementById('samples-pieces').value = '';
      document.getElementById('samples-form-panel').classList.remove('active');
      showToast('Success', 'Sample entry added', 'success');
      loadAllSections();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  });

  // Person submit (add worker)
  document.getElementById('person-submit')?.addEventListener('click', async () => {
    const name = document.getElementById('person-name').value.trim();
    if (!name) { showToast('Error', 'Worker name is required', 'error'); return; }
    try {
      await createEntry('person', {
        personName: name,
        action: 'enter'
      });
      document.getElementById('person-name').value = '';
      document.getElementById('person-form-panel').classList.remove('active');
      showToast('Success', `Worker "${name}" added`, 'success');
      loadAllSections();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  });

  // Clipping submit
  document.getElementById('clipping-submit')?.addEventListener('click', async () => {
    const clipperName = document.getElementById('clipping-name').value.trim();
    const size = document.getElementById('clipping-size').value.trim();
    if (!clipperName || !size) { showToast('Error', 'Clipper name and size are required', 'error'); return; }
    try {
      await createEntry('clipping', {
        type: window.clippingType || 'in',
        clipperName,
        size
      });
      document.getElementById('clipping-name').value = '';
      document.getElementById('clipping-size').value = '';
      document.getElementById('clipping-form-panel').classList.remove('active');
      showToast('Success', 'Clipping entry added', 'success');
      loadAllSections();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  });
}

// Initialize admin page
showPasswordGate(() => {
  loadAllSections();
  setupForms();
  setupLogout();
  initWhatsAppStatus();
});

/* ========== WhatsApp Integration ========== */

let waPollTimer = null;

function waHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken()
  };
}

function showWaSection(...ids) {
  ['wa-status-section','wa-qr-section','wa-loading-section','wa-linked-section','wa-error-section']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = ids.includes(id) ? '' : 'none';
    });
}

async function initWhatsAppStatus() {
  try {
    const res = await fetch('/api/whatsapp?action=status', { headers: waHeaders() });
    const data = await res.json();
    updateWaButton(data.linked);
  } catch { /* silent */ }
}

function updateWaButton(linked) {
  const btn = document.getElementById('whatsapp-btn');
  const txt = document.getElementById('wa-status-text');
  if (!btn) return;
  if (linked) {
    btn.classList.remove('btn-success');
    btn.classList.add('btn-wa-linked');
    if (txt) txt.textContent = 'WA Linked';
  } else {
    btn.classList.remove('btn-wa-linked');
    btn.classList.add('btn-success');
    if (txt) txt.textContent = 'WhatsApp';
  }
}

window.openWhatsAppModal = async function() {
  const modal = document.getElementById('wa-modal');
  if (modal) modal.style.display = 'flex';

  // Reset UI
  showWaSection('wa-status-section');
  document.getElementById('wa-link-btn').style.display = 'none';
  document.getElementById('wa-unlink-btn').style.display = 'none';
  document.getElementById('wa-status-label').textContent = 'Checking...';
  document.getElementById('wa-status-dot').className = 'wa-status-dot wa-dot-checking';
  document.getElementById('wa-phone-info').style.display = 'none';
  document.getElementById('wa-error-section').style.display = 'none';

  await checkWhatsAppStatus();
};

window.closeWhatsAppModal = function() {
  const modal = document.getElementById('wa-modal');
  if (modal) modal.style.display = 'none';
  if (waPollTimer) { clearTimeout(waPollTimer); waPollTimer = null; }
};

async function checkWhatsAppStatus() {
  try {
    const res = await fetch('/api/whatsapp?action=status', { headers: waHeaders() });
    const data = await res.json();

    if (data.linked) {
      // Show linked state
      document.getElementById('wa-status-label').textContent = 'Connected';
      document.getElementById('wa-status-dot').className = 'wa-status-dot wa-dot-linked';
      document.getElementById('wa-phone-info').style.display = 'flex';
      document.getElementById('wa-phone-number').textContent = '+' + (data.phone || 'Unknown');
      document.getElementById('wa-link-btn').style.display = 'none';
      document.getElementById('wa-unlink-btn').style.display = 'inline-flex';
      showWaSection('wa-status-section', 'wa-linked-section');
      updateWaButton(true);
    } else {
      // Show not-linked state
      document.getElementById('wa-status-label').textContent = 'Not Connected';
      document.getElementById('wa-status-dot').className = 'wa-status-dot wa-dot-unlinked';
      document.getElementById('wa-phone-info').style.display = 'none';
      document.getElementById('wa-link-btn').style.display = 'inline-flex';
      document.getElementById('wa-unlink-btn').style.display = 'none';
      showWaSection('wa-status-section');
      updateWaButton(false);
    }
  } catch (err) {
    document.getElementById('wa-status-label').textContent = 'Error';
    document.getElementById('wa-status-dot').className = 'wa-status-dot wa-dot-unlinked';
    document.getElementById('wa-link-btn').style.display = 'inline-flex';
    showWaSection('wa-status-section');
  }
}

window.linkWhatsApp = async function() {
  // Show loading
  showWaSection('wa-loading-section');
  document.getElementById('wa-loading-text').textContent = 'Connecting to WhatsApp servers... Please wait.';
  document.getElementById('wa-link-btn').style.display = 'none';
  document.getElementById('wa-error-section').style.display = 'none';

  try {
    // Use AbortController for a 58s timeout (API has 60s limit)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 58000);

    const res = await fetch('/api/whatsapp?action=link', {
      method: 'POST',
      headers: waHeaders(),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Server error ' + res.status }));
      throw new Error(errData.error || errData.hint || 'API returned ' + res.status);
    }

    const data = await res.json();

    if (data.status === 'qr') {
      // Show QR code
      showWaSection('wa-qr-section');
      document.getElementById('wa-qr-image').src = data.qr;
      // Start polling for connection
      pollWhatsAppLink();
    } else if (data.status === 'linked') {
      // Already linked
      showWaSection('wa-status-section', 'wa-linked-section');
      document.getElementById('wa-status-label').textContent = 'Connected';
      document.getElementById('wa-status-dot').className = 'wa-status-dot wa-dot-linked';
      document.getElementById('wa-phone-info').style.display = 'flex';
      document.getElementById('wa-phone-number').textContent = '+' + (data.phone || 'Unknown');
      document.getElementById('wa-unlink-btn').style.display = 'inline-flex';
      updateWaButton(true);
      showToast('WhatsApp', 'WhatsApp linked successfully!', 'success');
    } else if (data.status === 'error') {
      // API returned an error
      showWaSection('wa-status-section', 'wa-error-section');
      document.getElementById('wa-error-text').textContent = data.message || 'WhatsApp service error. Please try again.';
      document.getElementById('wa-link-btn').style.display = 'inline-flex';
    } else {
      // Timeout or unknown status
      showWaSection('wa-status-section', 'wa-error-section');
      document.getElementById('wa-error-text').textContent = data.message || 'Failed to generate QR code. Please try again.';
      document.getElementById('wa-link-btn').style.display = 'inline-flex';
    }
  } catch (err) {
    showWaSection('wa-status-section', 'wa-error-section');
    const msg = err.name === 'AbortError'
      ? 'Request timed out. The WhatsApp service may be busy. Please try again.'
      : 'Connection error: ' + err.message;
    document.getElementById('wa-error-text').textContent = msg;
    document.getElementById('wa-link-btn').style.display = 'inline-flex';
  }
};

function pollWhatsAppLink() {
  // Poll status every 3 seconds for up to 55 seconds
  let attempts = 0;
  const maxAttempts = 18;

  // Show QR section with "waiting" message below the QR
  function updatePollStatus(seconds) {
    const hint = document.querySelector('.wa-qr-hint');
    if (hint) {
      hint.textContent = 'Waiting for scan... ' + seconds + 's elapsed — scan before it expires!';
      hint.style.color = seconds > 30 ? 'var(--warning)' : '';
    }
  }

  async function poll() {
    attempts++;
    try {
      const res = await fetch('/api/whatsapp?action=status', { headers: waHeaders() });
      const data = await res.json();

      if (data.linked) {
        // Successfully linked!
        showWaSection('wa-status-section', 'wa-linked-section');
        document.getElementById('wa-status-label').textContent = 'Connected';
        document.getElementById('wa-status-dot').className = 'wa-status-dot wa-dot-linked';
        document.getElementById('wa-phone-info').style.display = 'flex';
        document.getElementById('wa-phone-number').textContent = '+' + (data.phone || 'Unknown');
        document.getElementById('wa-unlink-btn').style.display = 'inline-flex';
        updateWaButton(true);
        showToast('WhatsApp', 'WhatsApp linked successfully! Notifications are now active.', 'success');
        return;
      }
    } catch { /* continue polling */ }

    if (attempts < maxAttempts) {
      updatePollStatus(attempts * 3);
      waPollTimer = setTimeout(poll, 3000);
    } else {
      // Reset QR hint text
      const hint = document.querySelector('.wa-qr-hint');
      if (hint) {
        hint.textContent = 'Open WhatsApp → Settings → Linked Devices → Link a Device';
        hint.style.color = '';
      }
      showWaSection('wa-status-section', 'wa-error-section');
      document.getElementById('wa-error-text').textContent = 'QR code expired or not scanned in time. Please try again.';
      document.getElementById('wa-link-btn').style.display = 'inline-flex';
    }
  }

  waPollTimer = setTimeout(poll, 3000);
}

window.unlinkWhatsApp = async function() {
  if (!confirm('Are you sure you want to unlink WhatsApp? Notifications will stop.')) return;

  document.getElementById('wa-unlink-btn').disabled = true;
  document.getElementById('wa-unlink-btn').innerHTML = '<span class="loading-spinner"></span> Unlinking...';

  try {
    const res = await fetch('/api/whatsapp?action=unlink', {
      method: 'DELETE',
      headers: waHeaders()
    });
    const data = await res.json();

    if (data.success) {
      showToast('WhatsApp', 'WhatsApp unlinked successfully.', 'success');
      await checkWhatsAppStatus();
    } else {
      showToast('Error', data.error || 'Failed to unlink', 'error');
    }
  } catch (err) {
    showToast('Error', 'Connection error: ' + err.message, 'error');
  } finally {
    document.getElementById('wa-unlink-btn').disabled = false;
    document.getElementById('wa-unlink-btn').innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg> Unlink WhatsApp';
  }
};

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('wa-modal-overlay')) {
    closeWhatsAppModal();
  }
});

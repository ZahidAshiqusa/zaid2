// Admin page entry point - admin.html
import { fetchSection, createEntry } from '../shared/api.js';
import { showToast } from '../shared/notifications.js';
import { showPasswordGate, setupLogout } from '../shared/auth.js';
import { renderItems } from '../sections/items.js';
import { renderWallet } from '../sections/wallet.js';
import { renderPerson } from '../sections/person.js';
import { renderMaintenance } from '../sections/maintenance.js';
import { renderSamples } from '../sections/samples.js';
import { renderClipping } from '../sections/clipping.js';

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
        pieces: document.getElementById('samples-pieces').value.trim()
      });
      document.getElementById('samples-person').value = '';
      document.getElementById('samples-pieces').value = '';
      document.getElementById('samples-form-panel').classList.remove('active');
      showToast('Success', 'Sample entry added', 'success');
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
});

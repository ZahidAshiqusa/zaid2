// Dashboard page entry point - index.html
import { fetchSection } from '../shared/api.js';
import { formatCurrency } from '../shared/utils.js';
import { initNotifications, setupInstallPrompt, showToast } from '../shared/notifications.js';
import { renderItems } from '../sections/items.js';
import { renderWallet } from '../sections/wallet.js';
import { renderPerson } from '../sections/person.js';
import { renderMaintenance } from '../sections/maintenance.js';
import { renderSamples } from '../sections/samples.js';
import { renderClipping } from '../sections/clipping.js';
import { initDownloadButtons } from '../shared/download.js';

const SECTIONS = ['items', 'wallet', 'person', 'maintenance', 'samples', 'clipping'];
let previousData = {};
let allData = {};

async function loadSection(section) {
  try {
    const data = await fetchSection(section);

    // Check if data changed and show toast
    if (previousData[section] && JSON.stringify(data) !== JSON.stringify(previousData[section])) {
      showToast('Data Updated', `${section.charAt(0).toUpperCase() + section.slice(1)} section has been updated`, 'success');
    }
    previousData[section] = data;
    allData[section] = data;

    // Expose data globally for download module
    if (!window.__sectionData) window.__sectionData = {};
    window.__sectionData[section] = data;

    const container = document.getElementById(`${section}-body`);
    if (!container) return;

    switch (section) {
      case 'items':
        renderItems(container, data, { isAdmin: false });
        document.getElementById('items-count').textContent = `${data.length} items`;
        document.getElementById('stat-items').textContent = data.length;
        break;
      case 'wallet':
        renderWallet(container, data, { isAdmin: false });
        const balance = data.reduce((acc, e) => acc + (e.type === 'in' ? Number(e.amount) : -Number(e.amount)), 0);
        document.getElementById('stat-wallet').textContent = formatCurrency(balance);
        document.getElementById('stat-wallet').style.color = balance >= 0 ? 'var(--success)' : 'var(--danger)';
        break;
      case 'person':
        renderPerson(container, data, { isAdmin: false, onRefresh: () => loadSection('person') });
        const today = new Date().toDateString();
        const todayCount = data.filter(e => new Date(e.timestamp).toDateString() === today).length;
        document.getElementById('stat-activity').textContent = todayCount;
        break;
      case 'maintenance':
        renderMaintenance(container, data, { isAdmin: false });
        const openIssues = data.filter(e => e.status !== 'solved').length;
        document.getElementById('stat-issues').textContent = openIssues;
        break;
      case 'samples':
        renderSamples(container, data, { isAdmin: false });
        break;
      case 'clipping':
        renderClipping(container, data, { isAdmin: false });
        break;
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

// Search functionality
function setupSearch() {
  const searchInput = document.getElementById('dashboard-search');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
      // Reset: re-render all with full data
      SECTIONS.forEach(section => {
        const container = document.getElementById(`${section}-body`);
        const card = document.getElementById(`section-${section}`);
        if (card) card.style.display = '';
        if (container && allData[section]) {
          renderSection(section, container, allData[section]);
        }
      });
      return;
    }

    SECTIONS.forEach(section => {
      const container = document.getElementById(`${section}-body`);
      const card = document.getElementById(`section-${section}`);
      const data = allData[section] || [];
      const filtered = filterData(section, data, query);

      if (card) card.style.display = filtered.length > 0 ? '' : 'none';
      if (container) renderSection(section, container, filtered);
    });
  });
}

function renderSection(section, container, data) {
  const opts = { isAdmin: false };
  switch (section) {
    case 'items': renderItems(container, data, opts); break;
    case 'wallet': renderWallet(container, data, opts); break;
    case 'person': renderPerson(container, data, { isAdmin: false, onRefresh: () => loadSection('person') }); break;
    case 'maintenance': renderMaintenance(container, data, opts); break;
    case 'samples': renderSamples(container, data, opts); break;
    case 'clipping': renderClipping(container, data, opts); break;
  }
}

function filterData(section, data, query) {
  return data.filter(entry => {
    const searchFields = [];
    switch (section) {
      case 'items':
        searchFields.push(entry.name, entry.number, entry.model, entry.person, entry.status);
        break;
      case 'wallet':
        searchFields.push(entry.personOrPurpose, entry.type, String(entry.amount));
        break;
      case 'person':
        searchFields.push(entry.personName, entry.action);
        break;
      case 'maintenance':
        searchFields.push(entry.subject, entry.description, entry.category, entry.status);
        break;
      case 'samples':
        searchFields.push(entry.personName, entry.program, entry.pieces, entry.type);
        break;
      case 'clipping':
        searchFields.push(entry.clipperName, entry.size, entry.type);
        break;
    }
    return searchFields.some(f => f && String(f).toLowerCase().includes(query));
  });
}

setupSearch();

// Initialize download buttons
initDownloadButtons();

// Initial load
loadAllSections();

// Poll every 30 seconds
setInterval(loadAllSections, 30000);

// Initialize PWA features
initNotifications();
setupInstallPrompt();

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(err => {
    console.log('SW registration failed:', err.message);
  });
}

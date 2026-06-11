// Section page entry point - section.html
import { fetchSection } from '../shared/api.js';
import { formatCurrency } from '../shared/utils.js';
import { showToast } from '../shared/notifications.js';
import { renderItems } from '../sections/items.js';
import { renderWallet } from '../sections/wallet.js';
import { renderPerson } from '../sections/person.js';
import { renderMaintenance } from '../sections/maintenance.js';
import { renderSamples } from '../sections/samples.js';
import { renderClipping } from '../sections/clipping.js';
import { initDownloadButtons } from '../shared/download.js';
import { initTheme } from '../shared/theme.js';

// Initialize theme
initTheme();

// Section metadata
const SECTION_META = {
  items: {
    title: 'Items Management',
    subtitle: 'Inventory tracking & management',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    badgeClass: 'badge-primary',
    color: 'var(--accent)'
  },
  wallet: {
    title: 'Wallet',
    subtitle: 'Money in/out & balance tracking',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>',
    badgeClass: 'badge-success',
    color: 'var(--success)'
  },
  person: {
    title: 'Person Details',
    subtitle: 'Attendance & hours tracking',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    badgeClass: 'badge-primary',
    color: 'var(--info)'
  },
  maintenance: {
    title: 'Maintenance',
    subtitle: 'Complaints, issues & services',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    badgeClass: 'badge-warning',
    color: 'var(--warning)'
  },
  samples: {
    title: 'Sample Management',
    subtitle: 'Sample in/out management',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6v7l5 8H4l5-8V3z"/><line x1="8" y1="3" x2="16" y2="3"/></svg>',
    badgeClass: 'badge-primary',
    color: 'var(--accent)'
  },
  clipping: {
    title: 'Clipping Details',
    subtitle: 'Clipping details & tracking',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>',
    badgeClass: 'badge-primary',
    color: 'var(--accent)'
  }
};

// Get page from URL
const params = new URLSearchParams(window.location.search);
const page = params.get('page') || 'items';
const meta = SECTION_META[page];

// Validate page
if (!meta) {
  window.location.href = '/index.html';
}

// Update page metadata
document.title = `${meta.title} - ZAID BWP STOCK MANAGER`;
document.getElementById('section-title').textContent = meta.title;
document.getElementById('section-subtitle').textContent = meta.subtitle;
document.getElementById('section-icon').innerHTML = meta.icon;

let sectionData = [];

async function loadSection() {
  try {
    const data = await fetchSection(page);

    // Toast on change
    if (sectionData.length > 0 && JSON.stringify(data) !== JSON.stringify(sectionData)) {
      showToast('Updated', `${meta.title} data has been updated`, 'success');
    }
    sectionData = data;

    // Expose for download
    if (!window.__sectionData) window.__sectionData = {};
    window.__sectionData[page] = data;
    // Remap for download module (uses section name as key)
    window.__sectionData['current'] = data;

    const container = document.getElementById('section-body');
    if (!container) return;

    const opts = { isAdmin: false, onRefresh: loadSection };

    switch (page) {
      case 'items':
        renderItems(container, data, opts);
        updateBadge(`${data.length} items`);
        break;
      case 'wallet':
        renderWallet(container, data, opts);
        const balance = data.reduce((acc, e) => acc + (e.type === 'in' ? Number(e.amount) : -Number(e.amount)), 0);
        updateBadge(formatCurrency(balance));
        break;
      case 'person':
        renderPerson(container, data, opts);
        updateBadge(`${new Set(data.map(e => e.personName)).size} workers`);
        break;
      case 'maintenance':
        renderMaintenance(container, data, opts);
        const open = data.filter(e => e.status !== 'solved').length;
        updateBadge(`${open} open`);
        break;
      case 'samples':
        renderSamples(container, data, opts);
        updateBadge(`${data.length} entries`);
        break;
      case 'clipping':
        renderClipping(container, data, opts);
        updateBadge(`${data.length} entries`);
        break;
    }
  } catch (err) {
    console.error(`Error loading ${page}:`, err);
    const container = document.getElementById('section-body');
    if (container) {
      container.innerHTML = `<div class="empty-state"><p style="color:var(--danger);">Failed to load ${meta.title}</p></div>`;
    }
  }
}

function updateBadge(text) {
  const badge = document.getElementById('section-count');
  if (badge) badge.textContent = text;
}

// Search
function setupSearch() {
  const input = document.getElementById('section-search');
  if (!input) return;

  input.placeholder = `Search ${meta.title.toLowerCase()}...`;

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    const container = document.getElementById('section-body');
    if (!container) return;

    if (!query) {
      renderFiltered(sectionData);
      return;
    }

    const filtered = sectionData.filter(entry => {
      const fields = [];
      switch (page) {
        case 'items': fields.push(entry.name, entry.number, entry.model, entry.person, entry.status); break;
        case 'wallet': fields.push(entry.personOrPurpose, entry.type, String(entry.amount)); break;
        case 'person': fields.push(entry.personName, entry.action); break;
        case 'maintenance': fields.push(entry.subject, entry.description, entry.category, entry.status); break;
        case 'samples': fields.push(entry.personName, entry.program, entry.pieces, entry.type); break;
        case 'clipping': fields.push(entry.clipperName, entry.size, entry.type); break;
      }
      return fields.some(f => f && String(f).toLowerCase().includes(query));
    });

    renderFiltered(filtered);
  });
}

function renderFiltered(data) {
  const container = document.getElementById('section-body');
  if (!container) return;
  const opts = { isAdmin: false, onRefresh: loadSection };
  switch (page) {
    case 'items': renderItems(container, data, opts); break;
    case 'wallet': renderWallet(container, data, opts); break;
    case 'person': renderPerson(container, data, opts); break;
    case 'maintenance': renderMaintenance(container, data, opts); break;
    case 'samples': renderSamples(container, data, opts); break;
    case 'clipping': renderClipping(container, data, opts); break;
  }
}

// Update header title
const headerTitle = document.getElementById('section-header-title');
if (headerTitle) {
  headerTitle.innerHTML = `${meta.icon}<span style="margin-left:8px;">${meta.title}</span>`;
  headerTitle.querySelector('svg').style.width = '20px';
  headerTitle.querySelector('svg').style.height = '20px';
  headerTitle.querySelector('svg').style.color = meta.color;
}

// Set download dropdown section mapping
const downloadDropdown = document.getElementById('section-download');
if (downloadDropdown) {
  downloadDropdown.setAttribute('data-section', page);
}

// Init
setupSearch();
initDownloadButtons();
loadSection();

// Poll every 30 seconds
setInterval(loadSection, 30000);

// Register SW
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

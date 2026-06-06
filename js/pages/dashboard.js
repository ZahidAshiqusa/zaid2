// Dashboard page entry point - Windows 10 Desktop
import { fetchSection } from '../shared/api.js';
import { formatCurrency } from '../shared/utils.js';
import { initNotifications, setupInstallPrompt, showToast } from '../shared/notifications.js';
import { renderItems } from '../sections/items.js';
import { renderWallet } from '../sections/wallet.js';
import { renderPerson } from '../sections/person.js';
import { renderMaintenance } from '../sections/maintenance.js';
import { renderSamples } from '../sections/samples.js';
import { renderClipping } from '../sections/clipping.js';

const SECTIONS = ['items', 'wallet', 'person', 'maintenance', 'samples', 'clipping'];
const SECTION_META = {
  items:       { title: 'Items Management',   color: '#FFC107' },
  wallet:      { title: 'Wallet',             color: '#4CAF50' },
  person:      { title: 'Person Details',     color: '#2196F3' },
  maintenance: { title: 'Maintenance',        color: '#FF5722' },
  samples:     { title: 'Sample Management',  color: '#9C27B0' },
  clipping:    { title: 'Clipping Details',   color: '#E91E63' }
};

let allData = {};
let openWindows = {}; // { section: { el, minimized, maximized } }
let zCounter = 100;
let touchTimer = null;

// ========== Data Loading ==========
async function loadSection(section) {
  try {
    const data = await fetchSection(section);
    allData[section] = data;
    updateBadges(section, data);
    updateStartTiles(section, data);
    // If window is open, re-render
    if (openWindows[section] && !openWindows[section].minimized) {
      renderInWindow(section);
    }
  } catch (err) {
    console.error(`Error loading ${section}:`, err);
  }
}

async function loadAllSections() {
  await Promise.all(SECTIONS.map(s => loadSection(s)));
}

function updateBadges(section, data) {
  const badge = document.getElementById(`badge-${section}`);
  if (badge) {
    let text = '';
    switch (section) {
      case 'items': text = data.length; break;
      case 'wallet':
        const bal = data.reduce((a, e) => a + (e.type === 'in' ? Number(e.amount) : -Number(e.amount)), 0);
        text = formatCurrency(bal); break;
      case 'person':
        const today = new Date().toDateString();
        text = data.filter(e => new Date(e.timestamp).toDateString() === today).length; break;
      case 'maintenance':
        text = data.filter(e => e.status !== 'solved').length; break;
      case 'samples': text = data.length; break;
      case 'clipping': text = data.length; break;
    }
    badge.textContent = text;
  }
}

function updateStartTiles(section, data) {
  const tile = document.getElementById(`tile-${section}`);
  if (!tile) return;
  switch (section) {
    case 'items': tile.textContent = `${data.length} items`; break;
    case 'wallet':
      const bal = data.reduce((a, e) => a + (e.type === 'in' ? Number(e.amount) : -Number(e.amount)), 0);
      tile.textContent = formatCurrency(bal); break;
    case 'person':
      const today = new Date().toDateString();
      tile.textContent = `${data.filter(e => new Date(e.timestamp).toDateString() === today).length} today`; break;
    case 'maintenance':
      tile.textContent = `${data.filter(e => e.status !== 'solved').length} open`; break;
    case 'samples': tile.textContent = `${data.length} entries`; break;
    case 'clipping': tile.textContent = `${data.length} entries`; break;
  }
}

// ========== Window Management ==========
window.openFolder = function(section) {
  if (openWindows[section]) {
    // Already open - restore if minimized, bring to front
    const win = openWindows[section];
    if (win.minimized) {
      win.minimized = false;
      win.el.classList.remove('minimized');
    }
    bringToFront(section);
    return;
  }

  const meta = SECTION_META[section];
  const container = document.getElementById('win-windows');
  const isMobile = window.innerWidth <= 600;

  // Create window
  const winEl = document.createElement('div');
  winEl.className = 'win-window active';
  winEl.id = `window-${section}`;

  if (!isMobile) {
    const offset = Object.keys(openWindows).length * 30;
    winEl.style.top = `${40 + offset}px`;
    winEl.style.left = `${120 + offset}px`;
    winEl.style.width = `${Math.min(600, window.innerWidth - 160)}px`;
    winEl.style.height = `${Math.min(500, window.innerHeight - 140)}px`;
  }

  winEl.innerHTML = `
    <div class="win-titlebar" data-section="${section}">
      <div class="win-titlebar-icon">
        <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 8h16l4 4h20v28H4V8z" fill="${meta.color}"/>
          <path d="M4 14h40v26H4V14z" fill="${meta.color}" opacity="0.8"/>
        </svg>
      </div>
      <div class="win-titlebar-text">${meta.title}</div>
      <div class="win-titlebar-btns">
        <button class="win-titlebar-btn min-btn" title="Minimize">
          <svg viewBox="0 0 12 12"><line x1="1" y1="10" x2="11" y2="10" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
        <button class="win-titlebar-btn max-btn" title="Maximize">
          <svg viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>
        </button>
        <button class="win-titlebar-btn close-btn" title="Close">
          <svg viewBox="0 0 12 12"><line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" stroke-width="1.5"/><line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
      </div>
    </div>
    <div class="win-window-body">
      <div class="section-body" id="${section}-body">
        <div class="loading-overlay"><span class="loading-spinner"></span> Loading...</div>
      </div>
    </div>
  `;

  container.appendChild(winEl);

  openWindows[section] = { el: winEl, minimized: false, maximized: false };

  // Event handlers
  winEl.querySelector('.close-btn').addEventListener('click', () => closeWindow(section));
  winEl.querySelector('.min-btn').addEventListener('click', () => minimizeWindow(section));
  winEl.querySelector('.max-btn').addEventListener('click', () => toggleMaximize(section));

  // Click to focus
  winEl.addEventListener('mousedown', () => bringToFront(section));

  // Titlebar drag (desktop only)
  if (!isMobile) {
    makeDraggable(winEl, winEl.querySelector('.win-titlebar'));
  }

  bringToFront(section);
  updateTaskbarApps();
  renderInWindow(section);
};

function renderInWindow(section) {
  const body = document.getElementById(`${section}-body`);
  if (!body || !allData[section]) return;
  const data = allData[section];
  const opts = { isAdmin: false };
  switch (section) {
    case 'items': renderItems(body, data, opts); break;
    case 'wallet': renderWallet(body, data, opts); break;
    case 'person': renderPerson(body, data, opts); break;
    case 'maintenance': renderMaintenance(body, data, opts); break;
    case 'samples': renderSamples(body, data, opts); break;
    case 'clipping': renderClipping(body, data, opts); break;
  }
}

function closeWindow(section) {
  if (!openWindows[section]) return;
  openWindows[section].el.remove();
  delete openWindows[section];
  updateTaskbarApps();
}

function minimizeWindow(section) {
  if (!openWindows[section]) return;
  openWindows[section].minimized = true;
  openWindows[section].el.classList.add('minimized');
  updateTaskbarApps();
}

function toggleMaximize(section) {
  if (!openWindows[section]) return;
  const win = openWindows[section];
  win.maximized = !win.maximized;
  win.el.classList.toggle('maximized', win.maximized);
}

function bringToFront(section) {
  zCounter++;
  if (openWindows[section]) {
    openWindows[section].el.style.zIndex = zCounter;
    // Update active states
    Object.values(openWindows).forEach(w => w.el.classList.remove('active'));
    openWindows[section].el.classList.add('active');
  }
  updateTaskbarApps();
}

function makeDraggable(el, handle) {
  let isDragging = false, startX, startY, origX, origY;
  handle.addEventListener('mousedown', (e) => {
    if (e.target.closest('.win-titlebar-btn')) return;
    isDragging = true;
    startX = e.clientX; startY = e.clientY;
    origX = el.offsetLeft; origY = el.offsetTop;
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    el.style.left = `${origX + e.clientX - startX}px`;
    el.style.top = `${origY + e.clientY - startY}px`;
  });
  document.addEventListener('mouseup', () => { isDragging = false; });
}

// ========== Taskbar ==========
function updateTaskbarApps() {
  const appsEl = document.getElementById('taskbar-apps');
  if (!appsEl) return;
  appsEl.innerHTML = '';

  Object.keys(openWindows).forEach(section => {
    const meta = SECTION_META[section];
    const win = openWindows[section];
    const btn = document.createElement('button');
    btn.className = `taskbar-app-btn${(!win.minimized && win.el.classList.contains('active')) ? ' active' : ''}`;
    btn.innerHTML = `
      <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 8h16l4 4h20v28H4V8z" fill="${meta.color}"/>
        <path d="M4 14h40v26H4V14z" fill="${meta.color}" opacity="0.8"/>
      </svg>
      <span class="taskbar-app-label">${meta.title}</span>
    `;
    btn.addEventListener('click', () => {
      if (win.minimized) {
        win.minimized = false;
        win.el.classList.remove('minimized');
        bringToFront(section);
      } else if (win.el.classList.contains('active')) {
        minimizeWindow(section);
      } else {
        bringToFront(section);
      }
    });
    appsEl.appendChild(btn);
  });
}

// ========== Clock ==========
function updateClock() {
  const el = document.getElementById('taskbar-clock');
  if (!el) return;
  const now = new Date();
  const h = now.getHours() % 12 || 12;
  const m = String(now.getMinutes()).padStart(2, '0');
  const ap = now.getHours() >= 12 ? 'PM' : 'AM';
  const dateStr = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`;
  el.innerHTML = `${h}:${m} ${ap}<br>${dateStr}`;
}
updateClock();
setInterval(updateClock, 30000);

// ========== Start Menu ==========
window.toggleStartMenu = function() {
  const menu = document.getElementById('start-menu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
};

document.getElementById('taskbar-start')?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleStartMenu();
});

// Close start menu on click outside
document.addEventListener('click', (e) => {
  const menu = document.getElementById('start-menu');
  if (menu && menu.style.display !== 'none' && !menu.contains(e.target) && !e.target.closest('#taskbar-start')) {
    menu.style.display = 'none';
  }
});

// ========== Touch handling for mobile (single tap opens) ==========
window.handleTouch = function(e, section) {
  e.preventDefault();
  // On mobile, single tap opens (since dblclick doesn't exist on touch)
  if (touchTimer) {
    clearTimeout(touchTimer);
    touchTimer = null;
    // Double tap - just open
    openFolder(section);
    return;
  }
  touchTimer = setTimeout(() => {
    touchTimer = null;
    openFolder(section);
  }, 300);
};

// ========== Search ==========
function setupSearch() {
  const input = document.getElementById('taskbar-search');
  if (!input) return;

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      // Re-render all open windows with full data
      Object.keys(openWindows).forEach(section => renderInWindow(section));
      // Show all folders
      document.querySelectorAll('.folder-icon').forEach(f => f.style.display = '');
      return;
    }

    // Filter folders on desktop
    document.querySelectorAll('.folder-icon').forEach(f => {
      const sec = f.dataset.section;
      const data = allData[sec] || [];
      const hasMatch = filterData(sec, data, query).length > 0;
      f.style.opacity = hasMatch ? '1' : '0.3';
    });

    // Filter open windows
    Object.keys(openWindows).forEach(section => {
      const body = document.getElementById(`${section}-body`);
      if (body && allData[section]) {
        const filtered = filterData(section, allData[section], query);
        const opts = { isAdmin: false };
        switch (section) {
          case 'items': renderItems(body, filtered, opts); break;
          case 'wallet': renderWallet(body, filtered, opts); break;
          case 'person': renderPerson(body, filtered, opts); break;
          case 'maintenance': renderMaintenance(body, filtered, opts); break;
          case 'samples': renderSamples(body, filtered, opts); break;
          case 'clipping': renderClipping(body, filtered, opts); break;
        }
      }
    });
  });
}

function filterData(section, data, query) {
  return data.filter(entry => {
    const fields = [];
    switch (section) {
      case 'items': fields.push(entry.name, entry.number, entry.model, entry.person, entry.status); break;
      case 'wallet': fields.push(entry.personOrPurpose, entry.type, String(entry.amount)); break;
      case 'person': fields.push(entry.personName, entry.action); break;
      case 'maintenance': fields.push(entry.subject, entry.description, entry.category, entry.status); break;
      case 'samples': fields.push(entry.personName, entry.program, entry.pieces, entry.type); break;
      case 'clipping': fields.push(entry.clipperName, entry.size, entry.type); break;
    }
    return fields.some(f => f && String(f).toLowerCase().includes(query));
  });
}

// ========== Init ==========
setupSearch();
loadAllSections();
setInterval(loadAllSections, 30000);
initNotifications();
setupInstallPrompt();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(err => {
    console.log('SW registration failed:', err.message);
  });
}

// Home hub page entry point - index.html
import { fetchSection } from '../shared/api.js';
import { formatCurrency } from '../shared/utils.js';
import { initNotifications, setupInstallPrompt } from '../shared/notifications.js';
import { initTheme } from '../shared/theme.js';

// Initialize theme toggle
initTheme();

// Quick stats for the hub
async function loadHubStats() {
  try {
    const [items, wallet, person, maintenance] = await Promise.all([
      fetchSection('items'),
      fetchSection('wallet'),
      fetchSection('person'),
      fetchSection('maintenance')
    ]);

    // Items count
    const itemsEl = document.getElementById('stat-items');
    if (itemsEl) itemsEl.textContent = items.length;
    const badgeItems = document.getElementById('badge-items');
    if (badgeItems) badgeItems.textContent = items.length;

    // Wallet balance
    const balance = wallet.reduce((acc, e) => acc + (e.type === 'in' ? Number(e.amount) : -Number(e.amount)), 0);
    const walletEl = document.getElementById('stat-wallet');
    if (walletEl) {
      walletEl.textContent = formatCurrency(balance);
      walletEl.style.color = balance >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    const badgeWallet = document.getElementById('badge-wallet');
    if (badgeWallet) badgeWallet.textContent = formatCurrency(balance);

    // Person - today's activity
    const today = new Date().toDateString();
    const todayCount = person.filter(e => new Date(e.timestamp).toDateString() === today).length;
    const activityEl = document.getElementById('stat-activity');
    if (activityEl) activityEl.textContent = todayCount;
    const badgePerson = document.getElementById('badge-person');
    if (badgePerson) badgePerson.textContent = todayCount + ' today';

    // Maintenance - open issues
    const openIssues = maintenance.filter(e => e.status !== 'solved').length;
    const issuesEl = document.getElementById('stat-issues');
    if (issuesEl) issuesEl.textContent = openIssues;
    const badgeMaint = document.getElementById('badge-maintenance');
    if (badgeMaint) badgeMaint.textContent = openIssues + ' open';

    // Samples & clipping badges
    const [samples, clipping] = await Promise.all([
      fetchSection('samples'),
      fetchSection('clipping')
    ]);
    const badgeSamples = document.getElementById('badge-samples');
    if (badgeSamples) badgeSamples.textContent = samples.length;
    const badgeClipping = document.getElementById('badge-clipping');
    if (badgeClipping) badgeClipping.textContent = clipping.length;

  } catch (err) {
    console.error('Error loading hub stats:', err);
  }
}

// Animate cards on load
function animateCards() {
  const cards = document.querySelectorAll('.hub-card');
  cards.forEach((card, i) => {
    card.style.animationDelay = `${i * 0.08}s`;
    card.classList.add('hub-card-animate');
  });
}

// Init
loadHubStats();
animateCards();
initNotifications();
setupInstallPrompt();

// Poll stats every 30 seconds
setInterval(loadHubStats, 30000);

// Register SW
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

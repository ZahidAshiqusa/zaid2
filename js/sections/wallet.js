// Wallet Section UI renderer
import { formatTimestamp, formatCurrency, escapeHtml, ICONS } from '../shared/utils.js';
import { showDetailModal, showEditModal } from '../shared/modal.js';
import { deleteEntry, updateEntry } from '../shared/api.js';

export function renderWallet(container, data, { isAdmin = false, onRefresh } = {}) {
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="empty-state">${ICONS.wallet}<p>No wallet entries yet</p></div>`;
    return;
  }

  // Calculate balance
  const chronological = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  let balance = 0;
  chronological.forEach(e => {
    balance += e.type === 'in' ? Number(e.amount) : -Number(e.amount);
  });

  // Update balance badge
  const balanceBadge = document.getElementById('wallet-balance');
  if (balanceBadge) {
    balanceBadge.textContent = formatCurrency(balance);
    balanceBadge.className = `section-badge ${balance >= 0 ? 'badge-success' : 'badge-danger'}`;
  }

  const wrapper = document.createElement('div');

  // Balance display
  const balanceDiv = document.createElement('div');
  balanceDiv.className = `balance-display ${balance >= 0 ? 'balance-positive' : 'balance-negative'}`;
  balanceDiv.textContent = `Balance: ${formatCurrency(balance)}`;
  wrapper.appendChild(balanceDiv);

  // Two columns
  const columns = document.createElement('div');
  columns.className = 'dual-column';

  // Money Out (left)
  const outCol = document.createElement('div');
  outCol.className = 'column-out';
  outCol.innerHTML = `<div class="column-header">Money Out</div>`;
  const outList = document.createElement('div');
  outList.className = 'entry-list';

  const outEntries = data.filter(e => e.type === 'out');
  outEntries.forEach(entry => {
    outList.appendChild(createWalletRow(entry, isAdmin, onRefresh));
  });
  if (outEntries.length === 0) outList.innerHTML = '<div class="empty-state"><p>No expenses</p></div>';
  outCol.appendChild(outList);

  // Money In (right)
  const inCol = document.createElement('div');
  inCol.className = 'column-in';
  inCol.innerHTML = `<div class="column-header">Money In</div>`;
  const inList = document.createElement('div');
  inList.className = 'entry-list';

  const inEntries = data.filter(e => e.type === 'in');
  inEntries.forEach(entry => {
    inList.appendChild(createWalletRow(entry, isAdmin, onRefresh));
  });
  if (inEntries.length === 0) inList.innerHTML = '<div class="empty-state"><p>No income</p></div>';
  inCol.appendChild(inList);

  columns.appendChild(outCol);
  columns.appendChild(inCol);
  wrapper.appendChild(columns);

  container.innerHTML = '';
  container.appendChild(wrapper);
}

function createWalletRow(entry, isAdmin, onRefresh) {
  const row = document.createElement('div');
  row.className = `entry-row entry-${entry.type === 'in' ? 'in' : 'out'}`;

  row.innerHTML = `
    <div class="entry-info">
      <div class="entry-title">${escapeHtml(entry.personOrPurpose)}</div>
      <div class="entry-subtitle">${formatTimestamp(entry.timestamp)}</div>
    </div>
    <div class="entry-meta">
      <span class="amount ${entry.type === 'in' ? 'amount-positive' : 'amount-negative'}">${entry.type === 'in' ? '+' : '-'}${formatCurrency(entry.amount)}</span>
      ${isAdmin ? `
        <div class="entry-actions" style="opacity:1;">
          <button class="btn btn-icon btn-ghost btn-sm edit-btn">${ICONS.edit}</button>
          <button class="btn btn-icon btn-ghost btn-sm delete-btn">${ICONS.trash}</button>
        </div>
      ` : ''}
    </div>
  `;

  row.addEventListener('click', (e) => {
    if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) return;
    showDetailModal(entry, {
      title: entry.type === 'in' ? 'Money In' : 'Money Out',
      fields: [
        { label: 'Type', value: entry.type === 'in' ? 'Money In' : 'Money Out' },
        { label: entry.type === 'in' ? 'Person' : 'Used For', value: entry.personOrPurpose },
        { label: 'Amount', value: formatCurrency(entry.amount) },
        { label: 'Timestamp', value: formatTimestamp(entry.timestamp) },
        { label: 'ID', value: entry.id }
      ],
      isAdmin,
      onEdit: () => openEdit(entry, onRefresh),
      onDelete: () => handleDelete(entry.id, onRefresh)
    });
  });

  const editBtn = row.querySelector('.edit-btn');
  if (editBtn) editBtn.addEventListener('click', (e) => { e.stopPropagation(); openEdit(entry, onRefresh); });

  const deleteBtn = row.querySelector('.delete-btn');
  if (deleteBtn) deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (confirm('Delete this entry?')) await handleDelete(entry.id, onRefresh);
  });

  return row;
}

function openEdit(entry, onRefresh) {
  showEditModal(entry, {
    title: 'Edit Wallet Entry',
    fields: [
      { key: 'type', label: 'Type', type: 'select', options: ['in', 'out'] },
      { key: 'personOrPurpose', label: 'Person / Purpose', type: 'text' },
      { key: 'amount', label: 'Amount', type: 'number' }
    ],
    onSave: async (updated) => {
      await updateEntry('wallet', entry.id, updated);
      if (onRefresh) onRefresh();
    }
  });
}

async function handleDelete(id, onRefresh) {
  await deleteEntry('wallet', id);
  if (onRefresh) onRefresh();
}

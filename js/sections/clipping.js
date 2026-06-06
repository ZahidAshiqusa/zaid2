// Clipping Section UI renderer - with money transfer tracking
import { formatTimestamp, formatCurrency, escapeHtml, ICONS } from '../shared/utils.js';
import { showDetailModal, showEditModal } from '../shared/modal.js';
import { createEntry, deleteEntry, updateEntry } from '../shared/api.js';

export function renderClipping(container, data, { isAdmin = false, onRefresh } = {}) {
  const countBadge = document.getElementById('clipping-count');
  if (countBadge) countBadge.textContent = `${data.length} entries`;

  if (!data || data.length === 0) {
    container.innerHTML = `<div class="empty-state">${ICONS.scissors}<p>No clipping entries yet</p></div>`;
    return;
  }

  // Calculate total clipped-in sizes
  const inEntries = data.filter(e => e.type === 'in');
  let totalSize = 0;
  inEntries.forEach(e => {
    const num = parseFloat(e.size);
    if (!isNaN(num)) totalSize += num;
  });

  const totalRupees = totalSize * 12;

  // Calculate total transferred
  const transferEntries = data.filter(e => e.type === 'transfer');
  let totalTransferred = 0;
  transferEntries.forEach(e => {
    const num = parseFloat(e.size);
    if (!isNaN(num)) totalTransferred += num;
  });

  const remaining = totalRupees - totalTransferred;

  const wrapper = document.createElement('div');

  // Summary display at top
  const summaryDiv = document.createElement('div');
  summaryDiv.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-bottom:16px;';
  summaryDiv.innerHTML = `
    <div class="balance-display balance-positive" style="font-size:1rem;padding:10px;">
      Total Clipped In: <strong>${totalSize}</strong> <span style="font-size:0.75rem;color:var(--text-muted);">(${inEntries.length} entries)</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;text-align:center;">
      <div style="background:var(--success-bg);border:1px solid var(--success-border);border-radius:var(--radius-sm);padding:6px 4px;">
        <div style="font-size:0.6rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Total Rs.</div>
        <div style="font-size:0.95rem;font-weight:700;color:var(--success);font-family:var(--font-mono);">${formatCurrency(totalRupees)}</div>
        <div style="font-size:0.55rem;color:var(--text-muted);">${totalSize} × 12</div>
      </div>
      <div style="background:var(--warning-bg);border:1px solid var(--warning-border);border-radius:var(--radius-sm);padding:6px 4px;">
        <div style="font-size:0.6rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Transferred</div>
        <div style="font-size:0.95rem;font-weight:700;color:var(--warning);font-family:var(--font-mono);">${formatCurrency(totalTransferred)}</div>
        <div style="font-size:0.55rem;color:var(--text-muted);">${transferEntries.length} transfers</div>
      </div>
      <div style="background:${remaining > 0 ? 'var(--danger-bg)' : 'var(--success-bg)'};border:1px solid ${remaining > 0 ? 'var(--danger-border)' : 'var(--success-border)'};border-radius:var(--radius-sm);padding:6px 4px;">
        <div style="font-size:0.6rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Remaining</div>
        <div style="font-size:0.95rem;font-weight:700;color:${remaining > 0 ? 'var(--danger)' : 'var(--success)'};font-family:var(--font-mono);">${formatCurrency(remaining)}</div>
      </div>
    </div>
    ${isAdmin ? `<button class="btn btn-success btn-sm" id="transfer-btn" style="width:100%;justify-content:center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      Record Money Transfer
    </button>` : ''}
  `;
  wrapper.appendChild(summaryDiv);

  // Add transfer button handler
  const transferBtn = summaryDiv.querySelector('#transfer-btn');
  if (transferBtn) {
    transferBtn.addEventListener('click', () => {
      showEditModal({}, {
        title: 'Record Money Transfer',
        fields: [
          { key: 'clipperName', label: 'Description / Recipient', type: 'text' },
          { key: 'size', label: 'Amount (Rs.)', type: 'number' }
        ],
        onSave: async (vals) => {
          await createEntry('clipping', {
            type: 'transfer',
            clipperName: vals.clipperName || 'Transfer',
            size: vals.size || '0'
          });
          if (onRefresh) onRefresh();
        }
      });
    });
  }

  const columns = document.createElement('div');
  columns.className = 'dual-column';

  // Out entries (left)
  const outCol = document.createElement('div');
  outCol.className = 'column-out';
  outCol.innerHTML = `<div class="column-header" style="color:var(--warning);">Out for Clipping</div>`;
  const outList = document.createElement('div');
  outList.className = 'entry-list';
  const outEntries = data.filter(e => e.type === 'out');
  outEntries.forEach(entry => outList.appendChild(createRow(entry, isAdmin, onRefresh)));
  if (outEntries.length === 0) outList.innerHTML = '<div class="empty-state"><p>No out entries</p></div>';
  outCol.appendChild(outList);

  // In entries (right)
  const inCol = document.createElement('div');
  inCol.className = 'column-in';
  inCol.innerHTML = `<div class="column-header" style="color:var(--success);">Clipped In</div>`;
  const inList = document.createElement('div');
  inList.className = 'entry-list';
  inEntries.forEach(entry => inList.appendChild(createRow(entry, isAdmin, onRefresh)));
  if (inEntries.length === 0) inList.innerHTML = '<div class="empty-state"><p>No in entries</p></div>';
  inCol.appendChild(inList);

  columns.appendChild(outCol);
  columns.appendChild(inCol);
  wrapper.appendChild(columns);

  // Transfers section below
  if (transferEntries.length > 0) {
    const transDiv = document.createElement('div');
    transDiv.style.cssText = 'margin-top:16px;border-top:1px solid var(--border);padding-top:12px;';
    transDiv.innerHTML = `<div style="font-size:0.75rem;font-weight:600;color:var(--text-muted);margin-bottom:8px;">MONEY TRANSFERS</div>`;
    const transList = document.createElement('div');
    transList.className = 'entry-list';

    transferEntries.forEach(entry => {
      const row = document.createElement('div');
      row.className = 'entry-row';
      row.style.cssText = 'border-left:3px solid var(--warning);cursor:pointer;';
      row.innerHTML = `
        <div class="entry-info">
          <div class="entry-title">${escapeHtml(entry.clipperName)}</div>
          <div class="entry-subtitle">${formatTimestamp(entry.timestamp)}</div>
        </div>
        <div class="entry-meta">
          <span class="amount amount-negative">-${formatCurrency(parseFloat(entry.size) || 0)}</span>
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
          title: 'Transfer Record',
          fields: [
            { label: 'Description', value: entry.clipperName },
            { label: 'Amount', value: formatCurrency(parseFloat(entry.size) || 0) },
            { label: 'Date', value: formatTimestamp(entry.timestamp) },
            { label: 'ID', value: entry.id }
          ],
          isAdmin,
          onEdit: () => openTransferEdit(entry, onRefresh),
          onDelete: async () => {
            await deleteEntry('clipping', entry.id);
            if (onRefresh) onRefresh();
          }
        });
      });

      const editBtn = row.querySelector('.edit-btn');
      if (editBtn) editBtn.addEventListener('click', (e) => { e.stopPropagation(); openTransferEdit(entry, onRefresh); });

      const deleteBtn = row.querySelector('.delete-btn');
      if (deleteBtn) deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Delete this transfer record?')) await deleteEntry('clipping', entry.id);
        if (onRefresh) onRefresh();
      });

      transList.appendChild(row);
    });

    transDiv.appendChild(transList);
    wrapper.appendChild(transDiv);
  }

  container.innerHTML = '';
  container.appendChild(wrapper);
}

function createRow(entry, isAdmin, onRefresh) {
  const row = document.createElement('div');
  row.className = `entry-row entry-${entry.type === 'in' ? 'in' : 'out'}`;
  row.innerHTML = `
    <div class="entry-info">
      <div class="entry-title">${escapeHtml(entry.clipperName)}</div>
      <div class="entry-subtitle">Size: ${escapeHtml(entry.size) || '-'} · ${formatTimestamp(entry.timestamp)}</div>
    </div>
    ${isAdmin ? `
      <div class="entry-actions" style="opacity:1;">
        <button class="btn btn-icon btn-ghost btn-sm edit-btn">${ICONS.edit}</button>
        <button class="btn btn-icon btn-ghost btn-sm delete-btn">${ICONS.trash}</button>
      </div>
    ` : ''}
  `;

  row.addEventListener('click', (e) => {
    if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) return;
    showDetailModal(entry, {
      title: entry.type === 'in' ? 'Clipped In' : 'Out for Clipping',
      fields: [
        { label: 'Type', value: entry.type === 'in' ? 'Clipped In' : 'Out for Clipping' },
        { label: 'Clipper Name', value: entry.clipperName },
        { label: 'Size', value: entry.size || '-' },
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
    title: 'Edit Clipping Entry',
    fields: [
      { key: 'type', label: 'Type', type: 'select', options: ['in', 'out'] },
      { key: 'clipperName', label: 'Clipper Name', type: 'text' },
      { key: 'size', label: 'Size', type: 'text' }
    ],
    onSave: async (updated) => {
      await updateEntry('clipping', entry.id, updated);
      if (onRefresh) onRefresh();
    }
  });
}

function openTransferEdit(entry, onRefresh) {
  showEditModal(entry, {
    title: 'Edit Transfer Record',
    fields: [
      { key: 'clipperName', label: 'Description / Recipient', type: 'text' },
      { key: 'size', label: 'Amount (Rs.)', type: 'number' }
    ],
    onSave: async (updated) => {
      await updateEntry('clipping', entry.id, updated);
      if (onRefresh) onRefresh();
    }
  });
}

async function handleDelete(id, onRefresh) {
  await deleteEntry('clipping', id);
  if (onRefresh) onRefresh();
}

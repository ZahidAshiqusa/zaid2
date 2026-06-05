// Maintenance Section UI renderer
import { formatTimestamp, escapeHtml, ICONS } from '../shared/utils.js';
import { showDetailModal, showEditModal } from '../shared/modal.js';
import { deleteEntry, updateEntry } from '../shared/api.js';

const CATEGORY_CLASSES = {
  'Complaint': 'cat-complaint',
  'Issue': 'cat-issue',
  'Service': 'cat-service',
  'Urgent Action': 'cat-urgent'
};

export function renderMaintenance(container, data, { isAdmin = false, onRefresh } = {}) {
  // Update counts
  const countBadge = document.getElementById('maintenance-count');
  if (countBadge) {
    const open = data.filter(e => e.status !== 'solved').length;
    countBadge.textContent = `${open} open`;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<div class="empty-state">${ICONS.wrench}<p>No maintenance entries yet</p></div>`;
    return;
  }

  const total = data.length;
  const solved = data.filter(e => e.status === 'solved').length;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div style="display:flex;gap:var(--space-sm);margin-bottom:var(--space-md);flex-wrap:wrap;">
      <span class="count-badge badge-primary">Total: ${total}</span>
      <span class="count-badge badge-success">Solved: ${solved}</span>
      <span class="count-badge badge-warning">Open: ${total - solved}</span>
    </div>
  `;

  const list = document.createElement('div');
  list.className = 'entry-list';

  data.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'entry-row';

    const catClass = CATEGORY_CLASSES[entry.category] || 'cat-issue';
    const isSolved = entry.status === 'solved';

    row.innerHTML = `
      <div class="entry-info">
        <div class="entry-title" style="display:flex;align-items:center;gap:6px;">
          <span class="count-badge ${catClass}" style="font-size:0.65rem;">${escapeHtml(entry.category)}</span>
          ${escapeHtml(entry.subject)}
        </div>
        <div class="entry-subtitle">${escapeHtml(entry.description || '')}</div>
      </div>
      <div class="entry-meta">
        ${isSolved ? `<span class="solved-marker">${ICONS.check} Solved</span>` : '<span class="section-badge badge-warning">Open</span>'}
        <span class="entry-timestamp">${formatTimestamp(entry.timestamp)}</span>
        ${isAdmin ? `
          <div class="entry-actions" style="opacity:1;">
            ${!isSolved ? `<button class="btn btn-icon btn-ghost btn-sm solve-btn" title="Mark Solved">${ICONS.check}</button>` : ''}
            <button class="btn btn-icon btn-ghost btn-sm edit-btn">${ICONS.edit}</button>
            <button class="btn btn-icon btn-ghost btn-sm delete-btn">${ICONS.trash}</button>
          </div>
        ` : ''}
      </div>
    `;

    row.addEventListener('click', (e) => {
      if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn') || e.target.closest('.solve-btn')) return;
      showDetailModal(entry, {
        title: entry.subject,
        fields: [
          { label: 'Category', value: entry.category },
          { label: 'Subject', value: entry.subject },
          { label: 'Description', value: entry.description || '-' },
          { label: 'Status', value: entry.status === 'solved' ? 'Solved' : 'Open' },
          { label: 'Created', value: formatTimestamp(entry.timestamp) },
          { label: 'Solved At', value: entry.solvedAt ? formatTimestamp(entry.solvedAt) : '-' },
          { label: 'ID', value: entry.id }
        ],
        isAdmin,
        onEdit: () => openEdit(entry, onRefresh),
        onDelete: () => handleDelete(entry.id, onRefresh)
      });
    });

    const solveBtn = row.querySelector('.solve-btn');
    if (solveBtn) {
      solveBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await updateEntry('maintenance', entry.id, { status: 'solved' });
        if (onRefresh) onRefresh();
      });
    }

    const editBtn = row.querySelector('.edit-btn');
    if (editBtn) editBtn.addEventListener('click', (e) => { e.stopPropagation(); openEdit(entry, onRefresh); });

    const deleteBtn = row.querySelector('.delete-btn');
    if (deleteBtn) deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('Delete this entry?')) await handleDelete(entry.id, onRefresh);
    });

    list.appendChild(row);
  });

  wrapper.appendChild(list);
  container.innerHTML = '';
  container.appendChild(wrapper);
}

function openEdit(entry, onRefresh) {
  showEditModal(entry, {
    title: 'Edit Maintenance Entry',
    fields: [
      { key: 'category', label: 'Category', type: 'select', options: ['Complaint', 'Issue', 'Service', 'Urgent Action'] },
      { key: 'subject', label: 'Subject', type: 'text' },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['open', 'solved'] }
    ],
    onSave: async (updated) => {
      await updateEntry('maintenance', entry.id, updated);
      if (onRefresh) onRefresh();
    }
  });
}

async function handleDelete(id, onRefresh) {
  await deleteEntry('maintenance', id);
  if (onRefresh) onRefresh();
}

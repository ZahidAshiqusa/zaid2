// Items Section UI renderer - Grid layout
import { formatTimestamp, escapeHtml, ICONS } from '../shared/utils.js';
import { showDetailModal, showEditModal } from '../shared/modal.js';
import { deleteEntry, updateEntry } from '../shared/api.js';

export function renderItems(container, data, { isAdmin = false, onRefresh } = {}) {
  const countBadge = document.getElementById('items-count');
  if (countBadge) countBadge.textContent = `${data.length} items`;

  if (!data || data.length === 0) {
    container.innerHTML = `<div class="empty-state">${ICONS.box}<p>No items yet</p></div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'items-grid';
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;';

  data.forEach(item => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;cursor:pointer;transition:all 0.2s ease;position:relative;';

    card.innerHTML = `
      <div style="font-size:0.95rem;font-weight:600;color:var(--text-primary);margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.name)}</div>
      <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:4px;">${item.number ? 'S/N: ' + escapeHtml(item.number) : 'No serial'}</div>
      <div style="font-size:0.75rem;color:var(--text-muted);">${item.model ? escapeHtml(item.model) : 'No model'}</div>
      <span class="section-badge ${item.status === 'available' ? 'badge-success' : 'badge-warning'}" style="position:absolute;top:8px;right:8px;font-size:0.6rem;padding:2px 6px;">${escapeHtml(item.status || 'available')}</span>
      ${isAdmin ? `<div class="item-card-actions" style="display:none;position:absolute;bottom:8px;right:8px;gap:4px;">
        <button class="btn btn-icon btn-ghost btn-sm edit-btn">${ICONS.edit}</button>
        <button class="btn btn-icon btn-ghost btn-sm delete-btn">${ICONS.trash}</button>
      </div>` : ''}
    `;

    // Show actions on hover (admin only)
    if (isAdmin) {
      card.addEventListener('mouseenter', () => {
        const actions = card.querySelector('.item-card-actions');
        if (actions) actions.style.display = 'flex';
      });
      card.addEventListener('mouseleave', () => {
        const actions = card.querySelector('.item-card-actions');
        if (actions) actions.style.display = 'none';
      });
    }

    // Click to show full details
    card.addEventListener('click', (e) => {
      if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) return;
      showDetailModal(item, {
        title: item.name,
        fields: [
          { label: 'Item Name', value: item.name },
          { label: 'Serial Number', value: item.number || '-' },
          { label: 'Model', value: item.model || '-' },
          { label: 'Quantity', value: item.quantity || 1 },
          { label: 'Person', value: item.person || '-' },
          { label: 'Status', value: item.status || 'available' },
          { label: 'Timestamp', value: formatTimestamp(item.timestamp) },
          { label: 'ID', value: item.id }
        ],
        isAdmin,
        onEdit: () => openEditForm(item, onRefresh),
        onDelete: () => handleDelete(item.id, onRefresh)
      });
    });

    const editBtn = card.querySelector('.edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditForm(item, onRefresh);
      });
    }

    const deleteBtn = card.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Delete this item?')) {
          await handleDelete(item.id, onRefresh);
        }
      });
    }

    grid.appendChild(card);
  });

  container.innerHTML = '';
  container.appendChild(grid);
}

function openEditForm(item, onRefresh) {
  showEditModal(item, {
    title: 'Edit Item',
    fields: [
      { key: 'name', label: 'Item Name', type: 'text' },
      { key: 'number', label: 'Serial Number', type: 'text' },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'person', label: 'Person', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['available', 'in-use', 'maintenance'] }
    ],
    onSave: async (updated) => {
      await updateEntry('items', item.id, updated);
      if (onRefresh) onRefresh();
    }
  });
}

async function handleDelete(id, onRefresh) {
  await deleteEntry('items', id);
  if (onRefresh) onRefresh();
}

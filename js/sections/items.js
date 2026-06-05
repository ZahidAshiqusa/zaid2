// Items Section UI renderer
import { formatTimestamp, escapeHtml, ICONS } from '../shared/utils.js';
import { showDetailModal, showEditModal } from '../shared/modal.js';
import { deleteEntry, updateEntry } from '../shared/api.js';

export function renderItems(container, data, { isAdmin = false, onRefresh } = {}) {
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="empty-state">${ICONS.box}<p>No items yet</p></div>`;
    return;
  }

  const list = document.createElement('div');
  list.className = 'entry-list';

  data.forEach(item => {
    const row = document.createElement('div');
    row.className = 'entry-row';

    row.innerHTML = `
      <div class="entry-info">
        <div class="entry-title">${escapeHtml(item.name)}</div>
        <div class="entry-subtitle">${item.model ? escapeHtml(item.model) + ' · ' : ''}${item.number ? '#' + escapeHtml(item.number) + ' · ' : ''}Qty: ${item.quantity || 1}${item.person ? ' · ' + escapeHtml(item.person) : ''}</div>
      </div>
      <div class="entry-meta">
        <span class="section-badge ${item.status === 'available' ? 'badge-success' : 'badge-warning'}">${escapeHtml(item.status || 'available')}</span>
        <span class="entry-timestamp">${formatTimestamp(item.timestamp)}</span>
        ${isAdmin ? `
          <div class="entry-actions" style="opacity:1;">
            <button class="btn btn-icon btn-ghost btn-sm edit-btn" title="Edit">${ICONS.edit}</button>
            <button class="btn btn-icon btn-ghost btn-sm delete-btn" title="Delete">${ICONS.trash}</button>
          </div>
        ` : ''}
      </div>
    `;

    // Click to show details
    row.addEventListener('click', (e) => {
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

    // Edit button
    const editBtn = row.querySelector('.edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditForm(item, onRefresh);
      });
    }

    // Delete button
    const deleteBtn = row.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Delete this item?')) {
          await handleDelete(item.id, onRefresh);
        }
      });
    }

    list.appendChild(row);
  });

  container.innerHTML = '';
  container.appendChild(list);
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

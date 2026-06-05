// Reusable detail/edit/delete modal component
import { escapeHtml, formatTimestamp, ICONS } from './utils.js';

let currentOverlay = null;

export function closeModal() {
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
}

export function showDetailModal(entry, { title, fields, isAdmin, onEdit, onDelete }) {
  closeModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  const modal = document.createElement('div');
  modal.className = 'modal';

  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';
  header.innerHTML = `
    <h3 class="modal-title">${escapeHtml(title || 'Entry Details')}</h3>
    <button class="btn btn-icon btn-ghost" id="modal-close">${ICONS.x}</button>
  `;

  // Body
  const body = document.createElement('div');
  body.className = 'modal-body';

  const detailGrid = document.createElement('div');
  detailGrid.style.cssText = 'display:flex;flex-direction:column;gap:12px;';

  fields.forEach(field => {
    const row = document.createElement('div');
    row.innerHTML = `
      <div style="font-size:0.7rem;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(field.label)}</div>
      <div style="font-size:0.875rem;font-weight:500;color:var(--text-primary);">${escapeHtml(String(field.value || '-'))}</div>
    `;
    detailGrid.appendChild(row);
  });

  body.appendChild(detailGrid);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'modal-footer';

  if (isAdmin && onDelete) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-sm';
    deleteBtn.innerHTML = `${ICONS.trash} Delete`;
    deleteBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this entry?')) {
        onDelete();
        closeModal();
      }
    });
    footer.appendChild(deleteBtn);
  }

  if (isAdmin && onEdit) {
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-primary btn-sm';
    editBtn.innerHTML = `${ICONS.edit} Edit`;
    editBtn.addEventListener('click', () => {
      closeModal();
      onEdit();
    });
    footer.appendChild(editBtn);
  }

  modal.appendChild(header);
  modal.appendChild(body);
  if (footer.children.length > 0) modal.appendChild(footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  currentOverlay = overlay;

  header.querySelector('#modal-close').addEventListener('click', closeModal);
}

export function showEditModal(entry, { title, fields, onSave }) {
  closeModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  const modal = document.createElement('div');
  modal.className = 'modal';

  const header = document.createElement('div');
  header.className = 'modal-header';
  header.innerHTML = `
    <h3 class="modal-title">${escapeHtml(title || 'Edit Entry')}</h3>
    <button class="btn btn-icon btn-ghost" id="modal-close">${ICONS.x}</button>
  `;

  const body = document.createElement('div');
  body.className = 'modal-body';

  const form = document.createElement('form');
  const inputs = {};

  fields.forEach(field => {
    const group = document.createElement('div');
    group.className = 'form-group';
    group.innerHTML = `<label class="form-label">${escapeHtml(field.label)}</label>`;

    if (field.type === 'select' && field.options) {
      const select = document.createElement('select');
      select.className = 'form-select';
      field.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (entry[field.key] === opt) option.selected = true;
        select.appendChild(option);
      });
      inputs[field.key] = select;
      group.appendChild(select);
    } else {
      const input = document.createElement('input');
      input.type = field.type || 'text';
      input.className = 'form-input';
      input.value = entry[field.key] || '';
      if (field.placeholder) input.placeholder = field.placeholder;
      inputs[field.key] = input;
      group.appendChild(input);
    }

    form.appendChild(group);
  });

  body.appendChild(form);

  const footer = document.createElement('div');
  footer.className = 'modal-footer';
  footer.innerHTML = `
    <button type="button" class="btn btn-ghost" id="modal-cancel">Cancel</button>
    <button type="button" class="btn btn-primary" id="modal-save">${ICONS.check} Save Changes</button>
  `;

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  currentOverlay = overlay;

  header.querySelector('#modal-close').addEventListener('click', closeModal);
  footer.querySelector('#modal-cancel').addEventListener('click', closeModal);
  footer.querySelector('#modal-save').addEventListener('click', () => {
    const updated = {};
    Object.entries(inputs).forEach(([key, el]) => {
      updated[key] = el.value;
    });
    onSave(updated);
    closeModal();
  });
}

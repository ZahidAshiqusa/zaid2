// Person Details Section UI renderer - Dynamic workers + time editing + monthly history
import { formatTimestamp, formatShortTime, escapeHtml, calculateHours, getAbsents, getMonthName, ICONS } from '../shared/utils.js';
import { showDetailModal, showEditModal } from '../shared/modal.js';
import { createEntry, deleteEntry, updateEntry } from '../shared/api.js';

let selectedMonth = new Date().getMonth();
let selectedYear = new Date().getFullYear();

export function renderPerson(container, data, { isAdmin = false, onRefresh } = {}) {
  const now = new Date();

  // Extract unique workers dynamically from data
  const workerSet = new Set();
  const defaultWorkers = ['Nadeem', 'Zeeshan'];
  defaultWorkers.forEach(w => workerSet.add(w));
  if (data && data.length > 0) {
    data.forEach(e => { if (e.personName) workerSet.add(e.personName); });
  }
  const workers = [...workerSet].sort();

  const wrapper = document.createElement('div');

  // Month selector
  const monthSelector = document.createElement('div');
  monthSelector.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:var(--space-md);';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn btn-ghost btn-icon btn-sm';
  prevBtn.innerHTML = ICONS.arrowLeft || `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
  prevBtn.title = 'Previous month';
  prevBtn.addEventListener('click', () => {
    selectedMonth--;
    if (selectedMonth < 0) { selectedMonth = 11; selectedYear--; }
    if (onRefresh) onRefresh();
  });

  const monthLabel = document.createElement('span');
  monthLabel.style.cssText = 'font-size:0.85rem;font-weight:600;color:var(--text-primary);min-width:120px;text-align:center;';
  monthLabel.textContent = `${getMonthName(selectedMonth)} ${selectedYear}`;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-ghost btn-icon btn-sm';
  nextBtn.innerHTML = ICONS.arrowRight || `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
  nextBtn.title = 'Next month';
  nextBtn.addEventListener('click', () => {
    selectedMonth++;
    if (selectedMonth > 11) { selectedMonth = 0; selectedYear++; }
    if (onRefresh) onRefresh();
  });

  // Today button to jump back to current month
  const todayBtn = document.createElement('button');
  todayBtn.className = 'btn btn-ghost btn-sm';
  todayBtn.style.cssText += 'font-size:0.7rem;padding:4px 8px;';
  todayBtn.textContent = 'Today';
  todayBtn.addEventListener('click', () => {
    selectedMonth = now.getMonth();
    selectedYear = now.getFullYear();
    if (onRefresh) onRefresh();
  });

  monthSelector.appendChild(prevBtn);
  monthSelector.appendChild(monthLabel);
  monthSelector.appendChild(nextBtn);
  monthSelector.appendChild(todayBtn);
  wrapper.appendChild(monthSelector);

  // Monthly summary card
  const summaryCard = document.createElement('div');
  summaryCard.style.cssText = 'background:var(--bg-secondary);border-radius:var(--radius);padding:10px 12px;margin-bottom:var(--space-md);';

  let totalHoursAll = 0;
  let totalDaysAll = 0;
  let totalAbsentsAll = 0;

  const workerStats = workers.map(name => {
    const hours = calculateHours(data, name, selectedMonth, selectedYear);
    const absents = getAbsents(data, name, selectedMonth, selectedYear);
    totalHoursAll += hours.totalHours;
    totalDaysAll += hours.daysWorked;
    totalAbsentsAll += absents;
    return { name, hours, absents };
  });

  summaryCard.innerHTML = `
    <div style="font-size:0.65rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">MONTHLY SUMMARY</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center;">
      <div style="background:var(--bg-card);border-radius:var(--radius-sm);padding:6px;">
        <div style="font-size:0.6rem;color:var(--text-muted);">Total Hours</div>
        <div style="font-size:1rem;font-weight:700;color:var(--accent);font-family:var(--font-mono);">${totalHoursAll}h</div>
      </div>
      <div style="background:var(--bg-card);border-radius:var(--radius-sm);padding:6px;">
        <div style="font-size:0.6rem;color:var(--text-muted);">Days Worked</div>
        <div style="font-size:1rem;font-weight:700;color:var(--success);font-family:var(--font-mono);">${totalDaysAll}</div>
      </div>
      <div style="background:var(--bg-card);border-radius:var(--radius-sm);padding:6px;">
        <div style="font-size:0.6rem;color:var(--text-muted);">Absents</div>
        <div style="font-size:1rem;font-weight:700;color:var(--danger);font-family:var(--font-mono);">${totalAbsentsAll}</div>
      </div>
    </div>
  `;
  wrapper.appendChild(summaryCard);

  const grid = document.createElement('div');
  grid.className = 'attendance-grid';

  workerStats.forEach(({ name, hours, absents }) => {
    const card = document.createElement('div');
    card.className = 'worker-card';

    card.innerHTML = `
      <div class="worker-name">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        ${escapeHtml(name)}
      </div>
      ${isAdmin && selectedMonth === now.getMonth() && selectedYear === now.getFullYear() ? `
        <div class="worker-actions">
          <button class="btn btn-success btn-sm mark-enter-btn">${ICONS.login} Enter</button>
          <button class="btn btn-danger btn-sm mark-exit-btn">${ICONS.logout} Exit</button>
        </div>
      ` : ''}
      <div class="worker-stats">
        <div class="stat-box">
          <div class="stat-value">${hours.totalHours}h</div>
          <div class="stat-label">Hours</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${absents}</div>
          <div class="stat-label">Absents</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${hours.daysWorked}d</div>
          <div class="stat-label">Days</div>
        </div>
      </div>
    `;

    // Enter/Exit buttons
    const enterBtn = card.querySelector('.mark-enter-btn');
    if (enterBtn) {
      enterBtn.addEventListener('click', async () => {
        await createEntry('person', { personName: name, action: 'enter' });
        if (onRefresh) onRefresh();
      });
    }

    const exitBtn = card.querySelector('.mark-exit-btn');
    if (exitBtn) {
      exitBtn.addEventListener('click', async () => {
        await createEntry('person', { personName: name, action: 'exit' });
        if (onRefresh) onRefresh();
      });
    }

    // Show entries for selected month
    const monthEntries = data.filter(e => {
      const d = new Date(e.timestamp);
      return e.personName === name && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Group by date
    const byDate = {};
    monthEntries.forEach(e => {
      const dateKey = new Date(e.timestamp).toDateString();
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(e);
    });

    if (Object.keys(byDate).length > 0) {
      const historyDiv = document.createElement('div');
      historyDiv.style.cssText = 'margin-top:10px;border-top:1px solid var(--border);padding-top:8px;';
      historyDiv.innerHTML = `<div style="font-size:0.65rem;font-weight:600;color:var(--text-muted);margin-bottom:6px;">ATTENDANCE LOG (${Object.keys(byDate).length} days)</div>`;

      // Show recent dates first
      const dateKeys = Object.keys(byDate).sort((a, b) => new Date(b) - new Date(a));
      const displayDates = dateKeys.slice(0, 7); // Show last 7 days of the month

      displayDates.forEach(dateKey => {
        const entries = byDate[dateKey];
        const d = new Date(dateKey);
        const dayStr = d.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric' });

        const dayDiv = document.createElement('div');
        dayDiv.style.cssText = 'margin-bottom:4px;';
        dayDiv.innerHTML = `<div style="font-size:0.6rem;color:var(--text-muted);margin-bottom:2px;">${dayStr}</div>`;

        entries.forEach(entry => {
          const eRow = document.createElement('div');
          eRow.className = `entry-row entry-${entry.action === 'enter' ? 'in' : 'out'}`;
          eRow.style.cssText = 'padding:3px 6px;cursor:pointer;gap:4px;';
          eRow.innerHTML = `
            <div class="entry-info" style="flex:1;">
              <span class="section-badge ${entry.action === 'enter' ? 'badge-success' : 'badge-danger'}" style="font-size:0.55rem;">${entry.action === 'enter' ? 'In' : 'Out'}</span>
            </div>
            <span class="entry-timestamp" style="font-size:0.65rem;">${formatShortTime(entry.timestamp)}</span>
            ${isAdmin ? `
              <div style="display:flex;gap:1px;">
                <button class="btn btn-icon btn-ghost btn-sm time-btn" title="Edit time" style="width:22px;height:22px;padding:2px;">${ICONS.clock}</button>
              </div>
            ` : ''}
          `;

          const timeBtn = eRow.querySelector('.time-btn');
          if (timeBtn) {
            timeBtn.addEventListener('click', (ev) => {
              ev.stopPropagation();
              openTimeEdit(entry, onRefresh);
            });
          }

          eRow.addEventListener('click', (ev) => {
            if (ev.target.closest('.time-btn')) return;
            showDetailModal(entry, {
              title: `${name} - ${entry.action === 'enter' ? 'Entry' : 'Exit'}`,
              fields: [
                { label: 'Worker', value: name },
                { label: 'Action', value: entry.action === 'enter' ? 'Entry' : 'Exit' },
                { label: 'Time', value: formatTimestamp(entry.timestamp) }
              ],
              isAdmin,
              onEdit: () => openTimeEdit(entry, onRefresh),
              onDelete: async () => {
                await deleteEntry('person', entry.id);
                if (onRefresh) onRefresh();
              }
            });
          });

          dayDiv.appendChild(eRow);
        });

        historyDiv.appendChild(dayDiv);
      });

      if (dateKeys.length > 7) {
        const moreBtn = document.createElement('button');
        moreBtn.className = 'btn btn-ghost btn-sm';
        moreBtn.style.cssText += 'width:100%;justify-content:center;margin-top:4px;font-size:0.65rem;';
        moreBtn.textContent = `Show all ${dateKeys.length} days`;
        moreBtn.addEventListener('click', () => {
          // Remove the more button and show remaining dates
          moreBtn.remove();
          dateKeys.slice(7).forEach(dateKey => {
            const entries = byDate[dateKey];
            const d = new Date(dateKey);
            const dayStr = d.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric' });

            const dayDiv = document.createElement('div');
            dayDiv.style.cssText = 'margin-bottom:4px;';
            dayDiv.innerHTML = `<div style="font-size:0.6rem;color:var(--text-muted);margin-bottom:2px;">${dayStr}</div>`;

            entries.forEach(entry => {
              const eRow = document.createElement('div');
              eRow.className = `entry-row entry-${entry.action === 'enter' ? 'in' : 'out'}`;
              eRow.style.cssText = 'padding:3px 6px;cursor:pointer;gap:4px;';
              eRow.innerHTML = `
                <div class="entry-info" style="flex:1;">
                  <span class="section-badge ${entry.action === 'enter' ? 'badge-success' : 'badge-danger'}" style="font-size:0.55rem;">${entry.action === 'enter' ? 'In' : 'Out'}</span>
                </div>
                <span class="entry-timestamp" style="font-size:0.65rem;">${formatShortTime(entry.timestamp)}</span>
                ${isAdmin ? `
                  <div style="display:flex;gap:1px;">
                    <button class="btn btn-icon btn-ghost btn-sm time-btn" title="Edit time" style="width:22px;height:22px;padding:2px;">${ICONS.clock}</button>
                  </div>
                ` : ''}
              `;

              const timeBtn = eRow.querySelector('.time-btn');
              if (timeBtn) {
                timeBtn.addEventListener('click', (ev) => {
                  ev.stopPropagation();
                  openTimeEdit(entry, onRefresh);
                });
              }

              eRow.addEventListener('click', (ev) => {
                if (ev.target.closest('.time-btn')) return;
                showDetailModal(entry, {
                  title: `${name} - ${entry.action === 'enter' ? 'Entry' : 'Exit'}`,
                  fields: [
                    { label: 'Worker', value: name },
                    { label: 'Action', value: entry.action === 'enter' ? 'Entry' : 'Exit' },
                    { label: 'Time', value: formatTimestamp(entry.timestamp) }
                  ],
                  isAdmin,
                  onEdit: () => openTimeEdit(entry, onRefresh),
                  onDelete: async () => {
                    await deleteEntry('person', entry.id);
                    if (onRefresh) onRefresh();
                  }
                });
              });

              dayDiv.appendChild(eRow);
            });

            historyDiv.appendChild(dayDiv);
          });
        });
        historyDiv.appendChild(moreBtn);
      }

      card.appendChild(historyDiv);
    }

    grid.appendChild(card);
  });

  wrapper.appendChild(grid);
  container.innerHTML = '';
  container.appendChild(wrapper);
}

// Open time edit modal
function openTimeEdit(entry, onRefresh) {
  const d = new Date(entry.timestamp);
  const dateStr = d.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm

  showEditModal(entry, {
    title: `Edit ${entry.personName}'s ${entry.action === 'enter' ? 'Entry' : 'Exit'} Time`,
    fields: [
      { key: 'timestamp', label: 'Date & Time', type: 'datetime-local', value: dateStr }
    ],
    onSave: async (updated) => {
      if (updated.timestamp) {
        updated.timestamp = new Date(updated.timestamp).toISOString();
      }
      await updateEntry('person', entry.id, updated);
      if (onRefresh) onRefresh();
    }
  });
}

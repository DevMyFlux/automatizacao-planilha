/**
 * SummaryPanel — renders the change-log summary panel in the DOM.
 * Requires the following elements in index.html:
 *   #summary-panel  (the <section>, hidden by default)
 *   #summary-stats  (stat cards container)
 *   #summary-log    (log entries list)
 */
export class SummaryPanel {
  /**
   * @param {HTMLElement} container - The #summary-panel element
   */
  constructor(container) {
    this._panel = container;
    this._stats = container.querySelector('#summary-stats');
    this._log   = container.querySelector('#summary-log');
  }

  /**
   * Renders the summary panel with stats and per-entry log.
   * @param {import('./types.js').ChangeEntry[]} changeLog
   * @param {Object} [columnTypes] - Optional column-type suggestions (unused in display for now)
   */
  render(changeLog, columnTypes) {
    // Show the panel
    this._panel.classList.remove('hidden');

    this._renderStats(changeLog);
    this._renderLog(changeLog);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Builds stat cards grouped by entry type.
   * @param {import('./types.js').ChangeEntry[]} changeLog
   */
  _renderStats(changeLog) {
    const counts = {};
    for (const entry of changeLog) {
      counts[entry.type] = (counts[entry.type] || 0) + 1;
    }

    const labels = {
      removed_row:        'Linhas removidas',
      removed_col:        'Colunas removidas',
      text_changed:       'Textos alterados',
      date_formatted:     'Datas formatadas',
      currency_formatted: 'Moedas formatadas',
      duplicate_found:    'Duplicatas',
      ambiguous_date:     'Datas ambíguas',
      header_detected:    'Cabeçalho detectado',
    };

    this._stats.textContent = '';

    for (const [type, count] of Object.entries(counts)) {
      const card = document.createElement('div');
      card.className = 'summary-stat';

      const value = document.createElement('span');
      value.className = 'summary-stat__value';
      value.textContent = String(count);

      const label = document.createElement('span');
      label.className = 'summary-stat__label';
      label.textContent = labels[type] || type;

      card.appendChild(value);
      card.appendChild(label);
      this._stats.appendChild(card);
    }
  }

  /**
   * Builds one log-entry div per ChangeEntry.
   * @param {import('./types.js').ChangeEntry[]} changeLog
   */
  _renderLog(changeLog) {
    this._log.textContent = '';

    for (const entry of changeLog) {
      const item = document.createElement('div');
      item.className = `log-entry log-entry--${entry.type}`;
      item.setAttribute('role', 'listitem');

      // Type badge
      const typeEl = document.createElement('span');
      typeEl.className = 'log-entry__type';
      typeEl.textContent = entry.type;
      item.appendChild(typeEl);

      // Description
      const descEl = document.createElement('span');
      descEl.className = 'log-entry__desc';
      descEl.textContent = entry.description || '';
      item.appendChild(descEl);

      // Before → After diff (when present)
      if (entry.before !== undefined || entry.after !== undefined) {
        const diffEl = document.createElement('span');
        diffEl.className = 'log-entry__diff';
        const before = entry.before !== undefined ? entry.before : '';
        const after  = entry.after  !== undefined ? entry.after  : '';
        diffEl.textContent = `"${before}" → "${after}"`;
        item.appendChild(diffEl);
      }

      this._log.appendChild(item);
    }
  }
}

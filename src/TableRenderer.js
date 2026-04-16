/**
 * TableRenderer
 * Renders a clean data matrix as an interactive HTML table with:
 * - Highlighted header row
 * - Visual highlights for changed cells (from changeLog)
 * - Column sorting by clicking headers
 * - XSS-safe cell insertion via textContent
 * - Virtualization for datasets > 1000 rows
 */
export class TableRenderer {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this._container = container;
    /** @type {string[][]} */
    this._data = [];
    /** @type {import('./types.js').ChangeEntry[]} */
    this._changeLog = [];
    /** @type {Array<{header:string,suggestedType:string}>} */
    this._columnTypes = [];
    /** @type {Set<string>} keys "row,col" of changed cells */
    this._changedCells = new Set();
    /** @type {Map<string, string>} keys "row,col" → CSS class */
    this._cellClasses = new Map();
    /** @type {number|null} column index being sorted */
    this._sortCol = null;
    /** @type {'asc'|'desc'} */
    this._sortDir = 'asc';
    /** @type {number[]} row indices in current display order (data rows only, 0-based into _data[1..]) */
    this._sortedRowIndices = [];

    // Virtualization state
    this._rowHeight = 32; // px per row
    this._bufferRows = 5;
    this._virtualEnabled = false;
    this._scrollHandler = null;
    this._virtualWrapper = null;
    this._spacerTop = null;
    this._spacerBottom = null;
    this._tbody = null;
    this._table = null;
  }

  /**
   * Render the table.
   * @param {string[][]} data - First row is the header
   * @param {import('./types.js').ChangeEntry[]} changeLog
   * @param {Array<{header:string,suggestedType:string}>|null} columnTypes
   */
  render(data, changeLog, columnTypes) {
    this._data = data;
    this._changeLog = changeLog || [];
    this._columnTypes = columnTypes || [];

    // Reset sort state
    this._sortCol = null;
    this._sortDir = 'asc';
    this._sortedRowIndices = data.length > 1
      ? Array.from({ length: data.length - 1 }, (_, i) => i)
      : [];

    // Build change maps before rendering
    this._buildChangeMaps();

    // Decide virtualization
    this._virtualEnabled = (data.length - 1) > 1000;

    // Clear container
    this._container.innerHTML = '';
    this._removeScrollListener();

    if (!data || data.length === 0) return;

    if (this._virtualEnabled) {
      this._renderVirtual();
    } else {
      this._renderFull();
    }

    this._renderFooterTotals();
    this.enableSorting();
  }

  // ---------------------------------------------------------------------------
  // Footer totals
  // ---------------------------------------------------------------------------

  _renderFooterTotals() {
    if (!this._table || this._data.length < 2) return;

    // Remove existing tfoot
    const existingTfoot = this._table.querySelector('tfoot');
    if (existingTfoot) existingTfoot.remove();

    const tfoot = document.createElement('tfoot');
    const tr = document.createElement('tr');
    tr.className = 'totals-row';

    const headers = this._data[0] || [];
    headers.forEach((_, colIdx) => {
      const td = document.createElement('td');
      const type = this._columnTypes[colIdx]?.suggestedType;

      if (type === 'currency' || type === 'number') {
        // Calculate sum for this column
        let sum = 0;
        let count = 0;
        for (let i = 1; i < this._data.length; i++) {
          const val = this._data[i][colIdx] || '';
          const cleaned = val.replace(/[^\d.,-]/g, '').replace(',', '.');
          const num = parseFloat(cleaned);
          if (!isNaN(num)) {
            sum += num;
            count++;
          }
        }

        if (count > 0) {
          if (type === 'currency') {
            td.textContent = `R$ ${sum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          } else {
            td.textContent = sum.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
          }
          td.classList.add('td--total');
        } else {
          td.textContent = '—';
        }
      } else if (colIdx === 0) {
        // First column: show row count
        td.textContent = `${this._data.length - 1} linhas`;
        td.classList.add('td--total-label');
      } else {
        td.textContent = '';
      }

      tr.appendChild(td);
    });

    tfoot.appendChild(tr);
    this._table.appendChild(tfoot);
  }

  // ---------------------------------------------------------------------------
  // Internal: build change maps from changeLog
  // ---------------------------------------------------------------------------

  _buildChangeMaps() {
    this._changedCells = new Set();
    this._cellClasses = new Map();

    for (const entry of this._changeLog) {
      if (entry.row == null || entry.col == null) continue;
      const key = `${entry.row},${entry.col}`;
      this._changedCells.add(key);

      // Map entry type to CSS class
      let cls = 'cell--changed';
      if (entry.type === 'removed_row') cls = 'cell--removed';
      else if (entry.type === 'duplicate_found') cls = 'cell--duplicate';
      else if (entry.type === 'date_formatted') cls = 'cell--date';
      else if (entry.type === 'currency_formatted') cls = 'cell--currency';

      // Keep the most specific class if multiple entries hit the same cell
      if (!this._cellClasses.has(key)) {
        this._cellClasses.set(key, cls);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Full render (≤ 1000 data rows)
  // ---------------------------------------------------------------------------

  _renderFull() {
    const table = document.createElement('table');
    table.className = 'data-table';
    this._table = table;

    table.appendChild(this._buildThead());

    const tbody = document.createElement('tbody');
    this._tbody = tbody;

    for (const rowIdx of this._sortedRowIndices) {
      tbody.appendChild(this._buildDataRow(rowIdx));
    }

    table.appendChild(tbody);
    this._container.appendChild(table);
  }

  // ---------------------------------------------------------------------------
  // Virtual render (> 1000 data rows)
  // ---------------------------------------------------------------------------

  _renderVirtual() {
    // Outer wrapper that will scroll
    const wrapper = document.createElement('div');
    wrapper.className = 'table-virtual-wrapper';
    this._virtualWrapper = wrapper;

    const table = document.createElement('table');
    table.className = 'data-table';
    this._table = table;

    table.appendChild(this._buildThead());

    const tbody = document.createElement('tbody');
    this._tbody = tbody;

    // Spacers
    const spacerTop = document.createElement('tr');
    spacerTop.className = 'virtual-spacer virtual-spacer--top';
    const spacerTopTd = document.createElement('td');
    spacerTopTd.colSpan = this._data[0]?.length || 1;
    spacerTop.appendChild(spacerTopTd);
    this._spacerTop = spacerTop;

    const spacerBottom = document.createElement('tr');
    spacerBottom.className = 'virtual-spacer virtual-spacer--bottom';
    const spacerBottomTd = document.createElement('td');
    spacerBottomTd.colSpan = this._data[0]?.length || 1;
    spacerBottom.appendChild(spacerBottomTd);
    this._spacerBottom = spacerBottom;

    tbody.appendChild(spacerTop);
    tbody.appendChild(spacerBottom);
    table.appendChild(tbody);
    wrapper.appendChild(table);
    this._container.appendChild(wrapper);

    // Initial render
    this._updateVirtualRows(0);

    // Scroll listener
    this._scrollHandler = () => {
      this._updateVirtualRows(wrapper.scrollTop);
    };
    wrapper.addEventListener('scroll', this._scrollHandler, { passive: true });
  }

  /**
   * Update which rows are rendered based on scroll position.
   * @param {number} scrollTop
   */
  _updateVirtualRows(scrollTop) {
    const totalRows = this._sortedRowIndices.length;
    const containerHeight = this._virtualWrapper.clientHeight || 600;
    const rowH = this._rowHeight;

    const firstVisible = Math.floor(scrollTop / rowH);
    const visibleCount = Math.ceil(containerHeight / rowH);

    const startIdx = Math.max(0, firstVisible - this._bufferRows);
    const endIdx = Math.min(totalRows - 1, firstVisible + visibleCount + this._bufferRows);

    // Update spacer heights
    this._spacerTop.firstChild.style.height = `${startIdx * rowH}px`;
    this._spacerBottom.firstChild.style.height = `${(totalRows - 1 - endIdx) * rowH}px`;

    // Remove existing data rows (keep spacers)
    const existingRows = this._tbody.querySelectorAll('tr.data-row');
    existingRows.forEach(r => r.remove());

    // Insert new rows between spacers
    const fragment = document.createDocumentFragment();
    for (let i = startIdx; i <= endIdx; i++) {
      const rowIdx = this._sortedRowIndices[i];
      const tr = this._buildDataRow(rowIdx);
      fragment.appendChild(tr);
    }
    // Insert before spacerBottom
    this._tbody.insertBefore(fragment, this._spacerBottom);
  }

  // ---------------------------------------------------------------------------
  // DOM builders
  // ---------------------------------------------------------------------------

  _buildThead() {
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');

    const headers = this._data[0] || [];
    headers.forEach((headerText, colIdx) => {
      const th = document.createElement('th');
      th.dataset.col = colIdx;

      const type = this._columnTypes[colIdx]?.suggestedType || 'text';
      th.dataset.colType = type;
      th.classList.add(`th--${type}`);
      th.textContent = headerText;

      tr.appendChild(th);
    });

    thead.appendChild(tr);
    return thead;
  }

  /**
   * Build a <tr> for a data row.
   * @param {number} rowIdx - 0-based index into _data[1..]
   */
  _buildDataRow(rowIdx) {
    // rowIdx is 0-based among data rows; actual matrix row = rowIdx + 1
    const matrixRow = rowIdx + 1;
    const row = this._data[matrixRow] || [];

    const tr = document.createElement('tr');
    tr.className = 'data-row';
    tr.dataset.row = rowIdx;

    // Check if entire row is a duplicate
    const isDuplicate = this._changeLog.some(
      e => e.type === 'duplicate_found' && e.row === matrixRow
    );
    if (isDuplicate) tr.classList.add('row--duplicate');

    // Detect if this is a total/subtotal row (heuristic: contains "total", "subtotal", "soma" in first few cells)
    const firstCells = row.slice(0, 3).join(' ').toLowerCase();
    const isTotalRow = /\b(total|subtotal|soma|saldo|resultado)\b/.test(firstCells);
    if (isTotalRow) tr.classList.add('row--total');

    row.forEach((cellValue, colIdx) => {
      const td = document.createElement('td');
      td.textContent = cellValue; // XSS-safe (req 11.4, 15.3)

      const type = this._columnTypes[colIdx]?.suggestedType || 'text';
      td.dataset.colType = type;
      td.classList.add(`td--${type}`);

      const key = `${matrixRow},${colIdx}`;
      if (this._changedCells.has(key)) {
        td.classList.add(this._cellClasses.get(key));
      }

      tr.appendChild(td);
    });

    return tr;
  }

  // ---------------------------------------------------------------------------
  // Public: highlightChanges
  // ---------------------------------------------------------------------------

  /**
   * Re-apply highlights based on a new changeLog without full re-render.
   * @param {import('./types.js').ChangeEntry[]} changeLog
   */
  highlightChanges(changeLog) {
    this._changeLog = changeLog || [];
    this._buildChangeMaps();

    if (!this._tbody) return;

    const rows = this._tbody.querySelectorAll('tr.data-row');
    rows.forEach(tr => {
      const rowIdx = parseInt(tr.dataset.row, 10);
      const matrixRow = rowIdx + 1;

      // Reset duplicate class
      tr.classList.remove('row--duplicate');
      const isDuplicate = this._changeLog.some(
        e => e.type === 'duplicate_found' && e.row === matrixRow
      );
      if (isDuplicate) tr.classList.add('row--duplicate');

      const cells = tr.querySelectorAll('td');
      cells.forEach((td, colIdx) => {
        // Remove all highlight classes
        td.classList.remove('cell--changed', 'cell--removed', 'cell--duplicate', 'cell--date', 'cell--currency');

        const key = `${matrixRow},${colIdx}`;
        if (this._changedCells.has(key)) {
          td.classList.add(this._cellClasses.get(key));
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Public: enableSorting
  // ---------------------------------------------------------------------------

  /**
   * Enable column sorting by clicking header cells.
   * Clicking the same column toggles asc/desc; a sort indicator (▲/▼) is shown.
   */
  enableSorting() {
    if (!this._table) return;

    const ths = this._table.querySelectorAll('thead th');
    ths.forEach(th => {
      // Remove previous listener by cloning
      const newTh = th.cloneNode(true);
      th.parentNode.replaceChild(newTh, th);

      newTh.addEventListener('click', () => {
        const colIdx = parseInt(newTh.dataset.col, 10);
        this._applySort(colIdx);
      });
    });
  }

  /**
   * Sort data rows by the given column index.
   * @param {number} colIdx
   */
  _applySort(colIdx) {
    if (this._sortCol === colIdx) {
      this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this._sortCol = colIdx;
      this._sortDir = 'asc';
    }

    // Sort the row indices
    this._sortedRowIndices.sort((a, b) => {
      const valA = (this._data[a + 1]?.[colIdx] ?? '').toLowerCase();
      const valB = (this._data[b + 1]?.[colIdx] ?? '').toLowerCase();

      // Numeric sort if both look like numbers
      const numA = parseFloat(valA.replace(/[^\d.,-]/g, '').replace(',', '.'));
      const numB = parseFloat(valB.replace(/[^\d.,-]/g, '').replace(',', '.'));
      let cmp;
      if (!isNaN(numA) && !isNaN(numB)) {
        cmp = numA - numB;
      } else {
        cmp = valA.localeCompare(valB, 'pt-BR');
      }

      return this._sortDir === 'asc' ? cmp : -cmp;
    });

    // Update header indicators
    const ths = this._table.querySelectorAll('thead th');
    ths.forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
      // Clear any indicator text added previously
      const indicator = th.querySelector('.sort-indicator');
      if (indicator) indicator.remove();
    });

    const activeTh = this._table.querySelector(`thead th[data-col="${colIdx}"]`);
    if (activeTh) {
      activeTh.classList.add(this._sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
      const span = document.createElement('span');
      span.className = 'sort-indicator';
      span.textContent = this._sortDir === 'asc' ? ' ▲' : ' ▼';
      activeTh.appendChild(span);
    }

    // Re-render rows
    if (this._virtualEnabled) {
      const scrollTop = this._virtualWrapper?.scrollTop || 0;
      this._updateVirtualRows(scrollTop);
    } else {
      this._rerenderTbody();
    }
  }

  _rerenderTbody() {
    if (!this._tbody) return;
    this._tbody.innerHTML = '';
    for (const rowIdx of this._sortedRowIndices) {
      this._tbody.appendChild(this._buildDataRow(rowIdx));
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  _removeScrollListener() {
    if (this._scrollHandler && this._virtualWrapper) {
      this._virtualWrapper.removeEventListener('scroll', this._scrollHandler);
      this._scrollHandler = null;
    }
  }
}

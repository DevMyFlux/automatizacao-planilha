/**
 * App — orquestrador principal da aplicação Excel Data Cleaner.
 * Requisitos: 2.3, 2.4, 2.5, 13.3, 14.1, 14.2, 14.3
 */

import { FileUploader } from './FileUploader.js';
import { SheetParser } from './SheetParser.js';
import { PdfParser } from './PdfParser.js';
import { CleaningPipeline } from './CleaningPipeline.js';
import { TableRenderer } from './TableRenderer.js';
import { Exporter } from './Exporter.js';
import { SummaryPanel } from './SummaryPanel.js';
import { SampleExporter } from './SampleExporter.js';

class App {
  constructor() {
    /** @type {string|null} */
    this._filename = null;
    /** @type {Object|null} SheetJS workbook */
    this._workbook = null;
    /** @type {string[]|null} */
    this._sheetNames = null;
    /** @type {string|null} */
    this._activeSheet = null;
    /** @type {string[][]|null} */
    this._cleanData = null;
    /** @type {Array<{header:string,suggestedType:string}>|null} */
    this._columnTypes = null;
    /** @type {string[][]|null} raw matrix extracted from PDF */
    this._rawMatrixFromPdf = null;
    /** @type {boolean} */
    this._pipelineRan = false;

    // Component instances (set in init)
    this._parser = null;
    this._pdfParser = null;
    this._renderer = null;
    this._exporter = null;
    this._summaryPanel = null;
  }

  init() {
    // Instantiate components
    this._parser = new SheetParser();
    this._pdfParser = new PdfParser();
    this._exporter = new Exporter();
    this._sampleExporter = new SampleExporter();

    const tableContainer = document.getElementById('table-container');
    this._renderer = new TableRenderer(tableContainer);

    const summaryPanelEl = document.getElementById('summary-panel');
    this._summaryPanel = new SummaryPanel(summaryPanelEl);

    // FileUploader — connects drop zone with onFileLoaded callback
    const dropZone = document.getElementById('drop-zone');
    const uploader = new FileUploader(dropZone, (buffer, filename) => {
      this.handleFileLoaded(buffer, filename);
    });
    uploader.init();

    // Sheet selector change event (req 2.5)
    const sheetSelector = document.getElementById('sheet-selector');
    sheetSelector.addEventListener('change', () => {
      this.handleSheetChange(sheetSelector.value);
    });

    // Export button (req 13.3)
    const btnExport = document.getElementById('btn-export');
    btnExport.addEventListener('click', () => {
      this.handleExport();
    });

    // Sample download button
    const btnSample = document.getElementById('btn-sample');
    if (btnSample) {
      btnSample.addEventListener('click', () => {
        this._sampleExporter.exportSample();
      });
    }

    // Cleaning option checkboxes / selects (req 14.1, 14.3)
    const optionIds = [
      'opt-removeEmptyRows',
      'opt-removeEmptyColumns',
      'opt-trimWhitespace',
      'opt-standardizeText',
      'opt-formatDates',
      'opt-formatCurrency',
      'opt-detectDuplicates',
      'opt-autoDetectTypes',
      'opt-textCase',
    ];
    optionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => this.handleCleaningOptionsChange());
      }
    });

    // Show/hide textCase selector when standardizeText toggled (req 14.2)
    const standardizeTextCb = document.getElementById('opt-standardizeText');
    const textCaseSelector = document.getElementById('text-case-selector');
    standardizeTextCb.addEventListener('change', () => {
      if (standardizeTextCb.checked) {
        textCaseSelector.classList.remove('hidden');
      } else {
        textCaseSelector.classList.add('hidden');
      }
    });
  }

  /**
   * Called by FileUploader when a file has been read as ArrayBuffer.
   * @param {ArrayBuffer} buffer
   * @param {string} filename
   */
  async handleFileLoaded(buffer, filename) {
    this._filename = filename;
    this._pipelineRan = false;
    this._disableExport();

    const ext = filename.split('.').pop().toLowerCase();

    // ── PDF path ──────────────────────────────────────────────────────────────
    if (ext === 'pdf') {
      this._showInfo('Extraindo tabela do PDF… aguarde.');
      try {
        const rawMatrix = await this._pdfParser.parse(buffer, (page, total) => {
          this._showInfo(`Processando página ${page} de ${total}…`);
        });

        this._clearMessages();

        if (!rawMatrix.length || !rawMatrix.some(r => r.some(c => c.trim()))) {
          this._showEmptyWarning('Nenhum dado tabular encontrado no PDF. Verifique se o PDF contém texto selecionável (não é uma imagem escaneada).');
          return;
        }

        // Armazena como rawData diretamente (sem workbook)
        this._workbook = null;
        this._sheetNames = null;
        this._activeSheet = null;
        this._rawMatrixFromPdf = rawMatrix;

        // Oculta seletor de aba
        document.getElementById('sheet-selector-section').classList.add('hidden');

        this._runPipelineWithMatrix(rawMatrix);
      } catch (err) {
        this._showParseError('Não foi possível extrair dados do PDF. Certifique-se de que o PDF contém texto (não é escaneado).');
      }
      return;
    }

    // ── Spreadsheet path ──────────────────────────────────────────────────────
    this._rawMatrixFromPdf = null;

    let parsed;
    try {
      parsed = this._parser.parse(buffer);
    } catch (_) {
      this._showParseError('Arquivo inválido ou corrompido. Tente outro arquivo.');
      return;
    }

    this._workbook = parsed.workbook;
    this._sheetNames = parsed.sheetNames;

    const sheetSelector = document.getElementById('sheet-selector');
    const sheetSelectorSection = document.getElementById('sheet-selector-section');

    sheetSelector.innerHTML = '';
    this._sheetNames.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sheetSelector.appendChild(opt);
    });

    if (this._sheetNames.length > 1) {
      sheetSelectorSection.classList.remove('hidden');
    } else {
      sheetSelectorSection.classList.add('hidden');
    }

    this._activeSheet = this._sheetNames[0];
    sheetSelector.value = this._activeSheet;

    this._runPipeline();
  }

  /**
   * Called when the user selects a different sheet.
   * @param {string} sheetName
   */
  handleSheetChange(sheetName) {
    this._activeSheet = sheetName;
    this._runPipeline();
  }

  /**
   * Called when any cleaning option changes — reads DOM state and re-runs pipeline.
   */
  handleCleaningOptionsChange() {
    if (!this._workbook && !this._rawMatrixFromPdf) return;
    if (this._rawMatrixFromPdf) {
      this._runPipelineWithMatrix(this._rawMatrixFromPdf);
    } else {
      this._runPipeline();
    }
  }

  /**
   * Called when the user clicks the export button.
   */
  handleExport() {
    if (!this._pipelineRan || !this._cleanData) return;
    this._exporter.exportToXlsx(this._cleanData, this._filename, this._columnTypes || []);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /**
   * Reads current CleaningOptions from DOM checkboxes/selects.
   * @returns {import('./types.js').CleaningOptions}
   */
  _readOptions() {
    return {
      removeEmptyRows:    document.getElementById('opt-removeEmptyRows').checked,
      removeEmptyColumns: document.getElementById('opt-removeEmptyColumns').checked,
      trimWhitespace:     document.getElementById('opt-trimWhitespace').checked,
      standardizeText:    document.getElementById('opt-standardizeText').checked,
      textCase:           document.getElementById('opt-textCase').value,
      formatDates:        document.getElementById('opt-formatDates').checked,
      formatCurrency:     document.getElementById('opt-formatCurrency').checked,
      detectDuplicates:   document.getElementById('opt-detectDuplicates').checked,
      autoDetectTypes:    document.getElementById('opt-autoDetectTypes').checked,
    };
  }

  /**
   * Core pipeline execution for spreadsheet files.
   */
  _runPipeline() {
    const rawMatrix = this._parser.sheetToMatrix(this._workbook, this._activeSheet);
    this._runPipelineWithMatrix(rawMatrix);
  }

  /**
   * Core pipeline execution — accepts a raw matrix directly.
   * @param {string[][]} rawMatrix
   */
  _runPipelineWithMatrix(rawMatrix) {
    this._pipelineRan = false;
    this._disableExport();

    // Check for empty matrix
    const hasData = rawMatrix.length > 0 &&
      rawMatrix.some(row => row.some(cell => cell.trim() !== ''));

    if (!hasData) {
      this._showEmptyWarning('Nenhum dado encontrado na aba selecionada.');
      return;
    }

    this._clearMessages();

    const options = this._readOptions();
    const pipeline = new CleaningPipeline(options);
    const { cleanData, changeLog, columnTypes } = pipeline.run(rawMatrix);

    this._cleanData = cleanData;
    this._columnTypes = columnTypes;

    const tablePlaceholder = document.getElementById('table-placeholder');
    const tableContainer = document.getElementById('table-container');
    tablePlaceholder.classList.add('hidden');
    tableContainer.classList.remove('hidden');

    this._renderer.render(cleanData, changeLog, columnTypes);
    this._summaryPanel.render(changeLog, columnTypes);

    this._pipelineRan = true;
    this._enableExport();
  }

  _enableExport() {
    const btn = document.getElementById('btn-export');
    btn.disabled = false;
    btn.setAttribute('aria-disabled', 'false');
  }

  _disableExport() {
    const btn = document.getElementById('btn-export');
    btn.disabled = true;
    btn.setAttribute('aria-disabled', 'true');
  }

  /** Display a parse error in the upload-error element (req 2.3). */
  _showParseError(msg) {
    const el = document.getElementById('upload-error');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  /** Display an info/progress message in the warning element. */
  _showInfo(msg) {
    const el = document.getElementById('upload-warning');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  /** Display an empty-data warning (req 2.4). */
  _showEmptyWarning(msg) {
    const el = document.getElementById('upload-warning');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');

    // Hide table, show placeholder
    document.getElementById('table-placeholder').classList.remove('hidden');
    document.getElementById('table-container').classList.add('hidden');
    document.getElementById('summary-panel').classList.add('hidden');
  }

  _clearMessages() {
    ['upload-error', 'upload-warning'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = '';
      el.classList.add('hidden');
    });
  }
}

// Bootstrap
const app = new App();
app.init();

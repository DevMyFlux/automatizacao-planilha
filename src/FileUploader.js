/**
 * FileUploader — gerencia upload via drag-and-drop e seletor de arquivo.
 * Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 15.2
 */

const MAX_SIZE_BYTES    = 50 * 1024 * 1024; // 50 MB
const WARN_SIZE_BYTES   = 10 * 1024 * 1024; // 10 MB

const VALID_EXTENSIONS  = new Set(['.xlsx', '.xls', '.csv', '.pdf']);

const VALID_MIME_TYPES  = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel',                                           // .xls
  'text/csv',                                                           // .csv
  'text/plain',                                                         // .csv (alguns SOs)
  'application/csv',                                                    // .csv alternativo
  'application/pdf',                                                    // .pdf
]);

export class FileUploader {
  /**
   * @param {HTMLElement} dropZone       - Elemento da zona de drop (#drop-zone)
   * @param {Function}    onFileLoaded   - Callback(ArrayBuffer, filename)
   */
  constructor(dropZone, onFileLoaded) {
    this._dropZone     = dropZone;
    this._onFileLoaded = onFileLoaded;
    this._fileInput    = document.getElementById('file-input');
    this._errorEl      = document.getElementById('upload-error');
    this._warningEl    = document.getElementById('upload-warning');
    this._fileInfoEl   = document.getElementById('file-info');
  }

  /** Registra eventos de drag-and-drop e input[type=file] */
  init() {
    const dz = this._dropZone;

    // Previne comportamento padrão do navegador para todos os eventos de drag
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
      dz.addEventListener(evt, e => e.preventDefault());
      document.body.addEventListener(evt, e => e.preventDefault());
    });

    // Feedback visual
    dz.addEventListener('dragenter', () => dz.classList.add('drop-zone--active'));
    dz.addEventListener('dragover',  () => dz.classList.add('drop-zone--active'));
    dz.addEventListener('dragleave', () => dz.classList.remove('drop-zone--active'));

    // Req 1.1 — drag-and-drop
    dz.addEventListener('drop', e => {
      dz.classList.remove('drop-zone--active');
      const file = e.dataTransfer?.files?.[0];
      if (file) this._handleFile(file);
    });

    // Req 1.2 — seletor de arquivo
    if (this._fileInput) {
      this._fileInput.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (file) this._handleFile(file);
        // Limpa o valor para permitir re-seleção do mesmo arquivo
        e.target.value = '';
      });
    }
  }

  /**
   * Lê o arquivo e retorna ArrayBuffer via FileReader.
   * @param {File} file
   * @returns {Promise<ArrayBuffer>}
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
      reader.readAsArrayBuffer(file);
    });
  }

  // ─── Privado ────────────────────────────────────────────────────────────────

  /**
   * Valida e processa o arquivo selecionado/solto.
   * @param {File} file
   */
  async _handleFile(file) {
    this._clearMessages();

    // Req 1.3 / 1.4 — validar extensão
    const ext = this._getExtension(file.name);
    if (!VALID_EXTENSIONS.has(ext)) {
      this._showError(
        `Formato inválido: "${file.name}". Apenas arquivos .xlsx, .xls e .csv são aceitos.`
      );
      return;
    }

    // Req 15.2 — validar tipo MIME (ignora se vazio, pois alguns SOs não informam)
    if (file.type && !VALID_MIME_TYPES.has(file.type)) {
      this._showError(
        `Tipo de arquivo não reconhecido (${file.type}). Verifique se o arquivo é uma planilha válida.`
      );
      return;
    }

    // Req 1.6 — rejeitar arquivos >50 MB
    if (file.size > MAX_SIZE_BYTES) {
      this._showError(
        `Arquivo muito grande (${this._formatSize(file.size)}). O tamanho máximo permitido é 50 MB.`
      );
      return;
    }

    // Req 1.7 — aviso para arquivos entre 10 MB e 50 MB
    if (file.size > WARN_SIZE_BYTES) {
      this._showWarning(
        `Arquivo grande (${this._formatSize(file.size)}). O processamento pode demorar alguns segundos.`
      );
    }

    // Exibe informações do arquivo
    this._showFileInfo(file);

    // Req 1.5 — ler como ArrayBuffer e invocar callback
    try {
      const buffer = await this.readFile(file);
      this._onFileLoaded(buffer, file.name);
    } catch (err) {
      this._showError('Não foi possível ler o arquivo. Tente novamente.');
    }
  }

  /**
   * Retorna a extensão em minúsculas, incluindo o ponto (ex: ".xlsx").
   * @param {string} filename
   * @returns {string}
   */
  _getExtension(filename) {
    const idx = filename.lastIndexOf('.');
    return idx !== -1 ? filename.slice(idx).toLowerCase() : '';
  }

  /**
   * Formata bytes em string legível (KB / MB).
   * @param {number} bytes
   * @returns {string}
   */
  _formatSize(bytes) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  _showError(msg) {
    if (!this._errorEl) return;
    this._errorEl.textContent = msg;
    this._errorEl.classList.remove('hidden');
  }

  _showWarning(msg) {
    if (!this._warningEl) return;
    this._warningEl.textContent = msg;
    this._warningEl.classList.remove('hidden');
  }

  _showFileInfo(file) {
    if (!this._fileInfoEl) return;
    this._fileInfoEl.textContent = `${file.name} — ${this._formatSize(file.size)}`;
    this._fileInfoEl.classList.remove('hidden');
  }

  _clearMessages() {
    [this._errorEl, this._warningEl].forEach(el => {
      if (!el) return;
      el.textContent = '';
      el.classList.add('hidden');
    });
  }
}

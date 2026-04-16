/**
 * CleaningPipeline — executa transformações de limpeza sobre a matriz de dados.
 * @module CleaningPipeline
 */

/**
 * Verifica se uma string representa um valor numérico.
 * @param {string} cell
 * @returns {boolean}
 */
function isNumeric(cell) {
  const trimmed = cell.trim();
  if (trimmed === '') return false;
  return !isNaN(Number(trimmed));
}

class CleaningPipeline {
  /**
   * @param {import('./types.js').CleaningOptions} options
   */
  constructor(options) {
    this.options = options || {};
    /** @type {import('./types.js').ChangeEntry[]} */
    this.changeLog = [];
  }

  // ─── Requisito 3: Detecção de Cabeçalho ────────────────────────────────────

  /**
   * Detecta a linha de cabeçalho pela heurística de densidade de texto.
   * Analisa as primeiras 10 linhas e retorna o índice da linha com maior
   * pontuação (textCells * 2 - numericCells).
   *
   * Requisitos: 3.1, 3.2, 3.3, 3.4
   *
   * @param {string[][]} matrix
   * @returns {number} headerRowIndex (0-based)
   */
  detectHeader(matrix) {
    let bestScore = -Infinity;
    let bestIndex = 0;

    const limit = Math.min(10, matrix.length);

    for (let i = 0; i < limit; i++) {
      const row = matrix[i];
      const nonEmptyCells = row.filter(cell => cell.trim() !== '').length;
      const numericCells = row.filter(cell => isNumeric(cell)).length;
      const textCells = nonEmptyCells - numericCells;
      const score = textCells * 2 - numericCells;

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    // Requisito 3.4 — registrar header_detected no changeLog
    this.changeLog.push({
      type: 'header_detected',
      description: `Cabeçalho detectado na linha ${bestIndex}`,
      row: bestIndex,
    });

    return bestIndex;
  }

  // ─── Requisito 4: Remoção de Linhas e Colunas Vazias ───────────────────────

  /**
   * Remove linhas onde todas as células são vazias ou apenas espaços.
   * Preserva linhas parcialmente preenchidas (req 4.5).
   * Registra removed_row com índice original (req 4.3).
   *
   * Requisitos: 4.1, 4.3, 4.5, 4.6
   *
   * @param {string[][]} matrix
   * @returns {string[][]} nova matriz sem linhas vazias
   */
  removeEmptyRows(matrix) {
    const result = [];

    for (let i = 0; i < matrix.length; i++) {
      const row = matrix[i];
      const isEmpty = row.every(cell => cell.trim() === '');

      if (isEmpty) {
        // Requisito 4.3 — registrar remoção com índice original
        this.changeLog.push({
          type: 'removed_row',
          description: `Linha vazia removida (índice original: ${i})`,
          row: i,
        });
      } else {
        result.push(row);
      }
    }

    return result;
  }

  /**
   * Remove colunas onde todas as células são vazias ou apenas espaços.
   * Garante que todas as linhas resultantes tenham o mesmo número de colunas (req 4.7).
   * Registra removed_col com índice original (req 4.4).
   *
   * Requisitos: 4.2, 4.4, 4.7
   *
   * @param {string[][]} matrix
   * @returns {string[][]} nova matriz sem colunas vazias
   */
  removeEmptyColumns(matrix) {
    if (matrix.length === 0) return matrix;

    const numCols = Math.max(...matrix.map(row => row.length));
    const colsToKeep = [];

    for (let col = 0; col < numCols; col++) {
      const allEmpty = matrix.every(row => {
        const cell = row[col] !== undefined ? row[col] : '';
        return cell.trim() === '';
      });

      if (allEmpty) {
        // Requisito 4.4 — registrar remoção com índice original
        this.changeLog.push({
          type: 'removed_col',
          description: `Coluna vazia removida (índice original: ${col})`,
          col: col,
        });
      } else {
        colsToKeep.push(col);
      }
    }

    // Requisito 4.7 — todas as linhas com mesmo número de colunas
    return matrix.map(row =>
      colsToKeep.map(col => (row[col] !== undefined ? row[col] : ''))
    );
  }

  // ─── Requisito 5: Remoção de Espaços Extras ────────────────────────────────

  /**
   * Remove espaços no início/fim e substitui múltiplos espaços internos por um único.
   * Registra alterações no changeLog com tipo `text_changed`.
   *
   * Requisitos: 5.1, 5.2, 5.3, 5.4
   *
   * @param {string[][]} matrix
   * @returns {string[][]}
   */
  trimWhitespace(matrix) {
    return matrix.map((row, rowIdx) =>
      row.map((cell, colIdx) => {
        const trimmed = cell.trim().replace(/  +/g, ' ');
        if (trimmed !== cell) {
          this.changeLog.push({
            type: 'text_changed',
            description: `Espaços extras removidos na célula (${rowIdx}, ${colIdx})`,
            row: rowIdx,
            col: colIdx,
            before: cell,
            after: trimmed,
          });
        }
        return trimmed;
      })
    );
  }

  // ─── Requisito 6: Padronização de Capitalização ─────────────────────────────

  /**
   * Padroniza capitalização conforme configuração (UPPER, lower, Title Case).
   * Não aplica ao cabeçalho.
   * Registra alterações no changeLog com tipo `text_changed`.
   *
   * Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5
   *
   * @param {string[][]} matrix
   * @param {number} headerRow - índice da linha de cabeçalho
   * @returns {string[][]}
   */
  standardizeText(matrix, headerRow) {
    const mode = this.options.textCase;

    /**
     * @param {string} str
     * @returns {string}
     */
    function applyCase(str) {
      if (mode === 'UPPER') return str.toUpperCase();
      if (mode === 'lower') return str.toLowerCase();
      if (mode === 'Title') {
        return str.replace(/\S+/g, word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        );
      }
      return str;
    }

    return matrix.map((row, rowIdx) => {
      // Requisito 6.4 — não aplicar ao cabeçalho
      if (rowIdx === headerRow) return row;

      return row.map((cell, colIdx) => {
        // Não aplicar a células numéricas
        if (isNumeric(cell)) return cell;

        const transformed = applyCase(cell);
        if (transformed !== cell) {
          this.changeLog.push({
            type: 'text_changed',
            description: `Capitalização padronizada (${mode}) na célula (${rowIdx}, ${colIdx})`,
            row: rowIdx,
            col: colIdx,
            before: cell,
            after: transformed,
          });
        }
        return transformed;
      });
    });
  }

  // ─── Requisito 7: Formatação de Datas ──────────────────────────────────────

  /**
   * Detecta e converte datas para DD/MM/AAAA.
   * Mantém valor original para datas ambíguas (registra `ambiguous_date`) e não-datas.
   * Nunca lança exceção.
   *
   * Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
   *
   * @param {string[][]} matrix
   * @returns {string[][]}
   */
  formatDates(matrix) {
    const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;           // YYYY-MM-DD
    const DDMMYYYY_RE = /^\d{2}-\d{2}-\d{4}$/;      // DD-MM-YYYY
    const SHORT_RE = /^\d{1,2}\/\d{1,2}\/\d{2}$/;   // D/M/YY (2-digit year)
    const ALREADY_RE = /^\d{2}\/\d{2}\/\d{4}$/;     // DD/MM/YYYY — already formatted

    /**
     * Pad a number to 2 digits.
     * @param {number|string} n
     * @returns {string}
     */
    function pad(n) {
      return String(n).padStart(2, '0');
    }

    /**
     * Expand a 2-digit year: 00-49 → 2000s, 50-99 → 1900s.
     * @param {number} yy
     * @returns {number}
     */
    function expandYear(yy) {
      return yy <= 49 ? 2000 + yy : 1900 + yy;
    }

    /**
     * Try to convert a cell value to DD/MM/YYYY.
     * Returns null if not a recognised date pattern.
     * Returns 'ambiguous' if the date is ambiguous.
     * @param {string} cell
     * @returns {string|null|'ambiguous'}
     */
    function convertDate(cell) {
      try {
        // Already in target format — skip
        if (ALREADY_RE.test(cell)) return null;

        // ISO: YYYY-MM-DD
        if (ISO_RE.test(cell)) {
          const [yyyy, mm, dd] = cell.split('-');
          return `${dd}/${mm}/${yyyy}`;
        }

        // DD-MM-YYYY
        if (DDMMYYYY_RE.test(cell)) {
          const [dd, mm, yyyy] = cell.split('-');
          return `${dd}/${mm}/${yyyy}`;
        }

        // D/M/YY — abbreviated (2-digit year)
        if (SHORT_RE.test(cell)) {
          const parts = cell.split('/');
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const yy = parseInt(parts[2], 10);

          // Ambiguous: all three parts are 1-2 digits and could be D/M/YY or M/D/YY
          // We consider it ambiguous when the year part is also ≤ 12 (could be a day/month)
          if (yy <= 12) return 'ambiguous';

          const yyyy = expandYear(yy);
          return `${pad(d)}/${pad(m)}/${yyyy}`;
        }

        return null; // not a recognised date
      } catch (_) {
        return null; // Requisito 7.8 — never throw
      }
    }

    return matrix.map((row, rowIdx) => {
      // Skip header row (headerRowIndex may be undefined when called standalone)
      if (this.headerRowIndex !== undefined && rowIdx === this.headerRowIndex) return row;

      return row.map((cell, colIdx) => {
        try {
          const result = convertDate(cell);

          if (result === null) return cell; // not a date or already formatted

          if (result === 'ambiguous') {
            // Requisito 7.5
            this.changeLog.push({
              type: 'ambiguous_date',
              description: `Data ambígua mantida na célula (${rowIdx}, ${colIdx})`,
              row: rowIdx,
              col: colIdx,
              before: cell,
              after: cell,
            });
            return cell;
          }

          // Requisito 7.4 — log date_formatted
          this.changeLog.push({
            type: 'date_formatted',
            description: `Data formatada para DD/MM/AAAA na célula (${rowIdx}, ${colIdx})`,
            row: rowIdx,
            col: colIdx,
            before: cell,
            after: result,
          });
          return result;
        } catch (_) {
          return cell; // Requisito 7.8 — never throw
        }
      });
    });
  }

  // ─── Requisito 8: Formatação de Valores Monetários ─────────────────────────

  /**
   * Detecta e formata valores monetários para R$ 1.234,56.
   * Suporta formato BR (1.234,56), US (1,234.56) e numérico simples (1234.56).
   * Nunca lança exceção. Registra `currency_formatted` no changeLog.
   *
   * Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
   *
   * @param {string[][]} matrix
   * @returns {string[][]}
   */
  formatCurrency(matrix) {
    const BR_RE = /^\d{1,3}(\.\d{3})*(,\d{2})?$/;
    const US_RE = /^\d{1,3}(,\d{3})*(\.\d{2})?$/;
    const SIMPLE_RE = /^\d+(\.\d+)?$/;

    /**
     * Converte uma célula para R$ 1.234,56 ou retorna o original.
     * @param {string} cell
     * @returns {string}
     */
    function convertCurrency(cell) {
      try {
        const cleaned = cell.replace(/[R$\s]/g, '');

        let value;
        if (BR_RE.test(cleaned)) {
          value = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
        } else if (US_RE.test(cleaned)) {
          value = parseFloat(cleaned.replace(/,/g, ''));
        } else if (SIMPLE_RE.test(cleaned)) {
          value = parseFloat(cleaned);
        } else {
          return cell;
        }

        if (isNaN(value)) return cell;

        return 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      } catch (_) {
        return cell; // Requisito 8.7 — nunca lançar exceção
      }
    }

    return matrix.map((row, rowIdx) =>
      row.map((cell, colIdx) => {
        try {
          const result = convertCurrency(cell);
          if (result !== cell) {
            this.changeLog.push({
              type: 'currency_formatted',
              description: `Valor monetário formatado na célula (${rowIdx}, ${colIdx})`,
              row: rowIdx,
              col: colIdx,
              before: cell,
              after: result,
            });
          }
          return result;
        } catch (_) {
          return cell; // Requisito 8.7
        }
      })
    );
  }

  // ─── Requisito 9: Detecção de Duplicatas ────────────────────────────────────

  /**
   * Identifica linhas duplicadas (trim + lowercase) a partir da segunda ocorrência.
   * Nunca marca a primeira ocorrência. Registra `duplicate_found` no changeLog.
   * Aplica apenas nas linhas de dados (exclui cabeçalho).
   *
   * Requisitos: 9.1, 9.2, 9.3, 9.4
   *
   * @param {string[][]} matrix
   * @param {number} headerRowIndex
   * @returns {Set<number>} índices das linhas duplicadas
   */
  detectDuplicates(matrix, headerRowIndex) {
    const seen = new Map();
    const duplicateRows = new Set();

    for (let i = headerRowIndex + 1; i < matrix.length; i++) {
      const key = matrix[i].map(cell => cell.trim().toLowerCase()).join('|');

      if (seen.has(key)) {
        duplicateRows.add(i);
        // Requisito 9.2 — registrar duplicate_found com índice da linha
        this.changeLog.push({
          type: 'duplicate_found',
          description: `Linha duplicada encontrada no índice ${i} (duplicata da linha ${seen.get(key)})`,
          row: i,
        });
      } else {
        seen.set(key, i);
      }
    }

    return duplicateRows;
  }

  // ─── Requisito 10: Detecção Automática de Tipos de Coluna ───────────────────

  /**
   * Analisa cabeçalhos por palavras-chave e retorna sugestões de categoria.
   *
   * Requisitos: 10.1, 10.2
   *
   * @param {string[]} headers
   * @returns {Array<{ header: string, suggestedType: string }>}
   */
  autoDetectColumnTypes(headers) {
    const DATE_KW = ['data', 'date', 'dt', 'competencia', 'competência', 'vencimento', 'emissao', 'emissão', 'lancamento', 'lançamento'];
    const CURRENCY_KW = [
      'valor', 'value', 'preco', 'preço', 'price', 'total', 'amount', 'custo', 'cost',
      'saldo', 'balance', 'debito', 'débito', 'debit', 'credito', 'crédito', 'credit',
      'receita', 'despesa', 'resultado', 'lucro', 'prejuizo', 'prejuízo',
      'saldoanterior', 'saldo anterior', 'saldoatual', 'saldo atual',
      'deprecia', 'amortiza', 'provisao', 'provisão', 'reserva',
    ];
    const TEXT_KW = [
      'nome', 'name', 'descricao', 'descrição', 'description', 'historico', 'histórico',
      'observacao', 'observação', 'obs', 'complemento', 'documento', 'doc',
      'contacontabil', 'conta contabil', 'conta contábil', 'nomeconta', 'nome conta',
      'ativoimo', 'ativo imob', 'ativo imobilizado', 'contafinanceira', 'conta financeira',
      'centrodecusto', 'centro de custo', 'centro custo',
    ];
    const ID_KW = [
      'id', 'codigo', 'código', 'code', 'cpf', 'cnpj', 'reg', 'registro',
      'conta', 'contacont', 'contacontab', 'num', 'numero', 'número', 'lancto', 'lançto',
    ];
    const NUMBER_KW = ['qtd', 'quantidade', 'quantity', 'qty', 'parcela', 'seq', 'sequencia', 'sequência'];

    return headers.map(header => {
      const lower = header.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove acentos para comparação

      let suggestedType = 'text'; // default

      if (DATE_KW.some(kw => lower.includes(kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
        suggestedType = 'date';
      } else if (CURRENCY_KW.some(kw => lower.includes(kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
        suggestedType = 'currency';
      } else if (ID_KW.some(kw => {
        const k = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return lower === k || lower.startsWith(k) || lower.endsWith(k) || lower.includes(k);
      })) {
        suggestedType = 'identifier';
      } else if (NUMBER_KW.some(kw => lower.includes(kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
        suggestedType = 'number';
      } else if (TEXT_KW.some(kw => lower.includes(kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
        suggestedType = 'text';
      }

      return { header, suggestedType };
    });
  }

  // ─── Pipeline principal ─────────────────────────────────────────────────────

  /**
   * Executa o pipeline completo de limpeza.
   *
   * @param {string[][]} rawMatrix
   * @returns {{ cleanData: string[][], changeLog: import('./types.js').ChangeEntry[], columnTypes: Array<{header:string,suggestedType:string}>|null }}
   */
  run(rawMatrix) {
    this.changeLog = [];
    let matrix = rawMatrix.map(row => [...row]); // cópia defensiva

    // Detecção de cabeçalho (sempre executada)
    this.headerRowIndex = this.detectHeader(matrix);

    // Remoção de linhas vazias
    if (this.options.removeEmptyRows) {
      matrix = this.removeEmptyRows(matrix);
    }

    // Remoção de colunas vazias
    if (this.options.removeEmptyColumns) {
      matrix = this.removeEmptyColumns(matrix);
    }

    // Remoção de espaços extras
    if (this.options.trimWhitespace) {
      matrix = this.trimWhitespace(matrix);
    }

    // Padronização de capitalização
    if (this.options.standardizeText) {
      matrix = this.standardizeText(matrix, this.headerRowIndex);
    }

    // Formatação de datas
    if (this.options.formatDates) {
      matrix = this.formatDates(matrix);
    }

    // Formatação de valores monetários
    if (this.options.formatCurrency) {
      matrix = this.formatCurrency(matrix);
    }

    // Detecção de duplicatas
    if (this.options.detectDuplicates) {
      this.detectDuplicates(matrix, this.headerRowIndex);
    }

    // Detecção automática de tipos de coluna (sempre executada para estilização da tabela)
    const headers = matrix[this.headerRowIndex] || [];
    const columnTypes = this.autoDetectColumnTypes(headers);

    return {
      cleanData: matrix,
      changeLog: this.changeLog,
      columnTypes,
    };
  }
}

export { CleaningPipeline };

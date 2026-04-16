/**
 * Exporter — gera .xlsx formatado com:
 *  - Cabeçalhos coloridos por tipo de coluna
 *  - Larguras automáticas baseadas no conteúdo
 *  - AutoFilter (filtros) em todas as colunas
 *  - Linha de totais para colunas monetárias/numéricas
 *  - Zebrado (linhas alternadas) via estilos
 *  - Alinhamento correto por tipo (moeda à direita, datas centralizado)
 *
 * Usa SheetJS (XLSX global via CDN) com escrita de estilos via xml raw.
 */
export class Exporter {
  /**
   * @param {string[][]} data - matriz limpa (primeira linha = cabeçalho)
   * @param {string} filename - nome do arquivo original
   * @param {Array<{header:string,suggestedType:string}>} [columnTypes]
   */
  exportToXlsx(data, filename, columnTypes = []) {
    if (!data || data.length === 0) return;

    const baseName = filename ? filename.replace(/\.[^.]+$/, '') : 'dados';
    const exportFilename = `${baseName}_limpo.xlsx`;
    const sheetName = 'Dados Limpos';

    // ── 1. Calcula larguras automáticas ──────────────────────────────────────
    const headers = data[0] || [];
    const numCols = headers.length;
    const colWidths = headers.map((h, ci) => {
      let max = String(h).length + 4;
      for (let ri = 1; ri < Math.min(data.length, 200); ri++) {
        const v = String(data[ri][ci] || '');
        if (v.length + 2 > max) max = v.length + 2;
      }
      return Math.min(Math.max(max, 8), 60);
    });

    // ── 2. Detecta colunas de valor para totais ──────────────────────────────
    const isCurrencyCol = headers.map((_, ci) => {
      const type = columnTypes[ci]?.suggestedType;
      if (type === 'currency' || type === 'number') return true;
      // fallback: verifica se maioria das células parece monetária
      let hits = 0;
      for (let ri = 1; ri < Math.min(data.length, 20); ri++) {
        if (/R\$|^\d[\d.,]+$/.test(String(data[ri][ci] || '').trim())) hits++;
      }
      return hits > 3;
    });

    // ── 3. Monta linha de totais ─────────────────────────────────────────────
    const totalRow = headers.map((_, ci) => {
      if (ci === 0) return 'TOTAL';
      if (!isCurrencyCol[ci]) return '';
      let sum = 0;
      for (let ri = 1; ri < data.length; ri++) {
        const raw = String(data[ri][ci] || '').replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
        const n = parseFloat(raw);
        if (!isNaN(n)) sum += n;
      }
      return sum !== 0
        ? 'R$ ' + sum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '';
    });

    const hasAnyTotal = totalRow.some((v, i) => i > 0 && v !== '');
    const exportData = hasAnyTotal ? [...data, totalRow] : [...data];
    const totalRowIndex = hasAnyTotal ? exportData.length - 1 : -1; // 0-based

    // ── 4. Cria worksheet ────────────────────────────────────────────────────
    const ws = XLSX.utils.aoa_to_sheet(exportData);

    // Larguras de coluna
    ws['!cols'] = colWidths.map(w => ({ wch: w }));

    // AutoFilter em todas as colunas do cabeçalho
    const lastCol = this._colLetter(numCols - 1);
    ws['!autofilter'] = { ref: `A1:${lastCol}1` };

    // ── 5. Aplica estilos célula a célula ────────────────────────────────────
    // Cores de cabeçalho por tipo
    const headerColors = {
      identifier: { fgColor: { rgb: '1E3A5F' }, fontColor: 'BFDBFE' },
      text:       { fgColor: { rgb: '1E293B' }, fontColor: 'E2E8F0' },
      currency:   { fgColor: { rgb: '14532D' }, fontColor: 'BBF7D0' },
      date:       { fgColor: { rgb: '3B0764' }, fontColor: 'E9D5FF' },
      number:     { fgColor: { rgb: '1E3A5F' }, fontColor: 'BAE6FD' },
      default:    { fgColor: { rgb: '1E293B' }, fontColor: 'F8FAFC' },
    };

    const evenRowColor  = 'F8FAFC';
    const oddRowColor   = 'FFFFFF';
    const totalRowColor = '1E293B';
    const totalFontColor = 'F8FAFC';
    const currencyTotalColor = '86EFAC';

    for (let ri = 0; ri < exportData.length; ri++) {
      for (let ci = 0; ci < numCols; ci++) {
        const cellRef = this._cellRef(ri, ci);
        if (!ws[cellRef]) ws[cellRef] = { v: exportData[ri][ci] ?? '', t: 's' };

        const type = columnTypes[ci]?.suggestedType || 'default';
        const isHeader = ri === 0;
        const isTotal  = ri === totalRowIndex;
        const isEven   = ri % 2 === 0;

        let fill, font, alignment, border;

        if (isHeader) {
          const colors = headerColors[type] || headerColors.default;
          fill = { patternType: 'solid', fgColor: colors.fgColor };
          font = { bold: true, sz: 9, color: { rgb: colors.fontColor }, name: 'Calibri' };
          alignment = {
            horizontal: (type === 'currency' || type === 'number') ? 'right' : 'center',
            vertical: 'center',
            wrapText: false,
          };
          border = {
            bottom: { style: 'medium', color: { rgb: 'FFFFFF' } },
            right:  { style: 'thin',   color: { rgb: 'FFFFFF' } },
          };
        } else if (isTotal) {
          fill = { patternType: 'solid', fgColor: { rgb: totalRowColor } };
          const isCurr = isCurrencyCol[ci];
          font = {
            bold: true, sz: 9,
            color: { rgb: isCurr && ci > 0 ? currencyTotalColor : totalFontColor },
            name: 'Calibri',
          };
          alignment = {
            horizontal: (type === 'currency' || type === 'number' || ci === 0) ? (ci === 0 ? 'left' : 'right') : 'left',
            vertical: 'center',
          };
          border = { top: { style: 'medium', color: { rgb: '334155' } } };
        } else {
          // Data rows
          const bgColor = isEven ? evenRowColor : oddRowColor;
          fill = { patternType: 'solid', fgColor: { rgb: bgColor } };
          font = { sz: 9, name: 'Calibri', color: { rgb: '1E293B' } };

          if (type === 'currency') {
            font.color = { rgb: '166534' };
            alignment = { horizontal: 'right', vertical: 'center' };
          } else if (type === 'number') {
            alignment = { horizontal: 'right', vertical: 'center' };
          } else if (type === 'date') {
            font.color = { rgb: '5B21B6' };
            alignment = { horizontal: 'center', vertical: 'center' };
          } else if (type === 'identifier') {
            font.color = { rgb: '1E40AF' };
            font.bold  = true;
            alignment = { horizontal: 'left', vertical: 'center' };
          } else {
            alignment = { horizontal: 'left', vertical: 'center' };
          }

          border = {
            bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          };
        }

        ws[cellRef].s = { fill, font, alignment, border };
      }
    }

    // Congela primeira linha (cabeçalho)
    ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' };

    // ── 6. Cria workbook e exporta ───────────────────────────────────────────
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    XLSX.writeFile(wb, exportFilename, { cellStyles: true });
  }

  /** Converte índice de coluna (0-based) para letra Excel (A, B, …, Z, AA, …) */
  _colLetter(idx) {
    let letter = '';
    let n = idx;
    do {
      letter = String.fromCharCode(65 + (n % 26)) + letter;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return letter;
  }

  /** Converte (rowIndex, colIndex) 0-based para referência de célula (ex: "B3") */
  _cellRef(ri, ci) {
    return `${this._colLetter(ci)}${ri + 1}`;
  }
}

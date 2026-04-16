/**
 * PdfParser — extrai tabelas de PDFs usando PDF.js e reconstrói string[][].
 *
 * Estratégia:
 *  1. Carrega cada página via PDF.js
 *  2. Coleta todos os itens de texto com suas coordenadas (x, y)
 *  3. Agrupa itens em linhas pelo eixo Y (tolerância configurável)
 *  4. Dentro de cada linha, ordena por X e agrupa em colunas por proximidade
 *  5. Retorna string[][] pronta para o CleaningPipeline
 */
export class PdfParser {
  /**
   * @param {ArrayBuffer} buffer
   * @param {Function} [onProgress] - callback(pageNum, totalPages)
   * @returns {Promise<string[][]>}
   */
  async parse(buffer, onProgress) {
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    if (!pdfjsLib) throw new Error('PDF.js não carregado.');

    // Configura worker
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;

    const allRows = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      if (onProgress) onProgress(pageNum, pdf.numPages);

      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });

      // Coleta itens com posição Y invertida (PDF usa Y de baixo pra cima)
      const items = textContent.items
        .filter(item => item.str && item.str.trim() !== '')
        .map(item => ({
          text: item.str.trim(),
          x: Math.round(item.transform[4]),
          // Inverte Y para que linha 0 seja o topo
          y: Math.round(viewport.height - item.transform[5]),
        }));

      if (items.length === 0) continue;

      const pageRows = this._groupIntoRows(items);
      allRows.push(...pageRows);
    }

    if (allRows.length === 0) return [];

    // Normaliza: todas as linhas com o mesmo número de colunas
    const maxCols = Math.max(...allRows.map(r => r.length));
    return allRows.map(row => {
      while (row.length < maxCols) row.push('');
      return row;
    });
  }

  /**
   * Agrupa itens de texto em linhas (por Y próximo) e colunas (por X).
   * @param {Array<{text:string, x:number, y:number}>} items
   * @returns {string[][]}
   */
  _groupIntoRows(items) {
    const Y_TOLERANCE = 6; // px — itens com Y dentro desse range são a mesma linha

    // Ordena por Y crescente (topo → baixo)
    items.sort((a, b) => a.y - b.y || a.x - b.x);

    const rowGroups = [];
    let currentGroup = [items[0]];

    for (let i = 1; i < items.length; i++) {
      const prev = currentGroup[currentGroup.length - 1];
      if (Math.abs(items[i].y - prev.y) <= Y_TOLERANCE) {
        currentGroup.push(items[i]);
      } else {
        rowGroups.push(currentGroup);
        currentGroup = [items[i]];
      }
    }
    rowGroups.push(currentGroup);

    // Dentro de cada grupo, ordena por X e agrupa em células por gap
    return rowGroups
      .filter(g => g.length > 0)
      .map(group => {
        group.sort((a, b) => a.x - b.x);
        return this._groupIntoCells(group);
      });
  }

  /**
   * Agrupa itens de uma linha em células por gap horizontal.
   * Itens muito próximos são concatenados; gaps grandes viram nova célula.
   * @param {Array<{text:string, x:number}>} items - já ordenados por X
   * @returns {string[]}
   */
  _groupIntoCells(items) {
    if (items.length === 0) return [];

    // Calcula gaps entre itens consecutivos
    const gaps = [];
    for (let i = 1; i < items.length; i++) {
      gaps.push(items[i].x - items[i - 1].x);
    }

    // Threshold: mediana dos gaps * 2 (separa colunas de palavras dentro da mesma célula)
    const sorted = [...gaps].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] || 20;
    const threshold = Math.max(median * 2, 30);

    const cells = [];
    let current = items[0].text;

    for (let i = 1; i < items.length; i++) {
      const gap = items[i].x - items[i - 1].x;
      if (gap > threshold) {
        cells.push(current);
        current = items[i].text;
      } else {
        current += ' ' + items[i].text;
      }
    }
    cells.push(current);

    return cells;
  }
}

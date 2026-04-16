/**
 * SheetParser — converte ArrayBuffer em matriz de dados usando SheetJS (XLSX global via CDN).
 * Requisitos: 2.1, 2.2, 2.6
 */
export class SheetParser {
  /**
   * Parseia o buffer e retorna os nomes das abas e o workbook.
   * @param {ArrayBuffer} buffer
   * @returns {{ sheetNames: string[], workbook: Object }}
   */
  parse(buffer) {
    const workbook = XLSX.read(buffer, { type: 'array' });
    return {
      sheetNames: workbook.SheetNames,
      workbook,
    };
  }

  /**
   * Converte uma aba do workbook em matriz 2D de strings.
   * Todos os valores são preservados como strings (sem conversão de tipos).
   * @param {Object} workbook
   * @param {string} sheetName
   * @returns {string[][]}
   */
  sheetToMatrix(workbook, sheetName) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: '',
    });
  }
}

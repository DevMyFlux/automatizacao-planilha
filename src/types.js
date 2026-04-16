/**
 * @typedef {Object} CleaningOptions
 * @property {boolean} removeEmptyRows       - Remove linhas completamente vazias
 * @property {boolean} removeEmptyColumns    - Remove colunas completamente vazias
 * @property {boolean} trimWhitespace        - Remove espaços extras
 * @property {boolean} standardizeText       - Padroniza capitalização
 * @property {'UPPER'|'lower'|'Title'} textCase - Modo de capitalização
 * @property {boolean} formatDates           - Converte datas para DD/MM/AAAA
 * @property {boolean} formatCurrency        - Formata valores monetários BRL
 * @property {boolean} detectDuplicates      - Marca linhas duplicadas
 * @property {boolean} autoDetectTypes       - Detecta tipos de coluna automaticamente
 */

/**
 * @typedef {Object} ChangeEntry
 * @property {'removed_row'|'removed_col'|'text_changed'|'date_formatted'|
 *            'currency_formatted'|'duplicate_found'|'header_detected'} type
 * @property {string} description  - Descrição legível da mudança
 * @property {number} [row]        - Índice da linha afetada (0-based)
 * @property {number} [col]        - Índice da coluna afetada (0-based)
 * @property {string} [before]     - Valor original
 * @property {string} [after]      - Valor transformado
 */

/**
 * @typedef {Object} AppState
 * @property {string|null} filename          - Nome do arquivo carregado
 * @property {string[]|null} sheetNames      - Abas disponíveis no workbook
 * @property {string|null} activeSheet       - Aba selecionada
 * @property {string[][]|null} rawData       - Dados brutos pós-parse
 * @property {string[][]|null} cleanData     - Dados após limpeza
 * @property {ChangeEntry[]} changeLog       - Log de todas as mudanças
 * @property {CleaningOptions} options       - Opções de limpeza ativas
 */

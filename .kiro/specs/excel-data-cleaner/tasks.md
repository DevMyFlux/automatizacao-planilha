# Plano de Implementação: Excel Data Cleaner

## Visão Geral

Implementação de uma aplicação web frontend (HTML/CSS/JavaScript puro) para limpeza e padronização de planilhas Excel no navegador, sem backend. O pipeline é modular e configurável, com visualização interativa e exportação do resultado.

## Tarefas

- [x] 1. Estrutura do projeto e dependências
  - Criar `index.html` com estrutura base: zona de drop, painel de opções, container da tabela, painel de resumo e botão de exportar
  - Criar `styles.css` com estilos base para os componentes visuais
  - Criar `src/types.js` com os typedefs JSDoc: `CleaningOptions`, `ChangeEntry`, `AppState`
  - Incluir SheetJS via CDN com `defer` no `index.html`
  - _Requisitos: 1.1, 1.2, 14.1, 15.1_

- [x] 2. Implementar FileUploader
  - [x] 2.1 Criar `src/FileUploader.js` com a classe `FileUploader`
    - Implementar `init()` registrando eventos de drag-and-drop e `input[type=file]`
    - Implementar `readFile(file)` retornando `Promise<ArrayBuffer>`
    - Validar extensão (`.xlsx`, `.xls`, `.csv`) e tipo MIME antes de processar
    - Rejeitar arquivos >50 MB com mensagem de erro; exibir aviso para arquivos entre 10 MB e 50 MB
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 15.2_

  - [ ]* 2.2 Escrever testes unitários para FileUploader
    - Testar validação de extensão: aceitar `.xlsx`/`.xls`/`.csv`, rejeitar outros
    - Testar validação de tamanho: rejeitar >50 MB, avisar entre 10–50 MB
    - _Requisitos: 1.3, 1.4, 1.6, 1.7_

- [x] 3. Implementar SheetParser
  - [x] 3.1 Criar `src/SheetParser.js` com a classe `SheetParser`
    - Implementar `parse(buffer)` retornando `{ sheetNames, workbook }` via SheetJS
    - Implementar `sheetToMatrix(workbook, sheetName)` retornando `string[][]` preservando valores como strings
    - _Requisitos: 2.1, 2.2, 2.6_

  - [ ]* 3.2 Escrever testes unitários para SheetParser
    - Testar parse de buffer válido e inválido
    - Testar conversão de aba em matriz com valores de diferentes tipos
    - _Requisitos: 2.1, 2.2, 2.3, 2.6_

- [x] 4. Implementar CleaningPipeline — detecção de cabeçalho e remoção de vazios
  - [x] 4.1 Criar `src/CleaningPipeline.js` com a classe `CleaningPipeline`
    - Implementar `detectHeader(matrix)`: heurística por densidade de texto nas primeiras 10 linhas; registrar `header_detected` no changeLog
    - Implementar `removeEmptyRows(matrix)`: remover linhas onde todas as células são vazias; registrar `removed_row`
    - Implementar `removeEmptyColumns(matrix)`: remover colunas onde todas as células são vazias; registrar `removed_col`
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 4.2 Escrever teste de propriedade: pipeline nunca aumenta o número de linhas (P1)
    - **Propriedade P1: `cleanData.length <= rawMatrix.length`**
    - **Valida: Requisitos 4.6**
    - Usar fast-check com matrizes geradas aleatoriamente

  - [ ]* 4.3 Escrever teste de propriedade: todas as linhas da Matriz_Limpa têm o mesmo número de colunas (P2)
    - **Propriedade P2: `cleanData.every(row => row.length === cleanData[0].length)`**
    - **Valida: Requisitos 4.7**
    - Usar fast-check com matrizes geradas aleatoriamente

  - [ ]* 4.4 Escrever testes unitários para detectHeader, removeEmptyRows e removeEmptyColumns
    - Testar cabeçalho na linha 0, 1 e 2; matriz sem cabeçalho claro
    - Testar linhas totalmente vazias, parcialmente vazias e sem linhas vazias
    - _Requisitos: 3.1, 3.2, 3.3, 4.1, 4.2, 4.5_

- [x] 5. Implementar CleaningPipeline — transformações de texto e datas
  - [x] 5.1 Implementar `trimWhitespace(matrix)` em `CleaningPipeline`
    - Remover espaços no início/fim e substituir múltiplos espaços internos por um único
    - Registrar alterações no changeLog com tipo `text_changed`
    - _Requisitos: 5.1, 5.2, 5.3_

  - [ ]* 5.2 Escrever teste de propriedade: trimWhitespace é idempotente
    - **Propriedade: `trimWhitespace(trimWhitespace(m))` === `trimWhitespace(m)`**
    - **Valida: Requisitos 5.4**
    - Usar fast-check

  - [x] 5.3 Implementar `standardizeText(matrix, headerRow)` em `CleaningPipeline`
    - Suportar modos `UPPER`, `lower` e `Title Case`; não aplicar ao cabeçalho
    - Registrar alterações no changeLog com tipo `text_changed`
    - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.4 Implementar `formatDates(matrix)` em `CleaningPipeline`
    - Detectar e converter formatos ISO, `DD-MM-AAAA` e abreviado `D/M/AA` para `DD/MM/AAAA`
    - Manter valor original para datas ambíguas (registrar `ambiguous_date`) e não-datas
    - Nunca lançar exceção; registrar `date_formatted` no changeLog
    - _Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ]* 5.5 Escrever teste de propriedade: células marcadas como date_formatted seguem DD/MM/AAAA (P3)
    - **Propriedade P3: toda entrada `date_formatted` no changeLog aponta para célula com formato `DD/MM/AAAA`**
    - **Valida: Requisitos 7.7**
    - Usar fast-check

  - [ ]* 5.6 Escrever testes unitários para trimWhitespace, standardizeText e formatDates
    - Testar todos os padrões de data suportados, datas inválidas, strings não-data, datas ambíguas
    - Testar os três modos de capitalização e a preservação do cabeçalho
    - _Requisitos: 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.5, 7.6_

- [x] 6. Implementar CleaningPipeline — moeda, duplicatas e tipos de coluna
  - [x] 6.1 Implementar `formatCurrency(matrix)` em `CleaningPipeline`
    - Detectar formatos BR (`1.234,56`), US (`1,234.56`) e numérico simples; converter para `R$ 1.234,56`
    - Nunca lançar exceção; registrar `currency_formatted` no changeLog
    - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 6.2 Escrever teste de propriedade: células marcadas como currency_formatted começam com "R$ " (P4)
    - **Propriedade P4: toda entrada `currency_formatted` no changeLog aponta para célula iniciada por `"R$ "`**
    - **Valida: Requisitos 8.6**
    - Usar fast-check

  - [x] 6.3 Implementar `detectDuplicates(matrix, headerRowIndex)` em `CleaningPipeline`
    - Comparar linhas normalizadas (trim + lowercase); marcar duplicatas a partir da segunda ocorrência
    - Registrar `duplicate_found` no changeLog; nunca marcar a primeira ocorrência
    - _Requisitos: 9.1, 9.2, 9.3, 9.4_

  - [x] 6.4 Implementar `autoDetectColumnTypes(headers)` em `CleaningPipeline`
    - Analisar cabeçalhos por palavras-chave e retornar sugestões de categoria
    - _Requisitos: 10.1, 10.2_

  - [ ]* 6.5 Escrever testes unitários para formatCurrency, detectDuplicates e autoDetectColumnTypes
    - Testar formato BR, US e numérico; strings não-monetárias
    - Testar sem duplicatas, com duplicatas consecutivas e distantes
    - _Requisitos: 8.1, 8.2, 8.3, 8.5, 9.1, 9.2, 9.3, 9.4_

- [x] 7. Implementar método `run` do CleaningPipeline
  - [x] 7.1 Implementar `run(rawMatrix)` orquestrando todas as etapas na ordem correta
    - Executar: detectHeader → removeEmptyRows → removeEmptyColumns → trimWhitespace → standardizeText → formatDates → formatCurrency → detectDuplicates → autoDetectColumnTypes
    - Retornar `{ cleanData, changeLog }`
    - _Requisitos: 3.1, 4.1, 4.2, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1_

  - [ ]* 7.2 Escrever teste de propriedade: nenhum dado original é inventado (P5)
    - **Propriedade P5: todo `after` no changeLog deriva de um `before` não-vazio, ou `after` é vazio**
    - **Valida: Requisitos 4.6, 5.3, 6.5, 7.4, 8.4**
    - Usar fast-check

- [x] 8. Checkpoint — Verificar pipeline completo
  - Garantir que todos os testes do pipeline passam. Perguntar ao usuário se há dúvidas antes de continuar.

- [x] 9. Implementar TableRenderer
  - [x] 9.1 Criar `src/TableRenderer.js` com a classe `TableRenderer`
    - Implementar `render(data, changeLog)`: renderizar tabela HTML com cabeçalho destacado, usando `textContent` para inserir células
    - Implementar `highlightChanges(changeLog)`: aplicar classe CSS nas células modificadas
    - Implementar `enableSorting()`: ordenação por coluna ao clicar no cabeçalho
    - _Requisitos: 11.1, 11.2, 11.3, 11.4, 15.3_

  - [x] 9.2 Implementar virtualização para datasets >1000 linhas
    - Renderizar apenas as linhas visíveis na viewport; atualizar ao fazer scroll
    - _Requisitos: 11.5_

  - [ ]* 9.3 Escrever testes unitários para TableRenderer
    - Testar que células são inseridas via `textContent` (sem XSS)
    - Testar que células do changeLog recebem destaque visual
    - _Requisitos: 11.2, 11.4, 15.3_

- [x] 10. Implementar Exporter e painel de resumo
  - [x] 10.1 Criar `src/Exporter.js` com a classe `Exporter`
    - Implementar `exportToXlsx(data, filename)`: converter matriz para `.xlsx` via SheetJS e disparar download
    - Nomear o arquivo exportado com base no nome do arquivo original
    - _Requisitos: 13.1, 13.2_

  - [x] 10.2 Implementar painel de resumo de alterações no `App`
    - Exibir todas as entradas do changeLog com tipo, descrição, valor anterior e posterior
    - Destacar avisos de duplicatas e datas ambíguas
    - _Requisitos: 12.1, 12.2, 12.3, 12.4_

- [x] 11. Implementar App (orquestrador) e controles de configuração
  - [x] 11.1 Criar `src/App.js` com a classe `App`
    - Implementar `init()`: instanciar e conectar todos os componentes
    - Implementar `handleFileLoaded(buffer, filename)`: parsear, executar pipeline, renderizar tabela e painel
    - Implementar `handleSheetChange(sheetName)`: re-parsear aba selecionada e re-executar pipeline
    - Implementar `handleCleaningOptionsChange(options)`: re-executar pipeline e atualizar UI
    - Implementar `handleExport()`: invocar Exporter; botão disponível apenas após pipeline executado com sucesso
    - Tratar erros de parse (arquivo inválido) e planilha vazia com mensagens adequadas
    - _Requisitos: 2.3, 2.4, 2.5, 13.3, 14.3_

  - [x] 11.2 Implementar controles de configuração do pipeline na UI
    - Checkboxes para cada opção do `CleaningOptions`; seletor de `textCase` visível quando `standardizeText` ativo
    - _Requisitos: 14.1, 14.2_

- [x] 12. Checkpoint final — Integração e testes end-to-end
  - [ ]* 12.1 Escrever testes de integração do fluxo completo
    - Testar upload de `.xlsx` real → pipeline → renderização → export → re-import com dados idênticos
    - _Requisitos: 2.1, 2.2, 4.1, 5.1, 7.1, 8.1, 13.1_

  - Garantir que todos os testes passam. Perguntar ao usuário se há dúvidas antes de finalizar.

## Notas

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada tarefa referencia os requisitos específicos para rastreabilidade
- Os checkpoints garantem validação incremental do pipeline
- Os testes de propriedade usam a biblioteca fast-check (dev only, carregada via CDN ou npm)
- Os testes unitários podem ser executados com qualquer runner (ex: Vitest ou Jest)

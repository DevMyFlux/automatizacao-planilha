# Documento de Requisitos

## Introdução

O Excel Data Cleaner é uma aplicação web frontend (HTML, CSS, JavaScript puro) que permite ao usuário carregar planilhas Excel brutas, aplicar um pipeline configurável de limpeza e padronização de dados, visualizar o resultado em uma tabela interativa com destaque das alterações e exportar a planilha tratada. Todo o processamento ocorre no navegador, sem envio de dados a servidores externos.

## Glossário

- **FileUploader**: Componente responsável por receber o arquivo via drag-and-drop ou seleção manual e lê-lo como ArrayBuffer.
- **SheetParser**: Componente que converte o ArrayBuffer em matriz de dados usando a biblioteca SheetJS.
- **CleaningPipeline**: Componente que executa sequencialmente as transformações de limpeza sobre a matriz de dados.
- **TableRenderer**: Componente que renderiza a matriz limpa como tabela HTML interativa com destaque de alterações.
- **Exporter**: Componente que converte a matriz limpa de volta para `.xlsx` e dispara o download.
- **App**: Componente orquestrador que coordena todos os demais componentes e gerencia o estado da aplicação.
- **Matriz_Bruta**: Representação bidimensional (`string[][]`) dos dados originais extraídos da planilha.
- **Matriz_Limpa**: Representação bidimensional (`string[][]`) dos dados após a execução do pipeline de limpeza.
- **ChangeLog**: Lista de entradas (`ChangeEntry[]`) que registra cada transformação aplicada, incluindo tipo, linha, coluna, valor anterior e valor posterior.
- **CleaningOptions**: Objeto de configuração que define quais etapas do pipeline estão ativas.
- **Workbook**: Estrutura interna do SheetJS que representa o arquivo Excel completo, podendo conter múltiplas abas.
- **Linha_Vazia**: Linha em que todas as células são vazias ou contêm apenas espaços em branco.
- **Coluna_Vazia**: Coluna em que todas as células são vazias ou contêm apenas espaços em branco.
- **Linha_Duplicada**: Linha cujo conteúdo normalizado (trim + lowercase) é idêntico ao de uma linha anterior no mesmo conjunto de dados.

---

## Requisitos

### Requisito 1: Upload de Arquivo

**User Story:** Como usuário, quero carregar uma planilha Excel via drag-and-drop ou seleção de arquivo, para que eu possa iniciar o processo de limpeza de dados.

#### Critérios de Aceitação

1. WHEN o usuário arrasta um arquivo sobre a zona de drop, THE FileUploader SHALL aceitar o arquivo e iniciar a leitura.
2. WHEN o usuário seleciona um arquivo pelo seletor de arquivos, THE FileUploader SHALL aceitar o arquivo e iniciar a leitura.
3. WHEN um arquivo é fornecido, THE FileUploader SHALL validar se a extensão é `.xlsx`, `.xls` ou `.csv` antes de processar.
4. IF o arquivo fornecido não possui extensão `.xlsx`, `.xls` ou `.csv`, THEN THE FileUploader SHALL rejeitar o arquivo e exibir uma mensagem de erro ao usuário.
5. THE FileUploader SHALL ler o arquivo como ArrayBuffer e invocar o callback `onFileLoaded` com o buffer e o nome do arquivo.
6. IF o arquivo tiver tamanho superior a 50 MB, THEN THE FileUploader SHALL rejeitar o arquivo e exibir uma mensagem informando o limite máximo.
7. WHEN o arquivo tiver tamanho entre 10 MB e 50 MB, THE FileUploader SHALL exibir um aviso ao usuário informando que o processamento pode demorar alguns segundos antes de prosseguir.

---

### Requisito 2: Parsing da Planilha

**User Story:** Como usuário, quero que a planilha carregada seja convertida em dados estruturados, para que o pipeline de limpeza possa processá-la.

#### Critérios de Aceitação

1. WHEN um ArrayBuffer válido é fornecido, THE SheetParser SHALL parsear o buffer usando SheetJS e retornar os nomes das abas disponíveis e o objeto Workbook.
2. WHEN o Workbook é parseado, THE SheetParser SHALL converter a aba selecionada em uma Matriz_Bruta de strings bidimensional.
3. IF o SheetJS lançar uma exceção ao parsear o buffer, THEN THE App SHALL capturar o erro e exibir a mensagem "Arquivo inválido ou corrompido. Tente outro arquivo." ao usuário.
4. IF a Matriz_Bruta resultante tiver zero linhas ou contiver apenas Linhas_Vazias, THEN THE App SHALL exibir o aviso "Nenhum dado encontrado na aba selecionada." ao usuário.
5. WHEN o Workbook contém múltiplas abas, THE App SHALL permitir ao usuário selecionar qual aba deseja processar.
6. THE SheetParser SHALL preservar todos os valores das células como strings na Matriz_Bruta, sem conversão de tipos.

---

### Requisito 3: Detecção de Cabeçalho

**User Story:** Como usuário, quero que o sistema identifique automaticamente a linha de cabeçalho da planilha, para que as transformações sejam aplicadas corretamente apenas nas linhas de dados.

#### Critérios de Aceitação

1. WHEN o pipeline é executado, THE CleaningPipeline SHALL detectar a linha de cabeçalho analisando as primeiras 10 linhas da Matriz_Bruta.
2. THE CleaningPipeline SHALL identificar como cabeçalho a linha com maior densidade de células textuais não-numéricas.
3. THE CleaningPipeline SHALL retornar o índice da linha de cabeçalho entre 0 e MIN(9, total_de_linhas - 1).
4. WHEN o cabeçalho é detectado, THE CleaningPipeline SHALL registrar a detecção no ChangeLog com o tipo `header_detected`.

---

### Requisito 4: Remoção de Linhas e Colunas Vazias

**User Story:** Como usuário, quero remover automaticamente linhas e colunas completamente vazias, para que a planilha exportada não contenha dados desnecessários.

#### Critérios de Aceitação

1. WHERE a opção `removeEmptyRows` está ativa, THE CleaningPipeline SHALL remover todas as Linhas_Vazias da Matriz_Bruta.
2. WHERE a opção `removeEmptyColumns` está ativa, THE CleaningPipeline SHALL remover todas as Colunas_Vazias da Matriz_Bruta.
3. WHEN uma linha é removida, THE CleaningPipeline SHALL registrar a remoção no ChangeLog com o tipo `removed_row` e o índice original da linha.
4. WHEN uma coluna é removida, THE CleaningPipeline SHALL registrar a remoção no ChangeLog com o tipo `removed_col` e o índice original da coluna.
5. THE CleaningPipeline SHALL preservar linhas parcialmente preenchidas (com ao menos uma célula não-vazia).
6. THE CleaningPipeline SHALL garantir que a Matriz_Limpa tenha número de linhas menor ou igual ao da Matriz_Bruta.
7. THE CleaningPipeline SHALL garantir que todas as linhas da Matriz_Limpa tenham o mesmo número de colunas.

---

### Requisito 5: Remoção de Espaços Extras

**User Story:** Como usuário, quero que espaços extras sejam removidos automaticamente das células, para que os dados fiquem padronizados e sem ruído.

#### Critérios de Aceitação

1. WHERE a opção `trimWhitespace` está ativa, THE CleaningPipeline SHALL remover espaços em branco no início e no fim de cada célula.
2. WHERE a opção `trimWhitespace` está ativa, THE CleaningPipeline SHALL substituir sequências de múltiplos espaços internos por um único espaço.
3. WHEN o valor de uma célula é alterado pelo trim, THE CleaningPipeline SHALL registrar a alteração no ChangeLog com o tipo `text_changed`, o valor anterior e o valor posterior.
4. THE CleaningPipeline SHALL aplicar trimWhitespace de forma idempotente: aplicar a operação duas vezes deve produzir o mesmo resultado que aplicar uma vez.

---

### Requisito 6: Padronização de Capitalização

**User Story:** Como usuário, quero padronizar a capitalização do texto nas células, para que os dados fiquem uniformes e facilitem análises posteriores.

#### Critérios de Aceitação

1. WHERE a opção `standardizeText` está ativa e `textCase` é `'UPPER'`, THE CleaningPipeline SHALL converter o conteúdo de todas as células de texto para maiúsculas.
2. WHERE a opção `standardizeText` está ativa e `textCase` é `'lower'`, THE CleaningPipeline SHALL converter o conteúdo de todas as células de texto para minúsculas.
3. WHERE a opção `standardizeText` está ativa e `textCase` é `'Title'`, THE CleaningPipeline SHALL converter o conteúdo de todas as células de texto para Title Case (primeira letra de cada palavra em maiúscula).
4. THE CleaningPipeline SHALL não aplicar padronização de capitalização às células da linha de cabeçalho.
5. WHEN o valor de uma célula é alterado pela padronização, THE CleaningPipeline SHALL registrar a alteração no ChangeLog com o tipo `text_changed`, o valor anterior e o valor posterior.

---

### Requisito 7: Formatação de Datas

**User Story:** Como usuário, quero que datas em diferentes formatos sejam convertidas automaticamente para o padrão DD/MM/AAAA, para que a planilha tenha consistência de formato.

#### Critérios de Aceitação

1. WHERE a opção `formatDates` está ativa, THE CleaningPipeline SHALL detectar e converter datas no formato ISO (`AAAA-MM-DD`) para `DD/MM/AAAA`.
2. WHERE a opção `formatDates` está ativa, THE CleaningPipeline SHALL detectar e converter datas no formato `DD-MM-AAAA` para `DD/MM/AAAA`.
3. WHERE a opção `formatDates` está ativa, THE CleaningPipeline SHALL detectar e converter datas no formato abreviado (`D/M/AA`) para `DD/MM/AAAA`.
4. WHEN uma célula contém uma data reconhecível e é formatada, THE CleaningPipeline SHALL registrar a alteração no ChangeLog com o tipo `date_formatted`, o valor anterior e o valor posterior.
5. IF uma célula contém uma data ambígua (como `01/02/03`), THEN THE CleaningPipeline SHALL manter o valor original e registrar no ChangeLog com o tipo `ambiguous_date`.
6. IF uma célula não contém uma data reconhecível, THEN THE CleaningPipeline SHALL manter o valor original sem alteração.
7. THE CleaningPipeline SHALL garantir que toda célula marcada como `date_formatted` no ChangeLog contenha um valor no formato `DD/MM/AAAA` na Matriz_Limpa.
8. THE CleaningPipeline SHALL nunca lançar exceção ao processar qualquer valor de célula na etapa de formatação de datas.

---

### Requisito 8: Formatação de Valores Monetários

**User Story:** Como usuário, quero que valores monetários sejam padronizados no formato brasileiro `R$ 1.234,56`, para que a planilha tenha consistência de formato financeiro.

#### Critérios de Aceitação

1. WHERE a opção `formatCurrency` está ativa, THE CleaningPipeline SHALL detectar e converter valores no formato brasileiro (`1.234,56`) para `R$ 1.234,56`.
2. WHERE a opção `formatCurrency` está ativa, THE CleaningPipeline SHALL detectar e converter valores no formato americano (`1,234.56`) para `R$ 1.234,56`.
3. WHERE a opção `formatCurrency` está ativa, THE CleaningPipeline SHALL detectar e converter valores numéricos simples (ex: `1234.56`) para `R$ 1.234,56`.
4. WHEN uma célula contém um valor monetário reconhecível e é formatada, THE CleaningPipeline SHALL registrar a alteração no ChangeLog com o tipo `currency_formatted`, o valor anterior e o valor posterior.
5. IF uma célula não contém um valor monetário reconhecível, THEN THE CleaningPipeline SHALL manter o valor original sem alteração.
6. THE CleaningPipeline SHALL garantir que toda célula marcada como `currency_formatted` no ChangeLog contenha um valor iniciado por `R$ ` na Matriz_Limpa.
7. THE CleaningPipeline SHALL nunca lançar exceção ao processar qualquer valor de célula na etapa de formatação de moeda.

---

### Requisito 9: Detecção de Duplicatas

**User Story:** Como usuário, quero identificar linhas duplicadas na planilha, para que eu possa revisá-las antes de exportar os dados.

#### Critérios de Aceitação

1. WHERE a opção `detectDuplicates` está ativa, THE CleaningPipeline SHALL identificar linhas cujo conteúdo normalizado (trim + lowercase de todas as células) seja idêntico ao de uma linha anterior.
2. WHEN uma Linha_Duplicada é identificada, THE CleaningPipeline SHALL registrar a ocorrência no ChangeLog com o tipo `duplicate_found` e o índice da linha.
3. THE CleaningPipeline SHALL nunca marcar a primeira ocorrência de uma linha como duplicata.
4. THE CleaningPipeline SHALL aplicar a detecção de duplicatas apenas nas linhas de dados, excluindo a linha de cabeçalho.

---

### Requisito 10: Detecção Automática de Tipos de Coluna

**User Story:** Como usuário, quero que o sistema sugira automaticamente categorias para as colunas com base em palavras-chave, para que eu tenha uma visão rápida do conteúdo de cada coluna.

#### Critérios de Aceitação

1. WHERE a opção `autoDetectTypes` está ativa, THE CleaningPipeline SHALL analisar os cabeçalhos das colunas e sugerir categorias com base em palavras-chave reconhecidas.
2. THE CleaningPipeline SHALL retornar as sugestões de tipo de coluna como parte do resultado do pipeline para exibição na interface.

---

### Requisito 11: Visualização da Tabela e Destaque de Alterações

**User Story:** Como usuário, quero visualizar os dados limpos em uma tabela interativa com destaque das células alteradas, para que eu possa revisar as transformações antes de exportar.

#### Critérios de Aceitação

1. WHEN o pipeline de limpeza é concluído, THE TableRenderer SHALL renderizar a Matriz_Limpa como uma tabela HTML com a primeira linha como cabeçalho destacado.
2. THE TableRenderer SHALL aplicar destaque visual nas células que foram modificadas pelo pipeline, com base nas entradas do ChangeLog.
3. THE TableRenderer SHALL habilitar ordenação das linhas ao clicar no cabeçalho de cada coluna.
4. THE TableRenderer SHALL usar `textContent` (e não `innerHTML`) ao inserir o conteúdo das células no DOM para prevenir injeção de HTML.
5. WHILE o dataset contém mais de 1000 linhas, THE TableRenderer SHALL renderizar apenas as linhas visíveis na viewport (virtualização).

---

### Requisito 12: Painel de Resumo de Alterações

**User Story:** Como usuário, quero visualizar um resumo das alterações realizadas pelo pipeline, para que eu entenda o que foi modificado na planilha.

#### Critérios de Aceitação

1. WHEN o pipeline de limpeza é concluído, THE App SHALL exibir um painel de resumo contendo todas as entradas do ChangeLog.
2. THE App SHALL exibir para cada entrada do ChangeLog: o tipo de alteração, a descrição legível, e quando aplicável, o valor anterior e o valor posterior.
3. WHEN duplicatas são detectadas, THE App SHALL exibir os avisos de duplicata no painel de resumo para revisão do usuário.
4. WHEN datas ambíguas são encontradas, THE App SHALL exibir os avisos de data ambígua no painel de resumo.

---

### Requisito 13: Exportação da Planilha Limpa

**User Story:** Como usuário, quero exportar os dados limpos de volta para um arquivo `.xlsx`, para que eu possa usar a planilha tratada em outras ferramentas.

#### Critérios de Aceitação

1. WHEN o usuário clica no botão de exportar, THE Exporter SHALL converter a Matriz_Limpa para um arquivo `.xlsx` usando SheetJS e disparar o download no navegador.
2. THE Exporter SHALL nomear o arquivo exportado com base no nome do arquivo original carregado.
3. THE App SHALL disponibilizar o botão de exportar somente após o pipeline de limpeza ter sido executado com sucesso.

---

### Requisito 14: Configuração do Pipeline

**User Story:** Como usuário, quero ativar ou desativar individualmente cada etapa do pipeline de limpeza, para que eu tenha controle sobre quais transformações são aplicadas.

#### Critérios de Aceitação

1. THE App SHALL exibir controles na interface para ativar ou desativar cada opção do CleaningOptions: `removeEmptyRows`, `removeEmptyColumns`, `trimWhitespace`, `standardizeText`, `formatDates`, `formatCurrency`, `detectDuplicates` e `autoDetectTypes`.
2. WHERE a opção `standardizeText` está ativa, THE App SHALL exibir um seletor para o modo de capitalização (`UPPER`, `lower`, `Title`).
3. WHEN o usuário altera qualquer opção do CleaningOptions, THE App SHALL re-executar o pipeline e atualizar a tabela e o painel de resumo com os novos resultados.

---

### Requisito 15: Segurança e Privacidade

**User Story:** Como usuário, quero ter a garantia de que meus dados não são enviados para servidores externos, para que informações sensíveis permaneçam privadas.

#### Critérios de Aceitação

1. THE App SHALL executar todo o processamento de dados exclusivamente no navegador do usuário, sem enviar nenhum dado a servidores externos.
2. THE FileUploader SHALL validar o tipo MIME do arquivo além da extensão antes de processar.
3. THE TableRenderer SHALL usar `textContent` ao inserir conteúdo de células no DOM, prevenindo ataques de injeção de HTML.

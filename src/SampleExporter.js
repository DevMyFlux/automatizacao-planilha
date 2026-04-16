/**
 * SampleExporter — gera um arquivo .xlsx de exemplo com dados contábeis
 * organizados, formatados e prontos para uso.
 */
export class SampleExporter {
  /**
   * Gera e faz download de uma planilha de exemplo contábil.
   */
  exportSample() {
    const rows = [
      // Cabeçalho
      ['REG', 'Nr. Mvto', 'Conta Débito', 'Nome Conta Débito', 'Conta Crédito', 'Nome Conta Crédito', 'Histórico', 'Centro de Custo', 'Valor Débito', 'Valor Crédito', 'Saldo Anterior', 'Saldo Atual'],

      // Dados de exemplo — lançamentos contábeis
      ['001', '25.080.279', '2.1.1.02.01.001', 'FORNECEDORES DE INSUMOS', '3.2.1.30.01.001', 'MATERIAL APLICADO',       'ESTORNO COMPRA CF NF 15189 - BF DE MATERIAIS',          'CC-001', 'R$ 8.714,00',  'R$ 8.714,00',  'R$ 48.447,00', 'R$ 48.447,00'],
      ['002', '25.080.281', '2.1.1.02.01.004', 'FORNECEDORES DE SERVIÇOS', '3.2.1.30.01.001', 'MATERIAL APLICADO',      'ESTORNO PROVISÃO MENSAL BIG BANCO',                     'CC-002', 'R$ 27.069,15', 'R$ 27.069,15', 'R$ 48.447,00', 'R$ 48.447,00'],
      ['003', '25.080.285', '2.1.1.02.01.004', 'FORNECEDORES DE SERVIÇOS', '2.1.1.02.01.004', 'FORNECEDORES DE SERVIÇOS','COMPLEMENTO PROVISÃO CONTRATO I',                       'CC-001', 'R$ 354,81',    'R$ 354,81',    'R$ 48.447,00', 'R$ 48.447,00'],
      ['004', '25.084.324', '2.1.1.02.01.001', 'FORNECEDORES DE INSUMOS', '2.1.40.13.003',   'MANUTENÇÃO DE EQUIPAMENTOS','MANUTENÇÃO PREVENTIVA EQUIPAMENTO 048/2025',           'CC-003', 'R$ 90,37',     'R$ 90,37',     'R$ 48.447,00', 'R$ 48.447,00'],
      ['005', '25.086.142', '2.1.1.02.01.001', 'FORNECEDORES DE INSUMOS', '3.2.1.30.01.001', 'MATERIAL APLICADO',       'PROCESSO CANCELADO COMPRA CF NF',                       'CC-002', 'R$ 2.692,00',  'R$ 2.692,00',  'R$ 48.447,00', 'R$ 48.447,00'],
      ['006', '25.091.087', '2.1.2.01.03.002', 'DESCONTOS OBTIDOS',       '2.1.1.02.01.001', 'FORNECEDORES DE INSUMOS', 'ESTORNO DESCONTO PAGTO N.F. 58365',                     'CC-001', 'R$ 10,64',     'R$ 10,64',     'R$ 48.447,00', 'R$ 48.447,00'],
      ['007', '25.091.091', '2.1.1.02.01.001', 'FORNECEDORES DE INSUMOS', '3.2.1.30.01.001', 'MATERIAL APLICADO',       'ESTORNO COMPRA NF 313922 - CIENTÍFICA',                 'CC-003', 'R$ 296,00',    'R$ 296,00',    'R$ 48.447,00', 'R$ 48.447,00'],
      ['008', '25.091.117', '1.1.5.02.01.001', 'MEDICAMENTO HCN',         '2.1.1.02.01.001', 'FORNECEDORES DE INSUMOS', 'COMPRA NF 314292 - CIENTÍFICA MEDICAMENTOS',            'CC-002', 'R$ 230,00',    'R$ 230,00',    'R$ 48.447,00', 'R$ 48.447,00'],
      ['009', '25.091.427', '3.2.1.40.11.007', 'SERVIÇOS DE TI/SOFTWARE', '2.1.1.02.01.004', 'FORNECEDORES DE SERVIÇOS','COMPLEMENTO PROVISÃO',                                  'CC-001', 'R$ 3.462,50',  'R$ 3.462,50',  'R$ 48.447,00', 'R$ 48.447,00'],
      ['010', '25.092.158', '2.1.1.02.01.001', 'FORNECEDORES DE INSUMOS', '3.2.1.30.01.001', 'MATERIAL APLICADO',       'DEVOLUÇÃO DO ALMOX. DO MÊS 05/2025',                   'CC-003', 'R$ 133,50',    'R$ 133,50',    'R$ 48.447,00', 'R$ 48.447,00'],
      ['011', '25.092.159', '3.2.1.40.11.006', 'SERVIÇOS DE CONSULTORIA', '2.1.1.02.01.004', 'FORNECEDORES DE SERVIÇOS','COMPLEMENTO PROVISÃO CONTRATO I',                       'CC-002', 'R$ 9.200,00',  'R$ 9.200,00',  'R$ 48.447,00', 'R$ 48.447,00'],
      ['012', '25.096.275', '2.1.1.02.01.001', 'FORNECEDORES DE INSUMOS', '3.2.1.30.01.001', 'MATERIAL APLICADO',       'ESTORNO COMPRA NF 122076 - DMI MATERIAIS',              'CC-001', 'R$ 219,60',    'R$ 219,60',    'R$ 48.447,00', 'R$ 48.447,00'],
      ['013', '25.096.279', '2.1.1.02.01.004', 'FORNECEDORES DE SERVIÇOS','3.2.1.40.11.006', 'SERVIÇOS DE CONSULTORIA', 'DEVOLUÇÃO NF 1034829 - ELLO DISTRIBUIDORA',             'CC-003', 'R$ 1.198,80',  'R$ 1.198,80',  'R$ 48.447,00', 'R$ 48.447,00'],
      ['014', '25.102.335', '2.1.1.02.01.004', 'FORNECEDORES DE SERVIÇOS','3.2.1.40.11.006', 'SERVIÇOS DE CONSULTORIA', 'ESTORNO PROVISÃO CONTRATO 03S/2025',                    'CC-002', 'R$ 289,38',    'R$ 289,38',    'R$ 48.447,00', 'R$ 48.447,00'],
      ['015', '25.102.339', '3.2.1.03.001',    'ENERGIA ELÉTRICA',        '2.1.1.02.01.004', 'FORNECEDORES DE SERVIÇOS','ESTORNO PROVISÃO MENSAL - NF 6002',                     'CC-001', 'R$ 255.000,00','R$ 255.000,00','R$ 48.447,00', 'R$ 48.447,00'],
      ['016', '25.106.330', '2.1.4.15.006',    'PROPAGANDA/PUBLICIDADE',  '2.1.1.02.01.004', 'FORNECEDORES DE SERVIÇOS','ESTORNO PROVISÃO MENSAL - F LOPES',                     'CC-003', 'R$ 801,00',    'R$ 801,00',    'R$ 48.447,00', 'R$ 48.447,00'],
      ['017', '25.106.334', '3.2.1.03.003',    'TELEFONIA FIXA HCN',      '2.1.1.02.01.004', 'FORNECEDORES DE SERVIÇOS','ESTORNO PROVISÃO CONTRATO 034/2025',                    'CC-002', 'R$ 5.615,90',  'R$ 5.615,90',  'R$ 48.447,00', 'R$ 48.447,00'],
      ['018', '25.106.336', '2.1.1.02.01.001', 'FORNECEDORES DE INSUMOS', '3.2.1.30.01.001', 'MATERIAL APLICADO',       'ESTORNO NF 32990 - FOUR MED DISTRIBUIDORA',             'CC-001', 'R$ 36.612,00', 'R$ 36.612,00', 'R$ 48.447,00', 'R$ 48.447,00'],

      // Linha de total
      ['TOTAL', '', '', '', '', '', '', '', 'R$ 361.949,65', 'R$ 361.949,65', '', ''],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Larguras de coluna
    ws['!cols'] = [
      { wch: 6 },   // REG
      { wch: 14 },  // Nr. Mvto
      { wch: 18 },  // Conta Débito
      { wch: 30 },  // Nome Conta Débito
      { wch: 18 },  // Conta Crédito
      { wch: 30 },  // Nome Conta Crédito
      { wch: 50 },  // Histórico
      { wch: 10 },  // Centro de Custo
      { wch: 16 },  // Valor Débito
      { wch: 16 },  // Valor Crédito
      { wch: 16 },  // Saldo Anterior
      { wch: 16 },  // Saldo Atual
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Diário Dezembro 2025');
    XLSX.writeFile(wb, 'exemplo_planilha_contabil.xlsx');
  }
}

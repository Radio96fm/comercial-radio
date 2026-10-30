// Banco do financeiro: o que pode ser ligado e os bancos aceitos
export const BANCOS = [
  ['bradesco', 'Bradesco (237)'],
  ['itau', 'Itaú (341)'],
  ['bb', 'Banco do Brasil (001)'],
  ['caixa', 'Caixa (104)'],
  ['santander', 'Santander (033)'],
  ['sicoob', 'Sicoob (756)'],
  ['sicredi', 'Sicredi (748)'],
];

export const SERVICOS = [
  ['saldo', 'Saldo', 'Saldo da conta em tempo real'],
  ['extrato', 'Extrato', 'Entradas e saídas da conta'],
  ['boletos', 'Boletos (cobrança)', 'Emitir boletos e ver quais foram pagos'],
  ['pix', 'Pix', 'Pix recebidos, ligados às parcelas'],
];

export const nomeBanco = (k) => (BANCOS.find((b) => b[0] === k) || [k, k])[1];

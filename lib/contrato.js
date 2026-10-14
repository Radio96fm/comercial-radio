import { data, horario, moeda, hojeISO } from '@/lib/format';

export const CAMPOS_MODELO = [
  ['numero_contrato', 'Número do contrato'],
  ['data_hoje', 'Data de hoje'],
  ['radio', 'Nome da rádio'],
  ['radio_maiusculo', 'Nome da rádio em maiúsculas (ex.: RÁDIO 96 FM)'],
  ['programa', 'Nome do programa'],
  ['programa_dias', 'Dias do programa'],
  ['programa_horario', 'Horário do programa'],
  ['segmento', 'Segmento do cliente'],
  ['cliente_nome', 'Nome fantasia do cliente'],
  ['cliente_razao_social', 'Razão social'],
  ['cliente_documento', 'CNPJ/CPF'],
  ['cliente_endereco', 'Endereço'],
  ['cliente_cidade', 'Cidade do cliente'],
  ['cliente_contato', 'Responsável do cliente'],
  ['cliente_telefone', 'Telefone do cliente'],
  ['cliente_email', 'E-mail do cliente'],
  ['descricao_produto', 'O que o cliente está comprando'],
  ['data_inicio', 'Início'],
  ['data_fim', 'Fim'],
  ['meses', 'Quantidade de meses'],
  ['valor_mensal', 'Valor mensal'],
  ['valor_total', 'Valor total'],
  ['dia_vencimento', 'Dia do vencimento'],
  ['vendedor', 'Nome do vendedor'],
  ['observacoes', 'Observações'],
];

// "96 FM" -> "Rádio 96 FM"; "Rádio do Agro" fica igual
export function nomeEmissora(nome = '') {
  return /^r[áa]dio/i.test(nome) ? nome : `Rádio ${nome}`;
}

export function dadosDoContrato({ contrato, cliente, programa, radio, segmento, vendedor }) {
  return {
    numero_contrato: String(contrato.numero ?? ''),
    data_hoje: data(hojeISO()),
    radio: radio?.nome ?? '',
    radio_maiusculo: nomeEmissora(radio?.nome).toUpperCase(),
    programa: programa?.nome ?? 'Pacote de inserções avulsas',
    programa_dias: programa?.dias ?? 'conforme itens contratados',
    programa_horario: horario(programa) || 'conforme itens contratados',
    segmento: segmento?.nome ?? '',
    cliente_nome: cliente?.nome ?? '',
    cliente_razao_social: cliente?.razao_social || cliente?.nome || '',
    cliente_documento: cliente?.documento || '________________',
    cliente_endereco: cliente?.endereco || '________________',
    cliente_cidade: cliente?.cidade || '________________',
    cliente_contato: cliente?.contato_nome || '________________',
    cliente_telefone: cliente?.telefone || '________________',
    cliente_email: cliente?.email || '________________',
    descricao_produto: contrato.descricao_produto || programa?.descricao_cota || '',
    data_inicio: data(contrato.data_inicio),
    data_fim: data(contrato.data_fim),
    meses: String(contrato.meses),
    valor_mensal: moeda(contrato.valor_mensal),
    valor_total: moeda(Number(contrato.valor_mensal) * Number(contrato.meses)),
    dia_vencimento: String(contrato.dia_vencimento),
    vendedor: vendedor?.nome ?? '',
    observacoes: contrato.observacoes || 'Nenhuma.',
  };
}

export function preencherModelo(conteudo, dados) {
  return String(conteudo || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, chave) =>
    Object.prototype.hasOwnProperty.call(dados, chave) ? dados[chave] : m
  );
}

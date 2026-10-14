// Textos dos itens avulsos da tabela de preços.
export const MODALIDADE = {
  indeterminada: 'horário livre (7h às 19h)',
  determinada: 'horário marcado',
};

export function nomeItem(p) {
  const tipo = p.tipo === 'testemunhal' ? 'Testemunhal' : 'Inserção';
  return `${tipo} de ${p.duracao}"`;
}

export function descricaoItem(p) {
  return `${nomeItem(p)} · ${MODALIDADE[p.modalidade] || p.modalidade}`;
}

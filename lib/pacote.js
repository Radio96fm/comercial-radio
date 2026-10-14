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

// Texto "O cliente tem direito a ..." das observações do contrato (como no contrato de hoje).
export function textoDireito({ programa, plano, itens = [] }) {
  const partes = [];
  if (programa) {
    const inclui = (plano?.descricao || programa.descricao_cota || '').split('\n').map((t) => t.trim()).filter(Boolean);
    const qual = plano && plano.nome !== 'Plano comercial' ? `, ${plano.nome}` : '';
    partes.push(`ao patrocínio do programa ${programa.nome}${qual}${inclui.length ? ` (${inclui.join('; ').replace(/\.$/, '')})` : ''}`);
  }
  for (const i of itens) {
    const p = i.preco || i;
    const tipo = p.tipo === 'testemunhal' ? (i.qtd > 1 ? 'testemunhais' : 'testemunhal') : (i.qtd > 1 ? 'inserções' : 'inserção');
    const quando = p.modalidade === 'determinada' ? 'em horário determinado' : 'em horário indeterminado';
    partes.push(`${String(i.qtd).padStart(2, '0')} ${tipo} de ${p.duracao}'' por mês ${quando}`);
  }
  if (!partes.length) return '';
  const lista = partes.length > 1 ? `${partes.slice(0, -1).join('; ')} e ${partes[partes.length - 1]}` : partes[0];
  return `O cliente tem direito ${partes[0].startsWith('ao ') ? '' : 'a '}${lista}.`;
}

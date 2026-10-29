// Comissão por contrato (tabela contrato_comissoes).
// base 'total': % sobre o valor cheio. base 'liquido': tira os 2% do
// departamento comercial e aplica o % no que sobra (regra do Maycon).
// percentual nulo = "a definir": não entra na conta.
export const DESCONTO_LIQUIDO = 0.98;

export function pctEfetivo(l) {
  if (l.percentual == null) return null;
  return Number(l.percentual) * (l.base === 'liquido' ? DESCONTO_LIQUIDO : 1);
}

export function rotuloRegra(l) {
  if (l.percentual == null) return 'a definir';
  const p = String(Number(l.percentual)).replace('.', ',');
  return l.base === 'liquido' ? `${p}% depois dos 2%` : `${p}%`;
}

// % de um contrato para quem tem estes vínculos (representantes).
// linhasContrato: todas as linhas do contrato (para saber se já tem vendedor).
// Contrato novo (não importado) sem linha de vendedor paga a comissão do perfil
// para o vendedor do contrato.
export function pctNoContrato({ contrato, linhasContrato, repIds, perfilId, pctPerfil }) {
  let pct = 0;
  let aDefinir = false;
  for (const l of linhasContrato) {
    if (!repIds.has(l.representante_id)) continue;
    const p = pctEfetivo(l);
    if (p == null) aDefinir = true; else pct += p;
  }
  const temVendedor = linhasContrato.some((l) => l.papel === 'vendedor');
  if (!temVendedor && !contrato.importado && contrato.vendedor_id === perfilId) pct += Number(pctPerfil ?? 18);
  return { pct, aDefinir };
}

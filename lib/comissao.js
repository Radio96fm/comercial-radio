// Comissão por contrato (tabela contrato_comissoes).
// desconto: % tirado do valor do contrato antes de aplicar o percentual
// (0 = valor cheio; 2 = depois dos 2% do departamento comercial, regra do
// Maycon). Linhas antigas sem desconto usam a base ('liquido' = 2%).
// percentual nulo = "a definir": não entra na conta.
export const DESCONTO_LIQUIDO = 0.98;

export const descontoDe = (l) => (l.desconto != null && l.desconto !== '' ? Number(String(l.desconto).replace(',', '.')) : l.base === 'liquido' ? 2 : 0);

// % do valor do contrato que a linha recebe
export function pctEfetivo(l) {
  if (l.percentual == null || l.percentual === '') return null;
  return Number(String(l.percentual).replace(',', '.')) * (1 - descontoDe(l) / 100);
}

const num = (v) => String(Math.round(Number(v) * 100) / 100).replace('.', ',');

export function rotuloRegra(l) {
  if (l.percentual == null) return 'a definir';
  const d = descontoDe(l);
  return d ? `${num(l.percentual)}% depois de tirar ${num(d)}%` : `${num(l.percentual)}%`;
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

// Quem vende cada contrato: os logins das linhas de vendedor (contrato com
// dois vendedores aparece para os dois) ou, sem linha, o vendedor do contrato.
// linhas: [{ contrato_id, representante: { profile_id } }] só papel vendedor.
export function vendedoresDosContratos(contratos, linhas) {
  const porContrato = {};
  for (const l of linhas || []) {
    const p = l.representante?.profile_id;
    if (!p) continue;
    (porContrato[l.contrato_id] ||= new Set()).add(p);
  }
  const mapa = {};
  for (const c of contratos || []) mapa[c.id] = porContrato[c.id]?.size ? [...porContrato[c.id]] : [c.vendedor_id].filter(Boolean);
  return mapa;
}

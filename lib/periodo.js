export const PERIODOS = [1, 3, 6, 12];

export const nomePeriodo = (m) => (m === 1 ? '1 mês' : `${m} meses`);

// valor por mês do plano conforme a duração do contrato (vazio = valor normal)
export function valorNoPeriodo(plano, meses) {
  const v = plano?.[`valor_${meses}`];
  return v !== null && v !== undefined && v !== '' ? Number(v) : Number(plano?.valor ?? 0);
}

// o plano tem algum preço diferente por período?
export function temPrecoPorPeriodo(plano) {
  return PERIODOS.some((m) => valorNoPeriodo(plano, m) !== Number(plano?.valor ?? 0));
}

// condições especiais que os vendedores ainda devem ver
export function buscarCondicoesAtivas(supabase, programaId) {
  let q = supabase
    .from('condicoes_especiais')
    .select('id, texto, expira_em, created_at, programa:programas(id, nome, radio:radios(id, nome, cor))')
    .eq('ativo', true)
    .or(`expira_em.is.null,expira_em.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false });
  if (programaId) q = q.eq('programa_id', programaId);
  return q;
}

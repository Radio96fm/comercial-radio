import { hojeISO } from '@/lib/format';

// Dados do quadro de contratos por vendedor (no /dev e no financeiro)
// radioId: só os contratos de uma rádio (o financeiro separa as rádios)
export async function carregarQuadro(supabase, radioId = null) {
  let qc = supabase.from('contratos')
    .select('id, numero, cliente_nome, valor_mensal, data_inicio, data_fim, status, agencia_nome, representante_id, importado, radio:radios(nome)')
    .in('status', ['ativo', 'pendente']).gte('data_fim', hojeISO()).order('numero');
  if (radioId) qc = qc.eq('radio_id', radioId);
  const [{ data: reps, error }, { data: contratos }, { data: linhas }, { data: historico }] = await Promise.all([
    supabase.from('representantes').select('id, nome, tipo, diretor, profile_id').order('nome'),
    qc,
    supabase.from('contrato_comissoes').select('contrato_id, representante_id, papel, percentual, base, desconto, regra').eq('vigente', true),
    supabase.from('contrato_comissoes_historico').select('contrato_id, antes, depois, regra, feito_em, por:profiles(nome)').order('feito_em', { ascending: false }).limit(500),
  ]);
  return {
    error,
    reps: (reps || []).filter((r) => r.tipo === 'vendedor'),
    agencias: (reps || []).filter((r) => r.tipo === 'agencia'),
    contratos: (contratos || []).map((c) => ({ ...c, radio: c.radio?.nome || '' })),
    linhas: linhas || [],
    historico: historico || [],
  };
}

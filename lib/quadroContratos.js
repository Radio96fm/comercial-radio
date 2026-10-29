import { hojeISO } from '@/lib/format';

// Dados do quadro de contratos por vendedor (no /dev e no financeiro)
export async function carregarQuadro(supabase) {
  const [{ data: reps, error }, { data: contratos }, { data: linhas }] = await Promise.all([
    supabase.from('representantes').select('id, nome, tipo, diretor, profile_id').order('nome'),
    supabase.from('contratos')
      .select('id, numero, cliente_nome, valor_mensal, data_inicio, data_fim, status, agencia_nome, importado, radio:radios(nome)')
      .in('status', ['ativo', 'pendente']).gte('data_fim', hojeISO()).order('numero'),
    supabase.from('contrato_comissoes').select('contrato_id, representante_id, papel, percentual, base, regra').eq('vigente', true),
  ]);
  return {
    error,
    reps: (reps || []).filter((r) => r.tipo === 'vendedor'),
    contratos: (contratos || []).map((c) => ({ ...c, radio: c.radio?.nome || '' })),
    linhas: linhas || [],
  };
}

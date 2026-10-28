import { requireDev } from '@/lib/auth';
import { hojeISO } from '@/lib/format';
import Quadro from './Quadro';

// Quadro dos contratos vigentes por vendedor (estilo Trello). Arrastar um
// contrato de uma coluna para outra troca o vendedor e a comissão.
export default async function ContratosDev() {
  const { supabase } = await requireDev();
  const [{ data: reps, error }, { data: contratos }, { data: linhas }] = await Promise.all([
    supabase.from('representantes').select('id, nome, tipo, diretor, profile_id').order('nome'),
    supabase.from('contratos')
      .select('id, numero, cliente_nome, valor_mensal, data_inicio, data_fim, status, agencia_nome, importado, radio:radios(nome)')
      .in('status', ['ativo', 'pendente']).gte('data_fim', hojeISO()).order('numero'),
    supabase.from('contrato_comissoes').select('contrato_id, representante_id, papel, percentual, base, regra'),
  ]);

  return (
    <>
      <div className="cabecalho">
        <h1>Contratos por vendedor</h1>
        <span className="muted">{(contratos || []).length} contratos no ar ou para começar</span>
      </div>
      {error && <div className="alerta erro">Falta criar a tabela de comissão por contrato no Supabase.</div>}
      <p className="muted" style={{ marginTop: 0 }}>
        Arraste um contrato para outro vendedor (no celular, toque nele). Quando a regra da comissão for conhecida, o sistema só pede confirmação.
        Quando não for (contrato dividido, regra a definir), ele trava e pede a regra antes de gravar.
      </p>
      <Quadro
        reps={(reps || []).filter((r) => r.tipo === 'vendedor')}
        contratos={(contratos || []).map((c) => ({ ...c, radio: c.radio?.nome || '' }))}
        linhas={linhas || []}
      />
    </>
  );
}

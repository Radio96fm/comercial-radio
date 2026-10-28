import { requireGestor } from '@/lib/auth';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import { salvarModelo } from '../actions';
import { CAMPOS_MODELO } from '@/lib/contrato';
import { dataHora } from '@/lib/format';

export default async function Modelos() {
  const { supabase } = await requireGestor();
  const { data: modelo } = await supabase
    .from('modelos_contrato')
    .select('*')
    .eq('ativo', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <>
      <div className="cabecalho">
        <h1>Modelo de contrato</h1>
        {modelo && <span className="muted">Última alteração: {dataHora(modelo.updated_at)}</span>}
      </div>
      <p className="muted">
        Este é o texto usado em <b>todos</b> os contratos novos. Os campos entre chaves, como <code>{'{{cliente_nome}}'}</code>, são preenchidos
        automaticamente quando o vendedor cria o contrato. Contratos já criados não mudam.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 16, alignItems: 'start' }} className="modelo-grid">
        <FormAcao action={salvarModelo}>
          {modelo && <input type="hidden" name="id" value={modelo.id} />}
          <div className="campo"><label>Nome do modelo</label><input name="nome" defaultValue={modelo?.nome || 'Contrato padrão de patrocínio'} /></div>
          <div className="campo"><label>Texto do contrato</label><textarea className="modelo" name="conteudo" defaultValue={modelo?.conteudo || ''} /></div>
          <BotaoEnviar className="btn" texto="Salvar modelo" />
        </FormAcao>
        <div className="card" style={{ position: 'sticky', top: 16 }}>
          <h3>Campos disponíveis</h3>
          <p className="muted">Copie e cole no texto:</p>
          {CAMPOS_MODELO.map(([k, desc]) => (
            <div key={k} style={{ marginBottom: 6 }}>
              <code style={{ userSelect: 'all' }}>{`{{${k}}}`}</code>
              <div className="muted" style={{ fontSize: '.82rem' }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 860px){ .modelo-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}

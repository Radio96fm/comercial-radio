import { requireGestor } from '@/lib/auth';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import { headers } from 'next/headers';
import { salvarModelo, salvarAutentique } from '../actions';
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

  const { data: autentique } = await supabase.rpc('autentique_situacao');
  const h = headers();
  const urlAviso = `https://${h.get('x-forwarded-host') || h.get('host')}/api/autentique`;

  return (
    <>
      <div className="card autentique-cfg">
        <div className="cabecalho" style={{ marginBottom: 6 }}>
          <h2 style={{ margin: 0 }}>Assinatura digital (Autentique)</h2>
          <span className={`badge ${autentique?.token ? 'b-verde' : 'b-amarelo'}`}>{autentique?.token ? 'Ligada' : 'Desligada'}</span>
        </div>
        <p className="muted">
          Com a chave ligada, o vendedor toca em <b>“Enviar para o cliente assinar”</b> no contrato e ele vai direto pela Autentique.
          Pegue a chave em <a href="https://painel.autentique.com.br/perfil/api" target="_blank" rel="noopener noreferrer">painel.autentique.com.br › Perfil › Chaves de API</a>.
        </p>
        <FormAcao action={salvarAutentique} limparAoSalvar>
          <div className="form-grid">
            <div className="campo"><label>Chave da API {autentique?.token && <small>(já salva; cole outra só para trocar)</small>}</label><input name="token" type="password" autoComplete="off" placeholder={autentique?.token ? '••••••••••••' : 'Cole aqui a chave'} /></div>
            <div className="campo"><label>Segredo do aviso automático (opcional) {autentique?.webhook && <small>(já salvo)</small>}</label><input name="webhook" type="password" autoComplete="off" placeholder="Opcional" /></div>
          </div>
          <BotaoEnviar className="btn" texto="Salvar e testar" enviando="Testando..." />
        </FormAcao>
        <details style={{ marginTop: 12 }}>
          <summary className="muted">Aviso automático (opcional): o contrato fica ativo na hora em que o cliente assina</summary>
          <p className="muted" style={{ marginTop: 8 }}>
            No painel da Autentique, em Webhooks, cadastre o endereço <code>{urlAviso}</code> com o evento <b>document.finished</b>.
            Sem isso também funciona: o sistema confere sozinho sempre que alguém abre o contrato.
          </p>
        </details>
      </div>

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

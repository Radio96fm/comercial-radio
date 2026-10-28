import { headers } from 'next/headers';
import { requireDev } from '@/lib/auth';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import { salvarIA, salvarAutentique } from '@/app/gestao/actions';
import { salvarElevenLabs } from '../actions';
import { PROVEDORES } from '@/lib/ia';

function Situacao({ ligada, texto }) {
  return <span className={`badge ${ligada ? 'b-verde' : 'b-amarelo'}`}>{texto || (ligada ? 'Ligada' : 'Desligada')}</span>;
}

// Chaves e serviços de fora que o sistema usa. As chaves ficam guardadas no banco e nunca aparecem de volta.
export default async function Integracoes() {
  const { supabase } = await requireDev();
  const [{ data: ia }, { data: autentique }, { data: eleven }] = await Promise.all([
    supabase.rpc('ia_situacao'),
    supabase.rpc('autentique_situacao'),
    supabase.rpc('elevenlabs_situacao'),
  ]);
  const chaves = ia?.chaves || [];
  const atual = ia?.provedor && chaves.includes(ia.provedor) ? ia.provedor : null;
  const h = headers();
  const urlAviso = `https://${h.get('x-forwarded-host') || h.get('host')}/api/autentique`;

  return (
    <>
      <div className="cabecalho"><h1>Integrações</h1><span className="muted">Chaves de API dos serviços que o sistema usa</span></div>
      <p className="muted">As chaves ficam guardadas no banco, num lugar que nenhuma tela lê de volta. Para trocar, é só colar a nova.</p>

      <div className="card">
        <div className="cabecalho" style={{ marginBottom: 6 }}>
          <h2 style={{ margin: 0 }}>IA do testemunhal</h2>
          <Situacao ligada={!!atual} texto={atual ? `Ligada: ${PROVEDORES[atual].nome}${ia?.modelo ? ` · ${ia.modelo}` : ''}` : 'Desligada'} />
        </div>
        <p className="muted">Escreve o texto do testemunhal quando o vendedor toca em “Criar testemunhal” no app. O que ela aprende fica em <b>Treinar assistente</b>.</p>
        <FormAcao action={salvarIA} limparAoSalvar>
          <div className="form-grid">
            <div className="campo"><label>Qual IA usar</label>
              <select name="provedor" defaultValue={atual || 'gemini'}>
                {Object.entries(PROVEDORES).map(([k, p]) => (
                  <option key={k} value={k}>{p.nome}{k === 'gemini' ? ' · tem faixa gratuita' : ''}{chaves.includes(k) ? ' · chave salva' : ''}</option>
                ))}
              </select>
            </div>
            <div className="campo"><label>Chave da API <small>(para trocar de IA com chave já salva, deixe em branco)</small></label>
              <input name="token" type="password" autoComplete="off" placeholder="Cole aqui a chave" />
            </div>
          </div>
          <BotaoEnviar className="btn" texto="Salvar e testar" enviando="Testando..." />
        </FormAcao>
        <details style={{ marginTop: 12 }}>
          <summary className="muted">Onde pego a chave?</summary>
          <ul className="muted" style={{ marginTop: 8 }}>
            {Object.entries(PROVEDORES).map(([k, p]) => (
              <li key={k}><b>{p.nome}:</b> <a href={p.chave} target="_blank" rel="noopener noreferrer">{p.chave.replace('https://', '')}</a></li>
            ))}
          </ul>
        </details>
      </div>

      <div className="card">
        <div className="cabecalho" style={{ marginBottom: 6 }}>
          <h2 style={{ margin: 0 }}>Voz com IA (ElevenLabs)</h2>
          <Situacao ligada={eleven?.token} texto={eleven?.token ? 'Chave salva' : 'Desligada'} />
        </div>
        <p className="muted">
          Para gerar a locução do testemunhal em áudio. A chave já fica guardada e testada aqui; o botão de gerar o áudio no app entra na próxima etapa.
          Pegue a chave em <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer">elevenlabs.io › Settings › API Keys</a>.
        </p>
        <FormAcao action={salvarElevenLabs} limparAoSalvar>
          <div className="form-grid">
            <div className="campo"><label>Chave da API {eleven?.token && <small>(já salva; cole outra só para trocar)</small>}</label><input name="token" type="password" autoComplete="off" placeholder={eleven?.token ? '••••••••••••' : 'Cole aqui a chave'} /></div>
            <div className="campo"><label>ID da voz (opcional)</label><input name="voz" defaultValue={eleven?.voz || ''} autoComplete="off" placeholder="Ex.: a voz do locutor clonada na ElevenLabs" /></div>
          </div>
          <BotaoEnviar className="btn" texto="Salvar e testar" enviando="Testando..." />
        </FormAcao>
      </div>

      <div className="card autentique-cfg">
        <div className="cabecalho" style={{ marginBottom: 6 }}>
          <h2 style={{ margin: 0 }}>Assinatura digital (Autentique)</h2>
          <Situacao ligada={autentique?.token} />
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
    </>
  );
}

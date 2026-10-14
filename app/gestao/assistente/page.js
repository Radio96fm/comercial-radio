import { requireGestor } from '@/lib/auth';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import { salvarIA, alternarMaterial, excluirMaterial } from '../actions';
import { PROVEDORES } from '@/lib/ia';
import { TIPOS_MATERIAL } from '@/lib/assistente';
import { data } from '@/lib/format';
import NovoMaterial from './NovoMaterial';

export default async function Assistente() {
  const { supabase } = await requireGestor();
  const [{ data: ia }, { data: materiais }, { count: feitos }] = await Promise.all([
    supabase.rpc('ia_situacao'),
    supabase.from('assistente_materiais').select('*').order('created_at', { ascending: false }),
    supabase.from('testemunhais').select('id', { count: 'exact', head: true }),
  ]);
  const chaves = ia?.chaves || [];
  const atual = ia?.provedor && chaves.includes(ia.provedor) ? ia.provedor : null;
  const lista = materiais || [];

  return (
    <>
      <div className="cabecalho">
        <h1>Treinar assistente</h1>
        <span className="muted">{feitos || 0} testemunhais salvos pelos vendedores</span>
      </div>
      <p className="muted">
        O vendedor abre um cliente, toca em <b>“Criar testemunhal”</b>, conta (ou fala) sobre o negócio e a IA escreve o texto para o locutor.
        Tudo o que você cadastrar aqui é usado em todos os testemunhais.
      </p>

      <div className="card">
        <div className="cabecalho" style={{ marginBottom: 6 }}>
          <h2 style={{ margin: 0 }}>Inteligência artificial</h2>
          <span className={`badge ${atual ? 'b-verde' : 'b-amarelo'}`}>{atual ? `Ligada: ${PROVEDORES[atual].nome}` : 'Desligada'}</span>
        </div>
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

      <NovoMaterial ligado={!!atual} />

      <div className="secao-titulo"><h2>O que o assistente já sabe</h2><span className="muted">{lista.filter((m) => m.ativo).length} em uso</span></div>
      {!lista.length ? (
        <div className="vazio">Nada cadastrado ainda. Comece colando 2 ou 3 testemunhais que já foram ao ar.</div>
      ) : (
        <div className="lista materiais">
          {lista.map((m) => (
            <details key={m.id} className={`item material ${m.ativo ? '' : 'desligado'}`}>
              <summary>
                <div className="info">
                  <div className="nome">{m.titulo}</div>
                  <div className="det">{TIPOS_MATERIAL[m.tipo]} · {data(m.created_at)}{m.ativo ? '' : ' · pausado'}</div>
                </div>
              </summary>
              <div className="material-corpo">
                {m.origem && <p className="muted" style={{ wordBreak: 'break-all' }}>Origem: {m.origem}</p>}
                <pre>{m.conteudo}</pre>
                <div className="acoes">
                  <form action={alternarMaterial}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="ativo" value={m.ativo ? '0' : '1'} />
                    <BotaoEnviar className="btn peq cinza" texto={m.ativo ? 'Pausar' : 'Voltar a usar'} enviando="..." />
                  </form>
                  <form action={excluirMaterial}>
                    <input type="hidden" name="id" value={m.id} />
                    <BotaoEnviar className="btn peq vermelho" texto="Excluir" enviando="..." confirmar="Excluir este material?" />
                  </form>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </>
  );
}

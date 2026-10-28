import { requireDev } from '@/lib/auth';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import Link from 'next/link';
import { alternarMaterial, excluirMaterial } from '@/app/gestao/actions';
import { PROVEDORES } from '@/lib/ia';
import { TIPOS_MATERIAL } from '@/lib/assistente';
import { data } from '@/lib/format';
import NovoMaterial from './NovoMaterial';

export default async function Assistente() {
  const { supabase } = await requireDev();
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

      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span>IA do assistente: <span className={`badge ${atual ? 'b-verde' : 'b-amarelo'}`}>{atual ? `Ligada: ${PROVEDORES[atual].nome}` : 'Desligada'}</span></span>
        <Link className="btn peq sec" href="/dev/integracoes">Trocar IA ou chave</Link>
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

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import CamposCliente from '@/components/CamposCliente';
import { atualizarCliente, excluirTestemunhal } from '../../actions';
import { Sparkles } from 'lucide-react';
import { data, dataHora, linkWhatsApp, STATUS_CONTRATO, STATUS_VISITA } from '@/lib/format';

export default async function ClientePage({ params }) {
  const { supabase, perfil, isGestor } = await getSessao();
  const { data: c } = await supabase
    .from('clientes')
    .select('*, segmento:segmentos(nome), vendedor:profiles!clientes_vendedor_id_fkey(nome)')
    .eq('id', params.id)
    .maybeSingle();
  if (!c) notFound();
  if (isGestor && c.vendedor_id !== perfil.id) redirect(`/gestao/clientes/${c.id}`);

  const [{ data: contratos }, { data: visitas }, { data: segmentos }, { data: testemunhais }] = await Promise.all([
    supabase.from('contratos').select('id, numero, status, data_fim, programa:programas(nome)').eq('cliente_id', c.id).order('created_at', { ascending: false }),
    supabase.from('visitas').select('id, status, iniciada_em, vendedor:profiles(nome)').eq('cliente_id', c.id).order('iniciada_em', { ascending: false }).limit(10),
    supabase.from('segmentos').select('id, nome').order('nome'),
    supabase.from('testemunhais').select('id, texto, created_at, vendedor_id, programa:programas(nome)').eq('cliente_id', c.id).order('created_at', { ascending: false }),
  ]);

  const podeEditar = isGestor || c.vendedor_id === perfil.id;

  return (
    <>
      <Topo titulo={c.nome} voltar="/app/clientes" />
      <main className="conteudo">
        <div className="card">
          <h1 style={{ marginBottom: 2 }}>{c.nome}</h1>
          <div className="muted">{c.segmento?.nome}{c.cidade ? ` · ${c.cidade}` : ''}</div>
          <p style={{ marginTop: 8 }}>Carteira de <b>{c.vendedor_id === perfil.id ? 'você' : c.vendedor?.nome || '—'}</b></p>
          {c.contato_nome && <div>{c.contato_nome}</div>}
          {c.telefone && (
            <div className="acoes" style={{ marginTop: 10 }}>
              <a className="btn peq sec" href={`tel:${c.telefone.replace(/\D/g, '')}`}>Ligar</a>
              <a className="btn peq whats" href={linkWhatsApp(c.telefone, '')} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            </div>
          )}
        </div>

        <div className="acoes" style={{ marginBottom: 8 }}>
          <Link className="btn verde" href={`/app/visitas/nova?cliente=${c.id}`}>Iniciar visita</Link>
          {podeEditar && <Link className="btn" href={`/app/contratos/novo?cliente=${c.id}`}>Novo contrato</Link>}
        </div>
        <Link className="btn sec btn-testemunhal" href={`/app/clientes/${c.id}/testemunhal`}><Sparkles className="ico" />Criar testemunhal com IA</Link>

        {!!testemunhais?.length && (
          <>
            <div className="secao-titulo"><h2>Testemunhais</h2><span className="muted">{testemunhais.length}</span></div>
            <div className="lista">
              {testemunhais.map((t) => (
                <details key={t.id} className="item material">
                  <summary>
                    <div className="info">
                      <div className="nome">{t.texto.slice(0, 70)}{t.texto.length > 70 ? '...' : ''}</div>
                      <div className="det">{data(t.created_at)}{t.programa?.nome ? ` · ${t.programa.nome}` : ''}</div>
                    </div>
                  </summary>
                  <div className="material-corpo">
                    <pre>{t.texto}</pre>
                    {(isGestor || t.vendedor_id === perfil.id) && (
                      <form action={excluirTestemunhal}>
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="cliente" value={c.id} />
                        <BotaoEnviar className="btn peq vermelho" texto="Excluir" enviando="..." confirmar="Excluir este testemunhal?" />
                      </form>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </>
        )}

        <div className="secao-titulo"><h2>Contratos</h2></div>
        {!contratos?.length ? <div className="vazio">Nenhum contrato.</div> : (
          <div className="lista">
            {contratos.map((k) => (
              <Link key={k.id} href={`/app/contratos/${k.id}`} className="item">
                <div className="info">
                  <div className="nome">Nº {k.numero} · {k.programa?.nome || 'Pacote avulso'}</div>
                  <div className="det">até {data(k.data_fim)}</div>
                </div>
                <span className="badge b-cinza">{STATUS_CONTRATO[k.status]}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="secao-titulo"><h2>Visitas</h2></div>
        {!visitas?.length ? <div className="vazio">Nenhuma visita registrada.</div> : (
          <div className="lista">
            {visitas.map((v) => (
              <Link key={v.id} href={`/app/visitas/${v.id}`} className="item">
                <div className="info">
                  <div className="nome">{v.vendedor?.nome}</div>
                  <div className="det">{dataHora(v.iniciada_em)}</div>
                </div>
                <span className="badge b-cinza">{STATUS_VISITA[v.status]}</span>
              </Link>
            ))}
          </div>
        )}

        {podeEditar && (
          <details className="card" style={{ marginTop: 20 }}>
            <summary>Editar dados do cliente</summary>
            <FormAcao action={atualizarCliente}>
              <input type="hidden" name="id" value={c.id} />
              <CamposCliente segmentos={segmentos || []} valores={c} />
              <BotaoEnviar texto="Salvar alterações" />
            </FormAcao>
          </details>
        )}
      </main>
    </>
  );
}

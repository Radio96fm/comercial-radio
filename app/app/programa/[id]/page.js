import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import { Ban, Building2, Check, Clock, Mic, PenLine } from 'lucide-react';
import { data, horario, moeda, statusPrograma, STATUS_CONTRATO, hojeISO } from '@/lib/format';
import { PERIODOS, nomePeriodo, valorNoPeriodo, temPrecoPorPeriodo, buscarCondicoesAtivas } from '@/lib/periodo';
import { Sparkles, Send } from 'lucide-react';
import { escolherProgramaVisita } from '../../actions';
import BotaoEnviar from '@/components/BotaoEnviar';

export default async function ProgramaPage({ params, searchParams }) {
  const { supabase, perfil } = await getSessao();
  const { data: p } = await supabase.from('programas_ocupacao').select('*').eq('id', params.id).maybeSingle();
  if (!p) notFound();
  const visitaId = typeof searchParams?.visita === 'string' ? searchParams.visita : '';
  const { data: visita } = visitaId
    ? await supabase.from('visitas').select('id, cliente:clientes(nome, segmento_id, segmento:segmentos(nome))').eq('id', visitaId).maybeSingle()
    : { data: null };

  const [{ data: planos }, { data: condicoes }] = await Promise.all([
    supabase.from('programa_planos').select('id, nome, descricao, valor, valor_1, valor_3, valor_6, valor_12').eq('programa_id', p.id).order('ordem'),
    buscarCondicoesAtivas(supabase, p.id),
  ]);
  const valores = (planos || []).map((x) => Number(x.valor));
  const aPartir = valores.length > 1 && Math.min(...valores) !== Math.max(...valores);
  const valorRef = valores.length ? Math.min(...valores) : p.valor_cota;
  const { data: contratos } = await supabase
    .from('contratos')
    .select('id, numero, data_inicio, data_fim, status, vendedor_id, cliente_nome, segmento:segmentos(id, nome), vendedor:profiles(nome)')
    .eq('programa_id', p.id)
    .in('status', ['pendente', 'ativo'])
    .gte('data_fim', hojeISO())
    .order('data_inicio');

  const hoje = hojeISO();
  const vigentes = (contratos || []).filter((c) => c.data_inicio <= hoje);
  const futuros = (contratos || []).filter((c) => c.data_inicio > hoje);
  const st = statusPrograma(p.cotas_livres, p.cotas_total);
  // na visita: o segmento da empresa já tem patrocinador aqui? (programa é sempre com exclusividade)
  const segOcupado = visita ? [...vigentes, ...futuros].find((c) => c.segmento?.id === visita.cliente.segmento_id) : null;
  const podeEscolher = visita && p.cotas_livres > 0 && !segOcupado;
  const Escolher = ({ plano, texto }) => (
    <form action={escolherProgramaVisita}>
      <input type="hidden" name="visita" value={visita.id} />
      <input type="hidden" name="programa" value={p.id} />
      {plano && <input type="hidden" name="plano" value={plano} />}
      <BotaoEnviar className="btn verde" texto={<><Send className="ico" /> {texto}</>} enviando="..." />
    </form>
  );

  const Linha = ({ c }) => (
    <div className="item patrocinador">
      <span className="icone-redondo"><Building2 size={20} /></span>
      <div className="info">
        <div className="seg">{c.segmento?.nome}</div>
        <div className="nome">{c.cliente_nome}</div>
        <div className="det">
          {c.data_inicio > hoje ? `Começa ${data(c.data_inicio)} · ` : ''}até {data(c.data_fim)}
          {' · '}{c.vendedor_id === perfil.id ? 'você' : c.vendedor?.nome}
        </div>
        {c.status !== 'ativo' && <span className="badge b-amarelo" style={{ marginTop: 6 }}>{STATUS_CONTRATO[c.status]}</span>}
      </div>
    </div>
  );

  return (
    <>
      <Topo titulo={p.nome} voltar={`/app/radio/${p.radio_id}${visita ? `?visita=${visita.id}` : ''}`} cor={p.radio_cor} />
      <main className="conteudo">
        {visita && (
          <div className="visita-banner">
            <div className="t"><small>Visita em andamento</small><b>{visita.cliente.nome}</b></div>
            <span className="badge b-azul">{visita.cliente.segmento?.nome}</span>
          </div>
        )}
        {segOcupado && (
          <div className="alerta erro">O segmento {visita.cliente.segmento?.nome} já tem patrocinador neste programa ({segOcupado.cliente_nome}, até {data(segOcupado.data_fim)}). Escolha outro programa.</div>
        )}
        {(condicoes || []).map((c) => (
          <div key={c.id} className="cond-destaque"><Sparkles size={18} className="ico" /><div><small>Condição especial</small><b>{c.texto}</b></div></div>
        ))}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
            <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="bolinha" style={{ background: p.radio_cor }} />{p.radio_nome}
            </div>
            <span className={`badge b-${st.cor}`} style={{ fontSize: '.95rem' }}>{st.texto}</span>
          </div>
          <h1 style={{ margin: '10px 0 8px', fontSize: '2rem' }}>{p.nome}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock className="ico" />{p.dias}{horario(p) ? ` · ${horario(p)}` : ''}</div>
          {p.apresentador && <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}><Mic className="ico" />{p.apresentador}</div>}
          {p.descricao && <p style={{ marginTop: 12 }} className="muted">{p.descricao}</p>}

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '18px 0 10px' }}>
            <b>Cotas</b>
            <span><b className="num" style={{ fontSize: '1.6rem' }}>{p.cotas_ocupadas}</b><span className="muted"> de {p.cotas_total} ocupadas</span></span>
          </div>
          <div className={`cotas-blocos${p.cotas_livres <= 0 ? ' lotado' : ''}`} style={{ '--cheia': p.radio_cor }}>
            {Array.from({ length: p.cotas_total }, (_, i) => <span key={i} className={i < p.cotas_ocupadas ? 'cheia' : ''} />)}
          </div>

          <div className="grid2" style={{ marginTop: 16 }}>
            <div><div className="muted">{aPartir ? `${valores.length} planos, a partir de` : 'Valor da cota'}</div><b className="num" style={{ fontSize: '1.3rem' }}>{moeda(valorRef)}</b><span className="muted"> /mês</span></div>
            <div><div className="muted">Cotas livres</div><b className="num" style={{ fontSize: '1.3rem' }}>{p.cotas_livres}</b></div>
          </div>
        </div>

        {!!planos?.length && (
          <>
            <div className="secao-titulo">
              <h2>{planos.length > 1 ? 'Planos para escolher' : 'O que o cliente leva'}</h2>
              {planos.length > 1 && <span className="muted">{planos.length}</span>}
            </div>
            <div className="planos-prog">
              {planos.map((x) => (
                <div key={x.id} className="plano-card">
                  <div className="cab">
                    <b>{x.nome}</b>
                    <span className="preco"><b className="num">{moeda(x.valor)}</b><small>por mês</small></span>
                  </div>
                  {x.descricao && (
                    <ul>
                      {x.descricao.split('\n').filter(Boolean).map((t, i) => <li key={i}><Check className="ico" />{t}</li>)}
                    </ul>
                  )}
                  {temPrecoPorPeriodo(x) && (
                    <div className="tabela-periodo">
                      <small>Valor por mês conforme o tempo de contrato</small>
                      <div className="linha">
                        {PERIODOS.filter((m) => m >= (p.meses_minimo || 1)).map((m) => <div key={m}><span>{nomePeriodo(m)}</span><b>{moeda(valorNoPeriodo(x, m))}</b></div>)}
                      </div>
                    </div>
                  )}
                  {visita ? (podeEscolher && <Escolher plano={x.id} texto={planos.length > 1 ? `Proposta com ${x.nome}` : 'Fazer proposta deste plano'} />) : p.cotas_livres > 0 && (
                    <Link href={`/app/contratos/novo?programa=${p.id}&plano=${x.id}`} className="btn cinza">
                      {planos.length > 1 ? `Escolher ${x.nome}` : 'Fechar este plano'}
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <p className="muted" style={{ fontSize: '.9rem' }}>Mensal, boleto{(p.meses_minimo || 1) > 1 ? `, contrato mínimo de ${p.meses_minimo} meses` : ''}.</p>
          </>
        )}

        <div className="secao-titulo">
          <h2><Ban className="ico" style={{ color: 'var(--vermelho)' }} />Segmentos já ocupados</h2>
          <span className="muted">{vigentes.length + futuros.length}</span>
        </div>
        <p className="muted" style={{ marginTop: -6 }}>Estas empresas já anunciam aqui. O mesmo segmento não pode entrar de novo.</p>
        {!vigentes.length && !futuros.length ? (
          <div className="vazio">Nenhum segmento ocupado. Todos estão liberados.</div>
        ) : (
          <div className="lista">{[...vigentes, ...futuros].map((c) => <Linha key={c.id} c={c} />)}</div>
        )}

        <div className="rodape-acao">
          {visita ? (podeEscolher ? (!planos?.length && <Escolher texto="Fazer proposta deste programa" />) : !segOcupado && (
            <div className="alerta erro" style={{ marginBottom: 0 }}>Programa lotado. Veja acima quando cada contrato termina.</div>
          )) : p.cotas_livres > 0 ? (
            <Link href={`/app/contratos/novo?programa=${p.id}`} className="btn grande" style={{ boxShadow: '0 10px 30px rgba(0,0,0,.6)' }}>
              <PenLine className="ico" strokeWidth={2.4} /> Fechar contrato
            </Link>
          ) : (
            <div className="alerta erro" style={{ marginBottom: 0 }}>Programa lotado. Veja acima quando cada contrato termina.</div>
          )}
        </div>
      </main>
    </>
  );
}

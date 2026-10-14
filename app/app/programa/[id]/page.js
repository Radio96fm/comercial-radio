import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import { Ban, Building2, Clock, Mic, Package, PenLine } from 'lucide-react';
import { data, horario, moeda, statusPrograma, STATUS_CONTRATO, hojeISO } from '@/lib/format';

export default async function ProgramaPage({ params }) {
  const { supabase, perfil } = await getSessao();
  const { data: p } = await supabase.from('programas_ocupacao').select('*').eq('id', params.id).maybeSingle();
  if (!p) notFound();

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
      <Topo titulo={p.nome} voltar={`/app/radio/${p.radio_id}`} cor={p.radio_cor} />
      <main className="conteudo">
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
            <div><div className="muted">Valor da cota</div><b className="num" style={{ fontSize: '1.3rem' }}>{moeda(p.valor_cota)}</b><span className="muted"> /mês</span></div>
            <div><div className="muted">Cotas livres</div><b className="num" style={{ fontSize: '1.3rem' }}>{p.cotas_livres}</b></div>
          </div>
          {p.descricao_cota && <p className="muted" style={{ marginTop: 14, marginBottom: 0, display: 'flex', gap: 8 }}><Package className="ico" />{p.descricao_cota}</p>}
        </div>

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
          {p.cotas_livres > 0 ? (
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

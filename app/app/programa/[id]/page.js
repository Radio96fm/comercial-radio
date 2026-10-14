import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import { data, horario, moeda, statusPrograma, STATUS_CONTRATO, hojeISO } from '@/lib/format';

export default async function ProgramaPage({ params }) {
  const { supabase, perfil } = await getSessao();
  const { data: p } = await supabase.from('programas_ocupacao').select('*').eq('id', params.id).maybeSingle();
  if (!p) notFound();

  const { data: contratos } = await supabase
    .from('contratos')
    .select('id, numero, data_inicio, data_fim, status, vendedor_id, cliente:clientes(nome), segmento:segmentos(id, nome), vendedor:profiles(nome)')
    .eq('programa_id', p.id)
    .in('status', ['pendente', 'ativo'])
    .gte('data_fim', hojeISO())
    .order('data_inicio');

  const hoje = hojeISO();
  const vigentes = (contratos || []).filter((c) => c.data_inicio <= hoje);
  const futuros = (contratos || []).filter((c) => c.data_inicio > hoje);
  const st = statusPrograma(p.cotas_livres, p.cotas_total);
  const pct = p.cotas_total ? Math.round((p.cotas_ocupadas / p.cotas_total) * 100) : 100;

  const Linha = ({ c }) => (
    <div className="item">
      <div className="info">
        <div className="nome">{c.cliente?.nome}</div>
        <div className="det">
          {c.segmento?.nome} · até {data(c.data_fim)}
          {c.data_inicio > hoje && ` · começa ${data(c.data_inicio)}`}
        </div>
        <div className="det">Vendedor: <b>{c.vendedor_id === perfil.id ? 'Você' : c.vendedor?.nome}</b></div>
      </div>
      <span className={`badge ${c.status === 'ativo' ? 'b-verde' : 'b-amarelo'}`}>{STATUS_CONTRATO[c.status]}</span>
    </div>
  );

  return (
    <>
      <Topo titulo={p.nome} voltar={`/app/radio/${p.radio_id}`} cor={p.radio_cor} />
      <main className="conteudo">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
            <div>
              <div className="muted">{p.radio_nome}</div>
              <h1 style={{ marginBottom: 4 }}>{p.nome}</h1>
              <div>🕒 {p.dias} · {horario(p)}</div>
              {p.apresentador && <div className="muted">🎙️ {p.apresentador}</div>}
            </div>
            <span className={`badge b-${st.cor}`} style={{ fontSize: '1rem' }}>{st.texto}</span>
          </div>
          {p.descricao && <p style={{ marginTop: 10 }}>{p.descricao}</p>}

          <div style={{ margin: '14px 0 6px', fontWeight: 700 }}>
            Cotas: {p.cotas_ocupadas} de {p.cotas_total} ocupadas
          </div>
          <div className="barra"><span style={{ width: `${pct}%`, background: st.cor === 'vermelho' ? 'var(--vermelho)' : st.cor === 'amarelo' ? '#f59e0b' : 'var(--verde)' }} /></div>

          <div className="grid2" style={{ marginTop: 14 }}>
            <div><div className="muted">Valor da cota</div><b style={{ fontSize: '1.15rem' }}>{moeda(p.valor_cota)}/mês</b></div>
            <div><div className="muted">Cotas livres</div><b style={{ fontSize: '1.15rem' }}>{p.cotas_livres}</b></div>
          </div>
          {p.descricao_cota && <p className="muted" style={{ marginTop: 10 }}>📦 {p.descricao_cota}</p>}
        </div>

        {p.cotas_livres > 0 ? (
          <Link href={`/app/contratos/novo?programa=${p.id}`} className="btn grande verde">✍️ Fechar contrato neste programa</Link>
        ) : (
          <div className="alerta erro">Programa lotado no momento. Veja abaixo quando os contratos terminam.</div>
        )}

        <div className="secao-titulo"><h2>⛔ Segmentos ocupados</h2></div>
        {!vigentes.length && !futuros.length ? (
          <div className="vazio">Nenhum segmento ocupado. Todos estão liberados.</div>
        ) : (
          <div className="tags">
            {[...new Map([...vigentes, ...futuros].map((c) => [c.segmento?.id, c.segmento?.nome])).values()].map((nome) => (
              <span key={nome} className="badge b-vermelho">{nome}</span>
            ))}
          </div>
        )}

        <div className="secao-titulo"><h2>Patrocinadores no ar</h2></div>
        {!vigentes.length ? (
          <div className="vazio">Nenhum patrocinador no momento.</div>
        ) : (
          <div className="lista">{vigentes.map((c) => <Linha key={c.id} c={c} />)}</div>
        )}

        {futuros.length > 0 && (
          <>
            <div className="secao-titulo"><h2>Já vendidos (começam depois)</h2></div>
            <div className="lista">{futuros.map((c) => <Linha key={c.id} c={c} />)}</div>
          </>
        )}
      </main>
    </>
  );
}

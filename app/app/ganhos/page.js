import Link from 'next/link';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import Tendencia from '@/components/Tendencia';
import { calcularGanhos, faltaParaVencer } from '@/lib/ganhos';
import { data, moeda } from '@/lib/format';

export default async function GanhosPage() {
  const { supabase, perfil } = await getSessao();
  const g = await calcularGanhos(supabase, perfil);
  const maior = Math.max(1, ...g.serie.map((m) => m.certo + m.previsto));
  const pctTxt = String(g.pct).replace('.', ',');

  return (
    <>
      <Topo titulo="Meus ganhos" voltar="/app" />
      <main className="conteudo">
        <div className="card ganhos-destaque">
          <small>Sua comissão neste mês</small>
          <b className="num">{moeda(g.atual)}</b>
          <Tendencia variacao={g.variacao} anterior={g.anterior} />
          <div className="ganhos-mini">
            <div><span>Mês passado</span><b>{moeda(g.anterior)}</b></div>
            <div><span>Por mês, contratos ativos</span><b>{moeda(g.mensalAtivos)}</b></div>
          </div>
          {g.previstoMes > 0 && <p className="muted" style={{ margin: '10px 0 0' }}>+ {moeda(g.previstoMes)} quando os clientes assinarem os contratos pendentes.</p>}
        </div>
        <p className="muted" style={{ marginTop: -4 }}>Você ganha {pctTxt}% de tudo o que vende. A conta é feita pelas parcelas de cada mês.</p>

        <div className="secao-titulo"><h2>Mês a mês</h2></div>
        <div className="card grafico-ganhos">
          {g.serie.map((m) => {
            const total = m.certo + m.previsto;
            return (
              <div key={m.chave} className={`barra ${m.atual ? 'atual' : ''} ${m.futuro ? 'futuro' : ''}`}>
                <span className="valor">{total ? moeda(total).replace(/,\d\d$/, '') : ''}</span>
                <div className="trilho">
                  <i style={{ height: `${(total / maior) * 100}%` }}>
                    {m.previsto > 0 && <em style={{ height: `${(m.previsto / total) * 100}%` }} />}
                  </i>
                </div>
                <span className="mes">{m.nome}</span>
              </div>
            );
          })}
        </div>
        <p className="muted" style={{ fontSize: '.85rem', marginTop: -4 }}>Os meses da frente são o que já está garantido pelos contratos de hoje. A parte clara é de contratos aguardando assinatura.</p>

        <div className="secao-titulo"><h2>Vencendo nos próximos 3 meses</h2><span className="muted">{g.vencendo.length}</span></div>
        {!g.vencendo.length ? (
          <div className="vazio">Nenhum contrato vencendo agora. 👍</div>
        ) : (
          <>
            <p className="muted" style={{ marginTop: -6 }}>Procure esses clientes para renovar antes de acabar.</p>
            <div className="lista">
              {g.vencendo.map((c) => (
                <Link key={c.id} href={`/app/contratos/${c.id}`} className="item">
                  <div className="info">
                    <div className="nome">{c.cliente_nome}</div>
                    <div className="det">{c.radio?.nome} · {c.programa?.nome || 'Plano personalizado'} · até {data(c.data_fim)}</div>
                    <div className="det">Você ganha {moeda((Number(c.valor_mensal) * g.pct) / 100)}/mês com ele</div>
                  </div>
                  <span className="badge b-amarelo">{faltaParaVencer(c.data_fim)}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="secao-titulo"><h2>Contratos que pagam sua comissão</h2><span className="muted">{g.ativos.length}</span></div>
        {!g.ativos.length ? (
          <div className="vazio">Nenhum contrato ativo ainda. Feche o primeiro!</div>
        ) : (
          <div className="lista">
            {g.ativos.map((c) => (
              <Link key={c.id} href={`/app/contratos/${c.id}`} className="item">
                <div className="info">
                  <div className="nome">{c.cliente_nome}</div>
                  <div className="det">{moeda(c.valor_mensal)}/mês · até {data(c.data_fim)}</div>
                </div>
                <b className="ganho-linha">+{moeda((Number(c.valor_mensal) * g.pct) / 100)}</b>
              </Link>
            ))}
          </div>
        )}
        {g.pendentes.length > 0 && (
          <p className="muted" style={{ marginTop: 10 }}>{g.pendentes.length} contrato{g.pendentes.length > 1 ? 's' : ''} aguardando assinatura do cliente.</p>
        )}
      </main>
    </>
  );
}

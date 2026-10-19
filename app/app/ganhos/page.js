import Link from 'next/link';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import Tendencia from '@/components/Tendencia';
import { calcularGanhos, faltaParaVencer, DIA_CORTE } from '@/lib/ganhos';
import { data, hojeISO, moeda, somarDias } from '@/lib/format';
import { CalendarClock, FileCheck2, Flame, Lock, Medal, Rocket, Star, Target, TrendingUp, Trophy } from 'lucide-react';

const MES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const mesLongo = (chave) => MES_LONGO[Number(chave.split('-')[1]) - 1];
const curto = (v) => moeda(v).replace(/,\d\d$/, '');

export default async function GanhosPage() {
  const { supabase, perfil } = await getSessao();
  const g = await calcularGanhos(supabase, perfil);
  const iAtual = g.serie.findIndex((m) => m.atual);
  const atual = g.serie[iAtual];
  const passado = g.serie[iAtual - 1];
  const proximo = g.serie[iAtual + 1];
  const maior = Math.max(1, ...g.serie.map((m) => m.certo + m.previsto));
  const recorde = Math.max(...g.serie.filter((m) => !m.futuro).map((m) => m.certo));
  const diff = g.atual - g.anterior;
  const pctTxt = String(g.pct).replace('.', ',');
  const hoje = hojeISO();
  const urgencia = (fim) => (fim <= somarDias(hoje, 30) ? 'b-vermelho' : fim <= somarDias(hoje, 60) ? 'b-amarelo' : 'b-azul');

  const conquistas = [
    { nome: 'Primeiro contrato', desc: 'Fechou o primeiro contrato', icone: Star, ok: g.ativos.length + g.pendentes.length > 0, falta: 'Feche seu primeiro contrato' },
    { nome: 'Três clientes ativos', desc: 'Três contratos pagando você', icone: Medal, ok: g.ativos.length >= 3, falta: `Faltam ${Math.max(0, 3 - g.ativos.length)} contrato(s) ativo(s)` },
    { nome: 'Dez clientes ativos', desc: 'Carteira de 10 contratos', icone: Trophy, ok: g.ativos.length >= 10, falta: `Faltam ${Math.max(0, 10 - g.ativos.length)} contrato(s) ativo(s)` },
    { nome: 'Melhor mês', desc: 'Bateu o recorde de comissão', icone: Rocket, ok: g.atual > 0 && g.atual >= g.recorde && g.recorde > 0, falta: 'Bata seu melhor mês' },
    { nome: 'Três meses seguidos', desc: 'Comissão em 3 meses seguidos', icone: Flame, ok: g.sequencia >= 3, falta: `${Math.max(0, 3 - g.sequencia)} mês(es) a mais` },
    { nome: 'Em dia', desc: 'Nenhum boleto em atraso', icone: Target, ok: g.atrasadas.length === 0 && g.ativos.length > 0, falta: 'Cobre os boletos em atraso' },
  ];

  let frase;
  if (g.atual === 0 && g.anterior === 0) frase = <>Feche um contrato e veja sua comissão aparecer aqui. Cada venda rende <b>{pctTxt}%</b> para você!</>;
  else if (diff > 0.5) frase = <><Rocket className="ico" /> Você está ganhando <b>{moeda(diff)}</b> a mais que em {mesLongo(passado.chave)}. Continue assim!</>;
  else if (diff < -0.5) frase = <><TrendingUp className="ico" /> Faltam <b>{moeda(-diff)}</b> para chegar no que você ganhou em {mesLongo(passado.chave)}. Bora fechar mais um!</>;
  else frase = <>Mesmo valor de {mesLongo(passado.chave)}. Um contrato a mais e você passa!</>;

  return (
    <>
      <Topo titulo="Meus ganhos" voltar="/app" />
      <main className="conteudo">
        <section className="ganhos-hero">
          <small>Sua comissão em {mesLongo(atual.chave)}</small>
          <b className="num">{moeda(g.atual)}</b>
          <Tendencia variacao={g.variacao} anterior={g.anterior} />
          <p className="frase">{frase}</p>
          {g.atual > 0 && g.atual >= recorde && g.serie.filter((m) => !m.futuro && m.certo > 0).length > 1 && (
            <span className="selo-recorde"><Trophy className="ico" /> Seu melhor mês!</span>
          )}
        </section>

        <div className="ganhos-tiles">
          <div><span>Mês passado</span><b className="num">{curto(g.anterior)}</b></div>
          <div><span>Já garantido em {mesLongo(proximo.chave)}</span><b className="num">{curto(proximo.certo)}</b></div>
          <div><span>Contratos ativos</span><b className="num">{g.ativos.length}</b></div>
        </div>
        {g.atrasadas.length > 0 && (
          <div className="alerta aviso">
            <b>{g.atrasadas.length === 1 ? '1 boleto em atraso' : `${g.atrasadas.length} boletos em atraso`}:</b>{' '}
            {g.atrasadas.slice(0, 3).map((p) => p.contrato.cliente_nome).join(', ')}. Se não for pago até o dia {DIA_CORTE}, essa comissão ({moeda(g.atrasadas.reduce((t, p) => t + p.comissao, 0))}) fica para o próximo mês.
          </div>
        )}
        {g.previstoMes > 0 && (
          <p className="dica-ganhos">+ {moeda(g.previstoMes)} entram neste mês quando os clientes assinarem os contratos que estão aguardando.</p>
        )}

        <div className="meta-ganhos">
          {g.recorde > 0 && g.atual < g.recorde ? (
            <>
              <div className="meta-topo"><Target className="ico" /> <span>Falta <b>{moeda(g.recorde - g.atual)}</b> para bater seu melhor mês ({moeda(g.recorde)})</span></div>
              <div className="meta-trilho"><i style={{ width: `${Math.min(100, (g.atual / g.recorde) * 100)}%` }} /></div>
            </>
          ) : (
            <div className="meta-topo"><Trophy className="ico" /> <span>Você está no seu melhor mês ou perto dele. Mantenha o ritmo!</span></div>
          )}
          {g.sequencia > 0 && (
            <div className="meta-topo"><Flame className="ico" /> <span>Sequência de <b>{g.sequencia} {g.sequencia === 1 ? 'mês' : 'meses'}</b> recebendo comissão</span></div>
          )}
        </div>

        <div className="secao-titulo"><h2><Medal className="ico" /> Conquistas</h2><span className="muted">{conquistas.filter((c) => c.ok).length}/{conquistas.length}</span></div>
        <div className="conquistas">
          {conquistas.map((c) => (
            <div key={c.nome} className={`conquista ${c.ok ? 'ok' : ''}`}>
              <span className="selo">{c.ok ? <c.icone size={20} /> : <Lock size={18} />}</span>
              <b>{c.nome}</b>
              <small>{c.ok ? c.desc : c.falta}</small>
            </div>
          ))}
        </div>

        <div className="secao-titulo"><h2>Mês a mês</h2></div>
        <div className="card grafico-ganhos">
          {g.serie.map((m) => {
            const total = m.certo + m.previsto;
            return (
              <div key={m.chave} className={`barra ${m.atual ? 'atual' : ''} ${m.futuro ? 'futuro' : ''}`}>
                <span className="valor">{total ? curto(total).replace('R$', '').trim() : ''}</span>
                <div className="trilho">
                  <i style={{ height: `${Math.max(2, (total / maior) * 100)}%` }}>
                    {m.previsto > 0 && <em style={{ height: `${(m.previsto / total) * 100}%` }} />}
                  </i>
                </div>
                <span className="mes">{m.atual ? 'hoje' : m.nome.split('/')[0]}</span>
              </div>
            );
          })}
        </div>
        <p className="muted legenda-ganhos"><span className="q forte" /> recebido <span className="q fraco" /> já garantido pelos contratos <span className="q claro" /> aguardando assinatura</p>

        <div className="secao-titulo"><h2><CalendarClock className="ico" /> Hora de renovar</h2><span className="muted">{g.vencendo.length}</span></div>
        {!g.vencendo.length ? (
          <div className="vazio">Nenhum contrato vence nos próximos 3 meses.</div>
        ) : (
          <div className="lista">
            {g.vencendo.map((c) => (
              <Link key={c.id} href={`/app/contratos/${c.id}`} className="item renovar">
                <div className="info">
                  <div className="nome">{c.cliente_nome}</div>
                  <div className="det">{c.radio?.nome} · {c.programa?.nome || 'Plano personalizado'} · até {data(c.data_fim)}</div>
                  <div className="det">Renovando, você continua ganhando <b>{moeda((Number(c.valor_mensal) * g.pct) / 100)}/mês</b></div>
                </div>
                <span className={`badge ${urgencia(c.data_fim)}`}>{faltaParaVencer(c.data_fim)}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="secao-titulo"><h2><FileCheck2 className="ico" /> Contratos que pagam você</h2><span className="muted">{g.ativos.length}</span></div>
        {!g.ativos.length ? (
          <div className="vazio">Nenhum contrato ativo ainda. O primeiro está logo ali!</div>
        ) : (
          <div className="lista">
            {g.ativos.map((c) => (
              <Link key={c.id} href={`/app/contratos/${c.id}`} className="item">
                <div className="info">
                  <div className="nome">{c.cliente_nome}</div>
                  <div className="det">{moeda(c.valor_mensal)}/mês · até {data(c.data_fim)}</div>
                </div>
                <span className="chip-ganho">+{moeda((Number(c.valor_mensal) * g.pct) / 100)}<small>/mês</small></span>
              </Link>
            ))}
          </div>
        )}
        <Link href="/app/contratos" className="btn cinza" style={{ width: '100%', marginTop: 14 }}>Ver todos os meus contratos</Link>
        <p className="muted" style={{ marginTop: 12, fontSize: '.85rem' }}>Você recebe {pctTxt}% de tudo o que vende. A comissão fecha todo dia {DIA_CORTE}: parcela paga até o dia {DIA_CORTE} entra no mês; paga depois, entra no mês seguinte.</p>
      </main>
    </>
  );
}

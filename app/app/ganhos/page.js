import Link from 'next/link';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import Tendencia from '@/components/Tendencia';
import { calcularGanhos, conquistasDe, DIA_CORTE } from '@/lib/ganhos';
import { moeda } from '@/lib/format';
import { CalendarClock, FileCheck2, Flame, Medal, Rocket, Target, TrendingUp, Trophy } from 'lucide-react';

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
  const diff = g.atual - g.anterior;
  const pctTxt = String(g.pct).replace('.', ',');
  const conquistas = conquistasDe(g);
  const ganhas = conquistas.filter((c) => c.ok).length;

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
          {g.atual > 0 && g.atual >= g.recorde && g.serie.filter((m) => !m.futuro && m.certo > 0).length > 1 && (
            <span className="selo-recorde"><Trophy className="ico" /> Seu melhor mês!</span>
          )}
        </section>

        <div className="ganhos-tiles">
          <div><span>Mês passado</span><b className="num">{curto(g.anterior)}</b></div>
          <div><span>Garantidos em {mesLongo(proximo.chave)}</span><b className="num">{curto(proximo.certo)}</b></div>
          <div><span>Contratos ativos</span><b className="num">{g.ativos.length}</b></div>
        </div>

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

        {g.atrasadas.length > 0 && (
          <div className="alerta aviso">
            <b>{g.atrasadas.length === 1 ? '1 boleto em atraso' : `${g.atrasadas.length} boletos em atraso`}:</b>{' '}
            {g.atrasadas.slice(0, 3).map((p) => p.contrato.cliente_nome).join(', ')}. Se não for pago até o dia {DIA_CORTE}, essa comissão ({moeda(g.atrasadas.reduce((t, p) => t + p.comissao, 0))}) fica para o próximo mês.
          </div>
        )}
        {g.previstoMes > 0 && (
          <p className="dica-ganhos">+ {moeda(g.previstoMes)} entram neste mês quando os clientes assinarem os contratos que estão aguardando.</p>
        )}

        <div className="acoes-ganhos">
          <Link href="/app/ganhos/conquistas" className={`acao-ganho ouro ${ganhas > 0 ? 'ativo' : ''}`}>
            <span className="acao-ico"><Medal size={22} /></span>
            <b>Conquistas</b>
            <small>{ganhas} de {conquistas.length} desbloqueadas</small>
          </Link>
          <Link href="/app/ganhos/renovar" className={`acao-ganho ${g.vencendo.length > 0 ? 'alerta-r' : ''}`}>
            <span className="acao-ico"><CalendarClock size={22} /></span>
            <b>Hora de renovar</b>
            <small>{g.vencendo.length ? `${g.vencendo.length} vencendo em breve` : 'Nenhum vencendo'}</small>
          </Link>
          <Link href="/app/ganhos/contratos" className="acao-ganho">
            <span className="acao-ico"><FileCheck2 size={22} /></span>
            <b>Contratos que pagam você</b>
            <small>{g.ativos.length} ativos</small>
          </Link>
        </div>

        <div className="secao-titulo"><h2>Mês a mês</h2></div>
        <div className="card grafico-ganhos">
          {g.serie.map((m) => {
            const total = m.certo + m.previsto;
            return (
              <div key={m.chave} className={`coluna-mes ${m.atual ? 'atual' : ''} ${m.futuro ? 'futuro' : ''}`}>
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
        <div className="legenda-ganhos">
          <span><i className="q forte" /> recebido</span>
          <span><i className="q fraco" /> garantido</span>
          <span><i className="q claro" /> aguardando assinatura</span>
        </div>

        <p className="muted" style={{ marginTop: 14, fontSize: '.85rem' }}>Você recebe {pctTxt}% de tudo o que vende. A comissão fecha todo dia {DIA_CORTE}: parcela paga até o dia {DIA_CORTE} entra no mês; paga depois, entra no mês seguinte.</p>
      </main>
    </>
  );
}

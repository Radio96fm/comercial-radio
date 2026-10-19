import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import { calcularGanhos, conquistasDe, faltaParaVencer } from '@/lib/ganhos';
import { data, moeda } from '@/lib/format';
import { Lock, Medal, Rocket, Star, Flame, Target, Trophy } from 'lucide-react';

const ICONES = [Star, Medal, Trophy, Rocket, Flame, Target];
const TITULOS = { conquistas: 'Conquistas', renovar: 'Hora de renovar', contratos: 'Contratos que pagam você' };

export default async function SecaoGanhos({ params }) {
  if (!TITULOS[params.secao]) notFound();
  const { supabase, perfil } = await getSessao();
  const g = await calcularGanhos(supabase, perfil);

  return (
    <>
      <Topo titulo={TITULOS[params.secao]} voltar="/app/ganhos" />
      <main className="conteudo">
        {params.secao === 'conquistas' && (
          <>
            <p className="muted">{conquistasDe(g).filter((c) => c.ok).length} de {conquistasDe(g).length} desbloqueadas</p>
            <div className="conquistas grande">
              {conquistasDe(g).map((c, i) => {
                const Icone = ICONES[i];
                return (
                  <div key={c.nome} className={`conquista ${c.ok ? 'ok' : ''}`}>
                    <span className="selo">{c.ok ? <Icone size={20} /> : <Lock size={18} />}</span>
                    <b>{c.nome}</b>
                    <small>{c.ok ? c.desc : c.falta}</small>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {params.secao === 'renovar' && (
          !g.vencendo.length ? (
            <div className="vazio">Nenhum contrato vencendo em breve. Avisamos aqui 45 dias antes do fim de contratos de até 3 meses, e 60 dias antes dos demais.</div>
          ) : (
            <div className="lista">
              {g.vencendo.map((c) => (
                <Link key={c.id} href={`/app/contratos/${c.id}`} className="item renovar">
                  <div className="info">
                    <div className="nome">{c.cliente_nome}</div>
                    <div className="det">{c.radio?.nome} · {c.programa?.nome || 'Plano personalizado'} · até {data(c.data_fim)}</div>
                    <div className="det">Renovando, você continua ganhando <b>{moeda((Number(c.valor_mensal) * g.pct) / 100)}/mês</b></div>
                  </div>
                  <span className="badge b-vermelho">{faltaParaVencer(c.data_fim)}</span>
                </Link>
              ))}
            </div>
          )
        )}

        {params.secao === 'contratos' && (
          !g.ativos.length ? (
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
          )
        )}
      </main>
    </>
  );
}

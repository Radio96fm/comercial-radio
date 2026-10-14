import Link from 'next/link';
import { Users, PenLine, Car, Hourglass, History, ArrowUpRight, TrendingUp } from 'lucide-react';
import { requireGestor } from '@/lib/auth';
import { marcaDaRadio } from '@/lib/marca';
import { data, dataHora, tempoDesde, horario, hojeISO, somarDias, statusPrograma } from '@/lib/format';

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function saudacao() {
  const h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default async function Dashboard() {
  const { supabase } = await requireGestor();
  const hoje = hojeISO();
  const em30 = somarDias(hoje, 30);
  const inicioSerie = `${somarDias(`${hoje.slice(0, 8)}01`, -150).slice(0, 8)}01`;

  const [{ data: radios }, { data: programas }, { data: vencendo }, { data: visitas }, { data: pendentes }, { count: totalClientes }, { count: totalVendedores }, { data: atividades }, { data: visitasSerie }, { count: clientesNovos }] = await Promise.all([
    supabase.from('radios').select('id, nome, cor, slogan').order('ordem'),
    supabase.from('programas_ocupacao').select('*').eq('ativo', true).order('horario_inicio', { nullsFirst: false }),
    supabase.from('contratos').select('id, numero, data_fim, cliente:clientes(nome), programa:programas(nome), vendedor:profiles(nome)')
      .in('status', ['ativo', 'pendente']).gte('data_fim', hoje).lte('data_fim', em30).order('data_fim'),
    supabase.from('visitas').select('id, iniciada_em, cliente:clientes(nome), vendedor:profiles(nome)').eq('status', 'em_andamento').order('iniciada_em', { ascending: false }),
    supabase.from('contratos').select('id').eq('status', 'pendente'),
    supabase.from('clientes').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('papel', 'vendedor').eq('ativo', true),
    supabase.from('atividades').select('id, descricao, created_at, usuario:profiles(nome)').order('created_at', { ascending: false }).limit(6),
    supabase.from('visitas').select('iniciada_em, vendedor_id, vendedor:profiles(nome)').gte('iniciada_em', inicioSerie),
    supabase.from('clientes').select('id', { count: 'exact', head: true }).gte('created_at', `${somarDias(hoje, -30)}T00:00:00`),
  ]);

  const progs = programas || [];
  const totalCotas = progs.reduce((s, p) => s + p.cotas_total, 0);
  const ocupadas = progs.reduce((s, p) => s + p.cotas_ocupadas, 0);
  const pctOcup = totalCotas ? Math.round((ocupadas / totalCotas) * 100) : 0;
  const desde30 = `${somarDias(hoje, -30)}T00:00:00`;
  const visitas30 = (visitasSerie || []).filter((v) => v.iniciada_em >= desde30);
  const ranking = Object.values(visitas30.reduce((acc, v) => {
    const k = v.vendedor_id;
    acc[k] = acc[k] || { nome: v.vendedor?.nome || 'Vendedor', qtd: 0 };
    acc[k].qtd += 1;
    return acc;
  }, {})).sort((x, y) => y.qtd - x.qtd).slice(0, 3);

  // visitas dos últimos 6 meses
  const serie = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(`${hoje.slice(0, 7)}-15T12:00:00`);
    d.setMonth(d.getMonth() - (5 - i));
    const chave = d.toISOString().slice(0, 7);
    return { chave, rotulo: MES[d.getMonth()], valor: (visitasSerie || []).filter((v) => v.iniciada_em.slice(0, 7) === chave).length };
  });
  const maxSerie = Math.max(1, ...serie.map((s) => s.valor));
  const atual = serie[5], anterior = serie[4];
  const variacao = anterior.valor ? Math.round(((atual.valor - anterior.valor) / anterior.valor) * 100) : null;
  const dataLonga = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (l) => l.toUpperCase());

  return (
    <>
      <div className="saudacao-g">
        <small>{dataLonga}</small>
        <h1>{saudacao()}! Veja como está a equipe</h1>
      </div>

      <div className="bento">
        <div className="b-card b-hero">
          <div className="b-eyebrow">Visitas a clientes nos últimos 30 dias</div>
          <div className="b-gigante num">{visitas30.length}</div>
          <div className="b-sub">{clientesNovos || 0} clientes novos cadastrados no período</div>
          <div className="b-chips">
            {ranking.map((v, i) => (
              <span key={v.nome} className="chip-r"><span className="pos">{i + 1}º</span>{v.nome.split(' ')[0]}<b>{v.qtd} visita{v.qtd > 1 ? 's' : ''}</b></span>
            ))}
            {!ranking.length && <span className="chip-r">Nenhuma visita registrada ainda</span>}
          </div>
        </div>

        <div className="b-card b-claro">
          <div className="b-eyebrow">Cotas ocupadas hoje</div>
          <div className="b-gigante num">{ocupadas}<span>/{totalCotas}</span></div>
          <div className="seg-bar">
            {(radios || []).map((r) => {
              const oc = progs.filter((p) => p.radio_id === r.id).reduce((s, p) => s + p.cotas_ocupadas, 0);
              return <span key={r.id} style={{ width: `${totalCotas ? (oc / totalCotas) * 100 : 0}%`, background: r.cor }} />;
            })}
          </div>
          <div className="b-sub"><b>{pctOcup}%</b> da grade vendida · {totalCotas - ocupadas} cotas livres</div>
        </div>

        <div className="b-minis">
          <Link href="/gestao/contratos" className="b-card b-mini">
            <PenLine className="ico" /><div><b className="num">{pendentes?.length || 0}</b><span>aguardando assinatura</span></div>
          </Link>
          <div className="b-card b-mini">
            <Car className="ico" /><div><b className="num">{visitas?.length || 0}</b><span>vendedores em visita</span></div>
          </div>
          <Link href="/gestao/clientes" className="b-card b-mini">
            <Users className="ico" /><div><b className="num">{totalClientes || 0}</b><span>clientes · {totalVendedores || 0} vendedores</span></div>
          </Link>
        </div>

        <div className="b-card b-grafico">
          <div className="b-topo">
            <div>
              <div className="b-eyebrow">Visitas por mês</div>
              <div className="b-medio num">{atual.valor} visitas</div>
              <div className="b-sub">feitas pelos vendedores em {atual.rotulo}</div>
            </div>
            {variacao !== null && (
              <span className={`var-chip ${variacao >= 0 ? 'sobe' : 'desce'}`}><TrendingUp size={14} />{variacao >= 0 ? '+' : ''}{variacao}%</span>
            )}
          </div>
          <div className="barras">
            {serie.map((s, i) => (
              <div key={s.chave} className={`col ${i === 5 ? 'atual' : ''}`} title={`${s.rotulo}: ${s.valor} visitas`}>
                <small>{s.valor || ''}</small>
                <span style={{ height: `${Math.max(4, (s.valor / maxSerie) * 100)}%` }} />
                <em>{s.rotulo}</em>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="grade-emissoras">
        {(radios || []).map((r) => {
          const itens = progs.filter((p) => p.radio_id === r.id);
          const marca = marcaDaRadio(r.nome);
          return (
            <section key={r.id} className="emissora-g" style={{ '--cor': r.cor, '--cor2': marca.cor2 || r.cor }}>
              <header>
                {marca.logo && <img src={marca.logo} alt="" />}
                <div><b>{r.nome}</b><small>{itens.reduce((t, p) => t + p.cotas_ocupadas, 0)} de {itens.reduce((t, p) => t + p.cotas_total, 0)} cotas ocupadas</small></div>
                <Link href={`/gestao/programas?radio=${r.id}`} className="abrir" aria-label={`Gerenciar ${r.nome}`}><ArrowUpRight size={20} /></Link>
              </header>
              <div className="progs-ocup">
                {itens.map((p) => {
                  const st = statusPrograma(p.cotas_livres, p.cotas_total);
                  return (
                    <Link key={p.id} href={`/gestao/programas?editar=${p.id}`} className="po-linha">
                      <div className="po-nome"><b>{p.nome}</b><small>{horario(p) || p.dias}</small></div>
                      <div className="pilulas">
                        {Array.from({ length: p.cotas_total }, (_, i) => <i key={i} className={i < p.cotas_ocupadas ? 'cheia' : ''} />)}
                      </div>
                      <span className={`po-status s-${st.cor}`}>{p.cotas_livres > 0 ? `${p.cotas_livres} livre${p.cotas_livres > 1 ? 's' : ''}` : 'Lotado'}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="grade-listas">
        <div className="b-card b-lista">
          <div className="b-topo"><h2><Hourglass className="ico" />Vencendo em 30 dias</h2><span className="contador">{vencendo?.length || 0}</span></div>
          {!vencendo?.length ? <p className="muted">Nenhum contrato vencendo.</p> : (
            <div className="linhas-g">
              {vencendo.slice(0, 6).map((c) => (
                <Link key={c.id} href={`/app/contratos/${c.id}`} className="linha-g">
                  <div><b>{c.cliente?.nome}</b><small>{c.programa?.nome || 'Pacote avulso'} · {c.vendedor?.nome}</small></div>
                  <span className="badge b-amarelo">{data(c.data_fim)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="b-card b-lista">
          <div className="b-topo"><h2><Car className="ico" />Em visitação agora</h2><span className="contador">{visitas?.length || 0}</span></div>
          {!visitas?.length ? <p className="muted">Ninguém em visita agora.</p> : (
            <div className="linhas-g">
              {visitas.map((v) => (
                <Link key={v.id} href={`/gestao/visitas/${v.id}`} className="linha-g">
                  <div><b>{v.cliente?.nome}</b><small>{v.vendedor?.nome}</small></div>
                  <span className="badge b-verde">{tempoDesde(v.iniciada_em)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="b-card b-lista">
          <div className="b-topo"><h2><History className="ico" />Últimas atividades</h2><Link href="/gestao/atividades" className="ver-tudo">Ver tudo ›</Link></div>
          {!atividades?.length ? <p className="muted">Nada ainda.</p> : (
            <div className="linhas-g">
              {atividades.map((a) => (
                <div key={a.id} className="linha-g">
                  <div><b className="fino">{a.descricao}</b><small>{a.usuario?.nome || 'Sistema'} · {dataHora(a.created_at)}</small></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

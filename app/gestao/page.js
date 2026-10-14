import Link from 'next/link';
import { Radio, Users, PenLine, Car, Hourglass, History } from 'lucide-react';
import { requireGestor } from '@/lib/auth';
import { FaixaRadio } from '@/components/gestao/RadiosGestao';
import { data, dataHora, tempoDesde, horario, hojeISO, somarDias, statusPrograma } from '@/lib/format';

export default async function Dashboard() {
  const { supabase } = await requireGestor();
  const hoje = hojeISO();
  const em30 = somarDias(hoje, 30);

  const [{ data: radios }, { data: programas }, { data: vencendo }, { data: visitas }, { data: pendentes }, { count: totalClientes }, { count: totalVendedores }, { data: atividades }] = await Promise.all([
    supabase.from('radios').select('id, nome, cor, slogan').order('ordem'),
    supabase.from('programas_ocupacao').select('*').eq('ativo', true).order('horario_inicio', { nullsFirst: false }),
    supabase.from('contratos').select('id, numero, data_fim, cliente:clientes(nome), programa:programas(nome), vendedor:profiles(nome)')
      .in('status', ['ativo', 'pendente']).gte('data_fim', hoje).lte('data_fim', em30).order('data_fim'),
    supabase.from('visitas').select('id, iniciada_em, cliente:clientes(nome), vendedor:profiles(nome)').eq('status', 'em_andamento').order('iniciada_em', { ascending: false }),
    supabase.from('contratos').select('id', { count: 'exact' }).eq('status', 'pendente'),
    supabase.from('clientes').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('papel', 'vendedor').eq('ativo', true),
    supabase.from('atividades').select('id, descricao, created_at, usuario:profiles(nome)').order('created_at', { ascending: false }).limit(6),
  ]);

  const totalCotas = (programas || []).reduce((s, p) => s + p.cotas_total, 0);
  const ocupadas = (programas || []).reduce((s, p) => s + p.cotas_ocupadas, 0);

  return (
    <>
      <div className="cabecalho"><h1>Visão geral</h1></div>

      <div className="kpis">
        <div className="kpi destaque">
          <div className="kpi-topo">Cotas ocupadas hoje<Radio className="ico" /></div>
          <div className="valor">{ocupadas}<span style={{ opacity: .45 }}>/{totalCotas}</span></div>
          <div className="barra"><span style={{ width: `${totalCotas ? (ocupadas / totalCotas) * 100 : 0}%` }} /></div>
        </div>
        <div className="kpi">
          <div className="kpi-topo">Clientes na base<Users className="ico" /></div>
          <div className="valor">{totalClientes || 0}</div>
          <div className="rotulo">{totalVendedores || 0} vendedores ativos</div>
        </div>
        <div className="kpi">
          <div className="kpi-topo">Aguardando assinatura<PenLine className="ico" /></div>
          <div className="valor">{pendentes?.length || 0}</div>
          <div className="rotulo">contratos</div>
        </div>
        <div className="kpi">
          <div className="kpi-topo">Em visita agora<Car className="ico" /></div>
          <div className="valor">{visitas?.length || 0}</div>
          <div className="rotulo">vendedores na rua</div>
        </div>
      </div>

      {(radios || []).map((r) => ({ r, itens: (programas || []).filter((p) => p.radio_id === r.id) })).map(({ r, itens }) => (
        <div key={r.id} style={{ marginBottom: 22 }}>
          <FaixaRadio radio={r}>
            <span><b>{itens.reduce((t, p) => t + p.cotas_ocupadas, 0)}/{itens.reduce((t, p) => t + p.cotas_total, 0)}</b> cotas ocupadas</span>
            <Link href={`/gestao/programas?radio=${r.id}`} className="btn peq">Gerenciar ›</Link>
          </FaixaRadio>
          <div className="tabela">
            <table>
              <thead><tr><th>Programa</th><th>Horário</th><th>Ocupação</th><th>Situação</th></tr></thead>
              <tbody>
                {itens.map((p) => {
                  const st = statusPrograma(p.cotas_livres, p.cotas_total);
                  const pct = p.cotas_total ? (p.cotas_ocupadas / p.cotas_total) * 100 : 100;
                  return (
                    <tr key={p.id}>
                      <td><Link href={`/gestao/programas?editar=${p.id}`} className="link-forte"><b>{p.nome}</b></Link></td>
                      <td>{p.dias}<br /><small>{horario(p)}</small></td>
                      <td style={{ minWidth: 140 }}>
                        {p.cotas_ocupadas} de {p.cotas_total}
                        <div className="barra" style={{ marginTop: 4 }}><span style={{ width: `${pct}%`, background: st.cor === 'vermelho' ? 'var(--vermelho)' : r.cor }} /></div>
                      </td>
                      <td><span className={`badge b-${st.cor}`}>{st.texto}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
        <div className="card">
          <h2 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Hourglass className="ico" style={{ color: 'var(--accent)' }} />Vencendo em 30 dias</h2>
          {!vencendo?.length ? <p className="muted">Nenhum.</p> : (
            <div className="lista">
              {vencendo.map((c) => (
                <Link key={c.id} href={`/app/contratos/${c.id}`} className="item plano">
                  <div className="info">
                    <div className="nome">{c.cliente?.nome}</div>
                    <div className="det">{c.programa?.nome || 'Pacote avulso'} · {c.vendedor?.nome}</div>
                  </div>
                  <span className="badge b-amarelo">{data(c.data_fim)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h2 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Car className="ico" style={{ color: 'var(--accent)' }} />Em visitação agora</h2>
          {!visitas?.length ? <p className="muted">Ninguém em visita.</p> : (
            <div className="lista">
              {visitas.map((v) => (
                <Link key={v.id} href={`/app/visitas/${v.id}`} className="item plano">
                  <div className="info">
                    <div className="nome">{v.cliente?.nome}</div>
                    <div className="det">{v.vendedor?.nome} · {tempoDesde(v.iniciada_em)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h2 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><History className="ico" style={{ color: 'var(--accent)' }} />Últimas atividades</h2>
          {!atividades?.length ? <p className="muted">Nada ainda.</p> : (
            <div>
              {atividades.map((a) => (
                <div key={a.id} className="linha-atividade">
                  <div>{a.descricao}</div>
                  <small>{a.usuario?.nome || 'Sistema'} · {dataHora(a.created_at)}</small>
                </div>
              ))}
              <Link href="/gestao/atividades" style={{ display: 'block', marginTop: 10 }}>Ver histórico completo ›</Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

import Link from 'next/link';
import { requireGestor } from '@/lib/auth';
import { data, dataHora, moeda, tempoDesde, horario, hojeISO, somarDias, statusPrograma } from '@/lib/format';

export default async function Dashboard() {
  const { supabase } = await requireGestor();
  const hoje = hojeISO();
  const em30 = somarDias(hoje, 30);

  const [{ data: programas }, { data: vencendo }, { data: visitas }, { data: pendentes }, { data: ativos }, { data: atividades }] = await Promise.all([
    supabase.from('programas_ocupacao').select('*').eq('ativo', true).order('radio_nome').order('horario_inicio'),
    supabase.from('contratos').select('id, numero, data_fim, cliente:clientes(nome), programa:programas(nome), vendedor:profiles(nome)')
      .in('status', ['ativo', 'pendente']).gte('data_fim', hoje).lte('data_fim', em30).order('data_fim'),
    supabase.from('visitas').select('id, iniciada_em, cliente:clientes(nome), vendedor:profiles(nome)').eq('status', 'em_andamento').order('iniciada_em', { ascending: false }),
    supabase.from('contratos').select('id', { count: 'exact' }).eq('status', 'pendente'),
    supabase.from('contratos').select('valor_mensal').eq('status', 'ativo').lte('data_inicio', hoje).gte('data_fim', hoje),
    supabase.from('atividades').select('id, descricao, created_at, usuario:profiles(nome)').order('created_at', { ascending: false }).limit(12),
  ]);

  const totalCotas = (programas || []).reduce((s, p) => s + p.cotas_total, 0);
  const ocupadas = (programas || []).reduce((s, p) => s + p.cotas_ocupadas, 0);
  const receita = (ativos || []).reduce((s, c) => s + Number(c.valor_mensal), 0);

  const porRadio = {};
  (programas || []).forEach((p) => {
    porRadio[p.radio_nome] = porRadio[p.radio_nome] || { cor: p.radio_cor, itens: [] };
    porRadio[p.radio_nome].itens.push(p);
  });

  return (
    <>
      <div className="cabecalho"><h1>Visão geral</h1><span className="muted">Atualiza sozinho</span></div>

      <div className="kpis">
        <div className="kpi"><div className="valor">{ocupadas}/{totalCotas}</div><div className="rotulo">Cotas ocupadas hoje</div></div>
        <div className="kpi"><div className="valor">{moeda(receita)}</div><div className="rotulo">Receita mensal (contratos ativos)</div></div>
        <div className="kpi"><div className="valor">{pendentes?.length || 0}</div><div className="rotulo">Aguardando assinatura</div></div>
        <div className="kpi"><div className="valor">{visitas?.length || 0}</div><div className="rotulo">Visitas em andamento</div></div>
      </div>

      {Object.entries(porRadio).map(([radio, g]) => (
        <div key={radio} style={{ marginBottom: 18 }}>
          <h2 style={{ color: g.cor }}>{radio}</h2>
          <div className="tabela">
            <table>
              <thead><tr><th>Programa</th><th>Horário</th><th>Ocupação</th><th>Situação</th></tr></thead>
              <tbody>
                {g.itens.map((p) => {
                  const st = statusPrograma(p.cotas_livres, p.cotas_total);
                  const pct = p.cotas_total ? (p.cotas_ocupadas / p.cotas_total) * 100 : 100;
                  return (
                    <tr key={p.id}>
                      <td><Link href={`/app/programa/${p.id}`}><b>{p.nome}</b></Link></td>
                      <td>{p.dias}<br /><small>{horario(p)}</small></td>
                      <td style={{ minWidth: 140 }}>
                        {p.cotas_ocupadas} de {p.cotas_total}
                        <div className="barra" style={{ marginTop: 4 }}><span style={{ width: `${pct}%` }} /></div>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div className="card">
          <h2>⏳ Contratos vencendo em 30 dias</h2>
          {!vencendo?.length ? <p className="muted">Nenhum.</p> : (
            <div className="lista">
              {vencendo.map((c) => (
                <Link key={c.id} href={`/app/contratos/${c.id}`} className="item" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
                  <div className="info">
                    <div className="nome">{c.cliente?.nome}</div>
                    <div className="det">{c.programa?.nome} · {c.vendedor?.nome}</div>
                  </div>
                  <span className="badge b-amarelo">{data(c.data_fim)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h2>🚗 Em visitação agora</h2>
          {!visitas?.length ? <p className="muted">Ninguém em visita.</p> : (
            <div className="lista">
              {visitas.map((v) => (
                <Link key={v.id} href={`/app/visitas/${v.id}`} className="item" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
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
          <h2>🕓 Últimas atividades</h2>
          {!atividades?.length ? <p className="muted">Nada ainda.</p> : (
            <div>
              {atividades.map((a) => (
                <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
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

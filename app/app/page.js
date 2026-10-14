import Link from 'next/link';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import { tempoDesde } from '@/lib/format';

export default async function HomeVendedor() {
  const { supabase, perfil, isGestor } = await getSessao();

  const [{ data: radios }, { data: ocupacao }, { data: visitas }] = await Promise.all([
    supabase.from('radios').select('id, nome, slogan, cor').order('ordem'),
    supabase.from('programas_ocupacao').select('radio_id, cotas_livres').eq('ativo', true),
    supabase
      .from('visitas')
      .select('id, iniciada_em, vendedor_id, cliente:clientes(nome), vendedor:profiles(nome)')
      .eq('status', 'em_andamento')
      .order('iniciada_em', { ascending: false })
      .limit(5),
  ]);

  const livresPorRadio = {};
  (ocupacao || []).forEach((p) => {
    livresPorRadio[p.radio_id] = livresPorRadio[p.radio_id] || { programas: 0, comVaga: 0 };
    livresPorRadio[p.radio_id].programas += 1;
    if (p.cotas_livres > 0) livresPorRadio[p.radio_id].comVaga += 1;
  });

  const primeiroNome = perfil.nome.split(' ')[0];

  return (
    <>
      <Topo
        titulo={`Olá, ${primeiroNome}!`}
        direita={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {isGestor && <Link href="/gestao" className="badge b-azul">Painel</Link>}
            <form action="/sair" method="post"><button className="btn peq cinza">Sair</button></form>
          </div>
        }
      />
      <main className="conteudo">
        <p className="muted" style={{ fontSize: '1rem' }}>Escolha a rádio para ver os programas:</p>

        {(radios || []).map((r) => {
          const info = livresPorRadio[r.id] || { programas: 0, comVaga: 0 };
          return (
            <Link key={r.id} href={`/app/radio/${r.id}`} className="radio-btn" style={{ background: r.cor }}>
              <div>
                <div className="nome">{r.nome}</div>
                <div className="sub">
                  {info.programas} programas · {info.comVaga} com vaga
                </div>
              </div>
              <span className="seta">›</span>
            </Link>
          );
        })}

        <Link href="/app/visitas/nova" className="btn grande verde" style={{ marginBottom: 8 }}>
          🚗 Estou visitando um cliente
        </Link>

        <div className="secao-titulo">
          <h2>Em visitação agora</h2>
          <Link href="/app/visitas">Ver todas ›</Link>
        </div>
        {!visitas?.length ? (
          <div className="vazio">Ninguém registrou visita no momento.</div>
        ) : (
          <div className="lista">
            {visitas.map((v) => (
              <Link key={v.id} href={`/app/visitas/${v.id}`} className="item">
                <span style={{ fontSize: '1.5rem' }}>🚗</span>
                <div className="info">
                  <div className="nome">{v.cliente?.nome}</div>
                  <div className="det">
                    {v.vendedor_id === perfil.id ? 'Você' : v.vendedor?.nome} · {tempoDesde(v.iniciada_em)}
                  </div>
                </div>
                <span className="seta">›</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

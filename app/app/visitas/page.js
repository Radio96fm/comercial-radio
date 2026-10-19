import Link from 'next/link';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import { tempoDesde, dataHora, STATUS_VISITA } from '@/lib/format';
import { prazoVisita, textoRestam } from '@/lib/prazo';

const COR = { em_andamento: 'b-azul', proposta: 'b-amarelo', fechado: 'b-verde', perdido: 'b-cinza' };

export default async function Visitas() {
  const { supabase, perfil } = await getSessao();
  const [{ data: agora }, { data: minhas }] = await Promise.all([
    supabase
      .from('visitas')
      .select('id, iniciada_em, prazo_extra_dias, vendedor_id, status, cliente:clientes(nome, segmento:segmentos(nome)), vendedor:profiles(nome)')
      .in('status', ['em_andamento', 'proposta'])
      .order('iniciada_em', { ascending: false }),
    supabase
      .from('visitas')
      .select('id, iniciada_em, status, cliente:clientes(nome)')
      .eq('vendedor_id', perfil.id)
      .in('status', ['fechado', 'perdido'])
      .order('iniciada_em', { ascending: false })
      .limit(20),
  ]);

  return (
    <>
      <Topo titulo="Visitas" voltar="/app" />
      <main className="conteudo">
        <Link href="/app/visitas/nova" className="btn grande verde">Registrar nova visita</Link>

        <div className="secao-titulo"><h2>Em andamento (toda a equipe)</h2></div>
        {!agora?.length ? (
          <div className="vazio">Nenhuma visita em andamento.</div>
        ) : (
          <div className="lista">
            {agora.map((v) => (
              <Link key={v.id} href={`/app/visitas/${v.id}`} className="item">
                <div className="info">
                  <div className="nome">{v.cliente?.nome}</div>
                  <div className="det">{v.cliente?.segmento?.nome}</div>
                  <div className="det">
                    <b>{v.vendedor_id === perfil.id ? 'Você' : v.vendedor?.nome}</b> · {tempoDesde(v.iniciada_em)}
                  </div>
                  {(() => { const p = prazoVisita(v.iniciada_em, v.prazo_extra_dias); return <div className={`det prazo-linha ${p.avisar ? 'alerta-p' : ''}`}>Exclusividade: {textoRestam(p.restam)}{p.restam > 0 ? ` (até ${p.ate})` : ''}</div>; })()}
                </div>
                <span className={`badge ${COR[v.status]}`}>{STATUS_VISITA[v.status]}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="secao-titulo"><h2>Minhas visitas encerradas</h2></div>
        {!minhas?.length ? (
          <div className="vazio">Nenhuma ainda.</div>
        ) : (
          <div className="lista">
            {minhas.map((v) => (
              <Link key={v.id} href={`/app/visitas/${v.id}`} className="item">
                <div className="info">
                  <div className="nome">{v.cliente?.nome}</div>
                  <div className="det">{dataHora(v.iniciada_em)}</div>
                </div>
                <span className={`badge ${COR[v.status]}`}>{STATUS_VISITA[v.status]}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

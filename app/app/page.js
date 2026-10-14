import Link from 'next/link';
import { getSessao } from '@/lib/auth';
import { ArrowUpRight, Car, ChevronRight, LogOut } from 'lucide-react';
import { tempoDesde } from '@/lib/format';
import { marcaDaRadio } from '@/lib/marca';

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
    livresPorRadio[p.radio_id] = livresPorRadio[p.radio_id] || { programas: 0, comVaga: 0, cotas: 0 };
    livresPorRadio[p.radio_id].programas += 1;
    livresPorRadio[p.radio_id].cotas += p.cotas_livres;
    if (p.cotas_livres > 0) livresPorRadio[p.radio_id].comVaga += 1;
  });

  const primeiroNome = perfil.nome.split(' ')[0];

  return (
    <>
      <main className="conteudo">
        <div className="ola">
          <span className="avatar">{primeiroNome[0]}</span>
          <div className="txt"><small>Bom trabalho,</small><b>{primeiroNome}</b></div>
          {isGestor && <Link href="/gestao" className="btn peq cinza">Painel</Link>}
          <form action="/sair" method="post">
            <button className="btn peq cinza" aria-label="Sair"><LogOut className="ico" /></button>
          </form>
        </div>

        <p className="rotulo-secao">Escolha a rádio</p>
        {(radios || []).map((r) => {
          const info = livresPorRadio[r.id] || { programas: 0, comVaga: 0, cotas: 0 };
          const marca = marcaDaRadio(r.nome);
          return (
            <Link key={r.id} href={`/app/radio/${r.id}`} className="radio-btn" style={{ '--cor': r.cor, '--cor2': marca.cor2 || r.cor }}>
              <div className="topo-r">
                {marca.logo && <img src={marca.logo} alt="" className="logo-r" />}
                <div className="nome">{r.nome}</div>
                <span className="seta"><ArrowUpRight size={24} strokeWidth={2.4} /></span>
              </div>
              <div className="numeros">
                <div><b>{info.programas}</b><span>programas</span></div>
                <div><b>{info.comVaga}</b><span>com vaga</span></div>
                <div><b>{info.cotas}</b><span>cotas livres</span></div>
              </div>
            </Link>
          );
        })}

        <Link href="/app/visitas/nova" className="btn grande" style={{ marginTop: 6 }}>
          <Car className="ico" strokeWidth={2.4} /> Estou visitando um cliente
        </Link>

        <div className="secao-titulo">
          <h2>Em visitação agora</h2>
          <Link href="/app/visitas">Ver todas</Link>
        </div>
        {!visitas?.length ? (
          <div className="vazio">Ninguém registrou visita no momento.</div>
        ) : (
          <div className="lista">
            {visitas.map((v) => (
              <Link key={v.id} href={`/app/visitas/${v.id}`} className="item">
                <span className="icone-redondo"><Car size={20} /></span>
                <div className="info">
                  <div className="nome">{v.cliente?.nome}</div>
                  <div className="det">
                    {v.vendedor_id === perfil.id ? 'Você' : v.vendedor?.nome} · {tempoDesde(v.iniciada_em)}
                  </div>
                </div>
                <ChevronRight className="seta" size={20} />
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import { ChevronRight } from 'lucide-react';
import { horario, statusPrograma } from '@/lib/format';

export default async function RadioPage({ params }) {
  const { supabase } = await getSessao();
  const { data: radio } = await supabase.from('radios').select('*').eq('id', params.id).maybeSingle();
  if (!radio) notFound();

  const { data: programas } = await supabase
    .from('programas_ocupacao')
    .select('*')
    .eq('radio_id', radio.id)
    .eq('ativo', true)
    .order('horario_inicio', { ascending: true, nullsFirst: false });

  return (
    <>
      <Topo titulo={radio.nome} voltar="/app" cor={radio.cor} />
      <main className="conteudo">
        <div className="tags" style={{ marginBottom: 14 }}>
          <span className="badge b-verde"><span className="bolinha verde" />Tem vaga</span>
          <span className="badge b-amarelo"><span className="bolinha amarelo" />Última vaga</span>
          <span className="badge b-vermelho"><span className="bolinha vermelho" />Lotado</span>
        </div>
        {!programas?.length && <div className="vazio">Nenhum programa cadastrado nesta rádio.</div>}
        <div className="lista">
          {(programas || []).map((p) => {
            const st = statusPrograma(p.cotas_livres, p.cotas_total);
            return (
              <Link key={p.id} href={`/app/programa/${p.id}`} className="item">
                <span className={`bolinha ${st.cor}`} />
                <div className="info">
                  <div className="nome">{p.nome}</div>
                  <div className="det">{p.dias} · {horario(p)}</div>
                </div>
                <span className={`badge b-${st.cor}`}>{st.texto}</span>
                <ChevronRight className="seta" size={20} />
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}

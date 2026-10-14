import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import { ChevronRight } from 'lucide-react';
import Topo from '@/components/Topo';
import { statusPrograma } from '@/lib/format';
import { marcaDaRadio } from '@/lib/marca';

const COR_STATUS = { verde: 'var(--verde)', amarelo: 'var(--amarelo)', vermelho: 'var(--vermelho)' };

// "Segunda a sexta" -> "Seg a sex"; mantém curto
function diasCurto(d = '') {
  return d.replace(/Segunda/gi, 'Seg').replace(/sexta/gi, 'sex').replace(/Sábado/gi, 'Sáb').replace(/Domingo/gi, 'Dom');
}
const hhmm = (t) => (t ? t.slice(0, 5) : '');

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

  const marca = marcaDaRadio(radio.nome);
  const comVaga = (programas || []).filter((p) => p.cotas_livres > 0).length;

  return (
    <>
      <Topo titulo={radio.nome} voltar="/app" cor={radio.cor} />
      <main className="conteudo">
        <div className="cabeca-radio">
          {marca.logo && <img src={marca.logo} alt="" />}
          <div className="t">
            <b>{radio.nome}</b>
            <small className="muted">{programas?.length || 0} programas · {comVaga} com vaga</small>
          </div>
        </div>

        <div className="tags" style={{ marginBottom: 14 }}>
          <span className="badge b-verde"><span className="bolinha verde" />Tem vaga</span>
          <span className="badge b-amarelo"><span className="bolinha amarelo" />Última vaga</span>
          <span className="badge b-vermelho"><span className="bolinha vermelho" />Lotado</span>
        </div>

        {!programas?.length && <div className="vazio">Nenhum programa cadastrado nesta rádio.</div>}
        <div className="lista-programas">
          {(programas || []).map((p) => {
            const st = statusPrograma(p.cotas_livres, p.cotas_total);
            return (
              <Link key={p.id} href={`/app/programa/${p.id}`} className="prog-linha" style={{ '--cor': radio.cor, '--st': COR_STATUS[st.cor] }}>
                <div className="topo-p">
                  <div className="nome">{p.nome}</div>
                  <span className="seta"><ChevronRight className="ico" /></span>
                </div>
                {p.descricao && <div className="desc">{p.descricao}</div>}
                <div className="numeros">
                  <div><b>{hhmm(p.horario_inicio)}–{hhmm(p.horario_fim)}</b><span>{diasCurto(p.dias)}</span></div>
                  <div><b>{p.cotas_livres}</b><span>{p.cotas_livres === 1 ? 'cota livre' : 'cotas livres'} de {p.cotas_total}</span></div>
                  <div className="situacao">
                    <span className="vagas" style={{ color: COR_STATUS[st.cor] }}>{st.cor === 'verde' ? 'Tem vaga' : st.texto}</span>
                    <span className="mini-blocos">
                      {Array.from({ length: Math.min(p.cotas_total, 10) }, (_, i) => <i key={i} className={i < p.cotas_ocupadas ? 'cheia' : ''} />)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import Topo from '@/components/Topo';
import { moeda, statusPrograma } from '@/lib/format';
import { MODALIDADE } from '@/lib/pacote';
import { marcaDaRadio } from '@/lib/marca';

const COR_STATUS = { verde: 'var(--verde)', amarelo: 'var(--amarelo)', vermelho: 'var(--vermelho)' };

// "Segunda a sexta" -> "Seg a sex"; mantém curto
function diasCurto(d = '') {
  return d.replace(/Segunda/gi, 'Seg').replace(/sexta/gi, 'sex').replace(/Sábado/gi, 'Sáb').replace(/Domingo/gi, 'Dom');
}
const hhmm = (t) => (t ? t.slice(0, 5) : '');

// Programa de faixa fixa: "07:00–08:00". Programete com vários horários: o
// texto que vem depois do "·" em dias (ex.: "08h00, 11h20 e 15h00").
function Horario({ p }) {
  const [dias, extra] = (p.dias || '').split(' · ');
  if (p.horario_inicio) {
    return <div><b>{hhmm(p.horario_inicio)}{p.horario_fim ? `–${hhmm(p.horario_fim)}` : ''}</b><span>{diasCurto(p.dias)}</span></div>;
  }
  return <div><b className={extra ? 'texto' : ''}>{extra || 'Horário a definir'}</b><span>{diasCurto(dias)}</span></div>;
}

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

  const { data: precos } = await supabase.from('tabela_precos').select('id, tipo, duracao, modalidade, valor').eq('radio_id', radio.id).eq('ativo', true).order('tipo').order('duracao');
  // avulsos agrupados como no mídia kit: uma linha por tipo+duração, colunas por horário
  const linhasAvulso = [];
  (precos || []).forEach((x) => {
    const chave = `${x.tipo}-${x.duracao}`;
    let l = linhasAvulso.find((y) => y.chave === chave);
    if (!l) { l = { chave, tipo: x.tipo, duracao: x.duracao }; linhasAvulso.push(l); }
    l[x.modalidade] = x.valor;
  });
  const temMarcado = linhasAvulso.some((l) => l.determinada != null);

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
                  <Horario p={p} />
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

        {!!linhasAvulso.length && (
          <details className="prog-linha acordeao" style={{ '--cor': radio.cor, '--st': 'var(--verde)' }}>
            <summary>
              <div className="topo-p">
                <div className="nome">Tabela de preços</div>
                <span className="seta"><ChevronDown className="ico" /></span>
              </div>
              <div className="desc">Inserções e testemunhais avulsos. Toque para ver os valores.</div>
            </summary>
            <div className="tabela-kit">
              <table>
                <thead>
                  <tr><th /><th>{temMarcado ? 'Horário livre' : 'Valor'}</th>{temMarcado && <th>Horário marcado</th>}</tr>
                </thead>
                <tbody>
                  {linhasAvulso.map((l) => (
                    <tr key={l.chave}>
                      <td><b>{l.tipo === 'testemunhal' ? 'Testemunhal' : 'Inserção'} {l.duracao}"</b></td>
                      <td className="num">{l.indeterminada != null ? moeda(l.indeterminada) : '—'}</td>
                      {temMarcado && <td className="num">{l.determinada != null ? moeda(l.determinada) : '—'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted" style={{ fontSize: '.85rem', margin: '8px 0 0' }}>
                Valor de cada inserção ou testemunhal.{temMarcado ? ` Horário livre = ${MODALIDADE.indeterminada}.` : ''} Mensal, boleto, contrato mínimo de 3 meses.
              </p>
            </div>
          </details>
        )}

        <Link href={`/app/radio/${radio.id}/montar`} className="btn grande btn-radio" style={{ '--cor': radio.cor }}>
          <Sparkles className="ico" strokeWidth={2.4} /> Montar plano personalizado
        </Link>
      </main>
    </>
  );
}

import { requireGestor } from '@/lib/auth';
import { dataHora } from '@/lib/format';
import EnviarPdf from './EnviarPdf';

export const dynamic = 'force-dynamic';

// PDFs das propostas comerciais que o vendedor envia pelo WhatsApp durante a visita.
// Um por programa; o da rádio vale para o plano personalizado e para programa sem PDF.
export default async function Propostas() {
  const { supabase } = await requireGestor();
  const [{ data: radios, error }, { data: programas }] = await Promise.all([
    supabase.from('radios').select('id, nome, cor, proposta_pdf, proposta_atualizada_em').order('ordem'),
    supabase.from('programas').select('id, nome, radio_id, ativo, proposta_pdf, proposta_atualizada_em').eq('ativo', true).order('horario_inicio', { nullsFirst: false }),
  ]);

  if (error) {
    return (
      <>
        <div className="cabecalho"><h1>Propostas em PDF</h1></div>
        <div className="alerta aviso">Falta atualizar o banco de dados: rode o arquivo <b>supabase/migracao-visita-proposta.sql</b> no SQL Editor do Supabase.</div>
      </>
    );
  }

  const caminhos = [...(radios || []), ...(programas || [])].map((x) => x.proposta_pdf).filter(Boolean);
  const links = {};
  if (caminhos.length) {
    const { data } = await supabase.storage.from('propostas').createSignedUrls(caminhos, 60 * 60);
    (data || []).forEach((d) => { if (d.signedUrl) links[d.path] = d.signedUrl; });
  }

  const Linha = ({ tipo, x, titulo, sub }) => (
    <div className="item">
      <div className="info">
        <div className="nome">{titulo}</div>
        <div className="det">
          {x.proposta_pdf ? <>PDF atualizado em {dataHora(x.proposta_atualizada_em)}</> : sub}
        </div>
      </div>
      {x.proposta_pdf && links[x.proposta_pdf] && <a className="btn peq cinza" href={links[x.proposta_pdf]} target="_blank" rel="noopener noreferrer">Ver</a>}
      <EnviarPdf tipo={tipo} id={x.id} tem={!!x.proposta_pdf} />
    </div>
  );

  return (
    <>
      <div className="cabecalho"><h1>Propostas em PDF</h1></div>
      <p className="muted">
        Na visita, depois de escolher o programa, o vendedor envia a proposta comercial pelo WhatsApp com o PDF daqui.
        Quando a proposta mudar, é só trocar o arquivo: a partir dali todos os vendedores enviam a versão nova.
      </p>
      {(radios || []).map((r) => (
        <section key={r.id} style={{ marginBottom: 24 }}>
          <h2 style={{ color: r.cor }}>{r.nome}</h2>
          <div className="lista">
            <Linha tipo="radio" x={r} titulo="Proposta geral da rádio" sub="Sem PDF. Vale para plano personalizado e para programa sem PDF próprio." />
            {(programas || []).filter((p) => p.radio_id === r.id).map((p) => (
              <Linha key={p.id} tipo="programa" x={p} titulo={p.nome} sub={r.proposta_pdf ? 'Sem PDF próprio: o vendedor envia a proposta geral da rádio' : 'Sem PDF ainda'} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

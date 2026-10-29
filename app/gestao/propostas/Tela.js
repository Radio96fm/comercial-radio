import { dataHora } from '@/lib/format';
import { FileText } from 'lucide-react';
import EnviarPdf from './EnviarPdf';

// PDFs das propostas comerciais que o vendedor envia pelo WhatsApp durante a visita.
// Um por programa; o da rádio vale para programa que ainda não tem PDF próprio.
// links = caminho do PDF -> endereço para abrir. demo = nada é enviado.
export default function TelaPropostas({ radios, programas, links = {}, demo = false }) {
  const Linha = ({ tipo, x, titulo, sub }) => (
    <div className="item">
      <div className="info">
        <div className="nome">{titulo}</div>
        <div className="det">
          {x.proposta_pdf ? <>PDF atualizado em {dataHora(x.proposta_atualizada_em)}</> : sub}
        </div>
      </div>
      {x.proposta_pdf && links[x.proposta_pdf] && <a className="btn peq cinza" href={links[x.proposta_pdf]} target="_blank" rel="noopener noreferrer"><FileText className="ico" /> Ver PDF</a>}
      <EnviarPdf tipo={tipo} id={x.id} tem={!!x.proposta_pdf} demo={demo} />
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
            <Linha tipo="radio" x={r} titulo="Proposta geral da rádio" sub="Sem PDF. Vale para programa que ainda não tem PDF próprio." />
            {(programas || []).filter((p) => p.radio_id === r.id).map((p) => (
              <Linha key={p.id} tipo="programa" x={p} titulo={p.nome} sub={r.proposta_pdf ? 'Sem PDF próprio: o vendedor envia a proposta geral da rádio' : 'Sem PDF ainda'} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Send, Link2 } from 'lucide-react';
import { marcarPropostaEnviada } from '../../../actions';
import { linkWhatsApp } from '@/lib/format';

// Envia a proposta pelo WhatsApp:
// 1. com o PDF anexado (compartilhar do celular: escolhe o WhatsApp e o contato)
// 2. ou direto para o número, com o link do PDF na mensagem
export default function EnviarProposta({ visita, pdfUrl, nomeArquivo, pdfGeral, telefoneInicial, mensagemInicial }) {
  const router = useRouter();
  const [telefone, setTelefone] = useState(telefoneInicial);
  const [mensagem, setMensagem] = useState(mensagemInicial);
  const [arquivo, setArquivo] = useState(null);
  const [podeAnexar, setPodeAnexar] = useState(false);
  const [estado, setEstado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // baixa o PDF antes do toque: o iPhone só abre o compartilhar logo depois do toque
  useEffect(() => {
    if (!pdfUrl || typeof navigator === 'undefined' || !navigator.canShare) return;
    let vivo = true;
    fetch(pdfUrl)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (!vivo || !b) return;
        const f = new File([b], nomeArquivo, { type: 'application/pdf' });
        setArquivo(f);
        setPodeAnexar(navigator.canShare({ files: [f] }));
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, [pdfUrl, nomeArquivo]);

  async function registrar() {
    const r = await marcarPropostaEnviada({ visita, telefone });
    if (r?.erro) { setEstado({ erro: r.erro }); return false; }
    return true;
  }

  async function anexar() {
    setEstado(null);
    try { await navigator.clipboard?.writeText(mensagem); } catch { /* sem permissão: segue */ }
    try {
      await navigator.share({ files: [arquivo], text: mensagem, title: nomeArquivo });
    } catch (e) {
      if (e?.name === 'AbortError') return; // fechou sem enviar
      setEstado({ erro: 'Não deu para anexar o PDF neste aparelho. Use “Enviar com link” abaixo.' });
      return;
    }
    setEnviando(true);
    if (await registrar()) router.push(`/app/visitas/${visita}`);
    setEnviando(false);
  }

  async function comLink() {
    setEstado(null);
    if (!telefone.replace(/\D/g, '')) { setEstado({ erro: 'Informe o WhatsApp do contato.' }); return; }
    setEnviando(true);
    const texto = pdfUrl ? `${mensagem}\n\nProposta em PDF: ${pdfUrl}` : mensagem;
    const ok = await registrar();
    setEnviando(false);
    if (ok) window.location.href = linkWhatsApp(telefone, texto);
  }

  return (
    <div>
      {estado?.erro && <div className="alerta erro">{estado.erro}</div>}

      {pdfUrl ? (
        <div className="pdf-linha">
          <FileText className="ico" />
          <div className="t"><b>{nomeArquivo}</b><small>{pdfGeral ? 'Proposta geral da rádio (este programa ainda não tem PDF próprio)' : 'Proposta do programa, atualizada pelo comercial'}</small></div>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn peq cinza">Ver</a>
        </div>
      ) : (
        <div className="alerta aviso">O comercial ainda não colocou o PDF da proposta deste programa. Você pode enviar só a mensagem e mandar o PDF depois.</div>
      )}

      <div className="campo">
        <label htmlFor="tel">WhatsApp do contato</label>
        <input id="tel" type="tel" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(64) 90000-0000" />
      </div>
      <div className="campo">
        <label htmlFor="msg">Mensagem</label>
        <textarea id="msg" value={mensagem} onChange={(e) => setMensagem(e.target.value)} style={{ minHeight: 150 }} />
      </div>

      {podeAnexar && (
        <>
          <button type="button" className="btn grande whats" onClick={anexar} disabled={enviando}>
            <Send className="ico" /> Enviar PDF no WhatsApp
          </button>
          <p className="muted" style={{ marginTop: 8 }}>Escolha o WhatsApp e o contato. A mensagem já fica copiada: se ela não aparecer junto do PDF, é só colar.</p>
        </>
      )}
      <button type="button" className={`btn ${podeAnexar ? 'sec' : 'grande whats'}`} style={{ width: '100%', marginTop: 10 }} onClick={comLink} disabled={enviando}>
        <Link2 className="ico" /> {pdfUrl ? 'Enviar com link do PDF para o número' : 'Enviar mensagem no WhatsApp'}
      </button>
    </div>
  );
}

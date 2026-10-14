'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Mic, Square, Send } from 'lucide-react';
import useDitado from '@/components/useDitado';

const SUGESTOES = [
  'Quais programas têm vaga agora?',
  'Tem vaga para uma loja de roupas no programa da manhã?',
  'Quanto custa o plano de 6 meses?',
  'Tem alguma condição especial hoje?',
];

// **negrito** e quebras de linha, sem mais nada
function Texto({ t }) {
  return t.split('\n').map((linha, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {linha.replace(/^\s*[*-]\s+/, '• ').split(/\*\*(.+?)\*\*/g).map((p, j) => (j % 2 ? <b key={j}>{p}</b> : p.replace(/\*/g, '')))}
    </Fragment>
  ));
}

export default function Duvidas() {
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState(null);
  const voz = useDitado(texto, setTexto, setErro);
  const fim = useRef(null);
  useEffect(() => { if (mensagens.length) fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [mensagens, pensando]);

  async function enviar(conteudo) {
    const t = (conteudo ?? texto).trim();
    if (!t || pensando) return;
    voz.parar();
    const nova = [...mensagens, { papel: 'vendedor', texto: t }];
    setMensagens(nova);
    setTexto('');
    setErro(null);
    setPensando(true);
    try {
      const resp = await fetch('/api/duvidas', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mensagens: nova }) });
      const r = await resp.json().catch(() => ({ erro: 'Demorou demais. Tente de novo.' }));
      if (!resp.ok) throw new Error(r.erro || 'Não deu certo.');
      setMensagens([...nova, { papel: 'assistente', texto: r.texto }]);
    } catch (e) {
      setErro(e.message);
      setMensagens(mensagens);
      setTexto(t);
    } finally {
      setPensando(false);
    }
  }

  return (
    <div className="chat-testemunhal">
      <div className="chat-msgs">
        <div className="bolha ia">Oi! Pergunte sobre <b>vagas, programas, preços e condições</b>. Eu olho o sistema agora e te respondo. Pode escrever ou tocar em Falar.</div>
        {!mensagens.length && (
          <div className="atalhos">
            {SUGESTOES.map((s) => <button key={s} type="button" className="btn peq sec" onClick={() => enviar(s)}>{s}</button>)}
          </div>
        )}
        {mensagens.map((m, i) => (
          <div key={i} className={`bolha ${m.papel === 'vendedor' ? 'eu' : 'ia resposta'}`}>
            {m.papel === 'vendedor' ? m.texto : <Texto t={m.texto} />}
          </div>
        ))}
        {pensando && <div className="bolha ia digitando"><i /><i /><i /> Olhando o sistema...</div>}
        <div ref={fim} />
      </div>

      {erro && <div className="alerta erro">{erro}</div>}

      <form className="chat-envio" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2}
          placeholder={voz.ouvindo ? 'Pode falar, estou ouvindo...' : 'Ex.: tem vaga no programa tal para uma farmácia?'} />
        <div className="chat-botoes">
          {voz.disponivel && (
            <button type="button" className={`btn mic ${voz.ouvindo ? 'ouvindo' : 'cinza'}`} onClick={voz.alternar}>
              {voz.ouvindo ? <><Square className="ico" />Parar</> : <><Mic className="ico" />Falar</>}
            </button>
          )}
          <button className="btn" disabled={pensando || !texto.trim()}><Send className="ico" />Perguntar</button>
        </div>
      </form>
    </div>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Send, Copy, Check, Volume2, Save } from 'lucide-react';
import { salvarTestemunhal } from '@/app/app/actions';

const DURACOES = [15, 30, 45, 60];

function separar(texto) {
  const m = texto.match(/\[TESTEMUNHAL\]([\s\S]*?)(\[\/TESTEMUNHAL\]|$)/i);
  if (!m) return { nota: texto.trim(), roteiro: null };
  const nota = texto.replace(m[0], '').replace(/\[\/?TESTEMUNHAL\]/gi, '').trim();
  return { nota, roteiro: m[1].trim() };
}

const segundos = (t) => Math.round(t.split(/\s+/).filter(Boolean).length / 2.5);

function Roteiro({ texto, clienteId, programaId }) {
  const [copiado, setCopiado] = useState(false);
  const [salvo, setSalvo] = useState(null);
  const [falando, setFalando] = useState(false);

  async function copiar() {
    try { await navigator.clipboard.writeText(texto); } catch {
      const t = document.createElement('textarea'); t.value = texto; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    setCopiado(true); setTimeout(() => setCopiado(false), 2000);
  }
  function ouvir() {
    const s = window.speechSynthesis;
    if (!s) return;
    if (falando) { s.cancel(); setFalando(false); return; }
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'pt-BR';
    u.onend = () => setFalando(false);
    setFalando(true);
    s.speak(u);
  }
  async function salvar() {
    setSalvo('...');
    const r = await salvarTestemunhal({ clienteId, programaId, texto });
    setSalvo(r?.erro ? r.erro : 'ok');
  }

  return (
    <div className="roteiro">
      <div className="roteiro-topo"><b>Texto para o locutor</b><span>cerca de {segundos(texto)}s</span></div>
      <p>{texto}</p>
      <div className="roteiro-acoes">
        <button type="button" className="btn peq" onClick={copiar}>{copiado ? <><Check className="ico" />Copiado!</> : <><Copy className="ico" />Copiar</>}</button>
        <button type="button" className="btn peq cinza" onClick={ouvir}><Volume2 className="ico" />{falando ? 'Parar' : 'Ouvir'}</button>
        <button type="button" className="btn peq cinza" onClick={salvar} disabled={salvo === '...' || salvo === 'ok'}>
          <Save className="ico" />{salvo === 'ok' ? 'Salvo no cliente' : salvo === '...' ? 'Salvando...' : 'Salvar no cliente'}
        </button>
      </div>
      {salvo && !['ok', '...'].includes(salvo) && <div className="alerta erro" style={{ marginTop: 8 }}>{salvo}</div>}
    </div>
  );
}

export default function Chat({ cliente, programas, programaInicial }) {
  const [programaId, setProgramaId] = useState(programaInicial);
  const [duracao, setDuracao] = useState(30);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState(null);
  const [ouvindo, setOuvindo] = useState(false);
  const [temVoz, setTemVoz] = useState(true);
  const rec = useRef(null);
  const base = useRef('');
  const fim = useRef(null);

  useEffect(() => {
    setTemVoz(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => rec.current?.abort();
  }, []);
  useEffect(() => { fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [mensagens, pensando]);

  function falar() {
    if (ouvindo) { rec.current?.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'pt-BR';
    r.continuous = true;
    r.interimResults = true;
    base.current = texto ? `${texto.trim()} ` : '';
    r.onresult = (e) => {
      let final = '';
      let parcial = '';
      for (let i = 0; i < e.results.length; i += 1) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else parcial += e.results[i][0].transcript;
      }
      setTexto(base.current + final + parcial);
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setErro('Libere o microfone para este site nas configurações do navegador, ou use o microfone do teclado.');
    };
    r.onend = () => setOuvindo(false);
    rec.current = r;
    setErro(null);
    setOuvindo(true);
    r.start();
  }

  async function enviar(conteudo) {
    const t = (conteudo ?? texto).trim();
    if (!t || pensando) return;
    rec.current?.stop();
    const nova = [...mensagens, { papel: 'vendedor', texto: t }];
    setMensagens(nova);
    setTexto('');
    setErro(null);
    setPensando(true);
    try {
      const resp = await fetch('/api/testemunhal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clienteId: cliente.id, programaId, duracao, mensagens: nova }),
      });
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

  const temRoteiro = mensagens.some((m) => m.papel === 'assistente' && separar(m.texto).roteiro);

  return (
    <div className="chat-testemunhal">
      <div className="card chat-ajustes">
        <div className="campo" style={{ marginBottom: 10 }}>
          <label>Programa</label>
          <select value={programaId} onChange={(e) => setProgramaId(e.target.value)}>
            <option value="">Qualquer programa</option>
            {programas.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.radio?.nome ? ` · ${p.radio.nome}` : ''}</option>)}
          </select>
        </div>
        <label className="rotulo">Tempo de leitura</label>
        <div className="seg4">
          {DURACOES.map((d) => (
            <button key={d} type="button" className={d === duracao ? 'ativo' : ''} onClick={() => setDuracao(d)}><b>{d}</b>segundos</button>
          ))}
        </div>
      </div>

      <div className="chat-msgs">
        <div className="bolha ia">
          Me conte sobre <b>{cliente.nome}</b>: o que vende, o que tem de especial, alguma promoção, endereço, telefone ou WhatsApp.
          Pode escrever ou tocar no microfone e falar.
        </div>
        {mensagens.map((m, i) => {
          if (m.papel === 'vendedor') return <div key={i} className="bolha eu">{m.texto}</div>;
          const { nota, roteiro } = separar(m.texto);
          return (
            <div key={i} className="bolha ia">
              {roteiro && <Roteiro texto={roteiro} clienteId={cliente.id} programaId={programaId} />}
              {nota && <div className="nota">{nota}</div>}
            </div>
          );
        })}
        {pensando && <div className="bolha ia digitando"><i /><i /><i /> Escrevendo...</div>}
        <div ref={fim} />
      </div>

      {temRoteiro && !pensando && (
        <div className="atalhos">
          {['Mais curto', 'Mais animado', 'Mais formal', 'Outra versão'].map((a) => (
            <button key={a} type="button" className="btn peq sec" onClick={() => enviar(a)}>{a}</button>
          ))}
        </div>
      )}

      {erro && <div className="alerta erro">{erro}</div>}

      <form className="chat-envio" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          placeholder={ouvindo ? 'Pode falar, estou ouvindo...' : temRoteiro ? 'Peça um ajuste. Ex.: "fala da promoção de sábado"' : 'Escreva aqui...'}
        />
        <div className="chat-botoes">
          {temVoz && (
            <button type="button" className={`btn mic ${ouvindo ? 'ouvindo' : 'cinza'}`} onClick={falar}>
              {ouvindo ? <><Square className="ico" />Parar</> : <><Mic className="ico" />Falar</>}
            </button>
          )}
          <button className="btn" disabled={pensando || !texto.trim()}><Send className="ico" />Enviar</button>
        </div>
        {!temVoz && <p className="muted" style={{ margin: '6px 0 0', fontSize: '.85rem' }}>Para falar em vez de escrever, toque no microfone do teclado do celular.</p>}
      </form>
    </div>
  );
}

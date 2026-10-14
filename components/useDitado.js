'use client';
import { useEffect, useRef, useState } from 'react';

// Ditado por voz do navegador (pt-BR). Vai escrevendo no texto enquanto a pessoa fala.
export default function useDitado(texto, setTexto, aoErrar) {
  const [ouvindo, setOuvindo] = useState(false);
  const [disponivel, setDisponivel] = useState(true);
  const rec = useRef(null);
  const base = useRef('');

  useEffect(() => {
    setDisponivel(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => rec.current?.abort();
  }, []);

  function alternar() {
    if (ouvindo) { rec.current?.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'pt-BR';
    r.continuous = true;
    r.interimResults = true;
    base.current = texto ? `${texto.trim()} ` : '';
    r.onresult = (e) => {
      let t = '';
      for (let i = 0; i < e.results.length; i += 1) t += e.results[i][0].transcript;
      setTexto(base.current + t);
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') aoErrar?.('Libere o microfone para este site nas configurações do navegador, ou use o microfone do teclado.');
    };
    r.onend = () => setOuvindo(false);
    rec.current = r;
    setOuvindo(true);
    r.start();
  }

  return { ouvindo, disponivel, alternar, parar: () => rec.current?.stop() };
}

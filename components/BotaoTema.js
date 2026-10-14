'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

// Troca tema claro/escuro. A escolha fica salva neste aparelho.
export default function BotaoTema({ comTexto = false, className = 'btn peq cinza' }) {
  const [tema, setTema] = useState('escuro');
  useEffect(() => {
    setTema(document.documentElement.dataset.theme === 'light' ? 'claro' : 'escuro');
  }, []);
  function trocar() {
    const novo = tema === 'claro' ? 'escuro' : 'claro';
    setTema(novo);
    document.documentElement.dataset.theme = novo === 'claro' ? 'light' : 'dark';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', novo === 'claro' ? '#f4f2ee' : '#0a0a0a');
    try { localStorage.setItem('tema', novo); } catch {}
  }
  const Ico = tema === 'claro' ? Moon : Sun;
  const txt = tema === 'claro' ? 'Tema escuro' : 'Tema claro';
  return (
    <button type="button" className={className} onClick={trocar} aria-label={txt} title={txt}>
      <Ico className="ico" />{comTexto && txt}
    </button>
  );
}

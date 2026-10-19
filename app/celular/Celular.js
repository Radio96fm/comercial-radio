'use client';

import { useEffect, useRef, useState } from 'react';

const LARGURA = 390;
const ALTURA = 844;
const BORDA = 14;

export default function Celular() {
  const frame = useRef(null);
  const [escala, setEscala] = useState(1);
  const [hora, setHora] = useState('');

  useEffect(() => {
    const ajustar = () => {
      const alturaTotal = ALTURA + BORDA * 2;
      const disponivel = window.innerHeight - 110;
      setEscala(Math.min(1, Math.max(0.5, disponivel / alturaTotal)));
    };
    const relogio = () => setHora(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    ajustar();
    relogio();
    window.addEventListener('resize', ajustar);
    const t = setInterval(relogio, 15000);
    return () => { window.removeEventListener('resize', ajustar); clearInterval(t); };
  }, []);

  const ir = (caminho) => { if (frame.current) frame.current.src = caminho; };
  const voltar = () => { try { frame.current?.contentWindow?.history.back(); } catch {} };
  const recarregar = () => { try { frame.current?.contentWindow?.location.reload(); } catch {} };

  return (
    <div className="cel-pagina">
      <style>{CSS}</style>
      <header className="cel-topo">
        <div className="cel-logos">
          <img src="/logos/96fm.png" alt="96 FM" />
          <img src="/logos/agro.png" alt="Rádio do Agro" />
          <span>Comercial · versão do vendedor</span>
        </div>
        <nav className="cel-botoes">
          <button onClick={voltar}>← Voltar</button>
          <button onClick={() => ir('/app')}>Início</button>
          <button onClick={recarregar}>Recarregar</button>
        </nav>
      </header>

      <div className="cel-area">
        <div
          className="cel-aparelho"
          style={{
            width: LARGURA + BORDA * 2,
            height: ALTURA + BORDA * 2,
            transform: `scale(${escala})`,
            marginBottom: (ALTURA + BORDA * 2) * (escala - 1),
          }}
        >
          <div className="cel-tela" style={{ width: LARGURA, height: ALTURA }}>
            <div className="cel-status">
              <span>{hora}</span>
              <span className="cel-ilha" />
              <span className="cel-icones">
                <svg width="17" height="11" viewBox="0 0 17 11" aria-hidden="true"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /></svg>
                <svg width="25" height="12" viewBox="0 0 25 12" aria-hidden="true"><rect x="0.5" y="0.5" width="21" height="11" rx="3" fill="none" stroke="currentColor" opacity=".5" /><rect x="2" y="2" width="16" height="8" rx="2" /><rect x="22.5" y="4" width="2" height="4" rx="1" opacity=".5" /></svg>
              </span>
            </div>
            <iframe ref={frame} src="/app" title="App do vendedor" />
            <div className="cel-barra" />
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
html, body { background: #050505; }
.cel-pagina { min-height: 100vh; display: flex; flex-direction: column; align-items: center;
  background: radial-gradient(1200px 600px at 20% 0%, rgba(236,112,32,.10), transparent 60%),
              radial-gradient(1000px 600px at 90% 100%, rgba(0,177,62,.10), transparent 60%), #050505;
  color: #f5f5f5; font-family: var(--font); }
.cel-topo { width: 100%; max-width: 1100px; display: flex; align-items: center; justify-content: space-between;
  gap: 16px; padding: 18px 24px; flex-wrap: wrap; }
.cel-logos { display: flex; align-items: center; gap: 14px; }
.cel-logos img { height: 34px; width: auto; }
.cel-logos span { font-family: var(--font-display); font-size: 17px; color: #a3a3a3; }
.cel-botoes { display: flex; gap: 8px; }
.cel-botoes button { background: #1d1d1d; color: #f5f5f5; border: 1px solid #333; border-radius: 999px;
  padding: 9px 16px; font-size: 14px; cursor: pointer; font-family: var(--font); }
.cel-botoes button:hover { background: #2a2a2a; }
.cel-area { flex: 1; display: flex; justify-content: center; align-items: flex-start; padding: 4px 0 24px; }
.cel-aparelho { transform-origin: top center; background: #1a1a1a; border-radius: 62px; padding: ${BORDA}px;
  box-shadow: 0 0 0 2px #3a3a3a, 0 0 0 4px #0d0d0d, 0 40px 80px rgba(0,0,0,.6); box-sizing: border-box; }
.cel-tela { position: relative; border-radius: 48px; overflow: hidden; background: #0a0a0a;
  display: flex; flex-direction: column; }
.cel-status { height: 50px; flex: none; display: flex; align-items: center; justify-content: space-between;
  padding: 0 30px 0 36px; font-size: 15px; font-weight: 600; color: #f5f5f5; background: #0a0a0a; position: relative; }
.cel-ilha { position: absolute; left: 50%; top: 11px; transform: translateX(-50%); width: 120px; height: 34px;
  background: #000; border-radius: 20px; }
.cel-icones { display: flex; gap: 6px; align-items: center; fill: currentColor; }
.cel-tela iframe { flex: 1; width: 100%; border: 0; background: #0a0a0a; }
.cel-barra { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); width: 134px; height: 5px;
  border-radius: 3px; background: rgba(255,255,255,.55); pointer-events: none; }
`;

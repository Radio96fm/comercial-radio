'use client';

import { useEffect, useRef, useState } from 'react';

// Tamanhos de tela (em pontos) de cada aparelho
const APARELHOS = {
  iphone: { nome: 'iPhone', largura: 390, altura: 844, borda: 14, raio: 62, raioTela: 48, status: 50, ilha: true },
  ipad: { nome: 'iPad', largura: 820, altura: 1180, borda: 22, raio: 48, raioTela: 28, status: 26 },
  'ipad-deitado': { nome: 'iPad deitado', largura: 1180, altura: 820, borda: 22, raio: 48, raioTela: 28, status: 26 },
};

export default function Celular({ inicio = '/app', rotulo = 'versão do vendedor', aparelhos = ['iphone'], claro = false }) {
  const frame = useRef(null);
  const [aparelho, setAparelho] = useState(aparelhos[0]);
  const [escala, setEscala] = useState(1);
  const [hora, setHora] = useState('');
  const [fundoClaro, setFundoClaro] = useState(claro);
  const a = APARELHOS[aparelho];
  const larguraTotal = a.largura + a.borda * 2;
  const alturaTotal = a.altura + a.borda * 2;

  useEffect(() => {
    const ajustar = () => {
      const porAltura = (window.innerHeight - 110) / alturaTotal;
      const porLargura = (window.innerWidth - 32) / larguraTotal;
      setEscala(Math.min(1, Math.max(0.3, Math.min(porAltura, porLargura))));
    };
    ajustar();
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, [alturaTotal, larguraTotal]);

  useEffect(() => {
    const relogio = () => setHora(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    relogio();
    const t = setInterval(relogio, 15000);
    return () => clearInterval(t);
  }, []);

  // o painel avisa quando troca entre modo claro e escuro (a barra do aparelho acompanha)
  useEffect(() => {
    const ouvir = (ev) => {
      if (ev.origin !== window.location.origin || !ev.data?.painelTema) return;
      setFundoClaro(ev.data.painelTema === 'claro');
    };
    window.addEventListener('message', ouvir);
    return () => window.removeEventListener('message', ouvir);
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
          <span>Comercial · {rotulo}</span>
        </div>
        <nav className="cel-botoes">
          {aparelhos.length > 1 && (
            <span className="cel-troca">
              {aparelhos.map((id) => (
                <button key={id} className={id === aparelho ? 'ativo' : ''} onClick={() => setAparelho(id)}>{APARELHOS[id].nome}</button>
              ))}
            </span>
          )}
          <button onClick={voltar}>← Voltar</button>
          <button onClick={() => ir(inicio)}>Início</button>
          <button onClick={recarregar}>Recarregar</button>
        </nav>
      </header>

      <div className="cel-area">
        <div
          className={`cel-aparelho ${fundoClaro ? 'cel-claro' : ''}`}
          style={{
            width: larguraTotal,
            height: alturaTotal,
            padding: a.borda,
            borderRadius: a.raio,
            transform: `scale(${escala})`,
            marginBottom: alturaTotal * (escala - 1),
          }}
        >
          <div className="cel-tela" style={{ width: a.largura, height: a.altura, borderRadius: a.raioTela }}>
            <div className={`cel-status ${a.ilha ? '' : 'cel-status-ipad'}`} style={{ height: a.status }}>
              <span>{hora}</span>
              {a.ilha && <span className="cel-ilha" />}
              <span className="cel-icones">
                <svg width="17" height="11" viewBox="0 0 17 11" aria-hidden="true"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /></svg>
                <svg width="25" height="12" viewBox="0 0 25 12" aria-hidden="true"><rect x="0.5" y="0.5" width="21" height="11" rx="3" fill="none" stroke="currentColor" opacity=".5" /><rect x="2" y="2" width="16" height="8" rx="2" /><rect x="22.5" y="4" width="2" height="4" rx="1" opacity=".5" /></svg>
              </span>
            </div>
            <iframe ref={frame} src={inicio} title={rotulo} />
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
.cel-botoes { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.cel-troca { display: inline-flex; gap: 4px; padding: 3px; border-radius: 999px; background: #141414; border: 1px solid #333; }
.cel-troca button { border: 0 !important; padding: 7px 14px !important; background: transparent !important; }
.cel-troca button.ativo { background: #f2f0eb !important; color: #0a0a0a !important; }
.cel-botoes button { background: #1d1d1d; color: #f5f5f5; border: 1px solid #333; border-radius: 999px;
  padding: 9px 16px; font-size: 14px; cursor: pointer; font-family: var(--font); }
.cel-botoes button:hover { background: #2a2a2a; }
.cel-area { flex: 1; display: flex; justify-content: center; align-items: flex-start; padding: 4px 0 24px; }
.cel-aparelho { transform-origin: top center; background: #1a1a1a; transition: width .2s, height .2s;
  box-shadow: 0 0 0 2px #3a3a3a, 0 0 0 4px #0d0d0d, 0 40px 80px rgba(0,0,0,.6); box-sizing: border-box; }
.cel-tela { position: relative; overflow: hidden; background: #0a0a0a;
  display: flex; flex-direction: column; }
.cel-status { flex: none; display: flex; align-items: center; justify-content: space-between;
  padding: 0 30px 0 36px; font-size: 15px; font-weight: 600; color: #f5f5f5; background: #0a0a0a; position: relative; }
.cel-ilha { position: absolute; left: 50%; top: 11px; transform: translateX(-50%); width: 120px; height: 34px;
  background: #000; border-radius: 20px; }
.cel-icones { display: flex; gap: 6px; align-items: center; fill: currentColor; }
.cel-tela iframe { flex: 1; width: 100%; border: 0; background: #0a0a0a; }
.cel-status-ipad { padding: 0 22px; font-size: 13px; }
.cel-claro .cel-tela, .cel-claro .cel-status, .cel-claro .cel-tela iframe { background: #f4f2ee; color: #17150f; }
.cel-claro .cel-barra { background: rgba(0,0,0,.35); }
.cel-barra { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); width: 134px; height: 5px;
  border-radius: 3px; background: rgba(255,255,255,.55); pointer-events: none; }
`;

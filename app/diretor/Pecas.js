'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, X, Moon, Sun } from 'lucide-react';

// Peças dos painéis em blocos (Painel do Diretor e Painel Comercial).

export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
export const primeiro = (nome = '') => nome.split(' ')[0];

// demonstração (link público de apresentação): sem botões que levam ao sistema
export const Demo = createContext(false);

// Modo claro/escuro do painel. A escolha fica salva neste aparelho e vale para
// os dois painéis. Dentro da moldura de apresentação, avisa a moldura para
// acompanhar a cor da barra do aparelho.
export function BotaoTemaPainel() {
  const [escuro, setEscuro] = useState(false);
  useEffect(() => {
    const e = document.documentElement.dataset.painel === 'escuro';
    setEscuro(e);
    avisarMoldura(e);
  }, []);
  function trocar() {
    const novo = !escuro;
    setEscuro(novo);
    if (novo) document.documentElement.dataset.painel = 'escuro';
    else delete document.documentElement.dataset.painel;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', novo ? '#0f0e0c' : '#f4f2ee');
    try { localStorage.setItem('temaPainel', novo ? 'escuro' : 'claro'); } catch {}
    avisarMoldura(novo);
  }
  const txt = escuro ? 'Modo claro' : 'Modo escuro';
  const Ico = escuro ? Sun : Moon;
  return (
    <button type="button" className="dir-btn-topo" onClick={trocar} aria-label={txt} title={txt}>
      <Ico size={20} /><span>{txt}</span>
    </button>
  );
}

function avisarMoldura(escuro) {
  try {
    if (window.parent !== window) window.parent.postMessage({ painelTema: escuro ? 'escuro' : 'claro' }, window.location.origin);
  } catch {}
}

// Folha de detalhe: sobe de baixo no celular, janela no centro no iPad
export function Folha({ aberto, fechar, demo, children }) {
  useEffect(() => {
    if (!aberto) return undefined;
    const esc = (ev) => ev.key === 'Escape' && fechar();
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [aberto, fechar]);
  if (!aberto) return null;
  return (
    <div className="dir-fundo" onClick={fechar} role="presentation">
      <div className="dir-folha" role="dialog" aria-modal="true" onClick={(ev) => ev.stopPropagation()}>
        <div className="dir-pegador" />
        <button type="button" className="dir-fechar" onClick={fechar} aria-label="Fechar"><X size={22} /></button>
        <Demo.Provider value={demo}>{children}</Demo.Provider>
      </div>
    </div>
  );
}

export function Bloco({ b, abrir }) {
  return (
    <button type="button" className={`dir-bloco t-${b.tom}`} onClick={() => abrir(b.id)}>
      <div className="dir-bloco-topo"><span className={`dir-ico t-${b.tom}`}><b.Ico size={24} /></span><ChevronRight className="dir-seta" /></div>
      <span className="dir-rotulo">{b.rotulo}</span>
      <b className={`dir-num num ${b.pequeno ? 'menor' : ''}`}>{b.valor}</b>
      {b.barra !== undefined && <div className="dir-trilho fino"><i style={{ width: `${b.barra}%` }} /></div>}
      <span className="dir-sub">{b.sub}</span>
      {b.extra && <span className="dir-extra">{b.extra}</span>}
    </button>
  );
}

export function Titulo({ Ico, tom, children, sub }) {
  return (
    <div className="dir-d-titulo">
      <span className={`dir-ico t-${tom}`}><Ico size={24} /></span>
      <div><h2>{children}</h2>{sub && <small>{sub}</small>}</div>
    </div>
  );
}

export function Numeros({ itens }) {
  return (
    <div className="dir-d-numeros">
      {itens.map(([rotulo, valor, tom]) => (
        <div key={rotulo} className={tom ? `t-${tom}` : ''}><b className="num">{valor}</b><span>{rotulo}</span></div>
      ))}
    </div>
  );
}

export function Linha({ titulo, sub, valor, valorSub, tom }) {
  return (
    <div className="dir-d-linha">
      <div><b>{titulo}</b>{sub && <small>{sub}</small>}</div>
      <div className={`dir-d-valor ${tom ? `t-${tom}` : ''}`}><b className="num">{valor}</b>{valorSub && <small>{valorSub}</small>}</div>
    </div>
  );
}

export function VerTudo({ href, children }) {
  if (useContext(Demo)) return null;
  return <Link href={href} className="dir-ver">{children}<ChevronRight size={18} /></Link>;
}

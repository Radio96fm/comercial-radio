import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { marcaDaRadio } from '@/lib/marca';

// Cartões grandes para escolher a rádio (painel do gestor)
export function CartoesRadio({ radios, href, numeros }) {
  return (
    <div className="radios-gestao">
      {radios.map((r) => {
        const marca = marcaDaRadio(r.nome);
        return (
          <Link key={r.id} href={href(r)} className="radio-btn" style={{ '--cor': r.cor, '--cor2': marca.cor2 || r.cor }}>
            <div className="topo-r">
              {marca.logo && <img src={marca.logo} alt="" className="logo-r" />}
              <div className="nome">{r.nome}</div>
              <span className="seta"><ArrowUpRight size={24} strokeWidth={2.4} /></span>
            </div>
            <div className="numeros">
              {numeros(r).map(([v, t]) => <div key={t}><b>{v}</b><span>{t}</span></div>)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// Abas com a logo de cada rádio (troca rápida dentro de uma tela)
export function AbasRadio({ radios, atual, href }) {
  return (
    <div className="abas-radio">
      {radios.map((r) => {
        const marca = marcaDaRadio(r.nome);
        return (
          <Link key={r.id} href={href(r)} className={r.id === atual ? 'ativa' : ''} style={{ '--cor': r.cor }}>
            {marca.logo && <img src={marca.logo} alt="" />}
            {r.nome}
          </Link>
        );
      })}
    </div>
  );
}

// Faixa colorida com a logo, no topo de uma seção da rádio
export function FaixaRadio({ radio, children }) {
  const marca = marcaDaRadio(radio.nome);
  return (
    <div className="faixa-radio-g" style={{ '--cor': radio.cor, '--cor2': marca.cor2 || radio.cor }}>
      {marca.logo && <img src={marca.logo} alt="" />}
      <div className="t"><b>{radio.nome}</b>{radio.slogan && <small>{radio.slogan}</small>}</div>
      <div className="extra">{children}</div>
    </div>
  );
}

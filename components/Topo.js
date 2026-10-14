import Link from 'next/link';

export default function Topo({ titulo, voltar, direita, cor }) {
  return (
    <header className="topbar" style={cor ? { background: cor } : undefined}>
      {voltar && <Link href={voltar} className="voltar" aria-label="Voltar">‹</Link>}
      <div className="titulo">{titulo}</div>
      {direita}
    </header>
  );
}

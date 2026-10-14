import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

// "cor" vira um pontinho colorido ao lado do título (cor da rádio)
export default function Topo({ titulo, voltar, direita, cor }) {
  return (
    <header className="topbar">
      {voltar && <Link href={voltar} className="voltar" aria-label="Voltar"><ChevronLeft size={24} /></Link>}
      <div className="titulo">
        {cor && <span className="ponto" style={{ background: cor }} />}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo}</span>
      </div>
      {direita}
    </header>
  );
}

'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { assinatura } from '@/lib/condicoes';
import { Sparkles, ChevronRight } from 'lucide-react';

const CHAVE = 'condicoes-vistas';

function juntar(nomes) {
  return nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : nomes[0];
}

// Barrinha amarela no topo: some quando o vendedor abre e fecha;
// volta na próxima vez que ele abrir o app (enquanto a condição estiver ativa).
export default function AvisoCondicoes({ condicoes }) {
  const path = usePathname();
  const [visto, setVisto] = useState(true);
  const sig = assinatura(condicoes);
  useEffect(() => {
    try { setVisto(sessionStorage.getItem(CHAVE) === sig); } catch { setVisto(false); }
  }, [sig, path]);

  if (!condicoes.length || visto || path.startsWith('/app/condicoes')) return null;
  const texto = condicoes.length === 1
    ? <>Condição especial: <b>{condicoes[0].programa?.nome}</b></>
    : <>Condições especiais na <b>{juntar([...new Set(condicoes.map((c) => c.programa?.radio?.nome).filter(Boolean))])}</b></>;
  return (
    <Link href="/app/condicoes" className="aviso-condicao">
      <Sparkles size={15} className="ico" />
      <span className="t">{texto}</span>
      <ChevronRight size={16} />
    </Link>
  );
}

export function MarcarCondicoesVistas({ sig }) {
  useEffect(() => { try { sessionStorage.setItem(CHAVE, sig); } catch {} }, [sig]);
  return null;
}

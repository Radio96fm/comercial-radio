'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITENS = [
  { href: '/app', ico: '🏠', txt: 'Início', exato: true },
  { href: '/app/visitas', ico: '🚗', txt: 'Visitas' },
  { href: '/app/clientes', ico: '👥', txt: 'Clientes' },
  { href: '/app/contratos', ico: '📄', txt: 'Contratos' },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottomnav nao-imprimir">
      {ITENS.map((i) => {
        const ativo = i.exato ? path === i.href || path.startsWith('/app/radio') || path.startsWith('/app/programa') : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={ativo ? 'ativo' : ''}>
            <span className="ico">{i.ico}</span>
            {i.txt}
          </Link>
        );
      })}
    </nav>
  );
}

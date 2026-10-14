'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Car, Users, FileText } from 'lucide-react';

const ITENS = [
  { href: '/app', Ico: Home, txt: 'Início', exato: true },
  { href: '/app/visitas', Ico: Car, txt: 'Visitas' },
  { href: '/app/clientes', Ico: Users, txt: 'Clientes' },
  { href: '/app/contratos', Ico: FileText, txt: 'Contratos' },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottomnav nao-imprimir">
      {ITENS.map(({ href, Ico, txt, exato }) => {
        const ativo = exato ? path === href || path.startsWith('/app/radio') || path.startsWith('/app/programa') : path.startsWith(href);
        return (
          <Link key={href} href={href} className={ativo ? 'ativo' : ''}>
            <Ico className="ico" strokeWidth={2.2} />
            {txt}
          </Link>
        );
      })}
    </nav>
  );
}

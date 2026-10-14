'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BadgePercent, Wallet, Send, FileText, LogOut } from 'lucide-react';

const ITENS = [
  ['/financeiro', LayoutDashboard, 'Resumo', true],
  ['/financeiro/comissoes', BadgePercent, 'Comissões'],
  ['/financeiro/parcelas', Wallet, 'Parcelas / boletos'],
  ['/financeiro/cobranca', Send, 'Cobrança do mês'],
  ['/financeiro/contratos', FileText, 'Contratos'],
];

export default function SidebarFinanceiro() {
  const path = usePathname();
  return (
    <aside className="sidebar nao-imprimir">
      <div className="marca-gestao">
        <div className="emissoras-mini">
          <img src="/logos/96fm.png" alt="96 FM" />
          <img src="/logos/agro.png" alt="Rádio do Agro" />
        </div>
        <b>Gestão Financeira</b>
      </div>
      <nav className="nav-g">
        {ITENS.map(([href, Ico, txt, exato]) => (
          <Link key={href} href={href} className={(exato ? path === href : path.startsWith(href)) ? 'ativo' : ''}>
            <Ico className="ico" />{txt}
          </Link>
        ))}
      </nav>
      <div className="rodape">
        <div className="sep" />
        <form action="/sair" method="post">
          <button className="btn peq cinza" style={{ margin: '10px 0 0', width: '100%' }}><LogOut className="ico" />Sair</button>
        </form>
      </div>
    </aside>
  );
}

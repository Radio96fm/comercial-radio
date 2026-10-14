import { requireFinanceiro } from '@/lib/auth';
import SidebarFinanceiro from '@/components/SidebarFinanceiro';
import BotaoTema from '@/components/BotaoTema';

export const dynamic = 'force-dynamic';

export default async function FinanceiroLayout({ children }) {
  await requireFinanceiro();
  return (
    <div className="gestao">
      <SidebarFinanceiro />
      <main className="gestao-main">
        <div className="gestao-topo"><BotaoTema comTexto className="btn peq cinza" /></div>
        {children}
      </main>
    </div>
  );
}

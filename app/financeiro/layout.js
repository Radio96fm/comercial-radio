import { redirect } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import { SidebarFinanceiro } from '@/components/Sidebar';
import BotaoTema from '@/components/BotaoTema';

export const dynamic = 'force-dynamic';

export default async function FinanceiroLayout({ children }) {
  const { perfil, isMaster } = await getSessao();
  if (perfil.papel !== 'financeiro') redirect(isMaster ? '/gestao/financeiro' : '/');
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

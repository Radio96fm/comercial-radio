import { redirect } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import { SidebarFinanceiro } from '@/components/Sidebar';
import BotaoTema from '@/components/BotaoTema';
import SeletorRadio from '@/components/SeletorRadio';
import { radioFin } from '@/lib/radioFin';

export const dynamic = 'force-dynamic';

export default async function FinanceiroLayout({ children }) {
  const { supabase, perfil, isMaster } = await getSessao();
  if (perfil.papel !== 'financeiro') redirect(isMaster ? '/gestao/financeiro' : '/');
  const { data: radios } = await supabase.from('radios').select('id, nome, cor').order('ordem');
  return (
    <div className="gestao">
      <SidebarFinanceiro />
      <main className="gestao-main">
        <div className="gestao-topo"><SeletorRadio radios={radios || []} atual={radioFin()} /><BotaoTema comTexto className="btn peq cinza" /></div>
        {children}
      </main>
    </div>
  );
}

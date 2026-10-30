import { redirect } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import { SidebarFinanceiro } from '@/components/Sidebar';
import BotaoTema from '@/components/BotaoTema';
import SeletorRadio from '@/components/SeletorRadio';
import { radioAtual } from '@/lib/radio';

export const dynamic = 'force-dynamic';

// instalável no computador como programa próprio (Edge/Chrome: "Instalar aplicativo")
export const metadata = { manifest: '/financeiro.webmanifest', appleWebApp: { capable: true, title: 'Rádio Financeiro' } };

export default async function FinanceiroLayout({ children }) {
  const { supabase, perfil, isMaster } = await getSessao();
  if (perfil.papel !== 'financeiro' && !isMaster) redirect('/');
  const { radio, radios } = await radioAtual(supabase);
  return (
    <div className="gestao">
      <SidebarFinanceiro />
      <main className="gestao-main">
        <div className="gestao-topo"><SeletorRadio radios={radios} atual={radio?.id} /><BotaoTema comTexto className="btn peq cinza" /></div>
        {radio?.cnpj && <div className="empresa-radio">{radio.razao_social || radio.nome} · CNPJ {radio.cnpj}</div>}
        {children}
      </main>
    </div>
  );
}

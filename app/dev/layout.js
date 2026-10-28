import { requireDev } from '@/lib/auth';
import { SidebarDev } from '@/components/Sidebar';
import BotaoTema from '@/components/BotaoTema';

export const dynamic = 'force-dynamic';

// Painel do Desenvolvedor: acessos e configurações do sistema (só quem tem profiles.dev)
export default async function DevLayout({ children }) {
  await requireDev();
  return (
    <div className="gestao">
      <SidebarDev />
      <main className="gestao-main">
        <div className="gestao-topo">
          <BotaoTema comTexto className="btn peq cinza" />
        </div>
        {children}
      </main>
    </div>
  );
}

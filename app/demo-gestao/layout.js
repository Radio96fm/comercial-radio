import { SidebarDemo } from '@/components/Sidebar';
import BotaoTema from '@/components/BotaoTema';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Demonstração · Gestão Comercial',
  robots: { index: false, follow: false },
};

// Demonstração pública da Gestão Comercial (o sistema do diretor comercial no
// computador): sem login, só dados fictícios, sem nada do financeiro.
export default function DemoGestaoLayout({ children }) {
  return (
    <div className="gestao">
      <SidebarDemo />
      <main className="gestao-main">
        <div className="gestao-topo">
          <span className="ao-vivo">Demonstração</span>
          <BotaoTema comTexto className="btn peq cinza" />
        </div>
        {children}
      </main>
    </div>
  );
}

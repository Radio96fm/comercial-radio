import { requireGestor } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import AoVivo from '@/components/AoVivo';
import BotaoTema from '@/components/BotaoTema';

export const dynamic = 'force-dynamic';

export default async function GestaoLayout({ children }) {
  await requireGestor();
  return (
    <div className="gestao">
      <Sidebar />
      <main className="gestao-main">
        <div className="gestao-topo">
          <span className="ao-vivo" title="A tela se atualiza sozinha quando um vendedor faz algo (visita, cliente, contrato)">Atualiza sozinho</span>
          <BotaoTema comTexto className="btn peq cinza" />
        </div>
        {children}
      </main>
      <AoVivo />
    </div>
  );
}

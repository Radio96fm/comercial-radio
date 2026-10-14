import { requireGestor } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import AoVivo from '@/components/AoVivo';

export const dynamic = 'force-dynamic';

export default async function GestaoLayout({ children }) {
  const { perfil } = await requireGestor();
  return (
    <div className="gestao">
      <Sidebar nome={perfil.nome} />
      <main className="gestao-main">{children}</main>
      <AoVivo />
    </div>
  );
}

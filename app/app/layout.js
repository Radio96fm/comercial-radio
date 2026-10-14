import { getSessao } from '@/lib/auth';
import BottomNav from '@/components/BottomNav';
import AoVivo from '@/components/AoVivo';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }) {
  await getSessao();
  return (
    <div className="app-shell">
      {children}
      <BottomNav />
      <AoVivo />
    </div>
  );
}

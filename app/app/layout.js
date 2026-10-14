import { getSessao } from '@/lib/auth';
import BottomNav from '@/components/BottomNav';
import AoVivo from '@/components/AoVivo';
import AvisoCondicoes from '@/components/AvisoCondicoes';
import { buscarCondicoesAtivas } from '@/lib/periodo';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }) {
  const { supabase } = await getSessao();
  const { data: condicoes } = await buscarCondicoesAtivas(supabase);
  return (
    <div className="app-shell">
      <AvisoCondicoes condicoes={condicoes || []} />
      {children}
      <BottomNav />
      <AoVivo />
    </div>
  );
}

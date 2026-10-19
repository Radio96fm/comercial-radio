import { redirect } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import BottomNav from '@/components/BottomNav';
import AoVivo from '@/components/AoVivo';
import AvisoCondicoes from '@/components/AvisoCondicoes';
import { buscarCondicoesAtivas } from '@/lib/periodo';
import AvisoPrazo from '@/components/AvisoPrazo';
import { PRAZO_DIAS, prazoVisita } from '@/lib/prazo';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }) {
  const { supabase, perfil } = await getSessao();
  if (perfil.papel === 'financeiro') redirect('/financeiro');
  const [{ data: condicoes }, { data: abertas }] = await Promise.all([
    buscarCondicoesAtivas(supabase),
    supabase.from('visitas').select('id, iniciada_em, prazo_extra_dias, cliente:clientes(nome)')
      .eq('vendedor_id', perfil.id).in('status', ['em_andamento', 'proposta'])
      .gt('iniciada_em', new Date(Date.now() - (PRAZO_DIAS + 30) * 86400000).toISOString()),
  ]);
  const vencendo = (abertas || []).map((v) => ({ id: v.id, nome: v.cliente?.nome, ...prazoVisita(v.iniciada_em, v.prazo_extra_dias) })).filter((v) => v.avisar);
  return (
    <div className="app-shell">
      <AvisoPrazo itens={vencendo} />
      <AvisoCondicoes condicoes={condicoes || []} />
      {children}
      <BottomNav />
      <AoVivo />
    </div>
  );
}

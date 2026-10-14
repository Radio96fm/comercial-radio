import { redirect } from 'next/navigation';
import { getSessao } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Inicio() {
  const { isGestor, perfil } = await getSessao();
  redirect(perfil.papel === 'financeiro' ? '/financeiro' : isGestor ? '/gestao' : '/app');
}

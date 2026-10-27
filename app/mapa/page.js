import { requireGestor } from '@/lib/auth';
import Mapa from './Mapa';
import './mapa.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mapa do fluxo · Comercial' };

// Mapa do fluxo do negócio, para o dono e o comercial ajustarem as regras.
export default async function Page() {
  const { perfil } = await requireGestor();
  return <Mapa autor={perfil.nome || 'Sem nome'} />;
}

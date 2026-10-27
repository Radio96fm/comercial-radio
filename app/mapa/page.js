import { redirect } from 'next/navigation';

// O mapa agora abre sem login em /fluxo
export default function Page() {
  redirect('/fluxo');
}

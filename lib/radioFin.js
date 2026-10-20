import 'server-only';
import { cookies } from 'next/headers';

// Rádio escolhida no painel financeiro (Todas, 96 FM ou Agro); fica guardada no navegador
export function radioFin() {
  const v = cookies().get('fin_radio')?.value || '';
  return /^[0-9a-f-]{36}$/.test(v) ? v : '';
}

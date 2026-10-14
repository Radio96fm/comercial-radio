import { redirect } from 'next/navigation';

// Parcelas e boletos agora ficam no painel financeiro
export default function Parcelas() {
  redirect('/gestao');
}

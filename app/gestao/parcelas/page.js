import { redirect } from 'next/navigation';

// Parcelas e boletos agora ficam na área Financeiro do painel
export default function Parcelas() {
  redirect('/gestao/financeiro/parcelas');
}

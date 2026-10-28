import { redirect } from 'next/navigation';

// Usuários foi para o Painel do Desenvolvedor
export default function Usuarios() {
  redirect('/dev/acessos');
}

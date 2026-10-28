import { redirect } from 'next/navigation';

// Treinar assistente foi para o Painel do Desenvolvedor
export default function Assistente() {
  redirect('/dev/assistente');
}

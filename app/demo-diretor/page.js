import { hojeISO } from '@/lib/format';
import { montarPainel } from '@/lib/diretor';
import { dadosDemoDiretor } from '@/lib/demoDiretor';
import Painel from '../diretor/Painel';

export const metadata = {
  title: 'Demonstração · Painel do Diretor',
  robots: { index: false, follow: false },
};

function saudacao() {
  const h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

// Mesmo painel do /diretor, com dados fictícios e sem login (para apresentar por link)
export default function Page({ searchParams }) {
  const hoje = hojeISO();
  const dados = montarPainel({ ...dadosDemoDiretor(hoje), radioId: searchParams?.radio || null });
  const dataLonga = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (l) => l.toUpperCase());
  return <Painel dados={dados} ola={`${saudacao()}, Emmanoel!`} dataLonga={dataLonga} base="/demo-diretor" demo />;
}

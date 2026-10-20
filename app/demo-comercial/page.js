import { hojeISO } from '@/lib/format';
import { montarComercial } from '@/lib/comercial';
import { dadosDemoComercial } from '@/lib/demoComercial';
import Painel from '../comercial/Painel';

export const metadata = {
  title: 'Demonstração · Painel Comercial',
  robots: { index: false, follow: false },
};

function saudacao() {
  const h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

// Mesmo painel do /comercial, com dados fictícios e sem login (para apresentar por link)
export default function Page({ searchParams }) {
  const hoje = hojeISO();
  const dados = montarComercial({ ...dadosDemoComercial(hoje), radioId: searchParams?.radio || null });
  const dataLonga = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (l) => l.toUpperCase());
  return <Painel dados={dados} ola={`${saudacao()}, Gustavo!`} dataLonga={dataLonga} base="/demo-comercial" demo />;
}

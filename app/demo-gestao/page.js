import { hojeISO } from '@/lib/format';
import { dadosDemoGestao } from '@/lib/demoGestao';
import VisaoGeral from '../gestao/VisaoGeral';
import TelaCerta from '@/components/TelaCerta';

function saudacao() {
  const h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Page() {
  const dataLonga = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (l) => l.toUpperCase());
  return (
    <>
      <TelaCerta celular="/demo-comercial" />
      <VisaoGeral dados={dadosDemoGestao(hojeISO())} ola={`${saudacao()}, Gustavo`} dataLonga={dataLonga} demo />
    </>
  );
}

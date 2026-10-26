import * as acoes from '../actions';
import { hojeISO } from '@/lib/format';
import { RADIOS } from '@/lib/demoDados';
import { programasDemo, PLANOS_DEMO, condicoesDemo } from '@/lib/demoGestao';
import TelaProgramas from '@/app/gestao/programas/Tela';

export default function Page({ searchParams }) {
  return <TelaProgramas radios={RADIOS} programas={programasDemo(hojeISO())} planos={PLANOS_DEMO} condicoes={condicoesDemo()} searchParams={searchParams} base="/demo-gestao" acoes={acoes} />;
}

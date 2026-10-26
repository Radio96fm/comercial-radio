import { RADIOS } from '@/lib/demoDados';
import { programasDemo } from '@/lib/demoGestao';
import { hojeISO } from '@/lib/format';
import TelaPropostas from '@/app/gestao/propostas/Tela';

export default function Page() {
  return <TelaPropostas radios={RADIOS} programas={programasDemo(hojeISO())} demo />;
}

import * as acoes from '../actions';
import { RADIOS } from '@/lib/demoDados';
import { PRECOS_DEMO } from '@/lib/demoGestao';
import TelaPrecos from '@/app/gestao/precos/Tela';

export default function Page({ searchParams }) {
  return <TelaPrecos radios={RADIOS} precos={PRECOS_DEMO} searchParams={searchParams} base="/demo-gestao" acoes={acoes} />;
}

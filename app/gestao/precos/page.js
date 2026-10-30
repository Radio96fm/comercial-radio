import { requireGestor } from '@/lib/auth';
import { radioAtual } from '@/lib/radio';
import * as acoes from '../actions';
import TelaPrecos from './Tela';

export default async function TabelaPrecos({ searchParams }) {
  const { supabase } = await requireGestor();
  const { radio } = await radioAtual(supabase);
  const R = radio?.id;
  const [{ data: radios }, { data: precos }] = await Promise.all([
    supabase.from('radios').select('id, nome, cor, slogan').eq('id', R),
    supabase.from('tabela_precos').select('*').eq('radio_id', R).order('tipo').order('duracao').order('modalidade', { ascending: false }),
  ]);
  return <TelaPrecos radios={radios} precos={precos} searchParams={searchParams} acoes={acoes} />;
}

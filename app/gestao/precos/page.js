import { requireGestor } from '@/lib/auth';
import * as acoes from '../actions';
import TelaPrecos from './Tela';

export default async function TabelaPrecos({ searchParams }) {
  const { supabase } = await requireGestor();
  const [{ data: radios }, { data: precos }] = await Promise.all([
    supabase.from('radios').select('id, nome, cor, slogan').order('ordem'),
    supabase.from('tabela_precos').select('*').order('tipo').order('duracao').order('modalidade', { ascending: false }),
  ]);
  return <TelaPrecos radios={radios} precos={precos} searchParams={searchParams} acoes={acoes} />;
}

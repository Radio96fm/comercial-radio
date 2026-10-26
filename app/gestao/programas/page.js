import { requireGestor } from '@/lib/auth';
import * as acoes from '../actions';
import TelaProgramas from './Tela';

export default async function ProgramasGestao({ searchParams }) {
  const { supabase } = await requireGestor();
  const [{ data: radios }, { data: programas }, { data: planos }, { data: condicoes }] = await Promise.all([
    supabase.from('radios').select('id, nome, cor, slogan').order('ordem'),
    supabase.from('programas_ocupacao').select('*').order('horario_inicio', { nullsFirst: false }),
    supabase.from('programa_planos').select('*').order('ordem'),
    supabase.from('condicoes_especiais').select('*').order('created_at', { ascending: false }),
  ]);
  return <TelaProgramas radios={radios} programas={programas} planos={planos} condicoes={condicoes} searchParams={searchParams} acoes={acoes} />;
}

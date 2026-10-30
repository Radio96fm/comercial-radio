import 'server-only';
import { cookies } from 'next/headers';

// Cada rádio é uma empresa à parte: as telas da gestão e do financeiro mostram
// só a rádio escolhida no topo (guardada no navegador), nunca as duas somadas.
export const COOKIE_RADIO = 'radio';

export async function radioAtual(supabase) {
  const { data } = await supabase.from('radios').select('id, nome, cor, razao_social, cnpj').order('ordem');
  const radios = data || [];
  const escolhida = cookies().get(COOKIE_RADIO)?.value;
  const radio = radios.find((r) => r.id === escolhida) || radios[0] || null;
  return { radio, radios };
}

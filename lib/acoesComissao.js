'use server';
import { revalidatePath } from 'next/cache';
import { getSessao } from '@/lib/auth';

// Grava quem ganha comissão em um contrato (quadro de contratos por vendedor).
// Usam: o desenvolvedor (/dev) e o financeiro, que organiza as comissões.
export async function salvarComissaoContrato({ contratoId, linhas, regra }) {
  const { supabase, perfil, isDev, isMaster } = await getSessao();
  if (!isDev && !isMaster && perfil.papel !== 'financeiro') return { erro: 'Sem permissão para mudar comissão.' };
  if (!contratoId || !Array.isArray(linhas) || !linhas.length) return { erro: 'Informe quem ganha a comissão.' };
  const { error } = await supabase.rpc('definir_comissao_contrato', { p_contrato: contratoId, p_linhas: linhas, p_regra: regra || '' });
  if (error) return { erro: error.message };
  // a comissão de todas as telas sai destas linhas: atualiza tudo
  revalidatePath('/', 'layout');
  return { ok: true };
}

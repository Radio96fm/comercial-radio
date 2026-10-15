'use server';
import { revalidatePath } from 'next/cache';
import { requireFinanceiro } from '@/lib/auth';
import { emitirBoleto } from '@/lib/cobranca';
import { hojeISO, parseValor } from '@/lib/format';

const atualizar = () => {
  revalidatePath('/gestao/financeiro', 'layout');
  revalidatePath('/financeiro', 'layout');
};

export async function mudarParcela(fd) {
  const { supabase } = await requireFinanceiro();
  const status = String(fd.get('status'));
  if (!['a_emitir', 'emitido', 'pago', 'cancelado'].includes(status)) return;
  const upd = { status };
  if (status === 'pago') upd.pago_em = String(fd.get('pago_em') || '') || hojeISO();
  else upd.pago_em = null;
  await supabase.from('parcelas').update(upd).eq('id', fd.get('id'));
  atualizar();
}

export async function salvarBoleto(_prev, fd) {
  const { supabase } = await requireFinanceiro();
  const url = String(fd.get('url_boleto') || '').trim() || null;
  const linha = String(fd.get('linha_digitavel') || '').trim() || null;
  const { error } = await supabase.from('parcelas').update({ url_boleto: url, linha_digitavel: linha, status: 'emitido' }).eq('id', fd.get('id'));
  if (error) return { erro: error.message };
  atualizar();
  return { ok: 'Boleto salvo. Já pode mandar para o cliente.' };
}

export async function emitirBoletoAcao(_prev, fd) {
  await requireFinanceiro();
  try { await emitirBoleto(fd.get('id')); } catch (e) { return { erro: e.message }; }
  atualizar();
  return { ok: 'Boleto emitido.' };
}

export async function pagarComissao(fd) {
  const { supabase } = await requireFinanceiro();
  await supabase.from('comissoes_pagas').upsert({
    vendedor_id: fd.get('vendedor_id'),
    mes: fd.get('mes'),
    valor: parseValor(fd.get('valor')) ?? 0,
    pago_em: hojeISO(),
  }, { onConflict: 'vendedor_id,mes' });
  atualizar();
}

export async function desfazerComissao(fd) {
  const { supabase } = await requireFinanceiro();
  await supabase.from('comissoes_pagas').delete().eq('id', fd.get('id'));
  atualizar();
}

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

// relatório de comissão mandado ao vendedor pelo WhatsApp
export async function registrarRelatorio(vendedorId, mes) {
  const { supabase } = await requireFinanceiro();
  if (!mes) return;
  await supabase.from('comissoes_nf').upsert({ vendedor_id: vendedorId, mes, relatorio_em: new Date().toISOString() }, { onConflict: 'vendedor_id,mes' });
  atualizar();
}

export async function salvarNotaFiscal(_prev, fd) {
  const { supabase } = await requireFinanceiro();
  const vendedor_id = String(fd.get('vendedor_id'));
  const mes = String(fd.get('mes'));
  const nf_em = String(fd.get('nf_em') || '') || hojeISO();
  const { data: atual } = await supabase.from('comissoes_nf').select('relatorio_em').eq('vendedor_id', vendedor_id).eq('mes', mes).maybeSingle();
  const { error } = await supabase.from('comissoes_nf').upsert({
    vendedor_id, mes, nf_em, nf_numero: String(fd.get('nf_numero') || '').trim() || null, relatorio_em: atual?.relatorio_em || null,
  }, { onConflict: 'vendedor_id,mes' });
  if (error) return { erro: error.message };
  atualizar();
  return { ok: 'Nota fiscal registrada. Agora é só pagar.' };
}

export async function desfazerNotaFiscal(fd) {
  const { supabase } = await requireFinanceiro();
  await supabase.from('comissoes_nf').update({ nf_em: null, nf_numero: null }).eq('vendedor_id', fd.get('vendedor_id')).eq('mes', fd.get('mes'));
  atualizar();
}

import { requireFinanceiro } from '@/lib/auth';
import { lerPeriodo, periodoComissao, comissoesNoPeriodo } from '@/lib/financeiro';
import { hojeISO, data, STATUS_PARCELA, STATUS_CONTRATO } from '@/lib/format';
import { radioAtual } from '@/lib/radio';

export const dynamic = 'force-dynamic';

// Planilha CSV no padrão do Excel brasileiro (ponto e vírgula, vírgula decimal)
const num = (v) => Number(v || 0).toFixed(2).replace('.', ',');
const cel = (v) => {
  const s = String(v ?? '');
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (linhas) => `﻿${linhas.map((l) => l.map(cel).join(';')).join('\r\n')}`;

export async function GET(req) {
  const { supabase } = await requireFinanceiro();
  // cada rádio é uma empresa: a planilha é só da rádio escolhida no topo
  const { radio } = await radioAtual(supabase);
  const R = radio?.id;
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const vend = sp.vendedor || '';
  const hoje = hojeISO();
  let linhas;
  let nome;

  if (sp.tipo === 'comissoes') {
    const per = periodoComissao(sp);
    const lista = await comissoesNoPeriodo(supabase, per.de, per.ate, vend || null, per.mes, R);
    linhas = [['Vendedor', 'Cliente', 'Contrato', 'Parcela', 'Pago em', 'Valor recebido', '%', 'Comissão', 'Comissão paga em']];
    lista.forEach((v) => v.itens.forEach((p) => linhas.push([
      v.nome, p.contrato.cliente_nome, p.contrato.numero, `${p.numero}ª`, data(p.pago_em), num(p.valor), String(v.pct).replace('.', ','), num(p.comissao), v.pago ? data(v.pago.pago_em) : v.nf?.nf_em ? `NF ${v.nf.nf_numero || ''} recebida` : 'A pagar',
    ])));
    lista.forEach((v) => linhas.push([`TOTAL ${v.nome}`, '', '', '', '', num(v.recebido), '', num(v.comissao), '']));
    nome = `comissoes-${per.de}-a-${per.ate}`;
  } else if (sp.tipo === 'contratos') {
    const per = lerPeriodo(sp);
    let q = supabase.from('contratos')
      .select('numero, cliente_nome, status, data_inicio, data_fim, valor_mensal, meses, created_at, cliente:clientes(documento), vendedor:profiles(nome), programa:programas(nome), radio:radios(nome), parcelas(status)')
      .eq('radio_id', R).gte('created_at', `${per.de}T00:00:00`).lte('created_at', `${per.ate}T23:59:59`).order('numero');
    if (vend) q = q.eq('vendedor_id', vend);
    if (sp.status) q = q.eq('status', sp.status);
    const { data: lista } = await q;
    linhas = [['Nº', 'Cliente', 'CNPJ/CPF', 'Vendedor', 'Rádio', 'Programa', 'Valor mensal', 'Meses', 'Valor total', 'Início', 'Fim', 'Parcelas pagas', 'Situação']];
    (lista || []).forEach((c) => linhas.push([
      c.numero, c.cliente_nome, c.cliente?.documento, c.vendedor?.nome, c.radio?.nome, c.programa?.nome || 'Avulso', num(c.valor_mensal), c.meses, num(c.valor_mensal * c.meses),
      data(c.data_inicio), data(c.data_fim), `${(c.parcelas || []).filter((p) => p.status === 'pago').length}/${(c.parcelas || []).length}`, STATUS_CONTRATO[c.status],
    ]));
    nome = `contratos-${per.chave}`;
  } else {
    const per = lerPeriodo(sp);
    const sit = sp.situacao || '';
    let q = supabase.from('parcelas')
      .select('numero, vencimento, valor, status, pago_em, linha_digitavel, url_boleto, contrato:contratos!inner(numero, status, vendedor_id, cliente_nome, cliente:clientes(documento, telefone, email), vendedor:profiles(nome), radio:radios(nome))')
      .neq('contrato.status', 'cancelado').eq('contrato.radio_id', R).order('vencimento');
    if (vend) q = q.eq('contrato.vendedor_id', vend);
    if (sit === 'atrasadas') q = q.in('status', ['a_emitir', 'emitido']).lt('vencimento', hoje);
    else {
      if (sit === 'pagas') q = q.eq('status', 'pago').gte('pago_em', per.de).lte('pago_em', per.ate);
      else q = q.gte('vencimento', per.de).lte('vencimento', per.ate);
      if (sit === 'abertas') q = q.in('status', ['a_emitir', 'emitido']);
      if (sit === 'a_emitir') q = q.eq('status', 'a_emitir');
    }
    const { data: lista } = await q;
    linhas = [['Cliente', 'CNPJ/CPF', 'Telefone', 'E-mail', 'Contrato', 'Parcela', 'Vencimento', 'Valor', 'Situação', 'Pago em', 'Vendedor', 'Rádio', 'Linha digitável', 'Link do boleto']];
    (lista || []).forEach((p) => {
      const atrasada = ['a_emitir', 'emitido'].includes(p.status) && p.vencimento < hoje;
      linhas.push([
        p.contrato.cliente_nome, p.contrato.cliente?.documento, p.contrato.cliente?.telefone, p.contrato.cliente?.email, p.contrato.numero, `${p.numero}ª`, data(p.vencimento), num(p.valor),
        atrasada ? 'Em atraso' : STATUS_PARCELA[p.status], data(p.pago_em), p.contrato.vendedor?.nome, p.contrato.radio?.nome, p.linha_digitavel, p.url_boleto,
      ]);
    });
    nome = `parcelas-${sit || 'todas'}-${per.chave}`;
  }

  linhas.unshift([`${radio?.razao_social || radio?.nome || ''}${radio?.cnpj ? ` · CNPJ ${radio.cnpj}` : ''}`], []);
  nome = `${(radio?.nome || 'radio').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${nome}`;
  return new Response(csv(linhas), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${nome}.csv"`,
      'cache-control': 'no-store',
    },
  });
}

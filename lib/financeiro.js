import 'server-only';
import { hojeISO, somarDias, somarMeses, moeda, data } from '@/lib/format';
import { mesDaComissao, nomeMes, DIA_CORTE } from '@/lib/ganhos';

// Filtro de período do painel financeiro: últimos 30 dias (padrão) ou um mês
export function lerPeriodo(searchParams) {
  const hoje = hojeISO();
  const p = typeof searchParams?.periodo === 'string' ? searchParams.periodo : '30d';
  if (/^\d{4}-\d{2}$/.test(p)) {
    const de = `${p}-01`;
    return { chave: p, de, ate: somarDias(somarMeses(de, 1), -1), rotulo: nomeMes(p) };
  }
  if (p === '90d') return { chave: p, de: somarDias(hoje, -89), ate: hoje, rotulo: 'últimos 90 dias' };
  return { chave: '30d', de: somarDias(hoje, -29), ate: hoje, rotulo: 'últimos 30 dias' };
}

export function opcoesPeriodo() {
  const atual = hojeISO().slice(0, 7);
  const meses = Array.from({ length: 12 }, (_, i) => somarMeses(`${atual}-01`, -i).slice(0, 7));
  return [['30d', 'Últimos 30 dias'], ['90d', 'Últimos 90 dias'], ...meses.map((m) => [m, nomeMes(m)])];
}

// Janela de pagamentos que fecham a comissão do mês: dia 21 do mês anterior até o dia 20
export function janelaComissao(mes) {
  const ate = `${mes}-${String(DIA_CORTE).padStart(2, '0')}`;
  const de = somarDias(somarMeses(ate, -1), 1);
  return { de, ate };
}

// Comissão de cada vendedor no fechamento do mês (só vendas registradas no sistema)
export async function comissoesDoMes(supabase, mes, vendedorId) {
  const { de, ate } = janelaComissao(mes);
  let qv = supabase.from('profiles').select('id, nome, comissao, papel, ativo').in('papel', ['vendedor', 'gestor', 'comercial']).order('nome');
  if (vendedorId) qv = qv.eq('id', vendedorId);
  const [{ data: vendedores }, { data: parcelas }, { data: pagas }] = await Promise.all([
    qv,
    supabase.from('parcelas')
      .select('id, numero, valor, pago_em, vencimento, contrato:contratos!inner(id, numero, cliente_nome, vendedor_id, status)')
      .eq('status', 'pago').gte('pago_em', de).lte('pago_em', ate).neq('contrato.status', 'cancelado'),
    supabase.from('comissoes_pagas').select('*').eq('mes', mes),
  ]);
  return (vendedores || []).map((v) => {
    const pct = Number(v.comissao ?? 18);
    const itens = (parcelas || []).filter((p) => p.contrato.vendedor_id === v.id && mesDaComissao(p.pago_em) === mes)
      .map((p) => ({ ...p, comissao: (Number(p.valor) * pct) / 100 }));
    const recebido = itens.reduce((s, p) => s + Number(p.valor), 0);
    const comissao = itens.reduce((s, p) => s + p.comissao, 0);
    return { ...v, pct, itens, recebido, comissao, pago: (pagas || []).find((x) => x.vendedor_id === v.id) || null };
  }).filter((v) => v.itens.length || v.pago || vendedorId);
}

export function mensagemCobranca(p) {
  const cliente = p.contrato?.cliente?.contato_nome?.split(' ')[0] || p.contrato?.cliente?.nome || '';
  const linhas = [
    `Olá${cliente ? `, ${cliente}` : ''}! Tudo bem?`,
    `Aqui é do financeiro da ${p.contrato?.radio?.nome || 'Rádio 96 FM'}.`,
    `Segue a ${p.numero}ª parcela do seu contrato de patrocínio: ${moeda(p.valor)}, com vencimento em ${data(p.vencimento)}.`,
  ];
  if (p.url_boleto) linhas.push(`Boleto: ${p.url_boleto}`);
  if (p.linha_digitavel) linhas.push(`Linha digitável: ${p.linha_digitavel}`);
  linhas.push('Qualquer dúvida, é só chamar. Obrigado!');
  return linhas.join('\n');
}

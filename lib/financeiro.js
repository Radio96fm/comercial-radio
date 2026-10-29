import 'server-only';
import { hojeISO, somarDias, somarMeses, moeda, data } from '@/lib/format';
import { mesDaComissao, nomeMes, DIA_CORTE } from '@/lib/ganhos';
import { pctNoContrato } from '@/lib/comissao';

// Filtro de período do painel financeiro: últimos 30 dias (padrão) ou um mês
export function lerPeriodo(searchParams) {
  const hoje = hojeISO();
  const p = typeof searchParams?.periodo === 'string' ? searchParams.periodo : '30d';
  if (/^\d{4}-\d{2}$/.test(p)) {
    const de = `${p}-01`;
    return { chave: p, de, ate: somarDias(somarMeses(de, 1), -1), rotulo: nomeMes(p) };
  }
  if (p === 'tudo') return { chave: p, de: '2000-01-01', ate: hoje, rotulo: 'todo o período' };
  if (p === '90d') return { chave: p, de: somarDias(hoje, -89), ate: hoje, rotulo: 'últimos 90 dias' };
  return { chave: '30d', de: somarDias(hoje, -29), ate: hoje, rotulo: 'últimos 30 dias' };
}

export function opcoesPeriodo() {
  const atual = hojeISO().slice(0, 7);
  const meses = Array.from({ length: 12 }, (_, i) => somarMeses(`${atual}-01`, -i).slice(0, 7));
  return [['30d', 'Últimos 30 dias'], ['90d', 'Últimos 90 dias'], ...meses.map((m) => [m, nomeMes(m)]), ['tudo', 'Todo o período']];
}

// Janela de pagamentos que fecham a comissão do mês: dia 21 do mês anterior até o dia 20
export function janelaComissao(mes) {
  const ate = `${mes}-${String(DIA_CORTE).padStart(2, '0')}`;
  const de = somarDias(somarMeses(ate, -1), 1);
  return { de, ate };
}

const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const mesLongo = (chave) => `${MESES_LONGOS[Number(chave.slice(5, 7)) - 1]} de ${chave.slice(0, 4)}`;
const maiuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const dataCurta = (iso) => data(iso).slice(0, 5);
const ehData = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

// Fechamentos de comissão (dia 21 do mês anterior até o dia 20): os próximos e os anteriores
export function fechamentos(antes = 11, depois = 2) {
  const atual = mesDaComissao(hojeISO());
  return Array.from({ length: antes + depois + 1 }, (_, i) => {
    const mes = somarMeses(`${atual}-01`, depois - i).slice(0, 7);
    const { de, ate } = janelaComissao(mes);
    return { mes, de, ate, atual: mes === atual, rotulo: maiuscula(mesLongo(mes)), faixa: `${dataCurta(de)} a ${dataCurta(ate)}` };
  });
}

// Período escolhido na tela de comissões: datas livres (de/até) ou um fechamento (mes)
export function periodoComissao(sp) {
  let { de, ate } = janelaComissao(/^\d{4}-\d{2}$/.test(sp?.mes || '') ? sp.mes : mesDaComissao(hojeISO()));
  if (ehData(sp?.de) && ehData(sp?.ate) && sp.de <= sp.ate) ({ de, ate } = sp);
  // é um fechamento exato? então dá para controlar nota fiscal e pagamento
  const mes = mesDaComissao(ate);
  const j = janelaComissao(mes);
  const exato = j.de === de && j.ate === ate;
  return { de, ate, mes: exato ? mes : null, rotulo: exato ? `Fechamento de ${mesLongo(mes)}` : 'Período escolhido', faixa: `${data(de)} a ${data(ate)}` };
}

// Comissão de cada vendedor sobre as parcelas pagas no período (só vendas registradas no sistema)
export async function comissoesNoPeriodo(supabase, de, ate, vendedorId, mes = null) {
  let qv = supabase.from('profiles').select('id, nome, comissao, papel, ativo, telefone, email, documento').in('papel', ['vendedor', 'gestor', 'comercial']).order('nome');
  if (vendedorId) qv = qv.eq('id', vendedorId);
  const [{ data: vendedores }, { data: parcelas }, { data: pagas }, { data: nfs }, { data: reps }, { data: abertas }] = await Promise.all([
    qv,
    supabase.from('parcelas')
      .select('id, numero, valor, pago_em, vencimento, contrato:contratos!inner(id, numero, cliente_nome, vendedor_id, importado, status, meses)')
      .eq('status', 'pago').gte('pago_em', de).lte('pago_em', ate).neq('contrato.status', 'cancelado').order('pago_em'),
    mes ? supabase.from('comissoes_pagas').select('*').eq('mes', mes) : Promise.resolve({ data: [] }),
    mes ? supabase.from('comissoes_nf').select('*').eq('mes', mes) : Promise.resolve({ data: [] }),
    supabase.from('representantes').select('id, profile_id').not('profile_id', 'is', null),
    // parcelas que vencem no período e ainda não foram pagas: comissão prevista
    supabase.from('parcelas')
      .select('id, numero, valor, vencimento, contrato:contratos!inner(id, numero, cliente_nome, vendedor_id, importado, status, meses)')
      .in('status', ['a_emitir', 'emitido']).gte('vencimento', de).lte('vencimento', ate).in('contrato.status', ['ativo', 'pendente', 'encerrado']),
  ]);
  // quem ganha quanto em cada contrato do período
  const idsContratos = [...new Set([...(parcelas || []), ...(abertas || [])].map((p) => p.contrato.id))];
  const { data: linhas } = idsContratos.length
    ? await supabase.from('contrato_comissoes').select('contrato_id, representante_id, papel, percentual, base, desconto').eq('vigente', true).in('contrato_id', idsContratos)
    : { data: [] };
  return (vendedores || []).map((v) => {
    const pct = Number(v.comissao ?? 18);
    const repIds = new Set((reps || []).filter((r) => r.profile_id === v.id).map((r) => r.id));
    const comPct = (lista) => (lista || []).map((p) => {
      const { pct: pctParcela } = pctNoContrato({ contrato: p.contrato, linhasContrato: (linhas || []).filter((l) => l.contrato_id === p.contrato.id), repIds, perfilId: v.id, pctPerfil: pct });
      return { ...p, pct: pctParcela, comissao: (Number(p.valor) * pctParcela) / 100 };
    }).filter((p) => p.pct > 0);
    const itens = comPct(parcelas);
    const aReceber = comPct(abertas);
    const previsto = aReceber.reduce((s, p) => s + p.comissao, 0);
    const recebido = itens.reduce((s, p) => s + Number(p.valor), 0);
    const comissao = itens.reduce((s, p) => s + p.comissao, 0);
    const pago = (pagas || []).find((x) => x.vendedor_id === v.id) || null;
    const nf = (nfs || []).find((x) => x.vendedor_id === v.id) || null;
    const etapa = pago ? 'paga' : nf?.nf_em ? 'nf' : nf?.relatorio_em ? 'enviado' : 'apagar';
    // % mostrado no relatório: o dos contratos, quando é um só
    const pcts = [...new Set([...itens, ...aReceber].map((p) => Math.round(p.pct * 100) / 100))];
    return { ...v, pct: pcts.length === 1 ? pcts[0] : pct, itens, recebido, comissao, aReceber, previsto, pago, nf, etapa };
  }).filter((v) => v.itens.length || v.aReceber.length || v.pago || vendedorId);
}

export const ETAPAS_COMISSAO = {
  apagar: ['A pagar', 'b-amarelo'],
  enviado: ['Relatório enviado', 'b-azul'],
  nf: ['Nota fiscal recebida', 'b-azul'],
  paga: ['Paga', 'b-verde'],
};

// Comissão de cada vendedor no fechamento do mês
export async function comissoesDoMes(supabase, mes, vendedorId) {
  const { de, ate } = janelaComissao(mes);
  return comissoesNoPeriodo(supabase, de, ate, vendedorId, mes);
}

// Mensagem do relatório de comissão para o vendedor (WhatsApp)
export function mensagemComissao(v, per, linkPdf) {
  const linhas = [
    `Olá, ${v.nome.split(' ')[0]}! Tudo bem?`,
    `Segue o seu relatório de comissão de ${per.faixa}${per.mes ? ` (fechamento de ${mesLongo(per.mes)})` : ''}:`,
    '',
    ...v.itens.map((p) => `• ${p.contrato.cliente_nome} · ${p.numero}ª parcela paga em ${data(p.pago_em)}: ${moeda(p.valor)} → comissão ${moeda(p.comissao)}`),
    '',
    `Total recebido dos clientes: ${moeda(v.recebido)}`,
    `Sua comissão (${String(v.pct).replace('.', ',')}%): *${moeda(v.comissao)}*`,
    '',
    `Por favor, emita a nota fiscal no valor de ${moeda(v.comissao)} e me envie. Assim que a nota chegar, faço o pagamento.`,
  ];
  if (linkPdf) linhas.push('', `Relatório em PDF: ${linkPdf}`);
  linhas.push('', 'Obrigado!');
  return linhas.join('\n');
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

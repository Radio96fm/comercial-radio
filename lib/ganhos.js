import { hojeISO, somarDias, somarMeses } from '@/lib/format';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const nomeMes = (chave) => { const [y, m] = chave.split('-'); return `${MESES[Number(m) - 1]}/${y.slice(2)}`; };
const chaveMes = (iso) => iso.slice(0, 7);

// A comissão fecha todo dia 20: parcela paga até o dia 20 entra na comissão
// daquele mês; paga depois do dia 20, entra só no mês seguinte.
export const DIA_CORTE = 20;
export function mesDaComissao(iso) {
  return Number(iso.slice(8, 10)) <= DIA_CORTE ? chaveMes(iso) : chaveMes(somarMeses(`${iso.slice(0, 7)}-01`, 1));
}

// Comissão do vendedor: % sobre as parcelas dos contratos dele, mês a mês.
// Parcela paga: conta pela data do pagamento. Ainda não paga: conta pelo
// vencimento; se o boleto já foi emitido e passou do dia 20 sem pagar, fica
// "em atraso" e vai para o próximo fechamento.
// Contrato "aguardando assinatura" conta como previsão.
export async function calcularGanhos(supabase, perfil) {
  const pct = Number(perfil.comissao ?? 18);
  const hoje = hojeISO();
  const mesAtual = chaveMes(hoje);
  const mesPassado = chaveMes(somarMeses(`${mesAtual}-01`, -1));

  const [{ data: parcelas }, { data: contratos }] = await Promise.all([
    supabase
      .from('parcelas')
      .select('id, vencimento, valor, status, pago_em, contrato:contratos!inner(id, numero, status, vendedor_id, cliente_nome)')
      .eq('contrato.vendedor_id', perfil.id)
      .in('contrato.status', ['ativo', 'encerrado', 'pendente']),
    supabase
      .from('contratos')
      .select('id, numero, status, data_inicio, data_fim, valor_mensal, cliente_nome, programa:programas(nome), radio:radios(nome)')
      .eq('vendedor_id', perfil.id)
      .in('status', ['ativo', 'pendente'])
      .gte('data_fim', hoje)
      .order('data_fim'),
  ]);

  const porMes = {}; // { 'YYYY-MM': { certo, previsto } }
  const atrasadas = [];
  const fechamentoAtual = mesDaComissao(hoje);
  for (const p of parcelas || []) {
    if (p.status === 'cancelado') continue;
    const v = (Number(p.valor) * pct) / 100;
    let k;
    if (p.status === 'pago' || p.pago_em) {
      k = mesDaComissao(p.pago_em || p.vencimento);
    } else {
      k = mesDaComissao(p.vencimento);
      // boleto emitido, venceu e passou do dia 20 sem pagar: vai para o próximo fechamento
      if (p.status === 'emitido' && p.vencimento < hoje && k < fechamentoAtual) {
        k = fechamentoAtual;
        atrasadas.push({ ...p, comissao: v });
      } else if (p.status === 'emitido' && p.vencimento < hoje) {
        atrasadas.push({ ...p, comissao: v });
      }
    }
    porMes[k] = porMes[k] || { certo: 0, previsto: 0 };
    if (p.contrato.status === 'pendente') porMes[k].previsto += v; else porMes[k].certo += v;
  }
  const mes = (k) => porMes[k] || { certo: 0, previsto: 0 };

  // 6 meses para trás + 3 para frente
  const serie = [];
  for (let i = -5; i <= 3; i++) {
    const k = chaveMes(somarMeses(`${mesAtual}-01`, i));
    serie.push({ chave: k, nome: nomeMes(k), futuro: i > 0, atual: i === 0, ...mes(k) });
  }

  const atual = mes(mesAtual).certo;
  const anterior = mes(mesPassado).certo;
  const variacao = anterior > 0 ? ((atual - anterior) / anterior) * 100 : atual > 0 ? 100 : 0;

  const ativos = (contratos || []).filter((c) => c.status === 'ativo' && c.data_inicio <= hoje);
  const limite = somarDias(hoje, 90);
  const vencendo = (contratos || []).filter((c) => c.status === 'ativo' && c.data_fim <= limite);
  const pendentes = (contratos || []).filter((c) => c.status === 'pendente');

  // Sequência: meses seguidos, até o mês passado, com comissão recebida
  let sequencia = 0;
  for (let i = -1; i > -36; i--) {
    const k = chaveMes(somarMeses(`${mesAtual}-01`, i));
    if (!(mes(k).certo > 0)) break;
    sequencia += 1;
  }
  const recorde = Math.max(0, ...serie.filter((m) => !m.futuro && !m.atual).map((m) => m.certo));

  return {
    pct, atual, anterior, variacao, serie, ativos, vencendo, pendentes, atrasadas, sequencia, recorde,
    previstoMes: mes(mesAtual).previsto,
    mensalAtivos: ativos.reduce((s, c) => s + (Number(c.valor_mensal) * pct) / 100, 0),
  };
}

export function faltaParaVencer(dataFim) {
  const dias = Math.round((new Date(`${dataFim}T12:00:00Z`) - new Date(`${hojeISO()}T12:00:00Z`)) / 86400000);
  if (dias <= 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  if (dias < 45) return `vence em ${dias} dias`;
  const m = Math.round(dias / 30);
  return `vence em ${m} ${m === 1 ? 'mês' : 'meses'}`;
}

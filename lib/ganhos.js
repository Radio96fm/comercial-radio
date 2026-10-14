import { hojeISO, somarDias, somarMeses } from '@/lib/format';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const nomeMes = (chave) => { const [y, m] = chave.split('-'); return `${MESES[Number(m) - 1]}/${y.slice(2)}`; };
const chaveMes = (iso) => iso.slice(0, 7);

// Comissão do vendedor: % sobre as parcelas dos contratos dele, mês a mês
// (pelo vencimento). Contrato "aguardando assinatura" conta como previsão.
export async function calcularGanhos(supabase, perfil) {
  const pct = Number(perfil.comissao ?? 18);
  const hoje = hojeISO();
  const mesAtual = chaveMes(hoje);
  const mesPassado = chaveMes(somarMeses(`${mesAtual}-01`, -1));

  const [{ data: parcelas }, { data: contratos }] = await Promise.all([
    supabase
      .from('parcelas')
      .select('vencimento, valor, contrato:contratos!inner(status, vendedor_id)')
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
  for (const p of parcelas || []) {
    const k = chaveMes(p.vencimento);
    porMes[k] = porMes[k] || { certo: 0, previsto: 0 };
    const v = (Number(p.valor) * pct) / 100;
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

  return {
    pct, atual, anterior, variacao, serie, ativos, vencendo, pendentes,
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

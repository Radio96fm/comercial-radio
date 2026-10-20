import { somarDias, somarMeses } from '@/lib/format';

// Números do Painel do Diretor (dono das emissoras), a partir das linhas do banco.
// Fica separado da página para a conta ser a mesma em qualquer tela que usar.

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const soma = (l, campo = 'valor') => (l || []).reduce((s, x) => s + Number(x[campo] || 0), 0);
const primeiro = (nome = '') => nome.split(' ')[0];

// radioId: só os números de uma rádio (null = as duas juntas). Visitas não têm
// rádio no banco, então a equipe na rua fica igual nas duas.
export function montarPainel({ hoje, radios, contratos, novosMes, parcelas, abertas, vendedores, visitas, programas, radioId = null }) {
  const mesAtual = hoje.slice(0, 7);
  const em30 = somarDias(hoje, 30);
  const radiosTodas = radios || [];
  const radiosL = radiosTodas.filter((r) => !radioId || r.id === radioId);
  const nomeRadio = (id) => radiosTodas.find((r) => r.id === id)?.nome || '';
  // a rádio pode estar no contrato, no programa do contrato ou, na parcela, no contrato da parcela
  const daRadio = (x) => !radioId || (x.radio_id || x.programa?.radio_id || x.contrato?.radio_id || x.contrato?.programa?.radio_id) === radioId;

  // contrato de programa nem sempre grava a rádio: vem do programa
  const todos = (contratos || []).map((c) => ({ ...c, radio_id: c.radio_id || c.programa?.radio_id || null })).filter(daRadio);
  const ativos = todos.filter((c) => c.status === 'ativo');
  const pendentes = todos.filter((c) => c.status === 'pendente');
  const mensal = soma(ativos, 'valor_mensal');

  // faturamento: recebido x previsto por mês (últimos 6)
  const parcelasDaRadio = (parcelas || []).filter(daRadio);
  const novosDaRadio = (novosMes || []).filter(daRadio);
  const serie = Array.from({ length: 6 }, (_, i) => {
    const chave = somarMeses(`${mesAtual}-01`, i - 5).slice(0, 7);
    return {
      chave,
      rotulo: MES[Number(chave.slice(5)) - 1],
      recebido: soma(parcelasDaRadio.filter((p) => p.status === 'pago' && p.pago_em?.slice(0, 7) === chave)),
      previsto: soma(parcelasDaRadio.filter((p) => p.vencimento.slice(0, 7) === chave)),
    };
  });
  const mes = serie[5];
  const mesAnterior = serie[4];
  const pctMes = mes.previsto ? Math.min(100, Math.round((mes.recebido / mes.previsto) * 100)) : 0;
  const variacao = mesAnterior.recebido ? Math.round(((mes.recebido - mesAnterior.recebido) / mesAnterior.recebido) * 100) : null;
  const aReceber = soma(ativos.flatMap((c) => (c.parcelas || []).filter((p) => ['a_emitir', 'emitido'].includes(p.status))));
  const porRadio = radiosL.map((r) => {
    const doRadio = ativos.filter((c) => c.radio_id === r.id);
    return { id: r.id, nome: r.nome, cor: r.cor, contratos: doRadio.length, mensal: soma(doRadio, 'valor_mensal') };
  });

  // em atraso
  const atrasadas = (abertas || []).filter(daRadio).filter((p) => p.vencimento < hoje);
  const atrasoPorCliente = Object.values(atrasadas.reduce((acc, p) => {
    const k = p.contrato?.cliente_nome || 'Cliente';
    acc[k] = acc[k] || { cliente: k, vendedor: primeiro(p.contrato?.vendedor?.nome), valor: 0, parcelas: 0, desde: p.vencimento };
    acc[k].valor += Number(p.valor);
    acc[k].parcelas += 1;
    if (p.vencimento < acc[k].desde) acc[k].desde = p.vencimento;
    return acc;
  }, {})).sort((a, b) => b.valor - a.valor);

  // vencendo
  const vencendo = ativos.filter((c) => c.data_fim >= hoje && c.data_fim <= em30)
    .sort((a, b) => a.data_fim.localeCompare(b.data_fim))
    .map((c) => ({ id: c.id, cliente: c.cliente_nome, programa: c.programa?.nome || 'Pacote avulso', radio: nomeRadio(c.radio_id), vendedor: primeiro(c.vendedor?.nome), fim: c.data_fim, mensal: Number(c.valor_mensal) }));
  const vencendo60 = ativos.filter((c) => c.data_fim > em30 && c.data_fim <= somarDias(hoje, 60)).length;

  // equipe
  const desde30 = `${somarDias(hoje, -30)}T00:00:00`;
  const visitas30 = (visitas || []).filter((v) => v.iniciada_em >= desde30);
  const equipe = (vendedores || []).map((v) => {
    const meus = ativos.filter((c) => c.vendedor_id === v.id);
    return {
      id: v.id,
      nome: v.nome,
      papel: v.papel,
      ativos: meus.length,
      mensal: soma(meus, 'valor_mensal'),
      novosMes: novosDaRadio.filter((c) => c.vendedor_id === v.id).length,
      visitas30: visitas30.filter((x) => x.vendedor_id === v.id).length,
      emVisita: (visitas || []).filter((x) => x.vendedor_id === v.id && x.status === 'em_andamento').length,
      pendentes: pendentes.filter((c) => c.vendedor_id === v.id).length,
    };
  }).filter((v) => v.papel === 'vendedor' || v.ativos || v.novosMes || v.visitas30)
    .sort((a, b) => b.ativos - a.ativos || b.mensal - a.mensal || b.visitas30 - a.visitas30);
  const soVendedores = equipe.filter((v) => v.papel === 'vendedor');
  const comContrato = soVendedores.filter((v) => v.ativos > 0);
  const lider = equipe[0]?.ativos ? equipe[0] : null;

  // grade
  const progs = (programas || []).filter((p) => !radioId || p.radio_id === radioId);
  const cotas = progs.reduce((s, p) => s + p.cotas_total, 0);
  const ocupadas = progs.reduce((s, p) => s + p.cotas_ocupadas, 0);
  const grade = radiosL.map((r) => {
    const doRadio = progs.filter((p) => p.radio_id === r.id);
    return {
      id: r.id, nome: r.nome, cor: r.cor,
      cotas: doRadio.reduce((s, p) => s + p.cotas_total, 0),
      ocupadas: doRadio.reduce((s, p) => s + p.cotas_ocupadas, 0),
      programas: doRadio.map((p) => ({ nome: p.nome, total: p.cotas_total, ocupadas: p.cotas_ocupadas, livres: p.cotas_livres })),
    };
  });

  return {
    radio: { atual: radioId, opcoes: radiosTodas },
    faturamento: { mensal, aReceber, mes, mesAnterior, pctMes, variacao, serie, porRadio },
    contratos: {
      ativos: ativos.length,
      pendentes: pendentes.length,
      valorPendentes: soma(pendentes, 'valor_mensal'),
      novosMes: novosDaRadio.length,
      valorNovosMes: soma(novosDaRadio, 'valor_mensal'),
      porRadio,
      maiores: [...ativos].sort((a, b) => b.valor_mensal - a.valor_mensal).slice(0, 5)
        .map((c) => ({ id: c.id, cliente: c.cliente_nome, programa: c.programa?.nome || 'Pacote avulso', vendedor: primeiro(c.vendedor?.nome), mensal: Number(c.valor_mensal) })),
    },
    vencendo: { lista: vencendo, mensal: soma(vencendo, 'mensal'), proximos60: vencendo60 },
    atraso: { valor: soma(atrasadas), parcelas: atrasadas.length, clientes: atrasoPorCliente },
    equipe: {
      lista: equipe,
      vendedores: soVendedores.length,
      comContrato: comContrato.length,
      lider,
      visitas30: visitas30.length,
      emVisita: new Set((visitas || []).filter((v) => v.status === 'em_andamento').map((v) => v.vendedor_id)).size,
      fechadas30: visitas30.filter((v) => v.status === 'fechado').length,
    },
    grade: { cotas, ocupadas, pct: cotas ? Math.round((ocupadas / cotas) * 100) : 0, radios: grade },
  };
}

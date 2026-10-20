import { somarDias, somarMeses } from '@/lib/format';
import { prazoVisita } from '@/lib/prazo';

// Números do Painel Comercial (diretor comercial): só desempenho da equipe.
// Nada de valores em R$, parcelas ou faturamento entra aqui nem nas consultas
// que alimentam a tela.

const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const primeiro = (nome = '') => nome.split(' ')[0];
const DIA = 86400000;
const diasEntre = (de, ate) => Math.round((new Date(`${ate}T12:00:00Z`) - new Date(`${de.slice(0, 10)}T12:00:00Z`)) / DIA);
export const PARADO_DIAS = 7;

export function montarComercial({ hoje, radios, contratos, novos, vendedores, visitas, liberadas, programas }) {
  const mesAtual = hoje.slice(0, 7);
  const inicioMes = `${mesAtual}-01`;
  const inicioAnt = somarMeses(inicioMes, -1);
  const mesmoDiaAnt = somarMeses(hoje, -1);
  const desde30 = somarDias(hoje, -30);
  const desde7 = somarDias(hoje, -7);
  const em30 = somarDias(hoje, 30);
  const radiosL = radios || [];
  const vis = visitas || [];
  const livres = new Set((liberadas || []).map((l) => l.visita_id));

  // contrato de programa nem sempre grava a rádio: vem do programa
  const todos = (contratos || []).map((c) => ({ ...c, radio_id: c.radio_id || c.programa?.radio_id || null }));
  const ativos = todos.filter((c) => c.status === 'ativo');
  const pendentes = todos.filter((c) => c.status === 'pendente');

  // vendas (contratos novos, sem os cancelados)
  const dia = (x) => (x || '').slice(0, 10);
  const vendasMes = (novos || []).filter((c) => dia(c.created_at) >= inicioMes);
  const vendasAntAteHoje = (novos || []).filter((c) => dia(c.created_at) >= inicioAnt && dia(c.created_at) <= mesmoDiaAnt);
  const vendasAnt = (novos || []).filter((c) => dia(c.created_at) >= inicioAnt && dia(c.created_at) < inicioMes);

  // visitas
  const visMes = vis.filter((v) => dia(v.iniciada_em) >= inicioMes);
  const vis30 = vis.filter((v) => dia(v.iniciada_em) >= desde30);
  const vis7 = vis.filter((v) => dia(v.iniciada_em) >= desde7);
  const funil = {
    visitas: vis30.length,
    propostas: vis30.filter((v) => ['proposta', 'fechado'].includes(v.status)).length,
    fechadas: vis30.filter((v) => v.status === 'fechado').length,
    perdidas: vis30.filter((v) => v.status === 'perdido').length,
    abertas: vis30.filter((v) => ['em_andamento', 'proposta'].includes(v.status)).length,
  };
  funil.conversao = funil.visitas ? Math.round((funil.fechadas / funil.visitas) * 100) : 0;

  // negociações abertas (empresa travada para o vendedor) e prazo de exclusividade
  const negociacoes = vis.filter((v) => ['em_andamento', 'proposta'].includes(v.status) && !livres.has(v.id))
    .map((v) => {
      const p = prazoVisita(v.iniciada_em, v.prazo_extra_dias || 0);
      return {
        id: v.id, cliente: v.cliente?.nome || 'Empresa', vendedor: primeiro(v.vendedor?.nome), vendedor_id: v.vendedor_id,
        status: v.status, restam: p.restam, ate: p.ate, urgente: p.avisar, vencido: p.vencido, dias: diasEntre(v.iniciada_em, hoje),
      };
    })
    .sort((a, b) => a.restam - b.restam);
  const urgentes = negociacoes.filter((n) => n.urgente);
  const vencidas = negociacoes.filter((n) => n.vencido);

  // renovações
  const nomeProg = (c) => c.programa?.nome || 'Pacote avulso';
  const renovar = ativos.filter((c) => c.data_fim >= hoje && c.data_fim <= em30)
    .sort((a, b) => a.data_fim.localeCompare(b.data_fim))
    .map((c) => ({ id: c.id, cliente: c.cliente_nome, programa: nomeProg(c), vendedor: primeiro(c.vendedor?.nome), vendedor_id: c.vendedor_id, fim: c.data_fim, dias: diasEntre(hoje, c.data_fim) }));
  const renovar60 = ativos.filter((c) => c.data_fim > em30 && c.data_fim <= somarDias(hoje, 60)).length;

  // aguardando assinatura
  const assinatura = pendentes
    .map((c) => ({ id: c.id, cliente: c.cliente_nome, programa: nomeProg(c), vendedor: primeiro(c.vendedor?.nome), dias: diasEntre(c.created_at, hoje) }))
    .sort((a, b) => b.dias - a.dias);

  // cada vendedor
  const equipe = (vendedores || []).map((v) => {
    const minhas = vis.filter((x) => x.vendedor_id === v.id);
    const minhas30 = vis30.filter((x) => x.vendedor_id === v.id);
    const fechadas30 = minhas30.filter((x) => x.status === 'fechado').length;
    const ultima = minhas.reduce((m, x) => (x.iniciada_em > m ? x.iniciada_em : m), '');
    return {
      id: v.id,
      nome: v.nome,
      papel: v.papel,
      vendasMes: vendasMes.filter((c) => c.vendedor_id === v.id).length,
      vendasAnt: vendasAnt.filter((c) => c.vendedor_id === v.id).length,
      visitasMes: visMes.filter((x) => x.vendedor_id === v.id).length,
      visitas7: vis7.filter((x) => x.vendedor_id === v.id).length,
      visitas30: minhas30.length,
      fechadas30,
      conversao: minhas30.length ? Math.round((fechadas30 / minhas30.length) * 100) : null,
      negociando: negociacoes.filter((n) => n.vendedor_id === v.id).length,
      carteira: ativos.filter((c) => c.vendedor_id === v.id).length,
      pendentes: pendentes.filter((c) => c.vendedor_id === v.id).length,
      renovar: renovar.filter((c) => c.vendedor_id === v.id).length,
      semVisitaDias: ultima ? diasEntre(ultima, hoje) : null,
    };
  }).filter((v) => v.papel === 'vendedor' || v.vendasMes || v.visitas30 || v.carteira)
    .sort((a, b) => b.vendasMes - a.vendasMes || b.visitasMes - a.visitasMes || b.carteira - a.carteira);

  const soVendedores = equipe.filter((v) => v.papel === 'vendedor');
  const parados = soVendedores.filter((v) => v.semVisitaDias === null || v.semVisitaDias >= PARADO_DIAS)
    .sort((a, b) => (b.semVisitaDias ?? 999) - (a.semVisitaDias ?? 999));
  const lider = equipe[0]?.vendasMes ? equipe[0] : null;
  const maisVisitas = [...equipe].sort((a, b) => b.visitasMes - a.visitasMes)[0];
  const melhorConversao = equipe.filter((v) => v.visitas30 >= 3).sort((a, b) => b.conversao - a.conversao)[0];
  const maiorCarteira = [...equipe].sort((a, b) => b.carteira - a.carteira)[0];

  // grade: o que ainda dá para vender
  const progs = programas || [];
  const cotas = progs.reduce((s, p) => s + p.cotas_total, 0);
  const ocupadas = progs.reduce((s, p) => s + p.cotas_ocupadas, 0);
  const grade = radiosL.map((r) => {
    const doRadio = progs.filter((p) => p.radio_id === r.id);
    return {
      id: r.id, nome: r.nome, cor: r.cor,
      cotas: doRadio.reduce((s, p) => s + p.cotas_total, 0),
      livres: doRadio.reduce((s, p) => s + p.cotas_livres, 0),
      programas: doRadio.map((p) => ({ nome: p.nome, total: p.cotas_total, livres: p.cotas_livres }))
        .sort((a, b) => b.livres - a.livres),
    };
  });

  // o que pede atenção do líder hoje
  const prioridades = [
    ...urgentes.slice(0, 2).map((n) => ({ id: `n${n.id}`, tom: 'amarelo', abre: 'prazo', titulo: `Ajude ${n.vendedor} a fechar ${n.cliente}`, sub: `A exclusividade acaba em ${n.restam === 1 ? '1 dia' : `${n.restam} dias`} (${n.ate})` })),
    ...renovar.filter((c) => c.dias <= 15).slice(0, 2).map((c) => ({ id: `r${c.id}`, tom: 'laranja', abre: 'renovar', titulo: `Renovar ${c.cliente}`, sub: `Com ${c.vendedor} · contrato vence em ${c.dias === 1 ? '1 dia' : `${c.dias} dias`}` })),
    ...parados.slice(0, 2).map((v) => ({ id: `p${v.id}`, tom: 'vermelho', abre: 'parados', titulo: `Converse com ${primeiro(v.nome)}`, sub: v.semVisitaDias === null ? 'Nenhuma visita registrada no último mês' : `${v.semVisitaDias} dias sem visitar clientes` })),
    ...assinatura.filter((c) => c.dias >= 7).slice(0, 1).map((c) => ({ id: `a${c.id}`, tom: 'ouro', abre: 'assinatura', titulo: `Assinatura de ${c.cliente}`, sub: `Com ${c.vendedor} · esperando há ${c.dias} dias` })),
  ].slice(0, 6);

  return {
    mes: { nome: MES[Number(mesAtual.slice(5)) - 1], anterior: MES[Number(inicioAnt.slice(5, 7)) - 1] },
    vendas: { mes: vendasMes.length, antAteHoje: vendasAntAteHoje.length, anterior: vendasAnt.length },
    visitas: { mes: visMes.length, dias7: vis7.length, dias30: vis30.length },
    funil,
    negociacoes: { lista: negociacoes, urgentes, vencidas },
    renovar: { lista: renovar, proximos60: renovar60 },
    assinatura,
    equipe: { lista: equipe, vendedores: soVendedores.length, parados, lider, maisVisitas, melhorConversao, maiorCarteira, carteira: ativos.length },
    grade: { cotas, ocupadas, livres: cotas - ocupadas, pct: cotas ? Math.round((ocupadas / cotas) * 100) : 0, comVaga: progs.filter((p) => p.cotas_livres > 0).length, radios: grade },
    prioridades,
  };
}

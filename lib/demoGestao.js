import { somarDias } from '@/lib/format';
import { RADIOS, CLIENTES, CONTRATOS_DEMO, VISITAS_DEMO, gradeDemo, EQUIPE } from '@/lib/demoDados';

// Dados de demonstração da Gestão Comercial (/demo-gestao), da fonte única
// lib/demoDados.js. Mesmos recortes das consultas do /gestao. Sem valores em R$.
export function dadosDemoGestao(hoje) {
  const em30 = somarDias(hoje, 30);
  const vencendo = CONTRATOS_DEMO
    .filter((c) => ['ativo', 'pendente'].includes(c.status) && c.data_fim >= hoje && c.data_fim <= em30)
    .sort((a, b) => a.data_fim.localeCompare(b.data_fim));
  const visitas = VISITAS_DEMO.filter((v) => v.status === 'em_andamento')
    .sort((a, b) => b.iniciada_em.localeCompare(a.iniciada_em));

  const fatos = [
    ...CONTRATOS_DEMO.filter((c) => c.status !== 'cancelado').map((c) => ({
      created_at: c.created_at, descricao: `Contrato de ${c.cliente_nome} em ${c.programa.nome}`, usuario: c.vendedor,
    })),
    ...VISITAS_DEMO.map((v) => ({
      created_at: v.encerrada_em || v.iniciada_em,
      descricao: v.status === 'em_andamento' ? `Visita iniciada em ${v.cliente.nome}` : v.status === 'proposta' ? `Proposta enviada para ${v.cliente.nome}` : `Visita encerrada em ${v.cliente.nome}`,
      usuario: v.vendedor,
    })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6).map((a, i) => ({ id: `at${i}`, ...a }));

  return {
    hoje,
    radios: RADIOS,
    programas: gradeDemo(hoje),
    vencendo,
    visitas,
    pendentes: CONTRATOS_DEMO.filter((c) => c.status === 'pendente'),
    totalClientes: CLIENTES.length,
    totalVendedores: EQUIPE.filter((p) => p.papel === 'vendedor').length,
    atividades: fatos,
    visitasSerie: VISITAS_DEMO,
    clientesNovos: 3,
  };
}

// ---- Programas, planos, condições e preços da demonstração (valores fictícios)
const VALOR_BASE = { r96: 2400, ragro: 1900 };
const APRESENTADOR = {
  'Bom Dia Produtor': 'Zé do Campo', 'O Papo é com Ela': 'Carla Mendes', 'Rock Radio': 'Diego Rocha',
  'Hora do Rush I': 'Marcos Lima', 'Hora do Rush II': 'Marcos Lima', 'Agro em Foco': 'Paula Arantes',
  'Boa Tarde Produtor': 'Tião Ribeiro', 'Rio Verde Notícias 1ª Edição': 'Redação', 'Rio Verde Notícias 2ª Edição': 'Redação',
};

export function programasDemo(hoje) {
  return gradeDemo(hoje).map((p, i) => ({
    ...p,
    apresentador: APRESENTADOR[p.nome] || null,
    dias: 'Segunda a sexta',
    valor_cota: VALOR_BASE[p.radio_id] + (i % 4) * 300,
    meses_minimo: i % 3 === 0 ? 3 : 1,
    descricao: `${p.nome}, um dos programas de maior audiência da rádio em Rio Verde e região.`,
    descricao_cota: 'Citação de abertura e encerramento, 2 inserções de 30" por programa e menção nas redes sociais.',
    proposta_pdf: i % 3 === 1 ? `demo/${p.id}.pdf` : null,
    proposta_atualizada_em: i % 3 === 1 ? '2026-10-20T13:30:00Z' : null,
  }));
}

function planosDemo() {
  const lista = [];
  programasDemo('2026-10-26').forEach((p, i) => {
    const v = p.valor_cota;
    const plano = (n, nome, valor, descricao) => ({
      id: `pl${i}-${n}`, programa_id: p.id, nome, valor, ordem: n, descricao,
      valor_1: null, valor_3: null, valor_6: Math.round(valor * 0.92), valor_12: Math.round(valor * 0.85),
    });
    lista.push(plano(1, 'Plano 01', v, 'Citação de abertura e encerramento + 2 inserções de 30"'));
    if (i % 2 === 0) lista.push(plano(2, 'Plano 02', v + 900, 'Tudo do Plano 01 + testemunhal de 60" ao vivo'));
  });
  return lista;
}
export const PLANOS_DEMO = planosDemo();

export function condicoesDemo() {
  const amanha = new Date(Date.now() + 2 * 86400000).toISOString();
  return [
    { id: 'cd1', programa_id: 'p1', texto: 'Fechando 12 meses, o 1º mês sai pela metade', ativo: true, expira_em: amanha, created_at: '2026-10-24T12:00:00Z' },
    { id: 'cd2', programa_id: 'p9', texto: '6 meses com 10% de desconto até o fim do mês', ativo: true, expira_em: null, created_at: '2026-10-22T12:00:00Z' },
  ];
}

const ITENS_PRECO = [['insercao', 15, 'indeterminada', 45], ['insercao', 30, 'indeterminada', 70], ['insercao', 30, 'determinada', 95],
  ['insercao', 60, 'indeterminada', 120], ['testemunhal', 30, 'determinada', 140], ['testemunhal', 60, 'determinada', 220]];
export const PRECOS_DEMO = RADIOS.flatMap((r) => ITENS_PRECO.map(([tipo, duracao, modalidade, valor]) => ({
  id: `pr-${r.id}-${tipo}-${duracao}-${modalidade}`, radio_id: r.id, tipo, duracao, modalidade, ativo: true,
  valor: r.id === 'ragro' ? Math.round(valor * 0.8) : valor,
})));

import { somarDias, somarMeses } from '@/lib/format';

// Dados de demonstração do Painel do Diretor (link público de apresentação).
// Tudo fictício e com datas relativas a hoje, para nunca mostrar dados reais sem login.
const R96 = 'r96';
const AGRO = 'ragro';

const VENDEDORES = [
  ['v1', 'Ana Paula Rocha'], ['v2', 'Bruno Martins'], ['v3', 'Carla Mendes'], ['v4', 'Diego Alves'],
  ['v5', 'Elaine Souza'], ['v6', 'Fábio Lima'], ['v7', 'Gabriela Nunes'],
];

// cliente, status, valor/mês, meses até o fim, programa, rádio, parcelas pagas, a pagar, vendedor
const CONTRATOS = [
  ['Agropecuária Sol Nascente', 'ativo', 5000, 5, 'Agro em Foco', AGRO, 2, 4, 'v1'],
  ['Máquinas Forte Agro', 'ativo', 5000, 4, 'Agro em Foco', AGRO, 3, 3, 'v1'],
  ['LimpeLar', 'ativo', 1960, 3, 'O Papo é com Ela', R96, 0, 3, 'v2'],
  ['Cooperativa Campo Forte', 'ativo', 5000, 6, 'Agro em Foco', AGRO, 1, 5, 'v1'],
  ['Posto Estrada Verde', 'ativo', 5000, 5, 'Agro em Foco', AGRO, 2, 4, 'v3'],
  ['Veterinária Pet Campo', 'ativo', 5000, 3, 'Agro em Foco', AGRO, 3, 3, 'v1'],
  ['Clínica Vida Plena', 'ativo', 15000, 4, 'Alexandre Garcia: Comentário do Dia', AGRO, 3, 3, 'v4'],
  ['Academia Corpo Ativo', 'ativo', 15000, 5, 'Alexandre Garcia: Comentário do Dia', AGRO, 2, 4, 'v1'],
  ['Loja Casa Forte', 'ativo', 15000, 3, 'Alexandre Garcia: Comentário do Dia', AGRO, 4, 2, 'v4'],
  ['Restaurante Sabor da Roça', 'ativo', 15000, 6, 'Alexandre Garcia: Comentário do Dia', AGRO, 1, 5, 'v1'],
  ['Concessionária Serra Azul', 'ativo', 3350, 6, 'Rock Radio', R96, 1, 5, 'v3'],
  ['Telefonia Conecta', 'ativo', 3350, 5, 'Rock Radio', R96, 2, 4, 'v2'],
  ['Farmácia Vida Certa', 'ativo', 2630, 5, 'Hora Certa', R96, 2, 4, 'v1'],
  ['Supermercado Bom Preço', 'ativo', 2800, 3, 'Hora do Rush I', R96, 1, 3, 'v5'],
  ['Construforte Materiais', 'ativo', 2800, 0.8, 'Hora do Rush I', R96, 2, 1, 'v2'],
  ['Construtora Ipê', 'ativo', 3000, 3, 'Rio Verde Notícias 1ª Edição', AGRO, 1, 2, 'v1'],
  ['Padaria Pão Dourado', 'ativo', 2350, 0.5, 'Bom Dia Produtor', R96, 5, 1, 'v4'],
  ['Moda Estilo Rio Verde', 'pendente', 2630, 6, 'Hora Certa', R96, 0, 6, 'v3'],
  ['Ótica Visão Clara', 'pendente', 1960, 3, 'O Papo é com Ela', R96, 0, 3, 'v2'],
  ['Auto Peças Rodovia', 'pendente', 5000, 3, 'De Dentro da Porteira', AGRO, 0, 3, 'v1'],
  ['Sorveteria Gelato', 'pendente', 2350, 12, 'Bom Dia Produtor', R96, 0, 12, 'v5'],
];

const PROGRAMAS = [
  [R96, 'Bom Dia Produtor', 2], [R96, 'O Papo é com Ela', 1], [R96, 'Rock Radio', 2], [R96, 'Hora do Rush I', 2],
  [R96, 'Hora do Rush II', 0], [R96, 'Momento Produtor', 0], [R96, 'Hora Certa', 2],
  [AGRO, 'Alexandre Garcia: Comentário do Dia', 4], [AGRO, 'Agro em Foco', 5], [AGRO, 'De Dentro da Porteira', 1],
  [AGRO, 'Rio Verde Notícias 1ª Edição', 1], [AGRO, 'Rio Verde Notícias 2ª Edição', 0], [AGRO, 'Boa Tarde Produtor', 0],
];

// recebido em cada um dos últimos 6 meses (o último é o mês atual) e o que falta no mês atual
const RECEBIDO = [13090, 12810, 22310, 47350, 60130, 96720];
const FALTA_NO_MES = 11080;

export function dadosDemoDiretor(hoje) {
  const mes = hoje.slice(0, 7);
  const nome = Object.fromEntries(VENDEDORES);
  const contratos = CONTRATOS.map(([cliente, status, valor, meses, programa, radio, pagas, abertas, vend], i) => ({
    id: `c${i}`, status, valor_mensal: valor, cliente_nome: cliente, radio_id: radio, vendedor_id: vend,
    data_fim: somarDias(hoje, Math.round(meses * 30)),
    vendedor: { nome: nome[vend] }, programa: { nome: programa, radio_id: radio },
    parcelas: [...Array(pagas).fill({ valor, status: 'pago' }), ...Array(abertas).fill({ valor, status: 'a_emitir' })],
  }));
  const parcelas = RECEBIDO.map((valor, i) => {
    const m = somarMeses(`${mes}-01`, i - 5).slice(0, 7);
    return { valor, status: 'pago', vencimento: `${m}-10`, pago_em: `${m}-12` };
  });
  parcelas.push({ valor: FALTA_NO_MES, status: 'a_emitir', vencimento: `${mes}-28`, pago_em: null });
  const antes = (d) => somarDias(hoje, -d);
  return {
    hoje,
    radios: [{ id: R96, nome: '96 FM', cor: '#ec7020' }, { id: AGRO, nome: 'Rádio do Agro', cor: '#00b13e' }],
    contratos,
    novosMes: contratos.filter((c, i) => [0, 3, 10, 13, 17, 18, 19, 20, 6].includes(i)).map((c) => ({ id: c.id, vendedor_id: c.vendedor_id, valor_mensal: c.valor_mensal })),
    parcelas,
    abertas: [
      { valor: 5000, vencimento: antes(10), contrato: { cliente_nome: 'Veterinária Pet Campo', vendedor: { nome: nome.v1 } } },
      { valor: 2800, vencimento: antes(6), contrato: { cliente_nome: 'Supermercado Bom Preço', vendedor: { nome: nome.v5 } } },
      { valor: 1960, vencimento: antes(3), contrato: { cliente_nome: 'LimpeLar', vendedor: { nome: nome.v2 } } },
    ],
    vendedores: VENDEDORES.map(([id, n]) => ({ id, nome: n, papel: 'vendedor' })),
    visitas: [
      ['v1', 'fechado', 6], ['v1', 'proposta', 4], ['v1', 'em_andamento', 1], ['v1', 'fechado', 15], ['v1', 'perdido', 22],
      ['v2', 'fechado', 9], ['v2', 'em_andamento', 0], ['v3', 'proposta', 5], ['v3', 'em_andamento', 0], ['v4', 'fechado', 12],
      ['v4', 'perdido', 18], ['v5', 'em_andamento', 0], ['v6', 'proposta', 3], ['v6', 'perdido', 20], ['v7', 'em_andamento', 0],
    ].map(([vendedor_id, status, dias]) => ({ vendedor_id, status, iniciada_em: `${antes(dias)}T13:00:00Z` })),
    programas: PROGRAMAS.map(([radio_id, n, o]) => ({ radio_id, nome: n, cotas_total: 5, cotas_ocupadas: o, cotas_livres: 5 - o })),
  };
}

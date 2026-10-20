import { somarDias, somarMeses } from '@/lib/format';

// Dados de demonstração do Painel Comercial (link público de apresentação).
// Tudo fictício, sem valores, e com datas relativas a hoje, para nunca mostrar
// dados reais sem login.
const R96 = 'r96';
const AGRO = 'ragro';

const VENDEDORES = [
  ['v1', 'Ana Paula Rocha'], ['v2', 'Bruno Martins'], ['v3', 'Carla Mendes'], ['v4', 'Diego Alves'],
  ['v5', 'Elaine Souza'], ['v6', 'Fábio Lima'], ['v7', 'Gabriela Nunes'],
];

// cliente, status, dias até o fim, programa, rádio, vendedor, criado há (dias)
const CONTRATOS = [
  ['Agropecuária Sol Nascente', 'ativo', 150, 'Agro em Foco', AGRO, 'v1', 30],
  ['Máquinas Forte Agro', 'ativo', 120, 'Agro em Foco', AGRO, 'v1', 60],
  ['LimpeLar', 'ativo', 28, 'O Papo é com Ela', R96, 'v2', 60],
  ['Cooperativa Campo Forte', 'ativo', 180, 'Agro em Foco', AGRO, 'v1', 10],
  ['Posto Estrada Verde', 'ativo', 45, 'Agro em Foco', AGRO, 'v3', 120],
  ['Veterinária Pet Campo', 'ativo', 90, 'Agro em Foco', AGRO, 'v1', 90],
  ['Clínica Vida Plena', 'ativo', 120, 'Alexandre Garcia: Comentário do Dia', AGRO, 'v4', 60],
  ['Academia Corpo Ativo', 'ativo', 150, 'Alexandre Garcia: Comentário do Dia', AGRO, 'v1', 30],
  ['Loja Casa Forte', 'ativo', 55, 'Alexandre Garcia: Comentário do Dia', AGRO, 'v4', 120],
  ['Concessionária Serra Azul', 'ativo', 180, 'Rock Radio', R96, 'v3', 15],
  ['Telefonia Conecta', 'ativo', 150, 'Rock Radio', R96, 'v2', 40],
  ['Farmácia Vida Certa', 'ativo', 22, 'Hora Certa', R96, 'v1', 160],
  ['Supermercado Bom Preço', 'ativo', 90, 'Hora do Rush I', R96, 'v5', 20],
  ['Construforte Materiais', 'ativo', 10, 'Hora do Rush I', R96, 'v2', 80],
  ['Construtora Ipê', 'ativo', 90, 'Rio Verde Notícias 1ª Edição', AGRO, 'v6', 70],
  ['Padaria Pão Dourado', 'ativo', 5, 'Bom Dia Produtor', R96, 'v4', 175],
  ['Moda Estilo Rio Verde', 'pendente', 180, 'Hora Certa', R96, 'v3', 3],
  ['Ótica Visão Clara', 'pendente', 90, 'O Papo é com Ela', R96, 'v2', 9],
  ['Auto Peças Rodovia', 'pendente', 90, 'De Dentro da Porteira', AGRO, 'v1', 2],
  ['Sorveteria Gelato', 'pendente', 360, 'Bom Dia Produtor', R96, 'v5', 12],
];

// vendas (contratos novos): no mês atual (há N dias) e no mês passado (no dia N)
// vendedor, dias atrás, rádio
const VENDAS_MES = [['v1', 1, AGRO], ['v1', 3, AGRO], ['v1', 8, R96], ['v1', 12, AGRO], ['v2', 2, R96], ['v2', 9, R96], ['v3', 3, AGRO], ['v4', 15, AGRO], ['v5', 6, R96]];
const VENDAS_ANT = [['v1', 3, AGRO], ['v1', 8, AGRO], ['v1', 15, R96], ['v1', 22, AGRO], ['v2', 5, R96], ['v2', 19, R96], ['v4', 10, AGRO], ['v5', 26, R96]];

// vendedor, status, iniciada há (dias), empresa, prorrogação
const VISITAS = [
  ['v1', 'fechado', 2, 'Café Serrano'], ['v1', 'fechado', 5, 'Laticínios Vale'], ['v1', 'proposta', 3, 'Agropecuária Boa Safra'],
  ['v1', 'em_andamento', 0, 'Café Colonial'], ['v1', 'fechado', 9, 'Gráfica Rápida'], ['v1', 'perdido', 12, 'Buffet Alegria'],
  ['v1', 'fechado', 16, 'Colchões Sono Bom'], ['v1', 'proposta', 12, 'Distribuidora Rio Claro'], ['v1', 'em_andamento', 1, 'Eletro Campo'],
  ['v1', 'fechado', 22, 'Imobiliária Lar'], ['v1', 'perdido', 25, 'Escola Saber'], ['v1', 'proposta', 6, 'Hotel Fazenda Recanto'],
  ['v2', 'fechado', 4, 'Chaveiro Express'], ['v2', 'em_andamento', 2, 'Ótica Central'], ['v2', 'perdido', 8, 'Bar do Zé'],
  ['v2', 'proposta', 13, 'Material Elétrico Luz'], ['v2', 'fechado', 18, 'Studio Beleza'], ['v2', 'em_andamento', 0, 'Pet Shop Amigo'],
  ['v2', 'perdido', 20, 'Lava Jato Brilho'],
  ['v3', 'proposta', 11, 'Moda Bella'], ['v3', 'em_andamento', 3, 'Pizzaria Forno a Lenha'], ['v3', 'fechado', 6, 'Joalheria Ouro Fino'],
  ['v3', 'perdido', 14, 'Papelaria Central'], ['v3', 'proposta', 17, 'Auto Escola Direção'], ['v3', 'em_andamento', 1, 'Açaí da Praça'],
  ['v4', 'fechado', 9, 'Hortifruti Sabor'], ['v4', 'perdido', 15, 'Gesso & Cia'], ['v4', 'proposta', 10, 'Grãos do Cerrado'], ['v4', 'fechado', 24, 'Vidraçaria Cristal'],
  ['v5', 'fechado', 3, 'Doceria Encanto'], ['v5', 'em_andamento', 1, 'Sorvetes Polar'], ['v5', 'perdido', 6, 'Tapeçaria Arte'],
  ['v5', 'em_andamento', 5, 'Clínica Sorriso'], ['v5', 'proposta', 8, 'Floricultura Jardim'],
  ['v6', 'perdido', 19, 'Mecânica Torque'], ['v6', 'proposta', 12, 'Transportadora Rota Sul', 15],
  ['v7', 'em_andamento', 0, 'Academia Fit'], ['v7', 'em_andamento', 1, 'Calçados Passo Certo'], ['v7', 'proposta', 2, 'Restaurante Panela de Barro'],
  ['v7', 'perdido', 4, 'Brechó Vintage'], ['v7', 'em_andamento', 6, 'Agência Viagem Mais'], ['v7', 'perdido', 9, 'Marmoraria Pedra Nobre'],
  ['v7', 'em_andamento', 3, 'Funilaria Nova Cor'],
];

const PROGRAMAS = [
  [R96, 'Bom Dia Produtor', 2], [R96, 'O Papo é com Ela', 1], [R96, 'Rock Radio', 2], [R96, 'Hora do Rush I', 2],
  [R96, 'Hora do Rush II', 0], [R96, 'Momento Produtor', 0], [R96, 'Hora Certa', 2],
  [AGRO, 'Alexandre Garcia: Comentário do Dia', 4], [AGRO, 'Agro em Foco', 5], [AGRO, 'De Dentro da Porteira', 1],
  [AGRO, 'Rio Verde Notícias 1ª Edição', 1], [AGRO, 'Rio Verde Notícias 2ª Edição', 0], [AGRO, 'Boa Tarde Produtor', 0],
];

export function dadosDemoComercial(hoje) {
  const nome = Object.fromEntries(VENDEDORES);
  const inicioMes = `${hoje.slice(0, 7)}-01`;
  const inicioAnt = somarMeses(inicioMes, -1);
  const antes = (d) => somarDias(hoje, -d);
  // venda "há N dias" nunca cai no mês passado (no começo do mês fica no dia 1º)
  const noMes = (d) => [antes(d), inicioMes].sort()[1];

  const contratos = CONTRATOS.map(([cliente, status, fim, programa, radio, vend, criado], i) => ({
    id: `c${i}`, status, cliente_nome: cliente, radio_id: radio, vendedor_id: vend,
    data_fim: somarDias(hoje, fim), created_at: `${antes(criado)}T14:00:00Z`,
    vendedor: { nome: nome[vend] }, programa: { nome: programa, radio_id: radio },
  }));
  const novos = [
    ...VENDAS_MES.map(([vend, d, radio], i) => ({ id: `n${i}`, vendedor_id: vend, radio_id: radio, created_at: `${noMes(d)}T14:00:00Z` })),
    ...VENDAS_ANT.map(([vend, d, radio], i) => ({ id: `a${i}`, vendedor_id: vend, radio_id: radio, created_at: `${somarDias(inicioAnt, d - 1)}T14:00:00Z` })),
  ];

  return {
    hoje,
    radios: [{ id: R96, nome: '96 FM', cor: '#ec7020' }, { id: AGRO, nome: 'Rádio do Agro', cor: '#00b13e' }],
    contratos,
    novos,
    vendedores: VENDEDORES.map(([id, n]) => ({ id, nome: n, papel: 'vendedor' })),
    visitas: VISITAS.map(([vend, status, d, empresa, extra = 0], i) => ({
      id: `vi${i}`, vendedor_id: vend, status, iniciada_em: `${antes(d)}T13:00:00Z`, prazo_extra_dias: extra,
      cliente: { nome: empresa }, vendedor: { nome: nome[vend] },
    })),
    liberadas: [],
    programas: PROGRAMAS.map(([radio_id, n, o]) => ({ radio_id, nome: n, cotas_total: 5, cotas_ocupadas: o, cotas_livres: 5 - o })),
  };
}

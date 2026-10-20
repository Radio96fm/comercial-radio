import { somarDias, somarMeses } from '@/lib/format';

// Fonte única dos dados de demonstração (links públicos sem login).
// Espelha o que o app do vendedor mostra hoje no banco: os mesmos vendedores,
// clientes, contratos (com os programas reais das rádios), parcelas e visitas.
// Se os dados fictícios do banco mudarem, atualize aqui para as demos acompanharem.
// Todas as demos (/demo-diretor, /demo-comercial e a do vendedor) leem daqui.

export const RADIOS = [
  { id: 'r96', nome: '96 FM', cor: '#ec7020', ordem: 1 },
  { id: 'ragro', nome: 'Rádio do Agro', cor: '#00b13e', ordem: 2 },
];

// rádio, nome, início, fim, cotas
const GRADE = [
  ['r96', 'Bom Dia Produtor', '07:00', '08:00', 5],
  ['r96', 'O Papo é com Ela', '09:00', '10:00', 5],
  ['r96', 'Rock Radio', '11:00', '12:00', 5],
  ['r96', 'Hora do Rush I', '17:00', '18:00', 5],
  ['r96', 'Hora do Rush II', '18:00', '19:00', 5],
  ['r96', 'Momento Produtor', null, null, 5],
  ['r96', 'Hora Certa', null, null, 5],
  ['ragro', 'Alexandre Garcia: Comentário do Dia', null, null, 5],
  ['ragro', 'Agro em Foco', null, null, 5],
  ['ragro', 'De Dentro da Porteira', null, null, 5],
  ['ragro', 'Rio Verde Notícias 1ª Edição', null, null, 5],
  ['ragro', 'Rio Verde Notícias 2ª Edição', null, null, 5],
  ['ragro', 'Boa Tarde Produtor', null, null, 5],
];
export const PROGRAMAS = GRADE.map(([radio_id, nome, ini, fim, cotas], i) => ({
  id: `p${i + 1}`, radio_id, nome, horario_inicio: ini && `${ini}:00`, horario_fim: fim && `${fim}:00`, cotas_total: cotas, ativo: true,
}));

export const EQUIPE = [
  { id: 'maycon', nome: 'Maycon Douglas Pereira de Souza', papel: 'vendedor' },
  { id: 'frederico', nome: 'Frederico gomes', papel: 'vendedor' },
  { id: 'leonardo', nome: 'Leonardo', papel: 'vendedor' },
  { id: 'freitas', nome: 'Freitas', papel: 'vendedor' },
  { id: 'michele', nome: 'Michele', papel: 'vendedor' },
  { id: 'omarai', nome: 'Omarai', papel: 'vendedor' },
  { id: 'percio', nome: 'Pércio', papel: 'vendedor' },
  { id: 'gestor', nome: 'Maycon', papel: 'gestor' },
  { id: 'financeiro', nome: 'Andressa', papel: 'financeiro' },
];

// nome, segmento (todos de Rio Verde - GO); a carteira de cada vendedor está em DONO
const CARTEIRA = [
  ['Academia Corpo Ativo', 'Academia'], ['Agro Cerrado Sementes', 'Agropecuária / Insumos'],
  ['Agropecuária Sol Nascente', 'Agropecuária / Insumos'], ['Clínica Vida Plena', 'Clínica / Saúde'],
  ['Concessionária Serra Azul', 'Concessionária de veículos'], ['Construforte Materiais', 'Material de construção'],
  ['Construtora Ipê', 'Construtora / Imobiliária'], ['Cooperativa Campo Forte', 'Banco / Cooperativa de crédito'],
  ['Faculdade Horizonte', 'Educação / Escola / Faculdade'], ['Farmácia Vida Certa', 'Farmácia'],
  ['LimpeLar', 'Limpeza Pós-Obra'], ['Loja Casa Forte', 'Loja de móveis'], ['Lojas Casa Forte Centro', 'Loja de móveis'],
  ['Máquinas Forte Agro', 'Máquinas agrícolas'], ['Moda Estilo Rio Verde', 'Moda / Vestuário / Calçados'],
  ['Ótica Visão Clara', 'Ótica'], ['Padaria Pão Quente', 'Restaurante / Alimentação'],
  ['Pneus Rodão', 'Concessionária de veículos'], ['Posto Estrada Verde', 'Posto de combustível'],
  ['Posto Estrela do Sul', 'Posto de combustível'],
  ['Restaurante Sabor da Roça', 'Restaurante / Alimentação'], ['Supermercado Bom Preço', 'Supermercado'],
  ['Telefonia Conecta', 'Telefonia / Internet'], ['Veterinária Pet Campo', 'Veterinária / Pet shop'],
];
// quem não está aqui é do Maycon. Frederico e Pércio ficam sem nada de propósito.
const DONO = {
  'Academia Corpo Ativo': 'freitas',
  'Concessionária Serra Azul': 'omarai',
  'Construforte Materiais': 'omarai',
  'Construtora Ipê': 'leonardo',
  'Faculdade Horizonte': 'michele',
  'Farmácia Vida Certa': 'michele',
  'Loja Casa Forte': 'leonardo',
  'Máquinas Forte Agro': 'omarai',
  'Moda Estilo Rio Verde': 'leonardo',
  'Ótica Visão Clara': 'michele',
  'Pneus Rodão': 'freitas',
  'Posto Estrada Verde': 'freitas',
  'Restaurante Sabor da Roça': 'leonardo',
  'Supermercado Bom Preço': 'freitas',
  'Telefonia Conecta': 'michele',
  'Veterinária Pet Campo': 'omarai',
};
export const CLIENTES = CARTEIRA.map(([nome, segmento], i) => ({
  id: `cl${i + 1}`, nome, segmento, cidade: 'Rio Verde - GO', vendedor_id: DONO[nome] || 'maycon',
}));

const SEED = '2026-10-19T12:13:54Z';
// cliente, programa, status, valor/mês, meses, início, fim, criado em (null = 2 dias antes do início),
// 1º vencimento, parcelas pagas, emitidas (o resto a emitir). O vendedor é o dono do cliente.
const CONTRATOS = [
  ['LimpeLar', 'O Papo é com Ela', 'ativo', 1960, 3, '2026-10-14', '2027-01-13', '2026-10-14T17:04:57Z', '2026-11', 0, 0],
  ['LimpeLar', 'De Dentro da Porteira', 'pendente', 5000, 3, '2026-10-14', '2027-01-13', '2026-10-14T17:30:25Z', '2026-11', 0, 0],
  ['LimpeLar', 'Bom Dia Produtor', 'pendente', 2350, 12, '2026-10-14', '2027-10-13', '2026-10-14T18:10:48Z', '2026-11', 0, 0],
  ['Academia Corpo Ativo', 'Alexandre Garcia: Comentário do Dia', 'ativo', 15000, 6, '2026-09-10', '2027-03-09', null, '2026-09', 2, 1],
  ['Academia Corpo Ativo', 'Hora Certa', 'encerrado', 2630, 3, '2026-03-10', '2026-06-09', null, '2026-03', 3, 0],
  ['Agropecuária Sol Nascente', 'Agro em Foco', 'ativo', 5000, 6, '2026-09-10', '2027-03-09', null, '2026-09', 2, 1],
  ['Clínica Vida Plena', 'Alexandre Garcia: Comentário do Dia', 'ativo', 15000, 6, '2026-08-10', '2027-02-09', null, '2026-08', 3, 1],
  ['Clínica Vida Plena', 'Bom Dia Produtor', 'ativo', 2350, 6, '2026-06-10', '2026-12-09', null, '2026-06', 5, 1],
  ['Concessionária Serra Azul', 'Bom Dia Produtor', 'encerrado', 2350, 6, '2026-02-10', '2026-08-09', null, '2026-02', 6, 0],
  ['Concessionária Serra Azul', 'Rock Radio', 'ativo', 3350, 6, '2026-10-10', '2027-04-09', null, '2026-10', 1, 1],
  ['Construforte Materiais', 'Hora do Rush I', 'ativo', 2800, 3, '2026-09-01', '2026-11-30', null, '2026-09', 2, 1],
  ['Construtora Ipê', 'Rio Verde Notícias 1ª Edição', 'ativo', 3000, 3, '2026-10-10', '2027-01-09', null, '2026-10', 1, 1],
  ['Cooperativa Campo Forte', 'Agro em Foco', 'ativo', 5000, 6, '2026-10-10', '2027-04-09', null, '2026-10', 1, 1],
  ['Faculdade Horizonte', 'O Papo é com Ela', 'encerrado', 1960, 3, '2026-05-10', '2026-08-09', null, '2026-05', 3, 0],
  ['Farmácia Vida Certa', 'Hora Certa', 'ativo', 2630, 6, '2026-09-10', '2027-03-09', null, '2026-09', 2, 1],
  ['Loja Casa Forte', 'Alexandre Garcia: Comentário do Dia', 'ativo', 15000, 6, '2026-07-10', '2027-01-09', null, '2026-07', 4, 1],
  ['Máquinas Forte Agro', 'Agro em Foco', 'ativo', 5000, 6, '2026-08-10', '2027-02-09', null, '2026-08', 3, 1],
  ['Moda Estilo Rio Verde', 'Hora Certa', 'pendente', 2630, 6, '2026-10-19', '2027-04-18', SEED, '2026-10', 0, 0],
  ['Ótica Visão Clara', 'O Papo é com Ela', 'pendente', 1960, 3, '2026-10-26', '2027-01-25', SEED, '2026-10', 0, 0],
  ['Ótica Visão Clara', 'Rock Radio', 'encerrado', 3350, 4, '2026-03-10', '2026-07-09', null, '2026-03', 4, 0],
  ['Posto Estrada Verde', 'Agro em Foco', 'ativo', 5000, 6, '2026-09-10', '2027-03-09', null, '2026-09', 2, 1],
  ['Restaurante Sabor da Roça', 'Alexandre Garcia: Comentário do Dia', 'ativo', 15000, 6, '2026-10-10', '2027-04-09', null, '2026-10', 1, 1],
  ['Supermercado Bom Preço', 'Hora do Rush I', 'ativo', 2800, 4, '2026-10-01', '2027-01-31', null, '2026-10', 1, 1],
  ['Supermercado Bom Preço', 'Hora do Rush II', 'encerrado', 2800, 3, '2026-04-10', '2026-07-09', null, '2026-04', 3, 0],
  ['Telefonia Conecta', 'Rock Radio', 'ativo', 3350, 6, '2026-09-10', '2027-03-09', null, '2026-09', 2, 1],
  // a 4ª parcela ficou em aberto (cliente em atraso)
  ['Veterinária Pet Campo', 'Agro em Foco', 'ativo', 5000, 6, '2026-07-10', '2027-01-09', null, '2026-07', 3, 2],
];

const cliente = (nome) => CLIENTES.find((c) => c.nome === nome);
const programa = (nome) => PROGRAMAS.find((p) => p.nome === nome);
const pessoa = (id) => EQUIPE.find((p) => p.id === id);

export const CONTRATOS_DEMO = CONTRATOS.map(([cli, prog, status, valor, meses, inicio, fim, criado, venc1, pagas, emitidas], i) => {
  const p = programa(prog);
  const id = `ct${i + 1}`;
  return {
    id, status, valor_mensal: valor, meses, data_inicio: inicio, data_fim: fim, created_at: criado || `${somarDias(inicio, -2)}T14:00:00Z`, dia_vencimento: 10,
    cliente_id: cliente(cli).id, cliente_nome: cli, cliente: cliente(cli),
    programa_id: p.id, radio_id: p.radio_id, programa: { nome: p.nome, radio_id: p.radio_id },
    vendedor_id: cliente(cli).vendedor_id, vendedor: { nome: pessoa(cliente(cli).vendedor_id).nome },
    parcelas: Array.from({ length: meses }, (_, n) => {
      const vencimento = somarMeses(`${venc1}-10`, n);
      const st = n < pagas ? 'pago' : n < pagas + emitidas ? 'emitido' : 'a_emitir';
      return { contrato_id: id, numero: n + 1, vencimento, valor, status: st, pago_em: st === 'pago' ? somarDias(vencimento, 2) : null };
    }),
  };
});

// cliente, vendedor, status, iniciada em, encerrada em
const VISITAS = [
  ['Supermercado Bom Preço', 'freitas', 'fechado', '2026-09-25T13:00:00Z', '2026-09-29T13:00:00Z'],
  ['Padaria Pão Quente', 'maycon', 'perdido', '2026-09-28T12:13:54Z', '2026-09-28T12:13:54Z'],
  ['Restaurante Sabor da Roça', 'leonardo', 'fechado', '2026-10-02T14:00:00Z', '2026-10-08T19:00:00Z'],
  ['Agro Cerrado Sementes', 'maycon', 'fechado', '2026-10-05T12:13:54Z', '2026-10-06T12:13:54Z'],
  ['Construtora Ipê', 'leonardo', 'fechado', '2026-10-05T12:30:00Z', '2026-10-08T13:00:00Z'],
  ['Concessionária Serra Azul', 'omarai', 'fechado', '2026-10-06T13:00:00Z', '2026-10-08T14:00:00Z'],
  ['Cooperativa Campo Forte', 'maycon', 'fechado', '2026-10-06T16:00:00Z', '2026-10-08T18:00:00Z'],
  ['LimpeLar', 'maycon', 'fechado', '2026-10-14T17:03:17Z', '2026-10-14T17:04:57Z'],
  ['LimpeLar', 'maycon', 'em_andamento', '2026-10-14T18:52:21Z', null],
  ['Ótica Visão Clara', 'michele', 'fechado', '2026-10-14T19:00:00Z', '2026-10-19T13:00:00Z'],
  ['Pneus Rodão', 'freitas', 'proposta', '2026-10-15T17:00:00Z', null],
  ['Moda Estilo Rio Verde', 'leonardo', 'fechado', '2026-10-15T18:00:00Z', '2026-10-19T12:00:00Z'],
  ['Lojas Casa Forte Centro', 'maycon', 'proposta', '2026-10-16T12:13:54Z', null],
  ['Posto Estrela do Sul', 'maycon', 'em_andamento', '2026-10-19T11:33:54Z', null],
  ['Veterinária Pet Campo', 'omarai', 'em_andamento', '2026-10-19T13:39:50Z', null],
  ['Academia Corpo Ativo', 'freitas', 'em_andamento', '2026-10-19T14:29:50Z', null],
  ['Telefonia Conecta', 'michele', 'em_andamento', '2026-10-19T14:59:50Z', null],
  ['Restaurante Sabor da Roça', 'leonardo', 'em_andamento', '2026-10-19T15:14:50Z', null],
  ['Padaria Pão Quente', 'michele', 'em_andamento', '2026-10-19T15:24:50Z', null],
];
export const VISITAS_DEMO = VISITAS.map(([cli, vend, status, ini, fim], i) => ({
  id: `vi${i + 1}`, cliente_id: cliente(cli).id, vendedor_id: vend, status, iniciada_em: ini, encerrada_em: fim, prazo_extra_dias: 0,
  cliente: { nome: cli }, vendedor: { nome: pessoa(vend).nome },
}));

// Mesma conta da view programas_ocupacao: cota ocupada = contrato ativo ou
// pendente do programa com hoje dentro do período.
export function gradeDemo(hoje) {
  return PROGRAMAS.map((p) => {
    const ocupadas = CONTRATOS_DEMO.filter((c) => c.programa_id === p.id && ['ativo', 'pendente'].includes(c.status)
      && c.data_inicio <= hoje && hoje <= c.data_fim).length;
    return { ...p, cotas_ocupadas: ocupadas, cotas_livres: Math.max(p.cotas_total - ocupadas, 0) };
  }).sort((a, b) => (a.horario_inicio && b.horario_inicio ? a.horario_inicio.localeCompare(b.horario_inicio) : a.horario_inicio ? -1 : b.horario_inicio ? 1 : 0));
}

// Quem entra na lista de equipe dos painéis (mesmo filtro das consultas reais)
export const equipeDemo = () => EQUIPE.filter((p) => ['vendedor', 'gestor', 'comercial'].includes(p.papel))
  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

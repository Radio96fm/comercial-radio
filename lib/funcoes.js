// Telas e funções que o desenvolvedor liga/desliga para cada acesso.
// A chave é o começo do endereço da tela: desligar '/gestao/precos' fecha a tela e o que está dentro dela.
export const FUNCOES = [
  ['Painéis', [
    ['/diretor', 'Painel do Diretor'],
    ['/comercial', 'Painel Comercial (celular)'],
    ['/financeiro', 'Acesso do financeiro'],
  ]],
  ['Gestão comercial (computador)', [
    ['/gestao/programas', 'Programas'],
    ['/gestao/propostas', 'Propostas em PDF'],
    ['/gestao/precos', 'Tabela de preços'],
    ['/gestao/contratos', 'Contratos'],
    ['/gestao/clientes', 'Clientes'],
    ['/gestao/negociacoes', 'Negociações'],
    ['/gestao/visitas', 'Visitas'],
    ['/gestao/modelos', 'Modelo de contrato'],
    ['/gestao/cadastros', 'Rádios e segmentos'],
    ['/gestao/atividades', 'Histórico'],
    ['/gestao/financeiro', 'Financeiro dentro da gestão'],
  ]],
  ['App do vendedor', [
    ['/app/visitas', 'Visitas'],
    ['/app/clientes', 'Clientes'],
    ['/app/contratos', 'Contratos'],
    ['/app/ganhos', 'Ganhos'],
    ['/app/assistente', 'Assistente de testemunhal'],
    ['/app/condicoes', 'Condições especiais'],
  ]],
];

export function bloqueado(caminho, lista) {
  if (!caminho || !lista?.length) return false;
  return lista.some((p) => caminho === p || caminho.startsWith(`${p}/`));
}

const NOMES = [
  ['/dev', 'Painel do desenvolvedor'],
  ['/diretor', 'Painel do Diretor'],
  ['/comercial', 'Painel Comercial'],
  ['/financeiro', 'Financeiro'],
  ['/gestao', 'Gestão comercial'],
  ['/app', 'App do vendedor'],
];
const TODAS = FUNCOES.flatMap(([, itens]) => itens);

// Nome da tela para o histórico de acessos ("Gestão comercial › Contratos")
export function nomeTela(caminho) {
  if (!caminho) return '';
  if (caminho === 'login') return 'Entrou no sistema';
  const item = TODAS.filter(([p]) => caminho === p || caminho.startsWith(`${p}/`)).sort((a, b) => b[0].length - a[0].length)[0];
  const area = NOMES.find(([p]) => caminho === p || caminho.startsWith(`${p}/`));
  if (item && area && item[0] !== area[0]) return `${area[1]} › ${item[1]}`;
  return item?.[1] || area?.[1] || caminho;
}

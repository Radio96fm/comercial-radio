// Mapa do fluxo (/mapa): ponto de partida com o caminho do jeito que o sistema
// funciona hoje. Depois de salvo pela primeira vez, vale o que está guardado.

export const TIPOS = {
  inicio: 'Início',
  passo: 'Passo',
  decisao: 'Decisão',
  trava: 'Trava do app',
  gestao: 'Gestão Comercial configura',
  financeiro: 'Financeiro',
  mudanca: 'Mudança pedida',
  fim: 'Fim',
};

const C = 470; // coluna principal
const L = 820; // travas e desvios
const G = 80; // o que a Gestão Comercial configura

const NOS = [
  ['n1', 'inicio', C, 0, 'Vendedor abre o app', 'Tela inicial: cartões da 96 FM e da Rádio do Agro, botão Iniciar visita e as visitas abertas dele.\nBarra de baixo: Início, Visitas, Clientes e Ganhos.\nNo topo: avisos de condição especial e de exclusividade acabando.'],
  ['n2', 'passo', C, 210, 'Iniciar visita: empresa', 'Nome da empresa (obrigatório). Ao digitar, o app procura empresas parecidas em toda a base.\nSe for empresa nova: segmento (obrigatório), cidade e CNPJ/CPF (opcionais, se souber).'],
  ['t2', 'trava', L, 210, 'Empresa já é de outro vendedor', 'Se a empresa está em visita ou tem contrato vigente com outro vendedor, não deixa iniciar.\nSe aparecer uma parecida, ele precisa marcar "É outra empresa".'],
  ['n3', 'passo', C, 430, 'Com quem está falando', 'Nome da pessoa da empresa que está atendendo o vendedor (obrigatório) e o cargo dela (opcional).\nAnotações da visita (opcional).\nBotão: Iniciar visita.'],
  ['m3', 'mudanca', L, 430, 'Deixar mais claro', 'Na tela, deixar claro que é o nome e o cargo da pessoa da empresa com quem o vendedor está conversando.'],
  ['n4', 'passo', C, 640, 'Visita aberta: 15 dias de exclusividade', 'Só esse vendedor negocia com a empresa por 15 dias.\nPode renovar por mais 15 dias uma vez; o segundo pedido de 15 dias precisa da aprovação do comercial. Máximo de 45 dias.\nTem botões de ligar e WhatsApp e o campo de anotações.'],
  ['d4', 'decisao', L, 640, 'Não fechou?', 'Botão Não fechou: a visita encerra.\nDá para reabrir depois.'],
  ['n5', 'decisao', C, 870, 'Qual rádio?', 'Escolhe a rádio e a tela abre os programas dela, com horário e cotas livres.'],
  ['r96', 'passo', 300, 1040, '96 FM', 'Bom Dia Produtor · O Papo é com Ela · Rock Radio · Hora do Rush I · Hora do Rush II · Momento Produtor · Hora Certa\nNo fim da lista: Plano personalizado (inserções e testemunhais).'],
  ['ragro', 'passo', 640, 1040, 'Rádio do Agro', 'Alexandre Garcia: Comentário do Dia · Agro em Foco · De Dentro da Porteira · Rio Verde Notícias 1ª e 2ª Edição · Boa Tarde Produtor\nNo fim da lista: Plano personalizado.'],
  ['n6', 'passo', C, 1270, 'Programa e plano', 'Mostra cotas livres, condição especial, planos com o valor de 3, 6 e 12 meses, contrato mínimo e os segmentos que já anunciam ali.\nBotão: Fazer proposta deste plano.'],
  ['t6', 'trava', L, 1270, 'Programa lotado ou segmento ocupado', 'Sem cota livre, ou com o segmento do cliente já anunciando no programa, não deixa seguir.'],
  ['n7', 'passo', C, 1490, 'Proposta comercial em PDF', 'Confere o WhatsApp do contato e a mensagem pronta e envia o PDF da proposta do programa (ou um link para ele).\nSem PDF do programa, vai o PDF geral da rádio.'],
  ['n8', 'decisao', C, 1700, 'Cliente aprovou?', 'Botão: Cliente aprovou: fazer cadastro completo.\nSe precisar, reenvia a proposta. Se não aprovar: Não fechou.'],
  ['n9', 'passo', C, 1890, 'Cadastro completo do cliente', 'Obrigatórios: nome da empresa, segmento, responsável/contato, telefone/WhatsApp, cidade-UF, razão social, CNPJ ou CPF, e-mail e endereço.\nOpcionais: inscrição estadual, bairro, CEP, outro telefone e observações.\nO que veio da visita já aparece preenchido.\nBotão: Salvar e seguir para o contrato.'],
  ['m9', 'mudanca', L, 1890, 'Faltando no cadastro', 'Anexar o cartão CNPJ.\nE-mail e WhatsApp do financeiro do cliente.'],
  ['n10', 'passo', C, 2170, 'Contrato', 'Cliente, programa e plano já vêm preenchidos.\nEscolhe 3, 6 ou 12 meses (respeita o mínimo do programa), data de início e 1º vencimento.\nO texto do que o cliente tem direito vem pronto. Confere o vendedor (com CPF), o valor por mês e o total.\nBotão: Criar contrato e gerar PDF.'],
  ['t10', 'trava', L, 2170, 'Segmento ocupado no período', 'Se o segmento do cliente já está no programa nesse período, o contrato não é criado.'],
  ['n11', 'passo', C, 2440, 'Enviar contrato para assinar', 'O contrato nasce pendente e o PDF abre.\nBotão Enviar para o cliente assinar: o cliente recebe por e-mail (Autentique) e o vendedor recebe um link para mandar no WhatsApp.\nOutras opções: Assinou no papel (ativar) ou Cancelar (libera a cota).'],
  ['n12', 'decisao', C, 2680, 'Cliente assinou?', 'O sistema confere a assinatura na Autentique.\nSe o cliente recusar, o vendedor vê o aviso no contrato.'],
  ['n13', 'passo', C, 2860, 'Contrato ativo', 'Vira ativo sozinho quando o cliente assina.\nA cota do programa fica ocupada.\nAs parcelas já foram criadas junto com o contrato: uma por mês, como "a emitir".'],
  ['f1', 'financeiro', C, 3070, 'Financeiro recebe o contrato', 'O contrato aparece em Contratos fechados e as parcelas em Parcelas / boletos.\nNão chega aviso: o financeiro acompanha pelas listas.'],
  ['f2', 'financeiro', C, 3260, 'Financeiro emite o boleto', 'Gera o boleto no banco e registra no sistema o link e a linha digitável.\nA parcela passa para "emitido".'],
  ['f3', 'financeiro', C, 3450, 'Boleto vai para o cliente', 'Botão Mandar no WhatsApp com a mensagem pronta.\nCobrança do mês mostra tudo que vence no mês.'],
  ['f4', 'decisao', C, 3640, 'Cliente pagou?', 'O financeiro marca a parcela como paga.\nParcela vencida e não paga aparece como em atraso no painel do financeiro e no Painel do Diretor.'],
  ['f5', 'financeiro', C, 3830, 'Comissão do vendedor', 'A comissão (18% padrão, ajustável por vendedor) conta no mês em que a parcela é paga.\nO vendedor acompanha em Ganhos. O financeiro marca nota recebida e comissão paga.'],
  ['n14', 'fim', C, 4040, 'Fim do contrato', 'No fim do período a cota volta a ficar livre.\nA Gestão Comercial mostra os contratos vencendo em 30 dias para renovar.'],
  ['g1', 'gestao', G, 640, 'Aprova prorrogação', 'O comercial aceita ou recusa o pedido de mais 15 dias e pode liberar uma empresa para outros vendedores.'],
  ['g2', 'gestao', G, 1270, 'Programas, planos e preços', 'Em Programas: cotas, planos, valor por período (1, 3, 6, 12 meses), contrato mínimo e condição especial.\nEm Tabela de preços: inserções e testemunhais do plano personalizado.'],
  ['g3', 'gestao', G, 1490, 'Propostas em PDF', 'O comercial coloca o PDF de cada programa e o PDF geral de cada rádio.'],
  ['g4', 'gestao', G, 2170, 'Modelo de contrato', 'O texto do contrato que vai no PDF.'],
];

const LIG = [
  ['n1', 'n2'], ['n2', 't2', 'trava'], ['n2', 'n3'], ['n3', 'm3', ''], ['n3', 'n4'], ['n4', 'd4', ''], ['n4', 'n5'],
  ['n5', 'r96'], ['n5', 'ragro'], ['r96', 'n6'], ['ragro', 'n6'], ['n6', 't6', 'trava'], ['n6', 'n7'], ['n7', 'n8'],
  ['n8', 'n9', 'sim'], ['n8', 'd4', 'não'], ['n9', 'm9', ''], ['n9', 'n10'], ['n10', 't10', 'trava'], ['n10', 'n11'], ['n11', 'n12'],
  ['n12', 'n13', 'sim'], ['n13', 'f1'], ['f1', 'f2'], ['f2', 'f3'], ['f3', 'f4'], ['f4', 'f5', 'sim'], ['f5', 'n14'],
  ['g1', 'n4', ''], ['g2', 'n6', ''], ['g3', 'n7', ''], ['g4', 'n10', ''],
];

// caixas com a miniatura da tela do app são mais altas: empilha os níveis
// (mesmo y no NOS = mesma linha) conforme a caixa mais alta de cada um
const COM_TELA = new Set(['n1', 'n2', 'n3', 'n4', 'r96', 'ragro', 'n6', 'n7', 'n8', 'n9', 'n10', 'n11', 'n13']);
const alturaDoNivel = {};
[...new Set(NOS.map((n) => n[3]))].sort((a, b) => a - b).reduce((topo, nivel) => {
  alturaDoNivel[nivel] = topo;
  const alta = NOS.some((n) => n[3] === nivel && COM_TELA.has(n[0]));
  return topo + (alta ? 560 : 250);
}, 0);

export function mapaInicial() {
  return {
    versao: null,
    nos: NOS.map(([id, tipo, x, y, titulo, texto]) => ({ id, tipo, x, y: alturaDoNivel[y], titulo, texto })),
    ligacoes: LIG.map(([de, para, rotulo = ''], i) => ({ id: `l${i + 1}`, de, para, rotulo })),
    comentarios: [],
  };
}

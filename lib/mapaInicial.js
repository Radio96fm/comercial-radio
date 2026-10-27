// Mapa do fluxo (/fluxo): ponto de partida com o app do vendedor do jeito que
// funciona hoje, tela por tela. Cada seta com "botao" só aparece quando a pessoa
// toca naquele botão da miniatura; as outras aparecem junto com a caixa de origem.
// Depois de salvo, vale o que está guardado (MODELO diz de qual versão veio).

export const MODELO = 2;

export const TIPOS = {
  inicio: 'Início',
  passo: 'Tela do app',
  decisao: 'Decisão',
  trava: 'Trava do app',
  gestao: 'Gestão Comercial configura',
  financeiro: 'Financeiro',
  mudanca: 'Mudança pedida',
  fim: 'Fim',
};

// coluna, linha, id, tipo, tela, título, como funciona
const NOS = [
  [5, 0, 'n1', 'inicio', 'inicio', 'Início do app', 'O que o vendedor vê ao abrir o app. Toque nos botões da tela para abrir os caminhos.'],

  [0, 1, 'pf', 'passo', 'perfil', 'Meus dados', 'Nome completo (obrigatório), CPF ou CNPJ, telefone/WhatsApp. O e-mail de acesso não muda. O CPF vai no contrato.\nAparência: tema claro ou escuro.'],
  [1, 1, 'cond', 'passo', 'condicoes', 'Condições especiais', 'Lista das condições que o comercial publicou e ainda valem, com o programa de cada uma.'],
  [2, 1, 'ia', 'passo', 'assistente', 'Tirar dúvida com a IA', 'O vendedor pergunta por texto ou voz (ex.: tem vaga no programa tal para uma farmácia?) e a IA responde com o que o comercial ensinou.'],
  [3, 1, 'vs', 'passo', 'visitas', 'Visitas', 'Visitas em andamento de toda a equipe e as encerradas do vendedor.'],
  [5, 1, 'n2', 'passo', 'empresa', 'Nova visita: empresa', 'Nome da empresa (obrigatório). Ao digitar, o app procura empresas parecidas em toda a base.\nSe for nova: segmento (obrigatório), cidade e CNPJ/CPF (opcionais).'],
  [6, 1, 't2', 'trava', '', 'Empresa já é de outro vendedor', 'Se a empresa está em visita ou tem contrato vigente com outro vendedor, não deixa iniciar.\nSe aparecer uma parecida, ele marca "É outra empresa".'],
  [7, 1, 'r96', 'passo', 'radio96', 'Programas da 96 FM', 'Programas com horário e cotas livres, a tabela de inserções e testemunhais e, no fim, o plano personalizado.'],
  [8, 1, 'ragro', 'passo', 'radioagro', 'Programas da Rádio do Agro', 'Programas com horário e cotas livres, a tabela de inserções e testemunhais e, no fim, o plano personalizado.'],
  [10, 1, 'cl', 'passo', 'clientes', 'Clientes', 'A carteira do vendedor, com busca. Botão para cadastrar cliente.'],
  [12, 1, 'gh', 'passo', 'ganhos', 'Meus ganhos', 'Comissão do mês, comparação com o mês passado, recorde, sequência de meses e boletos em atraso dos clientes dele.'],

  [5, 2, 'n3', 'passo', 'contato', 'Nova visita: contato', 'Mesma tela, mais abaixo. Nome da pessoa da empresa que está atendendo (obrigatório) e o cargo dela.\nAnotações (opcional).'],
  [6, 2, 'm3', 'mudanca', '', 'Deixar mais claro', 'Na tela, deixar claro que é o nome e o cargo da pessoa da empresa com quem o vendedor está conversando.'],
  [9, 2, 'cln', 'passo', 'clientenovo', 'Novo cliente', 'Nome, segmento, contato, telefone, cidade e CNPJ/CPF. O app bloqueia empresa repetida.'],
  [10, 2, 'clf', 'passo', 'ficha', 'Ficha do cliente', 'Dados do cliente (editáveis), ligar, WhatsApp, iniciar visita, novo contrato, criar testemunhal, contratos e visitas dele.'],
  [12, 2, 'ghc', 'passo', 'conquistas', 'Conquistas', 'Medalhas que o vendedor desbloqueia (primeira venda, recordes e outras).'],
  [13, 2, 'ghr', 'passo', 'renovar', 'Hora de renovar', 'Contratos dele que estão perto de terminar, para oferecer a renovação.'],
  [14, 2, 'ghk', 'passo', 'ganhoscontratos', 'Contratos que pagam você', 'Contratos ativos que geram comissão para ele.'],

  [2, 3, 'g1', 'gestao', '', 'Aprova prorrogação', 'O comercial aceita ou recusa o pedido de mais 15 dias e pode liberar uma empresa para outros vendedores.'],
  [5, 3, 'n4', 'passo', 'visita', 'Visita aberta', 'Só esse vendedor negocia com a empresa por 15 dias. Pode renovar por mais 15 uma vez; o segundo pedido de 15 dias precisa da aprovação do comercial. Máximo de 45 dias.\nBotões de ligar, WhatsApp e anotações.'],
  [3, 3, 'd4', 'fim', '', 'Não fechou', 'A visita encerra como "não fechou". Dá para reabrir depois.'],
  [10, 3, 'tm', 'passo', 'testemunhal', 'Criar testemunhal', 'A IA escreve o roteiro do testemunhal do cliente; o vendedor pede ajustes por texto ou voz.'],

  [4, 4, 'g2', 'gestao', '', 'Programas, planos e preços', 'Em Programas: cotas, planos, valor por período (1, 3, 6, 12 meses), contrato mínimo e condição especial.\nEm Tabela de preços: inserções e testemunhais do plano personalizado.'],
  [6, 4, 'n6', 'passo', 'programa', 'Programa e planos', 'Cotas livres, condição especial, planos com o valor de 3, 6 e 12 meses, contrato mínimo e os segmentos que já anunciam ali.\nNa visita: Fazer proposta deste plano. Sem visita: Fechar contrato.'],
  [7, 4, 't6', 'trava', '', 'Programa lotado ou segmento ocupado', 'Sem cota livre, ou com o segmento do cliente já anunciando no programa, não deixa seguir.'],
  [8, 4, 'pp', 'passo', 'personalizado', 'Plano personalizado', 'Toca no + para colocar inserções e testemunhais por mês; pode incluir um programa com valor fechado. O total aparece na hora.'],

  [4, 5, 'g3', 'gestao', '', 'Propostas em PDF', 'O comercial coloca o PDF de cada programa e o PDF geral de cada rádio.'],
  [5, 5, 'n7', 'passo', 'proposta', 'Enviar proposta', 'Confere o WhatsApp do contato e a mensagem pronta e envia o PDF da proposta do programa (ou um link). Sem PDF do programa, vai o geral da rádio.'],
  [5, 6, 'n8', 'passo', 'aprovou', 'Cliente aprovou?', 'Volta para a visita, que agora mostra a proposta enviada.'],
  [5, 7, 'n9', 'passo', 'cadastro', 'Cadastro completo', 'Obrigatórios: nome da empresa, segmento, responsável/contato, telefone/WhatsApp, cidade-UF, razão social, CNPJ ou CPF, e-mail e endereço.\nOpcionais: inscrição estadual, bairro, CEP, outro telefone e observações.'],
  [6, 7, 'm9', 'mudanca', '', 'Faltando no cadastro', 'Anexar o cartão CNPJ.\nE-mail e WhatsApp do financeiro do cliente.'],
  [4, 8, 'g4', 'gestao', '', 'Modelo de contrato', 'O texto do contrato que vai no PDF.'],
  [5, 8, 'n10', 'passo', 'contrato', 'Novo contrato', 'Cliente, programa e plano já vêm preenchidos quando vem da visita.\n1. Cliente  2. Período (3, 6 ou 12 meses, início e 1º vencimento)  3. O que o cliente tem direito (texto pronto).\nConfere o vendedor (com CPF), o valor por mês e o total.'],
  [6, 8, 't10', 'trava', '', 'Segmento ocupado no período', 'Se o segmento do cliente já está no programa nesse período, o contrato não é criado.'],
  [5, 9, 'n11', 'passo', 'assinar', 'Contrato pendente', 'O contrato nasce pendente e o PDF abre. Daqui ele manda para assinar, ativa se assinou no papel ou cancela.'],
  [6, 9, 'cx', 'fim', '', 'Contrato cancelado', 'A cota do programa volta a ficar livre.'],
  [5, 10, 'n12', 'decisao', '', 'Cliente assinou?', 'A Autentique manda o contrato por e-mail e o vendedor manda o link no WhatsApp. O sistema confere a assinatura sozinho. Se o cliente recusar, aparece o aviso no contrato.'],
  [5, 11, 'n13', 'passo', 'ativo', 'Contrato ativo', 'Vira ativo sozinho quando o cliente assina. A cota fica ocupada. As parcelas já foram criadas junto com o contrato: uma por mês, como "a emitir".'],
  [5, 12, 'f1', 'financeiro', '', 'Financeiro recebe o contrato', 'O contrato aparece em Contratos fechados e as parcelas em Parcelas / boletos. Não chega aviso: o financeiro acompanha pelas listas.'],
  [5, 13, 'f2', 'financeiro', '', 'Financeiro emite o boleto', 'Gera o boleto no banco e registra no sistema o link e a linha digitável. A parcela passa para "emitido".'],
  [5, 14, 'f3', 'financeiro', '', 'Boleto vai para o cliente', 'Botão Mandar no WhatsApp com a mensagem pronta. Cobrança do mês mostra tudo que vence no mês.'],
  [5, 15, 'f4', 'decisao', '', 'Cliente pagou?', 'O financeiro marca a parcela como paga. Vencida e não paga aparece em atraso no financeiro, no Painel do Diretor e nos Ganhos do vendedor.'],
  [5, 16, 'f5', 'financeiro', '', 'Comissão do vendedor', 'A comissão (18% padrão, ajustável por vendedor) conta no mês em que a parcela é paga. O vendedor vê em Meus ganhos; o financeiro marca nota recebida e comissão paga.'],
  [5, 17, 'n14', 'fim', '', 'Fim do contrato', 'No fim do período a cota volta a ficar livre. Aparece em Hora de renovar para o vendedor e em Vencendo em 30 dias para o comercial.'],
];

// de, para, texto na seta, botão da miniatura que abre a seta ('' = aparece junto)
const LIG = [
  ['n1', 'pf', 'Meus dados', 'perfil'], ['n1', 'cond', 'Aviso amarelo', 'aviso'], ['n1', 'ia', 'Tirar dúvida com a IA', 'ia'],
  ['n1', 'vs', 'Visitas', 'visitas'], ['n1', 'n2', 'Iniciar visita', 'iniciar'], ['n1', 'r96', '96 FM', 'r96'], ['n1', 'ragro', 'Rádio do Agro', 'ragro'],
  ['n1', 'cl', 'Clientes', 'clientes'], ['n1', 'gh', 'Ganhos', 'ganhos'], ['n1', 'n4', 'Visita em andamento', 'visita'],
  ['cond', 'n6', 'Ver programa', 'verprograma'],
  ['vs', 'n2', 'Registrar nova visita', 'nova'], ['vs', 'n4', 'Abrir visita', 'abrir'],
  ['n2', 't2', 'trava', ''], ['n2', 'n3', 'mais abaixo', 'contato'], ['n3', 'm3', '', ''], ['n3', 'n4', 'Iniciar visita', 'iniciar'],
  ['cl', 'cln', 'Cadastrar cliente', 'novo'], ['cl', 'clf', 'Abrir cliente', 'abrir'], ['cln', 'clf', 'Salvar cliente', 'salvar'],
  ['clf', 'n2', 'Iniciar visita', 'iniciar'], ['clf', 'n10', 'Novo contrato', 'contrato'], ['clf', 'tm', 'Criar testemunhal', 'testemunhal'],
  ['gh', 'ghc', 'Conquistas', 'conquistas'], ['gh', 'ghr', 'Hora de renovar', 'renovar'], ['gh', 'ghk', 'Contratos que pagam você', 'contratos'],
  ['ghr', 'n13', 'Abrir contrato', 'abrir'], ['ghk', 'n13', 'Abrir contrato', 'abrir'],
  ['g1', 'n4', '', ''], ['n4', 'd4', 'Não fechou', 'naofechou'], ['n4', 'r96', '96 FM', 'r96'], ['n4', 'ragro', 'Rádio do Agro', 'ragro'], ['n4', 'g1', 'Renovar 15 dias', 'renovar'],
  ['r96', 'n6', 'Abrir programa', 'programa'], ['ragro', 'n6', 'Abrir programa', 'programa'], ['r96', 'pp', 'Plano personalizado', 'personalizado'], ['ragro', 'pp', 'Plano personalizado', 'personalizado'],
  ['g2', 'n6', '', ''], ['n6', 't6', 'trava', ''], ['n6', 'n7', 'Fazer proposta (na visita)', 'proposta'], ['n6', 'n10', 'Fechar contrato (sem visita)', 'fechar'],
  ['pp', 'n10', 'Fazer contrato', 'contrato'],
  ['g3', 'n7', '', ''], ['n7', 'n8', 'Enviar no WhatsApp', 'enviar'],
  ['n8', 'n9', 'Cliente aprovou', 'aprovou'], ['n8', 'n7', 'Reenviar proposta', 'reenviar'], ['n8', 'd4', 'Não fechou', 'naofechou'],
  ['n9', 'm9', '', ''], ['n9', 'n10', 'Salvar e seguir para o contrato', 'salvar'],
  ['g4', 'n10', '', ''], ['n10', 't10', 'trava', ''], ['n10', 'cln', 'Cadastrar cliente novo', 'novocliente'], ['n10', 'n11', 'Criar contrato e gerar PDF', 'criar'],
  ['n11', 'n12', 'Enviar para assinar', 'assinar'], ['n11', 'n13', 'Assinou no papel', 'papel'], ['n11', 'cx', 'Cancelar contrato', 'cancelar'],
  ['n12', 'n13', 'sim', ''], ['n13', 'f1', '', ''], ['f1', 'f2', '', ''], ['f2', 'f3', '', ''], ['f3', 'f4', '', ''], ['f4', 'f5', 'sim', ''], ['f5', 'n14', '', ''],
];

// linhas com miniatura são altas; as outras, baixas
const ALTA = new Set(NOS.filter((n) => n[4]).map((n) => n[1]));
const TOPO = {};
for (let l = 0, y = 0; l <= Math.max(...NOS.map((n) => n[1])); l += 1) { TOPO[l] = y; y += ALTA.has(l) ? 780 : 300; }

export function mapaInicial() {
  return {
    versao: null,
    modelo: MODELO,
    nos: NOS.map(([c, l, id, tipo, tela, titulo, texto]) => ({ id, tipo, tela, x: c * 320, y: TOPO[l], titulo, texto })),
    ligacoes: LIG.map(([de, para, rotulo, botao], i) => ({ id: `l${i + 1}`, de, para, rotulo, botao })),
    comentarios: [],
  };
}

// Mapa salvo num modelo antigo: entra o modelo novo, mantendo as caixas que as
// pessoas criaram e os comentários (com a caixa antiga, se ela saiu do modelo).
export function atualizarModelo(salvo) {
  const novo = mapaInicial();
  const ids = new Set(novo.nos.map((n) => n.id));
  const comentados = new Set((salvo.comentarios || []).map((c) => c.no));
  const xMax = Math.max(...novo.nos.map((n) => n.x)) + 400;
  const criados = (salvo.nos || [])
    .filter((n) => !ids.has(n.id) && (n.id.length > 6 || comentados.has(n.id)))
    .map((n, i) => ({ ...n, x: xMax, y: i * 320 }));
  const deles = new Set(criados.map((n) => n.id));
  const todos = new Set([...ids, ...deles]);
  return {
    ...novo,
    versao: salvo.versao,
    nos: [...novo.nos, ...criados],
    ligacoes: [...novo.ligacoes, ...(salvo.ligacoes || []).filter((l) => (deles.has(l.de) || deles.has(l.para)) && todos.has(l.de) && todos.has(l.para))],
    comentarios: (salvo.comentarios || []).filter((c) => todos.has(c.no)),
  };
}

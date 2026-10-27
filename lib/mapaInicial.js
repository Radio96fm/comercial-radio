// Mapa do fluxo (/fluxo): ponto de partida com o app do vendedor do jeito que
// funciona hoje, com as fotos das telas reais (lib/fluxoTelas.json, gerado a
// partir do app). Cada seta com "botao" só aparece quando a pessoa toca naquele
// botão da tela; as outras aparecem junto com a caixa de origem.
// Depois de salvo, vale o que está guardado (MODELO diz de qual versão veio).
import FLUXO from './fluxoTelas.json';

export const MODELO = 4;

export const TIPOS = {
  inicio: 'Início',
  passo: 'Tela do app',
  acao: 'O que acontece',
  decisao: 'Decisão',
  trava: 'Trava do app',
  gestao: 'Gestão Comercial configura',
  financeiro: 'Financeiro',
  mudanca: 'Mudança pedida',
  fim: 'Fim',
};

export function mapaInicial() {
  return {
    versao: null,
    modelo: MODELO,
    nos: FLUXO.nos.map((n) => ({ ...n, x: 0, y: 0 })),
    ligacoes: FLUXO.ligacoes.map((l) => ({ ...l })),
    comentarios: [],
  };
}

// Mapa salvo num modelo antigo: entra o modelo novo, mantendo as caixas que as
// pessoas criaram e os comentários (com a caixa antiga, se ela saiu do modelo).
export function atualizarModelo(salvo) {
  const novo = mapaInicial();
  const ids = new Set(novo.nos.map((n) => n.id));
  const comentados = new Set((salvo.comentarios || []).map((c) => c.no));
  const criados = (salvo.nos || [])
    .filter((n) => !ids.has(n.id) && (n.id.length > 6 || comentados.has(n.id)))
    .map((n) => ({ ...n, fixo: false }));
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

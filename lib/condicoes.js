// Identifica o conjunto de condições ativas (para saber se o vendedor já viu o aviso).
// Fica fora do componente cliente para a página do servidor também poder usar.
export const assinatura = (lista) => lista.map((c) => c.id).sort().join(',');

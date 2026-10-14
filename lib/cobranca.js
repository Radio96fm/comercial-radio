import 'server-only';

// Emissão de boletos: o banco/plataforma (Asaas ou Bradesco) ainda não foi escolhido.
// Quando for, a integração entra aqui e o resto do painel já funciona com ela.
export const BANCO_LIGADO = false;

export async function emitirBoleto(/* parcela */) {
  throw new Error('A emissão automática de boletos ainda não está ligada: falta escolher o banco (Asaas ou Bradesco). Por enquanto, emita no banco e marque aqui como "emitido".');
}

// Prazo de negociação: quem inicia a visita tem 15 dias de exclusividade com a empresa.
// A trava de verdade fica no banco (trava_visita / iniciar_visita).
export const PRAZO_DIAS = 15;
export const AVISAR_COM = 5; // dias restantes para avisar o vendedor

export function prazoVisita(iniciadaEm) {
  const fim = new Date(new Date(iniciadaEm).getTime() + PRAZO_DIAS * 86400000);
  const restam = Math.ceil((fim.getTime() - Date.now()) / 86400000);
  const ate = fim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
  return { fim, restam, ate, vencido: restam <= 0, avisar: restam > 0 && restam <= AVISAR_COM };
}

export const textoRestam = (n) => (n <= 0 ? 'prazo encerrado' : n === 1 ? 'falta 1 dia' : `faltam ${n} dias`);

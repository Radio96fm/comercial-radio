import { data, moeda } from '@/lib/format';
import { nomeEmissora } from '@/lib/contrato';

// Mensagem para o cliente: resumo do contrato + link para assinar.
// Vai no WhatsApp, no "Copiar mensagem" e no e-mail da Autentique.
export function mensagemContrato(c, { link, parcelas = [], emojis = true } = {}) {
  const e = (x) => (emojis ? `${x} ` : '');
  const radio = nomeEmissora(c.radio?.nome || '');
  const contato = c.cliente?.contato_nome?.split(' ')[0];
  const produto = c.programa
    ? `Programa *${c.programa.nome}*${c.plano && c.plano.nome !== 'Plano comercial' ? ` (${c.plano.nome})` : ''}`
    : '*Pacote de inserções*';
  const inclui = String(c.observacoes || c.descricao_produto || '')
    .split('\n').map((t) => t.replace(/^[-•*\s]+/, '').trim()).filter((t) => t && !t.endsWith(':')).slice(0, 8);
  const primeiro = parcelas[0]?.vencimento;

  const linhas = [
    `Olá${contato ? `, ${contato}` : ''}! ${emojis ? '👋' : ''}`.trim(),
    `Aqui é ${c.vendedor?.nome || 'a equipe comercial'}, da ${radio}. Segue o contrato de anúncio para você conferir e assinar.`,
    '',
    `${e('📻')}*${radio}* · ${produto}`,
  ];
  if (inclui.length) {
    linhas.push('', `${e('✅')}*O que está incluso:*`, ...inclui.map((t) => `• ${t}`));
  }
  linhas.push(
    '',
    `${e('📅')}*Período:* ${c.meses} ${c.meses === 1 ? 'mês' : 'meses'} (${data(c.data_inicio)} a ${data(c.data_fim)})`,
    `${e('💰')}*Valor:* ${moeda(c.valor_mensal)} por mês`,
  );
  if (primeiro) linhas.push(`${e('🗓️')}*1º vencimento:* ${data(primeiro)}`);
  if (link) {
    linhas.push('', `${e('✍️')}*Para assinar*, é só tocar no link abaixo. É rápido e pode ser feito pelo celular:`, link);
  }
  linhas.push('', 'Qualquer dúvida, estou à disposição!', `${c.vendedor?.nome || ''}`.trim());
  return linhas.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

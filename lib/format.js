const moedaFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function moeda(v) {
  return moedaFmt.format(Number(v || 0));
}

// 'YYYY-MM-DD' -> 'DD/MM/YYYY' (sem problemas de fuso)
export function data(d) {
  if (!d) return '';
  const [y, m, dia] = String(d).slice(0, 10).split('-');
  return `${dia}/${m}/${y}`;
}

export function dataHora(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export function hora(t) {
  return t ? String(t).slice(0, 5) : '';
}

export function horario(p) {
  if (!p?.horario_inicio) return '';
  return `${hora(p.horario_inicio)} às ${hora(p.horario_fim)}`;
}

export function tempoDesde(ts) {
  const min = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? 's' : ''}`;
}

export function hojeISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export function somarMeses(iso, meses) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + meses, d));
  // se o dia "estourou" (ex.: 31/01 + 1 mês), volta para o último dia do mês
  if (dt.getUTCDate() !== d) dt.setUTCDate(0);
  return dt.toISOString().slice(0, 10);
}

export function somarDias(iso, dias) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

export function linkWhatsApp(telefone, texto) {
  let num = String(telefone || '').replace(/\D/g, '');
  if (num && !num.startsWith('55')) num = '55' + num;
  const base = num ? `https://wa.me/${num}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(texto || '')}`;
}

export const STATUS_VISITA = {
  em_andamento: 'Em visitação',
  proposta: 'Proposta enviada',
  fechado: 'Fechado',
  perdido: 'Não fechou',
};

export const STATUS_CONTRATO = {
  pendente: 'Aguardando assinatura',
  ativo: 'Ativo',
  encerrado: 'Encerrado',
  cancelado: 'Cancelado',
};

export const STATUS_PARCELA = {
  a_emitir: 'Boleto a emitir',
  emitido: 'Boleto emitido',
  pago: 'Pago',
  cancelado: 'Cancelado',
};

export function statusPrograma(livres, total) {
  if (total === 0 || livres <= 0) return { cor: 'vermelho', texto: 'Lotado' };
  if (livres === 1) return { cor: 'amarelo', texto: 'Última vaga' };
  return { cor: 'verde', texto: `${livres} vagas` };
}

// Aceita "1.500,50", "1500,50" ou "1500.50"
export function parseValor(s) {
  let v = String(s ?? '').trim().replace(/[R$\s]/g, '');
  if (v.includes(',')) v = v.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(v)) v = v.replace(/\./g, ''); // "1.200" = mil e duzentos
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function valorParaCampo(n) {
  return n == null ? '' : Number(n).toFixed(2).replace('.', ',');
}

import 'server-only';
import { renderToBuffer } from '@react-pdf/renderer';
import { DocumentoPdf } from '@/lib/pdfContrato';

export const SELECT_CONTRATO = '*, cliente:clientes(*), programa:programas(nome, valor_cota), plano:programa_planos(nome, valor), radio:radios(*), segmento:segmentos(nome), vendedor:profiles(nome)';

// Monta o PDF do contrato (o mesmo do botão "Baixar contrato em PDF")
export async function gerarPdfContrato(supabase, c) {
  const [{ data: parcelas }, { data: itens }] = await Promise.all([
    supabase.from('parcelas').select('vencimento, valor').eq('contrato_id', c.id).order('numero'),
    supabase.from('contrato_itens').select('*').eq('contrato_id', c.id).order('created_at'),
  ]);
  return renderToBuffer(DocumentoPdf({ c, itens: itens || [], parcelas: parcelas || [] }));
}

export function nomeArquivo(c) {
  return `Contrato ${c.numero} ${c.cliente?.nome || ''}`.trim().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/\s+/g, '_');
}

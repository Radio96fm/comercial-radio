import { renderToBuffer } from '@react-pdf/renderer';
import { getSessao } from '@/lib/auth';
import { DocumentoPdf } from '@/lib/pdfContrato';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const { supabase } = await getSessao();
  const { data: c } = await supabase
    .from('contratos')
    .select('*, cliente:clientes(*), programa:programas(nome, valor_cota), plano:programa_planos(nome, valor), radio:radios(*), segmento:segmentos(nome), vendedor:profiles(nome)')
    .eq('id', params.id)
    .maybeSingle();
  if (!c) return new Response('Contrato não encontrado', { status: 404 });
  const [{ data: parcelas }, { data: itens }] = await Promise.all([
    supabase.from('parcelas').select('vencimento, valor').eq('contrato_id', c.id).order('numero'),
    supabase.from('contrato_itens').select('*').eq('contrato_id', c.id).order('created_at'),
  ]);

  const pdf = await renderToBuffer(DocumentoPdf({ c, itens: itens || [], parcelas: parcelas || [] }));
  const nome = `Contrato ${c.numero} ${c.cliente?.nome || ''}`.trim().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/\s+/g, '_');
  const baixar = new URL(request.url).searchParams.has('baixar');
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${baixar ? 'attachment' : 'inline'}; filename="${nome}.pdf"; filename*=UTF-8''${encodeURIComponent(nome)}.pdf`,
      'Cache-Control': 'private, no-store',
    },
  });
}

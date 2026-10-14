import { getSessao } from '@/lib/auth';
import { gerarPdfContrato, nomeArquivo, SELECT_CONTRATO } from '@/lib/pdfGerar';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const { supabase } = await getSessao();
  const { data: c } = await supabase.from('contratos').select(SELECT_CONTRATO).eq('id', params.id).maybeSingle();
  if (!c) return new Response('Contrato não encontrado', { status: 404 });
  const pdf = await gerarPdfContrato(supabase, c);
  const nome = nomeArquivo(c);
  const baixar = new URL(request.url).searchParams.has('baixar');
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${baixar ? 'attachment' : 'inline'}; filename="${nome}.pdf"; filename*=UTF-8''${encodeURIComponent(nome)}.pdf`,
      'Cache-Control': 'private, no-store',
    },
  });
}

import { getSessao } from '@/lib/auth';
import { periodoComissao, comissoesNoPeriodo } from '@/lib/financeiro';
import { relatorioComissaoPdf } from '@/lib/pdfComissao';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PDF do relatório de comissão. O financeiro vê de qualquer vendedor;
// o vendedor (pelo link do WhatsApp) só vê o dele.
export async function GET(request) {
  const { supabase, perfil, isMaster } = await getSessao();
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const fin = isMaster || perfil.papel === 'financeiro';
  const vendedor = fin ? sp.vendedor : perfil.id;
  if (!vendedor) return new Response('Escolha o vendedor.', { status: 400 });
  const per = periodoComissao(sp);
  const [v] = await comissoesNoPeriodo(supabase, per.de, per.ate, vendedor, per.mes);
  if (!v) return new Response('Vendedor não encontrado.', { status: 404 });
  const pdf = await relatorioComissaoPdf(v, per);
  const nome = `Comissao_${v.nome.replace(/[^\p{L}\p{N}]+/gu, '_')}_${per.de}_a_${per.ate}`;
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${sp.baixar ? 'attachment' : 'inline'}; filename="${nome}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

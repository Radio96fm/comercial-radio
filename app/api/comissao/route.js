import { getSessao } from '@/lib/auth';
import { periodoComissao, comissoesNoPeriodo } from '@/lib/financeiro';
import { relatorioComissaoPdf } from '@/lib/pdfComissao';
import { radioAtual } from '@/lib/radio';

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
  // o link leva a rádio (cada rádio paga a sua comissão); sem ela, vale a escolhida no topo
  const { radio: atual, radios } = await radioAtual(supabase);
  const radio = radios.find((r) => r.id === sp.radio) || atual;
  const [v] = await comissoesNoPeriodo(supabase, per.de, per.ate, vendedor, per.mes, radio?.id);
  if (!v) return new Response('Vendedor não encontrado.', { status: 404 });
  const pdf = await relatorioComissaoPdf(v, per, radio);
  const nome = `Comissao_${(radio?.nome || '').replace(/[^\p{L}\p{N}]+/gu, '_')}_${v.nome.replace(/[^\p{L}\p{N}]+/gu, '_')}_${per.de}_a_${per.ate}`;
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${sp.baixar ? 'attachment' : 'inline'}; filename="${nome}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

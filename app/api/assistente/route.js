import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { configIA, gerar } from '@/lib/ia';
import { PEDIDO_RESUMO } from '@/lib/assistente';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LIMITE_TEXTO = 12000; // acima disso, a IA resume antes de guardar

function textoDoHtml(html) {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

// Gestor adiciona material para treinar o assistente.
// PDFs chegam pelo armazenamento (o navegador sobe o arquivo direto) e são resumidos pela IA.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: 'Entre de novo no sistema.' }, { status: 401 });
  const { data: perfil } = await supabase.from('profiles').select('papel').eq('id', user.id).maybeSingle();
  if (perfil?.papel !== 'gestor') return NextResponse.json({ erro: 'Só o gestor pode treinar o assistente.' }, { status: 403 });

  const { tipo, titulo, texto, url, caminho } = await request.json().catch(() => ({}));
  if (!['instrucao', 'testemunhal', 'texto', 'pdf', 'link'].includes(tipo)) return NextResponse.json({ erro: 'Tipo inválido.' }, { status: 400 });

  let conteudo = String(texto || '').trim();
  let origem = null;
  let nome = String(titulo || '').trim();
  try {
    if (tipo === 'pdf') {
      if (!caminho) throw new Error('Escolha o arquivo PDF.');
      const { data: arq, error } = await supabase.storage.from('assistente').download(caminho);
      if (error) throw new Error('Não consegui abrir o PDF enviado.');
      const buf = Buffer.from(await arq.arrayBuffer());
      supabase.storage.from('assistente').remove([caminho]).catch(() => {});
      if (buf.length > 18 * 1024 * 1024) throw new Error('PDF muito grande. Divida em partes de até 18 MB.');
      const cfg = await configIA();
      conteudo = await gerar({ cfg, sistema: 'Você organiza material de estudo para redatores de rádio.', mensagens: [{ papel: 'vendedor', texto: PEDIDO_RESUMO }], pdf: buf.toString('base64'), maxTokens: 4000 });
      origem = caminho.split('/').pop().replace(/^\d+-/, '');
      nome = nome || origem.replace(/\.pdf$/i, '');
    } else if (tipo === 'link') {
      let u;
      try { u = new URL(String(url || '').trim()); } catch { throw new Error('Cole um link válido, começando com https://'); }
      if (!/^https?:$/.test(u.protocol)) throw new Error('Cole um link válido, começando com https://');
      const resp = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (assistente comercial)' }, signal: AbortSignal.timeout(15000), cache: 'no-store' }).catch(() => null);
      if (!resp?.ok) throw new Error('Não consegui abrir esse link. Se a página pede login, copie o texto e cole em "Texto de apoio".');
      const html = await resp.text();
      const tituloPagina = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
      const limpo = textoDoHtml(html).slice(0, 60000);
      if (limpo.length < 200) throw new Error('A página não tem texto que eu consiga ler. Copie o conteúdo e cole em "Texto de apoio".');
      const cfg = await configIA();
      conteudo = await gerar({ cfg, sistema: 'Você organiza material de estudo para redatores de rádio.', mensagens: [{ papel: 'vendedor', texto: `${PEDIDO_RESUMO}\n\nMaterial (página ${u.href}):\n${limpo}` }], maxTokens: 4000 });
      origem = u.href;
      nome = nome || tituloPagina || u.hostname;
    } else {
      if (!conteudo) throw new Error('Escreva ou cole o texto.');
      if (tipo === 'texto' && conteudo.length > LIMITE_TEXTO) {
        const cfg = await configIA();
        conteudo = await gerar({ cfg, sistema: 'Você organiza material de estudo para redatores de rádio.', mensagens: [{ papel: 'vendedor', texto: `${PEDIDO_RESUMO}\n\nMaterial:\n${conteudo.slice(0, 200000)}` }], maxTokens: 4000 });
      }
      nome = nome || conteudo.split('\n')[0].slice(0, 60);
    }
  } catch (e) {
    return NextResponse.json({ erro: e.message || 'Não deu certo agora. Tente de novo.' }, { status: 400 });
  }

  const { error } = await supabase.from('assistente_materiais').insert({ tipo, titulo: nome.slice(0, 120), conteudo, origem });
  if (error) return NextResponse.json({ erro: 'Não consegui salvar. Tente de novo.' }, { status: 500 });
  return NextResponse.json({ ok: true, resumido: ['pdf', 'link'].includes(tipo) || conteudo !== String(texto || '').trim() });
}

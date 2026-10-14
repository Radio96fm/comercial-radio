import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { configIA, gerar } from '@/lib/ia';
import { fotoDoSistema, REGRAS_DUVIDAS } from '@/lib/fotoSistema';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Assistente de dúvidas da tela inicial: responde com os dados atuais do sistema.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: 'Entre de novo no sistema.' }, { status: 401 });
  const { data: perfil } = await supabase.from('profiles').select('id, nome, ativo, papel, comissao').eq('id', user.id).maybeSingle();
  if (!perfil?.ativo) return NextResponse.json({ erro: 'Usuário desativado.' }, { status: 403 });

  const { mensagens } = await request.json().catch(() => ({}));
  const conversa = (Array.isArray(mensagens) ? mensagens : [])
    .filter((m) => m && typeof m.texto === 'string' && m.texto.trim())
    .slice(-20)
    .map((m) => ({ papel: m.papel === 'assistente' ? 'assistente' : 'vendedor', texto: m.texto.slice(0, 4000) }));
  while (conversa[0]?.papel === 'assistente') conversa.shift();
  if (!conversa.length || conversa[conversa.length - 1].papel !== 'vendedor') {
    return NextResponse.json({ erro: 'Escreva ou fale sua pergunta.' }, { status: 400 });
  }

  try {
    const [cfg, foto] = await Promise.all([configIA(), fotoDoSistema(supabase, perfil, perfil.papel === 'gestor')]);
    const texto = await gerar({ cfg, sistema: REGRAS_DUVIDAS, contexto: `# DADOS DO SISTEMA (agora)\n${foto}`, mensagens: conversa, maxTokens: 1500 });
    return NextResponse.json({ texto });
  } catch (e) {
    return NextResponse.json({ erro: e.message || 'Não deu certo agora. Tente de novo.' }, { status: 500 });
  }
}

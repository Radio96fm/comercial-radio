import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { configIA, gerar } from '@/lib/ia';
import { montarSistema, montarContexto } from '@/lib/assistente';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Chat do vendedor: recebe a conversa e devolve a próxima resposta da IA.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: 'Entre de novo no sistema.' }, { status: 401 });

  const { clienteId, programaId, duracao, mensagens } = await request.json().catch(() => ({}));
  const conversa = (Array.isArray(mensagens) ? mensagens : [])
    .filter((m) => m && typeof m.texto === 'string' && m.texto.trim())
    .slice(-30)
    .map((m) => ({ papel: m.papel === 'assistente' ? 'assistente' : 'vendedor', texto: m.texto.slice(0, 8000) }));
  if (!conversa.length || conversa[conversa.length - 1].papel !== 'vendedor') {
    return NextResponse.json({ erro: 'Escreva ou fale alguma coisa sobre o cliente.' }, { status: 400 });
  }
  // a conversa sempre começa pelo vendedor
  while (conversa[0]?.papel === 'assistente') conversa.shift();

  const [{ data: cliente }, { data: programa }, { data: materiais }] = await Promise.all([
    supabase.from('clientes').select('nome, cidade, endereco, telefone, observacoes, segmento:segmentos(nome)').eq('id', clienteId).maybeSingle(),
    programaId
      ? supabase.from('programas').select('nome, apresentador, descricao, radio:radios(nome)').eq('id', programaId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('assistente_materiais').select('tipo, titulo, conteudo').eq('ativo', true).order('created_at'),
  ]);
  if (!cliente) return NextResponse.json({ erro: 'Cliente não encontrado.' }, { status: 404 });

  try {
    const cfg = await configIA();
    const texto = await gerar({
      cfg,
      sistema: montarSistema(materiais || []),
      contexto: montarContexto({ cliente, programa, duracao: [15, 30, 45, 60].includes(Number(duracao)) ? Number(duracao) : 30 }),
      mensagens: conversa,
    });
    return NextResponse.json({ texto });
  } catch (e) {
    return NextResponse.json({ erro: e.message || 'Não deu certo agora. Tente de novo.' }, { status: 500 });
  }
}

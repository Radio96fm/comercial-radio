import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

// Assistente de testemunhal: fala com a IA escolhida no painel do gestor
// (Gemini, Claude ou ChatGPT). A chave fica no banco (privado.config) e só é
// lida aqui no servidor, com o segredo ADMIN_PROXY_SECRET.

export const PROVEDORES = {
  gemini: { nome: 'Gemini (Google)', chave: 'https://aistudio.google.com/apikey', padrao: 'gemini-2.5-flash' },
  claude: { nome: 'Claude (Anthropic)', chave: 'https://console.anthropic.com/settings/keys', padrao: 'claude-haiku-5-5' },
  openai: { nome: 'ChatGPT (OpenAI)', chave: 'https://platform.openai.com/api-keys', padrao: 'gpt-4o-mini' },
};

export async function configIA() {
  const resp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/ia_cfg`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ p_segredo: process.env.ADMIN_PROXY_SECRET || '' }),
    cache: 'no-store',
  });
  if (!resp.ok) throw new Error(`Falha ao ler a configuração (${resp.status}).`);
  const cfg = await resp.json();
  if (!cfg?.provedor || !cfg?.token) throw new Error('O assistente ainda não foi ligado. Peça ao gestor para colar a chave da IA em "Treinar assistente".');
  return { ...cfg, modelo: cfg.modelo || PROVEDORES[cfg.provedor].padrao };
}

const versao = (re) => (nome) => {
  const m = nome.match(re);
  return m ? Number(m[1]) : null;
};
const maisNovo = (nomes, re, padrao) => {
  const v = versao(re);
  const ok = nomes.filter((n) => v(n) !== null).sort((a, b) => v(b) - v(a));
  return ok[0] || padrao;
};

async function json(resp, quem) {
  const corpo = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = corpo?.error?.message || corpo?.message || `erro ${resp.status}`;
    if (resp.status === 429) throw new Error(`${quem} está no limite de uso agora. Espere um minuto e tente de novo.`);
    if (resp.status === 401 || resp.status === 403) throw new Error(`${quem} recusou a chave: ${msg}`);
    throw new Error(`${quem}: ${msg}`);
  }
  return corpo;
}

// Na hora de salvar a chave, descobre o modelo rápido mais novo que ela libera.
export async function escolherModelo(provedor, token) {
  if (provedor === 'gemini') {
    const r = await json(await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
      headers: { 'x-goog-api-key': token }, cache: 'no-store',
    }), 'O Gemini');
    const nomes = (r.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''));
    return maisNovo(nomes, /^gemini-(\d+(?:\.\d+)?)-flash$/, PROVEDORES.gemini.padrao);
  }
  if (provedor === 'openai') {
    const r = await json(await fetch('https://api.openai.com/v1/models', {
      headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
    }), 'O ChatGPT');
    return maisNovo((r.data || []).map((m) => m.id), /^gpt-(\d+(?:\.\d+)?)-mini$/, PROVEDORES.openai.padrao);
  }
  return PROVEDORES.claude.padrao;
}

// sistema: texto fixo (regras + base de conhecimento), reaproveitado entre conversas
// contexto: dados que mudam a cada conversa (cliente, programa)
// mensagens: [{ papel: 'vendedor' | 'assistente', texto }]
// pdf: base64 de um PDF para ler junto com a primeira mensagem
export async function gerar({ cfg, sistema, contexto = '', mensagens, pdf, maxTokens = 2000 }) {
  const { provedor, modelo, token } = cfg;
  const ultima = mensagens.length - 1;

  if (provedor === 'gemini') {
    const contents = mensagens.map((m, i) => ({
      role: m.papel === 'assistente' ? 'model' : 'user',
      parts: [
        ...(pdf && i === ultima ? [{ inline_data: { mime_type: 'application/pdf', data: pdf } }] : []),
        { text: m.texto },
      ],
    }));
    const r = await json(await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': token, 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${sistema}\n\n${contexto}`.trim() }] },
        contents,
        // o "pensamento" do Gemini também consome tokens de saída
        generationConfig: { maxOutputTokens: maxTokens + 6000, temperature: 0.9 },
      }),
      cache: 'no-store',
    }), 'O Gemini');
    const cand = r.candidates?.[0];
    const texto = (cand?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('').trim();
    if (!texto) throw new Error(cand?.finishReason === 'SAFETY' ? 'O Gemini não quis responder a esse pedido. Tente explicar de outro jeito.' : 'O Gemini não devolveu resposta. Tente de novo.');
    return texto;
  }

  if (provedor === 'openai') {
    const messages = [
      { role: 'system', content: `${sistema}\n\n${contexto}`.trim() },
      ...mensagens.map((m, i) => ({
        role: m.papel === 'assistente' ? 'assistant' : 'user',
        content: pdf && i === ultima
          ? [{ type: 'file', file: { filename: 'material.pdf', file_data: `data:application/pdf;base64,${pdf}` } }, { type: 'text', text: m.texto }]
          : m.texto,
      })),
    ];
    const r = await json(await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: modelo, messages, max_completion_tokens: maxTokens + 6000 }),
      cache: 'no-store',
    }), 'O ChatGPT');
    const texto = r.choices?.[0]?.message?.content?.trim();
    if (!texto) throw new Error('O ChatGPT não devolveu resposta. Tente de novo.');
    return texto;
  }

  // Claude: a parte fixa vai em cache, então só é cobrada inteira na primeira conversa
  const client = new Anthropic({ apiKey: token });
  try {
    const r = await client.messages.create({
      model: modelo,
      max_tokens: maxTokens,
      system: [
        { type: 'text', text: sistema, cache_control: { type: 'ephemeral' } },
        ...(contexto ? [{ type: 'text', text: contexto }] : []),
      ],
      messages: mensagens.map((m, i) => ({
        role: m.papel === 'assistente' ? 'assistant' : 'user',
        content: pdf && i === ultima
          ? [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf } }, { type: 'text', text: m.texto }]
          : m.texto,
      })),
    });
    const texto = r.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    if (!texto) throw new Error('O Claude não devolveu resposta. Tente de novo.');
    return texto;
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new Error('O Claude está no limite de uso agora. Espere um minuto e tente de novo.');
    if (e instanceof Anthropic.AuthenticationError) throw new Error('O Claude recusou a chave.');
    if (e instanceof Anthropic.APIError) throw new Error(`Claude: ${e.message}`);
    throw e;
  }
}

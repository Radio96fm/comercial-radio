import 'server-only';

// Criação e alteração de logins. Acontece numa função dentro do Supabase
// (admin-usuarios), que guarda a chave mestra; aqui só vai um segredo
// compartilhado. Só chamar depois de conferir que quem pede é gestor.
async function chamar(op, corpo) {
  const segredo = process.env.ADMIN_PROXY_SECRET;
  if (!segredo) throw new Error('ADMIN_PROXY_SECRET não configurada.');
  const resp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-usuarios`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-secret': segredo,
      authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ op, ...corpo }),
    cache: 'no-store',
  });
  const r = await resp.json().catch(() => ({ error: `Falha ao falar com o servidor (${resp.status}).` }));
  return r.error ? { error: { message: r.error }, id: r.id } : r;
}

// Cria o login já com o papel (gestor/vendedor) gravado no perfil.
export function adminCriarUsuario(dados) {
  return chamar('criar', { dados });
}

// Altera senha, papel (app_metadata) ou bloqueio (ban_duration) de um login.
export function adminAtualizarUsuario(id, dados) {
  return chamar('atualizar', { id, dados });
}

// Operações de administração de logins (criar usuário, trocar papel, senha, bloqueio, excluir).
// Roda dentro do Supabase, onde a chave mestra já existe; o site só chama esta
// função com um segredo compartilhado (ADMIN_PROXY_SECRET). O banco guarda só o
// SHA-256 desse segredo (privado.config, lido por public.admin_proxy_hash()).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function igual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function sha256(texto: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'método não permitido' }, 405);
  const { data: esperado } = await admin.rpc('admin_proxy_hash');
  const recebido = req.headers.get('x-admin-secret') ?? '';
  if (!recebido || !igual(await sha256(recebido), esperado ?? '')) {
    return json({ error: 'não autorizado' }, 401);
  }
  const { op, id, dados } = await req.json().catch(() => ({}));

  if (op === 'criar') {
    const { data, error } = await admin.auth.admin.createUser(dados);
    if (error) return json({ error: error.message });
    const papel = dados?.app_metadata?.papel;
    if (papel) {
      const { error: e2 } = await admin.from('profiles').update({ papel }).eq('id', data.user.id);
      if (e2) return json({ error: e2.message, id: data.user.id });
    }
    return json({ id: data.user.id });
  }

  if (op === 'atualizar' && id) {
    const { error } = await admin.auth.admin.updateUserById(id, dados);
    return json(error ? { error: error.message } : { ok: true });
  }

  if (op === 'excluir' && id) {
    const { error } = await admin.auth.admin.deleteUser(id);
    return json(error ? { error: error.message } : { ok: true });
  }

  return json({ error: 'operação inválida' }, 400);
});

import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Cliente com a chave MESTRA (service role). Ignora as regras de acesso.
// Só pode ser usado no servidor, e só depois de conferir que quem pede é gestor.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

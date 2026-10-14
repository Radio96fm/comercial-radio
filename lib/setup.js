import 'server-only';
import { createClient } from '@supabase/supabase-js';

export async function existeGestor() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.rpc('existe_gestor');
  if (error) throw new Error('Não foi possível acessar o banco. Confira as variáveis de ambiente e se o schema.sql foi executado.');
  return data === true;
}

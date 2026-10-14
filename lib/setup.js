import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export async function existeGestor() {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('papel', 'gestor');
  if (error) throw new Error('Não foi possível acessar o banco. Confira as variáveis de ambiente e se o schema.sql foi executado.');
  return (count || 0) > 0;
}

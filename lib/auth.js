import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Retorna o cliente Supabase, o usuário logado e o perfil (nome, papel).
// Se não estiver logado ou estiver desativado, manda para o login.
// cache(): layout e página da mesma tela reaproveitam a mesma consulta.
export const getSessao = cache(async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, nome, email, telefone, papel, ativo, documento, comissao')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil || !perfil.ativo) redirect('/login?erro=inativo');
  // gestor = master (tudo) ou comercial (sem usuários, assistente e financeiro)
  return { supabase, user, perfil, isGestor: ['gestor', 'comercial'].includes(perfil.papel), isMaster: perfil.papel === 'gestor' };
});

export async function requireGestor() {
  const sessao = await getSessao();
  if (!sessao.isGestor) redirect('/app');
  return sessao;
}

export async function requireMaster() {
  const sessao = await getSessao();
  if (!sessao.isMaster) redirect(sessao.isGestor ? '/gestao' : '/app');
  return sessao;
}

// por enquanto o financeiro fica dentro do painel do gestor master
export const requireFinanceiro = requireMaster;

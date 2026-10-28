import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { bloqueado } from '@/lib/funcoes';
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
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil || !perfil.ativo) redirect('/login?erro=inativo');
  // gestor = master (tudo) ou comercial (sem usuários, assistente e financeiro)
  // dev = desenvolvedor do sistema (gestor master + Painel do Desenvolvedor)
  const isMaster = perfil.papel === 'gestor';
  const isDev = isMaster && perfil.dev === true;
  // função desligada pelo desenvolvedor para este acesso (o caminho vem do middleware)
  if (!isDev && bloqueado(headers().get('x-caminho'), perfil.funcoes_bloqueadas)) redirect('/sem-acesso');
  return { supabase, user, perfil, isGestor: ['gestor', 'comercial'].includes(perfil.papel), isMaster, isDev };
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

export async function requireDev() {
  const sessao = await getSessao();
  if (!sessao.isDev) redirect(sessao.isGestor ? '/gestao' : '/app');
  return sessao;
}

// Financeiro: o acesso próprio do financeiro (/financeiro) e o gestor master (dentro do painel)
export async function requireFinanceiro() {
  const sessao = await getSessao();
  const ehFinanceiro = sessao.perfil.papel === 'financeiro';
  if (!ehFinanceiro && !sessao.isMaster) redirect(sessao.isGestor ? '/gestao' : '/app');
  return { ...sessao, baseFin: ehFinanceiro ? '/financeiro' : '/gestao/financeiro' };
}

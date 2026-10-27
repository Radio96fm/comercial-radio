-- Mapa do fluxo (/fluxo): aberto sem login para quem tem o link.
-- A tabela fica fechada; só as duas funções abaixo leem e gravam a linha 'fluxo'.
-- Rodar uma vez no SQL Editor do Supabase.

create table if not exists public.mapa_fluxo (
  id text primary key,
  dados jsonb not null,
  versao text,
  atualizado_em timestamptz not null default now()
);
alter table public.mapa_fluxo enable row level security;
revoke all on public.mapa_fluxo from anon, authenticated;

create or replace function public.mapa_ler(p_id text) returns jsonb
language sql stable security definer set search_path = public as $$
  select dados from public.mapa_fluxo where id = p_id and p_id = 'fluxo';
$$;

-- grava só se ninguém salvou outra versão desde que a pessoa abriu o mapa
create or replace function public.mapa_salvar(p_id text, p_dados jsonb, p_base text) returns text
language plpgsql security definer set search_path = public as $$
declare atual text;
begin
  if p_id <> 'fluxo' then raise exception 'mapa inválido'; end if;
  if octet_length(p_dados::text) > 1500000 then raise exception 'mapa grande demais'; end if;
  select versao into atual from public.mapa_fluxo where id = p_id for update;
  if found and atual is distinct from p_base then return 'conflito'; end if;
  insert into public.mapa_fluxo (id, dados, versao, atualizado_em)
  values (p_id, p_dados, p_dados->>'versao', now())
  on conflict (id) do update set dados = excluded.dados, versao = excluded.versao, atualizado_em = now();
  return 'ok';
end;
$$;

revoke all on function public.mapa_ler(text) from public;
revoke all on function public.mapa_salvar(text, jsonb, text) from public;
grant execute on function public.mapa_ler(text) to anon, authenticated;
grant execute on function public.mapa_salvar(text, jsonb, text) to anon, authenticated;

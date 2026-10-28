-- =====================================================================
--  INTEGRAÇÕES NO PAINEL DO DESENVOLVEDOR (2026-10-28)
--  Chaves de IA, Autentique e ElevenLabs: só o desenvolvedor configura.
-- =====================================================================

create or replace function public.salvar_autentique(p_token text, p_webhook text) returns void
language plpgsql security definer set search_path = public, privado as $f$
begin
  if not public.is_dev() then raise exception 'Só o desenvolvedor configura as integrações.'; end if;
  if coalesce(p_token, '') <> '' then
    insert into privado.config values ('autentique_token', p_token) on conflict (chave) do update set valor = excluded.valor;
  end if;
  if coalesce(p_webhook, '') <> '' then
    insert into privado.config values ('autentique_webhook_secret', p_webhook) on conflict (chave) do update set valor = excluded.valor;
  end if;
end $f$;

create or replace function public.salvar_ia(p_provedor text, p_modelo text, p_token text) returns void
language plpgsql security definer set search_path = public, privado as $f$
begin
  if not public.is_dev() then raise exception 'Só o desenvolvedor configura as integrações.'; end if;
  if p_provedor not in ('claude','gemini','openai') then raise exception 'IA inválida.'; end if;
  insert into privado.config values ('ia_provedor', p_provedor) on conflict (chave) do update set valor = excluded.valor;
  insert into privado.config values ('ia_modelo', coalesce(p_modelo, '')) on conflict (chave) do update set valor = excluded.valor;
  if coalesce(p_token, '') <> '' then
    insert into privado.config values ('ia_token_' || p_provedor, p_token) on conflict (chave) do update set valor = excluded.valor;
  end if;
end $f$;

-- ElevenLabs (voz): a chave fica guardada para a locução dos testemunhais
create or replace function public.salvar_elevenlabs(p_token text, p_voz text) returns void
language plpgsql security definer set search_path = public, privado as $f$
begin
  if not public.is_dev() then raise exception 'Só o desenvolvedor configura as integrações.'; end if;
  if coalesce(p_token, '') <> '' then
    insert into privado.config values ('elevenlabs_token', p_token) on conflict (chave) do update set valor = excluded.valor;
  end if;
  insert into privado.config values ('elevenlabs_voz', coalesce(p_voz, '')) on conflict (chave) do update set valor = excluded.valor;
end $f$;
revoke execute on function public.salvar_elevenlabs(text, text) from public, anon;
grant execute on function public.salvar_elevenlabs(text, text) to authenticated;

create or replace function public.elevenlabs_situacao() returns json
language sql stable security definer set search_path = privado as $f$
  select json_build_object(
    'token', exists (select 1 from privado.config where chave = 'elevenlabs_token'),
    'voz', (select valor from privado.config where chave = 'elevenlabs_voz'));
$f$;
revoke execute on function public.elevenlabs_situacao() from public, anon;
grant execute on function public.elevenlabs_situacao() to authenticated;

-- =====================================================================
--  PAINEL DO DESENVOLVEDOR + VENDEDORES/AGÊNCIAS DOS CONTRATOS (2026-10-28)
--
--  - profiles.dev: quem abre o Painel do Desenvolvedor (/dev).
--  - representantes: vendedores e agências que aparecem nos contratos
--    importados dos PDFs, antes mesmo de terem login.
--  - contratos.representante_id: de quem é o contrato no PDF.
--  - Quando a pessoa se cadastra pelo link com o mesmo CPF/CNPJ, os
--    contratos e clientes passam sozinhos para o login dela.
--
--  Como usar: Supabase > SQL Editor > New query > cole TODO este arquivo
--  e clique em "Run". Pode rodar de novo sem problema.
-- =====================================================================

alter table public.profiles add column if not exists dev boolean not null default false;
update public.profiles set dev = true where lower(email) = 'marketing@radio96fm.com';

create or replace function public.is_dev() returns boolean
language sql stable security definer set search_path = public as $f$
  select exists (select 1 from public.profiles where id = auth.uid() and ativo and dev and papel::text = 'gestor');
$f$;
revoke all on function public.is_dev() from public, anon;
grant execute on function public.is_dev() to authenticated;

-- ---------------------------------------------------------------- vendedores e agências
create table if not exists public.representantes (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  tipo              text not null default 'vendedor' check (tipo in ('vendedor', 'agencia')),
  documento         text,
  documento_digitos text generated always as (nullif(regexp_replace(coalesce(documento, ''), '\D', '', 'g'), '')) stored,
  telefone          text,
  email             text,
  observacoes       text,
  profile_id        uuid references public.profiles(id) on delete set null,
  vinculado_em      timestamptz,
  created_at        timestamptz not null default now()
);
create unique index if not exists representantes_documento_unico on public.representantes (documento_digitos) where documento_digitos is not null;

alter table public.representantes enable row level security;
drop policy if exists representantes_ler on public.representantes;
create policy representantes_ler on public.representantes for select to authenticated using (public.is_gestor() or public.is_financeiro());
drop policy if exists representantes_dev on public.representantes;
create policy representantes_dev on public.representantes for all to authenticated using (public.is_dev()) with check (public.is_dev());
grant select, insert, update, delete on public.representantes to authenticated;

alter table public.contratos add column if not exists representante_id uuid references public.representantes(id) on delete set null;
create index if not exists contratos_representante on public.contratos (representante_id);

-- ---------------------------------------------------------------- transferência pelo vínculo
-- O vínculo troca o vendedor dos contratos e clientes. Os gatilhos de proteção
-- deixam passar só quando a marca app.vinculo_representante está ligada.
create or replace function public.proteger_contrato() returns trigger
language plpgsql security definer set search_path = public as $f$
begin
  if public.is_gestor() or auth.uid() is null or current_setting('app.vinculo_representante', true) = '1' then
    return new;
  end if;
  if new.vendedor_id <> old.vendedor_id then
    raise exception 'Somente o gestor pode transferir um contrato para outro vendedor.';
  end if;
  if new.status not in ('pendente', 'ativo', 'cancelado') then
    raise exception 'Somente o gestor pode encerrar contratos.';
  end if;
  return new;
end $f$;

create or replace function public.proteger_cliente() returns trigger
language plpgsql security definer set search_path = public as $f$
begin
  if public.is_gestor() or auth.uid() is null or current_setting('app.vinculo_representante', true) = '1' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.vendedor_id := coalesce(new.vendedor_id, auth.uid());
    if new.vendedor_id <> auth.uid() then
      raise exception 'Você só pode cadastrar clientes na sua própria carteira.';
    end if;
    new.created_by := auth.uid();
  elsif new.vendedor_id is distinct from old.vendedor_id
    and not (new.vendedor_id = auth.uid() and current_setting('app.visita_transfere', true) = old.id::text) then
    raise exception 'Somente o gestor pode transferir um cliente para outro vendedor.';
  end if;
  return new;
end $f$;

create or replace function privado.vincular_representante(p_rep uuid, p_profile uuid) returns int
language plpgsql security definer set search_path = public as $f$
declare n int;
begin
  update public.representantes set profile_id = p_profile, vinculado_em = now() where id = p_rep;
  perform set_config('app.vinculo_representante', '1', true);
  update public.contratos set vendedor_id = p_profile where representante_id = p_rep;
  get diagnostics n = row_count;
  update public.clientes set vendedor_id = p_profile
   where id in (select cliente_id from public.contratos where representante_id = p_rep);
  perform set_config('app.vinculo_representante', '', true);
  return n;
end $f$;
revoke all on function privado.vincular_representante(uuid, uuid) from public, anon, authenticated;

-- Desenvolvedor liga um vendedor/agência a um login (ou troca o login)
create or replace function public.vincular_representante(p_rep uuid, p_profile uuid) returns int
language plpgsql security definer set search_path = public as $f$
begin
  if not public.is_dev() then raise exception 'Só o desenvolvedor pode vincular.'; end if;
  if not exists (select 1 from public.profiles where id = p_profile and ativo) then raise exception 'Login não encontrado.'; end if;
  return privado.vincular_representante(p_rep, p_profile);
end $f$;
revoke all on function public.vincular_representante(uuid, uuid) from public, anon;
grant execute on function public.vincular_representante(uuid, uuid) to authenticated;

-- Fim do cadastro pelo link: grava o CPF/CNPJ e, se ele estiver num contrato
-- importado, os contratos passam para o novo login. Devolve quantos.
create or replace function public.concluir_cadastro(p_documento text) returns int
language plpgsql security definer set search_path = public as $f$
declare
  v_uid uuid := auth.uid();
  v_dig text := nullif(regexp_replace(coalesce(p_documento, ''), '\D', '', 'g'), '');
  v_rep uuid;
begin
  if v_uid is null or not public.usuario_ativo() then raise exception 'Sem permissão'; end if;
  update public.profiles set documento = left(trim(p_documento), 30) where id = v_uid;
  if v_dig is null then return 0; end if;
  select id into v_rep from public.representantes where documento_digitos = v_dig and profile_id is null;
  if v_rep is null then return 0; end if;
  return privado.vincular_representante(v_rep, v_uid);
end $f$;
revoke all on function public.concluir_cadastro(text) from public, anon;
grant execute on function public.concluir_cadastro(text) to authenticated;

-- ---------------------------------------------------------------- funções liberadas por pessoa
-- Lista de telas/funções que o desenvolvedor desligou para cada acesso
alter table public.profiles add column if not exists funcoes_bloqueadas text[] not null default '{}';
alter table public.profiles add column if not exists ultimo_acesso timestamptz;

create or replace function public.profiles_proteger() returns trigger
language plpgsql security definer set search_path = public as $f$
begin
  -- papel, comissão e bloqueio: só o gestor master (ou o servidor) muda
  if auth.uid() is not null and not public.is_master()
     and (new.papel is distinct from old.papel or new.comissao is distinct from old.comissao or new.ativo is distinct from old.ativo) then
    raise exception 'Só o gestor master pode mudar tipo de acesso, comissão ou bloqueio.';
  end if;
  -- desenvolvedor e funções liberadas: só o desenvolvedor (ou o servidor) muda
  if auth.uid() is not null and not public.is_dev()
     and (new.dev is distinct from old.dev or new.funcoes_bloqueadas is distinct from old.funcoes_bloqueadas) then
    raise exception 'Só o desenvolvedor pode mudar as funções de um acesso.';
  end if;
  return new;
end $f$;

-- ---------------------------------------------------------------- quem entrou e o que abriu
create table if not exists public.acessos_log (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references public.profiles(id) on delete cascade,
  evento      text not null check (evento in ('login', 'tela')),
  caminho     text,
  created_at  timestamptz not null default now()
);
create index if not exists acessos_log_created on public.acessos_log (created_at desc);
create index if not exists acessos_log_usuario on public.acessos_log (usuario_id, created_at desc);
alter table public.acessos_log enable row level security;
drop policy if exists acessos_log_dev on public.acessos_log;
create policy acessos_log_dev on public.acessos_log for select to authenticated using (public.is_dev());
grant select on public.acessos_log to authenticated;

-- O app chama a cada tela aberta e no login. A mesma tela em menos de 2 minutos não repete.
create or replace function public.registrar_acesso(p_evento text, p_caminho text) returns void
language plpgsql security definer set search_path = public as $f$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or p_evento not in ('login', 'tela') then return; end if;
  update public.profiles set ultimo_acesso = now() where id = v_uid;
  if p_evento = 'tela' and exists (
    select 1 from public.acessos_log where usuario_id = v_uid and caminho = p_caminho and created_at > now() - interval '2 minutes'
  ) then return; end if;
  insert into public.acessos_log (usuario_id, evento, caminho) values (v_uid, p_evento, left(p_caminho, 200));
  -- guarda 120 dias
  if random() < 0.01 then delete from public.acessos_log where created_at < now() - interval '120 days'; end if;
end $f$;
revoke all on function public.registrar_acesso(text, text) from public, anon;
grant execute on function public.registrar_acesso(text, text) to authenticated;

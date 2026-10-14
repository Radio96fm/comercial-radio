-- =====================================================================
--  COMERCIAL RÁDIO 96 FM / RÁDIO DO AGRO
--  Estrutura do banco de dados (Supabase / PostgreSQL)
--
--  Como usar: Supabase > SQL Editor > New query > cole TODO este arquivo
--  e clique em "Run". Depois rode o arquivo seed.sql (dados iniciais).
--
--  Segurança: TODAS as tabelas têm Row Level Security (RLS) ligada.
--  Ninguém sem login lê ou grava nada. Vendedor só altera o que é dele.
--  Só gestor altera programas, rádios, segmentos, modelos e usuários.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
do $$ begin
  create type papel_usuario as enum ('gestor', 'vendedor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_visita as enum ('em_andamento', 'proposta', 'fechado', 'perdido');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_contrato as enum ('pendente', 'ativo', 'encerrado', 'cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_parcela as enum ('a_emitir', 'emitido', 'pago', 'cancelado');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

-- Perfil de cada usuário (ligado ao login do Supabase Auth)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  email       text not null,
  telefone    text,
  papel       papel_usuario not null default 'vendedor',
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.radios (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  slogan      text,
  cor         text not null default '#1d4ed8',
  ordem       int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.segmentos (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.programas (
  id              uuid primary key default gen_random_uuid(),
  radio_id        uuid not null references public.radios(id) on delete restrict,
  nome            text not null,
  apresentador    text,
  dias            text not null default 'Segunda a sexta',
  horario_inicio  time,
  horario_fim     time,
  descricao       text,
  cotas_total     int not null default 6 check (cotas_total >= 0),
  valor_cota      numeric(12,2) not null default 0 check (valor_cota >= 0),
  descricao_cota  text,           -- o que o patrocinador recebe (citações, comerciais...)
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (radio_id, nome)
);

create table if not exists public.clientes (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,          -- nome fantasia
  razao_social    text,
  documento       text,                   -- CNPJ ou CPF
  segmento_id     uuid not null references public.segmentos(id) on delete restrict,
  contato_nome    text,
  telefone        text,
  email           text,
  endereco        text,
  cidade          text,
  observacoes     text,
  vendedor_id     uuid references public.profiles(id) on delete set null, -- responsável pela conta
  created_by      uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now()
);
create index if not exists clientes_vendedor_idx on public.clientes(vendedor_id);
create index if not exists clientes_segmento_idx on public.clientes(segmento_id);

create table if not exists public.visitas (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.clientes(id) on delete cascade,
  vendedor_id   uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  status        status_visita not null default 'em_andamento',
  observacoes   text,
  iniciada_em   timestamptz not null default now(),
  encerrada_em  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists visitas_status_idx on public.visitas(status);

create table if not exists public.modelos_contrato (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  conteudo    text not null,
  ativo       boolean not null default true,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create sequence if not exists public.contratos_numero_seq start 1;

create table if not exists public.contratos (
  id                uuid primary key default gen_random_uuid(),
  numero            bigint not null unique default nextval('public.contratos_numero_seq'),
  cliente_id        uuid not null references public.clientes(id) on delete restrict,
  programa_id       uuid not null references public.programas(id) on delete restrict,
  segmento_id       uuid not null references public.segmentos(id) on delete restrict,
  vendedor_id       uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  modelo_id         uuid references public.modelos_contrato(id) on delete set null,
  visita_id         uuid references public.visitas(id) on delete set null,
  data_inicio       date not null,
  data_fim          date not null,
  valor_mensal      numeric(12,2) not null check (valor_mensal >= 0),
  meses             int not null check (meses between 1 and 60),
  dia_vencimento    int not null default 10 check (dia_vencimento between 1 and 28),
  descricao_produto text,
  observacoes       text,
  status            status_contrato not null default 'pendente',
  conteudo_gerado   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (data_fim >= data_inicio)
);
create index if not exists contratos_programa_idx on public.contratos(programa_id);
create index if not exists contratos_vendedor_idx on public.contratos(vendedor_id);

create table if not exists public.parcelas (
  id             uuid primary key default gen_random_uuid(),
  contrato_id    uuid not null references public.contratos(id) on delete cascade,
  numero         int not null,
  vencimento     date not null,
  valor          numeric(12,2) not null,
  status         status_parcela not null default 'a_emitir',
  -- campos para a futura integração bancária (boleto/Pix)
  gateway        text,
  gateway_id     text,
  linha_digitavel text,
  url_boleto     text,
  pago_em        date,
  created_at     timestamptz not null default now(),
  unique (contrato_id, numero)
);

-- Histórico: tudo o que cada usuário faz fica registrado aqui (gravado por gatilho)
create table if not exists public.atividades (
  id          bigint generated always as identity primary key,
  usuario_id  uuid references public.profiles(id) on delete set null,
  tabela      text not null,
  registro_id uuid,
  acao        text not null,
  descricao   text not null,
  created_at  timestamptz not null default now()
);
create index if not exists atividades_created_idx on public.atividades(created_at desc);

-- ---------------------------------------------------------------------
-- Funções auxiliares de permissão
-- ---------------------------------------------------------------------
create or replace function public.usuario_ativo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and ativo);
$$;

create or replace function public.is_gestor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and ativo and papel = 'gestor');
$$;

revoke all on function public.usuario_ativo() from public, anon;
revoke all on function public.is_gestor() from public, anon;
grant execute on function public.usuario_ativo() to authenticated;
grant execute on function public.is_gestor() to authenticated;

-- ---------------------------------------------------------------------
-- Novo login criado -> cria o perfil automaticamente.
-- O papel vem de app_metadata (só o servidor consegue definir), nunca do
-- que o usuário digita. Padrão: vendedor.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Login sem papel definido pelo servidor (ex.: alguém tentando se cadastrar
  -- sozinho) nasce DESATIVADO e não enxerga nada. Quem é criado pelo painel
  -- recebe o papel logo em seguida e é ativado pelo gatilho sincronizar_papel.
  insert into public.profiles (id, nome, email, telefone, papel, ativo)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nome', ''), split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'telefone',
    case when new.raw_app_meta_data->>'papel' = 'gestor' then 'gestor'::papel_usuario
         else 'vendedor'::papel_usuario end,
    coalesce(new.raw_app_meta_data->>'papel' in ('gestor', 'vendedor'), false)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- O Supabase grava o app_metadata (onde fica o papel) logo DEPOIS de criar o
-- login, então no momento do INSERT o papel ainda não existe. Este gatilho
-- mantém o perfil em dia sempre que o app_metadata muda.
create or replace function public.sincronizar_papel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.raw_app_meta_data->>'papel' in ('gestor', 'vendedor')
     and new.raw_app_meta_data->>'papel' is distinct from old.raw_app_meta_data->>'papel' then
    update public.profiles
       set papel = (new.raw_app_meta_data->>'papel')::papel_usuario,
           -- primeira vez que o servidor define o papel = usuário criado pelo painel: ativa
           ativo = case when old.raw_app_meta_data->>'papel' is null then true else ativo end
     where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_papel on auth.users;
create trigger on_auth_user_papel
  after update of raw_app_meta_data on auth.users
  for each row execute function public.sincronizar_papel();

-- ---------------------------------------------------------------------
-- REGRAS DE NEGÓCIO DO CONTRATO
--  1) Exclusividade: o mesmo segmento não pode estar duas vezes no mesmo
--     programa no mesmo período.
--  2) Cotas: o programa não pode ter mais contratos simultâneos do que cotas.
--  Contratos "pendente" e "ativo" ocupam vaga. "encerrado"/"cancelado" liberam.
-- ---------------------------------------------------------------------
create or replace function public.validar_contrato() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_prog       record;
  v_conflito   record;
  v_ocupadas   int;
begin
  if new.status not in ('pendente', 'ativo') then
    return new;
  end if;

  -- trava o programa para evitar que dois vendedores fechem a última vaga ao mesmo tempo
  select * into v_prog from public.programas where id = new.programa_id for update;
  if not found then
    raise exception 'Programa não encontrado.';
  end if;
  if not v_prog.ativo then
    raise exception 'O programa "%" está inativo e não aceita novos contratos.', v_prog.nome;
  end if;

  select c.data_fim, s.nome as segmento, cl.nome as cliente
    into v_conflito
    from public.contratos c
    join public.segmentos s on s.id = c.segmento_id
    join public.clientes cl on cl.id = c.cliente_id
   where c.programa_id = new.programa_id
     and c.segmento_id = new.segmento_id
     and c.status in ('pendente', 'ativo')
     and c.id <> new.id
     and daterange(c.data_inicio, c.data_fim, '[]') && daterange(new.data_inicio, new.data_fim, '[]')
   limit 1;
  if found then
    raise exception 'Segmento "%" já está ocupado no programa "%" (cliente %) até %.',
      v_conflito.segmento, v_prog.nome, v_conflito.cliente, to_char(v_conflito.data_fim, 'DD/MM/YYYY');
  end if;

  select count(*) into v_ocupadas
    from public.contratos c
   where c.programa_id = new.programa_id
     and c.status in ('pendente', 'ativo')
     and c.id <> new.id
     and daterange(c.data_inicio, c.data_fim, '[]') && daterange(new.data_inicio, new.data_fim, '[]');
  if v_ocupadas >= v_prog.cotas_total then
    raise exception 'O programa "%" não tem cotas livres nesse período (% de % ocupadas).',
      v_prog.nome, v_ocupadas, v_prog.cotas_total;
  end if;

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists contratos_validar on public.contratos;
create trigger contratos_validar
  before insert or update of status, programa_id, segmento_id, data_inicio, data_fim
  on public.contratos
  for each row execute function public.validar_contrato();

-- Vendedor (não gestor) não pode trocar o vendedor do contrato nem mexer em contrato que já saiu de "pendente"
create or replace function public.proteger_contrato() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_gestor() or auth.uid() is null then
    return new;
  end if;
  if new.vendedor_id <> old.vendedor_id then
    raise exception 'Somente o gestor pode transferir um contrato para outro vendedor.';
  end if;
  if new.status not in ('pendente', 'ativo', 'cancelado') then
    raise exception 'Somente o gestor pode encerrar contratos.';
  end if;
  return new;
end $$;

drop trigger if exists contratos_proteger on public.contratos;
create trigger contratos_proteger
  before update on public.contratos
  for each row execute function public.proteger_contrato();

-- Vendedor não pode transferir cliente para outro vendedor (só gestor)
create or replace function public.proteger_cliente() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_gestor() or auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.vendedor_id := coalesce(new.vendedor_id, auth.uid());
    if new.vendedor_id <> auth.uid() then
      raise exception 'Você só pode cadastrar clientes na sua própria carteira.';
    end if;
    new.created_by := auth.uid();
  elsif new.vendedor_id is distinct from old.vendedor_id then
    raise exception 'Somente o gestor pode transferir um cliente para outro vendedor.';
  end if;
  return new;
end $$;

drop trigger if exists clientes_proteger on public.clientes;
create trigger clientes_proteger
  before insert or update on public.clientes
  for each row execute function public.proteger_cliente();

-- ---------------------------------------------------------------------
-- Histórico de atividades (automático)
-- ---------------------------------------------------------------------
create or replace function public.registrar_atividade() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_desc  text;
  v_id    uuid;
  v_cli   text;
  v_prog  text;
begin
  v_id := coalesce(new.id, old.id);

  if tg_table_name = 'visitas' then
    select nome into v_cli from public.clientes where id = coalesce(new.cliente_id, old.cliente_id);
    if tg_op = 'INSERT' then
      v_desc := 'Iniciou visita ao cliente ' || coalesce(v_cli, '?');
    elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
      v_desc := 'Visita ao cliente ' || coalesce(v_cli, '?') || ' mudou para: ' ||
        case new.status when 'em_andamento' then 'em andamento' when 'proposta' then 'proposta enviada'
                        when 'fechado' then 'fechado' else 'perdido' end;
    elsif tg_op = 'DELETE' then
      v_desc := 'Excluiu visita ao cliente ' || coalesce(v_cli, '?');
    end if;

  elsif tg_table_name = 'clientes' then
    if tg_op = 'INSERT' then
      v_desc := 'Cadastrou o cliente ' || new.nome;
    elsif tg_op = 'UPDATE' then
      if new.vendedor_id is distinct from old.vendedor_id then
        v_desc := 'Transferiu o cliente ' || new.nome || ' para ' ||
          coalesce((select nome from public.profiles where id = new.vendedor_id), 'ninguém');
      else
        v_desc := 'Atualizou o cliente ' || new.nome;
      end if;
    elsif tg_op = 'DELETE' then
      v_desc := 'Excluiu o cliente ' || old.nome;
    end if;

  elsif tg_table_name = 'contratos' then
    select nome into v_cli from public.clientes where id = coalesce(new.cliente_id, old.cliente_id);
    select nome into v_prog from public.programas where id = coalesce(new.programa_id, old.programa_id);
    if tg_op = 'INSERT' then
      v_desc := 'Criou o contrato nº ' || new.numero || ' — ' || coalesce(v_cli, '?') || ' no programa ' || coalesce(v_prog, '?');
    elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
      v_desc := 'Contrato nº ' || new.numero || ' (' || coalesce(v_cli, '?') || ') mudou para: ' || new.status::text;
    elsif tg_op = 'UPDATE' then
      v_desc := 'Atualizou o contrato nº ' || new.numero || ' (' || coalesce(v_cli, '?') || ')';
    elsif tg_op = 'DELETE' then
      v_desc := 'Excluiu o contrato nº ' || old.numero || ' (' || coalesce(v_cli, '?') || ')';
    end if;

  elsif tg_table_name = 'programas' then
    if tg_op = 'INSERT' then v_desc := 'Cadastrou o programa ' || new.nome;
    elsif tg_op = 'UPDATE' then v_desc := 'Atualizou o programa ' || new.nome;
    else v_desc := 'Excluiu o programa ' || old.nome; end if;

  elsif tg_table_name = 'modelos_contrato' then
    if tg_op = 'DELETE' then v_desc := 'Excluiu o modelo de contrato ' || old.nome;
    else v_desc := 'Salvou o modelo de contrato ' || new.nome; end if;

  elsif tg_table_name = 'profiles' then
    if tg_op = 'INSERT' then v_desc := 'Usuário criado: ' || new.nome || ' (' || new.papel::text || ')';
    elsif tg_op = 'UPDATE' and new.ativo is distinct from old.ativo then
      v_desc := case when new.ativo then 'Reativou o usuário ' else 'Desativou o usuário ' end || new.nome;
    elsif tg_op = 'UPDATE' then v_desc := 'Atualizou o usuário ' || new.nome;
    end if;

  elsif tg_table_name = 'parcelas' then
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      v_desc := 'Parcela ' || new.numero || ' do contrato nº ' ||
        (select numero from public.contratos where id = new.contrato_id) || ' mudou para: ' || new.status::text;
    end if;
  end if;

  if v_desc is not null then
    insert into public.atividades (usuario_id, tabela, registro_id, acao, descricao)
    values (auth.uid(), tg_table_name, v_id, lower(tg_op), v_desc);
  end if;
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['visitas','clientes','contratos','programas','modelos_contrato','profiles','parcelas'] loop
    execute format('drop trigger if exists %I_atividade on public.%I', t, t);
    execute format('create trigger %I_atividade after insert or update or delete on public.%I
                    for each row execute function public.registrar_atividade()', t, t);
  end loop;
end $$;

-- Ao fechar contrato a partir de uma visita, marca a visita como "fechado"
create or replace function public.fechar_visita_do_contrato() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.visita_id is not null then
    update public.visitas set status = 'fechado', encerrada_em = now()
     where id = new.visita_id and status <> 'fechado';
  end if;
  return new;
end $$;

drop trigger if exists contratos_fechar_visita on public.contratos;
create trigger contratos_fechar_visita
  after insert on public.contratos
  for each row execute function public.fechar_visita_do_contrato();

-- ---------------------------------------------------------------------
-- Visão de ocupação dos programas (usada nas telas)
-- security_invoker = respeita as regras de acesso de quem consulta
-- ---------------------------------------------------------------------
create or replace view public.programas_ocupacao
with (security_invoker = true) as
select
  p.*,
  r.nome as radio_nome,
  r.cor  as radio_cor,
  coalesce(o.ocupadas, 0)::int as cotas_ocupadas,
  greatest(p.cotas_total - coalesce(o.ocupadas, 0), 0)::int as cotas_livres
from public.programas p
join public.radios r on r.id = p.radio_id
left join lateral (
  select count(*) as ocupadas
    from public.contratos c
   where c.programa_id = p.id
     and c.status in ('pendente', 'ativo')
     and current_date between c.data_inicio and c.data_fim
) o on true;

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.radios            enable row level security;
alter table public.segmentos         enable row level security;
alter table public.programas         enable row level security;
alter table public.clientes          enable row level security;
alter table public.visitas           enable row level security;
alter table public.modelos_contrato  enable row level security;
alter table public.contratos         enable row level security;
alter table public.parcelas          enable row level security;
alter table public.atividades        enable row level security;

-- Ninguém anônimo acessa nada
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- remove políticas antigas (permite rodar o script de novo)
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- PROFILES: todos os usuários ativos se enxergam (para mostrar nomes); só gestor altera
create policy profiles_select on public.profiles for select to authenticated
  using (public.usuario_ativo() or id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (public.is_gestor()) with check (public.is_gestor());
-- inserção/exclusão de perfis só pelo servidor (service role) / gatilho

-- Tabelas de cadastro geral: todos leem; só gestor escreve
create policy radios_select on public.radios for select to authenticated using (public.usuario_ativo());
create policy radios_write  on public.radios for all to authenticated using (public.is_gestor()) with check (public.is_gestor());

create policy segmentos_select on public.segmentos for select to authenticated using (public.usuario_ativo());
create policy segmentos_write  on public.segmentos for all to authenticated using (public.is_gestor()) with check (public.is_gestor());

create policy programas_select on public.programas for select to authenticated using (public.usuario_ativo());
create policy programas_write  on public.programas for all to authenticated using (public.is_gestor()) with check (public.is_gestor());

create policy modelos_select on public.modelos_contrato for select to authenticated using (public.usuario_ativo());
create policy modelos_write  on public.modelos_contrato for all to authenticated using (public.is_gestor()) with check (public.is_gestor());

-- CLIENTES: todos veem (para evitar dois vendedores no mesmo cliente);
-- qualquer vendedor cadastra; altera o responsável ou o gestor; só gestor exclui
create policy clientes_select on public.clientes for select to authenticated using (public.usuario_ativo());
create policy clientes_insert on public.clientes for insert to authenticated with check (public.usuario_ativo());
create policy clientes_update on public.clientes for update to authenticated
  using (public.is_gestor() or (public.usuario_ativo() and vendedor_id = auth.uid()))
  with check (public.is_gestor() or (public.usuario_ativo() and vendedor_id = auth.uid()));
create policy clientes_delete on public.clientes for delete to authenticated using (public.is_gestor());

-- VISITAS: todos veem quem está visitando quem; cada um registra/altera as suas
create policy visitas_select on public.visitas for select to authenticated using (public.usuario_ativo());
create policy visitas_insert on public.visitas for insert to authenticated
  with check (public.usuario_ativo() and (vendedor_id = auth.uid() or public.is_gestor()));
create policy visitas_update on public.visitas for update to authenticated
  using (public.is_gestor() or (public.usuario_ativo() and vendedor_id = auth.uid()))
  with check (public.is_gestor() or (public.usuario_ativo() and vendedor_id = auth.uid()));
create policy visitas_delete on public.visitas for delete to authenticated
  using (public.is_gestor() or (public.usuario_ativo() and vendedor_id = auth.uid()));

-- CONTRATOS: todos veem (para saber o que está ocupado); vendedor cria os seus;
-- vendedor altera os seus enquanto pendente; gestor tudo
create policy contratos_select on public.contratos for select to authenticated using (public.usuario_ativo());
create policy contratos_insert on public.contratos for insert to authenticated
  with check (public.usuario_ativo() and (vendedor_id = auth.uid() or public.is_gestor()));
create policy contratos_update on public.contratos for update to authenticated
  using (public.is_gestor() or (public.usuario_ativo() and vendedor_id = auth.uid() and status = 'pendente'))
  with check (public.is_gestor() or (public.usuario_ativo() and vendedor_id = auth.uid()));
create policy contratos_delete on public.contratos for delete to authenticated using (public.is_gestor());

-- PARCELAS: todos veem; cria quem é dono do contrato; altera só gestor (financeiro)
create policy parcelas_select on public.parcelas for select to authenticated using (public.usuario_ativo());
create policy parcelas_insert on public.parcelas for insert to authenticated
  with check (public.is_gestor() or exists (
    select 1 from public.contratos c where c.id = contrato_id and c.vendedor_id = auth.uid() and public.usuario_ativo()));
create policy parcelas_update on public.parcelas for update to authenticated
  using (public.is_gestor()) with check (public.is_gestor());
create policy parcelas_delete on public.parcelas for delete to authenticated using (public.is_gestor());

-- ATIVIDADES: só gestor lê; ninguém grava direto (só o gatilho)
create policy atividades_select on public.atividades for select to authenticated using (public.is_gestor());
revoke insert, update, delete on public.atividades from authenticated;

-- ---------------------------------------------------------------------
-- Atualização ao vivo (Realtime) nas tabelas que mudam no dia a dia
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['visitas','contratos','clientes','programas'] loop
      if not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

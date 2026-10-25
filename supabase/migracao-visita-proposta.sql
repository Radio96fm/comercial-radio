-- =====================================================================
--  NOVO FLUXO DA VISITA (2026-10-25)
--  1. Início da visita com nome da empresa + contato na empresa
--  2. Busca por nome parecido (erros de digitação) em toda a base de clientes
--  3. Bloqueio de cliente duplicado por nome e por CPF/CNPJ, com aviso de
--     vendedor, data da visita, validade e fim do contrato vigente
--  4. Proposta comercial em PDF por programa (e geral por rádio), enviada
--     pelo WhatsApp; cadastro completo só depois da aprovação
--
--  Como usar: Supabase > SQL Editor > New query > cole TODO este arquivo e
--  clique em "Run". Pode rodar mais de uma vez sem problema.
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists fuzzystrmatch with schema extensions;

-- ---------------------------------------------------------------- colunas novas
alter table public.visitas add column if not exists contato_nome text;
alter table public.visitas add column if not exists contato_cargo text;
alter table public.visitas add column if not exists contato_telefone text;
alter table public.visitas add column if not exists radio_id uuid references public.radios(id) on delete set null;
alter table public.visitas add column if not exists programa_id uuid references public.programas(id) on delete set null;
alter table public.visitas add column if not exists plano_id uuid references public.programa_planos(id) on delete set null;
alter table public.visitas add column if not exists proposta_enviada_em timestamptz;
alter table public.visitas add column if not exists proposta_aprovada_em timestamptz;

-- PDF da proposta comercial: um por programa e um geral por rádio (plano personalizado)
alter table public.programas add column if not exists proposta_pdf text;
alter table public.programas add column if not exists proposta_atualizada_em timestamptz;
alter table public.radios add column if not exists proposta_pdf text;
alter table public.radios add column if not exists proposta_atualizada_em timestamptz;

-- ---------------------------------------------------------------- arquivos das propostas
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('propostas', 'propostas', false, 26214400, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists propostas_ler on storage.objects;
create policy propostas_ler on storage.objects for select to authenticated
  using (bucket_id = 'propostas' and public.usuario_ativo());
drop policy if exists propostas_gestor on storage.objects;
create policy propostas_gestor on storage.objects for all to authenticated
  using (bucket_id = 'propostas' and public.is_gestor())
  with check (bucket_id = 'propostas' and public.is_gestor());

-- ---------------------------------------------------------------- nomes para comparar
-- "Supermercado Comigo LTDA" -> "supermercado comigo" (sem acento, sem LTDA/ME/EIRELI)
create or replace function public.normalizar_palavras(p text) returns text
language sql immutable as $f$
  select trim(regexp_replace(
    regexp_replace(
      regexp_replace(translate(lower(coalesce(p, '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'), '[^a-z0-9]+', ' ', 'g'),
      '\m(ltda|me|eireli|epp|mei|s a|sa|cia)\M', ' ', 'g'),
    '\s+', ' ', 'g'));
$f$;

-- quanto dois nomes se parecem (0 a 1): pega erro de digitação, letra trocada ou faltando
create or replace function public.parecido(p_nome text, p_busca text) returns numeric
language sql immutable set search_path = public, extensions as $f$
  with x as (
    select public.normalizar_palavras(p_nome) w, public.normalizar_palavras(p_busca) bw,
           replace(public.normalizar_palavras(p_nome), ' ', '') n, replace(public.normalizar_palavras(p_busca), ' ', '') b
  )
  select case
    when b = '' or n = '' then 0
    when n = b then 1
    when length(b) >= 3 and position(b in n) > 0 then 0.9
    else greatest(
      similarity(w, bw),
      case when length(b) >= 4 then word_similarity(bw, w) * 0.95 else 0 end,
      case when length(b) >= 4 and levenshtein(left(n, 255), left(b, 255)) <= case when length(b) <= 7 then 1 else 2 end then 0.85 else 0 end,
      -- palavra a palavra: "conigo" x "comigo" dentro de "supermercado comigo"
      coalesce((select max(case when length(pw) >= 4 and length(bw2) >= 4
                                 and levenshtein(pw, bw2) <= case when length(bw2) <= 6 then 1 else 2 end then 0.8 else 0 end)
                  from unnest(string_to_array(w, ' ')) pw, unnest(string_to_array(bw, ' ')) bw2), 0)
    )::numeric
  end from x;
$f$;

-- ---------------------------------------------------------------- situação completa da empresa
-- situacao: negociando (outro vendedor em visita), contrato (contrato vigente de outro vendedor),
-- sua (sua carteira) ou livre. Datas para o aviso: visita, validade e fim do contrato.
create or replace function public.info_empresa(p_cliente uuid)
returns table (situacao text, dono_nome text, visita_em date, expira_em date, dias int, contrato_fim date, minha_visita uuid)
language plpgsql stable security definer set search_path = public as $f$
declare c record; t record; k record; m uuid;
begin
  select cl.vendedor_id, p.nome into c from public.clientes cl left join public.profiles p on p.id = cl.vendedor_id where cl.id = p_cliente;
  if not found then return; end if;
  select v.id into m from public.visitas v
   where v.cliente_id = p_cliente and v.vendedor_id = auth.uid() and v.status in ('em_andamento', 'proposta')
   order by v.iniciada_em desc limit 1;
  select ct.data_fim, ct.vendedor_id, p.nome into k from public.contratos ct join public.profiles p on p.id = ct.vendedor_id
   where ct.cliente_id = p_cliente and ct.status in ('pendente', 'ativo') and ct.data_fim >= current_date
   order by ct.data_fim desc limit 1;
  select tv.*, v.iniciada_em into t from public.trava_visita(p_cliente, auth.uid()) tv join public.visitas v on v.id = tv.visita_id;
  if found then
    return query select 'negociando'::text, t.vendedor_nome,
      (t.iniciada_em at time zone 'America/Sao_Paulo')::date, (t.expira_em at time zone 'America/Sao_Paulo')::date,
      greatest(1, ceil(extract(epoch from (t.expira_em - now())) / 86400))::int, k.data_fim, m;
    return;
  end if;
  if k.vendedor_id is not null and k.vendedor_id <> auth.uid() then
    return query select 'contrato'::text, k.nome, null::date, null::date, null::int, k.data_fim, m; return;
  end if;
  if c.vendedor_id = auth.uid() then
    return query select 'sua'::text, c.nome, null::date, null::date, null::int, k.data_fim, m; return;
  end if;
  return query select 'livre'::text, c.nome, null::date, null::date, null::int, k.data_fim, m;
end $f$;
revoke execute on function public.info_empresa(uuid) from public, anon;
grant execute on function public.info_empresa(uuid) to authenticated;

-- texto do aviso de empresa já cadastrada
create or replace function public.msg_empresa(p_cliente uuid, p_motivo text default 'nome') returns text
language plpgsql stable security definer set search_path = public as $f$
declare cl record; s record; msg text;
begin
  select nome, documento into cl from public.clientes where id = p_cliente;
  select * into s from public.info_empresa(p_cliente);
  msg := case when p_motivo = 'documento' then format('Este CPF/CNPJ já está cadastrado: %s.', cl.nome)
              else format('A empresa "%s" já está cadastrada.', cl.nome) end;
  if s.situacao = 'negociando' then
    msg := msg || format(' Em visitação por %s desde %s, com exclusividade até %s (faltam %s dia(s)).',
      s.dono_nome, to_char(s.visita_em, 'DD/MM/YYYY'), to_char(s.expira_em, 'DD/MM/YYYY'), s.dias);
  elsif s.dono_nome is not null then
    msg := msg || format(' Vendedor: %s.', case when s.situacao = 'sua' then 'você' else s.dono_nome end);
  end if;
  if s.contrato_fim is not null then
    msg := msg || format(' Contrato vigente até %s.', to_char(s.contrato_fim, 'DD/MM/YYYY'));
  end if;
  return msg;
end $f$;
revoke execute on function public.msg_empresa(uuid, text) from public, anon;
grant execute on function public.msg_empresa(uuid, text) to authenticated;

-- ---------------------------------------------------------------- busca na base inteira
-- Usada enquanto o vendedor digita o nome: devolve as empresas parecidas, de qualquer carteira,
-- com quem atende, a visita em andamento (e até quando vale) e o fim do contrato vigente.
create or replace function public.buscar_empresas(p_busca text, p_documento text default null)
returns table (id uuid, nome text, razao_social text, cidade text, situacao text, dono_nome text,
               visita_em date, expira_em date, dias int, contrato_fim date, minha_visita uuid,
               parecido numeric, mesmo_documento boolean)
language plpgsql stable security definer set search_path = public as $f$
declare b text := public.normalizar_palavras(p_busca);
        d text := regexp_replace(coalesce(nullif(p_documento, ''), p_busca, ''), '\D', '', 'g');
begin
  if not public.usuario_ativo() then return; end if;
  if length(replace(b, ' ', '')) < 3 and length(d) < 11 then return; end if;
  return query
    with r as (
      select cl.id, cl.nome, cl.razao_social, cl.cidade,
             greatest(public.parecido(cl.nome, p_busca), public.parecido(cl.razao_social, p_busca) * 0.95) as nota,
             (length(d) >= 11 and regexp_replace(coalesce(cl.documento, ''), '\D', '', 'g') = d) as mesmo_doc
        from public.clientes cl
    )
    select r.id, r.nome, r.razao_social, r.cidade, s.situacao, s.dono_nome, s.visita_em, s.expira_em, s.dias, s.contrato_fim, s.minha_visita,
           round(case when r.mesmo_doc then 1 else r.nota end, 2), r.mesmo_doc
      from r cross join lateral public.info_empresa(r.id) s
     where r.mesmo_doc or r.nota >= 0.45
     order by r.mesmo_doc desc, r.nota desc, r.nome
     limit 10;
end $f$;
revoke execute on function public.buscar_empresas(text, text) from public, anon;
grant execute on function public.buscar_empresas(text, text) to authenticated;

-- ---------------------------------------------------------------- trava de cliente duplicado
-- Vendedor não cadastra empresa com o mesmo nome nem o mesmo CPF/CNPJ de outra já cadastrada.
create or replace function public.clientes_sem_duplicar() returns trigger
language plpgsql security definer set search_path = public as $f$
declare d text := regexp_replace(coalesce(new.documento, ''), '\D', '', 'g'); outro uuid;
begin
  if auth.uid() is null or public.is_gestor() then return new; end if;
  if length(d) >= 11 and (tg_op = 'INSERT' or d is distinct from regexp_replace(coalesce(old.documento, ''), '\D', '', 'g')) then
    select id into outro from public.clientes
     where id <> new.id and regexp_replace(coalesce(documento, ''), '\D', '', 'g') = d limit 1;
    if found then raise exception '%', public.msg_empresa(outro, 'documento'); end if;
  end if;
  if tg_op = 'INSERT' or public.normalizar_palavras(new.nome) is distinct from public.normalizar_palavras(old.nome) then
    select id into outro from public.clientes
     where id <> new.id and replace(public.normalizar_palavras(nome), ' ', '') = replace(public.normalizar_palavras(new.nome), ' ', '') limit 1;
    if found then raise exception '%', public.msg_empresa(outro, 'nome'); end if;
  end if;
  return new;
end $f$;
drop trigger if exists clientes_sem_duplicar on public.clientes;
create trigger clientes_sem_duplicar before insert or update of nome, documento on public.clientes
  for each row execute function public.clientes_sem_duplicar();

-- Vendedor não transfere cliente (só gestor). Exceção: empresa livre passa para quem
-- inicia a visita (iniciar_visita_contato liga a marca app.visita_transfere).
create or replace function public.proteger_cliente() returns trigger
language plpgsql security definer set search_path = public as $f$
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
  elsif new.vendedor_id is distinct from old.vendedor_id
    and not (new.vendedor_id = auth.uid() and current_setting('app.visita_transfere', true) = old.id::text) then
    raise exception 'Somente o gestor pode transferir um cliente para outro vendedor.';
  end if;
  return new;
end $f$;

-- ---------------------------------------------------------------- início da visita com contato
-- Obrigatório: empresa e o nome de quem atende o vendedor na empresa.
-- Só um vendedor visita a mesma empresa: se já é sua visita aberta, volta para ela.
create or replace function public.iniciar_visita_contato(p_cliente uuid, p_contato text, p_cargo text, p_obs text) returns uuid
language plpgsql security definer set search_path = public as $f$
declare s record; v_id uuid;
begin
  if not public.usuario_ativo() then raise exception 'Sem permissão.'; end if;
  if length(trim(coalesce(p_contato, ''))) < 2 then raise exception 'Escreva o nome da pessoa com quem você está falando na empresa.'; end if;
  select * into s from public.info_empresa(p_cliente);
  if not found then raise exception 'Cliente não encontrado.'; end if;
  if s.minha_visita is not null then
    update public.visitas set contato_nome = coalesce(contato_nome, trim(p_contato)), contato_cargo = coalesce(contato_cargo, nullif(trim(p_cargo), ''))
     where id = s.minha_visita;
    return s.minha_visita;
  end if;
  if not public.is_gestor() then
    if s.situacao in ('negociando', 'contrato') then raise exception '%', public.msg_empresa(p_cliente); end if;
    if s.situacao = 'livre' then
      perform set_config('app.visita_transfere', p_cliente::text, true);
      update public.clientes set vendedor_id = auth.uid() where id = p_cliente;
    end if;
  end if;
  update public.clientes set contato_nome = trim(p_contato) where id = p_cliente and contato_nome is null;
  insert into public.visitas (cliente_id, vendedor_id, observacoes, contato_nome, contato_cargo)
  values (p_cliente, auth.uid(), nullif(trim(p_obs), ''), trim(p_contato), nullif(trim(p_cargo), ''))
  returning id into v_id;
  return v_id;
end $f$;
revoke execute on function public.iniciar_visita_contato(uuid, text, text, text) from public, anon;
grant execute on function public.iniciar_visita_contato(uuid, text, text, text) to authenticated;

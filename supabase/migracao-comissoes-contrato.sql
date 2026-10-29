-- =====================================================================
--  COMISSÃO POR CONTRATO (2026-10-28)
--
--  - contrato_comissoes: quem ganha quanto em cada contrato. Um contrato
--    pode ter mais de uma pessoa (contratos antigos com dois vendedores).
--    percentual nulo = "a definir": não entra no cálculo até o
--    desenvolvedor dar a regra no quadro do /dev.
--    base 'total' = % sobre o valor cheio; 'liquido' = tira 2% do
--    departamento comercial antes e aplica o % no que sobra.
--  - representantes.diretor: quem leva os 2% de diretor comercial em todas
--    as vendas novas (gatilho abaixo).
--  - contratos.importado: veio dos PDFs. Contrato importado só paga o que
--    estiver em contrato_comissoes; contrato novo sem linha de vendedor
--    usa a comissão do perfil do vendedor (profiles.comissao).
--  - contrato_programas: programas de cada contrato (um contrato pode
--    anunciar em vários). A ocupação de cotas conta por aqui também.
-- =====================================================================

alter table public.representantes add column if not exists diretor boolean not null default false;
alter table public.contratos add column if not exists importado boolean not null default false;

create table if not exists public.contrato_comissoes (
  id                uuid primary key default gen_random_uuid(),
  contrato_id       uuid not null references public.contratos(id) on delete cascade,
  representante_id  uuid not null references public.representantes(id) on delete cascade,
  papel             text not null default 'vendedor' check (papel in ('vendedor', 'diretor')),
  percentual        numeric(5,2) check (percentual is null or (percentual >= 0 and percentual <= 100)),
  base              text not null default 'total' check (base in ('total', 'liquido')),
  regra             text,
  vigente           boolean not null default true,  -- false = saiu do contrato (fica o histórico)
  updated_at        timestamptz not null default now(),
  unique (contrato_id, representante_id, papel)
);
create index if not exists contrato_comissoes_rep on public.contrato_comissoes (representante_id);

alter table public.contrato_comissoes enable row level security;
drop policy if exists contrato_comissoes_ler on public.contrato_comissoes;
create policy contrato_comissoes_ler on public.contrato_comissoes for select to authenticated using (
  public.is_gestor() or public.is_financeiro()
  or exists (select 1 from public.representantes r where r.id = representante_id and r.profile_id = auth.uid())
);
drop policy if exists contrato_comissoes_dev on public.contrato_comissoes;
create policy contrato_comissoes_dev on public.contrato_comissoes for all to authenticated using (public.is_dev()) with check (public.is_dev());
grant select, insert, update on public.contrato_comissoes to authenticated;

-- O vendedor enxerga o próprio vínculo (para achar as comissões dele)
drop policy if exists representantes_proprio on public.representantes;
create policy representantes_proprio on public.representantes for select to authenticated using (profile_id = auth.uid());

-- Venda nova: o diretor comercial leva 2% sobre o valor cheio
create or replace function public.contrato_comissao_diretor() returns trigger
language plpgsql security definer set search_path = public as $f$
begin
  if not new.importado then
    insert into public.contrato_comissoes (contrato_id, representante_id, papel, percentual, base)
    select new.id, r.id, 'diretor', 2, 'total' from public.representantes r where r.diretor
    on conflict do nothing;
  end if;
  return new;
end $f$;
drop trigger if exists contratos_comissao_diretor on public.contratos;
create trigger contratos_comissao_diretor after insert on public.contratos
  for each row execute function public.contrato_comissao_diretor();

-- ---------------------------------------------------------------- programas do contrato
create table if not exists public.contrato_programas (
  contrato_id  uuid not null references public.contratos(id) on delete cascade,
  programa_id  uuid not null references public.programas(id) on delete cascade,
  primary key (contrato_id, programa_id)
);
create index if not exists contrato_programas_prog on public.contrato_programas (programa_id);
alter table public.contrato_programas enable row level security;
drop policy if exists contrato_programas_ler on public.contrato_programas;
create policy contrato_programas_ler on public.contrato_programas for select to authenticated using (public.usuario_ativo());
drop policy if exists contrato_programas_gestor on public.contrato_programas;
create policy contrato_programas_gestor on public.contrato_programas for all to authenticated using (public.is_gestor()) with check (public.is_gestor());
grant select, insert, update on public.contrato_programas to authenticated;

create or replace view public.programas_ocupacao with (security_invoker = true) as
select p.id, p.radio_id, p.nome, p.apresentador, p.dias, p.horario_inicio, p.horario_fim, p.descricao, p.cotas_total, p.valor_cota, p.descricao_cota, p.ativo, p.created_at,
  r.nome as radio_nome, r.cor as radio_cor,
  coalesce(o.ocupadas, 0)::int as cotas_ocupadas,
  greatest(p.cotas_total - coalesce(o.ocupadas, 0), 0)::int as cotas_livres,
  p.meses_minimo
from public.programas p
join public.radios r on r.id = p.radio_id
left join lateral (
  select count(*) as ocupadas from public.contratos c
   where (c.programa_id = p.id or exists (select 1 from public.contrato_programas cp where cp.contrato_id = c.id and cp.programa_id = p.id))
     and c.status in ('pendente', 'ativo') and current_date between c.data_inicio and c.data_fim
) o on true;

-- ---------------------------------------------------------------- quadro do desenvolvedor
-- Troca as pessoas que ganham comissão num contrato, de uma vez só.
-- p_linhas: [{ "representante_id": uuid, "papel": "vendedor"|"diretor",
--              "percentual": número ou null, "base": "total"|"liquido" }]
-- O primeiro vendedor da lista vira o dono do contrato (vendedor_id quando
-- tiver login).
create or replace function public.definir_comissao_contrato(p_contrato uuid, p_linhas jsonb, p_regra text) returns void
language plpgsql security definer set search_path = public as $f$
declare
  v_rep uuid;
  v_profile uuid;
begin
  if not public.is_dev() then raise exception 'Só o desenvolvedor pode mudar a comissão de um contrato.'; end if;
  if jsonb_typeof(p_linhas) <> 'array' or jsonb_array_length(p_linhas) = 0 then raise exception 'Informe quem ganha a comissão.'; end if;
  -- quem saiu do contrato fica guardado como não vigente
  update public.contrato_comissoes set vigente = false, updated_at = now()
   where contrato_id = p_contrato
     and (representante_id, papel) not in (
       select (l->>'representante_id')::uuid, coalesce(l->>'papel', 'vendedor') from jsonb_array_elements(p_linhas) l);
  insert into public.contrato_comissoes (contrato_id, representante_id, papel, percentual, base, regra, vigente)
  select p_contrato, (l->>'representante_id')::uuid, coalesce(l->>'papel', 'vendedor'),
         nullif(l->>'percentual', '')::numeric, coalesce(l->>'base', 'total'), nullif(trim(p_regra), ''), true
    from jsonb_array_elements(p_linhas) l
  on conflict (contrato_id, representante_id, papel) do update
    set percentual = excluded.percentual, base = excluded.base, regra = excluded.regra, vigente = true, updated_at = now();

  select (l->>'representante_id')::uuid into v_rep
    from jsonb_array_elements(p_linhas) l where coalesce(l->>'papel', 'vendedor') = 'vendedor' limit 1;
  select profile_id into v_profile from public.representantes where id = v_rep;
  perform set_config('app.vinculo_representante', '1', true);
  -- daqui em diante a comissão deste contrato segue só a tabela (importado = true)
  update public.contratos set representante_id = v_rep, vendedor_id = coalesce(v_profile, vendedor_id), importado = true where id = p_contrato;
  update public.clientes set vendedor_id = v_profile
   where v_profile is not null and id = (select cliente_id from public.contratos where id = p_contrato);
  perform set_config('app.vinculo_representante', '', true);
end $f$;
revoke all on function public.definir_comissao_contrato(uuid, jsonb, text) from public, anon;
grant execute on function public.definir_comissao_contrato(uuid, jsonb, text) to authenticated;

-- ---------------------------------------------------------------- logins provisórios (2026-10-29)
-- Cada vendedor dos PDFs ganhou um login provisório (profiles.provisorio,
-- e-mail vendedor.<cpf>@sem-login.radio96fm.com, senha sorteada) para os
-- contratos aparecerem nos painéis. Os contratos de venda direta e agência
-- ficam no login provisório "Venda direta / agências" (papel financeiro, fora
-- das listas de vendedores e de comissão). Quando o vendedor se cadastra pelo
-- link com o CPF, os contratos passam para o login dele e o provisório é
-- desativado.
alter table public.profiles add column if not exists provisorio boolean not null default false;

create or replace function public.concluir_cadastro(p_documento text) returns int
language plpgsql security definer set search_path = public as $f$
declare
  v_uid uuid := auth.uid();
  v_dig text := nullif(regexp_replace(coalesce(p_documento, ''), '\D', '', 'g'), '');
  v_rep uuid;
  v_antigo uuid;
  n int;
begin
  if v_uid is null or not public.usuario_ativo() then raise exception 'Sem permissão'; end if;
  update public.profiles set documento = left(trim(p_documento), 30) where id = v_uid;
  if v_dig is null then return 0; end if;
  select r.id, r.profile_id into v_rep, v_antigo from public.representantes r
    left join public.profiles p on p.id = r.profile_id
   where r.documento_digitos = v_dig and (r.profile_id is null or p.provisorio) and r.profile_id is distinct from v_uid;
  if v_rep is null then return 0; end if;
  n := privado.vincular_representante(v_rep, v_uid);
  if v_antigo is not null then
    perform set_config('app.vinculo_representante', '1', true);
    update public.contratos set vendedor_id = v_uid where vendedor_id = v_antigo;
    update public.clientes set vendedor_id = v_uid where vendedor_id = v_antigo;
    perform set_config('app.vinculo_representante', '', true);
    update public.profiles set ativo = false where id = v_antigo;
  end if;
  return n;
end $f$;
revoke all on function public.concluir_cadastro(text) from public, anon;
grant execute on function public.concluir_cadastro(text) to authenticated;

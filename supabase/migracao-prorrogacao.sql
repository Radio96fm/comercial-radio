-- =====================================================================
--  PRAZO DE NEGOCIAÇÃO COM PRORROGAÇÃO
--  15 dias de exclusividade. Ao fim do prazo, o vendedor pode renovar por
--  15 dias (com motivo). A segunda renovação (até 45 dias no total) precisa
--  de aceite do comercial.
-- =====================================================================

alter table public.visitas add column if not exists prazo_extra_dias int not null default 0
  check (prazo_extra_dias in (0, 15, 30));

create table if not exists public.prorrogacoes (
  id           uuid primary key default gen_random_uuid(),
  visita_id    uuid not null references public.visitas(id) on delete cascade,
  vendedor_id  uuid not null references public.profiles(id) on delete cascade,
  motivo       text not null check (length(trim(motivo)) >= 5),
  dias         int not null default 15,
  status       text not null default 'pendente' check (status in ('pendente', 'aceita', 'recusada')),
  criada_em    timestamptz not null default now(),
  decidida_por uuid references public.profiles(id) on delete set null,
  decidida_em  timestamptz
);
create unique index if not exists prorrogacoes_pendente_uk on public.prorrogacoes(visita_id) where status = 'pendente';

alter table public.prorrogacoes enable row level security;
drop policy if exists prorrogacoes_ver on public.prorrogacoes;
create policy prorrogacoes_ver on public.prorrogacoes for select
  using (public.usuario_ativo() and (vendedor_id = auth.uid() or public.is_gestor()));

-- trava: a empresa fica reservada até o fim do prazo (15 dias + prorrogação)
create or replace function public.trava_visita(p_cliente uuid, p_vendedor uuid)
returns table (visita_id uuid, vendedor_id uuid, vendedor_nome text, expira_em timestamptz)
language sql stable security definer set search_path = public as $f$
  select v.id, v.vendedor_id, p.nome, v.iniciada_em + make_interval(days => 15 + v.prazo_extra_dias)
    from public.visitas v join public.profiles p on p.id = v.vendedor_id
   where v.cliente_id = p_cliente
     and v.vendedor_id is distinct from p_vendedor
     and v.status in ('em_andamento', 'proposta', 'fechado')
     and not exists (select 1 from public.visitas_liberadas l where l.visita_id = v.id)
     and v.iniciada_em + make_interval(days => 15 + v.prazo_extra_dias) > now()
   order by v.iniciada_em desc
   limit 1;
$f$;

-- o vendedor pede mais prazo depois que o atual acabou
create or replace function public.pedir_prorrogacao(p_visita uuid, p_motivo text) returns text
language plpgsql security definer set search_path = public as $f$
declare v record; v_total int;
begin
  if not public.usuario_ativo() then raise exception 'Sem permissão.'; end if;
  select * into v from public.visitas where id = p_visita;
  if not found then raise exception 'Visita não encontrada.'; end if;
  if v.vendedor_id <> auth.uid() then raise exception 'Só o vendedor da visita pode pedir mais prazo.'; end if;
  if v.status not in ('em_andamento', 'proposta') then raise exception 'Esta visita não está mais em negociação.'; end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 then raise exception 'Escreva o motivo da renovação.'; end if;
  v_total := 15 + v.prazo_extra_dias;
  if v_total >= 45 then raise exception 'O prazo máximo de negociação (45 dias) já foi atingido.'; end if;
  if now() < v.iniciada_em + make_interval(days => v_total) then
    raise exception 'Você só pode renovar depois que o prazo atual acabar.';
  end if;
  if v_total < 30 then
    update public.visitas set prazo_extra_dias = prazo_extra_dias + 15 where id = p_visita;
    insert into public.prorrogacoes (visita_id, vendedor_id, motivo, dias, status, decidida_em)
      values (p_visita, auth.uid(), trim(p_motivo), 15, 'aceita', now());
    return 'Prazo renovado: agora são 30 dias de negociação.';
  end if;
  if exists (select 1 from public.prorrogacoes where visita_id = p_visita and status = 'pendente') then
    raise exception 'Já existe um pedido aguardando o comercial.';
  end if;
  insert into public.prorrogacoes (visita_id, vendedor_id, motivo, dias) values (p_visita, auth.uid(), trim(p_motivo), 15);
  return 'Pedido enviado ao comercial. Os 15 dias extras valem se ele aceitar.';
end $f$;

-- o comercial aceita ou recusa o pedido da segunda renovação
create or replace function public.decidir_prorrogacao(p_id uuid, p_aceitar boolean) returns text
language plpgsql security definer set search_path = public as $f$
declare p record;
begin
  if not public.is_gestor() then raise exception 'Só o comercial decide prorrogações.'; end if;
  select * into p from public.prorrogacoes where id = p_id and status = 'pendente' for update;
  if not found then raise exception 'Pedido não encontrado ou já decidido.'; end if;
  if p_aceitar then
    update public.visitas set prazo_extra_dias = least(prazo_extra_dias + p.dias, 30) where id = p.visita_id;
  end if;
  update public.prorrogacoes
     set status = case when p_aceitar then 'aceita' else 'recusada' end, decidida_por = auth.uid(), decidida_em = now()
   where id = p_id;
  return case when p_aceitar then 'Prazo aceito: mais 15 dias.' else 'Prazo recusado.' end;
end $f$;

revoke execute on function public.pedir_prorrogacao(uuid, text) from public, anon;
grant execute on function public.pedir_prorrogacao(uuid, text) to authenticated;
revoke execute on function public.decidir_prorrogacao(uuid, boolean) from public, anon;
grant execute on function public.decidir_prorrogacao(uuid, boolean) to authenticated;

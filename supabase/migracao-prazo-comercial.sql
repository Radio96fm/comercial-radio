-- =====================================================================
--  PEDIDO DE MAIS PRAZO SEMPRE PASSA PELO COMERCIAL
--  Acabaram os 15 dias de exclusividade: o vendedor pede mais 15 dias com
--  o motivo e o pedido vai para o comercial (Gustavo) aceitar ou recusar.
--  Nada é renovado sozinho. No máximo dois pedidos aceitos (45 dias no total).
--  Rodar no Supabase: SQL Editor > colar tudo > Run. Pode rodar mais de uma vez.
-- =====================================================================

create or replace function public.pedir_prorrogacao(p_visita uuid, p_motivo text) returns text
language plpgsql security definer set search_path = public as $f$
declare v record; v_total int;
begin
  if not public.usuario_ativo() then raise exception 'Sem permissão.'; end if;
  select * into v from public.visitas where id = p_visita;
  if not found then raise exception 'Visita não encontrada.'; end if;
  if v.vendedor_id <> auth.uid() then raise exception 'Só o vendedor da visita pode pedir mais prazo.'; end if;
  if v.status not in ('em_andamento', 'proposta') then raise exception 'Esta visita não está mais em negociação.'; end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 then raise exception 'Escreva o motivo do pedido.'; end if;
  v_total := 15 + v.prazo_extra_dias;
  if v_total >= 45 then raise exception 'O prazo máximo de negociação (45 dias) já foi atingido.'; end if;
  if now() < v.iniciada_em + make_interval(days => v_total) then
    raise exception 'Você só pode pedir mais prazo depois que o prazo atual acabar.';
  end if;
  if exists (select 1 from public.prorrogacoes where visita_id = p_visita and status = 'pendente') then
    raise exception 'Já existe um pedido aguardando o comercial.';
  end if;
  insert into public.prorrogacoes (visita_id, vendedor_id, motivo, dias) values (p_visita, auth.uid(), trim(p_motivo), 15);
  return 'Pedido enviado ao comercial. Os 15 dias extras valem quando ele aceitar.';
end $f$;

revoke execute on function public.pedir_prorrogacao(uuid, text) from public, anon;
grant execute on function public.pedir_prorrogacao(uuid, text) to authenticated;

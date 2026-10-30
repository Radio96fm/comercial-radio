-- =====================================================================
--  BANCO NO FINANCEIRO (2026-10-30)
--  Configuração da API do banco (Bradesco): conta, ambiente, Client ID,
--  Client Secret e certificado A1. Os segredos ficam no Vault do Supabase
--  (criptografados); nenhuma tela lê de volta, só "cadastrado".
--  A ligação com o banco ainda não está ativa: a tela só guarda os dados.
--  Cada rádio é uma empresa (CNPJ) separada: conta, chaves e certificado por rádio.
-- =====================================================================

create table if not exists privado.banco_config (
  radio_id         uuid primary key references public.radios(id) on delete cascade,
  banco            text not null default 'bradesco',
  agencia          text,
  conta            text,
  digito           text,
  ambiente         text not null default 'homologacao' check (ambiente in ('homologacao', 'producao')),
  client_id        text,
  servicos         jsonb not null default '{"saldo": true, "extrato": true, "boletos": true, "pix": true}',
  cert_arquivo     text,
  cert_titular     text,
  cert_validade    date,
  atualizado_em    timestamptz,
  atualizado_por   uuid
);
revoke all on privado.banco_config from public, anon, authenticated;

create table if not exists public.banco_historico (
  id          bigint generated always as identity primary key,
  quando      timestamptz not null default now(),
  radio_id    uuid references public.radios(id) on delete cascade,
  usuario_id  uuid references public.profiles(id) on delete set null,
  acao        text not null
);
alter table public.banco_historico enable row level security;
drop policy if exists banco_historico_ver on public.banco_historico;
create policy banco_historico_ver on public.banco_historico for select to authenticated using (public.is_financeiro());

-- guarda (ou troca) um segredo no Vault pelo nome
create or replace function privado.banco_segredo(p_nome text, p_valor text) returns void
language plpgsql security definer set search_path = privado, vault as $f$
declare v_id uuid;
begin
  select id into v_id from vault.secrets where name = p_nome;
  if p_valor is null then
    if v_id is not null then delete from vault.secrets where id = v_id; end if;
  elsif v_id is null then
    perform vault.create_secret(p_valor, p_nome);
  else
    perform vault.update_secret(v_id, p_valor);
  end if;
end $f$;
revoke all on function privado.banco_segredo(text, text) from public, anon, authenticated;

create or replace function public.banco_situacao(p_radio uuid) returns json
language plpgsql stable security definer set search_path = public, privado, vault as $f$
declare c privado.banco_config;
begin
  if not public.is_financeiro() then raise exception 'Sem acesso.'; end if;
  select * into c from privado.banco_config where radio_id = p_radio;
  return json_build_object(
    'banco', coalesce(c.banco, 'bradesco'),
    'agencia', c.agencia, 'conta', c.conta, 'digito', c.digito,
    'ambiente', coalesce(c.ambiente, 'homologacao'),
    'client_id', c.client_id,
    'servicos', coalesce(c.servicos, '{"saldo": true, "extrato": true, "boletos": true, "pix": true}'::jsonb),
    'secret', exists (select 1 from vault.secrets where name = 'banco_client_secret_' || p_radio),
    'certificado', exists (select 1 from vault.secrets where name = 'banco_cert_pfx_' || p_radio),
    'cert_arquivo', c.cert_arquivo, 'cert_titular', c.cert_titular, 'cert_validade', c.cert_validade,
    'atualizado_em', c.atualizado_em,
    'atualizado_por', (select nome from public.profiles where id = c.atualizado_por));
end $f$;
revoke all on function public.banco_situacao(uuid) from public, anon;
grant execute on function public.banco_situacao(uuid) to authenticated;

create or replace function public.salvar_banco(p_radio uuid, p_banco text, p_agencia text, p_conta text, p_digito text,
  p_ambiente text, p_client_id text, p_client_secret text, p_servicos jsonb) returns void
language plpgsql security definer set search_path = public, privado as $f$
begin
  if not public.is_financeiro() then raise exception 'Só o financeiro configura o banco.'; end if;
  if p_ambiente not in ('homologacao', 'producao') then raise exception 'Ambiente inválido.'; end if;
  insert into privado.banco_config (radio_id, banco, agencia, conta, digito, ambiente, client_id, servicos, atualizado_em, atualizado_por)
  values (p_radio, p_banco, nullif(p_agencia, ''), nullif(p_conta, ''), nullif(p_digito, ''), p_ambiente,
          nullif(p_client_id, ''), coalesce(p_servicos, '{}'), now(), auth.uid())
  on conflict (radio_id) do update set banco = excluded.banco, agencia = excluded.agencia, conta = excluded.conta,
    digito = excluded.digito, ambiente = excluded.ambiente, client_id = excluded.client_id,
    servicos = excluded.servicos, atualizado_em = now(), atualizado_por = auth.uid();
  if coalesce(p_client_secret, '') <> '' then
    perform privado.banco_segredo('banco_client_secret_' || p_radio, p_client_secret);
  end if;
  insert into public.banco_historico (radio_id, usuario_id, acao) values (p_radio, auth.uid(),
    'Salvou os dados da conta (' || case p_ambiente when 'producao' then 'produção' else 'homologação' end || ')'
    || case when coalesce(p_client_secret, '') <> '' then ' e trocou o Client Secret' else '' end);
end $f$;
revoke all on function public.salvar_banco(uuid, text, text, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.salvar_banco(uuid, text, text, text, text, text, text, text, jsonb) to authenticated;

-- certificado A1: o servidor do sistema abre o .pfx com a senha, lê a validade e manda tudo para cá
create or replace function public.salvar_banco_certificado(p_radio uuid, p_pfx text, p_senha text, p_arquivo text, p_titular text, p_validade date) returns void
language plpgsql security definer set search_path = public, privado as $f$
begin
  if not public.is_financeiro() then raise exception 'Só o financeiro configura o banco.'; end if;
  if coalesce(p_pfx, '') = '' then raise exception 'Certificado vazio.'; end if;
  perform privado.banco_segredo('banco_cert_pfx_' || p_radio, p_pfx);
  perform privado.banco_segredo('banco_cert_senha_' || p_radio, coalesce(p_senha, ''));
  insert into privado.banco_config (radio_id, cert_arquivo, cert_titular, cert_validade, atualizado_em, atualizado_por)
  values (p_radio, p_arquivo, p_titular, p_validade, now(), auth.uid())
  on conflict (radio_id) do update set cert_arquivo = excluded.cert_arquivo, cert_titular = excluded.cert_titular,
    cert_validade = excluded.cert_validade, atualizado_em = now(), atualizado_por = auth.uid();
  insert into public.banco_historico (radio_id, usuario_id, acao) values (p_radio, auth.uid(),
    'Enviou o certificado ' || coalesce(p_arquivo, '') || coalesce(' (vence em ' || to_char(p_validade, 'DD/MM/YYYY') || ')', ''));
end $f$;
revoke all on function public.salvar_banco_certificado(uuid, text, text, text, text, date) from public, anon;
grant execute on function public.salvar_banco_certificado(uuid, text, text, text, text, date) to authenticated;

create or replace function public.remover_banco_certificado(p_radio uuid) returns void
language plpgsql security definer set search_path = public, privado as $f$
begin
  if not public.is_financeiro() then raise exception 'Só o financeiro configura o banco.'; end if;
  perform privado.banco_segredo('banco_cert_pfx_' || p_radio, null);
  perform privado.banco_segredo('banco_cert_senha_' || p_radio, null);
  update privado.banco_config set cert_arquivo = null, cert_titular = null, cert_validade = null,
    atualizado_em = now(), atualizado_por = auth.uid() where radio_id = p_radio;
  insert into public.banco_historico (radio_id, usuario_id, acao) values (p_radio, auth.uid(), 'Removeu o certificado');
end $f$;
revoke all on function public.remover_banco_certificado(uuid) from public, anon;
grant execute on function public.remover_banco_certificado(uuid) to authenticated;

create or replace function public.registrar_teste_banco(p_radio uuid, p_resultado text) returns void
language sql security definer set search_path = public as $f$
  insert into public.banco_historico (radio_id, usuario_id, acao)
  select p_radio, auth.uid(), 'Testou a conexão: ' || p_resultado where public.is_financeiro();
$f$;
revoke all on function public.registrar_teste_banco(uuid, text) from public, anon;
grant execute on function public.registrar_teste_banco(uuid, text) to authenticated;

-- =====================================================================
--  RÁDIOS 100% SEPARADAS NO FINANCEIRO (2026-10-30)
--  Cada rádio paga a comissão e recebe a nota fiscal do vendedor à parte.
-- =====================================================================
alter table public.comissoes_pagas add column if not exists radio_id uuid references public.radios(id) on delete cascade;
alter table public.comissoes_nf add column if not exists radio_id uuid references public.radios(id) on delete cascade;
alter table public.comissoes_pagas drop constraint if exists comissoes_pagas_vendedor_id_mes_key;
alter table public.comissoes_nf drop constraint if exists comissoes_nf_vendedor_id_mes_key;
alter table public.comissoes_nf drop constraint if exists comissoes_nf_pkey;
create unique index if not exists comissoes_pagas_vend_mes_radio on public.comissoes_pagas (vendedor_id, mes, radio_id);
create unique index if not exists comissoes_nf_vend_mes_radio on public.comissoes_nf (vendedor_id, mes, radio_id);
alter table public.comissoes_pagas alter column radio_id set not null;
alter table public.comissoes_nf alter column radio_id set not null;

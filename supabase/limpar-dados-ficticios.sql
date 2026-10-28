-- =====================================================================
--  LIMPEZA DOS DADOS FICTÍCIOS (2026-10-28)
--  Deixa o banco pronto para cadastrar os contratos reais.
--
--  APAGA: clientes, contratos (com itens e parcelas), visitas, propostas
--  enviadas, prorrogações, testemunhais, histórico, comissões, todos os
--  vendedores e os acessos de teste (teste.*@radio96fm.com).
--
--  MANTÉM: rádios, programas, planos, tabela de preços, condições
--  especiais, segmentos, modelo de contrato, PDFs de proposta dos
--  programas, materiais do assistente, mapa do fluxo, configurações e
--  os acessos de gestão (gestor master, comercial e financeiro).
--
--  ANTES de apagar, copia tudo para o esquema "backup_20261028".
--  Se precisar desfazer, os dados estão lá.
--
--  Como usar: Supabase > SQL Editor > New query > cole TODO este arquivo
--  e clique em "Run". No fim aparece a lista de quem continua com acesso.
-- =====================================================================

do $limpa$
declare
  t text;
  tabelas text[] := array[
    'parcelas', 'contrato_itens', 'contratos', 'testemunhais', 'visitas_liberadas',
    'prorrogacoes', 'visitas', 'clientes', 'atividades', 'comissoes_pagas', 'comissoes_nf'];
begin
  -- 1) Backup
  create schema if not exists backup_20261028;
  revoke all on schema backup_20261028 from public, anon, authenticated;

  foreach t in array tabelas || array['profiles'] loop
    if to_regclass('public.' || t) is not null and to_regclass('backup_20261028.' || t) is null then
      execute format('create table backup_20261028.%I as select * from public.%I', t, t);
    end if;
  end loop;
  if to_regclass('backup_20261028.auth_users') is null then
    create table backup_20261028.auth_users as select * from auth.users;
  end if;

  -- 2) Apaga os dados de movimento (contratos, clientes, visitas...)
  foreach t in array tabelas loop
    if to_regclass('public.' || t) is not null then
      execute format('delete from public.%I', t);
    end if;
  end loop;

  -- 3) Apaga os vendedores e os acessos de teste (o perfil sai junto com o login)
  delete from auth.users u
   using public.profiles p
   where p.id = u.id
     and (p.papel::text = 'vendedor' or p.email ilike 'teste.%@radio96fm.com');

  -- 4) Numeração dos contratos volta para o 1
  if to_regclass('public.contratos_numero_seq') is not null then
    perform setval('public.contratos_numero_seq', 1, false);
  end if;
end
$limpa$;

-- Quem continua com acesso ao sistema
select nome, email, papel, ativo from public.profiles order by papel, nome;

-- =====================================================================
--  DESFAZER (só se precisar): copia de volta do backup
--  insert into auth.users select * from backup_20261028.auth_users on conflict do nothing;
--  insert into public.profiles select * from backup_20261028.profiles on conflict do nothing;
--  insert into public.clientes select * from backup_20261028.clientes;
--  insert into public.visitas select * from backup_20261028.visitas;
--  insert into public.contratos select * from backup_20261028.contratos;
--  insert into public.contrato_itens select * from backup_20261028.contrato_itens;
--  insert into public.parcelas select * from backup_20261028.parcelas;
--  (e as demais tabelas do esquema backup_20261028 na mesma ordem)
--
--  Quando os dados reais estiverem conferidos, dá para apagar o backup:
--  drop schema backup_20261028 cascade;
-- =====================================================================

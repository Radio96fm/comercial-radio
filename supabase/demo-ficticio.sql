-- =====================================================================
--  DADOS FICTÍCIOS PARA DEMONSTRAÇÃO (vendedor Maycon)
--  Tudo marcado com "DEMO FICTÍCIO" para ser apagado depois (ver LIMPEZA
--  no fim do arquivo). Não mexe em nenhum dado que já existia.
--  Datas relativas a hoje: os contratos e parcelas se ajustam sozinhos.
-- =====================================================================

do $demo$
declare
  v_vend   uuid;
  v_hoje   date := current_date;
  v_cli    uuid;
  v_prog   uuid;
  v_seg    uuid;
  v_ct     uuid;
  v_venc   date;
  n        int;
  c        record;
begin
  select id into v_vend from public.profiles where nome = 'Maycon Douglas Pereira de Souza';
  if v_vend is null then raise exception 'Vendedor Maycon não encontrado'; end if;

  -- ---------------------------------------------------------------
  -- Contratos (ativos, pendentes e encerrados), com parcelas
  -- ---------------------------------------------------------------
  for c in
    select * from (values
      -- cliente,                       segmento,                          rádio,          programa,                              início,       meses, valor,   status,       parcela atrasada?
      ('Agropecuária Sol Nascente',     'Agropecuária / Insumos',          'Rádio do Agro', 'Agro em Foco',                       date '2026-09-10', 6, 5000.00, 'ativo',     false),
      ('Máquinas Forte Agro',           'Máquinas agrícolas',              'Rádio do Agro', 'Agro em Foco',                       date '2026-08-10', 6, 5000.00, 'ativo',     false),
      ('Cooperativa Campo Forte',       'Banco / Cooperativa de crédito',  'Rádio do Agro', 'Agro em Foco',                       date '2026-10-10', 6, 5000.00, 'ativo',     false),
      ('Posto Estrada Verde',           'Posto de combustível',            'Rádio do Agro', 'Agro em Foco',                       date '2026-09-10', 6, 5000.00, 'ativo',     false),
      ('Veterinária Pet Campo',         'Veterinária / Pet shop',          'Rádio do Agro', 'Agro em Foco',                       date '2026-07-10', 6, 5000.00, 'ativo',     true),
      ('Clínica Vida Plena',            'Clínica / Saúde',                 'Rádio do Agro', 'Alexandre Garcia: Comentário do Dia', date '2026-08-10', 6, 15000.00,'ativo',     false),
      ('Academia Corpo Ativo',          'Academia',                        'Rádio do Agro', 'Alexandre Garcia: Comentário do Dia', date '2026-09-10', 6, 15000.00,'ativo',     false),
      ('Loja Casa Forte',               'Loja de móveis',                  'Rádio do Agro', 'Alexandre Garcia: Comentário do Dia', date '2026-07-10', 6, 15000.00,'ativo',     false),
      ('Restaurante Sabor da Roça',     'Restaurante / Alimentação',       'Rádio do Agro', 'Alexandre Garcia: Comentário do Dia', date '2026-10-10', 6, 15000.00,'ativo',     false),
      ('Concessionária Serra Azul',     'Concessionária de veículos',      '96 FM',         'Rock Radio',                         date '2026-10-10', 6, 3350.00, 'ativo',     false),
      ('Telefonia Conecta',             'Telefonia / Internet',            '96 FM',         'Rock Radio',                         date '2026-09-10', 6, 3350.00, 'ativo',     false),
      ('Farmácia Vida Certa',           'Farmácia',                        '96 FM',         'Hora Certa',                         date '2026-09-10', 6, 2630.00, 'ativo',     false),
      ('Moda Estilo Rio Verde',         'Moda / Vestuário / Calçados',     '96 FM',         'Hora Certa',                         date '2026-10-19', 6, 2630.00, 'pendente',  false),
      ('Supermercado Bom Preço',        'Supermercado',                    '96 FM',         'Hora do Rush I',                     date '2026-10-01', 4, 2800.00, 'ativo',     false),
      ('Construforte Materiais',        'Material de construção',          '96 FM',         'Hora do Rush I',                     date '2026-09-01', 3, 2800.00, 'ativo',     false),
      ('Ótica Visão Clara',             'Ótica',                           '96 FM',         'O Papo é com Ela',                   date '2026-10-26', 3, 1960.00, 'pendente',  false),
      ('Construtora Ipê',               'Construtora / Imobiliária',       'Rádio do Agro', 'Rio Verde Notícias 1ª Edição',       date '2026-10-10', 3, 3000.00, 'ativo',     false),
      ('Clínica Vida Plena',            'Clínica / Saúde',                 '96 FM',         'Bom Dia Produtor',                   date '2026-06-10', 6, 2350.00, 'ativo',     false),
      -- histórico (encerrados), para o gráfico de meses passados
      ('Supermercado Bom Preço',        'Supermercado',                    '96 FM',         'Hora do Rush II',                    date '2026-04-10', 3, 2800.00, 'encerrado', false),
      ('Ótica Visão Clara',             'Ótica',                           '96 FM',         'Rock Radio',                         date '2026-03-10', 4, 3350.00, 'encerrado', false),
      ('Faculdade Horizonte',           'Educação / Escola / Faculdade',   '96 FM',         'O Papo é com Ela',                   date '2026-05-10', 3, 1960.00, 'encerrado', false),
      ('Concessionária Serra Azul',     'Concessionária de veículos',      '96 FM',         'Bom Dia Produtor',                   date '2026-02-10', 6, 2350.00, 'encerrado', false),
      ('Academia Corpo Ativo',          'Academia',                        '96 FM',         'Hora Certa',                         date '2026-03-10', 3, 2630.00, 'encerrado', false)
    ) as t(cliente, segmento, radio, programa, inicio, meses, valor, status, atraso)
  loop
    -- cliente: reaproveita o do mesmo nome, senão cria
    select id into v_cli from public.clientes where nome = c.cliente and observacoes like 'DEMO FICTÍCIO%' limit 1;
    if v_cli is null then
      insert into public.clientes (nome, razao_social, documento, segmento_id, contato_nome, telefone, email, cidade, observacoes, vendedor_id, created_by)
      values (c.cliente, c.cliente || ' Ltda', '00.000.000/0001-00', (select id from public.segmentos where nome = c.segmento),
              'Contato Exemplo', '(64) 90000-0000', 'contato@exemplo.com.br', 'Rio Verde - GO',
              'DEMO FICTÍCIO: cliente de exemplo', v_vend, v_vend)
      returning id into v_cli;
    end if;

    select p.id into v_prog from public.programas p join public.radios r on r.id = p.radio_id
     where p.nome = c.programa and r.nome = c.radio;
    select id into v_seg from public.segmentos where nome = c.segmento;

    insert into public.contratos (cliente_id, programa_id, segmento_id, vendedor_id, data_inicio, data_fim, valor_mensal, meses,
                                  dia_vencimento, descricao_produto, observacoes, status)
    values (v_cli, v_prog, v_seg, v_vend, c.inicio, (c.inicio + make_interval(months => c.meses) - interval '1 day')::date,
            c.valor, c.meses, 10, 'Cota em ' || c.programa, 'DEMO FICTÍCIO', c.status::status_contrato)
    returning id into v_ct;

    -- parcelas: pagas no passado, emitidas nos próximos 30 dias, a emitir depois
    for n in 1..c.meses loop
      v_venc := (date_trunc('month', c.inicio) + make_interval(months => n - 1))::date + 9;
      insert into public.parcelas (contrato_id, numero, vencimento, valor, status, pago_em)
      values (v_ct, n, v_venc, c.valor,
        case
          when c.status = 'pendente' then 'a_emitir'
          when c.atraso and v_venc < v_hoje and v_venc + 30 >= v_hoje - 0 and n = c.meses / 2 + 1 then 'emitido'
          when v_venc < v_hoje then 'pago'
          when v_venc <= v_hoje + 30 then 'emitido'
          else 'a_emitir'
        end::status_parcela,
        case when v_venc < v_hoje and c.status <> 'pendente' then v_venc + 2 end);
    end loop;
  end loop;

  -- ---------------------------------------------------------------
  -- Visitas em andamento, em proposta, fechadas e perdidas
  -- ---------------------------------------------------------------
  for c in
    select * from (values
      ('Posto Estrela do Sul',  'Posto de combustível',        'em_andamento', now() - interval '40 minutes', null::timestamptz, 'Pediu valores das cotas da Rádio do Agro.'),
      ('Lojas Casa Forte Centro','Loja de móveis',             'proposta',     now() - interval '3 days',     null::timestamptz, 'Aguardando retorno do diretor sobre o plano.'),
      ('Agro Cerrado Sementes', 'Agropecuária / Insumos',       'fechado',      now() - interval '14 days',    now() - interval '13 days', 'Fechou a cota do Agro em Foco.'),
      ('Padaria Pão Quente',    'Restaurante / Alimentação',    'perdido',      now() - interval '21 days',    now() - interval '21 days', 'Achou o investimento alto para o momento.')
    ) as t(cliente, segmento, status, inicio, fim, obs)
  loop
    select id into v_cli from public.clientes where nome = c.cliente and observacoes like 'DEMO FICTÍCIO%' limit 1;
    if v_cli is null then
      insert into public.clientes (nome, razao_social, documento, segmento_id, contato_nome, telefone, email, cidade, observacoes, vendedor_id, created_by)
      values (c.cliente, c.cliente || ' Ltda', '00.000.000/0001-00', (select id from public.segmentos where nome = c.segmento),
              'Contato Exemplo', '(64) 90000-0000', 'contato@exemplo.com.br', 'Rio Verde - GO',
              'DEMO FICTÍCIO: cliente de exemplo', v_vend, v_vend)
      returning id into v_cli;
    end if;
    insert into public.visitas (cliente_id, vendedor_id, status, observacoes, iniciada_em, encerrada_em)
    values (v_cli, v_vend, c.status::status_visita, 'DEMO FICTÍCIO: ' || c.obs, c.inicio, c.fim);
  end loop;
end
$demo$;

-- =====================================================================
--  LIMPEZA (rodar só quando quiser apagar os dados de demonstração)
--  delete from public.contratos where observacoes = 'DEMO FICTÍCIO';   -- apaga as parcelas junto
--  delete from public.visitas where observacoes like 'DEMO FICTÍCIO%';
--  delete from public.clientes where observacoes like 'DEMO FICTÍCIO%';
-- =====================================================================

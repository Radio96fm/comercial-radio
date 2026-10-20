-- =====================================================================
--  DADOS FICTÍCIOS: distribui contratos e visitas entre os vendedores
--  (rodar depois de demo-ficticio.sql). Frederico e Pércio ficam de
--  propósito sem visita nem contrato, para mostrar vendedor parado.
--  As demos sem login (lib/demoDados.js) espelham este resultado.
-- =====================================================================
do $demo$
declare
  v_id   uuid;
  c      record;
begin
  -- carteira: cliente -> vendedor (contratos do cliente vão junto)
  for c in
    select * from (values
      ('Restaurante Sabor da Roça', 'Leonardo'), ('Loja Casa Forte', 'Leonardo'), ('Moda Estilo Rio Verde', 'Leonardo'), ('Construtora Ipê', 'Leonardo'),
      ('Academia Corpo Ativo', 'Freitas'), ('Posto Estrada Verde', 'Freitas'), ('Supermercado Bom Preço', 'Freitas'),
      ('Telefonia Conecta', 'Michele'), ('Farmácia Vida Certa', 'Michele'), ('Ótica Visão Clara', 'Michele'), ('Faculdade Horizonte', 'Michele'),
      ('Veterinária Pet Campo', 'Omarai'), ('Concessionária Serra Azul', 'Omarai'), ('Máquinas Forte Agro', 'Omarai'), ('Construforte Materiais', 'Omarai')
    ) as t(cliente, vendedor)
  loop
    select id into v_id from public.profiles where nome = c.vendedor;
    update public.clientes set vendedor_id = v_id where nome = c.cliente and observacoes like 'DEMO FICTÍCIO%';
    update public.contratos set vendedor_id = v_id
     where observacoes = 'DEMO FICTÍCIO' and cliente_id in (select id from public.clientes where nome = c.cliente and observacoes like 'DEMO FICTÍCIO%');
  end loop;

  -- venda registrada pouco antes do início do contrato (pendentes ficam como estão)
  update public.contratos set created_at = ((data_inicio - 2) + time '14:00') at time zone 'UTC'
   where observacoes = 'DEMO FICTÍCIO' and status in ('ativo', 'encerrado');

  -- Pércio fica sem nada: a visita dele na Padaria Pão Quente passa para a Michele
  update public.visitas set vendedor_id = (select id from public.profiles where nome = 'Michele')
   where observacoes like 'DEMO FICTÍCIO%' and vendedor_id = (select id from public.profiles where nome = 'Pércio');

  -- cliente novo em prospecção
  if not exists (select 1 from public.clientes where nome = 'Pneus Rodão' and observacoes like 'DEMO FICTÍCIO%') then
    insert into public.clientes (nome, razao_social, documento, segmento_id, contato_nome, telefone, email, cidade, observacoes, vendedor_id, created_by)
    select 'Pneus Rodão', 'Pneus Rodão Ltda', '00.000.000/0001-00', (select id from public.segmentos where nome = 'Concessionária de veículos'),
           'Contato Exemplo', '(64) 90000-0000', 'contato@exemplo.com.br', 'Rio Verde - GO', 'DEMO FICTÍCIO: cliente de exemplo', p.id, p.id
      from public.profiles p where p.nome = 'Freitas';
  end if;

  -- visitas que viraram os contratos de outubro, e uma proposta
  for c in
    select * from (values
      ('Cooperativa Campo Forte',   'Maycon Douglas Pereira de Souza', 'fechado',  timestamptz '2026-10-06 13:00-03', timestamptz '2026-10-08 15:00-03', 'Fechou a cota do Agro em Foco.'),
      ('Concessionária Serra Azul', 'Omarai',   'fechado',  timestamptz '2026-10-06 10:00-03', timestamptz '2026-10-08 11:00-03', 'Renovou, agora na Rock Radio.'),
      ('Construtora Ipê',           'Leonardo', 'fechado',  timestamptz '2026-10-05 09:30-03', timestamptz '2026-10-08 10:00-03', 'Fechou o Rio Verde Notícias 1ª Edição.'),
      ('Restaurante Sabor da Roça', 'Leonardo', 'fechado',  timestamptz '2026-10-02 11:00-03', timestamptz '2026-10-08 16:00-03', 'Fechou o Comentário do Alexandre Garcia.'),
      ('Moda Estilo Rio Verde',     'Leonardo', 'fechado',  timestamptz '2026-10-15 15:00-03', timestamptz '2026-10-19 09:00-03', 'Fechou a Hora Certa, falta assinar.'),
      ('Supermercado Bom Preço',    'Freitas',  'fechado',  timestamptz '2026-09-25 10:00-03', timestamptz '2026-09-29 10:00-03', 'Voltou para a Hora do Rush I.'),
      ('Pneus Rodão',               'Freitas',  'proposta', timestamptz '2026-10-15 14:00-03', null, 'Proposta da Rock Radio enviada.'),
      ('Ótica Visão Clara',         'Michele',  'fechado',  timestamptz '2026-10-14 16:00-03', timestamptz '2026-10-19 10:00-03', 'Fechou O Papo é com Ela, falta assinar.')
    ) as t(cliente, vendedor, status, inicio, fim, obs)
  loop
    if not exists (select 1 from public.visitas vi join public.clientes cl on cl.id = vi.cliente_id
                    where cl.nome = c.cliente and vi.iniciada_em = c.inicio) then
      insert into public.visitas (cliente_id, vendedor_id, status, observacoes, iniciada_em, encerrada_em)
      select cl.id, p.id, c.status::status_visita, 'DEMO FICTÍCIO: ' || c.obs, c.inicio, c.fim
        from public.clientes cl, public.profiles p
       where cl.nome = c.cliente and cl.observacoes like 'DEMO FICTÍCIO%' and p.nome = c.vendedor;
    end if;
  end loop;
end
$demo$;

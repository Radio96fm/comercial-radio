-- =====================================================================
--  DADOS INICIAIS (rode UMA vez, depois do schema.sql)
--  Programas e modelo de contrato são EXEMPLOS: edite pelo painel do gestor.
-- =====================================================================

insert into public.radios (nome, slogan, cor, ordem) values
  ('96 FM',          'A rádio que toca a sua vida', '#1d4ed8', 1),
  ('Rádio do Agro',  'A voz do campo',              '#15803d', 2)
on conflict (nome) do nothing;

insert into public.segmentos (nome) values
  ('Academia'), ('Agropecuária / Insumos'), ('Banco / Cooperativa de crédito'),
  ('Clínica / Saúde'), ('Concessionária de veículos'), ('Construtora / Imobiliária'),
  ('Educação / Escola / Faculdade'), ('Eletrodomésticos / Eletrônicos'), ('Farmácia'),
  ('Loja de móveis'), ('Máquinas agrícolas'), ('Material de construção'),
  ('Moda / Vestuário / Calçados'), ('Ótica'), ('Posto de combustível'),
  ('Restaurante / Alimentação'), ('Supermercado'), ('Telefonia / Internet'),
  ('Veterinária / Pet shop'), ('Outros')
on conflict (nome) do nothing;

insert into public.programas (radio_id, nome, apresentador, dias, horario_inicio, horario_fim, descricao, cotas_total, valor_cota, descricao_cota)
select r.id, p.nome, p.apresentador, p.dias, p.ini::time, p.fim::time, p.descr, p.cotas, p.valor, p.cota
from (values
  ('96 FM', 'Manhã 96',          'A definir', 'Segunda a sexta', '06:00', '09:00', 'Notícias, trânsito e música para começar o dia.', 6, 1500.00, '2 citações de patrocínio + 1 comercial de 30s por programa'),
  ('96 FM', 'Hora do Almoço',    'A definir', 'Segunda a sexta', '11:00', '13:00', 'Música e participação dos ouvintes.',              6, 1200.00, '2 citações de patrocínio + 1 comercial de 30s por programa'),
  ('96 FM', 'Tarde 96',          'A definir', 'Segunda a sexta', '14:00', '17:00', 'Os maiores sucessos e promoções.',                 6, 1000.00, '2 citações de patrocínio + 1 comercial de 30s por programa'),
  ('96 FM', 'Sábado Show',       'A definir', 'Sábado',          '09:00', '12:00', 'Programa de variedades do fim de semana.',         4,  800.00, '2 citações de patrocínio + 1 comercial de 30s por programa'),
  ('Rádio do Agro', 'Agro em Foco',     'A definir', 'Segunda a sexta', '05:00', '07:00', 'Cotações, clima e notícias do campo.',   6, 1300.00, '2 citações de patrocínio + 1 comercial de 30s por programa'),
  ('Rádio do Agro', 'Cotação do Dia',   'A definir', 'Segunda a sexta', '12:00', '12:30', 'Boletim de preços de grãos e pecuária.', 4,  900.00, 'Abertura e encerramento "oferecimento" + 1 comercial de 30s'),
  ('Rádio do Agro', 'Campo & Cidade',   'A definir', 'Segunda a sexta', '17:00', '18:00', 'Entrevistas com produtores e técnicos.', 5, 1000.00, '2 citações de patrocínio + 1 comercial de 30s por programa'),
  ('Rádio do Agro', 'Moda de Viola',    'A definir', 'Domingo',         '07:00', '10:00', 'O melhor da música sertaneja raiz.',     4,  700.00, '2 citações de patrocínio + 1 comercial de 30s por programa')
) as p(radio, nome, apresentador, dias, ini, fim, descr, cotas, valor, cota)
join public.radios r on r.nome = p.radio
on conflict (radio_id, nome) do nothing;

insert into public.modelos_contrato (nome, conteudo, ativo)
select 'Contrato padrão de patrocínio', $txt$CONTRATO DE PATROCÍNIO E VEICULAÇÃO PUBLICITÁRIA Nº {{numero_contrato}}

[MODELO DE EXEMPLO — substitua este texto pelo contrato oficial da rádio no Painel do Gestor > Modelos de contrato]

CONTRATADA: {{radio}}.

CONTRATANTE: {{cliente_razao_social}}, nome fantasia {{cliente_nome}}, inscrita no CNPJ/CPF sob o nº {{cliente_documento}}, com endereço em {{cliente_endereco}}, {{cliente_cidade}}, neste ato representada por {{cliente_contato}}, telefone {{cliente_telefone}}, e-mail {{cliente_email}}.

CLÁUSULA 1 – OBJETO
Patrocínio do programa "{{programa}}", veiculado {{programa_dias}}, das {{programa_horario}}, na {{radio}}, no segmento de {{segmento}}, compreendendo: {{descricao_produto}}.

CLÁUSULA 2 – EXCLUSIVIDADE DE SEGMENTO
Durante a vigência deste contrato, a CONTRATADA não aceitará outro patrocinador do segmento {{segmento}} no mesmo programa.

CLÁUSULA 3 – VIGÊNCIA
De {{data_inicio}} a {{data_fim}} ({{meses}} meses).

CLÁUSULA 4 – VALOR E PAGAMENTO
Valor mensal de {{valor_mensal}}, totalizando {{valor_total}}, pago em {{meses}} parcelas mensais por boleto bancário, com vencimento todo dia {{dia_vencimento}}.

CLÁUSULA 5 – OBSERVAÇÕES
{{observacoes}}

E, por estarem de acordo, as partes assinam o presente.

[Cidade], {{data_hoje}}.


_____________________________________
{{radio}}
Vendedor(a) responsável: {{vendedor}}


_____________________________________
{{cliente_razao_social}}
{{cliente_contato}}
$txt$, true
where not exists (select 1 from public.modelos_contrato);

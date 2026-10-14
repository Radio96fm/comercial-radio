-- =====================================================================
--  DADOS INICIAIS (rode UMA vez, depois do schema.sql)
--  O modelo de contrato é EXEMPLO: edite pelo painel do gestor.
-- =====================================================================

insert into public.radios (nome, slogan, cor, ordem) values
  ('96 FM',          'A rádio que toca a sua vida', '#ec7020', 1),
  ('Rádio do Agro',  'A voz do campo',              '#00b13e', 2)
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

-- Programas reais dos mídia kits 2026 (96 FM e Rio Verde FM / Rádio do Agro).
-- Cotas por programa: 5 (provisório; os kits não informam). Valor = menor plano mensal.
insert into public.programas (radio_id, nome, apresentador, dias, horario_inicio, horario_fim, descricao, cotas_total, valor_cota, descricao_cota)
select r.id, p.nome, p.apresentador, p.dias, p.ini::time, p.fim::time, p.descr, p.cotas, p.valor, p.cota
from (values
  ('96 FM', 'Bom Dia Produtor', 'Leonardo Freitas', 'Segunda a sexta', '07:00', '08:00', 'Notícias, tecnologia e os principais acontecimentos do agronegócio: previsão do tempo, cotações do dia, atualidades e entrevistas sobre máquinas e tecnologias do campo.', 5, 2350.00, 'Plano 01: abertura e encerramento + 4 inserções de 15" (R$ 2.350). Plano 02: abertura e encerramento + 2 inserções de 30" (R$ 2.350). Plano 03: abertura e encerramento + 4 inserções de 15" + 1 testemunhal ao vivo (R$ 3.135). Plano 04: abertura e encerramento + 2 inserções de 30" + 1 testemunhal ao vivo (R$ 3.135). Mensal, boleto, contrato mínimo de 3 meses.'),
  ('96 FM', 'O Papo é com Ela', 'Bia Capparelli', 'Segunda a sexta', '09:00', '10:00', 'O universo feminino com entrevistas, debates com profundidade e informação com leveza. Evolução do Papo Calcinha, há mais de uma década no ar.', 5, 1960.00, '1 testemunhal ao vivo dentro do programa, de segunda a sexta. Mensal, boleto, contrato mínimo de 3 meses.'),
  ('96 FM', 'Rock Radio', 'Emmanoel Capparelli', 'Segunda a sexta', '11:00', '12:00', 'Líder de audiência há mais de 10 anos: música, humor ácido, quizzes, enquetes e participação do público, com o time de humoristas mais conhecido do Sudoeste Goiano.', 5, 3350.00, '1 testemunhal ao vivo dentro do programa, de segunda a sexta. Mensal, boleto, contrato mínimo de 3 meses.'),
  ('96 FM', 'Hora do Rush I', 'Sérgio Germano', 'Segunda a sexta', '17:00', '18:00', 'Principais notícias do dia com boa música e bom humor no fim da tarde, com comentários dos professores Camilo Barbosa e José Maurílio, trânsito e acontecimentos da cidade.', 5, 2800.00, '1 testemunhal ao vivo dentro do programa, de segunda a sexta. Mensal, boleto, contrato mínimo de 3 meses.'),
  ('96 FM', 'Hora do Rush II', 'Sérgio Germano', 'Segunda a sexta', '18:00', '19:00', 'Boa música e as principais notícias do dia no retorno para casa, com comentários dos professores Camilo Barbosa e José Maurílio, trânsito e destaques da cidade.', 5, 2800.00, '1 testemunhal ao vivo dentro do programa, de segunda a sexta. Mensal, boleto, contrato mínimo de 3 meses.'),
  ('96 FM', 'Momento Produtor', 'Leonardo Freitas', 'Segunda a sexta · 1 vez de manhã e 3 à tarde', null, null, 'Programete voltado ao produtor rural com notícias, tecnologia e tudo o que acontece no agronegócio.', 5, 1960.00, '4 oferecimentos + 4 minutos informativos, cada um seguido de 1 inserção de 30". Mensal, boleto, contrato mínimo de 3 meses.'),
  ('96 FM', 'Hora Certa', null, 'Segunda a sexta · de hora em hora', null, null, 'O cliente cita sua marca e oferece o anúncio da hora, de hora em hora.', 5, 2630.00, '20 chamadas de oferecimento de 7" por dia. Mensal, boleto, contrato mínimo de 3 meses.'),
  ('Rádio do Agro', 'Alexandre Garcia: Comentário do Dia', 'Alexandre Garcia', 'Segunda a sexta · 08h00, 11h20 e 15h00', null, null, 'Alexandre Garcia comenta a realidade do Brasil e do mundo, de forma clara e franca, com foco em economia.', 5, 15000.00, 'Por mês: 66 informativos (3 por dia), 22 vinhetas de abertura, 22 de encerramento, 1 inserção de 30" em cada comentário (22) e 5 inserções de 30" por dia em horário indeterminado (110). Total de 242 inserções. Contrato mínimo de 3 meses.'),
  ('Rádio do Agro', 'Agro em Foco', 'Enio Fernandes', 'Segunda a sexta · 08h50, 10h50, 14h50 e 17h40', null, null, 'Notícias relevantes que movimentam o agronegócio e impactam o dia a dia do produtor rural em diversas culturas e na pecuária de corte.', 5, 5000.00, 'Por mês: 88 informativos (4 por dia), 22 vinhetas de abertura, 22 de encerramento, 1 inserção de 30" em cada comentário (22) e 4 inserções de 30" por dia em horário indeterminado (88). Total de 242 inserções. Contrato mínimo de 3 meses.'),
  ('Rádio do Agro', 'De Dentro da Porteira', 'Jacqueline Zaiden', 'Segunda a sexta · 08h20, 10h10, 14h10 e 17h10', null, null, 'Convidados falam da realidade do produtor rural: inovação na agricultura e pecuária, sustentabilidade, agricultura familiar, manejo e a mulher no agronegócio.', 5, 5000.00, 'Por mês: 88 informativos (4 por dia), 22 vinhetas de abertura, 22 de encerramento, 1 inserção de 30" em cada comentário (22) e 4 inserções de 30" por dia em horário indeterminado (88). Total de 242 inserções. Contrato mínimo de 3 meses.'),
  ('Rádio do Agro', 'Rio Verde Notícias 1ª Edição', 'Rogério Cabral', 'Segunda a sexta', null, null, 'Jornalismo que vai além do agronegócio: cidade, eventos políticos e econômicos que impactam o produtor, com um time de comentaristas influentes da região.', 5, 3000.00, 'Por mês: 22 vinhetas de abertura, 22 de encerramento, 22 testemunhais de até 60" e 3 inserções de 30" por programa (66). Total de 132 inserções. Contrato mínimo de 3 meses.'),
  ('Rádio do Agro', 'Rio Verde Notícias 2ª Edição', 'Rogério Cabral', 'Segunda a sexta', null, null, 'Segunda edição do jornal: cidade, eventos políticos e econômicos que impactam o produtor, com comentaristas influentes da região.', 5, 3000.00, 'Por mês: 22 vinhetas de abertura, 22 de encerramento, 22 testemunhais de até 60" e 3 inserções de 30" por programa (66). Total de 132 inserções. Contrato mínimo de 3 meses.'),
  ('Rádio do Agro', 'Boa Tarde Produtor', 'Hugo Ataíde e Daris Dias', 'Segunda a sexta', null, null, 'Entrevistas com líderes e referências da área técnica do agronegócio, grandes produtores e empresários de destaque.', 5, 10000.00, 'Por mês: 22 vinhetas de abertura, 22 de encerramento, 22 testemunhais de até 60", 3 inserções de 30" por programa com break exclusivo (66) e 5 inserções de 30" por dia em horário indeterminado (110). Total de 242 inserções. Contrato mínimo de 3 meses.')
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
-- O que cada programa entrega (uma linha por item; a tela mostra como lista)
update public.programas set descricao_cota = E'88 informativos por mês (08h50, 10h50, 14h50 e 17h40)\n22 vinhetas de abertura\n22 vinhetas de encerramento\n22 inserções de 30" (1 em cada comentário)\n88 inserções de 30" em horário livre (4 por dia)\nTotal: 242 inserções por mês' where nome = 'Agro em Foco';
update public.programas set descricao_cota = E'66 informativos por mês (08h00, 11h20 e 15h00)\n22 vinhetas de abertura\n22 vinhetas de encerramento\n22 inserções de 30" (1 em cada comentário)\n110 inserções de 30" em horário livre (5 por dia)\nTotal: 242 inserções por mês' where nome = 'Alexandre Garcia: Comentário do Dia';
update public.programas set descricao_cota = E'88 informativos por mês (08h20, 10h10, 14h10 e 17h10)\n22 vinhetas de abertura\n22 vinhetas de encerramento\n22 inserções de 30" (1 em cada comentário)\n88 inserções de 30" em horário livre (4 por dia)\nTotal: 242 inserções por mês' where nome = 'De Dentro da Porteira';
update public.programas set descricao_cota = E'22 vinhetas de abertura\n22 vinhetas de encerramento\n22 testemunhais de até 60"\n66 inserções de 30" durante o programa, com break exclusivo\n110 inserções de 30" em horário livre (5 por dia)\nTotal: 242 inserções por mês' where nome = 'Boa Tarde Produtor';
update public.programas set descricao_cota = E'22 vinhetas de abertura\n22 vinhetas de encerramento\n22 testemunhais de até 60"\n66 inserções de 30" durante o programa (3 por dia)\nTotal: 132 inserções por mês' where nome = 'Rio Verde Notícias 1ª Edição';
update public.programas set descricao_cota = E'22 vinhetas de abertura\n22 vinhetas de encerramento\n22 testemunhais de até 60"\n66 inserções de 30" durante o programa (3 por dia)\nTotal: 132 inserções por mês' where nome = 'Rio Verde Notícias 2ª Edição';
update public.programas set descricao_cota = E'20 chamadas de oferecimento de 7" por dia\nDe hora em hora, de segunda a sexta' where nome = 'Hora Certa';
update public.programas set descricao_cota = E'1 testemunhal ao vivo dentro do programa\nDe segunda a sexta' where nome = 'Hora do Rush I';
update public.programas set descricao_cota = E'1 testemunhal ao vivo dentro do programa\nDe segunda a sexta' where nome = 'Hora do Rush II';
update public.programas set descricao_cota = E'1 testemunhal ao vivo dentro do programa\nDe segunda a sexta' where nome = 'O Papo é com Ela';
update public.programas set descricao_cota = E'1 testemunhal ao vivo dentro do programa\nDe segunda a sexta' where nome = 'Rock Radio';
update public.programas set descricao_cota = E'4 oferecimentos\n4 minutos informativos, cada um seguido de 1 inserção de 30"\n1 vez de manhã e 3 à tarde, de segunda a sexta' where nome = 'Momento Produtor';
update public.programas set descricao_cota = E'Escolha um dos 4 planos (Plano 01 a 04).' where nome = 'Bom Dia Produtor';

-- Planos de cada programa (mídia kits 2026). Programa com um só valor = um plano.
insert into public.programa_planos (programa_id, nome, descricao, valor, ordem)
select p.id, x.nome, x.descr, x.valor, x.ordem
from (values
  ('Bom Dia Produtor', 'Plano 01', E'Abertura e encerramento do programa\n4 inserções de 15" dentro do programa', 2350.00, 1),
  ('Bom Dia Produtor', 'Plano 02', E'Abertura e encerramento do programa\n2 inserções de 30" dentro do programa', 2350.00, 2),
  ('Bom Dia Produtor', 'Plano 03', E'Abertura e encerramento do programa\n4 inserções de 15" dentro do programa\n1 testemunhal ao vivo dentro do programa', 3135.00, 3),
  ('Bom Dia Produtor', 'Plano 04', E'Abertura e encerramento do programa\n2 inserções de 30" dentro do programa\n1 testemunhal ao vivo dentro do programa', 3135.00, 4)
) as x(programa, nome, descr, valor, ordem)
join public.programas p on p.nome = x.programa
where not exists (select 1 from public.programa_planos pp where pp.programa_id = p.id);

insert into public.programa_planos (programa_id, nome, descricao, valor, ordem)
select p.id, 'Plano comercial', p.descricao_cota, p.valor_cota, 1
from public.programas p
where not exists (select 1 from public.programa_planos pp where pp.programa_id = p.id);

-- Tabela de preços avulsos (valor por inserção / testemunhal)
insert into public.tabela_precos (radio_id, tipo, duracao, modalidade, valor)
select r.id, x.tipo, x.dur, x.modal, x.valor
from (values
  ('96 FM','insercao',7,'indeterminada',20.16),   ('96 FM','insercao',7,'determinada',24.47),
  ('96 FM','insercao',15,'indeterminada',37.63),  ('96 FM','insercao',15,'determinada',42.56),
  ('96 FM','insercao',30,'indeterminada',66.86),  ('96 FM','insercao',30,'determinada',78.06),
  ('96 FM','insercao',45,'indeterminada',89.04),  ('96 FM','insercao',45,'determinada',105.28),
  ('96 FM','insercao',60,'indeterminada',113.79), ('96 FM','insercao',60,'determinada',149.90),
  ('96 FM','insercao',90,'indeterminada',170.58), ('96 FM','insercao',90,'determinada',200.70),
  ('96 FM','insercao',120,'indeterminada',227.36),('96 FM','insercao',120,'determinada',266.56),
  ('96 FM','insercao',180,'indeterminada',341.21),('96 FM','insercao',180,'determinada',401.41),
  ('96 FM','testemunhal',30,'determinada',155.57),('96 FM','testemunhal',45,'determinada',209.50),
  ('96 FM','testemunhal',60,'determinada',257.04),
  ('Rádio do Agro','insercao',7,'indeterminada',25.00),  ('Rádio do Agro','insercao',7,'determinada',35.00),
  ('Rádio do Agro','insercao',10,'indeterminada',35.00), ('Rádio do Agro','insercao',10,'determinada',50.00),
  ('Rádio do Agro','insercao',15,'indeterminada',50.00), ('Rádio do Agro','insercao',15,'determinada',65.00),
  ('Rádio do Agro','insercao',30,'indeterminada',70.00), ('Rádio do Agro','insercao',30,'determinada',95.00),
  ('Rádio do Agro','insercao',45,'indeterminada',100.00),('Rádio do Agro','insercao',45,'determinada',140.00),
  ('Rádio do Agro','insercao',60,'indeterminada',120.00),('Rádio do Agro','insercao',60,'determinada',170.00),
  ('Rádio do Agro','insercao',90,'indeterminada',190.00),('Rádio do Agro','insercao',90,'determinada',260.00),
  ('Rádio do Agro','testemunhal',30,'determinada',190.00),('Rádio do Agro','testemunhal',60,'determinada',340.00)
) as x(radio, tipo, dur, modal, valor)
join public.radios r on r.nome = x.radio
on conflict (radio_id, tipo, duracao, modalidade) do nothing;

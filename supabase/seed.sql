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

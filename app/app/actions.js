'use server';
import { valorNoPeriodo } from '@/lib/periodo';
import { configAutentique, enviarDocumento, reenviarAssinatura } from '@/lib/autentique';
import { gerarPdfContrato, nomeArquivo, SELECT_CONTRATO } from '@/lib/pdfGerar';
import { mensagemContrato } from '@/lib/mensagemContrato';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSessao } from '@/lib/auth';
import { dadosDoContrato, preencherModelo } from '@/lib/contrato';
import { somarMeses, somarDias, parseValor, moeda } from '@/lib/format';
import { descricaoItem } from '@/lib/pacote';
import { OUTRO } from '@/lib/segmento';

const txt = (fd, k) => {
  const v = String(fd.get(k) ?? '').trim();
  return v === '' ? null : v;
};

const dataCurta = (iso, ano) => (iso ? iso.split('-').reverse().slice(0, ano ? 3 : 2).join('/') : '');

function traduzErro(error) {
  if (!error) return null;
  const m = error.message || '';
  if (/row-level security|permission denied/i.test(m)) return 'Você não tem permissão para fazer isso.';
  if (/duplicate key/i.test(m)) return 'Esse registro já existe.';
  return m;
}

// ---------------------------------------------------------------- clientes
async function criarClienteInterno(supabase, fd, prefixo = '') {
  const nome = txt(fd, prefixo + 'nome');
  let segmento_id = txt(fd, prefixo + 'segmento_id');
  if (!nome) return { erro: 'Informe o nome do cliente.' };
  if (!segmento_id) return { erro: 'Escolha o segmento do cliente.' };

  // evita dois vendedores atendendo a mesma empresa (confere nome e CNPJ em todas as carteiras)
  const { data: existentes } = await supabase.rpc('empresa_existente', { p_nome: nome, p_documento: txt(fd, prefixo + 'documento') });
  if (existentes?.length) {
    const e = existentes[0];
    if (e.situacao === 'negociando') return { erro: `A empresa "${e.nome}" já está sendo visitada por ${e.dono_nome}. Ela fica livre em ${e.dias} dia(s), no dia ${dataCurta(e.ate)}.` };
    if (e.situacao === 'contrato') return { erro: `A empresa "${e.nome}" já é cliente de ${e.dono_nome}, com contrato até ${dataCurta(e.ate, true)}.` };
    if (e.situacao === 'sua') return { erro: `A empresa "${e.nome}" já está na sua carteira.`, existente: e.id };
    return { erro: `A empresa "${e.nome}" já está cadastrada.`, existente: e.id, livre: true };
  }

  // "Outro": segmento digitado à mão
  if (segmento_id === OUTRO) {
    const novo = txt(fd, prefixo + 'segmento_novo');
    if (!novo) return { erro: 'Escreva qual é o segmento do cliente.' };
    const { data: id, error } = await supabase.rpc('segmento_garantir', { p_nome: novo });
    if (error) return { erro: traduzErro(error) };
    segmento_id = id;
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert({
      nome,
      segmento_id,
      razao_social: txt(fd, prefixo + 'razao_social'),
      documento: txt(fd, prefixo + 'documento'),
      contato_nome: txt(fd, prefixo + 'contato_nome'),
      telefone: txt(fd, prefixo + 'telefone'),
      email: txt(fd, prefixo + 'email'),
      endereco: txt(fd, prefixo + 'endereco'),
      cidade: txt(fd, prefixo + 'cidade'),
      inscricao_estadual: txt(fd, prefixo + 'inscricao_estadual'),
      bairro: txt(fd, prefixo + 'bairro'),
      cep: txt(fd, prefixo + 'cep'),
      fax: txt(fd, prefixo + 'fax'),
      observacoes: txt(fd, prefixo + 'observacoes'),
    })
    .select('id')
    .single();
  if (error) return { erro: traduzErro(error) };
  return { id: data.id };
}

export async function criarCliente(_prev, fd) {
  const { supabase } = await getSessao();
  const r = await criarClienteInterno(supabase, fd);
  if (r.erro) return r;
  const voltar = txt(fd, 'voltar');
  redirect(voltar ? `${voltar}${voltar.includes('?') ? '&' : '?'}cliente=${r.id}` : `/app/clientes/${r.id}`);
}

export async function atualizarCliente(_prev, fd) {
  const { supabase } = await getSessao();
  const id = txt(fd, 'id');
  const campos = {};
  for (const k of ['nome', 'razao_social', 'documento', 'inscricao_estadual', 'contato_nome', 'telefone', 'fax', 'email', 'endereco', 'bairro', 'cep', 'cidade', 'observacoes', 'segmento_id']) {
    campos[k] = txt(fd, k);
  }
  if (!campos.nome || !campos.segmento_id) return { erro: 'Nome e segmento são obrigatórios.' };
  if (campos.segmento_id === OUTRO) {
    if (!txt(fd, 'segmento_novo')) return { erro: 'Escreva qual é o segmento do cliente.' };
    const { data: seg, error: e } = await supabase.rpc('segmento_garantir', { p_nome: txt(fd, 'segmento_novo') });
    if (e) return { erro: traduzErro(e) };
    campos.segmento_id = seg;
  }
  const { data, error } = await supabase.from('clientes').update(campos).eq('id', id).select('id');
  if (error) return { erro: traduzErro(error) };
  if (!data?.length) return { erro: 'Somente o vendedor responsável ou o gestor pode alterar este cliente.' };
  revalidatePath(`/app/clientes/${id}`);
  return { ok: 'Dados do cliente salvos.' };
}

// ---------------------------------------------------------------- visitas
export async function iniciarVisita(_prev, fd) {
  const { supabase, perfil } = await getSessao();
  let cliente_id = txt(fd, 'cliente_id');
  if (!cliente_id) {
    const r = await criarClienteInterno(supabase, fd, 'novo_');
    // empresa já cadastrada e livre (ou já sua): começa a visita com ela
    if (r.erro && !r.existente) return r;
    cliente_id = r.existente || r.id;
  }
  // o banco confere a exclusividade de 15 dias e passa a empresa livre para a carteira de quem visita
  const { data: id, error } = await supabase.rpc('iniciar_visita', { p_cliente: cliente_id, p_obs: txt(fd, 'observacoes') || '' });
  if (error) return { erro: traduzErro(error) };
  revalidatePath('/app', 'layout');
  redirect(`/app/visitas/${id}`);
}

export async function mudarStatusVisita(fd) {
  const { supabase } = await getSessao();
  const id = txt(fd, 'id');
  const status = txt(fd, 'status');
  const upd = { status };
  if (status === 'fechado' || status === 'perdido') upd.encerrada_em = new Date().toISOString();
  else upd.encerrada_em = null;
  await supabase.from('visitas').update(upd).eq('id', id);
  revalidatePath(`/app/visitas/${id}`);
  revalidatePath('/app/visitas');
}

export async function salvarObsVisita(_prev, fd) {
  const { supabase } = await getSessao();
  const id = txt(fd, 'id');
  const { data, error } = await supabase.from('visitas').update({ observacoes: txt(fd, 'observacoes') }).eq('id', id).select('id');
  if (error) return { erro: traduzErro(error) };
  if (!data?.length) return { erro: 'Somente quem registrou a visita pode alterá-la.' };
  return { ok: 'Anotação salva.' };
}

// ---------------------------------------------------------------- contratos
export async function criarContrato(_prev, fd) {
  const { supabase, perfil, isGestor } = await getSessao();

  const cliente_id = txt(fd, 'cliente_id');
  const programa_id = txt(fd, 'programa_id');
  const plano_id = programa_id ? txt(fd, 'plano_id') : null;
  const data_inicio = txt(fd, 'data_inicio');
  const meses = parseInt(fd.get('meses'), 10);
  const primeiro_vencimento = txt(fd, 'primeiro_vencimento');
  const vendedor_id = isGestor && txt(fd, 'vendedor_id') ? txt(fd, 'vendedor_id') : perfil.id;
  let pedidos = [];
  try {
    pedidos = JSON.parse(fd.get('itens') || '[]')
      .map((i) => ({ id: String(i.id), qtd: parseInt(i.qtd, 10) }))
      .filter((i) => i.id && i.qtd > 0);
  } catch {
    return { erro: 'Itens do pacote inválidos.' };
  }

  if (!cliente_id) return { erro: 'Escolha o cliente.' };
  if (!programa_id && !pedidos.length) return { erro: 'Escolha um programa ou adicione itens avulsos ao pacote.' };
  if (!data_inicio) return { erro: 'Informe a data de início.' };
  if (![1, 3, 6, 12].includes(meses)) return { erro: 'Escolha o período: 1, 3, 6 ou 12 meses.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(primeiro_vencimento || '')) return { erro: 'Informe a data do primeiro vencimento.' };
  const dia_vencimento = Math.min(28, Number(primeiro_vencimento.slice(8, 10)));

  const [{ data: cliente }, { data: programa }, { data: plano }, { data: precos }, { data: modelo }] = await Promise.all([
    supabase.from('clientes').select('*, segmento:segmentos(id, nome)').eq('id', cliente_id).single(),
    programa_id ? supabase.from('programas').select('*, radio:radios(id, nome)').eq('id', programa_id).single() : Promise.resolve({ data: null }),
    plano_id ? supabase.from('programa_planos').select('*').eq('id', plano_id).eq('programa_id', programa_id).maybeSingle() : Promise.resolve({ data: null }),
    pedidos.length ? supabase.from('tabela_precos').select('*').in('id', pedidos.map((i) => i.id)) : Promise.resolve({ data: [] }),
    supabase.from('modelos_contrato').select('id, conteudo').eq('ativo', true).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!cliente) return { erro: 'Cliente não encontrado.' };
  if (programa_id && !programa) return { erro: 'Programa não encontrado.' };
  if (plano_id && !plano) return { erro: 'Plano não encontrado para este programa.' };
  if (programa && meses < (programa.meses_minimo || 1)) return { erro: `Este programa tem contrato mínimo de ${programa.meses_minimo} meses.` };
  if (!isGestor && cliente.vendedor_id && cliente.vendedor_id !== perfil.id) {
    return { erro: 'Este cliente é da carteira de outro vendedor. Fale com o gestor para transferir.' };
  }

  // rádio do contrato: a do programa ou a escolhida no montador; itens têm que ser dela
  const radio_id = programa?.radio_id || txt(fd, 'radio_id');
  const itens = [];
  for (const pd of pedidos) {
    const p = (precos || []).find((x) => x.id === pd.id);
    if (!p || p.radio_id !== radio_id) return { erro: 'Um dos itens avulsos não é desta rádio. Monte o pacote de novo.' };
    itens.push({ descricao: descricaoItem(p), quantidade: pd.qtd, valor_unitario: Number(p.valor) });
  }
  const { data: radio } = await supabase.from('radios').select('id, nome').eq('id', radio_id).maybeSingle();
  if (!radio) return { erro: 'Escolha a rádio.' };

  // valor de tabela conforme o período escolhido (1, 3, 6 ou 12 meses)
  const valorPrograma = programa ? (plano ? valorNoPeriodo(plano, meses) : Number(programa.valor_cota)) : 0;
  const valorTabela = Math.round((valorPrograma + itens.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0)) * 100) / 100;
  // valor sempre o da tabela (o vendedor não altera)
  const valor_mensal = valorTabela;

  // o que o cliente está comprando (vai no texto do contrato)
  const partes = [];
  if (programa) {
    const desc = plano ? `${plano.nome}${plano.descricao ? `: ${plano.descricao}` : ''}` : programa.descricao_cota || 'cota de patrocínio';
    partes.push(`Patrocínio do programa "${programa.nome}" (${desc}).`);
  }
  for (const i of itens) partes.push(`${i.quantidade} por mês: ${i.descricao}.`);

  const vendedor = vendedor_id === perfil.id
    ? perfil
    : (await supabase.from('profiles').select('id, nome, documento, telefone').eq('id', vendedor_id).single()).data;
  if (!vendedor) return { erro: 'Vendedor não encontrado.' };

  const data_fim = somarDias(somarMeses(data_inicio, meses), -1);
  const novo = {
    cliente_id,
    programa_id,
    plano_id: plano?.id ?? null,
    radio_id,
    segmento_id: cliente.segmento_id,
    vendedor_id,
    modelo_id: modelo?.id ?? null,
    visita_id: txt(fd, 'visita_id'),
    data_inicio,
    data_fim,
    valor_mensal,
    meses,
    dia_vencimento,
    descricao_produto: partes.join('\n'),
    observacoes: txt(fd, 'observacoes'),
    // "Nome da agência" do contrato = o vendedor (dados de "Meus dados")
    agencia_nome: vendedor.nome,
    agencia_documento: vendedor.documento,
    agencia_contato: vendedor.telefone,
    campanha: 'Institucional',
    produto: 'Institucional',
    numero_pi: txt(fd, 'numero_pi'),
    autorizacao: txt(fd, 'autorizacao'),
    status: 'pendente',
  };

  const { data: criado, error } = await supabase.from('contratos').insert(novo).select('*').single();
  if (error) return { erro: traduzErro(error) };

  if (itens.length) {
    const { error: e2 } = await supabase.from('contrato_itens').insert(itens.map((i) => ({ ...i, contrato_id: criado.id })));
    if (e2) return { erro: 'Contrato criado, mas os itens avulsos não foram salvos: ' + traduzErro(e2) };
  }

  // gera o texto do contrato a partir do modelo (fica "congelado" no contrato)
  const vendedorNome = vendedor.nome;
  const texto = modelo
    ? preencherModelo(
        modelo.conteudo,
        dadosDoContrato({ contrato: criado, cliente, programa, radio, segmento: cliente.segmento, vendedor: { nome: vendedorNome } })
      )
    : null;
  if (texto) await supabase.from('contratos').update({ conteudo_gerado: texto }).eq('id', criado.id);

  // parcelas mensais a partir do primeiro vencimento escolhido
  const parcelas = [];
  for (let i = 0; i < meses; i++) {
    parcelas.push({ contrato_id: criado.id, numero: i + 1, vencimento: somarMeses(primeiro_vencimento, i), valor: valor_mensal });
  }
  await supabase.from('parcelas').insert(parcelas);

  redirect(`/app/contratos/${criado.id}?novo=1`);
}

export async function mudarStatusContrato(fd) {
  const { supabase } = await getSessao();
  const id = txt(fd, 'id');
  const status = txt(fd, 'status');
  const { error } = await supabase.from('contratos').update({ status }).eq('id', id);
  if (error) redirect(`/app/contratos/${id}?erro=${encodeURIComponent(traduzErro(error))}`);
  revalidatePath(`/app/contratos/${id}`);
  redirect(`/app/contratos/${id}`);
}

// ---------------------------------------------------------------- meus dados
export async function salvarMeusDados(_prev, fd) {
  const { supabase } = await getSessao();
  const nome = txt(fd, 'nome');
  if (!nome || nome.split(/\s+/).length < 2) return { erro: 'Escreva seu nome completo (nome e sobrenome).' };
  const { error } = await supabase.rpc('atualizar_meu_perfil', { p_nome: nome, p_documento: txt(fd, 'documento'), p_telefone: txt(fd, 'telefone') });
  if (error) return { erro: traduzErro(error) };
  revalidatePath('/app', 'layout');
  const voltar = txt(fd, 'voltar');
  if (voltar && voltar.startsWith('/app')) redirect(voltar);
  return { ok: 'Seus dados foram salvos. Eles vão aparecer nos seus contratos.' };
}

// ---------------------------------------------------------------- assinatura digital (Autentique)
export async function enviarParaAssinatura(fd) {
  const { supabase, perfil, isGestor } = await getSessao();
  const id = txt(fd, 'id');
  const voltar = (q) => redirect(`/app/contratos/${id}?${q}`);
  const { data: c } = await supabase.from('contratos').select(SELECT_CONTRATO).eq('id', id).maybeSingle();
  if (!c) voltar(`erro=${encodeURIComponent('Contrato não encontrado.')}`);
  if (c.status !== 'pendente') voltar(`erro=${encodeURIComponent('Só dá para enviar contratos aguardando assinatura.')}`);
  if (!isGestor && c.vendedor_id !== perfil.id) voltar(`erro=${encodeURIComponent('Este contrato é de outro vendedor.')}`);

  let resultado;
  try {
    const cfg = await configAutentique();
    if (!cfg?.token) throw new Error('A assinatura digital ainda não foi ligada. Peça ao gestor para colar a chave da Autentique no painel (Modelo de contrato).');
    const pdf = await gerarPdfContrato(supabase, c);
    const { data: parcelasMsg } = await supabase.from('parcelas').select('vencimento').eq('contrato_id', c.id).order('numero').limit(1);
    resultado = await enviarDocumento({
      token: cfg.token,
      nome: nomeArquivo(c),
      mensagem: mensagemContrato(c, { parcelas: parcelasMsg || [], emojis: false }).replace(/\*/g, ''),
      pdf,
      cliente: { nome: c.cliente?.contato_nome || c.cliente?.nome, email: c.cliente?.email || null },
    });
  } catch (e) {
    voltar(`erro=${encodeURIComponent(e.message || 'Não foi possível enviar para a Autentique.')}`);
  }
  const { error } = await supabase.from('contratos').update({
    autentique_id: resultado.id,
    autentique_assinatura: resultado.assinatura,
    assinatura_link: resultado.link,
    assinatura_enviada_em: new Date().toISOString(),
  }).eq('id', id);
  if (error) voltar(`erro=${encodeURIComponent(traduzErro(error))}`);
  revalidatePath(`/app/contratos/${id}`);
  voltar('enviado=1');
}

export async function reenviarEmailAssinatura(fd) {
  const { supabase } = await getSessao();
  const id = txt(fd, 'id');
  const { data: c } = await supabase.from('contratos').select('id, status, autentique_assinatura').eq('id', id).maybeSingle();
  let msg = 'enviado=1';
  try {
    if (!c?.autentique_assinatura || c.status !== 'pendente') throw new Error('Este contrato não está aguardando assinatura.');
    const cfg = await configAutentique();
    await reenviarAssinatura(cfg.token, c.autentique_assinatura);
  } catch (e) {
    msg = `erro=${encodeURIComponent(/too_many/.test(e.message) ? 'O e-mail acabou de ser reenviado. Espere alguns minutos para tentar de novo.' : e.message)}`;
  }
  redirect(`/app/contratos/${id}?${msg}`);
}

export async function salvarTestemunhal({ clienteId, programaId, texto }) {
  const { supabase, perfil } = await getSessao();
  const limpo = String(texto || '').trim();
  if (!limpo) return { erro: 'Nada para salvar.' };
  const { error } = await supabase.from('testemunhais').insert({
    cliente_id: clienteId, programa_id: programaId || null, texto: limpo, vendedor_id: perfil.id,
  });
  if (error) return { erro: traduzErro(error) };
  revalidatePath(`/app/clientes/${clienteId}`);
  return { ok: true };
}

export async function excluirTestemunhal(fd) {
  const { supabase } = await getSessao();
  await supabase.from('testemunhais').delete().eq('id', fd.get('id'));
  revalidatePath(`/app/clientes/${fd.get('cliente')}`);
}

export async function procurarEmpresa(busca) {
  const { supabase } = await getSessao();
  const { data } = await supabase.rpc('procurar_empresa', { p_busca: String(busca || '') });
  return data || [];
}

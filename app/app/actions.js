'use server';
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

  // evita dois vendedores atendendo o mesmo cliente (confere em todas as carteiras)
  const { data: existentes } = await supabase.rpc('cliente_existente', { p_nome: nome });
  if (existentes?.length) {
    const e = existentes[0];
    return { erro: `O cliente "${e.nome}" já está cadastrado${e.vendedor_nome ? ` na carteira de ${e.vendedor_nome}` : ''}.` };
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
    if (r.erro) return r;
    cliente_id = r.id;
  }
  const { data, error } = await supabase
    .from('visitas')
    .insert({ cliente_id, vendedor_id: perfil.id, observacoes: txt(fd, 'observacoes') })
    .select('id')
    .single();
  if (error) return { erro: traduzErro(error) };
  redirect(`/app/visitas/${data.id}`);
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
  const dia_vencimento = parseInt(fd.get('dia_vencimento'), 10) || 10;
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
  if (dia_vencimento < 1 || dia_vencimento > 28) return { erro: 'Dia de vencimento deve ser entre 1 e 28.' };

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

  // valor de tabela; o vendedor pode negociar o valor final
  const valorPrograma = programa ? Number(plano ? plano.valor : programa.valor_cota) : 0;
  const valorTabela = Math.round((valorPrograma + itens.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0)) * 100) / 100;
  const informado = parseValor(fd.get('valor_mensal'));
  const valor_mensal = Number.isFinite(informado) && informado >= 0 && String(fd.get('valor_mensal') || '').trim() !== '' ? informado : valorTabela;

  // o que o cliente está comprando (vai no texto do contrato)
  const partes = [];
  if (programa) {
    const desc = plano ? `${plano.nome}${plano.descricao ? `: ${plano.descricao}` : ''}` : programa.descricao_cota || 'cota de patrocínio';
    partes.push(`Patrocínio do programa "${programa.nome}" (${desc}).`);
  }
  for (const i of itens) partes.push(`${i.quantidade} por mês: ${i.descricao}.`);
  if (valor_mensal < valorTabela) partes.push(`Valor de tabela ${moeda(valorTabela)}/mês; valor negociado ${moeda(valor_mensal)}/mês.`);

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
    // "Nome da agência" do contrato: por padrão, quem vendeu
    agencia_nome: txt(fd, 'agencia_nome'),
    agencia_documento: txt(fd, 'agencia_documento'),
    agencia_contato: txt(fd, 'agencia_contato'),
    campanha: txt(fd, 'campanha'),
    produto: txt(fd, 'produto'),
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
  let vendedorNome = perfil.nome;
  if (vendedor_id !== perfil.id) {
    const { data: v } = await supabase.from('profiles').select('nome').eq('id', vendedor_id).single();
    vendedorNome = v?.nome || '';
  }
  if (!criado.agencia_nome) await supabase.from('contratos').update({ agencia_nome: vendedorNome }).eq('id', criado.id);
  const texto = modelo
    ? preencherModelo(
        modelo.conteudo,
        dadosDoContrato({ contrato: criado, cliente, programa, radio, segmento: cliente.segmento, vendedor: { nome: vendedorNome } })
      )
    : null;
  if (texto) await supabase.from('contratos').update({ conteudo_gerado: texto }).eq('id', criado.id);

  // parcelas mensais
  const parcelas = [];
  const [y, m] = data_inicio.split('-').map(Number);
  for (let i = 0; i < meses; i++) {
    const dt = new Date(Date.UTC(y, m - 1 + i, dia_vencimento));
    parcelas.push({ contrato_id: criado.id, numero: i + 1, vencimento: dt.toISOString().slice(0, 10), valor: valor_mensal });
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

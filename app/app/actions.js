'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSessao } from '@/lib/auth';
import { dadosDoContrato, preencherModelo } from '@/lib/contrato';
import { somarMeses, somarDias, parseValor } from '@/lib/format';
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
  for (const k of ['nome', 'razao_social', 'documento', 'contato_nome', 'telefone', 'email', 'endereco', 'cidade', 'observacoes', 'segmento_id']) {
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
  const data_inicio = txt(fd, 'data_inicio');
  const meses = parseInt(fd.get('meses'), 10);
  const valor_mensal = parseValor(fd.get('valor_mensal'));
  const dia_vencimento = parseInt(fd.get('dia_vencimento'), 10) || 10;
  const vendedor_id = isGestor && txt(fd, 'vendedor_id') ? txt(fd, 'vendedor_id') : perfil.id;

  if (!cliente_id) return { erro: 'Escolha o cliente.' };
  if (!programa_id) return { erro: 'Escolha o programa.' };
  if (!data_inicio) return { erro: 'Informe a data de início.' };
  if (!meses || meses < 1 || meses > 60) return { erro: 'Quantidade de meses inválida (1 a 60).' };
  if (!(valor_mensal >= 0) || Number.isNaN(valor_mensal)) return { erro: 'Valor mensal inválido.' };
  if (dia_vencimento < 1 || dia_vencimento > 28) return { erro: 'Dia de vencimento deve ser entre 1 e 28.' };

  const [{ data: cliente }, { data: programa }, { data: modelo }] = await Promise.all([
    supabase.from('clientes').select('*, segmento:segmentos(id, nome)').eq('id', cliente_id).single(),
    supabase.from('programas').select('*, radio:radios(nome)').eq('id', programa_id).single(),
    supabase.from('modelos_contrato').select('id, conteudo').eq('ativo', true).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!cliente || !programa) return { erro: 'Cliente ou programa não encontrado.' };
  if (!isGestor && cliente.vendedor_id && cliente.vendedor_id !== perfil.id) {
    return { erro: 'Este cliente é da carteira de outro vendedor. Fale com o gestor para transferir.' };
  }

  const data_fim = somarDias(somarMeses(data_inicio, meses), -1);
  const novo = {
    cliente_id,
    programa_id,
    segmento_id: cliente.segmento_id,
    vendedor_id,
    modelo_id: modelo?.id ?? null,
    visita_id: txt(fd, 'visita_id'),
    data_inicio,
    data_fim,
    valor_mensal,
    meses,
    dia_vencimento,
    descricao_produto: txt(fd, 'descricao_produto') || programa.descricao_cota,
    observacoes: txt(fd, 'observacoes'),
    status: 'pendente',
  };

  const { data: criado, error } = await supabase.from('contratos').insert(novo).select('*').single();
  if (error) return { erro: traduzErro(error) };

  // gera o texto do contrato a partir do modelo (fica "congelado" no contrato)
  let vendedorNome = perfil.nome;
  if (vendedor_id !== perfil.id) {
    const { data: v } = await supabase.from('profiles').select('nome').eq('id', vendedor_id).single();
    vendedorNome = v?.nome || '';
  }
  const texto = modelo
    ? preencherModelo(
        modelo.conteudo,
        dadosDoContrato({ contrato: criado, cliente, programa, radio: programa.radio, segmento: cliente.segmento, vendedor: { nome: vendedorNome } })
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

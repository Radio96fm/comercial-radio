'use server';
import { revalidatePath } from 'next/cache';
import { requireGestor } from '@/lib/auth';
import { adminCriarUsuario, adminAtualizarUsuario } from '@/lib/supabase/admin';
import { parseValor } from '@/lib/format';

const txt = (fd, k) => {
  const v = String(fd.get(k) ?? '').trim();
  return v === '' ? null : v;
};

function erroAmigavel(error) {
  const m = error?.message || 'Erro desconhecido.';
  if (/foreign key|violates foreign key/i.test(m)) return 'Não é possível excluir: este item está sendo usado em clientes, programas ou contratos.';
  if (/duplicate key|already exists|already been registered/i.test(m)) return 'Já existe um registro com esse nome/e-mail.';
  if (/password/i.test(m)) return 'Senha fraca ou inválida. Use pelo menos 8 caracteres.';
  return m;
}

// ------------------------------------------------------------------ programas
export async function salvarPrograma(_prev, fd) {
  const { supabase } = await requireGestor();
  const id = txt(fd, 'id');
  const valor = parseValor(fd.get('valor_cota'));
  const registro = {
    radio_id: txt(fd, 'radio_id'),
    nome: txt(fd, 'nome'),
    apresentador: txt(fd, 'apresentador'),
    dias: txt(fd, 'dias') || 'Segunda a sexta',
    horario_inicio: txt(fd, 'horario_inicio'),
    horario_fim: txt(fd, 'horario_fim'),
    descricao: txt(fd, 'descricao'),
    cotas_total: parseInt(fd.get('cotas_total'), 10) || 0,
    valor_cota: Number.isFinite(valor) ? valor : 0,
    descricao_cota: txt(fd, 'descricao_cota'),
    ativo: fd.get('ativo') === 'on',
  };
  if (!registro.radio_id || !registro.nome) return { erro: 'Rádio e nome do programa são obrigatórios.' };
  const q = id ? supabase.from('programas').update(registro).eq('id', id) : supabase.from('programas').insert(registro);
  const { error } = await q;
  if (error) return { erro: erroAmigavel(error) };
  revalidatePath('/gestao/programas');
  return { ok: id ? 'Programa atualizado.' : 'Programa cadastrado.' };
}

// ------------------------------------------------------------------ usuários
export async function criarUsuario(_prev, fd) {
  await requireGestor();
  const nome = txt(fd, 'nome');
  const email = (txt(fd, 'email') || '').toLowerCase();
  const senha = String(fd.get('senha') || '');
  const papel = txt(fd, 'papel') === 'gestor' ? 'gestor' : 'vendedor';
  if (!nome || !email) return { erro: 'Nome e e-mail são obrigatórios.' };
  if (senha.length < 8) return { erro: 'A senha precisa ter pelo menos 8 caracteres.' };

  // a função também grava o papel no perfil (o gatilho de criação roda antes do app_metadata ser gravado)
  const { error } = await adminCriarUsuario({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, telefone: txt(fd, 'telefone') },
    app_metadata: { papel },
  });
  if (error) return { erro: erroAmigavel(error) };
  revalidatePath('/gestao/vendedores');
  return { ok: `Usuário ${nome} criado. Passe para ele o e-mail e a senha para o primeiro acesso.` };
}

export async function atualizarUsuario(_prev, fd) {
  const { supabase, perfil } = await requireGestor();
  const id = txt(fd, 'id');
  const papel = txt(fd, 'papel') === 'gestor' ? 'gestor' : 'vendedor';
  if (id === perfil.id && papel !== 'gestor') return { erro: 'Você não pode tirar o seu próprio acesso de gestor.' };

  const { error } = await supabase
    .from('profiles')
    .update({ nome: txt(fd, 'nome'), telefone: txt(fd, 'telefone'), papel })
    .eq('id', id);
  if (error) return { erro: erroAmigavel(error) };
  await adminAtualizarUsuario(id, { app_metadata: { papel } });
  revalidatePath('/gestao/vendedores');
  return { ok: 'Usuário atualizado.' };
}

export async function alternarAtivo(fd) {
  const { supabase, perfil } = await requireGestor();
  const id = txt(fd, 'id');
  const ativar = fd.get('ativar') === '1';
  if (id === perfil.id) return;
  await supabase.from('profiles').update({ ativo: ativar }).eq('id', id);
  // bloqueia/desbloqueia o login no Supabase Auth
  await adminAtualizarUsuario(id, { ban_duration: ativar ? 'none' : '876000h' });
  revalidatePath('/gestao/vendedores');
}

export async function redefinirSenha(_prev, fd) {
  await requireGestor();
  const id = txt(fd, 'id');
  const senha = String(fd.get('senha') || '');
  if (senha.length < 8) return { erro: 'A nova senha precisa ter pelo menos 8 caracteres.' };
  const { error } = await adminAtualizarUsuario(id, { password: senha });
  if (error) return { erro: erroAmigavel(error) };
  return { ok: 'Senha redefinida. Informe a nova senha ao usuário.' };
}

// ------------------------------------------------------------------ modelo de contrato
export async function salvarModelo(_prev, fd) {
  const { supabase } = await requireGestor();
  const id = txt(fd, 'id');
  const registro = { nome: txt(fd, 'nome') || 'Contrato padrão', conteudo: String(fd.get('conteudo') || ''), ativo: true, updated_at: new Date().toISOString() };
  if (registro.conteudo.trim().length < 20) return { erro: 'O texto do contrato está muito curto.' };
  const q = id ? supabase.from('modelos_contrato').update(registro).eq('id', id) : supabase.from('modelos_contrato').insert(registro);
  const { error } = await q;
  if (error) return { erro: erroAmigavel(error) };
  revalidatePath('/gestao/modelos');
  return { ok: 'Modelo salvo. Os próximos contratos já usarão este texto (os antigos não mudam).' };
}

// ------------------------------------------------------------------ rádios e segmentos
export async function criarSegmento(_prev, fd) {
  const { supabase } = await requireGestor();
  const nome = txt(fd, 'nome');
  if (!nome) return { erro: 'Informe o nome do segmento.' };
  const { error } = await supabase.from('segmentos').insert({ nome });
  if (error) return { erro: erroAmigavel(error) };
  revalidatePath('/gestao/cadastros');
  return { ok: `Segmento "${nome}" criado.` };
}

export async function excluirSegmento(_prev, fd) {
  const { supabase } = await requireGestor();
  const { error } = await supabase.from('segmentos').delete().eq('id', txt(fd, 'id'));
  if (error) return { erro: erroAmigavel(error) };
  revalidatePath('/gestao/cadastros');
  return { ok: 'Segmento excluído.' };
}

export async function salvarRadio(_prev, fd) {
  const { supabase } = await requireGestor();
  const id = txt(fd, 'id');
  const registro = { nome: txt(fd, 'nome'), slogan: txt(fd, 'slogan'), cor: txt(fd, 'cor') || '#1f2eff' };
  if (!registro.nome) return { erro: 'Informe o nome da rádio.' };
  const q = id ? supabase.from('radios').update(registro).eq('id', id) : supabase.from('radios').insert(registro);
  const { error } = await q;
  if (error) return { erro: erroAmigavel(error) };
  revalidatePath('/gestao/cadastros');
  return { ok: 'Rádio salva.' };
}

// ------------------------------------------------------------------ clientes
export async function transferirCliente(_prev, fd) {
  const { supabase } = await requireGestor();
  const { error } = await supabase.from('clientes').update({ vendedor_id: txt(fd, 'vendedor_id') }).eq('id', txt(fd, 'id'));
  if (error) return { erro: erroAmigavel(error) };
  revalidatePath('/gestao/clientes');
  return { ok: 'Cliente transferido.' };
}

// ------------------------------------------------------------------ parcelas
export async function mudarStatusParcela(fd) {
  const { supabase } = await requireGestor();
  const status = txt(fd, 'status');
  const upd = { status, pago_em: status === 'pago' ? new Date().toISOString().slice(0, 10) : null };
  await supabase.from('parcelas').update(upd).eq('id', txt(fd, 'id'));
  revalidatePath('/gestao/parcelas');
}

// ------------------------------------------------------------------ importação de clientes
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

// Recebe as linhas já lidas da planilha (no navegador), em lotes.
// Pula clientes sem nome e os que já existem (mesmo nome); cria segmentos novos.
export async function importarClientes(linhas) {
  const { supabase } = await requireGestor();
  if (!Array.isArray(linhas) || !linhas.length) return { erro: 'Nenhuma linha para importar.' };
  if (linhas.length > 1000) return { erro: 'Envie no máximo 1000 linhas por vez.' };

  const [{ data: segmentos }, { data: perfis }, { data: existentes }] = await Promise.all([
    supabase.from('segmentos').select('id, nome'),
    supabase.from('profiles').select('id, nome, email'),
    supabase.from('clientes').select('nome').limit(100000),
  ]);
  const segPorNome = new Map((segmentos || []).map((s) => [norm(s.nome), s.id]));
  const jaTem = new Set((existentes || []).map((c) => norm(c.nome)));
  const acharVendedor = (v) => {
    const n = norm(v);
    if (!n) return null;
    const p = (perfis || []).find((x) => norm(x.email) === n || norm(x.nome) === n)
      || (perfis || []).find((x) => norm(x.nome).split(' ')[0] === n);
    return p?.id || null;
  };

  let semNome = 0, duplicados = 0, segmentosCriados = 0;
  const vendedoresNaoAchados = new Set();
  const novos = [];
  for (const l of linhas) {
    const nome = String(l?.nome ?? '').trim().slice(0, 200);
    if (!nome) { semNome++; continue; }
    if (jaTem.has(norm(nome))) { duplicados++; continue; }
    jaTem.add(norm(nome));

    const segNome = String(l.segmento ?? '').trim() || 'Outros';
    let segmento_id = segPorNome.get(norm(segNome));
    if (!segmento_id) {
      const { data: s, error } = await supabase.from('segmentos').insert({ nome: segNome.slice(0, 120) }).select('id').single();
      if (error) return { erro: erroAmigavel(error) };
      segmento_id = s.id;
      segPorNome.set(norm(segNome), s.id);
      segmentosCriados++;
    }
    const vendedor_id = acharVendedor(l.vendedor);
    if (l.vendedor && !vendedor_id) vendedoresNaoAchados.add(String(l.vendedor).trim());

    const campo = (k) => (String(l[k] ?? '').trim() || null);
    novos.push({
      nome, segmento_id, vendedor_id,
      razao_social: campo('razao_social'), documento: campo('documento'), contato_nome: campo('contato_nome'),
      telefone: campo('telefone'), email: campo('email'), endereco: campo('endereco'),
      cidade: campo('cidade'), observacoes: campo('observacoes'),
    });
  }

  if (novos.length) {
    const { error } = await supabase.from('clientes').insert(novos);
    if (error) return { erro: erroAmigavel(error) };
  }
  revalidatePath('/gestao/clientes');
  return { importados: novos.length, duplicados, semNome, segmentosCriados, vendedoresNaoAchados: [...vendedoresNaoAchados] };
}

// ------------------------------------------------------------------ planos e tabela de preços
export async function salvarPlano(_prev, fd) {
  const { supabase } = await requireGestor();
  const id = txt(fd, 'id');
  const valor = parseValor(fd.get('valor'));
  const registro = { nome: txt(fd, 'nome'), descricao: txt(fd, 'descricao'), valor: Number.isFinite(valor) ? valor : NaN, ordem: parseInt(fd.get('ordem'), 10) || 0 };
  if (!registro.nome) return { erro: 'Dê um nome ao plano (ex.: Plano 01).' };
  if (!(registro.valor >= 0)) return { erro: 'Valor do plano inválido.' };
  const q = id
    ? supabase.from('programa_planos').update(registro).eq('id', id)
    : supabase.from('programa_planos').insert({ ...registro, programa_id: txt(fd, 'programa_id') });
  const { error } = await q;
  if (error) return { erro: erroAmigavel(error) };
  revalidatePath('/gestao/programas');
  return { ok: id ? 'Plano salvo.' : 'Plano adicionado.' };
}

export async function excluirPlano(fd) {
  const { supabase } = await requireGestor();
  await supabase.from('programa_planos').delete().eq('id', txt(fd, 'id'));
  revalidatePath('/gestao/programas');
}

export async function salvarPreco(_prev, fd) {
  const { supabase } = await requireGestor();
  const id = txt(fd, 'id');
  const valor = parseValor(fd.get('valor'));
  if (!(valor >= 0)) return { erro: 'Valor inválido.' };
  if (id) {
    const { error } = await supabase.from('tabela_precos').update({ valor, ativo: fd.get('ativo') === 'on' }).eq('id', id);
    if (error) return { erro: erroAmigavel(error) };
  } else {
    const duracao = parseInt(fd.get('duracao'), 10);
    if (!(duracao > 0)) return { erro: 'Informe a duração em segundos.' };
    const { error } = await supabase.from('tabela_precos').insert({
      radio_id: txt(fd, 'radio_id'), tipo: txt(fd, 'tipo'), modalidade: txt(fd, 'modalidade'), duracao, valor,
    });
    if (error) return { erro: /duplicate|already exists/i.test(error.message) ? 'Esse item já existe na tabela desta rádio. Altere o valor dele na lista.' : erroAmigavel(error) };
  }
  revalidatePath('/gestao/precos');
  return { ok: 'Tabela de preços salva.' };
}

export async function excluirPreco(fd) {
  const { supabase } = await requireGestor();
  await supabase.from('tabela_precos').delete().eq('id', txt(fd, 'id'));
  revalidatePath('/gestao/precos');
}

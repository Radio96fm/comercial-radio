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

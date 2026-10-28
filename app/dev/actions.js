'use server';
import { revalidatePath } from 'next/cache';
import { requireDev } from '@/lib/auth';
import { FUNCOES } from '@/lib/funcoes';

const txt = (fd, k) => {
  const v = String(fd.get(k) ?? '').trim();
  return v === '' ? null : v;
};

function atualizar() {
  revalidatePath('/dev');
  revalidatePath('/dev/vendedores');
}

// Cadastra ou corrige um vendedor/agência que aparece nos contratos
export async function salvarRepresentante(_prev, fd) {
  const { supabase } = await requireDev();
  const id = txt(fd, 'id');
  const registro = {
    nome: txt(fd, 'nome'),
    tipo: fd.get('tipo') === 'agencia' ? 'agencia' : 'vendedor',
    documento: txt(fd, 'documento'),
    telefone: txt(fd, 'telefone'),
    email: txt(fd, 'email'),
    observacoes: txt(fd, 'observacoes'),
  };
  if (!registro.nome) return { erro: 'Informe o nome.' };
  const q = id ? supabase.from('representantes').update(registro).eq('id', id) : supabase.from('representantes').insert(registro);
  const { error } = await q;
  if (error) return { erro: /duplicate|unique/i.test(error.message) ? 'Já existe um vendedor ou agência com esse CPF/CNPJ.' : error.message };
  atualizar();
  return { ok: id ? 'Salvo.' : 'Cadastrado.' };
}

// Liga o vendedor/agência a um login: os contratos e clientes passam para ele
export async function vincularRepresentante(_prev, fd) {
  const { supabase } = await requireDev();
  const rep = txt(fd, 'id');
  const login = txt(fd, 'profile_id');
  if (!rep || !login) return { erro: 'Escolha o login.' };
  const { data: n, error } = await supabase.rpc('vincular_representante', { p_rep: rep, p_profile: login });
  if (error) return { erro: error.message };
  atualizar();
  revalidatePath('/dev/acessos');
  return { ok: `Vinculado. ${n || 0} contrato(s) passaram para este login.` };
}

export async function excluirRepresentante(fd) {
  const { supabase } = await requireDev();
  await supabase.from('representantes').delete().eq('id', txt(fd, 'id'));
  atualizar();
}

// Funções liberadas de um acesso: o que não vier marcado fica desligado
export async function salvarFuncoes(_prev, fd) {
  const { supabase, perfil } = await requireDev();
  const id = txt(fd, 'id');
  if (!id || id === perfil.id) return { erro: 'O seu acesso de desenvolvedor sempre vê tudo.' };
  const liberadas = new Set(fd.getAll('funcao').map(String));
  const bloqueadas = FUNCOES.flatMap(([, itens]) => itens.map(([k]) => k)).filter((k) => !liberadas.has(k));
  const { error } = await supabase.from('profiles').update({ funcoes_bloqueadas: bloqueadas }).eq('id', id);
  if (error) return { erro: error.message };
  revalidatePath('/dev/acessos');
  return { ok: bloqueadas.length ? `Salvo. ${bloqueadas.length} função(ões) desligada(s).` : 'Salvo. Tudo liberado.' };
}

// ElevenLabs: testa a chave na hora de salvar
export async function salvarElevenLabs(_prev, fd) {
  const { supabase } = await requireDev();
  const token = txt(fd, 'token');
  const voz = txt(fd, 'voz') || '';
  let conta = '';
  if (token) {
    const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': token }, cache: 'no-store' }).catch(() => null);
    if (!r?.ok) return { erro: `A ElevenLabs não aceitou esta chave${r ? ` (${r.status})` : ''}.` };
    const j = await r.json().catch(() => ({}));
    if (j.tier) conta = ` Plano ${j.tier}, ${Number(j.character_count || 0).toLocaleString('pt-BR')} de ${Number(j.character_limit || 0).toLocaleString('pt-BR')} caracteres usados no mês.`;
  }
  const { error } = await supabase.rpc('salvar_elevenlabs', { p_token: token || '', p_voz: voz });
  if (error) return { erro: error.message };
  revalidatePath('/dev/integracoes');
  return { ok: `ElevenLabs salva.${conta}` };
}

// Quadro de contratos: troca quem ganha comissão num contrato
// linhas: [{ representante_id, papel, percentual, base }]
export async function salvarComissaoContrato({ contratoId, linhas, regra }) {
  const { supabase } = await requireDev();
  if (!contratoId || !Array.isArray(linhas) || !linhas.length) return { erro: 'Informe quem ganha a comissão.' };
  const { error } = await supabase.rpc('definir_comissao_contrato', { p_contrato: contratoId, p_linhas: linhas, p_regra: regra || '' });
  if (error) return { erro: error.message };
  revalidatePath('/dev/contratos');
  return { ok: true };
}

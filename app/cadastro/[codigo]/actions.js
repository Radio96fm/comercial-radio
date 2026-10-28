'use server';
import { redirect } from 'next/navigation';
import { adminCriarUsuario } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// Cadastro do vendedor pelo link único que o gestor manda para a equipe
export async function cadastrarVendedor(_prev, fd) {
  const codigo = String(fd.get('codigo') || '');
  const nome = String(fd.get('nome') || '').trim();
  const email = String(fd.get('email') || '').trim().toLowerCase();
  const telefone = String(fd.get('telefone') || '').trim();
  const documento = String(fd.get('documento') || '').trim();
  const digitos = documento.replace(/\D/g, '');
  const senha = String(fd.get('senha') || '');
  const senha2 = String(fd.get('senha2') || '');
  if (!nome || !email) return { erro: 'Preencha seu nome e e-mail.' };
  if (nome.split(/\s+/).length < 2) return { erro: 'Coloque o nome completo.' };
  if (digitos.length !== 11 && digitos.length !== 14) return { erro: 'Confira o CPF (11 números) ou CNPJ (14 números).' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { erro: 'Confira o e-mail.' };
  if (senha.length < 8) return { erro: 'A senha precisa ter pelo menos 8 caracteres.' };
  if (senha !== senha2) return { erro: 'As duas senhas não são iguais.' };

  const supabase = createClient();
  const { data: ok } = await supabase.rpc('convite_valido', { p_codigo: codigo });
  if (!ok) return { erro: 'Este link de cadastro não vale mais. Peça o link novo ao gestor.' };

  const { error } = await adminCriarUsuario({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, telefone },
    app_metadata: { papel: 'vendedor' },
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return { erro: 'Já existe um acesso com este e-mail. Entre pela tela de login.' };
    return { erro: `Não foi possível criar o acesso: ${error.message}` };
  }
  await supabase.auth.signInWithPassword({ email, password: senha });
  // CPF/CNPJ igual ao de um vendedor/agência dos contratos: os contratos passam para este acesso
  const { data: vinculados } = await supabase.rpc('concluir_cadastro', { p_documento: documento });
  redirect(`/app/perfil?bemvindo=1${vinculados ? `&contratos=${vinculados}` : ''}`);
}

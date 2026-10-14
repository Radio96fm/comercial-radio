'use server';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { existeGestor } from '@/lib/setup';

export async function criarPrimeiroGestor(_prev, formData) {
  const nome = String(formData.get('nome') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const senha = String(formData.get('senha') || '');

  if (!nome || !email) return { erro: 'Preencha nome e e-mail.' };
  if (senha.length < 8) return { erro: 'A senha precisa ter pelo menos 8 caracteres.' };

  // Só funciona enquanto NÃO existir nenhum gestor. Depois disso, fica bloqueado.
  if (await existeGestor()) return { erro: 'O sistema já foi configurado. Entre pela tela de login.' };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
    app_metadata: { papel: 'gestor' },
  });
  if (error) return { erro: 'Não foi possível criar o usuário: ' + error.message };

  const supabase = createClient();
  await supabase.auth.signInWithPassword({ email, password: senha });
  redirect('/gestao');
}

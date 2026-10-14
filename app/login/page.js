'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Radio } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(params.get('erro') === 'inativo' ? 'Seu acesso está desativado. Fale com o gestor.' : '');
  const [carregando, setCarregando] = useState(false);
  const [verSenha, setVerSenha] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) {
      setCarregando(false);
      setErro('E-mail ou senha incorretos.');
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <form onSubmit={entrar}>
      {erro && <div className="alerta erro">{erro}</div>}
      <div className="campo">
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" inputMode="email" autoComplete="username" required
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
      </div>
      <div className="campo">
        <label htmlFor="senha">Senha</label>
        <input id="senha" type={verSenha ? 'text' : 'password'} autoComplete="current-password" required
          value={senha} onChange={(e) => setSenha(e.target.value)} />
        <div className="ajuda">
          <label style={{ fontWeight: 400, display: 'inline-flex', alignItems: 'center', marginTop: 8 }}>
            <input type="checkbox" checked={verSenha} onChange={(e) => setVerSenha(e.target.checked)} /> Mostrar senha
          </label>
        </div>
      </div>
      <button className="btn grande" disabled={carregando}>{carregando ? 'Entrando...' : 'Entrar'}</button>
      <p className="muted" style={{ textAlign: 'center', marginTop: 16 }}>
        Esqueceu a senha? Peça ao gestor comercial para redefinir.
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="marca"><Radio className="ico" strokeWidth={2.4} /></div>
        <h1>Comercial</h1>
        <div className="emissoras"><span className="badge b-azul">96 FM</span><span className="badge" style={{ background: 'rgba(255,106,31,.15)', color: '#ff8a4c' }}>Rádio do Agro</span></div>
        <Suspense fallback={null}><LoginForm /></Suspense>
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useFormState } from 'react-dom';
import { cadastrarVendedor } from './actions';
import BotaoEnviar from '@/components/BotaoEnviar';

export default function FormCadastro({ codigo }) {
  const [estado, acao] = useFormState(cadastrarVendedor, null);
  const [ver, setVer] = useState(false);
  return (
    <form action={acao}>
      {estado?.erro && <div className="alerta erro">{estado.erro}</div>}
      <input type="hidden" name="codigo" value={codigo} />
      <div className="campo"><label>Seu nome completo</label><input name="nome" required autoComplete="name" /></div>
      <div className="campo">
        <label>CPF ou CNPJ</label>
        <input name="documento" inputMode="numeric" required autoComplete="off" />
        <div className="ajuda">O mesmo que você usa nas notas para a rádio. Assim seus contratos já aparecem.</div>
      </div>
      <div className="campo"><label>Seu e-mail</label><input name="email" type="email" inputMode="email" required autoComplete="username" /></div>
      <div className="campo"><label>Seu WhatsApp</label><input name="telefone" type="tel" inputMode="tel" autoComplete="tel" /></div>
      <div className="campo">
        <label>Crie uma senha</label>
        <input name="senha" type={ver ? 'text' : 'password'} minLength={8} required autoComplete="new-password" />
        <div className="ajuda">Mínimo de 8 caracteres.</div>
      </div>
      <div className="campo">
        <label>Repita a senha</label>
        <input name="senha2" type={ver ? 'text' : 'password'} minLength={8} required autoComplete="new-password" />
        <label style={{ fontWeight: 400, display: 'inline-flex', alignItems: 'center', marginTop: 8 }}>
          <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} /> Mostrar senha
        </label>
      </div>
      <BotaoEnviar className="btn grande" texto="Criar meu acesso" enviando="Criando..." />
    </form>
  );
}

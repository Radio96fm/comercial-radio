'use client';
import { useFormState } from 'react-dom';
import { criarPrimeiroGestor } from './actions';
import BotaoEnviar from '@/components/BotaoEnviar';

export default function FormPrimeiroAcesso() {
  const [estado, acao] = useFormState(criarPrimeiroGestor, null);
  return (
    <form action={acao}>
      {estado?.erro && <div className="alerta erro">{estado.erro}</div>}
      <div className="campo"><label>Seu nome</label><input name="nome" required /></div>
      <div className="campo"><label>E-mail</label><input name="email" type="email" required /></div>
      <div className="campo">
        <label>Senha</label>
        <input name="senha" type="password" minLength={8} required />
        <div className="ajuda">Mínimo de 8 caracteres.</div>
      </div>
      <BotaoEnviar className="btn grande" texto="Criar gestor e entrar" />
    </form>
  );
}

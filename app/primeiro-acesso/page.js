import Link from 'next/link';
import { existeGestor } from '@/lib/setup';
import FormPrimeiroAcesso from './form';

export const dynamic = 'force-dynamic';

export default async function PrimeiroAcesso() {
  let jaConfigurado = false;
  let erro = '';
  try {
    jaConfigurado = await existeGestor();
  } catch (e) {
    erro = e.message;
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="marca">🛠️</div>
        <h1>Primeiro acesso</h1>
        {erro ? (
          <div className="alerta erro">{erro}</div>
        ) : jaConfigurado ? (
          <>
            <div className="alerta info">O sistema já está configurado.</div>
            <Link className="btn grande" href="/login">Ir para o login</Link>
          </>
        ) : (
          <>
            <p className="muted" style={{ textAlign: 'center' }}>
              Crie o usuário do <b>gestor comercial</b>. Ele vai cadastrar os vendedores depois.
            </p>
            <FormPrimeiroAcesso />
          </>
        )}
      </div>
    </div>
  );
}

import Link from 'next/link';
import { Lock } from 'lucide-react';

// Tela desligada pelo desenvolvedor para este acesso
export default function SemAcesso() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="marca"><Lock className="ico" strokeWidth={2.4} /></div>
        <h1>Sem acesso</h1>
        <p className="muted" style={{ textAlign: 'center' }}>Esta parte do sistema não está liberada para o seu acesso. Se precisar, fale com o responsável pelo sistema.</p>
        <Link className="btn grande" href="/">Voltar ao início</Link>
      </div>
    </div>
  );
}

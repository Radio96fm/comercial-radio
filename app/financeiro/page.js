import { getSessao } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// O acesso do financeiro está sendo preparado; por enquanto o financeiro fica no painel do gestor master
export default async function FinanceiroEmBreve() {
  const { perfil } = await getSessao();
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Olá, {perfil.nome.split(' ')[0]}!</h1>
        <p className="muted" style={{ textAlign: 'center' }}>Seu painel financeiro está sendo preparado. Em breve ele aparece aqui.</p>
        <form action="/sair" method="post"><button className="btn grande cinza">Sair</button></form>
      </div>
    </div>
  );
}

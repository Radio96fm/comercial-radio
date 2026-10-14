'use client';
export default function Erro({ error, reset }) {
  return (
    <div className="conteudo" style={{ textAlign: 'center', paddingTop: 60 }}>
      <h1>Ops, algo deu errado</h1>
      <p className="muted">{error?.message?.includes('SUPABASE') ? error.message : 'Tente novamente. Se continuar, avise o gestor.'}</p>
      <button className="btn" onClick={() => reset()}>Tentar de novo</button>
    </div>
  );
}

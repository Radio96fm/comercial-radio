import Link from 'next/link';
export default function NaoEncontrado() {
  return (
    <div className="conteudo" style={{ textAlign: 'center', paddingTop: 60 }}>
      <h1>Página não encontrada</h1>
      <p className="muted">O item pode ter sido excluído ou você não tem acesso.</p>
      <Link className="btn" href="/">Voltar ao início</Link>
    </div>
  );
}

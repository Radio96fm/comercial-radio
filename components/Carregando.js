// Esqueleto mostrado na hora do clique, enquanto a próxima tela carrega.
export default function Carregando({ linhas = 4 }) {
  return (
    <div className="carregando" aria-busy="true" aria-label="Carregando">
      <div className="sk sk-titulo" />
      {Array.from({ length: linhas }).map((_, i) => <div key={i} className="sk sk-bloco" />)}
    </div>
  );
}

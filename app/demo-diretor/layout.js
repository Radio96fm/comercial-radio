import TemaPainel from '../diretor/TemaPainel';
import '../diretor/diretor.css';

export const dynamic = 'force-dynamic';

// Demonstração pública do Painel do Diretor: sem login, só dados fictícios.
export default function DemoDiretorLayout({ children }) {
  return <div className="dir"><TemaPainel />{children}</div>;
}

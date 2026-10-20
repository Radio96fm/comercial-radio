import TemaPainel from '../diretor/TemaPainel';
import '../diretor/diretor.css';

export const dynamic = 'force-dynamic';

// Demonstração pública do Painel Comercial: sem login, só dados fictícios.
export default function DemoComercialLayout({ children }) {
  return <div className="dir"><TemaPainel />{children}</div>;
}

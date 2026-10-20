import Celular from '../Celular';

export const metadata = {
  title: 'Apresentação · Painel do Diretor',
};

// Painel do Diretor dentro de uma moldura de iPhone ou iPad, para apresentar
// no computador. O painel roda de verdade dentro da moldura (mesmo site).
export default function Page() {
  return <Celular inicio="/demo-diretor" rotulo="Painel do Diretor · demonstração" aparelhos={['iphone', 'ipad', 'ipad-deitado']} claro />;
}

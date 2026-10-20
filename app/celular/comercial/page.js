import Celular from '../Celular';

export const metadata = {
  title: 'Apresentação · Painel Comercial',
};

// Painel Comercial dentro de uma moldura de iPhone ou iPad, para apresentar
// no computador. O painel roda de verdade dentro da moldura (mesmo site).
export default function Page() {
  return <Celular inicio="/demo-comercial" rotulo="Painel do diretor comercial · demonstração" aparelhos={['iphone', 'ipad', 'ipad-deitado']} claro />;
}

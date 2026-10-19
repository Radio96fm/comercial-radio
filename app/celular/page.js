import Celular from './Celular';

export const metadata = {
  title: 'Apresentação · versão do vendedor',
};

// Página para apresentar o app do vendedor no computador, dentro de uma
// moldura de celular. O app roda de verdade dentro da moldura (mesmo site),
// então dá para clicar, rolar e entrar como se fosse no celular.
export default function Page() {
  return <Celular />;
}

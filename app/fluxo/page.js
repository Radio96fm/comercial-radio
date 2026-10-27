import Mapa from '../mapa/Mapa';
import '../mapa/mapa.css';

export const metadata = { title: 'Mapa do fluxo · 96 FM e Rádio do Agro', robots: { index: false, follow: false } };

// Mapa do fluxo do negócio, aberto sem login: quem tem o link vê, arrasta,
// edita e comenta. Não mostra nenhum dado de cliente nem valores do banco.
export default function Page() {
  return <Mapa codigo="fluxo" />;
}

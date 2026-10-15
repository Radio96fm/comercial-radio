import { Download } from 'lucide-react';

// Baixa a lista que está na tela como planilha (abre no Excel)
export default function BotaoPlanilha({ href, texto = 'Baixar planilha' }) {
  return <a className="btn peq cinza" href={href} download><Download className="ico" />{texto}</a>;
}

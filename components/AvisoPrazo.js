import Link from 'next/link';
import { Clock, ChevronRight } from 'lucide-react';

// Barrinha amarela: negociações do vendedor que estão perto de perder a exclusividade.
export default function AvisoPrazo({ itens }) {
  if (!itens.length) return null;
  const um = itens.length === 1 ? itens[0] : null;
  return (
    <Link href={um ? `/app/visitas/${um.id}` : '/app/visitas'} className="aviso-condicao aviso-prazo">
      <Clock size={15} className="ico" />
      <span className="t">
        {um
          ? <>{um.restam === 1 ? 'Falta 1 dia' : `Faltam ${um.restam} dias`} para fechar com <b>{um.nome}</b></>
          : <><b>{itens.length} negociações</b> perto do fim do prazo</>}
      </span>
      <ChevronRight size={16} />
    </Link>
  );
}

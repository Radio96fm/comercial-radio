import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

// Setinha verde (subiu) / vermelha (caiu) comparando com o mês passado
export default function Tendencia({ variacao, anterior }) {
  if (Math.abs(variacao) < 0.5) {
    return <span className="tendencia igual"><Minus className="ico" /> igual ao mês passado</span>;
  }
  const sobe = variacao > 0;
  const Ico = sobe ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`tendencia ${sobe ? 'sobe' : 'cai'}`}>
      <Ico className="ico" strokeWidth={2.6} />
      {anterior > 0 ? `${sobe ? '+' : ''}${Math.round(variacao)}%` : 'novo'} vs mês passado
    </span>
  );
}

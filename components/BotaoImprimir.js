'use client';
export default function BotaoImprimir({ texto = '🖨️ Imprimir / Salvar PDF', className = 'btn sec' }) {
  return <button type="button" className={className} onClick={() => window.print()}>{texto}</button>;
}

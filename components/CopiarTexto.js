'use client';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopiarTexto({ texto, rotulo = 'Copiar', className = 'btn sec' }) {
  const [ok, setOk] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const t = document.createElement('textarea');
      t.value = texto; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    setOk(true);
    setTimeout(() => setOk(false), 2500);
  }
  return (
    <button type="button" className={className} onClick={copiar}>
      {ok ? <><Check className="ico" /> Copiado!</> : <><Copy className="ico" /> {rotulo}</>}
    </button>
  );
}

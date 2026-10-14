'use client';
import { useEffect } from 'react';

// Logo depois de criar o contrato, já baixa o PDF pronto.
export default function AbrirPdf({ href }) {
  useEffect(() => {
    const t = setTimeout(() => { window.location.href = href; }, 600);
    return () => clearTimeout(t);
  }, [href]);
  return null;
}

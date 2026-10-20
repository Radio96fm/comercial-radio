'use client';
import { useRef } from 'react';

// Formulário de filtro que aplica sozinho: muda a lista ou a data e já filtra
// (datas esperam um instante, para dar tempo de terminar de digitar)
export default function FormAuto({ children, className, style }) {
  const espera = useRef(null);
  function mudou(e) {
    const f = e.currentTarget;
    const t = e.target;
    if (t.tagName === 'SELECT') { f.requestSubmit(); return; }
    if (t.type === 'date') {
      clearTimeout(espera.current);
      if (t.value && t.value.length === 10 && Number(t.value.slice(0, 4)) > 2000) espera.current = setTimeout(() => f.requestSubmit(), 700);
    }
  }
  return <form method="get" className={className} style={style} onChange={mudou}>{children}</form>;
}

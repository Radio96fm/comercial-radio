'use client';
import { useFormState } from 'react-dom';
import { useEffect, useRef } from 'react';

// Formulário que chama uma Server Action e mostra a mensagem de erro/sucesso que ela devolver.
// A action deve ter a assinatura (estadoAnterior, formData) => { erro } | { ok } | redirect()
export default function FormAcao({ action, children, className, limparAoSalvar = false, style }) {
  const [estado, acao] = useFormState(action, null);
  const ref = useRef(null);
  useEffect(() => {
    if (estado?.ok && limparAoSalvar) ref.current?.reset();
  }, [estado, limparAoSalvar]);
  return (
    <form ref={ref} action={acao} className={className} style={style}>
      {estado?.erro && <div className="alerta erro">{estado.erro}</div>}
      {estado?.ok && <div className="alerta ok">{estado.ok}</div>}
      {children}
    </form>
  );
}

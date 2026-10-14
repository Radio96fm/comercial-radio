'use client';
import { useFormStatus } from 'react-dom';

export default function BotaoEnviar({ texto = 'Salvar', enviando = 'Salvando...', className = 'btn grande', confirmar, disabled, ...rest }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending || !!disabled}
      onClick={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
      {...rest}
    >
      {pending ? enviando : texto}
    </button>
  );
}

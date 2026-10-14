'use client';
import { useState } from 'react';
import { Send } from 'lucide-react';

// WhatsApp abre uma conversa por vez: este botão vai abrindo a próxima da fila
export default function EnviarTodos({ links }) {
  const [i, setI] = useState(0);
  if (!links.length) return null;
  const fim = i >= links.length;
  return (
    <div className="card enviar-todos">
      <div>
        <b>Mandar todos pelo WhatsApp</b>
        <div className="muted">{fim ? 'Pronto! Todas as mensagens foram abertas.' : `Próximo: ${links[i].nome} (${i + 1} de ${links.length})`}</div>
      </div>
      {fim ? (
        <button type="button" className="btn cinza" onClick={() => setI(0)}>Começar de novo</button>
      ) : (
        <a className="btn whats" href={links[i].url} target="_blank" rel="noopener noreferrer" onClick={() => setTimeout(() => setI((x) => x + 1), 300)}>
          <Send className="ico" />Abrir {i === 0 ? 'o primeiro' : 'o próximo'}
        </a>
      )}
    </div>
  );
}

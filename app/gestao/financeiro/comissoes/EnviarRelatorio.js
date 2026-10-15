'use client';
import { Send } from 'lucide-react';
import { registrarRelatorio } from '../actions';

// Abre o WhatsApp do vendedor com o relatório e marca "relatório enviado"
export default function EnviarRelatorio({ url, vendedorId, mes, texto = 'Enviar no WhatsApp', className = 'btn whats' }) {
  if (!url) return <span className="muted" style={{ fontSize: '.85rem' }}>Vendedor sem telefone cadastrado</span>;
  return (
    <a className={className} href={url} target="_blank" rel="noopener noreferrer" onClick={() => { registrarRelatorio(vendedorId, mes); }}>
      <Send className="ico" />{texto}
    </a>
  );
}

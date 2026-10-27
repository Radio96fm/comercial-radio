'use client';
import { useEffect } from 'react';

// apaga um rascunho guardado no aparelho depois que ele virou registro de verdade
export default function LimparRascunho({ chave }) {
  useEffect(() => { try { localStorage.removeItem(chave); } catch { /* sem armazenamento */ } }, [chave]);
  return null;
}

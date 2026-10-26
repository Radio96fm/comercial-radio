'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Leva para a versão certa da tela: no computador o sistema completo (pc),
// no celular o painel resumido (celular).
export default function TelaCerta({ pc, celular }) {
  const router = useRouter();
  useEffect(() => {
    const largo = window.innerWidth >= 900;
    if (largo && pc) router.replace(pc + window.location.search);
    if (!largo && celular) router.replace(celular + window.location.search);
  }, [pc, celular, router]);
  return null;
}

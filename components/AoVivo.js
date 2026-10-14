'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Escuta mudanças no banco e atualiza a tela automaticamente (ex.: alguém iniciou uma visita).
export default function AoVivo({ tabelas = ['visitas', 'contratos', 'clientes', 'programas'] }) {
  const router = useRouter();
  const timer = useRef(null);
  useEffect(() => {
    const supabase = createClient();
    const canal = supabase.channel('ao-vivo');
    tabelas.forEach((t) =>
      canal.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => router.refresh(), 400);
      })
    );
    canal.subscribe();
    const aoVoltar = () => document.visibilityState === 'visible' && router.refresh();
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', aoVoltar);
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Cada tela aberta por quem está logado fica no histórico de acessos do Painel do Desenvolvedor
const FORA = ['/login', '/cadastro', '/primeiro-acesso', '/fluxo', '/mapa', '/celular', '/demo-', '/sem-acesso'];

export default function RegistrarAcesso() {
  const path = usePathname();
  useEffect(() => {
    if (!path || FORA.some((p) => path.startsWith(p))) return;
    createClient().rpc('registrar_acesso', { p_evento: 'tela', p_caminho: path }).then(() => {}, () => {});
  }, [path]);
  return null;
}

'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { trocarRadio } from '@/app/radioAcao';

const LOGO = { '96 FM': '/logos/96fm.png', 'Rádio do Agro': '/logos/agro.png' };

// Escolha da rádio no topo: tudo na tela passa a ser só dela
export default function SeletorRadio({ radios, atual }) {
  const router = useRouter();
  const [carregando, iniciar] = useTransition();
  return (
    <div className="seletor-radio" role="tablist" aria-label="Rádio" style={{ opacity: carregando ? 0.6 : 1 }}>
      {radios.map((r) => (
        <button key={r.id} type="button" role="tab" aria-selected={r.id === atual}
          className={r.id === atual ? 'ativo' : ''} style={r.id === atual ? { '--cor-radio': r.cor || 'var(--accent)' } : undefined}
          onClick={() => r.id !== atual && iniciar(async () => { await trocarRadio(r.id); router.refresh(); })}>
          {LOGO[r.nome] && <img src={LOGO[r.nome]} alt="" />}{r.nome}
        </button>
      ))}
    </div>
  );
}

'use client';
import { useRouter, usePathname } from 'next/navigation';

// Troca a rádio do painel financeiro: tudo passa a mostrar só aquela rádio
export default function SeletorRadio({ radios, atual, soNoFinanceiro }) {
  const router = useRouter();
  const path = usePathname();
  if (soNoFinanceiro && !path.startsWith('/gestao/financeiro')) return null;
  function trocar(id) {
    document.cookie = `fin_radio=${id}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  return (
    <div className="seletor-radio" role="group" aria-label="Rádio">
      <button type="button" className={!atual ? 'ativo' : ''} onClick={() => trocar('')}>Todas as rádios</button>
      {radios.map((r) => (
        <button key={r.id} type="button" className={atual === r.id ? 'ativo' : ''} onClick={() => trocar(r.id)} style={{ '--cor': r.cor }}>
          <i />{r.nome}
        </button>
      ))}
    </div>
  );
}

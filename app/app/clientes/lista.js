'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export default function ListaClientes({ clientes, meuId }) {
  const [busca, setBusca] = useState('');
  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return clientes.filter(
      (c) => (!b || c.nome.toLowerCase().includes(b) || (c.segmento?.nome || '').toLowerCase().includes(b) || (c.cidade || '').toLowerCase().includes(b))
    );
  }, [busca, clientes]);

  return (
    <>
      <div className="campo">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, segmento ou cidade" />
      </div>
      <p className="muted" style={{ marginTop: -4 }}>{clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'} na sua carteira</p>
      {!lista.length && <div className="vazio">Nenhum cliente encontrado.</div>}
      <div className="lista">
        {lista.map((c) => (
          <Link key={c.id} href={`/app/clientes/${c.id}`} className="item">
            <div className="info">
              <div className="nome">{c.nome}</div>
              <div className="det">{c.segmento?.nome}{c.cidade ? ` · ${c.cidade}` : ''}</div>
              {c.vendedor_id !== meuId && <div className="det">{c.vendedor?.nome || 'Sem vendedor'}</div>}
            </div>
            <span className="seta">›</span>
          </Link>
        ))}
      </div>
    </>
  );
}

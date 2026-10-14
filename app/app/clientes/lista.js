'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export default function ListaClientes({ clientes, meuId }) {
  const [busca, setBusca] = useState('');
  const [soMeus, setSoMeus] = useState(false);
  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return clientes.filter(
      (c) => (!soMeus || c.vendedor_id === meuId) &&
        (!b || c.nome.toLowerCase().includes(b) || (c.segmento?.nome || '').toLowerCase().includes(b) || (c.cidade || '').toLowerCase().includes(b))
    );
  }, [busca, soMeus, clientes, meuId]);

  return (
    <>
      <div className="campo">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="🔍 Buscar por nome, segmento ou cidade" />
      </div>
      <div className="grid2" style={{ marginBottom: 14 }}>
        <button type="button" className={`btn peq ${soMeus ? 'sec' : ''}`} onClick={() => setSoMeus(false)}>Todos ({clientes.length})</button>
        <button type="button" className={`btn peq ${soMeus ? '' : 'sec'}`} onClick={() => setSoMeus(true)}>Minha carteira</button>
      </div>
      {!lista.length && <div className="vazio">Nenhum cliente encontrado.</div>}
      <div className="lista">
        {lista.map((c) => (
          <Link key={c.id} href={`/app/clientes/${c.id}`} className="item">
            <div className="info">
              <div className="nome">{c.nome}</div>
              <div className="det">{c.segmento?.nome}{c.cidade ? ` · ${c.cidade}` : ''}</div>
              <div className="det">👤 {c.vendedor_id === meuId ? 'Sua carteira' : c.vendedor?.nome || 'Sem vendedor'}</div>
            </div>
            <span className="seta">›</span>
          </Link>
        ))}
      </div>
    </>
  );
}

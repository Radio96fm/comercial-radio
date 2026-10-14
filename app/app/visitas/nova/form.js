'use client';
import { useMemo, useState } from 'react';
import { useFormState } from 'react-dom';
import { iniciarVisita } from '../../actions';
import BotaoEnviar from '@/components/BotaoEnviar';
import CamposCliente from '@/components/CamposCliente';

export default function FormNovaVisita({ clientes, segmentos, meuId, clienteInicial }) {
  const [estado, acao] = useFormState(iniciarVisita, null);
  const [modo, setModo] = useState(clientes.length && !clienteInicial ? 'existente' : clienteInicial ? 'existente' : 'novo');
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState(clienteInicial);

  const filtrados = useMemo(() => {
    const b = busca.trim().toLowerCase();
    const lista = b ? clientes.filter((c) => c.nome.toLowerCase().includes(b)) : clientes;
    return lista.slice(0, 30);
  }, [busca, clientes]);

  const escolhido = clientes.find((c) => c.id === selecionado);

  return (
    <form action={acao}>
      {estado?.erro && <div className="alerta erro">{estado.erro}</div>}

      <div className="grid2" style={{ marginBottom: 16 }}>
        <button type="button" className={`btn ${modo === 'existente' ? '' : 'sec'}`} onClick={() => setModo('existente')}>
          Cliente já cadastrado
        </button>
        <button type="button" className={`btn ${modo === 'novo' ? '' : 'sec'}`} onClick={() => { setModo('novo'); setSelecionado(''); }}>
          Cliente novo
        </button>
      </div>

      {modo === 'existente' ? (
        <div className="campo">
          <input type="hidden" name="cliente_id" value={selecionado} />
          {escolhido ? (
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{escolhido.nome}</div>
                <div className="muted">
                  {escolhido.vendedor_id === meuId ? 'Sua carteira' : `Carteira de ${escolhido.vendedor?.nome || '—'}`}
                </div>
              </div>
              <button type="button" className="btn peq cinza" onClick={() => setSelecionado('')}>Trocar</button>
            </div>
          ) : (
            <>
              <label htmlFor="busca">Procure o cliente</label>
              <input id="busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o nome..." autoComplete="off" />
              <div className="lista" style={{ marginTop: 10 }}>
                {filtrados.map((c) => (
                  <button type="button" key={c.id} className="item" style={{ border: 0, textAlign: 'left', font: 'inherit', cursor: 'pointer' }} onClick={() => setSelecionado(c.id)}>
                    <div className="info">
                      <div className="nome">{c.nome}</div>
                      <div className="det">
                        {c.cidade ? `${c.cidade} · ` : ''}
                        {c.vendedor_id === meuId ? 'Sua carteira' : `Carteira de ${c.vendedor?.nome || '—'}`}
                      </div>
                    </div>
                  </button>
                ))}
                {!filtrados.length && <div className="vazio">Nenhum cliente encontrado. Toque em “Cliente novo”.</div>}
              </div>
            </>
          )}
        </div>
      ) : (
        <CamposCliente segmentos={segmentos} prefixo="novo_" simples />
      )}

      <div className="campo">
        <label htmlFor="observacoes">Anotações (opcional)</label>
        <textarea id="observacoes" name="observacoes" placeholder="Ex.: falar com o dono, interesse no horário da manhã..." />
      </div>

      <BotaoEnviar className="btn grande verde" texto="Iniciar visita" enviando="Registrando..." disabled={modo === 'existente' && !selecionado} />
    </form>
  );
}

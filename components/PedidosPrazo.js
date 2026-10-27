import BotaoEnviar from '@/components/BotaoEnviar';
import { decidirProrrogacao } from '@/app/gestao/actions';
import { dataHora } from '@/lib/format';

// Pedidos de mais prazo dos vendedores, esperando o comercial aceitar ou recusar
export default function PedidosPrazo({ pedidos, classe = 'card' }) {
  if (!pedidos?.length) return null;
  return (
    <section className={`pedidos-prazo ${classe}`}>
      <h2>Pedidos de mais prazo ({pedidos.length})</h2>
      {pedidos.map((p) => (
        <div key={p.id} className="renovar-prazo">
          <b>{p.visita?.cliente?.nome || 'Empresa'}</b>
          <span className="muted">{p.vendedor?.nome} pediu mais 15 dias em {dataHora(p.criada_em)}</span>
          <span>Motivo: {p.motivo}</span>
          <div className="acoes">
            {['sim', 'nao'].map((a) => (
              <form key={a} action={decidirProrrogacao}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="visita_id" value={p.visita_id} />
                <input type="hidden" name="aceitar" value={a} />
                <BotaoEnviar className={`btn ${a === 'sim' ? 'verde' : 'cinza'}`} texto={a === 'sim' ? 'Aceitar' : 'Recusar'} enviando="..." />
              </form>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export const SELECT_PEDIDOS = 'id, motivo, criada_em, visita_id, vendedor:profiles!prorrogacoes_vendedor_id_fkey(nome), visita:visitas(cliente:clientes(nome))';

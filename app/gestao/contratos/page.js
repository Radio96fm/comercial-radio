import Link from 'next/link';
import { requireGestor } from '@/lib/auth';
import { data, moeda, STATUS_CONTRATO } from '@/lib/format';

const COR = { pendente: 'b-amarelo', ativo: 'b-verde', encerrado: 'b-cinza', cancelado: 'b-vermelho' };

export default async function ContratosGestao({ searchParams }) {
  const { supabase } = await requireGestor();
  const status = searchParams?.status || '';
  const vendedor = searchParams?.vendedor || '';

  let q = supabase
    .from('contratos')
    .select('id, numero, status, data_inicio, data_fim, valor_mensal, meses, cliente:clientes(nome), segmento:segmentos(nome), programa:programas(nome), radio:radios(nome), vendedor:profiles(nome)')
    .order('numero', { ascending: false })
    .limit(300);
  if (status) q = q.eq('status', status);
  if (vendedor) q = q.eq('vendedor_id', vendedor);

  const [{ data: contratos }, { data: vendedores }] = await Promise.all([
    q,
    supabase.from('profiles').select('id, nome').order('nome'),
  ]);

  return (
    <>
      <div className="cabecalho">
        <h1>Contratos</h1>
        <Link className="btn" href="/app/contratos/novo">Novo contrato</Link>
      </div>
      <form className="card form-grid" method="get">
        <div className="campo">
          <label>Situação</label>
          <select name="status" defaultValue={status}>
            <option value="">Todas</option>
            {Object.entries(STATUS_CONTRATO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="campo">
          <label>Vendedor</label>
          <select name="vendedor" defaultValue={vendedor}>
            <option value="">Todos</option>
            {(vendedores || []).map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </select>
        </div>
        <div className="campo" style={{ alignSelf: 'end' }}><button className="btn">Filtrar</button></div>
      </form>

      <div className="tabela">
        <table>
          <thead><tr><th>Nº</th><th>Cliente</th><th>Programa</th><th>Período</th><th>Valor</th><th>Vendedor</th><th>Situação</th></tr></thead>
          <tbody>
            {!contratos?.length && <tr><td colSpan={7} className="muted">Nenhum contrato.</td></tr>}
            {(contratos || []).map((c) => (
              <tr key={c.id}>
                <td><Link href={`/app/contratos/${c.id}`}><b>{c.numero}</b></Link></td>
                <td>{c.cliente?.nome}<br /><small>{c.segmento?.nome}</small></td>
                <td>{c.programa?.nome || 'Pacote avulso'}<br /><small>{c.radio?.nome}</small></td>
                <td>{data(c.data_inicio)}<br /><small>até {data(c.data_fim)}</small></td>
                <td>{moeda(c.valor_mensal)}<br /><small>{c.meses}x</small></td>
                <td>{c.vendedor?.nome}</td>
                <td><span className={`badge ${COR[c.status]}`}>{STATUS_CONTRATO[c.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

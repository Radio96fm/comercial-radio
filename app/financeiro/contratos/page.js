import { requireFinanceiro } from '@/lib/auth';
import { lerPeriodo } from '@/lib/financeiro';
import { data, moeda, STATUS_CONTRATO } from '@/lib/format';
import Filtros from '../Filtros';

const COR = { pendente: 'b-amarelo', ativo: 'b-verde', encerrado: 'b-cinza', cancelado: 'b-vermelho' };

export default async function ContratosFin({ searchParams }) {
  const { supabase } = await requireFinanceiro();
  const vend = searchParams?.vendedor || '';
  const st = searchParams?.status || '';
  const per = lerPeriodo(searchParams);
  let q = supabase.from('contratos')
    .select('id, numero, cliente_nome, status, data_inicio, data_fim, valor_mensal, meses, created_at, assinado_em, vendedor:profiles(nome), programa:programas(nome), radio:radios(nome), parcelas(status, vencimento)')
    .gte('created_at', `${per.de}T00:00:00`).lte('created_at', `${per.ate}T23:59:59`)
    .order('created_at', { ascending: false }).limit(300);
  if (vend) q = q.eq('vendedor_id', vend);
  if (st) q = q.eq('status', st);
  const [{ data: contratos }, { data: vendedores }] = await Promise.all([
    q, supabase.from('profiles').select('id, nome').in('papel', ['vendedor', 'gestor']).order('nome'),
  ]);
  const lista = contratos || [];

  return (
    <>
      <div className="cabecalho"><h1>Contratos</h1><span className="muted">{lista.length} fechados em {per.rotulo} · {moeda(lista.filter((c) => c.status !== 'cancelado').reduce((s, c) => s + Number(c.valor_mensal), 0))}/mês</span></div>
      <Filtros vendedores={vendedores || []} sp={searchParams}
        extra={<div className="campo"><label>Situação</label><select name="status" defaultValue={st}><option value="">Todas</option>{Object.entries(STATUS_CONTRATO).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></div>} />
      <div className="tabela"><table>
        <thead><tr><th>Nº</th><th>Cliente</th><th>Vendedor</th><th>Programa</th><th>Valor/mês</th><th>Período</th><th>Parcelas pagas</th><th>Situação</th></tr></thead>
        <tbody>
          {!lista.length && <tr><td colSpan={8} className="muted">Nenhum contrato.</td></tr>}
          {lista.map((c) => (
            <tr key={c.id}>
              <td><b>{c.numero}</b></td><td>{c.cliente_nome}</td><td>{c.vendedor?.nome}</td>
              <td>{c.programa?.nome || 'Avulso'}<br /><small>{c.radio?.nome}</small></td>
              <td>{moeda(c.valor_mensal)} x {c.meses}</td><td>{data(c.data_inicio)} a {data(c.data_fim)}</td>
              <td>{(c.parcelas || []).filter((p) => p.status === 'pago').length}/{(c.parcelas || []).length}</td>
              <td><span className={`badge ${COR[c.status]}`}>{STATUS_CONTRATO[c.status]}</span></td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}

import Link from 'next/link';
import { Search } from 'lucide-react';
import { requireFinanceiro } from '@/lib/auth';
import { hojeISO, moeda } from '@/lib/format';

const ABERTA = ['a_emitir', 'emitido'];
const sem = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const soma = (l) => l.reduce((s, p) => s + Number(p.valor), 0);

// Clientes com contrato: quanto pagam por mês, quanto devem e quanto está atrasado
export default async function ClientesFin({ searchParams }) {
  const { supabase, baseFin } = await requireFinanceiro();
  const hoje = hojeISO();
  const busca = String(searchParams?.busca || '').trim();
  const filtro = searchParams?.ver || '';
  const { data: contratos } = await supabase.from('contratos')
    .select('id, status, valor_mensal, cliente:clientes(id, nome, razao_social, documento, cidade, telefone), vendedor:profiles(nome), parcelas(valor, status, vencimento)')
    .neq('status', 'cancelado');

  const mapa = new Map();
  (contratos || []).forEach((c) => {
    if (!c.cliente) return;
    const k = c.cliente.id;
    if (!mapa.has(k)) mapa.set(k, { ...c.cliente, vendedores: new Set(), ativos: 0, mensal: 0, aberto: 0, atrasado: 0, qtdAtraso: 0, pago: 0 });
    const x = mapa.get(k);
    x.vendedores.add(c.vendedor?.nome);
    if (c.status === 'ativo') { x.ativos += 1; x.mensal += Number(c.valor_mensal); }
    const parc = (c.parcelas || []).filter((p) => p.status !== 'cancelado');
    const abertas = parc.filter((p) => ABERTA.includes(p.status));
    const atrasadas = abertas.filter((p) => p.vencimento < hoje);
    x.aberto += soma(abertas);
    x.atrasado += soma(atrasadas);
    x.qtdAtraso += atrasadas.length;
    x.pago += soma(parc.filter((p) => p.status === 'pago'));
  });
  let lista = [...mapa.values()];
  if (busca) {
    const b = sem(busca);
    const dig = busca.replace(/\D/g, '');
    lista = lista.filter((c) => sem(c.nome).includes(b) || sem(c.razao_social).includes(b) || (dig.length >= 3 && String(c.documento || '').replace(/\D/g, '').includes(dig)));
  }
  if (filtro === 'atraso') lista = lista.filter((c) => c.atrasado > 0);
  if (filtro === 'ativos') lista = lista.filter((c) => c.ativos > 0);
  lista.sort((a, b) => b.atrasado - a.atrasado || sem(a.nome).localeCompare(sem(b.nome)));
  const comAtraso = [...mapa.values()].filter((c) => c.atrasado > 0).length;

  return (
    <>
      <div className="cabecalho"><h1>Clientes</h1><span className="muted">{mapa.size} clientes com contrato · {comAtraso} com atraso</span></div>
      <form method="get" className="card filtros-fin">
        <div className="campo" style={{ flex: 2 }}><label>Procurar cliente</label><input name="busca" defaultValue={busca} placeholder="Nome, razão social ou CNPJ" /></div>
        <div className="campo"><label>Mostrar</label>
          <select name="ver" defaultValue={filtro}><option value="">Todos</option><option value="atraso">Só com atraso</option><option value="ativos">Só com contrato ativo</option></select>
        </div>
        <button className="btn"><Search className="ico" />Procurar</button>
      </form>
      {!lista.length ? <div className="vazio">Nenhum cliente encontrado.</div> : (
        <div className="tabela"><table>
          <thead><tr><th>Cliente</th><th>Vendedor</th><th>Por mês (ativos)</th><th>Já pagou</th><th>Em aberto</th><th>Em atraso</th></tr></thead>
          <tbody>{lista.map((c) => (
            <tr key={c.id}>
              <td><Link href={`${baseFin}/clientes/${c.id}`}><b>{c.nome}</b></Link><br /><small className="muted">{[c.documento, c.cidade].filter(Boolean).join(' · ')}</small></td>
              <td>{[...c.vendedores].filter(Boolean).join(', ')}</td>
              <td>{c.ativos ? moeda(c.mensal) : <span className="muted">sem contrato ativo</span>}</td>
              <td>{moeda(c.pago)}</td>
              <td>{moeda(c.aberto)}</td>
              <td>{c.atrasado ? <span className="badge b-vermelho">{moeda(c.atrasado)} · {c.qtdAtraso}</span> : <span className="badge b-verde">Em dia</span>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}

import Link from 'next/link';
import { requireGestor } from '@/lib/auth';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import { transferirCliente } from '../actions';

export default async function ClientesGestao({ searchParams }) {
  const { supabase } = await requireGestor();
  const busca = (searchParams?.q || '').trim();
  let q = supabase
    .from('clientes')
    .select('id, nome, cidade, telefone, vendedor_id, segmento:segmentos(nome)')
    .order('nome')
    .limit(500);
  if (busca) q = q.ilike('nome', `%${busca.replace(/[%_,()]/g, '')}%`);
  const [{ data: clientes }, { data: vendedores }] = await Promise.all([
    q,
    supabase.from('profiles').select('id, nome').eq('ativo', true).order('nome'),
  ]);

  return (
    <>
      <div className="cabecalho">
        <h1>Clientes</h1>
        <Link className="btn" href="/app/clientes/novo">Novo cliente</Link>
      </div>
      <form method="get" className="card" style={{ display: 'flex', gap: 10 }}>
        <input name="q" defaultValue={busca} placeholder="Buscar cliente pelo nome" />
        <button className="btn">Buscar</button>
      </form>
      <div className="tabela">
        <table>
          <thead><tr><th>Cliente</th><th>Segmento</th><th>Cidade</th><th>Carteira (vendedor)</th></tr></thead>
          <tbody>
            {!clientes?.length && <tr><td colSpan={4} className="muted">Nenhum cliente.</td></tr>}
            {(clientes || []).map((c) => (
              <tr key={c.id}>
                <td><Link href={`/app/clientes/${c.id}`}><b>{c.nome}</b></Link><br /><small>{c.telefone}</small></td>
                <td>{c.segmento?.nome}</td>
                <td>{c.cidade}</td>
                <td>
                  <FormAcao action={transferirCliente} style={{ display: 'flex', gap: 6 }}>
                    <input type="hidden" name="id" value={c.id} />
                    <select name="vendedor_id" defaultValue={c.vendedor_id || ''} style={{ padding: '8px 10px', fontSize: '.95rem' }}>
                      <option value="">— sem vendedor —</option>
                      {(vendedores || []).map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                    </select>
                    <BotaoEnviar className="btn peq sec" texto="OK" enviando="..." />
                  </FormAcao>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

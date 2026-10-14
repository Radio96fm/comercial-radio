import Link from 'next/link';
import { requireGestor } from '@/lib/auth';
import { dataHora } from '@/lib/format';

export default async function Atividades({ searchParams }) {
  const { supabase } = await requireGestor();
  const usuario = searchParams?.usuario || '';
  let q = supabase.from('atividades').select('id, descricao, tabela, created_at, usuario_id, usuario:profiles(nome)').order('created_at', { ascending: false }).limit(300);
  if (usuario) q = q.eq('usuario_id', usuario);
  const [{ data: atividades }, { data: usuarios }] = await Promise.all([
    q,
    supabase.from('profiles').select('id, nome').order('nome'),
  ]);

  return (
    <>
      <div className="cabecalho"><h1>Histórico de atividades</h1></div>
      <p className="muted">Tudo o que cada usuário faz no sistema fica registrado aqui, com nome, data e hora.</p>
      <form method="get" className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select name="usuario" defaultValue={usuario} style={{ flex: '1 1 240px' }}>
          <option value="">Todos os usuários</option>
          {(usuarios || []).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
        <button className="btn">Filtrar</button>
        {usuario && <Link className="btn sec" href="/gestao/atividades">Limpar</Link>}
      </form>
      <div className="tabela">
        <table>
          <thead><tr><th>Quando</th><th>Quem</th><th>O que fez</th></tr></thead>
          <tbody>
            {!atividades?.length && <tr><td colSpan={3} className="muted">Nada registrado.</td></tr>}
            {(atividades || []).map((a) => (
              <tr key={a.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{dataHora(a.created_at)}</td>
                <td>{a.usuario?.nome || 'Sistema'}</td>
                <td>{a.descricao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

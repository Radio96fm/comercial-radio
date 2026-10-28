import Link from 'next/link';
import { requireDev } from '@/lib/auth';
import { dataHora } from '@/lib/format';
import { nomeTela } from '@/lib/funcoes';

const PAPEL = { gestor: 'gestor master', comercial: 'gestor comercial', financeiro: 'financeiro', vendedor: 'vendedor' };

// Tudo o que acontece no sistema: quem entrou, que tela abriu e o que fez
export default async function Movimento({ searchParams }) {
  const { supabase } = await requireDev();
  const usuario = searchParams?.usuario || '';
  const tipo = ['acessos', 'acoes'].includes(searchParams?.tipo) ? searchParams.tipo : '';

  let qa = supabase.from('acessos_log').select('id, evento, caminho, created_at, usuario_id').order('created_at', { ascending: false }).limit(300);
  let qb = supabase.from('atividades').select('id, descricao, created_at, usuario_id').order('created_at', { ascending: false }).limit(300);
  if (usuario) { qa = qa.eq('usuario_id', usuario); qb = qb.eq('usuario_id', usuario); }
  const [{ data: acessos, error }, { data: acoes }, { data: usuarios }] = await Promise.all([
    tipo === 'acoes' ? { data: [] } : qa,
    tipo === 'acessos' ? { data: [] } : qb,
    supabase.from('profiles').select('id, nome, papel').order('nome'),
  ]);
  const pessoa = Object.fromEntries((usuarios || []).map((u) => [u.id, u]));

  const linhas = [
    ...(acessos || []).map((a) => ({ k: `a${a.id}`, quando: a.created_at, quem: a.usuario_id, tipo: a.evento === 'login' ? 'login' : 'tela', texto: a.evento === 'login' ? 'Entrou no sistema' : `Abriu ${nomeTela(a.caminho)}` })),
    ...(acoes || []).map((a) => ({ k: `b${a.id}`, quando: a.created_at, quem: a.usuario_id, tipo: 'acao', texto: a.descricao })),
  ].sort((x, y) => (x.quando < y.quando ? 1 : -1)).slice(0, 400);

  return (
    <>
      <div className="cabecalho"><h1>Movimento</h1><span className="muted">Quem entrou, o que abriu e o que fez</span></div>
      {error && <div className="alerta erro">Falta rodar o arquivo migracao-painel-dev.sql no Supabase para registrar os acessos.</div>}
      <form method="get" className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select name="usuario" defaultValue={usuario} style={{ flex: '1 1 240px' }}>
          <option value="">Todas as pessoas</option>
          {(usuarios || []).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
        <select name="tipo" defaultValue={tipo} style={{ flex: '1 1 200px' }}>
          <option value="">Acessos e ações</option>
          <option value="acessos">Só acessos (entrou, abriu tela)</option>
          <option value="acoes">Só ações (cadastrou, alterou, apagou)</option>
        </select>
        <button className="btn">Filtrar</button>
        {(usuario || tipo) && <Link className="btn sec" href="/dev/movimento">Limpar</Link>}
      </form>
      <div className="tabela">
        <table>
          <thead><tr><th>Quando</th><th>Quem</th><th>O que</th></tr></thead>
          <tbody>
            {!linhas.length && <tr><td colSpan={3} className="muted">Nada registrado ainda.</td></tr>}
            {linhas.map((l) => (
              <tr key={l.k}>
                <td style={{ whiteSpace: 'nowrap' }}>{dataHora(l.quando)}</td>
                <td>{pessoa[l.quem]?.nome || 'Sistema'} {pessoa[l.quem] && <small className="muted">({PAPEL[pessoa[l.quem].papel] || pessoa[l.quem].papel})</small>}</td>
                <td>
                  <span className={`badge ${l.tipo === 'acao' ? 'b-amarelo' : l.tipo === 'login' ? 'b-verde' : 'b-cinza'}`}>{l.tipo === 'acao' ? 'ação' : l.tipo === 'login' ? 'login' : 'tela'}</span>{' '}
                  {l.texto}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

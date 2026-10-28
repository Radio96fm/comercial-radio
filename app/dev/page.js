import Link from 'next/link';
import { Handshake, Hourglass, FileText, KeyRound, Radio as Online, UserPlus, Activity } from 'lucide-react';
import { requireDev } from '@/lib/auth';
import { dataHora, tempoDesde } from '@/lib/format';
import { nomeTela } from '@/lib/funcoes';
import LinkCadastro from './LinkCadastro';

const PAPEL = { gestor: 'gestor master', comercial: 'gestor comercial', financeiro: 'financeiro', vendedor: 'vendedor' };

function Kpi({ Ico, titulo, valor, rotulo, href }) {
  return (
    <Link href={href} className="kpi" style={{ color: 'inherit' }}>
      <div className="kpi-topo">{titulo}<Ico className="ico" /></div>
      <div className="valor">{valor}</div>
      <div className="rotulo">{rotulo}</div>
    </Link>
  );
}

export default async function PainelDev() {
  const { supabase, perfil } = await requireDev();
  const [{ data: reps }, { data: contratos }, { data: usuarios }, { data: acessos }, { data: acoes }] = await Promise.all([
    supabase.from('representantes').select('id, profile_id'),
    supabase.from('contratos').select('id, status'),
    supabase.from('profiles').select('id, nome, email, papel, ativo, created_at, ultimo_acesso'),
    supabase.from('acessos_log').select('id, evento, caminho, created_at, usuario_id').order('created_at', { ascending: false }).limit(12),
    supabase.from('atividades').select('id, descricao, created_at, usuario_id').order('created_at', { ascending: false }).limit(12),
  ]);
  const lista = reps || [];
  const comAcesso = lista.filter((r) => r.profile_id).length;
  const vigentes = (contratos || []).filter((c) => ['pendente', 'ativo'].includes(c.status)).length;
  const pessoas = usuarios || [];
  const pessoa = Object.fromEntries(pessoas.map((u) => [u.id, u]));
  const ativos = pessoas.filter((u) => u.ativo);
  const agora = Date.now();
  const online = ativos.filter((u) => u.ultimo_acesso && agora - new Date(u.ultimo_acesso) < 10 * 60000 && u.id !== perfil.id);
  const novos = pessoas.filter((u) => agora - new Date(u.created_at) < 14 * 86400000 && u.id !== perfil.id)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const ultimos = [
    ...(acessos || []).map((a) => ({ k: `a${a.id}`, quando: a.created_at, quem: a.usuario_id, texto: a.evento === 'login' ? 'entrou no sistema' : `abriu ${nomeTela(a.caminho)}` })),
    ...(acoes || []).map((a) => ({ k: `b${a.id}`, quando: a.created_at, quem: a.usuario_id, texto: a.descricao })),
  ].sort((x, y) => (x.quando < y.quando ? 1 : -1)).slice(0, 12);

  return (
    <>
      <div className="cabecalho">
        <h1>Painel do desenvolvedor</h1>
        <span className="muted">Olá, {perfil.nome.split(' ')[0]}. Acessos, movimento e configurações do sistema.</span>
      </div>

      <div className="kpis">
        <Kpi Ico={Online} titulo="No sistema agora" valor={online.length} rotulo="nos últimos 10 minutos" href="/dev/movimento" />
        <Kpi Ico={KeyRound} titulo="Acessos ativos" valor={ativos.length} rotulo="logins liberados" href="/dev/acessos" />
        <Kpi Ico={Handshake} titulo="Vendedores e agências" valor={lista.length} rotulo={`${comAcesso} com acesso`} href="/dev/vendedores" />
        <Kpi Ico={Hourglass} titulo="Aguardando cadastro" valor={lista.length - comAcesso} rotulo="ainda sem login" href="/dev/vendedores" />
        <Kpi Ico={FileText} titulo="Contratos vigentes" valor={vigentes} rotulo={`${(contratos || []).length} no total`} href="/dev/movimento?tipo=acoes" />
      </div>

      <div className="form-grid">
        <div className="card">
          <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Online className="ico" />No sistema agora</h2>
          {online.length === 0 ? <p className="muted">Ninguém além de você.</p> : (
            <div className="agora-lista">
              {online.map((u) => <Link key={u.id} className="badge b-verde" href={`/dev/movimento?usuario=${u.id}`}>{u.nome} · {tempoDesde(u.ultimo_acesso)}</Link>)}
            </div>
          )}
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UserPlus className="ico" />Cadastros novos</h2>
          {novos.length === 0 ? <p className="muted">Nenhum nas últimas 2 semanas.</p> : (
            <div className="lista">
              {novos.map((u) => (
                <Link key={u.id} href="/dev/acessos" style={{ color: 'inherit' }}>
                  <b>{u.nome}</b> <small className="muted">{PAPEL[u.papel] || u.papel} · {u.email} · {dataHora(u.created_at)}</small>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Activity className="ico" />Últimos movimentos</h2>
          {ultimos.length === 0 ? <p className="muted">Nada registrado ainda.</p> : (
            <div className="lista">
              {ultimos.map((l) => (
                <div key={l.k}><small className="muted">{dataHora(l.quando)}</small><br /><b>{pessoa[l.quem]?.nome || 'Sistema'}</b> {l.texto}</div>
              ))}
            </div>
          )}
          <div className="acoes" style={{ marginTop: 12 }}><Link className="btn sec" href="/dev/movimento">Ver tudo</Link></div>
        </div>
      </div>

      <LinkCadastro supabase={supabase} />
    </>
  );
}

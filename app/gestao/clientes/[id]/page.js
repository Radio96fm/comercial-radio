import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireGestor } from '@/lib/auth';
import { data, dataHora, moeda, STATUS_CONTRATO, STATUS_VISITA } from '@/lib/format';

// Cliente visto pelo gestor: só leitura, sem as ações do vendedor
export default async function ClienteGestor({ params }) {
  const { supabase } = await requireGestor();
  const { data: c } = await supabase.from('clientes')
    .select('*, segmento:segmentos(nome), vendedor:profiles!clientes_vendedor_id_fkey(nome)')
    .eq('id', params.id).maybeSingle();
  if (!c) notFound();
  const [{ data: contratos }, { data: visitas }, { data: testemunhais }] = await Promise.all([
    supabase.from('contratos').select('id, numero, status, data_fim, valor_mensal, programa:programas(nome), vendedor:profiles(nome)').eq('cliente_id', c.id).order('created_at', { ascending: false }),
    supabase.from('visitas').select('id, status, iniciada_em, vendedor:profiles(nome)').eq('cliente_id', c.id).order('iniciada_em', { ascending: false }).limit(20),
    supabase.from('testemunhais').select('id, texto, created_at').eq('cliente_id', c.id).order('created_at', { ascending: false }),
  ]);
  const campos = [['Razão social', c.razao_social], ['CNPJ/CPF', c.documento], ['Contato', c.contato_nome], ['Telefone', c.telefone], ['E-mail', c.email], ['Endereço', [c.endereco, c.bairro, c.cidade].filter(Boolean).join(', ')], ['Observações', c.observacoes]].filter(([, v]) => v);

  return (
    <>
      <div className="cabecalho"><h1>{c.nome}</h1><span className="muted">Carteira de {c.vendedor?.nome || '—'}</span></div>
      <div className="card" style={{ maxWidth: 760 }}>
        <p className="muted" style={{ marginTop: 0 }}>{c.segmento?.nome}</p>
        {campos.map(([k, v]) => <p key={k} style={{ margin: '4px 0' }}><span className="muted">{k}:</span> {v}</p>)}
      </div>
      <div className="secao-titulo"><h2>Contratos</h2></div>
      {!contratos?.length ? <div className="vazio">Nenhum contrato.</div> : (
        <div className="lista" style={{ maxWidth: 760 }}>
          {contratos.map((k) => (
            <Link key={k.id} href={`/app/contratos/${k.id}`} className="item">
              <div className="info"><div className="nome">Nº {k.numero} · {k.programa?.nome || 'Pacote avulso'}</div><div className="det">{k.vendedor?.nome} · {moeda(k.valor_mensal)}/mês · até {data(k.data_fim)}</div></div>
              <span className="badge b-cinza">{STATUS_CONTRATO[k.status]}</span>
            </Link>
          ))}
        </div>
      )}
      <div className="secao-titulo"><h2>Visitas</h2></div>
      {!visitas?.length ? <div className="vazio">Nenhuma visita.</div> : (
        <div className="lista" style={{ maxWidth: 760 }}>
          {visitas.map((v) => (
            <Link key={v.id} href={`/gestao/visitas/${v.id}`} className="item">
              <div className="info"><div className="nome">{v.vendedor?.nome}</div><div className="det">{dataHora(v.iniciada_em)}</div></div>
              <span className="badge b-cinza">{STATUS_VISITA[v.status]}</span>
            </Link>
          ))}
        </div>
      )}
      {!!testemunhais?.length && (
        <>
          <div className="secao-titulo"><h2>Testemunhais</h2></div>
          {testemunhais.map((t) => <div key={t.id} className="card" style={{ maxWidth: 760 }}><small className="muted">{data(t.created_at)}</small><p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{t.texto}</p></div>)}
        </>
      )}
    </>
  );
}

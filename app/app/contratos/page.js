import Link from 'next/link';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import { data, moeda, STATUS_CONTRATO } from '@/lib/format';

const COR = { pendente: 'b-amarelo', ativo: 'b-verde', encerrado: 'b-cinza', cancelado: 'b-vermelho' };

export default async function Contratos() {
  const { supabase, perfil } = await getSessao();
  const { data: contratos } = await supabase
    .from('contratos')
    .select('id, numero, status, data_inicio, data_fim, valor_mensal, cliente:clientes(nome), programa:programas(nome), radio:radios(nome)')
    .eq('vendedor_id', perfil.id)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <>
      <Topo titulo="Meus contratos" voltar="/app/ganhos" />
      <main className="conteudo">
        <Link href="/app/contratos/novo" className="btn grande verde" style={{ marginBottom: 14 }}>Novo contrato</Link>
        {!contratos?.length && <div className="vazio">Você ainda não tem contratos.</div>}
        <div className="lista">
          {(contratos || []).map((c) => (
            <Link key={c.id} href={`/app/contratos/${c.id}`} className="item">
              <div className="info">
                <div className="nome">{c.cliente?.nome}</div>
                <div className="det">Nº {c.numero} · {c.radio?.nome} · {c.programa?.nome || 'Pacote avulso'}</div>
                <div className="det">{data(c.data_inicio)} a {data(c.data_fim)} · {moeda(c.valor_mensal)}/mês</div>
              </div>
              <span className={`badge ${COR[c.status]}`}>{STATUS_CONTRATO[c.status]}</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}

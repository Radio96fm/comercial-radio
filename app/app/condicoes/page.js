import Link from 'next/link';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import { MarcarCondicoesVistas } from '@/components/AvisoCondicoes';
import { assinatura } from '@/lib/condicoes';
import { buscarCondicoesAtivas, PERIODOS, nomePeriodo, valorNoPeriodo, temPrecoPorPeriodo } from '@/lib/periodo';
import { moeda } from '@/lib/format';
import { Sparkles } from 'lucide-react';

function validade(c) {
  if (!c.expira_em) return null;
  const d = new Date(c.expira_em);
  return `Válida até ${d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })}`;
}

export default async function Condicoes() {
  const { supabase } = await getSessao();
  const { data } = await buscarCondicoesAtivas(supabase);
  const condicoes = data || [];
  const ids = [...new Set(condicoes.map((c) => c.programa?.id).filter(Boolean))];
  const { data: planos } = ids.length
    ? await supabase.from('programa_planos').select('*').in('programa_id', ids).order('ordem')
    : { data: [] };

  return (
    <>
      <Topo titulo="Condições especiais" voltar="/app" />
      <MarcarCondicoesVistas sig={assinatura(condicoes)} />
      <main className="conteudo">
        {!condicoes.length && <div className="vazio">Nenhuma condição especial no momento.</div>}
        <div className="lista-condicoes">
          {condicoes.map((c) => {
            const pls = (planos || []).filter((x) => x.programa_id === c.programa?.id && temPrecoPorPeriodo(x));
            return (
              <div key={c.id} className="cond-card" style={{ '--cor': c.programa?.radio?.cor }}>
                <div className="radio"><span className="bolinha" style={{ background: c.programa?.radio?.cor }} />{c.programa?.radio?.nome}</div>
                <b className="prog">{c.programa?.nome}</b>
                <p className="texto"><Sparkles size={16} className="ico" />{c.texto}</p>
                {pls.map((x) => (
                  <div key={x.id} className="tabela-periodo">
                    {pls.length > 1 && <small>{x.nome}</small>}
                    <div className="linha">
                      {PERIODOS.map((m) => <div key={m}><span>{nomePeriodo(m)}</span><b>{moeda(valorNoPeriodo(x, m))}</b></div>)}
                    </div>
                  </div>
                ))}
                <div className="rodape">
                  <span className="muted">{validade(c)}</span>
                  <Link href={`/app/programa/${c.programa?.id}`} className="btn peq cinza">Ver programa</Link>
                </div>
              </div>
            );
          })}
        </div>
        <Link href="/app" className="btn grande" style={{ marginTop: 18 }}>Entendi, fechar</Link>
      </main>
    </>
  );
}

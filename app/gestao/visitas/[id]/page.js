import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireGestor } from '@/lib/auth';
import BotaoEnviar from '@/components/BotaoEnviar';
import { liberarVisita } from '../../actions';
import { dataHora, STATUS_VISITA } from '@/lib/format';
import { prazoVisita, textoRestam, PRAZO_DIAS } from '@/lib/prazo';

// Visita vista pelo gestor: só leitura, sem as ações do vendedor
export default async function VisitaGestor({ params }) {
  const { supabase } = await requireGestor();
  const { data: v } = await supabase
    .from('visitas')
    .select('*, cliente:clientes(id, nome, cidade, contato_nome, telefone, segmento:segmentos(nome)), vendedor:profiles(nome)')
    .eq('id', params.id).maybeSingle();
  if (!v) notFound();
  const { data: liberada } = await supabase.from('visitas_liberadas').select('liberada_em').eq('visita_id', v.id).maybeSingle();
  const aberta = ['em_andamento', 'proposta', 'fechado'].includes(v.status);
  const p = prazoVisita(v.iniciada_em);
  const travada = aberta && !liberada && !p.vencido;

  return (
    <>
      <div className="cabecalho">
        <h1>Visita · {v.cliente?.nome}</h1>
        <span className="badge b-azul">{STATUS_VISITA[v.status]}</span>
      </div>
      <div className="card" style={{ maxWidth: 760 }}>
        <p style={{ marginTop: 0 }}>Vendedor: <b>{v.vendedor?.nome}</b> · iniciada em {dataHora(v.iniciada_em)}</p>
        <p className="muted">{v.cliente?.segmento?.nome}{v.cliente?.cidade ? ` · ${v.cliente.cidade}` : ''}{v.cliente?.contato_nome ? ` · contato: ${v.cliente.contato_nome}` : ''}</p>
        <div className={`prazo-visita ${!travada ? 'fim' : p.avisar ? 'alerta-p' : ''}`}>
          <b>{liberada ? 'Exclusividade liberada pelo gestor' : !aberta ? 'Visita encerrada' : p.vencido ? 'Prazo de exclusividade encerrado' : `Exclusividade: ${textoRestam(p.restam)} (até ${p.ate})`}</b>
          <span>{travada ? `Nenhum outro vendedor consegue visitar ou vender para esta empresa até o fim dos ${PRAZO_DIAS} dias.` : 'A empresa está livre para os outros vendedores (a menos que tenha contrato ativo).'}</span>
        </div>
        {v.observacoes && <><h3>Anotações do vendedor</h3><p style={{ whiteSpace: 'pre-wrap' }}>{v.observacoes}</p></>}
        <div className="acoes" style={{ marginTop: 14 }}>
          {v.cliente?.id && <Link className="btn sec" href={`/gestao/clientes/${v.cliente.id}`}>Ver cliente</Link>}
          {travada && (
            <form action={liberarVisita}>
              <input type="hidden" name="id" value={v.id} />
              <BotaoEnviar className="btn cinza" texto="Liberar empresa agora" enviando="..." confirmar="Liberar esta empresa para os outros vendedores?" />
            </form>
          )}
        </div>
      </div>
    </>
  );
}

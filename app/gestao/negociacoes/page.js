import Link from 'next/link';
import { requireGestor } from '@/lib/auth';
import BotaoEnviar from '@/components/BotaoEnviar';
import { liberarVisita } from '../actions';
import { STATUS_VISITA, dataHora } from '@/lib/format';
import { PRAZO_DIAS, prazoVisita, textoRestam } from '@/lib/prazo';
import PedidosPrazo, { SELECT_PEDIDOS } from '@/components/PedidosPrazo';

export default async function Negociacoes() {
  const { supabase } = await requireGestor();
  const [{ data: visitas }, { data: liberadas }, { data: pedidos }] = await Promise.all([
    supabase.from('visitas').select('id, status, iniciada_em, prazo_extra_dias, cliente:clientes(id, nome, cidade), vendedor:profiles(nome)')
      .in('status', ['em_andamento', 'proposta', 'fechado'])
      .gt('iniciada_em', new Date(Date.now() - (PRAZO_DIAS + 30) * 86400000).toISOString())
      .order('iniciada_em'),
    supabase.from('visitas_liberadas').select('visita_id'),
    supabase.from('prorrogacoes').select(SELECT_PEDIDOS).eq('status', 'pendente').order('criada_em'),
  ]);
  const livres = new Set((liberadas || []).map((l) => l.visita_id));
  const travas = (visitas || []).filter((v) => !livres.has(v.id));

  return (
    <>
      <div className="cabecalho"><h1>Negociações em andamento</h1><span className="muted">{travas.length}</span></div>
      <PedidosPrazo pedidos={pedidos} />
      <p className="muted">
        Quem inicia a visita tem <b>{PRAZO_DIAS} dias</b> de exclusividade com a empresa. Nesse prazo, outro vendedor não consegue visitar nem cadastrar a mesma empresa.
        Com {5} dias para acabar, o vendedor recebe um aviso no app. Quando o prazo acaba, ele pode pedir mais 15 dias, e o pedido aparece aqui para você aceitar ou recusar. Se precisar, libere a empresa antes do prazo.
      </p>
      {!travas.length ? <div className="vazio">Nenhuma empresa travada agora.</div> : (
        <div className="lista">
          {travas.map((v) => {
            const p = prazoVisita(v.iniciada_em, v.prazo_extra_dias);
            return (
              <div key={v.id} className="item">
                <div className="info">
                  <div className="nome">{v.cliente?.nome}</div>
                  <div className="det">{v.vendedor?.nome} · visita em {dataHora(v.iniciada_em)} · {STATUS_VISITA[v.status]}</div>
                  <div className={`det prazo-linha ${p.avisar ? 'alerta-p' : ''}`}>{textoRestam(p.restam)} (até {p.ate})</div>
                </div>
                <form action={liberarVisita}>
                  <input type="hidden" name="id" value={v.id} />
                  <BotaoEnviar className="btn peq cinza" texto="Liberar empresa" enviando="..." confirmar={`Liberar ${v.cliente?.nome} para os outros vendedores agora?`} />
                </form>
              </div>
            );
          })}
        </div>
      )}
      <p className="muted" style={{ marginTop: 14, fontSize: '.88rem' }}>
        Depois do prazo, a empresa sem contrato fica livre: o primeiro vendedor que iniciar uma visita leva para a carteira dele. Empresa com contrato ativo continua com o vendedor do contrato.
      </p>
      <Link href="/gestao/clientes" className="btn sec" style={{ marginTop: 10 }}>Ver todos os clientes</Link>
    </>
  );
}

import { notFound } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import BotaoEnviar from '@/components/BotaoEnviar';
import BotaoImprimir from '@/components/BotaoImprimir';
import { mudarStatusContrato } from '../../actions';
import { data, moeda, linkWhatsApp, STATUS_CONTRATO, STATUS_PARCELA } from '@/lib/format';

const COR = { pendente: 'b-amarelo', ativo: 'b-verde', encerrado: 'b-cinza', cancelado: 'b-vermelho' };

export default async function ContratoPage({ params, searchParams }) {
  const { supabase, perfil, isGestor } = await getSessao();
  const { data: c } = await supabase
    .from('contratos')
    .select('*, cliente:clientes(nome, telefone, contato_nome), programa:programas(nome, radio:radios(nome)), segmento:segmentos(nome), vendedor:profiles(nome)')
    .eq('id', params.id)
    .maybeSingle();
  if (!c) notFound();
  const { data: parcelas } = await supabase.from('parcelas').select('*').eq('contrato_id', c.id).order('numero');

  const dono = c.vendedor_id === perfil.id;
  const podeMudar = isGestor || (dono && c.status === 'pendente');
  const msgWhats =
    `Olá${c.cliente?.contato_nome ? ' ' + c.cliente.contato_nome : ''}! Segue o resumo do contrato nº ${c.numero} com a ${c.programa?.radio?.nome}:\n` +
    `• Programa: ${c.programa?.nome}\n• Período: ${data(c.data_inicio)} a ${data(c.data_fim)}\n` +
    `• Valor: ${moeda(c.valor_mensal)}/mês (${c.meses}x)\n\nQualquer dúvida, estou à disposição. ${c.vendedor?.nome}`;

  const Status = ({ status, texto, classe, confirmar }) => (
    <form action={mudarStatusContrato}>
      <input type="hidden" name="id" value={c.id} />
      <input type="hidden" name="status" value={status} />
      <BotaoEnviar className={`btn ${classe}`} texto={texto} enviando="..." confirmar={confirmar} />
    </form>
  );

  return (
    <>
      <Topo titulo={`Contrato nº ${c.numero}`} voltar="/app/contratos" />
      <main className="conteudo">
        {searchParams?.novo && <div className="alerta ok nao-imprimir">Contrato criado! A vaga já está reservada.</div>}
        {searchParams?.erro && <div className="alerta erro nao-imprimir">{searchParams.erro}</div>}

        <div className="card nao-imprimir">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <h1 style={{ marginBottom: 2 }}>{c.cliente?.nome}</h1>
              <div className="muted">{c.programa?.radio?.nome} · {c.programa?.nome} · {c.segmento?.nome}</div>
            </div>
            <span className={`badge ${COR[c.status]}`}>{STATUS_CONTRATO[c.status]}</span>
          </div>
          <div className="grid2" style={{ marginTop: 12 }}>
            <div><div className="muted">Período</div><b>{data(c.data_inicio)} a {data(c.data_fim)}</b></div>
            <div><div className="muted">Valor</div><b>{moeda(c.valor_mensal)} × {c.meses}</b></div>
          </div>
          <p style={{ marginTop: 10 }}>Vendedor: <b>{dono ? 'você' : c.vendedor?.nome}</b></p>
        </div>

        <div className="acoes nao-imprimir" style={{ marginBottom: 14 }}>
          <BotaoImprimir />
          <a className="btn whats" href={linkWhatsApp(c.cliente?.telefone, msgWhats)} target="_blank" rel="noopener noreferrer">Enviar no WhatsApp</a>
        </div>

        {podeMudar && (
          <div className="acoes nao-imprimir" style={{ marginBottom: 14 }}>
            {c.status === 'pendente' && <Status status="ativo" texto="Cliente assinou (ativar)" classe="verde" />}
            {(c.status === 'pendente' || (isGestor && c.status === 'ativo')) && (
              <Status status="cancelado" texto="Cancelar contrato" classe="cinza" confirmar="Cancelar este contrato? A vaga será liberada." />
            )}
            {isGestor && c.status === 'ativo' && <Status status="encerrado" texto="Encerrar" classe="cinza" confirmar="Encerrar este contrato?" />}
            {isGestor && (c.status === 'cancelado' || c.status === 'encerrado') && <Status status="ativo" texto="Reativar" classe="sec" />}
          </div>
        )}

        <div className="secao-titulo nao-imprimir"><h2>Parcelas / boletos</h2></div>
        <div className="tabela nao-imprimir">
          <table>
            <thead><tr><th>#</th><th>Vencimento</th><th>Valor</th><th>Situação</th></tr></thead>
            <tbody>
              {(parcelas || []).map((p) => (
                <tr key={p.id}>
                  <td>{p.numero}</td>
                  <td>{data(p.vencimento)}</td>
                  <td>{moeda(p.valor)}</td>
                  <td>
                    {p.url_boleto ? <a href={p.url_boleto} target="_blank" rel="noopener noreferrer">Ver boleto</a> : STATUS_PARCELA[p.status]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="alerta info nao-imprimir">
          Emissão automática de boletos: será ativada quando a integração com o banco for configurada. Por enquanto, o financeiro emite a partir desta lista.
        </div>

        <div className="secao-titulo nao-imprimir"><h2>Texto do contrato</h2></div>
        {c.conteudo_gerado ? (
          <div className="contrato-texto">{c.conteudo_gerado}</div>
        ) : (
          <div className="vazio">Contrato sem texto (não havia modelo ativo quando foi criado).</div>
        )}
      </main>
    </>
  );
}

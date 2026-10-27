import { notFound } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import BotaoEnviar from '@/components/BotaoEnviar';
import { FileDown, FileText, Mail, PenTool, CheckCircle2, Clock3 } from 'lucide-react';
import CopiarTexto from '@/components/CopiarTexto';
import { mudarStatusContrato, enviarParaAssinatura, reenviarEmailAssinatura } from '../../actions';
import { configAutentique, situacaoDocumento, marcarAssinado } from '@/lib/autentique';
import { SELECT_CONTRATO } from '@/lib/pdfGerar';
import { data, moeda, linkWhatsApp, STATUS_CONTRATO, STATUS_PARCELA } from '@/lib/format';

const COR = { pendente: 'b-amarelo', ativo: 'b-verde', encerrado: 'b-cinza', cancelado: 'b-vermelho' };

export default async function ContratoPage({ params, searchParams }) {
  const { supabase, perfil, isGestor } = await getSessao();
  const { data: c } = await supabase.from('contratos').select(SELECT_CONTRATO).eq('id', params.id).maybeSingle();
  if (!c) notFound();

  // assinatura digital: confere na Autentique se o cliente já assinou
  let assinatura = null;
  if (c.autentique_id && (c.status === 'pendente' || c.status === 'ativo')) {
    try {
      const cfg = await configAutentique();
      if (cfg?.token) assinatura = await situacaoDocumento(cfg.token, c.autentique_id, c.autentique_assinatura);
      if (assinatura?.assinado && c.status === 'pendente') {
        await marcarAssinado(c.autentique_id);
        c.status = 'ativo';
        c.assinado_em = new Date().toISOString();
      }
    } catch { /* sem conexão com a Autentique: mostra o que já sabemos */ }
  }
  const [{ data: parcelas }, { data: itens }] = await Promise.all([
    supabase.from('parcelas').select('*').eq('contrato_id', c.id).order('numero'),
    supabase.from('contrato_itens').select('*').eq('contrato_id', c.id).order('created_at'),
  ]);
  const produto = c.programa?.nome || 'Pacote avulso';

  const dono = c.vendedor_id === perfil.id;
  const podeMudar = isGestor || (dono && c.status === 'pendente');
  const nome = (c.cliente?.contato_nome || '').trim().split(' ')[0];
  const msgAssinar = c.assinatura_link
    ? `Olá${nome ? `, ${nome}` : ''}! Encaminhei${c.cliente?.email ? ` para o seu e-mail (${c.cliente.email})` : ''} o link para a assinatura do contrato da ${c.radio?.nome || 'rádio'}. Caso não tenha recebido, ou para facilitar, estou enviando por aqui também:\n\n${c.assinatura_link}\n\nA assinatura é digital, leva menos de um minuto. Qualquer dúvida, estou à disposição!`
    : null;

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
        {searchParams?.novo && (
          <div className="alerta ok nao-imprimir">Contrato gerado! Confira o contrato pronto e depois envie para o cliente assinar.</div>
        )}
        {searchParams?.erro && <div className="alerta erro nao-imprimir">{searchParams.erro}</div>}
        {searchParams?.enviado && (
          <div className="alerta ok nao-imprimir">
            Enviado para assinatura! {c.cliente?.email ? `O cliente recebe por e-mail (${c.cliente.email}).` : ''} Mande também pelo WhatsApp no botão abaixo.
          </div>
        )}

        <div className="card nao-imprimir">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <h1 style={{ marginBottom: 2 }}>{c.cliente?.nome}</h1>
              <div className="muted">{c.radio?.nome} · {produto}{c.plano ? ` (${c.plano.nome})` : ''} · {c.segmento?.nome}</div>
            </div>
            <span className={`badge ${COR[c.status]}`}>{STATUS_CONTRATO[c.status]}</span>
          </div>
          <div className="grid2" style={{ marginTop: 12 }}>
            <div><div className="muted">Período</div><b>{data(c.data_inicio)} a {data(c.data_fim)}</b></div>
            <div><div className="muted">Valor</div><b>{moeda(c.valor_mensal)} × {c.meses}</b></div>
          </div>
          {c.descricao_produto && <p className="muted" style={{ margin: '10px 0 0', whiteSpace: 'pre-line' }}>{c.descricao_produto}</p>}
        </div>

        <div className="acoes nao-imprimir" style={{ marginBottom: 14 }}>
          <a className="btn grande sec" href={`/app/contratos/${c.id}/pdf`} target="_blank" rel="noopener noreferrer"><FileText className="ico" /> Ver contrato pronto</a>
          <a className="btn cinza" href={`/app/contratos/${c.id}/pdf?baixar=1`}><FileDown className="ico" /> Baixar PDF</a>
        </div>

        {/* ------- assinatura digital ------- */}
        <div className={`assinatura-card nao-imprimir ${c.assinado_em || c.status === 'ativo' ? 'ok' : ''}`}>
          {c.status === 'ativo' && c.autentique_id ? (
            <>
              <div className="topo-a"><CheckCircle2 className="ico" /><div><b>Contrato assinado pelo cliente</b>{c.assinado_em && <small>em {data(c.assinado_em.slice(0, 10))}</small>}</div></div>
              {assinatura?.pdfAssinado && <a className="btn sec" href={assinatura.pdfAssinado} target="_blank" rel="noopener noreferrer">Baixar contrato assinado</a>}
            </>
          ) : c.status === 'pendente' && c.autentique_id ? (
            <>
              <div className="topo-a"><Clock3 className="ico" /><div><b>Aguardando o cliente assinar</b><small>Enviado em {data(c.assinatura_enviada_em?.slice(0, 10))}{c.cliente?.email ? ` · e-mail ${c.cliente.email}` : ''}</small></div></div>
              {assinatura?.email && (
                <div className={`email-status ${assinatura.emailEventos?.recusado || assinatura.emailDoDono ? 'erro' : ''}`}>
                  {assinatura.emailDoDono
                    ? <>A Autentique não manda e-mail para o mesmo e-mail da conta da rádio ({assinatura.email}). Para testar, use um cliente com outro e-mail. O link no WhatsApp funciona normalmente.</>
                    : assinatura.emailEventos?.recusado
                      ? <>O e-mail para {assinatura.email} não foi entregue{assinatura.emailEventos.motivo ? ` (${assinatura.emailEventos.motivo})` : ''}. Confira o e-mail do cliente ou mande pelo WhatsApp.</>
                      : assinatura.emailEventos?.aberto
                        ? <>E-mail aberto pelo cliente ✓</>
                        : assinatura.emailEventos?.entregue
                          ? <>E-mail entregue em {assinatura.email}. Se não achar, peça para olhar no spam/lixo eletrônico.</>
                          : assinatura.emailEventos?.enviado
                            ? <>E-mail enviado para {assinatura.email}. Se não chegar, peça para olhar no spam.</>
                            : <>O e-mail para {assinatura.email} ainda está na fila da Autentique.</>}
                </div>
              )}
              {assinatura?.recusado && <div className="alerta erro" style={{ margin: '10px 0 0' }}>O cliente recusou a assinatura. Fale com ele e, se precisar, cancele e crie um novo contrato.</div>}
              {c.assinatura_link && (
                <>
                  <a className="btn grande whats" style={{ marginTop: 12 }} href={linkWhatsApp(c.cliente?.telefone, msgAssinar)} target="_blank" rel="noopener noreferrer">Enviar pelo WhatsApp</a>
                  <div className="acoes" style={{ marginTop: 8 }}>
                    <CopiarTexto texto={c.assinatura_link} rotulo="Copiar só o link" className="btn cinza peq" />
                  </div>
                </>
              )}
              {c.cliente?.email && !assinatura?.emailDoDono && (
                <form action={reenviarEmailAssinatura} style={{ marginTop: 8 }}>
                  <input type="hidden" name="id" value={c.id} />
                  <BotaoEnviar className="btn cinza peq" texto={`Reenviar e-mail para ${c.cliente.email}`} enviando="Reenviando..." />
                </form>
              )}
              <p className="muted" style={{ margin: '10px 0 0', fontSize: '.88rem' }}>Quando o cliente assinar, o contrato fica ativo sozinho.</p>
            </>
          ) : c.status === 'pendente' && (dono || isGestor) ? (
            <>
              <div className="topo-a"><PenTool className="ico" /><div><b>Enviar para o cliente assinar</b><small>{c.cliente?.email ? `O link de assinatura vai para o e-mail cadastrado: ${c.cliente.email}. Depois você manda também pelo WhatsApp.` : 'O cliente não tem e-mail cadastrado. Você recebe o link para mandar pelo WhatsApp.'}</small></div></div>
              <form action={enviarParaAssinatura} style={{ marginTop: 12 }}>
                <input type="hidden" name="id" value={c.id} />
                <BotaoEnviar className="btn grande verde" texto={c.cliente?.email ? 'Enviar por e-mail' : 'Gerar link de assinatura'} enviando="Enviando..." />
              </form>
              <p className="muted" style={{ margin: '8px 0 0', fontSize: '.86rem' }}>Depois de enviar, aparece aqui o botão para mandar pelo WhatsApp.</p>
            </>
          ) : null}
        </div>

        {podeMudar && (
          <div className="acoes nao-imprimir" style={{ marginBottom: 14 }}>
            {(c.status === 'pendente' || (isGestor && c.status === 'ativo')) && (
              <Status status="cancelado" texto="Cancelar contrato" classe="cinza" confirmar="Cancelar este contrato? A vaga será liberada." />
            )}
            {isGestor && c.status === 'ativo' && <Status status="encerrado" texto="Encerrar" classe="cinza" confirmar="Encerrar este contrato?" />}
            {isGestor && (c.status === 'cancelado' || c.status === 'encerrado') && <Status status="ativo" texto="Reativar" classe="sec" />}
          </div>
        )}

        <details className="card nao-imprimir recolhido">
          <summary>Parcelas ({(parcelas || []).length})</summary>
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
        </details>
      </main>
    </>
  );
}

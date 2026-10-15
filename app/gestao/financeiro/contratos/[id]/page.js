import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock3, XCircle, FileText, FileCheck2, Eye, PenLine } from 'lucide-react';
import { requireFinanceiro } from '@/lib/auth';
import { configAutentique, detalhesDocumento, situacaoDocumento, marcarAssinado } from '@/lib/autentique';
import { data, dataHora, moeda, hojeISO, STATUS_CONTRATO } from '@/lib/format';
import ParcelaItem from '../../ParcelaItem';

const COR = { pendente: 'b-amarelo', ativo: 'b-verde', encerrado: 'b-cinza', cancelado: 'b-vermelho' };

// Contrato no painel financeiro: dados, assinatura na Autentique (ao vivo) e parcelas
export default async function ContratoFin({ params }) {
  const { supabase, baseFin } = await requireFinanceiro();
  const hoje = hojeISO();
  const { data: c } = await supabase.from('contratos')
    .select('id, numero, status, cliente_id, cliente_nome, data_inicio, data_fim, valor_mensal, meses, dia_vencimento, created_at, assinado_em, assinatura_enviada_em, autentique_id, autentique_assinatura, cliente:clientes(id, nome, contato_nome, telefone, email, documento), vendedor:profiles(nome), programa:programas(nome), radio:radios(nome), parcelas(id, numero, vencimento, valor, status, pago_em, url_boleto, linha_digitavel)')
    .eq('id', params.id).maybeSingle();
  if (!c) notFound();

  let doc = null;
  let erroAut = null;
  if (c.autentique_id) {
    try {
      const cfg = await configAutentique();
      if (cfg?.token) {
        doc = await detalhesDocumento(cfg.token, c.autentique_id)
          // se a consulta completa falhar, usa a consulta simples (a mesma do app)
          .catch(() => situacaoDocumento(cfg.token, c.autentique_id, c.autentique_assinatura));
      }
      if (doc?.assinado && c.status === 'pendente') {
        await marcarAssinado(c.autentique_id);
        c.status = 'ativo';
        c.assinado_em = c.assinado_em || new Date().toISOString();
      }
    } catch (e) { erroAut = e.message; }
  }
  const parcelas = (c.parcelas || []).filter((p) => p.status !== 'cancelado').sort((a, b) => a.numero - b.numero);
  const pagas = parcelas.filter((p) => p.status === 'pago');

  return (
    <>
      <Link href={`${baseFin}/contratos`} className="voltar-fin"><ArrowLeft className="ico" />Contratos</Link>
      <div className="cabecalho"><h1>Contrato Nº {c.numero}</h1><span className={`badge ${COR[c.status]}`}>{STATUS_CONTRATO[c.status]}</span></div>

      <div className="ficha-cli card">
        <div>
          <div><Link href={`${baseFin}/clientes/${c.cliente_id}`}><b>{c.cliente?.nome || c.cliente_nome}</b></Link></div>
          <div className="muted">{c.programa?.nome || 'Pacote avulso'} · {c.radio?.nome} · vendedor {c.vendedor?.nome}</div>
          <div>{moeda(c.valor_mensal)} x {c.meses} = <b>{moeda(c.valor_mensal * c.meses)}</b> · {data(c.data_inicio)} a {data(c.data_fim)} · vence dia {c.dia_vencimento}</div>
          <div className="muted">{pagas.length} de {parcelas.length} parcelas pagas</div>
        </div>
        <a className="btn sec" href={`/app/contratos/${c.id}/pdf`} target="_blank" rel="noopener noreferrer"><FileText className="ico" />Contrato em PDF</a>
      </div>

      <div className="secao-titulo"><h2>Assinatura digital (Autentique)</h2></div>
      <div className={`card assin-fin ${c.status === 'ativo' && c.autentique_id ? 'ok' : ''}`}>
        {!c.autentique_id ? (
          <div className="assin-topo"><Clock3 className="ico" /><div><b>{c.status === 'ativo' ? 'Contrato ativo sem assinatura digital' : 'Ainda não foi enviado para assinar'}</b><small>{c.status === 'ativo' ? 'Foi ativado sem passar pela Autentique (assinado em papel).' : 'O vendedor envia pelo app, na tela do contrato.'}</small></div></div>
        ) : (
          <>
            <div className="assin-topo">
              {doc?.recusado ? <XCircle className="ico perigo" /> : c.status === 'ativo' || doc?.assinado ? <CheckCircle2 className="ico" /> : <Clock3 className="ico" />}
              <div>
                <b>{doc?.recusado ? 'O cliente recusou a assinatura' : c.status === 'ativo' || doc?.assinado ? 'Assinado' : 'Aguardando assinatura'}</b>
                <small>
                  {c.assinatura_enviada_em && `Enviado em ${data(c.assinatura_enviada_em.slice(0, 10))}`}
                  {c.assinado_em && ` · assinado em ${data(c.assinado_em.slice(0, 10))}`}
                </small>
              </div>
            </div>
            {doc?.signatarios?.length > 0 && (
              <div className="signatarios">
                {doc.signatarios.map((s, i) => (
                  <div key={i} className="signatario">
                    <div><b>{s.nome || s.email}</b><small>{s.email}</small></div>
                    <div className="sig-passos">
                      <span className={s.visto ? 'ok' : ''}><Eye className="ico" />{s.visto ? `Abriu ${dataHora(s.visto)}` : 'Não abriu'}</span>
                      <span className={s.assinado ? 'ok' : s.recusado ? 'perigo' : ''}><PenLine className="ico" />{s.assinado ? `Assinou ${dataHora(s.assinado)}` : s.recusado ? `Recusou ${dataHora(s.recusado)}` : 'Não assinou'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="rel-acoes">
              {doc?.pdfAssinado && <a className="btn verde" href={doc.pdfAssinado} target="_blank" rel="noopener noreferrer"><FileCheck2 className="ico" />Ver contrato assinado</a>}
              {doc?.original && <a className="btn cinza" href={doc.original} target="_blank" rel="noopener noreferrer"><FileText className="ico" />Documento enviado</a>}
            </div>
            {erroAut && <div className="alerta aviso">Não consegui falar com a Autentique agora ({erroAut}). Mostrando o que já sabemos.</div>}
          </>
        )}
      </div>

      <div className="secao-titulo"><h2>Parcelas</h2></div>
      {!parcelas.length ? <div className="vazio">Sem parcelas.</div> : (
        <div className="lista">
          {parcelas.map((p) => <ParcelaItem key={p.id} p={{ ...p, contrato: c }} hoje={hoje} semContrato />)}
        </div>
      )}
    </>
  );
}

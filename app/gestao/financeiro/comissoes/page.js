import Link from 'next/link';
import { headers } from 'next/headers';
import { FileDown, ChevronRight, Check, CalendarRange, ArrowLeft } from 'lucide-react';
import { requireFinanceiro } from '@/lib/auth';
import BotaoEnviar from '@/components/BotaoEnviar';
import FormAcao from '@/components/FormAcao';
import { periodoComissao, comissoesNoPeriodo, fechamentos, mensagemComissao, ETAPAS_COMISSAO } from '@/lib/financeiro';
import { DIA_CORTE } from '@/lib/ganhos';
import { hojeISO, moeda, data, linkWhatsApp } from '@/lib/format';
import { pagarComissao, desfazerComissao, salvarNotaFiscal, desfazerNotaFiscal } from '../actions';
import BotaoPlanilha from '../BotaoPlanilha';
import EnviarRelatorio from './EnviarRelatorio';
import { radioAtual } from '@/lib/radio';

const pctTxt = (v) => `${String(v.pct).replace('.', ',')}%`;

export default async function Comissoes({ searchParams }) {
  const { supabase, baseFin } = await requireFinanceiro();
  const { radio } = await radioAtual(supabase);
  const R = radio?.id;
  const per = periodoComissao(searchParams);
  const vend = searchParams?.vendedor || '';
  const [{ data: vendedores }, lista] = await Promise.all([
    supabase.from('profiles').select('id, nome').in('papel', ['vendedor', 'gestor', 'comercial']).order('nome'),
    comissoesNoPeriodo(supabase, per.de, per.ate, vend || null, per.mes, R),
  ]);
  const h = headers();
  const site = `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}`;
  const qp = (extra) => new URLSearchParams({ de: per.de, ate: per.ate, ...extra }).toString();
  const pdf = (v, baixar) => `/api/comissao?${qp({ vendedor: v.id, radio: R, ...(baixar ? { baixar: '1' } : {}) })}`;
  const whats = (v) => (v.telefone ? linkWhatsApp(v.telefone, mensagemComissao(v, per, `${site}${pdf(v)}`)) : null);
  const total = lista.reduce((s, v) => s + v.comissao, 0);
  const recebido = lista.reduce((s, v) => s + v.recebido, 0);
  const previsto = lista.reduce((s, v) => s + v.previsto, 0);
  const faltam = lista.filter((v) => v.etapa !== 'paga' && v.comissao > 0);
  const atalhos = fechamentos(5, 1);
  const um = vend ? lista[0] : null;

  return (
    <>
      <div className="cabecalho">
        <h1>Comissões</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href={`${baseFin}/comissoes/contratos`} className="btn peq sec">Regra contrato por contrato</Link>
          <BotaoPlanilha href={`${baseFin}/exportar?${qp({ tipo: 'comissoes', ...(vend ? { vendedor: vend } : {}) })}`} />
        </div>
      </div>

      <div className="card filtro-com">
        <div className="atalhos-mes">
          {atalhos.map((f) => (
            <Link key={f.mes} href={`?${new URLSearchParams({ de: f.de, ate: f.ate, ...(vend ? { vendedor: vend } : {}) })}`}
              className={`chip-mes ${f.de === per.de && f.ate === per.ate ? 'ativo' : ''}`}>
              <b>{f.rotulo}{f.atual ? ' · atual' : ''}</b><small>{f.faixa}</small>
            </Link>
          ))}
        </div>
        <form method="get" className="filtros-fin">
          <div className="campo"><label>Vendedor</label>
            <select name="vendedor" defaultValue={vend}>
              <option value="">Todos os vendedores</option>
              {(vendedores || []).map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
          <div className="campo"><label>De</label><input type="date" name="de" defaultValue={per.de} /></div>
          <div className="campo"><label>Até</label><input type="date" name="ate" defaultValue={per.ate} /></div>
          <button className="btn"><CalendarRange className="ico" />Filtrar</button>
        </form>
      </div>

      <div className="com-resumo">
        <div><small>{per.rotulo}</small><b>{per.faixa}</b></div>
        <div><small>Recebido dos clientes</small><b className="num">{moeda(recebido)}</b></div>
        <div className="destaque"><small>Total de comissões</small><b className="num">{moeda(total)}</b></div>
        <div><small>Prevista (parcelas ainda não pagas)</small><b className="num">{moeda(previsto)}</b></div>
        <div><small>Falta pagar</small><b className="num">{faltam.length} vendedor{faltam.length === 1 ? '' : 'es'}</b></div>
      </div>
      {!per.mes && <div className="alerta info">Para registrar nota fiscal e pagamento, escolha um fechamento (dia 21 a dia {DIA_CORTE}) nos botões acima.</div>}

      {um ? (
        <>
          <Link href={`?${qp({})}`} className="voltar-fin"><ArrowLeft className="ico" />Todos os vendedores</Link>
          <div className="card rel-com">
            <div className="rel-topo">
              <div>
                <small className="muted">Relatório de comissão</small>
                <h2>{um.nome}</h2>
                <span className="muted">{per.faixa} · {um.itens.length} parcela{um.itens.length === 1 ? '' : 's'} paga{um.itens.length === 1 ? '' : 's'} · {moeda(um.recebido)} recebidos · {pctTxt(um)}</span>
              </div>
              <div className="rel-valor"><small>Comissão</small><b className="num">{moeda(um.comissao)}</b><span className={`badge ${ETAPAS_COMISSAO[um.etapa][1]}`}>{ETAPAS_COMISSAO[um.etapa][0]}</span></div>
            </div>

            <div className="rel-acoes">
              <a className="btn sec" href={pdf(um)} target="_blank" rel="noopener noreferrer"><FileDown className="ico" />Ver PDF</a>
              <a className="btn cinza" href={pdf(um, true)}><FileDown className="ico" />Baixar PDF</a>
              <EnviarRelatorio url={whats(um)} vendedorId={um.id} mes={per.mes} radioId={R} />
            </div>

            {per.mes && um.comissao > 0 && (
              <div className="etapas-com">
                <div className={`etapa ${um.nf?.relatorio_em || um.nf?.nf_em || um.pago ? 'feita' : 'agora'}`}>
                  <span className="n">{um.nf?.relatorio_em ? <Check /> : 1}</span>
                  <div><b>Enviar o relatório</b><small>{um.nf?.relatorio_em ? `Enviado em ${data(um.nf.relatorio_em.slice(0, 10))}` : 'Pelo botão do WhatsApp acima'}</small></div>
                </div>
                <div className={`etapa ${um.nf?.nf_em || um.pago ? 'feita' : 'agora'}`}>
                  <span className="n">{um.nf?.nf_em ? <Check /> : 2}</span>
                  <div>
                    <b>Receber a nota fiscal</b>
                    {um.nf?.nf_em ? (
                      <small>Nota {um.nf.nf_numero ? `nº ${um.nf.nf_numero} ` : ''}recebida em {data(um.nf.nf_em)}
                        {!um.pago && <form action={desfazerNotaFiscal} style={{ display: 'inline' }}><input type="hidden" name="vendedor_id" value={um.id} /><input type="hidden" name="radio_id" value={R} /><input type="hidden" name="mes" value={per.mes} /> · <button className="link-btn">desfazer</button></form>}
                      </small>
                    ) : (
                      <FormAcao action={salvarNotaFiscal} className="form-nf">
                        <input type="hidden" name="vendedor_id" value={um.id} /><input type="hidden" name="mes" value={per.mes} /><input type="hidden" name="radio_id" value={R} />
                        <input name="nf_numero" placeholder="Número da nota" />
                        <input type="date" name="nf_em" defaultValue={hojeISO()} aria-label="Data da nota" />
                        <BotaoEnviar className="btn peq" texto="Nota recebida" enviando="..." />
                      </FormAcao>
                    )}
                  </div>
                </div>
                <div className={`etapa ${um.pago ? 'feita' : um.nf?.nf_em ? 'agora' : ''}`}>
                  <span className="n">{um.pago ? <Check /> : 3}</span>
                  <div>
                    <b>Pagar a comissão</b>
                    {um.pago ? (
                      <small>Paga em {data(um.pago.pago_em)} · {moeda(um.pago.valor)}
                        <form action={desfazerComissao} style={{ display: 'inline' }}><input type="hidden" name="id" value={um.pago.id} /> · <button className="link-btn">desfazer</button></form>
                      </small>
                    ) : (
                      <form action={pagarComissao} style={{ marginTop: 6 }}>
                        <input type="hidden" name="vendedor_id" value={um.id} /><input type="hidden" name="mes" value={per.mes} /><input type="hidden" name="radio_id" value={R} /><input type="hidden" name="valor" value={um.comissao.toFixed(2)} />
                        <BotaoEnviar className="btn peq verde" texto={`Marcar ${moeda(um.comissao)} como pago`} enviando="..." confirmar={`Confirmar pagamento de ${moeda(um.comissao)} para ${um.nome}?`} />
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!um.itens.length ? <div className="vazio">Nenhuma parcela paga neste período.</div> : (
              <div className="tabela"><table>
                <thead><tr><th>Cliente</th><th>Contrato</th><th>Parcela</th><th>Pago em</th><th>Valor recebido</th><th>Comissão</th></tr></thead>
                <tbody>
                  {um.itens.map((p) => (
                    <tr key={p.id}><td>{p.contrato.cliente_nome}</td><td>Nº {p.contrato.numero}</td><td>{p.numero}ª{p.contrato.meses ? ` de ${p.contrato.meses}` : ''}</td><td>{data(p.pago_em)}</td><td>{moeda(p.valor)}</td><td><b>{moeda(p.comissao)}</b></td></tr>
                  ))}
                  <tr className="linha-total"><td colSpan={4}>Total</td><td>{moeda(um.recebido)}</td><td>{moeda(um.comissao)}</td></tr>
                </tbody>
              </table></div>
            )}

            {um.aReceber.length > 0 && (
              <>
                <h3 style={{ marginTop: 18 }}>Previsto: parcelas que vencem no período e ainda não foram pagas</h3>
                <div className="tabela"><table>
                  <thead><tr><th>Cliente</th><th>Contrato</th><th>Parcela</th><th>Vence em</th><th>Valor</th><th>Comissão prevista</th></tr></thead>
                  <tbody>
                    {um.aReceber.map((p) => (
                      <tr key={p.id}><td>{p.contrato.cliente_nome}</td><td>Nº {p.contrato.numero}</td><td>{p.numero}ª{p.contrato.meses ? ` de ${p.contrato.meses}` : ''}</td><td>{data(p.vencimento)}</td><td>{moeda(p.valor)}</td><td>{moeda(p.comissao)}</td></tr>
                    ))}
                    <tr className="linha-total"><td colSpan={4}>Total previsto</td><td>{moeda(um.aReceber.reduce((s, p) => s + Number(p.valor), 0))}</td><td>{moeda(um.previsto)}</td></tr>
                  </tbody>
                </table></div>
              </>
            )}
          </div>
        </>
      ) : !lista.length ? <div className="vazio">Nenhuma comissão neste período.</div> : (
        <div className="com-cards">
          {lista.map((v) => (
            <div key={v.id} className="card com-card">
              <Link href={`?${qp({ vendedor: v.id })}`} className="com-card-topo">
                <div><b>{v.nome}</b><small>{v.itens.length} parcela{v.itens.length === 1 ? '' : 's'} · {moeda(v.recebido)} recebidos · {pctTxt(v)}</small></div>
                <ChevronRight className="ico" />
              </Link>
              <div className="com-card-valor num">{moeda(v.comissao)}</div>
              {v.previsto > 0 && <small className="muted">+ {moeda(v.previsto)} previstos em {v.aReceber.length} parcela{v.aReceber.length === 1 ? '' : 's'} a receber</small>}
              <span className={`badge ${ETAPAS_COMISSAO[v.etapa][1]}`}>{ETAPAS_COMISSAO[v.etapa][0]}</span>
              <div className="com-card-acoes">
                <Link href={`?${qp({ vendedor: v.id })}`} className="btn peq">Ver relatório</Link>
                <a className="btn peq cinza" href={pdf(v)} target="_blank" rel="noopener noreferrer"><FileDown className="ico" />PDF</a>
                <EnviarRelatorio url={whats(v)} vendedorId={v.id} mes={per.mes} radioId={R} texto="WhatsApp" className="btn peq whats" />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="muted" style={{ fontSize: '.88rem', marginTop: 14 }}>
        Só gera comissão a venda registrada no sistema, sobre as parcelas pagas pelo cliente. O fechamento vai do dia 21 do mês anterior até o dia {DIA_CORTE}. O caminho é: mandar o relatório, receber a nota fiscal do vendedor e então pagar.
      </p>
    </>
  );
}

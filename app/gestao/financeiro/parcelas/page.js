import { requireFinanceiro } from '@/lib/auth';
import BotaoEnviar from '@/components/BotaoEnviar';
import FormAcao from '@/components/FormAcao';
import { lerPeriodo, mensagemCobranca } from '@/lib/financeiro';
import { data, moeda, STATUS_PARCELA, hojeISO, linkWhatsApp } from '@/lib/format';
import { mudarParcela, salvarBoleto, emitirBoletoAcao } from '../actions';
import Filtros from '../Filtros';

const COR = { a_emitir: 'b-amarelo', emitido: 'b-azul', pago: 'b-verde', cancelado: 'b-cinza' };
const SITUACOES = [['', 'Todas'], ['abertas', 'Em aberto'], ['atrasadas', 'Em atraso'], ['a_emitir', 'Boleto a emitir'], ['pagas', 'Pagas']];

export default async function ParcelasFin({ searchParams }) {
  const { supabase } = await requireFinanceiro();
  const vend = searchParams?.vendedor || '';
  const sit = searchParams?.situacao || '';
  const hoje = hojeISO();
  // atrasadas não dependem do período
  const per = lerPeriodo(searchParams);
  let q = supabase.from('parcelas')
    .select('id, numero, vencimento, valor, status, pago_em, url_boleto, linha_digitavel, contrato:contratos!inner(id, numero, status, vendedor_id, cliente:clientes(nome, contato_nome, telefone, email), vendedor:profiles(nome), radio:radios(nome))')
    .neq('contrato.status', 'cancelado').order('vencimento').limit(400);
  if (vend) q = q.eq('contrato.vendedor_id', vend);
  if (sit === 'atrasadas') q = q.in('status', ['a_emitir', 'emitido']).lt('vencimento', hoje);
  else {
    if (sit === 'pagas') q = q.eq('status', 'pago').gte('pago_em', per.de).lte('pago_em', per.ate);
    else q = q.gte('vencimento', per.de).lte('vencimento', per.ate);
    if (sit === 'abertas') q = q.in('status', ['a_emitir', 'emitido']);
    if (sit === 'a_emitir') q = q.eq('status', 'a_emitir');
  }
  const [{ data: parcelas }, { data: vendedores }] = await Promise.all([
    q, supabase.from('profiles').select('id, nome').in('papel', ['vendedor', 'gestor', 'comercial']).order('nome'),
  ]);
  const total = (parcelas || []).reduce((s, p) => s + Number(p.valor), 0);

  return (
    <>
      <div className="cabecalho"><h1>Parcelas / boletos</h1><span className="muted">{(parcelas || []).length} parcelas · {moeda(total)}</span></div>
      <Filtros vendedores={vendedores || []} sp={searchParams}
        extra={<div className="campo"><label>Situação</label><select name="situacao" defaultValue={sit}>{SITUACOES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></div>} />
      <p className="muted" style={{ fontSize: '.88rem' }}>{sit === 'atrasadas' ? 'Todas as parcelas vencidas e não pagas.' : sit === 'pagas' ? `Pagas em ${per.rotulo}.` : `Com vencimento em ${per.rotulo}.`}</p>
      {!parcelas?.length ? <div className="vazio">Nenhuma parcela com esses filtros.</div> : (
        <div className="lista">
          {parcelas.map((p) => {
            const atrasada = p.status !== 'pago' && p.status !== 'cancelado' && p.vencimento < hoje;
            const cli = p.contrato?.cliente;
            return (
              <details key={p.id} className="item parcela-fin">
                <summary>
                  <div className="info">
                    <div className="nome">{cli?.nome} · {p.numero}ª parcela</div>
                    <div className="det">Contrato Nº {p.contrato?.numero} · {p.contrato?.vendedor?.nome} · {p.contrato?.radio?.nome}</div>
                    <div className="det" style={{ color: atrasada ? 'var(--vermelho)' : undefined }}>
                      Vence {data(p.vencimento)}{atrasada ? ' · EM ATRASO' : ''}{p.pago_em ? ` · pago em ${data(p.pago_em)}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <b className="num">{moeda(p.valor)}</b><br />
                    <span className={`badge ${atrasada ? 'b-vermelho' : COR[p.status]}`}>{atrasada ? 'Em atraso' : STATUS_PARCELA[p.status]}</span>
                  </div>
                </summary>
                <div className="parcela-acoes">
                  {p.status !== 'pago' && (
                    <form action={mudarParcela} className="inline-pago">
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="pago" />
                      <input type="date" name="pago_em" defaultValue={hoje} aria-label="Data do pagamento" />
                      <BotaoEnviar className="btn peq verde" texto="Marcar como pago" enviando="..." />
                    </form>
                  )}
                  {p.status === 'pago' && (
                    <form action={mudarParcela}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="emitido" />
                      <BotaoEnviar className="btn peq cinza" texto="Desfazer pagamento" enviando="..." /></form>
                  )}
                  {p.status === 'a_emitir' && (
                    <FormAcao action={emitirBoletoAcao}><input type="hidden" name="id" value={p.id} /><BotaoEnviar className="btn peq" texto="Emitir boleto" enviando="Emitindo..." /></FormAcao>
                  )}
                  {p.status !== 'pago' && cli?.telefone && (
                    <a className="btn peq whats" href={linkWhatsApp(cli.telefone, mensagemCobranca(p))} target="_blank" rel="noopener noreferrer">Mandar no WhatsApp</a>
                  )}
                  {p.status !== 'pago' && (
                    <FormAcao action={salvarBoleto} className="boleto-manual">
                      <input type="hidden" name="id" value={p.id} />
                      <input name="url_boleto" defaultValue={p.url_boleto || ''} placeholder="Link do boleto (se emitiu no banco)" />
                      <input name="linha_digitavel" defaultValue={p.linha_digitavel || ''} placeholder="Linha digitável" />
                      <BotaoEnviar className="btn peq sec" texto="Salvar boleto" enviando="..." />
                    </FormAcao>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </>
  );
}

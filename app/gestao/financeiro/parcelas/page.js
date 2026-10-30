import { requireFinanceiro } from '@/lib/auth';
import { radioAtual } from '@/lib/radio';
import { lerPeriodo } from '@/lib/financeiro';
import { moeda, hojeISO } from '@/lib/format';
import Filtros from '../Filtros';
import ParcelaItem from '../ParcelaItem';
import BotaoPlanilha from '../BotaoPlanilha';

const SITUACOES = [['', 'Todas'], ['abertas', 'Em aberto'], ['atrasadas', 'Em atraso'], ['a_emitir', 'Boleto a emitir'], ['pagas', 'Pagas']];

export default async function ParcelasFin({ searchParams }) {
  const { supabase, baseFin } = await requireFinanceiro();
  const { radio } = await radioAtual(supabase);
  const R = radio?.id;
  const vend = searchParams?.vendedor || '';
  const sit = searchParams?.situacao || '';
  const hoje = hojeISO();
  // atrasadas não dependem do período
  const per = lerPeriodo(searchParams);
  let q = supabase.from('parcelas')
    .select('id, numero, vencimento, valor, status, pago_em, url_boleto, linha_digitavel, contrato:contratos!inner(id, numero, status, vendedor_id, cliente:clientes(id, nome, contato_nome, telefone, email), vendedor:profiles(nome), radio:radios(nome))')
    .neq('contrato.status', 'cancelado').eq('contrato.radio_id', R).order('vencimento').limit(400);
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
      <div className="cabecalho"><h1>Parcelas / boletos</h1><span className="muted">{(parcelas || []).length} parcelas · {moeda(total)}</span><BotaoPlanilha href={`${baseFin}/exportar?${new URLSearchParams({ ...searchParams, tipo: 'parcelas' })}`} /></div>
      <Filtros vendedores={vendedores || []} sp={searchParams}
        extra={<div className="campo"><label>Situação</label><select name="situacao" defaultValue={sit}>{SITUACOES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></div>} />
      <p className="muted" style={{ fontSize: '.88rem' }}>{sit === 'atrasadas' ? 'Todas as parcelas vencidas e não pagas.' : sit === 'pagas' ? `Pagas em ${per.rotulo}.` : `Com vencimento em ${per.rotulo}.`}</p>
      {!parcelas?.length ? <div className="vazio">Nenhuma parcela com esses filtros.</div> : (
        <div className="lista">
          {parcelas.map((p) => <ParcelaItem key={p.id} p={p} hoje={hoje} baseFin={baseFin} />)}
        </div>
      )}
    </>
  );
}

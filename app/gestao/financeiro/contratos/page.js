import Link from 'next/link';
import { CheckCircle2, Clock3, MinusCircle } from 'lucide-react';
import { requireFinanceiro } from '@/lib/auth';
import { lerPeriodo } from '@/lib/financeiro';
import { configAutentique, situacaoDocumento, marcarAssinado } from '@/lib/autentique';
import { data, moeda, STATUS_CONTRATO } from '@/lib/format';
import Filtros from '../Filtros';
import BotaoPlanilha from '../BotaoPlanilha';

const COR = { pendente: 'b-amarelo', ativo: 'b-verde', encerrado: 'b-cinza', cancelado: 'b-vermelho' };
const ASSIN = [['', 'Todas'], ['assinados', 'Assinados'], ['aguardando', 'Aguardando assinatura'], ['sem', 'Não enviados']];

export default async function ContratosFin({ searchParams }) {
  const { supabase, baseFin } = await requireFinanceiro();
  const vend = searchParams?.vendedor || '';
  const st = searchParams?.status || '';
  const assin = searchParams?.assinatura || '';
  const per = lerPeriodo(searchParams);
  let q = supabase.from('contratos')
    .select('id, numero, cliente_id, cliente_nome, status, data_inicio, data_fim, valor_mensal, meses, created_at, assinado_em, assinatura_enviada_em, autentique_id, autentique_assinatura, vendedor:profiles(nome), programa:programas(nome), radio:radios(nome), parcelas(status, vencimento)')
    .gte('created_at', `${per.de}T00:00:00`).lte('created_at', `${per.ate}T23:59:59`)
    .order('created_at', { ascending: false }).limit(300);
  if (vend) q = q.eq('vendedor_id', vend);
  if (st) q = q.eq('status', st);
  const [{ data: contratos }, { data: vendedores }] = await Promise.all([
    q, supabase.from('profiles').select('id, nome').in('papel', ['vendedor', 'gestor', 'comercial']).order('nome'),
  ]);
  let lista = contratos || [];

  // os que estão aguardando: pergunta para a Autentique se já assinaram
  const aguardando = lista.filter((c) => c.status === 'pendente' && c.autentique_id).slice(0, 20);
  if (aguardando.length) {
    try {
      const cfg = await configAutentique();
      if (cfg?.token) {
        await Promise.all(aguardando.map(async (c) => {
          const s = await situacaoDocumento(cfg.token, c.autentique_id, c.autentique_assinatura).catch(() => null);
          if (s?.assinado) {
            await marcarAssinado(c.autentique_id);
            c.status = 'ativo';
            c.assinado_em = new Date().toISOString();
          } else if (s?.recusado) c.recusado = true;
        }));
      }
    } catch { /* sem Autentique agora: mostra o que já sabemos */ }
  }
  const assinado = (c) => !!c.autentique_id && (c.status === 'ativo' || c.status === 'encerrado' || !!c.assinado_em);
  if (assin === 'assinados') lista = lista.filter(assinado);
  if (assin === 'aguardando') lista = lista.filter((c) => c.autentique_id && !assinado(c) && c.status !== 'cancelado');
  if (assin === 'sem') lista = lista.filter((c) => !c.autentique_id);
  const nAssinados = (contratos || []).filter(assinado).length;
  const nAguardando = (contratos || []).filter((c) => c.autentique_id && !assinado(c) && c.status !== 'cancelado').length;

  return (
    <>
      <div className="cabecalho">
        <h1>Contratos</h1>
        <span className="muted">{lista.length} fechados em {per.rotulo} · {moeda(lista.filter((c) => c.status !== 'cancelado').reduce((s, c) => s + Number(c.valor_mensal), 0))}/mês</span>
        <BotaoPlanilha href={`${baseFin}/exportar?${new URLSearchParams({ ...searchParams, tipo: 'contratos' })}`} />
      </div>
      <Filtros vendedores={vendedores || []} sp={searchParams}
        extra={<>
          <div className="campo"><label>Situação</label><select name="status" defaultValue={st}><option value="">Todas</option>{Object.entries(STATUS_CONTRATO).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></div>
          <div className="campo"><label>Assinatura</label><select name="assinatura" defaultValue={assin}>{ASSIN.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></div>
        </>} />
      <div className="assin-resumo">
        <span><CheckCircle2 className="ico ok" />{nAssinados} assinado{nAssinados === 1 ? '' : 's'} na Autentique</span>
        <span><Clock3 className="ico aviso" />{nAguardando} aguardando assinatura</span>
        <span className="muted">A situação é conferida na Autentique quando você abre esta tela.</span>
      </div>
      <div className="tabela"><table>
        <thead><tr><th>Nº</th><th>Cliente</th><th>Vendedor</th><th>Programa</th><th>Valor/mês</th><th>Período</th><th>Pagas</th><th>Assinatura</th><th>Situação</th></tr></thead>
        <tbody>
          {!lista.length && <tr><td colSpan={9} className="muted">Nenhum contrato.</td></tr>}
          {lista.map((c) => (
            <tr key={c.id}>
              <td><Link href={`${baseFin}/contratos/${c.id}`}><b>{c.numero}</b></Link></td>
              <td><Link href={`${baseFin}/contratos/${c.id}`}>{c.cliente_nome}</Link></td>
              <td>{c.vendedor?.nome}</td>
              <td>{c.programa?.nome || 'Avulso'}<br /><small>{c.radio?.nome}</small></td>
              <td>{moeda(c.valor_mensal)} x {c.meses}</td><td>{data(c.data_inicio)} a {data(c.data_fim)}</td>
              <td>{(c.parcelas || []).filter((p) => p.status === 'pago').length}/{(c.parcelas || []).length}</td>
              <td>
                {assinado(c) ? <Link href={`${baseFin}/contratos/${c.id}`} className="assin-tag ok"><CheckCircle2 className="ico" />Assinado{c.assinado_em ? ` ${data(c.assinado_em.slice(0, 10)).slice(0, 5)}` : ''}</Link>
                  : c.recusado ? <span className="assin-tag perigo">Recusado</span>
                    : c.autentique_id ? <Link href={`${baseFin}/contratos/${c.id}`} className="assin-tag aviso"><Clock3 className="ico" />Aguardando</Link>
                      : <span className="assin-tag"><MinusCircle className="ico" />Não enviado</span>}
              </td>
              <td><span className={`badge ${COR[c.status]}`}>{STATUS_CONTRATO[c.status]}</span></td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}

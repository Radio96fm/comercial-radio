import Link from 'next/link';
import { requireFinanceiro } from '@/lib/auth';
import { nomeMes } from '@/lib/ganhos';
import { hojeISO, somarDias, somarMeses, moeda } from '@/lib/format';
import Filtros from '../Filtros';
import { comHistorico } from '@/lib/historico';

const soma = (l) => l.reduce((s, p) => s + Number(p.valor), 0);
const FAIXAS = [[1, 15, 'Até 15 dias'], [16, 30, '16 a 30 dias'], [31, 60, '31 a 60 dias'], [61, 99999, 'Mais de 60 dias']];
const dias = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);

// Quanto deve entrar nos próximos meses, e há quanto tempo está o que já atrasou
export default async function Previsao({ searchParams }) {
  const { supabase, baseFin } = await requireFinanceiro();
  const vend = searchParams?.vendedor || '';
  const hoje = hojeISO();
  const mes0 = `${hoje.slice(0, 7)}-01`;
  const fim = somarDias(somarMeses(mes0, 6), -1);

  let qp = supabase.from('parcelas')
    .select('valor, status, vencimento, pago_em, contrato:contratos!inner(status, vendedor_id, radio_id)')
    .neq('status', 'cancelado').neq('contrato.status', 'cancelado').lte('vencimento', fim)
    .or(`vencimento.gte.${mes0},status.in.(a_emitir,emitido)`);
  if (vend) qp = qp.eq('contrato.vendedor_id', vend);
  let qc = supabase.from('contratos').select('valor_mensal, data_fim, cliente_nome').eq('status', 'ativo').gte('data_fim', mes0).lte('data_fim', fim);
  if (vend) qc = qc.eq('vendedor_id', vend);
  const [{ data: parcelas }, { data: terminam }, { data: radios }, { data: vendedores }, { data: historico }] = await Promise.all([
    qp, qc,
    supabase.from('radios').select('id, nome, cor').order('ordem'),
    supabase.from('profiles').select('id, nome').in('papel', ['vendedor', 'gestor', 'comercial']).order('nome'),
    // mês corrente antes do sistema (não é separado por vendedor)
    vend ? { data: [] } : supabase.from('faturamento_historico').select('radio_id, mes, valor').eq('mes', mes0.slice(0, 7)),
  ]);
  const lista = parcelas || [];

  const meses = Array.from({ length: 6 }, (_, i) => {
    const chave = somarMeses(mes0, i).slice(0, 7);
    const doMes = lista.filter((p) => p.vencimento.slice(0, 7) === chave);
    const abertas = doMes.filter((p) => p.status !== 'pago');
    return {
      chave,
      previsto: soma(doMes),
      recebido: soma(doMes.filter((p) => p.status === 'pago')),
      falta: soma(abertas),
      aEmitir: abertas.filter((p) => p.status === 'a_emitir').length,
      porRadio: (radios || []).map((r) => soma(doMes.filter((p) => p.contrato.radio_id === r.id)) || (doMes.length ? 0 : soma((historico || []).filter((h) => h.mes === chave && h.radio_id === r.id)))),
      saem: (terminam || []).filter((c) => c.data_fim.slice(0, 7) === chave),
    };
  });
  // mês sem parcela no sistema: usa o histórico dos contratos em PDF (já recebido)
  comHistorico(meses, historico).forEach((h, i) => { if (h.historico) Object.assign(meses[i], { previsto: h.previsto, recebido: h.recebido, falta: 0 }); });
  const max = Math.max(1, ...meses.map((m) => m.previsto));
  const totalFalta = meses.reduce((s, m) => s + m.falta, 0);

  const atrasadas = lista.filter((p) => p.status !== 'pago' && p.vencimento < hoje);
  const faixas = FAIXAS.map(([de, ate, rotulo]) => {
    const l = atrasadas.filter((p) => { const d = dias(p.vencimento, hoje); return d >= de && d <= ate; });
    return { rotulo, qtd: l.length, valor: soma(l) };
  });
  const totalAtraso = soma(atrasadas);
  const q = (extra) => `?${new URLSearchParams({ ...(vend ? { vendedor: vend } : {}), ...extra })}`;

  return (
    <>
      <div className="cabecalho"><h1>Previsão de recebimentos</h1><span className="muted">{moeda(totalFalta)} para entrar nos próximos 6 meses</span></div>
      <Filtros vendedores={vendedores || []} sp={searchParams} semPeriodo />

      <div className="b-card prev-meses">
        {meses.map((m, i) => (
          <div key={m.chave} className={`prev-mes ${i === 0 ? 'atual' : ''}`}>
            <div className="prev-topo"><b>{nomeMes(m.chave)}</b><span className="num">{moeda(m.previsto)}</span></div>
            <div className="prev-barra" title={`Previsto ${moeda(m.previsto)}`}>
              {m.porRadio.map((v, j) => v > 0 && <span key={j} style={{ width: `${(v / max) * 100}%`, background: radios[j].cor }} title={`${radios[j].nome}: ${moeda(v)}`} />)}
            </div>
            <div className="prev-det">
              {m.recebido > 0 && <span className="ok">✓ {moeda(m.recebido)} já recebido</span>}
              <span>{m.falta > 0 ? `${moeda(m.falta)} a receber` : 'nada a receber'}</span>
              {m.aEmitir > 0 && <span>{m.aEmitir} boleto{m.aEmitir > 1 ? 's' : ''} a emitir</span>}
              {m.saem.length > 0 && <span className="aviso">{m.saem.length} contrato{m.saem.length > 1 ? 's' : ''} termina{m.saem.length > 1 ? 'm' : ''} (−{moeda(m.saem.reduce((s, c) => s + Number(c.valor_mensal), 0))}/mês)</span>}
            </div>
          </div>
        ))}
        <div className="prev-legenda">
          {(radios || []).map((r) => <span key={r.id}><i style={{ background: r.cor }} />{r.nome}</span>)}
        </div>
      </div>

      <div className="secao-titulo"><h2>Atrasos por tempo</h2><Link href={`${baseFin}/parcelas${q({ situacao: 'atrasadas' })}`}>Ver parcelas atrasadas ›</Link></div>
      {!atrasadas.length ? <div className="vazio">Nenhuma parcela em atraso. Ótimo!</div> : (
        <div className="fin-cards">
          {faixas.map((f, i) => (
            <div key={f.rotulo} className={`card fin-card ${i >= 2 && f.qtd ? 'perigo' : ''}`}>
              <small>{f.rotulo}</small><b className="num">{moeda(f.valor)}</b>
              <span className="muted">{f.qtd} parcela{f.qtd === 1 ? '' : 's'} · {totalAtraso ? Math.round((f.valor / totalAtraso) * 100) : 0}% do atraso</span>
            </div>
          ))}
        </div>
      )}
      <p className="muted" style={{ fontSize: '.88rem', marginTop: 12 }}>A previsão soma as parcelas dos contratos já fechados. Contratos que terminam deixam de pagar a partir do mês seguinte: vale avisar o vendedor para renovar.</p>
    </>
  );
}

import Link from 'next/link';
import { requireFinanceiro } from '@/lib/auth';
import { lerPeriodo, comissoesDoMes } from '@/lib/financeiro';
import { mesDaComissao, nomeMes, DIA_CORTE } from '@/lib/ganhos';
import { hojeISO, somarDias, moeda } from '@/lib/format';
import Filtros from './Filtros';

export default async function ResumoFinanceiro({ searchParams }) {
  const { supabase, perfil } = await requireFinanceiro();
  const per = lerPeriodo(searchParams);
  const vend = searchParams?.vendedor || '';
  const hoje = hojeISO();
  const mesCom = mesDaComissao(hoje);

  const base = () => {
    let q = supabase.from('parcelas').select('id, valor, status, vencimento, pago_em, contrato:contratos!inner(vendedor_id, status)').neq('contrato.status', 'cancelado');
    if (vend) q = q.eq('contrato.vendedor_id', vend);
    return q;
  };
  const [{ data: vendedores }, { data: pagas }, { data: abertas }, comissoes] = await Promise.all([
    supabase.from('profiles').select('id, nome').in('papel', ['vendedor', 'gestor']).order('nome'),
    base().eq('status', 'pago').gte('pago_em', per.de).lte('pago_em', per.ate),
    base().in('status', ['a_emitir', 'emitido']).lte('vencimento', somarDias(hoje, 31)),
    comissoesDoMes(supabase, mesCom, vend || null),
  ]);
  const soma = (l) => (l || []).reduce((s, p) => s + Number(p.valor), 0);
  const atrasadas = (abertas || []).filter((p) => p.vencimento < hoje);
  const aVencer = (abertas || []).filter((p) => p.vencimento >= hoje);
  const aEmitir = aVencer.filter((p) => p.status === 'a_emitir');
  const totalCom = comissoes.reduce((s, v) => s + v.comissao, 0);
  const faltaPagar = comissoes.filter((v) => !v.pago && v.comissao > 0);
  const q = (extra) => `?${new URLSearchParams({ ...(vend ? { vendedor: vend } : {}), ...extra })}`;

  return (
    <>
      <div className="cabecalho"><h1>Olá, {perfil.nome.split(' ')[0]}!</h1><span className="muted">Gestão financeira</span></div>
      <Filtros vendedores={vendedores || []} sp={searchParams} />

      <div className="fin-cards">
        <div className="card fin-card"><small>Recebido ({per.rotulo})</small><b className="num">{moeda(soma(pagas))}</b><span className="muted">{(pagas || []).length} parcelas pagas</span></div>
        <Link href={`/financeiro/parcelas${q({ situacao: 'atrasadas' })}`} className={`card fin-card ${atrasadas.length ? 'perigo' : ''}`}><small>Em atraso</small><b className="num">{moeda(soma(atrasadas))}</b><span className="muted">{atrasadas.length} parcelas ›</span></Link>
        <Link href={`/financeiro/cobranca${q({})}`} className="card fin-card"><small>Vencem nos próximos 30 dias</small><b className="num">{moeda(soma(aVencer))}</b><span className="muted">{aVencer.length} parcelas · {aEmitir.length} boletos a emitir ›</span></Link>
        <Link href={`/financeiro/comissoes${q({ mes: mesCom })}`} className="card fin-card destaque"><small>Comissões de {nomeMes(mesCom)} (fecha dia {DIA_CORTE})</small><b className="num">{moeda(totalCom)}</b><span>{faltaPagar.length ? `${faltaPagar.length} vendedor(es) a pagar ›` : 'Tudo pago ›'}</span></Link>
      </div>

      {aEmitir.length > 0 && (
        <div className="alerta aviso">
          <b>Lembrete do mês:</b> {aEmitir.length} boleto(s) vencem nos próximos 30 dias e ainda não foram emitidos. <Link href={`/financeiro/cobranca${q({})}`}>Abrir cobrança do mês ›</Link>
        </div>
      )}

      <div className="secao-titulo"><h2>Comissão por vendedor em {nomeMes(mesCom)}</h2><Link href={`/financeiro/comissoes${q({ mes: mesCom })}`}>Ver detalhes</Link></div>
      {!comissoes.length ? <div className="vazio">Nenhuma parcela paga neste fechamento ainda.</div> : (
        <div className="tabela"><table>
          <thead><tr><th>Vendedor</th><th>Recebido dos clientes</th><th>%</th><th>Comissão</th><th>Situação</th></tr></thead>
          <tbody>{comissoes.map((v) => (
            <tr key={v.id}><td><b>{v.nome}</b></td><td>{moeda(v.recebido)}</td><td>{String(v.pct).replace('.', ',')}%</td><td><b>{moeda(v.comissao)}</b></td>
              <td>{v.pago ? <span className="badge b-verde">Paga</span> : <span className="badge b-amarelo">A pagar</span>}</td></tr>
          ))}</tbody>
        </table></div>
      )}
      <p className="muted" style={{ fontSize: '.88rem', marginTop: 12 }}>
        Regra: só gera comissão a venda registrada no sistema. A comissão fecha todo dia {DIA_CORTE}: parcela paga até o dia {DIA_CORTE} entra no mês; paga depois, entra no mês seguinte.
      </p>
    </>
  );
}

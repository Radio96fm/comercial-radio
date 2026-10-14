import { requireFinanceiro } from '@/lib/auth';
import BotaoEnviar from '@/components/BotaoEnviar';
import { comissoesDoMes, janelaComissao } from '@/lib/financeiro';
import { mesDaComissao, nomeMes, DIA_CORTE } from '@/lib/ganhos';
import { hojeISO, somarMeses, moeda, data } from '@/lib/format';
import { pagarComissao, desfazerComissao } from '../actions';
import Filtros from '../Filtros';

export default async function Comissoes({ searchParams }) {
  const { supabase } = await requireFinanceiro();
  const atual = mesDaComissao(hojeISO());
  const meses = Array.from({ length: 12 }, (_, i) => somarMeses(`${atual}-01`, -i).slice(0, 7));
  const mes = meses.includes(searchParams?.mes) ? searchParams.mes : atual;
  const vend = searchParams?.vendedor || '';
  const [{ data: vendedores }, lista] = await Promise.all([
    supabase.from('profiles').select('id, nome').in('papel', ['vendedor', 'gestor']).order('nome'),
    comissoesDoMes(supabase, mes, vend || null),
  ]);
  const { de, ate } = janelaComissao(mes);
  const total = lista.reduce((s, v) => s + v.comissao, 0);

  return (
    <>
      <div className="cabecalho"><h1>Comissões</h1><span className="muted">Total de {nomeMes(mes)}: <b>{moeda(total)}</b></span></div>
      <Filtros vendedores={vendedores || []} sp={searchParams} semPeriodo
        extra={<div className="campo"><label>Fechamento</label><select name="mes" defaultValue={mes}>{meses.map((m) => <option key={m} value={m}>{nomeMes(m)}</option>)}</select></div>} />
      <p className="muted">Fechamento de {nomeMes(mes)}: parcelas pagas de {data(de)} a {data(ate)} (a comissão fecha no dia {DIA_CORTE}).</p>
      {!lista.length ? <div className="vazio">Nenhuma comissão neste fechamento.</div> : lista.map((v) => (
        <details key={v.id} className="card comissao-v">
          <summary>
            <div className="info"><b>{v.nome}</b><span className="muted">{v.itens.length} parcela(s) · {moeda(v.recebido)} recebidos · {String(v.pct).replace('.', ',')}%</span></div>
            <b className="num">{moeda(v.comissao)}</b>
            {v.pago ? <span className="badge b-verde">Paga em {data(v.pago.pago_em)}</span> : <span className="badge b-amarelo">A pagar</span>}
          </summary>
          <div className="tabela" style={{ marginTop: 10 }}><table>
            <thead><tr><th>Cliente</th><th>Contrato</th><th>Parcela</th><th>Pago em</th><th>Valor</th><th>Comissão</th></tr></thead>
            <tbody>{v.itens.map((p) => (
              <tr key={p.id}><td>{p.contrato.cliente_nome}</td><td>Nº {p.contrato.numero}</td><td>{p.numero}ª</td><td>{data(p.pago_em)}</td><td>{moeda(p.valor)}</td><td>{moeda(p.comissao)}</td></tr>
            ))}</tbody>
          </table></div>
          <div className="acoes" style={{ marginTop: 10 }}>
            {v.pago ? (
              <form action={desfazerComissao}><input type="hidden" name="id" value={v.pago.id} /><BotaoEnviar className="btn peq cinza" texto="Desfazer pagamento" enviando="..." /></form>
            ) : (
              <form action={pagarComissao}>
                <input type="hidden" name="vendedor_id" value={v.id} /><input type="hidden" name="mes" value={mes} /><input type="hidden" name="valor" value={v.comissao.toFixed(2)} />
                <BotaoEnviar className="btn peq verde" texto={`Marcar ${moeda(v.comissao)} como pago`} enviando="..." confirmar={`Confirmar pagamento de ${moeda(v.comissao)} para ${v.nome}?`} />
              </form>
            )}
          </div>
        </details>
      ))}
    </>
  );
}

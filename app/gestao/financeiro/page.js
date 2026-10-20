import Link from 'next/link';
import {
  AlertTriangle, FileText, PenLine, Wallet, Send, BadgePercent, CalendarClock, RefreshCw, TrendingUp, CircleDollarSign, ChevronRight, Building2, Search,
} from 'lucide-react';
import { requireFinanceiro } from '@/lib/auth';
import { lerPeriodo, comissoesDoMes, mensagemCobranca } from '@/lib/financeiro';
import { mesDaComissao, nomeMes, DIA_CORTE } from '@/lib/ganhos';
import { hojeISO, somarDias, somarMeses, moeda, data, linkWhatsApp } from '@/lib/format';
import Tendencia from '@/components/Tendencia';
import Filtros from './Filtros';
import { radioFin } from '@/lib/radioFin';

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const soma = (l) => (l || []).reduce((s, p) => s + Number(p.valor), 0);
// R$ 12,3 mil (para caber nas barras do gráfico)
const curta = (v) => (v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: v >= 100000 ? 0 : 1 })} mil` : Math.round(v).toLocaleString('pt-BR'));
const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);

function saudacao() {
  const h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default async function ResumoFinanceiro({ searchParams }) {
  const { supabase, perfil, baseFin } = await requireFinanceiro();
  const per = lerPeriodo(searchParams);
  const vend = searchParams?.vendedor || '';
  const hoje = hojeISO();
  const mesAtual = hoje.slice(0, 7);
  const inicioSerie = somarMeses(`${mesAtual}-01`, -5);
  const fimMes = somarDias(somarMeses(`${mesAtual}-01`, 1), -1);
  const mesCom = mesDaComissao(hoje);
  const radio = radioFin();

  const parcelas = (campos) => {
    let q = supabase.from('parcelas').select(campos).neq('status', 'cancelado').neq('contrato.status', 'cancelado');
    if (vend) q = q.eq('contrato.vendedor_id', vend);
    if (radio) q = q.eq('contrato.radio_id', radio);
    return q;
  };
  let qContratos = supabase.from('contratos')
    .select('id, numero, status, valor_mensal, data_fim, cliente_nome, radio_id, created_at, vendedor:profiles(nome), parcelas(valor, status)')
    .in('status', ['ativo', 'pendente']);
  if (vend) qContratos = qContratos.eq('vendedor_id', vend);
  if (radio) qContratos = qContratos.eq('radio_id', radio);

  const [{ data: vendedores }, { data: radios }, { data: contratos }, { data: serieP }, { data: abertas }, { data: pagasPer }, comissoes] = await Promise.all([
    supabase.from('profiles').select('id, nome').in('papel', ['vendedor', 'gestor', 'comercial']).order('nome'),
    (radio ? supabase.from('radios').select('id, nome, cor').eq('id', radio) : supabase.from('radios').select('id, nome, cor').order('ordem')),
    qContratos,
    // tudo que venceu ou foi pago nos últimos 6 meses (gráfico)
    parcelas('valor, status, vencimento, pago_em, contrato:contratos!inner(status, vendedor_id)')
      .or(`vencimento.gte.${inicioSerie},pago_em.gte.${inicioSerie}`),
    // em aberto: atrasadas + vencendo nos próximos 30 dias
    parcelas('id, numero, valor, status, vencimento, url_boleto, linha_digitavel, contrato:contratos!inner(id, numero, status, vendedor_id, cliente_nome, cliente:clientes(id, nome, contato_nome, telefone), radio:radios(nome))')
      .in('status', ['a_emitir', 'emitido']).lte('vencimento', somarDias(hoje, 30)).order('vencimento'),
    parcelas('valor, contrato:contratos!inner(status, vendedor_id)').eq('status', 'pago').gte('pago_em', per.de).lte('pago_em', per.ate),
    comissoesDoMes(supabase, mesCom, vend || null),
  ]);

  // contratos
  const ativos = (contratos || []).filter((c) => c.status === 'ativo');
  const pendentes = (contratos || []).filter((c) => c.status === 'pendente');
  const mensalAtivo = ativos.reduce((s, c) => s + Number(c.valor_mensal), 0);
  const aReceber = ativos.reduce((s, c) => s + soma((c.parcelas || []).filter((p) => ['a_emitir', 'emitido'].includes(p.status))), 0);
  const porRadio = (radios || []).map((r) => ({ ...r, valor: ativos.filter((c) => c.radio_id === r.id).reduce((s, c) => s + Number(c.valor_mensal), 0) })).filter((r) => r.valor > 0);
  const terminando = ativos.filter((c) => c.data_fim >= hoje && c.data_fim <= somarDias(hoje, 30)).sort((a, b) => a.data_fim.localeCompare(b.data_fim));

  // recebido x previsto por mês
  const serie = Array.from({ length: 6 }, (_, i) => {
    const chave = somarMeses(`${mesAtual}-01`, i - 5).slice(0, 7);
    const recebido = soma((serieP || []).filter((p) => p.status === 'pago' && p.pago_em?.slice(0, 7) === chave));
    const previsto = soma((serieP || []).filter((p) => p.vencimento.slice(0, 7) === chave));
    return { chave, rotulo: MES[Number(chave.slice(5)) - 1], recebido, previsto };
  });
  const maxSerie = Math.max(1, ...serie.map((s) => Math.max(s.recebido, s.previsto)));
  const atual = serie[5];
  const anterior = serie[4];
  const variacao = anterior.recebido ? ((atual.recebido - anterior.recebido) / anterior.recebido) * 100 : (atual.recebido ? 100 : 0);
  const pctMes = atual.previsto ? Math.min(100, Math.round((atual.recebido / atual.previsto) * 100)) : 0;

  // parcelas em aberto
  const atrasadas = (abertas || []).filter((p) => p.vencimento < hoje);
  const proximas = (abertas || []).filter((p) => p.vencimento >= hoje);
  const aEmitir = proximas.filter((p) => p.status === 'a_emitir');
  const semana = proximas.filter((p) => p.vencimento <= somarDias(hoje, 7));

  // comissões
  const totalCom = comissoes.reduce((s, v) => s + v.comissao, 0);
  const faltaPagar = comissoes.filter((v) => !v.pago && v.comissao > 0);

  const q = (extra) => `?${new URLSearchParams({ ...(vend ? { vendedor: vend } : {}), ...extra })}`;
  const dataLonga = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (l) => l.toUpperCase());
  const nomeVend = vend && (vendedores || []).find((v) => v.id === vend)?.nome;

  return (
    <>
      <div className="saudacao-g">
        <small>{dataLonga}</small>
        <h1>{saudacao()}, {perfil.nome.split(' ')[0]}!{nomeVend ? ` Números de ${nomeVend.split(' ')[0]}` : ' Veja como está o caixa'}</h1>
        <form method="get" action={`${baseFin}/clientes`} className="busca-fin">
          <Search className="ico" /><input name="busca" placeholder="Procurar cliente pelo nome ou CNPJ" aria-label="Procurar cliente" /><button className="btn peq">Procurar</button>
        </form>
      </div>

      {(atrasadas.length > 0 || aEmitir.length > 0 || faltaPagar.length > 0) && (
        <div className="fin-tarefas">
          <b>Para fazer hoje</b>
          {atrasadas.length > 0 && <Link href={`${baseFin}/parcelas${q({ situacao: 'atrasadas' })}`} className="tarefa perigo"><AlertTriangle className="ico" />Cobrar {atrasadas.length} parcela{atrasadas.length > 1 ? 's' : ''} em atraso<ChevronRight className="ico" /></Link>}
          {aEmitir.length > 0 && <Link href={`${baseFin}/cobranca${q({})}`} className="tarefa"><FileText className="ico" />Emitir {aEmitir.length} boleto{aEmitir.length > 1 ? 's' : ''} do mês<ChevronRight className="ico" /></Link>}
          {faltaPagar.length > 0 && <Link href={`${baseFin}/comissoes${q({ mes: mesCom })}`} className="tarefa"><BadgePercent className="ico" />Pagar comissão de {faltaPagar.length} vendedor{faltaPagar.length > 1 ? 'es' : ''}<ChevronRight className="ico" /></Link>}
        </div>
      )}

      <div className="bento">
        <Link href={`${baseFin}/contratos${q({ status: 'ativo', periodo: 'tudo' })}`} className="b-card b-hero">
          <div className="b-eyebrow">Contratos ativos · valor por mês</div>
          <div className="b-gigante num">{moeda(mensalAtivo)}</div>
          <div className="b-sub">{ativos.length} contrato{ativos.length === 1 ? '' : 's'} ativo{ativos.length === 1 ? '' : 's'} · <b>{moeda(aReceber)}</b> ainda a receber até o fim deles</div>
          <div className="b-chips">
            {porRadio.map((r) => (
              <span key={r.id} className="chip-r"><i className="bolinha" style={{ background: r.cor }} />{r.nome}<b>{moeda(r.valor)}/mês</b></span>
            ))}
            {!porRadio.length && <span className="chip-r">Nenhum contrato ativo ainda</span>}
          </div>
        </Link>

        <div className="b-card b-claro">
          <div className="b-eyebrow">Recebido em {nomeMes(mesAtual)}</div>
          <div className="b-medio num" style={{ margin: '14px 0 8px' }}>{moeda(atual.recebido)}</div>
          <div><Tendencia variacao={variacao} anterior={anterior.recebido} /></div>
          <div style={{ marginTop: 'auto', paddingTop: 14 }}>
            <div className="seg-bar"><span style={{ width: `${pctMes}%`, background: '#22c55e' }} /></div>
            <div className="b-sub"><b>{pctMes}%</b> do previsto no mês ({moeda(atual.previsto)})</div>
          </div>
        </div>

        <div className="b-minis">
          <Link href={`${baseFin}/parcelas${q({ situacao: 'atrasadas' })}`} className={`b-card b-mini ${atrasadas.length ? 'mini-perigo' : ''}`}>
            <AlertTriangle className="ico" /><div><b className="num">{moeda(soma(atrasadas))}</b><span>em atraso · {atrasadas.length} parcela{atrasadas.length === 1 ? '' : 's'}</span></div>
          </Link>
          <Link href={`${baseFin}/cobranca${q({})}`} className="b-card b-mini">
            <CalendarClock className="ico" /><div><b className="num">{moeda(soma(proximas))}</b><span>vence em 30 dias · {aEmitir.length} boleto{aEmitir.length === 1 ? '' : 's'} a emitir</span></div>
          </Link>
          <Link href={`${baseFin}/contratos${q({ status: 'pendente', periodo: 'tudo' })}`} className="b-card b-mini">
            <PenLine className="ico" /><div><b className="num">{pendentes.length}</b><span>contrato{pendentes.length === 1 ? '' : 's'} aguardando assinatura · {moeda(pendentes.reduce((s, c) => s + Number(c.valor_mensal), 0))}/mês</span></div>
          </Link>
        </div>

        <div className="b-card b-grafico">
          <div className="b-topo">
            <div>
              <div className="b-eyebrow">Recebido por mês</div>
              <div className="b-medio num">{moeda(serie.reduce((s, m) => s + m.recebido, 0))}</div>
              <div className="b-sub">nos últimos 6 meses · a barra clara é o que estava previsto</div>
            </div>
            {anterior.recebido > 0 && (
              <span className={`var-chip ${variacao >= 0 ? 'sobe' : 'desce'}`}><TrendingUp size={14} />{variacao >= 0 ? '+' : ''}{Math.round(variacao)}%</span>
            )}
          </div>
          <div className="barras barras-fin">
            {serie.map((s, i) => (
              <div key={s.chave} className={`col ${i === 5 ? 'atual' : ''}`} title={`${s.rotulo}: recebido ${moeda(s.recebido)} de ${moeda(s.previsto)} previsto`}>
                <small>{s.recebido ? curta(s.recebido) : ''}</small>
                <div className="par">
                  <span className="prev" style={{ height: `${Math.max(3, (s.previsto / maxSerie) * 100)}%` }} />
                  <span style={{ height: `${Math.max(3, (s.recebido / maxSerie) * 100)}%` }} />
                </div>
                <em>{s.rotulo}</em>
              </div>
            ))}
          </div>
        </div>

        <Link href={`${baseFin}/comissoes${q({ mes: mesCom })}`} className="b-card b-col">
          <BadgePercent className="ico-redondo" />
          <div className="b-eyebrow">Comissões de {nomeMes(mesCom)}</div>
          <div className="b-medio num">{moeda(totalCom)}</div>
          <div className="b-sub">fecha dia {DIA_CORTE} · {faltaPagar.length ? `${faltaPagar.length} a pagar` : 'tudo pago'}</div>
          <span className="ver-tudo">Ver comissões ›</span>
        </Link>

        <div className="b-card b-col">
          <CircleDollarSign className="ico-redondo" />
          <div className="b-eyebrow">Recebido ({per.rotulo})</div>
          <div className="b-medio num">{moeda(soma(pagasPer))}</div>
          <div className="b-sub">{(pagasPer || []).length} parcela{(pagasPer || []).length === 1 ? '' : 's'} paga{(pagasPer || []).length === 1 ? '' : 's'}</div>
          <span className="muted" style={{ fontSize: '.82rem', marginTop: 'auto' }}>Mude o período no filtro abaixo</span>
        </div>
      </div>

      <div className="fin-atalhos">
        <Link href={`${baseFin}/parcelas${q({ situacao: 'abertas' })}`}><Wallet className="ico" /><b>Dar baixa</b><small>marcar parcela como paga</small></Link>
        <Link href={`${baseFin}/cobranca${q({})}`}><Send className="ico" /><b>Cobrar clientes</b><small>boletos e WhatsApp do mês</small></Link>
        <Link href={`${baseFin}/comissoes${q({ mes: mesCom })}`}><BadgePercent className="ico" /><b>Pagar comissões</b><small>fechamento do dia {DIA_CORTE}</small></Link>
        <Link href={`${baseFin}/clientes`}><Building2 className="ico" /><b>Ficha do cliente</b><small>tudo o que cada um pagou e deve</small></Link>
        <Link href={`${baseFin}/previsao${q({})}`}><TrendingUp className="ico" /><b>Previsão</b><small>o que entra nos próximos meses</small></Link>
        <Link href={`${baseFin}/contratos${q({ periodo: 'tudo' })}`}><FileText className="ico" /><b>Ver contratos</b><small>todos os contratos fechados</small></Link>
      </div>

      <div className="grade-listas">
        <div className="b-card b-lista">
          <div className="b-topo"><h2><AlertTriangle className="ico" />Em atraso</h2><span className="contador">{atrasadas.length}</span></div>
          {!atrasadas.length ? <p className="muted">Nenhuma parcela atrasada. Ótimo!</p> : (
            <div className="linhas-g">
              {atrasadas.slice(0, 6).map((p) => (
                <div key={p.id} className="linha-g">
                  <div><Link href={`${baseFin}/clientes/${p.contrato.cliente?.id}`}><b>{p.contrato.cliente?.nome || p.contrato.cliente_nome}</b></Link><small>{moeda(p.valor)} · venceu há {diasEntre(p.vencimento, hoje)} dia{diasEntre(p.vencimento, hoje) > 1 ? 's' : ''}</small></div>
                  {p.contrato.cliente?.telefone
                    ? <a className="btn peq whats" href={linkWhatsApp(p.contrato.cliente.telefone, mensagemCobranca(p))} target="_blank" rel="noopener noreferrer">Cobrar</a>
                    : <span className="badge b-vermelho">{data(p.vencimento)}</span>}
                </div>
              ))}
              {atrasadas.length > 6 && <Link href={`${baseFin}/parcelas${q({ situacao: 'atrasadas' })}`} className="ver-tudo" style={{ paddingTop: 10 }}>Ver todas as {atrasadas.length} ›</Link>}
            </div>
          )}
        </div>

        <div className="b-card b-lista">
          <div className="b-topo"><h2><CalendarClock className="ico" />Vencem esta semana</h2><span className="contador">{semana.length}</span></div>
          {!semana.length ? <p className="muted">Nada vence nos próximos 7 dias.</p> : (
            <div className="linhas-g">
              {semana.slice(0, 6).map((p) => (
                <div key={p.id} className="linha-g">
                  <div><Link href={`${baseFin}/clientes/${p.contrato.cliente?.id}`}><b>{p.contrato.cliente?.nome || p.contrato.cliente_nome}</b></Link><small>{moeda(p.valor)} · {p.status === 'a_emitir' ? 'boleto a emitir' : 'boleto emitido'}</small></div>
                  <span className={`badge ${p.status === 'a_emitir' ? 'b-amarelo' : 'b-azul'}`}>{p.vencimento === hoje ? 'Hoje' : data(p.vencimento).slice(0, 5)}</span>
                </div>
              ))}
              {semana.length > 6 && <Link href={`${baseFin}/cobranca${q({})}`} className="ver-tudo" style={{ paddingTop: 10 }}>Ver todas ›</Link>}
            </div>
          )}
        </div>

        <div className="b-card b-lista">
          <div className="b-topo"><h2><RefreshCw className="ico" />Terminam em 30 dias</h2><span className="contador">{terminando.length}</span></div>
          {!terminando.length ? <p className="muted">Nenhum contrato terminando.</p> : (
            <div className="linhas-g">
              {terminando.slice(0, 6).map((c) => (
                <div key={c.id} className="linha-g">
                  <div><b>{c.cliente_nome}</b><small>{moeda(c.valor_mensal)}/mês · {c.vendedor?.nome}</small></div>
                  <span className="badge b-amarelo">{data(c.data_fim).slice(0, 5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="secao-titulo"><h2>Comissão por vendedor em {nomeMes(mesCom)}</h2><Link href={`${baseFin}/comissoes${q({ mes: mesCom })}`}>Ver detalhes</Link></div>
      {!comissoes.length ? <div className="vazio">Nenhuma parcela paga neste fechamento ainda.</div> : (
        <div className="tabela"><table>
          <thead><tr><th>Vendedor</th><th>Recebido dos clientes</th><th>%</th><th>Comissão</th><th>Situação</th></tr></thead>
          <tbody>{comissoes.map((v) => (
            <tr key={v.id}><td><b>{v.nome}</b></td><td>{moeda(v.recebido)}</td><td>{String(v.pct).replace('.', ',')}%</td><td><b>{moeda(v.comissao)}</b></td>
              <td>{v.pago ? <span className="badge b-verde">Paga</span> : <span className="badge b-amarelo">A pagar</span>}</td></tr>
          ))}</tbody>
        </table></div>
      )}

      <div className="secao-titulo"><h2>Filtrar por vendedor ou período</h2></div>
      <Filtros vendedores={vendedores || []} sp={searchParams} />
      <p className="muted" style={{ fontSize: '.88rem', marginTop: 12 }}>
        Regra: só gera comissão a venda registrada no sistema. A comissão fecha todo dia {DIA_CORTE}: parcela paga até o dia {DIA_CORTE} entra no mês; paga depois, entra no mês seguinte.
      </p>
    </>
  );
}

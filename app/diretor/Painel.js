'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  Wallet, FileCheck2, CalendarClock, AlertTriangle, Users, Trophy, Car, Radio, Rocket, ChevronRight, LayoutDashboard, LogOut, TrendingUp, TrendingDown,
} from 'lucide-react';
import { moeda, data } from '@/lib/format';
import { plural, primeiro, BotaoTemaPainel, Folha, Bloco, Titulo, Numeros, Linha, VerTudo } from './Pecas';

// R$ 107.240 (sem centavos: leitura rápida)
const real = (v) => moeda(Math.round(v)).replace(/,\d\d$/, '');
const mil = (v) => (v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: v >= 100000 ? 0 : 1 })} mil` : Math.round(v).toLocaleString('pt-BR'));

export default function Painel({ dados, ola, dataLonga, demo = false }) {
  const [aberto, setAberto] = useState(null);
  const fechar = useCallback(() => setAberto(null), []);
  const { faturamento: f, contratos: c, vencendo: v, atraso: a, equipe: e, grade: g } = dados;

  const blocos = [
    {
      id: 'contratos', Ico: FileCheck2, tom: 'laranja', rotulo: 'Contratos ativos',
      valor: c.ativos, sub: `${real(f.mensal)} por mês`, extra: c.pendentes ? `+ ${c.pendentes} aguardando assinatura` : null,
    },
    {
      id: 'vencendo', Ico: CalendarClock, tom: v.lista.length ? 'amarelo' : 'neutro', rotulo: 'Vencem em 30 dias',
      valor: v.lista.length, sub: v.lista.length ? `${real(v.mensal)}/mês para renovar` : 'Nenhum contrato vencendo',
    },
    {
      id: 'atraso', Ico: AlertTriangle, tom: a.parcelas ? 'vermelho' : 'verde', rotulo: 'Em atraso',
      valor: a.parcelas ? real(a.valor) : 'Em dia', pequeno: true,
      sub: a.parcelas ? `${plural(a.parcelas, 'parcela', 'parcelas')} · ${plural(a.clientes.length, 'cliente', 'clientes')}` : 'Nenhuma parcela atrasada',
    },
    {
      id: 'vendas', Ico: Rocket, tom: 'verde', rotulo: 'Vendas no mês',
      valor: c.novosMes, sub: c.novosMes ? `${real(c.valorNovosMes)}/mês em contratos novos` : 'Nenhum contrato novo ainda',
    },
    {
      id: 'vendedores', Ico: Users, tom: 'azul', rotulo: 'Vendedores com contrato',
      valor: <>{e.comContrato}<span className="de">/{e.vendedores}</span></>, sub: e.vendedores - e.comContrato > 0 ? `${plural(e.vendedores - e.comContrato, 'vendedor', 'vendedores')} sem contrato ativo` : 'Toda a equipe com contrato ativo',
    },
    {
      id: 'destaque', Ico: Trophy, tom: 'ouro', rotulo: 'Destaque da equipe',
      valor: e.lider ? primeiro(e.lider.nome) : '—', pequeno: true,
      sub: e.lider ? `${plural(e.lider.ativos, 'contrato ativo', 'contratos ativos')} · ${real(e.lider.mensal)}/mês` : 'Ainda sem contratos ativos',
    },
    {
      id: 'equipe', Ico: Car, tom: 'roxo', rotulo: 'Equipe na rua',
      valor: e.visitas30, sub: `visitas em 30 dias · ${e.emVisita ? `${e.emVisita} em visita agora` : 'ninguém em visita agora'}`,
    },
    {
      id: 'grade', Ico: Radio, tom: 'neutro', rotulo: 'Grade vendida',
      valor: `${g.pct}%`, sub: `${g.ocupadas} de ${g.cotas} cotas · ${g.cotas - g.ocupadas} livres`, barra: g.pct,
    },
  ];

  const sobe = f.variacao !== null && f.variacao >= 0;

  return (
    <>
      <header className="dir-topo">
        <div className="dir-logos">
          <img src="/logos/96fm.png" alt="96 FM" />
          <img src="/logos/agro.png" alt="Rádio do Agro" />
        </div>
        <div className="dir-acoes">
          <BotaoTemaPainel />
          {demo ? <span className="dir-demo">Demonstração</span> : (
            <>
              <Link href="/gestao" className="dir-btn-topo" aria-label="Painel completo"><LayoutDashboard size={20} /><span>Painel completo</span></Link>
              <form action="/sair" method="post"><button className="dir-btn-topo" aria-label="Sair"><LogOut size={20} /></button></form>
            </>
          )}
        </div>
      </header>

      <main className="dir-conteudo">
        <div className="dir-ola">
          <small>{dataLonga}</small>
          <h1>{ola}</h1>
          <p>Painel do Diretor · 96 FM e Rádio do Agro</p>
        </div>

        <div className="dir-grade">
          <button type="button" className="dir-bloco dir-hero" onClick={() => setAberto('faturamento')}>
            <div className="dir-bloco-topo"><span className="dir-ico t-verde"><Wallet size={26} /></span><span className="dir-rotulo">Faturamento</span><ChevronRight className="dir-seta" /></div>
            <div className="dir-hero-num num">{real(f.mensal)}<span>/mês</span></div>
            <div className="dir-hero-sub">em {plural(c.ativos, 'contrato ativo', 'contratos ativos')}</div>
            <div className="dir-hero-mes">
              <div>
                <small>Recebido em {f.mes.rotulo}</small>
                <b className="num">{real(f.mes.recebido)}</b>
              </div>
              {f.variacao !== null && (
                <span className={`dir-var ${sobe ? 'sobe' : 'desce'}`}>{sobe ? <TrendingUp size={16} /> : <TrendingDown size={16} />}{sobe ? '+' : ''}{f.variacao}% vs {f.mesAnterior.rotulo}</span>
              )}
            </div>
            <div className="dir-trilho"><i style={{ width: `${f.pctMes}%` }} /></div>
            <div className="dir-hero-sub"><b>{f.pctMes}%</b> do previsto no mês ({real(f.mes.previsto)})</div>
          </button>

          {blocos.map((b) => <Bloco key={b.id} b={b} abrir={setAberto} />)}
        </div>

        <p className="dir-rodape">Toque em um quadro para ver os detalhes. Os números se atualizam sozinhos.</p>
      </main>

      <Folha aberto={aberto} fechar={fechar} demo={demo}><Detalhe id={aberto} dados={dados} /></Folha>
    </>
  );
}

function Detalhe({ id, dados }) {
  const { faturamento: f, contratos: c, vencendo: v, atraso: a, equipe: e, grade: g } = dados;

  if (id === 'faturamento') {
    const max = Math.max(1, ...f.serie.map((s) => Math.max(s.recebido, s.previsto)));
    return (
      <>
        <Titulo Ico={Wallet} tom="verde" sub="Quanto entra por mês com os contratos ativos">Faturamento</Titulo>
        <Numeros itens={[
          ['por mês em contratos ativos', real(f.mensal)],
          [`recebido em ${f.mes.rotulo}`, real(f.mes.recebido), 'verde'],
          [`previsto em ${f.mes.rotulo}`, real(f.mes.previsto)],
          ['a receber até o fim dos contratos', real(f.aReceber)],
        ]} />
        <h3 className="dir-d-sec">Por emissora</h3>
        {f.porRadio.map((r) => (
          <Linha key={r.id} titulo={<><i className="dir-bolinha" style={{ background: r.cor }} />{r.nome}</>} sub={plural(r.contratos, 'contrato ativo', 'contratos ativos')} valor={real(r.mensal)} valorSub="por mês" />
        ))}
        <h3 className="dir-d-sec">Recebido nos últimos 6 meses</h3>
        <div className="dir-barras">
          {f.serie.map((s, i) => (
            <div key={s.chave} className={i === 5 ? 'atual' : ''}>
              <small>{s.recebido ? mil(s.recebido) : ''}</small>
              <div className="dir-barra-trilho">
                <span className="prev" style={{ height: `${(s.previsto / max) * 100}%` }} />
                <span className="rec" style={{ height: `${Math.max(2, (s.recebido / max) * 100)}%` }} />
              </div>
              <em>{s.rotulo}</em>
            </div>
          ))}
        </div>
        <div className="dir-legenda"><span><i className="rec" />recebido</span><span><i className="prev" />previsto</span></div>
        <VerTudo href="/gestao/financeiro">Abrir o financeiro completo</VerTudo>
      </>
    );
  }

  if (id === 'contratos') {
    return (
      <>
        <Titulo Ico={FileCheck2} tom="laranja" sub={`${real(f.mensal)} por mês`}>{plural(c.ativos, 'contrato ativo', 'contratos ativos')}</Titulo>
        <Numeros itens={[
          ...f.porRadio.map((r) => [r.nome, r.contratos]),
          ['aguardando assinatura', c.pendentes, c.pendentes ? 'amarelo' : null],
          ['fechados neste mês', c.novosMes, 'verde'],
        ]} />
        {c.pendentes > 0 && <p className="dir-d-nota">Os {plural(c.pendentes, 'contrato', 'contratos')} aguardando assinatura somam mais {real(c.valorPendentes)} por mês quando forem assinados.</p>}
        <h3 className="dir-d-sec">Maiores contratos</h3>
        {c.maiores.map((x) => <Linha key={x.id} titulo={x.cliente} sub={`${x.programa} · ${x.vendedor}`} valor={real(x.mensal)} valorSub="por mês" />)}
        <VerTudo href="/gestao/contratos">Ver todos os contratos</VerTudo>
      </>
    );
  }

  if (id === 'vencendo') {
    return (
      <>
        <Titulo Ico={CalendarClock} tom="amarelo" sub="Hora de a equipe renovar">{plural(v.lista.length, 'contrato vence', 'contratos vencem')} em 30 dias</Titulo>
        {v.lista.length > 0 && <Numeros itens={[['por mês em jogo', real(v.mensal), 'amarelo'], ['vencem entre 31 e 60 dias', v.proximos60]]} />}
        {!v.lista.length && <p className="dir-d-vazio">Nenhum contrato vence nos próximos 30 dias.{v.proximos60 ? ` ${plural(v.proximos60, 'vence', 'vencem')} entre 31 e 60 dias.` : ''}</p>}
        {v.lista.map((x) => <Linha key={x.id} titulo={x.cliente} sub={`${x.programa} · ${x.vendedor}`} valor={data(x.fim).slice(0, 5)} valorSub={`${real(x.mensal)}/mês`} tom="amarelo" />)}
        <VerTudo href="/gestao/contratos">Ver contratos</VerTudo>
      </>
    );
  }

  if (id === 'atraso') {
    return (
      <>
        <Titulo Ico={AlertTriangle} tom={a.parcelas ? 'vermelho' : 'verde'} sub="Parcelas vencidas e não pagas">{a.parcelas ? `${real(a.valor)} em atraso` : 'Tudo em dia'}</Titulo>
        {!a.parcelas && <p className="dir-d-vazio">Nenhum cliente com parcela atrasada.</p>}
        {a.clientes.map((x) => <Linha key={x.cliente} titulo={x.cliente} sub={`${plural(x.parcelas, 'parcela', 'parcelas')} · desde ${data(x.desde).slice(0, 5)} · ${x.vendedor}`} valor={real(x.valor)} tom="vermelho" />)}
        <VerTudo href="/gestao/financeiro/parcelas?situacao=atrasadas">Ver cobrança</VerTudo>
      </>
    );
  }

  if (id === 'vendas') {
    const vendeu = e.lista.filter((x) => x.novosMes > 0).sort((x, y) => y.novosMes - x.novosMes);
    return (
      <>
        <Titulo Ico={Rocket} tom="verde" sub={`${f.mes.rotulo}: contratos novos fechados pela equipe`}>{plural(c.novosMes, 'venda', 'vendas')} no mês</Titulo>
        <Numeros itens={[['contratos novos', c.novosMes, 'verde'], ['por mês em vendas novas', real(c.valorNovosMes)], ['visitas que viraram contrato (30 dias)', e.fechadas30]]} />
        <h3 className="dir-d-sec">Quem vendeu</h3>
        {!vendeu.length && <p className="dir-d-vazio">Nenhum contrato novo neste mês ainda.</p>}
        {vendeu.map((x) => <Linha key={x.id} titulo={x.nome} valor={x.novosMes} valorSub={x.novosMes === 1 ? 'contrato' : 'contratos'} tom="verde" />)}
      </>
    );
  }

  if (id === 'vendedores') {
    const vend = e.lista.filter((x) => x.papel === 'vendedor');
    return (
      <>
        <Titulo Ico={Users} tom="azul" sub="Contratos ativos de cada vendedor">{e.comContrato} de {e.vendedores} vendedores com contrato</Titulo>
        {vend.map((x) => (
          <Linha key={x.id} titulo={x.nome} sub={x.ativos ? `${real(x.mensal)} por mês` : 'Sem contrato ativo'} valor={x.ativos} valorSub={x.ativos === 1 ? 'contrato' : 'contratos'} tom={x.ativos ? 'azul' : 'cinza'} />
        ))}
        <VerTudo href="/gestao/vendedores">Ver usuários</VerTudo>
      </>
    );
  }

  if (id === 'destaque') {
    const ranking = e.lista.filter((x) => x.ativos > 0).slice(0, 5);
    return (
      <>
        <Titulo Ico={Trophy} tom="ouro" sub="Quem tem mais contratos ativos">Destaque da equipe</Titulo>
        {e.lider ? (
          <div className="dir-lider">
            <span className="dir-avatar">{primeiro(e.lider.nome).charAt(0)}</span>
            <div><b>{e.lider.nome}</b><small>{plural(e.lider.ativos, 'contrato ativo', 'contratos ativos')} · {real(e.lider.mensal)} por mês{e.lider.novosMes ? ` · ${plural(e.lider.novosMes, 'venda', 'vendas')} no mês` : ''}</small></div>
          </div>
        ) : <p className="dir-d-vazio">Ainda não há contratos ativos.</p>}
        {ranking.length > 1 && <h3 className="dir-d-sec">Ranking</h3>}
        {ranking.length > 1 && ranking.map((x, i) => (
          <Linha key={x.id} titulo={<><span className="dir-pos">{i + 1}º</span>{x.nome}</>} sub={`${real(x.mensal)} por mês`} valor={x.ativos} valorSub={x.ativos === 1 ? 'contrato' : 'contratos'} tom={i === 0 ? 'ouro' : null} />
        ))}
      </>
    );
  }

  if (id === 'equipe') {
    return (
      <>
        <Titulo Ico={Car} tom="roxo" sub="Visitas aos clientes nos últimos 30 dias">Panorama da equipe</Titulo>
        <Numeros itens={[['visitas em 30 dias', e.visitas30, 'roxo'], ['em visita agora', e.emVisita], ['visitas que fecharam', e.fechadas30, 'verde'], ['aguardando assinatura', c.pendentes]]} />
        <h3 className="dir-d-sec">Cada vendedor</h3>
        {e.lista.map((x) => (
          <Linha key={x.id} titulo={<>{x.emVisita > 0 && <i className="dir-bolinha agora" title="Em visita agora" />}{x.nome}</>}
            sub={[`${plural(x.ativos, 'contrato ativo', 'contratos ativos')}`, x.novosMes ? `${x.novosMes} no mês` : null, x.emVisita ? 'em visita agora' : null].filter(Boolean).join(' · ')}
            valor={x.visitas30} valorSub={x.visitas30 === 1 ? 'visita' : 'visitas'} tom={x.visitas30 ? 'roxo' : 'cinza'} />
        ))}
      </>
    );
  }

  if (id === 'grade') {
    return (
      <>
        <Titulo Ico={Radio} tom="neutro" sub="Cotas de patrocínio ocupadas hoje">{g.pct}% da grade vendida</Titulo>
        {g.radios.map((r) => (
          <div key={r.id} className="dir-d-radio">
            <div className="dir-d-radio-topo"><b><i className="dir-bolinha" style={{ background: r.cor }} />{r.nome}</b><span className="num">{r.ocupadas}/{r.cotas}</span></div>
            <div className="dir-trilho"><i style={{ width: `${r.cotas ? (r.ocupadas / r.cotas) * 100 : 0}%`, background: r.cor }} /></div>
            {r.programas.map((p) => (
              <div key={p.nome} className="dir-d-prog">
                <span>{p.nome}</span>
                <span className={`dir-tag ${p.livres > 0 ? (p.livres === 1 ? 'amarelo' : 'verde') : 'vermelho'}`}>{p.livres > 0 ? `${plural(p.livres, 'livre', 'livres')}` : 'Lotado'}</span>
              </div>
            ))}
          </div>
        ))}
        <VerTudo href="/gestao/programas">Ver programas</VerTudo>
      </>
    );
  }
  return null;
}

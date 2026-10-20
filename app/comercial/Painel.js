'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  Rocket, Handshake, Hourglass, UserX, CalendarClock, FileSignature, Filter, Car, Radio, Trophy, ChevronRight, LayoutDashboard, LogOut, TrendingUp, TrendingDown, Target, Medal, Briefcase, Users,
} from 'lucide-react';
import { data, STATUS_VISITA } from '@/lib/format';
import { plural, primeiro, BotaoTemaPainel, Folha, Bloco, Titulo, Numeros, Linha, VerTudo } from '../diretor/Pecas';

const dias = (n) => (n === 1 ? '1 dia' : `${n} dias`);

export default function Painel({ dados, ola, dataLonga, base, demo = false }) {
  const [aberto, setAberto] = useState(null);
  const fechar = useCallback(() => setAberto(null), []);
  const { mes, vendas: vd, visitas: vs, funil: fu, negociacoes: ng, renovar: rn, assinatura: as, equipe: e, grade: g, prioridades, radio } = dados;

  const blocos = [
    {
      id: 'negociacoes', Ico: Handshake, tom: 'roxo', rotulo: 'Em negociação',
      valor: ng.lista.length, sub: ng.lista.length ? 'empresas com visita ou proposta em aberto' : 'Nenhuma negociação aberta',
    },
    {
      id: 'prazo', Ico: Hourglass, tom: ng.urgentes.length ? 'amarelo' : 'verde', rotulo: 'Prazo acabando',
      valor: ng.urgentes.length, sub: ng.urgentes.length ? 'negociações com até 5 dias de exclusividade' : 'Nenhum prazo apertado',
    },
    {
      id: 'parados', Ico: UserX, tom: e.parados.length ? 'vermelho' : 'verde', rotulo: 'Vendedores parados',
      valor: <>{e.parados.length}<span className="de">/{e.vendedores}</span></>, sub: e.parados.length ? 'sem visitar clientes há 7 dias ou mais' : 'Toda a equipe visitou na semana',
    },
    {
      id: 'renovar', Ico: CalendarClock, tom: rn.lista.length ? 'laranja' : 'neutro', rotulo: 'Renovar em 30 dias',
      valor: rn.lista.length, sub: rn.lista.length ? 'contratos perto do fim' : 'Nenhum contrato vencendo', extra: rn.proximos60 ? `+ ${rn.proximos60} entre 31 e 60 dias` : null,
    },
    {
      id: 'assinatura', Ico: FileSignature, tom: 'ouro', rotulo: 'Esperando assinatura',
      valor: as.length, sub: as.length ? 'contratos fechados que o cliente ainda não assinou' : 'Nenhum contrato pendente',
    },
    {
      id: 'funil', Ico: Filter, tom: 'azul', rotulo: 'Conversão 30 dias',
      valor: `${fu.conversao}%`, sub: `${fu.fechadas} de ${plural(fu.visitas, 'visita virou', 'visitas viraram')} contrato`, barra: fu.conversao,
    },
    {
      id: 'visitas', Ico: Car, tom: 'neutro', rotulo: `Visitas em ${mes.nome}`,
      valor: vs.mes, sub: `${vs.dias7} nos últimos 7 dias`,
    },
    {
      id: 'grade', Ico: Radio, tom: 'verde', rotulo: 'Cotas para vender',
      valor: g.livres, sub: `livres em ${plural(g.comVaga, 'programa', 'programas')} · ${g.pct}% da grade vendida`, barra: g.pct,
    },
  ];

  const dif = vd.mes - vd.antAteHoje;
  const top = e.lista.filter((x) => x.vendasMes > 0 || x.visitasMes > 0).slice(0, 3);

  return (
    <>
      <div className="dir-app">
        <Menu demo={demo} base={base} />
        <div className="dir-app-main">
        <header className="dir-topo">
          <div className="dir-logos">
            <img src="/logos/96fm.png" alt="96 FM" />
            <img src="/logos/agro.png" alt="Rádio do Agro" />
          </div>
          <div className="dir-acoes">
            <BotaoTemaPainel />
            {demo ? <span className="dir-demo">Demonstração</span> : (
              <>
                <Link href="/app" className="dir-btn-topo" aria-label="Vender"><Briefcase size={20} /><span>Vender</span></Link>
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
            <p>Painel Comercial · desempenho da equipe</p>
          </div>
  
          <nav className="dir-radios" aria-label="Escolher rádio">
            {[{ id: null, nome: 'As duas rádios' }, ...radio.opcoes].map((r) => (
              <Link key={r.id || 'todas'} href={r.id ? `${base}?radio=${r.id}` : base} className={(r.id || null) === radio.atual ? 'ativa' : ''}>{r.nome}</Link>
            ))}
          </nav>
          {radio.atual && <p className="dir-radios-nota">Visitas e negociações não têm rádio cadastrada, então aparecem nas duas.</p>}
  
          {prioridades.length > 0 && (
            <section className="dir-foco">
              <h2><Target size={18} />Pede sua atenção hoje</h2>
              <div className="dir-foco-lista">
                {prioridades.map((p) => (
                  <button key={p.id} type="button" className={`dir-foco-item t-${p.tom}`} onClick={() => setAberto(p.abre)}>
                    <i />
                    <span><b>{p.titulo}</b><small>{p.sub}</small></span>
                    <ChevronRight className="dir-seta" />
                  </button>
                ))}
              </div>
            </section>
          )}
  
          <div className="dir-grade">
            <button type="button" className="dir-bloco dir-hero" onClick={() => setAberto('ranking')}>
              <div className="dir-bloco-topo"><span className="dir-ico t-verde"><Rocket size={26} /></span><span className="dir-rotulo">Vendas da equipe em {mes.nome}</span><ChevronRight className="dir-seta" /></div>
              <div className="dir-hero-num num">{vd.mes}<span>{vd.mes === 1 ? 'contrato novo' : 'contratos novos'}</span></div>
              <div className="dir-hero-mes">
                <div className="dir-hero-sub">{vs.mes} visitas · {fu.conversao}% de conversão · {ng.lista.length} em negociação</div>
                {(vd.mes > 0 || vd.antAteHoje > 0) && (
                  <span className={`dir-var ${dif >= 0 ? 'sobe' : 'desce'}`}>{dif >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}{dif >= 0 ? '+' : ''}{dif} vs {mes.anterior} até hoje</span>
                )}
              </div>
              {top.length > 0 && (
                <div className="dir-podio">
                  {top.map((x, i) => (
                    <div key={x.id} className={i === 0 ? 'primeiro' : ''}>
                      <span className="dir-pos">{i + 1}º</span>
                      <b>{primeiro(x.nome)}</b>
                      <small>{plural(x.vendasMes, 'venda', 'vendas')} · {plural(x.visitasMes, 'visita', 'visitas')}</small>
                    </div>
                  ))}
                </div>
              )}
              <div className="dir-hero-sub">Toque para ver o ranking completo</div>
            </button>
  
            {blocos.map((b) => <Bloco key={b.id} b={b} abrir={setAberto} />)}
          </div>
  
          <section className="dir-so-pc" aria-label="Equipe">
            <h2><Users size={18} />Equipe em {mes.nome}</h2>
            <table className="dir-tabela">
              <thead>
                <tr><th>Vendedor</th><th>Vendas</th><th>Visitas</th><th>Em negociação</th><th>Conversão 30d</th><th>Carteira</th><th>Última visita</th></tr>
              </thead>
              <tbody>
                {e.lista.map((x) => (
                  <tr key={x.id}>
                    <td>{x.nome}</td>
                    <td className="num">{x.vendasMes}</td>
                    <td className="num">{x.visitasMes}</td>
                    <td className="num">{x.negociando}</td>
                    <td className="num">{x.conversao === null ? '—' : `${x.conversao}%`}</td>
                    <td className="num">{x.carteira}</td>
                    <td>{x.semVisitaDias === null ? 'Sem visita no mês' : x.semVisitaDias === 0 ? 'Hoje' : `Há ${dias(x.semVisitaDias)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <p className="dir-rodape">Toque em um quadro para ver os detalhes. Os números se atualizam sozinhos.</p>
        </main>
        </div>
      </div>

      <Folha aberto={aberto} fechar={fechar} demo={demo}><Detalhe id={aberto} dados={dados} /></Folha>
    </>
  );
}

// Menu lateral do computador (só o que é de comercial, sem financeiro nem R$)
function Menu({ demo, base }) {
  return (
    <aside className="sidebar">
      <div className="marca-gestao">
        <div className="emissoras-mini">
          <img src="/logos/96fm.png" alt="96 FM" />
          <img src="/logos/agro.png" alt="Rádio do Agro" />
        </div>
        <b>Painel Comercial</b>
      </div>
      <nav className="nav-g">
        <Link href={base} className="ativo"><Target className="ico" />Painel</Link>
        {!demo && (
          <>
            <Link href="/gestao/negociacoes"><Handshake className="ico" />Negociações</Link>
            <Link href="/gestao/programas"><Radio className="ico" />Programas</Link>
            <Link href="/app"><Briefcase className="ico" />Vender</Link>
          </>
        )}
      </nav>
      {!demo && (
        <div className="rodape">
          <div className="sep" />
          <form action="/sair" method="post">
            <button className="btn peq cinza" style={{ margin: '10px 0 0', width: '100%' }}><LogOut className="ico" />Sair</button>
          </form>
        </div>
      )}
    </aside>
  );
}

function Detalhe({ id, dados }) {
  const { mes, vendas: vd, visitas: vs, funil: fu, negociacoes: ng, renovar: rn, assinatura: as, equipe: e, grade: g } = dados;

  if (id === 'ranking') {
    const destaques = [
      e.lider && [Trophy, 'ouro', 'Mais vendas no mês', e.lider.nome, plural(e.lider.vendasMes, 'contrato novo', 'contratos novos')],
      e.maisVisitas?.visitasMes > 0 && [Car, 'roxo', 'Mais visitas no mês', e.maisVisitas.nome, plural(e.maisVisitas.visitasMes, 'visita', 'visitas')],
      e.melhorConversao?.conversao > 0 && [Filter, 'azul', 'Melhor conversão (30 dias)', e.melhorConversao.nome, `${e.melhorConversao.conversao}% das visitas viraram contrato`],
      e.maiorCarteira?.carteira > 0 && [Medal, 'verde', 'Maior carteira ativa', e.maiorCarteira.nome, plural(e.maiorCarteira.carteira, 'contrato ativo', 'contratos ativos')],
    ].filter(Boolean);
    return (
      <>
        <Titulo Ico={Trophy} tom="ouro" sub={`Contratos novos em ${mes.nome}, depois visitas`}>Ranking da equipe</Titulo>
        <Numeros itens={[
          [`contratos novos em ${mes.nome}`, vd.mes, 'verde'],
          [`em ${mes.anterior} até o mesmo dia`, vd.antAteHoje],
          [`no mês de ${mes.anterior} inteiro`, vd.anterior],
          [`visitas em ${mes.nome}`, vs.mes, 'roxo'],
        ]} />
        <h3 className="dir-d-sec">Classificação</h3>
        {e.lista.map((x, i) => (
          <Linha key={x.id} titulo={<><span className="dir-pos">{i + 1}º</span>{x.nome}</>}
            sub={[plural(x.visitasMes, 'visita', 'visitas'), x.negociando ? `${x.negociando} em negociação` : null, `carteira ${x.carteira}`].filter(Boolean).join(' · ')}
            valor={x.vendasMes} valorSub={x.vendasMes === 1 ? 'venda' : 'vendas'} tom={i === 0 && x.vendasMes ? 'ouro' : x.vendasMes ? 'verde' : 'cinza'} />
        ))}
        {destaques.length > 0 && <h3 className="dir-d-sec">Destaques</h3>}
        {destaques.map(([Ico, tom, rotulo, nome, sub]) => (
          <div key={rotulo} className={`dir-destaque t-${tom}`}>
            <span className={`dir-ico t-${tom}`}><Ico size={22} /></span>
            <div><small>{rotulo}</small><b>{nome}</b><em>{sub}</em></div>
          </div>
        ))}
      </>
    );
  }

  if (id === 'negociacoes') {
    const porVend = e.lista.filter((x) => x.negociando > 0).sort((a, b) => b.negociando - a.negociando);
    return (
      <>
        <Titulo Ico={Handshake} tom="roxo" sub="Empresas com visita ou proposta em aberto">{plural(ng.lista.length, 'negociação', 'negociações')}</Titulo>
        <Numeros itens={[
          ['visitas em andamento', ng.lista.filter((n) => n.status === 'em_andamento').length, 'roxo'],
          ['propostas enviadas', ng.lista.filter((n) => n.status === 'proposta').length, 'azul'],
        ]} />
        {porVend.length > 0 && <h3 className="dir-d-sec">Por vendedor</h3>}
        {porVend.map((x) => <Linha key={x.id} titulo={x.nome} valor={x.negociando} valorSub={x.negociando === 1 ? 'negociação' : 'negociações'} tom="roxo" />)}
        <h3 className="dir-d-sec">Empresas</h3>
        {!ng.lista.length && <p className="dir-d-vazio">Nenhuma negociação aberta agora.</p>}
        {ng.lista.map((n) => (
          <Linha key={n.id} titulo={n.cliente} sub={`${n.vendedor} · ${STATUS_VISITA[n.status]} · há ${dias(n.dias)}`}
            valor={n.vencido ? 'Encerrado' : dias(n.restam)} valorSub={n.vencido ? 'prazo' : `de prazo · até ${n.ate}`} tom={n.vencido ? 'vermelho' : n.urgente ? 'amarelo' : 'cinza'} />
        ))}
        <VerTudo href="/gestao/negociacoes">Abrir negociações</VerTudo>
      </>
    );
  }

  if (id === 'prazo') {
    return (
      <>
        <Titulo Ico={Hourglass} tom="amarelo" sub="Exclusividade do vendedor perto de acabar">Prazo acabando</Titulo>
        <p className="dir-d-nota">Depois do prazo a empresa fica livre para outro vendedor. Uma ligação, uma visita em dupla ou uma condição ajustada pode ajudar a fechar a tempo.</p>
        {!ng.urgentes.length && <p className="dir-d-vazio">Nenhuma negociação com prazo apertado.</p>}
        {ng.urgentes.map((n) => <Linha key={n.id} titulo={n.cliente} sub={`${n.vendedor} · ${STATUS_VISITA[n.status]}`} valor={dias(n.restam)} valorSub={`até ${n.ate}`} tom="amarelo" />)}
        {ng.vencidas.length > 0 && <h3 className="dir-d-sec">Prazo já encerrado, ainda sem resposta</h3>}
        {ng.vencidas.map((n) => <Linha key={n.id} titulo={n.cliente} sub={`${n.vendedor} · ${STATUS_VISITA[n.status]}`} valor="Encerrado" tom="vermelho" />)}
        <VerTudo href="/gestao/negociacoes">Abrir negociações</VerTudo>
      </>
    );
  }

  if (id === 'parados') {
    const ativos = e.lista.filter((x) => x.papel === 'vendedor' && !e.parados.includes(x)).sort((a, b) => b.visitas7 - a.visitas7);
    return (
      <>
        <Titulo Ico={UserX} tom={e.parados.length ? 'vermelho' : 'verde'} sub="Sem visitar clientes há 7 dias ou mais">{e.parados.length ? plural(e.parados.length, 'vendedor parado', 'vendedores parados') : 'Equipe em movimento'}</Titulo>
        {!e.parados.length && <p className="dir-d-vazio">Todos os vendedores visitaram clientes nos últimos 7 dias.</p>}
        {e.parados.map((x) => (
          <Linha key={x.id} titulo={x.nome} sub={[`carteira ${x.carteira}`, x.negociando ? `${x.negociando} em negociação` : 'nada em negociação'].join(' · ')}
            valor={x.semVisitaDias === null ? '30+' : x.semVisitaDias} valorSub="dias sem visita" tom="vermelho" />
        ))}
        {ativos.length > 0 && <h3 className="dir-d-sec">Visitaram nos últimos 7 dias</h3>}
        {ativos.map((x) => <Linha key={x.id} titulo={x.nome} sub={x.semVisitaDias === 0 ? 'visitou hoje' : `última visita há ${dias(x.semVisitaDias)}`} valor={x.visitas7} valorSub={x.visitas7 === 1 ? 'visita' : 'visitas'} tom="verde" />)}
      </>
    );
  }

  if (id === 'renovar') {
    return (
      <>
        <Titulo Ico={CalendarClock} tom="laranja" sub="Hora de o vendedor conversar com o cliente">{plural(rn.lista.length, 'contrato vence', 'contratos vencem')} em 30 dias</Titulo>
        {!rn.lista.length && <p className="dir-d-vazio">Nenhum contrato vence nos próximos 30 dias.{rn.proximos60 ? ` ${plural(rn.proximos60, 'vence', 'vencem')} entre 31 e 60 dias.` : ''}</p>}
        {rn.lista.length > 0 && rn.proximos60 > 0 && <p className="dir-d-nota">Mais {plural(rn.proximos60, 'contrato vence', 'contratos vencem')} entre 31 e 60 dias.</p>}
        {rn.lista.map((x) => <Linha key={x.id} titulo={x.cliente} sub={`${x.programa} · ${x.vendedor}`} valor={data(x.fim).slice(0, 5)} valorSub={x.dias === 0 ? 'vence hoje' : `em ${dias(x.dias)}`} tom={x.dias <= 10 ? 'vermelho' : 'laranja'} />)}
      </>
    );
  }

  if (id === 'assinatura') {
    return (
      <>
        <Titulo Ico={FileSignature} tom="ouro" sub="O vendedor fechou, falta o cliente assinar">{plural(as.length, 'contrato esperando', 'contratos esperando')} assinatura</Titulo>
        {!as.length && <p className="dir-d-vazio">Nenhum contrato aguardando assinatura.</p>}
        {as.map((x) => <Linha key={x.id} titulo={x.cliente} sub={`${x.programa} · ${x.vendedor}`} valor={x.dias} valorSub={x.dias === 1 ? 'dia esperando' : 'dias esperando'} tom={x.dias >= 7 ? 'vermelho' : 'ouro'} />)}
      </>
    );
  }

  if (id === 'funil') {
    const etapas = [
      ['Visitas iniciadas', fu.visitas, 'roxo'],
      ['Chegaram à proposta', fu.propostas, 'azul'],
      ['Viraram contrato', fu.fechadas, 'verde'],
    ];
    const max = Math.max(1, fu.visitas);
    const porVend = e.lista.filter((x) => x.visitas30 > 0).sort((a, b) => (b.conversao ?? 0) - (a.conversao ?? 0) || b.visitas30 - a.visitas30);
    return (
      <>
        <Titulo Ico={Filter} tom="azul" sub="Do primeiro contato ao contrato, últimos 30 dias">{fu.conversao}% de conversão</Titulo>
        <div className="dir-funil">
          {etapas.map(([rotulo, n, tom]) => (
            <div key={rotulo} className={`t-${tom}`}>
              <span>{rotulo}</span>
              <div className="dir-funil-barra"><i style={{ width: `${Math.max(4, (n / max) * 100)}%` }} /></div>
              <b className="num">{n}</b>
            </div>
          ))}
        </div>
        <Numeros itens={[['ainda em aberto', fu.abertas, 'roxo'], ['perdidas', fu.perdidas, fu.perdidas ? 'vermelho' : null]]} />
        <h3 className="dir-d-sec">Conversão de cada vendedor</h3>
        {!porVend.length && <p className="dir-d-vazio">Nenhuma visita nos últimos 30 dias.</p>}
        {porVend.map((x) => <Linha key={x.id} titulo={x.nome} sub={`${x.fechadas30} de ${plural(x.visitas30, 'visita', 'visitas')}`} valor={`${x.conversao}%`} tom={x.conversao >= fu.conversao && x.conversao > 0 ? 'verde' : 'cinza'} />)}
      </>
    );
  }

  if (id === 'visitas') {
    const lista = e.lista.filter((x) => x.papel === 'vendedor' || x.visitasMes).sort((a, b) => b.visitasMes - a.visitasMes);
    return (
      <>
        <Titulo Ico={Car} tom="neutro" sub="A equipe na rua">{plural(vs.mes, 'visita', 'visitas')} em {mes.nome}</Titulo>
        <Numeros itens={[['nos últimos 7 dias', vs.dias7, 'roxo'], ['nos últimos 30 dias', vs.dias30]]} />
        <h3 className="dir-d-sec">Cada vendedor no mês</h3>
        {lista.map((x) => (
          <Linha key={x.id} titulo={x.nome} sub={x.semVisitaDias === null ? 'sem visita no último mês' : x.semVisitaDias === 0 ? 'visitou hoje' : `última visita há ${dias(x.semVisitaDias)}`}
            valor={x.visitasMes} valorSub={x.visitasMes === 1 ? 'visita' : 'visitas'} tom={x.visitasMes ? 'roxo' : 'cinza'} />
        ))}
      </>
    );
  }

  if (id === 'grade') {
    return (
      <>
        <Titulo Ico={Radio} tom="verde" sub="Cotas de patrocínio ainda livres na grade">{plural(g.livres, 'cota livre', 'cotas livres')} para vender</Titulo>
        {g.radios.map((r) => (
          <div key={r.id} className="dir-d-radio">
            <div className="dir-d-radio-topo"><b><i className="dir-bolinha" style={{ background: r.cor }} />{r.nome}</b><span className="num">{plural(r.livres, 'livre', 'livres')}</span></div>
            <div className="dir-trilho"><i style={{ width: `${r.cotas ? ((r.cotas - r.livres) / r.cotas) * 100 : 0}%`, background: r.cor }} /></div>
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

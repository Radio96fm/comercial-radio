import { createContext, useContext } from 'react';

// Miniaturas das telas do app do vendedor, desenhadas como o app é hoje
// (mesmos textos e botões), para aparecer dentro das caixas do mapa.
// Os botões marcados com "k" são tocáveis: abrem a seta para a próxima tela.

export const TELAS = {
  inicio: 'Início do app',
  perfil: 'Meus dados',
  condicoes: 'Condições especiais',
  assistente: 'Tirar dúvida com a IA',
  visitas: 'Visitas',
  empresa: 'Nova visita: empresa',
  contato: 'Nova visita: contato',
  visita: 'Visita aberta',
  radio96: 'Programas da 96 FM',
  radioagro: 'Programas da Rádio do Agro',
  programa: 'Programa e planos',
  personalizado: 'Plano personalizado',
  proposta: 'Enviar proposta',
  aprovou: 'Cliente aprovou?',
  cadastro: 'Cadastro completo',
  contrato: 'Novo contrato',
  assinar: 'Contrato pendente',
  ativo: 'Contrato ativo',
  clientes: 'Clientes',
  clientenovo: 'Novo cliente',
  ficha: 'Ficha do cliente',
  testemunhal: 'Criar testemunhal',
  ganhos: 'Meus ganhos',
  conquistas: 'Conquistas',
  renovar: 'Hora de renovar',
  ganhoscontratos: 'Contratos que pagam você',
};

// mapas salvos antes das telas guardarem o campo "tela"
const TELA_PADRAO = {
  n1: 'inicio', n2: 'empresa', n3: 'contato', n4: 'visita', r96: 'radio96', ragro: 'radioagro', n6: 'programa',
  n7: 'proposta', n8: 'aprovou', n9: 'cadastro', n10: 'contrato', n11: 'assinar', n13: 'ativo',
};

export const telaDe = (n) => (n.tela !== undefined ? n.tela : TELA_PADRAO[n.id]) || '';

// { tem: Set dos botões com seta, abertos: Set dos já tocados, ir(k) }
const Toque = createContext(null);

function Hot({ k, className = '', children, style }) {
  const t = useContext(Toque);
  if (!k || !t?.tem.has(k)) return <div className={className} style={style}>{children}</div>;
  const aberto = t.abertos.has(k);
  return (
    <div
      className={`${className} tl-hot ${aberto ? 'aberto' : ''}`}
      style={style}
      role="button"
      tabIndex={0}
      title={aberto ? 'Fechar este caminho' : 'Abrir este caminho'}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); t.ir(k); }}
      onKeyDown={(e) => { if (e.key === 'Enter') t.ir(k); }}
    >
      {children}
    </div>
  );
}

const Campo = ({ r, v }) => <div className="tl-campo"><small>{r}</small><div>{v || ' '}</div></div>;
const Bt = ({ c = '', t, k }) => <Hot k={k} className={`tl-bt ${c}`}>{t}</Hot>;
const Topo = ({ t }) => <div className="tl-topo"><span>‹</span>{t}</div>;
const Nav = ({ on }) => (
  <div className="tl-nav">
    {[['inicio', 'Início'], ['visitas', 'Visitas'], ['clientes', 'Clientes'], ['ganhos', 'Ganhos']].map(([k, t]) => (
      <Hot key={k} k={k === on ? '' : k} className={k === on ? 'on' : ''}>{t}</Hot>
    ))}
  </div>
);
const Prog = ({ n, h, l, cor, k }) => <Hot k={k} className="tl-prog" style={{ '--c': cor }}><div><b>{n}</b><small>{h}</small></div><span><b>{l}</b> livres</span></Hot>;
const Item = ({ t, b, c = 'v', k }) => <Hot k={k} className="tl-item"><b>{t}</b>{b && <span className={`tl-badge ${c}`}>{b}</span>}</Hot>;
const Bolha = ({ eu, t }) => <div className={`tl-bolha ${eu ? 'eu' : ''}`}>{t}</div>;

function Programas({ radio, nome, cor, progs }) {
  return (
    <>
      <div className={`tl-faixa ${radio}`}><b>{nome}</b><small>Toque num programa</small></div>
      {progs.map(([n, h, l], i) => <Prog key={n} n={n} h={h} l={l} cor={cor} k={i === 0 ? 'programa' : ''} />)}
      <div className="tl-sec">Tabela de inserções e testemunhais</div>
      <Bt c={radio} t="Montar plano personalizado" k="personalizado" />
    </>
  );
}

function Conteudo({ tela }) {
  switch (tela) {
    case 'inicio': return (
      <>
        <div className="tl-ola"><Hot k="perfil" className="tl-av">M</Hot><div><small>Bom trabalho,</small><b>Maycon</b></div></div>
        <Hot k="aviso" className="tl-cond">2 condições especiais valendo</Hot>
        <Hot k="r96" className="tl-radio c96"><b>96 FM</b><small>7 programas</small></Hot>
        <Hot k="ragro" className="tl-radio cagro"><b>Rádio do Agro</b><small>6 programas</small></Hot>
        <Bt c="claro" t="Iniciar visita" k="iniciar" />
        <div className="tl-sec">Em visitação agora</div>
        <Item t="Posto Estrela do Sul" b="há 2 dias" k="visita" />
        <Item t="LimpeLar" b="há 5 dias" />
        <Bt c="sec" t="Tirar dúvida com a IA" k="ia" />
        <Nav on="inicio" />
      </>
    );
    case 'perfil': return (
      <>
        <Topo t="Meus dados" />
        <Campo r="Nome completo *" v="Maycon Souza" />
        <Campo r="CPF (ou CNPJ)" v="000.000.000-00" />
        <Campo r="Telefone / WhatsApp" v="(64) 99999-0000" />
        <Campo r="E-mail de acesso" v="maycon@radio96fm.com" />
        <div className="tl-sec">Aparência</div>
        <div className="tl-seg"><span className="on">Escuro</span><span>Claro</span><span>Auto</span></div>
        <Bt c="verde" t="Salvar" />
      </>
    );
    case 'condicoes': return (
      <>
        <Topo t="Condições especiais" />
        <div className="tl-cond">Bom Dia Produtor: fechando 12 meses, 10% de desconto</div>
        <Bt c="sec" t="Ver programa" k="verprograma" />
        <div className="tl-cond">Hora do Rush: 2 testemunhais de bônus</div>
        <Bt c="sec" t="Ver programa" />
        <Bt c="cinza" t="Entendi, fechar" />
      </>
    );
    case 'assistente': return (
      <>
        <Topo t="Tirar dúvida" />
        <Bolha eu t="Tem vaga no Bom Dia Produtor para farmácia?" />
        <Bolha t="Tem 4 cotas livres e nenhuma farmácia anunciando. O plano de 6 meses sai por R$ 2.208/mês." />
        <div className="tl-lado"><Campo v="Escreva ou fale..." /><Bt c="claro" t="Microfone" /></div>
      </>
    );
    case 'visitas': return (
      <>
        <Topo t="Visitas" />
        <Bt c="claro" t="Registrar nova visita" k="nova" />
        <div className="tl-sec">Em andamento (toda a equipe)</div>
        <Item t="Posto Estrela do Sul" b="Maycon" k="abrir" />
        <Item t="Agropecuária Boi Gordo" b="Carla" c="a" />
        <div className="tl-sec">Minhas visitas encerradas</div>
        <Item t="Ótica Visão" b="fechou" />
        <Item t="Mercado Bom Preço" b="não fechou" c="a" />
        <Nav on="visitas" />
      </>
    );
    case 'empresa': return (
      <>
        <Topo t="Nova visita" />
        <div className="tl-sec">Empresa</div>
        <Campo r="Nome da empresa *" v="Padaria Pão" />
        <div className="tl-item"><b>Padaria Pão Quente</b><span className="tl-badge a">em visita</span></div>
        <div className="tl-item"><b>Pão de Mel Doces</b><span className="tl-badge v">livre</span></div>
        <Campo r="Segmento *" v="Restaurante / Alimentação" />
        <Campo r="Cidade" />
        <Campo r="CNPJ ou CPF" v="se souber" />
        <Hot k="contato" className="tl-mais">Continua abaixo ↓</Hot>
      </>
    );
    case 'contato': return (
      <>
        <Topo t="Nova visita" />
        <div className="tl-sec">Com quem você está falando</div>
        <Campo r="Nome do contato *" v="Ex.: Rogério" />
        <Campo r="Cargo" v="Ex.: diretor de marketing" />
        <Campo r="Anotações (opcional)" v="Interesse no horário da manhã..." />
        <Bt c="verde" t="Iniciar visita" k="iniciar" />
      </>
    );
    case 'visita': return (
      <>
        <Topo t="Visita" />
        <b className="tl-h">Padaria Pão Quente</b>
        <div className="tl-prazo"><b>Exclusividade: 12 dias</b><i><span style={{ width: '25%' }} /></i></div>
        <Bt c="sec" t="Renovar por mais 15 dias" k="renovar" />
        <div className="tl-lado"><Bt c="sec" t="Ligar" /><Bt c="whats" t="WhatsApp" /></div>
        <div className="tl-sec">Escolha a rádio</div>
        <Hot k="r96" className="tl-radio c96 peq"><b>96 FM</b></Hot>
        <Hot k="ragro" className="tl-radio cagro peq"><b>Rádio do Agro</b></Hot>
        <Bt c="cinza" t="Não fechou" k="naofechou" />
      </>
    );
    case 'radio96': return <Programas radio="c96" nome="96 FM" cor="#ec7020" progs={[['Bom Dia Produtor', '07:00–08:00', 4], ['O Papo é com Ela', '09:00–10:00', 4], ['Rock Radio', '11:00–12:00', 3], ['Hora do Rush I', '17:00–18:00', 4]]} />;
    case 'radioagro': return <Programas radio="cagro" nome="Rádio do Agro" cor="#00b13e" progs={[['Alexandre Garcia', 'Seg a sex', 3], ['Agro em Foco', 'Seg a sex', 2], ['De Dentro da Porteira', 'Seg a sex', 4], ['Boa Tarde Produtor', 'Seg a sex', 5]]} />;
    case 'programa': return (
      <>
        <Topo t="96 FM" />
        <b className="tl-h">Bom Dia Produtor</b>
        <div className="tl-cotas">{[1, 1, 1, 1, 0, 0, 0, 0].map((c, i) => <i key={i} className={c ? 'on' : ''} />)}</div>
        <div className="tl-cond">Condição especial: fechando 12 meses...</div>
        <div className="tl-plano"><b>Plano 01</b><div className="tl-periodos"><span>3m<b>2.400</b></span><span>6m<b>2.208</b></span><span>12m<b>2.040</b></span></div></div>
        <small>Já anunciam: Farmácia, Posto, Mercado</small>
        <Bt c="verde" t="Fazer proposta deste plano" k="proposta" />
        <Bt c="sec" t="Fechar contrato (sem visita)" k="fechar" />
      </>
    );
    case 'personalizado': return (
      <>
        <Topo t="Plano personalizado" />
        <div className="tl-item"><b>Inserção 30s</b><span className="tl-qtd">− 20 +</span></div>
        <div className="tl-item"><b>Testemunhal</b><span className="tl-qtd">− 4 +</span></div>
        <div className="tl-item"><b>+ Programa (valor fechado)</b></div>
        <div className="tl-total"><span>Por mês</span><b>R$ 1.860</b></div>
        <Bt c="verde" t="Fazer contrato" k="contrato" />
      </>
    );
    case 'proposta': return (
      <>
        <Topo t="Enviar proposta" />
        <div className="tl-pdf"><b>Proposta Bom Dia Produtor.pdf</b><span>Ver</span></div>
        <Campo r="WhatsApp do contato" v="(64) 99999-0000" />
        <Campo r="Mensagem" v="Olá, Rogério! Segue a proposta..." />
        <Bt c="whats" t="Enviar PDF no WhatsApp" k="enviar" />
        <Bt c="sec" t="Enviar com link do PDF" />
      </>
    );
    case 'aprovou': return (
      <>
        <Topo t="Visita" />
        <div className="tl-resumo"><small>96 FM</small><b>Bom Dia Produtor</b><small>Proposta enviada em 20/10</small></div>
        <div className="tl-sec">O cliente aprovou a proposta?</div>
        <Bt c="verde" t="Cliente aprovou: fazer cadastro completo" k="aprovou" />
        <Bt c="sec" t="Reenviar proposta" k="reenviar" />
        <Bt c="cinza" t="Não fechou" k="naofechou" />
      </>
    );
    case 'cadastro': return (
      <>
        <Topo t="Cadastro completo" />
        <div className="tl-ok">Proposta aprovada! Complete os dados.</div>
        <Campo r="Razão social *" />
        <Campo r="CNPJ ou CPF *" />
        <Campo r="E-mail *" />
        <Campo r="Endereço *" />
        <Bt c="verde" t="Salvar e seguir para o contrato" k="salvar" />
      </>
    );
    case 'contrato': return (
      <>
        <Topo t="Novo contrato" />
        <div className="tl-sec">1. Cliente</div>
        <Campo v="Padaria Pão Quente" />
        <Hot k="novocliente" className="tl-mais">+ Cadastrar cliente novo</Hot>
        <div className="tl-sec">2. Período</div>
        <div className="tl-seg"><span>3</span><span className="on">6</span><span>12</span></div>
        <div className="tl-lado"><Campo r="Começa em *" v="01/11" /><Campo r="1º vencimento *" v="10/11" /></div>
        <div className="tl-total"><span>Por mês</span><b>R$ 2.208</b></div>
        <Bt c="verde" t="Criar contrato e gerar PDF" k="criar" />
      </>
    );
    case 'assinar': return (
      <>
        <Topo t="Contrato 0127" />
        <span className="tl-badge a">Pendente</span>
        <div className="tl-resumo"><b>Assinatura digital</b><small>Vai por e-mail e você recebe um link para o WhatsApp</small></div>
        <Bt c="verde" t="Enviar para o cliente assinar" k="assinar" />
        <Bt c="sec" t="Assinou no papel (ativar)" k="papel" />
        <Bt c="cinza" t="Cancelar contrato" k="cancelar" />
      </>
    );
    case 'ativo': return (
      <>
        <Topo t="Contrato 0127" />
        <span className="tl-badge v">Ativo</span>
        <div className="tl-ok">✓ Contrato assinado pelo cliente</div>
        <div className="tl-resumo"><small>O que foi contratado</small><b>Bom Dia Produtor · 6 meses</b></div>
        <Bt c="sec" t="Baixar contrato assinado" />
      </>
    );
    case 'clientes': return (
      <>
        <Topo t="Clientes" />
        <Bt c="claro" t="Cadastrar cliente" k="novo" />
        <Campo v="Buscar cliente..." />
        <Item t="Padaria Pão Quente" b="ativo" k="abrir" />
        <Item t="Ótica Visão" b="ativo" />
        <Item t="Mercado Bom Preço" b="sem contrato" c="a" />
        <Nav on="clientes" />
      </>
    );
    case 'clientenovo': return (
      <>
        <Topo t="Novo cliente" />
        <Campo r="Nome da empresa *" />
        <Campo r="Segmento *" />
        <Campo r="Contato" />
        <Campo r="Telefone" />
        <div className="tl-lado"><Campo r="Cidade" /><Campo r="CNPJ/CPF" /></div>
        <Bt c="verde" t="Salvar cliente" k="salvar" />
      </>
    );
    case 'ficha': return (
      <>
        <Topo t="Cliente" />
        <b className="tl-h">Padaria Pão Quente</b>
        <div className="tl-lado"><Bt c="sec" t="Ligar" /><Bt c="whats" t="WhatsApp" /></div>
        <Bt c="claro" t="Iniciar visita" k="iniciar" />
        <div className="tl-lado"><Bt c="sec" t="Novo contrato" k="contrato" /><Bt c="sec" t="Criar testemunhal" k="testemunhal" /></div>
        <div className="tl-sec">Contratos</div>
        <Item t="0127 · Bom Dia Produtor" b="ativo" />
        <div className="tl-sec">Visitas</div>
        <Item t="20/10 · Maycon" b="fechou" />
      </>
    );
    case 'testemunhal': return (
      <>
        <Topo t="Criar testemunhal" />
        <Bolha t="Roteiro: Na Padaria Pão Quente o pão sai quentinho às 6h..." />
        <Bolha eu t="Deixa mais curto e fala do café" />
        <Bolha t="Pronto! Versão de 20 segundos..." />
        <div className="tl-lado"><Campo v="Peça um ajuste..." /><Bt c="claro" t="Microfone" /></div>
      </>
    );
    case 'ganhos': return (
      <>
        <Topo t="Meus ganhos" />
        <div className="tl-total"><span>Comissão do mês</span><b>R$ 3.120</b></div>
        <small>+18% que o mês passado · recorde R$ 3.400 · 4 meses seguidos</small>
        <Item t="Boletos em atraso" b="1" c="a" />
        <Bt c="sec" t="Conquistas" k="conquistas" />
        <Bt c="sec" t="Hora de renovar" k="renovar" />
        <Bt c="sec" t="Contratos que pagam você" k="contratos" />
        <Nav on="ganhos" />
      </>
    );
    case 'conquistas': return (
      <>
        <Topo t="Conquistas" />
        <Item t="Primeira venda" b="ganhou" />
        <Item t="Mês recorde" b="ganhou" />
        <Item t="10 contratos" b="falta 3" c="a" />
      </>
    );
    case 'renovar': return (
      <>
        <Topo t="Hora de renovar" />
        <Item t="Ótica Visão · termina 15/11" b="20 dias" c="a" k="abrir" />
        <Item t="Posto Avenida · termina 30/11" b="35 dias" c="a" />
      </>
    );
    case 'ganhoscontratos': return (
      <>
        <Topo t="Contratos que pagam você" />
        <Item t="Padaria Pão Quente · R$ 397/mês" b="ativo" k="abrir" />
        <Item t="Ótica Visão · R$ 214/mês" b="ativo" />
      </>
    );
    default: return null;
  }
}

export default function TelaPrevia({ tela, tem, abertos, ir }) {
  if (!TELAS[tela]) return null;
  return (
    <Toque.Provider value={tem ? { tem, abertos, ir } : null}>
      <div className="tl-cel" aria-label={`Tela: ${TELAS[tela]}`}><div className="tl-tela"><Conteudo tela={tela} /></div></div>
    </Toque.Provider>
  );
}

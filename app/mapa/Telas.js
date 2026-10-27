// Miniaturas das telas do app do vendedor, desenhadas como o app é hoje
// (mesmos textos e botões), para aparecer dentro das caixas do mapa.

export const TELAS = {
  inicio: 'Início do app',
  empresa: 'Nova visita: empresa',
  contato: 'Nova visita: contato',
  visita: 'Visita aberta',
  radio96: 'Programas da 96 FM',
  radioagro: 'Programas da Rádio do Agro',
  programa: 'Programa e planos',
  proposta: 'Enviar proposta',
  aprovou: 'Cliente aprovou?',
  cadastro: 'Cadastro completo',
  contrato: 'Novo contrato',
  assinar: 'Contrato pendente',
  ativo: 'Contrato ativo',
};

// tela de cada caixa do mapa inicial (o mapa salvo guarda os mesmos ids)
export const TELA_PADRAO = {
  n1: 'inicio', n2: 'empresa', n3: 'contato', n4: 'visita', r96: 'radio96', ragro: 'radioagro', n6: 'programa',
  n7: 'proposta', n8: 'aprovou', n9: 'cadastro', n10: 'contrato', n11: 'assinar', n13: 'ativo',
};

export const telaDe = (n) => (n.tela !== undefined ? n.tela : TELA_PADRAO[n.id]) || '';

const Campo = ({ r, v }) => <div className="tl-campo"><small>{r}</small><div>{v || ' '}</div></div>;
const Bt = ({ c = '', t }) => <div className={`tl-bt ${c}`}>{t}</div>;
const Topo = ({ t }) => <div className="tl-topo"><span>‹</span>{t}</div>;
const Nav = () => <div className="tl-nav"><i className="on" /><i /><i /><i /></div>;
const Prog = ({ n, h, l, cor }) => <div className="tl-prog" style={{ '--c': cor }}><div><b>{n}</b><small>{h}</small></div><span><b>{l}</b> livres</span></div>;

function Conteudo({ tela }) {
  switch (tela) {
    case 'inicio': return (
      <>
        <div className="tl-ola"><i>M</i><div><small>Bom trabalho,</small><b>Maycon</b></div></div>
        <div className="tl-radio c96"><b>96 FM</b><small>7 programas</small></div>
        <div className="tl-radio cagro"><b>Rádio do Agro</b><small>6 programas</small></div>
        <Bt c="claro" t="Iniciar visita" />
        <div className="tl-sec">Em visitação agora</div>
        <div className="tl-item"><b>Posto Estrela do Sul</b><span className="tl-badge v">há 2 dias</span></div>
        <div className="tl-item"><b>LimpeLar</b><span className="tl-badge v">há 5 dias</span></div>
        <Nav />
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
      </>
    );
    case 'contato': return (
      <>
        <Topo t="Nova visita" />
        <div className="tl-sec">Com quem você está falando</div>
        <Campo r="Nome do contato *" v="Ex.: Rogério" />
        <Campo r="Cargo" v="Ex.: diretor de marketing" />
        <Campo r="Anotações (opcional)" v="Interesse no horário da manhã..." />
        <Bt c="verde" t="Iniciar visita" />
      </>
    );
    case 'visita': return (
      <>
        <Topo t="Visita" />
        <b className="tl-h">Padaria Pão Quente</b>
        <div className="tl-prazo"><b>Exclusividade: 12 dias</b><i><span style={{ width: '25%' }} /></i></div>
        <div className="tl-lado"><Bt c="sec" t="Ligar" /><Bt c="whats" t="WhatsApp" /></div>
        <div className="tl-sec">Escolha a rádio</div>
        <div className="tl-radio c96 peq"><b>96 FM</b></div>
        <div className="tl-radio cagro peq"><b>Rádio do Agro</b></div>
        <Bt c="cinza" t="Não fechou" />
      </>
    );
    case 'radio96': return (
      <>
        <div className="tl-faixa c96"><b>96 FM</b></div>
        <Prog n="Bom Dia Produtor" h="07:00–08:00" l="4" cor="#ec7020" />
        <Prog n="O Papo é com Ela" h="09:00–10:00" l="4" cor="#ec7020" />
        <Prog n="Rock Radio" h="11:00–12:00" l="3" cor="#ec7020" />
        <Prog n="Hora do Rush I" h="17:00–18:00" l="4" cor="#ec7020" />
        <Bt c="c96" t="Montar plano personalizado" />
      </>
    );
    case 'radioagro': return (
      <>
        <div className="tl-faixa cagro"><b>Rádio do Agro</b></div>
        <Prog n="Alexandre Garcia" h="Seg a sex" l="3" cor="#00b13e" />
        <Prog n="Agro em Foco" h="Seg a sex" l="2" cor="#00b13e" />
        <Prog n="De Dentro da Porteira" h="Seg a sex" l="4" cor="#00b13e" />
        <Prog n="Boa Tarde Produtor" h="Seg a sex" l="5" cor="#00b13e" />
        <Bt c="cagro" t="Montar plano personalizado" />
      </>
    );
    case 'programa': return (
      <>
        <Topo t="96 FM" />
        <b className="tl-h">Bom Dia Produtor</b>
        <div className="tl-cotas">{[1, 1, 1, 1, 0, 0, 0, 0].map((c, i) => <i key={i} className={c ? 'on' : ''} />)}</div>
        <div className="tl-cond">Condição especial: fechando 12 meses...</div>
        <div className="tl-plano"><b>Plano 01</b><div className="tl-periodos"><span>3m<b>2.400</b></span><span>6m<b>2.208</b></span><span>12m<b>2.040</b></span></div></div>
        <Bt c="verde" t="Fazer proposta deste plano" />
      </>
    );
    case 'proposta': return (
      <>
        <Topo t="Enviar proposta" />
        <div className="tl-pdf"><b>Proposta Bom Dia Produtor.pdf</b><span>Ver</span></div>
        <Campo r="WhatsApp do contato" v="(64) 99999-0000" />
        <Campo r="Mensagem" v="Olá, Rogério! Segue a proposta..." />
        <Bt c="whats" t="Enviar PDF no WhatsApp" />
        <Bt c="sec" t="Enviar com link do PDF" />
      </>
    );
    case 'aprovou': return (
      <>
        <Topo t="Visita" />
        <div className="tl-resumo"><small>96 FM</small><b>Bom Dia Produtor</b><small>Proposta enviada em 20/10</small></div>
        <div className="tl-sec">O cliente aprovou a proposta?</div>
        <Bt c="verde" t="Cliente aprovou: fazer cadastro completo" />
        <Bt c="sec" t="Reenviar proposta" />
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
        <Bt c="verde" t="Salvar e seguir para o contrato" />
      </>
    );
    case 'contrato': return (
      <>
        <Topo t="Novo contrato" />
        <div className="tl-sec">1. Cliente</div>
        <Campo v="Padaria Pão Quente" />
        <div className="tl-sec">2. Período</div>
        <div className="tl-seg"><span>3</span><span className="on">6</span><span>12</span></div>
        <div className="tl-lado"><Campo r="Começa em *" v="01/11" /><Campo r="1º vencimento *" v="10/11" /></div>
        <div className="tl-total"><span>Por mês</span><b>R$ 2.208</b></div>
        <Bt c="verde" t="Criar contrato e gerar PDF" />
      </>
    );
    case 'assinar': return (
      <>
        <Topo t="Contrato 0127" />
        <span className="tl-badge a">Pendente</span>
        <div className="tl-resumo"><b>Assinatura digital</b><small>Vai por e-mail e você recebe um link para o WhatsApp</small></div>
        <Bt c="verde" t="Enviar para o cliente assinar" />
        <Bt c="sec" t="Assinou no papel (ativar)" />
        <Bt c="cinza" t="Cancelar contrato" />
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
    default: return null;
  }
}

export default function TelaPrevia({ tela }) {
  if (!TELAS[tela]) return null;
  return <div className="tl-cel" aria-label={`Tela: ${TELAS[tela]}`}><div className="tl-tela"><Conteudo tela={tela} /></div></div>;
}

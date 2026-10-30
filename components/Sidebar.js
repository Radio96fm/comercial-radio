'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { bloqueado } from '@/lib/funcoes';
import {
  LayoutDashboard, Radio, Receipt, FileText, Wallet, Users, FileSignature, Tags, History, Smartphone, LogOut, Sparkles, Timer, BadgePercent, Send, Building2, TrendingUp, Crown, Target, FileUp, Workflow, Code2, KeyRound, Handshake, Activity, Plug, AppWindow, Columns3, Landmark, Settings,
} from 'lucide-react';

// m = só para o gestor master
const ITENS = [
  ['/gestao', LayoutDashboard, 'Visão geral', true],
  ['/gestao/programas', Radio, 'Programas'],
  ['/gestao/propostas', FileUp, 'Propostas em PDF'],
  ['/gestao/precos', Receipt, 'Tabela de preços'],
  ['/gestao/contratos', FileText, 'Contratos'],
  ['/gestao/clientes', Users, 'Clientes'],
  ['/gestao/negociacoes', Timer, 'Negociações'],
  ['/gestao/modelos', FileSignature, 'Modelo de contrato'],
  ['/gestao/cadastros', Tags, 'Rádios e segmentos'],
  ['/gestao/atividades', History, 'Histórico'],
];

const FINANCEIRO = [
  ['/gestao/financeiro', LayoutDashboard, 'Resumo financeiro', true],
  ['/gestao/financeiro/comissoes', BadgePercent, 'Comissões', true],
  ['/gestao/financeiro/comissoes/contratos', Columns3, 'Comissão por contrato'],
  ['/gestao/financeiro/parcelas', Wallet, 'Parcelas / boletos'],
  ['/gestao/financeiro/clientes', Building2, 'Clientes'],
  ['/gestao/financeiro/previsao', TrendingUp, 'Previsão'],
  ['/gestao/financeiro/cobranca', Send, 'Cobrança do mês'],
  ['/gestao/financeiro/contratos', FileText, 'Contratos fechados'],
  ['/gestao/financeiro/extrato', Landmark, 'Saldo e extrato'],
  ['/gestao/financeiro/banco', Settings, 'Configurar banco'],
];

const link = (path) => ([href, Ico, txt, exato]) => (
  <Link key={href} href={href} className={(exato ? path === href : path.startsWith(href)) ? 'ativo' : ''}>
    <Ico className="ico" />{txt}
  </Link>
);

// Menu do acesso do financeiro (/financeiro)
export function SidebarFinanceiro() {
  const path = usePathname();
  const itens = FINANCEIRO.map(([href, ...r]) => [href.replace('/gestao/financeiro', '/financeiro'), ...r]);
  itens[0][2] = 'Início';
  return (
    <aside className="sidebar nao-imprimir">
      <div className="marca-gestao">
        <div className="emissoras-mini">
          <img src="/logos/96fm.png" alt="96 FM" />
          <img src="/logos/agro.png" alt="Rádio do Agro" />
        </div>
        <b>Gestão Financeira</b>
      </div>
      <nav className="nav-g">{itens.map(link(path))}</nav>
      <div className="rodape">
        <div className="sep" />
        <form action="/sair" method="post">
          <button className="btn peq cinza" style={{ margin: '10px 0 0', width: '100%' }}><LogOut className="ico" />Sair</button>
        </form>
      </div>
    </aside>
  );
}

export default function Sidebar({ master, dev, bloqueadas = [] }) {
  const path = usePathname();
  const livre = (href) => !bloqueado(href, bloqueadas);
  return (
    <aside className="sidebar nao-imprimir">
      <div className="marca-gestao">
        <div className="emissoras-mini">
          <img src="/logos/96fm.png" alt="96 FM" />
          <img src="/logos/agro.png" alt="Rádio do Agro" />
        </div>
        <b>Gestão Comercial</b>
      </div>
      <nav className="nav-g">
        {ITENS.filter((i) => (master || i[4] !== 'm') && livre(i[0])).map(([href, Ico, txt, exato]) => (
          <Link key={href} href={href} className={(exato ? path === href : path.startsWith(href)) ? 'ativo' : ''}>
            <Ico className="ico" />{txt}
          </Link>
        ))}
        {master && livre('/gestao/financeiro') && (
          <>
            <span className="nav-grupo">Financeiro</span>
            {FINANCEIRO.map(([href, Ico, txt, exato]) => (
              <Link key={href} href={href} className={(exato ? path === href : path.startsWith(href)) ? 'ativo' : ''}>
                <Ico className="ico" />{txt}
              </Link>
            ))}
          </>
        )}
      </nav>
      <div className="rodape">
        <div className="sep" />
        {dev && <Link href="/dev"><Code2 className="ico" />Painel do desenvolvedor</Link>}
        {master && livre('/diretor') && <Link href="/diretor"><Crown className="ico" />Painel do Diretor</Link>}
        <Link href="/fluxo"><Workflow className="ico" />Mapa do fluxo</Link>
        {livre('/comercial') && <Link href="/comercial"><Target className="ico" />Painel Comercial</Link>}
        <Link href="/app"><Smartphone className="ico" />Abrir app do vendedor</Link>
        <form action="/sair" method="post">
          <button className="btn peq cinza" style={{ margin: '10px 0 0', width: '100%' }}><LogOut className="ico" />Sair</button>
        </form>
      </div>
    </aside>
  );
}

// Menu da demonstração sem login (/demo-gestao): o mesmo do diretor comercial,
// sem Financeiro. As telas que já têm demonstração abrem; o resto fica apagado.
const NA_DEMO = ['/gestao', '/gestao/programas', '/gestao/propostas', '/gestao/precos'];

export function SidebarDemo() {
  const path = usePathname();
  return (
    <aside className="sidebar nao-imprimir">
      <div className="marca-gestao">
        <div className="emissoras-mini">
          <img src="/logos/96fm.png" alt="96 FM" />
          <img src="/logos/agro.png" alt="Rádio do Agro" />
        </div>
        <b>Gestão Comercial</b>
      </div>
      <nav className="nav-g">
        {ITENS.filter((i) => i[4] !== 'm').map(([href, Ico, txt, exato]) => {
          if (!NA_DEMO.includes(href)) return <span key={href} className="demo-off" title="Disponível no sistema com login"><Ico className="ico" />{txt}</span>;
          const destino = href.replace('/gestao', '/demo-gestao');
          return (
            <Link key={href} href={destino} className={(exato ? path === destino : path.startsWith(destino)) ? 'ativo' : ''}>
              <Ico className="ico" />{txt}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

// Menu do Painel do Desenvolvedor (/dev): acessos e configurações do sistema
const DEV = [
  ['/dev', LayoutDashboard, 'Visão geral', true],
  ['/dev/movimento', Activity, 'Movimento'],
  ['/dev/contratos', Columns3, 'Contratos por vendedor'],
  ['/dev/vendedores', Handshake, 'Vendedores e agências'],
  ['/dev/acessos', KeyRound, 'Acessos'],
  ['/dev/integracoes', Plug, 'Integrações'],
  ['/dev/assistente', Sparkles, 'Treinar assistente'],
  ['/dev/paineis', AppWindow, 'Painéis'],
];

export function SidebarDev() {
  const path = usePathname();
  return (
    <aside className="sidebar nao-imprimir">
      <div className="marca-gestao">
        <div className="emissoras-mini">
          <img src="/logos/96fm.png" alt="96 FM" />
          <img src="/logos/agro.png" alt="Rádio do Agro" />
        </div>
        <b>Desenvolvedor</b>
      </div>
      <nav className="nav-g">{DEV.map(link(path))}</nav>
      <div className="rodape">
        <div className="sep" />
        <Link href="/gestao"><LayoutDashboard className="ico" />Gestão Comercial</Link>
        <Link href="/diretor"><Crown className="ico" />Painel do Diretor</Link>
        <Link href="/app"><Smartphone className="ico" />Abrir app do vendedor</Link>
        <form action="/sair" method="post">
          <button className="btn peq cinza" style={{ margin: '10px 0 0', width: '100%' }}><LogOut className="ico" />Sair</button>
        </form>
      </div>
    </aside>
  );
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Radio, Receipt, FileText, Wallet, Users, UserCog, FileSignature, Tags, History, Smartphone, LogOut, Sparkles, MessageCircleQuestion, Timer, BadgePercent, Send, Building2, TrendingUp, Crown, Target,
} from 'lucide-react';

// m = só para o gestor master
const ITENS = [
  ['/gestao', LayoutDashboard, 'Visão geral', true],
  ['/gestao/perguntar', MessageCircleQuestion, 'Perguntar à IA'],
  ['/gestao/programas', Radio, 'Programas'],
  ['/gestao/precos', Receipt, 'Tabela de preços'],
  ['/gestao/contratos', FileText, 'Contratos'],
  ['/gestao/clientes', Users, 'Clientes'],
  ['/gestao/negociacoes', Timer, 'Negociações'],
  ['/gestao/vendedores', UserCog, 'Usuários', false, 'm'],
  ['/gestao/modelos', FileSignature, 'Modelo de contrato'],
  ['/gestao/assistente', Sparkles, 'Treinar assistente', false, 'm'],
  ['/gestao/cadastros', Tags, 'Rádios e segmentos'],
  ['/gestao/atividades', History, 'Histórico'],
];

const FINANCEIRO = [
  ['/gestao/financeiro', LayoutDashboard, 'Resumo financeiro', true],
  ['/gestao/financeiro/comissoes', BadgePercent, 'Comissões'],
  ['/gestao/financeiro/parcelas', Wallet, 'Parcelas / boletos'],
  ['/gestao/financeiro/clientes', Building2, 'Clientes'],
  ['/gestao/financeiro/previsao', TrendingUp, 'Previsão'],
  ['/gestao/financeiro/cobranca', Send, 'Cobrança do mês'],
  ['/gestao/financeiro/contratos', FileText, 'Contratos fechados'],
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

export default function Sidebar({ master }) {
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
        {ITENS.filter((i) => master || i[4] !== 'm').map(([href, Ico, txt, exato]) => (
          <Link key={href} href={href} className={(exato ? path === href : path.startsWith(href)) ? 'ativo' : ''}>
            <Ico className="ico" />{txt}
          </Link>
        ))}
        {master && (
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
        {master && <Link href="/diretor"><Crown className="ico" />Painel do Diretor</Link>}
        <Link href="/comercial"><Target className="ico" />Painel Comercial</Link>
        <Link href="/app"><Smartphone className="ico" />Abrir app do vendedor</Link>
        <form action="/sair" method="post">
          <button className="btn peq cinza" style={{ margin: '10px 0 0', width: '100%' }}><LogOut className="ico" />Sair</button>
        </form>
      </div>
    </aside>
  );
}

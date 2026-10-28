import Link from 'next/link';
import { Crown, LayoutDashboard, Target, Wallet, Smartphone, Music, Workflow } from 'lucide-react';
import { requireDev } from '@/lib/auth';

// Todos os painéis do sistema, para o desenvolvedor entrar em cada um com o próprio login
const PAINEIS = [
  ['/diretor', Crown, 'Painel do Diretor', 'O que o Emmanoel vê no iPhone e iPad: faturamento, equipe e programas.'],
  ['/gestao', LayoutDashboard, 'Gestão Comercial', 'O sistema completo do comercial no computador: programas, preços, contratos e clientes.'],
  ['/comercial', Target, 'Painel Comercial', 'A versão de celular do diretor comercial, sem valores em R$.'],
  ['/gestao/financeiro', Wallet, 'Financeiro', 'Parcelas, boletos, comissões, previsão e cobrança do mês.'],
  ['/app', Smartphone, 'App do vendedor', 'Visitas, clientes, propostas, contratos e ganhos do vendedor.'],
  ['/fluxo', Workflow, 'Mapa do fluxo', 'O caminho do vendedor no app, tela por tela.'],
];

export default async function Paineis() {
  await requireDev();
  return (
    <>
      <div className="cabecalho"><h1>Painéis</h1><span className="muted">Entre em qualquer painel do sistema com o seu acesso</span></div>
      <div className="kpis">
        {PAINEIS.map(([href, Ico, titulo, desc]) => (
          <Link key={href} href={href} className="kpi" style={{ color: 'inherit' }}>
            <div className="kpi-topo">{titulo}<Ico className="ico" /></div>
            <div className="rotulo">{desc}</div>
          </Link>
        ))}
        <div className="kpi" style={{ opacity: 0.6 }}>
          <div className="kpi-topo">Departamento artístico<Music className="ico" /></div>
          <div className="rotulo">Ainda não existe. Quando for criado, entra aqui e ganha as funções em Acessos.</div>
        </div>
      </div>
    </>
  );
}

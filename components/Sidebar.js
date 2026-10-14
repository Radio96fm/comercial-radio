'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Radio, Receipt, FileText, Wallet, Users, UserCog, FileSignature, Tags, History, Smartphone, LogOut,
} from 'lucide-react';

const ITENS = [
  ['/gestao', LayoutDashboard, 'Visão geral', true],
  ['/gestao/programas', Radio, 'Programas'],
  ['/gestao/precos', Receipt, 'Tabela de preços'],
  ['/gestao/contratos', FileText, 'Contratos'],
  ['/gestao/parcelas', Wallet, 'Parcelas / boletos'],
  ['/gestao/clientes', Users, 'Clientes'],
  ['/gestao/vendedores', UserCog, 'Usuários'],
  ['/gestao/modelos', FileSignature, 'Modelo de contrato'],
  ['/gestao/cadastros', Tags, 'Rádios e segmentos'],
  ['/gestao/atividades', History, 'Histórico'],
];

export default function Sidebar({ nome }) {
  const path = usePathname();
  return (
    <aside className="sidebar nao-imprimir">
      <div className="logo-jc">
        <img src="/logos/jc-branco.png" alt="Organização Júlio Capparelli" />
        <div><b>Painel comercial</b><small>{nome}</small></div>
      </div>
      <div className="emissoras-mini">
        <img src="/logos/96fm.png" alt="96 FM" />
        <img src="/logos/agro.png" alt="Rádio do Agro" />
      </div>
      {ITENS.map(([href, Ico, txt, exato]) => (
        <Link key={href} href={href} className={(exato ? path === href : path.startsWith(href)) ? 'ativo' : ''}>
          <Ico className="ico" />{txt}
        </Link>
      ))}
      <div className="rodape">
        <div className="sep" />
        <Link href="/app"><Smartphone className="ico" />Abrir app do vendedor</Link>
        <form action="/sair" method="post">
          <button className="btn peq cinza" style={{ margin: '10px 0 0', width: '100%' }}><LogOut className="ico" />Sair</button>
        </form>
      </div>
    </aside>
  );
}

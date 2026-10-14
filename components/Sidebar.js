'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITENS = [
  ['/gestao', '📊 Visão geral', true],
  ['/gestao/programas', '📻 Programas'],
  ['/gestao/contratos', '📄 Contratos'],
  ['/gestao/parcelas', '💰 Parcelas / boletos'],
  ['/gestao/clientes', '👥 Clientes'],
  ['/gestao/vendedores', '🧑‍💼 Usuários'],
  ['/gestao/modelos', '📝 Modelo de contrato'],
  ['/gestao/cadastros', '🏷️ Rádios e segmentos'],
  ['/gestao/atividades', '🕓 Histórico'],
];

export default function Sidebar({ nome }) {
  const path = usePathname();
  return (
    <aside className="sidebar nao-imprimir">
      <div className="logo">📻 Comercial<br /><small style={{ color: '#b9c6f5', fontWeight: 400 }}>{nome}</small></div>
      {ITENS.map(([href, txt, exato]) => (
        <Link key={href} href={href} className={(exato ? path === href : path.startsWith(href)) ? 'ativo' : ''}>{txt}</Link>
      ))}
      <div className="sep" />
      <Link href="/app">📱 Abrir app do vendedor</Link>
      <form action="/sair" method="post">
        <button className="btn peq cinza" style={{ margin: '8px 12px', width: 'calc(100% - 24px)' }}>Sair</button>
      </form>
    </aside>
  );
}

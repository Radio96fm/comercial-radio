import Link from 'next/link';
import { requireFinanceiro } from '@/lib/auth';
import { nomeBanco } from '@/lib/banco';

export const dynamic = 'force-dynamic';

// Saldo e extrato da conta da rádio. Até a integração com o banco ser ativada, só orienta.
export default async function Extrato() {
  const { supabase, baseFin } = await requireFinanceiro();
  const { data: b } = await supabase.rpc('banco_situacao');
  const cadastrado = b?.agencia && b?.conta && b?.client_id && b?.secret && b?.certificado;

  return (
    <>
      <div className="cabecalho">
        <h1>Saldo e extrato</h1>
        {b?.conta && <span className="muted">{nomeBanco(b.banco)} · Ag. {b.agencia} · Conta {b.conta}{b.digito ? `-${b.digito}` : ''}</span>}
      </div>
      <div className="grid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        {['Saldo disponível', 'Entradas no mês', 'Saídas no mês'].map((t) => (
          <div key={t} className="card" style={{ margin: 0 }}><span className="muted">{t}</span><div style={{ fontSize: '1.6rem', fontWeight: 700 }}>—</div></div>
        ))}
      </div>
      <div className="card">
        <h2>Extrato</h2>
        <div className="vazio">
          {cadastrado
            ? <>O banco já está cadastrado. O saldo e o extrato aparecem aqui assim que a integração com o banco for ativada.</>
            : <>Para ver o saldo e o extrato aqui, configure o banco em <Link href={`${baseFin}/banco`}><b>Configurar banco</b></Link>.</>}
        </div>
      </div>
    </>
  );
}

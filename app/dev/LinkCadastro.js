import { headers } from 'next/headers';
import BotaoEnviar from '@/components/BotaoEnviar';
import CopiarTexto from '@/components/CopiarTexto';
import { novoConvite } from '@/app/gestao/actions';

// Link único de cadastro: a pessoa coloca nome completo e CPF/CNPJ e os contratos dela já aparecem
export default async function LinkCadastro({ supabase }) {
  const { data: codigo } = await supabase.rpc('convite_vendedor', { p_novo: false });
  const h = headers();
  const link = `https://${h.get('x-forwarded-host') || h.get('host')}/cadastro/${codigo}`;
  const msg = `Olá! Este é o link para você criar seu acesso ao sistema comercial da Rádio 96 FM e Rádio do Agro. Use o mesmo CPF ou CNPJ das suas notas na rádio: ${link}`;
  return (
    <div className="card convite">
      <h2 style={{ marginTop: 0 }}>Link de cadastro</h2>
      <p className="muted">
        Um link só para todos. Cada vendedor ou agência coloca o nome completo, o CPF ou CNPJ que usa nas notas da rádio, e-mail e senha.
        Se o CPF/CNPJ for o mesmo dos contratos, os contratos e clientes já passam para o acesso dele.
      </p>
      <div className="link-convite"><code>{link}</code></div>
      <div className="acoes" style={{ marginTop: 10 }}>
        <CopiarTexto texto={link} rotulo="Copiar link" className="btn" />
        <a className="btn whats" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">Mandar no WhatsApp</a>
        <form action={novoConvite}><BotaoEnviar className="btn cinza" texto="Trocar link" enviando="..." confirmar="Gerar um link novo? O link antigo para de funcionar." /></form>
      </div>
    </div>
  );
}

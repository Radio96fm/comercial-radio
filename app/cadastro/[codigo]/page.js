import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import FormCadastro from './form';

export const dynamic = 'force-dynamic';

export default async function Cadastro({ params }) {
  const supabase = createClient();
  const { data: valido } = await supabase.rpc('convite_valido', { p_codigo: params.codigo });
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="marca"><UserPlus className="ico" strokeWidth={2.4} /></div>
        <h1>Cadastro de vendedor</h1>
        {valido ? (
          <>
            <p className="muted" style={{ textAlign: 'center' }}>Rádio 96 FM e Rádio do Agro. Crie seu acesso ao sistema comercial.</p>
            <FormCadastro codigo={params.codigo} />
          </>
        ) : (
          <>
            <div className="alerta erro">Este link de cadastro não vale mais. Peça o link novo ao gestor.</div>
            <Link className="btn grande" href="/login">Já tenho acesso</Link>
          </>
        )}
      </div>
    </div>
  );
}

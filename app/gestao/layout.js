import { requireGestor } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import AoVivo from '@/components/AoVivo';
import BotaoTema from '@/components/BotaoTema';
import SeletorRadio from '@/components/SeletorRadio';
import { radioFin } from '@/lib/radioFin';

export const dynamic = 'force-dynamic';

export default async function GestaoLayout({ children }) {
  const { supabase, isMaster } = await requireGestor();
  const { data: radios } = isMaster ? await supabase.from('radios').select('id, nome, cor').order('ordem') : { data: [] };
  return (
    <div className="gestao">
      <Sidebar master={isMaster} />
      <main className="gestao-main">
        <div className="gestao-topo">
          {isMaster && <SeletorRadio radios={radios || []} atual={radioFin()} soNoFinanceiro />}
          <span className="ao-vivo" title="A tela se atualiza sozinha quando um vendedor faz algo (visita, cliente, contrato)">Atualiza sozinho</span>
          <BotaoTema comTexto className="btn peq cinza" />
        </div>
        {children}
      </main>
      <AoVivo />
    </div>
  );
}

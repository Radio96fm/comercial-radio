import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import Duvidas from './Duvidas';

export default async function AssistentePage() {
  const { supabase } = await getSessao();
  const { data: ia } = await supabase.rpc('ia_situacao');
  const ligado = !!ia?.provedor && (ia?.chaves || []).includes(ia.provedor);
  return (
    <>
      <Topo titulo="Tirar dúvida com a IA" voltar="/app" />
      <main className="conteudo">
        {ligado ? <Duvidas /> : <div className="vazio">O assistente ainda não foi ligado. Peça ao gestor para ativar em “Treinar assistente”.</div>}
      </main>
    </>
  );
}

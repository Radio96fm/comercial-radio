import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import FormNovaVisita from './form';

export default async function NovaVisita({ searchParams }) {
  const { supabase, perfil } = await getSessao();
  const [{ data: clientes }, { data: segmentos }] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nome, cidade, vendedor_id, vendedor:profiles!clientes_vendedor_id_fkey(nome)')
      .order('nome'),
    supabase.from('segmentos').select('id, nome').order('nome'),
  ]);
  return (
    <>
      <Topo titulo="Nova visita" voltar="/app/visitas" />
      <main className="conteudo">
        <FormNovaVisita
          clientes={clientes || []}
          segmentos={segmentos || []}
          meuId={perfil.id}
          clienteInicial={searchParams?.cliente || ''}
        />
      </main>
    </>
  );
}

import Link from 'next/link';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import ListaClientes from './lista';

export default async function Clientes() {
  const { supabase, perfil } = await getSessao();
  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nome, cidade, vendedor_id, segmento:segmentos(nome), vendedor:profiles!clientes_vendedor_id_fkey(nome)')
    .order('nome');
  return (
    <>
      <Topo titulo="Clientes" voltar="/app" />
      <main className="conteudo">
        <Link href="/app/clientes/novo" className="btn grande" style={{ marginBottom: 14 }}>➕ Cadastrar cliente</Link>
        <ListaClientes clientes={clientes || []} meuId={perfil.id} />
      </main>
    </>
  );
}

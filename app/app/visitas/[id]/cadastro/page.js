import { notFound, redirect } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import CadastroEtapas from '@/components/CadastroEtapas';

// Etapa 4 da visita: o cliente aprovou a proposta. Cadastro completo e depois o contrato.
export default async function CadastroVisita({ params }) {
  const { supabase, perfil } = await getSessao();
  const { data: v } = await supabase
    .from('visitas')
    .select('*, cliente:clientes(*)')
    .eq('id', params.id)
    .maybeSingle();
  if (!v) notFound();
  if (v.vendedor_id !== perfil.id || !v.proposta_aprovada_em) redirect(`/app/visitas/${v.id}`);
  const { data: segmentos } = await supabase.from('segmentos').select('id, nome').order('nome');

  const valores = {
    ...v.cliente,
    contato_nome: v.cliente.contato_nome || v.contato_nome,
    telefone: v.cliente.telefone || v.contato_telefone,
  };

  const q = new URLSearchParams({ cliente: v.cliente.id, visita: v.id });
  if (v.programa_id) q.set('programa', v.programa_id);
  if (v.plano_id) q.set('plano', v.plano_id);

  return (
    <>
      <Topo titulo="Cadastro completo" voltar={`/app/visitas/${v.id}`} />
      <main className="conteudo">
        <div className="alerta ok">Proposta aprovada! Agora complete os dados do cliente para o contrato, um bloco de cada vez.</div>
        <CadastroEtapas segmentos={segmentos || []} valores={valores} clienteId={v.cliente.id} visita={v.id} seguir={`/app/contratos/novo?${q}`} />
      </main>
    </>
  );
}

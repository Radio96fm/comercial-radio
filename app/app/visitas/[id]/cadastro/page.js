import { notFound, redirect } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import CamposCliente from '@/components/CamposCliente';
import { cadastroCompleto } from '../../../actions';

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

  return (
    <>
      <Topo titulo="Cadastro completo" voltar={`/app/visitas/${v.id}`} />
      <main className="conteudo">
        <div className="alerta ok">Proposta aprovada! Agora complete os dados do cliente para o contrato.</div>
        <FormAcao action={cadastroCompleto}>
          <input type="hidden" name="id" value={v.cliente.id} />
          <input type="hidden" name="visita" value={v.id} />
          <input type="hidden" name="programa" value={v.programa_id || ''} />
          <input type="hidden" name="plano" value={v.plano_id || ''} />
          <input type="hidden" name="radio" value={v.radio_id || ''} />
          <CamposCliente segmentos={segmentos || []} valores={valores} completo />
          <BotaoEnviar className="btn grande verde" texto="Salvar e seguir para o contrato" enviando="Salvando..." />
        </FormAcao>
      </main>
    </>
  );
}

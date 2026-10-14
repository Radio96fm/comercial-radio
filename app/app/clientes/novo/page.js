import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import CamposCliente from '@/components/CamposCliente';
import { criarCliente } from '../../actions';

export default async function NovoCliente({ searchParams }) {
  const { supabase } = await getSessao();
  const { data: segmentos } = await supabase.from('segmentos').select('id, nome').order('nome');
  const voltar = typeof searchParams?.voltar === 'string' && searchParams.voltar.startsWith('/app/') ? searchParams.voltar : '';
  return (
    <>
      <Topo titulo="Novo cliente" voltar={voltar || '/app/clientes'} />
      <main className="conteudo">
        <p className="muted">O cliente fica na <b>sua carteira</b>. Os outros vendedores conseguem ver que ele já é atendido por você.</p>
        <FormAcao action={criarCliente}>
          <input type="hidden" name="voltar" value={voltar} />
          <CamposCliente segmentos={segmentos || []} />
          <BotaoEnviar texto="Salvar cliente" />
        </FormAcao>
      </main>
    </>
  );
}

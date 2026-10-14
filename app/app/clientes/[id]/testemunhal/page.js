import { notFound } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import Chat from './Chat';

export default async function TestemunhalPage({ params }) {
  const { supabase } = await getSessao();
  const { data: c } = await supabase.from('clientes').select('id, nome').eq('id', params.id).maybeSingle();
  if (!c) notFound();
  const [{ data: programas }, { data: contrato }, { data: ia }] = await Promise.all([
    supabase.from('programas').select('id, nome, radio:radios(nome)').eq('ativo', true).order('nome'),
    supabase.from('contratos').select('programa_id').eq('cliente_id', c.id).not('programa_id', 'is', null)
      .in('status', ['ativo', 'pendente']).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.rpc('ia_situacao'),
  ]);
  const ligado = !!ia?.provedor && (ia?.chaves || []).includes(ia.provedor);

  return (
    <>
      <Topo titulo="Criar testemunhal" voltar={`/app/clientes/${c.id}`} />
      <main className="conteudo">
        {ligado ? (
          <Chat cliente={c} programas={programas || []} programaInicial={contrato?.programa_id || ''} />
        ) : (
          <div className="vazio">O assistente ainda não foi ligado. Peça ao gestor para ativar em “Treinar assistente”.</div>
        )}
      </main>
    </>
  );
}

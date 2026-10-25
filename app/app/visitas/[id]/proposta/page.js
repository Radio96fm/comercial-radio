import { notFound, redirect } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import EnviarProposta from './EnviarProposta';

const VALIDADE_LINK = 60 * 60 * 24 * 30; // link do PDF vale 30 dias

const nomePdf = (t) => `Proposta comercial - ${t}.pdf`.replace(/[\\/:*?"<>|]+/g, ' ');

// Etapa 2 da visita: enviar a proposta comercial (PDF do programa) pelo WhatsApp
export default async function PropostaVisita({ params }) {
  const { supabase, perfil } = await getSessao();
  const { data: v } = await supabase
    .from('visitas')
    .select('*, cliente:clientes(id, nome, contato_nome, telefone)')
    .eq('id', params.id)
    .maybeSingle();
  if (!v) notFound();
  if (v.vendedor_id !== perfil.id || !v.programa_id) redirect(`/app/visitas/${v.id}`);

  const [{ data: programa }, { data: plano }] = await Promise.all([
    supabase.from('programas').select('id, nome, proposta_pdf, proposta_atualizada_em, radio:radios(id, nome, cor, proposta_pdf, proposta_atualizada_em)').eq('id', v.programa_id).maybeSingle(),
    v.plano_id ? supabase.from('programa_planos').select('id, nome').eq('id', v.plano_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!programa) redirect(`/app/visitas/${v.id}`);

  // PDF do programa; se o comercial ainda não colocou, usa o PDF geral da rádio
  const caminho = programa.proposta_pdf || programa.radio?.proposta_pdf || null;
  let pdfUrl = null;
  if (caminho) {
    const { data } = await supabase.storage.from('propostas').createSignedUrl(caminho, VALIDADE_LINK, { download: nomePdf(programa.nome) });
    pdfUrl = data?.signedUrl || null;
  }

  const contato = v.contato_nome || v.cliente.contato_nome || '';
  const primeiro = perfil.nome.split(' ')[0];
  const mensagem = [
    `Olá${contato ? `, ${contato.split(' ')[0]}` : ''}! Tudo bem?`,
    `Aqui é ${primeiro}, da ${programa.radio?.nome}. Conforme conversamos, segue a proposta comercial do programa *${programa.nome}*${plano && plano.nome !== 'Plano comercial' ? ` (${plano.nome})` : ''} para a ${v.cliente.nome}.`,
    'Qualquer dúvida, estou à disposição!',
  ].join('\n\n');

  return (
    <>
      <Topo titulo="Enviar proposta" voltar={`/app/visitas/${v.id}`} cor={programa.radio?.cor} />
      <main className="conteudo">
        <div className="card proposta-resumo" style={{ '--cor': programa.radio?.cor }}>
          <div className="radio-n">{programa.radio?.nome}</div>
          <h2 style={{ margin: '2px 0' }}>{programa.nome}</h2>
          {plano && <div className="muted">{plano.nome}</div>}
          <div className="muted" style={{ marginTop: 6 }}>{v.cliente.nome}{contato ? ` · ${contato}` : ''}</div>
        </div>
        <EnviarProposta
          visita={v.id}
          pdfUrl={pdfUrl}
          nomeArquivo={nomePdf(programa.nome)}
          pdfGeral={!programa.proposta_pdf && !!programa.radio?.proposta_pdf}
          telefoneInicial={v.contato_telefone || v.cliente.telefone || ''}
          mensagemInicial={mensagem}
        />
      </main>
    </>
  );
}

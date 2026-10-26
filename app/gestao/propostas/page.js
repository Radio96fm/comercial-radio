import { requireGestor } from '@/lib/auth';
import TelaPropostas from './Tela';

export const dynamic = 'force-dynamic';

export default async function Propostas() {
  const { supabase } = await requireGestor();
  const [{ data: radios, error }, { data: programas }] = await Promise.all([
    supabase.from('radios').select('id, nome, cor, proposta_pdf, proposta_atualizada_em').order('ordem'),
    supabase.from('programas').select('id, nome, radio_id, ativo, proposta_pdf, proposta_atualizada_em').eq('ativo', true).order('horario_inicio', { nullsFirst: false }),
  ]);

  if (error) {
    return (
      <>
        <div className="cabecalho"><h1>Propostas em PDF</h1></div>
        <div className="alerta aviso">Falta atualizar o banco de dados: rode o arquivo <b>supabase/migracao-visita-proposta.sql</b> no SQL Editor do Supabase.</div>
      </>
    );
  }

  const caminhos = [...(radios || []), ...(programas || [])].map((x) => x.proposta_pdf).filter(Boolean);
  const links = {};
  if (caminhos.length) {
    const { data } = await supabase.storage.from('propostas').createSignedUrls(caminhos, 60 * 60);
    (data || []).forEach((d) => { if (d.signedUrl) links[d.path] = d.signedUrl; });
  }

  return <TelaPropostas radios={radios} programas={programas} links={links} />;
}

import { notFound } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import { marcaDaRadio } from '@/lib/marca';
import MontarPlano from './plano';

export default async function MontarPage({ params, searchParams }) {
  const { supabase } = await getSessao();
  const { data: radio } = await supabase.from('radios').select('id, nome, cor').eq('id', params.id).maybeSingle();
  if (!radio) notFound();

  const [{ data: programas }, { data: planos }, { data: precos }] = await Promise.all([
    supabase.from('programas_ocupacao').select('id, nome, dias, horario_inicio, horario_fim, valor_cota, cotas_livres').eq('radio_id', radio.id).eq('ativo', true).order('horario_inicio', { nullsFirst: false }),
    supabase.from('programa_planos').select('id, programa_id, nome, descricao, valor').order('ordem'),
    supabase.from('tabela_precos').select('id, tipo, duracao, modalidade, valor').eq('radio_id', radio.id).eq('ativo', true).order('tipo').order('duracao').order('modalidade', { ascending: false }),
  ]);
  const marca = marcaDaRadio(radio.nome);
  const ids = new Set((programas || []).map((p) => p.id));
  const extra = {};
  ['cliente', 'visita'].forEach((k) => { if (typeof searchParams?.[k] === 'string') extra[k] = searchParams[k]; });

  return (
    <div className="tema-radio" style={{ '--accent': radio.cor, '--on-accent': '#fff', '--cor': radio.cor }}>
      <Topo titulo="Montar plano" voltar={`/app/radio/${radio.id}`} cor={radio.cor} />
      <main className="conteudo">
        <div className="faixa-radio">
          {marca.logo && <img src={marca.logo} alt="" />}
          <div><small>Plano personalizado para</small><b>{radio.nome}</b></div>
        </div>
        <MontarPlano
          radio={radio}
          programas={programas || []}
          planos={(planos || []).filter((x) => ids.has(x.programa_id))}
          precos={precos || []}
          extra={extra}
        />
      </main>
    </div>
  );
}

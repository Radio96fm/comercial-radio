import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import TabelaPrecos from './tabela';

export default async function TabelaPage({ searchParams }) {
  const { supabase } = await getSessao();
  const [{ data: radios }, { data: programas }, { data: planos }, { data: precos }] = await Promise.all([
    supabase.from('radios').select('id, nome, cor').order('ordem'),
    supabase.from('programas_ocupacao').select('id, nome, radio_id, dias, horario_inicio, horario_fim, valor_cota, cotas_livres').eq('ativo', true).order('horario_inicio', { nullsFirst: false }),
    supabase.from('programa_planos').select('id, programa_id, nome, descricao, valor').order('ordem'),
    supabase.from('tabela_precos').select('id, radio_id, tipo, duracao, modalidade, valor').eq('ativo', true).order('tipo').order('duracao').order('modalidade', { ascending: false }),
  ]);

  return (
    <>
      <Topo titulo="Tabela de preços" voltar="/app" />
      <main className="conteudo">
        <TabelaPrecos
          radios={radios || []}
          programas={programas || []}
          planos={planos || []}
          precos={precos || []}
          radioInicial={typeof searchParams?.radio === 'string' ? searchParams.radio : ''}
        />
      </main>
    </>
  );
}

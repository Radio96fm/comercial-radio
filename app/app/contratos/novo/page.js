import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import FormContrato from './form';
import { hojeISO } from '@/lib/format';

export default async function NovoContrato({ searchParams }) {
  const { supabase, perfil, isGestor } = await getSessao();
  const hoje = hojeISO();

  let qClientes = supabase.from('clientes').select('id, nome, segmento_id, vendedor_id, segmento:segmentos(nome)').order('nome');
  if (!isGestor) qClientes = qClientes.or(`vendedor_id.eq.${perfil.id},vendedor_id.is.null`);

  const [{ data: clientes }, { data: programas }, { data: ocupados }, { data: vendedores }, { data: modelo }] = await Promise.all([
    qClientes,
    supabase.from('programas_ocupacao').select('id, nome, radio_nome, dias, horario_inicio, horario_fim, valor_cota, descricao_cota, cotas_livres, cotas_total').eq('ativo', true).order('radio_nome').order('horario_inicio'),
    supabase.from('contratos').select('programa_id, segmento_id, data_fim').in('status', ['pendente', 'ativo']).gte('data_fim', hoje),
    isGestor ? supabase.from('profiles').select('id, nome').eq('ativo', true).order('nome') : Promise.resolve({ data: [] }),
    supabase.from('modelos_contrato').select('id').eq('ativo', true).limit(1).maybeSingle(),
  ]);

  const programaInicial = typeof searchParams?.programa === 'string' ? searchParams.programa : '';
  const voltarCliente = `/app/contratos/novo?programa=${programaInicial}`;

  return (
    <>
      <Topo titulo="Novo contrato" voltar={programaInicial ? `/app/programa/${programaInicial}` : '/app/contratos'} />
      <main className="conteudo">
        {!modelo && (
          <div className="alerta aviso">Nenhum modelo de contrato ativo. O contrato será criado, mas sem o texto. Avise o gestor.</div>
        )}
        <FormContrato
          clientes={clientes || []}
          programas={programas || []}
          ocupados={ocupados || []}
          vendedores={vendedores || []}
          isGestor={isGestor}
          meuId={perfil.id}
          hoje={hoje}
          inicial={{
            programa: programaInicial,
            cliente: typeof searchParams?.cliente === 'string' ? searchParams.cliente : '',
            visita: typeof searchParams?.visita === 'string' ? searchParams.visita : '',
          }}
          linkNovoCliente={`/app/clientes/novo?voltar=${encodeURIComponent(voltarCliente)}`}
        />
      </main>
    </>
  );
}

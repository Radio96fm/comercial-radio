import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import FormContrato from './form';
import { hojeISO } from '@/lib/format';

export default async function NovoContrato({ searchParams }) {
  const { supabase, perfil, isGestor } = await getSessao();
  const hoje = hojeISO();

  let qClientes = supabase.from('clientes').select('id, nome, segmento_id, vendedor_id, segmento:segmentos(nome)').order('nome');
  if (!isGestor) qClientes = qClientes.or(`vendedor_id.eq.${perfil.id},vendedor_id.is.null`);

  const [{ data: clientes }, { data: programas }, { data: planos }, { data: precos }, { data: radios }, { data: ocupados }, { data: vendedores }, { data: modelo }] = await Promise.all([
    qClientes,
    supabase.from('programas_ocupacao').select('id, nome, radio_id, radio_nome, valor_cota, descricao_cota, cotas_livres, cotas_total, horario_inicio').eq('ativo', true).order('radio_nome').order('horario_inicio', { nullsFirst: false }),
    supabase.from('programa_planos').select('id, programa_id, nome, descricao, valor').order('ordem'),
    supabase.from('tabela_precos').select('id, radio_id, tipo, duracao, modalidade, valor').eq('ativo', true).order('tipo').order('duracao').order('modalidade', { ascending: false }),
    supabase.from('radios').select('id, nome, cor').order('ordem'),
    supabase.from('contratos').select('programa_id, segmento_id, data_fim').in('status', ['pendente', 'ativo']).not('programa_id', 'is', null).gte('data_fim', hoje),
    isGestor ? supabase.from('profiles').select('id, nome').eq('ativo', true).order('nome') : Promise.resolve({ data: [] }),
    supabase.from('modelos_contrato').select('id').eq('ativo', true).limit(1).maybeSingle(),
  ]);

  const param = (k) => (typeof searchParams?.[k] === 'string' ? searchParams[k] : '');
  const programaInicial = param('programa');
  // itens vindos da tabela de preços: "id:qtd,id:qtd"
  const itensIniciais = param('itens').split(',').map((par) => {
    const [id, q] = par.split(':');
    return { id, qtd: parseInt(q, 10) };
  }).filter((i) => i.id && i.qtd > 0);
  const daTabela = !!param('itens') || !!param('radio');
  const manter = new URLSearchParams();
  ['programa', 'plano', 'radio', 'itens', 'visita'].forEach((k) => { if (param(k)) manter.set(k, param(k)); });
  const voltarCliente = `/app/contratos/novo?${manter}`;

  return (
    <>
      <Topo titulo={daTabela ? 'Contrato do plano' : 'Novo contrato'} voltar={daTabela ? `/app/radio/${param('radio')}/montar` : programaInicial ? `/app/programa/${programaInicial}` : '/app/contratos'} />
      <main className="conteudo">
        {!modelo && (
          <div className="alerta aviso">Nenhum modelo de contrato ativo. O contrato será criado, mas sem o texto. Avise o gestor.</div>
        )}
        <FormContrato
          clientes={clientes || []}
          programas={programas || []}
          planos={planos || []}
          precos={precos || []}
          radios={radios || []}
          ocupados={ocupados || []}
          vendedores={vendedores || []}
          isGestor={isGestor}
          meuId={perfil.id}
          hoje={hoje}
          inicial={{
            programa: programaInicial,
            plano: param('plano'),
            radio: param('radio'),
            itens: itensIniciais,
            cliente: typeof searchParams?.cliente === 'string' ? searchParams.cliente : '',
            visita: typeof searchParams?.visita === 'string' ? searchParams.visita : '',
          }}
          linkNovoCliente={`/app/clientes/novo?voltar=${encodeURIComponent(voltarCliente)}`}
        />
      </main>
    </>
  );
}

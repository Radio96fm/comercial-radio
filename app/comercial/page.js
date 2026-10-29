import { requireGestor } from '@/lib/auth';
import { hojeISO, somarDias, somarMeses } from '@/lib/format';
import { montarComercial } from '@/lib/comercial';
import TelaCerta from '@/components/TelaCerta';
import Painel from './Painel';
import PedidosPrazo, { SELECT_PEDIDOS } from '@/components/PedidosPrazo';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Painel Comercial · 96 FM & Rádio do Agro',
  manifest: '/comercial.webmanifest',
  appleWebApp: { capable: true, title: 'Comercial', statusBarStyle: 'default' },
};

function saudacao() {
  const h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

// Painel do diretor comercial: desempenho e liderança da equipe de vendas.
// De propósito, nenhuma consulta daqui busca valores em R$ ou parcelas.
export default async function PainelComercial({ searchParams }) {
  const radioId = searchParams?.radio || null;
  const { supabase, perfil } = await requireGestor();
  const hoje = hojeISO();
  const inicioAnt = somarMeses(`${hoje.slice(0, 7)}-01`, -1);
  const desde = [inicioAnt, somarDias(hoje, -30)].sort()[0];

  const [{ data: radios }, { data: contratos }, { data: novos }, { data: vendedores }, { data: visitas }, { data: liberadas }, { data: programas }, { data: pedidos }, { data: linhas }] = await Promise.all([
    supabase.from('radios').select('id, nome, cor').order('ordem'),
    supabase.from('contratos')
      .select('id, status, data_fim, created_at, cliente_nome, radio_id, vendedor_id, vendedor:profiles(nome), programa:programas(nome, radio_id)')
      .in('status', ['ativo', 'pendente']),
    supabase.from('contratos').select('id, vendedor_id, created_at, radio_id, programa:programas(radio_id)').neq('status', 'cancelado').gte('created_at', `${inicioAnt}T00:00:00`),
    supabase.from('profiles').select('id, nome, papel').in('papel', ['vendedor', 'gestor', 'comercial']).eq('ativo', true).order('nome'),
    supabase.from('visitas').select('id, vendedor_id, status, iniciada_em, prazo_extra_dias, cliente:clientes(nome), vendedor:profiles(nome)')
      .or(`iniciada_em.gte.${desde}T00:00:00,status.in.(em_andamento,proposta)`),
    supabase.from('visitas_liberadas').select('visita_id'),
    supabase.from('programas_ocupacao').select('radio_id, nome, cotas_total, cotas_ocupadas, cotas_livres').eq('ativo', true).order('horario_inicio', { nullsFirst: false }),
    supabase.from('prorrogacoes').select(SELECT_PEDIDOS).eq('status', 'pendente').order('criada_em'),
    supabase.from('contrato_comissoes').select('contrato_id, representante:representantes(profile_id)').eq('vigente', true).eq('papel', 'vendedor'),
  ]);

  const dados = montarComercial({ hoje, radios, contratos, novos, vendedores, visitas, liberadas, programas, linhas, radioId });
  const dataLonga = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (l) => l.toUpperCase());

  return <><TelaCerta pc="/gestao" /><Painel dados={dados} ola={`${saudacao()}, ${perfil.nome.split(' ')[0]}!`} dataLonga={dataLonga} base="/comercial" avisos={<PedidosPrazo pedidos={pedidos} classe="dir-foco" />} /></>;
}

import { requireMaster } from '@/lib/auth';
import { hojeISO, somarDias, somarMeses } from '@/lib/format';
import { montarPainel } from '@/lib/diretor';
import Painel from './Painel';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Painel do Diretor · 96 FM & Rádio do Agro',
  manifest: '/diretor.webmanifest',
  appleWebApp: { capable: true, title: 'Diretor', statusBarStyle: 'default' },
};

function saudacao() {
  const h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

// Painel do dono das emissoras: tudo resumido em blocos grandes, pensado para iPhone e iPad.
export default async function PainelDiretor() {
  const { supabase, perfil } = await requireMaster();
  const hoje = hojeISO();
  const mesAtual = hoje.slice(0, 7);
  const inicioSerie = somarMeses(`${mesAtual}-01`, -5);
  const desde30 = `${somarDias(hoje, -30)}T00:00:00`;

  const [{ data: radios }, { data: contratos }, { data: novosMes }, { data: parcelas }, { data: abertas }, { data: vendedores }, { data: visitas }, { data: programas }] = await Promise.all([
    supabase.from('radios').select('id, nome, cor').order('ordem'),
    supabase.from('contratos')
      .select('id, status, valor_mensal, data_fim, cliente_nome, radio_id, vendedor_id, vendedor:profiles(nome), programa:programas(nome, radio_id), parcelas(valor, status)')
      .in('status', ['ativo', 'pendente']),
    supabase.from('contratos').select('id, vendedor_id, valor_mensal').neq('status', 'cancelado').gte('created_at', `${mesAtual}-01T00:00:00`),
    supabase.from('parcelas').select('valor, status, vencimento, pago_em, contrato:contratos!inner(status)')
      .neq('status', 'cancelado').neq('contrato.status', 'cancelado')
      .or(`vencimento.gte.${inicioSerie},pago_em.gte.${inicioSerie}`),
    supabase.from('parcelas').select('valor, vencimento, contrato:contratos!inner(status, cliente_nome, vendedor:profiles(nome))')
      .in('status', ['a_emitir', 'emitido']).neq('contrato.status', 'cancelado').lt('vencimento', hoje),
    supabase.from('profiles').select('id, nome, papel').in('papel', ['vendedor', 'gestor', 'comercial']).eq('ativo', true).order('nome'),
    supabase.from('visitas').select('vendedor_id, status, iniciada_em').or(`iniciada_em.gte.${desde30},status.eq.em_andamento`),
    supabase.from('programas_ocupacao').select('radio_id, nome, cotas_total, cotas_ocupadas, cotas_livres').eq('ativo', true).order('horario_inicio', { nullsFirst: false }),
  ]);

  const dados = montarPainel({ hoje, radios, contratos, novosMes, parcelas, abertas, vendedores, visitas, programas });
  const dataLonga = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (l) => l.toUpperCase());

  return <Painel dados={dados} ola={`${saudacao()}, ${perfil.nome.split(' ')[0]}!`} dataLonga={dataLonga} />;
}

import { requireGestor } from '@/lib/auth';
import { hojeISO, somarDias } from '@/lib/format';
import VisaoGeral from './VisaoGeral';
import TelaCerta from '@/components/TelaCerta';
import { radioAtual } from '@/lib/radio';

function saudacao() {
  const h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default async function Dashboard() {
  const { supabase, isMaster } = await requireGestor();
  // cada rádio é uma coisa à parte: só a rádio escolhida no topo
  const { radio } = await radioAtual(supabase);
  const R = radio?.id;
  const hoje = hojeISO();
  const em30 = somarDias(hoje, 30);
  const inicioSerie = `${somarDias(`${hoje.slice(0, 8)}01`, -150).slice(0, 8)}01`;

  const [{ data: radios }, { data: programas }, { data: vencendo }, { data: visitas }, { data: pendentes }, { count: totalClientes }, { data: equipe }, { data: atividades }, { data: visitasSerie }, { count: clientesNovos }] = await Promise.all([
    supabase.from('radios').select('id, nome, cor, slogan').eq('id', R),
    supabase.from('programas_ocupacao').select('*').eq('ativo', true).eq('radio_id', R).order('horario_inicio', { nullsFirst: false }),
    supabase.from('contratos').select('id, numero, data_fim, cliente:clientes(nome), programa:programas(nome), vendedor:profiles(nome)')
      .in('status', ['ativo', 'pendente']).eq('radio_id', R).gte('data_fim', hoje).lte('data_fim', em30).order('data_fim'),
    supabase.from('visitas').select('id, iniciada_em, cliente:clientes(nome), vendedor:profiles(nome)').eq('status', 'em_andamento').or(`radio_id.eq.${R},radio_id.is.null`).order('iniciada_em', { ascending: false }),
    supabase.from('contratos').select('id').eq('status', 'pendente').eq('radio_id', R),
    supabase.from('clientes').select('id', { count: 'exact', head: true }),
    // vendedor = papel vendedor ou quem tem contrato ativo (diretor comercial, desenvolvedor)
    supabase.from('profiles').select('id, papel, contratos!contratos_vendedor_id_fkey(count)').in('papel', ['vendedor', 'comercial', 'gestor']).eq('ativo', true).eq('contratos.status', 'ativo').eq('contratos.radio_id', R),
    supabase.from('atividades').select('id, descricao, created_at, usuario:profiles(nome)').order('created_at', { ascending: false }).limit(6),
    supabase.from('visitas').select('iniciada_em, vendedor_id, vendedor:profiles(nome)').or(`radio_id.eq.${R},radio_id.is.null`).gte('iniciada_em', inicioSerie),
    supabase.from('clientes').select('id', { count: 'exact', head: true }).gte('created_at', `${somarDias(hoje, -30)}T00:00:00`),
  ]);

  const totalVendedores = (equipe || []).filter((v) => v.papel === 'vendedor' || v.contratos?.[0]?.count > 0).length;
  const dataLonga = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (l) => l.toUpperCase());
  const dados = { hoje, radios, programas, vencendo, visitas, pendentes, totalClientes, totalVendedores, atividades, visitasSerie, clientesNovos };

  return (
    <>
      {/* o diretor comercial no celular abre o painel resumido */}
      {!isMaster && <TelaCerta celular="/comercial" />}
      <VisaoGeral dados={dados} ola={saudacao()} dataLonga={dataLonga} />
    </>
  );
}

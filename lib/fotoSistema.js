import 'server-only';
import { hojeISO, moeda, horario, data } from '@/lib/format';
import { PERIODOS, buscarCondicoesAtivas } from '@/lib/periodo';
import { calcularGanhos, nomeMes, DIA_CORTE } from '@/lib/ganhos';

// Retrato atual do sistema em texto, para o assistente de dúvidas responder.
// Usa o cliente do próprio vendedor: as regras de acesso (RLS) valem.
export async function fotoDoSistema(supabase, perfil, isGestor = false) {
  const hoje = hojeISO();
  const [{ data: radios }, { data: programas }, { data: planos }, { data: contratos }, { data: segmentos }, { data: precos }, { data: condicoes }] = await Promise.all([
    supabase.from('radios').select('id, nome, slogan').order('ordem'),
    supabase.from('programas_ocupacao').select('*').eq('ativo', true).order('horario_inicio', { nullsFirst: false }),
    supabase.from('programa_planos').select('programa_id, nome, descricao, valor, valor_1, valor_3, valor_6, valor_12').order('ordem'),
    supabase.from('contratos')
      .select('programa_id, data_inicio, data_fim, status, vendedor_id, cliente_nome, valor_mensal, segmento:segmentos(nome)')
      .in('status', ['pendente', 'ativo']).gte('data_fim', hoje).order('data_inicio'),
    supabase.from('segmentos').select('nome').order('nome'),
    supabase.from('tabela_precos').select('radio_id, tipo, duracao, modalidade, valor').eq('ativo', true).order('tipo').order('duracao'),
    buscarCondicoesAtivas(supabase),
  ]);

  const linhas = [`Hoje é ${data(hoje)}. Vendedor que está perguntando: ${perfil.nome}.`];
  for (const r of radios || []) {
    linhas.push(`\n## RÁDIO ${r.nome}${r.slogan ? ` (${r.slogan})` : ''}`);
    for (const p of (programas || []).filter((x) => x.radio_id === r.id)) {
      linhas.push(`\n### Programa: ${p.nome}`);
      const info = [p.dias, horario(p), p.apresentador ? `apresentador(a): ${p.apresentador}` : ''].filter(Boolean).join(' · ');
      if (info) linhas.push(info);
      if (p.descricao) linhas.push(`Sobre: ${p.descricao}`);
      if (p.descricao_cota) linhas.push(`O patrocinador recebe: ${p.descricao_cota}`);
      linhas.push(`Cotas: ${p.cotas_livres} livre(s) de ${p.cotas_total} (${p.cotas_ocupadas} ocupada(s) hoje).${(p.meses_minimo || 1) > 1 ? ` Contrato mínimo: ${p.meses_minimo} meses.` : ''}`);
      const pl = (planos || []).filter((x) => x.programa_id === p.id);
      if (pl.length) {
        linhas.push('Planos (valor por mês):');
        for (const x of pl) {
          const porPeriodo = PERIODOS.filter((m) => x[`valor_${m}`] != null).map((m) => `${m} ${m === 1 ? 'mês' : 'meses'}: ${moeda(x[`valor_${m}`])}`);
          linhas.push(`- ${x.nome}: ${porPeriodo.length ? porPeriodo.join('; ') : moeda(x.valor)}${x.descricao ? ` (${x.descricao.replace(/\s+/g, ' ')})` : ''}`);
        }
      } else if (Number(p.valor_cota)) {
        linhas.push(`Valor da cota: ${moeda(p.valor_cota)} por mês.`);
      }
      const cond = (condicoes || []).filter((c) => c.programa?.id === p.id);
      cond.forEach((c) => linhas.push(`CONDIÇÃO ESPECIAL ATIVA: ${c.texto}`));
      const cs = (contratos || []).filter((c) => c.programa_id === p.id);
      if (cs.length) {
        linhas.push('Segmentos já ocupados (exclusividade: o mesmo segmento não pode entrar no período):');
        cs.forEach((c) => linhas.push(`- ${c.segmento?.nome || 'sem segmento'}: ${c.cliente_nome}, ${c.data_inicio > hoje ? `de ${data(c.data_inicio)} ` : ''}até ${data(c.data_fim)}${c.status === 'pendente' ? ' (aguardando assinatura)' : ''}`));
      } else {
        linhas.push('Nenhum segmento ocupado: todos liberados.');
      }
    }
    const pr = (precos || []).filter((x) => x.radio_id === r.id);
    if (pr.length) {
      linhas.push(`\nAvulsos da ${r.nome} (valor por unidade):`);
      pr.forEach((x) => linhas.push(`- ${x.tipo === 'insercao' ? 'Inserção (comercial)' : 'Testemunhal'} de ${x.duracao}s, horário ${x.modalidade === 'determinada' ? 'marcado' : 'livre (rotativo)'}: ${moeda(x.valor)}`));
    }
  }
  linhas.push(`\n## Segmentos cadastrados\n${(segmentos || []).map((s) => s.nome).join(', ')}`);

  const nomeProg = (id) => (programas || []).find((p) => p.id === id)?.nome || 'pacote avulso';
  linhas.push(isGestor ? await parteGestor(supabase, nomeProg) : await parteVendedor(supabase, perfil, nomeProg));
  return linhas.join('\n');
}

const STATUS_C = { pendente: 'aguardando assinatura', ativo: 'ativo', encerrado: 'encerrado', cancelado: 'cancelado' };
const STATUS_P = { a_emitir: 'a emitir', emitido: 'boleto emitido', pago: 'pago', cancelado: 'cancelado' };
const diasAtras = (n) => new Date(Date.now() - n * 86400000).toISOString();

// Vendedor: os próprios clientes, contratos, parcelas, visitas e ganhos
async function parteVendedor(supabase, perfil, nomeProg) {
  const hoje = hojeISO();
  const [{ data: clientes }, { data: contratos }, { data: visitas }, g] = await Promise.all([
    supabase.from('clientes').select('id, nome, cidade, contato_nome, telefone, segmento:segmentos(nome)').eq('vendedor_id', perfil.id).order('nome').limit(400),
    supabase.from('contratos').select('id, numero, cliente_nome, programa_id, status, data_inicio, data_fim, valor_mensal, meses, parcelas(numero, vencimento, valor, status, pago_em)')
      .eq('vendedor_id', perfil.id).order('created_at', { ascending: false }).limit(200),
    supabase.from('visitas').select('status, iniciada_em, observacoes, cliente:clientes(nome)').eq('vendedor_id', perfil.id).gte('iniciada_em', diasAtras(90)).order('iniciada_em', { ascending: false }).limit(100),
    calcularGanhos(supabase, perfil).catch(() => null),
  ]);
  const l = [`\n## DADOS DO PRÓPRIO VENDEDOR (${perfil.nome})`];
  l.push(`\n### Clientes da carteira (${(clientes || []).length})`);
  (clientes || []).forEach((c) => l.push(`- ${c.nome}${c.segmento?.nome ? ` (${c.segmento.nome})` : ''}${c.cidade ? `, ${c.cidade}` : ''}${c.contato_nome ? ` · contato ${c.contato_nome}` : ''}${c.telefone ? ` · ${c.telefone}` : ''}`));
  l.push(`\n### Contratos (${(contratos || []).length})`);
  (contratos || []).forEach((c) => {
    const ps = c.parcelas || [];
    const atrasadas = ps.filter((p) => p.status !== 'pago' && p.status !== 'cancelado' && p.vencimento < hoje);
    const pagas = ps.filter((p) => p.status === 'pago').length;
    l.push(`- Nº ${c.numero} · ${c.cliente_nome} · ${nomeProg(c.programa_id)} · ${moeda(c.valor_mensal)}/mês x ${c.meses} · ${data(c.data_inicio)} a ${data(c.data_fim)} · ${STATUS_C[c.status] || c.status} · parcelas pagas ${pagas}/${ps.length}${atrasadas.length ? ` · EM ATRASO: ${atrasadas.map((p) => `${p.numero}ª venceu ${data(p.vencimento)}`).join(', ')}` : ''}`);
  });
  l.push(`\n### Visitas dos últimos 90 dias (${(visitas || []).length})`);
  (visitas || []).forEach((v) => l.push(`- ${data(v.iniciada_em)} · ${v.cliente?.nome || ''} · ${v.status === 'em_andamento' ? 'em andamento' : v.status}${v.observacoes ? ` · ${v.observacoes.replace(/\s+/g, ' ').slice(0, 160)}` : ''}`));
  if (g) {
    l.push(`\n### Comissão (${String(g.pct).replace('.', ',')}% de tudo o que vende; fecha todo dia ${DIA_CORTE}: parcela paga até o dia ${DIA_CORTE} entra no mês, depois entra no mês seguinte)`);
    l.push(`Comissão deste mês: ${moeda(g.atual)}. Mês passado: ${moeda(g.anterior)}. Comissão mensal dos contratos ativos: ${moeda(g.mensalAtivos)}.`);
    l.push(`Mês a mês: ${g.serie.map((m) => `${nomeMes(m.chave)} ${moeda(m.certo + m.previsto)}${m.futuro ? ' (previsto)' : ''}`).join('; ')}`);
    if (g.atrasadas?.length) l.push(`Boletos em atraso que seguram comissão: ${g.atrasadas.map((p) => `${p.contrato.cliente_nome} (${moeda(p.comissao)})`).join(', ')}`);
  }
  return l.join('\n');
}

// Gestor: a operação inteira
async function parteGestor(supabase, nomeProg) {
  const hoje = hojeISO();
  const [{ data: vendedores }, { data: clientes }, { data: contratos }, { data: visitas }, { data: parcelas }] = await Promise.all([
    supabase.from('profiles').select('id, nome, papel, ativo, comissao').order('nome'),
    supabase.from('clientes').select('nome, cidade, vendedor_id, segmento:segmentos(nome)').order('nome').limit(1500),
    supabase.from('contratos').select('numero, cliente_nome, programa_id, vendedor_id, status, data_inicio, data_fim, valor_mensal, meses, created_at')
      .order('created_at', { ascending: false }).limit(600),
    supabase.from('visitas').select('vendedor_id, status, iniciada_em, cliente:clientes(nome)').gte('iniciada_em', diasAtras(60)).order('iniciada_em', { ascending: false }).limit(600),
    supabase.from('parcelas').select('numero, vencimento, valor, status, pago_em, contrato:contratos(cliente_nome, vendedor_id)')
      .gte('vencimento', diasAtras(120).slice(0, 10)).order('vencimento').limit(1500),
  ]);
  const nomeV = (id) => (vendedores || []).find((v) => v.id === id)?.nome || '—';
  const l = ['\n## VISÃO DO GESTOR (todos os dados)'];
  l.push('\n### Equipe');
  (vendedores || []).forEach((v) => {
    const cs = (contratos || []).filter((c) => c.vendedor_id === v.id);
    const ativos = cs.filter((c) => c.status === 'ativo');
    l.push(`- ${v.nome} (${v.papel}${v.ativo ? '' : ', desativado'}) · comissão ${v.comissao ?? '-'}% · clientes ${(clientes || []).filter((c) => c.vendedor_id === v.id).length} · contratos ativos ${ativos.length} (${moeda(ativos.reduce((s, c) => s + Number(c.valor_mensal), 0))}/mês) · aguardando assinatura ${cs.filter((c) => c.status === 'pendente').length} · visitas 60 dias ${(visitas || []).filter((x) => x.vendedor_id === v.id).length}`);
  });
  l.push(`\n### Contratos (${(contratos || []).length} mais recentes)`);
  (contratos || []).forEach((c) => l.push(`- Nº ${c.numero} · ${c.cliente_nome} · ${nomeProg(c.programa_id)} · ${nomeV(c.vendedor_id)} · ${moeda(c.valor_mensal)}/mês x ${c.meses} · ${data(c.data_inicio)} a ${data(c.data_fim)} · ${STATUS_C[c.status] || c.status}`));
  const atrasadas = (parcelas || []).filter((p) => !['pago', 'cancelado'].includes(p.status) && p.vencimento < hoje);
  l.push(`\n### Parcelas em atraso (${atrasadas.length})`);
  atrasadas.forEach((p) => l.push(`- ${p.contrato?.cliente_nome} · ${p.numero}ª · ${moeda(p.valor)} · venceu ${data(p.vencimento)} · ${nomeV(p.contrato?.vendedor_id)} · ${STATUS_P[p.status] || p.status}`));
  const proximas = (parcelas || []).filter((p) => !['pago', 'cancelado'].includes(p.status) && p.vencimento >= hoje).slice(0, 80);
  l.push(`\n### Próximos vencimentos`);
  proximas.forEach((p) => l.push(`- ${data(p.vencimento)} · ${p.contrato?.cliente_nome} · ${moeda(p.valor)} · ${STATUS_P[p.status] || p.status}`));
  l.push(`\n### Visitas dos últimos 60 dias (${(visitas || []).length})`);
  (visitas || []).slice(0, 200).forEach((v) => l.push(`- ${data(v.iniciada_em)} · ${nomeV(v.vendedor_id)} · ${v.cliente?.nome || ''}${v.status === 'em_andamento' ? ' · em andamento' : ''}`));
  l.push(`\n### Clientes (${(clientes || []).length})`);
  (clientes || []).forEach((c) => l.push(`- ${c.nome}${c.segmento?.nome ? ` (${c.segmento.nome})` : ''}${c.cidade ? `, ${c.cidade}` : ''} · ${nomeV(c.vendedor_id)}`));
  return l.join('\n');
}

export const REGRAS_DUVIDAS = `Você é o assistente comercial da Rádio 96 FM e da Rádio do Agro (Organização Júlio Capparelli). Quem pergunta é um vendedor ou o gestor, às vezes por voz (pode haver erros de digitação).
Responda SÓ com base nos dados do sistema abaixo, que estão atualizados agora. Se a informação não estiver nos dados, diga que não encontrou e sugira falar com o gestor. Nunca invente vagas, preços ou horários.

Regras do negócio:
- Um programa tem um número de cotas. Contratos ativos ou aguardando assinatura ocupam cota.
- Exclusividade: o mesmo segmento (ramo de atividade) não pode estar duas vezes no mesmo programa no mesmo período. Se o ramo da empresa que o vendedor citar for parecido com um segmento já ocupado (ex.: "limpeza pós-obra" e "Limpeza"), avise que pode haver conflito e diga até quando está ocupado.
- Quando um segmento ou programa está ocupado, diga a data em que libera.
- Preço por período: o valor mensal pode cair em contratos de 3, 6 ou 12 meses. Respeite o contrato mínimo.
- Mencione condições especiais ativas quando forem relevantes.
- Você só lê: não consegue criar, mudar nem apagar nada. Se pedirem, explique onde fazer no sistema.
- Para vendedor, os dados de clientes, contratos e ganhos são só os dele; não comente dados de outros vendedores além do que aparece nos programas.

Jeito de responder: português do Brasil, simples e curto (o vendedor pode ser uma pessoa mais velha, no celular). Vá direto à resposta: primeiro "tem vaga" ou "não tem", depois o essencial (programa, horário, preço, até quando está ocupado). Use listas curtas quando ajudar. Pode usar **negrito** para o mais importante. Sem tabelas.`;

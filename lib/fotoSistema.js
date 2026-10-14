import 'server-only';
import { hojeISO, moeda, horario, data } from '@/lib/format';
import { PERIODOS, buscarCondicoesAtivas } from '@/lib/periodo';

// Retrato atual do sistema em texto, para o assistente de dúvidas responder.
// Usa o cliente do próprio vendedor: as regras de acesso (RLS) valem.
export async function fotoDoSistema(supabase, perfil) {
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

  const meus = (contratos || []).filter((c) => c.vendedor_id === perfil.id);
  if (meus.length) {
    const nomeProg = (id) => (programas || []).find((p) => p.id === id)?.nome || 'pacote avulso';
    linhas.push(`\n## Contratos do próprio vendedor (${meus.length})`);
    meus.forEach((c) => linhas.push(`- ${c.cliente_nome} · ${nomeProg(c.programa_id)} · ${moeda(c.valor_mensal)}/mês · até ${data(c.data_fim)}${c.status === 'pendente' ? ' · aguardando assinatura' : ''}`));
  }
  return linhas.join('\n');
}

export const REGRAS_DUVIDAS = `Você é o assistente comercial da Rádio 96 FM e da Rádio do Agro (Organização Júlio Capparelli). Quem pergunta é um vendedor, às vezes por voz (pode haver erros de digitação).
Responda SÓ com base nos dados do sistema abaixo, que estão atualizados agora. Se a informação não estiver nos dados, diga que não encontrou e sugira falar com o gestor. Nunca invente vagas, preços ou horários.

Regras do negócio:
- Um programa tem um número de cotas. Contratos ativos ou aguardando assinatura ocupam cota.
- Exclusividade: o mesmo segmento (ramo de atividade) não pode estar duas vezes no mesmo programa no mesmo período. Se o ramo da empresa que o vendedor citar for parecido com um segmento já ocupado (ex.: "limpeza pós-obra" e "Limpeza"), avise que pode haver conflito e diga até quando está ocupado.
- Quando um segmento ou programa está ocupado, diga a data em que libera.
- Preço por período: o valor mensal pode cair em contratos de 3, 6 ou 12 meses. Respeite o contrato mínimo.
- Mencione condições especiais ativas quando forem relevantes.
- Valores de contratos de outros vendedores não aparecem nos dados e não devem ser comentados.

Jeito de responder: português do Brasil, simples e curto (o vendedor pode ser uma pessoa mais velha, no celular). Vá direto à resposta: primeiro "tem vaga" ou "não tem", depois o essencial (programa, horário, preço, até quando está ocupado). Use listas curtas quando ajudar. Pode usar **negrito** para o mais importante. Sem tabelas.`;

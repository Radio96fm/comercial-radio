// Faturamento dos meses antes do sistema (tabela faturamento_historico),
// montado a partir dos contratos em PDF. Só entra no mês que não tem nenhuma
// parcela no sistema: dali em diante valem as parcelas de verdade.
export function comHistorico(serie, historico, radioId = null) {
  const linhas = (historico || []).filter((h) => !radioId || h.radio_id === radioId);
  return serie.map((s) => {
    if (s.recebido || s.previsto) return s;
    const doMes = linhas.filter((h) => h.mes === s.chave);
    if (!doMes.length) return s;
    const valor = doMes.reduce((t, h) => t + Number(h.valor), 0);
    return { ...s, recebido: valor, previsto: valor, historico: true };
  });
}

import { somarDias, somarMeses } from '@/lib/format';
import { RADIOS, CONTRATOS_DEMO, VISITAS_DEMO, gradeDemo, equipeDemo } from '@/lib/demoDados';

// Dados de demonstração do Painel do Diretor (link público de apresentação).
// Vêm da fonte única lib/demoDados.js (os mesmos do app do vendedor) e passam
// pelos mesmos filtros das consultas do /diretor, sem tocar no banco.
export function dadosDemoDiretor(hoje) {
  const mesAtual = hoje.slice(0, 7);
  const inicioSerie = somarMeses(`${mesAtual}-01`, -5);
  const desde30 = `${somarDias(hoje, -30)}T00:00:00`;
  const validos = CONTRATOS_DEMO.filter((c) => c.status !== 'cancelado');
  const comContrato = (c) => validos.flatMap((ct) => ct.parcelas.map((p) => ({ ...p, contrato: c(ct) })));

  return {
    hoje,
    radios: RADIOS,
    contratos: CONTRATOS_DEMO.filter((c) => ['ativo', 'pendente'].includes(c.status)),
    novosMes: validos.filter((c) => c.created_at.slice(0, 7) >= mesAtual),
    parcelas: comContrato((ct) => ({ status: ct.status, radio_id: ct.radio_id, programa: ct.programa }))
      .filter((p) => p.status !== 'cancelado' && (p.vencimento >= inicioSerie || (p.pago_em && p.pago_em >= inicioSerie))),
    abertas: comContrato((ct) => ({ status: ct.status, cliente_nome: ct.cliente_nome, radio_id: ct.radio_id, programa: ct.programa, vendedor: ct.vendedor }))
      .filter((p) => ['a_emitir', 'emitido'].includes(p.status) && p.vencimento < hoje),
    vendedores: equipeDemo(),
    visitas: VISITAS_DEMO.filter((v) => v.iniciada_em >= desde30 || v.status === 'em_andamento'),
    programas: gradeDemo(hoje),
  };
}

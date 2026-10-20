import { somarDias, somarMeses } from '@/lib/format';
import { RADIOS, CONTRATOS_DEMO, VISITAS_DEMO, gradeDemo, equipeDemo } from '@/lib/demoDados';

// Dados de demonstração do Painel Comercial (link público de apresentação).
// Vêm da fonte única lib/demoDados.js (os mesmos do app do vendedor) e passam
// pelos mesmos filtros das consultas do /comercial. Sem valores em R$.
const semValores = ({ valor_mensal, parcelas, ...c }) => c;

export function dadosDemoComercial(hoje) {
  const inicioAnt = somarMeses(`${hoje.slice(0, 7)}-01`, -1);
  const desde = [inicioAnt, somarDias(hoje, -30)].sort()[0];

  return {
    hoje,
    radios: RADIOS,
    contratos: CONTRATOS_DEMO.filter((c) => ['ativo', 'pendente'].includes(c.status)).map(semValores),
    novos: CONTRATOS_DEMO.filter((c) => c.status !== 'cancelado' && c.created_at >= inicioAnt).map(semValores),
    vendedores: equipeDemo(),
    visitas: VISITAS_DEMO.filter((v) => v.iniciada_em >= desde || ['em_andamento', 'proposta'].includes(v.status)),
    liberadas: [],
    programas: gradeDemo(hoje),
  };
}

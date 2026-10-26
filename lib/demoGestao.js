import { somarDias } from '@/lib/format';
import { RADIOS, CLIENTES, CONTRATOS_DEMO, VISITAS_DEMO, gradeDemo, EQUIPE } from '@/lib/demoDados';

// Dados de demonstração da Gestão Comercial (/demo-gestao), da fonte única
// lib/demoDados.js. Mesmos recortes das consultas do /gestao. Sem valores em R$.
export function dadosDemoGestao(hoje) {
  const em30 = somarDias(hoje, 30);
  const vencendo = CONTRATOS_DEMO
    .filter((c) => ['ativo', 'pendente'].includes(c.status) && c.data_fim >= hoje && c.data_fim <= em30)
    .sort((a, b) => a.data_fim.localeCompare(b.data_fim));
  const visitas = VISITAS_DEMO.filter((v) => v.status === 'em_andamento')
    .sort((a, b) => b.iniciada_em.localeCompare(a.iniciada_em));

  const fatos = [
    ...CONTRATOS_DEMO.filter((c) => c.status !== 'cancelado').map((c) => ({
      created_at: c.created_at, descricao: `Contrato de ${c.cliente_nome} em ${c.programa.nome}`, usuario: c.vendedor,
    })),
    ...VISITAS_DEMO.map((v) => ({
      created_at: v.encerrada_em || v.iniciada_em,
      descricao: v.status === 'em_andamento' ? `Visita iniciada em ${v.cliente.nome}` : v.status === 'proposta' ? `Proposta enviada para ${v.cliente.nome}` : `Visita encerrada em ${v.cliente.nome}`,
      usuario: v.vendedor,
    })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6).map((a, i) => ({ id: `at${i}`, ...a }));

  return {
    hoje,
    radios: RADIOS,
    programas: gradeDemo(hoje),
    vencendo,
    visitas,
    pendentes: CONTRATOS_DEMO.filter((c) => c.status === 'pendente'),
    totalClientes: CLIENTES.length,
    totalVendedores: EQUIPE.filter((p) => p.papel === 'vendedor').length,
    atividades: fatos,
    visitasSerie: VISITAS_DEMO,
    clientesNovos: 3,
  };
}

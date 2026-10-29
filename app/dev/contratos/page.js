import { requireDev } from '@/lib/auth';
import { carregarQuadro } from '@/lib/quadroContratos';
import Quadro from '@/components/QuadroComissoes';

// Quadro dos contratos vigentes por vendedor (estilo Trello). Arrastar um
// contrato de uma coluna para outra troca o vendedor e a comissão.
export default async function ContratosDev() {
  const { supabase } = await requireDev();
  const { error, reps, contratos, linhas } = await carregarQuadro(supabase);

  return (
    <>
      <div className="cabecalho">
        <h1>Contratos por vendedor</h1>
        <span className="muted">{contratos.length} contratos no ar ou para começar</span>
      </div>
      {error && <div className="alerta erro">Falta criar a tabela de comissão por contrato no Supabase.</div>}
      <p className="muted" style={{ marginTop: 0 }}>
        Arraste um contrato para outro vendedor (no celular, toque nele). Quando a regra da comissão for conhecida, o sistema só pede confirmação.
        Quando não for (contrato dividido, regra a definir), ele trava e pede a regra antes de gravar.
      </p>
      <Quadro reps={reps} contratos={contratos} linhas={linhas} />
    </>
  );
}

import Link from 'next/link';
import { requireFinanceiro } from '@/lib/auth';
import { carregarQuadro } from '@/lib/quadroContratos';
import Quadro from '@/components/QuadroComissoes';

// Comissão contrato por contrato: o mesmo quadro do desenvolvedor, para o
// financeiro deixar a regra de cada contrato certa antes de pagar.
export default async function ComissaoPorContrato() {
  const { supabase, baseFin } = await requireFinanceiro();
  const { error, reps, contratos, linhas } = await carregarQuadro(supabase);
  const aDefinir = new Set(linhas.filter((l) => l.papel === 'vendedor' && l.percentual == null).map((l) => l.contrato_id)).size;

  return (
    <>
      <div className="cabecalho">
        <h1>Comissão por contrato</h1>
        <span className="muted">{contratos.length} contratos no ar ou para começar{aDefinir ? ` · ${aDefinir} com regra a definir` : ''}</span>
      </div>
      {error && <div className="alerta erro">Não foi possível ler as comissões dos contratos.</div>}
      <p className="muted" style={{ marginTop: 0 }}>
        Cada coluna é um vendedor. Toque em um contrato para ver e mudar a regra (percentual, se é do valor cheio ou depois dos 2%, e a regra escrita).
        Arraste para outro vendedor para trocar quem vendeu. Ao salvar, a comissão é recalculada na hora em <Link href={`${baseFin}/comissoes`}>Comissões</Link> e no app do vendedor.
      </p>
      <Quadro reps={reps} contratos={contratos} linhas={linhas} />
    </>
  );
}

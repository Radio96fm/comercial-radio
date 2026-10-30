import Link from 'next/link';
import { requireFinanceiro } from '@/lib/auth';
import { carregarQuadro } from '@/lib/quadroContratos';
import Quadro from '@/components/QuadroComissoes';
import { radioAtual } from '@/lib/radio';

// Comissão contrato por contrato: o mesmo quadro do desenvolvedor, para o
// financeiro deixar a regra de cada contrato certa antes de pagar.
export default async function ComissaoPorContrato() {
  const { supabase, baseFin } = await requireFinanceiro();
  const { radio } = await radioAtual(supabase);
  const { error, reps, agencias, contratos, linhas, historico } = await carregarQuadro(supabase, radio?.id);
  const aDefinir = new Set(linhas.filter((l) => l.papel === 'vendedor' && l.percentual == null).map((l) => l.contrato_id)).size;

  return (
    <>
      <div className="cabecalho">
        <h1>Comissão por contrato</h1>
        <span className="muted">{contratos.length} contratos no ar ou para começar{aDefinir ? ` · ${aDefinir} com regra a definir` : ''}</span>
      </div>
      {error && <div className="alerta erro">Não foi possível ler as comissões dos contratos.</div>}
      <p className="muted" style={{ marginTop: 0 }}>
        Cada coluna é um vendedor. Toque em um contrato para arrumar a comissão: o % de cada vendedor, quanto se tira do valor antes
        (valor cheio, depois dos 2% ou outro) e a observação. A prévia mostra a conta antes de salvar. Contratos com dois vendedores ficam em
        &quot;A definir&quot; até a divisão ser salva e depois passam para &quot;Dois vendedores&quot;. Ao salvar, a comissão é recalculada na hora em{' '}
        <Link href={`${baseFin}/comissoes`}>Comissões</Link> e no app do vendedor.
      </p>
      <Quadro reps={reps} agencias={agencias} contratos={contratos} linhas={linhas} historico={historico} />
    </>
  );
}

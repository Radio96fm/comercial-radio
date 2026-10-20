import { opcoesPeriodo } from '@/lib/financeiro';
import FormAuto from '@/components/FormAuto';

// Filtros por vendedor e período: aplicam sozinhos ao mudar
export default function Filtros({ vendedores, sp, extra, semPeriodo, periodos }) {
  return (
    <FormAuto className="card filtros-fin">
      <div className="campo"><label>Vendedor</label>
        <select name="vendedor" defaultValue={sp?.vendedor || ''}>
          <option value="">Todos</option>
          {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
        </select>
      </div>
      {!semPeriodo && (
        <div className="campo"><label>Período</label>
          <select name="periodo" defaultValue={sp?.periodo || (periodos ? periodos[0][0] : '30d')}>
            {(periodos || opcoesPeriodo()).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
        </div>
      )}
      {extra}
    </FormAuto>
  );
}

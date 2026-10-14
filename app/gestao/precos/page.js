import { requireGestor } from '@/lib/auth';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import { salvarPreco, excluirPreco } from '../actions';
import { valorParaCampo } from '@/lib/format';
import { nomeItem, MODALIDADE } from '@/lib/pacote';
import { AbasRadio, FaixaRadio } from '@/components/gestao/RadiosGestao';

export default async function TabelaPrecos({ searchParams }) {
  const { supabase } = await requireGestor();
  const [{ data: radios }, { data: precos }] = await Promise.all([
    supabase.from('radios').select('id, nome, cor, slogan').order('ordem'),
    supabase.from('tabela_precos').select('*').order('tipo').order('duracao').order('modalidade', { ascending: false }),
  ]);
  const radio = (radios || []).find((r) => r.id === searchParams?.radio) || radios?.[0];
  const doRadio = (radios || []).filter((r) => r.id === radio?.id);

  return (
    <>
      <div className="cabecalho">
        <h1>Tabela de preços</h1>
        <AbasRadio radios={radios || []} atual={radio?.id} href={(r) => `/gestao/precos?radio=${r.id}`} />
      </div>
      <p className="muted">Valor por unidade (uma inserção ou um testemunhal). É o que o vendedor usa para montar pacotes avulsos; o total aparece na hora para ele.</p>

      <details className="card">
        <summary>Adicionar item à tabela</summary>
        <FormAcao action={salvarPreco} limparAoSalvar>
          <div className="form-grid">
            <div className="campo"><label>Rádio</label>
              <select name="radio_id" defaultValue={radio?.id}>{(radios || []).map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}</select>
            </div>
            <div className="campo"><label>Tipo</label>
              <select name="tipo"><option value="insercao">Inserção</option><option value="testemunhal">Testemunhal</option></select>
            </div>
            <div className="campo"><label>Duração (segundos)</label><input name="duracao" type="number" min="1" required /></div>
            <div className="campo"><label>Horário</label>
              <select name="modalidade">{Object.entries(MODALIDADE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </div>
            <div className="campo"><label>Valor (R$)</label><input name="valor" inputMode="decimal" required /></div>
          </div>
          <BotaoEnviar className="btn" texto="Adicionar" />
        </FormAcao>
      </details>

      {doRadio.map((r) => {
        const itens = (precos || []).filter((p) => p.radio_id === r.id);
        return (
          <div key={r.id} style={{ marginBottom: 18 }}>
            <FaixaRadio radio={r}><span><b>{itens.length}</b> itens na tabela</span></FaixaRadio>
            <div className="tabela">
              <table>
                <thead><tr><th>Item</th><th>Horário</th><th>Valor (R$)</th><th></th></tr></thead>
                <tbody>
                  {!itens.length && <tr><td colSpan={4} className="muted">Nenhum item.</td></tr>}
                  {itens.map((p) => (
                    <tr key={p.id} style={p.ativo ? undefined : { opacity: 0.5 }}>
                      <td><b>{nomeItem(p)}</b></td>
                      <td>{MODALIDADE[p.modalidade]}</td>
                      <td>
                        <FormAcao action={salvarPreco} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input type="hidden" name="id" value={p.id} />
                          <input name="valor" inputMode="decimal" defaultValue={valorParaCampo(p.valor)} style={{ width: 110, padding: '8px 10px' }} />
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500, fontSize: '.85rem' }}>
                            <input type="checkbox" name="ativo" defaultChecked={p.ativo} /> ativo
                          </label>
                          <BotaoEnviar className="btn peq sec" texto="OK" enviando="..." />
                        </FormAcao>
                      </td>
                      <td>
                        <form action={excluirPreco}>
                          <input type="hidden" name="id" value={p.id} />
                          <BotaoEnviar className="btn peq vermelho" texto="Excluir" enviando="..." confirmar="Excluir este item da tabela?" />
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}

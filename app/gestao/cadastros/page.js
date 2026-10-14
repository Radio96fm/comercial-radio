import { requireGestor } from '@/lib/auth';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import { criarSegmento, excluirSegmento, salvarRadio } from '../actions';

export default async function Cadastros() {
  const { supabase } = await requireGestor();
  const [{ data: radios }, { data: segmentos }] = await Promise.all([
    supabase.from('radios').select('*').order('ordem'),
    supabase.from('segmentos').select('*').order('nome'),
  ]);

  return (
    <>
      <div className="cabecalho"><h1>Rádios e segmentos</h1></div>

      <h2>Rádios</h2>
      <div className="form-grid">
        {(radios || []).map((r) => (
          <div className="card" key={r.id} style={{ borderTop: `6px solid ${r.cor}` }}>
            <FormAcao action={salvarRadio}>
              <input type="hidden" name="id" value={r.id} />
              <div className="campo"><label>Nome</label><input name="nome" defaultValue={r.nome} /></div>
              <div className="campo"><label>Slogan</label><input name="slogan" defaultValue={r.slogan || ''} /></div>
              <div className="campo"><label>Cor</label><input type="color" name="cor" defaultValue={r.cor} style={{ height: 50, padding: 4 }} /></div>
              <p className="muted" style={{ margin: '4px 0 10px' }}><b>Dados da emissora no contrato</b></p>
              {[['razao_social', 'Razão social'], ['cnpj', 'CNPJ'], ['inscricao_estadual', 'Inscrição estadual'], ['endereco', 'Endereço'], ['cep', 'CEP'], ['cidade_uf', 'Cidade-UF'], ['telefone', 'Fone'], ['fax', 'Fax'], ['email', 'E-mail']].map(([k, rot]) => (
                <div className="campo" key={k}><label>{rot}</label><input name={k} defaultValue={r[k] || ''} /></div>
              ))}
              <BotaoEnviar className="btn peq" texto="Salvar" />
            </FormAcao>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 20 }}>Segmentos</h2>
      <p className="muted">Usados na regra de exclusividade: um programa não aceita dois patrocinadores do mesmo segmento ao mesmo tempo.</p>
      <div className="card">
        <FormAcao action={criarSegmento} limparAoSalvar style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input name="nome" placeholder="Novo segmento (ex.: Autopeças)" style={{ flex: '1 1 240px' }} />
          <BotaoEnviar className="btn" texto="Adicionar" />
        </FormAcao>
      </div>
      <div className="tabela">
        <table>
          <tbody>
            {(segmentos || []).map((s) => (
              <tr key={s.id}>
                <td>{s.nome}</td>
                <td style={{ width: 1 }}>
                  <FormAcao action={excluirSegmento}>
                    <input type="hidden" name="id" value={s.id} />
                    <BotaoEnviar className="btn peq cinza" texto="Excluir" enviando="..." confirmar={`Excluir o segmento "${s.nome}"?`} />
                  </FormAcao>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

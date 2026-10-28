import { requireDev } from '@/lib/auth';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import LinkCadastro from '../LinkCadastro';
import { salvarRepresentante, vincularRepresentante, excluirRepresentante } from '../actions';

const VIGENTE = ['pendente', 'ativo'];

function CamposRepresentante({ r = {} }) {
  return (
    <div className="form-grid">
      <div className="campo"><label>Nome (como está no contrato) *</label><input name="nome" defaultValue={r.nome || ''} required /></div>
      <div className="campo">
        <label>Tipo</label>
        <select name="tipo" defaultValue={r.tipo || 'vendedor'}>
          <option value="vendedor">Vendedor (pessoa)</option>
          <option value="agencia">Agência</option>
        </select>
      </div>
      <div className="campo"><label>CPF ou CNPJ</label><input name="documento" defaultValue={r.documento || ''} inputMode="numeric" /><div className="ajuda">É por ele que o cadastro pelo link encontra os contratos.</div></div>
      <div className="campo"><label>Telefone</label><input name="telefone" defaultValue={r.telefone || ''} type="tel" /></div>
      <div className="campo"><label>E-mail</label><input name="email" defaultValue={r.email || ''} type="email" /></div>
      <div className="campo"><label>Observações</label><input name="observacoes" defaultValue={r.observacoes || ''} /></div>
    </div>
  );
}

export default async function Vendedores() {
  const { supabase } = await requireDev();
  const [{ data: reps, error }, { data: contratos }, { data: logins }] = await Promise.all([
    supabase.from('representantes').select('*').order('nome'),
    supabase.from('contratos').select('representante_id, status').not('representante_id', 'is', null),
    supabase.from('profiles').select('id, nome, email, papel').eq('ativo', true).order('nome'),
  ]);

  const qtd = {};
  (contratos || []).forEach((c) => {
    const q = (qtd[c.representante_id] ||= { vigentes: 0, total: 0 });
    q.total += 1;
    if (VIGENTE.includes(c.status)) q.vigentes += 1;
  });
  const nomeLogin = Object.fromEntries((logins || []).map((l) => [l.id, l]));
  const lista = reps || [];
  const aguardando = lista.filter((r) => !r.profile_id);
  const cadastrados = lista.filter((r) => r.profile_id);

  return (
    <>
      <div className="cabecalho">
        <h1>Vendedores e agências</h1>
        <span className="muted">{lista.length} no total · {cadastrados.length} com acesso · {aguardando.length} aguardando cadastro</span>
      </div>

      {error && <div className="alerta erro">Falta rodar o arquivo migracao-painel-dev.sql no Supabase para esta tela funcionar.</div>}

      <LinkCadastro supabase={supabase} />

      <details className="card">
        <summary>Adicionar vendedor ou agência</summary>
        <FormAcao action={salvarRepresentante} limparAoSalvar>
          <CamposRepresentante />
          <BotaoEnviar className="btn" texto="Adicionar" />
        </FormAcao>
      </details>

      {lista.length === 0 && !error && (
        <div className="vazio">Ainda não tem ninguém. Quando os contratos em PDF forem importados, os vendedores e agências aparecem aqui.</div>
      )}

      {[['Aguardando cadastro', aguardando], ['Com acesso ao sistema', cadastrados]].map(([titulo, grupo]) => grupo.length > 0 && (
        <section key={titulo}>
          <h2>{titulo} ({grupo.length})</h2>
          <div className="lista">
            {grupo.map((r) => {
              const q = qtd[r.id] || { vigentes: 0, total: 0 };
              const login = r.profile_id && nomeLogin[r.profile_id];
              return (
                <details key={r.id} className="card" style={{ marginBottom: 0 }}>
                  <summary>
                    {r.nome} — <span className={`badge ${r.tipo === 'agencia' ? 'b-amarelo' : 'b-azul'}`}>{r.tipo === 'agencia' ? 'agência' : 'vendedor'}</span>{' '}
                    {login ? <span className="badge b-verde">acesso: {login.nome}</span> : <span className="badge b-cinza">aguardando cadastro</span>}{' '}
                    <small>{r.documento || 'sem CPF/CNPJ'} · {q.vigentes} contrato(s) vigente(s)</small>
                  </summary>
                  <div className="form-grid">
                    <FormAcao action={salvarRepresentante}>
                      <input type="hidden" name="id" value={r.id} />
                      <CamposRepresentante r={r} />
                      <BotaoEnviar className="btn peq" texto="Salvar" />
                    </FormAcao>
                    <div>
                      <FormAcao action={vincularRepresentante}>
                        <input type="hidden" name="id" value={r.id} />
                        <div className="campo">
                          <label>{login ? 'Trocar o login ligado' : 'Ligar a um login que já existe'}</label>
                          <select name="profile_id" defaultValue={r.profile_id || ''} required>
                            <option value="" disabled>Escolha…</option>
                            {(logins || []).map((l) => <option key={l.id} value={l.id}>{l.nome} ({l.email})</option>)}
                          </select>
                          <div className="ajuda">Os {q.total} contrato(s) e os clientes deles passam para esse login.</div>
                        </div>
                        <BotaoEnviar className="btn peq sec" texto="Vincular" />
                      </FormAcao>
                      {q.total === 0 && (
                        <form action={excluirRepresentante} style={{ marginTop: 16 }}>
                          <input type="hidden" name="id" value={r.id} />
                          <BotaoEnviar className="btn peq vermelho" texto="Excluir" confirmar={`Excluir ${r.nome}?`} />
                        </form>
                      )}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

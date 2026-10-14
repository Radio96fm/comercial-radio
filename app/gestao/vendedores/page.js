import { requireGestor } from '@/lib/auth';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import { criarUsuario, atualizarUsuario, alternarAtivo, redefinirSenha } from '../actions';

export default async function Usuarios() {
  const { supabase, perfil } = await requireGestor();
  const [{ data: usuarios }, { data: contagem }] = await Promise.all([
    supabase.from('profiles').select('*').order('ativo', { ascending: false }).order('nome'),
    supabase.from('contratos').select('vendedor_id').in('status', ['pendente', 'ativo']),
  ]);
  const qtd = {};
  (contagem || []).forEach((c) => { qtd[c.vendedor_id] = (qtd[c.vendedor_id] || 0) + 1; });

  return (
    <>
      <div className="cabecalho"><h1>Usuários</h1></div>

      <details className="card" open={!usuarios || usuarios.length <= 1}>
        <summary>Cadastrar vendedor ou gestor</summary>
        <FormAcao action={criarUsuario} limparAoSalvar>
          <div className="form-grid">
            <div className="campo"><label>Nome *</label><input name="nome" required /></div>
            <div className="campo"><label>E-mail (login) *</label><input name="email" type="email" required /></div>
            <div className="campo"><label>Telefone</label><input name="telefone" type="tel" /></div>
            <div className="campo">
              <label>Senha inicial *</label>
              <input name="senha" type="text" minLength={8} required autoComplete="new-password" />
              <div className="ajuda">Mínimo 8 caracteres. Você passa para o vendedor.</div>
            </div>
            <div className="campo">
              <label>Tipo de acesso</label>
              <select name="papel" defaultValue="vendedor">
                <option value="vendedor">Vendedor (app no celular)</option>
                <option value="gestor">Gestor (painel completo)</option>
              </select>
            </div>
          </div>
          <BotaoEnviar className="btn" texto="Criar usuário" enviando="Criando..." />
        </FormAcao>
      </details>

      <div className="lista">
        {(usuarios || []).map((u) => (
          <details key={u.id} className="card" style={{ marginBottom: 0, opacity: u.ativo ? 1 : 0.6 }}>
            <summary>
              {u.nome} {u.id === perfil.id && '(você)'} — <span className={`badge ${u.papel === 'gestor' ? 'b-azul' : 'b-cinza'}`}>{u.papel}</span>{' '}
              {!u.ativo && <span className="badge b-vermelho">desativado</span>}{' '}
              <small>{u.email} · {qtd[u.id] || 0} contratos vigentes</small>
            </summary>
            <div className="form-grid">
              <FormAcao action={atualizarUsuario}>
                <input type="hidden" name="id" value={u.id} />
                <div className="campo"><label>Nome</label><input name="nome" defaultValue={u.nome} /></div>
                <div className="campo"><label>Telefone</label><input name="telefone" defaultValue={u.telefone || ''} /></div>
                <div className="campo"><label>CPF/CNPJ (sai no contrato como agência)</label><input name="documento" defaultValue={u.documento || ''} /></div>
                <div className="campo"><label>Comissão (%)</label><input name="comissao" inputMode="decimal" defaultValue={String(u.comissao ?? 18).replace('.', ',')} /></div>
                <div className="campo">
                  <label>Tipo de acesso</label>
                  <select name="papel" defaultValue={u.papel}>
                    <option value="vendedor">Vendedor</option>
                    <option value="gestor">Gestor</option>
                  </select>
                </div>
                <BotaoEnviar className="btn peq" texto="Salvar" />
              </FormAcao>
              <div>
                <FormAcao action={redefinirSenha} limparAoSalvar>
                  <input type="hidden" name="id" value={u.id} />
                  <div className="campo"><label>Nova senha</label><input name="senha" type="text" minLength={8} autoComplete="new-password" /></div>
                  <BotaoEnviar className="btn peq sec" texto="Redefinir senha" />
                </FormAcao>
                {u.id !== perfil.id && (
                  <form action={alternarAtivo} style={{ marginTop: 16 }}>
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="ativar" value={u.ativo ? '0' : '1'} />
                    <BotaoEnviar
                      className={`btn peq ${u.ativo ? 'vermelho' : 'verde'}`}
                      texto={u.ativo ? 'Desativar acesso' : 'Reativar acesso'}
                      confirmar={u.ativo ? `Desativar o acesso de ${u.nome}? Ele não conseguirá mais entrar.` : undefined}
                    />
                  </form>
                )}
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}

import { requireMaster } from '@/lib/auth';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import { criarUsuario, atualizarUsuario, alternarAtivo, redefinirSenha, novoConvite } from '../actions';
import { headers } from 'next/headers';
import CopiarTexto from '@/components/CopiarTexto';

export default async function Usuarios() {
  const { supabase, perfil } = await requireMaster();
  const [{ data: usuarios }, { data: contagem }] = await Promise.all([
    supabase.from('profiles').select('*').order('ativo', { ascending: false }).order('nome'),
    supabase.from('contratos').select('vendedor_id').in('status', ['pendente', 'ativo']),
  ]);
  const { data: codigo } = await supabase.rpc('convite_vendedor', { p_novo: false });
  const h = headers();
  const linkConvite = `https://${h.get('x-forwarded-host') || h.get('host')}/cadastro/${codigo}`;
  const qtd = {};
  (contagem || []).forEach((c) => { qtd[c.vendedor_id] = (qtd[c.vendedor_id] || 0) + 1; });

  return (
    <>
      <div className="cabecalho"><h1>Usuários</h1></div>

      <div className="card convite">
        <h2 style={{ marginTop: 0 }}>Link de cadastro dos vendedores</h2>
        <p className="muted">Mande este link no grupo da equipe. Cada vendedor abre, coloca o próprio e-mail, cria a senha e já entra no app.</p>
        <div className="link-convite"><code>{linkConvite}</code></div>
        <div className="acoes" style={{ marginTop: 10 }}>
          <CopiarTexto texto={linkConvite} rotulo="Copiar link" className="btn" />
          <a className="btn whats" href={`https://wa.me/?text=${encodeURIComponent(`Olá! Este é o link para você criar seu acesso ao sistema comercial da Rádio 96 FM e Rádio do Agro: ${linkConvite}`)}`} target="_blank" rel="noopener noreferrer">Mandar no WhatsApp</a>
          <form action={novoConvite}><BotaoEnviar className="btn cinza" texto="Trocar link" enviando="..." confirmar="Gerar um link novo? O link antigo para de funcionar." /></form>
        </div>
      </div>

      <details className="card" open={!usuarios || usuarios.length <= 1}>
        <summary>Criar acesso (gestor, financeiro ou vendedor)</summary>
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
                <option value="comercial">Gestor comercial (painel, sem usuários e financeiro)</option>
                <option value="gestor">Gestor master (tudo)</option>
                <option value="financeiro">Financeiro</option>
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
              {u.nome} {u.id === perfil.id && '(você)'} — <span className={`badge ${u.papel === 'gestor' ? 'b-azul' : u.papel === 'vendedor' ? 'b-cinza' : 'b-amarelo'}`}>{{ gestor: 'gestor master', comercial: 'gestor comercial', financeiro: 'financeiro', vendedor: 'vendedor' }[u.papel] || u.papel}</span>{' '}
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
                    <option value="comercial">Gestor comercial</option>
                    <option value="gestor">Gestor master</option>
                    <option value="financeiro">Financeiro</option>
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

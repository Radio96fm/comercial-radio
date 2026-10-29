import { requireDev } from '@/lib/auth';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import Link from 'next/link';
import { criarUsuario, criarAcessosTeste, atualizarUsuario, alternarAtivo, redefinirSenha, excluirUsuario } from '@/app/gestao/actions';
import { salvarFuncoes } from '../actions';
import { FUNCOES } from '@/lib/funcoes';
import { dataHora } from '@/lib/format';

export default async function Acessos() {
  const { supabase, perfil } = await requireDev();
  const [{ data: usuarios }, { data: contagem }] = await Promise.all([
    supabase.from('profiles').select('*').order('ativo', { ascending: false }).order('nome'),
    supabase.from('contratos').select('vendedor_id').in('status', ['pendente', 'ativo']),
  ]);
  const qtd = {};
  (contagem || []).forEach((c) => { qtd[c.vendedor_id] = (qtd[c.vendedor_id] || 0) + 1; });

  return (
    <>
      <div className="cabecalho"><h1>Acessos</h1></div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Acessos de teste</h2>
        <p className="muted">Cria um login para o Painel do Diretor, um para a Gestão Comercial e um para o Financeiro, cada um com senha temporária. Depois de testar, dá para desativar aqui embaixo.</p>
        <FormAcao action={criarAcessosTeste}>
          <BotaoEnviar className="btn" texto="Criar acessos de teste" enviando="Criando..." />
        </FormAcao>
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
              {u.nome} {u.id === perfil.id && '(você)'}{u.provisorio && <span className="badge b-amarelo" title="Criado na importação dos contratos. Quando a pessoa se cadastrar pelo link com o CPF dela, os contratos passam para o login novo.">sem login ainda</span>} — <span className={`badge ${u.papel === 'gestor' ? 'b-azul' : u.papel === 'vendedor' ? 'b-cinza' : 'b-amarelo'}`}>{{ gestor: 'gestor master', comercial: 'gestor comercial', financeiro: 'financeiro', vendedor: 'vendedor' }[u.papel] || u.papel}</span>{' '}
              {!u.ativo && <span className="badge b-vermelho">desativado</span>}{' '}
              <small>{u.email} · {qtd[u.id] || 0} contratos vigentes · {u.ultimo_acesso ? `último acesso ${dataHora(u.ultimo_acesso)}` : 'nunca entrou'}</small>{' '}
              {u.funcoes_bloqueadas?.length > 0 && <span className="badge b-amarelo">{u.funcoes_bloqueadas.length} função(ões) desligada(s)</span>}
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
                {u.id !== perfil.id && (
                  <FormAcao action={excluirUsuario} style={{ marginTop: 10 }}>
                    <input type="hidden" name="id" value={u.id} />
                    <BotaoEnviar className="btn peq vermelho" texto="Excluir acesso" confirmar={`Excluir de vez o acesso de ${u.nome}? Não dá para desfazer.`} />
                  </FormAcao>
                )}
              </div>
            </div>
            {u.id !== perfil.id && (
              <FormAcao action={salvarFuncoes} style={{ marginTop: 18 }}>
                <input type="hidden" name="id" value={u.id} />
                <h3 style={{ margin: '0 0 6px' }}>Funções liberadas</h3>
                <p className="muted" style={{ marginTop: 0 }}>Desmarque o que esta pessoa não pode ver. Além disso, o tipo de acesso já limita: vendedor só usa o app, financeiro só o financeiro.</p>
                <div className="funcoes-grid">
                  {FUNCOES.map(([grupo, itens]) => (
                    <fieldset key={grupo}>
                      <legend>{grupo}</legend>
                      {itens.map(([k, rot]) => (
                        <label key={k}><input type="checkbox" name="funcao" value={k} defaultChecked={!u.funcoes_bloqueadas?.includes(k)} /> {rot}</label>
                      ))}
                    </fieldset>
                  ))}
                </div>
                <div className="acoes" style={{ marginTop: 10 }}>
                  <BotaoEnviar className="btn peq" texto="Salvar funções" />
                  <Link className="btn peq sec" href={`/dev/movimento?usuario=${u.id}`}>Ver o que fez</Link>
                </div>
              </FormAcao>
            )}
          </details>
        ))}
      </div>
    </>
  );
}

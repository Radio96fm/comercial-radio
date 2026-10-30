import { requireFinanceiro } from '@/lib/auth';
import { radioAtual } from '@/lib/radio';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import { BANCOS, SERVICOS, nomeBanco } from '@/lib/banco';
import { data, dataHora, hojeISO, somarDias } from '@/lib/format';
import { salvarBanco, salvarCertificado, removerCertificado, testarConexao } from './actions';

export const dynamic = 'force-dynamic';

function Situacao({ ok, texto }) {
  return <span className={`badge ${ok ? 'b-verde' : 'b-amarelo'}`}>{texto}</span>;
}

// Configuração da API do banco. Os segredos (Client Secret, certificado e senha) ficam
// criptografados no servidor e nenhuma tela lê de volta: aqui só aparece "cadastrado".
export default async function Banco() {
  const { supabase } = await requireFinanceiro();
  const { radio } = await radioAtual(supabase);
  const [{ data: b, error }, { data: historico }] = await Promise.all([
    supabase.rpc('banco_situacao', { p_radio: radio?.id }),
    supabase.from('banco_historico').select('quando, acao, quem:profiles(nome)').eq('radio_id', radio?.id).order('quando', { ascending: false }).limit(15),
  ]);
  const R = <input type="hidden" name="radio_id" value={radio?.id || ''} />;
  if (error || !b) return <div className="alerta erro">Não consegui abrir a configuração do banco. {error?.message}</div>;

  const hoje = hojeISO();
  const certVence = b.cert_validade;
  const certAviso = certVence && certVence <= somarDias(hoje, 30);
  const completo = b.agencia && b.conta && b.client_id && b.secret && b.certificado;

  return (
    <>
      <div className="cabecalho">
        <h1>Banco da {radio?.nome}</h1>
        <Situacao ok={false} texto={completo ? 'Cadastro completo · integração ainda não ativada' : 'Integração ainda não ativada'} />
      </div>
      <p className="muted">
        <b>{radio?.razao_social || radio?.nome}{radio?.cnpj ? ` · CNPJ ${radio.cnpj}` : ''}</b>. Cada rádio tem a sua conta, as suas chaves e o seu certificado: para configurar a outra, troque a rádio no topo.
      </p>
      <p className="muted">
        Aqui ficam os dados da API do banco para o sistema mostrar saldo, extrato, boletos e Pix.
        O Client Secret, o certificado e a senha ficam guardados criptografados no servidor, nunca no computador, e não aparecem de volta na tela.
      </p>

      <div className="card">
        <h2>Conta e acesso à API</h2>
        <FormAcao action={salvarBanco}>
          {R}
          <div className="form-grid">
            <div className="campo"><label>Banco</label>
              <select name="banco" defaultValue={b.banco || 'bradesco'}>
                {BANCOS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
              </select>
            </div>
            <div className="campo"><label>Ambiente</label>
              <select name="ambiente" defaultValue={b.ambiente}>
                <option value="homologacao">Teste (homologação)</option>
                <option value="producao">Produção (conta de verdade)</option>
              </select>
            </div>
            <div className="campo"><label>Agência</label><input name="agencia" inputMode="numeric" defaultValue={b.agencia || ''} placeholder="Ex.: 1234" /></div>
            <div className="campo"><label>Conta</label><input name="conta" inputMode="numeric" defaultValue={b.conta || ''} placeholder="Ex.: 56789" /></div>
            <div className="campo"><label>Dígito</label><input name="digito" defaultValue={b.digito || ''} placeholder="Ex.: 0" maxLength={2} /></div>
          </div>
          <div className="form-grid">
            <div className="campo"><label>Client ID</label><input name="client_id" autoComplete="off" defaultValue={b.client_id || ''} placeholder="Do portal de desenvolvedor do banco" /></div>
            <div className="campo"><label>Client Secret {b.secret && <small>(já cadastrado; cole outro só para trocar)</small>}</label>
              <input name="client_secret" type="password" autoComplete="new-password" placeholder={b.secret ? '••••••••••••' : 'Cole aqui o Client Secret'} />
            </div>
          </div>
          <div className="campo"><label>Serviços que o sistema vai usar</label>
            <div style={{ display: 'grid', gap: 10, marginTop: 6 }}>
              {SERVICOS.map(([k, nome, desc]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', fontWeight: 400 }}>
                  <input type="checkbox" name={`s_${k}`} defaultChecked={b.servicos?.[k] !== false} />
                  <span><b>{nome}</b> <span className="muted">· {desc}</span></span>
                </label>
              ))}
            </div>
          </div>
          <BotaoEnviar className="btn" texto="Salvar" enviando="Salvando..." />
        </FormAcao>
      </div>

      <div className="card">
        <div className="cabecalho" style={{ marginBottom: 6 }}>
          <h2 style={{ margin: 0 }}>Certificado digital A1</h2>
          {b.certificado
            ? <span className={`badge ${certAviso ? 'b-vermelho' : 'b-verde'}`}>Cadastrado ✓{certVence ? ` · vence em ${data(certVence)}` : ''}</span>
            : <Situacao ok={false} texto="Não cadastrado" />}
        </div>
        {b.certificado && (
          <p className="muted">
            {b.cert_titular && <><b>{b.cert_titular}</b> · </>}{b.cert_arquivo}
            {certAviso && <><br /><b style={{ color: 'var(--vermelho)' }}>O certificado vence em menos de 30 dias. Renove e envie o novo aqui.</b></>}
          </p>
        )}
        <p className="muted">O e-CNPJ A1 da {radio?.nome} (arquivo .pfx ou .p12) que o banco exige para a API. Precisa ser do CNPJ desta rádio. O sistema confere a senha e lê a validade na hora.</p>
        <FormAcao action={salvarCertificado} limparAoSalvar>
          {R}
          <div className="form-grid">
            <div className="campo"><label>Arquivo do certificado</label><input name="arquivo" type="file" accept=".pfx,.p12,application/x-pkcs12" /></div>
            <div className="campo"><label>Senha do certificado</label><input name="senha" type="password" autoComplete="new-password" placeholder="Senha do .pfx" /></div>
          </div>
          <BotaoEnviar className="btn" texto={b.certificado ? 'Trocar certificado' : 'Enviar certificado'} enviando="Conferindo..." />
        </FormAcao>
        {b.certificado && (
          <FormAcao action={removerCertificado} style={{ marginTop: 10 }}>
            {R}
            <BotaoEnviar className="btn peq cinza" texto="Remover certificado" enviando="Removendo..." />
          </FormAcao>
        )}
      </div>

      <div className="card">
        <h2>Testar conexão</h2>
        <p className="muted">
          {nomeBanco(b.banco)} · {b.ambiente === 'producao' ? 'produção' : 'teste (homologação)'}.
          Por enquanto o teste confere se está tudo cadastrado; quando a integração for ativada, ele conecta no banco de verdade.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {SERVICOS.map(([k, nome]) => (
            <span key={k} className={`badge ${b.servicos?.[k] !== false ? 'b-amarelo' : ''}`}>
              {nome}: {b.servicos?.[k] !== false ? 'aguardando ativação' : 'desligado'}
            </span>
          ))}
        </div>
        <FormAcao action={testarConexao}>
          {R}
          <BotaoEnviar className="btn" texto="Testar conexão" enviando="Testando..." />
        </FormAcao>
      </div>

      <div className="card">
        <h2>Histórico de alterações</h2>
        {historico?.length ? (
          <ul className="lista">
            {historico.map((h, i) => (
              <li key={i}><span className="muted">{dataHora(h.quando)}</span> · <b>{h.quem?.nome || 'Alguém'}</b> · {h.acao}</li>
            ))}
          </ul>
        ) : <div className="vazio">Nenhuma alteração ainda.</div>}
      </div>
    </>
  );
}

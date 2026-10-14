import Link from 'next/link';
import { requireGestor } from '@/lib/auth';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import { salvarPrograma, salvarPlano, excluirPlano } from '../actions';
import { horario, moeda, hora, valorParaCampo } from '@/lib/format';

function CamposPrograma({ radios, p = {} }) {
  return (
    <>
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <div className="form-grid">
        <div className="campo">
          <label>Rádio *</label>
          <select name="radio_id" defaultValue={p.radio_id || radios[0]?.id} required>
            {radios.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </div>
        <div className="campo"><label>Nome do programa *</label><input name="nome" defaultValue={p.nome || ''} required /></div>
        <div className="campo"><label>Apresentador</label><input name="apresentador" defaultValue={p.apresentador || ''} /></div>
        <div className="campo"><label>Dias</label><input name="dias" defaultValue={p.dias || 'Segunda a sexta'} /></div>
        <div className="campo"><label>Início</label><input type="time" name="horario_inicio" defaultValue={hora(p.horario_inicio)} /></div>
        <div className="campo"><label>Fim</label><input type="time" name="horario_fim" defaultValue={hora(p.horario_fim)} /></div>
        <div className="campo"><label>Total de cotas *</label><input type="number" min="0" name="cotas_total" defaultValue={p.cotas_total ?? 6} required /></div>
        <div className="campo"><label>Valor de referência (R$/mês)</label><input name="valor_cota" inputMode="decimal" defaultValue={valorParaCampo(p.valor_cota ?? 0)} /></div>
      </div>
      <div className="campo"><label>Descrição do programa</label><textarea name="descricao" defaultValue={p.descricao || ''} style={{ minHeight: 70 }} /></div>
      <div className="campo"><label>O que o patrocinador recebe</label><textarea name="descricao_cota" defaultValue={p.descricao_cota || ''} style={{ minHeight: 70 }} /></div>
      <div className="campo">
        <label style={{ display: 'flex', alignItems: 'center' }}>
          <input type="checkbox" name="ativo" defaultChecked={p.ativo ?? true} /> Programa ativo (aparece para os vendedores)
        </label>
      </div>
    </>
  );
}

export default async function ProgramasGestao({ searchParams }) {
  const { supabase } = await requireGestor();
  const [{ data: radios }, { data: programas }] = await Promise.all([
    supabase.from('radios').select('id, nome, cor').order('ordem'),
    supabase.from('programas_ocupacao').select('*').order('radio_nome').order('horario_inicio'),
  ]);
  const editando = (programas || []).find((p) => p.id === searchParams?.editar);
  const { data: planos } = await supabase.from('programa_planos').select('*').order('ordem');
  const planosDe = (id) => (planos || []).filter((x) => x.programa_id === id);

  return (
    <>
      <div className="cabecalho"><h1>Programas</h1></div>

      {editando ? (
        <div className="card">
          <div className="cabecalho"><h2>Editar: {editando.nome}</h2><Link href="/gestao/programas">Fechar</Link></div>
          <FormAcao action={salvarPrograma}>
            <CamposPrograma radios={radios || []} p={editando} />
            <BotaoEnviar className="btn" texto="Salvar alterações" />
          </FormAcao>

          <h2 style={{ marginTop: 24 }}>Planos de venda</h2>
          <p className="muted">Cada plano aparece para o vendedor escolher ao fechar o contrato deste programa. Programa com um valor só = um plano.</p>
          {planosDe(editando.id).map((x) => (
            <div key={x.id} className="card" style={{ background: 'var(--card-2)' }}>
              <FormAcao action={salvarPlano}>
                <input type="hidden" name="id" value={x.id} />
                <div className="form-grid">
                  <div className="campo"><label>Nome</label><input name="nome" defaultValue={x.nome} required /></div>
                  <div className="campo"><label>Valor (R$/mês)</label><input name="valor" inputMode="decimal" defaultValue={valorParaCampo(x.valor)} required /></div>
                  <div className="campo"><label>Ordem</label><input name="ordem" type="number" defaultValue={x.ordem} /></div>
                </div>
                <div className="campo"><label>O que inclui</label><textarea name="descricao" defaultValue={x.descricao || ''} style={{ minHeight: 60 }} /></div>
                <BotaoEnviar className="btn peq" texto="Salvar plano" />
              </FormAcao>
              <form action={excluirPlano} style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={x.id} />
                <BotaoEnviar className="btn peq vermelho" texto="Excluir plano" enviando="..." confirmar={`Excluir o ${x.nome}?`} />
              </form>
            </div>
          ))}
          <details className="card" style={{ background: 'var(--card-2)' }}>
            <summary>Adicionar plano</summary>
            <FormAcao action={salvarPlano} limparAoSalvar>
              <input type="hidden" name="programa_id" value={editando.id} />
              <div className="form-grid">
                <div className="campo"><label>Nome</label><input name="nome" placeholder="Plano 01" required /></div>
                <div className="campo"><label>Valor (R$/mês)</label><input name="valor" inputMode="decimal" required /></div>
                <div className="campo"><label>Ordem</label><input name="ordem" type="number" defaultValue={planosDe(editando.id).length + 1} /></div>
              </div>
              <div className="campo"><label>O que inclui</label><textarea name="descricao" style={{ minHeight: 60 }} /></div>
              <BotaoEnviar className="btn peq" texto="Adicionar plano" />
            </FormAcao>
          </details>
        </div>
      ) : (
        <details className="card">
          <summary>Cadastrar novo programa</summary>
          <FormAcao action={salvarPrograma} limparAoSalvar>
            <CamposPrograma radios={radios || []} />
            <BotaoEnviar className="btn" texto="Cadastrar programa" />
          </FormAcao>
        </details>
      )}

      <div className="tabela">
        <table>
          <thead><tr><th>Rádio</th><th>Programa</th><th>Horário</th><th>Cotas</th><th>Planos</th><th></th></tr></thead>
          <tbody>
            {(programas || []).map((p) => (
              <tr key={p.id} style={p.ativo ? undefined : { opacity: 0.5 }}>
                <td><span className="badge" style={{ background: `color-mix(in srgb, ${p.radio_cor} 20%, transparent)`, color: p.radio_cor }}>{p.radio_nome}</span></td>
                <td><b>{p.nome}</b>{!p.ativo && ' (inativo)'}<br /><small>{p.apresentador}</small></td>
                <td>{p.dias}<br /><small>{horario(p)}</small></td>
                <td>{p.cotas_ocupadas}/{p.cotas_total}</td>
                <td>
                  {planosDe(p.id).length > 1
                    ? <>{planosDe(p.id).length} planos<br /><small>a partir de {moeda(Math.min(...planosDe(p.id).map((x) => Number(x.valor))))}</small></>
                    : moeda(planosDe(p.id)[0]?.valor ?? p.valor_cota)}
                </td>
                <td><Link className="btn peq sec" href={`/gestao/programas?editar=${p.id}`}>Editar</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

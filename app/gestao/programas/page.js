import Link from 'next/link';
import { requireGestor } from '@/lib/auth';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import { salvarPrograma } from '../actions';
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
        <div className="campo"><label>Valor da cota (R$/mês)</label><input name="valor_cota" inputMode="decimal" defaultValue={valorParaCampo(p.valor_cota ?? 0)} /></div>
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

  return (
    <>
      <div className="cabecalho"><h1>Programas</h1></div>

      {editando ? (
        <div className="card">
          <div className="cabecalho"><h2>Editar: {editando.nome}</h2><Link href="/gestao/programas">Fechar ✕</Link></div>
          <FormAcao action={salvarPrograma}>
            <CamposPrograma radios={radios || []} p={editando} />
            <BotaoEnviar className="btn" texto="Salvar alterações" />
          </FormAcao>
        </div>
      ) : (
        <details className="card">
          <summary>➕ Cadastrar novo programa</summary>
          <FormAcao action={salvarPrograma} limparAoSalvar>
            <CamposPrograma radios={radios || []} />
            <BotaoEnviar className="btn" texto="Cadastrar programa" />
          </FormAcao>
        </details>
      )}

      <div className="tabela">
        <table>
          <thead><tr><th>Rádio</th><th>Programa</th><th>Horário</th><th>Cotas</th><th>Valor</th><th></th></tr></thead>
          <tbody>
            {(programas || []).map((p) => (
              <tr key={p.id} style={p.ativo ? undefined : { opacity: 0.5 }}>
                <td><span className="badge" style={{ background: p.radio_cor, color: '#fff' }}>{p.radio_nome}</span></td>
                <td><b>{p.nome}</b>{!p.ativo && ' (inativo)'}<br /><small>{p.apresentador}</small></td>
                <td>{p.dias}<br /><small>{horario(p)}</small></td>
                <td>{p.cotas_ocupadas}/{p.cotas_total}</td>
                <td>{moeda(p.valor_cota)}</td>
                <td><Link className="btn peq sec" href={`/gestao/programas?editar=${p.id}`}>Editar</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

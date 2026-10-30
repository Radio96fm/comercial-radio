import Link from 'next/link';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import { PERIODOS, nomePeriodo } from '@/lib/periodo';
import { horario, moeda, hora, valorParaCampo } from '@/lib/format';
import { CartoesRadio, AbasRadio, FaixaRadio } from '@/components/gestao/RadiosGestao';
import { Clock, Mic, Plus, Sparkles } from 'lucide-react';

// valor por mês conforme a duração do contrato (vazio = valor normal)
function CamposPeriodo({ x = {} }) {
  return (
    <div className="periodos-g">
      <div className="t">Valor por mês conforme o tempo de contrato <small>deixe vazio para usar o valor normal</small></div>
      <div className="linha">
        {PERIODOS.map((m) => (
          <div key={m} className="campo">
            <label>{nomePeriodo(m)}</label>
            <input name={`valor_${m}`} inputMode="decimal" placeholder={x.valor != null ? valorParaCampo(x.valor) : 'normal'} defaultValue={x[`valor_${m}`] != null ? valorParaCampo(x[`valor_${m}`]) : ''} />
          </div>
        ))}
      </div>
    </div>
  );
}

function prazoCondicao(c) {
  if (!c.ativo) return 'desativada';
  if (!c.expira_em) return 'até você desativar';
  const ms = new Date(c.expira_em) - Date.now();
  if (ms <= 0) return 'expirou';
  const h = Math.ceil(ms / 3600000);
  return h > 48 ? `mais ${Math.ceil(h / 24)} dias` : `mais ${h} h`;
}

function CamposPrograma({ radios, p = {}, radioPadrao }) {
  return (
    <>
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <div className="form-grid">
        <div className="campo">
          <label>Rádio *</label>
          <select name="radio_id" defaultValue={p.radio_id || radioPadrao || radios[0]?.id} required>
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
        <div className="campo">
          <label>Contrato mínimo</label>
          <select name="meses_minimo" defaultValue={p.meses_minimo ?? 1}>
            {PERIODOS.map((m) => <option key={m} value={m}>{nomePeriodo(m)}</option>)}
          </select>
        </div>
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

// Tela de Programas da Gestão Comercial. Recebe as linhas já buscadas (do banco
// ou da demonstração) e as ações de salvar; base = /gestao ou /demo-gestao.
export default function TelaProgramas({ radios, programas, planos, condicoes, searchParams, base = '/gestao', acoes }) {
  const agora = Date.now();
  const condAtiva = (c) => c.ativo && (!c.expira_em || new Date(c.expira_em) > agora);
  const condicoesDe = (id) => (condicoes || []).filter((c) => c.programa_id === id);
  const editando = (programas || []).find((p) => p.id === searchParams?.editar);
  const radio = (radios || []).find((r) => r.id === (editando?.radio_id || searchParams?.radio)) || (radios?.length === 1 ? radios[0] : null);
  const planosDe = (id) => (planos || []).filter((x) => x.programa_id === id);
  const progsDe = (id) => (programas || []).filter((p) => p.radio_id === id);

  // 1) primeiro escolhe a rádio
  if (!radio) {
    return (
      <>
        <div className="cabecalho"><h1>Programas</h1></div>
        <p className="muted" style={{ marginTop: -10, marginBottom: 18 }}>Escolha a rádio para ver e editar os programas dela.</p>
        <CartoesRadio
          radios={radios || []}
          href={(r) => `${base}/programas?radio=${r.id}`}
          numeros={(r) => {
            const ps = progsDe(r.id);
            return [
              [ps.length, 'programas'],
              [`${ps.reduce((t, p) => t + p.cotas_ocupadas, 0)}/${ps.reduce((t, p) => t + p.cotas_total, 0)}`, 'cotas ocupadas'],
              [ps.reduce((t, p) => t + planosDe(p.id).length, 0), 'planos de venda'],
            ];
          }}
        />
      </>
    );
  }

  const lista = progsDe(radio.id);
  return (
    <>
      <div className="cabecalho">
        <h1>Programas</h1>
        <AbasRadio radios={radios || []} atual={radio.id} href={(r) => `${base}/programas?radio=${r.id}`} />
      </div>

      {editando ? (
        <div className="card">
          <div className="cabecalho"><h2>Editar: {editando.nome}</h2><Link href={`${base}/programas?radio=${radio.id}`} className="btn peq cinza">Fechar</Link></div>
          <FormAcao action={acoes.salvarPrograma}>
            <CamposPrograma radios={radios || []} p={editando} />
            <BotaoEnviar className="btn" texto="Salvar alterações" />
          </FormAcao>

          <div className="condicoes-g">
            <h2><Sparkles className="ico" /> Condição especial</h2>
            <p className="muted">Os vendedores veem uma barrinha amarela no app avisando desta condição.</p>
            {condicoesDe(editando.id).map((c) => (
              <div key={c.id} className={`cond-item ${condAtiva(c) ? 'ativa' : ''}`}>
                <div className="txt"><b>{c.texto}</b><small>{condAtiva(c) ? `Aparecendo para os vendedores · ${prazoCondicao(c)}` : `Não aparece mais · ${prazoCondicao(c)}`}</small></div>
                <form action={acoes.alternarCondicao}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="ativo" value={c.ativo ? '0' : '1'} />
                  <BotaoEnviar className="btn peq cinza" texto={c.ativo ? 'Desativar' : 'Ativar'} enviando="..." />
                </form>
                <form action={acoes.excluirCondicao}>
                  <input type="hidden" name="id" value={c.id} />
                  <BotaoEnviar className="btn peq vermelho" texto="Excluir" enviando="..." confirmar="Excluir esta condição?" />
                </form>
              </div>
            ))}
            <FormAcao action={acoes.criarCondicao} limparAoSalvar>
              <input type="hidden" name="programa_id" value={editando.id} />
              <div className="form-grid">
                <div className="campo" style={{ gridColumn: 'span 2' }}><label>Qual é a condição?</label><input name="texto" placeholder="Ex.: Fechando 12 meses, R$ 1.700 por mês" required /></div>
                <div className="campo">
                  <label>Mostrar por</label>
                  <select name="dias" defaultValue="3">
                    <option value="1">1 dia</option>
                    <option value="3">3 dias</option>
                    <option value="7">7 dias</option>
                    <option value="30">30 dias</option>
                    <option value="0">Até eu desativar</option>
                  </select>
                </div>
              </div>
              <BotaoEnviar className="btn peq amarelo" texto="Publicar condição especial" />
            </FormAcao>
          </div>

          <h2 style={{ marginTop: 24 }}>Planos de venda</h2>
          <p className="muted">Cada plano aparece para o vendedor escolher ao fechar o contrato deste programa. Programa com um valor só = um plano.</p>
          {planosDe(editando.id).map((x) => (
            <div key={x.id} className="card" style={{ background: 'var(--card-2)' }}>
              <FormAcao action={acoes.salvarPlano}>
                <input type="hidden" name="id" value={x.id} />
                <div className="form-grid">
                  <div className="campo"><label>Nome</label><input name="nome" defaultValue={x.nome} required /></div>
                  <div className="campo"><label>Valor (R$/mês)</label><input name="valor" inputMode="decimal" defaultValue={valorParaCampo(x.valor)} required /></div>
                  <div className="campo"><label>Ordem</label><input name="ordem" type="number" defaultValue={x.ordem} /></div>
                </div>
                <CamposPeriodo x={x} />
                <div className="campo"><label>O que inclui</label><textarea name="descricao" defaultValue={x.descricao || ''} style={{ minHeight: 60 }} /></div>
                <BotaoEnviar className="btn peq" texto="Salvar plano" />
              </FormAcao>
              <form action={acoes.excluirPlano} style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={x.id} />
                <BotaoEnviar className="btn peq vermelho" texto="Excluir plano" enviando="..." confirmar={`Excluir o ${x.nome}?`} />
              </form>
            </div>
          ))}
          <details className="card" style={{ background: 'var(--card-2)' }}>
            <summary>Adicionar plano</summary>
            <FormAcao action={acoes.salvarPlano} limparAoSalvar>
              <input type="hidden" name="programa_id" value={editando.id} />
              <div className="form-grid">
                <div className="campo"><label>Nome</label><input name="nome" placeholder="Plano 01" required /></div>
                <div className="campo"><label>Valor (R$/mês)</label><input name="valor" inputMode="decimal" required /></div>
                <div className="campo"><label>Ordem</label><input name="ordem" type="number" defaultValue={planosDe(editando.id).length + 1} /></div>
              </div>
              <CamposPeriodo />
              <div className="campo"><label>O que inclui</label><textarea name="descricao" style={{ minHeight: 60 }} /></div>
              <BotaoEnviar className="btn peq" texto="Adicionar plano" />
            </FormAcao>
          </details>
        </div>
      ) : (
        <>
          <FaixaRadio radio={radio}>
            <span><b>{lista.length}</b> programas</span>
            <span><b>{lista.reduce((t, p) => t + p.cotas_livres, 0)}</b> cotas livres</span>
          </FaixaRadio>
          <details className="card novo-programa">
            <summary><Plus className="ico" /> Cadastrar novo programa na {radio.nome}</summary>
            <FormAcao action={acoes.salvarPrograma} limparAoSalvar>
              <CamposPrograma radios={radios || []} radioPadrao={radio.id} />
              <BotaoEnviar className="btn" texto="Cadastrar programa" />
            </FormAcao>
          </details>
          {!lista.length && <div className="vazio">Nenhum programa nesta rádio ainda.</div>}
          <div className="grade-programas" style={{ '--cor': radio.cor }}>
            {lista.map((p) => {
              const pls = planosDe(p.id);
              const pct = p.cotas_total ? (p.cotas_ocupadas / p.cotas_total) * 100 : 0;
              return (
                <Link key={p.id} href={`${base}/programas?editar=${p.id}`} className={`prog-card-g ${p.ativo ? '' : 'inativo'}`}>
                  <div className="topo">
                    <b>{p.nome}</b>
                    {!p.ativo && <span className="badge b-cinza">inativo</span>}
                    {condicoesDe(p.id).some(condAtiva) && <span className="badge b-amarelo"><Sparkles size={13} /> condição especial</span>}
                  </div>
                  {p.apresentador && <div className="det"><Mic className="ico" />{p.apresentador}</div>}
                  <div className="det"><Clock className="ico" />{p.dias}{horario(p) ? ` · ${horario(p)}` : ''}</div>
                  <div className="cotas">
                    <span>{p.cotas_ocupadas} de {p.cotas_total} cotas</span>
                    <div className="barra"><span style={{ width: `${pct}%` }} /></div>
                  </div>
                  <div className="rodape">
                    <span className="preco">
                      {pls.length > 1
                        ? <>{pls.length} planos · a partir de <b>{moeda(Math.min(...pls.map((x) => Number(x.valor))))}</b></>
                        : <b>{moeda(pls[0]?.valor ?? p.valor_cota)}<small>/mês</small></b>}
                      {p.meses_minimo > 1 && <small className="min"> · mínimo {p.meses_minimo} meses</small>}
                    </span>
                    <span className="editar">Editar ›</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useFormState } from 'react-dom';
import { Minus, Plus, X } from 'lucide-react';
import { criarContrato } from '../../actions';
import BotaoEnviar from '@/components/BotaoEnviar';
import { moeda, data, somarMeses, somarDias, parseValor, valorParaCampo } from '@/lib/format';
import { nomeItem, MODALIDADE } from '@/lib/pacote';

const MESES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24];

function Stepper({ valor, onChange, min = 1 }) {
  return (
    <span className="stepper">
      <button type="button" aria-label="Menos" onClick={() => onChange(Math.max(min, valor - 1))}><Minus className="ico" /></button>
      <input inputMode="numeric" value={valor} onChange={(e) => onChange(Math.max(min, parseInt(e.target.value.replace(/\D/g, ''), 10) || min))} aria-label="Quantidade" />
      <button type="button" aria-label="Mais" onClick={() => onChange(valor + 1)}><Plus className="ico" /></button>
    </span>
  );
}

export default function FormContrato({ clientes, programas, planos, precos, radios, ocupados, vendedores, isGestor, meuId, hoje, inicial, linkNovoCliente }) {
  const [estado, acao] = useFormState(criarContrato, null);
  const progInicial = programas.find((p) => p.id === inicial.programa);
  const [clienteId, setClienteId] = useState(inicial.cliente);
  const [radioId, setRadioId] = useState(progInicial?.radio_id || radios.find((r) => r.id === inicial.radio)?.id || radios[0]?.id || '');
  const [programaId, setProgramaId] = useState(progInicial ? inicial.programa : '');
  const planosDe = (id) => planos.filter((x) => x.programa_id === id);
  const [planoId, setPlanoId] = useState(
    planosDe(inicial.programa).find((x) => x.id === inicial.plano)?.id || planosDe(inicial.programa)[0]?.id || ''
  );
  const [itens, setItens] = useState(() => // [{ id, qtd }]
    (inicial.itens || []).filter((i) => precos.some((p) => p.id === i.id && (!progInicial || p.radio_id === progInicial.radio_id)))
  );
  const [inicio, setInicio] = useState(hoje);
  const [meses, setMeses] = useState(3);
  const [valorManual, setValorManual] = useState(null);

  // escolha do item avulso a adicionar
  const [tipo, setTipo] = useState('insercao');
  const [duracao, setDuracao] = useState('');
  const [modalidade, setModalidade] = useState('indeterminada');
  const [qtd, setQtd] = useState(22);

  const radio = radios.find((r) => r.id === radioId);
  const progsDaRadio = programas.filter((p) => p.radio_id === radioId);
  const prog = programas.find((p) => p.id === programaId);
  const planosProg = planosDe(programaId);
  const plano = planosProg.find((x) => x.id === planoId);
  const cli = clientes.find((c) => c.id === clienteId);
  const precosRadio = precos.filter((p) => p.radio_id === radioId);
  const duracoes = [...new Set(precosRadio.filter((p) => p.tipo === tipo).map((p) => p.duracao))];
  const modalidades = precosRadio.filter((p) => p.tipo === tipo && String(p.duracao) === String(duracao || duracoes[0])).map((p) => p.modalidade);
  const modalidadeAtual = modalidades.includes(modalidade) ? modalidade : modalidades[0];
  const precoEscolhido = precosRadio.find((p) => p.tipo === tipo && String(p.duracao) === String(duracao || duracoes[0]) && p.modalidade === modalidadeAtual);

  function trocarRadio(id) {
    if (id === radioId) return;
    setRadioId(id); setProgramaId(''); setPlanoId(''); setItens([]); setDuracao(''); setValorManual(null);
  }
  function trocarPrograma(id) {
    setProgramaId(id);
    setPlanoId(planosDe(id)[0]?.id || '');
    setValorManual(null);
  }
  function adicionar() {
    if (!precoEscolhido) return;
    setItens((atual) => {
      const ja = atual.find((i) => i.id === precoEscolhido.id);
      if (ja) return atual.map((i) => (i.id === precoEscolhido.id ? { ...i, qtd: i.qtd + qtd } : i));
      return [...atual, { id: precoEscolhido.id, qtd }];
    });
    setValorManual(null);
  }
  const mudarQtd = (id, n) => { setItens((a) => a.map((i) => (i.id === id ? { ...i, qtd: n } : i))); setValorManual(null); };
  const remover = (id) => { setItens((a) => a.filter((i) => i.id !== id)); setValorManual(null); };

  const valorPrograma = prog ? Number(plano ? plano.valor : prog.valor_cota) : 0;
  const linhas = itens.map((i) => ({ ...i, preco: precos.find((p) => p.id === i.id) })).filter((l) => l.preco);
  const totalItens = linhas.reduce((s, l) => s + l.qtd * Number(l.preco.valor), 0);
  const totalCalculado = Math.round((valorPrograma + totalItens) * 100) / 100;
  const valorFinal = valorManual === null ? totalCalculado : parseValor(valorManual) || 0;
  const desconto = totalCalculado - valorFinal;

  const fim = inicio ? somarDias(somarMeses(inicio, Number(meses)), -1) : '';
  const conflito = useMemo(() => {
    if (!cli || !prog || !inicio) return null;
    return ocupados.find((o) => o.programa_id === prog.id && o.segmento_id === cli.segmento_id && o.data_fim >= inicio);
  }, [cli, prog, inicio, ocupados]);
  const vazio = !prog && !linhas.length;

  return (
    <form action={acao} className="pacote">
      {estado?.erro && <div className="alerta erro">{estado.erro}</div>}
      <input type="hidden" name="visita_id" value={inicial.visita} />
      <input type="hidden" name="radio_id" value={radioId} />
      <input type="hidden" name="plano_id" value={prog ? planoId : ''} />
      <input type="hidden" name="itens" value={JSON.stringify(linhas.map((l) => ({ id: l.id, qtd: l.qtd })))} />

      <div className="campo">
        <label>Cliente *</label>
        <select name="cliente_id" value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
          <option value="">Escolha o cliente...</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome} — {c.segmento?.nome}</option>)}
        </select>
        <div className="ajuda">
          {isGestor ? 'Todos os clientes.' : 'Aparecem os clientes da sua carteira.'}{' '}
          <Link href={linkNovoCliente}>Cadastrar cliente novo</Link>
        </div>
      </div>

      <div className="campo">
        <label>Rádio</label>
        <div className="escolha-radio">
          {radios.map((r) => (
            <button type="button" key={r.id} className={r.id === radioId ? 'ativa' : ''} style={{ '--cor': r.cor }} onClick={() => trocarRadio(r.id)}>
              {r.nome}
            </button>
          ))}
        </div>
      </div>

      <h2 className="passo">1. Patrocínio de programa <small>(opcional)</small></h2>
      <div className="campo">
        <select name="programa_id" value={programaId} onChange={(e) => trocarPrograma(e.target.value)}>
          <option value="">Nenhum, só itens avulsos</option>
          {progsDaRadio.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} {p.cotas_livres > 0 ? `(${p.cotas_livres} vaga${p.cotas_livres > 1 ? 's' : ''})` : '(lotado agora)'}
            </option>
          ))}
        </select>
      </div>
      {prog && planosProg.length > 0 && (
        <div className="planos">
          {planosProg.map((x) => (
            <label key={x.id} className={`plano-op ${x.id === planoId ? 'ativo' : ''}`}>
              <input type="radio" name="_plano" checked={x.id === planoId} onChange={() => { setPlanoId(x.id); setValorManual(null); }} />
              <span className="txt"><b>{x.nome}</b>{x.descricao && <small>{x.descricao}</small>}</span>
              <span className="preco">{moeda(x.valor)}<small>/mês</small></span>
            </label>
          ))}
        </div>
      )}
      {conflito && (
        <div className="alerta erro">
          O segmento deste cliente já está ocupado neste programa até {data(conflito.data_fim)}. Escolha outro programa ou uma data de início depois disso.
        </div>
      )}

      <h2 className="passo">2. Itens avulsos <small>(opcional)</small></h2>
      {!precosRadio.length ? (
        <p className="muted">Nenhum preço avulso cadastrado para esta rádio.</p>
      ) : (
        <div className="card adicionar-item">
          <div className="seg2">
            <button type="button" className={tipo === 'insercao' ? 'ativo' : ''} onClick={() => { setTipo('insercao'); setDuracao(''); }}>Inserção</button>
            <button type="button" className={tipo === 'testemunhal' ? 'ativo' : ''} onClick={() => { setTipo('testemunhal'); setDuracao(''); }}>Testemunhal</button>
          </div>
          <div className="grid2">
            <div className="campo">
              <label>Duração</label>
              <select value={duracao || duracoes[0] || ''} onChange={(e) => setDuracao(e.target.value)}>
                {duracoes.map((d) => <option key={d} value={d}>{d} segundos</option>)}
              </select>
            </div>
            <div className="campo">
              <label>Horário</label>
              <select value={modalidadeAtual || ''} onChange={(e) => setModalidade(e.target.value)}>
                {modalidades.map((m) => <option key={m} value={m}>{MODALIDADE[m]}</option>)}
              </select>
            </div>
          </div>
          <div className="linha-add">
            <div>
              <label>Quantidade por mês</label>
              <Stepper valor={qtd} onChange={setQtd} />
              <div className="ajuda">22 = uma por dia útil</div>
            </div>
            <div className="preco-un">
              {precoEscolhido && <>{moeda(precoEscolhido.valor)}<small>cada</small></>}
            </div>
          </div>
          <button type="button" className="btn sec" style={{ width: '100%' }} onClick={adicionar} disabled={!precoEscolhido}>
            Adicionar {qtd}× {precoEscolhido ? nomeItem(precoEscolhido).toLowerCase() : ''} ({moeda(qtd * Number(precoEscolhido?.valor || 0))})
          </button>
        </div>
      )}

      <h2 className="passo">3. Resumo do pacote</h2>
      <div className="resumo-pacote">
        {vazio && <div className="vazio">Escolha um programa ou adicione itens avulsos.</div>}
        {prog && (
          <div className="linha-pacote">
            <div className="info"><b>{prog.nome}</b><small>{plano ? plano.nome : 'Cota de patrocínio'}</small></div>
            <div className="sub">{moeda(valorPrograma)}</div>
          </div>
        )}
        {linhas.map((l) => (
          <div key={l.id} className="linha-pacote">
            <div className="info"><b>{nomeItem(l.preco)}</b><small>{MODALIDADE[l.preco.modalidade]} · {moeda(l.preco.valor)} cada</small></div>
            <Stepper valor={l.qtd} onChange={(n) => mudarQtd(l.id, n)} />
            <div className="sub">{moeda(l.qtd * Number(l.preco.valor))}</div>
            <button type="button" className="remover" aria-label="Tirar do pacote" onClick={() => remover(l.id)}><X className="ico" /></button>
          </div>
        ))}
        {!vazio && (
          <div className="linha-pacote total"><div className="info"><b>Total por mês</b><small>{radio?.nome}</small></div><div className="sub">{moeda(totalCalculado)}</div></div>
        )}
      </div>

      <h2 className="passo">4. Período e valor</h2>
      {isGestor && (
        <div className="campo">
          <label>Vendedor responsável</label>
          <select name="vendedor_id" defaultValue={meuId}>
            {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </select>
        </div>
      )}
      <div className="grid2">
        <div className="campo">
          <label>Início *</label>
          <input type="date" name="data_inicio" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
        </div>
        <div className="campo">
          <label>Duração *</label>
          <select name="meses" value={meses} onChange={(e) => setMeses(e.target.value)}>
            {MESES.map((m) => <option key={m} value={m}>{m} {m === 1 ? 'mês' : 'meses'}</option>)}
          </select>
        </div>
      </div>
      {fim && <p className="muted" style={{ marginTop: -8 }}>Termina em <b>{data(fim)}</b>. Contrato mínimo da tabela: 3 meses.</p>}
      <div className="grid2">
        <div className="campo">
          <label>Valor mensal final (R$)</label>
          <input name="valor_mensal" inputMode="decimal" value={valorManual ?? valorParaCampo(totalCalculado)} onChange={(e) => setValorManual(e.target.value)} />
          {desconto > 0.009 && <div className="ajuda">Desconto de {moeda(desconto)} sobre a tabela</div>}
        </div>
        <div className="campo">
          <label>Vencimento (dia)</label>
          <input name="dia_vencimento" type="number" min="1" max="28" defaultValue="10" />
        </div>
      </div>
      <div className="campo">
        <label>Observações (aparece no contrato)</label>
        <textarea name="observacoes" style={{ minHeight: 70 }} />
      </div>

      <div className="card total-contrato">
        <div><div className="muted">Por mês</div><b>{moeda(valorFinal)}</b></div>
        <div><div className="muted">Total ({meses}x)</div><b className="grande">{moeda(valorFinal * Number(meses))}</b></div>
      </div>

      <BotaoEnviar className="btn grande verde" texto="Criar contrato" enviando="Criando contrato..." disabled={!!conflito || vazio} />
      <p className="muted" style={{ marginTop: 10 }}>
        {prog ? 'O contrato já reserva a vaga no programa e fica como “Aguardando assinatura”.' : 'Fica como “Aguardando assinatura” até o cliente assinar.'}
      </p>
    </form>
  );
}

'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useFormState } from 'react-dom';
import { Check, UserPlus } from 'lucide-react';
import { criarContrato } from '../../actions';
import BotaoEnviar from '@/components/BotaoEnviar';
import { moeda, data, somarMeses, somarDias } from '@/lib/format';
import { nomeItem, MODALIDADE, textoDireito } from '@/lib/pacote';
import { valorNoPeriodo, temPrecoPorPeriodo } from '@/lib/periodo';

const MESES = [1, 3, 6, 12];

export default function FormContrato({ clientes, programas, planos, precos, radios, ocupados, vendedores, isGestor, meuId, hoje, inicial, linkNovoCliente, linkMeusDados }) {
  const [estado, acao] = useFormState(criarContrato, null);
  const progInicial = programas.find((p) => p.id === inicial.programa);
  const planosDe = (id) => planos.filter((x) => x.programa_id === id);
  // veio pronto do programa ou do "montar plano": não troca rádio/programa aqui
  const doPlano = (inicial.itens || []).length > 0 || !!inicial.radio;
  const fixo = !!progInicial || doPlano;

  const [clienteId, setClienteId] = useState(inicial.cliente);
  const [radioId, setRadioId] = useState(progInicial?.radio_id || radios.find((r) => r.id === inicial.radio)?.id || radios[0]?.id || '');
  const [programaId, setProgramaId] = useState(progInicial ? inicial.programa : '');
  const planoFixo = planosDe(inicial.programa).find((x) => x.id === inicial.plano);
  const [planoId, setPlanoId] = useState(planoFixo?.id || planosDe(inicial.programa)[0]?.id || '');
  const itens = useMemo(
    () => (inicial.itens || []).filter((i) => precos.some((p) => p.id === i.id && (!progInicial || p.radio_id === progInicial.radio_id))),
    [inicial.itens, precos, progInicial]
  );
  const [inicio, setInicio] = useState(hoje);
  const minimoInicial = progInicial?.meses_minimo || 1;
  const [meses, setMeses] = useState(Math.max(3, minimoInicial));
  const [vencimento, setVencimento] = useState(() => { const d = somarMeses(hoje, 1); return `${d.slice(0, 8)}10`; });
  const [vendedorId, setVendedorId] = useState(meuId);
  const [obsManual, setObsManual] = useState(null);

  const radio = radios.find((r) => r.id === radioId);
  const prog = programas.find((p) => p.id === programaId);
  const planosProg = planosDe(programaId);
  const plano = planosProg.find((x) => x.id === planoId);
  const cli = clientes.find((c) => c.id === clienteId);

  const minimo = prog?.meses_minimo || 1;
  const precoPrograma = (m) => (prog ? (plano ? valorNoPeriodo(plano, m) : Number(prog.valor_cota)) : 0);
  const valorPrograma = precoPrograma(Number(meses));
  const variaPorPeriodo = !!plano && temPrecoPorPeriodo(plano);
  const linhas = itens.map((i) => ({ ...i, preco: precos.find((p) => p.id === i.id) })).filter((l) => l.preco);
  const total = Math.round((valorPrograma + linhas.reduce((s, l) => s + l.qtd * Number(l.preco.valor), 0)) * 100) / 100;

  const fim = inicio ? somarDias(somarMeses(inicio, Number(meses)), -1) : '';
  const conflito = useMemo(() => {
    if (!cli || !prog || !inicio) return null;
    return ocupados.find((o) => o.programa_id === prog.id && o.segmento_id === cli.segmento_id && o.data_fim >= inicio);
  }, [cli, prog, inicio, ocupados]);
  const vazio = !prog && !linhas.length;
  const obsAuto = textoDireito({ programa: prog, plano, itens: linhas });
  const vend = vendedores.find((v) => v.id === vendedorId) || vendedores[0];
  const inclui = (plano?.descricao || prog?.descricao_cota || '').split('\n').map((t) => t.trim()).filter(Boolean);

  return (
    <form action={acao} className="pacote">
      {estado?.erro && <div className="alerta erro">{estado.erro}</div>}
      <input type="hidden" name="visita_id" value={inicial.visita} />
      <input type="hidden" name="radio_id" value={radioId} />
      <input type="hidden" name="programa_id" value={programaId} />
      <input type="hidden" name="plano_id" value={prog ? planoId : ''} />
      <input type="hidden" name="itens" value={JSON.stringify(linhas.map((l) => ({ id: l.id, qtd: l.qtd })))} />

      {/* ------- o que está sendo vendido ------- */}
      {!fixo && (
        <>
          <div className="campo">
            <label>Rádio</label>
            <div className="escolha-radio">
              {radios.map((r) => (
                <button type="button" key={r.id} className={r.id === radioId ? 'ativa' : ''} style={{ '--cor': r.cor }} onClick={() => { setRadioId(r.id); setProgramaId(''); setPlanoId(''); }}>
                  {r.nome}
                </button>
              ))}
            </div>
          </div>
          <div className="campo">
            <label>Programa</label>
            <select value={programaId} onChange={(e) => { setProgramaId(e.target.value); setPlanoId(planosDe(e.target.value)[0]?.id || ''); }}>
              <option value="">Escolha o programa...</option>
              {programas.filter((p) => p.radio_id === radioId).map((p) => (
                <option key={p.id} value={p.id}>{p.nome} {p.cotas_livres > 0 ? '' : '(lotado agora)'}</option>
              ))}
            </select>
          </div>
        </>
      )}
      {prog && !planoFixo && planosProg.length > 1 && (
        <div className="planos">
          {planosProg.map((x) => (
            <label key={x.id} className={`plano-op ${x.id === planoId ? 'ativo' : ''}`}>
              <input type="radio" name="_plano" checked={x.id === planoId} onChange={() => setPlanoId(x.id)} />
              <span className="txt"><b>{x.nome}</b>{x.descricao && <small>{x.descricao}</small>}</span>
              <span className="preco">{moeda(x.valor)}<small>/mês</small></span>
            </label>
          ))}
        </div>
      )}

      {!vazio && (
        <div className="venda-resumo" style={{ '--cor': radio?.cor }}>
          <div className="faixa"><span>{radio?.nome}</span>{prog && <b>{prog.nome}</b>}{!prog && <b>Plano personalizado</b>}</div>
          {prog && (
            <div className="bloco">
              {plano && plano.nome !== 'Plano comercial' && <div className="plano-nome">{plano.nome}</div>}
              <ul>{inclui.map((t, i) => <li key={i}><Check className="ico" />{t}</li>)}</ul>
            </div>
          )}
          {linhas.map((l) => (
            <div key={l.id} className="bloco linha-item">
              <span>{l.qtd}× {nomeItem(l.preco)} <small>{MODALIDADE[l.preco.modalidade]}</small></span>
              <b>{moeda(l.qtd * Number(l.preco.valor))}</b>
            </div>
          ))}
          <div className="valor"><span>Valor por mês{variaPorPeriodo ? ` (${meses} ${Number(meses) === 1 ? 'mês' : 'meses'})` : ''}</span><b className="num">{moeda(total)}</b></div>
        </div>
      )}
      {conflito && (
        <div className="alerta erro">
          O segmento deste cliente já está ocupado neste programa até {data(conflito.data_fim)}. Escolha outro cliente ou uma data de início depois disso.
        </div>
      )}

      {/* ------- cliente ------- */}
      <h2 className="passo">1. Cliente</h2>
      <div className="campo">
        <select name="cliente_id" value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
          <option value="">Escolha o cliente da sua carteira...</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome} — {c.segmento?.nome}</option>)}
        </select>
        <Link href={linkNovoCliente} className="btn cinza" style={{ marginTop: 10, width: '100%' }}><UserPlus className="ico" /> Cadastrar cliente novo</Link>
      </div>

      {/* ------- período e vencimento ------- */}
      <h2 className="passo">2. Período</h2>
      <input type="hidden" name="meses" value={meses} />
      <div className="seg4">
        {MESES.map((m) => (
          <button type="button" key={m} className={Number(meses) === m ? 'ativo' : ''} disabled={m < minimo} onClick={() => setMeses(m)}>
            <b>{m}</b>{m === 1 ? 'mês' : 'meses'}
            {variaPorPeriodo && m >= minimo && <small className="preco-p">{moeda(precoPrograma(m)).replace(",00", "")}</small>}
          </button>
        ))}
      </div>
      {minimo > 1 && <p className="muted" style={{ marginTop: 8 }}>Este programa tem contrato mínimo de {minimo} meses.</p>}
      {variaPorPeriodo && <p className="muted" style={{ marginTop: 8 }}>O valor por mês muda conforme o tempo de contrato.</p>}
      <div className="grid2" style={{ marginTop: 14 }}>
        <div className="campo">
          <label>Começa em *</label>
          <input type="date" name="data_inicio" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
        </div>
        <div className="campo">
          <label>1º vencimento *</label>
          <input type="date" name="primeiro_vencimento" value={vencimento} onChange={(e) => setVencimento(e.target.value)} required />
        </div>
      </div>
      {fim && <p className="muted" style={{ marginTop: -8 }}>Termina em <b>{data(fim)}</b>. Os boletos vencem todo dia {vencimento ? Number(vencimento.slice(8, 10)) : ''}.</p>}

      {/* ------- observações ------- */}
      <h2 className="passo">3. O que o cliente tem direito</h2>
      <div className="campo">
        <textarea name="observacoes" style={{ minHeight: 100 }} value={obsManual ?? obsAuto} onChange={(e) => setObsManual(e.target.value)} />
        <div className="ajuda">Já vem pronto. Os vencimentos entram sozinhos no contrato.</div>
      </div>

      {/* ------- vendedor ------- */}
      {isGestor ? (
        <div className="campo">
          <label>Vendedor</label>
          <select name="vendedor_id" value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
            {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </select>
        </div>
      ) : null}
      <div className={`vendedor-contrato ${vend?.documento ? '' : 'falta'}`}>
        <div>
          <small>Vendedor no contrato</small>
          <b>{vend?.nome}</b>
          <span>{vend?.documento ? `CPF/CNPJ ${vend.documento}` : 'CPF não preenchido'}{vend?.telefone ? ` · ${vend.telefone}` : ''}</span>
        </div>
        {vend?.id === meuId && <Link href={linkMeusDados} className="btn peq cinza">{vend?.documento ? 'Corrigir' : 'Preencher'}</Link>}
      </div>

      <div className="card total-contrato">
        <div><div className="muted">Por mês</div><b>{moeda(total)}</b></div>
        <div><div className="muted">Total ({meses}x)</div><b className="grande">{moeda(total * Number(meses))}</b></div>
      </div>

      <BotaoEnviar className="btn grande verde" texto="Criar contrato e gerar PDF" enviando="Criando contrato..." disabled={!!conflito || vazio} />
      <p className="muted" style={{ marginTop: 10 }}>O contrato fica como “Aguardando assinatura” até o cliente assinar.</p>
    </form>
  );
}

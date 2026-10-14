'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useFormState } from 'react-dom';
import { criarContrato } from '../../actions';
import BotaoEnviar from '@/components/BotaoEnviar';
import { moeda, data, somarMeses, somarDias, parseValor, valorParaCampo } from '@/lib/format';

const MESES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24];

export default function FormContrato({ clientes, programas, ocupados, vendedores, isGestor, meuId, hoje, inicial, linkNovoCliente }) {
  const [estado, acao] = useFormState(criarContrato, null);
  const [clienteId, setClienteId] = useState(inicial.cliente);
  const [programaId, setProgramaId] = useState(inicial.programa);
  const [inicio, setInicio] = useState(hoje);
  const [meses, setMeses] = useState(6);
  const prog = programas.find((p) => p.id === programaId);
  const cli = clientes.find((c) => c.id === clienteId);
  const [valor, setValor] = useState(prog ? valorParaCampo(prog.valor_cota) : '');
  const [produto, setProduto] = useState(prog?.descricao_cota || '');

  function trocarPrograma(id) {
    setProgramaId(id);
    const p = programas.find((x) => x.id === id);
    if (p) {
      setValor(valorParaCampo(p.valor_cota));
      setProduto(p.descricao_cota || '');
    }
  }

  const fim = inicio ? somarDias(somarMeses(inicio, Number(meses)), -1) : '';
  const conflito = useMemo(() => {
    if (!cli || !prog || !inicio) return null;
    return ocupados.find((o) => o.programa_id === prog.id && o.segmento_id === cli.segmento_id && o.data_fim >= inicio);
  }, [cli, prog, inicio, ocupados]);
  const valorNum = parseValor(valor) || 0;

  return (
    <form action={acao}>
      {estado?.erro && <div className="alerta erro">⚠️ {estado.erro}</div>}
      <input type="hidden" name="visita_id" value={inicial.visita} />

      <div className="campo">
        <label>Cliente *</label>
        <select name="cliente_id" value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
          <option value="">Escolha o cliente...</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nome} — {c.segmento?.nome}</option>
          ))}
        </select>
        <div className="ajuda">
          {isGestor ? 'Todos os clientes.' : 'Aparecem os clientes da sua carteira.'}{' '}
          <Link href={linkNovoCliente}>➕ Cadastrar cliente novo</Link>
        </div>
      </div>

      <div className="campo">
        <label>Programa *</label>
        <select name="programa_id" value={programaId} onChange={(e) => trocarPrograma(e.target.value)} required>
          <option value="">Escolha o programa...</option>
          {programas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.radio_nome} · {p.nome} {p.cotas_livres > 0 ? `(${p.cotas_livres} vaga${p.cotas_livres > 1 ? 's' : ''})` : '(lotado agora)'}
            </option>
          ))}
        </select>
      </div>

      {conflito && (
        <div className="alerta erro">
          ⛔ O segmento deste cliente já está ocupado neste programa até {data(conflito.data_fim)}. Escolha outro programa ou uma data de início depois disso.
        </div>
      )}

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
      {fim && <p className="muted" style={{ marginTop: -8 }}>Termina em <b>{data(fim)}</b></p>}

      <div className="grid2">
        <div className="campo">
          <label>Valor mensal (R$) *</label>
          <input name="valor_mensal" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} required />
        </div>
        <div className="campo">
          <label>Vencimento (dia)</label>
          <input name="dia_vencimento" type="number" min="1" max="28" defaultValue="10" />
        </div>
      </div>

      <div className="campo">
        <label>O que o cliente está comprando</label>
        <textarea name="descricao_produto" value={produto} onChange={(e) => setProduto(e.target.value)} />
      </div>

      <div className="campo">
        <label>Observações (aparece no contrato)</label>
        <textarea name="observacoes" style={{ minHeight: 70 }} />
      </div>

      <div className="card" style={{ background: '#f8fafc' }}>
        <div className="grid2">
          <div><div className="muted">Mensal</div><b>{moeda(valorNum)}</b></div>
          <div><div className="muted">Total ({meses}x)</div><b style={{ fontSize: '1.2rem' }}>{moeda(valorNum * Number(meses))}</b></div>
        </div>
      </div>

      <BotaoEnviar className="btn grande verde" texto="✍️ Criar contrato" enviando="Criando contrato..." disabled={!!conflito} />
      <p className="muted" style={{ marginTop: 10 }}>
        O contrato já reserva a vaga no programa e fica como “Aguardando assinatura”.
      </p>
    </form>
  );
}

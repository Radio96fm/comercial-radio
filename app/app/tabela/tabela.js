'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Minus, Plus, PenLine } from 'lucide-react';
import { moeda, horario } from '@/lib/format';
import { nomeItem, MODALIDADE } from '@/lib/pacote';

function Stepper({ valor, onChange }) {
  return (
    <span className="stepper">
      <button type="button" aria-label="Menos" onClick={() => onChange(Math.max(0, valor - 1))}><Minus className="ico" /></button>
      <input inputMode="numeric" value={valor} onChange={(e) => onChange(Math.max(0, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0))} aria-label="Quantidade" />
      <button type="button" aria-label="Mais" onClick={() => onChange(valor + 1)}><Plus className="ico" /></button>
    </span>
  );
}

export default function TabelaPrecos({ radios, programas, planos, precos, radioInicial }) {
  const [radioId, setRadioId] = useState(radios.find((r) => r.id === radioInicial)?.id || radios[0]?.id || '');
  // um programa por contrato: guarda o programa e o plano escolhidos
  const [escolha, setEscolha] = useState(null); // { programa, plano }
  const [qtds, setQtds] = useState({}); // { precoId: qtd }

  const progs = programas.filter((p) => p.radio_id === radioId);
  const precosRadio = precos.filter((p) => p.radio_id === radioId);
  const insercoes = precosRadio.filter((p) => p.tipo !== 'testemunhal');
  const testemunhais = precosRadio.filter((p) => p.tipo === 'testemunhal');

  function trocarRadio(id) {
    if (id === radioId) return;
    setRadioId(id); setEscolha(null); setQtds({});
  }
  function escolher(programa, plano) {
    const igual = escolha?.programa === programa && escolha?.plano === plano;
    setEscolha(igual ? null : { programa, plano });
  }

  const prog = escolha && programas.find((p) => p.id === escolha.programa);
  const plano = escolha?.plano && planos.find((x) => x.id === escolha.plano);
  const valorProg = prog ? Number(plano ? plano.valor : prog.valor_cota) : 0;
  const itens = Object.entries(qtds).filter(([, q]) => q > 0);
  const totalItens = itens.reduce((s, [id, q]) => s + q * Number(precos.find((p) => p.id === id)?.valor || 0), 0);
  const total = Math.round((valorProg + totalItens) * 100) / 100;
  const nItens = (prog ? 1 : 0) + itens.length;

  const qs = new URLSearchParams({ radio: radioId });
  if (prog) qs.set('programa', prog.id);
  if (plano) qs.set('plano', plano.id);
  if (itens.length) qs.set('itens', itens.map(([id, q]) => `${id}:${q}`).join(','));

  const linhaPreco = (p) => {
    const q = qtds[p.id] || 0;
    return (
      <div key={p.id} className={`linha-preco ${q ? 'ativa' : ''}`}>
        <div className="info">
          <b>{nomeItem(p)}</b>
          <small>{MODALIDADE[p.modalidade] || p.modalidade} · {moeda(p.valor)} cada</small>
          {q > 0 && <small>{q}× = <b>{moeda(q * Number(p.valor))}</b></small>}
        </div>
        <Stepper valor={q} onChange={(n) => setQtds((a) => ({ ...a, [p.id]: n }))} />
      </div>
    );
  };

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>Toque no que o cliente quer. O valor soma embaixo e você leva tudo direto para o contrato.</p>
      <div className="escolha-radio" style={{ marginBottom: 18 }}>
        {radios.map((r) => (
          <button type="button" key={r.id} className={r.id === radioId ? 'ativa' : ''} style={{ '--cor': r.cor }} onClick={() => trocarRadio(r.id)}>
            {r.nome}
          </button>
        ))}
      </div>

      <h2 className="passo">Patrocínio de programa <small>(escolha 1)</small></h2>
      {!progs.length && <div className="vazio">Nenhum programa nesta rádio.</div>}
      {progs.map((p) => {
        const pls = planos.filter((x) => x.programa_id === p.id);
        const lotado = p.cotas_livres <= 0;
        const opcoes = pls.length ? pls : [{ id: '', nome: 'Cota de patrocínio', descricao: '', valor: p.valor_cota }];
        return (
          <div key={p.id} className={`tabela-prog ${lotado ? 'lotado' : ''}`}>
            <div className="cab">
              <div>
                <b>{p.nome}</b>
                <small>{p.dias}{horario(p) ? ` · ${horario(p)}` : ''}</small>
              </div>
              <span className={`badge ${lotado ? 'b-vermelho' : 'b-verde'}`}>{lotado ? 'Lotado' : `${p.cotas_livres} vaga${p.cotas_livres > 1 ? 's' : ''}`}</span>
            </div>
            <div className="planos">
              {opcoes.map((x) => {
                const ativo = escolha?.programa === p.id && (escolha?.plano || '') === x.id;
                return (
                  <label key={x.id || 'cota'} className={`plano-op ${ativo ? 'ativo' : ''}`}>
                    <input type="checkbox" checked={ativo} disabled={lotado} onChange={() => escolher(p.id, x.id)} />
                    <span className="txt"><b>{x.nome}</b>{x.descricao && <small>{x.descricao}</small>}</span>
                    <span className="preco">{moeda(x.valor)}<small>/mês</small></span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {!!insercoes.length && (
        <>
          <h2 className="passo">Inserções avulsas <small>(por mês)</small></h2>
          <div className="resumo-pacote">{insercoes.map(linhaPreco)}</div>
        </>
      )}
      {!!testemunhais.length && (
        <>
          <h2 className="passo">Testemunhais avulsos <small>(por mês)</small></h2>
          <div className="resumo-pacote">{testemunhais.map(linhaPreco)}</div>
        </>
      )}
      <p className="ajuda">Dica: 22 = uma por dia útil no mês.</p>

      <div className="barra-total">
        <div className="soma">
          <small>{nItens ? `${nItens} ite${nItens > 1 ? 'ns' : 'm'} · por mês` : 'Nada escolhido ainda'}</small>
          <b className="num">{moeda(total)}</b>
          {nItens > 0 && <button type="button" className="limpar" onClick={() => { setEscolha(null); setQtds({}); }}>Limpar</button>}
        </div>
        {nItens > 0 ? (
          <Link href={`/app/contratos/novo?${qs}`} className="btn"><PenLine className="ico" strokeWidth={2.4} /> Criar contrato</Link>
        ) : (
          <span className="btn" aria-disabled="true" style={{ opacity: .4, pointerEvents: 'none' }}><PenLine className="ico" strokeWidth={2.4} /> Criar contrato</span>
        )}
      </div>
    </>
  );
}

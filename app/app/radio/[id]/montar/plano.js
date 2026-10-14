'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Minus, Plus, PenLine } from 'lucide-react';
import { moeda, horario } from '@/lib/format';
import { nomeItem, MODALIDADE } from '@/lib/pacote';

function Stepper({ valor, onChange }) {
  return (
    <span className="stepper grande">
      <button type="button" aria-label="Menos" onClick={() => onChange(Math.max(0, valor - 1))}><Minus className="ico" /></button>
      <input inputMode="numeric" value={valor} onChange={(e) => onChange(Math.max(0, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0))} aria-label="Quantidade" />
      <button type="button" aria-label="Mais" onClick={() => onChange(valor + 1)}><Plus className="ico" /></button>
    </span>
  );
}

export default function MontarPlano({ radio, programas, planos, precos, extra }) {
  const [qtds, setQtds] = useState({}); // { precoId: qtd }
  const [escolha, setEscolha] = useState(null); // { programa, plano } (opcional, um só)

  const insercoes = precos.filter((p) => p.tipo !== 'testemunhal');
  const testemunhais = precos.filter((p) => p.tipo === 'testemunhal');
  const itens = Object.entries(qtds).filter(([, q]) => q > 0);
  const totalItens = itens.reduce((s, [id, q]) => s + q * Number(precos.find((p) => p.id === id)?.valor || 0), 0);
  const prog = escolha && programas.find((p) => p.id === escolha.programa);
  const plano = escolha?.plano && planos.find((x) => x.id === escolha.plano);
  const valorProg = prog ? Number(plano ? plano.valor : prog.valor_cota) : 0;
  const total = Math.round((totalItens + valorProg) * 100) / 100;
  const nada = !itens.length && !prog;

  const qs = new URLSearchParams({ radio: radio.id, ...extra });
  if (itens.length) qs.set('itens', itens.map(([id, q]) => `${id}:${q}`).join(','));
  if (prog) qs.set('programa', prog.id);
  if (plano) qs.set('plano', plano.id);

  function escolher(programa, planoId) {
    const igual = escolha?.programa === programa && (escolha?.plano || '') === planoId;
    setEscolha(igual ? null : { programa, plano: planoId });
  }

  const linha = (p) => {
    const q = qtds[p.id] || 0;
    return (
      <div key={p.id} className={`linha-preco ${q ? 'ativa' : ''}`}>
        <div className="info">
          <b>{nomeItem(p)}</b>
          <small>{MODALIDADE[p.modalidade] || p.modalidade}</small>
          <small>{moeda(p.valor)} cada{q > 0 && <> · <b>{moeda(q * Number(p.valor))}</b></>}</small>
        </div>
        <Stepper valor={q} onChange={(n) => setQtds((a) => ({ ...a, [p.id]: n }))} />
      </div>
    );
  };

  return (
    <>
      <p className="passo-guia"><b>1.</b> Toque no <b>+</b> para colocar as inserções e testemunhais por mês.</p>
      {!precos.length && <div className="vazio">Nenhum preço cadastrado para esta rádio.</div>}
      {!!insercoes.length && (
        <>
          <h2 className="passo">Inserções</h2>
          <div className="resumo-pacote">{insercoes.map(linha)}</div>
        </>
      )}
      {!!testemunhais.length && (
        <>
          <h2 className="passo">Testemunhais</h2>
          <div className="resumo-pacote">{testemunhais.map(linha)}</div>
        </>
      )}
      <p className="ajuda">Dica: 22 por mês = uma por dia útil.</p>

      {!!programas.length && (
        <>
          <p className="passo-guia" style={{ marginTop: 22 }}><b>2.</b> Quer incluir um programa com valor fechado? <span className="muted">(não é obrigatório)</span></p>
          {programas.map((p) => {
            const pls = planos.filter((x) => x.programa_id === p.id);
            const lotado = p.cotas_livres <= 0;
            const opcoes = pls.length ? pls : [{ id: '', nome: 'Cota de patrocínio', descricao: '', valor: p.valor_cota }];
            return (
              <div key={p.id} className={`tabela-prog ${lotado ? 'lotado' : ''}`}>
                <div className="cab">
                  <div><b>{p.nome}</b><small>{p.dias}{horario(p) ? ` · ${horario(p)}` : ''}</small></div>
                  {lotado && <span className="badge b-vermelho">Lotado</span>}
                </div>
                <div className="planos">
                  {opcoes.map((x) => {
                    const ativo = escolha?.programa === p.id && (escolha?.plano || '') === x.id;
                    return (
                      <label key={x.id || 'cota'} className={`plano-op ${ativo ? 'ativo' : ''}`}>
                        <input type="checkbox" checked={ativo} disabled={lotado} onChange={() => escolher(p.id, x.id)} />
                        <span className="txt"><b>{opcoes.length > 1 ? x.nome : 'Patrocinar este programa'}</b>{x.descricao && <small>{x.descricao}</small>}</span>
                        <span className="preco">{moeda(x.valor)}<small>/mês</small></span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}

      <div className="barra-total">
        <div className="soma">
          <small>{nada ? 'Nada escolhido ainda' : 'Total por mês'}</small>
          <b className="num">{moeda(total)}</b>
          {!nada && <button type="button" className="limpar" onClick={() => { setQtds({}); setEscolha(null); }}>Limpar tudo</button>}
        </div>
        {nada ? (
          <span className="btn" aria-disabled="true" style={{ opacity: .4, pointerEvents: 'none' }}><PenLine className="ico" strokeWidth={2.4} /> Fazer contrato</span>
        ) : (
          <Link href={`/app/contratos/novo?${qs}`} className="btn"><PenLine className="ico" strokeWidth={2.4} /> Fazer contrato</Link>
        )}
      </div>
    </>
  );
}

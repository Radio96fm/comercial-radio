'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { moeda } from '@/lib/format';
import { pctEfetivo, rotuloRegra, descontoDe } from '@/lib/comissao';
import { salvarComissaoContrato } from '@/lib/acoesComissao';

const DEFINIR = 'definir';
const DOIS = 'dois';
const SEM = 'sem';
// padrão: 18% do valor cheio para quem vendeu; o Maycon tira os 2% antes e fica com 40%
const PADRAO_VENDEDOR = 18;
const ehMaycon = (r) => /^maycon douglas/i.test(r?.nome || '');
const regraPadrao = (r) => (ehMaycon(r) ? { percentual: 40, desconto: 2 } : { percentual: PADRAO_VENDEDOR, desconto: 0 });
const primeiroNome = (n) => n.split(' ').slice(0, 2).join(' ');
const numero = (v) => Number(String(v ?? '').replace(',', '.'));
const valido = (v) => String(v ?? '').trim() !== '' && !Number.isNaN(numero(v));
const pct = (v) => `${(Math.round(v * 100) / 100).toLocaleString('pt-BR')}%`;
const dataHora = (iso) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const CSS = `
.quadro { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; align-items: start; }
.q-col { border-radius: var(--radius-sm); padding: 10px; background: hsl(var(--h) 70% 55% / .08); border: 1px solid hsl(var(--h) 60% 50% / .25); min-height: 120px; }
.q-col.alvo { outline: 2px dashed #e2620b; }
.q-col h3 { margin: 2px 2px 8px; font-size: 1.05rem; text-transform: uppercase; color: #e2620b; letter-spacing: .02em; }
.q-col .q-sub { display: block; font-size: .8rem; color: var(--muted); margin: -4px 2px 8px; }
.q-card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 9px 10px; margin-bottom: 8px; cursor: grab; user-select: none; }
.q-card:active { cursor: grabbing; }
.q-card b { display: block; font-size: .92rem; }
.q-card small { display: block; color: var(--muted); font-size: .78rem; }
.q-card .q-com { color: var(--verde); font-weight: 600; font-size: .82rem; margin-top: 3px; }
.q-card .q-def { color: var(--amarelo); font-weight: 600; font-size: .82rem; margin-top: 3px; }
.q-fundo { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; }
.q-janela { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; width: 100%; max-width: 620px; max-height: 92vh; overflow: auto; }
.q-janela h2 { margin: 0 0 6px; font-size: 1.15rem; }
.q-pessoa { border: 1px solid var(--line); border-radius: 12px; padding: 10px; margin-bottom: 8px; }
.q-pessoa-topo { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.q-pessoa-topo select { flex: 1; min-width: 0; }
.q-campos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.q-campos label { display: block; font-size: .78rem; color: var(--muted); margin-bottom: 3px; }
.q-campos input { width: 100%; }
.q-atalhos { display: flex; gap: 6px; margin-top: 5px; flex-wrap: wrap; }
.q-atalhos button { font-size: .75rem; padding: 3px 8px; border-radius: 999px; border: 1px solid var(--line-2); background: transparent; color: var(--text); cursor: pointer; }
.q-atalhos button.on { border-color: #e2620b; color: #e2620b; }
.q-resultado { margin-top: 8px; font-size: .85rem; color: var(--verde); font-weight: 600; }
.q-previa { margin-top: 12px; border-radius: 12px; padding: 12px; background: var(--card-2); border: 1px solid var(--line-2); }
.q-previa h3 { margin: 0 0 8px; font-size: .95rem; }
.q-previa table { width: 100%; border-collapse: collapse; font-size: .88rem; }
.q-previa td { padding: 4px 0; border-bottom: 1px solid var(--line); }
.q-previa td:nth-child(n+2) { text-align: right; white-space: nowrap; padding-left: 10px; }
.q-previa tr.total td { font-weight: 700; border-bottom: 0; padding-top: 7px; }
.q-checa { margin-top: 8px; font-size: .86rem; font-weight: 600; }
.q-checa.ok { color: var(--verde); }
.q-checa.aviso { color: var(--amarelo); }
.q-checa.erro { color: var(--vermelho); }
.q-hist { margin-top: 12px; font-size: .84rem; }
.q-hist li { margin-bottom: 6px; }
.q-acoes { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; flex-wrap: wrap; }
`;

export default function Quadro({ reps, contratos, linhas, historico = [] }) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [alvo, setAlvo] = useState(null);
  const [modal, setModal] = useState(null);
  const [erro, setErro] = useState('');
  // última gravação, para poder desfazer
  const [desfazer, setDesfazer] = useState(null);

  const rep = useMemo(() => Object.fromEntries(reps.map((r) => [r.id, r])), [reps]);
  const diretor = reps.find((r) => r.diretor);
  const linhasDe = useMemo(() => {
    const m = {};
    linhas.forEach((l) => (m[l.contrato_id] ||= []).push(l));
    return m;
  }, [linhas]);
  const histDe = useMemo(() => {
    const m = {};
    historico.forEach((h) => (m[h.contrato_id] ||= []).push(h));
    return m;
  }, [historico]);

  // colunas: a definir, dois vendedores, um por vendedor, sem vendedor
  const colunas = useMemo(() => {
    const porRep = Object.fromEntries(reps.map((r) => [r.id, []]));
    const divididos = Object.fromEntries(reps.map((r) => [r.id, 0]));
    const definir = [];
    const dois = [];
    const sem = [];
    for (const c of contratos) {
      const vend = (linhasDe[c.id] || []).filter((l) => l.papel === 'vendedor');
      if (!vend.length) sem.push(c);
      else if (vend.some((l) => l.percentual == null)) definir.push(c);
      else if (vend.length > 1) { dois.push(c); vend.forEach((l) => { if (l.representante_id in divididos) divididos[l.representante_id] += 1; }); }
      else porRep[vend[0].representante_id]?.push(c);
    }
    const cols = reps.map((r, i) => ({ id: r.id, titulo: primeiroNome(r.nome), rep: r, itens: porRep[r.id], divididos: divididos[r.id], h: (i * 47 + 20) % 360 }))
      .sort((a, b) => b.itens.length - a.itens.length);
    return [
      { id: DEFINIR, titulo: 'A definir', sub: 'Dois vendedores, falta dividir a comissão', itens: definir, h: 40 },
      { id: DOIS, titulo: 'Dois vendedores', sub: 'Comissão já dividida entre os dois', itens: dois, h: 280 },
      ...cols,
      { id: SEM, titulo: 'Sem vendedor', sub: 'Venda direta e agências', itens: sem, h: 220 },
    ];
  }, [reps, contratos, linhasDe]);

  const comissaoMes = (c, repId) => (linhasDe[c.id] || []).filter((l) => l.representante_id === repId)
    .reduce((s, l) => s + (Number(c.valor_mensal) * (pctEfetivo(l) || 0)) / 100, 0);

  const paraEditor = (l) => ({ representante_id: l.representante_id, percentual: l.percentual ?? '', desconto: descontoDe(l) });

  // abre o editor com o que o contrato tem hoje
  function editar(c, vendInicial, extra = {}) {
    const atuais = linhasDe[c.id] || [];
    const dir = atuais.find((l) => l.papel === 'diretor');
    const vend = vendInicial || atuais.filter((l) => l.papel === 'vendedor').map(paraEditor);
    setErro('');
    setModal({
      modo: 'editar', c,
      vend,
      comDiretor: !!dir,
      pctDiretor: dir?.percentual ?? 2,
      regra: atuais.find((l) => l.regra)?.regra || '',
      ...extra,
    });
  }

  // arrastou para outra coluna
  function mover(c, de, para) {
    setErro('');
    if (para === DEFINIR || para === DOIS) { editar(c, null, { aviso: 'Para dividir a comissão, adicione o outro vendedor e preencha o % de cada um.' }); return; }
    const atuais = linhasDe[c.id] || [];
    const vend = atuais.filter((l) => l.papel === 'vendedor');
    if (para === SEM) { editar(c, [], { aviso: 'O contrato vai ficar sem vendedor.' }); return; }
    // vendedor sozinho com regra conhecida: só confirma
    if (vend.length <= 1 && vend.every((l) => l.percentual != null)) {
      const dir = atuais.filter((l) => l.papel === 'diretor');
      const diretorLinhas = dir.length ? dir : diretor ? [{ representante_id: diretor.id, papel: 'diretor', percentual: 2, desconto: 0 }] : [];
      setModal({
        modo: 'confirmar', c, para,
        linhas: [{ representante_id: para, papel: 'vendedor', ...regraPadrao(rep[para]) }, ...diretorLinhas.map(({ representante_id, papel, percentual, desconto, base }) => ({ representante_id, papel, percentual, desconto: descontoDe({ desconto, base }) }))],
      });
      return;
    }
    // contrato dividido: troca quem saiu pelo destino e pede a divisão
    const novos = vend.filter((l) => l.representante_id !== de).map(paraEditor);
    if (!novos.some((l) => l.representante_id === para)) novos.unshift({ representante_id: para, percentual: '', desconto: 0 });
    editar(c, novos, { aviso: 'Este contrato tem mais de um vendedor: confira a divisão.' });
  }

  function gravar(c, linhasFinal, regra) {
    const antes = (linhasDe[c.id] || []).map(({ representante_id, papel, percentual, desconto, base }) => ({ representante_id, papel, percentual, desconto: descontoDe({ desconto, base }) }));
    const regraAntes = (linhasDe[c.id] || []).find((l) => l.regra)?.regra || '';
    iniciar(async () => {
      const r = await salvarComissaoContrato({ contratoId: c.id, linhas: linhasFinal, regra });
      if (r?.erro) { setErro(r.erro); return; }
      setModal(null);
      setDesfazer(antes.length ? { c, linhas: antes, regra: regraAntes } : null);
      router.refresh();
    });
  }

  function voltar(d) {
    iniciar(async () => {
      const r = await salvarComissaoContrato({ contratoId: d.c.id, linhas: d.linhas, regra: d.regra });
      if (r?.erro) { setErro(r.erro); return; }
      setDesfazer(null);
      setModal(null);
      router.refresh();
    });
  }

  // conta ao vivo do editor
  const conta = useMemo(() => {
    if (modal?.modo !== 'editar') return null;
    const mensal = Number(modal.c.valor_mensal);
    const pessoas = modal.vend.map((l) => {
      const p = valido(l.percentual) ? pctEfetivo({ percentual: numero(l.percentual), desconto: numero(l.desconto || 0) }) : null;
      return { nome: rep[l.representante_id]?.nome || 'Escolha o vendedor', regra: valido(l.percentual) ? rotuloRegra({ percentual: numero(l.percentual), desconto: numero(l.desconto || 0) }) : 'falta o %', p, valor: p == null ? 0 : (mensal * p) / 100 };
    });
    if (modal.comDiretor && diretor) {
      const p = valido(modal.pctDiretor) ? numero(modal.pctDiretor) : 0;
      pessoas.push({ nome: `${diretor.nome} (diretor)`, regra: rotuloRegra({ percentual: p, desconto: 0 }), p, valor: (mensal * p) / 100 });
    }
    const somaVend = pessoas.slice(0, modal.vend.length).reduce((s, x) => s + (x.p || 0), 0);
    const total = pessoas.reduce((s, x) => s + x.valor, 0);
    const problemas = [];
    if (modal.vend.some((l) => !l.representante_id)) problemas.push('Escolha o vendedor de cada linha.');
    if (new Set(modal.vend.map((l) => l.representante_id)).size !== modal.vend.length) problemas.push('O mesmo vendedor está em duas linhas.');
    if (modal.vend.some((l) => !valido(l.percentual))) problemas.push('Preencha o % de comissão de cada vendedor.');
    if (modal.vend.some((l) => valido(l.percentual) && (numero(l.percentual) < 0 || numero(l.percentual) > 100))) problemas.push('O % de comissão vai de 0 a 100.');
    if (modal.vend.some((l) => numero(l.desconto || 0) < 0 || numero(l.desconto || 0) >= 100)) problemas.push('O desconto antes vai de 0 a 99%.');
    if (!modal.vend.length && !modal.comDiretor) problemas.push('Ninguém recebe comissão: adicione um vendedor ou marque o diretor.');
    return { mensal, pessoas, somaVend, total, problemas };
  }, [modal, rep, diretor]);

  function salvarEditor() {
    const m = modal;
    if (conta.problemas.length) return;
    const tinhaVendedor = (linhasDe[m.c.id] || []).some((l) => l.papel === 'vendedor');
    if (tinhaVendedor && !m.vend.length && !window.confirm('Você tirou todos os vendedores: o contrato vai para "Sem vendedor" e ninguém recebe a comissão de vendedor. Continuar?')) return;
    gravar(m.c, [
      ...m.vend.map((l) => ({ representante_id: l.representante_id, papel: 'vendedor', percentual: numero(l.percentual), desconto: numero(l.desconto || 0) })),
      ...(m.comDiretor && diretor ? [{ representante_id: diretor.id, papel: 'diretor', percentual: numero(m.pctDiretor), desconto: 0 }] : []),
    ], m.regra);
  }

  const mudarVend = (i, campo, valor) => setModal((m) => ({ ...m, vend: m.vend.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)) }));
  const dividirIgual = () => setModal((m) => ({ ...m, vend: m.vend.map((l) => ({ ...l, percentual: String(Math.round((PADRAO_VENDEDOR / m.vend.length) * 100) / 100).replace('.', ','), desconto: 0 })) }));

  const descreverLinhas = (ls) => (ls || []).map((l) => `${primeiroNome(rep[l.representante_id]?.nome || '?')}${l.papel === 'diretor' ? ' (diretor)' : ''} ${rotuloRegra({ percentual: l.percentual, desconto: l.desconto, base: l.base })}`).join(' + ') || 'ninguém';

  return (
    <>
      <style>{CSS}</style>
      {erro && !modal && <div className="alerta erro">{erro}</div>}
      {desfazer && !modal && (
        <div className="alerta info" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>Comissão do contrato nº {desfazer.c.numero} ({desfazer.c.cliente_nome}) salva.</span>
          <button className="btn peq sec" onClick={() => voltar(desfazer)} disabled={pend}>{pend ? 'Voltando...' : 'Desfazer'}</button>
        </div>
      )}
      <div className="quadro">
        {colunas.map((col) => (
          <div key={col.id} className={`q-col ${alvo === col.id ? 'alvo' : ''}`} style={{ '--h': col.h }}
            onDragOver={(e) => { e.preventDefault(); setAlvo(col.id); }}
            onDragLeave={() => setAlvo((a) => (a === col.id ? null : a))}
            onDrop={(e) => {
              e.preventDefault(); setAlvo(null);
              const { id, de } = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
              const c = contratos.find((x) => x.id === id);
              if (c && de !== col.id) mover(c, de, col.id);
            }}>
            <h3>{col.titulo} <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>({col.itens.length})</span></h3>
            {col.sub && <span className="q-sub">{col.sub}</span>}
            {col.divididos > 0 && <span className="q-sub">+ {col.divididos} em &quot;Dois vendedores&quot;</span>}
            {col.itens.map((c) => {
              const vend = (linhasDe[c.id] || []).filter((l) => l.papel === 'vendedor');
              return (
                <div key={c.id} className="q-card" draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ id: c.id, de: col.id }))}
                  onClick={() => editar(c)}>
                  <small>Nº {c.numero} · {c.radio}</small>
                  <b>{c.cliente_nome}</b>
                  <small>{moeda(c.valor_mensal)}/mês · até {c.data_fim.split('-').reverse().join('/')}</small>
                  {col.rep && <div className="q-com">Comissão {moeda(comissaoMes(c, col.id))}/mês · {vend.map(rotuloRegra).join(' + ')}</div>}
                  {col.id === DOIS && vend.map((l) => (
                    <div key={l.representante_id} className="q-com">{primeiroNome(rep[l.representante_id]?.nome || '?')}: {rotuloRegra(l)} · {moeda(comissaoMes(c, l.representante_id))}/mês</div>
                  ))}
                  {col.id === DEFINIR && <div className="q-def">{vend.map((l) => primeiroNome(rep[l.representante_id]?.nome || '?')).join(' + ')} · toque para dividir</div>}
                  {col.id === SEM && <small>{c.agencia_nome ? `Agência: ${c.agencia_nome}` : 'Venda direta'}</small>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {modal && (
        <div className="q-fundo" onClick={(e) => e.target === e.currentTarget && !pend && setModal(null)}>
          <div className="q-janela">
            <small className="muted">Contrato nº {modal.c.numero} · {modal.c.radio} · {moeda(modal.c.valor_mensal)}/mês</small>
            <h2>{modal.c.cliente_nome}</h2>

            {modal.modo === 'confirmar' ? (
              <>
                <p>Passar este contrato para <b>{rep[modal.para]?.nome}</b>?</p>
                <ul>
                  {modal.linhas.map((l) => (
                    <li key={`${l.representante_id}${l.papel}`}>
                      {rep[l.representante_id]?.nome}{l.papel === 'diretor' ? ' (diretor)' : ''}: {rotuloRegra(l)} → <b>{moeda((Number(modal.c.valor_mensal) * pctEfetivo(l)) / 100)}/mês</b>
                    </li>
                  ))}
                </ul>
                {erro && <div className="alerta erro">{erro}</div>}
                <div className="q-acoes">
                  <button className="btn cinza" onClick={() => setModal(null)} disabled={pend}>Cancelar</button>
                  <button className="btn sec" onClick={() => editar(modal.c, modal.linhas.filter((l) => l.papel === 'vendedor').map(paraEditor))} disabled={pend}>Ajustar a conta</button>
                  <button className="btn" onClick={() => gravar(modal.c, modal.linhas, '')} disabled={pend}>{pend ? 'Salvando...' : 'Confirmar'}</button>
                </div>
              </>
            ) : (
              <>
                {modal.aviso && <div className="alerta info" style={{ marginTop: 8 }}>{modal.aviso}</div>}
                <p className="muted" style={{ fontSize: '.86rem', margin: '6px 0 10px' }}>
                  Para cada vendedor: o % de comissão e quanto se tira do valor antes (0 = valor cheio; 2 = depois dos 2% do comercial). A conta embaixo atualiza na hora.
                </p>

                {modal.vend.map((l, i) => {
                  const p = valido(l.percentual) ? pctEfetivo({ percentual: numero(l.percentual), desconto: numero(l.desconto || 0) }) : null;
                  return (
                    <div key={i} className="q-pessoa">
                      <div className="q-pessoa-topo">
                        <select value={l.representante_id} onChange={(e) => mudarVend(i, 'representante_id', e.target.value)} aria-label="Vendedor">
                          <option value="">Escolha o vendedor...</option>
                          {reps.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                        </select>
                        <button type="button" className="btn peq cinza" title="Tirar este vendedor do contrato"
                          onClick={() => setModal((m) => ({ ...m, vend: m.vend.filter((_, j) => j !== i) }))}>Tirar</button>
                      </div>
                      <div className="q-campos">
                        <div>
                          <label>Comissão (%)</label>
                          <input inputMode="decimal" placeholder="Ex.: 9" value={l.percentual} onChange={(e) => mudarVend(i, 'percentual', e.target.value)} />
                        </div>
                        <div>
                          <label>Tirar do valor antes (%)</label>
                          <input inputMode="decimal" placeholder="0" value={l.desconto} onChange={(e) => mudarVend(i, 'desconto', e.target.value)} />
                          <div className="q-atalhos">
                            <button type="button" className={numero(l.desconto || 0) === 0 ? 'on' : ''} onClick={() => mudarVend(i, 'desconto', 0)}>valor cheio</button>
                            <button type="button" className={numero(l.desconto || 0) === 2 ? 'on' : ''} onClick={() => mudarVend(i, 'desconto', 2)}>depois dos 2%</button>
                          </div>
                        </div>
                      </div>
                      {p != null && (
                        <div className="q-resultado">
                          = {pct(p)} do contrato · {moeda((Number(modal.c.valor_mensal) * p) / 100)}/mês
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn peq sec" onClick={() => setModal((m) => ({ ...m, vend: [...m.vend, { representante_id: '', percentual: '', desconto: 0 }] }))}>
                    + {modal.vend.length ? 'Dividir com outro vendedor' : 'Adicionar vendedor'}
                  </button>
                  {modal.vend.length > 1 && <button type="button" className="btn peq sec" onClick={dividirIgual}>Dividir os {PADRAO_VENDEDOR}% igualmente</button>}
                </div>

                {diretor && (
                  <div className="q-pessoa" style={{ marginTop: 10 }}>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="checkbox" checked={modal.comDiretor} onChange={(e) => setModal((m) => ({ ...m, comDiretor: e.target.checked }))} />
                      {diretor.nome} (diretor comercial) recebe
                      <input inputMode="decimal" style={{ width: 70 }} value={modal.pctDiretor} disabled={!modal.comDiretor}
                        onChange={(e) => setModal((m) => ({ ...m, pctDiretor: e.target.value }))} aria-label="% do diretor" />
                      % do valor cheio
                    </label>
                  </div>
                )}

                <div className="q-previa">
                  <h3>Prévia da conta</h3>
                  <table>
                    <tbody>
                      <tr><td>Valor do contrato por mês</td><td></td><td>{moeda(conta.mensal)}</td></tr>
                      {conta.pessoas.map((x, i) => (
                        <tr key={i}><td>{x.nome}<br /><small className="muted">{x.regra}</small></td><td>{x.p == null ? '—' : pct(x.p)}</td><td>{moeda(x.valor)}</td></tr>
                      ))}
                      <tr className="total"><td>Total de comissão</td><td>{pct(conta.mensal ? (conta.total / conta.mensal) * 100 : 0)}</td><td>{moeda(conta.total)}</td></tr>
                      <tr><td>Fica para a rádio</td><td></td><td>{moeda(conta.mensal - conta.total)}</td></tr>
                    </tbody>
                  </table>
                  {conta.problemas.length > 0
                    ? conta.problemas.map((p) => <div key={p} className="q-checa erro">✕ {p}</div>)
                    : modal.vend.length > 0 && (Math.abs(conta.somaVend - PADRAO_VENDEDOR) < 0.01
                      ? <div className="q-checa ok">✓ Os vendedores somam {pct(conta.somaVend)} do contrato: bate com o padrão de {PADRAO_VENDEDOR}%.</div>
                      : <div className="q-checa aviso">⚠ Os vendedores somam {pct(conta.somaVend)} do contrato, o padrão é {PADRAO_VENDEDOR}%. Pode salvar, se for isso mesmo.</div>)}
                </div>

                <div className="campo" style={{ marginTop: 12 }}>
                  <label>Observação (opcional)</label>
                  <textarea rows={2} value={modal.regra} onChange={(e) => setModal((m) => ({ ...m, regra: e.target.value }))}
                    placeholder="Ex.: contrato antigo da Michelly e do Percio, 18% divididos meio a meio." />
                  <small className="muted">Fica anotada no contrato. Quem calcula a comissão são os campos acima.</small>
                </div>

                {(histDe[modal.c.id] || []).length > 0 && (
                  <div className="q-hist">
                    <b>Alterações anteriores</b>
                    <ul>
                      {histDe[modal.c.id].slice(0, 4).map((h, i) => (
                        <li key={i}>
                          {dataHora(h.feito_em)}{h.por?.nome ? ` · ${h.por.nome.split(' ')[0]}` : ''}: antes {descreverLinhas(h.antes)}
                          {h.antes?.length > 0 && (
                            <> · <button type="button" className="btn peq sec" style={{ minHeight: 0, padding: '2px 8px' }} disabled={pend}
                              onClick={() => voltar({ c: modal.c, linhas: h.antes.map((l) => ({ ...l, desconto: descontoDe(l) })), regra: '' })}>Voltar para esta</button></>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {erro && <div className="alerta erro">{erro}</div>}
                <div className="q-acoes">
                  <button className="btn cinza" onClick={() => setModal(null)} disabled={pend}>Cancelar</button>
                  <button className="btn" onClick={salvarEditor} disabled={pend || conta.problemas.length > 0}>{pend ? 'Salvando...' : 'Salvar comissão'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

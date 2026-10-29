'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { moeda } from '@/lib/format';
import { pctEfetivo, rotuloRegra } from '@/lib/comissao';
import { salvarComissaoContrato } from '@/lib/acoesComissao';

const DEFINIR = 'definir';
const SEM = 'sem';
// regra conhecida para vendedor sozinho: 18% do valor cheio; o Maycon tira os 2% antes e fica com 40%
const ehMaycon = (r) => /^maycon douglas/i.test(r?.nome || '');
const regraPadrao = (r) => (ehMaycon(r) ? { percentual: 40, base: 'liquido' } : { percentual: 18, base: 'total' });
const primeiroNome = (n) => n.split(' ').slice(0, 2).join(' ');

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
.q-janela { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; width: 100%; max-width: 520px; max-height: 90vh; overflow: auto; }
.q-janela h2 { margin: 0 0 6px; font-size: 1.15rem; }
.q-linha { display: grid; grid-template-columns: 1fr 80px 1fr auto; gap: 6px; margin-bottom: 6px; align-items: center; }
.q-linha input, .q-linha select { width: 100%; }
@media (max-width: 520px) { .q-linha { grid-template-columns: 1fr 70px; } }
.q-acoes { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; flex-wrap: wrap; }
`;

export default function Quadro({ reps, contratos, linhas }) {
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

  // colunas: a definir, um por vendedor, sem vendedor
  const colunas = useMemo(() => {
    const porRep = Object.fromEntries(reps.map((r) => [r.id, []]));
    const definir = [];
    const sem = [];
    for (const c of contratos) {
      const vend = (linhasDe[c.id] || []).filter((l) => l.papel === 'vendedor');
      if (!vend.length) sem.push(c);
      else if (vend.some((l) => l.percentual == null)) definir.push(c);
      else vend.forEach((l) => porRep[l.representante_id]?.push(c));
    }
    const cols = reps.map((r, i) => ({ id: r.id, titulo: primeiroNome(r.nome), rep: r, itens: porRep[r.id], h: (i * 47 + 20) % 360 }))
      .sort((a, b) => b.itens.length - a.itens.length);
    return [
      { id: DEFINIR, titulo: 'A definir', sub: 'Contratos com dois vendedores: falta a regra', itens: definir, h: 40 },
      ...cols,
      { id: SEM, titulo: 'Sem vendedor', sub: 'Venda direta e agências', itens: sem, h: 220 },
    ];
  }, [reps, contratos, linhasDe]);

  const comissaoMes = (c, repId) => (linhasDe[c.id] || []).filter((l) => l.representante_id === repId)
    .reduce((s, l) => s + (Number(c.valor_mensal) * (pctEfetivo(l) || 0)) / 100, 0);

  // Abre a confirmação (regra conhecida) ou o pedido de regra (regra desconhecida)
  function abrir(c, de, para) {
    setErro('');
    if (para === DEFINIR) { setErro('Para deixar um contrato "a definir", abra o contrato e apague o percentual.'); return; }
    const atuais = linhasDe[c.id] || [];
    const vend = atuais.filter((l) => l.papel === 'vendedor');
    const dir = atuais.filter((l) => l.papel === 'diretor');
    const conhecida = para && para !== SEM && vend.length <= 1 && vend.every((l) => l.percentual != null);
    const diretorLinhas = dir.length ? dir : diretor ? [{ representante_id: diretor.id, papel: 'diretor', percentual: 2, base: 'total' }] : [];
    if (conhecida) {
      const r = rep[para];
      setModal({
        modo: 'confirmar', c, de, para,
        linhas: [{ representante_id: para, papel: 'vendedor', ...regraPadrao(r) }, ...diretorLinhas.filter((l) => l.representante_id !== para || l.papel === 'diretor')],
      });
      return;
    }
    // regra desconhecida: começa com o que já tem e o destino
    let vendNovos = vend.map((l) => ({ ...l, percentual: l.percentual ?? '' }));
    if (para && para !== SEM && !vendNovos.some((l) => l.representante_id === para)) {
      vendNovos = [{ representante_id: para, papel: 'vendedor', percentual: '', base: 'total' }, ...vendNovos.filter((l) => l.representante_id !== de)];
    }
    if (para === SEM) vendNovos = [];
    setModal({
      modo: 'regra', c, de, para,
      motivo: vend.length > 1 ? 'Este contrato tem mais de um vendedor.' : vend.some((l) => l.percentual == null) ? 'A comissão deste contrato está a definir.' : para === SEM ? 'O contrato vai ficar sem vendedor.' : 'Ajuste manual da comissão.',
      vend: vendNovos,
      comDiretor: dir.length > 0 || (!atuais.length && !!diretor),
      regra: vend.find((l) => l.regra)?.regra || '',
    });
  }

  function gravar(linhasFinal, regra) {
    const c = modal.c;
    const antes = (linhasDe[c.id] || []).map(({ representante_id, papel, percentual, base }) => ({ representante_id, papel, percentual, base }));
    const regraAntes = (linhasDe[c.id] || []).find((l) => l.regra)?.regra || '';
    iniciar(async () => {
      const r = await salvarComissaoContrato({ contratoId: c.id, linhas: linhasFinal, regra });
      if (r?.erro) { setErro(r.erro); return; }
      setModal(null);
      setDesfazer(antes.length ? { c, linhas: antes, regra: regraAntes } : null);
      router.refresh();
    });
  }

  function voltar() {
    const d = desfazer;
    iniciar(async () => {
      const r = await salvarComissaoContrato({ contratoId: d.c.id, linhas: d.linhas, regra: d.regra });
      if (r?.erro) { setErro(r.erro); return; }
      setDesfazer(null);
      router.refresh();
    });
  }

  function gravarRegra() {
    const m = modal;
    const linhasFinal = [
      ...m.vend.map((l) => ({ representante_id: l.representante_id, papel: 'vendedor', percentual: Number(String(l.percentual).replace(',', '.')), base: l.base })),
      ...(m.comDiretor && diretor ? [{ representante_id: diretor.id, papel: 'diretor', percentual: 2, base: 'total' }] : []),
    ];
    if (!linhasFinal.length) { setErro('Sem vendedor e sem diretor, ninguém ganha comissão. Marque os 2% do diretor ou escolha um vendedor.'); return; }
    const tinhaVendedor = (linhasDe[m.c.id] || []).some((l) => l.papel === 'vendedor');
    if (tinhaVendedor && !m.vend.length && !window.confirm('Você tirou todos os vendedores: o contrato vai para "Sem vendedor" e ninguém recebe a comissão de vendedor. Continuar?')) return;
    gravar(linhasFinal, m.regra);
  }

  const regraOk = modal?.modo === 'regra'
    && modal.regra.trim().length >= 5
    && modal.vend.every((l) => l.representante_id && String(l.percentual).trim() !== '' && !Number.isNaN(Number(String(l.percentual).replace(',', '.'))))
    && new Set(modal.vend.map((l) => l.representante_id)).size === modal.vend.length;

  const mudarVend = (i, campo, valor) => setModal((m) => ({ ...m, vend: m.vend.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)) }));

  return (
    <>
      <style>{CSS}</style>
      {erro && !modal && <div className="alerta erro">{erro}</div>}
      {desfazer && !modal && (
        <div className="alerta info" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>Comissão do contrato nº {desfazer.c.numero} ({desfazer.c.cliente_nome}) salva.</span>
          <button className="btn peq sec" onClick={voltar} disabled={pend}>{pend ? 'Voltando...' : 'Desfazer'}</button>
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
              if (c && de !== col.id) abrir(c, de, col.id);
            }}>
            <h3>{col.titulo} <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>({col.itens.length})</span></h3>
            {col.sub && <span className="q-sub">{col.sub}</span>}
            {col.rep?.diretor && <span className="q-sub">+ 2% de diretor comercial nos contratos dos outros</span>}
            {col.itens.map((c) => {
              const vend = (linhasDe[c.id] || []).filter((l) => l.papel === 'vendedor');
              return (
                <div key={c.id} className="q-card" draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ id: c.id, de: col.id }))}
                  onClick={() => abrir(c, col.id, null)}>
                  <small>Nº {c.numero} · {c.radio}</small>
                  <b>{c.cliente_nome}</b>
                  <small>{moeda(c.valor_mensal)}/mês · até {c.data_fim.split('-').reverse().join('/')}</small>
                  {col.rep && <div className="q-com">Comissão {moeda(comissaoMes(c, col.id))}/mês · {vend.filter((l) => l.representante_id === col.id).map(rotuloRegra).join(' + ')}</div>}
                  {col.id === DEFINIR && <div className="q-def">{vend.map((l) => primeiroNome(rep[l.representante_id]?.nome || '?')).join(' + ')} · regra a definir</div>}
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
                  <button className="btn sec" onClick={() => setModal({
                    modo: 'regra', c: modal.c, de: modal.de, para: modal.para, motivo: 'Ajuste manual da comissão.',
                    vend: modal.linhas.filter((l) => l.papel === 'vendedor'), comDiretor: modal.linhas.some((l) => l.papel === 'diretor'), regra: '',
                  })} disabled={pend}>Outra regra</button>
                  <button className="btn" onClick={() => gravar(modal.linhas, '')} disabled={pend}>{pend ? 'Salvando...' : 'Confirmar'}</button>
                </div>
              </>
            ) : (
              <>
                <div className="alerta info" style={{ marginTop: 8 }}>{modal.motivo} Diga como fica a comissão de cada um e explique a regra. Sem isso não dá para salvar.</div>
                {modal.vend.map((l, i) => (
                  <div key={i} className="q-linha">
                    <select value={l.representante_id} onChange={(e) => mudarVend(i, 'representante_id', e.target.value)} aria-label="Vendedor">
                      <option value="">Vendedor...</option>
                      {reps.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                    </select>
                    <input inputMode="decimal" placeholder="%" value={l.percentual} onChange={(e) => mudarVend(i, 'percentual', e.target.value)} aria-label="Percentual" />
                    <select value={l.base} onChange={(e) => mudarVend(i, 'base', e.target.value)} aria-label="Sobre qual valor">
                      <option value="total">do valor cheio</option>
                      <option value="liquido">depois de tirar os 2%</option>
                    </select>
                    <button type="button" className="btn peq cinza" onClick={() => setModal((m) => ({ ...m, vend: m.vend.filter((_, j) => j !== i) }))} title="Tirar este vendedor do contrato">Tirar</button>
                  </div>
                ))}
                <button type="button" className="btn peq sec" onClick={() => setModal((m) => ({ ...m, vend: [...m.vend, { representante_id: '', papel: 'vendedor', percentual: '', base: 'total' }] }))}>
                  + {modal.vend.length ? 'Dividir com outro vendedor' : 'Adicionar vendedor'}
                </button>
                {diretor && (
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0' }}>
                    <input type="checkbox" checked={modal.comDiretor} onChange={(e) => setModal((m) => ({ ...m, comDiretor: e.target.checked }))} />
                    {diretor.nome} leva 2% do valor cheio (diretor comercial)
                  </label>
                )}
                <div className="campo">
                  <label>Qual é a regra? *</label>
                  <textarea rows={3} value={modal.regra} onChange={(e) => setModal((m) => ({ ...m, regra: e.target.value }))}
                    placeholder="Ex.: contrato antigo da Michelly e do Percio, os 18% divididos meio a meio, sem os 2% do diretor." />
                  <small className="muted">O texto fica como anotação. Quem calcula a comissão são o percentual e a base de cada vendedor acima.</small>
                </div>
                {modal.vend.length > 0 && modal.vend.every((l) => String(l.percentual).trim() !== '') && (
                  <p className="muted" style={{ fontSize: '.88rem' }}>
                    {modal.vend.map((l) => `${primeiroNome(rep[l.representante_id]?.nome || '?')}: ${moeda((Number(modal.c.valor_mensal) * (pctEfetivo({ ...l, percentual: String(l.percentual).replace(',', '.') }) || 0)) / 100)}/mês`).join(' · ')}
                  </p>
                )}
                {erro && <div className="alerta erro">{erro}</div>}
                <div className="q-acoes">
                  <button className="btn cinza" onClick={() => setModal(null)} disabled={pend}>Cancelar</button>
                  <button className="btn" onClick={gravarRegra} disabled={pend || !regraOk}>{pend ? 'Salvando...' : 'Salvar regra'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

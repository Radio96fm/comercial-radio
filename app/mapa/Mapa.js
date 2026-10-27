'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { TIPOS, mapaInicial } from '@/lib/mapaInicial';

// Mapa do fluxo do negócio: caixas e setas que todo mundo do comercial edita.
// Fica guardado como um arquivo JSON no armazenamento do Supabase (pasta mapa/
// do bucket privado "assistente", que só gestor e comercial leem e gravam).
const BUCKET = 'assistente';
const ARQUIVO = 'mapa/fluxo.json';
const LARG = 270;
const novoId = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function baixar() {
  const { data, error } = await createClient().storage.from(BUCKET).download(ARQUIVO);
  if (error || !data) return null;
  return JSON.parse(await data.text());
}

// pontos de saída e chegada da seta conforme a posição das duas caixas
function ancoras(a, b, ha, hb) {
  const ca = { x: a.x + LARG / 2, y: a.y + ha / 2 };
  const cb = { x: b.x + LARG / 2, y: b.y + hb / 2 };
  if (b.y >= a.y + ha - 10) return [{ x: ca.x, y: a.y + ha }, { x: cb.x, y: b.y }, 'v'];
  if (a.y >= b.y + hb - 10) return [{ x: ca.x, y: a.y }, { x: cb.x, y: b.y + hb }, 'v'];
  if (cb.x > ca.x) return [{ x: a.x + LARG, y: ca.y }, { x: b.x, y: cb.y }, 'h'];
  return [{ x: a.x, y: ca.y }, { x: b.x + LARG, y: cb.y }, 'h'];
}

function caminho(p, q, dir) {
  if (dir === 'v') {
    const m = Math.max(30, Math.abs(q.y - p.y) / 2) * Math.sign(q.y - p.y || 1);
    return `M${p.x},${p.y} C${p.x},${p.y + m} ${q.x},${q.y - m} ${q.x},${q.y}`;
  }
  const m = Math.max(30, Math.abs(q.x - p.x) / 2) * Math.sign(q.x - p.x || 1);
  return `M${p.x},${p.y} C${p.x + m},${p.y} ${q.x - m},${q.y} ${q.x},${q.y}`;
}

const quando = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function Mapa({ autor }) {
  const [mapa, setMapa] = useState(null);
  const [base, setBase] = useState(null); // versão que foi carregada (para não sobrescrever a de outra pessoa)
  const [status, setStatus] = useState('Carregando...');
  const [conflito, setConflito] = useState(false);
  const [sel, setSel] = useState(null); // { tipo: 'no' | 'lig', id }
  const [ligando, setLigando] = useState(null); // id da caixa de origem
  const [apagar, setApagar] = useState(false);
  const [vista, setVista] = useState({ x: 40, y: 20, k: 0.8 });
  const [alturas, setAlturas] = useState({});
  const [comentario, setComentario] = useState('');
  const refs = useRef({});
  const area = useRef(null);
  const arrasto = useRef(null);
  const sujo = useRef(false);
  const edicoes = useRef(0);
  const salvando = useRef(false);
  const mapaRef = useRef(null);
  mapaRef.current = mapa;

  // ---------- carregar
  const carregar = useCallback(async () => {
    setStatus('Carregando...');
    const salvo = await baixar().catch(() => null);
    const m = salvo || mapaInicial();
    setMapa(m);
    setBase(m.versao);
    setConflito(false);
    sujo.current = false;
    setStatus(salvo ? 'Salvo' : 'Mapa inicial (ainda não salvo)');
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  // ---------- salvar (espera 1,5 s depois da última mudança)
  const salvar = useCallback(async () => {
    if (salvando.current || conflito || !mapaRef.current) return;
    salvando.current = true;
    const contagem = edicoes.current;
    setStatus('Salvando...');
    try {
      const atual = await baixar().catch(() => null);
      if (atual && atual.versao !== base) {
        setConflito(true);
        setStatus('Outra pessoa salvou');
        return;
      }
      const versao = novoId('v');
      const dados = { ...mapaRef.current, versao };
      const { error } = await createClient().storage.from(BUCKET).upload(ARQUIVO, new Blob([JSON.stringify(dados)], { type: 'application/json' }), { upsert: true, cacheControl: '0', contentType: 'application/json' });
      if (error) { setStatus('Não salvou. Tente de novo.'); return; }
      setBase(versao);
      // se alguém mexeu durante o envio, o próximo ciclo salva de novo
      if (edicoes.current === contagem) { sujo.current = false; setStatus('Salvo'); }
      setMapa((m) => ({ ...m, versao }));
    } catch {
      setStatus('Não salvou. Confira a internet.');
    } finally {
      salvando.current = false;
    }
  }, [base, conflito]);

  useEffect(() => {
    if (!sujo.current) return undefined;
    const t = setTimeout(salvar, 1500);
    return () => clearTimeout(t);
  }, [mapa, salvar]);

  const mudar = (fn) => {
    sujo.current = true;
    edicoes.current += 1;
    setStatus('Alterações não salvas');
    setMapa((m) => ({ ...fn(m), versao: m.versao }));
  };

  // ---------- medir a altura das caixas para ligar as setas no lugar certo
  useLayoutEffect(() => {
    if (!mapa) return;
    const novo = {};
    let mudou = false;
    mapa.nos.forEach((n) => {
      const h = refs.current[n.id]?.offsetHeight || 100;
      novo[n.id] = h;
      if (alturas[n.id] !== h) mudou = true;
    });
    if (mudou) setAlturas(novo);
  });

  // ---------- mover a tela e as caixas
  const ponto = (e) => {
    const r = area.current.getBoundingClientRect();
    return { x: (e.clientX - r.left - vista.x) / vista.k, y: (e.clientY - r.top - vista.y) / vista.k };
  };

  function downFundo(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    arrasto.current = { tipo: 'tela', sx: e.clientX, sy: e.clientY, vx: vista.x, vy: vista.y, moveu: false };
    area.current.setPointerCapture(e.pointerId);
  }
  function downNo(e, n) {
    e.stopPropagation();
    if (ligando) {
      if (ligando !== n.id) mudar((m) => ({ ...m, ligacoes: [...m.ligacoes, { id: novoId('l'), de: ligando, para: n.id, rotulo: '' }] }));
      setLigando(null);
      setSel({ tipo: 'no', id: n.id });
      return;
    }
    const p = ponto(e);
    arrasto.current = { tipo: 'no', id: n.id, dx: p.x - n.x, dy: p.y - n.y, sx: e.clientX, sy: e.clientY, moveu: false };
    area.current.setPointerCapture(e.pointerId);
  }
  function move(e) {
    const a = arrasto.current;
    if (!a) return;
    if (!a.moveu && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) < 4) return;
    a.moveu = true;
    if (a.tipo === 'tela') setVista((v) => ({ ...v, x: a.vx + e.clientX - a.sx, y: a.vy + e.clientY - a.sy }));
    else {
      const p = ponto(e);
      mudar((m) => ({ ...m, nos: m.nos.map((n) => (n.id === a.id ? { ...n, x: Math.round(p.x - a.dx), y: Math.round(p.y - a.dy) } : n)) }));
    }
  }
  function up() {
    const a = arrasto.current;
    arrasto.current = null;
    if (!a || a.moveu) return;
    if (a.tipo === 'no') { setSel({ tipo: 'no', id: a.id }); setApagar(false); }
    else { setSel(null); setLigando(null); }
  }
  function roda(e) {
    const r = area.current.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    setVista((v) => {
      const k = Math.min(2, Math.max(0.25, v.k * (e.deltaY < 0 ? 1.1 : 0.9)));
      return { k, x: mx - ((mx - v.x) / v.k) * k, y: my - ((my - v.y) / v.k) * k };
    });
  }
  useEffect(() => {
    const el = area.current;
    if (!el) return undefined;
    const fn = (e) => { e.preventDefault(); roda(e); };
    el.addEventListener('wheel', fn, { passive: false });
    return () => el.removeEventListener('wheel', fn);
  });
  const zoom = (f) => setVista((v) => {
    const r = area.current.getBoundingClientRect();
    const k = Math.min(2, Math.max(0.25, v.k * f));
    return { k, x: r.width / 2 - ((r.width / 2 - v.x) / v.k) * k, y: r.height / 2 - ((r.height / 2 - v.y) / v.k) * k };
  });
  const ajustar = () => {
    if (!mapa?.nos.length) return;
    const r = area.current.getBoundingClientRect();
    const xs = mapa.nos.map((n) => n.x);
    const ys = mapa.nos.map((n) => n.y);
    const x0 = Math.min(...xs) - 30;
    const x1 = Math.max(...xs) + LARG + 30;
    const y0 = Math.min(...ys) - 30;
    const k = Math.min(1, Math.max(0.25, r.width / (x1 - x0)));
    setVista({ k, x: -x0 * k + (r.width - (x1 - x0) * k) / 2, y: -y0 * k });
  };

  // ---------- criar e apagar
  const centro = () => {
    const r = area.current.getBoundingClientRect();
    return { x: Math.round((r.width / 2 - vista.x) / vista.k - LARG / 2), y: Math.round((r.height / 3 - vista.y) / vista.k) };
  };
  function novaCaixa(tipo) {
    const id = novoId('n');
    const c = centro();
    mudar((m) => ({ ...m, nos: [...m.nos, { id, tipo, x: c.x, y: c.y, titulo: tipo === 'mudanca' ? 'Mudança' : 'Novo passo', texto: '' }] }));
    setSel({ tipo: 'no', id });
  }
  function proximo(n) {
    const id = novoId('n');
    const h = alturas[n.id] || 120;
    mudar((m) => ({
      ...m,
      nos: [...m.nos, { id, tipo: 'passo', x: n.x, y: n.y + h + 70, titulo: 'Novo passo', texto: '' }],
      ligacoes: [...m.ligacoes, { id: novoId('l'), de: n.id, para: id, rotulo: '' }],
    }));
    setSel({ tipo: 'no', id });
  }
  function apagarSel() {
    if (!sel) return;
    if (sel.tipo === 'no') {
      mudar((m) => ({
        ...m,
        nos: m.nos.filter((n) => n.id !== sel.id),
        ligacoes: m.ligacoes.filter((l) => l.de !== sel.id && l.para !== sel.id),
        comentarios: m.comentarios.filter((c) => c.no !== sel.id),
      }));
    } else mudar((m) => ({ ...m, ligacoes: m.ligacoes.filter((l) => l.id !== sel.id) }));
    setSel(null);
    setApagar(false);
  }
  const editarNo = (id, campos) => mudar((m) => ({ ...m, nos: m.nos.map((n) => (n.id === id ? { ...n, ...campos } : n)) }));
  const editarLig = (id, campos) => mudar((m) => ({ ...m, ligacoes: m.ligacoes.map((l) => (l.id === id ? { ...l, ...campos } : l)) }));
  function comentar(noId) {
    const texto = comentario.trim();
    if (!texto) return;
    mudar((m) => ({ ...m, comentarios: [...m.comentarios, { id: novoId('c'), no: noId, autor, texto, em: new Date().toISOString() }] }));
    setComentario('');
  }
  const apagarComentario = (id) => mudar((m) => ({ ...m, comentarios: m.comentarios.filter((c) => c.id !== id) }));

  if (!mapa) return <div className="mapa-carregando">Carregando o mapa...</div>;

  const porId = Object.fromEntries(mapa.nos.map((n) => [n.id, n]));
  const noSel = sel?.tipo === 'no' ? porId[sel.id] : null;
  const ligSel = sel?.tipo === 'lig' ? mapa.ligacoes.find((l) => l.id === sel.id) : null;
  const qtdComent = (id) => mapa.comentarios.filter((c) => c.no === id).length;

  return (
    <div className="mapa">
      <header className="mapa-topo">
        <div className="mapa-titulo">
          <b>Mapa do fluxo</b>
          <span className={`mapa-status ${status === 'Salvo' ? 'ok' : ''}`}>{status}</span>
        </div>
        <div className="mapa-acoes">
          <button type="button" onClick={() => novaCaixa('passo')}>+ Caixa</button>
          <button type="button" onClick={() => novaCaixa('mudanca')}>+ Mudança</button>
          <button type="button" onClick={() => zoom(0.85)} aria-label="Diminuir">−</button>
          <button type="button" onClick={() => zoom(1.15)} aria-label="Aumentar">+</button>
          <button type="button" onClick={ajustar}>Centralizar</button>
          <Link href="/gestao">Sair do mapa</Link>
        </div>
      </header>

      {conflito && (
        <div className="mapa-aviso">
          Outra pessoa salvou o mapa enquanto você editava. Suas últimas mudanças não foram gravadas.
          <button type="button" onClick={carregar}>Carregar a versão nova</button>
        </div>
      )}
      {ligando && <div className="mapa-aviso azul">Toque na caixa de destino da seta. <button type="button" onClick={() => setLigando(null)}>Cancelar</button></div>}

      <div className="mapa-corpo">
        <div ref={area} className={`mapa-area ${ligando ? 'ligando' : ''}`} onPointerDown={downFundo} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className="mapa-plano" style={{ transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.k})` }}>
            <svg className="mapa-setas" width="6000" height="6000">
              <defs>
                <marker id="ponta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" className="ponta" />
                </marker>
                <marker id="ponta-sel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" className="ponta-sel" />
                </marker>
              </defs>
              {mapa.ligacoes.map((l) => {
                const a = porId[l.de];
                const b = porId[l.para];
                if (!a || !b) return null;
                const [p, q, dir] = ancoras(a, b, alturas[a.id] || 100, alturas[b.id] || 100);
                const d = caminho(p, q, dir);
                const ativo = sel?.tipo === 'lig' && sel.id === l.id;
                const lateral = a.tipo === 'gestao' || b.tipo === 'mudanca' || b.tipo === 'trava' || a.tipo === 'mudanca';
                return (
                  <g key={l.id} onPointerDown={(e) => { e.stopPropagation(); setSel({ tipo: 'lig', id: l.id }); setApagar(false); }}>
                    <path d={d} className="seta-toque" />
                    <path d={d} className={`seta ${ativo ? 'sel' : ''} ${lateral ? 'tracejada' : ''}`} markerEnd={`url(#${ativo ? 'ponta-sel' : 'ponta'})`} />
                    {l.rotulo && <text x={(p.x + q.x) / 2 + 8} y={(p.y + q.y) / 2} className="seta-rotulo">{l.rotulo}</text>}
                  </g>
                );
              })}
            </svg>
            {mapa.nos.map((n) => (
              <div
                key={n.id}
                ref={(el) => { refs.current[n.id] = el; }}
                className={`no t-${n.tipo} ${sel?.tipo === 'no' && sel.id === n.id ? 'sel' : ''}`}
                style={{ left: n.x, top: n.y, width: LARG }}
                onPointerDown={(e) => downNo(e, n)}
              >
                <div className="no-tipo">{TIPOS[n.tipo] || n.tipo}{qtdComent(n.id) > 0 && <span className="no-coment">{qtdComent(n.id)} comentário{qtdComent(n.id) > 1 ? 's' : ''}</span>}</div>
                <b>{n.titulo}</b>
                {n.texto && <p>{n.texto}</p>}
              </div>
            ))}
          </div>
          <div className="mapa-dica">Arraste o fundo para andar, a roda do mouse aproxima. Toque numa caixa ou seta para editar.</div>
        </div>

        {(noSel || ligSel) && (
          <aside className="mapa-painel">
            <button type="button" className="fechar" onClick={() => setSel(null)} aria-label="Fechar">×</button>
            {noSel && (
              <>
                <label htmlFor="m-tipo">Tipo</label>
                <select id="m-tipo" value={noSel.tipo} onChange={(e) => editarNo(noSel.id, { tipo: e.target.value })}>
                  {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <label htmlFor="m-titulo">Título</label>
                <input id="m-titulo" value={noSel.titulo} onChange={(e) => editarNo(noSel.id, { titulo: e.target.value })} />
                <label htmlFor="m-texto">Como funciona</label>
                <textarea id="m-texto" value={noSel.texto} rows={7} onChange={(e) => editarNo(noSel.id, { texto: e.target.value })} />
                <div className="mapa-botoes">
                  <button type="button" onClick={() => proximo(noSel)}>+ Próximo passo</button>
                  <button type="button" onClick={() => setLigando(noSel.id)}>Ligar a outra caixa</button>
                </div>

                <h3>Comentários</h3>
                {mapa.comentarios.filter((c) => c.no === noSel.id).map((c) => (
                  <div key={c.id} className="coment">
                    <div className="coment-topo"><b>{c.autor}</b><span>{quando(c.em)}</span>
                      <button type="button" onClick={() => apagarComentario(c.id)} aria-label="Apagar comentário">×</button>
                    </div>
                    <p>{c.texto}</p>
                  </div>
                ))}
                <label htmlFor="m-coment" className="sr">Novo comentário</label>
                <textarea id="m-coment" rows={3} placeholder="Escreva o que precisa mudar nesta regra..." value={comentario} onChange={(e) => setComentario(e.target.value)} />
                <button type="button" className="principal" onClick={() => comentar(noSel.id)} disabled={!comentario.trim()}>Comentar</button>
              </>
            )}
            {ligSel && (
              <>
                <h3 style={{ marginTop: 0 }}>Seta</h3>
                <p className="muted">{porId[ligSel.de]?.titulo} → {porId[ligSel.para]?.titulo}</p>
                <label htmlFor="m-rotulo">Texto na seta</label>
                <input id="m-rotulo" value={ligSel.rotulo} placeholder="Ex.: sim, não, se aprovar" onChange={(e) => editarLig(ligSel.id, { rotulo: e.target.value })} />
              </>
            )}
            <div className="mapa-apagar">
              {apagar
                ? <><button type="button" className="perigo" onClick={apagarSel}>Confirmar: apagar</button><button type="button" onClick={() => setApagar(false)}>Manter</button></>
                : <button type="button" className="perigo-leve" onClick={() => setApagar(true)}>{noSel ? 'Apagar caixa' : 'Apagar seta'}</button>}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

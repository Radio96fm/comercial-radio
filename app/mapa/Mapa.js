'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MODELO, TIPOS, atualizarModelo, mapaInicial } from '@/lib/mapaInicial';
import TelaPrevia, { TELAS, telaDe, proporcao } from './Telas';

// Mapa do fluxo do negócio: caixas e setas que qualquer pessoa com o link edita,
// sem login. Fica numa linha da tabela mapa_fluxo, lida e gravada só pelas
// funções mapa_ler e mapa_salvar (supabase/migracao-mapa.sql).
const LARG = 300;
const GAPX = 150;
const GAPY = 50;
const novoId = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const FALTA_SQL = 'Falta ativar o mapa no banco (supabase/migracao-mapa.sql)';
const semFuncao = (error) => error && (error.code === 'PGRST202' || /mapa_(ler|salvar)/.test(error.message || ''));

async function ler(codigo) {
  const { data, error } = await createClient().rpc('mapa_ler', { p_id: codigo });
  if (error) throw error;
  return data || null;
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

// Caixas que aparecem: começa pelo Início (e caixas soltas) e segue as setas.
// Seta com "botao" só passa quando aquele botão da tela foi tocado. Caixas de
// gestão, travas e mudanças sem seta chegando aparecem junto com a caixa a que apontam.
function visiveis(m, abertos, tudo, forcados) {
  if (tudo) return new Set(m.nos.map((n) => n.id));
  const chega = new Set(m.ligacoes.map((l) => l.para));
  const sai = new Set(m.ligacoes.map((l) => l.de));
  const v = new Set(m.nos.filter((n) => n.tipo === 'inicio' || forcados.has(n.id) || (!chega.has(n.id) && !sai.has(n.id))).map((n) => n.id));
  for (let mudou = true; mudou;) {
    mudou = false;
    m.ligacoes.forEach((l) => {
      const passa = v.has(l.de) && (!l.botao || abertos.has(`${l.de}:${l.botao}`));
      const lado = !chega.has(l.de) && v.has(l.para) && !m.nos.some((n) => n.id === l.de && n.tipo === 'inicio');
      if (passa && !v.has(l.para)) { v.add(l.para); mudou = true; }
      if (lado && !v.has(l.de)) { v.add(l.de); mudou = true; }
    });
  }
  return v;
}

// Posição das caixas: árvore da esquerda para a direita a partir do Início,
// cada caminho aberto empurra os de baixo. Caixa arrastada à mão fica onde foi solta.
function arrumar(m, vis, abertos, tudo, altura) {
  const porId = Object.fromEntries(m.nos.map((n) => [n.id, n]));
  const passa = (l) => tudo || !l.botao || abertos.has(`${l.de}:${l.botao}`);
  const chega = new Set(m.ligacoes.map((l) => l.para));
  const filhos = {};
  const visto = new Set();
  const raizes = m.nos.filter((n) => vis.has(n.id) && n.tipo === 'inicio').map((n) => n.id);
  const fila = [...raizes];
  raizes.forEach((id) => visto.add(id));
  const pendurar = (pai, id) => { visto.add(id); (filhos[pai] = filhos[pai] || []).push(id); fila.push(id); };
  while (fila.length) {
    const id = fila.shift();
    m.ligacoes.forEach((l) => { if (l.de === id && vis.has(l.para) && !visto.has(l.para) && passa(l)) pendurar(id, l.para); });
    m.ligacoes.forEach((l) => { if (l.para === id && vis.has(l.de) && !visto.has(l.de) && !chega.has(l.de)) pendurar(id, l.de); });
  }
  const pos = {};
  const por = (id, d, y) => {
    pos[id] = { x: d * (LARG + GAPX), y };
    let cy = y;
    (filhos[id] || []).forEach((f) => { cy = por(f, d + 1, cy) + GAPY; });
    return Math.max(y + altura(porId[id]), cy - GAPY);
  };
  let y0 = 0;
  raizes.forEach((id) => { y0 = por(id, 0, y0) + GAPY * 3; });
  // caixas soltas (criadas à mão ou que ficaram de mapas antigos): coluna à esquerda
  let ys = 0;
  m.nos.forEach((n) => {
    if (!vis.has(n.id)) return;
    if (n.fixo) pos[n.id] = { x: n.x, y: n.y };
    else if (!pos[n.id]) { pos[n.id] = { x: -(LARG + GAPX), y: ys }; ys += altura(n) + GAPY; }
  });
  return pos;
}

const quando = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function Mapa({ codigo }) {
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
  const [telas, setTelas] = useState(true);
  const [abertos, setAbertos] = useState(() => new Set()); // "caixa:botão" tocados nas telas
  const [tudo, setTudo] = useState(false);
  const [forcados, setForcados] = useState(() => new Set()); // telas abertas pelo Voltar/menu
  const [foco, setFoco] = useState(null);
  const [cheia, setCheia] = useState(false);
  const historico = useRef([]); // ordem em que os caminhos foram abertos, para "Voltar um passo"
  const posRef = useRef({});
  const [autor, setAutor] = useState('');
  useEffect(() => { try { setAutor(localStorage.getItem('mapaAutor') || ''); } catch { /* sem armazenamento */ } }, []);
  const mudarAutor = (v) => { setAutor(v); try { localStorage.setItem('mapaAutor', v); } catch { /* sem armazenamento */ } };
  const refs = useRef({});
  const area = useRef(null);
  const arrasto = useRef(null);
  const sujo = useRef(false);
  const edicoes = useRef(0);
  const salvando = useRef(false);
  const mapaRef = useRef(null);
  mapaRef.current = mapa;

  const vis = mapa ? visiveis(mapa, abertos, tudo, forcados) : new Set();
  const altura = (n) => alturas[n.id] || (proporcao(n.tela) ? (LARG - 28) * proporcao(n.tela) + 90 : 130);
  const pos = mapa ? arrumar(mapa, vis, abertos, tudo, altura) : {};
  posRef.current = pos;

  // leva a vista até a caixa que acabou de abrir
  useEffect(() => {
    if (!foco) return;
    const p = posRef.current[foco];
    const r = area.current?.getBoundingClientRect();
    setFoco(null);
    if (!p || !r) return;
    setVista((v) => {
      const sx = p.x * v.k + v.x;
      const sy = p.y * v.k + v.y;
      const dentro = sx >= 0 && sx + LARG * v.k <= r.width && sy >= 0 && sy + 120 * v.k <= r.height;
      if (dentro) return v;
      return { ...v, x: v.x + (r.width / 2 - (sx + (LARG * v.k) / 2)), y: v.y + (r.height * 0.15 - sy) };
    });
  }, [foco]);

  // toque num botão da tela: abre (ou fecha) a seta e leva a vista até a próxima tela
  function ir(no, k) {
    const chave = `${no.id}:${k}`;
    const abrir = !abertos.has(chave);
    setAbertos((a) => { const b = new Set(a); if (abrir) b.add(chave); else b.delete(chave); return b; });
    historico.current = historico.current.filter((c) => c !== chave);
    if (abrir) historico.current.push(chave);
    const l = mapa.ligacoes.find((x) => x.de === no.id && x.botao === k);
    if (abrir && l) setFoco(l.para);
  }
  // fecha a tela (e o que veio depois dela), voltando para a tela de onde ela saiu
  function fecharTela(id) {
    const chaves = mapa.ligacoes.filter((l) => l.para === id && l.botao).map((l) => `${l.de}:${l.botao}`);
    setAbertos((a) => { const b = new Set(a); chaves.forEach((c) => b.delete(c)); return b; });
    setForcados((f) => { const g = new Set(f); g.delete(id); return g; });
    historico.current = historico.current.filter((c) => !chaves.includes(c));
    const origem = chaves.find((c) => abertos.has(c));
    if (origem) setFoco(origem.split(':')[0]);
  }
  function voltarPasso() {
    const h = historico.current.filter((c) => abertos.has(c));
    const ultima = h.pop();
    historico.current = h;
    if (!ultima) return;
    setAbertos((a) => { const b = new Set(a); b.delete(ultima); return b; });
    setFoco(ultima.split(':')[0]);
  }
  const fechavel = (n) => !tudo && n.tipo !== 'inicio' && (forcados.has(n.id) || mapa.ligacoes.some((l) => l.para === n.id && l.botao && abertos.has(`${l.de}:${l.botao}`)));
  async function telaCheia() {
    const ligar = !cheia;
    setCheia(ligar);
    try {
      if (ligar && !document.fullscreenElement) await document.documentElement.requestFullscreen?.();
      if (!ligar && document.fullscreenElement) await document.exitFullscreen?.();
    } catch { /* o iPhone não deixa: fica só sem a barra de cima */ }
  }
  useEffect(() => {
    const fn = () => { if (!document.fullscreenElement) setCheia(false); };
    document.addEventListener('fullscreenchange', fn);
    return () => document.removeEventListener('fullscreenchange', fn);
  }, []);
  function pular(id) {
    if (!vis.has(id)) setForcados((f) => new Set(f).add(id));
    setFoco(id);
  }

  // ---------- carregar
  const carregar = useCallback(async () => {
    setStatus('Carregando...');
    let salvo = null;
    let erro = null;
    try { salvo = await ler(codigo); } catch (e) { erro = e; }
    // sem o banco ativado, vale a cópia guardada neste aparelho
    if (!salvo) {
      try {
        const local = JSON.parse(localStorage.getItem(`mapaLocal:${codigo}`) || 'null');
        if (local?.modelo === MODELO) salvo = local;
      } catch { /* sem armazenamento */ }
    }
    const antigo = salvo && (salvo.modelo || 1) < MODELO;
    const m = antigo ? atualizarModelo(salvo) : salvo || mapaInicial();
    setMapa(m);
    setBase(m.versao);
    setConflito(false);
    sujo.current = antigo;
    if (antigo) edicoes.current += 1;
    setStatus(semFuncao(erro) ? FALTA_SQL : erro ? 'Não consegui abrir o mapa salvo' : antigo ? 'Mapa atualizado com o app completo' : salvo ? 'Salvo' : 'Mapa inicial (ainda não salvo)');
    // começa mostrando o Início no alto, no meio da tela
    const ini = m.nos.find((n) => n.tipo === 'inicio');
    const r = area.current?.getBoundingClientRect();
    if (ini && r) {
      const k = r.width < 700 ? 0.6 : 0.8;
      setVista({ k, x: r.width / 2 - (ini.x + LARG / 2) * k, y: 20 - ini.y * k });
    }
  }, [codigo]);
  useEffect(() => { carregar(); }, [carregar]);

  // ---------- salvar (espera 1,5 s depois da última mudança)
  const salvar = useCallback(async () => {
    if (salvando.current || conflito || !mapaRef.current) return;
    salvando.current = true;
    const contagem = edicoes.current;
    setStatus('Salvando...');
    try {
      const versao = novoId('v');
      const dados = { ...mapaRef.current, versao };
      const { data: r, error } = await createClient().rpc('mapa_salvar', { p_id: codigo, p_dados: dados, p_base: base });
      if (error) { setStatus(semFuncao(error) ? FALTA_SQL : 'Não salvou. Tente de novo.'); return; }
      if (r === 'conflito') { setConflito(true); setStatus('Outra pessoa salvou'); return; }
      setBase(versao);
      // se alguém mexeu durante o envio, o próximo ciclo salva de novo
      if (edicoes.current === contagem) { sujo.current = false; setStatus('Salvo'); }
      setMapa((m) => ({ ...m, versao }));
    } catch {
      setStatus('Não salvou. Confira a internet.');
    } finally {
      salvando.current = false;
    }
  }, [base, conflito, codigo]);

  useEffect(() => {
    if (!sujo.current) return undefined;
    try { localStorage.setItem(`mapaLocal:${codigo}`, JSON.stringify(mapa)); } catch { /* sem armazenamento */ }
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
    const q = pos[n.id] || n;
    arrasto.current = { tipo: 'no', id: n.id, dx: p.x - q.x, dy: p.y - q.y, sx: e.clientX, sy: e.clientY, moveu: false };
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
      mudar((m) => ({ ...m, nos: m.nos.map((n) => (n.id === a.id ? { ...n, fixo: true, x: Math.round(p.x - a.dx), y: Math.round(p.y - a.dy) } : n)) }));
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
    const nos = Object.values(pos);
    if (!nos.length) return;
    const r = area.current.getBoundingClientRect();
    const xs = nos.map((n) => n.x);
    const ys = nos.map((n) => n.y);
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
    mudar((m) => ({ ...m, nos: [...m.nos, { id, tipo, fixo: true, x: c.x, y: c.y, titulo: tipo === 'mudanca' ? 'Mudança' : 'Novo passo', texto: '' }] }));
    setSel({ tipo: 'no', id });
  }
  function proximo(n) {
    const id = novoId('n');
    mudar((m) => ({
      ...m,
      nos: [...m.nos, { id, tipo: 'passo', x: 0, y: 0, titulo: 'Novo passo', texto: '' }],
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
    mudar((m) => ({ ...m, comentarios: [...m.comentarios, { id: novoId('c'), no: noId, autor: autor.trim() || 'Sem nome', texto, em: new Date().toISOString() }] }));
    setComentario('');
  }
  const apagarComentario = (id) => mudar((m) => ({ ...m, comentarios: m.comentarios.filter((c) => c.id !== id) }));

  // mapa inteiro em texto, com as mudanças em relação ao app de hoje no começo,
  // para mandar ao Claude (copiando ou baixando o arquivo)
  function textoMapa() {
    const m = mapaRef.current;
    const ini = mapaInicial();
    const orig = Object.fromEntries(ini.nos.map((n) => [n.id, n]));
    const nome = Object.fromEntries([...ini.nos, ...m.nos].map((n) => [n.id, n.titulo]));
    const chaveLig = (l) => `${l.de}>${l.para}`;
    const ligOrig = new Set(ini.ligacoes.map(chaveLig));
    const ligAgora = new Set(m.ligacoes.map(chaveLig));
    const saidas = (id) => m.ligacoes.filter((l) => l.de === id).map((l) => `${l.rotulo ? `(${l.rotulo}) ` : ''}${nome[l.para]}`);
    const entradas = (id) => m.ligacoes.filter((l) => l.para === id).map((l) => `${nome[l.de]}${l.rotulo ? ` (${l.rotulo})` : ''}`);
    const coms = (id) => m.comentarios.filter((c) => c.no === id).map((c) => `  Comentário de ${c.autor}: ${c.texto}`);
    const recuo = (t) => `  ${t.replace(/\n/g, '\n  ')}`;
    const mud = [];
    m.nos.forEach((n) => {
      const o = orig[n.id];
      if (!o) {
        mud.push([`NOVA CAIXA [${TIPOS[n.tipo] || n.tipo}] ${n.titulo}`, n.texto && recuo(n.texto),
          entradas(n.id).length && `  Vem de: ${entradas(n.id).join('; ')}`, saidas(n.id).length && `  Segue para: ${saidas(n.id).join('; ')}`, ...coms(n.id)].filter(Boolean).join('\n'));
        return;
      }
      const linhas = [];
      if (o.titulo !== n.titulo) linhas.push(`  Título: "${o.titulo}" virou "${n.titulo}"`);
      if (o.texto !== n.texto) linhas.push(`  Texto antes: ${o.texto || '(vazio)'}\n  Texto agora: ${n.texto || '(vazio)'}`);
      if (o.tipo !== n.tipo) linhas.push(`  Tipo: ${TIPOS[o.tipo]} virou ${TIPOS[n.tipo]}`);
      linhas.push(...coms(n.id));
      if (linhas.length) mud.push([`NA CAIXA "${o.titulo}"${n.tela ? ' (tela do app)' : ''}`, ...linhas].join('\n'));
    });
    ini.nos.filter((n) => !m.nos.some((x) => x.id === n.id)).forEach((n) => mud.push(`CAIXA APAGADA: ${n.titulo}`));
    m.ligacoes.filter((l) => !ligOrig.has(chaveLig(l))).forEach((l) => mud.push(`NOVA SETA: ${nome[l.de]} → ${nome[l.para]}${l.rotulo ? ` (${l.rotulo})` : ''}`));
    ini.ligacoes.filter((l) => !ligAgora.has(chaveLig(l))).forEach((l) => mud.push(`SETA APAGADA: ${nome[l.de]} → ${nome[l.para]}`));
    const completo = m.nos.map((n) => [`[${TIPOS[n.tipo] || n.tipo}] ${n.titulo}`, n.texto && recuo(n.texto),
      saidas(n.id).length && `  Segue para: ${saidas(n.id).join('; ')}`].filter(Boolean).join('\n'));
    return `MAPA DO FLUXO: app do vendedor (${new Date().toLocaleString('pt-BR')})\n\n`
      + `== MUDANÇAS PEDIDAS (${mud.length}) ==\nTudo que não aparece aqui continua como está no app.\n\n${mud.join('\n\n') || 'Nenhuma mudança.'}\n\n`
      + `== MAPA COMPLETO ==\n\n${completo.join('\n\n')}\n`;
  }
  async function copiarTexto() {
    try { await navigator.clipboard.writeText(textoMapa()); setStatus('Copiado: cole na conversa'); }
    catch { setStatus('Não consegui copiar. Use Baixar arquivo.'); }
  }
  function baixarArquivo() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([textoMapa()], { type: 'text/plain;charset=utf-8' }));
    a.download = `mapa-do-fluxo-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  if (!mapa) return <div ref={area} className="mapa-carregando">Carregando o mapa...</div>;

  const porId = Object.fromEntries(mapa.nos.map((n) => [n.id, n]));
  const noSel = sel?.tipo === 'no' ? porId[sel.id] : null;
  const ligSel = sel?.tipo === 'lig' ? mapa.ligacoes.find((l) => l.id === sel.id) : null;
  const qtdComent = (id) => mapa.comentarios.filter((c) => c.no === id).length;
  const nosVis = mapa.nos.filter((n) => vis.has(n.id));
  const ligVis = mapa.ligacoes.filter((l) => vis.has(l.de) && vis.has(l.para) && (tudo || !l.botao || abertos.has(`${l.de}:${l.botao}`)));
  const botoesDe = (id) => new Set(mapa.ligacoes.filter((l) => l.de === id && l.botao).map((l) => l.botao));
  const abertosDe = (id) => new Set([...abertos].filter((c) => c.startsWith(`${id}:`)).map((c) => c.slice(id.length + 1)));
  const largura = Math.max(0, ...Object.values(pos).map((p) => p.x)) + LARG + 400;
  const alturaSvg = Math.max(0, ...Object.values(pos).map((p) => p.y)) + 3000;

  return (
    <div className={`mapa ${cheia ? 'cheia' : ''}`}>
      <header className="mapa-topo">
        <div className="mapa-titulo">
          <b>Mapa do fluxo</b>
          <span className={`mapa-status ${status === 'Salvo' ? 'ok' : ''}`}>{status}</span>
        </div>
        <div className="mapa-acoes">
          <button type="button" className={tudo ? 'ativo' : ''} onClick={() => setTudo((v) => !v)}>{tudo ? 'Mostrar passo a passo' : 'Abrir tudo'}</button>
          {!tudo && abertos.size > 0 && <button type="button" onClick={voltarPasso}>Voltar um passo</button>}
          {!tudo && (abertos.size > 0 || forcados.size > 0) && <button type="button" onClick={() => { setAbertos(new Set()); setForcados(new Set()); }}>Fechar tudo</button>}
          <button type="button" onClick={() => novaCaixa('passo')}>+ Caixa</button>
          <button type="button" onClick={() => novaCaixa('mudanca')}>+ Mudança</button>
          <button type="button" className={telas ? 'ativo' : ''} onClick={() => setTelas((v) => !v)}>{telas ? 'Esconder telas' : 'Mostrar telas'}</button>
          <button type="button" onClick={() => zoom(0.85)} aria-label="Diminuir">−</button>
          <button type="button" onClick={() => zoom(1.15)} aria-label="Aumentar">+</button>
          <button type="button" onClick={ajustar}>Centralizar</button>
          <button type="button" onClick={copiarTexto}>Copiar mapa</button>
          <button type="button" onClick={baixarArquivo}>Baixar arquivo</button>
          <button type="button" onClick={telaCheia}>Tela cheia</button>
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
            <svg className="mapa-setas" width={largura} height={alturaSvg}>
              <defs>
                <marker id="ponta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" className="ponta" />
                </marker>
                <marker id="ponta-sel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" className="ponta-sel" />
                </marker>
              </defs>
              {ligVis.map((l) => {
                const a = pos[l.de] && { ...porId[l.de], ...pos[l.de] };
                const b = pos[l.para] && { ...porId[l.para], ...pos[l.para] };
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
            {nosVis.map((n) => (
              <div
                key={n.id}
                ref={(el) => { refs.current[n.id] = el; }}
                className={`no t-${n.tipo} ${sel?.tipo === 'no' && sel.id === n.id ? 'sel' : ''}`}
                style={{ left: pos[n.id]?.x ?? 0, top: pos[n.id]?.y ?? 0, width: LARG }}
                onPointerDown={(e) => downNo(e, n)}
              >
                <div className="no-tipo">
                  <span>{TIPOS[n.tipo] || n.tipo}{qtdComent(n.id) > 0 && <span className="no-coment"> · {qtdComent(n.id)} comentário{qtdComent(n.id) > 1 ? 's' : ''}</span>}</span>
                  {fechavel(n) && <button type="button" className="no-fechar" title="Fechar esta tela" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); fecharTela(n.id); }}>Fechar ×</button>}
                </div>
                <b>{n.titulo}</b>
                {mapa.comentarios.filter((c) => c.no === n.id).slice(-2).map((c) => (
                  <div key={c.id} className="no-nota"><b>{c.autor}:</b> {c.texto}</div>
                ))}
                {n.texto && <p>{n.texto}</p>}
                {telas && telaDe(n) && <TelaPrevia tela={telaDe(n)} tem={tudo ? null : botoesDe(n.id)} abertos={abertosDe(n.id)} ir={(k) => ir(n, k)} pular={tudo ? null : pular} />}
              </div>
            ))}
          </div>
          {cheia && (
            <div className="mapa-flutuante">
              {!tudo && abertos.size > 0 && <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={voltarPasso}>Voltar um passo</button>}
              <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={telaCheia}>Sair da tela cheia</button>
            </div>
          )}
          <div className="mapa-dica">Toque nos botões das telas para abrir o próximo caminho. Arraste o fundo para andar. Toque numa caixa para editar ou comentar.</div>
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
                <label htmlFor="m-tela">Tela do app nesta caixa</label>
                <select id="m-tela" value={telaDe(noSel)} onChange={(e) => editarNo(noSel.id, { tela: e.target.value })}>
                  <option value="">Nenhuma (mostrar o texto)</option>
                  {Object.entries(TELAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
                <label htmlFor="m-autor">Seu nome</label>
                <input id="m-autor" value={autor} placeholder="Para saberem quem comentou" onChange={(e) => mudarAutor(e.target.value)} />
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

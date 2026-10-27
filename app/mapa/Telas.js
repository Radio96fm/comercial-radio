import FLUXO from '@/lib/fluxoTelas.json';

// Fotos das telas reais do app do vendedor (public/fluxo), com os botões marcados
// por cima. Botão com seta abre o próximo caminho; Voltar e o menu de baixo só
// levam a vista até a tela correspondente.

export const TELAS = Object.fromEntries(Object.entries(FLUXO.telas).map(([k, v]) => [k, v.titulo]));
export const telaDe = (n) => (FLUXO.telas[n.tela] ? n.tela : '');
export const proporcao = (tela) => FLUXO.telas[tela]?.prop || 0;

export default function TelaPrevia({ tela, tem, abertos, ir, pular }) {
  const t = FLUXO.telas[tela];
  if (!t) return null;
  return (
    <div className="tl-foto" style={{ aspectRatio: `1 / ${t.prop}` }}>
      <img src={t.img} alt={`Tela: ${t.titulo}`} loading="lazy" draggable={false} />
      {t.hots.map((h, i) => {
        if (h.pula ? !pular : !tem?.has(h.k)) return null;
        const aberto = !h.pula && abertos?.has(h.k);
        return (
          <button
            key={i}
            type="button"
            className={`tl-hot ${h.pula ? 'pula' : ''} ${aberto ? 'aberto' : ''}`}
            style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%` }}
            title={h.pula ? `Ir até: ${FLUXO.telas[h.pula]?.titulo || h.t}` : `${aberto ? 'Fechar' : 'Abrir'}: ${h.t}`}
            aria-label={h.t}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); if (h.pula) pular(h.pula); else ir(h.k); }}
          />
        );
      })}
    </div>
  );
}

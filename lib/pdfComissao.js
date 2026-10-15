import 'server-only';
import React from 'react';
import { readFileSync } from 'fs';
import path from 'path';
import { Document, Page, View, Text, Image, StyleSheet, Font, renderToBuffer } from '@react-pdf/renderer';
import { data, moeda } from '@/lib/format';
import { mesLongo } from '@/lib/financeiro';

// PDF do relatório de comissão que o financeiro manda para o vendedor emitir a nota
const h = React.createElement;
Font.registerHyphenationCallback((p) => [p]);
const logo = (f) => { try { return readFileSync(path.join(process.cwd(), 'public', 'logos', f)); } catch { return null; } };

const s = StyleSheet.create({
  pagina: { paddingVertical: 30, paddingHorizontal: 34, fontSize: 9.5, fontFamily: 'Helvetica', color: '#16181d' },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#d6d9e0', paddingBottom: 12, marginBottom: 16 },
  logos: { flexDirection: 'row', alignItems: 'center' },
  logo: { height: 34, marginRight: 12 },
  titulo: { fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  sub: { fontSize: 9, color: '#5b6070', textAlign: 'right', marginTop: 2 },
  quadro: { flexDirection: 'row', marginBottom: 16 },
  caixa: { flex: 1, backgroundColor: '#f2f4f8', borderRadius: 6, padding: 10, marginRight: 8 },
  caixaUlt: { flex: 1, backgroundColor: '#dfe7ff', borderRadius: 6, padding: 10 },
  rot: { fontSize: 8, color: '#5b6070', marginBottom: 3 },
  val: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  valG: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#1b2b6b' },
  th: { flexDirection: 'row', backgroundColor: '#16181d', color: '#fff', paddingVertical: 5, paddingHorizontal: 6, fontFamily: 'Helvetica-Bold', fontSize: 8.5 },
  tr: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.6, borderColor: '#e2e5ec' },
  tot: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 6, fontFamily: 'Helvetica-Bold', backgroundColor: '#f2f4f8' },
  aviso: { marginTop: 18, padding: 12, borderWidth: 1, borderColor: '#9db8ff', borderRadius: 6, lineHeight: 1.25 },
  rodape: { position: 'absolute', bottom: 20, left: 34, right: 34, fontSize: 7.5, color: '#8a8f9c', flexDirection: 'row', justifyContent: 'space-between' },
});
const COLS = [['Cliente', 3], ['Contrato', 1], ['Parcela', 0.9], ['Pago em', 1.2], ['Valor recebido', 1.5], ['Comissão', 1.4]];
const cel = (txt, i, extra) => h(Text, { key: i, style: [{ flex: COLS[i][1], textAlign: i >= 4 ? 'right' : 'left' }, extra] }, txt);

export function relatorioComissaoPdf(v, per) {
  const l96 = logo('96fm.png');
  const lAgro = logo('agro.png');
  const etapa = v.pago ? `Paga em ${data(v.pago.pago_em)}` : v.nf?.nf_em ? `Nota fiscal ${v.nf.nf_numero || ''} recebida em ${data(v.nf.nf_em)}` : 'Aguardando nota fiscal';
  const doc = h(Document, { title: `Comissão ${v.nome} ${per.faixa}` },
    h(Page, { size: 'A4', style: s.pagina },
      h(View, { style: s.topo },
        h(View, { style: s.logos }, l96 && h(Image, { src: l96, style: s.logo }), lAgro && h(Image, { src: lAgro, style: s.logo })),
        h(View, null,
          h(Text, { style: s.titulo }, 'Relatório de comissão'),
          h(Text, { style: s.sub }, per.mes ? `Fechamento de ${mesLongo(per.mes)}` : 'Período escolhido'),
          h(Text, { style: s.sub }, `Pagamentos de ${per.faixa}`))),
      h(View, { style: s.quadro },
        h(View, { style: s.caixa }, h(Text, { style: s.rot }, 'Vendedor'), h(Text, { style: s.val }, v.nome), v.documento ? h(Text, { style: { fontSize: 8, marginTop: 2 } }, `CPF/CNPJ ${v.documento}`) : null),
        h(View, { style: s.caixa }, h(Text, { style: s.rot }, 'Recebido dos clientes'), h(Text, { style: s.val }, moeda(v.recebido)), h(Text, { style: { fontSize: 8, marginTop: 2 } }, `${v.itens.length} parcela(s)`)),
        h(View, { style: s.caixaUlt }, h(Text, { style: s.rot }, `Comissão (${String(v.pct).replace('.', ',')}%)`), h(Text, { style: s.valG }, moeda(v.comissao)), h(Text, { style: { fontSize: 8, marginTop: 2 } }, etapa))),
      h(View, { style: s.th }, ...COLS.map(([t], i) => cel(t, i))),
      ...v.itens.map((p) => h(View, { key: p.id, style: s.tr, wrap: false },
        cel(p.contrato.cliente_nome, 0), cel(`Nº ${p.contrato.numero}`, 1), cel(`${p.numero}ª${p.contrato.meses ? `/${p.contrato.meses}` : ''}`, 2), cel(data(p.pago_em), 3), cel(moeda(p.valor), 4), cel(moeda(p.comissao), 5))),
      v.itens.length ? null : h(View, { style: s.tr }, h(Text, null, 'Nenhuma parcela paga neste período.')),
      h(View, { style: s.tot }, cel('Total', 0), cel('', 1), cel('', 2), cel('', 3), cel(moeda(v.recebido), 4), cel(moeda(v.comissao), 5)),
      h(View, { style: s.aviso },
        h(Text, { style: { fontFamily: 'Helvetica-Bold', marginBottom: 3 } }, `Emita a nota fiscal no valor de ${moeda(v.comissao)}`),
        h(Text, null, 'Envie a nota para o financeiro. O pagamento da comissão é feito depois que a nota fiscal for recebida. Só gera comissão a venda registrada no sistema, sobre as parcelas pagas pelo cliente.')),
      h(View, { style: s.rodape, fixed: true },
        h(Text, null, 'Rádio 96 FM · Rádio do Agro · Financeiro'),
        h(Text, { render: ({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}` }))));
  return renderToBuffer(doc);
}

import { createElement as h } from 'react';
import { moeda } from '@/lib/format';

// PDF da proposta de patrocínio, montado no navegador. Nada é salvo no banco.
export async function gerarPdfProposta(p) {
  const { Document, Page, Text, View, StyleSheet, pdf } = await import('@react-pdf/renderer');
  const st = StyleSheet.create({
    pagina: { padding: 48, fontSize: 11, color: '#1d1b18' },
    titulo: { fontSize: 20, marginBottom: 4 },
    sub: { fontSize: 12, color: '#6b665e', marginBottom: 24 },
    linha: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#d8d3c8', paddingVertical: 8 },
    rot: { width: 150, color: '#6b665e' },
    val: { flex: 1 },
    obs: { marginTop: 20, lineHeight: 1.4 },
    rodape: { position: 'absolute', bottom: 32, left: 48, right: 48, fontSize: 9, color: '#6b665e' },
  });
  const linha = (rot, val) => h(View, { style: st.linha, key: rot }, h(Text, { style: st.rot }, rot), h(Text, { style: st.val }, val));
  const inicio = p.inicio.split('-').reverse().join('/');
  const doc = h(Document, null, h(Page, { size: 'A4', style: st.pagina },
    h(Text, { style: st.titulo }, 'Proposta de patrocínio'),
    h(Text, { style: st.sub }, p.radio),
    linha('Cliente', p.cliente),
    linha('Programa', p.programa),
    linha('Vendedor', p.vendedor),
    linha('Início', inicio),
    linha('Período', `${p.meses} ${p.meses === 1 ? 'mês' : 'meses'}`),
    linha('Valor mensal', moeda(p.valor)),
    linha('Total do período', moeda(p.valor * p.meses)),
    p.obs ? h(Text, { style: st.obs }, p.obs) : null,
    h(Text, { style: st.rodape }, 'Simulação com dados fictícios. Este documento não tem valor de contrato.'),
  ));
  return pdf(doc).toBlob();
}

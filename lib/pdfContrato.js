import 'server-only';
import React from 'react';
import { readFileSync } from 'fs';
import path from 'path';
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer';
import { data, moeda } from '@/lib/format';
import { marcaDaRadio } from '@/lib/marca';
import { nomeEmissora } from '@/lib/contrato';

// PDF do contrato no mesmo formato do contrato usado hoje pela rádio.
const h = React.createElement;
Font.registerHyphenationCallback((palavra) => [palavra]); // não quebra palavras com hífen

function logoDaRadio(arquivo) {
  try {
    return readFileSync(path.join(process.cwd(), 'public', arquivo));
  } catch {
    return null;
  }
}
const s = StyleSheet.create({
  pagina: { paddingVertical: 22, paddingHorizontal: 26, fontSize: 8.6, fontFamily: 'Helvetica', color: '#111' },
  caixa: { borderWidth: 0.8, borderColor: '#333', paddingVertical: 6, paddingHorizontal: 9, marginBottom: 6 },
  linha: { flexDirection: 'row', marginBottom: 1.6 },
  rot: { marginRight: 3 },
  val: { fontFamily: 'Helvetica-Bold' },
  valL: { fontFamily: 'Helvetica-Bold', flex: 1 },
  numero: { textAlign: 'right', fontSize: 14, fontFamily: 'Helvetica-Bold', marginVertical: 4 },
  th: { flexDirection: 'row', borderBottomWidth: 0.8, borderColor: '#333', paddingBottom: 3, marginBottom: 3 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.8, borderColor: '#333', paddingVertical: 3 },
  clausulas: { fontSize: 6, lineHeight: 1.25, marginTop: 6 },
  assin: { flexDirection: 'row', marginTop: 30, paddingLeft: 14 },
  assinBox: { width: 150, marginRight: 50, borderTopWidth: 0.8, borderColor: '#333', paddingTop: 2, alignItems: 'center', fontSize: 7.5 },
});

const L = (rot, val, estilo) => h(View, { style: [s.linha, estilo] }, h(Text, { style: s.rot }, rot), h(Text, { style: s.valL }, val || ''));
const num = (n) => Number(n).toLocaleString('pt-BR');
function dataHora(iso) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
}

export function DocumentoPdf({ c, itens = [], parcelas = [] }) {
  const radio = c.radio || {};
  const cli = c.cliente || {};
  const marca = marcaDaRadio(radio.nome);
  const logo = marca.logo ? logoDaRadio(marca.logo) : null;
  const meses = Number(c.meses);

  const linhas = [];
  if (c.programa) {
    const valor = Number(c.plano?.valor ?? c.programa.valor_cota ?? 0);
    linhas.push({ desc: `Patrocínio ${c.programa.nome}${c.plano && c.plano.nome !== 'Plano comercial' ? ` (${c.plano.nome})` : ''}`, qtd: `${meses} ${meses === 1 ? 'mês' : 'meses'}`, un: valor, total: valor * meses });
  }
  let qtdTotal = 0;
  for (const i of itens) {
    const q = i.quantidade * meses;
    qtdTotal += q;
    linhas.push({ desc: i.descricao.split(' · ')[0], qtd: num(q), un: Number(i.valor_unitario), total: q * Number(i.valor_unitario) });
  }
  const totalContrato = Number(c.valor_mensal) * meses;
  const venc = parcelas.map((p) => `${data(p.vencimento)} ${moeda(p.valor)}`).join('; ');
  const obs = [c.observacoes, venc && `Venc.: ${venc}.`].filter(Boolean).join(' ');

  const col = (w, alinhar = 'left') => ({ width: w, textAlign: alinhar });
  const C = [col('46%'), col('16%', 'center'), col('18%', 'right'), col('20%', 'right')];

  return h(Document, { title: `Contrato ${c.numero} - ${cli.nome || ''}`, author: radio.razao_social || radio.nome },
    h(Page, { size: 'A4', style: s.pagina },
      // emissora
      h(View, { style: [s.caixa, { flexDirection: 'row', alignItems: 'center' }] },
        logo ? h(Image, { src: { data: logo, format: 'png' }, style: { width: 58, marginRight: 12 } }) : null,
        h(View, { style: { flex: 1.25 } },
          L('Emissora:', `${radio.razao_social || nomeEmissora(radio.nome)} - ${nomeEmissora(radio.nome)}`),
          L('CNPJ:', radio.cnpj), L('Endereço:', radio.endereco), L('Cidade-UF:', radio.cidade_uf),
          L('E-mail:', radio.email), L('Usuario:', c.vendedor?.nome)),
        h(View, { style: { flex: 1 } },
          L('Insc. Estadual:', radio.inscricao_estadual), L('CEP:', radio.cep), L('Fone:', radio.telefone),
          L('Fax:', radio.fax), L('Data:', dataHora(c.created_at)))),
      h(Text, { style: s.numero }, `Contrato No. ${c.numero}`),
      // cliente
      h(View, { style: [s.caixa, { flexDirection: 'row' }] },
        h(View, { style: { flex: 1.4 } },
          L('Cliente:', cli.razao_social || cli.nome), L('Nome fantasia:', cli.nome), L('Atividade:', c.segmento?.nome),
          L('Endereço:', cli.endereco), L('Cidade-UF:', cli.cidade), L('Telefone:', cli.telefone), L('E-mail:', cli.email)),
        h(View, { style: { flex: 1 } },
          L('CNPJ:', cli.documento), L('Insc. Estadual:', cli.inscricao_estadual), L('Contato:', cli.contato_nome),
          L('Bairro:', cli.bairro), L('CEP:', cli.cep), L('Fax:', cli.fax))),
      // agência
      h(View, { style: s.caixa },
        h(View, { style: s.th }, h(Text, { style: col('50%') }, 'Nome da agência'), h(Text, { style: col('25%') }, 'CNPJ/CPF'), h(Text, { style: col('25%') }, 'Contato')),
        h(View, { style: { flexDirection: 'row' } },
          h(Text, { style: [s.val, col('50%')] }, c.agencia_nome || c.vendedor?.nome || ''),
          h(Text, { style: [s.val, col('25%')] }, c.agencia_documento || ''),
          h(Text, { style: [s.val, col('25%')] }, c.agencia_contato || ''))),
      // vigência e observações
      h(View, { style: s.caixa },
        h(View, { style: { flexDirection: 'row' } },
          L('Autorização:', c.autorizacao, { width: '30%' }), L('Nº PI:', c.numero_pi, { width: '28%' }),
          L('Vigência:', `Entre ${data(c.data_inicio)} e ${data(c.data_fim)}`, { width: '42%' })),
        h(View, { style: { flexDirection: 'row' } },
          L('Campanha:', c.campanha || 'Institucional', { width: '58%' }), L('Produto:', c.produto || 'Institucional', { width: '42%' })),
        L('Observações:', obs)),
      // serviço
      h(View, { style: s.caixa },
        h(View, { style: s.th }, ...['Serviço', 'Qtde.', 'Valor Un.', 'Valor Total'].map((t, i) => h(Text, { key: t, style: C[i] }, t))),
        ...linhas.map((l, i) => h(View, { key: i, style: s.tr },
          h(Text, { style: [s.val, C[0]] }, l.desc), h(Text, { style: [s.val, C[1]] }, l.qtd),
          h(Text, { style: [s.val, C[2]] }, moeda(l.un)), h(Text, { style: [s.val, C[3]] }, moeda(l.total)))),
        h(View, { style: [s.tr, { borderBottomWidth: 0 }] },
          h(Text, { style: [s.val, C[0]] }, 'Totalizações'), h(Text, { style: [s.val, C[1]] }, qtdTotal ? num(qtdTotal) : ''),
          h(Text, { style: C[2] }, ''), h(Text, { style: [s.val, C[3]] }, moeda(totalContrato)))),
      // cláusulas fixas
      h(Text, { style: s.clausulas }, c.conteudo_gerado || ''),
      h(View, { style: s.assin, wrap: false },
        h(Text, { style: s.assinBox }, 'Rádio'),
        h(Text, { style: s.assinBox }, 'Assinatura Cliente'))));
}

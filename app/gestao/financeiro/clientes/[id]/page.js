import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Phone, Mail, MapPin, ArrowLeft, Send } from 'lucide-react';
import { requireFinanceiro } from '@/lib/auth';
import { radioAtual } from '@/lib/radio';
import { data, moeda, hojeISO, linkWhatsApp, STATUS_CONTRATO } from '@/lib/format';
import ParcelaItem from '../../ParcelaItem';

const COR = { pendente: 'b-amarelo', ativo: 'b-verde', encerrado: 'b-cinza', cancelado: 'b-vermelho' };
const soma = (l) => l.reduce((s, p) => s + Number(p.valor), 0);

// Ficha financeira do cliente: contatos, contratos e todas as parcelas
export default async function ExtratoCliente({ params }) {
  const { supabase, baseFin } = await requireFinanceiro();
  const { radio } = await radioAtual(supabase);
  const hoje = hojeISO();
  const [{ data: cli }, { data: contratos }] = await Promise.all([
    supabase.from('clientes').select('id, nome, razao_social, documento, contato_nome, telefone, email, endereco, cidade, observacoes, vendedor:profiles!clientes_vendedor_id_fkey(nome)').eq('id', params.id).maybeSingle(),
    supabase.from('contratos')
      .select('id, numero, status, data_inicio, data_fim, valor_mensal, meses, dia_vencimento, vendedor:profiles(nome), programa:programas(nome), radio:radios(nome), parcelas(id, numero, vencimento, valor, status, pago_em, url_boleto, linha_digitavel)')
      .eq('cliente_id', params.id).eq('radio_id', radio?.id).order('created_at', { ascending: false }),
  ]);
  if (!cli) notFound();

  const lista = (contratos || []).map((c) => ({ ...c, parcelas: (c.parcelas || []).filter((p) => p.status !== 'cancelado').sort((a, b) => a.numero - b.numero) }));
  const todas = lista.filter((c) => c.status !== 'cancelado').flatMap((c) => c.parcelas);
  const pagas = todas.filter((p) => p.status === 'pago');
  const abertas = todas.filter((p) => ['a_emitir', 'emitido'].includes(p.status));
  const atrasadas = abertas.filter((p) => p.vencimento < hoje);
  const contratado = lista.filter((c) => c.status !== 'cancelado').reduce((s, c) => s + Number(c.valor_mensal) * c.meses, 0);

  // mensagem com tudo o que está em aberto (para mandar de uma vez)
  const primeiro = cli.contato_nome?.split(' ')[0] || cli.nome;
  const msgExtrato = [
    `Olá, ${primeiro}! Tudo bem?`,
    'Aqui é do financeiro da Rádio 96 FM. Segue o resumo das suas parcelas em aberto:',
    ...abertas.sort((a, b) => a.vencimento.localeCompare(b.vencimento)).map((p) => `• ${moeda(p.valor)} com vencimento em ${data(p.vencimento)}${p.vencimento < hoje ? ' (vencida)' : ''}${p.linha_digitavel ? ` · linha digitável: ${p.linha_digitavel}` : p.url_boleto ? ` · boleto: ${p.url_boleto}` : ''}`),
    `Total: ${moeda(soma(abertas))}.`,
    'Qualquer dúvida, é só chamar. Obrigado!',
  ].join('\n');

  return (
    <>
      <Link href={`${baseFin}/clientes`} className="voltar-fin"><ArrowLeft className="ico" />Clientes</Link>
      <div className="cabecalho"><h1>{cli.nome}</h1>{atrasadas.length ? <span className="badge b-vermelho">{atrasadas.length} parcela(s) em atraso</span> : <span className="badge b-verde">Em dia</span>}</div>

      <div className="ficha-cli card">
        <div>
          {cli.razao_social && <div><b>{cli.razao_social}</b></div>}
          <div className="muted">{[cli.documento && `CNPJ/CPF ${cli.documento}`, cli.vendedor?.nome && `Vendedor: ${cli.vendedor.nome}`].filter(Boolean).join(' · ')}</div>
          {cli.contato_nome && <div>Contato: {cli.contato_nome}</div>}
          <div className="ficha-contatos">
            {cli.telefone && <a href={`tel:${cli.telefone.replace(/\D/g, '')}`}><Phone className="ico" />{cli.telefone}</a>}
            {cli.email && <a href={`mailto:${cli.email}`}><Mail className="ico" />{cli.email}</a>}
            {(cli.endereco || cli.cidade) && <span><MapPin className="ico" />{[cli.endereco, cli.cidade].filter(Boolean).join(', ')}</span>}
          </div>
        </div>
        {cli.telefone && abertas.length > 0 && (
          <a className="btn whats" href={linkWhatsApp(cli.telefone, msgExtrato)} target="_blank" rel="noopener noreferrer"><Send className="ico" />Mandar extrato no WhatsApp</a>
        )}
      </div>

      <div className="fin-cards">
        <div className="card fin-card"><small>Total contratado</small><b className="num">{moeda(contratado)}</b><span className="muted">{lista.filter((c) => c.status !== 'cancelado').length} contrato(s)</span></div>
        <div className="card fin-card"><small>Já pagou</small><b className="num">{moeda(soma(pagas))}</b><span className="muted">{pagas.length} parcela(s)</span></div>
        <div className="card fin-card"><small>Em aberto</small><b className="num">{moeda(soma(abertas))}</b><span className="muted">{abertas.length} parcela(s)</span></div>
        <div className={`card fin-card ${atrasadas.length ? 'perigo' : ''}`}><small>Em atraso</small><b className="num">{moeda(soma(atrasadas))}</b><span className="muted">{atrasadas.length} parcela(s)</span></div>
      </div>

      {cli.observacoes && <div className="alerta info"><b>Anotações do vendedor:</b> {cli.observacoes}</div>}

      {!lista.length && <div className="vazio">Este cliente ainda não tem contrato.</div>}
      {lista.map((c) => (
        <section key={c.id} className="contrato-fin">
          <div className="secao-titulo">
            <h2>Contrato Nº {c.numero} <span className={`badge ${COR[c.status]}`}>{STATUS_CONTRATO[c.status]}</span></h2>
            <span className="muted">{moeda(c.valor_mensal)} x {c.meses} · {data(c.data_inicio)} a {data(c.data_fim)}</span>
          </div>
          <p className="muted" style={{ marginTop: -6 }}>{c.programa?.nome || 'Pacote avulso'} · {c.radio?.nome} · vendedor {c.vendedor?.nome} · vence todo dia {c.dia_vencimento}</p>
          {!c.parcelas.length ? <div className="vazio">Sem parcelas.</div> : (
            <div className="lista">
              {c.parcelas.map((p) => <ParcelaItem key={p.id} p={{ ...p, contrato: { ...c, cliente: cli } }} hoje={hoje} semContrato />)}
            </div>
          )}
        </section>
      ))}
    </>
  );
}

import Link from 'next/link';
import { requireFinanceiro } from '@/lib/auth';
import { mensagemCobranca } from '@/lib/financeiro';
import { data, moeda, STATUS_PARCELA, hojeISO, somarDias, linkWhatsApp } from '@/lib/format';
import Filtros from '../Filtros';
import EnviarTodos from './EnviarTodos';
import { radioFin } from '@/lib/radioFin';

export default async function Cobranca({ searchParams }) {
  const { supabase, baseFin } = await requireFinanceiro();
  const vend = searchParams?.vendedor || '';
  const hoje = hojeISO();
  let q = supabase.from('parcelas')
    .select('id, numero, vencimento, valor, status, url_boleto, linha_digitavel, contrato:contratos!inner(numero, status, vendedor_id, cliente:clientes(id, nome, contato_nome, telefone), vendedor:profiles(nome), radio:radios(nome))')
    .in('contrato.status', ['ativo', 'pendente']).in('status', ['a_emitir', 'emitido'])
    .lte('vencimento', somarDias(hoje, 31)).order('vencimento');
  if (vend) q = q.eq('contrato.vendedor_id', vend);
  if (radioFin()) q = q.eq('contrato.radio_id', radioFin());
  const [{ data: parcelas }, { data: vendedores }] = await Promise.all([
    q, supabase.from('profiles').select('id, nome').in('papel', ['vendedor', 'gestor', 'comercial']).order('nome'),
  ]);
  const lista = parcelas || [];
  const comFone = lista.filter((p) => p.contrato?.cliente?.telefone);
  const links = comFone.map((p) => ({ nome: p.contrato.cliente.nome, url: linkWhatsApp(p.contrato.cliente.telefone, mensagemCobranca(p)) }));

  return (
    <>
      <div className="cabecalho"><h1>Cobrança do mês</h1><span className="muted">{lista.length} parcelas · {moeda(lista.reduce((s, p) => s + Number(p.valor), 0))}</span></div>
      <p className="muted">Parcelas em atraso e as que vencem nos próximos 30 dias. Mande a cobrança para cada cliente pelo WhatsApp, com o valor, o vencimento e o boleto.</p>
      <Filtros vendedores={vendedores || []} sp={searchParams} semPeriodo />
      <EnviarTodos links={links} />
      {lista.length > comFone.length && <div className="alerta aviso">{lista.length - comFone.length} cliente(s) sem telefone cadastrado.</div>}
      {!lista.length ? <div className="vazio">Nada para cobrar agora.</div> : (
        <div className="lista">
          {lista.map((p) => {
            const atrasada = p.vencimento < hoje;
            const cli = p.contrato?.cliente;
            return (
              <div key={p.id} className="item">
                <div className="info">
                  <div className="nome"><Link href={`${baseFin}/clientes/${cli?.id}`}>{cli?.nome}</Link></div>
                  <div className="det">{p.numero}ª parcela · {moeda(p.valor)} · {p.contrato?.vendedor?.nome}</div>
                  <div className="det" style={{ color: atrasada ? 'var(--vermelho)' : undefined }}>Vence {data(p.vencimento)}{atrasada ? ' · EM ATRASO' : ''} · {STATUS_PARCELA[p.status]}{!p.url_boleto && !p.linha_digitavel ? ' · sem boleto anexado' : ''}</div>
                </div>
                {cli?.telefone && <a className="btn peq whats" href={linkWhatsApp(cli.telefone, mensagemCobranca(p))} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

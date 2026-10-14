import Link from 'next/link';
import { requireGestor } from '@/lib/auth';
import BotaoEnviar from '@/components/BotaoEnviar';
import { mudarStatusParcela } from '../actions';
import { data, moeda, STATUS_PARCELA, hojeISO, somarDias } from '@/lib/format';

const COR = { a_emitir: 'b-amarelo', emitido: 'b-azul', pago: 'b-verde', cancelado: 'b-cinza' };

export default async function Parcelas({ searchParams }) {
  const { supabase } = await requireGestor();
  const filtro = searchParams?.f || 'proximas';
  const hoje = hojeISO();

  let q = supabase
    .from('parcelas')
    .select('id, numero, vencimento, valor, status, contrato:contratos!inner(id, numero, status, cliente:clientes(nome, telefone), vendedor:profiles(nome))')
    .in('contrato.status', ['pendente', 'ativo'])
    .order('vencimento')
    .limit(300);
  if (filtro === 'proximas') q = q.in('status', ['a_emitir', 'emitido']).lte('vencimento', somarDias(hoje, 45));
  if (filtro === 'atrasadas') q = q.in('status', ['a_emitir', 'emitido']).lt('vencimento', hoje);
  if (filtro === 'pagas') q = q.eq('status', 'pago');
  const { data: parcelas } = await q;

  const Filtro = ({ k, t }) => <Link className={`btn peq ${filtro === k ? '' : 'sec'}`} href={`/gestao/parcelas?f=${k}`}>{t}</Link>;

  return (
    <>
      <div className="cabecalho"><h1>Parcelas / boletos</h1></div>
      <div className="alerta info">
        🏦 Próxima etapa: integração com o banco/plataforma de cobrança para gerar o boleto e dar baixa automaticamente.
        Por enquanto, marque aqui quando o boleto for emitido e quando for pago.
      </div>
      <div className="acoes" style={{ marginBottom: 14 }}>
        <Filtro k="proximas" t="Próximos 45 dias" />
        <Filtro k="atrasadas" t="Atrasadas" />
        <Filtro k="pagas" t="Pagas" />
        <Filtro k="todas" t="Todas" />
      </div>
      <div className="tabela">
        <table>
          <thead><tr><th>Vencimento</th><th>Cliente</th><th>Contrato</th><th>Parcela</th><th>Valor</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            {!parcelas?.length && <tr><td colSpan={7} className="muted">Nenhuma parcela.</td></tr>}
            {(parcelas || []).map((p) => (
              <tr key={p.id}>
                <td style={{ color: p.vencimento < hoje && p.status !== 'pago' ? 'var(--vermelho)' : undefined }}><b>{data(p.vencimento)}</b></td>
                <td>{p.contrato?.cliente?.nome}<br /><small>{p.contrato?.vendedor?.nome}</small></td>
                <td><Link href={`/app/contratos/${p.contrato?.id}`}>Nº {p.contrato?.numero}</Link></td>
                <td>{p.numero}</td>
                <td>{moeda(p.valor)}</td>
                <td><span className={`badge ${COR[p.status]}`}>{STATUS_PARCELA[p.status]}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {p.status === 'a_emitir' && (
                    <form action={mudarStatusParcela} className="inline">
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="emitido" />
                      <BotaoEnviar className="btn peq sec" texto="Emitido" enviando="..." />
                    </form>
                  )}{' '}
                  {p.status !== 'pago' && (
                    <form action={mudarStatusParcela} className="inline">
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="pago" />
                      <BotaoEnviar className="btn peq verde" texto="Pago" enviando="..." />
                    </form>
                  )}
                  {p.status === 'pago' && (
                    <form action={mudarStatusParcela} className="inline">
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="emitido" />
                      <BotaoEnviar className="btn peq cinza" texto="Desfazer" enviando="..." />
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

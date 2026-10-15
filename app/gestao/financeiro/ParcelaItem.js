import Link from 'next/link';
import BotaoEnviar from '@/components/BotaoEnviar';
import FormAcao from '@/components/FormAcao';
import { mensagemCobranca } from '@/lib/financeiro';
import { data, moeda, STATUS_PARCELA, linkWhatsApp } from '@/lib/format';
import { mudarParcela, salvarBoleto, emitirBoletoAcao } from './actions';

const COR = { a_emitir: 'b-amarelo', emitido: 'b-azul', pago: 'b-verde', cancelado: 'b-cinza' };

// Uma parcela com as ações do financeiro (baixa, boleto, WhatsApp)
export default function ParcelaItem({ p, hoje, baseFin, semContrato }) {
  const atrasada = p.status !== 'pago' && p.status !== 'cancelado' && p.vencimento < hoje;
  const cli = p.contrato?.cliente;
  return (
    <details className="item parcela-fin">
      <summary>
        <div className="info">
          <div className="nome">{cli?.id && baseFin ? <Link href={`${baseFin}/clientes/${cli.id}`}>{cli.nome}</Link> : cli?.nome} · {p.numero}ª parcela</div>
          {!semContrato && <div className="det">Contrato Nº {p.contrato?.numero} · {p.contrato?.vendedor?.nome} · {p.contrato?.radio?.nome}</div>}
          <div className="det" style={{ color: atrasada ? 'var(--vermelho)' : undefined }}>
            Vence {data(p.vencimento)}{atrasada ? ' · EM ATRASO' : ''}{p.pago_em ? ` · pago em ${data(p.pago_em)}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <b className="num">{moeda(p.valor)}</b><br />
          <span className={`badge ${atrasada ? 'b-vermelho' : COR[p.status]}`}>{atrasada ? 'Em atraso' : STATUS_PARCELA[p.status]}</span>
        </div>
      </summary>
      <div className="parcela-acoes">
        {p.status !== 'pago' && (
          <form action={mudarParcela} className="inline-pago">
            <input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="pago" />
            <input type="date" name="pago_em" defaultValue={hoje} aria-label="Data do pagamento" />
            <BotaoEnviar className="btn peq verde" texto="Marcar como pago" enviando="..." />
          </form>
        )}
        {p.status === 'pago' && (
          <form action={mudarParcela}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="emitido" />
            <BotaoEnviar className="btn peq cinza" texto="Desfazer pagamento" enviando="..." /></form>
        )}
        {p.status === 'a_emitir' && (
          <FormAcao action={emitirBoletoAcao}><input type="hidden" name="id" value={p.id} /><BotaoEnviar className="btn peq" texto="Emitir boleto" enviando="Emitindo..." /></FormAcao>
        )}
        {p.status !== 'pago' && cli?.telefone && (
          <a className="btn peq whats" href={linkWhatsApp(cli.telefone, mensagemCobranca(p))} target="_blank" rel="noopener noreferrer">Mandar no WhatsApp</a>
        )}
        {p.status !== 'pago' && (
          <FormAcao action={salvarBoleto} className="boleto-manual">
            <input type="hidden" name="id" value={p.id} />
            <input name="url_boleto" defaultValue={p.url_boleto || ''} placeholder="Link do boleto (se emitiu no banco)" />
            <input name="linha_digitavel" defaultValue={p.linha_digitavel || ''} placeholder="Linha digitável" />
            <BotaoEnviar className="btn peq sec" texto="Salvar boleto" enviando="..." />
          </FormAcao>
        )}
      </div>
    </details>
  );
}

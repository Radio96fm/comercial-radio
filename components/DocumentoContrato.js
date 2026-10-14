import { data, moeda } from '@/lib/format';
import { marcaDaRadio } from '@/lib/marca';
import { nomeEmissora } from '@/lib/contrato';

// Contrato no mesmo formato do usado hoje pela rádio (cabeçalho da emissora,
// cliente, agência, vigência/observações, serviço e cláusulas fixas).
const L = ({ r, v }) => <div className="l"><span>{r}</span><b>{v || ''}</b></div>;
const num = (n) => Number(n).toLocaleString('pt-BR');

function dataHora(iso) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
}

export default function DocumentoContrato({ c, itens = [], parcelas = [] }) {
  const radio = c.radio || {};
  const cli = c.cliente || {};
  const marca = marcaDaRadio(radio.nome);
  const meses = Number(c.meses);

  // linhas do serviço: quantidade no período todo, valor de tabela
  const linhas = [];
  if (c.programa) {
    const valor = Number(c.plano?.valor ?? c.programa.valor_cota ?? 0);
    linhas.push({ desc: `Patrocínio ${c.programa.nome}${c.plano && c.plano.nome !== 'Plano comercial' ? ` (${c.plano.nome})` : ''}`, qtd: meses, un: valor, total: valor * meses, unidade: 'meses' });
  }
  for (const i of itens) {
    const qtd = i.quantidade * meses;
    linhas.push({ desc: i.descricao.split(' · ')[0], qtd, un: Number(i.valor_unitario), total: qtd * Number(i.valor_unitario) });
  }
  const totalTabela = linhas.reduce((s, l) => s + l.total, 0);
  const totalContrato = Number(c.valor_mensal) * meses;
  const desconto = Math.round((totalTabela - totalContrato) * 100) / 100;
  const qtdTotal = linhas.filter((l) => !l.unidade).reduce((s, l) => s + l.qtd, 0);

  const venc = parcelas.map((p) => `${data(p.vencimento)} ${moeda(p.valor)}`).join('; ');
  const obs = [c.observacoes, venc && `Venc.: ${venc}.`].filter(Boolean).join(' ');

  return (
    <div className="doc-rolagem">
      <article className="doc-contrato">
        <section className="caixa cab">
          {marca.logo && <img src={marca.logo} alt="" className="logo" />}
          <div className="col">
            <L r="Emissora:" v={`${radio.razao_social || nomeEmissora(radio.nome)} - ${nomeEmissora(radio.nome)}`} />
            <L r="CNPJ:" v={radio.cnpj} />
            <L r="Endereço:" v={radio.endereco} />
            <L r="Cidade-UF:" v={radio.cidade_uf} />
            <L r="E-mail:" v={radio.email} />
            <L r="Usuario:" v={c.vendedor?.nome} />
          </div>
          <div className="col dir">
            <L r="Insc. Estadual:" v={radio.inscricao_estadual} />
            <L r="CEP:" v={radio.cep} />
            <L r="Fone:" v={radio.telefone} />
            <L r="Fax:" v={radio.fax} />
            <L r="Data:" v={dataHora(c.created_at)} />
          </div>
        </section>
        <div className="numero">Contrato No. {c.numero}</div>

        <section className="caixa duas">
          <div className="col">
            <L r="Cliente:" v={cli.razao_social || cli.nome} />
            <L r="Nome fantasia:" v={cli.nome} />
            <L r="Atividade:" v={c.segmento?.nome} />
            <L r="Endereço:" v={cli.endereco} />
            <L r="Cidade-UF:" v={cli.cidade} />
            <L r="Telefone:" v={cli.telefone} />
            <L r="E-mail:" v={cli.email} />
          </div>
          <div className="col dir">
            <L r="CNPJ:" v={cli.documento} />
            <L r="Insc. Estadual:" v={cli.inscricao_estadual} />
            <L r="Contato:" v={cli.contato_nome} />
            <L r="Bairro:" v={cli.bairro} />
            <L r="CEP:" v={cli.cep} />
            <L r="Fax:" v={cli.fax} />
          </div>
        </section>

        <section className="caixa">
          <table className="t-agencia">
            <thead><tr><th>Nome da agência</th><th>CNPJ/CPF</th><th>Contato</th></tr></thead>
            <tbody><tr><td><b>{c.agencia_nome || c.vendedor?.nome}</b></td><td><b>{c.agencia_documento || ''}</b></td><td><b>{c.agencia_contato || ''}</b></td></tr></tbody>
          </table>
        </section>

        <section className="caixa">
          <div className="tres">
            <L r="Autorização:" v={c.autorizacao} />
            <L r="Nº PI:" v={c.numero_pi} />
            <L r="Vigência:" v={`Entre ${data(c.data_inicio)} e ${data(c.data_fim)}`} />
          </div>
          <div className="tres">
            <L r="Campanha:" v={c.campanha} />
            <span />
            <L r="Produto:" v={c.produto} />
          </div>
          <L r="Observações:" v={obs} />
        </section>

        <section className="caixa">
          <table className="t-servico">
            <thead><tr><th>Serviço</th><th>Qtde.</th><th>Valor Un.</th><th>Valor Total</th></tr></thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={i}><td><b>{l.desc}</b></td><td><b>{num(l.qtd)}{l.unidade ? ` ${l.unidade}` : ''}</b></td><td><b>{moeda(l.un)}</b></td><td><b>{moeda(l.total)}</b></td></tr>
              ))}
              {desconto > 0.009 && <tr><td><b>Desconto negociado</b></td><td /><td /><td><b>- {moeda(desconto)}</b></td></tr>}
              <tr className="tot"><td><b>Totalizações</b></td><td><b>{qtdTotal ? num(qtdTotal) : ''}</b></td><td /><td><b>{moeda(totalContrato)}</b></td></tr>
            </tbody>
          </table>
        </section>

        <section className="clausulas">{c.conteudo_gerado || ''}</section>

        <div className="assinaturas">
          <div><span />Rádio</div>
          <div><span />Assinatura Cliente</div>
        </div>
      </article>
    </div>
  );
}

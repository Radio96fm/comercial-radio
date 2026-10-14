import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import { salvarMeusDados } from '../actions';

export default async function MeusDados({ searchParams }) {
  const { perfil } = await getSessao();
  const voltar = typeof searchParams?.voltar === 'string' ? searchParams.voltar : '';
  return (
    <>
      <Topo titulo="Meus dados" voltar={voltar || '/app'} />
      <main className="conteudo">
        <p className="muted" style={{ marginTop: 0 }}>Esses dados saem nos seus contratos, no campo "Nome da agência". Preencha uma vez só.</p>
        <FormAcao action={salvarMeusDados}>
          <input type="hidden" name="voltar" value={voltar} />
          <div className="campo"><label>Nome completo *</label><input name="nome" defaultValue={perfil.nome} required autoComplete="name" /></div>
          <div className="campo"><label>CPF (ou CNPJ)</label><input name="documento" inputMode="numeric" defaultValue={perfil.documento || ''} placeholder="000.000.000-00" /></div>
          <div className="campo"><label>Telefone / WhatsApp</label><input name="telefone" type="tel" inputMode="tel" defaultValue={perfil.telefone || ''} placeholder="(64) 90000-0000" /></div>
          <div className="campo"><label>E-mail de acesso</label><input value={perfil.email} disabled /></div>
          <BotaoEnviar className="btn grande" texto="Salvar meus dados" enviando="Salvando..." />
        </FormAcao>
      </main>
    </>
  );
}

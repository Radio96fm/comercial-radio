import { requireGestor } from '@/lib/auth';
import Duvidas from '@/app/app/assistente/Duvidas';

const SUGESTOES = [
  'Quem vendeu mais este mês?',
  'Quais boletos estão em atraso?',
  'Quais contratos vencem nos próximos 60 dias?',
  'Quais programas ainda têm vaga?',
];

export default async function Perguntar() {
  const { supabase } = await requireGestor();
  const { data: ia } = await supabase.rpc('ia_situacao');
  const ligado = !!ia?.provedor && (ia?.chaves || []).includes(ia.provedor);
  return (
    <>
      <div className="cabecalho"><h1>Perguntar à IA</h1></div>
      <p className="muted">A IA lê o sistema inteiro na hora (equipe, clientes, contratos, boletos, visitas, programas e preços) e responde. Ela só lê, não muda nada.</p>
      <div style={{ maxWidth: 820 }}>
        {ligado ? <Duvidas sugestoes={SUGESTOES} /> : <div className="vazio">Ligue a IA em “Treinar assistente” primeiro.</div>}
      </div>
    </>
  );
}

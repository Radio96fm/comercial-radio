import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import FormAcao from '@/components/FormAcao';
import BotaoEnviar from '@/components/BotaoEnviar';
import { mudarStatusVisita, salvarObsVisita } from '../../actions';
import { dataHora, horario, moeda, linkWhatsApp, STATUS_VISITA, hojeISO } from '@/lib/format';

export default async function VisitaPage({ params }) {
  const { supabase, perfil, isGestor } = await getSessao();
  const { data: v } = await supabase
    .from('visitas')
    .select('*, cliente:clientes(*, segmento:segmentos(id, nome)), vendedor:profiles(nome)')
    .eq('id', params.id)
    .maybeSingle();
  if (!v) notFound();

  const hoje = hojeISO();
  const [{ data: programas }, { data: ocupados }] = await Promise.all([
    supabase.from('programas_ocupacao').select('*').eq('ativo', true).gt('cotas_livres', 0).order('radio_nome').order('horario_inicio'),
    supabase
      .from('contratos')
      .select('programa_id')
      .eq('segmento_id', v.cliente.segmento_id)
      .in('status', ['pendente', 'ativo'])
      .lte('data_inicio', hoje)
      .gte('data_fim', hoje),
  ]);
  const bloqueados = new Set((ocupados || []).map((c) => c.programa_id));
  const disponiveis = (programas || []).filter((p) => !bloqueados.has(p.id));
  const porRadio = {};
  disponiveis.forEach((p) => {
    porRadio[p.radio_nome] = porRadio[p.radio_nome] || { cor: p.radio_cor, itens: [] };
    porRadio[p.radio_nome].itens.push(p);
  });

  const podeEditar = isGestor || v.vendedor_id === perfil.id;
  const aberta = v.status === 'em_andamento' || v.status === 'proposta';

  return (
    <>
      <Topo titulo={v.cliente.nome} voltar="/app/visitas" />
      <main className="conteudo">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <h1 style={{ marginBottom: 2 }}>{v.cliente.nome}</h1>
              <div className="muted">{v.cliente.segmento?.nome}{v.cliente.cidade ? ` · ${v.cliente.cidade}` : ''}</div>
            </div>
            <span className="badge b-azul">{STATUS_VISITA[v.status]}</span>
          </div>
          <p style={{ marginTop: 10 }}>
            Visitado por <b>{v.vendedor_id === perfil.id ? 'você' : v.vendedor?.nome}</b> · {dataHora(v.iniciada_em)}
          </p>
          {v.cliente.contato_nome && <div>{v.cliente.contato_nome}</div>}
          {v.cliente.telefone && (
            <div className="acoes" style={{ marginTop: 10 }}>
              <a className="btn peq sec" href={`tel:${v.cliente.telefone.replace(/\D/g, '')}`}>Ligar</a>
              <a className="btn peq whats" href={linkWhatsApp(v.cliente.telefone, '')} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            </div>
          )}
          <div style={{ marginTop: 10 }}><Link href={`/app/clientes/${v.cliente.id}`}>Ver ficha completa do cliente ›</Link></div>
        </div>

        {podeEditar && aberta && (
          <Link className="btn grande sec" style={{ marginBottom: 14 }} href={`/app/contratos/novo?cliente=${v.cliente.id}&visita=${v.id}`}>
            Montar pacote personalizado
          </Link>
        )}

        <div className="secao-titulo"><h2>Programas que este cliente pode patrocinar</h2></div>
        <p className="muted">
          Já filtrado: só aparecem programas com vaga e sem outro patrocinador do segmento <b>{v.cliente.segmento?.nome}</b>.
        </p>
        {!disponiveis.length && <div className="vazio">Nenhum programa disponível para este segmento no momento.</div>}
        {Object.entries(porRadio).map(([radio, g]) => (
          <div key={radio} style={{ marginBottom: 14 }}>
            <h3 style={{ color: g.cor }}>{radio}</h3>
            <div className="lista">
              {g.itens.map((p) => (
                <div key={p.id} className="item">
                  <div className="info">
                    <div className="nome">{p.nome}</div>
                    <div className="det">{p.dias}{horario(p) ? ` · ${horario(p)}` : ''}</div>
                    <div className="det">{moeda(p.valor_cota)}/mês · {p.cotas_livres} vaga{p.cotas_livres > 1 ? 's' : ''}</div>
                  </div>
                  {podeEditar && aberta && (
                    <Link className="btn peq verde" href={`/app/contratos/novo?programa=${p.id}&cliente=${v.cliente.id}&visita=${v.id}`}>
                      Fechar
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {podeEditar && (
          <>
            <div className="secao-titulo"><h2>Anotações</h2></div>
            <FormAcao action={salvarObsVisita}>
              <input type="hidden" name="id" value={v.id} />
              <div className="campo"><textarea name="observacoes" defaultValue={v.observacoes || ''} /></div>
              <BotaoEnviar className="btn sec" texto="Salvar anotação" />
            </FormAcao>

            {aberta && (
              <>
                <div className="secao-titulo"><h2>Resultado da visita</h2></div>
                <div className="acoes">
                  {v.status !== 'proposta' && (
                    <form action={mudarStatusVisita}>
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="status" value="proposta" />
                      <BotaoEnviar className="btn grande sec" texto="Enviei proposta" enviando="..." />
                    </form>
                  )}
                  <form action={mudarStatusVisita}>
                    <input type="hidden" name="id" value={v.id} />
                    <input type="hidden" name="status" value="perdido" />
                    <BotaoEnviar className="btn grande cinza" texto="Não fechou" enviando="..." confirmar="Encerrar esta visita como 'não fechou'?" />
                  </form>
                </div>
                <p className="muted" style={{ marginTop: 10 }}>Quando você fecha um contrato a partir desta tela, a visita é marcada como “Fechado” automaticamente.</p>
              </>
            )}
            {!aberta && (
              <form action={mudarStatusVisita} style={{ marginTop: 16 }}>
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="status" value="em_andamento" />
                <BotaoEnviar className="btn sec" texto="Reabrir visita" enviando="..." />
              </form>
            )}
          </>
        )}
      </main>
    </>
  );
}

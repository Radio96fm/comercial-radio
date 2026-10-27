import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import Topo from '@/components/Topo';
import FormAcao from '@/components/FormAcao';
import LimparRascunho from '@/components/LimparRascunho';
import BotaoEnviar from '@/components/BotaoEnviar';
import { ArrowUpRight, Check, FileText, Send } from 'lucide-react';
import { mudarStatusVisita, salvarObsVisita, pedirProrrogacao, aprovarProposta } from '../../actions';
import { marcaDaRadio } from '@/lib/marca';
import { dataHora, linkWhatsApp, STATUS_VISITA } from '@/lib/format';
import { prazoVisita, textoRestam, PRAZO_DIAS, PRAZO_MAXIMO_DIAS } from '@/lib/prazo';

export default async function VisitaPage({ params, searchParams }) {
  const { supabase, perfil, isGestor } = await getSessao();
  const { data: v } = await supabase
    .from('visitas')
    .select('*, cliente:clientes(*, segmento:segmentos(id, nome)), vendedor:profiles(nome)')
    .eq('id', params.id)
    .maybeSingle();
  if (!v) notFound();
  // gestor olhando a visita de outro vendedor: abre a versão só de leitura do painel
  if (isGestor && v.vendedor_id !== perfil.id) redirect(`/gestao/visitas/${v.id}`);

  const [{ data: radiosVisita }, { data: ocupacao }, { data: escolhido }, { data: plano }] = await Promise.all([
    supabase.from('radios').select('id, nome, cor').order('ordem'),
    supabase.from('programas_ocupacao').select('radio_id, cotas_livres').eq('ativo', true),
    v.programa_id ? supabase.from('programas').select('id, nome, radio_id, radio:radios(nome, cor)').eq('id', v.programa_id).maybeSingle() : Promise.resolve({ data: null }),
    v.plano_id ? supabase.from('programa_planos').select('id, nome').eq('id', v.plano_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const livres = {};
  (ocupacao || []).forEach((p) => {
    livres[p.radio_id] = livres[p.radio_id] || { programas: 0, comVaga: 0 };
    livres[p.radio_id].programas += 1;
    if (p.cotas_livres > 0) livres[p.radio_id].comVaga += 1;
  });
  // etapas: 1 rádio e programa, 2 proposta, 3 aprovação, 4 cadastro e contrato
  const etapa = !escolhido ? 1 : !v.proposta_enviada_em ? 2 : !v.proposta_aprovada_em ? 3 : 4;
  const contato = v.contato_nome || v.cliente.contato_nome;
  const telefone = v.contato_telefone || v.cliente.telefone;
  const erro = typeof searchParams?.erro === 'string' ? searchParams.erro : '';

  const podeEditar = isGestor || v.vendedor_id === perfil.id;
  const aberta = v.status === 'em_andamento' || v.status === 'proposta';
  const { data: liberada } = await supabase.from('visitas_liberadas').select('visita_id').eq('visita_id', v.id).maybeSingle();
  const prazo = prazoVisita(v.iniciada_em, v.prazo_extra_dias);
  const total = PRAZO_DIAS + v.prazo_extra_dias;
  const { data: pedidoPendente } = await supabase.from('prorrogacoes').select('id').eq('visita_id', v.id).eq('status', 'pendente').maybeSingle();
  const euNegocio = v.vendedor_id === perfil.id;

  return (
    <>
      <Topo titulo={v.cliente.nome} voltar="/app/visitas" />
      {Date.now() - new Date(v.iniciada_em).getTime() < 5 * 60000 && <LimparRascunho chave="rascunho:nova-visita" />}
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
          {aberta && !liberada && (
            <div className={`prazo-visita ${prazo.vencido ? 'fim' : prazo.avisar ? 'alerta-p' : ''}`}>
              <b>{prazo.vencido ? 'Prazo de exclusividade encerrado' : `Exclusividade: ${textoRestam(prazo.restam)}`}</b>
              <span>
                {prazo.vencido
                  ? 'A empresa está livre para os outros vendedores.'
                  : `Até ${prazo.ate}, só ${euNegocio ? 'você negocia' : `${v.vendedor?.nome} negocia`} com esta empresa (${total} dias a partir da visita). Depois ela fica livre para os outros vendedores.`}
              </span>
              {!prazo.vencido && (
                <i style={{ width: `${Math.min(100, Math.max(4, ((total - prazo.restam) / total) * 100))}%` }} />
              )}
            </div>
          )}
          {aberta && !liberada && prazo.vencido && podeEditar && euNegocio && !pedidoPendente && v.prazo_extra_dias < PRAZO_MAXIMO_DIAS - PRAZO_DIAS && (
            <FormAcao action={pedirProrrogacao} className="renovar-prazo">
              <input type="hidden" name="id" value={v.id} />
              <b>{v.prazo_extra_dias === 0 ? 'Precisa de mais tempo?' : 'Precisa de mais tempo de novo?'}</b>
              <span className="muted">Peça mais 15 dias e explique o motivo. O pedido vai para o comercial analisar, e os dias extras valem quando ele aceitar. O prazo máximo é de 45 dias.</span>
              <div className="campo"><textarea name="motivo" required minLength={5} placeholder="Motivo do pedido" /></div>
              <BotaoEnviar className="btn grande verde" texto="Solicitar mais tempo" enviando="Enviando..." />
            </FormAcao>
          )}
          {aberta && !liberada && prazo.vencido && euNegocio && pedidoPendente && (
            <div className="prazo-visita alerta-p"><b>Pedido enviado ao comercial</b><span>Você pediu mais 15 dias. Enquanto o comercial não responde, a empresa fica sem exclusividade.</span></div>
          )}
          {liberada && aberta && <div className="prazo-visita fim"><b>Exclusividade liberada pelo gestor</b><span>Outros vendedores já podem visitar esta empresa.</span></div>}
          {contato && <div style={{ marginTop: 6 }}>Contato: <b>{contato}</b>{v.contato_cargo ? ` · ${v.contato_cargo}` : ''}</div>}
          {telefone && (
            <div className="acoes" style={{ marginTop: 10 }}>
              <a className="btn peq sec" href={`tel:${telefone.replace(/\D/g, '')}`}>Ligar</a>
              <a className="btn peq whats" href={linkWhatsApp(telefone, '')} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            </div>
          )}
          <div style={{ marginTop: 10 }}><Link href={`/app/clientes/${v.cliente.id}`}>Ver ficha completa do cliente ›</Link></div>
        </div>

        {erro && <div className="alerta erro">{erro}</div>}

        {podeEditar && aberta && (
          <>
            <div className="etapas">
              {['Rádio e programa', 'Proposta', 'Aprovação', 'Cadastro e contrato'].map((t, i) => (
                <span key={t} className={i + 1 < etapa ? 'feita' : i + 1 === etapa ? 'atual' : ''}>{i + 1 < etapa && <Check size={12} />} {t}</span>
              ))}
            </div>

            {escolhido && (
              <div className="card proposta-resumo" style={{ '--cor': escolhido.radio?.cor }}>
                <div className="radio-n">{escolhido.radio?.nome}</div>
                <h2 style={{ margin: '2px 0' }}>{escolhido.nome}</h2>
                {plano && <div className="muted">{plano.nome}</div>}
                {v.proposta_enviada_em && <p className="muted" style={{ margin: '8px 0 0' }}><FileText size={14} /> Proposta enviada em {dataHora(v.proposta_enviada_em)}</p>}
                {v.proposta_aprovada_em && <p style={{ margin: '6px 0 0', color: 'var(--verde)' }}><Check size={14} /> Aprovada pelo cliente em {dataHora(v.proposta_aprovada_em)}</p>}
              </div>
            )}

            {etapa === 2 && (
              <Link href={`/app/visitas/${v.id}/proposta`} className="btn grande verde"><Send className="ico" /> Enviar proposta comercial</Link>
            )}
            {etapa === 3 && (
              <>
                <p className="passo-guia">O cliente aprovou a proposta?</p>
                <form action={aprovarProposta}>
                  <input type="hidden" name="id" value={v.id} />
                  <BotaoEnviar className="btn grande verde" texto="Cliente aprovou: fazer cadastro completo" enviando="..." />
                </form>
                <a className="btn whats" style={{ marginTop: 10, width: '100%' }} target="_blank" rel="noopener noreferrer"
                  href={linkWhatsApp(telefone, `Olá${contato ? `, ${contato.split(' ')[0]}` : ''}! Para eu fazer o contrato, pode me enviar o cartão CNPJ da empresa, por favor?`)}>
                  Pedir cartão CNPJ pelo WhatsApp
                </a>
              </>
            )}
            {etapa === 4 && (
              <Link href={`/app/visitas/${v.id}/cadastro`} className="btn grande verde">Cadastro completo e contrato</Link>
            )}

            {etapa === 1 ? <p className="rotulo-secao">Escolha a rádio</p> : <p className="rotulo-secao" style={{ marginTop: 18 }}>Trocar de programa</p>}
            {(radiosVisita || []).map((r) => {
              const marca = marcaDaRadio(r.nome);
              const info = livres[r.id] || { programas: 0, comVaga: 0 };
              if (etapa > 1) {
                return <Link key={r.id} href={`/app/radio/${r.id}?visita=${v.id}`} className="btn sec" style={{ width: '100%', marginBottom: 8 }}>Programas da {r.nome}</Link>;
              }
              return (
                <Link key={r.id} href={`/app/radio/${r.id}?visita=${v.id}`} className="radio-btn" style={{ '--cor': r.cor, '--cor2': marca.cor2 || r.cor }}>
                  <div className="topo-r">
                    {marca.logo && <img src={marca.logo} alt="" className="logo-r" />}
                    <div className="nome">{r.nome}</div>
                    <span className="seta"><ArrowUpRight size={24} strokeWidth={2.4} /></span>
                  </div>
                  <div className="numeros">
                    <div><b>{info.programas}</b><span>programas</span></div>
                    <div><b>{info.comVaga}</b><span>com vaga</span></div>
                  </div>
                </Link>
              );
            })}
          </>
        )}

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
                  <form action={mudarStatusVisita}>
                    <input type="hidden" name="id" value={v.id} />
                    <input type="hidden" name="status" value="perdido" />
                    <BotaoEnviar className="btn grande cinza" texto="Não fechou" enviando="..." confirmar="Encerrar esta visita como 'não fechou'?" />
                  </form>
                </div>
                <p className="muted" style={{ marginTop: 10 }}>Quando o contrato é criado a partir desta visita, ela é marcada como “Fechado” automaticamente.</p>
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

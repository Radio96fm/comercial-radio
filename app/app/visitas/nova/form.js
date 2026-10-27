'use client';
import { useEffect, useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import { Building2, UserRound } from 'lucide-react';
import { iniciarVisita, buscarEmpresas } from '../../actions';
import BotaoEnviar from '@/components/BotaoEnviar';
import { OUTRO } from '@/lib/segmento';

const dataBR = (iso, ano = true) => (iso ? iso.split('-').reverse().slice(0, ano ? 3 : 2).join('/') : '');
const ocupada = (c) => c.situacao === 'negociando' || c.situacao === 'contrato';

// o que já existe sobre a empresa: quem atende, visita com validade e contrato vigente
function Situacao({ c }) {
  return (
    <div className="det">
      {c.situacao === 'negociando' && <>Em visitação por <b>{c.dono_nome}</b>{c.visita_em ? ` desde ${dataBR(c.visita_em)}` : ''}. Exclusividade até <b>{dataBR(c.expira_em)}</b> ({c.dias} dia{c.dias === 1 ? '' : 's'}).</>}
      {c.situacao === 'contrato' && <>Cliente de <b>{c.dono_nome}</b>.</>}
      {c.situacao === 'sua' && <>{c.minha_visita ? 'Você já está visitando esta empresa.' : 'Sua carteira.'}</>}
      {c.situacao === 'livre' && <>Já cadastrada{c.dono_nome ? ` (último vendedor: ${c.dono_nome})` : ''}. Livre para visitar.</>}
      {c.contrato_fim && <> Contrato vigente até <b>{dataBR(c.contrato_fim)}</b>.</>}
      {c.cidade ? <> · {c.cidade}</> : null}
    </div>
  );
}

const SELO = {
  negociando: ['Em visitação', 'b-vermelho'],
  contrato: ['Contrato vigente', 'b-vermelho'],
  sua: ['Sua', 'b-azul'],
  livre: ['Cadastrada', 'b-verde'],
};

export default function FormNovaVisita({ clientes, segmentos, clienteInicial }) {
  const [estado, acao] = useFormState(iniciarVisita, null);
  const inicial = clientes.find((c) => c.id === clienteInicial);
  const [nome, setNome] = useState('');
  const [selecionado, setSelecionado] = useState(inicial ? { id: inicial.id, nome: inicial.nome, situacao: 'sua', cidade: inicial.cidade } : null);
  const [parecidas, setParecidas] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [diferente, setDiferente] = useState(false);
  const [segmento, setSegmento] = useState('');

  // enquanto digita: procura nomes parecidos em toda a base de clientes da rádio
  useEffect(() => {
    const b = nome.trim();
    setDiferente(false);
    if (b.length < 3) { setParecidas([]); return undefined; }
    setBuscando(true);
    const t = setTimeout(async () => {
      const r = await buscarEmpresas(b).catch(() => []);
      setParecidas(r);
      setBuscando(false);
    }, 300);
    return () => clearTimeout(t);
  }, [nome]);

  // rascunho no aparelho: o que já foi escrito volta se o vendedor sair e entrar de novo
  const formRef = useRef(null);
  const RASCUNHO = ['contato_nome', 'contato_cargo', 'contato_telefone', 'observacoes'];
  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem('rascunho:nova-visita') || 'null');
      if (!r) return;
      if (r.nome && !inicial) setNome(r.nome);
      RASCUNHO.forEach((k) => { const el = formRef.current?.elements[k]; if (el && r[k]) el.value = r[k]; });
    } catch { /* sem armazenamento */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const guardar = () => {
    try {
      const f = formRef.current;
      localStorage.setItem('rascunho:nova-visita', JSON.stringify({ nome, ...Object.fromEntries(RASCUNHO.map((k) => [k, f?.elements[k]?.value || ''])) }));
    } catch { /* sem armazenamento */ }
  };
  useEffect(guardar, [nome]); // eslint-disable-line react-hooks/exhaustive-deps

  const bloqueioForte = parecidas.find((c) => ocupada(c) && Number(c.parecido) >= 0.8);
  const precisaConfirmar = !selecionado && parecidas.length > 0 && !bloqueioForte;
  const podeIniciar = selecionado ? !ocupada(selecionado) : nome.trim().length >= 2 && !bloqueioForte && (!precisaConfirmar || diferente);

  return (
    <form ref={formRef} action={acao} onInput={guardar}>
      {estado?.erro && <div className="alerta erro">{estado.erro}</div>}

      <h2 className="passo"><Building2 className="ico" /> Empresa</h2>
      {selecionado ? (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="hidden" name="cliente_id" value={selecionado.id} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{selecionado.nome}</div>
            <div className="muted">
              {selecionado.situacao === 'livre' ? 'Empresa livre: entra na sua carteira ao iniciar a visita' : 'Sua carteira'}
            </div>
          </div>
          <button type="button" className="btn peq cinza" onClick={() => setSelecionado(null)}>Trocar</button>
        </div>
      ) : (
        <div className="campo">
          <label htmlFor="novo_nome">Nome da empresa *</label>
          <input id="novo_nome" name="novo_nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Comece a digitar..." autoComplete="off" required />
          <div className="ajuda">{buscando ? 'Procurando nomes parecidos...' : 'Aparecem abaixo as empresas já cadastradas com nome parecido, mesmo escrito diferente.'}</div>

          {!!parecidas.length && (
            <div className="lista" style={{ marginTop: 10 }}>
              {parecidas.map((c) => {
                const travada = ocupada(c);
                const [selo, cor] = SELO[c.situacao] || SELO.livre;
                return (
                  <button type="button" key={c.id} className={`item ${travada ? 'travada' : ''}`} disabled={travada}
                    style={{ border: 0, textAlign: 'left', font: 'inherit', cursor: travada ? 'not-allowed' : 'pointer' }}
                    onClick={() => !travada && setSelecionado(c)}>
                    <div className="info">
                      <div className="nome">{c.nome}</div>
                      <Situacao c={c} />
                    </div>
                    <span className={`badge ${cor}`}>{selo}</span>
                  </button>
                );
              })}
            </div>
          )}
          {bloqueioForte && (
            <div className="alerta erro" style={{ marginTop: 10 }}>
              Esta empresa já está {bloqueioForte.situacao === 'negociando' ? `em visitação por ${bloqueioForte.dono_nome}` : `com contrato vigente de ${bloqueioForte.dono_nome}`}. Só um vendedor atende a mesma empresa. Se for outra empresa, fale com o comercial.
            </div>
          )}
          {precisaConfirmar && (
            <label className="check-linha" style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
              <input type="checkbox" checked={diferente} onChange={(e) => setDiferente(e.target.checked)} style={{ width: 22, height: 22 }} />
              <span>É outra empresa, nenhuma dessas da lista</span>
            </label>
          )}
          <input type="hidden" name="confirmo_diferente" value={diferente ? 'sim' : ''} />
        </div>
      )}

      {!selecionado && nome.trim().length >= 2 && !bloqueioForte && (
        <>
          <div className="campo">
            <label>Segmento *</label>
            <select name="novo_segmento_id" value={segmento} onChange={(e) => setSegmento(e.target.value)} required>
              <option value="" disabled>Escolha o segmento...</option>
              {segmentos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              <option value={OUTRO}>Outro (escrever)</option>
            </select>
            {segmento === OUTRO && <input name="novo_segmento_novo" required placeholder="Qual é o segmento?" style={{ marginTop: 8 }} />}
            <div className="ajuda">Um programa não aceita dois patrocinadores do mesmo segmento.</div>
          </div>
          <div className="grid2">
            <div className="campo"><label>Cidade</label><input name="novo_cidade" /></div>
            <div className="campo"><label>CNPJ ou CPF</label><input name="novo_documento" inputMode="numeric" placeholder="se souber" /></div>
          </div>
        </>
      )}

      <h2 className="passo"><UserRound className="ico" /> Com quem você está falando</h2>
      <div className="grid2">
        <div className="campo">
          <label htmlFor="contato_nome">Nome do contato *</label>
          <input id="contato_nome" name="contato_nome" required minLength={2} placeholder="Ex.: Rogério" autoComplete="off" />
        </div>
        <div className="campo">
          <label htmlFor="contato_cargo">Cargo</label>
          <input id="contato_cargo" name="contato_cargo" placeholder="Ex.: diretor de marketing" autoComplete="off" />
        </div>
      </div>

      <div className="campo">
        <label htmlFor="contato_telefone">Telefone / WhatsApp do contato *</label>
        <input id="contato_telefone" name="contato_telefone" type="tel" inputMode="tel" required minLength={10} placeholder="(00) 00000-0000" autoComplete="off" />
        <div className="ajuda aviso-privado">🔒 Só você e o comercial veem este número. Os outros vendedores não têm acesso ao telefone dos seus contatos.</div>
      </div>

      <div className="campo">
        <label htmlFor="observacoes">Anotações (opcional)</label>
        <textarea id="observacoes" name="observacoes" placeholder="Ex.: interesse no horário da manhã..." />
      </div>

      <BotaoEnviar className="btn grande verde" texto="Iniciar visita" enviando="Registrando..." disabled={!podeIniciar} />
      <p className="muted" style={{ marginTop: 10 }}>Depois você escolhe a rádio e o programa e envia a proposta pelo WhatsApp.</p>
    </form>
  );
}

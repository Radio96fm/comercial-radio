'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Pencil } from 'lucide-react';
import { OUTRO } from '@/lib/segmento';
import { salvarBlocoCliente } from '@/app/app/actions';

// Cadastro completo em blocos: cada bloco salvo no banco se fecha e mostra um
// resumo. O que está sendo digitado também fica guardado no aparelho, então
// o vendedor sai do app e, ao voltar, continua de onde parou.
const BLOCOS = [
  { id: 'empresa', titulo: 'Empresa', campos: [['nome', 'Nome da empresa', true], ['segmento_id', 'Segmento', true, 'seg'], ['cidade', 'Cidade-UF', true, '', 'Ex.: Rio Verde-GO']] },
  { id: 'contato', titulo: 'Responsável e contato', campos: [['contato_nome', 'Responsável / contato', true], ['telefone', 'Telefone / WhatsApp', true, 'tel', '(00) 00000-0000'], ['email', 'E-mail', true, 'email'], ['fax', 'Outro telefone', false, 'tel']] },
  { id: 'fiscal', titulo: 'Dados do contrato', campos: [['razao_social', 'Razão social', true], ['documento', 'CNPJ ou CPF', true, 'num'], ['inscricao_estadual', 'Inscrição estadual', false]] },
  { id: 'endereco', titulo: 'Endereço', campos: [['endereco', 'Endereço', true, '', 'Rua, número, sala'], ['bairro', 'Bairro', false], ['cep', 'CEP', false, 'num']] },
  { id: 'obs', titulo: 'Observações (opcional)', campos: [['observacoes', 'Observações', false, 'area']] },
];
const TODOS = BLOCOS.flatMap((b) => b.campos.map((c) => c[0])).concat('segmento_novo');
const vazio = (x) => !String(x ?? '').trim();
const completo = (b, d) => b.campos.every(([k, , ob]) => !ob || (!vazio(d[k]) && d[k] !== OUTRO));
const ler = (chave) => { try { return JSON.parse(localStorage.getItem(chave) || 'null'); } catch { return null; } };
const gravar = (chave, v) => { try { if (v === null) localStorage.removeItem(chave); else localStorage.setItem(chave, JSON.stringify(v)); } catch { /* sem armazenamento */ } };

export default function CadastroEtapas({ segmentos, valores, clienteId, visita, seguir }) {
  const router = useRouter();
  const chave = `cadastro:${visita}`;
  const base = Object.fromEntries(TODOS.map((k) => [k, valores[k] ?? '']));
  const [dados, setDados] = useState(base);
  const [feitos, setFeitos] = useState(() => new Set(BLOCOS.filter((b) => b.id !== 'obs' && completo(b, base)).map((b) => b.id)));
  const [aberto, setAberto] = useState(() => (BLOCOS.find((b) => b.id !== 'obs' && !completo(b, base)) || BLOCOS[4]).id);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // volta o rascunho guardado neste aparelho (o que foi digitado e ainda não salvo)
  useEffect(() => {
    const r = ler(chave);
    if (!r?.dados) return;
    setDados((d) => ({ ...d, ...r.dados }));
    if (r.aberto) setAberto(r.aberto);
  }, [chave]);
  useEffect(() => { gravar(chave, { dados, aberto }); }, [chave, dados, aberto]);

  const mudar = (k, v) => setDados((d) => ({ ...d, [k]: v }));
  const nomeSeg = (id) => segmentos.find((s) => s.id === id)?.nome || (id === OUTRO ? dados.segmento_novo : '');
  const resumo = (b) => b.campos.map(([k]) => (k === 'segmento_id' ? nomeSeg(dados[k]) : dados[k])).filter((x) => !vazio(x)).join(' · ') || 'Nada preenchido';

  async function salvar(b) {
    setErro('');
    const faltam = b.campos.filter(([k, , ob]) => ob && vazio(dados[k])).map(([, nome]) => nome);
    if (faltam.length) { setErro(`Preencha: ${faltam.join(', ')}.`); return; }
    setSalvando(true);
    const fd = new FormData();
    fd.set('id', clienteId);
    fd.set('_campos', b.campos.map(([k]) => k).join(','));
    b.campos.forEach(([k]) => fd.set(k, dados[k] ?? ''));
    if (dados.segmento_id === OUTRO) fd.set('segmento_novo', dados.segmento_novo || '');
    const r = await salvarBlocoCliente(fd).catch(() => ({ erro: 'Não foi possível salvar agora. Confira a internet e tente de novo.' }));
    setSalvando(false);
    if (r?.erro) { setErro(r.erro); return; }
    if (r?.segmento_id) mudar('segmento_id', r.segmento_id);
    const novos = new Set(feitos).add(b.id);
    setFeitos(novos);
    const prox = BLOCOS.find((x) => !novos.has(x.id) && x.id !== 'obs') || (novos.has('obs') ? null : BLOCOS[4]);
    setAberto(prox?.id || '');
  }

  const prontos = BLOCOS.every((b) => b.id === 'obs' || feitos.has(b.id));
  const total = BLOCOS.length - 1;
  const feitosObrig = BLOCOS.filter((b) => b.id !== 'obs' && feitos.has(b.id)).length;

  return (
    <div className="etapas-cad">
      <p className="muted" style={{ margin: '0 0 10px' }}>{feitosObrig} de {total} blocos salvos. Pode sair do app: o que você preencheu fica guardado.</p>
      {BLOCOS.map((b, i) => {
        const feito = feitos.has(b.id);
        const ab = aberto === b.id;
        return (
          <section key={b.id} className={`bloco-cad ${ab ? 'aberto' : ''} ${feito ? 'feito' : ''}`}>
            <button type="button" className="bloco-cab" onClick={() => { setErro(''); setAberto(ab ? '' : b.id); }} aria-expanded={ab}>
              <span className="bloco-num">{feito ? <Check size={16} /> : i + 1}</span>
              <span className="bloco-tit"><b>{b.titulo}</b>{!ab && <small>{feito ? resumo(b) : 'Toque para preencher'}</small>}</span>
              {feito && !ab ? <Pencil size={16} className="bloco-ico" /> : <ChevronDown size={18} className="bloco-ico" />}
            </button>
            {ab && (
              <div className="bloco-corpo">
                {b.campos.map(([k, rot, ob, tipo, ph]) => (
                  <div className="campo" key={k}>
                    <label htmlFor={`c_${k}`}>{rot}{ob ? ' *' : ''}</label>
                    {tipo === 'seg' ? (
                      <>
                        <select id={`c_${k}`} value={dados[k]} onChange={(e) => mudar(k, e.target.value)}>
                          <option value="" disabled>Escolha o segmento...</option>
                          {segmentos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                          <option value={OUTRO}>Outro (escrever)</option>
                        </select>
                        {dados[k] === OUTRO && <input value={dados.segmento_novo} onChange={(e) => mudar('segmento_novo', e.target.value)} placeholder="Qual é o segmento?" style={{ marginTop: 8 }} />}
                        <div className="ajuda">Um programa não aceita dois patrocinadores do mesmo segmento.</div>
                      </>
                    ) : tipo === 'area' ? (
                      <textarea id={`c_${k}`} value={dados[k]} onChange={(e) => mudar(k, e.target.value)} />
                    ) : (
                      <input id={`c_${k}`} value={dados[k]} onChange={(e) => mudar(k, e.target.value)} placeholder={ph || ''}
                        type={tipo === 'tel' ? 'tel' : tipo === 'email' ? 'email' : 'text'} inputMode={tipo === 'tel' ? 'tel' : tipo === 'num' ? 'numeric' : tipo === 'email' ? 'email' : undefined} />
                    )}
                  </div>
                ))}
                {erro && <div className="alerta erro">{erro}</div>}
                <button type="button" className="btn verde" style={{ width: '100%' }} disabled={salvando} onClick={() => salvar(b)}>
                  {salvando ? 'Salvando...' : 'Salvar e continuar'}
                </button>
              </div>
            )}
          </section>
        );
      })}
      <button type="button" className="btn grande verde" style={{ marginTop: 14 }} disabled={!prontos}
        onClick={() => { gravar(chave, null); router.push(seguir); }}>
        Seguir para o contrato
      </button>
      {!prontos && <p className="muted" style={{ marginTop: 8 }}>Salve os blocos 1 a 4 para seguir para o contrato.</p>}
    </div>
  );
}

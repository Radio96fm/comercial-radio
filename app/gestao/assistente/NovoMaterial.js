'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const ABAS = [
  ['testemunhal', 'Testemunhal de exemplo', 'Cole um testemunhal que já foi ao ar e ficou bom. O assistente aprende o jeito de escrever da casa.'],
  ['instrucao', 'Regra ou ideia', 'Ex.: "Sempre terminar com o bordão do programa", "Nunca falar de concorrentes", ideias de abertura.'],
  ['texto', 'Texto de apoio', 'Qualquer texto: técnicas de copy, informações das rádios, dos programas, do público. Textos longos são resumidos.'],
  ['pdf', 'PDF', 'Livros de copy, apostilas, mídia kit. A IA lê o PDF e guarda um resumo do que serve para testemunhais (até 18 MB).'],
  ['link', 'Link', 'Página de um site, artigo ou blog. A IA lê a página e guarda um resumo.'],
];

export default function NovoMaterial({ ligado }) {
  const router = useRouter();
  const [tipo, setTipo] = useState('testemunhal');
  const [estado, setEstado] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const aba = ABAS.find((a) => a[0] === tipo);
  const precisaIA = ['pdf', 'link'].includes(tipo);

  async function enviar(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setEnviando(true);
    setEstado(null);
    try {
      const corpo = { tipo, titulo: fd.get('titulo'), texto: fd.get('texto'), url: fd.get('url') };
      if (tipo === 'pdf') {
        const arq = fd.get('arquivo');
        if (!arq?.size) throw new Error('Escolha o arquivo PDF.');
        if (arq.size > 18 * 1024 * 1024) throw new Error('PDF muito grande. Divida em partes de até 18 MB.');
        const caminho = `${Date.now()}-${arq.name.normalize('NFD').replace(/[^\w.-]+/g, '_')}`;
        const { error } = await createClient().storage.from('assistente').upload(caminho, arq, { contentType: 'application/pdf' });
        if (error) throw new Error('Não consegui enviar o arquivo. Tente de novo.');
        corpo.caminho = caminho;
      }
      const resp = await fetch('/api/assistente', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
      const r = await resp.json().catch(() => ({ erro: 'Demorou demais. Tente um arquivo menor.' }));
      if (!resp.ok) throw new Error(r.erro || 'Não deu certo.');
      form.reset();
      setEstado({ ok: r.resumido ? 'Pronto! A IA leu o material e guardou o resumo abaixo.' : 'Pronto! Já está valendo para os próximos testemunhais.' });
      router.refresh();
    } catch (err) {
      setEstado({ erro: err.message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Ensinar algo novo</h2>
      <div className="abas-material">
        {ABAS.map(([k, nome]) => (
          <button key={k} type="button" className={k === tipo ? 'ativo' : ''} onClick={() => { setTipo(k); setEstado(null); }}>{nome}</button>
        ))}
      </div>
      <p className="muted">{aba[2]}</p>
      <form onSubmit={enviar} key={tipo}>
        {estado?.erro && <div className="alerta erro">{estado.erro}</div>}
        {estado?.ok && <div className="alerta ok">{estado.ok}</div>}
        {precisaIA && !ligado && <div className="alerta aviso">Ligue a IA acima primeiro: ela é quem lê {tipo === 'pdf' ? 'o PDF' : 'o link'}.</div>}
        <div className="campo"><label>Título {tipo !== 'testemunhal' && tipo !== 'instrucao' ? '(opcional)' : ''}</label>
          <input name="titulo" placeholder={tipo === 'testemunhal' ? 'Ex.: Supermercado Bom Preço, 30s' : tipo === 'instrucao' ? 'Ex.: Fechamento com bordão' : 'Se deixar em branco, uso o nome do material'} />
        </div>
        {tipo === 'pdf' && <div className="campo"><label>Arquivo PDF</label><input name="arquivo" type="file" accept="application/pdf,.pdf" /></div>}
        {tipo === 'link' && <div className="campo"><label>Link</label><input name="url" type="url" inputMode="url" placeholder="https://" /></div>}
        {!['pdf', 'link'].includes(tipo) && (
          <div className="campo"><label>{tipo === 'testemunhal' ? 'Texto do testemunhal' : tipo === 'instrucao' ? 'A regra ou ideia' : 'Texto'}</label>
            <textarea name="texto" rows={tipo === 'instrucao' ? 3 : 8} />
          </div>
        )}
        <button className="btn" disabled={enviando || (precisaIA && !ligado)}>
          {enviando ? (precisaIA ? 'A IA está lendo... (pode levar até 1 minuto)' : 'Salvando...') : 'Adicionar'}
        </button>
      </form>
    </div>
  );
}

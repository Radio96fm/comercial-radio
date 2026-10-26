'use client';
import { useEffect, useState } from 'react';
import { FileSignature, Download, Paperclip } from 'lucide-react';
import { CLIENTES } from '@/lib/demoDados';
import { gerarPdfProposta } from '@/lib/propostaPdf';

// Proposta de patrocínio só na demonstração: preenche, gera o PDF e anexa um
// PDF pronto. Nada é salvo; o que a pessoa preenche some ao recarregar.
const VAZIO = { cliente: '', programa: '', vendedor: '', valor: '', meses: '6', inicio: '', obs: '' };

export default function PropostaForm({ dados }) {
  const [f, setF] = useState(VAZIO);
  const [arquivo, setArquivo] = useState(null);
  const [erro, setErro] = useState('');

  const programas = dados.grade.radios.flatMap((r) => r.programas.map((p) => ({ nome: p.nome, radio: r.nome })));
  const vendedores = dados.equipe.lista.filter((v) => v.papel === 'vendedor').map((v) => v.nome);
  const mudar = (campo) => (ev) => setF({ ...f, [campo]: ev.target.value });

  useEffect(() => () => { if (arquivo) URL.revokeObjectURL(arquivo.url); }, [arquivo]);

  async function gerar(ev) {
    ev.preventDefault();
    setErro('');
    const prog = programas.find((p) => `${p.radio}|${p.nome}` === f.programa);
    try {
      const blob = await gerarPdfProposta({ ...f, valor: Number(f.valor), meses: Number(f.meses), radio: prog?.radio || '', programa: prog?.nome || '' });
      if (arquivo) URL.revokeObjectURL(arquivo.url);
      setArquivo({ url: URL.createObjectURL(blob), nome: `Proposta ${f.cliente}.pdf` });
    } catch {
      setErro('Não consegui gerar o PDF agora. Tente de novo.');
    }
  }

  function anexar(ev) {
    const pdfEscolhido = ev.target.files?.[0];
    if (!pdfEscolhido) return;
    if (arquivo) URL.revokeObjectURL(arquivo.url);
    setArquivo({ url: URL.createObjectURL(pdfEscolhido), nome: pdfEscolhido.name });
  }

  return (
    <section className="dir-proposta">
      <h2><FileSignature size={18} />Nova proposta</h2>
      <p className="dir-proposta-nota">Simulação: nada é salvo e os dados são fictícios.</p>
      <form className="dir-proposta-form" onSubmit={gerar}>
        <label>Cliente
          <select required value={f.cliente} onChange={mudar('cliente')}>
            <option value="">Escolha</option>
            {CLIENTES.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
        </label>
        <label>Programa
          <select required value={f.programa} onChange={mudar('programa')}>
            <option value="">Escolha</option>
            {programas.map((p) => <option key={`${p.radio}|${p.nome}`} value={`${p.radio}|${p.nome}`}>{p.radio} · {p.nome}</option>)}
          </select>
        </label>
        <label>Vendedor
          <select required value={f.vendedor} onChange={mudar('vendedor')}>
            <option value="">Escolha</option>
            {vendedores.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>Valor mensal (R$)
          <input type="number" min="1" step="0.01" required value={f.valor} onChange={mudar('valor')} />
        </label>
        <label>Meses
          <input type="number" min="1" max="36" required value={f.meses} onChange={mudar('meses')} />
        </label>
        <label>Início
          <input type="date" required value={f.inicio} onChange={mudar('inicio')} />
        </label>
        <label className="larga">Observações
          <textarea rows={3} value={f.obs} onChange={mudar('obs')} />
        </label>
        <div className="dir-proposta-acoes">
          <button type="submit" className="btn"><Download size={18} />Gerar PDF</button>
          <label className="btn cinza"><Paperclip size={18} />Anexar PDF pronto
            <input type="file" accept="application/pdf" hidden onChange={anexar} />
          </label>
        </div>
      </form>
      {erro && <p className="dir-proposta-erro">{erro}</p>}
      {arquivo && <a className="dir-proposta-arquivo" href={arquivo.url} download={arquivo.nome}>Baixar {arquivo.nome}</a>}
    </section>
  );
}

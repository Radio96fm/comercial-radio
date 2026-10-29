'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { salvarPropostaPdf, removerPropostaPdf } from '../actions';

const LIMITE_MB = 25;

// Botão para colocar ou trocar o PDF de uma proposta (programa ou rádio)
export default function EnviarPdf({ tipo, id, tem, demo = false }) {
  const router = useRouter();
  const input = useRef(null);
  const [estado, setEstado] = useState('');

  async function escolher(e) {
    const arq = e.target.files?.[0];
    e.target.value = '';
    if (!arq) return;
    if (arq.type !== 'application/pdf' && !/\.pdf$/i.test(arq.name)) { setEstado('Escolha um arquivo PDF.'); return; }
    if (arq.size > LIMITE_MB * 1024 * 1024) { setEstado(`PDF muito grande (máximo ${LIMITE_MB} MB).`); return; }
    if (demo) { setEstado(`${arq.name} escolhido. Na demonstração o arquivo não é enviado.`); return; }
    setEstado('Enviando...');
    const caminho = `${tipo}/${id}/${Date.now()}.pdf`;
    const { error } = await createClient().storage.from('propostas').upload(caminho, arq, { contentType: 'application/pdf' });
    if (error) { setEstado('Não consegui enviar o arquivo. Tente de novo.'); return; }
    const r = await salvarPropostaPdf({ tipo, id, caminho });
    if (r?.erro) { setEstado(r.erro); return; }
    setEstado('');
    router.refresh();
  }

  async function remover() {
    if (!confirm('Tirar este PDF? Os vendedores deixam de enviá-lo.')) return;
    if (demo) { setEstado('Na demonstração nada é apagado.'); return; }
    setEstado('Removendo...');
    const r = await removerPropostaPdf({ tipo, id });
    setEstado(r?.erro || '');
    router.refresh();
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {estado && <small className="muted">{estado}</small>}
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={escolher} />
      <button type="button" className="btn peq" onClick={() => input.current?.click()} disabled={estado.endsWith('...')}>
        <Upload className="ico" /> {tem ? 'Substituir arquivo' : 'Colocar PDF'}
      </button>
      {tem && <button type="button" className="btn peq cinza" onClick={remover} aria-label="Tirar PDF"><Trash2 className="ico" /></button>}
    </div>
  );
}

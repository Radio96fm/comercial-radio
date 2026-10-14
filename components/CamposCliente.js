'use client';
import { useState } from 'react';
import { OUTRO } from '@/lib/segmento';

// Campos do cadastro de cliente (usado em vários formulários).
// simples = cadastro rápido durante a visita: empresa, segmento, contato e cidade.
export default function CamposCliente({ segmentos, prefixo = '', valores = {}, simples = false }) {
  const n = (k) => prefixo + k;
  const [segmento, setSegmento] = useState(valores.segmento_id || '');
  return (
    <>
      <div className="campo">
        <label>Nome da empresa *</label>
        <input name={n('nome')} defaultValue={valores.nome || ''} required placeholder="Nome fantasia" />
      </div>
      <div className="campo">
        <label>Segmento *</label>
        <select name={n('segmento_id')} value={segmento} onChange={(e) => setSegmento(e.target.value)} required>
          <option value="" disabled>Escolha o segmento...</option>
          {segmentos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          <option value={OUTRO}>Outro (escrever)</option>
        </select>
        {segmento === OUTRO && (
          <input name={n('segmento_novo')} required autoFocus placeholder="Qual é o segmento?" style={{ marginTop: 8 }} />
        )}
        <div className="ajuda">Importante: um programa não aceita dois patrocinadores do mesmo segmento.</div>
      </div>
      <div className="campo">
        <label>{simples ? 'Com quem você está falando' : 'Responsável / contato'}</label>
        <input name={n('contato_nome')} defaultValue={valores.contato_nome || ''} placeholder={simples ? 'Nome da pessoa na empresa' : ''} />
      </div>
      {!simples && (
        <div className="campo">
          <label>Telefone / WhatsApp</label>
          <input name={n('telefone')} type="tel" inputMode="tel" defaultValue={valores.telefone || ''} placeholder="(00) 00000-0000" />
        </div>
      )}
      <div className="campo">
        <label>Cidade</label>
        <input name={n('cidade')} defaultValue={valores.cidade || ''} />
      </div>
      {!simples && (
        <>
          <div className="campo"><label>Razão social</label><input name={n('razao_social')} defaultValue={valores.razao_social || ''} /></div>
          <div className="campo"><label>CNPJ ou CPF</label><input name={n('documento')} inputMode="numeric" defaultValue={valores.documento || ''} /></div>
          <div className="campo"><label>E-mail</label><input name={n('email')} type="email" defaultValue={valores.email || ''} /></div>
          <div className="campo"><label>Endereço</label><input name={n('endereco')} defaultValue={valores.endereco || ''} /></div>
          <div className="campo"><label>Observações</label><textarea name={n('observacoes')} defaultValue={valores.observacoes || ''} /></div>
        </>
      )}
    </>
  );
}

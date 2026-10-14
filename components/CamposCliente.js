// Campos do cadastro de cliente (usado em vários formulários)
export default function CamposCliente({ segmentos, prefixo = '', valores = {}, simples = false }) {
  const n = (k) => prefixo + k;
  return (
    <>
      <div className="campo">
        <label>Nome da empresa *</label>
        <input name={n('nome')} defaultValue={valores.nome || ''} required placeholder="Nome fantasia" />
      </div>
      <div className="campo">
        <label>Segmento *</label>
        <select name={n('segmento_id')} defaultValue={valores.segmento_id || ''} required>
          <option value="" disabled>Escolha o segmento...</option>
          {segmentos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        <div className="ajuda">Importante: um programa não aceita dois patrocinadores do mesmo segmento.</div>
      </div>
      <div className="campo">
        <label>Responsável / contato</label>
        <input name={n('contato_nome')} defaultValue={valores.contato_nome || ''} />
      </div>
      <div className="campo">
        <label>Telefone / WhatsApp</label>
        <input name={n('telefone')} type="tel" inputMode="tel" defaultValue={valores.telefone || ''} placeholder="(00) 00000-0000" />
      </div>
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

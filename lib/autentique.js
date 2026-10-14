import 'server-only';

// Assinatura digital pela Autentique (API GraphQL v2).
// A chave da API fica guardada no banco (privado.config) e só é lida aqui no
// servidor, com o segredo ADMIN_PROXY_SECRET.
const API = 'https://api.autentique.com.br/v2/graphql';

async function rpc(nome, args) {
  const resp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${nome}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(args),
    cache: 'no-store',
  });
  if (!resp.ok) throw new Error(`Falha ao ler a configuração (${resp.status}).`);
  return resp.json();
}

export async function configAutentique() {
  return rpc('autentique_config', { p_segredo: process.env.ADMIN_PROXY_SECRET || '' });
}

export async function marcarAssinado(documentoId) {
  return rpc('autentique_marcar_assinado', { p_segredo: process.env.ADMIN_PROXY_SECRET || '', p_documento: documentoId });
}

// teste = documentos de teste (não gastam os documentos do plano)
export const modoTeste = () => process.env.AUTENTIQUE_TESTE === '1';

async function gql(token, body, multipart) {
  const resp = await fetch(API, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, ...(multipart ? {} : { 'content-type': 'application/json' }) },
    body,
    cache: 'no-store',
  });
  const r = await resp.json().catch(() => null);
  if (!r) throw new Error(`A Autentique não respondeu (${resp.status}).`);
  if (r.errors?.length) throw new Error(r.errors.map((e) => e.message).join('; '));
  return r.data;
}

const CRIAR = `mutation CriarDocumento($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
  createDocument(sandbox: SANDBOX, document: $document, signers: $signers, file: $file) {
    id name
    signatures { public_id name email action { name } link { short_link } }
  }
}`;

// Cria o documento com o PDF e devolve { id, assinatura, link }
export async function enviarDocumento({ token, nome, mensagem, pdf, cliente }) {
  const signer = cliente.email
    ? { email: cliente.email, action: 'SIGN' }
    : { name: cliente.nome, action: 'SIGN' };
  const fd = new FormData();
  fd.append('operations', JSON.stringify({
    query: CRIAR.replace('SANDBOX', modoTeste() ? 'true' : 'false'),
    variables: { document: { name: nome, message: mensagem, reminder: 'WEEKLY', refusable: true }, signers: [signer], file: null },
  }));
  fd.append('map', JSON.stringify({ file: ['variables.file'] }));
  fd.append('file', new Blob([pdf], { type: 'application/pdf' }), `${nome}.pdf`);
  const data = await gql(token, fd, true);
  const doc = data.createDocument;
  const sig = doc.signatures.find((s) => (cliente.email ? s.email?.toLowerCase() === cliente.email.toLowerCase() : s.name === cliente.nome))
    || doc.signatures[doc.signatures.length - 1];
  let link = sig?.link?.short_link || null;
  if (!link && sig) {
    const r = await gql(token, JSON.stringify({ query: `mutation { createLinkToSignature(public_id: "${sig.public_id}") { short_link } }` }));
    link = r.createLinkToSignature?.short_link || null;
  }
  return { id: doc.id, assinatura: sig?.public_id || null, link };
}

// Situação do documento: assinado pelo cliente? recusado? e-mail entregue?
export async function situacaoDocumento(token, id, assinatura) {
  const data = await gql(token, JSON.stringify({
    query: `query { me { email } document(id: "${id}") { id files { signed } signatures { public_id email action { name } signed { created_at } rejected { created_at } email_events { sent delivered opened refused reason } } } }`,
  }));
  const d = data.document;
  if (!d) return null;
  const sig = d.signatures.find((s) => s.public_id === assinatura);
  const ev = sig?.email_events || null;
  return {
    assinado: sig ? !!sig.signed : (() => { const sigs = d.signatures.filter((s) => s.action?.name); return sigs.length > 0 && sigs.every((s) => s.signed); })(),
    recusado: !!sig?.rejected,
    pdfAssinado: d.files?.signed || null,
    email: sig?.email || null,
    // a Autentique não manda e-mail para o próprio dono da conta
    emailDoDono: !!(sig?.email && data.me?.email && sig.email.toLowerCase() === data.me.email.toLowerCase()),
    emailEventos: ev && { enviado: ev.sent, entregue: ev.delivered, aberto: ev.opened, recusado: ev.refused, motivo: ev.reason },
  };
}

export async function reenviarAssinatura(token, publicId) {
  return gql(token, JSON.stringify({ query: `mutation { resendSignatures(public_ids: ["${publicId}"]) }` }));
}

// confere se a chave funciona; devolve o nome/e-mail da conta
export async function testarChave(token) {
  const data = await gql(token, JSON.stringify({ query: 'query { me { name email } }' }));
  return data.me;
}

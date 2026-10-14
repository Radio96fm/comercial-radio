import crypto from 'node:crypto';
import { configAutentique, situacaoDocumento, marcarAssinado } from '@/lib/autentique';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Aviso da Autentique (webhook). Só confia no que a própria API confirmar:
// pega o id do documento e pergunta para a Autentique se já foi assinado.
export async function POST(request) {
  const corpo = await request.text();
  let cfg;
  try { cfg = await configAutentique(); } catch { return new Response('config', { status: 500 }); }
  if (!cfg?.token) return new Response('sem chave', { status: 200 });

  if (cfg.webhook) {
    const recebida = request.headers.get('x-autentique-signature') || '';
    const calculada = crypto.createHmac('sha256', cfg.webhook).update(corpo).digest('hex');
    const ok = recebida.length === calculada.length && crypto.timingSafeEqual(Buffer.from(recebida), Buffer.from(calculada));
    if (!ok) return new Response('assinatura inválida', { status: 401 });
  }

  let ev;
  try { ev = JSON.parse(corpo); } catch { return new Response('json', { status: 400 }); }
  const obj = ev?.event?.data?.object || ev?.data?.object || {};
  const docId = obj.object === 'document' ? obj.id : obj.document?.id || obj.document_id || obj.document;
  if (!docId || typeof docId !== 'string') return new Response('ok', { status: 200 });

  try {
    const s = await situacaoDocumento(cfg.token, docId, obj.object === 'signature' ? obj.public_id : null);
    if (s?.assinado) await marcarAssinado(docId);
  } catch {
    return new Response('erro ao conferir', { status: 500 });
  }
  return new Response('ok', { status: 200 });
}

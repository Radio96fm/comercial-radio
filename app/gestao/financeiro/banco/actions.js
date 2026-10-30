'use server';
import { revalidatePath } from 'next/cache';
import forge from 'node-forge';
import { requireFinanceiro } from '@/lib/auth';
import { SERVICOS } from '@/lib/banco';

const txt = (fd, k) => String(fd.get(k) ?? '').trim();

function atualizar() {
  revalidatePath('/gestao/financeiro/banco');
  revalidatePath('/financeiro/banco');
  revalidatePath('/gestao/financeiro/extrato');
  revalidatePath('/financeiro/extrato');
}

export async function salvarBanco(_prev, fd) {
  const { supabase } = await requireFinanceiro();
  const servicos = Object.fromEntries(SERVICOS.map(([k]) => [k, fd.get(`s_${k}`) === 'on']));
  const { error } = await supabase.rpc('salvar_banco', {
    p_banco: txt(fd, 'banco') || 'bradesco',
    p_agencia: txt(fd, 'agencia'),
    p_conta: txt(fd, 'conta'),
    p_digito: txt(fd, 'digito'),
    p_ambiente: txt(fd, 'ambiente') || 'homologacao',
    p_client_id: txt(fd, 'client_id'),
    p_client_secret: txt(fd, 'client_secret'),
    p_servicos: servicos,
  });
  if (error) return { erro: error.message };
  atualizar();
  return { ok: 'Dados do banco salvos.' };
}

// Abre o .pfx aqui no servidor só para conferir a senha e ler titular e validade
function lerCertificado(bin, senha) {
  const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(bin), senha);
  const certs = (p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || []).map((b) => b.cert).filter(Boolean);
  const temChave = (p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || []).length
    || (p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || []).length;
  if (!certs.length || !temChave) throw new Error('sem chave');
  // o certificado da empresa é o que não é de autoridade certificadora
  const cert = certs.find((c) => !c.getExtension('basicConstraints')?.cA) || certs[0];
  const cn = cert.subject.getField('CN')?.value || '';
  return { titular: forge.util.decodeUtf8(cn) || cn, validade: cert.validity.notAfter.toISOString().slice(0, 10) };
}

export async function salvarCertificado(_prev, fd) {
  const { supabase } = await requireFinanceiro();
  const arq = fd.get('arquivo');
  const senha = String(fd.get('senha') ?? '');
  if (!arq || typeof arq === 'string' || !arq.size) return { erro: 'Escolha o arquivo do certificado (.pfx ou .p12).' };
  if (arq.size > 200 * 1024) return { erro: 'Esse arquivo é grande demais para ser um certificado A1.' };
  const buf = Buffer.from(await arq.arrayBuffer());
  let info;
  try {
    info = lerCertificado(buf.toString('binary'), senha);
  } catch {
    return { erro: 'Não consegui abrir o certificado. Confira se é o A1 (.pfx) e se a senha está certa.' };
  }
  if (info.validade < new Date().toISOString().slice(0, 10)) {
    return { erro: `Esse certificado já venceu em ${info.validade.split('-').reverse().join('/')}.` };
  }
  const { error } = await supabase.rpc('salvar_banco_certificado', {
    p_pfx: buf.toString('base64'), p_senha: senha, p_arquivo: arq.name, p_titular: info.titular, p_validade: info.validade,
  });
  if (error) return { erro: error.message };
  atualizar();
  return { ok: `Certificado guardado: ${info.titular}, vence em ${info.validade.split('-').reverse().join('/')}.` };
}

export async function removerCertificado(_prev) {
  const { supabase } = await requireFinanceiro();
  const { error } = await supabase.rpc('remover_banco_certificado');
  if (error) return { erro: error.message };
  atualizar();
  return { ok: 'Certificado removido.' };
}

// A ligação com o banco ainda não está ativa: confere o que já está cadastrado e diz o que falta
export async function testarConexao(_prev) {
  const { supabase } = await requireFinanceiro();
  const { data: b, error } = await supabase.rpc('banco_situacao');
  if (error) return { erro: error.message };
  const falta = [
    !b.agencia && 'agência', !b.conta && 'conta', !b.client_id && 'Client ID',
    !b.secret && 'Client Secret', !b.certificado && 'certificado A1',
  ].filter(Boolean);
  const resultado = falta.length ? `falta ${falta.join(', ')}` : 'cadastro completo, integração ainda não ativada';
  await supabase.rpc('registrar_teste_banco', { p_resultado: resultado });
  revalidatePath('/gestao/financeiro/banco');
  revalidatePath('/financeiro/banco');
  if (falta.length) return { erro: `Ainda falta cadastrar: ${falta.join(', ')}.` };
  return { ok: 'Cadastro completo. A integração com o banco ainda não foi ativada no sistema; assim que for, este botão passa a conectar de verdade.' };
}

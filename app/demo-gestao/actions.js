'use server';

// Ações da demonstração sem login: nada é gravado no banco.
const aviso = { ok: 'Na demonstração nada é salvo. No sistema com login, isto já vale para os vendedores.' };
const naoSalva = async () => aviso;
const naoFaz = async () => {};

export const salvarPrograma = naoSalva;
export const salvarPlano = naoSalva;
export const criarCondicao = naoSalva;
export const salvarPreco = naoSalva;
export const excluirPlano = naoFaz;
export const alternarCondicao = naoFaz;
export const excluirCondicao = naoFaz;
export const excluirPreco = naoFaz;

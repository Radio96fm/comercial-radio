// Logos e cores de cada emissora (arquivos em /public/logos).
// O nome da rádio decide qual logo usar; se não reconhecer, não mostra logo.
export function marcaDaRadio(nome = '') {
  const n = nome.toLowerCase();
  if (n.includes('96')) return { logo: '/logos/96fm.png', cor2: '#d9502a' };
  if (n.includes('agro')) return { logo: '/logos/agro.png', cor2: '#00318b' };
  return { logo: null, cor2: null };
}

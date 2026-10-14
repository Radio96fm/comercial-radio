import 'server-only';

// Textos que orientam a IA. A base de conhecimento vem do que o gestor cadastra
// em "Treinar assistente".

export const TIPOS_MATERIAL = {
  testemunhal: 'Testemunhal de exemplo',
  instrucao: 'Regra ou ideia',
  texto: 'Texto de apoio',
  pdf: 'PDF',
  link: 'Link',
};

const LIMITE_BASE = 150000; // caracteres

export const PALAVRAS_POR_SEGUNDO = 2.5;

const REGRAS = `Você é o redator de testemunhais da Rádio 96 FM e da Rádio do Agro (Organização Júlio Capparelli).
Um testemunhal é um texto que o locutor lê AO VIVO, com a própria voz, recomendando o patrocinador para os ouvintes, como quem indica a um amigo.

Quem conversa com você é o vendedor da rádio. Ele conta sobre o cliente (o patrocinador) por texto ou por voz ditada, então pode haver erros de digitação e frases soltas: entenda a intenção.

Como trabalhar:
- Se faltar algo essencial (o que o cliente vende ou o diferencial dele), faça no máximo 2 perguntas curtas e simples. Se der para escrever com o que tem, escreva logo.
- Escreva em português do Brasil, falado, natural, caloroso e direto. Frases curtas, fáceis de ler em voz alta sem tropeçar.
- Fale como o locutor: primeira pessoa ("eu recomendo", "eu conheço"), conversando com o ouvinte.
- Inclua o nome do cliente pelo menos 2 vezes, o diferencial principal e uma chamada para ação clara (endereço, telefone ou WhatsApp, redes sociais), se o vendedor informou.
- Escreva números, telefones e endereços do jeito que se fala (ex.: "nove nove oito, doze, trinta e quatro"), e horários por extenso.
- Nunca invente preço, promoção, endereço ou telefone. Se não foi informado, deixe de fora.
- Respeite o tempo pedido: cerca de ${PALAVRAS_POR_SEGUNDO} palavras por segundo de leitura.
- Siga as regras da casa e o estilo dos testemunhais de exemplo abaixo, quando houver.

Formato da resposta:
- Quando for entregar um testemunhal, coloque SÓ o texto que o locutor vai ler entre as linhas [TESTEMUNHAL] e [/TESTEMUNHAL]. Fora delas, no máximo uma frase curta para o vendedor (ex.: sugestão de ajuste). Não use markdown, asteriscos nem títulos.
- Quando o vendedor pedir ajuste, entregue o testemunhal inteiro de novo, já ajustado, no mesmo formato.
- Quando for só perguntar, não use as marcações.`;

export function montarSistema(materiais) {
  const de = (t) => materiais.filter((m) => m.tipo === t);
  const partes = [REGRAS];
  const regras = de('instrucao');
  if (regras.length) partes.push(`# Regras e ideias da casa (sigam sempre)\n${regras.map((m) => `## ${m.titulo}\n${m.conteudo}`).join('\n\n')}`);
  const exemplos = de('testemunhal');
  if (exemplos.length) partes.push(`# Testemunhais de exemplo (use como referência de estilo, não copie)\n${exemplos.map((m) => `## ${m.titulo}\n${m.conteudo}`).join('\n\n')}`);
  const apoio = materiais.filter((m) => ['texto', 'pdf', 'link'].includes(m.tipo));
  if (apoio.length) partes.push(`# Material de apoio (técnicas de copy, informações das rádios e dos programas)\n${apoio.map((m) => `## ${m.titulo}\n${m.conteudo}`).join('\n\n')}`);
  let texto = partes.join('\n\n');
  if (texto.length > LIMITE_BASE) texto = `${texto.slice(0, LIMITE_BASE)}\n[material cortado por tamanho]`;
  return texto;
}

export function montarContexto({ cliente, programa, duracao }) {
  const linhas = ['# Esta conversa'];
  linhas.push(`Cliente (patrocinador): ${cliente.nome}${cliente.segmento?.nome ? ` (ramo: ${cliente.segmento.nome})` : ''}${cliente.cidade ? `, ${cliente.cidade}` : ''}.`);
  if (cliente.endereco) linhas.push(`Endereço cadastrado: ${cliente.endereco}.`);
  if (cliente.telefone) linhas.push(`Telefone cadastrado: ${cliente.telefone}.`);
  if (cliente.observacoes) linhas.push(`Anotações do vendedor sobre o cliente: ${cliente.observacoes}`);
  if (programa) {
    linhas.push(`Programa onde vai ao ar: ${programa.nome}, na ${programa.radio?.nome || 'rádio'}${programa.apresentador ? `, apresentado por ${programa.apresentador}` : ''}${programa.descricao ? `. Sobre o programa: ${programa.descricao}` : ''}.`);
  }
  linhas.push(`Tempo de leitura desejado: ${duracao} segundos (cerca de ${Math.round(duracao * PALAVRAS_POR_SEGUNDO)} palavras).`);
  return linhas.join('\n');
}

export const PEDIDO_RESUMO = `Este material vai ensinar um redator de testemunhais de rádio (textos que o locutor lê ao vivo recomendando um patrocinador).
Extraia e organize em português do Brasil tudo o que for útil para escrever testemunhais melhores: princípios e técnicas de persuasão e copy, estruturas, gatilhos, fórmulas de abertura e de chamada para ação, exemplos de frases boas, erros a evitar, e informações concretas sobre as rádios, programas e clientes, se houver.
Seja fiel ao material, sem inventar. Use tópicos curtos. Máximo de 1.500 palavras. Responda só com o resumo.`;

export function extrairTestemunhal(texto) {
  const m = texto.match(/\[TESTEMUNHAL\]([\s\S]*?)(\[\/TESTEMUNHAL\]|$)/i);
  if (!m) return null;
  return m[1].trim();
}

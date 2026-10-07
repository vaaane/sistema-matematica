// Jogo de Revisão — geração das perguntas com números sorteados.
// Uso: import { gerarQuestoes } from '/js/jogo-revisao/geradores.js';
//      gerarQuestoes(7, 'B', 'treinador2')  →  [{ id, enunciado, resposta, erradas, explicacao?, dica, tabela? }, ...]
//      explicacao: a conta resolvida desta pergunta (quando existe); dica: lembrete geral do ginásio.
import { MAPAS_1_4 } from './mapas1a4.js';
import { MAPAS_5_8 } from './mapas5a8.js';
import { MAPAS_9_13, perguntasTabela } from './mapas9a13.js';
export { usarSemente, usarAleatorio } from './base.js';

const BANCO = { ...MAPAS_1_4, ...MAPAS_5_8, ...MAPAS_9_13 };
// Lembrete geral de cada ginásio (aparece quando o aluno erra, junto com a explicação).
export const DICAS = {
  '1A': 'Primeiro × e ÷ (da esquerda para a direita), depois + e −.',
  '1B': 'Resolva primeiro o que está dentro de ( ), depois [ ], depois { }.',
  '2A': '× 10, 100, 1000: a vírgula anda 1, 2, 3 casas para a direita. ÷: para a esquerda.',
  '2B': '1 m = 100 cm; 1 kg = 1000 g; 1 L = 1000 mL. Para a unidade menor, multiplique.',
  '3A': 'Somar positivo anda para a direita na reta; somar negativo anda para a esquerda.',
  '3B': 'Sinais iguais dão positivo. Sinais diferentes dão negativo.',
  '4A': 'Fração de um número: divida pelo de baixo e multiplique pelo de cima.',
  '4B': 'Nas contas com decimais, coloque vírgula embaixo de vírgula.',
  '5A': 'O expoente diz quantas vezes a base se multiplica: 2³ = 2 × 2 × 2.',
  '5B': 'Raiz quadrada: qual número vezes ele mesmo dá o valor? Elevado a 0 dá 1.',
  '6A': 'É múltiplo se a divisão não deixa sobra (está na tabuada).',
  '6B': 'É divisor se divide o número sem sobrar. 1 e o próprio número sempre são divisores.',
  '7A': '50% = metade; 25% = ÷ 4; 20% = ÷ 5; 10% = ÷ 10; 1% = ÷ 100.',
  '7B': 'p% vira número decimal dividindo por 100. "De" vira vezes: 20% de 50 = 50 × 0,2.',
  '8A': 'Troque a letra pelo número. 3x quer dizer 3 × x.',
  '8B': 'Só junta termos com a mesma letra: some os números e repita a letra.',
  '9A': 'O que está somando passa subtraindo; o que multiplica passa dividindo.',
  '9B': 'Mais é +, menos é −, dobro é 2x, metade é x ÷ 2.',
  '10A': 'Ache quanto vale 1 unidade e depois multiplique.',
  '10B': 'Diretas: os dois aumentam (multiplica). Inversas: um aumenta e o outro diminui.',
  '11A': 'Perímetro é a soma de todos os lados (o contorno).',
  '11B': 'Área do retângulo = comprimento × largura. Triângulo: base × altura ÷ 2.',
  '12A': 'No ponto (x, y): primeiro o x (lados), depois o y (cima e baixo).',
  '12B': 'Direita soma no x, esquerda subtrai; cima soma no y, baixo subtrai.',
  '13A': 'Média: some e divida. Moda: o que mais aparece. Mediana: o do meio, em ordem.',
  '13B': 'Leia a linha certa da tabela. "A mais" é subtração; "ao todo" é soma.',
};

export const PERSONAGENS = ['treinador1', 'treinador2', 'treinador3', 'lider', 'revanche'];

export function gerarQuestoes(mapa, lado, personagem) {
  const g = BANCO[mapa]?.[lado];
  if (!g) throw new Error(`Mapa ${mapa}${lado} não existe`);
  const n = personagem === 'revanche' ? 3 : 5;
  let qs;
  if (g === 'tabelas') qs = perguntasTabela(personagem, n);
  else {
    const fns = g[personagem]; if (!fns) throw new Error(`Personagem ${personagem} não existe em ${mapa}${lado}`);
    const vistos = new Set(); qs = [];
    for (const f of fns) {
      let q, k; for (let t = 0; t < 30; t++) { q = f(); k = q.enunciado + '|' + q.resposta; if (!vistos.has(k)) break; }
      vistos.add(k); qs.push(q);
    }
  }
  const dica = DICAS[`${mapa}${lado}`];
  return qs.map((q, i) => ({ id: `m${mapa}${lado}-${personagem}-${i + 1}`, ...q, dica }));
}

// Gera UMA pergunta nova do mesmo tipo da posição `indice` (0 a 4; revanche 0 a 2).
// Use quando o aluno erra: a pergunta volta para o fim da fila com outros números.
// Retorna null no Mapa 13 B (tabelas): nesse caso, repita a mesma pergunta.
export function gerarUma(mapa, lado, personagem, indice) {
  const g = BANCO[mapa]?.[lado];
  if (!g || g === 'tabelas') return null;
  const f = g[personagem]?.[indice]; if (!f) return null;
  return { id: `m${mapa}${lado}-${personagem}-${indice + 1}`, ...f(), dica: DICAS[`${mapa}${lado}`] };
}

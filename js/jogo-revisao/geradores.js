// Jogo de Revisão — geração das perguntas com números sorteados.
// Uso: import { gerarQuestoes } from '/js/jogo-revisao-geradores.js';
//      gerarQuestoes(7, 'B', 'treinador2')  →  [{ id, enunciado, resposta, erradas, tabela? }, ...]
import { MAPAS_1_4 } from './mapas1a4.js';
import { MAPAS_5_8 } from './mapas5a8.js';
import { MAPAS_9_13, perguntasTabela } from './mapas9a13.js';
export { usarSemente, usarAleatorio } from './base.js';

const BANCO = { ...MAPAS_1_4, ...MAPAS_5_8, ...MAPAS_9_13 };
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
  return qs.map((q, i) => ({ id: `m${mapa}${lado}-${personagem}-${i + 1}`, ...q }));
}

// Gera UMA pergunta nova do mesmo tipo da posição `indice` (0 a 4; revanche 0 a 2).
// Use quando o aluno erra: a pergunta volta para o fim da fila com outros números.
// Retorna null no Mapa 13 B (tabelas): nesse caso, repita a mesma pergunta.
export function gerarUma(mapa, lado, personagem, indice) {
  const g = BANCO[mapa]?.[lado];
  if (!g || g === 'tabelas') return null;
  const f = g[personagem]?.[indice]; if (!f) return null;
  return { id: `m${mapa}${lado}-${personagem}-${indice + 1}`, ...f() };
}

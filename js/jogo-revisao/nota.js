// Jogo de Revisão — nota do jogo completo (vale 10 pontos).
// Usada no estojo de insígnias (js/jogo-revisao.js) e na ficha do aluno (aluno/a-ficha.html).
//   nota = 8 × (insígnias / 26) + 2 × (douradas / 26)
// Para mudar a divisão, altere só os pesos abaixo.
export const TOTAL_INSIGNIAS = 26;
export const PESO_INSIGNIAS  = 8;    // as 26 insígnias normais valem 8,0
export const PESO_DOURADAS   = 2;    // as 26 douradas (revanches) valem mais 2,0
export const NOTA_MAX        = PESO_INSIGNIAS + PESO_DOURADAS;

export function notaJogoRevisao(insignias, douradas) {
  const n = PESO_INSIGNIAS * insignias / TOTAL_INSIGNIAS + PESO_DOURADAS * douradas / TOTAL_INSIGNIAS;
  return Math.round(Math.min(NOTA_MAX, n) * 10) / 10;
}

export const formatarNota = (n) => n.toFixed(1).replace('.', ',');

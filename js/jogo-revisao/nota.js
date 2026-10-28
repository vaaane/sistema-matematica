// Jogo de Revisão — nota do jogo completo (vale 10 pontos).
// Usada no estojo de insígnias (js/jogo-revisao.js), na ficha do aluno (aluno/a-ficha.html), no painel da professora
// (professor/p-jogo-revisao.html) e nas notas (js/notas.js).
//   nota = 8 × (insígnias / 26) + 2 × min(1, XP do jogo / 2000)        (PROMPT-156: as douradas dão XP, sem peso próprio)
// Para mudar a divisão, altere só os pesos abaixo.
export const TOTAL_INSIGNIAS = 26;
export const PESO_INSIGNIAS  = 8;     // as 26 insígnias (com ou sem dourada) valem 8,0
export const PESO_XP         = 2;     // a experiência do jogo vale 2,0
export const XP_META         = 2000;  // com 2000 XP do jogo, os 2,0 inteiros
export const XP_DIA          = 200;   // no máximo 200 XP do jogo por dia (o que passar não conta)
export const NOTA_MAX        = PESO_INSIGNIAS + PESO_XP;

export const notaXP = (xpJogo) => PESO_XP * Math.min(1, Math.max(0, Number(xpJogo) || 0) / XP_META);

export function notaJogoRevisao(insignias, xpJogo) {
  const n = PESO_INSIGNIAS * Math.min(TOTAL_INSIGNIAS, Number(insignias) || 0) / TOTAL_INSIGNIAS + notaXP(xpJogo);
  return Math.round(Math.min(NOTA_MAX, n) * 10) / 10;
}

export const formatarNota = (n) => n.toFixed(1).replace('.', ',');

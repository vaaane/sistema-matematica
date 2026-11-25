// Jogo de Revisão — nota do jogo completo (vale 10 pontos).
// Usada no estojo de insígnias (js/jogo-revisao.js), na ficha do aluno (aluno/a-ficha.html), no painel da professora
// (professor/p-jogo-revisao.html) e nas notas (js/notas.js).
//   nota = 10 × (insígnias / 26)        (PROMPT-278: só as insígnias; o XP do jogo continua existindo, mas não vale nota)
// Para mudar a divisão, altere só os pesos abaixo.
export const TOTAL_INSIGNIAS = 26;
export const PESO_INSIGNIAS  = 10;    // as 26 insígnias (com ou sem dourada) valem 10,0
export const PESO_XP         = 0;     // a experiência do jogo não vale nota (PROMPT-278)
export const XP_META         = 2000;  // (só para mostrar o XP do jogo; não entra na nota)
export const XP_DIA          = 200;   // no máximo 200 XP do jogo por dia (o que passar não conta)
export const NOTA_MAX        = PESO_INSIGNIAS + PESO_XP;

export const notaXP = (xpJogo) => PESO_XP * Math.min(1, Math.max(0, Number(xpJogo) || 0) / XP_META);

// O 2º argumento (xpJogo) é ignorado enquanto PESO_XP = 0; fica para não quebrar quem ainda o passa.
export function notaJogoRevisao(insignias, xpJogo = 0) {
  const n = PESO_INSIGNIAS * Math.min(TOTAL_INSIGNIAS, Number(insignias) || 0) / TOTAL_INSIGNIAS + notaXP(xpJogo);
  return Math.round(Math.min(NOTA_MAX, n) * 10) / 10;
}

export const formatarNota = (n) => n.toFixed(1).replace('.', ',');

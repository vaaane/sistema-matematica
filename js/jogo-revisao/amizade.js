// ❤️ Amizade com os NPCs (PROMPT-238): regras puras — nível, falas que lembram do aluno e o presente do nível 5.
// Os dados vêm de dados/jogo/amizade.json; a tela e o banco ficam em js/jogo-revisao.js.
// No estado do aluno: amizade/{npc} = { p: pontos, conversa: 'AAAA-MM-DD', t: ms da última conversa, viu: nível da última história vista,
//   presente: true, tesouro: 'guardado' (o mapa da Nina, entregue no PROMPT-239) }

let A = null;
export function definirAmizade(json) { A = json; }
export const amizadePronta = () => !!A?.npcs;
export const npcAmizade = (id) => A?.npcs?.[id] || null;
export const ganhoAmizade = (k) => Number(A?.ganhos?.[k]) || 0;
const NIVEIS = () => (Array.isArray(A?.niveis) && A.niveis.length ? A.niveis : [0, 10, 25, 45, 70, 100]);
export const NIVEL_MAX = 5;
export const nomeNivel = (n) => (A?.nomes_niveis || ['estranho', 'conhecido', 'colega', 'amigo', 'grande amigo', 'melhor amigo'])[n] || '';

// nível = o maior i com pontos >= niveis[i] (0 a 5)
export function nivelDe(pontos) {
  const p = Number(pontos) || 0, nv = NIVEIS();
  let n = 0;
  for (let i = 0; i < nv.length; i++) if (p >= nv[i]) n = i;
  return Math.min(NIVEL_MAX, n);
}
// a barra até o próximo nível: { nivel, de, ate, frac } (no 5: frac 1)
export function progresso(pontos) {
  const p = Number(pontos) || 0, n = nivelDe(p), nv = NIVEIS();
  if (n >= NIVEL_MAX || nv[n + 1] == null) return { nivel: n, de: nv[n] || 0, ate: null, frac: 1 };
  return { nivel: n, de: nv[n], ate: nv[n + 1], frac: Math.max(0, Math.min(1, (p - nv[n]) / (nv[n + 1] - nv[n]))) };
}
export const coracoes = (n) => '❤️'.repeat(n) + '🤍'.repeat(Math.max(0, NIVEL_MAX - n));

// troca as {variáveis}; falta alguma (ou {nome} no nível 0) → null (a fala é pulada)
export function preencher(texto, vars, nivel) {
  if (typeof texto !== 'string' || !texto) return null;
  if (nivel < 1 && texto.includes('{nome}')) return null;
  let falta = false;
  const out = texto.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars?.[k];
    if (v == null || v === '') { falta = true; return ''; }
    return String(v);
  });
  return falta ? null : out.charAt(0).toUpperCase() + out.slice(1);   // "{conteudo} te pegou…": começa com maiúscula
}
const tomDe = (npc) => A?.falas_tom?.[npcAmizade(npc)?.tom] || A?.falas_tom?.acolhedor || null;

// a saudação pelo nível: oi[0] (só o 0), oi[1] (1 a 3), oi[2] (4 e 5); sorteia uma das duas
export function saudacao(npc, nivel, vars, rnd = Math.random) {
  const oi = tomDe(npc)?.oi;
  if (!Array.isArray(oi)) return null;
  const faixa = nivel >= 4 ? 2 : nivel >= 1 ? 1 : 0;
  const ops = [...(oi[faixa] || [])].sort(() => rnd() - 0.5);
  for (const f of ops) { const t = preencher(f, vars, nivel); if (t) return t; }
  for (const f of oi[0] || []) { const t = preencher(f, vars, nivel); if (t) return t; }   // a de estranho não usa o nome
  return null;
}
// a fala de memória: motivos já na ordem de prioridade [{ tipo, vars }]; a 1ª que der para preencher
export const ORDEM_MEMORIA = ['ausente', 'erro', 'venceu', 'perdeu', 'insignia', 'torre', 'pet'];
export function memoria(npc, nivel, motivos, varsBase) {
  const tom = tomDe(npc);
  if (!tom) return null;
  for (const m of motivos) {
    const t = preencher(tom[m.tipo], { ...varsBase, ...m.vars }, nivel);
    if (t) return { tipo: m.tipo, texto: t };
  }
  return null;
}
export const falaTom = (npc, chave, vars, nivel) => preencher(tomDe(npc)?.[chave], vars, nivel);
export const historia = (npc, nivel) => (nivel >= 1 ? npcAmizade(npc)?.historia?.[nivel - 1] || null : null);
export const presenteDe = (npc) => npcAmizade(npc)?.presente || null;

// dias inteiros entre duas datas 'AAAA-MM-DD'
export function diasEntre(a, b) {
  const d = (s) => { const [y, m, dd] = String(s).split('-').map(Number); return Date.UTC(y, m - 1, dd); };
  if (!a || !b) return 0;
  return Math.round((d(b) - d(a)) / 864e5);
}

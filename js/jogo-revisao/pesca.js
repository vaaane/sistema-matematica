// Jogo de Revisão — pesca: regras puras (pontos, sorteio do peixe, poses e ponta da vara).
// Dados em dados/jogo/pesca.json e dados/jogo/pesca-sprites.json; a tela fica em js/jogo-revisao.js.

let P = null, SP = null;
export function definirPesca(json, sprites) { P = json; SP = sprites; }
export const pescaPronta = () => !!(P?.pontos?.length && SP?.ancora);
export const cfgPesca = () => P?.config || {};
export const pontosDoMapa = (n) => (P?.pontos || []).filter(p => p.mapa === n);
export const spritePesca = () => SP || {};
export const pontaVara = (pers, pose) => SP?.ponta_vara?.[pers]?.[pose] || null;

// sorteio pela `chance` (pesos)
export function sortearPeixe(ponto, rnd = Math.random) {
  const ps = ponto?.peixes || [];
  const tot = ps.reduce((a, f) => a + (Number(f.chance) || 0), 0);
  let x = rnd() * tot;
  for (const f of ps) { x -= Number(f.chance) || 0; if (x < 0) return f; }
  return ps[ps.length - 1] || null;
}

export const entre = ([a, b], rnd = Math.random) => a + rnd() * (b - a);
export const inteiroEntre = ([a, b], rnd = Math.random) => a + Math.floor(rnd() * (b - a + 1));

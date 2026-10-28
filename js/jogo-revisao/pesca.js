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

// ── Semana do ranking de pesca: de segunda 00:00 a domingo 23:59 em Brasília. Chave = data da segunda ("2026-10-12") ──
const FUSO = 'America/Sao_Paulo';
function dataEmBrasilia(d) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(d).map(x => [x.type, x.value]));
  return new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)));
}
const chaveDia = (u) => u.toISOString().slice(0, 10);
export function semanaPesca(d = new Date()) {
  const u = dataEmBrasilia(d);
  u.setUTCDate(u.getUTCDate() - ((u.getUTCDay() + 6) % 7));   // volta até a segunda
  return chaveDia(u);
}
export function semanaAnterior(chave) {
  const u = new Date(chave + 'T00:00:00Z');
  u.setUTCDate(u.getUTCDate() - 7);
  return chaveDia(u);
}

// ── Minijogo da barrinha: posições de 0 (fundo) a 1 (topo) ──
// zona verde: z = base, h = altura; segurando sobe, solto cai (gravidade + um pouco de inércia)
// peixe: y = centro; anda até um alvo e troca de alvo a cada `muda_s`; dificuldade 5 dá arrancadas
const SOBE = 3.2, GRAVIDADE = 2.6, VZ_MAX = 1.5;
export function cfgBarrinha(dif) {
  const b = P?.config?.barrinha || {};
  const d = b[String(Math.min(5, Math.max(1, Number(dif) || 1)))] || { zona: 0.28, velocidade: 0.35, muda_s: [1.5, 3], arrancada: 0 };
  return { ...d, enche: b.enche_s ?? 0.16, esvazia: (b.esvazia_s ?? 0.12) + 0.01 * (Number(dif) || 1) };
}
export function criarBarrinha(dif, rnd = Math.random) {
  const c = cfgBarrinha(dif);
  // o peixe começa no alto, longe da zona verde (que começa no fundo): ficar parado não pega o peixe
  return { c, rnd, z: 0, vz: 0, h: c.zona, y: 0.65, vy: 0, alvo: 0.55 + rnd() * 0.4, muda: c.muda_s[0], arranca: 0,
    captura: P?.config?.captura_inicial ?? 0.4, fim: null };
}
// avança dt segundos; devolve o próprio estado (fim: 'pegou' | 'escapou')
export function passoBarrinha(b, dt, segurando) {
  if (b.fim) return b;
  dt = Math.min(dt, 0.05);
  // zona verde
  b.vz = Math.max(-VZ_MAX, Math.min(VZ_MAX, b.vz + (segurando ? SOBE : -GRAVIDADE) * dt));
  b.z += b.vz * dt;
  if (b.z <= 0) { b.z = 0; b.vz = b.vz < -0.4 ? -b.vz * 0.25 : 0; }   // quica de leve no fundo
  if (b.z >= 1 - b.h) { b.z = 1 - b.h; b.vz = Math.min(0, b.vz); }
  // peixe
  b.muda -= dt; b.arranca -= dt;
  if (b.muda <= 0) {
    b.muda = b.c.muda_s[0] + b.rnd() * (b.c.muda_s[1] - b.c.muda_s[0]);
    b.alvo = 0.06 + b.rnd() * 0.88;
    if (b.c.arrancada && b.rnd() < b.c.arrancada) b.arranca = 0.45;
  }
  const vmax = b.c.velocidade * (b.arranca > 0 ? 2.5 : 1);
  const dy = b.alvo - b.y, querida = Math.sign(dy) * Math.min(vmax, Math.abs(dy) * 4);
  b.vy += (querida - b.vy) * Math.min(1, dt * 6);
  b.y = Math.max(0.03, Math.min(0.97, b.y + b.vy * dt));
  // captura
  const dentro = b.y >= b.z && b.y <= b.z + b.h;
  b.dentro = dentro;
  b.captura = Math.max(0, Math.min(1, b.captura + (dentro ? b.c.enche : -b.c.esvazia) * dt));
  if (b.captura >= 1) b.fim = 'pegou';
  else if (b.captura <= 0) b.fim = 'escapou';
  return b;
}

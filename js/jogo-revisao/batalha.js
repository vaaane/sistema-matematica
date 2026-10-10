// Jogo de Revisão — Batalha de Pets: regras puras (contas, força do treinador, dano, prêmios).
// Tudo vem de dados/jogo/batalhas.json; a tela fica em js/jogo-revisao.js.

let B = null;
export function definirBatalhas(json) { B = json; }
export const batalhasProntas = () => !!B?.treinadores?.length;
export const cfgBatalha = () => B?.config || {};
export const treinadores = () => [...(B?.treinadores || [])].sort((a, b) => a.nivel - b.nivel);
export const treinador = (id) => B?.treinadores?.find(t => t.id === id) || null;

const r = (a, b, rnd = Math.random) => a + Math.floor(rnd() * (b - a + 1));
const MENOS = '−';
const num = (n) => (n < 0 ? MENOS + Math.abs(n) : String(n));
const par = (n) => (n < 0 ? `(${num(n)})` : String(n));   // negativo entre parênteses dentro da conta

// ── Contas rápidas ──────────────────────────────────────────
const GERA = {
  tabuada: (rnd) => { const a = r(2, 9, rnd), b = r(2, 9, rnd); return { conta: `${a} × ${b}`, resposta: a * b }; },
  soma_inteiros: (rnd) => { const a = r(-12, 12, rnd), b = r(-12, 12, rnd); return { conta: `${par(a)} + ${par(b)}`, resposta: a + b }; },
  mult_inteiros: (rnd) => {
    const nz = () => { let x = 0; while (!x) x = r(-9, 9, rnd); return x; };
    const a = nz(), b = nz();
    return { conta: `${par(a)} × ${par(b)}`, resposta: a * b };
  },
  potencia: (rnd) => { const b = r(2, 5, rnd), e = r(2, 3, rnd); return { conta: `${b}${e === 2 ? '²' : '³'}`, resposta: b ** e }; },
  raiz: (rnd) => { const k = r(1, 12, rnd); return { conta: `√${k * k}`, resposta: k }; },
  expressao_curta: (rnd) => {
    const f = r(0, 2, rnd);
    if (f === 0) { const a = r(1, 9, rnd), b = r(2, 6, rnd), c = r(2, 6, rnd); return { conta: `${a} + ${b} × ${c}`, resposta: a + b * c }; }
    if (f === 1) { const a = r(2, 6, rnd), b = r(2, 6, rnd), c = r(1, 9, rnd); return { conta: `${MENOS}${a} × ${b} + ${c}`, resposta: -a * b + c }; }
    const a = r(2, 6, rnd), b = r(2, 6, rnd), c = r(1, 12, rnd); return { conta: `${a} × ${b} − ${c}`, resposta: a * b - c };
  },
};

// 3 erradas próximas da certa, sem repetir (inclui o sinal trocado, erro comum com inteiros)
function erradasPara(ans, tipo, rnd) {
  const cand = new Set();
  if (ans !== 0 && tipo !== 'tabuada' && tipo !== 'potencia' && tipo !== 'raiz') cand.add(-ans);
  const passos = tipo === 'tabuada' || tipo === 'potencia' ? [1, 2, 3, 4, 5, 6, 8, 10] : [1, 2, 3, 4, 5, 6];
  let tent = 0;
  while (cand.size < 8 && tent++ < 60) {
    const d = passos[r(0, passos.length - 1, rnd)] * (rnd() < 0.5 ? -1 : 1);
    const v = ans + d;
    if (v !== ans && !((tipo === 'tabuada' || tipo === 'potencia' || tipo === 'raiz') && v < 0)) cand.add(v);
  }
  cand.delete(ans);
  const lista = [...cand];
  const out = [];
  if (lista.includes(-ans) && rnd() < 0.7) { out.push(-ans); lista.splice(lista.indexOf(-ans), 1); }
  while (out.length < 3 && lista.length) out.push(lista.splice(r(0, lista.length - 1, rnd), 1)[0]);
  for (let k = 1; out.length < 3; k++) if (!out.includes(ans + k) && ans + k !== ans) out.push(ans + k);   // nunca falta
  return out;
}

// Conta do nível (1–5) de contas: { conta, resposta, opcoes: [4 números embaralhados], tipo }
export function gerarConta(nivel, rnd = Math.random) {
  const tipos = B?.niveis_contas?.[String(nivel)] || ['tabuada'];
  const tipo = tipos[r(0, tipos.length - 1, rnd)];
  const { conta, resposta } = (GERA[tipo] || GERA.tabuada)(rnd);
  const opcoes = [resposta, ...erradasPara(resposta, tipo, rnd)];
  for (let i = opcoes.length - 1; i > 0; i--) { const j = r(0, i, rnd); [opcoes[i], opcoes[j]] = [opcoes[j], opcoes[i]]; }
  return { conta, resposta, opcoes, tipo };
}
export const mostrarNumero = num;

// ── Desafio de cada aluno com cada treinador ───────────────
// salvo: { nivel, vitorias, derrotas, estado: 'disponivel' | 'perdeu' | 'venceu', descansa_ate }
export function desafioDe(salvo) {
  return { nivel: Math.max(1, Number(salvo?.nivel) || 1), vitorias: Number(salvo?.vitorias) || 0, derrotas: Number(salvo?.derrotas) || 0,
    estado: salvo?.estado || 'disponivel', descansa_ate: Number(salvo?.descansa_ate) || 0 };
}

// Situação agora: descansando (venceu há menos de 24 h), revanche (perdeu) ou disponível
export function situacao(d, agora = Date.now()) {
  if (d.estado === 'venceu' && agora < d.descansa_ate) return 'descansando';
  if (d.estado === 'perdeu') return 'revanche';
  return 'disponivel';
}

// Força do treinador no nível de desafio do aluno: a cada nível acima de 1, acerta mais e responde mais rápido;
// as contas sobem 1 nível a cada N vitórias do aluno contra ele
export function forca(t, d) {
  const rv = cfgBatalha().revanche || {};
  const k = d.nivel - 1;
  const acerto = Math.min(rv.acerto_max ?? 0.95, t.acerto + (rv.aumento_acerto ?? 0.06) * k);
  const fator = (1 - (rv.reducao_tempo ?? 0.1)) ** k;
  const tmin = rv.tempo_min_s ?? 1.5;
  const tempo = [Math.max(tmin, +(t.tempo_s[0] * fator).toFixed(2)), Math.max(tmin, +(t.tempo_s[1] * fator).toFixed(2))];
  const contas = Math.min(rv.nivel_contas_max ?? 5, t.nivel + Math.floor(d.vitorias / (rv.sobe_nivel_contas_a_cada_vitorias || 2)));
  return { acerto, tempo, contas };
}

// Dano de um acerto em t segundos (crítico até critico_ate_s)
export function dano(t) {
  const c = cfgBatalha();
  const T = c.tempo_s || 15;
  const critico = t <= (c.critico_ate_s ?? 3);
  return { n: Math.round((c.dano_base ?? 10) + (c.dano_rapidez ?? 18) * Math.max(0, 1 - t / T)) + (critico ? (c.bonus_critico ?? 4) : 0), critico };
}

// Prêmios de uma batalha, já dentro do limite do dia. dia: { data, moedas, lealdade, xp } (de hoje).
// resultado: 'venceu' | 'perdeu' | 'saiu' (saiu = derrota sem prêmio)
export function premios(resultado, d, dia, lealdadeAtual) {
  const c = cfgBatalha(), lim = c.limites_dia || {};
  const zero = { moedas: 0, lealdade: 0, xp: 0, bonusPrimeira: 0, cortado: false };
  if (resultado === 'saiu') return zero;
  const base = (c.premios || {})[resultado === 'venceu' ? 'vitoria' : 'derrota'] || {};
  let moedas = base.moedas || 0;
  if (resultado === 'venceu' && d.nivel >= 3) moedas += 2 * (d.nivel - 2);   // nível alto vale mais (dentro do limite)
  const cabe = (k, v) => Math.max(0, Math.min(v, (lim[k] ?? Infinity) - (Number(dia[k]) || 0)));
  const p = {
    moedas: cabe('moedas', moedas),
    lealdade: Math.min(cabe('lealdade', base.lealdade || 0), Math.max(0, 100 - (Number(lealdadeAtual) || 0))),
    xp: cabe('xp', base.xp || 0),
    bonusPrimeira: resultado === 'venceu' && d.vitorias === 0 ? (c.premios?.primeira_vitoria_bonus_moedas || 0) : 0,   // fora do limite
  };
  p.cortado = p.moedas < moedas || cabe('lealdade', base.lealdade || 0) < (base.lealdade || 0) || p.xp < (base.xp || 0);
  return p;
}

// Depois da batalha: novo registro do desafio
export function depoisDaBatalha(d, resultado, agora = Date.now()) {
  const rv = cfgBatalha().revanche || {};
  if (resultado === 'venceu') return { nivel: d.nivel + 1, vitorias: d.vitorias + 1, derrotas: d.derrotas, estado: 'venceu', descansa_ate: agora + (rv.descanso_horas ?? 24) * 3600e3 };
  return { nivel: d.nivel, vitorias: d.vitorias, derrotas: d.derrotas + 1, estado: 'perdeu', descansa_ate: 0 };
}

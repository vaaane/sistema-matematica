import { int, pick, shuffle, sample, coin, num, reais, arred, ehInteiro, avaliar, montar,
  erradasNum, erradasTexto, frac, simpl, mdc, mmc, erradasFrac } from './base.js';

export const Q = (e, r, x, extra = {}) => ({ enunciado: e, resposta: r, erradas: x, ...extra });

// ---------- expressão genérica com sorteio ----------
// r: { a:[min,max] | [lista] }  opções: min, max, neg (resposta pode ser negativa), paren (negativos sempre entre parênteses)
export function expr(modelo, r, o = {}) {
  const { max = 9999, neg = false, paren = false, cand = () => [], inteiro = true } = o; const min = o.min ?? (neg ? -9999 : 0);
  for (let k = 0; k < 400; k++) {
    const vals = {};
    for (const [n, f] of Object.entries(r)) vals[n] = o.lista?.includes(n) ? pick(f) : int(f[0], f[1]);
    if (o.cond && !o.cond(vals)) continue;
    const s = montar(modelo, vals, paren);
    const { v, exata } = avaliar(s);
    if (inteiro && !exata) continue;
    if (!isFinite(v) || v < min || v > max) continue;
    if (!neg && v < 0) continue;
    const c = [avaliar(s, 'esq').v, avaliar(s, 'semparen').v, ...cand(v, vals)];
    const x = erradasNum(v, c, { neg: neg || v < 0, inteiro: inteiro && ehInteiro(v) ? true : null });
    return Q(s, num(v), x);
  }
  throw new Error('expr sem solução: ' + modelo);
}
const L = arr => arr; // marcador de lista
const E = (m, r, o) => () => expr(m, r, o);

// ===================== MAPA 1 =====================
const nomesItens = [['picolés', 'picolé'], ['pães', 'pão'], ['canetas', 'caneta'], ['lápis', 'lápis'], ['chicletes', 'chiclete']];
function compra() {
  const q = int(2, 5), p = int(2, 6), p2 = int(3, 8), [ip] = pick(nomesItens);
  const v = q * p + p2;
  return Q(`Comprei ${q} ${ip} de R$ ${p} e 1 suco de R$ ${p2}. Quanto gastei?`, reais(v), erradasNum(v, [(q * (p + p2)), q + p + p2, q * p], { fmt: reais }));
}
function sobrou() {
  const q = int(2, 4), p = int(2, 7), T = q * p + int(1, 12);
  const v = T - q * p;
  return Q(`Tinha R$ ${T} e comprei ${q} cadernos de R$ ${p}. Quanto sobrou?`, reais(v), erradasNum(v, [T - p, T - q - p, q * p], { fmt: reais }));
}
function caixas() {
  const n = int(2, 6), k = int(3, 8), s = int(1, 6);
  const v = n * k + s;
  return Q(`São ${n} caixas com ${k} lápis cada e mais ${s} lápis soltos. Quantos lápis ao todo?`, num(v), erradasNum(v, [n * (k + s), n + k + s, n * k]));
}
function repartir() {
  const k = int(2, 6), q = int(3, 8), e = int(1, 4), N = k * q;
  const v = q + e;
  return Q(`${N} balas foram divididas entre ${k} amigos e cada um ganhou mais ${e}. Com quantas cada um ficou?`, num(v), erradasNum(v, [N / (k + e), q, N + e]));
}
function troco() {
  const q = int(2, 3), p = int(2, 4), T = pick([10, 20]);
  const v = T - q * p;
  return Q(`Comprei ${q} pacotes de R$ ${p} e paguei com R$ ${T}. Qual o troco?`, reais(v), erradasNum(v, [T - p, q * p, T - q - p], { fmt: reais }));
}
function ganhoDias() {
  const g = int(2, 6), d = int(3, 6), c = int(2, 9);
  const v = g * d - c;
  return Q(`Ganhei R$ ${g} por dia durante ${d} dias e gastei R$ ${c}. Quanto tenho?`, reais(v), erradasNum(v, [g * (d - c), g + d - c, g * d + c], { fmt: reais }));
}
function ingressos() {
  const q = int(2, 4), p = int(8, 15), d = int(2, 6);
  const v = q * p - d;
  return Q(`${q} adultos compraram ingressos de R$ ${p} cada e ganharam R$ ${d} de desconto no total. Quanto pagaram?`, reais(v), erradasNum(v, [q * (p - d), q * p, q + p - d], { fmt: reais }));
}

const M1 = {
  A: {
    treinador1: [E('a + b × c', { a: [2, 12], b: [2, 6], c: [2, 6] }), E('a + b × c', { a: [2, 12], b: [2, 6], c: [2, 6] }), E('a × b + c', { a: [2, 7], b: [2, 6], c: [1, 9] }), E('a + b × c', { a: [2, 12], b: [2, 6], c: [2, 6] }), E('a × b + c', { a: [2, 7], b: [2, 6], c: [1, 9] })],
    treinador2: [E('a − b ÷ c', { a: [10, 25], b: [4, 30], c: [2, 5] }), E('a + b ÷ c', { a: [2, 12], b: [4, 30], c: [2, 5] }), E('b ÷ c + a', { a: [2, 12], b: [4, 30], c: [2, 5] }), E('a − b ÷ c', { a: [10, 25], b: [4, 30], c: [2, 5] }), E('b ÷ c + a', { a: [2, 12], b: [4, 30], c: [2, 5] })],
    treinador3: [E('a × b − c', { a: [2, 7], b: [2, 6], c: [1, 9] }), E('a − b × c', { a: [15, 40], b: [2, 5], c: [2, 5] }), E('a × b − c', { a: [2, 7], b: [2, 6], c: [1, 9] }), E('a − b × c', { a: [15, 40], b: [2, 5], c: [2, 5] }), E('a × b − c', { a: [2, 7], b: [2, 6], c: [1, 9] })],
    lider: [E('a × b + c × d', { a: [2, 5], b: [2, 5], c: [2, 5], d: [2, 5] }), E('a ÷ b + c × d', { a: [4, 30], b: [2, 5], c: [2, 5], d: [2, 4] }), E('a − b × c + d', { a: [12, 30], b: [2, 4], c: [2, 4], d: [1, 9] }), E('a + b ÷ c − d', { a: [4, 12], b: [6, 30], c: [2, 6], d: [1, 5] }), E('a × b − c ÷ d', { a: [3, 7], b: [2, 5], c: [4, 20], d: [2, 4] })],
    revanche: [E('a × b + c ÷ d − e', { a: [2, 5], b: [2, 5], c: [6, 24], d: [2, 6], e: [1, 6] }), E('a − b × c − d ÷ e', { a: [30, 60], b: [2, 5], c: [2, 5], d: [6, 20], e: [2, 5] }), E('a × b × c + d ÷ e', { a: [2, 3], b: [2, 3], c: [2, 4], d: [6, 18], e: [2, 6] })],
  },
  B: {
    treinador1: [E('(a + b) × c', { a: [2, 8], b: [1, 7], c: [2, 4] }), E('a − (b + c)', { a: [10, 20], b: [1, 5], c: [1, 5] }), E('a × (b − c)', { a: [2, 6], b: [5, 9], c: [1, 4] }), E('(a − b) ÷ c', { a: [8, 30], b: [1, 6], c: [2, 5] }), E('(a + b) × c', { a: [2, 8], b: [1, 7], c: [2, 4] })],
    treinador2: [E('[a − (b + c)] × d', { a: [8, 15], b: [1, 4], c: [1, 4], d: [2, 3] }), E('[a − (b + c)] ÷ d', { a: [12, 30], b: [1, 6], c: [1, 6], d: [2, 4] }), E('a × [b + (c − d)]', { a: [2, 3], b: [2, 6], c: [4, 9], d: [1, 3] }), E('[(a + b) × c] − d', { a: [2, 6], b: [1, 5], c: [2, 3], d: [1, 6] }), E('[a ÷ (b + c)] + d', { a: [6, 30], b: [1, 4], c: [1, 4], d: [1, 9] })],
    treinador3: [compra, sobrou, caixas, repartir, troco],
    lider: [E('(a + b) × c − d', { a: [2, 7], b: [1, 6], c: [2, 3], d: [1, 9] }), E('a × (b − c) + d', { a: [2, 4], b: [5, 9], c: [1, 4], d: [1, 9] }), E('[a − (b × c)] ÷ d', { a: [10, 30], b: [2, 3], c: [2, 3], d: [2, 4] }), ganhoDias, E('a ÷ (b + c) × d', { a: [10, 40], b: [1, 5], c: [1, 5], d: [2, 3] })],
    revanche: [E('a × [b − (c − d)] + e', { a: [2, 3], b: [6, 12], c: [4, 8], d: [1, 3], e: [1, 9] }), E('{a − [b × (c + d)]} ÷ e', { a: [20, 40], b: [2, 4], c: [1, 3], d: [1, 3], e: [2, 3] }), ingressos],
  },
};

// ===================== MAPA 2 =====================
const zeros = (v, k) => [v * k * 10, v / 10, v * 10, v / k, v * 100];
function vezes(k, dec = false) {
  return () => {
    const a = dec ? arred(int(11, 99) / pick([10, 100])) : int(2, 99);
    const v = arred(a * k);
    return Q(`${num(a)} × ${k}`, num(v), erradasNum(v, [v * 10, v / 10, a, v / 100], { inteiro: false }));
  };
}
function divide(k, exata = true) {
  return () => {
    const v0 = exata ? int(2, 99) : arred(int(11, 999) / k);
    const a = exata ? v0 * k : int(11, 999);
    const v = arred(a / k);
    return Q(`${num(a)} ÷ ${k}`, num(v), erradasNum(v, [v * 10, v / 10, a, v * 100], { inteiro: false }));
  };
}
const UNID = [
  ['metros', 'centímetros', 'cm', 100], ['quilos', 'gramas', 'g', 1000], ['litros', 'mililitros', 'mL', 1000],
];
function converte(inverso = false, decimal = false) {
  return () => {
    const [de, para, sim, k] = pick(UNID);
    if (!inverso) {
      const a = decimal ? arred(int(11, 49) / 10) : int(2, 9);
      const v = arred(a * k);
      return Q(`${num(a)} ${a === 1 ? de.replace(/s$/, '') : de} são quantos ${para}?`, `${num(v)} ${sim}`, erradasNum(v, [v * 10, v / 10, a * 10], { fmt: x => `${num(x)} ${sim}`, inteiro: false }));
    }
    const simDe = { metros: 'm', quilos: 'kg', litros: 'L' }[de];
    const a = decimal ? int(1, 9) * k / 4 * (k === 100 ? 1 : 1) : int(2, 9) * k;
    const v = arred(a / k);
    return Q(`${num(a)} ${para} são quantos ${de}?`, `${num(v)} ${simDe}`, erradasNum(v, [v * 10, v / 10, v + 1], { fmt: x => `${num(x)} ${simDe}`, inteiro: false }));
  };
}
function pacotes() {
  const p = int(2, 9), k = pick([10, 100]); const v = p * k;
  return Q(`Um pacote custa R$ ${p}. Quanto custam ${k} pacotes?`, reais(v), erradasNum(v, [v * 10, v / 10, p], { fmt: reais }));
}
function balas() {
  const p = pick([0.25, 0.15, 0.35, 0.45, 0.05]), k = 10; const v = arred(p * k);
  return Q(`Uma bala custa ${reais(p)}. Quanto custam ${k} balas?`, reais(v), erradasNum(v, [v * 10, p, v / 10], { fmt: reais, inteiro: false }).filter(s => /^R\$ \d+(,\d\d)?$/.test(s)));
}
const M2 = {
  A: {
    treinador1: [vezes(10), vezes(10), vezes(10), vezes(10), vezes(10)],
    treinador2: [vezes(100), vezes(1000), vezes(100), vezes(1000), vezes(100)],
    treinador3: [divide(10), divide(100), divide(1000), divide(10), divide(100)],
    lider: [vezes(100), divide(10), vezes(1000), divide(1000), vezes(10)],
    revanche: [E('a × 10 × 10', { a: [11, 99] }, { cand: v => [v * 10, v / 10, v / 100] }), E('a ÷ 10 ÷ 10', { a: [2, 9] }, { cond: () => true, cand: v => [v * 10, v * 100] }),
      E('a × 100 + b × 10', { a: [2, 9], b: [2, 9] }, { cand: v => [v * 10, v / 10] })],
  },
  B: {
    treinador1: [vezes(10, true), vezes(10, true), vezes(100, true), vezes(100, true), vezes(1000, true)],
    treinador2: [divide(10, false), divide(10, false), divide(100, false), divide(100, false), divide(100, false)],
    treinador3: [converte(), converte(), converte(), converte(true), converte(true)],
    lider: [pacotes, converte(false, true), vezes(10, true), divide(100, false), balas],
    revanche: [converte(false, true), vezes(1000, true), converte(true, true)],
  },
};
// a ÷ 10 ÷ 10 precisa de a múltiplo de 100
M2.A.revanche[1] = () => { const q = int(2, 9), a = q * 100; return Q(`${a} ÷ 10 ÷ 10`, num(q), erradasNum(q, [q * 10, q * 100, a / 10])); };

// ===================== MAPA 3 =====================
function maiorMenor(menor = false) {
  return () => {
    const s = new Set(); while (s.size < 3) s.add(int(-12, 8)); const arr = [...s];
    if (!arr.some(x => x < 0)) arr[0] = -int(1, 9);
    const r = menor ? Math.min(...arr) : Math.max(...arr);
    const nomes = arr.map(num); const certo = num(r);
    return Q(`Qual é ${menor ? 'menor' : 'maior'}?`, certo, nomes.filter(x => x !== certo));
  };
}
const N = (m, r, o = {}) => E(m, r, { neg: true, cand: v => [-v], ...o });
function temperatura() { const a = int(1, 8), b = int(2, 10); const v = -a + b; return Q(`A temperatura era −${a} °C e subiu ${b} graus. Quanto está agora?`, `${num(v)} °C`, erradasNum(v, [-v, -a - b, a + b], { fmt: x => `${num(x)} °C`, neg: true })); }
function saldo() { const t = int(5, 20), g = t + int(2, 10); const v = t - g; return Q(`Tinha R$ ${t} na conta e gastei R$ ${g}. Qual o saldo?`, reais(v), erradasNum(v, [-v, v - 1, v + 1], { fmt: reais, neg: true })); }
function elevador() { const a = int(1, 3), b = int(2, 6); const v = -a + b; return Q(`Estou no andar −${a} (garagem) e subo ${b} andares. Em que andar estou?`, num(v), erradasNum(v, [a + b, -a - b, v + 1], { neg: true })); }
const SINAIS = [
  ['Negativo × negativo dá:', 'positivo'], ['Positivo × negativo dá:', 'negativo'], ['Negativo × positivo dá:', 'negativo'],
  ['Negativo ÷ positivo dá:', 'negativo'], ['Negativo ÷ negativo dá:', 'positivo'], ['Positivo ÷ negativo dá:', 'negativo'],
];
const sinal = () => { const [e, r] = pick(SINAIS); return Q(e, r, [r === 'positivo' ? 'negativo' : 'positivo']); };
const P = (m, r, o = {}) => N(m, r, { paren: true, ...o });
const M3 = {
  A: {
    treinador1: [maiorMenor(), maiorMenor(), maiorMenor(true), maiorMenor(), maiorMenor(true)],
    treinador2: [N('a + b', { a: [-9, -1], b: [1, 9] }), N('a + b', { a: [-9, -1], b: [-9, -1] }), N('a + b', { a: [1, 9], b: [-9, -1] }), N('a + b', { a: [-9, -1], b: [1, 9] }), N('a + b', { a: [-9, -1], b: [1, 9] })],
    treinador3: [N('a − b', { a: [-9, -1], b: [1, 9] }), N('a − b', { a: [1, 9], b: [2, 15] }, { cond: v => v.b > v.a }), N('a − b', { a: [1, 9], b: [2, 15] }, { cond: v => v.b > v.a }), N('a − b', { a: [-9, -1], b: [1, 9] }), N('a − b', { a: [0, 0], b: [1, 9] })],
    lider: [temperatura, saldo, N('a + b − c', { a: [-6, -1], b: [1, 6], c: [1, 6] }), elevador, N('a + b', { a: [-9, -2], b: [1, 6] })],
    revanche: [N('a + b − c', { a: [-9, -2], b: [-9, -2], c: [-6, -1] }), N('a − b', { a: [1, 9], b: [-9, -1] }), N('a − b', { a: [-9, -1], b: [-9, -1] })],
  },
  B: {
    treinador1: [P('a × b', { a: [-9, -1], b: [2, 9] }), P('a × b', { a: [-9, -1], b: [-9, -1] }), P('a × b', { a: [2, 9], b: [-9, -1] }), P('a × b', { a: [-9, -1], b: [-9, -1] }), P('a × b', { a: [-1, -1], b: [2, 9] })],
    treinador2: [P('a ÷ b', { a: [-40, -4], b: [2, 5] }), P('a ÷ b', { a: [-40, -4], b: [-5, -2] }), P('a ÷ b', { a: [4, 40], b: [-5, -2] }), P('a ÷ b', { a: [-9, -2], b: [-9, -2] }, { cond: v => v.a === v.b }), P('a ÷ b', { a: [-40, -4], b: [2, 5] })],
    treinador3: [sinal, sinal, sinal, sinal, P('a × 0', { a: [-9, -1] })],
    lider: [P('a × b', { a: [-6, -2], b: [-6, -2] }), P('a ÷ b', { a: [-40, -6], b: [2, 6] }), P('a × b', { a: [2, 6], b: [-6, -2] }), P('a ÷ b', { a: [-40, -6], b: [-6, -2] }), P('a × b', { a: [-9, -2], b: [2, 5] })],
    revanche: [P('a × b × c', { a: [-4, -1], b: [-4, -1], c: [-4, -1] }), P('a ÷ b + c', { a: [-30, -6], b: [-6, -2], c: [-9, -2] }), P('a × b + c', { a: [-5, -2], b: [2, 6], c: [1, 9] })],
  },
};
// evita repetir a mesma pergunta de sinais no mesmo personagem
M3.B.treinador3 = (() => { return [0, 1, 2, 3].map(i => () => { const [e, r] = SINAIS[(i + int(0, 5)) % 6]; return Q(e, r, [r === 'positivo' ? 'negativo' : 'positivo']); }).concat([P('a × 0', { a: [-9, -1] })]); })();

// ===================== MAPA 4 =====================
function equivalente() {
  const [p, q] = pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [1, 5]]); const k = int(2, 4);
  const certo = frac(p * k, q * k);
  const errs = erradasFrac(p * k, q * k, [[p * k + 1, q * k], [p + 1, q], [p * k, q * k + 1], [q, p], [p + k, q + k]]);
  return Q(`Qual fração é igual a ${frac(p, q)}?`, certo, errs.slice(0, 2));
}
function simplifique() {
  const [p, q] = pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [1, 6]]); const k = int(2, 5);
  return Q(`Simplifique ${frac(p * k, q * k)}`, frac(p, q), erradasFrac(p, q, [[p * k / (k % 2 === 0 ? 2 : 1), q * k], [p + 1, q], [p, q + 1], [q, p], [p, q * k]]));
}
function mesmaDen(sub = false) {
  return () => {
    const d = int(4, 10); let a = int(1, d - 2), b = int(1, d - 1 - a);
    if (sub) { a = int(2, d - 1); b = int(1, a - 1); }
    const r = sub ? a - b : a + b;
    const cand = sub ? [[a + b, d], [r + 1, d], [r, d + 1], [r - 1, d], [r, 2 * d]] : [[r, 2 * d], [r + 1, d], [r, d + 1], [Math.abs(a - b), d], [r - 1, d]];
    return Q(`${frac(a, d)} ${sub ? '−' : '+'} ${frac(b, d)}`, frac(r, d), erradasFrac(r, d, cand));
  };
}
function fracQtd(unit = true) {
  return () => {
    const q = unit ? pick([2, 3, 4, 5, 10]) : pick([3, 4, 5]); const p = unit ? 1 : int(2, q - 1); const k = int(2, 10); const N = q * k;
    const v = p * k;
    const e = unit && q === 2 && coin() ? `Quanto é a metade de ${N}?` : `Quanto é ${frac(p, q)} de ${N}?`;
    return Q(e, num(v), erradasNum(v, [N, v * 2, k, N - v, v + 1]));
  };
}
function comparaUnit() { const s = sample([2, 3, 4, 5, 6, 8, 10], 2).sort((a, b) => a - b); return Q('Qual é maior?', frac(1, s[0]), [frac(1, s[1])]); }
function pizza() { const t = pick([6, 8, 10, 12]), c = int(2, t - 1); return Q(`Uma pizza tem ${t} pedaços e comi ${c}. Que fração da pizza comi?`, frac(c, t), erradasFrac(c, t, [[t - c, t], [c, t - c], [t, c], [c + 1, t]])); }
function difDen() {
  const [a, b] = pick([[2, 4], [2, 6], [3, 6], [4, 8], [2, 8], [3, 9], [5, 10]]); const p = 1, r = int(1, b / a);
  const D = mmc(a, b); const n = p * (D / a) + r * (D / b); const [x, y] = simpl(n, D);
  return Q(`${frac(p, a)} + ${frac(r, b)}`, frac(x, y), erradasFrac(x, y, [[p + r, a + b], [p + r, b], [x + 1, y], [x, y + 1]]));
}
const DEC = (op) => () => {
  for (; ;) {
    const a = arred(int(1, 59) / 10), b = arred(int(1, 49) / 10);
    const v = op === '+' ? arred(a + b) : arred(a - b);
    if (v <= 0) continue;
    return Q(`${num(a)} ${op} ${num(b)}`, num(v), erradasNum(v, [v * 10, v / 10, v + 0.1, v - 0.1, op === '+' ? a - b : a + b], { inteiro: false }));
  }
};
const FD = [[1, 2, 0.5], [1, 10, 0.1], [1, 4, 0.25], [3, 10, 0.3], [1, 5, 0.2], [7, 10, 0.7], [9, 10, 0.9], [3, 4, 0.75]];
function fracDec() { const [p, q, d] = pick(FD.slice(0, 7)); return Q(`${frac(p, q)} em número decimal`, num(d), erradasNum(d, [d * 10, d / 10, d + 0.1, p + q / 10], { inteiro: false })); }
function decFrac() { const [p, q, d] = pick(FD.slice(0, 7)); return Q(`${num(d)} em fração`, frac(p, q), erradasFrac(p, q, [[q, p], [p, q * 10], [Math.round(d * 10), 100], [p + 1, q]]).slice(0, 2)); }
function comparaDec() { const a = int(1, 9), b = int(10, 99); const x = arred(a / 10), y = arred(b / 100); const r = Math.max(x, y); if (x === y) return comparaDec(); return Q('Qual é maior?', num(r), [num(r === x ? y : x)]); }
function somaReais() { const a = arred(int(2, 9) + pick([0.5, 0.25, 0.75])), b = arred(int(1, 5) + pick([0.5, 0.25, 0.5])); const v = arred(a + b); return Q(`${reais(a)} + ${reais(b)}`, reais(v), erradasNum(v, [v + 1, v - 0.5, v + 0.1, Math.floor(a) + Math.floor(b)], { fmt: reais, inteiro: false })); }
function trocoDec() { const T = pick([5, 10]), p = arred(int(1, T - 1) + 0.5); const v = arred(T - p); return Q(`Paguei R$ ${T} por um lanche de ${reais(p)}. Qual o troco?`, reais(v), erradasNum(v, [v + 1, v - 1, v + 0.5, T - Math.floor(p)], { fmt: reais, inteiro: false })); }
const M4 = {
  A: {
    treinador1: [equivalente, simplifique, simplifique, equivalente, simplifique],
    treinador2: [mesmaDen(), mesmaDen(true), mesmaDen(), mesmaDen(true), mesmaDen()],
    treinador3: [fracQtd(), fracQtd(), fracQtd(), fracQtd(), fracQtd()],
    lider: [comparaUnit, mesmaDen(), fracQtd(), pizza, simplifique],
    revanche: [difDen, fracQtd(false), fracQtd(false)],
  },
  B: {
    treinador1: [DEC('+'), DEC('+'), DEC('+'), DEC('+'), DEC('+')],
    treinador2: [DEC('−'), DEC('−'), DEC('−'), DEC('−'), DEC('−')],
    treinador3: [fracDec, fracDec, fracDec, fracDec, decFrac],
    lider: [comparaDec, somaReais, E('a × 1,5', { a: [2, 8] }, { cand: v => [v * 10, v + 0.5] }), decFrac, trocoDec],
    revanche: [() => Q('3/4 em número decimal', '0,75', ['7,5', '0,34', '0,25']), E('a × b', { a: [2.5, 2.5], b: [2, 8] }, { lista: ['a'], inteiro: false, cand: v => [v * 10, v + 2] }), () => { const a = arred(int(11, 49) / 10), b = arred(int(101, 499) / 100); const v = arred(a + b); return Q(`${num(a)} + ${num(b)}`, num(v), erradasNum(v, [v * 10, v + 0.1, v - 0.1, arred(a / 10 + b)], { inteiro: false })); }],
  },
};
M4.B.revanche[1] = () => { const b = int(2, 8) * 2; const v = 2.5 * b; return Q(`2,5 × ${b}`, num(v), erradasNum(v, [v * 10, v + 2.5, 2 * b], { inteiro: false })); };

export const MAPAS_1_4 = { 1: M1, 2: M2, 3: M3, 4: M4 };

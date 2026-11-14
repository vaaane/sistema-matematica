import { int, pick, shuffle, sample, coin, num, reais, arred, ehInteiro, avaliar, montar,
  erradasNum, erradasTexto, frac, simpl, mdc, mmc, erradasFrac, passos } from './base.js';

export const X = explicacao => ({ explicacao });
const conta = (e, fmt = x => x) => X(passos(e).split(' = ').map((t, i, a) => i === a.length - 1 ? fmt(t) : t).join(' = '));
const R$ = t => `R$ ${t}`;

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
    return Q(s, num(v), x, X(passos(s)));
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
  return Q(`Comprei ${q} ${ip} de R$ ${p} e 1 suco de R$ ${p2}. Quanto gastei?`, reais(v), erradasNum(v, [(q * (p + p2)), q + p + p2, q * p], { fmt: reais }), conta(`${q} × ${p} + ${p2}`, R$));
}
function sobrou() {
  const q = int(2, 4), p = int(2, 7), T = q * p + int(1, 12);
  const v = T - q * p;
  return Q(`Tinha R$ ${T} e comprei ${q} cadernos de R$ ${p}. Quanto sobrou?`, reais(v), erradasNum(v, [T - p, T - q - p, q * p], { fmt: reais }), conta(`${T} − ${q} × ${p}`, R$));
}
function caixas() {
  const n = int(2, 6), k = int(3, 8), s = int(1, 6);
  const v = n * k + s;
  return Q(`São ${n} caixas com ${k} lápis cada e mais ${s} lápis soltos. Quantos lápis ao todo?`, num(v), erradasNum(v, [n * (k + s), n + k + s, n * k]), conta(`${n} × ${k} + ${s}`));
}
function repartir() {
  const k = int(2, 6), q = int(3, 8), e = int(1, 4), N = k * q;
  const v = q + e;
  return Q(`${N} balas foram divididas entre ${k} amigos e cada um ganhou mais ${e}. Com quantas cada um ficou?`, num(v), erradasNum(v, [N / (k + e), q, N + e]), conta(`${N} ÷ ${k} + ${e}`));
}
function troco() {
  const q = int(2, 3), p = int(2, 4), T = pick([10, 20]);
  const v = T - q * p;
  return Q(`Comprei ${q} pacotes de R$ ${p} e paguei com R$ ${T}. Qual o troco?`, reais(v), erradasNum(v, [T - p, q * p, T - q - p], { fmt: reais }), conta(`${T} − ${q} × ${p}`, R$));
}
function ganhoDias() {
  const g = int(2, 6), d = int(3, 6), c = int(2, 9);
  const v = g * d - c;
  return Q(`Ganhei R$ ${g} por dia durante ${d} dias e gastei R$ ${c}. Quanto tenho?`, reais(v), erradasNum(v, [g * (d - c), g + d - c, g * d + c], { fmt: reais }), conta(`${g} × ${d} − ${c}`, R$));
}
function ingressos() {
  const q = int(2, 4), p = int(8, 15), d = int(2, 6);
  const v = q * p - d;
  return Q(`${q} adultos compraram ingressos de R$ ${p} cada e ganharam R$ ${d} de desconto no total. Quanto pagaram?`, reais(v), erradasNum(v, [q * (p - d), q * p, q + p - d], { fmt: reais }), conta(`${q} × ${p} − ${d}`, R$));
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
const casas = (k, lado, v) => { const n = String(k).length - 1; return X(`${lado === 'direita' ? '×' : '÷'} ${k}: a vírgula anda ${n} ${n === 1 ? 'casa' : 'casas'} para a ${lado} (${lado === 'direita' ? 'o número fica maior' : 'o número fica menor'}). Resultado: ${num(v)}`); };
const zeros = (v, k) => [v * k * 10, v / 10, v * 10, v / k, v * 100];
function vezes(k, dec = false) {
  return () => {
    const a = dec ? arred(int(11, 99) / pick([10, 100])) : int(2, 99);
    const v = arred(a * k);
    return Q(`${num(a)} × ${k}`, num(v), erradasNum(v, [v * 10, v / 10, a, v / 100], { inteiro: false }), casas(k, 'direita', v));
  };
}
function divide(k, exata = true) {
  return () => {
    const v0 = exata ? int(2, 99) : arred(int(11, 999) / k);
    const a = exata ? v0 * k : int(11, 999);
    const v = arred(a / k);
    return Q(`${num(a)} ÷ ${k}`, num(v), erradasNum(v, [v * 10, v / 10, a, v * 100], { inteiro: false }), casas(k, 'esquerda', v));
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
      return Q(`${num(a)} ${a === 1 ? de.replace(/s$/, '') : de} são quantos ${para}?`, `${num(v)} ${sim}`, erradasNum(v, [v * 10, v / 10, a * 10], { fmt: x => `${num(x)} ${sim}`, inteiro: false }), X(`1 ${de.replace(/s$/, '')} = ${k} ${sim}. Então ${num(a)} × ${k} = ${num(v)} ${sim}`));
    }
    const simDe = { metros: 'm', quilos: 'kg', litros: 'L' }[de];
    const a = decimal ? int(1, 9) * k / 4 * (k === 100 ? 1 : 1) : int(2, 9) * k;
    const v = arred(a / k);
    return Q(`${num(a)} ${para} são quantos ${de}?`, `${num(v)} ${simDe}`, erradasNum(v, [v * 10, v / 10, v + 1], { fmt: x => `${num(x)} ${simDe}`, inteiro: false }), X(`1 ${simDe} = ${k} ${sim}. Então ${num(a)} ÷ ${k} = ${num(v)} ${simDe}`));
  };
}
function pacotes() {
  const p = int(2, 9), k = pick([10, 100]); const v = p * k;
  return Q(`Um pacote custa R$ ${p}. Quanto custam ${k} pacotes?`, reais(v), erradasNum(v, [v * 10, v / 10, p], { fmt: reais }), X(`${p} × ${k} = ${v}. Resposta: ${reais(v)}`));
}
function balas() {
  const p = pick([0.25, 0.15, 0.35, 0.45, 0.05]), k = 10; const v = arred(p * k);
  return Q(`Uma bala custa ${reais(p)}. Quanto custam ${k} balas?`, reais(v), erradasNum(v, [v * 10, p, v / 10], { fmt: reais, inteiro: false }).filter(s => /^R\$ \d+(,\d\d)?$/.test(s)), X(`${num(p)} × 10: a vírgula anda 1 casa para a direita → ${reais(v)}`));
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
M2.A.revanche[1] = () => { const q = int(2, 9), a = q * 100; return Q(`${a} ÷ 10 ÷ 10`, num(q), erradasNum(q, [q * 10, q * 100, a / 10]), X(passos(`${a} ÷ 10 ÷ 10`))); };

// ===================== MAPA 3 =====================
function maiorMenor(menor = false) {
  return () => {
    const s = new Set(); while (s.size < 4) s.add(int(-12, 8)); const arr = [...s];
    if (!arr.some(x => x < 0)) arr[0] = -int(1, 9);
    const r = menor ? Math.min(...arr) : Math.max(...arr);
    const nomes = arr.map(num); const certo = num(r);
    return Q(`Qual é ${menor ? 'menor' : 'maior'}?`, certo, nomes.filter(x => x !== certo), X(`Na reta numérica, quem está mais à direita é maior. Os negativos ficam à esquerda do zero: quanto mais longe do zero, menor. Ordem: ${[...arr].sort((a, b) => a - b).map(num).join(' < ')}`));
  };
}
const N = (m, r, o = {}) => E(m, r, { neg: true, cand: v => [-v], ...o });
function temperatura() { const a = int(1, 8), b = int(2, 10); const v = -a + b; return Q(`A temperatura era −${a} °C e subiu ${b} graus. Quanto está agora?`, `${num(v)} °C`, erradasNum(v, [-v, -a - b, a + b], { fmt: x => `${num(x)} °C`, neg: true }), X(`Subir é somar: ${passos(`−${a} + ${b}`)} °C`)); }
function saldo() { const t = int(5, 20), g = t + int(2, 10); const v = t - g; return Q(`Tinha R$ ${t} na conta e gastei R$ ${g}. Qual o saldo?`, reais(v), erradasNum(v, [-v, v - 1, v + 1], { fmt: reais, neg: true }), X(`${passos(`${t} − ${g}`)}. Gastei mais do que tinha, então o saldo é negativo.`)); }
function elevador() { const a = int(1, 3), b = int(2, 6); const v = -a + b; return Q(`Estou no andar −${a} (garagem) e subo ${b} andares. Em que andar estou?`, num(v), erradasNum(v, [a + b, -a - b, v + 1], { neg: true }), X(`Subir é somar: ${passos(`−${a} + ${b}`)}`)); }
const SINAIS = [
  ['Negativo × negativo dá:', 'positivo'], ['Positivo × negativo dá:', 'negativo'], ['Negativo × positivo dá:', 'negativo'],
  ['Negativo ÷ positivo dá:', 'negativo'], ['Negativo ÷ negativo dá:', 'positivo'], ['Positivo ÷ negativo dá:', 'negativo'],
];
const REGRA_SINAL = X('Sinais iguais dão positivo. Sinais diferentes dão negativo.');
const sinal = () => { const [e, r] = pick(SINAIS); return Q(e, r, [r === 'positivo' ? 'negativo' : 'positivo'], REGRA_SINAL); };
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
M3.B.treinador3 = (() => { return [0, 1, 2, 3].map(i => () => { const [e, r] = SINAIS[(i + int(0, 5)) % 6]; return Q(e, r, [r === 'positivo' ? 'negativo' : 'positivo'], REGRA_SINAL); }).concat([P('a × 0', { a: [-9, -1] })]); })();

// ===================== MAPA 4 =====================
// figura (PROMPT-135, só o 4 A): o desenho da pergunta e a animação depois de responder (js/jogo-revisao/figuras.js)
const FG = (x, figura) => ({ ...x, figura });
function equivalente() {
  const [p, q] = pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [1, 5]]); const k = int(2, 4);
  const certo = frac(p * k, q * k);
  const errs = erradasFrac(p * k, q * k, [[p * k + 1, q * k], [p + 1, q], [p * k, q * k + 1], [q, p], [p + k, q + k]]);
  return Q(`Qual fração é equivalente (igual) a ${frac(p, q)}?`, certo, errs, FG(X(`Multiplique o de cima e o de baixo pelo mesmo número: ${p} × ${k} = ${p * k} e ${q} × ${k} = ${q * k}. Fica ${certo}`), { tipo: 'barras_iguais', de: [p, q], para: [p * k, q * k] }));
}
function simplifique() {
  const [p, q] = pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [1, 6]]); const k = int(2, 5);
  return Q(`Simplifique ${frac(p * k, q * k)}`, frac(p, q), erradasFrac(p, q, [[p * k / (k % 2 === 0 ? 2 : 1), q * k], [p + 1, q], [p, q + 1], [q, p], [p, q * k]]), FG(X(`Divida o de cima e o de baixo por ${k}: ${p * k} ÷ ${k} = ${p} e ${q * k} ÷ ${k} = ${q}. Fica ${frac(p, q)}`), { tipo: 'simplificar', fr: [p * k, q * k], fim: [p, q] }));
}
function mesmaDen(sub = false) {
  return () => {
    const d = int(4, 10); let a = int(1, d - 2), b = int(1, d - 1 - a);
    if (sub) { a = int(2, d - 1); b = int(1, a - 1); }
    const r = sub ? a - b : a + b;
    const cand = sub ? [[a + b, d], [r + 1, d], [r, d + 1], [r - 1, d], [r, 2 * d]] : [[r, 2 * d], [r + 1, d], [r, d + 1], [Math.abs(a - b), d], [r - 1, d]];
    return Q(`${frac(a, d)} ${sub ? '−' : '+'} ${frac(b, d)}`, frac(r, d), erradasFrac(r, d, cand), FG(X(`Mesmo denominador: repete o de baixo (${d}) e ${sub ? 'subtrai' : 'soma'} os de cima: ${a} ${sub ? '−' : '+'} ${b} = ${r}. Fica ${frac(r, d)}`), { tipo: 'soma_fracao', a: [a, d], op: sub ? '−' : '+', b: [b, d], res: [r, d] }));
  };
}
function fracQtd(unit = true) {
  return () => {
    const q = unit ? pick([2, 3, 4, 5, 10]) : pick([3, 4, 5]); const p = unit ? 1 : int(2, q - 1); const k = int(2, 10); const N = q * k;
    const v = p * k;
    const e = unit && q === 2 && coin() ? `Quanto é a metade de ${N}?` : `Quanto é ${frac(p, q)} de ${N}?`;
    return Q(e, num(v), erradasNum(v, [N, v * 2, k, N - v, v + 1]), FG(X(p === 1 ? `Divida pelo de baixo: ${N} ÷ ${q} = ${v}` : `Divida pelo de baixo e multiplique pelo de cima: ${N} ÷ ${q} = ${k} e ${k} × ${p} = ${v}`), { tipo: 'parte_de', num: p, den: q, total: N }));
  };
}
// PROMPT-206: × e ÷ de frações — números pequenos e a resposta já irredutível (a forma sem simplificar nunca vira alternativa certa)
function multFrac() {
  for (let t = 0; ; t++) {
    const b = int(2, 6), a = int(1, b - 1), d = int(2, 7), c = int(1, d - 1), n = a * c, m = b * d;
    if (mdc(n, m) !== 1) continue;
    const errs = erradasFrac(n, m, [[a + c, b + d], [a * d, b * c], [n, b + d], [n + 1, m], [n, m + 1]]);
    if (errs.length < 3 && t < 200) continue;
    return Q(`${frac(a, b)} × ${frac(c, d)}`, frac(n, m), errs, X(`Em cima com em cima: ${a} × ${c} = ${n}. Embaixo com embaixo: ${b} × ${d} = ${m}. Fica ${frac(n, m)}`));
  }
}
function divFrac() {
  for (let t = 0; ; t++) {
    const b = int(2, 6), a = int(1, b - 1), d = int(2, 7), c = int(1, d - 1), n = a * d, m = b * c;
    if (mdc(n, m) !== 1 || n === m) continue;
    const cand = [[a * c, b * d], [b * c, a * d]];
    if (a % c === 0 && b % d === 0) cand.push([a / c, b / d]);   // dividiu direto
    cand.push([n + 1, m], [n, m + 1]);
    const errs = erradasFrac(n, m, cand);
    if (errs.length < 3 && t < 200) continue;
    return Q(`${frac(a, b)} ÷ ${frac(c, d)}`, frac(n, m), errs, X(`Mantém a primeira, vira a segunda (${frac(c, d)} vira ${frac(d, c)}) e multiplica: ${frac(a, b)} × ${frac(d, c)} = ${frac(n, m)}`));
  }
}
function comparaUnit() { const s = sample([2, 3, 4, 5, 6, 8, 10], 2).sort((a, b) => a - b); return Q('Qual é maior?', frac(1, s[0]), [frac(1, s[1])], FG(X(`Com o 1 em cima, quanto menos partes, maior cada pedaço: ${frac(1, s[0])} > ${frac(1, s[1])}`), { tipo: 'compara_fracoes', fracoes: [[1, s[0]], [1, s[1]]] })); }
function pizza() { const t = pick([6, 8, 10, 12]), c = int(2, t - 1); return Q(`Uma pizza tem ${t} pedaços e comi ${c}. Que fração da pizza comi?`, frac(c, t), erradasFrac(c, t, [[t - c, t], [c, t - c], [t, c], [c + 1, t]]), FG(X(`Em cima, os pedaços que comi (${c}); embaixo, o total de pedaços (${t}): ${frac(c, t)}`), { tipo: 'pizza', n: t, comidos: c })); }
function difDen() {
  const [a, b] = pick([[2, 4], [2, 6], [3, 6], [4, 8], [2, 8], [3, 9], [5, 10]]); const p = 1, r = int(1, b / a);
  const D = mmc(a, b); const n = p * (D / a) + r * (D / b); const [x, y] = simpl(n, D);
  return Q(`${frac(p, a)} + ${frac(r, b)}`, frac(x, y), erradasFrac(x, y, [[p + r, a + b], [p + r, b], [x + 1, y], [x, y + 1]]), FG(X(`Deixe os de baixo iguais: ${frac(p, a)} = ${frac(p * D / a, D)}${b !== D ? ` e ${frac(r, b)} = ${frac(r * D / b, D)}` : ''}. Some os de cima: ${frac(n, D)}${n !== x ? ` = ${frac(x, y)}` : ''}`), { tipo: 'soma_fracao', a: [p, a], op: '+', b: [r, b], res: [x, y], converte: [[p * D / a, D], [r * D / b, D]], ...(n !== x ? { antes_simplificar: [n, D] } : {}) }));
}
const DEC = (op) => () => {
  for (; ;) {
    const a = arred(int(1, 59) / 10), b = arred(int(1, 49) / 10);
    const v = op === '+' ? arred(a + b) : arred(a - b);
    if (v <= 0) continue;
    return Q(`${num(a)} ${op} ${num(b)}`, num(v), erradasNum(v, [v * 10, v / 10, v + 0.1, v - 0.1, op === '+' ? a - b : a + b], { inteiro: false }), X(`Vírgula embaixo de vírgula: ${num(a)} ${op} ${num(b)} = ${num(v)}`));
  }
};
const FD = [[1, 2, 0.5], [1, 10, 0.1], [1, 4, 0.25], [3, 10, 0.3], [1, 5, 0.2], [7, 10, 0.7], [9, 10, 0.9], [3, 4, 0.75]];
function fracDec() { const [p, q, d] = pick(FD.slice(0, 7)); return Q(`Quanto é ${frac(p, q)} em número decimal?`, num(d), erradasNum(d, [d * 10, d / 10, d + 0.1, p + q / 10], { inteiro: false }), X(`A fração é uma divisão: ${p} ÷ ${q} = ${num(d)}`)); }
function decFrac() { const [p, q, d] = pick(FD.slice(0, 7)); return Q(`${num(d)} em fração`, frac(p, q), erradasFrac(p, q, [[q, p], [p, q * 10], [Math.round(d * 10), 100], [p + 1, q], [p, q + 1]]), X(`${num(d)} = ${frac(Math.round(d * 100), 100)} = ${frac(p, q)} (porque ${p} ÷ ${q} = ${num(d)})`)); }
function comparaDec() { const a = int(1, 9), b = int(10, 99); const x = arred(a / 10), y = arred(b / 100); const r = Math.max(x, y); if (x === y) return comparaDec(); return Q('Qual é maior?', num(r), [num(r === x ? y : x)], X(`Iguale as casas: ${num(x)} = ${(x).toFixed(2).replace('.', ',')} e ${num(y)} = ${(y).toFixed(2).replace('.', ',')}. Agora compare.`)); }
function somaReais() { const a = arred(int(2, 9) + pick([0.5, 0.25, 0.75])), b = arred(int(1, 5) + pick([0.5, 0.25, 0.5])); const v = arred(a + b); return Q(`${reais(a)} + ${reais(b)}`, reais(v), erradasNum(v, [v + 1, v - 0.5, v + 0.1, Math.floor(a) + Math.floor(b)], { fmt: reais, inteiro: false }), X(`${reais(a)} + ${reais(b)} = ${reais(v)}`)); }
function trocoDec() { const T = pick([5, 10]), p = arred(int(1, T - 1) + 0.5); const v = arred(T - p); return Q(`Paguei R$ ${T} por um lanche de ${reais(p)}. Qual o troco?`, reais(v), erradasNum(v, [v + 1, v - 1, v + 0.5, T - Math.floor(p)], { fmt: reais, inteiro: false }), X(`R$ ${T} − ${reais(p)} = ${reais(v)}`)); }
const M4 = {
  A: {
    treinador1: [equivalente, simplifique, simplifique, equivalente, simplifique],
    treinador2: [mesmaDen(), mesmaDen(true), mesmaDen(), mesmaDen(true), mesmaDen()],
    treinador3: [fracQtd(), multFrac, fracQtd(), multFrac, fracQtd()],   // PROMPT-206
    lider: [comparaUnit, mesmaDen(), multFrac, pizza, divFrac],
    revanche: [difDen, fracQtd(false), divFrac],
  },
  B: {
    treinador1: [DEC('+'), DEC('+'), DEC('+'), DEC('+'), DEC('+')],
    treinador2: [DEC('−'), DEC('−'), DEC('−'), DEC('−'), DEC('−')],
    treinador3: [fracDec, fracDec, fracDec, fracDec, decFrac],
    lider: [comparaDec, somaReais, E('a × 1,5', { a: [2, 8] }, { cand: v => [v * 10, v + 0.5] }), decFrac, trocoDec],
    revanche: [() => Q('Quanto é 3/4 em número decimal?', '0,75', ['7,5', '0,34', '0,25'], X('3 ÷ 4 = 0,75')), E('a × b', { a: [2.5, 2.5], b: [2, 8] }, { lista: ['a'], inteiro: false, cand: v => [v * 10, v + 2] }), () => { const a = arred(int(11, 49) / 10), b = arred(int(101, 499) / 100); const v = arred(a + b); return Q(`${num(a)} + ${num(b)}`, num(v), erradasNum(v, [v * 10, v + 0.1, v - 0.1, arred(a / 10 + b)], { inteiro: false }), X(`Vírgula embaixo de vírgula: ${a.toFixed(2).replace('.', ',')} + ${num(b)} = ${num(v)}`)); }],
  },
};
M4.B.revanche[1] = () => { const b = int(2, 8) * 2; const v = 2.5 * b; return Q(`2,5 × ${b}`, num(v), erradasNum(v, [v * 10, v + 2.5, 2 * b], { inteiro: false }), X(`2 × ${b} = ${2 * b} e 0,5 × ${b} = ${num(b / 2)}. Somando: ${num(v)}`)); };

export const MAPAS_1_4 = { 1: M1, 2: M2, 3: M3, 4: M4 };

// ===================== ⭐ GINÁSIO DIFÍCIL (PROMPT-230) =====================
// A faixa difícil dos mesmos geradores: números maiores, decimais e negativos onde faz sentido e um passo a mais.
// gerarQuestoes(…, { dificil: true }) usa estas listas no lugar das normais (geradores.js). Sem a revanche (o Difícil não tem).
// Mapa 13 B (tabelas) não tem lista difícil: usa as tabelas normais.
const DECS = [0.5, 1.5, 2.5, 3.5, 0.25, 0.75];
function trocoD() {
  const [a, b] = sample(nomesItens, 2), q1 = int(2, 5), p1 = int(2, 8) + 0.5, q2 = int(2, 4), p2 = int(3, 12);
  const gasto = arred(q1 * p1 + q2 * p2), T = gasto < 50 ? pick([50, 100]) : 100, v = arred(T - gasto);
  return Q(`Comprei ${q1} ${a[0]} de ${reais(p1)} e ${q2} ${b[0]} de R$ ${p2}. Paguei com R$ ${T}. Qual foi o troco?`, reais(v),
    erradasNum(v, [T - q1 * p1, T - q2 * p2, gasto, T - (q1 + q2) * p1], { fmt: reais, inteiro: false }), conta(`${T} − (${q1} × ${num(p1)} + ${q2} × ${p2})`, R$));
}
function parcelasD() {
  const n = int(3, 8), k = int(15, 60), e = 10 * int(2, 10), P = e + n * k;
  return Q(`Uma bicicleta custa R$ ${P}. Dei R$ ${e} de entrada e paguei o resto em ${n} parcelas iguais. Qual é o valor de cada parcela?`, reais(k),
    erradasNum(k, [P / n, (P + e) / n, P - e, k + e / n], { fmt: reais, inteiro: true }), conta(`(${P} − ${e}) ÷ ${n}`, R$));
}
function salarioD() {
  for (;;) {
    const g = int(25, 60), c = int(5, 12), d = int(5, 12), x = int(20, 80), v = d * (g - c) - x;
    if (v <= 0) continue;
    return Q(`Ganhei R$ ${g} por dia durante ${d} dias. Gastei R$ ${c} por dia de lanche e, no fim, paguei uma conta de R$ ${x}. Quanto sobrou?`, reais(v),
      erradasNum(v, [d * g - c - x, d * (g - c), d * g - x, d * (g + c) - x], { fmt: reais }), conta(`${d} × (${g} − ${c}) − ${x}`, R$));
  }
}
const M1D = {
  A: {
    treinador1: [E('a + b × c − d', { a: [20, 150], b: [6, 15], c: [3, 12], d: [5, 40] }), E('a × b + c × d', { a: [6, 15], b: [4, 12], c: [3, 9], d: [5, 12] }), E('a − b × c + d', { a: [100, 300], b: [6, 12], c: [4, 9], d: [10, 60] })],
    treinador2: [E('a − b ÷ c + d', { a: [50, 200], b: [24, 144], c: [3, 12], d: [5, 40] }), E('a ÷ b + c × d', { a: [60, 300], b: [3, 12], c: [4, 12], d: [3, 9] }), E('a ÷ b − c ÷ d', { a: [120, 480], b: [4, 12], c: [20, 90], d: [2, 6] })],
    treinador3: [E('a × b − c ÷ d', { a: [8, 25], b: [4, 12], c: [20, 150], d: [2, 10] }), E('a − b × c + d ÷ e', { a: [100, 300], b: [3, 9], c: [4, 12], d: [12, 90], e: [2, 6] }), E('a + b × c', { a: [2, 20], b: DECS, c: [2, 12] }, { lista: ['b'], inteiro: false })],
    lider: [E('a × b + c ÷ d − e', { a: [6, 15], b: [4, 12], c: [30, 150], d: [3, 10], e: [5, 40] }), E('a − b × c − d ÷ e', { a: [200, 500], b: [6, 12], c: [5, 12], d: [20, 120], e: [2, 8] }),
      E('a × b − c × d', { a: DECS, b: [4, 20], c: [2, 9], d: DECS }, { lista: ['a', 'd'], inteiro: false }), E('a × b × c − d ÷ e', { a: [2, 6], b: [3, 9], c: [2, 5], d: [20, 100], e: [2, 5] }), E('a + b ÷ c × d', { a: [10, 90], b: [24, 120], c: [3, 8], d: [2, 6] })],
  },
  B: {
    treinador1: [E('[a − (b + c)] × d', { a: [30, 90], b: [4, 15], c: [4, 15], d: [3, 9] }), E('a × [b + (c − d)] − e', { a: [3, 9], b: [10, 30], c: [15, 40], d: [2, 12], e: [5, 40] }), E('[(a + b) × c − d] ÷ e', { a: [5, 20], b: [5, 20], c: [2, 6], d: [2, 20], e: [2, 5] })],
    treinador2: [E('{a − [b × (c + d)]} ÷ e', { a: [60, 200], b: [2, 6], c: [1, 5], d: [1, 5], e: [2, 5] }), E('a + [b × (c − d) − e]', { a: [10, 60], b: [3, 9], c: [8, 20], d: [1, 6], e: [2, 20] }), E('{[a + b] × c − d} ÷ e', { a: [5, 25], b: [5, 25], c: [2, 5], d: [5, 30], e: [2, 6] })],
    treinador3: [trocoD, parcelasD, salarioD],
    lider: [E('a × [b − (c − d)] + e', { a: [3, 9], b: [20, 50], c: [10, 25], d: [2, 9], e: [5, 40] }), trocoD, E('{a − [b × (c + d)]} ÷ e', { a: [60, 200], b: [2, 6], c: [1, 5], d: [1, 5], e: [2, 5] }), parcelasD, E('[a ÷ (b + c) + d] × e', { a: [40, 200], b: [2, 8], c: [2, 8], d: [3, 12], e: [2, 6] })],
  },
};
// mapa 3: negativos maiores, decimais, três termos e o duplo negativo
const DECN = [-0.5, -1.5, -2.5, -3.5, -7.5, -12.5];
function maiorMenorD(menor = false) {
  return () => {
    const s = new Set(); while (s.size < 4) s.add(coin() ? -int(10, 99) : arred(-int(1, 30) - pick([0, 0.5, 0.25])));
    const arr = [...s], r = menor ? Math.min(...arr) : Math.max(...arr), certo = num(r);
    return Q(`Qual é ${menor ? 'menor' : 'maior'}?`, certo, arr.map(v => num(v)).filter(x => x !== certo), X(`Nos negativos, quanto mais longe do zero, menor. Ordem: ${[...arr].sort((a, b) => a - b).map(v => num(v)).join(' < ')}`));   // num(v), não .map(num): o índice viraria as casas decimais
  };
}
function temperaturaD() {
  const a = int(2, 15), b = int(5, 20), c = int(3, 25), v = -a + b - c;
  return Q(`A temperatura era −${a} °C. Subiu ${b} graus e depois caiu ${c}. Quanto está agora?`, `${num(v)} °C`, erradasNum(v, [-a + b + c, a + b - c, -v, -a - b - c], { fmt: x => `${num(x)} °C`, neg: true }),
    X(`Subir é somar e cair é subtrair: ${passos(`−${a} + ${b} − ${c}`)} °C`));
}
function saldoD() {
  for (;;) {
    const t = int(10, 40) + 0.5, g = int(15, 40), h = int(5, 30), v = arred(t - g - h);
    if (v >= 0) continue;
    return Q(`Tinha ${reais(t)} na conta. Gastei R$ ${g} e depois R$ ${h}. Qual é o saldo?`, reais(v), erradasNum(v, [-v, t - g + h, v - 1, t - g], { fmt: reais, neg: true, inteiro: false }),
      X(`${passos(`${num(t)} − ${g} − ${h}`)}. Gastei mais do que tinha: o saldo é negativo.`));
  }
}
function elevadorD() {
  const a = int(1, 4), b = int(5, 12), c = int(3, 15), v = -a + b - c;
  return Q(`Estou no andar −${a} (garagem). Subo ${b} andares e depois desço ${c}. Em que andar estou?`, num(v), erradasNum(v, [a + b - c, -a + b + c, -v], { neg: true }), X(`Subir é somar e descer é subtrair: ${passos(`−${a} + ${b} − ${c}`)}`));
}
const M3D = {
  A: {
    treinador1: [maiorMenorD(), maiorMenorD(true), maiorMenorD()],
    treinador2: [N('a + b + c', { a: [-60, -10], b: [-40, 40], c: [-50, -5] }), P('a − b', { a: [-50, -10], b: [-50, -10] }), P('a − b + c', { a: [-90, -20], b: [-60, -5], c: [10, 80] })],
    treinador3: [N('a + b', { a: DECN, b: [1, 20] }, { lista: ['a'], inteiro: false }), P('a − b − c', { a: [-40, 40], b: [-30, -5], c: [5, 40] }), P('a − (b − c)', { a: [-30, -5], b: [-20, -2], c: [3, 20] })],
    lider: [temperaturaD, saldoD, elevadorD, P('a + b − c + d', { a: [-50, -10], b: [-30, -5], c: [-40, -5], d: [5, 60] }), N('a − b', { a: DECN, b: [2, 15] }, { lista: ['a'], inteiro: false })],
  },
  B: {
    treinador1: [P('a × b × c', { a: [-9, -2], b: [-9, -2], c: [-6, -2] }), P('a × b', { a: [-25, -11], b: [-12, -3] }), P('a × b', { a: DECN, b: [-12, -2] }, { lista: ['a'], inteiro: false })],
    treinador2: [P('a ÷ b', { a: [-300, -40], b: [-12, -3] }), P('a ÷ b × c', { a: [-120, -20], b: [2, 10], c: [-6, -2] }), P('(a × b) ÷ c', { a: [-12, -2], b: [3, 12], c: [-6, -2] })],
    treinador3: [P('a × b + c × d', { a: [-9, -2], b: [2, 9], c: [-6, -2], d: [-6, -2] }), P('a ÷ b − c', { a: [-90, -10], b: [-9, -2], c: [-20, -2] }), P('a × (b + c)', { a: [-6, -2], b: [-12, -2], c: [1, 9] })],
    lider: [P('a × b × c ÷ d', { a: [-6, -2], b: [2, 6], c: [-5, -2], d: [-4, -2] }), P('a × b − c ÷ d', { a: [-9, -2], b: [-9, -2], c: [-60, -10], d: [2, 6] }), P('a × b', { a: DECN, b: [-8, -2] }, { lista: ['a'], inteiro: false }),
      P('(a + b) × c', { a: [-15, -3], b: [-15, -3], c: [-6, -2] }), P('a ÷ b + c × d', { a: [-80, -10], b: [-8, -2], c: [-6, -2], d: [2, 9] })],
  },
};
// mapa 2: ×/÷ por 10, 100 e 1000 com mais casas decimais, duas operações seguidas e unidades com vírgula
const n5 = x => num(x, 5);
const casasD = (k, lado, v) => { const n = String(k).length - 1; return X(`${lado === 'direita' ? '×' : '÷'} ${k}: a vírgula anda ${n} ${n === 1 ? 'casa' : 'casas'} para a ${lado}. Resultado: ${n5(v)}`); };
function vezesD(ks) {
  return () => {
    for (;;) {
      const k = pick(ks), a = arred(int(101, 9999) / pick([100, 1000])); if (ehInteiro(a)) continue;
      const v = arred(a * k);
      return Q(`${n5(a)} × ${k}`, n5(v), erradasNum(v, [v * 10, v / 10, a * 10, v / 100], { fmt: n5, inteiro: false }), casasD(k, 'direita', v));
    }
  };
}
function divideD(ks) {
  return () => {
    for (;;) {
      const k = pick(ks), a = coin() ? int(11, 9999) : arred(int(11, 9999) / 10); const v = arred(a / k); if (ehInteiro(v)) continue;
      return Q(`${n5(a)} ÷ ${k}`, n5(v), erradasNum(v, [v * 10, v / 10, v * 100, a / 10], { fmt: n5, inteiro: false }), casasD(k, 'esquerda', v));
    }
  };
}
function cadeia() {
  for (;;) {
    const k1 = pick([10, 100, 1000]), o1 = pick(['×', '÷']), k2 = pick([10, 100, 1000]), o2 = pick(['×', '÷']);
    if (o1 === o2 || k1 === k2) continue;
    const a = arred(int(11, 999) / pick([1, 10])), m = arred(o1 === '×' ? a * k1 : a / k1), v = arred(o2 === '×' ? m * k2 : m / k2);
    if (v < 0.001 || v > 100000) continue;
    return Q(`${n5(a)} ${o1} ${k1} ${o2} ${k2}`, n5(v), erradasNum(v, [v * 10, v / 10, v * 100, v / 100], { fmt: n5, inteiro: false }),
      X(`Uma de cada vez: ${n5(a)} ${o1} ${k1} = ${n5(m)}; depois ${n5(m)} ${o2} ${k2} = ${n5(v)}`));
  }
}
const UNID_D = [['km', 'm', 1000], ['m', 'cm', 100], ['kg', 'g', 1000], ['L', 'mL', 1000], ['m', 'mm', 1000], ['cm', 'mm', 10]];
function converteD(inverso = false) {
  return () => {
    const [g, p, k] = pick(UNID_D);
    if (!inverso) { const a = arred(int(101, 999) / 100), v = arred(a * k); return Q(`${num(a)} ${g} são quantos ${p}?`, `${n5(v)} ${p}`, erradasNum(v, [v * 10, v / 10, a * 10], { fmt: x => `${n5(x)} ${p}`, inteiro: false }), X(`1 ${g} = ${k} ${p}. Então ${num(a)} × ${k} = ${n5(v)} ${p}`)); }
    const a = int(11, 999), v = arred(a / k);
    return Q(`${a} ${p} são quantos ${g}?`, `${n5(v)} ${g}`, erradasNum(v, [v * 10, v / 10, v * 100], { fmt: x => `${n5(x)} ${g}`, inteiro: false }), X(`1 ${g} = ${k} ${p}. Então ${a} ÷ ${k} = ${n5(v)} ${g}`));
  };
}
function somaUnid() {
  const [g, p, k] = pick([['kg', 'g', 1000], ['L', 'mL', 1000], ['m', 'cm', 100], ['km', 'm', 1000]]);
  const a = arred(int(11, 49) / 10), b = int(1, k / 10 - 1) * 10, v = arred(a * k + b);
  return Q(`${num(a)} ${g} + ${b} ${p}: quantos ${p} ao todo?`, `${n5(v)} ${p}`, erradasNum(v, [a + b, a * k, v / 10, a * 10 + b], { fmt: x => `${n5(x)} ${p}`, inteiro: false }), X(`Tudo em ${p}: ${num(a)} ${g} = ${n5(arred(a * k))} ${p}. Somando ${b}: ${n5(v)} ${p}`));
}
function pacotesD() {
  const p = arred(int(101, 999) / 100), k = pick([10, 100, 1000]), v = arred(p * k);
  return Q(`Um adesivo custa ${reais(p)}. Quanto custam ${k} adesivos?`, reais(v), erradasNum(v, [v * 10, v / 10, p * 10], { fmt: reais, inteiro: false }), X(`${num(p)} × ${k}: a vírgula anda ${String(k).length - 1} casas para a direita → ${reais(v)}`));
}
function repartirD() {
  const k = pick([10, 100]), v = arred(int(101, 9999) / 100), T = arred(v * k);
  return Q(`${reais(T)} foram divididos igualmente entre ${k} pessoas. Quanto cada uma recebeu?`, reais(v), erradasNum(v, [v * 10, v / 10, T], { fmt: reais, inteiro: false }), X(`${num(T)} ÷ ${k}: a vírgula anda ${String(k).length - 1} ${k === 10 ? 'casa' : 'casas'} para a esquerda → ${reais(v)}`));
}
const M2D = {
  A: {
    treinador1: [vezesD([10, 100]), vezesD([1000]), vezesD([100, 1000])],
    treinador2: [divideD([10, 100]), divideD([1000]), divideD([100, 1000])],
    treinador3: [cadeia, cadeia, vezesD([1000])],
    lider: [cadeia, divideD([1000]), vezesD([100, 1000]), cadeia, divideD([100])],
  },
  B: {
    treinador1: [converteD(), converteD(), converteD()],
    treinador2: [converteD(true), converteD(true), converteD(true)],
    treinador3: [somaUnid, pacotesD, repartirD],
    lider: [somaUnid, converteD(true), pacotesD, converteD(), repartirD],
  },
};

// mapa 4: denominadores diferentes, simplificar números maiores, fração de quantidade com um passo a mais, decimais com mais casas e × decimal
function simplD() {
  const [p, q] = pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [3, 7], [5, 8], [7, 9], [3, 8], [7, 12]]), k = pick([6, 7, 8, 9, 12]);
  const parc = [2, 3, 4].filter(d => k % d === 0 && d < k).map(d => frac(p * k / d, q * k / d));   // parou no meio (equivalente, mas não até o fim)
  return Q(`Simplifique até o fim: ${frac(p * k, q * k)}`, frac(p, q), erradasTexto(frac(p, q), [...parc.slice(-1), frac(q, p), frac(p, q + 1), frac(p + 1, q + 1), frac(p * k / k + 1, q)]), X(`Divida os dois por ${k}: ${p * k} ÷ ${k} = ${p} e ${q * k} ÷ ${k} = ${q}. Fica ${frac(p, q)}`));
}
function difDenD(sub = false) {
  return () => {
    for (let t = 0; ; t++) {
      const b = pick([3, 4, 5, 6, 8, 9, 10, 12]), d = pick([3, 4, 5, 6, 8, 9, 10, 12]); if (b === d) continue;
      const a = int(1, b - 1), c = int(1, d - 1), D = mmc(b, d); if (mdc(a, b) > 1 || mdc(c, d) > 1) continue; const n = sub ? a * D / b - c * D / d : a * D / b + c * D / d;
      if (n <= 0 || D > 40) continue;
      const [x, y] = simpl(n, D); const errs = erradasFrac(x, y, [[sub ? a - c : a + c, b + d], [sub ? a - c : a + c, D], [x + 1, y], [x, y + 1], [n + 1, D * 2]]);
      if (errs.length < 3 && t < 100) continue;
      const op = sub ? '−' : '+';
      return Q(`${frac(a, b)} ${op} ${frac(c, d)}`, frac(x, y), errs, X(`Denominador comum ${D}: ${frac(a * D / b, D)} ${op} ${frac(c * D / d, D)} = ${frac(n, D)}${n !== x ? ` = ${frac(x, y)}` : ''}`));
    }
  };
}
function fracQtdD() {
  const q = pick([3, 4, 5, 6, 8, 10, 12]), p = pick([2, 3, 5, 7, 9, 11].filter(x => x < q && mdc(x, q) === 1)), k = int(10, 60), N = q * k, v = p * k;
  return Q(`Quanto é ${frac(p, q)} de ${N}?`, num(v), erradasNum(v, [N - v, k, v + k, N / p]), X(`${N} ÷ ${q} = ${k} e ${k} × ${p} = ${v}`));
}
function sobrouFrac() {
  const q = pick([4, 5, 8, 10]), p = pick([1, 2, 3, 4, 5, 6, 7, 9].filter(x => x < q && mdc(x, q) === 1)), k = int(5, 40), T = q * k * 2, g = p * T / q, v = T - g;
  return Q(`Recebi R$ ${T} e gastei ${frac(p, q)} desse dinheiro. Quanto sobrou?`, reais(v), erradasNum(v, [g, T - p, T / q], { fmt: reais }), X(`${frac(p, q)} de ${T}: ${T} ÷ ${q} × ${p} = ${g}. Sobrou ${T} − ${g} = ${v}`));
}
function multFracD() {
  for (let t = 0; ; t++) {
    const b = int(3, 9), a = int(2, b - 1), d = int(3, 9), c = int(2, d - 1), [n, m] = simpl(a * c, b * d);
    if (n === a * c || mdc(a, b) > 1 || mdc(c, d) > 1) continue;   // um passo a mais: simplificar no fim
    const errs = erradasFrac(n, m, [[a * c, b * d], [a + c, b + d], [a * d, b * c], [n + 1, m]]);
    if (errs.length < 3 && t < 100) continue;
    return Q(`${frac(a, b)} × ${frac(c, d)} (simplifique)`, frac(n, m), errs, X(`${a} × ${c} = ${a * c} e ${b} × ${d} = ${b * d}: ${frac(a * c, b * d)} = ${frac(n, m)}`));
  }
}
function decTres() {
  for (;;) {
    const a = arred(int(101, 999) / 100), b = arred(int(11, 499) / 100), c = arred(int(1, 99) / 10), v = arred(a + b - c);
    if (v <= 0) continue;
    return Q(`${num(a)} + ${num(b)} − ${num(c)}`, num(v), erradasNum(v, [a + b + c, a - b - c, v * 10, v + 0.1, v - 0.01], { inteiro: false }), X(`Vírgula embaixo de vírgula, da esquerda para a direita: ${num(a)} + ${num(b)} = ${num(arred(a + b))}; − ${num(c)} = ${num(v)}`));
  }
}
function decVezes() {
  const a = arred(int(11, 49) / 10), b = arred(int(11, 39) / 10), v = arred(a * b);
  return Q(`${num(a)} × ${num(b)}`, num(v), erradasNum(v, [v * 10, v / 10, a + b, Math.round(a) * Math.round(b)], { inteiro: false }), X(`Faça sem vírgula: ${Math.round(a * 10)} × ${Math.round(b * 10)} = ${Math.round(a * b * 100)}. São 2 casas depois da vírgula ao todo: ${num(v)}`));
}
function decDiv() {
  const k = int(2, 9), v = arred(int(11, 99) / 10 + pick([0, 0.05])), a = arred(v * k); if (ehInteiro(v)) return decDiv();
  return Q(`${num(a)} ÷ ${k}`, num(v), erradasNum(v, [v * 10, v / 10, v + 0.1, a - k], { inteiro: false }), X(`${num(a)} ÷ ${k} = ${num(v)} (confira: ${num(v)} × ${k} = ${num(a)})`));
}
const FD8 = [[1, 8, 0.125], [3, 8, 0.375], [5, 8, 0.625], [7, 8, 0.875], [1, 20, 0.05], [3, 20, 0.15], [7, 20, 0.35], [1, 25, 0.04], [6, 25, 0.24], [3, 40, 0.075], [2, 5, 0.4], [3, 4, 0.75]];
function fracDecD() { const [p, q, d] = pick(FD8); return Q(`Quanto é ${frac(p, q)} em número decimal?`, num(d), erradasNum(d, [d * 10, d / 10, p / 10, arred(d + 0.1)], { inteiro: false }), X(`A fração é uma divisão: ${p} ÷ ${q} = ${num(d)}`)); }
function decFracD() { const [p, q, d] = pick(FD8); return Q(`${num(d)} em fração irredutível`, frac(p, q), erradasFrac(p, q, [[q, p], [p, q * 10], [p + 1, q], [p, q + 1], [p * 10, q]]), X(`${num(d)} = ${frac(Math.round(d * 1000), 1000)}; simplificando até o fim: ${frac(p, q)}`)); }
function comparaDecD() {   // 0,5 · 0,49 · 0,487 · 0,058: o número de casas engana
  const a = int(2, 9), b = int(1, 9), c = int(1, 9), arr = [a / 10, (10 * (a - 1) + b) / 100, (100 * (a - 1) + 10 * c + b) / 1000, (10 * a + b) / 1000].map(arred);
  const menor = coin(), r = menor ? Math.min(...arr) : Math.max(...arr);
  return Q(menor ? 'Qual é o menor?' : 'Qual é o maior?', num(r), arr.filter(x => x !== r).map(x => num(x)), X(`Iguale as casas: ${arr.map(x => x.toFixed(3).replace('.', ',')).join('; ')}. O ${menor ? 'menor' : 'maior'} é ${num(r)}`));
}
function compraDec() {
  for (;;) {
    const q = int(2, 6), p = arred(int(1, 9) + pick([0.35, 0.45, 0.75, 0.9, 0.25])), T = pick([20, 50]), v = arred(T - q * p);
    if (v <= 0) continue;
    return Q(`Comprei ${q} cadernos de ${reais(p)}. Paguei com R$ ${T}. Qual o troco?`, reais(v), erradasNum(v, [q * p, T - p, v + 1, arred(T - q * Math.floor(p))], { fmt: reais, inteiro: false }), X(`${q} × ${num(p)} = ${num(arred(q * p))}. Troco: ${T} − ${num(arred(q * p))} = ${reais(v)}`));
  }
}
const M4D = {
  A: {
    treinador1: [simplD, simplD, simplD],
    treinador2: [difDenD(), difDenD(true), difDenD()],
    treinador3: [fracQtdD, sobrouFrac, multFracD],
    lider: [difDenD(true), divFrac, sobrouFrac, multFracD, difDenD()],
  },
  B: {
    treinador1: [decTres, decTres, decTres],
    treinador2: [decVezes, decDiv, decVezes],
    treinador3: [fracDecD, decFracD, fracDecD],
    lider: [comparaDecD, compraDec, decVezes, decFracD, decDiv],
  },
};
export const DIFICIL_1_4 = { 1: M1D, 2: M2D, 3: M3D, 4: M4D };

import { int, pick, shuffle, sample, coin, num, reais, arred, ehInteiro, erradasNum, erradasTexto, frac, erradasFrac, passos, mdc } from './base.js';
import { Q, X, expr } from './mapas1a4.js';

// ===================== MAPA 5 =====================
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = n => String(n).split('').map(d => SUP[d]).join('');
const pw = (b, n) => (b < 0 ? `(${num(b)})` : num(b)) + sup(n);
const abre = (b, n) => n === 0 ? `Todo número (diferente de zero) elevado a 0 dá 1.` : n === 1 ? `Elevado a 1 dá o próprio número: ${num(b)}.` : `${pw(b, n)} = ${Array(n).fill(b < 0 ? `(${num(b)})` : num(b)).join(' × ')} = ${num(b ** n)}`;
function pot(pares) {
  return () => {
    const [b, n] = pick(pares); const v = Math.pow(b, n);
    return Q(pw(b, n), num(v), erradasNum(v, [b * n, b + n, -v, Math.pow(b, n - 1), Math.pow(b, n + 1)], { neg: b < 0 || v < 0 }), X(abre(b, n)));
  };
}
const QUAD = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(b => [b, 2]);
const CUBO = [[2, 3], [3, 3], [4, 3], [5, 3], [10, 3], [2, 4], [3, 4], [2, 5], [1, 5], [1, 7]];
const raiz = (max = 12) => () => { const b = int(1, max), n = b * b; return Q(`√${n}`, num(b), erradasNum(b, [n / 2, b * 2, b + 1, b - 1, n]), X(`Qual número vezes ele mesmo dá ${n}? ${b} × ${b} = ${n}, então √${n} = ${b}`)); };
function mesmoQue() {
  const tipo = int(0, 3), b = int(3, 9);
  const EXP = X('O expoente (número pequeno em cima) diz quantas vezes a base aparece na multiplicação.');
  if (tipo === 0) return Q(`${b}² é o mesmo que:`, `${b} × ${b}`, [`${b} × 2`, `${b} + ${b}`, `${b} × ${b} × ${b}`], EXP);
  if (tipo === 1) return Q(`${b}³ é o mesmo que:`, `${b} × ${b} × ${b}`, [`${b} × 3`, `${b} + ${b} + ${b}`, `${b} + 3`], EXP);
  if (tipo === 2) { const n = int(3, 5); return Q(`${Array(n).fill(b).join(' × ')} em forma de potência:`, `${b}${sup(n)}`, erradasTexto(`${b}${sup(n)}`, [`${b}${sup(n - 1)}`, `${n}${sup(b)}`, `${b * n}²`, `${b}${sup(n + 1)}`]), EXP); }
  let n = int(2, 5); if (n === b) n = b === 5 ? 4 : n + 1; return Q(`Na potência ${b}${sup(n)}, qual número é a base?`, num(b), [num(n), num(Math.pow(b, n)), num(b * n)], X(`A base é o número grande (${b}); o expoente é o pequeno em cima (${n}).`));
}
const umZero = () => { const b = int(2, 150), n = pick([0, 1]); const v = Math.pow(b, n); return Q(`${b}${sup(n)}`, num(v), erradasNum(v, n === 0 ? [0, b, -1] : [b + 1, 1, 0, b * 2], { neg: true }), X(abre(b, n))); };
const negPot = () => { const [b, n] = pick([[-1, 2], [-2, 2], [-3, 2], [-1, 3], [-2, 3], [-4, 2], [-1, 4], [-5, 2]]); const v = Math.pow(b, n); return Q(pw(b, n), num(v), erradasNum(v, [-v, b * n, -b * n], { neg: true }), X(`${abre(b, n)}. Negativo com expoente par dá positivo; com expoente ímpar dá negativo.`)); };
function somaPot() {
  for (; ;) {
    const [a, n] = pick([[2, 3], [3, 2], [2, 2], [4, 2], [5, 2], [3, 3], [2, 4]]), [b, m] = pick([[3, 2], [2, 3], [4, 2], [2, 2], [5, 2]]);
    const op = coin() ? '+' : '−'; const v = op === '+' ? a ** n + b ** m : a ** n - b ** m; if (v < 0 || (a === b && n === m)) continue;
    return Q(`${a}${sup(n)} ${op} ${b}${sup(m)}`, num(v), erradasNum(v, [a * n + (op === '+' ? 1 : -1) * b * m, (op === '+' ? -1 : 1) * 0 + (a ** n) + (op === '+' ? -1 : 1) * (b ** m), v + 1]), X(`${a}${sup(n)} = ${a ** n} e ${b}${sup(m)} = ${b ** m}. Então ${a ** n} ${op} ${b ** m} = ${v}`));
  }
}
function raizPot() {
  for (; ;) {
    const r = int(2, 10), [b, n] = pick([[2, 2], [3, 2], [2, 3], [4, 2]]); const op = coin() ? '+' : '−';
    const v = op === '+' ? r + b ** n : r - b ** n; if (v < 0) continue;
    return Q(`√${r * r} ${op} ${b}${sup(n)}`, num(v), erradasNum(v, [r * r + (op === '+' ? 1 : -1) * b ** n, r + (op === '+' ? 1 : -1) * b * n, v + 1]), X(`√${r * r} = ${r} e ${b}${sup(n)} = ${b ** n}. Então ${r} ${op} ${b ** n} = ${v}`));
  }
}
const M5 = {
  A: {
    treinador1: [pot(QUAD), pot(QUAD), pot(QUAD), pot(QUAD), pot(QUAD)],
    treinador2: [pot(CUBO), pot(CUBO), pot(CUBO), pot(CUBO), pot(CUBO)],
    treinador3: [mesmoQue, mesmoQue, mesmoQue, mesmoQue, mesmoQue],
    lider: [pot(QUAD), pot(CUBO), pot(QUAD), pot(CUBO), umZero],
    revanche: [somaPot, pot([[10, 4], [10, 5], [10, 3]]), somaPot],
  },
  B: {
    treinador1: [raiz(), raiz(), raiz(), raiz(), raiz()],
    treinador2: [umZero, umZero, umZero, umZero, umZero],
    treinador3: [negPot, negPot, negPot, negPot, negPot],
    lider: [raiz(), raiz(), umZero, negPot, raiz()],
    revanche: [raizPot, () => { const [b, n] = pick([[-2, 4], [-3, 3], [-2, 5], [-3, 4]]); const v = b ** n; return Q(pw(b, n), num(v), erradasNum(v, [-v, b * n, -b * n], { neg: true }), X(abre(b, n))); }, raizPot],
  },
};

// ===================== MAPA 6 =====================
const SN = (cond, e, extra) => Q(e, cond ? 'Sim' : 'Não', [cond ? 'Não' : 'Sim'], extra);
const divTxt = (n, k) => n % k === 0 ? `${n} ÷ ${k} = ${n / k}, sem sobrar.` : `${n} ÷ ${k} = ${Math.floor(n / k)} e sobra ${n % k}.`;
const ehMult = (ks) => () => { const k = pick(ks); const n = coin() ? k * int(2, 9) : k * int(2, 9) + int(1, k - 1); return SN(n % k === 0, `${n} é múltiplo de ${k}?`, X(`${divTxt(n, k)} ${n % k === 0 ? 'Então é' : 'Então não é'} múltiplo de ${k}.`)); };
function qualMult(ks) {
  return () => {
    const k = pick(ks); const certo = k * int(2, 9); const err = new Set();
    while (err.size < 3) { const x = certo + pick([-3, -2, -1, 1, 2, 3, 4]); if (x > 1 && x % k !== 0) err.add(x); }
    return Q(`Qual é múltiplo de ${k}?`, num(certo), [...err].map(num), X(`Múltiplos de ${k} aparecem na tabuada do ${k}: ${k} × ${certo / k} = ${certo}`));
  };
}
function multDois() {
  const [a, b] = pick([[2, 3], [2, 5], [3, 4], [3, 5], [2, 7], [4, 5]]); const m = a * b * int(1, 2); const err = new Set();
  while (err.size < 3) { const x = pick([a, b]) * int(2, 8); if (x % a !== 0 || x % b !== 0) err.add(x); }
  return Q(`Qual é múltiplo de ${a} e de ${b} ao mesmo tempo?`, num(m), [...err].map(num), X(`${m} ÷ ${a} = ${m / a} e ${m} ÷ ${b} = ${m / b}: divide pelos dois sem sobrar.`));
}
const DIV_N = [6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24, 25, 30];
const divsDe = n => Array.from({ length: n }, (_, i) => i + 1).filter(d => n % d === 0);
const ehDiv = () => { const n = pick(DIV_N), ds = divsDe(n).filter(d => d > 1 && d < n), nao = [2, 3, 4, 5, 6, 7, 8, 9].filter(d => n % d !== 0); const d = coin() && ds.length ? pick(ds) : pick(nao); return SN(n % d === 0, `${d} é divisor de ${n}?`, X(`${divTxt(n, d)} ${n % d === 0 ? 'Então é' : 'Então não é'} divisor de ${n}.`)); };
function qualDiv(nao = false) {
  return () => {
    for (; ;) {
      const n = pick(DIV_N), ds = divsDe(n).filter(d => d > 1 && d < n), nd = [2, 3, 4, 5, 6, 7, 8, 9].filter(d => n % d !== 0);
      if (nao ? ds.length < 3 || !nd.length : !ds.length || nd.length < 3) continue;
      const DS = X(`Divisores de ${n}: ${divsDe(n).join(', ')}`);
      if (nao) return Q(`Qual NÃO é divisor de ${n}?`, num(pick(nd)), sample(ds, 3).map(num), DS);
      return Q(`Qual é divisor de ${n}?`, num(pick(ds)), sample(nd, 3).map(num), DS);
    }
  };
}
function todosDiv() { const n = pick([6, 8, 10, 12, 15, 16, 18, 20]); const ds = divsDe(n); return Q(`Quais são todos os divisores de ${n}?`, ds.join(', '), [ds.slice(1, -1).join(', '), [...ds.slice(0, -1), n * 2].join(', '), [n, n * 2, n * 3].join(', ')], X(`Teste de 1 até ${n}: quem divide ${n} sem sobrar é divisor. Não esqueça do 1 e do próprio ${n}.`)); }
const primo = () => { const p = pick([5, 7, 11, 13]); return Q(`Quantos divisores tem o número ${p}?`, '2', ['1', num(p), '3'], X(`${p} só divide por 1 e por ${p}: 2 divisores (é um número primo).`)); };
const divPrimo = () => { const p = pick([5, 7, 11, 13]); return Q(`Qual é divisor de ${p}?`, num(p), sample([2, 3, 4, 6].filter(d => p % d), 3).map(num), X(`Todo número é divisor de si mesmo: ${p} ÷ ${p} = 1.`)); };
const M6 = {
  A: {
    treinador1: [ehMult([2]), ehMult([2]), ehMult([2]), ehMult([2]), ehMult([2])],
    treinador2: [ehMult([5]), ehMult([5, 10]), ehMult([10]), ehMult([5]), ehMult([10])],
    treinador3: [ehMult([3]), ehMult([3]), ehMult([3]), ehMult([3]), ehMult([3])],
    lider: [qualMult([2]), qualMult([5]), qualMult([3]), qualMult([4]), qualMult([6])],
    revanche: [qualMult([7, 8, 9]), multDois, multDois],
  },
  B: {
    treinador1: [ehDiv, ehDiv, ehDiv, ehDiv, ehDiv],
    treinador2: [qualDiv(), qualDiv(), qualDiv(), qualDiv(), qualDiv()],
    treinador3: [ehDiv, ehDiv, () => SN(true, '1 é divisor de qualquer número?', X('Qualquer número dividido por 1 dá ele mesmo, sem sobrar.')), ehDiv, ehDiv],
    lider: [ehDiv, ehDiv, ehDiv, qualDiv(true), divPrimo],
    revanche: [todosDiv, todosDiv, primo],
  },
};

// ===================== MAPA 7 =====================
const ATALHO = { 50: ['a metade', 2], 10: ['dividir por 10', 10], 25: ['dividir por 4', 4], 20: ['dividir por 5', 5], 1: ['dividir por 100', 100], 100: ['o todo', 1], 75: ['3 partes de 4', 4] };
// PROMPT-101/229: a explicação ensina "20% = 20/100 = 0,2 → valor × 0,2"; o atalho de cabeça vem no fim, como 💡 Confere.
// Os passos do cartão de erro são separados por "; " (passosDe). Com a linha "Na calculadora" aqui, o jogo não acrescenta a dele.
const pctDecimal = (p) => `${p}% = ${p}/100 = ${dec(p)}`;
const pctVezes = (p, N, v = N * p / 100) => `${p}% de ${num(N)} = ${num(N)} × ${dec(p)} = ${num(v)}`;
// PROMPT-229: o × decimal é o jeito principal: "20% = 20/100 = 0,2; 20% de 30 = 30 × 0,2 = 6; Na calculadora: 30 × 0,2 =; 💡 Confere: 30 ÷ 5 = 6"
const confere = (p, N) => p === 100 ? `100% é o todo: ${num(N)}` : p === 75 ? `${num(N)} ÷ 4 × 3 = ${num(N * 0.75)}` : `${num(N)} ÷ ${ATALHO[p][1]} = ${num(N * p / 100)}`;
const naCalcTxt = (p, N) => `Na calculadora: ${num(N)} × ${dec(p)} =`;
const passosPct = (p, N) => `${pctDecimal(p)}; ${pctVezes(p, N)}; ${naCalcTxt(p, N)}; 💡 Confere: ${confere(p, N)}`;
function pct(ps) {
  return () => {
    const p = pick(ps); const base = { 50: 2, 10: 10, 25: 4, 20: 5, 1: 100, 100: 1, 75: 4 }[p]; const N = base * int(2, p === 1 ? 6 : 30);
    const v = N * p / 100;
    return Q(`Quanto é ${p}% de ${N}?`, num(v), erradasNum(v, [v * 10, v * 2, v / 2, N - v, N + p], { inteiro: false }), X(passosPct(p, N)));
  };
}
const PF = [[50, 1, 2], [25, 1, 4], [75, 3, 4], [10, 1, 10], [20, 1, 5], [40, 2, 5]];
const pctFrac = () => { const [p, a, b] = pick(PF); return coin() ? Q(`${p}% é igual a qual fração?`, frac(a, b), erradasFrac(a, b, [[1, p], [a, b * 2], [b, a], [1, 3], [a, b + 1]]), X(`${p}% = ${p}/100 = ${frac(a, b)}`)) : Q(`${frac(a, b)} é igual a quantos por cento?`, `${p}%`, erradasNum(p, [p * 10, p * 2, p / 2, a + b], { fmt: x => `${num(x)}%`, inteiro: false }), X(`${frac(a, b)} = ${p}/100 = ${p}%`)); };
const todo = () => Q('100% de algo significa:', 'o todo', ['a metade', 'nada', 'o dobro'], X('100% = 100/100 = 1 inteiro: é tudo.'));
function desconto() { const p = pick([10, 20, 50]), P = 10 * int(2, 12); const v = P * p / 100; return Q(`Uma camiseta de R$ ${P} tem ${p}% de desconto. Quanto é o desconto?`, reais(v), erradasNum(v, [P - v, p, v * 2, v / 2], { fmt: reais, inteiro: false }),
  X(`${pctDecimal(p)}; Desconto = ${p}% de ${P} = ${P} × ${dec(p)} = ${reais(v)}; ${naCalcTxt(p, P)}; 💡 Confere: ${confere(p, P)}`)); }
function turma() { const N = 2 * int(8, 20); const v = N / 2; return Q(`Numa turma de ${N} alunos, 50% são meninas. Quantas meninas?`, num(v), erradasNum(v, [N, v / 2, 50]), X(passosPct(50, N))); }
function precoFinal() { const p = pick([10, 20, 25, 50]), P = 20 * int(2, 10); const v = P - P * p / 100; return Q(`Um tênis de R$ ${P} tem ${p}% de desconto. Qual o preço final?`, reais(v), erradasNum(v, [P * p / 100, P - p, P + P * p / 100], { fmt: reais, inteiro: false }),
  X(`${pctDecimal(p)}; Desconto = ${p}% de ${P} = ${P} × ${dec(p)} = ${num(P * p / 100)}; Preço final = ${P} − ${num(P * p / 100)} = ${reais(v)}; ${naCalcTxt(p, P)} (o desconto); 💡 Confere: ${confere(p, P)}`)); }
function faltaram() { const [p, d] = pick([[25, 4], [10, 10], [20, 5], [50, 2]]); const N = d * int(4, 10), f = N / d; return Q(`Numa turma de ${N} alunos, ${f} faltaram. Qual porcentagem faltou?`, `${p}%`, erradasNum(p, [f, 100 - p, p * 2 <= 100 ? p * 2 : p / 2, p / 2, 100 / f], { fmt: x => `${num(x)}%`, inteiro: false }), X(`${f} ÷ ${N} = ${dec(p)}; ${dec(p)} = ${p}/100 = ${p}%; Em fração: ${frac(f, N)} = ${frac(1, d)} = ${p}%`)); }
const dec = p => num(p / 100);
// PROMPT-229: "Na calculadora, como faço 20% de 30?" → 30 × 0,2 (às vezes a errada "30 × 2": esqueceu a vírgula)
function naCalc() {
  const p = pick([10, 20, 25, 30, 40, 50, 75]), N = 10 * int(2, 12), d = dec(p);
  const erradas = [`${N} × ${p}`, `${N} ÷ ${d}`, `${N} − ${p}`];
  if (p % 10 === 0 && p / 10 !== 1 && coin()) erradas[int(1, 2)] = `${N} × ${p / 10}`;
  return Q(`Na calculadora, como faço ${p}% de ${N}?`, `${N} × ${d}`, erradas, X(`${pctDecimal(p)}; "De" vira vezes: ${p}% de ${N} = ${N} × ${d}; ${naCalcTxt(p, N)} ${num(N * p / 100)}`));
}
// PROMPT-229: "20% de 30 é o mesmo que:" → 20/100 × 30
function emFracao() {
  const p = pick([10, 20, 25, 30, 40, 50, 75]), N = 10 * int(2, 12);
  return Q(`${p}% de ${N} é o mesmo que:`, `${p}/100 × ${N}`, [`${p} × ${N}`, `100/${p} × ${N}`, `${p}/${N} × 100`],
    X(`${p}% = ${p}/100; "De" vira vezes: ${p}% de ${N} = ${p}/100 × ${N}; = ${p * N}/100 = ${num(N * p / 100)}`));
}
const pctX = p => `${p}% = ${p}/100 = ${dec(p)}; "De" vira vezes: ${p}% de um valor = valor × ${dec(p)}`;
function qualConta() {
  const p = pick([10, 20, 25, 30, 40, 50, 75]), N = 10 * int(2, 12);
  if (p === 50 && coin()) return Q(`"50% de ${N}" é o mesmo que:`, `${N} ÷ 2`, [`${N} × 2`, `${N} − 50`, `${N} ÷ 50`], X('50% é a metade: divide por 2.'));
  return Q(`"${p}% de ${N}" é o mesmo que:`, `${N} × ${dec(p)}`, [`${N} × ${p}`, ...sample([`${N} + ${p}`, `${N} ÷ ${dec(p)}`, `${N} − ${p}`], 2)], X(pctX(p)));
}
const pctDec = () => { const p = pick([5, 10, 15, 20, 30, 40, 50, 60, 100]); const d = p / 100; return Q(`${p}% em número decimal:`, num(d), erradasNum(d, [d * 10, d / 10], { inteiro: false }), X(`${p}% = ${p}/100 = ${num(d)}`)); };
const CTX = [
  (p, N) => [`Uma bola de R$ ${N} tem ${p}% de desconto. Qual conta dá o desconto?`],
  (p, N) => [`Numa turma de ${N} alunos, ${p}% são meninas. Qual conta dá o número de meninas?`],
  (p, N) => [`Acertei ${p}% de ${N} questões. Qual conta dá quantas acertei?`],
  (p, N) => [`Num show com ${N * 10} pessoas, ${p}% eram crianças. Qual conta dá o número de crianças?`, N * 10],
];
function contaCtx() { const p = pick([5, 10, 20, 25, 40, 50]), N = 10 * int(2, 9); const [e, NN = N] = pick(CTX)(p, N); return Q(e, `${NN} × ${dec(p)}`, [`${NN} × ${p}`, ...sample([`${NN} − ${p}`, `${NN} + ${dec(p)}`, `${NN} ÷ ${p}`], 2)], X(pctX(p))); }
const leConta = () => { const p = pick([10, 20, 25, 50]), N = 10 * int(2, 9); return Q(`A conta ${N} × ${dec(p)} calcula:`, `${p}% de ${N}`, [`${num(p / 10)}% de ${N}`, `${N} − ${p}`, `${p * 10}% de ${N}`], X(`${dec(p)} = ${p}/100 = ${p}%`)); };
function contaFinal(tipo, ps = [10, 20, 25]) {   // ps: as porcentagens (o Difícil, PROMPT-230, usa 12, 15 e 35)
  const p = pick(ps), P = 10 * int(3, 20);
  if (tipo === 0) return Q(`Um produto de R$ ${P} tem ${p}% de desconto. Qual conta dá o preço final?`, `${P} − ${P} × ${dec(p)}`, [`${P} × ${dec(p)}`, `${P} − ${p}`, `${P} − ${P} × ${p}`], X(`${pctDecimal(p)}; O desconto é ${P} × ${dec(p)}; Preço final = preço − desconto = ${P} − ${P} × ${dec(p)}`));
  if (tipo === 1) return Q(`A mesada de R$ ${P} teve aumento de ${p}%. Qual conta dá a nova mesada?`, `${P} + ${P} × ${dec(p)}`, [`${P} × ${dec(p)}`, `${P} + ${p}`, `${P} + ${P} × ${p}`], X(`${pctDecimal(p)}; O aumento é ${P} × ${dec(p)}; Nova mesada = mesada + aumento = ${P} + ${P} × ${dec(p)}`));
  return Q(`Uma camiseta de R$ ${P} tem ${p}% de desconto. Qual conta dá direto o preço final?`, `${P} × ${dec(100 - p)}`, [`${P} × ${dec(p)}`, `${P} − ${p}`, `${P} × ${dec(100 + p)}`], X(`Com ${p}% de desconto, você paga 100% − ${p}% = ${100 - p}%; ${100 - p}% = ${100 - p}/100 = ${dec(100 - p)}; Preço final = ${P} × ${dec(100 - p)}`));
}
const M7 = {
  A: {
    treinador1: [pct([50]), pct([50]), pct([10]), pct([10]), pct([10])],
    treinador2: [pct([25]), pct([25]), pct([100]), pct([20]), pct([1])],
    treinador3: [pctFrac, naCalc, pctFrac, naCalc, todo],   // PROMPT-229
    lider: [desconto, pct([50]), turma, naCalc, pct([25])],   // PROMPT-229: naCalc no lugar de um pct([10])
    revanche: [precoFinal, pct([20]), faltaram],
  },
  B: {
    treinador1: [qualConta, naCalc, qualConta, emFracao, qualConta],   // PROMPT-229
    treinador2: [pctDec, pctDec, pctDec, pctDec, pctDec],
    treinador3: [contaCtx, contaCtx, contaCtx, contaCtx, contaCtx],
    lider: [qualConta, pctDec, contaCtx, contaCtx, leConta],
    revanche: [() => contaFinal(0), () => contaFinal(1), () => contaFinal(2)],
  },
};

// ===================== MAPA 8 =====================
const FRASES = [
  ['O dobro de um número', '2x', ['x + 2', 'x²', 'x ÷ 2']], ['O triplo de um número', '3x', ['x + 3', 'x³', 'x ÷ 3']],
  ['A metade de um número', 'x ÷ 2', ['2x', 'x − 2', 'x²']], ['O quádruplo de um número', '4x', ['x + 4', 'x⁴', 'x ÷ 4']],
];
function frase() {
  if (coin()) { const [e, r, x] = pick(FRASES); return Q(`Qual expressão representa "${e[0].toLowerCase() + e.slice(1)}"?`, r, x, X('Dobro = 2x, triplo = 3x, quádruplo = 4x, metade = x ÷ 2.')); }
  const k = int(2, 9);
  return coin() ? Q(`Qual expressão representa "um número mais ${k}"?`, `x + ${k}`, [`${k}x`, `x − ${k}`, `x ÷ ${k}`], X(`"Mais" é soma: x + ${k}`)) : Q(`Qual expressão representa "um número menos ${k}"?`, `x − ${k}`, [`${k} − x`, `${k}x`, `x + ${k}`], X(`"Menos" é subtração, e o número vem primeiro: x − ${k}`));
}
const LET = ['x', 'a', 'y', 'm'];
function valorSoma() {
  const n = int(1, 10), k = int(1, 9), t = int(0, 3);
  const [e, v, c] = [[`x + ${k}`, n + k, [n * k, n - k]], [`x − ${k}`, n - k, [n + k, k - n]], [`${k + n} − x`, k, [2 * n + k, n]], ['x + x', 2 * n, [n * n, n, n + 1]]][t];
  if (v < 0) return valorSoma();
  return Q(`Qual é o valor de ${e} quando x = ${n}?`, num(v), erradasNum(v, [...c, v + 1, v - 1]), X(`Troque x por ${n}: ${passos(e.replace(/x/g, n))}`));
}
function valorProd(comConst = false) {
  return () => {
    const a = int(2, 6), n = int(2, 10), c = comConst ? int(1, 5) : 0, op = coin() ? '+' : '−';
    const v = comConst ? (op === '+' ? a * n + c : a * n - c) : a * n;
    const e = comConst ? `${a}x ${op} ${c}` : `${a}x`;
    return Q(`Qual é o valor de ${e} quando x = ${n}?`, num(v), erradasNum(v, [Number(`${a}${n}`) > 99 ? a + n : Number(`${a}${n}`), a + n + (comConst ? c : 0), v + 1]), X(`${a}x é ${a} vezes x. Troque x por ${n}: ${passos(e.replace(/x/, ` × ${n}`))}`));
  };
}
const frase2 = () => { const k = int(1, 5); return pick([() => Q(`Qual expressão representa "o dobro de um número mais ${k}"?`, `2x + ${k}`, [`2(x + ${k})`, `x + 2 + ${k}`, `2x − ${k}`], X(`Primeiro o dobro (2x), depois mais ${k}: 2x + ${k}`)), () => Q('Qual expressão representa "um número ao quadrado"?', 'x²', ['2x', 'x + 2', 'x³'], X('Ao quadrado = x × x = x²'))])(); };
const canetas = () => { const k = int(2, 9); return Q(`Cada caneta custa x reais. Quanto custam ${k} canetas?`, `${k}x`, [`x + ${k}`, `x ÷ ${k}`, `x − ${k}`], X(`${k} canetas de x reais: ${k} × x = ${k}x`)); };
function valorNeg() { const a = int(2, 5), n = -int(1, 4), c = int(1, 6); const v = a * n - c; return Q(`Qual é o valor de ${a}x − ${c} quando x = ${num(n)}?`, num(v), erradasNum(v, [a * -n - c, a * n + c, -v], { neg: true }), X(`Troque x por ${num(n)}: ${passos(`${a} × (${num(n)}) − ${c}`)}`)); }
function valorQuad() { const n = int(2, 6), c = int(1, 9); const v = n * n + c; return Q(`Qual é o valor de x² + ${c} quando x = ${n}?`, num(v), erradasNum(v, [2 * n + c, n + c, n * n]), X(`x² = x × x. Troque x por ${n}: ${n} × ${n} + ${c} = ${n * n} + ${c} = ${v}`)); }
function valor2() { const a = int(2, 5), b = int(2, 5), p = int(1, 6), q = int(1, 6); const v = a * p + b * q; return Q(`Qual é o valor de ${a}a + ${b}b quando a = ${p} e b = ${q}?`, num(v), erradasNum(v, [a + p + b + q, a * q + b * p, v + 1]), X(`Troque a por ${p} e b por ${q}: ${passos(`${a} × ${p} + ${b} × ${q}`)}`)); }
const mono = (k, l) => k === 1 ? l : k === 0 ? '0' : `${k}${l}`;
function somaSem(sub = false) {
  return () => {
    const l = pick(LET); let a = int(1, 9), b = int(1, 9); if (sub && b > a) [a, b] = [b, a];
    const r = sub ? a - b : a + b;
    return Q(`${mono(a, l)} ${sub ? '−' : '+'} ${mono(b, l)}`, mono(r, l), erradasTexto(mono(r, l), [mono(r + 1, l), mono(sub ? a + b : Math.abs(a - b) || r + 2, l), r > 0 ? `${r}${l}²` : mono(1, l), mono(Math.max(r - 1, 2), l), `${mono(Math.max(r, 1), l)}²`, mono(r + 2, l)]), X(`Termos com a mesma letra: ${sub ? 'subtraia' : 'some'} só os números (${a} ${sub ? '−' : '+'} ${b} = ${r}) e repita a letra: ${mono(r, l)}`));
  };
}
function semelhantes() {
  const l = pick(LET), a = int(1, 9), b = int(2, 9), t = int(0, 2);
  const SEM = X('Semelhantes têm a mesma letra com o mesmo expoente. Os números da frente podem ser diferentes.');
  if (t === 0) return SN(true, `${mono(a, l)} e ${mono(b, l)} são termos semelhantes?`, SEM);
  if (t === 1) { const l2 = pick(LET.filter(x => x !== l)); return SN(false, `${mono(a, l)} e ${mono(b, l2)} são termos semelhantes?`, SEM); }
  return SN(false, `${l} e ${l}² são termos semelhantes?`, SEM);
}
const perimQ = () => Q('Qual é o perímetro de um quadrado de lado x?', '4x', ['x⁴', '2x', 'x + 4'], X('Perímetro é a soma dos lados: x + x + x + x = 4x'));
const perimR = () => { const k = int(2, 9); return Q(`Qual é o perímetro de um retângulo de lados x e ${k}?`, `2x + ${2 * k}`, [`2x + ${k}`, `x + ${k}`, `${2 + 2 * k}x`], X(`x + ${k} + x + ${k} = 2x + ${2 * k}`)); };
const tres = () => { const l = pick(LET), a = int(2, 6), b = int(2, 6), c = int(1, 4); const r = a + b + c; return Q(`${mono(a, l)} + ${mono(b, l)} + ${mono(c, l)}`, mono(r, l), [mono(r + 1, l), `${r}${l}³`, mono(a + b, l)], X(`Mesma letra: some os números (${a} + ${b} + ${c} = ${r}) e repita a letra.`)); };
const xkx = () => { const k = int(1, 9); return Q(`Simplifique x + ${k} + x`, `2x + ${k}`, [`${k + 2}x`, `x + ${k}`, `2x + ${k + 1}`], X(`Junte os x: x + x = 2x. O ${k} fica sozinho: 2x + ${k}`)); };
function simpl2() {
  const a = int(3, 8), b = int(1, a - 1), c = int(1, 9), d = int(1, 9); const r = a - b, s = c + d;
  return Q(`Simplifique ${a}x + ${c} − ${mono(b, 'x')} + ${d}`, `${mono(r, 'x')} + ${s}`, [`${mono(a + b, 'x')} + ${s}`, `${mono(r + s, 'x')}`, `${mono(r, 'x')} + ${Math.abs(c - d) || s + 2}`], X(`Junte os x: ${a}x − ${mono(b, 'x')} = ${mono(r, 'x')}. Junte os números: ${c} + ${d} = ${s}`));
}
function simpl3() {
  const a = int(2, 5), b = int(2, 5), c = int(2, 5), d = 1; const r1 = a + c, r2 = b - d;
  const r = `${r1}a + ${mono(r2, 'b')}`; return Q(`Simplifique ${a}a + ${b}b + ${c}a − b`, r, erradasTexto(r, [`${r1}a + ${b + d}b`, `${r1 + r2}ab`, `${a + b}a + ${c - d}b`, `${r1 + 1}a + ${mono(r2, 'b')}`]), X(`Junte os a: ${a}a + ${c}a = ${r1}a. Junte os b: ${b}b − b = ${mono(r2, 'b')}`));
}
const M8 = {
  A: {
    treinador1: [frase, frase, frase, frase, frase],
    treinador2: [valorSoma, valorSoma, valorSoma, valorSoma, valorSoma],
    treinador3: [valorProd(), valorProd(), valorProd(), valorProd(true), valorProd(true)],
    lider: [frase2, frase2, valorProd(), valorSoma, canetas],
    revanche: [valorNeg, valorQuad, valor2],
  },
  B: {
    treinador1: [somaSem(), somaSem(), somaSem(), somaSem(), somaSem()],
    treinador2: [somaSem(true), somaSem(true), somaSem(true), somaSem(true), somaSem(true)],
    treinador3: [semelhantes, semelhantes, semelhantes, semelhantes, semelhantes],
    lider: [perimQ, perimR, tres, somaSem(true), xkx],
    revanche: [simpl2, simpl3, simpl2],
  },
};

export const MAPAS_5_8 = { 5: M5, 6: M6, 7: M7, 8: M8 };
export { SN };

// ===================== ⭐ GINÁSIO DIFÍCIL (PROMPT-230) =====================
// Faixa difícil (ver mapas1a4.js): porcentagens "quebradas" (12%, 15%, 35%…), valores de 3 algarismos e um passo a mais
// (preço final, aumento, desconto em cima de desconto, achar o total).
const PQ = [5, 12, 15, 30, 35, 40, 60, 70, 8];
function pctD() {
  const p = pick(PQ), N = 10 * int(12, 95), v = N * p / 100;
  return Q(`Quanto é ${p}% de ${N}?`, num(v), erradasNum(v, [v * 10, v / 10, N - v, v + p, v * 2], { inteiro: false }), X(`${pctDecimal(p)}; ${pctVezes(p, N)}; ${naCalcTxt(p, N)}`));
}
function precoFinalD(aumento = false) {
  return () => {
    const p = pick([12, 15, 30, 35, 8]), P = 10 * int(8, 45), d = arred(P * p / 100), v = arred(aumento ? P + d : P - d);
    const e = aumento ? `Um aluguel de R$ ${P} teve aumento de ${p}%. Qual é o novo valor?` : `Um celular de R$ ${P} tem ${p}% de desconto. Qual é o preço final?`;
    return Q(e, reais(v), erradasNum(v, [d, aumento ? P - d : P + d, aumento ? P + p : P - p], { fmt: reais, inteiro: false }),
      X(`${pctDecimal(p)}; ${aumento ? 'Aumento' : 'Desconto'} = ${P} × ${dec(p)} = ${num(d)}; ${aumento ? 'Novo valor' : 'Preço final'} = ${P} ${aumento ? '+' : '−'} ${num(d)} = ${reais(v)}; 💡 Direto: ${P} × ${dec(aumento ? 100 + p : 100 - p)} = ${num(v)}`));
  };
}
function valorTotalD() {
  const p = pick([5, 10, 20, 25, 50]), N = 20 * int(3, 40), v = N * p / 100;
  return Q(`${p}% de um número é ${num(v)}. Que número é esse?`, num(N), erradasNum(N, [v * p / 100, v * 2, N / 2, N * 2, v + p], { inteiro: false }),
    X(`${pctDecimal(p)}; ${dec(p)} × número = ${num(v)}; Número = ${num(v)} ÷ ${dec(p)} = ${num(N)}; 💡 Confere: ${num(N)} × ${dec(p)} = ${num(v)}`));
}
function descontoDuplo() {
  const P = 100 * int(1, 6), [p, q] = [pick([10, 20, 50]), pick([10, 20])], m = arred(P * (1 - p / 100)), v = arred(m * (1 - q / 100));
  return Q(`Um produto de R$ ${P} teve ${p}% de desconto. Depois, mais ${q}% de desconto sobre o novo preço. Qual é o preço final?`, reais(v),
    erradasNum(v, [P * (1 - (p + q) / 100), P - p - q, m, P * q / 100], { fmt: reais, inteiro: false }),
    X(`1º desconto: ${P} × ${dec(100 - p)} = ${num(m)}; 2º desconto (sobre ${num(m)}): ${num(m)} × ${dec(100 - q)} = ${num(v)}; Não é ${p + q}% de uma vez: o 2º desconto é sobre o preço novo.`));
}
function faltaramD() {
  const p = pick([5, 15, 35, 45, 55, 65]), N = 20 * int(2, 15), f = N * p / 100;
  return Q(`Numa escola de ${N} alunos, ${f} faltaram. Qual porcentagem faltou?`, `${p}%`, erradasNum(p, [f, 100 - p, p + 10, p - 5], { fmt: x => `${num(x)}%`, inteiro: false }),
    X(`${f} ÷ ${N} = ${dec(p)}; ${dec(p)} = ${p}/100 = ${p}%`));
}
// 7 B: qual conta / decimal
function pctDecD() {
  const p = pick([7, 12, 12.5, 4.5, 150, 120, 3, 0.5, 2.5, 8, 175, 0.8, 35.5, 99]), d = arred(p / 100);
  const f = x => num(x, 5);   // 0,0045 (com 3 casas viraria 0,004)
  return Q(`${num(p)}% em número decimal:`, f(d), erradasNum(d, [d * 10, d / 10, p], { fmt: f, inteiro: false }), X(`${num(p)}% = ${num(p)}/100 = ${f(d)}`));
}
function contaDupla() {
  const P = 10 * int(5, 30), p = pick([10, 20]), q = pick([10, 20, 30].filter(x => x !== p));   // iguais: a errada "× 1" ficaria estranha
  return Q(`Um produto de R$ ${P} teve ${p}% de desconto e depois ${q}% de aumento. Qual conta dá o preço final?`, `${P} × ${dec(100 - p)} × ${dec(100 + q)}`,
    [`${P} × ${dec(100 - p + q)}`, `${P} × ${dec(p)} × ${dec(q)}`, `${P} − ${p} + ${q}`],
    X(`Desconto de ${p}%: paga ${100 - p}% = × ${dec(100 - p)}; Aumento de ${q}%: fica ${100 + q}% = × ${dec(100 + q)}; Juntos: ${P} × ${dec(100 - p)} × ${dec(100 + q)}`));
}
function contaTotalD() {
  const p = pick([5, 10, 20, 25, 40]), v = 2 * int(3, 40);
  return Q(`${p}% de um valor é ${v}. Qual conta dá o valor?`, `${v} ÷ ${dec(p)}`, [`${v} × ${dec(p)}`, `${v} × ${p}`, `${v} ÷ ${p}`],
    X(`${pctDecimal(p)}; ${dec(p)} × valor = ${v}; Valor = ${v} ÷ ${dec(p)}`));
}
const PD = [12, 15, 35];
const M7D = {
  A: {
    treinador1: [pctD, pctD, pctD],
    treinador2: [precoFinalD(), precoFinalD(true), pctD],
    treinador3: [faltaramD, valorTotalD, pctD],
    lider: [precoFinalD(), valorTotalD, descontoDuplo, faltaramD, precoFinalD(true)],
  },
  B: {
    treinador1: [pctDecD, pctDecD, pctDecD],
    treinador2: [() => contaFinal(0, PD), () => contaFinal(1, PD), () => contaFinal(2, PD)],
    treinador3: [contaDupla, contaTotalD, () => contaFinal(2, PD)],
    lider: [pctDecD, contaDupla, contaTotalD, () => contaFinal(0, PD), () => contaFinal(1, PD)],
  },
};
// mapa 5: bases maiores, decimais e frações ao quadrado, potências na expressão, mesma base e raízes maiores
const QUAD_D = [13, 14, 15, 16, 17, 18, 19, 20, 25, 30].map(b => [b, 2]);
const CUBO_D = [[6, 3], [7, 3], [8, 3], [9, 3], [3, 5], [2, 6], [2, 7], [2, 8], [2, 10], [4, 4], [5, 4]];
function potDec() {
  const b = pick([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.1, 1.2, 1.5, 2.5]), n = b < 0.6 && coin() ? 3 : 2, v = arred(b ** n);
  return Q(pw(b, n), num(v, 4), erradasNum(v, [b * n, v * 10, v / 10, b + n], { fmt: x => num(x, 4), inteiro: false }), X(`${pw(b, n)} = ${Array(n).fill(num(b)).join(' × ')} = ${num(v, 4)}. As casas depois da vírgula somam: ${n} × ${String(num(b)).split(',')[1]?.length || 0}`));
}
function potFrac() {
  const q = int(2, 9), p = int(1, q - 1), n = q <= 5 && coin() ? 3 : 2;
  if (mdc(p, q) > 1) return potFrac();
  const a = p ** n, b = q ** n;
  return Q(`(${frac(p, q)})${sup(n)}`, frac(a, b), erradasFrac(a, b, [[p * n, q * n], [p, b], [a, q], [p * n, q]]), X(`Eleva em cima e embaixo: ${p}${sup(n)} = ${a} e ${q}${sup(n)} = ${b}. Fica ${frac(a, b)}`));
}
function exprPot() {
  for (;;) {
    const [a, n] = pick([[2, 3], [3, 2], [2, 4], [4, 2], [5, 2], [3, 3], [10, 2]]), [b, m] = pick([[2, 2], [3, 2], [2, 3], [4, 2]]), c = int(2, 6), t = int(0, 2);
    const A = a ** n, B = b ** m;
    const [e, v, err, ex] = [
      [`${a}${sup(n)} + ${b}${sup(m)} × ${c}`, A + B * c, [(A + B) * c, a * n + b * m * c, A + b * m * c], `${A} + ${B} × ${c} = ${A} + ${B * c}`],
      [`${a}${sup(n)} − ${c} × ${b}${sup(m)}`, A - c * B, [(A - c) * B, a * n - c * b * m, A - c * b * m], `${A} − ${c} × ${B} = ${A} − ${c * B}`],
      [`(${a} + ${c})² − ${b}${sup(m)}`, (a + c) ** 2 - B, [a * a + c * c - B, 2 * (a + c) - B, (a + c) ** 2 + B], `${a + c}² − ${B} = ${(a + c) ** 2} − ${B}`],
    ][t];
    if (v < 0) continue;
    return Q(e, num(v), erradasNum(v, err), X(`Primeiro as potências, depois × e ÷, por último + e −: ${ex} = ${v}`));
  }
}
function mesmaBase() {
  const b = pick([2, 3, 5, 7, 10]), n = int(2, 6), m = int(3, 7), div = coin() && n !== m;
  const [x, y] = div ? [Math.max(n, m) + 2, Math.min(n, m)] : [n, m], r = div ? x - y : x + y;
  return Q(`${b}${sup(x)} ${div ? '÷' : '×'} ${b}${sup(y)} em uma potência só:`, `${b}${sup(r)}`, erradasTexto(`${b}${sup(r)}`, [`${b}${sup(div ? Math.round(x / y) || x + y : x * y)}`, `${b * b}${sup(r)}`, `${b}${sup(div ? x + y : Math.abs(x - y) || r + 1)}`, `${b}${sup(r + 1)}`]),
    X(div ? `Mesma base na divisão: repete a base e subtrai os expoentes (${x} − ${y} = ${r}).` : `Mesma base na multiplicação: repete a base e soma os expoentes (${x} + ${y} = ${r}).`));
}
function potDePot() {
  const b = pick([2, 3, 5, 10]), n = int(3, 5), m = int(2, 3), r = n * m;
  return Q(`(${b}${sup(n)})${sup(m)} em uma potência só:`, `${b}${sup(r)}`, erradasTexto(`${b}${sup(r)}`, [`${b}${sup(n + m)}`, `${b * m}${sup(n)}`, `${b}${sup(n ** m)}`, `${b}${sup(r + 1)}`]), X(`Potência de potência: multiplica os expoentes (${n} × ${m} = ${r}).`));
}
const raizD = () => { const b = int(13, 30), n = b * b; return Q(`√${n}`, num(b), erradasNum(b, [n / 2, b + 1, b - 1, b + 10]), X(`Qual número vezes ele mesmo dá ${n}? ${b} × ${b} = ${n}, então √${n} = ${b}`)); };
function raizDec() {
  const t = int(0, 1);
  if (t === 0) { const b = pick([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.1, 1.2]), n = arred(b * b); return Q(`√${num(n)}`, num(b), erradasNum(b, [n / 2, b * 10, b / 10, arred(b + 0.1)], { inteiro: false }), X(`${num(b)} × ${num(b)} = ${num(n)}, então √${num(n)} = ${num(b)}`)); }
  const q = int(2, 12), p = int(1, q - 1); if (mdc(p, q) > 1) return raizDec();
  return Q(`√(${frac(p * p, q * q)})`, frac(p, q), erradasFrac(p, q, [[p * p / 2, q * q / 2], [p, q * q], [p * p, q], [q, p], [p + 1, q], [p, q + 1]]), X(`Raiz em cima e embaixo: √${p * p} = ${p} e √${q * q} = ${q}. Fica ${frac(p, q)}`));
}
function raizExpr() {
  for (;;) {
    const r = int(5, 15), s = int(2, 9), [b, n] = pick([[2, 3], [3, 2], [2, 4], [4, 2], [5, 2]]), v = r * s - b ** n;
    if (v < 0) continue;
    return Q(`√${r * r} × ${s} − ${b}${sup(n)}`, num(v), erradasNum(v, [r * r * s - b ** n, r * s - b * n, r * (s - b ** n)]), X(`√${r * r} = ${r} e ${b}${sup(n)} = ${b ** n}. Então ${r} × ${s} − ${b ** n} = ${r * s} − ${b ** n} = ${v}`));
  }
}
function negPotD() {
  const b = -int(2, 5), n = int(2, 5), t = coin(), v = t ? b ** n : -((-b) ** n);
  const e = t ? pw(b, n) : `−${-b}${sup(n)}`;
  return Q(e, num(v), erradasNum(v, [-v, b * n, -b * n, (-b) ** (n - 1)], { neg: true }), X(t ? `${abre(b, n)}. Com parênteses o sinal entra na conta: expoente par dá positivo, ímpar dá negativo.` : `Sem parênteses, o expoente vale só para o ${-b}: −(${-b}${sup(n)}) = −${(-b) ** n}.`));
}
const M5D = {
  A: {
    treinador1: [pot(QUAD_D), pot(QUAD_D), pot(CUBO_D)],
    treinador2: [potDec, potFrac, potDec],
    treinador3: [exprPot, mesmaBase, potDePot],
    lider: [exprPot, potFrac, mesmaBase, pot(CUBO_D), potDec],
  },
  B: {
    treinador1: [raizD, raizD, raizD],
    treinador2: [raizDec, raizDec, raizDec],
    treinador3: [negPotD, negPotD, negPotD],
    lider: [raizExpr, negPotD, raizDec, raizD, raizExpr],
  },
};

// mapa 6: números de 3 algarismos (regras do 3, 4, 6 e 9), MMC e MDC em problemas, primos até 100
const ehMultD = (ks) => () => {
  const k = pick(ks); const n = coin() ? k * int(12, 111) : k * int(12, 111) + int(1, k - 1);
  const regra = { 3: 'some os algarismos: se a soma é da tabuada do 3, é múltiplo', 4: 'olhe os dois últimos algarismos: se formam múltiplo de 4, é múltiplo', 6: 'tem que ser par e múltiplo de 3 ao mesmo tempo', 9: 'some os algarismos: se a soma é da tabuada do 9, é múltiplo' }[k];
  return SN(n % k === 0, `${n} é múltiplo de ${k}?`, X(`Regra do ${k}: ${regra}. ${divTxt(n, k)}`));
};
function qualMultD() {
  const k = pick([6, 7, 8, 9, 12, 15]), certo = k * int(9, 40), err = new Set();
  while (err.size < 3) { const x = certo + pick([-4, -3, -2, -1, 1, 2, 3, 4, 5, 6]); if (x > 1 && x % k !== 0) err.add(x); }
  return Q(`Qual é múltiplo de ${k}?`, num(certo), [...err].map(num), X(`${certo} ÷ ${k} = ${certo / k}, sem sobrar.`));
}
const mdcN = (a, b) => (b ? mdcN(b, a % b) : a);
function mmcProb() {
  const [a, b] = pick([[4, 6], [6, 8], [6, 9], [8, 12], [10, 15], [12, 18], [9, 12], [6, 10], [15, 20]]), m = a * b / mdcN(a, b);
  const [txt, un] = pick([[`Um ônibus passa a cada ${a} minutos e outro a cada ${b} minutos. Saíram juntos agora. Daqui a quantos minutos saem juntos de novo?`, 'min'], [`Um pisca-pisca acende a cada ${a} segundos e outro a cada ${b} segundos. Acenderam juntos agora. Daqui a quantos segundos acendem juntos de novo?`, 's']]);
  return Q(txt, `${m} ${un}`, erradasNum(m, [a * b, a + b, m * 2, mdcN(a, b)], { fmt: x => `${num(x)} ${un}` }), X(`É o MMC de ${a} e ${b}: múltiplos de ${a} (${[1, 2, 3, 4].map(i => a * i).join(', ')}…) e de ${b} (${[1, 2, 3].map(i => b * i).join(', ')}…). O primeiro em comum é ${m}.`));
}
function mmcConta() { const [a, b] = pick([[4, 6], [6, 8], [6, 9], [8, 12], [10, 15], [12, 18], [9, 12], [6, 10], [4, 10], [15, 20]]), m = a * b / mdcN(a, b); return Q(`Qual é o MMC de ${a} e ${b}?`, num(m), erradasNum(m, [a * b, mdcN(a, b), m * 2, a + b]), X(`O menor número que está na tabuada do ${a} e na do ${b}: ${m}`)); }
function mdcProb() {
  const [a, b] = pick([[24, 36], [18, 30], [20, 30], [16, 24], [12, 18], [30, 45], [28, 42], [36, 48]]), d = mdcN(a, b);
  return Q(`Tenho fitas de ${a} cm e ${b} cm. Quero cortar as duas em pedaços iguais, do maior tamanho possível, sem sobrar. Quanto mede cada pedaço?`, `${d} cm`, erradasNum(d, [a * b / d, d / 2, b - a, d * 2], { fmt: x => `${num(x)} cm` }), X(`É o MDC de ${a} e ${b}: o maior número que divide os dois. ${a} ÷ ${d} = ${a / d} e ${b} ÷ ${d} = ${b / d}.`));
}
function mdcConta() { const [a, b] = pick([[24, 36], [18, 30], [20, 30], [16, 24], [12, 18], [30, 45], [28, 42], [36, 48], [40, 60]]), d = mdcN(a, b); return Q(`Qual é o MDC de ${a} e ${b}?`, num(d), erradasNum(d, [a * b / d, d / 2, d * 2, b - a]), X(`O maior divisor que ${a} e ${b} têm em comum: ${d}`)); }
const PRIMOS = [53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 41, 43, 47, 37], COMPOSTOS = [51, 57, 87, 91, 93, 69, 77, 49, 39, 63, 81, 85, 95, 99];
const fat = n => { for (let d = 2; d * d <= n; d++) if (n % d === 0) return `${n} = ${d} × ${n / d}`; return ''; };
function qualPrimo() { const p = pick(PRIMOS), c = sample(COMPOSTOS, 3); return Q('Qual destes é primo?', num(p), c.map(num), X(`${p} só divide por 1 e por ele mesmo. Os outros dividem: ${c.map(fat).join('; ')}.`)); }
function ehPrimo() { const n = coin() ? pick(PRIMOS) : pick(COMPOSTOS); return SN(PRIMOS.includes(n), `${n} é primo?`, X(PRIMOS.includes(n) ? `${n} não divide por 2, 3, 5 nem 7: é primo.` : `Não é: ${fat(n)}.`)); }
const DIV_D = [36, 48, 60, 72, 84, 90, 96, 100, 120, 64];
function qtdDiv() { const n = pick(DIV_D), ds = divsDe(n); return Q(`Quantos divisores tem ${n}?`, num(ds.length), erradasNum(ds.length, [ds.length - 2, ds.length + 2, ds.length - 1, n / 2]), X(`Divisores de ${n}: ${ds.join(', ')}. São ${ds.length}.`)); }
function qualDivD() {
  for (;;) {
    const n = pick(DIV_D), ds = divsDe(n).filter(d => d > 6 && d < n), nd = [7, 8, 9, 11, 12, 14, 15, 16, 18, 24, 25].filter(d => n % d !== 0);
    if (!ds.length || nd.length < 3) continue;
    return Q(`Qual é divisor de ${n}?`, num(pick(ds)), sample(nd, 3).map(num), X(`Divisores de ${n}: ${divsDe(n).join(', ')}`));
  }
}
const M6D = {
  A: {
    treinador1: [ehMultD([3, 9]), ehMultD([4]), ehMultD([3, 9])],
    treinador2: [ehMultD([6]), qualMultD, ehMultD([4, 6])],
    treinador3: [mmcConta, mmcProb, mmcConta],
    lider: [qualMultD, mmcProb, ehMultD([9]), mmcConta, ehMultD([4, 6])],
  },
  B: {
    treinador1: [qualDivD, qtdDiv, qualDivD],
    treinador2: [mdcConta, mdcProb, mdcConta],
    treinador3: [qualPrimo, ehPrimo, qualPrimo],
    lider: [mdcProb, qtdDiv, qualPrimo, qualDivD, ehPrimo],
  },
};

// mapa 8: frases com dois passos, valor com negativos e quadrados, distributiva e termos com sinal
function fraseD() {
  const k = int(3, 9);
  return pick([
    () => Q(`Qual expressão representa "o triplo de um número menos ${k}"?`, `3x − ${k}`, [`3(x − ${k})`, `x − 3 − ${k}`, `${k} − 3x`], X(`Primeiro o triplo (3x), depois menos ${k}: 3x − ${k}`)),
    () => Q(`Qual expressão representa "o dobro da soma de um número com ${k}"?`, `2(x + ${k})`, [`2x + ${k}`, `x + 2 + ${k}`, `2x + 2`], X(`Primeiro a soma (x + ${k}), depois o dobro dela inteira: 2(x + ${k})`)),
    () => Q(`Qual expressão representa "a metade de um número mais ${k}"?`, `x ÷ 2 + ${k}`, [`(x + ${k}) ÷ 2`, `2x + ${k}`, `x ÷ ${k} + 2`], X(`Primeiro a metade (x ÷ 2), depois mais ${k}: x ÷ 2 + ${k}`)),
    () => Q(`Qual expressão representa "o quadrado de um número menos o dobro dele"?`, 'x² − 2x', ['2x − x²', 'x² − 2', '(x − 2)²'], X('Quadrado: x². Dobro: 2x. "Menos": x² − 2x')),
    () => Q(`Qual expressão representa "a diferença entre um número e ${k}, vezes 3"?`, `3(x − ${k})`, [`3x − ${k}`, `x − 3 × ${k}`, `3(${k} − x)`], X(`A diferença inteira (x − ${k}) vezes 3: 3(x − ${k})`)),
  ])();
}
function valorD() {
  const t = int(0, 3), n = pick([-5, -4, -3, -2, -1, 2, 3, 4, 5]);
  if (t === 0) { const a = int(2, 4), b = int(1, 6), v = a * n * n - b * n; return Q(`Qual é o valor de ${a}x² − ${b}x quando x = ${num(n)}?`, num(v), erradasNum(v, [a * 2 * n - b * n, -a * n * n - b * n, a * n * n + b * n], { neg: true }), X(`Troque x por ${n < 0 ? `(${num(n)})` : n}: ${a} × ${n * n} − ${b} × ${n < 0 ? `(${num(n)})` : n} = ${a * n * n} ${-b * n < 0 ? '−' : '+'} ${Math.abs(b * n)} = ${num(v)}`)); }
  if (t === 1) { const c = int(1, 9), v = n * n - c; return Q(`Qual é o valor de x² − ${c} quando x = ${num(n)}?`, num(v), erradasNum(v, [-n * n - c, 2 * n - c, n * n + c], { neg: true }), X(`x² = ${n < 0 ? `(${num(n)})` : n} × ${n < 0 ? `(${num(n)})` : n} = ${n * n} (negativo ao quadrado dá positivo). ${n * n} − ${c} = ${num(v)}`)); }
  if (t === 2) { const a = int(2, 6), p = pick([-4, -3, -2, 2, 3]), q = pick([-3, -2, -1, 1, 2, 4]), v = a * p + p * q; return Q(`Qual é o valor de ${a}a + ab quando a = ${num(p)} e b = ${num(q)}?`, num(v), erradasNum(v, [a * p - p * q, a + p + q, -v], { neg: true }), X(`${a} × (${num(p)}) + (${num(p)}) × (${num(q)}) = ${num(a * p)} ${p * q < 0 ? '−' : '+'} ${Math.abs(p * q)} = ${num(v)}`)); }
  const a = int(2, 5), b = int(2, 9), c = int(2, 4), v = a * (n + b) - c * n;
  return Q(`Qual é o valor de ${a}(x + ${b}) − ${c}x quando x = ${num(n)}?`, num(v), erradasNum(v, [a * n + b - c * n, a * (n + b) + c * n, a * (n - b) - c * n], { neg: true }), X(`${a} × (${num(n)} + ${b}) − ${c} × (${num(n)}) = ${a} × ${num(n + b)} ${-c * n < 0 ? '−' : '+'} ${Math.abs(c * n)} = ${num(v)}`));
}
const monoS = (k, l, prim = false) => { const a = Math.abs(k), m = a === 1 ? l : `${a}${l}`; return k < 0 ? (prim ? `−${m}` : ` − ${m}`) : (prim ? m : ` + ${m}`); };
const exprS = (ka, kb, kc = null) => { let s = ''; if (ka) s += monoS(ka, 'x', true); if (kb) s += s ? monoS(kb, 'y') : monoS(kb, 'y', true); if (kc) s += s ? (kc < 0 ? ` − ${-kc}` : ` + ${kc}`) : num(kc); return s || '0'; };
function simplNeg() {
  for (;;) {
    const a = int(2, 9), b = int(2, 9), c = int(-9, 9), d = int(1, 9); const r = a - b, s = c + d;
    if (!r || !c || !s) continue;
    const e = `${a}x${c < 0 ? ` − ${-c}` : ` + ${c}`} − ${b}x + ${d}`, R = exprS(r, 0, s);
    return Q(`Simplifique ${e}`, R, erradasTexto(R, [exprS(a + b, 0, s), exprS(r, 0, c - d), exprS(-r, 0, s), exprS(r + s, 0), exprS(r, 0, s + 2)]), X(`Junte os x: ${a}x − ${b}x = ${exprS(r, 0)}. Junte os números: ${c} + ${d} = ${s}. Fica ${R}`));
  }
}
function distrib() {
  for (;;) {
    const a = int(2, 6), b = int(1, 9), c = int(1, 5), neg = coin(), op = coin() ? '+' : '−';
    const kx = neg ? -a : a, kc = (neg ? -a : a) * (op === '+' ? b : -b), rx = kx + c;
    if (!rx) continue;
    const e = `${neg ? '−' : ''}${a}(x ${op} ${b}) + ${c === 1 ? '' : c}x`, R = exprS(rx, 0, kc);
    return Q(`Simplifique ${e}`, R, erradasTexto(R, [exprS(kx + c, 0, op === '+' ? b : -b), exprS(-kx + c, 0, kc), exprS(rx, 0, -kc), exprS(rx + 1, 0, kc), exprS(a + c, 0, a * b)]),
      X(`Distribua: ${neg ? '−' : ''}${a} × x = ${exprS(kx, 0)} e ${neg ? '−' : ''}${a} × ${op === '+' ? '' : '(−'}${b}${op === '+' ? '' : ')'} = ${num(kc)}. Depois junte os x: ${exprS(kx, 0)} + ${c === 1 ? '' : c}x = ${exprS(rx, 0)}. Fica ${R}`));
  }
}
function simplXY() {
  for (;;) {
    const a = int(2, 9), b = int(2, 9), c = int(1, 9), d = int(1, 9), sx = coin() ? 1 : -1, sy = coin() ? 1 : -1;
    const rx = a + sx * c, ry = -b + sy * d; if (!rx || !ry) continue;
    const e = `${a}x − ${b}y ${sx > 0 ? '+' : '−'} ${c === 1 ? '' : c}x ${sy > 0 ? '+' : '−'} ${d === 1 ? '' : d}y`, R = exprS(rx, ry);
    return Q(`Simplifique ${e}`, R, erradasTexto(R, [exprS(rx, -ry), exprS(a - sx * c, ry), exprS(rx + ry, 0).replace(/x$/, 'xy'), exprS(rx, b + sy * d), exprS(rx + 1, ry)]),
      X(`Junte os x: ${a} ${sx > 0 ? '+' : '−'} ${c} = ${rx}. Junte os y: −${b} ${sy > 0 ? '+' : '−'} ${d} = ${ry}. Fica ${R}`));
  }
}
function perimExpr() {
  const a = int(2, 5), b = int(1, 9), c = int(1, 4), d = int(1, 9);
  const R = `${2 * (a + c)}x + ${2 * (b + d)}`;
  return Q(`Um retângulo tem lados ${a}x + ${b} e ${c === 1 ? '' : c}x + ${d}. Qual é o perímetro?`, R, erradasTexto(R, [`${a + c}x + ${b + d}`, `${2 * (a + c)}x + ${b + d}`, `${2 * (a + c) + 2 * (b + d)}x`, `${a + c}x + ${2 * (b + d)}`]), X(`Perímetro = 2 × (um lado + o outro) = 2 × (${a + c}x + ${b + d}) = ${R}`));
}
const M8D = {
  A: {
    treinador1: [fraseD, fraseD, fraseD],
    treinador2: [valorD, valorD, valorD],
    treinador3: [valorD, fraseD, valorD],
    lider: [fraseD, valorD, valorD, fraseD, valorD],
  },
  B: {
    treinador1: [simplNeg, simplNeg, simplNeg],
    treinador2: [distrib, distrib, distrib],
    treinador3: [simplXY, simplXY, perimExpr],
    lider: [distrib, simplXY, simplNeg, perimExpr, distrib],
  },
};
export const DIFICIL_5_8 = { 5: M5D, 6: M6D, 7: M7D, 8: M8D };

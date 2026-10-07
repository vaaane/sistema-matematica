import { int, pick, shuffle, sample, coin, num, reais, arred, ehInteiro, erradasNum, erradasTexto, frac, erradasFrac, passos } from './base.js';
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
  if (tipo === 0) return Q(`${b}² é o mesmo que:`, `${b} × ${b}`, [`${b} × 2`, `${b} + ${b}`], EXP);
  if (tipo === 1) return Q(`${b}³ é o mesmo que:`, `${b} × ${b} × ${b}`, [`${b} × 3`, `${b} + ${b} + ${b}`], EXP);
  if (tipo === 2) { const n = int(3, 5); return Q(`${Array(n).fill(b).join(' × ')} em forma de potência:`, `${b}${sup(n)}`, erradasTexto(`${b}${sup(n)}`, [`${b}${sup(n - 1)}`, `${n}${sup(b)}`, `${b * n}²`], 2), EXP); }
  let n = int(2, 5); if (n === b) n = b === 5 ? 4 : n + 1; return Q(`Na potência ${b}${sup(n)}, qual número é a base?`, num(b), [num(n), num(Math.pow(b, n))], X(`A base é o número grande (${b}); o expoente é o pequeno em cima (${n}).`));
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
    while (err.size < 2) { const x = certo + pick([-3, -2, -1, 1, 2, 3, 4]); if (x > 1 && x % k !== 0) err.add(x); }
    return Q(`Qual é múltiplo de ${k}?`, num(certo), [...err].map(num), X(`Múltiplos de ${k} aparecem na tabuada do ${k}: ${k} × ${certo / k} = ${certo}`));
  };
}
function primeirosMult() { const k = int(3, 9); const r = [1, 2, 3, 4].map(i => i * k).join(', '); return Q(`Quais são os 4 primeiros múltiplos de ${k} (sem o zero)?`, r, [[k, k + 2, k + 4, k + 6].join(', '), [2, 3, 4, 5].map(i => i * k).join(', '), [1, 2, 3, 4].map(i => i + k).join(', ')], X(`${k} × 1, ${k} × 2, ${k} × 3, ${k} × 4 = ${r}`)); }
function multDois() {
  const [a, b] = pick([[2, 3], [2, 5], [3, 4], [3, 5], [2, 7], [4, 5]]); const m = a * b * int(1, 2); const err = new Set();
  while (err.size < 2) { const x = pick([a, b]) * int(2, 8); if (x % a !== 0 || x % b !== 0) err.add(x); }
  return Q(`Qual é múltiplo de ${a} e de ${b} ao mesmo tempo?`, num(m), [...err].map(num), X(`${m} ÷ ${a} = ${m / a} e ${m} ÷ ${b} = ${m / b}: divide pelos dois sem sobrar.`));
}
const DIV_N = [6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24, 25, 30];
const divsDe = n => Array.from({ length: n }, (_, i) => i + 1).filter(d => n % d === 0);
const ehDiv = () => { const n = pick(DIV_N), ds = divsDe(n).filter(d => d > 1 && d < n), nao = [2, 3, 4, 5, 6, 7, 8, 9].filter(d => n % d !== 0); const d = coin() && ds.length ? pick(ds) : pick(nao); return SN(n % d === 0, `${d} é divisor de ${n}?`, X(`${divTxt(n, d)} ${n % d === 0 ? 'Então é' : 'Então não é'} divisor de ${n}.`)); };
function qualDiv(nao = false) {
  return () => {
    for (; ;) {
      const n = pick(DIV_N), ds = divsDe(n).filter(d => d > 1 && d < n), nd = [2, 3, 4, 5, 6, 7, 8, 9].filter(d => n % d !== 0);
      if (nao ? ds.length < 2 || !nd.length : !ds.length || nd.length < 2) continue;
      const DS = X(`Divisores de ${n}: ${divsDe(n).join(', ')}`);
      if (nao) return Q(`Qual NÃO é divisor de ${n}?`, num(pick(nd)), sample(ds, 2).map(num), DS);
      return Q(`Qual é divisor de ${n}?`, num(pick(ds)), sample(nd, 2).map(num), DS);
    }
  };
}
function todosDiv() { const n = pick([6, 8, 10, 12, 15, 16, 18, 20]); const ds = divsDe(n); return Q(`Quais são todos os divisores de ${n}?`, ds.join(', '), [ds.slice(1, -1).join(', '), [...ds.slice(0, -1), n * 2].join(', '), [n, n * 2, n * 3].join(', ')], X(`Teste de 1 até ${n}: quem divide ${n} sem sobrar é divisor. Não esqueça do 1 e do próprio ${n}.`)); }
const primo = () => { const p = pick([5, 7, 11, 13]); return Q(`Quantos divisores tem o número ${p}?`, '2', ['1', num(p), '3'], X(`${p} só divide por 1 e por ${p}: 2 divisores (é um número primo).`)); };
const divPrimo = () => { const p = pick([5, 7, 11, 13]); return Q(`Qual é divisor de ${p}?`, num(p), sample([2, 3, 4, 6].filter(d => p % d), 2).map(num), X(`Todo número é divisor de si mesmo: ${p} ÷ ${p} = 1.`)); };
const M6 = {
  A: {
    treinador1: [ehMult([2]), ehMult([2]), ehMult([2]), ehMult([2]), ehMult([2])],
    treinador2: [ehMult([5]), ehMult([5, 10]), ehMult([10]), ehMult([5]), ehMult([10])],
    treinador3: [ehMult([3]), ehMult([3]), ehMult([3]), ehMult([3]), ehMult([3])],
    lider: [qualMult([2]), qualMult([5]), qualMult([3]), qualMult([4]), qualMult([6])],
    revanche: [primeirosMult, multDois, multDois],
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
const atalho = (p, N) => p === 100 ? `100% é o todo: ${num(N)}` : p === 75 ? `75% = 3 × 25%: ${num(N)} ÷ 4 = ${num(N / 4)} e ${num(N / 4)} × 3 = ${num(N * 0.75)}` : `${p}% é ${ATALHO[p][0]}: ${num(N)} ÷ ${ATALHO[p][1]} = ${num(N * p / 100)}`;
function pct(ps) {
  return () => {
    const p = pick(ps); const base = { 50: 2, 10: 10, 25: 4, 20: 5, 1: 100, 100: 1, 75: 4 }[p]; const N = base * int(2, p === 1 ? 6 : 30);
    const v = N * p / 100;
    return Q(`Quanto é ${p}% de ${N}?`, num(v), erradasNum(v, [v * 10, v * 2, v / 2, N - v, N + p], { inteiro: false }), X(atalho(p, N)));
  };
}
const PF = [[50, 1, 2], [25, 1, 4], [75, 3, 4], [10, 1, 10], [20, 1, 5], [40, 2, 5]];
const pctFrac = () => { const [p, a, b] = pick(PF); return coin() ? Q(`${p}% é igual a qual fração?`, frac(a, b), erradasFrac(a, b, [[1, p], [a, b * 2], [b, a], [1, 3]]).slice(0, 2), X(`${p}% = ${p}/100 = ${frac(a, b)}`)) : Q(`${frac(a, b)} é igual a quantos por cento?`, `${p}%`, erradasNum(p, [p * 10, p * 2, p / 2, a + b], { fmt: x => `${num(x)}%`, inteiro: false }), X(`${frac(a, b)} = ${p}/100 = ${p}%`)); };
const todo = () => Q('100% de algo significa:', 'o todo', ['a metade', 'nada'], X('100% = 100/100 = 1 inteiro: é tudo.'));
function desconto() { const p = pick([10, 20, 50]), P = 10 * int(2, 12); const v = P * p / 100; return Q(`Uma camiseta de R$ ${P} tem ${p}% de desconto. Quanto é o desconto?`, reais(v), erradasNum(v, [P - v, p, v * 2, v / 2], { fmt: reais, inteiro: false }), X(`${atalho(p, P)}. O desconto é ${reais(v)}`)); }
function turma() { const N = 2 * int(8, 20); const v = N / 2; return Q(`Numa turma de ${N} alunos, 50% são meninas. Quantas meninas?`, num(v), erradasNum(v, [N, v / 2, 50]), X(atalho(50, N))); }
function precoFinal() { const p = pick([10, 20, 25, 50]), P = 20 * int(2, 10); const v = P - P * p / 100; return Q(`Um tênis de R$ ${P} tem ${p}% de desconto. Qual o preço final?`, reais(v), erradasNum(v, [P * p / 100, P - p, P + P * p / 100], { fmt: reais, inteiro: false }), X(`Desconto: ${atalho(p, P).split(': ')[1]}. Preço final: ${P} − ${num(P * p / 100)} = ${num(v)}`)); }
function faltaram() { const [p, d] = pick([[25, 4], [10, 10], [20, 5], [50, 2]]); const N = d * int(4, 10), f = N / d; return Q(`Numa turma de ${N} alunos, ${f} faltaram. Qual porcentagem faltou?`, `${p}%`, erradasNum(p, [f, 100 - p, p * 2 <= 100 ? p * 2 : p / 2, p / 2, 100 / f], { fmt: x => `${num(x)}%`, inteiro: false }), X(`${f} de ${N} = ${frac(f, N)} = ${frac(1, d)} = ${p}%`)); }
const dec = p => num(p / 100);
const pctX = p => `${p}% = ${p} ÷ 100 = ${dec(p)}. "De" vira vezes: × ${dec(p)}`;
function qualConta() {
  const p = pick([10, 20, 25, 30, 40, 50, 75]), N = 10 * int(2, 12);
  if (p === 50 && coin()) return Q(`"50% de ${N}" é o mesmo que:`, `${N} ÷ 2`, [`${N} × 2`, `${N} − 50`], X('50% é a metade: divide por 2.'));
  return Q(`"${p}% de ${N}" é o mesmo que:`, `${N} × ${dec(p)}`, [`${N} × ${p}`, pick([`${N} + ${p}`, `${N} ÷ ${dec(p)}`, `${N} − ${p}`])], X(pctX(p)));
}
const pctDec = () => { const p = pick([5, 10, 15, 20, 30, 40, 50, 60, 100]); const d = p / 100; return Q(`${p}% em número decimal:`, num(d), erradasNum(d, [d * 10, d / 10], { inteiro: false }).slice(0, 2), X(`${p}% = ${p} ÷ 100 = ${num(d)}`)); };
const CTX = [
  (p, N) => [`Uma bola de R$ ${N} tem ${p}% de desconto. Qual conta dá o desconto?`],
  (p, N) => [`Numa turma de ${N} alunos, ${p}% são meninas. Qual conta dá o número de meninas?`],
  (p, N) => [`Acertei ${p}% de ${N} questões. Qual conta dá quantas acertei?`],
  (p, N) => [`Num show com ${N * 10} pessoas, ${p}% eram crianças. Qual conta dá o número de crianças?`, N * 10],
];
function contaCtx() { const p = pick([5, 10, 20, 25, 40, 50]), N = 10 * int(2, 9); const [e, NN = N] = pick(CTX)(p, N); return Q(e, `${NN} × ${dec(p)}`, [`${NN} × ${p}`, pick([`${NN} − ${p}`, `${NN} + ${dec(p)}`, `${NN} ÷ ${p}`])], X(pctX(p))); }
const leConta = () => { const p = pick([10, 20, 25, 50]), N = 10 * int(2, 9); return Q(`A conta ${N} × ${dec(p)} calcula:`, `${p}% de ${N}`, [`${num(p / 10)}% de ${N}`, `${N} − ${p}`], X(`${dec(p)} = ${p} ÷ 100 = ${p}%`)); };
function contaFinal(tipo) {
  const p = pick([10, 20, 25]), P = 10 * int(3, 20);
  if (tipo === 0) return Q(`Um produto de R$ ${P} tem ${p}% de desconto. Qual conta dá o preço final?`, `${P} − ${P} × ${dec(p)}`, [`${P} × ${dec(p)}`, `${P} − ${p}`], X(`Preço final = preço − desconto. O desconto é ${P} × ${dec(p)}.`));
  if (tipo === 1) return Q(`A mesada de R$ ${P} teve aumento de ${p}%. Qual conta dá a nova mesada?`, `${P} + ${P} × ${dec(p)}`, [`${P} × ${dec(p)}`, `${P} + ${p}`], X(`Nova mesada = mesada + aumento. O aumento é ${P} × ${dec(p)}.`));
  return Q(`Uma camiseta de R$ ${P} tem ${p}% de desconto. Qual conta dá direto o preço final?`, `${P} × ${dec(100 - p)}`, [`${P} × ${dec(p)}`, `${P} − ${p}`], X(`Com ${p}% de desconto, você paga 100% − ${p}% = ${100 - p}% = ${dec(100 - p)}.`));
}
const M7 = {
  A: {
    treinador1: [pct([50]), pct([50]), pct([10]), pct([10]), pct([10])],
    treinador2: [pct([25]), pct([25]), pct([100]), pct([20]), pct([1])],
    treinador3: [pctFrac, pctFrac, pctFrac, todo, pctFrac],
    lider: [desconto, pct([50]), turma, pct([10]), pct([25])],
    revanche: [precoFinal, pct([20]), faltaram],
  },
  B: {
    treinador1: [qualConta, qualConta, qualConta, qualConta, qualConta],
    treinador2: [pctDec, pctDec, pctDec, pctDec, pctDec],
    treinador3: [contaCtx, contaCtx, contaCtx, contaCtx, contaCtx],
    lider: [qualConta, pctDec, contaCtx, contaCtx, leConta],
    revanche: [() => contaFinal(0), () => contaFinal(1), () => contaFinal(2)],
  },
};

// ===================== MAPA 8 =====================
const FRASES = [
  ['O dobro de um número', '2x', ['x + 2', 'x²']], ['O triplo de um número', '3x', ['x + 3', 'x³']],
  ['A metade de um número', 'x ÷ 2', ['2x', 'x − 2']], ['O quádruplo de um número', '4x', ['x + 4', 'x⁴']],
];
function frase() {
  if (coin()) { const [e, r, x] = pick(FRASES); return Q(`"${e}"`, r, x, X('Dobro = 2x, triplo = 3x, quádruplo = 4x, metade = x ÷ 2.')); }
  const k = int(2, 9);
  return coin() ? Q(`"Um número mais ${k}"`, `x + ${k}`, [`${k}x`, `x − ${k}`], X(`"Mais" é soma: x + ${k}`)) : Q(`"Um número menos ${k}"`, `x − ${k}`, [`${k} − x`, `${k}x`], X(`"Menos" é subtração, e o número vem primeiro: x − ${k}`));
}
const LET = ['x', 'a', 'y', 'm'];
function valorSoma() {
  const n = int(1, 10), k = int(1, 9), t = int(0, 3);
  const [e, v, c] = [[`x + ${k}`, n + k, [n * k, n - k]], [`x − ${k}`, n - k, [n + k, k - n]], [`${k + n} − x`, k, [2 * n + k, n]], ['x + x', 2 * n, [n * n, n, n + 1]]][t];
  if (v < 0) return valorSoma();
  return Q(`Valor de ${e} quando x = ${n}`, num(v), erradasNum(v, [...c, v + 1, v - 1]), X(`Troque x por ${n}: ${passos(e.replace(/x/g, n))}`));
}
function valorProd(comConst = false) {
  return () => {
    const a = int(2, 6), n = int(2, 10), c = comConst ? int(1, 5) : 0, op = coin() ? '+' : '−';
    const v = comConst ? (op === '+' ? a * n + c : a * n - c) : a * n;
    const e = comConst ? `${a}x ${op} ${c}` : `${a}x`;
    return Q(`Valor de ${e} quando x = ${n}`, num(v), erradasNum(v, [Number(`${a}${n}`) > 99 ? a + n : Number(`${a}${n}`), a + n + (comConst ? c : 0), v + 1]), X(`${a}x é ${a} vezes x. Troque x por ${n}: ${passos(e.replace(/x/, ` × ${n}`))}`));
  };
}
const frase2 = () => { const k = int(1, 5); return pick([() => Q(`"O dobro de um número mais ${k}"`, `2x + ${k}`, [`2(x + ${k})`, `x + 2 + ${k}`], X(`Primeiro o dobro (2x), depois mais ${k}: 2x + ${k}`)), () => Q('"Um número ao quadrado"', 'x²', ['2x', 'x + 2'], X('Ao quadrado = x × x = x²'))])(); };
const canetas = () => { const k = int(2, 9); return Q(`Cada caneta custa x reais. Quanto custam ${k} canetas?`, `${k}x`, [`x + ${k}`, `x ÷ ${k}`], X(`${k} canetas de x reais: ${k} × x = ${k}x`)); };
function valorNeg() { const a = int(2, 5), n = -int(1, 4), c = int(1, 6); const v = a * n - c; return Q(`Valor de ${a}x − ${c} quando x = ${num(n)}`, num(v), erradasNum(v, [a * -n - c, a * n + c, -v], { neg: true }), X(`Troque x por ${num(n)}: ${passos(`${a} × (${num(n)}) − ${c}`)}`)); }
function valorQuad() { const n = int(2, 6), c = int(1, 9); const v = n * n + c; return Q(`Valor de x² + ${c} quando x = ${n}`, num(v), erradasNum(v, [2 * n + c, n + c, n * n]), X(`x² = x × x. Troque x por ${n}: ${n} × ${n} + ${c} = ${n * n} + ${c} = ${v}`)); }
function valor2() { const a = int(2, 5), b = int(2, 5), p = int(1, 6), q = int(1, 6); const v = a * p + b * q; return Q(`Valor de ${a}a + ${b}b quando a = ${p} e b = ${q}`, num(v), erradasNum(v, [a + p + b + q, a * q + b * p, v + 1]), X(`Troque a por ${p} e b por ${q}: ${passos(`${a} × ${p} + ${b} × ${q}`)}`)); }
const mono = (k, l) => k === 1 ? l : k === 0 ? '0' : `${k}${l}`;
function somaSem(sub = false) {
  return () => {
    const l = pick(LET); let a = int(1, 9), b = int(1, 9); if (sub && b > a) [a, b] = [b, a];
    const r = sub ? a - b : a + b;
    return Q(`${mono(a, l)} ${sub ? '−' : '+'} ${mono(b, l)}`, mono(r, l), erradasTexto(mono(r, l), [mono(r + 1, l), mono(sub ? a + b : Math.abs(a - b) || r + 2, l), r > 0 ? `${r}${l}²` : mono(1, l), mono(Math.max(r - 1, 2), l)]), X(`Termos com a mesma letra: ${sub ? 'subtraia' : 'some'} só os números (${a} ${sub ? '−' : '+'} ${b} = ${r}) e repita a letra: ${mono(r, l)}`));
  };
}
function semelhantes() {
  const l = pick(LET), a = int(1, 9), b = int(2, 9), t = int(0, 2);
  const SEM = X('Semelhantes têm a mesma letra com o mesmo expoente. Os números da frente podem ser diferentes.');
  if (t === 0) return SN(true, `${mono(a, l)} e ${mono(b, l)} são termos semelhantes?`, SEM);
  if (t === 1) { const l2 = pick(LET.filter(x => x !== l)); return SN(false, `${mono(a, l)} e ${mono(b, l2)} são termos semelhantes?`, SEM); }
  return SN(false, `${l} e ${l}² são termos semelhantes?`, SEM);
}
const perimQ = () => Q('Perímetro de um quadrado de lado x', '4x', ['x⁴', '2x', 'x + 4'], X('Perímetro é a soma dos lados: x + x + x + x = 4x'));
const perimR = () => { const k = int(2, 9); return Q(`Perímetro de um retângulo de lados x e ${k}`, `2x + ${2 * k}`, [`2x + ${k}`, `x + ${k}`, `${2 + 2 * k}x`], X(`x + ${k} + x + ${k} = 2x + ${2 * k}`)); };
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

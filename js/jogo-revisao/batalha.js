// Jogo de Revisão — Batalha de Pets: regras puras (contas, força do treinador, dano, prêmios).
// Tudo vem de dados/jogo/batalhas.json; a tela fica em js/jogo-revisao.js.

let B = null;
export function definirBatalhas(json) { B = json; }
export const batalhasProntas = () => !!B?.treinadores?.length;
export const cfgBatalha = () => B?.config || {};
export const treinadores = () => [...(B?.treinadores || [])].sort((a, b) => a.nivel - b.nivel);
export const treinador = (id) => B?.treinadores?.find(t => t.id === id) || null;

const r = (a, b, rnd = Math.random) => a + Math.floor(rnd() * (b - a + 1));
const um = (arr, rnd) => arr[r(0, arr.length - 1, rnd)];
const MENOS = '−';
const R6 = (x) => Math.round(x * 1e6) / 1e6;   // corta o lixo de ponto flutuante (2,5 × 100 etc.)
// número em português: vírgula decimal e o sinal de menos tipográfico; texto passa direto
export function fmt(n) {
  if (typeof n === 'string') return n;
  const v = R6(n) || 0;
  return (v < 0 ? MENOS : '') + String(Math.abs(v)).replace('.', ',');
}
const par = (n) => (n < 0 ? `(${fmt(n)})` : fmt(n));   // negativo entre parênteses dentro da conta
const eLista = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`);
const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵'];
const mdc = (a, b) => (b ? mdc(b, a % b) : Math.abs(a));
const sinal = (n) => (n < 0 ? MENOS : '+');

// ── Expressões: resolve na ordem certa e guarda cada passo (para a explicação) ──
const OPS = { '+': (a, b) => a + b, '−': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => (b && a % b === 0 ? a / b : NaN) };
function resolverSem(tk, passos, precedencia) {
  const t = [...tk];
  const fase = (ops) => {
    for (let i = 1; i < t.length;) {
      if (!ops.includes(t[i])) { i += 2; continue; }
      const v = OPS[t[i]](t[i - 1], t[i + 1]);
      if (!Number.isInteger(v) || v < 0) return false;
      passos.push({ op: t[i], txt: `${fmt(t[i - 1])} ${t[i]} ${fmt(t[i + 1])} = ${fmt(v)}` });
      t.splice(i - 1, 3, v);
    }
    return true;
  };
  if (precedencia ? !(fase(['×', '÷']) && fase(['+', '−'])) : !fase(['+', '−', '×', '÷'])) return null;
  return t[0];
}
// precedencia=false: da esquerda para a direita (erro comum); semParenteses: ignora os parênteses (outro erro comum)
function resolver(tk, { precedencia = true, semParenteses = false } = {}) {
  let t = semParenteses ? tk.filter(x => x !== '(' && x !== ')') : [...tk];
  const dentro = [], fora = [];
  for (let f = t.indexOf(')'); f >= 0; f = t.indexOf(')')) {
    const a = t.lastIndexOf('(', f);
    const v = resolverSem(t.slice(a + 1, f), dentro, precedencia);
    if (v == null) return null;
    t.splice(a, f - a + 1, v);
  }
  const v = resolverSem(t, fora, precedencia);
  return v == null ? null : { v, dentro, fora };
}
const textoConta = (tk) => tk.map(x => (typeof x === 'number' ? fmt(x) : x)).join(' ').replace(/\( /g, '(').replace(/ \)/g, ')');
function explicaExpr(res) {
  const j = (ps) => ps.map(p => p.txt).join('; ');
  if (res.dentro.length) return `Primeiro os parênteses: ${j(res.dentro)}. Depois ${j(res.fora)}.`;
  const m = res.fora.filter(p => p.op === '×' || p.op === '÷'), s = res.fora.filter(p => p.op === '+' || p.op === '−');
  const nm = m.length > 1 ? 'as multiplicações e divisões' : m[0].op === '×' ? 'a multiplicação' : 'a divisão';
  const ns = s.length > 1 ? 'da esquerda para a direita' : s[0].op === '+' ? 'a soma' : 'a subtração';
  return `Primeiro ${nm}: ${j(m)}. Depois ${ns}: ${j(s)}.`;
}
// tenta montar uma conta até dar certo (divisão exata, nada negativo…)
function tentar(fn, vezes = 400) { for (let i = 0; i < vezes; i++) { const g = fn(); if (g) return g; } return null; }

// ── Os 20 tipos de conta. d = dificuldade 1–5 (muda o tamanho dos números, não o tipo) ──
// Cada um devolve { conta, resp, erradas: [mais plausíveis primeiro], explica, passo?, semNeg?, mostra? }
const GERA = {
  tabuada: (d, rnd) => {
    const m = [5, 7, 9, 10, 12][d - 1], a = r(2, m, rnd), b = r(2, m, rnd), p = a * b;
    const soma = a <= 5 ? Array(a).fill(b).join(' + ') : `${b} + ${b} + … + ${b} (${a} vezes)`;
    return { conta: `${a} × ${b}`, resp: p, semNeg: true, erradas: [p + b, p - b, p + a, p - a, p + 1, p - 1, p + 10],
      explica: `${a} × ${b} = ${p} (${a} × ${b} é o mesmo que ${soma}).` };
  },

  expressao_sem_parenteses: (d, rnd) => tentar(() => {
    const max = [10, 12, 15, 15, 20][d - 1], nOps = d >= 4 ? 3 : 2;
    const ops = Array.from({ length: nOps }, () => um(d === 1 ? ['+', '−', '×'] : ['+', '−', '×', '÷'], rnd));
    const mult = (o) => o === '×' || o === '÷';
    if (!ops.some(mult) || ops.every(mult) || ops.some((o, i) => i && mult(o) && mult(ops[i - 1]))) return null;
    const ns = Array.from({ length: nOps + 1 }, () => r(1, max, rnd));
    ops.forEach((o, i) => {
      if (o === '÷') { const q = r(2, Math.min(9, Math.max(2, Math.floor(max / 2))), rnd); ns[i + 1] = q; ns[i] = q * r(2, Math.max(2, Math.floor(max / q)), rnd); }
      if (o === '×') { ns[i] = r(2, Math.min(max, 12), rnd); ns[i + 1] = r(2, Math.min(max, 12), rnd); }
    });
    const tk = ns.flatMap((n, i) => (i ? [ops[i - 1], n] : [n]));
    const certo = resolver(tk), errado = resolver(tk, { precedencia: false });
    if (!certo || (errado && errado.v === certo.v)) return null;
    return { conta: textoConta(tk), resp: certo.v, semNeg: true, erradas: [errado?.v, certo.v + 1, certo.v - 1, certo.v + 2, certo.v + 10], explica: explicaExpr(certo) };
  }),

  expressao_com_parenteses: (d, rnd) => tentar(() => {
    const max = [10, 10, 12, 15, 20][d - 1], n = () => r(1, max, rnd), pm = () => um(['+', '−'], rnd);
    const fora = um(d >= 2 ? ['×', '×', '÷', '−'] : ['×', '×', '−'], rnd);
    let tk;
    if (d <= 3) tk = rnd() < 0.5 ? ['(', n(), pm(), n(), ')', fora, n()] : [n(), fora === '÷' ? '×' : fora, '(', n(), pm(), n(), ')'];
    else {
      const f = r(0, 2, rnd);
      tk = f === 0 ? ['(', n(), pm(), n(), ')', '×', r(2, 9, rnd), pm(), n()]
        : f === 1 ? [n(), '+', '(', n(), pm(), n(), ')', '×', r(2, 9, rnd)]
          : ['(', n(), '+', n(), ')', '×', '(', n(), '−', n(), ')'];
    }
    const certo = resolver(tk), errado = resolver(tk, { semParenteses: true });
    if (!certo || certo.v > 200 || certo.dentro.some(p => /= [01]$/.test(p.txt)) || (errado && errado.v === certo.v)) return null;   // nada de (7 − 7) ou × 1
    return { conta: textoConta(tk), resp: certo.v, semNeg: true, erradas: [errado?.v, resolver(tk, { semParenteses: true, precedencia: false })?.v, certo.v + 1, certo.v - 1, certo.v + 2],
      explica: explicaExpr(certo) };
  }),

  vezes_10_100_1000: (d, rnd) => {
    let a, f, mult;
    if (d === 1) { a = r(2, 99, rnd); f = 10; mult = true; }
    else if (d === 2) { mult = rnd() < 0.6; f = um([10, 100], rnd); a = mult ? r(2, 99, rnd) : 10 * r(2, 99, rnd); }
    else if (d === 3) { mult = rnd() < 0.5; f = um([10, 100], rnd); a = mult ? r(11, 99, rnd) / 10 : r(2, 999, rnd); }
    else if (d === 4) { mult = rnd() < 0.5; f = mult ? um([10, 100, 1000], rnd) : um([10, 100], rnd); a = mult ? r(101, 999, rnd) / 100 : r(11, 999, rnd) / 10; }
    else { mult = rnd() < 0.35; f = mult ? 1000 : um([10, 100, 1000], rnd); a = mult ? r(101, 999, rnd) / 100 : r(11, 9999, rnd) / 10; }
    a = R6(a);
    const resp = R6(mult ? a * f : a / f), casas = String(f).length - 1;
    return { conta: `${fmt(a)} ${mult ? '×' : '÷'} ${f}`, resp, semNeg: true,
      erradas: [R6(resp * 10), R6(resp / 10), R6(mult ? a / f : a * f), R6(resp * 100), R6(resp / 100)].filter(v => v >= 1e-6),
      explica: `${mult ? 'Multiplicar' : 'Dividir'} por ${f} anda a vírgula ${casas} casa${casas > 1 ? 's' : ''} para a ${mult ? 'direita' : 'esquerda'}: ${fmt(a)} → ${fmt(resp)}.` };
  },

  medidas: (d, rnd) => {
    const U = d === 1 ? [['m', 'cm', 100], ['kg', 'g', 1000], ['L', 'mL', 1000]]
      : [['m', 'cm', 100], ['kg', 'g', 1000], ['L', 'mL', 1000], ['cm', 'mm', 10], ['km', 'm', 1000]];
    const [g, p, f] = um(U, rnd);
    let a, desce;   // desce: unidade grande → pequena (multiplica)
    if (d === 1) { desce = true; a = r(2, 9, rnd); }
    else if (d === 2) { desce = rnd() < 0.5; a = desce ? r(2, 20, rnd) : f * r(2, 9, rnd); }
    else if (d === 3) { desce = true; a = r(11, 99, rnd) / 10; }
    else if (d === 4) { desce = rnd() < 0.4; a = desce ? r(11, 99, rnd) / 10 : f * r(11, 99, rnd) / 10; }
    else { desce = rnd() < 0.5; a = desce ? r(101, 999, rnd) / 100 : f * r(1, 999, rnd) / 1000; }
    a = R6(a);
    const resp = R6(desce ? a * f : a / f), [de, para] = desce ? [g, p] : [p, g];
    return { conta: `${fmt(a)} ${de} = ? ${para}`, resp, semNeg: true, mostra: (v) => `${fmt(v)} ${para}`,
      erradas: [R6(resp * 10), R6(resp / 10), R6(desce ? a / f : a * f), R6(resp * 100), R6(resp / 100)].filter(v => v >= 1e-6),
      explica: desce ? `1 ${g} = ${f} ${p}, então ${fmt(a)} × ${f} = ${fmt(resp)} ${p}.` : `${f} ${p} = 1 ${g}, então ${fmt(a)} ÷ ${f} = ${fmt(resp)} ${g}.` };
  },

  negativos_soma: (d, rnd) => {
    const R = [10, 15, 20, 25, 30][d - 1];
    const nz = () => { let x = 0; while (!x) x = r(-R, R, rnd); return x; };
    let a = nz(), b = nz();
    if (a > 0 && b > 0) { if (rnd() < 0.5) a = -a; else b = -b; }
    const sub = d >= 2 && rnd() < 0.45, y = sub ? -b : b, resp = a + y;
    const pre = sub ? `Subtrair é somar o oposto: ${par(a)} − ${par(b)} = ${par(a)} + ${par(y)}. ` : '';
    const A = Math.abs(a), Y = Math.abs(y);
    const regra = Math.sign(a) === Math.sign(y) ? `Sinais iguais: soma ${A} + ${Y} = ${A + Y} e mantém o sinal (${sinal(a)}): ${fmt(resp)}.`
      : A === Y ? `Sinais diferentes e números iguais: o resultado é 0.`
        : `Sinais diferentes: subtrai ${Math.max(A, Y)} − ${Math.min(A, Y)} = ${Math.abs(A - Y)} e fica o sinal do maior (${sinal(resp)}): ${fmt(resp)}.`;
    return { conta: `${par(a)} ${sub ? '−' : '+'} ${par(b)}`, resp, erradas: [-resp, sub ? a + b : a - b, -(A + Y), A + Y, resp + 2, resp - 2], explica: pre + regra };
  },

  negativos_mult: (d, rnd) => {
    const R = [10, 12, 15, 20, 30][d - 1], R2 = d >= 3 ? 9 : R;
    const nz = (m) => r(2, m, rnd) * (rnd() < 0.5 ? -1 : 1);
    let a = nz(R), b = nz(R2);
    if (a > 0 && b > 0) { if (rnd() < 0.5) a = -a; else b = -b; }
    const div = d >= 2 && rnd() < 0.4;
    const [x, y, op, resp] = div ? [a * b, b, '÷', a] : [a, b, '×', a * b];
    const regra = Math.sign(x) === Math.sign(y) ? 'Sinais iguais dão positivo' : 'Sinais diferentes dão negativo';
    return { conta: `${par(x)} ${op} ${par(y)}`, resp, erradas: [-resp, div ? x + y : a + b, resp + y, resp - y, resp + 1],
      explica: `${regra}: ${Math.abs(x)} ${op} ${Math.abs(y)} = ${Math.abs(resp)}, então ${resp < 0 ? MENOS : '+'}${Math.abs(resp)}.` };
  },

  fracoes: (d, rnd) => {
    if (d >= 4 && rnd() < 0.5) {   // soma (d5: ou subtração) de frações de mesmo denominador
      return tentar(() => {
        const n = r(5, d >= 5 ? 12 : 9, rnd), a = r(1, n - 1, rnd), b = r(1, n - 1, rnd), sub = d >= 5 && rnd() < 0.4;
        const s = sub ? a - b : a + b;
        if (s < 1 || s >= n || mdc(s, n) !== 1 || a === b) return null;
        const op = sub ? '−' : '+';
        return { conta: `${a}/${n} ${op} ${b}/${n}`, resp: `${s}/${n}`,
          erradas: (sub ? [`${a + b}/${n}`, `${s + 1}/${n}`, `${s}/${n + 1}`, `${s - 1}/${n}`] : [`${s}/${2 * n}`, `${s + 1}/${n}`, `${s - 1}/${n}`, `${s}/${n + 1}`]).filter(x => !/^0\//.test(x)),
          explica: `Mesmo denominador: ${sub ? 'subtrai' : 'soma'} os numeradores ${a} ${op} ${b} = ${s} e mantém o ${n}: ${s}/${n}.` };
      });
    }
    const n = r(2, [5, 10, 8, 10, 12][d - 1], rnd), k = r(2, [10, 10, 10, 12, 15][d - 1], rnd), N = n * k;
    let m = d >= 3 && n > 2 ? r(2, n - 1, rnd) : 1;
    if (mdc(m, n) !== 1) m = 1;   // nada de 4/8
    const resp = m * k;
    return { conta: `${m}/${n} de ${N}`, resp, semNeg: true,
      erradas: m === 1 ? [N - n, k + 1, k - 1, 2 * k, N] : [k, resp + k, resp - k, N - resp, resp + 1],
      explica: `Divide ${N} em ${n} partes: ${N} ÷ ${n} = ${k}` + (m === 1 ? '.' : `; pega ${m} partes: ${m} × ${k} = ${resp}.`) };
  },

  decimais: (d, rnd) => tentar(() => {
    // em centésimos (inteiros), para não errar conta com vírgula
    const casas = d <= 2 ? [1, 1] : d === 5 ? (rnd() < 0.6 ? [2, 2] : [1, 2]) : (rnd() < 0.5 ? [1, 2] : [2, 1]);
    const gera = (c) => { if (c === 1) { let v = r(11, d >= 3 ? 199 : 99, rnd); if (v % 10 === 0) v++; return v * 10; } let v = r(101, d >= 5 ? 1999 : 999, rnd); if (v % 10 === 0) v++; return v; };
    let A = gera(casas[0]), B = gera(casas[1]);
    const sub = d >= 2 && rnd() < 0.45;
    if (sub && A < B) { [A, B] = [B, A]; casas.reverse(); }
    if (A === B) return null;
    const C = sub ? A - B : A + B, cmax = Math.max(...casas), op = sub ? '−' : '+';
    const mostra = (v, c) => (v / 100).toFixed(c).replace('.', ',');
    // erro de alinhar a vírgula: 1,5 vira 1,05
    const desalinha = (v, c) => (c === 1 ? Math.floor(v / 100) * 100 + (v % 100) / 10 : v);
    const erradas = [];
    if (casas[0] !== casas[1]) erradas.push((sub ? desalinha(A, casas[0]) - desalinha(B, casas[1]) : desalinha(A, casas[0]) + desalinha(B, casas[1])) / 100);
    erradas.push((C + 10) / 100, (C - 10) / 100, (C + 100) / 100, (C - 100) / 100, (C + 1) / 100);
    return { conta: `${mostra(A, casas[0])} ${op} ${mostra(B, casas[1])}`, resp: C / 100, semNeg: true, passo: cmax === 2 ? 0.01 : 0.1,
      erradas: erradas.filter(v => v > 0).map(R6),
      explica: `Alinha as vírgulas: ${mostra(A, cmax)} ${op} ${mostra(B, cmax)} = ${fmt(C / 100)}.` };
  }),

  potencia: (d, rnd) => tentar(() => {
    const [bmax, emin, emax] = [[5, 2, 3], [6, 2, 3], [10, 2, 3], [10, 2, 4], [10, 2, 5]][d - 1];
    const b = r(2, bmax, rnd), e = d >= 3 && rnd() < 0.2 ? r(0, 1, rnd) : r(emin, emax, rnd), resp = b ** e;
    if (resp > 1000) return null;
    const erradas = e === 0 ? [0, b, 10, 2 * b] : e === 1 ? [1, b * b, 0, 2 * b] : [b * e, b ** (e - 1), b ** (e + 1) <= 5000 ? b ** (e + 1) : null, b + e, resp + b];
    const explica = e === 0 ? `Todo número (diferente de 0) elevado a 0 dá 1: ${b}⁰ = 1.`
      : e === 1 ? `Expoente 1 é o próprio número: ${b}¹ = ${b}.` : `${b}${SUP[e]} = ${Array(e).fill(b).join(' × ')} = ${resp}.`;
    return { conta: `${b}${SUP[e]}`, resp, semNeg: true, erradas: erradas.filter(v => v != null), explica };
  }),

  raiz: (d, rnd) => {
    const k = r(2, [7, 10, 12, 15, 20][d - 1], rnd), q = k * k;
    return { conta: `√${q}`, resp: k, semNeg: true, erradas: [q % 2 === 0 ? q / 2 : null, k + 1, k - 1, 2 * k, k + 2].filter(v => v != null && v > 0),
      explica: `Que número vezes ele mesmo dá ${q}? ${k} × ${k} = ${q}, então √${q} = ${k}.` };
  },

  multiplos_divisores: (d, rnd) => {
    const nmax = [5, 7, 9, 10, 12][d - 1];
    if (d >= 2 && rnd() < 0.5) {   // divisor
      const Nmax = [30, 40, 60, 80, 100][d - 1];
      return tentar(() => {
        const n = r(2, nmax, rnd), q = r(2, Math.floor(Nmax / n), rnd), N = n * q;
        if (q < 2) return null;
        const errs = [];
        for (let k = 1; k < 30 && errs.length < 6; k++) for (const v of [n + k, n - k]) if (v > 1 && v < N && N % v !== 0 && !errs.includes(v)) errs.push(v);
        return errs.length < 3 ? null : { conta: `Qual é divisor de ${N}?`, resp: n, erradas: errs, unicas: true,
          explica: `Divisor de ${N} divide sem sobrar: ${N} ÷ ${n} = ${q} → ${n}.` };
      });
    }
    const n = r(2, nmax, rnd), m = n * r(2, d <= 2 ? 6 : 10, rnd), errs = [];
    for (let k = 1; k < 30 && errs.length < 6; k++) for (const v of [m + k, m - k]) if (v > 1 && v % n !== 0 && !errs.includes(v)) errs.push(v);
    return { conta: `Qual é múltiplo de ${n}?`, resp: m, erradas: errs, unicas: true,
      explica: `Múltiplo de ${n} está na tabuada do ${n}: ${[1, 2, 3, 4].map(i => n * i).join(', ')}… → ${m}.` };
  },

  porcentagem: (d, rnd) => {
    const p = um([[10, 50], [10, 50, 25], [10, 50, 25, 20], [10, 50, 25, 20, 75], [10, 50, 25, 20, 75, 5]][d - 1], rnd);
    const base = [10, 50, 20].includes(p) ? 10 : 20, N = base * r(p === 10 || p === 50 ? 2 : 1, [10, 15, 15, 20, 20][d - 1], rnd);
    const resp = N * p / 100;
    const ex = { 10: `10% é dividir por 10: ${N} ÷ 10 = ${resp}.`, 50: `50% é a metade: ${N} ÷ 2 = ${resp}.`, 25: `25% é 1/4: ${N} ÷ 4 = ${resp}.`,
      20: `20% é 1/5: ${N} ÷ 5 = ${resp}.`, 75: `75% é 3/4: ${N} ÷ 4 = ${N / 4} e 3 × ${N / 4} = ${resp}.`, 5: `5% é a metade de 10%: ${N} ÷ 10 = ${N / 10} e ${N / 10} ÷ 2 = ${resp}.` }[p];
    return { conta: `${p}% de ${N}`, resp, semNeg: true, erradas: [N - resp, N / 10, N / 2, N / 4, N / 5, N * 3 / 4, N / 20].filter(Number.isInteger), explica: ex };
  },

  valor_numerico: (d, rnd) => tentar(() => {
    const a = r(2, [5, 6, 9, 9, 9][d - 1], rnd), b = r(1, [9, 9, 12, 15, 15][d - 1], rnd);
    const x = d >= 5 ? -r(1, 5, rnd) : r(1, [5, 6, 10, 10, 10][d - 1], rnd);
    const menos = d >= 2 && rnd() < 0.45, op = menos ? '−' : '+', resp = menos ? a * x - b : a * x + b;
    if (d < 5 && resp < 0) return null;
    const com = (ax) => (menos ? ax - b : ax + b);
    return { conta: `${a}x ${op} ${b}, x = ${fmt(x)}`, resp, semNeg: d < 5,
      erradas: [x > 0 ? com(Number(`${a}${x}`)) : com(-a * x), com(a + x), com(-a * x), resp + a, resp - a, resp + 1],
      explica: `Troca x por ${fmt(x)}: ${a} × ${par(x)} ${op} ${b} = ${fmt(a * x)} ${op} ${b} = ${fmt(resp)}.` };
  }),

  termos_semelhantes: (d, rnd) => tentar(() => {
    const T = (c) => (c === 1 ? 'x' : c === -1 ? `${MENOS}x` : `${fmt(c)}x`);
    const a = r(2, 9 + d, rnd), b = r(2, 9 + d, rnd);
    if (d === 1) { const s = a + b; return { conta: `${a}x + ${b}x`, resp: T(s), erradas: [`${s}x²`, T(a * b), T(s + 1), T(s - 1), String(s)],
      explica: `Mesma letra: soma os números da frente: ${a} + ${b} = ${s} → ${T(s)}.` }; }
    if (d === 3) {
      const c = r(2, 9, rnd), s = a + b - c;
      if (s < 2) return null;
      return { conta: `${a}x + ${b}x − ${c}x`, resp: T(s), erradas: [T(a + b + c), `${s}x²`, T(s + 1), T(s - 1), String(s)],
        explica: `Mesma letra: faz a conta com os números da frente: ${a} + ${b} − ${c} = ${s} → ${T(s)}.` };
    }
    if (d === 5) {
      const c = r(2, 12, rnd), s = a - c;
      if (Math.abs(s) < 2) return null;
      const ok = `${T(s)} + ${b}`;
      return { conta: `${a}x + ${b} − ${c}x`, resp: ok, erradas: [T(a + b - c), `${T(a + c)} + ${b}`, `${T(-s)} + ${b}`, `${T(s)} − ${b}`, T(s + b)],
        explica: `Junta só os termos com x: ${a} − ${c} = ${fmt(s)} → ${T(s)}; o ${b} fica sozinho: ${ok}.` };
    }
    // d2: resultado positivo · d4: pode dar negativo
    const sub = d === 4 || rnd() < 0.6, s = sub ? a - b : a + b;
    if (Math.abs(s) < 2 || (d === 2 && s < 2)) return null;
    const op = sub ? '−' : '+';
    return { conta: `${a}x ${op} ${b}x`, resp: T(s), erradas: [T(-s), sub ? T(a + b) : T(a - b), `${fmt(s)}x²`, T(s + 1), T(s - 1)],
      explica: `Mesma letra: faz a conta com os números da frente: ${a} ${op} ${b} = ${fmt(s)} → ${T(s)}.` };
  }),

  equacao: (d, rnd) => tentar(() => {
    const regra = 'O que faz de um lado faz do outro';
    if (d === 1 || (d === 2 && rnd() < 0.5)) {
      const x = r(1, 15, rnd), a = r(1, 15, rnd), b = x + a;
      return { conta: `x + ${a} = ${b}`, resp: x, semNeg: true, erradas: [b + a, -x, x + 1, x - 1, a], explica: `${regra}: x = ${b} − ${a} = ${x}.` };
    }
    if (d === 2) {
      const x = r(5, 20, rnd), a = r(1, x - 1, rnd), b = x - a;
      return { conta: `x − ${a} = ${b}`, resp: x, semNeg: true, erradas: [b - a, x + 1, x - 1, -x, a], explica: `${regra}: x = ${b} + ${a} = ${x}.` };
    }
    if (d === 3) {
      const a = r(2, 9, rnd), x = r(2, 10, rnd), b = a * x;
      return { conta: `${a}x = ${b}`, resp: x, semNeg: true, erradas: [b - a, x + 1, x - 1, b + a, a], explica: `${regra}: x = ${b} ÷ ${a} = ${x}.` };
    }
    const a = r(2, d === 4 ? 6 : 9, rnd), x = d === 4 ? r(1, 10, rnd) : r(-5, 10, rnd), b = r(1, 15, rnd);
    if (!x) return null;
    const menos = d === 5 && rnd() < 0.5, c = menos ? a * x - b : a * x + b;
    if (d === 4 && c < 0) return null;
    const k = menos ? c + b : c - b, op = menos ? '−' : '+';
    const passo1 = menos ? `Soma ${b} dos dois lados: ${a}x = ${fmt(c)} + ${b} = ${fmt(k)}` : `Tira ${b} dos dois lados: ${a}x = ${fmt(c)} − ${b} = ${fmt(k)}`;
    const errado = (menos ? c - b : c + b) / a;
    return { conta: `${a}x ${op} ${b} = ${fmt(c)}`, resp: x, semNeg: d < 5, erradas: [Number.isInteger(errado) ? errado : null, k, -x, x + 1, x - 1].filter(v => v != null),
      explica: `${passo1}; divide por ${a}: x = ${fmt(k)} ÷ ${a} = ${fmt(x)}.` };
  }),

  regra_de_tres: (d, rnd) => {
    const a = r(2, [4, 5, 6, 8, 8][d - 1], rnd), u = r(2, [5, 6, 8, 10, 12][d - 1], rnd);
    let b = r(2, [9, 10, 12, 15, 15][d - 1], rnd); if (b === a) b++;
    const c = a * u, v = b * u;
    if (rnd() < 0.25) {
      return { conta: `${a} bolos levam ${c} ovos. ${b} bolos?`, resp: v, semNeg: true, mostra: (n) => `${fmt(n)} ovos`,
        erradas: [c + (b - a), c * b, v + u, v - u, a * b], explica: `1 bolo leva ${c} ÷ ${a} = ${u} ovos; ${b} bolos: ${b} × ${u} = ${v} ovos.` };
    }
    const [pl, sg] = um([['pães', 'pão'], ['canetas', 'caneta'], ['cadernos', 'caderno'], ['sorvetes', 'sorvete'], ['lápis', 'lápis'], ['pacotes de figurinha', 'pacote de figurinha']], rnd);
    return { conta: `${a} ${pl} custam ${c} reais. ${b} ${pl}?`, resp: v, semNeg: true, mostra: (n) => `${fmt(n)} reais`,
      erradas: [c + (b - a), c * b, v + u, v - u, a * b], explica: `1 ${sg} custa ${c} ÷ ${a} = ${u} reais; ${b} ${pl}: ${b} × ${u} = ${v} reais.` };
  },

  perimetro_area: (d, rnd) => tentar(() => {
    const L = [10, 12, 15, 18, 20][d - 1], area = rnd() < 0.5;
    if (rnd() < 0.35) {
      const l = r(2, L, rnd), A = l * l, P = 4 * l;
      return area ? { conta: `Área do quadrado de lado ${l}`, resp: A, semNeg: true, erradas: [P, 2 * l, A + l, A - l], explica: `Área = lado × lado = ${l} × ${l} = ${A}.` }
        : { conta: `Perímetro do quadrado de lado ${l}`, resp: P, semNeg: true, erradas: [A, 2 * l, P + l, P - l], explica: `Perímetro = 4 × lado = 4 × ${l} = ${P}.` };
    }
    const b = r(2, L, rnd), h = r(2, L, rnd);
    if (b === h) return null;
    const A = b * h, P = 2 * (b + h);
    return area ? { conta: `Área do retângulo ${b} × ${h}`, resp: A, semNeg: true, erradas: [P, b + h, A + b, A - h, A + 1], explica: `Área = base × altura = ${b} × ${h} = ${A}.` }
      : { conta: `Perímetro do retângulo ${b} × ${h}`, resp: P, semNeg: true, erradas: [A, b + h, P + 2, P - 2, 4 * b], explica: `Perímetro = soma dos lados = ${b} + ${h} + ${b} + ${h} = ${P}.` };
  }),

  coordenadas: (d, rnd) => tentar(() => {
    const M = [5, 5, 6, 8, 8][d - 1], neg = d >= 3;
    const v = () => r(1, M, rnd) * (neg && rnd() < 0.5 ? -1 : 1);
    const x = v(), y = v();
    if (Math.abs(x) === Math.abs(y)) return null;
    const P = (a, b) => `(${fmt(a)}, ${fmt(b)})`;
    const dx = `${Math.abs(x)} para a ${x > 0 ? 'direita' : 'esquerda'}`, dy = `${Math.abs(y)} para ${y > 0 ? 'cima' : 'baixo'}`;
    return { conta: `Ponto ${dx} e ${dy}`, resp: P(x, y),
      erradas: neg ? [P(y, x), P(-x, y), P(x, -y), P(-y, -x)] : [P(y, x), P(x + 1, y), P(x, y + 1), P(y + 1, x)],
      explica: `Primeiro o x (${dx} → ${fmt(x)}), depois o y (${dy} → ${fmt(y)}): ${P(x, y)}.` };
  }),

  media: (d, rnd) => tentar(() => {
    const n = [3, 3, 4, 4, 5][d - 1], vmax = [10, 12, 15, 18, 20][d - 1];
    const qual = d >= 3 ? um(['media', 'media', 'mediana', 'moda'], rnd) : 'media';
    if (qual === 'mediana') {
      const k = n % 2 ? n : n + 1, xs = [];
      while (xs.length < k) { const v = r(1, vmax, rnd); if (!xs.includes(v)) xs.push(v); }
      const ord = [...xs].sort((a, b) => a - b), med = ord[(k - 1) / 2], meio = xs[(k - 1) / 2];
      if (meio === med) return null;   // na ordem mostrada, o do meio não pode ser a resposta
      const soma = xs.reduce((a, b) => a + b, 0);
      return { conta: `Mediana de ${eLista(xs)}`, resp: med, semNeg: true, erradas: [meio, Number.isInteger(soma / k) ? soma / k : null, ord[0], ord[k - 1], med + 1].filter(v => v != null),
        explica: `Coloca em ordem: ${ord.join(', ')}. O do meio é ${med}.` };
    }
    if (qual === 'moda') {
      const xs = [];
      while (xs.length < n - 1) { const v = r(1, vmax, rnd); if (!xs.includes(v)) xs.push(v); }
      const mo = um(xs, rnd);
      xs.splice(r(0, xs.length, rnd), 0, mo);
      if (xs[0] === mo && xs[1] === mo) return null;
      return { conta: `Moda de ${eLista(xs)}`, resp: mo, semNeg: true, erradas: xs.filter(v => v !== mo).concat([mo + 1, 2]),
        explica: `Moda é o número que mais aparece: ${mo} aparece 2 vezes.` };
    }
    const xs = Array.from({ length: n }, () => r(1, vmax, rnd)), S = xs.reduce((a, b) => a + b, 0);
    if (S % n) return null;
    const m = S / n;
    return { conta: `Média de ${eLista(xs)}`, resp: m, semNeg: true, erradas: [S, Number.isInteger(S / (n - 1)) ? S / (n - 1) : null, m + 1, m - 1, Math.max(...xs), m + 2].filter(v => v != null),
      explica: `Soma ${xs.join(' + ')} = ${S} e divide por ${n}: ${S} ÷ ${n} = ${m}.` };
  }),
};
export const tiposDeConta = () => B?.tipos_contas || {};

// Conta de um dos tipos do treinador, na dificuldade d (1–5):
// { conta, resposta, opcoes: [4 textos embaralhados], tipo, dificuldade, explica, longa }
export function gerarConta(tipos, dificuldade, rnd = Math.random) {
  const validos = (Array.isArray(tipos) ? tipos : []).filter(t => GERA[t]);
  const tipo = validos.length ? um(validos, rnd) : 'tabuada';
  const d = Math.max(1, Math.min(5, Math.round(Number(dificuldade) || 1)));
  for (let tent = 0; tent < 8; tent++) {
    const g = GERA[tipo](d, rnd);
    if (!g) continue;
    const mostra = g.mostra || fmt;
    const certa = mostra(g.resp), vistos = new Set([certa]), erradas = [];
    const poe = (v) => {
      if (v == null || (typeof v === 'number' && (!Number.isFinite(v) || (g.semNeg && v < 0)))) return;
      const s = mostra(v);
      if (!vistos.has(s)) { vistos.add(s); erradas.push(s); }
    };
    g.erradas.forEach(poe);
    // as mais plausíveis primeiro, com um pouco de sorte entre as 4 primeiras
    const pool = erradas.slice(0, 4);
    for (let i = pool.length - 1; i > 0; i--) { const j = r(0, i, rnd); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const escolhidas = pool.slice(0, 3);
    if (typeof g.resp === 'number' && !g.unicas) {   // completa com vizinhas da certa, se faltar
      const passo = g.passo || 1;
      for (let k = 1; escolhidas.length < 3 && k < 40; k++) for (const v of [R6(g.resp + k * passo), R6(g.resp - k * passo)]) {
        if (escolhidas.length >= 3 || (g.semNeg && v < 0)) continue;
        const s = mostra(v);
        if (!vistos.has(s)) { vistos.add(s); escolhidas.push(s); }
      }
    }
    if (escolhidas.length < 3) continue;
    const opcoes = [certa, ...escolhidas];
    for (let i = opcoes.length - 1; i > 0; i--) { const j = r(0, i, rnd); [opcoes[i], opcoes[j]] = [opcoes[j], opcoes[i]]; }
    return { conta: g.conta, resposta: certa, opcoes, tipo, dificuldade: d, explica: g.explica, longa: g.conta.length > 16 };
  }
  return gerarConta(['tabuada'], 1, rnd);
}
export const mostrarNumero = fmt;

// Vida extra do pet do aluno pela lealdade (config.lealdade_vida_extra: [{ min, vida }], maior primeiro)
export function vidaExtraLealdade(lealdade) {
  const faixas = [...(cfgBatalha().lealdade_vida_extra || [])].sort((a, b) => b.min - a.min);
  return faixas.find(f => (Number(lealdade) || 0) >= f.min)?.vida || 0;
}

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

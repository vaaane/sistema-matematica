import { int, pick, shuffle, sample, coin, num, reais, arred, ehInteiro, erradasNum, erradasTexto, ponto, erradasPonto } from './base.js';
import { Q } from './mapas1a4.js';
import { SN } from './mapas5a8.js';

// ===================== MAPA 9 =====================
const eqX = v => `x = ${num(v)}`;
function eq(tipo) {
  return () => {
    const x = int(tipo.endsWith('neg') ? 1 : 0, 15), a = int(2, 6), b = int(1, 12);
    let e, c, cand;
    switch (tipo) {
      case 'soma': c = x + b; e = `x + ${b} = ${c}`; cand = [c + b, b - c, c]; break;
      case 'sub': c = x - b; if (c < 0) return eq(tipo)(); e = `x − ${b} = ${c}`; cand = [c - b, b - c, c]; break;
      case 'mult': if (x === 0) return eq(tipo)(); c = a * x; e = `${a}x = ${c}`; cand = [c - a, c * a, c]; break;
      case 'div': c = int(2, 9); e = `x ÷ ${a} = ${c}`; return Q(e, eqX(a * c), erradasNum(a * c, [c / a, c + a, c], { fmt: eqX, inteiro: false }));
      case 'axb': if (x === 0) return eq(tipo)(); c = a * x + b; e = `${a}x + ${b} = ${c}`; cand = [(c + b) / a, c - b, x + 1]; break;
      case 'axmb': if (x === 0) return eq(tipo)(); c = a * x - b; if (c < 0) return eq(tipo)(); e = `${a}x − ${b} = ${c}`; cand = [(c - b) / a, c + b, x - 1]; break;
      case 'subneg': c = x - (x + int(1, 9)); { const bb = x - c; e = `x − ${bb} = ${num(c)}`; cand = [c - bb, bb - c, -x]; } break;
    }
    return Q(e, eqX(x), erradasNum(x, cand, { fmt: eqX, neg: tipo === 'subneg', inteiro: true }));
  };
}
function eqDois() { const x = int(1, 9), a = int(4, 7), c = int(1, a - 1), b = int(1, 9); const d = a * x - b - c * x; if (d < 0) return eqDois(); return Q(`${a}x − ${b} = ${c}x + ${d}`, eqX(x), erradasNum(x, [(d + b) / (a + c), d + b, x + 1], { fmt: eqX })); }
function eqParen() { const x = int(1, 9), a = int(2, 4), b = int(1, 5); const c = a * (x + b); return Q(`${a}(x + ${b}) = ${c}`, eqX(x), erradasNum(x, [c / a + b, (c - b) / a, c - a - b], { fmt: eqX, inteiro: true })); }
function pensei() { const x = int(2, 20), b = int(2, 9); return Q(`Pensei num número, somei ${b} e deu ${x + b}. Que número pensei?`, num(x), erradasNum(x, [x + 2 * b, x + b, b])); }
function dobroE() { const x = int(2, 15); return Q(`O dobro de um número é ${2 * x}. Que número é esse?`, num(x), erradasNum(x, [4 * x, 2 * x, 2 * x - 2])); }
function cadernos() { const n = int(2, 6), p = int(2, 9); return Q(`Comprei ${n} cadernos iguais e gastei R$ ${n * p}. Quanto custou cada um?`, reais(p), erradasNum(p, [n * p - n, n * p + n, n * p * n], { fmt: reais })); }
// --- qual é a equação?
const FR = [
  (k, t) => [`"Um número mais ${k} é igual a ${t}"`, `x + ${k} = ${t}`, [`${k}x = ${t}`, `x − ${k} = ${t}`]],
  (k, t) => [`"O dobro de um número é ${t}"`, `2x = ${t}`, [`x + 2 = ${t}`, `x² = ${t}`]],
  (k, t) => [`"Um número menos ${k} é igual a ${t}"`, `x − ${k} = ${t}`, [`${k} − x = ${t}`, `x + ${k} = ${t}`]],
  (k, t) => [`"O triplo de um número é ${t}"`, `3x = ${t}`, [`x + 3 = ${t}`, `x ÷ 3 = ${t}`]],
  (k, t) => [`"A metade de um número é ${t}"`, `x ÷ 2 = ${t}`, [`2x = ${t}`, `x − 2 = ${t}`]],
  (k, t) => [`"O quádruplo de um número é ${t}"`, `4x = ${t}`, [`x + 4 = ${t}`, `x ÷ 4 = ${t}`]],
];
const HIST = [
  (k, t) => [`Tinha x figurinhas, ganhei ${k} e fiquei com ${t}.`, `x + ${k} = ${t}`, [`${k}x = ${t}`, `x − ${k} = ${t}`]],
  (k, t) => [`Cada caderno custa x reais. ${k} cadernos custaram R$ ${k * t}.`, `${k}x = ${k * t}`, [`x + ${k} = ${k * t}`, `x ÷ ${k} = ${k * t}`]],
  (k, t) => [`Tinha x reais, gastei ${k} e sobraram ${t}.`, `x − ${k} = ${t}`, [`x + ${k} = ${t}`, `${k}x = ${t}`]],
  (k, t) => [`Dividi x balas entre ${k} amigos e cada um ganhou ${t}.`, `x ÷ ${k} = ${t}`, [`${k}x = ${t}`, `x − ${k} = ${t}`]],
  (k, t) => [`Pedro tem x anos. Daqui a ${k} anos terá ${t + k}.`, `x + ${k} = ${t + k}`, [`x − ${k} = ${t + k}`, `${k}x = ${t + k}`]],
  (k, t) => [`Tinha x reais, gastei a metade e fiquei com ${t}.`, `x ÷ 2 = ${t}`, [`2x = ${t}`, `x − 2 = ${t}`]],
];
const BAL = [
  (k, t) => [`Numa balança, 1 caixa de peso x e mais ${k} kg equilibram ${k + t} kg.`, `x + ${k} = ${k + t}`, [`${k}x = ${k + t}`, `x = ${k + t} + ${k}`]],
  (k, t) => [`Numa balança, ${k} caixas de peso x equilibram ${k * t} kg.`, `${k}x = ${k * t}`, [`x + ${k} = ${k * t}`, `x = ${k * t} + ${k}`]],
  (k, t) => [`Numa balança, 1 caixa de peso x equilibra um peso de ${t} kg e outro de ${k} kg.`, `x = ${t} + ${k}`, [`x = ${t} × ${k}`, `x + ${k} = ${t}`]],
];
const deLista = lista => () => { const k = int(2, 6), t = int(3, 20); const [e, r, x] = pick(lista)(k, t); return Q(e, r, x); };
const eqRev = [
  () => { const k = int(1, 5), t = 2 * int(2, 8) + k; return Q(`"O dobro de um número mais ${k} é igual a ${t}"`, `2x + ${k} = ${t}`, [`2(x + ${k}) = ${t}`, `x + 2 + ${k} = ${t}`]); },
  () => { const k = int(2, 4), x = int(8, 14), t = x + k * x; return Q(`Ana tem x anos e o pai tem o ${['', '', 'dobro', 'triplo', 'quádruplo'][k]} da idade dela. Juntos somam ${t} anos.`, `x + ${k}x = ${t}`, [`${k}x = ${t}`, `x + ${k} = ${t}`]); },
  () => { const k = int(2, 3), b = int(1, 5), t = k * int(1, 5) + b; return Q(`Numa balança, ${k} caixas de peso x e mais ${b} kg equilibram ${t} kg.`, `${k}x + ${b} = ${t}`, [`x + ${b} = ${t}`, `${k}x = ${t} + ${b}`]); },
];
const M9 = {
  A: {
    treinador1: [eq('soma'), eq('sub'), eq('soma'), eq('sub'), eq('soma')],
    treinador2: [eq('mult'), eq('mult'), eq('div'), eq('mult'), eq('div')],
    treinador3: [eq('axb'), eq('axmb'), eq('axb'), eq('axmb'), eq('axb')],
    lider: [pensei, dobroE, eq('axb'), eq('subneg'), cadernos],
    revanche: [eq('axb'), eqDois, eqParen],
  },
  B: {
    treinador1: [deLista(FR), deLista(FR), deLista(FR), deLista(FR), deLista(FR)],
    treinador2: [deLista(HIST), deLista(HIST), deLista(HIST), deLista(HIST), deLista(HIST)],
    treinador3: [deLista(BAL), deLista(BAL), deLista(BAL), deLista(BAL), deLista(BAL)],
    lider: [deLista(FR), deLista(FR), deLista(HIST), deLista(HIST), deLista(BAL)],
    revanche: eqRev,
  },
};

// ===================== MAPA 10 =====================
const ITENS = [['pão', 'pães'], ['caneta', 'canetas'], ['caderno', 'cadernos'], ['picolé', 'picolés'], ['sabonete', 'sabonetes'], ['lápis', 'lápis']];
function unitTotal() { const [s, p] = pick(ITENS), u = int(2, 9), q = int(3, 9); const v = u * q; return Q(`1 ${s} custa R$ ${u}. Quanto custam ${q} ${p}?`, reais(v), erradasNum(v, [u + q, v + u, v - u], { fmt: reais })); }
function velocidade() { const k = 10 * int(4, 9), h = int(2, 5); const v = k * h; return Q(`Um carro anda ${k} km em 1 hora. Quantos km anda em ${h} horas?`, `${v} km`, erradasNum(v, [k + h, v + k, k * (h - 1)], { fmt: x => `${x} km` })); }
function receita() { const o = int(2, 4), b = int(2, 6); const v = o * b; return Q(`Uma receita usa ${o} ovos por bolo. Quantos ovos para ${b} bolos?`, `${v} ovos`, erradasNum(v, [o + b, v + o, v - o], { fmt: x => `${x} ovos` })); }
function totalUnit(dec = false) {
  return () => {
    const [s, p] = pick(ITENS), q = int(2, 6); const u = dec ? pick([0.5, 1.5, 2.5]) : int(2, 9); const T = arred(q * u);
    return Q(`${q} ${p} custam ${reais(T)}. Quanto custa 1 ${s}?`, reais(u), erradasNum(u, [T + q, T, q / T > 0 && ehInteiro(q / T) ? q / T : T - q, u + 1], { fmt: reais, inteiro: false }).filter(x => /^R\$ \d+(,\d\d)?$/.test(x)));
  };
}
const GRAND = [
  ['Mais trabalhadores, menos tempo de obra.', 'Inversas'], ['Mais produtos, preço total maior.', 'Diretas'],
  ['Mais velocidade, menos tempo de viagem.', 'Inversas'], ['Mais ingredientes, mais bolos.', 'Diretas'],
  ['Mais horas trabalhadas, maior salário.', 'Diretas'], ['Mais torneiras abertas, menos tempo para encher o tanque.', 'Inversas'],
  ['Mais litros de gasolina, mais quilômetros rodados.', 'Diretas'], ['Mais pessoas dividindo uma pizza, menos pedaços para cada um.', 'Inversas'],
];
const grandezas = () => { const [e, r] = pick(GRAND); return Q(`${e} São grandezas:`, r, [r === 'Diretas' ? 'Inversas' : 'Diretas']); };
function proporcao() { const [s, p] = pick(ITENS), q1 = int(2, 5), u = int(2, 8), k = int(2, 3), q2 = q1 * k; const T1 = q1 * u, v = q2 * u; return Q(`${q1} ${p} custam R$ ${T1}. Quanto custam ${q2} ${p}?`, reais(v), erradasNum(v, [T1 + q2, T1 * q2, v + u], { fmt: reais })); }
function inversa() { const p = int(1, 3), k = 2, d = 2 * int(2, 6) * p; const v = d / k; return Q(`${p} ${p === 1 ? 'pessoa pinta' : 'pessoas pintam'} um muro em ${d} dias. Em quantos dias ${p * k} pessoas pintam?`, `${num(v)} dias`, erradasNum(v, [d * k, d + k, d - k], { fmt: x => `${num(x)} dias` })); }
function suco() { const l = int(1, 3), c = 4 * l, l2 = l * int(2, 3), v = c / l * l2; return Q(`${l} ${l === 1 ? 'litro' : 'litros'} de suco ${l === 1 ? 'enche' : 'enchem'} ${c} copos. Quantos copos ${l2} litros enchem?`, `${v} copos`, erradasNum(v, [c + l2, v + c, c * l2 / 2 === v ? v + 2 : c * l2 / 2], { fmt: x => `${num(x)} copos` })); }
function pedreiros() { const p = 2, d = 2 * int(3, 9), p2 = 4; const v = d * p / p2; return Q(`${p} pedreiros levam ${d} dias para fazer um muro. Quantos dias levam ${p2} pedreiros?`, `${num(v)} dias`, erradasNum(v, [d * 2, d + 2, d - 2], { fmt: x => `${num(x)} dias` })); }
function carne() { const k = int(3, 6), u = int(5, 9), k2 = k + int(2, 4); const v = u * k2; return Q(`${k} kg de carne custam R$ ${k * u}. Quanto custam ${k2} kg?`, reais(v), erradasNum(v, [k * u + k2, k * u * k2 / 10, v + u], { fmt: reais, inteiro: true })); }
function composta() { const m = 2, p = 50 * int(1, 3), h = 2, m2 = 4, h2 = 3; const v = p / (m * h) * m2 * h2; return Q(`${m} máquinas fazem ${p} peças em ${h} horas. Quantas peças ${m2} máquinas fazem em ${h2} horas?`, `${v} peças`, erradasNum(v, [p * 2, p * m2 * h2, p * h2, p + 100], { fmt: x => `${num(x)} peças` })); }
// --- qual é a conta?
function contaUnit() { const [s, p] = pick(ITENS), q = int(2, 6), u = int(2, 9), T = q * u; return Q(`${q} ${p} custam R$ ${T}. Para achar o preço de 1 ${s}, faço:`, `${T} ÷ ${q}`, [`${T} × ${q}`, pick([`${T} + ${q}`, `${T} − ${q}`, `${q} ÷ ${T}`])]); }
function contaTotal() {
  const t = int(0, 3), a = int(2, 9), b = int(2, 9);
  const e = [`1 bala custa R$ ${a}. Para achar o preço de ${b} balas, faço:`, `Uma receita usa ${a} xícaras de farinha por bolo. Para ${b} bolos, faço:`, `Um carro anda ${a * 10} km em 1 hora. Para saber quanto anda em ${b} horas, faço:`, `1 caixa tem ${a} ovos. Para saber quantos ovos há em ${b} caixas, faço:`][t];
  const A = t === 2 ? a * 10 : a;
  return Q(e, `${A} × ${b}`, [`${A} + ${b}`, pick([`${A} ÷ ${b}`, `${b} ÷ ${A}`])]);
}
function contaInv() {
  const t = int(0, 2), d = 2 * int(2, 6), k = 2;
  const e = [`1 pessoa pinta um muro em ${d} dias. Para saber o tempo de ${k} pessoas, faço:`, `1 torneira enche um tanque em ${d} horas. Para saber o tempo de ${k} torneiras, faço:`, `${k} pintores levam ${d / 2} dias. Para saber o tempo de 1 pintor sozinho, faço:`][t];
  if (t === 2) return Q(e, `${d / 2} × ${k}`, [`${d / 2} ÷ ${k}`, `${d / 2} + ${k}`]);
  return Q(e, `${d} ÷ ${k}`, [`${d} × ${k}`, `${d} + ${k}`]);
}
const velDobra = () => Q('Se a velocidade dobra, o tempo de viagem:', 'cai pela metade', ['dobra', 'fica igual']);
function contaRev(t) {
  if (t === 0) { const q = int(3, 5), u = int(2, 6), q2 = q + int(2, 4); return Q(`${q} canetas custam R$ ${q * u}. Qual conta dá o preço de ${q2} canetas?`, `${q * u} ÷ ${q} × ${q2}`, [`${q * u} × ${q} ÷ ${q2}`, `${q * u} + ${q2}`]); }
  if (t === 1) { const p = 3, d = 2 * int(2, 6), p2 = 6; return Q(`${p} pedreiros fazem um muro em ${d} dias. Qual conta dá o tempo com ${p2} pedreiros?`, `${d} × ${p} ÷ ${p2}`, [`${d} × ${p2} ÷ ${p}`, `${d} + ${p}`]); }
  const c = int(2, 3), k = 15 * c, c2 = int(4, 7); return Q(`No mapa, ${c} cm valem ${k} km. Qual conta dá quantos km valem ${c2} cm?`, `${k} ÷ ${c} × ${c2}`, [`${k} × ${c} ÷ ${c2}`, `${k} + ${c2}`]);
}
const M10 = {
  A: {
    treinador1: [unitTotal, unitTotal, velocidade, receita, unitTotal],
    treinador2: [totalUnit(), totalUnit(), totalUnit(), totalUnit(true), totalUnit(true)],
    treinador3: [grandezas, grandezas, grandezas, grandezas, grandezas],
    lider: [proporcao, proporcao, proporcao, inversa, suco],
    revanche: [pedreiros, carne, composta],
  },
  B: {
    treinador1: [contaUnit, contaTotal, contaTotal, contaTotal, contaTotal],
    treinador2: [contaUnit, contaUnit, contaTotal, contaUnit, contaTotal],
    treinador3: [contaInv, contaInv, velDobra, contaInv, contaInv],
    lider: [contaUnit, contaTotal, contaInv, contaTotal, contaTotal],
    revanche: [() => contaRev(0), () => contaRev(1), () => contaRev(2)],
  },
};

// ===================== MAPA 11 =====================
const cm = x => `${num(x)} cm`, cm2 = x => `${num(x)} cm²`, m_ = x => `${num(x)} m`, m2 = x => `${num(x)} m²`;
const perQ = () => { const l = int(2, 15); const v = 4 * l; return Q(`Perímetro de um quadrado de lado ${l} cm`, cm(v), erradasNum(v, [l * l, 2 * l, l + 4], { fmt: cm })); };
const perR = () => { const a = int(3, 12), b = int(1, a - 1); const v = 2 * (a + b); return Q(`Perímetro de um retângulo de ${a} cm por ${b} cm`, cm(v), erradasNum(v, [a * b, a + b, 2 * a + b], { fmt: cm })); };
const perT = () => { const a = int(3, 9), b = int(3, 9), c = int(Math.abs(a - b) + 1, a + b - 1); const v = a + b + c; return Q(`Perímetro de um triângulo de lados ${a} cm, ${b} cm e ${c} cm`, cm(v), erradasNum(v, [a * b, v + 1, v - 1], { fmt: cm })); };
const POLI = [['triângulo', 3], ['quadrado', 4], ['pentágono', 5], ['hexágono', 6], ['octógono', 8]];
const perP = () => { const [n, k] = pick(POLI.filter(p => p[1] !== 4)), l = int(1, 9); const v = k * l; return Q(`Perímetro de um ${n} com ${k} lados iguais de ${l} cm`, cm(v), erradasNum(v, [v + l, k + l, v - l], { fmt: cm })); };
const FATOS = [
  () => Q('1 metro tem quantos centímetros?', '100 cm', ['10 cm', '1000 cm']),
  () => Q('1 quilômetro tem quantos metros?', '1000 m', ['100 m', '10 m']),
  () => Q('Um ângulo reto mede quantos graus?', '90°', ['180°', '45°']),
  () => { const [n, k] = pick(POLI.filter(p => p[1] > 4)); return Q(`Quantos lados tem um ${n}?`, num(k), erradasNum(k, [k + 1, k - 1, 2 * k])); },
  () => Q('1 centímetro tem quantos milímetros?', '10 mm', ['100 mm', '1000 mm']),
];
const fato = () => pick(FATOS)();
const cerca = () => { const a = int(5, 20), b = int(3, a); const v = 2 * (a + b); return Q(`Um terreno retangular tem ${a} m por ${b} m. Quantos metros de cerca para cercar tudo?`, m_(v), erradasNum(v, [a * b, a + b, v / 2 + a], { fmt: m_ })); };
const ladoDoQ = () => { const l = int(2, 12); const p = 4 * l; return Q(`Um quadrado tem perímetro ${p} cm. Quanto mede cada lado?`, cm(l), erradasNum(l, [p / 2, p - 4, l + 1], { fmt: cm })); };
const cmM = () => { const k = int(2, 9); return Q(`${k * 100} cm são quantos metros?`, m_(k), erradasNum(k, [k * 10, k * 100, k + 1], { fmt: m_ })); };
const ladoR = () => { const a = int(3, 9), b = int(1, 9); const p = 2 * (a + b); return Q(`Um retângulo tem perímetro ${p} cm e um dos lados mede ${a} cm. Quanto mede o outro?`, cm(b), erradasNum(b, [p - a, p / 2, p - 2 * a], { fmt: cm })); };
const angulo = () => { const a = int(30, 80), b = int(30, 150 - a); const v = 180 - a - b; return Q(`Um triângulo tem ângulos de ${a}° e ${b}°. Quanto mede o terceiro?`, `${v}°`, erradasNum(v, [360 - a - b, 90 - a + b > 0 ? 90 - a + b : v + 10, a + b], { fmt: x => `${x}°` })); };
const areaQ = () => { const l = int(2, 12); const v = l * l; return Q(`Área de um quadrado de lado ${l} cm`, cm2(v), erradasNum(v, [4 * l, 2 * l, v + l], { fmt: cm2 })); };
const areaR = () => { const a = int(2, 12), b = int(2, 9); const v = a * b; return Q(`Área de um retângulo de ${a} cm por ${b} cm`, cm2(v), erradasNum(v, [2 * (a + b), a + b, v + a], { fmt: cm2 })); };
const quadradinhos = () => { const r = int(2, 5), c = int(2, 6); const v = r * c; return pick([() => Q(`Uma figura é formada por ${v} quadradinhos de 1 cm². Qual a área?`, cm2(v), erradasNum(v, [v * 4, v + 4], { fmt: cm2 })), () => Q(`Um piso tem ${r} fileiras com ${c} lajotas cada. Quantas lajotas ao todo?`, num(v), erradasNum(v, [r + c, 2 * (r + c), v + c]))])(); };
const UNIDS = [() => Q('Área é medida em:', 'cm²', ['cm', 'kg']), () => Q('Perímetro é medido em:', 'cm', ['cm²', 'L'])];
const unid = () => pick(UNIDS)();
const comparaA = () => { for (; ;) { const l = int(3, 7), a = int(2, 9), b = int(2, 9); if (l * l === a * b) continue; const q = `quadrado de lado ${l} cm`, r = `retângulo de ${a} cm por ${b} cm`; return Q('Qual tem área maior?', l * l > a * b ? q : r, [l * l > a * b ? r : q]); } };
const sala = () => { const a = int(3, 8), b = int(2, 6); const v = a * b; return Q(`Uma sala retangular tem ${a} m por ${b} m. Qual a área?`, m2(v), erradasNum(v, [2 * (a + b), a + b, v + 2], { fmt: m2 })); };
const areaT = () => { const b = 2 * int(2, 7), h = int(2, 9); const v = b * h / 2; return Q(`Área de um triângulo de base ${b} cm e altura ${h} cm`, cm2(v), erradasNum(v, [b * h, b + h, v + h], { fmt: cm2 })); };
const ladoA = () => { const l = int(3, 10); return Q(`Um quadrado tem área ${l * l} cm². Quanto mede o lado?`, cm(l), erradasNum(l, [l * l / 2, l * l / 4, l + 1], { fmt: cm })); };
const areaP = () => { const b = int(4, 12), h = int(2, 8); const v = b * h; return Q(`Área de um paralelogramo de base ${b} cm e altura ${h} cm`, cm2(v), erradasNum(v, [v / 2, 2 * (b + h), b + h], { fmt: cm2 })); };
const metade = () => { const a = 2 * int(3, 8), b = int(4, 10); const v = a * b / 2; return Q(`Um terreno de ${a} m por ${b} m tem grama em metade dele. Qual a área com grama?`, m2(v), erradasNum(v, [a * b, a + b, (a + b)], { fmt: m2 })); };
const M11 = {
  A: {
    treinador1: [perQ, perQ, perR, perR, perQ],
    treinador2: [perT, perP, perP, perP, perT],
    treinador3: [fato, fato, fato, fato, fato],
    lider: [cerca, ladoDoQ, cmM, () => { const l = 10 * int(1, 5); return Q(`Dei uma volta numa quadra quadrada de lado ${l} m. Quanto andei?`, m_(4 * l), erradasNum(4 * l, [l * l, 2 * l, l + 4], { fmt: m_ })); }, perR],
    revanche: [angulo, ladoR, () => { const l = arred(int(1, 4) + 0.5); const v = 4 * l; return Q(`Perímetro de um quadrado de lado ${num(l)} cm`, cm(v), erradasNum(v, [l * l, 2 * l, v + 1], { fmt: cm, inteiro: false })); }],
  },
  B: {
    treinador1: [areaQ, areaQ, areaQ, areaQ, areaQ],
    treinador2: [areaR, areaR, areaR, areaR, areaR],
    treinador3: [quadradinhos, unid, unid, quadradinhos, comparaA],
    lider: [sala, areaQ, areaT, areaR, ladoA],
    revanche: [areaP, areaT, metade],
  },
};

// ===================== MAPA 12 =====================
const coord = (neg = false) => () => { const x = int(neg ? -6 : 0, 9), y = int(neg ? -6 : 0, 9); const qual = coin() ? 'x' : 'y'; const v = qual === 'x' ? x : y; const o = qual === 'x' ? y : x; return Q(`No ponto ${ponto(x, y)}, qual é o valor de ${qual}?`, num(v), erradasTexto(num(v), [num(o), num(-v), num(v + 1), num(v - 1)].filter(s => s !== num(v)))); };
const coordX = () => { const x = int(0, 9), y = int(0, 9); return Q(`No ponto ${ponto(x, y)}, qual é o valor de x?`, num(x), erradasTexto(num(x), [num(y), num(x + 1), num(x + y), num(x + 2), num(y + 1)])); };
const coordY = () => { const x = int(0, 9), y = int(0, 9); return Q(`No ponto ${ponto(x, y)}, qual é o valor de y?`, num(y), erradasTexto(num(y), [num(x), num(y + 1), num(x + y), num(y + 2), num(x + 1)])); };
const EIXOS = [
  () => Q('Qual ponto é a origem?', '(0, 0)', ['(1, 1)', '(0, 1)']),
  () => { const v = pick([-6, -4, -2, 2, 3, 5, 7]); return Q(`O ponto ${ponto(v, 0)} fica sobre qual eixo?`, 'Eixo x', ['Eixo y']); },
  () => { const v = pick([-5, -3, -2, 2, 3, 4, 6]); return Q(`O ponto ${ponto(0, v)} fica sobre qual eixo?`, 'Eixo y', ['Eixo x']); },
];
const eixo = () => pick(EIXOS)();
const qualPonto = () => { let a = int(1, 8), b = int(1, 8); if (a === b) b = a + 1; return Q(`Qual ponto tem x = ${a} e y = ${b}?`, ponto(a, b), [ponto(b, a)]); };
const maisLado = () => { const dir = coin(); let p = [int(0, 8), int(0, 8)], q = [int(0, 8), int(0, 8)]; const i = dir ? 0 : 1; if (p[i] === q[i]) q[i] = p[i] + 2; const r = p[i] > q[i] ? p : q, w = r === p ? q : p; return Q(`Qual ponto fica mais ${dir ? 'à direita' : 'acima'}?`, ponto(...r), [ponto(...w)]); };
const QUADS = { '1º quadrante': [1, 1], '2º quadrante': [-1, 1], '3º quadrante': [-1, -1], '4º quadrante': [1, -1] };
const quadrante = () => { const [nome, [sx, sy]] = pick(Object.entries(QUADS)); const x = sx * int(1, 7), y = sy * int(1, 7); return Q(`Em qual quadrante fica o ponto ${ponto(x, y)}?`, nome, Object.keys(QUADS).filter(k => k !== nome)); };
const dirTxt = (dx, dy) => [dx > 0 ? `${dx} para a direita` : dx < 0 ? `${-dx} para a esquerda` : '', dy > 0 ? `${dy} para cima` : dy < 0 ? `${-dy} para baixo` : ''].filter(Boolean).join(' e ');
function andar({ origem = false, neg = false, dois = true } = {}) {
  return () => {
    for (; ;) {
      const x0 = origem ? 0 : int(0, 6), y0 = origem ? 0 : int(0, 6);
      let dx = int(neg ? -5 : 0, 5), dy = int(neg ? -5 : 0, 5);
      if (!dois) { if (coin()) dy = 0; else dx = 0; }
      if (dx === 0 && dy === 0) continue;
      const x = x0 + dx, y = y0 + dy;
      if (!neg && (x < 0 || y < 0)) continue;
      if (neg && x >= 0 && y >= 0) continue;
      const de = origem ? 'Saindo da origem' : `Saindo de ${ponto(x0, y0)}`;
      return Q(`${de}, ando ${dirTxt(dx, dy)}. Onde paro?`, ponto(x, y), erradasPonto(x, y));
    }
  };
}
function caminho() {
  for (; ;) {
    const x0 = int(-2, 4), y0 = int(-2, 4), dx = int(-4, 5), dy = int(-4, 5);
    if (dx === 0 && dy === 0) continue;
    const r = dirTxt(dx, dy), e1 = dirTxt(dy || dx, dx || dy), e2 = dirTxt(-dx, -dy);
    const err = erradasTexto(r, [e2, e1, dirTxt(dx + (dx >= 0 ? 1 : -1), dy)], 2);
    return Q(`Para ir de ${ponto(x0, y0)} até ${ponto(x0 + dx, y0 + dy)}, ando:`, r, err);
  }
}
const M12 = {
  A: {
    treinador1: [coordX, coordX, coordX, coordX, coordX],
    treinador2: [coordY, coordY, coordY, coordY, coordY],
    treinador3: [eixo, eixo, eixo, eixo, eixo],
    lider: [qualPonto, maisLado, maisLado, coord(true), coord(true)],
    revanche: [quadrante, quadrante, quadrante],
  },
  B: {
    treinador1: [andar({ origem: true }), andar({ origem: true, dois: false }), andar({ origem: true }), andar({ origem: true }), andar({ origem: true, dois: false })],
    treinador2: [andar(), andar({ dois: false }), andar(), andar({ dois: false }), andar()],
    treinador3: [andar({ origem: true, neg: true, dois: false }), andar({ origem: true, neg: true }), andar({ origem: true, neg: true }), andar({ neg: true, dois: false }), andar({ neg: true, dois: false })],
    lider: [andar(), andar({ dois: false }), caminho, andar(), caminho],
    revanche: [andar({ neg: true }), andar({ neg: true }), caminho],
  },
};

// ===================== MAPA 13 =====================
function lista(n, a = 1, b = 10) { return Array.from({ length: n }, () => int(a, b)); }
const fmtL = l => l.join(', ');
function media(n, mPar = false) {
  return () => {
    for (; ;) { const l = lista(n, 1, 12); const s = l.reduce((a, b) => a + b, 0); if (!mPar && s % n) continue; if (mPar && (s * 2) % n) continue; const v = s / n; return Q(`Qual é a média de ${n === 2 ? l.join(' e ') : fmtL(l.slice(0, -1)) + ' e ' + l[l.length - 1]}?`, num(v), erradasNum(v, [s, Math.max(...l), v + 1, (Math.max(...l) + Math.min(...l)) / 2 === v ? v - 1 : (Math.max(...l) + Math.min(...l)) / 2], { inteiro: false })); }
  };
}
function moda() { for (; ;) { const m = int(1, 9), outros = sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(x => x !== m), int(2, 3)); const l = shuffle([m, m, ...(coin() ? [m] : []), ...outros]); const v = m; return Q(`Qual é a moda de ${fmtL(l)}?`, num(v), sample(outros, 2).map(num)); } }
function mediana(n = 3, embaralha = false) {
  return () => {
    for (; ;) { const l = sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20], n).sort((a, b) => a - b); const v = l[(n - 1) / 2]; const mostra = embaralha ? shuffle(l) : l; const med = l.reduce((a, b) => a + b, 0) / n; return Q(`Qual é a mediana de ${fmtL(mostra)}?${embaralha ? ' (organize antes)' : ''}`, num(v), erradasTexto(num(v), [num(mostra[(n - 1) / 2]), ehInteiro(med) ? num(med) : num(l[0]), num(l[0]), num(l[n - 1])], 3)); }
  };
}
function notaFalta() { const m = int(6, 8), a = int(4, 9), b = int(4, 9); const c = 3 * m - a - b; if (c < 0 || c > 10) return notaFalta(); return Q(`A média de 3 provas foi ${m}. Duas notas foram ${a} e ${b}. Qual foi a terceira?`, num(c), erradasNum(c, [3 * m, m, (a + b) / 2, c + 1], { inteiro: true })); }
const duasNotas = () => { for (; ;) { const a = int(4, 10), b = int(4, 10); if ((a + b) % 2) continue; const v = (a + b) / 2; return Q(`Tirei ${a} e ${b} em duas provas. Qual a minha média?`, num(v), erradasNum(v, [a + b, Math.max(a, b), v + 1])); } };

// --- tabelas (Ginásio B): a tabela é sorteada e todas as perguntas do personagem usam a mesma tabela
const TAB = {
  treinador1: { titulo: 'Vendas da barraca de frutas', colunas: ['Fruta', 'Vendas'], itens: ['Maçã', 'Banana', 'Uva', 'Laranja'], txt: { mais: 'Qual fruta vendeu mais?', menos: 'Qual fruta vendeu menos?', qto: n => `Quantas unidades de ${n.toLowerCase()} foram vendidas?`, total: 'Quantas frutas foram vendidas no total?', dif: (a, b) => `Quantas unidades de ${a.toLowerCase()} foram vendidas a mais que de ${b.toLowerCase()}?` }, faixa: [2, 12] },
  treinador2: { titulo: 'Esporte preferido da turma', colunas: ['Esporte', 'Votos'], itens: ['Futebol', 'Vôlei', 'Basquete', 'Natação'], txt: { mais: 'Qual esporte teve mais votos?', menos: 'Qual esporte teve menos votos?', qto: n => `Quantos votos teve ${n === 'Natação' ? 'a natação' : 'o ' + n.toLowerCase()}?`, total: 'Quantos alunos votaram ao todo?', dif: (a, b) => `${a} teve quantos votos a mais que ${b.toLowerCase()}?` }, faixa: [2, 14] },
  treinador3: { titulo: 'Gols marcados na semana', colunas: ['Dia', 'Gols'], itens: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'], txt: { mais: 'Em que dia saíram mais gols?', menos: 'Em que dia saíram menos gols?', qto: n => `Quantos gols saíram na ${n.toLowerCase()}?`, total: 'Quantos gols saíram na semana?', dif: (a, b) => `Quantos gols saíram na ${a.toLowerCase()} a mais que na ${b.toLowerCase()}?`, media: 'Qual foi a média de gols por dia?' }, faixa: [0, 6] },
  lider: { titulo: 'Livros lidos no mês', colunas: ['Aluno', 'Livros'], itens: ['Ana', 'Bia', 'Caio', 'Davi', 'Eva'], txt: { mais: 'Quem leu mais livros?', menos: 'Quem leu menos livros?', qto: n => `Quantos livros ${n} leu?`, total: 'Quantos livros foram lidos ao todo?', dif: (a, b) => `${a} leu quantos livros a mais que ${b}?`, media: 'Qual é a média de livros lidos por aluno?', mediana: 'Qual é a mediana dos livros lidos?' }, faixa: [1, 8] },
};
TAB.revanche = TAB.lider;
export function tabelaSorteada(chave) {
  const T = TAB[chave];
  for (; ;) {
    const vals = T.itens.map(() => int(...T.faixa));
    const mx = Math.max(...vals), mn = Math.min(...vals);
    if (vals.filter(v => v === mx).length > 1 || vals.filter(v => v === mn).length > 1) continue;       // maior e menor únicos
    const soma = vals.reduce((a, b) => a + b, 0);
    if (T.txt.media && soma % vals.length) continue;                                                      // média inteira
    return { titulo: T.titulo, colunas: T.colunas, linhas: T.itens.map((n, i) => [n, vals[i]]), _T: T };
  }
}
export function perguntasTabela(chave, n) {
  const tab = tabelaSorteada(chave); const T = tab._T; const it = tab.linhas.map(l => l[0]), vs = tab.linhas.map(l => l[1]);
  const soma = vs.reduce((a, b) => a + b, 0); const iMax = vs.indexOf(Math.max(...vs)), iMin = vs.indexOf(Math.min(...vs));
  const outros = i => it.filter((_, j) => j !== i);
  const qs = [
    () => Q(T.txt.mais, it[iMax], sample(outros(iMax), 3)),
    () => Q(T.txt.menos, it[iMin], sample(outros(iMin), 3)),
    () => { const i = int(0, it.length - 1); return Q(T.txt.qto(it[i]), num(vs[i]), erradasTexto(num(vs[i]), shuffle(vs.filter(v => v !== vs[i])).map(num).concat([num(vs[i] + 1)]))); },
    () => Q(T.txt.total, num(soma), erradasNum(soma, [soma + 1, soma - 1, soma + vs[0], Math.max(...vs) * it.length])),
    () => { const v = vs[iMax] - vs[iMin]; return Q(T.txt.dif(it[iMax], it[iMin]), num(v), erradasNum(v, [vs[iMax] + vs[iMin], vs[iMax], v + 1])); },
  ];
  if (T.txt.media) qs.push(() => { const v = soma / vs.length; return Q(T.txt.media, num(v), erradasNum(v, [soma, v + 1, v - 1, vs[Math.floor(vs.length / 2)]])); });
  if (T.txt.mediana) qs.push(() => { const s = [...vs].sort((a, b) => a - b); const v = s[2]; return Q(T.txt.mediana, num(v), erradasTexto(num(v), [num(vs[2]), num(soma / 5), num(s[0]), num(s[4]), num(v + 1)].filter(x => !x.includes(',')))); });
  const tabela = { titulo: tab.titulo, colunas: tab.colunas, linhas: tab.linhas };
  return shuffle(qs).slice(0, n).map(f => ({ ...f(), tabela }));
}
const M13 = {
  A: {
    treinador1: [media(2), media(3), media(2), media(3), media(3)],
    treinador2: [moda, moda, moda, moda, moda],
    treinador3: [mediana(), mediana(), mediana(5), mediana(), mediana(3)],
    lider: [media(2), moda, mediana(3, true), media(3), duasNotas],
    revanche: [media(4, true), mediana(5, true), notaFalta],
  },
  B: 'tabelas',
};

export const MAPAS_9_13 = { 9: M9, 10: M10, 11: M11, 12: M12, 13: M13 };

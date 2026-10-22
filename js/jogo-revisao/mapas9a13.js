import { int, pick, shuffle, sample, coin, num, reais, arred, ehInteiro, erradasNum, erradasTexto, ponto, erradasPonto, frac, simpl, erradasFrac } from './base.js';
import { Q, X } from './mapas1a4.js';
import { SN } from './mapas5a8.js';

// ===================== MAPA 9 =====================
const eqX = v => `x = ${num(v)}`;
function eq(tipo) {
  return () => {
    const x = int(tipo.endsWith('neg') ? 1 : 0, 15), a = int(2, 6), b = int(1, 12);
    let e, c, cand, ex;
    switch (tipo) {
      case 'soma': c = x + b; e = `x + ${b} = ${c}`; cand = [c + b, b - c, c]; ex = `O ${b} está somando: passa para o outro lado subtraindo. x = ${c} − ${b} = ${x}`; break;
      case 'sub': c = x - b; if (c < 0) return eq(tipo)(); e = `x − ${b} = ${c}`; cand = [c - b, b - c, c]; ex = `O ${b} está subtraindo: passa para o outro lado somando. x = ${c} + ${b} = ${x}`; break;
      case 'mult': if (x === 0) return eq(tipo)(); c = a * x; e = `${a}x = ${c}`; cand = [c - a, c * a, c]; ex = `O ${a} está multiplicando: passa dividindo. x = ${c} ÷ ${a} = ${x}`; break;
      case 'div': c = int(2, 9); e = `x ÷ ${a} = ${c}`; return Q(e, eqX(a * c), erradasNum(a * c, [c / a, c + a, c], { fmt: eqX, inteiro: false }), X(`O ${a} está dividindo: passa multiplicando. x = ${c} × ${a} = ${a * c}`));
      case 'axb': if (x === 0) return eq(tipo)(); c = a * x + b; e = `${a}x + ${b} = ${c}`; cand = [(c + b) / a, c - b, x + 1]; ex = `Primeiro tire o ${b}: ${a}x = ${c} − ${b} = ${c - b}. Depois divida: x = ${c - b} ÷ ${a} = ${x}`; break;
      case 'axmb': if (x === 0) return eq(tipo)(); c = a * x - b; if (c < 0) return eq(tipo)(); e = `${a}x − ${b} = ${c}`; cand = [(c - b) / a, c + b, x - 1]; ex = `Primeiro passe o ${b} somando: ${a}x = ${c} + ${b} = ${c + b}. Depois divida: x = ${c + b} ÷ ${a} = ${x}`; break;
      case 'subneg': c = x - (x + int(1, 9)); { const bb = x - c; e = `x − ${bb} = ${num(c)}`; cand = [c - bb, bb - c, -x]; ex = `O ${bb} passa somando: x = ${num(c)} + ${bb} = ${x}`; } break;
    }
    return Q(e, eqX(x), erradasNum(x, cand, { fmt: eqX, neg: tipo === 'subneg', inteiro: true }), X(ex));
  };
}
function eqDois() { const x = int(1, 9), a = int(4, 7), c = int(1, a - 1), b = int(1, 9); const d = a * x - b - c * x; if (d < 0) return eqDois(); const cx = c === 1 ? 'x' : `${c}x`; return Q(`${a}x − ${b} = ${cx} + ${d}`, eqX(x), erradasNum(x, [(d + b) / (a + c), d + b, x + 1], { fmt: eqX }), X(`x de um lado, números do outro: ${a}x − ${cx} = ${d} + ${b} → ${a - c}x = ${d + b} → x = ${d + b} ÷ ${a - c} = ${x}`)); }
function eqParen() { const x = int(1, 9), a = int(2, 4), b = int(1, 5); const c = a * (x + b); return Q(`${a}(x + ${b}) = ${c}`, eqX(x), erradasNum(x, [c / a + b, (c - b) / a, c - a - b], { fmt: eqX, inteiro: true }), X(`Divida os dois lados por ${a}: x + ${b} = ${c / a}. Depois: x = ${c / a} − ${b} = ${x}`)); }
function pensei() { const x = int(2, 20), b = int(2, 9); return Q(`Pensei num número, somei ${b} e deu ${x + b}. Que número pensei?`, num(x), erradasNum(x, [x + 2 * b, x + b, b]), X(`Desfaça a conta: ${x + b} − ${b} = ${x}`)); }
function dobroE() { const x = int(2, 15); return Q(`O dobro de um número é ${2 * x}. Que número é esse?`, num(x), erradasNum(x, [4 * x, 2 * x, 2 * x - 2]), X(`2x = ${2 * x} → x = ${2 * x} ÷ 2 = ${x}`)); }
function cadernos() { const n = int(2, 6), p = int(2, 9); return Q(`Comprei ${n} cadernos iguais e gastei R$ ${n * p}. Quanto custou cada um?`, reais(p), erradasNum(p, [n * p - n, n * p + n, n * p * n], { fmt: reais }), X(`${n}x = ${n * p} → x = ${n * p} ÷ ${n} = ${p}`)); }
// --- qual é a equação?
const FR = [
  (k, t) => [`"Um número mais ${k} é igual a ${t}"`, `x + ${k} = ${t}`, [`${k}x = ${t}`, `x − ${k} = ${t}`, `x ÷ ${k} = ${t}`]],
  (k, t) => [`"O dobro de um número é ${t}"`, `2x = ${t}`, [`x + 2 = ${t}`, `x² = ${t}`, `x ÷ 2 = ${t}`]],
  (k, t) => [`"Um número menos ${k} é igual a ${t}"`, `x − ${k} = ${t}`, [`${k} − x = ${t}`, `x + ${k} = ${t}`, `${k}x = ${t}`]],
  (k, t) => [`"O triplo de um número é ${t}"`, `3x = ${t}`, [`x + 3 = ${t}`, `x ÷ 3 = ${t}`, `x³ = ${t}`]],
  (k, t) => [`"A metade de um número é ${t}"`, `x ÷ 2 = ${t}`, [`2x = ${t}`, `x − 2 = ${t}`, `x + 2 = ${t}`]],
  (k, t) => [`"O quádruplo de um número é ${t}"`, `4x = ${t}`, [`x + 4 = ${t}`, `x ÷ 4 = ${t}`, `x⁴ = ${t}`]],
];
const HIST = [
  (k, t) => [`Tinha x figurinhas, ganhei ${k} e fiquei com ${t}.`, `x + ${k} = ${t}`, [`${k}x = ${t}`, `x − ${k} = ${t}`, `x ÷ ${k} = ${t}`]],
  (k, t) => [`Cada caderno custa x reais. ${k} cadernos custaram R$ ${k * t}.`, `${k}x = ${k * t}`, [`x + ${k} = ${k * t}`, `x ÷ ${k} = ${k * t}`, `x − ${k} = ${k * t}`]],
  (k, t) => [`Tinha x reais, gastei ${k} e sobraram ${t}.`, `x − ${k} = ${t}`, [`x + ${k} = ${t}`, `${k}x = ${t}`, `${k} − x = ${t}`]],
  (k, t) => [`Dividi x balas entre ${k} amigos e cada um ganhou ${t}.`, `x ÷ ${k} = ${t}`, [`${k}x = ${t}`, `x − ${k} = ${t}`, `x + ${k} = ${t}`]],
  (k, t) => [`Pedro tem x anos. Daqui a ${k} anos terá ${t + k}.`, `x + ${k} = ${t + k}`, [`x − ${k} = ${t + k}`, `${k}x = ${t + k}`, `x = ${t + k} + ${k}`]],
  (k, t) => [`Tinha x reais, gastei a metade e fiquei com ${t}.`, `x ÷ 2 = ${t}`, [`2x = ${t}`, `x − 2 = ${t}`, `x + 2 = ${t}`]],
];
const BAL = [
  (k, t) => [`Numa balança, 1 caixa de peso x e mais ${k} kg equilibram ${k + t} kg.`, `x + ${k} = ${k + t}`, [`${k}x = ${k + t}`, `x = ${k + t} + ${k}`, `x − ${k} = ${k + t}`]],
  (k, t) => [`Numa balança, ${k} caixas de peso x equilibram ${k * t} kg.`, `${k}x = ${k * t}`, [`x + ${k} = ${k * t}`, `x = ${k * t} + ${k}`, `x ÷ ${k} = ${k * t}`]],
  (k, t) => [`Numa balança, 1 caixa de peso x equilibra um peso de ${t} kg e outro de ${k} kg.`, `x = ${t} + ${k}`, [`x = ${t} × ${k}`, `x + ${k} = ${t}`, `x = ${t} − ${k}`]],
];
const EQX = X('Troque as palavras por sinais: "mais/ganhei" é +, "menos/gastei" é −, "dobro/vezes" é ×, "metade/dividi" é ÷.');
const deLista = lista => () => { const k = int(2, 6), t = int(3, 20); const [e, r, x] = pick(lista)(k, t); return Q(e, r, x, EQX); };
const eqRev = [
  () => { const k = int(1, 5), t = 2 * int(2, 8) + k; return Q(`"O dobro de um número mais ${k} é igual a ${t}"`, `2x + ${k} = ${t}`, [`2(x + ${k}) = ${t}`, `x + 2 + ${k} = ${t}`, `2x − ${k} = ${t}`], X(`O dobro do número é 2x; depois soma ${k}: 2x + ${k} = ${t}`)); },
  () => { const k = int(2, 4), x = int(8, 14), t = x + k * x; return Q(`Ana tem x anos e o pai tem o ${['', '', 'dobro', 'triplo', 'quádruplo'][k]} da idade dela. Juntos somam ${t} anos.`, `x + ${k}x = ${t}`, [`${k}x = ${t}`, `x + ${k} = ${t}`, `${k}x − x = ${t}`], X(`Ana: x. Pai: ${k}x. Juntos: x + ${k}x = ${t}`)); },
  () => { const k = int(2, 3), b = int(1, 5), t = k * int(1, 5) + b; return Q(`Numa balança, ${k} caixas de peso x e mais ${b} kg equilibram ${t} kg.`, `${k}x + ${b} = ${t}`, [`x + ${b} = ${t}`, `${k}x = ${t} + ${b}`, `${k} + x + ${b} = ${t}`], X(`${k} caixas pesam ${k}x; mais ${b} kg: ${k}x + ${b} = ${t}`)); },
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
function unitTotal() { const [s, p] = pick(ITENS), u = int(2, 9), q = int(3, 9); const v = u * q; return Q(`1 ${s} custa R$ ${u}. Quanto custam ${q} ${p}?`, reais(v), erradasNum(v, [u + q, v + u, v - u], { fmt: reais }), X(`${q} × ${u} = ${v}. Resposta: ${reais(v)}`)); }
function velocidade() { const k = 10 * int(4, 9), h = int(2, 5); const v = k * h; return Q(`Um carro anda ${k} km em 1 hora. Quantos km anda em ${h} horas?`, `${v} km`, erradasNum(v, [k + h, v + k, k * (h - 1)], { fmt: x => `${x} km` }), X(`${k} km por hora × ${h} horas = ${v} km`)); }
function receita() { const o = int(2, 4), b = int(2, 6); const v = o * b; return Q(`Uma receita usa ${o} ovos por bolo. Quantos ovos para ${b} bolos?`, `${v} ovos`, erradasNum(v, [o + b, v + o, v - o], { fmt: x => `${x} ovos` }), X(`${o} ovos por bolo × ${b} bolos = ${v} ovos`)); }
function totalUnit(dec = false) {
  return () => {
    const [s, p] = pick(ITENS), q = int(2, 6); const u = dec ? pick([0.5, 1.5, 2.5]) : int(2, 9); const T = arred(q * u);
    return Q(`${q} ${p} custam ${reais(T)}. Quanto custa 1 ${s}?`, reais(u), erradasNum(u, [T + q, T, q / T > 0 && ehInteiro(q / T) ? q / T : T - q, u + 1], { fmt: reais, inteiro: false }).filter(x => /^R\$ \d+(,\d\d)?$/.test(x)), X(`Para achar o preço de 1, divida: ${reais(T)} ÷ ${q} = ${reais(u)}`));
  };
}
const GRAND = [
  ['Mais trabalhadores, menos tempo de obra.', 'Inversas'], ['Mais produtos, preço total maior.', 'Diretas'],
  ['Mais velocidade, menos tempo de viagem.', 'Inversas'], ['Mais ingredientes, mais bolos.', 'Diretas'],
  ['Mais horas trabalhadas, maior salário.', 'Diretas'], ['Mais torneiras abertas, menos tempo para encher o tanque.', 'Inversas'],
  ['Mais litros de gasolina, mais quilômetros rodados.', 'Diretas'], ['Mais pessoas dividindo uma pizza, menos pedaços para cada um.', 'Inversas'],
];
const grandezas = () => { const [e, r] = pick(GRAND); return Q(`${e} São grandezas:`, r, [r === 'Diretas' ? 'Inversas' : 'Diretas'], X('Diretas: um aumenta e o outro também aumenta. Inversas: um aumenta e o outro diminui.')); };
function proporcao() { const [s, p] = pick(ITENS), q1 = int(2, 5), u = int(2, 8), k = int(2, 3), q2 = q1 * k; const T1 = q1 * u, v = q2 * u; return Q(`${q1} ${p} custam R$ ${T1}. Quanto custam ${q2} ${p}?`, reais(v), erradasNum(v, [T1 + q2, T1 * q2, v + u], { fmt: reais }), X(`Preço de 1: ${T1} ÷ ${q1} = ${u}. Então ${q2} × ${u} = ${v}`)); }
function inversa() { const p = int(1, 3), k = 2, d = 2 * int(2, 6) * p; const v = d / k; return Q(`${p} ${p === 1 ? 'pessoa pinta' : 'pessoas pintam'} um muro em ${d} dias. Em quantos dias ${p * k} pessoas pintam?`, `${num(v)} dias`, erradasNum(v, [d * k, d + k, d - k], { fmt: x => `${num(x)} dias` }), X(`Mais pessoas, menos dias (inversa): o dobro de pessoas leva a metade do tempo. ${d} ÷ 2 = ${num(v)} dias`)); }
function suco() { const l = int(1, 3), c = 4 * l, l2 = l * int(2, 3), v = c / l * l2; return Q(`${l} ${l === 1 ? 'litro' : 'litros'} de suco ${l === 1 ? 'enche' : 'enchem'} ${c} copos. Quantos copos ${l2} litros enchem?`, `${v} copos`, erradasNum(v, [c + l2, v + c, c * l2 / 2 === v ? v + 2 : c * l2 / 2], { fmt: x => `${num(x)} copos` }), X(`1 litro enche ${c / l} copos. ${l2} × ${c / l} = ${v} copos`)); }
function pedreiros() { const p = 2, d = 2 * int(3, 9), p2 = 4; const v = d * p / p2; return Q(`${p} pedreiros levam ${d} dias para fazer um muro. Quantos dias levam ${p2} pedreiros?`, `${num(v)} dias`, erradasNum(v, [d * 2, d + 2, d - 2], { fmt: x => `${num(x)} dias` }), X(`O dobro de pedreiros leva a metade do tempo (inversa): ${d} ÷ 2 = ${num(v)} dias`)); }
function carne() { const k = int(3, 6), u = int(5, 9), k2 = k + int(2, 4); const v = u * k2; return Q(`${k} kg de carne custam R$ ${k * u}. Quanto custam ${k2} kg?`, reais(v), erradasNum(v, [k * u + k2, k * u * k2 / 10, v + u], { fmt: reais, inteiro: true }), X(`1 kg: ${k * u} ÷ ${k} = ${u}. Então ${k2} × ${u} = ${v}`)); }
function composta() { const m = 2, p = 50 * int(1, 3), h = 2, m2 = 4, h2 = 3; const v = p / (m * h) * m2 * h2; return Q(`${m} máquinas fazem ${p} peças em ${h} horas. Quantas peças ${m2} máquinas fazem em ${h2} horas?`, `${v} peças`, erradasNum(v, [p * 2, p * m2 * h2, p * h2, p + 100], { fmt: x => `${num(x)} peças` }), X(`1 máquina em 1 hora: ${p} ÷ ${m} ÷ ${h} = ${p / (m * h)}. Então ${p / (m * h)} × ${m2} × ${h2} = ${v} peças`)); }
// --- qual é a conta?
function contaUnit() { const [s, p] = pick(ITENS), q = int(2, 6), u = int(2, 9), T = q * u; return Q(`${q} ${p} custam R$ ${T}. Para achar o preço de 1 ${s}, faço:`, `${T} ÷ ${q}`, [`${T} × ${q}`, ...sample([`${T} + ${q}`, `${T} − ${q}`, `${q} ÷ ${T}`], 2)], X(`Do total para 1 unidade: divide. ${T} ÷ ${q}`)); }
function contaTotal() {
  const t = int(0, 3), a = int(2, 9), b = int(2, 9);
  const e = [`1 bala custa R$ ${a}. Para achar o preço de ${b} balas, faço:`, `Uma receita usa ${a} xícaras de farinha por bolo. Para ${b} bolos, faço:`, `Um carro anda ${a * 10} km em 1 hora. Para saber quanto anda em ${b} horas, faço:`, `1 caixa tem ${a} ovos. Para saber quantos ovos há em ${b} caixas, faço:`][t];
  const A = t === 2 ? a * 10 : a;
  return Q(e, `${A} × ${b}`, [`${A} + ${b}`, `${A} ÷ ${b}`, `${A} − ${b}`], X(`De 1 unidade para várias: multiplica. ${A} × ${b}`));
}
function contaInv() {
  const t = int(0, 2), d = 2 * int(2, 6), k = 2;
  const e = [`1 pessoa pinta um muro em ${d} dias. Para saber o tempo de ${k} pessoas, faço:`, `1 torneira enche um tanque em ${d} horas. Para saber o tempo de ${k} torneiras, faço:`, `${k} pintores levam ${d / 2} dias. Para saber o tempo de 1 pintor sozinho, faço:`][t];
  if (t === 2) return Q(e, `${d / 2} × ${k}`, [`${d / 2} ÷ ${k}`, `${d / 2} + ${k}`, `${d / 2} − ${k}`], X('Menos pessoas trabalhando, mais tempo (inversa): multiplica.'));
  return Q(e, `${d} ÷ ${k}`, [`${d} × ${k}`, `${d} + ${k}`, `${d} − ${k}`], X('Mais ajudando, menos tempo (inversa): divide.'));
}
const velDobra = () => Q('Se a velocidade dobra, o tempo de viagem:', 'cai pela metade', ['dobra', 'fica igual', 'triplica'], X('Velocidade e tempo são inversas: uma dobra, a outra cai pela metade.'));
function contaRev(t) {
  if (t === 0) { const q = int(3, 5), u = int(2, 6), q2 = q + int(2, 4); return Q(`${q} canetas custam R$ ${q * u}. Qual conta dá o preço de ${q2} canetas?`, `${q * u} ÷ ${q} × ${q2}`, [`${q * u} × ${q} ÷ ${q2}`, `${q * u} + ${q2}`, `${q * u} × ${q2}`], X(`Ache o preço de 1 (÷ ${q}) e depois multiplique por ${q2}.`)); }
  if (t === 1) { const p = 3, d = 2 * int(2, 6), p2 = 6; return Q(`${p} pedreiros fazem um muro em ${d} dias. Qual conta dá o tempo com ${p2} pedreiros?`, `${d} × ${p} ÷ ${p2}`, [`${d} × ${p2} ÷ ${p}`, `${d} + ${p}`, `${d} × ${p2}`], X(`Inversa: tempo de 1 pedreiro sozinho = ${d} × ${p}; com ${p2} pedreiros, divide por ${p2}.`)); }
  const c = int(2, 3), k = 15 * c, c2 = int(4, 7); return Q(`No mapa, ${c} cm valem ${k} km. Qual conta dá quantos km valem ${c2} cm?`, `${k} ÷ ${c} × ${c2}`, [`${k} × ${c} ÷ ${c2}`, `${k} + ${c2}`, `${k} × ${c2}`], X(`Ache quanto vale 1 cm (÷ ${c}) e depois multiplique por ${c2}.`));
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
// figura (PROMPT-135): o desenho da pergunta e a animação depois de responder (js/jogo-revisao/figuras.js)
const FG = (x, figura) => ({ ...x, figura });
const POL = (forma, lados, unid = 'cm', extra = {}) => ({ tipo: 'poligono', forma, lados, unid, ...extra });
const GR = (c, l, unid = 'cm', extra = {}) => ({ tipo: 'grade', c, l, unid, ...extra });
const cm = x => `${num(x)} cm`, cm2 = x => `${num(x)} cm²`, m_ = x => `${num(x)} m`, m2 = x => `${num(x)} m²`;
const perQ = () => { const l = int(2, 15); const v = 4 * l; return Q(`Perímetro de um quadrado de lado ${l} cm`, cm(v), erradasNum(v, [l * l, 2 * l, l + 4], { fmt: cm }), FG(X(`Perímetro é a soma dos 4 lados: 4 × ${l} = ${v} cm`), POL('quadrado', [l, l, l, l]))); };
const perR = () => { const a = int(3, 12), b = int(1, a - 1); const v = 2 * (a + b); return Q(`Perímetro de um retângulo de ${a} cm por ${b} cm`, cm(v), erradasNum(v, [a * b, a + b, 2 * a + b], { fmt: cm }), FG(X(`Some os 4 lados: ${a} + ${b} + ${a} + ${b} = ${v} cm`), POL('retangulo', [a, b, a, b]))); };
const perT = () => { const a = int(3, 9), b = int(3, 9), c = int(Math.abs(a - b) + 1, a + b - 1); const v = a + b + c; return Q(`Perímetro de um triângulo de lados ${a} cm, ${b} cm e ${c} cm`, cm(v), erradasNum(v, [a * b, v + 1, v - 1], { fmt: cm }), FG(X(`Some os 3 lados: ${a} + ${b} + ${c} = ${v} cm`), POL('triangulo', [a, b, c]))); };
const POLI = [['triângulo', 3], ['quadrado', 4], ['pentágono', 5], ['hexágono', 6], ['octógono', 8]];
const perP = () => { const [n, k] = pick(POLI.filter(p => p[1] !== 4)), l = int(1, 9); const v = k * l; return Q(`Perímetro de um ${n} com ${k} lados iguais de ${l} cm`, cm(v), erradasNum(v, [v + l, k + l, v - l], { fmt: cm }), FG(X(`${k} lados de ${l} cm: ${k} × ${l} = ${v} cm`), POL('regular', Array(k).fill(l)))); };
const FATOS = [
  () => Q('1 metro tem quantos centímetros?', '100 cm', ['10 cm', '1000 cm', '50 cm'], FG(X('"Centi" quer dizer centésimo: 1 m = 100 cm.'), { tipo: 'regua', texto: '1 m = 100 cm', de: '1 m', para: '100 cm', partes: 100 })),
  () => Q('1 quilômetro tem quantos metros?', '1000 m', ['100 m', '10 m', '10000 m'], FG(X('"Quilo" quer dizer mil: 1 km = 1000 m.'), { tipo: 'regua', texto: '1 km = 1000 m', de: '1 km', para: '1000 m', partes: 10 })),
  () => Q('Um ângulo reto mede quantos graus?', '90°', ['180°', '45°', '360°'], FG(X('Ângulo reto é o "canto" de um quadrado: 90°. Meia volta é 180°.'), { tipo: 'angulo_reto' })),
  () => { const [n, k] = pick(POLI.filter(p => p[1] > 4)); return Q(`Quantos lados tem um ${n}?`, num(k), erradasNum(k, [k + 1, k - 1, 2 * k]), FG(X('Pentágono: 5 lados. Hexágono: 6. Octógono: 8.'), { tipo: 'contar_lados', n: k })); },
  () => Q('1 centímetro tem quantos milímetros?', '10 mm', ['100 mm', '1000 mm', '1 mm'], FG(X('Na régua, cada centímetro tem 10 risquinhos de 1 mm.'), { tipo: 'regua', texto: '1 cm = 10 mm', de: '1 cm', para: '10 mm', partes: 10 })),
];
const fato = () => pick(FATOS)();
const cerca = () => { const a = int(5, 20), b = int(3, a); const v = 2 * (a + b); return Q(`Um terreno retangular tem ${a} m por ${b} m. Quantos metros de cerca para cercar tudo?`, m_(v), erradasNum(v, [a * b, a + b, v / 2 + a], { fmt: m_ }), FG(X(`Cercar é contornar (perímetro): ${a} + ${b} + ${a} + ${b} = ${v} m`), POL('retangulo', [a, b, a, b], 'm'))); };
const ladoDoQ = () => { const l = int(2, 12); const p = 4 * l; return Q(`Um quadrado tem perímetro ${p} cm. Quanto mede cada lado?`, cm(l), erradasNum(l, [p / 2, p - 4, l + 1], { fmt: cm }), FG(X(`O quadrado tem 4 lados iguais: ${p} ÷ 4 = ${l} cm`), POL('quadrado', ['?', '?', '?', '?'], 'cm', { revela: [l, l, l, l], total: p, conta: `${p} ÷ 4 = ${l} cm` }))); };
const cmM = () => { const k = int(2, 9); return Q(`${k * 100} cm são quantos metros?`, m_(k), erradasNum(k, [k * 10, k * 100, k + 1], { fmt: m_ }), FG(X(`100 cm = 1 m. ${k * 100} ÷ 100 = ${k} m`), { tipo: 'regua', texto: `100 cm = 1 m → ${k * 100} cm = ${k} m`, de: `${k * 100} cm`, para: `${k} m`, metros: k })); };
const ladoR = () => { const a = int(3, 9), b = int(1, 9); const p = 2 * (a + b); return Q(`Um retângulo tem perímetro ${p} cm e um dos lados mede ${a} cm. Quanto mede o outro?`, cm(b), erradasNum(b, [p - a, p / 2, p - 2 * a], { fmt: cm }), FG(X(`Metade do perímetro é um lado de cada: ${p} ÷ 2 = ${p / 2}. Então ${p / 2} − ${a} = ${b} cm`), POL('retangulo', [a, '?', a, '?'], 'cm', { revela: [a, b, a, b], total: p, conta: `${p} − ${a} − ${a} = ${p - 2 * a} · ${p - 2 * a} ÷ 2 = ${b} cm` }))); };
const angulo = () => { const a = int(30, 80), b = int(30, 150 - a); const v = 180 - a - b; return Q(`Um triângulo tem ângulos de ${a}° e ${b}°. Quanto mede o terceiro?`, `${v}°`, erradasNum(v, [360 - a - b, 90 - a + b > 0 ? 90 - a + b : v + 10, a + b], { fmt: x => `${x}°` }), FG(X(`Os ângulos do triângulo somam 180°: 180 − ${a} − ${b} = ${v}°`), { tipo: 'angulos', angulos: [a, b, '?'], revela: v, conta: `180° − ${a}° − ${b}° = ${v}°` })); };
const areaQ = () => { const l = int(2, 12); const v = l * l; return Q(`Área de um quadrado de lado ${l} cm`, cm2(v), erradasNum(v, [4 * l, 2 * l, v + l], { fmt: cm2 }), FG(X(`Área do quadrado = lado × lado: ${l} × ${l} = ${v} cm²`), GR(l, l))); };
const areaR = () => { const a = int(2, 12), b = int(2, 9); const v = a * b; return Q(`Área de um retângulo de ${a} cm por ${b} cm`, cm2(v), erradasNum(v, [2 * (a + b), a + b, v + a], { fmt: cm2 }), FG(X(`Área do retângulo = comprimento × largura: ${a} × ${b} = ${v} cm²`), GR(a, b))); };
const quadradinhos = () => { const r = int(2, 5), c = int(2, 6); const v = r * c; return pick([() => Q(`Uma figura é formada por ${v} quadradinhos de 1 cm². Qual a área?`, cm2(v), erradasNum(v, [v * 4, v + 4], { fmt: cm2 }), FG(X(`Cada quadradinho vale 1 cm²: ${v} quadradinhos = ${v} cm²`), GR(c, r))), () => Q(`Um piso tem ${r} fileiras com ${c} lajotas cada. Quantas lajotas ao todo?`, num(v), erradasNum(v, [r + c, 2 * (r + c), v + c]), FG(X(`${r} fileiras × ${c} lajotas = ${v}`), GR(c, r, '', { rotulo: 'lajotas' })))])(); };
const UNIDS = [() => Q('Área é medida em:', 'cm²', ['cm', 'kg', 'L'], FG(X('Área é o espaço de dentro (quadradinhos): cm². Perímetro é o contorno: cm.'), { tipo: 'medida', o: 'area' })), () => Q('Perímetro é medido em:', 'cm', ['cm²', 'L', 'kg'], FG(X('Perímetro é o contorno: cm. Área é o espaço de dentro: cm².'), { tipo: 'medida', o: 'perimetro' }))];
const unid = () => pick(UNIDS)();
const comparaA = () => { for (; ;) { const l = int(3, 7), a = int(2, 9), b = int(2, 9); if (l * l === a * b) continue; const q = `quadrado de lado ${l} cm`, r = `retângulo de ${a} cm por ${b} cm`; return Q('Qual tem área maior?', l * l > a * b ? q : r, [l * l > a * b ? r : q], FG(X(`Quadrado: ${l} × ${l} = ${l * l} cm². Retângulo: ${a} × ${b} = ${a * b} cm².`), { tipo: 'compara_area', figuras: [{ c: l, l, nome: q }, { c: a, l: b, nome: r }], unid: 'cm' })); } };
const sala = () => { const a = int(3, 8), b = int(2, 6); const v = a * b; return Q(`Uma sala retangular tem ${a} m por ${b} m. Qual a área?`, m2(v), erradasNum(v, [2 * (a + b), a + b, v + 2], { fmt: m2 }), FG(X(`${a} × ${b} = ${v} m²`), GR(a, b, 'm'))); };
const areaT = () => { const b = 2 * int(2, 7), h = int(2, 9); const v = b * h / 2; return Q(`Área de um triângulo de base ${b} cm e altura ${h} cm`, cm2(v), erradasNum(v, [b * h, b + h, v + h], { fmt: cm2 }), FG(X(`Área do triângulo = base × altura ÷ 2: ${b} × ${h} ÷ 2 = ${num(v)} cm²`), { tipo: 'triangulo_area', base: b, altura: h, unid: 'cm' })); };
const ladoA = () => { const l = int(3, 10); return Q(`Um quadrado tem área ${l * l} cm². Quanto mede o lado?`, cm(l), erradasNum(l, [l * l / 2, l * l / 4, l + 1], { fmt: cm }), FG(X(`Qual número vezes ele mesmo dá ${l * l}? ${l} × ${l} = ${l * l}. Lado: ${l} cm`), GR(l, l, 'cm', { lado_oculto: true, conta: `${l} × ${l} = ${l * l} → lado ${l} cm` }))); };
const areaP = () => { const b = int(4, 12), h = int(2, 8); const v = b * h; return Q(`Área de um paralelogramo de base ${b} cm e altura ${h} cm`, cm2(v), erradasNum(v, [v / 2, 2 * (b + h), b + h], { fmt: cm2 }), FG(X(`Área do paralelogramo = base × altura: ${b} × ${h} = ${v} cm²`), { tipo: 'paralelogramo', base: b, altura: h, unid: 'cm' })); };
const metade = () => { const a = 2 * int(3, 8), b = int(4, 10); const v = a * b / 2; return Q(`Um terreno de ${a} m por ${b} m tem grama em metade dele. Qual a área com grama?`, m2(v), erradasNum(v, [a * b, a + b, (a + b)], { fmt: m2 }), FG(X(`Área total: ${a} × ${b} = ${a * b}. Metade: ${a * b} ÷ 2 = ${v} m²`), GR(a, b, 'm', { metade: true }))); };
const M11 = {
  A: {
    treinador1: [perQ, perQ, perR, perR, perQ],
    treinador2: [perT, perP, perP, perP, perT],
    treinador3: [fato, fato, fato, fato, fato],
    lider: [cerca, ladoDoQ, cmM, () => { const l = 10 * int(1, 5); return Q(`Dei uma volta numa quadra quadrada de lado ${l} m. Quanto andei?`, m_(4 * l), erradasNum(4 * l, [l * l, 2 * l, l + 4], { fmt: m_ }), FG(X(`Uma volta é o perímetro: 4 × ${l} = ${4 * l} m`), POL('quadrado', [l, l, l, l], 'm'))); }, perR],
    revanche: [angulo, ladoR, () => { const l = arred(int(1, 4) + 0.5); const v = 4 * l; return Q(`Perímetro de um quadrado de lado ${num(l)} cm`, cm(v), erradasNum(v, [l * l, 2 * l, v + 1], { fmt: cm, inteiro: false }), FG(X(`4 × ${num(l)} = ${num(v)} cm`), POL('quadrado', [l, l, l, l]))); }],
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
// plano (PROMPT-128): o que o plano cartesiano pequeno da pergunta mostra (js/jogo-revisao/plano.js). Formatos:
//   { ponto, mostra: 'eixo_x' | 'eixo_y' | 'eixos' | 'quadrantes' } · { partida, mov: [[dx, dy, casas]], mostra: 'caminho' }
//   { partida, chegada, mostra: 'caminho' } · { opcoes: true, mostra: 'resposta' } · { mostra: 'resposta' | 'origem' }
const PL = (x, plano) => ({ ...x, plano });
const movDe = (dx, dy) => [dx ? [Math.sign(dx), 0, Math.abs(dx)] : null, dy ? [0, Math.sign(dy), Math.abs(dy)] : null].filter(Boolean);
const XY = X('No ponto (x, y), o primeiro número é o x (anda para os lados) e o segundo é o y (anda para cima ou para baixo).');
const xy = (x, y, q) => X(`No ponto (x, y), o x vem primeiro e o y depois. Em ${ponto(x, y)}: ${q} = ${num(q === 'x' ? x : y)}`);
const coord = (neg = false) => () => { const x = int(neg ? -6 : 0, 9), y = int(neg ? -6 : 0, 9); const qual = coin() ? 'x' : 'y'; const v = qual === 'x' ? x : y; const o = qual === 'x' ? y : x; return Q(`No ponto ${ponto(x, y)}, qual é o valor de ${qual}?`, num(v), erradasTexto(num(v), [num(o), num(-v), num(v + 1), num(v - 1), num(v + 2), num(v - 2)].filter(s => s !== num(v))), PL(xy(x, y, qual), { ponto: [x, y], mostra: 'eixo_' + qual })); };
const coordX = () => { const x = int(0, 9), y = int(0, 9); return Q(`No ponto ${ponto(x, y)}, qual é o valor de x?`, num(x), erradasTexto(num(x), [num(y), num(x + 1), num(x + y), num(x + 2), num(y + 1), num(x + 3), num(x + 4)]), PL(xy(x, y, 'x'), { ponto: [x, y], mostra: 'eixo_x' })); };
const coordY = () => { const x = int(0, 9), y = int(0, 9); return Q(`No ponto ${ponto(x, y)}, qual é o valor de y?`, num(y), erradasTexto(num(y), [num(x), num(y + 1), num(x + y), num(y + 2), num(x + 1), num(y + 3), num(y + 4)]), PL(xy(x, y, 'y'), { ponto: [x, y], mostra: 'eixo_y' })); };
const EIXOS = [
  () => Q('Qual ponto é a origem?', '(0, 0)', ['(1, 1)', '(0, 1)', '(1, 0)'], PL(X('A origem é onde os eixos se cruzam: (0, 0).'), { mostra: 'origem' })),
  () => { const v = pick([-6, -4, -2, 2, 3, 5, 7]); return Q(`O ponto ${ponto(v, 0)} fica sobre qual eixo?`, 'Eixo x', ['Eixo y'], PL(X('Se o y é 0, o ponto não sobe nem desce: fica em cima do eixo x.'), { ponto: [v, 0], mostra: 'eixos' })); },
  () => { const v = pick([-5, -3, -2, 2, 3, 4, 6]); return Q(`O ponto ${ponto(0, v)} fica sobre qual eixo?`, 'Eixo y', ['Eixo x'], PL(X('Se o x é 0, o ponto não vai para os lados: fica em cima do eixo y.'), { ponto: [0, v], mostra: 'eixos' })); },
];
const eixo = () => pick(EIXOS)();
const qualPonto = () => { let a = int(1, 8), b = int(1, 8); if (a === b) b = a + 1; return Q(`Qual ponto tem x = ${a} e y = ${b}?`, ponto(a, b), [ponto(b, a)], PL(XY, { mostra: 'resposta' })); };
const maisLado = () => { const dir = coin(); let p = [int(0, 8), int(0, 8)], q = [int(0, 8), int(0, 8)]; const i = dir ? 0 : 1; if (p[i] === q[i]) q[i] = p[i] + 2; const r = p[i] > q[i] ? p : q, w = r === p ? q : p; return Q(`Qual ponto fica mais ${dir ? 'à direita' : 'acima'}?`, ponto(...r), [ponto(...w)], PL(X(dir ? `Mais à direita = maior x: ${r[0]} > ${w[0]}` : `Mais acima = maior y: ${r[1]} > ${w[1]}`), { opcoes: true, mostra: 'resposta' })); };
const QUADS = { '1º quadrante': [1, 1], '2º quadrante': [-1, 1], '3º quadrante': [-1, -1], '4º quadrante': [1, -1] };
const quadrante = () => { const [nome, [sx, sy]] = pick(Object.entries(QUADS)); const x = sx * int(1, 7), y = sy * int(1, 7); return Q(`Em qual quadrante fica o ponto ${ponto(x, y)}?`, nome, Object.keys(QUADS).filter(k => k !== nome), PL(X('1º (+, +) em cima à direita; 2º (−, +) em cima à esquerda; 3º (−, −) embaixo à esquerda; 4º (+, −) embaixo à direita.'), { ponto: [x, y], mostra: 'quadrantes' })); };
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
      const sx = (a, d) => d === 0 ? `fica ${num(a)}` : `${num(a)} ${d < 0 ? '−' : '+'} ${Math.abs(d)} = ${num(a + d)}`;
      return Q(`${de}, ando ${dirTxt(dx, dy)}. Onde paro?`, ponto(x, y), erradasPonto(x, y), PL(X(`Direita soma no x, esquerda subtrai; cima soma no y, baixo subtrai. x: ${sx(x0, dx)}; y: ${sx(y0, dy)}`), { partida: [x0, y0], mov: movDe(dx, dy), mostra: 'caminho' }));
    }
  };
}
function caminho() {
  for (; ;) {
    const x0 = int(-2, 4), y0 = int(-2, 4), dx = int(-4, 5), dy = int(-4, 5);
    if (dx === 0 && dy === 0) continue;
    const r = dirTxt(dx, dy), e1 = dirTxt(dy || dx, dx || dy), e2 = dirTxt(-dx, -dy);
    const err = erradasTexto(r, [e2, e1, dirTxt(dx + (dx >= 0 ? 1 : -1), dy), dirTxt(-dx, dy), dirTxt(dx, -dy), dirTxt(dx, dy + (dy >= 0 ? 1 : -1))]);
    return Q(`Para ir de ${ponto(x0, y0)} até ${ponto(x0 + dx, y0 + dy)}, ando:`, r, err, PL(X(`Compare os x (${num(x0)} → ${num(x0 + dx)}) e os y (${num(y0)} → ${num(y0 + dy)}): ${r}`), { partida: [x0, y0], chegada: [x0 + dx, y0 + dy], mostra: 'caminho' }));
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
const eFinal = l => (l.length === 2 ? l.join(' e ') : fmtL(l.slice(0, -1)) + ' e ' + l[l.length - 1]);
const somaL = l => l.reduce((a, b) => a + b, 0);
const medianaDe = l => { const s = [...l].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
function media(n, mPar = false) {
  return () => {
    for (; ;) { const l = lista(n, 1, 12); const s = l.reduce((a, b) => a + b, 0); if (!mPar && s % n) continue; if (mPar && (s * 2) % n) continue; const v = s / n; return Q(`Qual é a média de ${n === 2 ? l.join(' e ') : fmtL(l.slice(0, -1)) + ' e ' + l[l.length - 1]}?`, num(v), erradasNum(v, [s, Math.max(...l), v + 1, (Math.max(...l) + Math.min(...l)) / 2 === v ? v - 1 : (Math.max(...l) + Math.min(...l)) / 2], { inteiro: false }), X(`Some tudo e divida pela quantidade: ${l.join(' + ')} = ${s}; ${s} ÷ ${n} = ${num(v)}`)); }
  };
}
// média de 4 números com resultado ",5"
function mediaMeio() {
  for (; ;) {
    const l = lista(4, 1, 12), s = somaL(l); if (s % 4 !== 2) continue;
    const v = s / 4, mm = (Math.max(...l) + Math.min(...l)) / 2;
    return Q(`Qual é a média de ${eFinal(l)}?`, num(v), erradasNum(v, [Math.floor(v), Math.ceil(v), s, mm !== v ? mm : v + 1, v + 1], { inteiro: false }),
      X(`Some tudo e divida pela quantidade: ${l.join(' + ')} = ${s}; ${s} ÷ 4 = ${num(v)}`));
  }
}
// problema: idades (5 números, média inteira)
const CTX_MEDIA = [
  [l => `As idades de 5 amigos são ${eFinal(l)} anos. Qual é a média de idade?`, [11, 15], ' anos'],
  [l => `Num jogo, um time fez ${eFinal(l)} pontos em 5 partidas. Qual a média de pontos por partida?`, [4, 20], ' pontos'],
  [l => `Em 5 dias, choveu ${eFinal(l)} milímetros. Qual foi a média por dia?`, [2, 16], ' mm'],
];
function mediaProblema() {
  const [txt, [a, b]] = pick(CTX_MEDIA);
  for (; ;) {
    const l = lista(5, a, b), s = somaL(l); if (s % 5) continue;
    const v = s / 5; if (l.every(x => x === v)) continue;
    return Q(txt(l), num(v), erradasNum(v, [s, medianaDe(l) !== v ? medianaDe(l) : v + 2, Math.max(...l), v + 1, v - 1]),
      X(`Some tudo e divida por 5: ${l.join(' + ')} = ${s}; ${s} ÷ 5 = ${num(v)}`));
  }
}
const SEM_MODA = 'não tem moda';
function moda() { for (; ;) { const m = int(1, 9), outros = sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(x => x !== m), int(2, 3)); const l = shuffle([m, m, ...(coin() ? [m] : []), ...outros]); const v = m; return Q(`Qual é a moda de ${fmtL(l)}?`, num(v), erradasTexto(num(v), [...shuffle([...outros.map(num), SEM_MODA]), num(l.filter(z => z === m).length), num(l.length), num(m + 1), num(m + 2), num(m + 3), num(Math.max(...l) + 1)]), X(`Moda é o valor que mais aparece: o ${m} aparece ${l.filter(z => z === m).length} vezes.`)); } }
// dois valores empatados: a moda são os dois ("5 e 7")
function modaDupla() {
  const [a, b] = sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 2).sort((x, y) => x - y);
  const outros = sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(x => x !== a && x !== b), int(2, 3));
  const l = shuffle([a, a, b, b, ...outros]);
  return Q(`Qual é a moda de ${fmtL(l)}?`, `${a} e ${b}`, erradasTexto(`${a} e ${b}`, [num(a), num(b), SEM_MODA, `${a} e ${outros[0]}`]),
    X(`O ${a} e o ${b} aparecem 2 vezes cada (os outros, 1 vez). Os dois empatam: a moda é ${a} e ${b}.`));
}
// às vezes ninguém se repete: "não tem moda" é a certa
function semModa() {
  const l = sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], int(5, 6));
  return Q(`Qual é a moda de ${fmtL(l)}?`, SEM_MODA, erradasTexto(SEM_MODA, [...shuffle(l).slice(0, 2).map(num), num(Math.round(somaL(l) / l.length) + 20), num(l.length)]),
    X('Nenhum valor se repete: todos aparecem 1 vez só. Então não tem moda.'));
}
const modaVaria = () => (coin() ? semModa() : modaDupla());
function mediana(n = 3, embaralha = false) {
  return () => {
    for (; ;) { const l = sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20], n).sort((a, b) => a - b); const v = l[(n - 1) / 2]; const mostra = embaralha ? shuffle(l) : l; if (embaralha && mostra[(n - 1) / 2] === v) continue; const med = l.reduce((a, b) => a + b, 0) / n; return Q(`Qual é a mediana de ${fmtL(mostra)}?${embaralha ? ' (organize antes)' : ''}`, num(v), erradasTexto(num(v), [num(mostra[(n - 1) / 2]), ehInteiro(med) ? num(med) : num(l[0]), num(l[0]), num(l[n - 1]), num(Math.round(med)), num(v + 1), num(v - 1), num(v + 2)], 3), X(`Coloque em ordem: ${fmtL(l)}. A mediana é o do meio: ${num(v)}`)); }
  };
}
// quantidade par: a mediana é a média dos dois do meio (lista fora de ordem)
function medianaPar(n) {
  return () => {
    for (; ;) {
      const s = sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 18, 20], n).sort((a, b) => a - b);
      const a = s[n / 2 - 1], b = s[n / 2], v = (a + b) / 2, mostra = shuffle(s);
      if (mostra.join() === s.join()) continue;
      const media_ = somaL(s) / n, meioSemOrdem = (mostra[n / 2 - 1] + mostra[n / 2]) / 2;
      return Q(`Qual é a mediana de ${fmtL(mostra)}?`, num(v), erradasTexto(num(v), [num(a), num(b), meioSemOrdem !== v ? num(meioSemOrdem) : '', media_ !== v ? num(media_) : '', num(a + b), num(v + 1)]),
        X(`Coloque em ordem: ${fmtL(s)}. São ${n} números: o meio fica entre o ${a} e o ${b}. Mediana = (${a} + ${b}) ÷ 2 = ${a + b} ÷ 2 = ${num(v)}`));
    }
  };
}
function notaFalta() { const m = int(6, 8), a = int(4, 9), b = int(4, 9); const c = 3 * m - a - b; if (c < 0 || c > 10) return notaFalta(); return Q(`A média de 3 provas foi ${m}. Duas notas foram ${a} e ${b}. Qual foi a terceira?`, num(c), erradasNum(c, [3 * m, m, (a + b) / 2, c + 1], { inteiro: true }), X(`Média ${m} em 3 provas: a soma é 3 × ${m} = ${3 * m}. Falta ${3 * m} − ${a} − ${b} = ${c}`)); }
const duasNotas = () => { for (; ;) { const a = int(4, 10), b = int(4, 10); if ((a + b) % 2) continue; const v = (a + b) / 2; return Q(`Tirei ${a} e ${b} em duas provas. Qual a minha média?`, num(v), erradasNum(v, [a + b, Math.max(a, b), v + 1]), X(`(${a} + ${b}) ÷ 2 = ${a + b} ÷ 2 = ${v}`)); } };
// diferença entre a média e a mediana
function comparar() {
  for (; ;) {
    const l = lista(5, 1, 15), s = somaL(l); if (s % 5) continue;
    const me = s / 5, md = medianaDe(l), v = Math.abs(me - md); if (!v) continue;
    return Q(`Qual é a diferença entre a média e a mediana de ${fmtL(l)}?`, num(v), erradasNum(v, [me, md, me + md, v + 1, v - 1]),
      X(`Média: ${l.join(' + ')} = ${s}; ${s} ÷ 5 = ${num(me)}. Mediana: em ordem ${fmtL([...l].sort((a, b) => a - b))}, o do meio é ${num(md)}. Diferença: ${num(Math.max(me, md))} − ${num(Math.min(me, md))} = ${num(v)}`));
  }
}

// --- tabelas (Ginásio B): a tabela é sorteada e todas as perguntas do personagem usam a mesma tabela.
// O total é 20, 25, 40 ou 50 (porcentagem inteira) e a média dá inteira ou ",5". Ler o maior/menor: no máximo 1, só no treinador 1.
const ESPORTES = ['Futebol', 'Vôlei', 'Basquete', 'Natação'];
const oEsporte = n => (n === 'Natação' ? 'a natação' : 'o ' + n.toLowerCase());
const TAB = {
  treinador1: { titulo: 'Vendas da barraca de frutas', colunas: ['Fruta', 'Vendas'], itens: ['Maçã', 'Banana', 'Uva', 'Laranja'], faixa: [2, 14],
    txt: { mais: 'Qual fruta vendeu mais?', menos: 'Qual fruta vendeu menos?', qto: n => `Quantas unidades de ${n.toLowerCase()} foram vendidas?`, total: 'Quantas frutas foram vendidas no total?', dif: (a, b) => `Quantas unidades de ${a.toLowerCase()} foram vendidas a mais que de ${b.toLowerCase()}?`,
      media: 'Qual foi a média de vendas por fruta?', pct: n => `Que porcentagem das vendas foi de ${n.toLowerCase()}?`, frac: n => `Que fração das frutas vendidas foi de ${n.toLowerCase()}?`,
      empate: (a, b) => `Quantas unidades de ${a.toLowerCase()} a mais precisariam ser vendidas para empatar com a ${b.toLowerCase()}?` },
    af: { mais: (a, b, k) => `Venderam ${k} ${a.toLowerCase()}${k === 1 ? '' : 's'} a mais que ${b.toLowerCase()}s`, dobro: (a, b) => `As vendas de ${a.toLowerCase()} foram o dobro das de ${b.toLowerCase()}`, juntos: (a, b, s) => `${a} e ${b.toLowerCase()} juntas venderam ${s}`, maior: a => `${a} foi a fruta mais vendida` } },
  treinador2: { titulo: 'Esporte preferido da turma', colunas: ['Esporte', 'Votos'], itens: ESPORTES, faixa: [2, 16],
    txt: { total: 'Quantos alunos votaram ao todo?', dif: (a, b) => `${a} teve quantos votos a mais que ${b.toLowerCase()}?`, media: 'Qual é a média de votos por esporte?',
      pct: n => `Que porcentagem dos votos teve ${oEsporte(n)}?`, frac: n => `Que fração dos alunos votou em ${n.toLowerCase()}?`, empate: (a, b) => `Quantos votos a mais ${oEsporte(a)} precisaria para empatar com ${oEsporte(b)}?` },
    af: { mais: (a, b, k) => `${a} teve ${k} voto${k === 1 ? '' : 's'} a mais que ${b.toLowerCase()}`, dobro: (a, b) => `${a} teve o dobro de votos de ${b.toLowerCase()}`, juntos: (a, b, s) => `${a} e ${b.toLowerCase()} juntos tiveram ${s} votos`, maior: a => `${a} foi o esporte mais votado` } },
  treinador3: { titulo: 'Gols marcados na semana', colunas: ['Dia', 'Gols'], itens: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'], faixa: [1, 9],
    txt: { total: 'Quantos gols saíram na semana?', dif: (a, b) => `Quantos gols saíram na ${a.toLowerCase()} a mais que na ${b.toLowerCase()}?`, media: 'Qual foi a média de gols por dia?',
      pct: n => `Que porcentagem dos gols da semana saiu na ${n.toLowerCase()}?`, frac: n => `Que fração dos gols da semana saiu na ${n.toLowerCase()}?`, empate: (a, b) => `Quantos gols a mais precisariam sair na ${a.toLowerCase()} para empatar com a ${b.toLowerCase()}?` },
    af: { mais: (a, b, k) => `Na ${a.toLowerCase()} saíram ${k} gol${k === 1 ? '' : 's'} a mais que na ${b.toLowerCase()}`, dobro: (a, b) => `Os gols da ${a.toLowerCase()} foram o dobro dos da ${b.toLowerCase()}`, juntos: (a, b, s) => `${a} e ${b.toLowerCase()} juntas tiveram ${s} gols`, maior: a => `${a} foi o dia com mais gols` } },
  // dupla entrada: Meninos | Meninas | Total
  lider: { titulo: 'Esporte preferido: meninos e meninas', colunas: ['Esporte', 'Meninos', 'Meninas', 'Total'], itens: ESPORTES, faixa: [1, 9], dupla: true },
};
TAB.revanche = TAB.lider;
const TOTAIS_PCT = [20, 25, 40, 50];
export function tabelaSorteada(chave) {
  const T = TAB[chave];
  for (; ;) {
    if (T.dupla) {
      const m = T.itens.map(() => int(...T.faixa)), f = T.itens.map(() => int(...T.faixa)), t = m.map((x, i) => x + f[i]);
      const mx = Math.max(...t), soma = somaL(t);
      if (t.filter(v => v === mx).length > 1 || !TOTAIS_PCT.includes(soma) || (soma * 2) % t.length) continue;
      if (m.indexOf(Math.max(...m)) === t.indexOf(mx) && coin()) continue;   // de preferência, o mais votado no total não é o preferido dos meninos
      return { titulo: T.titulo, colunas: T.colunas, linhas: T.itens.map((n, i) => [n, m[i], f[i], t[i]]), _T: T, m, f, t };
    }
    const vals = T.itens.map(() => int(...T.faixa));
    const mx = Math.max(...vals), mn = Math.min(...vals);
    if (vals.filter(v => v === mx).length > 1 || vals.filter(v => v === mn).length > 1) continue;       // maior e menor únicos
    const soma = somaL(vals);
    if (!TOTAIS_PCT.includes(soma) || (soma * 2) % vals.length) continue;                              // % inteira; média inteira ou ,5
    return { titulo: T.titulo, colunas: T.colunas, linhas: T.itens.map((n, i) => [n, vals[i]]), _T: T };
  }
}
const pctTxt = v => `${num(v)}%`;
// Porcentagem / fração / empate / média / afirmação: as perguntas que usam a tabela (it: nomes, vs: valores, txt e af: frases)
function perguntasComuns(it, vs, txt, af) {
  const soma = somaL(vs), n = vs.length;
  const comInteira = vs.map((v, i) => i).filter(i => vs[i] > 0 && Number.isInteger(vs[i] * 100 / soma));
  const qs = {
    pct: () => {
      if (!comInteira.length) return null;
      const i = pick(comInteira), v = vs[i], p = v * 100 / soma;
      return Q(txt.pct(it[i]), pctTxt(p), erradasNum(p, [v, v / 100, 100 - p, p * 2, p + 5, p - 5], { fmt: pctTxt, inteiro: false }),
        X(`O total é ${vs.join(' + ')} = ${soma}. ${it[i]}: ${v} de ${soma} = ${v} ÷ ${soma} = ${num(v / soma)}. Vezes 100: ${num(p)}%`));
    },
    frac: () => {
      const i = pick(vs.map((v, k) => k).filter(k => vs[k] > 0)), v = vs[i], [a, b] = simpl(v, soma);
      return Q(txt.frac(it[i]), frac(a, b), erradasFrac(a, b, [[v, soma - v], [soma - v, soma], [b, a], [1, v], [a, b + 1], [v, 100]]),
        X(`Parte sobre o total: ${v}/${soma}${a !== v ? `. Simplificando (÷ ${v / a}): ${frac(a, b)}` : ''}`));
    },
    empate: () => {
      const [i, j] = sample(vs.map((v, k) => k), 2).sort((x, y) => vs[x] - vs[y]); if (vs[i] === vs[j]) return null;
      const v = vs[j] - vs[i];
      return Q(txt.empate(it[i], it[j]), num(v), erradasNum(v, [vs[j], vs[i] + vs[j], v + 1, v - 1]), X(`Para empatar, falta a diferença: ${vs[j]} − ${vs[i]} = ${v}`));
    },
    media: () => {
      const v = soma / n;
      return Q(txt.media, num(v), erradasNum(v, [soma, Math.floor(v) === v ? v + 1 : Math.floor(v), Math.ceil(v) === v ? v - 1 : Math.ceil(v), medianaDe(vs) !== v ? medianaDe(vs) : v + 2], { inteiro: false }),
        X(`Some tudo e divida pela quantidade: ${vs.join(' + ')} = ${soma}; ${soma} ÷ ${n} = ${num(v)}`));
    },
    afirmacao: () => {
      const verdade = [], mentira = [], iMax = vs.indexOf(Math.max(...vs));
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const d = vs[i] - vs[j];
        if (d > 0) { verdade.push(af.mais(it[i], it[j], d)); for (const k of [d + 1, d + 2, d - 1]) if (k > 0 && k !== d) mentira.push(af.mais(it[i], it[j], k)); }
        if (vs[j] > 0) (vs[i] === 2 * vs[j] ? verdade : mentira).push(af.dobro(it[i], it[j]));
        if (i < j) { verdade.push(af.juntos(it[i], it[j], vs[i] + vs[j])); mentira.push(af.juntos(it[i], it[j], vs[i] + vs[j] + pick([1, 2, -1, -2]))); }
      }
      verdade.push(af.maior(it[iMax]));
      for (let i = 0; i < n; i++) if (i !== iMax) mentira.push(af.maior(it[i]));
      const certa = pick(verdade), erradas = sample([...new Set(mentira)], 3);
      return Q('Qual afirmação é verdadeira?', certa, erradas, X(`Confira cada frase com os números da tabela: ${it.map((x, k) => `${x} ${vs[k]}`).join(', ')}. Só "${certa}" bate com a tabela.`), { longa: true });
    },
  };
  return qs;
}
export function perguntasTabela(chave, n) {
  const tab = tabelaSorteada(chave); const T = tab._T; const it = tab.linhas.map(l => l[0]);
  const tabela = { titulo: tab.titulo, colunas: tab.colunas, linhas: tab.linhas };
  let tipos;
  if (T.dupla) {
    const { m, f, t } = tab, soma = somaL(t), sm = somaL(m), sf = somaL(f), iMax = t.indexOf(Math.max(...t));
    const C = perguntasComuns(it, t, {
      pct: x => `Que porcentagem de todos os votos teve ${oEsporte(x)} (meninos e meninas)?`, frac: x => `Que fração de todos os alunos votou em ${x.toLowerCase()}?`,
      media: 'Qual é a média de votos por esporte, somando meninos e meninas?', empate: (a, b) => `Quantos votos a mais ${oEsporte(a)} precisaria para empatar com ${oEsporte(b)}, no total?`,
    }, TAB.treinador2.af);
    const meninas = () => { const i = int(0, it.length - 1), v = f[i]; return Q(`Quantas meninas escolheram ${x(it[i])}?`, num(v), erradasNum(v, [m[i], t[i], v + 1, v - 1]), X(`Linha "${it[i]}", coluna "Meninas": ${v}.`)); };
    const x = s => s.toLowerCase();
    const maisSomando = () => Q('Qual esporte foi o mais votado somando meninos e meninas?', it[iMax], sample(it.filter((_, k) => k !== iMax), 3), X(`Some cada linha (coluna Total): ${it.map((y, k) => `${y} ${m[k]} + ${f[k]} = ${t[k]}`).join('; ')}. O maior é ${it[iMax]}.`));
    const meninos = () => Q('Quantos meninos votaram ao todo?', num(sm), erradasNum(sm, [sf, soma, sm + 1, sm - 1]), X(`Some a coluna "Meninos": ${m.join(' + ')} = ${sm}`));
    const meninasTodo = () => Q('Quantas meninas votaram ao todo?', num(sf), erradasNum(sf, [sm, soma, sf + 1, sf - 1]), X(`Some a coluna "Meninas": ${f.join(' + ')} = ${sf}`));
    const difSexo = () => { const i = pick(it.map((_, k) => k).filter(k => m[k] !== f[k])); if (i == null) return null; const [a, b, qa, qb] = m[i] > f[i] ? ['meninos', 'meninas', m[i], f[i]] : ['meninas', 'meninos', f[i], m[i]]; const v = qa - qb;
      return Q(`No ${x(it[i])}, quantos votos de ${a} a mais que de ${b}?`.replace('No natação', 'Na natação'), num(v), erradasNum(v, [qa + qb, qa, v + 1]), X(`Linha "${it[i]}": ${a} ${qa}, ${b} ${qb}. "A mais" é subtração: ${qa} − ${qb} = ${v}`)); };
    tipos = chave === 'revanche' ? [maisSomando, C.pct, C.media, difSexo, meninasTodo] : [meninas, maisSomando, meninos, C.pct, C.frac, difSexo, C.media];
  } else {
    const vs = tab.linhas.map(l => l[1]), soma = somaL(vs);
    const iMax = vs.indexOf(Math.max(...vs)), iMin = vs.indexOf(Math.min(...vs));
    const outros = i => it.filter((_, j) => j !== i);
    const C = perguntasComuns(it, vs, T.txt, T.af);
    const total = () => Q(T.txt.total, num(soma), erradasNum(soma, [soma + 1, soma - 1, soma + vs[0], Math.max(...vs) * it.length]), X(`Some todos: ${vs.join(' + ')} = ${soma}`));
    const dif = () => { const v = vs[iMax] - vs[iMin]; return Q(T.txt.dif(it[iMax], it[iMin]), num(v), erradasNum(v, [vs[iMax] + vs[iMin], vs[iMax], v + 1]), X(`"A mais" é subtração: ${vs[iMax]} − ${vs[iMin]} = ${v}`)); };
    tipos = [total, dif, C.pct, C.frac, C.empate, C.media, C.afirmacao];
    if (chave === 'treinador1') {   // só aqui: UMA pergunta de ler (o maior, o menor ou um valor)
      const ler = pick([
        () => Q(T.txt.mais, it[iMax], sample(outros(iMax), 3), X(`Procure o maior número da tabela: ${vs[iMax]} (${it[iMax]}).`)),
        () => Q(T.txt.menos, it[iMin], sample(outros(iMin), 3), X(`Procure o menor número da tabela: ${vs[iMin]} (${it[iMin]}).`)),
        () => { const i = int(0, it.length - 1); return Q(T.txt.qto(it[i]), num(vs[i]), erradasTexto(num(vs[i]), shuffle(vs.filter(v => v !== vs[i])).map(num).concat([num(vs[i] + 1), num(vs[i] + 2), num(Math.max(1, vs[i] - 1)), num(vs[i] + 3)])), X(`Ache a linha "${it[i]}" e leia o número ao lado: ${vs[i]}.`)); },
      ]);
      tipos = [ler, ...shuffle(tipos)];
    }
  }
  const out = [];
  for (const f of chave === 'treinador1' ? tipos : shuffle(tipos)) { if (out.length >= n) break; const q = f(); if (q && q.erradas.length >= 3) out.push({ ...q, tabela }); }
  return shuffle(out);
}
const M13 = {
  A: {
    treinador1: [media(3), mediaMeio, mediaProblema, media(5), mediaMeio],
    treinador2: [moda, modaDupla, modaVaria, modaDupla, modaVaria],
    treinador3: [mediana(5, true), medianaPar(4), mediana(7, true), medianaPar(6), notaFalta],
    lider: [mediaMeio, modaDupla, medianaPar(6), notaFalta, comparar],
    revanche: [medianaPar(6), notaFalta, comparar],
  },
  B: 'tabelas',
};

export const MAPAS_9_13 = { 9: M9, 10: M10, 11: M11, 12: M12, 13: M13 };

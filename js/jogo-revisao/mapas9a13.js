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
// PROMPT-209: o enunciado termina com a pergunta. Frase entre aspas: "Qual equação representa …?"; situação: "… Qual é a equação?" (balança: "… Qual equação representa a balança?")
const comPergunta = (e) => (e.startsWith('"') ? `Qual equação representa "${e[1].toLowerCase()}${e.slice(2)}?` : `${e} ${/balança/.test(e) ? 'Qual equação representa a balança?' : 'Qual é a equação?'}`);
const deLista = lista => () => { const k = int(2, 6), t = int(3, 20); const [e, r, x] = pick(lista)(k, t); return Q(comPergunta(e), r, x, EQX); };
const eqRev = [
  () => { const k = int(1, 5), t = 2 * int(2, 8) + k; return Q(comPergunta(`"O dobro de um número mais ${k} é igual a ${t}"`), `2x + ${k} = ${t}`, [`2(x + ${k}) = ${t}`, `x + 2 + ${k} = ${t}`, `2x − ${k} = ${t}`], X(`O dobro do número é 2x; depois soma ${k}: 2x + ${k} = ${t}`)); },
  () => { const k = int(2, 4), x = int(8, 14), t = x + k * x; return Q(`Ana tem x anos e o pai tem o ${['', '', 'dobro', 'triplo', 'quádruplo'][k]} da idade dela. Juntos somam ${t} anos. Qual é a equação?`, `x + ${k}x = ${t}`, [`${k}x = ${t}`, `x + ${k} = ${t}`, `${k}x − x = ${t}`], X(`Ana: x. Pai: ${k}x. Juntos: x + ${k}x = ${t}`)); },
  () => { const k = int(2, 3), b = int(1, 5), t = k * int(1, 5) + b; return Q(`Numa balança, ${k} caixas de peso x e mais ${b} kg equilibram ${t} kg. Qual equação representa a balança?`, `${k}x + ${b} = ${t}`, [`x + ${b} = ${t}`, `${k}x = ${t} + ${b}`, `${k} + x + ${b} = ${t}`], X(`${k} caixas pesam ${k}x; mais ${b} kg: ${k}x + ${b} = ${t}`)); },
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
// PROMPT-218: treinador 1 só sobre direta/inversa e as setas (antes de qualquer conta)
// setas: a seta do x já está para baixo; para onde aponta a outra? (figura setas_r3: a tabela com "?" no lugar da seta)
const SIT_SETAS = [
  { cab: ['canetas', 'preço (R$)'], de: 'das canetas', mais: 'Mais canetas, preço maior.', menos: 'Menos canetas, preço menor.', inversa: false, n: () => { const a = int(2, 5), u = int(2, 6); return [a, a * u, a * int(2, 3)]; } },
  { cab: ['pães', 'preço (R$)'], de: 'dos pães', mais: 'Mais pães, preço maior.', menos: 'Menos pães, preço menor.', inversa: false, n: () => { const a = int(2, 5), u = int(2, 4); return [a, a * u, a * int(2, 3)]; } },
  { cab: ['horas', 'km'], de: 'das horas', mais: 'Mais horas, mais km.', menos: 'Menos horas, menos km.', inversa: false, n: () => { const a = int(2, 3), k = 10 * int(5, 8); return [a, a * k, a + int(1, 3)]; } },
  { cab: ['pedreiros', 'dias'], de: 'dos pedreiros', mais: 'Mais pedreiros, menos dias.', menos: 'Menos pedreiros, mais dias.', inversa: true, n: () => { const a = 2, d = 2 * int(3, 8); return [a, d, 4]; } },
  { cab: ['torneiras', 'horas'], de: 'das torneiras', mais: 'Mais torneiras, menos tempo.', menos: 'Menos torneiras, mais tempo.', inversa: true, n: () => { const a = 2, d = 2 * int(3, 6); return [a, d, 4]; } },
  { cab: ['km/h', 'horas'], de: 'da velocidade', mais: 'Mais velocidade, menos tempo.', menos: 'Menos velocidade, mais tempo.', inversa: true, n: () => { const v = 10 * int(4, 6); return [v, 2 * int(2, 4), 2 * v]; } },
];
function setas() {
  const S = pick(SIT_SETAS), [a, b, c] = S.n(), menos = coin();
  const [a1, a2] = menos ? [c, a] : [a, c];   // "menos": a 1ª coluna diminui (e o número ao lado acompanha: direta × c/a, inversa × a/c)
  const b1 = menos ? (S.inversa ? b * a / c : b / a * c) : b;
  const cima = S.inversa, r = cima ? 'para cima' : 'para baixo';
  return Q(`Na tabela, a seta do x aponta para baixo. ${menos ? S.menos : S.mais} A seta ${S.de} aponta:`, r, [cima ? 'para baixo' : 'para cima'],
    { ...X(S.inversa ? 'Uma aumenta e a outra diminui: inversa, a seta vai na direção contrária da do x (para cima).' : `As duas ${menos ? 'diminuem' : 'aumentam'}: andam juntas, é direta. A seta vai na mesma direção da do x (para baixo).`),
      figura: { tipo: 'setas_r3', cab: S.cab, lin: [[a1, b1], [a2, 'x']], inversa: S.inversa } });
}
const DOBRA = [['Se o número de pães dobra, o preço:', 'dobra'], ['Se os pedreiros dobram, os dias da obra:', 'cai pela metade'], ['Se a velocidade dobra, o tempo de viagem:', 'cai pela metade'], ['Se os ingredientes dobram, os bolos:', 'dobra']];
const dobra = () => { const [e, r] = pick(DOBRA); return Q(e, r, ['dobra', 'cai pela metade', 'fica igual', 'triplica'].filter((x) => x !== r), X('Direta: dobra junto. Inversa: cai pela metade.')); };
const DIMINUI = ['Menos cadernos, menos dinheiro gasto.', 'Menos horas trabalhadas, menor salário.', 'Menos gasolina, menos km rodados.', 'Menos ovos, menos bolos.'];
const diminui = () => Q(`${pick(DIMINUI)} São grandezas:`, 'Diretas', ['Inversas'], X('As duas diminuem: andam juntas, é direta. Inversa é quando uma aumenta e a outra diminui.'));
function proporcao() { const [s, p] = pick(ITENS), q1 = int(2, 5), u = int(2, 8), k = int(2, 3), q2 = q1 * k; const T1 = q1 * u, v = q2 * u; return Q(`${q1} ${p} custam R$ ${T1}. Quanto custam ${q2} ${p}?`, reais(v), erradasNum(v, [T1 + q2, T1 * q2, v + u], { fmt: reais }), X(`Preço de 1: ${T1} ÷ ${q1} = ${u}. Então ${q2} × ${u} = ${v}`)); }
function inversa() { const p = int(1, 3), k = 2, d = 2 * int(2, 6) * p; const v = d / k; return Q(`${p} ${p === 1 ? 'pessoa pinta' : 'pessoas pintam'} um muro em ${d} dias. Em quantos dias ${p * k} pessoas pintam?`, `${num(v)} dias`, erradasNum(v, [d * k, d + k, d - k], { fmt: x => `${num(x)} dias` }), X(`Mais pessoas, menos dias (inversa): o dobro de pessoas leva a metade do tempo. ${d} ÷ 2 = ${num(v)} dias`)); }
function suco() { const l = int(1, 3), c = 4 * l, l2 = l * int(2, 3), v = c / l * l2; return Q(`${l} ${l === 1 ? 'litro' : 'litros'} de suco ${l === 1 ? 'enche' : 'enchem'} ${c} copos. Quantos copos ${l2} litros enchem?`, `${v} copos`, erradasNum(v, [c + l2, v + c, c * l2 / 2 === v ? v + 2 : c * l2 / 2], { fmt: x => `${num(x)} copos` }), X(`1 litro enche ${c / l} copos. ${l2} × ${c / l} = ${v} copos`)); }
function pedreiros() { const p = 2, d = 2 * int(3, 9), p2 = 4; const v = d * p / p2; return Q(`${p} pedreiros levam ${d} dias para fazer um muro. Quantos dias levam ${p2} pedreiros?`, `${num(v)} dias`, erradasNum(v, [d * 2, d + 2, d - 2], { fmt: x => `${num(x)} dias` }), X(`O dobro de pedreiros leva a metade do tempo (inversa): ${d} ÷ 2 = ${num(v)} dias`)); }
function carne() { const k = int(3, 6), u = int(5, 9), k2 = k + int(2, 4); const v = u * k2; return Q(`${k} kg de carne custam R$ ${k * u}. Quanto custam ${k2} kg?`, reais(v), erradasNum(v, [k * u + k2, k * u * k2 / 10, v + u], { fmt: reais, inteiro: true }), X(`1 kg: ${k * u} ÷ ${k} = ${u}. Então ${k2} × ${u} = ${v}`)); }
function composta() { const m = 2, p = 50 * int(1, 3), h = 2, m2 = 4, h2 = 3; const v = p / (m * h) * m2 * h2; return Q(`${m} máquinas fazem ${p} peças em ${h} horas. Quantas peças ${m2} máquinas fazem em ${h2} horas?`, `${v} peças`, erradasNum(v, [p * 2, p * m2 * h2, p * h2, p + 100], { fmt: x => `${num(x)} peças` }), X(`1 máquina em 1 hora: ${p} ÷ ${m} ÷ ${h} = ${p / (m * h)}. Então ${p / (m * h)} × ${m2} × ${h2} = ${v} peças`)); }
// --- qual é a conta?
function contaUnit() { const [s, p] = pick(ITENS), q = int(2, 6), u = int(2, 9), T = q * u; return Q(`${q} ${p} custam R$ ${T}. Para achar o preço de 1 ${s}, faço:`, `${T} ÷ ${q}`, [`${T} × ${q}`, ...sample([`${T} + ${q}`, `${T} − ${q}`, `${q} ÷ ${T}`], 2)], X(`Monta a tabela, multiplica cruzado: ${q} · x = 1 · ${T} → x = ${T} ÷ ${q}`)); }
function contaTotal() {
  const t = int(0, 3), a = int(2, 9), b = int(2, 9);
  const e = [`1 bala custa R$ ${a}. Para achar o preço de ${b} balas, faço:`, `Uma receita usa ${a} xícaras de farinha por bolo. Para ${b} bolos, faço:`, `Um carro anda ${a * 10} km em 1 hora. Para saber quanto anda em ${b} horas, faço:`, `1 caixa tem ${a} ovos. Para saber quantos ovos há em ${b} caixas, faço:`][t];
  const A = t === 2 ? a * 10 : a;
  return Q(e, `${b} × ${A}`, [`${b} + ${A}`, `${A} ÷ ${b}`, `${A} − ${b}`], X(`Monta a tabela, multiplica cruzado: 1 · x = ${b} · ${A} → x = ${b} × ${A}`));   // PROMPT-217: a conta do cruzado
}
function contaInv() {
  const t = int(0, 2), d = 2 * int(2, 6), k = 2;
  const e = [`1 pessoa pinta um muro em ${d} dias. Para saber o tempo de ${k} pessoas, faço:`, `1 torneira enche um tanque em ${d} horas. Para saber o tempo de ${k} torneiras, faço:`, `${k} pintores levam ${d / 2} dias. Para saber o tempo de 1 pintor sozinho, faço:`][t];
  if (t === 2) return Q(e, `${d / 2} × ${k}`, [`${d / 2} ÷ ${k}`, `${d / 2} + ${k}`, `${d / 2} − ${k}`], X(`Inversa: inverte uma coluna e multiplica cruzado: 1 · x = ${k} · ${d / 2} → x = ${d / 2} × ${k}`));
  return Q(e, `${d} ÷ ${k}`, [`${d} × ${k}`, `${d} + ${k}`, `${d} − ${k}`], X(`Inversa: inverte uma coluna e multiplica cruzado: ${k} · x = 1 · ${d} → x = ${d} ÷ ${k}`));
}
const velDobra = () => Q('Se a velocidade dobra, o tempo de viagem:', 'cai pela metade', ['dobra', 'fica igual', 'triplica'], X('Velocidade e tempo são inversas: uma dobra, a outra cai pela metade.'));
function contaRev(t) {
  if (t === 0) { const q = int(3, 5), u = int(2, 6), q2 = q + int(2, 4); return Q(`${q} canetas custam R$ ${q * u}. Qual conta dá o preço de ${q2} canetas?`, `${q * u} × ${q2} ÷ ${q}`, [`${q * u} × ${q} ÷ ${q2}`, `${q * u} + ${q2}`, `${q * u} × ${q2}`], X(`Monta a tabela, multiplica cruzado: ${q} · x = ${q2} · ${q * u} → x = ${q * u} × ${q2} ÷ ${q}`)); }
  if (t === 1) { const p = 3, d = 2 * int(2, 6), p2 = 6; return Q(`${p} pedreiros fazem um muro em ${d} dias. Qual conta dá o tempo com ${p2} pedreiros?`, `${d} × ${p} ÷ ${p2}`, [`${d} × ${p2} ÷ ${p}`, `${d} + ${p}`, `${d} × ${p2}`], X(`Inversa: inverte uma coluna e multiplica cruzado: ${p2} · x = ${p} · ${d} → x = ${d} × ${p} ÷ ${p2}`)); }
  const c = int(2, 3), k = 15 * c, c2 = int(4, 7); return Q(`No mapa, ${c} cm valem ${k} km. Qual conta dá quantos km valem ${c2} cm?`, `${k} × ${c2} ÷ ${c}`, [`${k} × ${c} ÷ ${c2}`, `${k} + ${c2}`, `${k} × ${c2}`], X(`Monta a tabela, multiplica cruzado: ${c} · x = ${c2} · ${k} → x = ${k} × ${c2} ÷ ${c}`));
}
const M10 = {
  A: {
    treinador1: [grandezas, setas, dobra, diminui, setas, grandezas],   // PROMPT-218: só direta/inversa e setas
    treinador2: [unitTotal, unitTotal, velocidade, receita, totalUnit(), unitTotal],
    treinador3: [totalUnit(), totalUnit(), totalUnit(true), totalUnit(true), proporcao, totalUnit()],
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
const perQ = () => { const l = int(2, 15); const v = 4 * l; return Q(`Qual é o perímetro de um quadrado de lado ${l} cm?`, cm(v), erradasNum(v, [l * l, 2 * l, l + 4], { fmt: cm }), FG(X(`Perímetro é a soma dos 4 lados: 4 × ${l} = ${v} cm`), POL('quadrado', [l, l, l, l]))); };
const perR = () => { const a = int(3, 12), b = int(1, a - 1); const v = 2 * (a + b); return Q(`Qual é o perímetro de um retângulo de ${a} cm por ${b} cm?`, cm(v), erradasNum(v, [a * b, a + b, 2 * a + b], { fmt: cm }), FG(X(`Some os 4 lados: ${a} + ${b} + ${a} + ${b} = ${v} cm`), POL('retangulo', [a, b, a, b]))); };
const perT = () => { const a = int(3, 9), b = int(3, 9), c = int(Math.abs(a - b) + 1, a + b - 1); const v = a + b + c; return Q(`Qual é o perímetro de um triângulo de lados ${a} cm, ${b} cm e ${c} cm?`, cm(v), erradasNum(v, [a * b, v + 1, v - 1], { fmt: cm }), FG(X(`Some os 3 lados: ${a} + ${b} + ${c} = ${v} cm`), POL('triangulo', [a, b, c]))); };
const POLI = [['triângulo', 3], ['quadrado', 4], ['pentágono', 5], ['hexágono', 6], ['octógono', 8]];
const perP = () => { const [n, k] = pick(POLI.filter(p => p[1] !== 4)), l = int(1, 9); const v = k * l; return Q(`Qual é o perímetro de um ${n} com ${k} lados iguais de ${l} cm?`, cm(v), erradasNum(v, [v + l, k + l, v - l], { fmt: cm }), FG(X(`${k} lados de ${l} cm: ${k} × ${l} = ${v} cm`), POL('regular', Array(k).fill(l)))); };
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
// PROMPT-216: questões novas do 11-A (polígonos, quadriláteros, tipos de ângulo, ângulo do quadrilátero, trocar a unidade)
const NOMES_POL = [['triângulo', 3], ['quadrilátero', 4], ['pentágono', 5], ['hexágono', 6], ['heptágono', 7], ['octógono', 8], ['decágono', 10]];
const poligono = () => pick([
  () => { const [n, k] = pick(NOMES_POL.filter(p => [7, 8, 10].includes(p[1]))); return Q(`Quantos lados tem um ${n}?`, num(k), erradasNum(k, [k + 1, k - 1, k === 10 ? 12 : k + 2]), FG(X('O nome diz os lados: hepta 7, octo 8, deca 10.'), { tipo: 'contar_lados', n: k })); },
  () => { const [n, k] = pick(NOMES_POL.filter(p => p[1] >= 4)); const outros = NOMES_POL.filter(p => p[0] !== n).map(p => p[0]); return Q(`Um polígono de ${k} lados se chama:`, n, sample(outros, 3), FG(X('O nome diz os lados: tri 3, quadri 4, penta 5, hexa 6, hepta 7, octo 8, deca 10.'), { tipo: 'contar_lados', n: k })); },
])();
const QUADRI = [['quadrado', '4 lados iguais e 4 ângulos retos'], ['retângulo', 'lados opostos iguais e 4 ângulos retos'], ['losango', '4 lados iguais, sem ângulo reto'], ['trapézio', 'só 2 lados paralelos']];
const quadrilatero = () => { const [n, d] = pick(QUADRI); return Q(`Qual quadrilátero tem ${d}?`, n, ['quadrado', 'retângulo', 'losango', 'trapézio', 'paralelogramo'].filter(x => x !== n).slice(0, 3), FG(X(`${n[0].toUpperCase() + n.slice(1)}: ${d}.`), { tipo: 'quadrilatero', nome: n, info: d })); };
const TIPOS_ANG = ['agudo', 'reto', 'obtuso', 'raso'];
const tipoAngulo = () => { const t = pick(['agudo', 'agudo', 'obtuso', 'obtuso', 'reto', 'raso']); const g = t === 'agudo' ? 5 * int(2, 17) : t === 'obtuso' ? 5 * int(19, 35) : t === 'reto' ? 90 : 180;
  return Q(`Um ângulo de ${g}° é:`, t, TIPOS_ANG.filter(x => x !== t), FG(X('Agudo: menor que 90°. Reto: 90°. Obtuso: entre 90° e 180°. Raso: 180°.'), { tipo: 'tipo_angulo', g })); };
const angQuad = () => { for (; ;) { const a = 5 * int(14, 26), b = 5 * int(14, 26), c = 5 * int(14, 26), v = 360 - a - b - c; if (v < 40 || v > 140) continue;
  return Q(`Um quadrilátero tem ângulos de ${a}°, ${b}° e ${c}°. Quanto mede o quarto?`, `${v}°`, erradasNum(v, [v + 20, v + 10, v - 10], { fmt: x => `${x}°` }), FG(X(`Os 4 ângulos do quadrilátero somam 360°: 360 − ${a} − ${b} − ${c} = ${v}°`), { tipo: 'angulos4', angulos: ['?', a, b, c], revela: v, conta: `360° − ${a + b + c}° = ${v}°` })); } };
const trocaUnid = () => { const k = int(2, 9); return pick([
  () => Q(`${k} m são quantos cm?`, `${k * 100} cm`, erradasNum(k * 100, [k * 10, k * 1000, k], { fmt: cm }), FG(X(`1 m = 100 cm. ${k} × 100 = ${k * 100} cm`), { tipo: 'regua', texto: `${k} m = ${k * 100} cm`, de: `${k} m`, para: `${k * 100} cm`, metros: k })),
  () => Q(`${k} cm são quantos mm?`, `${k * 10} mm`, erradasNum(k * 10, [k * 100, k, k * 1000], { fmt: x => `${num(x)} mm` }), FG(X(`1 cm = 10 mm. ${k} × 10 = ${k * 10} mm`), { tipo: 'regua', texto: `${k} cm = ${k * 10} mm`, de: `${k} cm`, para: `${k * 10} mm`, partes: k * 10 })),
  () => Q(`${k} km são quantos m?`, `${k * 1000} m`, erradasNum(k * 1000, [k * 100, k * 10, k * 10000], { fmt: m_ }), FG(X(`1 km = 1000 m. ${k} × 1000 = ${k * 1000} m`), { tipo: 'regua', texto: `${k} km = ${k * 1000} m`, de: `${k} km`, para: `${k * 1000} m`, partes: 10 })),
  () => Q(`${k * 100} cm são quantos m?`, m_(k), erradasNum(k, [k * 10, k * 100, k + 1], { fmt: m_ }), FG(X(`100 cm = 1 m. ${k * 100} ÷ 100 = ${k} m`), { tipo: 'regua', texto: `${k * 100} cm = ${k} m`, de: `${k * 100} cm`, para: `${k} m`, metros: k })),
])(); };
const areaQ = () => { const l = int(2, 12); const v = l * l; return Q(`Qual é a área de um quadrado de lado ${l} cm?`, cm2(v), erradasNum(v, [4 * l, 2 * l, v + l], { fmt: cm2 }), FG(X(`Área do quadrado = lado × lado: ${l} × ${l} = ${v} cm²`), GR(l, l))); };
const areaR = () => { const a = int(2, 12), b = int(2, 9); const v = a * b; return Q(`Qual é a área de um retângulo de ${a} cm por ${b} cm?`, cm2(v), erradasNum(v, [2 * (a + b), a + b, v + a], { fmt: cm2 }), FG(X(`Área do retângulo = comprimento × largura: ${a} × ${b} = ${v} cm²`), GR(a, b))); };
const quadradinhos = () => { const r = int(2, 5), c = int(2, 6); const v = r * c; return pick([() => Q(`Uma figura é formada por ${v} quadradinhos de 1 cm². Qual a área?`, cm2(v), erradasNum(v, [v * 4, v + 4], { fmt: cm2 }), FG(X(`Cada quadradinho vale 1 cm²: ${v} quadradinhos = ${v} cm²`), GR(c, r))), () => Q(`Um piso tem ${r} fileiras com ${c} lajotas cada. Quantas lajotas ao todo?`, num(v), erradasNum(v, [r + c, 2 * (r + c), v + c]), FG(X(`${r} fileiras × ${c} lajotas = ${v}`), GR(c, r, '', { rotulo: 'lajotas' })))])(); };
const UNIDS = [() => Q('Área é medida em:', 'cm²', ['cm', 'kg', 'L'], FG(X('Área é o espaço de dentro (quadradinhos): cm². Perímetro é o contorno: cm.'), { tipo: 'medida', o: 'area' })), () => Q('Perímetro é medido em:', 'cm', ['cm²', 'L', 'kg'], FG(X('Perímetro é o contorno: cm. Área é o espaço de dentro: cm².'), { tipo: 'medida', o: 'perimetro' }))];
const unid = () => pick(UNIDS)();
const comparaA = () => { for (; ;) { const l = int(3, 7), a = int(2, 9), b = int(2, 9); if (l * l === a * b) continue; const q = `quadrado de lado ${l} cm`, r = `retângulo de ${a} cm por ${b} cm`; return Q('Qual tem área maior?', l * l > a * b ? q : r, [l * l > a * b ? r : q], FG(X(`Quadrado: ${l} × ${l} = ${l * l} cm². Retângulo: ${a} × ${b} = ${a * b} cm².`), { tipo: 'compara_area', figuras: [{ c: l, l, nome: q }, { c: a, l: b, nome: r }], unid: 'cm' })); } };
const sala = () => { const a = int(3, 8), b = int(2, 6); const v = a * b; return Q(`Uma sala retangular tem ${a} m por ${b} m. Qual a área?`, m2(v), erradasNum(v, [2 * (a + b), a + b, v + 2], { fmt: m2 }), FG(X(`${a} × ${b} = ${v} m²`), GR(a, b, 'm'))); };
const areaT = () => { const b = 2 * int(2, 7), h = int(2, 9); const v = b * h / 2; return Q(`Qual é a área de um triângulo de base ${b} cm e altura ${h} cm?`, cm2(v), erradasNum(v, [b * h, b + h, v + h], { fmt: cm2 }), FG(X(`Área do triângulo = base × altura ÷ 2: ${b} × ${h} ÷ 2 = ${num(v)} cm²`), { tipo: 'triangulo_area', base: b, altura: h, unid: 'cm' })); };
const ladoA = () => { const l = int(3, 10); return Q(`Um quadrado tem área ${l * l} cm². Quanto mede o lado?`, cm(l), erradasNum(l, [l * l / 2, l * l / 4, l + 1], { fmt: cm }), FG(X(`Qual número vezes ele mesmo dá ${l * l}? ${l} × ${l} = ${l * l}. Lado: ${l} cm`), GR(l, l, 'cm', { lado_oculto: true, conta: `${l} × ${l} = ${l * l} → lado ${l} cm` }))); };
const areaP = () => { const b = int(4, 12), h = int(2, 8); const v = b * h; return Q(`Qual é a área de um paralelogramo de base ${b} cm e altura ${h} cm?`, cm2(v), erradasNum(v, [v / 2, 2 * (b + h), b + h], { fmt: cm2 }), FG(X(`Área do paralelogramo = base × altura: ${b} × ${h} = ${v} cm²`), { tipo: 'paralelogramo', base: b, altura: h, unid: 'cm' })); };
const metade = () => { const a = 2 * int(3, 8), b = int(4, 10); const v = a * b / 2; return Q(`Um terreno de ${a} m por ${b} m tem grama em metade dele. Qual a área com grama?`, m2(v), erradasNum(v, [a * b, a + b, (a + b)], { fmt: m2 }), FG(X(`Área total: ${a} × ${b} = ${a * b}. Metade: ${a * b} ÷ 2 = ${v} m²`), GR(a, b, 'm', { metade: true }))); };
const M11 = {
  A: {
    treinador1: [perQ, perQ, perR, perR, perQ],
    treinador2: [perT, perP, perP, perP, perT],
    treinador3: [fato, poligono, quadrilatero, tipoAngulo, trocaUnid, fato],   // PROMPT-216
    lider: [cerca, ladoDoQ, cmM, () => { const l = 10 * int(1, 5); return Q(`Dei uma volta numa quadra quadrada de lado ${l} m. Quanto andei?`, m_(4 * l), erradasNum(4 * l, [l * l, 2 * l, l + 4], { fmt: m_ }), FG(X(`Uma volta é o perímetro: 4 × ${l} = ${4 * l} m`), POL('quadrado', [l, l, l, l], 'm'))); }, perR],
    revanche: [angulo, ladoR, () => { const l = arred(int(1, 4) + 0.5); const v = 4 * l; return Q(`Qual é o perímetro de um quadrado de lado ${num(l)} cm?`, cm(v), erradasNum(v, [l * l, 2 * l, v + 1], { fmt: cm, inteiro: false }), FG(X(`4 × ${num(l)} = ${num(v)} cm`), POL('quadrado', [l, l, l, l]))); }, angQuad],   // PROMPT-216: + angQuad
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
// PROMPT-208: a lousa do cartão do erro confere cada frase da "Qual afirmação é verdadeira?" com os números da tabela
//   → { cels: [[linha, coluna], …], conta, ok } ou null (frase que não saiu destes modelos)
export function conferirAfirmacao(tabela, frase) {
  const T = Object.values(TAB).find(x => x.titulo === tabela?.titulo);
  if (!T) return null;
  const af = T.af || TAB.treinador2.af, j = T.dupla ? 3 : 1;
  const it = tabela.linhas.map(l => l[0]), vs = tabela.linhas.map(l => Number(l[j])), iMax = vs.indexOf(Math.max(...vs));
  for (let a = 0; a < it.length; a++) {
    if (af.maior(it[a]) === frase) return a === iMax ? { cels: [[a, j]], conta: `${vs[a]} é o maior`, ok: true } : { cels: [[a, j], [iMax, j]], conta: `o maior é ${vs[iMax]} (${it[iMax]})`, ok: false };
    for (let b = 0; b < it.length; b++) {
      if (a === b) continue;
      const cels = [[a, j], [b, j]], d = vs[a] - vs[b], s = vs[a] + vs[b];
      if (af.dobro(it[a], it[b]) === frase) { const ok = vs[a] === 2 * vs[b]; return { cels, conta: ok ? `${vs[a]} = 2 × ${vs[b]}` : `${vs[a]} não é o dobro de ${vs[b]}`, ok }; }
      for (let k = 1; k <= 60; k++) {
        if (af.mais(it[a], it[b], k) === frase) return { cels, conta: d === k ? `${vs[a]} − ${vs[b]} = ${k}` : `${vs[a]} − ${vs[b]} = ${d}, não ${k}`, ok: d === k };
        if (af.juntos(it[a], it[b], k) === frase) return { cels, conta: s === k ? `${vs[a]} + ${vs[b]} = ${k}` : `${vs[a]} + ${vs[b]} = ${s}, não ${k}`, ok: s === k };
      }
    }
  }
  return null;
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
  // PROMPT-209: n pode passar do número de tipos (líder 8): dá mais voltas nos tipos, sorteando outros itens, sem repetir a mesma pergunta
  const out = [], vistos = new Set();
  const ordem = chave === 'treinador1' ? tipos : shuffle(tipos);
  for (let volta = 0; volta < 6 && out.length < n; volta++) {
    for (const f of volta ? shuffle(tipos.filter(t => !(chave === 'treinador1' && t === tipos[0]))) : ordem) {
      if (out.length >= n) break;
      let q = null;
      for (let t = 0; t < (volta ? 12 : 1); t++) { const c = f(); if (c && c.erradas.length >= 3 && !vistos.has(c.enunciado + '|' + c.resposta)) { q = c; break; } }
      if (q) { vistos.add(q.enunciado + '|' + q.resposta); out.push({ ...q, tabela }); }
    }
  }
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

// ===================== ⭐ GINÁSIO DIFÍCIL (PROMPT-230) =====================
// Faixa difícil (ver mapas1a4.js). Mapa 9: x dos dois lados, parênteses, decimais e respostas negativas; montar a equação
// com um passo a mais. Mapa 10: regra de três com decimais, inversa sem ser "o dobro" e composta.
const sx = (n) => (n < 0 ? `− ${num(-n)}` : `+ ${num(n)}`);   // "+ 5" / "− 5" depois de um termo
const kx = (k) => (k === 1 ? 'x' : `${k}x`);
function eqD(tipo) {
  return () => {
    for (;;) {
      let x, e, cand, ex;
      if (tipo === 'neg') {
        const a = int(2, 9), b = int(1, 20); x = -int(1, 15); const c = a * x + b;
        e = `${a}x + ${b} = ${num(c)}`; cand = [-x, (c + b) / a, c - b];
        ex = `Passe o ${b} subtraindo: ${a}x = ${num(c)} − ${b} = ${num(c - b)}; Divida: x = ${num(c - b)} ÷ ${a} = ${num(x)}`;
      } else if (tipo === 'dec') {
        const a = pick([2, 4, 5]), b = int(1, 9) + 0.5; x = int(1, 12); const c = arred(a * x + b);
        e = `${a}x + ${num(b)} = ${num(c)}`; cand = [(c + b) / a, c - b, x + 0.5];
        ex = `Passe o ${num(b)} subtraindo: ${a}x = ${num(c)} − ${num(b)} = ${num(c - b)}; Divida: x = ${num(c - b)} ÷ ${a} = ${x}`;
      } else if (tipo === 'frac') {
        const a = int(2, 6), b = int(2, 15); x = a * int(2, 9); const c = x / a + b;
        e = `x ÷ ${a} + ${b} = ${c}`; cand = [(c - b) / a, c * a - b, (c + b) * a];
        ex = `Passe o ${b} subtraindo: x ÷ ${a} = ${c} − ${b} = ${c - b}; O ${a} está dividindo: passa multiplicando. x = ${c - b} × ${a} = ${x}`;
      } else if (tipo === 'dois') {
        const a = int(5, 12), c = int(2, a - 1), b = int(1, 20); x = int(-9, 15); if (!x) continue;
        const d = a * x - b - c * x;
        e = `${a}x − ${b} = ${kx(c)} ${sx(d)}`; cand = [(d + b) / (a + c), d + b, -x, x + 1];
        ex = `x de um lado, números do outro: ${a}x − ${kx(c)} = ${num(d)} + ${b} → ${kx(a - c)} = ${num(d + b)} → x = ${num(d + b)} ÷ ${a - c} = ${num(x)}`;
      } else if (tipo === 'paren') {
        const a = int(2, 6), b = int(1, 9), c = int(1, 20); x = int(1, 15); const d = a * (x - b) + c;
        e = `${a}(x − ${b}) + ${c} = ${num(d)}`; cand = [(d - c) / a - b, (d - c) / a, d / a + b - c];
        ex = `Passe o ${c} subtraindo: ${a}(x − ${b}) = ${num(d - c)}; Divida por ${a}: x − ${b} = ${num((d - c) / a)}; x = ${num((d - c) / a)} + ${b} = ${x}`;
      } else {   // 'ambos': a(x + b) = c(x − d)
        const a = int(2, 4), c = a + int(1, 3), b = int(1, 6); x = int(2, 15);
        if ((a * (x + b)) % c) continue;
        const d = x - a * (x + b) / c; if (d <= 0) continue;
        e = `${a}(x + ${b}) = ${c}(x − ${d})`; cand = [x + 1, -x, (a * b + c * d) / (c + a)];
        ex = `Distribua: ${a}x + ${a * b} = ${c}x − ${c * d}; x de um lado: ${a * b} + ${c * d} = ${c}x − ${a}x → ${a * b + c * d} = ${kx(c - a)}; x = ${a * b + c * d} ÷ ${c - a} = ${x}`;
      }
      return Q(e, eqX(x), erradasNum(x, cand, { fmt: eqX, neg: true, inteiro: true }), X(ex));
    }
  };
}
function consecutivos() {
  const x = int(5, 40), S = 3 * x + 3;
  return Q(`A soma de três números consecutivos é ${S}. Qual é o maior deles?`, num(x + 2), erradasNum(x + 2, [x, x + 1, S / 3 + 2, x + 3]),
    X(`x + (x + 1) + (x + 2) = ${S} → 3x + 3 = ${S} → 3x = ${S - 3} → x = ${x}; Os números: ${x}, ${x + 1} e ${x + 2}. O maior é ${x + 2}`));
}
function idades() {
  const x = int(3, 15), m = int(2, 4), k = int(2, 8), S = x + k + m * x + k, nm = ['', '', 'dobro', 'triplo', 'quádruplo'][m];
  return Q(`O pai tem o ${nm} da idade de Ana. Daqui a ${k} anos, a soma das idades dos dois será ${S}. Quantos anos Ana tem hoje?`, `${x} anos`,
    erradasNum(x, [x + k, m * x, (S - k) / (m + 1), S / (m + 1)], { fmt: v => `${num(v)} anos` }),
    X(`Hoje: Ana x, pai ${m}x; Daqui a ${k} anos: (x + ${k}) + (${m}x + ${k}) = ${S}; ${m + 1}x + ${2 * k} = ${S} → ${m + 1}x = ${S - 2 * k} → x = ${x}`));
}
const FRD = [
  (k, t) => { const T = 3 * t - k; return [`"O triplo de um número menos ${k} é igual a ${T}"`, `3x − ${k} = ${T}`, [`3(x − ${k}) = ${T}`, `3x + ${k} = ${T}`, `x³ − ${k} = ${T}`]]; },
  (k, t) => { const T = t + k; return [`"A metade de um número mais ${k} é igual a ${T}"`, `x ÷ 2 + ${k} = ${T}`, [`(x + ${k}) ÷ 2 = ${T}`, `2x + ${k} = ${T}`, `x ÷ 2 = ${T} + ${k}`]]; },
  (k, t) => { const T = 2 * (k + t); return [`"O dobro da soma de um número com ${k} é igual a ${T}"`, `2(x + ${k}) = ${T}`, [`2x + ${k} = ${T}`, `x + 2 + ${k} = ${T}`, `2x + 2 = ${T}`]]; },   // T: dá um x inteiro e positivo
  (k, t) => [`"Um número somado ao seu dobro é igual a ${3 * t}"`, `x + 2x = ${3 * t}`, [`x + 2 = ${3 * t}`, `2x = ${3 * t}`, `x² = ${3 * t}`]],
  (k, t) => [`"O quádruplo de um número é igual a ele mais ${3 * t}"`, `4x = x + ${3 * t}`, [`4x + x = ${3 * t}`, `4 + x = ${3 * t}`, `4x = ${3 * t}`]],
];
const HISTD = [
  (k, t) => [`Comprei ${k} cadernos de x reais e paguei com R$ 50. Recebi R$ ${t} de troco.`, `50 − ${k}x = ${t}`, [`${k}x − 50 = ${t}`, `50 − x = ${t}`, `${k}x = ${t} − 50`]],
  (k, t) => [`Pedro tem x anos e a irmã tem ${k} anos a mais que ele. Juntos somam ${2 * t + k} anos.`, `x + (x + ${k}) = ${2 * t + k}`, [`x + ${k} = ${2 * t + k}`, `x + ${k}x = ${2 * t + k}`, `2x = ${2 * t + k} + ${k}`]],
  (k, t) => [`Um retângulo tem lados x e x + ${k}. O perímetro é ${4 * t + 2 * k}.`, `2x + 2(x + ${k}) = ${4 * t + 2 * k}`, [`x + (x + ${k}) = ${4 * t + 2 * k}`, `x(x + ${k}) = ${4 * t + 2 * k}`, `4x + ${k} = ${4 * t + 2 * k}`]],
  (k, t) => [`Tinha x reais, gastei a terça parte e sobraram ${2 * t}.`, `x − x ÷ 3 = ${2 * t}`, [`x ÷ 3 = ${2 * t}`, `x − 3 = ${2 * t}`, `3x − x = ${2 * t}`]],
];
const BALD = [
  (k, t, b) => [`Numa balança, ${k} caixas de peso x e mais ${b} kg equilibram 1 caixa e ${t + b} kg.`, `${k}x + ${b} = x + ${t + b}`, [`${k}x + ${b} = ${t + b}`, `${k + 1}x + ${b} = ${t + b}`, `${k}x = x + ${t + b} + ${b}`]],
  (k, t) => [`Numa balança, ${k} caixas de peso x equilibram 1 caixa e ${t} kg.`, `${k}x = x + ${t}`, [`${k}x = ${t}`, `${k}x + x = ${t}`, `${k} + x = ${t}`]],
];
const EQXD = X('Troque as palavras por sinais e monte cada parte: "o dobro da soma" é 2(x + …); "a terça parte" é x ÷ 3; "a mais" soma; o que está nos dois pratos da balança fica nos dois lados do =.');
const deListaD = lista => () => { const k = int(2, 6), t = int(3, 20), b = int(1, 9); const [e, r, x] = pick(lista)(k, t, b); return Q(comPergunta(e), r, x, EQXD); };
const M9D = {
  A: {
    treinador1: [eqD('neg'), eqD('dec'), eqD('frac')],
    treinador2: [eqD('dois'), eqD('dois'), eqD('neg')],
    treinador3: [eqD('paren'), eqD('dec'), eqD('dois')],
    lider: [eqD('ambos'), eqD('paren'), consecutivos, eqD('frac'), idades],
  },
  B: {
    treinador1: [deListaD(FRD), deListaD(FRD), deListaD(FRD)],
    treinador2: [deListaD(HISTD), deListaD(HISTD), deListaD(HISTD)],
    treinador3: [deListaD(BALD), deListaD(BALD), deListaD(FRD)],
    lider: [deListaD(FRD), deListaD(HISTD), deListaD(BALD), eqRev[1], eqRev[2]],
  },
};
// mapa 10
function proporcaoD() {
  const q1 = pick([0.5, 1.5, 2.5]), u = 2 * int(3, 12), T1 = arred(q1 * u), q2 = int(3, 9), v = q2 * u;
  return Q(`${num(q1)} kg de queijo custam ${reais(T1)}. Quanto custam ${q2} kg?`, reais(v), erradasNum(v, [T1 * q2, T1 + q2, v + u, T1 * q2 / 2], { fmt: reais, inteiro: false }),
    X(`Preço de 1 kg: ${reais(T1)} ÷ ${num(q1)} = ${reais(u)}; ${q2} kg: ${q2} × ${u} = ${reais(v)}`));
}
function receitaD() {
  const a = int(2, 6), per = 25 * int(1, 6), g = per * a, b = int(3, 12); if (b === a) return receitaD();
  const v = per * b;
  return Q(`Uma receita para ${a} pessoas usa ${g} g de farinha. Quanto de farinha para ${b} pessoas?`, `${v} g`, erradasNum(v, [g * b, g + b, g / b * a], { fmt: x => `${num(x)} g` }),
    X(`Para 1 pessoa: ${g} ÷ ${a} = ${per} g; Para ${b} pessoas: ${b} × ${per} = ${v} g`));
}
function inversaD() {
  for (;;) {
    const p = int(2, 6), p2 = int(3, 12), v = int(2, 12), W = p2 * v;
    if (p2 === p || p2 === 2 * p || W % p) continue;
    const d = W / p;
    return Q(`${p} pedreiros levam ${d} dias para fazer um muro. Quantos dias ${p2} pedreiros levam?`, `${v} dias`, erradasNum(v, [d * p2 / p, d + p2 - p, d - (p2 - p)], { fmt: x => `${num(x)} dias` }),
      X(`Inversa: mais pedreiros, menos dias; Trabalho todo: ${p} × ${d} = ${W} dias de 1 pedreiro; ${W} ÷ ${p2} = ${v} dias`));
  }
}
function velocidadeInvD() {
  for (;;) {
    const s1 = 10 * int(4, 12), h1 = int(2, 6), dist = s1 * h1, s2 = 10 * int(4, 12), v = dist / s2;
    if (s2 === s1 || Math.round(v * 10) !== v * 10 || v * 10 % 5) continue;   // tempo inteiro ou ",5"
    return Q(`A ${s1} km/h, uma viagem leva ${h1} horas. Quanto tempo leva a ${s2} km/h?`, `${num(v)} h`, erradasNum(v, [h1 * s2 / s1, h1 + 1, h1 - 1, s2 / s1], { fmt: x => `${num(x)} h`, inteiro: false }),
      X(`Inversa: mais rápido, menos tempo; Distância: ${s1} × ${h1} = ${dist} km; ${dist} ÷ ${s2} = ${num(v)} h`));
  }
}
function compostaD() {
  const per = int(5, 20), m = int(2, 4), h = int(2, 5), p = per * m * h; let m2 = int(2, 6), h2 = int(2, 6); if (m2 === m && h2 === h) h2 = h + 1;
  const v = per * m2 * h2;
  return Q(`${m} máquinas fazem ${p} peças em ${h} horas. Quantas peças ${m2} máquinas fazem em ${h2} horas?`, `${v} peças`, erradasNum(v, [p * m2 / m, p * h2 / h, p * m2 * h2, v + per], { fmt: x => `${num(x)} peças` }),
    X(`1 máquina em 1 hora: ${p} ÷ ${m} ÷ ${h} = ${per} peças; ${m2} máquinas em ${h2} horas: ${per} × ${m2} × ${h2} = ${v} peças`));
}
function contaCompostaD() {
  const per = int(5, 20), m = int(2, 4), h = int(2, 5), p = per * m * h, m2 = m + int(1, 3), h2 = int(2, 6);
  return Q(`${m} máquinas fazem ${p} peças em ${h} horas. Qual conta dá as peças de ${m2} máquinas em ${h2} horas?`, `${p} ÷ ${m} ÷ ${h} × ${m2} × ${h2}`,
    [`${p} × ${m2} × ${h2}`, `${p} ÷ ${m} × ${h2}`, `${p} × ${m} ÷ ${m2} × ${h} ÷ ${h2}`],
    X(`Ache quanto 1 máquina faz em 1 hora (${p} ÷ ${m} ÷ ${h}) e multiplique pelas máquinas e pelas horas novas (× ${m2} × ${h2})`));
}
function contaVelD() {
  const s1 = 10 * int(4, 9), h = int(2, 6), s2 = s1 + 10 * int(1, 4);
  return Q(`A ${s1} km/h, uma viagem leva ${h} horas. Qual conta dá o tempo a ${s2} km/h?`, `${s1} × ${h} ÷ ${s2}`, [`${s2} × ${h} ÷ ${s1}`, `${h} × ${s2}`, `${s1} ÷ ${s2}`],
    X(`Inversa: inverte uma coluna e multiplica cruzado: ${s2} · x = ${s1} · ${h} → x = ${s1} × ${h} ÷ ${s2}`));
}
const M10D = {
  A: {
    treinador1: [proporcaoD, receitaD, proporcaoD],
    treinador2: [inversaD, velocidadeInvD, inversaD],
    treinador3: [compostaD, proporcaoD, inversaD],
    lider: [compostaD, velocidadeInvD, proporcaoD, inversaD, receitaD],
  },
  B: {
    treinador1: [() => contaRev(0), () => contaRev(2), () => contaRev(0)],
    treinador2: [() => contaRev(1), contaVelD, () => contaRev(1)],
    treinador3: [contaCompostaD, contaVelD, () => contaRev(2)],
    lider: [contaCompostaD, () => contaRev(0), () => contaRev(1), contaVelD, () => contaRev(2)],
  },
};
// mapa 11: decimais, dois passos (perímetro → lado → outra unidade), ângulos de polígonos, área composta e trapézio
const per2 = x => `${num(x)}°`;
function perDecD() {
  const a = arred(int(2, 12) + pick([0.5, 0.25, 0.75])), b = arred(int(1, 9) + pick([0, 0.5])), v = arred(2 * (a + b));
  return Q(`Qual é o perímetro de um retângulo de ${num(a)} cm por ${num(b)} cm?`, cm(v), erradasNum(v, [a * b, a + b, 2 * a + b, v + 1], { fmt: cm, inteiro: false }), X(`${num(a)} + ${num(b)} + ${num(a)} + ${num(b)} = ${num(v)} cm`));
}
function ladoRegD() {
  const [n, k] = pick([['triângulo equilátero', 3], ['quadrado', 4], ['pentágono regular', 5], ['hexágono regular', 6], ['octógono regular', 8]]), l = int(2, 9) * 10, P = arred(k * l / 100);
  return Q(`Um ${n} tem perímetro de ${num(P)} m. Quanto mede cada lado, em centímetros?`, cm(l), erradasNum(l, [l / 10, P * 100, l * k / 10, l + 10], { fmt: cm }), X(`${num(P)} m = ${num(P * 100)} cm. Dividindo pelos ${k} lados: ${num(P * 100)} ÷ ${k} = ${l} cm`));
}
function isosceles() {
  const t = coin(), X0 = 2 * int(10, 60);
  if (t) { const v = (180 - X0) / 2; return Q(`Num triângulo isósceles, o ângulo diferente mede ${X0}°. Quanto mede cada um dos outros dois?`, per2(v), erradasNum(v, [180 - X0, X0, 90 - X0 / 2 + 10, (360 - X0) / 2], { fmt: per2 }), X(`Os 3 ângulos somam 180°. Sobram 180 − ${X0} = ${180 - X0}, divididos entre os dois iguais: ${180 - X0} ÷ 2 = ${v}°`)); }
  const b = int(20, 80), v = 180 - 2 * b;
  return Q(`Num triângulo isósceles, os dois ângulos iguais medem ${b}° cada. Quanto mede o terceiro?`, per2(v), erradasNum(v, [180 - b, 90 - b, 2 * b, v + 10], { fmt: per2 }), X(`180 − ${b} − ${b} = ${v}°`));
}
const POLS = [['triângulo', 3], ['quadrilátero', 4], ['pentágono', 5], ['hexágono', 6], ['octógono', 8], ['decágono', 10]];
function somaAng() {
  const [n, k] = pick(POLS.slice(2)), s = (k - 2) * 180;
  if (coin()) return Q(`Quanto dá a soma dos ângulos internos de um ${n}?`, per2(s), erradasNum(s, [k * 180, (k - 1) * 180, 360, s / 2], { fmt: per2 }), X(`Do ${n} saem ${k - 2} triângulos a partir de um vértice: ${k - 2} × 180 = ${s}°`));
  const v = s / k;
  return Q(`Quanto mede cada ângulo interno de um ${n} regular?`, per2(v), erradasNum(v, [360 / k, s, 180 - v, v + 10], { fmt: per2 }), X(`A soma é (${k} − 2) × 180 = ${s}°. Repartindo entre ${k} ângulos iguais: ${s} ÷ ${k} = ${v}°`));
}
function unidD() {
  return pick([
    () => { const a = arred(int(101, 999) / 100); return Q(`${num(a)} km são quantos metros?`, m_(a * 1000), erradasNum(arred(a * 1000), [a * 100, a * 10, a * 10000], { fmt: m_ }), X(`1 km = 1000 m: ${num(a)} × 1000 = ${num(arred(a * 1000))} m`)); },
    () => { const a = int(11, 99); return Q(`${a} mm são quantos centímetros?`, cm(a / 10), erradasNum(a / 10, [a * 10, a / 100, a], { fmt: cm, inteiro: false }), X(`10 mm = 1 cm: ${a} ÷ 10 = ${num(a / 10)} cm`)); },
    () => { const k = int(1, 9), m = int(1, 9) * 50; return Q(`${k} km e ${m} m são quantos metros ao todo?`, m_(k * 1000 + m), erradasNum(k * 1000 + m, [k + m, k * 100 + m, k * 1000 + m * 10], { fmt: m_ }), X(`${k} km = ${k * 1000} m. Mais ${m}: ${k * 1000 + m} m`)); },
    () => { const a = int(11, 999); return Q(`${a} cm são quantos metros?`, m_(a / 100), erradasNum(a / 100, [a / 10, a * 100, a / 1000], { fmt: m_, inteiro: false }), X(`100 cm = 1 m: ${a} ÷ 100 = ${num(a / 100)} m`)); },
  ])();
}
function cercaD() {
  const a = int(8, 30), b = int(5, a), v = int(2, 4), p = int(1, 3), P = 2 * (a + b), r = v * P - (v * p);
  return Q(`Um terreno tem ${a} m por ${b} m. Vou cercar com ${v} voltas de arame, deixando um portão de ${p} m sem arame. Quantos metros de arame?`, m_(r), erradasNum(r, [v * P, P - p, v * (a + b) - p, v * P - p], { fmt: m_ }), X(`Perímetro: 2 × (${a} + ${b}) = ${P} m. Sem o portão: ${P} − ${p} = ${P - p} m. ${v} voltas: ${v} × ${P - p} = ${r} m`));
}
function areaComp() {
  const a = int(6, 14), b = int(5, 12), c = int(2, a - 3), d = int(2, b - 3), v = a * b - c * d;
  return Q(`Um terreno em forma de L é um retângulo de ${a} m por ${b} m sem um canto de ${c} m por ${d} m. Qual é a área?`, m2(v), erradasNum(v, [a * b, a * b + c * d, 2 * (a + b), (a - c) * (b - d)], { fmt: m2 }), X(`Retângulo inteiro: ${a} × ${b} = ${a * b}. Tira o canto: ${c} × ${d} = ${c * d}. ${a * b} − ${c * d} = ${v} m²`));
}
function trapezio() {
  for (;;) {
    const B = int(6, 16), b = int(2, B - 2), h = int(2, 10); if ((B + b) * h % 2) continue; const v = (B + b) * h / 2;
    return Q(`Qual é a área de um trapézio de bases ${B} cm e ${b} cm e altura ${h} cm?`, cm2(v), erradasNum(v, [(B + b) * h, B * b * h / 2, B * h, (B + b + h)], { fmt: cm2 }), X(`Área do trapézio = (base maior + base menor) × altura ÷ 2: (${B} + ${b}) × ${h} ÷ 2 = ${v} cm²`));
  }
}
function areaDecD() {
  const a = arred(int(1, 9) + 0.5), b = int(2, 12);
  if (coin()) { const v = arred(a * a); return Q(`Qual é a área de um quadrado de lado ${num(a)} m?`, m2(v), erradasNum(v, [4 * a, 2 * a, arred(Math.floor(a) ** 2), v + 1], { fmt: m2, inteiro: false }), X(`${num(a)} × ${num(a)} = ${num(v)} m²`)); }
  const v = arred(a * b); return Q(`Qual é a área de um retângulo de ${num(a)} m por ${b} m?`, m2(v), erradasNum(v, [2 * (a + b), a + b, v + b, v * 10], { fmt: m2, inteiro: false }), X(`${num(a)} × ${b} = ${num(v)} m²`));
}
function piso() {
  const a = int(3, 8), b = int(2, 6), p = pick([25, 30, 35, 40, 45, 50, 60]), v = a * b * p;
  return Q(`O piso custa R$ ${p} o metro quadrado. Quanto custa o piso de uma sala de ${a} m por ${b} m?`, reais(v), erradasNum(v, [2 * (a + b) * p, (a + b) * p, a * b + p], { fmt: reais }), X(`Área: ${a} × ${b} = ${a * b} m². Custo: ${a * b} × ${p} = ${reais(v)}`));
}
function areaDoPerim() {
  const l = int(3, 15), P = 4 * l, v = l * l;
  return Q(`Um quadrado tem perímetro ${P} cm. Qual é a área?`, cm2(v), erradasNum(v, [P * P, P, (P / 2) ** 2, P / 2], { fmt: cm2 }), X(`Lado: ${P} ÷ 4 = ${l} cm. Área: ${l} × ${l} = ${v} cm²`));
}
function perimDaArea() {
  const a = int(3, 12), b = int(2, 9), A = a * b, v = 2 * (a + b);
  return Q(`Um retângulo tem área ${A} cm² e um lado de ${a} cm. Qual é o perímetro?`, cm(v), erradasNum(v, [A, a + b, 2 * a + b, A - a], { fmt: cm }), X(`O outro lado: ${A} ÷ ${a} = ${b} cm. Perímetro: ${a} + ${b} + ${a} + ${b} = ${v} cm`));
}
const M11D = {
  A: {
    treinador1: [perDecD, cercaD, perDecD],
    treinador2: [ladoRegD, unidD, ladoRegD],
    treinador3: [isosceles, somaAng, isosceles],
    lider: [cercaD, somaAng, ladoRegD, isosceles, unidD],
  },
  B: {
    treinador1: [areaDecD, areaDoPerim, areaDecD],
    treinador2: [areaComp, trapezio, areaComp],
    treinador3: [piso, perimDaArea, trapezio],
    lider: [areaComp, piso, areaDoPerim, perimDaArea, trapezio],
  },
};

// mapa 12: simétricos, distâncias, o vértice que falta, coordenadas com conta, caminhos de 3 partes e "de onde saí?"
const opc = (x) => PL(x, { opcoes: true, mostra: 'resposta' });
function simetrico() {
  let x = pick([-1, 1]) * int(1, 7), y = pick([-1, 1]) * int(1, 7), t = int(0, 2); if (Math.abs(x) === Math.abs(y)) y = Math.sign(y) * (Math.abs(y) % 7 + 1);
  const nome = ['ao eixo x', 'ao eixo y', 'à origem'][t];
  const [rx, ry] = [[x, -y], [-x, y], [-x, -y]][t];
  const err = erradasTexto(ponto(rx, ry), [ponto(x, -y), ponto(-x, y), ponto(-x, -y), ponto(y, x), ponto(-y, -x)].filter(p => p !== ponto(x, y)));
  return Q(`Qual é o simétrico de ${ponto(x, y)} em relação ${nome}?`, ponto(rx, ry), err, opc(X(['Espelho no eixo x: o x fica, o y troca de sinal.', 'Espelho no eixo y: o y fica, o x troca de sinal.', 'Simétrico pela origem: os dois trocam de sinal.'][t])));
}
function distancia() {
  for (;;) {
    const hor = coin(), a = int(-8, 8), b = int(-8, 8), f = int(-6, 6); if (Math.abs(a - b) < 3 || (a >= 0 && b >= 0)) continue;
    const p = hor ? [a, f] : [f, a], q = hor ? [b, f] : [f, b], v = Math.abs(a - b);
    return Q(`Quantas casas há entre ${ponto(...p)} e ${ponto(...q)}?`, num(v), erradasNum(v, [Math.abs(a + b), Math.abs(a) + Math.abs(b) === v ? v + 2 : Math.abs(a) + Math.abs(b), v - 1, v + 1]), PL(X(`Muda só o ${hor ? 'x' : 'y'}: de ${num(a)} até ${num(b)} são ${v} casas (${num(Math.max(a, b))} − (${num(Math.min(a, b))}) = ${v})`), { partida: p, chegada: q, mostra: 'caminho' }));
  }
}
function vertice() {
  for (;;) {
    const x1 = int(-6, 2), y1 = int(-6, 2), x2 = x1 + int(2, 7), y2 = y1 + int(2, 6);
    const vs = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]], i = int(0, 3), r = vs[i], dados = vs.filter((_, j) => j !== i);
    const err = erradasTexto(ponto(...r), [ponto(r[1], r[0]), ponto(r[0] === x1 ? x2 : x1, r[1]), ponto(r[0], r[1] === y1 ? y2 : y1), ponto(-r[0], r[1]), ponto(r[0] + 1, r[1])]);
    if (err.length < 3) continue;
    return Q(`Um retângulo tem vértices em ${dados.map(p => ponto(...p)).join(', ')}. Qual é o 4º vértice?`, ponto(...r), err, opc(X(`Os lados são retos: o 4º vértice usa o x de um vizinho e o y do outro. Fica ${ponto(...r)}`)));
  }
}
function quadConta() {
  const a = int(1, 9), b = int(1, 9), c = int(1, 9), d = int(1, 9), x = pick([a - b - 3, a + b, -a - b]), y = pick([c - d - 4, c + d, -c]);
  if (!x || !y) return quadConta();
  const ex = `${x < 0 ? '−' : ''}${Math.abs(x)}`, nome = x > 0 ? (y > 0 ? '1º quadrante' : '4º quadrante') : (y > 0 ? '2º quadrante' : '3º quadrante');
  const tx = `${num(x + 5)} − 5`, ty = `${num(y - 3)} + 3`;
  return Q(`Em qual quadrante fica o ponto (${tx}, ${ty})?`, nome, Object.keys(QUADS).filter(k => k !== nome), X(`Faça as contas primeiro: ${tx} = ${ex} e ${ty} = ${num(y)}. O ponto é ${ponto(x, y)}: ${nome}.`));
}
function andar3() {
  for (;;) {
    const x0 = int(-4, 4), y0 = int(-4, 4), a = int(2, 6), b = int(2, 7), c = int(1, 5), d1 = pick([1, -1]), d2 = pick([1, -1]);
    const mov = [[d1, 0, a], [0, d2, b], [-d1, 0, c]], x = x0 + d1 * a - d1 * c, y = y0 + d2 * b;
    if (a === c) continue;
    const txt = `${a} para a ${d1 > 0 ? 'direita' : 'esquerda'}, ${b} para ${d2 > 0 ? 'cima' : 'baixo'} e ${c} para a ${d1 > 0 ? 'esquerda' : 'direita'}`;
    return Q(`Saindo de ${ponto(x0, y0)}, ando ${txt}. Onde paro?`, ponto(x, y), erradasPonto(x, y), PL(X(`x: ${num(x0)} ${d1 > 0 ? '+' : '−'} ${a} ${d1 > 0 ? '−' : '+'} ${c} = ${num(x)}; y: ${num(y0)} ${d2 > 0 ? '+' : '−'} ${b} = ${num(y)}`), { partida: [x0, y0], mov, mostra: 'caminho' }));
  }
}
function deOnde() {
  for (;;) {
    const x = int(-5, 5), y = int(-5, 5), dx = pick([-1, 1]) * int(2, 6), dy = pick([-1, 1]) * int(2, 6), x0 = x - dx, y0 = y - dy;
    const err = erradasTexto(ponto(x0, y0), [ponto(x + dx, y + dy), ponto(x - dx, y + dy), ponto(x + dx, y - dy), ponto(y0, x0)]);
    if (err.length < 3) continue;
    return Q(`Andei ${dirTxt(dx, dy)} e parei em ${ponto(x, y)}. De onde saí?`, ponto(x0, y0), err, opc(X(`Faça o caminho de volta (ao contrário): x: ${num(x)} ${dx > 0 ? '−' : '+'} ${Math.abs(dx)} = ${num(x0)}; y: ${num(y)} ${dy > 0 ? '−' : '+'} ${Math.abs(dy)} = ${num(y0)}`)));
  }
}
const M12D = {
  A: {
    treinador1: [simetrico, simetrico, simetrico],
    treinador2: [distancia, quadConta, distancia],
    treinador3: [vertice, quadConta, vertice],
    lider: [simetrico, vertice, distancia, quadConta, simetrico],
  },
  B: {
    treinador1: [andar3, andar3, andar3],
    treinador2: [deOnde, deOnde, deOnde],
    treinador3: [andar({ neg: true }), andar3, caminho],
    lider: [andar3, deOnde, caminho, andar3, deOnde],
  },
};

// mapa 13 A: mais números e números maiores, média com peso, a nota que falta em 4 provas, nova média e mediana de 8
function mediaD() {
  for (;;) {
    const n = pick([5, 6, 8]), l = lista(n, 10, 99), s = somaL(l); if ((s * 2) % n) continue; const v = s / n;
    return Q(`Qual é a média de ${eFinal(l)}?`, num(v), erradasNum(v, [s, medianaDe(l), Math.floor(v) + 1, v + 0.5, (Math.max(...l) + Math.min(...l)) / 2], { inteiro: ehInteiro(v) ? null : false }), X(`Soma: ${l.join(' + ')} = ${s}. Divide por ${n}: ${s} ÷ ${n} = ${num(v)}`));
  }
}
function mediaPeso() {
  for (;;) {
    const a = int(3, 10), b = int(3, 10), pa = int(1, 3), pb = int(2, 4); if (pa === pb || a === b) continue;
    const s = a * pa + b * pb, P = pa + pb, v = arred(s / P); if (!ehInteiro(v * 10)) continue;
    return Q(`A prova 1 vale peso ${pa} e a prova 2 vale peso ${pb}. Tirei ${a} na prova 1 e ${b} na prova 2. Qual é a minha média?`, num(v), erradasNum(v, [(a + b) / 2, s, a * pa + b, arred(s / 2)], { inteiro: false }), X(`Média com peso: (${a} × ${pa} + ${b} × ${pb}) ÷ (${pa} + ${pb}) = ${s} ÷ ${P} = ${num(v)}`));
  }
}
function notaFaltaD() {
  for (;;) {
    const m = pick([6, 6.5, 7, 7.5, 8]), l = [int(4, 10), int(4, 10), int(5, 10)], c = arred(4 * m - somaL(l)); if (c < 0 || c > 10) continue;
    return Q(`A média de 4 provas foi ${num(m)}. Três notas foram ${eFinal(l)}. Qual foi a quarta?`, num(c), erradasNum(c, [4 * m, m, arred(3 * m - somaL(l)), c + 1], { inteiro: ehInteiro(c) ? null : false }), X(`A soma das 4 é 4 × ${num(m)} = ${num(4 * m)}. Falta ${num(4 * m)} − ${somaL(l)} = ${num(c)}`));
  }
}
function novaMedia() {
  for (;;) {
    const n = int(3, 5), m = int(5, 12), k = int(1, 25), v = arred((n * m + k) / (n + 1)); if (!ehInteiro(v * 10) || v === m) continue;
    return Q(`A média de ${n} números é ${m}. Se eu juntar o número ${k}, qual é a nova média?`, num(v), erradasNum(v, [(m + k) / 2, n * m + k, m, arred((n * m + k) / n)], { inteiro: ehInteiro(v) ? null : false }), X(`A soma dos ${n} é ${n} × ${m} = ${n * m}. Com o ${k}: ${n * m + k}, agora dividido por ${n + 1}: ${num(v)}`));
  }
}
function mediana8() {
  for (;;) {
    const l = lista(8, 10, 60), s = [...l].sort((a, b) => a - b), v = (s[3] + s[4]) / 2; if (ehInteiro(v) && coin()) continue;
    return Q(`Qual é a mediana de ${eFinal(l)}?`, num(v), erradasNum(v, [(l[3] + l[4]) / 2, s[3], s[4], arred(somaL(l) / 8)], { inteiro: ehInteiro(v) ? null : false }), X(`Em ordem: ${s.join(', ')}. São 8: a mediana é a média dos dois do meio, (${s[3]} + ${s[4]}) ÷ 2 = ${num(v)}`));
  }
}
function mediaMenosMediana() {
  for (;;) {
    const l = lista(5, 1, 30), s = somaL(l); if (s % 5) continue; const me = s / 5, md = medianaDe(l), v = me - md;
    return Q(`Na lista ${fmtL(l)}, quanto é a média menos a mediana?`, num(v), erradasNum(v, [md - me, me, md, me + md], { neg: true }), X(`Média: ${s} ÷ 5 = ${me}. Em ordem: ${[...l].sort((a, b) => a - b).join(', ')}, mediana ${md}. ${me} − ${md} = ${num(v)}`));
  }
}
const M13D = {
  A: {
    treinador1: [mediaD, mediaPeso, mediaD],
    treinador2: [notaFaltaD, novaMedia, notaFaltaD],
    treinador3: [mediana8, mediaMenosMediana, mediana8],
    lider: [mediaPeso, notaFaltaD, mediana8, novaMedia, mediaMenosMediana],
  },
};
export const DIFICIL_9_13 = { 9: M9D, 10: M10D, 11: M11D, 12: M12D, 13: M13D };

// ===== Base: sorteio, formatação, avaliador e alternativas =====
let _rnd = Math.random;
export function usarSemente(s) {            // para testes reproduzíveis
  let x = s >>> 0 || 1;
  _rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}
export function usarAleatorio() { _rnd = Math.random; }
export const rnd = () => _rnd();
export const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
export const pick = arr => arr[Math.floor(rnd() * arr.length)];
export function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const sample = (arr, k) => shuffle(arr).slice(0, k);
export const coin = () => rnd() < 0.5;

// ---- números em português (vírgula decimal, sinal de menos tipográfico)
export const arred = v => Math.round(v * 1e6) / 1e6;
export function num(v, dec = 3) {
  v = arred(v);
  let s = Number.isInteger(v) ? String(Math.abs(v)) : Math.abs(v).toFixed(dec).replace(/0+$/, '').replace(/\.$/, '');
  s = s.replace('.', ',');
  return (v < 0 ? '−' : '') + s;
}
export function reais(v) {                  // R$ 5 | R$ 2,50 | −R$ 5
  v = arred(v);
  const a = Math.abs(v);
  const s = Number.isInteger(a) ? String(a) : a.toFixed(2).replace('.', ',');
  return (v < 0 ? '−R$ ' : 'R$ ') + s;
}
export const ehInteiro = v => Math.abs(v - Math.round(v)) < 1e-9;
export const decimais = v => { v = arred(v); if (ehInteiro(v)) return 0; const s = String(v); return s.split('.')[1]?.length || 0; };

// ---- avaliador de expressões: + − × ÷ ( ) [ ] { }, vírgula decimal, menos unário
function tokens(s) {
  const t = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ') { i++; continue; }
    if (/[0-9]/.test(c)) { let j = i; while (j < s.length && /[0-9,]/.test(s[j])) j++; t.push(parseFloat(s.slice(i, j).replace(',', '.'))); i = j; continue; }
    if ('+−-×÷()[]{}'.includes(c)) { t.push(c === '-' ? '−' : '[{'.includes(c) ? '(' : ']}'.includes(c) ? ')' : c); i++; continue; }
    throw new Error('caractere inválido: ' + c + ' em ' + s);
  }
  return t;
}
// modo: 'normal' | 'esq' (ignora precedência, da esquerda p/ direita) | 'semparen' (ignora parênteses)
export function avaliar(expr, modo = 'normal') {
  let t = tokens(expr); let exata = true;
  if (modo === 'semparen') t = t.filter(x => x !== '(' && x !== ')');
  let p = 0;
  const op = (a, o, b) => {
    if (o === '+') return a + b; if (o === '−') return a - b; if (o === '×') return a * b;
    if (b === 0) { exata = false; return NaN; }
    if (!ehInteiro(a / b)) exata = false; return a / b;
  };
  const esq = modo === 'esq';
  function fator() {
    const x = t[p];
    if (x === '−') { p++; return -fator(); }
    if (x === '(') { p++; const v = esq ? linear() : soma(); p++; return v; }
    p++; return x;
  }
  function termo() { let v = fator(); while (t[p] === '×' || t[p] === '÷') { const o = t[p++]; v = op(v, o, fator()); } return v; }
  function soma() { let v = termo(); while (t[p] === '+' || t[p] === '−') { const o = t[p++]; v = op(v, o, termo()); } return v; }
  function linear() { let v = fator(); while (p < t.length && t[p] !== ')') { const o = t[p++]; v = op(v, o, fator()); } return v; }
  const v = esq ? linear() : soma();
  return { v, exata };
}

// ---- monta expressão substituindo letras; negativos ganham parênteses quando precisam
export function montar(modelo, vals, parenSempre = false) {
  let out = '';
  for (let i = 0; i < modelo.length; i++) {
    const c = modelo[i];
    if (/[a-h]/.test(c) && !/[a-zà-ú]/i.test(modelo[i + 1] || '') && !/[a-zà-ú]/i.test(modelo[i - 1] || '')) {
      const v = vals[c]; const s = num(v);
      const antes = out.replace(/ +$/, '').slice(-1);
      const inicio = antes === '' || '([{'.includes(antes);
      out += v < 0 && (parenSempre || !inicio) ? `(${s})` : s;
    } else out += c;
  }
  return out;
}

// ---- escolha das alternativas erradas
// cand: lista de valores numéricos candidatos; fmt: formatador; v: resposta
export function erradasNum(v, cand, { fmt = num, neg = false, inteiro = null, n = 3, extra = [] } = {}) {
  const certo = fmt(v); const out = [];
  const inteiroReq = inteiro ?? ehInteiro(v);
  const base = [...cand, ...extra, v + 1, v - 1, v + 2, v - 2, v * 2, v + 3, v + 10, v - 3];
  for (let c of base) {
    if (c === null || c === undefined || !isFinite(c)) continue;
    c = arred(c);
    if (Math.abs(c - v) < 1e-9) continue;
    if (c < 0 && !neg && v >= 0) continue;
    if (inteiroReq && !ehInteiro(c)) continue;
    if (Math.abs(c) > Math.max(20, Math.abs(v) * 12)) continue;
    const s = fmt(c);
    if (s === certo || out.includes(s)) continue;
    out.push(s); if (out.length === n) break;
  }
  return out;
}
export function erradasTexto(certo, cand, n = 3) {
  const out = [];
  for (const c of cand) { if (c && c !== certo && !out.includes(c)) out.push(c); if (out.length === n) break; }
  return out;
}

// ---- frações
export const mdc = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
export const mmc = (a, b) => a / mdc(a, b) * b;
export const frac = (p, q) => `${p}/${q}`;
export function simpl(p, q) { const g = mdc(p, q); return [p / g, q / g]; }
export function erradasFrac(p, q, cand, n = 3) {
  const out = []; const certo = frac(p, q);
  for (const [a, b] of cand) {
    if (!(a > 0) || !(b > 0) || !Number.isInteger(a) || !Number.isInteger(b)) continue;
    if (a * q === b * p) continue;              // equivalente à resposta
    const s = frac(a, b); if (s === certo || out.includes(s)) continue;
    out.push(s); if (out.length === n) break;
  }
  return out;
}

// ---- coordenadas
export const ponto = (x, y) => `(${num(x)}, ${num(y)})`;
export function erradasPonto(x, y, n = 3) {
  const c = [[y, x], [-x, y], [x, -y], [x + 1, y], [x, y + 1], [x - 1, y - 1]];
  return erradasTexto(ponto(x, y), c.filter(([a, b]) => !(a === x && b === y)).map(([a, b]) => ponto(a, b)), n);
}

// ---- passo a passo de uma expressão: "2 + 3 × 4 = 2 + 12 = 14"
function tokU(s) {
  const t = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ') { i++; continue; }
    if (/[0-9]/.test(c)) { let j = i; while (j < s.length && /[0-9,]/.test(s[j])) j++; t.push(parseFloat(s.slice(i, j).replace(',', '.'))); i = j; continue; }
    const prev = t[t.length - 1];
    if ((c === '−' || c === '-') && (prev === undefined || typeof prev === 'string' && !')]}'.includes(prev))) {
      // menos unário: junta com o número seguinte
      let j = i + 1; while (s[j] === ' ') j++;
      let k = j; while (k < s.length && /[0-9,]/.test(s[k])) k++;
      if (k > j) { t.push(-parseFloat(s.slice(j, k).replace(',', '.'))); i = k; continue; }
    }
    t.push(c === '-' ? '−' : c); i++;
  }
  return t;
}
function mostra(t, abre) {
  let s = '';
  t.forEach((x, i) => {
    if (typeof x === 'number') {
      const p = t[i - 1];
      const n = num(x);
      s += x < 0 && p !== undefined && !'([{'.includes(p) ? `(${n})` : n;
    } else if ('([{)]}'.includes(x)) s += x;
    else s += ` ${x} `;
  });
  return s.replace(/([(\[{])\s+/g, '$1').replace(/\s+([)\]}])/g, '$1').trim();
}
export function passos(expr) {
  let t = tokU(expr); const out = [expr]; let guarda = 0;
  while (t.length > 1 && guarda++ < 30) {
    // grupo mais interno
    let a = 0, b = t.length;
    const fechar = t.findIndex(x => typeof x === 'string' && ')]}'.includes(x));
    if (fechar >= 0) { b = fechar; a = fechar; while (a > 0 && !'([{'.includes(t[a - 1])) a--; }
    const seg = t.slice(a, b);
    if (seg.length === 1) { t.splice(a - 1, 3, seg[0]); continue; }  // tira parênteses de um número só
    let k = seg.findIndex(x => x === '×' || x === '÷');
    if (k < 0) k = seg.findIndex(x => x === '+' || x === '−');
    const x = seg[k - 1], o = seg[k], y = seg[k + 1];
    const v = arred(o === '+' ? x + y : o === '−' ? x - y : o === '×' ? x * y : x / y);
    t.splice(a + k - 1, 3, v);
    for (let i = 1; i < t.length - 1; i++) if (typeof t[i - 1] === 'string' && '([{'.includes(t[i - 1]) && typeof t[i] === 'number' && typeof t[i + 1] === 'string' && ')]}'.includes(t[i + 1])) { t.splice(i - 1, 3, t[i]); i = 0; }
    const s = mostra(t); if (s !== out[out.length - 1]) out.push(s);
  }
  return out.join(' = ');
}

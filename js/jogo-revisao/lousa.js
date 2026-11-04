// Jogo de Revisão — 🧑‍🏫 a lousa animada da Aula do pet e do "▶ Ver como faz" (PROMPT-185). Só HTML/CSS, sem imagens.
//
//   const l = criarLousa(div)     uma lousa por elemento; cada uma tem a própria animação (cancelar / pausar)
//   await l.tocar(passos)         limpa e anima os passos, um por vez (~1,2 s cada); ↺: tocar de novo os mesmos
//   l.cancelar() · l.pausar(sim)
//
// Passos (o campo `lousa` das páginas de dados/jogo/aulas.json, ou montados pelo "Ver como faz"):
//   { t: 'linha', v: '5 + 2 × 3', classe?: 'certo' | 'errado' }   escreve uma linha (certo: ✔ verde · errado: riscado com ✖)
//   { t: 'enunciado', v: '…' }                                    uma linha de texto menor (o problema)
//   { t: 'marca', v: '2 × 3' }                                    destaca o trecho na linha de baixo (a operação da vez)
//   { t: 'resolve', v: '6', linha: '5 + 6' }                      a linha nova; o resultado aparece em verde e "pula"
//   { t: 'expressao', v: '20 − 6 ÷ 2 + 3 × 4' }                   resolve linha por linha: ( ) [ ] { } → × ÷ → + −
//   { t: 'seta', de: 0, para: 2, rotulo: '×2' }                   seta curva entre dois termos da linha de baixo
//   { t: 'texto', v: '…' }                                        o rótulo curto embaixo da lousa
//   { t: 'armada', op: '+' | '−' | '×', a: '12,5', b: '3,75' }   conta armada: casas alinhadas, vai um, vírgula embaixo de vírgula
//   { t: 'divisao', a: 156, b: 12, casas?: 1 }                    divisão com chave: abaixa, quanto cabe, resto
//   { t: 'reta', de: -2, anda: [5, -3], min?: -5, max?: 5 }       reta numérica com a bolinha andando (contando as casinhas)
//   { t: 'reta', bolas: [-5, -2], destaca: 'menor' | 'maior' }      comparar: as bolinhas na reta; a pedida acende (PROMPT-186)
//   { t: 'reta', min: -10, max: 10 }                                só a reta
//   { t: 'virgula', v: '3,5', op: '×' | '÷', k: 100 }             × ou ÷ por 10, 100, 1000: os zeros do k acendem um a um e a
//                                                                  vírgula pula uma casa por zero (escondida no fim do inteiro)
//   { t: 'virgula', v: '3,45', casas: 2, lado: 'direita' | 'esquerda' }   a vírgula pulando casas (zeros aparecem)
//   { t: 'escada', degraus: ['km', …, 'mm'], de?: 'm', para?: 'cm', v?: '2,5' }   a escada das unidades: a bolinha desce
//                                                                  (× 10 por degrau) ou sobe (÷ 10) e a vírgula pula junto
//   { t: 'tabela', linhas: ['+ · + = +', …] } · { t: 'acende', i: 1 }   a tabela de sinais e a linha que acende
//   { t: 'figura', figura: { tipo: 'pizza' | 'barras_iguais' | … } }      as figuras das frações (figuras.js)
//   { t: 'pausa', ms: 800 }
import { tokU, num, arred } from './base.js';
import { criarFigura } from './figuras.js';

export const MS_PASSO = 1200;
const calmo = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const CANCELADA = Symbol('lousa cancelada');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// termos de uma linha: números (com vírgula), operações, = , parênteses e palavras
const termos = (s) => String(s).match(/\(−\d+(?:,\d+)?\)|(?<![\d)\]}])−\d+(?:,\d+)?|\d+(?:,\d+)?|[−+×÷=()[\]{}]|[^\s\d−+×÷=()[\]{}]+/g) || [];   // −5 colado: um número só

// ── a expressão resolvida passo a passo (a mesma regra de base.js → passos): cada passo { antes, de, ate, depois, novo }
// (termos para mostrar; de..ate = o trecho marcado; novo = onde o resultado fica na linha de baixo)
const visTermo = (x, i, t) => (typeof x === 'number' ? (x < 0 && i > 0 && !'([{'.includes(t[i - 1]) ? `(${num(x)})` : num(x)) : x === '-' ? '−' : x);
const vis = (t) => t.map((x, i) => visTermo(x, i, t));
export function passosExpressao(expr) {
  let t = tokU(expr);
  const out = [];
  for (let guarda = 0; t.length > 1 && guarda < 40; guarda++) {
    let a = 0, b = t.length;
    const fechar = t.findIndex(x => typeof x === 'string' && ')]}'.includes(x));
    if (fechar >= 0) { b = fechar; a = fechar; while (a > 0 && !'([{'.includes(t[a - 1])) a--; }
    const seg = t.slice(a, b);
    if (seg.length === 1) { t = [...t]; t.splice(a - 1, 3, seg[0]); continue; }   // ( 5 ) → 5, sem passo
    let k = seg.findIndex(x => x === '×' || x === '÷');
    if (k < 0) k = seg.findIndex(x => x === '+' || x === '−');
    if (k < 1 || typeof seg[k - 1] !== 'number' || typeof seg[k + 1] !== 'number') throw new Error('expressão inválida: ' + expr);
    const x = seg[k - 1], o = seg[k], y = seg[k + 1];
    const v = arred(o === '+' ? x + y : o === '−' ? x - y : o === '×' ? x * y : x / y);
    const grupo = fechar >= 0 && seg.length === 3;   // ( 5 + 3 ): a marca pega os parênteses, que somem junto
    const t2 = [...t];
    let novo;
    if (grupo) { t2.splice(a - 1, 5, v); novo = a - 1; } else { t2.splice(a + k - 1, 3, v); novo = a + k - 1; }
    out.push({ antes: vis(t), de: grupo ? a - 1 : a + k - 1, ate: grupo ? b : a + k + 1, depois: vis(t2), novo, valor: v });
    t = t2;
  }
  return out;
}

export function criarLousa(raiz) {
  raiz.classList.add('lz');
  raiz.innerHTML = '<div class="lz-quadro"></div><div class="lz-rotulo"></div>';
  const Q = raiz.querySelector('.lz-quadro'), ROT = raiz.querySelector('.lz-rotulo');
  const L = { token: 0, pausado: false, passos: [], fig: null };
  const vivo = (t) => t === L.token;
  const dorme = async (ms, t) => {
    if (calmo()) ms = Math.min(ms, 150);
    let p = 0;
    while (p < ms) { if (!vivo(t)) throw CANCELADA; await new Promise(r => setTimeout(r, 40)); if (!L.pausado) p += 40; }
    if (!vivo(t)) throw CANCELADA;
  };
  const div = (cls, html = '', pai = Q) => { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; pai.appendChild(e); return e; };
  const ultima = () => [...Q.querySelectorAll('.lz-linha:not(.lz-enun)')].pop() || null;
  // no máximo 5 linhas: as de cima saem
  const caber = () => { const ls = Q.querySelectorAll('.lz-linha, .lz-bloco'); for (let i = 0; i < ls.length - 5; i++) ls[i].remove(); };
  function linha(ts, cls = '') {
    const e = div('lz-linha ' + cls, ts.map((x, i) => `<span class="lz-t${/^[−+×÷=]$/.test(x) ? ' op' : ''}" data-i="${i}">${esc(x)}</span>`).join(''));
    caber();
    return e;
  }
  const spans = (l) => [...l.querySelectorAll('.lz-t')];
  // o trecho (em termos) dentro da linha: índice do 1º termo, ou -1
  function acha(l, trecho) {
    const tl = spans(l).map(s => s.textContent), tt = termos(trecho);
    for (let i = 0; i + tt.length <= tl.length; i++) if (tt.every((x, j) => tl[i + j] === x)) return i;
    return -1;
  }
  function marcar(l, de, ate) { spans(l).forEach((s, i) => s.classList.toggle('marca', i >= de && i <= ate)); }
  function novaLinha(ts, de, n) {
    const l = linha(ts);
    spans(l).forEach((s, i) => { if (i >= de && i < de + n) s.classList.add('novo'); });
    return l;
  }

  // ── uma seta curva entre dois termos da última linha, com o rótulo em cima ──
  function seta(p) {
    const l = ultima();
    if (!l) return;
    const ss = spans(l), a = ss[Number(p.de)] || ss[0], b = ss[Number(p.para)] || ss[ss.length - 1];
    const r0 = Q.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const x1 = ra.left + ra.width / 2 - r0.left, x2 = rb.left + rb.width / 2 - r0.left, y = ra.top - r0.top - 2, alto = Math.max(18, Math.abs(x2 - x1) * 0.35);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'lz-seta');
    svg.innerHTML = `<defs><marker id="lzp" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ffd700"/></marker></defs>` +
      `<path d="M${x1},${y} Q${(x1 + x2) / 2},${y - alto * 2} ${x2},${y}" stroke="#ffd700" stroke-width="3" fill="none" marker-end="url(#lzp)"/>` +
      `<text x="${(x1 + x2) / 2}" y="${y - alto - 6}" text-anchor="middle" fill="#ffd700" font-weight="800" font-family="Inter, sans-serif" font-size="18">${esc(p.rotulo || '')}</text>`;
    Q.appendChild(svg);
  }

  // ── conta armada: casas alinhadas pela vírgula; + − (com vai um / empresta) e × ──
  async function armada(p, t) {
    const op = p.op === '-' ? '−' : p.op;
    const [ai, ad = ''] = String(p.a).split(','), [bi, bd = ''] = String(p.b).split(',');
    if (op === '×') return multiplicar(p, t);
    const dec = Math.max(ad.length, bd.length);
    const A = ai + ad.padEnd(dec, '0'), B = bi + bd.padEnd(dec, '0'), n = Math.max(A.length, B.length) + 1;
    const da = A.padStart(n, ' '), db = B.padStart(n, ' ');
    const cols = (s, zerosDe = '') => [...s].map((c, i) => c);
    const bloco = div('lz-bloco lz-armada');
    const vai = div('lz-arm-linha lz-vai', '', bloco), la = div('lz-arm-linha', '', bloco), lb = div('lz-arm-linha', '', bloco), lr = div('lz-arm-linha lz-res', '', bloco);
    const cel = (linhaEl, c, cls = '') => { const s = document.createElement('span'); s.className = 'lz-c ' + cls; s.textContent = c; linhaEl.appendChild(s); return s; };
    const virg = (linhaEl) => { const s = document.createElement('span'); s.className = 'lz-c lz-v'; s.textContent = dec ? ',' : ''; linhaEl.appendChild(s); return s; };
    const ca = [], cb = [], cr = [], cv = [];
    for (let i = 0; i < n; i++) {
      if (dec && i === n - dec) { virg(vai); virg(la); virg(lb); virg(lr); }
      const zA = i >= n - dec && i - (n - dec) >= ad.length, zB = i >= n - dec && i - (n - dec) >= bd.length;   // zeros que completam casas
      cv.push(cel(vai, ''));
      ca.push(cel(la, da[i] === ' ' ? '' : da[i], zA ? 'zero' : ''));
      cb.push(cel(lb, i === 0 ? op : db[i] === ' ' ? '' : db[i], zB ? 'zero' : i === 0 ? 'op' : ''));
      cr.push(cel(lr, ''));
    }
    lb.classList.add('lz-traco');
    await dorme(MS_PASSO, t);
    let leva = 0;
    const na = [...da].map(c => (c === ' ' ? 0 : Number(c))), nb = [...db].map(c => (c === ' ' ? 0 : Number(c)));
    for (let i = n - 1; i >= 1; i--) {
      if (op === '+') {
        const s = na[i] + nb[i] + leva;
        if (i === 1 && s === 0 && !leva && da[i] === ' ' && db[i] === ' ') break;
        cr[i].textContent = String(s % 10); cr[i].classList.add('novo');
        leva = Math.floor(s / 10);
        if (leva) { cv[i - 1].textContent = '1'; cv[i - 1].classList.add('novo'); }
      } else {
        let x = na[i] - leva;
        leva = 0;
        if (x < nb[i]) { x += 10; leva = 1; cv[i].textContent = '1'; cv[i].classList.add('novo'); }   // empresta da casa da esquerda
        const r = x - nb[i];
        const zeroEsq = i < n - Math.max(dec, 1) && r === 0 && [...na.slice(0, i)].every(v => v === 0);
        if (!zeroEsq) { cr[i].textContent = String(r); cr[i].classList.add('novo'); }
      }
      await dorme(MS_PASSO * 0.6, t);
    }
    if (op === '+' && leva) { cr[0].textContent = '1'; cr[0].classList.add('novo'); }
    if (dec) for (const s of lr.querySelectorAll('.lz-v')) s.classList.add('novo');
  }
  async function multiplicar(p, t) {
    const [ai, ad = ''] = String(p.a).split(','), [bi, bd = ''] = String(p.b).split(',');
    const A = ai + ad, B = bi + bd, dec = ad.length + bd.length;
    const parciais = [...B].reverse().map((d, k) => String(BigInt(A) * BigInt(d)) + '0'.repeat(k));
    const total = String(BigInt(A) * BigInt(B));
    const w = Math.max(A.length, B.length + 1, ...parciais.map(s => s.length), total.length) + 1;
    const bloco = div('lz-bloco lz-armada');
    const lin = (s, cls = '', op = '') => { const e = div('lz-arm-linha ' + cls, '', bloco); [...s.padStart(w, ' ')].forEach((c, i) => { const x = document.createElement('span'); x.className = 'lz-c' + (i === 0 && op ? ' op' : ''); x.textContent = i === 0 && op ? op : c === ' ' ? '' : c; e.appendChild(x); }); return e; };
    lin(A); lin(B, 'lz-traco', '×');
    await dorme(MS_PASSO, t);
    if (parciais.length > 1) {
      for (const [k, s] of parciais.entries()) { const e = lin(s, k === parciais.length - 1 ? 'lz-traco' : '', k === parciais.length - 1 ? '+' : ''); e.classList.add('novo'); await dorme(MS_PASSO * 0.8, t); }
    }
    const r = lin(total, 'lz-res');
    r.querySelectorAll('.lz-c').forEach(c => c.classList.add('novo'));
    if (dec) { await dorme(MS_PASSO * 0.6, t); rotulo(`${dec} ${dec === 1 ? 'casa' : 'casas'} depois da vírgula: ${num(Number(A) * Number(B) / 10 ** dec)}`); }
  }

  // ── divisão com chave: abaixa, quanto cabe, resto (com casas decimais: casas) ──
  async function divisao(p, t) {
    const a = Math.round(Number(p.a)), b = Math.round(Number(p.b)), casas = Math.max(0, Number(p.casas) || 0);
    const digs = [...String(a)];
    const bloco = div('lz-bloco lz-divisao');
    const esq = div('lz-div-esq', '', bloco), dir = div('lz-div-dir', `<div class="lz-div-b">${b}</div><div class="lz-div-q"></div>`, bloco);
    const topo = div('lz-div-linha lz-div-a', digs.map(d => `<span class="lz-c">${d}</span>`).join(''), esq);
    const qEl = dir.querySelector('.lz-div-q');
    await dorme(MS_PASSO, t);
    let resto = 0, q = '', i = 0, comecou = false, deci = 0;
    const desloc = (k) => `padding-left:${k * 0.62}em`;
    while (i < digs.length || (casas && deci < casas && resto !== 0)) {
      let d;
      if (i < digs.length) d = Number(digs[i]);
      else { if (!q.includes(',')) { q += ','; qEl.textContent = q; topo.insertAdjacentHTML('beforeend', '<span class="lz-c novo">,</span>'); } d = 0; topo.insertAdjacentHTML('beforeend', '<span class="lz-c zero">0</span>'); deci++; }
      const atual = resto * 10 + d;
      if (!comecou && atual < b && i < digs.length - 1) { resto = atual; i++; continue; }   // ainda não cabe: pega mais um algarismo
      comecou = true;
      const k = Math.floor(atual / b);
      div('lz-div-linha', `<span class="lz-abaixa">${atual}</span>`, esq).setAttribute('style', desloc(Math.max(0, i - String(atual).length + 1)));
      await dorme(MS_PASSO * 0.6, t);
      q += String(k); qEl.textContent = q; qEl.classList.add('novo');
      const sub = div('lz-div-linha lz-traco', `−${k * b}`, esq); sub.setAttribute('style', desloc(Math.max(0, i - String(k * b).length)));
      await dorme(MS_PASSO * 0.6, t);
      resto = atual - k * b;
      i++;
    }
    const r = div('lz-div-linha lz-res', `<span class="novo">${resto}</span>`, esq);
    r.setAttribute('style', desloc(Math.max(0, digs.length + deci - String(resto).length)));
    rotulo(resto ? `${a} ÷ ${b} = ${q.replace(/^0+(?=\d)/, '')}, resto ${resto}` : `${a} ÷ ${b} = ${q.replace(/^0+(?=\d)/, '')}`);
  }

  // ── reta numérica: a bolinha sai de `de` e anda cada valor de `anda` (contando as casinhas); ou as `bolas` para comparar ──
  async function reta(p, t) {
    const anda = (p.anda || []).map(Number), bolas = (p.bolas || []).map(Number), temDe = p.de !== undefined && p.de !== null;
    let pos = Number(p.de) || 0;
    const pts = [...bolas, ...(temDe ? [pos] : [])]; for (const d of anda) pts.push(pos += d);
    pos = Number(p.de) || 0;
    const min = Number.isFinite(p.min) ? p.min : Math.min(0, ...pts) - 1, max = Number.isFinite(p.max) ? p.max : Math.max(0, ...pts) + 1;
    const bloco = div('lz-bloco lz-reta');
    const x = (v) => ((v - min) / (max - min || 1)) * 100, passoTick = max - min > 24 ? 2 : 1;
    let html = '<div class="lz-reta-linha"></div>';
    for (let v = Math.ceil(min); v <= max; v++) html += `<span class="lz-reta-tick${v === 0 ? ' zero' : ''}" style="left:${x(v)}%"><i></i>${v % passoTick === 0 || v === 0 ? num(v) : ''}</span>`;
    bloco.innerHTML = html;
    if (!temDe && !bolas.length) { await dorme(MS_PASSO, t); return; }
    if (bolas.length) {   // comparar: as bolinhas aparecem; a mais à esquerda (menor) ou à direita (maior) acende
      for (const b of bolas) { bloco.insertAdjacentHTML('beforeend', `<span class="lz-reta-bola" data-v="${b}" style="left:${x(b)}%"><b>${num(b)}</b></span>`); await dorme(MS_PASSO * 0.5, t); }
      if (p.destaca) {
        const alvo = p.destaca === 'maior' ? Math.max(...bolas) : Math.min(...bolas);
        bloco.querySelector(`.lz-reta-bola[data-v="${alvo}"]`)?.classList.add('chegou');
        rotulo(`${p.destaca === 'maior' ? 'Mais à direita: o maior' : 'Mais à esquerda: o menor'} é ${num(alvo)}`);
      }
      await dorme(MS_PASSO, t);
      return;
    }
    bloco.insertAdjacentHTML('beforeend', `<span class="lz-reta-bola" style="left:${x(pos)}%"></span>`);
    const bola = bloco.querySelector('.lz-reta-bola');
    await dorme(MS_PASSO, t);
    for (const d of anda) {
      const passo = Math.sign(d);
      for (let k = 0; k < Math.abs(d); k++) {
        pos += passo; bola.style.left = x(pos) + '%';
        bloco.insertAdjacentHTML('beforeend', `<span class="lz-reta-conta" style="left:${x(pos)}%">${k + 1}</span>`);
        await dorme(Math.abs(d) > 8 ? 220 : 320, t);
      }
      rotulo(`${d > 0 ? 'anda ' + d + ' para a direita' : 'anda ' + Math.abs(d) + ' para a esquerda'} → ${num(pos)}`);
      await dorme(MS_PASSO * 0.6, t);
      for (const c of bloco.querySelectorAll('.lz-reta-conta')) c.remove();
    }
    bola.classList.add('chegou');
  }

  // ── a vírgula pulando casas (× ou ÷ por 10, 100, 1000): os zeros que faltam aparecem ──
  // um número na lousa cuja vírgula pula: no inteiro ela fica escondida (apagada) no fim, e aparece quando sai de lá
  function numeroVirgula(pai, v) {
    const [i0, d0 = ''] = String(v).replace('.', ',').split(',');
    const N = { digs: [...(i0 + d0)], pos: i0.length };
    const el = document.createElement('span'); el.className = 'lz-vnum'; pai.appendChild(el);
    N.desenhar = (zeros = [], pulou = false) => {
      el.innerHTML = N.digs.map((d, k) => (k === N.pos ? `<span class="lz-c lz-v${pulou ? ' pula' : ''}">,</span>` : '') + `<span class="lz-c${zeros.includes(k) ? ' zero novo' : ''}">${d}</span>`).join('') +
        (N.pos >= N.digs.length ? `<span class="lz-c lz-v oculta${pulou ? ' pula' : ''}">,</span>` : '');
    };
    N.pular = (dir) => {   // uma casa: true = direita (× 10), false = esquerda (÷ 10)
      const zeros = [];
      if (dir) { N.pos++; if (N.pos > N.digs.length) { N.digs.push('0'); zeros.push(N.digs.length - 1); } }
      else if (N.pos <= 1) { N.digs.unshift('0'); zeros.push(0); N.pos = 1; } else N.pos--;
      N.desenhar(zeros, true);
    };
    N.texto = () => {   // o número final, sem zeros sobrando
      let d = [...N.digs], p = N.pos;
      while (d.length > 1 && d[0] === '0' && p > 1) { d.shift(); p--; }
      let s = d.slice(0, p).join('') + (p < d.length ? ',' + d.slice(p).join('') : '');
      if (s.includes(',')) s = s.replace(/0+$/, '').replace(/,$/, '');
      return s;
    };
    N.final = () => { el.innerHTML = [...N.texto()].map(c => `<span class="lz-c novo${c === ',' ? ' lz-v' : ''}">${c}</span>`).join(''); };
    N.desenhar();
    return N;
  }
  async function virgula(p, t) {
    const op = p.op === '÷' || p.op === '/' ? '÷' : p.op === '×' || p.op === 'x' ? '×' : null, k = String(p.k || '');
    const casas = op ? Math.max(1, k.length - 1) : Math.max(1, Number(p.casas) || 1), dir = op ? op === '×' : p.lado !== 'esquerda';
    const bloco = div('lz-bloco lz-virgula');
    let zeros = [];
    if (op) {   // em cima, a conta (os zeros do k acendem); embaixo, o número com a vírgula pulando
      const c = div('lz-vconta', `<span>${esc(p.v)}</span><span class="lz-vop"> ${op} 1${'<span class="lz-z">0</span>'.repeat(casas)}</span><span class="lz-vigual"> =</span>`, bloco);
      zeros = [...c.querySelectorAll('.lz-z')];
    }
    const N = numeroVirgula(div('lz-vlinha', '', bloco), p.v);
    await dorme(MS_PASSO, t);
    for (let i = 0; i < casas; i++) {
      zeros[i]?.classList.add('aceso');
      N.pular(dir);
      await dorme(MS_PASSO * 0.75, t);
    }
    const res = N.texto();
    N.final();
    rotulo(op ? `${casas} ${casas === 1 ? 'zero' : 'zeros'}: a vírgula anda ${casas} ${casas === 1 ? 'casa' : 'casas'} para a ${dir ? 'direita' : 'esquerda'}` : `${p.v} → ${res}`);
  }

  // ── a escada das unidades: descer um degrau = × 10 (vírgula para a direita), subir = ÷ 10 (para a esquerda) ──
  async function escada(p, t) {
    const D = (p.degraus || []).map(String), i0 = D.indexOf(p.de), i1 = D.indexOf(p.para);
    const bloco = div('lz-bloco lz-escada');
    const deg = div('lz-esc-degraus', D.map((u, k) => `<span class="lz-esc-d" style="--k:${k}">${esc(u)}</span>`).join(''), bloco);
    const ds = [...deg.querySelectorAll('.lz-esc-d')];
    if (i0 < 0) { await dorme(MS_PASSO, t); return; }
    const bola = document.createElement('span'); bola.className = 'lz-esc-bola'; deg.appendChild(bola);
    const poe = (k) => { bola.style.left = `${ds[k].offsetLeft + ds[k].offsetWidth / 2}px`; bola.style.top = `${ds[k].offsetTop - 4}px`; ds.forEach((d, j) => d.classList.toggle('aqui', j === k)); };
    poe(i0);
    let N = null;
    const baixo = div('lz-esc-num', '', bloco);
    if (p.v !== undefined) { N = numeroVirgula(baixo, p.v); baixo.insertAdjacentHTML('beforeend', ` <b>${esc(D[i0])}</b>`); }
    await dorme(MS_PASSO, t);
    if (i1 < 0 || i1 === i0) return;
    const passo = i1 > i0 ? 1 : -1;
    for (let k = i0; k !== i1; k += passo) {
      poe(k + passo);
      if (N) { N.pular(passo > 0); baixo.querySelector('b').textContent = D[k + passo]; }
      rotulo(`${passo > 0 ? 'desceu' : 'subiu'} ${Math.abs(k + passo - i0)} ${Math.abs(k + passo - i0) === 1 ? 'degrau' : 'degraus'} · ${passo > 0 ? '× 10' : '÷ 10'}`);
      await dorme(MS_PASSO * 0.8, t);
    }
    bola.classList.add('chegou');
    if (N) { N.final(); rotulo(`${p.v} ${D[i0]} = ${N.texto()} ${D[i1]}`); }
  }

  // ── tabela de sinais: as linhas; { t: 'acende', i } destaca uma ──
  function tabela(p) { div('lz-bloco lz-tabela', (p.linhas || []).map((l, i) => `<div class="lz-tab-linha" data-i="${i}">${esc(l)}</div>`).join('')); }
  function acende(p) { const tb = [...Q.querySelectorAll('.lz-tabela')].pop(); if (tb) tb.querySelectorAll('.lz-tab-linha').forEach((l, i) => l.classList.toggle('aceso', i === Number(p.i))); }

  async function figura(p, t) {
    const caixa = div('lz-bloco lz-figura', '<svg></svg>');
    L.fig = criarFigura(caixa.querySelector('svg'));
    if (!L.fig.mostrar(p.figura)) { caixa.remove(); return; }
    await dorme(MS_PASSO * 0.6, t);
    await L.fig.animar().catch(() => {});
  }
  const rotulo = (s) => { ROT.textContent = s || ''; ROT.classList.toggle('vazio', !s); };
  const limparBlocos = () => { for (const b of Q.querySelectorAll('.lz-bloco, .lz-seta')) b.remove(); };

  async function passo(p, t) {
    switch (p.t) {
      case 'linha': linha(termos(p.v), p.classe ? 'lz-' + p.classe : ''); return dorme(MS_PASSO, t);
      case 'enunciado': div('lz-linha lz-enun', esc(p.v)); caber(); return dorme(MS_PASSO, t);
      case 'marca': { const l = ultima(); if (!l) return; const i = acha(l, p.v); if (i >= 0) marcar(l, i, i + termos(p.v).length - 1); return dorme(MS_PASSO, t); }
      case 'resolve': {
        const l = ultima(), tr = termos(String(p.v)), m = l ? spans(l).findIndex(s => s.classList.contains('marca')) : -1;
        const nova = termos(p.linha ?? p.v), de = Math.max(0, (() => { for (let i = Math.max(0, m - 1); i + tr.length <= nova.length; i++) if (tr.every((x, j) => nova[i + j] === x)) return i; return nova.findIndex((x) => x === tr[0]); })());
        novaLinha(nova, de, tr.length);
        return dorme(MS_PASSO, t);
      }
      case 'expressao': {
        const ps = passosExpressao(p.v);
        let l = linha(ps.length ? ps[0].antes : termos(p.v));
        await dorme(MS_PASSO, t);
        for (const s of ps) {
          marcar(l, s.de, s.ate);
          await dorme(MS_PASSO, t);
          l = novaLinha(s.depois, s.novo, 1);
          await dorme(MS_PASSO, t);
        }
        return;
      }
      case 'seta': seta(p); return dorme(MS_PASSO, t);
      case 'texto': rotulo(p.v); return dorme(MS_PASSO * 0.6, t);
      case 'armada': limparBlocos(); return armada(p, t);
      case 'divisao': limparBlocos(); return divisao(p, t);
      case 'reta': limparBlocos(); return reta(p, t);
      case 'virgula': limparBlocos(); return virgula(p, t);
      case 'escada': limparBlocos(); return escada(p, t);
      case 'tabela': limparBlocos(); tabela(p); return dorme(MS_PASSO, t);
      case 'acende': acende(p); return dorme(MS_PASSO, t);
      case 'figura': limparBlocos(); return figura(p, t);
      case 'pausa': return dorme(Number(p.ms) || MS_PASSO, t);
      default: return undefined;
    }
  }

  return {
    async tocar(passos = L.passos) {
      const t = ++L.token;
      L.passos = passos || []; L.pausado = false; L.fig?.cancelar(); L.fig = null;
      Q.innerHTML = ''; rotulo('');
      try { for (const p of L.passos) { if (!vivo(t)) return false; await passo(p, t); } } catch (e) { if (e !== CANCELADA) console.warn('[lousa]', e); return false; }
      return true;
    },
    cancelar() { L.token++; L.pausado = false; L.fig?.cancelar(); },
    pausar(sim = !L.pausado) { L.pausado = sim; L.fig?.pausar(sim); return L.pausado; },
    get pausado() { return L.pausado; },
  };
}

// Jogo de Revisão — 🧑‍🏫 a lousa animada da Aula do pet e do "▶ Ver como faz" (PROMPT-185). Só HTML/CSS, sem imagens.
//
//   const l = criarLousa(div)     uma lousa por elemento; cada uma tem a própria animação (cancelar / pausar)
//   await l.tocar(passos)         limpa e anima os passos, um por vez (~1,2 s cada); ↺: tocar de novo os mesmos
//   l.cancelar() · l.pausar(sim)
//
// PROMPT-191: a conta fica inteira na lousa (as linhas não saem); se não couber, a letra diminui (até --lz-k = 0,62) e só
// então as linhas mais antigas saem. Frações "a/b" numa linha aparecem empilhadas.
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
//   { t: 'acende', i: 3, soma: true, ms: 500 }                    PROMPT-197: soma = as de antes continuam acesas; ms = o tempo do passo
//   { t: 'grade100', n: 20 }                                      PROMPT-197: 100 quadradinhos (10 × 10), n pintados um a um: n%
//   { t: 'figura', figura: { tipo: 'pizza' | 'barras_iguais' | … } }      as figuras das frações (figuras.js)
//   { t: 'compara', esq: { titulo?, tipo?: 'errado' | 'certo' | 'neutro', passos | linhas }, dir: { … } }   PROMPT-191: duas colunas
//                                                                  animadas juntas, passo por passo (esq padrão: ✖ jeito errado ·
//                                                                  dir: ✔ jeito certo); no fim, o resultado errado riscado e o certo ✔
//   { t: 'fracao', p: 1, q: 4, explica?: true }                   a fração grande, empilhada (explica: o que é cada parte)
//   { t: 'fracoes', fr: [[1, 2], [2, 4]], op: '×' | '÷', k?: 2 | [2, 2] }   equivalentes: setas curvas em cima e embaixo
//   { t: 'barras', fr: [[1, 2], [2, 4]], rotulos?: ['0,5', …] }   barras do mesmo tamanho, uma embaixo da outra, com a parte pintada
//   { t: 'armada', …, sem_virgula: true }                         a conta armada sem as vírgulas (o engano "esqueceu a vírgula")
//   { t: 'pausa', ms: 800 }
import { tokU, num, arred } from './base.js';
import { criarFigura } from './figuras.js';

export const MS_PASSO = 1200;
const calmo = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const CANCELADA = Symbol('lousa cancelada');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// termos de uma linha: números (com vírgula), operações, = , parênteses e palavras
// PROMPT-197: potência, raiz, letra e % ficam colados no número (2³, (−2)², √16, 3x, x², 20%): um termo só
const termos = (s) => String(s).match(/\d+\/\d+|√\d+|\(−\d+(?:,\d+)?\)[⁰¹²³⁴⁵⁶⁷⁸⁹]*|(?<![\d)\]}])−\d+(?:,\d+)?(?:[a-z]+[⁰¹²³⁴⁵⁶⁷⁸⁹]*|[⁰¹²³⁴⁵⁶⁷⁸⁹]+|%)?|\d+(?:,\d+)?(?:[a-z]+[⁰¹²³⁴⁵⁶⁷⁸⁹]*|[⁰¹²³⁴⁵⁶⁷⁸⁹]+|%)?|[−+×÷=()[\]{}]|[^\s\d−+×÷=()[\]{}]+/g) || [];   // −5 colado: um número só

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

// da esquerda para a direita, sem a ordem das operações e sem os parênteses (o engano mais comum) — mesmo formato
export function passosSemOrdem(expr) {
  let t = tokU(expr).filter(x => typeof x === 'number' || !'()[]{}'.includes(x));
  const out = [];
  for (let guarda = 0; t.length >= 3 && guarda < 40; guarda++) {
    const [x, o, y] = t;
    if (typeof x !== 'number' || typeof y !== 'number') throw new Error('expressão inválida: ' + expr);
    const v = arred(o === '+' ? x + y : o === '−' ? x - y : o === '×' ? x * y : x / y), t2 = [v, ...t.slice(3)];
    out.push({ antes: vis(t), de: 0, ate: 2, depois: vis(t2), novo: 0, valor: v });
    t = t2;
  }
  return out;
}
// os passos de uma expressão (passosExpressao / passosSemOrdem) em passos da lousa, um por linha: a linha, a marca, a nova
// PROMPT-200: cada passo ganha a frase escrita ("O × vem antes: 2 × 3 = 6", "Por último o +: 5 + 6 = 11")
export function frasePasso(s, ultimo, outroGrupo = false) {
  const a0 = s.antes, g = '([{'.includes(a0[s.de]);
  const [a, o, b] = g ? [a0[s.de + 1], a0[s.de + 2], a0[s.de + 3]] : [a0[s.de], a0[s.de + 1], a0[s.de + 2]];
  const conta = `${a} ${o} ${b} = ${num(s.valor)}`;
  if (g) return `${outroGrupo ? 'Agora' : 'Primeiro'} dentro ${a0[s.de] === '(' ? 'dos parênteses ( )' : a0[s.de] === '[' ? 'dos colchetes [ ]' : 'das chaves { }'}: ${conta}`;
  if (ultimo) return `Por último o ${o}: ${conta}`;
  if (o === '×' || o === '÷') return `O ${o} vem antes: ${conta}`;
  return `Agora o ${o}: ${conta}`;
}
// PROMPT-202: × ou ÷ que cabe na tabuada (até 10 × 10): { op, a, b }; senão null
export function tabuadaDoPasso(s) {
  const a0 = s.antes, g = '([{'.includes(a0[s.de]);
  const [x, o, y] = g ? [a0[s.de + 1], a0[s.de + 2], a0[s.de + 3]] : [a0[s.de], a0[s.de + 1], a0[s.de + 2]];
  const n = (v) => Math.abs(Number(String(v).replace(/[()]/g, '').replace('−', '-').replace(',', '.')));
  const a = n(x), b = n(y);
  if (![a, b].every(Number.isInteger)) return null;
  if (o === '×' && a >= 1 && a <= 10 && b >= 0 && b <= 10) return { op: '×', a, b };
  if (o === '÷' && b >= 1 && b <= 10 && a % b === 0 && a / b >= 1 && a / b <= 10) return { op: '÷', a, b };
  return null;
}
export function lousaDePassos(ps, inicio, frases = true) {
  if (!ps?.length) return inicio ? [{ t: 'linha', v: inicio }] : [];
  const out = [{ t: '_linha', ts: ps[0].antes }];
  let grupos = 0;
  for (const [i, s] of ps.entries()) {
    out.push({ t: '_marca', de: s.de, ate: s.ate });
    const tb = frases && tabuadaDoPasso(s);   // PROMPT-202: × e ÷ de tabuada com a tabuada na lateral
    if (tb) out.push({ t: 'tabuada', ...tb, auto: true });
    out.push({ t: '_nova', ts: s.depois, de: s.novo, n: 1 });
    const grupo = '([{'.includes(s.antes[s.de]);
    if (frases) out.push({ t: 'escreve', v: frasePasso(s, i === ps.length - 1, grupo && grupos++ > 0), n: true, auto: true, cor: i === ps.length - 1 ? 'certo' : '' });
  }
  return out;
}
// 'expressao' vira passos de uma linha cada (para as colunas do compara andarem juntas)
function expandir(passos) {
  const out = [];
  for (const p of passos || []) {
    if (p?.t !== 'expressao') { out.push(p); continue; }
    let ps = [];
    try { ps = passosExpressao(p.v); } catch (_) {}
    out.push(...lousaDePassos(ps, p.v));
  }
  return out;
}
// PROMPT-200: a vírgula de um número (2,5 · 7, · ,05) sempre em destaque: amarela, maior
// (lista "1, 2, 3": a vírgula seguida de espaço e número não é decimal, fica normal — PROMPT-203)
const vir = (html) => String(html).replace(/(?<=\d),(?!\s+\d)|,(?=\d)/g, '<span class="lz-v">,</span>');
const fracHtml = (p, q, cls = '') => `<span class="lz-fr${cls}"><b>${esc(p)}</b><i></i><b>${esc(q)}</b></span>`;
const KMIN = 0.62;   // a menor letra (× o tamanho normal): ainda legível no celular deitado

// PROMPT-201: aoFalar(texto, cor) — com ele, as frases (escreve) e as legendas (rotulo) vão para o balão do pet, um passo de
// cada vez, e nada fica escrito embaixo da lousa. O título da página (tocar(passos, { titulo })) fica no alto da lousa.
export function criarLousa(raiz, { aoFalar = null } = {}) {
  raiz.classList.add('lz');
  raiz.classList.toggle('com-balao', !!aoFalar);
  raiz.innerHTML = '<div class="lz-titulo" hidden></div><div class="lz-quadro"></div><div class="lz-escrito"></div><div class="lz-rotulo"></div>';
  const Q0 = raiz.querySelector('.lz-quadro'), ROT0 = raiz.querySelector('.lz-rotulo'), ESC0 = raiz.querySelector('.lz-escrito'), TIT0 = raiz.querySelector('.lz-titulo');
  const L = { token: 0, pausado: false, passos: [], figs: [], k: 1, nEsc: 0, titulo: '' };
  const vivo = (t) => t === L.token;
  const dorme = async (ms, t) => {
    if (calmo()) ms = Math.min(ms, 150);
    let p = 0;
    while (p < ms) { if (!vivo(t)) throw CANCELADA; await new Promise(r => setTimeout(r, 40)); if (!L.pausado) p += 40; }
    if (!vivo(t)) throw CANCELADA;
  };
  // ── não coube: a letra diminui (até KMIN); só depois as linhas mais antigas saem ──
  function ajustar() {
    // cabe = a altura dos blocos cabe no quadro e nenhum bloco é mais largo que ele (os tracinhos soltos da reta não contam)
    const cabeEm = (box) => {
      const r = box.getBoundingClientRect(), fs = [...box.children].filter(e => getComputedStyle(e).position !== 'absolute');
      if (!fs.length || !r.height) return true;
      const rs = fs.map(e => e.getBoundingClientRect()), top = Math.min(...rs.map(x => x.top)), fim = Math.max(...rs.map(x => x.bottom));
      return fim - top <= r.height + 1 && rs.every(x => x.width <= r.width + 2);
    };
    const cabe = () => cabeEm(Q0) && [...Q0.querySelectorAll('.lz-col-q')].every(cabeEm);
    // PROMPT-200: as frases escritas também contam: a lousa inteira (conta + frases + legenda) tem que caber
    const sobra = () => { const r = raiz.getBoundingClientRect(), e = ESC0.getBoundingClientRect(), o = ROT0.getBoundingClientRect(); return !r.height || Math.max(e.bottom, o.bottom) <= r.bottom - 4; };
    const cabe2 = () => cabe() && sobra();
    const kmin = raiz.closest('.aula-v2') ? 0.45 : KMIN;   // PROMPT-204: no layout v2 a conta pode diminuir mais (nunca corta)
    for (let g = 0; g < 16 && !cabe2() && L.k > kmin; g++) { L.k = Math.max(kmin, Math.round((L.k - 0.06) * 100) / 100); raiz.style.setProperty('--lz-k', L.k); }
    for (let g = 0; g < 6 && !cabe2() && ESC0.children.length > 1; g++) ESC0.firstElementChild.remove();   // as frases mais antigas saem primeiro
    // PROMPT-201: ainda não coube: os blocos já feitos se recolhem (fica só o título)
    for (let g = 0; g < 4 && !cabe2(); g++) { const b = Q0.querySelector('.lz-blk.feito:not(.recolhido)'); if (!b) break; b.classList.add('recolhido'); }
    for (let g = 0; g < 20 && !cabe(); g++) {
      const velho = Q0.querySelector(':scope > .lz-linha, :scope > .lz-bloco');
      if (!velho || Q0.children.length <= 1) break;
      velho.remove();
    }
  }
  new MutationObserver(() => ajustar()).observe(Q0, { childList: true, subtree: true });
  // ── 📝 PROMPT-200: as frases escritas ficam embaixo da conta (as de antes um pouco mais claras); n: numeradas 1), 2)… ──
  function escrever(v, { cor = '', n = false } = {}) {
    if (aoFalar) { aoFalar(v, cor); return; }   // PROMPT-201: no balão do pet, só o passo atual
    const d = document.createElement('div');
    d.className = 'lz-esc-l' + (cor ? ' ' + cor : '');
    d.innerHTML = (n ? `${++L.nEsc}) ` : '') + vir(esc(v));
    ESC0.appendChild(d);
    while (ESC0.children.length > 6) ESC0.firstElementChild.remove();   // mais que isso: a página tem que ser dividida
    ajustar();
  }

  function motor(Q, ROT, { auto = true } = {}) {   // auto: as frases automáticas (a coluna do ✖ errado não escreve)
  const Qbase = Q;
  // ── PROMPT-201: um bloco numerado ("1º Conta as casas"): os passos seguintes desenham dentro dele; o da vez fica aceso ──
  function abreBloco(titulo) {
    for (const b of Qbase.querySelectorAll(':scope > .lz-blk')) { b.classList.remove('atual'); b.classList.add('feito'); }
    const b = document.createElement('div');
    b.className = 'lz-blk atual';
    b.innerHTML = `<div class="lz-blk-tit">${vir(esc(titulo || ''))}</div><div class="lz-blk-q"></div>`;
    Qbase.appendChild(b);
    Q = b.querySelector('.lz-blk-q');
  }
  const diz = (p, v, cor = '') => { if (auto && p?.frases !== false) escrever(v, { cor, n: true }); };
  const div = (cls, html = '', pai = Q) => { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; pai.appendChild(e); return e; };
  const ultima = () => [...Q.querySelectorAll(':scope > .lz-linha:not(.lz-enun)')].pop() || null;
  const termoHtml = (x) => { const f = /^(\d+)\/(\d+)$/.exec(x); return f ? fracHtml(f[1], f[2], ' lz-fr-in') : vir(esc(x)); };
  function linha(ts, cls = '') {
    const ant = ultima();   // a marca fica só na operação da vez (a linha logo acima da nova); as de antes se apagam
    for (const s of Q.querySelectorAll(':scope > .lz-linha .lz-t.marca')) if (s.parentElement !== ant) s.classList.remove('marca');
    return div('lz-linha ' + cls, ts.map((x, i) => `<span class="lz-t${/^[−+×÷=]$/.test(x) ? ' op' : ''}" data-i="${i}" data-v="${esc(x)}">${termoHtml(x)}</span>`).join(''));
  }
  const spans = (l) => [...l.querySelectorAll(':scope > .lz-t')];
  // o trecho (em termos) dentro da linha: índice do 1º termo, ou -1
  function acha(l, trecho) {
    const tl = spans(l).map(s => s.dataset.v ?? s.textContent), tt = termos(trecho);
    for (let i = 0; i + tt.length <= tl.length; i++) if (tt.every((x, j) => tl[i + j] === x)) return i;
    return -1;
  }
  function marcar(l, de, ate) { spans(l).forEach((s, i) => s.classList.toggle('marca', i >= de && i <= ate)); }
  function novaLinha(ts, de, n) {
    const l = linha(ts, 'vira');   // PROMPT-201: a setinha ↓ só quando uma linha vira a outra
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

  // ══ PROMPT-199: contas armadas passo a passo, como a professora faz no quadro ══
  // Cada algarismo é uma célula .lz-c (<b> = o algarismo; .lz-mks = os números pequenos por cima: empréstimo, vai 1).
  // A coluna da vez acende; setinhas curvas (SVG) ligam um algarismo a outro; a legenda (rotulo) narra cada passo
  // (essas legendas de passo podem ter números: são parte da animação).
  const MICRO = MS_PASSO * 0.8;
  function celula(linhaEl, ch, cls = '') {
    const c = document.createElement('span');
    c.className = 'lz-c' + (cls ? ' ' + cls : '');
    c.innerHTML = `<b>${esc(ch === ' ' ? '' : ch)}</b>`;
    linhaEl.appendChild(c);
    return c;
  }
  const dig = (c) => Number(c?.querySelector(':scope > b')?.textContent) || 0;   // célula vazia = 0
  const vazia = (c) => !c || !/\d/.test(c.querySelector(':scope > b')?.textContent || '');
  function escreve(c, v, cls = 'novo') { c.querySelector(':scope > b').textContent = String(v); for (const k of cls.split(' ').filter(Boolean)) c.classList.add(k); }
  function marca(c, v) {   // número pequeno por cima do algarismo (amarelo), sem empurrar a conta
    let mk = c.querySelector(':scope > .lz-mks');
    if (!mk) { mk = document.createElement('span'); mk.className = 'lz-mks'; c.appendChild(mk); }
    const s = document.createElement('i'); s.className = 'lz-mk'; s.textContent = String(v); mk.appendChild(s);
    return s;
  }
  // o número que vale agora: a última marca não riscada, ou o próprio algarismo
  const topoDe = (c) => [...c.querySelectorAll(':scope > .lz-mks > .lz-mk:not(.lz-risc)')].pop() || c.querySelector(':scope > b');
  const risca = (el) => el?.classList.add('lz-risc');
  const acendeCol = (linhas, i, sim = true) => { for (const l of linhas) l[i]?.classList.toggle('col-acesa', sim); };
  // setinha curva de um algarismo a outro, desenhando-se (~0,5 s); lado: descendo pela direita (abaixa, na divisão)
  function setaCurva(bloco, de, para, { lado = false, verde = false } = {}) {
    if (!de || !para) return;
    const r0 = bloco.getBoundingClientRect(), a = de.getBoundingClientRect(), b = para.getBoundingClientRect();
    let x1, y1, x2, y2, cx, cy;
    if (lado) {
      x1 = a.right - r0.left; y1 = a.top + a.height * 0.6 - r0.top; x2 = b.right - r0.left + 2; y2 = b.top + b.height * 0.4 - r0.top;
      cx = Math.max(x1, x2) + Math.max(14, Math.abs(y2 - y1) * 0.5); cy = (y1 + y2) / 2;
    } else {
      x1 = a.left + a.width / 2 - r0.left; x2 = b.left + b.width / 2 - r0.left; y1 = a.top - r0.top; y2 = b.top - r0.top;
      const alto = Math.max(12, Math.abs(x2 - x1) * 0.4);
      cx = (x1 + x2) / 2; cy = Math.min(y1, y2) - alto;
    }
    const ang = Math.atan2(y2 - cy, x2 - cx), h = 8;
    const ponta = `M${x2},${y2} L${x2 - h * Math.cos(ang - 0.5)},${y2 - h * Math.sin(ang - 0.5)} M${x2},${y2} L${x2 - h * Math.cos(ang + 0.5)},${y2 - h * Math.sin(ang + 0.5)}`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'lz-seta2' + (verde ? ' verde' : ''));
    svg.innerHTML = `<path class="arco" d="M${x1},${y1} Q${cx},${cy} ${x2},${y2}"/><path class="ponta" d="${ponta}"/>`;
    bloco.appendChild(svg);
    const arco = svg.querySelector('.arco'), len = arco.getTotalLength?.() || 200;
    arco.style.strokeDasharray = `${len}`; arco.style.strokeDashoffset = `${len}`;
    requestAnimationFrame(() => requestAnimationFrame(() => { arco.style.strokeDashoffset = '0'; svg.classList.add('vai'); }));
  }
  const limpaSetas = (bloco) => { for (const s of bloco.querySelectorAll(':scope > .lz-seta2')) s.remove(); };

  // ── soma coluna por coluna (2 ou mais linhas), da direita para a esquerda, com o "vai 1" pequeno em cima ──
  // linhas: as linhas de cima (a 1ª recebe os "vai 1"); R: a linha do resultado; cols: as colunas, da direita para a esquerda;
  // virg: a coluna da vírgula (ou -1); unid: a coluna das unidades (à esquerda dela, zero não aparece)
  async function somaColunas(bloco, linhas, R, cols, virg, unid, t, dizer = () => {}) {
    let vai = 0, vaiMk = null, nCol = 0;
    const todas = [...linhas, R];
    for (const [n, i] of cols.entries()) {
      limpaSetas(bloco);
      const ds = linhas.filter(l => !vazia(l[i])).map(l => dig(l[i]));
      if (!ds.length && !vai) continue;   // coluna vazia, sem "vai 1": nada a fazer
      acendeCol(todas, i);
      if (!ds.length) {   // sobrou "vai 1" na última coluna da esquerda: ele desce direto
        rotulo(`o vai ${vai} desce`);
        escreve(R[i], vai);
        dizer(`O vai ${vai} desce.`);
        await dorme(MS_PASSO, t);
        acendeCol(todas, i, false);
        break;
      }
      const s = ds.reduce((x, y) => x + y, 0) + vai;
      if (vaiMk) vaiMk.classList.add('aceso');
      rotulo(`${vai ? `${vai} + ` : ''}${ds.join(' + ')} = ${s}`);
      dizer(`${nCol++ ? '' : 'Soma da direita para a esquerda: '}${vai ? `${vai} + ` : ''}${ds.join(' + ')} = ${s}${s >= 10 && cols[n + 1] !== undefined && linhas.some(l => !vazia(l[cols[n + 1]])) ? `: fica ${s % 10}, vai ${Math.floor(s / 10)}` : ''}`);
      await dorme(MICRO, t);
      const fica = s % 10, prox = cols[n + 1];
      vai = Math.floor(s / 10); vaiMk = null;
      const temMais = prox !== undefined && linhas.some(l => !vazia(l[prox]));
      if (vai && !temMais) {   // a última coluna: o número inteiro desce (o "vai 1" junto)
        escreve(R[i], fica);
        if (prox !== undefined) { await dorme(MICRO * 0.6, t); rotulo(`fica ${fica}, o ${vai} desce`); escreve(R[prox], vai); }
        else escreve(R[i], s);
        vai = 0;
      } else {
        escreve(R[i], fica);
        if (vai) {
          rotulo(`fica ${fica}, vai ${vai}`);
          setaCurva(bloco, R[i], linhas[0][prox]);
          await dorme(MICRO * 0.6, t);
          vaiMk = marca(linhas[0][prox], vai);
        }
      }
      await dorme(MS_PASSO, t);
      acendeCol(todas, i, false);
      if (virg > 0 && i - 1 === virg) { rotulo('a vírgula desce'); escreve(R[virg], ','); dizer('A vírgula desce no mesmo lugar.'); await dorme(MICRO, t); }
    }
    limpaSetas(bloco);
    for (const mk of bloco.querySelectorAll('.lz-mk.aceso')) mk.classList.remove('aceso');
  }

  // ── subtração coluna por coluna, com o empréstimo (risca, escreve em cima, setinhas indo e voltando) ──
  async function subtraiColunas(bloco, A, B, R, cols, virg, unid, t, dizer = () => {}) {
    const val = A.map(dig), todas = [A, B, R];
    const anterior = (i) => cols[cols.indexOf(i) + 1];
    for (const i of cols) {
      limpaSetas(bloco);
      acendeCol(todas, i);
      const b = dig(B[i]);
      if (val[i] < b) {   // não dá: pega emprestado do vizinho da esquerda (e passa pelos zeros)
        const alvo = topoDe(A[i]);
        alvo.classList.add('circulo');
        rotulo(`${val[i]} − ${b}? Não dá!`);
        dizer(`${val[i]} − ${b} não dá: pega emprestado.`);
        await dorme(MS_PASSO, t);
        const caminho = [];
        let k = i, j = anterior(i);
        rotulo('pega emprestado ←');
        while (j !== undefined && val[j] === 0) {
          setaCurva(bloco, topoDe(A[k]), topoDe(A[j]), { verde: true });
          await dorme(MICRO, t);
          rotulo('esse também é 0…');
          caminho.push(j); k = j; j = anterior(j);
          await dorme(MICRO * 0.6, t);
        }
        if (j === undefined) { alvo.classList.remove('circulo'); break; }   // não acontece (a de cima é maior)
        setaCurva(bloco, topoDe(A[k]), topoDe(A[j]), { verde: true });
        await dorme(MICRO, t);
        risca(topoDe(A[j]));
        val[j] -= 1;
        marca(A[j], val[j]);
        rotulo(`empresta 1: fica ${val[j]}`);
        await dorme(MS_PASSO, t);
        let de = j;
        for (const m of caminho.reverse()) {   // volta: cada zero vira 10 e empresta 1, ficando 9
          limpaSetas(bloco);
          setaCurva(bloco, topoDe(A[de]), topoDe(A[m]), { verde: true });
          await dorme(MICRO * 0.6, t);
          marca(A[m], 10); rotulo('vira 10');
          await dorme(MICRO, t);
          risca(topoDe(A[m])); val[m] = 9; marca(A[m], 9); rotulo('empresta 1: fica 9');
          await dorme(MICRO, t);
          de = m;
        }
        limpaSetas(bloco);
        setaCurva(bloco, topoDe(A[de]), topoDe(A[i]), { verde: true });
        await dorme(MICRO * 0.6, t);
        val[i] += 10;
        marca(A[i], val[i]);
        rotulo(`vira ${val[i]}`);
        alvo.classList.remove('circulo');
        await dorme(MS_PASSO, t);
        limpaSetas(bloco);
      }
      const r = val[i] - b;
      rotulo(`${val[i]} − ${b} = ${r}`);
      dizer(`${val[i]} − ${b} = ${r}`);
      await dorme(MICRO * 0.6, t);
      const zeroEsq = i < unid && r === 0 && cols.filter(c => c < i).every(c => val[c] === 0 && dig(B[c]) === 0);
      if (!zeroEsq) escreve(R[i], r);
      await dorme(MS_PASSO, t);
      acendeCol(todas, i, false);
      if (virg > 0 && i - 1 === virg) { rotulo('a vírgula desce'); escreve(R[virg], ','); dizer('A vírgula desce no mesmo lugar.'); await dorme(MICRO, t); }
    }
  }

  // ── conta armada de + e −: vírgula embaixo de vírgula, os zeros que completam aparecem um a um ──
  async function armada(p, t) {
    const op = p.op === '-' ? '−' : p.op;
    if (p.sem_virgula) p = { ...p, sem_virgula: false, a: String(p.a).replace(',', ''), b: String(p.b).replace(',', '') };   // o engano: as vírgulas somem
    if (op === '×') return multiplicar(p, t);
    const [ai, ad = ''] = String(p.a).split(','), [bi, bd = ''] = String(p.b).split(',');
    const dec = Math.max(ad.length, bd.length), ni = Math.max(ai.length, bi.length) + (op === '+' ? 1 : 0);
    // PROMPT-201: casas diferentes → "1º O 3 vira 3,00" (os zeros entram) e "2º Arma e subtrai"
    const blocos = dec > 0 && ad.length !== bd.length && p.blocos !== false;   // PROMPT-204: blocos: false = tudo dentro da conta armada
    if (blocos) {
      const [curto, outro, falta] = ad.length < bd.length ? [String(p.a), String(p.b), bd.length - ad.length] : [String(p.b), String(p.a), ad.length - bd.length];
      const pronto = (curto.includes(',') ? curto : curto + ',') + '0'.repeat(falta);
      const n0 = Number(p.n0) || 1;
      abreBloco(`${n0}º O ${curto} vira ${pronto}`);
      await zerosNoFim({ v: curto, n: falta }, t);
      diz(p, `${outro} tem ${plural(dec, 'casa', 'casas')} depois da vírgula: completa o ${curto} com ${plural(falta, 'zero', 'zeros')}: ${pronto}`);
      await dorme(MS_PASSO * 1.2, t);
      diz(p, 'Zero no fim não muda nada!');
      await dorme(MS_PASSO * 0.8, t);
      abreBloco(op === '+' ? `${n0 + 1}º Arma e soma` : `${n0 + 1}º Arma e subtrai`);
    }
    const bloco = div('lz-bloco lz-armada');
    const linha = (int, de, sinal, cls) => {
      const l = div('lz-arm-linha ' + cls, '', bloco), cs = [celula(l, sinal, sinal ? 'op' : '')];
      for (const ch of int.padStart(ni, ' ')) cs.push(celula(l, ch));
      if (dec) {
        cs.push(celula(l, ',', 'virg' + (de.length ? '' : ' zero esconde')));
        for (let k = 0; k < dec; k++) cs.push(celula(l, de[k] ?? '0', k < de.length ? '' : 'zero esconde'));
      }
      return cs;
    };
    const A = linha(ai, ad, '', 'com-vai'), B = linha(bi, bd, op, 'lz-traco');
    const l = div('lz-arm-linha lz-res', '', bloco), R = A.map(() => celula(l, ''));
    const virg = dec ? 1 + ni : -1, unid = dec ? virg - 1 : A.length - 1;
    const cols = A.map((_, i) => i).filter(i => i > 0 && i !== virg).reverse();
    const dizer = (v, cor) => diz(p, v, cor);
    await dorme(MS_PASSO, t);
    if (dec) dizer('Vírgula embaixo de vírgula.');
    if (blocos) for (const c of bloco.querySelectorAll('.esconde')) c.classList.remove('esconde');   // os zeros já entraram no 1º bloco
    const esc0 = [...bloco.querySelectorAll('.esconde')];
    if (esc0.length) {   // PROMPT-204: completa com zero DENTRO da conta: a vírgula escondida surge; a casa vazia pisca e o 0 entra
      const [curto, falta] = ad.length < bd.length ? [String(p.a), bd.length - ad.length] : [String(p.b), ad.length - bd.length];
      const pronto = (curto.includes(',') ? curto : curto + ',') + '0'.repeat(falta);
      const virgs = esc0.filter(c => c.classList.contains('virg')), zeros = esc0.filter(c => !c.classList.contains('virg'));
      if (virgs.length) {
        dizer(`O ${curto} tem uma vírgula escondida no fim.`);
        for (const c of virgs) { c.classList.remove('esconde'); c.classList.add('surge-c'); }
        await dorme(MS_PASSO * 1.3, t);
      }
      dizer(falta === 1 ? `O ${curto} tem uma casa vazia aqui.` : `Faltam ${plural(falta, 'casa', 'casas')}: completa com zero.`);
      for (const c of zeros) { c.classList.remove('esconde'); c.classList.add('vazia'); }
      await dorme(MS_PASSO * 1.3, t);
      for (const c of zeros) { c.classList.remove('vazia'); await dorme(MICRO * 0.5, t); c.classList.add('entra0'); }
      dizer(`Zero no fim, depois da vírgula, não muda o número: ${curto} = ${pronto}.`);
      await dorme(MS_PASSO * 1.2, t);
    }
    if (op === '−') await subtraiColunas(bloco, A, B, R, cols, virg, unid, t, dizer);
    else await somaColunas(bloco, [A, B], R, cols, virg, unid, t, dizer);
    limpaSetas(bloco);
    if (p.fim !== false) dizer(`${p.a} ${op} ${p.b} = ${R.map(c => c.querySelector(':scope > b').textContent).join('').trim()}`, 'certo');
  }

  // ── PROMPT-204: { t: 'comparadec', v: ['0,5', '0,14'] }: um embaixo do outro, vírgula embaixo de vírgula; a casa vazia
  //    pisca e o 0 entra; depois a frente e a vírgula ficam cinza e os números de depois da vírgula acendem ──
  async function comparaDec(p, t) {
    const vs = (p.v || []).map(String), partes = vs.map(x => { const [i, d = ''] = x.split(','); return { i, d }; });
    const ni = Math.max(...partes.map(x => x.i.length)), dec = Math.max(...partes.map(x => x.d.length));
    const bloco = div('lz-bloco lz-armada lz-compdec');
    const linhas = partes.map(({ i, d }) => {
      const l = div('lz-arm-linha', '', bloco), cs = [];
      for (const ch of i.padStart(ni, ' ')) cs.push(celula(l, ch, 'int'));
      cs.push(celula(l, ',', 'virg'));
      for (let k = 0; k < dec; k++) cs.push(celula(l, d[k] ?? '0', k < d.length ? 'dec' : 'dec zero esconde'));
      return cs;
    });
    await dorme(MS_PASSO, t);
    diz(p, 'Para comparar, iguala as casas.');
    await dorme(MS_PASSO, t);
    const esc0 = [...bloco.querySelectorAll('.esconde')];
    if (esc0.length) {
      const curto = vs[partes.findIndex(x => x.d.length < dec)];
      const pronto = vs.map((x, k) => x + '0'.repeat(dec - partes[k].d.length));
      diz(p, `${vs.map((x, k) => `${x} tem ${plural(partes[k].d.length, 'casa', 'casas')}`).join(' e ')}. Completa com zero: ${curto} = ${pronto[vs.indexOf(curto)]}.`);
      for (const c of esc0) { c.classList.remove('esconde'); c.classList.add('vazia'); }
      await dorme(MS_PASSO * 1.3, t);
      for (const c of esc0) { c.classList.remove('vazia'); c.classList.add('entra0'); await dorme(MICRO * 0.5, t); }
      await dorme(MS_PASSO * 0.8, t);
    }
    const sem = partes.map(x => String(Number(x.d.padEnd(dec, '0'))));
    bloco.classList.add('semv');
    diz(p, `Agora compara sem a vírgula: ${sem.join(' e ')}.`);
    await dorme(MS_PASSO * 1.4, t);
  }

  // ══ PROMPT-203 ══
  // { t: 'escondido', v: '2x', mostra: '2 × x', onde: 1 }: a coisa escondida surge piscando na posição `onde` (em termos)
  async function escondido(p, t) {
    linha(termos(p.v));
    await dorme(MS_PASSO * 0.8, t);
    const l = linha(termos(p.mostra), 'vira');
    const ss = spans(l), alvo = ss[Number(p.onde) || 0];
    alvo?.classList.add('surge-t');
    diz(p, p.fala || `Estava escondido aqui: ${p.v} = ${p.mostra}`);
    await dorme(MS_PASSO * 1.4, t);
  }
  // a lateral genérica (como a tabuada): linhas fixas, clarinhas; { t: 'lateral', linhas: [...], acende: [i…], col: 2 }
  function painelLateral(linhas, col = 1, chave = '') {
    let tab = Qbase.querySelector(`:scope > .lz-tablat[data-col="${col}"]`);
    if (!tab || tab.dataset.chave !== chave) {
      tab?.remove();
      tab = document.createElement('div');
      tab.className = 'lz-tablat' + (col === 2 ? ' col2' : '');
      tab.dataset.col = col; tab.dataset.chave = chave;
      tab.innerHTML = linhas.map(l => `<div>${vir(esc(l))}</div>`).join('');
      Qbase.appendChild(tab);
    }
    return tab;
  }
  async function lateral(p, t) {
    const tab = painelLateral(p.linhas || [], p.col || 1, (p.linhas || []).join('|'));
    tab.classList.remove('some');
    for (const l of tab.children) l.classList.remove('exato', 'olha');
    for (const i of [].concat(p.acende ?? [])) { tab.children[i]?.classList.add('exato'); await dorme(MS_PASSO * 0.5, t); }
    await dorme(MS_PASSO * 0.5, t);
  }
  // { t: 'tabuada', quadrados: true, procura: [81] } — a tabela de quadrados (1 × 1 … 12 × 12) na lateral
  // { t: 'tabuada', b: 4, alvo: 28 } — está na tabuada? o marcador desce até chegar (✔ é múltiplo) ou passar (✖ pulou)
  async function tabuadaBusca(p, t) {
    const quad = !!p.quadrados, b = Number(p.b), alvo = Number(p.alvo);
    const n = quad ? 12 : 10, linhas = Array.from({ length: n }, (_, m) => (quad ? `${m + 1} × ${m + 1} = ${(m + 1) ** 2}` : `${b} × ${m + 1} = ${b * (m + 1)}`));
    const tab = painelLateral(linhas, p.col || 1, linhas.join('|'));
    tab.classList.remove('some');
    for (const l of tab.children) l.className = '';
    const val = (m) => (quad ? (m + 1) ** 2 : b * (m + 1));
    const procura = quad ? (p.procura || []).map(Number) : [alvo];
    diz(p, quad ? `Raiz: qual número vezes ele mesmo dá ${procura[0]}? Vamos procurar na tabela…` : `${alvo} está na tabuada do ${b}?`);
    await dorme(MS_PASSO * 0.6, t);
    for (let m = 0; m < n; m++) {
      const l = tab.children[m], v = val(m);
      l.classList.add('olha');
      await dorme(MS_PASSO * 0.3, t);
      l.classList.remove('olha');
      if (procura.includes(v)) {
        l.classList.add('exato');
        diz(p, quad ? `${m + 1} × ${m + 1} = ${v}. A raiz é ${m + 1}!` : `${b} × ${m + 1} = ${v}: está na tabuada, é múltiplo!`);
        break;
      }
      if (!quad && v > alvo) {
        l.classList.add('passou');
        diz(p, `Pulou o ${alvo}: não é múltiplo de ${b}.`);
        break;
      }
      l.classList.add('cabe');
    }
    await dorme(MS_PASSO, t);
  }
  // { t: 'bolinhas', n: 10, grupo: 3 }: as bolinhas separadas em grupos; as que sobram piscam (o resto)
  async function bolinhas(p, t) {
    const n = Number(p.n), g = Number(p.grupo), grupos = Math.floor(n / g), resto = n % g;
    const b = div('lz-bloco lz-bolinhas', '');
    for (let k = 0; k < grupos; k++) b.insertAdjacentHTML('beforeend', `<span class="lz-gr">${'<i></i>'.repeat(g)}</span>`);
    if (resto) b.insertAdjacentHTML('beforeend', `<span class="lz-gr resto">${'<i></i>'.repeat(resto)}</span>`);
    const grs = [...b.children];
    for (const gr of grs) { gr.classList.add('aparece'); await dorme(MS_PASSO * 0.45, t); }
    if (resto) diz(p, `${grupos} grupos de ${g} e sobra ${resto}: resto ${resto}.`);
    await dorme(MS_PASSO, t);
  }
  // { t: 'algarismos', v: '352' }: cada algarismo numa caixinha; depois o último acende
  async function algarismos(p, t) {
    const b = div('lz-bloco lz-algs', [...String(p.v)].map(d => `<span>${esc(d)}</span>`).join(''));
    await dorme(MS_PASSO, t);
    b.lastElementChild?.classList.add('aceso');
    await dorme(MS_PASSO * 0.8, t);
  }
  // { t: 'termos', v: '5x + 3 − 2x + 4', cores: true }: cada termo numa caixinha; com cores, os iguais da mesma cor
  async function termosPasso(p, t) {
    const ts = String(p.v).split(/\s+/);
    const letra = (x) => (/[a-z]/.exec(x)?.[0] ? x.replace(/^[−-]?\d*/, '') : 'num');
    const b = div('lz-linha lz-termos', ts.map(x => (/^[+−-]$/.test(x) ? `<span class="lz-t op">${esc(x)}</span>` : `<span class="lz-tm" data-l="${esc(letra(x))}">${vir(esc(x))}</span>`)).join(''));
    await dorme(MS_PASSO * 0.8, t);
    if (p.cores) { b.classList.add('cores'); await dorme(MS_PASSO, t); }
  }
  // { t: 'perimetro', lados: ['x', 'x', 'x', 'x'] }: a figura com o que vale cada lado; a volta acende lado por lado
  async function perimetro(p, t) {
    const ls = p.lados || [], ret = ls[0] !== ls[1];
    const b = div('lz-bloco lz-perim' + (ret ? ' ret' : ''), `<div class="fig">${ls.map((l, i) => `<span class="lado l${i}">${vir(esc(l))}</span>`).join('')}</div>`);
    const lados = [...b.querySelectorAll('.lado')];
    await dorme(MS_PASSO * 0.6, t);
    for (const l of lados) { l.classList.add('aceso'); await dorme(MS_PASSO * 0.55, t); }
  }

  // ══ PROMPT-202 ══
  // { t: 'tabuada', op: '×', a: 2, b: 3 } · { t: 'tabuada', op: '÷', a: 20, b: 4 } · { t: 'tabuada', b: 2, procura: [6, 12] }
  // A tabuada do número na lateral direita, clarinha; o marcador desce do menor até a linha certa, que fica verde.
  async function tabuadaLateral(p, t) {
    const op = p.op, a = Math.abs(Number(p.a)), b = Math.abs(Number(p.b));
    const base = op === '×' ? a : b, procura = op === '×' ? [a * b] : op === '÷' ? [a] : (p.procura || []).map(Number);
    if (!(base >= 1 && base <= 25)) return;   // PROMPT-204: até o 25 (25 × 4 = 100)
    const tab = painelLateral(Array.from({ length: 10 }, (_, m) => `${base} × ${m + 1} = ${base * (m + 1)}`), p.col || 1, `tab${base}`);   // PROMPT-203: col 2 = uma 2ª tabuada ao lado
    tab.classList.remove('some');
    for (const l of tab.children) l.className = '';
    const ls = [...tab.children];
    if (op === '÷') diz(p, `Dividir é perguntar: ${b} vezes quanto dá ${a}?`);
    else if (op === '×') diz(p, `Procura na tabuada do ${a}: ${a} × ${b}`);
    else diz(p, `Procura na tabuada do ${base}: ${procura.join(' e ')}`);
    await dorme(MS_PASSO * 0.6, t);
    const ultimo = Math.max(...ls.map((_, m) => (procura.includes(base * (m + 1)) ? m : -1)));
    for (const [m, l] of ls.entries()) {
      if (m > ultimo) break;
      l.classList.add('olha');
      await dorme(MS_PASSO * 0.3, t);
      l.classList.remove('olha');
      if (procura.includes(base * (m + 1))) { l.classList.add('exato'); await dorme(MS_PASSO * 0.3, t); }
    }
    if (op === '÷') diz(p, `${b} × ${a / b} = ${a}. Então ${a} ÷ ${b} = ${a / b}`);
    else if (op === '×') diz(p, `${a} × ${b} = ${a * b}`);
    await dorme(MS_PASSO, t);
    if (!p.manter) tab.classList.add('some');
  }
  // { t: 'lese', s: '×', v: 'vezes' }: um quadrinho no canto da lousa com o nome do símbolo (na 1ª vez que ele aparece)
  function lese(p) {
    let box = Q0.querySelector(':scope > .lz-vocab');   // no canto de cima da área da conta (não tapa o título)
    if (!box) { box = document.createElement('div'); box.className = 'lz-vocab'; Q0.appendChild(box); }
    box.insertAdjacentHTML('beforeend', `<div><b>${vir(esc(p.s))}</b> ${esc(p.v)}</div>`);
    diz(p, `${p.s} lê-se "${p.v}".`);
  }
  // { t: 'palavras', v: 'Comprei 3 cadernos…', marcas: [['3 cadernos de R$ 4', '3 × 4', 'fala?'], …] }:
  // o problema escrito; as palavras-chave são sublinhadas uma a uma e viram um pedacinho da conta
  async function palavras(p, t) {
    let html = esc(p.v);
    const ms = p.marcas || [];
    ms.forEach(([trecho], i) => { html = html.replace(esc(trecho), `<span class="lz-pal" data-i="${i}">${esc(trecho)}</span>`); });
    const el = div('lz-palavras', vir(html));
    await dorme(MS_PASSO * 0.8, t);
    for (const [i, [trecho, vira, fala]] of ms.entries()) {
      const s = el.querySelector(`.lz-pal[data-i="${i}"]`);
      if (!s) continue;
      s.classList.add('sub');
      s.insertAdjacentHTML('afterend', `<span class="lz-vira">→ ${vir(esc(vira))}</span>`);
      diz(p, fala || `"${trecho}" → ${vira}`);
      await dorme(MS_PASSO * 1.1, t);
    }
  }
  // { t: 'caixinhas' }: ( ) dentro de [ ] dentro de { }, em cores diferentes, acendendo de dentro para fora
  async function caixinhas(p, t) {
    const b = div('lz-bloco lz-caixinhas', '<span class="cx ch"><i>{</i><span class="cx co"><i>[</i><span class="cx pa"><i>(</i><b>…</b><i>)</i></span><i>]</i></span><i>}</i></span>');
    await dorme(MS_PASSO * 0.6, t);
    for (const k of ['pa', 'co', 'ch']) { b.querySelector('.' + k).classList.add('aceso'); await dorme(MS_PASSO * 0.8, t); }
  }

  // ── PROMPT-201: um número com as casas depois da vírgula separadas (para acender numeradas / ficar cinza) ──
  const numCasas = (v) => {
    const [i0, d0] = String(v).split(',');
    return `<span class="lz-nc"><span class="lz-ni">${esc(i0)}</span>${d0 !== undefined ? `<span class="lz-v">,</span><span class="lz-nd">${[...d0].map(d => `<span class="lz-cs">${d}</span>`).join('')}</span>` : ''}</span>`;
  };
  async function acendeCasas(l, t) {   // as casas depois da vírgula de cada número acendem, numeradas 1, 2…
    for (const nd of l.querySelectorAll('.lz-nd')) {
      for (const [k, c] of [...nd.children].entries()) { c.classList.add('casa'); c.dataset.n = k + 1; await dorme(MICRO * 0.7, t); }
    }
  }
  // { t: 'casas', v: ['0,5', '0,14'] }: os números lado a lado, as casas acendendo numeradas
  async function casasPasso(p, t) {
    const l = div('lz-linha lz-casas', (p.v || []).map(numCasas).join('<span class="lz-t op">e</span>'));
    await dorme(MS_PASSO * 0.7, t);
    await acendeCasas(l, t);
  }
  // { t: 'semvirgula', v: ['0,50', '0,14'] }: a parte da frente e a vírgula ficam cinza; os números de depois, em destaque
  async function semVirgulaPasso(p, t) {
    const l = div('lz-linha lz-casas', (p.v || []).map(numCasas).join('<span class="lz-t op">e</span>'));
    await dorme(MS_PASSO * 0.8, t);
    l.classList.add('sem-virgula');
    await dorme(MS_PASSO, t);
  }
  // ── × com vírgula, na ordem da professora: 1º conta as casas · 2º multiplica sem a vírgula · 3º anda a vírgula ──
  async function multiplicarDecimal(p, t) {
    const dizer = (v, cor) => diz(p, v, cor);
    const [ai, ad = ''] = String(p.a).split(','), [bi, bd = ''] = String(p.b).split(',');
    const dec = ad.length + bd.length;
    const As = (ai + ad).replace(/^0+(?=\d)/, ''), Bs = (bi + bd).replace(/^0+(?=\d)/, ''), total = String(BigInt(As) * BigInt(Bs));
    const n0 = Number(p.n0) || 1, sb = p.blocos === false;   // PROMPT-204: sem blocos = tudo na mesma conta
    const abre = (tit) => { if (!sb) abreBloco(tit); };
    abre(`${n0}º Conta as casas depois da vírgula`);
    const l = div('lz-linha lz-casas', `${numCasas(p.a)}<span class="lz-t op">×</span>${numCasas(p.b)}`);
    await dorme(MS_PASSO * 0.6, t);
    dizer(sb ? 'Primeiro conta as casas depois da vírgula.' : 'Conta as casas depois da vírgula em cada número.');
    await acendeCasas(l, t);
    const g = div('lz-linha lz-soma-casas', `${esc(plural(ad.length, 'casa', 'casas'))} + ${esc(plural(bd.length, 'casa', 'casas'))} = <span class="lz-guarda">${dec}</span> ${dec === 1 ? 'casa' : 'casas'}`);
    const temN = (x, n) => (n ? `${x} tem ${n}.` : `O ${x} não tem nenhuma.`);
    dizer(`${temN(p.a, ad.length)} ${temN(p.b, bd.length)} ${dec === 1 ? 'É 1 casa.' : `São ${dec} casas.`}`);
    await dorme(MS_PASSO * 1.2, t);
    abre(`${n0 + 1}º Multiplica sem a vírgula`);
    if (sb) { l.classList.add('sem-virgula'); await dorme(MS_PASSO * 0.6, t); }
    dizer(`Agora esquece a vírgula: ${As} × ${Bs}`);
    await dorme(MICRO, t);
    await multiplicar({ ...p, a: As, b: Bs, interno: true, fim: false }, t);
    dizer(`${As} × ${Bs} = ${total}`);
    await dorme(MICRO, t);
    abre(`${n0 + 2}º Anda a vírgula`);
    g.querySelector('.lz-guarda')?.classList.add('aceso');
    dizer(sb ? `Ela anda ${dec === 1 ? 'a casa' : `as ${dec} casas`} para a esquerda.` : `Tinha ${plural(dec, 'casa', 'casas')}: a vírgula anda ${plural(dec, 'casa', 'casas')} para a esquerda.`);
    await dorme(MS_PASSO, t);
    await virgula({ v: total, casas: dec, lado: 'esquerda', fim: false, frases: p.frases }, t);
    if (p.fim !== false) dizer(`${p.a} × ${p.b} = ${num(Number(total) / 10 ** dec)}`, 'certo');
  }

  // ── multiplicação armada: o algarismo de baixo acende e uma setinha vai a cada algarismo de cima; vai 1 pequeno em cima;
  //    com dois algarismos embaixo, uma linha para cada (a 2ª anda uma casa) e depois soma as linhas; a vírgula no fim ──
  async function multiplicar(p, t) {
    if (!p.interno && /,/.test(`${p.a}${p.b}`)) return multiplicarDecimal(p, t);   // PROMPT-201: com vírgula, em 3 blocos
    const [ai, ad = ''] = String(p.a).split(','), [bi, bd = ''] = String(p.b).split(',');
    const Ad = ai + ad, Bd = bi + bd, dec = ad.length + bd.length;
    const As = Ad.replace(/^0+(?=\d)/, ''), Bs = Bd.replace(/^0+(?=\d)/, '');   // os zeros da frente não entram na conta
    const parciais = [...Bs].reverse().map((d, k) => String(BigInt(As) * BigInt(d)).length + k);
    const total = String(BigInt(As) * BigInt(Bs)).padStart(dec + 1, '0');
    const w = Math.max(Ad.length, Bd.length + 1, ...parciais, total.length) + 1;
    const bloco = div('lz-bloco lz-armada');
    const linha = (s, cls, sinal = '') => {   // alinhada pela direita; a vírgula fica colada no algarismo (não ocupa coluna)
      const l = div('lz-arm-linha ' + cls, '', bloco), cs = [];
      const ch = s.padStart(w, ' ');
      for (let i = 0; i < w; i++) cs.push(celula(l, i === 0 && sinal ? sinal : ch[i], i === 0 && sinal ? 'op' : ''));
      return cs;
    };
    const naPos = (cs, pos) => cs[w - 1 - pos];   // a célula pela posição contada da direita (0 = unidade)
    const virgula = (cs, casas) => { if (casas) naPos(cs, casas).insertAdjacentHTML('beforeend', '<i class="lz-vc">,</i>'); };
    const LA = linha(Ad, 'com-vai'), LB = linha(Bd, 'lz-traco', '×');
    virgula(LA, ad.length); virgula(LB, bd.length);
    const varias = Bs.length > 1;
    const P = varias ? [...Bs].map((_, k) => linha('', 'lz-parcial' + (k === 0 ? ' com-vai' : '') + (k === Bs.length - 1 ? ' lz-traco' : ''), k === Bs.length - 1 ? '+' : '')) : [];
    const R = linha('', 'lz-res');
    const dizer = (v, cor) => diz(p, v, cor);
    await dorme(MS_PASSO, t);
    if (dec) dizer(`Faz a conta sem a vírgula: ${As} × ${Bs}`);
    for (let k = 0; k < Bs.length; k++) {
      const row = varias ? P[k] : R, d = Number(Bs[Bs.length - 1 - k]), bCel = naPos(LB, k);
      limpaSetas(bloco);
      if (k > 0) {   // a 2ª linha: os "vai 1" da 1ª saem e a linha anda uma casa
        for (const mk of bloco.querySelectorAll('.lz-mks')) mk.remove();
        rotulo('anda uma casa');
        for (let z = 0; z < k; z++) escreve(naPos(row, z), '0', 'desloc');
        await dorme(MS_PASSO, t);
      }
      bCel.classList.add('aceso');
      let vai = 0, vaiMk = null;
      for (let j = 0; j < As.length; j++) {
        limpaSetas(bloco);
        const aCel = naPos(LA, j), a = Number(As[As.length - 1 - j]), pr = d * a, v = pr + vai;
        aCel.classList.add('col-acesa');
        setaCurva(bloco, bCel, aCel);
        rotulo(vai ? `${d} × ${a} = ${pr}, + ${vai} = ${v}` : `${d} × ${a} = ${pr}`);
        if (vaiMk) { vaiMk.classList.add('aceso'); await dorme(MICRO * 0.6, t); risca(vaiMk); }   // o vai 1 é usado e riscado
        await dorme(MICRO, t);
        const ultimo = j === As.length - 1;
        escreve(naPos(row, j + k), v % 10);
        vai = Math.floor(v / 10); vaiMk = null;
        if (ultimo && vai) { await dorme(MICRO * 0.5, t); escreve(naPos(row, j + k + 1), vai); vai = 0; }
        else if (vai) {
          await dorme(MICRO * 0.5, t);
          rotulo(`fica ${v % 10}, vai ${vai}`);
          setaCurva(bloco, naPos(row, j + k), naPos(LA, j + 1));
          await dorme(MICRO * 0.6, t);
          vaiMk = marca(naPos(LA, j + 1), vai);
        }
        await dorme(MS_PASSO * 0.6, t);
        aCel.classList.remove('col-acesa');
      }
      bCel.classList.remove('aceso');
      dizer(`${As} × ${d} = ${String(BigInt(As) * BigInt(d))}${k ? ` (anda ${plural(k, 'casa', 'casas')})` : ''}`);
    }
    limpaSetas(bloco);
    if (varias) {   // soma as linhas, com o vai 1
      for (const mk of bloco.querySelectorAll('.lz-mks')) mk.remove();
      rotulo('agora soma as linhas');
      await dorme(MS_PASSO, t);
      const cols = R.map((_, i) => i).filter(i => i > 0).reverse();
      await somaColunas(bloco, P, R, cols, -1, w - 1, t);
      dizer(`Soma as linhas: ${String(BigInt(As) * BigInt(Bs))}`);
    }
    if (dec) {   // a vírgula: conta as casas dos dois números e ela pula no resultado, da direita para a esquerda
      for (let pos = 0; pos <= dec; pos++) if (vazia(naPos(R, pos))) escreve(naPos(R, pos), '0', 'zero');
      let n = 0;
      for (const [cs, casas] of [[LA, ad.length], [LB, bd.length]]) for (let c = casas - 1; c >= 0; c--) {
        n++; naPos(cs, c).classList.add('casa');
        rotulo(`${n} ${n === 1 ? 'casa' : 'casas'}`);
        await dorme(MICRO * 0.7, t);
      }
      const vc = document.createElement('i'); vc.className = 'lz-vc pula';
      vc.textContent = ',';
      for (let pos = 1; pos <= dec; pos++) {
        naPos(R, pos).appendChild(vc); vc.classList.remove('pula'); void vc.offsetWidth; vc.classList.add('pula');
        rotulo(`a vírgula pula: ${pos} ${pos === 1 ? 'casa' : 'casas'}`);
        await dorme(MICRO * 0.7, t);
      }
      rotulo(`${dec} ${dec === 1 ? 'casa' : 'casas'} depois da vírgula`);
      dizer(`Conta as casas depois da vírgula: ${ad.length} + ${bd.length} = ${plural(dec, 'casa', 'casas')}.`);
    }
    if (p.fim !== false) {
      const bruto = dec ? `${total.slice(0, total.length - dec)},${total.slice(-dec)}` : total.replace(/^0+(?=\d)/, '');
      const limpo = num(Number(bruto.replace(',', '.')));
      dizer(`${p.a} × ${p.b} = ${bruto}${limpo !== bruto ? ` = ${limpo}` : ''}`, 'certo');
    }
  }

  // ── divisão com chave (PROMPT-201): à esquerda só a conta; na lateral, a tabuada do divisor inteira, clarinha. "Quanto o 2
  //    cabe no 10?": um marcador desce pela tabuada (cabe ✔ · exato! · passou ✖ e volta uma); o número escolhido voa para o
  //    quociente; a conta embaixo subtrai; abaixa o próximo algarismo com setinha. O balão explica um passo de cada vez. ──
  async function divisao(p, t) {
    const a = Math.round(Number(p.a)), b = Math.round(Number(p.b)), casas = Math.max(0, Number(p.casas) || 0);
    const digs = [...String(a)], w = 1 + digs.length + casas;
    const dizer = (v, cor) => diz(p, v, cor);
    const bloco = div('lz-bloco lz-divisao');
    const esq = div('lz-div-esq', '', bloco);
    const dir = div('lz-div-dir', `<div class="lz-div-b">${b}</div><div class="lz-div-q"></div>`, bloco);
    const tab = div('lz-div-tab', '', bloco);   // a tabuada na lateral
    const qEl = dir.querySelector('.lz-div-q');
    const linha = (cls) => { const l = div('lz-arm-linha ' + cls, '', esq); return Array.from({ length: w }, () => celula(l, '')); };
    const poeNum = (cs, n, fim, sinal = '') => {   // o número com o último algarismo na coluna `fim`
      const s = String(n);
      [...s].forEach((ch, k) => escreve(cs[fim - s.length + 1 + k], ch, ''));
      if (sinal) escreve(cs[fim - s.length], sinal, 'op');
    };
    // a tabuada: até 10 (ou, com divisor grande, só até passar do número)
    const montaTab = (ate) => {
      const n = b >= 10 ? Math.min(10, Math.floor(ate / b) + 1) : 10;
      tab.innerHTML = Array.from({ length: n }, (_, m) => `<div data-m="${m + 1}">${b} × ${m + 1} = ${b * (m + 1)}</div>`).join('');
      return [...tab.children];
    };
    const voa = async (de, para, txt) => {   // o número voa da tabuada para o quociente
      const r0 = bloco.getBoundingClientRect(), a1 = de.getBoundingClientRect(), a2 = para.getBoundingClientRect();
      const f = document.createElement('span'); f.className = 'lz-voa'; f.textContent = txt;
      f.style.left = `${a1.right - r0.left - 14}px`; f.style.top = `${a1.top - r0.top}px`;
      bloco.appendChild(f);
      requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transform = `translate(${a2.right - a1.right + 6}px, ${a2.top - a1.top}px)`; }));
      await dorme(MS_PASSO * 0.7, t);
      f.remove();
    };
    const top = linha('lz-div-a');
    digs.forEach((d, k) => escreve(top[k + 1], d, ''));
    let linhas = montaTab(a);
    await dorme(MS_PASSO, t);
    let i = 0, atual = Number(digs[0]), q = '', deci = 0, resto = 0, linhaAtual = top;
    top[1].classList.add('aceso');
    while (atual < b && i < digs.length - 1) {   // ainda não cabe: pega mais um algarismo
      dizer(`${atual} não dá para dividir por ${b}: pega mais um número.`);
      await dorme(MICRO, t);
      i++; atual = atual * 10 + Number(digs[i]);
      top[i + 1].classList.add('aceso');
      await dorme(MICRO * 0.6, t);
    }
    for (let guarda = 0; guarda < 20; guarda++) {
      limpaSetas(bloco);
      const k = Math.floor(atual / b), col = i + 1;
      if (k === 0 && !q) {   // 1 não cabe no 2: escreve 0, no resultado e põe um zero do lado
        dizer(`${atual} não dá para dividir por ${b}.`);
        await dorme(MS_PASSO, t);
      } else {
        linhas = montaTab(atual);
        dizer(`Quanto o ${b} cabe no ${atual}?`);
        await dorme(MS_PASSO, t);
        dizer('Vamos ver na tabuada…');
        let esc0 = null;
        for (const [m0, l] of linhas.entries()) {   // o marcador desce, do menor para o maior
          const m = m0 + 1, v = b * m;
          l.classList.add('olha');
          await dorme(MS_PASSO * 0.4, t);
          l.classList.remove('olha');
          if (v === atual) { l.classList.add('exato'); esc0 = l; break; }
          if (v > atual) { l.classList.add('passou'); await dorme(MS_PASSO * 0.4, t); esc0 = linhas[m0 - 1] || null; esc0?.classList.add('escolhida'); break; }
          l.classList.add('cabe');
          esc0 = l;
        }
        dizer(k * b === atual ? `${b} × ${k} = ${k * b}. Cabe ${k} vezes, exato!` : `${b} × ${k} = ${k * b}. Cabe ${k} ${k === 1 ? 'vez' : 'vezes'}.`);
        await dorme(MS_PASSO, t);
        dizer(`Escreve o ${k} no resultado.`);
        if (esc0) await voa(esc0, qEl, String(k));
      }
      q += String(k);
      qEl.textContent = q; qEl.classList.remove('novo'); void qEl.offsetWidth; qEl.classList.add('novo');
      await dorme(MICRO * 0.6, t);
      for (const l of tab.children) l.className = '';   // a tabuada volta a ficar clarinha
      if (k > 0) { poeNum(linha('lz-traco lz-div-sub'), k * b, col, '−'); await dorme(MICRO * 0.6, t); }
      resto = atual - k * b;
      linhaAtual = linha('lz-div-r');
      poeNum(linhaAtual, resto, col);
      if (k > 0) dizer(`${atual} − ${k * b} = ${resto}. ${resto ? `Sobrou ${resto}.` : 'Sobrou nada!'}`);
      await dorme(MS_PASSO, t);
      for (const c of top) c.classList.remove('aceso');
      if (i < digs.length - 1) {   // abaixa o próximo algarismo
        i++;
        top[i + 1].classList.add('aceso');
        setaCurva(bloco, top[i + 1], linhaAtual[i + 1], { lado: true });
        await dorme(MICRO * 0.6, t);
        escreve(linhaAtual[i + 1], digs[i]);
        if (resto === 0) escreve(linhaAtual[i], '', '');   // o zero da frente sai: só o algarismo abaixado
        atual = resto * 10 + Number(digs[i]);
        dizer(`Abaixa o ${digs[i]}: fica ${atual}.`);
        await dorme(MS_PASSO, t);
        top[i + 1].classList.remove('aceso');
        continue;
      }
      if (resto !== 0 && deci < casas) {   // conta com vírgula: põe vírgula e um zero
        if (!deci) {
          q += ','; qEl.textContent = q;
          dizer(q === '0,' ? 'Escreve 0, no resultado.' : 'Põe a vírgula no resultado.');
          await dorme(MS_PASSO, t);
          top[digs.length].insertAdjacentHTML('beforeend', '<i class="lz-vc">,</i>');
        }
        i++; deci++;
        escreve(top[i + 1], '0', 'zero');
        dizer(deci === 1 ? `Põe um zero do lado do ${digs.join('')}: ${digs.join('')} = ${digs.join('')},0` : 'Põe mais um zero.');
        await dorme(MS_PASSO, t);
        setaCurva(bloco, top[i + 1], linhaAtual[i + 1], { lado: true });
        await dorme(MICRO * 0.6, t);
        escreve(linhaAtual[i + 1], '0');
        atual = resto * 10;
        dizer(`Abaixa o 0: fica ${atual}.`);
        await dorme(MS_PASSO, t);
        continue;
      }
      break;
    }
    limpaSetas(bloco);
    if (p.fim !== false) dizer(`${a} ÷ ${b} = ${q}${resto ? `, resto ${resto}` : ''}`, 'certo');
    else rotulo(resto ? `sobrou ${resto}: é o resto` : 'Resto 0: divide certinho');
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
        rotulo(p.destaca === 'maior' ? 'Mais à direita: o maior' : 'Mais à esquerda: o menor');   // PROMPT-198
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
      rotulo(d > 0 ? 'Positivo: anda para a direita' : 'Negativo: anda para a esquerda');   // PROMPT-198
      await dorme(MS_PASSO * 0.6, t);
      for (const c of bloco.querySelectorAll('.lz-reta-conta')) c.remove();
    }
    bola.classList.add('chegou');
  }

  // ══ PROMPT-200: a vírgula sempre em destaque, andando casa por casa ══
  // Um número na lousa cuja vírgula pula. No inteiro ela fica escondida no fim (não aparece) até a hora: aí surge piscando.
  // Cada pulo: setinha curva numerada (1ª, 2ª…), a vírgula desliza; faltou casa / faltou número: o zero entra (azul, tracejado).
  // No fim, a limpeza: vírgula no fim some ("puf"); zeros no fim depois da vírgula são riscados e saem.
  function numeroVirgula(pai, v, bloco) {
    const s = String(v).replace('.', ','), [i0, d0 = ''] = s.split(',');
    // PROMPT-204: rastro = os lugares (vãos entre algarismos) por onde a vírgula passou: ficam com uma vírgula clarinha;
    // setas = os pulos { de, para, rot }: redesenhados a cada mudança (os algarismos andam quando entra um zero)
    const N = { digs: [...(i0 + d0)].map(d => ({ d })), pos: i0.length, visivel: s.includes(','), rastro: new Set(), setas: [] };
    const el = document.createElement('span'); el.className = 'lz-vnum'; pai.appendChild(el);
    const vao = (k, cls) => {
      if (k === N.pos && N.visivel) return `<span class="lz-v${cls}" data-gap="${k}">,</span>`;
      return N.rastro.has(k) ? `<span class="lz-v rastro" data-gap="${k}">,</span>` : '';
    };
    N.desenhar = (cls = '') => {
      el.innerHTML = N.digs.map((x, k) => vao(k, cls) + `<span class="lz-c${x.novo ? ' zero0' : ''}${x.risc ? ' risc0' : ''}"><b>${x.d}</b></span>`).join('') + vao(N.digs.length, cls);
      N.redesenharSetas();
    };
    N.redesenharSetas = (anima = false) => {
      for (const sv of bloco.querySelectorAll(':scope > .lz-seta-v')) sv.remove();
      const r0 = bloco.getBoundingClientRect();
      N.setas.forEach((st, i) => {
        const a = el.querySelector(`[data-gap="${st.de}"]`), b = el.querySelector(`[data-gap="${st.para}"]`);
        if (!a || !b) return;
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const ultimo = i === N.setas.length - 1;
        const sv = arcoNumerado(bloco, ra.left + ra.width / 2 - r0.left, rb.left + rb.width / 2 - r0.left, Math.min(ra.top, rb.top) - r0.top + rb.height * 0.25, st.rot, anima && ultimo);
        if (!ultimo || N.pronto) sv.classList.add('velha');
      });
    };
    N.virg = () => el.querySelector('.lz-v:not(.rastro)');
    N.texto = () => { const d = N.digs.map(x => x.d).join(''); return N.visivel ? d.slice(0, N.pos) + ',' + d.slice(N.pos) : d; };
    N.surgir = async (t) => { N.visivel = true; N.desenhar(' surge'); await dorme(MS_PASSO * 1.2, t); };
    const empurra = () => {   // um zero entrou na frente: todos os vãos guardados andam uma casa
      N.rastro = new Set([...N.rastro].map(k => k + 1));
      for (const st of N.setas) { st.de++; st.para++; }
    };
    // um pulo: true = direita (×), false = esquerda (÷); devolve se faltou casa/número (o zero entrou)
    N.pular = (dir, rotuloSeta) => {
      const a = N.virg()?.getBoundingClientRect();
      let faltou = false, de = N.pos;
      if (dir) { N.pos++; if (N.pos > N.digs.length) { N.digs.push({ d: '0', novo: true }); faltou = true; } }
      else if (N.pos <= 0) { N.digs.unshift({ d: '0', novo: true }); empurra(); de = 1; faltou = true; }   // ",5" → ",05": o zero entra entre a vírgula e o número
      else N.pos--;
      N.rastro.add(de);
      N.setas.push({ de, para: N.pos, rot: rotuloSeta });
      N.desenhar();
      N.redesenharSetas(true);
      const vEl = N.virg(), b = vEl?.getBoundingClientRect();
      if (a && b) {
        vEl.style.transform = `translateX(${a.left - b.left}px)`;   // desliza (não teleporta)
        requestAnimationFrame(() => requestAnimationFrame(() => { vEl.style.transform = ''; }));
      }
      return faltou;
    };
    N.zeroNaFrente = () => { N.digs.unshift({ d: '0', novo: true }); empurra(); N.pos++; N.desenhar(); };
    // a limpeza do fim, com as frases (o rastro continua)
    N.limpar = async (t, dizer) => {
      if (!N.visivel) return;
      let k = N.digs.length;
      while (k - 1 >= N.pos && N.digs[k - 1].d === '0') k--;
      if (k < N.digs.length && N.pos < N.digs.length) {   // zeros no fim depois da vírgula
        for (let j = k; j < N.digs.length; j++) N.digs[j].risc = true;
        N.desenhar();
        dizer('Zero no fim, depois da vírgula, pode sair: não muda nada.');
        await dorme(MS_PASSO * 1.2, t);
        N.digs = N.digs.slice(0, k);
        N.rastro = new Set([...N.rastro].filter(g => g <= k));
        N.setas = N.setas.filter(st => st.de <= k && st.para <= k);
        N.desenhar();
        await dorme(MS_PASSO * 0.5, t);
      }
      if (N.pos >= N.digs.length) {   // a vírgula no fim
        N.desenhar(' puf');
        dizer('Vírgula no fim do número não precisa aparecer.');
        await dorme(MS_PASSO, t);
        N.visivel = false;
        N.rastro.delete(N.pos);
        N.setas = N.setas.filter(st => st.para !== N.pos && st.de !== N.pos);
        N.desenhar();
      }
    };
    N.final = () => { N.pronto = true; N.redesenharSetas(); el.classList.add('pronto'); };   // as setinhas ficam, em tom suave
    N.desenhar();
    return N;
  }
  // a setinha curva da vírgula, com o número do pulo em cima
  function arcoNumerado(bloco, x1, x2, y, rot, anima = true) {
    const alto = Math.max(16, Math.abs(x2 - x1) * 0.6), cx = (x1 + x2) / 2, cy = y - alto;
    const ang = Math.atan2(y - cy, x2 - cx), h = 7;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'lz-seta2 lz-seta-v' + (anima ? '' : ' vai'));
    svg.innerHTML = `<path class="arco" d="M${x1},${y} Q${cx},${cy} ${x2},${y}"/>` +
      `<path class="ponta" d="M${x2},${y} L${x2 - h * Math.cos(ang - 0.5)},${y - h * Math.sin(ang - 0.5)} M${x2},${y} L${x2 - h * Math.cos(ang + 0.5)},${y - h * Math.sin(ang + 0.5)}"/>` +
      (rot ? `<text x="${cx}" y="${cy + alto * 0.5 - 4}" text-anchor="middle">${esc(rot)}</text>` : '');
    bloco.appendChild(svg);
    if (!anima) return svg;
    const arco = svg.querySelector('.arco'), len = arco.getTotalLength?.() || 100;
    arco.style.strokeDasharray = `${len}`; arco.style.strokeDashoffset = `${len}`;
    requestAnimationFrame(() => requestAnimationFrame(() => { arco.style.strokeDashoffset = '0'; svg.classList.add('vai'); }));
    return svg;
  }
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  // os pulos da vírgula (o mesmo na conta × ÷ 10 e na escada), com as frases de cada casa
  async function pulosVirgula(N, casas, dir, t, dizer, aoPular) {
    const muitos = casas >= 3;
    for (let i = 0; i < casas; i++) {
      aoPular?.(i);
      const faltou = N.pular(dir, `${i + 1}ª`);
      rotulo(dir ? '→ direita' : '← esquerda');
      await dorme(MS_PASSO, t);
      if (!muitos) dizer(`${i + 1}ª casa: ${faltou ? (dir ? 'faltou casa, completa com 0: ' : 'faltou número, põe 0: ') : ''}${N.texto()}`);
      else if (faltou) dizer(dir ? 'Faltou casa: completa com 0.' : 'Faltou número: põe 0.');
      await dorme(MS_PASSO * 0.5, t);
    }
    if (muitos) dizer(`${casas} pulos: ${N.texto()}`);
    if (N.visivel && N.pos === 0) {   // a vírgula ficou na frente: um 0 antes dela
      N.zeroNaFrente();
      dizer(`Vírgula na frente? Põe um 0 antes dela: ${N.texto()}`);
      await dorme(MS_PASSO, t);
    }
  }
  async function virgula(p, t) {
    const op = p.op === '÷' || p.op === '/' ? '÷' : p.op === '×' || p.op === 'x' ? '×' : null, k = String(p.k || '');
    const casas = op ? Math.max(1, k.length - 1) : Math.max(0, Number(p.casas ?? 1)), dir = op ? op === '×' : p.lado !== 'esquerda';
    const dizer = (v, cor) => diz(p, v, cor);
    const bloco = div('lz-bloco lz-virgula');
    let zeros = [];
    if (op) {   // em cima, a conta (os zeros do k acendem, numerados); embaixo, o número com a vírgula pulando
      const c = div('lz-vconta', `<span>${vir(esc(p.v))}</span><span class="lz-vop"> ${op} 1${'<span class="lz-z">0</span>'.repeat(casas)}</span><span class="lz-vigual"> =</span>`, bloco);
      zeros = [...c.querySelectorAll('.lz-z')];
    }
    const N = numeroVirgula(div('lz-vlinha', '', bloco), p.v, bloco);
    await dorme(MS_PASSO, t);
    if (!N.visivel && (casas > 0 || p.surge)) {
      await N.surgir(t);
      dizer(casas > 0 ? `A vírgula do ${p.v} está no fim: ${p.v},` : 'A vírgula estava escondida aqui, no fim do número.');
      await dorme(MS_PASSO * 0.4, t);
    }
    if (!casas) return;
    dizer(op ? `${op} ${k} tem ${plural(casas, 'zero', 'zeros')}: a vírgula anda ${plural(casas, 'casa', 'casas')} ${dir ? '→' : '←'}`
      : `A vírgula anda ${plural(casas, 'casa', 'casas')} ${dir ? '→' : '←'}`);
    await dorme(MS_PASSO * 0.5, t);
    await pulosVirgula(N, casas, dir, t, dizer, (i) => { if (zeros[i]) { zeros[i].classList.add('aceso'); zeros[i].dataset.n = i + 1; } });
    await N.limpar(t, dizer);
    N.final();
    if (p.fim !== false) dizer(op ? `${p.v} ${op} ${k} = ${N.texto()}. ${op === '×' ? 'Multiplicou: ficou maior.' : 'Dividiu: ficou menor.'}` : `${p.v} → ${N.texto()}`, 'certo');
    rotulo(op ? `Cada zero, uma casa para a ${dir ? 'direita' : 'esquerda'}` : 'A vírgula pula as casas');
  }
  // ── os zeros que entram no fim, depois da vírgula (48 → 48, → 48,0 → 48,00): não mudam o número ──
  async function zerosNoFim(p, t) {
    const bloco = div('lz-bloco lz-virgula');
    const N = numeroVirgula(div('lz-vlinha', '', bloco), p.v, bloco);
    await dorme(MS_PASSO, t);
    if (!N.visivel) await N.surgir(t);
    for (let i = 0; i < (Number(p.n) || 1); i++) { N.digs.push({ d: '0', novo: true }); N.desenhar(); await dorme(MS_PASSO * 0.9, t); }
  }
  // ── conte os zeros: 10 → o 0 acende com "1"; 100 → "1", "2"… ──
  async function contaZeros(p, t) {
    const bloco = div('lz-bloco lz-vcontas');
    for (const k of p.ks || [10, 100, 1000]) {
      const n = String(k).length - 1, l = div('lz-vconta', `1${'<span class="lz-z">0</span>'.repeat(n)}`, bloco), zs = [...l.querySelectorAll('.lz-z')];
      await dorme(MS_PASSO * 0.5, t);
      for (const [i, z] of zs.entries()) { z.classList.add('aceso'); z.dataset.n = i + 1; await dorme(MS_PASSO * 0.45, t); }
      await dorme(MS_PASSO * 0.4, t);
    }
  }

  // ── a escada das unidades: descer um degrau = × 10 (vírgula para a direita), subir = ÷ 10 (para a esquerda) ──
  //    PROMPT-200: o degrau e a setinha do mesmo número acendem juntos; as frases de cada passo ficam escritas
  async function escada(p, t) {
    const D = (p.degraus || []).map(String), i0 = D.indexOf(p.de), i1 = D.indexOf(p.para);
    const dizer = (v, cor) => diz(p, v, cor);
    const bloco = div('lz-bloco lz-escada');
    const deg = div('lz-esc-degraus', D.map((u, k) => `<span class="lz-esc-d" style="--k:${k}">${esc(u)}</span>`).join(''), bloco);
    deg.style.setProperty('--nd', D.length);   // a altura da escada pelo número de degraus
    const ds = [...deg.querySelectorAll('.lz-esc-d')];
    if (i0 < 0) { await dorme(MS_PASSO, t); return; }
    const bola = document.createElement('span'); bola.className = 'lz-esc-bola'; deg.appendChild(bola);
    const poe = (k) => { bola.style.left = `${ds[k].offsetLeft + ds[k].offsetWidth / 2}px`; bola.style.top = `${ds[k].offsetTop - 4}px`; ds.forEach((d, j) => d.classList.toggle('aqui', j === k)); };
    poe(i0);
    let N = null;
    const baixo = div('lz-esc-num', '', bloco);
    if (p.v !== undefined) { N = numeroVirgula(baixo, p.v, bloco); baixo.insertAdjacentHTML('beforeend', ` <b>${esc(D[i0])}</b>`); }
    await dorme(MS_PASSO, t);
    if (i1 < 0 || i1 === i0) return;
    const passo = i1 > i0 ? 1 : -1, n = Math.abs(i1 - i0), desce = passo > 0;
    dizer(`De ${D[i0]} para ${D[i1]}: ${desce ? 'desceu' : 'subiu'} ${plural(n, 'degrau', 'degraus')}.`);
    await dorme(MS_PASSO * 0.6, t);
    if (!N) {   // só a bolinha andando
      for (let k = i0; k !== i1; k += passo) { poe(k + passo); rotulo(desce ? 'Desceu um degrau: × 10' : 'Subiu um degrau: ÷ 10'); await dorme(MS_PASSO * 0.8, t); }
      bola.classList.add('chegou');
      return;
    }
    dizer(`${desce ? 'Desceu = ×' : 'Subiu = ÷'}: a vírgula anda ${plural(n, 'casa', 'casas')} ${desce ? '→' : '←'}`);
    await dorme(MS_PASSO * 0.5, t);
    if (!N.visivel) { await N.surgir(t); dizer(`A vírgula do ${p.v} está no fim: ${p.v},`); await dorme(MS_PASSO * 0.4, t); }
    let k = i0;
    await pulosVirgula(N, n, desce, t, dizer, (i) => { k += passo; poe(k); ds[k].dataset.n = `${i + 1}ª`; ds[k].classList.add('pulo'); });
    await N.limpar(t, dizer);
    N.final();
    baixo.querySelector(':scope > b').textContent = D[i1];
    bola.classList.add('chegou');
    if (p.fim !== false) dizer(`${p.v} ${D[i0]} = ${N.texto()} ${D[i1]}`, 'certo');
    rotulo(i1 > i0 ? 'Unidade menor, número maior' : 'Unidade maior, número menor');
  }

  // ── tabela de sinais: as linhas; { t: 'acende', i } destaca uma ──
  function tabela(p) { div('lz-bloco lz-tabela', (p.linhas || []).map((l, i) => `<div class="lz-tab-linha" data-i="${i}">${esc(l)}</div>`).join('')); }
  function acende(p) { const tb = [...Q.querySelectorAll('.lz-tabela')].pop(); if (tb) tb.querySelectorAll('.lz-tab-linha').forEach((l, i) => { if (i === Number(p.i)) l.classList.add('aceso'); else if (!p.soma) l.classList.remove('aceso'); }); }
  // ── 💯 PROMPT-197: a grade de 100 quadradinhos; os n primeiros pintam um a um (rápido) ──
  async function grade100(p, t) {
    const n = Math.max(0, Math.min(100, Math.round(Number(p.n) || 0)));
    const fx = Number(p.faixas) || 0, rs = Number(p.riscados) || 0;   // PROMPT-203: faixas (100 em partes iguais) e riscados (o desconto)
    const b = div('lz-bloco lz-g100', Array.from({ length: 100 }, (_, k) => `<i class="${fx && Math.floor(k / (100 / fx)) % 2 ? 'fx' : ''}"></i>`).join(''));
    const cs = b.querySelectorAll('i');
    if (rs) { for (let k = 0; k < rs; k++) cs[99 - k].classList.add('risc'); }
    await dorme(MS_PASSO * 0.4, t);
    for (let k = 0; k < n; k++) { cs[k].classList.add('pinta'); if (k % Math.max(1, Math.ceil(n / 20)) === 0) await dorme(60, t); }
    rotulo('A parte pintada de 100');
    await dorme(MS_PASSO * 0.6, t);
  }

  async function figura(p, t) {
    const caixa = div('lz-bloco lz-figura', '<svg></svg>'), fig = criarFigura(caixa.querySelector('svg'));
    L.figs.push(fig);
    if (!fig.mostrar(p.figura)) { caixa.remove(); return; }
    await dorme(MS_PASSO * 0.6, t);
    await fig.animar().catch(() => {});
  }
  const rotulo = (s) => { if (aoFalar) { if (s) aoFalar(s, ''); return; } ROT.textContent = s || ''; ROT.classList.toggle('vazio', !s); ajustar(); };   // o rótulo tira altura do quadro; com balão, vai para ele (PROMPT-201)
  const limparBlocos = () => { for (const b of Q.querySelectorAll(':scope > .lz-bloco, :scope > .lz-seta')) b.remove(); };

  // ── 🍕 frações: a grande (com o que é cada parte), as equivalentes com setas ×n / ÷n e as barras ──
  async function fracao(p, t) {
    const b = div('lz-bloco lz-fracao', fracHtml(p.p, p.q, ' grande'));
    await dorme(MS_PASSO, t);
    if (!p.explica) return;
    b.insertAdjacentHTML('beforeend', '<span class="lz-fr-exp"><span class="novo">← partes pintadas</span><span class="lz-fr-exp-b">← partes iguais do inteiro</span></span>');
    await dorme(MS_PASSO * 0.7, t);
    b.querySelector('.lz-fr-exp-b').classList.add('novo');
    await dorme(MS_PASSO * 0.6, t);
  }
  const arco = (baixo) => `<svg class="lz-arco${baixo ? ' baixo' : ''}" viewBox="0 0 60 22" preserveAspectRatio="none"><path d="${baixo ? 'M4,2 Q30,24 54,4' : 'M4,20 Q30,-2 54,18'}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="${baixo ? 'M54,4 l-9,1 m9,-1 l-3,8' : 'M54,18 l-9,-1 m9,1 l-3,-8'}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`;
  const nFr = (x) => Number(String(x).replace(',', '.'));
  async function fracoes(p, t) {
    const fr = (p.fr || []).map(([a, b]) => [num(a), num(b)]), op = p.op === '÷' || p.op === '/' ? '÷' : '×';
    if (!fr.length) return;
    const b = div('lz-bloco lz-fracoes', fracHtml(...fr[0]));
    await dorme(MS_PASSO * 0.8, t);
    for (let i = 1; i < fr.length; i++) {
      const k = Array.isArray(p.k) ? p.k[i - 1] : p.k ?? arred(op === '×' ? nFr(fr[i][1]) / nFr(fr[i - 1][1]) : nFr(fr[i - 1][1]) / nFr(fr[i][1]));
      b.insertAdjacentHTML('beforeend', `<span class="lz-fr-passo"><span class="lz-fr-rot">${op}${esc(num(k))}</span>${arco(false)}${arco(true)}<span class="lz-fr-rot">${op}${esc(num(k))}</span></span>${fracHtml(fr[i][0], fr[i][1], ' lz-fr-nova')}`);
      const passo = [...b.querySelectorAll('.lz-fr-passo')].pop(), nova = [...b.querySelectorAll('.lz-fr-nova')].pop(), [cima, baixo] = nova.querySelectorAll('b');
      const rot = passo.querySelectorAll('.lz-fr-rot'), arcos = passo.querySelectorAll('.lz-arco');
      rot[0].classList.add('aceso'); arcos[0].classList.add('aceso'); cima.classList.add('novo', 'visto');
      await dorme(MS_PASSO * 0.8, t);
      rot[1].classList.add('aceso'); arcos[1].classList.add('aceso'); baixo.classList.add('novo', 'visto'); nova.classList.add('cheia');
      await dorme(MS_PASSO * 0.8, t);
    }
  }
  async function barras(p, t) {
    const b = div('lz-bloco lz-barras');
    // PROMPT-198: todos os rótulos com a largura do maior, para as barras ficarem do mesmo tamanho
    b.style.setProperty('--rot-w', `${Math.max(...(p.fr || []).map(([x, y], i) => String(p.rotulos?.[i] ?? `${x}/${y}`).length), 1) * 0.62}em`);
    for (const [i, [a, q]] of (p.fr || []).entries()) {
      const rot = `<span class="lz-barra-rot">${p.rotulos?.[i] != null ? esc(p.rotulos[i]) : fracHtml(a, q)}</span>`;
      if (q > 20) {   // PROMPT-198: 100 ou 1000 partes não cabem como quadradinhos: a barra enche de uma vez (marquinhas de 10 em 10%)
        const l = div('lz-barra-linha', `<span class="lz-barra cont"><b></b></span>${rot}`, b);
        await dorme(MS_PASSO * 0.3, t);
        l.querySelector('.lz-barra.cont b').style.width = `${(100 * a) / q}%`;
        await dorme(MS_PASSO * 0.9, t);
        continue;
      }
      const l = div('lz-barra-linha', `<span class="lz-barra">${Array.from({ length: q }, () => '<i></i>').join('')}</span>${rot}`, b);
      const cs = l.querySelectorAll('.lz-barra i');
      await dorme(MS_PASSO * 0.3, t);
      for (let k = 0; k < a; k++) { cs[k].classList.add('pinta'); await dorme(Math.min(260, 1200 / Math.max(1, a)), t); }
      await dorme(MS_PASSO * 0.35, t);
    }
  }

  // ── ✖ errado × ✔ certo: duas colunas, cada uma com o próprio "motor", andando juntas um passo por vez ──
  async function compara(p, t) {
    const bloco = div('lz-compara');
    const lado = (c, def) => {
      const tipo = c?.tipo || def, tit = c?.titulo ?? (tipo === 'errado' ? '✖ jeito errado' : tipo === 'certo' ? '✔ jeito certo' : '');
      const col = div(`lz-col ${tipo}`, `<div class="lz-col-tit">${esc(tit)}</div><div class="lz-col-q"></div><div class="lz-col-rot vazio"></div>`, bloco);
      return { tipo, col, m: motor(col.querySelector('.lz-col-q'), col.querySelector('.lz-col-rot'), { auto: tipo !== 'errado' }), ps: expandir(c?.passos || (c?.linhas || []).map(v => ({ t: 'linha', v }))) };
    };
    // PROMPT-201: o ✔ certo sempre na 1ª parte (esquerda), animando sozinho; depois o ✖ errado entra na 2ª parte (direita)
    const B = lado(p.dir, 'certo'), A = lado(p.esq, 'errado');
    const marcaFim = (s) => {   // o resultado: errado riscado (✖), certo com ✔
      s.fim = [...s.col.querySelectorAll('.lz-col-q > .lz-linha:not(.lz-enun), .lz-res, .lz-esc-num, .lz-vlinha .lz-vnum, .lz-div-q, .lz-fr-nova.cheia')].pop() || null;
      if (!s.fim || (s.tipo !== 'errado' && s.tipo !== 'certo') || s.fim.matches('.lz-certo, .lz-errado')) return;
      s.fim.classList.add(s.fim.matches('.lz-linha') ? `lz-${s.tipo}` : s.tipo === 'errado' ? 'lz-riscado' : 'lz-ok');
    };
    // PROMPT-198/201: em duas etapas. 1) só o ✔ jeito certo, na lousa inteira, até o resultado; 2) ~1 s depois ele encolhe para a
    // esquerda e o ✖ jeito errado entra na direita, até o resultado riscado; 3) os dois resultados acendem juntos
    bloco.classList.add('etapa1');
    await dorme(MS_PASSO * 0.5, t);
    for (const s of B.ps) await B.m.passo(s, t);
    marcaFim(B);
    await dorme(1000, t);
    bloco.classList.remove('etapa1');
    await dorme(700, t);
    ajustar();
    for (const s of A.ps) await A.m.passo(s, t);
    marcaFim(A);
    for (const s of [A, B]) s.fim?.classList.add('lz-pisca');
    await dorme(MS_PASSO * 0.8, t);
  }

  async function passo(p, t) {
    switch (p.t) {
      case 'linha': linha(termos(p.v), p.classe ? 'lz-' + p.classe : ''); return dorme(MS_PASSO, t);
      case '_linha': linha(p.ts); return dorme(MS_PASSO, t);
      case '_marca': { const l = ultima(); if (l) marcar(l, p.de, p.ate); return dorme(MS_PASSO, t); }
      case '_nova': novaLinha(p.ts, p.de, p.n ?? 1); return dorme(MS_PASSO, t);
      case 'enunciado': div('lz-linha lz-enun', esc(p.v)); return dorme(MS_PASSO, t);
      case 'marca': { const l = ultima(); if (!l) return; const i = acha(l, p.v); if (i >= 0) marcar(l, i, i + termos(p.v).length - 1); return dorme(MS_PASSO, t); }
      case 'resolve': {
        const l = ultima(), tr = termos(String(p.v)), m = l ? spans(l).findIndex(s => s.classList.contains('marca')) : -1;
        const nova = termos(p.linha ?? p.v), de = Math.max(0, (() => { for (let i = Math.max(0, m - 1); i + tr.length <= nova.length; i++) if (tr.every((x, j) => nova[i + j] === x)) return i; return nova.findIndex((x) => x === tr[0]); })());
        novaLinha(nova, de, tr.length);
        return dorme(MS_PASSO, t);
      }
      case 'expressao': for (const s of expandir([p])) await passo(s, t); return;
      case 'seta': seta(p); return dorme(MS_PASSO, t);
      case 'texto': rotulo(p.v); return dorme(MS_PASSO * 0.6, t);
      case 'bloco': abreBloco(p.titulo); return dorme(MS_PASSO * 0.5, t);
      case 'escreve': if (p.auto && !auto) return undefined; escrever(p.v, { cor: p.cor, n: p.n }); return dorme(MS_PASSO * (p.ms ? p.ms / MS_PASSO : 0.9), t);
      case 'zeros': if (!p.manter) limparBlocos(); return zerosNoFim(p, t);
      case 'contazeros': if (!p.manter) limparBlocos(); return contaZeros(p, t);
      case 'casas': return casasPasso(p, t);
      case 'tabuada': if (p.auto && !auto) return undefined; return p.quadrados || p.alvo !== undefined ? tabuadaBusca(p, t) : tabuadaLateral(p, t);
      case 'escondido': return escondido(p, t);
      case 'comparadec': if (!p.manter) limparBlocos(); return comparaDec(p, t);
      case 'lateral': return lateral(p, t);
      case 'bolinhas': if (!p.manter) limparBlocos(); return bolinhas(p, t);
      case 'algarismos': return algarismos(p, t);
      case 'termos': return termosPasso(p, t);
      case 'perimetro': if (!p.manter) limparBlocos(); return perimetro(p, t);
      case 'lese': lese(p); return dorme(MS_PASSO * 0.9, t);
      case 'palavras': return palavras(p, t);
      case 'caixinhas': return caixinhas(p, t);
      case 'semvirgula': return semVirgulaPasso(p, t);
      case 'armada': if (!p.manter) limparBlocos(); return armada(p, t);   // manter: a conta de antes fica (PROMPT-191)
      case 'divisao': if (!p.manter) limparBlocos(); return divisao(p, t);
      case 'reta': if (!p.manter) limparBlocos(); return reta(p, t);
      case 'virgula': if (!p.manter) limparBlocos(); return virgula(p, t);
      case 'escada': if (!p.manter) limparBlocos(); return escada(p, t);
      case 'tabela': if (!p.manter) limparBlocos(); tabela(p); return dorme(MS_PASSO, t);
      case 'acende': acende(p); return dorme(Number(p.ms) || MS_PASSO, t);
      case 'grade100': if (!p.manter) limparBlocos(); return grade100(p, t);
      case 'figura': limparBlocos(); return figura(p, t);
      case 'fracao': return fracao(p, t);
      case 'fracoes': return fracoes(p, t);
      case 'barras': return barras(p, t);
      case 'compara': return compara(p, t);
      case 'pausa': return dorme(Number(p.ms) || MS_PASSO, t);
      default: return undefined;
    }
  }
  return { passo, reset: () => { Q = Qbase; } };
  }   // motor

  const M = motor(Q0, ROT0);
  return {
    async tocar(passos = L.passos, { titulo } = {}) {
      const t = ++L.token;
      if (titulo !== undefined) L.titulo = titulo || '';
      TIT0.innerHTML = vir(esc(L.titulo)); TIT0.hidden = !L.titulo;   // PROMPT-201: a regra da página, no alto da lousa
      M.reset();
      L.passos = passos || []; L.pausado = false; for (const f of L.figs) f.cancelar(); L.figs = [];
      L.k = 1; raiz.style.setProperty('--lz-k', 1);
      Q0.innerHTML = ''; ROT0.textContent = ''; ROT0.classList.add('vazio'); ESC0.innerHTML = ''; L.nEsc = 0;
      try { for (const p of expandir(L.passos)) { if (!vivo(t)) return false; await M.passo(p, t); } } catch (e) { if (e !== CANCELADA) console.warn('[lousa]', e); return false; }
      return true;
    },
    cancelar() { L.token++; L.pausado = false; for (const f of L.figs) f.cancelar(); },
    pausar(sim = !L.pausado) { L.pausado = sim; for (const f of L.figs) f.pausar(sim); return L.pausado; },
    get pausado() { return L.pausado; },
  };
}

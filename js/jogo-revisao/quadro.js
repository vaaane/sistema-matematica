// Jogo de Revisão — 🧑‍🏫 PROMPT-205/206/207: a lousa como um quadro de verdade (só as Aulas do 4-A, 4-B e 5-A e o cartão do erro delas).
// Protótipos aprovados: referencia/lousa-4b.html, lousa-4a.html e lousa-5a.html (as funções nota, apagar, paraHist, curva, numRow,
// armada, setaVerde, setaDevolve, voar, fracH, fx, arcoX, barra, tabuada, procura, etiqueta e trocaLado vêm de lá). Um quadro 16:9 com 4 áreas fixas: histórico (esq.), foco (centro, o único lugar com
// animação), ajuda (dir., a tabuada) e base (regras + a resposta limpa). Sem pet e sem balão: o que ele falava é escrito.
//   criarQuadro(raiz) → { tocar(cenas): Promise<boolean>, cancelar(), pausar(): boolean }
//   cenas: [{ t: 'armada', a, op: '+'|'−', b, passos?, pegadinha?: { conta, passo }, regras?, resposta? },
//           { t: 'mult', a, b }, { t: 'compara', v: [x, y], pegadinha? }, { t: 'fracdec', p, d },
//           { t: 'divk', p, k }, { t: 'decfrac', v: [x, …] },
//           4-A: { t: 'fracao', n, d, pizza? }, { t: 'equiv', a, b, k }, { t: 'simplif', n, d }, { t: 'mesmoden', a, b, d, op, simplifica?, pegadinha? },
//           { t: 'compunit', a, b }, { t: 'dendif', p, a, r, b }, { t: 'multfr', a, b, c, d }, { t: 'partede', p, q, N }, { t: 'divfr', a, b, c, d },
//           5-A (PROMPT-207): { t: 'potencia', b, n, leitura? }, { t: 'quadrado', b, pegadinha? }, { t: 'cadeia', b, n }, { t: 'virapot', b, n },
//           { t: 'dez', n, n2? }, { t: 'umzero', casos: [[b, n], …] }, { t: 'naconta', a, n, op, b, m }]
//   PROMPT-207: no fim de cada página a resposta certa aparece grande no centro, numa caixa verde (a última conta vai para
//   o histórico e a tabuada sai); a pegadinha termina com o jeito certo embaixo (✔); o histórico encolhe junto quando enche.
//   (todas com regras?: [...] e resposta?: '...').  Velocidade 1× 2× 4× (todos os tempos, também as transições do CSS):
//   mudarVelocidade(v) / velocidade() — vale para todos os quadros e fica guardada no localStorage.
const NS = 'http://www.w3.org/2000/svg';
const CW = 0.78;   // largura de um algarismo (em)
class Cancel extends Error {}
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const casasTxt = (n) => plural(n, 'casa', 'casas');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const virgulas = (s) => esc(s).replace(/(\d),(\d)/g, '$1<span class="qd-v">,</span>$2');
const fluxo = (e) => e.getBoundingClientRect();
const mdc = (a, b) => (b ? mdc(b, a % b) : Math.abs(a));
const el = (tag, cls = '', html = '', pai = null) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; if (pai) pai.appendChild(e); return e; };
// "3,25" → { i: '3', d: '25', temV: true }
const partes = (x) => { const s = String(x).replace(/R\$\s*/, '').trim(), [i, d = ''] = s.split(','); return { i: i || '0', d, temV: s.includes(',') }; };
// inteiro em escala → "3,75" (sem zeros no fim)
function comVirgula(n, casas) {
  const neg = n < 0, s = String(Math.abs(n)).padStart(casas + 1, '0');
  let i = casas ? s.slice(0, -casas) : s, d = casas ? s.slice(-casas) : '';
  d = d.replace(/0+$/, '');
  i = String(Number(i));
  return (neg ? '−' : '') + i + (d ? ',' + d : '');
}
// ── velocidade 1× 2× 4× (PROMPT-206): multiplica as esperas e, pela variável --qd-vel, as transições e animações do CSS ──
const CHAVE_VEL = 'jr_lousa_vel';
let VEL = (() => { try { const v = Number(localStorage.getItem(CHAVE_VEL)); return [1, 2, 4].includes(v) ? v : 1; } catch (_) { return 1; } })();
const QUADROS = new Set();
export const velocidade = () => VEL;
export function mudarVelocidade(v) {
  VEL = [1, 2, 4].includes(Number(v)) ? Number(v) : 1;
  try { localStorage.setItem(CHAVE_VEL, String(VEL)); } catch (_) {}
  QUADROS.forEach(q => q.style.setProperty('--qd-vel', VEL));
}
const T = (s) => `calc(${s}s / var(--qd-vel, 1))`;   // duração de transição (inline) na velocidade escolhida
// "0,060" → "0,06"; "10,0" → "10"
const semZerosFim = (t) => (t.includes(',') ? t.replace(/0+$/, '').replace(/,$/, '') : t);
const fracHtml = (n, d, cls = '') => `<span class="qd-frac ${cls}"><span>${n}</span><span class="qd-fl"></span><span>${d}</span></span>`;

export function criarQuadro(raiz) {
  raiz.innerHTML = '';
  raiz.classList.add('qd-raiz');
  const L = el('div', 'qd', '', raiz);
  QUADROS.add(L); L.style.setProperty('--qd-vel', VEL);
  const HIST = el('div', 'qd-hist', '', L), FOCO = el('div', 'qd-foco', '', L), LADO = el('div', 'qd-lado', '', L);
  const BASE = el('div', 'qd-base', '', L), REGRAS = el('div', 'qd-regras', '', BASE), RESP = el('div', 'qd-resp', '', BASE);
  let token = 0, pausado = false, compacto = false, Wmedido = 0, ultCenas = null, rz = 0;

  // ── tamanho: 16:9 dentro do espaço que tiver; o cartão do foco diminui se não couber (nunca corta) ──
  // PROMPT-207: a conta nunca quebra linha; o que não cabe na largura (ou na altura) diminui junto
  function caber() {
    for (const card of FOCO.querySelectorAll(':scope > .qd-card')) {
      const h = card.offsetHeight;
      const w = Math.max(card.offsetWidth, ...[...card.querySelectorAll(':scope > .qd-conta > *, :scope > .qd-caixa-ok')].map(e => e.offsetWidth));
      if (!w || !h) continue;
      const k = Math.min(1, FOCO.clientWidth / w, FOCO.clientHeight / h);
      card.style.scale = k < 0.999 ? String(k * 0.97) : '';
    }
  }
  function medir() {
    const w = raiz.clientWidth, h = raiz.clientHeight;
    if (!w || !h) return;
    const W = Math.floor(Math.min(w, h * 16 / 9));
    L.style.width = W + 'px'; L.style.height = Math.floor(W * 9 / 16) + 'px';
    // mudou muito de tamanho no meio (girou o celular): recomeça a página, senão as setas desenhadas ficam fora do lugar
    if (Wmedido && Math.abs(W - Wmedido) > 30 && ultCenas) { clearTimeout(rz); const c = ultCenas; rz = setTimeout(() => { if (ultCenas === c && raiz.isConnected && raiz.offsetWidth) tocar(c); }, 350); }
    Wmedido = W;
    compacto = W < 400;   // pequeno demais para o histórico: a conta anterior é apagada e o foco usa a largura toda
    L.classList.toggle('compacto', compacto);
    caber();
  }
  new ResizeObserver(medir).observe(raiz);
  new ResizeObserver(caber).observe(FOCO);
  let pend = false;
  new MutationObserver(() => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; caber(); }); })
    .observe(FOCO, { childList: true, subtree: true, characterData: true });

  // ── tempo (respeita a pausa e a troca de página) ──
  function wait(ms) {
    const meu = token;
    return new Promise((ok, falha) => {
      let resta = ms, ult = performance.now();
      const passo = () => {
        if (meu !== token) return falha(new Cancel());
        const agora = performance.now();
        if (!pausado) resta -= (agora - ult) * VEL;
        ult = agora;
        if (resta <= 0) return ok();
        requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    });
  }

  // ── anotações escritas, letra por letra: passo (branca, apagada no seguinte), detalhe (amarela, fica), regra (base) ──
  async function nota(pai, txt, nivel) {
    txt = String(txt).replace(/ (\S{1,3})$/, '\u00a0$1');   // o último número nunca fica sozinho na linha
    const n = el('div', 'qd-nota ' + nivel, '', pai);
    const unid = [];
    for (const p of String(txt).split(/(\[\[\w+\]\])/)) {
      const m = p.match(/^\[\[(\w+)\]\]$/);
      if (m) { const c = el('span', 'qd-ch qd-circ', '', n); c.textContent = m[1]; unid.push(c); continue; }
      [...p].forEach((ch, i, arr) => {
        const s = el('span', 'qd-ch', '', n);
        s.textContent = ch;
        if (ch === ',' && /\d/.test(arr[i - 1] || '') && /\d/.test(arr[i + 1] || '')) s.classList.add('qd-v');
        unid.push(s);
      });
    }
    for (const u of unid) { u.classList.add('on'); await wait(u.textContent === ' ' ? 10 : 30); }
    return n;
  }
  async function apagar(...els) {
    const es = els.flat().filter(Boolean);
    if (!es.length) return;
    es.forEach(e => e.classList.add('qd-apaga'));
    await wait(500);
    es.forEach(e => e.remove());
  }
  const temRegra = (txt) => [...REGRAS.children].some(n => n.textContent === txt);
  const regra = async (txt) => {
    if (!txt || temRegra(txt)) return;
    const n = await nota(REGRAS, txt, 'regra');
    while (REGRAS.scrollHeight > BASE.clientHeight + 2 && REGRAS.children.length > 1 && REGRAS.firstElementChild !== n) REGRAS.firstElementChild.remove();   // não cabe: sai a mais antiga
  };
  // PROMPT-207: a resposta certa no fim, grande no centro, numa caixa verde: a última conta vai para o histórico e a
  // tabuada sai (barras, chocolate, grade, bolinhas, quadrado e cubo ficam: explicam a resposta). A base fica só com as regras.
  async function respostaFinal(html, manter = false) {
    const atual = FOCO.querySelector(':scope > .qd-card');
    if (atual && !manter) await paraHist({ root: atual });
    if (LADO.querySelector('.qd-tab')) {
      LADO.style.opacity = 0; await wait(450);
      LADO.innerHTML = ''; LADO.style.opacity = '';
      L.classList.remove('com-lado', 'lado-largo');
      await wait(300);
    }
    const c = el('div', 'qd-card qd-resp-final', `<div class="qd-caixa-ok qd-pop">${html}</div>`, FOCO);
    caber();
    await wait(800);
    return c;
  }
  // a pegadinha nunca termina no erro: o jeito certo aparece embaixo, em verde, com ✔
  async function certoEmbaixo(c, html) {
    el('div', 'qd-certo-baixo qd-pop', `${html}<span class="ok-ic">✔</span>`, c.conta);
    await wait(700);
  }
  async function fim(s, resp, regrasPadrao) {
    await respostaFinal(virgulas(s.resposta || resp));
    for (const r of s.regras || regrasPadrao) await regra(r);
  }

  // ── cartões: o que está no foco e depois encolhe e desliza para o histórico (levando as anotações de detalhe) ──
  function cartao() {
    const root = el('div', 'qd-card', '', FOCO);
    return { root, conta: el('div', 'qd-conta', '', root), notas: el('div', 'qd-notas', '', root) };
  }
  async function paraHist(c) {
    const card = c.root;
    if (compacto) { await apagar(card); return; }
    const f = fluxo(card), kf = parseFloat(card.style.scale) || 1;
    card.style.scale = '';
    const w = Math.max(card.offsetWidth, ...[...card.querySelectorAll(':scope > .qd-conta > *')].map(e => e.offsetWidth)), h = card.offsetHeight;
    // até 50%, na largura do histórico; PROMPT-207: não coube na altura? todo o histórico encolhe junto (até ~45%)
    const gap = parseFloat(getComputedStyle(HIST).rowGap) || 0;
    const usado = [...HIST.children].reduce((t, x) => t + x.offsetHeight + gap, 0);
    let K = Math.min(0.5, (HIST.clientWidth - 4) / w);
    const slot = el('div', 'qd-hslot', '', HIST);
    slot.style.width = w * K + 'px'; slot.style.height = h * K + 'px';
    card.dataset.k = K; card.dataset.w = w; card.dataset.h = h;
    card.style.width = w + 'px';
    slot.appendChild(card);
    card.classList.add('mini');
    card.style.transition = 'none';
    card.style.transform = `scale(${K})`;
    const total = usado + h * K, livre = HIST.clientHeight - 2;
    if (total > livre) {
      const gaps = gap * (HIST.children.length - 1);   // os espaços entre as contas não encolhem
      const fat = Math.max(0.45, (livre - gaps) / Math.max(1, total - gaps));
      for (const s of HIST.children) {
        const cd = s.firstElementChild;
        if (!cd?.dataset.k) continue;
        const k = Number(cd.dataset.k) * fat;
        cd.dataset.k = k; s.style.width = cd.dataset.w * k + 'px'; s.style.height = cd.dataset.h * k + 'px';
        if (cd !== card) { cd.style.transition = `transform ${T(.5)}`; cd.style.transform = `scale(${k})`; }
      }
      K = Number(card.dataset.k);
      card.style.transform = `scale(${K})`;
    }
    const l = fluxo(card);
    card.style.transform = `translate(${f.left - l.left}px, ${f.top - l.top}px) scale(${kf})`;
    card.offsetWidth;
    card.style.transition = `transform ${T(.85)} cubic-bezier(.3, .8, .3, 1)`;
    card.style.transform = `scale(${K})`;
    await wait(900);
    while (HIST.scrollHeight > HIST.clientHeight + 2 && HIST.children.length > 1) HIST.firstElementChild.remove();   // não cabe: sai o mais antigo
  }

  // ── setas curvas (SVG) ──
  function curva(svg, x1, y1, cx, cy, x2, y2, cor, lw) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`);
    Object.assign(p.style, { fill: 'none', stroke: cor, strokeWidth: lw, strokeLinecap: 'round' });
    svg.appendChild(p);
    const tam = p.getTotalLength();
    p.style.strokeDasharray = tam; p.style.strokeDashoffset = tam;
    p.getBoundingClientRect();
    p.style.transition = `stroke-dashoffset ${T(.55)} ease`;
    p.style.strokeDashoffset = 0;
    const a = Math.atan2(y2 - cy, x2 - cx), hl = lw * 3.4;
    const cab = document.createElementNS(NS, 'path');
    cab.setAttribute('d', `M${x2 - hl * Math.cos(a - .5)} ${y2 - hl * Math.sin(a - .5)} L${x2} ${y2} L${x2 - hl * Math.cos(a + .5)} ${y2 - hl * Math.sin(a + .5)}`);
    Object.assign(cab.style, { fill: 'none', stroke: cor, strokeWidth: lw, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: 0, transition: `opacity ${T(.15)} ${T(.5)}` });
    svg.appendChild(cab);
    requestAnimationFrame(() => { cab.style.opacity = 1; });
    return [p, cab];
  }

  // ── número com a vírgula andando e deixando rastro ──
  function numRow(pai, algs) {
    const r = el('div', 'qd-nrow', '', pai);
    const fs = parseFloat(getComputedStyle(r).fontSize);
    const st = { digs: [], virg: null, vEl: null, rastros: [], arcs: [] };
    const render = () => {
      r.style.width = st.digs.length * CW + 'em';
      st.digs.forEach((d, i) => { d.style.left = i * CW + 'em'; });
      if (st.vEl) st.vEl.style.left = st.virg * CW + 'em';
      st.rastros.forEach(x => { x.el.style.left = x.b * CW + 'em'; });
      st.arcs.forEach(a => { a.el.style.left = Math.min(a.b1, a.b2) * CW + 'em'; });
    };
    for (const d of algs) { const s = el('span', 'qd-dg', '', r); s.textContent = d; st.digs.push(s); }
    render();
    return {
      el: r,
      get virg() { return st.virg; },
      async mostraVirg(b) { st.virg = b; st.vEl = el('span', 'qd-vg qd-pisca', ',', r); render(); await wait(1300); },
      async move(b2, rot) {
        const rs = el('span', 'qd-vg rastro', ',', r); st.rastros.push({ el: rs, b: st.virg });
        const larg = Math.abs(b2 - st.virg) * CW;
        const w = el('div', 'qd-arcw', `<span class="rot">${esc(rot)}</span>`, r);
        w.style.width = larg + 'em';
        const svg = document.createElementNS(NS, 'svg'); w.appendChild(svg);
        const W = larg * fs, H = 0.6 * fs, ini = b2 < st.virg ? W : 0, fimX = b2 < st.virg ? 0 : W;
        svg.setAttribute('width', W); svg.setAttribute('height', H);
        st.arcs.push({ el: w, b1: st.virg, b2 });
        render();
        curva(svg, ini, H * .95, W / 2, -H * .55, fimX, H * .95, 'var(--qd-amarelo)', fs * .045);
        await wait(350);
        st.virg = b2; render();
        await wait(900);
        w.classList.add('velha');
      },
      async poeZeroNaFrente() {
        const s = el('span', 'qd-dg novo', '', r); s.textContent = '0'; s.style.left = '0em';
        st.digs.unshift(s);
        st.virg += 1;
        st.rastros.forEach(x => { x.b += 1; });
        st.arcs.forEach(a => { a.b1 += 1; a.b2 += 1; });
        s.style.opacity = 0;
        render();
        await wait(450);
        s.style.transition = `opacity ${T(.3)}, left ${T(.6)}`; s.style.opacity = 1; s.classList.add('qd-pop');
        await wait(800);
      },
      texto() { const d = st.digs.map(x => x.textContent).join(''); return st.virg == null ? d : d.slice(0, st.virg) + ',' + d.slice(st.virg); },
    };
  }

  // ── conta armada em grade (linhas com nome; 'linha…' = o traço) ──
  function armada(pai, cols, linhas, cls = '') {
    const g = el('div', 'qd-arm ' + cls, '', pai);
    g.style.gridTemplateColumns = cols.map(t => (t === 'op' ? '.9em' : t === 'v' ? '.32em' : '.78em')).join(' ');
    const R = {};
    linhas.forEach((ln, i) => {
      if (ln.startsWith('linha')) { const d = el('div', 'qd-arm-line', '', g); d.style.gridRow = i + 1; d.style.gridColumn = '1 / -1'; R[ln] = d; return; }
      R[ln] = cols.map((t, j) => { const c = el('div', `qd-c r-${ln} t-${t}`, '', g); c.style.gridRow = i + 1; c.style.gridColumn = j + 1; return c; });
    });
    const svg = document.createElementNS(NS, 'svg'); g.appendChild(svg);
    return { g, R, svg, cols };
  }
  function ajustaSvg(A) { A.svg.setAttribute('width', A.g.offsetWidth); A.svg.setAttribute('height', A.g.offsetHeight); }
  // pedir emprestado (da direita para a esquerda): arco baixo, rente em cima dos algarismos (onde os números pequenos
  // ainda vão aparecer), nunca lá no alto
  async function setaVerde(A, de, ate, rot) {
    ajustaSvg(A);
    const fs = parseFloat(getComputedStyle(A.g).fontSize);
    const base = A.R.a[0].offsetTop + fs * .2;
    const x1 = de.offsetLeft + de.offsetWidth / 2 - fs * .05;
    const x2 = ate.offsetLeft + ate.offsetWidth / 2 + fs * .05;
    const cy = base - fs * .6;
    const [p, c] = curva(A.svg, x1, base, (x1 + x2) / 2, cy, x2, base, 'var(--qd-verde)', fs * .045);
    let r = null;
    if (rot) { r = el('div', 'qd-seta-rot', esc(rot), A.g); r.style.left = (x1 + x2) / 2 + 'px'; r.style.top = (base - fs * .4) + 'px'; }
    await wait(900);
    A.pedir = (A.pedir || []).concat([p, c]);
    return r;
  }
  // devolver: do número pequeno que emprestou até o lugar do que recebe
  //   'baixo': mesma linha (do 2 até o 10 do meio), arco por baixo, ponta subindo; 'desce': sobe e desce, como um pulo
  async function setaDevolve(A, de, ate, modo) {
    ajustaSvg(A);
    const fs = parseFloat(getComputedStyle(A.g).fontSize);
    const lw = fs * .045;
    const cx1 = de.offsetLeft + de.offsetWidth / 2, cx2 = ate.offsetLeft + ate.offsetWidth / 2;
    let x1, y1, cx, cy, x2, y2;
    if (modo === 'baixo') {
      x1 = cx1 + fs * .06; y1 = de.offsetTop + de.offsetHeight * .8;
      x2 = cx2 - fs * .12; y2 = ate.offsetTop + ate.offsetHeight * .8;
      cx = (x1 + x2) / 2; cy = Math.max(y1, y2) + fs * .2;
    } else {
      x1 = cx1 + fs * .16; y1 = de.offsetTop + de.offsetHeight * .35;
      x2 = cx2; y2 = ate.offsetTop + ate.offsetHeight * .05;
      cx = x2 + fs * .02; cy = y1 - fs * .12;
    }
    const [p, c] = curva(A.svg, x1, y1, cx, cy, x2, y2, 'var(--qd-verde)', lw);
    await wait(900);
    p.style.opacity = c.style.opacity = .55;
  }
  const colOn = (A, j, on) => Object.values(A.R).forEach(lin => Array.isArray(lin) && lin[j]?.classList.toggle('col-on', on));
  async function escreve(cel, txt, cls = '', ms = 550) { cel.textContent = txt; cel.classList.remove('vazio', 'qd-pisca'); if (cls) cel.classList.add(cls); cel.classList.remove('qd-pop'); void cel.offsetWidth; cel.classList.add('qd-pop'); await wait(ms); }

  // a conta errada: "13 + 41 = 54" → o X grande em cima do 54; sem "=", em cima de tudo
  //   PROMPT-207: "0,14 é maior" → o X só em cima do 0,14 (o número inteiro num span só: a vírgula não vira item do flex)
  function xErrado(conta) {
    const t = String(conta), i = t.lastIndexOf(' = '), m = /^(\S+) (.+)$/.exec(t);
    if (i < 0 && m) return `<span class="qd-x"><span>${virgulas(m[1])}</span></span><span>${virgulas(m[2])}</span>`;
    return i < 0 ? `<span class="qd-x"><span>${virgulas(t)}</span></span>` : `<span>${virgulas(t.slice(0, i))} =</span><span class="qd-x"><span>${virgulas(t.slice(i + 3))}</span></span>`;
  }
  async function voar(de, para, txt) {
    const r0 = fluxo(L), a = fluxo(de), b = fluxo(para);
    const k = parseFloat(para.closest('.qd-card')?.style.scale) || 1;
    const f = el('span', 'qd-voa', '', L); f.textContent = txt;
    Object.assign(f.style, { left: a.left - r0.left + 'px', top: a.top - r0.top + 'px', fontSize: getComputedStyle(de).fontSize });
    f.offsetWidth;
    Object.assign(f.style, { left: b.left - r0.left + 'px', top: b.top - r0.top + 'px', fontSize: parseFloat(getComputedStyle(para).fontSize) * k + 'px' });
    await wait(850);
    f.remove();
    para.classList.remove('qd-esconde'); para.classList.add('qd-pop');
  }

  // ── a tabuada na lateral (ajuda): o foco abre espaço para a esquerda ──
  async function abreLado(b, ate = 10) {
    L.classList.add('com-lado');
    LADO.innerHTML = ''; LADO.style.opacity = 1;
    const linhas = [];
    for (let k = 1; k <= ate; k++) linhas.push(el('div', 'qd-tab', `<span>${b} × <span class="qd-mult">${k}</span> = ${b * k}</span><span class="ok"></span>`, LADO));
    await wait(500);
    return linhas;
  }
  async function fechaLado() {
    LADO.style.opacity = 0; await wait(500);
    LADO.innerHTML = ''; L.classList.remove('com-lado'); LADO.style.opacity = '';
    await wait(400);
  }
  // o marcador desce do menor até a linha: ✔ nas que cabem, "✔ exato!" na certa; se passar, ✖ e volta uma
  async function procura(linhas, b, n) {
    linhas.forEach(t => { t.className = 'qd-tab'; t.querySelector('.ok').textContent = ''; });
    for (let k = 1; k <= linhas.length; k++) {
      const t = linhas[k - 1], v = b * k;
      t.classList.add('atual'); await wait(500); t.classList.remove('atual');
      if (v < n) { t.classList.add('cabe'); t.querySelector('.ok').textContent = '✔'; if (k === linhas.length) { t.classList.add('achou'); return { k, t }; } continue; }
      if (v === n) { t.classList.add('achou'); t.querySelector('.ok').textContent = '✔ exato!'; return { k, t }; }
      t.classList.add('passou'); t.querySelector('.ok').textContent = '✖';
      await wait(800);
      const ant = linhas[k - 2];
      if (!ant) return null;
      ant.classList.add('achou');
      await wait(400);
      return { k: k - 1, t: ant };
    }
    return null;
  }

  // ══════════════════ CENAS ══════════════════
  // ── soma e subtração armadas: vírgula embaixo de vírgula; a vírgula escondida surge; a casa vazia pisca e o 0 entra;
  //    coluna por coluna (a da vez acesa); empréstimo com as setas verdes (pedir em cima, devolver colado nos números) ──
  async function cenaArmada(s) {
    const op = s.op === '-' ? '−' : s.op;
    const X = [partes(s.a), partes(s.b)];
    const nd = Math.max(X[0].d.length, X[1].d.length);
    const esc10 = (x) => Number(x.i + x.d.padEnd(nd, '0'));
    const ri = op === '+' ? esc10(X[0]) + esc10(X[1]) : esc10(X[0]) - esc10(X[1]);
    if (ri < 0) return;
    const rs = String(ri).padStart(nd + 1, '0'), rI = nd ? rs.slice(0, -nd) : rs, rD = nd ? rs.slice(-nd) : '';
    const ni = Math.max(X[0].i.length, X[1].i.length, rI.length);
    const cols = ['op', ...Array(ni).fill('d'), ...(nd ? ['v', ...Array(nd).fill('d')] : [])];
    const vCol = nd ? ni + 1 : -1;
    const sub = op === '−';
    const c = cartao();
    const A = armada(c.conta, cols, sub ? ['emp2', 'emp', 'a', 'b', 'linha', 'r'] : ['vai', 'a', 'b', 'linha', 'r']);
    const nomes = ['a', 'b'];
    X.forEach((x, k) => {
      const R = A.R[nomes[k]];
      [...x.i].forEach((ch, idx) => { R[1 + ni - x.i.length + idx].textContent = ch; });
      if (x.temV) R[vCol].textContent = ',';
      [...x.d].forEach((ch, idx) => { R[vCol + 1 + idx].textContent = ch; });
    });
    A.R.b[0].textContent = op;
    await wait(700);
    let ps = [];
    for (const t of s.passos || []) { ps.push(await nota(c.notas, t, 'passo')); await wait(500); }
    if (nd) {
      ps.push(await nota(c.notas, 'Vírgula embaixo de vírgula.', 'passo'));
      const semV = X.map((x, k) => (!x.temV ? k : -1)).filter(k => k >= 0);
      for (const k of semV) {
        ps.push(await nota(c.notas, `O ${String(k ? s.b : s.a).trim()} tem uma vírgula escondida no fim.`, 'passo'));
        const cv = A.R[nomes[k]][vCol]; cv.textContent = ','; cv.classList.add('qd-pisca');
      }
      await wait(semV.length ? 1400 : 1000);
    } else await wait(600);
    await apagar(ps); ps = [];
    // completa com zero, dentro da conta
    for (let k = 0; k < 2; k++) {
      const x = X[k], falta = nd - x.d.length;
      if (falta <= 0) continue;
      const nome = String(k ? s.b : s.a).trim();
      const p = await nota(c.notas, falta === 1 ? `O ${nome} tem uma casa vazia: completa com zero.` : `Faltam ${falta} casas: completa com zero.`, 'passo');
      const cel = []; for (let j = vCol + 1 + x.d.length; j < cols.length; j++) cel.push(A.R[nomes[k]][j]);
      cel.forEach(e => e.classList.add('vazio', 'qd-pisca'));
      await wait(1200);
      cel.forEach(e => e.classList.remove('qd-pisca'));
      for (const e of cel) await escreve(e, '0', 'novo');
      await apagar(p);
      await regra('Zero no fim, depois da vírgula, não muda o número.');
      await wait(400);
    }
    // os valores de cima (que mudam com o empréstimo) e os de baixo
    const top = {}, topEl = {}, nivel = {}, bot = {};
    cols.forEach((t, j) => {
      if (t !== 'd') return;
      const ca = A.R.a[j].textContent, cb = A.R.b[j].textContent;
      if (/\d/.test(ca)) { top[j] = Number(ca); topEl[j] = A.R.a[j]; nivel[j] = 0; }
      bot[j] = /\d/.test(cb) ? Number(cb) : null;
    });
    const resCol = {};   // coluna → algarismo do resultado
    [...rI].forEach((ch, idx) => { resCol[1 + ni - rI.length + idx] = ch; });
    [...rD].forEach((ch, idx) => { resCol[vCol + 1 + idx] = ch; });
    const primeiraRes = 1 + ni - String(Number(rI)).length;   // sem zeros na frente (o das unidades fica)
    const esquerda = (j) => { for (let k = j - 1; k >= 1; k--) if (cols[k] === 'd') return k; return -1; };
    const linhaDe = (e) => (e.classList.contains('r-emp2') ? 2 : e.classList.contains('r-emp') ? 1 : 0);
    const modo = (de, ate) => (linhaDe(de) === linhaDe(ate) ? 'baixo' : 'desce');   // mesma linha: arco por baixo; senão, o pulo
    const lugar = (j) => (nivel[j] ? A.R.emp2[j] : A.R.emp[j]);
    const muda = async (j, v) => { topEl[j].classList.add('qd-risca'); await wait(400); const e = lugar(j); await escreve(e, String(v)); top[j] = v; topEl[j] = e; nivel[j]++; };
    let vai = 0;
    for (let j = cols.length - 1; j >= 1; j--) {
      if (cols[j] === 'v') {
        colOn(A, j, true);
        const p = await nota(c.notas, 'A vírgula desce.', 'passo');
        await escreve(A.R.r[j], ',');
        await wait(400); colOn(A, j, false);
        await apagar(p);
        continue;
      }
      if (j < primeiraRes) break;
      const t0 = top[j] ?? null, b0 = bot[j];
      if (sub && t0 != null && b0 != null && t0 < b0) {   // ── o empréstimo ──
        colOn(A, j, true);
        ps = [await nota(c.notas, `${t0} − ${b0}? Não dá! Pede emprestado ao vizinho.`, 'passo')];
        const cad = []; let k = esquerda(j);
        while (k > 0 && top[k] === 0) { cad.push(k); k = esquerda(k); }
        const fonte = k;
        if (fonte < 1) return;
        let rot = null, ant = j;
        for (const m of [...cad, fonte]) {
          const r = await setaVerde(A, A.R.a[ant], A.R.a[m], ant === j ? 'pega emprestado' : '');
          if (ant === j) rot = r;
          if (ant === j && cad.length) ps.push(await nota(c.notas, `O vizinho também é 0… vai até o ${top[fonte]}.`, 'passo'));
          ant = m;
        }
        await apagar(ps, rot); ps = [];
        ps.push(await nota(c.notas, `O ${top[fonte]} vira ${top[fonte] - 1}.`, 'passo'));
        await muda(fonte, top[fonte] - 1);
        for (const x of A.pedir || []) { x.style.transition = `opacity ${T(.5)}`; x.style.opacity = 0; }   // as setas de pedir se apagam
        A.pedir = [];
        await wait(500);
        let de = fonte;
        for (const m of [...cad].reverse()) {   // os zeros do meio: viram 10 e emprestam 1 (ficam 9)
          const alvo = lugar(m);
          await setaDevolve(A, topEl[de], alvo, modo(topEl[de], alvo));
          ps.push(await nota(c.notas, 'O zero do meio vira 10.', 'passo'));
          await muda(m, 10);
          await apagar(ps); ps = [];
          ps.push(await nota(c.notas, 'Empresta 1 para o vizinho: o 10 fica 9.', 'passo'));
          await muda(m, 9);
          de = m;
        }
        const alvo = lugar(j);
        await setaDevolve(A, topEl[de], alvo, modo(topEl[de], alvo));
        ps.push(await nota(c.notas, t0 === 0 ? (cad.length ? 'O último zero vira 10.' : 'O 0 vira 10.') : `O ${t0} vira ${t0 + 10}.`, 'passo'));
        await muda(j, t0 + 10);
        await wait(600); await apagar(ps); ps = [];
      }
      const tv = top[j] ?? null;
      let txt, dig = resCol[j];
      if (sub) {
        if (tv == null) continue;
        txt = b0 == null ? `Desce o ${tv}.` : `${tv} − ${b0} = ${tv - b0}`;
      } else {
        const soma = (tv || 0) + (b0 || 0) + vai;
        const nums = [tv, b0].filter(x => x != null);
        txt = !nums.length ? 'Desce o 1 que subiu.' : nums.length === 1 && !vai ? `Desce o ${nums[0]}.` : `${nums.join(' + ')}${vai ? ' + 1' : ''} = ${soma}`;
        const k = esquerda(j);
        if (soma >= 10 && k > 0) txt += `. Escreve ${soma % 10}, vai 1.`;
        vai = soma >= 10 ? 1 : 0;
        if (vai && k > 0) { colOn(A, j, true); const p = await nota(c.notas, txt, 'passo'); await escreve(A.R.r[j], dig, 'res'); await escreve(A.R.vai[k], '1'); await wait(400); colOn(A, j, false); await apagar(p); continue; }
      }
      colOn(A, j, true);
      const p = await nota(c.notas, txt, 'passo');
      await escreve(A.R.r[j], dig ?? '', 'res');
      await wait(400); colOn(A, j, false);
      await apagar(p);
    }
    await wait(300);
    const conta = `${String(s.a).trim()} ${op} ${String(s.b).trim()} = ${comVirgula(ri, nd)}`;
    if (s.pegadinha) {   // a conta certa vai para o histórico; no foco, o jeito errado riscado
      await paraHist(c);
      const c2 = cartao();
      el('div', 'qd-expr qd-errado', xErrado(s.pegadinha.conta), c2.conta);
      await wait(700);
      await nota(c2.notas, s.pegadinha.passo, 'passo');
      await wait(600);
      await certoEmbaixo(c2, `<span>${virgulas(conta)}</span>`);
    }
    await fim(s, conta, sub ? ['Não dá? Pede emprestado ao vizinho.'] : ['Vírgula embaixo de vírgula!']);
  }

  // ── multiplicar com vírgula: conta as casas → multiplica sem a vírgula → anda a vírgula ──
  async function cenaMult(s) {
    const X = [partes(s.a), partes(s.b)], n = X[0].d.length + X[1].d.length;
    const semV = X.map(x => String(Number(x.i + x.d)));
    const prod = String(Number(semV[0]) * Number(semV[1]));
    // 1) as casas
    const c1 = cartao();
    const numHtml = (x) => `<span>${x.i}${x.temV ? '<span class="qd-v">,</span>' : ''}${[...x.d].map(d => `<span class="qd-dgt">${d}</span>`).join('')}</span>`;
    c1.conta.innerHTML = `<div class="qd-expr">${numHtml(X[0])}<span class="op">×</span>${numHtml(X[1])}</div>`;
    await wait(700);
    let p = await nota(c1.notas, 'Primeiro conta as casas depois da vírgula.', 'passo');
    for (const sp of c1.conta.querySelectorAll(':scope .qd-expr > span:not(.op)')) {
      [...sp.querySelectorAll('.qd-dgt')].forEach((d, k, arr) => { d.dataset.k = k + 1; d.dataset.n = arr.length; });
      for (const d of sp.querySelectorAll('.qd-dgt')) { d.classList.add('casa-on'); el('span', 'qd-badge qd-pop', d.dataset.k, d); await wait(700); }
    }
    await nota(c1.notas, `${casasTxt(X[0].d.length)} + ${casasTxt(X[1].d.length)} = [[${n}]] ${n === 1 ? 'casa' : 'casas'}`, 'detalhe');
    await wait(1000); await apagar(p);
    await paraHist(c1);
    // 2) a conta sem a vírgula
    const c2 = cartao();
    const [cima, baixo] = semV[1].length > semV[0].length ? [semV[1], semV[0]] : [semV[0], semV[1]];
    const cols = ['op', ...Array(Math.max(cima.length, prod.length)).fill('d')];
    const last = cols.length - 1;
    p = await nota(c2.notas, 'Agora faz a conta sem a vírgula.', 'passo');
    if (baixo.length === 1) {
      const A = armada(c2.conta, cols, ['vai', 'a', 'b', 'linha', 'r']);
      [...cima].forEach((ch, i) => { A.R.a[last - cima.length + 1 + i].textContent = ch; });
      A.R.b[0].textContent = '×'; A.R.b[last].textContent = baixo;
      await wait(600);
      const m = Number(baixo);
      let vai = 0;
      for (let i = 0; i < cima.length; i++) {
        const j = last - i, d = Number(cima[cima.length - 1 - i]), pr = d * m + vai, ultimo = i === cima.length - 1;
        colOn(A, j, true);
        let q = null;
        if (cima.length > 1) q = await nota(c2.notas, `${m} × ${d}${vai ? ` = ${d * m}, mais ${vai}` : ''} = ${pr}${pr >= 10 && !ultimo ? `. Escreve ${pr % 10}, vai ${Math.floor(pr / 10)}.` : ''}`, 'passo');
        else await wait(500);
        if (ultimo) { const t = String(pr); for (let k = 0; k < t.length; k++) await escreve(A.R.r[j - t.length + 1 + k], t[k], 'res'); }
        else { await escreve(A.R.r[j], String(pr % 10), 'res'); if (pr >= 10) await escreve(A.R.vai[j - 1], String(Math.floor(pr / 10))); }
        vai = ultimo ? 0 : Math.floor(pr / 10);
        colOn(A, j, false);
        if (q) { await wait(300); await apagar(q); }
      }
    } else {   // dois algarismos embaixo: uma linha para cada, e depois soma
      const pps = [...baixo].reverse().map((d, i) => ({ d, v: String(Number(cima) * Number(d)), i }));
      const linhas = ['a', 'b', 'linha', ...pps.map((_, i) => 'p' + i), 'linha2', 'r'];
      const A = armada(c2.conta, cols, linhas);
      [...cima].forEach((ch, i) => { A.R.a[last - cima.length + 1 + i].textContent = ch; });
      A.R.b[0].textContent = '×'; [...baixo].forEach((ch, i) => { A.R.b[last - baixo.length + 1 + i].textContent = ch; });
      A.R.linha2.style.visibility = 'hidden';
      await wait(600);
      for (const pp of pps) {
        const q = await nota(c2.notas, `${cima} × ${pp.d} = ${pp.v}${pp.i ? ': escreve um lugar para a esquerda.' : ''}`, 'passo');
        const R = A.R['p' + pp.i];
        if (pp.i) R[0].textContent = '+';
        for (let k = 0; k < pp.v.length; k++) { const cel = R[last - pp.i - pp.v.length + 1 + k]; if (cel) await escreve(cel, pp.v[k], '', 250); }
        await wait(600); await apagar(q);
      }
      A.R.linha2.style.visibility = '';
      const q = await nota(c2.notas, `Agora soma: ${pps.map(pp => pp.v + '0'.repeat(pp.i)).join(' + ')} = ${prod}`, 'passo');
      for (let k = 0; k < prod.length; k++) await escreve(A.R.r[last - prod.length + 1 + k], prod[k], 'res', 250);
      await wait(600); await apagar(q);
    }
    await wait(800); await apagar(p);
    await paraHist(c2);
    // 3) a vírgula anda (com rastro)
    const c3 = cartao();
    const N = numRow(c3.conta, [...prod]);
    N.el.style.color = 'var(--qd-verde)';
    await wait(400);
    p = await nota(c3.notas, `O ${prod} tem uma vírgula escondida no fim.`, 'passo');
    await N.mostraVirg(prod.length);
    await apagar(p);
    L.querySelectorAll('.qd-hist .qd-circ').forEach(x => x.classList.add('brilha'));
    p = await nota(c3.notas, `Tinha [[${n}]] ${n === 1 ? 'casa' : 'casas'}: a vírgula anda ${casasTxt(n)} para a esquerda.`, 'passo');
    await wait(400);
    const extra = await pulos(c3, N, n);
    await apagar(p, extra);
    await caminhoELimpo(c3, N);
    // PROMPT-207 (exceção da vírgula com rastro): o caminho fica no centro e a resposta já está na caixa verde embaixo
    for (const r of s.regras || ['Conta as casas → multiplica sem a vírgula → anda a vírgula.']) await regra(r);
  }
  // a vírgula anda n casas para a esquerda; faltou número → põe 0
  async function pulos(c, N, n) {
    const extra = [];
    for (let i = 1; i <= n; i++) {
      if (N.virg === 0) { extra.push(await nota(c.notas, 'Faltou número? Põe 0.', 'passo')); await N.poeZeroNaFrente(); }
      await N.move(N.virg - 1, `${i}ª`);
    }
    return extra;
  }
  // PROMPT-206: o caminho (setinhas, vírgulas clarinhas, zeros tracejados) fica no foco, mais clarinho; embaixo, ↓ e o
  // resultado limpo, grande e verde (sem os zeros do fim depois da vírgula)
  async function caminhoELimpo(c, N) {
    if (N.virg === 0) {
      const p = await nota(c.notas, 'Vírgula na frente? Põe um 0 antes dela.', 'passo');
      await N.poeZeroNaFrente();
      await wait(700); await apagar(p);
    }
    const txt = N.texto(), limpo = semZerosFim(txt);
    N.el.style.transition = `opacity ${T(.5)}`; N.el.style.opacity = .55;
    el('div', 'qd-seta-baixo qd-pop', '↓', c.conta);
    await wait(350);
    el('div', 'qd-limpo qd-pop', `<div class="qd-caixa-ok">${virgulas(limpo)}</div>`, c.conta);   // PROMPT-207: o resultado limpo na caixa verde
    await wait(800);
    if (limpo !== txt) { await nota(c.notas, 'Zero no fim, depois da vírgula, pode sair.', 'passo'); await wait(600); }
    return limpo;
  }

  // ── fração: o tracinho vira ÷ (vai para o histórico) ──
  async function fracaoVira(p, d) {
    const c1 = cartao();
    c1.conta.innerHTML = fracHtml(p, d);
    await wait(700);
    const q = await nota(c1.notas, 'O tracinho da fração é uma divisão.', 'passo');
    await wait(500);
    c1.conta.innerHTML = `<div class="qd-expr qd-pop"><span>${p}</span><span class="op qd-pisca">÷</span><span>${d}</span></div>`;
    await wait(1400); await apagar(q);
    await paraHist(c1);
  }

  // ── fração → decimal: divisão com a chave e a tabuada inteira na lateral; o número voa da tabuada para o resultado ──
  async function cenaFracDec(s) {
    const p = Number(s.p), d = Number(s.d);
    if (!(p > 0 && d > 1 && p < d)) return;
    const passos = []; let r = p;
    while (r && passos.length < 3) { const n = r * 10, q = Math.floor(n / d), v = q * d; passos.push({ n, q, v, resto: n - v }); r = n - v; }
    const nDec = passos.length, ps0 = String(p), pl = ps0.length;
    await fracaoVira(p, d);
    const linhasTab = await abreLado(d);
    const c2 = cartao();
    const D = el('div', 'qd-divi', '', c2.conta);
    const cols = ['op', ...Array(pl).fill('d'), 'v', ...Array(nDec).fill('d')];
    const nomes = ['a']; passos.forEach((_, i) => nomes.push('s' + i, 'linha' + i, 'r' + i));
    const A = armada(D, cols, nomes, 'qd-dvd');
    nomes.filter(x => x.startsWith('linha')).forEach(x => { A.R[x].style.visibility = 'hidden'; });
    [...ps0].forEach((ch, i) => { A.R.a[1 + i].textContent = ch; });
    const vCol = pl + 1, dec = (i) => vCol + 1 + i;
    const dcols = cols.map((t, j) => (t === 'd' ? j : -1)).filter(j => j > 0);
    const cels = (row, fimCol, len) => { const k = dcols.indexOf(fimCol); return dcols.slice(Math.max(0, k - len + 1), k + 1).map(j => A.R[row][j]); };
    const dvs = el('div', 'qd-dvs', `<div class="b">${d}</div>`, D);
    const qEl = el('div', 'qd-q', '', dvs);
    const qs = ['0', ',', ...passos.map(x => String(x.q))].map((t, i) => { const e = el('span', 'qd-esconde' + (i === 1 ? ' qd-v' : ''), '', qEl); e.textContent = t; return e; });
    await wait(600);
    let q = await nota(c2.notas, `${p} cabe no ${d}? Não!`, 'passo');
    const intCels = cels('a', pl, pl);
    intCels.forEach(e => e.classList.add('olha')); await wait(700);
    let q2 = await nota(c2.notas, 'Escreve 0, no resultado.', 'passo');
    qs[0].classList.remove('qd-esconde'); qs[0].classList.add('qd-pop'); await wait(400);
    qs[1].classList.remove('qd-esconde'); qs[1].classList.add('qd-pop'); await wait(700);
    intCels.forEach(e => e.classList.remove('olha'));
    await apagar(q, q2);
    q = await nota(c2.notas, `O ${p} tem uma vírgula escondida. Põe um zero: ${p} = ${p},0`, 'passo');
    A.R.a[vCol].textContent = ','; A.R.a[vCol].classList.add('qd-pisca'); await wait(900);
    A.R.a[dec(0)].classList.add('vazio'); await wait(500);
    await escreve(A.R.a[dec(0)], '0', 'novo');
    await wait(600); await apagar(q);
    await regra('Zero no fim, depois da vírgula, não muda o número.');
    for (let i = 0; i < passos.length; i++) {
      const st = passos[i], fimCol = dec(i);
      const olha = cels(i ? 'r' + (i - 1) : 'a', fimCol, String(st.n).length);
      olha.forEach(e => e.classList.add('olha'));
      q = await nota(c2.notas, `Quanto o ${d} cabe no ${st.n}? Procura na tabuada.`, 'passo');
      const ach = await procura(linhasTab, d, st.n);
      await wait(700); await apagar(q);
      if (!ach) return;
      q = await nota(c2.notas, `${d} × ${st.q} = ${st.v}. Escreve o ${st.q} no resultado.`, 'passo');
      await voar(ach.t.querySelector('.qd-mult'), qs[2 + i], String(st.q));
      await wait(600); await apagar(q);
      olha.forEach(e => e.classList.remove('olha'));
      q = await nota(c2.notas, `Tira o ${st.v}: ${st.n} − ${st.v} = ${st.resto}.${st.resto ? '' : ' Não sobrou nada!'}`, 'passo');
      A.R['s' + i][0].textContent = '−';
      for (const [k, e] of cels('s' + i, fimCol, String(st.v).length).entries()) await escreve(e, String(st.v)[k]);
      A.R['linha' + i].style.visibility = 'visible'; await wait(300);
      const rt = String(st.resto);
      for (const [k, e] of cels('r' + i, fimCol, rt.length).entries()) await escreve(e, rt[k]);
      await wait(800); await apagar(q);
      if (st.resto && i + 1 < passos.length) {
        q = await nota(c2.notas, 'Sobrou? Põe outro zero.', 'passo');
        A.R.a[dec(i + 1)].classList.add('vazio'); await wait(500);
        await escreve(A.R.a[dec(i + 1)], '0', 'novo');
        await escreve(A.R['r' + i][dec(i + 1)], '0', 'novo');
        await wait(600); await apagar(q);
      }
    }
    await fechaLado();
    const res = '0,' + passos.map(x => x.q).join('');
    await fim(s, `${p}/${d} = ${res}`, ['Fração vira decimal dividindo.']);
  }

  // ── fração com 10, 100, 1000 embaixo: conta os zeros, a vírgula anda (com rastro) ──
  async function cenaDivK(s) {
    const p = String(s.p), k = Number(s.k), z = String(k).length - 1;
    await fracaoVira(p, k);
    const c = cartao();
    const N = numRow(c.conta, [...p]);
    await wait(400);
    let q = await nota(c.notas, `O ${p} tem uma vírgula escondida no fim.`, 'passo');
    await N.mostraVirg(p.length);
    await apagar(q);
    await nota(c.notas, `${k} tem ${plural(z, 'zero', 'zeros')} = [[${z}]] ${z === 1 ? 'casa' : 'casas'}`, 'detalhe');
    await wait(500);
    q = await nota(c.notas, `A vírgula anda ${casasTxt(z)} para a esquerda.`, 'passo');
    c.notas.querySelectorAll('.qd-circ').forEach(x => x.classList.add('brilha'));
    await wait(400);
    const extra = await pulos(c, N, z);
    await apagar(q, extra);
    await caminhoELimpo(c, N);
    for (const r of s.regras || ['Conta os zeros!']) await regra(r);
  }

  // ── qual é o maior: um embaixo do outro, o zero entra, compara sem a vírgula ──
  async function cenaCompara(s) {
    const vs = (s.v || []).map(x => String(x).trim()), X = vs.map(partes);
    if (vs.length !== 2) return;
    const ni = Math.max(...X.map(x => x.i.length)), nd = Math.max(...X.map(x => x.d.length));
    const c1 = cartao();
    let q = await nota(c1.notas, 'Qual é o maior?', 'passo');
    const cols = [...Array(ni).fill('d'), 'v', ...Array(nd).fill('d')];
    const A = armada(c1.conta, cols, ['a', 'b']);
    ['a', 'b'].forEach((nome, k) => {
      const x = X[k];
      [...x.i].forEach((ch, idx) => { A.R[nome][ni - x.i.length + idx].textContent = ch; });
      A.R[nome][ni].textContent = ',';
      [...x.d].forEach((ch, idx) => { A.R[nome][ni + 1 + idx].textContent = ch; });
    });
    await wait(900);
    for (let k = 0; k < 2; k++) {
      const x = X[k], falta = nd - x.d.length;
      if (falta <= 0) continue;
      const q2 = await nota(c1.notas, falta === 1 ? `O ${vs[k]} tem uma casa vazia: completa com zero.` : `Faltam ${falta} casas: completa com zero.`, 'passo');
      const cel = []; for (let j = ni + 1 + x.d.length; j < cols.length; j++) cel.push(A.R[k ? 'b' : 'a'][j]);
      cel.forEach(e => e.classList.add('vazio', 'qd-pisca'));
      await wait(1200);
      cel.forEach(e => e.classList.remove('qd-pisca'));
      for (const e of cel) await escreve(e, '0', 'novo');
      await apagar(q2);
      await nota(c1.notas, `${vs[k]} = ${x.i},${x.d.padEnd(nd, '0')}`, 'detalhe');
      await wait(600);
    }
    await wait(800); await apagar(q);
    await paraHist(c1);
    const sem = X.map(x => Number(x.i + x.d.padEnd(nd, '0')));
    const iM = sem[0] >= sem[1] ? 0 : 1, maior = vs[iM];
    const c2 = cartao();
    c2.conta.innerHTML = `<div class="qd-expr"><span>${sem[0]}</span><span class="op qd-sinal">?</span><span>${sem[1]}</span></div>`;
    q = await nota(c2.notas, 'Agora compara sem a vírgula.', 'passo');
    await wait(900);
    const sinal = c2.conta.querySelector('.qd-sinal');
    sinal.textContent = sem[0] > sem[1] ? '>' : sem[0] < sem[1] ? '<' : '='; sinal.classList.add('qd-pop');
    await wait(700); await apagar(q);
    q = await nota(c2.notas, `${sem[iM]} é maior. Então ${maior} é o maior!`, 'passo');
    await wait(1200);
    if (s.pegadinha) {
      await apagar(q);
      await paraHist(c2);
      const c3 = cartao();
      el('div', 'qd-expr qd-errado', xErrado(s.pegadinha.conta), c3.conta);
      await wait(700);
      await nota(c3.notas, s.pegadinha.passo, 'passo');
      await wait(600);
      await certoEmbaixo(c3, `<span>${virgulas(maior)} &gt; ${virgulas(vs[1 - iM])}</span>`);
    }
    await fim(s, `${maior} é o maior`, ['Iguala as casas e depois compara.']);
  }

  // ── decimal → fração: as casas acendem; 1 casa → embaixo 10, 2 casas → embaixo 100; simplifica com a tabuada ──
  async function cenaDecFrac(s) {
    const vs = (s.v || []).map(x => String(x).trim());
    let resp = '';
    for (let iv = 0; iv < vs.length; iv++) {
      const x = partes(vs[iv]), n = x.d.length, den = 10 ** n, num = Number(x.i + x.d);
      const c = cartao();
      c.conta.innerHTML = `<div class="qd-expr qd-meio"><span class="qd-num">${x.i}<span class="qd-v">,</span>${[...x.d].map((d, k) => `<span class="qd-dgt" data-k="${k + 1}">${d}</span>`).join('')}</span></div>`;
      const ex = c.conta.firstElementChild;
      await wait(700);
      let q = await nota(c.notas, 'Conta as casas depois da vírgula.', 'passo');
      for (const d of ex.querySelectorAll('.qd-dgt')) { d.classList.add('casa-on'); el('span', 'qd-badge qd-pop', d.dataset.k, d); await wait(700); }
      await apagar(q);
      await nota(c.notas, `${casasTxt(n)} → embaixo ${den}`, 'detalhe');
      await wait(500);
      el('span', 'op', '=', ex); el('span', 'qd-pop', fracHtml(num, den), ex);
      await wait(900);
      const g = mdc(num, den);
      let final = [num, den];
      if (g > 1) {
        q = await nota(c.notas, `Dá para simplificar? ${num} e ${den} dividem por ${g}.`, 'passo');
        const linhas = await abreLado(g, Math.min(10, den / g));
        for (let k = 1; k <= linhas.length; k++) {
          const t = linhas[k - 1], v = g * k;
          t.classList.add('atual'); await wait(450); t.classList.remove('atual');
          if (v === num || v === den) { t.classList.add('achou'); t.querySelector('.ok').textContent = '✔'; await wait(400); }
          if (v >= den) break;
        }
        await wait(500); await apagar(q);
        el('span', 'qd-simp qd-pop', `<span class="qd-sd">÷ ${g}</span><span class="qd-seta">→</span><span class="qd-sd">÷ ${g}</span>`, ex);
        await wait(700);
        q = await nota(c.notas, `${num} ÷ ${g} = ${num / g} e ${den} ÷ ${g} = ${den / g}.`, 'passo');
        el('span', 'qd-pop', fracHtml(num / g, den / g, 'res'), ex);
        await wait(1200); await apagar(q);
        await fechaLado();
        final = [num / g, den / g];
      }
      resp = `<span class="qd-expr qd-meio"><span>${virgulas(vs[iv])}</span><span class="op">=</span>${fracHtml(...final)}</span>`;
      if (iv < vs.length - 1) await paraHist(c);
    }
    await respostaFinal(resp);
    for (const r of s.regras || ['1 casa é 10, 2 casas é 100!']) await regra(r);
  }

  // ══════════════════ PROMPT-206: 4-A (frações) — protótipo referencia/lousa-4a.html ══════════════════
  const Qm = '<span class="vazio-q">?</span>';
  const fracH = (n, d, cls = '') => `<span class="qd-fr${cls ? ' ' + cls : ''}"><span class="fn">${n}</span><span class="fl"></span><span class="fd">${d}</span></span>`;
  function fx(pai, html, cls = '') {
    const w = el('div', 'qd-fx' + (cls ? ' ' + cls : ''), html, pai);
    const svg = document.createElementNS(NS, 'svg'); w.appendChild(svg);
    return { w, svg, fr: (i) => w.querySelectorAll(':scope > .qd-fr')[i] };
  }
  const parte = (fr, q) => fr.querySelector(q === 'n' ? '.fn' : '.fd');
  const pisca = (els, on) => els.forEach(e => e.classList.toggle('ok-pisca', on));
  async function poe(fr, q, v) { const e = parte(fr, q); e.innerHTML = v; e.classList.remove('qd-pop'); void e.offsetWidth; e.classList.add('qd-pop'); await wait(500); }
  // posição de um elemento dentro do fx, em px de layout (o cartão pode estar com escala)
  function rel(w, e) {
    const a = w.getBoundingClientRect(), b = e.getBoundingClientRect(), k = a.width / (w.offsetWidth || 1) || 1;
    return { x: (b.left - a.left) / k, y: (b.top - a.top) / k, w: b.width / k, h: b.height / k };
  }
  // setinha azul curva de um número da fração até o outro (em cima: os de cima; embaixo: os de baixo), com o rótulo
  async function arcoX(F, de, ate, lado, rot) {
    F.svg.setAttribute('width', F.w.offsetWidth); F.svg.setAttribute('height', F.w.offsetHeight);
    const fs = parseFloat(getComputedStyle(F.w).fontSize);
    const A = rel(F.w, de), B = rel(F.w, ate), cima = lado === 'cima';
    const x1 = A.x + A.w * .75, x2 = B.x + B.w * .25;
    const y1 = cima ? A.y + fs * .02 : A.y + A.h - fs * .02, y2 = cima ? B.y + fs * .02 : B.y + B.h - fs * .02;
    const cy = cima ? Math.min(y1, y2) - fs * .6 : Math.max(y1, y2) + fs * .6;
    curva(F.svg, x1, y1, (x1 + x2) / 2, cy, x2, y2, 'var(--qd-azul)', fs * .045);
    const r = el('div', 'rotx', esc(rot), F.w);
    r.style.left = (x1 + x2) / 2 + 'px';
    r.style.top = (cima ? (y1 + cy) / 2 - fs * .22 : (y1 + cy) / 2 + fs * .22) + 'px';
    await wait(900);
  }
  // barra em bloquinhos separados; a fração em pé à esquerda ("2/3" ou "1/3: cortado em 3"); o texto embaixo
  function barra(pai, n, titulo = '') {
    const m = String(titulo).match(/^(\d+)\/(\d+)(?::\s*(.*))?$/);
    const L0 = el('div', 'qd-barra-l', m ? `<span class="bf">${fracH(m[1], m[2])}</span>` : '<span></span>', pai);
    const b = el('div', 'qd-barra', '', L0);
    b.style.gap = (n > 10 ? .14 : n > 6 ? .25 : .35) + 'cqw';
    if (m?.[3] || (!m && titulo)) el('div', 'bt', esc(m ? m[3] : titulo), L0);
    const cs = Array.from({ length: n }, () => el('i', '', '', b));
    return { L: L0, cs, async pinta(qtd, cls = 'pt', ms = 260) { const i0 = cs.filter(c => c.className).length; for (let i = i0; i < Math.min(cs.length, i0 + qtd); i++) { cs[i].classList.add(cls); await wait(ms); } } };
  }
  async function trocaLado(monta) {
    LADO.style.opacity = 0; await wait(450);
    LADO.innerHTML = '';
    const r = monta();
    LADO.style.opacity = 1; await wait(450);
    return r;
  }
  const temLado = () => LADO.children.length > 0;
  const novoLado = async (monta) => (temLado() ? trocaLado(monta) : monta());
  function tabuadaA(n, ate = 10) {
    return Array.from({ length: ate }, (_, k) => el('div', 'qd-tab', `<span>${n} × ${k + 1} = <span class="res">${n * (k + 1)}</span></span><span class="ok"></span>`, LADO));
  }
  // o marcador desce pela tabuada procurando o número: acha (✔ e linha verde) ou passa (✖)
  async function procuraAlvo(T, alvo) {
    for (const t of T) {
      const v = Number(t.querySelector('.res').textContent);
      t.classList.add('atual'); await wait(380); t.classList.remove('atual');
      if (v === alvo) { t.classList.add('achou'); t.querySelector('.ok').textContent = `✔ ${alvo}`; await wait(500); return t; }
      if (v > alvo) { t.querySelector('.ok').textContent = '✖'; await wait(500); return null; }
    }
    return null;
  }
  const ladoLargo = () => L.classList.add('com-lado', 'lado-largo');
  // etiqueta com o nome do conceito, no alto, em cima do foco (fica a página toda)
  async function etiqueta(nome, sub = '') {
    L.querySelector('.qd-etq')?.remove();
    L.classList.add('com-etq');
    const e = el('div', 'qd-etq', `<b class="qd-pop">${esc(nome)}</b>`, L);
    await wait(450);
    if (sub) await nota(e, sub, 'etq-sub');
    await wait(300);
  }
  const fxR = (...pecas) => `<span class="qd-fx">${pecas.map(p => (Array.isArray(p) ? fracH(p[0], p[1]) : `<span>${p}</span>`)).join('')}</span>`;
  // a pegadinha: a conta errada em vermelho, com um X grande em cima do resultado errado
  async function pegadinhaFr(html, txt) {
    const c = cartao();
    c.conta.innerHTML = `<div class="qd-fx qd-errado">${html}</div>`;
    await nota(c.notas, txt, 'passo');
    await wait(500);
    return c;
  }
  // um passo de simplificar com a tabuada do g (no foco; o cartão de antes já foi para o histórico)
  async function simplificaCom(x, y, g, primeira = false) {
    const T = await novoLado(() => tabuadaA(g));
    const c = cartao();
    const F = fx(c.conta, `${fracH(x, y)}<span class="igual">=</span>${fracH(Qm, Qm)}`);
    const a = F.fr(0), b = F.fr(1);
    await wait(500);
    let ps = [await nota(c.notas, primeira ? `Qual número divide o ${x} e o ${y}?` : `Dá para simplificar? Procura na tabuada do ${g}.`, 'passo')];
    if (primeira) ps.push(await nota(c.notas, `Procura os dois na tabuada do ${g}.`, 'passo'));
    pisca([parte(a, 'n')], true); await procuraAlvo(T, x); pisca([parte(a, 'n')], false);
    pisca([parte(a, 'd')], true); await procuraAlvo(T, y); pisca([parte(a, 'd')], false);
    await apagar(ps);
    const p = await nota(c.notas, primeira ? `Os dois estão: divide em cima e embaixo por ${g}.` : `Os dois estão: divide por ${g}.`, 'passo');
    await arcoX(F, parte(a, 'n'), parte(b, 'n'), 'cima', `÷ ${g}`); await poe(b, 'n', x / g);
    await arcoX(F, parte(a, 'd'), parte(b, 'd'), 'baixo', `÷ ${g}`); await poe(b, 'd', y / g);
    await wait(400); await apagar(p);
    return c;
  }
  // os divisores para simplificar até o fim: primos pequenos (a tabuada vai até × 10)
  function divisores(x, y) {
    const out = [];
    for (let guarda = 0; guarda < 8 && mdc(x, y) > 1; guarda++) {
      const g = mdc(x, y);
      let p = [2, 3, 5, 7].find(q => x % q === 0 && y % q === 0 && Math.max(x, y) <= 10 * q);
      if (!p) p = g;   // a tabuada do mdc
      out.push(p); x /= p; y /= p;
    }
    return out;
  }
  // depois de uma conta: de uma vez, pela tabuada do mdc (se a tabuada até × 10 alcança); senão, pelos primos
  const divisoresMdc = (x, y) => { const g = mdc(x, y); return g > 1 && Math.max(x, y) <= 10 * g ? [g] : divisores(x, y); };
  const NUM_F = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze'];
  const DEN_F = { 2: 'meio', 3: 'terço', 4: 'quarto', 5: 'quinto', 6: 'sexto', 7: 'sétimo', 8: 'oitavo', 9: 'nono', 10: 'décimo' };
  const leitura = (n, d) => { const nm = NUM_F[n] ?? String(n), dn = DEN_F[d] ? DEN_F[d] + (n > 1 ? 's' : '') : `${NUM_F[d] ?? d} avos`; return `${nm} ${dn}`; };

  // 1) o que é fração: o chocolate (ou a pizza) em pedaços iguais
  async function cenaFracao(s) {
    const n = Number(s.n), d = Number(s.d), pz = !!s.pizza;
    ladoLargo();
    let qs;
    if (pz) {
      const W = 100, R = 46, svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '-50 -50 100 100'); svg.setAttribute('class', 'qd-pizza'); LADO.appendChild(svg);
      qs = Array.from({ length: d }, (_, i) => {
        const a0 = -Math.PI / 2 + i * 2 * Math.PI / d, a1 = a0 + 2 * Math.PI / d, am = (a0 + a1) / 2;
        const g = document.createElementNS(NS, 'g');
        g.innerHTML = `<path d="M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 0 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z"/>`;
        g.style.setProperty('--dx', `${Math.cos(am) * 6}px`); g.style.setProperty('--dy', `${Math.sin(am) * 6}px`);
        g.dataset.tx = R * .62 * Math.cos(am); g.dataset.ty = R * .62 * Math.sin(am);
        svg.appendChild(g);
        return g;
      });
      void W;
    } else {
      const ch = el('div', 'qd-choco', '', LADO);
      ch.style.gridTemplateColumns = `repeat(${d % 4 === 0 ? 4 : d % 3 === 0 ? 3 : d % 5 === 0 ? 5 : Math.min(d, 4)}, 1fr)`;
      qs = Array.from({ length: d }, () => el('i', '', '', ch));
    }
    const num = (q, k) => { if (pz) { const t = document.createElementNS(NS, 'text'); t.setAttribute('x', q.dataset.tx); t.setAttribute('y', q.dataset.ty); t.setAttribute('class', 'k'); t.textContent = k; q.appendChild(t); } else el('span', 'k qd-pop', String(k), q); };
    const c = cartao();
    const F = fx(c.conta, fracH(Qm, Qm)), f = F.fr(0);
    await wait(600);
    let p = await nota(c.notas, pz ? `Uma pizza cortada em ${d} pedaços iguais.` : 'Um chocolate dividido em pedaços iguais.', 'passo');
    for (const [i, q] of qs.entries()) { num(q, i + 1); await wait(170); }
    let p2 = await nota(c.notas, `São ${d} pedaços: o ${d} vai embaixo.`, 'passo');
    await poe(f, 'd', d);
    await wait(400);
    qs.forEach(q => q.querySelector('.k')?.remove());
    await apagar(p, p2);
    const verbo = pz ? 'Comi' : 'Peguei';
    p = await nota(c.notas, `${verbo} ${plural(n, 'pedaço', 'pedaços')}.`, 'passo');
    for (let i = 0; i < n; i++) { qs[i].classList.add('peguei'); num(qs[i], i + 1); await wait(450); }
    p2 = await nota(c.notas, `${verbo} ${n}: o ${n} vai em cima.`, 'passo');
    await poe(f, 'n', n);
    await wait(500); await apagar(p, p2);
    await nota(c.notas, `lê-se: ${n} sobre ${d}`, 'detalhe');   // PROMPT-207
    await respostaFinal(`<div class="qd-leit-fr">${fracH(n, d)}<div class="lei"><b>lê-se: ${n} sobre ${d}</b><small>ou ${leitura(n, d)}</small></div></div>`);
    for (const r of s.regras || [`Embaixo: em quantos pedaços. Em cima: quantos ${pz ? 'comi' : 'peguei'}.`]) await regra(r);
  }

  // 2) fração equivalente: × em cima e embaixo, as barras do mesmo tamanho; pegadinha: somar não vale
  async function cenaEquiv(s) {
    const a = Number(s.a), b = Number(s.b), k = Number(s.k), A2 = a * k, B2 = b * k;
    ladoLargo();
    await etiqueta('FRAÇÃO EQUIVALENTE', 'fração igual: mesmo tamanho com outros números');
    const vis = el('div', 'qd-vis', '', LADO);
    const c = cartao();
    const F = fx(c.conta, `${fracH(a, b)}<span class="igual">=</span>${fracH(Qm, Qm)}`), f0 = F.fr(0), f1 = F.fr(1);
    await wait(600);
    const b1 = barra(vis, b, `${a}/${b}`); await b1.pinta(a);
    await wait(300);
    const p = await nota(c.notas, 'O que faz em cima, faz embaixo.', 'passo');
    const p0 = await nota(c.notas, `Multiplica em cima por ${k}.`, 'passo');
    await arcoX(F, parte(f0, 'n'), parte(f1, 'n'), 'cima', `× ${k}`);
    await poe(f1, 'n', A2);
    await apagar(p0);
    const p2 = await nota(c.notas, `E embaixo também por ${k}.`, 'passo');
    await arcoX(F, parte(f0, 'd'), parte(f1, 'd'), 'baixo', `× ${k}`);
    await poe(f1, 'd', B2);
    await apagar(p, p2);
    if (B2 <= 30) {
      const q = await nota(c.notas, 'Olha as barras: o pintado é do mesmo tamanho!', 'passo');
      const b2 = barra(vis, B2, `${A2}/${B2}`); await b2.pinta(A2, 'pt', 140);
      await wait(900); await apagar(q);
    }
    if (s.pegadinha !== false) {
      await paraHist(c);
      const cp = await pegadinhaFr(`${fracH(`${a} + ${k}`, `${b} + ${k}`)}<span class="igual">=</span><span class="qd-x">${fracH(a + k, b + k)}</span>`, 'Pegadinha: somar não vale! Tem que multiplicar.');
      await wait(600);
      await certoEmbaixo(cp, fxR([a, b], '=', [A2, B2]));
    }
    await respostaFinal(fxR([a, b], '=', [A2, B2]));
    for (const r of s.regras || ['Fração igual = fração equivalente.', 'O que faz em cima, faz embaixo.']) await regra(r);
  }

  // 3) simplificar: divide em cima e embaixo pelo mesmo número (a tabuada mostra quem divide) até não dar mais
  async function cenaSimplif(s) {
    const n = Number(s.n), d = Number(s.d);
    ladoLargo();
    await etiqueta('SIMPLIFICAR FRAÇÃO', 'deixar com números menores, sem mudar o tamanho');
    const gs = divisores(n, d);
    let x = n, y = d, c = null;
    for (const [i, g] of gs.entries()) {
      if (c) await paraHist(c);
      c = await simplificaCom(x, y, g, i === 0);
      x /= g; y /= g;
    }
    if (!c) return;
    const p = await nota(c.notas, `${x} e ${y} não dividem mais juntos: acabou!`, 'passo');
    if (d <= 30) {
      const vis = await trocaLado(() => el('div', 'qd-vis', '', LADO));
      const b1 = barra(vis, d, `${n}/${d}`); await b1.pinta(n, 'pt', 60);
      const b2 = barra(vis, y, `${x}/${y}`); await b2.pinta(x);
    }
    await wait(500); await apagar(p);
    await nota(c.notas, `Simplificar dá uma fração equivalente: ${n}/${d} = ${x}/${y}.`, 'detalhe');
    await respostaFinal(fxR([n, d], '=', [x, y]));
    for (const r of s.regras || ['Divide em cima e embaixo pelo mesmo número até não dar mais.']) await regra(r);
  }

  // 4 e 5) mesmo número embaixo: soma (ou tira) só em cima; na subtração, depois simplifica
  async function cenaMesmoDen(s) {
    const a = Number(s.a), b = Number(s.b), d = Number(s.d), sub = s.op === '−' || s.op === '-';
    const r = sub ? a - b : a + b;
    ladoLargo();
    const vis = el('div', 'qd-vis', '', LADO);
    const br = barra(vis, d, sub ? `${a}/${d}` : `o inteiro em ${d} pedaços`);
    if (sub) await br.pinta(a, 'pt', 120);
    const c = cartao();
    const F = fx(c.conta, `${fracH(a, d)}<span class="op">${sub ? '−' : '+'}</span>${fracH(b, d)}<span class="igual">=</span>${fracH(Qm, Qm)}`);
    const fa = F.fr(0), fb = F.fr(1), fr = F.fr(2);
    await wait(600);
    let p, p2;
    if (sub) {
      p = await nota(c.notas, `Embaixo igual: o ${d} fica.`, 'passo');
      await poe(fr, 'd', d);
      await apagar(p);
      p = await nota(c.notas, `Tira só em cima: ${a} − ${b} = ${r}.`, 'passo');
      for (let i = a - 1; i >= r; i--) br.cs[i].classList.add('sai');
      await wait(600);
      for (let i = a - 1; i >= r; i--) br.cs[i].classList.remove('pt', 'sai');
      await poe(fr, 'n', r);
      await wait(500); await apagar(p);
    } else {
      p = await nota(c.notas, 'Embaixo é igual: os pedaços têm o mesmo tamanho.', 'passo');
      pisca([parte(fa, 'd'), parte(fb, 'd')], true);
      await wait(700);
      p2 = await nota(c.notas, `O ${d} fica.`, 'passo');
      await poe(fr, 'd', d);
      pisca([parte(fa, 'd'), parte(fb, 'd')], false);
      await apagar(p, p2);
      p = await nota(c.notas, `Soma só em cima: ${a} + ${b} = ${r}.`, 'passo');
      pisca([parte(fa, 'n')], true); await br.pinta(a);
      pisca([parte(fb, 'n')], true); await br.pinta(b, 'pt2');
      await poe(fr, 'n', r);
      pisca([parte(fa, 'n'), parte(fb, 'n')], false);
      await wait(600); await apagar(p);
    }
    const g = mdc(r, d);
    if (sub && s.simplifica && g > 1 && r > 0) {
      await paraHist(c);
      await etiqueta('SIMPLIFICAR');
      let x = r, y = d, c2 = null;
      for (const gg of divisoresMdc(r, d)) { if (c2) await paraHist(c2); c2 = await simplificaCom(x, y, gg); x /= gg; y /= gg; }
      const vis2 = await trocaLado(() => el('div', 'qd-vis', '', LADO));
      const b1 = barra(vis2, d, `${r}/${d}`); await b1.pinta(r, 'pt', 100);
      const b2 = barra(vis2, y, `${x}/${y}`); await b2.pinta(x);
      p = await nota(c2.notas, x === 1 && y === 2 ? `${r}/${d} é a metade: 1/2.` : `${r}/${d} e ${x}/${y}: o mesmo tamanho.`, 'passo');
      await wait(700); await apagar(p);
      await respostaFinal(fxR([a, d], '−', [b, d], '=', [r, d], '=', [x, y]));
      for (const rr of s.regras || ['Fez a conta? Vê se dá para simplificar.']) await regra(rr);
      return;
    }
    if (s.pegadinha) {
      await paraHist(c);
      const cp = await pegadinhaFr(`${fracH(a, d)}<span class="op">${sub ? '−' : '+'}</span>${fracH(b, d)}<span class="igual">=</span><span class="qd-x">${fracH(r, sub ? d : 2 * d)}</span>`,
        `Pegadinha: o de baixo não ${sub ? 'tira' : 'soma'}! Os pedaços continuam de ${d}.`);
      await certoEmbaixo(cp, fxR([a, d], sub ? '−' : '+', [b, d], '=', [r, d]));
    }
    await respostaFinal(fxR([a, d], sub ? '−' : '+', [b, d], '=', [r, d]));
    for (const rr of s.regras || [sub ? 'Embaixo igual? Tira só em cima.' : 'Embaixo igual? Soma só em cima.']) await regra(rr);
  }

  // 6) qual é maior (1/a ou 1/b): o de baixo diz em quantos pedaços foi cortado
  async function cenaCompUnit(s) {
    const [a, b] = [Number(s.a), Number(s.b)].sort((x, y) => x - y);
    ladoLargo();
    const vis = el('div', 'qd-vis', '', LADO);
    const c = cartao();
    c.conta.innerHTML = `<div class="qd-fx">${fracH(1, a)}<span class="vazio-q qd-sinal">?</span>${fracH(1, b)}</div>`;
    const [fa, fb] = c.conta.querySelectorAll('.qd-fr');
    await wait(600);
    let p = await nota(c.notas, 'Qual é maior?', 'passo');
    const p2 = await nota(c.notas, 'O de baixo diz em quantos pedaços o inteiro foi cortado.', 'passo');
    pisca([parte(fa, 'd')], true);
    const b1 = barra(vis, a, `1/${a}: cortado em ${a}`); await b1.pinta(1);
    pisca([parte(fa, 'd')], false); pisca([parte(fb, 'd')], true);
    const b2 = barra(vis, b, `1/${b}: cortado em ${b}`); await b2.pinta(1);
    pisca([parte(fb, 'd')], false);
    await wait(400); await apagar(p, p2);
    p = await nota(c.notas, 'Cortou em mais pedaços? Cada pedaço fica menor.', 'passo');
    await wait(600);
    const si = c.conta.querySelector('.qd-sinal'); si.textContent = '>'; si.classList.remove('vazio-q'); si.style.color = 'var(--qd-verde)'; si.classList.add('qd-pop');
    await wait(800); await apagar(p);
    if (s.pegadinha !== false) {
      await paraHist(c);
      const cp = await pegadinhaFr(`<span class="qd-x qd-fx">${fracH(1, b)}<span>&gt;</span>${fracH(1, a)}</span>`, `Pegadinha: ${b} é maior que ${a}, mas o pedaço de 1/${b} é menor!`);
      await certoEmbaixo(cp, fxR([1, a], '&gt;', [1, b]));
    }
    await respostaFinal(fxR([1, a], '&gt;', [1, b]));
    for (const r of s.regras || ['Mais pedaços, pedaço menor.']) await regra(r);
  }

  // 7) embaixo diferente: deixa igual primeiro (a tabuada mostra por quanto multiplicar), depois soma
  async function cenaDenDif(s) {
    const p = Number(s.p), a = Number(s.a), r = Number(s.r), b = Number(s.b), D = a / mdc(a, b) * b;
    ladoLargo();
    let vis = el('div', 'qd-vis', '', LADO);
    const c1 = cartao();
    fx(c1.conta, `${fracH(p, a)}<span class="op">+</span>${fracH(r, b)}`);
    await wait(600);
    let q = await nota(c1.notas, 'Embaixo diferente: os pedaços têm tamanhos diferentes.', 'passo');
    const b1 = barra(vis, a, `${p}/${a}`); await b1.pinta(p);
    const b2 = barra(vis, b, `${r}/${b}`); await b2.pinta(r);
    let q2 = await nota(c1.notas, 'Ainda não dá para somar.', 'passo');
    await wait(700); await apagar(q, q2);
    let ant = c1;
    const novo = {};
    for (const [x, y] of [[p, a], [r, b]]) {
      if (y === D) { novo[y] = x; continue; }
      const m = D / y;
      await paraHist(ant);
      const T = await trocaLado(() => tabuadaA(y));
      const c2 = cartao();
      const F = fx(c2.conta, `${fracH(x, y)}<span class="igual">=</span>${fracH(Qm, Qm)}`), f0 = F.fr(0), f1 = F.fr(1);
      await wait(500);
      q = await nota(c2.notas, `Quero o ${y} virando ${D}. Na tabuada do ${y}…`, 'passo');
      const t = await procuraAlvo(T, D);
      t?.querySelector('.res').classList.add('alvo');
      await apagar(q);
      q = await nota(c2.notas, `${y} × ${m} = ${D}: multiplica embaixo por ${m}.`, 'passo');
      await arcoX(F, parte(f0, 'd'), parte(f1, 'd'), 'baixo', `× ${m}`); await poe(f1, 'd', D);
      q2 = await nota(c2.notas, `O que faz embaixo, faz em cima: × ${m}.`, 'passo');
      await arcoX(F, parte(f0, 'n'), parte(f1, 'n'), 'cima', `× ${m}`); await poe(f1, 'n', x * m);
      await wait(500); await apagar(q, q2);
      novo[y] = x * m; ant = c2;
    }
    const X1 = a === D ? p : p * (D / a), X2 = b === D ? r : r * (D / b), n = X1 + X2;
    await paraHist(ant);
    vis = await trocaLado(() => el('div', 'qd-vis', '', LADO));
    const br = barra(vis, D, `o inteiro em ${D} pedaços`);
    const c3 = cartao();
    const F3 = fx(c3.conta, `${fracH(X1, D)}<span class="op">+</span>${fracH(X2, D)}<span class="igual">=</span>${fracH(Qm, Qm)}`), fr = F3.fr(2);
    await wait(500);
    q = await nota(c3.notas, `Agora embaixo é igual: o ${D} fica.`, 'passo');
    await poe(fr, 'd', D);
    q2 = await nota(c3.notas, `Soma só em cima: ${X1} + ${X2} = ${n}.`, 'passo');
    await br.pinta(X1); await br.pinta(X2, 'pt2');
    await poe(fr, 'n', n);
    await wait(600); await apagar(q, q2);
    let fim = [n, D];
    if (mdc(n, D) > 1) {
      await paraHist(c3);
      await etiqueta('SIMPLIFICAR');
      let x = n, y = D, cc = null;
      for (const g of divisoresMdc(n, D)) { if (cc) await paraHist(cc); cc = await simplificaCom(x, y, g); x /= g; y /= g; }
      fim = [x, y];
    }
    await respostaFinal(fxR([p, a], '+', [r, b], '=', ...(fim[1] !== D ? [[n, D], '='] : []), fim));
    for (const rr of s.regras || ['Embaixo diferente? Deixa igual primeiro.']) await regra(rr);
  }

  // 8) multiplicar: em cima com em cima, embaixo com embaixo (a grade mostra)
  async function cenaMultFr(s) {
    const a = Number(s.a), b = Number(s.b), c0 = Number(s.c), d = Number(s.d), n = a * c0, m = b * d;
    ladoLargo();
    const vis = el('div', 'qd-vis', '', LADO);
    const g = el('div', 'qd-grade', '', vis);
    g.style.gridTemplateColumns = `repeat(${d}, 1fr)`; g.style.aspectRatio = `${d} / ${b}`;
    const cel = Array.from({ length: b * d }, () => el('i', '', '', g));
    const leg = el('div', 'bt2', '', vis);
    const c = cartao();
    const F = fx(c.conta, `${fracH(a, b)}<span class="op">×</span>${fracH(c0, d)}<span class="igual">=</span>${fracH(Qm, Qm)}`), fa = F.fr(0), fb = F.fr(1), fr = F.fr(2);
    await wait(600);
    let p = await nota(c.notas, 'Na multiplicação não precisa igualar nada embaixo.', 'passo');
    await wait(500);
    let p2 = await nota(c.notas, `Em cima com em cima: ${a} × ${c0} = ${n}.`, 'passo');
    pisca([parte(fa, 'n'), parte(fb, 'n')], true);
    await wait(500); await poe(fr, 'n', n);
    pisca([parte(fa, 'n'), parte(fb, 'n')], false);
    await apagar(p, p2);
    p = await nota(c.notas, `Embaixo com embaixo: ${b} × ${d} = ${m}.`, 'passo');
    pisca([parte(fa, 'd'), parte(fb, 'd')], true);
    await wait(500); await poe(fr, 'd', m);
    pisca([parte(fa, 'd'), parte(fb, 'd')], false);
    await apagar(p);
    p = await nota(c.notas, `Na grade: ${c0}/${d} pintado, e ${a}/${b} disso.`, 'passo');
    for (let col = 0; col < c0; col++) { for (let r = 0; r < b; r++) cel[r * d + col].classList.add('col'); await wait(200); }
    leg.textContent = `${c0}/${d}`;
    await wait(400);
    for (let r = 0; r < a; r++) { for (let col = 0; col < c0; col++) cel[r * d + col].classList.add('ambos'); await wait(300); }
    leg.textContent = `${n} de ${m} pedaços = ${n}/${m}`;
    await wait(900); await apagar(p);
    let fim = [n, m];
    if (mdc(n, m) > 1) {
      await paraHist(c);
      await etiqueta('SIMPLIFICAR');
      let x = n, y = m, cc = null;
      for (const gg of divisoresMdc(n, m)) { if (cc) await paraHist(cc); cc = await simplificaCom(x, y, gg); x /= gg; y /= gg; }
      fim = [x, y];
    }
    await respostaFinal(fxR([a, b], '×', [c0, d], '=', ...(fim[1] !== m ? [[n, m], '='] : []), fim));
    for (const r of s.regras || ['Em cima com em cima, embaixo com embaixo.']) await regra(r);
  }

  // 9) p/q de N: as bolinhas em q grupos, pega p grupos; depois o jeito fácil (o "de" vira × e o 1 escondido)
  async function cenaParteDe(s) {
    const p = Number(s.p), q = Number(s.q), N = Number(s.N), k = N / q, v = k * p;
    let p1, p2;
    if (N <= 40 && q <= 5 && k <= 10) {
      ladoLargo();
      const box = el('div', 'qd-bolas', '', LADO);
      const W = box.offsetWidth, H = box.offsetHeight, gw = W / q;
      const bs = Math.min(W * .09, gw * .55, H * .75 / k * .85);
      const porLinha = Math.min(N, 5), linhas = Math.ceil(N / porLinha);
      const bolas = Array.from({ length: N }, (_, i) => {
        const b = el('b', '', '', box);
        b.style.width = b.style.height = bs * .82 + 'px';
        b.style.left = (i % porLinha) * (W / porLinha) + W / porLinha / 2 - bs / 2 + 'px';
        b.style.top = Math.floor(i / porLinha) * Math.min(bs * 1.25, H * .85 / linhas) + H * .06 + 'px';
        return b;
      });
      const grupos = Array.from({ length: q }, (_, g) => {
        const dv = el('div', 'grupo', '<span class="gq"></span>', box);
        Object.assign(dv.style, { left: g * gw + gw * .1 + 'px', width: gw * .8 + 'px', top: H * .02 + 'px', height: H * .8 + 'px' });
        return dv;
      });
      const c1 = cartao();
      c1.conta.innerHTML = `<div class="qd-fx">${fracH(p, q)}<span class="igual">de</span><span>${N}</span></div>`;
      const f = c1.conta.querySelector('.qd-fr');
      await wait(700);
      p1 = await nota(c1.notas, `${N} bolinhas. Primeiro divide pelo de baixo: ${q} grupos.`, 'passo');
      pisca([parte(f, 'd')], true);
      grupos.forEach(g => g.classList.add('on'));
      await wait(400);
      bolas.forEach((b, i) => {
        const g = i % q, kk = Math.floor(i / q);
        b.style.left = g * gw + gw / 2 - bs * .41 + 'px';
        b.style.top = H * .06 + kk * (H * .75 / k) + 'px';
      });
      await wait(1000);
      for (const g of grupos) { g.querySelector('.gq').textContent = String(k); await wait(200); }
      pisca([parte(f, 'd')], false);
      p2 = await nota(c1.notas, `Cada grupo tem ${k}.`, 'passo');
      await nota(c1.notas, `${N} ÷ ${q} = ${k}`, 'detalhe');
      await wait(600); await apagar(p1, p2);
      await paraHist(c1);
      const c2 = cartao();
      c2.conta.innerHTML = `<div class="qd-fx"><span>${k}</span><span class="op">×</span><span>${p}</span><span class="igual">=</span><span class="vazio-q qd-m">?</span></div>`;
      await wait(500);
      p1 = await nota(c2.notas, `Agora o de cima: pega ${plural(p, 'grupo', 'grupos')}.`, 'passo');
      for (let g = 0; g < p; g++) { grupos[g].classList.add('pega'); await wait(400); }
      bolas.forEach((b, i) => { if (i % q >= p) b.classList.add('fora'); });
      p2 = await nota(c2.notas, p > 1 ? `${Array(p).fill(k).join(' + ')} = ${v}. É o mesmo que ${k} × ${p}.` : `Um grupo: ${k}.`, 'passo');
      const m = c2.conta.querySelector('.qd-m'); m.textContent = v; m.classList.remove('vazio-q'); m.style.color = 'var(--qd-verde)'; m.classList.add('qd-pop');
      await wait(800); await apagar(p1, p2);
      await paraHist(c2);
      await trocaLado(() => null);
      L.classList.remove('com-lado', 'lado-largo');
    }
    const c3 = cartao();
    c3.conta.innerHTML = `<div class="qd-fx">${fracH(p, q)}<span class="igual qd-de">de</span><span class="qd-N">${N}</span><span class="qd-resto"></span></div>`;
    await wait(600);
    p1 = await nota(c3.notas, s.anterior ? 'Jeito mais fácil: o "de" vira × e multiplica como na página anterior.' : 'Jeito mais fácil: o "de" vira × e multiplica as frações.', 'passo');
    const de = c3.conta.querySelector('.qd-de'); de.textContent = '×'; de.className = 'op qd-pop';
    await wait(700);
    p2 = await nota(c3.notas, 'Se não tem número embaixo, é 1.', 'passo');
    c3.conta.querySelector('.qd-N').outerHTML = `<span class="qd-fr"><span class="fn">${N}</span><span class="fl"></span><span class="fd qd-pisca" style="color:var(--qd-azul)">1</span></span>`;
    await wait(1500); await apagar(p1, p2);
    c3.conta.querySelector('.qd-resto').outerHTML = `<span class="igual">=</span>${fracH(Qm, Qm, 'qd-k')}<span class="qd-fim"></span>`;
    const kf = c3.conta.querySelector('.qd-k');
    await wait(400);
    p1 = await nota(c3.notas, `Multiplica em cima: ${p} × ${N} = ${p * N}.`, 'passo');
    await poe(kf, 'n', p * N);
    p2 = await nota(c3.notas, `Multiplica embaixo: ${q} × 1 = ${q}.`, 'passo');
    await poe(kf, 'd', q);
    await wait(400); await apagar(p1, p2);
    p1 = await nota(c3.notas, `Fração é divisão: ${p * N} ÷ ${q} = ${v}.`, 'passo');
    c3.conta.querySelector('.qd-fim').outerHTML = `<span class="igual">=</span><span class="qd-pop" style="color:var(--qd-verde)">${v}</span>`;
    await wait(900); await apagar(p1);
    await respostaFinal(fxR([p, q], `de ${N} =`, [p, q], '×', [N, 1], `= ${v}`));
    const rs = s.regras || ['Divide pelo de baixo, multiplica pelo de cima.', `Sem número embaixo? É 1: ${N} = ${N}/1.`, ...(s.metade || (p === 1 && q === 2) ? [`Metade de ${N} = 1/2 de ${N} = ${N} ÷ 2`] : [])];
    for (const r of rs) await regra(r);
  }

  // 10) dividir: a conta vai para o canto como está; a segunda gira (vira de cabeça para baixo), o ÷ vira × e multiplica
  async function cenaDivFr(s) {
    const a = Number(s.a), b = Number(s.b), c0 = Number(s.c), d = Number(s.d), n = a * d, m = b * c0;
    const c1 = cartao();
    fx(c1.conta, `${fracH(a, b)}<span class="op">÷</span>${fracH(c0, d)}`);
    await wait(600);
    let p = await nota(c1.notas, 'Dividir fração tem um truque.', 'passo');
    await wait(700); await apagar(p);
    await paraHist(c1);   // a conta de dividir fica no canto, para comparar depois
    const c2 = cartao();
    const F = fx(c2.conta, `${fracH(a, b)}<span class="op qd-sinal">÷</span>${fracH(c0, d)}<span class="qd-cont"></span>`), fa = F.fr(0), fb = F.fr(1);
    await wait(500);
    p = await nota(c2.notas, 'A primeira fica como está.', 'passo');
    pisca([parte(fa, 'n'), parte(fa, 'd')], true);
    await wait(800);
    pisca([parte(fa, 'n'), parte(fa, 'd')], false);
    let p2 = await nota(c2.notas, 'A segunda vira de cabeça para baixo.', 'passo');
    fb.classList.add('gira'); await wait(450);
    parte(fb, 'n').textContent = d; parte(fb, 'd').textContent = c0;
    parte(fb, 'n').style.color = parte(fb, 'd').style.color = 'var(--qd-azul)';
    fb.classList.remove('gira'); await wait(600);
    await apagar(p, p2);
    p = await nota(c2.notas, 'E o ÷ vira ×.', 'passo');
    const si = c2.conta.querySelector('.qd-sinal'); si.textContent = '×'; si.classList.add('qd-pop');
    await wait(900); await apagar(p);
    c2.conta.querySelector('.qd-cont').outerHTML = `<span class="igual">=</span>${fracH(Qm, Qm, 'qd-r')}`;
    const fr = c2.conta.querySelector('.qd-r');
    await wait(400);
    p = await nota(c2.notas, `Agora é multiplicar: em cima, ${a} × ${d} = ${n}.`, 'passo');
    await poe(fr, 'n', n);
    p2 = await nota(c2.notas, `Embaixo, ${b} × ${c0} = ${m}.`, 'passo');
    await poe(fr, 'd', m);
    await wait(500); await apagar(p, p2);
    let fim = [n, m], cc = c2;
    if (mdc(n, m) > 1) {
      await paraHist(c2);
      ladoLargo();
      await etiqueta('SIMPLIFICAR');
      let x = n, y = m; cc = null;
      for (const g of divisoresMdc(n, m)) { if (cc) await paraHist(cc); cc = await simplificaCom(x, y, g); x /= g; y /= g; }
      fim = [x, y];
    }
    await nota(cc.notas, 'Pegadinha: não divide em cima e embaixo direto. Vira a segunda e multiplica!', 'detalhe');
    await respostaFinal(fxR([a, b], '÷', [c0, d], '=', [a, b], '×', [d, c0], '=', fim));
    for (const r of s.regras || ['Mantém a primeira, vira a segunda e multiplica.']) await regra(r);
  }

  // ══════════════════ PROMPT-207: 5-A (potências) — protótipo referencia/lousa-5a.html ══════════════════
  // base sempre laranja (o número grande, os fatores repetidos e a anotação "base"); expoente sempre azul (o numerinho,
  // os 1, 2, 3 embaixo de cada fator e a anotação "expoente"); na conta errada, tudo vermelho
  const potH = (b, n) => `<span class="qd-pot"><span class="pb">${b}</span><span class="pe">${n}</span></span>`;
  const fatH = (b, n) => Array.from({ length: n }, () => `<span class="qd-fat">${b}</span>`).join('<span class="op">×</span>');
  const vezesTxt = (b, n) => Array(n).fill(b).join(' × ');
  const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹', sup = (n) => [...String(n)].map(d => SUPS[d]).join('');
  async function contaVezes(pai) {
    for (const [i, f] of [...pai.querySelectorAll('.qd-fat')].entries()) { el('span', 'qd-cnt qd-pop', String(i + 1), f); await wait(380); }
  }
  const acende = (e, on = true) => e?.classList.toggle('ok-pisca', on);
  const notaCor = async (c, txt, cor) => (await nota(c.notas, txt, 'detalhe')).classList.add(cor);
  // "?" que vira o resultado (verde no foco, branco no histórico)
  function mostraRes(e, v) { e.textContent = v; e.className = 'qd-pop'; e.style.color = 'var(--qd-verde)'; }
  const limpaTab = (T) => T.forEach(x => { x.classList.remove('achou'); x.querySelector('.ok').textContent = ''; });
  // quadrado de bolinhas n × n (por que se chama "ao quadrado")
  async function quadrado(n) {
    const v = el('div', 'qd-vis', '', LADO);
    const g = el('div', 'qd-quad', '', v);
    g.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    g.style.gap = (n > 8 ? .3 : n > 5 ? .55 : .9) + 'cqw';
    const leg = el('div', 'bt2', '', v);
    for (let r = 0; r < n; r++) {
      for (let k = 0; k < n; k++) el('b', 'qd-pop', '', g);
      leg.textContent = `${r + 1} ${r ? 'linhas' : 'linha'} de ${n}`;
      await wait(320);
    }
    leg.textContent = `${n} linhas de ${n} = ${n * n} — um quadrado!`;
    await wait(500);
  }
  // cubo de cubinhos n × n × n (por que se chama "ao cubo")
  async function cubo(n) {
    const v = el('div', 'qd-vis', '', LADO);
    const W = 300, H = 280, s = n <= 2 ? 52 : 40;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.classList.add('qd-cubo');
    v.appendChild(svg);
    const leg = el('div', 'bt2', '', v);
    const P = (x, y, z) => [W / 2 + (x - y) * s * .866, H * .3 + (x + y) * s * .5 - z * s + n * s * .55];
    const poly = (pts, cor) => { const p = document.createElementNS(NS, 'polygon'); p.setAttribute('points', pts.map(q => P(...q).join(',')).join(' ')); p.setAttribute('fill', cor); p.setAttribute('stroke', '#1b120a'); p.setAttribute('stroke-width', 2); return p; };
    const ordem = [];
    for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) ordem.push([x, y, z]);
    ordem.sort((a, b) => a[2] - b[2] || (a[0] + a[1]) - (b[0] + b[1]));
    let k = 0;
    for (const [x, y, z] of ordem) {
      const gr = document.createElementNS(NS, 'g');
      gr.appendChild(poly([[x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]], '#c86a2a'));
      gr.appendChild(poly([[x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]], '#e88b45'));
      gr.appendChild(poly([[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]], '#ffc08a'));
      gr.style.opacity = 0; gr.style.transition = `opacity ${T(.3)}`;
      svg.appendChild(gr);
      gr.getBoundingClientRect(); gr.style.opacity = 1;
      leg.textContent = `${++k} ${k > 1 ? 'cubinhos' : 'cubinho'}`;
      await wait(300);
    }
    leg.textContent = `${n} × ${n} × ${n} = ${n ** 3} cubinhos — um cubo!`;
    await wait(500);
  }
  // r × b armada (passou da tabuada): "3 × 7 = 21: fica 1, vai 2." · "3 × 2 = 6, mais o 2 que foi: 8."
  async function armaVezes(c, r, b, ultimo) {
    const cima = String(r), prod = String(r * b);
    const cols = ['op', ...Array(Math.max(cima.length, prod.length)).fill('d')], last = cols.length - 1;
    const A = armada(c.conta, cols, ['vai', 'a', 'b', 'linha', 'r']);
    [...cima].forEach((ch, i) => { A.R.a[last - cima.length + 1 + i].textContent = ch; });
    A.R.b[0].textContent = '×'; A.R.b[last].textContent = String(b);
    let p = await nota(c.notas, `${ultimo ? 'O último' : 'Agora'}: ${r} × ${b}. Passou da tabuada? Arma a conta.`, 'passo');
    await wait(500); await apagar(p);
    let vai = 0;
    for (let i = 0; i < cima.length; i++) {
      const j = last - i, d = Number(cima[cima.length - 1 - i]), pr = d * b + vai, fimD = i === cima.length - 1;
      colOn(A, j, true);
      const conta = vai ? `${b} × ${d} = ${d * b}, mais o ${vai} que foi: ${pr}` : `${b} × ${d} = ${pr}`;
      p = await nota(c.notas, `${conta}${pr >= 10 && !fimD ? `: fica ${pr % 10}, vai ${Math.floor(pr / 10)}` : ''}.`, 'passo');
      if (fimD) { const t = String(pr); for (let k = 0; k < t.length; k++) await escreve(A.R.r[j - t.length + 1 + k], t[k], 'res'); }
      else { await escreve(A.R.r[j], String(pr % 10), 'res'); if (pr >= 10) await escreve(A.R.vai[j - 1], String(Math.floor(pr / 10))); }
      vai = fimD ? 0 : Math.floor(pr / 10);
      colOn(A, j, false);
      await wait(400); await apagar(p);
    }
  }

  // 5-A p.1) o que é potência: a base acende, o expoente acende, os fatores contados 1, 2, 3; "Como se lê"
  async function cenaPotencia(s) {
    const b = Number(s.b), n = Number(s.n);
    await etiqueta('POTÊNCIA', 'multiplicar o mesmo número várias vezes');
    const c = cartao();
    c.conta.innerHTML = `<div class="qd-fx">${potH(b, n)}<span class="qd-resto"></span></div>`;
    await wait(600);
    const P = c.conta.querySelector('.qd-pot'), pb = P.querySelector('.pb'), pe = P.querySelector('.pe');
    let p = await nota(c.notas, 'O número grande é a base.', 'passo');
    acende(pb); await wait(500);
    await notaCor(c, 'base: o número que se repete', 'base-cor');
    acende(pb, false); await apagar(p);
    p = await nota(c.notas, 'O numerinho em cima é o expoente.', 'passo');
    acende(pe); await wait(500);
    await notaCor(c, 'expoente: quantas vezes ele aparece', 'exp-cor');
    acende(pe, false); await apagar(p);
    p = await nota(c.notas, `O ${b} aparece ${plural(n, 'vez', 'vezes')}, multiplicando.`, 'passo');
    c.conta.querySelector('.qd-resto').outerHTML = `<span class="igual">=</span>${fatH(b, n)}`;
    await wait(400); await contaVezes(c.conta);
    await wait(500); await apagar(p);
    if (s.leitura !== false) {
      await paraHist(c);
      const c2 = cartao();
      const v = el('div', 'qd-leit', '', c2.conta);
      p = await nota(c2.notas, 'Como se lê:', 'passo');
      for (const [bb, nn, t] of [[5, 2, 'cinco ao quadrado'], [2, 3, 'dois ao cubo'], [2, 4, 'dois elevado a quatro']]) {
        el('div', 'lrow qd-pop', `${potH(bb, nn)}<span>${t}</span>`, v); await wait(700);
      }
      await wait(500); await apagar(p);
    }
    await respostaFinal(`<span class="qd-fx">${potH(b, n)}<span>= ${vezesTxt(b, n)}</span></span>`);
    for (const r of s.regras || ['Base: o número que repete. Expoente: quantas vezes.']) await regra(r);
  }

  // 5-A p.2) ao quadrado: b × b na tabuada (o resultado voa), o quadrado de bolinhas; pegadinha b × 2
  async function cenaQuadrado(s) {
    const b = Number(s.b), v = b * b;
    ladoLargo();
    await etiqueta('AO QUADRADO', 'o número vezes ele mesmo');
    const Tb = tabuadaA(b, Math.max(10, b));
    const c1 = cartao();
    c1.conta.innerHTML = `<div class="qd-fx">${potH(b, 2)}<span class="qd-resto"></span></div>`;
    await wait(600);
    let p = await nota(c1.notas, `Expoente 2: o ${b} aparece 2 vezes.`, 'passo');
    c1.conta.querySelector('.qd-resto').outerHTML = `<span class="igual">=</span>${fatH(b, 2)}<span class="qd-fim"></span>`;
    await wait(400); await contaVezes(c1.conta);
    await apagar(p);
    p = await nota(c1.notas, `Procura ${b} × ${b} na tabuada do ${b}.`, 'passo');
    const t = await procuraAlvo(Tb, v);
    c1.conta.querySelector('.qd-fim').outerHTML = `<span class="igual">=</span><span class="qd-r qd-esconde" style="color:var(--qd-verde)">${v}</span>`;
    const alvo = c1.conta.querySelector('.qd-r');
    if (t) await voar(t.querySelector('.res'), alvo, String(v)); else alvo.classList.remove('qd-esconde');
    await wait(400); await apagar(p);
    await trocaLado(() => null);
    p = await nota(c1.notas, `Por que "ao quadrado"? ${b} linhas de ${b} formam um quadrado.`, 'passo');
    await quadrado(b);
    await wait(600); await apagar(p);
    if (s.pegadinha !== false && b !== 2) {   // 2² = 2 × 2: o "jeito errado" daria certo
      await paraHist(c1);
      const c2 = cartao();
      c2.conta.innerHTML = `<div class="qd-fx qd-errado">${potH(b, 2)}<span class="igual">=</span><span>${b} × 2</span><span class="igual">=</span><span class="qd-x">${b * 2}</span></div>`;
      await nota(c2.notas, `Pegadinha: não é ${b} × 2! É ${b} × ${b}.`, 'passo');
      await wait(500);
      await certoEmbaixo(c2, `<span class="qd-fx">${potH(b, 2)}<span class="igual">=</span>${fatH(b, 2)}<span class="igual">=</span><span>${v}</span></span>`);
    }
    await respostaFinal(`<span class="qd-fx">${potH(b, 2)}<span>= ${b} × ${b} = ${v}</span></span>`);
    for (const r of s.regras || ['Ao quadrado: o número vezes ele mesmo.']) await regra(r);
  }

  // 5-A p.3 e p.4) ao cubo / expoente maior: escreve os fatores, multiplica de dois em dois (tabuada; passou dela, arma a conta)
  async function cenaCadeia(s) {
    const b = Number(s.b), n = Number(s.n);
    ladoLargo();
    if (n === 3) await etiqueta('AO CUBO', 'o número aparece 3 vezes');
    const c1 = cartao();
    c1.conta.innerHTML = `<div class="qd-fx">${potH(b, n)}<span class="igual">=</span>${fatH(b, n)}</div>`;
    await wait(600);
    let p = await nota(c1.notas, `Expoente ${n}: o ${b} aparece ${n} vezes.`, 'passo');
    await contaVezes(c1.conta);
    await wait(400); await apagar(p);
    await paraHist(c1);
    let r = b, Tb = null, c = null;
    for (let i = 2; i <= n; i++) {
      const prox = r * b, ultimo = i === n;
      if (r <= 10) {
        if (!Tb) Tb = tabuadaA(b); else limpaTab(Tb);
        c = cartao();
        c.conta.innerHTML = `<div class="qd-fx"><span>${r} × ${b}</span><span class="igual">=</span><span class="vazio-q qd-rr">?</span></div>`;
        p = await nota(c.notas, i === 2 ? `Multiplica de dois em dois: ${b} × ${b}.` : ultimo ? `Agora o resultado vezes o último ${b}.` : `O resultado vezes o próximo ${b}.`, 'passo');
        await procuraAlvo(Tb, prox);
        mostraRes(c.conta.querySelector('.qd-rr'), prox);
        await wait(500); await apagar(p);
      } else {
        if (temLado()) await trocaLado(() => null);
        L.classList.remove('com-lado', 'lado-largo');
        Tb = null;
        c = cartao();
        await armaVezes(c, r, b, ultimo);
      }
      if (!ultimo) await paraHist(c);
      r = prox;
    }
    if (n === 3 && b <= 3) {
      await trocaLado(() => null);
      p = await nota(c.notas, `Por que "ao cubo"? ${b} × ${b} × ${b} cubinhos formam um cubo.`, 'passo');
      await cubo(b);
      await wait(600); await apagar(p);
    }
    await respostaFinal(`<span class="qd-fx">${potH(b, n)}<span>= ${vezesTxt(b, n)} = ${r}</span></span>`);
    for (const rr of s.regras || [n === 3 ? 'Ao cubo: o número aparece 3 vezes.' : 'Multiplica de dois em dois, quantas vezes o expoente mandar.']) await regra(rr);
  }

  // 5-A p.5) multiplicação vira potência: quem repete é a base; quantas vezes, o expoente
  async function cenaViraPot(s) {
    const b = Number(s.b), n = Number(s.n);
    const c = cartao();
    c.conta.innerHTML = `<div class="qd-fx">${fatH(b, n)}<span class="qd-fim"></span></div>`;
    await wait(600);
    const fs = [...c.conta.querySelectorAll('.qd-fat')];
    let p = await nota(c.notas, `Qual número se repete? O ${b}: ele é a base.`, 'passo');
    fs.forEach(f => acende(f)); await wait(800); fs.forEach(f => acende(f, false));
    await apagar(p);
    p = await nota(c.notas, 'Quantas vezes? Conta: é o expoente.', 'passo');
    await contaVezes(c.conta);
    await wait(400); await apagar(p);
    p = await nota(c.notas, `O ${b} aparece ${n} vezes: ${b} elevado a ${n}.`, 'passo');
    c.conta.querySelector('.qd-fim').outerHTML = `<span class="igual">=</span><span class="qd-pop">${potH(b, n)}</span>`;
    await wait(800); await apagar(p);
    await notaCor(c, `a base é ${b}`, 'base-cor');
    await notaCor(c, `o expoente é ${n}`, 'exp-cor');
    await respostaFinal(`<span class="qd-fx"><span>${vezesTxt(b, n)} =</span>${potH(b, n)}</span>`);
    for (const r of s.regras || ['O número que repete é a base. Quantas vezes, o expoente.']) await regra(r);
  }

  // 5-A p.6) potência de 10: cada × 10 põe um zero; os zeros contados 1, 2, 3 (n2: o segundo exemplo, os zeros um a um)
  async function cenaDez(s) {
    const n = Number(s.n), n2 = s.n2 ? Number(s.n2) : 0;
    await etiqueta('POTÊNCIA DE 10', 'o expoente diz quantos zeros');
    const c1 = cartao();
    c1.conta.innerHTML = `<div class="qd-fx">${potH(10, n)}<span class="igual">=</span><span>${vezesTxt(10, n)}</span><span class="qd-fim"></span></div>`;
    await wait(600);
    const pe = c1.conta.querySelector('.pe');
    let p = await nota(c1.notas, 'Cada × 10 põe um zero no fim.', 'passo');
    c1.conta.querySelector('.qd-fim').outerHTML = `<span class="igual">=</span><span class="qd-mil">1${'<span class="z">0</span>'.repeat(n)}</span>`;
    await wait(500);
    acende(pe);
    for (const [i, z] of [...c1.conta.querySelectorAll('.qd-mil .z')].entries()) { el('span', 'qd-cnt qd-pop', String(i + 1), z); z.classList.add('ok-pisca'); await wait(450); }
    await nota(c1.notas, `expoente ${n} → ${plural(n, 'zero', 'zeros')}`, 'detalhe');
    acende(pe, false);
    await apagar(p);
    let fimN = n;
    if (n2) {
      await paraHist(c1);
      const c2 = cartao();
      c2.conta.innerHTML = `<div class="qd-fx">${potH(10, n2)}<span class="igual">=</span><span class="qd-mil">1</span></div>`;
      await wait(500);
      const pe2 = c2.conta.querySelector('.pe'), num = c2.conta.querySelector('.qd-mil');
      p = await nota(c2.notas, `Expoente ${n2}: escreve o 1 e põe ${n2} zeros.`, 'passo');
      acende(pe2);
      for (let i = 0; i < n2; i++) { const z = el('span', 'z qd-pop', '0', num); el('span', 'qd-cnt', String(i + 1), z); await wait(420); }
      acende(pe2, false);
      await wait(500); await apagar(p);
      fimN = n2;
    }
    await respostaFinal(`<span class="qd-fx">${potH(10, fimN)}<span>= 1${'0'.repeat(fimN)}</span></span>`);
    for (const r of s.regras || ['Potência de 10: o expoente diz quantos zeros.']) await regra(r);
  }

  // 5-A p.7) elevado a 1, elevado a 0 e 1 elevado a qualquer número
  async function cenaUmZero(s) {
    const casos = (s.casos || [[7, 1], [7, 0], [1, 5]]).map(([b, n]) => [Number(b), Number(n)]);
    const info = ([b, n]) => (b === 1 && n > 1 ? { res: `${vezesTxt(1, n)} = 1`, fim: '1', txt: '1 vezes 1 dá sempre 1.', regra: '1 elevado a qualquer número: dá 1.' }
      : n === 1 ? { res: String(b), fim: String(b), txt: `Expoente 1: o ${b} aparece uma vez só. Fica ${b}.`, regra: 'Elevado a 1: o próprio número.' }
        : { res: '1', fim: '1', txt: 'Expoente 0: todo número elevado a 0 dá 1.', regra: 'Elevado a 0: dá 1.' });
    for (const [i, cs] of casos.entries()) {
      const c = cartao();
      c.conta.innerHTML = `<div class="qd-fx">${potH(...cs)}<span class="igual">=</span><span class="vazio-q qd-rr">?</span></div>`;
      await wait(500);
      const p = await nota(c.notas, info(cs).txt, 'passo');
      mostraRes(c.conta.querySelector('.qd-rr'), info(cs).res);
      await wait(900); await apagar(p);
      if (i < casos.length - 1) await paraHist(c);
    }
    await respostaFinal(`<span class="qd-fx">${casos.map((cs, i) => `${potH(...cs)}<span>= ${info(cs).fim}${i < casos.length - 1 ? ' ·' : ''}</span>`).join('')}</span>`);
    for (const r of s.regras || [...new Set(casos.map(cs => info(cs).regra))]) await regra(r);
  }

  // 5-A p.8) potência na conta: primeiro as potências, depois o + (ou o −)
  async function cenaNaConta(s) {
    const a = Number(s.a), n = Number(s.n), b = Number(s.b), m = Number(s.m), op = s.op === '-' || s.op === '−' ? '−' : '+';
    const va = a ** n, vb = b ** m, v = op === '+' ? va + vb : va - vb;
    const c1 = cartao();
    c1.conta.innerHTML = `<div class="qd-fx">${potH(a, n)}<span class="op">${op}</span>${potH(b, m)}</div>`;
    await wait(600);
    const ps = [...c1.conta.querySelectorAll('.qd-pot')];
    let p = await nota(c1.notas, `Primeiro as potências, depois o ${op}.`, 'passo');
    ps.forEach(x => acende(x)); await wait(800); ps.forEach(x => acende(x, false));
    await apagar(p);
    await paraHist(c1);
    for (const [bb, nn, res] of [[a, n, va], [b, m, vb]]) {
      const c = cartao();
      c.conta.innerHTML = `<div class="qd-fx">${potH(bb, nn)}<span class="igual">=</span>${fatH(bb, nn)}<span class="igual">=</span><span class="vazio-q qd-rr">?</span></div>`;
      await wait(400);
      await contaVezes(c.conta);
      mostraRes(c.conta.querySelector('.qd-rr'), res);
      await wait(700);
      await paraHist(c);
    }
    const c4 = cartao();
    c4.conta.innerHTML = `<div class="qd-fx"><span>${va}</span><span class="op">${op}</span><span>${vb}</span><span class="igual">=</span><span class="qd-pop" style="color:var(--qd-verde)">${v}</span></div>`;
    p = await nota(c4.notas, `Agora ${op === '+' ? 'soma' : 'tira'}: ${va} ${op} ${vb} = ${v}.`, 'passo');
    await wait(700); await apagar(p);
    if (n > 1) await nota(c4.notas, `Pegadinha: ${a}${sup(n)} não é ${a} × ${n}!`, 'detalhe');
    await respostaFinal(`<span class="qd-fx">${potH(a, n)}<span>${op}</span>${potH(b, m)}<span>= ${va} ${op} ${vb} = ${v}</span></span>`);
    for (const r of s.regras || ['Primeiro as potências, depois + e −.']) await regra(r);
  }

  const CENAS = { armada: cenaArmada, mult: cenaMult, compara: cenaCompara, fracdec: cenaFracDec, divk: cenaDivK, decfrac: cenaDecFrac,
    fracao: cenaFracao, equiv: cenaEquiv, simplif: cenaSimplif, mesmoden: cenaMesmoDen, compunit: cenaCompUnit, dendif: cenaDenDif,
    multfr: cenaMultFr, partede: cenaParteDe, divfr: cenaDivFr,
    potencia: cenaPotencia, quadrado: cenaQuadrado, cadeia: cenaCadeia, virapot: cenaViraPot, dez: cenaDez, umzero: cenaUmZero, naconta: cenaNaConta };

  function limpar() {
    token++;
    pausado = false;
    L.querySelectorAll('.qd-voa').forEach(e => e.remove());
    HIST.innerHTML = ''; FOCO.innerHTML = ''; LADO.innerHTML = ''; LADO.style.opacity = ''; REGRAS.innerHTML = '';
    RESP.classList.remove('on'); RESP.innerHTML = '';
    L.classList.remove('com-lado', 'lado-largo', 'com-etq');
    L.querySelector('.qd-etq')?.remove();
  }
  async function tocar(cenas) {
    limpar();
    medir();
    const meu = token;
    ultCenas = cenas;
    try {
      await (document.fonts?.ready || Promise.resolve());
      await wait(300);
      for (const c of cenas || []) await CENAS[c.t]?.(c);
      return meu === token;
    } catch (e) { if (!(e instanceof Cancel)) console.error(e); return false; }
  }
  return {
    tocar,
    cancelar() { limpar(); ultCenas = null; },
    pausar() { pausado = !pausado; return pausado; },
  };
}

// os números que o quadro sabe resolver (para o cartão do erro: senão, a lousa de antes)
export const QUADRO_FD = (p, d) => {
  if (!(p > 0 && d > 1 && p < d)) return false;
  let r = p, n = 0;
  while (r && n < 3) { const q = Math.floor(r * 10 / d); if (!q) return false; r = r * 10 - q * d; n++; }
  return !r;
};

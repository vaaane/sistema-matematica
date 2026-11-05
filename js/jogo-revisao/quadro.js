// Jogo de Revisão — 🧑‍🏫 PROMPT-205: a lousa como um quadro de verdade (só a Aula do 4-B e o cartão do erro do 4-B).
// Protótipo aprovado: referencia/lousa-4b.html (as funções nota, apagar, paraHist, curva, numRow, armada, setaVerde,
// setaDevolve e voar vêm de lá). Um quadro 16:9 com 4 áreas fixas: histórico (esq.), foco (centro, o único lugar com
// animação), ajuda (dir., a tabuada) e base (regras + a resposta limpa). Sem pet e sem balão: o que ele falava é escrito.
//   criarQuadro(raiz) → { tocar(cenas): Promise<boolean>, cancelar(), pausar(): boolean }
//   cenas: [{ t: 'armada', a, op: '+'|'−', b, passos?, pegadinha?: { conta, passo }, regras?, resposta? },
//           { t: 'mult', a, b }, { t: 'compara', v: [x, y], pegadinha? }, { t: 'fracdec', p, d },
//           { t: 'divk', p, k }, { t: 'decfrac', v: [x, …] }]   (todas com regras?: [...] e resposta?: '...')
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
const fracHtml = (n, d, cls = '') => `<span class="qd-frac ${cls}"><span>${n}</span><span class="qd-fl"></span><span>${d}</span></span>`;

export function criarQuadro(raiz) {
  raiz.innerHTML = '';
  raiz.classList.add('qd-raiz');
  const L = el('div', 'qd', '', raiz);
  const HIST = el('div', 'qd-hist', '', L), FOCO = el('div', 'qd-foco', '', L), LADO = el('div', 'qd-lado', '', L);
  const BASE = el('div', 'qd-base', '', L), REGRAS = el('div', 'qd-regras', '', BASE), RESP = el('div', 'qd-resp', '', BASE);
  let token = 0, pausado = false, compacto = false;

  // ── tamanho: 16:9 dentro do espaço que tiver; o cartão do foco diminui se não couber (nunca corta) ──
  function caber() {
    for (const card of FOCO.querySelectorAll(':scope > .qd-card')) {
      const w = card.offsetWidth, h = card.offsetHeight;
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
    compacto = W < 420;   // pequeno demais para o histórico: a conta anterior é apagada e o foco usa a largura toda
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
        if (!pausado) resta -= agora - ult;
        ult = agora;
        if (resta <= 0) return ok();
        requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    });
  }

  // ── anotações escritas, letra por letra: passo (branca, apagada no seguinte), detalhe (amarela, fica), regra (base) ──
  async function nota(pai, txt, nivel) {
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
  async function resposta(txt) { RESP.innerHTML = virgulas(txt); RESP.classList.add('on'); await wait(700); }
  async function fim(s, resp, regrasPadrao) {
    await resposta(s.resposta || resp);
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
    const w = card.offsetWidth, h = card.offsetHeight;
    // até 50%, na largura do histórico e na altura que sobrou (os cartões de antes ficam)
    const usado = [...HIST.children].reduce((t, x) => t + x.offsetHeight, 0), gap = parseFloat(getComputedStyle(HIST).rowGap) || 0;
    const sobra = HIST.clientHeight - usado - gap * HIST.children.length;
    const K = Math.min(0.5, (HIST.clientWidth - 4) / w, Math.max(sobra, HIST.clientHeight * 0.4) / h);
    const slot = el('div', 'qd-hslot', '', HIST);
    slot.style.width = w * K + 'px'; slot.style.height = h * K + 'px';
    card.style.width = w + 'px';
    slot.appendChild(card);
    card.classList.add('mini');
    card.style.transition = 'none';
    card.style.transform = `scale(${K})`;
    const l = fluxo(card);
    card.style.transform = `translate(${f.left - l.left}px, ${f.top - l.top}px) scale(${kf})`;
    card.offsetWidth;
    card.style.transition = 'transform .85s cubic-bezier(.3, .8, .3, 1)';
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
    p.style.transition = 'stroke-dashoffset .55s ease';
    p.style.strokeDashoffset = 0;
    const a = Math.atan2(y2 - cy, x2 - cx), hl = lw * 3.4;
    const cab = document.createElementNS(NS, 'path');
    cab.setAttribute('d', `M${x2 - hl * Math.cos(a - .5)} ${y2 - hl * Math.sin(a - .5)} L${x2} ${y2} L${x2 - hl * Math.cos(a + .5)} ${y2 - hl * Math.sin(a + .5)}`);
    Object.assign(cab.style, { fill: 'none', stroke: cor, strokeWidth: lw, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: 0, transition: 'opacity .15s .5s' });
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
        s.style.transition = 'opacity .3s, left .6s'; s.style.opacity = 1; s.classList.add('qd-pop');
        await wait(800);
      },
      // zero no fim, depois da vírgula: é riscado e some (e a vírgula, se ficar no fim)
      async tiraZeros() {
        if (st.virg == null) return false;
        let k = st.digs.length;
        while (k - 1 >= st.virg && st.digs[k - 1].textContent === '0') k--;
        if (k === st.digs.length) return false;
        const sai = st.digs.slice(k), fimV = k === st.virg;
        sai.forEach(d => d.classList.add('qd-risca'));
        await wait(900);
        sai.forEach(d => { d.style.transition = 'opacity .4s'; d.style.opacity = 0; });
        if (fimV) st.vEl.style.opacity = 0;
        st.rastros.forEach(x => { if (x.b > k || fimV && x.b >= k) x.el.style.opacity = 0; });
        st.arcs.forEach(a => { if (Math.max(a.b1, a.b2) > k) a.el.style.opacity = 0; });
        await wait(450);
        sai.forEach(d => d.remove());
        st.digs = st.digs.slice(0, k);
        if (fimV) { st.vEl.remove(); st.vEl = null; st.virg = null; }
        render();
        return true;
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
        for (const x of A.pedir || []) { x.style.transition = 'opacity .5s'; x.style.opacity = 0; }   // as setas de pedir se apagam
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
      el('div', 'qd-expr qd-errado', `<span>${virgulas(s.pegadinha.conta)}</span>`, c2.conta);
      await wait(700);
      await nota(c2.notas, s.pegadinha.passo, 'passo');
      await wait(600);
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
    await frenteEFim(c3, N, true);
    await fim(s, `${String(s.a).trim()} × ${String(s.b).trim()} = ${N.texto()}`, ['Conta as casas → multiplica sem a vírgula → anda a vírgula.']);
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
  async function frenteEFim(c, N, tiraZero) {
    if (N.virg === 0) {
      const p = await nota(c.notas, 'Vírgula na frente? Põe um 0 antes dela.', 'passo');
      await N.poeZeroNaFrente();
      await wait(700); await apagar(p);
    }
    if (tiraZero) {
      const p = await nota(c.notas, 'Zero no fim, depois da vírgula, pode sair.', 'passo');
      if (await N.tiraZeros()) { await wait(700); await apagar(p); } else p.remove();
    }
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
    await frenteEFim(c, N, true);
    await fim(s, `${p}/${k} = ${N.texto()}`, ['Conta os zeros!']);
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
      el('div', 'qd-expr qd-errado', `<span>${virgulas(s.pegadinha.conta)}</span>`, c3.conta);
      await wait(700);
      await nota(c3.notas, s.pegadinha.passo, 'passo');
      await wait(600);
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
      let final = `${num}/${den}`;
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
        final = `${num / g}/${den / g}`;
      }
      resp = `${vs[iv]} = ${final}`;
      if (iv < vs.length - 1) await paraHist(c);
    }
    await fim(s, resp, ['1 casa é 10, 2 casas é 100!']);
  }

  const CENAS = { armada: cenaArmada, mult: cenaMult, compara: cenaCompara, fracdec: cenaFracDec, divk: cenaDivK, decfrac: cenaDecFrac };

  function limpar() {
    token++;
    pausado = false;
    L.querySelectorAll('.qd-voa').forEach(e => e.remove());
    HIST.innerHTML = ''; FOCO.innerHTML = ''; LADO.innerHTML = ''; LADO.style.opacity = ''; REGRAS.innerHTML = '';
    RESP.classList.remove('on'); RESP.innerHTML = '';
    L.classList.remove('com-lado');
  }
  return {
    async tocar(cenas) {
      limpar();
      medir();
      const meu = token;
      try {
        await (document.fonts?.ready || Promise.resolve());
        await wait(300);
        for (const c of cenas || []) await CENAS[c.t]?.(c);
        return meu === token;
      } catch (e) { if (!(e instanceof Cancel)) console.error(e); return false; }
    },
    cancelar() { limpar(); },
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

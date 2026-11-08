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
//           { t: 'dez', n, n2? }, { t: 'umzero', casos: [[b, n], …] }, { t: 'naconta', a, n, op, b, m },
//           13-A (PROMPT-208): { t: 'media', l, pilhas? }, { t: 'mediaprob', l, enun, pergunta, soma, quem, rotulo, unidade },
//           { t: 'notafalta', m, k, notas }, { t: 'moda', l | listas }, { t: 'mediana', l }, { t: 'medcomp', l },
//           13-B (tab = { titulo, colunas, linhas }; j = a coluna dos números): { t: 'ler', tab, i, j, enun, resposta? },
//           { t: 'maior', tab, j, menor?, enun }, { t: 'total', tab, j, enun }, { t: 'amais', tab, j, casos: [{ a, b, enun, empate? }] },
//           { t: 'mediatab', tab, j, enun }, { t: 'fractab', tab, i, j, enun }, { t: 'pcttab', tab, i, j, enun },
//           { t: 'afirma', tab, frases: [[texto, [[linha, coluna], …], conta, ok]] }, { t: 'dupla', tab, partes: [{ t: 'cel'|'col'|'maxTotal'|'difLinha', … }] }]
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
// PROMPT-214 (docs/padrao-lousa.md): nenhuma letra da lousa menor que 2% da largura dela (≈ 14 px num celular deitado)
const LETRA_MIN = 2;
const RESP_MIN = 3.5;   // a resposta final nunca menor que 3,5% da largura da lousa (se não couber, quebra em 2 linhas)
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
// PROMPT-209: tudo 2× mais devagar. O novo 1× (padrão) é metade da velocidade antiga; o 2× é o antigo 1×; o 4×, o antigo 2×.
// FATOR = quanto as esperas andam por ms (VEL × 0,5). Chave nova no localStorage: quem tinha uma velocidade salva volta para o 1×.
const CHAVE_VEL = 'jr_lousa_vel2';
let VEL = (() => { try { const v = Number(localStorage.getItem(CHAVE_VEL)); return [1, 2, 4].includes(v) ? v : 1; } catch (_) { return 1; } })();
const FATOR = () => VEL / 2;
const QUADROS = new Set();
export const velocidade = () => VEL;
export function mudarVelocidade(v) {
  VEL = [1, 2, 4].includes(Number(v)) ? Number(v) : 1;
  try { localStorage.setItem(CHAVE_VEL, String(VEL)); localStorage.removeItem('jr_lousa_vel'); } catch (_) {}
  QUADROS.forEach(q => q.style.setProperty('--qd-vel', FATOR()));
}
const T = (s) => `calc(${s}s / var(--qd-vel, 1))`;   // duração de transição (inline) na velocidade escolhida
// "0,060" → "0,06"; "10,0" → "10"
const semZerosFim = (t) => (t.includes(',') ? t.replace(/0+$/, '').replace(/,$/, '') : t);
const fracHtml = (n, d, cls = '') => `<span class="qd-frac ${cls}"><span>${n}</span><span class="qd-fl"></span><span>${d}</span></span>`;

export function criarQuadro(raiz) {
  raiz.innerHTML = '';
  raiz.classList.add('qd-raiz');
  const L = el('div', 'qd', '', raiz);
  QUADROS.add(L); L.style.setProperty('--qd-vel', FATOR());
  const PERG = el('div', 'qd-pergtop', '', L);   // PROMPT-214: a pergunta da vez, no alto (não vai para o histórico)
  const HIST = el('div', 'qd-hist', '', L), FOCO = el('div', 'qd-foco', '', L), LADO = el('div', 'qd-lado', '', L);
  const BASE = el('div', 'qd-base', '', L), REGRAS = el('div', 'qd-regras', '', BASE), RESP = el('div', 'qd-resp', '', BASE);
  let token = 0, pausado = false, compacto = false, Wmedido = 0, ultCenas = null, rz = 0;

  // ── PROMPT-214: posições DENTRO da lousa (px da própria lousa), mesmo com a página girada ou com zoom. No celular o jogo
  //    gira tudo 90° e getBoundingClientRect devolve x/y da tela (trocados): três sondas dão o mapa tela → lousa ──
  function mapa() {
    const sonda = (x, y) => { const d = el('i', 'qd-sonda', '', L); d.style.left = x + 'px'; d.style.top = y + 'px'; const r = d.getBoundingClientRect(); d.remove(); return [r.left, r.top]; };
    const o = sonda(0, 0), a = sonda(100, 0), b = sonda(0, 100);
    const ux = [(a[0] - o[0]) / 100, (a[1] - o[1]) / 100], uy = [(b[0] - o[0]) / 100, (b[1] - o[1]) / 100];
    const det = ux[0] * uy[1] - ux[1] * uy[0] || 1;
    return (X, Y) => { const dx = X - o[0], dy = Y - o[1]; return [(dx * uy[1] - dy * uy[0]) / det, (ux[0] * dy - ux[1] * dx) / det]; };
  }
  function fluxo(e, M = mapa()) {
    const r = e.getBoundingClientRect(), p = M(r.left, r.top), q = M(r.right, r.bottom);
    return { left: Math.min(p[0], q[0]), top: Math.min(p[1], q[1]), width: Math.abs(q[0] - p[0]), height: Math.abs(q[1] - p[1]) };
  }

  // ── tamanho: 16:9 dentro do espaço que tiver; o cartão do foco diminui se não couber (nunca corta) ──
  // PROMPT-214: a conta do centro diminui a LETRA (não a escala) se não couber na largura ou na altura; as anotações têm mínimo
  function caberCard(card) {
    if (card.classList.contains('mini')) return;
    card.style.fontSize = '';
    card.querySelector(':scope > .qd-caixa-ok')?.classList.remove('quebra');
    // a largura da conta (centralizada, ela passa dos dois lados do cartão: o scrollWidth só vê o lado direito)
    const w = Math.max(card.scrollWidth, ...[...card.querySelectorAll(':scope > .qd-conta > *, :scope > .qd-caixa-ok')].map(e => e.offsetWidth));
    const max = FOCO.clientWidth * .96, maxH = FOCO.clientHeight * .98, hh = card.scrollHeight;
    if (!w || !hh) return;
    const k = Math.min(1, max / w, maxH / hh);
    if (k < 1) card.style.fontSize = parseFloat(getComputedStyle(card).fontSize) * k + 'px';
    // as anotações têm letra mínima (não encolhem junto): se ainda passar da altura, encolhe a conta mais um pouco
    for (let i = 0; i < 6 && k < 1 && card.scrollHeight > maxH + 1; i++) {
      const fs = parseFloat(card.style.fontSize), k2 = Math.max(.5, maxH / card.scrollHeight);
      if (fs * k2 < L.clientWidth * LETRA_MIN / 100) break;
      card.style.fontSize = fs * Math.min(k2, .97) + 'px';
    }
    // padrão das lousas (docs/padrao-lousa.md): a resposta final nunca menor que RESP_MIN; não coube numa linha → quebra em 2
    const minR = L.clientWidth * RESP_MIN / 100, cx = card.querySelector(':scope > .qd-caixa-ok');
    if (card.classList.contains('qd-resp-final') && parseFloat(card.style.fontSize || getComputedStyle(card).fontSize) < minR) {
      card.style.fontSize = minR + 'px';
      cx?.classList.add('quebra');
    }
  }
  function caber() { for (const card of FOCO.querySelectorAll(':scope > .qd-card')) caberCard(card); }
  // ── PROMPT-214: a pergunta vai para o alto da lousa (uma frase por linha); o foco e a lateral começam embaixo dela ──
  function ajustaTopo() {
    const etq = L.querySelector('.qd-etq'), H = L.clientHeight;
    const y = etq ? etq.offsetTop + etq.offsetHeight + H * .015 : H * .03;
    PERG.style.top = y + 'px';
    const fim = PERG.textContent.trim() ? PERG.offsetTop + PERG.offsetHeight + H * .035 : (etq ? y + H * .02 : H * .04);
    [FOCO, LADO].forEach(e => { e.style.top = fim + 'px'; });   // o histórico começa no alto, do lado da etiqueta
    L.ajustaPlano?.();   // PROMPT-215: o plano acompanha a altura que sobra
  }
  const ler = (txt) => wait(1800 + 160 * String(txt).replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length);
  async function poePergunta(txt, espera = true) {
    txt = String(txt || '').trim();
    if (!txt || PERG.dataset.txt === txt) { ajustaTopo(); return; }
    if (PERG.textContent.trim()) { PERG.style.opacity = 0; await wait(300); }
    PERG.dataset.txt = txt;
    PERG.innerHTML = txt.split(/(?<=[.?!])\s+/).map(fr => `<div>${virgulas(fr)}</div>`).join('');
    ajustaTopo(); PERG.style.opacity = 1;
    if (espera) await ler(txt);
  }
  // a pergunta da página espera a etiqueta (quando a página começa com uma); pend() a escreve no alto
  let pergPend = '';
  async function pend() { const t = pergPend; pergPend = ''; if (t) await poePergunta(t); }
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
    if (PERG.textContent.trim() || L.querySelector('.qd-etq')) ajustaTopo();
    caber();
  }
  new ResizeObserver(medir).observe(raiz);
  new ResizeObserver(caber).observe(FOCO);
  let pendCaber = false;
  new MutationObserver(() => { if (pendCaber) return; pendCaber = true; requestAnimationFrame(() => { pendCaber = false; caber(); }); })
    .observe(FOCO, { childList: true, subtree: true, characterData: true });

  // ── tempo (respeita a pausa e a troca de página) ──
  function wait(ms) {
    const meu = token;
    return new Promise((ok, falha) => {
      let resta = ms, ult = performance.now();
      const passo = () => {
        if (meu !== token) return falha(new Cancel());
        const agora = performance.now();
        if (!pausado) resta -= (agora - ult) * FATOR();
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
  // PROMPT-214: { perg } = a pergunta que fica no alto, em cima da caixa verde; { limpaLado } = a lateral sai (ex.: a contagem da moda)
  async function respostaFinal(html, { perg = '', manter = false, limpaLado = false } = {}) {
    const atual = FOCO.querySelector(':scope > .qd-card');
    if (atual && !manter) {
      const vazio = !atual.querySelector(':scope > .qd-conta')?.textContent.trim();   // só tinha anotações (já apagadas): não vai para o histórico
      if (vazio) await apagar(atual); else await paraHist({ root: atual });
    }
    if (LADO.querySelector('.qd-tab') || limpaLado) {
      LADO.style.opacity = 0; await wait(450);
      LADO.innerHTML = ''; LADO.style.opacity = '';
      L.classList.remove('com-lado', 'lado-largo', 'lado-xl');
      await wait(300);
    }
    if (perg) await poePergunta(perg, false);
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
  // PROMPT-214 (padrão das lousas): a conta vai a 50%, mas nunca com letra menor que LETRA_MIN. As anotações que ficam
  // (detalhes) não encolhem com ela: vão embaixo da conta, no tamanho mínimo. Não coube? A conta mais antiga sai (a letra não diminui).
  async function paraHist(c) {
    const card = c.root;
    if (compacto) { await apagar(card); return; }
    const notas = card.querySelector(':scope > .qd-notas');
    const txtN = notas ? [...notas.querySelectorAll('.qd-nota')].filter(n => !n.classList.contains('qd-apaga')).map(n => n.textContent.trim()).filter(Boolean) : [];
    if (notas) { notas.classList.add('qd-apaga'); await wait(250); notas.remove(); }
    const M = mapa(), f = fluxo(card, M), h = card.offsetHeight;
    const w = Math.max(card.offsetWidth, ...[...card.querySelectorAll(":scope > .qd-conta > *")].map(e => e.offsetWidth));
    const gap = parseFloat(getComputedStyle(HIST).rowGap) || 0;
    const min = L.clientWidth * LETRA_MIN / 100;
    const fonte = parseFloat(getComputedStyle(card).fontSize) * .75;   // a menor letra da conta (listas, frações e o certo embaixo ficam ~75%)
    const K = Math.min(1, Math.max(min / fonte, Math.min(.5, (HIST.clientWidth - 4) / Math.max(w, 1))));
    const slot = el('div', 'qd-hslot', '', HIST);
    slot.style.width = Math.max(w * K, 1) + 'px';
    const hn = txtN.length ? el('div', 'qd-hnota', esc(txtN.join(' · ')), slot) : null;
    if (hn) hn.style.top = h * K + 'px';
    const alt = h * K + (hn ? hn.offsetHeight + 2 : 0);
    slot.style.height = alt + 'px';
    const livre = HIST.clientHeight - 2;
    const usado = () => [...HIST.children].filter(x => x !== slot).reduce((t, e) => t + e.offsetHeight + gap, 0);
    while (HIST.firstElementChild !== slot && usado() + alt > livre) {   // não cabe: a mais antiga sai
      const velho = HIST.firstElementChild; velho.style.transition = `opacity ${T(.3)}`; velho.style.opacity = 0; await wait(300); velho.remove();
    }
    card.style.width = w + 'px';
    slot.insertBefore(card, slot.firstChild);
    card.style.setProperty("--hk", K);   // as letras miúdas (expoente, empréstimo…) crescem para ficar no mínimo depois da escala
    card.classList.add('mini');
    card.style.transition = 'none';
    card.style.transform = `scale(${K})`;
    if (hn) hn.style.opacity = 0;
    const l = fluxo(card, M);
    card.style.transform = `translate(${f.left - l.left}px, ${f.top - l.top}px) scale(1)`;
    card.offsetWidth;
    card.style.transition = `transform ${T(.85)} cubic-bezier(.3, .8, .3, 1)`;
    card.style.transform = `scale(${K})`;
    await wait(700);
    if (hn) { hn.style.transition = `opacity ${T(.3)}`; hn.style.opacity = 1; }
    await wait(200);
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
    // PROMPT-214: voa dentro da lousa, nas coordenadas da lousa (certo também com a tela girada)
    const M = mapa(), a = fluxo(de, M), b = fluxo(para, M);
    const f = el('span', 'qd-voa', '', L); f.textContent = txt;
    Object.assign(f.style, { left: a.left + 'px', top: a.top + 'px', fontSize: getComputedStyle(de).fontSize });
    f.offsetWidth;
    Object.assign(f.style, { left: b.left + 'px', top: b.top + 'px', fontSize: getComputedStyle(para).fontSize });
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
  async function poe(fr, q, v) { const e = parte(fr, q); e.innerHTML = v; e.style.visibility = ''; e.classList.remove('qd-pop'); void e.offsetWidth; e.classList.add('qd-pop'); await wait(500); }
  // posição de um elemento dentro do fx, em px de layout. PROMPT-214: medida nas coordenadas da lousa (mapa), certa com a tela girada
  function rel(w, e) {
    const M = mapa(), a = fluxo(w, M), b = fluxo(e, M), k = a.width / (w.offsetWidth || 1) || 1;
    return { x: (b.left - a.left) / k, y: (b.top - a.top) / k, w: b.width / k, h: b.height / k };
  }
  // setinha azul curva de um número da fração até o outro (em cima: os de cima; embaixo: os de baixo), com o rótulo.
  // PROMPT-214: valor = o número de destino entra invisível no lugar dele ANTES da seta (senão ela mira o "?" e fica torta);
  // o rótulo (× 5, ÷ 2) fica fora dos números
  async function arcoX(F, de, ate, lado, rot, valor = null) {
    if (valor !== null) { ate.innerHTML = valor; ate.style.visibility = 'hidden'; }
    F.svg.setAttribute('width', F.w.offsetWidth); F.svg.setAttribute('height', F.w.offsetHeight);
    const fs = parseFloat(getComputedStyle(F.w).fontSize);
    const A = rel(F.w, de), B = rel(F.w, ate), cima = lado === 'cima';
    const x1 = A.x + A.w * .75, x2 = B.x + B.w * .25;
    const y1 = cima ? A.y + fs * .02 : A.y + A.h - fs * .02, y2 = cima ? B.y + fs * .02 : B.y + B.h - fs * .02;
    const cy = cima ? Math.min(y1, y2) - fs * .6 : Math.max(y1, y2) + fs * .6;
    curva(F.svg, x1, y1, (x1 + x2) / 2, cy, x2, y2, 'var(--qd-azul)', fs * .045);
    const r = el('div', 'rotx', esc(rot), F.w);
    r.style.left = (x1 + x2) / 2 + 'px';
    r.style.top = (cima ? Math.min(y1, y2) - fs * .62 : Math.max(y1, y2) + fs * .62) + 'px';
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
  function tabuadaA(n, ate = 10, ini = 1) {
    return Array.from({ length: ate - ini + 1 }, (_, k) => el('div', 'qd-tab', `<span>${n} × ${k + ini} = <span class="res">${n * (k + ini)}</span></span><span class="ok"></span>`, LADO));
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
    ajustaTopo();
    await wait(450);
    if (sub) { await nota(e, sub, 'etq-sub'); ajustaTopo(); }
    await wait(300);
    await pend();   // PROMPT-214: a pergunta da página entra embaixo da etiqueta
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
    await arcoX(F, parte(a, 'n'), parte(b, 'n'), 'cima', `÷ ${g}`, x / g); await poe(b, 'n', x / g);
    await arcoX(F, parte(a, 'd'), parte(b, 'd'), 'baixo', `÷ ${g}`, y / g); await poe(b, 'd', y / g);
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
    await arcoX(F, parte(f0, 'n'), parte(f1, 'n'), 'cima', `× ${k}`, A2);
    await poe(f1, 'n', A2);
    await apagar(p0);
    const p2 = await nota(c.notas, `E embaixo também por ${k}.`, 'passo');
    await arcoX(F, parte(f0, 'd'), parte(f1, 'd'), 'baixo', `× ${k}`, B2);
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
      await arcoX(F, parte(f0, 'd'), parte(f1, 'd'), 'baixo', `× ${m}`, D); await poe(f1, 'd', D);
      q2 = await nota(c2.notas, `O que faz embaixo, faz em cima: × ${m}.`, 'passo');
      await arcoX(F, parte(f0, 'n'), parte(f1, 'n'), 'cima', `× ${m}`, x * m); await poe(f1, 'n', x * m);
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

  // ══════════════════ PROMPT-208/214: 13-A (média, moda, mediana) e 13-B (tabelas) — protótipos referencia/lousa-13a.html e lousa-13b.html ══════════════════
  // PROMPT-214: a pergunta fica no alto da lousa (tocar → perguntaDe), não dentro do cartão; a média sempre conta quantos números são
  const nBR = (v) => String(Number(Number(v).toFixed(2))).replace('.', ',');
  const fmtL = (l) => l.map(nBR).join(', ');
  const eFinal = (l) => (l.length < 2 ? fmtL(l) : `${fmtL(l.slice(0, -1))} e ${nBR(l[l.length - 1])}`);
  const somaL = (l) => l.reduce((a, b) => a + b, 0);
  const listaH = (arr) => arr.map(v => `<span class="qd-nb">${virgulas(nBR(v))}</span>`).join('<span class="qd-sep">,</span>');
  async function contaNums(els) { for (const [i, e] of els.entries()) { el('span', 'qd-cnt qd-pop', String(i + 1), e); await wait(330); } }
  const verde = (e, txt) => { e.innerHTML = virgulas(String(txt)); e.className = 'qd-pop'; e.style.color = 'var(--qd-verde)'; };
  // "a ÷ b = ?" (as partes separadas por "="): devolve o "?" que vira o resultado
  function contaQ(c, partes, pre = '') {
    c.conta.innerHTML = `${pre}<div class="qd-fx">${[].concat(partes).map(p => `<span>${p}</span><span class="igual">=</span>`).join('')}<span class="vazio-q qd-rr">?</span></div>`;
    return c.conta.querySelector('.qd-rr');
  }
  // cartão com a lista de números (a pergunta já está no alto)
  function cartaoLista(l) {
    const c = cartao();
    c.conta.innerHTML = `<div class="qd-fx qd-lista">${listaH(l)}</div>`;
    c.nbs = [...c.conta.querySelectorAll('.qd-nb')];
    return c;
  }
  // a média sempre conta quantos números são: 1, 2, 3… embaixo de cada um
  async function contaQuantos(c, n) {
    const p = await nota(c.notas, 'Quantos números são?', 'passo');
    await contaNums(c.nbs);
    await nota(c.notas, `${n} números`, 'detalhe');
    await apagar(p);
  }
  // expressão: cada "=" começa uma linha nova
  async function expr(pai, linhas, ms = 650) {
    const box = el('div', 'qd-xpr', '', pai);
    for (const l of linhas) { el('div', 'xl qd-pop', l, box); await wait(ms); }
    return box;
  }
  // divisão na chave (média com vírgula): coluna 0 = sinal, 1..Ls = algarismos do dividendo, Ls+1 = a casa depois da vírgula
  function chave(pai, S, n) {
    const Ls = String(S).length, nc = Ls + 2;
    const w = el('div', 'qd-chave', '', pai);
    const g = el('div', 'ch-esq', '', w);
    g.style.gridTemplateColumns = `.55em repeat(${Ls + 1}, .62em)`;
    const cel = {};
    for (let r = 0; r < 5; r++) for (let k = 0; k < nc; k++) { const e = el('span', 'cc', '', g); e.style.gridRow = r + 1; e.style.gridColumn = k + 1; cel[r + ',' + k] = e; }
    const dir = el('div', 'ch-dir', `<div class="ch-dv">${n}</div>`, w), q = el('div', 'ch-q', '', dir);
    const K = {
      Ls,
      async put(r, k, t, cls = '') { const e = cel[r + ',' + k]; if (!e) return; e.textContent = t; e.classList.add('qd-pop'); if (cls) e.classList.add(cls); await wait(350); },
      linha(r) { for (let k = 0; k < nc; k++) cel[r + ',' + k].classList.add('sub'); },
      async q(t, cls = '') { el('span', 'qd-pop ' + cls, t, q); await wait(450); },
      // o número txt terminando na coluna fim (com o "−" na frente)
      async num(r, fim, txt, menos = false) { const t = String(txt); if (menos) await K.put(r, Math.max(0, fim - t.length), '−'); for (let i = 0; i < t.length; i++) await K.put(r, fim - t.length + 1 + i, t[i]); },
    };
    return K;
  }
  // a tabuada do n com 10 linhas, até a linha kMax (quando passa de × 10, começa mais embaixo)
  const tabuadaPara = (n, kMax) => { const ate = Math.max(10, kMax); return tabuadaA(n, ate, ate - 9); };
  const limpaTab13 = (T) => T.forEach(x => { x.classList.remove('achou', 'cabe'); x.querySelector('.ok').textContent = ''; });
  // a tabuada desce até passar do número e volta uma: quanto cabe
  async function procuraAte(T, alvo) {
    let ant = null;
    for (const t of T) {
      const v = Number(t.querySelector('.res').textContent);
      t.classList.add('atual'); await wait(330); t.classList.remove('atual');
      if (v === alvo) { t.classList.add('achou'); t.querySelector('.ok').textContent = '✔ exato!'; await wait(400); return t; }
      if (v > alvo) { t.querySelector('.ok').textContent = '✖ passou'; await wait(500); if (ant) { ant.classList.add('achou'); ant.querySelector('.ok').textContent = '✔'; } await wait(400); return ant; }
      t.classList.add('cabe'); t.querySelector('.ok').textContent = '✔'; ant = t;
    }
    return ant;
  }
  // pilhas de blocos que se nivelam (média = dividir igualzinho)
  function pilhas(vals) {
    const box = el('div', 'qd-pilhas', '', LADO);
    const W = box.offsetWidth, H = box.offsetHeight, n = vals.length, b = Math.min(W / (n * 1.9), H / 7.5);
    const x = i => (i + .5) * W / n - b / 2, y = lvl => lvl * b * 1.08;
    const cols = vals.map((v, i) => Array.from({ length: v }, (_, k) => { const e = el('i', '', '', box); Object.assign(e.style, { width: b + 'px', height: b + 'px', left: x(i) + 'px', bottom: y(k) + b * .9 + 'px' }); return e; }));
    const rot = vals.map((v, i) => { const r = el('span', 'prot', String(v), box); r.style.left = x(i) + b / 2 + 'px'; return r; });
    const move = async (de, para) => {
      const e = cols[de].pop(); cols[para].push(e); e.classList.add('anda');
      e.style.left = x(para) + 'px'; e.style.bottom = y(cols[para].length - 1) + b * .9 + 'px';
      await wait(700);
      rot[de].textContent = cols[de].length; rot[para].textContent = cols[para].length;
    };
    return {
      // passa do maior para o menor até todos ficarem com m
      async nivela(m) { for (let g = 0; g < 30; g++) { const h = cols.map(c => c.length), de = h.indexOf(Math.max(...h)), para = h.indexOf(Math.min(...h)); if (h[de] <= m) break; await move(de, para); } },
      igual() { rot.forEach(r => r.classList.add('ok')); },
    };
  }
  // contagem com pauzinhos (moda)
  function pauzinhos(valores) {
    const box = el('div', 'qd-tally', '', LADO);
    const rows = {};
    for (const v of [...new Set(valores)].sort((a, b) => a - b)) rows[v] = el('div', 'trow', `<b>${nBR(v)}</b><span class="paus"></span><span class="tq"></span>`, box);
    return {
      async marca(v) { const r = rows[v]; r.querySelector('.paus').textContent += '|'; r.classList.add('pisca1'); await wait(300); r.classList.remove('pisca1'); },
      destaca(vs) { for (const [v, r] of Object.entries(rows)) { r.querySelector('.tq').textContent = `${r.querySelector('.paus').textContent.length}×`; r.classList.toggle('max', vs.includes(Number(v))); } },
    };
  }
  // linha de números que se ordena e tem as pontas riscadas (mediana)
  function linhaOrdena(pai, vals) {
    const box = el('div', 'qd-mrow', '', pai);
    const P = vals.some(v => String(v).length > 1) ? 1.7 : 1.25;
    box.style.width = vals.length * P + 'em';
    const its = vals.map((v, i) => { const e = el('span', 'mi', nBR(v), box); e.style.left = i * P + 'em'; e.style.width = P - .15 + 'em'; return { v, e }; });
    return {
      async ordena() {
        const ord = [...its].sort((a, b) => a.v - b.v);
        ord.forEach((it, i) => { it.e.style.left = i * P + 'em'; });
        await wait(1000);
        return ord;
      },
      async risca(ord) {
        let i = 0, j = ord.length - 1;
        while (j - i >= 2) { ord[i].e.classList.add('fora'); ord[j].e.classList.add('fora'); await wait(650); i++; j--; }
        for (let k = i; k <= j; k++) ord[k].e.classList.add('meio');
        await wait(500);
        return ord.slice(i, j + 1).map(o => o.v);
      },
    };
  }
  const ehOrdem = (l) => l.every((v, i) => !i || l[i - 1] <= v);

  // 13-A p.1 e p.2) média: (as pilhas se nivelam) soma tudo, conta quantos são, divide; sobrou? a chave, vírgula e zero
  async function cenaMedia(s) {
    const l = s.l.map(Number), n = l.length, S = somaL(l), q = Math.floor(S / n), r = S % n, d = r * 10 / n, m = S / n;
    if (n < 2 || !q || (r && !Number.isInteger(d))) { await pend(); return; }
    const virg = r > 0;
    ladoLargo();
    const comPilhas = !virg && s.pilhas !== false && n <= 5 && Math.max(...l) <= 6 && l.some(v => v !== m) && somaL(l.map(v => Math.max(0, v - m))) <= 6;
    if (!virg) await etiqueta('MÉDIA', 'dividir igual entre todos'); else await pend();
    let c, p, p2, rr;
    if (comPilhas) {
      const P = pilhas(l);
      c = cartaoLista(l);
      await wait(600);
      p = await nota(c.notas, 'Média é deixar todos iguais.', 'passo');
      await wait(400);
      p2 = await nota(c.notas, 'Passa do maior para o menor…', 'passo');
      await P.nivela(m); P.igual();
      await apagar(p, p2);
      p = await nota(c.notas, `Ficou ${m} em cada: a média é ${m}.`, 'passo');
      await wait(900); await apagar(p);
      await paraHist(c);
      c = cartao();
      rr = contaQ(c, l.map(nBR).join(' + '));
      p = await nota(c.notas, 'Na conta: primeiro soma tudo.', 'passo');
      await wait(500); verde(rr, S);
      await wait(600); await apagar(p);
      await paraHist(c);
      c = cartaoLista(l);
      await contaQuantos(c, n);
      await paraHist(c);
    } else {
      c = cartaoLista(l);
      await wait(500);
      await contaQuantos(c, n);
      await paraHist(c);
      c = cartao();
      rr = contaQ(c, l.map(nBR).join(' + '));
      p = await nota(c.notas, 'Soma tudo.', 'passo');
      await wait(500); verde(rr, S);
      await wait(500); await apagar(p);
      await paraHist(c);
    }
    if (!virg) {
      const T = await novoLado(() => tabuadaPara(n, q));
      c = cartao();
      rr = contaQ(c, `${S} ÷ ${n}`);
      p = await nota(c.notas, 'Divide a soma pela quantidade.', 'passo');
      await procuraAlvo(T, S);
      verde(rr, m);
      await wait(600); await apagar(p);
      await respostaFinal(`<span>média = ${nBR(m)}</span>`, { perg: perguntaDe(s) });
    } else {
      let T = await novoLado(() => tabuadaPara(n, q + 1));
      c = cartao();
      const K = chave(c.conta, S, n), Ls = K.Ls, sS = String(S), res = `${q},${d}`;
      for (let i = 0; i < Ls; i++) await K.put(0, 1 + i, sS[i]);
      p = await nota(c.notas, `Divide ${S} pelos ${n} números. Quantas vezes o ${n} cabe no ${S}?`, 'passo');
      await procuraAte(T, S);
      await K.q(String(q));
      await K.num(1, Ls, n * q, true); K.linha(1);
      await apagar(p);
      p = await nota(c.notas, `Cabe ${q} ${q === 1 ? 'vez' : 'vezes'} (${n} × ${q} = ${n * q}). Tira: ${S} − ${n * q} = ${r}.`, 'passo');
      await K.num(2, Ls, r);
      await wait(600); await apagar(p);
      p = await nota(c.notas, `Sobrou ${r}: põe a vírgula no resultado e um zero do lado do ${r}.`, 'passo');
      await K.q(',', 'novo'); await K.put(2, Ls + 1, '0', 'novo');
      await wait(500); await apagar(p);
      if (T.some(t => Number(t.querySelector('.res').textContent) === r * 10)) limpaTab13(T);
      else T = await trocaLado(() => tabuadaA(n));
      p = await nota(c.notas, `Agora ${r * 10} ÷ ${n}: o ${n} cabe ${d} ${d === 1 ? 'vez' : 'vezes'} no ${r * 10}.`, 'passo');
      await procuraAlvo(T, r * 10);
      await K.q(String(d));
      await K.num(3, Ls + 1, r * 10, true); K.linha(3);
      await K.put(4, Ls + 1, '0');
      await apagar(p);
      p = await nota(c.notas, `Sobrou 0: acabou. ${S} ÷ ${n} = ${res}`, 'passo');
      await wait(500);
      await nota(c.notas, `confere: ${res} fica entre ${nBR(Math.min(...l))} e ${nBR(Math.max(...l))} ✔`, 'detalhe');
      await wait(600); await apagar(p);
      await respostaFinal(`<span>${virgulas(`média = ${res}`)}</span>`, { perg: perguntaDe(s) });
    }
    for (const x of s.regras || [virg ? 'Sobrou na divisão? Vírgula no resultado, zero no resto e continua.' : 'Média: soma tudo e divide pela quantidade.']) await regra(x);
  }

  // 13-A p.3) a nota que falta: média × quantidade = total; total − o que já tem = o que falta
  const ORD_F = ['', 'primeira', 'segunda', 'terceira', 'quarta', 'quinta', 'sexta'];
  async function cenaNotaFalta(s) {
    const notas = s.notas.map(Number), m = Number(s.m), k = Number(s.k) || notas.length + 1, tot = m * k, ja = somaL(notas), f = tot - ja;
    const ord = ORD_F[k] || `${k}ª`;
    const passos = [
      [`${nBR(m)} × ${k}`, tot, `Média ${nBR(m)} em ${k} provas: o total tem que ser ${nBR(m)} × ${k}.`, `tem que dar ${nBR(tot)}`],
      [notas.map(nBR).join(' + '), ja, notas.length === 2 ? 'As duas notas que já tem somam:' : 'As notas que já tem somam:', `já tem ${nBR(ja)}`],
      [`${nBR(tot)} − ${nBR(ja)}`, f, 'Falta o que não chegou ainda:', ''],
    ];
    for (const [i, [conta, res, txt, det]] of passos.entries()) {
      const c = cartao();
      const rr = contaQ(c, conta);
      const p = await nota(c.notas, txt, 'passo');
      await wait(500); verde(rr, nBR(res));
      if (det) await nota(c.notas, det, 'detalhe');
      await wait(500); await apagar(p);
      if (i < passos.length - 1) await paraHist(c);
    }
    await respostaFinal(`<span>${virgulas(`a ${ord} nota é ${nBR(f)}`)}</span>`, { perg: perguntaDe(s) });
    for (const r of s.regras || ['Média × quantidade = total. Total − o que já tem = o que falta.']) await regra(r);
  }

  // 13-A p.4 e p.5) moda: cada número ganha um pauzinho; a moda fica circulada em amarelo e os outros apagadinhos
  //   (empate: as duas; ninguém repete: não tem). A contagem sai na resposta.
  const infoModa = (l) => {
    const cnt = new Map(); l.forEach(v => cnt.set(v, (cnt.get(v) || 0) + 1));
    const mx = Math.max(...cnt.values());
    return { mx, modas: mx > 1 ? [...cnt].filter(([, k]) => k === mx).map(([v]) => v).sort((a, b) => a - b) : [] };
  };
  const modaTxt = (I) => (!I.modas.length ? 'não tem moda' : I.modas.length === 1 ? `moda = ${nBR(I.modas[0])}` : `moda: ${eFinal(I.modas)}`);
  async function cenaModa(s) {
    const ls = (s.listas || [s.l]).map(l => l.map(Number)), varias = ls.length > 1;
    ladoLargo();
    await etiqueta('MODA', 'o número que mais aparece');
    const infos = ls.map(infoModa);
    for (const [i, l] of ls.entries()) {
      const I = infos[i];
      const Tl = i ? await trocaLado(() => pauzinhos(l)) : pauzinhos(l);
      if (i) await poePergunta(`E a moda de ${eFinal(l)}?`);
      const c = cartaoLista(l);
      await wait(500);
      let p = i ? null : await nota(c.notas, varias ? 'Conta cada um…' : 'Conta quantas vezes cada número aparece.', 'passo');
      for (const [k, v] of l.entries()) { acende(c.nbs[k]); await Tl.marca(v); acende(c.nbs[k], false); }
      Tl.destaca(I.modas);
      if (I.modas.length) l.forEach((v, k) => c.nbs[k].classList.add(I.modas.includes(v) ? 'moda' : 'nao'));
      if (p) await apagar(p);
      if (I.modas.length === 1) {
        p = await nota(c.notas, `O ${nBR(I.modas[0])} aparece ${plural(I.mx, 'vez', 'vezes')}: é a moda.`, 'passo');
        await wait(800); await apagar(p);
      } else if (I.modas.length) {
        const nomes = I.modas.map(v => `o ${nBR(v)}`), quem = `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
        p = await nota(c.notas, `${quem[0].toUpperCase()}${quem.slice(1)} empatam com ${I.mx} vezes: a moda são ${I.modas.length === 2 ? 'os dois' : 'todos eles'}.`, 'passo');
        await wait(900); await apagar(p);
      } else {
        p = await nota(c.notas, 'Ninguém se repete: não tem moda.', 'passo');
        await wait(700); await apagar(p);
        await nota(c.notas, 'não tem moda', 'detalhe');
      }
      if (i < ls.length - 1) await paraHist(c);
    }
    const perg = varias ? `Qual é a moda de ${fmtL(ls[0])}?${ls.slice(1).map(l => ` E de ${fmtL(l)}?`).join('')}` : '';
    await respostaFinal(varias ? ls.map((l, i) => `<span class="l2">${fmtL(l)} → ${modaTxt(infos[i])}</span>`).join('') : `<span>${modaTxt(infos[0])}</span>`, { perg, limpaLado: true });
    const simples = infos.every(I => I.modas.length === 1);
    for (const r of s.regras || [simples ? 'Moda: o que mais aparece (o que está "na moda").' : 'Empatou? Os dois são moda. Ninguém repete? Não tem moda.']) await regra(r);
  }

  // 13-A p.6 e p.7) mediana, no histórico: como veio → em ordem → pontas riscadas → (pegadinha com o certo embaixo)
  //   quantidade par: sobram dois, a mediana é a média deles: (a + b) ÷ 2 / = S ÷ 2 / = v
  async function cenaMediana(s) {
    const l = s.l.map(Number), n = l.length, par = n % 2 === 0;
    if (n < 2) return;
    await etiqueta('MEDIANA', 'o número do meio, em ordem');
    const c1 = cartaoLista(l), jaOrdem = ehOrdem(l);
    await wait(500);
    let p = await nota(c1.notas, jaOrdem ? 'Primeiro põe em ordem: já está!' : 'Primeiro põe em ordem, do menor para o maior.', 'passo');
    await wait(600); await apagar(p);
    await paraHist(c1);
    let ord = [...l].sort((a, b) => a - b);
    if (!jaOrdem) {
      const c2 = cartao();
      const R = linhaOrdena(c2.conta, l);
      await wait(500);
      ord = (await R.ordena()).map(o => o.v);
      await nota(c2.notas, 'em ordem', 'detalhe');
      await paraHist(c2);
    }
    const c3 = cartao();
    const R2 = linhaOrdena(c3.conta, ord);
    p = await nota(c3.notas, 'Agora risca uma ponta de cada lado.', 'passo');
    const meio = await R2.risca(await R2.ordena());
    await apagar(p);
    if (!par) {
      const md = meio[0], im = (n - 1) / 2;
      p = await nota(c3.notas, `Sobrou o do meio: ${nBR(md)}.`, 'passo');
      await wait(700); await apagar(p);
      await paraHist(c3);
      if (s.pegadinha !== false && l[im] !== md) {
        const c4 = cartao();
        c4.conta.innerHTML = `<div class="qd-fx qd-errado"><span>${l.map((v, k) => (k === im ? `<span class="qd-x"><span>${nBR(v)}</span></span>` : nBR(v))).join(', ')}</span></div>`;
        await nota(c4.notas, 'Pegadinha: sem pôr em ordem, o do meio dá errado!', 'passo');
        await wait(500);
        await certoEmbaixo(c4, `<span>${fmtL(ord)} → ${nBR(md)}</span>`);
      }
      await respostaFinal(`<span>mediana = ${nBR(md)}</span>`, { perg: perguntaDe(s) });
      for (const r of s.regras || ['Mediana: põe em ordem e pega o do meio.']) await regra(r);
      return;
    }
    p = await nota(c3.notas, 'Sobraram dois no meio: a mediana é a média deles.', 'passo');
    await wait(800); await apagar(p);
    await paraHist(c3);
    const [a, b] = meio, S = a + b, v = S / 2;
    const c4 = cartao();
    p = await nota(c4.notas, 'Soma os dois e divide por 2.', 'passo');
    const box = await expr(c4.conta, [`<span>(${nBR(a)} + ${nBR(b)}) ÷ 2</span>`, `<span>= ${nBR(S)} ÷ 2</span>`]);
    await apagar(p);
    p = await nota(c4.notas, Number.isInteger(S) && S % 2 ? `O 2 cabe ${(S - 1) / 2} ${(S - 1) / 2 === 1 ? 'vez' : 'vezes'} no ${S} e sobra 1. Vírgula e zero: 10 ÷ 2 = 5.` : `${nBR(S)} ÷ 2 = ${nBR(v)}.`, 'passo');
    el('div', 'xl qd-pop', '<span>=</span><span class="vazio-q qd-rr">?</span>', box);
    await wait(900); verde(box.querySelector('.qd-rr'), nBR(v));
    await wait(600); await apagar(p);
    await respostaFinal(`<span>${virgulas(`mediana = ${nBR(v)}`)}</span>`, { perg: perguntaDe(s) });
    for (const r of s.regras || ['Quantidade par? Soma os dois do meio e divide por 2.']) await regra(r);
  }

  // 13-A p.8) média × mediana: conta os números, a média (expressão em linhas), a mediana (riscando as pontas) e a diferença
  async function cenaMedComp(s) {
    const l = s.l.map(Number), n = l.length, S = somaL(l), me = S / n, srt = [...l].sort((a, b) => a - b);
    const md = n % 2 ? srt[(n - 1) / 2] : (srt[n / 2 - 1] + srt[n / 2]) / 2, v = Math.abs(me - md);
    const c0 = cartaoLista(l);
    await wait(500);
    await contaQuantos(c0, n);
    await paraHist(c0);
    const c1 = cartao();
    let p = await nota(c1.notas, `Média: soma tudo e divide por ${n}.`, 'passo');
    const b1 = await expr(c1.conta, [`<span>${l.map(nBR).join(' + ')} = ${nBR(S)}</span>`, `<span>${nBR(S)} ÷ ${n}</span>`]);
    el('div', 'xl qd-pop', '<span>=</span><span class="vazio-q qd-rr">?</span><span class="tag">← média</span>', b1);
    await wait(600); verde(b1.querySelector('.qd-rr'), nBR(me));
    await wait(600); await apagar(p);
    await paraHist(c1);
    const c2 = cartao();
    const R = linhaOrdena(c2.conta, l);
    p = await nota(c2.notas, ehOrdem(l) ? 'Mediana: já está em ordem. Risca as pontas.' : 'Mediana: põe em ordem e risca as pontas.', 'passo');
    await R.risca(await R.ordena());
    el('div', 'xl qd-pop', `<span style="color:var(--qd-verde)">${virgulas(nBR(md))}</span><span class="tag">← mediana</span>`, el('div', 'qd-xpr', '', c2.conta));
    await wait(700); await apagar(p);
    await paraHist(c2);
    const c3 = cartao(), meMaior = me >= md;
    p = await nota(c3.notas, meMaior ? 'A diferença: média menos mediana.' : 'A diferença: mediana menos média.', 'passo');
    const b3 = await expr(c3.conta, [`<span>${meMaior ? 'média − mediana' : 'mediana − média'}</span>`, `<span>= ${nBR(meMaior ? me : md)} − ${nBR(meMaior ? md : me)}</span>`]);
    el('div', 'xl qd-pop', '<span>=</span><span class="vazio-q qd-rr">?</span>', b3);
    await wait(600); verde(b3.querySelector('.qd-rr'), nBR(v));
    await apagar(p);
    if (me !== md) await nota(c3.notas, me > md ? `O ${nBR(srt[n - 1])} é grande e puxa a média para cima.` : `O ${nBR(srt[0])} é pequeno e puxa a média para baixo.`, 'detalhe');
    await wait(600);
    await respostaFinal(`<span>${virgulas(`${meMaior ? 'média − mediana' : 'mediana − média'} = ${nBR(v)}`)}</span>`, { perg: perguntaDe(s) });
    for (const r of s.regras || [me >= md ? 'Um número muito grande puxa a média, mas não a mediana.' : 'Um número muito pequeno puxa a média, mas não a mediana.']) await regra(r);
  }

  // ── 13-B: a tabela fica na lateral a página toda; linha, coluna e cruzamento acendem ──
  const COL_TXT = { Vendas: 'das vendas', Votos: 'dos votos', Gols: 'dos gols', Meninos: 'dos meninos', Meninas: 'das meninas', Total: 'Total' };
  const UNID = { Vendas: 'frutas', Votos: 'votos', Gols: 'gols', Meninos: 'meninos', Meninas: 'meninas', Total: 'votos' };
  const LINHA_UN = { Fruta: ['fruta', 'frutas'], Esporte: ['esporte', 'esportes'], Dia: ['dia', 'dias'] };
  const VERBO = { Vendas: 'vendeu', Votos: 'teve', Gols: 'teve', Total: 'teve' };
  const MASC = new Set(['Futebol', 'Vôlei', 'Basquete']);
  const oA = (nome) => `${MASC.has(nome) ? 'o' : 'a'} ${String(nome).toLowerCase()}`;
  const daLinha = (nome) => `${MASC.has(nome) ? 'do' : 'da'} ${String(nome).toLowerCase()}`;
  const todosOs = (u) => (/^(frutas|meninas)$/.test(u) ? `todas as ${u}` : `todos os ${u}`);
  const colTxt = (tab, j) => COL_TXT[tab.colunas[j]] || `"${tab.colunas[j]}"`;
  const unid = (tab, j) => UNID[tab.colunas[j]] || '';
  const linhasUn = (tab) => LINHA_UN[tab.colunas[0]] || ['linha', 'linhas'];
  const valsCol = (tab, j) => tab.linhas.map(l => Number(l[j]));
  const minus = (t) => String(t).toLowerCase();
  function tabela(Tb) {
    const box = el('div', 'qd-tabw', `<div class="qd-ttit">${esc(Tb.titulo)}</div>`, LADO);
    const t = el('table', 'qd-tabela' + (Tb.colunas.length > 2 ? ' larga' : ''), '', box);
    L.classList.toggle('lado-xl', Tb.colunas.length > 2);   // PROMPT-214: 4 colunas → a lateral mais larga (a letra não fica abaixo do mínimo)
    t.innerHTML = `<thead><tr>${Tb.colunas.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${Tb.linhas.map(l => `<tr>${l.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody>`;
    const th = [...t.querySelectorAll('th')], rows = [...t.querySelectorAll('tbody tr')].map(r => [...r.children]);
    return {
      limpa() { t.querySelectorAll('.hl, .cruz, .marca').forEach(e => e.classList.remove('hl', 'cruz', 'marca')); },
      linha(i) { rows[i].forEach(c => c.classList.add('hl')); },
      coluna(j) { th[j].classList.add('hl'); rows.forEach(r => r[j].classList.add('hl')); },
      cel(i, j) { return rows[i][j]; },
    };
  }

  // 13-B p.1) ler a tabela: a linha, a coluna, o cruzamento fica verde e o número voa direto para a resposta verde
  async function cenaLer(s) {
    const tab = s.tab, i = Number(s.i), j = Number(s.j ?? 1), nome = tab.linhas[i][0], v = String(tab.linhas[i][j]);
    ladoLargo();
    await etiqueta('TABELA', 'linhas deitadas, colunas em pé');
    const T = tabela(tab);
    const c = cartao();
    let p = await nota(c.notas, `Primeiro acha a linha ${daLinha(nome)}.`, 'passo');
    T.linha(i); await wait(900); await apagar(p);
    p = await nota(c.notas, `Depois a coluna ${colTxt(tab, j)}.`, 'passo');
    T.coluna(j); await wait(900); await apagar(p);
    p = await nota(c.notas, 'A resposta está onde as duas se cruzam.', 'passo');
    T.cel(i, j).classList.add('cruz'); await wait(800);
    await apagar(p);
    const txt = s.resposta || `${nome}: ${v}`, k = txt.indexOf(v);
    const num = `<span class="qd-rf qd-esconde">${esc(v)}</span>`;
    const rc = await respostaFinal(k < 0 ? `<span>${esc(txt)} ${num}</span>` : `<span>${esc(txt.slice(0, k))}${num}${esc(txt.slice(k + v.length))}</span>`);
    await voar(T.cel(i, j), rc.querySelector('.qd-rf'), v);
    for (const r of s.regras || ['Acha a linha, depois a coluna: a resposta está no cruzamento.']) await regra(r);
  }

  // 13-B p.2) maior e menor: o marcador desce a coluna; embaixo, "o maior até agora"
  async function cenaMaior(s) {
    const tab = s.tab, j = Number(s.j ?? 1), menor = !!s.menor, vs = valsCol(tab, j), verbo = VERBO[tab.colunas[j]] || 'teve';
    ladoLargo();
    const T = tabela(tab);
    const c = cartao();
    c.conta.innerHTML = '<div class="qd-fx"><span class="vazio-q qd-m">?</span></div>';
    await nota(c.notas, `o ${menor ? 'menor' : 'maior'} até agora`, 'detalhe');
    let p = await nota(c.notas, `Desce a coluna ${colTxt(tab, j)} comparando.`, 'passo');
    T.coluna(j);
    let best = null, iM = 0;
    const m = c.conta.querySelector('.qd-m');
    for (const [i, v] of vs.entries()) {
      T.cel(i, j).classList.add('marca'); await wait(500);
      if (best == null || (menor ? v < best : v > best)) { best = v; iM = i; m.textContent = `${v} (${tab.linhas[i][0]})`; m.className = 'qd-pop'; await wait(300); m.className = ''; }
      T.cel(i, j).classList.remove('marca');
    }
    T.limpa(); T.linha(iM); T.cel(iM, j).classList.add('cruz');
    await apagar(p);
    const nome = tab.linhas[iM][0];
    p = await nota(c.notas, `O ${menor ? 'menor' : 'maior'} número é ${best}: ${oA(nome)} ${verbo} ${menor ? 'menos' : 'mais'}.`, 'passo');
    await wait(700); await apagar(p);
    await respostaFinal(`<span>${esc(`${verbo} ${menor ? 'menos' : 'mais'}: ${nome} (${best})`)}</span>`);
    const Vb = verbo[0].toUpperCase() + verbo.slice(1);
    for (const r of s.regras || [`${Vb} ${menor ? 'menos' : 'mais'} = o ${menor ? 'menor' : 'maior'} número da coluna.`]) await regra(r);
  }

  // 13-B p.3) total: cada número voa da tabela para a soma
  async function cenaTotal(s) {
    const tab = s.tab, j = Number(s.j ?? 1), vs = valsCol(tab, j), S = somaL(vs);
    ladoLargo();
    const T = tabela(tab);
    const c = cartao();
    c.conta.innerHTML = '<div class="qd-fx qd-soma"></div>';
    await wait(600);
    let p = await nota(c.notas, `${/ao todo/i.test(s.enun || '') ? '"Ao todo"' : '"No total"'} é somar a coluna toda.`, 'passo');
    T.coluna(j);
    const sm = c.conta.querySelector('.qd-soma');
    for (const [i, v] of vs.entries()) {
      if (i) el('span', 'op', '+', sm);
      const alvo = el('span', 'qd-esconde', String(v), sm);
      await voar(T.cel(i, j), alvo, String(v));
    }
    el('span', 'igual', '=', sm); verde(el('span', '', '', sm), S);
    await wait(600); await apagar(p);
    await respostaFinal(`<span>${esc(s.resposta || `total = ${S} ${unid(tab, j)}`.trim())}</span>`);
    for (const r of s.regras || ['Total: soma todos os números da coluna.']) await regra(r);
  }

  // 13-B p.4) "a mais" e "para empatar": o maior menos o menor (detalhe "a mais" / "empatar" embaixo de cada conta)
  async function cenaAMais(s) {
    const tab = s.tab, j = Number(s.j ?? 1), casos = s.casos || [];
    ladoLargo();
    const T = tabela(tab);
    let ult = null;
    for (const [k, cs] of casos.entries()) {
      const [a, b] = [Number(cs.a), Number(cs.b)].sort((x, y) => tab.linhas[y][j] - tab.linhas[x][j]), va = tab.linhas[a][j], vb = tab.linhas[b][j];
      if (k) await poePergunta(cs.enun);
      T.limpa(); T.cel(a, j).classList.add('cruz'); T.cel(b, j).classList.add('cruz');
      const c = cartao();
      const rr = contaQ(c, `${va} − ${vb}`);
      const p = await nota(c.notas, !cs.empate ? '"A mais" é conta de menos: o maior menos o menor.' : k ? 'Para empatar, falta a diferença: é a mesma conta.' : 'Para empatar, falta a diferença: o maior menos o menor.', 'passo');
      await wait(600); verde(rr, va - vb);
      await nota(c.notas, cs.empate ? 'empatar' : 'a mais', 'detalhe');
      await wait(600); await apagar(p);
      if (k < casos.length - 1) await paraHist(c);
      ult = [va, vb];
    }
    if (!ult) return;
    const conta = `${ult[0]} − ${ult[1]} = ${ult[0] - ult[1]}`;
    await respostaFinal(`<span>${esc(casos.length > 1 ? `"a mais" e "empatar": ${conta}` : conta)}</span>`, { perg: casos.length > 1 ? casos.map(cs => cs.enun).join(' ') : '' });
    for (const r of s.regras || ['"A mais" e "para empatar": subtrai.']) await regra(r);
  }

  // 13-B p.5) média da tabela: a pergunta sozinha (espera a leitura), soma a coluna; 20 ÷ ?: conta as linhas na tabela
  async function cenaMediaTab(s) {
    const tab = s.tab, j = Number(s.j ?? 1), vs = valsCol(tab, j), n = vs.length, S = somaL(vs), v = S / n, [un1, unN] = linhasUn(tab);
    ladoLargo();
    const T = tabela(tab);
    const c1 = cartao();
    let rr = contaQ(c1, vs.join(' + '));
    T.coluna(j);
    let p = await nota(c1.notas, `Média: primeiro soma a coluna ${colTxt(tab, j)}.`, 'passo');
    await wait(900); verde(rr, S);
    await wait(600); await apagar(p);
    await paraHist(c1);
    const c2 = cartao();
    c2.conta.innerHTML = `<div class="qd-fx"><span>${S} ÷ <span class="vazio-q qd-qt">?</span></span><span class="igual">=</span><span class="vazio-q qd-rr">?</span></div>`;
    p = await nota(c2.notas, `Depois divide pela quantidade: quantos ${unN === 'frutas' ? 'tipos de fruta' : unN} são?`, 'passo');
    T.limpa();
    for (let i = 0; i < n; i++) { const td = T.cel(i, 0); td.classList.add('marca'); el('span', 'cnt-t qd-pop', String(i + 1), td); await wait(400); }
    verde(c2.conta.querySelector('.qd-qt'), n);
    await wait(500); verde(c2.conta.querySelector('.qd-rr'), nBR(v));
    if (!Number.isInteger(v)) { const q = Math.floor(S / n), r = S % n; await nota(c2.notas, `cabe ${q}, sobra ${r}: vírgula e zero → ${r * 10} ÷ ${n} = ${nBR(r * 10 / n)}`, 'detalhe'); }
    await wait(600); await apagar(p);
    await respostaFinal(`<span>${virgulas(`média = ${nBR(v)} por ${un1}`)}</span>`);
    for (const r of s.regras || ['Média da tabela: total ÷ quantidade de linhas.']) await regra(r);
  }

  // 13-B p.6) fração: a parte em cima, o total embaixo; depois simplifica (as setas miram o número final)
  async function cenaFracTab(s) {
    const tab = s.tab, i = Number(s.i), j = Number(s.j ?? 1), v = Number(tab.linhas[i][j]), S = somaL(valsCol(tab, j)), g = mdc(v, S);
    ladoLargo();
    const T = tabela(tab);
    const c1 = cartao();
    c1.conta.innerHTML = `<div class="qd-fx">${fracH(Qm, Qm)}</div>`;
    const f = c1.conta.querySelector('.qd-fr');
    await wait(600);
    let p = await nota(c1.notas, `Em cima: a parte (${minus(tab.linhas[i][0])}).`, 'passo');
    T.cel(i, j).classList.add('cruz'); await poe(f, 'n', v);
    const p2 = await nota(c1.notas, `Embaixo: o total (${todosOs(unid(tab, j) || 'números')}, ${S}).`, 'passo');
    T.coluna(j); await poe(f, 'd', S);
    await wait(400); await apagar(p, p2);
    if (g > 1) {
      await paraHist(c1);
      const c2 = cartao();
      const F = fx(c2.conta, `${fracH(v, S)}<span class="igual">=</span>${fracH(Qm, Qm)}`), a = F.fr(0), b = F.fr(1);
      p = await nota(c2.notas, `Simplifica: ${v} e ${S} dividem por ${g}.`, 'passo');
      await arcoX(F, parte(a, 'n'), parte(b, 'n'), 'cima', `÷ ${g}`, v / g); await poe(b, 'n', v / g);
      await arcoX(F, parte(a, 'd'), parte(b, 'd'), 'baixo', `÷ ${g}`, S / g); await poe(b, 'd', S / g);
      await wait(500); await apagar(p);
    }
    await respostaFinal(g > 1 ? fxR([v, S], '=', [v / g, S / g]) : fxR([v, S]));
    for (const r of s.regras || ['Fração: a parte em cima, o total embaixo.']) await regra(r);
  }

  // 13-B p.7) porcentagem: a fração; deixa o de baixo 100 (× em cima e embaixo) e o de cima é o %
  async function cenaPctTab(s) {
    const tab = s.tab, i = Number(s.i), j = Number(s.j ?? 1), v = Number(tab.linhas[i][j]), S = somaL(valsCol(tab, j));
    const d0 = 100 % S ? S / mdc(S, 100) : 1;   // 40 embaixo: primeiro ÷ 2 (vira 20), depois × 5
    if (v % d0 || 100 % (S / d0)) return;
    const x = v / d0, y = S / d0, k = 100 / y, pct = x * k;
    ladoLargo();
    const T = tabela(tab);
    const c1 = cartao();
    c1.conta.innerHTML = `<div class="qd-fx">${fracH(v, S)}</div>`;
    T.cel(i, j).classList.add('cruz');
    let p = await nota(c1.notas, `Escreve como fração: ${v} de ${S}.`, 'passo');
    await wait(700); await apagar(p);
    await paraHist(c1);
    if (d0 > 1) {
      const c0 = cartao();
      const F = fx(c0.conta, `${fracH(v, S)}<span class="igual">=</span>${fracH(Qm, Qm)}`), a = F.fr(0), b = F.fr(1);
      p = await nota(c0.notas, `Primeiro simplifica: ${v} e ${S} dividem por ${d0}.`, 'passo');
      await arcoX(F, parte(a, 'd'), parte(b, 'd'), 'baixo', `÷ ${d0}`, y); await poe(b, 'd', y);
      await arcoX(F, parte(a, 'n'), parte(b, 'n'), 'cima', `÷ ${d0}`, x); await poe(b, 'n', x);
      await wait(400); await apagar(p);
      await paraHist(c0);
    }
    const c2 = cartao();
    const F = fx(c2.conta, `${fracH(x, y)}<span class="igual">=</span>${fracH(Qm, Qm)}`), a = F.fr(0), b = F.fr(1);
    p = await nota(c2.notas, 'Porcentagem é "de cada 100": deixa o de baixo 100.', 'passo');
    await wait(400);
    const p2 = await nota(c2.notas, `${y} × ${k} = 100: multiplica embaixo por ${k}…`, 'passo');
    await arcoX(F, parte(a, 'd'), parte(b, 'd'), 'baixo', `× ${k}`, 100); await poe(b, 'd', 100);
    await apagar(p);
    p = await nota(c2.notas, `…e em cima também: ${x} × ${k} = ${pct}.`, 'passo');
    await arcoX(F, parte(a, 'n'), parte(b, 'n'), 'cima', `× ${k}`, pct); await poe(b, 'n', pct);
    await wait(400); await apagar(p, p2);
    p = await nota(c2.notas, `${pct} de cada 100 = ${pct}%.`, 'passo');
    await wait(800); await apagar(p);
    await respostaFinal(fxR([v, S], '=', ...(d0 > 1 ? [[x, y], '='] : []), [pct, 100], `= ${pct}%`));
    for (const r of s.regras || ['Porcentagem: deixa o de baixo 100. O de cima é o %.']) await regra(r);
  }

  // 13-B p.8) qual afirmação é verdadeira: a pergunta sozinha; as opções A, B, C entram uma por vez, cada uma num retângulo,
  //   com a largura toda (sem histórico); conferida: "A ✖" riscada ou "C ✔"; a certa fica na caixa verde
  async function cenaAfirma(s) {
    const frases = s.frases || [];
    if (!frases.length) return;
    ladoLargo();
    const T = tabela(s.tab);
    L.classList.add('sem-hist');
    const c = cartao();
    c.conta.innerHTML = '<div class="qd-afs"></div>';
    const caixa = c.conta.querySelector('.qd-afs'), afs = [];
    for (const [i, f] of frases.entries()) { afs.push(el('div', 'qd-af qd-pop', `<span class="mk">${'ABCDE'[i]}</span><span class="tx">${esc(f[0])}</span>`, caixa)); await ler(f[0]); }
    const p = await nota(c.notas, 'Confere uma por uma na tabela.', 'passo');
    for (const [i, [, cels, conta, ok]] of frases.entries()) {
      T.limpa();
      for (const [r, k] of cels) T.cel(r, k)?.classList.add('cruz');
      afs[i].classList.add('olha');
      const q = await nota(c.notas, conta, 'detalhe');
      await wait(500);
      afs[i].classList.remove('olha');
      afs[i].classList.add(ok ? 'certa' : 'falsa');
      afs[i].querySelector('.mk').textContent = `${'ABCDE'[i]} ${ok ? '✔' : '✖'}`;
      await wait(600); await apagar(q);
    }
    await apagar(p);
    afs[frases.findIndex(f => f[3])]?.classList.add('qd-caixa-ok', 'qd-pop');
    await wait(700);
    for (const r of s.regras || ['Confere cada frase com os números da tabela.']) await regra(r);
  }

  // 13-B p.9) dupla entrada: cruzamento de uma linha com uma coluna, soma de uma coluna, o maior da coluna Total
  //   partes: { t: 'cel', i, j } · { t: 'col', j } · { t: 'maxTotal', j? } · { t: 'difLinha', i, a, b } (todas com enun: a pergunta no alto)
  async function cenaDupla(s) {
    const tab = s.tab, partes = s.partes || [];
    ladoLargo();
    await etiqueta('DUPLA ENTRADA', 'cada número tem uma linha e uma coluna');
    const T = tabela(tab);
    let resp = '';
    for (const [k, pt] of partes.entries()) {
      if (k) { T.limpa(); await poePergunta(pt.enun); }
      const c = cartao();
      let p, rr, det;
      if (pt.t === 'cel') {
        const i = Number(pt.i), j = Number(pt.j), v = tab.linhas[i][j];
        c.conta.innerHTML = '<div class="qd-fx"><span class="vazio-q qd-rr">?</span></div>';
        rr = c.conta.querySelector('.qd-rr');
        p = await nota(c.notas, `Linha ${daLinha(tab.linhas[i][0])}, coluna ${colTxt(tab, j)}.`, 'passo');
        T.linha(i); await wait(600); T.coluna(j); await wait(600);
        T.cel(i, j).classList.add('cruz'); await wait(400);
        verde(rr, v);
        det = `${minus(tab.linhas[i][0])}, ${minus(tab.colunas[j])}`;
        resp = `${v} ${minus(tab.colunas[j])}`;
      } else if (pt.t === 'col') {
        const j = Number(pt.j), vs = valsCol(tab, j), S = somaL(vs);
        rr = contaQ(c, vs.join(' + '));
        p = await nota(c.notas, `Soma a coluna ${colTxt(tab, j)}.`, 'passo');
        T.coluna(j); await wait(800); verde(rr, S);
        det = minus(tab.colunas[j]);
        resp = `${minus(tab.colunas[j])} ao todo: ${S}`;
      } else if (pt.t === 'maxTotal') {
        const j = Number(pt.j ?? tab.colunas.length - 1), vs = valsCol(tab, j), iM = vs.indexOf(Math.max(...vs)), nome = tab.linhas[iM][0];
        c.conta.innerHTML = '<div class="qd-fx"><span class="vazio-q qd-rr">?</span></div>';
        rr = c.conta.querySelector('.qd-rr');
        p = await nota(c.notas, '"Somando" está pronto na coluna Total: procura o maior.', 'passo');
        T.coluna(j); await wait(500);
        for (let i = 0; i < vs.length; i++) { T.cel(i, j).classList.add('marca'); await wait(380); T.cel(i, j).classList.remove('marca'); }
        T.limpa(); T.linha(iM); T.cel(iM, j).classList.add('cruz');
        verde(rr, `${nome} (${vs[iM]})`);
        det = 'mais votado';
        resp = `mais votado: ${nome} (${vs[iM]} votos)`;
      } else if (pt.t === 'difLinha') {
        const i = Number(pt.i), [a, b] = [Number(pt.a), Number(pt.b)].sort((x, y) => tab.linhas[i][y] - tab.linhas[i][x]), va = tab.linhas[i][a], vb = tab.linhas[i][b];
        rr = contaQ(c, `${va} − ${vb}`);
        p = await nota(c.notas, `Linha ${daLinha(tab.linhas[i][0])}: "a mais" é conta de menos.`, 'passo');
        T.linha(i); T.cel(i, a).classList.add('cruz'); T.cel(i, b).classList.add('cruz');
        await wait(600); verde(rr, va - vb);
        det = `${minus(tab.colunas[a])} − ${minus(tab.colunas[b])}`;
        resp = `${va} − ${vb} = ${va - vb}`;
      } else continue;
      if (det) await nota(c.notas, det, 'detalhe');
      await wait(500); await apagar(p);
      if (k < partes.length - 1) await paraHist(c);
    }
    if (!resp) return;
    await respostaFinal(`<span>${esc(s.resposta || resp)}</span>`);
    for (const r of s.regras || ['Cada número é o cruzamento de uma linha com uma coluna.']) await regra(r);
  }

  // ══════════════════ 12: o plano cartesiano (PROMPT-215; protótipos referencia/lousa-12a.html e lousa-12b.html) ══════════════════
  // Fica na lateral larga desde o alto (lado-xl + plano-alto). x sempre laranja, y sempre lilás. Os números do plano: letra mínima.
  const sx = (n) => (n < 0 ? '−' + -n : String(n));
  const ptT = (x, y) => `(${sx(x)}, ${sx(y)})`;
  const ptH = (x, y, id = 'p') => `<span class="qd-pt" data-pt="${id}">(<span class="px">${sx(x)}</span>, <span class="py">${sx(y)}</span>)</span>`;
  const destaca = (id, parte, on = true) => FOCO.querySelector(`[data-pt="${id}"] ${parte === 'x' ? '.px' : '.py'}`)?.classList.toggle('acesa', on);
  // o plano se ajusta aos números: de min(0, menor − 1) até max(6, maior + 1) em cada eixo
  const faixa = (pts) => {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return { x0: Math.min(0, Math.min(...xs) - 1), x1: Math.max(6, Math.max(...xs) + 1), y0: Math.min(0, Math.min(...ys) - 1), y1: Math.max(6, Math.max(...ys) + 1) };
  };
  function plano({ x0 = 0, x1 = 6, y0 = 0, y1 = 6 } = {}) {
    L.classList.add('com-lado', 'lado-xl', 'plano-alto');
    LADO.innerHTML = ''; LADO.style.opacity = '';
    ajustaTopo();
    const box = el('div', 'qd-plano', '', LADO);
    const fs = L.clientWidth * LETRA_MIN / 100;   // os números do plano: letra mínima
    const S = Math.min(LADO.clientWidth, LADO.clientHeight) * .97;
    box.style.width = box.style.height = S + 'px';
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${S} ${S}`); svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%'); box.appendChild(svg);
    // a pergunta mudou de tamanho? o plano acompanha a altura que sobrou (nunca passa da linha pontilhada)
    L.ajustaPlano = () => { const S2 = Math.min(LADO.clientWidth, LADO.clientHeight) * .97; if (S2 > 0) box.style.width = box.style.height = S2 + 'px'; };
    const pad = fs * 2, nx = x1 - x0, ny = y1 - y0, c = Math.min((S - 2 * pad) / nx, (S - 2 * pad) / ny);
    const ox = (S - c * nx) / 2 + fs * .3, oy = (S + c * ny) / 2;
    const X = (v) => ox + (v - x0) * c, Y = (v) => oy - (v - y0) * c;
    const mk = (tag, at, pai = svg) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); pai.appendChild(e); return e; };
    const txt = (x, y, t, cls, anc = 'middle') => { const e = mk('text', { x, y, class: cls, 'text-anchor': anc }); e.textContent = t; e.style.fontSize = fs + 'px'; return e; };
    const g = mk('g', {});
    for (let v = x0; v <= x1; v++) mk('line', { x1: X(v), y1: Y(y0), x2: X(v), y2: Y(y1), class: 'pl-grade' }, g);
    for (let v = y0; v <= y1; v++) mk('line', { x1: X(x0), y1: Y(v), x2: X(x1), y2: Y(v), class: 'pl-grade' }, g);
    const quad = mk('g', {});
    const ex = mk('line', { x1: X(x0) - c * .25, y1: Y(0), x2: X(x1) + c * .5, y2: Y(0), class: 'pl-eixo ex' });
    const ey = mk('line', { x1: X(0), y1: Y(y0) + c * .25, x2: X(0), y2: Y(y1) - c * .5, class: 'pl-eixo ey' });
    const ponta = (x, y, dx, dy) => mk('path', { d: `M${x - dx * c * .22 - dy * c * .14} ${y - dy * c * .22 - dx * c * .14} L${x} ${y} L${x - dx * c * .22 + dy * c * .14} ${y - dy * c * .22 + dx * c * .14}`, class: 'pl-ponta' });
    ponta(X(x1) + c * .5, Y(0), 1, 0); ponta(X(0), Y(y1) - c * .5, 0, -1);
    const lx = {}, ly = {};
    // com negativos o plano fica apertado: só os números pares (a letra continua no tamanho mínimo)
    const mostra = (v) => v && (x0 >= 0 && y0 >= 0 ? true : v % 2 === 0);
    for (let v = x0; v <= x1; v++) if (mostra(v)) lx[v] = txt(X(v), Y(0) + fs * 1.15, sx(v), 'pl-num');
    for (let v = y0; v <= y1; v++) if (mostra(v)) ly[v] = txt(X(0) - fs * .45, Y(v) + fs * .35, sx(v), 'pl-num', 'end');
    // o 0 da origem: só se não encostar no −2 (plano largo, com negativos)
    if (x0 >= 0 || 2 * c > fs * 2) lx[0] = ly[0] = txt(X(0) - fs * .45, Y(0) + fs * 1.15, '0', 'pl-num', 'end');
    const nomeX = txt(X(x1) + c * .5, Y(0) - fs * .5, 'x', 'pl-nome nx', 'end'), nomeY = txt(X(0) + fs * .5, Y(y1) - c * .3, 'y', 'pl-nome ny', 'start');
    const marcas = mk('g', {});
    return {
      eixo(q, on = true) { (q === 'x' ? ex : ey).classList.toggle('on', on); (q === 'x' ? nomeX : nomeY).classList.toggle('on', on); },
      ponto(x, y, { cls = '', rot = true } = {}) {
        const gp = mk('g', { class: 'pl-pt ' + cls }, marcas);
        mk('circle', { cx: X(x), cy: Y(y), r: c * .2 }, gp);
        if (rot) { const t = txt(X(x) + (x < x1 - 1 ? c * .3 : -c * .3), Y(y) - c * .32, ptT(x, y), 'pl-rot', x < x1 - 1 ? 'start' : 'end'); gp.appendChild(t); }
        return gp;
      },
      // anda casa por casa: primeiro para o lado (x), depois para cima/baixo (y); conta as casas (a contagem da subida/descida
      // fica do lado oposto de onde veio)
      //   lado: de que lado veio (o sinal do x andado antes), quando o x e o y são andados em duas vezes
      async anda(xa, ya, dx, dy, { conta = true, cls = '', lado = 0 } = {}) {
        const vx = dx || lado;
        const gp = mk('g', { class: 'pl-anda ' + cls }, marcas);
        const bola = mk('circle', { cx: 0, cy: 0, r: c * .2, class: 'pl-bola' }, gp);
        let x = xa, y = ya;
        bola.style.transform = `translate(${X(x)}px, ${Y(y)}px)`; bola.getBoundingClientRect();
        bola.style.transition = `transform ${T(.3)} ease`;
        for (const [d, eixoX] of [[dx, true], [dy, false]]) {
          const s = Math.sign(d);
          for (let k = 1; k <= Math.abs(d); k++) {
            const nx2 = eixoX ? x + s : x, ny2 = eixoX ? y : y + s;
            mk('line', { x1: X(x), y1: Y(y), x2: X(nx2), y2: Y(ny2), class: 'pl-rastro ' + (eixoX ? 'rx' : 'ry') }, gp);
            if (conta) gp.appendChild(txt(eixoX ? (X(x) + X(nx2)) / 2 : X(x) + (vx < 0 ? -c * .35 : c * .35), eixoX ? Y(y) + (y === 0 || dy < 0 ? -c * .42 : c * .62) : (Y(y) + Y(ny2)) / 2 + fs * .35, String(k), 'pl-cnt ' + (eixoX ? 'rx' : 'ry'), eixoX ? 'middle' : (vx < 0 ? 'end' : 'start')));
            x = nx2; y = ny2;
            bola.style.transform = `translate(${X(x)}px, ${Y(y)}px)`;
            await wait(380);
          }
          if (d) await wait(250);
        }
        return gp;
      },
      // linha tracejada do ponto até o eixo e o número do eixo circulado
      proj(x, y, q) {
        const gp = mk('g', { class: 'pl-proj p' + q }, marcas);
        if (q === 'x') mk('line', { x1: X(x), y1: Y(y), x2: X(x), y2: Y(0) }, gp); else mk('line', { x1: X(x), y1: Y(y), x2: X(0), y2: Y(y) }, gp);
        const lab = q === 'x' ? lx[x] : ly[y];
        if (lab) { const b = lab.getBBox(); mk('rect', { x: b.x - fs * .25, y: b.y - fs * .1, width: b.width + fs * .5, height: b.height + fs * .2, rx: fs * .4, class: 'pl-circ' }, gp); }
        return gp;
      },
      async quadrantes(ordem = [1, 2, 3, 4], ms = 700) {
        const Q4 = { 1: [1, 1, '1º', '(+, +)'], 2: [-1, 1, '2º', '(−, +)'], 3: [-1, -1, '3º', '(−, −)'], 4: [1, -1, '4º', '(+, −)'] };
        const els = {};
        for (const q of ordem) {
          const [qx, qy, nome, sinais] = Q4[q];
          const ax = qx > 0 ? X(0) : X(x0), bx = qx > 0 ? X(x1) : X(0), ay = qy > 0 ? Y(y1) : Y(0), by = qy > 0 ? Y(0) : Y(y0);
          const gq = mk('g', { class: 'pl-quad q' + q }, quad);
          mk('rect', { x: ax, y: ay, width: bx - ax, height: by - ay }, gq);
          const t1 = txt((ax + bx) / 2, (ay + by) / 2 - fs * .2, nome, 'pl-qn'); gq.appendChild(t1); t1.style.fontSize = fs * 1.5 + 'px';
          const t2 = txt((ax + bx) / 2, (ay + by) / 2 + fs * 1.2, sinais, 'pl-qs'); gq.appendChild(t2);
          els[q] = gq; await wait(ms);
        }
        return els;
      },
      limpa() { marcas.innerHTML = ''; [ex, ey, nomeX, nomeY].forEach(e => e.classList.remove('on')); },
    };
  }
  const cartaoPt = (x, y, id = 'p') => { const c = cartao(); c.conta.innerHTML = `<div class="qd-fx">${ptH(x, y, id)}</div>`; return c; };
  const pergXY = (x, y, q) => `No ponto ${ptT(x, y)}, qual é o valor de ${q}?`;
  const quadDe = (x, y) => (x > 0 ? (y > 0 ? 1 : 4) : (y > 0 ? 2 : 3));

  // 12-A p.1) o plano cartesiano: eixo x (laranja), eixo y (lilás), a origem
  async function cenaPlano(s) {
    const P = plano();
    await etiqueta('PLANO CARTESIANO', 'uma reta deitada e uma em pé');
    const c1 = cartao(); c1.conta.innerHTML = '<div class="qd-fx"><span class="qd-cx">eixo x</span></div>';
    let p = await nota(c1.notas, 'A reta deitada é o eixo x: anda para os lados.', 'passo');
    P.eixo('x'); await wait(1300); await apagar(p); P.eixo('x', false);
    await paraHist(c1);
    const c2 = cartao(); c2.conta.innerHTML = '<div class="qd-fx"><span class="qd-cy">eixo y</span></div>';
    p = await nota(c2.notas, 'A reta em pé é o eixo y: sobe e desce.', 'passo');
    P.eixo('y'); await wait(1300); await apagar(p); P.eixo('y', false);
    await paraHist(c2);
    const c3 = cartaoPt(0, 0);
    p = await nota(c3.notas, 'Onde as duas se cruzam é a origem.', 'passo');
    P.ponto(0, 0, { cls: 'ok' }); await wait(1000); await apagar(p);
    await nota(c3.notas, 'origem', 'detalhe');
    await respostaFinal('<span>origem = (0, 0)</span>', { perg: s.perg || 'Onde os dois eixos se cruzam?' });
    for (const r of s.regras || ['Eixo x deitado, eixo y em pé. Eles se cruzam na origem (0, 0).']) await regra(r);
  }

  // anda até o ponto (x, y): primeiro o x (o número acende), depois o y; a contagem das casas
  async function andaAte(P, c, x, y, id = 'p') {
    destaca(id, 'x');
    let p = await nota(c.notas, x === 0 ? 'O 1º número é o x: 0, não anda para o lado.' : `O 1º número é o x: anda ${Math.abs(x)} para a ${x > 0 ? 'direita' : 'esquerda'}.`, 'passo');
    await P.anda(0, 0, x, 0);
    await apagar(p); destaca(id, 'x', false); destaca(id, 'y');
    p = await nota(c.notas, y === 0 ? 'O 2º número é o y: 0, não sobe nem desce.' : `O 2º número é o y: ${y > 0 ? 'sobe' : 'desce'} ${Math.abs(y)}.`, 'passo');
    await P.anda(x, 0, 0, y, { lado: x });
    P.ponto(x, y, { cls: 'ok' });
    await wait(600); await apagar(p); destaca(id, 'y', false);
    const lados = [x ? `${Math.abs(x)} para a ${x > 0 ? 'direita' : 'esquerda'}` : '', y ? `${Math.abs(y)} para ${y > 0 ? 'cima' : 'baixo'}` : ''].filter(Boolean).join(', ');
    if (lados) await nota(c.notas, lados, 'detalhe');
  }
  const setas = (x, y) => [x ? `${Math.abs(x)} ${x > 0 ? '→' : '←'}` : '', y ? `${Math.abs(y)} ${y > 0 ? '↑' : '↓'}` : ''].filter(Boolean).join(' e ');

  // 12-A p.2) o ponto (x, y): anda x para o lado (o x acende), sobe y (o y acende)
  async function cenaPonto(s) {
    const x = Number(s.x), y = Number(s.y), perg = s.perg || `Onde fica o ponto ${ptT(x, y)}?`;
    await poePergunta(perg, false);
    const P = plano(s.plano || faixa([[x, y]]));
    const c = cartaoPt(x, y);
    await ler(perg);
    await andaAte(P, c, x, y);
    await respostaFinal(`<span>${ptT(x, y)}: ${setas(x, y)}</span>`, { perg });
    for (const r of s.regras || ['(x, y): primeiro anda para o lado (x), depois sobe (y).']) await regra(r);
  }

  // 12-A p.3) o valor de x e de y: a linha tracejada até o eixo e o número circulado (q: 'x', 'y' ou 'xy' = os dois)
  async function cenaValor(s) {
    const x = Number(s.x), y = Number(s.y), qs = s.q === 'x' || s.q === 'y' ? [s.q] : ['x', 'y'];
    const pergs = qs.map((q, k) => (k ? `E o valor de ${q}?` : (s.perg || pergXY(x, y, q))));
    await poePergunta(pergs[0], false);
    const P = plano(s.plano || faixa([[x, y]]));
    P.ponto(x, y);
    let c;
    for (const [k, q] of qs.entries()) {
      if (k) { await paraHist(c); await poePergunta(pergs[k], false); }
      c = cartaoPt(x, y, 'p' + k);
      await ler(pergs[k]);
      const p = await nota(c.notas, `O ${q} é o ${q === 'x' ? '1º' : '2º'} número${(q === 'x' ? x : y) < 0 ? ', com o sinal' : ''}.`, 'passo');
      destaca('p' + k, q); P.proj(x, y, q);
      await wait(900); await apagar(p);
      await nota(c.notas, `${q} = ${sx(q === 'x' ? x : y)}`, 'detalhe');
    }
    const resp = qs.map(q => `${q} = ${sx(q === 'x' ? x : y)}`);
    await respostaFinal(resp.length > 1 ? resp.map(t => `<span class="l2">${t}</span>`).join('') : `<span>${resp[0]}</span>`,
      { perg: qs.length > 1 ? `No ponto ${ptT(x, y)}, qual é o x? E o y?` : pergs[0] });
    for (const r of s.regras || ['(x, y): o x é o primeiro número, o y é o segundo.']) await regra(r);
  }

  // 12-A p.4) a ordem importa: primeiro o certo; depois a pegadinha (trocado, em vermelho ✖) e o certo embaixo ✔
  async function cenaOrdem(s) {
    const x = Number(s.x), y = Number(s.y), perg = s.perg || `Qual ponto tem x = ${sx(x)} e y = ${sx(y)}?`;
    await poePergunta(perg, false);
    const P = plano(s.plano || faixa([[x, y], [y, x]]));
    const c1 = cartaoPt(x, y);
    await ler(perg);
    let p = await nota(c1.notas, 'O x vai na frente, o y depois.', 'passo');
    await P.anda(0, 0, x, y, { conta: false });
    P.ponto(x, y, { cls: 'ok' });
    await wait(600); await apagar(p);
    await nota(c1.notas, `x = ${sx(x)}, y = ${sx(y)}`, 'detalhe');
    await paraHist(c1);
    const c2 = cartao(); c2.conta.innerHTML = `<div class="qd-fx qd-errado"><span class="qd-x"><span>${ptT(y, x)}</span></span></div>`;
    await nota(c2.notas, 'Pegadinha: trocar a ordem leva para outro lugar!', 'passo');
    P.ponto(y, x, { cls: 'err' });
    await wait(900);
    await certoEmbaixo(c2, `<span>${ptT(x, y)}</span>`);
    await respostaFinal(`<span>${ptT(x, y)}</span>`, { perg });
    for (const r of s.regras || [`${ptT(x, y)} e ${ptT(y, x)} são pontos diferentes: a ordem importa.`]) await regra(r);
  }

  // 12-A p.5) pontos nos eixos: y = 0 → eixo x; x = 0 → eixo y
  async function cenaEixos(s) {
    const pts = (s.pts || []).map(p => p.map(Number));
    if (!pts.length) return;
    const P = plano(s.plano || faixa(pts));
    let c, ant = null;
    for (const [k, [x, y]] of pts.entries()) {
      const perg = k ? `E o ponto ${ptT(x, y)}?` : (s.perg || `O ponto ${ptT(x, y)} fica sobre qual eixo?`);
      if (k) { await paraHist(c); P.eixo(ant, false); }
      await poePergunta(perg, false);
      c = cartaoPt(x, y, 'p' + k);
      await ler(perg);
      const eX = y === 0, d = Math.sign(x || y);
      destaca('p' + k, eX ? 'y' : 'x');
      const p = await nota(c.notas, eX ? 'y = 0: não sobe nada.' : `x = 0: não anda para o lado, só ${d > 0 ? 'sobe' : 'desce'}.`, 'passo');
      await P.anda(0, 0, x, y, { conta: false }); P.ponto(x, y, { cls: 'ok' }); P.eixo(eX ? 'x' : 'y');
      await wait(700); await apagar(p); destaca('p' + k, eX ? 'y' : 'x', false);
      await nota(c.notas, `fica no eixo ${eX ? 'x' : 'y'}`, 'detalhe');
      ant = eX ? 'x' : 'y';
    }
    const resp = pts.map(([x, y]) => `${ptT(x, y)} → eixo ${y === 0 ? 'x' : 'y'}`);
    await respostaFinal(resp.length > 1 ? resp.map(t => `<span class="l2">${t}</span>`).join('') : `<span>${resp[0]}</span>`,
      { perg: resp.length > 1 ? 'Sobre qual eixo fica cada ponto?' : (s.perg || `O ponto ${ptT(...pts[0])} fica sobre qual eixo?`) });
    for (const r of s.regras || ['y = 0: fica no eixo x. x = 0: fica no eixo y.']) await regra(r);
  }

  // 12-A p.6) mais à direita (o maior x), mais acima (o maior y); q: 'x', 'y' ou 'xy'
  async function cenaMaisLado(s) {
    const a = s.a.map(Number), b = s.b.map(Number), qs = s.q === 'x' || s.q === 'y' ? [s.q] : ['x', 'y'];
    const nome = (q) => (q === 'x' ? 'mais à direita' : 'mais acima');
    const pergs = qs.map((q, k) => (k ? `E qual fica ${nome(q)}?` : (s.perg || `Qual ponto fica ${nome(q)}: ${ptT(...a)} ou ${ptT(...b)}?`)));
    await poePergunta(pergs[0], false);
    const P = plano(s.plano || faixa([a, b]));
    P.ponto(...a); P.ponto(...b);
    let c, projs = [];
    const resp = [];
    for (const [k, q] of qs.entries()) {
      const i = q === 'x' ? 0 : 1, g = a[i] >= b[i] ? a : b, m = g === a ? b : a;
      if (k) { await paraHist(c); projs.forEach(e => e.remove()); await poePergunta(pergs[k], false); }
      c = cartao(); c.conta.innerHTML = `<div class="qd-fx">${ptH(...a, 'a' + k)}<span class="qd-sep2">e</span>${ptH(...b, 'b' + k)}</div>`;
      await ler(pergs[k]);
      const p = await nota(c.notas, `${nome(q)[0].toUpperCase()}${nome(q).slice(1)} = o maior ${q}.`, 'passo');
      destaca('a' + k, q); destaca('b' + k, q); projs = [P.proj(...a, q), P.proj(...b, q)];
      await wait(1100); await apagar(p);
      await nota(c.notas, `${sx(g[i])} > ${sx(m[i])}: ${ptT(...g)} ${nome(q)}`, 'detalhe');
      resp.push(`${ptT(...g)} → ${nome(q)}`);
    }
    await respostaFinal(resp.length > 1 ? resp.map(t => `<span class="l2">${t}</span>`).join('') : `<span>${resp[0]}</span>`,
      { perg: qs.length > 1 ? `${ptT(...a)} ou ${ptT(...b)}: qual fica mais à direita? E mais acima?` : pergs[0] });
    for (const r of s.regras || ['Mais à direita: o maior x. Mais acima: o maior y.']) await regra(r);
  }

  // 12-A p.7) negativos: anda até um ponto com negativo; depois o valor de x (ou y), com o sinal
  async function cenaNegativos(s) {
    const pa = s.anda?.map(Number), pv = s.valor ? [Number(s.valor[0]), Number(s.valor[1])] : null, qv = s.valor?.[2] || 'x';
    const P = plano(s.plano || faixa([pa, pv].filter(Boolean)));
    let c = null;
    if (pa) {
      const perg = `Onde fica o ponto ${ptT(...pa)}?`;
      await poePergunta(perg, false);
      c = cartaoPt(...pa);
      await ler(perg);
      destaca('p', 'x');
      let p = await nota(c.notas, pa[0] < 0 ? 'x negativo: anda para a esquerda.' : pa[0] > 0 ? 'x positivo: anda para a direita.' : 'x = 0: não anda para o lado.', 'passo');
      await P.anda(0, 0, pa[0], 0);
      await apagar(p); destaca('p', 'x', false); destaca('p', 'y');
      p = await nota(c.notas, pa[1] < 0 ? 'y negativo: desce.' : pa[1] > 0 ? 'y positivo: sobe.' : 'y = 0: não sobe nem desce.', 'passo');
      await P.anda(pa[0], 0, 0, pa[1], { lado: pa[0] });
      P.ponto(...pa, { cls: 'ok' });
      await wait(600); await apagar(p); destaca('p', 'y', false);
      if (pa[0] || pa[1]) await nota(c.notas, dirTxt(...pa).replace(' e ', ', '), 'detalhe');
    }
    if (pv) {
      if (c) await paraHist(c);
      const perg = s.perg && !pa ? s.perg : pergXY(...pv, qv), v = qv === 'x' ? pv[0] : pv[1];
      await poePergunta(perg, false);
      if (!pa || pa[0] !== pv[0] || pa[1] !== pv[1]) P.ponto(...pv);
      c = cartaoPt(...pv, 'q');
      await ler(perg);
      const p = await nota(c.notas, `O ${qv} é o ${qv === 'x' ? '1º' : '2º'} número, com o sinal.`, 'passo');
      destaca('q', qv); P.proj(...pv, qv);
      await wait(900); await apagar(p);
      await nota(c.notas, `${qv} = ${sx(v)}${v < 0 ? ' (o sinal faz parte)' : ''}`, 'detalhe');
      await respostaFinal(`<span>${qv} = ${sx(v)}</span>`, { perg });
    } else if (pa) await respostaFinal(`<span>${ptT(...pa)}: ${setas(...pa)}</span>`, { perg: `Onde fica o ponto ${ptT(...pa)}?` });
    for (const r of s.regras || ['Negativo: o x anda para a esquerda e o y desce.']) await regra(r);
  }

  // 12-A p.8) quadrantes: os 4 pedaços, um por vez; depois em qual fica o ponto
  async function cenaQuadrantes(s) {
    const [x, y] = (s.p || [-3, -4]).map(Number), qd = quadDe(x, y), nomeQ = `${qd}º`;
    // os 4 quadrantes aparecem: de −4 a 4, ou maior se o ponto pedir (uma casa a mais que ele)
    const P = plano(s.plano || { x0: Math.min(-4, x - 1), x1: Math.max(4, x + 1), y0: Math.min(-4, y - 1), y1: Math.max(4, y + 1) });
    await etiqueta('QUADRANTES', 'os 4 pedaços do plano');
    const c1 = cartao(); c1.conta.innerHTML = '<div class="qd-xpr"></div>';
    let p = await nota(c1.notas, 'Começa em cima, à direita, e gira para a esquerda.', 'passo');
    const ex = c1.conta.querySelector('.qd-xpr');
    const linhas = ['1º (+, +)', '2º (−, +)', '3º (−, −)', '4º (+, −)'], Q = {};
    for (const [i, q] of [1, 2, 3, 4].entries()) { Object.assign(Q, await P.quadrantes([q], 200)); el('div', 'xl qd-pop', `<span>${linhas[i]}</span>`, ex); await wait(700); }
    await apagar(p);
    await paraHist(c1);
    const perg = s.perg || `Em qual quadrante fica o ponto ${ptT(x, y)}?`;
    await poePergunta(perg, false);
    const c2 = cartaoPt(x, y);
    await ler(perg);
    p = await nota(c2.notas, `x ${x < 0 ? 'negativo: esquerda' : 'positivo: direita'}. y ${y < 0 ? 'negativo: baixo' : 'positivo: cima'}.`, 'passo');
    await P.anda(0, 0, x, y, { conta: false });
    P.ponto(x, y, { cls: 'ok' });
    Object.entries(Q).forEach(([q, g]) => g.classList.toggle('apaga-q', Number(q) !== qd));
    await wait(700); await apagar(p);
    await nota(c2.notas, `(${x < 0 ? '−' : '+'}, ${y < 0 ? '−' : '+'}) → ${nomeQ}`, 'detalhe');
    await respostaFinal(`<span>${ptT(x, y)} → ${nomeQ} quadrante</span>`, { perg });
    for (const r of s.regras || ['1º (+, +) · 2º (−, +) · 3º (−, −) · 4º (+, −)']) await regra(r);
  }

  // 12-B: andar no plano. casos: [{ de: [x, y], dx, dy }]; troca: depois do certo, a pegadinha com x e y trocados
  const dirTxt = (dx, dy) => [dx > 0 ? `${dx} para a direita` : dx < 0 ? `${-dx} para a esquerda` : '', dy > 0 ? `${dy} para cima` : dy < 0 ? `${-dy} para baixo` : ''].filter(Boolean).join(' e ');
  const pergAndar = (de, dx, dy) => `${de[0] === 0 && de[1] === 0 ? 'Saindo da origem' : `Saindo de ${ptT(...de)}`}, ando ${dirTxt(dx, dy)}. Onde paro?`;
  // as duas contas, uma por linha: x: 2 + 4 = 6 / y: 3 + 1 = 4
  async function contasXY(c, x0, dx, y0, dy, notaX, notaY, P) {
    const ex = el('div', 'qd-xpr', '', c.conta);
    const conta = (a, d) => (d === 0 ? `${sx(a)}` : `${sx(a)} ${d > 0 ? '+' : '−'} ${Math.abs(d)} = ${sx(a + d)}`);
    let p = await nota(c.notas, notaX, 'passo');
    await P.anda(x0, y0, dx, 0);
    el('div', 'xl qd-pop', `<b class="qd-cx">x:</b><span>${conta(x0, dx)}</span>`, ex);
    await wait(700); await apagar(p);
    p = await nota(c.notas, notaY, 'passo');
    await P.anda(x0 + dx, y0, 0, dy, { lado: dx });
    el('div', 'xl qd-pop', `<b class="qd-cy">y:</b><span>${conta(y0, dy)}</span>`, ex);
    await wait(700); await apagar(p);
    P.ponto(x0 + dx, y0 + dy, { cls: 'ok' });
    await wait(500);
  }
  async function cenaAndar(s) {
    const casos = (s.casos || []).map(k => ({ de: k.de.map(Number), dx: Number(k.dx) || 0, dy: Number(k.dy) || 0 }));
    if (!casos.length) return;
    const fim = (k) => [k.de[0] + k.dx, k.de[1] + k.dy];
    const pts = casos.flatMap(k => [k.de, fim(k), ...(s.troca ? [[k.de[0] + k.dy, k.de[1] + k.dx]] : [])]);
    const P = plano(s.plano || faixa(pts));
    if (s.etq) await etiqueta('ANDAR NO PLANO', 'direita e cima somam, esquerda e baixo tiram');
    let c = null;
    const resp = [];
    for (const [i, k] of casos.entries()) {
      const { de, dx, dy } = k, [x, y] = fim(k), perg = (i === 0 && s.perg) || pergAndar(de, dx, dy);
      if (i) { await paraHist(c); P.limpa(); }
      await poePergunta(perg, false);
      P.ponto(...de, { rot: !(de[0] === 0 && de[1] === 0) });
      c = cartao();
      await ler(perg);
      const passa = (a, d) => (a >= 0 && a + d < 0) || (a <= 0 && a + d > 0 && a !== 0);
      const nX = dx === 0 ? `Não andou para o lado: o x fica ${sx(de[0])}.` : s.troca ? `${dx > 0 ? 'Direita' : 'Esquerda'} mexe no x.` : `${dx > 0 ? 'Direita: soma no x.' : 'Esquerda: tira do x.'}${passa(de[0], dx) ? ' Passa do 0!' : ''}`;
      const nY = dy === 0 ? `Não subiu nem desceu: o y fica ${sx(de[1])}.` : s.troca ? `${dy > 0 ? 'Cima' : 'Baixo'} mexe no y.` : `${dy > 0 ? 'Cima: soma no y.' : 'Baixo: tira do y.'}${passa(de[1], dy) ? ' Passa do 0!' : ''}`;
      await contasXY(c, de[0], dx, de[1], dy, nX, nY, P);
      if ((casos.length > 1 && i < casos.length - 1) || s.troca) await nota(c.notas, `paro em ${ptT(x, y)}`, 'detalhe');
      if (passa(de[0], dx) || passa(de[1], dy)) { if (casos.length > 1 && i > 0) await nota(c.notas, 'passou do 0: fica negativo', 'detalhe'); }
      resp.push(`paro em ${ptT(x, y)}`);
    }
    if (s.troca) {
      const { de, dx, dy } = casos[0], [x, y] = fim(casos[0]), xt = de[0] + dy, yt = de[1] + dx;
      await paraHist(c);
      const c2 = cartao(); c2.conta.innerHTML = `<div class="qd-fx qd-errado"><span class="qd-x"><span>${ptT(xt, yt)}</span></span></div>`;
      const trTxt = [dy ? `${dy > 0 ? 'andar' : 'voltar'} ${Math.abs(dy)} para o lado` : '', dx ? `${dx > 0 ? 'subir' : 'descer'} ${Math.abs(dx)}` : ''].filter(Boolean).reverse().join(' e ');
      await nota(c2.notas, `Pegadinha: ${trTxt} dá outro lugar!`, 'passo');
      await P.anda(de[0], de[1], dy, dx, { conta: false, cls: 'err' });
      P.ponto(xt, yt, { cls: 'err' });
      await wait(700);
      await certoEmbaixo(c2, `<span>${ptT(x, y)}</span>`);
    }
    const perg1 = (s.perg) || pergAndar(casos[0].de, casos[0].dx, casos[0].dy);
    await respostaFinal(resp.length > 1 ? resp.map(t => `<span class="l2">${t}</span>`).join('') : `<span>${resp[0]}</span>`,
      { perg: resp.length > 1 ? 'Onde paro em cada caminho?' : perg1 });
    const temNeg = pts.some(([a, b]) => a < 0 || b < 0), tira = casos.some(k => k.dx < 0 || k.dy < 0), origem = casos.every(k => !k.de[0] && !k.de[1]);
    const padrao = s.troca ? 'Direita e esquerda mexem no x. Cima e baixo mexem no y.' : temNeg ? 'Passou do zero? O número fica negativo.'
      : tira ? 'Esquerda tira do x. Baixo tira do y.' : origem ? 'Saindo da origem: o quanto anda para o lado é o x; o quanto sobe é o y.' : 'Direita soma no x. Cima soma no y.';
    for (const r of s.regras || [padrao]) await regra(r);
  }

  // 12-B p.6) o caminho de um ponto a outro: compara os x (para os lados), depois os y (conta as casas)
  async function cenaCaminho(s) {
    const de = s.de.map(Number), ate = s.ate.map(Number), dx = ate[0] - de[0], dy = ate[1] - de[1];
    const perg = s.perg || `Para ir de ${ptT(...de)} até ${ptT(...ate)}, ando:`;
    await poePergunta(perg, false);
    const P = plano(s.plano || faixa([de, ate]));
    P.ponto(...de); P.ponto(...ate);
    const c = cartao(); c.conta.innerHTML = `<div class="qd-fx">${ptH(...de, 'a')}<span class="igual">→</span>${ptH(...ate, 'b')}</div>`;
    const ex = el('div', 'qd-xpr', '', c.conta);
    await ler(perg);
    for (const [q, d, a, b] of [['x', dx, de[0], ate[0]], ['y', dy, de[1], ate[1]]]) {
      destaca('a', q); destaca('b', q);
      const txtN = q === 'x' ? (d ? `No x (para os lados): vai de ${sx(a)} até ${sx(b)}.` : `No x: fica ${sx(a)}. Não anda para o lado.`)
        : (d ? `No y (para cima e para baixo): vai de ${sx(a)} até ${sx(b)}. Conta as casas.` : `No y: fica ${sx(a)}. Não sobe nem desce.`);
      const p = await nota(c.notas, txtN, 'passo');
      if (d) await P.anda(q === 'x' ? de[0] : ate[0], de[1], q === 'x' ? d : 0, q === 'y' ? d : 0, { lado: dx });
      el('div', 'xl qd-pop', `<b class="qd-c${q}">${q}:</b><span>${sx(a)} → ${sx(b)}</span>`, ex);
      await nota(c.notas, d ? dirTxt(q === 'x' ? d : 0, q === 'y' ? d : 0) : (q === 'x' ? 'nem direita nem esquerda' : 'nem cima nem baixo'), 'detalhe');
      await wait(700); await apagar(p); destaca('a', q, false); destaca('b', q, false);
    }
    await respostaFinal(`<span>${dirTxt(dx, dy)}</span>`, { perg });
    for (const r of s.regras || ['Caminho: compara os x (para os lados) e depois os y (para cima ou baixo).']) await regra(r);
  }

  // ── PROMPT-214: a pergunta de cada página (fica no alto da lousa). No cartão do erro vem a da questão (s.perg) ──
  const fracT = (n, d) => `${n}/${d}`;
  const eTxt = (l) => (l.length < 2 ? l.join('') : `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}`);
  function perguntaDe(s) {
    if (s.perg) return s.perg;
    if (s.enun && /\?\s*$/.test(s.enun)) return s.enun;
    const op = (o) => (o === '-' ? '−' : o);
    switch (s.t) {
      case 'armada': return `Quanto é ${String(s.a).trim()} ${op(s.op)} ${String(s.b).trim()}?`;
      case 'mult': return `Quanto é ${s.a} × ${s.b}?`;
      case 'compara': return `Qual é maior: ${s.v[0]} ou ${s.v[1]}?`;
      case 'fracdec': return `Quanto é ${fracT(s.p, s.d)} em número decimal?`;
      case 'divk': return `Quanto é ${fracT(s.p, s.k)} em número decimal?`;
      case 'decfrac': return `Como escrever ${eTxt(s.v)} em fração?`;
      case 'fracao': return s.pizza ? 'Que fração da pizza eu comi?' : 'Que fração do chocolate eu peguei?';
      case 'equiv': return `Que fração é igual a ${fracT(s.a, s.b)}, com ${s.b * s.k} embaixo?`;
      case 'simplif': return `Como fica ${fracT(s.n, s.d)} simplificada?`;
      case 'mesmoden': return `Quanto é ${fracT(s.a, s.d)} ${op(s.op)} ${fracT(s.b, s.d)}?`;
      case 'compunit': return `Qual é maior: ${fracT(1, s.a)} ou ${fracT(1, s.b)}?`;
      case 'dendif': return `Quanto é ${fracT(s.p, s.a)} + ${fracT(s.r, s.b)}?`;
      case 'multfr': return `Quanto é ${fracT(s.a, s.b)} × ${fracT(s.c, s.d)}?`;
      case 'partede': return `Quanto é ${fracT(s.p, s.q)} de ${s.N}?`;
      case 'divfr': return `Quanto é ${fracT(s.a, s.b)} ÷ ${fracT(s.c, s.d)}?`;
      case 'potencia': return `O que quer dizer ${s.b}${sup(s.n)}?`;
      case 'quadrado': return `Quanto é ${s.b}²?`;
      case 'cadeia': return `Quanto é ${s.b}${sup(s.n)}?`;
      case 'virapot': return `Como escrever ${vezesTxt(s.b, Number(s.n))} como potência?`;
      case 'dez': return `Quanto é 10${sup(s.n)}?${s.n2 ? ` E 10${sup(s.n2)}?` : ''}`;
      case 'umzero': { const cs = s.casos || [[7, 1], [7, 0], [1, 5]]; return cs.map(([b, n], i) => `${i ? 'E' : 'Quanto é'} ${b}${sup(n)}?`).join(' '); }
      case 'naconta': return `Quanto é ${s.a}${sup(s.n)} ${s.op === '-' || s.op === '−' ? '−' : '+'} ${s.b}${sup(s.m)}?`;
      case 'media': case 'mediaprob': return `Qual é a média de ${eFinal(s.l.map(Number))}?`;
      case 'notafalta': { const k = Number(s.k) || s.notas.length + 1; return `Média ${nBR(s.m)} em ${k} provas. Notas: ${eFinal(s.notas.map(Number))}. Qual é a ${ORD_F[k] || `${k}ª`} nota?`; }
      case 'moda': return `Qual é a moda de ${eFinal((s.listas?.[0] || s.l).map(Number))}?`;
      case 'mediana': return `Qual é a mediana de ${eFinal(s.l.map(Number))}?`;
      case 'medcomp': return `Qual é a diferença entre a média e a mediana de ${eFinal(s.l.map(Number))}?`;
      case 'amais': return s.casos?.[0]?.enun || '';
      case 'dupla': return s.partes?.[0]?.enun || '';
      case 'afirma': return s.enun || 'Qual afirmação é verdadeira?';
      default: return s.enun || '';
    }
  }
  // as páginas que começam com a etiqueta do conceito: a pergunta entra depois dela (etiqueta → pend)
  const comecaComEtq = (c) => ['equiv', 'simplif', 'potencia', 'quadrado', 'dez', 'moda', 'mediana', 'ler', 'dupla', 'media', 'mediaprob'].includes(c.t) || (c.t === 'cadeia' && Number(c.n) === 3);

  const CENAS = { armada: cenaArmada, mult: cenaMult, compara: cenaCompara, fracdec: cenaFracDec, divk: cenaDivK, decfrac: cenaDecFrac,
    fracao: cenaFracao, equiv: cenaEquiv, simplif: cenaSimplif, mesmoden: cenaMesmoDen, compunit: cenaCompUnit, dendif: cenaDenDif,
    multfr: cenaMultFr, partede: cenaParteDe, divfr: cenaDivFr,
    potencia: cenaPotencia, quadrado: cenaQuadrado, cadeia: cenaCadeia, virapot: cenaViraPot, dez: cenaDez, umzero: cenaUmZero, naconta: cenaNaConta,
    media: cenaMedia, mediaprob: cenaMedia, notafalta: cenaNotaFalta, moda: cenaModa, mediana: cenaMediana, medcomp: cenaMedComp,
    ler: cenaLer, maior: cenaMaior, total: cenaTotal, amais: cenaAMais, mediatab: cenaMediaTab, fractab: cenaFracTab, pcttab: cenaPctTab,
    afirma: cenaAfirma, dupla: cenaDupla,
    plano: cenaPlano, ponto: cenaPonto, valor: cenaValor, ordem: cenaOrdem, eixos: cenaEixos, maislado: cenaMaisLado, negativos: cenaNegativos,
    quadrantes: cenaQuadrantes, andar: cenaAndar, caminho: cenaCaminho };
  // PROMPT-215: as páginas do plano põem a pergunta elas mesmas (primeiro a pergunta, depois o plano, depois a pausa de leitura)
  const PERG_PROPRIA = new Set(['plano', 'ponto', 'valor', 'ordem', 'eixos', 'maislado', 'negativos', 'quadrantes', 'andar', 'caminho']);

  function limpar() {
    token++;
    pausado = false;
    pergPend = '';
    L.querySelectorAll('.qd-voa').forEach(e => e.remove());
    HIST.innerHTML = ''; FOCO.innerHTML = ''; LADO.innerHTML = ''; LADO.style.opacity = ''; REGRAS.innerHTML = '';
    RESP.classList.remove('on'); RESP.innerHTML = '';
    PERG.innerHTML = ''; PERG.dataset.txt = ''; PERG.style.top = ''; PERG.style.opacity = '';
    [FOCO, LADO].forEach(e => { e.style.top = ''; });
    L.classList.remove('com-lado', 'lado-largo', 'lado-xl', 'com-etq', 'sem-hist', 'plano-alto');
    L.ajustaPlano = null;
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
      for (const c of cenas || []) {
        if (!CENAS[c.t]) continue;
        pergPend = PERG_PROPRIA.has(c.t) ? '' : perguntaDe(c) || '';
        if (!comecaComEtq(c)) await pend();   // pergunta nova: espera o aluno ler antes da primeira anotação
        await CENAS[c.t](c);
        pergPend = '';
      }
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

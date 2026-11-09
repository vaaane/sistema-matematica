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
  // PROMPT-216: as medidas da pergunta sublinhadas em amarelo (3 cm, 12 m², 50°); {A:…} e {B:…}: o que se compara (laranja e lilás)
  const pergHtml = (fr) => esc(fr)
    .replace(/(\d+(?:,\d+)?)(?: (cm²|m²|cm|mm|km|m)|(°))(?![a-zà-ú²])/g, (m, n, u, g) => `<u class="qd-med">${n}${g ? '' : ' '}${u || g}</u>`)   // PROMPT-220: unidade com espaço (9m é termo, não metro)
    .replace(/\{([AB]):([^{}]+)\}/g, (m, k, t) => `<span class="qd-cmp${k}">${t}</span>`)
    .replace(/(\d),(\d)/g, '$1<span class="qd-v">,</span>$2');
  const ler = (txt) => wait(1800 + 160 * String(txt).replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length);
  async function poePergunta(txt, espera = true) {
    txt = String(txt || '').trim();
    if (!txt || PERG.dataset.txt === txt) { ajustaTopo(); return; }
    if (PERG.textContent.trim()) { PERG.style.opacity = 0; await wait(300); }
    PERG.dataset.txt = txt;
    const semQuebra = txt.replace(/ (?=[=+−×÷]|\d)|(?<=[=+−×÷]) /g, '\u00a0');   // PROMPT-219: a equação da pergunta não quebra no meio
    PERG.innerHTML = semQuebra.split(/(?<=[.?!])\s+|\s*\|\s*/).filter(Boolean).map(fr => `<div>${pergHtml(fr)}</div>`).join('');
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
  // PROMPT-216: caber() na hora (antes da pintura), não no requestAnimationFrame: a conta nasce no tamanho certo
  new MutationObserver(() => caber()).observe(FOCO, { childList: true, subtree: true, characterData: true });

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
    html = String(html).replace(/(\d) (?=(?:cm|mm|km|m)²?(?![a-zà-ú])|°)/g, '$1 ');   // PROMPT-216: número e unidade juntos (14 cm, 12 m², 70°)
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
    let M = mapa(), f = fluxo(card, M), h = card.offsetHeight;
    let w = Math.max(card.offsetWidth, ...[...card.querySelectorAll(":scope > .qd-conta > *")].map(e => e.offsetWidth),
      ...[...card.querySelectorAll(".qd-eqv > .ln")].map(e => e.offsetWidth));   // PROMPT-220: a linha da conta pode passar da caixa (não quebra)
    const gap = parseFloat(getComputedStyle(HIST).rowGap) || 0;
    const min = L.clientWidth * LETRA_MIN / 100;
    const fonte = parseFloat(getComputedStyle(card).fontSize) * .75;   // a menor letra da conta (listas, frações e o certo embaixo ficam ~75%)
    const K = Math.min(1, Math.max(min / fonte, Math.min(.5, (HIST.clientWidth - 4) / Math.max(w, 1))));
    // PROMPT-216: a conta não cabe na largura do histórico com a letra mínima? quebra em linhas (nunca fica cortada)
    let s0 = 1;   // PROMPT-221: a escala do 1º quadro do voo
    if (w * K > HIST.clientWidth - 4) {
      const h0 = h;
      card.style.width = (HIST.clientWidth - 4) / K + 'px'; card.classList.add('quebra-h');
      w = card.offsetWidth; h = card.offsetHeight; M = mapa();
      // quebrada, a conta fica mais alta: o voo sai do lugar e da altura de antes (senão, no 1º quadro, passa da linha tracejada)
      s0 = Math.min(1, Math.max(K, h0 / Math.max(h, 1)));   // nunca menor que a escala do histórico (a letra fica no mínimo)
    }
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
    card.querySelectorAll('.qd-pop').forEach((e) => e.classList.remove('qd-pop'));   // mudar de lugar no DOM recomeça a animação: o pulo não repete no histórico
    slot.insertBefore(card, slot.firstChild);
    card.style.setProperty("--hk", K);   // as letras miúdas (expoente, empréstimo…) crescem para ficar no mínimo depois da escala
    card.classList.add('mini');
    card.style.transition = 'none';
    card.style.transform = `scale(${K})`;
    if (hn) hn.style.opacity = 0;
    const l = fluxo(card, M);
    card.style.transform = `translate(${f.left - l.left}px, ${f.top - l.top}px) scale(${s0})`;
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

  // ══════════════════ 9: equações (PROMPT-219; protótipos referencia/lousa-9a.html e lousa-9b.html) ══════════════════
  // As cenas recebem os números (a aula usa os do protótipo; o cartão do erro, os da questão). A balança fica na lateral larga.
  const virgH = (h) => String(h).replace(/(\d),(\d)/g, '$1<span class="qd-v">,</span>$2');   // como virgulas(), mas o html já vem montado (os <span> da conta)
  const sN = (v) => (v < 0 ? '−' + -v : String(v));
  const TQ = (s) => `<span class="t">${s}</span>`;
  const cxo = (k) => (k === 1 ? '' : String(k));   // 1x vira x
  const nota2 = async (c, txt, ms = 1600) => { const p = await nota(c.notas, txt, 'passo'); await wait(ms); return p; };
  const ladoSvg = () => figura();
  // ── a balança: lado esquerdo = lado direito ──
  // estado de cada lado: { x: caixas, b: pesos de 1, h: pesos que faltam (o "menos"), meio: k (x ÷ k, um pedaço da caixa), partes: [t, k] (pesos separados) }
  // marcas: { sai: { e: {b, x, h, meio}, d: {...} }, entra: {...}, grupos: n (os pesos da direita em n grupos, um por caixa) }
  // Mais de 24 quadradinhos num prato: um peso só, com o número escrito (nos grupos, um peso por caixa e o valor dentro da caixa).
  function balanca(legenda = 'cada quadradinho = 1') {
    const F = ladoSvg(), S = F.S;
    const yT = .3 * S, yP = .7 * S, cxs = { e: .27 * S, d: .73 * S };
    const fixo = F.mk('g', {});
    F.mk('path', { d: `M${.5 * S} ${yT} L${.43 * S} ${.9 * S} L${.57 * S} ${.9 * S} Z`, class: 'bl-pe' }, fixo);
    F.mk('line', { x1: .08 * S, y1: yT, x2: .92 * S, y2: yT, class: 'bl-trave' }, fixo);
    for (const c of Object.values(cxs)) { F.mk('line', { x1: c, y1: yT, x2: c - .17 * S, y2: yP, class: 'bl-fio' }, fixo); F.mk('line', { x1: c, y1: yT, x2: c + .17 * S, y2: yP, class: 'bl-fio' }, fixo); F.mk('line', { x1: c - .2 * S, y1: yP, x2: c + .2 * S, y2: yP, class: 'bl-prato' }, fixo); }
    F.txt(.5 * S, yT - F.fs * 1.4, '=', 'bl-igual', fixo);
    F.txt(.5 * S, .96 * S, legenda, 'bl-leg', fixo);
    const itens = F.mk('g', {});
    // um peso grande com o número (prato com muitos quadradinhos)
    const peso = (x, y, w, h, v, cls) => { const g = F.mk('g', { class: 'bl-it bl-peso ' + cls }, itens); F.mk('rect', { x, y: y - h, width: w, height: h, rx: 5 }, g); F.txt(x + w / 2, y - h / 2, String(v), 'bl-pn', g); return g; };
    return {
      F,
      desenha(st, m = {}) {
        itens.innerHTML = '';
        for (const lado of ['e', 'd']) {
          const s = st[lado] || {}, cx = cxs[lado];
          const sai = (m.sai && m.sai[lado]) || {}, entra = (m.entra && m.entra[lado]) || {};
          const nb = s.partes ? s.partes.reduce((a, b) => a + b, 0) : s.b || 0, nh = s.h || 0, tot = nb + nh, grande = tot > 24 || !!s.partes;   // partes: os pesos separados, cada um com o número
          const grp = m.grupos && lado === 'd' ? m.grupos : 0;
          let y = yP - 2;
          // caixas x (e o pedaço de caixa); mais de 4: em fileiras de 4
          const nx = s.x || 0, porX = nx > 4 ? 4 : Math.max(nx, 1), bx = Math.max((nx > 3 ? .075 : .09) * S, F.fs * 1.5), filX = Math.ceil(nx / porX);
          const valX = m.grupos && st.d && !st.d.partes && (st.d.b || 0) + (st.d.h || 0) > 24 ? (st.d.b || 0) / m.grupos : null;   // número grande: o valor de cada caixa dentro dela
          for (let i = 0; i < nx; i++) {
            const col = i % porX, lin = Math.floor(i / porX), nl = Math.min(porX, nx - lin * porX);
            const larg = nl * bx * 1.12 + (s.meio && lin === filX - 1 ? bx * .62 : 0);
            const x = cx - larg / 2 + col * bx * 1.12, yy = y - lin * bx * 1.15;
            const g = F.mk('g', { class: 'bl-it bl-x' + (i >= nx - (sai.x || 0) ? ' sai' : '') + (i >= nx - (entra.x || 0) ? ' entra' : '') + (m.grupos ? ' bl-g' + (i % 5) : '') }, itens);
            F.mk('rect', { x, y: yy - bx, width: bx, height: bx, rx: 4 }, g);
            F.txt(x + bx / 2, yy - bx / 2, valX != null && lado === 'e' ? sN(valX) : 'x', '', g).style.fontSize = Math.max(bx * .6, F.fs) + 'px';
          }
          if (s.meio) {
            const nl = nx ? Math.min(porX, nx - (filX - 1) * porX) : 0, larg = nl * bx * 1.12 + bx * .62, x = cx - larg / 2 + nl * bx * 1.12, yy = y - Math.max(filX - 1, 0) * bx * 1.15;
            const g = F.mk('g', { class: 'bl-it bl-meio' + (sai.meio ? ' sai' : '') }, itens);
            const w = bx / Math.max(2, s.meio) * 1.0;
            F.mk('rect', { x, y: yy - bx, width: w, height: bx, rx: 3 }, g); F.txt(x + w / 2, yy - bx * 1.35, `x ÷ ${s.meio}`, 'bl-leg', g);
          }
          if (nx || s.meio) y -= filX * bx * 1.15;
          if (grande) {   // um peso por número (o que sai e o que entra ficam separados; nos grupos, um por caixa)
            const blocos = [];
            if (grp) for (let k = 0; k < grp; k++) blocos.push([nb / grp, ' bl-g' + (k % 5)]);
            else if (s.partes) s.partes.forEach((v, k) => blocos.push([v, ' bl-g' + k]));
            else {
              const fica = nb - (sai.b || 0) - (entra.b || 0);
              if (fica > 0) blocos.push([fica, '']);
              if (sai.b) blocos.push([sai.b, ' sai']);
              if (entra.b) blocos.push([entra.b, ' entra']);
            }
            if (nh) blocos.push([nh, ' bl-hp' + (sai.h ? ' sai' : '')]);
            // cada peso com a largura que o número precisa; não cabem lado a lado no prato: em fileiras
            const gap = .01 * S, larg = .4 * S, h = Math.max(.1 * S, F.fs * 1.6);
            const wN = Math.max(...blocos.map(([v]) => F.fs * (.62 * String(v).length + .9)));
            const por = Math.max(1, Math.min(blocos.length, Math.floor((larg + gap) / (wN + gap)))), w = Math.max(wN, Math.min(.17 * S, larg / por - gap));
            blocos.forEach(([v, cls], k) => { const lin = Math.floor(k / por), col = k % por, nl = Math.min(por, blocos.length - lin * por), x0 = cx - (nl * w + (nl - 1) * gap) / 2;
              peso(x0 + col * (w + gap), y - lin * (h + gap), w, h, v, cls); });
            continue;
          }
          // pesos de 1 (e os que faltam), 5 por fileira (6 se passar de 15)
          const por = tot > 15 ? 6 : 5, bb = (tot > 15 ? .048 : .055) * S;
          const corParte = (i) => { if (!s.partes) return ''; let a = 0; for (let k = 0; k < s.partes.length; k++) { a += s.partes[k]; if (i < a) return ' bl-g' + k; } return ''; };
          for (let i = 0; i < tot; i++) {
            const col = i % por, lin = Math.floor(i / por), px = cx - (por * bb * 1.15) / 2 + col * bb * 1.15, py = y - (lin + 1) * bb * 1.15;
            const ehH = i >= nb;
            let cls = 'bl-it ' + (ehH ? 'bl-h' : 'bl-b');
            if (!ehH && i >= nb - (sai.b || 0)) cls += ' sai';
            if (ehH && i - nb >= nh - (sai.h || 0)) cls += ' sai';
            if (!ehH && i >= nb - (entra.b || 0)) cls += ' entra';
            if (grp && !ehH) cls += ' bl-g' + Math.floor(i / (nb / grp));
            if (!ehH) cls += corParte(i);
            F.mk('rect', { x: px, y: py, width: bb, height: bb, rx: 2, class: cls }, itens);
          }
        }
      },
    };
  }
  // ── a conta: linhas; o termo que atravessa o "=" ganha uma seta curva ──
  function contaEq(pai) {
    const box = el('div', 'qd-eqv', '', pai);
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'seta-eq'); box.appendChild(svg);
    return {
      box,
      async linha(html, ms = 900) {
        const l = el('div', 'ln qd-pop', virgH(html), box); const tt = l.querySelector('.t');
        if (tt && box.querySelectorAll('.ln').length > 1 && [...l.children].slice([...l.children].indexOf(tt)).some((s) => s.textContent.trim() === '=')) l.classList.add('com-seta');   // espaço em cima para a seta não encostar na linha de cima
        await wait(ms); return l;
      },
      // seta do termo (antes do "=") até depois do último número da linha, com o rótulo (ex.: "vira − 7"); rel(): certo também girado
      async atravessa(ln, rotulo) {
        const t = ln.querySelector('.t'), fim = ln.lastElementChild;
        t.classList.add('vai');
        svg.setAttribute('width', box.offsetWidth); svg.setAttribute('height', box.offsetHeight);
        const a = rel(box, t), b = rel(box, fim);
        const x1 = a.x + a.w / 2, y1 = a.y + a.h * .05, x2 = b.x + b.w + a.w * .45, y2 = b.y + b.h * .05, cy = Math.min(y1, y2) - a.h * .75;
        curva(svg, x1, y1, (x1 + x2) / 2, cy, x2, y2, 'var(--qd-amarelo)', Math.max(2, a.h * .06));
        const r = el('div', 'seta-rot', esc(rotulo), box); r.style.left = (x1 + x2) / 2 + 'px'; r.style.top = (cy + Math.min(y1, y2)) / 2 + 'px';
        await wait(1300);
      },
      limpaSetas() { svg.innerHTML = ''; box.querySelectorAll('.seta-rot').forEach((e) => e.remove()); box.querySelectorAll('.t.vai').forEach((e) => e.classList.remove('vai')); },
      async final(html) { this.limpaSetas(); const l = el('div', 'ln qd-pop', `<span class="ok">${virgH(html)}</span>`, box); await wait(700); return l; },
      async confere(html) { const l = el('div', 'ln conf qd-pop', virgulas(html), box); await wait(900); return l; },
    };
  }
  // ── traduzir: a frase em pedaços; cada pedaço acende e vira símbolo embaixo ──
  async function traduz(pai, pares, ms = 1100) {
    const g = el('div', 'qd-trad', '', pai);
    g.style.gridTemplateRows = 'auto auto auto';
    const cols = pares.map(([w, s]) => { const a = el('div', 'w', esc(String(w)), g), b = el('div', 'seta', '↓', g), c = el('div', 's', virgulas(String(s)), g); [b, c].forEach((e) => { e.style.visibility = 'hidden'; }); return [a, b, c]; });
    for (const [a, b, c] of cols) { a.classList.add('on'); await wait(ms * .4); b.style.visibility = ''; c.style.visibility = ''; c.classList.add('qd-pop'); await wait(ms * .6); a.classList.remove('on'); }
    return g;
  }
  // ── reta numérica (para o negativo); muitas casas: só alguns números escritos (a letra não fica abaixo do mínimo) ──
  function retaNum(de, ate, dado) {   // PROMPT-221: dado = rótulos só de dado em dado
    const F = ladoSvg(), S = F.S, y = .55 * S, x0 = .08 * S, x1 = .92 * S, n = ate - de, u = (x1 - x0) / n, X = (v) => x0 + (v - de) * u;
    const larg = Math.max(String(sN(de)).length, String(sN(ate)).length);   // PROMPT-220: −21 é mais largo que 2: o espaço de cada número conta
    const auto = Math.max(1, Math.ceil(n * F.fs * Math.max(1.6, .55 * larg + .6) / (x1 - x0))), passo = dado ? dado * Math.ceil(auto / dado) : auto;
    F.mk('line', { x1: x0 - .03 * S, y1: y, x2: x1 + .03 * S, y2: y, class: 'bl-trave' });
    for (let v = de; v <= ate; v++) { F.mk('line', { x1: X(v), y1: y - 6, x2: X(v), y2: y + 6, class: 'bl-fio' }); if (v % passo === 0 || passo === 1) F.txt(X(v), y + F.fs * 1.2, sN(v), 'bl-leg'); }
    return { F, X, y,
      ponto(v) { return F.mk('circle', { cx: X(v), cy: y, r: F.fs * .45, class: 'rn-pt' }); },
      async salto(a, b) {
        const d = b > a ? 1 : -1, n = Math.abs(b - a), pj = n > 10 ? 5 * Math.ceil(passo / 5) : passo, ult = n - (n % pj || pj);   // PROMPT-222: mais de 10 pulos, de 5 em 5   // PROMPT-220: anda para os dois lados (b < a: para a esquerda)
        for (let v = a; v !== b; v += d) {
          F.mk('path', { d: `M${X(v)} ${y - 4} Q${(X(v) + X(v + d)) / 2} ${y - u * .9} ${X(v + d)} ${y - 4}`, class: 'rn-salto' });
          const k = Math.abs(v - a) + 1;   // o múltiplo logo antes do fim sai se ficar colado no último
          if (pj === 1 || k === n || (k % pj === 0 && !(k === ult && n - ult < pj))) F.txt((X(v) + X(v + d)) / 2, y - u * .75 - F.fs * .4, String(k), 'bl-leg');
          await wait(Math.max(120, 260 * 8 / Math.max(8, n)));
        }
      },
    };
  }

  // ── 9-A: resolver ──
  // 1) a equação é uma balança: x + a = c
  async function cenaEqBal(s) {
    const a = s.a ?? 3, c0 = s.c ?? 8, x = c0 - a;
    const B = balanca();
    await etiqueta('EQUAÇÃO', 'uma balança equilibrada'); ajustaTopo();
    const perg = s.perg || `Quanto vale x em x + ${a} = ${c0}?`;
    await poePergunta(perg, false);
    B.desenha({ e: { x: 1, b: a }, d: { b: c0 } });
    const c = cartao(), E = contaEq(c.conta);
    await ler(perg);
    let p = await nota2(c, 'O "=" é uma balança equilibrada: os dois lados pesam igual.');
    await E.linha(`<span>x</span><span>+ ${a}</span><span>=</span><span>${c0}</span>`);
    await apagar(p);
    p = await nota2(c, 'A caixa x tem um peso escondido. Para descobrir, deixa o x sozinho.');
    await apagar(p);
    p = await nota(c.notas, `Tira ${a} dos DOIS lados: a balança continua equilibrada.`, 'passo');
    B.desenha({ e: { x: 1, b: a }, d: { b: c0 } }, { sai: { e: { b: a }, d: { b: a } } });
    await wait(1600);
    B.desenha({ e: { x: 1 }, d: { b: x } });
    await E.linha(`<span>x + ${a} − ${a}</span><span>=</span><span>${c0} − ${a}</span>`);
    await apagar(p);
    await E.final(`x = ${x}`);
    await E.confere(`confere: ${x} + ${a} = ${c0} ✔`);
    await respostaFinal(`<span>x = ${x}</span>`, { perg });
    for (const r of s.regras || ['Equação é uma balança: o que faz de um lado, faz do outro.']) await regra(r);
  }
  // 2) somando passa subtraindo: x + a = c (também "pensei num número": s.pensei)
  async function cenaEqSoma(s) {
    const a = s.a ?? 7, c0 = s.c ?? 12, x = c0 - a;
    const B = balanca();
    const perg = s.perg || `Resolva: x + ${a} = ${c0}`;
    await poePergunta(perg, false);
    B.desenha({ e: { x: 1, b: a }, d: { b: c0 } });
    const c = cartao(), E = contaEq(c.conta);
    await ler(perg);
    if (s.pensei) {   // 9) pensei num número
      let p = await nota2(c, `O número que pensei é o x. "Somei ${a}" é + ${a}. "Deu ${c0}" é = ${c0}.`);
      const l1 = await E.linha(`<span>x</span>${TQ('+ ' + a)}<span>=</span><span>${c0}</span>`);
      await apagar(p);
      p = await nota(c.notas, `Resolve: o + ${a} passa subtraindo.`, 'passo');
      await E.atravessa(l1, `vira − ${a}`);
      B.desenha({ e: { x: 1, b: a }, d: { b: c0 } }, { sai: { e: { b: a }, d: { b: a } } });
      await E.linha(`<span>x</span><span>=</span><span>${c0}</span>${TQ('− ' + a)}`);
      B.desenha({ e: { x: 1 }, d: { b: x } });
      await apagar(p);
      await E.final(`x = ${x}`);
      await E.confere(`confere: ${x} + ${a} = ${c0} ✔`);
      await respostaFinal(`<span>pensei no ${sN(x)}</span>`, { perg });
      for (const r of s.regras || ['Problema: escreve a equação primeiro, depois resolve.']) await regra(r);
      return;
    }
    const l1 = await E.linha(`<span>x</span>${TQ('+ ' + a)}<span>=</span><span>${c0}</span>`);
    let p = await nota2(c, `O ${a} está somando com o x. Para tirar, subtrai ${a} dos dois lados.`);
    B.desenha({ e: { x: 1, b: a }, d: { b: c0 } }, { sai: { e: { b: a }, d: { b: a } } });
    await apagar(p);
    p = await nota(c.notas, `Atalho: o + ${a} passa para o outro lado do "=" e vira − ${a}.`, 'passo');
    await E.atravessa(l1, `passa e vira − ${a}`);
    B.desenha({ e: { x: 1 }, d: { b: x } });
    await E.linha(`<span>x</span><span>=</span><span>${c0}</span>${TQ('− ' + a)}`);
    await apagar(p);
    await E.final(`x = ${x}`);
    await E.confere(`confere: ${x} + ${a} = ${c0} ✔`);
    await respostaFinal(`<span>x = ${x}</span>`, { perg });
    for (const r of s.regras || ['Somando de um lado, passa subtraindo para o outro.']) await regra(r);
  }
  // 3) subtraindo passa somando: x − a = c (c ≥ 0)
  async function cenaEqSub(s) {
    const a = s.a ?? 4, c0 = s.c ?? 9, x = c0 + a;
    const B = balanca(`o tracejado: ${a} que faltam`);
    const perg = s.perg || `Resolva: x − ${a} = ${c0}`;
    await poePergunta(perg, false);
    B.desenha({ e: { x: 1, h: a }, d: { b: c0 } });
    const c = cartao(), E = contaEq(c.conta);
    await ler(perg);
    const l1 = await E.linha(`<span>x</span>${TQ('− ' + a)}<span>=</span><span>${c0}</span>`);
    let p = await nota2(c, `O x está "menos ${a}". Para desfazer, soma ${a} dos dois lados.`);
    B.desenha({ e: { x: 1, h: a }, d: { b: x } }, { sai: { e: { h: a } }, entra: { d: { b: a } } });
    await wait(800);
    await apagar(p);
    p = await nota(c.notas, `Atalho: o − ${a} passa para o outro lado e vira + ${a}.`, 'passo');
    await E.atravessa(l1, `passa e vira + ${a}`);
    B.desenha({ e: { x: 1 }, d: { b: x } });
    await E.linha(`<span>x</span><span>=</span><span>${c0}</span>${TQ('+ ' + a)}`);
    await apagar(p);
    await E.final(`x = ${x}`);
    await E.confere(`confere: ${x} − ${a} = ${c0} ✔`);
    await respostaFinal(`<span>x = ${x}</span>`, { perg });
    for (const r of s.regras || ['Subtraindo de um lado, passa somando para o outro.']) await regra(r);
  }
  // 4) multiplicando passa dividindo: kx = c (também o dobro e "quanto custou cada um": s.tipo 'dobro' | 'cada')
  async function cenaEqMult(s) {
    const k = s.k ?? 3, c0 = s.c ?? 15, x = c0 / k, tipo = s.tipo || '';
    const B = balanca(tipo === 'cada' ? 'cada quadradinho = R$ 1' : 'cada quadradinho = 1');
    const perg = s.perg || (tipo === 'dobro' ? `O dobro de um número é ${c0}. Que número é esse?` : tipo === 'cada' ? `Comprei ${k} cadernos iguais e gastei R$ ${c0}. Quanto custou cada um?` : `Resolva: ${k}x = ${c0}`);
    await poePergunta(perg, false);
    B.desenha({ e: { x: k }, d: { b: c0 } });
    const c = cartao(), E = contaEq(c.conta);
    await ler(perg);
    const linha1 = () => E.linha(`${TQ(String(k))}<span class="gx">x</span><span>=</span><span>${c0}</span>`);
    let p, l1;
    if (tipo === 'dobro') {
      p = await nota2(c, `O dobro é 2 vezes: 2x. "É ${c0}" é = ${c0}.`);
      l1 = await linha1(); await apagar(p);
      p = await nota(c.notas, 'O 2 multiplica: passa dividindo. Cada caixa fica com a metade.', 'passo');
      await E.atravessa(l1, 'vira ÷ 2');
      B.desenha({ e: { x: k }, d: { b: c0 } }, { grupos: k });
    } else if (tipo === 'cada') {
      p = await nota2(c, `Cada caderno custa x. ${k} cadernos: ${k}x. Gastei ${c0}: = ${c0}.`);
      l1 = await linha1(); await apagar(p);
      p = await nota(c.notas, `O ${k} multiplica: passa dividindo. Reparte os ${c0} reais em ${k}.`, 'passo');
      await E.atravessa(l1, `vira ÷ ${k}`);
      B.desenha({ e: { x: k }, d: { b: c0 } }, { grupos: k });
    } else {
      p = await nota2(c, `${k}x quer dizer ${k} vezes x: são ${k} caixas iguais.`);
      l1 = await linha1(); await apagar(p);
      p = await nota2(c, `Reparte os ${c0} entre as ${k} caixas: cada caixa fica com ${x}.`);
      B.desenha({ e: { x: k }, d: { b: c0 } }, { grupos: k });
      await apagar(p);
      p = await nota(c.notas, `Atalho: o ${k} está multiplicando, passa dividindo.`, 'passo');
      await E.atravessa(l1, `passa e vira ÷ ${k}`);
    }
    await E.linha(`<span>x</span><span>=</span><span>${c0}</span>${TQ('÷ ' + k)}`);
    await apagar(p);
    await E.final(`x = ${x}`);
    await E.confere(tipo === 'dobro' ? `confere: o dobro de ${x} é ${c0} ✔` : `confere: ${k} × ${x} = ${c0} ✔`);
    await respostaFinal(tipo === 'dobro' ? `<span>o número é ${x}</span>` : tipo === 'cada' ? `<span>cada um: R$ ${x}</span>` : `<span>x = ${x}</span>`, { perg });
    for (const r of s.regras || [tipo === 'dobro' ? 'Dobro: 2x. Triplo: 3x. Quádruplo: 4x.' : tipo === 'cada' ? '"Cada um custa x": vários iguais = número × x.' : 'Multiplicando o x, passa dividindo.']) await regra(r);
  }
  // 5) dividindo passa multiplicando: x ÷ k = c
  async function cenaEqDiv(s) {
    const k = s.k ?? 2, c0 = s.c ?? 6, x = c0 * k, dois = k === 2;
    const B = balanca(dois ? 'meia caixa = metade de x' : `o pedaço = x ÷ ${k}`);
    const perg = s.perg || `Resolva: x ÷ ${k} = ${c0}`;
    await poePergunta(perg, false);
    B.desenha({ e: { meio: k }, d: { b: c0 } });
    const c = cartao(), E = contaEq(c.conta);
    await ler(perg);
    let p = await nota2(c, dois ? `x ÷ 2 é a metade da caixa. A metade pesa ${c0}.` : `x ÷ ${k} é um pedaço da caixa (ela tem ${k} pedaços iguais). O pedaço pesa ${c0}.`);
    const l1 = await E.linha(`<span>x</span>${TQ('÷ ' + k)}<span>=</span><span>${c0}</span>`);
    await apagar(p);
    p = await nota2(c, dois ? 'A caixa inteira é o dobro: dobra os dois lados.' : `A caixa inteira são ${k} pedaços: multiplica os dois lados por ${k}.`);
    B.desenha({ e: { x: 1 }, d: { b: x } }, { entra: { e: { x: 1 }, d: { b: x - c0 } } });
    await apagar(p);
    p = await nota(c.notas, `Atalho: o ${k} está dividindo, passa multiplicando.`, 'passo');
    await E.atravessa(l1, `passa e vira × ${k}`);
    await E.linha(`<span>x</span><span>=</span><span>${c0}</span>${TQ('× ' + k)}`);
    await apagar(p);
    await E.final(`x = ${x}`);
    await E.confere(`confere: ${x} ÷ ${k} = ${c0} ✔`);
    await respostaFinal(`<span>x = ${x}</span>`, { perg });
    for (const r of s.regras || ['Dividindo o x, passa multiplicando.']) await regra(r);
  }
  // 6 e 7) duas etapas: kx + a = c ou kx − a = c (primeiro o + ou −, depois o × ou ÷; cada etapa num cartão)
  async function cenaEq2(s) {
    const menos = s.op === '−', k = s.k ?? (menos ? 3 : 2), a = s.a ?? (menos ? 2 : 3), c0 = s.c ?? (menos ? 10 : 11), m = menos ? c0 + a : c0 - a, x = m / k;
    const B = balanca(menos ? `o tracejado: ${a} que faltam` : 'cada quadradinho = 1');
    const perg = s.perg || `Resolva: ${k}x ${menos ? '−' : '+'} ${a} = ${c0}`;
    await poePergunta(perg, false);
    B.desenha({ e: { x: k, [menos ? 'h' : 'b']: a }, d: { b: c0 } });
    let c = cartao(), E = contaEq(c.conta);
    await ler(perg);
    let p;
    if (menos) {
      p = await nota2(c, `Primeiro o − ${a}: passa para o outro lado somando.`);
      const l1 = await E.linha(`<span>${k}x</span>${TQ('− ' + a)}<span>=</span><span>${c0}</span>`);
      await E.atravessa(l1, `vira + ${a}`);
      B.desenha({ e: { x: k, h: a }, d: { b: m } }, { sai: { e: { h: a } }, entra: { d: { b: a } } });
      await wait(900);
      B.desenha({ e: { x: k }, d: { b: m } });
      await E.linha(`<span>${k}x</span><span>=</span><span>${c0} + ${a}</span>`);
    } else {
      p = await nota2(c, `Duas coisas grudadas no x: o ${k} (vezes) e o ${a} (mais). Primeiro tira o que está somando.`);
      const l1 = await E.linha(`<span>${k}x</span>${TQ('+ ' + a)}<span>=</span><span>${c0}</span>`);
      await E.atravessa(l1, `vira − ${a}`);
      B.desenha({ e: { x: k, b: a }, d: { b: c0 } }, { sai: { e: { b: a }, d: { b: a } } });
      await wait(900);
      B.desenha({ e: { x: k }, d: { b: m } });
      await E.linha(`<span>${k}x</span><span>=</span><span>${c0} − ${a}</span>`);
    }
    E.limpaSetas(); await apagar(p); p = null; await paraHist(c); c = cartao(); E = contaEq(c.conta);
    const l3 = await E.linha(`${TQ(String(k))}<span class="gx">x</span><span>=</span><span>${m}</span>`);
    p = await nota(c.notas, menos ? `Depois o ${k} que multiplica passa dividindo.` : `Agora o ${k} que está multiplicando passa dividindo.`, 'passo');
    await E.atravessa(l3, `vira ÷ ${k}`);
    B.desenha({ e: { x: k }, d: { b: m } }, { grupos: k });
    await E.linha(`<span>x</span><span>=</span><span>${m}</span>${TQ('÷ ' + k)}`);
    await apagar(p);
    await E.final(`x = ${x}`);
    await E.confere(`confere: ${k} × ${x} ${menos ? '−' : '+'} ${a} = ${c0} ✔`);
    await respostaFinal(`<span>x = ${x}</span>`, { perg });
    for (const r of s.regras || [menos ? 'Primeiro o + ou −, depois o × ou ÷.' : 'Duas etapas: primeiro o + ou −, depois o × ou ÷.']) await regra(r);
  }
  // 8) com negativo: x − a = c (c < 0), na reta numérica
  async function cenaEqNeg(s) {
    const a = s.a ?? 8, c0 = s.c ?? -3, x = c0 + a;
    const R = retaNum(Math.min(c0, 0) - 1, Math.max(x, 0) + 1);
    const perg = s.perg || `Resolva: x − ${a} = ${sN(c0)}`;
    await poePergunta(perg, false);
    const c = cartao(), E = contaEq(c.conta);
    await ler(perg);
    const l1 = await E.linha(`<span>x</span>${TQ('− ' + a)}<span>=</span><span>${sN(c0)}</span>`);
    let p = await nota(c.notas, `O − ${a} passa para o outro lado e vira + ${a}.`, 'passo');
    await E.atravessa(l1, `vira + ${a}`);
    await E.linha(`<span>x</span><span>=</span><span>${sN(c0)}</span>${TQ('+ ' + a)}`);
    await apagar(p);
    p = await nota(c.notas, `Na reta: começa no ${sN(c0)} e anda ${a} casas para a direita.`, 'passo');
    R.ponto(c0); await wait(500);
    await R.salto(c0, x);
    R.ponto(x);
    await apagar(p);
    await E.final(`x = ${sN(x)}`);
    await E.confere(`confere: ${sN(x)} − ${a} = ${sN(c0)} ✔`);
    await respostaFinal(`<span>x = ${sN(x)}</span>`, { perg });
    for (const r of s.regras || ['Negativo mais positivo: anda para a direita na reta.']) await regra(r);
  }
  // 12) x dos dois lados: ax − b = cx + d
  async function cenaEqDois(s) {
    const a = s.a ?? 5, b = s.b ?? 3, cc = s.cc ?? 2, d = s.d ?? 9, k = a - cc, m = d + b, x = m / k;
    const B = balanca(`o tracejado: ${b} que faltam`);
    const perg = s.perg || `Resolva: ${a}x − ${b} = ${cxo(cc)}x + ${d}`;
    await poePergunta(perg, false);
    B.desenha({ e: { x: a, h: b }, d: { x: cc, b: d } });
    let c = cartao(), E = contaEq(c.conta);
    await ler(perg);
    let p = await nota2(c, 'Tem x dos dois lados. Junta os x de um lado e os números do outro.');
    await E.linha(`<span>${a}x − ${b}</span><span>=</span>${TQ(cxo(cc) + 'x')}<span>+ ${d}</span>`);
    await apagar(p);
    p = await nota(c.notas, `O ${cxo(cc)}x passa para a esquerda subtraindo (tira ${cc === 1 ? '1 caixa' : cc + ' caixas'} dos dois lados).`, 'passo');
    B.desenha({ e: { x: a, h: b }, d: { x: cc, b: d } }, { sai: { e: { x: cc }, d: { x: cc } } });
    await wait(1200);
    B.desenha({ e: { x: k, h: b }, d: { b: d } });
    await E.linha(`<span>${a}x − ${cxo(cc)}x − ${b}</span><span>=</span><span>${d}</span>`);
    await apagar(p); p = null; await paraHist(c); c = cartao(); E = contaEq(c.conta);
    const l3 = await E.linha(`<span>${cxo(k)}x</span>${TQ('− ' + b)}<span>=</span><span>${d}</span>`);
    p = await nota(c.notas, k === 1 ? `Agora como antes: o − ${b} passa somando.` : `Agora como antes: o − ${b} passa somando, depois o ${k} passa dividindo.`, 'passo');
    await E.atravessa(l3, `vira + ${b}`);
    B.desenha({ e: { x: k }, d: { b: m } }, { entra: { d: { b } } });
    await E.linha(`<span>${cxo(k)}x</span><span>=</span><span>${m}</span>`);
    E.limpaSetas();
    if (k > 1) {
      B.desenha({ e: { x: k }, d: { b: m } }, { grupos: k });
      await E.linha(`<span>x</span><span>=</span><span>${m} ÷ ${k}</span>`);
    }
    await apagar(p);
    await E.final(`x = ${x}`);
    const L1 = a * x - b;
    await E.confere(`confere: ${a} × ${x} − ${b} = ${L1}`); await E.confere(`e ${cc === 1 ? x : `${cc} × ${x}`} + ${d} = ${L1} ✔`);
    await respostaFinal(`<span>x = ${x}</span>`, { perg });
    for (const r of s.regras || ['x de um lado, números do outro. Quem troca de lado, troca o sinal.']) await regra(r);
  }
  // 13) parênteses: k(x + b) = c
  async function cenaEqParen(s) {
    const k = s.k ?? 2, b = s.b ?? 3, c0 = s.c ?? 14, m = c0 / k, x = m - b;
    const B = balanca();
    const perg = s.perg || `Resolva: ${k}(x + ${b}) = ${c0}`;
    await poePergunta(perg, false);
    B.desenha({ e: { x: k, b: k * b }, d: { b: c0 } });
    const c = cartao(), E = contaEq(c.conta);
    await ler(perg);
    let p = await nota2(c, `${k}(x + ${b}) são ${k} vezes o "x + ${b}": ${k} caixas e ${k} grupos de ${b}.`);
    const l1 = await E.linha(`${TQ(String(k))}<span class="gx">(x + ${b})</span><span>=</span><span>${c0}</span>`);
    await apagar(p);
    p = await nota(c.notas, `Divide os dois lados por ${k}: fica um x + ${b} só, e ${k === 2 ? `metade do ${c0}` : `${c0} ÷ ${k}`}.`, 'passo');
    await E.atravessa(l1, `vira ÷ ${k}`);
    B.desenha({ e: { x: k, b: k * b }, d: { b: c0 } }, { sai: { e: { x: k - 1, b: (k - 1) * b }, d: { b: c0 - m } } });
    await wait(1200);
    B.desenha({ e: { x: 1, b }, d: { b: m } });
    const l2 = await E.linha(`<span>x</span>${TQ('+ ' + b)}<span>=</span><span>${c0} ÷ ${k} = ${m}</span>`);
    E.limpaSetas();
    await apagar(p);
    p = await nota(c.notas, `Agora o + ${b} passa subtraindo.`, 'passo');
    await E.atravessa(l2, `vira − ${b}`);
    B.desenha({ e: { x: 1, b }, d: { b: m } }, { sai: { e: { b }, d: { b } } });
    await E.linha(`<span>x</span><span>=</span><span>${m} − ${b}</span>`);
    B.desenha({ e: { x: 1 }, d: { b: x } });
    await apagar(p);
    await E.final(`x = ${x}`);
    await E.confere(`confere: ${k} × (${x} + ${b}) = ${c0} ✔`);
    await respostaFinal(`<span>x = ${x}</span>`, { perg });
    for (const r of s.regras || ['Número na frente do parêntese: divide os dois lados por ele primeiro.']) await regra(r);
  }

  // ── 9-B: qual é a equação? (a resposta verde é sempre a equação) ──
  const REGRA_B = 'O que não sei é o x. Cada palavra vira um sinal. "É", "deu", "ficou" viram =.';
  async function tiraTrad() { const t = FOCO.querySelector('.qd-card:not(.mini) .qd-trad'); if (t) { t.classList.add('qd-apaga'); await wait(450); t.remove(); } }
  const eqHtml = (eq) => eq.map((p) => `<span>${esc(String(p))}</span>`).join('');
  // 1) tabela: palavras → sinais
  async function cenaSinais(s) {
    L.classList.add('sem-hist');
    await etiqueta('EQUAÇÃO', 'a frase vira conta'); ajustaTopo();
    const perg = s.perg || 'Como transformar uma frase em equação?';
    await poePergunta(perg, false);
    const c = cartao();
    await ler(perg);
    const p = await nota(c.notas, 'Cada palavra da frase tem um sinal.', 'passo');
    const tb = el('div', 'qd-tab-sinal', '', c.conta);
    const lin = [
      ['um número, o que não sei', 'x'], ['mais, somei, ganhei, a mais', '+'], ['menos, tirei, gastei, perdi', '−'], ['vezes, cada um custa', '×'],
      ['dobro · triplo', '2x · 3x'], ['metade · dividi entre 4', 'x ÷ 2 · x ÷ 4'], ['é, deu, ficou, sobrou, igual a', '='],
    ];
    for (const [w, sg] of lin) { el('div', 'w qd-pop', esc(w), tb); el('div', 's qd-pop', esc(sg), tb); await wait(1100); }
    await apagar(p);
    await nota(c.notas, 'o "=" separa o que aconteceu do resultado', 'detalhe');
    await wait(800);
    for (const r of s.regras || [REGRA_B]) await regra(r);
  }
  // a frase vira equação: { perg, pares, eq: [partes], passo, detalhe, peg: { errada, porque, certa }, res: { linhas: [[partes]], final, confere }, resp, regras }
  async function cenaFrase(s) {
    const perg = s.perg;
    await poePergunta(perg, false);
    const c = cartao();
    await ler(perg);
    const p = s.passo ? await nota(c.notas, s.passo, 'passo') : null;
    await traduz(c.conta, s.pares);
    await wait(300);
    const E = contaEq(c.conta);
    const l = await E.linha(eqHtml(s.eq));
    l.classList.add('eq-escrita');
    if (p) await apagar(p);
    if (s.detalhe) { await nota(c.notas, s.detalhe, 'detalhe'); await wait(s.res ? 500 : 600); } else await wait(500);
    if (s.peg) {   // pegadinha: a equação errada riscada, o motivo, e a certa embaixo
      await tiraTrad();
      el('div', 'ln qd-pop eq-errada', `<span class="qd-risco-todo">${virgulas(s.peg.errada)}</span><span class="x-ic">✖</span>`, E.box);
      await wait(900);
      await nota(c.notas, s.peg.porque, 'detalhe');
      await certoEmbaixo(c, `<span>${virgulas(s.peg.certa)}</span>`);
      await wait(600);
    }
    if (s.res) {   // resolve rapidinho, para conferir que a equação faz sentido
      await tiraTrad(); await paraHist(c);
      const c2 = cartao(); const E2 = contaEq(c2.conta);
      const p2 = await nota(c2.notas, 'Resolve para conferir:', 'passo');
      for (const ln of s.res.linhas) await E2.linha(eqHtml(ln), 700);
      await E2.final(s.res.final);
      await E2.confere(s.res.confere);
      await apagar(p2);
    }
    await tiraTrad(); await respostaFinal(`<span>${esc(s.resp || s.eq.join(' '))}</span>`, { perg });
    for (const r of s.regras || [REGRA_B]) await regra(r);
  }
  // 9) da balança para a equação: { e: { x, b }, d: { b } | { partes: [t, k] }, unid }
  async function cenaBalEq(s) {
    const e = s.e || { x: 2, b: 3 }, d = s.d || { b: 11 }, u = s.unid ? ' ' + s.unid : '';
    const B = balanca(d.partes ? `os pesos em ${s.unid || 'kg'}` : `cada quadradinho = 1${u}`);
    const perg = s.perg || 'A balança está equilibrada. Qual é a equação?';
    await poePergunta(perg, false);
    B.desenha({ e, d });
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    const esq = `${cxo(e.x)}x${e.b ? ` + ${e.b}` : ''}`, dir = d.partes ? d.partes.join(' + ') : String(d.b);
    let p = await nota(c.notas, `Lado esquerdo: ${e.x === 1 ? '1 caixa x' : `${e.x} caixas x`}${e.b ? ` e ${e.b} quadradinho${e.b > 1 ? 's' : ''}` : ''}.`, 'passo');
    B.desenha({ e, d }, { grupos: 0 });
    await wait(1200);
    await E.linha(`<span>${esq}</span>`);
    await apagar(p);
    p = await nota(c.notas, 'Equilibrada: os dois lados pesam igual, é o =.', 'passo');
    await E.linha(`<span>${esq}</span><span>=</span>`);
    await apagar(p);
    p = await nota(c.notas, d.partes ? `Lado direito: um peso de ${d.partes[0]} e outro de ${d.partes[1]}.` : `Lado direito: ${d.b} quadradinhos.`, 'passo');
    await E.linha(`<span>${esq}</span><span>=</span><span>${dir}</span>`);
    await apagar(p);
    await nota(c.notas, `cada caixa é um x; cada quadradinho vale 1${u}`, 'detalhe');
    await wait(600);
    await tiraTrad(); await respostaFinal(`<span>${esq} = ${dir}</span>`, { perg });
    for (const r of s.regras || ['Balança: o que está de um lado = o que está do outro.']) await regra(r);
  }

  // ══════════════════ 8: expressões algébricas (PROMPT-220; protótipos referencia/lousa-8a.html e lousa-8b.html) ══════════════════
  // As cenas recebem os números e as letras (a aula usa os do protótipo; o cartão do erro, os da questão).
  const mono8 = (k, l) => (k === 1 ? l : `${k}${l}`);
  const X8 = (n = 1, extra = {}) => ({ t: 'x', n, ...extra });
  const B8 = (n, extra = {}) => ({ t: 'b', n, ...extra });
  const OP8 = (s) => ({ t: 'op', s });
  const V8 = (v, n = 1, extra = {}) => ({ t: 'v', v, n, ...extra });
  const SB = (v, cor = '') => `<b class="sb${cor ? ' ' + cor : ''}">${v}</b>`;   // o número que entrou no lugar da letra
  const gA = (s) => `<b class="gA">${s}</b>`, gB = (s) => `<b class="gB">${s}</b>`;   // os grupos da simplificação
  const NOME8 = { 2: 'dobro', 3: 'triplo', 4: 'quádruplo' }, QTD8 = { 1: 'uma', 2: 'duas', 3: 'três', 4: 'quatro' };
  // ── a lateral com linhas de "coisas", cada uma com o rótulo em cima ──
  // linhas: [{ rot, itens: [{ t, n, l, cor, v, s, sai, entra }], entra }]
  // t: 'x' caixa com letra · 'v' caixa aberta com o número · 'b' quadradinhos de 1 · 'h' tracejados · 'meio' · 'q' quadrado x² · 'grade' n × n · 'op' sinal
  // Mais de 12 caixas: uma caixa só, com "12 × x" escrito.
  function caixas(legenda) {
    const F = ladoSvg(), S = F.S, g = F.mk('g', {});
    if (legenda) F.txt(.5 * S, .96 * S, legenda, 'bl-leg');
    const larga = (it) => F.fs * (.62 * `${it.n} × ${it.t === 'v' ? it.v : it.l || 'x'}`.length + 1);
    const W = (it, bx) => {
      const bb = bx * .42;
      switch (it.t) {
        case 'x': case 'v': return (it.n || 1) > 12 ? larga(it) + bx * .12 : (it.n ?? 1) * bx * 1.12;
        case 'b': case 'h': return Math.ceil(it.n / 2) * bb * 1.15 + bx * .1;
        case 'meio': return bx * .62;
        case 'q': return bx * 1.9;
        case 'grade': return it.n * bx * .42 * 1.08 + bx * .1;
        case 'op': return bx * .55;
      }
      return 0;
    };
    return { F,
      desenha(linhas) {
        g.innerHTML = '';
        const n = linhas.length, top = .04 * S, bot = .9 * S, h = Math.min(.36 * S, (bot - top) / n), y0 = top + ((bot - top) - h * n) / 2;
        const x0 = .04 * S, disp = .92 * S, rotH = F.fs * 1.7;
        linhas.forEach((ln, i) => {
          const yT = y0 + h * i, yc = yT + rotH + (h - rotH) / 2;
          const gr = F.mk('g', { class: 'cx-lin' + (ln.entra ? ' entra' : '') }, g);
          let bx = Math.min((h - rotH) * .8, .2 * S);
          const tot = ln.itens.reduce((s2, it) => s2 + W(it, bx), 0);
          if (tot > disp) bx *= disp / tot;
          const gmax = Math.max(0, ...ln.itens.filter((it) => it.t === 'grade').map((it) => it.n));
          if (gmax) bx = Math.min(bx, (h - rotH) * .95 / (gmax * .42 * 1.08));   // PROMPT-221: a grade cabe na altura da linha
          if (ln.rot) { const t = F.txt(x0, yT + rotH * .5, ln.rot, 'cx-rot', gr, 'start'); t.style.fontSize = F.fs * 1.25 + 'px'; }
          let x = x0;
          for (const it of ln.itens) {
            const k = it.n ?? 1, cls = (j, tot2) => (it.sai && j >= tot2 - it.sai ? ' sai' : '') + (it.entra ? ' entra' : '') + (it.cor ? ' cor-' + it.cor : '');
            if ((it.t === 'x' || it.t === 'v') && k > 12) {   // muitas caixas: uma só, com a quantidade escrita
              const w = larga(it), gg = F.mk('g', { class: 'bl-it ' + (it.t === 'x' ? 'bl-x' : 'cx-v') + cls(0, 1) }, gr);
              F.mk('rect', { x, y: yc - bx / 2, width: w, height: bx, rx: 4 }, gg);
              F.txt(x + w / 2, yc, `${k} × ${it.t === 'v' ? it.v : it.l || 'x'}`, '', gg).style.fontSize = F.fs + 'px';
              x += w + bx * .12;
            }
            else if (it.t === 'x') for (let j = 0; j < k; j++) { const gg = F.mk('g', { class: 'bl-it bl-x' + cls(j, k) }, gr); F.mk('rect', { x, y: yc - bx / 2, width: bx, height: bx, rx: 4 }, gg); F.txt(x + bx / 2, yc, it.l || 'x', '', gg).style.fontSize = Math.max(bx * .6, F.fs) + 'px'; x += bx * 1.12; }
            else if (it.t === 'v') for (let j = 0; j < k; j++) { const gg = F.mk('g', { class: 'bl-it cx-v' + cls(j, k) }, gr); F.mk('rect', { x, y: yc - bx / 2, width: bx, height: bx, rx: 4 }, gg); F.txt(x + bx / 2, yc, it.v, '', gg).style.fontSize = Math.max(bx * (String(it.v).length > 2 ? .42 : .55), F.fs) + 'px'; x += bx * 1.12; }
            else if (it.t === 'b' || it.t === 'h') {
              const bb = bx * .42, cols = Math.ceil(it.n / 2);
              for (let j = 0; j < it.n; j++) { const c = Math.floor(j / 2), r = j % 2; F.mk('rect', { x: x + c * bb * 1.15, y: yc - bb * 1.1 + r * bb * 1.15, width: bb, height: bb, rx: 2, class: 'bl-it ' + (it.t === 'b' ? 'bl-b' : 'bl-h') + cls(j, it.n) }, gr); }
              x += cols * bb * 1.15 + bx * .1;
            }
            else if (it.t === 'meio') { const gg = F.mk('g', { class: 'bl-it bl-meio' + cls(0, 1) }, gr); F.mk('rect', { x, y: yc - bx / 2, width: bx * .5, height: bx, rx: 3 }, gg); x += bx * .62; }
            else if (it.t === 'q') { const s = bx * 1.35, gg = F.mk('g', { class: 'bl-it cx-q' + cls(0, 1) }, gr); F.mk('rect', { x: x + bx * .25, y: yc - s / 2, width: s, height: s, rx: 3 }, gg); F.txt(x + bx * .25 + s / 2, yc, 'x²', '', gg).style.fontSize = Math.max(bx * .5, F.fs) + 'px'; F.txt(x + bx * .25 + s / 2, yc - s / 2 - F.fs * .6, 'x', 'cx-lado', gg); F.txt(x + bx * .1, yc, 'x', 'cx-lado', gg); x += bx * 1.7; }
            else if (it.t === 'grade') { const c = bx * .42; for (let a = 0; a < it.n; a++) for (let b = 0; b < it.n; b++) F.mk('rect', { x: x + a * c * 1.08, y: yc - it.n * c * 1.08 / 2 + b * c * 1.08, width: c, height: c, rx: 1.5, class: 'bl-it bl-b' + (it.entra ? ' entra' : '') }, gr); x += it.n * c * 1.08 + bx * .1; }
            else if (it.t === 'op') { const t = F.txt(x + bx * .27, yc, it.s, 'cx-op', gr); t.style.fontSize = Math.max(bx * .6, F.fs) + 'px'; x += bx * .55; }
          }
        });
      },
    };
  }
  // a frase vira expressão: pedaço por pedaço, depois a expressão escrita inteira
  async function fraseExpr(c, pares, expr, passo) {
    const p = passo ? await nota(c.notas, passo, 'passo') : null;
    await traduz(c.conta, pares);
    await wait(300);
    const E = contaEq(c.conta);
    const l = await E.linha(expr);
    if (p) await apagar(p);
    return { E, l };
  }
  // pegadinha: a errada riscada, o motivo, e a certa embaixo
  async function pegadinha(c, errada, porque, certa) {
    await tiraTrad();
    el('div', 'ln qd-pop eq-errada', `<span class="qd-risco-todo">${virgulas(errada)}</span><span class="x-ic">✖</span>`, c.conta.querySelector('.qd-eqv') || c.conta);
    await wait(900);
    await nota(c.notas, porque, 'detalhe');
    await certoEmbaixo(c, `<span>${virgulas(certa)}</span>`);
    await wait(600);
  }
  const regras8 = async (s, padrao) => { for (const r of s.regras || [padrao]) await regra(r); };

  // ── 8-A: linguagem algébrica e valor numérico ──
  // 1) a letra guarda um número
  async function cenaAlgLetra(s) {
    const K = caixas('a caixa: um número escondido');
    await etiqueta('EXPRESSÃO ALGÉBRICA', 'a letra guarda um número'); ajustaTopo();
    const perg = s.perg || 'O que quer dizer a letra x numa conta?';
    await poePergunta(perg, false);
    K.desenha([{ itens: [X8()] }]);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, 'A letra é como uma caixa fechada: dentro tem um número que a gente ainda não sabe.', 'passo');
    await wait(1800); await apagar(p);
    p = await nota(c.notas, 'Quando a frase fala "um número", a gente escreve x.', 'passo');
    await E.linha('<span>um número: x</span>', 1300);
    await apagar(p);
    p = await nota(c.notas, 'Pode ser outra letra também.', 'passo');
    K.desenha([{ itens: [X8()] }, { itens: [X8(1, { l: 'a', entra: true }), X8(1, { l: 'y', entra: true }), X8(1, { l: 'm', entra: true })] }]);
    await E.linha('<span>a, y, m…</span>', 1200);
    await apagar(p);
    await nota(c.notas, 'conta com letra = expressão algébrica', 'detalhe');
    await wait(800);
    await respostaFinal('<span>a letra guarda um número</span>', { perg });
    await regras8(s, 'A letra fica no lugar de um número que a gente não sabe (ou que pode mudar).');
  }
  // 2) mais e menos: { mais, menos, so: 'mais' | 'menos' (o cartão mostra só a parte da questão) }
  async function cenaAlgMaisMenos(s) {
    const m = s.mais ?? 5, n = s.menos ?? 4, so = s.so || '';
    const K = caixas(so === 'mais' ? undefined : 'tracejado = o que falta');
    const perg = s.perg || `Como escrever "um número mais ${m}"? E "um número menos ${n}"?`;
    await poePergunta(perg, false);
    let c = cartao();
    await ler(perg);
    const rM = { rot: `x + ${m}`, itens: [X8(), OP8('+'), B8(m)] }, rN = { rot: `x − ${n}`, itens: [X8(), OP8('−'), { t: 'h', n }] };
    if (so !== 'menos') {
      K.desenha([rM]);
      await fraseExpr(c, [['um número', 'x'], [`mais ${m}`, `+ ${m}`]], `<span>x + ${m}</span>`, '"Mais" é +.');
      await nota(c.notas, 'mais: soma', 'detalhe');
      await wait(600);
    }
    if (!so) { await tiraTrad(); await paraHist(c); c = cartao(); }
    if (so !== 'mais') {
      K.desenha(so ? [rN] : [rM, { ...rN, entra: true }]);
      await fraseExpr(c, [['um número', 'x'], [`menos ${n}`, `− ${n}`]], `<span>x − ${n}</span>`, '"Menos" é −. O número vem primeiro.');
      await wait(500);
      await pegadinha(c, `${n} − x`, `${n} − x é "${n} menos um número": a ordem muda tudo`, `x − ${n}`);
    }
    await tiraTrad();
    await respostaFinal(`<span>${so === 'mais' ? `x + ${m}` : so === 'menos' ? `x − ${n}` : `x + ${m} · x − ${n}`}</span>`, { perg });
    await regras8(s, 'Mais: +. Menos: −. Escreve na ordem da frase.');
  }
  // 3) dobro e triplo: { ks: [2, 3] } (o cartão: [k] da questão)
  async function cenaAlgDobro(s) {
    const ks = s.ks || [2, 3], k0 = ks[0], nome0 = NOME8[k0];
    const K = caixas();
    const perg = s.perg || 'Como escrever "o dobro de um número"? E "o triplo"?';
    await poePergunta(perg, false);
    let c = cartao();
    await ler(perg);
    const linhas = [{ rot: `${k0}x`, itens: [X8(k0)] }];
    K.desenha(linhas);
    const { E } = await fraseExpr(c, [[`o ${nome0} de`, `${k0} ×`], ['um número', 'x']], `<span>${k0} × x</span>`, `${nome0[0].toUpperCase() + nome0.slice(1)} é ${k0} vezes.`);
    let p = await nota(c.notas, `O × entre o número e a letra fica escondido: ${k0} × x se escreve ${k0}x.`, 'passo');
    await E.linha(`<span>= ${k0}x</span>`);
    await E.linha(`<span>= ${Array(k0).fill('x').join(' + ')}</span>`);
    await apagar(p);
    await nota(c.notas, `${k0}x: ${QTD8[k0]} caixas x`, 'detalhe');
    await wait(500);
    for (const k of ks.slice(1)) {
      await tiraTrad(); await paraHist(c);
      c = cartao(); const E2 = contaEq(c.conta);
      linhas.push({ rot: `${k}x`, itens: [X8(k)], entra: true });
      K.desenha(linhas);
      const nm = NOME8[k];
      p = await nota(c.notas, `${nm[0].toUpperCase() + nm.slice(1)}: ${k} vezes.`, 'passo');
      await E2.linha(`<span>${k}x = ${Array(k).fill('x').join(' + ')}</span>`);
      await apagar(p);
    }
    await pegadinha(c, `x + ${k0}`, `x + ${k0} é "um número mais ${k0}", não o ${nome0}`, `${k0}x`);
    await respostaFinal(`<span>${ks.map((k) => `${k}x`).join(' · ')}</span>`, { perg });
    await regras8(s, 'Dobro: 2x. Triplo: 3x. Quádruplo: 4x. O número vem colado na frente da letra.');
  }
  // 4) metade
  async function cenaAlgMetade(s) {
    const K = caixas('meia caixa = metade de x');
    const perg = s.perg || 'Como escrever "a metade de um número"?';
    await poePergunta(perg, false);
    const c = cartao();
    await ler(perg);
    K.desenha([{ rot: 'x', itens: [X8()] }, { rot: 'x ÷ 2', itens: [{ t: 'meio' }], entra: true }]);
    await fraseExpr(c, [['a metade de', '÷ 2'], ['um número', 'x']], '<span>x ÷ 2</span>', 'Metade é dividir por 2. O x vem primeiro.');
    await nota(c.notas, 'divide o número em 2 partes iguais', 'detalhe');
    await wait(500);
    await pegadinha(c, '2x', '2x é o dobro, não a metade', 'x ÷ 2');
    await respostaFinal('<span>x ÷ 2</span>', { perg });
    await regras8(s, 'Metade: x ÷ 2. Terça parte: x ÷ 3.');
  }
  // 5) ao quadrado
  async function cenaAlgQuad(s) {
    const K = caixas();
    const perg = s.perg || 'Como escrever "um número ao quadrado"?';
    await poePergunta(perg, false);
    const c = cartao();
    await ler(perg);
    K.desenha([{ rot: 'x²', itens: [{ t: 'q' }] }]);
    const { E } = await fraseExpr(c, [['um número', 'x'], ['ao quadrado', '²']], '<span>x²</span>', 'Ao quadrado: o 2 fica pequeno, lá em cima.');
    const p = await nota(c.notas, 'x² é o número vezes ele mesmo (o quadrado de lado x).', 'passo');
    await E.linha('<span>= x · x</span>');
    await apagar(p);
    await pegadinha(c, '2x', '2x é x + x (o dobro), não x · x', 'x²');
    await respostaFinal('<span>x²</span>', { perg });
    await regras8(s, 'Ao quadrado: x² = x · x. Não é 2x.');
  }
  // 6) duas operações: o dobro de um número, mais k
  async function cenaAlgDuas(s) {
    const k = s.k ?? 1;
    const K = caixas();
    const perg = s.perg || `Como escrever "o dobro de um número, mais ${k}"?`;
    await poePergunta(perg, false);
    const c = cartao();
    await ler(perg);
    K.desenha([{ rot: `2x + ${k}`, itens: [X8(2), OP8('+'), B8(k)] }]);
    await fraseExpr(c, [['o dobro de um número', '2x'], [`mais ${k}`, `+ ${k}`]], `<span>2x + ${k}</span>`, `Na ordem da frase: primeiro o dobro, depois o mais ${k}.`);
    await wait(500);
    await pegadinha(c, `2(x + ${k})`, `2(x + ${k}) é o dobro de "x + ${k}": duas caixas e ${k === 1 ? 'dois quadradinhos' : `${2 * k} quadradinhos`}`, `2x + ${k}`);
    await respostaFinal(`<span>2x + ${k}</span>`, { perg });
    await regras8(s, 'Duas operações: escreve na ordem da frase.');
  }
  // 7) cada um custa x: k canetas
  async function cenaAlgCada(s) {
    const k = s.k ?? 4;
    const K = caixas('cada caixa: o preço de 1 caneta');
    const perg = s.perg || `Cada caneta custa x reais. Quanto custam ${k} canetas?`;
    await poePergunta(perg, false);
    K.desenha([{ rot: `${k} canetas`, itens: [X8(k)] }]);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, 'Não sei o preço, então cada caneta é uma caixa x.', 'passo');
    await E.linha(`<span>${k > 5 ? `x + x + … + x (${k} vezes)` : Array(k).fill('x').join(' + ')}</span>`);
    await apagar(p);
    p = await nota(c.notas, `${k} vezes o x:`, 'passo');
    await E.linha(`<span>= ${k} · x</span>`);
    await E.final(`= ${k}x`);
    await apagar(p);
    await respostaFinal(`<span>${k}x reais</span>`, { perg });
    await regras8(s, `Quantidade × letra: ${k} canetas de x reais custam ${k}x.`);
  }
  // 8) valor numérico: x + k quando x = n
  async function cenaAlgValor(s) {
    const k = s.k ?? 3, n = s.n ?? 4;
    const K = caixas();
    await etiqueta('VALOR NUMÉRICO', 'troca a letra pelo número'); ajustaTopo();
    const perg = s.perg || `Qual é o valor de x + ${k} quando x = ${n}?`;
    await poePergunta(perg, false);
    K.desenha([{ rot: `x + ${k}`, itens: [X8(), OP8('+'), B8(k)] }]);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>x + ${k}</span>`);
    let p = await nota(c.notas, `Agora a gente sabe o que tem na caixa: x = ${n}. A caixa abre.`, 'passo');
    await wait(800);
    K.desenha([{ rot: `x + ${k}`, itens: [V8(n, 1, { entra: true }), OP8('+'), B8(k)] }]);
    await wait(900); await apagar(p);
    p = await nota(c.notas, `Troca o x pelo ${n} e faz a conta.`, 'passo');
    await E.linha(`<span>= ${SB(n)} + ${k}</span>`);
    await E.final(`= ${n + k}`);
    await apagar(p);
    await nota(c.notas, `o ${n} entrou no lugar do x`, 'detalhe');
    await wait(600);
    await respostaFinal(`<span>${n + k}</span>`, { perg });
    await regras8(s, 'Valor numérico: troca a letra pelo número e faz a conta.');
  }
  // 9) com menos: a − x (ou x − a, com { xPrimeiro: true }) quando x = n
  async function cenaAlgMenos(s) {
    const a = s.a ?? 10, n = s.n ?? 3, xp = !!s.xPrimeiro;
    const [ini, fim] = xp ? [n, a] : [a, n], v = ini - fim, expr = xp ? `x − ${a}` : `${a} − x`;
    const K = caixas();
    const perg = s.perg || `Qual é o valor de ${expr} quando x = ${n}?`;
    await poePergunta(perg, false);
    K.desenha([xp ? { rot: 'x', itens: [X8()] } : { rot: `${a}`, itens: [B8(a)] }]);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>${expr}</span>`);
    let p = await nota(c.notas, `Troca o x pelo ${n}. O resto fica no mesmo lugar.`, 'passo');
    await E.linha(`<span>= ${xp ? `${SB(n)} − ${a}` : `${a} − ${SB(n)}`}</span>`);
    K.desenha([{ rot: `${ini} − ${fim}`, itens: [B8(ini, { sai: fim })] }]);
    await wait(900);
    await E.final(`= ${v}`);
    await apagar(p);
    await nota(c.notas, xp ? `a ordem não muda: o ${n} fica na frente, no lugar do x` : `a ordem não muda: o ${a} continua na frente`, 'detalhe');
    await wait(600);
    await respostaFinal(`<span>${v}</span>`, { perg });
    await regras8(s, xp ? `Troca a letra, mas não muda a ordem: x − ${a} vira ${n} − ${a}.` : `Troca a letra, mas não muda a ordem: ${a} − x vira ${a} − ${n}.`);
  }
  // 10) x + x: todo x vale o mesmo
  async function cenaAlgXX(s) {
    const n = s.n ?? 5;
    const K = caixas();
    const perg = s.perg || `Qual é o valor de x + x quando x = ${n}?`;
    await poePergunta(perg, false);
    K.desenha([{ rot: 'x + x', itens: [X8(), OP8('+'), X8()] }]);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha('<span>x + x</span>');
    const p = await nota(c.notas, `Todo x da conta vale ${n}: as duas caixas abrem com ${n}.`, 'passo');
    K.desenha([{ rot: 'x + x', itens: [V8(n, 1, { entra: true }), OP8('+'), V8(n, 1, { entra: true })] }]);
    await E.linha(`<span>= ${SB(n)} + ${SB(n)}</span>`);
    await E.final(`= ${2 * n}`);
    await apagar(p);
    await pegadinha(c, `${n} × ${n} = ${n * n}`, 'x + x é somar, não multiplicar', `${n} + ${n} = ${2 * n}`);
    await respostaFinal(`<span>${2 * n}</span>`, { perg });
    await regras8(s, 'A mesma letra vale o mesmo número em toda a conta.');
  }
  // 11) ax quando x = n
  async function cenaAlgKx(s) {
    const a = s.a ?? 2, n = s.n ?? 6;
    const K = caixas();
    const perg = s.perg || `Qual é o valor de ${a}x quando x = ${n}?`;
    await poePergunta(perg, false);
    K.desenha([{ rot: `${a}x`, itens: [X8(a)] }]);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>${a}x</span>`);
    const p = await nota(c.notas, `Lembra: ${a}x é ${a} × x. Quando troca, o × aparece.`, 'passo');
    K.desenha([{ rot: `${a}x`, itens: [V8(n, a, { entra: true })] }]);
    await E.linha(`<span>= ${a} × ${SB(n)}</span>`);
    await E.final(`= ${a * n}`);
    await apagar(p);
    await pegadinha(c, `${a}${n}`, `não cola o ${a} no ${n}: entre eles tem um ×`, `${a} × ${n} = ${a * n}`);
    await respostaFinal(`<span>${a * n}</span>`, { perg });
    await regras8(s, `Número colado na letra é vezes: ${a}x com x = ${n} é ${a} × ${n}.`);
  }
  // 12) vezes e mais (ou menos): ax ± c quando x = n
  async function cenaAlgKxc(s) {
    const a = s.a ?? 2, n = s.n ?? 3, c0 = s.c ?? 1, op = s.op || '+', v = op === '+' ? a * n + c0 : a * n - c0;
    const K = caixas();
    const expr = `${a}x ${op} ${c0}`, resto = op === '+' ? B8(c0) : { t: 'h', n: c0 };
    const perg = s.perg || `Qual é o valor de ${expr} quando x = ${n}?`;
    await poePergunta(perg, false);
    K.desenha([{ rot: expr, itens: [X8(a), OP8(op), resto] }]);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>${expr}</span>`);
    let p = await nota(c.notas, `Troca o x pelo ${n}.`, 'passo');
    K.desenha([{ rot: expr, itens: [V8(n, a, { entra: true }), OP8(op), resto] }]);
    await E.linha(`<span>= ${a} × ${SB(n)} ${op} ${c0}</span>`);
    await apagar(p);
    p = await nota(c.notas, `Primeiro o ×, depois o ${op}.`, 'passo');
    await E.linha(`<span>= ${a * n} ${op} ${c0}</span>`);
    await E.final(`= ${sN(v)}`);
    await apagar(p);
    await respostaFinal(`<span>${sN(v)}</span>`, { perg });
    await regras8(s, 'Depois de trocar: primeiro × e ÷, depois + e −.');
  }
  // 13) com negativo: ax − c quando x = n (n < 0), com a reta andando para a esquerda
  async function cenaAlgNeg(s) {
    const a = s.a ?? 2, n = s.n ?? -1, c0 = s.c ?? 3, p1 = a * n, v = p1 - c0;
    const R = p1 >= -6 ? retaNum(Math.min(v - 1, -6), Math.max(2, p1 + 1)) : retaNum(v - 2, p1 + 3);   // longe do zero: só o pedaço do salto
    const perg = s.perg || `Qual é o valor de ${a}x − ${c0} quando x = ${sN(n)}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>${a}x − ${c0}</span>`);
    let p = await nota(c.notas, `Número negativo entra com parênteses: ${a} × (${sN(n)}).`, 'passo');
    await E.linha(`<span>= ${a} × (${SB(sN(n))}) − ${c0}</span>`);
    await apagar(p);
    p = await nota(c.notas, `Positivo vezes negativo dá negativo: ${a} × (${sN(n)}) = ${sN(p1)}.`, 'passo');
    await E.linha(`<span>= ${sN(p1)} − ${c0}</span>`);
    await apagar(p);
    p = await nota(c.notas, `Na reta: começa no ${sN(p1)} e anda ${c0} ${c0 === 1 ? 'casa' : 'casas'} para a esquerda.`, 'passo');
    R.ponto(p1); await wait(500);
    await R.salto(p1, v);
    R.ponto(v);
    await E.final(`= ${sN(v)}`);
    await apagar(p);
    await respostaFinal(`<span>${sN(v)}</span>`, { perg });
    await regras8(s, 'Negativo no lugar da letra: sempre entre parênteses.');
  }
  // 14) com ao quadrado: x² + c quando x = n
  async function cenaAlgQuad2(s) {
    const n = s.n ?? 3, c0 = s.c ?? 1, v = n * n + c0;
    const K = caixas();
    const perg = s.perg || `Qual é o valor de x² + ${c0} quando x = ${n}?`;
    await poePergunta(perg, false);
    K.desenha([{ rot: `x² + ${c0}`, itens: [{ t: 'q' }, OP8('+'), B8(c0)] }]);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>x² + ${c0}</span>`);
    let p = await nota(c.notas, `x² é x · x. Troca os dois pelo ${n}.`, 'passo');
    await E.linha(`<span>= ${SB(n)} × ${SB(n)} + ${c0}</span>`);
    K.desenha([{ rot: `${n} × ${n} + ${c0}`, itens: [{ t: 'grade', n, entra: true }, OP8('+'), B8(c0)] }]);
    await apagar(p);
    p = await nota(c.notas, `O quadrado de lado ${n} tem ${n * n} quadradinhos.`, 'passo');
    await E.linha(`<span>= ${n * n} + ${c0}</span>`);
    await E.final(`= ${v}`);
    await apagar(p);
    await pegadinha(c, `${n} × 2 + ${c0} = ${2 * n + c0}`, 'x² não é x vezes 2', `${n} × ${n} + ${c0} = ${v}`);
    await respostaFinal(`<span>${v}</span>`, { perg });
    await regras8(s, `x² com x = ${n}: ${n} × ${n} = ${n * n} (não ${n} × 2).`);
  }
  // 15) duas letras: a·a + b·b quando a = p e b = q
  async function cenaAlg2L(s) {
    const a = s.a ?? 3, b = s.b ?? 2, p0 = s.p ?? 2, q0 = s.q ?? 5;
    const K = caixas();
    const perg = s.perg || `Qual é o valor de ${a}a + ${b}b quando a = ${p0} e b = ${q0}?`;
    await poePergunta(perg, false);
    K.desenha([{ rot: `${a}a`, itens: [X8(a, { l: 'a' })] }, { rot: `${b}b`, itens: [X8(b, { l: 'b', cor: 'b' })] }]);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>${a}a + ${b}b</span>`);
    let p = await nota(c.notas, `Cada letra tem o seu número: o a vira ${p0} e o b vira ${q0}.`, 'passo');
    K.desenha([{ rot: `${a}a`, itens: [V8(p0, a, { entra: true, cor: 'a' })] }, { rot: `${b}b`, itens: [V8(q0, b, { entra: true, cor: 'b' })] }]);
    await E.linha(`<span>= ${a} × ${SB(p0, 'ca')} + ${b} × ${SB(q0, 'cb')}</span>`);
    await apagar(p);
    p = await nota(c.notas, 'Primeiro os ×, depois o +.', 'passo');
    await E.linha(`<span>= ${a * p0} + ${b * q0}</span>`);
    await E.final(`= ${a * p0 + b * q0}`);
    await apagar(p);
    await respostaFinal(`<span>${a * p0 + b * q0}</span>`, { perg });
    await regras8(s, 'Duas letras: cada uma troca pelo seu número.');
  }

  // ── 8-B: termos semelhantes ──
  // 1) o que é um termo
  async function cenaTermo(s) {
    const K = caixas();
    await etiqueta('TERMO', 'número e letra juntos'); ajustaTopo();
    const perg = s.perg || 'O que quer dizer 3x?';
    await poePergunta(perg, false);
    K.desenha([{ rot: '3x', itens: [X8(3)] }]);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha('<span class="parte"><span class="q">3</span><span class="o">x</span></span>');
    let p = await nota(c.notas, 'O 3 diz QUANTOS. O x diz O QUÊ: 3 caixas x.', 'passo');
    await wait(1600); await apagar(p);
    await nota(c.notas, 'como 3 maçãs: 3 diz quantas, maçã diz o quê', 'detalhe');
    await wait(900);
    p = await nota(c.notas, 'E o x sozinho? É 1 caixa: vale 1x.', 'passo');
    K.desenha([{ rot: '3x', itens: [X8(3)] }, { rot: 'x = 1x', itens: [X8(1)], entra: true }]);
    await E.linha('<span>x = 1x</span>');
    await apagar(p);
    await respostaFinal('<span>3x = 3 caixas x</span>', { perg });
    await regras8(s, 'Termo: o número diz quantos, a letra diz o quê. x sozinho é 1x.');
  }
  // 2) termos semelhantes: a vitrine dos pares { itens: [[par, sim, motivo]] }
  const PARES8 = [['3x e 5x', true, 'a mesma letra x'], ['4a e a', true, 'a = 1a'], ['7m e −2m', true, 'o sinal pode mudar'], ['2x e 2y', false, 'letras diferentes'], ['x e x²', false, 'expoentes diferentes']];
  async function cenaSemLista(s) {
    L.classList.add('sem-hist', 'r3p');
    await etiqueta('TERMOS SEMELHANTES', 'mesma letra e mesmo expoente'); ajustaTopo();
    const perg = s.perg || 'Quais pares de termos são semelhantes?';
    await poePergunta(perg, false);
    const c = cartao(); const g = el('div', 'qd-lista3', '', c.conta);
    await ler(perg);
    const p = await nota(c.notas, 'Semelhantes: a mesma letra, com o mesmo expoente. O número da frente pode ser qualquer um.', 'passo');
    for (const [par, sim, pq] of s.itens || PARES8) {
      const r = el('div', 'l3 qd-pop', `<span class="par">${esc(par)}</span><span class="vd ${sim ? 'sim' : 'nao'}" style="visibility: hidden">${sim ? '✔ sim' : '✖ não'}</span><span class="pq" style="visibility: hidden">${esc(pq)}</span>`, g);
      await wait(1800);
      r.querySelectorAll('.vd, .pq').forEach((e) => { e.style.visibility = ''; e.classList.add('qd-pop'); });
      await wait(1000);
    }
    await apagar(p);
    await respostaFinal('<span>mesma letra e mesmo expoente</span>', { perg, manter: true });
    await regras8(s, 'Só termos semelhantes se juntam numa conta.');
  }
  // 3) somar: a·l + b·l
  async function cenaSemSoma(s) {
    const l = s.l || 'x', a = s.a ?? 3, b = s.b ?? 2, r = a + b;
    const K = caixas();
    const perg = s.perg || `Quanto é ${a}${l} + ${b}${l}?`;
    await poePergunta(perg, false);
    const ln = [{ rot: `${a}${l}`, itens: [X8(a, { l })] }, { rot: `+ ${b}${l}`, itens: [X8(b, { l })] }];
    K.desenha(ln);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>${a}${l} + ${b}${l}</span>`);
    const p = await nota(c.notas, `${a} caixas mais ${b} caixas: ${r} caixas. Soma os números e repete a letra.`, 'passo');
    await E.linha(`<span>= (${a} + ${b})${l}</span>`);
    K.desenha([...ln, { rot: `= ${r}${l}`, itens: [X8(r, { l })], entra: true }]);
    await E.final(`= ${r}${l}`);
    await apagar(p);
    await pegadinha(c, `${r}${l}²`, `a letra não muda: continua ${l}`, `${r}${l}`);
    await respostaFinal(`<span>${r}${l}</span>`, { perg });
    await regras8(s, 'Somar semelhantes: soma os números e repete a letra.');
  }
  // 4) a letra sozinha vale 1: { partes: [{ termos: [1, 1, 1], l, perg }] }
  async function cenaSemUm(s) {
    const partes = s.partes || [{ termos: [1, 1, 1], l: 'x', perg: 'Quanto é x + x + x?' }, { termos: [4, 1], l: 'a', perg: 'E quanto é 4a + a?' }];
    const K = caixas();
    let c = null, perg = '';
    for (const [i, pt] of partes.entries()) {
      const l = pt.l, ts = pt.termos, r = ts.reduce((x, y) => x + y, 0), expr = ts.map((t) => mono8(t, l)).join(' + ');
      perg = (i === 0 && s.perg) || pt.perg || `Quanto é ${expr}?`;
      if (c) await paraHist(c);
      await poePergunta(perg, false);
      const uns = ts.every((t) => t === 1);
      const ln = uns ? [{ rot: expr, itens: ts.flatMap((t, j) => (j ? [OP8('+'), X8(1, { l })] : [X8(1, { l })])) }]
        : ts.map((t, j) => ({ rot: (j ? '+ ' : '') + mono8(t, l), itens: [X8(t, { l })] }));
      K.desenha(ln);
      c = cartao(); const E = contaEq(c.conta);
      await ler(perg);
      await E.linha(`<span>${expr}</span>`);
      const p = await nota(c.notas, uns ? `Cada ${l} sozinho é 1${l}.` : `O ${l} sozinho é 1${l}.`, 'passo');
      await E.linha(`<span>= ${ts.map((t) => `${t}${l}`).join(' + ')}</span>`);
      K.desenha([...ln, { rot: `= ${r}${l}`, itens: [X8(r, { l })], entra: true }]);
      await E.final(`= ${r}${l}`);
      await apagar(p);
      if (i === partes.length - 1) { await respostaFinal(`<span>${r}${l}</span>`, { perg }); }
    }
    await regras8(s, 'Letra sozinha vale 1: x = 1x, a = 1a.');
  }
  // 5) subtrair: a·l − b·l
  async function cenaSemSub(s) {
    const l = s.l || 'a', a = s.a ?? 7, b = s.b ?? 3, r = a - b, res = r === 0 ? '0' : mono8(r, l);
    const K = caixas();
    const expr = `${mono8(a, l)} − ${mono8(b, l)}`;
    const perg = s.perg || `Quanto é ${expr}?`;
    await poePergunta(perg, false);
    K.desenha([{ rot: mono8(a, l), itens: [X8(a, { l })] }]);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>${expr}</span>`);
    const p = await nota(c.notas, `Tinha ${a} caixas ${l}, tira ${b}: sobra${r === 1 ? '' : 'm'} ${r}.`, 'passo');
    const tira = { rot: expr, itens: [X8(a, { l, sai: b })] };
    K.desenha([tira]);
    await wait(1000);
    await E.linha(`<span>= (${a} − ${b})${l}</span>`);
    K.desenha([tira, { rot: `= ${res}`, itens: r ? [X8(r, { l })] : [], entra: true }]);
    await E.final(`= ${res}`);
    await apagar(p);
    const det = s.detalhe !== undefined ? s.detalhe : r === 0 ? 'tirou todas as caixas: sobra 0' : 'e 8m − 8m = 0: tirou todas as caixas';
    if (det) { await nota(c.notas, det, 'detalhe'); await wait(900); }
    await respostaFinal(`<span>${res}</span>`, { perg });
    await regras8(s, 'Subtrair semelhantes: subtrai os números e repete a letra.');
  }
  // 6) três termos: { l, ts: [10, −4, 1] } (da esquerda para a direita)
  async function cenaSemTres(s) {
    const l = s.l || 'a', ts = s.ts || [10, -4, 1], [t0, t1, t2] = ts, r1 = t0 + t1, r = r1 + t2;
    const sg = (t) => (t < 0 ? '−' : '+'), parte = (t) => `${sg(t)} ${mono8(Math.abs(t), l)}`;
    const expr = `${mono8(t0, l)} ${parte(t1)} ${parte(t2)}`, dois = `${mono8(t0, l)} ${parte(t1)}`, meio = `${mono8(r1, l)} ${parte(t2)}`;
    const K = caixas();
    const perg = s.perg || `Quanto é ${expr}?`;
    await poePergunta(perg, false);
    K.desenha([{ rot: mono8(t0, l), itens: [X8(t0, { l })] }]);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>${expr}</span>`);
    let p = await nota(c.notas, `Da esquerda para a direita. Primeiro ${dois}.`, 'passo');
    const l1 = { rot: dois, itens: t1 < 0 ? [X8(t0, { l, sai: -t1 })] : [X8(t0, { l }), OP8('+'), X8(t1, { l, entra: true })] };
    K.desenha([l1]);
    await E.linha(`<span>= ${meio}</span>`);
    await apagar(p);
    p = await nota(c.notas, Math.abs(t2) === 1 ? `Depois ${sg(t2)} ${l} (que é 1${l}).` : `Depois ${parte(t2)}.`, 'passo');
    K.desenha([l1, { rot: meio, itens: t2 < 0 ? [X8(r1, { l, sai: -t2 })] : [X8(r1, { l }), OP8('+'), X8(t2, { l, entra: true })], entra: true }]);
    await E.final(`= ${mono8(r, l)}`);
    await apagar(p);
    await respostaFinal(`<span>${mono8(r, l)}</span>`, { perg });
    await regras8(s, 'Vários termos: vai da esquerda para a direita, um de cada vez.');
  }
  // 7) diferentes não juntam: a·l + c
  async function cenaSemDif(s) {
    const l = s.l || 'x', a = s.a ?? 2, c0 = s.c ?? 3, expr = `${mono8(a, l)} + ${c0}`;
    const K = caixas(`caixa ${l} e quadradinho: coisas diferentes`);
    const perg = s.perg || `Dá para juntar ${expr} num termo só?`;
    await poePergunta(perg, false);
    K.desenha([{ rot: expr, itens: [X8(a, { l }), OP8('+'), B8(c0)] }]);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>${expr}</span>`);
    const p = await nota(c.notas, `${mono8(a, l)} tem letra, o ${c0} não tem: não são semelhantes. Não juntam.`, 'passo');
    await wait(1500); await apagar(p);
    await pegadinha(c, `${a + c0}${l}`, `${a + c0}${l} seriam ${a + c0} caixas, mas só tem ${a}`, expr);
    await respostaFinal(`<span>${expr} (já está pronto)</span>`, { perg });
    await regras8(s, `Letra com número sem letra não juntam: ${expr} fica ${expr}.`);
  }
  // 8–10) simplificar: { tipo: 'xkx' | 'menos' | '2l', termos: [[coef com sinal, letra ou '']] }
  // o 1º grupo (gA) é a 1ª letra; o 2º (gB), os números ou a 2ª letra; o sinal vai pintado junto com o termo
  async function cenaSimpl(s) {
    const tipo = s.tipo || 'xkx';
    const termos = s.termos || { xkx: [[1, 'x'], [2, ''], [1, 'x']], menos: [[3, 'x'], [2, ''], [-1, 'x'], [5, '']], '2l': [[2, 'a'], [3, 'b'], [4, 'a'], [-1, 'b']] }[tipo];
    const lA = termos.find(([, l]) => l)[1], lB = (termos.find(([, l]) => l && l !== lA) || [0, ''])[1];
    const naA = (t) => t[1] === lA, txt = ([c, l]) => (l ? mono8(Math.abs(c), l) : String(Math.abs(c)));
    const cor = (t, h) => (naA(t) ? gA(h) : gB(h));
    const expr = termos.map((t, i) => `${i ? (t[0] < 0 ? '− ' : '+ ') : t[0] < 0 ? '−' : ''}${txt(t)}`).join(' ');
    const l1 = termos.map((t, i) => (t[0] < 0 ? cor(t, `− ${txt(t)}`) : `${i ? '+ ' : ''}${cor(t, txt(t))}`)).join(' ');
    const grupo = (ts) => ts.map((t, i) => `${i ? (t[0] < 0 ? '− ' : '+ ') : t[0] < 0 ? '− ' : ''}${txt(t)}`).join(' ');
    const TA = termos.filter(naA), TB = termos.filter((t) => !naA(t));
    const soma = (ts) => ts.reduce((x, t) => x + t[0], 0), pos = (ts) => ts.filter((t) => t[0] > 0), neg = (ts) => ts.filter((t) => t[0] < 0);
    const rA = soma(TA), rB = soma(TB), gAx = grupo(TA), gBx = grupo(TB);
    const l2 = `= ${gA(gAx)} ${TB[0][0] < 0 ? gB(gBx) : `+ ${gB(gBx)}`}`;
    const resB = lB ? mono8(Math.abs(rB), lB) : String(Math.abs(rB));
    const final = rB === 0 ? mono8(rA, lA) : `${mono8(rA, lA)} ${rB < 0 ? '−' : '+'} ${resB}`;
    const itemB = (n, ex = {}) => (lB ? X8(n, { l: lB, cor: 'b', ...ex }) : B8(n, ex));
    const itemT = (t, ex = {}) => (t[1] ? (naA(t) ? X8(Math.abs(t[0]), { l: t[1], ...ex }) : itemB(Math.abs(t[0]), ex)) : B8(Math.abs(t[0]), ex));
    const juntaPos = (ts) => pos(ts).flatMap((t, i) => (i ? [OP8('+'), itemT(t)] : [itemT(t)]));
    const K = caixas();
    if (tipo === 'xkx') { await etiqueta('SIMPLIFICAR', 'junta os semelhantes'); ajustaTopo(); }
    const perg = s.perg || `Simplifique ${expr}.`;
    await poePergunta(perg, false);
    if (tipo === 'xkx') K.desenha([{ rot: expr, itens: termos.flatMap((t, i) => (i ? [OP8(t[0] < 0 ? '−' : '+'), itemT(t)] : [itemT(t)])) }]);
    else K.desenha([{ rot: tipo === '2l' ? gAx : grupo(pos(TA)), itens: juntaPos(TA) }, { rot: tipo === '2l' ? gBx : grupo(pos(TB)), itens: juntaPos(TB) }]);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>${l1}</span>`);
    let p;
    const nomeB = lB ? `os ${lB}` : 'os números';
    if (tipo === 'xkx') {
      p = await nota(c.notas, `Pinta os iguais: os ${lA} de uma cor, ${nomeB} de outra.`, 'passo');
      await wait(1200); await apagar(p);
      p = await nota(c.notas, `Junta os ${lA} com os ${lA} e ${nomeB} com ${nomeB}.`, 'passo');
    } else if (tipo === 'menos') {
      const tn = termos.find((t) => t[0] < 0);
      p = await nota(c.notas, `O sinal vai junto do termo: o "−" fica grudado no ${txt(tn)}.`, 'passo');
      await wait(1400); await apagar(p);
      p = await nota(c.notas, `Junta os ${lA}: ${gAx}. Junta ${nomeB}: ${gBx}.`, 'passo');
    } else p = await nota(c.notas, `Os ${lA} com os ${lA}. ${nomeB[0].toUpperCase() + nomeB.slice(1)} com ${nomeB}.`, 'passo');
    await E.linha(`<span>${l2}</span>`);
    const sp = (ts) => pos(ts).reduce((x, t) => x + t[0], 0), sn = (ts) => -neg(ts).reduce((x, t) => x + t[0], 0);
    const depois = (ts, mk, rot) => ({ rot, itens: sp(ts) ? [mk(sp(ts), sn(ts) ? { sai: sn(ts) } : {})] : [] });
    if (tipo === 'xkx') K.desenha([depois(TA, (n, ex) => X8(n, { l: lA, ...ex }), gAx), depois(TB, itemB, `+ ${gBx}`)]);
    else K.desenha([depois(TA, (n, ex) => X8(n, { l: lA, ...ex }), gAx), depois(TB, itemB, gBx)]);
    await wait(tipo === 'xkx' ? 0 : tipo === 'menos' ? 800 : 900);
    await E.final(`= ${final}`);
    await apagar(p);
    if (tipo === 'menos') {
      const nA = neg(TA)[0];
      if (nA) await pegadinha(c, `${mono8(sp(TA) + sn(TA), lA)} ${rB < 0 ? '−' : '+'} ${resB}`, `o − ${txt(nA)} tira ${Math.abs(nA[0]) === 1 ? 'uma caixa' : `${-nA[0]} caixas`}, não soma`, final);
      else { const nB = neg(TB)[0]; await pegadinha(c, `${mono8(rA, lA)} + ${sp(TB) + sn(TB)}`, `o − ${txt(nB)} tira ${-nB[0]}, não soma`, final); }
    } else if (tipo === '2l') await pegadinha(c, `${rA + rB}${lA}${lB}`, `${lA} e ${lB} são letras diferentes: não juntam`, final);
    await respostaFinal(`<span>${final}</span>`, { perg });
    await regras8(s, { xkx: `Simplificar: junta ${lA} com ${lA} e número com número.`, menos: 'O sinal da frente vai junto com o termo quando ele muda de lugar.', '2l': `Cada letra no seu grupo: ${lA} com ${lA}, ${lB} com ${lB}.` }[tipo]);
  }
  // 11) perímetro com letra: { partes: ['q', 'r'], k } (quadrado de lado x; retângulo de lados x e k)
  function quadroLado(F, l1, l2, quad) {
    const S = F.S, x0 = .2 * S, y0 = .18 * S, w = quad ? .55 * S : .62 * S, h = quad ? .55 * S : .36 * S;
    F.mk('rect', { x: x0, y: y0, width: w, height: h, class: 'pm-fig' });
    const lados = [[x0 + w / 2, y0 - F.fs * 1.1, l1], [x0 + w + F.fs * 1.2, y0 + h / 2, l2], [x0 + w / 2, y0 + h + F.fs * 1.1, l1], [x0 - F.fs * 1.2, y0 + h / 2, l2]];
    return lados.map(([x, y, t]) => { const e = F.txt(x, y, t, 'pm-lado ' + (t === 'x' ? 'lx' : 'ln')); e.style.visibility = 'hidden'; e.style.fontSize = F.fs * 1.5 + 'px'; return e; });
  }
  async function cenaPerimL(s) {
    const partes = s.partes || ['q', 'r'], k = s.k ?? 3;
    let c = null, perg = '';
    for (const [i, pt] of partes.entries()) {
      const F = ladoSvg(), quad = pt === 'q', lados = quadroLado(F, 'x', quad ? 'x' : String(k), quad);
      perg = (i === 0 && s.perg) || (quad ? 'Qual é o perímetro de um quadrado de lado x?' : i ? `E de um retângulo de lados x e ${k}?` : `Qual é o perímetro de um retângulo de lados x e ${k}?`);
      if (c) await paraHist(c);
      await poePergunta(perg, false);
      c = cartao(); const E = contaEq(c.conta);
      await ler(perg);
      let p = await nota(c.notas, quad ? 'Perímetro: soma os 4 lados. Cada lado mede x.' : `Dois lados medem x e dois medem ${k}.`, 'passo');
      for (const e of lados) { e.style.visibility = ''; e.classList.add('qd-pop'); await wait(500); }
      if (quad) { await E.linha('<span>x + x + x + x</span>'); await E.final('= 4x'); await apagar(p); }
      else {
        await E.linha(`<span>${gA('x')} + ${gB(k)} + ${gA('x')} + ${gB(k)}</span>`);
        await apagar(p);
        p = await nota(c.notas, 'Junta os x e os números.', 'passo');
        await E.linha(`<span>= ${gA('x + x')} + ${gB(`${k} + ${k}`)}</span>`);
        await E.final(`= 2x + ${2 * k}`);
        await apagar(p);
      }
    }
    const ult = partes[partes.length - 1];
    await respostaFinal(`<span>${ult === 'q' ? '4x' : `2x + ${2 * k}`}</span>`, { perg });
    await regras8(s, 'Perímetro com letra: soma os lados e junta os semelhantes.');
  }

  // ══════════════════ 5-B, 6 e 7: raízes, múltiplos, divisores e porcentagem (PROMPT-221; protótipos referencia/lousa-5b/6a/6b/7a/7b.html) ══════════════════
  // As cenas recebem os números (a aula usa os do protótipo; o cartão do erro, os da questão).
  const nf = (v) => (Number.isInteger(v) ? (Math.abs(v) >= 10000 ? v.toLocaleString('pt-BR') : String(v)) : String(+v.toFixed(4)).replace('.', ','));
  const SUP5 = '⁰¹²³⁴⁵⁶⁷⁸⁹', supN = (n) => String(n).split('').map((d) => SUP5[d]).join('');
  const negS = (v) => (v < 0 ? '−' + nf(-v) : nf(v));
  const dec2 = (p) => nf(p / 100);   // 25 → 0,25
  const rs = (v) => (Number.isInteger(v) ? nf(v) : v.toFixed(2).replace('.', ','));   // dinheiro: 22,50
  const CORES5 = ['#8fd3ff', '#ffd23f', '#c99bff', '#7dffb0', '#ff9fb5'];
  // n quadradinhos em fileiras de "por": cada fileira completa numa cor; o que sobra fica com borda vermelha
  function fileiras(legenda) {
    const F = ladoSvg(), S = F.S, g = F.mk('g', {});
    if (legenda) F.txt(.5 * S, .96 * S, legenda, 'bl-leg');
    return { F,
      desenha({ n, por, rot, cor = true, conta = false, sobraRot }) {
        g.innerHTML = '';
        const lin = Math.ceil(n / por), topo = .1 * S, alt = .74 * S;
        const q = Math.min(alt / lin / 1.15, .7 * S / por / 1.15, .13 * S), x0 = .5 * S - por * q * 1.15 / 2, y0 = topo + (alt - lin * q * 1.15) / 2;
        if (rot) { const t = F.txt(.5 * S, topo - F.fs * .6, rot, 'cx-rot', g); t.style.fontSize = F.fs * 1.25 + 'px'; }
        for (let i = 0; i < n; i++) {
          const r = Math.floor(i / por), c = i % por, sobra = r === lin - 1 && n % por !== 0;
          const e = F.mk('rect', { x: x0 + c * q * 1.15, y: y0 + r * q * 1.15, width: q, height: q, rx: 2, class: 'bl-it gr-q' + (sobra ? ' sobra' : '') }, g);
          if (cor && !sobra) e.style.fill = CORES5[r % 5];
        }
        if (conta) for (let r = 0; r < lin; r++) { const sobra = r === lin - 1 && n % por !== 0; F.txt(x0 - F.fs * 1.1, y0 + r * q * 1.15 + q / 2, sobra ? '' : String(r + 1), 'gr-conta', g); }
        if (n % por && sobraRot) F.txt(x0 + (n % por) * q * 1.15 + F.fs * .4, y0 + (lin - 1) * q * 1.15 + q / 2, sobraRot, 'gr-sobra', g, 'start');
      },
      // vários retângulos lado a lado: [[fileiras, por], …] (os pares de divisores)
      retangulos(lista) {
        g.innerHTML = '';
        const tot = lista.length, larg = .9 * S / tot;
        lista.forEach(([a, b], k) => {
          const q = Math.min(larg * .8 / b / 1.12, .6 * S / a / 1.12, .07 * S), cx = .05 * S + larg * (k + .5), x0 = cx - b * q * 1.12 / 2, y0 = .18 * S;
          for (let r = 0; r < a; r++) for (let c = 0; c < b; c++) { const e = F.mk('rect', { x: x0 + c * q * 1.12, y: y0 + r * q * 1.12, width: q, height: q, rx: 1.5, class: 'bl-it gr-q entra' }, g); e.style.fill = CORES5[k % 5]; }
          const t = F.txt(cx, y0 - F.fs * .9, `${a} × ${b}`, 'cx-rot', g); t.style.fontSize = F.fs * 1.1 + 'px';
        });
      },
    };
  }
  // pulos de k em k na reta (múltiplos): "+k" em cima, o múltiplo embaixo
  function pulosK(ate, k, passo) {
    const R = retaNum(0, ate, passo || k);
    return { R,
      async vai(vezes, ms = 600) {
        R.ponto(0);
        for (let i = 0; i < vezes; i++) {
          const a = i * k, b = a + k, X = R.X, y = R.y, u = X(1) - X(0), m = (X(a) + X(b)) / 2;
          R.F.mk('path', { d: `M${X(a)} ${y - 4} Q${m} ${y - u * k * .55} ${X(b)} ${y - 4}`, class: 'rn-salto' });
          R.F.txt(m, y - u * k * .42 - R.F.fs * .5, '+' + k, 'bl-leg');
          R.ponto(b); R.F.txt(X(b), y + R.F.fs * 2.4, String(b), 'pl-mult');
          await wait(ms);
        }
      },
    };
  }
  // a grade de 100 (porcentagem), pintando de fileira em fileira
  function cem() {
    const F = ladoSvg(), S = F.S, q = .068 * S, x0 = .5 * S - 5 * q * 1.08, y0 = .06 * S;
    const cels = [];
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) cels.push(F.mk('rect', { x: x0 + c * q * 1.08, y: y0 + r * q * 1.08, width: q, height: q, rx: 1.5, class: 'cem-c' }));
    const rot = F.txt(.5 * S, y0 + 10 * q * 1.08 + F.fs * 1.4, '', 'cx-rot'); rot.style.fontSize = F.fs * 1.25 + 'px';
    return { F,
      async pinta(n, cls = 'on', ms = 0, txt) {
        cels.forEach((e) => e.classList.remove('on', 'on2'));
        for (let i = 0; i < n; i++) { cels[i].classList.add(cls); if (ms && i % 10 === 9) await wait(ms); }
        rot.textContent = txt === undefined ? `${n} de 100` : txt;
      },
    };
  }
  const regras5 = async (s, padrao) => { for (const r of s.regras || [padrao]) await regra(r); };

  // ── 5-B: raízes e casos especiais ──
  // 1) raiz quadrada: √(r²) com o quadrado de lado r
  async function cenaRaiz1(s) {
    const r = s.r ?? 4, n = r * r;
    const K = caixas('cada quadradinho = 1');
    await etiqueta('RAIZ QUADRADA', 'o número que vezes ele mesmo dá'); ajustaTopo();
    const perg = s.perg || `Quanto é √${n}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, `√${n} pergunta: qual número vezes ele mesmo dá ${n}?`, 'passo');
    await E.linha(`<span>? × ? = ${n}</span>`, 1300);
    await apagar(p);
    p = await nota(c.notas, `Monta um quadrado com ${n} ${n === 1 ? 'quadradinho' : 'quadradinhos'}: o lado tem ${r}.`, 'passo');
    K.desenha([{ rot: `${n} ${n === 1 ? 'quadradinho' : 'quadradinhos'}`, itens: [{ t: 'grade', n: r, entra: true }] }]);
    await wait(1200);
    await E.linha(`<span>${SB(r)} × ${SB(r)} = ${n}</span>`);
    await apagar(p);
    await E.final(`√${n} = ${r}`);
    const h = n / 2;
    if (h !== r) await pegadinha(c, `${n} ÷ 2 = ${nf(h)}`, `raiz não é a metade: ${nf(h)} × ${nf(h)} = ${nf(h * h)}`, `${r} × ${r} = ${n}`);
    await respostaFinal(`<span>√${n} = ${r}</span>`, { perg });
    await regras5(s, 'Raiz quadrada: o número que, vezes ele mesmo, dá o de dentro. É o lado do quadrado.');
  }
  // 2) testando: r − 2, r − 1, r
  async function cenaRaiz2(s) {
    const r = s.r ?? 7, n = r * r;
    const K = caixas();
    const perg = s.perg || `Quanto é √${n}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    const p = await nota(c.notas, `Não sabe de cabeça? Testa: um número vezes ele mesmo, até chegar no ${n}.`, 'passo');
    for (const k of [r - 2, r - 1, r].filter((x) => x > 0)) {
      const ok = k === r;
      K.desenha([{ rot: `${k} × ${k} = ${k * k}`, itens: [{ t: 'grade', n: k, entra: true }] }]);
      const l = await E.linha(`<span>${k} × ${k} = ${k * k}</span><span class="${ok ? 'vok' : 'pz'}">${ok ? '✔' : 'pouco'}</span>`, 1300);
      if (!ok) l.classList.add('apaga-l');
    }
    await apagar(p);
    await E.final(`√${n} = ${r}`);
    await respostaFinal(`<span>√${n} = ${r}</span>`, { perg });
    await regras5(s, `Raiz: testa 1 × 1, 2 × 2, 3 × 3… até achar o número de dentro.`);
  }
  // 3) quadrados perfeitos: a tabela de 1 a 10
  async function cenaQuadTab(s) {
    L.classList.add('sem-hist', 'r3p');
    const perg = s.perg || 'Quais raízes vale a pena saber de cor?';
    await poePergunta(perg, false);
    const c = cartao();
    const t = el('div', 'qd-tab2', '', c.conta);
    await ler(perg);
    const p = await nota(c.notas, 'Os quadrados de 1 a 10. A raiz faz o caminho de volta.', 'passo');
    el('div', 'h', 'n', t); el('div', 'h', 'n²', t);
    for (let n = 1; n <= 10; n++) { el('div', 'qd-pop', String(n), t); el('div', 'v qd-pop', String(n * n), t); await wait(500); }
    await apagar(p);
    await nota(c.notas, 'olhando de baixo para cima: √100 = 10, √81 = 9, √1 = 1', 'detalhe');
    await wait(1200);
    await respostaFinal(`<span>${s.resp || '√1 = 1 · √100 = 10'}</span>`, { perg, manter: true });
    await regras5(s, 'Saber os quadrados de 1 a 10 é saber as raízes de 1 a 100.');
  }
  // 4) elevado a 1
  async function cenaExp1(s) {
    const b = s.b ?? 5;
    const K = caixas();
    await etiqueta('CASOS ESPECIAIS', 'elevado a 1 e a 0'); ajustaTopo();
    const perg = s.perg || `Quanto é ${b}¹?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, `O expoente diz quantas vezes o ${b} aparece na multiplicação.`, 'passo');
    await E.linha(`<span>${b}³ = ${b} × ${b} × ${b}</span>`, 1100);
    await E.linha(`<span>${b}² = ${b} × ${b}</span>`, 1100);
    await apagar(p);
    p = await nota(c.notas, `Expoente 1: o ${b} aparece uma vez só. Não tem nada para multiplicar.`, 'passo');
    K.desenha([{ rot: `${b}¹`, itens: [b <= 20 ? { t: 'b', n: b, entra: true } : { t: 'v', v: b, n: 1, entra: true }] }]);
    await E.final(`${b}¹ = ${b}`);
    await apagar(p);
    await pegadinha(c, `${b}¹ = 1`, 'elevado a 1 dá o próprio número', `${b}¹ = ${b}`);
    await respostaFinal(`<span>${b}¹ = ${b}</span>`, { perg });
    await regras5(s, 'Elevado a 1: dá o próprio número. 100¹ = 100.');
  }
  // 5) elevado a 0: o padrão ÷ b
  async function cenaExp0(s) {
    const b = s.b ?? 7;
    const perg = s.perg || `Quanto é ${b}⁰?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, `Olha o padrão: cada vez que o expoente diminui 1, divide por ${b}.`, 'passo');
    await E.linha(`<span>${b}³ = ${nf(b ** 3)}</span>`, 900);
    await E.linha(`<span>${b}² = ${nf(b ** 2)}</span><span class="pz">${nf(b ** 3)} ÷ ${b}</span>`, 1200);
    await E.linha(`<span>${b}¹ = ${b}</span><span class="pz">${nf(b ** 2)} ÷ ${b}</span>`, 1200);
    await apagar(p);
    p = await nota(c.notas, `O próximo: ${b} ÷ ${b} = 1.`, 'passo');
    await E.linha(`<span>${b}⁰ = 1</span><span class="pz">${b} ÷ ${b}</span>`, 1200);
    await apagar(p);
    await pegadinha(c, `${b}⁰ = 0`, 'elevado a 0 não dá 0: dá 1', `${b}⁰ = 1`);
    await respostaFinal(`<span>${b}⁰ = 1</span>`, { perg });
    await regras5(s, 'Todo número (menos o zero) elevado a 0 dá 1.');
  }
  // 6) negativo com expoente par: (b)ⁿ, b < 0
  async function cenaNegPar(s) {
    const b = s.b ?? -3, n = s.n ?? 2, v = b ** n, B = `(${negS(b)})`, P = `${B}${supN(n)}`;
    await etiqueta('BASE NEGATIVA', 'o sinal também multiplica'); ajustaTopo();
    const perg = s.perg || `Quanto é ${P}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, `O parêntese diz: o ${negS(b)} inteiro é a base. Ele aparece ${n} vezes.`, 'passo');
    await E.linha(`<span>${P} = ${Array(n).fill(B).join(' × ')}</span>`, 1300);
    await apagar(p);
    if (n > 2) {
      p = await nota(c.notas, 'Os sinais de menos formam pares: menos vezes menos dá mais.', 'passo');
      await E.linha(`<span>= ${Array(n / 2).fill(nf(b * b)).join(' × ')}</span>`, 1100);
    } else p = await nota(c.notas, 'Menos vezes menos dá mais.', 'passo');
    await E.linha(`<span>= +${nf(v)}</span>`, 1100);
    await apagar(p);
    await nota(c.notas, '− × − = +', 'detalhe');
    await pegadinha(c, `${P} = −${nf(v)}`, 'dois sinais de menos se cancelam', `${P} = ${nf(v)}`);
    await respostaFinal(`<span>${P} = ${nf(v)}</span>`, { perg });
    await regras5(s, 'Negativo com expoente par dá positivo.');
  }
  // 7) negativo com expoente ímpar
  async function cenaNegImpar(s) {
    const b = s.b ?? -2, n = s.n ?? 3, v = b ** n, B = `(${negS(b)})`, P = `${B}${supN(n)}`, b2 = b * b;
    const perg = s.perg || `Quanto é ${P}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, `O ${negS(b)} aparece ${n} vezes. Multiplica de dois em dois.`, 'passo');
    await E.linha(`<span>${Array(n).fill(B).join(' × ')}</span>`, 1200);
    await apagar(p);
    p = await nota(c.notas, n === 3 ? `Os dois primeiros: menos com menos dá mais, ${nf(b2)}.` : `Cada par: menos com menos dá mais, ${nf(b2)}.`, 'passo');
    await E.linha(`<span>= ${Array((n - 1) / 2).fill(nf(b2)).join(' × ')} × ${B}</span>`, 1200);
    if (n > 3) await E.linha(`<span>= ${nf(b2 ** ((n - 1) / 2))} × ${B}</span>`, 1100);
    await apagar(p);
    p = await nota(c.notas, 'Mais com menos dá menos.', 'passo');
    await E.final(`= ${negS(v)}`);
    await apagar(p);
    await nota(c.notas, 'sobrou um sinal de menos sem par', 'detalhe');
    await wait(900);
    await respostaFinal(`<span>${P} = ${negS(v)}</span>`, { perg });
    await regras5(s, 'Negativo com expoente ímpar dá negativo. Par: positivo.');
  }
  // 8) raiz e potência juntas: √(r²) ± bⁿ
  async function cenaRaizPot(s) {
    const r = s.r ?? 7, b = s.b ?? 3, n = s.n ?? 2, op = s.op || '+', pv = b ** n, v = op === '+' ? r + pv : r - pv, Pw = `${b}${supN(n)}`;
    const perg = s.perg || `Quanto é √${r * r} ${op} ${Pw}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, `Primeiro resolve a raiz e a potência. Depois ${op === '+' ? 'a soma' : 'a subtração'}.`, 'passo');
    await E.linha(`<span>√${r * r} ${op} ${Pw}</span>`, 900);
    await apagar(p);
    p = await nota(c.notas, `√${r * r} = ${r} (${r} × ${r} = ${r * r}) e ${Pw} = ${Array(n).fill(b).join(' × ')} = ${pv}.`, 'passo');
    await E.linha(`<span>= ${SB(r)} ${op} ${SB(pv)}</span>`, 1300);
    await apagar(p);
    await E.final(`= ${negS(v)}`);
    if (b * n !== pv) await pegadinha(c, `${Pw} = ${b * n}`, `${Pw} é ${Array(n).fill(b).join(' × ')}, não ${b} × ${n}`, `${Pw} = ${pv}`);
    await respostaFinal(`<span>${negS(v)}</span>`, { perg });
    await regras5(s, 'Raiz e potência primeiro; depois + e −.');
  }

  // ── 6-A: múltiplos ──
  // 1) o que é múltiplo: a tabuada e os pulos
  async function cenaMultiplos(s) {
    const k = s.k ?? 3, P = pulosK(5 * k, k);
    await etiqueta('MÚLTIPLOS', 'a tabuada do número'); ajustaTopo();
    const perg = s.perg || `Quais são os múltiplos de ${k}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, `Múltiplo de ${k} é o resultado da tabuada do ${k}.`, 'passo');
    for (let i = 1; i <= 5; i++) await E.linha(`<span>${k} × ${i} = ${SB(k * i)}</span>`, 500);
    await apagar(p);
    p = await nota(c.notas, `Na reta: pula de ${k} em ${k}, começando no 0.`, 'passo');
    await P.vai(5);
    await apagar(p);
    await nota(c.notas, `o 0 também é múltiplo (${k} × 0); a lista não acaba`, 'detalhe');
    await wait(900);
    await respostaFinal(`<span>0, ${[1, 2, 3, 4, 5].map((i) => k * i).join(', ')}…</span>`, { perg });
    await regras5(s, 'Múltiplos de um número: a tabuada dele (de k em k, a partir do 0).');
  }
  // 2 e 3) n é múltiplo de k? (fileiras de k; o que sobra fica vermelho)
  async function cenaEhMult(s) {
    const n = s.n ?? 18, k = s.k ?? 3, q = Math.floor(n / k), r = n % k, sim = r === 0;
    const G = fileiras();
    const perg = s.perg || `${n} é múltiplo de ${k}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    const p = await nota(c.notas, sim ? `Para saber, divide: ${n} ÷ ${k}. Se não sobrar nada, é múltiplo.` : `Divide ${n} por ${k}.`, 'passo');
    G.desenha({ n, por: k, rot: `${n} em fileiras de ${k}`, conta: true, sobraRot: sim ? undefined : r === 1 ? 'sobra 1' : `sobram ${r}` });
    await wait(1500);
    await E.linha(`<span>${n} ÷ ${k} = ${q}</span>`);
    await E.linha(`<span>sobra ${r}</span><span class="${sim ? 'vok' : 'vno'}">${sim ? '✔' : '✖'}</span>`);
    await apagar(p);
    await nota(c.notas, sim ? `deu ${q} fileiras certinhas: ${k} × ${q} = ${n}` : `a tabuada do ${k} pula o ${n}: ${k * q}, ${k * (q + 1)}`, 'detalhe');
    await wait(800);
    await respostaFinal(`<span>${sim ? `sim: ${n} é múltiplo de ${k}` : `não: ${n} não é múltiplo de ${k}`}</span>`, { perg });
    await regras5(s, sim ? 'É múltiplo quando a divisão não sobra nada.' : 'Sobrou alguma coisa na divisão: não é múltiplo.');
  }
  // 4) múltiplos de 2: os pares
  async function cenaMult2(s) {
    const n = s.n ?? 13, d = n % 10, par = n % 2 === 0;
    const perg = s.perg || `${n} é múltiplo de 2?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, 'Múltiplos de 2 são os números pares.', 'passo');
    await E.linha('<span>0, 2, 4, 6, 8, 10, 12, 14…</span>', 1300);
    await apagar(p);
    p = await nota(c.notas, 'Atalho: par termina em 0, 2, 4, 6 ou 8.', 'passo');
    await E.linha(`<span>${n} termina em ${d}: ${par ? 'par' : 'ímpar'}</span><span class="${par ? 'vok' : 'vno'}">${par ? '✔' : '✖'}</span>`, 1300);
    await apagar(p);
    await nota(c.notas, `confere: ${n} ÷ 2 = ${Math.floor(n / 2)} e sobra ${n % 2}`, 'detalhe');
    await wait(900);
    await respostaFinal(`<span>${par ? `sim: ${n} é par` : `não: ${n} é ímpar`}</span>`, { perg });
    await regras5(s, 'Múltiplo de 2: termina em 0, 2, 4, 6 ou 8 (é par).');
  }
  // 5) múltiplos de 5 e de 10 (so: 5 | 10 → só a parte da questão)
  async function cenaMult510(s) {
    const n = s.n ?? 25, so = s.so || 0, d = n % 10, m5 = d === 0 || d === 5, m10 = d === 0;
    const perg = s.perg || `${n} é múltiplo de 5? E de 10?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p;
    if (so !== 10) {
      p = await nota(c.notas, 'Múltiplos de 5 terminam em 0 ou 5.', 'passo');
      await E.linha('<span>5, 10, 15, 20, 25, 30…</span>', 1200);
      await E.linha(`<span>${n} ${m5 ? '' : 'não '}termina em ${m5 ? d : '0 nem 5'}</span><span class="${m5 ? 'vok' : 'vno'}">${m5 ? '✔' : '✖'} de 5</span>`, 1200);
      await apagar(p);
    }
    if (so !== 5) {
      p = await nota(c.notas, 'Múltiplos de 10 terminam em 0.', 'passo');
      await E.linha('<span>10, 20, 30, 40…</span>', 1200);
      await E.linha(`<span>${n} ${m10 ? '' : 'não '}termina em 0</span><span class="${m10 ? 'vok' : 'vno'}">${m10 ? '✔' : '✖'} de 10</span>`, 1200);
      await apagar(p);
    }
    const r5 = `de 5 ${m5 ? 'sim' : 'não'}`, r10 = `de 10 ${m10 ? 'sim' : 'não'}`;
    await respostaFinal(`<span>${so === 5 ? r5 : so === 10 ? r10 : `${r5} · ${r10}`}</span>`, { perg });
    await regras5(s, 'Múltiplo de 5: termina em 0 ou 5. Múltiplo de 10: termina em 0.');
  }
  // 6) qual é múltiplo de k? (testa as opções)
  async function cenaQualMult(s) {
    const k = s.k ?? 4, ops = s.ops || [18, 20, 22, 26], certo = ops.find((n) => n % k === 0);
    const perg = s.perg || `Qual é múltiplo de ${k}: ${ops.slice(0, -1).join(', ')} ou ${ops[ops.length - 1]}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    const p = await nota(c.notas, `Testa um por um: divide por ${k} e vê se sobra.`, 'passo');
    for (const n of ops) {
      const ok = n % k === 0;
      const l = await E.linha(`<span>${n} ÷ ${k} = ${Math.floor(n / k)}</span><span class="${ok ? 'vok' : 'vno'}">${ok ? 'sobra 0 ✔' : 'sobra ' + n % k + ' ✖'}</span>`, 1100);
      if (!ok) l.classList.add('apaga-l');
    }
    await apagar(p);
    await nota(c.notas, `na tabuada do ${k}: ${k} × ${certo / k} = ${certo}`, 'detalhe');
    await wait(800);
    await respostaFinal(`<span>${certo}</span>`, { perg });
    await regras5(s, 'Para achar o múltiplo: divide cada opção; o que não sobra nada é o certo.');
  }
  // 7) múltiplo de a e de b: as duas listas, os comuns circulados
  async function cenaMultDois(s) {
    const a = s.a ?? 3, b = s.b ?? 4, ab = a * b, ate = 2 * ab;
    L.classList.add('sem-hist', 'r3p');
    const perg = s.perg || `Qual número é múltiplo de ${a} e de ${b} ao mesmo tempo?`;
    await poePergunta(perg, false);
    const c = cartao(); const ls = el('div', 'qd-mlist', '', c.conta);
    await ler(perg);
    let p = await nota(c.notas, 'Escreve os múltiplos dos dois e procura o que aparece nas duas listas.', 'passo');
    const lista = (k, cls) => el('div', 'ml qd-pop', `<span class="${cls}">de ${k}:</span> ` + Array.from({ length: Math.floor(ate / k) }, (_, i) => `<span data-v="${k * (i + 1)}">${k * (i + 1)}</span>`).join(', '), ls);
    lista(a, 'qd-cmpA'); await wait(1400);
    lista(b, 'qd-cmpB'); await wait(1400);
    await apagar(p);
    p = await nota(c.notas, `O ${ab} está nas duas. O ${ate} também.`, 'passo');
    ls.querySelectorAll(`[data-v="${ab}"], [data-v="${ate}"]`).forEach((e) => e.classList.add('c'));
    await wait(1500);
    await apagar(p);
    await nota(c.notas, `confere: ${ab} ÷ ${a} = ${b} e ${ab} ÷ ${b} = ${a}, sem sobrar`, 'detalhe');
    await wait(900);
    await respostaFinal(`<span>${ab} (e ${ate}, ${3 * ab}…)</span>`, { perg, manter: true });
    await regras5(s, 'Múltiplo dos dois: aparece nas duas tabuadas.');
  }
  // 8) os 4 primeiros múltiplos de k (sem o zero)
  async function cenaPrimMult(s) {
    const k = s.k ?? 6, P = pulosK(4 * k, k, k);
    const perg = s.perg || `Quais são os 4 primeiros múltiplos de ${k} (sem o zero)?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, `Tabuada do ${k}, começando no ${k} × 1.`, 'passo');
    for (let i = 1; i <= 4; i++) await E.linha(`<span>${k} × ${i} = ${SB(k * i)}</span>`, 500);
    await apagar(p);
    p = await nota(c.notas, `Na reta: de ${k} em ${k}.`, 'passo');
    await P.vai(4, 500);
    await apagar(p);
    await respostaFinal(`<span>${[1, 2, 3, 4].map((i) => k * i).join(', ')}</span>`, { perg });
    await regras5(s, 'Os primeiros múltiplos: número × 1, × 2, × 3, × 4.');
  }

  // ── 6-B: divisores ──
  // 1 e 2) d é divisor de n? (grupos de d)
  async function cenaEhDiv(s) {
    const d = s.d ?? 3, n = s.n ?? 12, q = Math.floor(n / d), r = n % d, sim = r === 0;
    const G = fileiras();
    if (sim) { await etiqueta('DIVISORES', 'divide sem sobrar'); ajustaTopo(); }
    const perg = s.perg || `${d} é divisor de ${n}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    const p = await nota(c.notas, sim ? `Divisor de ${n}: divide o ${n} em partes iguais, sem sobrar.` : `Tenta fazer grupos de ${d} com os ${n}.`, 'passo');
    G.desenha({ n, por: d, rot: `${n} em grupos de ${d}`, conta: true, sobraRot: sim ? undefined : r === 1 ? 'sobra 1' : `sobram ${r}` });
    await wait(1500);
    await E.linha(`<span>${n} ÷ ${d} = ${q}</span>`);
    await E.linha(`<span>sobra ${r}</span><span class="${sim ? 'vok' : 'vno'}">${sim ? '✔' : '✖'}</span>`);
    await apagar(p);
    await respostaFinal(`<span>${sim ? `sim: ${d} é divisor de ${n}` : `não: ${d} não é divisor de ${n}`}</span>`, { perg });
    await regras5(s, sim ? 'Divisor: divide o número sem sobrar nada.' : 'Sobrou na divisão: não é divisor.');
  }
  // 3) divisor e múltiplo: a mesma conta
  async function cenaDivMult(s) {
    const perg = s.perg || '"3 é divisor de 12" e "12 é múltiplo de 3": é a mesma coisa?';
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    const p = await nota(c.notas, 'As duas frases vêm da mesma conta.', 'passo');
    await E.linha('<span>3 × 4 = 12</span>', 1100);
    await E.linha('<span>12 ÷ 3 = 4, sobra 0</span>', 1100);
    await apagar(p);
    await E.linha('<span><b class="qd-cmpA">3</b> é divisor de <b class="qd-cmpB">12</b></span>', 1100);
    await E.linha('<span><b class="qd-cmpB">12</b> é múltiplo de <b class="qd-cmpA">3</b></span>', 1100);
    await nota(c.notas, 'o menor divide; o maior é múltiplo', 'detalhe');
    await wait(900);
    await respostaFinal('<span>sim: é a mesma conta</span>', { perg });
    await regras5(s, 'Se a é divisor de b, então b é múltiplo de a.');
  }
  // 4) todos os divisores: os pares que multiplicam e dão n
  async function cenaTodosDiv(s) {
    const n = s.n ?? 12, G = fileiras();
    const pares = []; for (let d = 1; d * d <= n; d++) if (n % d === 0) pares.push([d, n / d]);
    const ds = [...new Set(pares.flat())].sort((x, y) => x - y);
    await etiqueta('TODOS OS DIVISORES', 'em pares que multiplicam'); ajustaTopo();
    const perg = s.perg || `Quais são todos os divisores de ${n}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, `Procura pares que multiplicados dão ${n}. Começa pelo 1.`, 'passo');
    for (let i = 0; i < pares.length; i++) {
      G.retangulos(pares.slice(0, i + 1));
      await E.linha(`<span>${pares[i][0]} × ${pares[i][1]} = ${n}</span>`, 1200);
    }
    await apagar(p);
    const [a, b] = pares[pares.length - 1];
    p = await nota(c.notas, s.parou || (a === b ? `${a} × ${a}: chegou no meio, parou.` : `O ${b} já apareceu: parou.${n % (b + 1) ? ` O ${b + 1} não divide ${n}.` : ''}`), 'passo');
    await E.linha(`<span>${ds.join(', ')}</span>`, 1300);
    await apagar(p);
    await respostaFinal(`<span>${ds.slice(0, -1).join(', ')} e ${ds[ds.length - 1]}</span>`, { perg });
    await regras5(s, 'Todos os divisores: os pares que multiplicam e dão o número.');
  }
  // 5) o 1 e o próprio número: qual é divisor de p?
  async function cenaDivPrimo(s) {
    const n = s.n ?? 7, ops = s.ops || [2, 3, 4];
    const perg = s.perg || `Qual é divisor de ${n}: ${ops.join(', ')} ou ${n}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, 'Dois divisores que todo número tem:', 'passo');
    await E.linha(`<span>${n} ÷ 1 = ${n}</span><span class="pz">o 1 divide todos</span>`, 1300);
    await E.linha(`<span>${n} ÷ ${n} = 1</span><span class="pz">o número divide ele mesmo</span>`, 1300);
    await apagar(p);
    if (ops.length) {
      p = await nota(c.notas, 'Os outros sobram:', 'passo');
      for (const k of ops) { const l = await E.linha(`<span>${n} ÷ ${k} = ${Math.floor(n / k)}</span><span class="vno">sobra ${n % k} ✖</span>`, 800); l.classList.add('apaga-l'); }
      await apagar(p);
    }
    await respostaFinal(`<span>${s.resp || n}</span>`, { perg });
    await regras5(s, 'Todo número tem o 1 e ele mesmo como divisores.');
  }
  // 6) número primo: só 1 × p
  async function cenaPrimo(s) {
    const n = s.n ?? 7, G = fileiras();
    await etiqueta('NÚMERO PRIMO', 'só 2 divisores'); ajustaTopo();
    const perg = s.perg || `Quantos divisores tem o número ${n}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    const p = await nota(c.notas, `Com ${n} quadradinhos, só dá para fazer uma fileira: 1 × ${n}.`, 'passo');
    G.retangulos([[1, n]]);
    await E.linha(`<span>1 × ${n} = ${n}</span>`, 1300);
    await apagar(p);
    await E.linha(`<span>divisores: 1 e ${n}</span>`, 1100);
    await nota(c.notas, 'número com só 2 divisores é primo: 2, 3, 5, 7, 11, 13…', 'detalhe');
    await wait(1000);
    await respostaFinal('<span>2 divisores (é primo)</span>', { perg });
    await regras5(s, 'Primo: só tem 2 divisores, o 1 e ele mesmo.');
  }
  // 7) qual NÃO é divisor de n?
  async function cenaNaoDiv(s) {
    const n = s.n ?? 12, ops = s.ops || [2, 3, 4, 5], certo = ops.find((k) => n % k);
    const perg = s.perg || `Qual NÃO é divisor de ${n}: ${ops.slice(0, -1).join(', ')} ou ${ops[ops.length - 1]}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    const p = await nota(c.notas, 'Testa cada um. Cuidado: agora quer o que SOBRA.', 'passo');
    for (const k of ops) {
      const ok = n % k === 0;
      const l = await E.linha(`<span>${n} ÷ ${k} = ${Math.floor(n / k)}</span><span class="${ok ? 'pz' : 'vno'}">${ok ? 'sobra 0' : 'sobra ' + n % k + ' ←'}</span>`, 1000);
      if (ok) l.classList.add('apaga-l');
    }
    await apagar(p);
    const ds = []; for (let d = 1; d <= n; d++) if (n % d === 0) ds.push(d);
    await nota(c.notas, `divisores de ${n}: ${ds.join(', ')}`, 'detalhe');
    await wait(900);
    await respostaFinal(`<span>${certo}</span>`, { perg });
    await regras5(s, 'Leia o NÃO: a resposta é o único que sobra na divisão.');
  }

  // ── 7-A: porcentagem, calcular ──
  // 1) o que é porcentagem: a grade de 100
  async function cenaPctCem(s) {
    const Cm = cem();
    await etiqueta('PORCENTAGEM', 'quantos de cada 100'); ajustaTopo();
    const perg = s.perg || 'O que quer dizer 25%?';
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, 'Divide o todo em 100 partes iguais.', 'passo');
    await Cm.pinta(0, 'on', 0, '100 partes');
    await wait(1200); await apagar(p);
    p = await nota(c.notas, '25% são 25 dessas 100 partes.', 'passo');
    await Cm.pinta(25, 'on', 250);
    await E.linha('<span>25% = 25 de 100</span>');
    await E.linha('<span>= 25/100</span>');
    await apagar(p);
    await nota(c.notas, '% quer dizer "por cem"', 'detalhe');
    await wait(800);
    await respostaFinal('<span>25 de cada 100</span>', { perg });
    await regras5(s, 'Porcentagem: quantos de cada 100. 25% = 25/100.');
  }
  // 2) 100% e 50%: { N, p: 50 | 100, resp }
  async function cenaPct50(s) {
    const N = s.N ?? 40, p0 = s.p ?? 50, Cm = cem();
    const perg = s.perg || `Quanto é ${p0}% de ${N}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, '100% é o todo. 50% é metade de 100%.', 'passo');
    await Cm.pinta(100, 'on', 0, '100% = tudo'); await wait(1300);
    if (p0 === 50) { await Cm.pinta(50, 'on2', 0, '50% = metade'); await wait(1300); }
    await apagar(p);
    if (p0 === 50) {
      p = await nota(c.notas, `50% de ${N} é a metade de ${N}.`, 'passo');
      await E.linha(`<span>${N} ÷ 2</span>`);
      await E.final(`= ${nf(N / 2)}`);
      await apagar(p);
      await nota(c.notas, `100% de ${N} = ${N} (tudo)`, 'detalhe');
    } else {
      p = await nota(c.notas, `100% de ${N} é o ${N} inteiro.`, 'passo');
      await E.linha(`<span>100% de ${N}</span>`);
      await E.final(`= ${N}`);
      await apagar(p);
      await nota(c.notas, `50% de ${N} = ${nf(N / 2)} (a metade)`, 'detalhe');
    }
    await wait(800);
    await respostaFinal(`<span>${s.resp || nf(N * p0 / 100)}</span>`, { perg });
    await regras5(s, '100% é o todo. 50% é a metade: divide por 2.');
  }
  // 3 a 6) os atalhos: 10% (÷ 10), 25% (÷ 4), 20% (÷ 5), 1% (÷ 100); 75% = 3 × 25%
  const ATALHO7 = { 10: [10, '10% é 1 parte de 10: 10 partes de 10% fazem 100%.', '10 de 100 = 1 de 10', '10%: divide por 10.'],
    25: [4, '25% é 1 parte de 4: 4 × 25% = 100%.', '25 de 100 = 1 de 4', '25%: divide por 4 (a quarta parte).'],
    75: [4, '75% são 3 partes de 4: 3 × 25%.', '75 de 100 = 3 de 4', '75%: divide por 4 e multiplica por 3.'],
    20: [5, '20% é 1 parte de 5: 5 × 20% = 100%.', '20 de 100 = 1 de 5', '20%: divide por 5.'],
    1: [100, '1% é 1 parte de 100.', '1 de 100', '1%: divide por 100.'] };
  async function cenaPctAtalho(s) {
    const pc = s.p ?? 10, N = s.N ?? 80, [k, frase, pintaTxt, rg] = ATALHO7[pc], v = N * pc / 100;
    const Cm = cem();
    const perg = s.perg || `Quanto é ${pc}% de ${N}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, frase, 'passo');
    await Cm.pinta(pc, 'on2', 200, pintaTxt);
    await wait(800); await apagar(p);
    if (pc === 75) {
      p = await nota(c.notas, `Então 75% de ${N} é 3 × (${N} ÷ 4).`, 'passo');
      await E.linha(`<span>${N} ÷ 4 = ${nf(N / 4)}</span>`);
      await E.linha(`<span>${nf(N / 4)} × 3</span>`);
    } else {
      p = await nota(c.notas, `Então ${pc}% de ${N} é ${N} ÷ ${k}.`, 'passo');
      await E.linha(`<span>${N} ÷ ${k}</span>`);
    }
    await E.final(`= ${nf(v)}`);
    await apagar(p);
    if (pc === 10) await pegadinha(c, `${N} − 10 = ${N - 10}`, 'porcentagem não é tirar o número', `${N} ÷ 10 = ${nf(v)}`);
    await respostaFinal(`<span>${nf(v)}</span>`, { perg });
    await regras5(s, rg);
  }
  // 7) porcentagem e fração: { itens: [[pc, f1, f2, motivo]] }
  const PF7 = { 50: ['50%', '50/100', '1/2', 'a metade'], 25: ['25%', '25/100', '1/4', 'a quarta parte'], 75: ['75%', '75/100', '3/4', '3 partes de 4'], 10: ['10%', '10/100', '1/10', 'a décima parte'],
    20: ['20%', '20/100', '1/5', '1 parte de 5'], 40: ['40%', '40/100', '2/5', '2 partes de 5'] };
  async function cenaPctFrac(s) {
    const itens = (s.ps || [50, 25, 75, 10]).map((p) => PF7[p]);
    L.classList.add('sem-hist', 'r3p');
    await etiqueta('PORCENTAGEM E FRAÇÃO', 'simplifica o /100'); ajustaTopo();
    const perg = s.perg || '50%, 25%, 75% e 10% são quais frações?';
    await poePergunta(perg, false);
    const c = cartao(); const ls = el('div', 'qd-lista3', '', c.conta);
    await ler(perg);
    const p = await nota(c.notas, 'Escreve sobre 100 e simplifica.', 'passo');
    for (const [pc, f1, f2, pq] of itens) {
      const r = el('div', 'l3 qd-pop', `<span class="par">${pc} = ${f1}</span><span class="par" style="visibility: hidden; color: var(--qd-amarelo)">= ${f2}</span><span class="pq" style="visibility: hidden">${pq}</span>`, ls);
      await wait(1300);
      r.querySelectorAll('[style]').forEach((e) => { e.style.visibility = ''; e.classList.add('qd-pop'); });
      await wait(900);
    }
    await apagar(p);
    await respostaFinal(`<span>${s.resp || itens.map((i) => i[2]).join(' · ')}</span>`, { perg, manter: true });
    await regras5(s, '% vira fração sobre 100; depois simplifica.');
  }
  // 8) desconto: p% de P
  const DIVP = { 10: 10, 20: 5, 25: 4, 50: 2 };
  async function cenaDesconto(s) {
    const P = s.P ?? 50, pc = s.p ?? 10, k = DIVP[pc], v = P * pc / 100;
    await etiqueta('DESCONTO', 'quanto sai do preço'); ajustaTopo();
    const perg = s.perg || `Uma camiseta de R$ ${P} tem ${pc}% de desconto. Quanto é o desconto?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, `O desconto é ${pc}% do preço.`, 'passo');
    await E.linha(`<span>${pc}% de ${P}</span>`);
    await apagar(p);
    p = await nota(c.notas, `${pc}%: divide por ${k}.`, 'passo');
    await E.linha(`<span>= ${P} ÷ ${k}</span>`);
    await E.final(`= R$ ${nf(v)}`);
    await apagar(p);
    await nota(c.notas, 'a pergunta é o desconto, não o preço final', 'detalhe');
    await wait(900);
    await respostaFinal(`<span>R$ ${nf(v)}</span>`, { perg });
    await regras5(s, 'Desconto = a porcentagem do preço.');
  }
  // 9) preço final: P − p% de P
  async function cenaPrecoFinal(s) {
    const P = s.P ?? 80, pc = s.p ?? 25, k = DIVP[pc], d = P * pc / 100, v = P - d;
    const perg = s.perg || `Um tênis de R$ ${P} tem ${pc}% de desconto. Qual é o preço final?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, `1º Calcula o desconto: ${pc}% de ${P}.`, 'passo');
    await E.linha(`<span>${P} ÷ ${k} = ${nf(d)}</span><span class="pz">desconto</span>`);
    await apagar(p);
    p = await nota(c.notas, '2º Tira o desconto do preço.', 'passo');
    await E.linha(`<span>${P} − ${nf(d)}</span>`);
    await E.final(`= R$ ${nf(v)}`);
    await apagar(p);
    await pegadinha(c, `R$ ${nf(d)}`, `R$ ${nf(d)} é o desconto; o preço final é o que sobra`, `R$ ${nf(v)}`);
    await respostaFinal(`<span>R$ ${nf(v)}</span>`, { perg });
    await regras5(s, 'Preço final = preço − desconto.');
  }
  // 10) qual porcentagem: f de N
  async function cenaQualPct(s) {
    const N = s.N ?? 40, f = s.f ?? 10, d = N / f, pc = 100 / d, Cm = cem();
    const perg = s.perg || `Numa turma de ${N} alunos, ${f} faltaram. Qual porcentagem faltou?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, `Escreve a fração: ${f} de ${N}.`, 'passo');
    await E.linha(`<span>${f}/${N}</span>`);
    await apagar(p);
    p = await nota(c.notas, `Simplifica: divide em cima e embaixo por ${f}.`, 'passo');
    await E.linha(`<span>= 1/${d}</span>`);
    await apagar(p);
    p = await nota(c.notas, `1/${d} é ${pc}%.`, 'passo');
    await Cm.pinta(pc, 'on2', 200, `1/${d} = ${pc} de 100`);
    await E.final(`= ${pc}%`);
    await apagar(p);
    await respostaFinal(`<span>${pc}%</span>`, { perg });
    await regras5(s, 'Qual porcentagem? Faz a fração (parte/todo) e transforma em %.');
  }

  // ── 7-B: porcentagem, qual é a conta? ──
  // a porcentagem em decimal, com 2 casas (20 → "0,20 = 0,2"; 5 → "0,05"; 100 → "1,00 = 1")
  const decLinha = (p) => { const d2 = (p / 100).toFixed(2).replace('.', ','), d = dec2(p); return d2 === d ? `= ${d}` : `= ${d2} = ${d}`; };
  // 1) % em decimal: { ps: [20, 5] }
  async function cenaPctDec(s) {
    const ps = s.ps || [20, 5];
    await etiqueta('% EM DECIMAL', 'divide por 100'); ajustaTopo();
    const perg = s.perg || `Quanto é ${ps[0]}% em número decimal?${ps[1] !== undefined ? ` E ${ps[1]}%?` : ''}`;
    await poePergunta(perg, false);
    let c = null, E = null;
    for (const [i, pc] of ps.entries()) {
      if (c) await paraHist(c);
      c = cartao(); E = contaEq(c.conta);
      if (i === 0) await ler(perg);
      const falta = pc < 10;
      const p = await nota(c.notas, i === 0 ? `Porcentagem é sobre 100. Dividir por 100 anda a vírgula 2 casas para a esquerda.${falta ? ' Falta casa: põe zero.' : ''}` : `${pc}% também: a vírgula anda 2 casas.${falta ? ' Falta casa: põe zero.' : ''}`, 'passo');
      await E.linha(`<span>${pc}% = ${pc}/100</span>`);
      await E.linha(`<span>${decLinha(pc)}</span>`, 1100);
      await apagar(p);
    }
    const ult = ps[ps.length - 1];
    if (ult < 10) await pegadinha(c, `${ult}% = ${dec2(ult * 10)}`, `${dec2(ult * 10)} é ${ult * 10}%`, `${ult}% = ${dec2(ult)}`);
    await respostaFinal(`<span>${ps.map(dec2).join(' · ')}</span>`, { perg });
    await regras5(s, '% em decimal: divide por 100 (a vírgula anda 2 casas). 20% = 0,2; 5% = 0,05.');
  }
  // 2) "de" vira vezes: p% de N = N × 0,p
  async function cenaQualConta(s) {
    const pc = s.p ?? 25, N = s.N ?? 60, d = dec2(pc);
    await etiqueta('QUAL É A CONTA?', '"de" vira vezes'); ajustaTopo();
    const perg = s.perg || `"${pc}% de ${N}" é o mesmo que qual conta?`;
    await poePergunta(perg, false);
    const c = cartao();
    await ler(perg);
    const { E } = await fraseExpr(c, [[`${pc}%`, d], ['de', '×'], [String(N), String(N)]], `<span>${N} × ${d}</span>`, `Troca cada pedaço: ${pc}% vira ${d} e "de" vira ×.`);
    await E.final(`= ${nf(N * pc / 100)}`);
    await pegadinha(c, `${N} × ${pc}`, `o ${pc}% precisa virar ${d} antes`, `${N} × ${d}`);
    await respostaFinal(`<span>${N} × ${d}</span>`, { perg });
    await regras5(s, '"p% de N" = N × (p ÷ 100).');
  }
  // 3) 50% também é ÷ 2
  async function cenaConta50(s) {
    const N = s.N ?? 30;
    const perg = s.perg || `"50% de ${N}" é o mesmo que qual conta?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, 'Pelo jeito de sempre: 50% = 0,5.', 'passo');
    await E.linha(`<span>${N} × 0,5</span>`);
    await apagar(p);
    p = await nota(c.notas, 'E 50% é a metade: dá o mesmo que dividir por 2.', 'passo');
    await E.linha(`<span>= ${N} ÷ 2</span>`);
    await E.final(`= ${nf(N / 2)}`);
    await apagar(p);
    await respostaFinal(`<span>${N} × 0,5 ou ${N} ÷ 2</span>`, { perg });
    await regras5(s, '50% de N: N × 0,5 = N ÷ 2.');
  }
  // 4) num problema: { p, N, oQue: '30 alunos', passo, detalhe }
  async function cenaContaCtx(s) {
    const pc = s.p ?? 40, N = s.N ?? 30, d = dec2(pc), oQue = s.oQue || `${N} alunos`;
    const perg = s.perg || `Numa turma de ${N} alunos, ${pc}% são meninas. Qual conta dá o número de meninas?`;
    await poePergunta(perg, false);
    const c = cartao();
    await ler(perg);
    const { E } = await fraseExpr(c, [[`${pc}%`, d], ['de', '×'], [oQue, String(N)]], `<span>${N} × ${d}</span>`, s.passo || `As meninas são ${pc}% DE ${N} alunos.`);
    const v = N * pc / 100;
    await E.final(`= ${nf(v)}`);
    const det = s.detalhe !== undefined ? s.detalhe : `${nf(v)} meninas; os outros ${nf(N - v)} são meninos`;
    if (det) { await nota(c.notas, det, 'detalhe'); await wait(900); }
    await tiraTrad();
    await respostaFinal(`<span>${N} × ${d}</span>`, { perg });
    await regras5(s, 'No problema: acha "quanto %" e "de quanto"; a conta é todo × decimal.');
  }
  // 5) ler a conta: N × 0,p calcula o quê?
  async function cenaLeConta(s) {
    const pc = s.p ?? 25, N = s.N ?? 60, d = dec2(pc), d2 = (pc / 100).toFixed(2).replace('.', ',');
    const perg = s.perg || `A conta ${N} × ${d} calcula o quê?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, 'Faz o caminho de volta: o decimal vira porcentagem (vezes 100).', 'passo');
    await E.linha(`<span>${d}${d2 !== d ? ` = ${d2}` : ''} = ${pc}/100 = ${pc}%</span>`, 1300);
    await apagar(p);
    p = await nota(c.notas, 'O × vira "de".', 'passo');
    await E.linha(`<span>${N} × ${d} = ${pc}% de ${N}</span>`, 1300);
    await apagar(p);
    await pegadinha(c, `${nf(pc / 10)}% de ${N}`, `${d2} tem 2 casas: é ${pc}%`, `${pc}% de ${N}`);
    await respostaFinal(`<span>${pc}% de ${N}</span>`, { perg });
    await regras5(s, 'Decimal em %: anda a vírgula 2 casas para a direita. 0,25 = 25%.');
  }
  // 6 e 7) preço final com desconto (P − P × 0,p) e aumento (P + P × 0,p): { P, p, aumento }
  async function cenaContaFinal(s) {
    const P = s.P ?? 200, pc = s.p ?? 10, up = !!s.aumento, d = dec2(pc), D = P * pc / 100, op = up ? '+' : '−', v = up ? P + D : P - D;
    const perg = s.perg || (up ? `A mesada de R$ ${P} teve aumento de ${pc}%. Qual conta dá a nova mesada?` : `Um produto de R$ ${P} tem ${pc}% de desconto. Qual conta dá o preço final?`);
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, up ? `O aumento é ${pc}% de ${P}.` : `O desconto é ${pc}% de ${P}.`, 'passo');
    await E.linha(`<span>${P} × ${d}</span><span class="pz">${up ? 'aumento' : 'desconto'}</span>`);
    await apagar(p);
    p = await nota(c.notas, up ? 'Aumento soma: a mesada mais o aumento.' : 'Preço final: o preço menos o desconto.', 'passo');
    await E.linha(`<span>${P} ${op} ${P} × ${d}</span>`);
    await E.linha(`<span>= ${P} ${op} ${rs(D)}</span>`);
    await E.final(`= R$ ${rs(v)}`);
    await apagar(p);
    await respostaFinal(`<span>${P} ${op} ${P} × ${d}</span>`, { perg });
    await regras5(s, up ? 'Aumento: soma. Desconto: tira.' : 'Preço final = preço − preço × desconto.');
  }
  // 8) direto: com p% de desconto, paga (100 − p)%
  async function cenaContaDireta(s) {
    const P = s.P ?? 60, pc = s.p ?? 25, r = 100 - pc, d = dec2(r), v = P * r / 100, Cm = cem();
    const perg = s.perg || `Uma camiseta de R$ ${P} tem ${pc}% de desconto. Qual conta dá direto o preço final?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    let p = await nota(c.notas, `Se tiram ${pc}%, eu pago o resto: 100% − ${pc}% = ${r}%.`, 'passo');
    await Cm.pinta(100, 'on', 0, ''); await wait(400);
    await Cm.pinta(r, 'on2', 150, `pago ${r}%`);
    await E.linha(`<span>100% − ${pc}% = ${r}%</span>`);
    await apagar(p);
    p = await nota(c.notas, `${r}% = ${d}. Uma conta só:`, 'passo');
    await E.linha(`<span>${P} × ${d}</span>`);
    await E.final(`= R$ ${rs(v)}`);
    await apagar(p);
    await nota(c.notas, `confere: ${P} − ${rs(P - v)} = ${rs(v)} ✔`, 'detalhe');
    await wait(800);
    await respostaFinal(`<span>${P} × ${d}</span>`, { perg });
    await regras5(s, 'Direto: com p% de desconto, paga (100 − p)%.');
  }

  // ══════════════════ 1: a ordem das operações (PROMPT-223) ══════════════════
  // lateral com a lista da ordem; marca(i) acende o passo da vez
  function ordemLado(itens) {
    L.classList.add('com-lado', 'lado-xl', 'plano-alto');
    LADO.innerHTML = ''; LADO.style.opacity = '';
    const box = el('div', 'qd-ordem-box', '', LADO);
    el('div', 'qd-ordem-tit', 'A ordem', box);
    const li = itens.map((t) => el('div', 'qd-ordem-i', t, box));
    return { marca(i) { li.forEach((e, k) => e.classList.toggle('on', k === i)); } };
  }
  const FZ = (s) => `<span class="faz">${s}</span>`;   // a parte que vai ser feita agora
  // um passo: a parte marcada na própria linha que já está no quadro (não escreve de novo), a ordem acesa, a nota, e a linha com o resultado
  async function passoOrd(E, O, i, antes, depois, txt, c) {
    if (O && i !== null) O.marca(i);
    const ult = [...E.box.querySelectorAll(':scope > .ln')].pop();
    if (ult) { ult.innerHTML = `<span>${virgH(antes)}</span>`; await wait(600); }
    else await E.linha(`<span>${antes}</span>`, 600);
    const p = txt ? await nota(c.notas, txt, 'passo') : null;
    await wait(900);
    const l2 = await E.linha(`<span>${depois}</span>`, 900);
    if (p) await apagar(p);
    return l2;
  }
  const ORD1A = ['1º × e ÷', '2º + e −', 'empate: da esquerda', 'para a direita'];
  const ORD1B = ['1º ( )', '2º [ ]', '3º { }', '4º × e ÷', '5º + e −'];
  // o resolvedor: a expressão em pedaços e, a cada passo, o que marcar e o que escrever (do jeito dos protótipos)
  const AB1 = '([{', FE1 = ')]}';
  const n1 = (t) => Number(String(t).replace('−', '-').replace(',', '.'));
  const s1 = (v) => { v = Math.round(v * 1e6) / 1e6; return (v < 0 ? '−' : '') + String(Math.abs(v)).replace('.', ','); };
  const conta1 = (a, op, b) => (op === '×' ? a * b : op === '÷' ? a / b : op === '+' ? a + b : a - b);
  const junta1 = (tk, fz = [], sb = new Set()) => {   // fz: [[i, j]…] vão sublinhados; sb: posições com o resultado (amarelo)
    let o = '';
    tk.forEach((t, i) => {
      if (i && !AB1.includes(tk[i - 1]) && !FE1.includes(t)) o += ' ';
      if (fz.some(([a]) => a === i)) o += '<span class="faz">';
      o += sb.has(i) ? SB(t) : t;
      if (fz.some(([, b]) => b === i)) o += '</span>';
    });
    return o;
  };
  // um passo num trecho sem colchetes: × e ÷ (o primeiro de cada bloco; bloco com mais de um, só o primeiro dele), depois + e − da esquerda
  function plano1(tk, i0, i1) {
    const ops = []; for (let k = i0 + 1; k < i1; k += 2) ops.push(k);
    if (ops.length <= 1) return null;
    const md = ops.filter((k) => tk[k] === '×' || tk[k] === '÷');
    if (md.length) {
      const blocos = []; for (const k of md) { const b = blocos[blocos.length - 1]; if (b && b[b.length - 1] === k - 2) b.push(k); else blocos.push([k]); }
      const longo = blocos.find((b) => b.length > 1);
      return { ks: longo ? [longo[0]] : blocos.map((b) => b[0]), tipo: 'md' };
    }
    return { ks: [ops[0]], tipo: 'as' };
  }
  function passos1(expr) {
    let tk = String(expr).match(/\d+(?:,\d+)?|[+−×÷()[\]{}]/g);
    const out = [];
    for (let guarda = 0; guarda < 30; guarda++) {
      // o colchete mais de dentro
      let ab = -1, fe = -1, faz;
      for (let i = 0; i < tk.length; i++) { if (AB1.includes(tk[i])) ab = i; else if (FE1.includes(tk[i])) { fe = i; break; } }
      if (fe >= 0) {
        const dentro = plano1(tk, ab + 1, fe), tipo = AB1.indexOf(tk[ab]);
        if (!dentro) {   // uma conta só dentro: faz e tira o colchete
          const v = conta1(n1(tk[ab + 1]), tk[ab + 2], n1(tk[ab + 3]));
          const novo = [...tk.slice(0, ab), s1(v), ...tk.slice(fe + 1)];
          out.push({ antes: junta1(tk, [[ab, fe]]), depois: junta1(novo, [], new Set([ab])), tipo, cs: `${tk[ab + 1]} ${tk[ab + 2]} ${tk[ab + 3]} = ${s1(v)}` });
          tk = novo; continue;
        }
        faz = dentro;
      } else faz = plano1(tk, 0, tk.length);
      if (!faz) break;
      // troca cada conta marcada pelo resultado (da direita para a esquerda, para as posições não mudarem)
      let novo = [...tk]; const cs = []; const pos = [];
      for (const k of [...faz.ks].reverse()) { const v = conta1(n1(tk[k - 1]), tk[k], n1(tk[k + 1])); novo.splice(k - 1, 3, s1(v)); cs.unshift(`${tk[k - 1]} ${tk[k]} ${tk[k + 1]} = ${s1(v)}`); }
      faz.ks.forEach((k, j) => pos.push(k - 1 - 2 * j));
      out.push({ antes: junta1(tk, faz.ks.map((k) => [k - 1, k + 1])), depois: junta1(novo, [], new Set(pos)), tipo: fe >= 0 ? AB1.indexOf(tk[ab]) : faz.tipo, cs: cs.join(' e ') });
      tk = novo;
    }
    // sobrou uma conta: o resultado final
    const v = tk.length === 3 ? conta1(n1(tk[0]), tk[1], n1(tk[2])) : n1(tk[0]);
    return { passos: out, ultimo: tk.length === 3 ? (tk[1] === '×' || tk[1] === '÷' ? 'md' : 'as') : null, v };
  }
  // a página do 1-A e do 1-B: { expr, b (com colchetes), perg, etq: [nome, sub], intro, introMs, frase: { pares, nota }, notas: […] ({c} = a conta do passo), peg: [errada, porque, certa], rs, resp, regra }
  async function cenaOrdem1(s) {
    const B = !!s.b, O = ordemLado(B ? ORD1B : ORD1A);
    if (s.etq) { await etiqueta(s.etq[0], s.etq[1] || ''); }
    ajustaTopo();
    const { passos, ultimo, v } = passos1(s.expr);
    const idx = (t) => (typeof t === 'number' ? t : B ? (t === 'md' ? 3 : 4) : t === 'md' ? 0 : 2);
    const perg = s.perg || `Quanto é ${s.expr}?`;
    await poePergunta(perg, false);
    const c = cartao(); let E;
    if (s.frase) {
      await ler(perg);
      ({ E } = await fraseExpr(c, s.frase.pares, `<span>${s.expr}</span>`, s.frase.nota));
      await tiraTrad();
    } else {
      E = contaEq(c.conta);
      await ler(perg);
    }
    if (s.intro) { const p = await nota(c.notas, s.intro, 'passo'); await wait(s.introMs || 1500); await apagar(p); }
    const auto = (p, k) => (typeof p.tipo === 'number' ? (B && !s.expr.includes('[') ? 'Primeiro dentro: {c}.' : ['Primeiro ( ): {c}.', 'Depois [ ]: {c}.', 'Depois { }: {c}.'][p.tipo])
      : p.tipo === 'md' ? (p.cs.includes(' e ') ? 'Primeiro todos os × e ÷.' : 'Primeiro o ' + p.cs.split(' ')[1] + ': {c}.') : 'Sobrou + e −: vai da esquerda para a direita.');
    for (const [k, p] of passos.entries()) {
      const txt = (s.notas && s.notas[k] !== undefined ? s.notas[k] : auto(p, k)).replace('{c}', p.cs);
      await passoOrd(E, O, idx(p.tipo), (k ? '= ' : '') + p.antes, '= ' + p.depois, txt, c);
    }
    const res = s1(v), din = s.rs ? (v < 0 ? '−R$ ' + res.slice(1) : 'R$ ' + res) : res;
    O.marca(ultimo === 'md' ? (B ? 3 : 0) : B ? 4 : 1);
    await E.final(`= ${din}`);
    if (s.peg) await pegadinha(c, ...s.peg);
    await respostaFinal(`<span>${s.resp || din}</span>`, { perg });
    await regras5(s, s.regra || (B ? 'De dentro para fora: ( ), [ ], { }. Depois a ordem de sempre.' : 'Primeiro × e ÷. Depois + e −.'));
  }

  // ══════════════════ 2 e 3: o quadro das casas e os negativos (PROMPT-222; protótipos referencia/lousa-2a/2b/3a/3b.html) ══════════════════
  // lateral com a tabela das casas: cada número entra numa linha, os algarismos no lugar certo
  // cab: ex. ['M', 'C', 'D', 'U', ',', 'd', 'c']; a coluna ',' só mostra a vírgula se o número tiver decimais
  function casas(cab, legenda) {
    L.classList.add('com-lado', 'lado-xl', 'plano-alto');
    LADO.innerHTML = ''; LADO.style.opacity = '';
    ajustaTopo();
    const box = el('div', 'qd-casas-box', '', LADO);
    const t = el('div', 'qd-casas', '', box);
    t.style.gridTemplateColumns = cab.map((c) => (c === ',' ? '.5em' : '1.15em')).join(' ') + ' auto';
    cab.forEach((c) => el('div', 'cab' + (c === ',' ? ' vg' : ''), c === ',' ? '' : c, t));
    el('div', 'cab rt', '', t);
    if (legenda) el('div', 'qd-casas-leg', legenda, box);
    const iU = cab.indexOf('U'), iV = cab.indexOf(',');
    // muitas casas (número grande do cartão): a tabela encolhe para caber na lateral
    const cabe = () => { t.style.fontSize = ''; const f = box.clientWidth / Math.max(t.scrollWidth, 1); if (f < 1) t.style.fontSize = `max(2.4cqw, ${3.6 * f * .97}cqw)`; };
    return {
      async linha(str, rot = '', cls = '') {
        const [ip, dp = ''] = String(str).split(',');
        const cel = cab.map(() => '');
        [...ip].reverse().forEach((d, k) => { if (iU - k >= 0) cel[iU - k] = d; });
        if (dp && iV >= 0) { cel[iV] = ','; [...dp].forEach((d, k) => { cel[iV + 1 + k] = d; }); }
        const row = cel.map((d, j) => el('div', 'cd qd-pop ' + cls + (cab[j] === ',' ? ' vg' : ''), d, t));
        el('div', 'cd rt qd-pop', rot, t);
        cabe();
        await wait(900);
        return row;
      },
    };
  }
  // as casas que os números pedem (no mínimo as do protótipo)
  const CASA_I = ['U', 'D', 'C', 'M', 'DM', 'CM'], CASA_D = ['d', 'c', 'm'];
  function cabDe(nums, minI, minD = 0) {
    let ni = minI, nd = minD;
    for (const s of nums) { const [ip, dp = ''] = String(s).split(','); ni = Math.max(ni, ip.length); nd = Math.max(nd, dp.length); }
    const c = CASA_I.slice(0, Math.min(ni, CASA_I.length)).reverse();
    return nd ? [...c, ',', ...CASA_D.slice(0, Math.min(nd, 3))] : c;
  }
  const zerosDe = (k) => String(k).length - 1;
  // o decimal com z casas depois da vírgula (0,75 → "0,750"), sem a vírgula se for inteiro
  const comCasas = (v, z) => (Number.isInteger(v) ? nf(v) : v.toFixed(z).replace('.', ','));
  const dinheiro = (v) => (Number.isInteger(v) ? nf(v) : v.toFixed(2).replace('.', ','));
  const nD = (t) => Number(String(t).replace(',', '.'));

  // ── 2-A: × e ÷ por 10, 100 e 1000 ──
  // 1 e 2) vezes: { itens: [[a, k], …] } (k = 10: a página 1, com a legenda e a etiqueta)
  async function cenaCasasVz(s) {
    const itens = s.itens || [[7, 10]], p1 = itens[0][1] === 10;
    const K = casas(cabDe(itens.map(([a, k]) => String(a * k)), 4), p1 ? 'M milhar · C centena · D dezena · U unidade' : undefined);
    if (p1) { await etiqueta('× 10, 100 e 1000', 'os algarismos mudam de casa'); ajustaTopo(); }
    const perg = s.perg || (itens.length > 1 ? `Quanto é ${itens[0][0]} × ${itens[0][1]}? E ${itens[1][0]} × ${itens[1][1]}?` : `Quanto é ${itens[0][0]} × ${itens[0][1]}?`);
    await poePergunta(perg, false);
    let c = null, E = null;
    for (const [i, [a, k]] of itens.entries()) {
      if (c) await paraHist(c);
      c = cartao(); E = contaEq(c.conta);
      if (i === 0) await ler(perg);
      const z = zerosDe(k), v = a * k;
      await K.linha(String(a), k === 10 && a < 10 ? `${a} unidades` : '');
      const p = await nota(c.notas, k === 10 ? 'Vezes 10: cada algarismo anda 1 casa para a esquerda. A unidade fica vazia: põe 0.' : `× ${k} tem ${z} zeros: anda ${z} casas. Põe ${z} zeros.`, 'passo');
      await K.linha(String(v), `← ${casasTxt(z)}`, 'novo');
      await E.linha(`<span>${a} × ${k}</span>`);
      await E.final(`= ${v}`);
      await apagar(p);
      if (k === 10 && itens.length === 1) { await nota(c.notas, a < 10 ? `${a} unidades viraram ${a} dezenas` : 'cada algarismo subiu uma casa', 'detalhe'); await wait(800); }
    }
    await respostaFinal(`<span>${itens.map(([a, k]) => a * k).join(' · ')}</span>`, { perg });
    await regras5(s, p1 ? '× 10: anda 1 casa para a esquerda (põe um zero no fim).' : 'Conta os zeros do 10, 100, 1000: são as casas que andam (os zeros que põe).');
  }
  // 3 e 4) dividir: { itens: [[a, k], …] }
  async function cenaCasasDv(s) {
    const itens = s.itens || [[300, 10]], so10 = itens.length === 1 && itens[0][1] === 10;
    const K = casas(cabDe(itens.map(([a]) => String(a)), 4));
    const perg = s.perg || (itens.length > 1 ? `Quanto é ${itens[0][0]} ÷ ${itens[0][1]}? E ${itens[1][0]} ÷ ${itens[1][1]}?` : `Quanto é ${itens[0][0]} ÷ ${itens[0][1]}?`);
    await poePergunta(perg, false);
    let c = null, E = null;
    for (const [i, [a, k]] of itens.entries()) {
      if (c) await paraHist(c);
      c = cartao(); E = contaEq(c.conta);
      if (i === 0) await ler(perg);
      const z = zerosDe(k), v = a / k;
      await K.linha(String(a));
      const p = await nota(c.notas, k === 10 ? 'Dividir por 10 é o caminho de volta: anda 1 casa para a direita. Sai um zero do fim.' : k === 100 ? '÷ 100: 2 zeros, anda 2 casas para a direita. Tira 2 zeros.' : '÷ 1000: tira 3 zeros.', 'passo');
      await K.linha(String(v), `→ ${casasTxt(z)}`, 'novo');
      await E.linha(`<span>${a} ÷ ${k}</span>`);
      await E.final(`= ${v}`);
      await apagar(p);
      if (so10) { await nota(c.notas, `confere: ${v} × 10 = ${a} ✔`, 'detalhe'); await wait(800); }
    }
    await respostaFinal(`<span>${itens.map(([a, k]) => a / k).join(' · ')}</span>`, { perg });
    await regras5(s, so10 ? '÷ 10: anda 1 casa para a direita (tira um zero do fim).' : '÷ 100 tira 2 zeros; ÷ 1000 tira 3 zeros.');
  }
  // 5) zero do meio: a ÷ 10 (a pegadinha põe o zero no meio do resultado)
  async function cenaZeroMeio(s) {
    const a = s.a ?? 450, v = a / 10;
    const K = casas(cabDe([String(a)], 4));
    const perg = s.perg || `Quanto é ${a} ÷ 10?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await K.linha(String(a));
    const p = await nota(c.notas, 'Só sai o zero do FIM. Os outros algarismos andam juntos.', 'passo');
    await K.linha(String(v), '→ 1 casa', 'novo');
    await E.linha(`<span>${a} ÷ 10</span>`);
    await E.final(`= ${v}`);
    await apagar(p);
    if (v >= 10) { const sv = String(v); await pegadinha(c, sv.slice(0, -1) + '0' + sv.slice(-1), 'não tira um algarismo do meio', sv); }
    await respostaFinal(`<span>${v}</span>`, { perg });
    await regras5(s, 'Tira zero só do fim do número.');
  }
  // 6) duas vezes: a × 10 × 10 ou a ÷ 10 ÷ 10
  async function cenaDuasVezes(s) {
    const a = s.a ?? 23, dv = s.op === '÷', m = dv ? a / 10 : a * 10, v = dv ? a / 100 : a * 100, op = dv ? '÷' : '×';
    const perg = s.perg || `Quanto é ${a} ${op} 10 ${op} 10?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    const p = await nota(c.notas, `Faz da esquerda para a direita, um ${op} 10 de cada vez.`, 'passo');
    await E.linha(`<span>${a} ${op} 10 ${op} 10</span>`);
    await E.linha(`<span>= ${m} ${op} 10</span>`);
    await E.final(`= ${v}`);
    await apagar(p);
    await nota(c.notas, dv ? '÷ 10 ÷ 10 é o mesmo que ÷ 100: tira 2 zeros' : '× 10 × 10 é o mesmo que × 100: 2 zeros', 'detalhe');
    await wait(900);
    await respostaFinal(`<span>${v}</span>`, { perg });
    await regras5(s, dv ? '÷ 10 ÷ 10 = ÷ 100.' : '× 10 × 10 = × 100.');
  }
  // 7) juntando: a × 100 + b × 10
  async function cenaJuntando(s) {
    const a = s.a ?? 5, b = s.b ?? 3;
    const perg = s.perg || `Quanto é ${a} × 100 + ${b} × 10?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    const p = await nota(c.notas, 'Primeiro as vezes, depois a soma.', 'passo');
    await E.linha(`<span>${a} × 100 + ${b} × 10</span>`);
    await E.linha(`<span>= ${a * 100} + ${b * 10}</span>`);
    await E.final(`= ${a * 100 + b * 10}`);
    await apagar(p);
    await nota(c.notas, `${a} ${a === 1 ? 'centena' : 'centenas'} e ${b} ${b === 1 ? 'dezena' : 'dezenas'}`, 'detalhe');
    await wait(900);
    await respostaFinal(`<span>${a * 100 + b * 10}</span>`, { perg });
    await regras5(s, 'Numa expressão: primeiro × e ÷, depois + e −.');
  }

  // ── 2-B: decimais e medidas ──
  // 1) decimal × 10
  async function cenaDecX10(s) {
    const a = s.a ?? '3,5', v = nf(Math.round(nD(a) * 1e6) * 10 / 1e6);
    const K = casas(cabDe([a, v], 3, 2), 'd décimo · c centésimo');
    await etiqueta('DECIMAIS × e ÷', 'a vírgula anda'); ajustaTopo();
    const perg = s.perg || `Quanto é ${a} × 10?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await K.linha(a);
    const p = await nota(c.notas, 'Com vírgula é igual: × 10 anda 1 casa. É como se a vírgula pulasse 1 casa para a direita.', 'passo');
    await K.linha(v, 'vírgula →', 'novo');
    await E.linha(`<span>${a} × 10</span>`);
    await E.final(`= ${v}`);
    await apagar(p);
    if (/,/.test(a)) await pegadinha(c, a + '0', 'pôr zero no fim não muda um decimal', v);
    await respostaFinal(`<span>${v}</span>`, { perg });
    await regras5(s, 'Decimal × 10: a vírgula anda 1 casa para a direita.');
  }
  // 2) decimal × 100 ou × 1000: falta casa, completa com zero
  async function cenaDecX100(s) {
    const a = s.a ?? '0,7', k = s.k ?? 100, z = zerosDe(k), d = (a.split(',')[1] || '').length;
    const vN = Math.round(nD(a) * k * 1e6) / 1e6, v = nf(vN), falta = /,/.test(a) && d < z, pad = falta ? a + '0'.repeat(z - d) : a;
    const K = casas(cabDe([a, v], 3, 2));
    const perg = s.perg || `Quanto é ${a} × ${k}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await K.linha(a);
    const p = await nota(c.notas, falta ? `× ${k}: a vírgula anda ${z} casas. Só tem ${d} depois da vírgula: completa com zero.` : `× ${k}: a vírgula anda ${z} casas para a direita.`, 'passo');
    if (pad !== a) await E.linha(`<span>${a} = ${pad}</span>`);
    await K.linha(v, `vírgula → ${z}`, 'novo');
    await E.linha(`<span>${pad} × ${k}</span>`);
    await E.final(`= ${v}`);
    await apagar(p);
    const dig = pad.replace(',', '');
    if (/^0/.test(dig) && Number.isInteger(vN)) { await nota(c.notas, `zero na frente sem valor sai: ${dig} = ${v}`, 'detalhe'); await wait(800); }
    await respostaFinal(`<span>${v}</span>`, { perg });
    await regras5(s, 'Faltou casa para a vírgula andar? Completa com zero.');
  }
  // 3) ÷ 10 com vírgula: { itens: [37, 5] }
  async function cenaDecDv10(s) {
    const itens = s.itens || [37, 5];
    const K = casas(cabDe(itens.map(String), 3, 2));
    const perg = s.perg || (itens.length > 1 ? `Quanto é ${itens[0]} ÷ 10? E ${itens[1]} ÷ 10?` : `Quanto é ${itens[0]} ÷ 10?`);
    await poePergunta(perg, false);
    let c = null, E = null;
    for (const [i, a] of itens.entries()) {
      if (c) await paraHist(c);
      c = cartao(); E = contaEq(c.conta);
      if (i === 0) await ler(perg);
      const v = nf(a / 10), u = a % 10;
      await K.linha(String(a));
      const p = await nota(c.notas, u === 0 ? '÷ 10: anda 1 casa para a direita. Sai o zero do fim.' : a < 10 ? `O ${a} vai para os décimos. A unidade fica vazia: põe 0.` : `÷ 10: anda 1 casa para a direita. O ${u} passa da unidade: aparece a vírgula.`, 'passo');
      await K.linha(v, u === 0 ? '→ 1 casa' : '← vírgula', 'novo');
      await E.linha(`<span>${a} ÷ 10</span>`);
      await E.final(`= ${v}`);
      await apagar(p);
    }
    await respostaFinal(`<span>${itens.map((a) => nf(a / 10)).join(' · ')}</span>`, { perg });
    await regras5(s, '÷ 10: a vírgula anda 1 casa para a esquerda. Ficou vazio na frente: 0.');
  }
  // 4) ÷ 100
  async function cenaDecDv100(s) {
    const a = s.a ?? 37, vN = a / 100, v = nf(vN), cheio = comCasas(vN, 2);
    const K = casas(cabDe([String(a), cheio], 3, 2));
    const perg = s.perg || `Quanto é ${a} ÷ 100?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await K.linha(String(a));
    const ds = String(a).padStart(2, '0').slice(-2);
    const p = await nota(c.notas, a % 100 === 0 ? '÷ 100: anda 2 casas para a direita. Saem os 2 zeros do fim.' : `÷ 100: anda 2 casas para a direita. O ${ds[0]} e o ${ds[1]} passam da unidade.`, 'passo');
    await K.linha(cheio, '← 2 casas', 'novo');
    await E.linha(`<span>${a} ÷ 100</span>`);
    await E.final(`= ${v}`);
    await apagar(p);
    if (cheio !== v) { await nota(c.notas, `zero no fim do decimal sai: ${cheio} = ${v}`, 'detalhe'); await wait(800); }
    const um = nf(a / 10);
    if (um !== v) await pegadinha(c, um, `${um} é ÷ 10 (1 casa só)`, v);
    await respostaFinal(`<span>${v}</span>`, { perg });
    await regras5(s, '÷ 100: a vírgula anda 2 casas para a esquerda.');
  }
  // 5) as medidas
  async function cenaMedidas2(s) {
    L.classList.add('sem-hist', 'r3p');
    await etiqueta('MEDIDAS', 'quanto vale cada uma'); ajustaTopo();
    const perg = s.perg || 'Quanto vale 1 metro, 1 quilo e 1 litro?';
    await poePergunta(perg, false);
    const c = cartao(); const ls = el('div', 'qd-lista3', '', c.conta);
    await ler(perg);
    const p = await nota(c.notas, 'Estas são as trocas que aparecem nas questões.', 'passo');
    for (const [a, b, pq] of [['1 m', '100 cm', 'centímetro: 100 em 1 metro'], ['1 kg', '1000 g', 'quilo = mil gramas'], ['1 L', '1000 mL', 'mili = mil em 1'], ['1 km', '1000 m', 'quilo = mil']]) {
      el('div', 'l3 qd-pop', `<span class="par">${a} =</span><span class="par" style="color: var(--qd-amarelo)">${b}</span><span class="pq">${pq}</span>`, ls);
      await wait(1300);
    }
    await apagar(p);
    await respostaFinal(`<span>${s.resp || '100 cm · 1000 g · 1000 mL'}</span>`, { perg, manter: true });
    await regras5(s, '"Quilo" é mil. "Centi" é 100 em 1. "Mili" é 1000 em 1.');
  }
  const UN2 = { m: ['metro', 'centímetro', 'cm', 100], kg: ['quilo', 'grama', 'g', 1000], L: ['litro', 'mililitro', 'mL', 1000] };
  // 6) da maior para a menor: a (m, kg, L) → × k
  async function cenaConvMaior(s) {
    const a = s.a ?? '1,5', u = s.u || 'm', [n1, n2, su, k] = UN2[u], z = zerosDe(k), v = nf(Math.round(nD(a) * k * 1e6) / 1e6);
    const perg = s.perg || `${a} ${n1} são quantos ${n2}s?`;
    await poePergunta(perg, false);
    const K = casas(cabDe([a, v], 3, 2));
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    const p = await nota(c.notas, `De ${n1} para ${n2}: a unidade fica menor, o número fica maior. Multiplica por ${k}.`, 'passo');
    await E.linha(`<span>1 ${u} = ${k} ${su}</span>`);
    await K.linha(a);
    await K.linha(v, /,/.test(a) ? `vírgula → ${z}` : `← ${casasTxt(z)}`, 'novo');
    await E.linha(`<span>${a} × ${k}</span>`);
    await E.final(`= ${v} ${su}`);
    await apagar(p);
    await respostaFinal(`<span>${v} ${su}</span>`, { perg });
    await regras5(s, `Da maior para a menor (${u} → ${su}): multiplica.`);
  }
  // 7) da menor para a maior: a (cm, g, mL) → ÷ k
  async function cenaConvMenor(s) {
    const a = s.a ?? 750, u = s.u || 'L', [n1, , su, k] = UN2[u], z = zerosDe(k), vN = a / k, v = nf(vN), cheio = comCasas(vN, z);
    const perg = s.perg || `${a} ${su} são quantos ${n1}s?`;
    await poePergunta(perg, false);
    const K = casas(cabDe([String(a), cheio], 4, z));
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    const p = await nota(c.notas, `De ${su} para ${n1}: a unidade fica maior, o número fica menor. Divide por ${k}.`, 'passo');
    await E.linha(`<span>1 ${u} = ${k} ${su}</span>`);
    await K.linha(String(a));
    await K.linha(cheio, `← ${casasTxt(z)}`, 'novo');
    await E.linha(`<span>${a} ÷ ${k}</span>`);
    await E.final(`= ${v} ${u}`);
    await apagar(p);
    if (cheio !== v) { await nota(c.notas, `zero no fim do decimal sai: ${cheio} = ${v}`, 'detalhe'); await wait(800); }
    await respostaFinal(`<span>${v} ${u}</span>`, { perg });
    await regras5(s, `Da menor para a maior (${su} → ${u}): divide.`);
  }
  // 8) dinheiro: k itens de R$ p
  async function cenaDinheiro(s) {
    const p0 = s.p ?? '0,25', k = s.k ?? 10, item = s.item || 'balas', z = zerosDe(k), vN = Math.round(nD(p0) * k * 1e6) / 1e6, v = nf(vN), rs2 = dinheiro(vN);
    const perg = s.perg || `Uma bala custa R$ ${p0}. Quanto custam ${k} balas?`;
    await poePergunta(perg, false);
    const K = casas(cabDe([p0, v], 3, 2));
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    const p = await nota(c.notas, `${k} ${item} de R$ ${p0}: vezes ${k}.`, 'passo');
    await K.linha(p0);
    await K.linha(v, /,/.test(p0) ? 'vírgula →' : `← ${casasTxt(z)}`, 'novo');
    await E.linha(`<span>${p0} × ${k}</span>`);
    await E.final(`= R$ ${rs2}`);
    await apagar(p);
    if (rs2 !== v) { await nota(c.notas, `em dinheiro, escreve com 2 casas: ${v} = ${rs2}`, 'detalhe'); await wait(800); }
    await respostaFinal(`<span>R$ ${rs2}</span>`, { perg });
    await regras5(s, 'Dinheiro × 10, 100: anda a vírgula e escreve com 2 casas.');
  }

  // ── 3-A: negativos, comparar, somar e subtrair ──
  const Pn = (v) => (v < 0 ? `(${negS(v)})` : nf(v));   // negativo entre parênteses
  // a reta do tamanho da conta: do menor ao maior (com o 0), uma casa de folga
  const faixaR = (vals, de, ate) => { const lo = Math.min(...vals, 0) - 1, hi = Math.max(...vals, 0) + 1; return [de ?? lo, ate ?? hi]; };
  const passoR = (de, ate) => (ate - de > 10 ? (ate - de > 15 ? 5 : 2) : 1);
  // 1) onde ficam os negativos
  async function cenaNegos(s) {
    const R = retaNum(-5, 5);
    await etiqueta('NÚMEROS NEGATIVOS', 'abaixo de zero'); ajustaTopo();
    const perg = s.perg || 'Onde ficam os números negativos?';
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    const p = await nota(c.notas, 'Na reta, o 0 fica no meio. Os positivos à direita, os negativos à esquerda.', 'passo');
    R.ponto(0); await wait(1200);
    R.ponto(2); await E.linha('<span>2: 2 casas à direita do 0</span>', 1100);
    R.ponto(-3); await E.linha('<span>−3: 3 casas à esquerda do 0</span>', 1100);
    await apagar(p);
    await nota(c.notas, 'como temperatura abaixo de zero, garagem no subsolo, dívida', 'detalhe');
    await wait(900);
    await respostaFinal('<span>à esquerda do zero</span>', { perg });
    await regras5(s, 'Negativo: à esquerda do 0 na reta. Quanto mais à esquerda, menor.');
  }
  // 2) qual é maior (ou menor): { ns, menor }
  async function cenaNegMaior(s) {
    const ns = s.ns || [-5, -2], menor = !!s.menor, [de, ate] = faixaR(ns, s.de, s.ate);
    const R = retaNum(de, ate, passoR(de, ate));
    const ord = [...ns].sort((x, y) => x - y), certo = menor ? ord[0] : ord[ord.length - 1];
    const lista = ns.map(negS), perg = s.perg || `Qual é ${menor ? 'menor' : 'maior'}: ${lista.slice(0, -1).join(', ')} ou ${lista[lista.length - 1]}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    const p = await nota(c.notas, ns.length === 2 ? `Marca os dois na reta. O que está mais à ${menor ? 'esquerda é o menor' : 'direita é o maior'}.` : `Marca todos na reta. O que está mais à ${menor ? 'esquerda é o menor' : 'direita é o maior'}.`, 'passo');
    for (const [i, v] of ns.entries()) { R.ponto(v); await wait(i === ns.length - 1 ? 1000 : 600); }
    if (ns.length === 2) {
      const outro = ns.find((v) => v !== certo);
      await E.linha(`<span>${negS(certo)} está à ${menor ? 'esquerda' : 'direita'} de ${negS(outro)}</span>`, 1200);
      await E.final(menor ? `${negS(certo)} < ${negS(outro)}` : `${negS(certo)} > ${negS(outro)}`);
    } else {
      await E.linha(`<span>${ord.map(negS).join(' < ')}</span>`, 1200);
      await E.final(`${menor ? 'menor' : 'maior'}: ${negS(certo)}`);
    }
    await apagar(p);
    // a pegadinha: achar que −5 > −2 porque 5 > 2
    const negs = ns.filter((v) => v < 0);
    const trap = menor ? (negs.length ? Math.max(...negs) : null) : (negs.length ? Math.min(...negs) : null);
    if (trap !== null && trap !== certo && Math.abs(trap) > Math.abs(certo) === !menor) {
      await pegadinha(c, menor ? `${negS(trap)} < ${negS(certo)}` : `${negS(trap)} > ${negS(certo)}`, menor ? `no negativo, o ${-trap} é mais perto do zero` : `no negativo, o ${-trap} é mais longe do zero, para baixo`, menor ? `${negS(certo)} < ${negS(trap)}` : `${negS(certo)} > ${negS(trap)}`);
    }
    await respostaFinal(`<span>${negS(certo)}</span>`, { perg });
    await regras5(s, 'Mais à direita é maior. Entre negativos: o mais perto do zero é o maior.');
  }
  // a página de reta do protótipo (pagReta): começa no ini, pula até cada ponto de "pts"
  async function pagReta(s, perg, ini, pts, linhas, passo1, final) {
    const [de, ate] = faixaR([ini, ...pts], s.de, s.ate);
    const R = retaNum(de, ate, passoR(de, ate));
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>${linhas[0]}</span>`);
    const p = await nota(c.notas, passo1, 'passo');
    R.ponto(ini); await wait(500);
    let a = ini;
    for (const b of pts) { await R.salto(a, b); R.ponto(b); a = b; }
    for (const l of linhas.slice(1)) await E.linha(`<span>${l}</span>`);
    await E.final(final);
    await apagar(p);
    return { c, E };
  }
  // 3 a 6) a + b
  async function cenaNegSoma(s) {
    const a = s.a ?? -5, b = s.b ?? 8, v = a + b, A = negS(a), B = negS(b), mb = Math.abs(b);
    const perg = s.perg || `Quanto é ${A} + ${Pn(b)}?`;
    let r, det = null;
    if (b < 0) {
      const passo = a < 0 ? `"+ (${B})" é somar uma dívida: anda ${mb} para a esquerda.` : v < 0 ? `Começa no ${A} e anda ${mb} para a esquerda: passa do zero.` : v === 0 ? `Começa no ${A} e anda ${mb} para a esquerda: chega no 0.` : `Começa no ${A} e anda ${mb} para a esquerda.`;
      const { c } = await pagReta(s, perg, a, [v], [`${A} + (${B})`, `= ${A} − ${mb}`], passo, `= ${negS(v)}`);
      det = a < 0 ? '+ (−) vira −' : v < 0 ? `tinha ${A}, tirou ${mb}: faltam ${-v}` : v === 0 ? `tinha ${A}, tirou ${mb}: não sobra nada` : `tinha ${A}, tirou ${mb}: sobram ${v}`;
      await nota(c.notas, det, 'detalhe'); await wait(800);
      r = a < 0 ? `Somar negativo é andar para a esquerda: + (${B}) = − ${mb}.` : v < 0 ? 'Passou do zero para a esquerda: fica negativo.' : 'Somar negativo: anda para a esquerda na reta.';
    } else {
      await pagReta(s, perg, a, [v], [`${A} + ${B}`], v === 0 ? `Começa no ${A} e anda ${b} para a direita: chega no 0.` : `Começa no ${A}. "+ ${b}": anda ${b} casas para a direita.`, `= ${negS(v)}`);
      r = v === 0 ? `Um número mais o oposto dele dá 0: ${A} + ${B} = 0.` : 'Somar positivo: anda para a direita na reta.';
    }
    await respostaFinal(`<span>${negS(v)}</span>`, { perg });
    await regras5(s, r);
  }
  // 7 e 8) a − b (b positivo)
  async function cenaNegSub(s) {
    const a = s.a ?? 6, b = s.b ?? 10, v = a - b, A = negS(a);
    const perg = s.perg || `Quanto é ${A} − ${b}?`;
    if (a >= 0) {
      const { c } = await pagReta(s, perg, a, [v], [`${A} − ${b}`], `Subtrair: anda para a esquerda. Do ${A}, ${b} casas.`, `= ${negS(v)}`);
      if (b > a) await pegadinha(c, String(b - a), `${b} − ${A} = ${b - a}, mas a conta é ${A} − ${b}: passa do zero`, negS(v));
      await respostaFinal(`<span>${negS(v)}</span>`, { perg });
      await regras5(s, 'Tirar mais do que tem: o resultado fica negativo.');
    } else {
      const { c } = await pagReta(s, perg, a, [v], [`${A} − ${b}`], `Já está no ${A} e anda mais ${b} para a esquerda.`, `= ${negS(v)}`);
      await nota(c.notas, `dívida de ${-a} e mais uma de ${b}: dívida de ${-v}`, 'detalhe');
      await wait(800);
      await respostaFinal(`<span>${negS(v)}</span>`, { perg });
      await regras5(s, 'Negativo menos positivo: soma os números e fica negativo.');
    }
  }
  // 9) menos com menos: a − (−b)
  async function cenaMenosMenos(s) {
    const a = s.a ?? 5, b = s.b ?? 3, v = a + b, A = negS(a), [de, ate] = faixaR([a, v], s.de, s.ate);
    const R = retaNum(de, ate, passoR(de, ate));
    const perg = s.perg || `Quanto é ${A} − (−${b})?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>${A} − (−${b})</span>`);
    let p = await nota(c.notas, `Menos com menos: tirar uma dívida é ganhar. − (−${b}) vira + ${b}.`, 'passo');
    await E.linha(`<span>= ${A} ${SB('+')} ${b}</span>`);
    await apagar(p);
    p = await nota(c.notas, `Do ${A}, anda ${b} para a direita.`, 'passo');
    R.ponto(a); await R.salto(a, v); R.ponto(v);
    await E.final(`= ${negS(v)}`);
    await apagar(p);
    await pegadinha(c, `${A} − ${b} = ${negS(a - b)}`, 'os dois sinais de menos viram +', `${A} + ${b} = ${negS(v)}`);
    await respostaFinal(`<span>${negS(v)}</span>`, { perg });
    await regras5(s, '− (−) vira +. + (−) vira −.');
  }
  // 10) temperatura (e o elevador): de a, sobe b
  async function cenaTemperatura(s) {
    const a = s.a ?? -2, b = s.b ?? 5, v = a + b, A = negS(a), el2 = !!s.elevador;
    const perg = s.perg || `A temperatura era ${A} °C e subiu ${b} graus. Quanto está agora?`;
    await pagReta(s, perg, a, [v], [`${A} + ${b}`], `"${el2 ? 'Subo' : 'Subiu'}" é +: do ${A}, anda ${b} para cima (para a direita na reta).`, `= ${negS(v)}`);
    await respostaFinal(`<span>${el2 ? `andar ${negS(v)}` : `${negS(v)} °C`}</span>`, { perg });
    await regras5(s, 'Subiu, ganhou: +. Desceu, gastou: −.');
  }
  // 11) saldo: tinha t, gastou g
  async function cenaSaldo(s) {
    const t = s.tinha ?? 10, g = s.g ?? 15, v = t - g;
    const perg = s.perg || `Tinha R$ ${t} na conta e gastei R$ ${g}. Qual é o saldo?`;
    await pagReta(s, perg, t, [v], [`${t} − ${g}`], `"Gastei" é −: do ${t}, anda ${g} para a esquerda.`, `= ${negS(v)}`);
    await respostaFinal(`<span>${v < 0 ? `−R$ ${-v} (devendo ${-v})` : `R$ ${v}`}</span>`, { perg });
    await regras5(s, v < 0 ? 'Saldo negativo: gastou mais do que tinha.' : 'Saldo: o que tinha menos o que gastou.');
  }
  // a + b − c (cartão; na reta, um pulo de cada vez)
  async function cenaNegTres(s) {
    const a = s.a ?? -3, b = s.b ?? 3, c0 = s.c ?? 4, m = a + b, v = m - c0, A = negS(a);
    const perg = s.perg || `Quanto é ${A} + ${Pn(b)} − ${Pn(c0)}?`;
    const lin = [`${A} + ${Pn(b)} − ${Pn(c0)}`];
    if (b < 0 || c0 < 0) lin.push(`= ${A} ${b < 0 ? '−' : '+'} ${Math.abs(b)} ${c0 < 0 ? '+' : '−'} ${Math.abs(c0)}`);
    const ida = (x, sinal) => (x > 0 === (sinal === '+') ? `anda ${Math.abs(x)} para a direita` : `anda ${Math.abs(x)} para a esquerda`);
    const passo = `Começa no ${A}. "+ ${Pn(b)}": ${ida(b, '+')}; depois "− ${Pn(c0)}": ${ida(c0, '−')}.`;
    await pagReta(s, perg, a, [m, v], lin, passo, `= ${negS(v)}`);
    await respostaFinal(`<span>${negS(v)}</span>`, { perg });
    await regras5(s, 'Na reta: + anda para a direita, − para a esquerda. + (−) vira −; − (−) vira +.');
  }

  // ── 3-B: negativos, multiplicar e dividir ──
  // 1) a regra dos sinais
  async function cenaRegraSinais(s) {
    L.classList.add('sem-hist', 'r3p');
    await etiqueta('REGRA DOS SINAIS', 'vale para × e ÷'); ajustaTopo();
    const perg = s.perg || 'Que sinal dá a multiplicação de negativos?';
    await poePergunta(perg, false);
    const c = cartao(); const ls = el('div', 'qd-lista3', '', c.conta);
    await ler(perg);
    const p = await nota(c.notas, 'Primeiro faz a conta sem sinal. Depois olha os sinais:', 'passo');
    for (const [a, r, pq] of [['+ × +', '+', 'sinais iguais'], ['− × −', '+', 'sinais iguais'], ['+ × −', '−', 'sinais diferentes'], ['− × +', '−', 'sinais diferentes']]) {
      el('div', 'l3 qd-pop', `<span class="par">${a} =</span><span class="par" style="color: var(--qd-amarelo)">${r}</span><span class="pq">${pq}</span>`, ls);
      await wait(1400);
    }
    await apagar(p);
    await respostaFinal(`<span>${s.resp || 'iguais: + · diferentes: −'}</span>`, { perg, manter: true });
    await regras5(s, 'Sinais iguais dão +. Sinais diferentes dão −. Vale para × e para ÷.');
  }
  const EXT3 = ['zero', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  // 2) negativo × positivo na reta: b pulos de a
  async function cenaNegVezes(s) {
    const a = s.a ?? -2, b = s.b ?? 3, v = a * b, A = negS(a), ma = -a;
    const R = retaNum(s.de ?? v - 1, s.ate ?? 1);
    const perg = s.perg || `Quanto é ${Pn(a)} × ${b}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>${Pn(a)} × ${b}</span>`);
    const p = await nota(c.notas, `${b} vezes o ${A}: soma o ${A} ${EXT3[b] || b} vezes. Na reta, ${b} pulos de ${ma} para a esquerda.`, 'passo');
    await E.linha(`<span>= ${b <= 4 ? Array(b).fill(Pn(a)).join(' + ') : `${Pn(a)} + ${Pn(a)} + … + ${Pn(a)}`}</span>`);
    R.ponto(0);
    for (let i = 0; i < b; i++) await R.salto(i * a, (i + 1) * a);
    R.ponto(v);
    await E.final(`= ${negS(v)}`);
    await apagar(p);
    await nota(c.notas, 'sinais diferentes (− e +): dá −', 'detalhe');
    await wait(800);
    await respostaFinal(`<span>${negS(v)}</span>`, { perg });
    await regras5(s, 'Negativo × positivo = negativo.');
  }
  // 3 a 6) a regra dos sinais na conta: a × b ou a ÷ b
  async function cenaNegSinal(s) {
    const a = s.a ?? -4, b = s.b ?? -5, op = s.op || '×', dv = op === '÷', v = dv ? a / b : a * b, r = Math.abs(v);
    const ig = (a < 0) === (b < 0), w = (x) => (x < 0 ? 'menos' : 'mais');
    const perg = s.perg || `Quanto é ${Pn(a)} ${op} ${Pn(b)}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>${Pn(a)} ${op} ${Pn(b)}</span>`);
    let p = await nota(c.notas, '1º A conta sem sinal.', 'passo');
    await E.linha(`<span>${Math.abs(a)} ${op} ${Math.abs(b)} = ${r}</span>`);
    await apagar(p);
    p = await nota(c.notas, `2º Os sinais: ${w(a)} com ${w(b)}, ${ig ? 'iguais, dá +' : 'diferentes, dá −'}.`, 'passo');
    await E.final(`= ${SB(ig ? '+' : '−')}${r}`);
    await apagar(p);
    if (dv && !ig) { await nota(c.notas, `confere: ${Pn(v)} × ${Pn(b)} = ${negS(a)} ✔`, 'detalhe'); await wait(800); }
    if (!dv && a < 0 && b < 0) await pegadinha(c, `−${r}`, 'dois negativos: os sinais são iguais', `+${r}`);
    await respostaFinal(`<span>${negS(v)}</span>`, { perg });
    await regras5(s, dv ? (ig ? 'Negativo ÷ negativo = positivo.' : 'Na divisão, a regra dos sinais é a mesma.') : ig ? 'Negativo × negativo = positivo.' : 'Positivo × negativo = negativo.');
  }
  // 7) vezes zero
  async function cenaVezesZero(s) {
    const a = s.a ?? -6;
    const perg = s.perg || `Quanto é ${Pn(a)} × 0?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>${Pn(a)} × 0</span>`);
    const p = await nota(c.notas, 'Qualquer número vezes zero dá zero. O zero não tem sinal.', 'passo');
    await E.final('= 0');
    await apagar(p);
    await respostaFinal('<span>0</span>', { perg });
    await regras5(s, 'Vezes 0 dá 0, com ou sem sinal.');
  }
  // 8) três números: a × b × c
  async function cenaTresNum(s) {
    const a = s.a ?? -3, b = s.b ?? -2, c0 = s.c ?? -1, ab = a * b, v = ab * c0, nNeg = [a, b, c0].filter((x) => x < 0).length;
    const perg = s.perg || `Quanto é ${Pn(a)} × ${Pn(b)} × ${Pn(c0)}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>${Pn(a)} × ${Pn(b)} × ${Pn(c0)}</span>`);
    const ig1 = (a < 0) === (b < 0);
    let p = await nota(c.notas, `De dois em dois. Os dois primeiros: ${ig1 ? 'iguais, dá +' : 'diferentes, dá −'}${Math.abs(ab)}.`, 'passo');
    await E.linha(`<span>= ${Pn(ab)} × ${Pn(c0)}</span>`);
    await apagar(p);
    const ig2 = (ab < 0) === (c0 < 0);
    p = await nota(c.notas, `Agora ${ab < 0 ? '−' : '+'} com ${c0 < 0 ? '−' : '+'}: dá ${ig2 ? '+' : '−'}.`, 'passo');
    await E.final(`= ${negS(v)}`);
    await apagar(p);
    await nota(c.notas, nNeg === 3 ? '3 sinais de menos: um fica sem par, dá −' : nNeg % 2 ? `${nNeg} sinal de menos: ímpar, dá −` : `${nNeg} sinais de menos: par, dá +`, 'detalhe');
    await wait(900);
    await respostaFinal(`<span>${negS(v)}</span>`, { perg });
    await regras5(s, 'Conta os sinais de menos: par dá +, ímpar dá −.');
  }
  // 9) vezes (ou dividido) e mais: a op b + c
  async function cenaVezesMais(s) {
    const a = s.a ?? -2, b = s.b ?? 5, c0 = s.c ?? 4, op = s.op || '×', m = op === '÷' ? a / b : a * b, v = m + c0;
    const [de, ate] = faixaR([m, v], s.de, s.ate);
    const R = retaNum(de, ate, passoR(de, ate));
    const ig = (a < 0) === (b < 0);
    const perg = s.perg || `Quanto é ${Pn(a)} ${op} ${Pn(b)} + ${Pn(c0)}?`;
    await poePergunta(perg, false);
    const c = cartao(); const E = contaEq(c.conta);
    await ler(perg);
    await E.linha(`<span>${Pn(a)} ${op} ${Pn(b)} + ${Pn(c0)}</span>`);
    let p = await nota(c.notas, `Primeiro o ${op}: ${Pn(a)} ${op} ${Pn(b)} = ${negS(m)} (${ig ? 'iguais, dá +' : 'diferentes, dá −'}).`, 'passo');
    await E.linha(`<span>= ${negS(m)} + ${Pn(c0)}</span>`);
    await apagar(p);
    p = await nota(c.notas, `Depois a soma na reta: do ${negS(m)}, anda ${Math.abs(c0)} para a ${c0 > 0 ? 'direita' : 'esquerda'}.`, 'passo');
    R.ponto(m); await R.salto(m, v); R.ponto(v);
    await E.final(`= ${negS(v)}`);
    await apagar(p);
    await respostaFinal(`<span>${negS(v)}</span>`, { perg });
    await regras5(s, 'Primeiro × e ÷ (com a regra dos sinais), depois + e − (na reta).');
  }

  // ══════════════════ 10: regra de três (PROMPT-217; protótipos referencia/lousa-10a.html e lousa-10b.html) ══════════════════
  // A tabela é a conta: fica no quadro até o fim (sem histórico), com a resolução ao lado e a resposta embaixo.
  // tabela: cab = nomes das colunas; lin = [[linha 1], [linha 2]] (o 'x' na última coluna, embaixo)
  function tabelaR3(pai, cab, lin) {
    const n = cab.length;
    const t = el('div', 'qd-r3', '', pai);
    t.style.gridTemplateColumns = Array(n).fill('auto 1.1em').join(' ');
    const cel = [[], []], setas = [];
    cab.forEach((c, j) => { const e = el('div', 'r3-cab', esc(c), t); e.style.gridColumn = 2 * j + 1; e.style.gridRow = 1; e.style.visibility = 'hidden'; });
    lin.forEach((L2, i) => L2.forEach((v, j) => { const e = el('div', 'r3-c' + (v === 'x' ? ' x' : ''), virgulas(String(v)), t); e.style.gridColumn = 2 * j + 1; e.style.gridRow = i + 2; e.style.visibility = 'hidden'; cel[i][j] = e; }));
    for (let j = 0; j < n; j++) { const s = el('div', 'r3-seta', '', t); s.style.gridColumn = 2 * j + 2; s.style.gridRow = '2 / span 2'; setas.push(s); }
    const mostra = async (e) => { e.style.visibility = ''; e.classList.add('qd-pop'); await wait(300); };
    return {
      t, cel, setas,
      async monta() { for (const e of t.querySelectorAll('.r3-cab')) await mostra(e); for (const i of [0, 1]) for (const e of cel[i]) await mostra(e); },
      async seta(j, cima, oposta = false) { setas[j].textContent = cima ? '↑' : '↓'; setas[j].classList.toggle('oposta', oposta); setas[j].classList.remove('qd-pop'); void setas[j].offsetWidth; setas[j].classList.add('qd-pop'); await wait(600); },
      // inverte a coluna j: os dois números deslizam e trocam de lugar (offsetTop: certo também com a tela girada)
      async inverte(j) {
        const a = cel[0][j], b = cel[1][j], dy = b.offsetTop - a.offsetTop;
        a.style.transform = `translateY(${dy}px)`; b.style.transform = `translateY(${-dy}px)`;
        await wait(900);
        a.style.transition = b.style.transition = 'none';
        const tmp = a.innerHTML; a.innerHTML = b.innerHTML; b.innerHTML = tmp;
        a.style.transform = b.style.transform = ''; a.getBoundingClientRect();
        a.style.transition = b.style.transition = '';
      },
      // multiplica cruzado (2 colunas): o de cima da 1ª com o x (laranja); o de baixo da 1ª com o de cima da 2ª (lilás)
      async cruza() {
        const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'r3-x'); svg.setAttribute('width', t.offsetWidth); svg.setAttribute('height', t.offsetHeight); t.appendChild(svg);
        const c = (e) => [e.offsetLeft + e.offsetWidth / 2, e.offsetTop + e.offsetHeight / 2];
        const linha = (p, q, cls) => {
          const l = document.createElementNS(NS, 'line'), len = Math.hypot(q[0] - p[0], q[1] - p[1]);
          Object.entries({ x1: p[0], y1: p[1], x2: q[0], y2: q[1], class: cls }).forEach(([k, v]) => l.setAttribute(k, v));
          l.style.strokeDasharray = len; l.style.strokeDashoffset = len; svg.appendChild(l); l.getBoundingClientRect();
          l.style.transition = `stroke-dashoffset ${T(.7)} ease`; l.style.strokeDashoffset = 0;
        };
        const u = cel[0].length - 1;
        cel[0][0].classList.add('p1'); cel[1][u].classList.add('p1'); linha(c(cel[0][0]), c(cel[1][u]), 'l1'); await wait(800);
        cel[1][0].classList.add('p2'); cel[0][u].classList.add('p2'); linha(c(cel[1][0]), c(cel[0][u]), 'l2'); await wait(800);
      },
    };
  }
  // as linhas da resolução (cada "=" numa linha nova); a última fica verde
  async function resolveR3(pai, linhas, final) {
    const ex = el('div', 'qd-xpr', '', pai);
    for (const l of linhas) { el('div', 'xl qd-pop', `<span>${virgulas(l)}</span>`, ex); await wait(800); }
    const u = el('div', 'xl qd-pop', '<span class="vazio-q qd-rr">?</span>', ex); await wait(500);
    verde(u.querySelector('.qd-rr'), final);
    return ex;
  }
  const REGRA_R3 = 'Regra de três: 1º monta a tabela · 2º setas (inversa? inverte uma coluna) · 3º multiplica cruzado.';
  // a página inteira da regra de três: tabela → setas → (inverte) → cruzado → resolve. Sempre os mesmos passos e textos.
  //   { perg, cab, lin, inversa, porque, linhas, final, resp, perguntaFinal, extraNota, etq: [nome, sub], regras }
  //   conta: 'x = 6 × 4' (10-B "qual é a conta?": o final é a conta e a resposta "a conta é …")
  async function cenaR3(s) {
    L.classList.add('sem-hist', 'r3p');   // sem histórico: a tabela e a resolução usam a largura toda
    if (s.etq) await etiqueta(...s.etq);
    const perg = s.perg;
    const final = s.conta || s.final, resp = s.resp || (s.conta ? `<span>a conta é ${esc(s.conta.replace('x = ', ''))}</span>` : `<span>${esc(s.final)}</span>`);
    await poePergunta(perg, false);
    const c = cartao(); c.conta.classList.add('r3-lado');
    const Tb = tabelaR3(c.conta, s.cab, s.lin);
    await ler(perg);
    let p = await nota(c.notas, '1º Monta a tabela: cada grandeza numa coluna, o que não sabe é o x.', 'passo');
    await Tb.monta(); await wait(500); await apagar(p);
    p = await nota(c.notas, '2º Setas: na coluna do x, para baixo.', 'passo');
    await Tb.seta(1, false); await apagar(p);
    p = await nota(c.notas, s.porque, 'passo');
    await Tb.seta(0, !!s.inversa, !!s.inversa); await wait(600); await apagar(p);
    await nota(c.notas, s.inversa ? 'inversas: setas opostas' : 'diretas: setas no mesmo sentido', 'detalhe');
    if (s.inversa) {
      p = await nota(c.notas, 'Inversa: inverte a coluna da seta errada (troca os dois de lugar).', 'passo');
      await Tb.inverte(0); await Tb.seta(0, false); await wait(400); await apagar(p);
    }
    p = await nota(c.notas, '3º Multiplica cruzado e resolve.', 'passo');
    await Tb.cruza();
    await resolveR3(c.conta, s.linhas, final);
    await wait(600); await apagar(p);
    if (s.extraNota) await nota(c.notas, s.extraNota, 'detalhe');
    await respostaFinal(resp, { perg: s.perguntaFinal || perg, manter: true });   // a tabela continua no quadro, a resposta embaixo
    for (const r of s.regras || [REGRA_R3]) await regra(r);
  }
  // com três grandezas: uma seta por coluna, comparando cada uma com a do x
  //   { perg, cab: [a, b, c], lin: [[a1, b1, c1], [a2, b2, 'x']], porque, linhas, final, resp }
  async function cenaR3Comp(s) {
    L.classList.add('sem-hist', 'r3p');
    const perg = s.perg;
    await poePergunta(perg, false);
    const c = cartao(); c.conta.classList.add('r3-lado');
    const Tb = tabelaR3(c.conta, s.cab, s.lin);
    await ler(perg);
    let p = await nota(c.notas, '1º Monta a tabela: agora são 3 colunas.', 'passo');
    await Tb.monta(); await wait(400); await apagar(p);
    p = await nota(c.notas, '2º Setas: na coluna do x, para baixo. Compara cada coluna com a do x.', 'passo');
    await Tb.seta(2, false);
    await Tb.seta(0, false); await wait(400);
    await Tb.seta(1, false);
    await nota(c.notas, s.porque || 'as duas diretas', 'detalhe');
    await apagar(p);
    p = await nota(c.notas, '3º O x vezes os de cima das outras = o de cima do x vezes os de baixo das outras.', 'passo');
    await resolveR3(c.conta, s.linhas, s.final);
    await wait(600); await apagar(p);
    await respostaFinal(s.resp || `<span>${esc(s.final)}</span>`, { perg, manter: true });
    for (const r of s.regras || ['Com 3 colunas: setas comparando cada uma com a do x; depois multiplica como na tabela.']) await regra(r);
  }
  // grandezas diretas (↑ ↑) ou inversas (↑ ↓): a lista, uma linha de cada vez
  const GRAND_R3 = {
    diretas: { etq: ['GRANDEZAS DIRETAS', 'uma aumenta, a outra também'], perg: 'Quando uma aumenta, a outra também aumenta?',
      itens: [['produtos', 'preço', '↑'], ['ingredientes', 'bolos', '↑'], ['horas trabalhadas', 'salário', '↑'], ['litros de gasolina', 'km rodados', '↑']],
      nota: 'As duas sobem juntas: na tabela, setas no mesmo sentido.', resp: 'diretas: ↑ e ↑', regra: 'Diretas: uma aumenta e a outra também. Setas no mesmo sentido.' },
    inversas: { etq: ['GRANDEZAS INVERSAS', 'uma aumenta, a outra diminui'], perg: 'Quando uma aumenta, a outra diminui?',
      itens: [['trabalhadores', 'tempo de obra', '↓'], ['velocidade', 'tempo de viagem', '↓'], ['torneiras abertas', 'tempo para encher', '↓'], ['pessoas na pizza', 'pedaços para cada um', '↓']],
      nota: 'Uma sobe e a outra desce: na tabela, setas opostas.', resp: 'inversas: ↑ e ↓', regra: 'Inversas: uma aumenta e a outra diminui. Setas opostas: inverte uma coluna.' },
  };
  async function cenaGrandezas(s) {
    const G = GRAND_R3[s.tipo] || GRAND_R3.diretas;
    if (!s.perg) await etiqueta(...G.etq);
    L.classList.add('sem-hist', 'r3p');
    const perg = s.perg || G.perg;
    await poePergunta(perg);
    const c = cartao(); const ex = el('div', 'qd-xpr', '', c.conta);
    for (const [a, b, sb] of G.itens) {
      el('div', 'xl qd-pop', `<span class="qd-gr">mais ${esc(a)} <b class="up">↑</b></span><span class="qd-gr">${sb === '↑' ? 'mais' : 'menos'} ${esc(b)} <b class="${sb === '↑' ? 'up' : 'dn'}">${sb}</b></span>`, ex);
      await wait(1400);
    }
    const p = await nota(c.notas, G.nota, 'passo');
    await wait(1200); await apagar(p);
    await respostaFinal(`<span>${G.resp}</span>`, { perg: G.perg, manter: true });
    for (const r of s.regras || [G.regra]) await regra(r);
  }

  // ══════════════════ 10-A: direta ou inversa, antes da regra de três (PROMPT-218; protótipo referencia/lousa-10a.html) ══════════════════
  // tabela com várias linhas: uma seta por coluna (ocupa todas as linhas), que aponta para o número MAIOR
  function tabProp(pai, cab, lin) {
    const n = cab.length, t = el('div', 'qd-r3', '', pai);
    t.style.gridTemplateColumns = Array(n).fill('auto 1.1em').join(' ');
    const cel = lin.map(() => []), setas = [];
    cab.forEach((c, j) => { const e = el('div', 'r3-cab', esc(c), t); e.style.gridColumn = 2 * j + 1; e.style.gridRow = 1; e.style.visibility = 'hidden'; });
    lin.forEach((L2, i) => L2.forEach((v, j) => { const e = el('div', 'r3-c' + (v === 'x' ? ' x' : ''), virgulas(String(v)), t); e.style.gridColumn = 2 * j + 1; e.style.gridRow = i + 2; e.style.visibility = 'hidden'; cel[i][j] = e; }));
    for (let j = 0; j < n; j++) { const s = el('div', 'r3-seta', '', t); s.style.gridColumn = 2 * j + 2; s.style.gridRow = `2 / span ${lin.length}`; setas.push(s); }
    const mostra = async (e) => { e.style.visibility = ''; e.classList.add('qd-pop'); await wait(300); };
    return { t, cel, setas,
      async cab() { for (const e of t.querySelectorAll('.r3-cab')) await mostra(e); },
      async linha(i) { for (const e of cel[i]) await mostra(e); await wait(250); },
      async monta() { await this.cab(); for (let i = 0; i < lin.length; i++) await this.linha(i); },
      async seta(j, cima, oposta = false) { setas[j].textContent = cima ? '↑' : '↓'; setas[j].classList.toggle('oposta', oposta); setas[j].classList.remove('qd-pop'); void setas[j].offsetWidth; setas[j].classList.add('qd-pop'); await wait(700); },
      marca(i, cls = 'p1') { cel[i].forEach((e) => e.classList.add(cls)); },
    };
  }
  // uma coluna com um enunciado curto (letra de mão) em cima de uma tabela: dois exemplos lado a lado (.dois-ex)
  const exCol = (pai, txt) => { const c = el('div', 'ex-col', '', pai); el('div', 'ex-cap', esc(txt), c); return c; };
  const REGRA_SETA = 'A seta aponta para o número maior. Mesma direção: direta. Direções contrárias: inversa.';
  // 1 e 2) diretamente / inversamente proporcional: tabela de 3 linhas, as setas uma por vez, "dobrou → dobrou / caiu pela metade"
  const PROP_R3 = {
    direta: { etq: ['DIRETA OU INVERSA?', 'compara as duas colunas'], perg: 'Cada pão custa R$ 3. Quando os pães aumentam, o preço aumenta ou diminui?',
      cab: ['pães', 'preço (R$)'], lin: [[1, 3], [2, 6], [3, 9]], inversa: false,
      notas: ['Monta a tabela: 1, 2, 3 pães e o preço de cada.', 'Os pães aumentam (1, 2, 3): a seta aponta para o maior, para baixo.', 'O preço também aumenta (3, 6, 9): seta para baixo também.'],
      detalhe: 'as duas aumentam: setas na mesma direção', repara: 'Repara: dobrou os pães, dobrou o preço.',
      cmp: ['1 → 2 pães: <b class="qd-cmpA">× 2</b>', 'R$ 3 → R$ 6: <b class="qd-cmpA">× 2</b>'],
      resp: 'diretamente proporcionais', regra: 'Direta: uma aumenta e a outra também. Setas na mesma direção.' },
    inversa: { perg: '1 pedreiro faz um muro em 12 dias. Com mais pedreiros, os dias aumentam ou diminuem?',
      cab: ['pedreiros', 'dias'], lin: [[1, 12], [2, 6], [3, 4]], inversa: true,
      notas: ['Monta a tabela: mais gente trabalhando, o muro fica pronto antes.', 'Os pedreiros aumentam (1, 2, 3): seta para baixo, onde está o maior.', 'Os dias diminuem (12, 6, 4): o maior está em cima, a seta aponta para cima.'],
      detalhe: 'um aumenta, o outro diminui: setas em direções contrárias', repara: 'Repara: dobrou os pedreiros, os dias caíram pela metade.',
      cmp: ['1 → 2 pedreiros: <b class="qd-cmpA">× 2</b>', '12 → 6 dias: <b class="qd-cmpB">÷ 2</b>'],
      resp: 'inversamente proporcionais', regra: 'Inversa: uma aumenta e a outra diminui. Setas em direções contrárias.' },
  };
  async function cenaProp(s) {
    const P = { ...(PROP_R3[s.tipo] || PROP_R3.direta), ...s };
    if (P.etq) { await etiqueta(...P.etq); ajustaTopo(); }
    L.classList.add('sem-hist', 'r3p');
    await poePergunta(P.perg, false);
    const c = cartao(); c.conta.classList.add('r3-lado');
    const Tb = tabProp(c.conta, P.cab, P.lin);
    const ex = el('div', 'qd-xpr', '', c.conta);
    await ler(P.perg);
    let p = await nota(c.notas, P.notas[0], 'passo');
    await Tb.monta(); await apagar(p);
    p = await nota(c.notas, P.notas[1], 'passo');
    await Tb.seta(0, false); await apagar(p);
    p = await nota(c.notas, P.notas[2], 'passo');
    await Tb.seta(1, P.inversa, P.inversa); await apagar(p);
    await nota(c.notas, P.detalhe, 'detalhe');
    p = await nota(c.notas, P.repara, 'passo');
    Tb.marca(0, 'p1'); Tb.marca(1, 'p2');
    el('div', 'xl qd-pop', `<span>${P.cmp[0]}</span>`, ex); await wait(900);
    el('div', 'xl qd-pop', `<span>${P.cmp[1]}</span>`, ex); await wait(1200);
    await apagar(p);
    await respostaFinal(`<span>${P.resp}</span>`, { perg: P.perg, manter: true });
    for (const r of s.regras || [P.regra]) await regra(r);
  }
  // 3) como pôr as setas: dois exemplos lado a lado (direta à esquerda, inversa à direita), cada um com os 3 passos
  //   ex: { cap, cab, lin, inversa, n2, n3 } (o cartão do erro troca um deles pela tabela da questão)
  const SETAS_EX = {
    A: { cap: '3 canetas custam R$ 12. Quanto custam 6?', cab: ['canetas', 'preço (R$)'], lin: [[3, 12], [6, 'x']], inversa: false,
      n2: '2º Pergunta: mais canetas, o preço aumenta ou diminui? Aumenta.', n3: '3º Aumenta: a seta vai na mesma direção da do x.' },
    B: { cap: '2 pedreiros: 10 dias. E 4 pedreiros?', cab: ['pedreiros', 'dias'], lin: [[2, 10], [4, 'x']], inversa: true,
      n2: '2º Pergunta: mais pedreiros, os dias aumentam ou diminuem? Diminuem.', n3: '3º Diminui: a seta vai na direção contrária, para cima.' },
  };
  async function cenaSetas(s) {
    L.classList.add('sem-hist', 'r3p');
    const perg = s.perg || 'Como colocar as setas na tabela da regra de três?';
    await poePergunta(perg, false);
    const c = cartao(); c.conta.classList.add('r3-lado', 'dois-ex');
    const exs = [{ ...SETAS_EX.A, ...(s.A || {}) }, { ...SETAS_EX.B, ...(s.B || {}) }].map((e) => {
      const col = exCol(c.conta, e.cap); col.style.visibility = 'hidden';
      return { ...e, col, Tb: tabelaR3(col, e.cab, e.lin) };
    });
    await ler(perg);
    for (const e of exs) {
      e.col.style.visibility = ''; e.col.classList.add('qd-pop'); await wait(1500);
      await e.Tb.monta();
      let p = await nota(c.notas, '1º Na coluna do x, a seta é sempre para baixo.', 'passo');
      await e.Tb.seta(1, false); await apagar(p);
      p = await nota(c.notas, e.n2, 'passo');
      await wait(1400); await apagar(p);
      p = await nota(c.notas, e.n3, 'passo');
      await e.Tb.seta(0, e.inversa, e.inversa);
      el('div', `ex-vd${e.inversa ? ' inv' : ''} qd-pop`, e.inversa ? '↑ ↓ inversa' : '↓ ↓ direta', e.col); await wait(900); await apagar(p);
    }
    await respostaFinal(s.resp || '<span>aumenta: mesma direção · diminui: contrária</span>', { perg, manter: true });
    for (const r of s.regras || ['1º seta do x para baixo · 2º "aumenta ou diminui?" · 3º aumenta: igual; diminui: contrária.']) await regra(r);
  }
  // 4) pegadinha: as duas diminuem também é direta
  async function cenaDiminui(s) {
    L.classList.add('sem-hist', 'r3p');
    const perg = s.perg || '4 cadernos custam R$ 20. Quanto custa 1 caderno? É direta ou inversa?';
    await poePergunta(perg, false);
    const c = cartao(); c.conta.classList.add('r3-lado');
    const Tb = tabelaR3(c.conta, s.cab || ['cadernos', 'preço (R$)'], s.lin || [[4, 20], [1, 'x']]);
    const ex = el('div', 'qd-xpr', '', c.conta);
    await ler(perg);
    await Tb.monta();
    let p = await nota(c.notas, s.n1 || 'Seta do x para baixo. Menos cadernos, o preço aumenta ou diminui? Diminui.', 'passo');
    await Tb.seta(1, false); await wait(800); await apagar(p);
    p = await nota(c.notas, 'Cuidado: diminuir não quer dizer inversa.', 'passo');
    el('div', 'xl qd-pop', '<span class="qd-risca-inv">diminuiu → inversa</span><span class="qd-v-inv">✖</span>', ex); await wait(1300);
    await apagar(p);
    p = await nota(c.notas, s.n2 || 'Os cadernos diminuem E o preço diminui: as duas andam juntas.', 'passo');
    await Tb.seta(0, false); await wait(500); await apagar(p);
    el('div', 'qd-certo-baixo qd-pop', '<span>as duas diminuem: direta</span><span class="ok-ic">✔</span>', ex); await wait(1200);
    await nota(c.notas, 'inversa é quando uma aumenta e a outra diminui', 'detalhe');
    await wait(600);
    await respostaFinal('<span>diretamente proporcionais</span>', { perg, manter: true });
    for (const r of s.regras || ['As duas diminuem também é direta: o que importa é se andam juntas.']) await regra(r);
  }
  // 5) treino rápido: as frases entram uma por vez; a resposta de cada uma depois de uma pausa
  const TREINO_DI = [
    ['mais velocidade', 'menos tempo de viagem', false], ['mais litros de gasolina', 'mais km rodados', true],
    ['mais torneiras abertas', 'menos tempo para encher', false], ['menos horas trabalhadas', 'menor salário', true],
    ['mais pessoas na pizza', 'menos pedaços para cada um', false],
  ];
  async function cenaTreinoDI(s) {
    L.classList.add('sem-hist', 'r3p');
    const perg = s.perg || 'Direta ou inversa?';
    await poePergunta(perg, false);
    const c = cartao(); const ex = el('div', 'qd-xpr treino', '', c.conta);
    await ler(perg);
    const p = await nota(c.notas, 'Para cada frase: as duas andam juntas ou uma sobe e a outra desce?', 'passo');
    for (const [a, b, dir] of s.itens || TREINO_DI) {
      const r = el('div', 'tr-l qd-pop', `<span class="tr-f">${esc(a)}</span><span class="tr-f">${esc(b)}</span><span class="vd" style="visibility: hidden">${dir ? '↓ ↓ direta' : '↑ ↓ inversa'}</span>`, ex);
      await wait(2200);
      const v = r.querySelector('.vd'); v.style.visibility = ''; v.classList.add('qd-pop', dir ? 'dir' : 'inv');
      await wait(900);
    }
    await apagar(p);
    await respostaFinal('<span>juntas: direta · contrárias: inversa</span>', { perg, manter: true });
    for (const r of s.regras || [REGRA_SETA]) await regra(r);
  }

  // ══════════════════ 11: figuras na lateral (PROMPT-216; protótipos referencia/lousa-11a.html e lousa-11b.html) ══════════════════
  // A figura fica na lateral larga desde o alto (como o plano do 12). Coordenadas em fração do quadro (0 a 1).
  const nU = (v, u) => `${nBR(v)}${u ? ' ' + u : ''}`;
  function figura() {
    L.classList.add('com-lado', 'lado-xl', 'plano-alto');
    LADO.innerHTML = ''; LADO.style.opacity = '';
    ajustaTopo();
    const box = el('div', 'qd-plano', '', LADO);
    const S = Math.min(LADO.clientWidth, LADO.clientHeight) * .97;
    box.style.width = box.style.height = S + 'px';
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${S} ${S}`); svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%'); box.appendChild(svg);
    L.ajustaPlano = () => { const S2 = Math.min(LADO.clientWidth, LADO.clientHeight) * .97; if (S2 > 0) box.style.width = box.style.height = S2 + 'px'; };
    const fs = L.clientWidth * LETRA_MIN / 100 * 1.1;
    const mk = (tag, at, pai = svg) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); pai.appendChild(e); return e; };
    const txt = (x, y, t, cls = 'fg-rot', pai = svg, anc = 'middle') => { const e = mk('text', { x, y, class: cls, 'text-anchor': anc, 'dominant-baseline': 'central' }, pai); e.textContent = t; e.style.fontSize = fs + 'px'; return e; };
    const F = { S, fs, svg, mk, txt, bola: null };
    F.limpa = () => { svg.innerHTML = ''; F.bola = null; };
    // polígono: rótulo de cada lado do lado de fora; ângulos (ang) dentro, perto de cada canto
    F.poli = (pts, rots = [], { ang = null } = {}) => {
      const g = mk('g', {});
      const P = pts.map(([x, y]) => [x * S, y * S]);
      const cx = P.reduce((a, p) => a + p[0], 0) / P.length, cy = P.reduce((a, p) => a + p[1], 0) / P.length;
      mk('polygon', { points: P.map((p) => p.join(',')).join(' '), class: 'fg-fundo' }, g);
      const lados = P.map((p, i) => { const q = P[(i + 1) % P.length]; return mk('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], class: 'fg-lado' }, g); });
      const rot = P.map((p, i) => {
        if (rots[i] == null || rots[i] === '') return null;
        const q = P[(i + 1) % P.length], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
        const nx = mx - cx, ny = my - cy, d = Math.hypot(nx, ny) || 1;
        const lado = Math.abs(nx) > Math.abs(ny) * 1.5;   // lado da esquerda/direita: o texto encosta do lado de fora
        return txt(mx + nx / d * fs * (lado ? .6 : 1.4), my + ny / d * fs * 1.1, String(rots[i]), 'fg-rot', g, lado ? (nx > 0 ? 'start' : 'end') : 'middle');
      });
      const angs = (ang || []).map((a, i) => (a == null ? null : txt(P[i][0] + (cx - P[i][0]) * .3, P[i][1] + (cy - P[i][1]) * .3, a, 'fg-rot', g)));
      return {
        g, lados, rot, angs, P,
        async acende(i, ms = 500) { lados[i].classList.add('on'); rot[i]?.classList.add('on'); await wait(ms); },
        poe(i, t, cls = 'ok') { if (rot[i]) { rot[i].textContent = t; rot[i].classList.add(cls); } },
      };
    };
    // polígono regular de n lados (base deitada)
    F.regular = (n, r = .3, cx = .5, cy = .52) => Array.from({ length: n }, (_, i) => { const a = Math.PI / 2 + Math.PI / n + i * 2 * Math.PI / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
    // grade c × l de quadradinhos (maxW/maxH: o espaço que ela pode ocupar, em fração do quadro)
    F.grade = (c, l, { x = .5, y = .5, tam = .74, maxW = tam, maxH = tam, unid = 'cm', cor = '' } = {}) => {
      const cel = Math.min(maxW * S / c, maxH * S / l), w = cel * c, h = cel * l, x0 = x * S - w / 2, y0 = y * S - h / 2;
      const g = mk('g', {});
      const cs = [];
      for (let r = 0; r < l; r++) for (let k = 0; k < c; k++) cs.push(mk('rect', { x: x0 + k * cel, y: y0 + r * cel, width: cel, height: cel, class: 'fg-cel' }, g));
      const borda = [[x0, y0, x0 + w, y0], [x0 + w, y0, x0 + w, y0 + h], [x0 + w, y0 + h, x0, y0 + h], [x0, y0 + h, x0, y0]].map(([a, b, cc, d]) => mk('line', { x1: a, y1: b, x2: cc, y2: d, class: 'fg-lado ' + cor }, g));
      if (unid !== null) { txt(x0 + w / 2, y0 + h + fs * 1, `${c}${unid ? ' ' + unid : ''}`, 'fg-rot', g); txt(x0 - fs * .5, y0 + h / 2, `${l}${unid ? ' ' + unid : ''}`, 'fg-rot', g, 'end'); }
      return {
        g, cs, cel,
        async conta(ms = 170) { for (const [i, e] of cs.entries()) { e.classList.add('on'); if (cel > fs * 1.5) txt(+e.getAttribute('x') + cel / 2, +e.getAttribute('y') + cel / 2, String(i + 1), 'fg-n', g); await wait(ms); } },
        async fileiras(ms = 550) { for (let r = 0; r < l; r++) { for (let k = 0; k < c; k++) cs[r * c + k].classList.add('on'); txt(x0 + w + fs * .5, y0 + (r + .5) * cel, String(c), 'fg-n fg-fila', g, 'start'); await wait(ms); } },
        async contorno(ms = 650) { for (const b of borda) await trilhaLado(F, [+b.getAttribute('x1'), +b.getAttribute('y1')], [+b.getAttribute('x2'), +b.getAttribute('y2')], ms); },
        metade() { mk('polygon', { points: `${x0},${y0 + h} ${x0 + w},${y0 + h} ${x0 + w},${y0}`, class: 'fg-metade' }, g); mk('line', { x1: x0, y1: y0 + h, x2: x0 + w, y2: y0, class: 'fg-diag' }, g); },
        apagaCel() { cs.forEach((e) => e.classList.remove('on')); g.querySelectorAll('.fg-n').forEach(e => e.remove()); },
      };
    };
    // barra dividida em n pedaços (régua: 1 cm em 10 mm; metro: 100 cm em 10 pedaços de 10 cm)
    F.barra = (n, { y = .5, esq = '0', dir = '', leg = '' } = {}) => {
      const x0 = .1 * S, x1 = .9 * S, h = .12 * S, y0 = y * S - h / 2, seg = (x1 - x0) / n;
      const g = mk('g', {});
      mk('rect', { x: x0, y: y0, width: x1 - x0, height: h, class: 'fg-barra' }, g);
      const sg = Array.from({ length: n }, (_, i) => mk('rect', { x: x0 + i * seg, y: y0, width: seg, height: h, class: 'fg-seg' }, g));
      txt(x0, y0 + h + fs * 1, esq, 'fg-rot', g); txt(x1, y0 + h + fs * 1, dir, 'fg-rot', g);
      if (leg) txt(S / 2, y0 - fs * 1.1, leg, 'fg-leg', g);
      return { async conta(ms = 300) { for (const [i, e] of sg.entries()) { e.classList.add('on'); if (seg > fs * 1.1) txt(+e.getAttribute('x') + seg / 2, y0 + h / 2, String(i + 1), 'fg-n', g); await wait(ms); } } };
    };
    return F;
  }
  // ── a linha que percorre o contorno (perímetro: é a linha que se soma), com uma bolinha na ponta ──
  function trilhaLado(F, p, q, ms) {
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const ln = F.mk('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], class: 'fg-trilha' });
    ln.style.strokeDasharray = len; ln.style.strokeDashoffset = len; ln.getBoundingClientRect();
    ln.style.transition = `stroke-dashoffset ${T(ms / 1000)} linear`; ln.style.strokeDashoffset = 0;
    if (!F.bola) { F.bola = F.mk('circle', { cx: 0, cy: 0, r: F.fs * .38, class: 'fg-bola' }); F.bola.style.transform = `translate(${p[0]}px, ${p[1]}px)`; F.bola.getBoundingClientRect(); }
    F.svg.appendChild(F.bola);
    F.bola.style.transition = `transform ${T(ms / 1000)} linear`;
    F.bola.style.transform = `translate(${q[0]}px, ${q[1]}px)`;
    return wait(ms);
  }
  // percorre os lados na ordem; depois de cada lado, chama aoPassar(k, i)
  async function percorre(F, Pg, ordem, aoPassar = null, ms = 750) {
    for (const [k, i] of ordem.entries()) {
      Pg.rot[i]?.classList.add('on');
      await trilhaLado(F, Pg.P[i], Pg.P[(i + 1) % Pg.P.length], ms);
      if (aoPassar) await aoPassar(k, i);
    }
  }
  // setor (fatia de ângulo) com centro (x, y), raio r, de a1 até a2 graus (anti-horário, 0° = para a direita)
  const setor = (x, y, r, a1, a2) => {
    const R = (a) => [x + r * Math.cos(a * Math.PI / 180), y - r * Math.sin(a * Math.PI / 180)];
    const [x1, y1] = R(a1), [x2, y2] = R(a2), grande = a2 - a1 > 180 ? 1 : 0;
    return `M${x} ${y} L${x1} ${y1} A${r} ${r} 0 ${grande} 0 ${x2} ${y2} Z`;
  };
  // marca de ângulo reto no canto p, entre as direções de p para a e de p para b
  function cantoReto(F, p, a, b, k = .07) {
    const u = (q) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); return [(q[0] - p[0]) / d * k * F.S, (q[1] - p[1]) / d * k * F.S]; };
    const [ux, uy] = u(a), [vx, vy] = u(b);
    return F.mk('path', { d: `M${p[0] + ux} ${p[1] + uy} L${p[0] + ux + vx} ${p[1] + uy + vy} L${p[0] + vx} ${p[1] + vy}`, class: 'fg-canto' });
  }
  const regular100 = (n, r = 44, cx = 50, cy = 52) => Array.from({ length: n }, (_, i) => { const a = Math.PI / 2 + Math.PI / n + i * 2 * Math.PI / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  // ── vitrine: sem histórico e sem lateral; a figura grande é feita no alto, à esquerda; uma cópia pequena voa para o
  //    lugar dela na fileira de baixo (centralizada); depois aparecem o nome e a explicação ──
  function vitrine(n, { vb = '-6 -6 112 112', cls = '' } = {}) {
    L.classList.add('sem-hist', 'sem-lado'); if (cls) L.classList.add(cls);
    const palco = el('div', 'qd-palco', '', L);
    const big = document.createElementNS(NS, 'svg'); big.setAttribute('viewBox', vb); palco.appendChild(big);
    const mk = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); big.appendChild(e); return e; };
    const fila = el('div', 'qd-galeria qd-vitrine', '', FOCO); fila.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    const itens = Array.from({ length: n }, () => {
      const it = el('div', 'gal-item', '', fila);
      const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', vb); it.appendChild(svg);
      return { it, svg, nome: el('div', 'gal-nome', '', it), info: el('div', 'gal-info', '', it) };
    });
    return {
      mk,
      limpa() { big.innerHTML = ''; },
      num(x, y, t) { const e = mk('text', { x, y, class: 'vt-num', 'text-anchor': 'middle', 'dominant-baseline': 'central' }); e.textContent = t; return e; },
      poli(pts) { mk('polygon', { points: pts.map((p) => p.join(',')).join(' '), class: 'gl-fundo' }); return pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; return mk('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], class: 'gl-lado' }); }); },
      reto(p, a, b, k = 11) { const u = (q) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); return [(q[0] - p[0]) / d * k, (q[1] - p[1]) / d * k]; }; const [ux, uy] = u(a), [vx, vy] = u(b); mk('path', { d: `M${p[0] + ux} ${p[1] + uy} L${p[0] + ux + vx} ${p[1] + uy + vy} L${p[0] + vx} ${p[1] + vy}`, class: 'gl-canto' }); },
      // a cópia pequena (sem os números de contagem) voa do desenho grande para o lugar dela; depois aparece o texto
      async voa(i, nome, info) {
        const { it, svg } = itens[i];
        svg.innerHTML = big.innerHTML; svg.querySelectorAll('.vt-num').forEach((e) => e.remove());
        it.classList.add('on');
        const M = mapa(), a = fluxo(big, M), b = fluxo(svg, M);
        svg.style.transformOrigin = '0 0'; svg.style.transition = 'none';
        svg.style.transform = `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / (b.width || 1)})`;
        svg.getBoundingClientRect();
        svg.style.transition = `transform ${T(.9)} cubic-bezier(.4,.1,.25,1)`; svg.style.transform = 'none';
        await wait(950);
        itens[i].nome.textContent = nome; itens[i].info.textContent = info; it.classList.add('txt');
        await wait(700);
      },
    };
  }
  const QUAD = [[.24, .16], [.76, .16], [.76, .68], [.24, .68]];
  const retPts = (a, b, larg = .6) => { const w = larg, h = Math.min(.6, Math.max(.2, larg * b / a)); const x0 = .5 - w / 2, y0 = .45 - h / 2; return [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]]; };
  // triângulo pelos 3 lados (a base é o maior), dentro de [.1, .9] × [.2, .72]
  function triPts(lados) {
    const [B, s1, s2] = [...lados].sort((a, b) => b - a);
    const x = (B * B + s2 * s2 - s1 * s1) / (2 * B), y = Math.sqrt(Math.max(.01, s2 * s2 - x * x));
    const k = Math.min(.7 / B, .5 / y), x0 = .5 - B * k / 2;
    return { pts: [[x0, .72], [x0 + B * k, .72], [x0 + x * k, .72 - y * k]], ordem: [B, s1, s2] };
  }
  const cartaoSoma = () => { const c = cartao(); c.conta.innerHTML = '<div class="qd-fx qd-soma"></div>'; return [c, c.conta.querySelector('.qd-soma')]; };
  const fecha = (alvo, v) => { el('span', 'igual', '=', alvo); verde(el('span', '', '', alvo), v); };
  async function somaPercorrendo(F, Pg, valores, alvo, ms = 750) {
    await percorre(F, Pg, valores.map((_, i) => i), async (k) => { if (k) el('span', 'op', '+', alvo); el('span', 'qd-pop', virgulas(nBR(valores[k])), alvo); await wait(250); }, ms);
  }
  const msConta = (n, base) => Math.min(base, Math.max(60, 5000 / n));   // contar de 1 a n: nunca mais que ~5 s

  // 11-A p.1–4 e 6) perímetro: a linha percorre o contorno e cada lado entra na soma quando ela passa
  //   { forma: 'quadrado', l } · { forma: 'retangulo', a, b } · { forma: 'triangulo', lados: [a, b, c] }; cerca: true (terreno, em m)
  async function cenaPerim(s) {
    const u = s.unid || (s.cerca ? 'm' : 'cm'), forma = s.forma;
    let pts, rots, vals, perg;
    if (forma === 'quadrado') { const l = Number(s.l); pts = QUAD; vals = [l, l, l, l]; perg = `Qual é o perímetro de um quadrado de lado ${nU(l, u)}?`; }
    else if (forma === 'triangulo') { const t = triPts(s.lados.map(Number)); pts = t.pts; vals = t.ordem; perg = `Qual é o perímetro de um triângulo de lados ${s.lados.slice(0, -1).map(v => nU(v, u)).join(', ')} e ${nU(s.lados[2], u)}?`; }
    else { const a = Number(s.a), b = Number(s.b); pts = retPts(Math.max(a, b), Math.min(a, b)); vals = a >= b ? [a, b, a, b] : [b, a, b, a]; perg = s.cerca ? `Um terreno tem ${nU(a, 'm')} por ${nU(b, 'm')}. Quantos metros de cerca para cercar tudo?` : `Qual é o perímetro de um retângulo de ${nU(a, u)} por ${nU(b, u)}?`; }
    perg = s.perg || perg;
    rots = vals.map(v => nU(v, u));
    const P = vals.reduce((a, b) => a + b, 0), dec = vals.some(v => !Number.isInteger(v));
    const F = figura();
    if (s.etq) await etiqueta('PERÍMETRO', 'a linha do contorno');
    await poePergunta(perg, false);
    const Pg = F.poli(pts, rots);
    const [c1, alvo] = cartaoSoma();
    await ler(perg);
    const txtP = s.cerca ? '"Cercar" é contornar: a cerca é a linha do contorno.' : forma === 'triangulo' ? 'Percorre os 3 lados e soma.'
      : forma === 'retangulo' ? 'Percorre o contorno: 2 lados de cada tamanho.' : dec ? 'Percorre o contorno e soma.' : 'Percorre o contorno: soma cada lado que a linha passa.';
    let p = await nota(c1.notas, txtP, 'passo');
    await somaPercorrendo(F, Pg, vals, alvo);
    fecha(alvo, nU(P, u));
    await wait(500); await apagar(p);
    if (forma === 'quadrado') {
      const l = vals[0];
      if (dec) {
        await nota(c1.notas, `${nBR(l)} + ${nBR(l)} = ${nBR(2 * l)} e ${nBR(2 * l)} + ${nBR(2 * l)} = ${nBR(P)}`, 'detalhe');
        await paraHist(c1);
        const c2 = cartao(), rr = contaQ(c2, virgulas(`4 × ${nBR(l)}`));
        p = await nota(c2.notas, `Jeito rápido: 4 lados iguais, 4 × ${nBR(l)}.`, 'passo');
        await wait(900); verde(rr, nU(P, u)); await wait(600); await apagar(p);
      } else await nota(c1.notas, `4 lados iguais: 4 × ${nBR(l)} = ${nBR(P)}`, 'detalhe');
    }
    if (forma === 'retangulo' && !s.cerca) {
      const [a, b] = vals;
      await paraHist(c1);
      const c2 = cartao(); c2.conta.innerHTML = `<div class="qd-fx qd-errado"><span class="qd-x"><span>${nBR(a)} × ${nBR(b)} = ${nBR(a * b)}</span></span></div>`;
      await nota(c2.notas, `Pegadinha: ${nBR(a)} × ${nBR(b)} é a área (o de dentro), não o contorno!`, 'passo');
      await wait(700);
      await certoEmbaixo(c2, `<span>${virgulas(`${vals.map(nBR).join(' + ')} = ${nU(P, u)}`)}</span>`);
    }
    await respostaFinal(`<span>${virgulas(s.cerca ? `${nU(P, 'm')} de cerca` : `perímetro = ${nU(P, u)}`)}</span>`, { perg });
    const padrao = s.cerca ? '"Cercar" e "contornar": é perímetro.' : forma === 'triangulo' ? 'Triângulo: soma os 3 lados.' : forma === 'retangulo' ? 'Retângulo: cada tamanho de lado aparece 2 vezes no contorno.'
      : dec ? 'Lado com vírgula: soma do mesmo jeito (ou 4 × o lado).' : 'Perímetro: o tamanho da linha do contorno (soma todos os lados).';
    for (const r of s.regras || [padrao]) await regra(r);
  }

  // 11-A p.5) lados iguais: conta os lados enquanto a linha passa → n × lado
  async function cenaIguais(s) {
    const n = Number(s.n), l = Number(s.l), u = s.unid || 'cm', nome = s.nome || 'polígono';
    const perg = s.perg || `Qual é o perímetro de um ${nome} com ${n} lados iguais de ${nU(l, u)}?`;
    const F = figura();
    await poePergunta(perg, false);
    const H = F.poli(F.regular(n, .3, .5, .46), Array(n).fill(nU(l, u)));
    const c = cartao(), rr = contaQ(c, virgulas(`${n} × ${nBR(l)}`));
    await ler(perg);
    const p = await nota(c.notas, `Conta os lados enquanto a linha passa: ${n} lados de ${nU(l, u)}.`, 'passo');
    await percorre(F, H, H.P.map((_, i) => i), async (k, i) => { const [a, b] = H.P[i], [x, y] = H.P[(i + 1) % n]; F.txt((a + x) / 2 + ((a + x) / 2 - F.S / 2) * -.25, (b + y) / 2 + ((b + y) / 2 - F.S * .46) * -.25, String(k + 1), 'fg-n fg-fila'); }, 450);
    verde(rr, nU(n * l, u)); await wait(700); await apagar(p);
    await respostaFinal(`<span>${virgulas(`perímetro = ${nU(n * l, u)}`)}</span>`, { perg });
    for (const r of s.regras || ['Lados iguais? Quantos lados × o tamanho do lado.']) await regra(r);
  }

  // 11-A p.7) dar a volta numa quadra quadrada: o contorno todo → 4 × lado
  async function cenaVolta(s) {
    const l = Number(s.l), u = s.unid || 'm', perg = s.perg || `Dei uma volta numa quadra quadrada de lado ${nU(l, u)}. Quanto andei?`;
    const F = figura();
    await poePergunta(perg, false);
    const Q = F.poli(QUAD, Array(4).fill(nU(l, u)));
    const c = cartao(), rr = contaQ(c, `4 × ${nBR(l)}`);
    await ler(perg);
    const p = await nota(c.notas, '"Dar uma volta" é andar o contorno todo.', 'passo');
    await percorre(F, Q, [0, 1, 2, 3], null, 650);
    verde(rr, nU(4 * l, u)); await wait(600); await apagar(p);
    await respostaFinal(`<span>andei ${nU(4 * l, u)}</span>`, { perg });
    for (const r of s.regras || ['"Dar uma volta": é perímetro.']) await regra(r);
  }

  // 11-A p.8) o lado do quadrado pelo perímetro: perímetro ÷ 4
  async function cenaLadoQ(s) {
    const P = Number(s.p), l = P / 4, u = s.unid || 'cm', perg = s.perg || `Um quadrado tem perímetro ${nU(P, u)}. Quanto mede cada lado?`;
    const F = figura();
    await poePergunta(perg, false);
    const Q = F.poli(QUAD, ['?', '?', '?', '?']);
    const c = cartao(), rr = contaQ(c, `${nBR(P)} ÷ 4`);
    await ler(perg);
    const p = await nota(c.notas, `O contorno tem 4 lados iguais: reparte o ${nBR(P)} em 4.`, 'passo');
    await wait(900); verde(rr, nU(l, u));
    await percorre(F, Q, [0, 1, 2, 3], async (k, i) => { Q.poe(i, nU(l, u)); }, 450);
    await wait(500); await apagar(p);
    await nota(c.notas, `confere: ${Array(4).fill(nBR(l)).join(' + ')} = ${nBR(P)} ✔`, 'detalhe');
    await respostaFinal(`<span>${virgulas(`cada lado = ${nU(l, u)}`)}</span>`, { perg });
    for (const r of s.regras || ['Quadrado: perímetro ÷ 4 = o lado.']) await regra(r);
  }

  // 11-A p.9) o outro lado do retângulo: tira os 2 lados que já sabe; o que sobra ÷ 2
  async function cenaLadoR(s) {
    const P = Number(s.p), a = Number(s.a), sobra = P - 2 * a, b = sobra / 2, u = s.unid || 'cm';
    const perg = s.perg || `Um retângulo tem perímetro ${nU(P, u)} e um lado mede ${nU(a, u)}. Quanto mede o outro?`;
    const F = figura();
    await poePergunta(perg, false);
    const R = F.poli(retPts(a, b, .55), [nU(a, u), '?', nU(a, u), '?']);
    const c1 = cartao(); let rr = contaQ(c1, `${nBR(P)} − ${nBR(a)} − ${nBR(a)}`);
    await ler(perg);
    let p = await nota(c1.notas, `Tira os 2 lados de ${nU(a, u)} que já sabe.`, 'passo');
    await R.acende(0, 400); await R.acende(2, 400);
    verde(rr, nBR(sobra)); await wait(600); await apagar(p);
    await nota(c1.notas, 'sobram os 2 lados iguais', 'detalhe');
    await paraHist(c1);
    const c2 = cartao(); rr = contaQ(c2, `${nBR(sobra)} ÷ 2`);
    p = await nota(c2.notas, `Os ${nU(sobra, u)} são 2 lados iguais: divide por 2.`, 'passo');
    await wait(800); verde(rr, nU(b, u));
    R.poe(1, nU(b, u)); R.poe(3, nU(b, u));
    await wait(600); await apagar(p);
    await respostaFinal(`<span>${virgulas(`o outro lado = ${nU(b, u)}`)}</span>`, { perg });
    for (const r of s.regras || ['Tira os lados que já sabe; o que sobra divide por 2.']) await regra(r);
  }

  // 11-A p.10) medidas: régua (1 cm = 10 mm), metro (10 pedaços de 10 cm), km
  async function cenaMedidas(s) {
    const F = figura();
    let perg = 'Quantos milímetros tem 1 centímetro?';
    await poePergunta(perg, false);
    const B1 = F.barra(10, { y: .3, esq: '0', dir: '1 cm', leg: 'régua (bem de perto)' });
    const c1 = cartao(); let rr = contaQ(c1, '1 cm');
    await ler(perg);
    let p = await nota(c1.notas, 'Conta os risquinhos da régua dentro de 1 cm.', 'passo');
    await B1.conta(260);
    verde(rr, '10 mm'); await wait(600); await apagar(p);
    await paraHist(c1);
    perg = 'E 1 metro tem quantos centímetros?';
    await poePergunta(perg, false);
    const B2 = F.barra(10, { y: .72, esq: '0', dir: '1 m', leg: '10 pedaços de 10 cm' });
    const c2 = cartao(); rr = contaQ(c2, '1 m');
    await ler(perg);
    p = await nota(c2.notas, '10 pedaços de 10 cm: 10 × 10.', 'passo');
    await B2.conta(220);
    verde(rr, '100 cm'); await wait(600); await apagar(p);
    await paraHist(c2);
    perg = 'E 1 quilômetro tem quantos metros?';
    await poePergunta(perg, false);
    const c3 = cartao(); rr = contaQ(c3, '1 km');
    await ler(perg);
    p = await nota(c3.notas, '"Quilo" quer dizer mil.', 'passo');
    await wait(600); verde(rr, '1000 m'); await wait(600); await apagar(p);
    await respostaFinal('<span class="l2">1 cm = 10 mm</span><span class="l2">1 m = 100 cm</span><span class="l2">1 km = 1000 m</span>', { perg: 'Quanto vale cada medida?' });
    for (const r of s.regras || ['1 cm = 10 mm · 1 m = 100 cm · 1 km = 1000 m']) await regra(r);
  }

  // 11-A p.11) trocar a unidade: para a maior divide, para a menor multiplica. casos: [{ v, de, para }]
  const TROCA = { cm: { m: ['÷', 100], mm: ['×', 10] }, m: { cm: ['×', 100], km: ['÷', 1000] }, km: { m: ['×', 1000] }, mm: { cm: ['÷', 10] } };
  const UN_NOME = { mm: ['milímetro', 'milímetros'], cm: ['centímetro', 'centímetros'], m: ['metro', 'metros'], km: ['quilômetro', 'quilômetros'] };
  async function cenaTrocar(s) {
    const casos = (s.casos || []).filter(k => TROCA[k.de]?.[k.para]);
    if (!casos.length) return;
    const F = figura();
    const pergDe = (k, i) => `${i ? 'E ' : ''}${nBR(k.v)} ${k.de} são quantos ${UN_NOME[k.para][1]}?`;
    let c = null;
    const resp = [];
    for (const [i, k] of casos.entries()) {
      const [op, f] = TROCA[k.de][k.para], v = Number(k.v), r = op === '÷' ? v / f : v * f;
      const perg = (i === 0 && casos.length === 1 && s.perg) || pergDe(k, i);
      if (i) await paraHist(c);
      await poePergunta(perg, false);
      let B = null;
      if (i === 0 && op === '÷' && Number.isInteger(r) && r > 1 && r <= 10) B = F.barra(r, { y: .45, esq: '0', dir: `${nBR(v)} ${k.de}`, leg: `cada pedaço = ${f} ${k.de} = 1 ${k.para}` });
      if (i === 0 && op === '×' && Number.isInteger(v) && v > 1 && v <= 10) B = F.barra(v, { y: .45, esq: '0', dir: `${nBR(v)} ${k.de}`, leg: `cada pedaço = 1 ${k.de} = ${f} ${k.para}` });
      c = cartao(); const rr = contaQ(c, `${nBR(v)} ${op} ${f}`);
      await ler(perg);
      const p = await nota(c.notas, op === '÷' ? `De ${k.de} para ${k.para}: quantos ${f} cabem? Divide por ${f}.` : `De ${k.de} para ${k.para}: cada ${UN_NOME[k.de][0]} tem ${f} ${k.para}. Multiplica por ${f}.`, 'passo');
      if (B) await B.conta(500); else await wait(900);
      verde(rr, nU(r, k.para)); await wait(600); await apagar(p);
      resp.push(`${nU(v, k.de)} = ${nU(r, k.para)}`);
    }
    await respostaFinal(resp.length > 1 ? resp.map(t => `<span class="l2">${virgulas(t)}</span>`).join('') : `<span>${virgulas(resp[0])}</span>`,
      { perg: casos.length > 1 ? casos.map(k => `${nBR(k.v)} ${k.de} em ${UN_NOME[k.para][1]}?`).join(' ') : (s.perg || pergDe(casos[0], 0)) });
    for (const r of s.regras || ['Para a unidade maior, divide. Para a menor, multiplica.']) await regra(r);
  }

  // 11-A p.12) tipos de ângulo (vitrine): o ângulo abre e para em cada tipo; g: o ângulo da questão (entra no lugar do do mesmo tipo)
  async function cenaTiposAng(s) {
    await etiqueta('ÂNGULOS', 'a abertura entre duas linhas');
    const perg = s.perg || 'Como se chama cada ângulo?';
    await poePergunta(perg, false);
    const V = vitrine(5, { vb: '-6 22 112 84', cls: 'vit-ang' });
    const ox = 50, oy = 80, r = 50, ra = 20;
    const desenha = (g) => {
      V.limpa();
      if (g >= 360) V.mk('circle', { cx: ox, cy: oy, r: ra, class: 'gl-ang' }); else if (g > 0) V.mk('path', { d: setor(ox, oy, ra, 0, g), class: 'gl-ang' });
      V.mk('line', { x1: ox, y1: oy, x2: ox + r, y2: oy, class: 'gl-raio' });
      const a = g * Math.PI / 180;
      V.mk('line', { x1: ox, y1: oy, x2: ox + r * Math.cos(a), y2: oy - r * Math.sin(a), class: 'gl-raio' });
      if (g === 90) V.reto([ox, oy], [ox + 10, oy], [ox, oy - 10], 12);
      V.num(ox + 34, oy - 30, `${g}°`);
    };
    const tipos = [[45, 'agudo', 'menor que 90°'], [90, 'reto', '90°: o canto do quadrado'], [135, 'obtuso', 'entre 90° e 180°'], [180, 'raso', '180°: uma linha reta'], [360, 'volta inteira', '360°']];
    const g0 = Number(s.g);
    if (g0 > 0 && g0 < 90) tipos[0][0] = g0; else if (g0 > 90 && g0 < 180) tipos[2][0] = g0;
    desenha(0);
    await ler(perg);
    let g = 0;
    for (const [i, [alvo, nome, info]] of tipos.entries()) {
      for (; g < alvo; g = Math.min(alvo, g + 3)) { desenha(g); await wait(25); }
      desenha(alvo);
      await wait(500);
      await V.voa(i, nome, info);
    }
    for (const r of s.regras || ['Ângulo: a abertura, em graus (°). Agudo < 90° · reto = 90° · obtuso > 90° · raso = 180° · volta = 360°.']) await regra(r);
  }

  // 11-A p.13) polígonos (vitrine): desenha o grande contando os lados; a cópia vai para a fileira
  async function cenaPoligonos(s) {
    await etiqueta('POLÍGONOS', 'figuras fechadas de lados retos');
    const perg = s.perg || 'Quantos lados tem cada polígono?';
    await poePergunta(perg, false);
    const lista = [['triângulo', 3], ['quadrilátero', 4], ['pentágono', 5], ['hexágono', 6], ['heptágono', 7], ['octógono', 8], ['decágono', 10]];
    const V = vitrine(lista.length);
    await ler(perg);
    for (const [i, [nome, n]] of lista.entries()) {
      V.limpa();
      const pts = n === 4 ? [[10, 16], [92, 8], [86, 90], [16, 82]] : regular100(n, 42, 50, 52);
      const lados = V.poli(pts);
      for (let k = 0; k < n; k++) {
        lados[k].classList.add('on');
        const [a, b] = pts[k], [x, y] = pts[(k + 1) % n], mx = (a + x) / 2, my = (b + y) / 2;
        V.num(mx + (mx - 50) * .32, my + (my - 52) * .32, String(k + 1));
        await wait(260);
      }
      await wait(300);
      await V.voa(i, nome, `${n} lados`);
    }
    for (const r of s.regras || ['O nome diz os lados: tri 3, quadri 4, penta 5, hexa 6, hepta 7, octo 8, deca 10.']) await regra(r);
  }

  // 11-A p.14) quadriláteros (vitrine; o ângulo reto já foi explicado)
  async function cenaQuadrilateros(s) {
    await etiqueta('QUADRILÁTEROS', 'polígonos de 4 lados');
    const perg = s.perg || 'Quais são os quadriláteros?';
    await poePergunta(perg, false);
    const fig = [
      ['quadrado', [[10, 10], [90, 10], [90, 90], [10, 90]], '4 lados iguais e 4 ângulos retos', true],
      ['retângulo', [[0, 24], [100, 24], [100, 76], [0, 76]], 'lados opostos iguais e 4 ângulos retos', true],
      ['losango', [[50, 2], [90, 50], [50, 98], [10, 50]], '4 lados iguais, sem ângulo reto', false],
      ['paralelogramo', [[24, 24], [100, 24], [76, 76], [0, 76]], 'lados opostos iguais e paralelos', false],
      ['trapézio', [[28, 24], [72, 24], [100, 76], [0, 76]], 'só 2 lados paralelos', false],
    ];
    const V = vitrine(fig.length);
    await ler(perg);
    for (const [i, [nome, pts, info, reto]] of fig.entries()) {
      V.limpa();
      const lados = V.poli(pts);
      for (const l of lados) { l.classList.add('on'); await wait(200); }
      if (reto) pts.forEach((p, k) => V.reto(p, pts[(k + 1) % 4], pts[(k + 3) % 4]));
      await wait(500);
      await V.voa(i, nome, info);
    }
    for (const r of s.regras || ['Quadrilátero: 4 lados. Quadrado e retângulo têm os 4 ângulos retos (90°).']) await regra(r);
  }

  // 11-A p.15) por que os ângulos do triângulo somam 180°: os 3 cantos recortados formam uma linha reta
  async function cenaAngTri(s) {
    const F = figura();
    await etiqueta('TRIÂNGULO', 'os ângulos de dentro somam 180°');
    const perg = 'Quanto somam os 3 ângulos de dentro de um triângulo?';
    await poePergunta(perg, false);
    const S = F.S, A = [.1 * S, .56 * S], B = [.9 * S, .56 * S];
    const AB = .8 * S, AC = AB * Math.sin(60 * Math.PI / 180) / Math.sin(70 * Math.PI / 180);
    const C = [A[0] + AC * Math.cos(50 * Math.PI / 180), A[1] - AC * Math.sin(50 * Math.PI / 180)];
    F.poli([A, B, C].map(([x, y]) => [x / S, y / S]), []);
    const r = .1 * S;
    const fatias = [[A, 0, 50, 'a1'], [B, 120, 180, 'a3'], [C, 230, 300, 'a2']];
    fatias.forEach(([p, a1, a2, cls]) => F.mk('path', { d: setor(p[0], p[1], r, a1, a2), class: 'fg-ang ' + cls }));
    const c1 = cartao(), rr = contaQ(c1, '3 ângulos');
    await ler(perg);
    let p = await nota(c1.notas, 'Recorta os 3 cantos coloridos e junta um do lado do outro…', 'passo');
    const O = [.5 * S, .88 * S];
    F.mk('line', { x1: .12 * S, y1: O[1], x2: .88 * S, y2: O[1], class: 'fg-base' });
    for (const [i, [a1, a2, cls, gira]] of [[0, 50, 'a1', 0], [120, 180, 'a3', 0], [50, 120, 'a2', 180]].entries()) {
      const de = fatias[i][0];
      const e = F.mk('path', { d: setor(O[0], O[1], r * 1.6, a1, a2), class: 'fg-ang fg-move ' + cls });
      e.style.transformOrigin = `${O[0]}px ${O[1]}px`;
      e.style.transition = 'none';
      e.style.transform = `translate(${de[0] - O[0]}px, ${de[1] - O[1]}px) rotate(${gira}deg) scale(.62)`;
      e.getBoundingClientRect();
      e.style.transition = ''; e.style.transform = 'none';
      await wait(1400);
    }
    await apagar(p);
    p = await nota(c1.notas, '…eles formam meia volta: uma linha reta, o ângulo raso, 180°.', 'passo');
    F.txt(O[0], O[1] + F.fs * 1.3, '180°', 'fg-rot ok');
    await wait(800); verde(rr, '180°'); await wait(700); await apagar(p);
    await nota(c1.notas, 'vale para qualquer triângulo', 'detalhe');
    await respostaFinal('<span>os 3 ângulos somam 180°</span>', { perg });
    for (const r2 of s.regras || ['Os 3 ângulos de dentro de um triângulo somam 180°.']) await regra(r2);
  }

  // expressão em linhas: "180 − 50 − 60" / "= 130 − 60" / "= ?" (devolve o "?")
  async function exprFalta(c, total, angs) {
    const ex = el('div', 'qd-xpr', '', c.conta), soma = angs.reduce((a, b) => a + b, 0);
    el('div', 'xl qd-pop', `<span>${total} − ${angs.join(' − ')}</span>`, ex); await wait(900);
    el('div', 'xl qd-pop', `<span>= ${angs.length === 2 ? `${total - angs[0]} − ${angs[1]}` : `${total} − ${soma}`}</span>`, ex); await wait(900);
    const ln = el('div', 'xl qd-pop', '<span>=</span><span class="vazio-q qd-rr">?</span>', ex); await wait(500);
    return ln.querySelector('.qd-rr');
  }
  // 11-A p.16) o ângulo que falta no triângulo: 180 − os que já sabe (o triângulo desenhado com os ângulos da questão)
  async function cenaFaltaTri(s) {
    const a = Number(s.a), b = Number(s.b), v = 180 - a - b, perg = s.perg || `Um triângulo tem ângulos de ${a}° e ${b}°. Quanto mede o terceiro?`;
    const F = figura();
    await poePergunta(perg, false);
    const r = Math.PI / 180, tA = Math.tan(a * r), tB = Math.tan(b * r), x = tB / (tA + tB), y = x * tA;
    const xs = [0, 1, x], k = Math.min(.8 / (Math.max(...xs) - Math.min(...xs)), .52 / y), x0 = .5 - (Math.max(...xs) + Math.min(...xs)) / 2 * k;
    const T3 = F.poli([[x0, .72], [x0 + k, .72], [x0 + x * k, .72 - y * k]], [], { ang: [`${a}°`, `${b}°`, '?'] });
    const c = cartao();
    await ler(perg);
    const p = await nota(c.notas, 'Os 3 somam 180°: tira do 180 o que já sabe.', 'passo');
    const rr = await exprFalta(c, 180, [a, b]);
    verde(rr, `${v}°`); T3.angs[2].textContent = `${v}°`; T3.angs[2].classList.add('ok');
    await wait(600); await apagar(p);
    await nota(c.notas, `confere: ${a} + ${b} + ${v} = 180 ✔`, 'detalhe');
    await respostaFinal(`<span>o terceiro ângulo = ${v}°</span>`, { perg });
    for (const r2 of s.regras || ['Ângulo que falta no triângulo: 180 − os que já sabe.']) await regra(r2);
  }

  // 11-A p.17) por que os ângulos do quadrilátero somam 360°: retângulo 4 × 90; qualquer um: diagonal → 2 × 180
  async function cenaAngQuad(s) {
    const F = figura();
    await etiqueta('QUADRILÁTERO', 'os ângulos de dentro somam 360°');
    let perg = 'Quanto somam os 4 ângulos de um retângulo?';
    await poePergunta(perg, false);
    const R = F.poli(retPts(6, 4, .6), []);
    R.P.forEach((p, k) => cantoReto(F, p, R.P[(k + 1) % 4], R.P[(k + 3) % 4]));
    R.P.forEach((p) => F.txt(p[0] + (F.S / 2 - p[0]) * .3, p[1] + (F.S * .45 - p[1]) * .3, '90°', 'fg-rot'));
    const c1 = cartao(); let rr = contaQ(c1, '90 + 90 + 90 + 90');
    await ler(perg);
    let p = await nota(c1.notas, '4 ângulos retos de 90°.', 'passo');
    await wait(900); verde(rr, '360°'); await wait(600); await apagar(p);
    await nota(c1.notas, 'retângulo', 'detalhe');
    await paraHist(c1);
    F.limpa();
    perg = 'E num quadrilátero qualquer?';
    await poePergunta(perg, false);
    const Qp = [[.18, .3], [.74, .18], [.86, .66], [.3, .7]];
    F.poli(Qp, []);
    const c2 = cartao(); rr = contaQ(c2, '2 × 180');
    await ler(perg);
    p = await nota(c2.notas, 'Uma diagonal divide em 2 triângulos. Cada triângulo tem 180°.', 'passo');
    F.mk('line', { x1: Qp[0][0] * F.S, y1: Qp[0][1] * F.S, x2: Qp[2][0] * F.S, y2: Qp[2][1] * F.S, class: 'fg-diag' });
    await wait(1100); verde(rr, '360°'); await wait(600); await apagar(p);
    await respostaFinal('<span>os 4 ângulos somam 360°</span>', { perg: 'Quanto somam os 4 ângulos de um quadrilátero?' });
    for (const r of s.regras || ['Os 4 ângulos de dentro de um quadrilátero somam 360° (2 triângulos).']) await regra(r);
  }

  // 11-A p.18) o ângulo que falta no quadrilátero: 360 − os que já sabe
  async function cenaFaltaQuad(s) {
    const angs = (s.angs || [90, 90, 100]).map(Number), v = 360 - angs.reduce((a, b) => a + b, 0);
    const perg = s.perg || `Um quadrilátero tem ângulos de ${angs.slice(0, -1).map(x => `${x}°`).join(', ')} e ${angs[2]}°. Quanto mede o quarto?`;
    const F = figura();
    await poePergunta(perg, false);
    const Q4 = F.poli([[.2, .2], [.8, .2], [.8, .7], [.32, .7]], [], { ang: ['?', ...angs.map(x => `${x}°`)] });
    const c = cartao();
    await ler(perg);
    const p = await nota(c.notas, 'Os 4 somam 360°: tira do 360 o que já sabe.', 'passo');
    const rr = await exprFalta(c, 360, angs);
    verde(rr, `${v}°`); Q4.angs[0].textContent = `${v}°`; Q4.angs[0].classList.add('ok');
    await wait(600); await apagar(p);
    await respostaFinal(`<span>o quarto ângulo = ${v}°</span>`, { perg });
    for (const r of s.regras || ['Ângulo que falta no quadrilátero: 360 − os que já sabe.']) await regra(r);
  }

  // ── 11-B: área ──
  // p.1) área: conta os quadradinhos
  async function cenaArea(s) {
    const c0 = Number(s.c) || 3, l0 = Number(s.l) || 2, n = c0 * l0, perg = s.perg || 'Qual é a área desta figura?';
    const F = figura();
    await etiqueta('ÁREA', 'o espaço de dentro');
    await poePergunta(perg, false);
    const G = F.grade(c0, l0, { unid: null, tam: .6 });
    F.txt(F.S / 2, F.S * .86, 'cada quadradinho = 1 cm²', 'fg-leg');
    const c = cartao(), rr = contaQ(c, 'quadradinhos');
    await ler(perg);
    const p = await nota(c.notas, 'Conta os quadradinhos de dentro.', 'passo');
    await G.conta(msConta(n, 380));
    verde(rr, String(n)); await wait(600); await apagar(p);
    await nota(c.notas, `${n} quadradinhos de 1 cm²`, 'detalhe');
    await respostaFinal(`<span>área = ${n} cm²</span>`, { perg });
    for (const r of s.regras || ['Área: quantos quadradinhos cabem dentro (em cm²).']) await regra(r);
  }
  // p.2, 4, 9) retângulo / quadrado / sala: primeiro conta de 1 até…, depois fileiras × quantos em cada (conta: false = só as fileiras)
  async function cenaAreaR(s) {
    const c0 = Number(s.c), l0 = Number(s.l), n = c0 * l0, u = s.unid || 'cm', quad = s.quadrado, sala = s.sala;
    const perg = s.perg || (sala ? `Uma sala tem ${c0} m por ${l0} m. Qual é a área?` : quad ? `Qual é a área de um quadrado de lado ${c0} cm?` : `Qual é a área de um retângulo de ${c0} cm por ${l0} cm?`);
    const F = figura();
    await poePergunta(perg, false);
    const G = F.grade(c0, l0, { unid: u });
    let c = null;
    await ler(perg);
    if (!sala) {
      c = cartao(); const rr = contaQ(c, 'quadradinhos');
      const p = await nota(c.notas, quad ? 'Conta os quadradinhos.' : 'Primeiro conta os quadradinhos: de 1 até…', 'passo');
      await G.conta(msConta(n, quad ? 120 : 330));
      verde(rr, String(n)); await wait(500); await apagar(p);
      await paraHist(c);
    }
    c = cartao(); const rr = contaQ(c, `${l0} × ${c0}`);
    const p = await nota(c.notas, sala ? `Cada quadradinho tem 1 m de lado: 1 m². Fileiras × quantos em cada.` : quad ? `Jeito rápido: ${l0} fileiras com ${c0} em cada (lado × lado).` : `Jeito rápido: ${l0} fileiras com ${c0} em cada.`, 'passo');
    await G.fileiras(Math.min(sala ? 450 : 650, 3500 / l0));
    verde(rr, `${n} ${u}²`); await wait(600); await apagar(p);
    if (!sala && !quad) await nota(c.notas, `deu o mesmo: ${n}`, 'detalhe');
    await respostaFinal(`<span>área = ${n} ${u}²</span>`, { perg });
    for (const r of s.regras || [sala ? 'Metro × metro = metro quadrado (m²).' : quad ? 'Quadrado: lado × lado.' : 'Retângulo: comprimento × largura (fileiras × quantos em cada).']) await regra(r);
  }
  // p.3) lajotas: conta de 1 até…, depois fileiras × quantas em cada
  async function cenaLajotas(s) {
    const c0 = Number(s.c), l0 = Number(s.l), n = c0 * l0, perg = s.perg || `Um piso tem ${l0} fileiras com ${c0} lajotas cada. Quantas lajotas ao todo?`;
    const F = figura();
    await poePergunta(perg, false);
    const G = F.grade(c0, l0, { unid: '' });
    const c = cartao(), rr = contaQ(c, `${l0} × ${c0}`);
    await ler(perg);
    let p = await nota(c.notas, 'Cada lajota é um quadradinho. Conta: de 1 até…', 'passo');
    await G.conta(msConta(n, 300));
    await apagar(p);
    p = await nota(c.notas, `Jeito rápido: ${l0} fileiras × ${c0} em cada.`, 'passo');
    await G.fileiras(Math.min(600, 3500 / l0));
    verde(rr, String(n)); await wait(600); await apagar(p);
    await respostaFinal(`<span>${n} lajotas</span>`, { perg });
    for (const r of s.regras || ['Fileiras × quantas em cada = o total.']) await regra(r);
  }
  // p.5) área × perímetro: o contorno com a linha percorrendo (cm) e os quadradinhos de dentro (cm²); pegadinha
  async function cenaAreaPer(s) {
    const c0 = Number(s.c) || 4, l0 = Number(s.l) || 3, P = 2 * (c0 + l0), A = c0 * l0;
    const perg = s.perg || `Num retângulo de ${c0} cm por ${l0} cm, qual é o perímetro e qual é a área?`;
    const F = figura();
    await poePergunta(perg, false);
    const G = F.grade(c0, l0);
    const c1 = cartao(); let rr = contaQ(c1, `${c0} + ${l0} + ${c0} + ${l0}`);
    await ler(perg);
    let p = await nota(c1.notas, 'Perímetro: o contorno, em cm.', 'passo');
    await G.contorno(450);
    verde(rr, `${P} cm`); await wait(600); await apagar(p);
    await nota(c1.notas, 'perímetro', 'detalhe');
    await paraHist(c1);
    const c2 = cartao(); rr = contaQ(c2, `${c0} × ${l0}`);
    p = await nota(c2.notas, 'Área: os quadradinhos de dentro, em cm².', 'passo');
    await G.fileiras(450);
    verde(rr, `${A} cm²`); await wait(600); await apagar(p);
    await nota(c2.notas, 'área', 'detalhe');
    await paraHist(c2);
    const c3 = cartao(); c3.conta.innerHTML = `<div class="qd-fx qd-errado"><span>área = </span><span class="qd-x"><span>${P} cm</span></span></div>`;
    await nota(c3.notas, 'Pegadinha: o contorno não é a área!', 'passo');
    await wait(700);
    await certoEmbaixo(c3, `<span>área = ${A} cm²</span>`);
    await respostaFinal(`<span class="l2">perímetro = ${P} cm</span><span class="l2">área = ${A} cm²</span>`, { perg: s.perg || perg });
    for (const r of s.regras || ['Perímetro: o contorno, em cm. Área: o de dentro, em cm².']) await regra(r);
  }
  // p.6) comparar áreas: cada figura com a sua cor (laranja e lilás) na pergunta, na figura e na conta
  async function cenaComparaA(s) {
    const [ac, al] = s.a.map(Number), [bc, bl] = s.b.map(Number), sa = ac * al, sb = bc * bl;
    const nome = (c, l) => (c === l ? `quadrado de lado ${c} cm` : `retângulo de ${c} cm por ${l} cm`);
    const perg = s.perg || `Qual tem área maior?|{A:${nome(ac, al)}} ou|{B:${nome(bc, bl)}}`;
    const F = figura();
    await poePergunta(perg, false);
    const G1 = F.grade(ac, al, { x: .5, y: .3, maxW: .6, maxH: .4, cor: 'cA' });
    const G2 = F.grade(bc, bl, { x: .5, y: .78, maxW: .6, maxH: .3, cor: 'cB' });
    const cA = cartao(); cA.conta.innerHTML = `<div class="qd-fx"><span class="qd-cmpA">${ac} × ${al}</span><span class="igual">=</span><span class="vazio-q qd-rr">?</span></div>`;
    await ler(perg);
    const tA = ac === al ? 'quadrado' : 'retângulo', tB = bc === bl ? 'quadrado' : 'retângulo';
    let p = await nota(cA.notas, `Área do ${tA}.`, 'passo');
    await G1.fileiras(400);
    verde(cA.conta.querySelector('.qd-rr'), `${sa} cm²`); await wait(500); await apagar(p);
    await nota(cA.notas, tA, 'detalhe');
    await paraHist(cA);
    const cB = cartao(); cB.conta.innerHTML = `<div class="qd-fx"><span class="qd-cmpB">${bc} × ${bl}</span><span class="igual">=</span><span class="vazio-q qd-rr">?</span></div>`;
    p = await nota(cB.notas, `Área do ${tB}.`, 'passo');
    await G2.fileiras(400);
    verde(cB.conta.querySelector('.qd-rr'), `${sb} cm²`); await wait(500); await apagar(p);
    await nota(cB.notas, tB, 'detalhe');
    await paraHist(cB);
    const [mx, mn] = sa >= sb ? [sa, sb] : [sb, sa];
    const c3 = cartao(); c3.conta.innerHTML = `<div class="qd-fx"><span>${mx} cm²</span><span class="igual">&gt;</span><span>${mn} cm²</span></div>`;
    p = await nota(c3.notas, `Compara: ${mx} é maior que ${mn}.`, 'passo');
    await wait(900); await apagar(p);
    const venc = sa >= sb ? tA : tB;
    await nota(c3.notas, `o ${venc} tem área maior`, 'detalhe');
    await respostaFinal(`<span>o ${venc} (${mx} cm²)</span>`, { perg });
    for (const r of s.regras || ['Para comparar áreas, calcula as duas.']) await regra(r);
  }
  // p.7) triângulo: metade do retângulo base × altura
  async function cenaAreaT(s) {
    const b = Number(s.b), h = Number(s.h), v = b * h, perg = s.perg || `Qual é a área de um triângulo de base ${b} cm e altura ${h} cm?`;
    const F = figura();
    await poePergunta(perg, false);
    const G = F.grade(b, h);
    const c1 = cartao(); let rr = contaQ(c1, `${b} × ${h}`);
    await ler(perg);
    let p = await nota(c1.notas, 'Primeiro o retângulo todo: base × altura.', 'passo');
    await G.fileiras(Math.min(350, 3000 / h));
    verde(rr, String(v)); await wait(500); await apagar(p);
    await nota(c1.notas, 'o retângulo', 'detalhe');
    await paraHist(c1);
    G.apagaCel();
    const c2 = cartao(); rr = contaQ(c2, `${v} ÷ 2`);
    p = await nota(c2.notas, 'O triângulo é a metade do retângulo.', 'passo');
    G.metade();
    await wait(1000); verde(rr, `${nBR(v / 2)} cm²`); await wait(600); await apagar(p);
    await respostaFinal(`<span>${virgulas(`área = ${nBR(v / 2)} cm²`)}</span>`, { perg });
    for (const r of s.regras || ['Triângulo: base × altura ÷ 2.']) await regra(r);
  }
  // p.8) paralelogramo: o triângulo da ponta desliza para o outro lado e vira retângulo base × altura
  async function cenaAreaP(s) {
    const bb = Number(s.b), hh = Number(s.h), perg = s.perg || `Qual é a área de um paralelogramo de base ${bb} cm e altura ${hh} cm?`;
    const F = figura();
    await poePergunta(perg, false);
    const S = F.S, a = .1, b = .72, d = .16, yb = .66, yt = yb - Math.min(.45, Math.max(.15, (b - a) * hh / bb));
    const P = F.poli([[a + d, yt], [b + d, yt], [b, yb], [a, yb]], ['', '', `${bb} cm`, '']);
    F.mk('line', { x1: (a + d) * S, y1: yt * S, x2: (a + d) * S, y2: yb * S, class: 'fg-alt' });
    F.txt((a + d) * S + F.fs * .5, (yt + yb) / 2 * S, `${hh} cm`, 'fg-rot', F.svg, 'start');
    const c = cartao(), rr = contaQ(c, `${bb} × ${hh}`);
    await ler(perg);
    const p = await nota(c.notas, 'Corta o triângulo da ponta e cola do outro lado: vira um retângulo.', 'passo');
    const tri = F.mk('polygon', { points: `${a * S},${yb * S} ${(a + d) * S},${yb * S} ${(a + d) * S},${yt * S}`, class: 'fg-corte' });
    await wait(900);
    tri.style.transform = `translateX(${(b - a) * S}px)`;
    await wait(1400);
    P.lados[3].style.opacity = .15; P.lados[1].style.opacity = .15;
    F.mk('line', { x1: (a + d) * S, y1: yt * S, x2: (a + d) * S, y2: yb * S, class: 'fg-lado on' });
    F.mk('line', { x1: (b + d) * S, y1: yt * S, x2: (b + d) * S, y2: yb * S, class: 'fg-lado on' });
    F.mk('line', { x1: (a + d) * S, y1: yb * S, x2: (b + d) * S, y2: yb * S, class: 'fg-lado on' });
    await wait(600);
    verde(rr, `${bb * hh} cm²`); await wait(600); await apagar(p);
    await nota(c.notas, `retângulo de ${bb} por ${hh}`, 'detalhe');
    await respostaFinal(`<span>área = ${bb * hh} cm²</span>`, { perg });
    for (const r of s.regras || ['Paralelogramo: base × altura.']) await regra(r);
  }
  // p.10) metade com grama: a área toda; a metade ÷ 2
  async function cenaMetade(s) {
    const c0 = Number(s.c), l0 = Number(s.l), v = c0 * l0, perg = s.perg || `Um terreno de ${c0} m por ${l0} m tem grama na metade. Qual é a área com grama?`;
    const F = figura();
    await poePergunta(perg, false);
    const G = F.grade(c0, l0, { unid: 'm' });
    const c1 = cartao(); let rr = contaQ(c1, `${c0} × ${l0}`);
    await ler(perg);
    let p = await nota(c1.notas, 'Primeiro a área do terreno todo.', 'passo');
    await G.fileiras(Math.min(300, 3000 / l0));
    verde(rr, `${v} m²`); await wait(500); await apagar(p);
    await nota(c1.notas, 'o terreno todo', 'detalhe');
    await paraHist(c1);
    G.apagaCel();
    const c2 = cartao(); rr = contaQ(c2, `${v} ÷ 2`);
    p = await nota(c2.notas, 'A grama é a metade: divide por 2.', 'passo');
    G.metade();
    await wait(900); verde(rr, `${nBR(v / 2)} m²`); await wait(600); await apagar(p);
    await respostaFinal(`<span>${virgulas(`grama = ${nBR(v / 2)} m²`)}</span>`, { perg });
    for (const r of s.regras || ['Metade da área: divide por 2.']) await regra(r);
  }
  // p.11) o lado pela área: qual número vezes ele mesmo dá a área?
  async function cenaLadoA(s) {
    const l = Number(s.l), A = l * l, perg = s.perg || `Um quadrado tem área ${A} cm². Quanto mede o lado?`;
    const F = figura();
    await poePergunta(perg, false);
    const G = F.grade(l, l, { unid: null });
    const c = cartao(); const ex = el('div', 'qd-xpr', '', c.conta);
    await ler(perg);
    const p = await nota(c.notas, `Qual número vezes ele mesmo dá ${A}?`, 'passo');
    if (l > 1) { el('div', 'xl qd-pop', `<span>${l - 1} × ${l - 1} = ${(l - 1) ** 2}</span><span class="tag">✖ falta</span>`, ex); await wait(1000); }
    el('div', 'xl qd-pop', `<span>${l} × ${l} = ${A}</span><span class="tag">✔</span>`, ex); await wait(700);
    await G.fileiras(Math.min(250, 2500 / l));
    await apagar(p);
    await nota(c.notas, `lado = ${l} cm`, 'detalhe');
    await respostaFinal(`<span>lado = ${l} cm</span>`, { perg });
    for (const r of s.regras || ['Lado do quadrado: o número que vezes ele mesmo dá a área.']) await regra(r);
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
    quadrantes: cenaQuadrantes, andar: cenaAndar, caminho: cenaCaminho,
    perim: cenaPerim, iguais: cenaIguais, volta: cenaVolta, ladoq: cenaLadoQ, lador: cenaLadoR, medidas: cenaMedidas, trocar: cenaTrocar,
    tiposang: cenaTiposAng, poligonos: cenaPoligonos, quadrilateros: cenaQuadrilateros, angtri: cenaAngTri, faltatri: cenaFaltaTri,
    angquad: cenaAngQuad, faltaquad: cenaFaltaQuad,
    area: cenaArea, arear: cenaAreaR, lajotas: cenaLajotas, areaper: cenaAreaPer, comparaa: cenaComparaA, areat: cenaAreaT, areap: cenaAreaP,
    metade: cenaMetade, ladoa: cenaLadoA,
    r3: cenaR3, r3comp: cenaR3Comp, grandezas: cenaGrandezas,
    prop: cenaProp, setas: cenaSetas, diminui: cenaDiminui, treinodi: cenaTreinoDI,   // PROMPT-218
    eqbal: cenaEqBal, eqsoma: cenaEqSoma, eqsub: cenaEqSub, eqmult: cenaEqMult, eqdiv: cenaEqDiv, eq2: cenaEq2, eqneg: cenaEqNeg,   // PROMPT-219
    eqdois: cenaEqDois, eqparen: cenaEqParen, sinais: cenaSinais, frase: cenaFrase, baleq: cenaBalEq,
    algletra: cenaAlgLetra, algmaismenos: cenaAlgMaisMenos, algdobro: cenaAlgDobro, algmetade: cenaAlgMetade, algquad: cenaAlgQuad, algduas: cenaAlgDuas,   // PROMPT-220
    algcada: cenaAlgCada, algvalor: cenaAlgValor, algmenos: cenaAlgMenos, algxx: cenaAlgXX, algkx: cenaAlgKx, algkxc: cenaAlgKxc, algneg: cenaAlgNeg,
    algquad2: cenaAlgQuad2, alg2l: cenaAlg2L, termo: cenaTermo, semlista: cenaSemLista, semsoma: cenaSemSoma, semum: cenaSemUm, semsub: cenaSemSub,
    semtres: cenaSemTres, semdif: cenaSemDif, simpl: cenaSimpl, perimletra: cenaPerimL,
    raiz1: cenaRaiz1, raiz2: cenaRaiz2, quadtab: cenaQuadTab, exp1: cenaExp1, exp0: cenaExp0, negpar: cenaNegPar, negimpar: cenaNegImpar, raizpot: cenaRaizPot, multiplos: cenaMultiplos, ehmult: cenaEhMult, mult2: cenaMult2, mult510: cenaMult510, qualmult: cenaQualMult, multdois: cenaMultDois, primmult: cenaPrimMult, ehdiv: cenaEhDiv, divmult: cenaDivMult, todosdiv: cenaTodosDiv, divprimo: cenaDivPrimo, primo: cenaPrimo, naodiv: cenaNaoDiv, pctcem: cenaPctCem, pct50: cenaPct50, pctatalho: cenaPctAtalho, pctfrac: cenaPctFrac, desconto: cenaDesconto, precofinal: cenaPrecoFinal, qualpct: cenaQualPct, pctdec: cenaPctDec, qualconta: cenaQualConta, conta50: cenaConta50, contactx: cenaContaCtx, leconta: cenaLeConta, contafinal: cenaContaFinal, contadireta: cenaContaDireta,   // PROMPT-221
    casasvz: cenaCasasVz, casasdv: cenaCasasDv, zeromeio: cenaZeroMeio, duasvezes: cenaDuasVezes, juntando: cenaJuntando, decx10: cenaDecX10, decx100: cenaDecX100, decdv10: cenaDecDv10, decdv100: cenaDecDv100, medidas2: cenaMedidas2, convmaior: cenaConvMaior, convmenor: cenaConvMenor, dinheiro: cenaDinheiro, negos: cenaNegos, negmaior: cenaNegMaior, negsoma: cenaNegSoma, negsub: cenaNegSub, menosmenos: cenaMenosMenos, temperatura: cenaTemperatura, saldo: cenaSaldo, negtres: cenaNegTres, regrasinais: cenaRegraSinais, negvezes: cenaNegVezes, negsinal: cenaNegSinal, vezeszero: cenaVezesZero, tresnum: cenaTresNum, vezesmais: cenaVezesMais,   // PROMPT-222
    ordem1: cenaOrdem1 };   // PROMPT-223
  // PROMPT-215: as páginas do plano põem a pergunta elas mesmas (primeiro a pergunta, depois o plano, depois a pausa de leitura)
  const PERG_PROPRIA = new Set(['plano', 'ponto', 'valor', 'ordem', 'eixos', 'maislado', 'negativos', 'quadrantes', 'andar', 'caminho',
    'perim', 'iguais', 'volta', 'ladoq', 'lador', 'medidas', 'trocar', 'tiposang', 'poligonos', 'quadrilateros', 'angtri', 'faltatri', 'angquad', 'faltaquad',
    'area', 'arear', 'lajotas', 'areaper', 'comparaa', 'areat', 'areap', 'metade', 'ladoa',
    'r3', 'r3comp', 'grandezas', 'prop', 'setas', 'diminui', 'treinodi',
    'eqbal', 'eqsoma', 'eqsub', 'eqmult', 'eqdiv', 'eq2', 'eqneg', 'eqdois', 'eqparen', 'sinais', 'frase', 'baleq',
    'algletra', 'algmaismenos', 'algdobro', 'algmetade', 'algquad', 'algduas', 'algcada', 'algvalor', 'algmenos', 'algxx', 'algkx', 'algkxc', 'algneg',   // PROMPT-220: as do mapa 8
    'algquad2', 'alg2l', 'termo', 'semlista', 'semsoma', 'semum', 'semsub', 'semtres', 'semdif', 'simpl', 'perimletra',
    'raiz1', 'raiz2', 'quadtab', 'exp1', 'exp0', 'negpar', 'negimpar', 'raizpot', 'multiplos', 'ehmult', 'mult2', 'mult510', 'qualmult', 'multdois', 'primmult', 'ehdiv', 'divmult', 'todosdiv', 'divprimo', 'primo', 'naodiv', 'pctcem', 'pct50', 'pctatalho', 'pctfrac', 'desconto', 'precofinal', 'qualpct', 'pctdec', 'qualconta', 'conta50', 'contactx', 'leconta', 'contafinal', 'contadireta',   // PROMPT-221: as do 5-B, 6 e 7
    'casasvz', 'casasdv', 'zeromeio', 'duasvezes', 'juntando', 'decx10', 'decx100', 'decdv10', 'decdv100', 'medidas2', 'convmaior', 'convmenor', 'dinheiro', 'negos', 'negmaior', 'negsoma', 'negsub', 'menosmenos', 'temperatura', 'saldo', 'negtres', 'regrasinais', 'negvezes', 'negsinal', 'vezeszero', 'tresnum', 'vezesmais', 'ordem1']);   // PROMPT-223: a do mapa 1   // PROMPT-222: as do 2 e 3   // PROMPT-219: as do mapa 9   // PROMPT-218: direta ou inversa   // PROMPT-217: as do mapa 10   // PROMPT-216: as do mapa 11 também

  function limpar() {
    token++;
    pausado = false;
    pergPend = '';
    L.querySelectorAll('.qd-voa').forEach(e => e.remove());
    HIST.innerHTML = ''; FOCO.innerHTML = ''; LADO.innerHTML = ''; LADO.style.opacity = ''; REGRAS.innerHTML = '';
    RESP.classList.remove('on'); RESP.innerHTML = '';
    PERG.innerHTML = ''; PERG.dataset.txt = ''; PERG.style.top = ''; PERG.style.opacity = '';
    [FOCO, LADO].forEach(e => { e.style.top = ''; });
    L.classList.remove('com-lado', 'lado-largo', 'lado-xl', 'com-etq', 'sem-hist', 'plano-alto', 'sem-lado', 'vit-ang', 'r3p');
    L.querySelectorAll('.qd-palco').forEach(e => e.remove());
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

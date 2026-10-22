// Jogo de Revisão — plano cartesiano animado (PROMPT-128, Arquipélago das Coordenadas, mapa 12). Sem Firebase.
// Usado no Relembre animado (entrada dos ginásios), no plano pequeno das perguntas, no cartão do erro e no Quadro de Estudos.
//
//   const p = criarPlano(svg)          um plano por <svg>; cada um tem a própria animação (cancelar / pausar)
//   p.desenhar({ x0, x1, y0, y1, quadrantes, texto })   grade, eixos com setas, números (x laranja, y azul) e "0" na origem;
//     texto: escala dos números, rótulos e marcas (1 = o protótipo; os planos pequenos usam mais, para ler no celular)
//   await p.montarPonto([x, y], fala)  sai da origem, anda o x contando, depois o y, e finca a bandeira com as guias
//   await p.andarDe([x, y], mov, fala) a cada casa o par muda (mov = [[dx, dy, casas], …])
//   await p.mostrarCaminho([x, y], mov) só o caminho (retorno das perguntas): trilho, contagem, bandeira e festa
//   fala = { diz(html), par(x, y, muda) }: o texto e o par grande do lado (opcionais)
//   faixaPara(pontos): a faixa que mostra o 0 e todos os pontos, com 1 casa de folga e no mínimo de −1 a 5
// As animações lançam CANCELADA quando outra começa (ou p.cancelar()); com prefers-reduced-motion, o passo é rápido.
// O pet é o pet ativo do aluno (definirPetPlano); sem pet, um marcador redondo dourado.

const NS = 'http://www.w3.org/2000/svg';
const U = 50, M0 = 34;   // tamanho da casa e margem, em unidades do viewBox (a margem cresce com o texto)
const calmo = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fmt = (n) => (n < 0 ? '−' + -n : String(n));
export const par = (x, y) => `(${fmt(x)}, ${fmt(y)})`;
export const CANCELADA = Symbol('plano cancelado');
const COR = { x: 'var(--jr-laranja, #ff7b2e)', y: 'var(--jr-cyan, #00d4ff)', ouro: 'var(--jr-ouro, #ffd700)', verm: '#ff4d5e', verde: 'var(--jr-verde, #00e676)' };
export const CORES_PLANO = COR;

// "(−3, 2)" ou "(3,2)" → [-3, 2]; senão null
export function lerPar(t) {
  const m = /^\s*\(\s*([−-]?\d+)\s*[,;]\s*([−-]?\d+)\s*\)\s*$/.exec(String(t ?? ''));
  return m ? [Number(m[1].replace('−', '-')), Number(m[2].replace('−', '-'))] : null;
}

export function faixaPara(pontos = []) {
  const xs = [0, ...pontos.map(p => p[0])], ys = [0, ...pontos.map(p => p[1])];
  return { x0: Math.min(-1, Math.min(...xs) - 1), x1: Math.max(5, Math.max(...xs) + 1), y0: Math.min(-1, Math.min(...ys) - 1), y1: Math.max(5, Math.max(...ys) + 1) };
}
// todas as casas por onde passa um caminho
export function pontosDoCaminho([x, y], mov = []) {
  const pts = [[x, y]];
  for (const [dx, dy, n] of mov) for (let i = 0; i < n; i++) { x += dx; y += dy; pts.push([x, y]); }
  return pts;
}
// de um ponto ao outro: primeiro o x (lado), depois o y
export const movEntre = ([x0, y0], [x1, y1]) => [x1 !== x0 ? [Math.sign(x1 - x0), 0, Math.abs(x1 - x0)] : null, y1 !== y0 ? [0, Math.sign(y1 - y0), Math.abs(y1 - y0)] : null].filter(Boolean);
// texto do movimento: "ando 2 para a direita e 1 para cima"
export const textoMov = (mov) => mov.map(([dx, dy, n]) => `ando <b>${n}</b> para ${dx > 0 ? 'a direita' : dx < 0 ? 'a esquerda' : dy > 0 ? 'cima' : 'baixo'}`).join(' e ');

// ── o pet: o jogo diz qual é (quadros por pose, tamanho do quadro, escala e a tinta) ──
let petDoAluno = () => null;
export function definirPetPlano(fn) { petDoAluno = typeof fn === 'function' ? fn : () => null; }
// pose que falta: esquerda = direita espelhada; costas (cima) e frente (baixo) = frente
function quadrosPose(pet, pose) {
  const q = pet.quadros(pose);
  if (q?.length) return { q, espelho: false };
  if (pose === 'andar_esquerda') { const d = pet.quadros('andar_direita'); if (d?.length) return { q: d, espelho: true }; }
  const f = pet.quadros('andar_frente') || pet.quadros('andar_direita') || pet.quadros('sentado_girando') || [];
  return { q: f, espelho: false };
}

export function criarPlano(svg) {
  const P = { svg, x0: -4, x1: 7, y0: -3, y1: 6, g: null, pet: null, token: 0, pausado: false };
  let M = M0, k = 1;   // margem e escala do texto (desenhar)
  const px = (x) => M + (x - P.x0) * U, py = (y) => M + (P.y1 - y) * U;
  const el = (tag, at = {}, pai) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (pai) pai.appendChild(e); return e; };
  const txt = (t, x, y, at, pai) => { const e = el('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', ...at }, pai); e.textContent = t; return e; };
  const vivo = (t) => t === P.token;
  const dorme = async (ms, t) => {
    if (calmo()) ms = Math.min(ms, 300);
    let p = 0;
    while (p < ms) { if (!vivo(t)) throw CANCELADA; await new Promise(r => setTimeout(r, 40)); if (!P.pausado) p += 40; }
    if (!vivo(t)) throw CANCELADA;
  };

  function desenhar({ x0 = -4, x1 = 7, y0 = -3, y1 = 6, quadrantes = false, texto = 1 } = {}) {
    svg.innerHTML = '';
    Object.assign(P, { x0, x1, y0, y1 });
    k = texto; M = Math.round(M0 * Math.max(1, k * 0.9));
    const W = M * 2 + (x1 - x0) * U, H = M * 2 + (y1 - y0) * U;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const grade = el('g', {}, svg);
    for (let x = x0; x <= x1; x++) el('line', { x1: px(x), y1: py(y0), x2: px(x), y2: py(y1), stroke: 'rgba(255,255,255,.10)', 'stroke-width': 1.5 }, grade);
    for (let y = y0; y <= y1; y++) el('line', { x1: px(x0), y1: py(y), x2: px(x1), y2: py(y), stroke: 'rgba(255,255,255,.10)', 'stroke-width': 1.5 }, grade);
    P.gQuad = el('g', {}, svg);
    if (quadrantes) desenharQuadrantes();
    const ex = el('g', { stroke: 'rgba(255,255,255,.75)', 'stroke-width': 3, fill: 'none' }, svg);
    el('line', { x1: px(x0) - 10, y1: py(0), x2: px(x1) + 14, y2: py(0) }, ex);
    el('line', { x1: px(0), y1: py(y0) + 10, x2: px(0), y2: py(y1) - 14 }, ex);
    el('path', { d: `M${px(x1) + 14} ${py(0)} l-10 -6 m10 6 l-10 6` }, ex);
    el('path', { d: `M${px(0)} ${py(y1) - 14} l-6 10 m6 -10 l6 10` }, ex);
    P.gEixos = ex;
    txt('x', px(x1) + 14 + 8 * k, py(0) - 16 * k, { fill: COR.x, 'font-size': 22 * k, 'font-weight': 800 }, svg);
    txt('y', px(0) + 18 * k, py(y1) - 14 - 6 * k, { fill: COR.y, 'font-size': 22 * k, 'font-weight': 800 }, svg);
    const num = el('g', { 'font-size': 15 * k, 'font-weight': 700, 'font-family': 'Inter, sans-serif' }, svg);
    // no plano pequeno (texto > 1), o −1 que é só a folga fica sem número (encostaria no "0")
    const folga = (v, ini) => k > 1 && v === ini && v === -1;
    for (let x = x0; x <= x1; x++) if (x && !folga(x, x0)) txt(fmt(x), px(x), py(0) + 17 * k, { fill: COR.x, opacity: 0.9 }, num);
    for (let y = y0; y <= y1; y++) if (y && !folga(y, y0)) txt(fmt(y), px(0) - 8 - 7 * k, py(y), { fill: COR.y, opacity: 0.9, 'text-anchor': 'end' }, num);
    txt('0', px(0) - 12 * k, py(0) + 15 * k, { fill: '#fff' }, num);
    P.g = { trilha: el('g', {}, svg), marcas: el('g', {}, svg), pet: el('g', {}, svg) };
    P.pet = null;
    return api;
  }
  function desenharQuadrantes() {
    P.gQuad.innerHTML = '';
    for (const [n, sx, sy] of [['1º', 1, 1], ['2º', -1, 1], ['3º', -1, -1], ['4º', 1, -1]]) {
      const cx = sx > 0 ? P.x1 / 2 : P.x0 / 2, cy = sy > 0 ? P.y1 / 2 : P.y0 / 2;
      txt(k > 1 ? n : n + ' quadrante', px(cx), py(cy), { fill: 'rgba(255,215,0,.4)', 'font-size': k > 1 ? 30 * k : 24, 'font-weight': 700, 'font-family': 'Rajdhani, sans-serif' }, P.gQuad);   // pequeno: só "1º"…
    }
  }

  // ── o pet com os pés no ponto ──
  function petEm(x, y, pose = 'andar_frente') {
    if (!P.pet) {
      const dono = petDoAluno();
      if (dono) {
        const [qw, qh] = dono.tam || [898, 704], h = 78 * Math.min(k, 1.3) * (dono.escala || 1) * (qh / 704), w = h * qw / qh;
        const e = el('image', { width: w, height: h, preserveAspectRatio: 'xMidYMax meet' }, P.g.pet);
        dono.visual?.(e);
        P.pet = { el: e, w, h, dono };
      } else P.pet = { el: el('circle', { r: 12 * Math.min(k, 1.3), fill: COR.ouro, stroke: '#10142a', 'stroke-width': 3 }, P.g.pet), dono: null };
    }
    Object.assign(P.pet, { x, y });
    quadro(pose, 0);
    colocar(px(x), py(y));
  }
  function quadro(pose, i) {
    if (!P.pet?.dono) return;
    const { q, espelho } = quadrosPose(P.pet.dono, pose);
    if (q.length) P.pet.el.setAttribute('href', q[i % q.length]);
    P.pet.espelho = espelho;
  }
  function colocar(X, Y) {
    const p = P.pet;
    if (!p.dono) { p.el.setAttribute('cx', X); p.el.setAttribute('cy', Y - 12); return; }
    p.el.setAttribute('x', X - p.w / 2); p.el.setAttribute('y', Y - p.h + 6);
    p.el.setAttribute('transform', p.espelho ? `translate(${2 * X} 0) scale(-1 1)` : '');
  }
  async function andar(dx, dy, t, ms = 620) {
    const pose = dx > 0 ? 'andar_direita' : dx < 0 ? 'andar_esquerda' : dy > 0 ? 'andar_costas' : 'andar_frente';
    const a = { x: px(P.pet.x), y: py(P.pet.y) }, b = { x: px(P.pet.x + dx), y: py(P.pet.y + dy) }, dur = calmo() ? 150 : ms;
    let gasto = 0, ult = performance.now();
    await new Promise((ok, falha) => {
      const passo = (agora) => {
        if (!vivo(t)) { falha(CANCELADA); return; }
        if (!P.pausado) gasto += agora - ult;
        ult = agora;
        const k = Math.min(1, gasto / dur);
        quadro(pose, Math.floor(gasto / 130));
        colocar(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
        if (k < 1) requestAnimationFrame(passo); else ok();
      };
      requestAnimationFrame(passo);
    });
    P.pet.x += dx; P.pet.y += dy;
  }
  async function festa(t) { for (let i = 0; i < 6; i++) { quadro('feliz', i); colocar(px(P.pet.x), py(P.pet.y)); await dorme(140, t); } }

  // ── marcas ──
  const trilho = (x, y, dx, dy, cor) => el('line', { x1: px(x), y1: py(y), x2: px(x + dx), y2: py(y + dy), stroke: cor, 'stroke-width': 7, 'stroke-linecap': 'round', opacity: 0.85 }, P.g.trilha);
  function contagem(x, y, n, cor, eixo) {
    const g = el('g', {}, P.g.marcas), ox = eixo === 'x' ? 0 : 22 * k, oy = eixo === 'x' ? -24 * k : 0;
    el('circle', { cx: px(x) + ox, cy: py(y) + oy, r: 13 * k, fill: cor }, g);
    txt(String(n), px(x) + ox, py(y) + oy, { fill: '#10142a', 'font-size': 15 * k, 'font-weight': 800 }, g);
  }
  const ponto = (x, y, cor = COR.ouro, r = 9) => el('circle', { cx: px(x), cy: py(y), r: r * Math.sqrt(k), fill: cor, stroke: '#10142a', 'stroke-width': 3 }, P.g.marcas);
  function rotulo(x, y, t, cor = '#fff', dy = -34, dx = 0) {
    const g = el('g', {}, P.g.marcas), w = (String(t).length * 10 + 16) * k, h = 30 * k;
    dx *= k; dy *= k;
    if (dx) dx = px(x) + dx + w > px(P.x1) + M ? -dx - w / 2 : dx + w / 2;
    let Y = py(y) + dy;
    if (Y - h / 2 < 2) Y = py(y) + Math.abs(dy);   // em cima da borda: o rótulo vai para baixo
    const X = Math.max(w / 2 + 2, Math.min(px(x) + dx, px(P.x1) + M - w / 2 - 2));   // não sai pelos lados
    el('rect', { x: X - w / 2, y: Y - h / 2, width: w, height: h, rx: 8 * k, fill: 'rgba(13,15,26,.9)', stroke: cor, 'stroke-width': 2 }, g);
    txt(t, X, Y, { fill: cor, 'font-size': 18 * k, 'font-weight': 800, 'font-family': 'Inter, sans-serif' }, g);
    return g;
  }
  function bandeira(x, y) {
    const g = el('g', {}, P.g.marcas), X = px(x) + 10, Y = py(y), a = 40 * Math.min(k, 1.3);
    el('line', { x1: X, y1: Y, x2: X, y2: Y - a, stroke: '#fff', 'stroke-width': 3 }, g);
    el('path', { d: `M${X} ${Y - a} l${a * 0.55} ${a * 0.18} l${-a * 0.55} ${a * 0.18} z`, fill: COR.verm }, g);
  }
  function guias(x, y, so = null) {
    const g = el('g', { 'stroke-dasharray': '6 6', 'stroke-width': 2.5 }, P.g.trilha);
    if (y && so !== 'y') el('line', { x1: px(x), y1: py(y), x2: px(x), y2: py(0), stroke: COR.x }, g);
    if (x && so !== 'x') el('line', { x1: px(x), y1: py(y), x2: px(0), y2: py(y), stroke: COR.y }, g);
  }
  const anelOrigem = () => el('circle', { cx: px(0), cy: py(0), r: 16, fill: 'none', stroke: COR.ouro, 'stroke-width': 3 }, P.g.marcas);
  // círculo no número do eixo (eixo 'x': o x do ponto no eixo x; 'y': o y no eixo y)
  const anelNoEixo = (eixo, v) => el('circle', { cx: eixo === 'x' ? px(v) : px(0) - 8 - 13 * k, cy: eixo === 'x' ? py(0) + 17 * k : py(v), r: 16 * k, fill: 'none', stroke: eixo === 'x' ? COR.x : COR.y, 'stroke-width': 3 }, P.g.marcas);
  // o eixo inteiro aceso (onde o ponto está)
  function destacarEixo(eixo) {
    const cor = eixo === 'x' ? COR.x : COR.y;
    if (eixo === 'x') el('line', { x1: px(P.x0) - 10, y1: py(0), x2: px(P.x1) + 14, y2: py(0), stroke: cor, 'stroke-width': 8, opacity: 0.55, 'stroke-linecap': 'round' }, P.g.trilha);
    else el('line', { x1: px(0), y1: py(P.y0) + 10, x2: px(0), y2: py(P.y1) - 14, stroke: cor, 'stroke-width': 8, opacity: 0.55, 'stroke-linecap': 'round' }, P.g.trilha);
  }
  function xis(x, y) {
    const g = el('g', { stroke: COR.verm, 'stroke-width': 4, 'stroke-linecap': 'round' }, P.g.marcas);
    el('path', { d: `M${px(x) - 9} ${py(y) - 9} l18 18 m0 -18 l-18 18` }, g);
    return g;
  }
  // o cruzamento mais perto de um toque (clientX/Y) ou null fora do plano
  function casaDoToque(e) {
    const m = svg.getScreenCTM?.();
    if (!m) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const x = Math.round((pt.x - M) / U + P.x0), y = Math.round(P.y1 - (pt.y - M) / U);
    return x < P.x0 || x > P.x1 || y < P.y0 || y > P.y1 ? null : [x, y];
  }
  // o cruzamento (x, y) na tela: { clientX, clientY } (o contrário de casaDoToque; usado nos testes)
  function naTela(x, y) {
    const pt = new DOMPoint(px(x), py(y)).matrixTransform(svg.getScreenCTM());
    return { clientX: pt.x, clientY: pt.y };
  }

  // ── animações ──
  const comecar = () => { P.pausado = false; return ++P.token; };
  async function montarPonto([X, Y], fala = {}) {
    const t = comecar(), diz = fala.diz || (() => {}), mostra = fala.par || (() => {});
    petEm(0, 0); mostra(null, null);
    anelOrigem();
    diz(`Vamos achar o ponto <b>${par(X, Y)}</b>. Todo ponto começa na <b>origem</b> (0, 0), onde os eixos se cruzam.`);
    await dorme(1700, t);
    if (X === 0) { diz('O <span class="cx">1º número é o x = 0</span>: <b>não anda</b> para o lado. Fica em cima do eixo y.'); mostra(0, null, 'x'); await dorme(1800, t); }
    else {
      const s = Math.sign(X);
      diz(`O <span class="cx">1º número é o x = ${fmt(X)}</span>: anda <b>${Math.abs(X)}</b> para a <b>${s > 0 ? 'direita' : 'esquerda'}</b>${s < 0 ? ' (o sinal de menos manda para a esquerda)' : ''}.`);
      await dorme(900, t);
      for (let i = 1; i <= Math.abs(X); i++) {
        trilho(P.pet.x, P.pet.y, s, 0, COR.x);
        await andar(s, 0, t);
        contagem(P.pet.x, P.pet.y, i, COR.x, 'x'); mostra(s * i, null, 'x');
        await dorme(250, t);
      }
    }
    await dorme(500, t);
    if (Y === 0) { diz('O <span class="cy">2º número é o y = 0</span>: <b>não sobe</b>. Fica em cima do eixo x.'); mostra(X, 0, 'y'); await dorme(1800, t); }
    else {
      const s = Math.sign(Y);
      diz(`O <span class="cy">2º número é o y = ${fmt(Y)}</span>: anda <b>${Math.abs(Y)}</b> para <b>${s > 0 ? 'cima' : 'baixo'}</b>.`);
      await dorme(900, t);
      for (let i = 1; i <= Math.abs(Y); i++) {
        trilho(P.pet.x, P.pet.y, 0, s, COR.y);
        await andar(0, s, t);
        contagem(P.pet.x, P.pet.y, i, COR.y, 'y'); mostra(X, s * i, 'y');
        await dorme(250, t);
      }
    }
    await dorme(400, t);
    guias(X, Y); bandeira(X, Y); rotulo(X, Y, par(X, Y), COR.ouro, 0, 34);
    mostra(X, Y);
    diz(`Chegou! 🚩 <b>${par(X, Y)}</b>: <span class="cx">primeiro o lado (x)</span>, <span class="cy">depois cima ou baixo (y)</span>.`);
    await festa(t);
  }
  async function andarDe([x0, y0], mov, fala = {}) {
    const t = comecar(), diz = fala.diz || (() => {}), mostra = fala.par || (() => {});
    petEm(x0, y0); ponto(x0, y0, COR.verde, 8); rotulo(x0, y0, 'partida ' + par(x0, y0), COR.verde, 28);
    mostra(x0, y0);
    diz(`Saindo de <b>${par(x0, y0)}</b>, ${textoMov(mov)}. Onde paro?`);
    await dorme(2000, t);
    for (const [dx, dy, n] of mov) {
      const eixo = dx ? 'x' : 'y', cor = dx ? COR.x : COR.y;
      diz(dx ? `Para o lado <b>só o <span class="cx">x</span> muda</b>: ${dx > 0 ? 'direita = <b>+1</b> no x' : 'esquerda = <b>−1</b> no x'} a cada casa.`
        : `Para ${dy > 0 ? 'cima' : 'baixo'} <b>só o <span class="cy">y</span> muda</b>: ${dy > 0 ? 'cima = <b>+1</b> no y' : 'baixo = <b>−1</b> no y'} a cada casa.`);
      await dorme(900, t);
      for (let i = 1; i <= n; i++) {
        trilho(P.pet.x, P.pet.y, dx, dy, cor);
        await andar(dx, dy, t);
        contagem(P.pet.x, P.pet.y, i, cor, eixo); mostra(P.pet.x, P.pet.y, eixo);
        await dorme(300, t);
      }
      await dorme(500, t);
    }
    bandeira(P.pet.x, P.pet.y); rotulo(P.pet.x, P.pet.y, par(P.pet.x, P.pet.y), COR.ouro, 0, 34);
    mostra(P.pet.x, P.pet.y);
    diz(`Parei em <b>${par(P.pet.x, P.pet.y)}</b>. 🚩`);
    await festa(t);
  }
  // retorno das perguntas: o pet (já na partida) faz o caminho contando e finca a bandeira
  // rapido: o caminho inteiro em ~2 s (cada casa entre 250 e 620 ms), para a pergunta seguinte não demorar
  async function mostrarCaminho(partida, mov, { rapido = false } = {}) {
    const t = comecar(), casas = mov.reduce((s, m) => s + m[2], 0);
    const ms = rapido ? Math.max(250, Math.min(620, 2000 / Math.max(1, casas))) : 620;
    if (!P.pet || P.pet.x !== partida[0] || P.pet.y !== partida[1]) petEm(...partida);
    for (const [dx, dy, n] of mov) for (let i = 1; i <= n; i++) {
      const cor = dx ? COR.x : COR.y;
      trilho(P.pet.x, P.pet.y, dx, dy, cor);
      await andar(dx, dy, t, ms);
      contagem(P.pet.x, P.pet.y, i, cor, dx ? 'x' : 'y');
      if (!rapido) await dorme(120, t);
    }
    bandeira(P.pet.x, P.pet.y); rotulo(P.pet.x, P.pet.y, par(P.pet.x, P.pet.y), COR.ouro, 0, 34);
    await festa(t);
  }

  const api = {
    desenhar, desenharQuadrantes, petEm, ponto, rotulo, bandeira, guias, anelOrigem, anelNoEixo, destacarEixo, xis, trilho, contagem,
    casaDoToque, naTela, montarPonto, andarDe, mostrarCaminho,
    festa: () => festa(comecar()),
    cancelar() { P.token++; P.pausado = false; },
    pausar(sim = !P.pausado) { P.pausado = sim; return P.pausado; },
    get pausado() { return P.pausado; },
    get faixa() { return { x0: P.x0, x1: P.x1, y0: P.y0, y1: P.y1 }; },
    get posPet() { return P.pet ? [P.pet.x, P.pet.y] : null; },
  };
  return api;
}

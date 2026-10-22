// Jogo de Revisão — figuras animadas nas perguntas (PROMPT-135): Canteiro de Obras (mapa 11) e Celeiro (mapa 4 A).
// Como o plano do mapa 12 (plano.js): a pergunta mostra a figura ANTES de responder; DEPOIS, uma animação explica a conta.
//
//   const f = criarFigura(svg)    uma figura por <svg>; cada uma tem a própria animação (cancelar / pausar)
//   f.mostrar(figura)             desenha o "antes" (e prepara a animação)
//   await f.animar()              roda o "depois" (lança CANCELADA se outra começar)
// Tipos (o campo `figura` das perguntas, montado pelos geradores): poligono, grade, triangulo_area, paralelogramo,
// compara_area, medida, contar_lados, angulo_reto, angulos, regua, barras_iguais, simplificar, soma_fracao, parte_de,
// compara_fracoes, pizza. Cores do jogo: laranja = 1ª medida, azul = 2ª, ouro = contorno, verde = resultado.
// A legenda da conta fica numa faixa embaixo da figura: [[laranja]], <<azul>>, **verde**.

const NS = 'http://www.w3.org/2000/svg';
const W = 640, H = 420, HT = 480;   // área do desenho e altura total (a faixa da legenda embaixo)
const LAR = 'var(--jr-laranja, #ff7b2e)', AZ = 'var(--jr-cyan, #2fc6ff)', OURO = 'var(--jr-ouro, #ffd700)', VERDE = 'var(--jr-verde, #00e676)';
const calmo = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const CANCELADA = Symbol('figura cancelada');
const fmtN = (n) => (typeof n === 'number' ? String(Math.round(n * 100) / 100).replace('.', ',') : String(n));
const mdc = (a, b) => (b ? mdc(b, a % b) : Math.abs(a));
const menorPrimo = (n) => { for (let p = 2; p <= n; p++) if (n % p === 0) return p; return n; };

export function criarFigura(svg) {
  const F = { token: 0, pausado: false, anim: null, leg: null };
  const el = (tag, at = {}, pai = svg) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (pai) pai.appendChild(e); return e; };
  const txt = (t, x, y, at = {}, pai = svg) => { const e = el('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'Inter, sans-serif', 'font-weight': 800, fill: '#fff', 'font-size': 26, ...at }, pai); e.textContent = t; return e; };
  const vivo = (t) => t === F.token;
  const dorme = async (ms, t) => {
    if (calmo()) ms = Math.min(ms, 120);
    let p = 0;
    while (p < ms) { if (!vivo(t)) throw CANCELADA; await new Promise(r => setTimeout(r, 30)); if (!F.pausado) p += 30; }
    if (!vivo(t)) throw CANCELADA;
  };
  // a legenda (faixa de baixo): [[laranja]] <<azul>> **verde** — o resto em branco
  function legenda(s) {
    if (!F.leg) return;
    F.leg.innerHTML = '';
    const partes = String(s || '').split(/(\[\[.+?\]\]|<<.+?>>|\*\*.+?\*\*)/).filter(Boolean);
    for (const p of partes) {
      const m = /^(\[\[|<<|\*\*)(.+?)(\]\]|>>|\*\*)$/.exec(p);
      const ts = el('tspan', { fill: m ? (m[1] === '[[' ? LAR : m[1] === '<<' ? AZ : VERDE) : '#fff' }, F.leg);
      ts.textContent = m ? m[2] : p;
    }
    // não cabe: encolhe
    F.leg.setAttribute('font-size', 26);
    try { const w = F.leg.getComputedTextLength?.() || 0; if (w > W - 20) F.leg.setAttribute('font-size', Math.max(14, 26 * (W - 20) / w)); } catch (_) {}
  }
  function limpar() {
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${W} ${HT}`);
    el('rect', { x: 0, y: H + 4, width: W, height: HT - H - 6, rx: 12, fill: 'rgba(13,15,26,.75)' });
    F.leg = txt('', W / 2, (H + HT) / 2 + 1, { 'font-size': 26, 'font-weight': 700 });
  }

  // ── desenhos auxiliares ──
  const centro = (pts) => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
  function encaixar(pts, w = 440, h = 300, cx = W / 2, cy = H / 2) {   // escala e centraliza um polígono
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const bw = Math.max(...xs) - Math.min(...xs) || 1, bh = Math.max(...ys) - Math.min(...ys) || 1, s = Math.min(w / bw, h / bh);
    const ox = cx - (Math.min(...xs) + bw / 2) * s, oy = cy - (Math.min(...ys) + bh / 2) * s;
    return pts.map(([x, y]) => [ox + x * s, oy + y * s]);
  }
  const regular = (n, r = 140, cx = W / 2, cy = H / 2 + 6) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(-Math.PI / 2 + i * 2 * Math.PI / n), cy + r * Math.sin(-Math.PI / 2 + i * 2 * Math.PI / n)]);
  // o rótulo de um lado, para fora da figura, afastado pelo tamanho do texto (não encosta na linha)
  function rotuloLado(p, q, pts, texto, cor = '#fff', dist = 16) {
    const [cx, cy] = centro(pts), mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    let nx = -(q[1] - p[1]), ny = q[0] - p[0];   // normal do lado, apontando para fora
    const dn = Math.hypot(nx, ny) || 1; nx /= dn; ny /= dn;
    if (nx * (mx - cx) + ny * (my - cy) < 0) { nx = -nx; ny = -ny; }
    const meiaL = String(texto).length * 8 + 4, meiaA = 15, folga = dist + Math.abs(nx) * meiaL + Math.abs(ny) * meiaA;
    return txt(texto, mx + nx * folga, my + ny * folga, { fill: cor, 'font-size': 26 });
  }
  function celulas(c, l, x0, y0, u, cor = 'rgba(255,255,255,.04)') {
    const cel = [], g = el('g');
    for (let j = 0; j < l; j++) for (let i = 0; i < c; i++) cel.push(el('rect', { x: x0 + i * u, y: y0 + j * u, width: u, height: u, fill: cor, stroke: 'rgba(255,255,255,.35)', 'stroke-width': 1.5 }, g));
    return cel;
  }
  function barra(n, x0, y0, w, h, pintadas = 0, cor = LAR) {
    const partes = [];
    for (let i = 0; i < n; i++) partes.push(el('rect', { x: x0 + i * w / n, y: y0, width: w / n, height: h, fill: i < pintadas ? cor : 'rgba(255,255,255,.06)', stroke: '#fff', 'stroke-width': 3 }));
    return partes;
  }
  function pizza(n, cx, cy, r, comidos = 0) {
    const fatias = [];
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + i * 2 * Math.PI / n, a1 = a0 + 2 * Math.PI / n;
      fatias.push(el('path', { d: `M${cx} ${cy} L${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`,
        fill: i < comidos ? 'rgba(255,255,255,.08)' : '#f5b041', stroke: '#7a3e00', 'stroke-width': 3 }));
    }
    el('circle', { cx, cy, r, fill: 'none', stroke: '#c0392b', 'stroke-width': 8, opacity: 0.9 });
    return fatias;
  }

  // ── perímetro: a formiga dá a volta somando os lados ──
  function pontosDoPoligono(f, lados) {
    const v = lados.map(Number);
    if (f.forma === 'quadrado') return encaixar([[0, 0], [1, 0], [1, 1], [0, 1]], 230, 230);
    if (f.forma === 'retangulo') { const a = v[0], b = Math.min(v[1], v[0]), r = Math.max(0.28, b / a); return encaixar([[0, 0], [1, 0], [1, r], [0, r]], 440, 260); }
    if (f.forma === 'triangulo' && v.length === 3) {
      const [L0, L1, L2] = v, x = (L0 * L0 + L2 * L2 - L1 * L1) / (2 * L0), y = -Math.sqrt(Math.max(0.01, L2 * L2 - x * x));
      return encaixar([[0, 0], [L0, 0], [x, y]], 420, 280);
    }
    return regular(v.length);
  }
  function poligono(f) {
    const final = f.revela || f.lados, pts = pontosDoPoligono(f, final), u = f.unid ? ' ' + f.unid : '';
    el('polygon', { points: pts.map(p => p.join(',')).join(' '), fill: 'rgba(124,92,252,.18)', stroke: '#fff', 'stroke-width': 4, 'stroke-linejoin': 'round' });
    const rot = pts.map((p, i) => (f.lados[i] != null ? rotuloLado(p, pts[(i + 1) % pts.length], pts, fmtN(f.lados[i]) + (f.lados[i] === '?' ? '' : u), f.lados[i] === '?' ? OURO : '#fff') : null));
    if (f.total != null) { const [cx, cy] = centro(pts); txt(`volta toda = ${fmtN(f.total)}${u}`, cx, cy, { fill: OURO, 'font-size': 24 }); }
    legenda('Perímetro: a volta toda');
    return async (t) => {
      const soma = [];
      const passo = Math.max(18, Math.min(45, 1800 / (pts.length * 12)));
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length];
        const ln = el('line', { x1: p[0], y1: p[1], x2: p[0], y2: p[1], stroke: OURO, 'stroke-width': 9, 'stroke-linecap': 'round' });
        const formiga = txt('🐜', p[0], p[1], { 'font-size': 28 });
        for (let k = 1; k <= 12; k++) { const s = k / 12, x = p[0] + (q[0] - p[0]) * s, y = p[1] + (q[1] - p[1]) * s; ln.setAttribute('x2', x); ln.setAttribute('y2', y); formiga.setAttribute('x', x); formiga.setAttribute('y', y); await dorme(passo, t); }
        formiga.remove();
        if (f.revela && rot[i]) { rot[i].remove(); rot[i] = rotuloLado(p, q, pts, fmtN(final[i]) + u, LAR); }   // o número no lugar do ?
        soma.push(fmtN(final[i]));
        legenda(`[[${soma.join(' + ')}]]${i < pts.length - 1 ? ' + …' : ''}`);
        await dorme(160, t);
      }
      const tot = final.reduce((a, x) => a + Number(x), 0);
      legenda(f.conta ? `**${f.conta}**` : `[[${soma.join(' + ')}]] = **${fmtN(tot)}${u}**`);
    };
  }
  // ── área: o retângulo de quadradinhos se enche fileira por fileira ──
  function grade(f) {
    const { c, l } = f, u = Math.min(380 / c, 300 / l, 70), x0 = (W - c * u) / 2 + 12, y0 = (H - l * u) / 2 - 10, uni = f.unid || '';
    const cel = celulas(c, l, x0, y0, u);
    el('rect', { x: x0, y: y0, width: c * u, height: l * u, fill: 'none', stroke: '#fff', 'stroke-width': 4 });
    const rc = txt(f.lado_oculto ? '?' : `${c}${uni ? ' ' + uni : ''}`, x0 + c * u / 2, y0 + l * u + 26, { fill: f.lado_oculto ? OURO : LAR });
    const rl = txt(f.lado_oculto ? '?' : `${l}${uni ? ' ' + uni : ''}`, x0 - 12, y0 + l * u / 2, { fill: f.lado_oculto ? OURO : AZ, 'text-anchor': 'end' });
    const nome = f.rotulo || 'quadradinhos', tot = c * l;
    legenda(f.lado_oculto ? `Área = ${tot}${uni ? ' ' + uni + '²' : ''}: qual é o lado?` : 'Área: quanto cabe dentro');
    return async (t) => {
      const ms = Math.max(8, Math.min(60, 1600 / tot));
      for (let j = 0; j < l; j++) {
        for (let i = 0; i < c; i++) { cel[j * c + i].setAttribute('fill', j % 2 ? 'rgba(47,198,255,.55)' : 'rgba(255,123,46,.55)'); if (tot <= 60 || i === c - 1) await dorme(ms * (tot <= 60 ? 1 : c), t); }
        legenda(`${j + 1} fileira${j ? 's' : ''} de [[${c}]] = ${(j + 1) * c} ${nome}`);
        await dorme(tot > 40 ? 90 : 220, t);
      }
      if (f.lado_oculto) { rc.textContent = `${c} ${uni}`; rc.setAttribute('fill', LAR); rl.textContent = `${l} ${uni}`; rl.setAttribute('fill', AZ); }
      if (f.metade) {
        await dorme(400, t);
        for (let j = 0; j < l; j++) for (let i = 0; i < c; i++) if (i < c / 2) cel[j * c + i].setAttribute('fill', 'rgba(0,230,118,.6)');
        legenda(`<<${l}>> × [[${c}]] = ${tot} ÷ 2 = **${fmtN(tot / 2)} ${uni}²**`);
        return;
      }
      legenda(f.conta ? `**${f.conta}**` : uni ? `<<${l}>> × [[${c}]] = **${tot} ${uni}²**` : `<<${l}>> fileiras × [[${c}]] = **${tot} ${nome}**`);
    };
  }
  // ── área do triângulo: metade do retângulo ──
  function trianguloArea(f) {
    const b = f.base, a = f.altura, u = Math.min(420 / b, 280 / a, 60), x0 = (W - b * u) / 2 + 10, y0 = (H - a * u) / 2 - 10, uni = f.unid || 'cm';
    const muitas = b * a > 140, cel = muitas ? [el('rect', { x: x0, y: y0, width: b * u, height: a * u, fill: 'rgba(255,255,255,.04)' })] : celulas(b, a, x0, y0, u);
    el('rect', { x: x0, y: y0, width: b * u, height: a * u, fill: 'none', stroke: 'rgba(255,255,255,.7)', 'stroke-width': 3, 'stroke-dasharray': '10 8' });
    const tri = el('polygon', { points: `${x0},${y0 + a * u} ${x0 + b * u},${y0 + a * u} ${x0 + b * u / 2},${y0}`, fill: 'rgba(124,92,252,.3)', stroke: '#fff', 'stroke-width': 4, 'stroke-linejoin': 'round' });
    txt(`${b} ${uni}`, x0 + b * u / 2, y0 + a * u + 26, { fill: LAR });
    txt(`${a} ${uni}`, x0 - 12, y0 + a * u / 2, { fill: AZ, 'text-anchor': 'end' });
    legenda('O triângulo cabe no retângulo');
    return async (t) => {
      if (muitas) { cel[0].setAttribute('fill', 'rgba(255,123,46,.45)'); await dorme(500, t); }
      else for (let k = 0; k < cel.length; k++) { cel[k].setAttribute('fill', 'rgba(255,123,46,.45)'); await dorme(Math.min(40, 1200 / cel.length), t); }
      legenda(`O retângulo todo: [[${b}]] × <<${a}>> = ${b * a} ${uni}²`);
      await dorme(800, t);
      svg.appendChild(tri);
      tri.setAttribute('fill', 'rgba(0,230,118,.5)'); tri.setAttribute('stroke', VERDE);
      legenda(`O triângulo é metade: ${b * a} ÷ 2 = **${fmtN(b * a / 2)} ${uni}²**`);
    };
  }
  // ── paralelogramo: o triângulo da ponta corta e encaixa do outro lado ──
  function paralelogramo(f) {
    const b = f.base, a = f.altura, off = Math.min(b * 0.35, a * 0.8), u = Math.min(420 / (b + off), 260 / a), x0 = (W - (b + off) * u) / 2, y0 = (H - a * u) / 2 - 6, uni = f.unid || 'cm';
    const X = (v) => x0 + v * u, Y = (v) => y0 + v * u;
    el('polygon', { points: `${X(off)},${Y(0)} ${X(off + b)},${Y(0)} ${X(b)},${Y(a)} ${X(0)},${Y(a)}`, fill: 'rgba(124,92,252,.25)', stroke: '#fff', 'stroke-width': 4, 'stroke-linejoin': 'round' });
    el('line', { x1: X(off), y1: Y(0), x2: X(off), y2: Y(a), stroke: AZ, 'stroke-width': 3, 'stroke-dasharray': '8 6' });
    txt(`${b} ${uni}`, X(b / 2), Y(a) + 26, { fill: LAR });
    txt(`${a} ${uni}`, X(off) + 40, Y(a / 2), { fill: AZ, 'font-size': 22 });
    legenda('Paralelogramo: base e altura');
    return async (t) => {
      const ponta = el('polygon', { points: `${X(0)},${Y(a)} ${X(off)},${Y(0)} ${X(off)},${Y(a)}`, fill: 'rgba(255,123,46,.75)', stroke: LAR, 'stroke-width': 3 });
      legenda('Corta o triângulo da ponta…');
      await dorme(700, t);
      for (let k = 1; k <= 20; k++) { ponta.setAttribute('transform', `translate(${b * u * k / 20} 0)`); await dorme(35, t); }
      legenda(`…encaixa do outro lado: vira retângulo [[${b}]] × <<${a}>> = **${b * a} ${uni}²**`);
    };
  }
  // ── qual tem área maior: as duas se enchem de quadradinhos ──
  function comparaArea(f) {
    const [A, B] = f.figuras, uni = f.unid || 'cm', u = Math.min(250 / Math.max(A.c, 1), 250 / Math.max(B.c, 1), 300 / Math.max(A.l, B.l), 40);
    const xa = W / 4 - A.c * u / 2 + 10, xb = 3 * W / 4 - B.c * u / 2 - 10, ya = (H - A.l * u) / 2 - 10, yb = (H - B.l * u) / 2 - 10;
    const ca = celulas(A.c, A.l, xa, ya, u, 'rgba(0,0,0,0)'), cb = celulas(B.c, B.l, xb, yb, u, 'rgba(0,0,0,0)');
    for (const c of [...ca, ...cb]) c.setAttribute('stroke', 'rgba(255,255,255,0)');
    const ra = el('rect', { x: xa, y: ya, width: A.c * u, height: A.l * u, fill: 'rgba(124,92,252,.2)', stroke: '#fff', 'stroke-width': 4 });
    const rb = el('rect', { x: xb, y: yb, width: B.c * u, height: B.l * u, fill: 'rgba(124,92,252,.2)', stroke: '#fff', 'stroke-width': 4 });
    txt(`${A.c} × ${A.l}`, xa + A.c * u / 2, ya + A.l * u + 24, { 'font-size': 22 });
    txt(`${B.c} × ${B.l}`, xb + B.c * u / 2, yb + B.l * u + 24, { 'font-size': 22 });
    legenda('Qual cabe mais quadradinhos?');
    return async (t) => {
      for (const [cel, cor] of [[ca, 'rgba(255,123,46,.55)'], [cb, 'rgba(47,198,255,.55)']]) for (const c of cel) { c.setAttribute('fill', cor); c.setAttribute('stroke', 'rgba(255,255,255,.35)'); await dorme(Math.min(30, 700 / cel.length), t); }
      const sa = A.c * A.l, sb = B.c * B.l, maior = sa > sb ? ra : rb;
      txt(`${sa} ${uni}²`, xa + A.c * u / 2, ya - 22, { fill: LAR }); txt(`${sb} ${uni}²`, xb + B.c * u / 2, yb - 22, { fill: AZ });
      maior.setAttribute('stroke', OURO); maior.setAttribute('stroke-width', 7);
      legenda(`[[${sa}]] × <<${sb}>>: a maior é **${sa > sb ? A.nome || 'a primeira' : B.nome || 'a segunda'}**`);
    };
  }
  // ── cm ou cm²: o contorno (comprimento) ou o miolo (quadradinhos) ──
  function medida(f) {
    const x0 = 200, y0 = 70, s = 240;
    const cel = celulas(4, 4, x0, y0, s / 4, 'rgba(0,0,0,0)');
    for (const c of cel) c.setAttribute('stroke', 'rgba(255,255,255,.12)');
    const r = el('rect', { x: x0, y: y0, width: s, height: s, fill: 'rgba(124,92,252,.15)', stroke: '#fff', 'stroke-width': 4 });
    legenda(f.o === 'area' ? 'Área é medida em…' : 'Perímetro é medido em…');
    return async (t) => {
      if (f.o === 'perimetro') {
        r.setAttribute('stroke', OURO); r.setAttribute('stroke-width', 10);
        for (let k = 0; k < 3; k++) { r.setAttribute('opacity', k % 2 ? 1 : 0.4); await dorme(220, t); }
        r.setAttribute('opacity', 1);
        legenda('**cm**: o comprimento do contorno');
      } else {
        for (const c of cel) { c.setAttribute('fill', 'rgba(255,123,46,.55)'); c.setAttribute('stroke', 'rgba(255,255,255,.4)'); await dorme(60, t); }
        legenda('**cm²**: quadradinhos de 1 cm por 1 cm');
      }
    };
  }
  // ── quantos lados: acendem um a um ──
  function contarLados(f) {
    const pts = regular(f.n);
    el('polygon', { points: pts.map(p => p.join(',')).join(' '), fill: 'rgba(124,92,252,.18)', stroke: '#fff', 'stroke-width': 4, 'stroke-linejoin': 'round' });
    legenda('Conte os lados');
    return async (t) => {
      for (let i = 0; i < f.n; i++) {
        const p = pts[i], q = pts[(i + 1) % f.n];
        el('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: OURO, 'stroke-width': 9, 'stroke-linecap': 'round' });
        rotuloLado(p, q, pts, String(i + 1), LAR, 28);
        legenda(`${i + 1}…`);
        await dorme(330, t);
      }
      legenda(`**${f.n} lados**`);
    };
  }
  // ── ângulo reto: o canto de um quadrado ──
  function anguloReto() {
    const x = 220, y = 320, s = 220;
    const q = el('rect', { x, y: y - s, width: s, height: s, fill: 'none', stroke: 'rgba(255,255,255,.25)', 'stroke-width': 3, 'stroke-dasharray': '8 8', opacity: 0 });
    el('polyline', { points: `${x},${y - s} ${x},${y} ${x + s},${y}`, fill: 'none', stroke: '#fff', 'stroke-width': 6, 'stroke-linecap': 'round' });
    el('polyline', { points: `${x},${y - 40} ${x + 40},${y - 40} ${x + 40},${y}`, fill: 'none', stroke: OURO, 'stroke-width': 4 });
    legenda('O ângulo reto');
    return async (t) => {
      for (let k = 1; k <= 10; k++) { q.setAttribute('opacity', k / 10); await dorme(50, t); }
      q.setAttribute('fill', 'rgba(124,92,252,.18)');
      txt('90°', x + 80, y - 70, { fill: OURO, 'font-size': 34 });
      legenda('**90°**: o canto de um quadrado');
    };
  }
  // ── ângulos do triângulo: somam 180° ──
  function angulos(f) {
    const [A, B] = f.angulos.map(Number), r = Math.PI / 180;
    const p0 = [0, 0], p1 = [1, 0], tA = Math.tan(A * r), tB = Math.tan(B * r);
    const x = tB / (tA + tB), y = -x * tA;
    const pts = encaixar([p0, p1, [x, y]], 440, 280);
    el('polygon', { points: pts.map(p => p.join(',')).join(' '), fill: 'rgba(124,92,252,.18)', stroke: '#fff', 'stroke-width': 4, 'stroke-linejoin': 'round' });
    const [cx, cy] = centro(pts);
    const rot = pts.map((p, i) => { const dx = cx - p[0], dy = cy - p[1], d = Math.hypot(dx, dy) || 1, v = f.angulos[i];
      return txt(v === '?' ? '?' : `${v}°`, p[0] + dx / d * 46, p[1] + dy / d * 46, { fill: v === '?' ? OURO : i ? AZ : LAR, 'font-size': 24 }); });
    legenda('Os ângulos do triângulo');
    return async (t) => {
      legenda('A soma dos ângulos de um triângulo é **180°**');
      await dorme(1100, t);
      const i = f.angulos.indexOf('?');
      if (i >= 0 && f.revela != null) { rot[i].textContent = `${f.revela}°`; rot[i].setAttribute('fill', VERDE); }
      legenda(`**${f.conta || ''}**`);
    };
  }
  // ── régua: a fita se marca em partes ──
  function regua(f) {
    const x0 = 60, w = 520, y0 = 170, h = 70;
    el('rect', { x: x0, y: y0, width: w, height: h, rx: 8, fill: '#f5d36b', stroke: '#7a5b00', 'stroke-width': 3 });
    txt(f.de, W / 2, y0 - 40, { fill: OURO, 'font-size': 30 });
    legenda(`${f.de} = ?`);
    return async (t) => {
      if (f.metros) {
        for (let k = 0; k < f.metros; k++) {
          const x = x0 + k * w / f.metros;
          el('rect', { x, y: y0, width: w / f.metros, height: h, fill: k % 2 ? 'rgba(47,198,255,.45)' : 'rgba(255,123,46,.45)', stroke: '#7a5b00', 'stroke-width': 2 });
          txt('100 cm', x + w / f.metros / 2, y0 + h / 2, { fill: '#1a1208', 'font-size': 22 });
          txt(`${k + 1} m`, x + w / f.metros / 2, y0 + h + 30, { fill: LAR, 'font-size': 22 });
          legenda(`${k + 1} × 100 cm`);
          await dorme(500, t);
        }
      } else {
        const n = f.partes || 10, grupo = n > 20 ? n / 10 : 1, ms = Math.max(8, 1500 / n);
        for (let k = 1; k <= n; k++) {
          const x = x0 + k * w / n, longo = k % grupo === 0;
          el('line', { x1: x, y1: y0, x2: x, y2: y0 + (longo ? h * 0.55 : h * 0.3), stroke: '#1a1208', 'stroke-width': longo ? 2.5 : 1.2 });
          if (longo && (n <= 20 || k % (grupo * 2) === 0 || k === n)) txt(String(k), x, y0 + h + 22, { fill: LAR, 'font-size': 18 });
          if (k % grupo === 0) legenda(`${k}…`);
          await dorme(ms, t);
        }
      }
      txt(f.para, W / 2, y0 + h + 80, { fill: VERDE, 'font-size': 32 });
      legenda(`**${f.texto}**`);
    };
  }
  // ── frações ──
  function barrasIguais(f) {
    const [p, q] = f.de, [p2, q2] = f.para;
    barra(q, 80, 90, 480, 80, p, LAR);
    txt(`${p}/${q}`, 600, 130, { 'font-size': 26 });
    legenda(`Quanto é ${p}/${q}?`);
    return async (t) => {
      const b = barra(q2, 80, 230, 480, 80, 0);
      txt(`${p2}/${q2}`, 600, 270, { fill: AZ, 'font-size': 26 });
      for (let i = 0; i < p2; i++) { b[i].setAttribute('fill', AZ); await dorme(300, t); }
      el('line', { x1: 80 + 480 * p / q, y1: 70, x2: 80 + 480 * p / q, y2: 330, stroke: OURO, 'stroke-width': 4, 'stroke-dasharray': '8 6' });
      legenda(`[[${p}/${q}]] = <<${p2}/${q2}>>: **mesmo tamanho pintado**`);
    };
  }
  function simplificar(f) {
    let [p, q] = f.fr;
    const passos = [[p, q]];
    while (mdc(p, q) > 1 && passos.length < 5) { const d = menorPrimo(mdc(p, q)); p /= d; q /= d; passos.push([p, q]); }
    const h = Math.min(80, 300 / passos.length - 16), gap = Math.min(110, 340 / passos.length);
    barra(passos[0][1], 70, 40, 460, h, passos[0][0], LAR);
    txt(`${passos[0][0]}/${passos[0][1]}`, 585, 40 + h / 2, { 'font-size': 24 });
    legenda(`Simplificar ${passos[0][0]}/${passos[0][1]}`);
    return async (t) => {
      for (let k = 1; k < passos.length; k++) {
        await dorme(650, t);
        const [a, b] = passos[k], d = passos[k - 1][1] / b, cor = k === passos.length - 1 ? VERDE : AZ;
        barra(b, 70, 40 + k * gap, 460, h, a, cor);
        txt(`${a}/${b}`, 585, 40 + k * gap + h / 2, { fill: cor, 'font-size': 24 });
        legenda(`Juntando de ${d} em ${d}: ${passos[k - 1][0]}/${passos[k - 1][1]} = ${a}/${b}`);
      }
      legenda(`A mesma parte pintada: ${passos.map(x => x.join('/')).join(' = ')} → **${passos.at(-1).join('/')}**`);
    };
  }
  function somaFracao(f) {
    const [a, d0] = f.a, [b, db] = f.b, D = f.converte ? f.converte[0][1] : d0, A = f.converte ? f.converte[0][0] : a, B = f.converte ? f.converte[1][0] : b;
    const y = f.converte ? 210 : 150;
    if (f.converte) { barra(d0, 70, 40, 460, 60, a, LAR); txt(`${a}/${d0}`, 585, 70, { 'font-size': 24 }); }
    const parts = barra(D, 70, y, 460, 80, 0);
    txt(`${f.a.join('/')} ${f.op} ${f.b.join('/')}`, W / 2, f.converte ? 160 : 90, { 'font-size': 28 });
    legenda(`${f.a.join('/')} ${f.op} ${f.b.join('/')}`);
    return async (t) => {
      if (f.converte) { for (let i = 0; i < A; i++) parts[i].setAttribute('fill', LAR); legenda(`Deixe os de baixo iguais: [[${a}/${d0} = ${A}/${D}]]`); await dorme(1100, t); }
      else { for (let i = 0; i < A; i++) { parts[i].setAttribute('fill', LAR); await dorme(220, t); } legenda(`[[${A}/${D}]]…`); await dorme(500, t); }
      if (f.op === '+') { for (let i = A; i < A + B; i++) { parts[i].setAttribute('fill', AZ); await dorme(260, t); } }
      else for (let i = A - 1; i >= A - B; i--) { parts[i].setAttribute('fill', 'rgba(255,255,255,.06)'); el('path', { d: `M${70 + i * 460 / D + 8} ${y + 8} l${460 / D - 16} 64 m0 -64 l${-(460 / D - 16)} 64`, stroke: '#ff4d5e', 'stroke-width': 4 }); await dorme(260, t); }
      const n = f.op === '+' ? A + B : A - B;
      const fim = f.antes_simplificar ? ` = ${f.antes_simplificar.join('/')}` : '';
      legenda(`[[${A}/${D}]] ${f.op} <<${B}/${D}>>${fim} = **${f.res.join('/')}**`);
      if (f.antes_simplificar) { await dorme(500, t); barra(f.res[1], 70, y + 110, 460, 50, f.res[0], VERDE); txt(f.res.join('/'), 585, y + 135, { fill: VERDE, 'font-size': 24 }); }
      else if (!f.converte && n === f.res[0]) txt(f.res.join('/'), W / 2, y + 120, { fill: VERDE, 'font-size': 30 });
    };
  }
  function parteDe(f) {
    const { num, den, total } = f, k = total / den, v = num * k, cores = [LAR, AZ, VERDE, OURO, '#c86bff', '#ff6b9a', '#6bffd2', '#ffa36b', '#9ab0ff', '#b8ff6b'];
    if (total <= 24) {
      const cols = Math.min(8, total), bolos = [];
      for (let i = 0; i < total; i++) bolos.push(txt('🍪', W / 2 + ((i % cols) - (cols - 1) / 2) * 66, 80 + Math.floor(i / cols) * 70, { 'font-size': 42 }));
      legenda(`${num === 1 && den === 2 ? 'A metade' : `${num}/${den}`} de ${total}`);
      return async (t) => {
        const gw = Math.min(140, (W - 40) / den - 10), x0 = (W - den * (gw + 10) + 10) / 2;
        for (let g = 0; g < den; g++) {
          el('rect', { x: x0 + g * (gw + 10), y: 290, width: gw, height: 110, rx: 14, fill: 'none', stroke: cores[g % cores.length], 'stroke-width': 4 });
          for (let j = 0; j < k; j++) {
            const b = bolos[g * k + j], col = j % 3, lin = Math.floor(j / 3);
            b.setAttribute('x', x0 + g * (gw + 10) + 24 + col * Math.min(36, (gw - 30) / 2)); b.setAttribute('y', 320 + lin * 34); b.setAttribute('font-size', 26);
            await dorme(Math.min(140, 1600 / total), t);
          }
        }
        for (let g = 0; g < num; g++) el('rect', { x: x0 + g * (gw + 10) - 4, y: 286, width: gw + 8, height: 118, rx: 16, fill: 'rgba(0,230,118,.18)', stroke: VERDE, 'stroke-width': 4 });
        legenda(`${total} em <<${den} grupos iguais>>: cada grupo tem ${k}. ${num} grupo${num > 1 ? 's' : ''} = **${v}**`);
      };
    }
    // muitos: uma barra com o número escrito
    const r = el('rect', { x: 70, y: 150, width: 500, height: 90, rx: 6, fill: 'rgba(255,123,46,.3)', stroke: '#fff', 'stroke-width': 3 });
    const tt = txt(String(total), W / 2, 195, { 'font-size': 34 });
    legenda(`${num === 1 && den === 2 ? 'A metade' : `${num}/${den}`} de ${total}`);
    return async (t) => {
      await dorme(300, t);
      r.remove(); tt.remove();
      const parts = barra(den, 70, 150, 500, 90, 0);
      for (let g = 0; g < den; g++) { txt(String(k), 70 + (g + 0.5) * 500 / den, 195, { 'font-size': den > 6 ? 22 : 30 }); await dorme(180, t); }
      for (let g = 0; g < num; g++) { parts[g].setAttribute('fill', 'rgba(0,230,118,.55)'); await dorme(250, t); }
      legenda(`${total} ÷ <<${den}>> = ${k} em cada parte. ${num} parte${num > 1 ? 's' : ''} = **${v}**`);
    };
  }
  function comparaFracoes(f) {
    const n = f.fracoes.length, h = Math.min(80, 300 / n - 20);
    const ys = f.fracoes.map((_, i) => 60 + i * (h + 50));
    f.fracoes.forEach(([p, q], i) => { barra(q, 70, ys[i], 460, h, p, i ? AZ : LAR); txt(`${p}/${q}`, 585, ys[i] + h / 2, { 'font-size': 26 }); });
    legenda('Qual é maior?');
    return async (t) => {
      let mx = -1, im = 0;
      for (const [i, [p, q]] of f.fracoes.entries()) { const x = 70 + 460 * p / q; el('line', { x1: x, y1: 40, x2: x, y2: ys.at(-1) + h + 20, stroke: i ? AZ : LAR, 'stroke-width': 4, 'stroke-dasharray': '8 6' }); if (p / q > mx) { mx = p / q; im = i; } await dorme(500, t); }
      el('rect', { x: 64, y: ys[im] - 6, width: 472, height: h + 12, fill: 'none', stroke: OURO, 'stroke-width': 5, rx: 6 });
      legenda(`O pedaço pintado de **${f.fracoes[im].join('/')}** é o maior`);
    };
  }
  function pizzaFig(f) {
    const fatias = pizza(f.n, W / 2, H / 2 + 4, 170);
    legenda(`Pizza com ${f.n} pedaços`);
    return async (t) => {
      for (let i = 0; i < f.comidos; i++) { fatias[i].setAttribute('fill', 'rgba(255,255,255,.08)'); legenda(`comi ${i + 1} de ${f.n}…`); await dorme(380, t); }
      legenda(`Comi [[${f.comidos}]] pedaços de <<${f.n}>>: **${f.comidos}/${f.n}**`);
    };
  }

  const TIPOS = { poligono, grade, triangulo_area: trianguloArea, paralelogramo, compara_area: comparaArea, medida, contar_lados: contarLados,
    angulo_reto: anguloReto, angulos, regua, barras_iguais: barrasIguais, simplificar, soma_fracao: somaFracao, parte_de: parteDe,
    compara_fracoes: comparaFracoes, pizza: pizzaFig };

  return {
    mostrar(fig) {
      F.token++; F.pausado = false; F.anim = null;
      limpar();
      const fn = TIPOS[fig?.tipo];
      if (!fn) return false;
      try { F.anim = fn(fig); } catch (e) { console.warn('[figuras] não deu para desenhar', fig, e); return false; }
      return true;
    },
    async animar() { const a = F.anim, t = ++F.token; F.pausado = false; F.anim = null; if (a) await a(t); },
    cancelar() { F.token++; F.pausado = false; },
    pausar(sim = !F.pausado) { F.pausado = sim; return F.pausado; },
  };
}
export const temFigura = (fig) => !!fig?.tipo;

// Jogo de Revisão — "Ilha dos Robôs" (PROMPT-60): o mapa das 25 fases do Programe o pet, em pé (9:16).
// Dados: dados/jogo/mapa-programe.json → regioes[] (cap, id, nome, chefe, medalha, tema { casa, obstaculo },
// fases [{ fase, x, y }] em frações da imagem) e especiais { desafio_dia, corrida }. Trocar só o JSON e as imagens
// (img/jogo/programe/…) muda o mapa: sem a imagem da ilha, o fundo é desenhado em CSS; sem a do chefe, aparece 🤖.
// O progresso, a liberação e a abertura das fases ficam no jogo-revisao.js (ctx, abaixo).

const $ = (id) => document.getElementById(id);
let C = null;     // ctx: { pet(), quadrosDe, sentadoNoQuadro, pintar, esc, caminho, fases(), progFase, faseLiberada, medalhas(),
                  //        abrirFase(id), abrirDia(), abrirFantasma(), aoSair() }
let M = null;     // mapa-programe.json
let tela = null;  // { pontos: [{ id, x, y, regiao, chefe }], petIdx, andando, timers }
let posPet = null;   // índice (na ordem das fases) onde o pet ficou da última vez (null = na última liberada)

export function configurarMapaPrograme(ctx, dados) { C = ctx; M = dados; }
export const temMapaPrograme = () => !!M?.regioes?.length;

// região de uma fase (ou null) e o tema do tabuleiro dela; desafio do dia e corrida usam o da 1ª região (a Vila)
export const regiaoDaFase = (id) => M?.regioes?.find(r => r.fases?.some(f => f.fase === id)) || null;
export const temaDaFase = (id) => regiaoDaFase(id)?.tema || null;
export const temaVila = () => M?.regioes?.[0]?.tema || null;
// a fase do chefe = a última fase da região (capítulo)
export function chefeDaFase(id) {
  const r = regiaoDaFase(id);
  return r && r.fases[r.fases.length - 1]?.fase === id ? r : null;
}

// imagens que podem ainda não existir: testa uma vez e guarda (true = carregou)
const imgOk = new Map();
export function imagemExiste(src) {
  if (!src) return Promise.resolve(false);
  if (!imgOk.has(src)) imgOk.set(src, new Promise(ok => { const i = new Image(); i.onload = () => ok(true); i.onerror = () => ok(false); i.src = src; }));
  return imgOk.get(src);
}

// ── Abrir / fechar ──
// andarAte: índice da fase para onde o pet anda ao abrir (sem abrir a fase); de: onde ele começa
export async function abrirMapaPrograme({ de = null, andarAte = null } = {}) {
  if (!M || !C) return;
  fecharMapaPrograme();
  const sec = $('pg-mapa');
  sec.hidden = false;
  const fases = C.fases();
  const pontos = [];
  for (const r of M.regioes) for (const p of r.fases || []) {
    const i = fases.findIndex(f => f.id === p.fase);
    if (i >= 0) pontos.push({ id: p.fase, i, x: p.x, y: p.y, regiao: r, chefe: r.fases[r.fases.length - 1] === p });
  }
  pontos.sort((a, b) => a.i - b.i);
  let ultimaLib = 0;
  pontos.forEach((p, k) => { if (C.faseLiberada(p.i)) ultimaLib = k; });
  const inicio = de ?? posPet ?? ultimaLib;
  tela = { pontos, ultimaLib, petIdx: Math.min(Math.max(0, inicio), pontos.length - 1), andando: false, timers: [], anim: 0 };
  desenharTopo();
  await desenharMapa();
  if (!tela) return;
  dimensionar();
  colocarPet(tela.petIdx, true);
  rolarAte(tela.petIdx, false);
  if (andarAte != null && andarAte !== tela.petIdx) { await esperar(350); if (tela) await andarPet(andarAte); }
}

export function fecharMapaPrograme() {
  $('pg-mapa').querySelectorAll('.pgm-tela-chefe').forEach(e => e.remove());
  if (!tela) { $('pg-mapa').hidden = true; return; }
  posPet = tela.petIdx;
  for (const t of tela.timers) clearTimeout(t);
  clearInterval(tela.anim);
  tela = null;
  $('pg-mapa').hidden = true;
  $('pgm-balao').hidden = true;
}
// voltou do computador: o pet aparece de novo na última liberada
export function esquecerPosicaoPet() { posPet = null; }

const esperar = (ms) => new Promise(ok => { const t = setTimeout(ok, ms); tela?.timers.push(t); });

// ── Topo: ✕, título, estrelas e as 6 medalhas (vazias em cinza) ──
function desenharTopo() {
  const fases = C.fases();
  const est = fases.reduce((t, f) => t + (Number(C.progFase(f.id)?.estrelas) || 0), 0);
  $('pgm-estrelas').textContent = `⭐ ${est}/${fases.length * 3}`;
  const med = C.medalhas();
  $('pgm-medalhas').innerHTML = M.regioes.map(r => `<span class="pgm-medalha${med[r.id] ? ' tem' : ''}" title="${C.esc(r.nome)}">${C.esc(r.medalha || '🏅')}</span>`).join('');
}

// ── Mapa: fundo, trilha, plaquinhas, chefes, bolinhas, 📅 e 🏁 ──
async function desenharMapa() {
  const [W, H] = M.tamanho || [1080, 1920];
  const palco = $('pgm-palco');
  palco.style.setProperty('--pgm-razao', `${W} / ${H}`);
  const fundo = C.caminho(M.imagem || '');
  const comImg = await imagemExiste(fundo);
  if (!tela) return;
  palco.classList.toggle('sem-imagem', !comImg);
  $('pgm-fundo').src = comImg ? fundo : '';
  $('pgm-fundo').hidden = !comImg;
  const { pontos, ultimaLib } = tela;
  // trilha: coordenadas em 0..1000 × 0..1000·H/W (o SVG estica junto com o palco)
  const vh = 1000 * H / W, px = (p) => `${(p.x * 1000).toFixed(1)},${(p.y * vh).toFixed(1)}`;
  const svg = $('pgm-trilha');
  svg.setAttribute('viewBox', `0 0 1000 ${vh.toFixed(1)}`);
  svg.innerHTML = `<polyline class="pgm-tr-base" points="${pontos.map(px).join(' ')}"/>` +
    (ultimaLib > 0 ? `<polyline class="pgm-tr-feita" points="${pontos.slice(0, ultimaLib + 1).map(px).join(' ')}"/>` : '');
  const med = C.medalhas(), pos = (x, y) => `left:${(x * 100).toFixed(2)}%;top:${(y * 100).toFixed(2)}%`;
  let html = '';
  // plaquinha com o nome da região: na posição do JSON (regiao.placa) ou, sem ela, perto da 1ª fase (arrumar() acha o lugar)
  for (const r of M.regioes) {
    const p = r.placa || r.fases?.[0];
    if (p) html += `<span class="pgm-placa" data-x="${p.x}" data-y="${p.y}"${r.placa ? ' data-fixa="1"' : ''} style="${pos(p.x, p.y)}"><span>${C.esc(r.nome)}</span></span>`;
  }
  // bolinhas: feita (verde, número e ★★☆), atual (dourada, pulsando), bloqueada (cinza, 🔒). Chefe (a última de cada região):
  // 1,5× maior, vinho com borda dourada e coroa. Os robôs não ficam no mapa: só aparecem na tela do chefe.
  pontos.forEach((p, k) => {
    const est = Number(C.progFase(p.id)?.estrelas) || 0, lib = C.faseLiberada(p.i);
    const cls = est ? 'feita' : lib ? 'liberada' : 'bloqueada';
    html += `<button class="pgm-fase ${cls}${p.chefe ? ' chefe' : ''}" data-pgm-fase="${k}" style="${pos(p.x, p.y)}"
      aria-label="Fase ${p.id}${p.chefe ? ' (chefe)' : ''}${lib ? '' : ' (bloqueada)'}">${p.chefe ? COROA : ''}<span class="pgm-num">${lib || est ? p.id : '🔒'}</span>${
      est ? `<span class="pgm-est">${'★'.repeat(est)}<i>${'★'.repeat(3 - est)}</i></span>` : ''}</button>`;
  });
  const esp = M.especiais || {};
  if (esp.desafio_dia) html += `<button class="pgm-especial" data-pgm-dia style="${pos(esp.desafio_dia.x, esp.desafio_dia.y)}" aria-label="Desafio do dia">${C.esc(esp.desafio_dia.emoji || '📅')}<small>Desafio</small></button>`;
  if (esp.corrida) html += `<button class="pgm-especial" data-pgm-corrida style="${pos(esp.corrida.x, esp.corrida.y)}" aria-label="Corrida contra o fantasma">${C.esc(esp.corrida.emoji || '🏁')}<small>Corrida</small></button>`;
  html += '<img class="pgm-pet" id="pgm-pet" alt="" draggable="false" hidden/>';
  $('pgm-itens').innerHTML = html;
}

const COROA = '<svg class="pgm-coroa" viewBox="0 0 24 16" aria-hidden="true"><path d="M2 14 1 3l6 5 5-7 5 7 6-5-1 11z"/><circle cx="1" cy="3" r="1.4"/><circle cx="12" cy="1.2" r="1.4"/><circle cx="23" cy="3" r="1.4"/></svg>';
// em pé: largura da tela (rola na vertical); deitado ou no computador: altura da tela, centralizado
function dimensionar() {
  const sc = $('pgm-scroll'), palco = $('pgm-palco');
  if (!sc || !tela) return;
  const [W, H] = M.tamanho || [1080, 1920];
  const vw = sc.clientWidth, vh = sc.clientHeight;
  let w = vw, h = vw * H / W;
  if (vw > vh) { h = vh; w = vh * W / H; }
  palco.style.width = Math.floor(w) + 'px';
  palco.style.height = Math.floor(h) + 'px';
  // bolinha ≈ 4% da largura do mapa (no celular em pé, ~26–30 px); a área de toque é maior (CSS, ::before de 40 px)
  tela.b = Math.round(Math.max(20, w * 0.04));
  palco.style.setProperty('--pgm-b', tela.b + 'px');
  arrumar(Math.floor(w), Math.floor(h));
  colocarPet(tela.petIdx, true);
}

// ── Lugar livre: plaquinhas, chefes e o pet vão para o lado da bolinha onde tapam menos coisas ──
// obstáculos: círculos { x, y, r } (bolinhas) e retângulos { x0, y0, x1, y1 } (ícones, plaquinhas e chefes já postos)
function folga(ret, obst, w, h) {
  let min = Math.min(ret.x0, ret.y0, w - ret.x1, h - ret.y1) + 6;   // sair do mapa conta como tapar
  for (const o of obst) {
    let d;
    if (o.r != null) {
      const dx = Math.max(ret.x0 - o.x, 0, o.x - ret.x1), dy = Math.max(ret.y0 - o.y, 0, o.y - ret.y1);
      d = Math.hypot(dx, dy) - o.r;
    } else {
      const dx = Math.max(o.x0 - ret.x1, ret.x0 - o.x1), dy = Math.max(o.y0 - ret.y1, ret.y0 - o.y1);
      d = dx > 0 && dy > 0 ? Math.hypot(dx, dy) : Math.max(dx, dy);
    }
    if (d < min) min = d;
  }
  return min;
}
const retDe = (cx, cy, rw, rh) => ({ x0: cx - rw / 2, y0: cy - rh / 2, x1: cx + rw / 2, y1: cy + rh / 2 });
function melhorLugar(cx, cy, rw, rh, dist, obst, w, h) {
  let melhor = null;
  for (let a = 0; a < 16; a++) {          // 16 direções em volta do ponto, em 2 distâncias
    for (const k of [1, 1.45]) {
      const ang = a * Math.PI / 8;
      const x = cx + Math.cos(ang) * (dist + rw / 2) * k, y = cy + Math.sin(ang) * (dist + rh / 2) * k;
      const r = retDe(x, y, rw, rh), f = folga(r, obst, w, h) - (k > 1 ? 4 : 0);   // perto da bolinha é melhor, se couber
      if (!melhor || f > melhor.f) melhor = { x, y, f, r };
    }
  }
  return melhor;
}
function arrumar(w, h) {
  const itens = $('pgm-itens'), b = tela.b, obst = [];
  for (const p of tela.pontos) obst.push({ x: p.x * w, y: p.y * h, r: b / 2 + 3 });
  for (const e of itens.querySelectorAll('.pgm-especial')) {
    const x = parseFloat(e.style.left) / 100 * w, y = parseFloat(e.style.top) / 100 * h;
    obst.push(retDe(x, y, 56, 56));
  }
  const colocar = (el, rw, rh, dist) => {
    const cx = Number(el.dataset.x) * w, cy = Number(el.dataset.y) * h;
    const m = el.dataset.fixa ? { x: cx, y: cy } : melhorLugar(cx, cy, rw, rh, dist, obst, w, h);
    // nunca sai do mapa: encostou na borda, empurra para dentro
    m.x = Math.max(rw / 2 + 4, Math.min(w - rw / 2 - 4, m.x));
    m.y = Math.max(rh / 2 + 4, Math.min(h - rh / 2 - 4, m.y));
    el.style.left = m.x + 'px'; el.style.top = m.y + 'px';
    obst.push(retDe(m.x, m.y, rw, rh));
  };
  for (const el of itens.querySelectorAll('.pgm-placa')) colocar(el, el.offsetWidth || 120, el.offsetHeight || 20, b / 2 + 4);
  tela.obst = obst;
}
window.addEventListener('resize', () => { if (tela) dimensionar(); });

function rolarAte(k, suave = true) {
  const p = tela?.pontos[k], sc = $('pgm-scroll');
  if (!p) return;
  const top = p.y * $('pgm-palco').clientHeight - sc.clientHeight / 2;
  sc.scrollTo({ top: Math.max(0, top), behavior: suave ? 'smooth' : 'auto' });
}

// ── Pet: sentado EM CIMA da bolinha da fase atual (pés no centro dela); anda pela trilha de bolinha em bolinha (~250 ms por trecho) ──
// Altura do desenho sentado ≈ 1,8 × a bolinha de chefe (1,5 × a bolinha), vezes a escala do pet (PROMPT-63)
const PET_SOBRE_CHEFE = 1.8, CHEFE_MAIOR = 1.5;
function colocarPet(k, sem = false) {
  const img = $('pgm-pet'), info = C.pet();
  if (!img || !tela) return;
  if (!info) { img.hidden = true; return; }
  const forma = info.forma || info.pet;
  if (!img.dataset.pronto) {
    img.dataset.pronto = '1';
    img.src = C.quadrosDe(forma, 'sentado_girando')[0] || '';
    C.pintar(img, info);
  }
  // PROMPT-138: na Ilha a escala vai no máximo até 1 (o vermelho adulto, 1,75, cobria as fases); o azul adulto (0,75) fica menor
  const esc = Math.min(1, C.escalaPet?.(forma) || 1);
  const b = tela.b || 28, sentado = b * CHEFE_MAIOR * PET_SOBRE_CHEFE * esc;
  img.style.height = Math.round(sentado / (C.sentadoNoQuadro(forma) || 0.86)) + 'px';   // altura do QUADRO (o desenho sentado é parte dele)
  img.hidden = false;
  const p = tela.pontos[k];
  if (!p) return;
  img.style.transition = sem ? 'none' : '';
  img.style.left = `${(p.x * 100).toFixed(2)}%`;   // o img fica ancorado nos pés (translate -50%, -100%)
  img.style.top = `${(p.y * 100).toFixed(2)}%`;
}

async function andarPet(alvo) {
  if (!tela || tela.andando) return;
  const img = $('pgm-pet'), info = C.pet();
  if (!info || !img || img.hidden) { tela.petIdx = alvo; return; }
  const forma = info.forma || info.pet;
  tela.andando = true;
  const passo = alvo > tela.petIdx ? 1 : -1;
  let q = 0, lista = [];
  clearInterval(tela.anim);
  tela.anim = setInterval(() => { if (lista.length) { q = (q + 1) % lista.length; img.src = lista[q]; } }, 110);
  while (tela && tela.petIdx !== alvo) {
    const a = tela.pontos[tela.petIdx], b = tela.pontos[tela.petIdx + passo];
    const pw = $('pgm-palco').clientWidth, ph = $('pgm-palco').clientHeight;
    const dx = (b.x - a.x) * pw, dy = (b.y - a.y) * ph;
    const anim = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'andar_direita' : 'andar_esquerda') : (dy > 0 ? 'andar_frente' : 'andar_costas');
    lista = C.quadrosDe(forma, anim); q = 0; img.src = lista[0] || img.src;
    tela.petIdx += passo;
    colocarPet(tela.petIdx);
    rolarAte(tela.petIdx);
    await esperar(260);
  }
  if (!tela) return;
  clearInterval(tela.anim);
  img.src = C.quadrosDe(forma, 'sentado_girando')[0] || img.src;
  tela.andando = false;
}

// balão perto de uma bolinha ("Termine a fase N primeiro!")
function balao(k, texto) {
  const b = $('pgm-balao'), p = tela?.pontos[k];
  if (!p) return;
  b.textContent = texto;
  b.style.left = `${(p.x * 100).toFixed(2)}%`;
  b.style.top = `${(p.y * 100).toFixed(2)}%`;
  b.classList.toggle('esq', p.x > 0.6); b.classList.toggle('dir', p.x < 0.4);
  b.hidden = false;
  clearTimeout(tela.tBalao);
  tela.tBalao = setTimeout(() => { b.hidden = true; }, 1800);
}

async function tocouFase(k) {
  if (!tela || tela.andando) return;
  const p = tela.pontos[k];
  if (!C.faseLiberada(p.i)) {
    const ant = tela.pontos[tela.ultimaLib];
    balao(k, `Termine a fase ${ant?.id ?? 1} primeiro!`);
    return;
  }
  await andarPet(k);
  if (!tela) return;
  const id = p.id;
  if (p.chefe && !(await telaDoChefe(p))) return;   // "Agora não": continua no mapa
  if (!tela) return;
  fecharMapaPrograme();
  C.abrirFase(id);
}

// ── ⚔️ Tela do chefe: antes da fase de chefe, por cima do mapa. Promise: true = aceitou o desafio ──
async function telaDoChefe(p) {
  const r = p.regiao, fase = C.fases().find(f => f.id === p.id), meta = Number(fase?.meta_blocos) || 0;
  const vencido = !!C.medalhas()[r.id];
  const src = C.caminho(r.chefe || ''), temImg = await imagemExiste(src);
  if (!tela) return false;
  const nome = C.esc(r.chefe_nome || 'Chefe');
  const fala = C.esc(String(r.chefe_fala || 'Duvido você chegar na comida com {meta} blocos ou menos!').replace(/\{meta\}/g, meta || '?'));
  const estrelas = vencido ? Array.from({ length: 8 }, (_, i) => `<i style="--a:${i * 45}deg">⭐</i>`).join('') : '';
  return new Promise(ok => {
    const el = document.createElement('div');
    el.className = 'pgm-tela-chefe';
    el.innerHTML = `<div class="pgm-tc-caixa" role="dialog" aria-label="Chefe ${daRegiao(r)}">
      <b class="pgm-tc-tit">⚔️ Chefe ${daRegiao(r)}</b>
      <div class="pgm-tc-rosto${vencido ? ' vencido' : ''}">${temImg ? `<img src="${src}" alt="" draggable="false"/>` : '<b>🤖</b>'}${estrelas ? `<span class="pgm-tc-estrelas">${estrelas}</span>` : ''}</div>
      <b class="pgm-tc-nome">${nome}</b>
      ${vencido ? `<p class="pgm-tc-ja">Você já venceu o ${nome}! Quer melhorar as estrelas?</p>` : `<p class="pgm-tc-fala">${fala}</p>`}
      <p class="pgm-tc-meta">Fase ${p.id} · Meta ⭐⭐⭐: até ${meta || '?'} blocos</p>
      <div class="pgm-tc-botoes"><button class="jr-btn jr-btn-ouro" data-aceitar>⚔ Aceitar desafio</button><button class="jr-btn jr-btn-sec" data-nao>Agora não</button></div>
    </div>`;
    $('pg-mapa').appendChild(el);
    const fim = (sim) => { el.remove(); ok(sim); };
    el.querySelector('[data-aceitar]').addEventListener('click', () => fim(true));
    el.querySelector('[data-nao]').addEventListener('click', () => fim(false));
    el.addEventListener('click', (e) => { if (e.target === el) fim(false); });   // tocar fora = agora não
  });
}

export function ligarMapaPrograme() {
  $('pgm-sair').addEventListener('click', () => { fecharMapaPrograme(); esquecerPosicaoPet(); C.aoSair?.(); });
  $('pgm-itens').addEventListener('click', (e) => {
    const f = e.target.closest('[data-pgm-fase]');
    if (f) { tocouFase(Number(f.dataset.pgmFase)); return; }
    if (tela?.andando) return;
    if (e.target.closest('[data-pgm-dia]')) { fecharMapaPrograme(); C.abrirDia(); return; }
    if (e.target.closest('[data-pgm-corrida]')) { fecharMapaPrograme(); C.abrirFantasma(); }
  });
}

// ── Chefe: balão antes do cartão do capítulo, e a vitória (explode em estrelas + medalha) ──
// Os dois aparecem por cima da tela do Programe o pet (#programe); a Promise resolve quando o aluno toca em OK.
function cartaoChefe(html, classe = '') {
  return new Promise(ok => {
    const el = document.createElement('div');
    el.className = 'pgm-chefe-cartao ' + classe;
    el.innerHTML = `<div class="pgm-cc-caixa">${html}<button class="jr-btn jr-btn-ouro" data-ok>OK!</button></div>`;
    ($('programe') && !$('programe').hidden ? $('programe') : document.getElementById('jr-app')).appendChild(el);
    el.querySelector('[data-ok]').addEventListener('click', () => { el.remove(); ok(); });
  });
}
async function rostoChefe(r) {
  const src = C.caminho(r?.chefe || '');
  return (await imagemExiste(src)) ? `<img class="pgm-cc-img" src="${src}" alt="" draggable="false"/>` : '<b class="pgm-cc-emoji">🤖</b>';
}
// "da Vila dos Passos", "do Laboratório F1" (o JSON pode dizer: regiao.de = "do")
const daRegiao = (r) => `${r.de || (/o$/i.test(String(r.nome).split(' ')[0]) ? 'do' : 'da')} ${C.esc(r.nome)}`;
export async function medalhaDoChefe(r) {
  const estrelas = Array.from({ length: 12 }, (_, i) => `<i style="--a:${i * 30}deg">⭐</i>`).join('');
  await cartaoChefe(`<div class="pgm-cc-rosto explode">${await rostoChefe(r)}<span class="pgm-cc-estrelas">${estrelas}</span></div>
    <div class="pgm-cc-medalha">${C.esc(r.medalha || '🏅')}</div>
    <p class="pgm-cc-tit">🏅 Medalha ${daRegiao(r)}!</p>`, 'vitoria');
}

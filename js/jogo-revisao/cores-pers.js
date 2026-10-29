// ============================================================
//  🎨 CORES DO PERSONAGEM (PROMPT-158) — cabelo e blusa escolhidos no guarda-roupa
//  Cada quadro <personagem>/<quadro>.webp tem a máscara <personagem>/cores/<quadro>.png: canal R = cabelo (no menino de
//  boné, o boné), canal G = blusa (na menina de tranças, a jaqueta), preto = não muda. A cor nova segue a luz do desenho
//  (p5..p95 da luminância dos pixels da máscara, naquele quadro) e o resultado fica em cache como objectURL.
//  Enquanto pinta, devolve o .webp com um #fragmento (o navegador usa a mesma imagem); ao terminar, as <img> com esse
//  endereço trocam sozinhas para a pintada (os bustos em HTML também).
// ============================================================
export const CORES_CABELO = {
  preto: ['#141414', '#2b2b30', '#55575e'], castanho: ['#3a2214', '#6b4226', '#a3703f'], loiro: ['#8a5f1e', '#d9a83e', '#f6dc84'],
  ruivo: ['#5e1d0e', '#b4431d', '#ec8a46'], grisalho: ['#4d4d52', '#9a9aa0', '#e4e4e8'],
  azul: ['#0f2a63', '#2e64d6', '#7fb0ff'], rosa: ['#6b1a46', '#e0529c', '#ffaad3'], roxo: ['#2f1561', '#7442c9', '#b996ff'], verde: ['#0d4024', '#2c9a52', '#85e09e'] };
export const CORES_DIVERTIDAS = ['azul', 'rosa', 'roxo', 'verde'];   // 50 🪙 cada; compradas valem para todos os personagens
export const PRECO_COR_DIVERTIDA = 50;
export const CORES_BLUSA = { vermelho: '#d64545', laranja: '#f08a24', amarelo: '#f2c232', verde: '#2f9d55', azul: '#2d6cdf', roxo: '#7a4bd1', rosa: '#e45a9c', branco: '#eeeeee', preto: '#2a2d31' };
export const NOME_COR = { original: 'original', preto: 'preto', castanho: 'castanho', loiro: 'loiro', ruivo: 'ruivo', grisalho: 'grisalho', azul: 'azul', rosa: 'rosa',
  roxo: 'roxo', verde: 'verde', vermelho: 'vermelho', laranja: 'laranja', amarelo: 'amarelo', branco: 'branco' };

const hexRgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
// blusa: escuro = cor × 0,42; meio = cor; claro = cor × 0,55 + 255 × 0,45
const paletaBlusa = (h) => { const c = hexRgb(h); return [c.map(v => v * 0.42), c, c.map(v => v * 0.55 + 255 * 0.45)]; };
const PALETAS = { cabelo: Object.fromEntries(Object.entries(CORES_CABELO).map(([k, p]) => [k, p.map(hexRgb)])),
  blusa: Object.fromEntries(Object.entries(CORES_BLUSA).map(([k, h]) => [k, paletaBlusa(h)])) };

// id desconhecido vira original
export function coresValidas(c) {
  const cabelo = c && CORES_CABELO[c.cabelo] ? c.cabelo : 'original', blusa = c && CORES_BLUSA[c.blusa] ? c.blusa : 'original';
  return { cabelo, blusa };
}
export const semCor = (c) => { const v = coresValidas(c); return v.cabelo === 'original' && v.blusa === 'original'; };

const cache = new Map();   // chave → objectURL (pronto) | base (sem máscara) | null (pintando)
const fila = [];
let pintando = 0, trocas = [];
const MAX_JUNTOS = 3;

// pasta/id/quadro.webp com as cores (sem cor: o .webp de sempre)
export function urlSprite(pasta, id, quadro, cores) {
  const base = `${pasta}/${id}/${quadro}.webp`, c = coresValidas(cores);
  if (c.cabelo === 'original' && c.blusa === 'original') return base;
  const k = `${id}/${quadro}|${c.cabelo}|${c.blusa}`, v = cache.get(k), prov = `${base}#${c.cabelo}.${c.blusa}`;
  if (v) return v;
  if (v === undefined) { cache.set(k, null); fila.push({ k, base, mask: `${pasta}/${id}/cores/${quadro}.png`, c, prov }); proximo(); }
  return prov;
}

function proximo() {
  while (pintando < MAX_JUNTOS && fila.length) {
    const t = fila.shift();
    pintando++;
    pintar(t).catch(() => t.base).then(url => {
      cache.set(t.k, url);
      trocas.push([t.prov, url]);
      if (trocas.length === 1) requestAnimationFrame(trocarProvisorias);
    }).finally(() => { pintando--; proximo(); });
  }
}
// as <img> que estão com o endereço provisório passam para a pintada
function trocarProvisorias() {
  const m = new Map(trocas);
  trocas = [];
  for (const img of document.getElementsByTagName('img')) {
    const u = m.get(img.getAttribute('src'));
    if (u) img.src = u;
  }
}

const carregar = (src) => new Promise((ok, erro) => { const im = new Image(); im.onload = () => ok(im); im.onerror = erro; im.src = src; });

async function pintar({ base, mask, c }) {
  const [im, mk] = await Promise.all([carregar(base), carregar(mask)]);   // sem máscara: cai no catch e usa o .webp
  const w = im.naturalWidth, h = im.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(mk, 0, 0, w, h);
  const m = g.getImageData(0, 0, w, h).data;
  g.clearRect(0, 0, w, h);
  g.drawImage(im, 0, 0);
  const dados = g.getImageData(0, 0, w, h), px = dados.data;
  const L = new Float32Array(w * h);
  for (let i = 0, j = 0; j < L.length; i += 4, j++) L[j] = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
  for (const [parte, canal] of [['cabelo', 0], ['blusa', 1]]) {
    const pal = PALETAS[parte][c[parte]];
    if (!pal) continue;
    const peso = (i) => (m[i + canal] / 255) * (m[i + 3] / 255) * (px[i + 3] > 0 ? 1 : 0);
    // p5 e p95 da luminância só nos pixels desta máscara
    const hist = new Uint32Array(256);
    let n = 0;
    for (let i = 0, j = 0; j < L.length; i += 4, j++) if (peso(i) >= 0.5) { hist[Math.round(L[j] * 255)]++; n++; }
    if (!n) continue;
    const perc = (p) => { let s = 0; const alvo = n * p; for (let b = 0; b < 256; b++) { s += hist[b]; if (s >= alvo) return b / 255; } return 1; };
    const p5 = perc(0.05), p95 = perc(0.95), faixa = p95 - p5;
    const [es, me, cl] = pal;
    for (let i = 0, j = 0; j < L.length; i += 4, j++) {
      const a = peso(i);
      if (!a) continue;
      const l = L[j];
      let cor;
      if (l < p5) { const k = p5 > 0 ? l / p5 : 0; cor = [es[0] * k, es[1] * k, es[2] * k]; }   // contornos continuam escuros
      else {
        const t = faixa > 1e-3 ? Math.min(1, Math.max(0, (l - p5) / faixa)) : 0.5;
        const [x, y, u] = t < 0.5 ? [es, me, t * 2] : [me, cl, (t - 0.5) * 2];
        cor = [x[0] + (y[0] - x[0]) * u, x[1] + (y[1] - x[1]) * u, x[2] + (y[2] - x[2]) * u];
      }
      px[i] = px[i] * (1 - a) + cor[0] * a; px[i + 1] = px[i + 1] * (1 - a) + cor[1] * a; px[i + 2] = px[i + 2] * (1 - a) + cor[2] * a;   // a transparência fica a original
    }
  }
  g.putImageData(dados, 0, 0);
  const blob = await new Promise(ok => cv.toBlob(ok, 'image/png'));
  return blob ? URL.createObjectURL(blob) : base;
}

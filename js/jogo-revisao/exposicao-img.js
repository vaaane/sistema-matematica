// Jogo de Revisão — Exposição Virtual (PROMPT-EXPOSICAO-2): fotos dos alunos e molduras com a área verde (#00FF00).
//   prepararFoto(file) → { dados (dataURL WebP ou JPEG), bytes }: orientação EXIF corrigida, até 1000 px no lado maior,
//     qualidade ~0,75; acima de 300 KB (ou do limite da regra do banco) reduz mais.
//   analisarMoldura(src) → { frame (URL da moldura com o verde transparente), areas: [{ x, y, w, h (frações), mask (URL) }] }:
//     cada área verde, da esquerda para a direita (o varal tem 4). Calculado uma vez por imagem (cache).
// Tudo no navegador, sem dependências.

const LADO_FOTO = 1000;
const MAX_BYTES = 300 * 1024;
const MAX_CHARS = 400000;   // .validate de exposicao_imagens/{id}/dados

// a imagem já desenhada na orientação certa (createImageBitmap com imageOrientation; senão um <img>, que os navegadores
// atuais também desenham pela orientação EXIF)
async function abrirImagem(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (_) { /* formato que o bitmap não lê */ }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((ok, erro) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => erro(new Error('imagem')); im.src = url; });
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
const tamanhoDe = (im) => [im.naturalWidth || im.width, im.naturalHeight || im.height];
const bytesDe = (dataURL) => Math.round((dataURL.length - dataURL.indexOf(',') - 1) * 3 / 4);

let webpOk = null;   // o Safari antigo não gera WebP (toDataURL devolve PNG): aí vai JPEG
function formato() {
  if (webpOk === null) { const c = document.createElement('canvas'); c.width = c.height = 1; webpOk = c.toDataURL('image/webp', 0.5).startsWith('data:image/webp'); }
  return webpOk ? 'image/webp' : 'image/jpeg';
}

export async function prepararFoto(file, { lado = LADO_FOTO, maxBytes = MAX_BYTES, maxChars = MAX_CHARS } = {}) {
  const im = await abrirImagem(file), [w0, h0] = tamanhoDe(im);
  if (!w0 || !h0) throw new Error('imagem vazia');
  const tipo = formato();
  let l = Math.min(lado, Math.max(w0, h0)), q = 0.75, dados = '';
  for (let tentativa = 0; tentativa < 12; tentativa++) {
    const k = l / Math.max(w0, h0), w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    if (tipo === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }   // PNG transparente → fundo branco
    ctx.drawImage(im, 0, 0, w, h);
    dados = cv.toDataURL(tipo, q);
    if (bytesDe(dados) <= maxBytes && dados.length <= maxChars) break;
    if (q > 0.55) q -= 0.1; else l *= 0.8;   // primeiro a qualidade, depois o tamanho
  }
  im.close?.();
  return { dados, bytes: bytesDe(dados) };
}

// ── molduras ────────────────────────────────────────────────
const cache = new Map();   // src → Promise<{ frame, areas }>
const ehVerde = (r, g, b) => g > 140 && g - r > 70 && g - b > 70;

export function analisarMoldura(src, maxLado = 1000) {
  if (!cache.has(src)) cache.set(src, calcular(src, maxLado).catch(() => ({ frame: src, areas: [] })));
  return cache.get(src);
}

async function calcular(src, maxLado) {
  const im = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => erro(new Error(src)); i.src = src; });
  const k = Math.min(1, maxLado / Math.max(im.naturalWidth, im.naturalHeight));
  const W = Math.max(1, Math.round(im.naturalWidth * k)), H = Math.max(1, Math.round(im.naturalHeight * k));
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(im, 0, 0, W, H);
  const dado = ctx.getImageData(0, 0, W, H), px = dado.data, N = W * H;
  // 1) o verde, com 1 px a mais em volta (a borda suavizada da área também some debaixo da foto)
  const verde = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (px[i * 4 + 3] > 40 && ehVerde(px[i * 4], px[i * 4 + 1], px[i * 4 + 2])) verde[i] = 1;
  const mask = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (verde[i] || (x > 0 && verde[i - 1]) || (x < W - 1 && verde[i + 1]) || (y > 0 && verde[i - W]) || (y < H - 1 && verde[i + W])) mask[i] = 1;
  }
  // 2) cada área verde separada (4 vizinhos), da esquerda para a direita; as muito pequenas são ruído
  const rot = new Int32Array(N).fill(-1), comps = [];
  for (let i0 = 0; i0 < N; i0++) {
    if (!mask[i0] || rot[i0] >= 0) continue;
    const c = { x0: W, y0: H, x1: 0, y1: 0, n: 0, id: comps.length }, pilha = [i0];
    rot[i0] = c.id;
    while (pilha.length) {
      const i = pilha.pop(), x = i % W, y = (i - x) / W;
      c.n++; if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1])
        if (j >= 0 && mask[j] && rot[j] < 0) { rot[j] = c.id; pilha.push(j); }
    }
    comps.push(c);
  }
  const areas = comps.filter(c => c.n > N * 0.002).sort((a, b) => a.x0 - b.x0);
  // 3) a moldura: o verde fica transparente; nos pixels esverdeados da borda, tira o verde (sem halo)
  for (let i = 0; i < N; i++) {
    if (mask[i]) { px[i * 4 + 3] = 0; continue; }
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2], m = Math.max(r, b);
    if (g > m + 30) px[i * 4 + 1] = m;
  }
  ctx.putImageData(dado, 0, 0);
  const frame = await paraUrl(cv);
  // 4) uma máscara (branca onde é a área) para cada uma, recortada no retângulo dela
  const lista = [];
  for (const c of areas) {
    const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1, mc = document.createElement('canvas');
    mc.width = w; mc.height = h;
    const mx = mc.getContext('2d'), md = mx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (rot[(c.y0 + y) * W + c.x0 + x] !== c.id) continue;
      const o = (y * w + x) * 4;
      md.data[o] = md.data[o + 1] = md.data[o + 2] = 255; md.data[o + 3] = 255;
    }
    mx.putImageData(md, 0, 0);
    lista.push({ x: c.x0 / W, y: c.y0 / H, w: w / W, h: h / H, mask: await paraUrl(mc) });
  }
  return { frame, areas: lista };
}
const paraUrl = (cv) => new Promise(ok => {
  if (!cv.toBlob) { ok(cv.toDataURL('image/png')); return; }
  cv.toBlob(b => ok(b ? URL.createObjectURL(b) : cv.toDataURL('image/png')), 'image/png');
});

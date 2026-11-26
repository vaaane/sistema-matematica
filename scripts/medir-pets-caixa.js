// ⚔️ PROMPT-280: gera dados/jogo/pets-caixa.json — a caixa do desenho (parte não transparente) de cada animação de cada pet,
// medida UMA vez aqui (nunca durante o jogo). Rodar no console do site (com o servidor local):
//   const m = await import('/scripts/medir-pets-caixa.js'); copy(JSON.stringify(await m.medirPetsCaixa()));
// e colar o resultado em dados/jogo/pets-caixa.json.
//
// Formato: { v, formas: { forma: { q: [w, h], a: { anim: [x0, x1, y0, y1, (o 1º quadro, se a animação tiver mais de um:) x0, x1, y0, y1] } } } }
//   - frações do quadro normal da forma (tamanho_quadro): x da esquerda, y de cima; y1 = a base do desenho (os pés).
//   - quadros mais altos que o normal (o ataque do elefante adulto, 700 em vez de 566) ficam alinhados pela base e com a mesma
//     largura: o y0 deles sai negativo (acima do topo do quadro normal).
//   - a caixa de uma animação é a união dos quadros dela.
//   - as cores ({pet}_{cor}, {pet}_adulto_{cor}, os dragões coloridos) têm o mesmo desenho do pet: só a forma base é medida.
import { carregarSprites, quadrosDe, tamanhoQuadro, petDaCor, adultoDaCor } from '/js/jogo-revisao/pets.js';

const base = (f) => petDaCor(f) || adultoDaCor(f) || String(f)
  .replace(/^dragao_vermelho_(?!adulto$)[a-z]+(?=(_adulto)?$)/, 'dragao_vermelho')
  .replace(/^dragao_(?!azul|vermelho)[a-z]+(?=(_adulto)?$)/, 'dragao_azul');

function caixaDe(src) {
  return new Promise((ok) => {
    const im = new Image();
    im.onload = () => {
      try {
        const w = 240, h = Math.max(1, Math.round(w * im.naturalHeight / im.naturalWidth));
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const cx = cv.getContext('2d', { willReadFrequently: true });
        cx.drawImage(im, 0, 0, w, h);
        const d = cx.getImageData(0, 0, w, h).data;
        let x0 = w, x1 = -1, y0 = h, y1 = -1;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        ok(x1 < 0 ? null : { x0: x0 / w, x1: (x1 + 1) / w, y0: y0 / h, y1: (y1 + 1) / h, ar: im.naturalHeight / im.naturalWidth });
      } catch { ok(null); }
    };
    im.onerror = () => ok(null);
    im.src = src;
  });
}

const r3 = (n) => Math.round(n * 1000) / 1000;

export async function medirPetsCaixa() {
  const S = await carregarSprites();
  const formas = [...new Set(Object.keys(S.pets).map(base))].filter(f => S.pets[f]).sort();
  const out = {};
  for (const f of formas) {
    const [qw, qh] = tamanhoQuadro(f), arQ = qh / qw, a = {};
    for (const anim of Object.keys(S.pets[f])) {
      const todas = await Promise.all([...new Set(quadrosDe(f, anim))].map(caixaDe)), cs = todas.filter(Boolean);
      if (!cs.length) continue;
      // para o quadro normal: mesma largura, base alinhada → y' = 1 − (1 − y) × (altura relativa do quadro)
      const y = (v, ar) => 1 - (1 - v) * ar / arQ;
      a[anim] = [r3(Math.min(...cs.map(c => c.x0))), r3(Math.max(...cs.map(c => c.x1))),
        r3(Math.min(...cs.map(c => y(c.y0, c.ar)))), r3(Math.max(...cs.map(c => y(c.y1, c.ar))))];
      // a imagem parada de uma animação (o 1º quadro: duelo em equipe, cartões) pode ser menor que a união: vai junto, nas posições 4 a 7
      const q1 = todas[0];
      if (cs.length > 1 && q1) a[anim].push(r3(q1.x0), r3(q1.x1), r3(y(q1.y0, q1.ar)), r3(y(q1.y1, q1.ar)));
    }
    out[f] = { q: [qw, qh], a };
  }
  return { v: 1, gerado: new Date().toISOString().slice(0, 10), formas: out };
}

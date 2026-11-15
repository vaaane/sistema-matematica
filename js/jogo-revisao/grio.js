// 🎙️ Griô da Exposição (PROMPT-234): o áudio gravado pelo grupo e a legenda de cada sala.
//   audio/exposicao/sala_{n}.mp3                 o áudio (sem ele, a sala não tem griô)
//   dados/exposicao/legendas/sala_{n}.vtt        a legenda com os tempos (se existir, vale ela)
//   dados/exposicao/legendas/sala_{n}.txt        uma frase por linha: o tempo de cada uma sai da duração do áudio,
//                                                dividida pelo número de letras de cada linha
// Usado pelo jogo (js/jogo-revisao.js) e pela página da professora (professor/p-exposicao.html).

export const srcAudioGrio = (n) => `/audio/exposicao/sala_${n}.mp3`;
const srcLegenda = (n, ext) => `/dados/exposicao/legendas/sala_${n}.${ext}`;

// O Cloudflare Pages responde 200 com o index.html quando o arquivo não existe: além do ok, confere que não veio HTML.
async function existe(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    return r.ok && !(r.headers.get('content-type') || '').toLowerCase().includes('text/html');
  } catch (_) { return false; }
}
async function lerTexto(url) {
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok || (r.headers.get('content-type') || '').toLowerCase().includes('text/html')) return null;
    const t = await r.text();
    return /^\s*(<!doctype|<html)/i.test(t) ? null : t.replace(/^﻿/, '');
  } catch (_) { return null; }
}

export const temAudioGrio = (n) => existe(srcAudioGrio(n));

// "00:01:02.500" ou "01:02.500" (vírgula também) → segundos
const segundos = (s) => {
  const p = String(s).trim().replace(',', '.').split(':').map(Number);
  if (p.some(x => !Number.isFinite(x))) return NaN;
  return p.reduce((t, x) => t * 60 + x, 0);
};
// WebVTT → [{ ini, fim, txt }] (as linhas de texto de cada bloco viram uma frase; tags como <i> saem)
export function lerVtt(t) {
  const frases = [];
  for (const bloco of String(t || '').replace(/\r/g, '').split(/\n{2,}/)) {
    const ls = bloco.split('\n'), i = ls.findIndex(l => l.includes('-->'));
    if (i < 0) continue;
    const [a, b] = ls[i].split('-->'), ini = segundos(a), fim = segundos(String(b).trim().split(/\s+/)[0]);
    const txt = ls.slice(i + 1).join(' ').replace(/<[^>]*>/g, '').trim();
    if (Number.isFinite(ini) && Number.isFinite(fim) && fim > ini && txt) frases.push({ ini, fim, txt });
  }
  return frases.sort((x, y) => x.ini - y.ini);
}
// .txt: o tempo de cada linha é proporcional ao número de letras dela (espaços não contam)
export function tempoDasLinhas(linhas, duracao) {
  const pesos = linhas.map(l => Math.max(1, l.replace(/\s+/g, '').length)), total = pesos.reduce((a, b) => a + b, 0);
  let t = 0;
  return linhas.map((txt, i) => { const ini = t; t += duracao * pesos[i] / total; return { ini, fim: t, txt }; });
}
// { tipo: 'vtt', frases } | { tipo: 'txt', linhas } | null
export async function legendaGrio(n) {
  const v = await lerTexto(srcLegenda(n, 'vtt'));
  const fv = v ? lerVtt(v) : [];
  if (fv.length) return { tipo: 'vtt', frases: fv };
  const t = await lerTexto(srcLegenda(n, 'txt'));
  const linhas = t ? t.split('\n').map(l => l.trim()).filter(Boolean) : [];
  return linhas.length ? { tipo: 'txt', linhas } : null;
}
// a frase do instante t (null: entre frases ou depois do fim)
export const fraseNoTempo = (frases, t) => (frases || []).find(f => t >= f.ini && t < f.fim) || null;

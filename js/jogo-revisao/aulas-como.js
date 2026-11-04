// Jogo de Revisão — 🧑‍🏫 "▶ Ver como faz" (PROMPT-185/186): os passos da lousa (lousa.js) com os números da questão errada.
// comoFaz(chave, q) → [passos] ou null (não deu para montar: o botão não aparece). q = { enunciado, explicacao, resposta,
// erradas } das perguntas dos ginásios, ou { enunciado: conta, explicacao: explica } das contas da batalha.
import { tokU, num } from './base.js';
import { passosExpressao } from './lousa.js';

const soExpressao = (s) => /^[\d\s,+−×÷()[\]{}-]+$/.test(s) && /[+−×÷]/.test(s) && /\d/.test(s);
const limpa = (e) => String(e || '').replace(/\s*=\s*\??\s*$/, '').replace(/^Quanto (é|dá)\s+/i, '').replace(/\?$/, '').trim();
const numero = (s) => Number(String(s).replace(/[()\s]/g, '').replace('−', '-').replace(',', '.'));
// (−3) + 5 → [-3, '+', 5]: os parênteses em volta de um número só saem
const semParen = (t) => { const o = []; for (let i = 0; i < t.length; i++) { if ('([{'.includes(t[i]) && typeof t[i + 1] === 'number' && ')]}'.includes(t[i + 2])) { o.push(t[i + 1]); i += 2; } else o.push(t[i]); } return o; };
const expressao = (e) => { if (!passosExpressao(e).length) return null; return [{ t: 'expressao', v: e }]; };
// a 1ª expressão "só de contas" dentro de um texto (a explicação): "Subir é somar: −3 + 5 = 2 °C" → "−3 + 5"
function expressaoNoTexto(txt) {
  const m = /(\(?−?\d+(?:,\d+)?\)?(?:\s*[+−×÷]\s*\(?−?\d+(?:,\d+)?\)?)+)\s*(?:=|$|\.|:)/.exec(String(txt || ''));
  return m && soExpressao(m[1]) ? m[1].trim() : null;
}

// ── ginásio 1: a expressão (ou a do começo da explicação, nos problemas), resolvida linha por linha ──
function gin1(q) {
  let e = limpa(q.enunciado), problema = null;
  if (!soExpressao(e)) { const x = String(q.explicacao || '').split(' = ')[0].trim(); if (!soExpressao(x)) return null; problema = q.enunciado; e = x; }
  const ps = expressao(e);
  return ps && [...(problema ? [{ t: 'enunciado', v: problema }] : []), ...ps];
}

// ── 2-A / 2-B: × e ÷ por 10, 100, 1000 (a vírgula pulando) e medidas (a escada) ──
const RE_K = /(\d+(?:,\d+)?)\s*([×÷])\s*(10|100|1000)\b/;
function vezesK(txt) { const m = RE_K.exec(String(txt || '')); return m && { v: m[1], op: m[2], k: Number(m[3]) }; }
const ESCADAS = [['km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm'], ['kg', 'hg', 'dag', 'g'], ['L', 'dL', 'cL', 'mL']];
const UNIDADE = { metro: 'm', metros: 'm', centimetro: 'cm', centímetro: 'cm', centímetros: 'cm', centimetros: 'cm', milímetros: 'mm', quilômetros: 'km',
  quilo: 'kg', quilos: 'kg', quilograma: 'kg', quilogramas: 'kg', grama: 'g', gramas: 'g', litro: 'L', litros: 'L', mililitro: 'mL', mililitros: 'mL' };
const unidade = (u) => UNIDADE[String(u).toLowerCase()] || (ESCADAS.flat().includes(u) ? u : null);
function gin2(q) {
  const e = limpa(q.enunciado);
  // "2,5 metros são quantos centímetros?" · "2,5 m = ? cm" (batalha)
  const m = /^(\d+(?:,\d+)?)\s+(\S+)\s+são quantos\s+(\S+?)\??$/i.exec(String(q.enunciado || '').trim()) || /^(\d+(?:,\d+)?)\s*(\S+)\s*=\s*\?\s*(\S+)$/.exec(String(q.enunciado || '').trim());
  if (m) {
    const de = unidade(m[2]), para = unidade(m[3]), esc = ESCADAS.find(d => d.includes(de) && d.includes(para));
    if (!esc) return null;
    return [{ t: 'escada', degraus: esc, de, para, v: m[1] }];
  }
  const k = vezesK(e) && RE_K.exec(e)?.[0] === e ? vezesK(e) : null;   // a conta é só "a × 10"
  if (k) return [{ t: 'virgula', ...k }];
  if (soExpressao(e)) return expressao(e);   // a × 10 × 10, a × 100 + b × 10
  const x = vezesK(q.explicacao);   // problemas (pacotes, balas): a conta da explicação
  return x ? [{ t: 'enunciado', v: q.enunciado }, { t: 'virgula', ...x }] : null;
}

// ── 3-A: comparar (bolinhas na reta) e somar / subtrair (a bolinha anda) ──
function gin3a(q) {
  const comp = /^Qual é (maior|menor)\??$/i.exec(String(q.enunciado || '').trim());
  if (comp) {
    const ns = [q.resposta, ...(q.erradas || [])].map(numero).filter(Number.isFinite);
    if (ns.length < 2) return null;
    const lo = Math.min(...ns), hi = Math.max(...ns);
    return [{ t: 'reta', bolas: ns, destaca: comp[1].toLowerCase(), min: Math.min(lo - 1, -1), max: Math.max(hi + 1, 1) },
      { t: 'linha', v: [...ns].sort((a, b) => a - b).map(num).join(' < ') }];
  }
  let e = limpa(q.enunciado), problema = null;
  if (!soExpressao(e)) { e = expressaoNoTexto(q.explicacao); problema = q.enunciado; }
  if (!e) return null;
  const t = semParen(tokU(e));   // a ± b ± c (sem × ÷)
  if (t.length < 3 || t.length % 2 === 0 || t.some((x, i) => (i % 2 ? !['+', '−'].includes(x) : typeof x !== 'number'))) return null;
  const anda = [], passos = [...(problema ? [{ t: 'enunciado', v: problema }] : []), { t: 'linha', v: e }];
  let atual = e;
  for (let i = 1; i < t.length; i += 2) {
    const y = t[i + 1];
    anda.push(t[i] === '+' ? y : -y);
    if (t[i] === '−' && y < 0) {   // subtrair um negativo é somar o oposto
      const trecho = `− (${num(y)})`, novo = atual.replace(trecho, `+ ${num(-y)}`);
      if (novo !== atual) { passos.push({ t: 'marca', v: trecho }, { t: 'resolve', v: `+ ${num(-y)}`, linha: novo }); atual = novo; }
    }
  }
  const v = t[0] + anda.reduce((a, b) => a + b, 0), pts = [t[0]];
  for (const d of anda) pts.push(pts[pts.length - 1] + d);
  passos.push({ t: 'reta', de: t[0], anda, min: Math.min(...pts, 0) - 1, max: Math.max(...pts, 0) + 1 }, { t: 'linha', v: `${atual} = ${num(v)}`, classe: 'certo' });
  if (anda.length === 1) {
    const a = t[0], b = anda[0], A = Math.abs(a), B = Math.abs(b);
    passos.push({ t: 'texto', v: Math.sign(a) === Math.sign(b) || !a ? `Sinais iguais: soma ${A} + ${B} e mantém o sinal` : A === B ? 'Números opostos: dá 0' : `Sinais diferentes: ${Math.max(A, B)} − ${Math.min(A, B)} = ${Math.abs(A - B)}, fica o sinal do maior` });
  }
  return passos;
}

// ── 3-B: primeiro o sinal (a linha da tabela acende), depois a conta dos números, depois junta ──
export const TABELA_SINAIS = ['+ · + = +', '− · − = +', '+ · − = −', '− · + = −'];
const linhaSinal = (a, b) => (a >= 0 && b >= 0 ? 0 : a < 0 && b < 0 ? 1 : a >= 0 ? 2 : 3);
function gin3b(q) {
  const s = /^(Positivo|Negativo) ([×÷]) (positivo|negativo) dá:?$/i.exec(String(q.enunciado || '').trim());
  if (s) {
    const a = /^p/i.test(s[1]) ? 1 : -1, b = /^p/i.test(s[3]) ? 1 : -1;
    return [{ t: 'tabela', linhas: TABELA_SINAIS }, { t: 'acende', i: linhaSinal(a, b) }, { t: 'texto', v: a === b ? 'Sinais iguais → positivo' : 'Sinais diferentes → negativo' }];
  }
  const e = limpa(q.enunciado);
  if (!soExpressao(e)) return null;
  const t = semParen(tokU(e));
  if (t.length !== 3 || !['×', '÷'].includes(t[1])) return expressao(e);   // com mais contas: linha por linha
  const [a, op, b] = t, r = op === '×' ? a * b : a / b;
  if (!Number.isFinite(r)) return null;
  if (!a || !b) return [{ t: 'linha', v: e }, { t: 'linha', v: `${e} = 0`, classe: 'certo' }, { t: 'texto', v: 'Qualquer número vezes 0 dá 0' }];
  return [{ t: 'tabela', linhas: TABELA_SINAIS }, { t: 'acende', i: linhaSinal(a, b) },
    { t: 'linha', v: `${num(Math.abs(a))} ${op} ${num(Math.abs(b))} = ${num(Math.abs(r))}` },
    { t: 'linha', v: `${e} = ${r > 0 ? '+' : ''}${num(r)}`, classe: 'certo' },
    { t: 'texto', v: Math.sign(a) === Math.sign(b) ? 'Sinais iguais → +' : 'Sinais diferentes → −' }];
}

const GERA = { 'mapa1-A': gin1, 'mapa1-B': gin1, 'mapa2-A': gin2, 'mapa2-B': gin2, 'mapa3-A': gin3a, 'mapa3-B': gin3b };
export function comoFaz(chave, q) {
  const f = GERA[chave];
  if (!f || !q) return null;
  try { const p = f(q); return p?.length ? p : null; } catch (_) { return null; }
}

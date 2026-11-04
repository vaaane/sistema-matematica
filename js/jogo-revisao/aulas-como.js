// Jogo de Revisão — 🧑‍🏫 "▶ Ver como faz" (PROMPT-185/186/187/191): os passos da lousa (lousa.js) com os números da questão errada.
// comoFaz(chave, q, sua?) → [passos] ou null (não deu para montar: o botão não aparece). q = { enunciado, explicacao, resposta,
// erradas, figura? } das perguntas dos ginásios, ou { enunciado: conta, explicacao: explica, resposta } das contas da batalha.
// PROMPT-191: com a resposta do aluno (sua) e ela errada, a lousa vira "✖ sua resposta × ✔ certo" (passo 'compara'): se der
// para descobrir o engano (fez da esquerda para a direita, ignorou os parênteses, somou os de baixo, esqueceu a vírgula…),
// a coluna da esquerda mostra a conta que leva à resposta dele; se não der, só a resposta dele, riscada.
import { tokU, num, arred } from './base.js';
import { passosExpressao, passosSemOrdem, lousaDePassos } from './lousa.js';

const soExpressao = (s) => /^[\d\s,+−×÷()[\]{}-]+$/.test(s) && /[+−×÷]/.test(s) && /\d/.test(s);
const limpa = (e) => String(e || '').replace(/\s*=\s*\??\s*$/, '').replace(/^Quanto (é|dá)\s+/i, '').replace(/\?$/, '').trim();
const numero = (s) => Number(String(s).replace(/R\$|°C|[()\s]/g, '').replace('−', '-').replace(',', '.'));
const igual = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-9;
const lerFrac = (s) => { const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(String(s || '')); return m ? [Number(m[1]), Number(m[2])] : null; };
const mdc = (a, b) => (b ? mdc(b, a % b) : Math.abs(a));
const casasDe = (s) => (String(s).split(',')[1] || '').length;
// (−3) + 5 → [-3, '+', 5]: os parênteses em volta de um número só saem
const semParen = (t) => { const o = []; for (let i = 0; i < t.length; i++) { if ('([{'.includes(t[i]) && typeof t[i + 1] === 'number' && ')]}'.includes(t[i + 2])) { o.push(t[i + 1]); i += 2; } else o.push(t[i]); } return o; };
const expressao = (e) => { if (!passosExpressao(e).length) return null; return [{ t: 'expressao', v: e }]; };
// a 1ª expressão "só de contas" dentro de um texto (a explicação): "Subir é somar: −3 + 5 = 2 °C" → "−3 + 5"
function expressaoNoTexto(txt) {
  const m = /(\(?−?\d+(?:,\d+)?\)?(?:\s*[+−×÷]\s*\(?−?\d+(?:,\d+)?\)?)+)\s*(?:=|$|\.|:)/.exec(String(txt || ''));
  return m && soExpressao(m[1]) ? m[1].trim() : null;
}
const valorDe = (e) => { const ps = passosExpressao(e); return ps.length ? ps[ps.length - 1].valor : NaN; };

// ── ginásio 1: a expressão (ou a do começo da explicação, nos problemas), resolvida linha por linha ──
function exprGin1(q) {
  const e = limpa(q.enunciado);
  if (soExpressao(e)) return { e, problema: null };
  const x = String(q.explicacao || '').split(' = ')[0].trim();
  return soExpressao(x) ? { e: x, problema: q.enunciado } : null;
}
function gin1(q) {
  const x = exprGin1(q);
  const ps = x && expressao(x.e);
  return ps && [...(x.problema ? [{ t: 'enunciado', v: x.problema }] : []), ...ps];
}
function engano1(q, sua) {
  const x = exprGin1(q), v = numero(sua);
  if (!x) return null;
  const tem = (re) => re.test(x.e);
  try {   // fez tudo da esquerda para a direita (o + antes do ×, ou passou por cima dos parênteses)
    const ps = passosSemOrdem(x.e);
    if (ps.length && igual(ps[ps.length - 1].valor, v)) {
      const maisAntes = /^[^×÷]*\d\s*[+−]\s*\d[^]*[×÷]/.test(x.e);   // tinha + ou − antes de um × ou ÷
      return [...lousaDePassos(ps), { t: 'texto', v: tem(/[()[\]{}]/) ? 'ignorou os parênteses' : maisAntes ? 'fez o + ou − antes do × ou ÷' : 'fez da esquerda para a direita, sem a ordem' }];
    }
  } catch (_) {}
  if (tem(/[()[\]{}]/)) {   // tirou os parênteses, mas respeitou a ordem
    const sem = x.e.replace(/[()[\]{}]/g, '').replace(/\s+/g, ' ').trim();
    try { if (igual(valorDe(sem), v)) return [{ t: 'expressao', v: sem }, { t: 'texto', v: 'ignorou os parênteses' }]; } catch (_) {}
  }
  return null;
}

// ── 2-A / 2-B: × e ÷ por 10, 100, 1000 (a vírgula pulando) e medidas (a escada) ──
const RE_K = /(\d+(?:,\d+)?)\s*([×÷])\s*(10|100|1000)\b/;
function vezesK(txt) { const m = RE_K.exec(String(txt || '')); return m && { v: m[1], op: m[2], k: Number(m[3]) }; }
const ESCADAS = [['km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm'], ['kg', 'hg', 'dag', 'g'], ['L', 'dL', 'cL', 'mL']];
const UNIDADE = { metro: 'm', metros: 'm', centimetro: 'cm', centímetro: 'cm', centímetros: 'cm', centimetros: 'cm', milímetros: 'mm', quilômetros: 'km',
  quilo: 'kg', quilos: 'kg', quilograma: 'kg', quilogramas: 'kg', grama: 'g', gramas: 'g', litro: 'L', litros: 'L', mililitro: 'mL', mililitros: 'mL' };
const unidade = (u) => UNIDADE[String(u).toLowerCase()] || (ESCADAS.flat().includes(u) ? u : null);
const conversao = (q) => /^(\d+(?:,\d+)?)\s+(\S+)\s+são quantos\s+(\S+?)\??$/i.exec(String(q.enunciado || '').trim()) || /^(\d+(?:,\d+)?)\s*(\S+)\s*=\s*\?\s*(\S+)$/.exec(String(q.enunciado || '').trim());
function gin2(q) {
  const e = limpa(q.enunciado);
  // "2,5 metros são quantos centímetros?" · "2,5 m = ? cm" (batalha)
  const m = conversao(q);
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
function engano2(q, sua) {
  const v = numero(sua), m = conversao(q);
  if (m) {
    const de = unidade(m[2]), para = unidade(m[3]), esc = ESCADAS.find(d => d.includes(de) && d.includes(para));
    if (!esc) return null;
    const a = numero(m[1]), d = esc.indexOf(para) - esc.indexOf(de), certo = arred(a * 10 ** d);
    const ini = { t: 'linha', v: `${m[1]} ${de} = ? ${para}` };
    if (igual(arred(a * 10 ** -d), v)) return [ini, { t: 'texto', v: d > 0 ? 'subiu a escada em vez de descer' : 'desceu a escada em vez de subir' }, { t: 'linha', v: `${sua} ${para}` }];
    if (igual(arred(certo * 10), v) || igual(arred(certo / 10), v)) return [ini, { t: 'texto', v: 'contou os degraus errado' }, { t: 'linha', v: `${sua} ${para}` }];
    return null;
  }
  const k = vezesK(limpa(q.enunciado)) || vezesK(q.explicacao);
  if (!k) return null;
  const a = numero(k.v), conta = `${k.v} ${k.op} ${k.k}`, certo = k.op === '×' ? a * k.k : a / k.k;
  if (k.op === '×' && /,0+$/.test(String(sua)) && igual(v, a)) return [{ t: 'linha', v: conta }, { t: 'linha', v: String(sua) }, { t: 'texto', v: 'zeros depois da vírgula não mudam o número' }];
  if (igual(arred(k.op === '×' ? a / k.k : a * k.k), v)) return [{ t: 'linha', v: conta }, { t: 'texto', v: `a vírgula foi para a ${k.op === '×' ? 'esquerda' : 'direita'}` }, { t: 'linha', v: String(sua) }];
  if (igual(arred(certo * 10), v) || igual(arred(certo / 10), v)) return [{ t: 'linha', v: conta }, { t: 'texto', v: 'contou os zeros errado' }, { t: 'linha', v: String(sua) }];
  return null;
}

// ── 3-A: comparar (bolinhas na reta) e somar / subtrair (a bolinha anda) ──
const ehComparar = (q) => /^Qual é (maior|menor)\??$/i.exec(String(q.enunciado || '').trim());
function contaGin3a(q) {
  let e = limpa(q.enunciado), problema = null;
  if (!soExpressao(e)) { e = expressaoNoTexto(q.explicacao); problema = q.enunciado; }
  if (!e) return null;
  const t = semParen(tokU(e));   // a ± b ± c (sem × ÷)
  if (t.length < 3 || t.length % 2 === 0 || t.some((x, i) => (i % 2 ? !['+', '−'].includes(x) : typeof x !== 'number'))) return null;
  return { e, problema, t };
}
function gin3a(q) {
  const comp = ehComparar(q);
  if (comp) {
    const ns = [q.resposta, ...(q.erradas || [])].map(numero).filter(Number.isFinite);
    if (ns.length < 2) return null;
    const lo = Math.min(...ns), hi = Math.max(...ns);
    return [{ t: 'reta', bolas: ns, destaca: comp[1].toLowerCase(), min: Math.min(lo - 1, -1), max: Math.max(hi + 1, 1) },
      { t: 'linha', v: [...ns].sort((a, b) => a - b).map(num).join(' < ') }];
  }
  const c = contaGin3a(q);
  if (!c) return null;
  const { e, problema, t } = c;
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
function engano3a(q, sua) {
  const v = numero(sua);
  if (ehComparar(q)) {
    const r = numero(q.resposta);
    if (!Number.isFinite(r) || !Number.isFinite(v) || Math.abs(v) <= Math.abs(r)) return null;
    return [{ t: 'linha', v: `${num(v)} ou ${num(r)}?` }, { t: 'linha', v: `${num(Math.abs(v))} > ${num(Math.abs(r))}` }, { t: 'linha', v: `${num(v)}` }, { t: 'texto', v: 'olhou só o número, sem o sinal' }];
  }
  const c = contaGin3a(q);
  if (!c || c.t.length !== 3) return null;
  const [a, op, b] = c.t, y = op === '+' ? b : -b, certo = a + y, A = Math.abs(a), B = Math.abs(y);
  if (op === '−' && b < 0 && igual(a + b, v)) return [{ t: 'linha', v: c.e }, { t: 'linha', v: `${num(a)} − ${num(-b)}` }, { t: 'linha', v: num(v) }, { t: 'texto', v: 'esqueceu que − (−) vira +' }];
  if (Math.sign(a) !== Math.sign(y) && a && y && igual(Math.abs(v), A + B))   // −8 + 5 → −13: somou, com os sinais diferentes
    return [{ t: 'linha', v: c.e }, { t: 'linha', v: `${v < 0 ? '−' : ''}(${num(A)} + ${num(B)})` }, { t: 'linha', v: num(v) }, { t: 'texto', v: 'somou, mas os sinais são diferentes' }];
  if (certo && igual(-certo, v)) return [{ t: 'linha', v: c.e }, { t: 'linha', v: `${num(Math.max(A, B))} − ${num(Math.min(A, B))} = ${num(Math.abs(certo))}` }, { t: 'linha', v: num(v) }, { t: 'texto', v: 'trocou o sinal' }];
  return null;
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
function engano3b(q, sua) {
  const e = limpa(q.enunciado);
  if (!soExpressao(e)) return null;
  const t = semParen(tokU(e));
  if (t.length !== 3 || !['×', '÷'].includes(t[1])) return engano1({ enunciado: e }, sua);
  const [a, op, b] = t, r = op === '×' ? a * b : a / b, v = numero(sua);
  if (r && igual(-r, v)) return [{ t: 'linha', v: e }, { t: 'linha', v: `${num(Math.abs(a))} ${op} ${num(Math.abs(b))} = ${num(Math.abs(r))}` }, { t: 'linha', v: String(sua) }, { t: 'texto', v: 'errou o sinal' }];
  return null;
}

// ── 4-A: frações — a figura que a pergunta já tem, com a conta (setas ×n / ÷n, os de cima somando, o de baixo fixo) ──
function gin4a(q) {
  const f = q.figura;
  if (!f?.tipo) return null;
  switch (f.tipo) {
    case 'barras_iguais': return [{ t: 'fracoes', fr: [f.de, f.para], op: '×' }, { t: 'barras', fr: [f.de, f.para] }, { t: 'texto', v: `${f.de.join('/')} = ${f.para.join('/')}: em cima e embaixo × ${f.para[1] / f.de[1]}` }];
    case 'simplificar': {
      const fim = f.fim || (() => { const d = mdc(...f.fr); return [f.fr[0] / d, f.fr[1] / d]; })();
      return [{ t: 'fracoes', fr: [f.fr, fim], op: '÷' }, { t: 'barras', fr: [f.fr, fim] }, { t: 'texto', v: `em cima e embaixo ÷ ${f.fr[1] / fim[1]}` }];
    }
    case 'soma_fracao': {
      const [a, d] = f.a, [b, db] = f.b, op = f.op === '−' ? '−' : '+', ps = [{ t: 'linha', v: `${a}/${d} ${op} ${b}/${db}` }];
      let D = d, A = a, B = b;
      if (f.converte) { [[A, D], [B]] = f.converte; ps.push({ t: 'linha', v: `${A}/${D} ${op} ${B}/${D}` }, { t: 'texto', v: 'deixe os de baixo iguais' }); }
      const n = op === '+' ? A + B : A - B;
      ps.push({ t: 'linha', v: `${A} ${op} ${B} = ${n}` }, { t: 'texto', v: `o de baixo fica: ${D}` }, { t: 'linha', v: `${A}/${D} ${op} ${B}/${D} = ${n}/${D}`, classe: f.res?.[0] === n && f.res?.[1] === D ? 'certo' : '' });
      if (f.res && (f.res[0] !== n || f.res[1] !== D)) ps.push({ t: 'fracoes', fr: [[n, D], f.res], op: '÷' }, { t: 'texto', v: `simplificando: ${n}/${D} = ${f.res.join('/')}` });
      return ps;
    }
    case 'parte_de': {
      const { num: p, den, total } = f, k = total / den;
      return [{ t: 'figura', figura: f }, { t: 'linha', v: p === 1 ? `${total} ÷ ${den} = ${k}` : `${total} ÷ ${den} × ${p} = ${k} × ${p} = ${k * p}`, classe: 'certo' }];
    }
    case 'compara_fracoes': case 'pizza': return [{ t: 'figura', figura: f }];
    default: return null;
  }
}
function engano4a(q, sua) {
  const f = q.figura, s = lerFrac(sua), v = numero(sua);
  if (!f) return null;
  if (f.tipo === 'soma_fracao' && s) {
    const [a, d] = f.a, [b, db] = f.b, op = f.op === '−' ? '−' : '+', n = op === '+' ? a + b : a - b;
    if (s[0] === n && s[1] === (op === '+' ? d + db : Math.abs(d - db))) return [{ t: 'linha', v: `${a}/${d} ${op} ${b}/${db}` }, { t: 'texto', v: 'somou os de baixo também' }, { t: 'linha', v: `${s[0]}/${s[1]}` }];
    if (f.res && s[0] === f.res[1] && s[1] === f.res[0]) return [{ t: 'linha', v: `${a}/${d} ${op} ${b}/${db}` }, { t: 'texto', v: 'virou a fração de cabeça para baixo' }, { t: 'linha', v: `${s[0]}/${s[1]}` }];
  }
  if (f.tipo === 'parte_de' && Number.isFinite(v)) {
    const { num: p, den, total } = f, k = total / den;
    if (p > 1 && igual(v, k)) return [{ t: 'linha', v: `${p}/${den} de ${total}` }, { t: 'linha', v: `${total} ÷ ${den}` }, { t: 'linha', v: num(v) }, { t: 'texto', v: `parou no ÷: faltou × ${p} (são ${p} partes)` }];
    if (igual(v, total)) return [{ t: 'linha', v: `${p}/${den} de ${total}` }, { t: 'texto', v: 'não dividiu' }, { t: 'linha', v: num(v) }];
  }
  if ((f.tipo === 'barras_iguais' || f.tipo === 'simplificar') && s) {
    const certo = lerFrac(q.resposta);
    if (certo && s[0] === certo[1] && s[1] === certo[0]) return [{ t: 'linha', v: `${s[0]}/${s[1]}` }, { t: 'texto', v: 'trocou o de cima com o de baixo' }];
    if (certo && (s[0] === certo[0]) !== (s[1] === certo[1])) return [{ t: 'linha', v: `${s[0]}/${s[1]}` }, { t: 'texto', v: 'mudou só um dos números: em cima e embaixo, o mesmo × ou ÷' }];
  }
  return null;
}

// ── 4-B: decimais — armada (vírgula embaixo de vírgula), igualar as casas, contar as casas, fração → divisão ──
const RE_DEC = /^(?:R\$\s*)?(\d+(?:,\d+)?)\s*([+−×])\s*(?:R\$\s*)?(\d+(?:,\d+)?)$/;
function contaDec(q) {
  const e = limpa(q.enunciado), m = RE_DEC.exec(e);
  if (m) return { a: m[1], op: m[2], b: m[3], e };
  const tr = /^Paguei R\$\s*(\d+(?:,\d+)?) por .* de R\$\s*(\d+(?:,\d+)?)/i.exec(String(q.enunciado || ''));   // troco
  if (tr) return { a: tr[1], op: '−', b: tr[2], e: `${tr[1]} − ${tr[2]}`, problema: q.enunciado };
  return null;
}
function gin4b(q) {
  const c = contaDec(q);
  if (c) return [...(c.problema ? [{ t: 'enunciado', v: c.problema }] : []), { t: 'linha', v: c.e }, { t: 'armada', a: c.a, op: c.op, b: c.b }];
  const fd = /^(\d+)\/(\d+) em número decimal$/i.exec(String(q.enunciado || '').trim());
  if (fd) {
    const p = Number(fd[1]), d = Number(fd[2]);
    const ps = [{ t: 'linha', v: `${p}/${d} = ${p} ÷ ${d}` }, { t: 'divisao', a: p, b: d, casas: 3 }];
    if ([10, 100, 1000].includes(d)) ps.push({ t: 'virgula', v: String(p), op: '÷', k: d, manter: true });
    return ps;
  }
  const df = /^(\d+,\d+) em fração$/i.exec(String(q.enunciado || '').trim());
  if (df) {
    const c2 = casasDe(df[1]), den = 10 ** c2, n = Math.round(numero(df[1]) * den), r = lerFrac(q.resposta), ps = [{ t: 'linha', v: `${df[1]} = ${n}/${den}` }];
    if (r && (r[0] !== n || r[1] !== den)) ps.push({ t: 'fracoes', fr: [[n, den], r], op: '÷' });
    ps.push({ t: 'texto', v: `${c2} ${c2 === 1 ? 'casa' : 'casas'} depois da vírgula: ${den} embaixo` });
    return ps;
  }
  if (/^Qual é maior\??$/i.test(String(q.enunciado || '').trim())) {
    const ns = [q.resposta, ...(q.erradas || [])].map(String).filter(s => /^\d+,\d+$/.test(s));
    if (ns.length < 2) return null;
    const c2 = Math.max(...ns.map(casasDe)), pad = (s) => s + '0'.repeat(c2 - casasDe(s)), inteiro = (s) => Number(pad(s).replace(',', ''));
    const [x, y] = ns, maior = numero(x) >= numero(y) ? x : y;
    return [{ t: 'linha', v: `${x} ou ${y}?` }, { t: 'linha', v: `${pad(x)} e ${pad(y)}` }, { t: 'texto', v: 'iguale as casas com zeros' },
      { t: 'linha', v: `${Math.max(inteiro(x), inteiro(y))} > ${Math.min(inteiro(x), inteiro(y))}` }, { t: 'linha', v: `${maior} é maior`, classe: 'certo' }];
  }
  return null;
}
function engano4b(q, sua) {
  const v = numero(sua), c = contaDec(q);
  if (c) {
    const certo = c.op === '+' ? numero(c.a) + numero(c.b) : c.op === '−' ? numero(c.a) - numero(c.b) : numero(c.a) * numero(c.b);
    if (c.op !== '×' && casasDe(c.a) === casasDe(c.b) && casasDe(c.a) && igual(arred(certo * 10 ** casasDe(c.a)), v))
      return [{ t: 'linha', v: c.e }, { t: 'armada', a: c.a, op: c.op, b: c.b, sem_virgula: true }, { t: 'texto', v: 'esqueceu a vírgula' }];
    if (Number.isFinite(v) && (igual(arred(certo * 10), v) || igual(arred(certo / 10), v))) return [{ t: 'linha', v: c.e }, { t: 'linha', v: String(sua) }, { t: 'texto', v: 'a vírgula ficou no lugar errado' }];
    return null;
  }
  if (/^Qual é maior\??$/i.test(String(q.enunciado || '').trim()) && /^\d+,\d+$/.test(String(sua))) {
    const r = String(q.resposta);
    if (casasDe(sua) > casasDe(r)) return [{ t: 'linha', v: `${r} ou ${sua}?` }, { t: 'linha', v: `${String(sua).split(',')[1]} > ${r.split(',')[1]}` }, { t: 'linha', v: `${sua} é maior` }, { t: 'texto', v: `"${sua} tem mais números"` }];
    return null;
  }
  const fd = /^(\d+)\/(\d+) em número decimal$/i.exec(String(q.enunciado || '').trim());
  if (fd && Number.isFinite(v)) {
    const certo = Number(fd[1]) / Number(fd[2]);
    if (igual(arred(certo * 10), v) || igual(arred(certo / 10), v)) return [{ t: 'linha', v: `${fd[1]} ÷ ${fd[2]}` }, { t: 'linha', v: String(sua) }, { t: 'texto', v: 'a vírgula ficou no lugar errado' }];
  }
  return null;
}

const GERA = { 'mapa1-A': gin1, 'mapa1-B': gin1, 'mapa2-A': gin2, 'mapa2-B': gin2, 'mapa3-A': gin3a, 'mapa3-B': gin3b, 'mapa4-A': gin4a, 'mapa4-B': gin4b };
const ENGANO = { 'mapa1-A': engano1, 'mapa1-B': engano1, 'mapa2-A': engano2, 'mapa2-B': engano2, 'mapa3-A': engano3a, 'mapa3-B': engano3b, 'mapa4-A': engano4a, 'mapa4-B': engano4b };
const normResp = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
export function comoFaz(chave, q, sua) {
  const f = GERA[chave];
  if (!f || !q) return null;
  let certo;
  try { certo = f(q); } catch (_) { return null; }
  if (!certo?.length) return null;
  if (sua == null || normResp(sua) === '' || q.resposta == null || normResp(sua) === normResp(q.resposta)) return certo;
  // ✖ sua resposta × ✔ certo: o problema (enunciado) fica em cima das duas colunas
  const topo = certo[0]?.t === 'enunciado' ? [certo[0]] : [], dir = topo.length ? certo.slice(1) : certo;
  let esq = null;
  try { esq = ENGANO[chave]?.(q, sua) || null; } catch (_) { esq = null; }
  return [...topo, { t: 'compara', esq: { titulo: '✖ sua resposta', tipo: 'errado', passos: esq?.length ? esq : [{ t: 'linha', v: String(sua) }] }, dir: { titulo: '✔ certo', tipo: 'certo', passos: dir } }];
}

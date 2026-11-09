// Jogo de Revisão — 🧑‍🏫 "▶ Ver como faz" (PROMPT-185/186/187/191): os passos da lousa (lousa.js) com os números da questão errada.
// comoFaz(chave, q, sua?) → [passos] ou null (não deu para montar: o botão não aparece). q = { enunciado, explicacao, resposta,
// erradas, figura? } das perguntas dos ginásios, ou { enunciado: conta, explicacao: explica, resposta } das contas da batalha.
// PROMPT-191: com a resposta do aluno (sua) e ela errada, a lousa vira "✖ sua resposta × ✔ certo" (passo 'compara'): se der
// para descobrir o engano (fez da esquerda para a direita, ignorou os parênteses, somou os de baixo, esqueceu a vírgula…),
// a coluna da esquerda mostra a conta que leva à resposta dele; se não der, só a resposta dele, riscada.
import { tokU, num, arred } from './base.js';
import { passosExpressao, passosSemOrdem, lousaDePassos } from './lousa.js';
import { QUADRO_FD } from './quadro.js';
import { conferirAfirmacao } from './mapas9a13.js';

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
  if (!soExpressao(e)) { e = expressaoNoTexto(q.explicacao) || problemaConta(q.enunciado)?.conta; problema = q.enunciado; }   // PROMPT-202
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
    passos.push({ t: 'texto', v: Math.sign(a) === Math.sign(b) || !a ? 'Sinais iguais: soma e mantém o sinal' : A === B ? 'Números opostos: dá 0' : 'Sinais diferentes: subtrai e fica o sinal do maior' });   // PROMPT-198: só a regra
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
  // PROMPT-206: × e ÷ de frações (a lousa antiga, para o "▶ Ver como faz"; o cartão do erro usa o quadro)
  const mx = /^(\d+)\/(\d+)\s*([×÷])\s*(\d+)\/(\d+)$/.exec(String(q.enunciado || '').trim());
  if (mx) {
    const [a, b, c, d] = [mx[1], mx[2], mx[4], mx[5]].map(Number), div = mx[3] === '÷', [x, y] = div ? [d, c] : [c, d];
    return [{ t: 'linha', v: `${a}/${b} ${mx[3]} ${c}/${d}` }, ...(div ? [{ t: 'linha', v: `${a}/${b} × ${d}/${c}` }, { t: 'texto', v: 'Mantém a primeira, vira a segunda' }] : []),
      { t: 'linha', v: `em cima: ${a} × ${x} = ${a * x}` }, { t: 'linha', v: `embaixo: ${b} × ${y} = ${b * y}` }, { t: 'linha', v: `${a * x}/${b * y}`, classe: 'certo' }];
  }
  const f = q.figura;
  if (!f?.tipo) return null;
  switch (f.tipo) {
    case 'barras_iguais': return [{ t: 'fracoes', fr: [f.de, f.para], op: '×' }, { t: 'barras', fr: [f.de, f.para] }, { t: 'texto', v: 'Em cima e embaixo, o mesmo ×' }];
    case 'simplificar': {
      const fim = f.fim || (() => { const d = mdc(...f.fr); return [f.fr[0] / d, f.fr[1] / d]; })();
      return [{ t: 'fracoes', fr: [f.fr, fim], op: '÷' }, { t: 'barras', fr: [f.fr, fim] }, { t: 'texto', v: 'Em cima e embaixo, o mesmo ÷' }];
    }
    case 'soma_fracao': {
      const [a, d] = f.a, [b, db] = f.b, op = f.op === '−' ? '−' : '+', ps = [{ t: 'linha', v: `${a}/${d} ${op} ${b}/${db}` }];
      let D = d, A = a, B = b;
      if (f.converte) { [[A, D], [B]] = f.converte; ps.push({ t: 'linha', v: `${A}/${D} ${op} ${B}/${D}` }, { t: 'texto', v: 'deixe os de baixo iguais' }); }
      const n = op === '+' ? A + B : A - B;
      ps.push({ t: 'linha', v: `${A} ${op} ${B} = ${n}` }, { t: 'texto', v: 'O de baixo fica igual' }, { t: 'linha', v: `${A}/${D} ${op} ${B}/${D} = ${n}/${D}`, classe: f.res?.[0] === n && f.res?.[1] === D ? 'certo' : '' });
      if (f.res && (f.res[0] !== n || f.res[1] !== D)) ps.push({ t: 'fracoes', fr: [[n, D], f.res], op: '÷' }, { t: 'texto', v: 'Depois simplifica' });
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
  if (c) return [...(c.problema ? [{ t: 'enunciado', v: c.problema }] : []), { t: 'linha', v: c.e }, { t: 'armada', a: c.a, op: c.op, b: c.b, blocos: false },   // PROMPT-204: o zero entra dentro da conta
   
    // PROMPT-198: a legenda só com a regra
    ...(c.op === '×' ? [] : [{ t: 'texto', v: casasDe(c.a) !== casasDe(c.b) ? 'Casas diferentes? Completa com zero. Zero no fim não muda nada.' : 'Vírgula embaixo de vírgula' }])];
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
    ps.push({ t: 'texto', v: 'Casas da vírgula = zeros embaixo' });
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
// ✏️ PROMPT-209: os enunciados ganharam a pergunta no fim ("Qual é o valor de 2x quando x = 3?", "… Qual equação representa
// a balança?"). As lousas leem o enunciado do jeito antigo: aqui ele volta ao formato antigo antes de qualquer leitura.
export function tirarPergunta(e) {
  let s = String(e ?? '').trim(), m;
  s = s.replace(/\s*(?:Qual equação representa (?:a balança|essa situação)|Qual é a equação)\?$/, '');
  if ((m = /^Qual (?:equação|expressão) representa "(.)(.*)"\?$/.exec(s))) return `"${m[1].toUpperCase()}${m[2]}"`;
  if ((m = /^Quanto é (\d+\/\d+ em número decimal)\?$/.exec(s))) return m[1];
  if ((m = /^Qual é o valor de (.+)\?$/.exec(s))) return `Valor de ${m[1]}`;
  if ((m = /^Qual é o perímetro de (.+)\?$/.exec(s))) return `Perímetro de ${m[1]}`;
  if ((m = /^Qual é a área de (.+)\?$/.exec(s))) return `Área de ${m[1]}`;
  return s;
}
const semPergunta = (q) => (q && typeof q === 'object' ? { ...q, enunciado: tirarPergunta(q.enunciado) } : q);
// 🧑‍🏫 PROMPT-205: o cartão do erro do 4-B usa o quadro escrito (quadro.js): as cenas com os números da questão (null = a lousa de antes)
export function quadroComoFaz(chave, q, sua = '') {
  if (!q) return null;
  const cs = chave === 'mapa12-A' ? quadro12a(q) : chave === 'mapa12-B' ? quadro12b(q, sua)   // PROMPT-215
    : chave === 'mapa11-A' ? quadro11a(q) : chave === 'mapa11-B' ? quadro11b(q)   // PROMPT-216
    : chave === 'mapa10-A' ? quadro10a(q) : chave === 'mapa10-B' ? quadro10b(q) : quadroComoFaz0(chave, q);   // PROMPT-217
  // PROMPT-214: a pergunta da questão fica no alto da lousa (o enunciado inteiro, com a pergunta)
  const perg = String(q.enunciado || '').trim();
  if (cs?.[0] && perg && !cs[0].perg) cs[0] = { ...cs[0], perg };
  return cs;
}
function quadroComoFaz0(chave, q) {
  q = semPergunta(q);
  if (chave === 'mapa4-A') return quadro4a(q);   // PROMPT-206
  if (chave === 'mapa5-A') return quadro5a(q);   // PROMPT-207
  if (chave === 'mapa13-A') return quadro13a(q);   // PROMPT-208
  if (chave === 'mapa13-B') return quadro13b(q);
  if (chave !== 'mapa4-B') return null;
  const en = String(q.enunciado || '').trim();
  const c = contaDec(q);
  if (c) {
    const resposta = `${c.e} = ${q.resposta}`;
    if (c.op === '×') return [{ t: 'mult', a: c.a, b: c.b, resposta }];
    return [{ t: 'armada', a: c.a, op: c.op, b: c.b, resposta, passos: c.problema ? [`Troco é conta de menos: ${c.a} − ${c.b}.`] : [] }];
  }
  const fd = /^(\d+)\/(\d+) em número decimal$/i.exec(en);
  if (fd) {
    const p = Number(fd[1]), d = Number(fd[2]);
    if ([10, 100, 1000].includes(d)) return [{ t: 'divk', p, k: d }];
    return QUADRO_FD(p, d) ? [{ t: 'fracdec', p, d }] : null;
  }
  const df = /^(\d+,\d+) em fração$/i.exec(en);
  if (df) return [{ t: 'decfrac', v: [df[1]] }];
  if (/^Qual é maior\??$/i.test(en)) {
    const ns = [q.resposta, ...(q.erradas || [])].map(String).filter(s => /^\d+,\d+$/.test(s));
    return ns.length === 2 ? [{ t: 'compara', v: ns }] : null;
  }
  return null;
}
// 🧑‍🏫 PROMPT-207: as cenas do quadro do 5-A (potências), pelo enunciado. Os expoentes vêm em sobrescrito (2³; deSup lá embaixo)
const RP = '(\\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)';
function cenaPot(b, n) {
  if (n === 2 && b >= 1 && b <= 12) return { t: 'quadrado', b };
  if (b === 10 && n >= 1 && n <= 6) return { t: 'dez', n };
  if (b === 1 && n >= 2) return { t: 'umzero', casos: [[1, n]] };
  if (n === 0 || n === 1) return { t: 'umzero', casos: [[b, n]] };
  if (n >= 3 && n <= 6 && b >= 2 && b ** (n - 1) <= 99) return { t: 'cadeia', b, n };   // a armada vai até 2 algarismos × 1
  return null;
}
function quadro5a(q) {
  const en = limpa(q.enunciado);
  let m = new RegExp(`^${RP}$`).exec(en);
  if (m) { const c = cenaPot(Number(m[1]), deSup(m[2])); return c ? [c] : null; }
  m = new RegExp(`^${RP} é o mesmo que:?$`).exec(en) || new RegExp(`^Na potência ${RP}, qual número é a base`).exec(en);
  if (m) { const n = deSup(m[2]); return n >= 1 && n <= 6 ? [{ t: 'potencia', b: Number(m[1]), n, leitura: false }] : null; }
  m = /^(\d+)((?: × \d+)+) em forma de potência:?$/.exec(en);
  if (m) { const fs = [m[1], ...m[2].split(' × ').filter(Boolean)]; return fs.every(f => f === m[1]) && fs.length <= 6 ? [{ t: 'virapot', b: Number(m[1]), n: fs.length }] : null; }
  m = new RegExp(`^${RP} ([+−-]) ${RP}$`).exec(en);
  if (m) return [{ t: 'naconta', a: Number(m[1]), n: deSup(m[2]), op: m[3] === '+' ? '+' : '−', b: Number(m[4]), m: deSup(m[5]) }];
  return null;
}
// 🧑‍🏫 PROMPT-207: a página do resumo (da Aula) de cada tipo de questão, pelas cenas do cartão do erro (1 = a primeira; 0 = nenhuma)
export function paginaResumo(chave, cenas, q) {
  q = semPergunta(q);
  const c = cenas?.[0];
  if (!c) return 0;
  if (chave === 'mapa4-A') return { fracao: 1, equiv: 2, simplif: 3, compunit: 6, dendif: 7, multfr: 8, partede: 9, divfr: 10 }[c.t] || (c.t === 'mesmoden' ? (c.op === '+' ? 4 : 5) : 0);
  if (chave === 'mapa4-B') {
    if (c.t === 'armada') return c.op === '+' ? (/R\$/.test(String(q?.enunciado || '')) || casasDe(c.a) !== casasDe(c.b) ? 2 : 1) : 3;
    if (c.t === 'mult') return casasDe(c.a) && casasDe(c.b) ? 5 : 6;
    return { compara: 4, fracdec: 7, divk: 7, decfrac: 8 }[c.t] || 0;
  }
  if (chave === 'mapa5-A') {
    if (c.t === 'cadeia') return c.n === 3 ? 3 : 4;
    return { potencia: 1, quadrado: 2, virapot: 5, dez: 6, umzero: 7, naconta: 8 }[c.t] || 0;
  }
  if (chave === 'mapa13-A') {   // PROMPT-214: 8 páginas (saiu a das idades; o problema de média abre a página 1)
    if (c.t === 'media' || c.t === 'mediaprob') return c.l.reduce((a, b) => a + b, 0) % c.l.length ? 2 : 1;
    if (c.t === 'moda') return (c.listas || [c.l]).length === 1 && modasDe(c.l).length === 1 ? 4 : 5;
    if (c.t === 'mediana') return c.l.length % 2 ? 6 : 7;
    return { notafalta: 3, medcomp: 8 }[c.t] || 0;
  }
  if (/^mapa1[01]-[AB]$/.test(chave)) return c.pag || 0;   // PROMPT-216/217: quadro10a/b e quadro11a/b marcam a página   // PROMPT-216: quadro11a / quadro11b marcam a página
  if (chave === 'mapa12-A') return { plano: 1, ponto: 2, valor: 3, ordem: 4, eixos: 5, maislado: 6, negativos: 7, quadrantes: 8 }[c.t] || 0;   // PROMPT-215
  if (chave === 'mapa12-B') return c.t === 'caminho' ? 6 : c.t === 'andar' ? c.pag || 0 : 0;
  if (chave === 'mapa13-B') return { ler: 1, maior: 2, total: 3, amais: 4, mediatab: 5, fractab: 6, pcttab: 7, afirma: 8, dupla: 9 }[c.t] || 0;
  return 0;
}
// 🧑‍🏫 PROMPT-217: as cenas do quadro do mapa 10 (regra de três), com os números e as grandezas da questão; pag = a página do resumo
const nR = (t) => Number(String(t).replace(/\./g, '').replace(',', '.'));
const fR = (v) => (Number.isInteger(v) ? String(v) : (Math.round(v * 100) / 100).toFixed(2).replace('.', ','));   // no mapa 10, decimal é dinheiro: 0,50
const PLURAL = { pessoa: 'pessoas', torneira: 'torneiras', pintor: 'pintores', pedreiro: 'pedreiros', caixa: 'caixas', garrafa: 'garrafas' };
// a tabela [[a1, b1], [a2, x]]: a linha do cruzado, o coeficiente do x e o produto (inversa: a 1ª coluna já invertida)
function cruzado(a1, b1, a2, inversa) {
  const c = inversa ? a2 : a1, o = inversa ? a1 : a2, P = Math.round(o * b1 * 100) / 100;
  return { c, o, P, eq: `${fR(c)} · x = ${fR(o)} · ${fR(b1)}` };
}
// por que a 2ª seta: mais/menos de cada lado (preço: maior/menor)
function porqueR3(cab0, cab1, sobe, inversa, aula) {
  const preco = /^preço/.test(cab1), outra = inversa ? (sobe ? 'MENOS' : 'MAIS') : (sobe ? 'mais' : 'menos');
  const lado2 = preco && !inversa ? `preço ${sobe ? 'maior' : 'menor'}` : `${outra} ${cab1}`;
  return `${sobe ? 'Mais' : 'Menos'} ${cab0}, ${lado2}: ${inversa ? 'inversas, seta oposta.' : aula ? 'diretas, seta para baixo também.' : 'diretas.'}`;
}
// 10-A: a página com a conta resolvida até o fim
function r3calc({ perg, cab, a1, b1, a2, inversa = false, final, pag, centavos = false }) {
  const { c, P, eq } = cruzado(a1, b1, a2, inversa);
  let linhas = c === 1 ? [eq, `x = ${fR(P)}`] : [eq, `${fR(c)}x = ${fR(P)}`, `x = ${fR(P)} ÷ ${fR(c)}`];
  if (centavos) {   // 10-A p.4: sobrou real? vira centavos
    const inteiro = Math.floor(P / c), sobra = Math.round((P - inteiro * c) * 100) / 100;
    const rs = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ','));   // dinheiro: 4,50 (não 4,5)
    linhas = [eq.replace(/· ([\d,]+)$/, (m0, v) => `· ${rs(nR(v))}`), `x = ${rs(P)} ÷ ${fR(c)}`];
    if (Number.isInteger(P) && inteiro >= 1 && sobra > 0) linhas.push(`${fR(P)} ÷ ${fR(c)}: dá ${inteiro} e sobra R$ ${fR(sobra)} = ${Math.round(sobra * 100)} centavos`, `${Math.round(sobra * 100)} ÷ ${fR(c)} = ${Math.round(sobra * 100 / c)} centavos`);
    else linhas.push(`R$ ${rs(P)} = ${Math.round(P * 100)} centavos`, `${Math.round(P * 100)} ÷ ${fR(c)} = ${Math.round(P * 100 / c)} centavos`);
  }
  return [{ t: 'r3', perg, cab, lin: [[a1, fR(b1)], [a2, 'x']], inversa, porque: porqueR3(cab[0], cab[1], a2 > a1, inversa, true), linhas, final, resp: `<span>${final}</span>`, pag }];
}
// PROMPT-218: as páginas 1, 2 e 4 do 10-A mostram o exemplo da aula (a pergunta da aula, não a da questão)
const PERG_10A = { direta: 'Cada pão custa R$ 3. Quando os pães aumentam, o preço aumenta ou diminui?', inversa: '1 pedreiro faz um muro em 12 dias. Com mais pedreiros, os dias aumentam ou diminuem?',
  diminui: '4 cadernos custam R$ 20. Quanto custa 1 caderno? É direta ou inversa?' };
function quadro10a(q) {
  const en = String(q.enunciado || '').trim(), r = String(q.resposta || '').trim();
  let m;
  if ((m = /^1 (\S+) custa R\$ ([\d,]+)\. Quanto custam (\d+) (\S+)\?$/.exec(en))) return r3calc({ perg: en, cab: [m[4], 'preço (R$)'], a1: 1, b1: nR(m[2]), a2: Number(m[3]), final: r, pag: 6 });
  if ((m = /^Um carro anda (\d+) km em 1 hora\. Quantos km anda em (\d+) horas\?$/.exec(en))) return r3calc({ perg: en, cab: ['horas', 'km'], a1: 1, b1: Number(m[1]), a2: Number(m[2]), final: r, pag: 7 });
  if ((m = /^Uma receita usa (\d+) ovos por bolo\. Quantos ovos para (\d+) bolos\?$/.exec(en))) return r3calc({ perg: en, cab: ['bolos', 'ovos'], a1: 1, b1: Number(m[1]), a2: Number(m[2]), final: r, pag: 7 });
  if ((m = /^(\d+) (\S+) custam R\$ ([\d,]+)\. Quanto custa 1 (\S+)\?$/.exec(en))) {
    const u = nR(r.replace('R$ ', '')), dec = !Number.isInteger(u);
    return r3calc({ perg: en, cab: [m[2], 'preço (R$)'], a1: Number(m[1]), b1: nR(m[3]), a2: 1, final: r, pag: dec ? 9 : 8, centavos: dec });
  }
  // PROMPT-218: direta ou inversa (páginas 1 a 4, sem conta)
  if (/São grandezas:?$/.test(en)) {
    if (/^Menos /.test(en) && /^Diretas$/i.test(r)) return [{ t: 'diminui', perg: PERG_10A.diminui, pag: 4 }];
    const inv = /^Inversas$/i.test(r); return [{ t: 'prop', tipo: inv ? 'inversa' : 'direta', perg: PERG_10A[inv ? 'inversa' : 'direta'], pag: inv ? 2 : 1 }];
  }
  if (/^Se .* dobra[m]?, /.test(en)) { const inv = /metade/.test(r); return [{ t: 'prop', tipo: inv ? 'inversa' : 'direta', perg: PERG_10A[inv ? 'inversa' : 'direta'], pag: inv ? 2 : 1 }]; }
  if ((m = /^Na tabela, a seta do x aponta para baixo\. (.+?) A seta .+ aponta:$/.exec(en)) && q.figura?.tipo === 'setas_r3') {
    const f = q.figura, inv = !!f.inversa, menos = /^Menos /.test(m[1]), dim = menos ? 'diminuem' : 'aumentam';
    const ex = { cap: m[1], cab: f.cab, lin: f.lin, inversa: inv,
      n2: inv ? `2º ${m[1]} Uma ${menos ? 'diminui' : 'aumenta'} e a outra ${menos ? 'aumenta' : 'diminui'}.` : `2º ${m[1]} As duas ${dim}.`,
      n3: inv ? `3º ${menos ? 'Uma sobe e a outra desce' : 'Diminui'}: a seta vai na direção contrária, para cima.` : `3º ${menos ? 'As duas andam juntas' : 'Aumenta'}: a seta vai na mesma direção da do x.` };
    return [{ t: 'setas', perg: en, [inv ? 'B' : 'A']: ex, ...(menos ? { resp: '<span>juntas: direta · contrárias: inversa</span>', regras: ['Andam juntas (as duas sobem ou as duas descem): mesma direção, direta. Uma sobe e a outra desce: contrária, inversa.'] } : {}), pag: 3 }];
  }
  if ((m = /^(\d+) (\S+) custam R\$ ([\d,]+)\. Quanto custam (\d+) \S+\?$/.exec(en))) return r3calc({ perg: en, cab: [m[2], 'preço (R$)'], a1: Number(m[1]), b1: nR(m[3]), a2: Number(m[4]), final: r, pag: 10 });
  if ((m = /^1 pacote tem (\d+) biscoitos\. Quantos biscoitos há em (\d+) pacotes\?$/.exec(en))) return r3calc({ perg: en, cab: ['pacotes', 'biscoitos'], a1: 1, b1: Number(m[1]), a2: Number(m[2]), final: r, pag: 6 });
  if ((m = /^(\d+) kg de \S+ custam R\$ ([\d,]+)\. Quanto custa 1 kg\?$/.exec(en))) { const u = nR(r.replace('R$ ', '')), dec = !Number.isInteger(u); return r3calc({ perg: en, cab: ['kg', 'preço (R$)'], a1: Number(m[1]), b1: nR(m[2]), a2: 1, final: r, pag: dec ? 9 : 8, centavos: dec }); }
  if ((m = /^(\d+) kg de carne custam R\$ (\d+)\. Quanto custam (\d+) kg\?$/.exec(en))) return r3calc({ perg: en, cab: ['kg', 'preço (R$)'], a1: Number(m[1]), b1: Number(m[2]), a2: Number(m[3]), final: r, pag: 10 });
  if ((m = /^(\d+) litros? de suco enchem? (\d+) copos\. Quantos copos (\d+) litros enchem\?$/.exec(en))) return r3calc({ perg: en, cab: ['litros', 'copos'], a1: Number(m[1]), b1: Number(m[2]), a2: Number(m[3]), final: r, pag: 10 });
  if ((m = /^(\d+) (?:pessoa pinta|pessoas pintam) um muro em (\d+) dias\. Em quantos dias (\d+) pessoas pintam\?$/.exec(en))) return r3calc({ perg: en, cab: ['pessoas', 'dias'], a1: Number(m[1]), b1: Number(m[2]), a2: Number(m[3]), inversa: true, final: r, pag: 11 });
  if ((m = /^(\d+) pedreiros levam (\d+) dias para fazer um muro\. Quantos dias levam (\d+) pedreiros\?$/.exec(en))) return r3calc({ perg: en, cab: ['pedreiros', 'dias'], a1: Number(m[1]), b1: Number(m[2]), a2: Number(m[3]), inversa: true, final: r, pag: 11 });
  if ((m = /^(\d+) máquinas fazem (\d+) peças em (\d+) horas\. Quantas peças (\d+) máquinas fazem em (\d+) horas\?$/.exec(en))) {
    const [M1, P1, H1, M2, H2] = m.slice(1).map(Number), k = M1 * H1, tot = P1 * M2 * H2;
    return [{ t: 'r3comp', perg: en, cab: ['máquinas', 'horas', 'peças'], lin: [[M1, H1, P1], [M2, H2, 'x']],
      porque: `${M2 > M1 ? 'mais' : 'menos'} máquinas e ${H2 > H1 ? 'mais' : 'menos'} horas, ${M2 * H2 > k ? 'mais' : 'menos'} peças: as duas diretas`,
      linhas: [`${M1} · ${H1} · x = ${P1} · ${M2} · ${H2}`, `${k}x = ${tot}`, `x = ${tot} ÷ ${k}`], final: r, resp: `<span>${r}</span>`, pag: 12 }];
  }
  return null;
}
// 10-B: a página termina na conta ("a conta é …"), tirada do cruzado
function r3conta({ perg, cab, a1, b1, a2, inversa = false, pag }) {
  const { c, o, eq } = cruzado(a1, b1, a2, inversa);
  const conta = c === 1 ? `x = ${inversa ? `${fR(b1)} × ${fR(o)}` : `${fR(o)} × ${fR(b1)}`}` : o === 1 ? `x = ${fR(b1)} ÷ ${fR(c)}` : `x = ${fR(b1)} × ${fR(o)} ÷ ${fR(c)}`;
  const linhas = c !== 1 && o === 1 ? [eq, `${fR(c)}x = ${fR(b1)}`] : [eq];
  return [{ t: 'r3', perg, cab, lin: [[a1, fR(b1)], [a2, 'x']], inversa, porque: porqueR3(cab[0], cab[1], a2 > a1, inversa, false), linhas, conta, pag }];
}
const pagDir = (a1, a2) => (a1 === 1 ? 1 : a2 === 1 ? 2 : 6);
const pagInv = (a1, a2) => (a1 === 1 && a2 > 1 ? 3 : a2 === 1 ? 4 : 8);
const DIRETAS_10B = [
  [/^Uma receita usa (\d+) xícaras de farinha por bolo\. Para (\d+) bolos/, ['bolos', 'xícaras'], (x) => [1, x[1], x[2]]],
  [/^Um carro anda (\d+) km em 1 hora\. Para saber quanto anda em (\d+) horas/, ['horas', 'km'], (x) => [1, x[1], x[2]]],
  [/^1 caixa tem (\d+) ovos\. Para saber quantos ovos há em (\d+) caixas/, ['caixas', 'ovos'], (x) => [1, x[1], x[2]]],
  [/^1 garrafa enche (\d+) copos\. Para saber quantos copos (\d+) garrafas enchem/, ['garrafas', 'copos'], (x) => [1, x[1], x[2]]],
  [/^Escrevo (\d+) palavras por minuto\. Para saber quantas escrevo em (\d+) minutos/, ['minutos', 'palavras'], (x) => [1, x[1], x[2]]],
  [/^Uma receita para (\d+) pessoas usa (\d+) xícaras\. Para (\d+) pessoas/, ['pessoas', 'xícaras'], (x) => [x[1], x[2], x[3]]],
];
function quadro10b(q) {
  const en = String(q.enunciado || '').trim();
  let m;
  if (/^Se a velocidade dobra/.test(en)) return [{ t: 'r3', perg: 'A 60 km/h, uma viagem leva 4 horas. E a 120 km/h (o dobro)?', cab: ['km/h', 'horas'], lin: [[60, 4], [120, 'x']], inversa: true,
    porque: 'Mais velocidade, MENOS tempo: inversas.', linhas: ['120 · x = 60 · 4', '120x = 240'], conta: 'x = 240 ÷ 120 = 2', extraNota: 'velocidade dobra → tempo cai pela metade',
    regras: ['Velocidade e tempo são inversas: uma dobra, a outra cai pela metade.'], pag: 5 }];
  if ((m = /^No mapa, (\d+) cm valem? (\d+) km\. (?:Para saber quanto valem|Qual conta dá quantos km valem) (\d+) cm/.exec(en))) return r3conta({ perg: en, cab: ['cm no mapa', 'km'], a1: Number(m[1]), b1: Number(m[2]), a2: Number(m[3]), pag: 7 });
  if ((m = /^(\d+) (\S+) custam? R\$ ([\d,]+)\. (?:Para achar o preço de|Qual conta dá o preço de) (\d+) ([^\s,:?]+)/.exec(en))) {
    const a1 = Number(m[1]), a2 = Number(m[4]);
    return r3conta({ perg: en, cab: [a1 > 1 ? m[2] : m[5], 'preço (R$)'], a1, b1: nR(m[3]), a2, pag: pagDir(a1, a2) });
  }
  for (const [re, cab, f] of DIRETAS_10B) if ((m = re.exec(en))) { const [a1, b1, a2] = f(m).map(Number); return r3conta({ perg: en, cab, a1, b1, a2, pag: pagDir(a1, a2) }); }
  if ((m = /^(\d+) amigos dividem uma pizza e cada um come (\d+) pedaços\. Se forem (\d+) amigos/.exec(en))) { const a1 = Number(m[1]), a2 = Number(m[3]); return r3conta({ perg: en, cab: ['amigos', 'pedaços'], a1, b1: Number(m[2]), a2, inversa: true, pag: pagInv(a1, a2) }); }
  if ((m = /^(\d+) (\S+) .*?(\d+) (dias|horas)\. (?:Para saber o tempo de|Qual conta dá o tempo com) (\d+)/.exec(en))) {
    const a1 = Number(m[1]), a2 = Number(m[5]);
    return r3conta({ perg: en, cab: [PLURAL[m[2]] || m[2], m[4]], a1, b1: Number(m[3]), a2, inversa: true, pag: pagInv(a1, a2) });
  }
  return null;
}
// 🧑‍🏫 PROMPT-216: as cenas do quadro do mapa 11 (com os números da questão), pelo enunciado e pela figura; pag = a página do resumo
const nBr = (t) => Number(String(t).replace(',', '.'));
const NOME_LADOS = { 'triângulo': 3, 'quadrado': 4, 'pentágono': 5, 'hexágono': 6, 'heptágono': 7, 'octógono': 8, 'decágono': 10 };
const UNI = { 'milímetros': 'mm', 'mm': 'mm', 'centímetros': 'cm', 'cm': 'cm', 'metros': 'm', 'm': 'm', 'quilômetros': 'km', 'km': 'km' };
function quadro11a(q) {
  const en = String(q.enunciado || '').trim();
  let m;
  const um = (c, pag) => [{ ...c, pag }];
  if ((m = /^Qual é o perímetro de um quadrado de lado (\d+(?:,\d+)?) cm\?$/.exec(en))) { const l = nBr(m[1]); return um({ t: 'perim', forma: 'quadrado', l }, Number.isInteger(l) ? 1 : 2); }
  if ((m = /^Qual é o perímetro de um retângulo de (\d+(?:,\d+)?) cm por (\d+(?:,\d+)?) cm\?$/.exec(en))) return um({ t: 'perim', forma: 'retangulo', a: nBr(m[1]), b: nBr(m[2]) }, 3);
  if ((m = /^Qual é o perímetro de um triângulo de lados (\d+(?:,\d+)?) cm, (\d+(?:,\d+)?) cm e (\d+(?:,\d+)?) cm\?$/.exec(en))) return um({ t: 'perim', forma: 'triangulo', lados: [m[1], m[2], m[3]].map(nBr) }, 4);
  if ((m = /^Qual é o perímetro de um (\S+) com (\d+) lados iguais de (\d+(?:,\d+)?) cm\?$/.exec(en))) return um({ t: 'iguais', nome: m[1], n: Number(m[2]), l: nBr(m[3]) }, 5);
  if ((m = /^Um terreno retangular tem (\d+) m por (\d+) m\. Quantos metros de cerca/.exec(en))) return um({ t: 'perim', forma: 'retangulo', a: Number(m[1]), b: Number(m[2]), cerca: true }, 6);
  if ((m = /^Dei uma volta numa quadra quadrada de lado (\d+) m\./.exec(en))) return um({ t: 'volta', l: Number(m[1]) }, 7);
  if ((m = /^Um quadrado tem perímetro (\d+) cm\. Quanto mede cada lado\?$/.exec(en))) return um({ t: 'ladoq', p: Number(m[1]) }, 8);
  if ((m = /^Um retângulo tem perímetro (\d+) cm e um dos lados mede (\d+) cm\./.exec(en))) return um({ t: 'lador', p: Number(m[1]), a: Number(m[2]) }, 9);
  if (/^1 (metro|quilômetro|centímetro) tem quantos/.test(en)) return um({ t: 'medidas' }, 10);
  if ((m = /^(\d+) (cm|m|km|mm) são quantos (milímetros|centímetros|metros|quilômetros|mm|cm|m|km)\?$/.exec(en))) return um({ t: 'trocar', casos: [{ v: Number(m[1]), de: m[2], para: UNI[m[3]] }] }, 11);
  if (/^Um ângulo reto mede/.test(en)) return um({ t: 'tiposang', g: 90 }, 12);
  if ((m = /^Um ângulo de (\d+)° é:?$/.exec(en))) return um({ t: 'tiposang', g: Number(m[1]) }, 12);
  if (/^Quantos lados tem um \S+\?$/.test(en) || /^Um polígono de \d+ lados se chama:?$/.test(en)) return um({ t: 'poligonos' }, 13);
  if (/^Qual quadrilátero tem/.test(en)) return um({ t: 'quadrilateros' }, 14);
  if ((m = /^Um triângulo tem ângulos de (\d+)° e (\d+)°\./.exec(en))) return um({ t: 'faltatri', a: Number(m[1]), b: Number(m[2]) }, 16);
  if ((m = /^Um quadrilátero tem ângulos de (\d+)°, (\d+)° e (\d+)°\./.exec(en))) return um({ t: 'faltaquad', angs: [m[1], m[2], m[3]].map(Number) }, 18);
  return null;
}
function quadro11b(q) {
  const en = String(q.enunciado || '').trim(), f = q.figura || {};
  let m;
  const um = (c, pag) => [{ ...c, pag }];
  if (/^Uma figura é formada por \d+ quadradinhos/.test(en) && f.c && f.l) return um({ t: 'area', c: f.c, l: f.l }, 1);
  if ((m = /^Qual é a área de um retângulo de (\d+) cm por (\d+) cm\?$/.exec(en))) return um({ t: 'arear', c: Number(m[1]), l: Number(m[2]) }, 2);
  if ((m = /^Um piso tem (\d+) fileiras com (\d+) lajotas cada\./.exec(en))) return um({ t: 'lajotas', c: Number(m[2]), l: Number(m[1]) }, 3);
  if ((m = /^Qual é a área de um quadrado de lado (\d+) cm\?$/.exec(en))) return um({ t: 'arear', c: Number(m[1]), l: Number(m[1]), quadrado: true }, 4);
  if (f.tipo === 'medida' || /^(Área|Perímetro) é medid[ao] em:?$/.test(en)) return um({ t: 'areaper' }, 5);
  if (f.tipo === 'compara_area' && f.figuras?.length === 2) { const [x, y] = f.figuras; return um({ t: 'comparaa', a: [x.c, x.l], b: [y.c, y.l], ...(x.nome && y.nome ? { perg: `${en}|{A:${x.nome}} ou|{B:${y.nome}}` } : {}) }, 6); }
  if ((m = /^Qual é a área de um triângulo de base (\d+) cm e altura (\d+) cm\?$/.exec(en))) return um({ t: 'areat', b: Number(m[1]), h: Number(m[2]) }, 7);
  if ((m = /^Qual é a área de um paralelogramo de base (\d+) cm e altura (\d+) cm\?$/.exec(en))) return um({ t: 'areap', b: Number(m[1]), h: Number(m[2]) }, 8);
  if ((m = /^Uma sala retangular tem (\d+) m por (\d+) m\./.exec(en))) return um({ t: 'arear', c: Number(m[1]), l: Number(m[2]), unid: 'm', sala: true }, 9);
  if ((m = /^Um terreno de (\d+) m por (\d+) m tem grama/.exec(en))) return um({ t: 'metade', c: Number(m[1]), l: Number(m[2]) }, 10);
  if ((m = /^Um quadrado tem área (\d+) cm²\. Quanto mede o lado\?$/.exec(en))) { const l = Math.round(Math.sqrt(Number(m[1]))); return l * l === Number(m[1]) ? um({ t: 'ladoa', l }, 11) : null; }
  return null;
}
// 🧑‍🏫 PROMPT-215: as cenas do quadro do mapa 12 (o plano do tamanho da questão), pelo plano da pergunta (q.plano) e pelo enunciado
const nCoord = (t) => Number(String(t).replace(/−/g, '-'));
const ptDe = (t) => { const m = /^\((−?-?\d+), (−?-?\d+)\)$/.exec(String(t ?? '').trim()); return m ? [nCoord(m[1]), nCoord(m[2])] : null; };
const ptOk = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
function quadro12a(q) {
  const en = String(q.enunciado || '').trim(), pl = q.plano || {}, P = ptOk(pl.ponto) ? pl.ponto.map(Number) : null;
  let m;
  if (pl.mostra === 'origem' || /^Qual ponto é a origem\?$/.test(en)) return [{ t: 'plano' }];
  if ((m = /^No ponto \((−?\d+), (−?\d+)\), qual é o valor de (x|y)\?$/.exec(en))) {
    const [x, y] = [nCoord(m[1]), nCoord(m[2])];
    return x < 0 || y < 0 ? [{ t: 'negativos', anda: [x, y], valor: [x, y, m[3]] }] : [{ t: 'valor', x, y, q: m[3] }];
  }
  if ((m = /^O ponto \((−?\d+), (−?\d+)\) fica sobre qual eixo\?$/.exec(en))) return [{ t: 'eixos', pts: [[nCoord(m[1]), nCoord(m[2])]] }];
  if ((m = /^Qual ponto tem x = (−?\d+) e y = (−?\d+)\?$/.exec(en))) return [{ t: 'ordem', x: nCoord(m[1]), y: nCoord(m[2]) }];
  if ((m = /^Qual ponto fica mais (à direita|acima)\?$/.exec(en))) {
    const a = ptDe(q.resposta), b = ptDe(q.erradas?.[0]);
    return a && b ? [{ t: 'maislado', a, b, q: m[1] === 'acima' ? 'y' : 'x' }] : null;
  }
  if ((m = /^Em qual quadrante fica o ponto \((−?\d+), (−?\d+)\)\?$/.exec(en)) || (pl.mostra === 'quadrantes' && P)) {
    const p = m ? [nCoord(m[1]), nCoord(m[2])] : P;
    return p[0] && p[1] ? [{ t: 'quadrantes', p }] : null;
  }
  return null;
}
function quadro12b(q, sua) {
  const en = String(q.enunciado || '').trim(), pl = q.plano || {};
  let m;
  if ((m = /^Para ir de (\(.+?\)) até (\(.+?\)), ando:$/.exec(en))) {
    const de = ptDe(m[1]), ate = ptDe(m[2]);
    return de && ate ? [{ t: 'caminho', de, ate }] : null;
  }
  if (!/Onde paro\?$/.test(en)) return null;
  // partida e movimentos: do plano da pergunta; senão, do enunciado
  let de = ptOk(pl.partida) ? pl.partida.map(Number) : null, dx = 0, dy = 0;
  if (de && Array.isArray(pl.mov)) pl.mov.forEach(([a, b, k]) => { dx += a * k; dy += b * k; });
  else {
    m = /^Saindo (?:da origem|de (\(.+?\))), ando (.+)\. Onde paro\?$/.exec(en);
    if (!m) return null;
    de = m[1] ? ptDe(m[1]) : [0, 0];
    for (const [, n, d] of m[2].matchAll(/(\d+) para (?:a |)(direita|esquerda|cima|baixo)/g)) { const v = Number(n); if (d === 'direita') dx += v; if (d === 'esquerda') dx -= v; if (d === 'cima') dy += v; if (d === 'baixo') dy -= v; }
  }
  if (!de || (!dx && !dy)) return null;
  const x = de[0] + dx, y = de[1] + dy, origem = !de[0] && !de[1];
  // marcou o ponto com x e y trocados? a página da pegadinha (12-B p.7)
  const sp = ptDe(sua), trocou = sp && x !== y && sp[0] === y && sp[1] === x;
  const pag = trocou ? 7 : [de[0], de[1], x, y].some(v => v < 0) ? 5 : origem ? (dx && dy ? 1 : 2) : dx < 0 || dy < 0 ? 4 : 3;
  return [{ t: 'andar', casos: [{ de, dx, dy }], troca: !!trocou, pag }];
}
// 🧑‍🏫 PROMPT-208: as cenas do quadro do 13-A (média, moda, mediana), pelo enunciado
const listaDe = (t) => String(t).split(/,\s*|\s+e\s+/).map(Number);
const modasDe = (l) => { const n = new Map(); l.forEach(v => n.set(v, (n.get(v) || 0) + 1)); const mx = Math.max(...n.values()); return mx > 1 ? [...n].filter(([, k]) => k === mx).map(([v]) => v) : []; };
const PROB_MEDIA = [
  [/^As idades de (\d+) amigos são (.+) anos\. Qual é a média de idade\?$/, (n) => ({ enun: `Idades de ${n} amigos:`, pergunta: 'Qual é a média de idade?', soma: 'Soma todas as idades.', quem: 'amigos', rotulo: 'média de idade', unidade: ' anos' })],
  [/^Num jogo, um time fez (.+) pontos em (\d+) partidas\. Qual a média de pontos por partida\?$/, (n) => ({ enun: `Pontos em ${n} partidas:`, pergunta: 'Qual é a média de pontos?', soma: 'Soma todos os pontos.', quem: 'partidas', rotulo: 'média', unidade: ' pontos' }), true],
  [/^Em (\d+) dias, choveu (.+) milímetros\. Qual foi a média por dia\?$/, (n) => ({ enun: `Chuva em ${n} dias (mm):`, pergunta: 'Qual é a média por dia?', soma: 'Soma toda a chuva.', quem: 'dias', rotulo: 'média por dia', unidade: ' mm' })],
];
function quadro13a(q) {
  const en = String(q.enunciado || '').trim();
  const ok = (l) => l.length >= 2 && l.every(Number.isFinite);
  let m = /^Qual é a diferença entre a média e a mediana de (.+)\?$/.exec(en);
  if (m) { const l = listaDe(m[1]); return ok(l) && l.length % 2 ? [{ t: 'medcomp', l }] : null; }
  m = /^Qual é a média (?:de|das notas) (.+)\?$/.exec(en) || /^Tirei (\d+ e \d+) em duas provas\. Qual a minha média\?$/.exec(en);
  if (m) {
    const l = listaDe(m[1]), n = l.length, r = ok(l) ? l.reduce((a, b) => a + b, 0) % n : 0;
    return ok(l) && (r * 10) % n === 0 ? [{ t: 'media', l }] : null;   // a vírgula com uma casa só (o resto vezes 10 divide)
  }
  for (const [re, ctx, invertido] of PROB_MEDIA) {
    m = re.exec(en);
    if (!m) continue;
    const [nTxt, lTxt] = invertido ? [m[2], m[1]] : [m[1], m[2]], l = listaDe(lTxt);
    // PROMPT-214: o problema de média abre a página 1 (a média), com os números e a pergunta da questão (perg, em quadroComoFaz)
    return ok(l) && l.length === Number(nTxt) && l.reduce((a, b) => a + b, 0) % l.length === 0 ? [{ t: 'media', l }] : null;
  }
  m = /^Qual é a moda de (.+)\?$/.exec(en);
  if (m) { const l = listaDe(m[1]); return ok(l) ? [{ t: 'moda', l }] : null; }
  m = /^Qual é a mediana de (.+?)\?(?: \(organize antes\))?$/.exec(en);
  if (m) { const l = listaDe(m[1]); return ok(l) ? [{ t: 'mediana', l }] : null; }
  m = /^A média de (\d+) provas foi (\d+)\. Duas notas foram (\d+) e (\d+)\. Qual foi a terceira\?$/.exec(en);
  if (m) return Number(m[1]) === 3 ? [{ t: 'notafalta', m: Number(m[2]), k: 3, notas: [Number(m[3]), Number(m[4])] }] : null;
  return null;
}
// 🧑‍🏫 PROMPT-208: as cenas do quadro do 13-B, pelo enunciado e pela tabela que o personagem sorteou (q.tabela)
function quadro13b(q) {
  const tab = q.tabela;
  if (!tab?.linhas?.length || !tab.colunas?.length) return null;
  const en = String(q.enunciado || '').trim(), it = tab.linhas.map(l => String(l[0])), J = tab.colunas.length > 2 ? tab.colunas.length - 1 : 1;
  const base = { tab: { titulo: tab.titulo, colunas: tab.colunas, linhas: tab.linhas }, enun: en };
  // as linhas citadas, na ordem em que aparecem no enunciado
  const citadas = () => it.map((nm, i) => ({ i, p: en.toLowerCase().indexOf(nm.toLowerCase()) })).filter(x => x.p >= 0).sort((a, b) => a.p - b.p).map(x => x.i);
  const col = (nome) => tab.colunas.findIndex(c => c.toLowerCase() === nome);
  let m;
  if (en === 'Qual afirmação é verdadeira?') {
    const fs = [q.resposta, ...(q.erradas || [])].sort((a, b) => String(a).localeCompare(String(b), 'pt'));
    const fr = fs.map(f => { const c = conferirAfirmacao(tab, f); return c && [f, c.cels, c.conta, c.ok]; });
    return fr.every(Boolean) && fr.filter(f => f[3]).length === 1 ? [{ t: 'afirma', ...base, frases: fr }] : null;
  }
  if (J === 3) {   // dupla entrada: Meninos | Meninas | Total
    if ((m = /^Quantas meninas escolheram (.+)\?$/.exec(en))) { const [i] = citadas(); return i == null ? null : [{ t: 'dupla', tab: base.tab, partes: [{ t: 'cel', i, j: col('meninas'), enun: en }] }]; }
    if (/mais votado somando/.test(en)) return [{ t: 'dupla', tab: base.tab, partes: [{ t: 'maxTotal', j: 3, enun: en }] }];
    if ((m = /^Quant[oa]s (meninos|meninas) votaram ao todo\?$/.exec(en))) return [{ t: 'dupla', tab: base.tab, partes: [{ t: 'col', j: col(m[1]), enun: en }] }];
    if ((m = /quantos votos de (meninos|meninas) a mais que de (meninos|meninas)\?$/.exec(en))) { const [i] = citadas(); return i == null ? null : [{ t: 'dupla', tab: base.tab, partes: [{ t: 'difLinha', i, a: col(m[1]), b: col(m[2]), enun: en }] }]; }
  }
  if (/porcentagem/i.test(en)) { const [i] = citadas(); return i == null ? null : [{ t: 'pcttab', ...base, i, j: J }]; }
  if (/fração/i.test(en)) { const [i] = citadas(); return i == null ? null : [{ t: 'fractab', ...base, i, j: J }]; }
  if (/média/i.test(en)) return [{ t: 'mediatab', ...base, j: J }];
  if (/empatar|a mais que/.test(en)) { const [a, b] = citadas(); return b == null ? null : [{ t: 'amais', tab: base.tab, j: J, casos: [{ a, b, enun: en, empate: /empatar/.test(en) }] }]; }
  if (/(?:vendeu|teve|saíram) (mais|menos)(?: votos| gols)?\?$/.test(en) && J === 1) return [{ t: 'maior', ...base, j: J, menor: /menos(?: votos| gols)?\?$/.test(en) }];
  if ((m = /^Quantas unidades de (.+) foram vendidas\?$/.exec(en))) { const [i] = citadas(); return i == null ? null : [{ t: 'ler', ...base, i, j: J }]; }
  if (/no total\?$|ao todo\?$|na semana\?$/.test(en)) return [{ t: 'total', ...base, j: J }];
  return null;
}
// PROMPT-206: as cenas do quadro do 4-A, pela figura da questão (ou pelo enunciado: × e ÷ de frações)
function quadro4a(q) {
  const en = String(q.enunciado || '').trim(), f = q.figura;
  const mx = /^(\d+)\/(\d+)\s*([×÷])\s*(\d+)\/(\d+)$/.exec(en);
  if (mx) { const [a, b, c, d] = [mx[1], mx[2], mx[4], mx[5]].map(Number); return [{ t: mx[3] === '×' ? 'multfr' : 'divfr', a, b, c, d }]; }
  if (!f?.tipo) return null;
  switch (f.tipo) {
    case 'barras_iguais': { const k = f.para[0] / f.de[0]; return Number.isInteger(k) && f.para[1] === f.de[1] * k ? [{ t: 'equiv', a: f.de[0], b: f.de[1], k }] : null; }
    case 'simplificar': return [{ t: 'simplif', n: f.fr[0], d: f.fr[1] }];
    case 'soma_fracao': {
      const [a, d] = f.a, [b, db] = f.b, op = f.op === '−' ? '−' : '+';
      if (d === db) { const r = op === '+' ? a + b : a - b; return [{ t: 'mesmoden', a, b, d, op, simplifica: !!f.res && (f.res[0] !== r || f.res[1] !== d) }]; }
      return op === '+' ? [{ t: 'dendif', p: a, a: d, r: b, b: db }] : null;
    }
    case 'parte_de': return [{ t: 'partede', p: f.num, q: f.den, N: f.total, metade: /metade/i.test(en) }];
    case 'compara_fracoes': { const fr = f.fracoes || []; return fr.length === 2 && fr.every(x => x[0] === 1) ? [{ t: 'compunit', a: fr[0][1], b: fr[1][1] }] : null; }
    case 'pizza': return [{ t: 'fracao', n: f.comidos, d: f.n, pizza: true }];
    default: return null;
  }
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

// ═══════════════ PROMPT-197: mapas 5 a 8 (o "como faz" do cartão do erro, só o jeito certo, com os números da questão) ═══════════════
const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const deSup = (s) => Number([...String(s)].map(c => SUPS.indexOf(c)).join(''));
const sup = (n) => [...String(n)].map(d => SUPS[+d]).join('');
const certo = (v) => ({ t: 'linha', v: String(v), classe: 'certo' });
const vezes = (b, k) => Array(k).fill(b).join(' × ');
const RX_POT = /^(\(−\d+\)|\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/;   // 2³ · (−2)²
const valorPot = (b, k) => { let v = 1; for (let i = 0; i < k; i++) v *= b; return v; };
const lerBase = (s) => Number(String(s).replace(/[()]/g, '').replace('−', '-'));

// ── 5-A / 5-B: potências e raízes ──
function potencia(tb, ts) {   // "2³": a base repetida e a conta crescendo (de dois em dois)
  const b = lerBase(tb), k = deSup(ts);
  if (k === 0) return [{ t: 'linha', v: `${tb}${ts}` }, certo(`${tb}${ts} = 1`), { t: 'texto', v: 'Elevado a 0 dá 1' }];
  if (k === 1) return [{ t: 'linha', v: `${tb}${ts}` }, certo(`${tb}${ts} = ${num(b)}`), { t: 'texto', v: 'Elevado a 1 é ele mesmo' }];
  if (b === 10) return [{ t: 'linha', v: `10${ts}` }, { t: 'linha', v: `1 e ${k} zeros` }, certo(`1${'0'.repeat(k)}`)];
  const ps = [{ t: 'linha', v: `${tb}${ts}` }];
  if (k <= 5) ps.push({ t: 'bloco', titulo: `1º Escreve a base ${k} vezes` }, { t: 'linha', v: vezes(tb, k) },
    { t: 'bloco', titulo: '2º Multiplica de dois em dois' }, { t: 'expressao', v: vezes(tb, k) });   // PROMPT-203
  else ps.push({ t: 'linha', v: vezes(tb, k) }, certo(num(valorPot(b, k))));
  if (b < 0) ps.push({ t: 'texto', v: k % 2 ? 'Expoente ímpar: fica −' : 'Expoente par: fica +' });
  return ps;
}
function gin5(q) {
  const E = String(q.enunciado || '').trim(), e = limpa(E).replace(/:$/, '').trim();
  let m = RX_POT.exec(e);
  if (m) return potencia(m[1], m[2]);
  if ((m = /^√(\d+)$/.exec(e))) {
    const n = Number(m[1]), r = Math.round(Math.sqrt(n));
    if (r * r !== n) return null;
    if (r <= 12) return [{ t: 'linha', v: `√${n}` }, { t: 'linha', v: `? × ? = ${n}` }, { t: 'tabuada', quadrados: true, procura: [n] }, { t: 'linha', v: `${r} × ${r} = ${n}` }, certo(`√${n} = ${r}`)];   // PROMPT-203
    return [{ t: 'linha', v: `√${n}` }, { t: 'linha', v: `? × ? = ${n}` }, ...(r > 1 ? [{ t: 'linha', v: `${r - 1} × ${r - 1} = ${(r - 1) ** 2}`, classe: 'errado' }] : []), { t: 'linha', v: `${r} × ${r} = ${n}` }, certo(`√${n} = ${r}`)];
  }
  if ((m = /^(\S+) é o mesmo que$/.exec(e)) && (m = RX_POT.exec(m[1]))) {
    const k = deSup(m[2]);
    return [{ t: 'linha', v: m[1] + m[2] }, { t: 'texto', v: 'O expoente diz quantas vezes' }, certo(vezes(m[1], k))];
  }
  if ((m = /^([\d ×]+) em forma de potência$/.exec(e))) {
    const fs = m[1].split('×').map(s => s.trim()).filter(Boolean);
    if (!fs.length || fs.some(f => f !== fs[0])) return null;
    return [{ t: 'linha', v: m[1].trim() }, { t: 'texto', v: 'Quantas vezes? Esse é o expoente' }, certo(`${fs[0]}${sup(fs.length)}`)];
  }
  if ((m = /potência (\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+), qual número é a base/.exec(E)))
    return [{ t: 'linha', v: m[1] + m[2] }, { t: 'texto', v: 'base: o grande · expoente: o pequeno' }, certo(`base = ${m[1]}`)];
  // duas partes: 3² + 2³ · √49 − 2³ (cada uma vira número, depois a conta)
  const t = e.split(/\s+/);
  if (t.length === 3 && ['+', '−'].includes(t[1])) {
    const val = (x) => { let r; if ((r = RX_POT.exec(x))) return valorPot(lerBase(r[1]), deSup(r[2])); if ((r = /^√(\d+)$/.exec(x))) { const s = Math.sqrt(+r[1]); return Number.isInteger(s) ? s : NaN; } return NaN; };
    const a = val(t[0]), b = val(t[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const r = t[1] === '+' ? a + b : a - b;
    const parte = (x, v) => {   // PROMPT-203: cada potência / raiz no seu bloco
      let q2;
      if ((q2 = RX_POT.exec(x))) { const k = deSup(q2[2]); return k >= 2 && k <= 5 ? [{ t: 'expressao', v: vezes(q2[1], k) }, certo(`${x} = ${num(v)}`)] : [certo(`${x} = ${num(v)}`)]; }
      if ((q2 = /^√(\d+)$/.exec(x)) && v <= 12) return [{ t: 'tabuada', quadrados: true, procura: [Number(q2[1])] }, certo(`${x} = ${num(v)}`)];
      return [certo(`${x} = ${num(v)}`)];
    };
    return [{ t: 'linha', v: e }, { t: 'bloco', titulo: `1º ${t[0]}` }, ...parte(t[0], a), { t: 'bloco', titulo: `2º ${t[2]}` }, ...parte(t[2], b),
      { t: 'bloco', titulo: `3º ${t[1] === '+' ? 'Soma' : 'Subtrai'}` }, certo(`${num(a)} ${t[1]} ${num(b)} = ${num(r)}`)];
  }
  return null;
}

// ── 6-A / 6-B: múltiplos e divisores (a divisão armada mostra o resto) ──
const somaAlg = (x) => [...String(x)].reduce((s, d) => s + +d, 0);
const regrinha = (n, x) => (n === 2 ? `termina em ${String(x).slice(-1)}: ${x % 2 ? 'ímpar' : 'par'}` : n === 5 || n === 10 ? `termina em ${String(x).slice(-1)}` :
  n === 3 || n === 9 ? `${[...String(x)].join(' + ')} = ${somaAlg(x)}` : '');
const divisores = (n) => { const d = []; for (let i = 1; i <= n; i++) if (n % i === 0) d.push(i); return d; };
const paresDiv = (n) => { const p = []; for (let i = 1; i * i <= n; i++) if (n % i === 0) p.push(`${i} × ${n / i}`); return p; };
function gin6(q) {
  const E = String(q.enunciado || '').trim(), R = String(q.resposta ?? '');
  let m;
  if ((m = /^(\d+) é (múltiplo|divisor) de (\d+)\?$/.exec(E))) {
    const [a, b] = m[2] === 'múltiplo' ? [+m[1], +m[3]] : [+m[3], +m[1]], resto = a % b, rg = m[2] === 'múltiplo' ? regrinha(b, a) : '';
    if (!b) return null;
    return [{ t: 'divisao', a, b }, ...(rg ? [{ t: 'linha', v: rg }] : []), certo(resto ? `sobra ${resto}: Não` : 'resto 0: Sim')];
  }
  if ((m = /^Qual (NÃO )?é divisor de (\d+)\?$/.exec(E))) {
    const n = +m[2], ops = [R, ...(q.erradas || [])].map(Number).filter(x => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
    if (ops.length < 2 || !ops.includes(Number(R))) return null;
    return [{ t: 'linha', v: `${n} ÷ ?` }, { t: 'tabela', linhas: ops.map(o => (n % o ? `${n} ÷ ${o}: sobra ${n % o}` : `${n} ÷ ${o} = ${n / o}`)) }, { t: 'acende', i: ops.indexOf(Number(R)) }, certo(R)];
  }
  if ((m = /^Qual é múltiplo de (\d+) e de (\d+) ao mesmo tempo\?$/.exec(E))) {
    const r = Number(R), a = +m[1], b = +m[2];
    if (!Number.isFinite(r) || r % a || r % b) return null;
    return [{ t: 'linha', v: `${r} ÷ ${a} = ${r / a}` }, { t: 'linha', v: `${r} ÷ ${b} = ${r / b}` }, certo(`${r}: não sobra nos dois`)];
  }
  if ((m = /^Qual é múltiplo de (\d+)\?$/.exec(E))) {
    const n = +m[1], r = Number(R), k = r / n;
    if (!Number.isInteger(k) || k < 1) return null;
    return [{ t: 'linha', v: `tabuada do ${n}` }, ...(k <= 10 ? [{ t: 'linha', v: Array.from({ length: k }, (_, i) => n * (i + 1)).join(', ') }] : []), certo(`${n} × ${k} = ${r}`)];
  }
  if ((m = /^Quais são os (\d+) primeiros múltiplos de (\d+)/.exec(E))) {
    const k = +m[1], n = +m[2];
    if (k > 10) return null;
    return [{ t: 'tabela', linhas: Array.from({ length: k }, (_, i) => `${n} × ${i + 1} = ${n * (i + 1)}`) }, ...Array.from({ length: k }, (_, i) => ({ t: 'acende', i, soma: true, ms: 450 })), certo(R)];
  }
  if (/^1 é divisor de qualquer número\?$/.test(E)) return [{ t: 'linha', v: '7 ÷ 1 = 7' }, { t: 'linha', v: '12 ÷ 1 = 12' }, certo('Sim: nunca sobra')];
  if ((m = /^(Quais são todos os divisores de|Quantos divisores tem o número) (\d+)\?$/.exec(E))) {
    const n = +m[2];
    if (!n || n > 200) return null;
    const ds = divisores(n);
    return [{ t: 'linha', v: `divisores de ${n}` }, { t: 'tabela', linhas: paresDiv(n) }, ...(/^Quantos/.test(E) ? [{ t: 'linha', v: ds.join(', ') }, certo(`${ds.length} divisores`)] : [certo(ds.join(', '))])];
  }
  return null;
}

// ── 7-A / 7-B: porcentagem (o atalho que serve; senão valor × decimal) ──
const dec100 = (p) => num(p / 100);
function atalhoPct(p, v) {   // passos de "p% de v"
  const r = arred(v * p / 100);
  if (p === 50) return [{ t: 'linha', v: '50% é a metade' }, { t: 'linha', v: `${num(v)} ÷ 2 = ${num(r)}` }];
  if (p === 10) return [{ t: 'linha', v: '10% é ÷ 10' }, { t: 'virgula', v: num(v), op: '÷', k: 10 }];   // PROMPT-200: a vírgula andando, com as frases
  if (p === 25) return [{ t: 'linha', v: '25% é ÷ 4' }, { t: 'linha', v: `${num(v)} ÷ 4 = ${num(r)}` }];
  if (p === 1) return [{ t: 'linha', v: '1% é ÷ 100' }, { t: 'virgula', v: num(v), op: '÷', k: 100 }];
  if (p === 100) return [{ t: 'linha', v: '100% é tudo' }, { t: 'linha', v: num(v) }];
  if (p % 10 === 0) { const d = arred(v / 10); return [{ t: 'linha', v: `10% = ${num(v)} ÷ 10 = ${num(d)}` }, { t: 'linha', v: `${p}% = ${num(d)} × ${p / 10} = ${num(r)}` }]; }
  if (p === 75) { const d = arred(v / 4); return [{ t: 'linha', v: `25% = ${num(v)} ÷ 4 = ${num(d)}` }, { t: 'linha', v: `75% = ${num(d)} × 3 = ${num(r)}` }]; }
  return [{ t: 'linha', v: `${p}% = ${dec100(p)}` }, { t: 'linha', v: `${num(v)} × ${dec100(p)} = ${num(r)}` }];
}
function lerPctDe(E) {   // "20% de 50", "de R$ 110 tem 50% de desconto", "turma de 32 alunos, 50% são…", "Comi 25% de uma pizza de 8 pedaços"
  let m = /(\d+)% de (?:R\$\s*)?(\d+(?:,\d+)?)/.exec(E);
  if (m) return { p: +m[1], v: numero(m[2]) };
  m = /(\d+)% de (?:uma|um) \S+ de (\d+)/.exec(E);
  if (m) return { p: +m[1], v: numero(m[2]) };
  m = /(?:R\$\s*|de |com )(\d+(?:,\d+)?)\b[^%]*?(\d+)%/.exec(E);
  return m ? { p: +m[2], v: numero(m[1]) } : null;
}
function gin7a(q) {
  const E = String(q.enunciado || '').trim(), R = String(q.resposta ?? '');
  let m;
  if ((m = /^(\d+)% é igual a qual fração\?$/.exec(E))) { const p = +m[1], d = mdc(p, 100); return [{ t: 'linha', v: `${p}% = ${p}/100` }, ...(d > 1 ? [{ t: 'linha', v: `÷ ${d} em cima e embaixo` }] : []), certo(`${p}/100 = ${p / d}/${100 / d}`)]; }
  if ((m = /^(\d+)\/(\d+) é igual a quantos por cento\?$/.exec(E))) { const a = +m[1], b = +m[2], k = 100 / b; if (!Number.isInteger(k)) return null; return [{ t: 'linha', v: `${a}/${b} = ?/100` }, { t: 'linha', v: `× ${k} em cima e embaixo` }, certo(`${a * k}/100 = ${a * k}%`)]; }
  if ((m = /^(\d+)% de algo significa/.exec(E))) { const p = +m[1]; return [{ t: 'grade100', n: p }, certo(`${p}% = ${p}/100: ${R}`)]; }
  if ((m = /turma de (\d+) alunos, (\d+) faltaram/.exec(E))) {
    const n = +m[1], k = +m[2], d = arred(k / n), f = 100 / n;
    if (Number.isInteger(f)) return [{ t: 'bloco', titulo: '1º Vira fração' }, { t: 'linha', v: `${k} de ${n} = ${k}/${n}` },   // PROMPT-203: parte ÷ todo, e o de baixo vira 100
      { t: 'bloco', titulo: '2º Deixa o de baixo 100' }, ...(n === 10 ? [{ t: 'tabuada', b: n, procura: [100] }] : []), { t: 'linha', v: `${n} × ${f} = 100` }, { t: 'fracoes', fr: [[k, n], [k * f, 100]], op: '×' },
      { t: 'bloco', titulo: '3º De cada 100 = %' }, certo(`${k * f}/100 = ${k * f}%`)];
    return [{ t: 'linha', v: `${k} ÷ ${n} = ${num(d)}` }, certo(`${num(d)} = ${num(arred(d * 100))}/100 = ${num(arred(d * 100))}%`)];
  }
  const pv = lerPctDe(E);
  if (!pv) return null;
  const { p, v } = pv, d = arred(v * p / 100), ps = [{ t: 'linha', v: `${p}% de ${num(v)}` }, ...atalhoPct(p, v)];
  ps.push(/preço final/i.test(E) ? certo(`${num(v)} − ${num(d)} = ${num(arred(v - d))}`) : certo(R));
  return ps;
}
function gin7b(q) {
  const E = String(q.enunciado || '').trim().replace(/"/g, ''), R = String(q.resposta ?? '');
  let m;
  if ((m = /^(\d+)% em número decimal/.exec(E))) { const p = +m[1]; return [{ t: 'linha', v: `${p}% = ${p} ÷ 100` }, { t: 'virgula', v: String(p), op: '÷', k: 100, fim: false }, { t: 'escreve', v: `${p}% = ${dec100(p)}`, cor: 'certo', n: true }]; }
  if ((m = /^A conta (\d+) × (\d+,\d+) calcula/.exec(E))) {   // PROMPT-203: o decimal vira % (a vírgula anda 2 casas para a direita)
    const p = num(arred(numero(m[2]) * 100));
    return [{ t: 'linha', v: `${m[1]} × ${m[2]}` }, { t: 'bloco', titulo: `1º ${m[2]} vira %` }, { t: 'virgula', v: m[2], op: '×', k: 100, fim: false },
      { t: 'escreve', v: `${m[2]} = ${p}%` }, { t: 'bloco', titulo: '2º Lê a conta' }, certo(R)];
  }
  const pv = lerPctDe(E);
  if (!pv) return null;
  const { p, v } = pv, ps = [{ t: 'bloco', titulo: '1º % vira decimal' }, { t: 'linha', v: `${p}% = ${p} ÷ 100` }, { t: 'virgula', v: String(p), op: '÷', k: 100 }, { t: 'bloco', titulo: '2º A conta' }];   // PROMPT-200/201
  if (/direto o preço final/i.test(E)) {   // PROMPT-203: paga o que sobra do 100%
    ps.splice(-1, 1, { t: 'bloco', titulo: '2º Quanto paga' }, { t: 'grade100', n: 100 - p, riscados: p }, { t: 'linha', v: `paga 100% − ${p}% = ${100 - p}%` }, { t: 'linha', v: `${100 - p}% = ${dec100(100 - p)}` }, { t: 'bloco', titulo: '3º A conta' });
  } else if (/preço final|mesada|aumento/i.test(E)) {
    const au = /aumento|mesada/i.test(E);
    ps.splice(-1, 1, { t: 'bloco', titulo: au ? '2º O aumento' : '2º O desconto' }, { t: 'linha', v: `${au ? 'aumento' : 'desconto'} = ${num(v)} × ${dec100(p)}` },
      { t: 'bloco', titulo: au ? '3º Aumento soma' : '3º Desconto tira' });
  } else ps.push({ t: 'texto', v: '"de" vira ×' });
  ps.push(certo(R));
  return ps;
}

// ── 8-A: tradução (palavra → símbolo) e valor numérico (a letra vira o número) ──
const TRADUZ = [[/dobro/i, 'dobro → 2x'], [/triplo/i, 'triplo → 3x'], [/quádruplo/i, 'quádruplo → 4x'], [/metade/i, 'metade → x ÷ 2'], [/ao quadrado/i, 'ao quadrado → x × x'],
  [/mais (\d+)/i, (m) => `mais ${m[1]} → + ${m[1]}`], [/menos (\d+)/i, (m) => `menos ${m[1]} → − ${m[1]}`], [/custa x reais\. Quanto custam (\d+)/i, (m) => `${m[1]} vezes x → ${m[1]} × x`]];
// PROMPT-203: a tabela de tradução fixa na lateral (a mesma das páginas do 8-A), acendendo a palavra da vez
export const TRADUZ_LAT = [[/um número/i, 'um número → x'], [/dobro/i, 'o dobro → 2x'], [/triplo/i, 'o triplo → 3x'], [/quádruplo/i, 'o quádruplo → 4x'], [/metade/i, 'a metade → x ÷ 2'],
  [/mais \d/i, 'mais 5 → + 5'], [/menos \d/i, 'menos 5 → − 5'], [/ao quadrado/i, 'ao quadrado → x²']];
function trocaLetra(expr, vals) {   // 3x − 1 (x = 6) → 3 × 6 − 1 · x² → 6 × 6 · x com x = −2 → (−2)
  const v = (l) => { const n = vals[l]; return n < 0 ? `(${num(n)})` : num(n); };
  return expr.replace(/(\d*)([a-z])²/g, (s, c, l) => `${c ? c + ' × ' : ''}${v(l)} × ${v(l)}`)
    .replace(/(\d+)([a-z])\b/g, (s, c, l) => `${c} × ${v(l)}`)
    .replace(/\b([a-z])\b/g, (s, l) => (l in vals ? v(l) : s));
}
function gin8a(q) {
  const E = String(q.enunciado || '').trim(), R = String(q.resposta ?? '');
  const m = /^Valor de (.+?) quando (.+)$/.exec(E);
  if (m) {
    const vals = {};
    for (const [, l, n] of m[2].matchAll(/([a-z]) = (−?\d+)/g)) vals[l] = numero(n);
    if (!Object.keys(vals).length) return null;
    const sub = trocaLetra(m[1].trim(), vals);
    if (/[a-z]/.test(sub)) return null;
    let ps = [];
    try { ps = passosExpressao(sub); } catch (_) { return null; }
    return [{ t: 'bloco', titulo: '1º Troca a letra' }, { t: 'linha', v: m[1].trim() }, { t: 'linha', v: Object.entries(vals).map(([l, n]) => `${l} = ${num(n)}`).join('   ') },
      { t: 'texto', v: 'Troca a letra pelo número' }, { t: 'linha', v: sub }, { t: 'bloco', titulo: '2º Calcula' }, ...(ps.length ? [{ t: 'expressao', v: sub }] : [certo(sub)])];   // PROMPT-203
  }
  const ts = TRADUZ.map(([rx, f]) => { const x = rx.exec(E); return x && (typeof f === 'function' ? f(x) : f); }).filter(Boolean);
  if (!ts.length) return null;
  const ac = TRADUZ_LAT.map(([rx], i) => (rx.test(E) ? i : -1)).filter(i => i >= 0);
  return [{ t: 'lateral', linhas: TRADUZ_LAT.map(x => x[1]), acende: ac }, { t: 'enunciado', v: E.replace(/"/g, '') }, ...ts.map(v => ({ t: 'linha', v })), certo(R)];
}

// ── 8-B: termos semelhantes (mesma letra: só os números; a letra repete) ──
function lerTermos(expr) {   // "5x − 3x + 4 + 9" → [{ s: 1, c: 5, l: 'x' }, …]
  const out = [];
  for (const m of String(expr).replace(/\s+/g, '').matchAll(/([+−-]?)(\d*)([a-z]?)(²?)/g)) {
    if (!m[2] && !m[3]) continue;
    out.push({ s: m[1] === '−' || m[1] === '-' ? -1 : 1, c: m[2] ? +m[2] : 1, l: m[3] + m[4] });
  }
  return out;
}
const juntaTermo = (c, l) => (!l ? num(c) : c === 1 ? l : `${num(c)}${l}`);
function gin8b(q) {
  const E = String(q.enunciado || '').trim(), R = String(q.resposta ?? '');
  let m;
  if ((m = /^(.+?) e (.+?) são termos semelhantes\?$/.exec(E))) {
    const L = (s) => s.replace(/^−?\d*/, '');
    return [{ t: 'linha', v: `${m[1]}  e  ${m[2]}` }, { t: 'linha', v: `letras: ${L(m[1])} e ${L(m[2])}` }, certo(L(m[1]) === L(m[2]) ? 'mesma letra: Sim' : 'letras diferentes: Não')];
  }
  if (/^Perímetro de um quadrado de lado x/.test(E)) return [{ t: 'perimetro', lados: ['x', 'x', 'x', 'x'] }, { t: 'linha', v: 'x + x + x + x' }, { t: 'linha', v: '(1 + 1 + 1 + 1)x' }, certo('4x')];
  if ((m = /^Perímetro de um retângulo de lados x e (\d+)/.exec(E))) return [{ t: 'perimetro', lados: ['x', m[1], 'x', m[1]] }, { t: 'linha', v: `x + ${m[1]} + x + ${m[1]}` }, { t: 'linha', v: `(1 + 1)x + ${m[1]} + ${m[1]}` }, certo(R)];
  const e = E.replace(/^Simplifique\s+/i, '');
  if (!/^[\d\sa-z²+−-]+$/.test(e) || !/[a-z]/.test(e)) return null;
  const ts = lerTermos(e);
  if (ts.length < 2) return null;
  const grupos = [];
  for (const t of ts) { let g = grupos.find(x => x.l === t.l); if (!g) grupos.push(g = { l: t.l, ts: [] }); g.ts.push(t); }
  const parte = (g, i) => {   // a 1ª do grupo leva o sinal para fora quando não é o começo: " − 2 + 6", nunca " + −2"
    const fora = i > 0 && !(g.l && g.ts.length > 1) ? (g.ts[0].s < 0 ? ' − ' : ' + ') : i > 0 ? ' + ' : '';
    const ns = g.ts.map((t, k) => `${k === 0 ? (t.s < 0 && !(fora && !(g.l && g.ts.length > 1)) ? '−' : '') : t.s < 0 ? ' − ' : ' + '}${t.c}`).join('');
    return `${fora}${g.l ? (g.ts.length > 1 ? `(${ns})${g.l}` : `${g.ts[0].s < 0 && !fora ? '−' : ''}${juntaTermo(g.ts[0].c, g.l)}`) : ns}`;
  };
  const agrupada = grupos.map(parte).join('');
  const total = grupos.map(g => ({ l: g.l, c: g.ts.reduce((s, t) => s + t.s * t.c, 0) })).filter(g => g.c !== 0);
  const final = total.length ? total.map((g, i) => `${i === 0 ? (g.c < 0 ? '−' : '') : g.c < 0 ? ' − ' : ' + '}${juntaTermo(Math.abs(g.c), g.l)}`).join('') : '0';
  return [{ t: 'bloco', titulo: '1º Pinta os iguais' }, { t: 'termos', v: e, cores: true }, { t: 'bloco', titulo: '2º Junta' }, { t: 'linha', v: agrupada }, { t: 'bloco', titulo: '3º Resposta' }, certo(final)];   // PROMPT-203
}

const GERA = { 'mapa1-A': gin1, 'mapa1-B': gin1, 'mapa2-A': gin2, 'mapa2-B': gin2, 'mapa3-A': gin3a, 'mapa3-B': gin3b, 'mapa4-A': gin4a, 'mapa4-B': gin4b,
  'mapa5-A': gin5, 'mapa5-B': gin5, 'mapa6-A': gin6, 'mapa6-B': gin6, 'mapa7-A': gin7a, 'mapa7-B': gin7b, 'mapa8-A': gin8a, 'mapa8-B': gin8b };   // PROMPT-197
const ENGANO = { 'mapa1-A': engano1, 'mapa1-B': engano1, 'mapa2-A': engano2, 'mapa2-B': engano2, 'mapa3-A': engano3a, 'mapa3-B': engano3b, 'mapa4-A': engano4a, 'mapa4-B': engano4b };
const normResp = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// ═══ PROMPT-202: problema com texto → "1º Vira conta" (as palavras-chave sublinhadas viram a conta) e depois resolve ═══
// problemaConta(enunciado) → { conta, marcas: [[trecho, vira, fala?], …], k? (× 10/100/1000) } ou null
const N_ = '(−?\\d+(?:,\\d+)?)';
const PROBLEMAS = [
  [new RegExp(`Comprei ${N_} (\\S+) de R\\$ ${N_} e ${N_} (\\S+) de R\\$ ${N_}\\. Quanto gastei`), (m) => ({ conta: `${m[1]} × ${m[3]} + ${m[4]} × ${m[6]}`,
    marcas: [[`${m[1]} ${m[2]} de R$ ${m[3]}`, `${m[1]} × ${m[3]}`, `${m[1]} ${m[2]} de ${m[3]} reais: ${m[1]} vezes ${m[3]}.`], [`${m[4]} ${m[5]} de R$ ${m[6]}`, `${m[4]} × ${m[6]}`], ['gastei', '+', 'Quanto gastei ao todo: junta tudo com +.']] })],
  [new RegExp(`Tinha R\\$ ${N_} e comprei ${N_} (\\S+) de R\\$ ${N_}\\. Quanto sobrou`), (m) => ({ conta: `${m[1]} − ${m[2]} × ${m[4]}`,
    marcas: [[`Tinha R$ ${m[1]}`, m[1], `Começa com ${m[1]} reais.`], [`${m[2]} ${m[3]} de R$ ${m[4]}`, `${m[2]} × ${m[4]}`, `${m[2]} ${m[3]} de ${m[4]} reais: ${m[2]} vezes ${m[4]}.`], ['sobrou', '−', 'Sobrou: é conta de menos.']] })],
  [new RegExp(`São ${N_} caixas com ${N_} lápis cada e mais ${N_} lápis soltos`), (m) => ({ conta: `${m[1]} × ${m[2]} + ${m[3]}`,
    marcas: [[`${m[1]} caixas com ${m[2]} lápis cada`, `${m[1]} × ${m[2]}`, `"Cada": ${m[1]} vezes ${m[2]}.`], [`mais ${m[3]}`, `+ ${m[3]}`]] })],
  [new RegExp(`${N_} balas foram divididas entre ${N_} amigos e cada um ganhou mais ${N_}`), (m) => ({ conta: `${m[1]} ÷ ${m[2]} + ${m[3]}`,
    marcas: [[`divididas entre ${m[2]}`, `${m[1]} ÷ ${m[2]}`, `Dividir entre ${m[2]} amigos: ${m[1]} ÷ ${m[2]}.`], [`mais ${m[3]}`, `+ ${m[3]}`, `Ganhou mais ${m[3]}: + ${m[3]}.`]] })],
  [new RegExp(`Comprei ${N_} pacotes de R\\$ ${N_} e paguei com R\\$ ${N_}\\. Qual o troco`), (m) => ({ conta: `${m[3]} − ${m[1]} × ${m[2]}`,
    marcas: [[`${m[1]} pacotes de R$ ${m[2]}`, `${m[1]} × ${m[2]}`], [`paguei com R$ ${m[3]}`, m[3], `Paguei com ${m[3]}: começa com ${m[3]}.`], ['troco', '−', 'Troco: é conta de menos.']] })],
  [new RegExp(`Ganhei R\\$ ${N_} por dia durante ${N_} dias e gastei R\\$ ${N_}`), (m) => ({ conta: `${m[1]} × ${m[2]} − ${m[3]}`,
    marcas: [[`R$ ${m[1]} por dia durante ${m[2]} dias`, `${m[1]} × ${m[2]}`], [`gastei R$ ${m[3]}`, `− ${m[3]}`, `Gastei: é conta de menos.`]] })],
  [new RegExp(`${N_} adultos compraram ingressos de R\\$ ${N_} cada e ganharam R\\$ ${N_} de desconto`), (m) => ({ conta: `${m[1]} × ${m[2]} − ${m[3]}`,
    marcas: [[`ingressos de R$ ${m[2]} cada`, `${m[1]} × ${m[2]}`, `${m[1]} ingressos de ${m[2]} reais: ${m[1]} vezes ${m[2]}.`], [`R$ ${m[3]} de desconto`, `− ${m[3]}`, 'Desconto: é conta de menos.']] })],
  [new RegExp(`temperatura era ${N_} °C e (subiu|desceu|caiu) ${N_} graus`), (m) => ({ conta: `${m[1]} ${m[2] === 'subiu' ? '+' : '−'} ${m[3]}`,
    marcas: [[`era ${m[1]} °C`, m[1]], [`${m[2]} ${m[3]} graus`, `${m[2] === 'subiu' ? '+' : '−'} ${m[3]}`, m[2] === 'subiu' ? 'Subiu: é conta de mais.' : 'Desceu: é conta de menos.']] })],
  [new RegExp(`Tinha R\\$ ${N_} na conta e gastei R\\$ ${N_}`), (m) => ({ conta: `${m[1]} − ${m[2]}`,
    marcas: [[`Tinha R$ ${m[1]}`, m[1]], [`gastei R$ ${m[2]}`, `− ${m[2]}`, 'Gastei: é conta de menos.']] })],
  [new RegExp(`Estou no andar ${N_}.*?e (subo|desço) ${N_} andares`), (m) => ({ conta: `${m[1]} ${m[2] === 'subo' ? '+' : '−'} ${m[3]}`,
    marcas: [[`andar ${m[1]}`, m[1]], [`${m[2]} ${m[3]} andares`, `${m[2] === 'subo' ? '+' : '−'} ${m[3]}`, m[2] === 'subo' ? 'Subo: é conta de mais.' : 'Desço: é conta de menos.']] })],
  [new RegExp(`custa R\\$ ${N_}\\. Quanto custam (\\d+) (\\S+)\\?`), (m) => ({ conta: `${m[1]} × ${m[2]}`, k: { v: m[1], op: '×', k: Number(m[2]) },
    marcas: [[`custa R$ ${m[1]}`, m[1]], [`Quanto custam ${m[2]}`, `× ${m[2]}`, `${m[2]} de ${m[1]} reais: ${m[1]} vezes ${m[2]}.`]] })],
  [new RegExp(`Paguei R\\$ ${N_} por um lanche de R\\$ ${N_}\\. Qual o troco`), (m) => ({ conta: `${m[1]} − ${m[2]}`,
    marcas: [[`Paguei R$ ${m[1]}`, m[1]], [`lanche de R$ ${m[2]}`, `− ${m[2]}`], ['troco', '−', 'Troco é conta de menos.']] })],
];
export function problemaConta(enunciado) {
  enunciado = tirarPergunta(enunciado);
  const E = String(enunciado || '');
  for (const [rx, f] of PROBLEMAS) { const m = rx.exec(E); if (m) return f(m); }
  return null;
}
// a parte "resolve" de um problema (quando o gerador do ginásio não achou): a expressão ou a vírgula
function resolveProblema(pc) {
  if (pc.k && [10, 100, 1000].includes(pc.k.k)) return [{ t: 'virgula', ...pc.k }];
  try { if (passosExpressao(pc.conta).length) return [{ t: 'expressao', v: pc.conta }]; } catch (_) {}
  return null;
}
const fazBlocos = (s) => s.t === 'armada' && s.blocos !== false && ((s.op === '×' && /,/.test(`${s.a}${s.b}`)) || (s.op !== '×' && casasDe(s.a) !== casasDe(s.b)));
function comBlocosDoProblema(q, certo) {
  const pc = problemaConta(q.enunciado);
  const eProblema = pc || certo?.[0]?.t === 'enunciado';
  if (!eProblema) return certo;
  let rest = (certo || []).filter(s => s.t !== 'enunciado');
  if (!rest.length && pc) rest = resolveProblema(pc) || [];
  if (!rest.length) return certo;
  const conta = pc?.conta;
  if (conta && rest[0]?.t === 'linha' && rest[0].v === conta) rest = rest.slice(1);
  const auto = rest.some(fazBlocos);   // a conta armada já abre os próprios blocos: começa no 2º
  if (auto) rest = rest.map(s => (fazBlocos(s) ? { ...s, n0: 2 } : s));
  return [{ t: 'bloco', titulo: '1º Vira conta' }, pc ? { t: 'palavras', v: q.enunciado, marcas: pc.marcas } : { t: 'enunciado', v: q.enunciado },
    ...(conta ? [{ t: 'linha', v: conta }] : []), ...(auto ? [] : [{ t: 'bloco', titulo: '2º Resolve' }]), ...rest];
}

export function comoFaz(chave, q, sua) {
  q = semPergunta(q);
  const f = GERA[chave];
  if (!f || !q) return null;
  let certo;
  try { certo = f(q); } catch (_) { certo = null; }
  try { certo = comBlocosDoProblema(q, certo); } catch (_) {}   // PROMPT-202
  if (!certo?.length) return null;
  if (sua == null || normResp(sua) === '' || q.resposta == null || normResp(sua) === normResp(q.resposta)) return certo;
  // ✖ sua resposta × ✔ certo: o problema (enunciado) fica em cima das duas colunas
  const topo = certo[0]?.t === 'enunciado' ? [certo[0]] : [], dir = topo.length ? certo.slice(1) : certo;
  let esq = null;
  try { esq = ENGANO[chave]?.(q, sua) || null; } catch (_) { esq = null; }
  return [...topo, { t: 'compara', esq: { titulo: '✖ sua resposta', tipo: 'errado', passos: esq?.length ? esq : [{ t: 'linha', v: String(sua) }] }, dir: { titulo: '✔ certo', tipo: 'certo', passos: dir } }];
}

// 💡 PROMPT-196: a dica curta (máx. ~6 palavras) do cartão do erro, pelo tipo de conta de cada ginásio. null = fora dos mapas 1 a 4
export function dicaCurta(chave, q) {
  const e = tirarPergunta(q?.enunciado || '');
  switch (chave) {
    case 'mapa1-A': return '× e ÷ antes de + e −';
    case 'mapa1-B': return '( ) primeiro, depois [ ]';
    case 'mapa2-A': return 'Cada zero, uma casa da vírgula';
    case 'mapa2-B': return 'Unidade menor, número maior';
    case 'mapa3-A': return /maior|menor/i.test(e) ? 'Mais à esquerda, menor' : 'Sinais diferentes: subtrai';
    case 'mapa3-B': return 'Iguais +, diferentes −';
    case 'mapa4-A':
      if (/maior|menor/i.test(e)) return 'Mais partes, pedaço menor';
      if (/\d+\/\d+\s*[+−-]\s*\d+\/\d+/.test(e)) return 'Mesmo embaixo: só o de cima';
      if (/ de \d|metade/i.test(e)) return '÷ embaixo, × em cima';
      if (/pizza|pedaços/i.test(e)) return 'Em cima as partes, embaixo o total';
      return 'Mesma conta em cima e embaixo';
    // PROMPT-197: mapas 5 a 8
    case 'mapa5-A': return 'Base × ela mesma, expoente vezes';
    case 'mapa5-B':
      if (/⁰/.test(e) && !/[¹²³⁴⁵⁶⁷⁸⁹]/.test(e)) return 'Elevado a 0 dá 1';
      if (/^\d+¹$/.test(e.trim())) return 'Elevado a 1 é ele mesmo';
      if (/^\(−/.test(e.trim())) return 'Par: +, ímpar: −';
      return 'Qual número × ele mesmo?';
    case 'mapa6-A': return 'Está na tabuada? É múltiplo!';
    case 'mapa6-B': return 'Resto 0? É divisor!';
    case 'mapa7-A': { const p = /(\d+)%/.exec(e)?.[1]; return p === '50' ? '50% é a metade' : p === '25' ? '25% é ÷ 4' : '10% é ÷ 10'; }
    case 'mapa7-B': return '% ÷ 100: vírgula anda 2 casas';
    case 'mapa8-A': return /^Valor de/i.test(e) ? 'Troca a letra pelo número' : 'Dobro = 2x';
    case 'mapa8-B': return 'Mesma letra: só soma os números';
    case 'mapa4-B':
      if (/maior|menor/i.test(e)) return 'Iguala as casas';
      if (/em número decimal/i.test(e)) return 'É uma divisão';
      if (/em fração/i.test(e)) return 'Casas da vírgula = zeros embaixo';
      if (/×/.test(e)) return 'Conta as casas da vírgula';
      return 'Vírgula embaixo de vírgula';
  }
  return null;
}

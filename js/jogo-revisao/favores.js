// 📜 Favores dos NPCs (PROMPT-239): regras puras — quantos por dia, sorteio, valores das contas, avaliador seguro (sem eval),
// dinheiro com vírgula, a explicação da conta e o prêmio. Dados: dados/jogo/favores.json; a tela fica em js/jogo-revisao.js.

let F = null;
export function definirFavores(json) { F = json; }
export const favoresProntos = () => Array.isArray(F?.favores);
export const cfgFavores = () => F || {};
export const favorDef = (id) => (F?.favores || []).find(f => f.id === id) || null;
export const TIPOS_PARTE_A = ['entrega', 'recado', 'cobranca', 'compra'];

// 2 + 1 por NPC com nível ≥ 3, no máximo 5
export function favoresDoDia(niveis) {
  const pa = F?.favores_dia_por_amigo || { nivel: 3, mais: 1, max: 5 };
  const amigos = Object.values(niveis || {}).filter(n => n >= pa.nivel).length;
  return Math.min(pa.max ?? 5, (Number(F?.favores_dia_base) || 2) + amigos * (pa.mais ?? 1));
}
// sorteio do dia: um favor por NPC, nivel_min ≤ amizade, peso 1 + nível, sem os dos últimos 3 dias e sem os abertos
// pode(f): o jogo diz se o favor serve (NPCs existem, tipo já implementado…)
export function sortearOfertas({ niveis, recentes = {}, abertos = {}, hoje, n, pode = () => true, rnd = Math.random }) {
  const usados = new Set(Object.keys(abertos)), npcsAbertos = new Set(Object.values(abertos).map(a => a?.npc));
  const recente = (id) => recentes[id] && diasEntre(recentes[id], hoje) < 3;
  let cands = (F?.favores || []).filter(f => (niveis[f.npc] || 0) >= (f.nivel_min || 0) && !usados.has(f.id) && !npcsAbertos.has(f.npc) && !recente(f.id) && pode(f));
  const out = [];
  while (out.length < n && cands.length) {   // 1º o NPC (peso 1 + nível), depois um dos favores dele
    const npcs = [...new Set(cands.map(f => f.npc))];
    const tot = npcs.reduce((s, k) => s + 1 + (niveis[k] || 0), 0);
    let r = rnd() * tot, npc = npcs[npcs.length - 1];
    for (const k of npcs) { r -= 1 + (niveis[k] || 0); if (r < 0) { npc = k; break; } }
    const dele = cands.filter(f => f.npc === npc), esc = dele[Math.floor(rnd() * dele.length)];
    out.push({ id: esc.id, npc });
    cands = cands.filter(f => f.npc !== npc);
  }
  return out;
}

// ── contas ──
// avaliador seguro: números, variáveis, + − × ÷ e parênteses (descida recursiva; nada de eval)
export function avaliar(expr, vars = {}) {
  const s = String(expr).replace(/\s+/g, '');
  let i = 0;
  const num = () => {
    if (s[i] === '(') { i++; const v = soma(); if (s[i] !== ')') throw new Error('parêntese'); i++; return v; }
    if (s[i] === '-') { i++; return -num(); }
    const m = /^(\d+(\.\d+)?|[a-z_]\w*)/i.exec(s.slice(i));
    if (!m) throw new Error('conta inválida');
    i += m[0].length;
    if (/^\d/.test(m[0])) return Number(m[0]);
    if (!Object.prototype.hasOwnProperty.call(vars, m[0]) || !Number.isFinite(Number(vars[m[0]]))) throw new Error('variável ' + m[0]);
    return Number(vars[m[0]]);
  };
  const prod = () => { let v = num(); while (s[i] === '*' || s[i] === '/') { const op = s[i++], w = num(); v = op === '*' ? v * w : v / w; } return v; };
  const soma = () => { let v = prod(); while (s[i] === '+' || s[i] === '-') { const op = s[i++], w = prod(); v = op === '+' ? v + w : v - w; } return v; };
  const v = soma();
  if (i !== s.length) throw new Error('sobrou ' + s.slice(i));
  return Math.round(v * 100) / 100;
}
const sortearVar = ([min, max, passo = 1], rnd) => {
  const n = Math.max(0, Math.round((max - min) / passo));
  return Math.round((min + Math.floor(rnd() * (n + 1)) * passo) * 100) / 100;
};
// os valores da conta: sorteia vars, faz o calc, a resposta; abaixo do mínimo (ou negativa): de novo
export function sortearConta(f, rnd = Math.random) {
  for (let t = 0; t < 60; t++) {
    const v = {};
    for (const [k, faixa] of Object.entries(f.vars || {})) v[k] = sortearVar(faixa, rnd);
    for (const [k, e] of Object.entries(f.calc || {})) v[k] = avaliar(e, v);
    const resp = avaliar(f.resposta, v);
    if (resp >= (f.minimo ?? 0)) return { vals: v, resp };
  }
  return null;
}
// dinheiro: 4.5 → "4,50"; 5 → "5"
export const fmtNum = (v) => (Number.isInteger(Number(v)) ? String(Number(v)) : Number(v).toFixed(2).replace('.', ','));
export const fmtReais = (v) => `R$ ${fmtNum(v)}`;
// as variáveis que são dinheiro: as que vêm depois de "R$" no texto
export const varsDinheiro = (texto) => new Set([...String(texto || '').matchAll(/R\$\s*\{(\w+)\}/g)].map(m => m[1]));
// a explicação: "3 × R$ 4,50 − R$ 5 = R$ 8,50" (ou "R$ 60 ÷ 4 = R$ 15" quando a resposta é a parte de um total)
export function explicarConta(f, vals, resp) {
  const din = varsDinheiro(f.texto), v = (k) => (din.has(k) ? fmtReais(vals[k]) : fmtNum(vals[k]));
  if (/^\w+$/.test(f.resposta)) {
    for (const [k, e] of Object.entries(f.calc || {})) {
      const m = /^(\w+)\*(\w+)$/.exec(String(e).replace(/\s+/g, ''));
      if (m && (m[1] === f.resposta || m[2] === f.resposta)) { const outro = m[1] === f.resposta ? m[2] : m[1]; return `${v(k)} ÷ ${v(outro)} = ${fmtReais(resp)}`; }
    }
  }
  const conta = String(f.resposta).replace(/\s+/g, '').replace(/[a-z_]\w*/gi, (k) => `\u0000${k}\u0000`)
    .replace(/\*/g, ' × ').replace(/\//g, ' ÷ ').replace(/-/g, ' − ').replace(/\+/g, ' + ')
    .replace(/\u0000(\w+)\u0000/g, (_, k) => v(k)).replace(/ [−+] (R\$ )?0(?= [−+]|$)/g, '');   // "− 0" (não pagou nada) some
  return `${conta} = ${fmtReais(resp)}`;
}
// o texto com os nomes e os valores: {devedor}, {loja}, {para}, {q}, {p}…
export function textoFavor(texto, vals = {}, nomes = {}) {
  return String(texto || '').replace(/\{(\w+)\}/g, (m, k) => (nomes[k] != null ? nomes[k] : vals[k] != null ? fmtNum(vals[k]) : m));
}
// a resposta digitada ("8,5", "8,50", "8") bate com a certa?
export function confereValor(digitado, certo) {
  const v = Number(String(digitado).replace(',', '.'));
  return Number.isFinite(v) && Math.abs(v - certo) < 0.005;
}

// ── prêmio ──
export function moedasFavor(tipo, nivel) {
  const base = Number(F?.moedas_base?.[tipo]) || 0, mult = F?.multiplicador_nivel || [1, 1.2, 1.4, 1.7, 2, 2.5];
  return Math.round(base * (mult[Math.max(0, Math.min(mult.length - 1, nivel))] ?? 1));
}
export const amizadeFavor = (tipo) => Number(F?.amizade_favor?.[tipo]) || 0;
export const amizadeDestino = () => Number(F?.amizade_destino) || 0;
// sorteia um prêmio de uma faixa do baú (comum/bom/raro): { tipo, id?, qtd }
export function sortearPremio(faixa, rnd = Math.random) {
  const l = F?.tesouro?.premios?.[faixa] || [];
  const tot = l.reduce((s, p) => s + (Number(p.peso) || 1), 0);
  let r = rnd() * tot, p = l[l.length - 1];
  for (const x of l) { r -= Number(x.peso) || 1; if (r < 0) { p = x; break; } }
  if (!p) return null;
  const qtd = Array.isArray(p.qtd) ? p.qtd[0] + Math.floor(rnd() * (p.qtd[1] - p.qtd[0] + 1)) : Number(p.qtd) || 1;
  const id = p.ids ? p.ids[Math.floor(rnd() * p.ids.length)] : p.id || null;
  return { tipo: p.tipo, id, qtd };
}

export function diasEntre(a, b) {
  const d = (s) => { const [y, m, dd] = String(s).split('-').map(Number); return Date.UTC(y, m - 1, dd); };
  if (!a || !b) return 99;
  return Math.round((d(b) - d(a)) / 864e5);
}

// 🎲 PROMPT-259: as regras e o computador dos jogos da Exposição (sem tela: dá para testar no Node).
// Shisima (Quênia) e Yoté (Senegal, versão rápida). Jogador 1 = a pessoa, 2 = o computador.

const sortear = (l) => l[Math.floor(Math.random() * l.length)];
export const outro = (p) => 3 - p;

// ── 🔷 Shisima: pontas 0..7 (0 no alto, sentido horário) e o centro 8 ──
export const CENTRO = 8;
export const vizinhosShisima = (i) => (i === CENTRO ? [0, 1, 2, 3, 4, 5, 6, 7] : [(i + 1) % 8, (i + 7) % 8, CENTRO]);
export function inicioShisima() {
  const pos = Array(9).fill(0);
  for (const i of [3, 4, 5]) pos[i] = 1;   // a pessoa embaixo
  for (const i of [7, 0, 1]) pos[i] = 2;   // o computador em cima, de frente
  return pos;
}
export const movimentosShisima = (pos, p) => pos.flatMap((v, de) => (v === p ? vizinhosShisima(de).filter(a => pos[a] === 0).map(para => ({ de, para })) : []));
export const moverShisima = (pos, m) => { const q = pos.slice(); q[m.para] = q[m.de]; q[m.de] = 0; return q; };
// 3 em linha pelo centro: ponta, centro e a ponta oposta
export const linhaShisima = (pos, p) => { if (pos[CENTRO] !== p) return null; for (let i = 0; i < 4; i++) if (pos[i] === p && pos[i + 4] === p) return [i, CENTRO, i + 4]; return null; };
export function iaShisima(pos, aleatorio = 0.25) {
  const ms = movimentosShisima(pos, 2);
  if (!ms.length) return null;
  if (Math.random() < aleatorio) return sortear(ms);   // às vezes erra: dá para ganhar
  const vence = ms.filter(m => linhaShisima(moverShisima(pos, m), 2));
  if (vence.length) return sortear(vence);
  // bloqueia: só as jogadas depois das quais a pessoa não ganha na hora
  const seguras = ms.filter(m => { const q = moverShisima(pos, m); return !movimentosShisima(q, 1).some(h => linhaShisima(moverShisima(q, h), 1)); });
  const boas = seguras.filter(m => m.para === CENTRO);   // o centro é bom
  return sortear(boas.length && Math.random() < 0.6 ? boas : seguras.length ? seguras : ms);
}

// ── ⚫ Yoté: linhas × colunas; casas 0..n-1; { b: [0|1|2], mao: { 1, 2 } } ──
export function inicioYote(linhas, colunas, mao) { return { L: linhas, C: colunas, b: Array(linhas * colunas).fill(0), mao: { 1: mao, 2: mao } }; }
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const casa = (st, l, c) => (l >= 0 && l < st.L && c >= 0 && c < st.C ? l * st.C + c : -1);
export const pecasYote = (st, p) => st.b.filter(v => v === p).length + st.mao[p];
// ações: { tipo: 'colocar', para } | { tipo: 'andar', de, para } | { tipo: 'capturar', de, sobre, para }
export function acoesYote(st, p) {
  const r = [], o = outro(p);
  st.b.forEach((v, i) => {
    if (v === 0 && st.mao[p] > 0) r.push({ tipo: 'colocar', para: i });
    if (v !== p) return;
    const l = Math.floor(i / st.C), c = i % st.C;
    for (const [dl, dc] of DIRS) {
      const a = casa(st, l + dl, c + dc);
      if (a < 0) continue;
      if (st.b[a] === 0) r.push({ tipo: 'andar', de: i, para: a });
      else if (st.b[a] === o) { const d = casa(st, l + 2 * dl, c + 2 * dc); if (d >= 0 && st.b[d] === 0) r.push({ tipo: 'capturar', de: i, sobre: a, para: d }); }
    }
  });
  return r;
}
export const capturasYote = (st, p) => acoesYote(st, p).filter(a => a.tipo === 'capturar');
export function aplicarYote(st, a, p) {
  const n = { ...st, b: st.b.slice(), mao: { ...st.mao } };
  if (a.tipo === 'colocar') { n.b[a.para] = p; n.mao[p]--; }
  else { n.b[a.para] = p; n.b[a.de] = 0; if (a.tipo === 'capturar') n.b[a.sobre] = 0; }
  return n;
}
// a peça extra depois da captura: { casa } (do tabuleiro) ou { mao: true }
export function removerYote(st, r, p) {
  const n = { ...st, b: st.b.slice(), mao: { ...st.mao } }, o = outro(p);
  if (r?.mao) { if (n.mao[o] > 0) n.mao[o]--; }
  else if (r && n.b[r.casa] === o) n.b[r.casa] = 0;
  return n;
}
export const podeRemoverYote = (st, p) => pecasYote(st, outro(p)) > 0;
// o computador: qual peça tirar depois de capturar (a que ameaça primeiro; senão da mão; senão qualquer uma)
export function escolhaRemocaoYote(st, p) {
  const o = outro(p), dele = st.b.map((v, i) => (v === o ? i : -1)).filter(i => i >= 0);
  const ameacam = new Set(capturasYote(st, o).map(a => a.de));
  const perigosa = dele.filter(i => ameacam.has(i));
  if (perigosa.length) return { casa: sortear(perigosa) };
  if (st.mao[o] > 0) return { mao: true };
  return dele.length ? { casa: sortear(dele) } : null;
}
// joga a ação inteira (com a remoção, se capturou): o estado depois
export function jogadaCompletaYote(st, a, p) {
  let n = aplicarYote(st, a, p);
  if (a.tipo === 'capturar' && podeRemoverYote(n, p)) n = removerYote(n, escolhaRemocaoYote(n, p), p);
  return n;
}
export function iaYote(st, aleatorio = 0.25) {
  const as = acoesYote(st, 2);
  if (!as.length) return null;
  if (Math.random() < aleatorio) return sortear(as);
  const risco = (a) => capturasYote(jogadaCompletaYote(st, a, 2), 1).length;   // quantas capturas a pessoa teria depois
  const melhores = (l) => { const rs = l.map(risco), m = Math.min(...rs); return l.filter((_, i) => rs[i] === m); };
  const caps = as.filter(a => a.tipo === 'capturar');
  if (caps.length) return sortear(melhores(caps));   // captura sempre, a de menos risco
  return sortear(melhores(as));                     // foge da captura; senão coloca ou anda
}

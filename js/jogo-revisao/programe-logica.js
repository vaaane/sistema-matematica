// Jogo de Revisão — "Programe o pet" (PROMPT-50): regras puras, sem DOM nem Firebase (usadas no jogo e nos testes).
//
// Fase (dados/jogo/programe-o-pet.json): mapa em texto — "." livre, "#" pedra, "c" petisco (pegar), "C" comida (fim),
// "P" pet; dir inicial ">" "v" "<" "^"; diagonal: true libera andar na diagonal.
// Direção = índice 0..7 em passos de 45°, a partir do leste, no sentido horário (y cresce para baixo).
// Programa (AST montada a partir dos blocos): { corpo: [nó], f1: [nó] | null }
//   nó: { id, t: 'andar' | 'virar' (g: ±1 = 45°, ±2 = 90°; + = direita) | 'pegar' | 'repita' (n, corpo)
//         | 'repita_ate' (corpo) | 'chamar' | 'se' (c, corpo, senao?) }
//   condição c: 'pedra_frente' | 'livre_dir' | 'livre_esq' | 'petisco_aqui'

export const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const DIR_CHAR = { '>': 0, v: 2, '<': 4, '^': 6 };
export const MAX_PASSOS = 600;          // nós avaliados no máximo (laço sem fim)
export const PENALIDADE_BATIDA = 5;     // corrida: bater = +5 tiques (= 2 s a 400 ms por tique)
const k = (x, y) => `${x},${y}`;

// ── Fase ──
export function lerFase(f) {
  const linhas = f.mapa.map(String), h = linhas.length, w = Math.max(...linhas.map(l => l.length));
  const pedras = new Set(), petiscos = [];
  let inicio = null, comida = null;
  linhas.forEach((l, y) => [...l.padEnd(w, '#')].forEach((ch, x) => {
    if (ch === '#') pedras.add(k(x, y));
    else if (ch === 'c') petiscos.push([x, y]);
    else if (ch === 'C') comida = [x, y];
    else if (ch === 'P') inicio = [x, y];
  }));
  return { w, h, pedras, petiscos, comida, inicio, dir: DIR_CHAR[f.dir] ?? 0, diagonal: !!f.diagonal, blocos: f.blocos || [] };
}
// ── Giro de 90° no sentido horário (só para MOSTRAR e executar fases largas com a tela em pé; a fase salva não muda) ──
// Casa (x, y) de uma fase com h linhas → (h − 1 − y, x); direção + 90° (2 passos de 45°). Os blocos de virar são relativos
// ao pet, então qualquer solução continua valendo na fase girada.
const GIRA_DIR = { '>': 'v', v: '<', '<': '^', '^': '>' };
export const girarPonto = (x, y, h) => [h - 1 - y, x];
export const desgirarPonto = (x, y, h) => [y, h - 1 - x];   // h = linhas da fase ORIGINAL (= colunas da girada)
export function girarFase(f) {
  const linhas = f.mapa.map(String), h = linhas.length, w = Math.max(...linhas.map(l => l.length));
  const cel = linhas.map(l => l.padEnd(w, '#'));
  const mapa = [];
  for (let y = 0; y < w; y++) { let l = ''; for (let x = 0; x < h; x++) l += cel[h - 1 - x][y]; mapa.push(l); }
  const g = { ...f, mapa, dir: GIRA_DIR[f.dir] || 'v' };
  if (f.inicioB) { g.inicioB = girarPonto(f.inicioB[0], f.inicioB[1], h); g.dirB = GIRA_DIR[f.dirB || '<']; }
  return g;
}
// evento de executar() numa fase original → o mesmo evento na fase girada (h = linhas da original)
export function girarEvento(ev, h) {
  const g = { ...ev };
  if (ev.x != null && ev.y != null) [g.x, g.y] = girarPonto(ev.x, ev.y, h);
  if (ev.dir != null) g.dir = (ev.dir + 2) % 8;
  return g;
}
export const dentro = (F, x, y) => x >= 0 && y >= 0 && x < F.w && y < F.h;
export const livre = (F, x, y) => dentro(F, x, y) && !F.pedras.has(k(x, y));

// pode ir de (x, y) na direção d? (diagonal: as duas casas do canto também livres — não corta quina de pedra)
export function podeAndar(F, x, y, d) {
  const [dx, dy] = DIRS[(d + 8) % 8];
  if (!livre(F, x + dx, y + dy)) return false;
  return !(dx && dy) || (livre(F, x + dx, y) && livre(F, x, y + dy));
}

// ── Contar blocos (meta de estrelas) ──
export function contarBlocos(prog) {
  const conta = (lista) => (lista || []).reduce((n, b) => n + 1 + conta(b.corpo) + conta(b.senao), 0);
  return conta(prog.corpo) + (prog.f1 ? 1 + conta(prog.f1) : 0);
}

// ── Execução passo a passo ──
// Gera eventos para a tela animar: { tipo: 'bloco', id } antes de cada bloco; 'andou' | 'virou' | 'pegou' | 'nada' |
// 'bateu' | 'venceu' | 'fim' (motivo: 'acabou' | 'bateu' | 'longo'). corrida: bater não para (custa PENALIDADE_BATIDA
// tiques) e chegar na comida encerra. saida.estado = o estado (x, y, dir, pegos, tiques, batidas, chegou), atualizado ao vivo.
export function* executar(fase, prog, { corrida = false, espelhar = false } = {}, saida = {}) {
  const F = fase.w ? fase : lerFase(fase);
  const st = saida.estado = { x: F.inicio[0], y: F.inicio[1], dir: F.dir, pegos: new Set(), tiques: 0, batidas: 0, chegou: null, passos: 0 };
  const naComida = () => st.x === F.comida[0] && st.y === F.comida[1];
  const faltam = () => F.petiscos.filter(([x, y]) => !st.pegos.has(k(x, y))).length;
  const cond = (c) => {
    if (espelhar && (c === 'livre_dir' || c === 'livre_esq')) c = c === 'livre_dir' ? 'livre_esq' : 'livre_dir';
    if (c === 'pedra_frente') return !podeAndar(F, st.x, st.y, st.dir);
    if (c === 'livre_dir') return podeAndar(F, st.x, st.y, st.dir + 2);
    if (c === 'livre_esq') return podeAndar(F, st.x, st.y, st.dir - 2);
    if (c === 'petisco_aqui') return F.petiscos.some(([x, y]) => x === st.x && y === st.y && !st.pegos.has(k(x, y)));
    return false;
  };
  const PARA = Symbol('para');
  function* rodar(lista, prof) {
    for (const b of lista || []) {
      if (++st.passos > MAX_PASSOS || prof > 30) { yield { tipo: 'fim', motivo: 'longo' }; throw PARA; }
      yield { tipo: 'bloco', id: b.id };
      if (b.t === 'andar') {
        st.tiques++;
        if (!podeAndar(F, st.x, st.y, st.dir)) {
          const [dx, dy] = DIRS[st.dir];
          st.batidas++;
          yield { tipo: 'bateu', x: st.x + dx, y: st.y + dy, dir: st.dir };
          if (!corrida) { yield { tipo: 'fim', motivo: 'bateu' }; throw PARA; }
          st.tiques += PENALIDADE_BATIDA;
          continue;
        }
        const [dx, dy] = DIRS[st.dir];
        st.x += dx; st.y += dy;
        yield { tipo: 'andou', x: st.x, y: st.y, dir: st.dir };
        if (naComida() && !faltam()) { st.chegou = st.tiques; yield { tipo: 'venceu' }; throw PARA; }
      } else if (b.t === 'virar') {
        st.tiques++;
        st.dir = (st.dir + (espelhar ? -b.g : b.g) + 8) % 8;
        yield { tipo: 'virou', dir: st.dir };
      } else if (b.t === 'pegar') {
        st.tiques++;
        const p = F.petiscos.find(([x, y]) => x === st.x && y === st.y && !st.pegos.has(k(x, y)));
        if (p) { st.pegos.add(k(...p)); yield { tipo: 'pegou', x: st.x, y: st.y }; if (naComida() && !faltam()) { st.chegou = st.tiques; yield { tipo: 'venceu' }; throw PARA; } }
        else yield { tipo: 'nada', x: st.x, y: st.y };
      } else if (b.t === 'repita') {
        for (let i = 0; i < Math.max(0, Math.min(50, Number(b.n) || 0)); i++) yield* rodar(b.corpo, prof + 1);
      } else if (b.t === 'repita_ate') {
        while (!naComida()) {
          if (++st.passos > MAX_PASSOS) { yield { tipo: 'fim', motivo: 'longo' }; throw PARA; }
          yield* rodar(b.corpo, prof + 1);
        }
      } else if (b.t === 'chamar') {
        yield* rodar(prog.f1, prof + 1);
      } else if (b.t === 'se') {
        yield* rodar(cond(b.c) ? b.corpo : b.senao, prof + 1);
      }
    }
  }
  try {
    yield* rodar(prog.corpo, 0);
    yield { tipo: 'fim', motivo: 'acabou', naComida: naComida(), faltam: faltam() };
  } catch (e) { if (e !== PARA) throw e; }
}

// Roda tudo de uma vez: { venceu, motivo, estado, eventos }
export function simular(fase, prog, opcoes = {}) {
  const eventos = [];
  let venceu = false, motivo = null, fim = null;
  const saida = {};
  for (const ev of executar(fase, prog, opcoes, saida)) {
    eventos.push(ev);
    if (ev.tipo === 'venceu') venceu = true;
    if (ev.tipo === 'fim') { motivo = ev.motivo; fim = ev; }
  }
  return { venceu, motivo: venceu ? 'venceu' : motivo, fim, estado: saida.estado, eventos };
}

// ── Busca de caminho (BFS): distância em passos de (x, y) até a comida; Infinity se não chega ──
export function distancias(F, alvo = F.comida) {
  const dist = new Map([[k(...alvo), 0]]), fila = [alvo];
  const passos = F.diagonal ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 2, 4, 6];
  while (fila.length) {
    const [x, y] = fila.shift();
    for (const d of passos) {
      const [dx, dy] = DIRS[d];
      // simétrico: se dá para ir de (x+dx, y+dy) até (x, y), também dá o contrário
      if (!podeAndar(F, x, y, d)) continue;
      const kk = k(x + dx, y + dy);
      if (dist.has(kk)) continue;
      dist.set(kk, dist.get(k(x, y)) + 1);
      fila.push([x + dx, y + dy]);
    }
  }
  return dist;
}
export const distAteComida = (F, x, y) => distancias(F).get(k(x, y)) ?? Infinity;

// ── Sorteio repetível ──
export function semente(txt) {
  let h = 2166136261;
  for (const c of String(txt)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Desafio do dia: grade 7 × 5, igual para todos no dia (semente = data), sempre com solução e caminho de 6+ passos
export function faseDoDia(data, blocos, diagonal = false) {
  const rnd = semente(`programe-dia|${data}`);
  for (let tent = 0; tent < 500; tent++) {
    const w = 7, h = 5, ini = [0, Math.floor(rnd() * h)], com = [w - 1 - Math.floor(rnd() * 2), Math.floor(rnd() * h)];
    const linhas = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) =>
      x === ini[0] && y === ini[1] ? 'P' : x === com[0] && y === com[1] ? 'C' : rnd() < 0.3 ? '#' : '.').join(''));
    const f = { id: `dia-${data}`, nome: 'Desafio do dia', dir: '>', mapa: linhas, blocos, diagonal };
    const d = distAteComida(lerFase(f), ...ini);
    if (d >= 6 && d < Infinity) return f;
  }
  return { id: `dia-${data}`, nome: 'Desafio do dia', dir: '>', mapa: ['P.....C'], blocos, diagonal };
}

// Corrida: grade 9 × 6 espelhada (esquerda ↔ direita), muitos obstáculos, comida na coluna do meio; os dois pets saem de
// cantos espelhados (A à esquerda olhando para a direita, B à direita olhando para a esquerda) e ficam à mesma distância.
export function faseDaCorrida(semTxt, blocos, diagonal = false) {
  const rnd = semente(`programe-corrida|${semTxt}`);
  const w = 9, h = 6, meio = 4;
  for (let tent = 0; tent < 500; tent++) {
    const yA = rnd() < 0.5 ? 0 : h - 1, yC = 1 + Math.floor(rnd() * (h - 2));
    const g = Array.from({ length: h }, () => Array(w).fill('.'));
    for (let y = 0; y < h; y++) for (let x = 0; x < meio; x++) if (rnd() < 0.32) { g[y][x] = '#'; g[y][w - 1 - x] = '#'; }
    for (let y = 0; y < h; y++) if (rnd() < 0.25) g[y][meio] = '#';
    g[yA][0] = 'P'; g[yA][w - 1] = '.'; g[yC][meio] = 'C';
    const mapa = g.map(l => l.join(''));
    const fA = { id: `corrida-${semTxt}`, nome: 'Corrida', dir: '>', mapa, blocos, diagonal };
    const F = lerFase(fA), dist = distancias(F);
    const dA = dist.get(k(0, yA)) ?? Infinity, dB = dist.get(k(w - 1, yA)) ?? Infinity;
    // várias rotas: além do caminho mais curto, a comida tem pelo menos 2 vizinhos livres
    const vizinhos = [0, 2, 4, 6].filter(d => podeAndar(F, meio, yC, d)).length;
    if (dA >= 7 && dA < Infinity && dA === dB && vizinhos >= 2) return { ...fA, inicioB: [w - 1, yA], dirB: '<' };
  }
  return { id: `corrida-${semTxt}`, nome: 'Corrida', dir: '>', mapa: ['P...C....'], blocos, diagonal, inicioB: [8, 0], dirB: '<' };
}
// A mesma fase vista do lado B (pet B no lugar do P, olhando para a esquerda)
export function ladoB(f) {
  const mapa = f.mapa.map(l => l.replace('P', '.'));
  const [xb, yb] = f.inicioB;
  mapa[yb] = mapa[yb].slice(0, xb) + 'P' + mapa[yb].slice(xb + 1);
  return { ...f, mapa, dir: f.dirB || '<' };
}

// Resultado da corrida: quem chega primeiro (menos tiques); ninguém chegou: quem terminou mais perto; igual: empate
export function resultadoCorrida(faseA, progA, progB, { espelharB = false } = {}) {
  const FA = lerFase(faseA), FB = lerFase(ladoB(faseA));
  const sa = simular(FA, progA || { corpo: [] }, { corrida: true });
  const sb = simular(FB, progB || { corpo: [] }, { corrida: true, espelhar: espelharB });
  const pos = (s) => ({ chegou: s.estado.chegou, dist: s.estado.chegou != null ? 0 : distAteComida(FA, s.estado.x, s.estado.y), tiques: s.estado.tiques, batidas: s.estado.batidas });
  const a = pos(sa), b = pos(sb);
  let vencedor;
  if (a.chegou != null || b.chegou != null) vencedor = b.chegou == null || (a.chegou != null && a.chegou < b.chegou) ? 'a' : a.chegou == null || b.chegou < a.chegou ? 'b' : 'empate';
  else vencedor = a.dist < b.dist ? 'a' : b.dist < a.dist ? 'b' : 'empate';
  return { vencedor, a, b, eventosA: sa.eventos, eventosB: sb.eventos };
}

// Estrelas: ⭐ resolveu · ⭐⭐ blocos ≤ meta + 3 · ⭐⭐⭐ blocos ≤ meta
export const estrelasDe = (blocos, meta) => (!meta ? 1 : blocos <= meta ? 3 : blocos <= meta + 3 ? 2 : 1);

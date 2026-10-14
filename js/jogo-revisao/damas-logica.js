// Jogo de Revisão — Damas 6×6 na Praça (PROMPT-72): regras puras, sem DOM nem Firebase (usadas no jogo, no online e nos testes).
//
// Tabuleiro: string de 36 casas (índice = linha × 6 + coluna; linha 0 em cima). '.' vazia · 'a' / 'A' peça / dama do lado A
// (começa embaixo, linhas 4–5, anda para cima) · 'b' / 'B' do lado B (começa em cima, linhas 0–1, anda para baixo).
// Só as casas escuras ((linha + coluna) ímpar) são usadas: 6 peças para cada lado.
// Estado: { tab, vez: 'a' | 'b', semAvanco (jogadas seguidas sem captura e sem peça comum andar), n (jogadas feitas) }
// Jogada: { de, caminho: [casas por onde passa, a última é o destino], cap: [casas das peças capturadas] }
//   captura em sequência = uma jogada só (o caminho tem todos os pulos).
// Regras: peça comum anda 1 casa na diagonal para a frente; captura pulando 1 peça adjacente, para a frente ou para trás;
// captura obrigatória; em sequência no mesmo turno. Chegou na última linha: vira dama (e a jogada acaba ali).
// Dama: anda 1 casa em qualquer diagonal e captura pulando 1 peça adjacente, também em sequência.
// Fim: quem fica sem peças ou sem jogada perde; 20 jogadas seguidas sem captura e sem peça comum andar = empate.

export const N = 6;
export const EMPATE_SEM_AVANCO = 20;
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const lin = (i) => Math.floor(i / N), col = (i) => i % N;
const casa = (l, c) => (l >= 0 && c >= 0 && l < N && c < N ? l * N + c : -1);
const ladoDe = (p) => (p === 'a' || p === 'A' ? 'a' : p === 'b' || p === 'B' ? 'b' : null);
const ehDama = (p) => p === 'A' || p === 'B';
export const outro = (lado) => (lado === 'a' ? 'b' : 'a');
const frente = (lado) => (lado === 'a' ? -1 : 1);
const ultimaLinha = (lado) => (lado === 'a' ? 0 : N - 1);

export function estadoInicial() {
  let tab = '';
  for (let l = 0; l < N; l++) for (let c = 0; c < N; c++) tab += (l + c) % 2 === 1 ? (l < 2 ? 'b' : l >= N - 2 ? 'a' : '.') : '.';
  return { tab, vez: 'a', semAvanco: 0, n: 0 };
}

// capturas a partir de `de` (peça `p`), com o tabuleiro já sem as capturadas até aqui; devolve as sequências completas
function capturasDe(tab, de, p, caminho = [], cap = []) {
  const lado = ladoDe(p), out = [];
  for (const [dl, dc] of DIAG) {
    const meio = casa(lin(de) + dl, col(de) + dc), alvo = casa(lin(de) + 2 * dl, col(de) + 2 * dc);
    if (meio < 0 || alvo < 0 || tab[alvo] !== '.' || ladoDe(tab[meio]) !== outro(lado) || cap.includes(meio)) continue;
    const novoCam = [...caminho, alvo], novoCap = [...cap, meio];
    // a peça comum que chega na última linha vira dama e a jogada termina ali
    if (!ehDama(p) && lin(alvo) === ultimaLinha(lado)) { out.push({ caminho: novoCam, cap: novoCap }); continue; }
    const t2 = tab.slice(0, de) + '.' + tab.slice(de + 1);
    const tab2 = t2.slice(0, alvo) + p + t2.slice(alvo + 1);
    const mais = capturasDe(tab2, alvo, p, novoCam, novoCap);
    if (mais.length) out.push(...mais); else out.push({ caminho: novoCam, cap: novoCap });
  }
  return out;
}

// Todas as jogadas válidas de quem tem a vez (com captura obrigatória)
export function jogadasValidas(est) {
  const { tab, vez } = est, caps = [], simples = [];
  for (let i = 0; i < N * N; i++) {
    const p = tab[i];
    if (ladoDe(p) !== vez) continue;
    for (const s of capturasDe(tab, i, p)) caps.push({ de: i, ...s });
    if (caps.length) continue;   // já tem captura: as simples não valem
    for (const [dl, dc] of DIAG) {
      if (!ehDama(p) && dl !== frente(vez)) continue;
      const d = casa(lin(i) + dl, col(i) + dc);
      if (d >= 0 && tab[d] === '.') simples.push({ de: i, caminho: [d], cap: [] });
    }
  }
  return caps.length ? caps : simples;
}

const mesma = (a, b) => a.de === b.de && a.caminho.length === b.caminho.length && a.caminho.every((x, k) => x === b.caminho[k]);
export const ehValida = (est, j) => !!j && jogadasValidas(est).some(v => mesma(v, j));

// Aplica uma jogada (sem conferir; use ehValida antes) → estado novo
export function aplicar(est, j) {
  const t = est.tab.split(''), p = t[j.de], lado = ladoDe(p), fim = j.caminho[j.caminho.length - 1];
  t[j.de] = '.';
  for (const c of j.cap) t[c] = '.';
  t[fim] = !ehDama(p) && lin(fim) === ultimaLinha(lado) ? p.toUpperCase() : p;
  const avancou = j.cap.length > 0 || !ehDama(p);
  return { tab: t.join(''), vez: outro(lado), semAvanco: avancou ? 0 : (est.semAvanco || 0) + 1, n: (est.n || 0) + 1 };
}

export const contar = (tab, lado) => [...tab].filter(p => ladoDe(p) === lado).length;

// null = o jogo continua; senão { vencedor: 'a' | 'b' | 'empate', motivo: 'pecas' | 'sem_jogada' | 'empate' }
export function fimDeJogo(est) {
  if (!contar(est.tab, est.vez)) return { vencedor: outro(est.vez), motivo: 'pecas' };
  if (!jogadasValidas(est).length) return { vencedor: outro(est.vez), motivo: 'sem_jogada' };
  if ((est.semAvanco || 0) >= EMPATE_SEM_AVANCO) return { vencedor: 'empate', motivo: 'empate' };
  return null;
}

// ── Computador ──
// fácil: aleatória (a captura já é obrigatória) · médio: 2 jogadas à frente, só peças (dama = 3)
// difícil: 4 jogadas à frente, + avançar e ficar nas bordas (onde não pode ser capturada)
function avaliar(tab, lado, dificil) {
  let v = 0;
  for (let i = 0; i < N * N; i++) {
    const p = tab[i], l = ladoDe(p);
    if (!l) continue;
    let x = ehDama(p) ? 3 : 1;
    if (dificil) {
      if (!ehDama(p)) x += 0.08 * (l === 'a' ? N - 1 - lin(i) : lin(i));   // avançar
      if (col(i) === 0 || col(i) === N - 1) x += 0.15;                    // borda: protegida
      if (lin(i) === (l === 'a' ? N - 1 : 0)) x += 0.1;                   // guardar a fileira de trás
    }
    v += l === lado ? x : -x;
  }
  return v;
}
function minimax(est, prof, lado, alfa, beta, dificil) {
  const f = fimDeJogo(est);
  if (f) return f.vencedor === 'empate' ? 0 : f.vencedor === lado ? 1000 + prof : -1000 - prof;
  if (prof === 0) return avaliar(est.tab, lado, dificil);
  const js = jogadasValidas(est), max = est.vez === lado;
  let melhor = max ? -Infinity : Infinity;
  for (const j of js) {
    const v = minimax(aplicar(est, j), prof - 1, lado, alfa, beta, dificil);
    if (max) { melhor = Math.max(melhor, v); alfa = Math.max(alfa, v); } else { melhor = Math.min(melhor, v); beta = Math.min(beta, v); }
    if (beta <= alfa) break;
  }
  return melhor;
}
export const jogadaAleatoria = (est, rnd = Math.random) => { const js = jogadasValidas(est); return js.length ? js[Math.floor(rnd() * js.length)] : null; };
export function jogadaComputador(est, nivel = 'facil', rnd = Math.random) {
  const js = jogadasValidas(est);
  if (!js.length) return null;
  if (nivel === 'facil') return js[Math.floor(rnd() * js.length)];
  const prof = nivel === 'dificil' ? 4 : 2, dificil = nivel === 'dificil', lado = est.vez;
  let melhores = [], mv = -Infinity;
  for (const j of js) {
    const v = minimax(aplicar(est, j), prof - 1, lado, -Infinity, Infinity, dificil);
    if (v > mv + 1e-9) { mv = v; melhores = [j]; } else if (Math.abs(v - mv) <= 1e-9) melhores.push(j);
  }
  return melhores[Math.floor(rnd() * melhores.length)];
}

// ── Testes simples: no console, `(await import('/js/jogo-revisao/damas-logica.js')).testesDamas()` ──
export function testesDamas(log = console.log) {
  const vazio = '.'.repeat(N * N), por = (pares) => { const t = vazio.split(''); for (const [i, p] of pares) t[i] = p; return t.join(''); };
  const ok = [], falha = [];
  const conf = (nome, cond) => (cond ? ok : falha).push(nome);
  const ini = estadoInicial();
  conf('6 peças de cada lado', contar(ini.tab, 'a') === 6 && contar(ini.tab, 'b') === 6);
  conf('A começa com 5 jogadas (linha da frente, só para cima)', jogadasValidas(ini).length === 5 && jogadasValidas(ini).every(j => lin(j.caminho[0]) === 3));
  // captura obrigatória: a peça A em (3,2) pode capturar B em (2,3) → (1,4); a jogada simples de outra peça não vale
  let e = { tab: por([[casa(3, 2), 'a'], [casa(2, 3), 'b'], [casa(5, 0), 'a'], [casa(0, 5), 'b']]), vez: 'a', semAvanco: 0, n: 0 };
  let js = jogadasValidas(e);
  conf('captura obrigatória', js.length === 1 && js[0].cap[0] === casa(2, 3));
  // captura para trás (peça comum)
  e = { tab: por([[casa(2, 2), 'a'], [casa(3, 3), 'b'], [casa(0, 1), 'b']]), vez: 'a', semAvanco: 0, n: 0 };
  conf('peça comum captura para trás', jogadasValidas(e).some(j => j.cap[0] === casa(3, 3) && j.caminho[0] === casa(4, 4)));
  // captura em sequência: A (5,0) pula (4,1) → (3,2), pula (2,3) → (1,4)
  e = { tab: por([[casa(5, 0), 'a'], [casa(4, 1), 'b'], [casa(2, 3), 'b'], [casa(0, 5), 'b']]), vez: 'a', semAvanco: 0, n: 0 };
  js = jogadasValidas(e);
  conf('captura em sequência numa jogada só', js.length === 1 && js[0].cap.length === 2 && js[0].caminho.at(-1) === casa(1, 4));
  // vira dama ao chegar na última linha (e a jogada acaba)
  e = { tab: por([[casa(1, 2), 'a'], [casa(5, 0), 'b']]), vez: 'a', semAvanco: 0, n: 0 };
  const e2 = aplicar(e, jogadasValidas(e)[0]);
  conf('vira dama na última linha', e2.tab.includes('A'));
  // dama anda 1 casa em qualquer diagonal
  e = { tab: por([[casa(2, 2), 'A'], [casa(5, 5), 'b']]), vez: 'a', semAvanco: 0, n: 0 };
  conf('dama anda 1 casa para os 4 lados', jogadasValidas(e).length === 4 && jogadasValidas(e).every(j => Math.abs(lin(j.caminho[0]) - 2) === 1));
  // dama captura 1 peça adjacente
  e = { tab: por([[casa(2, 2), 'A'], [casa(3, 3), 'b']]), vez: 'a', semAvanco: 0, n: 0 };
  conf('dama captura pulando 1 peça adjacente', jogadasValidas(e).length === 1 && jogadasValidas(e)[0].caminho[0] === casa(4, 4));
  // fim: sem peças / sem jogada / empate
  conf('sem peças: perde', fimDeJogo({ tab: por([[casa(0, 1), 'b']]), vez: 'a', semAvanco: 0 })?.vencedor === 'b');
  conf('sem jogada: perde', fimDeJogo({ tab: por([[casa(0, 1), 'a'], [casa(5, 0), 'b']]), vez: 'a', semAvanco: 0 })?.vencedor === 'b');
  conf('20 jogadas sem avanço: empate', fimDeJogo({ tab: por([[casa(2, 2), 'A'], [casa(4, 4), 'B']]), vez: 'a', semAvanco: 20 })?.vencedor === 'empate');
  // partidas inteiras computador × computador sempre terminam e só com jogadas válidas
  let partidas = 0, invalidas = 0;
  for (const [na, nb] of [['facil', 'facil'], ['medio', 'facil'], ['dificil', 'medio']]) for (let k = 0; k < 3; k++) {
    let s = estadoInicial(), f = null, guarda = 0;
    while (!(f = fimDeJogo(s)) && guarda++ < 400) { const j = jogadaComputador(s, s.vez === 'a' ? na : nb); if (!ehValida(s, j)) invalidas++; s = aplicar(s, j); }
    if (f) partidas++;
  }
  conf('partidas do computador terminam com jogadas válidas', partidas === 9 && invalidas === 0);
  log(`Damas: ${ok.length} ok${falha.length ? `, FALHOU: ${falha.join('; ')}` : ''}`);
  return !falha.length;
}

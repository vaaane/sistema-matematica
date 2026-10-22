// Jogo de Revisão — Damas na Praça (PROMPT-72; regra oficial brasileira, 8×8, PROMPT-127): regras puras, sem DOM nem Firebase
// (usadas no jogo, no online e nos testes).
//
// Tabuleiro: string de 64 casas (índice = linha × 8 + coluna; linha 0 em cima). '.' vazia · 'a' / 'A' peça / dama do lado A
// (começa embaixo, linhas 5–7, anda para cima; joga primeiro) · 'b' / 'B' do lado B (começa em cima, linhas 0–2, anda para baixo).
// Só as casas escuras ((linha + coluna) ímpar) são usadas: 12 peças para cada lado.
// Estado: { tab, vez: 'a' | 'b', semAvanco (jogadas seguidas sem captura e sem peça comum andar), n (jogadas feitas) }
// Jogada: { de, caminho: [casas onde a peça pousa, a última é o destino], cap: [casas das peças capturadas] }
//   captura em sequência = uma jogada só (o caminho tem todos os pousos).
// Regras:
//  · peça comum anda 1 casa na diagonal, só para a frente; captura pulando 1 peça adjacente, para a frente ou para trás;
//  · captura em sequência na mesma jogada; as capturadas só saem no fim da jogada (até lá não podem ser puladas de novo
//    e bloqueiam a passagem);
//  · vira dama só se TERMINA a jogada na última fileira (passar por ela no meio de uma sequência não conta);
//  · dama voadora: anda quantas casas vazias quiser em qualquer diagonal; captura uma peça a qualquer distância (casas
//    até ela vazias e a logo depois também) e pode parar em qualquer casa vazia depois dela, continuando dali;
//  · captura obrigatória + lei da maioria: só valem as capturas com o maior número de peças (dama e comum valem igual);
//    empate na quantidade: o jogador escolhe.
// Fim: quem fica sem peças ou sem jogada perde; 20 jogadas seguidas sem captura e sem peça comum andar = empate.

export const N = 8;
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
  for (let l = 0; l < N; l++) for (let c = 0; c < N; c++) tab += (l + c) % 2 === 1 ? (l < 3 ? 'b' : l >= N - 3 ? 'a' : '.') : '.';
  return { tab, vez: 'a', semAvanco: 0, n: 0 };
}

// Capturas a partir de `de` (peça `p`, que saiu de `origem`): devolve as sequências completas { caminho, cap }.
// O tabuleiro não muda durante a sequência: a casa de origem conta como vazia e as já capturadas (cap) bloqueiam.
function capturasDe(tab, de, p, origem = de, caminho = [], cap = []) {
  const lado = ladoDe(p), dama = ehDama(p), out = [];
  const livre = (i) => i >= 0 && (tab[i] === '.' || i === origem) && !cap.includes(i);
  for (const [dl, dc] of DIAG) {
    let l = lin(de) + dl, c = col(de) + dc;
    if (dama) while (livre(casa(l, c))) { l += dl; c += dc; }   // a dama voa até a 1ª peça da diagonal
    const meio = casa(l, c);
    if (meio < 0 || cap.includes(meio) || meio === origem || ladoDe(tab[meio]) !== outro(lado)) continue;
    const pousos = [];
    for (let l2 = l + dl, c2 = c + dc; livre(casa(l2, c2)); l2 += dl, c2 += dc) { pousos.push(casa(l2, c2)); if (!dama) break; }
    for (const alvo of pousos) {
      const novoCam = [...caminho, alvo], novoCap = [...cap, meio];
      const mais = capturasDe(tab, alvo, p, origem, novoCam, novoCap);
      if (mais.length) out.push(...mais); else out.push({ caminho: novoCam, cap: novoCap });
    }
  }
  return out;
}

// Todas as capturas de quem tem a vez, sem a lei da maioria (a tela usa para avisar que alguma foi eliminada)
export function todasCapturas(est) {
  const { tab, vez } = est, caps = [];
  for (let i = 0; i < N * N; i++) if (ladoDe(tab[i]) === vez) for (const s of capturasDe(tab, i, tab[i])) caps.push({ de: i, ...s });
  return caps;
}

// Todas as jogadas válidas de quem tem a vez (captura obrigatória + lei da maioria)
export function jogadasValidas(est) {
  const caps = todasCapturas(est);
  if (caps.length) { const max = Math.max(...caps.map(j => j.cap.length)); return caps.filter(j => j.cap.length === max); }
  const { tab, vez } = est, simples = [];
  for (let i = 0; i < N * N; i++) {
    const p = tab[i];
    if (ladoDe(p) !== vez) continue;
    for (const [dl, dc] of DIAG) {
      if (!ehDama(p) && dl !== frente(vez)) continue;
      for (let l = lin(i) + dl, c = col(i) + dc; casa(l, c) >= 0 && tab[casa(l, c)] === '.'; l += dl, c += dc) {
        simples.push({ de: i, caminho: [casa(l, c)], cap: [] });
        if (!ehDama(p)) break;   // a comum anda 1 casa; a dama, até bater numa peça ou na borda
      }
    }
  }
  return simples;
}

const mesma = (a, b) => a.de === b.de && a.caminho.length === b.caminho.length && a.caminho.every((x, k) => x === b.caminho[k]);
export const ehValida = (est, j) => !!j && jogadasValidas(est).some(v => mesma(v, j));

// Aplica uma jogada (sem conferir; use ehValida antes) → estado novo
export function aplicar(est, j) {
  const t = est.tab.split(''), p = t[j.de], lado = ladoDe(p), fim = j.caminho[j.caminho.length - 1];
  t[j.de] = '.';
  for (const c of j.cap) t[c] = '.';
  t[fim] = !ehDama(p) && lin(fim) === ultimaLinha(lado) ? p.toUpperCase() : p;   // só vira dama se terminar na última fileira
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
// difícil: até 4 jogadas à frente (aprofundamento iterativo com limite de ~400 ms), + avançar e ficar nas bordas
const LIMITE_MS = 400;
const agoraMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
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
class TempoEsgotado extends Error {}
function minimax(est, prof, lado, alfa, beta, dificil, ate) {
  if (ate && agoraMs() > ate) throw new TempoEsgotado();
  const f = fimDeJogo(est);
  if (f) return f.vencedor === 'empate' ? 0 : f.vencedor === lado ? 1000 + prof : -1000 - prof;
  if (prof === 0) return avaliar(est.tab, lado, dificil);
  const js = jogadasValidas(est), max = est.vez === lado;
  let melhor = max ? -Infinity : Infinity;
  for (const j of js) {
    const v = minimax(aplicar(est, j), prof - 1, lado, alfa, beta, dificil, ate);
    if (max) { melhor = Math.max(melhor, v); alfa = Math.max(alfa, v); } else { melhor = Math.min(melhor, v); beta = Math.min(beta, v); }
    if (beta <= alfa) break;
  }
  return melhor;
}
// as melhores jogadas olhando `prof` jogadas à frente (ate: hora-limite, ou 0 = sem limite)
function melhoresJogadas(est, js, prof, dificil, ate) {
  const lado = est.vez;
  let melhores = [], mv = -Infinity;
  for (const j of js) {
    const v = minimax(aplicar(est, j), prof - 1, lado, -Infinity, Infinity, dificil, ate);
    if (v > mv + 1e-9) { mv = v; melhores = [j]; } else if (Math.abs(v - mv) <= 1e-9) melhores.push(j);
  }
  return melhores;
}
export const jogadaAleatoria = (est, rnd = Math.random) => { const js = jogadasValidas(est); return js.length ? js[Math.floor(rnd() * js.length)] : null; };
export function jogadaComputador(est, nivel = 'facil', rnd = Math.random, limiteMs = LIMITE_MS) {
  const js = jogadasValidas(est);
  if (!js.length) return null;
  if (nivel === 'facil' || js.length === 1) return js[Math.floor(rnd() * js.length)];
  let melhores;
  if (nivel === 'dificil') {   // 1, 2, 3, 4 jogadas à frente, enquanto couber no tempo; fica com a última profundidade completa
    const ate = agoraMs() + limiteMs;
    melhores = melhoresJogadas(est, js, 1, true, 0);
    for (let prof = 2; prof <= 4; prof++) {
      try { melhores = melhoresJogadas(est, js, prof, true, ate); } catch (e) { if (e instanceof TempoEsgotado) break; throw e; }
    }
  } else melhores = melhoresJogadas(est, js, 2, false, 0);
  return melhores[Math.floor(rnd() * melhores.length)];
}

// ── Testes simples: no console, `(await import('/js/jogo-revisao/damas-logica.js')).testesDamas()` ──
export function testesDamas(log = console.log) {
  const vazio = '.'.repeat(N * N), por = (pares) => { const t = vazio.split(''); for (const [i, p] of pares) t[i] = p; return t.join(''); };
  const ok = [], falha = [];
  const conf = (nome, cond) => (cond ? ok : falha).push(nome);
  const est = (pares, vez = 'a') => ({ tab: por(pares), vez, semAvanco: 0, n: 0 });
  const ini = estadoInicial();
  conf('12 peças de cada lado', contar(ini.tab, 'a') === 12 && contar(ini.tab, 'b') === 12);
  conf('A começa com 7 jogadas (linha da frente, só para cima)', jogadasValidas(ini).length === 7 && jogadasValidas(ini).every(j => lin(j.de) === 5 && lin(j.caminho[0]) === 4));
  // captura obrigatória: A (5,2) captura B (4,3) → (3,4); a jogada simples de outra peça não vale
  let e = est([[casa(5, 2), 'a'], [casa(4, 3), 'b'], [casa(7, 0), 'a'], [casa(0, 7), 'b']]);
  let js = jogadasValidas(e);
  conf('captura obrigatória', js.length === 1 && js[0].cap[0] === casa(4, 3));
  // peça comum captura para trás
  e = est([[casa(4, 2), 'a'], [casa(5, 3), 'b'], [casa(0, 1), 'b']]);
  conf('peça comum captura para trás', jogadasValidas(e).some(j => j.cap[0] === casa(5, 3) && j.caminho[0] === casa(6, 4)));
  // sequência: A (7,0) pula (6,1) → (5,2), pula (4,3) → (3,4)
  e = est([[casa(7, 0), 'a'], [casa(6, 1), 'b'], [casa(4, 3), 'b'], [casa(0, 7), 'b']]);
  js = jogadasValidas(e);
  conf('captura em sequência numa jogada só', js.length === 1 && js[0].cap.length === 2 && js[0].caminho.at(-1) === casa(3, 4));
  // vira dama ao terminar na última linha
  e = est([[casa(1, 2), 'a'], [casa(7, 0), 'b']]);
  conf('vira dama na última linha', aplicar(e, jogadasValidas(e)[0]).tab.includes('A'));
  // passa pela última linha no meio da sequência: não vira dama. A (2,1) pula (1,2) → (0,3), pula (1,4) → (2,5)
  e = est([[casa(2, 1), 'a'], [casa(1, 2), 'b'], [casa(1, 4), 'b'], [casa(7, 6), 'b']]);
  js = jogadasValidas(e);
  const e3 = js.length === 1 ? aplicar(e, js[0]) : null;
  conf('passou pela última linha no meio da sequência: não vira dama', !!e3 && js[0].cap.length === 2 && e3.tab[casa(2, 5)] === 'a');
  // dama voadora: de (4,3), 12 casas nas 4 diagonais (a peça em (0,7) bloqueia a última)
  e = est([[casa(4, 3), 'A'], [casa(0, 7), 'b']]);
  js = jogadasValidas(e);
  conf('dama anda várias casas', js.length === 12 && js.some(j => j.caminho[0] === casa(7, 0)) && js.some(j => j.caminho[0] === casa(1, 6)) && !js.some(j => j.caminho[0] === casa(0, 7)));
  // dama captura de longe e pode parar em várias casas: A (7,0), B (3,4) → pousa em (2,5), (1,6) ou (0,7)
  e = est([[casa(7, 0), 'A'], [casa(3, 4), 'b']]);
  js = jogadasValidas(e);
  conf('dama captura de longe e escolhe onde parar', js.length === 3 && js.every(j => j.cap[0] === casa(3, 4)) && [casa(2, 5), casa(1, 6), casa(0, 7)].every(c => js.some(j => j.caminho[0] === c)));
  // dama não pula duas peças juntas
  e = est([[casa(7, 0), 'A'], [casa(4, 3), 'b'], [casa(3, 4), 'b'], [casa(0, 1), 'b']]);
  conf('dama não pula duas peças seguidas', jogadasValidas(e).every(j => !j.cap.length));
  // lei da maioria: A (5,0) captura 1 [(4,1)]; A (5,4) captura 2 [(4,5) e (2,5)] → só a de 2 vale
  e = est([[casa(5, 0), 'a'], [casa(4, 1), 'b'], [casa(5, 4), 'a'], [casa(4, 5), 'b'], [casa(2, 5), 'b']]);
  js = jogadasValidas(e);
  conf('lei da maioria', todasCapturas(e).length === 2 && js.length === 1 && js[0].de === casa(5, 4) && js[0].cap.length === 2);
  // peça capturada não é pulada duas vezes (dama em volta de uma peça só): A (4,1), B (3,2) — só 1 captura em cada caminho
  e = est([[casa(4, 1), 'A'], [casa(3, 2), 'b']]);
  js = jogadasValidas(e);
  conf('peça capturada não é pulada duas vezes', js.length > 0 && js.every(j => j.cap.length === 1 && new Set(j.cap).size === j.cap.length));
  // capturada bloqueia a passagem até o fim da jogada: A (6,1) pula (5,2) → (4,3); de lá, pular (5,2) de volta não vale
  e = est([[casa(6, 1), 'a'], [casa(5, 2), 'b'], [casa(5, 4), 'b'], [casa(0, 7), 'b']]);
  js = jogadasValidas(e);
  conf('capturadas saem só no fim e bloqueiam', js.every(j => new Set(j.cap).size === j.cap.length) && js.some(j => j.cap.length === 2));
  // fim: sem peças / sem jogada / empate
  conf('sem peças: perde', fimDeJogo(est([[casa(0, 1), 'b']]))?.vencedor === 'b');
  conf('sem jogada: perde', fimDeJogo(est([[casa(0, 1), 'a'], [casa(7, 0), 'b']]))?.vencedor === 'b');
  conf('20 jogadas sem avanço: empate', fimDeJogo({ ...est([[casa(2, 1), 'A'], [casa(5, 6), 'B']]), semAvanco: 20 })?.vencedor === 'empate');
  const ed = aplicar(est([[casa(2, 1), 'A'], [casa(7, 6), 'B']]), { de: casa(2, 1), caminho: [casa(3, 2)], cap: [] });
  conf('dama andando conta para o empate', ed.semAvanco === 1);
  // partidas inteiras computador × computador sempre terminam e só com jogadas válidas
  let partidas = 0, invalidas = 0;
  for (const [na, nb] of [['facil', 'facil'], ['medio', 'facil'], ['dificil', 'medio']]) for (let k = 0; k < 2; k++) {
    let s = estadoInicial(), f = null, guarda = 0;
    while (!(f = fimDeJogo(s)) && guarda++ < 400) { const j = jogadaComputador(s, s.vez === 'a' ? na : nb, Math.random, 150); if (!ehValida(s, j)) invalidas++; s = aplicar(s, j); }
    if (f) partidas++;
  }
  conf('partidas do computador terminam com jogadas válidas', partidas === 6 && invalidas === 0);
  log(`Damas: ${ok.length} ok${falha.length ? `, FALHOU: ${falha.join('; ')}` : ''}`);
  return !falha.length;
}

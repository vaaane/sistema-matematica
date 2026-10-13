// Tabuada ao vivo (PROMPT-30): regras puras — código da sala, contas, pontos e placar.
// A sala no Firebase fica em js/jogo-revisao/aovivo-sala.js; as telas em js/jogo-revisao.js (alunos) e
// professor/p-tabuada-ao-vivo.html (projetor).

export const TEMPO_RODADA_MS = 8000, INTERVALO_MS = 3000, MAX_JOGADORES = 40, MIN_JOGADORES = 2;
export const PREMIO_PODIO = [5, 3, 2];   // moedas do 1º, 2º e 3º (uma vez por sala)

const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // sem 0/O, 1/I/L
export function gerarCodigo(rnd = Math.random) {
  let c = '';
  for (let i = 0; i < 4; i++) c += LETRAS[Math.floor(rnd() * LETRAS.length)];
  return c;
}
export const codigoValido = (c) => /^[A-Z0-9]{4}$/.test(String(c || '').toUpperCase());

const fmt = (n) => (n < 0 ? '−' + Math.abs(n) : String(n));
const entre = (a, b, rnd) => a + Math.floor(rnd() * (b - a + 1));
const embaralhar = (arr, rnd) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

// cfg: { tipo: 'normal' | 'negativa', numeros: [2..10], rodadas }
// normal: a × b (a da lista, b de 2 a 10); negativa: os mesmos fatores com sinais (pelo menos um negativo quase sempre)
export function gerarContaAoVivo(cfg, rnd = Math.random) {
  const nums = (cfg?.numeros || []).map(Number).filter(n => n >= 2 && n <= 10);
  const lista = nums.length ? nums : [2, 3, 4, 5, 6, 7, 8, 9, 10];
  let a = lista[Math.floor(rnd() * lista.length)], b = entre(2, 10, rnd);
  if (rnd() < 0.5) [a, b] = [b, a];
  if (cfg?.tipo === 'negativa') {
    const s = rnd();
    if (s < 0.4) a = -a; else if (s < 0.8) b = -b; else if (s < 0.95) { a = -a; b = -b; }
  }
  const r = a * b;
  const par = (n) => (n < 0 ? `(${fmt(n)})` : fmt(n));
  const conta = `${par(a)} × ${par(b)}`;
  // erradas plausíveis: um fator a mais/a menos e, na negativa, o sinal trocado
  const cand = [a * (b + Math.sign(b || 1)), a * (b - Math.sign(b || 1)), (a + Math.sign(a || 1)) * b, (a - Math.sign(a || 1)) * b, r + 10, r - 10];
  if (cfg?.tipo === 'negativa' && r !== 0) cand.unshift(-r, -r);
  const erradas = [];
  for (const v of cand) if (v !== r && !erradas.includes(v) && erradas.length < 3) erradas.push(v);
  for (let k = 1; erradas.length < 3; k++) if (!erradas.includes(r + k) && r + k !== r) erradas.push(r + k);
  return { conta, resposta: fmt(r), opcoes: embaralhar([r, ...erradas].map(fmt), rnd) };
}

// Acertou dentro do prazo: 500 + até 500 pela rapidez
export function pontosDaResposta(t, inicio, dur = TEMPO_RODADA_MS) {
  const usado = Number(t) - Number(inicio);
  if (!(usado >= 0) || usado > dur) return 0;
  return 500 + Math.round(500 * (1 - usado / dur));
}

// Placar ordenado: [{ uid, nome, pontos, ... , pos }]
export function placar(jogadores, soOnline = false) {
  return Object.entries(jogadores || {}).filter(([, j]) => j && (!soOnline || j.on))
    .map(([uid, j]) => ({ uid, ...j, pontos: Number(j.pontos) || 0 }))
    .sort((a, b) => b.pontos - a.pontos || String(a.nome).localeCompare(String(b.nome)))
    .map((j, i) => ({ ...j, pos: i + 1 }));
}

// Fecha a rodada: pontos de cada jogador (resposta depois do prazo não vale), sequência de 3 acertos = +100,
// posição anterior para o ↑↓ do top 5. Devolve { jogadores: { uid: campos }, certos, total }
export function fecharRodada(jogadores, resp, rodada, dur = TEMPO_RODADA_MS) {
  const antes = Object.fromEntries(placar(jogadores, true).map(j => [j.uid, j.pos]));
  const novos = {};
  let certos = 0, total = 0;
  for (const [uid, j] of Object.entries(jogadores || {})) {
    if (!j) continue;
    const r = resp?.[uid];
    const acertou = !!r && r.op === rodada.resposta && pontosDaResposta(r.t, rodada.inicio, dur) > 0;
    if (j.on || r) total++;
    if (acertou) certos++;
    const seq = acertou ? (Number(j.seq) || 0) + 1 : 0;
    const ganho = acertou ? pontosDaResposta(r.t, rodada.inicio, dur) + (seq > 0 && seq % 3 === 0 ? 100 : 0) : 0;
    novos[uid] = { pontos: (Number(j.pontos) || 0) + ganho, seq, ganho, acertou, pos_ant: antes[uid] || null };
  }
  return { jogadores: novos, certos, total };
}

export const premioDoPodio = (pos) => PREMIO_PODIO[pos - 1] || 0;

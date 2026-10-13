// Tabuada ao vivo (PROMPT-30): a sala no Firebase — criar, entrar, responder e o anfitrião que conduz as rodadas.
// jogo_revisao_aovivo/ (modo teste: jogo_revisao_aovivo_teste/):
//   salas/{código} = { host, host_nome, turma, cfg: { tipo, numeros, rodadas }, estado: 'espera'|'rodada'|'intervalo'|'fim',
//                      criada, encerrada, atual, rodada: { i, conta, opcoes, resposta, inicio, fim: { certos, total } },
//                      jogadores/{uid} = { nome, turma, pers, on, pontos, seq, ganho, acertou, pos_ant, entrou },
//                      resp/{i}/{uid} = { op, t } }        (t e inicio: relógio do servidor)
//   convites/{turma} = { codigo, ts }                     (a professora abriu uma sala para a turma)
// Sala encerrada é apagada 1 h depois (limpeza feita por quem cria uma sala nova); abandonada, depois de 6 h.
import { db } from '/js/firebase-config.js';
import { ref, get, set, update, remove, onValue, runTransaction, onDisconnect, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { gerarCodigo, gerarContaAoVivo, fecharRodada, placar, TEMPO_RODADA_MS, INTERVALO_MS, MAX_JOGADORES, MIN_JOGADORES } from '/js/jogo-revisao/aovivo.js';

export const baseAoVivo = (teste) => (teste ? 'jogo_revisao_aovivo_teste' : 'jogo_revisao_aovivo');
let offset = 0;
try { onValue(ref(db, '.info/serverTimeOffset'), (s) => { offset = Number(s.val()) || 0; }); } catch (_) {}
export const agoraServ = () => Date.now() + offset;

export async function limparSalasVelhas(base) {
  try {
    const s = await get(ref(db, `${base}/salas`));
    if (!s.exists()) return;
    const agora = agoraServ(), apagar = {};
    for (const [c, sala] of Object.entries(s.val() || {})) {
      const enc = Number(sala?.encerrada) || 0, criada = Number(sala?.criada) || 0;
      if ((enc && agora - enc > 3600e3) || (!enc && agora - criada > 6 * 3600e3)) apagar[c] = null;
    }
    if (Object.keys(apagar).length) await update(ref(db, `${base}/salas`), apagar);
  } catch (_) {}
}

// Cria a sala com um código livre (transação: dois anfitriões nunca pegam o mesmo código)
export async function criarSala(base, { host, host_nome, turma = '', cfg }) {
  await limparSalasVelhas(base);
  for (let tent = 0; tent < 12; tent++) {
    const codigo = gerarCodigo();
    const t = await runTransaction(ref(db, `${base}/salas/${codigo}`), (cur) => (cur ? undefined : {
      host, host_nome, turma, cfg, estado: 'espera', criada: Date.now(), atual: -1,
    }));
    if (t.committed) { await update(ref(db, `${base}/salas/${codigo}`), { criada: serverTimestamp() }); return codigo; }
  }
  throw new Error('sem código livre');
}

export function ouvirSala(base, codigo, cb) {
  return onValue(ref(db, `${base}/salas/${codigo}`), (s) => cb(s.exists() ? s.val() : null), () => cb(null));
}

// Entra (ou volta) na sala: guarda os pontos de quem já estava; saiu no meio = on: false (some do placar)
export async function entrarNaSala(base, codigo, j) {
  const s = await get(ref(db, `${base}/salas/${codigo}`));
  if (!s.exists()) return { erro: 'Não achei essa sala. Confira o código.' };
  const sala = s.val();
  if (sala.estado === 'fim') return { erro: 'Essa sala já terminou.' };
  const ja = sala.jogadores?.[j.uid];
  const online = Object.values(sala.jogadores || {}).filter(x => x?.on).length;
  if (!ja && online >= MAX_JOGADORES) return { erro: `A sala está cheia (${MAX_JOGADORES} jogadores).` };
  const r = ref(db, `${base}/salas/${codigo}/jogadores/${j.uid}`);
  await update(r, { nome: j.nome, turma: j.turma || '', pers: j.pers || null, on: true, ...(ja ? {} : { pontos: 0, seq: 0, entrou: serverTimestamp() }) });
  await onDisconnect(ref(db, `${base}/salas/${codigo}/jogadores/${j.uid}/on`)).set(false);
  return { sala };
}
export async function sairDaSala(base, codigo, uid) {
  try {
    await onDisconnect(ref(db, `${base}/salas/${codigo}/jogadores/${uid}/on`)).cancel();
    await set(ref(db, `${base}/salas/${codigo}/jogadores/${uid}/on`), false);
  } catch (_) {}
}
// Uma resposta por rodada (a tela só deixa responder uma vez); t = hora do servidor
export const responder = (base, codigo, i, uid, op) => set(ref(db, `${base}/salas/${codigo}/resp/${i}/${uid}`), { op, t: serverTimestamp() });
export const convidarTurma = (base, turma, codigo) => set(ref(db, `${base}/convites/${turma}`), { codigo, ts: serverTimestamp() });
export const ouvirConviteTurma = (base, turma, cb) => onValue(ref(db, `${base}/convites/${turma}`), (s) => cb(s.exists() ? s.val() : null), () => {});

// Anfitrião: começa, gera cada rodada, fecha no prazo (ou quando todos responderam) e calcula os pontos.
// auto: true (aluno anfitrião) passa sozinho para a próxima rodada; false (professora) espera o botão "Próxima".
export class Anfitriao {
  constructor(base, codigo, { auto = true, aoMudar = () => {} } = {}) {
    Object.assign(this, { base, codigo, auto, aoMudar, sala: null, fechando: -1, timer: 0, proxT: 0 });
    this.ref = ref(db, `${base}/salas/${codigo}`);
    this.parar = ouvirSala(base, codigo, (s) => { this.sala = s; this.aoMudar(s); });
    this.timer = setInterval(() => this.conferir(), 250);
  }
  online() { return Object.entries(this.sala?.jogadores || {}).filter(([, j]) => j?.on).map(([u]) => u); }
  podeComecar() { return this.sala?.estado === 'espera' && this.online().length >= MIN_JOGADORES; }
  comecar() { if (this.podeComecar()) this.rodada(0); }
  rodada(i) {
    const c = gerarContaAoVivo(this.sala.cfg);
    clearTimeout(this.proxT);
    return update(this.ref, { estado: 'rodada', atual: i, rodada: { i, ...c, inicio: serverTimestamp() } }).catch(() => {});
  }
  proxima() {
    const s = this.sala;
    if (s?.estado !== 'intervalo') return;
    if (s.atual + 1 < (Number(s.cfg?.rodadas) || 10)) this.rodada(s.atual + 1); else this.encerrar();
  }
  encerrar() {
    clearTimeout(this.proxT);
    return update(this.ref, { estado: 'fim', encerrada: serverTimestamp() }).catch(() => {});
  }
  // a cada 250 ms: fecha a rodada no prazo do servidor ou quando todos os que estão na sala responderam
  conferir() {
    const s = this.sala, r = s?.rodada;
    if (s?.estado !== 'rodada' || !r || typeof r.inicio !== 'number' || this.fechando === r.i) return;
    const resp = s.resp?.[r.i] || {};
    const todos = this.online().every(u => resp[u]);
    if (!todos && agoraServ() < r.inicio + TEMPO_RODADA_MS + 400) return;
    this.fechando = r.i;
    const f = fecharRodada(s.jogadores, resp, r);
    const patch = { estado: 'intervalo', 'rodada/fim': { certos: f.certos, total: f.total } };
    for (const [u, v] of Object.entries(f.jogadores)) for (const [k, x] of Object.entries(v)) patch[`jogadores/${u}/${k}`] = x;
    update(this.ref, patch).catch(() => { this.fechando = -1; });
    if (this.auto) this.proxT = setTimeout(() => this.proxima(), INTERVALO_MS + 300);
  }
  desligar() { this.parar?.(); clearInterval(this.timer); clearTimeout(this.proxT); }
}

export { placar };

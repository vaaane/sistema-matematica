// 🤝 Duelo em equipe (PROMPT-236): a equipe (2 ou 3 alunos da mesma equipe, todos online) contra um treinador da Torre
// ou um treinador dos mapas. Quem criou a sala conduz (sorteia a pergunta, calcula o dano); os outros só respondem.
// jogo_revisao_praca{_teste}/equipe_salas/{id} = {
//   tipo: 'torre'|'mapa', criador, host, estado: 'convite'|'luta'|'fim'|'cancelada', criada,
//   equipe: { id, nome, e, c },                        (o nome aprovado; nunca o nome_pedido)
//   alvo: mapa → { treinador, nivel } · torre → { andar, i, nome, chefe, sprite, pet, estilo, aura }
//   membros/{uid} = { nome, vaga, pet, forma, pet_nome, tinta, extra, status: 'convidado'|'aceitou'|'recusou', torre: { andar, treinador }, nivel, descansa }
//   on/{uid} = true                                    (some sozinho quando a internet cai: onDisconnect)
//   luta = { n, hp: { uid, T }, max, fora: { uid: 'desmaiou'|'saiu' }, rod, ataques, alvo, erros, resps, seq: { uid, n },
//            q: { rod, txt, opcoes, resposta, explica, inicio, lim, npc: { ok, v, t } }, ev: { rod, quem, v, ok, t, npc, acoes } }
//   resp/{rod} = { uid, v, t }                         (a 1ª resposta que chega ao banco vale: transação)
//   fim = { resultado: 'venceu'|'perdeu'|'volta', rod }
// }
// equipe_convites/{uid}/{sala} = { de, de_nome, tipo, alvo_nome, ts }
// Sem regra nova: tudo fica dentro do nó da Praça (que já aceita gravação).
import { db } from '/js/firebase-config.js';
import { ref, get, set, update, remove, onValue, runTransaction, onDisconnect, push } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { agoraServ } from '/js/jogo-revisao/aovivo-sala.js';

export const BONUS = { 1: 0, 2: 0.8, 3: 1.5 };            // +80% (dupla), +150% (trio) de vida e de ataque
export const fator = (n) => 1 + (BONUS[Math.max(1, Math.min(3, n))] ?? 0);
export const MAX_RODADAS = 15;
export const SEGUIDAS_MAX = 2;                             // a mesma pessoa responde no máximo 2 vezes seguidas
export const LIBERA_MS = 15000;                            // ninguém mais respondeu em 15 s: os botões dela voltam
export const ATAQUE_TODOS_A_CADA = 3;                      // o 3º ataque do treinador pega todos, com metade do dano
export const MIN_RESPOSTAS_VOLTA = 4;                      // torre: depois de 4 respostas, errou metade → volta ao 1º
export const CONVITE_MS = 20000;
export const VIDA_TORRE = { treinador: 100, chefe: 130, campeao: 160 };   // vida do treinador da torre (antes do bônus)
export const MOEDAS_ANDAR_REPETIDO = 30;

export const bases = (teste) => {
  const p = teste ? 'jogo_revisao_praca_teste' : 'jogo_revisao_praca';
  return { salas: `${p}/equipe_salas`, cv: `${p}/equipe_convites` };
};

// ── regras puras ────────────────────────────────────────────
// os membros que lutam (aceitaram), na ordem das vagas
export function lutadores(sala) {
  return Object.entries(sala?.membros || {}).filter(([, m]) => m?.status === 'aceitou')
    .sort((a, b) => (Number(a[1].vaga) || 9) - (Number(b[1].vaga) || 9)).map(([uid]) => uid);
}
export const vivos = (sala) => lutadores(sala).filter(u => !sala?.luta?.fora?.[u]);
export const contamBonus = (sala) => lutadores(sala).filter(u => sala?.luta?.fora?.[u] !== 'saiu').length;   // desmaiado continua contando

// a regra da vez: pode responder agora?  → { ok, motivo: 'fora'|'vez'|'respondida'|null }
export function podeResponder(sala, uid, agora = agoraServ()) {
  const L = sala?.luta;
  if (!L?.q || sala.estado !== 'luta') return { ok: false, motivo: null };
  if (!lutadores(sala).includes(uid) || L.fora?.[uid]) return { ok: false, motivo: 'fora' };
  if (L.ev?.rod === L.rod) return { ok: false, motivo: 'respondida' };
  const s = L.seq || {};
  if (s.uid === uid && (Number(s.n) || 0) >= SEGUIDAS_MAX && vivos(sala).length > 1 && agora - (Number(L.q.inicio) || 0) < LIBERA_MS) return { ok: false, motivo: 'vez' };
  return { ok: true, motivo: null };
}

// torre: o grupo começa no andar mais baixo; nele, no treinador mais baixo de quem está nesse andar
export function inicioTorre(posicoes) {
  const ps = posicoes.map(p => ({ andar: Math.max(1, Number(p?.andar) || 1), treinador: Math.max(0, Number(p?.treinador) || 0) }));
  if (!ps.length) return { andar: 1, treinador: 0 };
  const andar = Math.min(...ps.map(p => p.andar));
  return { andar, treinador: Math.min(...ps.filter(p => p.andar === andar).map(p => p.treinador)) };
}
// depois de o grupo vencer o treinador i do andar: a posição de um aluno vira a maior entre a dele e a do grupo
// devolve { andar, treinador, venceuAndar (o andar entrou agora nos vencidos dele), bau (andar novo para ele) }
export function progressoTorre(te, andar, i, chefe, nAndares = 10) {
  const out = { andar: te.andar, treinador: te.treinador, venceuAndar: false, bau: false };
  if (andar !== te.andar || i < te.treinador) return out;   // ele já estava à frente: nada muda (andar repetido)
  if (!chefe) { out.treinador = i + 1; return out; }
  out.venceuAndar = true; out.bau = !te.vencidos?.[andar];
  out.treinador = 0;
  if (andar < nAndares) out.andar = andar + 1;
  return out;
}
export const andarNovoPara = (te, andar) => !te.vencidos?.[andar] && te.andar <= andar;
export const deveVoltar = (erros, resps) => resps >= MIN_RESPOSTAS_VOLTA && erros * 2 >= resps;

// porcentagem de vida (desempate na rodada 15): a equipe soma os pets de quem não saiu
export function porcentagens(sala) {
  const L = sala.luta, us = lutadores(sala).filter(u => L.fora?.[u] !== 'saiu');
  const max = us.reduce((s, u) => s + (Number(L.max[u]) || 0), 0), hp = us.reduce((s, u) => s + Math.max(0, Number(L.hp[u]) || 0), 0);
  return { equipe: max ? hp / max : 0, treinador: L.max.T ? Math.max(0, L.hp.T) / L.max.T : 0 };
}

// o treinador ataca: reveza o alvo; a cada 3 ataques, todos os vivos com metade do dano
export function ataqueTreinador(L, vivosAgora, n) {
  L.ataques = (Number(L.ataques) || 0) + 1;
  if (!vivosAgora.length) return null;
  if (L.ataques % ATAQUE_TODOS_A_CADA === 0) return { de: 'T', para: [...vivosAgora], n: Math.max(1, Math.round(n / 2)), todos: true };
  const k = (Number(L.alvo) || 0) % vivosAgora.length;
  L.alvo = k + 1;
  return { de: 'T', para: [vivosAgora[k]], n };
}

// fecha a rodada: aplica a resposta da equipe e a do treinador. Muda L (cópia) e devolve { L, ev, fim }
// resp: { uid, v, t (ms do servidor) } | null · q.npc: { ok, t } | null (torre: sem treinador respondendo)
// danoDe(seg) → { n, critico } (o dano de um acerto em seg segundos) · T: tempo da pergunta em s (torre: sem tempo)
export function fecharRodada(sala, resp, { danoDe, T = 15, depois = 6, torre = false, rodadasMax = MAX_RODADAS }) {
  const L = JSON.parse(JSON.stringify(sala.luta)), q = L.q, f = fator(L.n);
  L.fora ||= {};
  const ok = !!resp && resp.v === q.resposta;
  const tEq = resp ? Math.max(0, Math.min(T, ((Number(resp.t) || 0) - (Number(q.inicio) || 0)) / 1000)) : T;
  const npc = !torre && q.npc ? q.npc : null;
  const npcVale = !!npc && npc.t <= (resp ? Math.min(T, tEq + depois) : T);
  const golpes = [];
  if (ok) golpes.push({ quem: resp.uid, t: tEq });
  if (npcVale && npc.ok) golpes.push({ quem: 'T', t: npc.t });
  else if (!ok) golpes.push({ quem: 'T', t: T / 2, porErro: true });   // a equipe errou ou o tempo acabou: o treinador ataca
  golpes.sort((a, b) => a.t - b.t);
  const acoes = [];
  for (const g of golpes) {
    if (L.hp.T <= 0 || !vivos({ ...sala, luta: L }).length) break;
    if (g.quem !== 'T') {
      if (L.fora[g.quem]) continue;
      const d = danoDe(g.t);
      L.hp.T = Math.max(0, L.hp.T - d.n);
      acoes.push({ de: g.quem, para: ['T'], n: d.n, crit: !!d.critico });
    } else {
      const base = danoDe(g.t).n, a = ataqueTreinador(L, vivos({ ...sala, luta: L }), Math.round(base * f));
      if (!a) continue;
      for (const u of a.para) { L.hp[u] = Math.max(0, (Number(L.hp[u]) || 0) - a.n); if (L.hp[u] <= 0) L.fora[u] = 'desmaiou'; }
      acoes.push(a);
    }
  }
  if (resp) {
    L.resps = (Number(L.resps) || 0) + 1;
    if (!ok) L.erros = (Number(L.erros) || 0) + 1;
    L.seq = L.seq?.uid === resp.uid ? { uid: resp.uid, n: (Number(L.seq.n) || 0) + 1 } : { uid: resp.uid, n: 1 };
  }
  const ev = { rod: L.rod, quem: resp?.uid || null, v: resp?.v ?? null, ok, t: +tEq.toFixed(1), npc: npc ? { ok: npc.ok, vale: npcVale, t: npc.t } : null, acoes };
  L.ev = ev;
  const s2 = { ...sala, luta: L };
  let fim = null;
  if (L.hp.T <= 0) fim = 'venceu';
  else if (!vivos(s2).length) fim = 'perdeu';
  else if (torre && deveVoltar(L.erros || 0, L.resps || 0)) fim = 'volta';
  else if (L.rod >= rodadasMax) { const p = porcentagens(s2); fim = p.equipe >= p.treinador ? 'venceu' : 'perdeu'; }
  return { L, ev, fim };
}

// alguém saiu (ou caiu a internet): o pet sai e o treinador perde a parte do bônus daquele aluno
export function tirarDaLuta(sala, uid) {
  const L = JSON.parse(JSON.stringify(sala.luta));
  if (!lutadores(sala).includes(uid) || L.fora?.[uid] === 'saiu') return null;
  const antes = fator(contamBonus(sala));
  (L.fora ||= {})[uid] = 'saiu';
  const depois = fator(contamBonus({ ...sala, luta: L }));
  if (depois !== antes) {
    L.max.T = Math.round(L.max.T * depois / antes);
    L.hp.T = Math.max(L.hp.T > 0 ? 1 : 0, Math.round(L.hp.T * depois / antes));
    L.n = contamBonus({ ...sala, luta: L });
  }
  return L;
}

// a luta começa: vidas (o pet de cada um com a vida extra da lealdade) e o treinador com o bônus
export function lutaInicial(sala, vidaBase, vidaTreinador) {
  const us = lutadores(sala), n = us.length, hp = {}, max = {};
  for (const u of us) { const v = vidaBase + (Number(sala.membros[u].extra) || 0); hp[u] = v; max[u] = v; }
  hp.T = max.T = Math.round(vidaTreinador * fator(n));
  return { n, hp, max, fora: {}, rod: 0, ataques: 0, alvo: 0, erros: 0, resps: 0, seq: null, q: null, ev: null };
}

// ── a sala no Firebase ──────────────────────────────────────
const rSala = (teste, id) => ref(db, `${bases(teste).salas}/${id}`);

export async function limparSalasVelhas(teste) {
  try {
    const s = await get(ref(db, bases(teste).salas));
    if (!s.exists()) return;
    const agora = agoraServ(), apagar = {};
    for (const [id, x] of Object.entries(s.val() || {})) if (agora - (Number(x?.criada) || 0) > 3 * 3600e3) apagar[id] = null;
    if (Object.keys(apagar).length) await update(ref(db, bases(teste).salas), apagar);
  } catch (_) {}
}

export async function criarSala(teste, sala, convidados) {
  limparSalasVelhas(teste);
  const id = push(ref(db, bases(teste).salas)).key;
  await set(rSala(teste, id), { ...sala, estado: 'convite', criada: agoraServ() });
  const patch = {};
  for (const u of convidados) patch[`${bases(teste).cv}/${u}/${id}`] = { de: sala.criador, de_nome: sala.membros[sala.criador]?.nome || '', tipo: sala.tipo, alvo_nome: sala.alvo_nome || '', ts: agoraServ() };
  if (Object.keys(patch).length) await update(ref(db), patch);
  return id;
}

// estou na sala: marca on/{uid} e apaga sozinho quando a conexão cai
export async function marcarPresenca(teste, id, uid) {
  const r = ref(db, `${bases(teste).salas}/${id}/on/${uid}`);
  await set(r, true);
  try { await onDisconnect(r).remove(); } catch (_) {}
}
export async function sairPresenca(teste, id, uid) {
  const r = ref(db, `${bases(teste).salas}/${id}/on/${uid}`);
  try { await onDisconnect(r).cancel(); } catch (_) {}
  try { await remove(r); } catch (_) {}
}

export async function responderConvite(teste, id, uid, aceitou, dados = {}) {
  await remove(ref(db, `${bases(teste).cv}/${uid}/${id}`)).catch(() => {});
  const t = await runTransaction(ref(db, `${bases(teste).salas}/${id}`), (cur) => {
    if (!cur) return cur;
    const m = cur.membros?.[uid];
    if (!m || cur.estado !== 'convite' || m.status !== 'convidado') return;   // a sala já começou, acabou ou não me chamou
    cur.membros[uid] = { ...m, ...dados, status: aceitou ? 'aceitou' : 'recusou' };
    return cur;
  });
  return t.committed;
}

// a 1ª resposta da rodada (a ordem de chegada no banco decide)
export async function responder(teste, id, rod, uid, v) {
  const t = await runTransaction(ref(db, `${bases(teste).salas}/${id}/resp/${rod}`), (cur) => (cur ? undefined : { uid, v, t: agoraServ() }));
  return t.committed;
}

// alguém precisa conduzir: quem criou; se ele saiu, o de vaga mais baixa que está online
export function quemConduz(sala) {
  const on = sala?.on || {}, fora = sala?.luta?.fora || {};
  if (sala?.host && on[sala.host]) return sala.host;
  return lutadores(sala).find(u => on[u] && fora[u] !== 'saiu') || null;
}
export async function assumir(teste, id, eu, antigo) {
  const t = await runTransaction(ref(db, `${bases(teste).salas}/${id}/host`), (cur) => (cur === antigo || !cur ? eu : undefined));
  return t.committed;
}

export const ouvirSala = (teste, id, fn) => onValue(rSala(teste, id), (s) => fn(s.exists() ? s.val() : null), () => fn(null));
export const ouvirConvites = (teste, uid, fn) => onValue(ref(db, `${bases(teste).cv}/${uid}`), (s) => fn(s.exists() ? s.val() || {} : {}), () => fn({}));
export const apagarConvite = (teste, uid, id) => remove(ref(db, `${bases(teste).cv}/${uid}/${id}`)).catch(() => {});
export const atualizarSala = (teste, id, patch) => update(rSala(teste, id), patch);
export const lerSala = async (teste, id) => { const s = await get(rSala(teste, id)); return s.exists() ? s.val() : null; };

// ── quem conduz: sorteia a pergunta, espera a 1ª resposta (ou o tempo), calcula e passa para a próxima ──
// cb: { gerar(sala) → { txt, opcoes, resposta, explica, npc? }, danoDe, T, depois, torre, aoFim(sala, fim) }
export class Condutor {
  constructor(teste, id, cb) { Object.assign(this, { teste, id, cb, timers: [], parado: false, rodOuvida: null, pararResp: null, fechando: false }); }
  later(fn, ms) { const t = setTimeout(() => { if (!this.parado) fn(); }, ms); this.timers.push(t); return t; }
  limpar() { this.timers.forEach(clearTimeout); this.timers = []; this.pararResp?.(); this.pararResp = null; }
  parar() { this.parado = true; this.limpar(); }
  async sala() { return lerSala(this.teste, this.id); }
  // começa (ou retoma, depois de assumir): rodada aberta → espera a resposta; fechada → a próxima
  async retomar() {
    const s = await this.sala();
    if (!s || s.estado !== 'luta' || this.parado) return;
    const L = s.luta;
    if (!L.q || L.ev?.rod === L.rod) { this.later(() => this.proxima(), L.q ? 2500 : 2200); return; }
    this.armar(s);
  }
  async proxima() {
    this.limpar();
    const s = await this.sala();
    if (!s || s.estado !== 'luta' || this.parado) return;
    const q = this.cb.gerar(s);
    const rod = (Number(s.luta.rod) || 0) + 1, inicio = agoraServ();
    q.rod = rod; q.inicio = inicio;
    if (!this.cb.torre) q.lim = inicio + this.cb.T * 1000;
    await update(rSala(this.teste, this.id), { 'luta/rod': rod, 'luta/q': q, [`resp/${rod - 1}`]: null });
    this.armar({ ...s, luta: { ...s.luta, rod, q } });
  }
  armar(s) {
    this.limpar();
    const L = s.luta, q = L.q, rod = L.rod;
    if (!this.cb.torre) {
      const resta = (Number(q.lim) || 0) - agoraServ();
      this.later(() => this.fechar(rod, null), Math.max(0, resta));
      if (q.npc && !q.npc_ja) {   // o treinador "respondeu": o tempo da equipe encurta para depois_s
        const ate = q.inicio + q.npc.t * 1000 - agoraServ();
        this.later(async () => {
          const lim = Math.min(q.lim, q.inicio + (q.npc.t + this.cb.depois) * 1000);
          try { await update(rSala(this.teste, this.id), { 'luta/q/npc_ja': true, 'luta/q/lim': lim }); } catch (_) {}
          this.limpar(); this.armar({ ...s, luta: { ...L, q: { ...q, npc_ja: true, lim } } });
        }, Math.max(0, ate));
      }
    }
    this.rodOuvida = rod;
    this.pararResp = onValue(ref(db, `${bases(this.teste).salas}/${this.id}/resp/${rod}`), (snap) => {
      if (snap.exists() && this.rodOuvida === rod) this.recebeu(rod, snap.val());
    });
  }
  async recebeu(rod, r) {
    const s = await this.sala();
    if (!s || s.luta?.rod !== rod || s.luta?.ev?.rod === rod) return;
    const pode = podeResponder(s, r?.uid, Number(r?.t) || agoraServ());
    if (!pode.ok) { try { await remove(ref(db, `${bases(this.teste).salas}/${this.id}/resp/${rod}`)); } catch (_) {} return; }   // não valia (regra da vez, pet caído): a pergunta continua
    this.fechar(rod, r);
  }
  async fechar(rod, resp) {
    if (this.fechando) return;
    this.fechando = true;
    try {
      const s = await this.sala();
      if (!s || s.estado !== 'luta' || s.luta?.rod !== rod || s.luta?.ev?.rod === rod || this.parado) return;
      if (!resp) {   // o tempo acabou, mas alguém pode ter respondido no último instante
        const r = s.resp?.[rod];
        if (r && podeResponder(s, r.uid, Number(r.t)).ok) resp = r;
      }
      this.limpar();
      const { L, fim } = fecharRodada(s, resp, this.cb);
      const patch = { luta: L };
      if (fim) { patch.estado = 'fim'; patch.fim = { resultado: fim, rod }; }
      await update(rSala(this.teste, this.id), patch);
      if (fim) { this.cb.aoFim?.({ ...s, luta: L, estado: 'fim', fim: patch.fim }); return; }
      this.later(() => this.proxima(), 1600 + 1100 * Math.max(1, L.ev.acoes.length));   // tempo das animações
    } finally { this.fechando = false; }
  }
  // alguém saiu: tira o pet, ajusta o bônus; sem ninguém vivo, a equipe perde
  async saiu(uid) {
    const s = await this.sala();
    if (!s || s.estado !== 'luta') return;
    const L = tirarDaLuta(s, uid);
    if (!L) return;
    const patch = { luta: L };
    if (!vivos({ ...s, luta: L }).length) { patch.estado = 'fim'; patch.fim = { resultado: 'perdeu', rod: L.rod }; }
    await update(rSala(this.teste, this.id), patch);
    if (patch.fim) { this.parar(); this.cb.aoFim?.({ ...s, luta: L, estado: 'fim', fim: patch.fim }); }
  }
}

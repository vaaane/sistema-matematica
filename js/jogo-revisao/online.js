// Jogo de Revisão — quem está jogando agora (nó próprio, separado de js/presenca.js).
// jogo_revisao_online/{uid} (modo teste: jogo_revisao_online_teste/{uid}):
//   { apelido, turma, personagem, pet, pet_nome, pet_nivel, pet_tinta, pet_efeito, pet_forma (filhote ou adulto, já com a cor), pet_cor (cor especial do dragão),
//     mapa: n | 'geral', local: 'mapa'|'ginasio'|'geral', x, y, dir, reacao: { e, t }, ts,
//     onde (PROMPT-76: 'laboratorio'|'programe'|'ilha'|'pesca'|'duelo'|'damas'|'batalha' ou null), sem_convites }
// O registro completo fica guardado aqui: quando a conexão cai (celular com a tela apagada, sinal ruim), o
// onDisconnect apaga o nó; ao reconectar, ele é gravado inteiro de novo (senão os updates de posição recriavam o
// nó só com x/y/dir e o colega aparecia sem nome e sem pet).
// Tudo aqui falha em silêncio: sem permissão ou sem internet, o jogo continua normal (só sem colegas).
import { db } from '/js/firebase-config.js';
import { ref, get, set, update, remove, onValue, onDisconnect, query, orderByChild, equalTo } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

export const VALIDADE_MS = 30000;   // registro mais velho que isso é ignorado
const VIDA_MS = 10000;              // ts é renovado pelo menos a cada 10 s

let base = 'jogo_revisao_online';
let meuUid = null;
let ativo = false;
let ultimoEnvio = 0;
let timerVida = 0;
let atual = {};          // o registro inteiro (identidade + último estado), regravado ao reconectar
let pararConexao = null;

export async function iniciarOnline({ uid, teste, dados }) {
  base = teste ? 'jogo_revisao_online_teste' : 'jogo_revisao_online';
  meuUid = uid;
  try {
    const r = ref(db, `${base}/${uid}`);
    atual = { ...dados };
    await set(r, { ...atual, ts: Date.now() });
    ultimoCompleto = Date.now();
    await onDisconnect(r).remove();
    ativo = true;
    // reconectou: grava o registro inteiro de novo e arma o onDisconnect outra vez
    pararConexao?.();
    let primeira = true;
    pararConexao = onValue(ref(db, '.info/connected'), (snap) => {
      if (snap.val() !== true || !ativo) return;
      if (primeira) { primeira = false; return; }   // a 1ª conexão já gravou acima
      ultimoEnvio = Date.now();
      set(r, { ...atual, ts: ultimoEnvio }).then(() => onDisconnect(r).remove()).catch(() => {});
    });
    ultimoEnvio = Date.now();
    clearInterval(timerVida);
    timerVida = setInterval(() => { if (Date.now() - ultimoEnvio >= VIDA_MS) enviarOnline({}); }, 2000);
    addEventListener('pagehide', () => { sairOnline(); });
  } catch (e) {
    ativo = false;
    console.warn('[jogo-revisao] online indisponível', e?.code || e);
  }
}

// A cada COMPLETO_MS o update leva o registro inteiro: se um onDisconnect atrasado (da conexão antiga, depois de
// reconectar) apagou o nó, os updates de posição o recriavam só com x/y/dir e o aluno aparecia como "Colega".
const COMPLETO_MS = 5000;
let ultimoCompleto = 0;
export function enviarOnline(patch) {
  if (!ativo) return;
  atual = { ...atual, ...patch };
  ultimoEnvio = Date.now();
  const completo = ultimoEnvio - ultimoCompleto >= COMPLETO_MS;
  if (completo) ultimoCompleto = ultimoEnvio;
  update(ref(db, `${base}/${meuUid}`), { ...(completo ? atual : patch), ts: ultimoEnvio }).catch(() => {});
}

export async function sairOnline() {
  if (!ativo) return;
  ativo = false;
  clearInterval(timerVida);
  pararConexao?.(); pararConexao = null;
  try { await remove(ref(db, `${base}/${meuUid}`)); } catch (_) {}
}

// cb({ uid: registro }) com os outros (sem você); devolve a função para parar de ouvir
function ouvir(q, cb) {
  if (!ativo) return () => {};
  return onValue(q, (snap) => {
    const v = snap.exists() ? snap.val() || {} : {};
    delete v[meuUid];
    cb(v);
  }, () => cb({}));
}
export const ouvirMapa = (n, cb) => ouvir(query(ref(db, base), orderByChild('mapa'), equalTo(n)), cb);
export const ouvirTodos = (cb) => ouvir(ref(db, base), cb);
export const onlineAtivo = () => ativo;
// leitura única (a lista "👥 Online" fora do mapa geral: lida a cada 20 s, sem ouvir as posições de todo mundo ao vivo)
export async function lerTodos() {
  if (!ativo) return {};
  const s = await get(ref(db, base));
  const v = s.exists() ? s.val() || {} : {};
  delete v[meuUid];
  return v;
}
export async function lerRegistro(uid) {
  if (!ativo) return null;
  const s = await get(ref(db, `${base}/${uid}`));
  return s.exists() ? s.val() : null;
}

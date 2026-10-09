// Jogo de Revisão — quem está jogando agora (nó próprio, separado de js/presenca.js).
// jogo_revisao_online/{uid} (modo teste: jogo_revisao_online_teste/{uid}):
//   { apelido, turma, pet, mapa: n | 'geral', local: 'mapa'|'ginasio'|'geral', x, y, dir, reacao: { e, t }, ts }
// Tudo aqui falha em silêncio: sem permissão ou sem internet, o jogo continua normal (só sem colegas).
import { db } from '/js/firebase-config.js';
import { ref, set, update, remove, onValue, onDisconnect, query, orderByChild, equalTo } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

export const VALIDADE_MS = 30000;   // registro mais velho que isso é ignorado
const VIDA_MS = 10000;              // ts é renovado pelo menos a cada 10 s

let base = 'jogo_revisao_online';
let meuUid = null;
let ativo = false;
let ultimoEnvio = 0;
let timerVida = 0;

export async function iniciarOnline({ uid, teste, dados }) {
  base = teste ? 'jogo_revisao_online_teste' : 'jogo_revisao_online';
  meuUid = uid;
  try {
    const r = ref(db, `${base}/${uid}`);
    await set(r, { ...dados, ts: Date.now() });
    await onDisconnect(r).remove();
    ativo = true;
    ultimoEnvio = Date.now();
    clearInterval(timerVida);
    timerVida = setInterval(() => { if (Date.now() - ultimoEnvio >= VIDA_MS) enviarOnline({}); }, 2000);
    addEventListener('pagehide', () => { sairOnline(); });
  } catch (e) {
    ativo = false;
    console.warn('[jogo-revisao] online indisponível', e?.code || e);
  }
}

export function enviarOnline(patch) {
  if (!ativo) return;
  ultimoEnvio = Date.now();
  update(ref(db, `${base}/${meuUid}`), { ...patch, ts: ultimoEnvio }).catch(() => {});
}

export async function sairOnline() {
  if (!ativo) return;
  ativo = false;
  clearInterval(timerVida);
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

import { db } from '/js/firebase-config.js';
import { ref, set, onDisconnect } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

let _uid = null;
let _heartbeatInterval = null;

export async function iniciarPresenca(uid, dados) {
  _uid = uid;
  const presRef = ref(db, `presenca_online/${uid}`);

  const payload = {
    nome:     dados.nome     || '',
    apelido:  dados.apelido  || dados.nome || '',
    turma:    dados.turma    || '',
    status:   dados.status   || 'disponivel',
    pagina:   dados.pagina   || 'menu',
    em_duelo: false,
    ts:       Date.now(),
  };

  await onDisconnect(presRef).remove();
  await set(presRef, payload);

  _heartbeatInterval = setInterval(async () => {
    try { await set(ref(db, `presenca_online/${uid}/ts`), Date.now()); } catch(_) {}
  }, 10_000);
}

export async function encerrarPresenca() {
  if (!_uid) return;
  clearInterval(_heartbeatInterval);
  try {
    const { remove } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
    await remove(ref(db, `presenca_online/${_uid}`));
  } catch(_) {}
  _uid = null;
}

export async function atualizarPresenca(campos) {
  if (!_uid) return;
  try {
    const { update } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
    await update(ref(db, `presenca_online/${_uid}`), { ...campos, ts: Date.now() });
  } catch(_) {}
}

export function filtrarOnline(snap, meuUid) {
  const agora = Date.now();
  const lista = [];
  snap.forEach(child => {
    if (child.key === meuUid) return;
    const v = child.val();
    if (!v?.ts) return;
    if (agora - v.ts > 25_000) return;
    lista.push({ uid: child.key, ...v });
  });
  return lista;
}

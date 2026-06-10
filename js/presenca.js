import { db } from '/js/firebase-config.js';
import { ref, set, onDisconnect } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

let _uid = null;
let _heartbeatInterval = null;

export async function iniciarPresenca(uid, dados) {
  _uid = uid;
  const presRef = ref(db, `presenca_online/${uid}`);

  // Reidratar parceiro de dupla a partir do localStorage (a dupla persiste entre navegações).
  // Apenas o DONO da dupla restaura o vínculo na própria presença, para o card "online" não
  // perder a dupla ao recriar a presença (ex.: voltar de uma partida ou trocar de página).
  let _parceiroNome = null, _parceiroTurma = null;
  try {
    const _d = JSON.parse(localStorage.getItem('sm_dupla_duelo') || 'null');
    if (_d && _d.nome && _d.dono_nome === (dados.nome || '') && _d.dono_turma === (dados.turma || '')) {
      _parceiroNome  = _d.nome;
      _parceiroTurma = _d.turma || '';
    }
  } catch(_) {}

  const payload = {
    nome:     dados.nome     || '',
    apelido:  dados.apelido  || dados.nome || '',
    turma:    dados.turma    || '',
    status:   dados.status   || 'disponivel',
    pagina:   dados.pagina   || 'menu',
    em_duelo: false,
    ts:       Date.now(),
    ...(_parceiroNome ? { parceiro_nome: _parceiroNome, parceiro_turma: _parceiroTurma } : {}),
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
    if (v.status === 'indisponivel') return;
    lista.push({ uid: child.key, ...v });
  });
  return lista;
}

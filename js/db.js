import { db } from "./firebase-config.js";
import {
  ref, push, set, update, get, remove, onValue,
  query, orderByChild, limitToLast, equalTo, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ── Resultados ──────────────────────────────────────────────
export async function addResultado(data) {
  const newRef = await push(ref(db, "resultados"), { ...data, criadoEm: serverTimestamp() });
  return newRef.key;
}

export async function updateResultado(id, data) {
  await update(ref(db, `resultados/${id}`), data);
}

export async function getResultados() {
  const snap = await get(ref(db, "resultados"));
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => { result.push({ id: child.key, ...child.val() }); });
  return result.sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0));
}

export async function getResultadosByTurma(turma) {
  const snap = await get(query(ref(db, "resultados"), orderByChild("turma"), equalTo(turma)));
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => { result.push({ id: child.key, ...child.val() }); });
  return result;
}

export async function getResultadosByAluno(aluno) {
  const snap = await get(query(ref(db, "resultados"), orderByChild("aluno"), equalTo(aluno)));
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => { result.push({ id: child.key, ...child.val() }); });
  return result;
}

// ── Detalhes de questões ────────────────────────────────────
export async function saveDetalhes(resultadoId, questoes) {
  await set(ref(db, `detalhes/${resultadoId}`), { questoes });
}

export async function getDetalhes(resultadoId) {
  const snap = await get(ref(db, `detalhes/${resultadoId}`));
  return snap.exists() ? snap.val().questoes : [];
}

// ── Conquistas ──────────────────────────────────────────────
export async function addConquista(data) {
  await push(ref(db, "conquistas"), { ...data, criadoEm: serverTimestamp() });
}

export async function hasConquista(aluno, tipo, atividade) {
  const snap = await get(query(ref(db, "conquistas"), orderByChild("aluno"), equalTo(aluno)));
  if (!snap.exists()) return false;
  let found = false;
  snap.forEach(child => {
    const v = child.val();
    if (v.tipo === tipo && v.atividade === atividade) found = true;
  });
  return found;
}

export async function getConquistas() {
  const snap = await get(query(ref(db, "conquistas"), orderByChild("criadoEm")));
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => { result.push({ id: child.key, ...child.val() }); });
  return result.reverse();
}

// ── Alertas ─────────────────────────────────────────────────
export async function addAlerta(data) {
  await push(ref(db, "alertas"), { ...data, visto: false, criadoEm: serverTimestamp() });
}

export async function getAlertas(apenasNaoVistos = false) {
  let snap;
  if (apenasNaoVistos) {
    snap = await get(query(ref(db, "alertas"), orderByChild("visto"), equalTo(false)));
  } else {
    snap = await get(ref(db, "alertas"));
  }
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => { result.push({ id: child.key, ...child.val() }); });
  return result;
}

export async function marcarAlertaVisto(id) {
  await update(ref(db, `alertas/${id}`), { visto: true });
}

// ── Tentativas por aluno/atividade ──────────────────────────
// Conta apenas jogos concluídos — cada jogo finalizado gera um registro com concluido:true.
export async function contarTentativas(aluno, atividade) {
  const snap = await get(query(ref(db, "resultados"), orderByChild("aluno"), equalTo(aluno)));
  if (!snap.exists()) return 0;
  let count = 0;
  snap.forEach(child => {
    const v = child.val();
    if (v.atividade === atividade) count++;
  });
  return count;
}

export async function verificarTentativasSuspeitas(aluno, atividade) {
  const dez = Date.now() - 10 * 60 * 1000;
  const snap = await get(query(ref(db, "resultados"), orderByChild("aluno"), equalTo(aluno)));
  if (!snap.exists()) return false;
  let count = 0;
  snap.forEach(child => {
    const v = child.val();
    if (v.atividade === atividade && v.concluido && v.criadoEm && v.criadoEm >= dez) count++;
  });
  return count >= 3;
}

// ── Liberações ativas ───────────────────────────────────────
export async function getLiberadas() {
  const snap = await get(ref(db, "liberacoes_ativas"));
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => { result.push({ id: child.key, ...child.val() }); });
  return result;
}

export async function addLiberada(data) {
  const newRef = await push(ref(db, "liberacoes_ativas"), data);
  return newRef.key;
}

export async function deleteLiberada(id) {
  await remove(ref(db, `liberacoes_ativas/${id}`));
}

export async function getLiberadasParaTurma(turma) {
  const snap = await get(ref(db, "liberacoes_ativas"));
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => {
    if (child.val().turma === turma) result.push({ id: child.key, ...child.val() });
  });
  return result;
}

// ── Histórico de liberações ─────────────────────────────────
export async function addLiberacaoHistorico(data) {
  const newRef = await push(ref(db, "liberacoes_historico"), { ...data, criadoEm: serverTimestamp() });
  return newRef.key;
}

export async function getLiberacoesHistorico() {
  const snap = await get(query(ref(db, "liberacoes_historico"), orderByChild("criadoEm"), limitToLast(30)));
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => { result.push({ id: child.key, ...child.val() }); });
  return result.reverse();
}

export async function updateLiberacaoHistorico(id, data) {
  await update(ref(db, `liberacoes_historico/${id}`), data);
}

// ── Ranking ao vivo (competition) ───────────────────────────
export function listenRankingAtividade(atividade, callback) {
  const q = query(ref(db, "resultados"), orderByChild("atividade"), equalTo(atividade));
  return onValue(q, snap => {
    const all = [];
    snap.forEach(child => {
      const v = child.val();
      if (v.pontuacao > 0) all.push({ id: child.key, ...v });
    });
    const best = {};
    for (const r of all) {
      const k = r.aluno;
      if (!best[k] || (r.pontuacao || 0) > (best[k].pontuacao || 0)) best[k] = r;
    }
    callback(Object.values(best).sort((a, b) => (b.pontuacao || 0) - (a.pontuacao || 0)).slice(0, 15));
  });
}

// ── Configuração ────────────────────────────────────────────
export async function getConfig() {
  const snap = await get(ref(db, "config/professor"));
  return snap.exists() ? snap.val() : { senha: "123" };
}

export async function setConfig(data) {
  await set(ref(db, "config/professor"), data);
}

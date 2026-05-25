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

export async function salvarConquistas(list) {
  await Promise.all(list.map(item =>
    push(ref(db, "conquistas"), { ...item, criadoEm: serverTimestamp() })
  ));
}

export async function getConquistasByAluno(aluno) {
  const snap = await get(query(ref(db, "conquistas"), orderByChild("aluno"), equalTo(aluno)));
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => { result.push({ id: child.key, ...child.val() }); });
  return result.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
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
  const [snapLib, snapStatus] = await Promise.all([
    get(ref(db, "liberacoes_ativas")),
    get(ref(db, "config/atividade_status")),
  ]);
  if (!snapLib.exists()) return [];
  const statusMap = {};
  if (snapStatus.exists()) {
    snapStatus.forEach(child => {
      const v = child.val();
      if (v.turma && v.atividade) statusMap[`${v.turma}|${v.atividade}`] = v;
    });
  }
  const result = [];
  snapLib.forEach(child => {
    const v = child.val();
    if (v.turma === turma) {
      const st = statusMap[`${turma}|${v.atividade}`];
      const percentual = st?.percentual ?? v.percentual ?? 100;
      const status = st?.status ?? 'ativa';
      result.push({ id: child.key, ...v, percentual, status });
    }
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

export async function addStatusAlteracao(histId, data) {
  await push(ref(db, `liberacoes_historico/${histId}/status_alteracoes`), data);
}

// ── Ranking ao vivo (competition) ───────────────────────────
export function listenRankingAtividade(atividade, callback) {
  const q = query(ref(db, "resultados"), orderByChild("atividade"), equalTo(atividade));
  return onValue(q, snap => {
    const all = [];
    snap.forEach(child => {
      const v = child.val();
      const pts = v.pontuacao_bruta || v.pontuacao || 0;
      if (pts > 0) all.push({ id: child.key, ...v });
    });
    const best = {};
    for (const r of all) {
      const k = r.aluno;
      const rPts = r.pontuacao_bruta || r.pontuacao || 0;
      const bPts = best[k] ? (best[k].pontuacao_bruta || best[k].pontuacao || 0) : 0;
      if (rPts > bPts) best[k] = r;
    }
    callback(Object.values(best).sort((a, b) => {
      const ap = a.pontuacao_bruta || a.pontuacao || 0;
      const bp = b.pontuacao_bruta || b.pontuacao || 0;
      if (bp !== ap) return bp - ap;
      return (a.criadoEm || 0) - (b.criadoEm || 0);
    }).slice(0, 15));
  });
}

// ── Melhor resultado por aluno/atividade ────────────────────
export async function getBestResultado(aluno, turma, atividade) {
  const snap = await get(query(ref(db, "resultados"), orderByChild("aluno"), equalTo(aluno)));
  if (!snap.exists()) return null;
  let best = null;
  snap.forEach(child => {
    const v = child.val();
    if (v.atividade === atividade && v.turma === turma && v.concluido && (v.pontuacao || 0) > 0) {
      if (!best || (v.pontuacao || 0) > (best.pontuacao || 0)) best = { id: child.key, ...v };
    }
  });
  return best;
}

// ── Preferências de aluno ────────────────────────────────────
function alunoPrefsKey(turma, nome) {
  return btoa(unescape(encodeURIComponent(turma + '|' + nome)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
export async function saveAlunoPreferencia(turma, nome, chave, valor) {
  await set(ref(db, `aluno_prefs/${alunoPrefsKey(turma, nome)}/${chave}`), valor);
}
export async function getAlunoPreferencia(turma, nome, chave) {
  const snap = await get(ref(db, `aluno_prefs/${alunoPrefsKey(turma, nome)}/${chave}`));
  return snap.exists() ? snap.val() : null;
}

// ── Robótica ─────────────────────────────────────────────────
export async function saveRoboticaTentativa(turma, aluno, atividade, dados) {
  // Usa push() só para gerar a chave, depois set() que aguarda ACK real do servidor
  // (push(ref, data) resolve localmente e pode mascarar PERMISSION_DENIED)
  const newRef = push(ref(db, 'robotica_tentativas'));
  await set(newRef, { turma, aluno, atividade, ...dados, completadoEm: serverTimestamp() });
}

export async function getRoboticaTentativasAluno(turma, aluno) {
  const snap = await get(query(ref(db, 'robotica_tentativas'), orderByChild('aluno'), equalTo(aluno)));
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => result.push({ id: child.key, ...child.val() }));
  return result.filter(r => r.turma === turma).sort((a, b) => (a.completadoEm || 0) - (b.completadoEm || 0));
}

export function listenRoboticaTentativas(callback) {
  return onValue(ref(db, 'robotica_tentativas'), snap => {
    const result = [];
    if (snap.exists()) snap.forEach(child => result.push({ id: child.key, ...child.val() }));
    callback(result);
  });
}

// ── Limpeza ─────────────────────────────────────────────────
export async function deletarRegistro(colecao, id) {
  await remove(ref(db, `${colecao}/${id}`));
}

export async function getLiberacoesHistoricoTodas() {
  const snap = await get(ref(db, "liberacoes_historico"));
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => { result.push({ id: child.key, ...child.val() }); });
  return result;
}

// ── Ranking professor (dados completos para projeção) ──────────
// Para otimizar, adicione no Firebase Console > Realtime Database > Rules:
//   "resultados": { ".indexOn": ["atividade"] }
// Para Competição+, índice composto recomendado:
//   "resultados": { ".indexOn": ["atividade", "turma"] }
export function listenRankingProfessor(atividade, callback) {
  const q = query(ref(db, "resultados"), orderByChild("atividade"), equalTo(atividade));
  return onValue(q, snap => {
    const all = [];
    snap.forEach(child => { all.push({ id: child.key, ...child.val() }); });
    const players = {};
    for (const r of all) {
      const k = r.aluno;
      if (!players[k]) {
        players[k] = { aluno: r.aluno, turma: r.turma, tentativas: 0, ativo: false,
          melhorPts: 0, comboMax: 0, acertosDificeis: 0, acertosRapidos: 0, primeiroTs: Infinity };
      }
      players[k].tentativas++;
      if (!r.concluido) players[k].ativo = true;
      if ((r.pontuacao || 0) > players[k].melhorPts) {
        players[k].melhorPts = r.pontuacao || 0;
        players[k].acertosRapidos = r.acertos_rapidos || 0;
      }
      if ((r.combo_max || 0) > players[k].comboMax) players[k].comboMax = r.combo_max || 0;
      if ((r.acertos_dificeis || 0) > players[k].acertosDificeis) players[k].acertosDificeis = r.acertos_dificeis || 0;
      const ts = r.criadoEm || 0;
      if (ts && ts < players[k].primeiroTs) players[k].primeiroTs = ts;
    }
    const sorted = Object.values(players).map(p => ({ ...p, primeiroTs: p.primeiroTs === Infinity ? 0 : p.primeiroTs }));
    sorted.sort((a, b) => b.melhorPts - a.melhorPts);
    callback(sorted);
  });
}

// ── Status de atividade (por turma) ─────────────────────────
function atividadeStatusKey(turma, atividade) {
  return `${turma}___${atividade.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

export async function getAtividadeStatus(turma, atividade) {
  const snap = await get(ref(db, `config/atividade_status/${atividadeStatusKey(turma, atividade)}`));
  return snap.exists() ? snap.val() : { status: 'ativa', percentual: 100 };
}

export async function setAtividadeStatus(turma, atividade, status, percentualOverride) {
  const percentual = percentualOverride ?? { ativa: 100, '75': 75, '50': 50, encerrada: 0 }[status] ?? 100;
  await set(ref(db, `config/atividade_status/${atividadeStatusKey(turma, atividade)}`),
    { turma, atividade, status, percentual, updatedAt: serverTimestamp() });
}

export async function updateLiberada(id, data) {
  await update(ref(db, `liberacoes_ativas/${id}`), data);
}

export async function updateLiberadasPercentual(turma, atividade, percentual) {
  const snap = await get(ref(db, "liberacoes_ativas"));
  if (!snap.exists()) return;
  const tasks = [];
  snap.forEach(child => {
    const v = child.val();
    if (v.turma === turma && v.atividade === atividade)
      tasks.push(update(ref(db, `liberacoes_ativas/${child.key}`), { percentual }));
  });
  await Promise.all(tasks);
}

export async function marcarPrecisaRevisao(atividade, enunciado) {
  const k = btoa(unescape(encodeURIComponent(atividade + '|' + enunciado)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_').slice(0, 80);
  await set(ref(db, `questoes_revisao/${k}`), { atividade, enunciado, marcadoEm: serverTimestamp() });
}

export async function getAllAtividadeStatus() {
  const snap = await get(ref(db, 'config/atividade_status'));
  if (!snap.exists()) return {};
  const result = {};
  snap.forEach(child => {
    const v = child.val();
    if (v.turma && v.atividade) result[`${v.turma}|${v.atividade}`] = v;
  });
  return result;
}

// ── Configuração ────────────────────────────────────────────
export async function getConfig() {
  const snap = await get(ref(db, "config/professor"));
  return snap.exists() ? snap.val() : { senha: "123" };
}

export async function setConfig(data) {
  await set(ref(db, "config/professor"), data);
}

// ── Senhas de alunos ─────────────────────────────────────────
function senhaKey(turma, nome) {
  return btoa(unescape(encodeURIComponent(turma + '|' + nome)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export async function getSenhaAluno(turma, nome) {
  const snap = await get(ref(db, `aluno_senhas/${senhaKey(turma, nome)}`));
  return snap.exists() ? snap.val() : null;
}

export async function setSenhaAluno(turma, nome, hash, enc) {
  await set(ref(db, `aluno_senhas/${senhaKey(turma, nome)}`), { turma, nome, hash, enc });
}

export async function getAllSenhasAlunos() {
  const snap = await get(ref(db, 'aluno_senhas'));
  if (!snap.exists()) return {};
  const result = {};
  snap.forEach(child => {
    const v = child.val();
    result[v.turma + '|' + v.nome] = v;
  });
  return result;
}

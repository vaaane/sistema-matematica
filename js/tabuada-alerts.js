// Funções compartilhadas de detecção de dificuldades na Tabuada.
// Usadas em professor/tabuada_relatorio.html e professor/dashboard.html.

export function escH(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

export function agruparPorTurma(alunos) {
  const m = {};
  alunos.forEach(a => { (m[a.turma] = m[a.turma] || []).push(a.nome); });
  return Object.entries(m).map(([t, ns]) => `${escH(t)}: ${ns.map(escH).join(', ')}`).join(' · ');
}

export function detectarDificuldadeIndividual(historico) {
  const entries = Object.entries(historico)
    .map(([ts, v]) => ({ ts: Number(ts), ...v }))
    .filter(e => e.nivel && e.resultado)
    .sort((a, b) => a.ts - b.ts);
  if (!entries.length) return null;
  const last = entries[entries.length - 1];
  if (last.resultado !== 'tempo_esgotado') return null;
  const nivelTravado = last.nivel;
  let count = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.nivel === nivelTravado && e.resultado === 'tempo_esgotado') count++;
    else break;
  }
  return count >= 3 ? { nivel: nivelTravado, falhas: count } : null;
}

export function detectarDificuldadeColetiva(niveisSnap, rankMap) {
  const corte = Date.now() - 48 * 60 * 60 * 1000;
  const porNivel = {};
  if (!niveisSnap?.exists()) return { esgotados: [], quasePerda: [] };
  niveisSnap.forEach(child => {
    const nd = child.val();
    if (!nd?.historico) return;
    const info = rankMap[child.key] || { nome: child.key, turma: '?' };
    Object.entries(nd.historico).forEach(([ts, v]) => {
      if (!v?.nivel || !v?.resultado || Number(ts) < corte) return;
      const n = v.nivel;
      if (!porNivel[n]) porNivel[n] = { esgUids: new Set(), esgAlunos: [], qpUids: new Set(), qpAlunos: [] };
      const b = porNivel[n];
      if (v.resultado === 'tempo_esgotado') {
        if (!b.esgUids.has(child.key)) { b.esgUids.add(child.key); b.esgAlunos.push(info); }
      } else if (v.resultado === 'completou' && v.segundos_restantes != null && v.segundos_restantes < 10) {
        if (!b.qpUids.has(child.key)) { b.qpUids.add(child.key); b.qpAlunos.push(info); }
      }
    });
  });
  const esgotados = [], quasePerda = [];
  Object.entries(porNivel).forEach(([nivel, b]) => {
    if (b.esgUids.size >= 3) esgotados.push({ nivel: Number(nivel), count: b.esgUids.size, alunos: b.esgAlunos });
    if (b.qpUids.size  >= 3) quasePerda.push({ nivel: Number(nivel), count: b.qpUids.size,  alunos: b.qpAlunos });
  });
  esgotados.sort((a, b) => b.count - a.count);
  quasePerda.sort((a, b) => b.count - a.count);
  return { esgotados, quasePerda };
}

// Compila tudo de uma vez: recebe os dois snaps e devolve { individuais, coletivos, rankMap }
export function compilarAlertasTabuada(niveisSnap, rankSnap) {
  const rankMap = {};
  if (rankSnap?.exists()) {
    rankSnap.forEach(child => {
      const v = child.val();
      if (v?.nome) rankMap[child.key] = { nome: v.nome, turma: v.turma || '?' };
    });
  }
  const individuais = [];
  if (niveisSnap?.exists()) {
    niveisSnap.forEach(child => {
      const nd = child.val();
      if (!nd?.historico) return;
      const result = detectarDificuldadeIndividual(nd.historico);
      if (!result) return;
      individuais.push({ ...(rankMap[child.key] || { nome: child.key, turma: '?' }), ...result });
    });
    individuais.sort((a, b) => b.falhas - a.falhas);
  }
  const coletivos = detectarDificuldadeColetiva(niveisSnap, rankMap);
  return { individuais, coletivos, rankMap };
}

#!/usr/bin/env node
/**
 * reset-nivel-perfil.mjs  (versão simples — sem service account)
 * ───────────────────────────────────────────────────────────────
 * Faz DUAS limpezas de virada de bimestre, UMA ÚNICA VEZ:
 *   1) Zera XP e nível de perfil de todos os alunos (nível recomeça no 3º bim).
 *   2) Limpa o feed "Novidades" de eventos antigos (sem `bim` ou de bimestres < atual),
 *      que estavam vazando conquistas do 2º bimestre para o feed atual.
 *
 * Do 3º bimestre em diante o nível volta a acumular e o feed já nasce carimbado
 * com `bim` (ver PROMPT_feed_bimestre.md) — NÃO rode isto de novo nas próximas viradas.
 *
 * ZERA (perfis):  xp -> 0, nivel -> 1, streak_atual/maximo -> 0, streak_ultimo_dia -> null,
 *                 treino_media_acertos -> 0
 * PRESERVA:       avatar, apelido_*, duelos_disponivel, conquistas, diplomas,
 *                 rankings de tabuada, histórico de treinos (aquecimento/) — não tocados.
 * FEED:           remove eventos cujo `bim` != bimestre atual (e os sem `bim`).
 *
 * COMO RODAR (Claude Code ou terminal), na raiz do projeto:
 *   npm install firebase
 *   node reset-nivel-perfil.mjs           # DRY-RUN: mostra o que faria (não altera)
 *   node reset-nivel-perfil.mjs --apply    # aplica de verdade (faz backup antes)
 *
 * Flags:
 *   --manter-feed    NÃO limpa o feed (só faz o reset dos perfis)
 */

import { writeFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, update, remove } from "firebase/database";

const firebaseConfig = {
  apiKey:            "AIzaSyBlAM-OILysMt1RnPQkzWjEWUAhmHTHW2E",
  authDomain:        "sistemamatematica-50eff.firebaseapp.com",
  projectId:         "sistemamatematica-50eff",
  storageBucket:     "sistemamatematica-50eff.firebasestorage.app",
  messagingSenderId: "29610901805",
  appId:             "1:29610901805:web:f01f7516fa2d19942753a4",
  databaseURL:       "https://sistemamatematica-50eff-default-rtdb.firebaseio.com",
};

// ── qual é o bimestre atual (mesma regra do constants.js) ──
const BIMESTRES = [
  { n: 1, inicio: "2026-02-12", fim: "2026-04-29" },
  { n: 2, inicio: "2026-04-30", fim: "2026-07-10" },
  { n: 3, inicio: "2026-07-27", fim: "2026-10-05" },
  { n: 4, inicio: "2026-10-06", fim: "2026-12-21" },
];
function bimestreAtual(hoje = new Date().toISOString().slice(0, 10)) {
  const dentro = BIMESTRES.find(b => hoje >= b.inicio && hoje <= b.fim);
  if (dentro) return dentro.n;
  const prox = BIMESTRES.find(b => hoje < b.inicio);
  return prox ? prox.n : BIMESTRES[BIMESTRES.length - 1].n;
}
const BIM_ATUAL = bimestreAtual();

const APPLY        = process.argv.includes("--apply");
const MANTER_FEED  = process.argv.includes("--manter-feed");

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

console.log(`Bimestre atual detectado: ${BIM_ATUAL}º\n`);

// ═══════════════ 1) PERFIS ═══════════════
const snap = await get(ref(db, "perfis"));
if (!snap.exists()) {
  console.log("Nenhum perfil em /perfis.");
} else {
  const perfis = snap.val();
  const uids = Object.keys(perfis);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = `backup-perfis-${stamp}.json`;
  writeFileSync(backupFile, JSON.stringify(perfis, null, 2));
  console.log(`Backup de perfis salvo: ${backupFile}  (${uids.length} perfis)\n`);

  const updates = {};
  let comProgresso = 0;
  for (const uid of uids) {
    const p = perfis[uid] || {};
    const xpAntes = p.xp || 0;
    const nvAntes = p.nivel || 1;
    if (xpAntes > 0 || nvAntes > 1) comProgresso++;
    updates[`perfis/${uid}/xp`] = 0;
    updates[`perfis/${uid}/nivel`] = 1;
    updates[`perfis/${uid}/streak_atual`] = 0;
    updates[`perfis/${uid}/streak_maximo`] = 0;
    updates[`perfis/${uid}/streak_ultimo_dia`] = null;
    updates[`perfis/${uid}/treino_media_acertos`] = 0;
    if (comProgresso <= 8 && (xpAntes > 0 || nvAntes > 1)) {
      const nome = p.nome || p.apelido_ativo || uid;
      console.log(`  ${String(nome).padEnd(24)} xp ${String(xpAntes).padStart(5)} -> 0   nivel ${nvAntes} -> 1`);
    }
  }
  if (comProgresso > 8) console.log(`  ... e mais ${comProgresso - 8} perfis com progresso.`);
  console.log(`\n  Perfis: ${uids.length} total | ${comProgresso} com progresso | zerando xp, nivel, streak e media de treino`);

  if (APPLY) {
    await update(ref(db), updates);
    console.log("  -> perfis resetados.\n");
  } else {
    console.log("  (dry-run: não alterado)\n");
  }
}

// ═══════════════ 2) FEED ═══════════════
if (MANTER_FEED) {
  console.log("Feed: mantido (--manter-feed).");
} else {
  const fsnap = await get(ref(db, "feed_global"));
  if (!fsnap.exists()) {
    console.log("Feed vazio, nada a limpar.");
  } else {
    const feed = fsnap.val();
    const keys = Object.keys(feed);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFeed = `backup-feed-${stamp}.json`;
    writeFileSync(backupFeed, JSON.stringify(feed, null, 2));

    // remover eventos cujo bim != atual (inclui os sem bim = antigos)
    const remover = keys.filter(k => (feed[k]?.bim ?? null) !== BIM_ATUAL);
    console.log(`\nFeed: ${keys.length} eventos | remover ${remover.length} (de outros bimestres ou sem marca) | backup: ${backupFeed}`);

    if (APPLY) {
      const updates = {};
      for (const k of remover) updates[`feed_global/${k}`] = null;
      await update(ref(db), updates);
      console.log("  -> feed limpo (só eventos do bimestre atual permanecem).");
    } else {
      console.log("  (dry-run: não alterado)");
    }
  }
}

if (!APPLY) {
  console.log("\n🔎 DRY-RUN — nada foi alterado. Para aplicar de verdade:");
  console.log("   node reset-nivel-perfil.mjs --apply");
}
process.exit(0);

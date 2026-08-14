#!/usr/bin/env node
/**
 * importar-atestados.mjs
 * ───────────────────────────────────────────────────────────────
 * Importa atestados médicos para o nó  atestados/{turma}/{aluno}  do RTDB.
 *
 * Escopo desta carga (só as turmas que existem no quiz — 8G e 8D):
 *   • Davi Francisco (8G)   06/08→08/08  e  03/08→06/08
 *   • Ketelen (8G)          21/07→05/08  e  06/08→07/08   (registros sobrepostos consolidados)
 *   • Ketelly (8D)          07/08→08/08
 *
 * Alunos de 6A, 6G, 7B, 9D foram IGNORADOS de propósito: essas turmas não
 * existem em ALUNOS_POR_TURMA. Os nomes foram mapeados dos nomes completos
 * da planilha para os nomes curtos usados no sistema.
 *
 * Comportamento: APPEND — mantém os atestados que já existirem no aluno e
 * acrescenta estes (sem duplicar um período idêntico início+fim que já exista).
 *
 * COMO RODAR (na raiz do projeto):
 *   npm install firebase
 *   node importar-atestados.mjs           # DRY-RUN: mostra o que faria (não grava)
 *   node importar-atestados.mjs --apply    # grava de verdade (faz backup antes)
 */

import { writeFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";

const firebaseConfig = {
  apiKey:            "AIzaSyBlAM-OILysMt1RnPQkzWjEWUAhmHTHW2E",
  authDomain:        "sistemamatematica-50eff.firebaseapp.com",
  projectId:         "sistemamatematica-50eff",
  storageBucket:     "sistemamatematica-50eff.firebasestorage.app",
  messagingSenderId: "29610901805",
  appId:             "1:29610901805:web:f01f7516fa2d19942753a4",
  databaseURL:       "https://sistemamatematica-50eff-default-rtdb.firebaseio.com",
};

const APPLY = process.argv.includes("--apply");
const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

// dd/mm/aaaa → aaaa-mm-dd
const iso = br => { const [d,m,y] = br.split("/"); return `${y}-${m}-${d}`; };

// Atestados a importar. `obs` guarda o motivo/CID da planilha.
// (Nomes já no formato curto de ALUNOS_POR_TURMA.)
const ENTRADAS = [
  { turma:"8G", aluno:"Davi Francisco", inicio:"06/08/2026", fim:"08/08/2026", obs:"" },
  { turma:"8G", aluno:"Davi Francisco", inicio:"03/08/2026", fim:"06/08/2026", obs:"" },
  // Ketelen: 21/07→31/07 e 21/07→05/08 consolidados em 21/07→05/08; + 06/08→07/08
  { turma:"8G", aluno:"Ketelen",        inicio:"21/07/2026", fim:"05/08/2026", obs:"" },
  { turma:"8G", aluno:"Ketelen",        inicio:"06/08/2026", fim:"07/08/2026", obs:"" },
  { turma:"8D", aluno:"Ketelly",        inicio:"07/08/2026", fim:"08/08/2026", obs:"" },
];

async function main(){
  console.log(APPLY ? "▶ MODO --apply (vai gravar)\n" : "▶ DRY-RUN (não grava; use --apply para valer)\n");

  // agrupa por turma/aluno
  const porAlvo = {};
  for (const e of ENTRADAS){
    const k = `${e.turma}/${e.aluno}`;
    (porAlvo[k] ||= []).push({ inicio: iso(e.inicio), fim: iso(e.fim), obs: e.obs, ts: Date.now() });
  }

  const backup = {};
  let addTotal = 0;

  for (const [alvo, novos] of Object.entries(porAlvo)){
    const [turma, aluno] = alvo.split("/");
    const r = ref(db, `atestados/${turma}/${aluno}`);
    const snap = await get(r);
    const atuais = snap.exists()
      ? (Array.isArray(snap.val()) ? snap.val().filter(Boolean) : Object.values(snap.val()).filter(Boolean))
      : [];
    backup[alvo] = atuais;

    // evita duplicar período idêntico (mesmo início+fim)
    const jaTem = new Set(atuais.map(a => `${a.inicio}|${a.fim}`));
    const paraAdd = novos.filter(n => !jaTem.has(`${n.inicio}|${n.fim}`));
    const final = [...atuais, ...paraAdd];

    console.log(`• ${turma} — ${aluno}`);
    console.log(`    já tinha: ${atuais.length}  |  novos: ${paraAdd.length}${paraAdd.length!==novos.length?`  (${novos.length-paraAdd.length} já existia(m))`:""}`);
    paraAdd.forEach(a => console.log(`      + ${a.inicio} → ${a.fim}  (${a.obs})`));
    addTotal += paraAdd.length;

    if (APPLY && paraAdd.length){
      await set(r, final);
    }
  }

  if (APPLY){
    const arq = `backup-atestados-${Date.now()}.json`;
    writeFileSync(arq, JSON.stringify(backup, null, 2));
    console.log(`\n✔ Gravado. Backup do estado anterior salvo em ${arq}`);
  } else {
    console.log(`\nTotal que seria adicionado: ${addTotal} atestado(s). Rode com --apply para gravar.`);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

#!/usr/bin/env node
/**
 * sincronizar-nomes-biblioteca.mjs
 * ───────────────────────────────────────────────────────────────
 * Alinha o `nome` de cada item do nó `biblioteca` (Firebase) ao título
 * limpo do `conteudos/index.json` (fonte da verdade), casando pelo ARQUIVO.
 *
 * Depois desta padronização, o NOME na biblioteca é só o ASSUNTO
 * (ex.: "Equações do 1º Grau (Parte 1)"). O tipo (Teoria / Lista de
 * Exercícios) aparece como TAG nas telas — não faz parte do nome.
 *
 * COMO RODAR (dentro de scripts/):
 *   npm install
 *   node sincronizar-nomes-biblioteca.mjs           # DRY-RUN
 *   node sincronizar-nomes-biblioteca.mjs --apply     # aplica (backup antes)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, update } from "firebase/database";

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

// index.json — ajuste o caminho se rodar de outra pasta
const INDEX_PATH = "../conteudos/index.json";

const norm = p => (p || "")
  .replace(/^\/?conteudos\//i, "")   // tira pasta
  .replace(/^\//, "")
  .trim()
  .toLowerCase();

const idx = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
const porArquivo = new Map();
for (const it of idx.itens || []) {
  porArquivo.set(norm(it.arquivo), it.titulo);
}

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

const snap = await get(ref(db, "biblioteca"));
if (!snap.exists()) { console.log("Nó 'biblioteca' vazio."); process.exit(0); }

const bib = snap.val();
const mudancas = [], semMatch = [], updates = {};

for (const [id, item] of Object.entries(bib)) {
  const arq = norm(item?.arquivo);
  const alvo = porArquivo.get(arq);
  if (alvo === undefined) { semMatch.push({ id, arquivo:item?.arquivo, nome:item?.nome }); continue; }
  if ((item?.nome || "") !== alvo) {
    mudancas.push({ id, de:item?.nome, para:alvo, arquivo:item?.arquivo });
    updates[`biblioteca/${id}/nome`] = alvo;
  }
}

console.log(`\n${mudancas.length} nome(s) a sincronizar:\n`);
for (const m of mudancas) console.log(`  • ${JSON.stringify(m.de)}\n      -> ${JSON.stringify(m.para)}   [${m.arquivo}]`);

if (semMatch.length) {
  console.log(`\n⚠ ${semMatch.length} item(ns) da biblioteca sem correspondência no index.json (não tocados):`);
  for (const s of semMatch) console.log(`    - ${JSON.stringify(s.nome)}  [${s.arquivo}]`);
  console.log("    (verifique se o 'arquivo' bate com algum conteúdo, ou rode o gerar-index.)");
}

if (!mudancas.length) { console.log("\n✓ Biblioteca já sincronizada."); process.exit(0); }

if (!APPLY) { console.log("\n(DRY-RUN) Nada alterado. Rode com --apply para aplicar."); process.exit(0); }

const backup = `backup-biblioteca-${Date.now()}.json`;
writeFileSync(backup, JSON.stringify(bib, null, 2), "utf8");
console.log(`\nBackup salvo em scripts/${backup}`);

await update(ref(db), updates);
console.log(`✅ ${mudancas.length} nome(s) sincronizados no nó 'biblioteca'.`);
process.exit(0);

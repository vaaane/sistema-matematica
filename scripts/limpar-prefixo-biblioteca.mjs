#!/usr/bin/env node
/**
 * limpar-prefixo-biblioteca.mjs
 * ───────────────────────────────────────────────────────────────
 * Remove o PREFIXO DE TIPO redundante do `nome` de cada aula no nó
 * `biblioteca` do Firebase — o tipo já aparece na tag (Teoria/Exercícios/…),
 * então o nome não precisa repeti-lo.
 *
 *   "Teoria — Representação Algébrica"            -> "Representação Algébrica"
 *   "Lista de Exercícios — Simplificação..."       -> "Simplificação..."
 *   "Revisão — Números Inteiros & Valor Numérico"  -> "Números Inteiros & Valor Numérico"
 *
 * Só remove prefixos que indicam TIPO (Teoria, Lista de Exercícios, Exercícios,
 * Lista, Atividade, Revisão, Projeto, Problemas). Nomes sem esse prefixo ficam intactos.
 *
 * COMO RODAR (Claude Code ou terminal), dentro de scripts/:
 *   npm install
 *   node limpar-prefixo-biblioteca.mjs           # DRY-RUN: mostra o que mudaria
 *   node limpar-prefixo-biblioteca.mjs --apply    # aplica (faz backup antes)
 */

import { writeFileSync } from "node:fs";
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

// mesma regra usada em p-conteudos.html (semPrefixoTipo)
function semPrefixoTipo(nome){
  const s = (nome || "").trim();
  const re = /^\s*(?:Lista de Exerc[íi]cios|Lista|Exerc[íi]cios|Teoria|Atividade|Revis[ãa]o|Projeto|Problemas)\s*[—–-]\s*/i;
  const novo = s.replace(re, "").trim();
  return novo || s;
}

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

const snap = await get(ref(db, "biblioteca"));
if (!snap.exists()) { console.log("Nó 'biblioteca' vazio. Nada a fazer."); process.exit(0); }

const bib = snap.val();
const mudancas = [];
const updates = {};

for (const [id, item] of Object.entries(bib)) {
  const antigo = item?.nome || "";
  const novo   = semPrefixoTipo(antigo);
  if (novo !== antigo) {
    mudancas.push({ id, antigo, novo });
    updates[`biblioteca/${id}/nome`] = novo;
  }
}

if (!mudancas.length) {
  console.log("✓ Nenhum nome com prefixo de tipo. Biblioteca já está limpa.");
  process.exit(0);
}

console.log(`\n${mudancas.length} nome(s) a ajustar:\n`);
for (const m of mudancas) console.log(`  • ${JSON.stringify(m.antigo)}\n      -> ${JSON.stringify(m.novo)}`);

if (!APPLY) {
  console.log("\n(DRY-RUN) Nada foi alterado. Rode com --apply para aplicar.");
  process.exit(0);
}

// backup antes de aplicar
const backup = `backup-biblioteca-${Date.now()}.json`;
writeFileSync(backup, JSON.stringify(bib, null, 2), "utf8");
console.log(`\nBackup salvo em scripts/${backup}`);

await update(ref(db), updates);
console.log(`✅ Aplicado: ${mudancas.length} nome(s) atualizados no nó 'biblioteca'.`);
process.exit(0);

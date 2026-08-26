#!/usr/bin/env node
/**
 * duplas-8g-equacoes.mjs
 * ───────────────────────────────────────────────────────────────
 * Turma 8G jogou "Atividade 1 - Equações do 1º Grau" em duplas, mas só
 * um dos dois logou/jogou. Este script copia o resultado de quem tem
 * nota para o parceiro que ficou sem nota. NÃO apaga nem altera o
 * registro de quem já jogou — só cria/atualiza o registro do parceiro.
 *
 * Usa a API REST do Realtime Database diretamente (fetch), em vez do
 * SDK do firebase: o SDK se mostrou instável nesta máquina/rede (get()
 * retornando snapshots incompletos silenciosamente). A REST API é
 * confiável e as regras do projeto já permitem leitura/escrita livre
 * em "resultados"/"detalhes" (ver database.rules.json).
 *
 * COMO RODAR, dentro de scripts/:
 *   node duplas-8g-equacoes.mjs           # DRY-RUN: mostra o que faria
 *   node duplas-8g-equacoes.mjs --apply   # aplica de verdade (backup antes)
 */

import { writeFileSync } from "node:fs";

const DB_URL = "https://sistemamatematica-50eff-default-rtdb.firebaseio.com";
const TURMA     = "8G";
const ATIVIDADE = "Atividade 1 - Equações do 1º Grau";

// Nomes já normalizados para a grafia oficial do ALUNOS_POR_TURMA (js/constants.js):
// "Pyetro Emanuel" -> "Pyetro" | "Erick" -> "Erik" | "Ketellen" -> "Ketelen"
const DUPLAS = [
  ["Davi Francisco", "Pyetro"],
  ["Thays", "Paulo Henrique"],
  ["Maria Clara", "Ana Clara"],
  ["Erik", "Ana Gabryella"],
  ["Ketelen", "Maria Eduarda"],
  ["Pietro", "Pedro Gabriel"],
  ["Beatriz", "Ana Maria"],
  ["Lorran", "Renan"],
];

const APPLY = process.argv.includes("--apply");

const linhas = [];
function log(msg) { linhas.push(msg); console.log(msg); }
function fmtNota(n){ return (n==null) ? "—" : Number(n).toFixed(2).replace(".",","); }

async function restGet(path, query) {
  const url = query ? `${DB_URL}/${path}.json?${query}` : `${DB_URL}/${path}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${path} -> HTTP ${res.status}`);
  return res.json();
}
async function restPatch(path, data) {
  const res = await fetch(`${DB_URL}/${path}.json`, { method: "PATCH", body: JSON.stringify(data) });
  if (!res.ok) throw new Error(`PATCH ${path} -> HTTP ${res.status}`);
  return res.json();
}
async function restPut(path, data) {
  const res = await fetch(`${DB_URL}/${path}.json`, { method: "PUT", body: JSON.stringify(data) });
  if (!res.ok) throw new Error(`PUT ${path} -> HTTP ${res.status}`);
  return res.json();
}
async function restPost(path, data) {
  const res = await fetch(`${DB_URL}/${path}.json`, { method: "POST", body: JSON.stringify(data) });
  if (!res.ok) throw new Error(`POST ${path} -> HTTP ${res.status}`);
  const json = await res.json();
  return json.name; // nova chave gerada
}

console.log(`\nBuscando resultados da turma ${TURMA}...\n`);
const raw = await restGet("resultados", `orderBy=%22turma%22&equalTo=%22${encodeURIComponent(TURMA)}%22`);
const todos = Object.entries(raw || {}).map(([id, v]) => ({ id, ...v }));
const eq = todos.filter(r => r.atividade === ATIVIDADE && !r.modo_teste);

function registrosDoAluno(aluno) {
  return eq.filter(r => r.aluno === aluno);
}
function melhorConcluido(aluno) {
  const regs = registrosDoAluno(aluno).filter(r => r.concluido);
  regs.sort((a, b) => (b.pontuacao ?? -1) - (a.pontuacao ?? -1) || (b.criadoEm || 0) - (a.criadoEm || 0));
  return regs[0] || null;
}

console.log(`Duplas ${TURMA} — ${ATIVIDADE}\n`);

const plano = [];
for (const [a, b] of DUPLAS) {
  const regA = melhorConcluido(a);
  const regB = melhorConcluido(b);
  if (regA && regB) {
    log(`— ${a} e ${b}: os dois já têm nota (${fmtNota(regA.pontuacao)} / ${fmtNota(regB.pontuacao)}), nada a fazer.`);
  } else if (!regA && !regB) {
    log(`⚠️  ${a} e ${b}: NENHUM dos dois tem registro nesta atividade — não dá pra copiar nada. Verifique manualmente.`);
  } else {
    const [origem, destino, reg] = regA ? [a, b, regA] : [b, a, regB];
    log(`${APPLY ? "✓" : "(dry-run)"} ${destino} vai receber a nota de ${origem}: ${fmtNota(reg.pontuacao)}`);
    plano.push({ origem, destino, reg });
  }
}

if (APPLY && plano.length) {
  const backup = { turma: TURMA, atividade: ATIVIDADE, plano };
  for (const { origem, destino, reg } of plano) {
    const existentes = registrosDoAluno(destino);
    const concl = existentes.find(r => r.concluido);
    const det = await restGet(`detalhes/${reg.id}/questoes`).catch(() => null);
    const dados = {
      aluno: destino, turma: TURMA, atividade: ATIVIDADE,
      concluido: true, emAndamento: false,
      pontuacao: reg.pontuacao ?? 0, pontuacao_bruta: reg.pontuacao_bruta ?? reg.pontuacao ?? 0,
      acertos: reg.acertos ?? 0, erros: reg.erros ?? 0,
      respondidas: reg.respondidas ?? 0, total: reg.total ?? (det?.length || 0),
      tempo_segundos: reg.tempo_segundos ?? 0,
      motivo_fim: "dupla_sem_login", modo: reg.modo || "equacoes_plus",
      recuperado_de: origem, lancado_manual: true, fimTs: Date.now(),
      criadoEm: Date.now(),
    };
    let destId;
    if (concl) { await restPatch(`resultados/${concl.id}`, dados); destId = concl.id; }
    else { destId = await restPost("resultados", dados); }
    if (det?.length) await restPut(`detalhes/${destId}`, { questoes: det }).catch(() => {});
    log(`   ↳ gravado em resultados/${destId}`);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(`backup-duplas-8g-${stamp}.json`, JSON.stringify({ log: linhas, backup }, null, 2));
  console.log(`\n✅ Aplicado. Log salvo em backup-duplas-8g-${stamp}.json`);
} else if (!APPLY) {
  console.log("\n🔎 DRY-RUN — nada foi alterado. Para aplicar de verdade:");
  console.log("   node duplas-8g-equacoes.mjs --apply");
} else {
  console.log("\nNada para aplicar.");
}

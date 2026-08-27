#!/usr/bin/env node
/**
 * duplas-8f-equacoes.mjs
 * ───────────────────────────────────────────────────────────────
 * Mesma lógica do duplas-8g-equacoes.mjs / duplas-8d-equacoes.mjs,
 * para a turma 8F. Copia o resultado de quem tem nota para o parceiro
 * que ficou sem nota (sem registro). NÃO apaga nem altera o registro
 * de quem já jogou.
 *
 * Duplas informadas pela professora, já resolvidas contra os dados reais
 * do Firebase (nomes normalizados para a grafia oficial de ALUNOS_POR_TURMA):
 *   - Arthur Daniel e Ycaro       → Ycaro sem registro
 *   - Luana e Kayla               → Luana sem registro
 *   - Maria Santa e Arthur Martins→ Maria Santa sem registro
 *   - Joao Pedro e Victor Conceicao ("Victor A." = Victor Hugo Andrade da
 *     Conceicao) → Victor Conceicao sem registro
 *   - Marlon e Wesley             → Wesley sem registro
 *   - Sara e Evellyn              → Evellyn sem registro
 *   - Ana Clara e Maria Elisangela ("Maria E.") → Ana Clara sem registro
 *   - Renato e Mycaela ("Mycaella") → Mycaela sem registro
 *   - Sofia e Joaquim             → Joaquim sem registro
 *   - Rafael e Pedro Lucas        → Pedro Lucas sem registro
 *   - Ana Beatriz e Nathalia      → Ana Beatriz sem registro (não há nota
 *     prévia dela nesta atividade em `resultados` nem em `notas_bimestre`
 *     — confirmar com a professora se a nota que ela lembra é de outro
 *     lugar; o efeito deste script é o normal: copia a nota da Nathalia)
 *   - Fellype e Guilherme         → Guilherme sem registro
 *
 * COMO RODAR, dentro de scripts/:
 *   node duplas-8f-equacoes.mjs           # DRY-RUN: mostra o que faria
 *   node duplas-8f-equacoes.mjs --apply   # aplica de verdade (backup antes)
 */

import { writeFileSync } from "node:fs";

const DB_URL = "https://sistemamatematica-50eff-default-rtdb.firebaseio.com";
const TURMA     = "8F";
const ATIVIDADE = "Atividade 1 - Equações do 1º Grau";

const DUPLAS = [
  ["Arthur Daniel", "Ycaro"],
  ["Kayla", "Luana"],
  ["Arthur Martins", "Maria Santa"],
  ["Joao Pedro", "Victor Conceicao"],
  ["Marlon", "Wesley"],
  ["Sara", "Evellyn"],
  ["Maria Elisangela", "Ana Clara"],
  ["Renato", "Mycaela"],
  ["Sofia", "Joaquim"],
  ["Rafael", "Pedro Lucas"],
  ["Nathalia", "Ana Beatriz"],
  ["Fellype", "Guilherme"],
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
  return json.name;
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
    log(`⚠️  ${a} e ${b}: NENHUM dos dois tem registro concluído — não dá pra copiar nada. Verifique manualmente.`);
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
  writeFileSync(`backup-duplas-8f-${stamp}.json`, JSON.stringify({ log: linhas, backup }, null, 2));
  console.log(`\n✅ Aplicado. Log salvo em backup-duplas-8f-${stamp}.json`);
} else if (!APPLY) {
  console.log("\n🔎 DRY-RUN — nada foi alterado. Para aplicar de verdade:");
  console.log("   node duplas-8f-equacoes.mjs --apply");
} else {
  console.log("\nNada para aplicar.");
}

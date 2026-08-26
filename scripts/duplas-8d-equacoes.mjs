#!/usr/bin/env node
/**
 * duplas-8d-equacoes.mjs
 * ───────────────────────────────────────────────────────────────
 * Mesma lógica do duplas-8g-equacoes.mjs, para a turma 8D. Copia o
 * resultado de quem tem nota para o parceiro que ficou sem nota
 * (concluido:false / sem registro). NÃO apaga nem altera o registro
 * de quem já jogou.
 *
 * Duplas informadas pela professora, já resolvidas contra os dados reais
 * do Firebase (nomes truncados/typos corrigidos para a grafia oficial de
 * ALUNOS_POR_TURMA):
 *   - João Pedro e Arthur → os dois já têm nota, nada a fazer
 *   - Thalles (Davi) e Wanderson → Wanderson sem registro
 *   - Lucas Gabriel → já tem nota, sem parceiro citado, nada a fazer
 *   - Ana Julia e Ketelly → Ketelly com registro incompleto (concluido:false)
 *   - Miguel Nascimento e Luis Gabriel → Luis Gabriel sem registro
 *   - "Luis Matheus" (= Lucas Matheus) e Luis Miguel → Luis Miguel sem registro
 *   - "Alice Costa" (= Alice Tavares, confirmado com a professora) e Leticia
 *     → Alice Tavares com registro incompleto
 *   - "karolyne" (= Karolinny) e Sandra → Karolinny sem registro
 *   - Izabelly (Monik) → já tem nota, mencionada solta, nada a fazer
 *   - Alice da Paz (= Alice Paz) → já tem nota, mencionada solta, nada a fazer
 *   - Isaac faltou → sem registro válido e sem dupla; fica sem nota mesmo
 *
 * COMO RODAR, dentro de scripts/:
 *   node duplas-8d-equacoes.mjs           # DRY-RUN: mostra o que faria
 *   node duplas-8d-equacoes.mjs --apply   # aplica de verdade (backup antes)
 */

import { writeFileSync } from "node:fs";

const DB_URL = "https://sistemamatematica-50eff-default-rtdb.firebaseio.com";
const TURMA     = "8D";
const ATIVIDADE = "Atividade 1 - Equações do 1º Grau";

const DUPLAS = [
  ["Thalles Davi", "Wanderson"],
  ["Ana Julia", "Ketelly"],
  ["Miguel Nascimento", "Luis Gabriel"],
  ["Lucas Matheus", "Luis Miguel"],
  ["Leticia", "Alice Tavares"],
  ["Sandra", "Karolinny"],
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
  writeFileSync(`backup-duplas-8d-${stamp}.json`, JSON.stringify({ log: linhas, backup }, null, 2));
  console.log(`\n✅ Aplicado. Log salvo em backup-duplas-8d-${stamp}.json`);
} else if (!APPLY) {
  console.log("\n🔎 DRY-RUN — nada foi alterado. Para aplicar de verdade:");
  console.log("   node duplas-8d-equacoes.mjs --apply");
} else {
  console.log("\nNada para aplicar.");
}

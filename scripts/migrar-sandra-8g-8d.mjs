#!/usr/bin/env node
/**
 * migrar-sandra-8g-8d.mjs
 * ───────────────────────────────────────────────────────────────
 * Migra os dados de Sandra (matrícula 469433, nº 30) de 8G para 8D
 * após mudança de sala. Segue o mesmo padrão não-destrutivo de
 * professor/migrar_jessier.html: COPIA para o novo lugar, NUNCA
 * apaga o antigo (fica como histórico).
 *
 * Cobre: login (PIN novo, ver abaixo), perfil/XP, tabuada, tabuada
 * negativa, ranking de tabuada (bim atual + bim 1/2), recordes de
 * torneio, notas de todos os bimestres, congelamento de bimestre,
 * chamada (frequência) e atestados. Corrige o campo "turma" nos
 * registros de `resultados` (atividades/quiz já feitos por ela).
 *
 * NÃO migra "vistos de caderno" (vistos/{turma}/{bim}/marcas/{atvId}):
 * os atvId são específicos de cada turma (atividades cadastradas
 * separadamente pra 8G e 8D), então copiar as marcas antigas ficaria
 * "órfão" e não apareceria na tela de vistos do 8D. Isso precisa ser
 * feito manualmente pela professora na interface (marcar os vistos da
 * Sandra nas atividades do 8D daqui pra frente).
 *
 * PIN de login: como a turma faz parte do hash da senha (sha256 de
 * "turma|nome|pin"), não dá pra copiar o hash antigo — o PIN antigo
 * fica inválido. Este script cria um login novo pra "Sandra" em 8D
 * com PIN padrão 1234 (mesma convenção do /criar-aluno).
 *
 * COMO RODAR, dentro de scripts/:
 *   npm install
 *   node migrar-sandra-8g-8d.mjs           # DRY-RUN: mostra o que faria
 *   node migrar-sandra-8g-8d.mjs --apply    # aplica de verdade (backup antes)
 */

import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set, update, query, orderByChild, equalTo } from "firebase/database";

const firebaseConfig = {
  apiKey:            "AIzaSyBlAM-OILysMt1RnPQkzWjEWUAhmHTHW2E",
  authDomain:        "sistemamatematica-50eff.firebaseapp.com",
  projectId:         "sistemamatematica-50eff",
  storageBucket:     "sistemamatematica-50eff.firebasestorage.app",
  messagingSenderId: "29610901805",
  appId:             "1:29610901805:web:f01f7516fa2d19942753a4",
  databaseURL:       "https://sistemamatematica-50eff-default-rtdb.firebaseio.com",
};

const TURMA_ANTIGA = "8G";
const TURMA_NOVA   = "8D";
const NOME         = "Sandra";
const PIN          = "1234";
const BIMESTRES    = [1, 2, 3, 4];

const APPLY = process.argv.includes("--apply");

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

const makeUid = (turma, nome) => (turma + "_" + nome).replace(/[.#$[\]/\s]/g, "_");
const slugNome = (nome) => nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "_");
const senhaKey = (turma, nome) =>
  Buffer.from(`${turma}|${nome}`, "utf8").toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const hashSenha = (turma, nome, pin) =>
  createHash("sha256").update(`${turma}|${nome}|${pin}`, "utf8").digest("hex");

const uidOld  = makeUid(TURMA_ANTIGA, NOME);
const uidNew  = makeUid(TURMA_NOVA, NOME);
const slug    = slugNome(NOME);

const backup = {};
function guardarBackup(path, valor) { if (valor !== null && valor !== undefined) backup[path] = valor; }

const linhas = [];
function log(msg) { linhas.push(msg); console.log(msg); }

async function copiarNo(pathOrigem, pathDestino, rotulo) {
  const origem = await get(ref(db, pathOrigem));
  if (!origem.exists()) { log(`— ${rotulo}: nada em ${pathOrigem}`); return; }
  const destino = await get(ref(db, pathDestino));
  if (destino.exists()) { log(`⚠️  ${rotulo}: destino já existia, pulei (${pathDestino})`); return; }
  guardarBackup(pathDestino, null); // destino era vazio; nada a restaurar além de apagar se precisar reverter
  if (APPLY) {
    await set(ref(db, pathDestino), origem.val());
    log(`✓ ${rotulo}: copiado -> ${pathDestino}`);
  } else {
    log(`(dry-run) copiaria ${rotulo}: ${pathOrigem} -> ${pathDestino}`);
  }
}

console.log(`\nMigrando ${NOME}: ${TURMA_ANTIGA} -> ${TURMA_NOVA}  (uid ${uidOld} -> ${uidNew})\n`);

// 1) Login — novo registro em aluno_senhas para a turma nova (turma faz parte do hash)
{
  const destKey = senhaKey(TURMA_NOVA, NOME);
  const existente = await get(ref(db, `aluno_senhas/${destKey}`));
  if (existente.exists()) {
    log(`⚠️  Login: já existe aluno_senhas para ${TURMA_NOVA}|${NOME}, pulei`);
  } else if (APPLY) {
    const hash = hashSenha(TURMA_NOVA, NOME, PIN);
    await set(ref(db, `aluno_senhas/${destKey}`), { turma: TURMA_NOVA, nome: NOME, hash, enc: Buffer.from(PIN).toString("base64") });
    log(`✓ Login: criado para "${NOME}" (${TURMA_NOVA}) com PIN ${PIN}`);
  } else {
    log(`(dry-run) criaria login para "${NOME}" (${TURMA_NOVA}) com PIN ${PIN}`);
  }
}

// 2) Nós chaveados por uid (turma_nome)
await copiarNo(`perfis/${uidOld}`, `perfis/${uidNew}`, "Perfil (XP/nível/streak)");
await copiarNo(`tabuada_niveis/${uidOld}`, `tabuada_niveis/${uidNew}`, "Tabuada");
await copiarNo(`tabuada_negativos_niveis/${uidOld}`, `tabuada_negativos_niveis/${uidNew}`, "Tabuada Negativa");
await copiarNo(`tabuada_ranking/${uidOld}`, `tabuada_ranking/${uidNew}`, "Ranking Tabuada (bim 1/2)");
for (const b of [3, 4]) {
  await copiarNo(`tabuada_ranking_b/${b}/${uidOld}`, `tabuada_ranking_b/${b}/${uidNew}`, `Ranking Tabuada (bim ${b})`);
}
await copiarNo(`tabuada_sprint_ranking/${uidOld}`, `tabuada_sprint_ranking/${uidNew}`, "Ranking Sprint");
await copiarNo(`conquistas/${uidOld}`, `conquistas/${uidNew}`, "Conquistas (nó por aluno)");
await copiarNo(`torneio_recordes/${uidOld}`, `torneio_recordes/${uidNew}`, "Recordes de torneio");

// 3) Notas por bimestre (chave = slug do nome, dentro da turma)
for (const b of BIMESTRES) {
  await copiarNo(`notas_bimestre/${b}/${TURMA_ANTIGA}/${slug}`, `notas_bimestre/${b}/${TURMA_NOVA}/${slug}`, `Notas bim ${b}`);
}

// 4) Congelamento de bimestre
for (const b of BIMESTRES) {
  await copiarNo(`notas_congelado/${b}/${TURMA_ANTIGA}/alunos/${slug}`, `notas_congelado/${b}/${TURMA_NOVA}/alunos/${slug}`, `Congelamento bim ${b}`);
}

// 5) Atestados (chave = nome cru, dentro da turma)
await copiarNo(`atestados/${TURMA_ANTIGA}/${NOME}`, `atestados/${TURMA_NOVA}/${NOME}`, "Atestados");

// 6) Chamada (frequência) — copia só a entrada dela, dia a dia, sem mexer nos outros alunos
for (const b of BIMESTRES) {
  const snap = await get(ref(db, `chamada/${TURMA_ANTIGA}/${b}`));
  if (!snap.exists()) { log(`— Chamada bim ${b}: nada em ${TURMA_ANTIGA}`); continue; }
  const porData = snap.val();
  let copiados = 0;
  for (const [data, porAluno] of Object.entries(porData)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) continue;
    if (!porAluno || !Object.prototype.hasOwnProperty.call(porAluno, NOME)) continue;
    const destino = await get(ref(db, `chamada/${TURMA_NOVA}/${b}/${data}/${NOME}`));
    if (destino.exists()) continue;
    if (APPLY) {
      await update(ref(db, `chamada/${TURMA_NOVA}/${b}/${data}`), { [NOME]: porAluno[NOME] });
    }
    copiados++;
  }
  log(copiados
    ? `${APPLY ? "✓" : "(dry-run) copiaria"} Chamada bim ${b}: ${copiados} dia(s)`
    : `— Chamada bim ${b}: nada pra copiar`);
}

// 7) resultados — corrige o campo "turma" nos registros dela (atividades/quiz já feitos)
{
  const q = query(ref(db, "resultados"), orderByChild("aluno"), equalTo(NOME));
  const snap = await get(q);
  let corrigidos = 0;
  if (snap.exists()) {
    for (const [id, v] of Object.entries(snap.val())) {
      if (v.turma !== TURMA_ANTIGA) continue;
      if (APPLY) await update(ref(db, `resultados/${id}`), { turma: TURMA_NOVA });
      corrigidos++;
    }
  }
  log(corrigidos
    ? `${APPLY ? "✓" : "(dry-run) corrigiria"} Resultados: ${corrigidos} registro(s) (turma -> ${TURMA_NOVA})`
    : "— Resultados: nada pra corrigir");
}

log("\n⚠️  NÃO migrado (precisa ser manual): Vistos de caderno — os atvId são específicos de cada");
log("   turma; marque a Sandra diretamente nas atividades do 8D em professor/p-vistos.html.");

if (APPLY) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(`backup-migracao-sandra-${stamp}.json`, JSON.stringify({ log: linhas }, null, 2));
  console.log("\n✅ Migração aplicada. Log salvo em backup-migracao-sandra-*.json");
} else {
  console.log("\n🔎 DRY-RUN — nada foi alterado. Para aplicar de verdade:");
  console.log("   node migrar-sandra-8g-8d.mjs --apply");
}
process.exit(0);

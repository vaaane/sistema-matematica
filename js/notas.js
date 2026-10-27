// ── notas.js — lógica compartilhada de notas/boletim ──────────
// Usado por: professor/p-notas.html, aluno/a-notas.html, aluno/menu.html (card resumo)

import { db } from "./firebase-config.js";
import { ref, get, set, update, remove, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { BIMESTRES } from "./constants.js";
import { carregarBibliotecaMapa, resolverAula } from "./biblioteca.js";
import { isModoTeste } from "./auth.js";
import { notaJogoRevisao } from "./jogo-revisao/nota.js";

// Ocorrências positivas (mesma lista da ficha do aluno). As demais contam como negativas.
const POSITIVAS_OCORRENCIA = ["Aluno se comportou", "Aluno foi participativo"];

// Bimestre atual — ainda não temos seletor de bimestres anteriores no banco,
// então isso é fixo por enquanto. Quando criar o 3º bimestre, troque aqui
// (e nas páginas que usam o seletor visual) e os bimestres antigos continuam
// intactos em notas_bimestre/1, notas_bimestre/2 etc.
export let BIMESTRE = "2";
// Troca o bimestre corrente em memória (o seletor da página de Notas chama isto).
// Como os imports de ES module são "live bindings", todas as funções deste arquivo
// e das páginas passam a usar o novo valor automaticamente.
export function setBimestre(b) { BIMESTRE = String(b); }

// Pesos confirmados em 30/06/2026. Soma das 6 notas pode chegar a 11
// (Prova Multi 3 + Projeto 3 + Caderno 2 + Perímetro 1 + Área 1 + Lista 1) —
// se passar de 10, trava em 10. Os bônus de Extras entram DEPOIS desse teto.
export const CAMPOS_NOTA = [
  { key:"provaMulti", label:"Prova Multi",              max:3 },
  { key:"projeto",    label:"Projeto CriaBartô",        max:3 },
  { key:"caderno",    label:"Caderno",                  max:2 },
  { key:"equacoes",   label:"Atividade 1 - Equações",   max:1.5, auto:true },
  { key:"ativ4",      label:"Atividade 4",              max:0.5, auto:true },
  { key:"triangulos", label:"Atividade - Triângulos",   max:1,   auto:true },
  { key:"participacao",  label:"Participação",           max:0.5 },
  // ── campos do 3º bimestre ──
  { key:"cadernoVistos", label:"Caderno",                         max:2,   auto:true }, // proporção de vistos × 2
  { key:"razaoProp",     label:"Atividade 2 - Regra de três",     max:1.5, auto:true },
  { key:"conselheiro",   label:"Professor Conselheiro",           max:1,   auto:true }, // começa em 1,0
  { key:"pd",            label:"PD - Geometria",                  max:1,   auto:true }, // Geo Canudos Parte 1 (0,5) + Parte 2 (0,5). Parte 3 fica pro 4º bim.
  // ── campos do 4º bimestre (chaves NOVAS — as do 3º ficam como estão) ──
  { key:"cadernoB4",     label:"Caderno",                         max:5,   auto:true }, // proporção de vistos × 5
  { key:"comportamento", label:"Comportamento",                   max:2,   auto:true }, // começa em 2,0
  { key:"consciencia",   label:"Consciência Negra",               max:3 },
];

// Extras automáticos — calculados a partir do progresso real do aluno no banco
export const EXTRAS_AUTO = [
  { key:"t150",    label:"Tabuada nível 150",                valor:0.5, max:150, campo:"melhorTabuada" },
  { key:"t300",    label:"Tabuada nível 300",                valor:0.5, max:300, campo:"melhorTabuada" },
  { key:"tneg50",  label:"Tabuada Negativa nível 50",        valor:0.5, max:50,  campo:"melhorNeg" },
  { key:"tneg150", label:"Tabuada Negativa nível 150",       valor:0.5, max:150, campo:"melhorNeg" },
  { key:"esc100",  label:"Escalada Algébrica nível 100",     valor:0.5, max:100, campo:"melhorEscalada" },
  // A partir do 3º bim vale +1,0 (antes +0,5) — getter pra não alterar o total dos bimestres anteriores.
  { key:"esc200",  label:"Escalada Algébrica nível 200",     get valor() { return +BIMESTRE >= 3 ? 1 : 0.5; }, max:200, campo:"melhorEscalada" },
  // ── 4º bim em diante (chaves NOVAS — não reaproveitar as de cima, que valem
  // para os bimestres já fechados). Acumulado, nos três jogos: nível 50 = 0,5 ·
  // nível 100 = 1,0 · nível 150 = 2,0. Mesmos marcos de regrasJogo() em js/constants.js.
  { key:"t50",      label:"Tabuada nível 50",                 valor:0.5, max:50,  campo:"melhorTabuada" },
  { key:"t100",     label:"Tabuada nível 100",                valor:0.5, max:100, campo:"melhorTabuada" },
  { key:"t150b",    label:"Tabuada nível 150",                valor:1.0, max:150, campo:"melhorTabuada" },
  { key:"tneg50b",  label:"Tabuada Negativa nível 50",        valor:0.5, max:50,  campo:"melhorNeg" },
  { key:"tneg100",  label:"Tabuada Negativa nível 100",       valor:0.5, max:100, campo:"melhorNeg" },
  { key:"tneg150b", label:"Tabuada Negativa nível 150",       valor:1.0, max:150, campo:"melhorNeg" },
  { key:"esc50",    label:"Escalada Algébrica nível 50",      valor:0.5, max:50,  campo:"melhorEscalada" },
  { key:"esc100b",  label:"Escalada Algébrica nível 100",     valor:0.5, max:100, campo:"melhorEscalada" },
  { key:"esc150",   label:"Escalada Algébrica nível 150",     valor:1.0, max:150, campo:"melhorEscalada" },
];
// Chaves de EXTRAS_AUTO que valem em cada regra de pontuação dos jogos.
const EXTRAS_JOGOS_ANTIGOS = ["t150", "t300", "tneg50", "tneg150", "esc100", "esc200"];          // 1º–3º bim
const EXTRAS_JOGOS_B4      = ["t50", "t100", "t150b", "tneg50b", "tneg100", "tneg150b", "esc50", "esc100b", "esc150"]; // 4º bim+
// Caderno Extra — automático, baseado na própria nota de Caderno lançada (não é mais checkbox manual)
export const CADERNO_EXTRA = { key:"cadExtra", label:"Caderno Extra", valor:0.5, limiar:1.8 };
// Bônus caderno (3º bim): % de vistos "feitos" (✓, ½, FA e AT✓ contam; F/vazio
// não) no bimestre — ≥ 90% dá +0,5. Diferente do Caderno Extra acima (1º/2º
// bim, baseado na nota manual de Caderno > 1,8).
export const BONUS_CADERNO_VISTOS = { key:"bonusCadernoVistos", label:"Bônus caderno", valor:0.5, limiarPct:90 };
// Ponto extra fixo para TODOS os alunos do bimestre (flag bonusFixo no bonusConfig).
// 3º bim: +1,0 para todos (06/10/2026). Entra junto com os demais bônus, depois do teto de 10.
export const BONUS_FIXO = { key:"bonusFixo", label:"Ponto extra do bimestre", valor:1 };
// Caderno completo (4º bim): mesmo % de vistos feitos do Bônus caderno acima,
// mas ≥ 80% dá +2,0. Chave nova — o Bônus caderno do 3º continua intacto.
export const CADERNO_COMPLETO = { key:"cadernoCompleto", label:"Caderno completo", valor:2, limiarPct:80 };
// Jogo de Revisão (4º bim): a nota do jogo (0 a 10) entra INTEIRA como extra.
// O jogo não separa por bimestre — é a nota geral (js/jogo-revisao/nota.js).
export const EXTRA_REVISAO = { key:"revisao", label:"Jogo de Revisão", max:10 };
// Extras manuais — o professor marca
// Participação agora é coluna de nota (não mais extra manual)
export const EXTRAS_MANUAL = [];

export function cadernoExtraAtivo(registro) {
  return (parseFloat(registro?.caderno) || 0) > CADERNO_EXTRA.limiar;
}

// ── Campos e bônus ATIVOS por bimestre ───────────────────────
// Padrão = tudo ligado. Liste só as EXCEÇÕES por bimestre.
// Para ativar um campo no 3º depois, é só acrescentar a chave na lista.
// Chaves possíveis: "provaMulti","projeto","caderno","ativ4","triangulos","participacao"
export const CAMPOS_POR_BIMESTRE = {
  "1": ["provaMulti", "projeto", "caderno", "ativ4", "triangulos", "participacao"], // como sempre foram
  "2": ["provaMulti", "projeto", "caderno", "ativ4", "triangulos", "participacao"], // como sempre foram
  // 3º (soma 10,0): Ativ.1 1,5 + Ativ.2 1,5 + Caderno 2,0 + Prova Multi 3,0 + Conselheiro 1,0 + PD 1,0
  "3": ["equacoes", "razaoProp", "cadernoVistos", "provaMulti", "conselheiro", "pd"],
  // 4º (soma 13, trava em 10): Caderno 5,0 + Comportamento 2,0 + Prova Multi 3,0 + Consciência Negra 3,0
  "4": ["cadernoB4", "comportamento", "provaMulti", "consciencia"],
};
// Componentes que ainda NÃO têm fonte de dados pronta neste bimestre.
// Aparecem na composição como "Ainda não disponibilizada" até a atividade existir.
export const CAMPOS_PENDENTES_POR_BIMESTRE = {
};
export function camposPendentes() { return new Set(CAMPOS_PENDENTES_POR_BIMESTRE[BIMESTRE] || []); }
export function campoPendente(key) { return camposPendentes().has(key); }
// Componentes automáticos que só são liberados AO ALUNO depois que o bimestre é
// fechado (congelado). Antes disso mostram "—". O professor continua vendo ao vivo.
export const CAMPOS_DIFERIDOS_POR_BIMESTRE = {
  // 3º bim: Caderno e Conselheiro passaram a aparecer ao vivo pro aluno (25/09/2026),
  // pra nota dele bater com a do professor sem precisar congelar.
  // 4º bim: Caderno e Comportamento só aparecem ao aluno quando o bimestre for fechado (congelado).
  "4": ["cadernoB4", "comportamento"],
};
export function camposDiferidos() { return new Set(CAMPOS_DIFERIDOS_POR_BIMESTRE[BIMESTRE] || []); }
export function campoDiferido(key) { return camposDiferidos().has(key); }
// Config de bônus por bimestre. Ausente = todos os bônus (padrão). null = nenhum.
// Objeto = escolhe quais partes valem. autoExtras: chaves de EXTRAS_AUTO (null = todas — evitar:
// incluiria as chaves de todos os bimestres).
export const BONUS_CONFIG_POR_BIMESTRE = {
  "3": { autoExtras: EXTRAS_JOGOS_ANTIGOS, cadExtra: false, rank: false, nivelPerfil: false, bonusCadernoVistos: true, bonusFixo: true },
  // 4º bim: nova pontuação dos jogos; sem o +0,5 (≥90%); Caderno completo (≥80% → +2,0) e Jogo de Revisão (0–10).
  "4": { autoExtras: EXTRAS_JOGOS_B4,      cadExtra: false, rank: false, nivelPerfil: false, bonusCadernoVistos: false, cadernoCompleto: true, revisao: true },
};
export function bonusConfig() {
  const cfg = BONUS_CONFIG_POR_BIMESTRE[BIMESTRE];
  if (cfg !== undefined) return cfg;                                          // config específica (pode ser null)
  // padrão (1º/2º bim): tudo (menos o bônus 3º bim). Jogos = só as chaves antigas,
  // que eram TODAS as de EXTRAS_AUTO antes das chaves do 4º bim existirem.
  return { autoExtras: EXTRAS_JOGOS_ANTIGOS, cadExtra: true, rank: true, nivelPerfil: true, bonusCadernoVistos: false };
}
// Bimestres cujas colunas seguem a ordem da lista em CAMPOS_POR_BIMESTRE (os
// demais seguem a ordem de CAMPOS_NOTA, como sempre foi).
const ORDEM_PELA_LISTA = new Set(["4"]);
export function camposAtivos() {
  const chaves = CAMPOS_POR_BIMESTRE[BIMESTRE];
  if (!chaves) return CAMPOS_NOTA;
  if (ORDEM_PELA_LISTA.has(BIMESTRE)) return chaves.map(k => CAMPOS_NOTA.find(c => c.key === k)).filter(Boolean);
  return CAMPOS_NOTA.filter(c => chaves.includes(c.key));
}
export function bonusAtivo() {
  return bonusConfig() !== null;   // controla se a coluna Extras aparece
}

// Atividade 2 - Regra de três: só a 8E tem lançamento automático pela nota do
// quiz. Nas demais turmas a professora lança a nota manualmente (confirmado
// em 24/09/2026), mesmo fluxo de Prova Multi/Caderno/Projeto.
export const TURMAS_RAZAO_PROP_AUTO = new Set(["8E"]);
export function razaoPropEhAuto(turma) { return TURMAS_RAZAO_PROP_AUTO.has(turma); }
// Se um campo é "automático" (somente leitura) OU "manual" (input) NESTA
// turma. Igual a c.auto pra todo campo, exceto razaoProp, que depende da turma.
export function campoAuto(c, turma) {
  return c.key === "razaoProp" ? razaoPropEhAuto(turma) : !!c.auto;
}

export const NOME_ATIV4 = "Atividade 4 - Geometria";
export const NOME_ATIV5 = "Atividade 5 - Geometria: Triângulos";
export const NOME_ATIV1_EQ = "Atividade 1 - Equações do 1º Grau";
// A Atividade 2 foi lançada como "Regra de três" (não "Razão e Proporção" —
// nome do plano original, nunca usado em `resultados`). Confirmado em 24/09/2026.
export const NOME_ATIV2_RP = "Atividade 2 - Regra de três";

// Valor real (na escala do boletim) de cada atividade avaliativa por quiz.
// Usado no Top 3 · Atividades da Home para ranquear pela NOTA real (x/1,5),
// e não pela pontuação bruta 0–10. Nomes conforme aparecem em `resultados`.
export const MAX_POR_ATIVIDADE = {
  [NOME_ATIV1_EQ]: 1.5,
  [NOME_ATIV2_RP]: 1.5,
  [NOME_ATIV5]:    1.0,
  [NOME_ATIV4]:    0.5,
};

export function makeUid(turma, nome) {
  return (turma + "_" + nome).replace(/[.#$\[\]\/\s]/g, "_");
}
export function slugNome(nome) {
  return nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "_");
}
export function fmtNota(n) {
  return (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// Atividade 4 — participação (0,5) vai na coluna; ranking vai nos Extras automáticos
export const EXTRA_RANK_ATIV4 = {
  key: "rankAtiv4",
  label: "Atividade 4 — Ranking",
  bonusPorPosicao: (pos) => pos === 0 ? 0 : pos === 1 ? 1.0 : pos === 2 ? 0.8 : pos === 3 ? 0.6 : pos <= 10 ? 0.3 : 0,
  descricaoPosicao: (pos) => pos === 0 ? "não participou" : `${pos}º lugar`,
};

// Busca resultados da Atividade 4 pra uma turma, retorna por aluno:
// Nível de perfil — bonus dinâmico: nivel × 0,1 (ex: nível 5 = +0,5)
export const EXTRA_NIVEL_PERFIL = {
  key: "nivelPerfil",
  label: "Nível de perfil",
  valorPorNivel: 0.1,
  calcular: (nivel) => parseFloat(((nivel || 0) * 0.1).toFixed(1)),
};

export async function buscarNivelPerfil(turma, nome) {
  try {
    const uid = makeUid(turma, nome);
    const snap = await get(ref(db, `perfis/${uid}/nivel`));
    return snap.exists() ? (snap.val() || 1) : 1;
  } catch (e) { return 1; }
}
// A posição reflete onde o aluno está entre TODOS que fizeram a atividade.
export async function buscarAtiv4(turma, alunos) {
  // melhorPts usa "nome|turma" como chave pra evitar conflito de nomes entre turmas
  const melhorPts = {};
  try {
    const q = query(ref(db, "resultados"), orderByChild("atividade"), equalTo(NOME_ATIV4));
    const snap = await get(q);
    if (snap.exists()) {
      snap.forEach(child => {
        const v = child.val();
        if (!v.aluno || !v.turma) return;
        const key = `${v.aluno}|${v.turma}`;
        const pts = v.pontuacao ?? 0;
        if (!(key in melhorPts) || pts > melhorPts[key]) melhorPts[key] = pts;
      });
    }
  } catch (e) { console.error("Falha ao buscar Atividade 4:", e); }

  // Ranking global: ordena todos por pontuação decrescente
  const todos = Object.keys(melhorPts);
  todos.sort((a, b) => (melhorPts[b] || 0) - (melhorPts[a] || 0));

  const resultado = {};
  alunos.forEach(nome => {
    const key = `${nome}|${turma}`;
    const fez = key in melhorPts;
    const posicao = fez ? todos.indexOf(key) + 1 : 0;
    resultado[nome] = { fez, posicao, bonusRank: EXTRA_RANK_ATIV4.bonusPorPosicao(posicao) };
  });
  return resultado;
}
export async function buscarProgressoTabuada(turma, nome) {
  const uid = makeUid(turma, nome);
  let melhorTabuada = 0, melhorNeg = 0, melhorEscalada = 0;
  // bim <=2 usa os nós atuais; bim >=3 usa os paralelos (começam do zero)
  const tPath = (+BIMESTRE <= 2) ? `tabuada_niveis/${uid}`            : `tabuada_niveis_b/${BIMESTRE}/${uid}`;
  const nPath = (+BIMESTRE <= 2) ? `tabuada_negativos_niveis/${uid}`  : `tabuada_negativos_niveis_b/${BIMESTRE}/${uid}`;
  const ePath = (+BIMESTRE <= 2) ? `escalada_niveis/${uid}`           : `escalada_niveis_b/${BIMESTRE}/${uid}`;
  try {
    const s = await get(ref(db, `${tPath}/melhor_nivel`));
    if (s.exists()) melhorTabuada = s.val();
  } catch (e) {}
  try {
    const s = await get(ref(db, `${nPath}/melhor_nivel`));
    if (s.exists()) melhorNeg = s.val();
  } catch (e) {}
  try {
    const s = await get(ref(db, `${ePath}/melhor_nivel`));
    if (s.exists()) melhorEscalada = s.val();
  } catch (e) {}
  return { melhorTabuada, melhorNeg, melhorEscalada };
}

// Nota já lançada pelo professor pra esse aluno neste bimestre (ou null se ainda não lançou)
export async function buscarNotaSalva(turma, nome) {
  try {
    const snap = await get(ref(db, `notas_bimestre/${BIMESTRE}/${turma}/${slugNome(nome)}`));
    return snap.exists() ? snap.val() : null;
  } catch (e) {
    console.error("Falha ao buscar notas salvas:", e);
    return null;
  }
}

// Só marca como ativos os extras que valem no bimestre corrente — assim as
// chaves de outro bimestre nunca entram em somas/contagens que percorrem EXTRAS_AUTO.
export function extrasAutoAtivos(progresso) {
  const cfg = bonusConfig();
  const ativos = {};
  EXTRAS_AUTO.forEach(e => {
    const vale = !!cfg && (cfg.autoExtras === null || cfg.autoExtras.includes(e.key));
    ativos[e.key] = vale && (progresso[e.campo] || 0) >= e.max;
  });
  return ativos;
}
export function calcularBonus(progresso, registro) {
  const cfg = bonusConfig();
  if (!cfg) return 0;
  const auto = extrasAutoAtivos(progresso);
  const bAuto = EXTRAS_AUTO.reduce((s, e) => {
    const incluido = cfg.autoExtras === null || cfg.autoExtras.includes(e.key);
    return s + (incluido && auto[e.key] ? e.valor : 0);
  }, 0);
  const bCadExtra  = (cfg.cadExtra && cadernoExtraAtivo(registro)) ? CADERNO_EXTRA.valor : 0;
  const bBonusCad  = (cfg.bonusCadernoVistos && bonusCadernoVistosAtivo(progresso?.pctCaderno)) ? BONUS_CADERNO_VISTOS.valor : 0;
  const bFixo      = cfg.bonusFixo ? BONUS_FIXO.valor : 0;
  const bRankAtiv4 = cfg.rank ? (progresso?.rankAtiv4Bonus ?? 0) : 0;
  const bNivelPerf = cfg.nivelPerfil ? EXTRA_NIVEL_PERFIL.calcular(progresso?.nivelPerfil ?? 0) : 0;
  const bCadCompl  = (cfg.cadernoCompleto && cadernoCompletoAtivo(progresso?.pctCaderno)) ? CADERNO_COMPLETO.valor : 0;
  const bRevisao   = cfg.revisao ? (progresso?.notaRevisao ?? 0) : 0;
  const bManual    = EXTRAS_MANUAL.reduce((s, e) => s + (registro?.extras?.[e.key] ? e.valor : 0), 0);
  return bAuto + bCadExtra + bBonusCad + bFixo + bRankAtiv4 + bNivelPerf + bCadCompl + bRevisao + bManual;
}
export function calcularSubtotal(registro) {
  return camposAtivos().reduce((s, c) => {
    const v = registro[c.key];
    return s + (v == null ? 0 : (parseFloat(v) || 0));
  }, 0);
}
export function calcularTotal(registro, progresso) {
  const subtotalCapado = Math.min(calcularSubtotal(registro), 10);
  return subtotalCapado + calcularBonus(progresso, registro);
}

// Controle de liberação — o professor decide quando a turma vê as notas
export async function notasLiberadas(turma) {
  try {
    const snap = await get(ref(db, `notas_liberadas/${BIMESTRE}/${turma}`));
    return !!(snap.exists() && snap.val()?.liberado);
  } catch (e) { return false; }
}
export async function definirNotasLiberadas(turma, liberado) {
  await update(ref(db, `notas_liberadas/${BIMESTRE}/${turma}`), { liberado: !!liberado, em: Date.now() });
}

// ── Congelamento do bimestre ─────────────────────────────────
// Guarda uma "foto" dos valores automáticos (que mudam ao vivo) por aluno,
// para o bimestre não recalcular bônus depois de fechado. Reversível.
export async function buscarCongelamento(turma) {
  try {
    const snap = await get(ref(db, `notas_congelado/${BIMESTRE}/${turma}`));
    if (!snap.exists()) return { congelado:false, alunos:{}, em:null };
    const v = snap.val();
    return { congelado:true, alunos:v.alunos || {}, em:v.em || null };
  } catch (e) { return { congelado:false, alunos:{}, em:null }; }
}
export async function congelarBimestre(turma, alunosSnap) {
  await set(ref(db, `notas_congelado/${BIMESTRE}/${turma}`), { em: Date.now(), alunos: alunosSnap });
}
export async function descongelarBimestre(turma) {
  await remove(ref(db, `notas_congelado/${BIMESTRE}/${turma}`));
}

// Busca a melhor nota da fase 1 da Atividade 5 pra um aluno específico (uso na página do aluno)
export async function buscarAtiv5Aluno(turma, nome) {
  let melhor = null;
  try {
    const q = query(ref(db, "resultados"), orderByChild("turma"), equalTo(turma));
    const snap = await get(q);
    if (snap.exists()) {
      snap.forEach(child => {
        const v = child.val();
        if (v.atividade !== NOME_ATIV5 || v.aluno !== nome) return;
        const pts = v.pontos_fase1 ?? v.pontuacao ?? null;
        if (pts != null && (melhor === null || pts > melhor)) melhor = pts;
      });
    }
  } catch (e) { console.error("Falha ao buscar Atividade 5:", e); }
  return melhor; // null = nunca jogou; number = melhor pontos_fase1 (escala 0-10)
}

// Busca a melhor pontuação concluída da Atividade 1 - Equações pra um aluno (uso na página do aluno)
// Escala 0-10 (pontuacao_bruta = proporção de acertos × 10). Ignora testes e registros não concluídos.
export async function buscarEquacoesAluno(turma, nome) {
  let melhor = null;
  try {
    const q = query(ref(db, "resultados"), orderByChild("turma"), equalTo(turma));
    const snap = await get(q);
    if (snap.exists()) {
      snap.forEach(child => {
        const v = child.val();
        if (v.atividade !== NOME_ATIV1_EQ || v.aluno !== nome) return;
        if (v.concluido !== true || v.modo_teste) return;
        const pts = v.pontuacao_bruta ?? v.pontuacao ?? null;
        if (pts != null && (melhor === null || pts > melhor)) melhor = pts;
      });
    }
  } catch (e) { console.error("Falha ao buscar Atividade 1 - Equações:", e); }
  return melhor; // null = nunca fez; number = melhor pontuação (escala 0-10)
}

// ── Caderno automático: proporção de vistos × max (3º bim: × 2; 4º bim: × 5) ──
// Usa a MESMA classificação de projeto da tela de Vistos (biblioteca), pra o
// denominador bater com o que o professor vê. null = nenhum visto aplicado ainda.
export async function buscarCadernoVistos(turma, nome, max = 2) {
  try {
    const [snap, idx] = await Promise.all([
      get(ref(db, `vistos/${turma}/${BIMESTRE}`)),
      carregarBibliotecaMapa(),
    ]);
    if (!snap.exists()) return null;
    const dados   = snap.val() || {};
    const ativs   = Object.entries(dados.atividades || {}).map(([id, a]) => ({ id, ...(a || {}) }));
    const marcas  = dados.marcas || {};
    const naoProj = ativs.filter(a => resolverAula(a, idx).tipo !== "projeto"); // projetos não entram no visto
    const nVistos = naoProj.length;
    if (!nVistos) return null;                                   // nada aplicado → ainda não disponível
    let tot = 0;
    naoProj.forEach(a => {
      const v = (marcas[a.id] || {})[nome] || 0;
      if (v === 1 || v === 4)      tot += 1;                     // ✓ e AT✓ contam integral
      else if (v === 2 || v === 3) tot += 0.5;                  // atraso (½) e FA (½)
    });
    return parseFloat(((tot / nVistos) * max).toFixed(2));
  } catch (e) { console.error("Falha ao calcular Caderno (vistos):", e); return null; }
}

// ── % do Caderno feito (3º bim): mesmas atividades de vistos de
// buscarCadernoVistos acima (exclui "projeto"), mas aqui é CONTAGEM, não
// média: ✓, ½, FA e AT✓ contam como "feito" (peso 1 cada); só F/vazio não
// conta. Usado só pelo Bônus caderno (≥ 90% → +0,5). null = nada aplicado ainda.
export async function buscarPctCaderno(turma, nome) {
  try {
    const [snap, idx] = await Promise.all([
      get(ref(db, `vistos/${turma}/${BIMESTRE}`)),
      carregarBibliotecaMapa(),
    ]);
    if (!snap.exists()) return null;
    const dados   = snap.val() || {};
    const ativs   = Object.entries(dados.atividades || {}).map(([id, a]) => ({ id, ...(a || {}) }));
    const marcas  = dados.marcas || {};
    const naoProj = ativs.filter(a => resolverAula(a, idx).tipo !== "projeto");
    const nVistos = naoProj.length;
    if (!nVistos) return null;
    let feitos = 0;
    naoProj.forEach(a => {
      const v = (marcas[a.id] || {})[nome] || 0;
      if (v === 1 || v === 2 || v === 3 || v === 4) feitos++;   // ✓, ½, FA, AT✓
    });
    return Math.round((feitos / nVistos) * 100);
  } catch (e) { console.error("Falha ao calcular % Caderno:", e); return null; }
}
export function bonusCadernoVistosAtivo(pct) {
  return pct != null && pct >= BONUS_CADERNO_VISTOS.limiarPct;
}
export function cadernoCompletoAtivo(pct) {
  return pct != null && pct >= CADERNO_COMPLETO.limiarPct;
}

// ── Jogo de Revisão (4º bim): nota 0–10 pelas insígnias/douradas ──
// Mesma leitura da Ficha do aluno (modo teste lê do histórico de teste).
// Falha ou nunca jogou → 0.
export async function buscarNotaRevisao(turma, nome) {
  try {
    const uid  = makeUid(turma, nome);
    const base = isModoTeste() ? `modo_teste_historico/${uid}/jogo_revisao` : `jogo_revisao/${uid}`;
    const snap = await get(ref(db, `${base}/insignias`));
    const ins  = snap.exists() ? Object.values(snap.val() || {}).filter(Boolean) : [];
    return notaJogoRevisao(ins.length, ins.filter(i => i.dourada).length);
  } catch (e) { console.error("Falha ao buscar nota do Jogo de Revisão:", e); return 0; }
}

// ── PD - Geometria (3º bim): Geometria com Canudos Parte 1 (0,5) + Parte 2
// (0,5). Casa cada parte pelo arquivo do material (materialRef), igual ao
// gate-resolucao.js. Regra especial SÓ AQUI: FA conta nota integral, igual
// ao ✓ (no resto do sistema — ex. Caderno acima — FA conta meio visto;
// confirmado com a professora que aqui é diferente de propósito).
// null = nenhuma das duas partes foi aplicada ainda (Ainda não disponibilizada).
const ARQUIVOS_PD_GEOMETRIA = ["geometria-canudos-parte1.html", "geometria-canudos-parte2.html"];
export async function buscarPDGeometria(turma, nome) {
  try {
    const snap = await get(ref(db, `vistos/${turma}/${BIMESTRE}`));
    if (!snap.exists()) return null;
    const dados  = snap.val() || {};
    const ativs  = Object.entries(dados.atividades || {}).map(([id, a]) => ({ id, ...(a || {}) }));
    const marcas = dados.marcas || {};
    const arqDe  = ref_ => (ref_ || "").split("/").pop();
    const achadas = ARQUIVOS_PD_GEOMETRIA.map(arq => ativs.find(a => arqDe(a.materialRef) === arq));
    if (!achadas.some(Boolean)) return null;    // nenhuma das duas partes aplicada ainda
    let tot = 0;
    achadas.forEach(a => {
      if (!a) return;
      const v = (marcas[a.id] || {})[nome] || 0;
      if (v === 1 || v === 3 || v === 4) tot += 0.5;   // ✓, FA (regra especial) e AT✓ contam integral
      else if (v === 2)                  tot += 0.25;  // ½ conta metade
    });
    return parseFloat(tot.toFixed(2));
  } catch (e) { console.error("Falha ao calcular PD - Geometria:", e); return null; }
}

// ── Professor Conselheiro (3º bim, base 1,0) / Comportamento (4º bim, base 2,0):
// +0,3 por ocorrência positiva, −0,3 por ocorrência negativa; sempre travado no
// intervalo [0, base]. ──
export async function buscarConselheiro(turma, nome, base = 1) {
  const BASE = base, PASSO = 0.3;
  try {
    const snap = await get(ref(db, `mapeamento_salas/${turma}/anotacoes`));
    if (!snap.exists()) return BASE;
    const bim = BIMESTRES.find(b => String(b.n) === String(BIMESTRE));
    const ini = bim ? new Date(bim.inicio + "T00:00:00").getTime() : -Infinity;
    const fim = bim ? new Date(bim.fim    + "T23:59:59").getTime() :  Infinity;
    let pos = 0, neg = 0;
    snap.forEach(child => {
      const entry = child.val();
      if (!entry || entry.nome !== nome) return;
      (entry.registros || []).forEach(r => {
        const ts = r?.ts;
        if (typeof ts === "number" && (ts < ini || ts > fim)) return;   // fora do bimestre
        const tags = r?.ocorrencias || [];
        if (!tags.length) return;                                        // sem tag = neutra, não conta
        const negativa = tags.some(t => !POSITIVAS_OCORRENCIA.includes(t));
        if (negativa) neg++; else pos++;
      });
    });
    const nota = BASE + PASSO * pos - PASSO * neg;
    return Math.max(0, Math.min(BASE, parseFloat(nota.toFixed(2))));
  } catch (e) { console.error("Falha ao calcular Professor Conselheiro:", e); return BASE; }
}

// ── Atividade 2 - Regra de três (3º bim, auto 0–1,5) ──────────
// Espelha a Atividade 1 (Equações). NOME_ATIV2_RP é o nome real lançado.
export async function buscarRazaoPropAluno(turma, nome) {
  let melhor = null;
  try {
    const q = query(ref(db, "resultados"), orderByChild("turma"), equalTo(turma));
    const snap = await get(q);
    if (snap.exists()) {
      snap.forEach(child => {
        const v = child.val();
        if (v.atividade !== NOME_ATIV2_RP || v.aluno !== nome) return;
        if (v.concluido !== true || v.modo_teste) return;
        const pts = v.pontuacao_bruta ?? v.pontuacao ?? null;
        if (pts != null && (melhor === null || pts > melhor)) melhor = pts;
      });
    }
  } catch (e) { console.error("Falha ao buscar Atividade 2 - Regra de três:", e); }
  return melhor; // 0-10 ou null
}

// ── Total das ATIVIDADES disponibilizadas no bimestre (card da Home) ──
// "Atividades" = as avaliativas por quiz com nota real (Ativ. 1 e Ativ. 2),
// não Caderno/Prova/Conselheiro/PD. O denominador é a soma dos máximos das
// atividades ATIVAS e NÃO pendentes — então cresce sozinho quando você tira
// uma atividade de CAMPOS_PENDENTES. Cada busca devolve 0–10; converte p/ o
// valor real multiplicando por (max/10).
const ATIVIDADES_QUIZ = {
  equacoes:   (t, n) => buscarEquacoesAluno(t, n),
  razaoProp:  (t, n) => buscarRazaoPropAluno(t, n),
};
export async function totalAtividadesAluno(turma, nome) {
  const ativos = new Set(camposAtivos().map(c => c.key));
  const pend   = camposPendentes();
  // só as atividades-quiz que o bimestre usa e que já foram disponibilizadas
  const chaves = CAMPOS_NOTA.filter(c => ATIVIDADES_QUIZ[c.key] && ativos.has(c.key) && !pend.has(c.key));
  if (!chaves.length) return { obtido: 0, maximo: 0, nAtivs: 0, disponivel: false };
  let obtido = 0, maximo = 0;
  await Promise.all(chaves.map(async (c) => {
    maximo += c.max;
    const bruto = await ATIVIDADES_QUIZ[c.key](turma, nome).catch(() => null); // 0–10 ou null
    if (bruto != null) obtido += (bruto / 10) * c.max;
  }));
  return {
    obtido: parseFloat(obtido.toFixed(2)),
    maximo: parseFloat(maximo.toFixed(2)),
    nAtivs: chaves.length,
    disponivel: true,
  };
}

// ── Pontos EXTRAS já conquistados nos JOGOS (card da Home) ──
// Soma os extras automáticos de jogos que o aluno já bateu (tabuada normal,
// negativa e escalada), respeitando o bonusConfig do bimestre. maximo = soma
// dos valores desses extras (3,5 no 3º bim: 5 marcos × 0,5 + Escalada 200 × 1,0;
// 6,0 no 4º bim: Tabuada 2,0 + Negativa 2,0 + Escalada 2,0 — cada um 0,5 + 0,5 + 1,0).
const CHAVES_EXTRAS_JOGOS = [...EXTRAS_JOGOS_ANTIGOS, ...EXTRAS_JOGOS_B4];
export async function extrasJogosAluno(turma, nome) {
  const cfg = bonusConfig();
  const permitido = (k) => cfg && (cfg.autoExtras === null || cfg.autoExtras.includes(k));
  const doJogo = EXTRAS_AUTO.filter(e => CHAVES_EXTRAS_JOGOS.includes(e.key) && permitido(e.key));
  const maximo = doJogo.reduce((s, e) => s + e.valor, 0);
  const progresso = await buscarProgressoTabuada(turma, nome).catch(() => ({}));
  const obtido = doJogo.reduce((s, e) => s + (((progresso[e.campo] || 0) >= e.max) ? e.valor : 0), 0);
  return { obtido: parseFloat(obtido.toFixed(1)), maximo: parseFloat(maximo.toFixed(1)) };
}

// ── Nº de OCORRÊNCIAS do aluno no bimestre (card da Home) ──
// Conta os registros COM tag em mapeamento_salas/{turma}/anotacoes, dentro do
// bimestre atual — mesma fonte usada pelo Professor Conselheiro. Sem tag = nota
// neutra e não conta. Devolve { total, pos, neg }.
export async function contarOcorrenciasAluno(turma, nome) {
  try {
    const snap = await get(ref(db, `mapeamento_salas/${turma}/anotacoes`));
    if (!snap.exists()) return { total: 0, pos: 0, neg: 0 };
    const bim = BIMESTRES.find(b => String(b.n) === String(BIMESTRE));
    const ini = bim ? new Date(bim.inicio + "T00:00:00").getTime() : -Infinity;
    const fim = bim ? new Date(bim.fim    + "T23:59:59").getTime() :  Infinity;
    let pos = 0, neg = 0;
    snap.forEach(child => {
      const entry = child.val();
      if (!entry || entry.nome !== nome) return;
      (entry.registros || []).forEach(r => {
        const ts = r?.ts;
        if (typeof ts === "number" && (ts < ini || ts > fim)) return;
        const tags = r?.ocorrencias || [];
        if (!tags.length) return;
        const negativa = tags.some(t => !POSITIVAS_OCORRENCIA.includes(t));
        if (negativa) neg++; else pos++;
      });
    });
    return { total: pos + neg, pos, neg };
  } catch (e) { console.error("Falha ao contar ocorrências:", e); return { total: 0, pos: 0, neg: 0 }; }
}

// Monta o boletim completo de um aluno — usado em a-notas.html e no card da home.
// Retorna null apenas se as notas ainda não foram disponibilizadas pelo professor.
// Se liberado mas sem nota salva, retorna boletim com dados automáticos + manuais nulos.
export async function montarBoletim(turma, nome, opcoes = {}) {
  if (!opcoes.ignorarLiberacao) {
    const liberado = await notasLiberadas(turma);
    if (!liberado) return null;
  }

  // Busca tudo em paralelo — não bloqueia em caso de nota manual ainda não salva
  const ativos = new Set(camposAtivos().map(c => c.key));
  const pend   = camposPendentes();
  const querer = k => ativos.has(k) && !pend.has(k);   // só busca o que o bimestre usa e não está pendente

  const cfgB = bonusConfig() || {};
  const [salvo, progresso, ativ4Map, ativ5Pts, eqPts, nivelPerfil, cadVistosRaw, conselheiroRaw, razaoPts, pdRaw, pctCadernoRaw, cadB4Raw, comportRaw, notaRevRaw] = await Promise.all([
    buscarNotaSalva(turma, nome),
    buscarProgressoTabuada(turma, nome),
    buscarAtiv4(turma, [nome]),
    buscarAtiv5Aluno(turma, nome),
    buscarEquacoesAluno(turma, nome),
    buscarNivelPerfil(turma, nome),
    querer("cadernoVistos") ? buscarCadernoVistos(turma, nome) : Promise.resolve(null),
    querer("conselheiro")   ? buscarConselheiro(turma, nome)   : Promise.resolve(null),
    querer("razaoProp") && razaoPropEhAuto(turma) ? buscarRazaoPropAluno(turma, nome): Promise.resolve(null),
    querer("pd")            ? buscarPDGeometria(turma, nome)   : Promise.resolve(null),
    (cfgB.bonusCadernoVistos || cfgB.cadernoCompleto) ? buscarPctCaderno(turma, nome) : Promise.resolve(null),
    // 4º bimestre
    querer("cadernoB4")     ? buscarCadernoVistos(turma, nome, 5) : Promise.resolve(null),
    querer("comportamento") ? buscarConselheiro(turma, nome, 2)   : Promise.resolve(null),
    cfgB.revisao            ? buscarNotaRevisao(turma, nome)      : Promise.resolve(null),
  ]);

  const ativ4Info = ativ4Map[nome] || { fez:false, posicao:0, bonusRank:0 };
  progresso.rankAtiv4Bonus = ativ4Info.bonusRank;
  progresso.nivelPerfil    = nivelPerfil;
  progresso.pctCaderno     = pctCadernoRaw;
  progresso.notaRevisao    = notaRevRaw;

  // Ativ.4 e Triângulos: null = não participou/nunca jogou → conta como 0
  let ativ4Val      = ativ4Info.fez ? 0.5 : null;
  let triangulosVal = ativ5Pts != null ? Math.min(1, ativ5Pts / 10) : null;
  // Atividade 1 - Equações: pontuação 0-10 → nota de 0 a 1,5 (null = nunca fez)
  let equacoesVal   = eqPts != null ? Math.min(1.5, (eqPts / 10) * 1.5) : null;
  // 3º bimestre (auto). null = ainda não disponível / não participou.
  let cadernoVal     = cadVistosRaw;
  let conselheiroVal = conselheiroRaw;   // null só quando o campo não é deste bimestre
  let razaoVal       = razaoPropEhAuto(turma)
    ? (razaoPts != null ? Math.min(1.5, (razaoPts / 10) * 1.5) : null)
    : (salvo?.razaoProp ?? null);   // turmas fora da 8E: lançamento manual
  let pdVal          = pdRaw;
  // 4º bimestre (auto)
  let cadB4Val       = cadB4Raw;
  let comportVal     = comportRaw;

  // Se o bimestre está congelado, usa a FOTO (não os valores ao vivo)
  const cong = await buscarCongelamento(turma);
  const foto = cong.congelado ? (cong.alunos[slugNome(nome)] || null) : null;
  if (foto) {
    progresso.melhorTabuada  = foto.melhorTabuada  ?? progresso.melhorTabuada;
    progresso.melhorNeg      = foto.melhorNeg      ?? progresso.melhorNeg;
    progresso.nivelPerfil    = foto.nivelPerfil    ?? progresso.nivelPerfil;
    progresso.rankAtiv4Bonus = foto.rankAtiv4Bonus ?? progresso.rankAtiv4Bonus;
    if (foto.ativ4 !== undefined)      ativ4Val      = foto.ativ4;
    if (foto.triangulos !== undefined) triangulosVal = foto.triangulos;
    if (foto.equacoes !== undefined)   equacoesVal   = foto.equacoes;
    progresso.melhorEscalada = foto.melhorEscalada ?? progresso.melhorEscalada;
    if (foto.cadernoVistos !== undefined) cadernoVal     = foto.cadernoVistos;
    if (foto.conselheiro   !== undefined) conselheiroVal = foto.conselheiro;
    if (foto.razaoProp     !== undefined) razaoVal       = foto.razaoProp;
    if (foto.pd            !== undefined) pdVal          = foto.pd;
    if (foto.pctCaderno    !== undefined) progresso.pctCaderno = foto.pctCaderno;
    if (foto.cadernoB4     !== undefined) cadB4Val       = foto.cadernoB4;
    if (foto.comportamento !== undefined) comportVal     = foto.comportamento;
    if (foto.notaRevisao   !== undefined) progresso.notaRevisao = foto.notaRevisao;
  }

  // Campos diferidos: só liberados ao aluno quando o bimestre está congelado.
  // O Bônus caderno segue a mesma trava do cadernoVistos (mesma fonte de dados).
  if (!cong.congelado) {
    const dif = camposDiferidos();
    if (dif.has("cadernoVistos")) { cadernoVal = null; progresso.pctCaderno = null; }
    if (dif.has("conselheiro"))   conselheiroVal = null;
    if (dif.has("cadernoB4"))     { cadB4Val = null; progresso.pctCaderno = null; }  // Caderno completo usa a mesma fonte
    if (dif.has("comportamento")) comportVal = null;
  }

  const registro = {
    provaMulti: salvo?.provaMulti ?? null,
    projeto:    salvo?.projeto    ?? null,
    caderno:    salvo?.caderno    ?? null,
    equacoes:   equacoesVal,
    ativ4:      ativ4Val,
    triangulos: triangulosVal,
    participacao: salvo?.participacao ?? 0.5,  // default 0.5 = todo mundo participou
    // 3º bimestre
    cadernoVistos: cadernoVal,
    razaoProp:     razaoVal,
    conselheiro:   conselheiroVal,
    pd:            pdVal,
    // 4º bimestre
    cadernoB4:     cadB4Val,
    comportamento: comportVal,
    consciencia:   salvo?.consciencia ?? null,
    extras:     salvo?.extras || {},
  };

  // lancados: campos manuais com valor já lançado pelo professor
  const lancados = {
    provaMulti: salvo?.provaMulti != null,
    projeto:    salvo?.projeto    != null,
    caderno:    salvo?.caderno    != null,
    participacao: true, // sempre lançada (default 0.5)
    razaoProp:  salvo?.razaoProp  != null,   // só importa nas turmas fora da 8E (manual)
    consciencia: salvo?.consciencia != null,
  };

  const subtotal       = calcularSubtotal(registro);
  const subtotalCapado = Math.min(subtotal, 10);
  const bonus           = calcularBonus(progresso, registro);
  const total           = subtotalCapado + bonus;
  const auto             = extrasAutoAtivos(progresso);
  const cadExtraAtivo    = cadernoExtraAtivo(registro);

  return { registro, lancados, progresso, subtotal, subtotalCapado, bonus, total,
           auto, cadExtraAtivo, ativ4Info, ativ5Pts, nivelPerfil, congelado: cong.congelado,
           atualizadoEm: salvo?.atualizadoEm || null };
}

export function mensagemPorNota(total) {
  if (total >= 8) return "🎉 Excelente! Continue assim.";
  if (total >= 6) return "👏 Bom resultado nesse bimestre.";
  if (total >= 4) return "💪 Quase lá — dá pra melhorar no próximo.";
  return "📚 Vamos reforçar o estudo nas próximas atividades.";
}

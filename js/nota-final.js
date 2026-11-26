// ── Cálculo do Total de cada bimestre e da Nota final (PROMPT-271) ──
// Saiu de professor/p-notas.html sem mudar a conta: a página de notas e o painel do dashboard
// usam este mesmo código, então não existem duas fórmulas para o mesmo total.
//
// O estado fica num "contexto" (ctx) em vez de variáveis soltas da página:
//   ctx.dados[`${turma}|${bimestre}`][aluno] = registro de notas
//   ctx.autoDados[turma][aluno]               = progresso dos automáticos (tabuada, perfil, ranking…)
// A página de notas tem o dela; o painel cria outro, separado.
//
// ⚠️ BIMESTRE (em notas.js) é global e várias funções o leem. Quem chama garante que ele não muda
// enquanto um bimestre carrega: a página trava os seletores; o painel calcula todas as turmas de um
// bimestre juntas e só depois passa para o outro.
import { ALUNOS_POR_TURMA } from "/js/constants.js";
import { db } from "/js/firebase-config.js";
import { ref, get, set, remove, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { carregarBibliotecaMapa } from "/js/biblioteca.js";
import {
  BIMESTRE, setBimestre, EXTRAS_AUTO, EXTRAS_MANUAL, CADERNO_EXTRA, BONUS_CADERNO_VISTOS, BONUS_FIXO,
  CADERNO_COMPLETO, cadernoCompletoAtivo, buscarNotaRevisao, bonusFixoAtivo,
  EXTRA_NIVEL_PERFIL, NOME_ATIV5, NOME_ATIV1_EQ, NOME_ATIV2_RP, slugNome as slug,
  buscarProgressoTabuada, buscarNivelPerfil, bonusCadernoVistosAtivo,
  lerAtiv4Query, ativ4DeSnap, cadernoVistosDeSnap, pctCadernoDeSnap, pdGeometriaDeSnap, conselheiroDeSnap, faltasDeSnaps,
  extrasAutoAtivos as extrasAtivosDoProgresso, cadernoExtraAtivo,
  notasLiberadas, buscarCongelamento, camposAtivos, bonusConfig, razaoPropEhAuto,
} from "/js/notas.js";

export const criarContexto = () => ({ dados: {}, autoDados: {} });
export const chaveTurma = (t, b = BIMESTRE) => `${t}|${b}`;

export function turmaVazia(turma) {
  const obj = {};
  (ALUNOS_POR_TURMA[turma] || []).forEach(nome => {
    obj[nome] = {
      provaMulti:"", projeto:"", caderno:"", equacoes:"", ativ4:"", triangulos:"", participacao:0.5,
      cadernoVistos:null, razaoProp:null, conselheiro:null, pd:null,
      cadernoB4:null, comportamento:null, consciencia:"",
      ativ4Auto:false, triangulosAuto:false, equacoesAuto:false,
      extras: {}
    };
  });
  return obj;
}

export function calcularBonus(ctx, turma, nome, registro) {
  const cfg = bonusConfig();
  if (!cfg) return 0;
  const a = ctx.autoDados[turma]?.[nome] || { melhorTabuada:0, melhorNeg:0, rankAtiv4Bonus:0, nivelPerfil:0 };
  const auto = extrasAtivosDoProgresso(a);
  const bAuto = EXTRAS_AUTO.reduce((s,e) => {
    const incluido = cfg.autoExtras === null || cfg.autoExtras.includes(e.key);
    return s + (incluido && auto[e.key] ? e.valor : 0);
  }, 0);
  const bCadExtra    = (cfg.cadExtra && cadernoExtraAtivo(registro)) ? CADERNO_EXTRA.valor : 0;
  const bBonusCad    = (cfg.bonusCadernoVistos && bonusCadernoVistosAtivo(a.pctCaderno)) ? BONUS_CADERNO_VISTOS.valor : 0;
  const bFixo        = bonusFixoAtivo(a, cfg) ? BONUS_FIXO.valor : 0;   // 4º bim: só com faltas ≤ 50%
  const bRankAtiv4   = cfg.rank ? (a.rankAtiv4Bonus ?? 0) : 0;
  const bNivelPerfil = cfg.nivelPerfil ? ((a.nivelPerfil || 0) * EXTRA_NIVEL_PERFIL.valorPorNivel) : 0;
  const bCadCompl    = (cfg.cadernoCompleto && cadernoCompletoAtivo(a.pctCaderno)) ? CADERNO_COMPLETO.valor : 0;
  const bRevisao     = cfg.revisao ? (a.notaRevisao ?? 0) : 0;
  const bManual      = EXTRAS_MANUAL.reduce((s,e) => s + (registro.extras[e.key] ? e.valor : 0), 0);
  return bAuto + bCadExtra + bBonusCad + bFixo + bRankAtiv4 + bNivelPerfil + bCadCompl + bRevisao + bManual;
}

export function calcularTotal(ctx, turma, nome, registro) {
  const base = camposAtivos().reduce((s,c) => s + (parseFloat(registro[c.key]) || 0), 0);
  const baseCapada = Math.min(base, 10);
  return baseCapada + calcularBonus(ctx, turma, nome, registro);
}
export function classeTotal(total) {
  if (total >= 6) return "bom";
  if (total >= 4) return "medio";
  return "baixo";
}

// ── PROMPT-283: leituras compartilhadas ──
// Os nós da turma (resultados, vistos, anotações, chamada, atestados) e a query da Atividade 4 são lidos UMA vez
// por carga e guardados no ctx por alguns segundos (o 3º e o 4º bim e a aba Nota final reaproveitam).
// Falha na leitura → null (cada conta abaixo devolve o mesmo padrão de antes: null, base ou {}).
const CACHE_MS = 15000;
function lerCache(ctx, chave, ler) {
  const c = ctx._cache || (ctx._cache = {});
  const e = c[chave];
  if (e && Date.now() - e.t < CACHE_MS) return e.p;
  const p = ler().catch(err => { console.error(`Falha ao ler ${chave}:`, err); if (c[chave]?.p === p) delete c[chave]; return null; });
  c[chave] = { t: Date.now(), p };
  return p;
}
const lerNo = (ctx, caminho) => lerCache(ctx, caminho, () => get(ref(db, caminho)));
const lerResultadosTurma = (ctx, turma) => lerCache(ctx, `resultados?turma=${turma}`, () => get(query(ref(db, "resultados"), orderByChild("turma"), equalTo(turma))));
const lerAtiv4 = (ctx) => lerCache(ctx, "resultados?ativ4", () => get(lerAtiv4Query()));

// ── Progresso de tabuada (150/300), tabuada negativa (50), escalada e nível de perfil — por aluno (só os nomes pedidos) ──
async function carregarAutoTabuada(ctx, turma, nomes) {
  ctx.autoDados[turma] = ctx.autoDados[turma] || {};
  await Promise.all(nomes.map(async nome => {
    const [prog, nivelPerfil] = await Promise.all([
      buscarProgressoTabuada(turma, nome),
      buscarNivelPerfil(turma, nome)
    ]);
    ctx.autoDados[turma][nome] = { ...prog, nivelPerfil };
  }));
}

// ── Uma query resultados por turma, repartida entre as três colunas automáticas ──
// Área (Atividade 5): nota da fase 1 em escala 0–10 (confirmado em 30/06), aplicada ao máx de 1 ponto da coluna.
// Equações (Atividade 1) e Regra de três (Atividade 2): melhor pontuação concluída (pontuacao_bruta 0–10 → máx 1,5), sem testes.
function resultadosPorColuna(snap) {
  const area = {}, eq = {}, rp = {};
  const melhor = (porAluno, v, bruto) => {
    if (bruto == null) return;
    if (!(v.aluno in porAluno) || bruto > porAluno[v.aluno]) porAluno[v.aluno] = bruto;
  };
  try {
    if (snap && snap.exists()) {
      snap.forEach(child => {
        const v = child.val();
        if (!v.aluno) return;
        if (v.atividade === NOME_ATIV5) melhor(area, v, v.pontos_fase1 ?? v.pontuacao ?? null);
        if (v.concluido !== true || v.modo_teste) return;
        if (v.atividade === NOME_ATIV1_EQ) melhor(eq, v, v.pontuacao_bruta ?? v.pontuacao ?? null);
        if (v.atividade === NOME_ATIV2_RP) melhor(rp, v, v.pontuacao_bruta ?? v.pontuacao ?? null);
      });
    }
  } catch (e) { console.error("Falha ao repartir os resultados da turma:", e); }
  return { area, eq, rp };
}

// ── 3º bim: Caderno (proporção de vistos × 2), Professor Conselheiro (ocorrências) e PD - Geometria (Canudos Parte 1+2) ──
// ── 4º bim: Caderno (vistos × 5), Comportamento (base 2,0), nota do Jogo de Revisão e faltas (ponto extra) ──
// Só busca o que o bimestre usa (camposAtivos / bonusConfig) e, com o bimestre fechado, só o que a foto não cobre.
// nomes: os alunos calculados (a turma toda ou só um, na tela do aluno). cong: o congelamento já lido.
async function carregarAutoCadernoConselheiro(ctx, turma, nomes, cong) {
  const ativos = new Set(camposAtivos().map(c => c.key));
  const cfg = bonusConfig() || {};
  const foto = nome => (cong.congelado ? cong.alunos[slug(nome)] : null);
  // o campo precisa ser calculado ao vivo para este aluno? (a foto sobrescreve quando tem o campo; pctCaderno vem sempre da foto)
  const vivo = (nome, campo) => { const f = foto(nome); return !f || (campo !== "pctCaderno" && f[campo] === undefined); };
  const algum = campo => nomes.some(n => vivo(n, campo));
  const quer = {
    caderno:       ativos.has("cadernoVistos") && algum("cadernoVistos"),
    pd:            ativos.has("pd") && algum("pd"),
    pctCaderno:    !!(cfg.bonusCadernoVistos || cfg.cadernoCompleto) && algum("pctCaderno"),
    cadernoB4:     ativos.has("cadernoB4") && algum("cadernoB4"),
    conselheiro:   ativos.has("conselheiro") && algum("conselheiro"),
    comportamento: ativos.has("comportamento") && algum("comportamento"),
    faltas:        !!(cfg.bonusFixo && cfg.bonusFixoMaxFaltasPct != null) && algum("baseAulas"),
  };
  const querVistos = quer.caderno || quer.pd || quer.pctCaderno || quer.cadernoB4;
  const querAnot   = quer.conselheiro || quer.comportamento;
  const nada = Promise.resolve(null);
  const [sVistos, idx, sAnot, sCham, sAtest, revisao] = await Promise.all([
    querVistos ? lerNo(ctx, `vistos/${turma}/${BIMESTRE}`) : nada,
    (quer.caderno || quer.pctCaderno || quer.cadernoB4) ? carregarBibliotecaMapa() : nada,
    querAnot ? lerNo(ctx, `mapeamento_salas/${turma}/anotacoes`) : nada,
    quer.faltas ? lerNo(ctx, `chamada/${turma}/${BIMESTRE}`) : nada,
    quer.faltas ? lerNo(ctx, `atestados/${turma}`) : nada,
    // Jogo de Revisão: nó de cada aluno — só dos nomes pedidos e só de quem a foto não cobre
    cfg.revisao ? Promise.all(nomes.map(n => (vivo(n, "notaRevisao") ? buscarNotaRevisao(turma, n) : null))) : nada,
  ]);
  const faltas = quer.faltas ? faltasDeSnaps(sCham, sAtest, turma, nomes) : null;
  const out = {};
  nomes.forEach((nome, k) => {
    out[nome] = {
      caderno:       quer.caderno       ? cadernoVistosDeSnap(sVistos, idx, nome) : null,
      conselheiro:   quer.conselheiro   ? conselheiroDeSnap(sAnot, nome)          : null,
      pd:            quer.pd            ? pdGeometriaDeSnap(sVistos, nome)        : null,
      pctCaderno:    quer.pctCaderno    ? pctCadernoDeSnap(sVistos, idx, nome)    : null,
      cadernoB4:     quer.cadernoB4     ? cadernoVistosDeSnap(sVistos, idx, nome, 5) : null,
      comportamento: quer.comportamento ? conselheiroDeSnap(sAnot, nome, 2)       : null,
      notaRevisao:   revisao ? revisao[k] : null,
    };
    if (faltas) { const f = faltas[nome] || { faltas: 0, base: 0, pct: null }; Object.assign(out[nome], { faltasAulas: f.faltas, baseAulas: f.base, pctFaltas: f.pct }); }
  });
  return out;
}

// ── Busca notas já lançadas neste bimestre (carregadas uma vez por turma) ──
async function carregarNotasSalvas(ctx, turma, chave) {
  try {
    const snap = await get(ref(db, `notas_bimestre/${BIMESTRE}/${turma}`));
    if (!snap.exists()) return;
    (ALUNOS_POR_TURMA[turma] || []).forEach(nome => {
      const v = snap.child(slug(nome)).val();
      if (!v) return;
      const r = ctx.dados[chave][nome];
      // null = ainda não lançado → campo fica vazio; número = nota real (mesmo 0)
      const fromNota = val => (val === null || val === undefined) ? "" : val;
      Object.assign(r, {
        provaMulti: fromNota(v.provaMulti),
        projeto:    fromNota(v.projeto),
        caderno:    fromNota(v.caderno),
        equacoes:   v.equacoes ?? "", equacoesAuto: !!v.equacoesAuto,
        ativ4: v.ativ4 ?? "", ativ4Auto: !!v.ativ4Auto,
        participacao: v.participacao ?? v.lista ?? 0.5, // fallback lista (dados antigos), default 0.5
        triangulos: v.triangulos ?? v.area ?? "", triangulosAuto: !!v.triangulosAuto ?? !!v.areaAuto,
        razaoProp: fromNota(v.razaoProp),   // só usado nas turmas fora da 8E (manual)
        consciencia: fromNota(v.consciencia),   // 4º bim (manual)
      });
      r.extras = {};
    });
  } catch (e) { console.error("Falha ao carregar notas salvas:", e); }
}

// Carrega o bimestre BIMESTRE da turma em ctx.dados/ctx.autoDados, sem desenhar nada
// (primeiraVez: também lê as notas já lançadas). Devolve { liberada, congelado }.
// soNomes (PROMPT-283, tela do aluno): os dados de cada aluno (tabuada, perfil, revisão) só desses nomes;
// os nós da turma são lidos uma vez do mesmo jeito.
export async function carregarDadosBimestre(ctx, turma, primeiraVez, { soNomes = null, cong: congLido = null } = {}) {
  const chave = chaveTurma(turma);   // fixa o bimestre do começo ao fim da carga
  if (!ctx.dados[chave]) ctx.dados[chave] = turmaVazia(turma);
  if (!ctx.autoDados[turma]) ctx.autoDados[turma] = {};
  const autoDados = ctx.autoDados, dados = ctx.dados;
  const alunos = ALUNOS_POR_TURMA[turma] || [];
  const nomes = soNomes ? alunos.filter(n => soNomes.includes(n)) : alunos;
  const temAutoNovos = camposAtivos().some(c => ["cadernoVistos", "conselheiro", "pd", "cadernoB4", "comportamento"].includes(c.key));
  // o que sempre entra começa já; o resto depende da foto do bimestre fechado
  const pResultados = lerResultadosTurma(ctx, turma), pAtiv4 = lerAtiv4(ctx), pLiberada = notasLiberadas(turma);
  const pSalvas = primeiraVez ? carregarNotasSalvas(ctx, turma, chave) : null;
  const cong = congLido || await buscarCongelamento(turma);
  // tabuada/perfil: a foto cobre os quatro valores de quem está nela → só busca quem não tem foto
  const semFoto = cong.congelado ? nomes.filter(n => !cong.alunos[slug(n)]) : nomes;
  nomes.forEach(n => { if (!semFoto.includes(n)) autoDados[turma][n] = {}; });
  const [, snapRes, snapAtiv4, liberada, ccPorAluno] = await Promise.all([
    carregarAutoTabuada(ctx, turma, semFoto), pResultados, pAtiv4, pLiberada,
    temAutoNovos ? carregarAutoCadernoConselheiro(ctx, turma, nomes, cong) : Promise.resolve({}),
    pSalvas,
  ]);
  const { area: areaPorAluno, eq: eqPorAluno, rp: rpPorAluno } = resultadosPorColuna(snapRes);
  const ativ4Map = ativ4DeSnap(snapAtiv4, turma, alunos);

  alunos.forEach(nome => {
    const a4 = ativ4Map[nome] || { fez:false, posicao:0, bonusRank:0 };
    autoDados[turma][nome] = autoDados[turma][nome] || {};
    autoDados[turma][nome].rankAtiv4Posicao = a4.posicao;
    autoDados[turma][nome].rankAtiv4Bonus   = a4.bonusRank;

    const r = dados[chave][nome];

    // Ativ.4 — 0,5 se participou, null se não fez (não conta como zero)
    r.ativ4     = a4.fez ? 0.5 : null;
    r.ativ4Auto = true;

    // Triângulos — preenche se jogou (null = nunca jogou, não conta como zero)
    if (areaPorAluno[nome] != null) {
      r.triangulos     = Math.min(1, areaPorAluno[nome] / 10);
      r.triangulosAuto = true;
    } else if (!r.triangulos) {
      r.triangulos = null;
    }

    // Atividade 1 - Equações — auto: pontuação 0–10 → nota de 0 a 1,5 (null = nunca fez)
    if (eqPorAluno[nome] != null) {
      r.equacoes     = Math.min(1.5, (eqPorAluno[nome] / 10) * 1.5);
      r.equacoesAuto = true;
    } else if (!r.equacoes) {
      r.equacoes = null;
    }

    // Atividade 2 - Regra de três — só 8E é automática (pontuação 0–10 → nota 0–1,5).
    // Nas demais turmas é manual: não sobrescreve o que carregarNotasSalvas já pôs em r.razaoProp.
    if (razaoPropEhAuto(turma)) {
      r.razaoProp = rpPorAluno[nome] != null ? Math.min(1.5, (rpPorAluno[nome] / 10) * 1.5) : null;
    }

    // 3º bim — Caderno (proporção de vistos × 2) e Professor Conselheiro (1,0 − 0,3/ocorrência)
    const cc = ccPorAluno[nome] || {};
    r.cadernoVistos = cc.caderno ?? null;      // null = nenhum visto aplicado ainda
    r.conselheiro   = cc.conselheiro ?? null;  // null só quando o campo não é deste bimestre
    r.pd            = cc.pd ?? null;           // null = nenhuma das duas partes de Geometria aplicada ainda
    autoDados[turma][nome].pctCaderno = cc.pctCaderno ?? null;   // % de vistos feitos (Bônus caderno / Caderno completo)
    // 4º bim — Caderno (vistos × 5), Comportamento (2,0 ± 0,3/ocorrência) e nota do Jogo de Revisão (0–10)
    r.cadernoB4     = cc.cadernoB4 ?? null;
    r.comportamento = cc.comportamento ?? null;
    autoDados[turma][nome].notaRevisao = cc.notaRevisao ?? null;
    // 4º bim — faltas para o ponto extra (só quando o bimestre tem limite de faltas)
    if (cc.baseAulas !== undefined) Object.assign(autoDados[turma][nome], { faltasAulas: cc.faltasAulas, baseAulas: cc.baseAulas, pctFaltas: cc.pctFaltas });
  });

  // Se congelado, sobrepõe os automáticos pela foto (trava o bônus)
  if (cong.congelado) {
    alunos.forEach(nome => {
      const f = cong.alunos[slug(nome)]; if (!f) return;
      const ad = autoDados[turma][nome] = autoDados[turma][nome] || {};
      ad.melhorTabuada  = f.melhorTabuada  ?? 0;
      ad.melhorNeg      = f.melhorNeg      ?? 0;
      ad.melhorEscalada = f.melhorEscalada ?? 0;
      ad.nivelPerfil    = f.nivelPerfil    ?? 0;
      ad.rankAtiv4Bonus = f.rankAtiv4Bonus ?? 0;
      ad.pctCaderno     = f.pctCaderno     ?? null;
      if (f.notaRevisao !== undefined)   ad.notaRevisao  = f.notaRevisao;
      if (f.baseAulas !== undefined)     Object.assign(ad, { faltasAulas: f.faltasAulas ?? 0, baseAulas: f.baseAulas, pctFaltas: f.pctFaltas ?? null });
      const r = dados[chave][nome];
      if (f.ativ4 !== undefined)         r.ativ4         = f.ativ4;
      if (f.triangulos !== undefined)    r.triangulos    = f.triangulos;
      if (f.equacoes !== undefined)      r.equacoes      = f.equacoes;
      if (f.cadernoVistos !== undefined) r.cadernoVistos = f.cadernoVistos;
      if (f.conselheiro !== undefined)   r.conselheiro   = f.conselheiro;
      if (f.razaoProp !== undefined)     r.razaoProp     = f.razaoProp;
      if (f.pd !== undefined)            r.pd            = f.pd;
      if (f.cadernoB4 !== undefined)     r.cadernoB4     = f.cadernoB4;
      if (f.comportamento !== undefined) r.comportamento = f.comportamento;
    });
  }

  return { liberada, congelado: !!cong.congelado };
}

// ═══ 📊 Nota final (PROMPT-269): 1º e 2º do diário (dados/notas-anteriores.json), 3º e 4º = o Total acima ═══
let notasAnteriores = null;
export async function carregarNotasAnteriores() {
  if (notasAnteriores) return notasAnteriores;
  try {
    const r = await fetch("/dados/notas-anteriores.json", { cache: "no-cache" });
    notasAnteriores = r.ok ? await r.json() : {};
  } catch (e) { console.error("Falha ao ler notas-anteriores.json:", e); notasAnteriores = {}; }
  return notasAnteriores;
}
// notas em centésimos inteiros: até 2 casas, sem arredondar (o 1e-6 corrige 5,35 × 100 = 534,999…)
export const centesimos = v => (v == null || v === "" || !isFinite(+v)) ? null : Math.floor(+v * 100 + 1e-6);
export const fmtCent = c => c == null ? "—" : (c / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
export const BIMESTRES_CALCULADOS = ["3", "4"];   // os que vêm da página (1º e 2º vêm do diário)
export const alunosDaNotaFinal = (ant, turma) => {
  const fora = new Set(ant?._excluir?.[turma] || []);   // contas de teste
  return (ALUNOS_POR_TURMA[turma] || []).filter(n => !fora.has(n));
};

// ── PROMPT-283: total do bimestre fechado guardado em notas_total/{bim}/{turma} = { [slug]: centésimos, _em } ──
// Quem grava: p-notas.html (ao congelar, ao abrir a turma congelada e depois de salvar nota manual, só se algum total
// mudou) e a carga inicial aqui em totaisDoBimestre. Ao descongelar, apagarTotaisGuardados. Falha → segue calculando.
export async function lerTotaisGuardados(turma, b = BIMESTRE) {
  try {
    const snap = await get(ref(db, `notas_total/${b}/${turma}`));
    return snap.exists() ? (snap.val() || null) : null;
  } catch (e) { console.warn(`notas_total/${b}/${turma}:`, e?.message || e); return null; }
}
// os totais (centésimos, por slug) do bimestre BIMESTRE já carregado no ctx — síncrono: calcularTotal usa o BIMESTRE global
export function totaisEmCentesimos(ctx, turma) {
  const reg = ctx.dados[chaveTurma(turma)] || {}, out = {};
  (ALUNOS_POR_TURMA[turma] || []).forEach(nome => { if (reg[nome]) out[slug(nome)] = centesimos(calcularTotal(ctx, turma, nome, reg[nome])); });
  return out;
}
// grava só se algum total mudou (guardado: o que já está no banco; undefined = lê agora). Devolve true se gravou.
export async function gravarTotaisSeMudou(turma, b, novo, guardado) {
  try {
    if (guardado === undefined) guardado = await lerTotaisGuardados(turma, b);
    const antigos = Object.keys(guardado || {}).filter(k => k !== "_em");
    const igual = guardado && antigos.length === Object.keys(novo).length && Object.entries(novo).every(([k, v]) => guardado[k] === v);
    if (igual) return false;
    await set(ref(db, `notas_total/${b}/${turma}`), { ...novo, _em: Date.now() });
    return true;
  } catch (e) { console.warn(`Não gravou notas_total/${b}/${turma}:`, e?.message || e); return false; }
}
export async function apagarTotaisGuardados(turma, b = BIMESTRE) {
  try { await remove(ref(db, `notas_total/${b}/${turma}`)); }
  catch (e) { console.warn(`Não apagou notas_total/${b}/${turma}:`, e?.message || e); }
}

// Total de cada aluno da turma no bimestre b (troca o BIMESTRE para b: quem chama devolve depois)
// Bimestre fechado com o total guardado de todos → usa direto; senão calcula e, se fechado, grava (carga inicial).
// soNomes (tela do aluno): só esses alunos, sem gravar nada.
export async function totaisDoBimestre(ctx, turma, b, { soNomes = null } = {}) {
  setBimestre(b);
  const nomes = soNomes || ALUNOS_POR_TURMA[turma] || [];
  const [cong, guardado] = await Promise.all([buscarCongelamento(turma), lerTotaisGuardados(turma, b)]);
  if (cong.congelado && guardado && nomes.every(n => typeof guardado[slug(n)] === "number")) {
    return { totais: Object.fromEntries(nomes.map(n => [n, guardado[slug(n)] / 100])), congelado: true, guardado: true };
  }
  setBimestre(b);   // outra carga pode ter trocado durante a leitura
  const { congelado } = await carregarDadosBimestre(ctx, turma, !ctx.dados[chaveTurma(turma, b)], { soNomes, cong });
  setBimestre(b);
  const totais = {};
  nomes.forEach(nome => { totais[nome] = calcularTotal(ctx, turma, nome, ctx.dados[chaveTurma(turma, b)][nome]); });
  if (congelado && !soNomes) await gravarTotaisSeMudou(turma, b, totaisEmCentesimos(ctx, turma), guardado);
  return { totais, congelado };
}

// As linhas da Nota final: [{ i, nome, notas:[b1,b2,b3,b4] (centésimos ou null), soma, faltam }] + parciais { "3": bool, "4": bool }
// incluirExtraFinal (só nas telas do professor): soma o extraFinal do aluno em dados/notas-anteriores.json na Soma
// (as notas dos bimestres não mudam; sem nenhuma nota, a Soma continua null). Padrão false: a tela do aluno nunca vê.
export function montarNotaFinal(ant, turma, porBim, { incluirExtraFinal = false } = {}) {
  const parciais = Object.fromEntries(BIMESTRES_CALCULADOS.map(b => [b, !porBim[b]?.congelado]));
  const linhas = alunosDaNotaFinal(ant, turma).map((nome, i) => {
    const a = ant?.[turma]?.[nome] || {};
    const notas = [centesimos(a.b1), centesimos(a.b2), ...BIMESTRES_CALCULADOS.map(b => centesimos(porBim[b]?.totais?.[nome]))];
    const tem = notas.filter(c => c != null);
    let soma = tem.length ? tem.reduce((s, c) => s + c, 0) : null;
    if (incluirExtraFinal && soma != null) soma += centesimos(a.extraFinal) ?? 0;
    return { i, nome, notas, soma, faltam: notas.length - tem.length };
  });
  return { linhas, parciais };
}

// A Nota final de uma turma (o BIMESTRE volta ao que era no fim)
export async function calcularNotaFinalTurma(ctx, turma, opts = {}) {
  const antes = BIMESTRE, ant = await carregarNotasAnteriores(), porBim = {};
  try {
    for (const b of BIMESTRES_CALCULADOS) porBim[b] = await totaisDoBimestre(ctx, turma, b);
  } finally { setBimestre(antes); }
  return montarNotaFinal(ant, turma, porBim, opts);
}

// PROMPT-283 — a linha de UM aluno (tela do aluno), igual à dele no cálculo da turma, sem o extraFinal:
// 1º e 2º do diário; 3º/4º: o total guardado se o bimestre está fechado, senão só a conta deste aluno
// (os nós da turma são lidos uma vez; tabuada, perfil e revisão só dele). Devolve { linha, parciais }.
export async function calcularNotaFinalAluno(turma, nome) {
  const antes = BIMESTRE, ant = await carregarNotasAnteriores(), porBim = {}, ctx = criarContexto();
  try {
    for (const b of BIMESTRES_CALCULADOS) porBim[b] = await totaisDoBimestre(ctx, turma, b, { soNomes: [nome] });
  } finally { setBimestre(antes); }
  const { linhas, parciais } = montarNotaFinal(ant, turma, porBim);
  return { linha: linhas.find(l => l.nome === nome) || null, parciais };
}

// Várias turmas: todas as turmas de um bimestre em paralelo, depois o outro (o BIMESTRE é global).
// aoTerminar(turma, resultado | null, erro | null) é chamado quando cada turma fica pronta.
export async function calcularNotaFinalTurmas(turmas, aoTerminar, opts = {}) {
  const antes = BIMESTRE, ant = await carregarNotasAnteriores(), ctx = criarContexto();
  const porTurma = Object.fromEntries(turmas.map(t => [t, {}])), erro = {};
  try {
    for (const b of BIMESTRES_CALCULADOS) {
      const ultimo = b === BIMESTRES_CALCULADOS.at(-1);
      setBimestre(b);
      await Promise.all(turmas.filter(t => !erro[t]).map(async t => {
        try { porTurma[t][b] = await totaisDoBimestre(ctx, t, b); }
        catch (e) { erro[t] = e; console.error(`Nota final: falha na turma ${t} (${b}º bim):`, e); aoTerminar(t, null, e); return; }
        if (ultimo) aoTerminar(t, montarNotaFinal(ant, t, porTurma[t], opts), null);
      }));
    }
  } finally { setBimestre(antes); }
}

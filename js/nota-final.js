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
import { ref, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  BIMESTRE, setBimestre, EXTRAS_AUTO, EXTRAS_MANUAL, CADERNO_EXTRA, BONUS_CADERNO_VISTOS, BONUS_FIXO,
  CADERNO_COMPLETO, cadernoCompletoAtivo, buscarNotaRevisao, buscarFaltasTurma, bonusFixoAtivo,
  EXTRA_NIVEL_PERFIL, NOME_ATIV5, NOME_ATIV1_EQ, NOME_ATIV2_RP, slugNome as slug,
  buscarProgressoTabuada, buscarAtiv4, buscarNivelPerfil,
  buscarCadernoVistos, buscarConselheiro, buscarPDGeometria, buscarPctCaderno, bonusCadernoVistosAtivo,
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

// ── Busca no banco: progresso de tabuada (150/300) e tabuada negativa (50) ──
async function carregarAutoTabuada(ctx, turma) {
  const alunos = ALUNOS_POR_TURMA[turma] || [];
  ctx.autoDados[turma] = ctx.autoDados[turma] || {};
  await Promise.all(alunos.map(async nome => {
    const [prog, nivelPerfil] = await Promise.all([
      buscarProgressoTabuada(turma, nome),
      buscarNivelPerfil(turma, nome)
    ]);
    ctx.autoDados[turma][nome] = { ...prog, nivelPerfil };
  }));
}

// ── Busca no banco: nota da fase 1 da Atividade 5 → preenche "Ativ. Área" ──
// Confirmado em 30/06: a nota da fase 1 vem em escala 0–10, então convertemos
// dividindo por 10 antes de aplicar ao máx de 1 ponto da coluna Área.
async function carregarAutoArea(turma) {
  const porAluno = {};
  try {
    const q = query(ref(db, "resultados"), orderByChild("turma"), equalTo(turma));
    const snap = await get(q);
    if (snap.exists()) {
      snap.forEach(child => {
        const v = child.val();
        if (v.atividade !== NOME_ATIV5 || !v.aluno) return;
        const bruto = v.pontos_fase1 ?? v.pontuacao ?? null;
        if (bruto == null) return;
        if (!(v.aluno in porAluno) || bruto > porAluno[v.aluno]) porAluno[v.aluno] = bruto;
      });
    }
  } catch(e) { console.error("Falha ao buscar nota da Atividade 5:", e); }
  return porAluno;
}

// ── Busca no banco: melhor pontuação da Atividade 1 - Equações → coluna "Equações" ──
// Resultado vem em escala 0–10 (pontuacao_bruta); convertemos para o máx de 1,5 na hora de aplicar.
async function carregarAutoEquacoes(turma) {
  const porAluno = {};
  try {
    const q = query(ref(db, "resultados"), orderByChild("turma"), equalTo(turma));
    const snap = await get(q);
    if (snap.exists()) {
      snap.forEach(child => {
        const v = child.val();
        if (v.atividade !== NOME_ATIV1_EQ || !v.aluno) return;
        if (v.concluido !== true || v.modo_teste) return;
        const bruto = v.pontuacao_bruta ?? v.pontuacao ?? null;
        if (bruto == null) return;
        if (!(v.aluno in porAluno) || bruto > porAluno[v.aluno]) porAluno[v.aluno] = bruto;
      });
    }
  } catch(e) { console.error("Falha ao buscar Atividade 1 - Equações:", e); }
  return porAluno;
}

// ── Busca no banco: melhor pontuação da Atividade 2 - Regra de três → coluna "Atividade 2" ──
// Mesmo padrão de carregarAutoEquacoes acima (escala 0–10 → máx 1,5).
async function carregarAutoRazaoProp(turma) {
  const porAluno = {};
  try {
    const q = query(ref(db, "resultados"), orderByChild("turma"), equalTo(turma));
    const snap = await get(q);
    if (snap.exists()) {
      snap.forEach(child => {
        const v = child.val();
        if (v.atividade !== NOME_ATIV2_RP || !v.aluno) return;
        if (v.concluido !== true || v.modo_teste) return;
        const bruto = v.pontuacao_bruta ?? v.pontuacao ?? null;
        if (bruto == null) return;
        if (!(v.aluno in porAluno) || bruto > porAluno[v.aluno]) porAluno[v.aluno] = bruto;
      });
    }
  } catch(e) { console.error("Falha ao buscar Atividade 2 - Regra de três:", e); }
  return porAluno;
}

// ── 3º bim: Caderno automático (proporção de vistos), Professor Conselheiro (ocorrências) e PD - Geometria (vistos Canudos Parte 1+2) ──
// ── 4º bim: Caderno (vistos × 5), Comportamento (base 2,0) e nota do Jogo de Revisão ──
async function carregarAutoCadernoConselheiro(turma) {
  const alunos = ALUNOS_POR_TURMA[turma] || [];
  const ativos = new Set(camposAtivos().map(c => c.key));
  const cfg = bonusConfig() || {};
  const out = {};
  // 4º bim: as faltas da turma (chamada + atestados), lidas uma vez só, para o ponto extra
  const faltas = cfg.bonusFixo && cfg.bonusFixoMaxFaltasPct != null ? await buscarFaltasTurma(turma, alunos) : null;
  await Promise.all(alunos.map(async nome => {
    const [caderno, conselheiro, pd, pctCaderno, cadernoB4, comportamento, notaRevisao] = await Promise.all([
      buscarCadernoVistos(turma, nome),
      buscarConselheiro(turma, nome),
      buscarPDGeometria(turma, nome),
      (cfg.bonusCadernoVistos || cfg.cadernoCompleto) ? buscarPctCaderno(turma, nome) : Promise.resolve(null),
      ativos.has("cadernoB4")     ? buscarCadernoVistos(turma, nome, 5) : Promise.resolve(null),
      ativos.has("comportamento") ? buscarConselheiro(turma, nome, 2)   : Promise.resolve(null),
      cfg.revisao                 ? buscarNotaRevisao(turma, nome)      : Promise.resolve(null),
    ]);
    out[nome] = { caderno, conselheiro, pd, pctCaderno, cadernoB4, comportamento, notaRevisao };
    if (faltas) { const f = faltas[nome] || { faltas: 0, base: 0, pct: null }; Object.assign(out[nome], { faltasAulas: f.faltas, baseAulas: f.base, pctFaltas: f.pct }); }
  }));
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
export async function carregarDadosBimestre(ctx, turma, primeiraVez) {
  const chave = chaveTurma(turma);   // fixa o bimestre do começo ao fim da carga
  if (!ctx.dados[chave]) ctx.dados[chave] = turmaVazia(turma);
  if (!ctx.autoDados[turma]) ctx.autoDados[turma] = {};
  const autoDados = ctx.autoDados, dados = ctx.dados;
  const alunos = ALUNOS_POR_TURMA[turma] || [];
  const temAutoNovos = camposAtivos().some(c => ["cadernoVistos", "conselheiro", "pd", "cadernoB4", "comportamento"].includes(c.key));
  const tasks = [carregarAutoTabuada(ctx, turma), carregarAutoArea(turma), carregarAutoEquacoes(turma), carregarAutoRazaoProp(turma), notasLiberadas(turma), buscarAtiv4(turma, alunos), buscarCongelamento(turma),
                 temAutoNovos ? carregarAutoCadernoConselheiro(turma) : Promise.resolve({})];
  if (primeiraVez) tasks.push(carregarNotasSalvas(ctx, turma, chave));
  const [_, areaPorAluno, eqPorAluno, rpPorAluno, liberada, ativ4Map, cong, ccPorAluno] = await Promise.all(tasks);

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

// Total de cada aluno da turma no bimestre b (troca o BIMESTRE para b: quem chama devolve depois)
export async function totaisDoBimestre(ctx, turma, b) {
  setBimestre(b);
  const { congelado } = await carregarDadosBimestre(ctx, turma, !ctx.dados[chaveTurma(turma, b)]);
  const totais = {};
  (ALUNOS_POR_TURMA[turma] || []).forEach(nome => { totais[nome] = calcularTotal(ctx, turma, nome, ctx.dados[chaveTurma(turma, b)][nome]); });
  return { totais, congelado };
}

// As linhas da Nota final: [{ i, nome, notas:[b1,b2,b3,b4] (centésimos ou null), soma, faltam }] + parciais { "3": bool, "4": bool }
export function montarNotaFinal(ant, turma, porBim) {
  const parciais = Object.fromEntries(BIMESTRES_CALCULADOS.map(b => [b, !porBim[b]?.congelado]));
  const linhas = alunosDaNotaFinal(ant, turma).map((nome, i) => {
    const a = ant?.[turma]?.[nome] || {};
    const notas = [centesimos(a.b1), centesimos(a.b2), ...BIMESTRES_CALCULADOS.map(b => centesimos(porBim[b]?.totais?.[nome]))];
    const tem = notas.filter(c => c != null);
    return { i, nome, notas, soma: tem.length ? tem.reduce((s, c) => s + c, 0) : null, faltam: notas.length - tem.length };
  });
  return { linhas, parciais };
}

// A Nota final de uma turma (o BIMESTRE volta ao que era no fim)
export async function calcularNotaFinalTurma(ctx, turma) {
  const antes = BIMESTRE, ant = await carregarNotasAnteriores(), porBim = {};
  try {
    for (const b of BIMESTRES_CALCULADOS) porBim[b] = await totaisDoBimestre(ctx, turma, b);
  } finally { setBimestre(antes); }
  return montarNotaFinal(ant, turma, porBim);
}

// Várias turmas: todas as turmas de um bimestre em paralelo, depois o outro (o BIMESTRE é global).
// aoTerminar(turma, resultado | null, erro | null) é chamado quando cada turma fica pronta.
export async function calcularNotaFinalTurmas(turmas, aoTerminar) {
  const antes = BIMESTRE, ant = await carregarNotasAnteriores(), ctx = criarContexto();
  const porTurma = Object.fromEntries(turmas.map(t => [t, {}])), erro = {};
  try {
    for (const b of BIMESTRES_CALCULADOS) {
      const ultimo = b === BIMESTRES_CALCULADOS.at(-1);
      setBimestre(b);
      await Promise.all(turmas.filter(t => !erro[t]).map(async t => {
        try { porTurma[t][b] = await totaisDoBimestre(ctx, t, b); }
        catch (e) { erro[t] = e; console.error(`Nota final: falha na turma ${t} (${b}º bim):`, e); aoTerminar(t, null, e); return; }
        if (ultimo) aoTerminar(t, montarNotaFinal(ant, t, porTurma[t]), null);
      }));
    }
  } finally { setBimestre(antes); }
}

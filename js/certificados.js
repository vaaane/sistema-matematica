// 🎓 Certificados por conquista e por bimestre (PROMPT-278).
// Uma regra só para: aluno/a-certificados.html (o aluno vê e baixa), professor/p-certificados.html (lista e filtros),
// o card "🎓 Diplomas para imprimir" do dashboard e aluno/certificado_print.html (A4 deitado, um por folha).
//
//   tipo       regra                                                    bimestres   "X" (o impacto)
//   tabuada    melhor_nivel ≥ 300 em tabuada_niveis_b/{bim}/{uid}        3º e 4º     Σ (acertos + erros) do historico
//   negativa   melhor_nivel ≥ 150 em tabuada_negativos_niveis_b/{bim}    3º e 4º     Σ (acertos + erros) do historico
//   escalada   melhor_nivel ≥ ESCALADA_MAX (200) em escalada_niveis_b    3º e 4º     Σ tipos_acertos + erros (a Escalada não
//                                                                                    tem historico: guarda os contadores somados)
//   revisao_mestre  26 insígnias em jogo_revisao/{uid}/insignias         4º          Σ ginasios/{chave}/{treinador1..3, lider, revanche}/total
//                                                                                    (PROMPT-278b: as revanches douradas também contam;
//                                                                                    sem ginasios, Σ insignias/{chave}/total)
//   revisao_lenda   26 insígnias, todas douradas (quem é Lenda não recebe o Mestre)
//
// Impressão: diplomas_impressos/{uid}/{tipo}_{bim} = { impresso: true, ts }. O tabuada_300 antigo marcado conta como tabuada_3.
// Ficam de fora: ALUNOS_TESTE (ex.: 8H_Ricardo), PROFESSOR e TESTE.
import { db } from '/js/firebase-config.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { ALUNOS_POR_TURMA, ALUNOS_TESTE, ESCALADA_MAX, pathTabuadaNiveis, pathTabuadaNegNiveis, pathEscaladaNiveis } from '/js/constants.js';

export const TOTAL_INSIGNIAS_CERT = 26;

export const TIPOS_CERT = {
  tabuada:        { icon: '🧮', nome: 'Tabuada 300',        filtro: 'tabuada',  bims: [3, 4], cor: '#38bdf8',
                    conquista: (b) => `chegou ao <strong>nível 300 da Tabuada</strong> no ${b}º bimestre`,
                    impacto:   (x) => `respondeu <strong>${fmtMil(x)} questões</strong> de tabuada` },
  negativa:       { icon: '➖', nome: 'Negativa 150',       filtro: 'negativa', bims: [3, 4], cor: '#a99ff0',
                    conquista: (b) => `chegou ao <strong>nível 150 da Tabuada Negativa</strong> no ${b}º bimestre`,
                    impacto:   (x) => `respondeu <strong>${fmtMil(x)} questões</strong> com números negativos` },
  escalada:       { icon: '🧗', nome: 'Escalada completa',  filtro: 'escalada', bims: [3, 4], cor: '#34d399',
                    conquista: (b) => `completou os <strong>${ESCALADA_MAX} níveis da Escalada Algébrica</strong> no ${b}º bimestre`,
                    impacto:   (x) => `simplificou <strong>${fmtMil(x)} expressões</strong>` },
  revisao_mestre: { icon: '🏆', nome: 'Mestre da Revisão',  filtro: 'revisao',  bims: [4],    cor: '#c4b5fd',
                    conquista: () => `tornou-se <strong>Mestre da Revisão</strong> no Jogo de Revisão`,
                    impacto:   (x) => `venceu os ${TOTAL_INSIGNIAS_CERT} ginásios respondendo <strong>${fmtMil(x)} perguntas</strong>` },
  revisao_lenda:  { icon: '🌟', nome: 'Lenda da Revisão',   filtro: 'revisao',  bims: [4],    cor: '#ffd700',
                    conquista: () => `tornou-se <strong>Lenda da Revisão</strong> no Jogo de Revisão`,
                    impacto:   (x) => `conquistou as ${TOTAL_INSIGNIAS_CERT} insígnias douradas respondendo <strong>${fmtMil(x)} perguntas</strong>` },
};
export const ORDEM_TIPOS = ['tabuada', 'negativa', 'escalada', 'revisao_mestre', 'revisao_lenda'];
const BIMS_JOGOS = [3, 4];

export const fmtMil = (n) => (Number(n) || 0).toLocaleString('pt-BR');
export const chaveCert = (tipo, bim) => `${tipo}_${bim}`;
export const makeUidCert = (turma, nome) => (turma + '_' + nome).replace(/[.#$[\]/\s]/g, '_');

// quem pode ter certificado: os alunos ativos de ALUNOS_POR_TURMA, sem contas de teste, PROFESSOR e TESTE
export const ehContaTeste = (turma, nome) =>
  turma === 'TESTE' || ALUNOS_TESTE.includes(makeUidCert(turma, nome)) || /PROFESSOR|TESTE/i.test(String(nome || ''));
export function alunosCert() {
  const l = [];
  for (const [turma, nomes] of Object.entries(ALUNOS_POR_TURMA)) {
    for (const nome of nomes) if (!ehContaTeste(turma, nome)) l.push({ uid: makeUidCert(turma, nome), turma, nome });
  }
  return l;
}

const lerVal = (p) => get(ref(db, p)).then(s => (s.exists() ? s.val() : null)).catch(() => null);
const somaHist = (h) => Object.values(h || {}).reduce((s, e) => s + (Number(e?.acertos) || 0) + (Number(e?.erros) || 0), 0);
// 1ª partida do historico no nível da conquista (quando o campo concluiu_*_em não existe)
const tsHist = (h, nivel) => {
  const l = Object.entries(h || {}).filter(([, e]) => (Number(e?.nivel) || 0) >= nivel).map(([k, e]) => Number(e?.ts) || Number(k) || 0).filter(Boolean);
  return l.length ? Math.min(...l) : null;
};

// 🏅 PROMPT-278b: perguntas dos ginásios = Σ total de todas as batalhas guardadas (3 treinadores, líder e revanche)
export function perguntasGinasios(gin) {
  let n = 0;
  for (const g of Object.values(gin || {})) for (const b of Object.values(g || {}))
    if (b && typeof b === 'object' && b.vencido) n += Number(b.total) || 0;
  return n;
}

// Monta os certificados de UM aluno a partir dos dados já lidos (a mesma conta para todas as páginas).
//   d = { tab: {3: no, 4: no}, neg: {3, 4}, esc: {3, 4}, ins: insignias, gin: ginasios }
export function montarCertificados(aluno, d) {
  const out = [], base = { uid: aluno.uid, turma: aluno.turma, nome: aluno.nome };
  for (const bim of BIMS_JOGOS) {
    const t = d.tab?.[bim];
    if (t && (Number(t.melhor_nivel) || 0) >= 300)
      out.push({ ...base, tipo: 'tabuada', bim, qtd: somaHist(t.historico), ts: Number(t.concluiu_300_em) || tsHist(t.historico, 300) || Number(t.ultima_partida) || null });
    const n = d.neg?.[bim];
    if (n && (Number(n.melhor_nivel) || 0) >= 150)
      out.push({ ...base, tipo: 'negativa', bim, qtd: somaHist(n.historico), ts: Number(n.concluiu_150_em) || tsHist(n.historico, 150) || Number(n.ultima_partida) || null });
    const e = d.esc?.[bim];
    if (e && (Number(e.melhor_nivel) || 0) >= ESCALADA_MAX) {
      const ac = Object.values(e.tipos_acertos || {}).reduce((s, v) => s + (Number(v) || 0), 0);
      out.push({ ...base, tipo: 'escalada', bim, qtd: ac + (Number(e.erros) || 0), ts: Number(e.concluiu_200_em) || Number(e.ultima_partida) || null });
    }
  }
  const ins = Object.values(d.ins || {}).filter(Boolean);
  if (ins.length >= TOTAL_INSIGNIAS_CERT) {
    const lenda = ins.filter(i => i.dourada).length >= TOTAL_INSIGNIAS_CERT;
    const qtd = perguntasGinasios(d.gin) || ins.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const ts = Math.max(0, ...ins.map(i => Number(i.data) || 0)) || null;   // a última insígnia (a dourada não guarda data própria)
    out.push({ ...base, tipo: lenda ? 'revisao_lenda' : 'revisao_mestre', bim: 4, qtd, ts });
  }
  return out.map(c => ({ ...c, chave: chaveCert(c.tipo, c.bim) }));
}

// Os certificados de um aluno (leituras pequenas, só dele).
export async function certificadosDoAluno(turma, nome) {
  if (ehContaTeste(turma, nome)) return [];
  const uid = makeUidCert(turma, nome), d = { tab: {}, neg: {}, esc: {} };
  const jobs = [];
  for (const b of BIMS_JOGOS) {
    jobs.push(lerVal(pathTabuadaNiveis(uid, b)).then(v => { d.tab[b] = v; }));
    jobs.push(lerVal(pathTabuadaNegNiveis(uid, b)).then(v => { d.neg[b] = v; }));
    jobs.push(lerVal(pathEscaladaNiveis(uid, b)).then(v => { d.esc[b] = v; }));
  }
  jobs.push(lerVal(`jogo_revisao/${uid}/insignias`).then(v => { d.ins = v; }));
  await Promise.all(jobs);
  if (Object.values(d.ins || {}).filter(Boolean).length >= TOTAL_INSIGNIAS_CERT) d.gin = await lerVal(`jogo_revisao/${uid}/ginasios`);
  return montarCertificados({ uid, turma, nome }, d);
}

// Os certificados de todos os alunos. Primeiro descobre quem chegou lá pelos nós pequenos (rankings, que têm o melhor_nivel;
// a Negativa não tem ranking: o nó do bimestre inteiro) e só depois lê o histórico de quem conquistou.
export async function todosCertificados() {
  const alunos = alunosCert(), porUid = new Map(alunos.map(a => [a.uid, a]));
  const [rkTab, rkEsc, neg, ins] = await Promise.all([
    Promise.all(BIMS_JOGOS.map(b => lerVal(`tabuada_ranking_b/${b}`))),
    Promise.all(BIMS_JOGOS.map(b => lerVal(`escalada_ranking_b/${b}`))),
    Promise.all(BIMS_JOGOS.map(b => lerVal(`tabuada_negativos_niveis_b/${b}`))),
    Promise.all(alunos.map(a => lerVal(`jogo_revisao/${a.uid}/insignias`))),
  ]);
  const dados = new Map(alunos.map((a, i) => [a.uid, { tab: {}, neg: {}, esc: {}, ins: ins[i] }]));
  const jobs = [];
  BIMS_JOGOS.forEach((b, i) => {
    for (const [uid, v] of Object.entries(rkTab[i] || {})) {
      if (!porUid.has(uid) || (Number(v?.melhor_nivel) || 0) < 300) continue;
      jobs.push(lerVal(pathTabuadaNiveis(uid, b)).then(n => { dados.get(uid).tab[b] = n || v; }));
    }
    for (const [uid, v] of Object.entries(rkEsc[i] || {})) {
      if (!porUid.has(uid) || (Number(v?.melhor_nivel) || 0) < ESCALADA_MAX) continue;
      jobs.push(lerVal(pathEscaladaNiveis(uid, b)).then(n => { dados.get(uid).esc[b] = n || v; }));
    }
    for (const [uid, v] of Object.entries(neg[i] || {})) if (porUid.has(uid)) dados.get(uid).neg[b] = v;
  });
  for (const [uid, d] of dados) if (Object.values(d.ins || {}).filter(Boolean).length >= TOTAL_INSIGNIAS_CERT)
    jobs.push(lerVal(`jogo_revisao/${uid}/ginasios`).then(g => { d.gin = g; }));
  await Promise.all(jobs);
  const out = [];
  for (const a of alunos) out.push(...montarCertificados(a, dados.get(a.uid)));
  return out;
}

// já impresso? (o tabuada_300 antigo marcado vale como a Tabuada 300 do 3º bim)
// (a marcação própria, quando existe, manda: "↩ Desfazer" grava impresso: false e o tabuada_300 antigo deixa de valer)
export function certImpresso(impressos, c) {
  const im = impressos?.[c.uid] || {};
  if (im[c.chave] && typeof im[c.chave] === 'object') return im[c.chave].impresso === true;
  return c.chave === 'tabuada_3' && im.tabuada_300?.impresso === true;
}
export const tsImpresso = (impressos, c) => impressos?.[c.uid]?.[c.chave]?.ts || (c.chave === 'tabuada_3' ? impressos?.[c.uid]?.tabuada_300?.ts : null) || null;

// o link da folha para imprimir: um certificado ou vários (um por folha)
export const urlCertificado = (c) => `/aluno/certificado_print.html?itens=${encodeURIComponent(`${c.uid}~${c.tipo}~${c.bim}`)}`;
export const urlCertificados = (lista) => `/aluno/certificado_print.html?itens=${encodeURIComponent(lista.map(c => `${c.uid}~${c.tipo}~${c.bim}`).join(','))}`;

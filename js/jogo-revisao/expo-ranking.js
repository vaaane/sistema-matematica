// 📝 PROMPT-257: o ranking do desafio da Exposição (usado pelo jogo, pela página da professora e pela TV).
// exposicao_desafio/{uid} = { salas: { n: pontos }, total, ts }   (ts: quando chegou ao total atual; desempata)
// exposicao_nomes/{uid} = { nome, turma, ts }                     (o nome pedido)
// exposicao_nomes_status/{uid} = 'aprovado' | 'recusado'           (só a professora grava; sem o nó: pendente)
// exposicao_completos/{uid} = ts                                   (completou os carimbos, PROMPT-254)
// No ranking: só os aprovados; o mesmo nome (sem acento, sem maiúsculas) com a mesma turma aparece uma vez, com a melhor.

export const PONTOS_ACERTO = 10, BONUS_MAX = 5, BONUS_ATE_S = 5, BONUS_CAI_S = 3;
export const MAX_SALA = 45, MAX_JOGO = 30, MAX_TOTAL = 690, NOME_MAX = 20, TURMA_MAX = 6;   // 🎲 PROMPT-259: salas + jogos, até 690
// bônus de rapidez: +5 até 5 s, depois 1 a menos a cada 3 s (0 a partir de 20 s)
export const bonusDe = (t) => Math.max(0, BONUS_MAX - Math.floor(Math.max(0, t - BONUS_ATE_S) / BONUS_CAI_S));
export const BONUS_ZERA_S = BONUS_ATE_S + BONUS_MAX * BONUS_CAI_S;

export const limparNome = (s, max = NOME_MAX) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
export const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
export const chaveNome = (n) => `${normalizar(n?.nome)}|${normalizar(n?.turma)}`;
export const rotuloNome = (n) => `${limparNome(n?.nome)}${limparNome(n?.turma, TURMA_MAX) ? ' – ' + limparNome(n.turma, TURMA_MAX) : ''}`;
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const ordemRk = (a, b) => b.total - a.total || a.ts - b.ts;

// o total de cada uid (a soma das salas e dos jogos, no máximo 690: não confia só no "total" gravado)
export function totalDe(reg) {
  if (!reg || typeof reg !== 'object') return 0;
  const s = Object.values(reg.salas || {}).reduce((t, v) => t + Math.min(MAX_SALA, Math.max(0, num(v))), 0)
    + Object.values(reg.jogos || {}).reduce((t, v) => t + Math.min(MAX_JOGO, Math.max(0, num(v))), 0);
  return Math.min(MAX_TOTAL, s);
}

// [{ uid, chave, rotulo, nome, turma, total, ts }] dos aprovados, sem repetir nome, do maior para o menor.
// esconder(uid, nome): as contas que não aparecem (professora, contas de teste)
export function montarRanking(desafio = {}, nomes = {}, status = {}, esconder = () => false) {
  const melhor = new Map();
  for (const [uid, reg] of Object.entries(desafio || {})) {
    const n = nomes?.[uid];
    if (status?.[uid] !== 'aprovado' || !n?.nome || esconder(uid, n.nome)) continue;
    const total = totalDe(reg);
    if (total <= 0) continue;
    const e = { uid, chave: chaveNome(n), rotulo: rotuloNome(n), nome: limparNome(n.nome), turma: limparNome(n.turma, TURMA_MAX), total, ts: num(reg.ts) || Infinity };
    const ant = melhor.get(e.chave);
    if (!ant || ordemRk(e, ant) < 0) melhor.set(e.chave, e);
  }
  return [...melhor.values()].sort(ordemRk);
}

// os que completaram a exposição, com nome aprovado (sem repetir), do mais novo para o mais antigo; total = todos os que completaram
export function montarCompletos(completos = {}, nomes = {}, status = {}, esconder = () => false) {
  const todos = Object.entries(completos || {}).filter(([uid]) => !esconder(uid, nomes?.[uid]?.nome));
  const vistos = new Set(), lista = [];
  for (const [uid, ts] of todos.sort((a, b) => num(b[1]) - num(a[1]))) {
    const n = nomes?.[uid];
    if (status?.[uid] !== 'aprovado' || !n?.nome) continue;
    const k = chaveNome(n);
    if (vistos.has(k)) continue;
    vistos.add(k);
    lista.push({ uid, rotulo: rotuloNome(n), ts: num(ts) });
  }
  return { lista, total: todos.length };
}

// pessoas na exposição agora (a presença online), sem a professora e as contas de teste
export const contarAgora = (online = {}, esconder = () => false, validade = 30000) =>
  Object.entries(online || {}).filter(([uid, r]) => r?.local === 'exposicao' && Date.now() - num(r.ts) < validade && !esconder(uid, r.apelido)).length;

// 🏆 PROMPT-261: o ranking de cada jogo. exposicao_desafio/{uid}/rank/{id} = o número (vitórias, rodadas perfeitas ou o melhor de acertos)
// e rank_ts/{id} = quando chegou a ele (desempate: quem chegou primeiro fica na frente). Só os aprovados; o mesmo nome aparece uma vez, com o maior.
export function montarRankingJogo(desafio = {}, nomes = {}, status = {}, esconder = () => false, id = '') {
  const melhor = new Map();
  for (const [uid, reg] of Object.entries(desafio || {})) {
    const n = nomes?.[uid], v = Math.max(0, Math.floor(num(reg?.rank?.[id])));
    if (!v || status?.[uid] !== 'aprovado' || !n?.nome || esconder(uid, n.nome)) continue;
    const e = { uid, chave: chaveNome(n), rotulo: rotuloNome(n), v, ts: num(reg?.rank_ts?.[id]) || Infinity };
    const ant = melhor.get(e.chave);
    if (!ant || e.v > ant.v || (e.v === ant.v && e.ts < ant.ts)) melhor.set(e.chave, e);
  }
  return [...melhor.values()].sort((a, b) => b.v - a.v || a.ts - b.ts);
}

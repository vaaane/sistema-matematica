// Jogo de Revisão — Praça do Encontro: regras puras (mural, tema e resultado do desafio, limites e prêmios).
// Dados em dados/jogo/praca.json; a tela fica em js/jogo-revisao.js.

let P = null;
export function definirPraca(json) { P = json; }
export const pracaPronta = () => !!(P?.entrada && P?.mural);
export const cfgPraca = () => P || {};
export const cfgDesafio = () => P?.desafio || {};
export const frasesPraca = () => P?.frases || [];

// Tema do desafio: tipos de conta dos ginásios que OS DOIS já venceram (sorteia um ginásio); se nenhum, os do mapa 1
export function temaDoDesafio(vencidosA, vencidosB, rnd = Math.random) {
  const T = P?.temas_ginasios || {};
  const b = new Set(vencidosB || []);
  const comuns = (vencidosA || []).filter(k => b.has(k) && T[k]?.length);
  if (!comuns.length) return { ginasio: null, tipos: [...new Set([...(T['mapa1-A'] || []), ...(T['mapa1-B'] || [])])] };
  const g = comuns[Math.floor(rnd() * comuns.length)];
  return { ginasio: g, tipos: T[g] };
}

// Quem ganhou a rodada: o primeiro a acertar pelo relógio do servidor (t); errou ou não respondeu: não conta
// resp: { uid: { op, t } }; resposta: a alternativa certa
export function vencedorDaRodada(resp, resposta) {
  const certos = Object.entries(resp || {}).filter(([, r]) => r && r.op === resposta && Number.isFinite(Number(r.t)))
    .sort((a, b) => Number(a[1].t) - Number(b[1].t));
  return certos.length ? certos[0][0] : null;
}

// Placar a partir das rodadas encerradas: { uid: rodadas ganhas }
export function placarDe(rodadas, uids) {
  const p = Object.fromEntries(uids.map(u => [u, 0]));
  for (const r of Object.values(rodadas || {})) if (r?.fim?.vencedor && r.fim.vencedor in p) p[r.fim.vencedor]++;
  return p;
}
// 'a' | 'b' | 'empate'
export function resultadoFinal(placar, a, b) {
  const pa = placar[a] || 0, pb = placar[b] || 0;
  return pa > pb ? a : pb > pa ? b : 'empate';
}

// Limite de prêmios: desafiosDia = { data, n, contra: { uid: n } } (zera quando muda o dia)
export function vale(desafiosDia, hoje, contraUid) {
  const c = cfgDesafio();
  const d = desafiosDia?.data === hoje ? desafiosDia : { n: 0, contra: {} };
  return (Number(d.n) || 0) < (c.premiados_dia ?? 5) && (Number(d.contra?.[contraUid]) || 0) < (c.premiados_mesmo_colega_dia ?? 2);
}
export function contarDesafio(desafiosDia, hoje, contraUid) {
  const d = desafiosDia?.data === hoje ? desafiosDia : { data: hoje, n: 0, contra: {} };
  return { data: hoje, n: (Number(d.n) || 0) + 1, contra: { ...(d.contra || {}), [contraUid]: (Number(d.contra?.[contraUid]) || 0) + 1 } };
}
// Prêmio de quem terminou: venceu | empate | perdeu (rodadas ganhas somam pontos)
export function premioDesafio(resultado, rodadasGanhas) {
  const c = cfgDesafio();
  const moedas = resultado === 'venceu' ? c.moedas_vitoria ?? 3 : resultado === 'empate' ? c.moedas_empate ?? 1 : 0;
  const pontos = (resultado === 'venceu' ? c.pontos_vitoria ?? 10 : resultado === 'empate' ? c.pontos_empate ?? 4 : 0) + (rodadasGanhas || 0) * (c.pontos_rodada ?? 1);
  return { moedas, pontos };
}

// Ranking do mural: lista de { uid, nome, turma, valor, ... } → ordenada, com posição (empate divide a posição)
export function ordenarRanking(lista, desempate = () => 0) {
  const l = [...lista].sort((a, b) => b.valor - a.valor || desempate(a, b) || String(a.nome).localeCompare(String(b.nome)));
  let pos = 0, ult = null;
  l.forEach((r, i) => { if (r.valor !== ult) { pos = i + 1; ult = r.valor; } r.pos = pos; });
  return l;
}

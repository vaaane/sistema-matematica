// 🎲 PROMPT-259: os 4 jogos da Exposição (Shisima, Yoté, Linha do tempo, Mito ou verdade), com tutorial, e o menu dos NPCs.
// dados/jogo/exposicao-jogos.json. O jogo principal passa as dependências em configurarJogosExpo(jogos, ctx):
//   ctx = { pai (onde pôr as janelas), esc, tocar(som), lerLocal, gravarLocal, previa(), melhor(id), gravar(id, pts) → Promise<'ok'|'previa'|'prof'|'fechado'|'erro'|'teste'|''>,
//           oponentePet() → { nome, img } | null, npc(id) → { nome, img } | null, salaDoJogo(id) → 'Porta 1 · Raízes' | '',
//           ranking(id) → { lista: [{ rotulo, v }], eu: { pos, v } | { pendente } | null }, contar(id, valor) (🏆 PROMPT-261) }
import { inicioShisima, movimentosShisima, moverShisima, linhaShisima, iaShisima, vizinhosShisima, CENTRO,
  inicioYote, acoesYote, aplicarYote, removerYote, podeRemoverYote, pecasYote, iaYote, escolhaRemocaoYote, outro } from '/js/jogo-revisao/expo-jogos-regras.js';

let J = null, C = null, aberto = null, timers = [], rkTimer = 0;
const $ = (id) => document.getElementById(id);
const sortear = (l) => l[Math.floor(Math.random() * l.length)];
const embaralhar = (l) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const depois = (ms, f) => { const t = setTimeout(f, ms); timers.push(t); return t; };
const limparTimers = () => { timers.forEach(clearTimeout); timers = []; };

export const jogosExpo = () => J?.jogos || {};
export const npcsSaguaoExpo = () => (Array.isArray(J?.npcs_saguao) ? J.npcs_saguao : []);
export const jogoAbertoExpo = () => !!aberto;
// o jogo da sala (pelo id do tema; afrofuturismo_2 → afrofuturismo)
export function jogoDaSalaExpo(tema) {
  const t = String(tema || ''), base = t.replace(/_\d+$/, '');
  return Object.keys(jogosExpo()).find(id => (jogosExpo()[id].sala_tema || []).some(x => x === t || x === base)) || null;
}

export function configurarJogosExpo(jogos, ctx) {
  if (!jogos?.jogos || J) return;
  J = jogos; C = ctx;
  const pai = ctx.pai || document.body;
  pai.insertAdjacentHTML('beforeend', `
  <div id="expo-jogos-menu" class="al-fundo expo-modal" hidden role="dialog" aria-label="Jogos">
    <div class="al-caixa expo-caixa expo-fixa ej-menu-caixa">
      <div class="al-topo"><b id="ej-menu-tit">🎲 Jogos</b><button class="bt-lista-x" id="ej-menu-x" aria-label="Fechar">✕</button></div>
      <div class="expo-rolar" id="ej-menu-c"></div>
    </div>
  </div>
  <div id="expo-jogo" class="al-fundo expo-modal" hidden role="dialog" aria-label="Jogo">
    <div class="al-caixa expo-caixa expo-fixa ej-caixa">
      <div class="al-topo"><b id="ej-tit">🎲</b><span class="ej-topo-bts"><button class="ej-ajuda" id="ej-rk" aria-label="Ranking deste jogo">🏆</button><button class="ej-ajuda" id="ej-ajuda" aria-label="Como jogar">❓</button><button class="bt-lista-x" id="ej-x" aria-label="Fechar">✕</button></span></div>
      <div class="ej-c" id="ej-c"></div>
    </div>
  </div>`);
  $('ej-menu-x').addEventListener('click', fecharMenu);
  $('expo-jogos-menu').addEventListener('click', (e) => {
    if (e.target === $('expo-jogos-menu')) { fecharMenu(); return; }
    const b = e.target.closest('[data-jogar],[data-tut],[data-rk]');
    if (!b) return;
    const npc = $('expo-jogos-menu').dataset.npc || null;
    fecharMenu();
    abrirJogoExpo(b.dataset.jogar || b.dataset.tut || b.dataset.rk, { npc, soTutorial: !!b.dataset.tut, soRanking: !!b.dataset.rk });
  });
  $('ej-x').addEventListener('click', fecharJogo);
  $('expo-jogo').addEventListener('click', (e) => { if (e.target === $('expo-jogo')) fecharJogo(); });
  $('ej-ajuda').addEventListener('click', () => {   // ❓: no jogo, por cima; já no tutorial, volta ao 1º cartão
    if (!aberto) return;
    C.tocar('clique');
    const emJogo = !!(aberto.sh || aberto.yo || aberto.li || aberto.mv) && !(aberto.tut && aberto.tut.fim !== 'voltar');
    mostrarTutorial(aberto.id, 0, emJogo ? 'voltar' : aberto.tut?.fim || 'jogar');
  });
  $('ej-rk').addEventListener('click', () => {   // 🏆: no jogo, por cima; fora dele, na janela
    if (!aberto) return;
    C.tocar('clique');
    mostrarRanking(aberto.id, !!(aberto.sh || aberto.yo || aberto.li || aberto.mv));
  });
  addEventListener('resize', () => { if (aberto?.sh || aberto?.yo) dimensionarTabExpo($('ej-area'), $('ej-tab')); });
  $('ej-c').addEventListener('click', cliqueNoJogo);
  $('ej-c').addEventListener('pointerdown', arrastarIni);
}

// ── o menu de um NPC: "🎲 Jogos com a Duda" ──
export function abrirMenuJogosExpo(npcId) {
  if (!J) return;
  const cfg = npcsSaguaoExpo().find(n => n.id === npcId) || {}, quem = C.npc(npcId) || { nome: 'Visitante' };
  const ids = Object.keys(jogosExpo()).sort((a, b) => (a === cfg.destaque ? -1 : b === cfg.destaque ? 1 : 0));
  $('ej-menu-tit').innerHTML = `${quem.img ? `<img class="ej-rosto" src="${C.esc(quem.img)}" alt=""/>` : ''}🎲 Jogos com ${artigo(quem.nome)}`;
  $('ej-menu-c').innerHTML = ids.map(id => {
    const j = jogosExpo()[id], m = C.melhor(id), sala = C.salaDoJogo(id);
    return `<div class="ej-item${id === cfg.destaque ? ' fav' : ''}"><span class="ej-ic">${C.esc(j.icone)}</span>
      <div class="ej-item-t"><b>${C.esc(j.nome)}</b>${id === cfg.destaque ? `<em>⭐ favorito ${artigoDe(quem.nome)}</em>` : ''}
        <small>${sala ? `também na ${C.esc(sala)}` : ''}${m ? `${sala ? ' · ' : ''}sua melhor: <b>${m}</b> pts` : ''}</small></div>
      <div class="ej-item-bts"><button class="jr-btn jr-btn-ouro" data-jogar="${id}">▶ Jogar</button><button class="jr-btn jr-btn-sec" data-tut="${id}">❓ Como jogar</button><button class="jr-btn jr-btn-sec" data-rk="${id}">🏆 Ranking</button></div></div>`;
  }).join('');
  $('expo-jogos-menu').dataset.npc = npcId;
  $('expo-jogos-menu').hidden = false;
}
const FEM = new Set(['Duda', 'Joana', 'Lia', 'Ana']);
const artigo = (n) => `${FEM.has(n) ? 'a' : 'o'} ${n}`;
const artigoDe = (n) => `${FEM.has(n) ? 'da' : 'do'} ${n}`;
function fecharMenu() { $('expo-jogos-menu').hidden = true; }

// ── abrir um jogo (o tutorial só quando a pessoa pede: ❓ Como jogar ou o ❓ da janela, PROMPT-261) ──
export function abrirJogoExpo(id, { npc = null, soTutorial = false, soVer = false, soRanking = false } = {}) {   // soVer: só o tutorial, termina em "✔ Entendi" (⚔️ PROMPT-260)
  const j = jogosExpo()[id];
  if (!j) return;
  limparTimers();
  // o adversário: o NPC que chamou; pelo botão da sala, o pet da pessoa (sem pet: a Duda)
  const op = (npc && C.npc(npc)) || C.oponentePet() || C.npc('duda') || { nome: 'Computador', img: '' };
  aberto = { id, j, op, npc };
  $('ej-tit').textContent = `${j.icone} ${j.nome}`;
  $('expo-jogo').hidden = false;
  if (soVer) mostrarTutorial(id, 0, 'ver');
  else if (soTutorial) mostrarTutorial(id, 0, 'jogar');
  else if (soRanking) mostrarRanking(id, false);
  else comecar();
}
export const fecharJogoExpo = () => { if (aberto) fecharJogo(); };
function fecharJogo() { limparTimers(); clearInterval(rkTimer); aberto = null; $('expo-jogo').hidden = true; $('ej-c').innerHTML = ''; }
function comecar() {
  limparTimers(); clearInterval(rkTimer);
  const id = aberto.id;
  $('expo-jogo').dataset.jogo = id;
  ({ shisima: comecarShisima, yote: comecarYote, linha_tempo: comecarLinha, mito_verdade: comecarMito })[id]?.();
}

// ── ❓ tutorial: um cartão por tela (Shisima e Yoté com o desenho do tabuleiro; os outros com um exemplo) ──
function mostrarTutorial(id, i, fim) {
  const j = jogosExpo()[id], cards = j.tutorial || [], n = cards.length, ultimo = i >= n - 1, sobre = fim === 'voltar';
  aberto.tut = { i, fim };
  $('expo-jogo').dataset.jogo = id;
  // no meio de uma partida (❓): por cima do jogo, que continua igual por baixo
  let alvo = $('ej-c');
  if (sobre) { alvo = $('ej-tut-sobre'); if (!alvo) { alvo = document.createElement('div'); alvo.id = 'ej-tut-sobre'; alvo.className = 'ej-tut-sobre'; $('ej-c').append(alvo); } }
  else limparTimers();
  const fimBt = sobre ? '<button class="jr-btn jr-btn-ouro" data-ej="tut-voltar">↩ Voltar ao jogo</button>' : fim === 'ver' ? '<button class="jr-btn jr-btn-ouro" data-ej="fechar">✔ Entendi</button>' : '<button class="jr-btn jr-btn-ouro" data-ej="tut-jogar">▶ Jogar agora</button>';
  const bolinhas = cards.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
  alvo.innerHTML = `<div class="ej-tut"><div class="ej-tut-faixa">❓ COMO JOGAR · ${C.esc(j.nome)}</div>
    <p class="ej-tut-p">${C.esc(cards[i] || '')}</p>
    <div class="ej-tut-fig ej-fig-${id}">${figuraTutorial(id, i)}</div>
    <div class="ej-tut-bts"><button class="jr-btn jr-btn-sec" data-ej="tut-ant"${i === 0 ? ' disabled' : ''}>←</button><span class="ej-bolinhas" aria-label="Passo ${i + 1} de ${n}">${bolinhas}</span>
      ${ultimo ? fimBt : '<button class="jr-btn jr-btn-ouro" data-ej="tut-prox">Próximo →</button>'}</div></div>`;
}
// desenhos simples (SVG) mostrando o que o cartão diz
function svgShisima(pos, { setas = [], linha = null, centroBrilha = false } = {}) {
  const P = pontosShisima(150, 150, 118);
  const lin = [...Array(8).keys()].map(i => `<line x1="${P[i][0]}" y1="${P[i][1]}" x2="${P[(i + 1) % 8][0]}" y2="${P[(i + 1) % 8][1]}"/><line x1="${P[i][0]}" y1="${P[i][1]}" x2="150" y2="150"/>`).join('');
  const marca = linha ? `<polyline class="ej-linha" points="${linha.map(k => P[k].join(',')).join(' ')}"/>` : '';
  const sets = setas.map(([a, b]) => { const [x1, y1] = P[a], [x2, y2] = P[b]; return `<line class="ej-seta" x1="${x1 + (x2 - x1) * .22}" y1="${y1 + (y2 - y1) * .22}" x2="${x1 + (x2 - x1) * .72}" y2="${y1 + (y2 - y1) * .72}" marker-end="url(#ej-ponta)"/>`; }).join('');
  const pcs = pos.map((v, k) => (v ? `<circle class="ej-p${v}" cx="${P[k][0]}" cy="${P[k][1]}" r="17"/>` : `<circle class="ej-vazio${k === CENTRO && centroBrilha ? ' brilha' : ''}" cx="${P[k][0]}" cy="${P[k][1]}" r="7"/>`)).join('');
  return `<svg viewBox="0 0 300 300" class="ej-svg"><defs><marker id="ej-ponta" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#00e676"/></marker></defs>
    <g class="ej-linhas">${lin}</g>${marca}${pcs}${sets}</svg>`;
}
function svgYote(L, Cc, pecas, { setas = [], x = [], maos = null } = {}) {
  const t = 40, w = Cc * t, h = L * t, xy = (i) => [Math.floor(i % Cc) * t + t / 2, Math.floor(i / Cc) * t + t / 2];
  let s = `<svg viewBox="-4 -4 ${w + 8} ${h + (maos ? 40 : 8)}" class="ej-svg"><defs><marker id="ej-ponta2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#00e676"/></marker></defs>`;
  for (let l = 0; l < L; l++) for (let c = 0; c < Cc; c++) s += `<rect class="ej-casa" x="${c * t + 1}" y="${l * t + 1}" width="${t - 2}" height="${t - 2}" rx="6"/>`;
  for (const [i, v] of Object.entries(pecas)) { const [cx, cy] = xy(Number(i)); s += `<circle class="ej-p${v}" cx="${cx}" cy="${cy}" r="13"/>`; }
  for (const i of x) { const [cx, cy] = xy(i); s += `<path class="ej-x" d="M${cx - 9} ${cy - 9}L${cx + 9} ${cy + 9}M${cx + 9} ${cy - 9}L${cx - 9} ${cy + 9}"/>`; }
  for (const [a, b] of setas) { const [x1, y1] = xy(a), [x2, y2] = xy(b); s += `<path class="ej-seta" d="M${x1} ${y1 - 15} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - 34} ${x2} ${y2 - 15}" fill="none" marker-end="url(#ej-ponta2)"/>`; }
  if (maos) s += `<text x="4" y="${h + 26}" class="ej-txt-svg">✋ ${maos[0]}</text><text x="${w - 4}" y="${h + 26}" text-anchor="end" class="ej-txt-svg ej-txt-op">✋ ${maos[1]}</text>`;
  return s + '</svg>';
}
// 🏆 o ranking de um jogo (PROMPT-261): os 10 primeiros com nome aprovado e "Você"; atualiza ao vivo enquanto está aberto
const textoRk = (id, v) => (id === 'mito_verdade' ? `${v}/${Number(jogosExpo().mito_verdade?.por_rodada) || 15}`
  : id === 'linha_tempo' ? `${v} ${v === 1 ? 'rodada perfeita' : 'rodadas perfeitas'}` : `${v} ${v === 1 ? 'vitória' : 'vitórias'}`);
const criterioRk = (id) => (id === 'mito_verdade' ? 'O melhor número de acertos numa rodada' : id === 'linha_tempo' ? 'Rodadas com as 5 cartas no lugar certo'
  : 'Vitórias contra o computador, o pet ou outra pessoa');
function mostrarRanking(id, sobre) {
  clearInterval(rkTimer);
  let alvo = $('ej-c');
  if (sobre) { alvo = $('ej-tut-sobre'); if (!alvo) { alvo = document.createElement('div'); alvo.id = 'ej-tut-sobre'; alvo.className = 'ej-tut-sobre'; $('ej-c').append(alvo); } }
  else { limparTimers(); aberto.sh = aberto.yo = aberto.li = aberto.mv = null; aberto.tut = null; }
  const pintar = () => {
    if (!aberto || aberto.id !== id || !alvo.isConnected) { clearInterval(rkTimer); return; }
    const rk = C.ranking(id) || { lista: [] }, med = ['p1', 'p2', 'p3'];
    const eu = rk.eu?.pos ? `Você: ${rk.eu.pos}º · ${textoRk(id, rk.eu.v)}` : rk.eu?.pendente ? `Você: ${textoRk(id, rk.eu.v)} · nome aguardando aprovação`
      : rk.eu?.semNome ? `Você: ${textoRk(id, rk.eu.v)} · faça o 📝 desafio de uma sala para pôr seu nome` : rk.eu?.previa ? '👀 prévia: nada é gravado' : '';
    const html = `<div class="ej-rk"><div class="ej-tut-faixa rk">🏆 RANKING · ${C.esc(jogosExpo()[id]?.nome || '')}</div><small class="ej-rk-crit">${C.esc(criterioRk(id))}</small>
      ${rk.lista.length ? `<ol class="ej-rk-l">${rk.lista.map((r, k) => `<li class="${med[k] || ''}"><span>${k + 1}º</span><b>${C.esc(r.rotulo)}</b><em>${C.esc(textoRk(id, r.v))}</em></li>`).join('')}</ol>`
        : '<p class="ej-rk-vazio">Ninguém ainda. Seja o primeiro!</p>'}
      ${eu ? `<p class="ej-rk-eu">${C.esc(eu)}</p>` : ''}
      <div class="ej-tut-bts">${sobre ? '<button class="jr-btn jr-btn-ouro" data-ej="tut-voltar">↩ Voltar ao jogo</button>' : '<button class="jr-btn jr-btn-sec" data-ej="fechar">Fechar</button><button class="jr-btn jr-btn-ouro" data-ej="tut-jogar">▶ Jogar</button>'}</div></div>`;
    if (alvo.dataset.h !== html) { alvo.innerHTML = html; alvo.dataset.h = html; }
  };
  pintar();
  rkTimer = setInterval(pintar, 1000);
}
function figuraTutorial(id, i) {
  if (id === 'shisima') {
    const ini = inicioShisima();
    if (i === 0) return svgShisima(ini);
    if (i === 1) { const p = ini.slice(); return svgShisima(p, { setas: [[4, CENTRO], [3, 2]] }); }
    if (i === 2) { const p = Array(9).fill(0); p[2] = 1; p[CENTRO] = 1; p[6] = 1; p[0] = 2; p[1] = 2; p[4] = 2; return svgShisima(p, { linha: [2, CENTRO, 6] }); }
    const p = Array(9).fill(0); p[3] = 1; p[5] = 1; p[CENTRO] = 1; p[7] = 2; p[0] = 2; p[1] = 2; return svgShisima(p, { centroBrilha: true });
  }
  if (id === 'yote') {
    const L = 5, Cc = 6;
    if (i === 0) return svgYote(L, Cc, {}, { maos: [8, 8] });
    if (i === 1) return svgYote(L, Cc, { 14: 1, 8: 2 }, { setas: [[14, 15]], maos: [7, 7] });
    if (i === 2) return svgYote(L, Cc, { 13: 1, 14: 2 }, { setas: [[13, 15]] });
    if (i === 3) return svgYote(L, Cc, { 15: 1, 3: 2, 22: 2 }, { x: [14, 22], maos: [6, 5] });
    return svgYote(L, Cc, { 7: 1, 15: 1, 20: 1 }, { maos: [3, 0] });
  }
  if (id === 'linha_tempo') {
    const cs = (jogosExpo().linha_tempo.cartas || []).slice(0, 3);
    return `<div class="ej-ex-cartas">${cs.map((c, k) => `<div class="ej-carta mini${i === 2 ? ' certa' : ''}">${i === 2 ? `<b>${c.ano}</b>` : ''}<span>${C.esc(c.txt)}</span></div>${k < cs.length - 1 ? '<i>→</i>' : ''}`).join('')}</div>`;
  }
  const f = (jogosExpo().mito_verdade.frases || [])[0];
  return f ? `<div class="ej-ex-frase"><p>“${C.esc(f.t)}”</p><div class="ej-mv-bts mini"><span class="ej-mito">MITO</span><span class="ej-verd">VERDADE</span></div></div>` : '';
}

// ── o adversário: o rosto, o nome e um balão curto ──
const FRASES = {
  pensa: ['Hmm…', 'Deixa eu pensar…', 'Hum, hum…', 'Vejamos…'],
  boa: ['Boa jogada!', 'Opa! Essa foi boa!', 'Eita!', 'Você é bom nisso!'],
  peguei: ['Te peguei!', 'Essa é minha!', 'Hehe!', 'Ahá!'],
  ganhei: ['Ganhei! Quer a revanche?', 'Essa foi minha! 😄', 'Venci! Bora de novo?'],
  perdi: ['Você ganhou! Muito bem!', 'Ah, não! Revanche!', 'Mandou bem demais!'],
  empate: ['Empate! Quase!', 'Ninguém ganhou… revanche?'],
};
// 🎲 PROMPT-261: a mesa — o status numa linha, a jogada no canto e o tabuleiro grande entre os dois jogadores (rosto pequeno, nome e ✋)
const mesaHtml = (yote, L = 5, Cc = 6) => `<div class="ej-jogo"><div class="ej-topo2"><p class="ej-status" id="ej-status"></p><small class="ej-cont" id="ej-cont"></small></div>
  <div class="ej-area" id="ej-area">
    <div class="ej-jog op">${aberto.op.img ? `<img src="${C.esc(aberto.op.img)}" alt="" draggable="false"/>` : '<span class="ej-op-ic">🤖</span>'}<b><i class="ej-cor ej-p2"></i>${C.esc(aberto.op.nome)}</b>
      ${yote ? '<button class="ej-mao op" data-ej="mao-op" id="ej-mao-op"></button>' : ''}<div class="ej-balao" id="ej-balao" hidden></div></div>
    <div class="ej-tab${yote ? ' ej-yote' : ''}" id="ej-tab"${yote ? ` style="--cols:${Cc};--lins:${L}"` : ''}></div>
    <div class="ej-jog eu"><span class="ej-op-ic">🙂</span><b><i class="ej-cor ej-p1"></i>Você</b>${yote ? '<span class="ej-mao eu" id="ej-mao-eu"></span>' : ''}</div>
  </div><div class="ej-fim" id="ej-fim" hidden></div></div>`;
// o tamanho do tabuleiro pela área que sobra (px, sem depender de container query nem de flex sem tamanho)
export function dimensionarTabExpo(area, tab) {
  if (!area || !tab) return;
  const ratio = tab.classList.contains('ej-yote') ? (Number(tab.style.getPropertyValue('--cols')) || 6) / (Number(tab.style.getPropertyValue('--lins')) || 5) : 1;
  const ar = area.getBoundingClientRect(), gap = parseFloat(getComputedStyle(area).columnGap) || 10;
  const lados = [...area.children].filter(e => e !== tab && !e.classList.contains('ej-fim')).reduce((t, e) => t + e.getBoundingClientRect().width, 0);
  let h = area.clientHeight, w = area.clientWidth - lados - gap * 2;
  if (h < 80) h = Math.max(160, innerHeight * 0.6);   // a área ainda sem altura: usa a tela
  const bh = Math.max(110, Math.floor(Math.min(h, w / ratio)));
  tab.style.height = bh + 'px';
  tab.style.width = Math.floor(bh * ratio) + 'px';
}
const dimensionar = () => { dimensionarTabExpo($('ej-area'), $('ej-tab')); requestAnimationFrame(() => dimensionarTabExpo($('ej-area'), $('ej-tab'))); };
function falar(tipo, txt) {
  const el = $('ej-balao');
  if (!el) return;
  el.textContent = txt || sortear(FRASES[tipo] || ['…']);
  el.hidden = false;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  clearTimeout(falar.t); falar.t = setTimeout(() => { if ($('ej-balao')) $('ej-balao').hidden = true; }, 2600);
}
// o fim de Shisima e Yoté: vitória / empate / derrota, a frase do jogo e os pontos (vale o melhor)
async function fimTabuleiro(res) {
  const j = aberto.j, pts = Number(j.pontos?.[res]) || 0;
  aberto.fim = res;
  falar(res === 'vitoria' ? 'perdi' : res === 'derrota' ? 'ganhei' : 'empate');
  C.tocar(res === 'vitoria' ? 'acerto' : res === 'derrota' ? 'erro' : 'clique');
  if (res === 'vitoria') C.contar(aberto.id, 1);   // 🏆 +1 vitória (PROMPT-261)
  const st = await C.gravar(aberto.id, pts);
  const el = $('ej-fim');
  if (!el || !aberto) return;
  el.innerHTML = `<b class="ej-fim-t">${res === 'vitoria' ? '🎉 Você venceu!' : res === 'derrota' ? `${C.esc(aberto.op.nome)} venceu!` : '🤝 Empate!'}</b>
    <span>+${pts} pts · sua melhor: <b>${C.melhor(aberto.id)}</b>${avisoGravar(st)}</span>
    <p class="ej-fim-e">🌍 ${C.esc(j.fim || '')}</p>
    <div class="ej-fim-bts"><button class="jr-btn jr-btn-sec" data-ej="fechar">Fechar</button><button class="jr-btn jr-btn-ouro" data-ej="de-novo">🔁 Jogar de novo</button></div>`;
  el.hidden = false;
}
export const avisoGravar = (st) => (st === 'previa' ? ' · 👀 prévia: não gravado' : st === 'prof' ? ' · professora: não grava' : st === 'fechado' ? ' · 🔒 exposição fechada: não gravado'
  : st === 'erro' ? ' · ⚠️ não gravou' : st === 'teste' ? ' · conta de teste' : '');

// ══ 🔷 Shisima ══
function pontosShisima(cx, cy, r) { return [...Array(8).keys()].map(i => { const a = -Math.PI / 2 + i * Math.PI / 4; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }).concat([[cx, cy]]); }
function comecarShisima() {
  const s = { pos: inicioShisima(), vez: Math.random() < 0.5 ? 1 : 2, sel: null, jogadas: 0, fim: null, ult: null };
  aberto.sh = s;
  $('ej-c').innerHTML = mesaHtml(false);
  dimensionar();
  pintarShisima();
  if (s.vez === 2) { falar(null, 'Eu começo!'); depois(1100, jogaPcShisima); }
  else falar(null, 'Você começa!');
}
function pintarShisima() {
  const s = aberto.sh, P = pontosShisima(150, 150, 118), dest = s.sel !== null ? vizinhosShisima(s.sel).filter(a => s.pos[a] === 0) : [];
  const lin = [...Array(8).keys()].map(i => `<line x1="${P[i][0]}" y1="${P[i][1]}" x2="${P[(i + 1) % 8][0]}" y2="${P[(i + 1) % 8][1]}"/><line x1="${P[i][0]}" y1="${P[i][1]}" x2="150" y2="150"/>`).join('');
  const linha = s.fim && s.fim !== 'empate' ? linhaShisima(s.pos, s.fim === 'vitoria' ? 1 : 2) : null;
  const pts = s.pos.map((v, k) => {
    const [x, y] = P[k], d = dest.includes(k), u = s.ult && (s.ult.para === k);
    return `<g data-sh="${k}" class="ej-ponto${d ? ' dest' : ''}"><circle class="ej-alvo" cx="${x}" cy="${y}" r="26"/>`
      + (v ? `<circle class="ej-p${v}${s.sel === k ? ' sel' : ''}${u ? ' ult' : ''}" cx="${x}" cy="${y}" r="18"/>` : `<circle class="ej-vazio${d ? ' dest' : ''}" cx="${x}" cy="${y}" r="${d ? 11 : 7}"/>`) + '</g>';
  }).join('');
  $('ej-tab').innerHTML = `<svg viewBox="0 0 300 300" class="ej-svg ej-jogo-svg"><g class="ej-linhas">${lin}</g>${linha ? `<polyline class="ej-linha" points="${linha.map(k => P[k].join(',')).join(' ')}"/>` : ''}${pts}</svg>`;
  $('ej-status').innerHTML = s.fim ? '' : s.vez === 1 ? (s.sel === null ? '🟡 Sua vez: toque numa peça <b>amarela</b>' : '🟡 Toque num ponto verde para mover') : `${C.esc(aberto.op.nome)} está pensando…`;
  $('ej-cont').textContent = `Jogada ${Math.min(s.jogadas + 1, aberto.j.limite_jogadas)}/${aberto.j.limite_jogadas}`;
}
function tocarShisima(k) {
  const s = aberto.sh;
  if (s.fim || s.vez !== 1) return;
  if (s.pos[k] === 1) { s.sel = s.sel === k ? null : k; C.tocar('clique'); pintarShisima(); return; }
  if (s.sel === null || s.pos[k] !== 0 || !vizinhosShisima(s.sel).includes(k)) return;
  const m = { de: s.sel, para: k };
  s.pos = moverShisima(s.pos, m); s.sel = null; s.ult = m;
  C.tocar('clique');
  if (passoShisima(1)) return;
  if (m.para === CENTRO && Math.random() < 0.5) falar('boa');
  depois(900, jogaPcShisima);
}
// depois de uma jogada de p: vitória, limite, e a vez (quem não tem jogada perde a vez)
function passoShisima(p) {
  const s = aberto.sh;
  s.jogadas++;
  if (linhaShisima(s.pos, p)) { s.fim = p === 1 ? 'vitoria' : 'derrota'; pintarShisima(); fimTabuleiro(s.fim); return true; }
  if (s.jogadas >= aberto.j.limite_jogadas) { s.fim = 'empate'; pintarShisima(); fimTabuleiro('empate'); return true; }
  s.vez = outro(p);
  if (!movimentosShisima(s.pos, s.vez).length) {   // sem jogada: passa a vez
    falar(null, s.vez === 1 ? 'Você está sem jogada: passa a vez!' : 'Fiquei sem jogada! Sua vez.');
    s.vez = p;
  }
  pintarShisima();
  if (s.vez === 2 && p === 2) depois(1300, jogaPcShisima);
  return false;
}
function jogaPcShisima() {
  const s = aberto?.sh;
  if (!s || s.fim || s.vez !== 2) return;
  if (Math.random() < 0.35) falar('pensa');
  const m = iaShisima(s.pos);
  if (!m) { passoShisima(2); return; }
  s.pos = moverShisima(s.pos, m); s.ult = m;
  C.tocar('clique');
  if (!passoShisima(2) && linhaPerto(s.pos)) falar('peguei');
}
const linhaPerto = (pos) => movimentosShisima(pos, 2).some(m => linhaShisima(moverShisima(pos, m), 2));

// ══ ⚫ Yoté ══
function comecarYote() {
  const j = aberto.j, [L, Cc] = Array.isArray(j.tabuleiro) ? j.tabuleiro.map(Number) : [5, 6];
  const y = { st: inicioYote(L, Cc, Number(j.pecas_na_mao) || 8), vez: Math.random() < 0.5 ? 1 : 2, sel: null, remover: false, jogadas: 0, fim: null, ult: [] };
  aberto.yo = y;
  $('ej-c').innerHTML = mesaHtml(true, L, Cc);
  dimensionar();
  pintarYote();
  if (y.vez === 2) { falar(null, 'Eu começo!'); depois(1100, jogaPcYote); }
  else falar(null, 'Você começa!');
}
function destinosYote() {
  const y = aberto.yo;
  if (y.sel === null) return new Map();
  return new Map(acoesYote(y.st, 1).filter(a => a.de === y.sel).map(a => [a.para, a]));
}
function pintarYote() {
  const y = aberto.yo, st = y.st, dest = destinosYote();
  $('ej-tab').innerHTML = st.b.map((v, i) => {
    const d = dest.get(i), rm = y.remover && v === 2;
    return `<button class="ej-cel${d ? (d.tipo === 'capturar' ? ' cap' : ' dest') : ''}${rm ? ' rm' : ''}${y.ult.includes(i) ? ' ult' : ''}" data-yo="${i}">${v ? `<i class="ej-p${v}${y.sel === i ? ' sel' : ''}"></i>` : ''}</button>`;
  }).join('');
  $('ej-mao-op').innerHTML = `✋ <b>${st.mao[2]}</b>`;
  $('ej-mao-op').classList.toggle('rm', y.remover && st.mao[2] > 0);
  $('ej-mao-op').disabled = !(y.remover && st.mao[2] > 0);
  $('ej-mao-eu').innerHTML = `✋ <b>${st.mao[1]}</b>`;
  $('ej-status').innerHTML = y.fim ? '' : y.vez !== 1 ? `${C.esc(aberto.op.nome)} está pensando…`
    : y.remover ? '🎯 Bônus! Tire uma peça <b>roxa</b>' + (st.mao[2] > 0 ? ' ou toque no ✋ dele' : '')
    : y.sel !== null ? '🟡 Verde: andar · laranja: capturar'
    : st.mao[1] > 0 ? '🟡 Sua vez: coloque numa casa vazia ou ande com uma peça' : '🟡 Sua vez: ande com uma peça sua';
  $('ej-cont').textContent = `Jogada ${Math.min(y.jogadas + 1, aberto.j.limite_jogadas)}/${aberto.j.limite_jogadas}`;
}
function tocarYote(i) {
  const y = aberto.yo, st = y.st;
  if (y.fim || y.vez !== 1) return;
  if (y.remover) { if (st.b[i] === 2) { y.st = removerYote(st, { casa: i }, 1); y.remover = false; C.tocar('clique'); passoYote(1); } return; }
  if (st.b[i] === 1) { y.sel = y.sel === i ? null : i; C.tocar('clique'); pintarYote(); return; }
  const d = destinosYote().get(i);
  if (d) { jogarYote(d); return; }
  if (y.sel !== null) { y.sel = null; pintarYote(); return; }
  if (st.b[i] === 0 && st.mao[1] > 0) jogarYote({ tipo: 'colocar', para: i });
}
function jogarYote(a) {
  const y = aberto.yo;
  y.st = aplicarYote(y.st, a, 1); y.sel = null; y.ult = [a.para];
  C.tocar(a.tipo === 'capturar' ? 'acerto' : 'clique');
  if (a.tipo === 'capturar') {
    falar('boa');
    if (pecasYote(y.st, 2) > 0 && podeRemoverYote(y.st, 1)) { y.remover = true; pintarYote(); return; }
  }
  passoYote(1);
}
function passoYote(p) {
  const y = aberto.yo, st = y.st;
  y.jogadas++;
  if (pecasYote(st, outro(p)) === 0) { y.fim = p === 1 ? 'vitoria' : 'derrota'; pintarYote(); fimTabuleiro(y.fim); return; }
  if (y.jogadas >= aberto.j.limite_jogadas) {   // no limite: ganha quem tem mais peças
    const a = pecasYote(st, 1), b = pecasYote(st, 2);
    y.fim = a > b ? 'vitoria' : b > a ? 'derrota' : 'empate';
    pintarYote(); fimTabuleiro(y.fim); return;
  }
  y.vez = outro(p);
  if (!acoesYote(st, y.vez).length) {
    if (!acoesYote(st, p).length) { const a = pecasYote(st, 1), b = pecasYote(st, 2); y.fim = a > b ? 'vitoria' : b > a ? 'derrota' : 'empate'; pintarYote(); fimTabuleiro(y.fim); return; }
    falar(null, y.vez === 1 ? 'Você está sem jogada: passa a vez!' : 'Fiquei sem jogada! Sua vez.');
    y.vez = p;
  }
  pintarYote();
  if (y.vez === 2) depois(1000, jogaPcYote);
}
function jogaPcYote() {
  const y = aberto?.yo;
  if (!y || y.fim || y.vez !== 2) return;
  if (Math.random() < 0.3) falar('pensa');
  const a = iaYote(y.st);
  if (!a) { passoYote(2); return; }
  y.st = aplicarYote(y.st, a, 2); y.ult = [a.para];
  if (a.tipo === 'capturar') {
    falar('peguei'); C.tocar('erro');
    if (podeRemoverYote(y.st, 2)) {
      const r = escolhaRemocaoYote(y.st, 2);
      if (r?.casa !== undefined) y.ult.push(r.casa);
      y.st = removerYote(y.st, r, 2);
    }
  } else C.tocar('clique');
  passoYote(2);
}

// ══ 📜 Linha do tempo ══
function comecarLinha() {
  const j = aberto.j, n = Number(j.por_rodada) || 5;
  const ant = aberto.linhaAnt || [];
  const pool = (j.cartas || []).map((c, i) => ({ ...c, i }));
  const novas = embaralhar(pool.filter(c => !ant.includes(c.i))), velhas = embaralhar(pool.filter(c => ant.includes(c.i)));
  const cs = novas.concat(velhas).slice(0, n);
  aberto.linhaAnt = cs.map(c => c.i);
  aberto.li = { cartas: cs, sel: null, conferido: false };
  pintarLinha();
}
function pintarLinha() {
  const li = aberto.li;
  if (li.conferido) {
    const carta = (c, cls, marca) => `<div class="ej-carta comp${cls}" data-carta-ver="${c.i}">${marca}<b>${c.ano}</b><span>${C.esc(c.txt)}</span></div>`;
    $('ej-c').innerHTML = `<div class="ej-linha-comp">
      <div class="ej-linha-lbl">Sua ordem</div>
      <div class="ej-cartas comp">${li.cartas.map(c => carta(c, li.marcas?.[c.i] ? ' certa' : ' errada', `<i class="ej-marca">${li.marcas?.[c.i] ? '✔' : '✖'}</i>`)).join('')}</div>
      <div class="ej-linha-lbl ok">Ordem certa</div>
      <div class="ej-cartas comp">${li.ordem.map(c => carta(c, ' certa', '')).join('')}</div>
      <p class="ej-linha-zoom" id="ej-linha-zoom">${li.zoom ? li.zoom : '👆 Toque numa carta para ler o texto inteiro.'}</p>
      <div class="ej-linha-rod">${li.rodape || ''}</div></div>`;
    return;
  }
  $('ej-c').innerHTML = `<div class="ej-linha-t"><span>⬅ mais antigo</span><span>Arraste ou toque em duas cartas para trocar</span><span>mais recente ➡</span></div>
    <div class="ej-cartas" id="ej-cartas">${li.cartas.map((c, k) => `<div class="ej-carta${li.sel === k ? ' sel' : ''}" data-carta="${k}"><em>${k + 1}</em><span>${C.esc(c.txt)}</span></div>`).join('')}</div>
    <div class="ej-linha-rod" id="ej-linha-rod"><button class="jr-btn jr-btn-ouro" data-ej="conferir">✔ Conferir</button></div>`;
}
function trocarCartas(a, b) {
  const l = aberto.li.cartas;
  if (a === b || a < 0 || b < 0) return;
  const [c] = l.splice(a, 1); l.splice(b, 0, c);   // arrastar: a carta vai para o lugar da outra (as do meio andam)
}
async function conferirLinha() {
  const li = aberto.li, j = aberto.j;
  const ordem = [...li.cartas].sort((a, b) => a.ano - b.ano);
  li.marcas = Object.fromEntries(li.cartas.map((c, k) => [c.i, ordem[k].i === c.i]));
  const certas = Object.values(li.marcas).filter(Boolean).length, pts = certas * (Number(j.pontos_carta) || 5);
  li.conferido = true; li.ordem = ordem; li.zoom = '';
  C.tocar(certas === li.cartas.length ? 'acerto' : 'clique');
  if (certas === li.cartas.length) C.contar(aberto.id, 1);   // 🏆 rodada perfeita (PROMPT-261)
  const rod = (st) => `<p class="ej-linha-res">Você acertou <b>${certas}/${li.cartas.length}</b> · +${pts} pts${st === undefined ? '' : ` · sua melhor: <b>${C.melhor(aberto.id)}</b>${avisoGravar(st)}`}</p>
    <button class="jr-btn jr-btn-sec" data-ej="fechar">Fechar</button><button class="jr-btn jr-btn-ouro" data-ej="de-novo">🔁 Nova rodada</button>`;
  li.rodape = rod();
  pintarLinha();
  const st = await C.gravar(aberto.id, pts);
  if (aberto?.li !== li) return;
  li.rodape = rod(st);
  pintarLinha();
}
// arrastar (computador e celular): segura a carta e solta em cima de outra. Toque rápido: escolhe; o 2º toque troca.
let arr = null;
function arrastarIni(e) {
  const c = e.target.closest('[data-carta]');
  if (!c || !aberto?.li || aberto.li.conferido) return;
  arr = { de: Number(c.dataset.carta), x: e.clientX, y: e.clientY, moveu: false, el: c };
  try { c.setPointerCapture?.(e.pointerId); } catch (_) {}
  c.addEventListener('pointermove', arrastarMove);
  c.addEventListener('pointerup', arrastarFim, { once: true });
  c.addEventListener('pointercancel', () => { arr?.el.classList.remove('arrastando'); arr = null; }, { once: true });
}
function arrastarMove(e) {
  if (!arr) return;
  if (!arr.moveu && Math.hypot(e.clientX - arr.x, e.clientY - arr.y) > 10) { arr.moveu = true; arr.el.classList.add('arrastando'); }
  if (!arr.moveu) return;
  const alvo = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-carta]');
  for (const x of document.querySelectorAll('.ej-carta.alvo')) if (x !== alvo) x.classList.remove('alvo');
  if (alvo && alvo !== arr.el) alvo.classList.add('alvo');
}
function arrastarFim(e) {
  const a = arr; arr = null;
  if (!a) return;
  a.el.removeEventListener('pointermove', arrastarMove);
  a.el.classList.remove('arrastando');
  const li = aberto?.li;
  if (!li) return;
  if (a.moveu) {
    const alvo = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-carta]');
    if (alvo) { trocarCartas(a.de, Number(alvo.dataset.carta)); C.tocar('clique'); }
    li.sel = null; pintarLinha(); return;
  }
  // toque: escolhe; o 2º toque em outra carta troca as duas de lugar
  if (li.sel === null) li.sel = a.de;
  else if (li.sel === a.de) li.sel = null;
  else { const l = li.cartas; [l[li.sel], l[a.de]] = [l[a.de], l[li.sel]]; li.sel = null; C.tocar('clique'); }
  pintarLinha();
}

// ══ 🤔 Mito ou verdade ══
function comecarMito() {
  const j = aberto.j, n = Number(j.por_rodada) || 15, ant = aberto.mitoAnt || [];
  const pool = (j.frases || []).map((f, i) => ({ ...f, i }));
  const fs = embaralhar(pool.filter(f => !ant.includes(f.i))).concat(embaralhar(pool.filter(f => ant.includes(f.i)))).slice(0, n);
  aberto.mitoAnt = fs.map(f => f.i);
  aberto.mv = { fs, k: 0, acertos: 0, resp: null };
  pintarMito();
}
function pintarMito() {
  const mv = aberto.mv, f = mv.fs[mv.k], r = mv.resp;
  $('expo-jogo').classList.toggle('ej-mv-resp', r !== null);
  $('ej-c').innerHTML = `<div class="ej-mv"><div class="ej-mv-topo"><span>Frase ${mv.k + 1}/${mv.fs.length}</span><span>✔ ${mv.acertos}</span></div>
    <p class="ej-mv-frase">“${C.esc(f.t)}”</p>
    ${r === null ? '<div class="ej-mv-bts"><button class="ej-mito" data-ej="mito">🙅 MITO</button><button class="ej-verd" data-ej="verdade">✅ VERDADE</button></div>'
      : `<div class="ej-mv-res ${r === f.v ? 'ok' : 'nao'} ${f.v ? 'verd' : 'mito'}"><b>${r === f.v ? '✔ Acertou!' : '✖ Errou!'}</b> <strong>${f.v ? '✅ É VERDADE' : '🙅 É MITO'}</strong></div>
        <div class="ej-mv-exp"><p>💡 ${C.esc(f.e)}</p><button class="jr-btn jr-btn-ouro" data-ej="mv-prox">${mv.k + 1 >= mv.fs.length ? 'Ver resultado →' : 'Próxima →'}</button></div>`}</div>`;
}
function responderMito(v) {
  const mv = aberto.mv;
  if (mv.resp !== null) return;
  mv.resp = v;
  const ok = v === mv.fs[mv.k].v;
  if (ok) mv.acertos++;
  C.tocar(ok ? 'acerto' : 'erro');
  pintarMito();   // não avança sozinho: tempo para ler
}
async function proximaMito() {
  const mv = aberto.mv;
  mv.k++; mv.resp = null;
  if (mv.k < mv.fs.length) { pintarMito(); return; }
  $('expo-jogo').classList.remove('ej-mv-resp');
  const pts = Math.min(Number(aberto.j.pontos_max) || 30, mv.acertos * (Number(aberto.j.pontos_acerto) || 2));
  $('ej-c').innerHTML = `<div class="ej-mv-fim"><b class="ej-fim-t">Você acertou <em>${mv.acertos}</em> de ${mv.fs.length}</b><span id="ej-mv-pts">+${pts} pts</span>
    <div class="ej-fim-bts"><button class="jr-btn jr-btn-sec" data-ej="fechar">Fechar</button><button class="jr-btn jr-btn-ouro" data-ej="de-novo">🔁 Nova rodada</button></div></div>`;
  C.tocar(mv.acertos >= mv.fs.length * 0.7 ? 'acerto' : 'clique');
  C.contar(aberto.id, mv.acertos);   // 🏆 o melhor de acertos (PROMPT-261)
  const st = await C.gravar(aberto.id, pts);
  if ($('ej-mv-pts')) $('ej-mv-pts').innerHTML = `+${pts} pts · sua melhor: <b>${C.melhor(aberto.id)}</b>${avisoGravar(st)}`;
}

// ── os toques dentro da janela do jogo ──
function cliqueNoJogo(e) {
  if (!aberto) return;
  const b = e.target.closest('[data-ej]'), acao = b?.dataset.ej;
  if (acao === 'tut-ant') { mostrarTutorial(aberto.id, Math.max(0, aberto.tut.i - 1), aberto.tut.fim); return; }
  if (acao === 'tut-prox') { C.tocar('clique'); mostrarTutorial(aberto.id, aberto.tut.i + 1, aberto.tut.fim); return; }
  if (acao === 'tut-voltar') { clearInterval(rkTimer); $('ej-tut-sobre')?.remove(); aberto.tut = null; C.tocar('clique'); return; }
  if (acao === 'tut-jogar') { C.tocar('clique'); aberto.tut = null; comecar(); return; }
  const ver = e.target.closest('[data-carta-ver]');
  if (ver && aberto.li?.conferido) {   // a carta inteira (no celular o texto fica cortado)
    const c = (aberto.j.cartas || [])[Number(ver.dataset.cartaVer)];
    if (c) { aberto.li.zoom = `📜 <b>${c.ano}</b> · ${C.esc(c.txt)}`; $('ej-linha-zoom').innerHTML = aberto.li.zoom; }
    return;
  }
  if (acao === 'fechar') { fecharJogo(); return; }
  if (acao === 'de-novo') { C.tocar('clique'); comecar(); return; }
  if (acao === 'conferir') { conferirLinha(); return; }
  if (acao === 'mito' || acao === 'verdade') { responderMito(acao === 'verdade'); return; }
  if (acao === 'mv-prox') { C.tocar('clique'); proximaMito(); return; }
  if (acao === 'mao-op') { const y = aberto.yo; if (y?.remover && y.st.mao[2] > 0) { y.st = removerYote(y.st, { mao: true }, 1); y.remover = false; C.tocar('clique'); passoYote(1); } return; }
  const sh = e.target.closest('[data-sh]');
  if (sh && aberto.sh) { tocarShisima(Number(sh.dataset.sh)); return; }
  const yo = e.target.closest('[data-yo]');
  if (yo && aberto.yo) tocarYote(Number(yo.dataset.yo));
}

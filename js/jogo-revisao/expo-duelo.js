// ⚔️ PROMPT-260: desafiar outra pessoa na Exposição no Shisima ou no Yoté, ao vivo (cada um no seu aparelho).
// Mesmo caminho das Damas entre colegas (convite com prazo, aceitar/recusar por transação, "on" com onDisconnect para saber quem saiu),
// num subnó próprio da Praça (a regra de jogo_revisao_praca já deixa o visitante gravar):
//   {base}/convites/{quem recebe} = { id, de, de_nome, jogo, ts }
//   {base}/partidas/{id} = { jogo, a: { uid, nome }, b: { uid, nome }, estado: 'convite'|'jogando'|'recusou'|'expirou'|'cancelou'|'ocupado',
//                            criado, comeca: 'a'|'b', inicio, jogadas: { n: { p, m?, passa?: 'tempo'|'sem', ts } }, on: { uid: true }, fim: { perdeu, motivo } }
// As jogadas são a fonte da verdade: os dois aparelhos refazem a partida desde o começo (regras do PROMPT-259) e chegam no mesmo tabuleiro.
// 'a' é a peça 1 das regras (embaixo) e 'b' a peça 2; quem é 'b' vê o tabuleiro girado, com as suas peças embaixo.
import { inicioShisima, movimentosShisima, moverShisima, linhaShisima, CENTRO,
  inicioYote, acoesYote, aplicarYote, removerYote, podeRemoverYote, pecasYote, escolhaRemocaoYote } from '/js/jogo-revisao/expo-jogos-regras.js';
import { dimensionarTabExpo } from '/js/jogo-revisao/expo-jogos.js';   // 🎲 PROMPT-261: o tabuleiro no tamanho certo

export const TEMPO_JOGADA_S = 30, PASSES_MAX = 3, CONVITE_S = 30, SAIU_S = 20;
const $ = (id) => document.getElementById(id);
const outroLado = (l) => (l === 'a' ? 'b' : 'a');
const pecaDe = (l) => (l === 'a' ? 1 : 2);
const limpo = (o) => JSON.parse(JSON.stringify(o));   // o Firebase não aceita undefined
let C = null, conv = null, espera = null, pt = null, ouvindo = false;

// ── as regras ao vivo: refaz a partida a partir das jogadas ──
export function listaJogadas(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return Object.keys(v).filter(k => /^\d+$/.test(k)).sort((a, b) => a - b).map(k => v[k]).filter(Boolean);
}
export function refazer(jogo, cfg, comeca, jogadas) {
  const lim = Number(cfg?.limite_jogadas) || (jogo === 'yote' ? 60 : 30);
  const r = { jogo, vez: comeca === 'b' ? 'b' : 'a', fim: null, n: 0, ult: [], tempo: { a: 0, b: 0 }, ultimoTs: 0 };
  if (jogo === 'yote') { const [L, Cc] = Array.isArray(cfg?.tabuleiro) ? cfg.tabuleiro.map(Number) : [5, 6]; r.st = inicioYote(L, Cc, Number(cfg?.pecas_na_mao) || 8); }
  else r.pos = inicioShisima();
  const porPecas = () => { const a = pecasYote(r.st, 1), b = pecasYote(r.st, 2); return a > b ? 'a' : b > a ? 'b' : null; };
  for (const j of jogadas) {
    if (r.fim) break;
    const l = j.p === 'b' ? 'b' : 'a', P = pecaDe(l);
    r.ultimoTs = Number(j.ts) || r.ultimoTs;
    if (j.m && !j.passa) {
      r.tempo[l] = 0;
      if (jogo === 'yote') {
        const a = acoesYote(r.st, P).find(x => x.tipo === j.m.tipo && x.para === j.m.para && (x.de ?? null) === (j.m.de ?? null));
        if (a) {
          r.st = aplicarYote(r.st, a, P); r.ult = [a.para];
          if (a.tipo === 'capturar' && j.m.rm && podeRemoverYote(r.st, P)) {
            const rm = j.m.rm.mao ? { mao: true } : { casa: Number(j.m.rm.casa) };
            if (rm.mao ? r.st.mao[pecaDe(outroLado(l))] > 0 : r.st.b[rm.casa] === pecaDe(outroLado(l))) { r.st = removerYote(r.st, rm, P); if (!rm.mao) r.ult.push(rm.casa); }
          }
          if (pecasYote(r.st, pecaDe(outroLado(l))) === 0) r.fim = { vencedor: l, motivo: 'pecas' };
        }
      } else {
        const m = movimentosShisima(r.pos, P).find(x => x.de === j.m.de && x.para === j.m.para);
        if (m) { r.pos = moverShisima(r.pos, m); r.ult = [m.para]; if (linhaShisima(r.pos, P)) r.fim = { vencedor: l, motivo: 'linha' }; }
      }
    } else if (j.passa === 'tempo') {
      r.tempo[l]++;
      if (r.tempo[l] >= PASSES_MAX) r.fim = { vencedor: outroLado(l), motivo: 'tempo' };
    }
    r.n++;
    r.vez = outroLado(l);
    if (!r.fim && r.n >= lim) r.fim = { vencedor: jogo === 'yote' ? porPecas() : null, motivo: 'limite' };
  }
  // ninguém pode jogar (Yoté): acaba pelas peças
  if (!r.fim && jogo === 'yote' && !acoesYote(r.st, 1).length && !acoesYote(r.st, 2).length) r.fim = { vencedor: porPecas(), motivo: 'travou' };
  r.semJogada = !r.fim && (jogo === 'yote' ? !acoesYote(r.st, pecaDe(r.vez)).length : !movimentosShisima(r.pos, pecaDe(r.vez)).length);
  return r;
}

// ══ configuração: ctx = { pai, esc, tocar, fb: { db, ref, set, remove, push, onValue, runTransaction, onDisconnect }, base() → caminho,
//   agora() → hora do servidor, eu() → { uid, nome }, podeReceber() → bool, cfg(jogo) → do JSON, gravar(jogo, pts) → Promise<status>,
//   comoJogar(jogo), jogando(bool) (avisa o online), avisoGravar(status) → texto, fecharOutros() } ══
export function configurarDueloExpo(ctx) {
  if (C) return;
  C = ctx;
  const html = `
  <div id="ed-convite" class="al-fundo expo-modal ed-fundo" hidden role="dialog" aria-label="Convite">
    <div class="al-caixa expo-caixa ed-caixa-p"><p class="ed-conv-t" id="ed-conv-t"></p><div class="ed-barra"><i id="ed-conv-tempo"></i></div>
      <div class="ed-bts"><button class="jr-btn jr-btn-sec" id="ed-conv-nao">Recusar</button><button class="jr-btn jr-btn-ouro" id="ed-conv-sim">✅ Aceitar</button></div>
      <button class="ed-link" id="ed-conv-tut">❓ Como jogar</button></div>
  </div>
  <div id="ed-espera" class="al-fundo expo-modal ed-fundo" hidden role="dialog" aria-label="Convite enviado">
    <div class="al-caixa expo-caixa ed-caixa-p"><p class="ed-conv-t" id="ed-esp-t"></p><div class="ed-barra" id="ed-esp-barra"><i id="ed-esp-tempo"></i></div>
      <div class="ed-bts"><button class="jr-btn jr-btn-sec" id="ed-esp-x">Cancelar</button></div></div>
  </div>
  <div id="ed-jogo" class="al-fundo expo-modal" hidden role="dialog" aria-label="Partida ao vivo">
    <div class="al-caixa expo-caixa expo-fixa ej-caixa">
      <div class="al-topo"><b id="ed-tit">⚔️</b><span class="ej-topo-bts"><button class="ej-ajuda" id="ed-ajuda" aria-label="Como jogar">❓</button><button class="bt-lista-x" id="ed-x" aria-label="Desistir">✕</button></span></div>
      <div class="ej-c" id="ed-c"></div>
    </div>
  </div>`;
  const antes = $('expo-jogos-menu');   // antes das janelas do 259: o ❓ (tutorial) abre por cima
  if (antes) antes.insertAdjacentHTML('beforebegin', html); else (ctx.pai || document.body).insertAdjacentHTML('beforeend', html);
  $('ed-conv-sim').addEventListener('click', () => responderConvite(true));
  $('ed-conv-nao').addEventListener('click', () => responderConvite(false));
  $('ed-conv-tut').addEventListener('click', () => { if (conv) C.comoJogar(conv.jogo); });
  $('ed-esp-x').addEventListener('click', cancelarEspera);
  $('ed-ajuda').addEventListener('click', () => { if (pt) C.comoJogar(pt.jogo); });
  $('ed-x').addEventListener('click', () => { if (!pt || pt.terminou) { fecharPartida(); return; } pedirDesistir(); });
  $('ed-c').addEventListener('click', cliqueNaPartida);
  addEventListener('resize', () => { if (pt?.montado) dimensionarTabExpo($('ed-area'), $('ed-tab')); });
}
export const dueloAtivoExpo = () => !!(pt && !pt.terminou) || !!espera;
const P = (...s) => C.fb.ref(C.fb.db, [C.base(), ...s].join('/'));
const nomeJogo = (jogo) => C.cfg(jogo)?.nome || jogo;
const iconeJogo = (jogo) => C.cfg(jogo)?.icone || '🎲';
const primeiro = (n) => String(n || 'Visitante').split(' – ')[0];
// transação de estado: só muda se ainda for 'convite' (null: o cache ainda não chegou, tenta de novo com o valor do servidor)
const deConvite = (novo) => (cur) => (cur === null ? null : cur === 'convite' ? novo : undefined);

// ── ouvir os convites que chegam ──
export function ouvirConvitesDueloExpo() {
  if (!C || ouvindo || !C.eu()?.uid) return;
  ouvindo = true;
  try { C.fb.onValue(P('convites', C.eu().uid), (s) => { if (s.exists()) receberConvite(s.val()); }, () => {}); }
  catch (e) { console.warn('[jogo-revisao] convites da exposição indisponíveis', e?.code || e); }
}
async function receberConvite(cv) {
  if (!cv?.id || conv?.id === cv.id || pt?.id === cv.id) return;
  const idade = C.agora() - (Number(cv.ts) || 0), meu = C.eu().uid;
  if (idade > CONVITE_S * 1000 || idade < -5000) { C.fb.remove(P('convites', meu)).catch(() => {}); return; }
  if (!C.podeReceber() || (pt && !pt.terminou) || espera || conv) {   // ocupado (ou sem receber convites): avisa quem chamou
    try { await C.fb.runTransaction(P('partidas', cv.id, 'estado'), deConvite('ocupado')); } catch (_) {}
    C.fb.remove(P('convites', meu)).catch(() => {});
    return;
  }
  conv = { ...cv, fimMs: Date.now() + CONVITE_S * 1000 - Math.max(0, idade) };
  // se quem chamou cancelar (ou o convite vencer), a janela fecha
  try { conv.unsub = C.fb.onValue(P('partidas', cv.id, 'estado'), (s) => { if (conv?.id === cv.id && s.exists() && s.val() !== 'convite' && s.val() !== 'jogando') fecharConvite(); }, () => {}); } catch (_) {}
  $('ed-conv-t').innerHTML = `<b>${C.esc(cv.de_nome || 'Visitante')}</b> te desafiou no <b>${C.esc(iconeJogo(cv.jogo))} ${C.esc(nomeJogo(cv.jogo))}</b>!`;
  $('ed-convite').hidden = false;
  C.tocar('vitoria');
  const barra = () => {
    if (!conv || conv.id !== cv.id) return;
    const f = (conv.fimMs - Date.now()) / (CONVITE_S * 1000);
    $('ed-conv-tempo').style.width = Math.max(0, f) * 100 + '%';
    if (f <= 0) { responderConvite(false, true); return; }
    requestAnimationFrame(barra);
  };
  barra();
}
function fecharConvite() {
  if (!conv) return;
  try { conv.unsub?.(); } catch (_) {}
  conv = null;
  $('ed-convite').hidden = true;
}
async function responderConvite(sim, expirou = false) {
  const cv = conv;
  if (!cv) return;
  fecharConvite();
  C.fb.remove(P('convites', C.eu().uid)).catch(() => {});
  if (!sim) { try { await C.fb.runTransaction(P('partidas', cv.id, 'estado'), deConvite(expirou ? 'expirou' : 'recusou')); } catch (_) {} return; }
  C.tocar('clique');
  let ok = false;
  try {
    const r = await C.fb.runTransaction(P('partidas', cv.id), (cur) => {
      if (cur === null) return null;
      if (cur.estado !== 'convite' || cur.b?.uid !== C.eu().uid) return undefined;
      return { ...cur, estado: 'jogando', comeca: Math.random() < 0.5 ? 'a' : 'b', inicio: C.agora() };
    });
    ok = !!r?.committed && r.snapshot?.val()?.estado === 'jogando';
  } catch (e) { console.warn('[jogo-revisao] aceitar partida', e?.code || e); }
  if (!ok) { aviso(`O convite não vale mais.`); return; }
  entrarPartida(cv.id, 'b');
}

// ── desafiar: op = { uid, nome } ──
export async function desafiarExpo(op, jogo) {
  if (!C || !op?.uid || op.uid === C.eu().uid || dueloAtivoExpo() || conv) return;
  const eu = C.eu(), id = C.fb.push(P('partidas')).key;
  try {
    await C.fb.set(P('partidas', id), { jogo, a: { uid: eu.uid, nome: eu.nome }, b: { uid: op.uid, nome: op.nome }, estado: 'convite', criado: C.agora() });
    await C.fb.set(P('convites', op.uid), { id, de: eu.uid, de_nome: eu.nome, jogo, ts: C.agora() });
  } catch (e) { console.warn('[jogo-revisao] desafio da exposição', e?.code || e); aviso('Não deu para desafiar agora.'); return; }
  espera = { id, op, jogo, fimMs: Date.now() + CONVITE_S * 1000 + 800 };
  $('ed-esp-t').innerHTML = `${C.esc(iconeJogo(jogo))} Esperando <b>${C.esc(primeiro(op.nome))}</b> aceitar…`;
  $('ed-esp-barra').hidden = false;
  $('ed-esp-x').textContent = 'Cancelar';
  $('ed-espera').hidden = false;
  try {
    espera.unsub = C.fb.onValue(P('partidas', id, 'estado'), (s) => {
      if (espera?.id !== id || !s.exists()) return;
      const v = s.val();
      if (v === 'jogando') { fecharEspera(); entrarPartida(id, 'a'); }
      else if (v !== 'convite') naoPode(op);
    }, () => {});
  } catch (_) {}
  const barra = () => {
    if (espera?.id !== id || espera.acabou) return;
    const f = (espera.fimMs - Date.now()) / (CONVITE_S * 1000);
    $('ed-esp-tempo').style.width = Math.max(0, f) * 100 + '%';
    if (f <= 0) { C.fb.runTransaction(P('partidas', id, 'estado'), deConvite('expirou')).catch(() => {}); naoPode(op); return; }
    requestAnimationFrame(barra);
  };
  barra();
}
function naoPode(op) {
  if (!espera || espera.acabou) return;
  espera.acabou = true;
  try { espera.unsub?.(); } catch (_) {}
  C.fb.remove(P('convites', op.uid)).catch(() => {});
  $('ed-esp-t').innerHTML = `<b>${C.esc(primeiro(op.nome))}</b> não pôde jogar agora.`;
  $('ed-esp-barra').hidden = true;
  $('ed-esp-x').textContent = 'Fechar';
  C.tocar('erro');
  const id = espera.id;
  setTimeout(() => { if (espera?.id === id) fecharEspera(); }, 4000);
}
async function cancelarEspera() {
  const e = espera;
  if (!e) return;
  if (!e.acabou) {
    try { await C.fb.runTransaction(P('partidas', e.id, 'estado'), deConvite('cancelou')); } catch (_) {}
    C.fb.remove(P('convites', e.op.uid)).catch(() => {});
  }
  fecharEspera();
}
function fecharEspera() {
  if (espera) { try { espera.unsub?.(); } catch (_) {} }
  espera = null;
  $('ed-espera').hidden = true;
}
function aviso(txt) {
  $('ed-esp-t').textContent = txt;
  $('ed-esp-barra').hidden = true;
  $('ed-esp-x').textContent = 'Fechar';
  $('ed-espera').hidden = false;
  espera = null;
  setTimeout(() => { if (!espera) $('ed-espera').hidden = true; }, 3500);
}

// ══ a partida ══
function entrarPartida(id, lado) {
  C.fecharOutros?.();
  const meu = C.eu().uid;
  pt = { id, lado, jogo: null, d: null, r: null, sel: null, pend: null, enviando: false, terminou: false, semOpDesde: 0, tick: 0, unsub: null };
  const onRef = P('partidas', id, 'on', meu);
  C.fb.set(onRef, true).then(() => C.fb.onDisconnect(onRef).remove()).catch(() => {});
  C.jogando(true);
  $('ed-c').innerHTML = '<p class="ed-carregando">Preparando o tabuleiro…</p>';
  $('ed-jogo').hidden = false;
  try { pt.unsub = C.fb.onValue(P('partidas', id), (s) => { if (pt?.id === id && s.exists()) atualizar(s.val()); }, () => {}); } catch (_) {}
  pt.tick = setInterval(relogio, 250);
}
function atualizar(d) {
  if (!pt || pt.terminou) return;
  const n0 = pt.r?.n ?? -1;
  pt.d = d; pt.jogo = d.jogo;
  pt.cfg = C.cfg(d.jogo) || {};
  if (!pt.montado) montarPartida();
  pt.r = refazer(d.jogo, pt.cfg, d.comeca, listaJogadas(d.jogadas));
  if (pt.r.n !== n0) { pt.enviando = false; pt.sel = null; pt.pend = null; if (n0 >= 0) C.tocar('clique'); }
  const ext = d.fim && (d.fim.perdeu === 'a' || d.fim.perdeu === 'b') ? { vencedor: outroLado(d.fim.perdeu), motivo: d.fim.motivo } : null;
  const fim = pt.r.fim || ext;
  pintar();
  if (fim) terminar(fim);
}
const opLado = () => outroLado(pt.lado);
const nomeDe = (l) => primeiro(pt.d?.[l]?.nome);
function montarPartida() {
  pt.montado = true;
  $('ed-tit').textContent = `${iconeJogo(pt.d.jogo)} ${nomeJogo(pt.d.jogo)} · ao vivo`;
  const yote = pt.d.jogo === 'yote', [L, Cc] = Array.isArray(pt.cfg.tabuleiro) ? pt.cfg.tabuleiro.map(Number) : [5, 6];
  $('ed-c').innerHTML = `<div class="ej-jogo"><div class="ed-topo"><b id="ed-vez"></b><div class="ed-barra"><i id="ed-tempo"></i></div><small class="ej-cont" id="ed-cont"></small></div>
    <p class="ej-status ed-status" id="ed-status"></p>
    <div class="ej-area" id="ed-area">
      <div class="ej-jog op"><span class="ej-op-ic">🧑</span><b><i class="ej-cor ej-p2"></i>${C.esc(nomeDe(opLado()))}</b>${yote ? '<button class="ej-mao op" data-ed="mao-op" id="ed-mao-op"></button>' : ''}</div>
      <div class="ej-tab${yote ? ' ej-yote' : ''}" id="ed-tab"${yote ? ` style="--cols:${Cc};--lins:${L}"` : ''}></div>
      <div class="ej-jog eu"><span class="ej-op-ic">🙂</span><b><i class="ej-cor ej-p1"></i>Você</b>${yote ? '<span class="ej-mao eu" id="ed-mao-eu"></span>' : ''}</div>
    </div><div class="ej-fim" id="ed-fim" hidden></div></div>`;
  dimensionarTabExpo($('ed-area'), $('ed-tab'));
  requestAnimationFrame(() => dimensionarTabExpo($('ed-area'), $('ed-tab')));
}
// a visão de quem é 'b': o tabuleiro girado (as minhas peças embaixo) e as cores trocadas (eu sou sempre o amarelo)
const girado = () => pt.lado === 'b';
const vSh = (k) => (!girado() || k === CENTRO ? k : (k + 4) % 8);
const vYo = (i) => (girado() ? pt.r.st.b.length - 1 - i : i);
const vPeca = (v) => (!v || !girado() ? v : 3 - v);
const minhaVez = () => pt && !pt.terminou && pt.r && !pt.r.fim && pt.r.vez === pt.lado && !pt.enviando;
function pontos(cx, cy, r) { return [...Array(8).keys()].map(i => { const a = -Math.PI / 2 + i * Math.PI / 4; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }).concat([[cx, cy]]); }
function pintar() {
  if (!pt?.montado || !pt.r) return;
  const r = pt.r, eu = pecaDe(pt.lado);
  if (pt.jogo === 'yote') pintarYote(r, eu); else pintarShisima(r, eu);
  $('ed-vez').textContent = r.fim ? '' : r.vez === pt.lado ? '🟡 Sua vez' : `Vez ${artigoDe(nomeDe(opLado()))}`;
  $('ed-vez').className = r.vez === pt.lado ? 'minha' : '';
  $('ed-cont').textContent = `Jogada ${Math.min(r.n + 1, Number(pt.cfg.limite_jogadas) || 30)}/${Number(pt.cfg.limite_jogadas) || 30}`
    + (r.tempo[pt.lado] ? ` · ⏱ ${r.tempo[pt.lado]}×` : '');
}
const artigoDe = (n) => `de ${n}`;
function pintarShisima(r, eu) {
  const Pp = pontos(150, 150, 118);
  const movs = minhaVez() ? movimentosShisima(r.pos, eu) : [];
  const dest = pt.sel !== null ? movs.filter(m => vSh(m.de) === pt.sel).map(m => vSh(m.para)) : [];
  const lin = [...Array(8).keys()].map(i => `<line x1="${Pp[i][0]}" y1="${Pp[i][1]}" x2="${Pp[(i + 1) % 8][0]}" y2="${Pp[(i + 1) % 8][1]}"/><line x1="${Pp[i][0]}" y1="${Pp[i][1]}" x2="150" y2="150"/>`).join('');
  const ult = r.ult.map(vSh);
  let pcs = '';
  for (let d = 0; d < 9; d++) {
    const v = vPeca(r.pos[vSh(d)]), [x, y] = Pp[d], ds = dest.includes(d);
    pcs += `<g data-ed-sh="${d}" class="ej-ponto${ds ? ' dest' : ''}"><circle class="ej-alvo" cx="${x}" cy="${y}" r="26"/>`
      + (v ? `<circle class="ej-p${v}${pt.sel === d ? ' sel' : ''}${ult.includes(d) ? ' ult' : ''}" cx="${x}" cy="${y}" r="18"/>` : `<circle class="ej-vazio${ds ? ' dest' : ''}" cx="${x}" cy="${y}" r="${ds ? 11 : 7}"/>`) + '</g>';
  }
  let linha = '';
  if (pt.fimR?.vencedor && pt.fimR.motivo === 'linha') {
    const k = linhaShisima(r.pos, pecaDe(pt.fimR.vencedor));
    if (k) linha = `<polyline class="ej-linha" points="${k.map(i => Pp[vSh(i)].join(',')).join(' ')}"/>`;
  }
  $('ed-tab').innerHTML = `<svg viewBox="0 0 300 300" class="ej-svg ej-jogo-svg"><g class="ej-linhas">${lin}</g>${linha}${pcs}</svg>`;
  $('ed-status').innerHTML = r.fim || pt.terminou ? '' : !minhaVez() ? (pt.enviando ? 'Enviando…' : `${C.esc(nomeDe(opLado()))} está pensando…`)
    : pt.sel === null ? 'Toque numa peça <b>amarela</b>' : 'Toque num ponto verde para mover';
}
function pintarYote(r, eu) {
  const st = pt.pend?.st || r.st, op = 3 - eu, N = st.b.length;
  const acoes = minhaVez() && !pt.pend ? acoesYote(st, eu) : [];
  const dest = new Map(pt.sel !== null ? acoes.filter(a => a.de !== undefined && vYo(a.de) === pt.sel).map(a => [vYo(a.para), a]) : []);
  const ult = r.ult.map(vYo);
  let h = '';
  for (let d = 0; d < N; d++) {
    const v = vPeca(st.b[vYo(d)]), a = dest.get(d), rm = pt.pend && st.b[vYo(d)] === op;
    h += `<button class="ej-cel${a ? (a.tipo === 'capturar' ? ' cap' : ' dest') : ''}${rm ? ' rm' : ''}${ult.includes(d) ? ' ult' : ''}" data-ed-yo="${d}">${v ? `<i class="ej-p${v}${pt.sel === d ? ' sel' : ''}"></i>` : ''}</button>`;
  }
  $('ed-tab').innerHTML = h;
  $('ed-mao-op').innerHTML = `✋ <b>${st.mao[op]}</b>`;
  $('ed-mao-op').classList.toggle('rm', !!pt.pend && st.mao[op] > 0);
  $('ed-mao-op').disabled = !(pt.pend && st.mao[op] > 0);
  $('ed-mao-eu').innerHTML = `✋ <b>${st.mao[eu]}</b>`;
  $('ed-status').innerHTML = r.fim || pt.terminou ? '' : pt.pend ? '🎯 Bônus! Tire uma peça <b>roxa</b>' + (st.mao[op] > 0 ? ' ou toque no ✋ dele' : '')
    : !minhaVez() ? (pt.enviando ? 'Enviando…' : `${C.esc(nomeDe(opLado()))} está pensando…`)
    : pt.sel !== null ? 'Verde: andar · laranja: capturar'
    : st.mao[eu] > 0 ? 'Coloque numa casa vazia ou ande com uma peça' : 'Ande com uma peça sua';
}
function cliqueNaPartida(e) {
  if (!pt) return;
  const b = e.target.closest('[data-ed]'), acao = b?.dataset.ed;
  if (acao === 'fechar') { fecharPartida(); return; }
  if (acao === 'revanche') { const op = { uid: pt.d[opLado()].uid, nome: pt.d[opLado()].nome }, jogo = pt.jogo; fecharPartida(); desafiarExpo(op, jogo); return; }
  if (acao === 'desistir') { desistir(); return; }
  if (acao === 'continuar') { $('ed-fim').hidden = true; return; }
  if (!minhaVez()) return;
  const eu = pecaDe(pt.lado);
  if (acao === 'mao-op' && pt.pend && pt.pend.st.mao[3 - eu] > 0) { enviar({ ...pt.pend.a, rm: { mao: true } }); return; }
  const sh = e.target.closest('[data-ed-sh]');
  if (sh && pt.jogo === 'shisima') {
    const d = Number(sh.dataset.edSh), k = vSh(d);
    if (pt.r.pos[k] === eu) { pt.sel = pt.sel === d ? null : d; C.tocar('clique'); pintar(); return; }
    const m = pt.sel !== null && movimentosShisima(pt.r.pos, eu).find(x => x.de === vSh(pt.sel) && x.para === k);
    if (m) enviar({ de: m.de, para: m.para });
    return;
  }
  const yo = e.target.closest('[data-ed-yo]');
  if (yo && pt.jogo === 'yote') {
    const d = Number(yo.dataset.edYo), i = vYo(d), st = pt.r.st;
    if (pt.pend) { if (pt.pend.st.b[i] === 3 - eu) enviar({ ...pt.pend.a, rm: { casa: i } }); return; }
    if (st.b[i] === eu) { pt.sel = pt.sel === d ? null : d; C.tocar('clique'); pintar(); return; }
    const acoes = acoesYote(st, eu);
    const a = pt.sel !== null ? acoes.find(x => x.de === vYo(pt.sel) && x.para === i) : (st.b[i] === 0 ? acoes.find(x => x.tipo === 'colocar' && x.para === i) : null);
    if (!a) { if (pt.sel !== null) { pt.sel = null; pintar(); } return; }
    if (a.tipo === 'capturar') {
      const st2 = aplicarYote(st, a, eu);
      if (pecasYote(st2, 3 - eu) > 0 && podeRemoverYote(st2, eu)) { pt.pend = { a, st: st2 }; pt.sel = null; C.tocar('acerto'); pintar(); return; }
    }
    enviar(a);
  }
}
// grava a jogada n (só se ninguém gravou antes: a transação resolve se os dois tentarem ao mesmo tempo)
async function enviar(m, passa = null) {
  if (!pt || pt.terminou || !pt.r || pt.r.fim) return;
  const n = pt.r.n, l = pt.r.vez;
  const j = limpo({ p: l, ...(m ? { m: { tipo: m.tipo, de: m.de, para: m.para, sobre: m.sobre, rm: m.rm } } : {}), ...(passa ? { passa } : {}), ts: C.agora() });
  if (l === pt.lado) { pt.enviando = true; pintar(); }
  try { await C.fb.runTransaction(P('partidas', pt.id, 'jogadas', String(n)), (cur) => (cur === null ? j : undefined)); }
  catch (e) { console.warn('[jogo-revisao] jogada ao vivo', e?.code || e); if (pt) { pt.enviando = false; pintar(); } }
}
// o relógio (4× por segundo): a barra dos 30 s, a vez que passa, quem ficou sem jogada e quem saiu
function relogio() {
  if (!pt || pt.terminou || !pt.r || !pt.d || pt.d.estado !== 'jogando') return;
  const r = pt.r, agora = C.agora(), inicio = Math.max(Number(pt.d.inicio) || 0, r.ultimoTs || 0), passou = (agora - inicio) / 1000;
  const f = Math.max(0, 1 - passou / TEMPO_JOGADA_S);
  const el = $('ed-tempo');
  if (el) { el.style.width = f * 100 + '%'; el.classList.toggle('pouco', f < 0.3); }
  if (r.fim) return;
  const minha = r.vez === pt.lado;
  if (r.semJogada && !pt.enviando && passou > (minha ? 1.2 : 5)) { enviar(null, 'sem'); return; }   // sem jogada: passa a vez
  if (passou > TEMPO_JOGADA_S + (minha ? 0 : 5) && !pt.enviando) {   // acabou o tempo (quem joga grava; o outro grava 5 s depois, se o aparelho dele sumiu)
    if (minha && pt.pend) { const rm = escolhaRemocaoYote(pt.pend.st, pecaDe(pt.lado)); enviar({ ...pt.pend.a, rm: rm?.mao ? { mao: true } : rm ? { casa: rm.casa } : undefined }); }
    else enviar(null, 'tempo');
    return;
  }
  // saiu: o "on" do outro sumiu por mais de 20 s
  const opUid = pt.d[opLado()]?.uid;
  if (!pt.d.on?.[opUid]) {
    if (!pt.semOpDesde) pt.semOpDesde = Date.now();
    else if (Date.now() - pt.semOpDesde > SAIU_S * 1000) { pt.semOpDesde = Infinity; marcarFim(opLado(), 'saiu'); }
  } else pt.semOpDesde = 0;
}
function marcarFim(perdeu, motivo) {
  if (!pt) return Promise.resolve();
  return C.fb.runTransaction(P('partidas', pt.id, 'fim'), (cur) => (cur === null ? { perdeu, motivo, ts: C.agora() } : undefined)).catch(() => {});
}
function pedirDesistir() {
  const el = $('ed-fim');
  if (!el) { fecharPartida(); return; }
  el.innerHTML = `<b class="ej-fim-t">Desistir da partida?</b><span>${C.esc(nomeDe(opLado()))} vence.</span>
    <div class="ej-fim-bts"><button class="jr-btn jr-btn-sec" data-ed="continuar">Continuar jogando</button><button class="jr-btn jr-btn-ouro" data-ed="desistir">Desistir</button></div>`;
  el.hidden = false;
}
async function desistir() { if (!pt) return; await marcarFim(pt.lado, 'desistiu'); }
async function terminar(fim) {
  if (pt.terminou) return;
  pt.terminou = true; pt.fimR = fim;
  clearInterval(pt.tick);
  sairDaPartidaRede();
  pintar();
  if ($('ed-tempo')) $('ed-tempo').parentElement.hidden = true;   // acabou: sem a barra do tempo
  const res = fim.vencedor === pt.lado ? 'vitoria' : fim.vencedor ? 'derrota' : 'empate';
  const pts = Number(pt.cfg.pontos?.[res]) || 0, op = nomeDe(opLado());
  C.tocar(res === 'vitoria' ? 'acerto' : res === 'derrota' ? 'erro' : 'clique');
  const porque = fim.motivo === 'saiu' ? (res === 'vitoria' ? `${op} saiu da partida.` : 'Você ficou fora por muito tempo.')
    : fim.motivo === 'desistiu' ? (res === 'vitoria' ? `${op} desistiu.` : 'Você desistiu.')
    : fim.motivo === 'tempo' ? (res === 'vitoria' ? `${op} perdeu a vez ${PASSES_MAX} vezes seguidas.` : `Você perdeu a vez ${PASSES_MAX} vezes seguidas.`)
    : fim.motivo === 'limite' ? `Acabaram as ${Number(pt.cfg.limite_jogadas) || 30} jogadas.` : '';
  const id = pt.id, jogo = pt.jogo;
  const pintarFim = (st) => {
    if (pt?.id !== id) return;
    const el = $('ed-fim');
    el.innerHTML = `<b class="ej-fim-t">${res === 'vitoria' ? `🏆 Você venceu ${C.esc(artigoA(op))}!` : res === 'derrota' ? `${C.esc(op)} venceu desta vez` : '🤝 Empate!'}</b>
      ${porque ? `<span>${C.esc(porque)}</span>` : ''}<span>+${pts} pts · sua melhor: <b>${C.melhor(jogo)}</b>${C.avisoGravar(st)}</span>
      <div class="ej-fim-bts"><button class="jr-btn jr-btn-sec" data-ed="fechar">Fechar</button><button class="jr-btn jr-btn-ouro" data-ed="revanche">🔁 Revanche</button></div>`;
    el.hidden = false;
  };
  pintarFim('');
  if (res === 'vitoria') C.contar?.(jogo, 1);   // 🏆 só quem venceu soma (PROMPT-261)
  const st = await C.gravar(jogo, pts);   // vale o melhor do jogo, igual contra o computador
  pintarFim(st);
}
const artigoA = (n) => `a ${n}`.replace(/^a Visitante$/, 'o Visitante');
function sairDaPartidaRede() {
  if (!pt) return;
  try { pt.unsub?.(); } catch (_) {}
  pt.unsub = null;
  const onRef = P('partidas', pt.id, 'on', C.eu().uid);
  try { C.fb.onDisconnect(onRef).cancel(); } catch (_) {}
  C.fb.remove(onRef).catch(() => {});
  C.jogando(false);
}
function fecharPartida() {
  if (pt && !pt.terminou) { marcarFim(pt.lado, 'desistiu'); clearInterval(pt.tick); sairDaPartidaRede(); }
  pt = null;
  $('ed-jogo').hidden = true;
  $('ed-c').innerHTML = '';
}

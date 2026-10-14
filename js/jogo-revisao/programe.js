// Jogo de Revisão — "Programe o pet" (PROMPT-50): a tela (Blockly + grade + pet que executa o programa).
// As regras ficam em programe-logica.js; progresso, prêmios, rankings e corrida ficam no jogo (jogo-revisao.js),
// que passa o que esta tela precisa em configurarPrograme(ctx).
import { lerFase, executar, contarBlocos, estrelasDe, ladoB, podeAndar, girarFase, girarEvento, desgirarPonto } from '/js/jogo-revisao/programe-logica.js';

const BLOCKLY = 'https://unpkg.com/blockly@10.4.3/';   // versão fixa (biblioteca do Google, gratuita)
const $ = (id) => document.getElementById(id);
let C = null;            // ctx do jogo
let ws = null;           // workspace do Blockly
let tela = null;         // { cfg, F, pets: { eu, outro }, rodando, parar, vel, ... }

export function configurarPrograme(ctx) { C = ctx; }

// ── Blockly: carrega só quando abre a primeira vez ──
let carregando = null;
function carregarBlockly() {
  if (window.Blockly?.inject && carregando) return carregando;
  carregando ||= (async () => {
    for (const f of ['blockly_compressed.js', 'msg/pt-br.js'])
      await new Promise((ok, falha) => { const s = document.createElement('script'); s.src = BLOCKLY + f; s.onload = ok; s.onerror = () => falha(new Error(f)); document.head.appendChild(s); });
    definirBlocos(window.Blockly);
    return window.Blockly;
  })();
  carregando.catch(() => { carregando = null; });
  return carregando;
}

const COR = { inicio: 45, mov: 215, pegar: 275, laco: 28, func: 135, se: 185 };
const stmt = (nome) => ({ type: 'input_statement', name: nome });
function definirBlocos(B) {
  const seq = { previousStatement: null, nextStatement: null };
  B.common.defineBlocksWithJsonArray([
    { type: 'pg_inicio', message0: '🏁 quando executar', nextStatement: null, colour: COR.inicio, tooltip: 'O programa começa aqui.' },
    { type: 'pg_andar', message0: '⬆️ andar', ...seq, colour: COR.mov, tooltip: 'Anda uma casa para a frente.' },
    { type: 'pg_virar_esq', message0: '↩️ vire à esquerda 90°', ...seq, colour: COR.mov },
    { type: 'pg_virar_dir', message0: '↪️ vire à direita 90°', ...seq, colour: COR.mov },
    { type: 'pg_virar_esq45', message0: '↖️ vire 45° à esquerda', ...seq, colour: COR.mov },
    { type: 'pg_virar_dir45', message0: '↗️ vire 45° à direita', ...seq, colour: COR.mov },
    { type: 'pg_pegar', message0: '🐾 pegar', ...seq, colour: COR.pegar, tooltip: 'Pega o petisco da casa onde o pet está.' },
    { type: 'pg_repita', message0: '🔁 repita %1 vezes', args0: [{ type: 'field_number', name: 'N', value: 2, min: 1, max: 20, precision: 1 }],
      message1: '%1', args1: [stmt('FAZ')], ...seq, colour: COR.laco },
    { type: 'pg_repita_ate', message0: '🔁 repita até chegar na comida', message1: '%1', args1: [stmt('FAZ')], ...seq, colour: COR.laco },
    { type: 'pg_f1_def', message0: '⭐ F1 (definir)', message1: '%1', args1: [stmt('FAZ')], colour: COR.func, tooltip: 'Monte aqui o que F1 faz.' },
    { type: 'pg_f1', message0: '⭐ chamar F1', ...seq, colour: COR.func },
    { type: 'pg_se_pedra', message0: '❓ se tem pedra na frente, faça', message1: '%1', args1: [stmt('FAZ')], ...seq, colour: COR.se },
    { type: 'pg_se_livre', message0: '❓ se caminho livre à %1, faça', args0: [{ type: 'field_dropdown', name: 'LADO', options: [['direita', 'dir'], ['esquerda', 'esq']] }],
      message1: '%1', args1: [stmt('FAZ')], ...seq, colour: COR.se },
    { type: 'pg_se_petisco', message0: '❓ se tem petisco aqui, faça', message1: '%1', args1: [stmt('FAZ')], ...seq, colour: COR.se },
    { type: 'pg_se_senao', message0: '❓ se %1', args0: [{ type: 'field_dropdown', name: 'COND', options: [['tem pedra na frente', 'pedra_frente'],
      ['caminho livre à direita', 'livre_dir'], ['caminho livre à esquerda', 'livre_esq'], ['tem petisco aqui', 'petisco_aqui']] }],
      message1: 'faça %1', args1: [stmt('FAZ')], message2: 'senão %1', args2: [stmt('SENAO')], ...seq, colour: COR.se },
  ]);
}
// bloco do JSON da fase → blocos do Blockly
const BLOCOS = {
  andar: ['pg_andar'], virar_esq: ['pg_virar_esq'], virar_dir: ['pg_virar_dir'], virar_esq45: ['pg_virar_esq45'], virar_dir45: ['pg_virar_dir45'],
  pegar: ['pg_pegar'], repita: ['pg_repita'], repita_ate: ['pg_repita_ate'], funcao: ['pg_f1_def', 'pg_f1'],
  se_pedra: ['pg_se_pedra'], se_livre: ['pg_se_livre'], se_senao: ['pg_se_senao'], se_petisco: ['pg_se_petisco'],
};
const ORDEM = ['andar', 'virar_esq', 'virar_dir', 'virar_esq45', 'virar_dir45', 'pegar', 'repita', 'repita_ate', 'funcao', 'se_pedra', 'se_livre', 'se_petisco', 'se_senao'];
const toolboxDe = (blocos) => ({ kind: 'flyoutToolbox', contents: ORDEM.filter(b => blocos.includes(b)).flatMap(b => BLOCOS[b].map(type => ({ kind: 'block', type }))) });

// Workspace → programa (só o que está preso no 🏁 e no F1; blocos soltos não contam)
export function astDe(w = ws) {
  const lista = (b) => { const out = []; for (; b; b = b.getNextBlock()) { const n = noDe(b); if (n) out.push(n); } return out; };
  const corpo = (b, nome) => lista(b.getInputTargetBlock(nome));
  function noDe(b) {
    const id = b.id;
    switch (b.type) {
      case 'pg_andar': return { id, t: 'andar' };
      case 'pg_virar_esq': return { id, t: 'virar', g: -2 };
      case 'pg_virar_dir': return { id, t: 'virar', g: 2 };
      case 'pg_virar_esq45': return { id, t: 'virar', g: -1 };
      case 'pg_virar_dir45': return { id, t: 'virar', g: 1 };
      case 'pg_pegar': return { id, t: 'pegar' };
      case 'pg_repita': return { id, t: 'repita', n: Number(b.getFieldValue('N')) || 0, corpo: corpo(b, 'FAZ') };
      case 'pg_repita_ate': return { id, t: 'repita_ate', corpo: corpo(b, 'FAZ') };
      case 'pg_f1': return { id, t: 'chamar' };
      case 'pg_se_pedra': return { id, t: 'se', c: 'pedra_frente', corpo: corpo(b, 'FAZ') };
      case 'pg_se_livre': return { id, t: 'se', c: b.getFieldValue('LADO') === 'esq' ? 'livre_esq' : 'livre_dir', corpo: corpo(b, 'FAZ') };
      case 'pg_se_petisco': return { id, t: 'se', c: 'petisco_aqui', corpo: corpo(b, 'FAZ') };
      case 'pg_se_senao': return { id, t: 'se', c: b.getFieldValue('COND'), corpo: corpo(b, 'FAZ'), senao: corpo(b, 'SENAO') };
      default: return null;
    }
  }
  const ini = w.getBlocksByType('pg_inicio', false)[0], def = w.getBlocksByType('pg_f1_def', false)[0];
  return { corpo: ini ? lista(ini.getNextBlock()) : [], f1: def ? corpo(def, 'FAZ') : null };
}
// Programa em texto (painel da professora)
const NOME_COND = { pedra_frente: 'tem pedra na frente', livre_dir: 'caminho livre à direita', livre_esq: 'caminho livre à esquerda', petisco_aqui: 'tem petisco aqui' };
export function textoDe(prog) {
  const out = [];
  const lin = (l, n) => (l || []).forEach(b => {
    const p = '  '.repeat(n);
    if (b.t === 'andar') out.push(p + 'andar');
    else if (b.t === 'virar') out.push(p + { '-2': 'vire à esquerda 90°', 2: 'vire à direita 90°', '-1': 'vire 45° à esquerda', 1: 'vire 45° à direita' }[b.g]);
    else if (b.t === 'pegar') out.push(p + 'pegar');
    else if (b.t === 'chamar') out.push(p + 'chamar F1');
    else if (b.t === 'repita') { out.push(`${p}repita ${b.n} vezes:`); lin(b.corpo, n + 1); }
    else if (b.t === 'repita_ate') { out.push(`${p}repita até chegar na comida:`); lin(b.corpo, n + 1); }
    else if (b.t === 'se') { out.push(`${p}se ${NOME_COND[b.c] || b.c}:`); lin(b.corpo, n + 1); if (b.senao) { out.push(`${p}senão:`); lin(b.senao, n + 1); } }
  });
  lin(prog.corpo, 0);
  if (prog.f1) { out.push('F1:'); lin(prog.f1, 1); }
  return out.join('\n');
}
// ids do Blockly não importam para a execução fora da tela (corrida do colega, fantasma): guardamos a AST em JSON
export const programaParaTexto = (prog) => JSON.stringify(prog);
export function programaDeTexto(txt) { try { const p = JSON.parse(txt); return p && Array.isArray(p.corpo) ? p : { corpo: [] }; } catch (_) { return { corpo: [] }; } }

function xmlDe() { try { return window.Blockly.Xml.domToText(window.Blockly.Xml.workspaceToDom(ws)); } catch (_) { return ''; } }

// ── Abrir a tela ──
// cfg: { modo: 'fase'|'dia'|'corrida'|'fantasma', fase, titulo, sub, meta, xml, lado ('a'|'b'), rival: { nome, pet, forma, tinta }, tema: { casa, obstaculo },
//        fimEm (ms do relógio do jogo em que a montagem acaba), aoExecutar, aoVencer, aoBater, aoPronto, aoFechar }
export async function abrirTela(cfg) {
  fecharTela(true);
  $('programe').hidden = false;
  $('pg-carregando').hidden = false;
  $('pg-titulo').textContent = cfg.titulo || '';
  $('pg-sub').textContent = cfg.sub || '';
  $('pg-estrelas').innerHTML = '';
  msg('');
  let B;
  try { B = await carregarBlockly(); }
  catch (e) {
    console.warn('[programe] Blockly indisponível', e);
    $('pg-carregando').textContent = 'Não deu para carregar os blocos agora. Confira a internet e tente de novo.';
    return false;
  }
  $('pg-carregando').hidden = true;
  const corrida = cfg.modo === 'corrida' || cfg.modo === 'fantasma';
  const giro = deveGirar(cfg.fase), fase = giro ? girarFase(cfg.fase) : cfg.fase;
  const F = lerFase(fase);
  tela = { cfg, F, fase, giro, corrida, rodando: false, parar: false, vel: 300, pronto: false, inicio: Date.now(), timers: [], quadro: {}, raf: 0 };
  $('programe').classList.toggle('corrida', corrida);
  $('pg-exec').textContent = corrida ? '▶ Testar' : '▶ Executar';
  $('pg-pronto').hidden = !corrida;
  $('pg-tempo').hidden = !cfg.fimEm;
  $('pg-trava').hidden = true;
  $('pg-vitoria').hidden = true;
  $('pg-exec').disabled = false; $('pg-pronto').disabled = false;   // um "Pronto!" anterior deixava os dois desabilitados
  // Blockly
  ws?.dispose();
  const tema = B.Theme.defineTheme('jr-pg', { base: B.Themes.Classic, componentStyles: {
    workspaceBackgroundColour: '#11142a', toolboxBackgroundColour: '#161a2e', flyoutBackgroundColour: '#1b2040', flyoutOpacity: 1,
    scrollbarColour: '#7c5cfc', insertionMarkerColour: '#ffd700', cursorColour: '#ffd700' } });
  const zoomSalvo = lerZoom();
  ws = B.inject($('pg-blockly'), { toolbox: toolboxDe(cfg.fase.blocos || []), renderer: 'zelos', theme: tema, trashcan: false, sounds: false,   // sem lixeira fixa: a coluna das peças vira lixeira ao arrastar
    zoom: { controls: true, startScale: zoomSalvo ?? escalaPadrao(), maxScale: 1.6, minScale: 0.5 },   // abre no zoom que o aluno deixou (ou no da coluna, abaixo)
    move: { scrollbars: true, drag: true, wheel: true },
    maxInstances: { pg_inicio: 1, pg_f1_def: 1 } });
  let ok = false;
  if (cfg.xml) { try { B.Xml.domToWorkspace(B.utils.xml.textToDom(cfg.xml), ws); ok = ws.getBlocksByType('pg_inicio', false).length > 0; } catch (_) { ws.clear(); } }
  if (!ok) { ws.clear(); const ini = ws.newBlock('pg_inicio'); ini.initSvg(); ini.render(); ini.moveBy(30, 30); }
  for (const b of ws.getBlocksByType('pg_inicio', false)) b.setDeletable(false);
  ligarLixeiraEToque(B);
  ws.addChangeListener((e) => {
    if (e.isUiEvent || !tela) return;
    atualizarContagem();
    if (tela.exec?.passo && !tela.rodando && tela.posicionado) encerrarPasso('Você mudou os blocos: comece de novo.');
    if (tela.cfg.tutorial) { if (astDe().corpo.length) pararTutorial(); else if (tela.posicionado) iniciarTutorial(); }
  });
  atualizarContagem();
  limparAnotacoes();
  // grade e pets
  montarGrade();
  if (cfg.fimEm) relogio();
  setTimeout(() => {
    if (!tela) return;
    B.svgResize(ws);
    // escala de abertura = a da coluna das peças (que não passa de 40% da largura): "quando executar" e "andar" do mesmo tamanho
    const base = Math.min(escalaPadrao(), ajustarFlyout());
    ws.options.zoomOptions.startScale = base;   // ⌖ (centralizar) volta para ela
    if (zoomSalvo == null && Math.abs(ws.scale - base) > 0.001) ws.setScale(base);
    ws.scrollCenter = mostrarInicio;            // ⌖: o 🏁 no canto, não no meio
    mostrarInicio();
    tela.posicionado = true;
    ws.addChangeListener((e) => {   // guarda o zoom que o aluno escolheu (+ / − / pinça); no da abertura (ou ⌖), esquece o guardado
      if (e.type === B.Events.VIEWPORT_CHANGE && e.oldScale != null && Math.abs(e.scale - e.oldScale) > 0.001) gravarZoom(Math.abs(e.scale - base) > 0.01 ? e.scale : null);
    });
    if (cfg.tutorial && !astDe().corpo.length) iniciarTutorial();
  }, 60);
  return true;
}

// ── Lixeira só ao arrastar: enquanto um bloco DO PROGRAMA é arrastado, a coluna das peças vira "Solte aqui para apagar"
// (o Blockly já apaga o que é solto em cima da coluna). Uma peça nova saindo da coluna ou o 🏁 não acendem a lixeira.
// Toque (sem arrastar) numa peça da coluna: o bloco entra no fim do programa e pisca. ──
function ligarLixeiraEToque(B) {
  let criado = null;   // { id, grupo }: arrastar da coluna = criar + arrastar o bloco novo, no MESMO gesto (mesmo grupo de eventos)
  ws.addChangeListener((e) => {
    if (!tela) return;
    if (e.type === B.Events.BLOCK_CREATE) criado = { id: e.blockId, grupo: e.group };
    if (e.type !== B.Events.BLOCK_DRAG) return;
    const b = ws.getBlockById(e.blockId);
    const daColuna = !!criado && criado.id === e.blockId && !!e.group && criado.grupo === e.group;
    if (e.isStart && b && b.isDeletable() && !daColuna) mostrarLixo(true);
    else if (!e.isStart) { mostrarLixo(false); criado = null; }
  });
  const fw = ws.getFlyout?.()?.getWorkspace?.();
  fw?.addChangeListener((e) => {
    if (!tela || e.type !== B.Events.CLICK || e.targetType !== 'block') return;
    const fb = fw.getBlockById(e.blockId);
    if (fb) porNoFim(fb.type);
  });
}
function mostrarLixo(sim) {
  const el = $('pg-lixo');
  if (sim) { const w = ws?.getFlyout?.()?.getWidth?.() || 0; if (!w) return; el.style.width = w + 'px'; }
  el.hidden = !sim;
}
function porNoFim(tipo) {
  const ini = ws?.getBlocksByType('pg_inicio', false)[0];
  if (!ini) return;
  const b = ws.newBlock(tipo);
  b.initSvg(); b.render();
  let ult = ini;
  while (ult.getNextBlock()) ult = ult.getNextBlock();
  if (b.previousConnection && ult.nextConnection) ult.nextConnection.connect(b.previousConnection);
  else { const xy = ini.getRelativeToSurfaceXY(); b.moveBy(xy.x + 260, xy.y); }   // F1 (definir) não encaixa: fica ao lado
  const g = b.getSvgRoot();
  g.classList.add('pg-pisca-uma');
  setTimeout(() => g.classList.remove('pg-pisca-uma'), 900);
}

// Zoom do programa: padrão 1 (0,9 no toque); o que o aluno escolher fica guardado neste aparelho
const ZOOM_CHAVE = 'jr-programe-zoom';
const escalaPadrao = () => (matchMedia('(pointer: coarse)').matches ? 0.9 : 1.0);
function lerZoom() {
  try { const v = parseFloat(localStorage.getItem(ZOOM_CHAVE)); return v >= 0.5 && v <= 1.6 ? v : null; } catch (_) { return null; }
}
function gravarZoom(v) {   // null = voltar ao padrão
  try { if (v == null) localStorage.removeItem(ZOOM_CHAVE); else localStorage.setItem(ZOOM_CHAVE, String(Math.round(v * 1000) / 1000)); } catch (_) {}
}

// A coluna de blocos (flyout) acompanha o zoom, mas sem passar de ~40% da área de montar: se passar, só ela fica menor.
// Devolve a maior escala em que a coluna cabe (Infinity se não der para medir)
function ajustarFlyout() {
  const fl = ws?.getFlyout?.();
  if (!fl || typeof fl.getWidth !== 'function') return Infinity;
  const lim = 0.4 * $('pg-blockly').clientWidth, w = fl.getWidth(), s0 = fl.getFlyoutScale();
  if (!(w > 0) || !(s0 > 0)) return Infinity;
  const k = Math.max(0.55, s0 * lim / w);
  if (w > lim) {
    fl.getFlyoutScale = () => Math.min(ws.scale, k);
    try { fl.reflow(); } catch (_) {}
    window.Blockly.svgResize(ws);
  }
  return k;
}

// Ao abrir (e no ⌖): o 🏁 inteiro no canto de cima à esquerda da área de montar, 12 px de margem (o programa todo vem junto)
function mostrarInicio() {
  const ini = ws?.getBlocksByType('pg_inicio', false)[0];
  if (!ini) return;
  try {
    const v = ws.getMetricsManager().getViewMetrics(true), xy = ini.getRelativeToSurfaceXY();
    const dx = v.left + 12 / ws.scale - xy.x, dy = v.top + 12 / ws.scale - xy.y;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) for (const b of ws.getTopBlocks(false)) b.moveBy(dx, dy);
  } catch (_) {}
}

// ── Mãozinha da Fase 1: arrasta um "andar" de mentira até embaixo do 🏁 e toca no ▶, até o aluno encaixar o 1º bloco ──
function iniciarTutorial() {
  if (!tela || tela.tutorial) return;
  tela.tutorial = { vivo: true };
  const raiz = $('programe');
  const mao = document.createElement('div'); mao.className = 'pg-mao'; mao.textContent = '👆';
  const fantasma = document.createElement('div'); fantasma.className = 'pg-mao-bloco'; fantasma.textContent = '⬆️ andar';
  const seta = document.createElement('div'); seta.className = 'pg-mao-seta';
  raiz.append(fantasma, mao, seta);
  Object.assign(tela.tutorial, { mao, fantasma, seta });
  cicloTutorial();
}
function pontosTutorial() {
  const base = $('programe').getBoundingClientRect();
  const andar = ws?.getFlyout?.()?.getWorkspace()?.getTopBlocks(false).find(b => b.type === 'pg_andar')?.getSvgRoot().getBoundingClientRect();
  const ini = ws?.getBlocksByType('pg_inicio', false)[0]?.getSvgRoot().getBoundingClientRect();
  const exe = $('pg-exec').getBoundingClientRect();
  if (!andar || !ini) return null;
  const p = (x, y) => ({ x: x - base.left, y: y - base.top });
  return { de: p(andar.left + 24, andar.top + andar.height / 2), para: p(ini.left + 24, ini.bottom + 16), exe: p(exe.left + exe.width / 2, exe.top + exe.height / 2) };
}
function cicloTutorial() {
  const T = tela?.tutorial;
  if (!T?.vivo) return;
  const P = pontosTutorial();
  if (!P) { T.timer = setTimeout(cicloTutorial, 400); return; }
  const at = (q, ox = 0, oy = 0) => `translate(${q.x + ox}px, ${q.y + oy}px)`;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {   // sem animação: uma seta parada do "andar" até o 🏁
    const dx = P.para.x - P.de.x, dy = P.para.y - P.de.y;
    Object.assign(T.seta.style, { left: P.de.x + 'px', top: P.de.y + 'px', width: Math.hypot(dx, dy) + 'px', transform: `rotate(${Math.atan2(dy, dx)}rad)`, display: 'block' });
    T.mao.style.display = T.fantasma.style.display = 'none';
    return;
  }
  T.seta.style.display = 'none';
  const dur = 2600;
  // toca no "andar" da coluna → o bloco aparece embaixo do 🏁 → toca no ▶
  T.mao.animate([
    { transform: at(P.de), opacity: 0, offset: 0 }, { transform: at(P.de), opacity: 1, offset: 0.1 },
    { transform: at(P.de) + ' scale(.8)', opacity: 1, offset: 0.2 }, { transform: at(P.de), opacity: 1, offset: 0.28 },
    { transform: at(P.exe), opacity: 1, offset: 0.72 }, { transform: at(P.exe) + ' scale(.8)', opacity: 1, offset: 0.82 },
    { transform: at(P.exe), opacity: 0, offset: 1 }], { duration: dur, easing: 'ease-in-out' });
  T.fantasma.animate([
    { transform: at(P.para, -20, -18), opacity: 0, offset: 0 }, { transform: at(P.para, -20, -18), opacity: 0, offset: 0.2 },
    { transform: at(P.para, -20, -18) + ' scale(1.08)', opacity: .9, offset: 0.3 }, { transform: at(P.para, -20, -18), opacity: .9, offset: 0.7 },
    { transform: at(P.para, -20, -18), opacity: 0, offset: 0.85 }, { transform: at(P.para, -20, -18), opacity: 0, offset: 1 }], { duration: dur, easing: 'ease-in-out' });
  T.timer = setTimeout(cicloTutorial, dur + 200);
}
function pararTutorial() {
  const T = tela?.tutorial;
  if (!T) return;
  T.vivo = false;
  clearTimeout(T.timer);
  T.mao.remove(); T.fantasma.remove(); T.seta.remove();
  tela.tutorial = null;
}

export function fecharTela(silencioso = false) {
  if (!tela && silencioso) { $('programe').hidden = true; return; }
  const cfg = tela?.cfg;
  if (tela) { tela.parar = true; tela.timers.forEach(clearTimeout); cancelAnimationFrame(tela.raf); clearInterval(tela.anim); clearInterval(tela.animCartao); pararTutorial(); }
  $('pg-vitoria').hidden = true;
  tela = null;
  try { ws?.dispose(); } catch (_) {}
  ws = null;
  $('programe').hidden = true;
  if (!silencioso) cfg?.aoFechar?.();
}
export const telaAberta = () => !!tela;

function msg(txt, tipo = '') { const el = $('pg-msg'); el.innerHTML = txt ? `<span>${txt}</span>` : ''; el.className = 'pg-msg ' + tipo; }   // span: o <b> não vira coluna do flex
function atualizarContagem() {
  if (!tela || !ws) return;
  const n = contarBlocos(astDe());
  const meta = tela.cfg.meta;
  $('pg-contagem').innerHTML = `Blocos usados: <b>${n}</b>${meta ? ` <small>(meta ⭐⭐⭐: ≤ ${meta})</small>` : ''}`;
}

// ── Grade ──
// Tela em pé e fase mais larga que alta: a fase aparece girada 90° (sentido horário). Na corrida os dois lados giram igual.
// tela.fase = a fase mostrada (girada ou não); cfg.fase continua a original (é a que vale para salvar e para o resultado).
const emPe = () => matchMedia('(orientation: portrait)').matches;
function deveGirar(f) { const F = lerFase(f); return emPe() && F.w > F.h; }
// celular girou com a fase parada (sem execução, passo a passo nem corrida na tela): gira ou desgira a fase
function conferirGiro() {
  if (!tela || tela.rodando || tela.exec || tela.mostrando || tela.pronto) return;
  const giro = deveGirar(tela.cfg.fase);
  if (giro === tela.giro) return;
  tela.giro = giro; tela.fase = giro ? girarFase(tela.cfg.fase) : tela.cfg.fase; tela.F = lerFase(tela.fase);
  limparRastro(); limparAnotacoes();
  montarGrade();
}
const CASA = 'pg-casa';
function montarGrade() {
  const { F, cfg } = tela, g = $('pg-grade');
  g.style.setProperty('--cols', F.w);
  g.style.setProperty('--rows', F.h);
  const comida = C.imgComida(C.pet()?.pet), petisco = C.imgPetisco();
  let html = '';
  for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) {
    const pedra = F.pedras.has(`${x},${y}`);
    html += `<div class="${CASA}${pedra ? ' pedra' : ''}" data-x="${x}" data-y="${y}">${pedra ? '<i class="pg-pedra"></i>' : ''}</div>`;
  }
  for (const [x, y] of F.petiscos) html += `<img class="pg-item pg-petisco" data-p="${x},${y}" src="${petisco}" alt="petisco" draggable="false" style="--x:${x};--y:${y}"/>`;
  if (F.comida) html += `<img class="pg-item pg-comida" src="${comida}" alt="comida" draggable="false" style="--x:${F.comida[0]};--y:${F.comida[1]}"/>`;
  g.innerHTML = html;
  aplicarTema(g, cfg.tema);
  // pets: o meu (e, na corrida, o do outro lado)
  const eu = C.pet();
  tela.pets = {};
  const fase = tela.fase, dirB = fase.inicioB ? lerFase(ladoB(fase)).dir : 4;
  const inicioEu = cfg.lado === 'b' && fase.inicioB ? { x: fase.inicioB[0], y: fase.inicioB[1], dir: dirB } : { x: F.inicio[0], y: F.inicio[1], dir: F.dir };
  tela.pets.eu = criarPet(eu, inicioEu, 'eu');
  if (tela.corrida && cfg.rival) {
    const ib = cfg.lado === 'b' ? { x: F.inicio[0], y: F.inicio[1], dir: F.dir } : { x: fase.inicioB[0], y: fase.inicioB[1], dir: dirB };
    tela.pets.outro = criarPet(cfg.rival, ib, 'outro');
  }
  medirGrade();
}
// Tema da região (PROMPT-60): cfg.tema = { casa, obstaculo } (caminhos já prontos). Só troca o visual depois que a imagem
// carrega; sem ela (ou com erro) ficam as casas e pedras de sempre.
const temaOk = new Map();   // src → Promise<boolean>
const carregou = (src) => {
  if (!src) return Promise.resolve(false);
  if (!temaOk.has(src)) temaOk.set(src, new Promise(ok => { const i = new Image(); i.onload = () => ok(true); i.onerror = () => ok(false); i.src = src; }));
  return temaOk.get(src);
};
function aplicarTema(g, tema) {
  g.classList.remove('com-casa', 'com-obstaculo');
  g.style.removeProperty('--pg-casa-img'); g.style.removeProperty('--pg-obst-img');
  if (!tema) return;
  const css = (src) => `url("${String(src).replace(/["\\]/g, '')}")`;
  for (const [chave, cls, v] of [['casa', 'com-casa', '--pg-casa-img'], ['obstaculo', 'com-obstaculo', '--pg-obst-img']]) {
    const src = tema[chave];
    carregou(src).then(ok => { if (ok && g.isConnected && tela?.cfg.tema === tema) { g.style.setProperty(v, css(src)); g.classList.add(cls); } });
  }
}
function criarPet(p, ini, quem) {
  const g = $('pg-grade');
  const el = document.createElement('div');
  el.className = `pg-pet-caixa ${quem}`;
  el.innerHTML = `<i class="pg-seta"></i><img class="pg-pet" alt="" draggable="false"/><span class="pg-ai" hidden></span>${quem === 'outro' ? `<span class="pg-nome">${C.esc(p?.nome || 'Rival')}</span>` : ''}`;
  g.appendChild(el);
  const img = el.querySelector('img');
  if (p?.pet) C.pintar(img, p);   // tinta do pet (o meu ou o do rival)
  const pet = { el, img, p, ini, x: ini.x, y: ini.y, dir: ini.dir, anim: '', q: 0, medida: null };
  posicionar(pet, true);
  pose(pet, 'parado');
  const forma = p?.forma || p?.pet;
  if (forma) medirDesenho(forma).then(m => { pet.medida = m; medirGrade(); });   // tamanho certo assim que medir o desenho
  return pet;
}

// ── Tamanho do pet na casa: mede o DESENHO (pixels visíveis), não o quadro ──
// Cada quadro tem folga em volta (asas, pulos). Medimos a caixa dos pixels com alpha > 0 dos quadros de andar e do feliz e
// usamos UMA escala para o pet todo: a maior em que todos cabem em 0,95 × 0,95 da casa (ele não muda de tamanho ao virar).
const ANIMS_MEDIDA = ['andar_direita', 'andar_frente', 'andar_costas', 'feliz'];
const CABE = 0.95;
const caixas = new Map();   // src → Promise<{ x0, y0, x1, y1, w, h } em fração do quadro | null>
export function caixaDoQuadro(src) {
  if (!caixas.has(src)) caixas.set(src, new Promise((ok) => {
    const im = new Image();
    im.onload = () => {
      try {
        const k = Math.min(1, 240 / im.naturalWidth), w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(im, 0, 0, w, h);
        const px = ctx.getImageData(0, 0, w, h).data;
        let x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        ok(x1 < 0 ? null : { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h, w: im.naturalWidth, h: im.naturalHeight });
      } catch (_) { ok(null); }
    };
    im.onerror = () => ok(null);
    im.src = src;
  }));
  return caixas.get(src);
}
// Medida do pet: { alt: altura da imagem em casas, baixo: folga vazia embaixo (fração do quadro) }
const medidas = new Map();
function medirDesenho(forma) {
  if (!medidas.has(forma)) medidas.set(forma, (async () => {
    const srcs = [...new Set(ANIMS_MEDIDA.flatMap(a => C.quadrosDe(forma, a)))];
    const cs = (await Promise.all(srcs.map(caixaDoQuadro))).filter(Boolean);
    if (!cs.length) return null;
    // altura da imagem (em casas) para cada quadro caber: altura do desenho ≤ 0,95 e largura do desenho ≤ 0,95
    const cabe = Math.min(...cs.map(c => Math.min(CABE / (c.y1 - c.y0), CABE / ((c.x1 - c.x0) * c.w / c.h))));
    const alt = Math.min(cabe, cabe * (C.escalaPet?.(forma) || 1));   // a escala do pet (PROMPT-63) só vale até o limite da casa
    const baixo = Math.min(...cs.map(c => 1 - c.y1));   // o pé mais baixo encosta na base da casa
    return { alt, baixo };
  })());
  return medidas.get(forma);
}

function medirGrade() {
  if (!tela) return;
  const { F } = tela, cx = $('pg-grade-caixa').getBoundingClientRect();
  if (cx.width < 10 || cx.height < 10) return;   // ainda sem tamanho (a tela acabou de aparecer)
  // a casa = o menor entre largura ÷ colunas e altura ÷ linhas (sem mínimo: o tabuleiro nunca passa da tela; −6 = a borda de 3 px)
  const s = Math.max(1, Math.floor(Math.min((cx.width - 6) / F.w, (cx.height - 6) / F.h)));
  $('pg-grade').style.setProperty('--s', s + 'px');
  for (const pet of Object.values(tela.pets || {})) {
    const forma = pet.p?.forma || pet.p?.pet, m = pet.medida;
    // sem a medida ainda: a conta antiga (o desenho sentado com ~0,9 da casa)
    const h = m ? s * m.alt : s * 0.9 / (forma ? C.sentadoNoQuadro(forma) : 0.86);
    pet.img.style.height = h + 'px';
    pet.img.style.marginBottom = m ? -(h * m.baixo) + 'px' : '';   // desconta a folga vazia de baixo: o pé fica na base da casa
  }
}
window.addEventListener('resize', () => { if (tela) { conferirGiro(); medirGrade(); try { window.Blockly?.svgResize(ws); } catch (_) {} } });
// a área da grade muda de tamanho (tela aparecendo, celular girando, mensagem de 2 linhas): mede de novo
if (window.ResizeObserver) new ResizeObserver(() => { if (tela) medirGrade(); }).observe(document.getElementById('pg-grade-caixa') || document.body);

function posicionar(pet, sem = false) {
  pet.el.style.transition = sem ? 'none' : '';
  pet.el.style.setProperty('--x', pet.x);
  pet.el.style.setProperty('--y', pet.y);
  pet.el.querySelector('.pg-seta').style.transform = `rotate(${pet.dir * 45}deg)`;
}
// quadro do pet: andando na direção (as diagonais usam a direção mais próxima) ou uma emoção
const ANIM_DIR = ['andar_direita', 'andar_direita', 'andar_frente', 'andar_esquerda', 'andar_esquerda', 'andar_esquerda', 'andar_costas', 'andar_direita'];
function pose(pet, tipo) {
  const forma = pet.p?.forma || pet.p?.pet;
  if (!forma) { pet.img.removeAttribute('src'); return; }
  const anim = tipo === 'parado' || tipo === 'andar' ? ANIM_DIR[pet.dir] : tipo;
  const lista = C.quadrosDe(forma, anim);
  pet.anim = tipo; pet.lista = lista; pet.q = 0;
  pet.img.src = lista[0] || '';
}
function tickAnim() {   // os quadros do andar rodam enquanto o pet anda; parado fica no 1º quadro
  if (!tela) return;
  for (const pet of Object.values(tela.pets || {})) {
    if (pet.anim === 'parado' || !pet.lista?.length) continue;
    pet.q = (pet.q + 1) % pet.lista.length;
    pet.img.src = pet.lista[pet.q];
  }
}
const esperar = (ms) => new Promise(ok => { const t = setTimeout(ok, ms); tela?.timers.push(t); });

function voltarAoInicio() {
  if (!tela) return;
  for (const pet of Object.values(tela.pets)) { pet.x = pet.ini.x; pet.y = pet.ini.y; pet.dir = pet.ini.dir; posicionar(pet, true); pose(pet, 'parado'); pet.el.classList.remove('bateu', 'feliz'); pet.el.querySelector('.pg-ai').hidden = true; }
  for (const el of $('pg-grade').querySelectorAll('.pg-petisco')) el.classList.remove('pego');
  $('pg-grade').querySelectorAll('.pg-casa.bateu').forEach(c => c.classList.remove('bateu'));
  try { ws?.highlightBlock(null); } catch (_) {}
}

// um evento da execução na tela (dur = ms do passo)
async function mostrarEvento(pet, ev, dur) {
  const quem = pet === tela?.pets?.outro ? 'outro' : 'eu';
  if (ev.tipo === 'andou') {
    deixarRastro('pegada', pet.x, pet.y, quem, { r: ev.dir * 45 + 90 });   // a pegada fica na casa de onde ele saiu
    pet.dir = ev.dir; pet.x = ev.x; pet.y = ev.y;
    pet.el.style.transitionDuration = Math.round(dur * 0.85) + 'ms';
    if (pet.anim !== 'andar') pose(pet, 'andar');
    posicionar(pet);
    C.tocar('clique');
  } else if (ev.tipo === 'virou') {
    deixarRastro('virou', pet.x, pet.y, quem, { txt: ((ev.dir - pet.dir + 8) % 8) <= 4 ? '↷' : '↶' });
    pet.dir = ev.dir; posicionar(pet); pose(pet, 'parado');
  } else if (ev.tipo === 'pegou') {
    $('pg-grade').querySelector(`.pg-petisco[data-p="${ev.x},${ev.y}"]`)?.classList.add('pego');
    C.tocar('acerto');
  } else if (ev.tipo === 'nada') {
    bolha(pet, 'nada aqui');
  } else if (ev.tipo === 'bateu') {
    deixarRastro('bateu', ev.x, ev.y, quem, { txt: '✖' });
    pet.el.classList.remove('bateu'); void pet.el.offsetWidth; pet.el.classList.add('bateu');
    $('pg-grade').querySelector(`.pg-casa[data-x="${ev.x}"][data-y="${ev.y}"]`)?.classList.add('bateu');
    pose(pet, C.temAnim(pet.p?.forma || pet.p?.pet, 'bravo') ? 'bravo' : 'triste_fome');   // o dragão adulto fica bravo
    bolha(pet, 'ai!');
    C.tocar('erro');
  } else if (ev.tipo === 'venceu') {
    pet.el.classList.add('feliz');
    pose(pet, 'feliz');
  }
}
function bolha(pet, txt) {
  const b = pet.el.querySelector('.pg-ai');
  b.textContent = txt; b.hidden = false;
  clearTimeout(pet.tb); pet.tb = setTimeout(() => { b.hidden = true; }, 900);
}

// ── Execução: ▶ Executar (tudo) e ⏭ 1 passo usam o mesmo gerador de executar() (tela.exec) ──
// tela.exec = { gen, saida, fase, prog, nb, buf (eventos espiados), nos (id → { no, pai }), voltas, bateuEm, ultimoBloco, passo }
function indexar(prog) {
  const m = new Map();
  const v = (l, pai) => (l || []).forEach(b => { m.set(b.id, { no: b, pai }); v(b.corpo, b); v(b.senao, b); });
  v(prog.corpo, null); v(prog.f1, null);
  return m;
}
function novaExecucao() {
  const prog = astDe(), cfg = tela.cfg;
  if (!prog.corpo.length) { avisarSolto('Encaixe os blocos <b>embaixo do 🏁 quando executar</b> (o 🏁 está piscando).'); if (cfg.tutorial) iniciarTutorial(); return null; }
  voltarAoInicio(); limparRastro(); limparAnotacoes();
  const fase = cfg.lado === 'b' ? lerFase(ladoB(tela.fase)) : tela.F;   // lado B da corrida: o pet sai do canto da direita
  const saida = {};
  tela.exec = { gen: executar(fase, prog, {}, saida), saida, fase, prog, nb: contarBlocos(prog), buf: [], nos: indexar(prog), voltas: new Map(),
    bateuEm: null, ultimoBloco: null, passo: false };
  if (!tela.corrida) cfg.aoExecutar?.({ blocos: tela.exec.nb, xml: xmlDe(), texto: textoDe(prog) });
  return tela.exec;
}
const proximoEv = (E) => { if (E.buf.length) return E.buf.shift(); const r = E.gen.next(); return r.done ? null : r.value; };
// condição de um "se" no estado de agora (para mostrar ✔ ou ✖; a execução em si é a de executar())
function condAgora(E, c) {
  const st = E.saida.estado, F = E.fase;
  if (!st) return false;
  if (c === 'pedra_frente') return !podeAndar(F, st.x, st.y, st.dir);
  if (c === 'livre_dir') return podeAndar(F, st.x, st.y, st.dir + 2);
  if (c === 'livre_esq') return podeAndar(F, st.x, st.y, st.dir - 2);
  if (c === 'petisco_aqui') return F.petiscos.some(([x, y]) => x === st.x && y === st.y && !st.pegos.has(`${x},${y}`));
  return false;
}
// um evento: bloco (destaca, conta a volta do repita, ✔/✖ do se), ação (pet + rastro) ou fim
async function processar(E, ev) {
  if (!ev) return { fim: { motivo: 'acabou' } };
  if (ev.tipo === 'bloco') {
    try { ws.highlightBlock(ev.id); } catch (_) {}
    E.ultimoBloco = ev.id;
    const it = E.nos.get(ev.id);
    if (it) {
      if (it.no.t === 'repita' || it.no.t === 'repita_ate') { E.voltas.set(it.no.id, 0); anotar(it.no.id, ''); }
      const pai = it.pai;
      if (pai && (pai.t === 'repita' || pai.t === 'repita_ate') && pai.corpo?.[0]?.id === ev.id) {   // começou mais uma volta
        const v = (E.voltas.get(pai.id) || 0) + 1;
        E.voltas.set(pai.id, v);
        anotar(pai.id, pai.t === 'repita' ? `${v}/${pai.n}` : `${v}ª volta`);
      }
      if (it.no.t === 'se') { const ok = condAgora(E, it.no.c); anotar(it.no.id, ok ? '✔' : '✖', ok ? 'sim' : 'nao'); return { se: true }; }
    }
    return { bloco: true };
  }
  if (ev.tipo === 'fim') return { fim: ev };
  const pet = tela.pets.eu;
  await mostrarEvento(pet, ev, tela.vel);
  if (ev.tipo === 'venceu') return { fim: { motivo: 'venceu' } };
  if (ev.tipo === 'bateu') E.bateuEm = { bloco: ws.getBlockById(E.ultimoBloco)?.type || null, x: ev.x, y: ev.y };
  return { acao: true };
}

// ▶ Executar: do começo (ou de onde o passo a passo parou) até o fim
async function executarPrograma() {
  if (!tela || tela.rodando || tela.pronto) return;
  let E = tela.exec;
  if (!E) E = novaExecucao();
  if (!E) return;
  E.passo = false;
  tela.rodando = true; tela.parar = false;
  $('pg-exec').disabled = true;
  msg(tela.corrida ? 'Testando…' : 'Executando…');
  clearInterval(tela.anim);
  tela.anim = setInterval(tickAnim, 140);
  const pet = tela.pets.eu;
  let fim = null;
  while (tela && !tela.parar) {
    const r = await processar(E, proximoEv(E));
    if (!tela) return;
    if (r.fim) { fim = r.fim; break; }
    if (r.bloco || r.se) { await esperar(tela.vel * (r.se ? 0.6 : 0.25)); continue; }
    await esperar(tela.vel);
    if (pet.anim === 'andar') pose(pet, 'parado');
  }
  if (!tela) return;
  clearInterval(tela.anim);
  tela.rodando = false;
  $('pg-exec').disabled = false;
  if (!fim) { E.passo = true; msg('⏸ Parado. Toque em <b>⏭ 1 passo</b> para continuar ou em <b>↺</b> para recomeçar.'); return; }   // ⏸: dá para seguir de onde parou
  terminar(E, fim);
}

// ⏭ 1 passo: o 1º toque volta ao início e destaca o primeiro bloco; cada toque seguinte faz uma ação (ou a checagem de um "se")
async function darPasso() {
  if (!tela || tela.rodando || tela.pronto) return;
  let E = tela.exec;
  if (!E || !E.passo) {
    E = novaExecucao();
    if (!E) return;
    E.passo = true;
    msg('⏭ Passo a passo: cada toque em <b>1 passo</b> faz uma ação. <b>▶</b> continua até o fim.');
    await espiar(E);
    return;
  }
  tela.rodando = true;
  const pet = tela.pets.eu;
  let fim = null;
  for (;;) {
    const r = await processar(E, proximoEv(E));
    if (!tela) return;
    if (r.fim) { fim = r.fim; break; }
    if (r.se) break;                                      // a checagem do "se" conta como um passo
    if (r.acao) { clearInterval(tela.anim); tela.anim = setInterval(tickAnim, 140); await esperar(tela.vel); clearInterval(tela.anim); if (pet.anim === 'andar') pose(pet, 'parado'); break; }
  }
  if (!tela) return;
  tela.rodando = false;
  if (fim) { terminar(E, fim); return; }
  await espiar(E);
}
// destaca o próximo bloco (sem rodar); se o que vem é o fim, termina já
async function espiar(E) {
  const ev = proximoEv(E);
  if (!ev) { terminar(E, { motivo: 'acabou' }); return; }
  if (ev.tipo === 'fim') { terminar(E, ev); return; }
  if (ev.tipo === 'venceu') { await mostrarEvento(tela.pets.eu, ev, tela.vel); terminar(E, { motivo: 'venceu' }); return; }
  E.buf.unshift(ev);
  if (ev.tipo === 'bloco') { try { ws.highlightBlock(ev.id); } catch (_) {} }
}
function encerrarPasso(texto) {
  if (!tela?.exec) return;
  tela.exec = null;
  voltarAoInicio(); limparRastro(); limparAnotacoes();
  if (texto) msg(texto, 'aviso');
}

// Fim da execução (igual no ▶ e no ⏭): venceu, bateu, não terminou ou acabou antes da comida
function terminar(E, fim) {
  if (!tela) return;
  tela.exec = null;
  const cfg = tela.cfg, nb = E.nb, prog = E.prog;
  if (fim.motivo === 'venceu') {
    try { ws.highlightBlock(null); } catch (_) {}
    if (cfg.tutorial) pararTutorial();
    if (tela.corrida) { msg('✅ Chegou! Quando estiver pronto, aperte <b>Pronto!</b>', 'ok'); return; }
    C.tocar('vitoria');
    const est = cfg.modo === 'fase' ? estrelasDe(nb, cfg.meta) : null;
    if (est) $('pg-estrelas').textContent = '⭐'.repeat(est) + '☆'.repeat(3 - est);
    const tempo_s = Math.round((Date.now() - tela.inicio) / 1000);
    msg(est ? `🎉 Conseguiu com ${nb} blocos! ${est < 3 && cfg.meta ? `Dá para fazer com ${est === 1 ? cfg.meta + 3 : cfg.meta} ou menos.` : 'Perfeito!'}` : `🎉 Conseguiu com ${nb} blocos em ${tempo_s} s!`, 'ok');
    cfg.aoVencer?.({ blocos: nb, estrelas: est, xml: xmlDe(), texto: textoDe(prog), prog, tempo_s });
    return;
  }
  if (fim.motivo === 'bateu') { msg('💥 O pet bateu! Confira o bloco destacado.', 'erro'); if (!tela.corrida) cfg.aoBater?.({ ...E.bateuEm, ...casaOriginal(E.bateuEm), xml: xmlDe(), texto: textoDe(prog) }); return; }
  try { ws.highlightBlock(null); } catch (_) {}
  if (fim.motivo === 'longo') { msg('🔁 O programa não termina. Confira as repetições.', 'erro'); return; }
  const faltam = fim.faltam;
  msg(fim.naComida && faltam ? `Faltou pegar ${faltam === 1 ? '1 petisco' : faltam + ' petiscos'} 🐾 antes da comida.` : 'O programa acabou antes de chegar na comida. Falta caminho!', 'aviso');
  if (blocosSoltos()) avisarSolto('Tem bloco solto: só conta o que está <b>encaixado embaixo de 🏁</b>.');
}

// casa onde bateu, na fase original (o que fica salvo não depende de a tela estar girada)
function casaOriginal(b) {
  if (!tela.giro || b?.x == null) return {};
  const [x, y] = desgirarPonto(b.x, b.y, tela.F.w);
  return { x, y };
}

function pararPrograma() { if (tela?.rodando) tela.parar = true; }
function reiniciar() {
  if (!tela) return;
  tela.parar = true;
  setTimeout(() => { if (tela && !tela.rodando) { tela.exec = null; voltarAoInicio(); limparRastro(); limparAnotacoes(); msg(''); } }, 60);
}

// ── Rastro do caminho: pegadas (roxo = meu pet, laranja = rival), ✖ onde bateu, setinha onde virou. Fica até a próxima execução. ──
function deixarRastro(tipo, x, y, quem, extra = {}) {
  const i = document.createElement('i');
  i.className = `pg-rastro ${tipo} ${quem}`;
  i.style.setProperty('--x', x); i.style.setProperty('--y', y);
  if (extra.r != null) i.style.setProperty('--r', extra.r + 'deg');
  if (extra.txt) i.textContent = extra.txt;
  $('pg-grade').appendChild(i);
}
function limparRastro() { $('pg-grade')?.querySelectorAll('.pg-rastro').forEach(e => e.remove()); }

// ── Anotações ao lado dos blocos: volta do repita ("2/4") e ✔/✖ do "se" ──
function anotar(id, txt, cls = '') {
  const caixa = $('pg-anotacoes'), b = ws?.getBlockById(id);
  let el = caixa.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (!txt || !b) { el?.remove(); return; }
  if (!el) { el = document.createElement('span'); el.dataset.id = id; caixa.appendChild(el); }
  el.className = 'pg-anot ' + cls;
  el.textContent = txt;
  const r = b.getSvgRoot().getBoundingClientRect(), base = caixa.getBoundingClientRect();
  const larg = el.offsetWidth || 40;   // ao lado do bloco, sem sair da área dos blocos
  el.style.left = Math.max(4, Math.min(r.left - base.left + Math.min(r.width, 190) + 6, base.width - larg - 6)) + 'px';
  el.style.top = Math.max(2, r.top - base.top + 4) + 'px';
}
function limparAnotacoes() { const c = $('pg-anotacoes'); if (c) c.innerHTML = ''; }


// ── Corrida: contagem, Pronto!, e os dois pets executando juntos ──
function relogio() {
  if (!tela?.cfg.fimEm) return;
  const falta = Math.max(0, tela.cfg.fimEm() - C.agora());
  $('pg-tempo').textContent = tela.pronto ? '⏳ Esperando…' : `⏱ ${Math.ceil(falta / 1000)} s`;
  $('pg-tempo').classList.toggle('acabando', falta < 10000);
  if (falta <= 0 && !tela.pronto) pronto(true);
  tela.raf = requestAnimationFrame(relogio);
}
function pronto(acabouTempo = false) {
  if (!tela || tela.pronto) return;
  const prog = astDe();
  // apertou Pronto sem nada encaixado no 🏁: avisa em vez de mandar um programa vazio (com o tempo acabado, vai assim mesmo)
  if (!acabouTempo && !prog.corpo.length) { avisarSolto('Encaixe pelo menos um bloco <b>embaixo de 🏁</b> antes do Pronto!'); return; }
  tela.parar = true;
  tela.pronto = true;
  tela.exec = null; limparAnotacoes();
  $('pg-trava').hidden = false;
  $('pg-pronto').disabled = true; $('pg-exec').disabled = true;
  msg('✅ Programa enviado! Esperando o resultado…', 'ok');
  voltarAoInicio();
  tela.cfg.aoPronto?.(prog, xmlDe());
}

// ── Bloco solto: o 🏁 pisca e a mensagem fica em destaque ──
const blocosSoltos = () => (ws ? ws.getTopBlocks(false).filter(b => b.type !== 'pg_inicio' && b.type !== 'pg_f1_def').length : 0);
function avisarSolto(html) {
  msg(html, 'aviso destaque');
  const g = ws?.getBlocksByType('pg_inicio', false)[0]?.getSvgRoot();
  if (!g) return;
  g.classList.remove('pg-pisca');
  requestAnimationFrame(() => g.classList.add('pg-pisca'));
  clearTimeout(tela?.tPisca);
  if (tela) tela.tPisca = setTimeout(() => g.classList.remove('pg-pisca'), 3800);
}

// ── Cartão de vitória / resultado (por cima da grade e dos blocos) ──
// { titulo, estrelas (0–3 ou null), info (html), botoes: [{ id, texto, classe }], anims (sequência do pet), confete }
// → Promise com o id do botão tocado (null se a tela fechar antes)
const semMov = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function mostrarCartao({ titulo, estrelas = null, info = '', botoes = [], anims = null, confete = true }) {
  return new Promise((ok) => {
    if (!tela) { ok(null); return; }
    const p = C.pet(), forma = p?.forma || p?.pet;
    $('pg-vit-tit').textContent = titulo;
    $('pg-vit-estrelas').innerHTML = estrelas == null ? '' : [0, 1, 2].map(i => `<span style="animation-delay:${(0.3 + i * 0.4).toFixed(1)}s">${i < estrelas ? '⭐' : '☆'}</span>`).join('');
    $('pg-vit-info').innerHTML = info;
    $('pg-vit-botoes').innerHTML = botoes.map(b => `<button class="jr-btn ${b.classe || ''}" data-vit="${b.id}">${b.texto}</button>`).join('');
    const img = $('pg-vit-pet');
    img.hidden = !forma;
    $('pg-vit-confete').innerHTML = '';
    $('pg-vit-efeitos').innerHTML = '';
    $('pg-vitoria').hidden = false;
    // vitória (sem `anims` de quem chamou): comemoração com estrelas em volta da cabeça, confete e a fala do pet (PROMPT-65).
    // Adulto com a sequência `vitoria`: alterna sentado de lado e nariz empinado e PARA de nariz empinado.
    // Os outros: adulto animado → orgulhoso → rugido; filhote cambalhota (ou feliz) — uma vez só, parando no último quadro.
    const vitoria = !anims;
    const seq = vitoria && forma && C.temSequencia?.(forma, 'vitoria') ? 'vitoria' : null;
    const lista = anims || (forma !== p?.pet ? ['animado', 'orgulhoso', 'rugido'] : C.temAnim(forma, 'pulo_cambalhota') ? ['pulo_cambalhota'] : ['feliz']);
    if (forma) {
      C.pintar(img, p);
      const primeiro = seq ? C.quadrosSeq(forma, seq)[0] : C.quadrosDe(forma, lista[0])[0];
      crescerPet(img, forma, primeiro, vitoria ? 64 : 0).then((pos) => {
        if (!tela || $('pg-vitoria').hidden) return;
        if (seq) {
          if (semMov()) img.src = C.quadrosSeq(forma, seq).at(-1) || img.src;   // direto o nariz empinado
          else C.tocarSequencia(img, forma, seq, { deFrente: false });          // o último quadro fica enquanto o cartão estiver aberto
        } else animarPetCartao(img, forma, lista);
        if (vitoria && pos) efeitosVitoria(pos, p, primeiro);
        if (confete && !semMov()) soltarConfete(vitoria);
      });
    } else if (confete && !semMov()) soltarConfete(vitoria);
    const el = $('pg-vit-botoes');
    const clique = (e) => {
      const b = e.target.closest('[data-vit]');
      if (!b) return;
      el.removeEventListener('click', clique);
      $('pg-vitoria').hidden = true;
      C.pararSequencia?.(img);
      if (tela) { clearInterval(tela.animCartao); clearTimeout(tela.tFala); }
      $('pg-vit-efeitos').innerHTML = '';
      ok(b.dataset.vit);
    };
    el.addEventListener('click', clique);
  });
}
// O pet grande: sai do lugar onde chegou no tabuleiro e cresce (~0,6 s) até a área livre (em pé: em cima do cartão; deitado: ao lado).
// O tamanho vem do cartão já posto: se faltar altura, o pet diminui; o cartão nunca é cortado.
// Devolve onde o desenho ficou ({ left, top, larg, alt, c }) para as estrelas e o balão.
async function crescerPet(img, forma, src0, topo = 0) {   // topo: faixa livre em cima (o balão da fala, na vitória)
  const raiz = $('programe').getBoundingClientRect(), card = $('pg-vit-caixa').getBoundingClientRect();
  const emPe = raiz.height > raiz.width;
  const reg = emPe ? { x: 8, y: 8 + topo, w: raiz.width - 16, h: card.top - raiz.top - 16 - topo } : { x: 8, y: 8 + topo, w: card.left - raiz.left - 16, h: raiz.height - 16 - topo };
  const c = (await caixaDoQuadro(src0)) || { x0: 0, y0: 0, x1: 1, y1: 1, w: 1, h: 1 };
  if (!tela) return null;
  const bw = c.x1 - c.x0, bh = c.y1 - c.y0, ar = c.h / c.w;
  // largura da imagem: o desenho com ~85% da tela em pé (no máximo a área livre), e a altura cabendo na área.
  // A escala do pet (PROMPT-63): o de maior escala preenche a área; os outros ficam proporcionais (nada sai da área)
  const prop = (C.escalaPet?.(forma) || 1) / (C.escalaMax?.() || 1);
  const larg = Math.max(40, Math.min((emPe ? Math.min(raiz.width * 0.8, reg.w * 0.9) : reg.w * 0.8) / bw, reg.h * 0.85 / (bh * ar)) * prop);
  const alt = larg * ar, cx = reg.x + reg.w / 2, cy = reg.y + reg.h / 2;
  const left = cx - (c.x0 + bw / 2) * larg, top = cy - (c.y0 + bh / 2) * alt;
  Object.assign(img.style, { left: left + 'px', top: top + 'px', width: larg + 'px', height: alt + 'px' });
  img.src = src0;
  const origem = tela.pets?.eu?.img?.getBoundingClientRect();
  if (origem && origem.width && !semMov()) {   // FLIP: começa do tamanho e do lugar do pet no tabuleiro
    const k = origem.width / larg;
    await img.animate([{ transform: `translate(${origem.left - raiz.left - left}px, ${origem.top - raiz.top - top}px) scale(${k})`, opacity: .9 }, { transform: 'none', opacity: 1 }],
      { duration: 600, easing: 'cubic-bezier(.2,.9,.3,1.1)' }).finished.catch(() => {});
  }
  return tela ? { left, top, larg, alt, c, raiz } : null;
}
// Toca as animações uma vez e para no último quadro (nada de ficar repetindo)
function animarPetCartao(img, forma, anims) {
  clearInterval(tela.animCartao);
  const passo = 180, seq = [];
  for (const a of anims) { const q = C.quadrosDe(forma, a); const n = q.length === 1 ? Math.ceil(1500 / passo) : Math.max(q.length, Math.ceil(900 / passo)); for (let i = 0; i < n; i++) seq.push(q[i % q.length]); }
  const ultimo = C.quadrosDe(forma, anims[anims.length - 1]);
  const fim = ultimo[ultimo.length - 1] || seq[seq.length - 1] || '';
  if (semMov() || !seq.length) { img.src = fim; return; }
  let i = 0;
  img.src = seq[0];
  tela.animCartao = setInterval(() => { i++; if (i < seq.length) img.src = seq[i]; else { img.src = fim; clearInterval(tela.animCartao); } }, passo);
}
// ⭐ estrelas douradas em volta da cabeça (piscando e mudando de tamanho) e, ~1 s depois, o balão com a fala do pet
// onde fica a cabeça no quadro: o meio dos pixels da faixa de cima do desenho (15% da altura). Funciona de frente ou de lado.
const cabecas = new Map();
function cabecaDoQuadro(src) {
  if (!cabecas.has(src)) cabecas.set(src, new Promise((ok) => {
    const im = new Image();
    im.onload = () => {
      try {
        const k = Math.min(1, 240 / im.naturalWidth), w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(im, 0, 0, w, h);
        const px = ctx.getImageData(0, 0, w, h).data, a = (x, y) => px[(y * w + x) * 4 + 3] > 8;
        let y0 = -1, y1 = -1;
        for (let y = 0; y < h && y0 < 0; y++) for (let x = 0; x < w; x++) if (a(x, y)) { y0 = y; break; }
        for (let y = h - 1; y >= 0 && y1 < 0; y--) for (let x = 0; x < w; x++) if (a(x, y)) { y1 = y; break; }
        if (y0 < 0) { ok(null); return; }
        const faixa = y0 + Math.max(2, Math.round((y1 - y0) * 0.15));
        let sx = 0, n = 0;
        for (let y = y0; y <= faixa; y++) for (let x = 0; x < w; x++) if (a(x, y)) { sx += x; n++; }
        ok({ x: sx / n / w, y: (y0 + (faixa - y0) / 2) / h, alt: (faixa - y0) / h });
      } catch (_) { ok(null); }
    };
    im.onerror = () => ok(null);
    im.src = src;
  }));
  return cabecas.get(src);
}
const ESTRELA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.2L12 17.8l-6.4 3.5 1.4-7.2-5.3-5 7.2-.9z"/></svg>';
async function efeitosVitoria({ left, top, larg, alt, c, raiz }, p, src) {
  const caixa = $('pg-vit-efeitos'), bw = c.x1 - c.x0, bh = c.y1 - c.y0;
  // cabeça: medida no quadro (o topo do desenho); sem medida, a parte de cima do meio
  const cab = await cabecaDoQuadro(src);
  if (!tela || $('pg-vitoria').hidden) return;
  const hx = left + (cab ? cab.x : c.x0 + bw * 0.5) * larg, hy = top + (cab ? cab.y + cab.alt * 0.6 : c.y0 + bh * 0.15) * alt;
  const rx = Math.max(56, bw * larg * 0.32), ry = Math.max(40, bh * alt * 0.2);
  let html = '';
  for (let i = 0; i < 6; i++) {
    const ang = Math.PI * (0.95 + i * 0.22), t = 20 + (i % 3) * 7;   // arco por cima e dos lados da cabeça
    html += `<i class="pg-vit-estrela" style="left:${hx + Math.cos(ang) * rx}px;top:${hy + Math.sin(ang) * ry}px;width:${t}px;height:${t}px;animation-delay:${(i * 0.23).toFixed(2)}s">${ESTRELA_SVG}</i>`;
  }
  caixa.innerHTML = html;
  const frase = C.fraseComemora?.(p?.pet);
  if (!frase) return;
  const mostrar = () => {
    if (!tela || $('pg-vitoria').hidden) return;
    const b = document.createElement('div');
    b.className = 'pg-vit-fala';
    b.textContent = frase;
    caixa.appendChild(b);
    const w = b.offsetWidth, h = b.offsetHeight;   // em cima da cabeça, sem sair da tela
    b.style.left = Math.max(8, Math.min(raiz.width - w - 8, hx - w / 2)) + 'px';
    b.style.top = Math.max(8, hy - ry - h - 6) + 'px';
  };
  clearTimeout(tela.tFala);
  if (semMov()) mostrar(); else tela.tFala = setTimeout(mostrar, 1000);
}
// confete: emojis e, na vitória, também papeizinhos coloridos (mais denso)
function soltarConfete(denso = false) {
  const c = $('pg-vit-confete'), simb = ['🎉', '✨', '⭐', '🎊'], cores = ['#ffd700', '#ff7b2e', '#00d4ff', '#00e676', '#ff5c9a', '#7c5cfc'];
  const n = denso ? 48 : 22;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    if (denso && i % 2) { s.className = 'papel'; s.style.background = cores[i % cores.length]; s.style.setProperty('--gira', `${(Math.random() * 720 - 360).toFixed(0)}deg`); }
    else s.textContent = simb[i % simb.length];
    s.style.left = Math.random() * 100 + '%';
    s.style.animationDelay = (Math.random() * (denso ? 2.4 : 0.8)).toFixed(2) + 's';
    if (denso) s.style.animationDuration = (2.2 + Math.random() * 1.4).toFixed(2) + 's';
    c.appendChild(s);
  }
}

// Mostra a corrida: eventos de cada lado (de resultadoCorrida), no mesmo ritmo (cada ação = 1 tique; bater = +5)
export async function mostrarCorrida(evEu, evOutro) {
  if (!tela) return;
  if (tela.giro) { const h = tela.F.w; evEu = evEu.map(e => girarEvento(e, h)); evOutro = evOutro.map(e => girarEvento(e, h)); }   // eventos vêm da fase original
  tela.mostrando = true;
  voltarAoInicio(); limparRastro(); limparAnotacoes();
  msg('🏁 Valendo!');
  const linha = (evs) => { const out = []; let t = 0; for (const ev of evs) {
    if (ev.tipo === 'andou' || ev.tipo === 'virou' || ev.tipo === 'pegou' || ev.tipo === 'nada') { t++; out.push([t, ev]); }
    else if (ev.tipo === 'bateu') { t++; out.push([t, ev]); t += 5; }
    else if (ev.tipo === 'venceu') out.push([t, ev]);
  } return out; };
  const L1 = linha(evEu), L2 = linha(evOutro), fim = Math.max(L1.at(-1)?.[0] || 0, L2.at(-1)?.[0] || 0);
  clearInterval(tela.anim);
  tela.anim = setInterval(tickAnim, 140);
  const ms = 400;
  for (let t = 0; t <= fim && tela; t++) {
    for (const [lista, pet] of [[L1, tela.pets.eu], [L2, tela.pets.outro]]) for (const [tt, ev] of lista) if (tt === t && pet) mostrarEvento(pet, ev, ms);
    await esperar(ms);
    for (const pet of Object.values(tela?.pets || {})) if (pet.anim === 'andar') pose(pet, 'parado');
  }
  if (tela) { clearInterval(tela.anim); tela.mostrando = false; }
}
export function mensagemCorrida(html, tipo) { if (tela) msg(html, tipo); }
export function travarMontagem(texto) { if (!tela) return; tela.pronto = true; $('pg-trava').hidden = false; $('pg-trava').textContent = texto || ''; }

// botões
export function ligarBotoesPrograme() {
  $('pg-exec').addEventListener('click', executarPrograma);
  $('pg-passo').addEventListener('click', darPasso);
  $('pg-parar').addEventListener('click', pararPrograma);
  $('pg-reset').addEventListener('click', reiniciar);
  $('pg-pronto').addEventListener('click', pronto);
  $('pg-sair').addEventListener('click', () => fecharTela());
}

// Jogo de Revisão — "Programe o pet" (PROMPT-50): a tela (Blockly + grade + pet que executa o programa).
// As regras ficam em programe-logica.js; progresso, prêmios, rankings e corrida ficam no jogo (jogo-revisao.js),
// que passa o que esta tela precisa em configurarPrograme(ctx).
import { lerFase, executar, contarBlocos, estrelasDe, ladoB } from '/js/jogo-revisao/programe-logica.js';

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
// cfg: { modo: 'fase'|'dia'|'corrida'|'fantasma', fase, titulo, sub, meta, xml, lado ('a'|'b'), rival: { nome, pet, forma, tinta },
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
  const F = lerFase(cfg.fase);
  tela = { cfg, F, corrida, rodando: false, parar: false, vel: 420, pronto: false, inicio: Date.now(), timers: [], quadro: {}, raf: 0 };
  $('programe').classList.toggle('corrida', corrida);
  $('pg-exec').textContent = corrida ? '▶ Testar' : '▶ Executar';
  $('pg-pronto').hidden = !corrida;
  $('pg-tempo').hidden = !cfg.fimEm;
  $('pg-trava').hidden = true;
  // Blockly
  ws?.dispose();
  const tema = B.Theme.defineTheme('jr-pg', { base: B.Themes.Classic, componentStyles: {
    workspaceBackgroundColour: '#11142a', toolboxBackgroundColour: '#161a2e', flyoutBackgroundColour: '#1b2040', flyoutOpacity: 1,
    scrollbarColour: '#7c5cfc', insertionMarkerColour: '#ffd700', cursorColour: '#ffd700' } });
  ws = B.inject($('pg-blockly'), { toolbox: toolboxDe(cfg.fase.blocos || []), renderer: 'zelos', theme: tema, trashcan: true, sounds: false,
    zoom: { controls: true, startScale: 0.8, maxScale: 1.4, minScale: 0.5 }, move: { scrollbars: true, drag: true, wheel: true },
    maxInstances: { pg_inicio: 1, pg_f1_def: 1 } });
  let ok = false;
  if (cfg.xml) { try { B.Xml.domToWorkspace(B.utils.xml.textToDom(cfg.xml), ws); ok = ws.getBlocksByType('pg_inicio', false).length > 0; } catch (_) { ws.clear(); } }
  if (!ok) { ws.clear(); const ini = ws.newBlock('pg_inicio'); ini.initSvg(); ini.render(); ini.moveBy(30, 30); }
  for (const b of ws.getBlocksByType('pg_inicio', false)) b.setDeletable(false);
  ws.addChangeListener((e) => { if (!e.isUiEvent) atualizarContagem(); });
  atualizarContagem();
  // grade e pets
  montarGrade();
  if (cfg.fimEm) relogio();
  setTimeout(() => B.svgResize(ws), 50);
  return true;
}

export function fecharTela(silencioso = false) {
  if (!tela && silencioso) { $('programe').hidden = true; return; }
  const cfg = tela?.cfg;
  if (tela) { tela.parar = true; tela.timers.forEach(clearTimeout); cancelAnimationFrame(tela.raf); clearInterval(tela.anim); }
  tela = null;
  try { ws?.dispose(); } catch (_) {}
  ws = null;
  $('programe').hidden = true;
  if (!silencioso) cfg?.aoFechar?.();
}
export const telaAberta = () => !!tela;

function msg(txt, tipo = '') { const el = $('pg-msg'); el.innerHTML = txt; el.className = 'pg-msg ' + tipo; }
function atualizarContagem() {
  if (!tela || !ws) return;
  const n = contarBlocos(astDe());
  const meta = tela.cfg.meta;
  $('pg-contagem').innerHTML = `Blocos usados: <b>${n}</b>${meta ? ` <small>(meta ⭐⭐⭐: ≤ ${meta})</small>` : ''}`;
}

// ── Grade ──
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
  // pets: o meu (e, na corrida, o do outro lado)
  const eu = C.pet();
  tela.pets = {};
  const inicioEu = cfg.lado === 'b' && cfg.fase.inicioB ? { x: cfg.fase.inicioB[0], y: cfg.fase.inicioB[1], dir: 4 } : { x: F.inicio[0], y: F.inicio[1], dir: F.dir };
  tela.pets.eu = criarPet(eu, inicioEu, 'eu');
  if (tela.corrida && cfg.rival) {
    const ib = cfg.lado === 'b' ? { x: F.inicio[0], y: F.inicio[1], dir: F.dir } : { x: cfg.fase.inicioB[0], y: cfg.fase.inicioB[1], dir: 4 };
    tela.pets.outro = criarPet(cfg.rival, ib, 'outro');
  }
  medirGrade();
}
function criarPet(p, ini, quem) {
  const g = $('pg-grade');
  const el = document.createElement('div');
  el.className = `pg-pet-caixa ${quem}`;
  el.innerHTML = `<i class="pg-seta"></i><img class="pg-pet" alt="" draggable="false"/><span class="pg-ai" hidden></span>${quem === 'outro' ? `<span class="pg-nome">${C.esc(p?.nome || 'Rival')}</span>` : ''}`;
  g.appendChild(el);
  const img = el.querySelector('img');
  if (p?.pet) C.pintar(img, p);   // tinta do pet (o meu ou o do rival)
  const pet = { el, img, p, ini, x: ini.x, y: ini.y, dir: ini.dir, anim: '', q: 0 };
  posicionar(pet, true);
  pose(pet, 'parado');
  return pet;
}
function medirGrade() {
  if (!tela) return;
  const { F } = tela, cx = $('pg-grade-caixa').getBoundingClientRect();
  const s = Math.max(16, Math.floor(Math.min(cx.width / F.w, cx.height / F.h)));
  $('pg-grade').style.setProperty('--s', s + 'px');
  for (const pet of Object.values(tela.pets || {})) {
    const forma = pet.p?.forma || pet.p?.pet;
    pet.img.style.height = (s * 0.92 / (forma ? C.sentadoNoQuadro(forma) : 0.86)) + 'px';
  }
}
window.addEventListener('resize', () => { if (tela) { medirGrade(); try { window.Blockly?.svgResize(ws); } catch (_) {} } });

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
  if (ev.tipo === 'andou') {
    pet.dir = ev.dir; pet.x = ev.x; pet.y = ev.y;
    pet.el.style.transitionDuration = Math.round(dur * 0.85) + 'ms';
    if (pet.anim !== 'andar') pose(pet, 'andar');
    posicionar(pet);
    C.tocar('clique');
  } else if (ev.tipo === 'virou') {
    pet.dir = ev.dir; posicionar(pet); pose(pet, 'parado');
  } else if (ev.tipo === 'pegou') {
    $('pg-grade').querySelector(`.pg-petisco[data-p="${ev.x},${ev.y}"]`)?.classList.add('pego');
    C.tocar('acerto');
  } else if (ev.tipo === 'nada') {
    bolha(pet, 'nada aqui');
  } else if (ev.tipo === 'bateu') {
    pet.el.classList.remove('bateu'); void pet.el.offsetWidth; pet.el.classList.add('bateu');
    $('pg-grade').querySelector(`.pg-casa[data-x="${ev.x}"][data-y="${ev.y}"]`)?.classList.add('bateu');
    pose(pet, C.temAnim(pet.p?.forma || pet.p?.pet, 'assustado') ? 'assustado' : 'triste_fome');
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

// ── Executar (fase, desafio do dia; na corrida = Testar) ──
async function executarPrograma() {
  if (!tela || tela.rodando || tela.pronto) return;
  const prog = astDe(), nb = contarBlocos(prog), cfg = tela.cfg;
  if (!prog.corpo.length) { msg('Arraste blocos e encaixe embaixo de <b>🏁 quando executar</b>.', 'aviso'); return; }
  voltarAoInicio();
  tela.rodando = true; tela.parar = false;
  $('pg-exec').disabled = true;
  msg(tela.corrida ? 'Testando…' : 'Executando…');
  if (!tela.corrida) cfg.aoExecutar?.({ blocos: nb, xml: xmlDe(), texto: textoDe(prog) });
  clearInterval(tela.anim);
  tela.anim = setInterval(tickAnim, 140);
  const pet = tela.pets.eu, F = tela.F;
  const fase = cfg.lado === 'b' ? lerFase(ladoB(cfg.fase)) : F;   // lado B da corrida: o pet sai do canto da direita
  let resultado = null, bateuEm = null;
  for (const ev of executar(fase, prog)) {
    if (!tela || tela.parar) break;
    if (ev.tipo === 'bloco') { try { ws.highlightBlock(ev.id); } catch (_) {} tela.ultimoBloco = ev.id; await esperar(tela.vel * 0.25); continue; }
    if (ev.tipo === 'fim') { resultado = ev; break; }
    await mostrarEvento(pet, ev, tela.vel);
    if (ev.tipo === 'bateu') bateuEm = { bloco: ws.getBlockById(tela.ultimoBloco)?.type || null, x: ev.x, y: ev.y };
    if (ev.tipo === 'venceu') { resultado = { motivo: 'venceu' }; break; }
    await esperar(tela.vel);
    if (pet.anim === 'andar') pose(pet, 'parado');
  }
  if (!tela) return;
  clearInterval(tela.anim);
  tela.rodando = false;
  $('pg-exec').disabled = false;
  if (tela.parar) { msg('Parado. Ajuste os blocos e execute de novo.'); try { ws.highlightBlock(null); } catch (_) {} return; }
  if (resultado?.motivo === 'venceu') {
    try { ws.highlightBlock(null); } catch (_) {}
    if (tela.corrida) { msg('✅ Chegou! Quando estiver pronto, aperte <b>Pronto!</b>', 'ok'); return; }
    C.tocar('vitoria');
    const est = cfg.modo === 'fase' ? estrelasDe(nb, cfg.meta) : null;
    if (est) $('pg-estrelas').textContent = '⭐'.repeat(est) + '☆'.repeat(3 - est);
    const tempo_s = Math.round((Date.now() - tela.inicio) / 1000);
    msg(est ? `🎉 Conseguiu com ${nb} blocos! ${est < 3 && cfg.meta ? `Dá para fazer com ${est === 1 ? cfg.meta + 3 : cfg.meta} ou menos.` : 'Perfeito!'}` : `🎉 Conseguiu com ${nb} blocos em ${tempo_s} s!`, 'ok');
    cfg.aoVencer?.({ blocos: nb, estrelas: est, xml: xmlDe(), texto: textoDe(prog), prog, tempo_s });
    return;
  }
  if (resultado?.motivo === 'bateu') { msg('💥 O pet bateu! Confira o bloco destacado.', 'erro'); if (!tela.corrida) cfg.aoBater?.({ ...bateuEm, xml: xmlDe(), texto: textoDe(prog) }); return; }
  try { ws.highlightBlock(null); } catch (_) {}
  if (resultado?.motivo === 'longo') { msg('🔁 O programa não termina. Confira as repetições.', 'erro'); return; }
  const faltam = resultado?.faltam;
  msg(resultado?.naComida && faltam ? `Faltou pegar ${faltam === 1 ? '1 petisco' : faltam + ' petiscos'} 🐾 antes da comida.` : 'O programa acabou antes de chegar na comida. Falta caminho!', 'aviso');
}

function pararPrograma() { if (tela?.rodando) tela.parar = true; }
function reiniciar() { if (!tela) return; tela.parar = true; setTimeout(() => { if (tela && !tela.rodando) { voltarAoInicio(); msg(''); } }, 60); }
function alternarVelocidade() {
  if (!tela) return;
  tela.vel = tela.vel > 300 ? 170 : 420;
  $('pg-vel').textContent = tela.vel > 300 ? '🐢' : '🐇';
}

// ── Corrida: contagem, Pronto!, e os dois pets executando juntos ──
function relogio() {
  if (!tela?.cfg.fimEm) return;
  const falta = Math.max(0, tela.cfg.fimEm() - C.agora());
  $('pg-tempo').textContent = tela.pronto ? '⏳ Esperando…' : `⏱ ${Math.ceil(falta / 1000)} s`;
  $('pg-tempo').classList.toggle('acabando', falta < 10000);
  if (falta <= 0 && !tela.pronto) pronto();
  tela.raf = requestAnimationFrame(relogio);
}
function pronto() {
  if (!tela || tela.pronto) return;
  tela.parar = true;
  tela.pronto = true;
  const prog = astDe();
  $('pg-trava').hidden = false;
  $('pg-pronto').disabled = true; $('pg-exec').disabled = true;
  msg('✅ Programa enviado! Esperando o resultado…', 'ok');
  voltarAoInicio();
  tela.cfg.aoPronto?.(prog, xmlDe());
}

// Mostra a corrida: eventos de cada lado (de resultadoCorrida), no mesmo ritmo (cada ação = 1 tique; bater = +5)
export async function mostrarCorrida(evEu, evOutro) {
  if (!tela) return;
  voltarAoInicio();
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
  if (tela) clearInterval(tela.anim);
}
export function mensagemCorrida(html, tipo) { if (tela) msg(html, tipo); }
export function travarMontagem(texto) { if (!tela) return; tela.pronto = true; $('pg-trava').hidden = false; $('pg-trava').textContent = texto || ''; }

// botões
export function ligarBotoesPrograme() {
  $('pg-exec').addEventListener('click', executarPrograma);
  $('pg-parar').addEventListener('click', pararPrograma);
  $('pg-reset').addEventListener('click', reiniciar);
  $('pg-vel').addEventListener('click', alternarVelocidade);
  $('pg-pronto').addEventListener('click', pronto);
  $('pg-sair').addEventListener('click', () => fecharTela());
}

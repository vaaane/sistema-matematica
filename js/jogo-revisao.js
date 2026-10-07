// ============================================================
//  Jogo de Revisão — motor do jogo (Parte A) + progresso no Firebase (Parte B)
//  Real: jogo_revisao/{uid}   ·   Modo teste: modo_teste_historico/{uid}/jogo_revisao
// ============================================================
import { isModoTeste } from '/js/auth.js';
import { db } from '/js/firebase-config.js';
import { ref, get, update, push, set, increment } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { adicionarXP } from '/js/db.js';
import { bimestreAtual } from '/js/constants.js';
import { gerarQuestoes, gerarUma } from '/js/jogo-revisao/geradores.js';
import { tocar, somLigado, alternarSom } from '/js/jogo-revisao/sons.js';
import { notaJogoRevisao, formatarNota, NOTA_MAX, PESO_INSIGNIAS, PESO_DOURADAS } from '/js/jogo-revisao/nota.js';

// XP (só na primeira vez que cada personagem é vencido; nunca no modo teste)
const XP_TREINADOR      = 5;
const XP_LIDER          = 20;
const XP_LIDER_PERFEITO = 10;      // bônus: líder vencido com as 5 de primeira
const XP_REVANCHE       = 15;
const RETENTAR_MS       = 15000;   // gravação recusada: tenta de novo a cada 15 s
// Sequência de dias (🔥): XP quando a sequência CHEGA a estes dias
const XP_SEQUENCIA = { 3: 10, 5: 15, 7: 25 };   // dias → XP
const XP_SEQUENCIA_SEMANAL = 25;                // a cada 7 dias depois do 7º (14, 21, 28…)

const IMG   = '/img/jogo';
const DADOS = '/dados/jogo';

const W = 1376, H = 768;            // tamanho original dos mapas/interiores
const GW = 344, GH = 192, CEL = 4;  // grade da trilha (cada pixel = 4×4 do mapa)
const VEL = 180;                    // px/s em coordenadas da imagem
const T_QUADRO = 120;               // ms por quadro de caminhada
const ALT_JOGADOR = 110, ALT_TREINADOR = 120, ALT_LIDER = 135;
const DIST_PORTA = 30;               // encostar na porta/saída andando pelas setas ou joystick
const DIST_TOQUE = 60;               // toque a até 60 px de uma porta/saída vira destino especial
const DIST_PERTO = 90;               // nome do ginásio / "Saída" aparece; Enter e OK funcionam
const RECUO_PORTA = 60;              // ao sair do ginásio, aparece 60 px antes da porta
const FADE_MS = 250;
const PERSONAGENS = ['treinador1', 'treinador2', 'treinador3', 'lider'];
const DIRECOES = ['frente', 'costas', 'direita', 'esquerda'];
const NUM_MAPAS = 13;

const $ = (id) => document.getElementById(id);
const sortear = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
function embaralhar(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const chaveGinasio = (n, G) => `mapa${n}-${G}`;

// ── Dados carregados dos JSON ───────────────────────────────
const D = { geral: null, mapas: null, interiores: null, bandeja: null, falas: null, regras: null, questoes: {} };

// ── Estado do jogo ──────────────────────────────────────────
let estado = null;
let sessao = null;
let modoDev = false;

function progressoVazio() { return { vencido: false, acertosPrimeira: 0, total: 0, data: null }; }

function estadoVazio() {
  const ginasios = {};
  for (let n = 1; n <= NUM_MAPAS; n++) {
    for (const G of ['A', 'B']) {
      ginasios[chaveGinasio(n, G)] = {
        treinador1: progressoVazio(), treinador2: progressoVazio(), treinador3: progressoVazio(),
        lider: progressoVazio(), revanche: progressoVazio(),
        insignia: false, dourada: false, dataInsignia: null,
      };
    }
  }
  return { ginasios };
}

// ============================================================
//  PROGRESSO NO FIREBASE (Parte B)
// ============================================================
let teste = false;               // modo teste: grava em modo_teste_historico, sem XP e sem feed
let carregouProgresso = false;   // se a leitura falhar, não grava nem dá XP (evita XP repetido)
const mapasAbertos = new Set();  // jogo_revisao_config/global/mapas_abertos (controle da professora)

const raiz = () => teste ? `modo_teste_historico/${sessao.uid}/jogo_revisao` : `jogo_revisao/${sessao.uid}`;

// Um único get do progresso, preenchendo o `estado` da Parte A
async function carregarEstado() {
  teste = isModoTeste();
  estado = estadoVazio();
  try {
    const snap = await get(ref(db, raiz()));
    const v = snap.exists() ? snap.val() : {};
    for (const [chave, gs] of Object.entries(v.ginasios || {})) {
      const g = estado.ginasios[chave];
      if (!g) continue;
      for (const p of ['treinador1', 'treinador2', 'treinador3', 'lider', 'revanche']) {
        const x = gs?.[p];
        if (x?.vencido) g[p] = { vencido: true, acertosPrimeira: x.acertos_primeira || 0, total: x.total || 0, data: x.data || null };
      }
    }
    for (const [chave, ins] of Object.entries(v.insignias || {})) {
      const g = estado.ginasios[chave];
      if (!g || !ins) continue;
      g.insignia = true;
      g.dourada = !!ins.dourada;
      g.dataInsignia = ins.data || null;
    }
    estado.sequencia = v.sequencia || null;
    carregouProgresso = true;
    gravar({ ultimo_acesso: Date.now() });
  } catch (e) {
    console.error('[jogo-revisao] erro ao carregar progresso', e);
    avisoConexao('Não foi possível carregar seu progresso. Verifique a internet e recarregue a página.', true);
  }
  try {
    const cfg = await get(ref(db, 'jogo_revisao_config/global/mapas_abertos'));
    if (cfg.exists()) for (const n of Object.values(cfg.val() || {})) mapasAbertos.add(Number(n));
  } catch (e) { /* sem config: vale só a regra padrão */ }
}

// ── Gravações pequenas com update, com fila para quando estiver sem conexão ──
const fila = { patch: {}, erros: {} };   // patch: caminho → valor; erros: questaoId → quanto somar
let enviando = false, timerRetentar = 0, timerAvisoLento = 0;

// Junta um caminho na fila sem deixar "pai" e "filho" no mesmo update (o Firebase recusa)
function juntarNaFila(caminho, valor) {
  for (const k of Object.keys(fila.patch)) {
    if (k.startsWith(caminho + '/')) delete fila.patch[k];        // o valor novo substitui os filhos
    else if (caminho.startsWith(k + '/')) {                        // cabe dentro de um pai já na fila
      let o = fila.patch[k] = structuredClone(fila.patch[k] ?? {});
      const partes = caminho.slice(k.length + 1).split('/');
      for (const parte of partes.slice(0, -1)) o = o[parte] = (o[parte] && typeof o[parte] === 'object') ? o[parte] : {};
      o[partes.at(-1)] = valor;
      return;
    }
  }
  fila.patch[caminho] = valor;
}

function gravar(patch, errouId) {
  if (!carregouProgresso) return;
  for (const [k, v] of Object.entries(patch)) juntarNaFila(k, v);
  if (errouId) fila.erros[errouId] = (fila.erros[errouId] || 0) + 1;
  enviarFila();
}

const filaVazia = () => !Object.keys(fila.patch).length && !Object.keys(fila.erros).length;

async function enviarFila() {
  if (enviando || filaVazia()) return;
  const patch = fila.patch, erros = fila.erros;
  fila.patch = {}; fila.erros = {};
  const corpo = { ...patch };
  for (const [id, n] of Object.entries(erros)) corpo[`respostas/${id}/erros`] = increment(n);   // acumula entre tentativas
  enviando = true;
  // Sem internet o Firebase segura a gravação e envia sozinho quando voltar: só avisamos se demorar
  clearTimeout(timerAvisoLento);
  timerAvisoLento = setTimeout(() => avisoConexao('Sem conexão — seu progresso será salvo quando voltar'), 4000);
  let falhou = false;
  try {
    await update(ref(db, raiz()), corpo);
  } catch (e) {
    // recusada (ex.: sem permissão): volta para a fila e tenta de novo depois
    console.error('[jogo-revisao] erro ao salvar progresso', e);
    falhou = true;
    for (const [k, v] of Object.entries(patch)) if (!(k in fila.patch)) juntarNaFila(k, v);
    for (const [id, n] of Object.entries(erros)) fila.erros[id] = (fila.erros[id] || 0) + n;
  } finally {
    enviando = false;
    clearTimeout(timerAvisoLento);
  }
  if (falhou) {
    avisoConexao('Sem conexão — seu progresso será salvo quando voltar');
    clearTimeout(timerRetentar);
    timerRetentar = setTimeout(() => { timerRetentar = 0; enviarFila(); }, RETENTAR_MS);
    return;
  }
  avisoConexao(null);
  if (!filaVazia()) enviarFila();
}
addEventListener('online', () => { clearTimeout(timerRetentar); timerRetentar = 0; enviarFila(); });

function avisoConexao(texto, fixo) {
  let el = $('jr-aviso-conexao');
  if (!texto) { if (el && !el.dataset.fixo) el.hidden = true; return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'jr-aviso-conexao';
    el.className = 'jr-aviso-conexao';
    el.setAttribute('role', 'status');
    $('jr-app').appendChild(el);
  }
  el.textContent = texto;
  if (fixo) el.dataset.fixo = '1';
  el.hidden = false;
}

// Vitória: grava o personagem e, se for o caso, a insígnia
function gravarVitoria(chave, p) {
  const g = estado.ginasios[chave];
  const x = g[p];
  const patch = { [`ginasios/${chave}/${p}`]: { vencido: true, acertos_primeira: x.acertosPrimeira, total: x.total, data: x.data } };
  if (p === 'lider' && g.insignia) {
    // insígnia = soma dos três treinadores e do líder (20 questões)
    const soma = ['treinador1', 'treinador2', 'treinador3', 'lider'].reduce(
      (a, k) => ({ acertos: a.acertos + g[k].acertosPrimeira, total: a.total + g[k].total }), { acertos: 0, total: 0 });
    patch[`insignias/${chave}`] = { data: g.dataInsignia, dourada: g.dourada, acertos_primeira: soma.acertos, total: soma.total };
  }
  if (p === 'revanche' && g.dourada) patch[`insignias/${chave}/dourada`] = true;
  gravar(patch);
}

function darXP(delta, mostrar = true) {
  if (!delta) return;
  if (mostrar) mostrarXP(delta);
  if (teste || !carregouProgresso) return;
  adicionarXP(sessao.uid, delta).catch(e => console.error('[jogo-revisao] erro ao dar XP', e));
}

async function publicarNoFeed(tipo, chave) {
  if (teste || !carregouProgresso) return;
  try {
    const [mapaStr, G] = chave.replace('mapa', '').split('-');
    const gin = D.questoes[Number(mapaStr)].ginasios[G].nome;
    let nome = sessao.nome;
    try { const s = await get(ref(db, `perfis/${sessao.uid}/nome`)); if (s.exists()) nome = s.val(); } catch (_) {}
    const texto = tipo === 'insignia'
      ? `🏅 ${nome} conquistou a insígnia: ${gin}!`
      : `🌟 ${nome} venceu a revanche: ${gin}!`;
    await set(push(ref(db, 'feed_global')), { tipo, uid: sessao.uid, nome, texto, ts: Date.now(), bim: bimestreAtual() });
  } catch (e) { console.error('[jogo-revisao] erro no feed', e); }
}

// "+5 XP" subindo na tela
function mostrarXP(delta) {
  const el = document.createElement('div');
  el.className = 'jr-xp';
  el.textContent = `+${delta} XP`;
  $('jr-app').appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 3000);
}

const mapaConcluido  = (n) => estado.ginasios[chaveGinasio(n, 'A')].lider.vencido && estado.ginasios[chaveGinasio(n, 'B')].lider.vencido;
const mapaDisponivel = (n) => modoDev || n === 1 || mapasAbertos.has(n) || mapaConcluido(n - 1);

// ── Inicialização ───────────────────────────────────────────
export async function iniciarJogo(sess) {
  sessao = sess;
  modoDev = new URLSearchParams(location.search).get('dev') === '1' && isModoTeste();

  try {
    const pegar = (p) => fetch(`${DADOS}/${p}`).then(r => { if (!r.ok) throw new Error(p); return r.json(); });
    const [geral, mapas, interiores, bandeja, geralQ, ...qs] = await Promise.all([
      pegar('mapa-geral.json'), pegar('mapas.json'), pegar('interiores.json'),
      pegar('bandeja-insignias.json'), pegar('questoes/geral.json'),
      ...Array.from({ length: NUM_MAPAS }, (_, i) => pegar(`questoes/mapa${i + 1}.json`)),
    ]);
    Object.assign(D, { geral, mapas, interiores, bandeja, falas: geralQ.falas, regras: geralQ.regras });
    qs.forEach(q => { D.questoes[q.mapa] = q; });
  } catch (e) {
    console.error('[jogo-revisao] erro ao carregar dados', e);
    $('jr-carregando').textContent = 'Não foi possível carregar o jogo. Tente recarregar a página.';
    return;
  }

  await carregarEstado();
  preCarregarQuadros();
  ligarEventos();
  atualizarContador();
  requestAnimationFrame(loop);
  abrirMapaGeral();
  $('jr-carregando').hidden = true;
}

function preCarregarQuadros() {
  for (const d of DIRECOES) for (let i = 1; i <= 4; i++) { const im = new Image(); im.src = urlQuadro(d, i - 1); }
}
const urlQuadro = (dir, q) => `${IMG}/personagem-principal/${dir}-${q + 1}.webp`;

function mostrarTela(id) {
  for (const t of document.querySelectorAll('.jr-tela')) t.hidden = t.id !== id;
}

// ============================================================
//  3.1 MAPA GERAL
// ============================================================
// ============================================================
//  SEQUÊNCIA DE DIAS (🔥) — conta o dia em que o aluno vence ao menos 1 personagem
// ============================================================
const diaLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const paraData = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d, 12); };   // meio-dia: sem problema de horário de verão

// true se de `ultimo` até `hoje` a sequência continua: dia seguinte, ou só sábado/domingo no meio
function sequenciaContinua(ultimo, hoje) {
  const a = paraData(ultimo), b = paraData(hoje);
  if (b <= a) return false;
  for (const d = new Date(a.getTime() + 864e5); d < b; d.setDate(d.getDate() + 1)) {
    const dia = d.getDay();
    if (dia !== 0 && dia !== 6) return false;   // faltou um dia útil
  }
  return true;
}

// Função pura: próximo estado da sequência ao contar o dia `hoje`
function proximaSequencia(seq, hoje) {
  const atual = seq?.atual || 0, max = seq?.max || 0, ultimo = seq?.ultimo_dia || null;
  if (ultimo === hoje) return { atual, max, ultimo_dia: ultimo, subiu: false };   // no máximo 1 vez por dia
  const novo = ultimo && sequenciaContinua(ultimo, hoje) ? atual + 1 : 1;
  return { atual: novo, max: Math.max(max, novo), ultimo_dia: hoje, subiu: true };
}

// Valor mostrado no HUD: 0 se a sequência já quebrou (sem gravar nada)
function sequenciaVigente(seq, hoje = diaLocal()) {
  if (!seq?.ultimo_dia) return 0;
  return seq.ultimo_dia === hoje || sequenciaContinua(seq.ultimo_dia, hoje) ? (seq.atual || 0) : 0;
}

const xpDaSequencia = (n) => XP_SEQUENCIA[n] || (n > 7 && (n - 7) % 7 === 0 ? XP_SEQUENCIA_SEMANAL : 0);

let avisoSequencia = null;   // { atual, xp } — mostrado depois de fechar a vitória/insígnia

function registrarDiaJogado() {
  if (!carregouProgresso) return;
  const r = proximaSequencia(estado.sequencia, diaLocal());
  if (!r.subiu) return;
  estado.sequencia = { atual: r.atual, max: r.max, ultimo_dia: r.ultimo_dia };
  gravar({ sequencia: estado.sequencia });
  const xp = xpDaSequencia(r.atual);
  darXP(xp, false);   // grava já; o "+XP" aparece junto do aviso
  avisoSequencia = { atual: r.atual, xp };
}

function mostrarAvisoSequencia() {
  if (!avisoSequencia || animInsignia) return;
  const { atual, xp } = avisoSequencia;
  avisoSequencia = null;
  const el = document.createElement('div');
  el.className = 'jr-aviso-seq';
  el.textContent = `🔥 Sequência de ${atual} dia${atual === 1 ? '' : 's'}!`;
  $('jr-app').appendChild(el);
  setTimeout(() => el.remove(), 2500);
  if (xp) mostrarXP(xp);
  atualizarSelo();
}

function atualizarSelo() {
  const el = $('selo-seq');
  if (!el || !estado) return;
  const n = sequenciaVigente(estado.sequencia);
  el.textContent = `🔥 ${n}`;
  el.classList.toggle('apagado', n === 0);
}

function mostrarBalaoSequencia() {
  const b = $('seq-balao');
  const max = estado?.sequencia?.max || 0;
  b.textContent = `Vença pelo menos 1 personagem por dia para manter a sequência. Sábado e domingo não quebram. Recorde: ${max} dia${max === 1 ? '' : 's'}.`;
  b.hidden = !b.hidden;
  clearTimeout(b._t);
  if (!b.hidden) b._t = setTimeout(() => { b.hidden = true; }, 5000);
}

function abrirMapaGeral() {
  atualizarSelo();
  cena = null;
  esconderBalao();
  mostrarTela('tela-geral');
  dimensionarGeral();
  desenharMarcadores();
  centralizarGeral();
}

function dimensionarGeral() {
  const sc = $('geral-scroll'), palco = $('geral-palco');
  const vw = sc.clientWidth, vh = sc.clientHeight;
  let w, h;
  if (vh > vw) { h = vh; w = vh * W / H; }   // em pé: altura da tela, arrasta para os lados
  else { w = vw; h = vw * H / W; }           // deitada: largura da tela
  palco.style.width = w + 'px';
  palco.style.height = h + 'px';
}

function centralizarGeral() {
  // Centraliza no mapa disponível mais avançado
  const sc = $('geral-scroll');
  let alvo = 1;
  for (let n = 1; n <= NUM_MAPAS; n++) if (mapaDisponivel(n) && !mapaConcluido(n)) { alvo = n; break; }
  const r = D.geral.regioes.find(r => r.mapa === alvo);
  if (!r) return;
  const pw = $('geral-palco').clientWidth, ph = $('geral-palco').clientHeight;
  sc.scrollLeft = r.x / W * pw - sc.clientWidth / 2;
  sc.scrollTop = r.y / H * ph - sc.clientHeight / 2;
}

function desenharMarcadores() {
  const cont = $('geral-marcadores');
  cont.innerHTML = D.geral.regioes.map(r => {
    const n = r.mapa;
    const est = mapaConcluido(n) ? 'concluido' : mapaDisponivel(n) ? 'disponivel' : 'bloqueado';
    const ins = est === 'concluido'
      ? `<span class="jr-marc-ins">${['A', 'B'].map(G => {
          const g = estado.ginasios[chaveGinasio(n, G)];
          return `<img src="${IMG}/insignias/insignia-${chaveGinasio(n, G)}.webp" class="${g.dourada ? 'dourada' : ''}" alt=""/>`;
        }).join('')}</span>` : '';
    return `<button class="jr-marcador ${est}" data-mapa="${n}" style="left:${r.x / W * 100}%;top:${r.y / H * 100}%"
              aria-label="Mapa ${n}: ${esc(r.nome)}${est === 'bloqueado' ? ' (bloqueado)' : ''}">
              <span class="jr-marc-num">${est === 'bloqueado' ? '🔒' : n}</span>
              <span class="jr-marc-nome">${esc(r.nome)}</span>${ins}
            </button>`;
  }).join('');
}

// Arrastar com o mouse (no toque o rolamento nativo já resolve)
function ligarArrasteGeral() {
  const sc = $('geral-scroll');
  let arr = null;
  sc.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    arr = { x: e.clientX, y: e.clientY, sl: sc.scrollLeft, st: sc.scrollTop, moveu: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!arr) return;
    const dx = e.clientX - arr.x, dy = e.clientY - arr.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) arr.moveu = true;
    sc.scrollLeft = arr.sl - dx;
    sc.scrollTop = arr.st - dy;
  });
  window.addEventListener('pointerup', () => {
    if (arr?.moveu) { sc.dataset.arrastou = '1'; setTimeout(() => delete sc.dataset.arrastou, 0); }
    arr = null;
  });
  $('geral-marcadores').addEventListener('click', (e) => {
    if (sc.dataset.arrastou) return;
    const b = e.target.closest('.jr-marcador');
    if (!b) return;
    const n = Number(b.dataset.mapa);
    if (!mapaDisponivel(n)) return;
    tocar('porta');
    abrirMapa(n, 'entrada');
  });
}

// ============================================================
//  CENA (mapa da região / interior) — câmera e jogador
// ============================================================
let cena = null;   // { tipo:'mapa'|'interior', ... }
const cam = { s: 1, tx: 0, ty: 0 };
const jog = { x: 0, y: 0, dir: 'frente', quadro: 0, tQuadro: 0, caminho: [], aoChegar: null };
let perguntaAberta = false;

function ajustarCamera() {
  const vp = $('cena-vp');
  const vw = vp.clientWidth, vh = vp.clientHeight;
  if (vh > vw) {
    // Em pé: mapa na altura da tela, rola na horizontal seguindo o jogador
    cam.s = vh / H;
    cam.ty = 0;
    cam.tx = clamp(vw / 2 - jog.x * cam.s, vw - W * cam.s, 0);
  } else {
    // Deitada: mapa inteiro
    cam.s = Math.min(vw / W, vh / H);
    cam.tx = (vw - W * cam.s) / 2;
    cam.ty = (vh - H * cam.s) / 2;
  }
  $('cena-palco').style.transform = `translate(${cam.tx}px,${cam.ty}px) scale(${cam.s})`;
}

function telaParaImagem(cx, cy) {
  const r = $('cena-vp').getBoundingClientRect();
  return { x: (cx - r.left - cam.tx) / cam.s, y: (cy - r.top - cam.ty) / cam.s };
}
function imagemParaTela(x, y) {
  return { x: x * cam.s + cam.tx, y: y * cam.s + cam.ty };
}

function posicionarJogador(x, y, dir) {
  jog.x = x; jog.y = y;
  if (dir) jog.dir = dir;
  jog.caminho = []; jog.aoChegar = null; jog.quadro = 0;
  desenharJogador();
}

function desenharJogador() {
  const el = $('jogador');
  const src = urlQuadro(jog.dir, jog.quadro);
  if (el.dataset.src !== src) { el.src = src; el.dataset.src = src; }
  el.style.left = jog.x + 'px';
  el.style.top = jog.y + 'px';
  el.style.height = ALT_JOGADOR + 'px';
  el.style.zIndex = Math.round(jog.y);
}

function andarPor(pontos, aoChegar) {
  jog.caminho = pontos.slice();
  jog.aoChegar = aoChegar || null;
  esconderBalao();
}

// ── Controle direto: setas/WASD e joystick ──────────────────
const teclas = new Set();
const joy = { ativo: false, x: 0, y: 0 };
function soltarJoystick() {
  joy.ativo = false; joy.x = 0; joy.y = 0;
  $('joy-bola').style.transform = '';
}

// Pergunta, estojo, cartão ou insígnia por cima do jogo
const sobreposicaoAberta = () =>
  perguntaAberta || !$('estojo').hidden || !$('cartao').hidden || !$('insignia-ganha').hidden;

function vetorEntrada() {
  if (sobreposicaoAberta()) return [0, 0];
  if (joy.ativo) return [joy.x, joy.y];
  let x = 0, y = 0;
  if (teclas.has('ArrowLeft') || teclas.has('KeyA')) x -= 1;
  if (teclas.has('ArrowRight') || teclas.has('KeyD')) x += 1;
  if (teclas.has('ArrowUp') || teclas.has('KeyW')) y -= 1;
  if (teclas.has('ArrowDown') || teclas.has('KeyS')) y += 1;
  const m = Math.hypot(x, y);
  return m ? [x / m, y / m] : [0, 0];
}

function animarPasso(dt) {
  jog.tQuadro += dt * 1000;
  if (jog.tQuadro >= T_QUADRO) { jog.tQuadro = 0; jog.quadro = (jog.quadro + 1) % 4; }
}

// Anda na direção (vx, vy); na trilha, desliza pela borda em vez de travar
function moverDireto(dt, vx, vy) {
  if (jog.caminho.length) { jog.caminho = []; jog.aoChegar = null; destinoEspecial = null; }
  if (cena.tipo === 'interior') vy = 0;           // no ginásio só anda pelo tapete
  const mag = Math.min(1, Math.hypot(vx, vy));
  if (!mag) return false;
  const d = VEL * mag * dt;
  const dx = vx / Math.hypot(vx, vy) * d, dy = vy / Math.hypot(vx, vy) * d;
  const x0 = jog.x, y0 = jog.y;
  if (cena.tipo === 'interior') {
    jog.x = clamp(jog.x + dx, cena.xMin, cena.xMax);
  } else {
    const g = cena.grade;
    const livre = (x, y) => x >= 0 && y >= 0 && x < W && y < H && andavel(g, Math.floor(x / CEL), Math.floor(y / CEL));
    const preso = !livre(jog.x, jog.y);   // se começou fora da trilha, deixa sair
    const pode = (x, y) => preso || livre(x, y);
    const tenta = (ax, ay) => {
      if (!pode(jog.x + ax, jog.y + ay)) return false;
      jog.x += ax; jog.y += ay; return true;
    };
    if (!tenta(dx, dy) && !(dx && tenta(dx, 0)) && !(dy && tenta(0, dy))) {
      // Borda da trilha é em degraus de 4 px: desvia um pouco na perpendicular para não enroscar
      const horiz = Math.abs(dx) >= Math.abs(dy);
      const p = horiz ? dx : dy;
      fora: for (let k = 2; k <= 10; k += 2) {
        for (const s of [1, -1]) {
          const livreAdiante = horiz ? pode(jog.x + p, jog.y + s * k) : pode(jog.x + s * k, jog.y + p);
          if (!livreAdiante) continue;
          const m = s * Math.min(k, d);
          if (horiz ? tenta(0, m) : tenta(m, 0)) break fora;
        }
      }
    }
  }
  jog.dir = Math.abs(vy) > Math.abs(vx) ? (vy > 0 ? 'frente' : 'costas') : (vx > 0 ? 'direita' : 'esquerda');
  if (jog.x !== x0 || jog.y !== y0) animarPasso(dt);
  else jog.quadro = 0;
  desenharJogador();
  return true;
}

function acionar() {
  if (!$('insignia-ganha').hidden) { acelerarInsignia(); return; }
  if (sobreposicaoAberta() || !cena || transicionando) return;
  if (cena.tipo === 'mapa') { if (alvoMapa) irAoDestino(alvoMapa); }
  else if (balaoAcao) $('cena-balao').click();
  else if (pertoSaidaGin) irParaSaidaGin();
}

function ligarControles() {
  const MOVER = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'];
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (MOVER.includes(e.code)) {
      if ($('tela-cena').hidden || sobreposicaoAberta()) return;
      teclas.add(e.code);
      e.preventDefault();
    } else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') {
      if (!$('tela-cena').hidden && (balaoAcao || alvoMapa || pertoSaidaGin || !$('insignia-ganha').hidden) && !perguntaAberta) {
        e.preventDefault();
        if (!e.repeat) acionar();
      }
    }
  });
  window.addEventListener('keyup', (e) => teclas.delete(e.code));
  window.addEventListener('blur', () => teclas.clear());

  // Joystick (só aparece em tela de toque — ver CSS)
  const base = $('joy-base'), bola = $('joy-bola');
  let idPonteiro = null;
  const mover = (e) => {
    const r = base.getBoundingClientRect();
    const raio = r.width / 2;
    let x = (e.clientX - (r.left + raio)) / raio, y = (e.clientY - (r.top + raio)) / raio;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    bola.style.transform = `translate(${x * raio * 0.6}px, ${y * raio * 0.6}px)`;
    const zonaMorta = 0.18;
    joy.x = m < zonaMorta ? 0 : x;
    joy.y = m < zonaMorta ? 0 : y;
  };
  const soltar = () => { idPonteiro = null; soltarJoystick(); };
  base.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    idPonteiro = e.pointerId;
    try { base.setPointerCapture(e.pointerId); } catch (_) {}
    joy.ativo = true;
    mover(e);
  });
  base.addEventListener('pointermove', (e) => { if (e.pointerId === idPonteiro) mover(e); });
  base.addEventListener('pointerup', soltar);
  base.addEventListener('pointercancel', soltar);
  base.addEventListener('lostpointercapture', soltar);
}

let ultimoT = 0;
function loop(t) {
  const dt = Math.min(0.05, (t - (ultimoT || t)) / 1000);
  ultimoT = t;
  if (cena && !perguntaAberta && !transicionando) {
    const [vx, vy] = vetorEntrada();
    if (!vx && !vy) soltouDesdeTroca = true;
    const direto = (vx || vy) && moverDireto(dt, vx, vy);
    if (!direto) passo(dt);
    ajustarCamera();
    if (cena?.tipo === 'mapa') {
      atualizarMapa();
      if (direto) verificarEncostou(vx, vy);
    } else if (cena) {
      atualizarSaidaGin();
      if (direto && vx < 0) verificarSaiuGin();
      atualizarBalao();
      posicionarRevanche();
    }
  }
  requestAnimationFrame(loop);
}

function passo(dt) {
  if (!jog.caminho.length) {
    if (jog.quadro !== 0) { jog.quadro = 0; desenharJogador(); }
    return;
  }
  let resta = VEL * dt;
  while (resta > 0 && jog.caminho.length) {
    const [px, py] = jog.caminho[0];
    const dx = px - jog.x, dy = py - jog.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.5) {
      jog.dir = Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 'frente' : 'costas') : (dx > 0 ? 'direita' : 'esquerda');
    }
    if (d <= resta) {
      jog.x = px; jog.y = py; resta -= d;
      jog.caminho.shift();
    } else {
      jog.x += dx / d * resta; jog.y += dy / d * resta; resta = 0;
    }
  }
  animarPasso(dt);
  if (!jog.caminho.length) {
    jog.quadro = 0;
    const cb = jog.aoChegar; jog.aoChegar = null;
    desenharJogador();
    if (cb) cb();
    return;
  }
  desenharJogador();
}

let fundoPendente = null;
async function trocarFundo(src) {
  // espera o load (decode() pode ficar pendente com a aba em segundo plano)
  const f = $('cena-fundo');
  // se outra troca ainda esperava, libera ela (senão a transição ficaria presa para sempre)
  if (fundoPendente) fundoPendente();
  await new Promise((ok) => {
    const pronto = () => { f.onload = f.onerror = null; fundoPendente = null; ok(); };
    fundoPendente = pronto;
    f.onload = f.onerror = pronto;
    f.src = src;
    if (f.complete && f.naturalWidth && f.src.endsWith(src)) pronto();
  });
}

function sairDaCena() {
  if (!cena) return;
  destinoEspecial = null;
  if (cena.tipo === 'interior') { const { n, G } = cena; transicao(() => abrirMapa(n, G)); }
  else transicao(abrirMapaGeral);
}

// ============================================================
//  3.2 MAPA DA REGIÃO — trilha + A*
// ============================================================
const gradesCache = {};

function carregarGrade(arquivo) {
  if (gradesCache[arquivo]) return Promise.resolve(gradesCache[arquivo]);
  return new Promise((ok, falha) => {
    const im = new Image();
    im.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = GW; cv.height = GH;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(im, 0, 0, GW, GH);
      const px = ctx.getImageData(0, 0, GW, GH).data;
      const g = new Uint8Array(GW * GH);
      for (let i = 0; i < GW * GH; i++) g[i] = px[i * 4] > 127 ? 1 : 0;
      gradesCache[arquivo] = g;
      ok(g);
    };
    im.onerror = () => falha(new Error('trilha ' + arquivo));
    im.src = `${IMG}/trilhas/${arquivo}`;
  });
}

const andavel = (g, cx, cy) => cx >= 0 && cy >= 0 && cx < GW && cy < GH && g[cy * GW + cx] === 1;
const centroCelula = (i) => [(i % GW) * CEL + CEL / 2, Math.floor(i / GW) * CEL + CEL / 2];

function celulaMaisProxima(g, x, y) {
  const cx = clamp(Math.floor(x / CEL), 0, GW - 1), cy = clamp(Math.floor(y / CEL), 0, GH - 1);
  if (andavel(g, cx, cy)) return cy * GW + cx;
  let melhor = -1, md = Infinity;
  for (let j = 0; j < GH; j++) {
    for (let i = 0; i < GW; i++) {
      if (!g[j * GW + i]) continue;
      const d = (i - cx) * (i - cx) + (j - cy) * (j - cy);
      if (d < md) { md = d; melhor = j * GW + i; }
    }
  }
  return melhor;
}

// A* em 8 direções (sem cortar quinas)
function aEstrela(g, ini, fim) {
  if (ini === fim) return [ini];
  const N = GW * GH;
  const custo = new Float32Array(N).fill(Infinity);
  const veio = new Int32Array(N).fill(-1);
  const fechado = new Uint8Array(N);
  const fx = fim % GW, fy = Math.floor(fim / GW);
  const heur = (i) => {
    const dx = Math.abs(i % GW - fx), dy = Math.abs(Math.floor(i / GW) - fy);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  // heap binária de [f, i]
  const heap = [];
  const push = (f, i) => {
    heap.push([f, i]);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p][0] <= heap[k][0]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]]; k = p;
    }
  };
  const pop = () => {
    const topo = heap[0], ult = heap.pop();
    if (heap.length) {
      heap[0] = ult;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1, r = l + 1;
        let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]]; k = m;
      }
    }
    return topo;
  };
  const VIZ = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  custo[ini] = 0;
  push(heur(ini), ini);
  while (heap.length) {
    const [, i] = pop();
    if (i === fim) break;
    if (fechado[i]) continue;
    fechado[i] = 1;
    const x = i % GW, y = Math.floor(i / GW);
    for (const [dx, dy] of VIZ) {
      const nx = x + dx, ny = y + dy;
      if (!andavel(g, nx, ny)) continue;
      if (dx && dy && (!andavel(g, x + dx, y) || !andavel(g, x, y + dy))) continue;
      const j = ny * GW + nx;
      if (fechado[j]) continue;
      const c = custo[i] + (dx && dy ? Math.SQRT2 : 1);
      if (c < custo[j]) { custo[j] = c; veio[j] = i; push(c + heur(j), j); }
    }
  }
  if (veio[fim] === -1) return null;
  const cam = [fim];
  for (let i = fim; i !== ini; i = veio[i]) cam.push(veio[i]);
  return cam.reverse();
}

// Linha reta livre na trilha? (amostra a cada 2 px)
function linhaLivre(g, ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay);
  const n = Math.ceil(d / 2);
  for (let k = 0; k <= n; k++) {
    const t = n ? k / n : 0;
    if (!andavel(g, Math.floor((ax + (bx - ax) * t) / CEL), Math.floor((ay + (by - ay) * t) / CEL))) return false;
  }
  return true;
}

// Suaviza o caminho: pula pontos intermediários quando há linha reta livre
function suavizar(g, pts) {
  if (pts.length <= 2) return pts;
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !linhaLivre(g, pts[i][0], pts[i][1], pts[j][0], pts[j][1])) j--;
    out.push(pts[j]);
    i = j;
  }
  return out;
}

function caminharNaTrilha(x, y, aoChegar) {
  const g = cena.grade;
  const fim = celulaMaisProxima(g, x, y);
  const ini = celulaMaisProxima(g, jog.x, jog.y);
  if (fim < 0 || ini < 0) return;
  const cells = aEstrela(g, ini, fim);
  if (!cells) return;
  // começa da posição atual do jogador (que pode estar fora do centro da célula)
  const caminho = suavizar(g, [[jog.x, jog.y], ...cells.map(centroCelula)]).slice(1);
  andarPor(caminho, aoChegar);
}

async function abrirMapa(n, onde) {
  const cfg = D.mapas.mapas['mapa' + n];
  const q = D.questoes[n];
  cena = null;
  esconderBalao();
  $('btn-revanche').hidden = true;
  $('cena-aviso').hidden = true;
  $('cena-atores').innerHTML = '';
  $('cena-titulo').textContent = `${n}. ${q.nome}`;
  $('btn-cena-voltar').textContent = '⟵ Mapa geral';
  $('btn-cena-voltar').hidden = false;
  $('tela-cena').classList.remove('jr-no-ginasio');
  mostrarTela('tela-cena');
  $('cena-palco').style.visibility = 'hidden';

  const [grade] = await Promise.all([carregarGrade(cfg.trilha), trocarFundo(`${IMG}/mapas/mapa${n}.webp`)]);

  // pontos da trilha mais próximos das portas e saídas
  const naTrilha = (x, y) => centroCelula(celulaMaisProxima(grade, x, y));
  const portas = {};
  for (const G of Object.keys(cfg.portas)) {
    const p = cfg.portas[G];
    portas[G] = { x: p.x, y: p.y, trilha: naTrilha(p.x, p.y), nome: q.ginasios[G].nome };
  }
  const saidas = cfg.saidas.map(([x, y]) => ({ x, y, trilha: naTrilha(x, y) }));
  cena = { tipo: 'mapa', n, cfg, grade, portas, saidas };
  destinoEspecial = null;
  alvoMapa = null;
  pertoSaidaGin = false;

  // Nome do ginásio flutuando acima de cada porta (só aparece quando o jogador chega perto)
  $('cena-atores').innerHTML = Object.keys(portas).map(G =>
    `<div class="jr-rotulo-porta" data-g="${G}" style="left:${portas[G].x}px;top:${portas[G].y - ALT_JOGADOR - 24}px" hidden>` +
    `<span>${portas[G].nome}</span></div>`).join('');

  if (onde === 'A' || onde === 'B') {
    const [x, y] = pontoAntesDaPorta(n, onde);
    posicionarJogador(x, y, 'frente');
  } else {
    posicionarJogador(cfg.entrada[0], cfg.entrada[1], 'frente');
  }
  soltouDesdeTroca = false;
  ajustarCamera();
  $('cena-palco').style.visibility = '';
}

// Ponto ~60 px antes da porta, contando ao longo do caminho A* que vem da entrada do mapa
const recuoCache = {};
function pontoAntesDaPorta(n, G) {
  const chave = `${n}-${G}`;
  if (recuoCache[chave]) return recuoCache[chave];
  const pt = cena.portas[G];
  const g = cena.grade;
  const [ex, ey] = cena.cfg.entrada;
  const cells = aEstrela(g, celulaMaisProxima(g, ex, ey), celulaMaisProxima(g, pt.trilha[0], pt.trilha[1]));
  let ponto = pt.trilha;
  if (cells && cells.length > 1) {
    const pts = cells.map(centroCelula);
    let falta = RECUO_PORTA;
    ponto = pts[0];
    for (let i = pts.length - 1; i > 0; i--) {
      const [ax, ay] = pts[i], [bx, by] = pts[i - 1];
      const d = dist(ax, ay, bx, by);
      if (d >= falta) { ponto = [ax + (bx - ax) * falta / d, ay + (by - ay) * falta / d]; break; }
      falta -= d;
    }
  }
  recuoCache[chave] = ponto;
  return ponto;
}

// ── Portas e saídas: destino especial, encostar, transição ──
let destinoEspecial = null;   // { tipo:'porta', lado:'A' } | { tipo:'saida', i } — só o destino do toque
let alvoMapa = null;          // porta/saída perto o bastante para Enter / botão OK
let transicionando = false;
// Setas/joystick só entram/saem depois que o aluno solta e aperta de novo após a troca de tela
// (segurar a tecla durante a transição não faz entrar ou sair sem querer)
let soltouDesdeTroca = false;

function destinosDoMapa() {
  const lista = Object.keys(cena.portas).map(G => {
    const p = cena.portas[G];
    return { id: 'porta-' + G, tipo: 'porta', lado: G, x: p.x, y: p.y, trilha: p.trilha };
  });
  cena.saidas.forEach((s, i) => lista.push({ id: 'saida-' + i, tipo: 'saida', i, x: s.x, y: s.y, trilha: s.trilha }));
  return lista;
}

const distAoDestino = (d) => Math.min(dist(jog.x, jog.y, d.x, d.y), dist(jog.x, jog.y, d.trilha[0], d.trilha[1]));

function tocarNoMapa(e) {
  const p = telaParaImagem(e.clientX, e.clientY);
  // Tocou a até 60 px de uma porta ou saída → esse ponto vira o destino especial
  let perto = null, melhor = DIST_TOQUE;
  for (const d of destinosDoMapa()) {
    const dd = Math.min(dist(p.x, p.y, d.x, d.y), dist(p.x, p.y, d.trilha[0], d.trilha[1]));
    if (dd < melhor) { melhor = dd; perto = d; }
  }
  // Tocou na fachada do ginásio (acima da porta) também vale
  if (!perto) {
    perto = destinosDoMapa().find(d => d.tipo === 'porta' &&
      Math.abs(p.x - d.x) < 70 && p.y > d.y - 170 && p.y < d.y + 10) || null;
  }
  if (perto) { irAoDestino(perto); return; }
  destinoEspecial = null;
  caminharNaTrilha(p.x, p.y);
}

// Anda até a porta/saída e, ao chegar, entra
function irAoDestino(d) {
  const esp = d.tipo === 'porta' ? { tipo: 'porta', lado: d.lado } : { tipo: 'saida', i: d.i };
  destinoEspecial = esp;
  caminharNaTrilha(d.trilha[0], d.trilha[1], () => {
    if (destinoEspecial === esp) entrarNoDestino(esp);
  });
  // termina exatamente no ponto da porta/saída
  if (jog.caminho.length) jog.caminho.push([d.x, d.y]);
}

function entrarNoDestino(esp) {
  destinoEspecial = null;
  const n = cena.n;
  if (esp.tipo === 'porta') transicao(() => entrarGinasio(n, esp.lado));
  else if (esp.tipo === 'saida-gin') { const G = cena.G; transicao(() => abrirMapa(n, G)); }
  else transicao(abrirMapaGeral);
}

// Setas/joystick: encostar numa porta ou saída andando na direção dela entra direto.
// Passar de lado pela frente da porta (ex.: Escolinha, na beira da estrada) não entra.
function verificarEncostou(vx, vy) {
  if (!soltouDesdeTroca) return;
  const m = Math.hypot(vx, vy);
  for (const d of destinosDoMapa()) {
    if (dist(jog.x, jog.y, d.x, d.y) >= DIST_PORTA && dist(jog.x, jog.y, d.trilha[0], d.trilha[1]) >= 12) continue;
    const dd = dist(jog.x, jog.y, d.x, d.y);
    const rumo = dd < 4 ? 1 : ((d.x - jog.x) * vx + (d.y - jog.y) * vy) / (dd * m);
    if (rumo > 0.8) {
      entrarNoDestino(d.tipo === 'porta' ? { tipo: 'porta', lado: d.lado } : { tipo: 'saida', i: d.i });
      return;
    }
  }
}

// A cada quadro no mapa: mostra o nome do ginásio, acende o botão OK
function atualizarMapa() {
  if (!$('cena-balao').hidden) esconderBalao();
  const ds = destinosDoMapa();
  alvoMapa = null;
  for (const d of ds) {
    const dd = distAoDestino(d);
    if (d.tipo === 'porta') {
      const perto = dd < DIST_PERTO;
      const el = document.querySelector(`.jr-rotulo-porta[data-g="${d.lado}"]`);
      if (el && el.hidden === perto) el.hidden = !perto;
      if (perto && !alvoMapa) alvoMapa = d;
    } else if (dd < DIST_TOQUE && !alvoMapa) {
      alvoMapa = d;
    }
  }
}

async function transicao(fn) {
  if (transicionando) return;
  transicionando = true;
  tocar('porta');
  let veu = $('jr-veu');
  if (!veu) {
    veu = document.createElement('div');
    veu.id = 'jr-veu';
    veu.className = 'jr-veu';
    $('jr-app').appendChild(veu);
    veu.getBoundingClientRect();     // garante que a transição de opacidade aconteça
  }
  veu.classList.add('on');
  await new Promise(r => setTimeout(r, FADE_MS));
  try { await fn(); } finally {
    veu.classList.remove('on');
    transicionando = false;
  }
}

// ── Balão de ação (interior do ginásio) ─────────────────────
let balaoAcao = null;

function esconderBalao() {
  $('cena-balao').hidden = true;
  balaoAcao = null;
}

function atualizarBalao() {
  if (!cena) return;
  const alvo = alvoNoInterior();
  const b = $('cena-balao');
  if (!alvo) { if (!b.hidden) esconderBalao(); return; }
  if (balaoAcao?.id !== alvo.id) { b.textContent = alvo.texto; balaoAcao = alvo; }
  b.hidden = false;
  posicionarNaTela(b, jog.x, jog.y - ALT_JOGADOR - 6);
}

// No ginásio: parado na frente de um personagem → balão "Desafiar" (ou "Revanche" no líder vencido)
function alvoNoInterior() {
  if (jog.caminho.length) return null;
  const g = estado.ginasios[cena.chave];
  for (const p of PERSONAGENS) {
    if (Math.abs(jog.x - xDoPersonagem(p)) >= 30) continue;
    if (p === 'lider' && g.lider.vencido) return { id: 'revanche', texto: '⚔ Revanche', acao: () => $('btn-revanche').click() };
    if (g[p].vencido) continue;
    const quem = p === 'lider' ? 'o líder' : `o treinador ${p.slice(-1)}`;
    return { id: 'npc-' + p, texto: `⚔ Desafiar ${quem}`, acao: () => desafiar(p) };
  }
  return null;
}

function posicionarNaTela(el, x, y) {
  const p = imagemParaTela(x, y);
  const vw = $('cena-vp').clientWidth;
  const meia = el.offsetWidth / 2;
  el.style.left = clamp(p.x, meia + 8, vw - meia - 8) + 'px';
  el.style.top = Math.max(p.y, el.offsetHeight + 64) + 'px';
}

// ============================================================
//  3.3 INTERIOR DO GINÁSIO
// ============================================================
async function entrarGinasio(n, G) {
  const chave = chaveGinasio(n, G);
  const cfg = D.interiores.interiores[chave];
  const gin = D.questoes[n].ginasios[G];
  cena = null;
  esconderBalao();
  $('cena-titulo').textContent = gin.nome;
  // no ginásio não há botão de sair: sai andando pela porta de entrada
  $('btn-cena-voltar').hidden = true;
  $('tela-cena').classList.add('jr-no-ginasio');
  $('cena-atores').innerHTML = '';
  $('cena-palco').style.visibility = 'hidden';
  await trocarFundo(`${IMG}/interiores/${chave}.webp`);

  const yTapete = cfg.entrada.y;
  cena = {
    tipo: 'interior', n, G, chave, cfg, gin, yTapete,
    xMin: cfg.tapete.x + 20, xMax: cfg.tapete.x + cfg.tapete.w - 20,
    xPorta: cfg.entrada.x,   // porta de entrada = saída do ginásio
  };
  $('cena-atores').innerHTML = PERSONAGENS.map(p => {
    const pos = cfg[p];
    const alt = p === 'lider' ? ALT_LIDER : ALT_TREINADOR;
    return `<img class="jr-ator jr-npc" data-p="${p}" src="${IMG}/personagens/${gin.personagens[p].sprite}.webp"
              style="left:${pos.x}px;top:${pos.y}px;height:${alt}px;z-index:${Math.round(pos.y)}" alt="" draggable="false"/>`;
  }).join('') +
    `<div class="jr-rotulo-porta" data-g="saida" style="left:${cena.xPorta}px;top:${yTapete - ALT_JOGADOR - 24}px" hidden><span>Saída</span></div>`;
  // aparece ~60 px à direita da porta, para não sair sem querer
  posicionarJogador(clamp(cfg.entrada.x + RECUO_PORTA, cena.xMin, cena.xMax), yTapete, 'direita');
  destinoEspecial = null;
  alvoMapa = null;
  soltouDesdeTroca = false;
  atualizarNpcs();
  ajustarCamera();
  $('cena-palco').style.visibility = '';
}

// Próximo desafio: o 1º não vencido na ordem; depois do líder, a revanche (se ainda não é dourada)
function proximoDesafio(g) {
  const p = PERSONAGENS.find(k => !g[k].vencido);
  if (p) return p;
  return g.dourada ? null : 'revanche';
}

function atualizarNpcs() {
  const g = estado.ginasios[cena.chave];
  const prox = proximoDesafio(g);
  const iProx = prox ? PERSONAGENS.indexOf(prox) : -1;
  for (const el of document.querySelectorAll('#cena-atores .jr-npc')) {
    const p = el.dataset.p, i = PERSONAGENS.indexOf(p);
    el.classList.toggle('vencido', g[p].vencido);
    el.classList.toggle('proximo', p === prox);
    el.classList.toggle('bloqueado', !g[p].vencido && iProx >= 0 && i > iProx);   // vem depois do próximo
  }
  $('btn-revanche').hidden = !g.lider.vencido;
  $('btn-revanche').classList.toggle('pulsa', prox === 'revanche');
  // setinha dourada acima do próximo personagem (mesmas coordenadas da imagem dos .jr-npc)
  let seta = document.querySelector('#cena-atores .jr-seta');
  if (!prox || prox === 'revanche') { seta?.remove(); return; }
  if (!seta) {
    seta = document.createElement('div');
    seta.className = 'jr-seta';
    seta.textContent = '▼';
    seta.setAttribute('aria-hidden', 'true');
    $('cena-atores').appendChild(seta);
  }
  const pos = cena.cfg[prox];
  const alt = prox === 'lider' ? ALT_LIDER : ALT_TREINADOR;
  seta.style.left = pos.x + 'px';
  seta.style.top = (pos.y - alt - 10) + 'px';
}

function posicionarRevanche() {
  const b = $('btn-revanche');
  if (cena?.tipo !== 'interior' || b.hidden) return;
  // o balão "Revanche" em cima do jogador já cumpre o papel quando ele está do lado do líder
  b.style.visibility = balaoAcao?.id === 'revanche' ? 'hidden' : '';
  const l = cena.cfg.lider;
  posicionarNaTela(b, l.x, l.y - ALT_LIDER - 8);
}

function xDoPersonagem(p) {
  const pos = cena.cfg[p];
  // para no tapete na frente do personagem; o líder fica no fim do tapete
  const x = p === 'lider' ? pos.x - 90 : pos.x;
  return clamp(x, cena.xMin, cena.xMax);
}

function andarNoTapete(x, aoChegar) {
  andarPor([[clamp(x, cena.xMin, cena.xMax), cena.yTapete]], aoChegar);
}

function tocarNoInterior(e) {
  const npc = e.target.closest('.jr-npc');
  if (npc) { desafiar(npc.dataset.p); return; }
  const p = telaParaImagem(e.clientX, e.clientY);
  // Tocou na porta de entrada (ou a até 60 px dela) → anda até lá e sai
  if (p.x < cena.xPorta + DIST_TOQUE) { irParaSaidaGin(); return; }
  destinoEspecial = null;
  andarNoTapete(p.x);
}

// ── Saída do ginásio: mesma lógica das portas do mapa ───────
let pertoSaidaGin = false;

function irParaSaidaGin() {
  const esp = { tipo: 'saida-gin' };
  destinoEspecial = esp;
  andarNoTapete(cena.xPorta, () => {
    if (destinoEspecial === esp) entrarNoDestino(esp);
  });
}

// A cada quadro no ginásio: mostra "Saída", habilita Enter / OK
function atualizarSaidaGin() {
  const d = Math.abs(jog.x - cena.xPorta);
  pertoSaidaGin = d < DIST_PERTO;
  const el = document.querySelector('.jr-rotulo-porta[data-g="saida"]');
  if (el && el.hidden === pertoSaidaGin) el.hidden = !pertoSaidaGin;
}

// Setas/joystick: chegou na porta andando para a esquerda → sai
function verificarSaiuGin() {
  if (!soltouDesdeTroca || jog.x > cena.xPorta + 1) return;
  entrarNoDestino({ tipo: 'saida-gin' });
}

function desafiar(p) {
  const g = estado.ginasios[cena.chave];
  const idx = PERSONAGENS.indexOf(p);
  if (idx > 0 && !g[PERSONAGENS[idx - 1]].vencido) { avisar('Vença o treinador anterior primeiro!', p); return; }
  if (g[p].vencido) {
    avisar(p === 'lider' ? 'Toque em “Revanche” para um novo desafio!' : 'Você já venceu este treinador!', p);
    return;
  }
  const chave = cena.chave;
  andarNoTapete(xDoPersonagem(p), () => {
    const py = cena.cfg[p].y;
    jog.dir = p === 'lider' ? 'direita' : py < cena.yTapete ? 'costas' : py > cena.yTapete + 20 ? 'frente' : 'direita';
    desenharJogador();
    abrirPergunta(chave, p);
  });
}

let avisoTimer = null;
function avisar(texto, p) {
  const el = $('cena-aviso');
  el.textContent = texto;
  el.hidden = false;
  const pos = cena.cfg[p];
  posicionarNaTela(el, pos.x, pos.y - (p === 'lider' ? ALT_LIDER : ALT_TREINADOR) - 6);
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

// ── Contador no ícone do estojo (lê o mesmo estado do estojo) ──
function contarInsignias() {
  let conquistadas = 0, douradas = 0;
  for (const g of Object.values(estado.ginasios)) {
    if (g.insignia) conquistadas++;
    if (g.dourada) douradas++;
  }
  return { conquistadas, douradas, total: Object.keys(estado.ginasios).length };
}

function atualizarContador(efeito) {
  const { conquistadas, douradas, total } = contarInsignias();
  for (const id of ['btn-insignias', 'btn-insignias-2']) {
    const b = $(id);
    b.querySelector('.jr-estojo-cont').textContent = `${conquistadas}/${total}`;
    b.querySelector('.jr-estojo-estrela').hidden = !douradas;
    b.setAttribute('aria-label', `Minhas insígnias: ${conquistadas} de ${total}`);
    if (efeito) {
      b.classList.remove('pulo'); void b.offsetWidth; b.classList.add('pulo');
    }
  }
}

// O ícone do estojo que está na tela agora (mapa geral ou cena)
const iconeEstojo = () => $($('tela-cena').hidden ? 'btn-insignias' : 'btn-insignias-2');

// ── Insígnia nova: aparece grande no centro e voa até o ícone do estojo ──
let animInsignia = null;

function mostrarInsigniaGanha(chave, dourada) {
  const [mapaStr, G] = chave.replace('mapa', '').split('-');
  const gin = D.questoes[Number(mapaStr)].ginasios[G];
  const box = $('insignia-ganha');
  const img = $('ig-img');
  img.getAnimations().forEach(a => a.cancel());
  img.src = `${IMG}/insignias/insignia-${chave}.webp`;
  img.className = dourada ? 'dourada' : '';
  $('ig-titulo').textContent = dourada ? 'Insígnia dourada!' : `Insígnia: ${gin.nome}!`;
  box.classList.toggle('dourada', !!dourada);
  box.classList.remove('voando');
  box.hidden = false;
  tocar(dourada ? 'dourada' : 'insignia');
  img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';   // reinicia a entrada

  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const anim = { voando: false, timer: 0 };
  animInsignia = anim;

  const terminar = () => {
    clearTimeout(anim.timer);
    box.hidden = true;
    box.classList.remove('voando');
    img.getAnimations().forEach(a => a.cancel());
    if (animInsignia === anim) animInsignia = null;
    mostrarAvisoSequencia();
  };

  anim.voar = () => {
    if (anim.voando) return;
    anim.voando = true;
    clearTimeout(anim.timer);
    const alvo = iconeEstojo();
    const alvoImg = alvo.querySelector('img');
    if (reduzido || !alvoImg.offsetWidth || !img.animate) {
      // sem voo: só atualiza o contador
      atualizarContador(false);
      terminar();
      return;
    }
    box.classList.add('voando');
    const a = img.getBoundingClientRect(), b = alvoImg.getBoundingClientRect();
    const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
    const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
    const esc = b.width / a.width;
    // trajetória curva: Bézier quadrática com o ponto de controle puxado para o lado e para cima
    const cx = dx * 0.15 - Math.min(160, Math.abs(dx) * 0.4), cy = dy * 0.15 - 140;
    const quadros = [];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12, u = 1 - t;
      const x = 2 * u * t * cx + t * t * dx, y = 2 * u * t * cy + t * t * dy;
      const sc = 1 + (esc - 1) * (t * t);
      quadros.push({ transform: `translate(${x}px, ${y}px) scale(${sc})`, opacity: k === 12 ? 0.9 : 1, offset: t });
    }
    img.style.animation = 'none';
    const voo = img.animate(quadros, { duration: 700, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' });
    voo.onfinish = () => {
      atualizarContador(true);   // pulinho do ícone + contador com brilho
      terminar();
    };
  };

  // fica 1,4 s no centro (1,2 s sem animação) e então voa; tocar acelera
  anim.timer = setTimeout(anim.voar, reduzido ? 1200 : 1400);
}

function acelerarInsignia() {
  if (animInsignia && !animInsignia.voando) animInsignia.voar();
}

// ============================================================
//  3.4 PERGUNTA
// ============================================================
let pg = null;   // sessão de perguntas em andamento

function abrirPergunta(chave, p) {
  const [mapaStr, G] = chave.replace('mapa', '').split('-');
  const mapa = Number(mapaStr);
  const pers = D.questoes[mapa].ginasios[G].personagens[p];
  // Perguntas novas, com números sorteados, a cada tentativa (o campo `questoes` do JSON não é mais lido)
  const qs = gerarQuestoes(mapa, G, p).map((q, indice) => ({ ...q, indice }));
  pg = {
    chave, mapa, G, p, pers,
    fila: qs,
    total: qs.length,
    acertos: 0,
    errouIds: new Set(),
    errosPorIndice: {},   // erros por posição (0 a 4) nesta sessão → modo guiado a partir de 2
    travado: false,
    fim: false,
  };
  perguntaAberta = true;
  soltarJoystick();
  $('tela-cena').classList.add('jr-com-pergunta');   // esconde o joystick (ver CSS)
  $('perg-busto').src = `${IMG}/bustos/${pers.sprite}.webp`;
  falar(p === 'lider' ? pers.falas.abertura : pers.fala);
  $('perg-desistir').hidden = false;
  $('perg-confirma').hidden = true;
  $('pergunta').hidden = false;
  renderPergunta();
  $('pergunta').querySelector('.jr-perg-caixa').scrollTop = 0;
}

function falar(txt) {
  const el = $('perg-fala');
  el.textContent = txt;
  // durante a batalha a fala tem no máximo 2 linhas; no fim (vitória/derrota) aparece inteira
  el.classList.toggle('completa', !!pg?.fim);
  el.classList.remove('nova'); void el.offsetWidth; el.classList.add('nova');
}

function renderTabela(t) {
  if (!t) return '';
  return `<div class="jr-tabela-wrap"><table class="jr-tabela">
    ${t.titulo ? `<caption>${esc(t.titulo)}</caption>` : ''}
    <thead><tr>${t.colunas.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${t.linhas.map(l => `<tr>${l.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

function renderPergunta() {
  const q = pg.fila[0];
  pg.travado = false;
  $('perg-contador').textContent = `Pergunta ${pg.acertos + 1} de ${pg.total}`;
  $('perg-tabela').innerHTML = renderTabela(q.tabela);   // Mapa 13 B: tabela sorteada junto com a pergunta
  $('perg-enunciado').textContent = q.enunciado;
  $('perg-explica').hidden = true;
  // Modo guiado: a posição já teve 2+ erros nesta sessão → dica do ginásio e uma alternativa errada a menos
  const guiado = (pg.errosPorIndice[q.indice] || 0) >= 2;
  $('perg-corpo').classList.toggle('guiado', guiado);
  const g = $('perg-guiado');
  g.hidden = !guiado;
  if (guiado) {
    g.innerHTML = `<b>🧭 Modo guiado</b>${q.dica ? `<span>${esc(q.dica)}</span>` : ''}`;
    falar('Vamos com calma. Leia a dica e tente de novo!');
  }
  let erradas = q.erradas.map(String);
  if (guiado && erradas.length >= 2) erradas.splice(Math.floor(Math.random() * erradas.length), 1);   // nunca menos de 2 alternativas
  const alts = [String(q.resposta), ...erradas];
  const ordem = D.regras?.embaralhar_alternativas === false ? alts : embaralhar(alts);
  // 2 × 2 quando todas são curtas; senão uma coluna
  $('perg-alternativas').classList.toggle('curtas', alts.every(a => a.length <= 14));
  $('perg-alternativas').innerHTML = ordem.map(a =>
    `<button class="jr-alt" data-v="${esc(a)}">${esc(a)}</button>`).join('');
  $('perg-alternativas').hidden = false;
  $('perg-enunciado').hidden = false;
  $('perg-contador').hidden = false;
  $('perg-continuar').hidden = true;
}

// Quadro "Como resolver" (só quando erra)
function mostrarExplicacao(q, comOutrosNumeros) {
  const el = $('perg-explica');
  const exp = (q.explicacao || '').trim(), dica = (q.dica || '').trim();
  if (!exp && !dica) { el.hidden = true; return; }
  el.innerHTML =
    `<div class="jr-explica-titulo">Como resolver</div>` +
    (exp ? `<div class="jr-explica-texto">${esc(exp)}</div>` : '') +
    (dica && dica !== exp ? `<div class="jr-explica-dica">💡 ${esc(dica)}</div>` : '') +
    `<div class="jr-explica-rodape">${comOutrosNumeros ? 'Essa pergunta volta daqui a pouco, com outros números.' : 'Essa pergunta volta daqui a pouco.'}</div>`;
  el.hidden = false;
}

function responder(btn) {
  if (!pg || pg.travado || pg.fim) return;
  pg.travado = true;
  const q = pg.fila[0];
  const certa = String(q.resposta);
  const botoes = [...$('perg-alternativas').querySelectorAll('.jr-alt')];
  botoes.forEach(b => { b.disabled = true; });
  tocar('clique');
  if (btn.dataset.v === certa) {
    btn.classList.add('certa');
    tocar('acerto');
    gravar({ [`respostas/${q.id}/acertou`]: true, [`respostas/${q.id}/ultima`]: Date.now() });
    pg.fila.shift();
    pg.acertos++;
    falar(sortear(D.falas.acerto));
    setTimeout(() => { if (!pg) return; pg.fila.length ? renderPergunta() : vencer(); }, 1100);
  } else {
    btn.classList.add('errada');
    tocar('erro');
    botoes.find(b => b.dataset.v === certa)?.classList.add('certa');
    // as outras alternativas somem para dar espaço ao "Como resolver"
    botoes.forEach(b => { if (b !== btn && b.dataset.v !== certa) b.hidden = true; });
    pg.errosPorIndice[q.indice] = (pg.errosPorIndice[q.indice] || 0) + 1;
    pg.errouIds.add(q.id);
    gravar({ [`respostas/${q.id}/ultima`]: Date.now() }, q.id);   // erros += 1
    // volta para o fim da fila com outros números (no Mapa 13 B, gerarUma dá null: repete a mesma)
    pg.fila.shift();
    const nova = gerarUma(pg.mapa, pg.G, pg.p, q.indice);
    pg.fila.push(nova ? { ...nova, indice: q.indice } : q);
    falar(sortear(D.falas.erro).replace('{resposta}', certa));
    mostrarExplicacao(q, !!nova);   // explicação da pergunta que o aluno ERROU, não da nova
    $('perg-continuar').textContent = 'Continuar';
    $('perg-continuar').hidden = false;
    pg.aoContinuar = renderPergunta;
  }
}

function vencer() {
  const { chave, p, pers, total } = pg;
  pg.fim = true;
  const g = estado.ginasios[chave];
  const acertosPrimeira = total - pg.errouIds.size;
  const antes = g[p];
  const primeiraVez = !antes.vencido;
  g[p] = {
    vencido: true,
    acertosPrimeira: antes.vencido ? Math.max(antes.acertosPrimeira, acertosPrimeira) : acertosPrimeira,
    total,
    data: antes.data || Date.now(),
  };
  let ganhou = null;
  if (p === 'lider' && !g.insignia) { g.insignia = true; g.dataInsignia = Date.now(); ganhou = 'normal'; }
  if (p === 'revanche' && !g.dourada) { g.dourada = true; ganhou = 'dourada'; }
  gravarVitoria(chave, p);
  registrarDiaJogado();
  tocar('vitoria');
  // XP só na primeira vitória de cada personagem (conferido no estado carregado do Firebase)
  if (primeiraVez) {
    if (p === 'lider') darXP(XP_LIDER + (pg.errouIds.size === 0 ? XP_LIDER_PERFEITO : 0));
    else if (p === 'revanche') darXP(XP_REVANCHE);
    else darXP(XP_TREINADOR);
  }
  if (ganhou === 'normal') publicarNoFeed('insignia', chave);
  if (ganhou === 'dourada') publicarNoFeed('insignia_dourada', chave);

  // fala própria de cada personagem vencido (o líder continua com falas.vitoria)
  falar(p === 'lider' ? pers.falas.vitoria
      : p === 'revanche' ? (pers.fala_vencido || 'Você venceu a revanche! Sua insígnia agora é dourada!')
      : (pers.fala_vencido || sortear(D.falas.treinador_vencido)));
  $('perg-contador').textContent = `Acertou ${acertosPrimeira} de ${total} de primeira`;
  $('perg-enunciado').hidden = true;
  $('perg-alternativas').hidden = true;
  $('perg-explica').hidden = true; $('perg-guiado').hidden = true; $('perg-corpo').classList.remove('guiado');
  $('perg-tabela').innerHTML = '';
  $('perg-desistir').hidden = true;
  $('perg-continuar').textContent = 'Continuar';
  $('perg-continuar').hidden = false;
  pg.aoContinuar = () => {
    fecharPergunta();
    if (ganhou) mostrarInsigniaGanha(chave, ganhou === 'dourada');
    else mostrarAvisoSequencia();
  };
}

function desistir() {
  if (!pg) return;
  if (pg.p === 'lider') {
    pg.fim = true;
    falar(pg.pers.falas.derrota);
    $('perg-enunciado').hidden = true;
    $('perg-alternativas').hidden = true;
    $('perg-explica').hidden = true; $('perg-guiado').hidden = true; $('perg-corpo').classList.remove('guiado');
    $('perg-contador').hidden = true;
    $('perg-tabela').innerHTML = '';
    $('perg-desistir').hidden = true;
    $('perg-continuar').textContent = 'Sair';
    $('perg-continuar').hidden = false;
    pg.aoContinuar = fecharPergunta;
    return;
  }
  fecharPergunta();
}

function fecharPergunta() {
  $('pergunta').hidden = true;
  $('perg-confirma').hidden = true;
  pg = null;
  perguntaAberta = false;
  $('tela-cena').classList.remove('jr-com-pergunta');
  ultimoT = 0;
  if (cena?.tipo === 'interior') atualizarNpcs();
}

// ============================================================
//  3.5 ESTOJO DE INSÍGNIAS
// ============================================================
function abrirEstojo() {
  const b = D.bandeja;
  const BW = b.tamanho.w, BH = b.tamanho.h;
  let conquistadas = 0, douradas = 0;
  const html = [];
  for (let n = 1; n <= NUM_MAPAS; n++) {
    const q = D.questoes[n];
    const f = b.faixa_nome;
    const slots = ['A', 'B'].map((G, i) => {
      const e = b.encaixes[i];
      const chave = chaveGinasio(n, G);
      const g = estado.ginasios[chave];
      if (g.insignia) conquistadas++;
      if (g.dourada) douradas++;
      const st = g.dourada ? 'dourada' : g.insignia ? 'conquistada' : 'bloqueada';
      return `<button class="jr-encaixe ${st}" data-chave="${chave}"
                style="left:${(e.cx - e.r) / BW * 100}%;top:${(e.cy - e.r) / BH * 100}%;width:${2 * e.r / BW * 100}%;height:${2 * e.r / BH * 100}%"
                aria-label="Insígnia ${esc(q.ginasios[G].nome)}">
                <img src="${IMG}/insignias/insignia-${chave}.webp" alt="" loading="lazy" draggable="false"/>
                ${st === 'bloqueada' ? '<span class="jr-cadeado">🔒</span>' : ''}
                ${st === 'dourada' ? '<span class="jr-estrela">★</span>' : ''}
              </button>`;
    }).join('');
    html.push(`<div class="jr-bandeja-bloco">
      <div class="jr-bandeja-titulo">${esc(q.nome)}</div>
      <div class="jr-bandeja" style="aspect-ratio:${BW}/${BH}">
        <div class="jr-bandeja-num" style="left:${f.x / BW * 100}%;top:${f.y / BH * 100}%;width:${f.w / BW * 100}%;height:${f.h / BH * 100}%">${n}</div>
        ${slots}
      </div>
    </div>`);
  }
  $('estojo-bandejas').innerHTML = html.join('');
  $('estojo-resumo').textContent = `${conquistadas} de 26 · ${douradas} dourada${douradas === 1 ? '' : 's'}`;
  $('estojo-barra').style.width = (conquistadas / 26 * 100) + '%';
  $('estojo-nota').innerHTML = `Nota do jogo: <b>${formatarNota(notaJogoRevisao(conquistadas, douradas))}</b> / ${NOTA_MAX}` +
    `<small>Insígnias valem ${PESO_INSIGNIAS},0 · douradas valem mais ${PESO_DOURADAS},0</small>`;
  $('estojo').hidden = false;
  $('estojo').scrollTop = 0;
}

function abrirCartao(chave) {
  const [mapaStr, G] = chave.replace('mapa', '').split('-');
  const q = D.questoes[Number(mapaStr)];
  const gin = q.ginasios[G];
  const g = estado.ginasios[chave];
  const img = $('cartao-img');
  img.src = `${IMG}/insignias/insignia-${chave}.webp`;
  img.className = g.dourada ? 'dourada' : g.insignia ? '' : 'bloqueada';
  $('cartao-nome').textContent = gin.nome;
  $('cartao-regiao').textContent = `Mapa ${q.mapa} · ${q.nome}`;
  $('cartao-conteudo').textContent = gin.conteudo;
  $('cartao-info').textContent = g.insignia
    ? `Acertou ${g.lider.acertosPrimeira} de ${g.lider.total} de primeira${g.dourada ? ' · ★ Dourada' : ''}`
    : `Vença o líder do ginásio “${gin.nome}”, em ${q.nome}.`;
  $('cartao').hidden = false;
}

// ============================================================
//  Eventos
// ============================================================
function ligarEventos() {
  ligarArrasteGeral();
  ligarControles();

  $('btn-sair-jogo').addEventListener('click', () => { window.location.href = '/aluno/a-jogos.html'; });
  $('btn-insignias').addEventListener('click', abrirEstojo);
  $('selo-seq').addEventListener('click', (e) => { e.stopPropagation(); mostrarBalaoSequencia(); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#selo-seq')) $('seq-balao').hidden = true; });
  // botão de som (🔊 / 🔇), lembrado em localStorage
  const pintarSom = () => document.querySelectorAll('[data-som]').forEach(b => {
    const on = somLigado();
    b.textContent = on ? '🔊' : '🔇';
    b.setAttribute('aria-label', on ? 'Desligar o som' : 'Ligar o som');
    b.classList.toggle('mudo', !on);
  });
  document.querySelectorAll('[data-som]').forEach(b => b.addEventListener('click', () => { alternarSom(); pintarSom(); tocar('clique'); }));
  pintarSom();
  $('btn-insignias-2').addEventListener('click', abrirEstojo);
  $('btn-cena-voltar').addEventListener('click', sairDaCena);

  $('cena-vp').addEventListener('click', (e) => {
    if (!cena || perguntaAberta) return;
    if (cena.tipo === 'mapa') tocarNoMapa(e);
    else tocarNoInterior(e);
  });
  $('cena-balao').addEventListener('click', () => {
    const a = balaoAcao;
    if (!a) return;
    jog.caminho = []; jog.aoChegar = null;
    esconderBalao();
    a.acao();
  });
  $('btn-revanche').addEventListener('click', () => {
    if (cena?.tipo !== 'interior') return;
    const chave = cena.chave;
    andarNoTapete(xDoPersonagem('lider'), () => {
      jog.dir = 'direita'; desenharJogador();
      abrirPergunta(chave, 'revanche');
    });
  });

  $('perg-alternativas').addEventListener('click', (e) => {
    const b = e.target.closest('.jr-alt');
    if (b) responder(b);
  });
  $('perg-continuar').addEventListener('click', () => { const f = pg?.aoContinuar; if (f) f(); });
  $('perg-desistir').addEventListener('click', () => { if (pg && !pg.fim) $('perg-confirma').hidden = false; });
  $('confirma-continuar').addEventListener('click', () => { $('perg-confirma').hidden = true; });
  $('confirma-fugir').addEventListener('click', () => { $('perg-confirma').hidden = true; desistir(); });

  $('insignia-ganha').addEventListener('click', acelerarInsignia);   // tocar acelera (vai direto ao voo)

  $('estojo-fechar').addEventListener('click', () => {
    $('estojo').hidden = true;
    if (!$('tela-geral').hidden) desenharMarcadores();
  });
  $('estojo-bandejas').addEventListener('click', (e) => {
    const b = e.target.closest('.jr-encaixe');
    if (b) abrirCartao(b.dataset.chave);
  });
  $('cartao-fechar').addEventListener('click', () => { $('cartao').hidden = true; });
  $('cartao').addEventListener('click', (e) => { if (e.target.id === 'cartao') $('cartao').hidden = true; });

  window.addEventListener('resize', () => {
    if (!$('tela-geral').hidden) dimensionarGeral();
    if (cena) ajustarCamera();
  });
}

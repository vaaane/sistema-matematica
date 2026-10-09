// ============================================================
//  Jogo de Revisão — motor do jogo (Parte A) + progresso no Firebase (Parte B)
//  Real: jogo_revisao/{uid}   ·   Modo teste: modo_teste_historico/{uid}/jogo_revisao
// ============================================================
import { isModoTeste } from '/js/auth.js';
import { db } from '/js/firebase-config.js';
import { ref, get, update, push, set, increment } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { adicionarXP } from '/js/db.js';
import { bimestreAtual, ALUNOS_TESTE } from '/js/constants.js';
import { gerarQuestoes, gerarUma } from '/js/jogo-revisao/geradores.js';
import { tocar, somLigado, alternarSom } from '/js/jogo-revisao/sons.js';
import { definirPausas, barriga, faixaBarriga, rotuloLealdade, lealdadeComQueda, doDia, PRECO_REFEICAO, REFEICOES_POR_DIA,
  CARINHOS_POR_DIA, LEALDADE_INICIAL, LEALDADE_DIA, LEALDADE_CAMBALHOTA } from '/js/jogo-revisao/cuidados.js';
import { PETS, NOME_PET, carregarSprites, petValido, quadrosDe, tamanhoQuadro, tamanhoBusto, temBusto, bustoPet, preCarregarPet, PetSeguidor, PetParado } from '/js/jogo-revisao/pets.js';
import { iniciarOnline, enviarOnline, sairOnline, ouvirMapa, ouvirTodos, onlineAtivo, VALIDADE_MS } from '/js/jogo-revisao/online.js';
import { definirFalas, falasProntas, configFalas, dicaDe, montarFala, duracaoBalao } from '/js/jogo-revisao/conversa.js';
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
const XP_REVISAO = 15;                          // revisão da semana concluída

const IMG   = '/img/jogo';
const DADOS = '/dados/jogo';

const W = 1376, H = 768;            // tamanho original dos mapas/interiores
const GW = 344, GH = 192, CEL = 4;  // grade da trilha (cada pixel = 4×4 do mapa)
const VEL = 180;                    // px/s em coordenadas da imagem
const T_QUADRO = 120;               // ms por quadro de caminhada
const ALT_JOGADOR = 110, ALT_TREINADOR = 120, ALT_LIDER = 135;
const ALT_JOGADOR_MAPA = 55;   // nos mapas da cidade o personagem tem metade do tamanho (nos ginásios continua 110)
// Tamanho do pet na cena (altura do quadro, em px do cenário 1376×768; a largura segue a proporção do sprites.json).
// Não depende do tamanho do arquivo: trocar a resolução das imagens não muda o tamanho na tela.
// Altura do pet SENTADO no mapa, em px na escala do mapa (personagem = ALT_JOGADOR_MAPA = 55)
const ALT_PET = {
  capivara: 30, gato: 30, gaviao: 30, axolote: 30, tigre: 30,
  unicornio: 40, dragao_azul: 40,
  dragao_vermelho: 50,
};
const ALT_PET_PADRAO = 30;   // pet que não estiver na tabela
const altPet = (pet) => ALT_PET[pet] ?? ALT_PET_PADRAO;
// O quadro (449 × 352) tem folga em cima para os pulos: sentado, o pet ocupa ~302 dos 352 px.
// Altura da IMAGEM para o pet sentado ficar com a altura da tabela:
const altImagemPet = (pet) => altPet(pet) * 352 / 302;
// Distância normal do pet atrás do personagem (ao longo do rastro), em px na escala do mapa.
// Parado, o pet chega a 55% disso; acima de +10 anda 1,3× mais rápido; acima de +62 corre (pets.js).
const DIST_PET = {
  capivara: 36, gato: 36, gaviao: 36, axolote: 36, tigre: 36,
  unicornio: 55, dragao_azul: 55, dragao_vermelho: 55,
};
const DIST_PET_PADRAO = 36;
const distPet = (pet) => DIST_PET[pet] ?? DIST_PET_PADRAO;
// no ginásio tudo é o dobro (o personagem tem ALT_JOGADOR em vez de ALT_JOGADOR_MAPA)
const ESCALA_GINASIO = ALT_JOGADOR / ALT_JOGADOR_MAPA;
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

// Meta da turma e placar entre as turmas (jogo_revisao_turmas/{turma}: { insignias, douradas })
const TURMAS_PLACAR = ['8D', '8E', '8F', '8G', '8H'];   // TESTE e outras nunca aparecem
let placarTurmas = {};
let metaTurma = 100;   // jogo_revisao_config/global/meta_turma (padrão 100)

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
    { const u = estado.sequencia?.ultimo_dia; conversa.voltou = !!u && u !== diaLocal() && (paraData(diaLocal()) - paraData(u)) / 86400000 >= 3; }
    estado.respostas = v.respostas || {};
    estado.pets = lerPets(v);   // validado depois de ler o sprites.json (cachorro/porco antigos são ignorados)
    estado.revisaoSemanal = v.revisao_semanal || {};
    carregouProgresso = true;
    gravar({ ultimo_acesso: Date.now() });
  } catch (e) {
    console.error('[jogo-revisao] erro ao carregar progresso', e);
    avisoConexao('Não foi possível carregar seu progresso. Verifique a internet e recarregue a página.', true);
  }
  try {
    const cfg = await get(ref(db, 'jogo_revisao_config/global'));
    const c = cfg.exists() ? cfg.val() || {} : {};
    for (const n of Object.values(c.mapas_abertos || {})) mapasAbertos.add(Number(n));
    if (Number(c.meta_turma) > 0) metaTurma = Number(c.meta_turma);
    definirPausas(c.pausas);   // feriados/férias: não contam para a fome nem para a lealdade
  } catch (e) { /* sem config: vale só a regra padrão e meta 100 */ }
  try {
    const t = await get(ref(db, 'jogo_revisao_turmas'));   // pequeno: um nó por turma
    placarTurmas = t.exists() ? t.val() || {} : {};
  } catch (e) { placarTurmas = {}; }
}

// Soma +1 no contador da turma (fora do nó do aluno, sem fila). Nunca para TESTE ou turma vazia.
async function somarTurma(turma, campo) {
  if (!turma || turma === 'TESTE') return;
  try {
    await update(ref(db, `jogo_revisao_turmas/${turma}`), { [campo]: increment(1) });
  } catch (e) { console.error('[jogo-revisao] erro ao somar na turma', turma, e); }
}

const turmaNoPlacar = () => TURMAS_PLACAR.includes(sessao?.turma);
const insigniasDaTurma = (t) => Number(placarTurmas[t]?.insignias) || 0;

// Faixa "🏆 Meta da 8E: 37 / 100 insígnias" no mapa geral
function atualizarFaixaMeta() {
  const el = $('faixa-meta');
  if (!el) return;
  el.hidden = !turmaNoPlacar();
  if (el.hidden) return;
  const n = insigniasDaTurma(sessao.turma);
  el.querySelector('.jr-meta-txt').textContent = `🏆 Meta da ${sessao.turma}: ${n} / ${metaTurma} insígnias`;
  el.querySelector('.jr-meta-fill').style.width = Math.min(100, n / metaTurma * 100) + '%';
}

// Placar das 5 turmas, no estojo
function renderPlacar() {
  const el = $('estojo-placar');
  const linhas = TURMAS_PLACAR
    .map(t => ({ t, ins: insigniasDaTurma(t), dour: Number(placarTurmas[t]?.douradas) || 0 }))
    .sort((a, b) => (b.ins - a.ins) || (b.dour - a.dour) || a.t.localeCompare(b.t));
  el.innerHTML = `<div class="jr-placar-titulo">🏆 Placar das turmas <small>meta: ${metaTurma} insígnias</small></div>` +
    linhas.map(({ t, ins, dour }) => `
      <div class="jr-placar-linha${t === sessao.turma ? ' minha' : ''}">
        <span class="jr-placar-turma">${t}</span>
        <span class="jr-placar-barra"><span style="width:${Math.min(100, ins / metaTurma * 100)}%"></span></span>
        <span class="jr-placar-num">${ins}<small> · ${dour} dourada${dour === 1 ? '' : 's'}</small></span>
      </div>`).join('');
}

// Aviso comemorativo, uma vez por aluno, quando a turma passa da meta
function avisarMetaBatida() {
  if (!turmaNoPlacar() || insigniasDaTurma(sessao.turma) < metaTurma) return;
  const chave = `jr_meta_${sessao.turma}_${metaTurma}`;
  try { if (localStorage.getItem(chave)) return; localStorage.setItem(chave, '1'); } catch (_) { return; }
  const el = document.createElement('div');
  el.className = 'jr-aviso-seq jr-aviso-meta';
  el.textContent = `🎉 A ${sessao.turma} bateu a meta de ${metaTurma} insígnias!`;
  $('jr-app').appendChild(el);
  setTimeout(() => el.remove(), 4000);
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
// ============================================================
//  Celular/tablet: o jogo é sempre desenhado deitado (no computador nada muda)
//  Em pé, o jogo inteiro gira 90° (classe jr-girado) e o aluno só vira o celular.
// ============================================================
const mqToque = matchMedia('(hover: none) and (pointer: coarse)');
const mqRetrato = matchMedia('(orientation: portrait)');
let tentouTravar = false;       // tela cheia + travar na horizontal: só uma tentativa
const deitado = () => mqToque.matches;                        // layout deitado (real ou girado)
const girado  = () => mqToque.matches && mqRetrato.matches;   // celular em pé: jogo girado 90°

// Ponto da tela (clientX/Y) → coordenadas do jogo (iguais quando não está girado)
function pontoNoJogo(cx, cy) {
  return girado() ? { x: cy, y: innerWidth - cx } : { x: cx, y: cy };
}
// Deslocamento na tela → deslocamento no jogo
function deltaNoJogo(dx, dy) {
  return girado() ? { x: dy, y: -dx } : { x: dx, y: dy };
}

function atualizarOrientacao() {
  const raiz = document.documentElement;
  raiz.classList.toggle('jr-deitado', deitado());
  raiz.classList.toggle('jr-girado', girado());
  // altura da área do jogo (girado, é a largura da tela)
  raiz.style.setProperty('--jr-alt', (girado() ? innerWidth : innerHeight) + 'px');
  soltarJoystick();
  teclas.clear();
  ultimoT = 0;
  posicionarContador();
  if (!$('tela-geral').hidden) dimensionarGeral();
  if (cena) ajustarCamera();
}

// Deitado no celular, a pergunta tem 2 colunas e o contador vai para a coluna da esquerda
function posicionarContador() {
  const c = $('perg-contador');
  if (deitado()) {
    if (c.parentElement !== document.querySelector('.jr-perg-topo')) $('perg-desistir').before(c);
  } else if (c.parentElement !== $('perg-corpo')) {
    $('perg-guiado').after(c);
  }
}

// No primeiro toque: tela cheia e travar na horizontal (Chrome do Android; no iPhone não existe)
async function travarHorizontal() {
  if (tentouTravar || !mqToque.matches) return;
  tentouTravar = true;
  try {
    await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    await screen.orientation?.lock?.('landscape');
  } catch (_) { /* sem trava: o jogo continua desenhado deitado mesmo assim */ }
}

async function sairDoJogo() {
  await sairOnline();
  if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch (_) {} }
  window.location.href = '/aluno/a-jogos.html';
}

function ligarOrientacao() {
  mqToque.addEventListener('change', atualizarOrientacao);
  mqRetrato.addEventListener('change', atualizarOrientacao);
  addEventListener('resize', () => document.documentElement.style.setProperty('--jr-alt', (girado() ? innerWidth : innerHeight) + 'px'));
  addEventListener('pointerdown', travarHorizontal, { capture: true, passive: true });
  atualizarOrientacao();
}

export async function iniciarJogo(sess) {
  sessao = sess;
  ligarOrientacao();   // já desenha deitado na tela "Carregando o jogo…"
  modoDev = new URLSearchParams(location.search).get('dev') === '1' && isModoTeste();
  // só para a professora testar pelo console (?dev=1 no modo teste): jogoRevisaoDev.somarTurma('ZZ_DEV', 'insignias')
  if (modoDev) window.jogoRevisaoDev = { somarTurma };

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
  try { definirFalas(await fetch(`${DADOS}/falas-pets.json`).then(r => { if (!r.ok) throw new Error('falas-pets.json'); return r.json(); })); }
  catch (e) { console.warn('[jogo-revisao] falas dos pets indisponíveis', e); }
  try { await carregarSprites(); petsOk = true; } catch (e) { console.error('[jogo-revisao] pets indisponíveis', e); }
  preCarregarQuadros();
  ligarEventos();
  atualizarContador();
  requestAnimationFrame(loop);
  abrirMapaGeral();
  $('jr-carregando').hidden = true;
  iniciarPet();
  entrarOnline();
}

// ============================================================
//  PETS — o aluno escolhe 1 inicial e conquista os outros vencendo líderes de ginásio
// ============================================================
// Ginásio → pet que aparece ao lado do líder depois de vencido.
// 'inicial' = o 1º de INICIAIS (nessa ordem) que o aluno ainda não tem.
const PETS_GINASIO = {
  'mapa1-B':  'inicial',          // Prefeitura (Vila Inicial)
  'mapa2-B':  'inicial',          // Farol (Porto das Dezenas)
  'mapa3-B':  'axolote',          // Cabana da Neve (Ilha Gelada)
  'mapa5-B':  'tigre',            // Torre de Pedra (Montanha das Potências)
  'mapa7-B':  'dragao_azul',      // Supermercado (Mercado Central)
  'mapa9-B':  'unicornio',        // Torre do Mago (Floresta das Balanças)
  'mapa11-B': 'dragao_vermelho',  // Escritório de Arquitetura (Canteiro de Obras)
};
const INICIAIS = ['capivara', 'gato', 'gaviao'];
// pet esperando ao lado do líder: ~70% do líder para um pet de 40, na mesma proporção entre os pets
const altImagemPetGinasio = (pet) => ALT_LIDER * 0.7 * (altPet(pet) / 40) * 352 / 302;

let petsOk = false;
let seguidor = null;

// pets: { ativo, conquistados: { pet: { data, origem } } }; o campo antigo `pet` (string) vira o inicial
function lerPets(v) {
  const conquistados = { ...(v.pets?.conquistados || {}) };
  let ativo = v.pets?.ativo || null;
  let migrou = false;
  if (typeof v.pet === 'string' && !Object.keys(conquistados).length) {
    conquistados[v.pet] = { data: Date.now(), origem: 'inicial' };
    ativo = ativo || v.pet;
    migrou = true;
  }
  return { ativo, conquistados, migrou, moedas: Number(v.pets?.moedas) || 0 };
}

const temPet = (p) => !!(p && estado.pets.conquistados[p]);
const conquistadoEm = (chave) => Object.values(estado.pets.conquistados).some(c => c?.origem === chave);

function iniciarPet() {
  if (!petsOk) return;
  seguidor = new PetSeguidor($('pet'), $('pet-sombra'));
  if (window.jogoRevisaoDev) window.jogoRevisaoDev.seguidor = seguidor;   // só no modo dev (?dev=1 no modo teste)
  $('btn-trocar-pet').hidden = false;
  // pet que não existe no sprites.json (ex.: cachorro, porco de testes antigos) é ignorado
  const ps = estado.pets;
  for (const p of Object.keys(ps.conquistados)) if (!petValido(p)) delete ps.conquistados[p];
  if (!temPet(ps.ativo)) ps.ativo = Object.keys(ps.conquistados)[0] || null;
  if (ps.migrou && ps.ativo) gravar({ pets: { ativo: ps.ativo, conquistados: ps.conquistados } });
  delete ps.migrou;
  normalizarCuidados();
  if (ps.ativo) { preCarregarPet(ps.ativo); seguidor.definir(ps.ativo); }
  atualizarFomeSeguidor();
}

// Ainda sem nenhum pet: pede a escolha do inicial ao entrar num mapa da região
function pedirPetSeFaltar() {
  if (seguidor && !Object.keys(estado.pets.conquistados).length && $('pet-escolha').hidden) abrirEscolhaPet();
}

// Quadros sentado_girando rodando nos painéis de pet (escolha e coleção)
let timerPainelPet = 0;
function animarPainelPet(raizEl) {
  clearInterval(timerPainelPet);
  let q = 0;
  timerPainelPet = setInterval(() => {
    if (raizEl.closest('[hidden]')) { clearInterval(timerPainelPet); return; }
    q++;
    for (const im of raizEl.querySelectorAll('img[data-anim]')) {
      const l = quadrosDe(im.dataset.anim, 'sentado_girando');
      im.src = l[q % l.length];
    }
  }, 400);
}

const imgPet = (p, animar = true) =>
  `<img src="${quadrosDe(p, 'sentado_girando')[0]}" width="${tamanhoQuadro()[0]}" height="${tamanhoQuadro()[1]}"${animar ? ` data-anim="${p}"` : ''} alt="" draggable="false"/>`;

function abrirEscolhaPet() {
  $('pet-opcoes').innerHTML = INICIAIS.filter(petValido).map(p => `
    <div class="jr-pet-opcao" data-pet="${p}">
      ${imgPet(p)}
      <span>${NOME_PET[p]}</span>
      <button class="jr-btn jr-pet-escolher" data-pet="${p}">Escolher</button>
    </div>`).join('');
  $('pet-escolha').hidden = false;
  animarPainelPet($('pet-opcoes'));
}

function escolherPet(pet) {
  if (!INICIAIS.includes(pet) || !petValido(pet) || Object.keys(estado.pets.conquistados).length) return;
  const c = { data: Date.now(), origem: 'inicial', ...cuidadosNovos() };
  estado.pets.conquistados[pet] = c;
  estado.pets.ativo = pet;
  gravar({ [`pets/conquistados/${pet}`]: c, 'pets/ativo': pet });
  usarPet(pet);
  $('pet-escolha').hidden = true;
  tocar('vitoria');
}

// Troca o pet que segue o personagem (aparece em x, y — por padrão junto do personagem)
function usarPet(pet, x = jog.x, y = jog.y) {
  preCarregarPet(pet);
  seguidor.definir(pet);
  if (cena) seguidor.colocar(x, y);
  atualizarBotaoPet();
  atualizarFomeSeguidor();
  enviarOnline({ pet });
}

// Onde cada pet ainda não conquistado aparece: { pet: chaveGinasio }
function ondeAparecem() {
  const out = {};
  const vagas = Object.keys(PETS_GINASIO).filter(k => PETS_GINASIO[k] === 'inicial' && !conquistadoEm(k));
  INICIAIS.filter(p => !temPet(p)).forEach((p, i) => { if (vagas[i]) out[p] = vagas[i]; });
  for (const [k, p] of Object.entries(PETS_GINASIO)) if (p !== 'inicial' && !temPet(p)) out[p] = k;
  return out;
}

// Pet que espera neste ginásio (null se não tem, ou se já foi levado)
function petDoGinasio(chave) {
  if (!petsOk || !PETS_GINASIO[chave] || conquistadoEm(chave)) return null;
  const pet = Object.entries(ondeAparecem()).find(([, k]) => k === chave)?.[0];
  return pet && petValido(pet) ? pet : null;
}

function nomeDoLugar(chave) {
  const [n, G] = chave.replace('mapa', '').split('-');
  const q = D.questoes[Number(n)];
  return `${q.ginasios[G].nome} — ${q.nome}`;
}

// ── Coleção: conquistados (escolher o ativo) e silhuetas dos que faltam ──
function abrirColecao() {
  const onde = ondeAparecem();
  const ordem = PETS.filter(petValido).sort((a, b) => temPet(b) - temPet(a));
  $('colecao-opcoes').innerHTML = ordem.map(p => temPet(p) ? `
    <div class="jr-pet-opcao${estado.pets.ativo === p ? ' atual' : ''}" data-pet="${p}">
      ${imgPet(p)}
      <span>${NOME_PET[p]}</span>
      <button class="jr-btn jr-pet-escolher" data-pet="${p}">${estado.pets.ativo === p ? 'Com você' : 'Usar'}</button>
    </div>` : `
    <div class="jr-pet-opcao bloqueado">
      ${imgPet(p, false)}
      <span class="jr-pet-lugar">${onde[p] ? nomeDoLugar(onde[p]) : '???'}</span>
    </div>`).join('');
  $('pet-colecao').hidden = false;
  animarPainelPet($('colecao-opcoes'));
}

let colecaoDoMeuPet = false;   // coleção aberta pelo "Trocar pet" da tela Meu Pet: volta para ela

function trocarPetAtivo(pet) {
  if (!temPet(pet)) return;
  $('pet-colecao').hidden = true;
  if (estado.pets.ativo !== pet) {
    estado.pets.ativo = pet;
    gravar({ 'pets/ativo': pet });
    usarPet(pet);
    tocar('vitoria');
  }
  if (colecaoDoMeuPet) { colecaoDoMeuPet = false; abrirMeuPet(); }
}

// Botão do HUD no mapa da região: ícone do pet ativo
function atualizarBotaoPet() {
  const b = $('btn-pet');
  const ativo = estado?.pets?.ativo;
  b.hidden = !(seguidor && ativo && cena?.tipo === 'mapa');
  if (b.hidden) return;
  const src = quadrosDe(ativo, 'sentado_girando')[0];
  const img = b.querySelector('img');
  if (img.getAttribute('src') !== src) img.src = src;
  b.setAttribute('aria-label', `Meus pets (${NOME_PET[ativo]})`);
}

// ── Pet esperando ao lado do líder ──────────────────────────
let petGin = null;      // { pet, chave, x, y, xParada, img, anim }
let petSurgir = null;   // ginásio cujo líder acabou de ser vencido: o pet surge depois do aviso

function removerPetGinasio() {
  petGin?.img.remove();
  petGin = null;
}

function mostrarPetGinasio(surgindo = false) {
  removerPetGinasio();
  if (cena?.tipo !== 'interior') return;
  const pet = petDoGinasio(cena.chave);
  if (!pet || !(estado.ginasios[cena.chave].lider.vencido || modoDev)) return;   // modo dev: sem vencer o líder
  const l = cena.cfg.lider;
  // um pouco atrás (y menor) e à esquerda do líder, sem cobri-lo; fora do lugar onde o
  // personagem para diante do líder (xDoPersonagem = líder − 90), para não ficar escondido atrás dele
  const x = l.x - 145, y = l.y - 18;
  const img = document.createElement('img');
  img.className = 'jr-ator jr-pet-gin';
  img.alt = NOME_PET[pet];
  img.draggable = false;
  const alt = altImagemPetGinasio(pet);
  img.style.cssText = `left:${x}px;top:${y}px;height:${alt}px;z-index:${Math.round(y)}`;
  $('cena-atores').appendChild(img);
  preCarregarPet(pet);
  const anim = new PetParado(img);
  anim.definir(pet);
  // o jogador para à esquerda do pet (longe o bastante da parada do líder)
  petGin = { pet, chave: cena.chave, x, y, xParada: clamp(x - 60, cena.xMin, cena.xMax), img, anim };
  if (surgindo) {
    anim.tocar('feliz');
    avisarEm('Um pet quer te seguir!', x, y - alt - 6);
  }
}

function surgirPetSePendente() {
  if (!petSurgir) return;
  const chave = petSurgir;
  petSurgir = null;
  if (cena?.tipo === 'interior' && cena.chave === chave) mostrarPetGinasio(true);
}

function abrirLevarPet() {
  if (!petGin || petGin.levado) return;
  const p = petGin.pet;
  const img = $('levar-img');
  const [w, h] = temBusto(p) ? tamanhoBusto() : tamanhoQuadro();   // sem busto: sentado_girando_1 (mapa `reserva`)
  img.width = w; img.height = h;
  img.src = bustoPet(p);
  $('levar-nome').textContent = NOME_PET[p];
  $('pet-levar').hidden = false;
}

function conquistarPet(usarAgora) {
  $('pet-levar').hidden = true;
  if (!petGin || petGin.levado) return;
  const { pet, chave, x, y, anim } = petGin;
  const c = { data: Date.now(), origem: chave, ...cuidadosNovos() };
  estado.pets.conquistados[pet] = c;
  const patch = { [`pets/conquistados/${pet}`]: c };
  if (usarAgora || !estado.pets.ativo) { estado.pets.ativo = pet; patch['pets/ativo'] = pet; }
  gravar(patch);
  tocar('vitoria');
  const usar = estado.pets.ativo === pet;
  // pulinho de alegria e sai do lugar; se for usar agora, já começa a seguir dali
  petGin.levado = true;
  anim.tocar('feliz', () => {
    removerPetGinasio();
    if (usar && cena?.chave === chave) usarPet(pet, x, y);
  });
}

// ============================================================
//  CUIDADOS — moedas (do aluno), barriga e lealdade (de cada pet)
// ============================================================
// Pet novo (ou conquistado antes dos cuidados): barriga cheia agora, lealdade 20
const cuidadosNovos = () => ({ ultima_refeicao: Date.now(), lealdade: LEALDADE_INICIAL, ultimo_dia_jogado: diaLocal() });

// Ao carregar: completa campos que faltam e aplica a queda de lealdade dos dias úteis sem jogar
function normalizarCuidados() {
  const hoje = diaLocal();
  const patch = {};
  for (const [pet, c] of Object.entries(estado.pets.conquistados)) {
    const base = `pets/conquistados/${pet}`;
    if (!(Number(c.ultima_refeicao) > 0)) { c.ultima_refeicao = Date.now(); patch[`${base}/ultima_refeicao`] = c.ultima_refeicao; }
    if (!Number.isFinite(c.lealdade)) { c.lealdade = LEALDADE_INICIAL; patch[`${base}/lealdade`] = c.lealdade; }
    if (!c.ultimo_dia_jogado) { c.ultimo_dia_jogado = hoje; patch[`${base}/ultimo_dia_jogado`] = hoje; }
    const nova = lealdadeComQueda(c, hoje);
    if (nova !== null) {
      c.lealdade = nova; c.lealdade_dia = hoje;
      patch[`${base}/lealdade`] = nova; patch[`${base}/lealdade_dia`] = hoje;
    }
  }
  if (Object.keys(patch).length) gravar(patch);
}

const cuidadosDe = (pet) => estado.pets.conquistados[pet];
const barrigaDe = (pet) => { const c = cuidadosDe(pet); return c ? barriga(Number(c.ultima_refeicao) || Date.now()) : 100; };

// Pet ativo com fome (barriga < 40) fica triste quando parado no mapa
function atualizarFomeSeguidor() {
  if (seguidor) seguidor.fome = !!estado.pets.ativo && barrigaDe(estado.pets.ativo) < 40;
}

// +1 moeda por resposta certa (não é XP)
function ganharMoeda() {
  if (!estado?.pets) return;
  estado.pets.moedas = (Number(estado.pets.moedas) || 0) + 1;
  gravar({ 'pets/moedas': estado.pets.moedas });
  const el = $('perg-moedas');
  atualizarMoedasPergunta();
  const mais = document.createElement('span');
  mais.className = 'jr-moeda-mais';
  mais.textContent = '+1 🪙';
  el.appendChild(mais);
  setTimeout(() => mais.remove(), 1100);
}

function atualizarMoedasPergunta() {
  const el = $('perg-moedas');
  if (!el) return;
  el.hidden = !petsOk;
  el.querySelector('span').textContent = Number(estado?.pets?.moedas) || 0;
}

// +5 de lealdade no 1º dia de jogo de cada dia, para o pet ativo (junto de registrarDiaJogado)
function lealdadeDoDia() {
  const pet = estado?.pets?.ativo;
  const c = pet && cuidadosDe(pet);
  const hoje = diaLocal();
  if (!c || c.ultimo_dia_jogado === hoje) return;
  c.lealdade = Math.min(100, (Number(c.lealdade) || LEALDADE_INICIAL) + LEALDADE_DIA);
  c.ultimo_dia_jogado = hoje; c.lealdade_dia = hoje;
  const base = `pets/conquistados/${pet}`;
  gravar({ [`${base}/lealdade`]: c.lealdade, [`${base}/ultimo_dia_jogado`]: hoje, [`${base}/lealdade_dia`]: hoje });
}

// ── Tela "Meu Pet" ──────────────────────────────────────────
const COMIDA_PET = { capivara: '🌿', gato: '🐟', gaviao: '🍖', axolote: '🦐', tigre: '🍖', unicornio: '🍎', dragao_azul: '🍖', dragao_vermelho: '🍖' };
const semMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const ehNoite = () => { const f = window.jogoRevisaoDev?.noite; if (f !== undefined) return f; const h = new Date().getHours(); return h >= 22 || h < 6; };

let mp = null;   // { pet, anim (PetParado), estado, corpoAnim, noite, timerBalao }

function abrirMeuPet() {
  const pet = estado.pets.ativo;
  if (!pet) return;
  preCarregarPet(pet);
  $('meu-pet').hidden = false;
  const img = $('mp-img');
  mp = { pet, anim: new PetParado(img), estado: '', corpoAnim: null, noite: null, ocupado: false };
  img.dataset.src = '';
  const palco = $('mp-palco');
  // pet grande: até ~78% da altura do palco, nunca maior que o quadro original
  img.style.height = Math.min(palco.clientHeight * 0.78, tamanhoQuadro()[1]) + 'px';
  mp.anim.definir(pet);
  renderMeuPet();
  voltarAoNormal();
}

function fecharMeuPet() {
  $('meu-pet').hidden = true;
  mp?.corpoAnim?.cancel();
  mp = null;
}

function renderMeuPet() {
  if (!mp) return;
  const pet = mp.pet, c = cuidadosDe(pet);
  const b = Math.round(barrigaDe(pet)), fb = faixaBarriga(b);
  const l = Math.round(Number(c.lealdade) || 0);
  $('mp-nome').textContent = NOME_PET[pet];
  $('mp-origem').textContent = c.origem && c.origem !== 'inicial' && PETS_GINASIO[c.origem] ? `Conquistado: ${nomeDoLugar(c.origem)}` : 'Seu primeiro pet';
  $('mp-moedas').textContent = Number(estado.pets.moedas) || 0;
  $('mp-barriga-fill').style.width = b + '%';
  $('mp-barriga-fill').dataset.cor = fb.cor;
  $('mp-barriga-rot').textContent = fb.rotulo;
  $('mp-lealdade-fill').style.width = l + '%';
  $('mp-lealdade-rot').textContent = `${rotuloLealdade(l)} · ${l}`;
  $('mp-dica').textContent = l >= LEALDADE_CAMBALHOTA ? 'Ele já sabe dar cambalhota! Faça um carinho.' : `Com ${LEALDADE_CAMBALHOTA} de lealdade ele aprende a cambalhota`;
  const noite = ehNoite();
  $('mp-palco').classList.toggle('noite', noite);
  $('mp-alimentar').disabled = $('mp-carinho').disabled = noite;
  $('mp-alimentar').innerHTML = noite ? 'Dormindo…' : `Alimentar (${PRECO_REFEICAO} 🪙)`;
  $('mp-carinho').textContent = noite ? 'Dormindo…' : 'Carinho';
}

// Movimento por código no corpo do pet (respira, balança a cabeça, fica tristinho)
function movimentoCorpo(tipo) {
  mp.corpoAnim?.cancel();
  mp.corpoAnim = null;
  if (semMovimento()) return;
  const corpo = $('mp-corpo');
  const K = {
    respira:  [[{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.03)' }], { duration: 1400, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }],
    dorme:    [[{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.03)' }], { duration: 2400, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }],
    come:     [[{ transform: 'translate(0, 0) rotate(0deg)' }, { transform: 'translate(3px, 1px) rotate(1.5deg)' }], { duration: 175, direction: 'alternate', iterations: Infinity }],
    triste:   [[{ transform: 'rotate(0deg)' }, { transform: 'rotate(-1.6deg)' }], { duration: 1600, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }],
  }[tipo];
  if (K) mp.corpoAnim = corpo.animate(...K);
}

// Pulo em arco: amassa na decolagem, sobe, amassa no pouso; a sombra encolhe no alto
function arcoDePulo() {
  if (semMovimento()) return;
  const h = parseFloat($('mp-img').style.height) || 150;
  const alto = Math.round(h * 0.2);
  $('mp-pulo').animate([
    { transform: 'translateY(0) scale(1, 1)', offset: 0 },
    { transform: 'translateY(0) scale(1.08, .9)', offset: 0.12 },
    { transform: `translateY(-${alto}px) scale(.96, 1.05)`, offset: 0.48 },
    { transform: 'translateY(0) scale(1.07, .92)', offset: 0.84 },
    { transform: 'translateY(0) scale(1, 1)', offset: 1 },
  ], { duration: 650, easing: 'ease-out' });
  $('mp-sombra').animate([{ transform: 'translateX(-50%) scale(1)' }, { transform: 'translateX(-50%) scale(.6)', offset: 0.48 }, { transform: 'translateX(-50%) scale(1)' }],
    { duration: 650, easing: 'ease-out' });
}

// Volta ao estado de descanso: dormindo (noite), triste (fome) ou sentado
function voltarAoNormal() {
  if (!mp) return;
  mp.ocupado = false;
  mp.noite = ehNoite();
  if (mp.noite) { mp.estado = 'dormindo'; mp.anim.tocar('dormindo'); movimentoCorpo('dorme'); }
  else if (barrigaDe(mp.pet) < 40) { mp.estado = 'triste'; mp.anim.tocar('triste_fome'); movimentoCorpo('triste'); }
  else { mp.estado = 'parado'; mp.anim.tocar('sentado_girando'); movimentoCorpo('respira'); }
  $('mp-zz').hidden = !mp.noite;
  renderMeuPet();
}

// A cada quadro (dentro do loop do jogo)
function atualizarMeuPet(dt) {
  if (!mp) return;
  mp.anim.atualizar(dt);
  if (mp.estado === 'parado' && mp.anim.anim === 'sentado_girando' && mp.anim.ciclos >= 3)
    mp.anim.tocar('sentado_2', () => { if (mp?.estado === 'parado') voltarAoNormal(); });   // a cada 3 ciclos, sentado_2
  if (mp.estado === 'comendo' && mp.anim.ciclos >= 2) comemorar('feliz');                 // comendo 2 vezes, depois feliz
  if (!mp.ocupado && ehNoite() !== mp.noite) voltarAoNormal();                            // virou noite/dia com a tela aberta
}

function comemorar(anim) {
  mp.estado = anim; mp.ocupado = true;
  movimentoCorpo(null);
  mp.anim.tocar(anim, () => voltarAoNormal());
  arcoDePulo();
}

function falarPet(texto) {
  const b = $('mp-balao');
  b.textContent = texto;
  b.hidden = false;
  clearTimeout(mp.timerBalao);
  mp.timerBalao = setTimeout(() => { b.hidden = true; }, 1800);
}

function particulas(simbolos, n) {
  const caixa = $('mp-particulas');
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'jr-mp-part';
    s.textContent = simbolos[i % simbolos.length];
    s.style.left = 30 + Math.random() * 40 + '%';
    s.style.animationDelay = i * 90 + 'ms';
    caixa.appendChild(s);
    setTimeout(() => s.remove(), 1400 + i * 90);
  }
}

function alimentarPet() {
  if (!mp || mp.ocupado || ehNoite()) return;
  const pet = mp.pet, c = cuidadosDe(pet), hoje = diaLocal();
  if (barrigaDe(pet) >= 90) { falarPet('Estou cheio!'); return; }
  if (doDia(c.refeicoes_dia, hoje) >= REFEICOES_POR_DIA) { falarPet('Já comi duas vezes hoje!'); return; }
  if ((Number(estado.pets.moedas) || 0) < PRECO_REFEICAO) { falarPet(`Faltam moedas… acerte perguntas para ganhar 🪙`); return; }
  estado.pets.moedas -= PRECO_REFEICAO;
  c.ultima_refeicao = Date.now();
  c.refeicoes_dia = { dia: hoje, n: doDia(c.refeicoes_dia, hoje) + 1 };
  const base = `pets/conquistados/${pet}`;
  gravar({ 'pets/moedas': estado.pets.moedas, [`${base}/ultima_refeicao`]: c.ultima_refeicao, [`${base}/refeicoes_dia`]: c.refeicoes_dia });
  atualizarFomeSeguidor();
  renderMeuPet();
  mp.estado = 'comendo'; mp.ocupado = true;
  mp.anim.tocar('comendo');
  movimentoCorpo('come');
  particulas([COMIDA_PET[pet] || '🍖', '✨', COMIDA_PET[pet] || '🍖', '✨'], 6);
  falarPet('Hmm, que delícia!');
  tocar('acerto');
}

function carinhoPet() {
  if (!mp || mp.ocupado || ehNoite()) return;
  const pet = mp.pet, c = cuidadosDe(pet), hoje = diaLocal();
  if (doDia(c.carinhos_dia, hoje) < CARINHOS_POR_DIA) {
    c.lealdade = Math.min(100, (Number(c.lealdade) || 0) + 1);
    c.carinhos_dia = { dia: hoje, n: doDia(c.carinhos_dia, hoje) + 1 };
    const base = `pets/conquistados/${pet}`;
    gravar({ [`${base}/lealdade`]: c.lealdade, [`${base}/carinhos_dia`]: c.carinhos_dia });
    renderMeuPet();
  }
  particulas(['💜', '💛', '💜', '💛'], 5);
  const fc = barrigaDe(pet) >= 40 && falasProntas() && c.lealdade >= (configFalas().lealdade_minima ?? 60) ? montarFala(contextoFalaDe(pet), 'carinho') : null;
  falarPet(barrigaDe(pet) < 40 ? 'Obrigado… mas tô com fome' : fc?.baloes[0]?.texto || 'Gostei!');
  comemorar(c.lealdade >= LEALDADE_CAMBALHOTA ? 'pulo_cambalhota' : 'feliz');
}

// ============================================================
//  JOGAR JUNTO — colegas no mapa, quem está online no mapa geral e reações (sem chat)
// ============================================================
const REACOES = ['👋', '😄', '😂', '😮', '😢', '😡', '🔥', '⭐', '👍', '❤️', '🎉', '💤'];
const INTERVALO_REACAO = 2000;
const TEMPO_INTERP = 250;            // ms para ir até a posição nova de um colega
const ENVIO_MIN_MS = 250;            // no máximo 4 envios de posição por segundo
let pararOuvirMapa = () => {}, pararOuvirTodos = () => {};
const colegas = new Map();           // uid → { reg, el, nome, pet, petImg, sombra, x, y, de, alvo, t0, dir, quadro, tQuadro, reacaoT }
let onlineGeral = {};                // uid → registro (mapa geral)
const envio = { x: null, y: null, t: 0, parado: true };
let ultimaReacao = 0;
const KEY_COLEGAS = 'jr_colegas_ocultos';
let colegasOcultos = false;
try { colegasOcultos = localStorage.getItem(KEY_COLEGAS) === '1'; } catch (_) {}

// Professor, turma TESTE e alunos de teste nunca aparecem para os alunos (no modo teste, todos são de teste)
const colegaVisivel = (uid, r) => !!r && Date.now() - (Number(r.ts) || 0) < VALIDADE_MS &&
  (teste || (!ALUNOS_TESTE.includes(uid) && !/PROFESSOR|TESTE/i.test(uid) && r.turma !== 'TESTE' && !/PROFESSOR|TESTE/i.test(r.apelido || '')));

async function entrarOnline() {
  let apelido = sessao.nome;
  try {
    const s = await get(ref(db, `perfis/${sessao.uid}/apelido_ativo`));
    if (s.exists() && s.val()) { apelido = String(s.val()); apelidoAluno = apelido; }
  } catch (_) {}
  await iniciarOnline({ uid: sessao.uid, teste, dados: {
    apelido, turma: sessao.turma || '', pet: estado.pets?.ativo || null, mapa: 'geral', local: 'geral', x: 0, y: 0, dir: 'frente',
  } });
  if (!$('tela-geral').hidden) ouvirGeral();
}

// ── Mapa da região ──────────────────────────────────────────
function entrarNoMapaOnline(n) {
  pararOuvirTodos(); pararOuvirTodos = () => {};
  limparColegas();
  envio.x = jog.x; envio.y = jog.y; envio.t = performance.now(); envio.parado = true;
  enviarOnline({ mapa: n, local: 'mapa', x: Math.round(jog.x), y: Math.round(jog.y), dir: jog.dir });
  pararOuvirMapa();
  pararOuvirMapa = ouvirMapa(n, (regs) => receberColegas(n, regs));
  $('btn-colegas').hidden = $('btn-reacao').hidden = !onlineAtivo();   // sem online (sem regra/sem internet): sem botões
  $('btn-colegas').classList.toggle('desligado', colegasOcultos);
  $('cena-palco').classList.toggle('sem-colegas', colegasOcultos);
}

function sairDoMapaOnline() {
  pararOuvirMapa(); pararOuvirMapa = () => {};
  limparColegas();
  $('btn-colegas').hidden = $('btn-reacao').hidden = true;
  fecharReacoes();
}

function limparColegas() {
  for (const c of colegas.values()) { c.el.remove(); c.nome.remove(); c.petImg.remove(); c.sombra.remove(); c.balao?.remove(); }
  colegas.clear();
}

function receberColegas(n, regs) {
  if (cena?.tipo !== 'mapa' || cena.n !== n) return;
  const vistos = new Set();
  for (const [uid, r] of Object.entries(regs)) {
    if (r.local !== 'mapa' || !colegaVisivel(uid, r)) continue;
    vistos.add(uid);
    let c = colegas.get(uid);
    if (!c) c = criarColega(uid, r);
    atualizarColega(c, r);
  }
  for (const [uid, c] of colegas) if (!vistos.has(uid)) { c.el.remove(); c.nome.remove(); c.petImg.remove(); c.sombra.remove(); c.balao?.remove(); colegas.delete(uid); }
}

function criarColega(uid, r) {
  const palco = $('cena-palco');
  const mk = (tag, cls) => { const e = document.createElement(tag); e.className = cls; if (tag === 'img') { e.alt = ''; e.draggable = false; } palco.appendChild(e); return e; };
  const sombra = mk('div', 'jr-pet-sombra jr-colega');
  const petImg = mk('img', 'jr-ator jr-pet jr-colega');
  const el = mk('img', 'jr-ator jr-colega jr-colega-jog');
  const nome = mk('div', 'jr-colega-nome jr-colega');
  nome.textContent = r.apelido || '';
  const c = { uid, reg: r, el, nome, petImg, sombra, x: Number(r.x) || 0, y: Number(r.y) || 0, de: null, alvo: null, t0: 0,
    dir: r.dir || 'frente', quadro: 0, tQuadro: 0, reacaoT: Number(r.reacao?.t) || 0, pet: null, seg: new PetSeguidor(petImg, sombra) };
  sombra.hidden = petImg.hidden = true;
  colegas.set(uid, c);
  definirPetColega(c, r.pet);
  c.seg.colocar(c.x, c.y);
  return c;
}

function definirPetColega(c, pet) {
  pet = petValido(pet) ? pet : null;
  if (c.pet === pet) return;
  c.pet = pet;
  if (pet) preCarregarPet(pet);
  c.seg.definir(pet);
  if (pet) c.seg.colocar(c.x, c.y);
}

function atualizarColega(c, r) {
  c.reg = r;
  c.nome.textContent = r.apelido || '';
  definirPetColega(c, r.pet);
  if (r.dir) c.dir = r.dir;
  const nx = Number(r.x) || 0, ny = Number(r.y) || 0;
  if (Math.hypot(nx - c.x, ny - c.y) > 300) { c.x = nx; c.y = ny; c.alvo = null; c.seg.colocar(nx, ny); }   // entrou agora / pulou: sem deslizar
  else if (nx !== c.x || ny !== c.y) { c.de = [c.x, c.y]; c.alvo = [nx, ny]; c.t0 = performance.now(); }
  // reação recente (menos de 3 s) aparece sobre a cabeça
  const t = Number(r.reacao?.t) || 0;
  if (r.reacao?.e && t > c.reacaoT && Date.now() - t < 3000) { c.reacaoT = t; mostrarBalaoReacao(c, r.reacao.e); }
}

// A cada quadro: desliza até a posição recebida, anima o andar, pet segue pelo rastro
function atualizarColegas(dt) {
  if (!colegas.size) return;
  const agora = performance.now();
  const escala = 1 / (cam.s || 1);
  for (const c of colegas.values()) {
    if (Date.now() - (Number(c.reg.ts) || 0) > VALIDADE_MS) { c.el.hidden = c.nome.hidden = true; continue; }
    let andando = false;
    if (c.alvo) {
      const k = Math.min(1, (agora - c.t0) / TEMPO_INTERP);
      c.x = c.de[0] + (c.alvo[0] - c.de[0]) * k;
      c.y = c.de[1] + (c.alvo[1] - c.de[1]) * k;
      andando = true;
      if (k >= 1) c.alvo = null;
    }
    // continua o passo um pouco depois do último ponto (os envios chegam a cada 250 ms)
    if (andando || agora - c.t0 < TEMPO_INTERP + 120) {
      c.tQuadro += dt * 1000;
      if (c.tQuadro >= T_QUADRO) { c.tQuadro = 0; c.quadro = (c.quadro + 1) % 4; }
    } else c.quadro = 0;
    const src = urlQuadro(DIRECOES.includes(c.dir) ? c.dir : 'frente', c.quadro);
    if (c.el.dataset.src !== src) { c.el.src = src; c.el.dataset.src = src; }
    c.el.hidden = c.nome.hidden = false;
    Object.assign(c.el.style, { left: c.x + 'px', top: c.y + 'px', height: ALT_JOGADOR_MAPA + 'px', zIndex: Math.round(c.y) });
    // etiqueta com o apelido: 11 px na tela, qualquer que seja o zoom da câmera
    Object.assign(c.nome.style, { left: c.x + 'px', top: (c.y - ALT_JOGADOR_MAPA - 2) + 'px', fontSize: 11 * escala + 'px', zIndex: 9000 });
    if (c.balao) Object.assign(c.balao.style, { left: c.x + 'px', top: (c.y - ALT_JOGADOR_MAPA - 16 * escala) + 'px', fontSize: 22 * escala + 'px' });
    if (c.pet) c.seg.atualizar(dt, c.x, c.y, VEL, altImagemPet(c.pet), distPet(c.pet));
  }
}

// Envia a própria posição: até 4×/s quando anda mais de 2 px; ao parar, a posição final uma vez
function enviarPosicao() {
  if (cena?.tipo !== 'mapa') return;
  const agora = performance.now();
  const moveu = envio.x === null || Math.hypot(jog.x - envio.x, jog.y - envio.y) > 2;
  const parado = !jog.caminho.length && !vetorEntrada().some(Boolean);
  if (moveu && agora - envio.t >= ENVIO_MIN_MS) {
    envio.x = jog.x; envio.y = jog.y; envio.t = agora; envio.parado = false;
    enviarOnline({ x: Math.round(jog.x), y: Math.round(jog.y), dir: jog.dir });
  } else if (parado && !envio.parado && agora - envio.t >= ENVIO_MIN_MS) {
    envio.parado = true;
    if (jog.x !== envio.x || jog.y !== envio.y) { envio.x = jog.x; envio.y = jog.y; envio.t = agora; enviarOnline({ x: Math.round(jog.x), y: Math.round(jog.y), dir: jog.dir }); }
  }
}

function alternarColegas() {
  colegasOcultos = !colegasOcultos;
  try { localStorage.setItem(KEY_COLEGAS, colegasOcultos ? '1' : '0'); } catch (_) {}
  $('cena-palco').classList.toggle('sem-colegas', colegasOcultos);
  $('btn-colegas').classList.toggle('desligado', colegasOcultos);
  $('btn-colegas').setAttribute('aria-pressed', String(!colegasOcultos));
}

// ── Reações ─────────────────────────────────────────────────
function abrirReacoes() {
  if (performance.now() - ultimaReacao < INTERVALO_REACAO) return;
  $('reacoes').hidden = false;
}
function fecharReacoes() { $('reacoes').hidden = true; }

function reagirCom(e) {
  fecharReacoes();
  if (!REACOES.includes(e) || performance.now() - ultimaReacao < INTERVALO_REACAO) return;
  ultimaReacao = performance.now();
  enviarOnline({ reacao: { e, t: Date.now() } });
  // balão sobre a minha cabeça por 2 s
  const b = $('minha-reacao');
  b.textContent = e;
  b.hidden = false;
  clearTimeout(b._t);
  b._t = setTimeout(() => { b.hidden = true; }, 2000);
  // botão cinza durante o intervalo
  const btn = $('btn-reacao');
  btn.classList.add('espera');
  setTimeout(() => btn.classList.remove('espera'), INTERVALO_REACAO);
}

function posicionarMinhaReacao() {
  const b = $('minha-reacao');
  if (b.hidden || !cena) return;
  const escala = 1 / (cam.s || 1);
  Object.assign(b.style, { left: jog.x + 'px', top: (jog.y - ALT_JOGADOR_MAPA - 16 * escala) + 'px', fontSize: 22 * escala + 'px' });
}

function mostrarBalaoReacao(c, e) {
  if (!c.balao) { c.balao = document.createElement('div'); c.balao.className = 'jr-reacao-balao jr-colega'; $('cena-palco').appendChild(c.balao); }
  c.balao.textContent = e;
  c.balao.hidden = false;
  clearTimeout(c.balaoT);
  c.balaoT = setTimeout(() => { if (c.balao) c.balao.hidden = true; }, 2000);
}

// ── Mapa geral: quem está onde ──────────────────────────────
function ouvirGeral() {
  pararOuvirMapa(); pararOuvirMapa = () => {};
  pararOuvirTodos();
  pararOuvirTodos = ouvirTodos((regs) => { onlineGeral = regs; desenharOnlineGeral(); });
  desenharOnlineGeral();
}

function onlinePorMapa() {
  const por = {};
  for (const [uid, r] of Object.entries(onlineGeral)) {
    if (!colegaVisivel(uid, r) || r.local === 'geral' || !(Number(r.mapa) > 0)) continue;
    (por[Number(r.mapa)] ||= []).push({ uid, ...r });
  }
  return por;
}

const rostoPet = (pet) => petValido(pet) ? `<img src="${quadrosDe(pet, 'sentado_girando')[0]}" alt=""/>` : '<span>🙂</span>';

function desenharOnlineGeral() {
  const cont = $('geral-marcadores');
  cont.querySelectorAll('.jr-marc-online').forEach(e => e.remove());
  const por = onlinePorMapa();
  const total = Object.entries(onlineGeral).filter(([uid, r]) => colegaVisivel(uid, r)).length;
  $('selo-online').hidden = !onlineAtivo();
  $('selo-online').textContent = `🟢 ${total} online`;
  for (const [n, lista] of Object.entries(por)) {
    const reg = D.geral.regioes.find(r => r.mapa === Number(n));
    if (!reg) continue;
    const b = document.createElement('button');
    b.className = 'jr-marc-online';
    b.dataset.mapa = n;
    b.style.left = reg.x / W * 100 + '%';
    b.style.top = reg.y / H * 100 + '%';
    b.setAttribute('aria-label', `${lista.length} colega${lista.length > 1 ? 's' : ''} online no mapa ${n}`);
    b.innerHTML = lista.slice(0, 3).map(r => `<span class="jr-rosto${r.local === 'ginasio' ? ' no-ginasio' : ''}">${rostoPet(r.pet)}</span>`).join('') +
      (lista.length > 3 ? `<span class="jr-rosto-mais">+${lista.length - 3}</span>` : '');
    cont.appendChild(b);
  }
}

function abrirListaOnline(n) {
  const lista = onlinePorMapa()[n] || [];
  const reg = D.geral.regioes.find(r => r.mapa === n);
  $('online-titulo').textContent = `${n}. ${reg?.nome || ''}`;
  $('online-itens').innerHTML = lista.map(r => `
    <li><span class="jr-rosto${r.local === 'ginasio' ? ' no-ginasio' : ''}">${rostoPet(r.pet)}</span>
      <span class="jr-online-nome">${esc(r.apelido || '')}</span>
      <span class="jr-online-det">${esc(r.turma || '')}${petValido(r.pet) ? ' · ' + NOME_PET[r.pet] : ''} · ${r.local === 'ginasio' ? 'no ginásio' : 'no mapa'}</span></li>`).join('')
    || '<li class="jr-online-vazio">Ninguém aqui agora.</li>';
  const pode = mapaDisponivel(n);
  $('online-ir').hidden = !pode;
  $('online-ir').dataset.mapa = n;
  $('online-bloqueado').hidden = pode;
  $('online-lista').hidden = false;
}

// ============================================================
//  O PET CONVERSA — com lealdade ≥ 60, fala no mapa (texto todo em dados/jogo/falas-pets.json)
// ============================================================
const KEY_CALADO = 'jr_pet_calado';
let petCalado = false;
try { petCalado = localStorage.getItem(KEY_CALADO) === '1'; } catch (_) {}
let apelidoAluno = null;   // apelido_ativo do perfil (lido ao entrar no online); senão, o primeiro nome
const conversa = { proximaT: 0, toqueT: 0, falando: false, timer: 0, evento: null, voltou: false, voltouDito: false };

const lealdadeDoAtivo = () => Number(cuidadosDe(estado?.pets?.ativo)?.lealdade) || 0;
const petPodeFalar = () => falasProntas() && !!seguidor?.pet && lealdadeDoAtivo() >= (configFalas().lealdade_minima ?? 60);

// Próximo ginásio: o 1º com líder ainda não vencido, em ordem de mapa, entre os mapas disponíveis
function proximoGinasio() {
  for (let n = 1; n <= NUM_MAPAS; n++) {
    if (!mapaDisponivel(n)) continue;
    for (const G of ['A', 'B']) if (!estado.ginasios[chaveGinasio(n, G)].lider.vencido) return chaveGinasio(n, G);
  }
  return null;
}

// Ginásio já vencido em que o aluno mais errou (ids das respostas: m{mapa}{lado}-…)
function ginasioMaisErrado() {
  const erros = {};
  for (const [id, r] of Object.entries(estado.respostas || {})) {
    const m = /^m(\d+)([AB])-/.exec(id);
    if (!m || !(r?.erros > 0)) continue;
    const chave = chaveGinasio(Number(m[1]), m[2]);
    if (estado.ginasios[chave]?.lider.vencido) erros[chave] = (erros[chave] || 0) + r.erros;
  }
  const top = Object.entries(erros).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : null;
}

const contextoFala = () => contextoFalaDe(estado.pets.ativo);
function contextoFalaDe(pet) {
  const prox = proximoGinasio(), errado = ginasioMaisErrado();
  let est = null;
  if (barrigaDe(pet) < 40) est = 'fome';
  else if (conversa.voltou && !conversa.voltouDito) est = 'voltou';
  return {
    pet, nomePet: NOME_PET[pet], apelido: apelidoAluno || String(sessao.nome || '').split(' ')[0],
    proximo: prox ? { chave: prox, dica: dicaDe(prox) } : null,
    errado: errado ? { chave: errado, dica: dicaDe(errado) } : null,
    sequencia: Number(estado.sequencia?.atual) || 0, agora: new Date(), estado: est,
  };
}

function petFalar(tipoForcado = null) {
  const ctx = contextoFala();
  const fala = montarFala(ctx, tipoForcado);
  if (!fala) return false;
  if (!tipoForcado && ctx.estado === 'voltou') conversa.voltouDito = true;
  mostrarFalaPet(fala.baloes, fala.tipo === 'fome' || tipoForcado === 'fome');
  conversa.proximaT = performance.now() + (configFalas().intervalo_min_s ?? 120) * 1000;
  return true;
}

// Mostra os balões um depois do outro (piada: pergunta → 2,5 s → resposta → risada)
function mostrarFalaPet(baloes, fome = false) {
  pararFalaPet();
  conversa.falando = true;
  let i = 0;
  const el = $('pet-fala');
  const passo = () => {
    const b = baloes[i];
    if (!b || cena?.tipo !== 'mapa') { pararFalaPet(); return; }
    el.textContent = b.texto;
    el.hidden = false;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    posicionarFalaPet();
    if (i === 0) seguidor?.reagir(fome ? 'triste_fome' : 'feliz', fome ? 2000 : 0);
    conversa.timer = setTimeout(() => {
      i++;
      el.hidden = true;
      if (baloes[i]) conversa.timer = setTimeout(passo, baloes[i].espera || 0);
      else pararFalaPet();
    }, b.fixo || duracaoBalao(b.texto));
  };
  passo();
}

function pararFalaPet() {
  clearTimeout(conversa.timer);
  conversa.falando = false;
  $('pet-fala').hidden = true;
}

// Balão sobre a cabeça do pet; se encostar na borda da tela, entra para dentro
function posicionarFalaPet() {
  const el = $('pet-fala');
  if (el.hidden || !seguidor) return;
  posicionarNaTela(el, seguidor.x, seguidor.y - seguidor.altura - 2);
}

// Toque no pet (no mapa): fala na hora; abaixo da lealdade mínima, só "…" ou um coração
function tocouNoPet(p) {
  if (!seguidor?.pet || $('pet').hidden) return false;
  const folga = 14 / (cam.s || 1);   // área de toque um pouco maior que o pet
  const larg = seguidor.altura * 0.45 + folga;
  return Math.abs(p.x - seguidor.x) < larg && p.y > seguidor.y - seguidor.altura - folga && p.y < seguidor.y + folga;
}

function falarPorToque() {
  const agora = performance.now();
  if (agora - conversa.toqueT < 5000) return;
  conversa.toqueT = agora;
  if (petPodeFalar()) { petFalar(); return; }
  mostrarFalaPet([{ texto: Math.random() < 0.5 ? '…' : '💜', espera: 0, fixo: 1500 }]);
}

// A cada quadro no mapa
function atualizarConversa() {
  if (conversa.falando) posicionarFalaPet();
  if (perguntaAberta || transicionando || sobreposicaoAberta()) return;
  if (conversa.evento) {
    // momento-chave (saiu do ginásio): independe do intervalo, mas respeita a lealdade
    const ev = conversa.evento;
    conversa.evento = null;
    if (petPodeFalar()) petFalar(ev);
    return;
  }
  if (petCalado || conversa.falando || !petPodeFalar()) return;
  if (performance.now() < conversa.proximaT) return;
  if ((seguidor.paradoMs || 0) < (configFalas().parado_min_s ?? 3) * 1000) return;
  petFalar();
}

function alternarPetCalado() {
  petCalado = !petCalado;
  try { localStorage.setItem(KEY_CALADO, petCalado ? '1' : '0'); } catch (_) {}
  atualizarBotaoCalado();
}
function atualizarBotaoCalado() {
  const b = $('mp-calado');
  b.textContent = petCalado ? '🔇 Pet calado' : '💬 Pet falando';
  b.setAttribute('aria-pressed', String(petCalado));
  b.classList.toggle('ativo', petCalado);
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
  lealdadeDoDia();
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

// ============================================================
//  REVISÃO DA SEMANA — 5 perguntas do tipo que o aluno mais errou
// ============================================================
const RE_ID = /^m(\d+)([AB])-(treinador[123]|lider|revanche)-(\d+)$/;
const DIAS_REVISAO_OK = 21;

// chave da posição para o modo guiado: na revisão cada pergunta é de um tipo diferente
const chavePosicao = (q) => pg?.modo === 'revisao' ? q.id : q.indice;

// mantém estado.respostas em dia na sessão (para a escolha da revisão não depender de recarregar)
function lembrarResposta(id, campos, errosMais = 0) {
  if (!estado.respostas) estado.respostas = {};
  const r = estado.respostas[id] = { ...(estado.respostas[id] || {}), ...campos };
  if (errosMais) r.erros = (r.erros || 0) + errosMais;
}

// Semana ISO (segunda a domingo), data local: "2026-W41"
function semanaISO(d = new Date()) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  const diaSemana = (t.getDay() + 6) % 7;            // segunda = 0
  t.setDate(t.getDate() - diaSemana + 3);              // quinta-feira desta semana
  const ano = t.getFullYear();
  const primeiraQuinta = new Date(ano, 0, 4, 12);
  const semana = 1 + Math.round(((t - primeiraQuinta) / 864e5 - 3 + ((primeiraQuinta.getDay() + 6) % 7)) / 7);
  return `${ano}-W${String(semana).padStart(2, '0')}`;
}

// Função pura: escolhe até 5 tipos de pergunta { id, mapa, lado, personagem, indice }
function escolherRevisao(respostas, ginasios, agora = Date.now(), sortear01 = Math.random) {
  const tipo = (id) => { const m = RE_ID.exec(id); return m && { id, mapa: +m[1], lado: m[2], personagem: m[3], indice: +m[4] - 1 }; };
  const valido = (t) => t && !(t.mapa === 13 && t.lado === 'B');   // 13 B: perguntas de tabela, não regeneram
  const porGinasio = {};
  const cabe = (t) => (porGinasio[t.mapa + t.lado] || 0) < 2;
  const escolhidos = [];
  const pegar = (t) => { escolhidos.push(t); porGinasio[t.mapa + t.lado] = (porGinasio[t.mapa + t.lado] || 0) + 1; };

  // 1–3: mais erros primeiro; empate → o mais antigo; até 2 por ginásio; fora os acertados na revisão há < 21 dias
  const candidatos = Object.entries(respostas || {})
    .filter(([id, r]) => (r?.erros || 0) > 0 && !(r.revisao_ok && agora - r.revisao_ok < DIAS_REVISAO_OK * 864e5))
    .map(([id, r]) => ({ ...tipo(id), erros: r.erros, ultima: r.ultima || 0 }))
    .filter(t => valido(t))
    .sort((a, b) => (b.erros - a.erros) || (a.ultima - b.ultima));
  for (const t of candidatos) { if (escolhidos.length >= 5) break; if (cabe(t)) pegar(t); }

  // 4: completa com tipos sorteados de ginásios com insígnia
  const comInsignia = Object.keys(ginasios || {}).filter(k => ginasios[k].insignia)
    .map(k => { const m = /^mapa(\d+)-([AB])$/.exec(k); return { mapa: +m[1], lado: m[2] }; })
    .filter(g => !(g.mapa === 13 && g.lado === 'B'));
  const pers = ['treinador1', 'treinador2', 'treinador3', 'lider', 'revanche'];
  for (let tent = 0; escolhidos.length < 5 && comInsignia.length && tent < 300; tent++) {
    const g = comInsignia[Math.floor(sortear01() * comInsignia.length)];
    const personagem = pers[Math.floor(sortear01() * pers.length)];
    const indice = Math.floor(sortear01() * (personagem === 'revanche' ? 3 : 5));
    const t = { id: `m${g.mapa}${g.lado}-${personagem}-${indice + 1}`, mapa: g.mapa, lado: g.lado, personagem, indice };
    if (escolhidos.some(e => e.id === t.id)) continue;
    if (!cabe(t) && tent < 200) continue;   // tenta variar; no fim aceita repetir ginásio
    pegar(t);
  }
  return escolhidos;
}

// o botão só existe para quem tem insígnia ou algum erro registrado
function revisaoVisivel() {
  if (!estado) return false;
  if (Object.values(estado.ginasios).some(g => g.insignia)) return true;
  return Object.values(estado.respostas || {}).some(r => (r?.erros || 0) > 0);
}

function atualizarBotaoRevisao() {
  const b = $('btn-revisao');
  if (!b || !estado) return;
  b.hidden = !carregouProgresso || !revisaoVisivel();
  if (b.hidden) return;
  const feita = !!estado.revisaoSemanal?.[semanaISO()];
  const disponivel = !feita && escolherRevisao(estado.respostas, estado.ginasios).length > 0;
  b.classList.toggle('concluida', feita);
  b.classList.toggle('disponivel', disponivel);
  b.classList.toggle('indisponivel', !feita && !disponivel);
}

function avisoTopo(texto) {
  const b = $('seq-balao');
  b.textContent = texto;
  b.hidden = false;
  clearTimeout(b._t);
  b._t = setTimeout(() => { b.hidden = true; }, 4000);
}

function tocarBotaoRevisao() {
  if (estado.revisaoSemanal?.[semanaISO()]) { avisoTopo('Revisão desta semana concluída! Volte na segunda-feira.'); return; }
  const tipos = escolherRevisao(estado.respostas, estado.ginasios);
  const qs = tipos.map(t => { const q = gerarUma(t.mapa, t.lado, t.personagem, t.indice); return q && { ...q, mapa: t.mapa, lado: t.lado, personagem: t.personagem, indice: t.indice }; }).filter(Boolean);
  if (!qs.length) { avisoTopo('Vença um ginásio para liberar a revisão.'); return; }
  abrirRevisao(qs);
}

function abrirRevisao(qs) {
  pg = {
    modo: 'revisao', semana: semanaISO(),
    fila: qs, total: qs.length, acertos: 0,
    errouIds: new Set(), errosPorIndice: {},
    travado: false, fim: false,
  };
  perguntaAberta = true;
  $('perg-confirma').querySelector('p').textContent = 'Sair da revisão? Você pode tentar de novo depois.';
  falar('Revisão da semana! Vamos ver se agora vai!');
  $('perg-desistir').hidden = false;
  $('perg-confirma').hidden = true;
  $('pergunta').hidden = false;
  atualizarMoedasPergunta();
  renderPergunta();
  $('pergunta').querySelector('.jr-perg-caixa').scrollTop = 0;
}

function concluirRevisao() {
  pg.fim = true;
  const { total, semana } = pg;
  const acertosPrimeira = total - pg.errouIds.size;
  const reg = { data: Date.now(), acertos_primeira: acertosPrimeira, total };
  estado.revisaoSemanal = { ...(estado.revisaoSemanal || {}), [semana]: reg };
  gravar({ [`revisao_semanal/${semana}`]: reg });
  tocar('vitoria');
  darXP(XP_REVISAO);
  falar(`Revisão concluída! Você acertou ${acertosPrimeira} de ${total} de primeira.`);
  $('perg-contador').textContent = `Acertou ${acertosPrimeira} de ${total} de primeira`;
  $('perg-enunciado').hidden = true;
  $('perg-alternativas').hidden = true;
  $('perg-origem').hidden = true;
  $('perg-explica').hidden = true; $('perg-guiado').hidden = true; $('perg-corpo').classList.remove('guiado');
  $('perg-tabela').innerHTML = '';
  $('perg-desistir').hidden = true;
  $('perg-continuar').textContent = 'Continuar';
  $('perg-continuar').hidden = false;
  pg.aoContinuar = fecharPergunta;
}

function abrirMapaGeral() {
  atualizarSelo();
  atualizarFaixaMeta();
  avisarMetaBatida();
  atualizarBotaoRevisao();
  cena = null;
  esconderBalao();
  sairDoMapaOnline();
  pararFalaPet();
  enviarOnline({ mapa: 'geral', local: 'geral' });
  if (onlineAtivo()) ouvirGeral();
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
  desenharOnlineGeral();
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
  if (deitado()) {
    // Celular/tablet (deitado ou girado): preenche a largura e segue o jogador nos dois eixos
    // (um pouco abaixo do centro, para o personagem não ficar atrás do HUD do topo)
    cam.s = Math.max(vw / W, vh / H);
    cam.tx = clamp(vw / 2 - jog.x * cam.s, vw - W * cam.s, 0);
    cam.ty = clamp(vh * 0.55 - jog.y * cam.s, vh - H * cam.s, 0);
  } else if (vh > vw) {
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
  if (girado()) {   // o #cena-vp ocupa todo o jogo girado: basta converter o ponto
    const p = pontoNoJogo(cx, cy);
    return { x: (p.x - cam.tx) / cam.s, y: (p.y - cam.ty) / cam.s };
  }
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
  seguidor?.colocar(x, y);
}

function desenharJogador() {
  const el = $('jogador');
  const src = urlQuadro(jog.dir, jog.quadro);
  if (el.dataset.src !== src) { el.src = src; el.dataset.src = src; }
  el.style.left = jog.x + 'px';
  el.style.top = jog.y + 'px';
  el.style.height = (cena?.tipo === 'mapa' ? ALT_JOGADOR_MAPA : ALT_JOGADOR) + 'px';
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
  perguntaAberta || !$('estojo').hidden || !$('cartao').hidden || !$('insignia-ganha').hidden || !$('pet-escolha').hidden || !$('pet-colecao').hidden || !$('pet-levar').hidden || !$('meu-pet').hidden || !$('reacoes').hidden || !$('online-lista').hidden;

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
      // Bordas (trilha e quinas de casas, árvores…) são em degraus de 4 px: desvia até 16 px
      // na perpendicular para contornar a quina em vez de enroscar
      const horiz = Math.abs(dx) >= Math.abs(dy);
      const p = horiz ? dx : dy;
      fora: for (let k = 2; k <= 16; k += 2) {
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
    const d = deltaNoJogo(e.clientX - (r.left + raio), e.clientY - (r.top + raio));   // girado: gira o deslocamento
    let x = d.x / raio, y = d.y / raio;
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
let fomeT = 0;
function loop(t) {
  const dt = Math.min(0.05, (t - (ultimoT || t)) / 1000);
  ultimoT = t;
  atualizarMeuPet(dt);
  if ((fomeT += dt) > 10) { fomeT = 0; atualizarFomeSeguidor(); }   // a barriga cai devagar: confere a cada 10 s
  if (cena && !perguntaAberta && !transicionando) {
    const [vx, vy] = vetorEntrada();
    if (!vx && !vy) soltouDesdeTroca = true;
    const direto = (vx || vy) && moverDireto(dt, vx, vy);
    if (!direto) passo(dt);
    const e = cena.tipo === 'mapa' ? 1 : ESCALA_GINASIO;
    const pet = seguidor?.pet;
    seguidor?.atualizar(dt, jog.x, jog.y, VEL, altImagemPet(pet) * e, distPet(pet) * e, e);
    petGin?.anim.atualizar(dt);
    if (cena.tipo === 'mapa') { atualizarColegas(dt); enviarPosicao(); posicionarMinhaReacao(); atualizarConversa(); }
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
  atualizarBotaoPet();
  entrarNoMapaOnline(n);
  conversa.proximaT = performance.now() + 8000;   // 1ª fala no mapa pode vir depois de 8 s
  pedirPetSeFaltar();
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
  if (tocouNoPet(p)) { falarPorToque(); return; }   // tocar no pet: ele fala (não anda até lá)
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
  if (petGin && !petGin.levado && Math.abs(jog.x - petGin.xParada) < 30) return { id: 'pet-gin', texto: '🐾 Levar comigo', acao: abrirLevarPet };
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
  sairDoMapaOnline();
  pararFalaPet();
  enviarOnline({ mapa: n, local: 'ginasio' });   // no ginásio os colegas não veem você
  petGin = null;
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
  mostrarPetGinasio();
  atualizarBotaoPet();
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
  if (petGin && !petGin.levado && e.target === petGin.img) { destinoEspecial = null; andarNoTapete(petGin.xParada); return; }
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
  const pos = cena.cfg[p];
  avisarEm(texto, pos.x, pos.y - (p === 'lider' ? ALT_LIDER : ALT_TREINADOR) - 6);
}

function avisarEm(texto, x, y) {
  const el = $('cena-aviso');
  el.textContent = texto;
  el.hidden = false;
  posicionarNaTela(el, x, y);
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
    seguidor?.reagir('pulo_cambalhota');
    mostrarAvisoSequencia();
    surgirPetSePendente();
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
    const { x: dx, y: dy } = deltaNoJogo((b.left + b.width / 2) - (a.left + a.width / 2), (b.top + b.height / 2) - (a.top + a.height / 2));
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
  $('perg-confirma').querySelector('p').textContent = 'Fugir da batalha? Você vai recomeçar este treinador.';
  falar(p === 'lider' ? pers.falas.abertura : pers.fala);
  $('perg-desistir').hidden = false;
  $('perg-confirma').hidden = true;
  $('pergunta').hidden = false;
  atualizarMoedasPergunta();
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
  // Revisão da semana: busto do líder e nome do ginásio de onde veio a pergunta
  const origem = $('perg-origem');
  origem.hidden = pg.modo !== 'revisao';
  if (pg.modo === 'revisao') {
    const gin = D.questoes[q.mapa].ginasios[q.lado];
    $('perg-busto').src = `${IMG}/bustos/${gin.personagens.lider.sprite}.webp`;
    origem.textContent = `${gin.nome} · ${gin.conteudo}`;
  }
  // Modo guiado: a posição já teve 2+ erros nesta sessão → dica do ginásio e uma alternativa errada a menos
  const guiado = (pg.errosPorIndice[chavePosicao(q)] || 0) >= 2;
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
    const agora = Date.now();
    const patch = { [`respostas/${q.id}/acertou`]: true, [`respostas/${q.id}/ultima`]: agora };
    // revisão: acertou de primeira → sai da lista de revisão por 3 semanas
    if (pg.modo === 'revisao' && !pg.errouIds.has(q.id)) patch[`respostas/${q.id}/revisao_ok`] = agora;
    gravar(patch);
    lembrarResposta(q.id, { acertou: true, ultima: agora, ...(patch[`respostas/${q.id}/revisao_ok`] ? { revisao_ok: agora } : {}) });
    pg.fila.shift();
    pg.acertos++;
    ganharMoeda();
    falar(sortear(D.falas.acerto));
    setTimeout(() => { if (!pg) return; pg.fila.length ? renderPergunta() : vencer(); }, 1100);
  } else {
    btn.classList.add('errada');
    tocar('erro');
    botoes.find(b => b.dataset.v === certa)?.classList.add('certa');
    // as outras alternativas somem para dar espaço ao "Como resolver"
    botoes.forEach(b => { if (b !== btn && b.dataset.v !== certa) b.hidden = true; });
    pg.errosPorIndice[chavePosicao(q)] = (pg.errosPorIndice[chavePosicao(q)] || 0) + 1;
    pg.errouIds.add(q.id);
    gravar({ [`respostas/${q.id}/ultima`]: Date.now() }, q.id);   // erros += 1
    lembrarResposta(q.id, { ultima: Date.now() }, 1);
    // volta para o fim da fila com outros números (no Mapa 13 B, gerarUma dá null: repete a mesma)
    pg.fila.shift();
    const nova = pg.modo === 'revisao'
      ? gerarUma(q.mapa, q.lado, q.personagem, q.indice)
      : gerarUma(pg.mapa, pg.G, pg.p, q.indice);
    pg.fila.push(nova ? { ...nova, indice: q.indice, mapa: q.mapa, lado: q.lado, personagem: q.personagem } : q);
    falar(sortear(D.falas.erro).replace('{resposta}', certa));
    mostrarExplicacao(q, !!nova);   // explicação da pergunta que o aluno ERROU, não da nova
    $('perg-continuar').textContent = 'Continuar';
    $('perg-continuar').hidden = false;
    pg.aoContinuar = renderPergunta;
  }
}

function vencer() {
  if (pg.modo === 'revisao') { concluirRevisao(); return; }
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
  if (p === 'lider' || p === 'revanche') conversa.evento = 'venceu';   // o pet comenta ao sair do ginásio
  if (p === 'lider' && primeiraVez && petDoGinasio(chave)) petSurgir = chave;
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
  // meta da turma: nunca no modo teste nem para alunos de teste (somarTurma também recusa TESTE e turma vazia)
  if (ganhou && !teste && carregouProgresso && sessao.turma && !ALUNOS_TESTE.includes(sessao.uid)) {
    const campo = ganhou === 'normal' ? 'insignias' : 'douradas';
    somarTurma(sessao.turma, campo);
    const p0 = placarTurmas[sessao.turma] || {};
    placarTurmas[sessao.turma] = { ...p0, [campo]: (Number(p0[campo]) || 0) + 1 };   // barra atualiza na hora
  }

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
    else { seguidor?.reagir('feliz'); mostrarAvisoSequencia(); surgirPetSePendente(); }
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
    pg.aoContinuar = () => { fecharPergunta(); seguidor?.reagir('triste_fome', 2000); };
    if (conversa.evento !== 'venceu') conversa.evento = 'perdeu';
    return;
  }
  const fugiuDeBatalha = pg.modo !== 'revisao';
  fecharPergunta();
  if (fugiuDeBatalha) { seguidor?.reagir('triste_fome', 2000); if (conversa.evento !== 'venceu') conversa.evento = 'perdeu'; }
}

function fecharPergunta() {
  $('pergunta').hidden = true;
  $('perg-confirma').hidden = true;
  pg = null;
  perguntaAberta = false;
  $('tela-cena').classList.remove('jr-com-pergunta');
  ultimoT = 0;
  if (cena?.tipo === 'interior') atualizarNpcs();
  else if (!$('tela-geral').hidden) atualizarBotaoRevisao();
}

// ============================================================
//  3.5 ESTOJO DE INSÍGNIAS
// ============================================================
function abrirEstojo() {
  renderPlacar();
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

  $('btn-sair-jogo').addEventListener('click', sairDoJogo);   // sai da tela cheia antes, se tiver entrado
  $('btn-insignias').addEventListener('click', abrirEstojo);
  $('faixa-meta').addEventListener('click', () => {
    abrirEstojo();
    requestAnimationFrame(() => $('estojo-placar').scrollIntoView({ block: 'start' }));
  });
  $('selo-seq').addEventListener('click', (e) => { e.stopPropagation(); mostrarBalaoSequencia(); });
  $('btn-revisao').addEventListener('click', (e) => { e.stopPropagation(); tocarBotaoRevisao(); });
  // imagem do botão (opcional): se existir, troca o emoji por ela
  const imgRev = $('btn-revisao').querySelector('img');
  imgRev.addEventListener('load', () => $('btn-revisao').classList.add('com-img'));
  imgRev.addEventListener('error', () => imgRev.remove());
  imgRev.src = `${IMG}/ui/botao-revisao.webp`;
  document.addEventListener('click', (e) => { if (!e.target.closest('#selo-seq, #btn-revisao')) $('seq-balao').hidden = true; });
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

  $('pet-opcoes').addEventListener('click', (e) => { const b = e.target.closest('[data-pet]'); if (b) escolherPet(b.dataset.pet); });
  $('btn-trocar-pet').addEventListener('click', () => { $('estojo').hidden = true; abrirColecao(); });
  $('btn-pet').addEventListener('click', abrirMeuPet);
  $('btn-colegas').addEventListener('click', alternarColegas);
  $('btn-reacao').addEventListener('click', abrirReacoes);
  $('reacoes').addEventListener('click', (e) => { const b = e.target.closest('[data-e]'); if (b) reagirCom(b.dataset.e); else if (!e.target.closest('.jr-reacoes-roda')) fecharReacoes(); });
  $('reacoes-roda').innerHTML = REACOES.map((e, i) => `<button class="jr-reacao" data-e="${e}" style="--i:${i}" aria-label="Reação ${e}">${e}</button>`).join('');
  window.addEventListener('keydown', (e) => { if (e.code === 'Escape') { if (!$('reacoes').hidden) fecharReacoes(); else if (!$('online-lista').hidden) $('online-lista').hidden = true; } });
  $('geral-marcadores').addEventListener('click', (e) => { const b = e.target.closest('.jr-marc-online'); if (b) { e.stopPropagation(); abrirListaOnline(Number(b.dataset.mapa)); } }, true);
  $('online-fechar').addEventListener('click', () => { $('online-lista').hidden = true; });
  $('online-ir').addEventListener('click', () => { const n = Number($('online-ir').dataset.mapa); $('online-lista').hidden = true; if (mapaDisponivel(n)) { tocar('porta'); abrirMapa(n, 'entrada'); } });
  $('mp-fechar').addEventListener('click', fecharMeuPet);
  $('mp-trocar').addEventListener('click', () => { fecharMeuPet(); colecaoDoMeuPet = true; abrirColecao(); });
  $('mp-alimentar').addEventListener('click', alimentarPet);
  $('mp-carinho').addEventListener('click', carinhoPet);
  $('mp-calado').addEventListener('click', alternarPetCalado);
  $('pet-fala').addEventListener('click', pararFalaPet);   // tocar no balão fecha
  atualizarBotaoCalado();
  $('mp-palco').addEventListener('click', carinhoPet);   // tocar no pet = carinho
  $('colecao-opcoes').addEventListener('click', (e) => { const b = e.target.closest('[data-pet]'); if (b) trocarPetAtivo(b.dataset.pet); });
  $('colecao-fechar').addEventListener('click', () => { $('pet-colecao').hidden = true; if (colecaoDoMeuPet) { colecaoDoMeuPet = false; abrirMeuPet(); } });
  $('levar-usar').addEventListener('click', () => conquistarPet(true));
  $('levar-guardar').addEventListener('click', () => conquistarPet(false));
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

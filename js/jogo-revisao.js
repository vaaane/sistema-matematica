// ============================================================
//  Jogo de Revisão — motor do jogo (Parte A) + progresso no Firebase (Parte B)
//  Real: jogo_revisao/{uid}   ·   Modo teste: modo_teste_historico/{uid}/jogo_revisao
// ============================================================
import { isModoTeste, getSession } from '/js/auth.js';
import { db } from '/js/firebase-config.js';
import { ref, get, update, push, set, remove, increment, onValue, runTransaction, onDisconnect, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { adicionarXP } from '/js/db.js';
import { bimestreAtual, ALUNOS_TESTE, bimestreJogos, pathTabuadaRanking, pathEscaladaRanking, pathTabuadaNiveis, pathTabuadaNegNiveis, pathEscaladaNiveis } from '/js/constants.js';
import { gerarQuestoes, gerarUma } from '/js/jogo-revisao/geradores.js';
import { tocar, somLigado, alternarSom } from '/js/jogo-revisao/sons.js';
import { definirPausas, definirBarriga, barrigaDoPet, barrigaAntiga, faixaBarriga, rotuloLealdade, lealdadeComQueda, doDia,
  CARINHOS_POR_DIA, LEALDADE_INICIAL, LEALDADE_DIA, LEALDADE_CAMBALHOTA } from '/js/jogo-revisao/cuidados.js';
import { definirLoja, definirPeixes, lojaPronta, cfgLoja, comidas, tintas, efeitos, tinta, tintaAnimada, icone, efeito, itemDaBolsa, idDoPeixe, ehFavorita, semanaDe,
  motivoNaoCome, enche, barrigaCheia, somarLealdade, nivelAmizade, validarNomePet } from '/js/jogo-revisao/loja.js';
import { definirPesca, pescaPronta, cfgPesca, pontosDoMapa, spritePesca, pontaVara, sortearPeixe, entre, inteiroEntre,
  semanaPesca, semanaAnterior, criarBarrinha, passoBarrinha } from '/js/jogo-revisao/pesca.js';
import { PETS, NOME_PET, carregarSprites, petValido, quadrosDe, tamanhoQuadro, tamanhoBusto, temBusto, bustoPet, preCarregarPet, PetSeguidor, PetParado,
  temAnim, formaAdulta, formaValida, sentadoNoQuadro, sortearOcioso } from '/js/jogo-revisao/pets.js';
import { iniciarOnline, enviarOnline, sairOnline, ouvirMapa, ouvirTodos, onlineAtivo, VALIDADE_MS } from '/js/jogo-revisao/online.js';
import { definirPedidos, pedidosProntos, cfgPedidos, pedidoDisponivel, moedasDoPedido, limiteDoDiaAtingido, dicaPedido, lerResposta } from '/js/jogo-revisao/pedidos.js';
import { definirBatalhas, batalhasProntas, cfgBatalha, treinadores, treinador, tiposDeConta, gerarConta, vidaExtraLealdade, desafioDe, situacao, forca, dano, premios, depoisDaBatalha } from '/js/jogo-revisao/batalha.js';
import { definirFalas, falasProntas, configFalas, dicaDe, montarFala, duracaoBalao, fraseDe, configAjuda, frasesFaro } from '/js/jogo-revisao/conversa.js';
import { definirPraca, pracaPronta, cfgPraca, cfgDesafio, frasesPraca, temaDoDesafio, vencedorDaRodada, placarDe, resultadoFinal, vale, contarDesafio,
  premioDesafio, ordenarRanking } from '/js/jogo-revisao/praca.js';
import { codigoValido, premioDoPodio, pontosDaResposta, TEMPO_RODADA_MS } from '/js/jogo-revisao/aovivo.js';
import { baseAoVivo, criarSala, entrarNaSala, sairDaSala, responder as responderNaSala, ouvirSala, ouvirConviteTurma, Anfitriao, placar } from '/js/jogo-revisao/aovivo-sala.js';
import { notaJogoRevisao, formatarNota, NOTA_MAX, PESO_INSIGNIAS, PESO_DOURADAS } from '/js/jogo-revisao/nota.js';
import { configurarPrograme, ligarBotoesPrograme, abrirTela as abrirTelaPrograme, fecharTela as fecharTelaPrograme, mostrarCorrida, mensagemCorrida, mostrarCartao as cartaoPrograme,
  programaParaTexto, programaDeTexto, caixaDoQuadro } from '/js/jogo-revisao/programe.js';
import { faseDoDia, faseDaCorrida, resultadoCorrida } from '/js/jogo-revisao/programe-logica.js';

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
// Atores nos mapas da região (personagem, colegas, pessoas e pets): × ESCALA_ATORES sobre o tamanho base (personagem 55).
// Distâncias do pet, toque nas pessoas, balões e ícones acompanham. Andar e trilhas não mudam; ginásios têm tamanhos próprios.
const ESCALA_ATORES = 1.25;
const ALT_JOGADOR_MAPA = 55 * ESCALA_ATORES;   // nos mapas da cidade o personagem é menor (nos ginásios continua 110)
// Tamanho do pet na cena (altura do quadro, em px do cenário 1376×768; a largura segue a proporção do sprites.json).
// Não depende do tamanho do arquivo: trocar a resolução das imagens não muda o tamanho na tela.
// Altura do pet SENTADO no mapa, em px na escala base (personagem = 55; no mapa tudo × ESCALA_ATORES)
const ALT_PET = {
  elefante: 36, gato: 30, gaviao: 30, axolote: 30, tigre: 30,
  unicornio: 40, dragao_azul: 40,
  dragao_vermelho: 50,
};
// Evolução: cada fase é 15% maior que a anterior (altura do desenho SENTADO, não do quadro). Pet novo que evoluir:
// ALT_PET[adulto] = ALT_PET[filhote] × CRESCE_EVOLUCAO (e o mesmo em DIST_PET, logo abaixo)
const CRESCE_EVOLUCAO = 1.15;
ALT_PET.dragao_azul_adulto = ALT_PET.dragao_azul * CRESCE_EVOLUCAO;
ALT_PET.dragao_vermelho_adulto = ALT_PET.dragao_vermelho * CRESCE_EVOLUCAO;
const ALT_PET_PADRAO = 30;   // pet que não estiver na tabela
const altPet = (pet) => ALT_PET[pet] ?? ALT_PET_PADRAO;
// O quadro (sprites.json: tamanho_quadro, 898 × 704 nos filhotes e 1402 × 801 nos adultos) tem folga em cima para os
// pulos: sentado, o pet ocupa 604 px da altura (sentado_altura). Altura da IMAGEM para o pet sentado ficar com a altura da tabela:
const altImagemPet = (pet) => altPet(pet) / sentadoNoQuadro(pet);
// Quanto a IMAGEM da forma é maior que a do filhote para o desenho sentado ficar CRESCE_EVOLUCAO maior
// (adulto: 1,15 × 801/704 ≈ 1,31, porque o quadro do adulto tem mais folga em cima)
const fatorForma = (pet, forma) => (forma && forma !== pet ? altImagemPet(forma) / altImagemPet(pet) : 1);
// Imagem pequena numa caixa feita para o filhote (coleção, HUD, chips, cartões): o quadro do adulto é mais largo
// (asas). O CSS de img[data-adulto] usa a proporção do filhote, recorta as sobras dos lados e aumenta a partir dos pés.
const attrForma = (pet, forma) => (forma && forma !== pet ? ` data-adulto style="--cresce-img:${fatorForma(pet, forma).toFixed(3)}"` : '');
// Ícone pequeno do pet (círculo): o busto (cabeça inteira), ou o pet sentado se não tiver busto. Os bustos têm enquadramentos
// diferentes (nos filhotes a cabeça fica embaixo de uma imagem alta), então medimos o desenho e centralizamos a cabeça no círculo.
const srcIcone = (forma) => (temBusto(forma) ? bustoPet(forma) : quadrosDe(forma, 'sentado_girando')[0]);
async function encaixarIcone(img) {
  const src = img.getAttribute('src');
  const c = src && await caixaDoQuadro(src);
  if (!c || !img.isConnected || img.getAttribute('src') !== src) return;
  const bw = c.x1 - c.x0, bh = c.y1 - c.y0, ar = c.h / c.w, W = 94 / Math.max(bw, bh * ar);   // largura da imagem em % do círculo
  Object.assign(img.style, { position: 'absolute', width: W + '%', height: 'auto', maxWidth: 'none', transform: 'none', objectFit: 'contain',
    left: (50 - (c.x0 + bw / 2) * W) + '%', top: (50 - (c.y0 + bh / 2) * W * ar) + '%' });
}
// todo <img data-icone-pet> que aparecer na tela é encaixado sozinho
new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1)
  (n.matches('img[data-icone-pet]') ? [n] : n.querySelectorAll('img[data-icone-pet]')).forEach(encaixarIcone); })
  .observe(document.getElementById('jr-app') || document.body, { childList: true, subtree: true });

// ============================================================
//  MESTRE DA REVISÃO (as 26 insígnias) e LENDA DA REVISÃO (as 26 douradas) — PROMPT-57
//  Fica no estado do aluno (mestre/lenda: { data }) e é publicado no resumo do mural (jogo_revisao_praca/insignias/{uid}:
//  m, l) e no online (titulo: 1 mestre, 2 lenda). Os colegas veem 👑/🌟 e o nome dourado. Nunca para PROFESSOR/TESTE/ALUNOS_TESTE.
// ============================================================
let festaPendente = null;
const TITULOS = new Map();   // uid → 1 (mestre) | 2 (lenda), lido do resumo do mural
const NOME_TITULO = ['', '👑 Mestre da Revisão', '🌟 Lenda da Revisão'];
const meuTitulo = () => (estado?.lenda ? 2 : estado?.mestre ? 1 : 0);
const contaEscondida = (uid, nome) => ALUNOS_TESTE.includes(uid) || /PROFESSOR|TESTE/i.test(`${uid} ${nome || ''}`);
function tituloDe(uid, r) {
  if (!uid || (!teste && contaEscondida(uid, r?.apelido || r?.nome))) return 0;
  if (uid === sessao?.uid) return meuTitulo();
  return Math.max(Number(r?.titulo) || 0, TITULOS.get(uid) || 0);
}
const prefixoTitulo = (uid, r) => ['', '👑 ', '🌟 '][tituloDe(uid, r)];
// nome (texto) → HTML com 👑/🌟 e dourado para quem é mestre/lenda
function nomeT(uid, nome, r) {
  const t = tituloDe(uid, r);
  return t ? `<span class="jr-nome-${t === 2 ? 'lenda' : 'mestre'}">${t === 2 ? '🌟' : '👑'} ${esc(nome)}</span>` : esc(nome);
}
function pintarNomeColega(el, uid, r, extra) {
  const t = tituloDe(uid, r);
  el.textContent = prefixoTitulo(uid, r) + rotuloColega(uid, r) + extra;
  el.classList.toggle('mestre', t === 1); el.classList.toggle('lenda', t === 2);
}
function registrarTitulos(todos) {
  const total = NUM_MAPAS * 2;
  for (const [uid, r] of Object.entries(todos || {})) {
    const n = Number(r?.n) || 0, d = Number(r?.d) || 0;
    if (n >= total) TITULOS.set(uid, d >= total ? 2 : 1); else TITULOS.delete(uid);
  }
}
async function carregarTitulos() {
  try { registrarTitulos(await lerNo(`${basePraca()}/insignias`)); } catch (e) { console.warn('[jogo-revisao] títulos indisponíveis', e?.code || e); }
}
// Conferido ao ganhar insígnia e ao abrir o jogo: grava uma vez só e devolve 'mestre' | 'lenda' (para a festa) ou null
function verificarMestre() {
  if (!carregouProgresso || ehProfessora()) return null;
  const { conquistadas, douradas, total } = contarInsignias();
  let festa = null;
  if (conquistadas >= total && !estado.mestre) { estado.mestre = { data: Date.now() }; gravar({ mestre: estado.mestre }); festa = 'mestre'; }
  if (douradas >= total && estado.mestre && !estado.lenda) { estado.lenda = { data: Date.now() }; gravar({ lenda: estado.lenda }); festa = 'lenda'; }
  if (festa) { publicarResumoInsignias(); enviarOnline({ titulo: meuTitulo() }); if (!$('tela-geral').hidden) desenharMarcadores(); }
  return festa;
}
// Festa em tela cheia: confete, o pet comemorando grande e o personagem
function mostrarFestaMestre(tipo) {
  const el = $('festa-mestre');
  const lenda = tipo === 'lenda';
  $('fm-tit').textContent = lenda ? '🌟 Você conquistou TODAS as insígnias douradas!' : '🏆 Você conquistou TODAS as insígnias!';
  $('fm-sub').innerHTML = `Agora você é <b>${lenda ? 'Lenda da Revisão' : 'Mestre da Revisão'}</b>`;
  const pers = $('fm-pers');
  pers.onerror = () => { pers.onerror = null; pers.src = urlQuadro('frente', -1); };
  pers.src = urlComemorando();
  const pet = estado.pets?.ativo, forma = pet && formaDe(pet), img = $('fm-pet');
  clearInterval(mostrarFestaMestre.anim);
  img.hidden = !forma;
  if (forma) {
    aplicarVisualPet(img, pet);
    const anims = forma !== pet ? ['animado', 'orgulhoso', 'rugido'] : temAnim(forma, 'pulo_cambalhota') ? ['pulo_cambalhota', 'feliz'] : ['feliz'];
    const seq = anims.flatMap(a => { const q = quadrosDe(forma, a); return Array.from({ length: Math.max(q.length, 5) }, (_, i) => q[i % q.length]); });
    const fim = quadrosDe(forma, anims[anims.length - 1]);
    let i = 0;
    img.src = seq[0];
    if (!semMovimento()) mostrarFestaMestre.anim = setInterval(() => { i++; img.src = i < seq.length ? seq[i] : fim[(i - seq.length) % fim.length]; }, 190);
  }
  const conf = $('fm-confete');
  conf.innerHTML = '';
  if (!semMovimento()) for (let k = 0; k < 40; k++) {
    const s = document.createElement('span');
    s.textContent = ['🎉', '✨', '⭐', '🎊', '🏆', lenda ? '🌟' : '👑'][k % 6];
    s.style.left = Math.random() * 100 + '%';
    s.style.animationDelay = (Math.random() * 1.8).toFixed(2) + 's';
    s.style.animationDuration = (2.2 + Math.random() * 1.6).toFixed(2) + 's';
    conf.appendChild(s);
  }
  tocar('vitoria');
  el.hidden = false;
}
function fecharFestaMestre() {
  $('festa-mestre').hidden = true;
  clearInterval(mostrarFestaMestre.anim);
}
// Troféu do mapa geral: brilho por cima do troféu desenhado (mapa-geral.json → trofeu: { x, y, r })
function trofeuHtml() {
  const t = D.geral.trofeu;
  if (!t) return '';
  return `<button class="jr-trofeu ${estado.mestre ? 'forte' : 'fraco'}" data-trofeu="1" aria-label="Troféu da Revisão"
    style="left:${t.x / W * 100}%;top:${t.y / H * 100}%;width:${(2 * t.r) / W * 100}%"><i></i><b>✦</b><b>✦</b><b>✦</b></button>`;
}
function tocarTrofeu() {
  tocar('clique');
  if (estado.mestre) { abrirHallMestres(); return; }
  const { conquistadas, total } = contarInsignias(), f = total - conquistadas;
  avisoPet(`🏆 Conquiste as ${total} insígnias para ganhar o troféu! Falta${f === 1 ? '' : 'm'} ${f}.`);
}
function verMeuTrofeu() {
  fecharFestaMestre();
  const mostra = () => {
    const t = D.geral.trofeu, sc = $('geral-scroll'), palco = $('geral-palco');
    if (t) {
      sc.scrollTo({ left: t.x / W * palco.clientWidth - sc.clientWidth / 2, top: palco.offsetTop + t.y / H * palco.clientHeight - sc.clientHeight / 2, behavior: semMovimento() ? 'auto' : 'smooth' });
      const b = document.querySelector('.jr-trofeu');
      b?.classList.add('destaque');
      setTimeout(() => b?.classList.remove('destaque'), 2600);
    }
    setTimeout(abrirHallMestres, 1400);
  };
  if ($('tela-geral').hidden) { if (perguntaAberta) fecharPergunta(); transicao(() => { abrirMapaGeral(); setTimeout(mostra, 300); }); }
  else mostra();
}
// Hall dos Mestres: os alunos da turma que terminaram, com a data, em ordem de quem terminou primeiro
async function abrirHallMestres() {
  const el = $('hall-mestres'), ul = $('hm-lista');
  $('hm-turma').textContent = sessao.turma && !/TESTE/i.test(sessao.turma) ? `Turma ${sessao.turma}` : '';
  ul.innerHTML = '<li class="ml-vazio">Carregando…</li>';
  el.hidden = false;
  let todos = {};
  try { todos = await lerNo(`${basePraca()}/insignias`); registrarTitulos(todos); }
  catch (e) { ul.innerHTML = '<li class="ml-vazio">Não deu para carregar agora.</li>'; return; }
  const total = NUM_MAPAS * 2;
  const lista = Object.entries(todos)
    .filter(([uid, r]) => (Number(r?.n) || 0) >= total && (teste || visivelNoMural(uid, r)) && (r.turma || '') === (sessao.turma || ''))
    .map(([uid, r]) => ({ uid, nome: nomeVisivel(r.nome) || 'Aluno', data: Number(r.m) || Number(r.ts) || 0 }));
  if (estado.mestre && !lista.some(r => r.uid === sessao.uid) && (teste || entraNoRanking())) lista.push({ uid: sessao.uid, nome: nomeRanking(), data: estado.mestre.data });
  lista.sort((a, b) => a.data - b.data);
  const dataBR = (t) => (t ? new Date(t).toLocaleDateString('pt-BR') : '');
  ul.innerHTML = lista.map((r, i) => `<li class="${r.uid === sessao.uid ? 'eu' : ''}"><span class="pr-pos">${i + 1}º</span>
    <span class="pr-nome">${nomeT(r.uid, r.nome)}</span><b>${dataBR(r.data)}</b></li>`).join('')
    || '<li class="ml-vazio">Ninguém da turma terminou ainda. Seja o primeiro! 🏆</li>';
}

function marcarForma(img, pet, forma) {
  const adulto = !!forma && forma !== pet;
  img.toggleAttribute('data-adulto', adulto);
  if (adulto) img.style.setProperty('--cresce-img', fatorForma(pet, forma).toFixed(3)); else img.style.removeProperty('--cresce-img');
}
// Distância normal do pet atrás do personagem (ao longo do rastro), em px na escala base (× ESCALA_ATORES no mapa).
// Parado, o pet chega a 55% disso; acima de +10 anda 1,3× mais rápido; acima de +62 corre (pets.js).
const DIST_PET = {
  elefante: 36, gato: 36, gaviao: 36, axolote: 36, tigre: 36,
  unicornio: 55, dragao_azul: 55, dragao_vermelho: 55,
};
DIST_PET.dragao_azul_adulto = DIST_PET.dragao_azul * CRESCE_EVOLUCAO;
DIST_PET.dragao_vermelho_adulto = DIST_PET.dragao_vermelho * CRESCE_EVOLUCAO;
const DIST_PET_PADRAO = 36;
const distPet = (pet) => DIST_PET[pet] ?? DIST_PET_PADRAO;
// no ginásio tudo é o dobro da escala base (o personagem tem ALT_JOGADOR = 110 em vez de 55)
const ESCALA_GINASIO = ALT_JOGADOR / 55;
const DIST_PORTA = 30;               // encostar na porta/saída andando pelas setas ou joystick
const DIST_TOQUE = 60;               // toque a até 60 px de uma porta/saída vira destino especial
const DIST_PERTO = 90;               // nome do ginásio / "Saída" aparece; Enter e OK funcionam
const RECUO_PORTA = 60;              // ao sair do ginásio, aparece 60 px antes da porta
const FADE_MS = 250;
const PERSONAGENS = ['treinador1', 'treinador2', 'treinador3', 'lider'];
const DIRECOES = ['frente', 'costas', 'direita', 'esquerda'];
// Personagens (dados/jogo/personagens.json): {pasta_base}/{id}/{dir}-1..N.webp + {dir}-parado.webp (largura × altura do JSON, hoje 408 × 680).
// N por direção vem de `quadros` do JSON (os valores abaixo valem só se o JSON não carregar).
let QUADROS_PERSONAGEM = { frente: 2, costas: 4, direita: 4, esquerda: 4 };
const PERS = { pasta: `${IMG}/personagens-principais`, largura: 408, altura: 680, padrao: 'menino_cabelo_preto', lista: [{ id: 'menino_cabelo_preto', nome_interno: 'Menino de cabelo preto' }] };   // nome_interno: nunca aparece para o aluno
// Uma escala só para todas as imagens de gente: quadros dos personagens, colegas online, pessoas (NPCs) e
// poses de pesca têm o corpo na mesma escala de pixels. ESCALA_SPRITE = px do mapa por px da imagem; cada
// imagem é desenhada com a própria largura/altura × essa escala (pés na base). 630 é a referência que mantém
// o corpo do tamanho de antes (ALT_JOGADOR_MAPA, já com o +25% do PROMPT-16). Balões, apelidos e pet seguem usando ALT.
const ESCALA_SPRITE = ALT_JOGADOR_MAPA / 630;
const escalaSpriteCena = () => (cena?.salao ? alturaSalao() : cena?.tipo === 'mapa' ? ALT_JOGADOR_MAPA : ALT_JOGADOR) / 630;   // no ginásio e nos salões o personagem é maior
// Salões (fliperama, loja): o personagem tem altura_personagem do JSON do interior; o pet usa a mesma proporção do mapa
// (altura do pet = altura_personagem × ALT_PET / ALT_JOGADOR_MAPA) e as distâncias crescem junto
const alturaSalao = () => Number(cena?.alturaPersonagem) || ALT_JOGADOR;
const escalaPetCena = () => (cena?.salao ? alturaSalao() / ALT_JOGADOR_MAPA : cena?.tipo === 'mapa' ? ESCALA_ATORES : ESCALA_GINASIO);
const escalaAtoresCena = () => (cena?.salao ? ESCALA_ATORES * alturaSalao() / ALT_JOGADOR_MAPA : ESCALA_ATORES);   // ícones, toques e balões das pessoas
const NUM_MAPAS = 13;

const $ = (id) => document.getElementById(id);
// Busto: só a parte de cima da imagem. frac = fração da altura que aparece; topo = onde começa (as imagens do
// personagem têm folga em cima; as das pessoas começam na cabeça). espelhar: olha para o outro lado.
const BUSTO_PERS = { frac: 0.46, topo: 0.04 }, BUSTO_NPC = { frac: 0.4, topo: 0 }, ROSTO_NPC = { frac: 0.24, topo: 0 };
const bustoHtml = (src, cls, { frac, topo }, espelhar = false, id = '') =>
  `<span class="jr-busto ${cls}"${id ? ` id="${id}"` : ''} style="--frac:${frac};--topo:${topo}"><img src="${src}" alt="" draggable="false"${espelhar ? ' class="espelho"' : ''}/></span>`;
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
  return { ginasios, avisosPet: {}, batalhas: {}, batalhasDia: null, pedidos: {}, pedidosDia: null };
}

// ============================================================
//  PROGRESSO NO FIREBASE (Parte B)
// ============================================================
let teste = false;               // modo teste: grava em modo_teste_historico, sem XP e sem feed
// A professora jogando como aluna (menu do professor): progresso em jogo_revisao/PROFESSORA, sem XP, sem feed e
// sem placar de turma; aparece para os alunos online com a etiqueta "Professora".
export const UID_PROFESSORA = 'PROFESSORA';
const ehProfessora = () => sessao?.uid === UID_PROFESSORA;
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
    estado.relembre = v.relembre && typeof v.relembre === 'object' ? { ...v.relembre } : {};
    estado.programe = v.programe && typeof v.programe === 'object' ? { ...v.programe, fases: { ...(v.programe.fases || {}) } } : { fases: {} };   // PROMPT-50
    estado.mestre = v.mestre?.data ? { data: v.mestre.data } : null;   // Mestre da Revisão: as 26 insígnias (PROMPT-57)
    estado.lenda = v.lenda?.data ? { data: v.lenda.data } : null;      // Lenda da Revisão: as 26 douradas
    estado.letraGrande = !!v.preferencias?.letra_grande;   // Aa Letra grande (PROMPT-49), salva por aluno
    aplicarLetra();
    estado.missoes = v.missoes_dia && typeof v.missoes_dia === 'object' ? v.missoes_dia : null;
    estado.moedasDia = v.moedas_dia && typeof v.moedas_dia === 'object' ? v.moedas_dia : null;            // { data, fontes: { fonte: n } } — só hoje
    estado.moedasSemana = v.moedas_semana && typeof v.moedas_semana === 'object' ? { ...v.moedas_semana } : {};   // { segunda: { fonte: n } }   // { data, lista: [{ id, n, feito }], bonus, avisou }   // { ginásio: { visto, ocultar, aberturas, ultima } }
    estado.batalhas = v.batalhas && typeof v.batalhas === 'object' ? { ...v.batalhas } : {};   // { treinadorId: { nivel, vitorias, derrotas, estado, descansa_ate } }
    estado.batalhasDia = v.batalhas_dia || null;
    estado.pedidos = v.pedidos && typeof v.pedidos === 'object' ? { ...v.pedidos } : {};   // { id: { fim: 'acertou'|'errou', tentativas, dica, data } }
    estado.pedidosDia = v.pedidos_dia || null;
    estado.pescaDia = v.pesca_dia || null;
    estado.presentesDia = v.presentes_dia || null;
    estado.desafiosDia = v.desafios_dia || null;
    estado.fliperDia = v.fliperama_dia || null;
    estado.cavarDia = v.cavar_dia || null;            // { data, m: { 'mapa-i': true }, moedas } — montinhos/tesouros cavados hoje
    estado.matoMexido = v.mato_mexido || {};          // { 'mapa-i': ts } — rebrota depois de mato_rebrota_h
    estado.colecao = v.colecao || {};                 // { peça: ts }
    estado.colecaoGrupos = v.colecao_grupos || {};    // { grupo: true } — bônus de grupo completo já recebido       // { data, acertos, moedas } — moedas do fliperama hoje (até 10)
    estado.aovivoPremios = v.aovivo_premios || {};   // { código da sala: posição } — prêmio do pódio já recebido   // { data, n, contra: { uid: n } } — desafios que valeram prêmio hoje   // { data, n } — peixes dados de presente hoje
    estado.avisos = v.avisos && typeof v.avisos === 'object' ? { ...v.avisos } : {};   // { pesca_{ponto}: true, tutorial_pesca: true } — avisos que não se repetem   // { data, n } — peixes pescados hoje (os 3 pontos juntos)   // { data, moedas, pessoas: { npc: n } } — zera quando muda o dia   // { data, moedas, lealdade, xp } — zera quando muda o dia
    estado.avisosPet = v.avisos_pet && typeof v.avisos_pet === 'object' ? { ...v.avisos_pet } : {};   // { pet: { conversa, ajuda }, toques_sem_lealdade }
    estado.personagem = persValido(v.personagem) ? v.personagem : null;   // sem campo: usa o padrão
    // aluno novo = nada salvo ainda (sem ginásio, insígnia, pet nem dia jogado)
    estado.novo = !v.ginasios && !v.insignias && !v.pet && !v.pets && !v.sequencia;
    carregouProgresso = true;
    gravar({ ultimo_acesso: Date.now() });
    if (!estado.personagem && !estado.novo) { estado.personagem = PERS.padrao; gravar({ personagem: PERS.padrao }); }   // menino_atual saiu do jogo
  } catch (e) {
    console.error('[jogo-revisao] erro ao carregar progresso', e);
    avisoConexao('Não foi possível carregar seu progresso. Verifique a internet e recarregue a página.', true);
  }
  try {
    const cfg = await get(ref(db, 'jogo_revisao_config/global'));
    const c = cfg.exists() ? cfg.val() || {} : {};
    for (const n of Object.values(c.mapas_abertos || {})) mapasAbertos.add(Number(n));
    if (Number(c.meta_turma) > 0) metaTurma = Number(c.meta_turma);
    definirPausas(c.pausas);
    desafiosOff = c.desafios_off || {};   // a professora desliga os desafios da praça (todas as turmas ou uma)   // feriados/férias: não contam para a fome nem para a lealdade
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
  if (teste || ehProfessora() || !carregouProgresso) return;
  adicionarXP(sessao.uid, delta).catch(e => console.error('[jogo-revisao] erro ao dar XP', e));
}

async function publicarNoFeed(tipo, chave) {
  if (teste || ehProfessora() || !carregouProgresso) return;
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
// Todos os mapas abrem pelo mapa geral; os GINÁSIOS seguem a ordem 1A, 1B, 2A, 2B…: um ginásio abre
// quando todos os anteriores têm o líder vencido. Mapa liberado pela professora (mapas_abertos) recomeça a
// contagem nele; ginásio em que o aluno já venceu alguém continua aberto (não tranca progresso antigo).
function ginasioPendenteAntes(n, G) {
  if (modoDev) return null;
  const g = estado.ginasios[chaveGinasio(n, G)];
  if (['treinador1', 'treinador2', 'treinador3', 'lider'].some(p => g[p].vencido)) return null;
  let ini = 1;
  for (let m = n; m > 1; m--) if (mapasAbertos.has(m)) { ini = m; break; }
  for (let m = ini; m <= n; m++) for (const L of ['A', 'B']) {
    if (m === n && L === G) return null;
    if (!estado.ginasios[chaveGinasio(m, L)].lider.vencido) return chaveGinasio(m, L);
  }
  return null;
}
const ginasioLiberado = (n, G) => !ginasioPendenteAntes(n, G);

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
  if (!$('tela-geral').hidden) dimensionarGeral();
  if (cena) ajustarCamera();
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
  window.location.href = ehProfessora() ? '/professor/p-jogo-revisao.html' : '/aluno/a-jogos.html';
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
  if (modoDev) window.jogoRevisaoDev = { somarTurma, batalha: () => bt, pesca: () => pesca,   // batalha/pesca em andamento (testes)
    praca: () => abrirPraca(), laboratorio: () => abrirLaboratorio(), computador: (id) => abrirComputador(id), fantasma: () => abrirFantasma(), fase: (n) => abrirFasePrograme(n), escolherPet: (p) => escolherPet(p),
    desafiar: (uid, modo) => desafiarColega(colegas.get(uid), modo), colegas: () => [...colegas.keys()],
    mapa: (n) => abrirMapa(n, 'entrada'), pescar: () => { const p = pontosDoMapa(cena.n)[0]; if (p) sentarPesca(p); return !!p; }, pergunta: (chave, p) => abrirPergunta(chave, p),
    festa: (t) => mostrarFestaMestre(t || 'mestre'), hall: () => abrirHallMestres(), estado: () => estado, geral: () => abrirMapaGeral(),
    batalhar: (id) => iniciarBatalha(id), pg: () => pg };

  try {
    const pegar = (p) => fetch(`${DADOS}/${p}`).then(r => { if (!r.ok) throw new Error(p); return r.json(); });
    const [pers, geral, mapas, interiores, bandeja, geralQ, ...qs] = await Promise.all([
      pegar('personagens.json').catch(e => { console.warn('[jogo-revisao] personagens.json indisponível', e); return null; }),
      pegar('mapa-geral.json'), pegar('mapas.json'), pegar('interiores.json'),
      pegar('bandeja-insignias.json'), pegar('questoes/geral.json'),
      ...Array.from({ length: NUM_MAPAS }, (_, i) => pegar(`questoes/mapa${i + 1}.json`)),
    ]);
    Object.assign(D, { geral, mapas, interiores, bandeja, falas: geralQ.falas, regras: geralQ.regras });
    qs.forEach(q => { D.questoes[q.mapa] = q; });
    if (pers) definirPersonagens(pers);
  } catch (e) {
    console.error('[jogo-revisao] erro ao carregar dados', e);
    $('jr-carregando').textContent = 'Não foi possível carregar o jogo. Tente recarregar a página.';
    return;
  }

  await carregarEstado();
  try { definirFalas(await fetch(`${DADOS}/falas-pets.json`).then(r => { if (!r.ok) throw new Error('falas-pets.json'); return r.json(); })); }
  catch (e) { console.warn('[jogo-revisao] falas dos pets indisponíveis', e); }
  try { NPCS = (await fetch(`${DADOS}/npcs.json`).then(r => { if (!r.ok) throw new Error('npcs.json'); return r.json(); })).npcs || []; }
  catch (e) { console.warn('[jogo-revisao] pessoas dos mapas indisponíveis', e); }
  editarNpcs = teste && new URLSearchParams(location.search).get('editarNpcs') === '1';   // nunca para alunos
  editarPraca = teste && new URLSearchParams(location.search).get('editarPraca') === '1';
  try { definirPraca(await fetch(`${DADOS}/praca.json`).then(r => { if (!r.ok) throw new Error('praca.json'); return r.json(); })); }
  catch (e) { console.warn('[jogo-revisao] praça indisponível', e); }
  editarFliperama = teste && new URLSearchParams(location.search).get('editarFliperama') === '1';
  editarLoja = teste && new URLSearchParams(location.search).get('editarLoja') === '1';
  editarMato = teste && new URLSearchParams(location.search).get('editarMato') === '1';
  try {
    const [cj, mj] = await Promise.all(['cavar.json', 'mato.json'].map(f => fetch(`${DADOS}/${f}`).then(r => { if (!r.ok) throw new Error(f); return r.json(); })));
    CAVAR = cj; MATOS = mj.matos || [];
    [CAVAR_SP, MATO_SP] = await Promise.all(['cavar-sprites.json', 'mato-sprites.json']
      .map(f => fetch(`${DADOS}/${f}`).then(r => (r.ok ? r.json() : null)).catch(() => null)));   // sem eles: pose provisória MATO_NOTA = mj.nota || mj._nota || ''; MATOS_POR_DIA = Number(mj.por_dia) || 5;
  } catch (e) { console.warn('[jogo-revisao] cavar/mato indisponíveis', e); }
  try { LOJA = await fetch(`${DADOS}/loja-interior.json`).then(r => { if (!r.ok) throw new Error('loja-interior.json'); return r.json(); }); }
  catch (e) { console.warn('[jogo-revisao] interior da loja indisponível', e); }
  try { FLIPER = await fetch(`${DADOS}/fliperama.json`).then(r => { if (!r.ok) throw new Error('fliperama.json'); return r.json(); }); }
  catch (e) { console.warn('[jogo-revisao] fliperama indisponível', e); }
  try { definirBatalhas(await fetch(`${DADOS}/batalhas.json`).then(r => { if (!r.ok) throw new Error('batalhas.json'); return r.json(); })); }
  catch (e) { console.warn('[jogo-revisao] batalha de pets indisponível', e); }
  try {
    [PROG, LAB] = await Promise.all(['programe-o-pet.json', 'laboratorio.json'].map(f => fetch(`${DADOS}/${f}`).then(r => { if (!r.ok) throw new Error(f); return r.json(); })));
  } catch (e) { console.warn('[jogo-revisao] laboratório / Programe o pet indisponível', e); }
  try { TRUQUES = await fetch(`${DADOS}/truques.json`).then(r => { if (!r.ok) throw new Error('truques.json'); return r.json(); }); }
  catch (e) { console.warn('[jogo-revisao] truques indisponíveis', e); }
  try { MISSOES = await fetch(`${DADOS}/missoes.json`).then(r => { if (!r.ok) throw new Error('missoes.json'); return r.json(); }); }
  catch (e) { console.warn('[jogo-revisao] missões do dia indisponíveis', e); }
  try { EXPLIC = (await fetch(`${DADOS}/explicacoes.json`).then(r => { if (!r.ok) throw new Error('explicacoes.json'); return r.json(); })).explicacoes || {}; }
  catch (e) { console.warn('[jogo-revisao] explicações (Relembre) indisponíveis', e); }
  try { definirPedidos(await fetch(`${DADOS}/pedidos.json`).then(r => { if (!r.ok) throw new Error('pedidos.json'); return r.json(); })); }
  catch (e) { console.warn('[jogo-revisao] pedidos de ajuda indisponíveis', e); }
  try {
    const [loja, pescaJ, sprPesca] = await Promise.all(['loja.json', 'pesca.json', 'pesca-sprites.json']
      .map(f => fetch(`${DADOS}/${f}`).then(r => { if (!r.ok) throw new Error(f); return r.json(); })));
    definirLoja(loja); definirBarriga(loja.barriga); definirPeixes(pescaJ); definirPesca(pescaJ, sprPesca);
    aplicarIcones();
  } catch (e) { console.warn('[jogo-revisao] loja/pesca indisponíveis', e); }
  try {
    await carregarSprites(); petsOk = true;
    const [qw, qh] = tamanhoQuadro();
    document.documentElement.style.setProperty('--pet-quadro', `${qw} / ${qh}`);   // proporção do lutador na batalha
  } catch (e) { console.error('[jogo-revisao] pets indisponíveis', e); }
  configurarPrograme({
    pet: () => { const p = petsOk && estado?.pets?.ativo; return p ? { pet: p, forma: formaDe(p), tinta: cuidadosDe(p)?.tinta || null, nome: nomePet(p) } : null; },
    quadrosDe, temAnim, sentadoNoQuadro, tocar, esc, agora: agoraServ,
    pintar: (img, p) => aplicarTinta(img, p.tinta || null),
    imgComida: (pet) => caminhoImg((comidas().find(c => pet && ehFavorita(pet, c)) || comidas().find(c => c.id === 'racao'))?.imagem || ''),
    imgPetisco: () => caminhoImg(comidas().find(c => c.id === 'biscoito')?.imagem || ''),
  });
  preCarregarQuadros(meuPersonagem());
  ligarEventos();
  atualizarContador();
  requestAnimationFrame(loop);
  abrirMapaGeral();
  $('jr-carregando').hidden = true;
  { const f = verificarMestre(); if (f) setTimeout(() => mostrarFestaMestre(f), 1500); }
  carregarTitulos();
  iniciarPet();
  atualizarBotaoMissoes();
  entrarOnline().catch(() => {}).then(() => { carregarPremiosPesca(); ouvirPresentes(); iniciarPraca(); publicarResumoInsignias(); ouvirConvitesAoVivo(); });
  // aluno novo escolhe o personagem antes de tudo (o pet inicial vem depois, ao entrar num mapa)
  if (carregouProgresso && estado.novo && !estado.personagem) abrirEscolhaPersonagem(true);
}

// ============================================================
//  PERSONAGEM — o aluno escolhe 1 entre os de personagens.json (troca grátis no Meu Pet / estojo)
// ============================================================
function definirPersonagens(j) {
  if (j.pasta_base) PERS.pasta = '/' + String(j.pasta_base).replace(/^\/+|\/+$/g, '');
  if (j.quadros) QUADROS_PERSONAGEM = { ...QUADROS_PERSONAGEM, ...j.quadros };
  if (Number(j.largura) > 0) PERS.largura = Number(j.largura);
  if (Number(j.altura) > 0) PERS.altura = Number(j.altura);
  if (Array.isArray(j.personagens) && j.personagens.length) PERS.lista = j.personagens.filter(p => p?.id);
  PERS.padrao = persValido(j.padrao) ? j.padrao : PERS.lista[0].id;
}
const persValido = (id) => !!id && PERS.lista.some(p => p.id === id);
const meuPersonagem = () => estado?.personagem || PERS.padrao;

const pers = { primeira: false, sel: null, giro: 0, timer: 0, andarAte: 0, quadro: 0 };

function abrirEscolhaPersonagem(primeira = false) {
  pers.primeira = primeira;
  pers.sel = meuPersonagem();
  $('pers-grade').innerHTML = PERS.lista.map((p, i) => `
    <button class="jr-pers-cartao" data-pers="${esc(p.id)}" aria-label="Personagem ${i + 1}">
      <img src="${urlQuadro('frente', -1, p.id)}" alt="" draggable="false"/>
    </button>`).join('');
  $('pers-cancelar').hidden = primeira;
  $('pers-escolha').hidden = false;
  selecionarPersonagem(pers.sel);
  pers.giro = 0; pers.andarAte = 0;
  clearInterval(pers.timer);
  let t = 0;
  // gira parado (frente → direita → costas → esquerda, 0,8 s cada); tocado, anda no lugar
  pers.timer = setInterval(() => {
    if ($('pers-escolha').hidden) { clearInterval(pers.timer); return; }
    const dir = ['frente', 'direita', 'costas', 'esquerda'][pers.giro % 4];
    if (performance.now() < pers.andarAte) { pers.quadro++; $('pers-img').src = urlQuadro(dir, pers.quadro, pers.sel); return; }
    if ((t += 100) >= 800) { t = 0; pers.giro++; }
    $('pers-img').src = urlQuadro(['frente', 'direita', 'costas', 'esquerda'][pers.giro % 4], -1, pers.sel);
  }, 100);
}

function selecionarPersonagem(id) {
  if (!persValido(id)) return;
  pers.sel = id;
  preCarregarQuadros(id);
  for (const c of $('pers-grade').children) c.classList.toggle('atual', c.dataset.pers === id);
  $('pers-img').src = urlQuadro(['frente', 'direita', 'costas', 'esquerda'][pers.giro % 4], -1, id);
}

function confirmarPersonagem() {
  const id = pers.sel;
  $('pers-escolha').hidden = true;
  clearInterval(pers.timer);
  if (!persValido(id)) return;
  if (id !== estado.personagem) {
    estado.personagem = id;
    gravar({ personagem: id });
    enviarOnline({ personagem: id });
    desenharJogador();
    if (!$('pergunta').hidden) $('perg-jog').src = urlQuadro('direita', -1);
  }
  if (!pers.primeira) tocar('porta');
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
const INICIAIS = ['elefante', 'gato', 'gaviao'];
// pet esperando ao lado do líder: ~70% do líder para um pet de 40, na mesma proporção entre os pets
const altImagemPetGinasio = (pet) => ALT_LIDER * 0.7 * (altPet(pet) / 40) / sentadoNoQuadro(pet);

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
  return { ativo, conquistados, migrou, moedas: Number(v.pets?.moedas) || 0, iscas: Number(v.pets?.iscas) || 0, itens: { ...(v.pets?.itens || {}) },
    bolsa: { ...(v.pets?.bolsa || {}) }, tintas: { ...(v.pets?.tintas || {}) }, efeitos: { ...(v.pets?.efeitos || {}) }, cuidadosV2: !!v.pets?.cuidados_v2 };
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
  migrarCapivara(ps);
  for (const p of Object.keys(ps.conquistados)) if (!petValido(p)) delete ps.conquistados[p];
  liberarPetsProfessora(ps);
  if (!temPet(ps.ativo)) ps.ativo = Object.keys(ps.conquistados)[0] || null;
  if (ps.migrou && ps.ativo) gravar({ pets: { ativo: ps.ativo, conquistados: ps.conquistados } });
  delete ps.migrou;
  normalizarCuidados();
  if (ps.ativo) { preCarregarPet(formaDe(ps.ativo)); seguidor.definir(ps.ativo, formaDe(ps.ativo)); atualizarVisualPet(); }
  if (falasProntas()) verificarMarcosLealdade(ps.ativo);
  verificarEvolucao(ps.ativo);   // quem já tinha ❤️ 3 antes da evolução existir evolui ao entrar
  atualizarFomeSeguidor();
}

// Login da professora (menu do professor): todos os pets na coleção e as formas adultas liberadas, sem precisar
// vencer líderes nem chegar ao ❤️ 3. O interruptor "Mostrar como filhote" (Meu Pet → Visual) troca entre as formas.
function liberarPetsProfessora(ps) {
  if (!ehProfessora()) return;
  const patch = {};
  for (const p of PETS.filter(petValido)) {
    const evoluido = formaAdulta(p) ? { evoluido: true } : {};
    if (!ps.conquistados[p]) { ps.conquistados[p] = { data: Date.now(), origem: 'professora', ...cuidadosNovos(), ...evoluido }; patch[`pets/conquistados/${p}`] = ps.conquistados[p]; }
    else if (evoluido.evoluido && !ps.conquistados[p].evoluido) { ps.conquistados[p].evoluido = true; patch[`pets/conquistados/${p}/evoluido`] = true; }
  }
  if (Object.keys(patch).length) gravar(patch);
}

// A capivara virou elefante (PROMPT-20): quem tinha capivara fica com o elefante, com tudo o que era dela
// (lealdade, barriga, amizade, nome, tinta, efeito, origem) e, se era o ativo, o elefante passa a ser. Uma vez só.
function migrarCapivara(ps) {
  const c = ps.conquistados.capivara;
  if (!c) return;
  const patch = { 'pets/conquistados/capivara': null };
  if (!ps.conquistados.elefante) { ps.conquistados.elefante = c; patch['pets/conquistados/elefante'] = c; }
  delete ps.conquistados.capivara;
  if (ps.ativo === 'capivara') { ps.ativo = 'elefante'; patch['pets/ativo'] = 'elefante'; }
  const av = estado.avisosPet;
  if (av?.capivara) {
    if (!av.elefante) { av.elefante = av.capivara; patch['avisos_pet/elefante'] = av.elefante; }
    delete av.capivara; patch['avisos_pet/capivara'] = null;
  }
  gravar(patch);
}

// Ainda sem nenhum pet: pede a escolha do inicial ao entrar num mapa da região
function pedirPetSeFaltar() {
  if (seguidor && !Object.keys(estado.pets.conquistados).length && $('pet-escolha').hidden && $('pers-escolha').hidden) abrirEscolhaPet();
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

const imgPet = (p, animar = true) => {
  const f = formaDe(p), [w, h] = tamanhoQuadro(f);
  return `<img src="${quadrosDe(f, 'sentado_girando')[0]}" width="${w}" height="${h}"${animar ? ` data-anim="${f}"` : ''}${attrForma(p, f)} alt="" draggable="false"/>`;
};

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
  preCarregarPet(formaDe(pet));
  seguidor.definir(pet, formaDe(pet));
  if (cena) seguidor.colocar(x, y);
  atualizarBotaoPet();
  atualizarFomeSeguidor();
  atualizarVisualPet();
  enviarOnline({ pet, ...visualOnline(pet) });
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
      <button class="jr-btn jr-pet-escolher" data-pet="${p}">${estado.pets.ativo === p ? '✔ Com você' : 'Levar comigo'}</button>
    </div>` : `
    <div class="jr-pet-opcao bloqueado" data-silhueta="${p}" role="button" tabindex="0">
      ${imgPet(p, false)}
      <span>???</span>
      <span class="jr-pet-lugar">${ondeConquistar(onde[p])}</span>
    </div>`).join('');
  for (const el of $('colecao-opcoes').querySelectorAll('.jr-pet-opcao[data-pet]')) aplicarVisualPet(el.querySelector('img'), el.dataset.pet);
  $('pet-colecao').hidden = false;
  animarPainelPet($('colecao-opcoes'));
}

// "Vença {ginásio} ({mapa})" — pela tabela PETS_GINASIO
function ondeConquistar(chave) {
  if (!chave) return 'Ainda escondido';
  const [n, G] = chave.replace('mapa', '').split('-');
  const q = D.questoes[Number(n)];
  return `Vença ${q.ginasios[G].nome} (${q.nome})`;
}

// Cartão de um pet que falta: silhueta grande e onde conquistar (nome e cores só depois de conquistar)
function abrirSilhueta(pet) {
  if (!petValido(pet) || temPet(pet)) return;
  const img = $('silhueta-img');
  const [w, h] = tamanhoQuadro();
  img.width = w; img.height = h;
  img.src = quadrosDe(pet, 'sentado_girando')[0];
  $('silhueta-onde').textContent = ondeConquistar(ondeAparecem()[pet]);
  $('pet-silhueta').hidden = false;
}

let colecaoDoMeuPet = false;   // coleção aberta pelo "Trocar pet" da tela Meu Pet: volta para ela

function trocarPetAtivo(pet) {
  if (!temPet(pet)) return;
  $('pet-colecao').hidden = true;
  if (estado.pets.ativo !== pet) {
    const patch = trocaDeAtivo(pet);
    estado.pets.ativo = pet;
    patch['pets/ativo'] = pet;
    gravar(patch);
    usarPet(pet);
    tocar('vitoria');
    verificarMarcosLealdade(pet);
  }
  if (colecaoDoMeuPet) { colecaoDoMeuPet = false; abrirMeuPet(); }
}

// Botão do HUD no mapa da região: ícone do pet ativo
function atualizarBotaoPet() {
  const b = $('btn-pet');
  const ativo = estado?.pets?.ativo;
  b.hidden = !(seguidor && ativo && cena?.tipo === 'mapa');
  atualizarBotaoBatalhar();
  if (b.hidden) return;
  const src = srcIcone(formaDe(ativo));
  const img = b.querySelector('img');
  img.setAttribute('data-icone-pet', '');
  if (img.getAttribute('src') !== src) { img.src = src; encaixarIcone(img); }
  aplicarVisualPet(img, ativo);
  b.setAttribute('aria-label', `Meus pets (${nomePet(ativo)})`);
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
  if (usarAgora || !estado.pets.ativo) { trocaDeAtivo(pet, patch); estado.pets.ativo = pet; patch['pets/ativo'] = pet; }
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
// Pet novo: barriga cheia e lealdade_pet_novo (loja.json)
const lealdadeNovo = () => cfgLoja().lealdade_pet_novo ?? LEALDADE_INICIAL;
const cuidadosNovos = () => ({ barriga: cfgLoja().barriga?.cheia ?? 100, barriga_t: Date.now(), lealdade: lealdadeNovo(), ultimo_dia_jogado: diaLocal() });

// Ao carregar: migra para "cada pet com seus cuidados" (uma vez), completa campos e aplica a queda de
// lealdade dos dias úteis sem jogar — só no pet ATIVO (os outros ficam descansando, congelados)
function normalizarCuidados() {
  const hoje = diaLocal(), agora = Date.now(), ps = estado.pets, ativo = ps.ativo, patch = {};
  const campo = (pet, k, v) => { ps.conquistados[pet][k] = v; patch[`pets/conquistados/${pet}/${k}`] = v; };
  if (!ps.cuidadosV2) {
    // o ativo mantém a barriga e a lealdade de hoje; os outros recebem os mesmos valores do ativo
    const ca = ativo && ps.conquistados[ativo];
    const b = ca ? Math.round(barrigaAntiga(Number(ca.ultima_refeicao) || agora, agora)) : (cfgLoja().barriga?.cheia ?? 100);
    const l = ca && Number.isFinite(Number(ca.lealdade)) ? Number(ca.lealdade) : lealdadeNovo();
    for (const pet of Object.keys(ps.conquistados)) {
      campo(pet, 'barriga', b); campo(pet, 'barriga_t', agora);
      if (pet !== ativo) { campo(pet, 'lealdade', l); campo(pet, 'lealdade_dia', hoje); }
    }
    ps.cuidadosV2 = true; patch['pets/cuidados_v2'] = true;
  }
  for (const [pet, c] of Object.entries(ps.conquistados)) {
    if (!Number.isFinite(Number(c.barriga))) { campo(pet, 'barriga', cfgLoja().barriga?.cheia ?? 100); campo(pet, 'barriga_t', agora); }
    if (!(Number(c.barriga_t) > 0)) campo(pet, 'barriga_t', agora);
    if (!Number.isFinite(c.lealdade)) campo(pet, 'lealdade', lealdadeNovo());
    if (!c.ultimo_dia_jogado) campo(pet, 'ultimo_dia_jogado', hoje);
  }
  const c = ativo && ps.conquistados[ativo];
  const nova = c ? lealdadeComQueda(c, hoje) : null;
  if (nova !== null) { campo(ativo, 'lealdade', nova); campo(ativo, 'lealdade_dia', hoje); }
  if (Object.keys(patch).length) gravar(patch);
}

// Troca o pet ativo: o que sai congela a barriga como está; o que entra volta a esvaziar a partir de agora
// (e não perde lealdade pelos dias em que ficou descansando)
function trocaDeAtivo(novo, patch = {}) {
  const velho = estado.pets.ativo, agora = Date.now(), hoje = diaLocal();
  if (velho === novo) return patch;
  const cv = velho && cuidadosDe(velho);
  if (cv) {
    cv.barriga = Math.round(barrigaDe(velho) * 10) / 10; cv.barriga_t = agora;
    patch[`pets/conquistados/${velho}/barriga`] = cv.barriga; patch[`pets/conquistados/${velho}/barriga_t`] = agora;
  }
  const cn = cuidadosDe(novo);
  if (cn) {
    cn.barriga_t = agora; cn.lealdade_dia = hoje; cn.ultimo_dia_jogado = hoje;
    for (const k of ['barriga_t', 'lealdade_dia', 'ultimo_dia_jogado']) patch[`pets/conquistados/${novo}/${k}`] = cn[k];
  }
  return patch;
}

const cuidadosDe = (pet) => estado.pets.conquistados[pet];
// Forma na tela: o adulto depois da evolução (❤️ 3), a não ser que o aluno prefira ver o filhote (Meu Pet → Visual)
const formaDe = (pet) => { const a = formaAdulta(pet), c = a && cuidadosDe(pet); return c?.evoluido && !c.mostrar_filhote ? a : pet; };
const barrigaDe = (pet) => { const c = cuidadosDe(pet); return c ? barrigaDoPet(c, pet === estado.pets.ativo) : 100; };

// Pet ativo com fome (barriga < fome_abaixo) fica triste quando parado no mapa
function atualizarFomeSeguidor() {
  if (seguidor) seguidor.fome = !!estado.pets.ativo && barrigaDe(estado.pets.ativo) < fomeAbaixo();
}

// +1 moeda na PRIMEIRA vez que o aluno acerta cada pergunta (id da pergunta); refazer não dá moeda (PROMPT-47)
function ganharMoeda() {
  if (!estado?.pets) return;
  estado.pets.moedas = (Number(estado.pets.moedas) || 0) + 1;
  const patch = { 'pets/moedas': estado.pets.moedas };
  registrarGanho('ginasio', 1, patch);
  gravar(patch);
  const el = $('perg-moedas');
  atualizarMoedasPergunta();
  el.classList.remove('pulsa'); void el.offsetWidth; el.classList.add('pulsa');
  const mais = document.createElement('span');
  mais.className = 'jr-moeda-mais';
  mais.innerHTML = `+1 ${moedaHtml()}`;
  el.appendChild(mais);
  setTimeout(() => mais.remove(), 1100);
}

function atualizarMoedasPergunta() {
  const el = $('perg-moedas');
  if (!el) return;
  el.hidden = !petsOk;
  el.querySelector('span').textContent = Number(estado?.pets?.moedas) || 0;
}

// Marcos de lealdade (falas-pets.json: conversa, dica, eliminar): aviso comemorativo uma vez por pet (guardado em avisos_pet)
function verificarMarcosLealdade(pet = estado?.pets?.ativo) {
  const c = pet && cuidadosDe(pet);
  if (!c) return;
  const cfg = configAjuda();
  const marcos = [['conversa', configFalas().lealdade_minima ?? 25, `💬 ${nomePet(pet)} agora conversa com você!`],
                  ['ajuda', cfg.lealdade_dica ?? 80, `💡 ${nomePet(pet)} agora pode te dar dicas nos ginásios!`],
                  ['eliminar', cfg.lealdade_eliminar ?? 95, `❌ ${nomePet(pet)} agora pode eliminar uma opção nos ginásios!`]];
  verificarEvolucao(pet);
  avisarTruques(pet);
  const av = (estado.avisosPet[pet] ||= {});
  for (const [k, min, texto] of marcos) {
    if (av[k] || (Number(c.lealdade) || 0) < min) continue;
    av[k] = true;
    gravar({ [`avisos_pet/${pet}/${k}`]: true });
    avisoPet(texto, true);
  }
}

// ── Evolução: no ❤️ 3 o pet ativo vira adulto (se houver forma adulta em sprites.json → evolucao). Uma vez por pet;
// é o mesmo pet (lealdade, barriga, amizade, nome, tinta e efeito continuam), só muda a forma. ──
const NIVEL_EVOLUCAO = 3;
let evoPendente = null;   // pet que evolui assim que nada estiver na frente (batalha, pergunta, troca de cena)
let evo = null;           // cena em andamento: { pet, anim (PetParado do adulto), timers }

function verificarEvolucao(pet = estado?.pets?.ativo) {
  const c = pet && cuidadosDe(pet);
  if (!petsOk || !c || c.evoluido || pet !== estado.pets.ativo || !formaAdulta(pet) || nivelPet(pet) < NIVEL_EVOLUCAO) return;
  evoPendente = pet;
}

// A cada quadro: mostra a cena pendente quando der (no Meu Pet pode, por cima)
function tentarEvolucao() {
  if (!evoPendente || evo || !cena || transicionando || pesca || bt || perguntaAberta) return;
  if (sobreposicaoAberta() && $('meu-pet').hidden) return;
  const pet = evoPendente;
  evoPendente = null;
  if (pet === estado.pets.ativo && !cuidadosDe(pet)?.evoluido) mostrarEvolucao(pet);
}

function mostrarEvolucao(pet) {
  const c = cuidadosDe(pet), adulto = formaAdulta(pet);
  c.evoluido = true;
  gravar({ [`pets/conquistados/${pet}/evoluido`]: true });
  preCarregarPet(adulto);
  pararFalaPet();
  soltarJoystick();
  const el = $('pet-evolucao'), palco = el.querySelector('.jr-evo-palco'), fi = $('evo-filhote'), ad = $('evo-adulto');
  fi.src = quadrosDe(pet, 'sentado_girando')[0];
  ad.dataset.src = '';
  aplicarVisualPet(fi, pet); aplicarVisualPet(ad, pet);
  $('evo-fim').hidden = true;
  $('evo-titulo').textContent = `${nomePet(pet)} evoluiu! 🐉`;
  palco.classList.remove('brilha');
  el.classList.remove('escuro');
  el.hidden = false;
  // tamanhos: o adulto ocupa até 82% da altura do palco (sem passar da largura); o filhote fica na mesma proporção do mapa
  const r = palco.getBoundingClientRect(), [qw, qh] = tamanhoQuadro(adulto);
  const hA = Math.min(r.height * 0.82, r.width * 0.98 * qh / qw);
  ad.style.height = hA + 'px';
  fi.style.height = hA / fatorForma(pet, adulto) + 'px';
  evo = { pet, anim: new PetParado(ad), timers: [] };
  evo.anim.definir(adulto);
  const depois = (ms, fn) => evo.timers.push(setTimeout(fn, ms));
  const mostrar = (qual) => { fi.style.visibility = qual === 'filhote' ? '' : 'hidden'; ad.style.visibility = qual === 'adulto' ? '' : 'hidden'; };
  const flash = (fn) => {
    $('evo-flash').animate([{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' });
    depois(300, fn);
  };
  const fim = () => { $('evo-fim').hidden = false; tocar('vitoria'); $('evo-ok').focus(); };
  requestAnimationFrame(() => el.classList.add('escuro'));
  if (semMovimento()) {   // sem animação: só o flash e o texto
    mostrar('adulto');
    flash(fim);
    return;
  }
  // o filhote brilha, depois pisca entre as duas formas 6× acelerando; flash; o adulto ruge
  mostrar('filhote');
  depois(500, () => palco.classList.add('brilha'));
  let t = 1300;
  for (let i = 0; i < 6; i++) {
    const d = Math.round(380 * 0.7 ** i);
    depois(t, () => mostrar('adulto')); t += d;
    depois(t, () => mostrar('filhote')); t += d;
  }
  depois(t, () => flash(() => {
    palco.classList.remove('brilha');
    mostrar('adulto');
    evo.anim.tocar('rugido');
    depois(1000, fim);
  }));
}

function fecharEvolucao() {
  if (!evo) return;
  const { pet } = evo;
  evo.timers.forEach(clearTimeout);
  evo = null;
  $('pet-evolucao').hidden = true;
  aplicarForma(pet);
  seguidor?.reagir('rugido');
  avisarTruques(pet);   // a lealdade de agora já pode ter liberado truques do adulto
}

// Avisos curtos no alto da tela, um depois do outro
const filaAvisoPet = [];
function avisoPet(texto, festa = false, img = '') {
  filaAvisoPet.push({ texto, festa, img });
  if (filaAvisoPet.length === 1) proximoAvisoPet();
}
function proximoAvisoPet() {
  const a = filaAvisoPet[0];
  if (!a) return;
  const el = document.createElement('div');
  el.className = 'jr-aviso-seq jr-aviso-pet' + (a.festa ? ' festa' : '') + (a.img ? ' com-busto' : '');
  el.textContent = a.texto;
  if (a.img) { const im = document.createElement('img'); im.src = a.img; im.alt = ''; im.draggable = false; el.prepend(im); }
  ($('programe') && !$('programe').hidden ? $('programe') : $('jr-app')).appendChild(el);   // no Programe o pet: dentro da tela dele (não gira)
  if (a.festa) tocar('vitoria');
  setTimeout(() => { el.remove(); filaAvisoPet.shift(); proximoAvisoPet(); }, 4200);
}

// +5 de lealdade no 1º dia de jogo de cada dia, para o pet ativo (junto de registrarDiaJogado)
function lealdadeDoDia() {
  const pet = estado?.pets?.ativo;
  const c = pet && cuidadosDe(pet);
  const hoje = diaLocal();
  if (!c || c.ultimo_dia_jogado === hoje) return;
  c.ultimo_dia_jogado = hoje; c.lealdade_dia = hoje;
  const base = `pets/conquistados/${pet}`;
  gravar(ganharLealdade(pet, LEALDADE_DIA, { [`${base}/ultimo_dia_jogado`]: hoje, [`${base}/lealdade_dia`]: hoje }));
  verificarMarcosLealdade(pet);
}

// ── Tela "Meu Pet" ──────────────────────────────────────────
const MP_ALT_MAX = 352;   // px na tela
const semMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let mp = null;   // { pet, anim (PetParado), estado, corpoAnim, timerBalao }

function abrirMeuPet() {
  const pet = estado.pets.ativo;
  if (!pet) return;
  preCarregarPet(pet);
  $('meu-pet').hidden = false;
  const img = $('mp-img');
  const forma = formaDe(pet);
  preCarregarPet(forma);
  mp = { pet, forma, anim: new PetParado(img), estado: '', corpoAnim: null, ocupado: false, carinhos: 0 };
  img.dataset.src = '';
  mp.anim.definir(forma);
  medirMeuPet();
  for (const id of ['mp-bolsa-painel', 'mp-visual-painel', 'mp-nomear', 'mp-truques-painel']) $(id).hidden = true;
  atualizarVisualPet();
  atualizarBotaoBatalhar();
  renderMeuPet();
  voltarAoNormal();
}

// pet grande: o filhote tem a imagem com até ~78% da altura do palco, no máximo 352 px na tela (o tamanho de antes
// dos quadros em dobro). Adulto: a imagem cresce fatorForma (desenho sentado 15% maior que o do filhote); as sobras
// do quadro (asas, folga) podem passar das bordas, mas o DESENHO sentado (~50% da largura do quadro) cabe no palco.
const DESENHO_NO_QUADRO = 0.52;
function medirMeuPet() {
  const palco = $('mp-palco'), { pet, forma } = mp;
  let h = Math.min(palco.clientHeight * 0.78, MP_ALT_MAX);
  if (forma !== pet) {
    const [qw, qh] = tamanhoQuadro(forma);
    h = Math.min(h * fatorForma(pet, forma), palco.clientWidth * 0.98 / DESENHO_NO_QUADRO * qh / qw);
  }
  $('mp-img').style.height = h + 'px';
  $('mp-palco').classList.toggle('largo', forma !== pet);   // adulto: asas, comida e fogo podem passar da borda do palco
  $('mp-truques').hidden = !truquesDe(pet);
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
  const nivel = nivelPet(pet), pp = cfgLoja().amizade?.pontos_por_nivel || 100;
  $('mp-nome').innerHTML = `${esc(nomePet(pet))}${nivel >= 10 ? ' <span class="mp-coroa" title="Amizade nível 10">👑</span>' : ''}` +
    (nivel >= 2 ? ` <span class="mp-nivel" title="Nível de amizade">❤️ ${nivel}</span>` : '');
  $('mp-palco').classList.toggle('moldura-prata', nivel >= 2 && nivel < 5);
  $('mp-palco').classList.toggle('moldura-ouro', nivel >= 5);
  renderBotaoMeusPets();
  $('mp-origem').textContent = c.origem === 'professora' ? 'Liberado para a professora'
    : c.origem && c.origem !== 'inicial' && PETS_GINASIO[c.origem] ? `Conquistado: ${nomeDoLugar(c.origem)}` : 'Seu primeiro pet';
  $('mp-moedas').textContent = Number(estado.pets.moedas) || 0;
  $('mp-barriga-fill').style.width = b + '%';
  $('mp-barriga-fill').dataset.cor = fb.cor;
  $('mp-barriga-rot').textContent = fb.rotulo;
  $('mp-lealdade-fill').style.width = l + '%';
  $('mp-lealdade-rot').textContent = `${rotuloLealdade(l)} · ${l}` + (l >= 100 ? ` · amizade ❤️ ${nivel} (${Math.floor((Number(c.amizade) || 0) % pp)}/${pp})` : '');
  const lc = configFalas().lealdade_minima ?? 25, ld = configAjuda().lealdade_dica ?? 80, le = configAjuda().lealdade_eliminar ?? 95;
  for (const [id, v] of [['conversa', lc], ['ajuda', ld], ['elimina', le]]) {
    $('mp-marca-' + id).style.left = v + '%';
    $('mp-marca-' + id).classList.toggle('ok', l >= v);
  }
  // uma linha só: o próximo marco ainda não alcançado (os números são os do jogo: falas, dica, eliminar, cambalhota, amizade)
  // (dois marcos no mesmo número: vale o primeiro; o outro está no ⓘ)
  const marcos = [[lc, 'começa a conversar 💬'], [ld, 'dá dicas nos ginásios 💡'], [le, 'elimina uma opção nos ginásios ❌'],
    [LEALDADE_CAMBALHOTA, 'aprende a cambalhota 🤸'], [100, 'começa a amizade ❤️'],
    ...(truquesDe(pet) || []).filter(t => t.lealdade > 0).map(t => [t.lealdade, `aprende o truque ${t.nome} ${t.emoji}`])]
    .filter(([v], i, t) => t.findIndex(([w]) => w === v) === i).sort((a, b) => a[0] - b[0]);
  const prox = marcos.find(([v]) => l < v);
  $('mp-marco').textContent = prox
    ? `Próximo: ${prox[0]} — ${prox[1]}`
    : `Amizade ❤️ ${nivel} — faltam ${pp - Math.floor((Number(c.amizade) || 0) % pp)} para o próximo nível`;
  $('mp-info-balao').innerHTML = `<b>Como a lealdade sobe</b> Carinho (até ${CARINHOS_POR_DIA} por dia), comida e jogar todo dia. Ficando muitos dias sem jogar, ela cai um pouco.
    <b>Marcos</b> Com ${lc}, ${esc(nomePet(pet))} começa a conversar${LEALDADE_CAMBALHOTA === lc ? ' e aprende a cambalhota' : ''}.${LEALDADE_CAMBALHOTA !== lc ? ` Com ${LEALDADE_CAMBALHOTA}, aprende a cambalhota.` : ''} Com ${ld}, dá dicas nos ginásios; com ${le}, elimina uma opção.
    Acima de 100, cada ${pp} pontos sobem um nível de amizade ❤️ (moldura de prata no 2, corações ao seguir no 3, moldura dourada no 5, coroa no 10).${truquesDe(pet) ? `
    <b>Truques ✨</b> ${truquesDe(pet).map(t => `${t.emoji} ${esc(t.nome)} ${t.lealdade > 0 ? t.lealdade : '(desde o início)'}`).join(' · ')}.` : ''}`;
  $('mp-bolsa').innerHTML = `${imgItem(icone('bolsa'), '🎒', 'jr-ic-btn')} Bolsa (${Object.values(estado.pets.bolsa || {}).reduce((a, n) => a + (Number(n) || 0), 0)})`;
}

// "🐾 Meus pets (N)" + até 3 carinhas (o ativo primeiro; "+N" se tiver mais)
function renderBotaoMeusPets() {
  const meus = Object.keys(estado.pets.conquistados).filter(petValido);
  const ordem = [estado.pets.ativo, ...meus.filter(p => p !== estado.pets.ativo)].filter(p => meus.includes(p));
  $('mp-npets').textContent = meus.length;
  $('mp-carinhas').innerHTML = ordem.slice(0, 3).map(p => {
    const f = formaDe(p);
    return `<span><img src="${srcIcone(f)}" alt="" draggable="false" data-pet="${p}" data-icone-pet/></span>`;   // o busto, com a cabeça medida e centralizada
  }).join('') + (ordem.length > 3 ? `<b>+${ordem.length - 3}</b>` : '');
  for (const img of $('mp-carinhas').querySelectorAll('img[data-pet]')) aplicarVisualPet(img, img.dataset.pet);
  $('mp-trocar').setAttribute('aria-label', `Meus pets: ${meus.length}. Ver e trocar`);
}

// ── Aa Letra grande: +20% nos textos de pergunta, balões e cartões (CSS: --letra) ──
function aplicarLetra() {
  const g = !!estado?.letraGrande;
  document.documentElement.classList.toggle('jr-letra-grande', g);
  const b = $('btn-letra');
  if (b) { b.textContent = `Aa Letra: ${g ? 'Grande' : 'Normal'}`; b.setAttribute('aria-pressed', String(g)); }
}
function alternarLetra() {
  if (!estado) return;
  estado.letraGrande = !estado.letraGrande;
  gravar({ 'preferencias/letra_grande': estado.letraGrande || null });
  aplicarLetra();
}

// Movimento por código no corpo do pet (respira, balança a cabeça, fica tristinho)
function movimentoCorpo(tipo) {
  mp.corpoAnim?.cancel();
  mp.corpoAnim = null;
  if (semMovimento()) return;
  const corpo = $('mp-corpo');
  const K = {
    respira:  [[{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.03)' }], { duration: 1400, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }],
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

// Volta ao estado de descanso: triste (fome) ou sentado (o pet nunca dorme)
function voltarAoNormal() {
  if (!mp) return;
  mp.ocupado = false;
  if (barrigaDe(mp.pet) < fomeAbaixo()) { mp.estado = 'triste'; mp.anim.tocar('triste_fome'); movimentoCorpo('triste'); }
  else { mp.estado = 'parado'; mp.anim.tocar('sentado_girando'); movimentoCorpo('respira'); }
  renderMeuPet();
}

// A cada quadro (dentro do loop do jogo)
function atualizarMeuPet(dt) {
  if (!mp) return;
  mp.anim.atualizar(dt);
  if (mp.estado === 'parado' && mp.anim.anim === 'sentado_girando' && mp.anim.ciclos >= 3)
    mp.anim.tocar(sortearOcioso(), () => { if (mp?.estado === 'parado') voltarAoNormal(); });   // a cada 3 ciclos: fareja, se lambe, descansa… (sem repetir)
  // comendo 2 vezes, depois: o adulto lambe os beiços; os outros ficam felizes
  if (mp.estado === 'comendo' && mp.anim.anim === 'comendo' && mp.anim.ciclos >= 2) comemorar(temAnim(mp.forma, 'lamber_beicos') ? 'lamber_beicos' : 'feliz', !temAnim(mp.forma, 'lamber_beicos'));
}

function comemorar(anim, pular = true) {
  mp.estado = anim; mp.ocupado = true;
  movimentoCorpo(null);
  mp.anim.tocar(anim, () => voltarAoNormal());
  if (pular) arcoDePulo();
}

function falarPet(texto) {
  const b = $('mp-balao');
  b.textContent = texto;
  b.hidden = false;
  clearTimeout(mp.timerBalao);
  mp.timerBalao = setTimeout(() => { b.hidden = true; }, 1800);
}

function particulas(simbolos, n) {   // símbolo: texto (emoji) ou HTML de imagem (começa com "<")
  const caixa = $('mp-particulas');
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'jr-mp-part';
    const sim = simbolos[i % simbolos.length];
    if (sim.startsWith('<')) s.innerHTML = sim; else s.textContent = sim;
    s.style.left = 30 + Math.random() * 40 + '%';
    s.style.animationDelay = i * 90 + 'ms';
    caixa.appendChild(s);
    setTimeout(() => s.remove(), 1400 + i * 90);
  }
}

function carinhoPet() {
  if (!mp || mp.ocupado) return;
  missaoProgresso('carinho');
  const pet = mp.pet, c = cuidadosDe(pet), hoje = diaLocal();
  if (doDia(c.carinhos_dia, hoje) < CARINHOS_POR_DIA) {
    c.carinhos_dia = { dia: hoje, n: doDia(c.carinhos_dia, hoje) + 1 };
    const base = `pets/conquistados/${pet}`;
    gravar(ganharLealdade(pet, 1, { [`${base}/carinhos_dia`]: c.carinhos_dia }));
    renderMeuPet();
    verificarMarcosLealdade(pet);
  }
  particulas(['💜', '💛', '💜', '💛'], 5);
  const fc = barrigaDe(pet) >= fomeAbaixo() && falasProntas() && c.lealdade >= (configFalas().lealdade_minima ?? 25) ? montarFala(contextoFalaDe(pet), 'carinho') : null;
  falarPet(barrigaDe(pet) < fomeAbaixo() ? 'Obrigado… mas tô com fome' : fc?.baloes[0]?.texto || 'Gostei!');
  // o adulto alterna: um carinho calmo (olhos fechados, satisfeito, sem pulo), o outro feliz
  if (barrigaDe(pet) >= fomeAbaixo() && temAnim(mp.forma, 'calmo') && mp.carinhos++ % 2 === 0) comemorar('calmo', false);
  else comemorar(c.lealdade >= LEALDADE_CAMBALHOTA ? 'pulo_cambalhota' : 'feliz');
}

// ============================================================
//  LOJA DA DONA CIDA, BOLSA, TINTA/EFEITO, NOME E AMIZADE DO PET
//  (números em dados/jogo/loja.json; regras em js/jogo-revisao/loja.js)
// ============================================================
const nomePet = (pet) => cuidadosDe(pet)?.nome || NOME_PET[pet] || '';
// Imagem de item/ícone com o emoji de reserva (se a imagem falhar, troca pelo emoji)
const caminhoImg = (p) => (p ? '/' + String(p).replace(/^\/+/, '') : '');
const imgItem = (src, emoji, cls = '', filtro = '') => src
  ? `<img class="jr-item-img ${cls}" src="${esc(caminhoImg(src))}" alt="${esc(emoji)}" draggable="false"${filtro ? ` style="filter:${esc(filtro)}"` : ''} onerror="this.replaceWith(document.createTextNode(this.alt))"/>`
  : `<span class="jr-item-emoji ${cls}">${emoji}</span>`;
const MOEDA_CSS = '<span class="jr-moeda-css" aria-label="moedas"></span>';
const moedaHtml = (cls = '') => (icone('moeda')
  ? `<img class="jr-item-img jr-ic-moeda ${cls}" src="${esc(caminhoImg(icone('moeda')))}" alt="moedas" draggable="false" onerror="this.outerHTML='${MOEDA_CSS.replace(/"/g, '&quot;')}'"/>`
  : MOEDA_CSS);
// Os <img data-icone> fixos do HTML (contadores de moedas, botão da bolsa, aba das tintas) recebem o arquivo do JSON
function aplicarIcones(raiz = document) {
  for (const img of raiz.querySelectorAll('img[data-icone]')) {
    const src = icone(img.dataset.icone);
    // reserva: a moeda é desenhada por CSS (o emoji 🪙 aparece quebrado em fontes antigas); os outros, o emoji
    const reserva = () => { if (img.dataset.icone === 'moeda') img.outerHTML = MOEDA_CSS; else img.replaceWith(document.createTextNode(img.alt)); };
    if (!src) { reserva(); continue; }
    img.onerror = reserva;
    img.src = caminhoImg(src);
  }
}
const nivelPet = (pet) => nivelAmizade(cuidadosDe(pet)?.amizade);
const fomeAbaixo = () => cfgLoja().barriga?.fome_abaixo ?? 40;
const ondeDonaCida = () => 'Praça ou Mercado';   // a loja é um interior com porta na Praça e no Mercado Central

// Soma lealdade (acima de 100 vira amizade, que nunca cai); escreve no patch e avisa quando sobe de nível
function ganharLealdade(pet, n, patch = {}) {
  const c = cuidadosDe(pet);
  if (!c || !n) return patch;
  const antes = nivelAmizade(c.amizade);
  const r = somarLealdade(c.lealdade, c.amizade, n);
  c.lealdade = r.lealdade; c.amizade = r.amizade;
  const base = `pets/conquistados/${pet}`;
  patch[`${base}/lealdade`] = c.lealdade;
  if (r.amizade) patch[`${base}/amizade`] = c.amizade;
  const depois = nivelAmizade(c.amizade);
  if (depois > antes) {
    avisoPet(`❤️ Amizade com ${nomePet(pet)}: nível ${depois}!`, true);
    if (pet === estado.pets.ativo) enviarOnline(visualOnline(pet));
    verificarEvolucao(pet);
  }
  return patch;
}

// O que os colegas veem do meu pet
const visualOnline = (pet) => { const c = cuidadosDe(pet); return { pet_nome: c?.nome || null, pet_nivel: nivelPet(pet), pet_tinta: c?.tinta || null, pet_efeito: c?.efeito || null,
  pet_forma: formaDe(pet) }; };

// Tinta no <img> do pet (comSombra: o pet do mapa tem drop-shadow no CSS, que o filtro substituiria)
function aplicarTinta(img, tintaId, comSombra = false) {
  if (!img) return;
  const t = tintaId ? tinta(tintaId) : null;
  const animada = tintaAnimada(t);
  img.classList.toggle('jr-arco-iris', animada);
  img.style.filter = t && !animada ? t.filtro + (comSombra ? ' drop-shadow(0 1px 1px rgba(0,0,0,.35))' : '') : '';
}
// Tinta de um pet meu em qualquer tela (mapa, Meu Pet, duelo do ginásio, batalha, coleção, pedidos, HUD)
const aplicarVisualPet = (img, pet, comSombra = false) => aplicarTinta(img, pet ? cuidadosDe(pet)?.tinta : null, comSombra);
function atualizarVisualPet() {
  const pet = estado?.pets?.ativo;
  aplicarVisualPet($('pet'), pet, true);
  aplicarVisualPet($('btn-pet').querySelector('img'), pet);
  if (mp) aplicarVisualPet($('mp-img'), pet);
}

// ── Efeitos: partículas desenhadas por código (CSS, sem imagem), atrás do pet — o meu e o dos colegas ──
// andando: 1 a cada ~120 ms; parado: 1 de vez em quando (~2 s); no máximo 25 por pet ao mesmo tempo
const EFX_POR_PET = 25, EFX_ANDANDO_MS = 120, EFX_PARADO_MS = 2000, EFX_CORACAO_MS = 2500;
function emitirEfeito(seg, efeitoId, coracoes, agora) {
  if (!seg?.pet || semMovimento()) return;
  const st = seg._efx ||= { x: seg.x, y: seg.y, t: 0, tc: agora, n: 0 };
  const andando = dist(st.x, st.y, seg.x, seg.y) > 0.4;
  st.x = seg.x; st.y = seg.y;
  if (efeitoId && efeito(efeitoId) && st.n < EFX_POR_PET && agora - st.t >= (andando ? EFX_ANDANDO_MS : EFX_PARADO_MS)) {
    st.t = agora;
    soltarParticula(efeitoId, seg, st);
  }
  // amizade ❤️ 3: coraçõezinhos de vez em quando ao seguir, mesmo sem o efeito comprado
  if (coracoes && andando && st.n < EFX_POR_PET && agora - st.tc >= EFX_CORACAO_MS) { st.tc = agora; soltarParticula('coracoes', seg, st); }
}
function soltarParticula(tipo, seg, st) {
  const s = document.createElement('div');
  s.className = `jr-efx jr-efx-${tipo}`;
  const alt = seg.altura || 30, sorte = (a) => (Math.random() - 0.5) * a;
  // de onde sai: estrelas e faíscas no chão (pés), corações e bolhas do corpo, folhas de cima
  const altura = { estrelas: 0.08, faiscas: 0.04, coracoes: 0.55, bolhas: 0.45, folhas: 0.85 }[tipo] ?? 0.3;
  Object.assign(s.style, { left: seg.x + sorte(alt * 0.5) + 'px', top: seg.y - alt * altura + sorte(alt * 0.12) + 'px', zIndex: Math.round(seg.y) - 2 });
  s.style.setProperty('--e', ESCALA_ATORES);
  s.style.setProperty('--dx', sorte(14).toFixed(1) + 'px');
  s.style.setProperty('--gira', Math.round(sorte(360)) + 'deg');
  st.n++;
  let foi = false;
  const tirar = () => { if (foi) return; foi = true; st.n--; s.remove(); };
  s.addEventListener('animationend', tirar);
  setTimeout(tirar, 2200);
  $('cena-atores').appendChild(s);
}
function efeitosDoMapa() {
  const agora = performance.now(), pet = estado?.pets?.ativo, c = pet && cuidadosDe(pet);
  if (seguidor && c && !$('pet').hidden) emitirEfeito(seguidor, c.efeito, nivelPet(pet) >= 3, agora);
  for (const cg of colegas.values()) if (!cg.el.hidden && cg.pet) emitirEfeito(cg.seg, cg.reg?.pet_efeito, Number(cg.reg?.pet_nivel) >= 3, agora);
}

// ── Loja (no interior da loja: Dona Cida ou um dos cantos, que já abre na aba dele) ──
let lojaAba = 'comidas', lojaQtd = {}, lojaProva = null;
function abrirLoja(aba = 'comidas', provador = false) {
  if (!lojaPronta() || !estado?.pets) return;
  lojaAba = ['comidas', 'tintas', 'efeitos', 'pesca'].includes(aba) ? aba : 'comidas'; lojaQtd = {}; lojaProva = null;
  $('lj-msg').textContent = lojaAba === 'tintas' && provador ? 'Toque numa tinta para provar no pet 🐾' : '';
  if (ehLoja() && (provador || lojaAba === 'tintas')) subirNoPedestal();   // provador: o pet sobe no pedestal
  $('loja').hidden = false;
  renderLoja();
}
function renderLoja() {
  const moedas = Number(estado.pets.moedas) || 0, pet = estado.pets.ativo;
  $('lj-moedas').querySelector('span').textContent = moedas;
  for (const b of $('lj-abas').children) b.classList.toggle('ativa', b.dataset.aba === lojaAba);
  const falta = (preco) => Math.max(0, preco - moedas);
  // preço: texto simples (moeda + número); sem moedas, o número fica vermelho e o botão cinza "Faltam N"
  const preco = (v) => `<span class="lj-preco${falta(v) ? ' falta' : ''}">${moedaHtml()} <b>${v}</b></span>`;
  const botao = (id, v, rotulo) => falta(v)
    ? `<button class="lj-comprar" disabled>Faltam ${falta(v)}</button>`
    : `<button class="lj-comprar" data-comprar="${esc(id)}">${rotulo}</button>`;
  let html = '';
  if (lojaAba === 'comidas') {
    html = comidas().filter(c => c.venda_loja !== false).map(c => {
      const q = lojaQtd[c.id] || 1, fav = pet && ehFavorita(pet, c);
      return `<div class="lj-item">
        <div class="lj-emoji">${imgItem(c.imagem, c.emoji, 'jr-item-loja')}</div>
        <div class="lj-info"><b>${esc(c.nome)}</b>
          ${preco(c.preco * q)}
          <span>+${c.lealdade} lealdade${c.limite_semana ? ` · ${c.limite_semana}× por semana` : ''}</span>
          ${c.especial || fav ? `<span>${c.especial ? '<span class="lj-selo">come sem fome ✓</span>' : ''}${c.especial && fav ? ' ' : ''}${fav ? `<span class="lj-fav">❤️ favorita</span>` : ''}</span>` : ''}</div>
        <div class="lj-qtd"><button data-menos="${c.id}" aria-label="Menos">−</button><span>${q}</span><button data-mais="${c.id}" aria-label="Mais">+</button>
          <em title="Na bolsa">${imgItem(icone('bolsa'), '🎒', 'jr-ic-moeda')} ${Number(estado.pets.bolsa?.[c.id]) || 0}</em></div>
        ${botao(c.id, c.preco * q, 'Comprar')}
      </div>`;
    }).join('');
  } else if (lojaAba === 'pesca') {
    const ic = cfgPesca().isca || {}, p1 = ic.preco ?? 2, pn = ic.pacote ?? 5, pp = ic.preco_pacote ?? 10;
    const linha = (id, nome, v, sub) => `<div class="lj-item">
        <div class="lj-emoji">${imgItem((cfgLoja().itens_uso || []).find(x => x.id === 'isca')?.imagem, '🪱', 'jr-item-loja')}</div>
        <div class="lj-info"><b>${nome}</b>${preco(v)}<span>${sub}</span></div>
        ${botao(id, v, 'Comprar')}
      </div>`;
    html = linha('isca', 'Isca', p1, `cada lançamento gasta 1 · você tem ${iscas()}`) + linha('isca_pacote', `Pacote com ${pn} iscas`, pp, 'iscas não vencem');
    // na mesma aba: vender os peixes pescados
    const ps = peixesNaBolsa();
    html += '<div class="lj-secao">💰 Vender peixes</div>' + (ps.length ? ps.map(x => `<div class="lj-item">
        <div class="lj-emoji">${imgItem(x.imagem, x.emoji, 'jr-item-loja' + (x.raro ? ' raro' : ''), x.filtro)}</div>
        <div class="lj-info"><b>${esc(x.nome)}</b><span class="lj-preco">${moedaHtml()} <b>${x.venda}</b> cada</span><span>na bolsa: ${x.n}</span></div>
        <button class="lj-comprar" data-vender="${esc(x.id)}">Vender 1</button>
      </div>`).join('') : '<div class="lj-vazio">Você não tem peixes na bolsa. Pesque 🎣 e venda aqui.</div>');
  } else if (lojaAba === 'tintas') {
    const src = pet ? quadrosDe(formaDe(pet), 'sentado_girando')[0] : '';
    html = tintas().filter(t => !t.exclusiva).map(t => {   // Esmeralda e Cristal: só cavando
      const tem = !!estado.pets.tintas?.[t.id];
      return `<div class="lj-item lj-tinta${lojaProva === t.id ? ' provando' : ''}" data-provar="${esc(t.id)}">
        <div class="lj-previa">${src ? `<img src="${src}" alt="" draggable="false" data-tinta="${t.id}"${attrForma(pet, formaDe(pet))}/>` : ''}</div>
        <div class="lj-info"><b>${esc(t.nome)}</b>${tem ? '' : preco(t.preco)}</div>
        ${tem ? '<button class="lj-comprar ok" disabled>✓ Comprada</button>' : botao(t.id, t.preco, 'Comprar')}
      </div>`;
    }).join('');
  } else {
    html = efeitos().map(e => {
      const tem = !!estado.pets.efeitos?.[e.id];
      return `<div class="lj-item lj-efeito">
        <div class="lj-emoji lj-efx-amostra"><i class="jr-efx-forma jr-efx-${e.id}"></i><i class="jr-efx-forma jr-efx-${e.id}"></i><i class="jr-efx-forma jr-efx-${e.id}"></i></div>
        <div class="lj-info"><b>${esc(e.nome)}</b>${tem ? '' : preco(e.preco)}<span class="lj-sub">atrás do pet quando ele anda · todos os pets</span></div>
        ${tem ? '<button class="lj-comprar ok" disabled>✓ Comprado</button>' : botao(e.id, e.preco, 'Comprar')}
      </div>`;
    }).join('');
  }
  $('lj-itens').innerHTML = html;
  $('lj-itens').className = `lj-itens lj-${lojaAba}`;
  for (const img of $('lj-itens').querySelectorAll('img[data-tinta]')) aplicarTinta(img, img.dataset.tinta);
}
function cliqueLoja(e) {
  const aba = e.target.closest('[data-aba]');
  if (aba) {
    lojaAba = aba.dataset.aba;
    $('lj-msg').textContent = { tintas: ehLoja() ? 'Toque numa tinta para provar no pet 🐾 · comprada uma vez, vale para todos os seus pets.' : 'Comprada uma vez, a tinta vale para todos os seus pets.',
      pesca: 'Iscas para pescar e Dona Cida compra os peixes que você pescou.' }[lojaAba] || '';
    if (lojaAba === 'tintas' && ehLoja()) subirNoPedestal();
    renderLoja(); return;
  }
  const prova = e.target.closest('[data-provar]');
  if (prova && !e.target.closest('button') && petNoPedestal) {   // prévia no pet do pedestal (sem comprar)
    lojaProva = prova.dataset.provar;
    aplicarTinta($('pet'), lojaProva, true);
    renderLoja(); return;
  }
  const mais = e.target.closest('[data-mais]'), menos = e.target.closest('[data-menos]');
  if (mais || menos) { const id = (mais || menos).dataset[mais ? 'mais' : 'menos']; lojaQtd[id] = Math.max(1, Math.min(20, (lojaQtd[id] || 1) + (mais ? 1 : -1))); renderLoja(); return; }
  const b = e.target.closest('[data-comprar]');
  if (b) comprar(b.dataset.comprar);
  const v = e.target.closest('[data-vender]');
  if (v) venderPeixe(v.dataset.vender);
}
function venderPeixe(id) {
  const ps = estado.pets, item = itemDaBolsa(id), n = Number(ps.bolsa?.[id]) || 0;
  if (!item?.peixe || n <= 0) return;
  ps.bolsa[id] = n - 1;
  ps.moedas = (Number(ps.moedas) || 0) + item.venda;
  const patch = { [`pets/bolsa/${id}`]: n - 1 || null, 'pets/moedas': ps.moedas };
  registrarGanho('pesca', item.venda, patch);
  gravar(patch);
  tocar('acerto');
  renderLoja();
  $('lj-msg').textContent = `Vendeu ${comArtigo(item.nome)} por ${item.venda} moeda${item.venda === 1 ? '' : 's'}.`;
}
function comprar(id) {
  const ps = estado.pets, moedas = Number(ps.moedas) || 0, patch = {};
  let msg = '';
  if (lojaAba === 'pesca') {
    const ic = cfgPesca().isca || {}, pacote = id === 'isca_pacote';
    const q = pacote ? ic.pacote ?? 5 : 1, v = pacote ? ic.preco_pacote ?? 10 : ic.preco ?? 2;
    if (moedas < v) return;
    ps.moedas = moedas - v;
    ps.iscas = iscas() + q;
    patch['pets/iscas'] = ps.iscas;
    msg = `${q === 1 ? '1 isca' : `${q} iscas`} na bolsa 🪱 (você tem ${ps.iscas})`;
    atualizarBotaoLancar();
  } else if (lojaAba === 'comidas') {
    const c = comidas().find(x => x.id === id), q = lojaQtd[id] || 1;
    if (!c || moedas < c.preco * q) return;
    ps.moedas = moedas - c.preco * q;
    ps.bolsa = { ...(ps.bolsa || {}), [id]: (Number(ps.bolsa?.[id]) || 0) + q };
    patch[`pets/bolsa/${id}`] = ps.bolsa[id];
    msg = `${q} × ${c.nome} na bolsa (dê no "Meu Pet")`;
    lojaQtd[id] = 1;
  } else {
    const lista = lojaAba === 'tintas' ? tintas() : efeitos(), item = lista.find(x => x.id === id), chave = lojaAba;
    if (!item || moedas < item.preco || ps[chave]?.[id]) return;
    ps.moedas = moedas - item.preco;
    ps[chave] = { ...(ps[chave] || {}), [id]: true };
    patch[`pets/${chave}/${id}`] = true;
    // já veste o pet ativo (dá para trocar no "Meu Pet")
    const pet = ps.ativo, cp = pet && cuidadosDe(pet);
    if (cp) {
      cp[chave === 'tintas' ? 'tinta' : 'efeito'] = id;
      patch[`pets/conquistados/${pet}/${chave === 'tintas' ? 'tinta' : 'efeito'}`] = id;
      atualizarVisualPet();
      enviarOnline(visualOnline(pet));
    }
    msg = `Comprado! ${pet ? `${nomePet(pet)} já está usando.` : ''} Troque quando quiser no "Meu Pet".`;
  }
  patch['pets/moedas'] = ps.moedas;
  gravar(patch);
  tocar('vitoria');
  renderLoja();
  $('lj-msg').textContent = msg;
}

// ── Bolsa (no "Meu Pet"): dar comida ao pet ativo ──────────
function abrirBolsa() {
  if (!mp) return;
  bolsaSel = null;
  bolsaAba = 'comidas';
  renderBolsa();
  $('mp-bolsa-painel').hidden = false;
}
let bolsaSel = null, bolsaAba = 'comidas';   // peixe tocado na bolsa: mostra as opções
function renderBolsa() {
  for (const b of $('mp-bolsa-abas').children) b.classList.toggle('ativa', b.dataset.baba === bolsaAba);
  if (bolsaAba === 'itens') { $('mp-bolsa-itens').innerHTML = itensHtml(); return; }
  if (bolsaAba === 'colecao') { $('mp-bolsa-itens').innerHTML = CAVAR ? albumHtml() : '<div class="mp-bolsa-vazia">Coleção indisponível agora.</div>'; return; }
  const pet = mp.pet, itens = Object.entries(estado.pets.bolsa || {}).filter(([, n]) => Number(n) > 0).map(([id, n]) => ({ ...itemDaBolsa(id), n })).filter(x => x.id);
  $('mp-bolsa-itens').innerHTML = (itens.length ? itens.map(x => `
    <button class="mp-bolsa-item${bolsaSel === x.id ? ' sel' : ''}" data-comida="${esc(x.id)}">
      <span class="mp-bolsa-emoji">${imgItem(x.imagem, x.emoji, 'jr-item-bolsa' + (x.raro ? ' raro' : ''), x.filtro)}</span>
      <b>${esc(x.nome)}</b><span>× ${x.n} · +${x.lealdade} lealdade${ehFavorita(pet, x) ? ' ❤️' : ''}</span>
      ${x.especial ? '<em>come sem fome</em>' : ''}
    </button>${bolsaSel === x.id ? `<div class="mp-bolsa-acoes"><button class="jr-btn jr-btn-ouro" data-dar-pet="${esc(x.id)}">🍽️ Dar ao pet</button>
      <span>💰 Vender: loja da Dona Cida (aba Pesca) · 🎁 Presentear: toque num colega no mapa</span></div>` : ''}`).join('')
    : `<div class="mp-bolsa-vazia">A bolsa está vazia. Compre comida na loja da Dona Cida (${esc(ondeDonaCida())}) 🛒 ou pesque peixes 🎣.</div>`);
}
function darComida(id) {
  if (!mp || mp.ocupado) return;
  $('mp-bolsa-painel').hidden = true;
  const pet = mp.pet, c = cuidadosDe(pet), item = itemDaBolsa(id), n = Number(estado.pets.bolsa?.[id]) || 0;
  if (!c || !item || n <= 0) return;
  const b = barrigaDe(pet), cfg = cfgLoja().barriga || {}, hoje = diaLocal();
  const motivo = motivoNaoCome(item, b, c, new Date(), doDia(c.especiais_cheio_dia, hoje));
  if (motivo) {
    falarPet({ cheio: 'Tô cheio! 😵', sem_fome: `Ainda não tô com fome… (comida comum só com a barriga abaixo de ${cfg.comum_ate ?? 60})`, semana: 'Bolo só uma vez por semana!' }[motivo]);
    return;
  }
  const agora = Date.now(), base = `pets/conquistados/${pet}`;
  c.barriga = Math.min(cfg.cheia ?? 100, b + enche()); c.barriga_t = agora;
  estado.pets.bolsa[id] = n - 1;
  const patch = { [`${base}/barriga`]: Math.round(c.barriga * 10) / 10, [`${base}/barriga_t`]: agora, [`pets/bolsa/${id}`]: n - 1 || null };
  if (barrigaCheia(b)) {   // especial comida de barriga cheia: conta no limite do dia
    c.especiais_cheio_dia = { dia: hoje, n: doDia(c.especiais_cheio_dia, hoje) + 1 };
    patch[`${base}/especiais_cheio_dia`] = c.especiais_cheio_dia;
  }
  if (item.limite_semana) {
    const sem = semanaDe(), s = c.semana?.[id];
    c.semana = { ...(c.semana || {}), [id]: { semana: sem, n: (s?.semana === sem ? Number(s.n) || 0 : 0) + 1 } };
    patch[`${base}/semana/${id}`] = c.semana[id];
  }
  const fav = ehFavorita(pet, item);
  ganharLealdade(pet, item.lealdade + (fav ? cfgLoja().bonus_favorita ?? 0 : 0), patch);
  gravar(patch);
  missaoProgresso('alimentar');
  atualizarFomeSeguidor();
  renderMeuPet();
  mp.estado = 'comendo'; mp.ocupado = true;
  if (temAnim(mp.forma, 'assar_comida')) mp.anim.tocar('assar_comida', () => { if (mp?.estado === 'comendo') mp.anim.tocar('comendo'); });   // o dragão assa a comida antes
  else mp.anim.tocar('comendo');
  movimentoCorpo('come');
  const ic = imgItem(item.imagem, item.emoji, 'jr-item-part', item.filtro);
  particulas([ic, '✨', ic, '✨'], 6);
  if (fav) setTimeout(() => particulas(['💖', '❤️', '💗', '💖', '❤️'], 10), 250);   // a favorita: um coração estoura
  const fc = falasProntas() ? montarFala(contextoFalaDe(pet), 'carinho') : null;
  falarPet(fav ? 'Minha favorita! 💖' : fc?.baloes[0]?.texto || 'Hmm, que delícia!');
  tocar('acerto');
  verificarMarcosLealdade(pet);
}

// ── Tinta e efeito do pet ativo (entre os comprados) ───────
function abrirVisual() {
  if (!mp) return;
  renderVisual();
  $('mp-visual-painel').hidden = false;
}
function renderVisual() {
  const c = cuidadosDe(mp.pet), src = quadrosDe(mp.forma, 'sentado_girando')[0];
  const ts = tintas().filter(t => estado.pets.tintas?.[t.id]), es = efeitos().filter(e => estado.pets.efeitos?.[e.id]);
  const chip = (tipo, id, conteudo, sel) => `<button class="mp-chip${sel ? ' sel' : ''}" data-${tipo}="${id}">${conteudo}</button>`;
  $('mp-visual-tintas').innerHTML = chip('tinta', '', 'Nenhuma', !c.tinta) +
    ts.map(t => chip('tinta', t.id, `<img src="${src}" alt="" draggable="false" data-previa="${t.id}"${attrForma(mp.pet, mp.forma)}/>${esc(t.nome)}`, c.tinta === t.id)).join('');
  $('mp-visual-efeitos').innerHTML = chip('efeito', '', 'Nenhum', !c.efeito) +
    es.map(e => chip('efeito', e.id, `${e.emoji} ${esc(e.nome)}`, c.efeito === e.id)).join('');
  for (const img of $('mp-visual-tintas').querySelectorAll('img[data-previa]')) aplicarTinta(img, img.dataset.previa);
  $('mp-visual-dica').hidden = !!(ts.length || es.length);
  $('mp-visual-dica').textContent = `Compre tintas e efeitos na loja da Dona Cida (${ondeDonaCida()}) 🛒.`;
  // pet que já evoluiu: pode voltar a aparecer como filhote (vale também para os colegas online)
  $('mp-forma-bloco').hidden = !(formaAdulta(mp.pet) && c.evoluido);
  const filhote = !!c.mostrar_filhote, b = $('mp-filhote');
  b.setAttribute('aria-checked', String(filhote));
  b.classList.toggle('ligado', filhote);
  $('mp-filhote-txt').textContent = `Mostrar como filhote: ${filhote ? 'ligado' : 'desligado'}`;
}
function alternarFilhote() {
  if (!mp) return;
  const pet = mp.pet, c = cuidadosDe(pet);
  if (!c?.evoluido) return;
  c.mostrar_filhote = !c.mostrar_filhote;
  gravar({ [`pets/conquistados/${pet}/mostrar_filhote`]: c.mostrar_filhote || null });
  aplicarForma(pet);
  renderVisual();
}
// A forma do pet mudou (evoluiu ou o aluno trocou adulto/filhote): atualiza tudo o que mostra o pet ativo
function aplicarForma(pet) {
  if (pet !== estado.pets.ativo) return;
  const forma = formaDe(pet);
  preCarregarPet(forma);
  if (seguidor) { const { x, y } = seguidor; seguidor.definir(pet, forma); if (cena) seguidor.colocar(x, y); }
  if (mp?.pet === pet) { mp.forma = forma; mp.anim.definir(forma); medirMeuPet(); voltarAoNormal(); }
  atualizarBotaoPet();
  atualizarVisualPet();
  enviarOnline(visualOnline(pet));
}
function escolherVisual(e) {
  const b = e.target.closest('[data-tinta], [data-efeito]');
  if (!b || !mp) return;
  const pet = mp.pet, c = cuidadosDe(pet), campo = 'tinta' in b.dataset ? 'tinta' : 'efeito', v = b.dataset[campo] || null;
  c[campo] = v;
  gravar({ [`pets/conquistados/${pet}/${campo}`]: v });
  atualizarVisualPet();
  enviarOnline(visualOnline(pet));
  renderVisual();
}

// ── Nome do pet ─────────────────────────────────────────────
function abrirNomear() {
  if (!mp) return;
  const c = cuidadosDe(mp.pet);
  $('mp-nome-input').value = c.nome || '';
  $('mp-nome-input').placeholder = NOME_PET[mp.pet];
  $('mp-nome-erro').textContent = '';
  $('mp-nome-padrao').textContent = `Usar "${NOME_PET[mp.pet]}"`;
  $('mp-nome-padrao').hidden = !c.nome;
  $('mp-nomear').hidden = false;
  $('mp-nome-input').focus();
}
function salvarNomePet(padrao = false) {
  if (!mp) return;
  const pet = mp.pet, c = cuidadosDe(pet);
  let nome = null;
  if (!padrao) {
    const r = validarNomePet($('mp-nome-input').value);
    if (r.erro) { $('mp-nome-erro').textContent = r.erro; return; }
    nome = r.nome;
  }
  c.nome = nome;
  gravar({ [`pets/conquistados/${pet}/nome`]: nome });
  $('mp-nomear').hidden = true;
  renderMeuPet();
  enviarOnline(visualOnline(pet));
  if (nome) falarPet(`${nome}? Adorei! 💜`);
}

// ============================================================
//  PESCA — 3 pontos (dados/jogo/pesca.json), poses de pesca de cada personagem (pesca-sprites.json)
// ============================================================
let pesca = null;   // { ponto, dir, s, img, svg, exc, estado, pose, timers, peixe, barra, segurando }
const POSES_LINHA = ['esperando', 'beliscando', 'atento', 'puxando'];
const BOIA = [800, 560];   // ponto da boia no canvas da pose (na água, um pouco abaixo da altura do caixote)

function pescaDia() {
  const hoje = diaLocal();
  if (estado.pescaDia?.data !== hoje) estado.pescaDia = { data: hoje, n: 0 };   // n: peixes pegos hoje; aviso: já avisou da pesca esportiva
  return estado.pescaDia;
}
const pontoLiberado = (p) => !!estado.ginasios[chaveGinasio(p.mapa, cfgPesca().libera_apos_ginasio || 'A')]?.lider.vencido;

// Caixote com 🎣 nos pontos liberados do mapa
function montarCaixotes(n) {
  if (!pescaPronta()) return;
  for (const p of pontosDoMapa(n)) {
    if (!pontoLiberado(p)) continue;
    const el = document.createElement('div');
    el.className = 'jr-caixote';
    el.dataset.ponto = p.id;
    el.innerHTML = `<span class="jr-caixote-marca">🎣</span><span class="jr-caixote-nome" hidden>${esc(p.nome)}</span>`;
    Object.assign(el.style, { left: p.x + 'px', top: p.y + 'px', zIndex: Math.round(p.y), fontSize: 10 * ESCALA_ATORES + 'px' });
    // ondinhas na água à frente do ponto (onde a boia cai)
    const [ox, oy] = pontoDaBoia(p);
    const ondas = document.createElement('div');
    ondas.className = 'jr-pesca-ondas';
    ondas.dataset.ponto = p.id;
    ondas.innerHTML = '<i></i><i></i>';
    Object.assign(ondas.style, { left: ox + 'px', top: oy + 'px', zIndex: Math.round(p.y) - 1, fontSize: 10 * ESCALA_ATORES + 'px' });
    $('cena-atores').append(ondas, el);
  }
}
// onde a boia cai (canvas BOIA da pose → mapa), para as ondinhas do ponto
function pontoDaBoia(p) {
  const sp = spritePesca(), dir = p.lado === 'esq' ? -1 : 1;
  return [p.x + dir * (BOIA[0] - sp.ancora[0]) * ESCALA_SPRITE, p.y + (BOIA[1] - sp.ancora[1]) * ESCALA_SPRITE];
}
const iscas = () => Number(estado.pets?.iscas) || 0;
// a cada quadro no mapa: nome do ponto quando o personagem chega perto (depois do limite do dia vira pesca esportiva)
function atualizarCaixotes() {
  for (const el of document.querySelectorAll('.jr-caixote')) {
    const p = pontosDoMapa(cena.n).find(x => x.id === el.dataset.ponto);
    if (!p) continue;
    const perto = !pesca && dist(jog.x, jog.y, p.x, p.y) < PESSOA_PERTO * 1.6;
    const nome = el.querySelector('.jr-caixote-nome');
    if (nome.hidden === perto) nome.hidden = !perto;
  }
}
// "Mostrar": a câmera vai até o ponto por uns segundos e o marcador pisca 3 vezes
let camFoco = null;   // { x, y, ate }
function mostrarPontoPesca(p) {
  camFoco = { x: p.x, y: p.y, ate: performance.now() + 2600 };
  const el = document.querySelector(`.jr-caixote[data-ponto="${p.id}"]`);
  if (el) { el.classList.remove('pisca'); void el.offsetWidth; el.classList.add('pisca'); }
}
const jaPescouEm = (id) => Object.values(estado.respostas || {}).some(r => r?.tipo === 'pesca' && r.ponto === id);
// Aviso "agora você pode pescar": ao entrar no mapa com o ponto liberado e sem nunca ter pescado ali (uma vez por ponto)
function avisarPescaLiberada(n) {
  if (!pescaPronta() || !$('pesca-aviso').hidden) return;
  const p = pontosDoMapa(n).find(x => pontoLiberado(x) && !estado.avisos[`pesca_${x.id}`] && !jaPescouEm(x.id));
  if (!p) return;
  estado.avisos[`pesca_${p.id}`] = true;
  gravar({ [`avisos/pesca_${p.id}`]: true });
  $('pesca-aviso-txt').innerHTML = `🎣 Agora você pode pescar no <b>${esc(p.nome)}</b>! Procure o caixote perto da água.`;
  $('pesca-aviso').dataset.ponto = p.id;
  $('pesca-aviso').querySelector('[data-aviso="mostrar"]').hidden = false;
  $('pesca-aviso').querySelector('[data-aviso="depois"]').textContent = 'Depois';
  $('pesca-aviso').hidden = false;
}
// Primeira pesca da vida: balões curtos antes do 1º lançamento (toque para avançar)
const TUTORIAL_PESCA = ['Toque em 🪱 Lançar: cada lançamento gasta 1 isca (a Dona Cida vende).', 'Espere a boia afundar… quando aparecer ❗, toque rápido no 🎣 PUXAR!',
  'Segure o dedo na tela (ou o espaço) para subir a zona verde e deixe o peixe dentro dela até a barra encher.',
  'Os 5 primeiros peixes do dia vão para a 🎒 Bolsa. Todo peixe vale pontos no ranking da semana 🏆'];
function tutorialPesca(depois) {
  let i = 0;
  const el = $('pesca-tutorial');
  const mostrar = () => { $('pesca-tutorial-txt').textContent = TUTORIAL_PESCA[i]; $('pesca-tutorial-n').textContent = `${i + 1}/${TUTORIAL_PESCA.length} · toque para continuar`; };
  el.onclick = (e) => {
    e.stopPropagation();
    if (++i < TUTORIAL_PESCA.length) { mostrar(); return; }
    el.hidden = true; el.onclick = null;
    estado.avisos.tutorial_pesca = true;
    gravar({ 'avisos/tutorial_pesca': true });
    if (pesca) depois();
  };
  mostrar();
  el.hidden = false;
}

function caixoteEm(pt) {
  if (cena?.tipo !== 'mapa' || !pescaPronta()) return null;
  const r = 22 * ESCALA_ATORES;
  return pontosDoMapa(cena.n).find(p => pontoLiberado(p) && Math.abs(pt.x - p.x) < r && pt.y > p.y - r * 1.6 && pt.y < p.y + r * 0.5) || null;
}

function irPescar(ponto) {
  if (pesca) sairPesca();
  destinoEspecial = null;
  if (dist(jog.x, jog.y, ponto.x, ponto.y) < 30) { sentarPesca(ponto); return; }
  caminharNaTrilha(ponto.x, ponto.y, () => sentarPesca(ponto));
  if (!jog.caminho.length && !jog.aoChegar) sentarPesca(ponto);
}

// Canvas da pose → coordenadas do mapa (a âncora fica no ponto; lado "esq": espelhado)
function pescaNoMapa(cx, cy) {
  const sp = spritePesca(), [ax, ay] = sp.ancora;
  return [pesca.ponto.x + pesca.dir * (cx - ax) * pesca.s, pesca.ponto.y + (cy - ay) * pesca.s];
}

function sentarPesca(ponto) {
  if (cena?.tipo !== 'mapa' || perguntaAberta || transicionando) return;
  esconderAcaoMapa();
  const sp = spritePesca();
  const s = ESCALA_SPRITE;   // mesma escala das imagens de andar
  const dir = ponto.lado === 'esq' ? -1 : 1;
  pesca = { ponto, dir, s, estado: 'sentando', pose: '', timers: [] };
  jog.caminho = []; jog.aoChegar = null;
  jog.x = ponto.x; jog.y = ponto.y;   // o pet vem sentar ao lado
  $('jogador').style.visibility = 'hidden';
  const img = document.createElement('img');
  img.className = 'jr-pesca-img'; img.alt = ''; img.draggable = false;
  const larg = sp.largura * s, alt = sp.altura * s;
  Object.assign(img.style, { left: (ponto.x - (dir > 0 ? sp.ancora[0] : sp.largura - sp.ancora[0]) * s) + 'px', top: (ponto.y - sp.ancora[1] * s) + 'px',
    width: larg + 'px', height: alt + 'px', zIndex: Math.round(ponto.y) + 1, transform: dir < 0 ? 'scaleX(-1)' : '' });
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'jr-pesca-linha');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.zIndex = Math.round(ponto.y) + 2;
  svg.innerHTML = `<path class="linha" fill="none"/><g class="boia"><ellipse class="onda o1" rx="5" ry="1.6"/><ellipse class="onda o2" rx="5" ry="1.6"/>
    <g class="corpo"><circle r="2.6" fill="#fff" stroke="#222" stroke-width=".5"/><path d="M-2.6 0 A2.6 2.6 0 0 1 2.6 0 Z" fill="#e8283c"/></g></g>`;
  const exc = document.createElement('div');
  exc.className = 'jr-pesca-exc'; exc.textContent = '!'; exc.hidden = true;
  const [hx, hy] = pescaNoMapa(260, 70);
  Object.assign(exc.style, { left: hx + 'px', top: hy + 'px', fontSize: 14 * ESCALA_ATORES + 'px' });
  $('cena-atores').append(img, svg, exc);
  Object.assign(pesca, { img, svg, exc });
  $('btn-levantar').hidden = false;
  const marca = document.querySelector(`.jr-caixote[data-ponto="${ponto.id}"]`);
  if (marca) marca.hidden = true;   // o caixote da pose substitui o do mapa
  fecharBalaoPessoa();
  pararFalaPet();
  seguidor?.colocar(ponto.x - dir * 34 * ESCALA_ATORES, ponto.y + 3);   // o pet senta ao lado do caixote
  $('btn-pesca-ranking').hidden = false;
  if (!estado.avisos.tutorial_pesca) { pescaPose('esperando'); pesca.estado = 'tutorial'; tutorialPesca(pescaPronto); return; }
  pescaPronto();
}

function pescaPose(pose) {
  if (!pesca) return;
  pesca.pose = pose;
  atualizarBotaoPuxar();
  const src = `${PERS.pasta}/${meuPersonagem()}/pesca-${pose}.webp`;
  if (pesca.img.getAttribute('src') !== src) pesca.img.src = src;
  desenharLinhaPesca();
}
function desenharLinhaPesca() {
  const { svg, pose } = pesca;
  const tipCv = POSES_LINHA.includes(pose) ? pontaVara(meuPersonagem(), pose) : null;
  svg.classList.toggle('sem-linha', !tipCv);
  if (!tipCv) return;
  const [tx, ty] = pescaNoMapa(...tipCv), [bx, by] = pescaNoMapa(...BOIA);
  const fundo = pesca.estado === 'fisgada' ? 2.5 : 0;
  const cx = (tx + bx) / 2, cy = Math.max(ty, by) + 6;   // a linha faz uma curvinha
  svg.querySelector('.linha').setAttribute('d', `M${tx.toFixed(1)} ${ty.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${bx.toFixed(1)} ${(by + fundo).toFixed(1)}`);
  svg.querySelector('.boia').setAttribute('transform', `translate(${bx.toFixed(1)} ${by.toFixed(1)})`);
  svg.classList.toggle('mexe', pose === 'beliscando');
  svg.classList.toggle('afunda', pesca.estado === 'fisgada');
}
const pescaDepois = (fn, ms) => { const t = setTimeout(() => { if (pesca) fn(); }, ms); pesca.timers.push(t); return t; };
const limparTimersPesca = () => { pesca?.timers.forEach(clearTimeout); if (pesca) pesca.timers = []; };

// 0. pronto: o botão 🪱 Lançar (ou o espaço, ou tocar perto do caixote) gasta 1 isca e joga a linha
function pescaPronto() {
  if (!pesca) return;
  limparTimersPesca();
  pesca.estado = 'pronto';
  pescaPose('esperando');
  atualizarBotaoLancar();
}
// 🎣 embaixo à direita: cinza esperando (não faz nada), dourado pulsando no ❗ (puxa), "Segure!" na barrinha
function atualizarBotaoPuxar() {
  const b = $('btn-puxar'), e = pesca?.estado;
  b.hidden = !(e === 'espera' || e === 'fisgada' || e === 'barrinha');
  b.className = 'jr-btn jr-pesca-puxar ' + (e === 'fisgada' ? 'agora' : e === 'barrinha' ? 'segure' : 'esperando');
  b.textContent = e === 'fisgada' ? '🎣 PUXAR!' : e === 'barrinha' ? '✊ Segure!' : '🎣 Esperando…';
}
function atualizarBotaoLancar() {
  const b = $('btn-lancar');
  b.hidden = pesca?.estado !== 'pronto';
  b.innerHTML = `🪱 Lançar <small>(${iscas()})</small>`;
}
function pescaLancar() {
  if (pesca?.estado !== 'pronto') return;
  if (iscas() <= 0) { semIsca(); return; }
  estado.pets.iscas = iscas() - 1;
  gravar({ 'pets/iscas': estado.pets.iscas });
  pescaEsperar();
}
// Sem isca: o aviso diz onde a Dona Cida está (o botão "Mostrar" só vale para o ponto de pesca)
function semIsca() {
  tocar('erro');
  $('pesca-aviso-txt').innerHTML = `🪱 Você precisa de isca. Vá à loja da <b>Dona Cida</b> (${esc(ondeDonaCida())}) 🛒`;
  $('pesca-aviso').dataset.ponto = '';
  $('pesca-aviso').querySelector('[data-aviso="mostrar"]').hidden = true;
  $('pesca-aviso').querySelector('[data-aviso="depois"]').textContent = 'OK';
  $('pesca-aviso').hidden = false;
}

// 1. espera (às vezes beliscadas falsas) → 2. fisgada com ❗ (tempo para tocar)
function pescaEsperar() {
  if (!pesca) return;
  limparTimersPesca();
  const cfg = cfgPesca();
  pesca.estado = 'espera';
  atualizarBotaoLancar();
  pescaPose('esperando');
  const espera = entre(cfg.espera_s || [3, 8]) * 1000, falsas = inteiroEntre(cfg.beliscadas_falsas || [0, 2]);
  for (let i = 1; i <= falsas; i++) pescaDepois(pescaBeliscada, espera * i / (falsas + 1));
  pescaDepois(pescaFisgada, espera);
}
function pescaBeliscada() {
  if (pesca.estado !== 'espera') return;
  pescaPose('beliscando');
  pescaDepois(() => { if (pesca.estado === 'espera') pescaPose('esperando'); }, 650);
}
function pescaFisgada() {
  if (pesca.estado !== 'espera') return;
  pesca.estado = 'fisgada';
  pescaPose('atento');
  pesca.exc.hidden = false;
  tocar('clique');
  pescaDepois(() => { if (pesca.estado === 'fisgada') pescaEscapou(); }, (cfgPesca().tempo_fisgar_s ?? 1.2) * 1000);
}
// 3. tocou a tempo: puxa e abre o minijogo da barrinha (sem conta). Segurar sobe a zona verde; soltar, ela cai.
function pescaPuxar() {
  if (pesca?.estado !== 'fisgada') return;
  limparTimersPesca();
  pesca.estado = 'barrinha';
  pesca.exc.hidden = true;
  pescaPose('puxando');
  const f = sortearPeixe(pesca.ponto);
  pesca.peixe = f;
  pesca.barra = criarBarrinha(f?.dificuldade);
  pesca.segurando = false;
  $('pb-zona').style.height = pesca.barra.h * 100 + '%';
  $('pb-peixe').innerHTML = imgItem(f.imagem, f.raro ? '🐠' : '🐟', 'jr-item-peixe' + (f.raro ? ' raro' : ''), f.filtro);
  desenharBarrinha(pesca.barra);
  $('pesca-barra').hidden = false;
  let t0 = performance.now();
  const tick = (agora) => {
    if (pesca?.estado !== 'barrinha') return;
    const b = passoBarrinha(pesca.barra, Math.max(0, agora - t0) / 1000, pesca.segurando);
    t0 = agora;
    desenharBarrinha(b);
    if (b.fim) { fimBarrinha(b.fim); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function desenharBarrinha(b) {
  $('pb-zona').style.bottom = b.z * 100 + '%';
  $('pb-zona').classList.toggle('dentro', !!b.dentro);
  $('pb-peixe').style.bottom = b.y * 100 + '%';
  $('pb-captura').style.height = b.captura * 100 + '%';
  $('pb-trilho').classList.toggle('treme', !b.dentro && !semMovimento());   // movimento reduzido: sem tremer
}
function fimBarrinha(fim) {
  pesca.segurando = false;
  setTimeout(() => { $('pesca-barra').hidden = true; }, fim === 'pegou' ? 250 : 500);
  if (fim === 'pegou') pescaPegou(pesca.peixe);
  else { tocar('erro'); pescaEscapou(500); }
}
// 4. pegou: os primeiros do dia vão para a bolsa; depois do limite é pesca esportiva (o peixe volta para a água).
//    Todo peixe pego vale pontos no ranking da semana.
function pescaPegou(f) {
  pesca.estado = 'festa';
  missaoProgresso('pescar');
  const dia = pescaDia(), lim = cfgPesca().limite_peixes_dia ?? 5, pts = Number(f.pontos) || 0;
  const esportiva = dia.n >= lim, patch = {};
  if (!esportiva) {
    const ps = estado.pets, id = idDoPeixe(f.id);
    ps.bolsa = { ...(ps.bolsa || {}), [id]: (Number(ps.bolsa?.[id]) || 0) + 1 };
    patch[`pets/bolsa/${id}`] = ps.bolsa[id];
  }
  dia.n++;
  const avisar = dia.n >= lim && !dia.aviso;   // acabou de pegar o 5º: avisa da pesca esportiva (uma vez por dia)
  if (avisar) dia.aviso = true;
  patch.pesca_dia = { ...dia };
  gravar(patch);
  somarPontosPesca(pts);
  tocar('acerto');
  pescaPose('peixe');
  pescaDepois(() => pescaPose('levantando'), 900);
  pescaDepois(() => {
    pescaPose('comemorando'); tocar('vitoria'); mostrarPeixe(f, esportiva, pts);
    if (esportiva) { const [bx, by] = pescaNoMapa(...BOIA); avisarEm('🐟💨 De volta para a água!', bx, by); }
  }, 1800);
  pescaDepois(() => {
    if (avisar) avisoPet(`Você já pegou ${lim} peixes hoje. Agora é pesca esportiva: os peixes voltam para a água e valem pontos no ranking! 🏆`, true);
    pescaPronto();
  }, 4200);
}
function mostrarPeixe(f, esportiva = false, pts = 0) {
  const el = $('pesca-cartao');
  const artigo = /a$/i.test(f.nome) ? 'uma' : 'um';
  const det = esportiva ? `Pesca esportiva: voltou para a água · +${pts} pontos 🏆` : `Foi para a bolsa · +${pts} pontos 🏆 · +${f.lealdade} lealdade quando o pet comer`;
  el.innerHTML = `<span class="pc-peixe">${imgItem(f.imagem, f.raro ? '🐠' : '🐟', 'jr-item-peixe' + (f.raro ? ' raro' : ''), f.filtro)}</span><span>Você pescou ${artigo} <b>${esc(f.nome)}</b>!${f.raro ? ' ✨' : ''}<small>${det}</small></span>`;
  el.classList.toggle('raro', !!f.raro);
  el.hidden = false;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  clearTimeout(mostrarPeixe.t);
  mostrarPeixe.t = setTimeout(() => { el.hidden = true; }, 2600);
}
// 5. não fisgou a tempo ou o peixe escapou da barrinha
function pescaEscapou(atraso = 0) {
  if (!pesca) return;
  limparTimersPesca();
  pesca.exc.hidden = true;
  pesca.estado = 'escapou';
  pescaPose('esperando');
  const [hx, hy] = pescaNoMapa(300, 40);
  pescaDepois(() => avisarEm('Escapou! 🐟💨', hx, hy), atraso);
  pescaDepois(pescaPronto, atraso + 1500);
}

// ── Ranking semanal de pesca: jogo_revisao_pesca/{segunda}/{uid} = { pontos, nome, turma, ts } (modo teste: _teste) ──
// Professora e alunos de teste não entram; os 3 primeiros da semana anterior ganham 🥇🎣 🥈🎣 🥉🎣 ao lado do nome.
const MEDALHAS_PESCA = ['🥇🎣', '🥈🎣', '🥉🎣'];
let premiosPesca = {};   // uid → medalha (semana anterior)
const basePesca = () => (teste ? 'jogo_revisao_pesca_teste' : 'jogo_revisao_pesca');
const nomeRanking = () => (ehProfessora() ? 'Professora' : apelidoAluno || String(sessao?.nome || '').split(' ')[0]);
const entraNoRanking = () => !ehProfessora() && !ALUNOS_TESTE.includes(sessao.uid) && (teste || TURMAS_PLACAR.includes(sessao.turma));
const visivelNoRanking = (uid, r) => !!r && (teste || (!ALUNOS_TESTE.includes(uid) && !/PROFESSOR|TESTE/i.test(`${uid} ${r.nome || ''}`) && TURMAS_PLACAR.includes(r.turma)));
const medalhaPesca = (uid) => (premiosPesca[uid] ? ' ' + premiosPesca[uid] : '');

async function somarPontosPesca(pts) {
  if (!pts || !carregouProgresso || !entraNoRanking()) return;
  try {
    await update(ref(db, `${basePesca()}/${semanaPesca()}/${sessao.uid}`), { pontos: increment(pts), nome: nomeRanking(), turma: sessao.turma || '', pers: meuPersonagem(), ts: Date.now() });
  } catch (e) { console.warn('[jogo-revisao] ranking de pesca indisponível', e?.code || e); }
}
async function lerRankingPesca(semana) {
  const s = await get(ref(db, `${basePesca()}/${semana}`));
  const v = s.exists() ? s.val() || {} : {};
  return Object.entries(v).filter(([uid, r]) => visivelNoRanking(uid, r))
    .map(([uid, r]) => ({ uid, nome: nomeVisivel(r.nome) || 'Aluno', turma: r.turma || '', pers: r.pers || null, pontos: Number(r.pontos) || 0, ts: Number(r.ts) || 0 }))
    .filter(r => r.pontos > 0).sort((a, b) => b.pontos - a.pontos || a.ts - b.ts);
}
// Ao entrar no jogo: medalhas da semana anterior (e o aviso para quem ganhou, uma vez)
async function carregarPremiosPesca() {
  try {
    const ant = semanaAnterior(semanaPesca());
    const lista = await lerRankingPesca(ant);
    premiosPesca = Object.fromEntries(lista.slice(0, 3).map((r, i) => [r.uid, MEDALHAS_PESCA[i]]));
    const i = lista.findIndex(r => r.uid === sessao.uid), chave = `pesca_premio_${ant}`;
    if (i >= 0 && i < 3 && !estado.avisos[chave] && carregouProgresso) {
      estado.avisos[chave] = true;
      gravar({ [`avisos/${chave}`]: true });
      avisoPet(`Você foi o ${i + 1}º melhor pescador da semana! ${MEDALHAS_PESCA[i]}`, true);
    }
    for (const c of colegas.values()) atualizarColega(c, c.reg);   // etiquetas com a medalha
  } catch (e) { console.warn('[jogo-revisao] prêmios da pesca indisponíveis', e?.code || e); }
}

let rankingPesca = { lista: [], filtro: 'escola' };
async function abrirRankingPesca() {
  rankingPesca.filtro = 'escola';
  $('pr-lista').innerHTML = '<li class="pr-vazio">Carregando…</li>';
  $('pr-voce').textContent = '';
  $('pesca-ranking').hidden = false;
  try { rankingPesca.lista = await lerRankingPesca(semanaPesca()); }
  catch (e) { rankingPesca.lista = null; }
  renderRankingPesca();
}
function renderRankingPesca() {
  for (const b of $('pr-abas').children) b.classList.toggle('ativa', b.dataset.pr === rankingPesca.filtro);
  $('pr-abas').querySelector('[data-pr="turma"]').hidden = !TURMAS_PLACAR.includes(sessao.turma);
  if (!rankingPesca.lista) { $('pr-lista').innerHTML = '<li class="pr-vazio">Não deu para carregar o ranking agora.</li>'; return; }
  const lista = rankingPesca.filtro === 'turma' ? rankingPesca.lista.filter(r => r.turma === sessao.turma) : rankingPesca.lista;
  $('pr-lista').innerHTML = lista.slice(0, 10).map((r, i) => `
    <li class="${r.uid === sessao.uid ? 'eu' : ''}"><span class="pr-pos">${i + 1}º</span><span class="pr-nome">${nomeT(r.uid, r.nome)}${esc(medalhaPesca(r.uid))} <small>${esc(r.turma)}</small></span><b>${r.pontos} pts</b></li>`).join('')
    || '<li class="pr-vazio">Ninguém pescou esta semana ainda. Seja o primeiro! 🎣</li>';
  const i = lista.findIndex(r => r.uid === sessao.uid);
  $('pr-voce').textContent = !entraNoRanking() ? (ehProfessora() ? 'A professora não entra no ranking.' : 'Esta conta não entra no ranking.')
    : i >= 0 ? `Você: ${i + 1}º · ${lista[i].pontos} pts` : 'Você ainda não pescou esta semana.';
}

// ── Presentes: 1 peixe por vez para um colega online, até presentes_dia por dia ──
// jogo_revisao_presentes/{quem recebe}/{id} = { de, de_nome, de_turma, para_nome, peixe, ts, recebido } (modo teste: _teste)
const basePresentes = () => (teste ? 'jogo_revisao_presentes_teste' : 'jogo_revisao_presentes');
const presentesHoje = () => (estado.presentesDia?.data === diaLocal() ? Number(estado.presentesDia.n) || 0 : 0);
const peixesNaBolsa = () => Object.entries(estado.pets?.bolsa || {}).filter(([id, n]) => id.startsWith('pesca_') && Number(n) > 0)
  .map(([id, n]) => ({ ...itemDaBolsa(id), n: Number(n) })).filter(x => x.id);
const comArtigo = (nome) => `${/a$/i.test(nome) ? 'uma' : 'um'} ${nome}`;

function escolherPresente(c) {
  const el = $('colega-cartao');
  clearTimeout(cartaoColega.timer);
  cartaoColega.timer = setTimeout(fecharCartaoColega, 12000);
  const lim = cfgPesca().presentes_dia ?? 3, ps = peixesNaBolsa(), falta = lim - presentesHoje();
  const msg = falta <= 0 ? `Você já deu ${lim} presentes hoje. Amanhã tem mais!` : !ps.length ? 'Você não tem peixes na bolsa. Vá pescar 🎣' : '';
  el.innerHTML = `<span class="jr-colega-info jr-presente">
    <b>🎁 Dar 1 peixe para ${esc(rotuloColega(c.uid, c.reg))}</b>
    ${msg ? `<small>${msg}</small>` : `<span class="jr-presente-lista">${ps.map(x => `<button data-dar="${esc(x.id)}">${imgItem(x.imagem, x.emoji, 'jr-item-peixe' + (x.raro ? ' raro' : ''), x.filtro)}<span>${esc(x.nome)} ×${x.n}</span></button>`).join('')}</span>
      <small>Pode dar mais ${falta} hoje</small>`}
  </span>`;
  posicionarCartaoColega();
}
async function darPresente(c, id) {
  const item = itemDaBolsa(id), n = Number(estado.pets.bolsa?.[id]) || 0, lim = cfgPesca().presentes_dia ?? 3;
  if (!item || n <= 0 || presentesHoje() >= lim || !carregouProgresso) return;
  const uid = c.uid, r = c.reg || {}, para = rotuloColega(uid, r);
  fecharCartaoColega();
  try {
    await push(ref(db, `${basePresentes()}/${uid}`), { de: sessao.uid, de_nome: nomeRanking(), de_turma: sessao.turma || '', para_nome: r.apelido || '', peixe: id, ts: Date.now() });
  } catch (e) {
    console.warn('[jogo-revisao] presente indisponível', e?.code || e);
    avisoPet('Não deu para enviar o presente agora. Tente de novo mais tarde.');
    return;
  }
  estado.pets.bolsa[id] = n - 1;
  estado.presentesDia = { data: diaLocal(), n: presentesHoje() + 1 };
  gravar({ [`pets/bolsa/${id}`]: n - 1 || null, presentes_dia: estado.presentesDia });
  tocar('vitoria');
  avisoPet(`🎁 Você deu ${comArtigo(item.nome)} para ${para}!`);
}
// Quem recebe: ouve a própria caixa; cada presente entra na bolsa uma vez só (recebido marcado por transação)
let pararPresentes = null;
const presentesEmAndamento = new Set();
function ouvirPresentes() {
  if (pararPresentes || !carregouProgresso) return;
  try {
    pararPresentes = onValue(ref(db, `${basePresentes()}/${sessao.uid}`), (snap) => {
      const v = snap.exists() ? snap.val() || {} : {};
      for (const [k, p] of Object.entries(v)) if (p && !p.recebido) receberPresente(k, p);
    }, () => {});
  } catch (_) { pararPresentes = null; }
}
async function receberPresente(k, p) {
  if (presentesEmAndamento.has(k)) return;
  presentesEmAndamento.add(k);
  try {
    const t = await runTransaction(ref(db, `${basePresentes()}/${sessao.uid}/${k}/recebido`), (cur) => (cur ? undefined : Date.now()));
    if (!t.committed) return;
  } catch (_) { presentesEmAndamento.delete(k); return; }
  const item = itemDaBolsa(p.peixe);
  if (!item) return;
  const ps = estado.pets;
  ps.bolsa = { ...(ps.bolsa || {}), [p.peixe]: (Number(ps.bolsa?.[p.peixe]) || 0) + 1 };
  gravar({ [`pets/bolsa/${p.peixe}`]: ps.bolsa[p.peixe] });
  tocar('vitoria');
  avisoPet(`🎁 ${nomeVisivel(p.de_nome) || 'Um colega'} te deu ${comArtigo(item.nome)}! 🐟`, true);
}

// Tocar no mapa pescando: na fisgada puxa; perto do ponto lança (pronto); longe levanta e anda
function tocouPescando(pt) {
  if (pesca.estado === 'fisgada') { pescaPuxar(); return false; }
  if (pesca.estado === 'barrinha') return false;
  if (dist(pt.x, pt.y, pesca.ponto.x, pesca.ponto.y) < 140) { if (pesca.estado === 'pronto') pescaLancar(); return false; }
  sairPesca();
  return true;
}

function sairPesca(reposicionar = true) {
  if (!pesca) return;
  limparTimersPesca();
  const { ponto, img, svg, exc } = pesca;
  pesca = null;
  img.remove(); svg.remove(); exc.remove();
  const marca = document.querySelector(`.jr-caixote[data-ponto="${ponto.id}"]`);
  if (marca) marca.hidden = false;
  $('pesca-barra').hidden = true;
  $('pesca-tutorial').hidden = true;
  $('btn-levantar').hidden = $('btn-lancar').hidden = $('btn-pesca-ranking').hidden = $('btn-puxar').hidden = true;
  $('jogador').style.visibility = '';
  if (reposicionar && cena?.tipo === 'mapa') {   // levanta no ponto da trilha mais perto do caixote
    const [x, y] = centroCelula(celulaMaisProxima(cena.grade, ponto.x, ponto.y));
    jog.x = x; jog.y = y; jog.dir = 'frente';
    desenharJogador();
  }
}

// ============================================================
//  JOGAR JUNTO — colegas no mapa, quem está online no mapa geral e reações (sem chat)
// ============================================================
const REACOES = ['👋', '😄', '😂', '😮', '😢', '😡', '🔥', '⭐', '👍', '❤️', '🎉', '💤'];
const INTERVALO_REACAO = 3000;   // no máximo 1 balão a cada 3 s
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

// Etiqueta do colega: o apelido (ou primeiro nome); sem nome no registro → "Colega"; a conta da professora → "Professora"
// (nunca a palavra PROFESSOR).
const rotuloColega = (uid, r) => (/PROFESSOR/i.test(`${uid} ${r?.apelido || ''}`) ? 'Professora' : nomeVisivel(r?.apelido) || 'Colega') + medalhaPesca(uid);
// Turma TESTE e alunos de teste nunca aparecem para os alunos (no modo teste, todos são de teste). A professora
// jogando pelo menu dela (UID_PROFESSORA) aparece; a conta de teste da professora grava em outro nó e não aparece.
const colegaVisivel = (uid, r) => !!r && Date.now() - (Number(r.ts) || 0) < VALIDADE_MS &&
  (teste || uid === UID_PROFESSORA || (!ALUNOS_TESTE.includes(uid) && !/PROFESSOR|TESTE/i.test(uid) && r.turma !== 'TESTE' && !/PROFESSOR|TESTE/i.test(r.apelido || '')));

async function entrarOnline() {
  let apelido = String(sessao.nome || '').split(' ')[0];   // sem apelido: o primeiro nome
  try {
    const s = await get(ref(db, `perfis/${sessao.uid}/apelido_ativo`));
    if (s.exists() && s.val()) { apelido = String(s.val()); apelidoAluno = apelido; }
  } catch (_) {}
  await iniciarOnline({ uid: sessao.uid, teste, dados: {
    apelido, turma: sessao.turma || '', pet: estado.pets?.ativo || null, ...(estado.pets?.ativo ? visualOnline(estado.pets.ativo) : {}), personagem: meuPersonagem(), mapa: 'geral', local: 'geral', x: 0, y: 0, dir: 'frente', titulo: meuTitulo(),
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
  fecharCartaoColega();
  for (const c of colegas.values()) { c.el.remove(); c.nome.remove(); c.petImg.remove(); c.sombra.remove(); c.balao?.remove(); c.cavarEl?.remove(); }
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
  for (const [uid, c] of colegas) if (!vistos.has(uid)) { c.el.remove(); c.nome.remove(); c.petImg.remove(); c.sombra.remove(); c.balao?.remove(); c.cavarEl?.remove(); colegas.delete(uid); }
}

function criarColega(uid, r) {
  const palco = $('cena-palco');
  const mk = (tag, cls) => { const e = document.createElement(tag); e.className = cls; if (tag === 'img') { e.alt = ''; e.draggable = false; } palco.appendChild(e); return e; };
  const sombra = mk('div', 'jr-pet-sombra jr-colega');
  const petImg = mk('img', 'jr-ator jr-pet jr-colega');
  const el = mk('img', 'jr-ator jr-colega jr-colega-jog');
  const nome = mk('div', 'jr-colega-nome jr-colega');
  pintarNomeColega(nome, uid, r, '');
  const c = { uid, reg: r, el, nome, petImg, sombra, x: Number(r.x) || 0, y: Number(r.y) || 0, de: null, alvo: null, t0: 0,
    dir: r.dir || 'frente', quadro: -1, tQuadro: 0, reacaoT: Number(r.reacao?.t) || 0, pet: null, pers: null, seg: new PetSeguidor(petImg, sombra) };
  sombra.hidden = petImg.hidden = true;
  colegas.set(uid, c);
  definirPetColega(c, r.pet, r.pet_forma);
  definirPersColega(c, r.personagem);
  c.seg.colocar(c.x, c.y);
  return c;
}

// Colega sem o campo (ou com um id desconhecido) aparece com o personagem padrão
function definirPersColega(c, id) {
  id = persValido(id) ? id : PERS.padrao;
  if (c.pers === id) return;
  c.pers = id;
  preCarregarQuadros(id);
}

const petAtual = (pet) => (pet === 'capivara' ? 'elefante' : pet);   // registros antigos (antes do elefante)
function definirPetColega(c, pet, forma) {
  pet = petAtual(pet);
  pet = petValido(pet) ? pet : null;
  forma = pet ? formaValida(pet, forma) : null;   // o colega pode ter o adulto (ou preferir mostrar o filhote)
  if (c.pet === pet && c.seg.forma === forma) return;
  c.pet = pet;
  if (pet) preCarregarPet(forma);
  c.seg.definir(pet, forma);
  if (pet) c.seg.colocar(c.x, c.y);
}

function atualizarColega(c, r) {
  c.reg = r;
  pintarNomeColega(c.nome, c.uid, r, Number(r.pet_nivel) >= 2 ? ` ❤️${Number(r.pet_nivel)}` : '');
  definirPetColega(c, r.pet, r.pet_forma);
  aplicarTinta(c.petImg, r.pet_tinta, true);
  definirPersColega(c, r.personagem);
  if (r.dir) c.dir = r.dir;
  const nx = Number(r.x) || 0, ny = Number(r.y) || 0;
  if (Math.hypot(nx - c.x, ny - c.y) > 300) { c.x = nx; c.y = ny; c.alvo = null; c.seg.colocar(nx, ny); }   // entrou agora / pulou: sem deslizar
  else if (nx !== c.x || ny !== c.y) { c.de = [c.x, c.y]; c.alvo = [nx, ny]; c.t0 = performance.now(); }
  // reação recente (menos de 3 s) aparece sobre a cabeça
  const t = Number(r.reacao?.t) || 0;
  if (r.reacao?.e && balaoValido(r.reacao.e) && t > c.reacaoT && Date.now() - t < 3000) { c.reacaoT = t; mostrarBalaoReacao(c, r.reacao.e); }   // só frases prontas e reações
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
      if (c.quadro < 0) { c.quadro = 0; c.tQuadro = 0; }
      c.tQuadro += dt * 1000;
      if (c.tQuadro >= T_QUADRO) { c.tQuadro = 0; c.quadro = (c.quadro + 1) % (QUADROS_PERSONAGEM[c.dir] || 4); }
    } else c.quadro = -1;   // colega parado: pernas juntas
    const src = urlQuadro(DIRECOES.includes(c.dir) ? c.dir : 'frente', c.quadro, c.pers);
    if (c.el.dataset.src !== src) { c.el.src = src; c.el.dataset.src = src; }
    c.el.hidden = c.nome.hidden = false;
    Object.assign(c.el.style, { left: c.x + 'px', top: c.y + 'px', height: PERS.altura * ESCALA_SPRITE + 'px', zIndex: Math.round(c.y) });
    // colega cavando ou arrancando mato: a pose no lugar da imagem de andar (quadros 2..6 em loop enquanto durar)
    const sp = c.reg.acao === 'cavar' && temPoseCavar(c.pers) ? CAVAR_SP : c.reg.acao === 'mato' && temPoseMato(c.pers) ? MATO_SP : null;
    const cavando = !!sp;
    if (cavando) {
      if (!c.cavarEl) { c.cavarEl = document.createElement('img'); c.cavarEl.className = 'jr-cavar-pose jr-colega'; c.cavarEl.alt = ''; c.cavarEl.draggable = false; $('cena-palco').appendChild(c.cavarEl); }
      poseAcao(sp, c.reg.acao, c.cavarEl, c.pers, c.x, c.y, 2 + Math.floor(agora / (c.reg.acao === 'mato' ? 250 : MS_CAVAR)) % 5, !!c.reg.acao_esq, ESCALA_SPRITE);
    } else if (c.cavarEl) { c.cavarEl.remove(); c.cavarEl = null; }
    c.el.style.visibility = cavando ? 'hidden' : '';
    // etiqueta com o apelido: 11 px na tela, qualquer que seja o zoom da câmera
    Object.assign(c.nome.style, { left: c.x + 'px', top: (c.y - ALT_JOGADOR_MAPA - 2) + 'px', fontSize: 11 * escala + 'px', zIndex: 9000 });
    if (c.balao) Object.assign(c.balao.style, { left: c.x + 'px', top: (c.y - ALT_JOGADOR_MAPA - 16 * escala) + 'px', fontSize: (c.balao.classList.contains('frase') ? 12 : 22) * escala + 'px' });
    if (c.pet) c.seg.atualizar(dt, c.x, c.y, VEL, altImagemPet(c.seg.forma) * ESCALA_ATORES, distPet(c.seg.forma) * ESCALA_ATORES, ESCALA_ATORES);
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

// ── Cartão do colega (toque nele): busto, nome · turma, pet e 👋. Fecha ao tocar fora ou em 4 s ──
let cartaoColega = null;   // { c, timer }
const nomeVisivel = (s) => (/PROFESSOR|TESTE/i.test(String(s || '')) ? '' : String(s || ''));

function colegaEm(pt) {
  if (colegasOcultos) return null;
  let melhor = null, md = Infinity;
  const h = ALT_JOGADOR_MAPA, folga = 6 * ESCALA_ATORES;
  for (const c of colegas.values()) {
    if (c.el.hidden || Math.abs(pt.x - c.x) > h * 0.3 + folga || pt.y < c.y - h - folga || pt.y > c.y + folga) continue;
    const d = Math.abs(pt.x - c.x) + Math.abs(pt.y - c.y);
    if (d < md) { md = d; melhor = c; }
  }
  return melhor;
}

function abrirCartaoColega(c) {
  fecharCartaoColega();
  pararFalaPet();   // o balão do meu pet não fica por cima do cartão
  const r = c.reg || {}, el = $('colega-cartao');
  const nome = rotuloColega(c.uid, r), turma = nomeVisivel(r.turma);
  const pet = petValido(r.pet) ? r.pet : null;
  el.innerHTML = `
    ${bustoHtml(urlQuadro('frente', -1, c.pers || PERS.padrao), 'jr-busto-colega', BUSTO_PERS)}
    <span class="jr-colega-info">
      <b>${nomeT(c.uid, nome, r)}${turma ? ` <small>· ${esc(turma)}</small>` : ''}</b>
      ${tituloDe(c.uid, r) ? `<span class="jr-titulo-mestre ${tituloDe(c.uid, r) === 2 ? 'lenda' : ''}">${NOME_TITULO[tituloDe(c.uid, r)]}</span>` : ''}
      ${pet ? `<span class="jr-colega-pet"><span class="jr-icone-pet"><img src="${srcIcone(formaValida(pet, r.pet_forma))}" alt="" draggable="false" data-icone-pet${r.pet_tinta ? ` data-tinta="${esc(r.pet_tinta)}"` : ''}/></span>${r.pet_nome ? `${esc(r.pet_nome)} · ` : ''}${esc(NOME_PET[pet])}${Number(r.pet_nivel) >= 2 ? ` ❤️ ${Number(r.pet_nivel)}` : ''}</span>` : ''}
    </span>
    ${podeDesafiar() ? '<button class="jr-colega-oi jr-colega-desafiar" data-desafiar aria-label="Desafiar" title="Desafiar">⚔️</button>' : ''}
    <button class="jr-colega-oi" data-presente aria-label="Presentear com um peixe" title="Presentear">🎁</button>
    <button class="jr-colega-oi" data-oi aria-label="Acenar">👋</button>`;
  const ti = el.querySelector('img[data-tinta]');
  if (ti) aplicarTinta(ti, ti.dataset.tinta);
  el.hidden = false;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  cartaoColega = { c, timer: setTimeout(fecharCartaoColega, 4000) };
  posicionarCartaoColega();
}

function posicionarCartaoColega() {
  if (!cartaoColega) return;
  const { c } = cartaoColega;
  if (!colegas.has(c.uid) || c.el.hidden) { fecharCartaoColega(); return; }
  posicionarNaTela($('colega-cartao'), c.x, c.y - ALT_JOGADOR_MAPA - 4 * ESCALA_ATORES);
}

function fecharCartaoColega() {
  if (cartaoColega) clearTimeout(cartaoColega.timer);
  cartaoColega = null;
  const el = $('colega-cartao');
  if (el) el.hidden = true;
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
  const fr = ehPraca() ? frasesPraca() : [];
  $('reacoes-frases').innerHTML = fr.map(f => `<button class="jr-frase" data-e="${esc(f)}">${esc(f)}</button>`).join('');
  $('reacoes-frases').hidden = !fr.length;
  $('reacoes').hidden = false;
}
function fecharReacoes() { $('reacoes').hidden = true; }

function reagirCom(e) {
  fecharReacoes();
  if (!(REACOES.includes(e) || (ehPraca() && ehFrase(e))) || performance.now() - ultimaReacao < INTERVALO_REACAO) return;
  ultimaReacao = performance.now();
  enviarOnline({ reacao: { e, t: Date.now() } });
  // balão sobre a minha cabeça por 2 s
  const b = $('minha-reacao');
  b.textContent = e;
  b.classList.toggle('frase', !REACOES.includes(e));
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
  Object.assign(b.style, { left: jog.x + 'px', top: (jog.y - ALT_JOGADOR_MAPA - 16 * escala) + 'px', fontSize: (b.classList.contains('frase') ? 12 : 22) * escala + 'px' });
}

function mostrarBalaoReacao(c, e) {
  if (!c.balao) { c.balao = document.createElement('div'); c.balao.className = 'jr-reacao-balao jr-colega'; $('cena-palco').appendChild(c.balao); }
  c.balao.textContent = e;
  c.balao.classList.toggle('frase', !REACOES.includes(e));
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

const rostoPet = (pet, tintaId) => petValido(pet) ? `<img src="${srcIcone(pet)}" alt="" data-icone-pet${tintaId ? ` data-tinta="${esc(tintaId)}"` : ''}/>` : '<span>🙂</span>';
const pintarRostos = (raizEl) => { for (const img of raizEl.querySelectorAll('img[data-tinta]')) aplicarTinta(img, img.dataset.tinta); };

function desenharOnlineGeral() {
  const cont = $('geral-marcadores');
  const np = Object.entries(onlineGeral).filter(([uid, r]) => colegaVisivel(uid, r) && r.mapa === 'praca').length;
  const bp = cont.querySelector('.jr-praca-online');
  if (bp) bp.textContent = np ? `🟢 ${np}` : '';
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
    b.innerHTML = lista.slice(0, 3).map(r => `<span class="jr-rosto${r.local === 'ginasio' ? ' no-ginasio' : ''}">${rostoPet(petAtual(r.pet), r.pet_tinta)}</span>`).join('') +
      (lista.length > 3 ? `<span class="jr-rosto-mais">+${lista.length - 3}</span>` : '');
    pintarRostos(b);
    cont.appendChild(b);
  }
}

function abrirListaOnline(n) {
  const lista = onlinePorMapa()[n] || [];
  const reg = D.geral.regioes.find(r => r.mapa === n);
  $('online-titulo').textContent = `${n}. ${reg?.nome || ''}`;
  $('online-itens').innerHTML = lista.map(r => `
    <li><span class="jr-rosto${r.local === 'ginasio' ? ' no-ginasio' : ''}">${rostoPet(petAtual(r.pet), r.pet_tinta)}</span>
      <span class="jr-online-nome">${nomeT(r.uid, rotuloColega(r.uid, r), r)}</span>
      <span class="jr-online-det">${esc(nomeVisivel(r.turma))}${petValido(petAtual(r.pet)) ? ' · ' + esc((r.pet_nome ? r.pet_nome + ' · ' : '') + NOME_PET[petAtual(r.pet)]) : ''} · ${r.local === 'ginasio' ? 'no ginásio' : 'no mapa'}</span></li>`).join('')
    || '<li class="jr-online-vazio">Ninguém aqui agora.</li>';
  pintarRostos($('online-itens'));
  $('online-ir').hidden = false;
  $('online-ir').dataset.mapa = n;
  $('online-bloqueado').hidden = true;   // todos os mapas abrem (só os ginásios seguem a ordem)
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
const petPodeFalar = () => falasProntas() && !!seguidor?.pet && lealdadeDoAtivo() >= (configFalas().lealdade_minima ?? 25);

// Próximo ginásio: o 1º aberto com líder ainda não vencido, na ordem 1A, 1B, 2A…
function proximoGinasio() {
  for (let n = 1; n <= NUM_MAPAS; n++)
    for (const G of ['A', 'B']) if (ginasioLiberado(n, G) && !estado.ginasios[chaveGinasio(n, G)].lider.vencido) return chaveGinasio(n, G);
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
  if (barrigaDe(pet) < fomeAbaixo()) est = 'fome';
  else if (conversa.voltou && !conversa.voltouDito) est = 'voltou';
  return {
    pet, nomePet: nomePet(pet), apelido: apelidoAluno || String(sessao.nome || '').split(' ')[0],
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
  conversa.proximaT = performance.now() + (configFalas().intervalo_min_s ?? 90) * 1000;
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
  const pet = seguidor.pet;
  const frase = fraseDe(pet, 'sem_lealdade', { pet: nomePet(pet), apelido: apelidoAluno || String(sessao.nome || '').split(' ')[0] });
  mostrarFalaPet([{ texto: frase || (Math.random() < 0.5 ? '…' : '💜'), espera: 0, fixo: 2000 }]);
  // nas 3 primeiras vezes, explica como fazer o pet conversar
  const n = Number(estado.avisosPet.toques_sem_lealdade) || 0;
  if (n < 3) {
    estado.avisosPet.toques_sem_lealdade = n + 1;
    gravar({ 'avisos_pet/toques_sem_lealdade': n + 1 });
    avisoPet(`Cuide de ${nomePet(pet)} para ele confiar em você: com ${configFalas().lealdade_minima ?? 25} de lealdade ele começa a conversar!`);
  }
}

// A cada quadro no mapa
function atualizarConversa() {
  if (conversa.falando) posicionarFalaPet();
  if (perguntaAberta || transicionando || sobreposicaoAberta() || pesca) return;   // pescando, o pet fica quietinho
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
  const pertoDaAgua = cena?.tipo === 'mapa' && pescaPronta() && pontosDoMapa(cena.n).some(p => pontoLiberado(p) && dist(jog.x, jog.y, p.x, p.y) < 180);
  if (pertoDaAgua && Math.random() < 0.4 && petFalar('pesca')) return;
  petFalar();
}

function alternarPetCalado() {
  petCalado = !petCalado;
  try { localStorage.setItem(KEY_CALADO, petCalado ? '1' : '0'); } catch (_) {}
  atualizarBotaoCalado();
}
function atualizarBotaoCalado() {   // interruptor "Falas do pet" no painel Visual do Meu Pet
  const b = $('mp-calado');
  $('mp-calado-txt').textContent = `Falas do pet: ${petCalado ? 'desligado' : 'ligado'}`;
  b.setAttribute('aria-checked', String(!petCalado));
  b.classList.toggle('ligado', !petCalado);
}

const quadrosCarregados = new Set();   // personagens já pré-carregados
function preCarregarQuadros(id) {
  if (quadrosCarregados.has(id)) return;
  quadrosCarregados.add(id);
  for (const d of DIRECOES) for (let i = -1; i < QUADROS_PERSONAGEM[d]; i++) { const im = new Image(); im.src = urlQuadro(d, i, id); }   // parado + quadros de andar
  { const im = new Image(); im.onerror = () => semComemorando.add(id); im.src = `${PERS.pasta}/${id}/comemorando.webp`; }   // pose de acerto (se já existir)
}
// quadro −1 = parado (pernas juntas); 0..N−1 = ciclo de andar (o % cobre a troca de direção no meio do passo)
const urlQuadro = (dir, q, id = meuPersonagem()) =>
  `${PERS.pasta}/${id}/${dir}-${q < 0 ? 'parado' : q % (QUADROS_PERSONAGEM[dir] || 1) + 1}.webp`;

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
  const antes = b.hidden;
  b.hidden = !carregouProgresso || !revisaoVisivel();
  if (antes !== b.hidden && !$('tela-geral').hidden) requestAnimationFrame(dimensionarGeral);   // a folga do mapa acompanha o 📜
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
    fila: qs.map((q, pos) => ({ ...q, pos })), total: qs.length, acertos: 0,
    errouIds: new Set(), errosPorIndice: {},
    travado: false, fim: false,
  };
  perguntaAberta = true;
  $('perg-confirma').querySelector('p').textContent = 'Sair da revisão? Você pode tentar de novo depois.';
  falar('Revisão da semana! Vamos ver se agora vai!');
  $('perg-desistir').hidden = false;
  $('perg-confirma').hidden = true;
  $('pergunta').hidden = false;
  montarArena();
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
  $('perg-contador').hidden = false;
  desenharBolinhas();
  $('perg-enunciado').hidden = true;
  $('perg-alternativas').hidden = true;
  $('perg-origem').hidden = true;
  $('perg-explica').hidden = true; $('perg-guiado').hidden = true; $('perg-corpo').classList.remove('guiado');
  $('perg-tabela').innerHTML = '';
  $('perg-desistir').hidden = true;
  $('perg-ajuda').hidden = true;
  $('perg-continuar').textContent = 'Continuar';
  $('perg-continuar').hidden = false;
  pg.aoContinuar = fecharPergunta;
}

function abrirMapaGeral() {
  sairPesca(false);
  atualizarSelo();
  atualizarFaixaMeta();
  avisarMetaBatida();
  atualizarBotaoRevisao();
  cena = null;
  esconderBalao();
  limparPessoas();
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
  // folga em cima (barra do topo e atalhos) e embaixo: o mapa rola até os marcadores de cima (9 a 13) saírem de baixo dos botões
  const base = sc.getBoundingClientRect().top;
  const fundo = [document.querySelector('#tela-geral .jr-hud-topo'), $('btn-revisao')]
    .filter(e => e && !e.hidden && getComputedStyle(e).display !== 'none').reduce((m, e) => Math.max(m, e.getBoundingClientRect().bottom - base), 0);   // o 📜 é position: fixed
  palco.style.marginTop = Math.round(fundo + 6) + 'px';
  palco.style.marginBottom = Math.round(Math.max(24, sc.clientHeight * 0.06)) + 'px';
}

function centralizarGeral() {
  // Centraliza no mapa disponível mais avançado
  const sc = $('geral-scroll');
  const prox = proximoGinasio();
  const alvo = prox ? Number(prox.replace('mapa', '').split('-')[0]) : 1;   // mapa do próximo ginásio
  const r = D.geral.regioes.find(r => r.mapa === alvo);
  if (!r) return;
  const pw = $('geral-palco').clientWidth, ph = $('geral-palco').clientHeight;
  sc.scrollLeft = r.x / W * pw - sc.clientWidth / 2;
  sc.scrollTop = $('geral-palco').offsetTop + r.y / H * ph - sc.clientHeight / 2;
}

function desenharMarcadores() {
  const cont = $('geral-marcadores');
  cont.innerHTML = D.geral.regioes.map(r => {
    const n = r.mapa;
    const est = mapaConcluido(n) ? 'concluido' : 'disponivel';   // todos os mapas abertos
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
  }).join('') + trofeuHtml() + (pracaPronta() && cfgPraca().geral ? (() => { const g = cfgPraca().geral;
    return `<button class="jr-marcador jr-marc-praca disponivel" data-praca="1" style="left:${g.x / W * 100}%;top:${g.y / H * 100}%" aria-label="Praça do Encontro">
      <span class="jr-marc-num">🏛️</span><span class="jr-marc-nome">Praça</span><span class="jr-praca-online"></span></button>`; })() : '');
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
    if (b.dataset.praca) { abrirPraca(); return; }
    if (b.dataset.trofeu) { tocarTrofeu(); return; }
    const n = Number(b.dataset.mapa);
    tocar('porta');
    abrirMapa(n, 'entrada');
  });
}

// ============================================================
//  CENA (mapa da região / interior) — câmera e jogador
// ============================================================
let cena = null;   // { tipo:'mapa'|'interior', ... }
const cam = { s: 1, tx: 0, ty: 0 };
const jog = { x: 0, y: 0, dir: 'frente', quadro: -1, tQuadro: 0, caminho: [], aoChegar: null };
let perguntaAberta = false;

// a câmera segue o jogador; por alguns segundos pode olhar outro ponto ("Mostrar" o ponto de pesca)
const focoAtivo = () => camFoco && performance.now() < camFoco.ate && cena?.tipo === 'mapa';
const focoX = () => (focoAtivo() ? camFoco.x : jog.x);
const focoY = () => (focoAtivo() ? camFoco.y : jog.y);
function ajustarCamera() {
  const vp = $('cena-vp');
  const vw = vp.clientWidth, vh = vp.clientHeight;
  if (deitado()) {
    // Celular/tablet (deitado ou girado): preenche a largura e segue o jogador nos dois eixos
    // (um pouco abaixo do centro, para o personagem não ficar atrás do HUD do topo)
    cam.s = Math.max(vw / W, vh / H);
    cam.tx = clamp(vw / 2 - focoX() * cam.s, vw - W * cam.s, 0);
    cam.ty = clamp(vh * 0.55 - focoY() * cam.s, vh - H * cam.s, 0);
  } else if (vh > vw) {
    // Em pé: mapa na altura da tela, rola na horizontal seguindo o jogador
    cam.s = vh / H;
    cam.ty = 0;
    cam.tx = clamp(vw / 2 - focoX() * cam.s, vw - W * cam.s, 0);
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
  jog.caminho = []; jog.aoChegar = null; jog.quadro = -1;
  desenharJogador();
  seguidor?.colocar(x, y);
}

function desenharJogador() {
  const el = $('jogador');
  const src = urlQuadro(jog.dir, jog.quadro);
  if (el.dataset.src !== src) { el.src = src; el.dataset.src = src; }
  el.style.left = jog.x + 'px';
  el.style.top = jog.y + 'px';
  el.style.height = PERS.altura * escalaSpriteCena() + 'px';
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
  perguntaAberta || !$('estojo').hidden || !$('cartao').hidden || !$('insignia-ganha').hidden || !$('pet-escolha').hidden || !$('pet-colecao').hidden || !$('pet-levar').hidden || !$('meu-pet').hidden || !$('reacoes').hidden || !$('online-lista').hidden || !$('pers-escolha').hidden || !$('gin-fechado').hidden || !$('pet-silhueta').hidden || !$('bt-lista').hidden || !$('batalha').hidden || !$('pedido').hidden || !$('loja').hidden || !$('pesca-aviso').hidden || !$('pesca-tutorial').hidden || !$('pesca-ranking').hidden || !$('mural').hidden || !$('convite').hidden || !$('duelo').hidden || !$('maquina').hidden || !$('jogo-embed').hidden || !$('aovivo').hidden || !$('pet-evolucao').hidden || !$('relembre').hidden || !$('missoes').hidden || !$('moedas-hoje').hidden || !$('programe').hidden;

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
  if (jog.quadro < 0) { jog.quadro = 0; jog.tQuadro = 0; return; }   // começou a andar: quadro 1 na hora
  jog.tQuadro += dt * 1000;
  if (jog.tQuadro >= T_QUADRO) { jog.tQuadro = 0; jog.quadro = (jog.quadro + 1) % QUADROS_PERSONAGEM[jog.dir]; }
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
  else jog.quadro = -1;
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
  pgPet?.atualizar(dt);
  evo?.anim.atualizar(dt);
  tentarEvolucao();
  if ((fomeT += dt) > 10) { fomeT = 0; atualizarFomeSeguidor(); }   // a barriga cai devagar: confere a cada 10 s
  if (cena && !perguntaAberta && !transicionando) {
    const [vx, vy] = vetorEntrada();
    if (!vx && !vy) soltouDesdeTroca = true;
    if (pesca && (vx || vy)) sairPesca();   // andar levanta da pesca
    const direto = (vx || vy) && moverDireto(dt, vx, vy);
    if (!direto) passo(dt);
    const e = escalaPetCena();
    const pet = seguidor?.forma;   // o tamanho e a distância são os da forma (o adulto é maior)
    if (petNoPedestal) seguidor?.atualizar(dt, petNoPedestal[0], petNoPedestal[1], 0, altImagemPet(pet) * e, 0, e);   // no provador: fica no pedestal
    else seguidor?.atualizar(dt, jog.x, jog.y, VEL, altImagemPet(pet) * e, distPet(pet) * e, e);
    petGin?.anim.atualizar(dt);
    if (cena.tipo === 'mapa') { atualizarColegas(dt); enviarPosicao(); posicionarMinhaReacao(); posicionarCartaoColega(); atualizarConversa(); efeitosDoMapa(); }
    ajustarCamera();
    if (cena?.tipo === 'mapa') {
      atualizarMapa();
      if (cena.n === 'praca') atualizarPraca();
      else if (cena.n === 'loja') atualizarLoja();
      atualizarCavar();
      if (direto) verificarEncostou(vx, vy);
    } else if (cena) {
      atualizarSaidaGin();
      if (direto && vx < 0) verificarSaiuGin();
      atualizarBalao();
      posicionarRevanche();
    }
  }
  atualizarHudPraca();
  if (cena?.tipo !== 'mapa' && !$('btn-acao-mapa').hidden) esconderAcaoMapa();
  requestAnimationFrame(loop);
}
// Atalho 🏛️ nos outros mapas; na praça o botão de reações vira 💬 (frases prontas)
function atualizarHudPraca() {
  const bp = $('btn-praca'), esconde = !(cena?.tipo === 'mapa' && cena.n !== 'praca' && pracaPronta());
  if (bp.hidden !== esconde) bp.hidden = esconde;
  atualizarHudMissoes();
  const brel = $('btn-relembre'), semRel = !(cena?.tipo === 'interior' && explicacaoDe(cena.chave));   // 📖 no interior do ginásio
  if (brel.hidden !== semRel) brel.hidden = semRel;
  const ic = ehPraca() ? '💬' : '😊', br = $('btn-reacao');
  if (br.textContent !== ic) br.textContent = ic;
}

function passo(dt) {
  if (!jog.caminho.length) {
    if (jog.quadro !== -1) { jog.quadro = -1; desenharJogador(); }
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
    jog.quadro = -1;
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
  else if (cena.n === 'fliperama') transicao(() => abrirPraca('fliperama'));
  else if (cena.n === 'laboratorio') transicao(() => abrirPraca('laboratorio'));
  else if (cena.n === 'loja') sairDaLoja();
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
  sairPesca(false);
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
  // ginásio fechado (fora de ordem): 🔒 sempre visível na porta
  // o nome aparece sempre: vencido (insígnia + ✓, borda dourada), liberado, ou fechado (🔒 em cinza)
  $('cena-atores').innerHTML = Object.keys(portas).map(G => {
    const fechado = !ginasioLiberado(n, G), vencido = !!estado.ginasios[chaveGinasio(n, G)]?.lider.vencido;
    const cls = vencido ? ' vencido' : fechado ? ' fechado' : '';
    const ins = vencido ? `<img class="jr-rotulo-ins" src="${IMG}/insignias/insignia-${chaveGinasio(n, G)}.webp" alt="" draggable="false" onerror="this.remove()"/>` : '';
    return `<div class="jr-rotulo-porta${cls}" data-g="${G}" style="left:${portas[G].x}px;top:${portas[G].y - ALT_JOGADOR - 24}px">` +
      `<span>${fechado && !vencido ? '🔒 ' : ''}${ins}${portas[G].nome}${vencido ? ' <i class="jr-rotulo-ok">✓</i>' : ''}</span></div>`;
  }).join('');
  montarPessoas(n);
  montarCaixotes(n);
  montarPortaLoja(n);
  montarCavar(n);
  fecharBalaoPorta();

  if (onde === 'loja' && cena.portaLoja) posicionarJogador(cena.portaLoja.trilha[0], cena.portaLoja.trilha[1], 'frente');   // saiu da loja
  else if (onde === 'A' || onde === 'B') {
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
  setTimeout(() => { if (cena?.tipo === 'mapa' && cena.n === n && $('pet-escolha').hidden) avisarPescaLiberada(n); }, 900);
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
  // prédios que também entram andando pelas setas: Fliperama e Loja na Praça, Loja no Mercado (o Mural é só por toque/perto)
  if (ehPraca()) for (const alvo of ['fliperama', 'loja', 'laboratorio']) {
    const b = cena[alvo];
    if (b) lista.push({ id: 'predio-' + alvo, tipo: 'predio', alvo, x: b.x, y: b.y, trilha: b.trilha });
  }
  if (cena.n === 'laboratorio') for (const c of cena.computadores || []) lista.push({ id: 'pc-' + c.id, tipo: 'predio', alvo: 'pc:' + c.id, x: c.x, y: c.y, trilha: c.trilha });
  const pl = cena.portaLoja;
  if (pl) lista.push({ id: 'predio-loja-mercado', tipo: 'predio', alvo: 'loja-mercado', x: pl.x, y: pl.y, trilha: pl.trilha });
  return lista;
}
const espDe = (d) => (d.tipo === 'porta' ? { tipo: 'porta', lado: d.lado } : d.tipo === 'predio' ? { tipo: 'predio', alvo: d.alvo } : { tipo: 'saida', i: d.i });

const distAoDestino = (d) => Math.min(dist(jog.x, jog.y, d.x, d.y), dist(jog.x, jog.y, d.trilha[0], d.trilha[1]));

function tocarNoMapa(e) {
  const p = telaParaImagem(e.clientX, e.clientY);
  if (balaoPessoa) fecharBalaoPessoa();   // tocar fora fecha o balão da pessoa
  if (balaoPorta) fecharBalaoPorta();
  if (cartaoColega) fecharCartaoColega();
  if (pesca && !tocouPescando(p)) return;   // pescando: o toque puxa a linha (ou levanta, se for longe)
  const caixote = caixoteEm(p);
  if (caixote) { irPescar(caixote); return; }
  // pet e pessoa podem estar lado a lado: vale o que estiver mais perto do toque
  const pessoa = pessoaEm(p);
  const noPet = tocouNoPet(p);
  if (noPet && (!pessoa || dist(p.x, p.y, seguidor.x, seguidor.y - seguidor.altura / 2) < dist(p.x, p.y, pessoa.p.x, pessoa.p.y - pessoa.alt / 2))) {
    falarPorToque(); return;   // tocar no pet: ele fala (não anda até lá)
  }
  const colega = colegaEm(p);
  if (colega && (!pessoa || dist(p.x, p.y, colega.x, colega.y - ALT_JOGADOR_MAPA / 2) < dist(p.x, p.y, pessoa.p.x, pessoa.p.y - pessoa.alt / 2))) {
    abrirCartaoColega(colega); return;   // tocar num colega: cartão com nome · turma e o pet dele
  }
  if (pessoa) { if (!editarNpcs) irFalarCom(pessoa); return; }   // tocar numa pessoa: vai até ela e conversa
  if (ehPraca()) { const alvo = alvoPracaEm(p); if (alvo) { irAlvoPraca(alvo); return; } }   // mural / fliperama
  if (cena.n === 'fliperama') { const a = alvoFliperamaEm(p); if (a) { irAlvoFliperama(a); return; } }    // máquinas e o Téo
  if (ehLoja()) { const c = cantoEm(p); if (c) { irAoCanto(c); return; } }
  if (cena.n === 'laboratorio') {   // tocar no computador (tela ou mesa): anda até ele e abre
    const d = destinosDoMapa().find(x => x.tipo === 'predio' && Math.abs(p.x - x.x) < 70 && p.y > x.y - 80 && p.y < x.trilha[1] + 20);
    if (d) { irAoDestino(d); return; }
  }                               // cantos da loja
  if (cena.portaLoja && Math.abs(p.x - cena.portaLoja.x) < 70 && p.y > cena.portaLoja.y - 150 && p.y < cena.portaLoja.y + 30) {   // porta da loja (Mercado)
    const pl = cena.portaLoja, n = cena.n;
    destinoEspecial = null;
    caminharNaTrilha(pl.trilha[0], pl.trilha[1], () => { if (cena?.n === n) transicao(() => abrirLojaInterior({ tipo: 'mapa', n })); });
    return;
  }
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
  if (d.tipo === 'porta' && estado.ginasios[chaveGinasio(cena.n, d.lado)]?.lider.vencido) { irAoGinasioVencido(d); return; }
  const esp = espDe(d);
  destinoEspecial = esp;
  caminharNaTrilha(d.trilha[0], d.trilha[1], () => {
    if (destinoEspecial === esp) entrarNoDestino(esp);
  });
  // termina exatamente no ponto da porta/saída (no computador, para na frente dele)
  if (jog.caminho.length && !String(d.alvo || '').startsWith('pc:')) jog.caminho.push([d.x, d.y]);
}

// Ginásio já vencido: o balão pergunta antes de entrar (dentro, tudo como sempre: revisar/treinar)
let balaoPorta = null;   // { d, timer }
function irAoGinasioVencido(d) {
  fecharBalaoPorta();
  destinoEspecial = null;
  const perguntar = () => {
    if (cena?.tipo !== 'mapa') return;
    const el = $('porta-balao');
    el.innerHTML = `<b>${esc(cena.portas[d.lado]?.nome || '')}</b><span>Você já venceu! Quer treinar de novo?</span>
      <div class="jr-pessoa-botoes"><button class="jr-btn jr-btn-ouro" data-porta="entrar">Entrar</button><button class="jr-btn jr-btn-sec" data-porta="nao">Agora não</button></div>`;
    el.hidden = false;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    balaoPorta = { d, timer: setTimeout(fecharBalaoPorta, 9000) };
    posicionarBalaoPorta();
  };
  if (dist(jog.x, jog.y, d.trilha[0], d.trilha[1]) < DIST_PERTO) { perguntar(); return; }
  caminharNaTrilha(d.trilha[0], d.trilha[1], perguntar);
}
function posicionarBalaoPorta() {
  if (!balaoPorta) return;
  posicionarNaTela($('porta-balao'), balaoPorta.d.x, balaoPorta.d.y - ALT_JOGADOR - 30);
}
function fecharBalaoPorta() {
  if (balaoPorta) clearTimeout(balaoPorta.timer);
  balaoPorta = null;
  if ($('porta-balao')) $('porta-balao').hidden = true;
}
function acaoBalaoPorta(e) {
  e.stopPropagation();
  const b = e.target.closest('[data-porta]');
  if (!b || !balaoPorta) return;
  const { d } = balaoPorta;
  fecharBalaoPorta();
  if (b.dataset.porta === 'entrar') entrarNoDestino({ tipo: 'porta', lado: d.lado });
}

function entrarNoDestino(esp) {
  destinoEspecial = null;
  const n = cena.n;
  if (esp.tipo === 'porta' && !ginasioLiberado(n, esp.lado)) { soltouDesdeTroca = false; avisarGinasioFechado(n, esp.lado); }
  else if (esp.tipo === 'porta') transicao(() => entrarGinasio(n, esp.lado));
  else if (esp.tipo === 'saida-gin') { const G = cena.G; transicao(() => abrirMapa(n, G)); }
  else if (esp.tipo === 'predio') entrarNoPredio(esp.alvo);
  else if (n === 'fliperama') transicao(() => abrirPraca('fliperama'));   // a porta do fliperama volta para a praça
  else if (n === 'laboratorio') transicao(() => abrirPraca('laboratorio'));
  else if (n === 'loja') sairDaLoja();                                     // a porta da loja volta para o mapa de onde veio
  else transicao(abrirMapaGeral);
}

// Fliperama, Loja da Praça e Loja do Mercado (mesmo destino do toque)
function entrarNoPredio(alvo) {
  const n = cena.n;
  if (alvo === 'fliperama' && FLIPER) transicao(abrirFliperama);
  else if (alvo === 'loja' && LOJA) transicao(() => abrirLojaInterior({ tipo: 'praca' }));
  else if (alvo === 'loja-mercado' && LOJA) transicao(() => abrirLojaInterior({ tipo: 'mapa', n }));
  else if (alvo === 'laboratorio' && LAB) transicao(abrirLaboratorio);
  else if (alvo.startsWith('pc:')) { jog.dir = 'costas'; desenharJogador(); abrirComputador(alvo.slice(3)); }   // computador do laboratório
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
      entrarNoDestino(espDe(d));
      return;
    }
  }
}

// A cada quadro no mapa: mostra o nome do ginásio, acende o botão OK
function atualizarMapa() {
  if (!$('cena-balao').hidden) esconderBalao();
  posicionarBalaoPessoa();
  posicionarBalaoPorta();
  atualizarCaixotes();
  const ds = destinosDoMapa();
  alvoMapa = null;
  for (const d of ds) {
    const dd = distAoDestino(d);
    if (d.tipo === 'porta') {
      const perto = dd < DIST_PERTO;
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
  sairPesca(false);
  const chave = chaveGinasio(n, G);
  const cfg = D.interiores.interiores[chave];
  const gin = D.questoes[n].ginasios[G];
  cena = null;
  esconderBalao();
  $('cena-titulo').textContent = gin.nome;
  // no ginásio não há botão de sair: sai andando pela porta de entrada
  $('btn-cena-voltar').hidden = true;
  $('tela-cena').classList.add('jr-no-ginasio');
  limparPessoas();
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
  setTimeout(() => { if (cena?.tipo === 'interior' && cena.chave === chave) relembreNaEntrada(chave); }, 350);   // depois do fade
}

// Ginásio fechado: "Primeiro vença {ginásio} em {mapa}." + "Ir até lá" (leva à porta do ginásio pendente)
let ginFechadoAlvo = null;
function avisarGinasioFechado(n, G) {
  const pend = ginasioPendenteAntes(n, G);
  if (!pend) return;
  const [m, L] = pend.replace('mapa', '').split('-');
  ginFechadoAlvo = { n: Number(m), G: L };
  const q = D.questoes[Number(m)];
  $('gin-fechado-txt').textContent = `Primeiro vença ${q.ginasios[L].nome} em ${q.nome}.`;
  $('gin-fechado').hidden = false;
  tocar('erro');
}

function irAoGinasioPendente() {
  $('gin-fechado').hidden = true;
  const a = ginFechadoAlvo;
  if (!a) return;
  if (cena?.tipo === 'mapa' && cena.n === a.n) {   // mesmo mapa: anda até a porta (e entra)
    const d = destinosDoMapa().find(x => x.tipo === 'porta' && x.lado === a.G);
    if (d) irAoDestino(d);
  } else transicao(() => abrirMapa(a.n, a.G));    // outro mapa: aparece diante da porta
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

// ============================================================
//  PRAÇA DO ENCONTRO — mapa sem ginásios (dados/jogo/praca.json): mural, desafios ao vivo e frases prontas
//  jogo_revisao_praca/ (modo teste: jogo_revisao_praca_teste/):
//    insignias/{uid} = { n, d, nome, turma, pers, ts }            resumo para o mural (atualizado ao entrar e ao ganhar insígnia)
//    desafios/{segunda}/{uid} = { pontos, vitorias, nome, turma, pers, ts }   ranking semanal dos desafios
//    convites/{quem recebe} = { id, de, de_nome, ts }
//    duelos/{id} = { a, b, estado, tema, atual, rodadas: { i: { conta, opcoes, resposta, inicio, resp: { uid: { op, t } }, fim } }, on, fim }
//    historico/{segunda}/{id} = { a, b, an, bn, at, bt, vencedor, placar, wo, ts }   para o painel da professora
// ============================================================
const ehPraca = () => cena?.tipo === 'mapa' && cena.n === 'praca';
const basePraca = () => (teste ? 'jogo_revisao_praca_teste' : 'jogo_revisao_praca');
let desafiosOff = {};   // jogo_revisao_config/global/desafios_off: { todas: true } ou { '8D': true } (painel da professora)
const desafiosLigados = () => !desafiosOff?.todas && !desafiosOff?.[sessao.turma];
let offsetServidor = 0;
const agoraServ = () => Date.now() + offsetServidor;
let editarPraca = false;   // ?editarPraca=1 no modo teste: arrastar mural, porta, bancos e ponto do desafio

async function abrirPraca(onde) {   // onde: 'fliperama' | 'loja' = saindo de lá (aparece na porta)
  if (!pracaPronta()) return;
  sairPesca(false);
  const C = cfgPraca(), cfg = { trilha: C.trilha || 'trilha-praca.png', entrada: C.entrada, saidas: C.saidas || [] };
  cena = null;
  esconderBalao();
  $('btn-revanche').hidden = true;
  $('cena-aviso').hidden = true;
  $('cena-atores').innerHTML = '';
  $('cena-titulo').textContent = '🏛️ Praça do Encontro';
  $('btn-cena-voltar').textContent = '⟵ Mapa geral';
  $('btn-cena-voltar').hidden = false;
  $('tela-cena').classList.remove('jr-no-ginasio');
  mostrarTela('tela-cena');
  $('cena-palco').style.visibility = 'hidden';
  const [grade] = await Promise.all([carregarGrade(cfg.trilha), trocarFundo(`${IMG}/mapas/${C.imagem || 'praca.webp'}`)]);
  const naTrilha = (x, y) => centroCelula(celulaMaisProxima(grade, x, y));
  const saidas = cfg.saidas.map(([x, y]) => ({ x, y, trilha: naTrilha(x, y) }));
  cena = { tipo: 'mapa', n: 'praca', cfg, grade, portas: {}, saidas, naTrilha, pertoMural: false };
  destinoEspecial = null;
  alvoMapa = null;
  pertoSaidaGin = false;
  montarPessoas('praca');   // ninguém (limpa as pessoas do mapa anterior)
  montarPraca();
  if ((onde === 'fliperama' || onde === 'loja' || onde === 'laboratorio') && cena[onde]) posicionarJogador(cena[onde].trilha[0], cena[onde].trilha[1], 'frente');
  else posicionarJogador(cfg.entrada[0], cfg.entrada[1], 'costas');
  soltouDesdeTroca = false;
  ajustarCamera();
  $('cena-palco').style.visibility = '';
  atualizarBotaoPet();
  entrarNoMapaOnline('praca');
  conversa.proximaT = performance.now() + 8000;
  if (editarPraca) ligarEdicaoPraca();
}

// Rótulos do mural, do fliperama e da loja (o desenho está na imagem do mapa). mural.ponto: onde o aluno para para ler.
function montarPraca() {
  const C = cfgPraca(), m = C.mural, f = C.fliperama, l = C.loja;
  cena.mural = { ...m, trilha: cena.naTrilha(...(m.ponto || [m.x, m.y + 100])) };
  cena.fliperama = f ? { ...f, trilha: cena.naTrilha(f.x, f.y + 20) } : null;
  cena.loja = l ? { ...l, trilha: cena.naTrilha(l.x, l.y + 30) } : null;
  const lb = C.laboratorio;
  cena.laboratorio = lb && LAB ? { ...lb, trilha: cena.naTrilha(lb.x, lb.y + 30) } : null;
  const rotulo = (txt, x, y, cls) => `<div class="jr-rotulo-porta jr-rotulo-praca ${cls}" style="left:${x}px;top:${y}px"><span>${txt}</span></div>`;
  $('cena-atores').insertAdjacentHTML('beforeend', rotulo('📋 Mural da Escola', m.x, m.y - 125, 'mural') +
    (f ? rotulo('🕹️ Fliperama', f.x, f.y - 200, 'fliperama') : '') + (l ? rotulo('🛒 Loja', l.x, l.y - 140, 'loja') : '') +
    (cena.laboratorio ? rotulo('🤖 Laboratório', lb.x, lb.y - 150, 'laboratorio') : ''));
}
function alvoPracaEm(p) {
  const { mural: m, fliperama: f, loja: l, laboratorio: lb } = cena;
  if (m && Math.abs(p.x - m.x) < (m.largura || 240) / 2 && p.y > m.y - 130 && p.y < m.y + 120) return 'mural';
  if (f && Math.abs(p.x - f.x) < 90 && p.y > f.y - 220 && p.y < f.y + 30) return 'fliperama';
  if (l && Math.abs(p.x - l.x) < 80 && p.y > l.y - 150 && p.y < l.y + 30) return 'loja';
  if (lb && Math.abs(p.x - lb.x) < 90 && p.y > lb.y - 170 && p.y < lb.y + 30) return 'laboratorio';
  return null;
}
function irAlvoPraca(alvo) {
  const d = cena[alvo];
  destinoEspecial = null;
  caminharNaTrilha(d.trilha[0], d.trilha[1], () => {
    if (!ehPraca()) return;
    if (alvo === 'mural') { cena.pertoMural = true; abrirMural(); }
    else if (alvo === 'fliperama' && FLIPER) transicao(abrirFliperama);
    else if (alvo === 'loja' && LOJA) transicao(() => abrirLojaInterior({ tipo: 'praca' }));
    else if (alvo === 'laboratorio' && LAB) transicao(abrirLaboratorio);
  });
}
// A cada quadro na praça: chegar perto do mural abre o painel (uma vez até se afastar); botão 💬 no lugar do 😊
function atualizarPraca() {
  const m = cena.mural;
  if (!m) return;
  const d = dist(jog.x, jog.y, m.trilha[0], m.trilha[1]);
  if (d > 110) cena.pertoMural = false;
  else if (d < 40 && !cena.pertoMural && !sobreposicaoAberta()) { cena.pertoMural = true; abrirMural(); }
}

// ── Mural da Escola: 6 abas, top 10 + "Você" ──
const MURAL_ABAS = [['insignias', '🏅 Insígnias'], ['pesca', '🎣 Pesca'], ['tabuada', '✖️ Tabuada'], ['negativa', '➖ Tab. negativa'], ['escalada', '🧗 Escalada'], ['desafios', '⚔️ Desafios'],
  ['programe', '🤖 Programe hoje'], ['corridas', '🏁 Corridas']];
const mural = { aba: 'insignias', filtro: 'escola', cache: {} };
const visivelNoMural = (uid, r) => !!r && !ALUNOS_TESTE.includes(uid) && !/PROFESSOR|TESTE/i.test(`${uid} ${r.nome || ''}`) && TURMAS_PLACAR.includes(r.turma);
const lerNo = async (caminho) => { const s = await get(ref(db, caminho)); return s.exists() ? s.val() || {} : {}; };
async function carregarAbaMural(aba) {
  const lista = [];
  const poe = (uid, r, valor, rotulo, extra = {}) => { if (valor > 0) lista.push({ uid, nome: nomeVisivel(r.nome) || 'Aluno', turma: r.turma || '', valor, rotulo, pers: r.pers || null, ...extra }); };
  const bim = bimestreJogos();
  if (aba === 'insignias') {
    const todos = await lerNo(`${basePraca()}/insignias`);
    registrarTitulos(todos);
    for (const [uid, r] of Object.entries(todos)) if (teste || visivelNoMural(uid, r))
      poe(uid, r, Number(r.n) || 0, `${Number(r.n) || 0} 🏅${Number(r.d) ? ` · ${r.d} ⭐` : ''}`, { d: Number(r.d) || 0 });
    return ordenarRanking(lista, (a, b) => b.d - a.d);
  }
  if (aba === 'pesca') {
    for (const r of await lerRankingPesca(semanaPesca())) lista.push({ ...r, valor: r.pontos, rotulo: `${r.pontos} pts` });
    return ordenarRanking(lista);
  }
  if (aba === 'programe') {   // desafio do dia: menos blocos; empate: menos tempo para montar
    for (const [uid, r] of Object.entries(await lerNo(`${basePraca()}/programe/dia/${diaLocal()}`))) if (teste || visivelNoMural(uid, r)) {
      const b = Number(r.blocos) || 0, t = Math.min(999, Number(r.tempo_s) || 0);
      if (b > 0) lista.push({ uid, nome: nomeVisivel(r.nome) || 'Aluno', turma: r.turma || '', valor: 100000 - b * 1000 - t, rotulo: `${b} blocos · ${t} s`, pers: r.pers || null });
    }
    return ordenarRanking(lista);
  }
  if (aba === 'programe_estrelas') {   // Programe o pet: total de estrelas (resumo que cada aluno publica ao resolver uma fase)
    for (const [uid, r] of Object.entries(await lerNo(`${basePraca()}/programe/resumo`))) if (teste || visivelNoMural(uid, r))
      poe(uid, r, Number(r.estrelas) || 0, `${Number(r.estrelas) || 0} ⭐ · ${Number(r.fases) || 0} fases`, { fases: Number(r.fases) || 0 });
    return ordenarRanking(lista, (a, b) => b.fases - a.fases);
  }
  if (aba === 'corridas') {   // vitórias de corrida na semana
    for (const [uid, r] of Object.entries(await lerNo(`${basePraca()}/programe/corridas/${semanaPesca()}`))) if (teste || visivelNoMural(uid, r))
      poe(uid, r, Number(r.vitorias) || 0, `${Number(r.vitorias) || 0} vitória${Number(r.vitorias) === 1 ? '' : 's'}`, { vitorias: Number(r.vitorias) || 0 });
    return ordenarRanking(lista);
  }
  if (aba === 'desafios') {
    for (const [uid, r] of Object.entries(await lerNo(`${basePraca()}/desafios/${semanaPesca()}`))) if (teste || visivelNoMural(uid, r))
      poe(uid, r, Number(r.pontos) || 0, `${Number(r.pontos) || 0} pts`, { vitorias: Number(r.vitorias) || 0 });
    return ordenarRanking(lista, (a, b) => b.vitorias - a.vitorias);
  }
  // rankings que os outros jogos já gravam (o mesmo critério da página de ranking: melhor nível)
  const caminho = aba === 'tabuada' ? pathTabuadaRanking(bim) : aba === 'escalada' ? pathEscaladaRanking(bim)
    : bim <= 2 ? 'tabuada_negativos_niveis' : `tabuada_negativos_niveis_b/${bim}`;
  for (const [uid, r] of Object.entries(await lerNo(caminho))) if (visivelNoMural(uid, r)) {
    const v = Number(r.melhor_nivel || r.nivel_atual) || 0;
    poe(uid, r, v, `Nível ${v}`, { partidas: Number(r.total_partidas) || 0 });
  }
  return ordenarRanking(lista, (a, b) => b.partidas - a.partidas);
}
async function dadosMural(aba) {
  const c = mural.cache[aba];
  if (c && Date.now() - c.t < 120000) return c.lista;   // 2 min de cache: abrir e fechar o mural não relê tudo
  const lista = await carregarAbaMural(aba);
  mural.cache[aba] = { t: Date.now(), lista };
  return lista;
}
function abrirMural() {
  fecharCartaoColega();
  $('mural-abas').innerHTML = MURAL_ABAS.map(([id, nome]) => `<button data-aba="${id}">${nome}</button>`).join('');
  $('mural').hidden = false;
  renderMural();
}
async function renderMural() {
  for (const b of $('mural-abas').children) b.classList.toggle('ativa', b.dataset.aba === mural.aba);
  for (const b of $('mural-filtro').children) b.classList.toggle('ativa', b.dataset.filtro === mural.filtro);
  $('mural-filtro').querySelector('[data-filtro="turma"]').hidden = !TURMAS_PLACAR.includes(sessao.turma);
  const aba = mural.aba;
  $('mural-lista').innerHTML = '<li class="ml-vazio">Carregando…</li>';
  $('mural-voce').textContent = '';
  let lista;
  try { [, lista] = await Promise.all([dadosMural('insignias').catch(() => []), dadosMural(aba)]); }   // insígnias: rostinho de cada um
  catch (e) { console.warn('[jogo-revisao] mural', aba, e?.code || e); if (mural.aba === aba) $('mural-lista').innerHTML = '<li class="ml-vazio">Não deu para carregar agora.</li>'; return; }
  if (mural.aba !== aba || $('mural').hidden) return;
  const persDe = Object.fromEntries((mural.cache.insignias?.lista || []).map(r => [r.uid, r.pers]));
  const filtrada = mural.filtro === 'turma' ? ordenarRanking(lista.filter(r => r.turma === sessao.turma), (a, b) => (b.d ?? b.vitorias ?? b.partidas ?? 0) - (a.d ?? a.vitorias ?? a.partidas ?? 0)) : lista;
  const medalha = (pos) => ['🥇', '🥈', '🥉'][pos - 1] || `${pos}º`;
  $('mural-lista').innerHTML = filtrada.slice(0, 10).map(r => {
    const pers = r.pers || persDe[r.uid];
    return `<li class="${r.uid === sessao.uid ? 'eu' : ''}"><span class="ml-pos">${medalha(r.pos)}</span>
      ${pers && persValido(pers) ? bustoHtml(urlQuadro('frente', -1, pers), 'ml-rosto', BUSTO_PERS) : '<span class="ml-rosto ml-sem">🙂</span>'}
      <span class="ml-nome">${nomeT(r.uid, r.nome)}${esc(medalhaPesca(r.uid))} <small>${esc(r.turma)}</small></span><b>${esc(r.rotulo)}</b></li>`;
  }).join('') || '<li class="ml-vazio">Ninguém pontuou aqui ainda.</li>';
  const eu = filtrada.find(r => r.uid === sessao.uid);
  $('mural-voce').textContent = eu ? `Você: ${eu.pos}º · ${eu.rotulo}` : !entraNoRanking() ? 'Esta conta não entra no ranking.' : 'Jogue para aparecer aqui!';
}

// Resumo de insígnias para o mural (cada aluno grava o seu: ao entrar no jogo e ao ganhar insígnia)
async function publicarResumoInsignias() {
  if (!carregouProgresso || !entraNoRanking()) return;
  const { conquistadas, douradas } = contarInsignias();
  try { await set(ref(db, `${basePraca()}/insignias/${sessao.uid}`), { n: conquistadas, d: douradas, nome: nomeRanking(), turma: sessao.turma || '', pers: meuPersonagem(), ts: Date.now(),
    m: estado.mestre?.data || null, l: estado.lenda?.data || null }); }
  catch (e) { console.warn('[jogo-revisao] resumo do mural indisponível', e?.code || e); }
}

// ── Frases prontas (só na praça) + reações: no máximo 1 balão a cada 3 s ──
const ehFrase = (e) => frasesPraca().includes(e);
const balaoValido = (e) => REACOES.includes(e) || ehFrase(e);

// ── Desafio entre alunos ──
let duelo = null;            // { id, souA, eu, outro, d (dados), tema, timers, parar, ultimaVista, fimAplicado, woT }
let convite = null;          // convite recebido aberto: { id, de, de_nome, timer }
let pararConvites = null;
const vencidosMeus = () => Object.entries(estado.ginasios).filter(([, g]) => g.lider?.vencido).map(([k]) => k);
const nomeCurto = (uid, nome) => (/PROFESSOR/i.test(`${uid} ${nome || ''}`) ? 'Professora' : nomeVisivel(nome) || 'Colega');

function iniciarPraca() {
  try { onValue(ref(db, '.info/serverTimeOffset'), (s) => { offsetServidor = Number(s.val()) || 0; }); } catch (_) {}
  // a professora liga/desliga os desafios pelo painel: vale na hora
  try { onValue(ref(db, 'jogo_revisao_config/global/desafios_off'), (s) => { desafiosOff = (s.exists() && s.val()) || {}; }, () => {}); } catch (_) {}
  if (pararConvites || !onlineAtivo()) return;
  try {
    pararConvites = onValue(ref(db, `${basePraca()}/convites/${sessao.uid}`), (s) => { if (s.exists()) receberConvite(s.val()); }, () => {});
  } catch (_) { pararConvites = null; }
}

// Cartão do colega na praça: ⚔️ Desafiar (com aviso quando não vale prêmio)
// Transação no estado do desafio: convite → novo. Quem recebeu o convite ainda não tem o desafio no aparelho, e a transação começa
// com null; devolver null (e não undefined, que cancela) faz o Firebase buscar o valor real no servidor e repetir a conta.
const deConvitePara = (novo) => (cur) => (cur === null ? null : cur === 'convite' ? novo : undefined);
function podeDesafiar() { return ehPraca() && desafiosLigados() && onlineAtivo() && !duelo && carregouProgresso; }
// ⚔️ no cartão do colega: Contas (o desafio de sempre) ou Corrida de programação (PROMPT-50)
function escolherModoDesafio(c) {
  if (!podeDesafiar()) return;
  if (!PROG) { confirmarDesafio(c, 'contas'); return; }
  const el = $('colega-cartao');
  clearTimeout(cartaoColega.timer);
  cartaoColega.timer = setTimeout(fecharCartaoColega, 10000);
  el.innerHTML = `<span class="jr-colega-info jr-presente"><b>⚔️ Desafiar ${nomeT(c.uid, nomeCurto(c.uid, c.reg?.apelido))}</b>
    <span class="jr-presente-lista"><button data-modo="contas">✖️ Contas</button><button data-modo="corrida">🤖 Corrida</button></span></span>`;
  posicionarCartaoColega();
}
function confirmarDesafio(c, modo = 'contas') {
  if (!podeDesafiar()) return;
  if (vale(estado.desafiosDia, diaLocal(), c.uid)) { desafiarColega(c, modo); return; }
  const el = $('colega-cartao');
  clearTimeout(cartaoColega.timer);
  cartaoColega.timer = setTimeout(fecharCartaoColega, 10000);
  el.innerHTML = `<span class="jr-colega-info jr-presente"><b>⚔️ Sem prêmio hoje</b>
    <small>Você já fez os desafios que valem prêmio hoje (ou já desafiou ${nomeT(c.uid, nomeCurto(c.uid, c.reg?.apelido))} 2 vezes). Dá para jogar só por diversão.</small>
    <span class="jr-presente-lista"><button data-desafiar-mesmo="${modo}">⚔️ Desafiar mesmo assim</button></span></span>`;
  posicionarCartaoColega();
}
async function desafiarColega(c, modo = 'contas') {
  if (!podeDesafiar()) return;
  fecharCartaoColega();
  const C = cfgDesafio(), base = basePraca();
  const id = push(ref(db, `${base}/duelos`)).key;
  const eu = { uid: sessao.uid, nome: nomeRanking(), turma: sessao.turma || '', pers: meuPersonagem(), vencidos: vencidosMeus(), premio: vale(estado.desafiosDia, diaLocal(), c.uid), ...dadosCorrida() };
  const nomeOutro = nomeCurto(c.uid, c.reg?.apelido);
  try {
    await set(ref(db, `${base}/duelos/${id}`), { a: eu, b: { uid: c.uid, nome: nomeOutro }, estado: 'convite', modo: modo === 'corrida' ? 'corrida' : 'contas', criado: serverTimestamp() });
    await set(ref(db, `${base}/convites/${c.uid}`), { id, de: sessao.uid, de_nome: eu.nome, modo: modo === 'corrida' ? 'corrida' : 'contas', ts: serverTimestamp() });
  } catch (e) { console.warn('[jogo-revisao] desafio indisponível', e?.code || e); avisoPet('Não deu para desafiar agora.'); return; }
  avisarEm(`⚔️ Convite enviado para ${nomeOutro}…`, jog.x, jog.y - ALT_JOGADOR_MAPA - 10);
  ouvirDuelo(id, true);
  duelo.timers.push(setTimeout(async () => {   // ninguém respondeu: expira
    if (duelo?.id !== id || duelo.d?.estado !== 'convite') return;
    try { await runTransaction(ref(db, `${base}/duelos/${id}/estado`), deConvitePara('expirou')); } catch (_) {}
  }, (C.convite_expira_s ?? 20) * 1000 + 800));
}

// Quem recebe: balão "Fulano te desafiou!" (some em 20 s). Fora da praça ou já num desafio: ocupado.
async function receberConvite(cv) {
  if (!cv?.id || convite?.id === cv.id) return;
  const exp = (cfgDesafio().convite_expira_s ?? 20) * 1000;
  const idade = agoraServ() - (Number(cv.ts) || 0);
  if (idade > exp || idade < -5000) { remove(ref(db, `${basePraca()}/convites/${sessao.uid}`)).catch(() => {}); return; }
  if (!ehPraca() || duelo || !desafiosLigados()) {
    try { await runTransaction(ref(db, `${basePraca()}/duelos/${cv.id}/estado`), deConvitePara('ocupado')); } catch (_) {}
    remove(ref(db, `${basePraca()}/convites/${sessao.uid}`)).catch(() => {});
    return;
  }
  const premio = vale(estado.desafiosDia, diaLocal(), cv.de);
  convite = { ...cv, premio };
  $('convite-txt').innerHTML = cv.modo === 'corrida' ? `<b>${nomeT(cv.de, nomeCurto(cv.de, cv.de_nome))}</b> te chamou para uma Corrida de programação! 🤖`
    : `<b>${nomeT(cv.de, nomeCurto(cv.de, cv.de_nome))}</b> te desafiou! ⚔️`;
  $('convite-aviso').hidden = premio;
  $('convite').hidden = false;
  tocar('vitoria');
  const fim = Date.now() + exp - Math.max(0, idade);
  const barra = () => {
    if (!convite || convite.id !== cv.id) return;
    const f = (fim - Date.now()) / exp;
    $('convite-tempo').style.width = Math.max(0, f) * 100 + '%';
    if (f <= 0) { responderConvite(false, true); return; }
    requestAnimationFrame(barra);
  };
  barra();
}
async function responderConvite(aceitar, expirou = false) {
  const cv = convite;
  convite = null;
  $('convite').hidden = true;
  if (!cv) return;
  const base = basePraca();
  remove(ref(db, `${base}/convites/${sessao.uid}`)).catch(() => {});
  if (!aceitar) {
    try { await runTransaction(ref(db, `${base}/duelos/${cv.id}/estado`), deConvitePara(expirou ? 'expirou' : 'recusado')); } catch (_) {}
    if (expirou) avisoPet('Fica para a próxima! ⚔️');
    return;
  }
  if (duelo || !ehPraca()) return;
  try {
    await update(ref(db, `${base}/duelos/${cv.id}/b`), { uid: sessao.uid, nome: nomeRanking(), turma: sessao.turma || '', pers: meuPersonagem(), vencidos: vencidosMeus(), premio: cv.premio, ...dadosCorrida() });
    const t = await runTransaction(ref(db, `${base}/duelos/${cv.id}/estado`), deConvitePara('aceito'));
    if (t.snapshot.val() !== 'aceito') { avisoPet('O convite expirou. Fica para a próxima! ⚔️'); return; }
  } catch (e) { console.warn('[jogo-revisao] aceitar desafio', e?.code || e); avisoPet('Não deu para aceitar agora.'); return; }
  ouvirDuelo(cv.id, false);
}

function ouvirDuelo(id, souA) {
  const r = ref(db, `${basePraca()}/duelos/${id}`);
  duelo = { id, souA, ref: r, timers: [], d: null, comecou: false, fimAplicado: false, mostradas: {}, woT: 0 };
  duelo.parar = onValue(r, (s) => { if (duelo?.id === id) atualizarDuelo(s.exists() ? s.val() : null); }, () => {});
}
function encerrarDueloLocal() {
  if (!duelo) return;
  duelo.parar?.();
  duelo.timers.forEach(clearTimeout);
  cancelAnimationFrame(duelo.raf);
  try { onDisconnect(ref(db, `${basePraca()}/duelos/${duelo.id}/on/${sessao.uid}`)).cancel(); } catch (_) {}
  remove(ref(db, `${basePraca()}/duelos/${duelo.id}/on/${sessao.uid}`)).catch(() => {});
  duelo = null;
  $('duelo').hidden = true;
}

function atualizarDuelo(d) {
  const du = duelo;
  if (!d) { encerrarDueloLocal(); return; }
  du.d = d;
  const outroLado = du.souA ? 'b' : 'a';
  if (!du.comecou && ['recusado', 'expirou', 'ocupado'].includes(d.estado)) {
    avisoPet(d.estado === 'ocupado' ? `${nomeCurto(d.b?.uid, d.b?.nome)} está ocupado agora. Fica para a próxima! ⚔️` : 'Fica para a próxima! ⚔️');
    encerrarDueloLocal();
    return;
  }
  if (!du.comecou && (d.estado === 'aceito' || d.estado === 'jogando') && d.a?.pers && d.b?.pers) comecarDuelo(d);   // (lista vazia de vencidos não é gravada: espera o pers)
  if (!du.comecou) return;
  du.outro = d[outroLado];
  if (d.modo === 'corrida') { atualizarCorrida(d); return; }
  renderDuelo(d);
  if (d.fim) { aplicarFimDuelo(d); return; }
  vigiarWO(d);
  if (du.souA) conduzirDuelo(d);
}

// Aceito: cada um anda até o seu lado do ponto do desafio; a tela do duelo abre logo depois
function comecarDuelo(d) {
  const du = duelo;
  du.comecou = true;
  du.eu = du.souA ? d.a : d.b;
  du.outro = du.souA ? d.b : d.a;
  const onRef = ref(db, `${basePraca()}/duelos/${du.id}/on/${sessao.uid}`);
  set(onRef, true).then(() => onDisconnect(onRef).remove()).catch(() => {});
  fecharCartaoColega();
  const pd = cfgPraca().ponto_desafio, meu = pd && (du.souA ? pd.a : pd.b);   // frente a frente: quem desafiou à esquerda
  if (ehPraca() && meu) caminharNaTrilha(meu[0], meu[1], () => { jog.dir = du.souA ? 'direita' : 'esquerda'; desenharJogador(); });
  $('dl-nomeL').textContent = 'Você';
  $('dl-nomeR').innerHTML = nomeT(du.outro.uid, nomeCurto(du.outro.uid, du.outro.nome));
  $('dl-bustoL').innerHTML = bustoHtml(urlQuadro('direita', -1, persValido(du.eu.pers) ? du.eu.pers : PERS.padrao), 'dl-busto-img', BUSTO_PERS);
  $('dl-bustoR').innerHTML = bustoHtml(urlQuadro('esquerda', -1, persValido(du.outro.pers) ? du.outro.pers : PERS.padrao), 'dl-busto-img', BUSTO_PERS);
  $('dl-conta').textContent = 'Prepare-se…';
  $('dl-ops').innerHTML = '';
  $('dl-msg').textContent = du.eu.premio ? '' : 'Este desafio não vale prêmio para você hoje (limite do dia).';
  $('dl-fim').hidden = true;
  if (d.modo === 'corrida') { comecarCorrida(d); return; }   // corrida de programação: a tela do Programe o pet no lugar das contas
  du.timers.push(setTimeout(() => { if (duelo === du) { $('duelo').hidden = false; animarTempoDuelo(); } }, 2200));
  if (du.souA && d.estado === 'aceito') {
    du.tema = temaDoDesafio(d.a.vencidos, d.b.vencidos);
    du.timers.push(setTimeout(() => { if (duelo === du && !du.d?.fim) novaRodada(0); }, 3500));
  }
}

// Quem desafiou (lado A) gera as rodadas e fecha cada uma (o primeiro acerto, pelo relógio do servidor, ganha)
function novaRodada(i) {
  const du = duelo, C = cfgDesafio();
  const p = gerarConta(du.tema.tipos, C.dificuldade ?? 2);
  update(du.ref, { estado: 'jogando', atual: i, tema: du.tema.ginasio || null,
    [`rodadas/${i}`]: { conta: p.conta, opcoes: p.opcoes, resposta: p.resposta, tipo: p.tipo, longa: !!p.longa, inicio: serverTimestamp() } }).catch(() => {});
}
function conduzirDuelo(d) {
  const du = duelo, C = cfgDesafio(), i = Number(d.atual), r = d.rodadas?.[i];
  if (!r || r.fim || typeof r.inicio !== 'number') return;
  const resp = r.resp || {}, venc = vencedorDaRodada(resp, r.resposta);
  const todos = Object.keys(resp).length >= 2, acabou = agoraServ() > r.inicio + (C.tempo_rodada_s ?? 10) * 1000 + 600;
  if (!venc && !todos && !acabou) { clearTimeout(du.tConduz); du.tConduz = setTimeout(() => { if (duelo === du && du.d) conduzirDuelo(du.d); }, 300); return; }
  update(du.ref, { [`rodadas/${i}/fim`]: { vencedor: venc || null, ts: serverTimestamp() } }).catch(() => {});
  du.timers.push(setTimeout(() => {
    if (duelo !== du || du.d?.fim) return;
    if (i + 1 < (C.rodadas ?? 5)) novaRodada(i + 1);
    else finalizarDuelo();
  }, 2400));
}
async function finalizarDuelo(wo = null) {
  const du = duelo, d = du.d, a = d.a.uid, b = d.b.uid;
  const placar = placarDe(d.rodadas, [a, b]);
  const vencedor = wo || resultadoFinal(placar, a, b);
  const fim = { vencedor, placar, wo: !!wo, ts: serverTimestamp() };
  try {
    const t = await runTransaction(ref(db, `${basePraca()}/duelos/${du.id}/fim`), (cur) => (cur ? undefined : fim));
    if (!t.committed) return;
    await set(ref(db, `${basePraca()}/historico/${semanaPesca()}/${du.id}`), { a, b, an: d.a.nome || '', bn: d.b.nome || '', at: d.a.turma || '', bt: d.b.turma || '',
      vencedor, placar: `${placar[a]}-${placar[b]}`, wo: !!wo, ts: Date.now() });
  } catch (e) { console.warn('[jogo-revisao] fim do desafio', e?.code || e); }
}
// Desconectou no meio: depois de wo_s sem o outro, quem ficou vence por W.O.
function vigiarWO(d) {
  const du = duelo, outro = du.outro?.uid;
  if (!outro || d.estado === 'aceito' && !d.on) return;
  if (d.on?.[outro]) { du.woT = 0; return; }
  if (!du.woT) du.woT = Date.now();
  clearTimeout(du.tWO);
  const falta = (cfgDesafio().wo_s ?? 15) * 1000 - (Date.now() - du.woT);
  if (falta <= 0) { finalizarDuelo(sessao.uid); return; }
  du.tWO = setTimeout(() => { if (duelo === du && du.d && !du.d.fim) vigiarWO(du.d); }, Math.min(falta, 1000) + 50);
}

function responderDuelo(op) {
  const du = duelo, d = du?.d, i = Number(d?.atual), r = d?.rodadas?.[i];
  if (!r || r.fim || r.resp?.[sessao.uid] || du.respondi === i) return;
  du.respondi = i;
  set(ref(db, `${basePraca()}/duelos/${du.id}/rodadas/${i}/resp/${sessao.uid}`), { op, t: serverTimestamp() }).catch(() => { du.respondi = null; });
  for (const b of $('dl-ops').querySelectorAll('.dl-op')) { b.disabled = true; if (b.dataset.op === op) b.classList.add('minha'); }
  tocar('clique');
}
function renderDuelo(d) {
  const du = duelo, C = cfgDesafio(), eu = sessao.uid, outro = du.outro.uid;
  const placar = placarDe(d.rodadas, [eu, outro]);
  $('dl-ptsL').textContent = placar[eu];
  $('dl-ptsR').textContent = placar[outro];
  const i = Number(d.atual);
  const r = d.rodadas?.[i];
  if (!r) return;
  $('dl-rodada').textContent = `Rodada ${i + 1} / ${C.rodadas ?? 5}`;
  if (du.mostradas[i] !== 'conta') {   // rodada nova
    du.mostradas[i] = 'conta';
    du.respondi = null;
    $('dl-conta').textContent = r.conta;
    $('dl-conta').classList.toggle('longa', !!r.longa);
    $('dl-ops').innerHTML = (r.opcoes || []).map(o => `<button class="dl-op" data-op="${esc(o)}">${esc(o)}</button>`).join('');
    $('dl-msg').textContent = '';
  }
  if (r.fim && du.mostradas[`fim${i}`] !== true) {   // fim da rodada: quem acertou e a resposta certa
    du.mostradas[`fim${i}`] = true;
    for (const b of $('dl-ops').querySelectorAll('.dl-op')) {
      b.disabled = true;
      if (b.dataset.op === r.resposta) b.classList.add('certa');
      else if (b.classList.contains('minha')) b.classList.add('errada');
    }
    const v = r.fim.vencedor;
    $('dl-msg').innerHTML = `${v === eu ? '✅ Você acertou primeiro!' : v ? `⚡ ${nomeT(outro, nomeCurto(outro, du.outro.nome))} acertou primeiro.` : '😮 Ninguém acertou.'} Resposta: <b>${esc(r.resposta)}</b>`;
    tocar(v === eu ? 'acerto' : 'erro');
  }
}
function animarTempoDuelo() {
  const du = duelo;
  if (!du) return;
  const r = du.d?.rodadas?.[Number(du.d?.atual)], lim = (cfgDesafio().tempo_rodada_s ?? 10) * 1000;
  const f = r && typeof r.inicio === 'number' && !r.fim ? 1 - (agoraServ() - r.inicio) / lim : r?.fim ? 0 : 1;
  $('dl-tempo').style.width = Math.max(0, Math.min(1, f)) * 100 + '%';
  du.raf = requestAnimationFrame(animarTempoDuelo);
}

// Fim: cada um grava o próprio prêmio (se valer), as respostas para os relatórios e o ranking da semana
function aplicarFimDuelo(d) {
  const du = duelo;
  if (du.fimAplicado) return;
  du.fimAplicado = true;
  missaoProgresso('desafio');
  const eu = sessao.uid, outro = du.outro.uid, f = d.fim;
  const res = f.vencedor === 'empate' ? 'empate' : f.vencedor === eu ? 'venceu' : 'perdeu';
  const ganhas = Number(f.placar?.[eu]) || 0;
  const hoje = diaLocal(), valeu = !!du.eu.premio && vale(estado.desafiosDia, hoje, outro);
  const { moedas, pontos } = premioDesafio(res, ganhas);
  const patch = {};
  for (const [i, r] of Object.entries(d.rodadas || {})) {   // cada rodada nas respostas (relatórios da professora)
    const m = r.resp?.[eu];
    patch[`respostas/desafio-${du.id}-${i}`] = { tipo: 'desafio', tipo_conta: r.tipo || null, conta: r.conta, certa: r.resposta, resposta: m?.op ?? null,
      acertou: m ? m.op === r.resposta : null, tempo_s: m && typeof r.inicio === 'number' ? +((Number(m.t) - r.inicio) / 1000).toFixed(1) : null,
      ganhou_rodada: r.fim?.vencedor === eu, contra: outro, data: Date.now() };
  }
  if (valeu && carregouProgresso) {
    estado.desafiosDia = contarDesafio(estado.desafiosDia, hoje, outro);
    patch.desafios_dia = estado.desafiosDia;
    if (moedas) { estado.pets.moedas = (Number(estado.pets.moedas) || 0) + moedas; patch['pets/moedas'] = estado.pets.moedas; registrarGanho('desafio', moedas, patch); }
    if (pontos && entraNoRanking()) update(ref(db, `${basePraca()}/desafios/${semanaPesca()}/${eu}`), { pontos: increment(pontos), vitorias: increment(res === 'venceu' ? 1 : 0),
      nome: nomeRanking(), turma: sessao.turma || '', pers: meuPersonagem(), ts: Date.now() }).catch(() => {});
    delete mural.cache.desafios;
  }
  gravar(patch);
  tocar(res === 'venceu' ? 'vitoria' : res === 'empate' ? 'acerto' : 'erro');
  const titulo = res === 'venceu' ? (f.wo ? '🏆 Você venceu por W.O.!' : '🏆 Você venceu!') : res === 'empate' ? '🤝 Empate!' : `${nomeT(outro, nomeCurto(outro, du.outro.nome))} venceu!`;
  $('dl-fim-titulo').innerHTML = titulo;
  $('dl-fim-placar').textContent = `${ganhas} × ${Number(f.placar?.[outro]) || 0}`;
  $('dl-fim-premio').textContent = !valeu ? 'Sem prêmio (limite do dia) — valeu pela diversão!' : moedas || pontos ? `+${moedas} moeda${moedas === 1 ? '' : 's'} · +${pontos} pontos de Desafio 🏆` : 'Boa partida! Tente de novo.';
  $('dl-fim').hidden = false;
  $('duelo').hidden = false;
  du.timers.forEach(clearTimeout);
  du.parar?.();
}

// ── Modo de ajuste da praça (?editarPraca=1, só no modo teste): arrastar e copiar o JSON ──
function ligarEdicaoPraca() {
  const C = cfgPraca();
  const obj = (o) => o && { pos: () => [o.x, o.y], por: (x, y) => { o.x = x; o.y = y; } };
  const par = (a) => a && { pos: () => a, por: (x, y) => { a[0] = x; a[1] = y; } };
  const itens = [['mural', obj(C.mural), '📋'], ['mural: onde para', par(C.mural?.ponto), '👣'], ['fliperama', obj(C.fliperama), '🕹️'], ['loja', obj(C.loja), '🛒'],
    ['desafio A', par(C.ponto_desafio?.a), '⚔️'], ['desafio B', par(C.ponto_desafio?.b), '⚔️'], ['entrada', par(C.entrada), '🚪'],
    ...(C.bancos || []).map((b, i) => [`banco ${i + 1}`, par(b), '🪑'])].filter(([, o]) => o);
  for (const [nome, o, ic] of itens) {
    const el = document.createElement('div');
    el.className = 'jr-praca-edit';
    el.textContent = `${ic} ${nome}`;
    Object.assign(el.style, { left: o.pos()[0] + 'px', top: o.pos()[1] + 'px' });
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      const mover = (ev) => {
        const q = telaParaImagem(ev.clientX, ev.clientY);
        const x = Math.round(clamp(q.x, 0, W)), y = Math.round(clamp(q.y, 0, H));
        o.por(x, y);
        Object.assign(el.style, { left: x + 'px', top: y + 'px' });
        $('npc-editar-pos').textContent = `${nome}: x ${x}, y ${y}`;
      };
      const soltar = () => { el.removeEventListener('pointermove', mover); el.removeEventListener('pointerup', soltar); el.removeEventListener('pointercancel', soltar); };
      el.addEventListener('pointermove', mover);
      el.addEventListener('pointerup', soltar);
      el.addEventListener('pointercancel', soltar);
    });
    $('cena-atores').appendChild(el);
  }
  $('npc-editar')?.remove();
  const caixa = document.createElement('div');
  caixa.id = 'npc-editar';
  caixa.className = 'jr-npc-editar';
  caixa.innerHTML = `<span id="npc-editar-pos">Arraste os pontos da praça</span><button class="jr-btn" id="npc-copiar">📋 Copiar posições</button>`;
  $('tela-cena').appendChild(caixa);
  $('npc-copiar').addEventListener('click', async () => {
    const { entrada, saidas, mural: mu, fliperama, ponto_desafio, bancos, loja } = C;
    const txt = JSON.stringify({ entrada, saidas, mural: mu, fliperama, ponto_desafio, bancos, loja }, null, 1);
    try { await navigator.clipboard.writeText(txt); $('npc-editar-pos').textContent = 'Copiado! Cole no praca.json.'; }
    catch (_) { console.log(txt); $('npc-editar-pos').textContent = 'Não deu para copiar: o JSON está no console (F12).'; }
  });
}

// ============================================================
//  FLIPERAMA — salão dentro da praça (dados/jogo/fliperama.json): as máquinas abrem os jogos do site
//  (iframe com ?embed=1, que avisa o fim de cada partida) e a Tabuada ao vivo (js/jogo-revisao/aovivo*.js).
//  Anda em 2D como nos mapas (area_livre → grade), com o personagem no tamanho dos ginásios.
// ============================================================
let FLIPER = null;                   // fliperama.json
let editarFliperama = false;         // ?editarFliperama=1 no modo teste: arrastar máquinas, porta e Téo
const MAQ_ABA = { tabuada: 'tabuada', tabuada_negativa: 'negativa', escalada: 'escalada' };   // aba do mural com o ranking da máquina

function gradeDeRetangulos(rets) {
  const g = new Uint8Array(GW * GH);
  for (const r of rets || [])
    for (let cy = Math.max(0, Math.floor(r.y0 / CEL)); cy < Math.min(GH, Math.ceil(r.y1 / CEL)); cy++)
      for (let cx = Math.max(0, Math.floor(r.x0 / CEL)); cx < Math.min(GW, Math.ceil(r.x1 / CEL)); cx++) g[cy * GW + cx] = 1;
  return g;
}

async function abrirFliperama() {
  if (!FLIPER) return;
  sairPesca(false);
  cena = null;
  esconderBalao();
  fecharCartaoColega();
  $('btn-revanche').hidden = true;
  $('cena-aviso').hidden = true;
  $('cena-atores').innerHTML = '';
  $('cena-titulo').textContent = '🕹️ Fliperama';
  $('btn-cena-voltar').textContent = '⟵ Praça';
  $('btn-cena-voltar').hidden = false;
  $('tela-cena').classList.remove('jr-no-ginasio');
  mostrarTela('tela-cena');
  $('cena-palco').style.visibility = 'hidden';
  limparPessoas();
  sairDoMapaOnline();
  enviarOnline({ mapa: 'praca', local: 'fliperama' });   // aqui dentro os colegas da praça não veem você
  await trocarFundo(`${IMG}/interiores/${FLIPER.imagem || 'fliperama.webp'}`);
  const grade = gradeDeRetangulos(FLIPER.area_livre);
  const naTrilha = (x, y) => centroCelula(celulaMaisProxima(grade, x, y));
  const [px, py] = FLIPER.porta;
  cena = { tipo: 'mapa', n: 'fliperama', salao: true, alturaPersonagem: FLIPER.altura_personagem, cfg: { entrada: FLIPER.entrada, saidas: [FLIPER.porta] }, grade, portas: {}, naTrilha,
    saidas: [{ x: px, y: py, trilha: naTrilha(px, py) }] };
  destinoEspecial = null;
  alvoMapa = null;
  pertoSaidaGin = false;
  montarFliperama();
  posicionarJogador(FLIPER.entrada[0], FLIPER.entrada[1], 'costas');
  soltouDesdeTroca = false;
  ajustarCamera();
  $('cena-palco').style.visibility = '';
  $('btn-colegas').hidden = $('btn-reacao').hidden = true;
  atualizarBotaoPet();
  if (editarFliperama) ligarEdicaoFliperama();
}

function montarFliperama() {
  cena.maquinas = (FLIPER.maquinas || []).map(m => ({ ...m, trilha: cena.naTrilha(...(m.ponto || [m.x, m.y + 150])) }));
  const rot = cena.maquinas.map(m => `<div class="jr-rotulo-porta jr-rotulo-praca jr-maq-${esc(m.cor || '')}" style="left:${m.x}px;top:${m.y - 112}px"><span>${m.icone || '🎮'} ${esc(m.nome)}</span></div>`).join('');
  $('cena-atores').insertAdjacentHTML('beforeend', rot);
  montarPessoas('fliperama');   // o Téo (atendente), em fliperama.json → teo (ou balcao)
}
function alvoFliperamaEm(p) {
  const m = (cena.maquinas || []).find(m => Math.abs(p.x - m.x) < 85 && p.y > m.y - 115 && p.y < m.trilha[1] + 20);
  return m ? { tipo: 'maquina', m } : null;
}
function irAlvoFliperama(a) {
  const d = a.m;
  destinoEspecial = null;
  caminharNaTrilha(d.trilha[0], d.trilha[1], () => {
    if (cena?.n !== 'fliperama') return;
    jog.dir = 'costas';
    desenharJogador();
    abrirMaquina(a.m);
  });
}

// Recorde do aluno no próprio jogo (o melhor nível que o jogo já gravou)
async function lerRecorde(id) {
  if (ehProfessora() || teste) return null;
  const bim = bimestreJogos(), uid = sessao.uid;
  const caminho = id === 'tabuada' ? pathTabuadaNiveis(uid, bim) : id === 'tabuada_negativa' ? pathTabuadaNegNiveis(uid, bim) : id === 'escalada' ? pathEscaladaNiveis(uid, bim) : null;
  if (!caminho) return null;
  try { const s = await get(ref(db, caminho)); return s.exists() ? Number(s.val()?.melhor_nivel) || 0 : 0; } catch (_) { return null; }
}
async function top3DaTurma(id) {
  const lista = await dadosMural(MAQ_ABA[id]);
  const daTurma = TURMAS_PLACAR.includes(sessao.turma) ? ordenarRanking(lista.filter(r => r.turma === sessao.turma)) : lista;
  return daTurma.slice(0, 3);
}

async function abrirMaquina(m) {
  if (m.id === 'tabuada_ao_vivo') { abrirAoVivo(); return; }
  $('mq-nome').textContent = `${m.icone || '🎮'} ${m.nome}`;
  $('mq-corpo').innerHTML = '<p class="mq-car">Carregando…</p>';
  $('mq-botoes').innerHTML = `<button class="jr-btn jr-btn-ouro" data-jogar="${esc(m.id)}">▶ Jogar</button>`;
  $('maquina').hidden = false;
  const [rec, top] = await Promise.all([lerRecorde(m.id), top3DaTurma(m.id).catch(() => [])]);
  if ($('maquina').hidden) return;
  const pers = (r) => r.pers || (mural.cache.insignias?.lista || []).find(x => x.uid === r.uid)?.pers;
  $('mq-corpo').innerHTML = `<p class="mq-rec">Seu recorde: <b>${rec ? `Nível ${rec}` : '—'}</b></p>
    <p class="mq-sub">🏆 Top 3 ${TURMAS_PLACAR.includes(sessao.turma) ? `da ${esc(sessao.turma)}` : 'da escola'}</p>
    <ol class="mq-top">${top.map(r => `<li><span>${['🥇', '🥈', '🥉'][r.pos - 1] || r.pos + 'º'}</span>${persValido(pers(r)) ? bustoHtml(urlQuadro('frente', -1, pers(r)), 'ml-rosto', BUSTO_PERS) : '<span class="ml-rosto ml-sem">🙂</span>'}<b>${esc(r.nome)}</b><em>${esc(r.rotulo)}</em></li>`).join('') || '<li class="mq-vazio">Ninguém jogou ainda.</li>'}</ol>
    <p class="mq-nota">+1 🪙 a cada ${FLIPER.acertos_por_moeda ?? 10} acertos (até ${FLIPER.moedas_dia ?? 10} por dia no fliperama)</p>`;
}

// 🏆 Recordes (botão do balão do Téo): top 3 de cada máquina
async function mostrarRecordes() {
  $('maquina').hidden = false;
  $('mq-nome').textContent = '🏆 Recordes do fliperama';
  $('mq-botoes').innerHTML = '';
  $('mq-corpo').innerHTML = '<p class="mq-car">Carregando…</p>';
  const maqs = (FLIPER.maquinas || []).filter(m => MAQ_ABA[m.id]);
  const tops = await Promise.all(maqs.map(m => top3DaTurma(m.id).catch(() => [])));
  if ($('maquina').hidden) return;
  $('mq-corpo').innerHTML = `<div class="mq-recordes">${maqs.map((m, i) => `<div><b>${m.icone || '🎮'} ${esc(m.nome)}</b><ol>${tops[i].map(r => `<li>${['🥇', '🥈', '🥉'][r.pos - 1] || ''} ${esc(r.nome)} <em>${esc(r.rotulo)}</em></li>`).join('') || '<li class="mq-vazio">—</li>'}</ol></div>`).join('')}</div>`;
}

// ── Jogo do site dentro do jogo (iframe) ──
let jogoEmbed = null;   // { m, recorde, moedas }
async function abrirJogoEmbed(id) {
  const m = (FLIPER.maquinas || []).find(x => x.id === id);
  if (!m?.jogo) return;
  $('maquina').hidden = true;
  if (ehProfessora() && id === 'escalada') { avisoPet('A Escalada algébrica só abre com o login de aluno.'); return; }
  if (!getSession()) { avisoPet('Sua sessão expirou. Entre de novo no site para jogar.'); return; }
  jogoEmbed = { m, recorde: await lerRecorde(id), moedas: 0 };
  const url = '/' + m.jogo.replace(/^\//, '');
  $('jogo-embed-frame').src = url + (url.includes('?') ? '&' : '?') + 'embed=1';
  $('jogo-embed-nome').textContent = `${m.icone || '🎮'} ${m.nome}`;
  $('jogo-embed').hidden = false;
  pararFalaPet();
}
async function voltarDoJogo() {
  const je = jogoEmbed;
  jogoEmbed = null;
  $('jogo-embed').hidden = true;
  $('jogo-embed-frame').src = 'about:blank';
  if (!je) return;
  if (je.moedas) { avisoPet(`+${je.moedas} 🪙 no fliperama!`, true); tocar('vitoria'); }
  delete mural.cache[MAQ_ABA[je.m.id]];
  const depois = await lerRecorde(je.m.id);
  if (je.recorde != null && depois != null && depois > je.recorde) {   // bateu o próprio recorde: o pet comemora
    avisoPet(`Recorde novo! 🎉 ${je.m.nome}: nível ${depois}`, true);
    seguidor?.reagir(petTem('pulo_cambalhota') ? 'pulo_cambalhota' : 'feliz', 1800);
  }
}
const petTem = (anim) => !!(seguidor?.pet && quadrosDe(seguidor.forma, anim)?.length);
// Fim de partida (postMessage do jogo): +1 moeda a cada 10 acertos somados no dia, até 10 por dia
function premioFliperama(d) {
  if (!jogoEmbed || !carregouProgresso) return;
  const hoje = diaLocal(), por = FLIPER.acertos_por_moeda ?? 10, lim = FLIPER.moedas_dia ?? 10;
  const fd = estado.fliperDia?.data === hoje ? { ...estado.fliperDia } : { data: hoje, acertos: 0, moedas: 0 };
  const acertosPartida = Math.max(0, Math.min(500, Math.round(Number(d.acertos) || 0)));
  fd.acertos = (Number(fd.acertos) || 0) + acertosPartida;
  missaoProgresso('fliperama', acertosPartida);
  const alvo = Math.min(lim, Math.floor(fd.acertos / por)), ganho = alvo - (Number(fd.moedas) || 0);
  const patch = {};
  if (ganho > 0) {
    fd.moedas = alvo;
    estado.pets.moedas = (Number(estado.pets.moedas) || 0) + ganho;
    patch['pets/moedas'] = estado.pets.moedas;
    registrarGanho('fliperama', ganho, patch);
    jogoEmbed.moedas += ganho;
  }
  estado.fliperDia = fd;
  patch.fliperama_dia = fd;
  gravar(patch);
}

// ── Modo de ajuste do fliperama (?editarFliperama=1, só no modo teste) ──
function ligarEdicaoFliperama() {
  const par = (a) => a && { pos: () => a, por: (x, y) => { a[0] = x; a[1] = y; } };
  const obj = (o) => o && { pos: () => [o.x, o.y], por: (x, y) => { o.x = x; o.y = y; } };
  if (!FLIPER.teo && FLIPER.balcao) FLIPER.teo = { x: FLIPER.balcao[0], y: FLIPER.balcao[1] };
  const itens = [['porta', par(FLIPER.porta), '🚪'], ['entrada', par(FLIPER.entrada), '👣'], ['Téo (pés)', obj(FLIPER.teo), '🧑'], ['Téo: onde o aluno para', par(FLIPER.teo?.ponto), '👣'],
    ...(FLIPER.maquinas || []).flatMap(m => [[m.nome, obj(m), '🕹️'], [`${m.nome}: onde para`, par(m.ponto), '👣']])].filter(([, o]) => o);
  for (const [nome, o, ic] of itens) {
    const el = document.createElement('div');
    el.className = 'jr-praca-edit';
    el.textContent = `${ic} ${nome}`;
    Object.assign(el.style, { left: o.pos()[0] + 'px', top: o.pos()[1] + 'px' });
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      const mover = (ev) => {
        const q = telaParaImagem(ev.clientX, ev.clientY);
        const x = Math.round(clamp(q.x, 0, W)), y = Math.round(clamp(q.y, 0, H));
        o.por(x, y);
        Object.assign(el.style, { left: x + 'px', top: y + 'px' });
        $('npc-editar-pos').textContent = `${nome}: x ${x}, y ${y}`;
      };
      const soltar = () => { el.removeEventListener('pointermove', mover); el.removeEventListener('pointerup', soltar); el.removeEventListener('pointercancel', soltar); };
      el.addEventListener('pointermove', mover);
      el.addEventListener('pointerup', soltar);
      el.addEventListener('pointercancel', soltar);
    });
    $('cena-atores').appendChild(el);
  }
  $('npc-editar')?.remove();
  const caixa = document.createElement('div');
  caixa.id = 'npc-editar';
  caixa.className = 'jr-npc-editar';
  caixa.innerHTML = `<span id="npc-editar-pos">Arraste as máquinas, a porta e o Téo</span><button class="jr-btn" id="npc-copiar">📋 Copiar fliperama.json</button>`;
  setInterval(() => { const o = pessoasMapa.find(x => x.p.id === 'teo'); if (o && FLIPER.teo && (o.p.x !== FLIPER.teo.x || o.p.y !== FLIPER.teo.y)) { o.p.x = FLIPER.teo.x; o.p.y = FLIPER.teo.y; posicionarPessoa(o); } }, 200);
  $('tela-cena').appendChild(caixa);
  $('npc-copiar').addEventListener('click', async () => {
    const txt = JSON.stringify(FLIPER, null, 1);
    try { await navigator.clipboard.writeText(txt); $('npc-editar-pos').textContent = 'Copiado! Cole no fliperama.json.'; }
    catch (_) { console.log(txt); $('npc-editar-pos').textContent = 'Não deu para copiar: o JSON está no console (F12).'; }
  });
}

// ── Tabuada ao vivo: criar sala / entrar com código; rodadas iguais para todos (estilo Kahoot) ──
let av = null;          // { codigo, host (Anfitriao), sala, parar, vista, respondi, registradas: Set, premio }
let pararConviteAV = null;
const baseAV = () => baseAoVivo(teste);
const avTela = (html) => { $('av-tela').innerHTML = html; };

function abrirAoVivo() {
  $('maquina').hidden = true;
  $('aovivo').hidden = false;
  if (av) { renderAoVivo(); return; }
  avTela(`<div class="av-menu">
    <h3>⚡ Tabuada ao vivo</h3><p>Todos respondem a mesma conta ao mesmo tempo. Quem acerta mais rápido ganha mais pontos!</p>
    <div class="av-linha"><button class="jr-btn jr-btn-ouro" data-av="criar">➕ Criar sala</button></div>
    <div class="av-linha"><input id="av-codigo" maxlength="4" placeholder="CÓDIGO" autocomplete="off" autocapitalize="characters"/><button class="jr-btn" data-av="entrar">Entrar</button></div>
    <p class="av-erro" id="av-erro"></p></div>`);
}
function telaConfigAoVivo() {
  avTela(`<div class="av-menu"><h3>Nova sala</h3>
    <div class="av-linha av-chips" id="av-tipo"><button class="sel" data-tipo="normal">✖️ Tabuada</button><button data-tipo="negativa">➖ Negativa</button></div>
    <div class="av-linha av-chips av-nums" id="av-nums">${[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button class="sel" data-n="${n}">${n}</button>`).join('')}</div>
    <div class="av-linha av-chips" id="av-rod"><button class="sel" data-r="10">10 rodadas</button><button data-r="20">20 rodadas</button></div>
    <div class="av-linha"><button class="jr-btn jr-btn-sec" data-av="menu">Voltar</button><button class="jr-btn jr-btn-ouro" data-av="criar-ok">Criar</button></div>
    <p class="av-erro" id="av-erro"></p></div>`);
}
const erroAV = (t) => { const e = $('av-erro'); if (e) e.textContent = t; };
async function criarAoVivo() {
  const tipo = $('av-tipo').querySelector('.sel')?.dataset.tipo || 'normal';
  const numeros = [...$('av-nums').querySelectorAll('.sel')].map(b => Number(b.dataset.n));
  const rodadas = Number($('av-rod').querySelector('.sel')?.dataset.r) || 10;
  if (!numeros.length) { erroAV('Escolha pelo menos um número.'); return; }
  try {
    const codigo = await criarSala(baseAV(), { host: sessao.uid, host_nome: nomeRanking(), turma: sessao.turma || '', cfg: { tipo, numeros, rodadas } });
    await entrarAoVivo(codigo, true);
  } catch (e) { console.warn('[jogo-revisao] tabuada ao vivo', e?.code || e); erroAV('Não deu para criar a sala agora.'); }
}
async function entrarAoVivo(codigo, souHost = false) {
  codigo = String(codigo || '').trim().toUpperCase();
  if (!codigoValido(codigo)) { erroAV('O código tem 4 letras/números.'); return; }
  let r;
  try { r = await entrarNaSala(baseAV(), codigo, { uid: sessao.uid, nome: nomeRanking(), turma: sessao.turma || '', pers: meuPersonagem() }); }
  catch (e) { console.warn('[jogo-revisao] entrar na sala', e?.code || e); erroAV('Não deu para entrar agora.'); return; }
  if (r.erro) { erroAV(r.erro); return; }
  av = { codigo, host: souHost ? new Anfitriao(baseAV(), codigo, { auto: true }) : null, sala: r.sala, vista: -1, respondi: -1, registradas: new Set(), premio: false };
  av.parar = ouvirSala(baseAV(), codigo, (s) => { if (av?.codigo === codigo) { av.sala = s; renderAoVivo(); } });
  $('aovivo').hidden = false;
}
async function sairAoVivo() {
  const a = av;
  av = null;
  $('aovivo').hidden = true;
  if (!a) return;
  a.parar?.();
  cancelAnimationFrame(a.raf);
  await sairDaSala(baseAV(), a.codigo, sessao.uid);
  if (a.host) { if (a.sala && a.sala.estado !== 'fim') await a.host.encerrar(); a.host.desligar(); }   // o anfitrião saiu: a sala termina
}

function renderAoVivo() {
  const s = av.sala, eu = sessao.uid;
  if (!s) { avTela('<div class="av-menu"><h3>A sala foi fechada.</h3><div class="av-linha"><button class="jr-btn" data-av="sair">OK</button></div></div>'); return; }
  const pl = placar(s.jogadores, true), total = Number(s.cfg?.rodadas) || 10;
  if (s.estado === 'espera') {
    const host = av.host;
    avTela(`<div class="av-espera"><small>Código da sala</small><div class="av-codigo">${esc(av.codigo)}</div>
      <p>${pl.length} jogador${pl.length === 1 ? '' : 'es'} · ${s.cfg?.tipo === 'negativa' ? 'Tabuada negativa' : 'Tabuada'} · ${total} rodadas</p>
      <div class="av-nomes">${pl.map(j => `<span>${nomeT(j.uid, nomeCurto(j.uid, j.nome))}</span>`).join('')}</div>
      <div class="av-linha"><button class="jr-btn jr-btn-sec" data-av="sair">Sair</button>
      ${host ? `<button class="jr-btn jr-btn-ouro" data-av="comecar" ${host.podeComecar() ? '' : 'disabled'}>▶ Começar</button>` : `<span class="av-msg">${s.host === 'professora' ? 'A professora vai começar…' : 'Esperando o anfitrião começar…'}</span>`}</div></div>`);
    return;
  }
  const r = s.rodada;
  if (s.estado === 'rodada' && r) {
    if (av.vista !== r.i) {
      av.vista = r.i;
      avTela(`<div class="av-rodada"><div class="av-topo"><span>Rodada ${r.i + 1} / ${total}</span><div class="av-tempo"><i id="av-tempo"></i></div><span>${esc(String((s.jogadores?.[eu]?.pontos) || 0))} pts</span></div>
        <div class="av-conta">${esc(r.conta)}</div><div class="av-ops">${(r.opcoes || []).map((o, k) => `<button class="av-op c${k}" data-op="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`);
      animarTempoAV();
    }
    return;
  }
  if (s.estado === 'intervalo' && r) {
    registrarRespostaAV(s, r);
    const me = s.jogadores?.[eu] || {}, f = r.fim || {};
    avTela(`<div class="av-intervalo"><div class="av-certa">Resposta: <b>${esc(r.resposta)}</b> · ${f.certos || 0} de ${f.total || 0} acertaram</div>
      <div class="av-eu ${me.acertou ? 'ok' : 'erro'}">${me.acertou ? `✅ +${me.ganho} pontos${Number(me.seq) >= 3 && Number(me.seq) % 3 === 0 ? ' (sequência de 3! +100)' : ''}` : '❌ Não foi dessa vez'}</div>
      ${top5Html(pl)}${av.host ? '' : `<p class="av-msg">${s.host === 'professora' ? 'Esperando a próxima rodada…' : 'Próxima rodada já já…'}</p>`}</div>`);
    return;
  }
  if (s.estado === 'fim') {
    const todos = placar(s.jogadores), meu = todos.find(j => j.uid === eu);
    aplicarPremioAV(s, meu);
    avTela(`<div class="av-fim"><h3>🏁 Fim da Tabuada ao vivo!</h3><div class="av-podio">${[1, 0, 2].map(k => todos[k] ? `<div class="p${k + 1}">${persValido(todos[k].pers) ? bustoHtml(urlQuadro('frente', -1, todos[k].pers), 'av-busto', BUSTO_PERS) : '<span class="av-busto ml-sem">🙂</span>'}
        <b>${['🥇', '🥈', '🥉'][k]} ${nomeT(todos[k].uid, nomeCurto(todos[k].uid, todos[k].nome))}</b><small>${todos[k].pontos} pts</small><i></i></div>` : '').join('')}</div>
      <p class="av-eu">${meu ? `Você ficou em ${meu.pos}º de ${todos.length} · ${meu.pontos} pts${premioDoPodio(meu.pos) ? ` · +${premioDoPodio(meu.pos)} 🪙` : ''}` : ''}</p>
      <div class="av-linha"><button class="jr-btn jr-btn-ouro" data-av="sair">OK</button></div></div>`);
  }
}
function top5Html(pl) {
  return `<ol class="av-top5">${pl.slice(0, 5).map(j => {
    const d = j.pos_ant ? j.pos_ant - j.pos : 0;
    return `<li class="${j.uid === sessao.uid ? 'eu' : ''}"><span>${j.pos}º</span><b>${nomeT(j.uid, nomeCurto(j.uid, j.nome))}</b><em>${j.pontos}</em><i>${d > 0 ? `▲${d}` : d < 0 ? `▼${-d}` : ''}</i></li>`;
  }).join('')}</ol>`;
}
function animarTempoAV() {
  const a = av;
  if (!a) return;
  cancelAnimationFrame(a.raf);
  const passo = () => {
    if (av !== a || a.sala?.estado !== 'rodada') return;
    const r = a.sala.rodada, el = $('av-tempo');
    if (el && typeof r?.inicio === 'number') el.style.width = Math.max(0, Math.min(1, 1 - (agoraServ() - r.inicio) / TEMPO_RODADA_MS)) * 100 + '%';
    a.raf = requestAnimationFrame(passo);
  };
  passo();
}
function responderAoVivo(op, btn) {
  const a = av, r = a?.sala?.rodada;
  if (!r || a.sala.estado !== 'rodada' || a.respondi === r.i) return;
  a.respondi = r.i;
  for (const b of $('av-tela').querySelectorAll('.av-op')) { b.disabled = true; b.classList.toggle('minha', b === btn); }
  responderNaSala(baseAV(), a.codigo, r.i, sessao.uid, op).catch(() => { a.respondi = -1; });
  tocar('clique');
}
// Cada resposta nas respostas do jogo (relatório da professora): uma vez por rodada
function registrarRespostaAV(s, r) {
  if (av.registradas.has(r.i) || !carregouProgresso) return;
  av.registradas.add(r.i);
  const m = s.resp?.[r.i]?.[sessao.uid];
  gravar({ [`respostas/aovivo-${av.codigo}-${r.i}`]: { tipo: 'tabuada_ao_vivo', conta: r.conta, certa: r.resposta, resposta: m?.op ?? null,
    acertou: m ? m.op === r.resposta && pontosDaResposta(m.t, r.inicio) > 0 : null,
    tempo_s: m && typeof r.inicio === 'number' ? +((Number(m.t) - r.inicio) / 1000).toFixed(1) : null, sala: av.codigo, data: Date.now() } });
}
// Pódio: +5/+3/+2 moedas (fora do limite do fliperama), uma vez por sala
function aplicarPremioAV(s, meu) {
  if (av.premio || !meu || !carregouProgresso) return;
  av.premio = true;
  const n = premioDoPodio(meu.pos);
  if (!n || estado.aovivoPremios?.[av.codigo]) return;
  estado.aovivoPremios = { ...(estado.aovivoPremios || {}), [av.codigo]: meu.pos };
  estado.pets.moedas = (Number(estado.pets.moedas) || 0) + n;
  const patch = { 'pets/moedas': estado.pets.moedas, [`aovivo_premios/${av.codigo}`]: meu.pos };
  registrarGanho('aovivo', n, patch);
  gravar(patch);
  tocar('vitoria');
}
function cliqueAoVivo(e) {
  e.stopPropagation();
  const op = e.target.closest('.av-op');
  if (op && !op.disabled) { responderAoVivo(op.dataset.op, op); return; }
  const chip = e.target.closest('.av-chips button');
  if (chip) {
    const grupo = chip.parentElement;
    if (grupo.id === 'av-nums') chip.classList.toggle('sel');
    else for (const b of grupo.children) b.classList.toggle('sel', b === chip);
    return;
  }
  const b = e.target.closest('[data-av]');
  if (!b) return;
  const acao = b.dataset.av;
  if (acao === 'criar') telaConfigAoVivo();
  else if (acao === 'menu') abrirAoVivo();
  else if (acao === 'criar-ok') criarAoVivo();
  else if (acao === 'entrar') entrarAoVivo($('av-codigo')?.value);
  else if (acao === 'comecar') av?.host?.comecar();
  else if (acao === 'sair') sairAoVivo();
  else if (acao === 'fechar') $('aovivo').hidden = true;
}
// Convite da professora para a turma ("A professora abriu uma Tabuada ao vivo!"): uma vez por sala
function ouvirConvitesAoVivo() {
  if (pararConviteAV || !TURMAS_PLACAR.includes(sessao.turma) && !teste) return;
  try {
    pararConviteAV = ouvirConviteTurma(baseAV(), sessao.turma || 'TESTE', async (cv) => {
      if (!cv?.codigo || av || agoraServ() - (Number(cv.ts) || 0) > 3600e3 || estado.avisos[`aovivo_${cv.codigo}`]) return;
      try { const s = await get(ref(db, `${baseAV()}/salas/${cv.codigo}/estado`)); if (!s.exists() || s.val() === 'fim') return; } catch (_) { return; }
      $('av-convite').dataset.codigo = cv.codigo;
      $('av-convite').hidden = false;
      tocar('vitoria');
    });
  } catch (_) { pararConviteAV = null; }
}
function responderConviteAV(entrar) {
  const codigo = $('av-convite').dataset.codigo;
  $('av-convite').hidden = true;
  if (!codigo) return;
  estado.avisos[`aovivo_${codigo}`] = true;
  if (!entrar) return;
  abrirAoVivo();
  entrarAoVivo(codigo);
}

// ============================================================
//  LOJA DA DONA CIDA — interior (dados/jogo/loja-interior.json) com duas portas: na Praça e no Mercado Central.
//  Dona Cida fica lá dentro (pessoa do interior: balão, pedidos e desafio); cada canto abre a loja na sua aba;
//  no provador o pet sobe no pedestal e veste a tinta da prévia. Ao sair, volta para o mapa de onde veio.
// ============================================================
let LOJA = null;              // loja-interior.json
let editarLoja = false;       // ?editarLoja=1 no modo teste: arrastar Dona Cida, cantos, pedestal, portas
let petNoPedestal = null;     // [x, y] enquanto o pet está no provador (não segue o personagem)
const ehLoja = () => cena?.n === 'loja';
const portaMercado = () => LOJA?.mercado || null;   // { mapa: 7, x, y } — porta da loja no Mercado Central

// origem: { tipo: 'praca' } | { tipo: 'mapa', n }
async function abrirLojaInterior(origem = { tipo: 'praca' }) {
  if (!LOJA) return;
  sairPesca(false);
  cena = null;
  esconderBalao();
  fecharCartaoColega();
  $('btn-revanche').hidden = true;
  $('cena-aviso').hidden = true;
  $('cena-atores').innerHTML = '';
  $('cena-titulo').textContent = '🛒 Loja da Dona Cida';
  $('btn-cena-voltar').textContent = '⬅ Sair';
  $('btn-cena-voltar').hidden = false;
  $('tela-cena').classList.remove('jr-no-ginasio');
  mostrarTela('tela-cena');
  $('cena-palco').style.visibility = 'hidden';
  limparPessoas();
  sairDoMapaOnline();
  enviarOnline({ mapa: origem.tipo === 'praca' ? 'praca' : origem.n, local: 'loja' });   // aqui dentro os colegas não veem você
  await trocarFundo(`${IMG}/interiores/${LOJA.imagem || 'loja.webp'}`);
  const grade = gradeDeRetangulos(LOJA.area_livre);
  const naTrilha = (x, y) => centroCelula(celulaMaisProxima(grade, x, y));
  const [px, py] = LOJA.porta;
  cena = { tipo: 'mapa', n: 'loja', salao: true, alturaPersonagem: LOJA.altura_personagem, origem, cfg: { entrada: LOJA.entrada, saidas: [LOJA.porta] }, grade, portas: {}, naTrilha,
    saidas: [{ x: px, y: py, trilha: naTrilha(px, py) }] };
  destinoEspecial = null;
  alvoMapa = null;
  pertoSaidaGin = false;
  montarPessoas('loja');
  montarLoja();
  posicionarJogador(LOJA.entrada[0], LOJA.entrada[1], 'costas');
  soltouDesdeTroca = false;
  ajustarCamera();
  $('cena-palco').style.visibility = '';
  $('btn-colegas').hidden = $('btn-reacao').hidden = true;
  atualizarBotaoPet();
  if (editarLoja) ligarEdicaoLoja();
}
// Porta da loja num mapa da cidade (Mercado Central): rótulo 🛒 e ponto da trilha em frente
function montarPortaLoja(n) {
  const pm = portaMercado();
  cena.portaLoja = null;
  if (!pm || pm.mapa !== n) return;
  cena.portaLoja = { x: pm.x, y: pm.y, trilha: centroCelula(celulaMaisProxima(cena.grade, pm.x, pm.y + 10)) };
  $('cena-atores').insertAdjacentHTML('beforeend', `<div class="jr-rotulo-porta jr-rotulo-praca" style="left:${pm.x}px;top:${pm.y - 110}px"><span>🛒 Loja da Dona Cida</span></div>`);
  if (editarLoja) ligarEdicaoPortaMercado();
}
function sairDaLoja() {
  const o = cena?.origem || { tipo: 'praca' };
  transicao(() => (o.tipo === 'mapa' ? abrirMapa(o.n, 'loja') : abrirPraca('loja')));
}

// Etiquetas dos cantos (aparecem quando o personagem passa perto)
function montarLoja() {
  cena.cantos = (LOJA.cantos || []).map(c => ({ ...c, trilha: cena.naTrilha(...c.ponto) }));
  $('cena-atores').insertAdjacentHTML('beforeend', cena.cantos.map(c =>
    `<div class="jr-rotulo-porta jr-rotulo-praca jr-loja-canto" data-canto="${esc(c.id)}" style="left:${c.ponto[0]}px;top:${c.ponto[1] - 150}px" hidden><span>${esc(c.nome)}</span></div>`).join(''));
}
function atualizarLoja() {
  for (const el of $('cena-atores').querySelectorAll('.jr-loja-canto')) {
    const c = cena.cantos.find(x => x.id === el.dataset.canto);
    const perto = !!c && dist(jog.x, jog.y, c.ponto[0], c.ponto[1]) < 110;
    if (el.hidden === perto) el.hidden = !perto;
  }
}
// Tocou num canto (na prateleira acima do ponto ou perto dele): o mais próximo na horizontal
function cantoEm(p) {
  let melhor = null, md = Infinity;
  for (const c of cena.cantos || []) {
    const dx = Math.abs(p.x - c.ponto[0]);
    if (dx > 110 || p.y < c.ponto[1] - 330 || p.y > c.ponto[1] + 40) continue;
    if (dx < md) { md = dx; melhor = c; }
  }
  return melhor;
}
function irAoCanto(c) {
  destinoEspecial = null;
  caminharNaTrilha(c.trilha[0], c.trilha[1], () => {
    if (!ehLoja()) return;
    jog.dir = 'costas';
    desenharJogador();
    abrirLoja(c.aba, c.id === 'pedestal');
  });
}

// Provador: o pet sobe no pedestal e veste a tinta escolhida na prévia
function subirNoPedestal() {
  const c = (LOJA.cantos || []).find(x => x.id === 'pedestal');
  if (!c?.pet || !seguidor?.pet) return;
  petNoPedestal = c.pet;
  seguidor.colocar(c.pet[0], c.pet[1]);
  seguidor.reagir('feliz', 1200);
}
function descerDoPedestal() {
  if (!petNoPedestal) return;
  petNoPedestal = null;
  atualizarVisualPet();   // volta a tinta de verdade
  if (seguidor?.pet) seguidor.colocar(jog.x - 30, jog.y + 4);
}

// ── Modo de ajuste da loja (?editarLoja=1, só no modo teste) ──
function ligarEdicaoLoja() {
  const par = (a) => a && { pos: () => a, por: (x, y) => { a[0] = x; a[1] = y; } };
  const itens = [['porta', par(LOJA.porta), '🚪'], ['entrada', par(LOJA.entrada), '👣'], ['Dona Cida', par(LOJA.vendedora?.pos), '👩'],
    ['Dona Cida: onde para', par(LOJA.vendedora?.ponto), '👣'], ...(LOJA.cantos || []).flatMap(c => [[c.nome, par(c.ponto), '🏷️'], ...(c.pet ? [['pet no pedestal', par(c.pet), '🐾']] : [])])]
    .filter(([, o]) => o);
  ligarArrastoGenerico(itens, 'Arraste a Dona Cida, os cantos, o pedestal e a porta', () => JSON.stringify(LOJA, null, 1), 'loja-interior.json', () => {
    const o = pessoasMapa.find(x => x.p.id === cfgLoja().vendedor);
    if (o) { o.p.x = LOJA.vendedora.pos[0]; o.p.y = LOJA.vendedora.pos[1]; posicionarPessoa(o); }
  });
}
// No Mercado Central (?editarLoja=1): arrastar a porta da loja
function ligarEdicaoPortaMercado() {
  const pm = portaMercado();
  if (!pm) return;
  const o = { pos: () => [pm.x, pm.y], por: (x, y) => { pm.x = x; pm.y = y; } };
  ligarArrastoGenerico([['porta da loja', o, '🛒']], 'Arraste a porta da loja', () => JSON.stringify({ mercado: pm }, null, 1), 'loja-interior.json (campo mercado)');
}
function ligarArrastoGenerico(itens, dica, json, arquivo, aoMover = () => {}) {
  for (const [nome, o, ic] of itens) {
    const el = document.createElement('div');
    el.className = 'jr-praca-edit';
    el.textContent = `${ic} ${nome}`;
    Object.assign(el.style, { left: o.pos()[0] + 'px', top: o.pos()[1] + 'px' });
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      const mover = (ev) => {
        const q = telaParaImagem(ev.clientX, ev.clientY);
        const x = Math.round(clamp(q.x, 0, W)), y = Math.round(clamp(q.y, 0, H));
        o.por(x, y);
        Object.assign(el.style, { left: x + 'px', top: y + 'px' });
        $('npc-editar-pos').textContent = `${nome}: x ${x}, y ${y}`;
        aoMover();
      };
      const soltar = () => { el.removeEventListener('pointermove', mover); el.removeEventListener('pointerup', soltar); el.removeEventListener('pointercancel', soltar); };
      el.addEventListener('pointermove', mover);
      el.addEventListener('pointerup', soltar);
      el.addEventListener('pointercancel', soltar);
    });
    $('cena-atores').appendChild(el);
  }
  $('npc-editar')?.remove();
  const caixa = document.createElement('div');
  caixa.id = 'npc-editar';
  caixa.className = 'jr-npc-editar';
  caixa.innerHTML = `<span id="npc-editar-pos">${esc(dica)}</span><button class="jr-btn" id="npc-copiar">📋 Copiar posições</button>`;
  $('tela-cena').appendChild(caixa);
  $('npc-copiar').addEventListener('click', async () => {
    const txt = json();
    try { await navigator.clipboard.writeText(txt); $('npc-editar-pos').textContent = `Copiado! Cole no ${arquivo}.`; }
    catch (_) { console.log(txt); $('npc-editar-pos').textContent = 'Não deu para copiar: o JSON está no console (F12).'; }
  });
}

// ============================================================
//  CAVAR E MEXER NO MATO (dados/jogo/cavar.json e mato.json) — só nos mapas da cidade (1 a 13)
//  Por aluno e por dia: 3 montinhos visíveis + 1 tesouro escondido por mapa (sorteio com semente data|mapa|aluno);
//  o pet fareja o tesouro; os matinhos dão frutas/verduras e rebrotam em 6 h. Tudo grava no nó do aluno.
// ============================================================
let CAVAR = null, CAVAR_SP = null, MATO_SP = null, MATOS = [], MATO_NOTA = '', MATOS_POR_DIA = 5;   // mato.json: todos os lugares; por dia, por aluno, sorteia por_dia em cada mapa
let editarMato = false;   // ?editarMato=1 no modo teste: arrastar os matinhos e copiar o mato.json
let acaoMapa = null;      // { tipo: 'cavar' | 'mato', alvo } — o que o botão de ação faz agora
let acaoOcupada = false;
const cfgCavar = () => CAVAR?.config || {};
const QUADROS_MATO = 10, FPS_MATO = 12, LARG_MATO = 62;   // mato: 240 × 150 no arquivo → ~62 px de largura no mapa

function hashTexto(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rngSemente(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const qtdDe = (q, rnd = Math.random) => (Array.isArray(q) ? q[0] + Math.floor(rnd() * (q[1] - q[0] + 1)) : Number(q) || 1);
// sorteio por peso, com "vazio" (e "bicho", no mato) como pesos extras
function sortearAchado(tabela, rnd = Math.random) {
  const ops = [...(tabela?.premios || []).map(p => ({ ...p, peso: Number(p.peso) || 0 })), { tipo: 'vazio', peso: Number(tabela?.vazio) || 0 }, { tipo: 'bicho', peso: Number(tabela?.bicho) || 0 }];
  const tot = ops.reduce((a, o) => a + o.peso, 0);
  let x = rnd() * tot;
  for (const o of ops) { x -= o.peso; if (x < 0) return o; }
  return { tipo: 'vazio' };
}
const ehMapaCidade = () => cena?.tipo === 'mapa' && typeof cena.n === 'number';
function cavadosHoje() {
  const hoje = diaLocal();
  if (estado.cavarDia?.data !== hoje) estado.cavarDia = { data: hoje, m: {}, moedas: 0 };
  estado.cavarDia.m ||= {};
  return estado.cavarDia;
}

// Lugares do dia no mapa n (sempre os mesmos para o aluno naquele dia): sobre a trilha, longe de portas, pessoas, pesca e mato
function lugaresDoDia(n) {
  const cfg = cfgCavar(), g = cena.grade, rnd = rngSemente(hashTexto(`${diaLocal()}|${n}|${sessao.uid}`));
  const nm = cfg.montinhos_por_mapa_dia ?? 3, nt = cfg.tesouros_por_mapa_dia ?? 1;
  const evitar = [...Object.values(cena.portas).map(p => [p.x, p.y]), ...cena.saidas.map(s => [s.x, s.y]), [cena.cfg.entrada[0], cena.cfg.entrada[1]],
    ...NPCS.filter(p => p.mapa === n && !p.interior).map(p => [p.x, p.y]), ...pontosDoMapa(n).map(p => [p.x, p.y])];
  const matosHoje = (cena.matos || []).map(m => [m.x, m.y]);   // só os matinhos que aparecem hoje
  const livre = (cx, cy) => andavel(g, cx, cy) && andavel(g, cx + 3, cy) && andavel(g, cx - 3, cy) && andavel(g, cx, cy + 3) && andavel(g, cx, cy - 3);
  const lugares = [];
  // 1ª passada com folgas grandes; mapa com pouca área andável (ex.: Canteiro de Obras): 2ª passada com folgas menores
  for (const [longe, entre] of [[110, 150], [70, 90]]) {
    for (let tent = 0; tent < 6000 && lugares.length < nm + nt; tent++) {
      const cx = Math.floor(rnd() * GW), cy = Math.floor(rnd() * GH);
      if (!livre(cx, cy)) continue;
      const [x, y] = centroCelula(cy * GW + cx);
      if (x < 60 || x > W - 60 || y < 80 || y > H - 40) continue;
      if (evitar.some(([a, b]) => dist(x, y, a, b) < longe) || matosHoje.some(([a, b]) => dist(x, y, a, b) < 70) || lugares.some(l => dist(x, y, l.x, l.y) < entre)) continue;
      const i = lugares.length;
      lugares.push({ x, y, chave: i < nm ? `${n}-${i}` : `${n}-t${i - nm}`, tesouro: i >= nm });
    }
  }
  return lugares;
}

function montarCavar(n) {
  cena.cavar = [];
  cena.matos = [];
  if (!CAVAR || typeof n !== 'number') return;
  const cav = cavadosHoje().m, I = cfgCavar().imagens || {};
  const agora = Date.now(), rebrota = (cfgCavar().mato_rebrota_h ?? 6) * 3600e3;
  // matos: dos lugares do mapa, por dia e por aluno aparecem só por_dia (sorteio com semente data|mapa|aluno; no ajuste, todos)
  let doMapa = MATOS.map((m, i) => ({ ...m, i })).filter(m => m.mapa === n);
  if (!editarMato && doMapa.length > MATOS_POR_DIA) {
    const rnd = rngSemente(hashTexto(`${diaLocal()}|${n}|${sessao.uid}|mato`));
    for (let k = doMapa.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [doMapa[k], doMapa[j]] = [doMapa[j], doMapa[k]]; }
    doMapa = doMapa.slice(0, MATOS_POR_DIA);
  }
  cena.matos = doMapa.map(m => ({ ...m, chave: `${n}-${m.i}`, mexido: agora - (Number(estado.matoMexido?.[`${n}-${m.i}`]) || 0) < rebrota }));
  cena.cavar = lugaresDoDia(n);   // montinhos e tesouro: longe dos matos que aparecem hoje
  for (const [tem, nome] of [[temPoseCavar, 'cavar'], [temPoseMato, 'mato']])   // pré-carrega as poses do meu personagem
    if (tem(meuPersonagem())) for (const q of [2, 3, 4, 5, 6]) { const im = new Image(); im.src = `${PERS.pasta}/${meuPersonagem()}/${nome}-${q}.webp`; }
  let html = '';
  for (const l of cena.cavar) {
    if (l.tesouro) continue;   // o tesouro não tem desenho nenhum
    html += `<div class="jr-montinho${cav[l.chave] ? ' cavado' : ''}" data-chave="${l.chave}" style="left:${l.x}px;top:${l.y}px;z-index:${Math.round(l.y) - 3}">
      <img class="m-img" src="${esc(caminhoImg(I.montinho || ''))}" alt="" draggable="false" onload="this.parentNode.classList.add('com-img')" onerror="this.remove()"/>
      <img class="b-img" src="${esc(caminhoImg(I.buraco || ''))}" alt="" draggable="false" onload="this.parentNode.classList.add('com-buraco')" onerror="this.remove()"/></div>`;
  }
  for (const m of cena.matos)
    html += `<img class="jr-mato" data-chave="${m.chave}" src="${IMG}/mato/${m.mexido ? 'mato-mexido' : `mato-${m.variante || 1}`}.webp" alt="" draggable="false"
      style="left:${m.x}px;top:${m.y}px;width:${LARG_MATO}px;z-index:${Math.round(m.y)}"/>`;
  $('cena-atores').insertAdjacentHTML('beforeend', html);
  for (const m of cena.matos) m.el = $('cena-atores').querySelector(`.jr-mato[data-chave="${m.chave}"]`);
  if (editarMato) ligarEdicaoMato(n);
}

// Mato balança (10 quadros, ~12 fps, uma vez)
function balancarMato(m) {
  if (!m.el || m.balancando || m.mexido) return;   // mato já mexido/arrancado não balança
  m.balancando = true;
  let q = 1;
  const base = () => `${IMG}/mato/${m.mexido ? 'mato-mexido' : `mato-${m.variante || 1}`}.webp`;
  const passo = () => {
    if (!m.el.isConnected) return;
    if (q > QUADROS_MATO || semMovimento() || m.mexido) { m.el.src = base(); m.balancando = false; return; }
    m.el.src = `${IMG}/mato/mato-balanca-${q++}.webp`;
    setTimeout(passo, 1000 / FPS_MATO);
  };
  passo();
}

const raioFaro = () => {   // cresce com a lealdade do pet ativo (60 px com 0, 110 com 50, 170 com 100)
  const f = cfgCavar().faro_pet || {}, l = Math.max(0, Math.min(100, lealdadeDoAtivo()));
  const a = f.lealdade_0 ?? 60, b = f.lealdade_50 ?? 110, c = f.lealdade_100 ?? 170;
  return l <= 50 ? a + (b - a) * l / 50 : b + (c - b) * (l - 50) / 50;
};

// A cada quadro nos mapas: mato que balança quando alguém passa, faro do pet e o botão de ação
function atualizarCavar() {
  if (!ehMapaCidade() || !CAVAR) { esconderAcaoMapa(); return; }
  const cav = cavadosHoje().m;
  for (const m of cena.matos || []) {
    const em = dist(jog.x, jog.y, m.x, m.y) < 22 || (seguidor?.pet && dist(seguidor.x, seguidor.y, m.x, m.y) < 22);
    if (em && !m.dentro) balancarMato(m);
    m.dentro = em;
  }
  // faro: 👃 sobre o pet, piscando mais rápido quanto mais perto
  const tes = (cena.cavar || []).find(l => l.tesouro && !cav[l.chave]);
  const faro = $('pet-faro'), r = raioFaro();
  const d = tes ? dist(jog.x, jog.y, tes.x, tes.y) : Infinity;
  const farejando = !!(tes && seguidor?.pet && !$('pet').hidden && d < r && !pesca);
  faro.hidden = !farejando;
  if (farejando) {
    posicionarNaTela(faro, seguidor.x, seguidor.y - seguidor.altura - 4);
    faro.style.animationDuration = (0.25 + 1.1 * d / r).toFixed(2) + 's';
    seguidor.esquerda = tes.x < seguidor.x;
    if (!cena.farejou && performance.now() - (cena.faroT || 0) > 20000) {   // ao entrar no raio: uma frase do grupo "faro"
      cena.farejou = true; cena.faroT = performance.now();
      const fr = frasesFaro(seguidor.pet);
      if (fr.length && !conversa.falando) mostrarFalaPet([{ texto: trocarApelido(sortear(fr)) }]);
    }
  } else if (d > r + 30) cena.farejou = false;
  // botão de ação: ⛏️ Cavar (montinho perto / em cima do tesouro) ou 🌿 Mexer no mato
  let melhor = null;
  if (!pesca && !acaoOcupada) {
    for (const l of cena.cavar || []) {
      if (cav[l.chave]) continue;
      const dl = dist(jog.x, jog.y, l.x, l.y);
      if (dl < (l.tesouro ? cfgCavar().raio_cavar ?? 18 : 36) && (!melhor || dl < melhor.d)) melhor = { tipo: 'cavar', alvo: l, d: dl };
    }
    for (const m of cena.matos || []) {
      if (m.mexido) continue;
      const dm = dist(jog.x, jog.y, m.x, m.y);
      if (dm < 44 && (!melhor || dm < melhor.d)) melhor = { tipo: 'mato', alvo: m, d: dm };
    }
  }
  if (melhor?.tipo !== acaoMapa?.tipo || melhor?.alvo !== acaoMapa?.alvo) {
    acaoMapa = melhor;
    const b = $('btn-acao-mapa'), I = cfgCavar().imagens || {};
    b.hidden = !melhor;
    if (melhor) b.innerHTML = melhor.tipo === 'cavar' ? `${imgItem(I.pa, '⛏️', 'jr-ic-btn')} Cavar` : `${imgItem(I.mato_cortado, '🌿', 'jr-ic-btn')} Mexer no mato`;
  }
}
function esconderAcaoMapa() { acaoMapa = null; $('btn-acao-mapa').hidden = true; $('pet-faro').hidden = true; }
const trocarApelido = (t) => String(t).replace(/\{apelido\}/g, nomeAluno()).replace(/\{pet\}/g, nomePet(estado.pets.ativo));

function usarAcaoMapa() {
  const a = acaoMapa;
  if (!a || acaoOcupada || !ehMapaCidade()) return;
  if (a.tipo === 'cavar') cavar(a.alvo); else mexerMato(a.alvo);
}

// ⛏️ Cavar: animação da picareta (cavar-2..6, duas vezes, ~1,1 s) virada para o montinho; depois o resultado
// cavar-sprites.json: tamanho do quadro e âncora (pés) de cada personagem — mesma escala das imagens de andar
const SEQ_CAVAR = [2, 3, 4, 5, 6, 2, 3, 4, 5, 6], MS_CAVAR = 110;   // o quadro 1 fica só de reserva (a picareta "pula" no 6 → 1)
const temPoseCavar = (pers) => !!(CAVAR_SP?.tamanho && CAVAR_SP.personagens?.[pers]);
const poseCavar = (img, pers, x, y, q, esq, s) => poseAcao(CAVAR_SP, 'cavar', img, pers, x, y, q, esq, s);
function poseAcao(sp, nome, img, pers, x, y, q, esq, s) {
  const [w, h] = sp.tamanho, [ax, ay] = sp.personagens[pers].ancora;
  const src = `${PERS.pasta}/${pers}/${nome}-${q}.webp`;
  if (img.dataset.src !== src) { img.src = src; img.dataset.src = src; }
  Object.assign(img.style, { width: w * s + 'px', height: h * s + 'px', left: x - (esq ? w - ax : ax) * s + 'px', top: y - ay * s + 'px',
    transform: esq ? 'scaleX(-1)' : '', zIndex: Math.round(y) });
}
function terraVoando(x, y) {
  const terra = document.createElement('div');
  terra.className = 'jr-terra';
  Object.assign(terra.style, { left: x + 'px', top: y + 'px', zIndex: Math.round(y) + 2 });
  terra.innerHTML = '<i></i><i></i><i></i><i></i><i></i>';
  $('cena-atores').appendChild(terra);
  setTimeout(() => terra.remove(), 520);
}
function cavar(l) {
  acaoOcupada = true;
  jog.caminho = []; jog.aoChegar = null;
  esconderAcaoMapa();
  const n = cena.n, pers = meuPersonagem(), esq = l.x < jog.x - 2;
  jog.dir = esq ? 'esquerda' : 'direita';
  const resultado = () => {
    if (cena?.n !== n) return;
    const cav = cavadosHoje();
    cav.m[l.chave] = true;
    const el = $('cena-atores').querySelector(`.jr-montinho[data-chave="${l.chave}"]`);
    if (el) el.classList.add('cavado');
    else if (l.tesouro) {   // o tesouro vira um buraco também
      $('cena-atores').insertAdjacentHTML('beforeend', `<div class="jr-montinho cavado" style="left:${l.x}px;top:${l.y}px;z-index:${Math.round(l.y) - 3}">
        <img class="b-img" src="${esc(caminhoImg(cfgCavar().imagens?.buraco || ''))}" alt="" draggable="false" onload="this.parentNode.classList.add('com-buraco')" onerror="this.remove()"/></div>`);
    }
    const achado = sortearAchado(l.tesouro ? CAVAR.tesouro : CAVAR.montinho);
    entregarAchado(achado, l.tesouro ? 'tesouro' : 'montinho', n, { cavar_dia: cav });
  };
  if (!temPoseCavar(pers)) {   // sem os quadros: a pose provisória (abaixado) e a terra voando
    $('jogador').classList.add('cavando');
    terraVoando(l.x, l.y);
    tocar('clique');
    setTimeout(() => { $('jogador').classList.remove('cavando'); acaoOcupada = false; resultado(); }, 1000);
    return;
  }
  const img = document.createElement('img');
  img.className = 'jr-cavar-pose'; img.alt = ''; img.draggable = false;
  $('cena-atores').appendChild(img);
  $('jogador').style.visibility = 'hidden';
  enviarOnline({ acao: 'cavar', acao_esq: esq });   // os colegas veem a animação
  const reduzido = semMovimento(), seq = reduzido ? [4] : SEQ_CAVAR, ms = reduzido ? 800 : MS_CAVAR, s = escalaSpriteCena();
  let k = 0;
  const acabar = () => {
    img.remove();
    $('jogador').style.visibility = '';
    enviarOnline({ acao: null });
    acaoOcupada = false;
    desenharJogador();
  };
  const passo = () => {
    if (cena?.n !== n || !img.isConnected) { acabar(); return; }
    if (k >= seq.length) { acabar(); resultado(); return; }
    const q = seq[k++];
    poseCavar(img, pers, jog.x, jog.y, q, esq, s);
    if (q === 4 && !reduzido) { terraVoando(l.x, l.y); tocar('clique'); }   // a picareta bate: lascas e um "toc"
    setTimeout(passo, ms);
  };
  passo();
}

// 🌿 Mexer no mato: o personagem para ao lado do mato e arranca (mato-2..6, mato-sprites.json); no quadro 5 o mato
// do mapa vira "mexido" e o prêmio salta do chão. Sem os quadros: a pose provisória (abaixado), como antes.
const TEMPOS_MATO = [[2, 150], [3, 150], [4, 350], [5, 300], [6, 500]];   // [quadro, ms]
const temPoseMato = (pers) => !!(MATO_SP?.tamanho && MATO_SP.personagens?.[pers]);
const LARG_PERS = 230;   // largura do corpo nas imagens de andar (px do arquivo), para parar ao lado do mato
function mexerMato(m) {
  acaoOcupada = true;
  jog.caminho = []; jog.aoChegar = null;
  esconderAcaoMapa();
  const n = cena.n, pers = meuPersonagem();
  const achado = sortearAchado(CAVAR.mato);   // o mesmo sorteio de antes; só sai antes para saber o que salta no quadro 5
  const arrancar = () => {   // o mato do mapa foi arrancado: vira "mexido" e o prêmio (ou o bicho) sai do chão
    m.mexido = true;
    if (m.el) { m.balancando = false; m.el.src = `${IMG}/mato/mato-mexido.webp`; }
    if (achado.tipo === 'bicho') {
      const b = document.createElement('div');
      b.className = 'jr-bicho';
      b.textContent = Math.random() < 0.5 ? '🐸' : '🦋';
      Object.assign(b.style, { left: m.x + 'px', top: m.y + 'px', zIndex: 9000, '--dir': Math.random() < 0.5 ? -1 : 1 });
      $('cena-atores').appendChild(b);
      setTimeout(() => b.remove(), 1600);
    } else if (achado.tipo !== 'vazio') {
      const it = itemDaBolsa(achado.id);
      const p = document.createElement('div');
      p.className = 'jr-premio-sobe';
      p.innerHTML = imgItem(it?.imagem, it?.emoji || '🍃', 'jr-item-premio');
      Object.assign(p.style, { left: m.x + 'px', top: m.y + 'px', zIndex: 9000 });
      $('cena-atores').appendChild(p);
      setTimeout(() => p.remove(), 1100);
    }
  };
  const resultado = () => {
    acaoOcupada = false;
    if (cena?.n !== n) return;
    estado.matoMexido = { ...(estado.matoMexido || {}), [m.chave]: Date.now() };
    entregarAchado(achado.tipo === 'bicho' || achado.tipo === 'vazio' ? achado : { tipo: 'item', id: achado.id, qtd: 1 }, 'mato', n,
      { [`mato_mexido/${m.chave}`]: estado.matoMexido[m.chave] });
  };
  if (!temPoseMato(pers)) {   // pose provisória
    m.balancando = false;
    balancarMato(m);
    tocar('clique');
    $('jogador').classList.add('cavando');
    setTimeout(() => { $('jogador').classList.remove('cavando'); if (cena?.n === n) arrancar(); resultado(); }, 900);
    return;
  }
  // para ao lado do mato (mato à frente, ~0,6 × a largura do personagem), do lado em que já está
  const esq = jog.x > m.x, s = escalaSpriteCena();
  const alvoX = m.x + (esq ? 1 : -1) * 0.6 * LARG_PERS * s;
  let comecou = false;
  const animar = () => {
    if (comecou) return;
    comecou = true;
    if (cena?.n !== n) { acaoOcupada = false; return; }
    jog.dir = esq ? 'esquerda' : 'direita';
    const img = document.createElement('img');
    img.className = 'jr-cavar-pose'; img.alt = ''; img.draggable = false;
    $('cena-atores').appendChild(img);
    $('jogador').style.visibility = 'hidden';
    enviarOnline({ acao: 'mato', acao_esq: esq });   // os colegas veem a animação
    const passos = semMovimento() ? [[5, 800]] : TEMPOS_MATO;
    let k = 0;
    const acabar = () => { img.remove(); $('jogador').style.visibility = ''; enviarOnline({ acao: null }); desenharJogador(); };
    const passo = () => {
      if (cena?.n !== n || !img.isConnected) { acabar(); acaoOcupada = false; return; }
      if (k >= passos.length) { acabar(); resultado(); return; }
      const [q, ms] = passos[k++];
      poseAcao(MATO_SP, 'mato', img, pers, jog.x, jog.y, q, esq, s);
      if (q === 4) { m.balancando = false; balancarMato(m); tocar('clique'); }   // puxa com força: o mato balança
      if (q === 5) arrancar();
      setTimeout(passo, ms);
    };
    passo();
  };
  caminharNaTrilha(alvoX, m.y, animar);
  if (!jog.caminho.length && !jog.aoChegar) animar();   // já estava no lugar
  setTimeout(() => { if (!comecou) { comecou = true; acaoOcupada = false; } }, 4000);   // andou para outro lado no caminho: libera o botão
}

// Aplica o que saiu, mostra o cartão e registra (tipo: "cavar")
function entregarAchado(a, onde, n, patch = {}) {
  missaoProgresso('cavar');   // montinho, tesouro ou mato
  const ps = estado.pets, cfg = cfgCavar(), cav = cavadosHoje();
  let icone = '', titulo = '', sub = '', raro = false, registro = null;
  const moedasLivres = () => Math.max(0, (cfg.moedas_cavar_dia ?? 15) - (Number(cav.moedas) || 0));
  const darMoedas = (q, semLimite = false) => { const g = semLimite ? q : Math.min(q, moedasLivres()); if (!semLimite) cav.moedas = (Number(cav.moedas) || 0) + g; ps.moedas = (Number(ps.moedas) || 0) + g; patch['pets/moedas'] = ps.moedas; registrarGanho(semLimite ? 'colecao' : 'cavar', g, patch); return g; };
  if (a.tipo === 'moedas') {
    const g = darMoedas(qtdDe(a.qtd));
    if (g > 0) { icone = moedaHtml(); titulo = `Você achou ${g} 🪙!`; registro = { tipo: 'moedas', qtd: g }; }
    else { a = { tipo: 'vazio' }; }   // passou do limite do dia: as moedas viram terra
  }
  if (a.tipo === 'item') {
    const q = qtdDe(a.qtd), id = a.id;
    const uso = (cfgLoja().itens_uso || []).find(x => x.id === id), comida = itemDaBolsa(id);
    if (id === 'isca') { ps.iscas = iscas() + q; patch['pets/iscas'] = ps.iscas; }
    else if (uso) { ps.itens = { ...(ps.itens || {}), [id]: (Number(ps.itens?.[id]) || 0) + q }; patch[`pets/itens/${id}`] = ps.itens[id]; }
    else if (comida) { ps.bolsa = { ...(ps.bolsa || {}), [id]: (Number(ps.bolsa?.[id]) || 0) + q }; patch[`pets/bolsa/${id}`] = ps.bolsa[id]; }
    const it = uso || comida || { nome: id, emoji: '🎁' };
    icone = imgItem(it.imagem, it.emoji, 'jr-item-peixe');
    titulo = `Você achou ${q > 1 ? `${q} × ${it.nome}` : comArtigo(it.nome)}! ${it.emoji || ''}`;
    sub = uso ? uso.descricao : comida ? 'Foi para a 🎒 Bolsa' : '';
    registro = { tipo: 'item', id, qtd: q };
  }
  if (a.tipo === 'colecao') {
    const pecas = (CAVAR.colecao || []).filter(c => (c.mapas || []).includes(n));
    const c = pecas.length ? sortear(pecas) : null;
    if (c && !estado.colecao?.[c.id]) {
      estado.colecao = { ...(estado.colecao || {}), [c.id]: Date.now() };
      patch[`colecao/${c.id}`] = estado.colecao[c.id];
      raro = true;
      icone = imgItem(c.imagem, c.emoji, 'jr-item-peixe raro');
      titulo = `✨ Você achou ${comArtigo(c.nome)}!`;
      sub = `Coleção: ${Object.keys(estado.colecao).length}/${CAVAR.colecao.length}`;
      registro = { tipo: 'colecao', id: c.id };
      completarGrupo(c.grupo, patch);
    } else if (c) {
      const g = darMoedas(cfg.repetida_moedas ?? 5, true);
      icone = imgItem(c.imagem, c.emoji, 'jr-item-peixe');
      titulo = `Repetida! Virou ${g} 🪙`;
      sub = `${c.nome} já está na sua coleção`;
      registro = { tipo: 'colecao_repetida', id: c.id, moedas: g };
    } else a = { tipo: 'vazio' };
  }
  if (a.tipo === 'tinta') {
    const t = tinta(a.id);
    if (t && !ps.tintas?.[a.id]) {
      ps.tintas = { ...(ps.tintas || {}), [a.id]: true };
      patch[`pets/tintas/${a.id}`] = true;
      raro = true;
      icone = '🎨';
      titulo = `✨ Tinta ${t.nome}! Só se acha cavando.`;
      sub = 'Vale para todos os seus pets (troque no Meu Pet → Visual)';
      registro = { tipo: 'tinta', id: a.id };
    } else {
      const g = darMoedas(cfg.repetida_moedas ?? 5, true);
      icone = '🎨'; titulo = `Repetida! Virou ${g} 🪙`; sub = t ? `Você já tem a tinta ${t.nome}` : '';
      registro = { tipo: 'tinta_repetida', id: a.id, moedas: g };
    }
  }
  if (a.tipo === 'vazio') { icone = onde === 'mato' ? '🍃' : '🪱'; titulo = onde === 'mato' ? 'Só mato… 🍃' : 'Só terra… 🪱'; }
  if (a.tipo === 'bicho') { icone = '🐸'; titulo = 'Opa! Tinha um bichinho aí 😄'; }
  if (onde !== 'mato') patch.cavar_dia = cav;
  const agora = Date.now();
  patch[`respostas/cavar-${agora}`] = { tipo: 'cavar', onde, mapa: n, achou: registro, data: agora };
  gravar(patch);
  tocar(registro ? (raro ? 'vitoria' : 'acerto') : 'erro');
  mostrarAchado(icone, titulo, sub, raro, onde === 'tesouro');
  if (raro && onde === 'tesouro') seguidor?.reagir('feliz', 1500);
}
function completarGrupo(grupo, patch) {
  const doGrupo = (CAVAR.colecao || []).filter(c => c.grupo === grupo);
  if (estado.colecaoGrupos?.[grupo] || !doGrupo.every(c => estado.colecao?.[c.id])) return;
  const n = cfgCavar().grupo_completo_moedas ?? 20;
  estado.colecaoGrupos = { ...(estado.colecaoGrupos || {}), [grupo]: true };
  estado.pets.moedas = (Number(estado.pets.moedas) || 0) + n;
  patch[`colecao_grupos/${grupo}`] = true;
  patch['pets/moedas'] = estado.pets.moedas;
  registrarGanho('colecao', n, patch);
  setTimeout(() => avisoPet(`📖 Coleção completa: ${grupo}! +${n} 🪙`, true), 2600);
}
function mostrarAchado(icone, titulo, sub, raro, grande) {
  const el = $('pesca-cartao');
  el.innerHTML = `<span class="pc-peixe">${icone}</span><span>${esc(titulo)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>`;
  el.classList.toggle('raro', !!raro);
  el.classList.toggle('grande', !!grande);
  el.hidden = false;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  clearTimeout(mostrarPeixe.t);
  mostrarPeixe.t = setTimeout(() => { el.hidden = true; }, raro ? 3600 : 2600);
}

// ── Álbum da coleção (na bolsa): 4 grupos × 3 peças ──
function albumHtml() {
  const grupos = [...new Set((CAVAR?.colecao || []).map(c => c.grupo))];
  const total = (CAVAR?.colecao || []).length, achadas = Object.keys(estado.colecao || {}).length;
  return `<div class="mp-album-topo">📖 Coleção: <b>${achadas}/${total}</b> · completar um grupo dá ${cfgCavar().grupo_completo_moedas ?? 20} 🪙</div>` + grupos.map(g => {
    const pecas = CAVAR.colecao.filter(c => c.grupo === g), ok = pecas.every(c => estado.colecao?.[c.id]);
    return `<div class="mp-album-grupo${ok ? ' completo' : ''}"><b>${esc(g)}${ok ? ' ✓' : ''}</b><div>${pecas.map(c => estado.colecao?.[c.id]
      ? `<span class="mp-peca">${imgItem(c.imagem, c.emoji, 'jr-item-bolsa')}<em>${esc(c.nome)}</em></span>`
      : `<span class="mp-peca falta">${c.imagem ? imgItem(c.imagem, '?', 'jr-item-bolsa silhueta') : '<i>?</i>'}<em>Dizem que aparece no mapa ${c.mapas[0]}…</em></span>`).join('')}</div></div>`;
  }).join('');
}
function itensHtml() {
  const usos = cfgLoja().itens_uso || [];
  const qtd = (id) => (id === 'isca' ? iscas() : Number(estado.pets.itens?.[id]) || 0);
  return usos.map(u => `<div class="mp-bolsa-item mp-uso"><span class="mp-bolsa-emoji">${imgItem(u.imagem, u.emoji, 'jr-item-bolsa')}</span>
    <b>${esc(u.nome)} × ${qtd(u.id)}</b><span>${esc(u.descricao)}</span></div>`).join('') +
    '<div class="mp-bolsa-vazia">As ajudas aparecem como botão no ginásio e na batalha quando você tem alguma. Ache mais cavando ⛏️.</div>';
}

// ── Modo de ajuste do mato (?editarMato=1, só no modo teste) ──
function ligarEdicaoMato(n) {
  const itens = (cena.matos || []).map(m => {
    const orig = MATOS[m.i];
    return [`mato ${m.i}`, { pos: () => [orig.x, orig.y], por: (x, y) => { orig.x = x; orig.y = y; m.x = x; m.y = y; if (m.el) Object.assign(m.el.style, { left: x + 'px', top: y + 'px', zIndex: Math.round(y) }); } }, '🌿'];
  });
  ligarArrastoGenerico(itens, `Arraste os matinhos do mapa ${n} (todos os lugares aparecem no ajuste)`, () => JSON.stringify({ nota: MATO_NOTA, por_dia: MATOS_POR_DIA, matos: MATOS }, null, 1), 'mato.json');
}

// ============================================================
//  BATALHA DE PETS — contas rápidas contra os treinadores de dados/jogo/batalhas.json
//  (regras puras em js/jogo-revisao/batalha.js; aqui a lista, a luta e os prêmios)
// ============================================================
const ELEM_PET = { elefante: ['💧', '🥜'], gato: ['🐾', '✦'], gaviao: ['🪶', '💨'], unicornio: ['🌈', '✨', '💖'], axolote: ['🫧', '💧'],
  tigre: ['⚡', '🐾'], dragao_vermelho: ['🔥', '💥'], dragao_azul: ['❄️', '💎'], fogo: ['🔥', '💥'] };   // fogo: ataque_fogo dos adultos
const FALAS_VOLTOU_FORTE = ['Treinei muito desde a última vez!', 'Voltei mais forte. Preparado?', 'Andei treinando… agora é sério!'];
let bt = null;            // batalha em andamento
let btSel = null, btTimerLista = 0;   // treinador selecionado na lista

// nome do aluno na batalha: apelido ativo ou o primeiro nome (professor/teste: "Você")
const nomeAluno = () => nomeVisivel(apelidoAluno || String(sessao?.nome || '').split(' ')[0]) || 'Você';
const podeBatalhar = () => petsOk && batalhasProntas() && carregouProgresso && !!estado?.pets?.ativo;
const desafioCom = (id) => desafioDe(estado.batalhas?.[id]);

// Prêmios de batalha de hoje (zera quando muda o dia)
function diaBatalhas() {
  const hoje = diaLocal();
  if (estado.batalhasDia?.data !== hoje) estado.batalhasDia = { data: hoje, moedas: 0, lealdade: 0, xp: 0 };
  return estado.batalhasDia;
}

function atualizarBotaoBatalhar() {
  $('btn-batalhar').hidden = !(podeBatalhar() && cena?.tipo === 'mapa');
}

const faltaTexto = (ms) => {
  const min = Math.max(1, Math.ceil(ms / 60000)), h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
};

// Com fome não batalha: o pet fica triste e aparece o aviso
function petComFomeParaBatalha() {
  const pet = estado.pets.ativo;
  if (barrigaDe(pet) >= (cfgBatalha().barriga_minima ?? 25)) return false;
  if (mp) { mp.anim.tocar('triste_fome'); setTimeout(() => { if (mp && !mp.ocupado) voltarAoNormal(); }, 1800); }
  else seguidor?.reagir('triste_fome', 2000);
  avisoPet(`${nomePet(pet)} está com fome. Dê comida antes de batalhar.`);
  return true;
}

function abrirListaBatalha() {
  if (!podeBatalhar()) return;
  if (mp) fecharMeuPet();
  // abre no primeiro treinador ainda não vencido
  const ts = treinadores();
  btSel = (ts.find(t => !desafioCom(t.id).vitorias) || ts[0])?.id || null;
  $('bt-lista').hidden = false;
  renderListaBatalha();
  clearInterval(btTimerLista);
  btTimerLista = setInterval(() => { if ($('bt-lista').hidden) clearInterval(btTimerLista); else renderListaBatalha(); }, 20000);   // contador do descanso
}

function renderListaBatalha() {
  const dia = diaBatalhas(), lim = cfgBatalha().limites_dia || {};
  $('bt-lista-dia').innerHTML = `prêmios de hoje ${dia.moedas}/${lim.moedas ?? '∞'} ${moedaHtml()}`;
  const agora = Date.now(), ts = treinadores();
  if (!ts.some(t => t.id === btSel)) btSel = ts[0]?.id || null;
  $('bt-cards').innerHTML = ts.map(t => {
    const d = desafioCom(t.id), sit = situacao(d, agora);
    const icone = sit === 'descansando' ? `😴<small>${horasFalta(d.descansa_ate - agora)}</small>` : sit === 'revanche' ? '🔁' : d.vitorias > 0 ? '🏆' : '';
    return `<button class="bt-linha ${sit}${t.id === btSel ? ' sel' : ''}" data-sel="${esc(t.id)}" aria-pressed="${t.id === btSel}">
      ${bustoHtml(`${IMG}/npcs/${esc(t.id)}.webp`, 'bt-rosto', ROSTO_NPC)}
      <span class="bt-linha-nome">${esc(t.nome)}</span>
      <span class="bt-linha-est">${'⭐'.repeat(t.nivel)}</span>
      <span class="bt-linha-ic">${icone}</span>
    </button>`;
  }).join('');
  renderDetalheTreinador();
}

const horasFalta = (ms) => { const h = Math.ceil(ms / 3600e3); return h > 1 ? `${h} h` : `${Math.max(1, Math.ceil(ms / 60000))} min`; };

function renderDetalheTreinador() {
  const t = treinador(btSel), el = $('bt-det');
  if (!t) { el.innerHTML = ''; return; }
  const agora = Date.now(), d = desafioCom(t.id), sit = situacao(d, agora), f = forca(t, d), m = mapaDoTreinador(t.id);
  const tipos = tiposDeConta(), contas = (t.contas || []).map(k => tipos[k]?.nome).filter(Boolean);
  const estado = sit === 'descansando' ? `😴 descansando · volta em ${faltaTexto(d.descansa_ate - agora)}`
    : sit === 'revanche' ? '🔁 revanche: você perdeu da última vez' : d.vitorias > 0 ? '🏆 já venceu · pronto para outro desafio' : '⚔️ pronto para o desafio';
  const botao = sit === 'descansando'
    ? `<button class="jr-btn bt-det-ir" disabled>😴 volta em ${horasFalta(d.descansa_ate - agora)}</button>`
    : `<button class="jr-btn jr-btn-ouro bt-det-ir" data-ir="${esc(t.id)}"${m ? '' : ' disabled'}>📍 Ir até lá</button>`;
  el.innerHTML = `
    <div class="bt-det-topo">
      ${bustoHtml(`${IMG}/npcs/${esc(t.id)}.webp`, 'bt-det-busto', BUSTO_NPC)}
      <div class="bt-det-quem">
        <div class="bt-det-nome">${esc(t.nome)}</div>
        <div class="bt-det-sub">${esc(t.quem)}</div>
        <div class="bt-det-pet"><span class="jr-icone-pet"><img src="${srcIcone(t.pet)}" alt="" draggable="false" data-icone-pet/></span>${esc(NOME_PET[t.pet] || '')} <span>${'⭐'.repeat(t.nivel)}</span></div>
      </div>
    </div>
    <div class="bt-det-linhas">
      <div>Nível ${d.nivel} · acerta ${Math.round(f.acerto * 100)}%</div>
      <div>📍 ${NPCS.find(p => p.id === t.id)?.interior === 'loja' ? 'Loja da Dona Cida (Praça ou Mercado) 🛒' : m ? `${m}. ${esc(D.questoes[m].nome)}` : '—'}</div>
      ${contas.length ? `<div>Contas: ${contas.map(esc).join(', ')}</div>` : ''}
      <div class="bt-det-estado ${sit}">${estado}</div>
    </div>
    ${botao}`;
}

// ── A luta ──────────────────────────────────────────────────
const btLater = (fn, ms) => { const t = setTimeout(fn, ms); bt?.timers.push(t); return t; };
const btEsperar = (ms) => new Promise(ok => btLater(ok, ms));
const btReduz = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function iniciarBatalha(id, origem = 'lista') {
  const t = treinador(id);
  if (!t || !podeBatalhar() || petComFomeParaBatalha()) return;
  const d = desafioCom(id);
  if (situacao(d) === 'descansando') return;
  $('bt-lista').hidden = true;
  if (mp) fecharMeuPet();
  limparBatalha();
  const c = cfgBatalha();
  const f = forca(t, d);
  const vida = c.vida || 100, extra = vidaExtraLealdade(cuidadosDe(estado.pets.ativo)?.lealdade);   // lealdade alta: vida extra
  bt = { t, d, f, origem, pet: estado.pets.ativo, forma: formaDe(estado.pets.ativo), rod: 0, hp: { L: vida + extra, R: vida }, max: { L: vida + extra, R: vida }, extra, seq: 0,
    tempoTot: { L: 0, R: 0 }, timers: [], anim: { L: 0, R: 0 }, contas: [], revisao: [], fechou: true, fim: false, raf: 0 };
  soltarJoystick();
  pararFalaPet();
  preCarregarPet(bt.forma); preCarregarPet(t.pet);
  // adulto: quadro mais largo (asas) e imagem maior; mesma vida e dano, muda só o visual
  const fL = $('bt-L'), [qw, qh] = tamanhoQuadro(bt.forma), adulto = bt.forma !== bt.pet;
  fL.style.setProperty('--pet-quadro', `${qw} / ${qh}`);
  fL.style.setProperty('--cresce', fatorForma(bt.pet, bt.forma));   // desenho sentado 15% maior que o do filhote
  fL.classList.toggle('adulto', adulto);
  const fR = $('bt-R'), formaR = t.pet, [qwR, qhR] = tamanhoQuadro(formaR);   // o pet do treinador (hoje sempre filhote; adulto teria o mesmo cuidado)
  fR.style.setProperty('--pet-quadro', `${qwR} / ${qhR}`);
  fR.classList.toggle('adulto', !!SPR_ADULTOS[formaR]);
  $('batalha').hidden = false;
  $('bt-nomeL').innerHTML = `${esc(nomeAluno())}<small>· ${esc(nomePet(bt.pet))}</small>`;
  aplicarVisualPet($('bt-imgL'), bt.pet);
  aplicarTinta($('bt-imgR'), t.tinta);   // pet do adversário: só se o treinador tiver tinta no batalhas.json
  $('bt-nomeR').innerHTML = `<small>${NOME_PET[t.pet]} ·</small>${esc(t.nome)}`;
  $('bt-bustoL').outerHTML = bustoHtml(urlQuadro('direita', -1), 'bt-busto L', BUSTO_PERS, false, 'bt-bustoL');
  $('bt-bustoR').outerHTML = bustoHtml(`${IMG}/npcs/${t.id}.webp`, 'bt-busto R', BUSTO_NPC, true, 'bt-bustoR');
  if (NPCS.find(p => p.id === t.id)?.piscar) {   // o busto do treinador pisca como a pessoa no mapa
    bt.pisca = { p: { id: t.id }, img: $('bt-bustoR').querySelector('img'), timer: 0 };
    agendarPiscar(bt.pisca);
  }
  $('bt-tRnome').textContent = `Tempo de ${t.nome}`;
  $('bt-calc').hidden = !calcLigada(NPCS.find(p => p.id === t.id)?.mapa);   // treinador de um mapa com calculadora (ex.: Dona Cida, mapa 7)
  fecharCalc();
  $('bt-fim').hidden = true;
  $('bt-ops').hidden = $('bt-conta').hidden = false;
  $('bt-ops').innerHTML = ''; $('bt-conta').textContent = 'Prepare-se…'; $('bt-msg').textContent = '';
  $('bt-fx').innerHTML = '';
  $('bt-rodada').innerHTML = `<small>Rodada</small>0 / ${c.rodadas || 7}`;
  for (const l of ['L', 'R']) { $('bt-st' + l).className = 'bt-status'; btHp(l); btParado(l); btTempoBarra(l, 1, ''); }
  $('bt-sair').style.visibility = '';
  $('bt-revisao').hidden = true;
  btSeq();
  // fala de início (nível > 1: "Treinei muito…") e "Batalha!"
  const fala = d.nivel > 1 ? (t.fala_nivel_alto || sortear(FALAS_VOLTOU_FORTE)) : t.fala_inicio;
  btFala(fala, 2300);
  btLater(() => { btBanner('Batalha!', '#f0a500'); btAbertura(); btLater(btRodada, 1200); }, 2400);
}

function limparBatalha() {
  if (!bt) return;
  bt.timers.forEach(clearTimeout);
  clearTimeout(bt.anim.L); clearTimeout(bt.anim.R);
  if (bt.pisca) { clearTimeout(bt.pisca.timer); bt.pisca.img = { isConnected: false }; }   // para de piscar
  cancelAnimationFrame(bt.raf);
}

function fecharBatalha(voltarLista = true) {
  $('bt-calc').hidden = true; fecharCalc();
  limparBatalha();
  if (bt?.origem !== 'lista') voltarLista = false;
  bt = null;
  atualizarIconesPessoas();
  $('batalha').hidden = true;
  $('bt-fala').hidden = true;
  $('bt-revisao').hidden = true;
  if (voltarLista) { $('bt-lista').hidden = false; renderListaBatalha(); }
}

// sprites: lado L = pet do aluno; R = pet do treinador, espelhado
function btTocar(lado, nome, { loop = true, ms = 160, depois } = {}) {
  if (!bt) return;
  clearTimeout(bt.anim[lado]);
  const pet = lado === 'L' ? bt.forma : bt.t.pet;
  const nomeReal = lado === 'R' && nome === 'andar_direita' ? 'andar_esquerda' : nome;
  const fs = quadrosDe(pet, nomeReal);
  const img = $('bt-img' + lado), el = $('bt-' + lado);
  el.style.transform = lado === 'R' && nomeReal !== 'andar_esquerda' ? 'scaleX(-1)' : '';
  let i = 0;
  const passo = () => {
    if (!bt) return;
    img.src = fs[i]; i++;
    if (i >= fs.length) {
      if (!loop) { bt.anim[lado] = setTimeout(() => { depois ? depois() : btParado(lado); }, ms); return; }
      i = 0;
    }
    bt.anim[lado] = setTimeout(passo, ms);
  };
  passo();
}
const btParado = (lado) => btTocar(lado, 'andar_direita', { ms: 420 });
const btForma = (lado) => (lado === 'L' ? bt.forma : bt.t.pet);
const SPR_ADULTOS = { dragao_azul_adulto: true, dragao_vermelho_adulto: true };
const adultoNaBatalha = () => !!bt && bt.forma !== bt.pet && temAnim(bt.forma, 'rugido');
// abertura do adulto: ruge; com o truque "Voo de fogo", voa e pousa
function btAbertura() {
  if (!adultoNaBatalha()) return;
  if (truqueLiberado('voo_fogo', bt.pet) && temAnim(bt.forma, 'voo_fogo')) btTocar('L', 'voo_fogo', { loop: false, ms: 360, depois: () => btTocar('L', 'salto_pouso', { loop: false, ms: 140 }) });
  else btTocar('L', 'rugido', { loop: false, ms: 260 });
}

// Ataque com fogo (pets com ataque_fogo): fica bravo ou ruge, abre a boca e o fogo sai na direção do adversário.
// O lado R é desenhado espelhado (scaleX(-1)), então o fogo sai para a esquerda sozinho.
async function btAtaqueFogo(de, para, crit, especial) {
  const antes = temAnim(btForma(de), 'prepara_fogo') ? 'prepara_fogo' : 'rugido';   // respira fundo antes do fogo
  btTocar(de, antes, { loop: false, ms: 260, depois: () => {} });
  await btEsperar(700);
  if (!bt) return;
  btTocar(de, 'ataque_fogo', { loop: false, ms: 200, depois: () => {} });   // fica no último quadro (fogo) até btParado
  await btEsperar(200);
  if (!bt) return;
  await btFogo(de, para, crit, especial);
}
function btFogo(de, para, crit, especial) {
  return new Promise(ok => {
    if (btReduz()) { btLater(ok, 300); return; }
    const el = $('bt-' + de), a = $('bt-arena').getBoundingClientRect(), r = el.getBoundingClientRect(), b = btCentro($('bt-' + para));
    const virado = (el.style.transform || '').includes('scaleX(-1)');
    // a boca no quadro do ataque_fogo fica em ~71% da largura e ~48% da altura
    const x = r.left - a.left + r.width * (virado ? 0.29 : 0.71), y = r.top - a.top + r.height * 0.48;
    const n = especial ? 16 : crit ? 12 : 9, dur = 460;
    for (let i = 0; i < n; i++)
      btParticula(i % 4 === 3 ? '💥' : '🔥', x, y, { dx: b.x - x + (Math.random() - 0.5) * 40, dy: b.y - y + (Math.random() - 0.5) * 50, dur, size: especial ? 36 : crit ? 30 : 24, delay: i * 28 });
    btLater(ok, dur * 0.6 + n * 28);
  });
}

function btCentro(el) { const a = $('bt-arena').getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height * 0.5 }; }
function btParticula(txt, x, y, { dx = 0, dy = -60, dur = 900, size = 22, delay = 0 } = {}) {
  if (btReduz()) return;
  const s = document.createElement('span');
  s.className = 'bt-p'; s.textContent = txt; s.style.fontSize = size + 'px'; s.style.left = x + 'px'; s.style.top = y + 'px';
  $('bt-fx').appendChild(s);
  s.animate([{ transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 },
    { transform: `translate(calc(-50% + ${dx * 0.3}px),calc(-50% + ${dy * 0.3}px)) scale(1.15)`, opacity: 1, offset: 0.2 },
    { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.7)`, opacity: 0 }], { duration: dur, delay, easing: 'ease-out', fill: 'backwards' }).onfinish = () => s.remove();
}
function btProjetil(de, para, pet, crit, especial = false) {
  return new Promise(ok => {
    if (btReduz()) { ok(); return; }
    const a = btCentro($('bt-' + de)), b = btCentro($('bt-' + para)), e = ELEM_PET[pet] || ['✨'];
    const s = document.createElement('span');
    s.className = 'bt-p'; s.textContent = e[0]; s.style.fontSize = (especial ? 64 : crit ? 44 : 34) + 'px'; s.style.left = a.x + 'px'; s.style.top = a.y + 'px';
    $('bt-fx').appendChild(s);
    const dx = b.x - a.x, dy = b.y - a.y, dur = 420;
    const an = s.animate([{ transform: 'translate(-50%,-50%) scale(.6) rotate(0)' },
      { transform: `translate(calc(-50% + ${dx / 2}px),calc(-50% + ${dy / 2 - 50}px)) scale(1.2) rotate(180deg)` },
      { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1) rotate(360deg)` }], { duration: dur, easing: 'ease-in' });
    const t0 = performance.now();
    const rastro = () => { const k = (performance.now() - t0) / dur; if (k < 1 && bt) { btParticula(e[1] || e[0], a.x + dx * k, a.y + dy * k - 50 * Math.sin(Math.PI * k), { dx: (Math.random() - 0.5) * 20, dy: 10 + Math.random() * 20, dur: 420, size: especial ? 24 : 16 }); requestAnimationFrame(rastro); } };
    btLater(rastro, 40);
    an.onfinish = () => { s.remove(); ok(); };
  });
}
function btBote(lado) {
  if (btReduz()) return Promise.resolve();
  const dir = lado === 'L' ? 1 : -1, el = $('bt-' + lado), flip = el.style.transform || '';
  return el.animate([{ transform: `translateX(0) ${flip}` }, { transform: `translateX(${-14 * dir}px) ${flip}`, offset: 0.25 },
    { transform: `translateX(${46 * dir}px) ${flip}`, offset: 0.55 }, { transform: `translateX(0) ${flip}` }], { duration: 520, easing: 'ease-out' }).finished.catch(() => {});
}
function btLevarDano(lado, n, crit, pet, especial = false) {
  const el = $('bt-' + lado), c = btCentro(el), flip = el.style.transform || '', dir = lado === 'L' ? -1 : 1;
  if (!btReduz()) {
    el.animate([{ transform: `translateX(0) ${flip}` }, { transform: `translateX(${10 * dir}px) ${flip}` }, { transform: `translateX(${-8 * dir}px) ${flip}` },
      { transform: `translateX(${6 * dir}px) ${flip}` }, { transform: `translateX(0) ${flip}` }], { duration: 380 });
    $('bt-img' + lado).animate([{ filter: 'none' }, { filter: 'brightness(1.8) sepia(1) hue-rotate(-30deg) saturate(6)' }, { filter: 'none' }], { duration: 380 });
    const e = ELEM_PET[pet] || ['✨'];
    for (let i = 0; i < (especial ? 16 : crit ? 10 : 6); i++) btParticula(e[i % e.length], c.x, c.y, { dx: (Math.random() - 0.5) * (especial ? 240 : 150), dy: -(30 + Math.random() * 80), dur: 700 + Math.random() * 300, size: especial || crit ? 24 : 20 });
    if (especial) $('batalha').animate([{ transform: 'translate(0,0)' }, { transform: 'translate(9px,-6px)' }, { transform: 'translate(-9px,6px)' }, { transform: 'translate(7px,4px)' }, { transform: 'translate(-6px,-4px)' }, { transform: 'translate(0,0)' }], { duration: 480 });
    else if (crit) $('bt-arena').animate([{ transform: 'translate(0,0)' }, { transform: 'translate(4px,-3px)' }, { transform: 'translate(-4px,3px)' }, { transform: 'translate(0,0)' }], { duration: 260 });
  }
  const d = document.createElement('div');
  d.className = 'bt-dano' + (crit || especial ? ' crit' : '') + (especial ? ' especial' : ''); d.textContent = (especial ? '💥 ' : crit ? '⭐ ' : '') + '−' + n;
  d.style.left = c.x + 'px'; d.style.top = (c.y - 40) + 'px';
  $('bt-fx').appendChild(d);
  d.animate([{ transform: 'translate(-50%,0) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-14px) scale(1.15)', opacity: 1, offset: 0.2 },
    { transform: 'translate(-50%,-60px) scale(1)', opacity: 0 }], { duration: 1100, easing: 'ease-out' }).onfinish = () => d.remove();
}
// Errou: o pet fica tonto (balança, ⭐ girando 0,6 s) e perde vida
function btTonto(lado, n) {
  const el = $('bt-' + lado), c = btCentro(el), flip = el.style.transform || '';
  if (!btReduz()) {
    el.animate([{ transform: `rotate(0) ${flip}` }, { transform: `rotate(-9deg) ${flip}` }, { transform: `rotate(8deg) ${flip}` }, { transform: `rotate(-6deg) ${flip}` },
      { transform: `rotate(4deg) ${flip}` }, { transform: `rotate(0) ${flip}` }], { duration: 600, easing: 'ease-in-out' });
    const st = document.createElement('div');
    st.className = 'bt-tonto'; st.innerHTML = '<span>⭐</span><span>⭐</span>';
    st.style.left = c.x + 'px'; st.style.top = (c.y - el.getBoundingClientRect().height * 0.42) + 'px';
    $('bt-fx').appendChild(st);
    st.animate([{ transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 }, { transform: 'translate(-50%,-50%) rotate(720deg)', opacity: 1, offset: 0.85 },
      { transform: 'translate(-50%,-50%) rotate(800deg)', opacity: 0 }], { duration: 600, easing: 'linear' }).onfinish = () => st.remove();
  }
  const d = document.createElement('div');
  d.className = 'bt-dano tonto'; d.textContent = '−' + n;
  d.style.left = c.x + 'px'; d.style.top = (c.y - 40) + 'px';
  $('bt-fx').appendChild(d);
  d.animate([{ transform: 'translate(-50%,0) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-10px) scale(1)', opacity: 1, offset: 0.25 },
    { transform: 'translate(-50%,-44px) scale(.9)', opacity: 0 }], { duration: 1000, easing: 'ease-out' }).onfinish = () => d.remove();
}

// 🔥 acertos seguidos do aluno (com N seguidos o próximo ataque é especial)
function btSeq() {
  const n = bt?.seq || 0, meta = cfgBatalha().sequencia?.acertos ?? 3, el = $('bt-seq');
  el.textContent = `🔥 ${n}`;
  el.classList.toggle('on', n > 0);
  el.classList.toggle('cheio', n >= meta);
  el.title = n >= meta ? 'Ataque especial pronto!' : `Acertos seguidos (${meta} = ataque especial)`;
}

// O treinador comenta a rodada (balão curto, no máximo uma vez por rodada)
function btReagir(R) {
  const t = bt.t;
  let lista = null;
  if (R.L.ok) lista = t.reage_acerto_aluno;
  else if (R.R.ok && R.L.v !== null) lista = Math.random() < 0.5 ? t.reage_ele_acertou : t.reage_erro_aluno;   // os dois valem: alterna
  else if (R.R.ok) lista = t.reage_ele_acertou;
  else if (R.L.v !== null) lista = t.reage_erro_aluno;
  if (lista?.length) btFala(sortear(lista), 1500);
}

function btBanner(txt, cor = '#fff') {
  const b = $('bt-banner');
  b.textContent = txt; b.style.color = cor;
  b.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1.08)', offset: 0.25 }, { opacity: 1, transform: 'scale(1)', offset: 0.75 }, { opacity: 0, transform: 'scale(1)' }],
    { duration: btReduz() ? 900 : 1100, easing: 'ease-out' });
}
function btStatus(lado, txt, tipo) { const s = $('bt-st' + lado); s.textContent = txt; s.className = 'bt-status on ' + (tipo || ''); }
function btConfete(lado) { const c = btCentro($('bt-' + lado)); for (let i = 0; i < 18; i++) btParticula(['🎉', '⭐', '✨', '🎊'][i % 4], c.x, c.y - 30, { dx: (Math.random() - 0.5) * 260, dy: -(40 + Math.random() * 120), dur: 1200 + Math.random() * 500, size: 22, delay: i * 40 }); }
function btFala(texto, ms = 3000) {
  const el = $('bt-fala');
  el.textContent = texto; el.hidden = false;
  el.classList.remove('nova'); void el.offsetWidth; el.classList.add('nova');
  clearTimeout(btFala.t);
  if (ms) btFala.t = setTimeout(() => { el.hidden = true; }, ms);
}

function btHp(lado) {
  const vida = bt.max[lado], v = bt.hp[lado], pct = v / vida * 100, el = $('bt-hp' + lado);
  el.style.width = pct + '%';
  el.style.background = pct > 50 ? 'var(--bt-hp)' : pct > 25 ? 'var(--bt-hp-mid)' : 'var(--bt-hp-low)';
  $('bt-hp' + lado + 'b').style.width = pct + '%';
  $('bt-hp' + lado + 't').innerHTML = `${v} / ${vida}` + (lado === 'L' && bt.extra ? ` <span class="bt-leal" title="Vida extra pela lealdade">💛 lealdade +${bt.extra}</span>` : '');
}
function btTempoBarra(lado, frac, txt) { $('bt-t' + lado).style.width = Math.max(0, frac) * 100 + '%'; $('bt-t' + lado + 'txt').textContent = txt; }

function btRodada() {
  if (!bt) return;
  const c = cfgBatalha(), T = c.tempo_s || 15;
  bt.rod++;
  $('bt-rodada').innerHTML = `<small>Rodada</small>${bt.rod} / ${c.rodadas || 7}`;
  const p = gerarConta(bt.t.contas, bt.f.contas);
  Object.assign(bt, { p, resp: { L: null, R: null }, lim: { L: T, R: T }, t0: performance.now(), fechou: false });
  for (const l of ['L', 'R']) $('bt-st' + l).className = 'bt-status';
  $('bt-conta').textContent = p.conta;
  $('bt-conta').classList.toggle('longa', p.longa);
  $('bt-msg').textContent = '';
  bt.usouRodada = null; bt.recusou = false; bt.oferta = null;
  $('bt-dica').hidden = qtdItem('dica_pet') <= 0;
  $('bt-dica').textContent = `💡 Dica do pet (${qtdItem('dica_pet')})`;
  $('bt-ops').innerHTML = p.opcoes.map((v, i) => `<button class="bt-op" data-i="${i}">${esc(v)}</button>`).join('');
  $('bt-ops').classList.toggle('longas', p.opcoes.some(v => v.length > 7));
  // treinador simulado: acerta com a chance dele, no tempo dele; errando, escolhe uma errada
  const tR = bt.f.tempo[0] + Math.random() * (bt.f.tempo[1] - bt.f.tempo[0]);
  const certo = Math.random() < bt.f.acerto;
  const erradas = p.opcoes.filter(v => v !== p.resposta);
  // o resultado do treinador já fica guardado: se o aluno responder antes, o treinador responde junto (com o tempo sorteado)
  bt.npc = { v: certo ? p.resposta : sortear(erradas), t: tR };
  bt.npcTimer = btLater(() => { if (bt && !bt.fechou && bt.resp.R === null) btResponder('R', bt.npc.v); }, tR * 1000);
  btTick();
}

const btAgora = () => (performance.now() - bt.t0) / 1000;
function btTick() {
  if (!bt || bt.fechou) return;
  const t = btAgora(), T = cfgBatalha().tempo_s || 15;
  for (const l of ['L', 'R']) {
    const resp = bt.resp[l] !== null, rest = resp ? 0 : Math.max(0, bt.lim[l] - t);
    btTempoBarra(l, rest / T, resp ? 'respondeu' : Math.ceil(rest) + ' s');
  }
  for (const l of ['L', 'R']) if (bt.resp[l] === null && t >= bt.lim[l]) btResponder(l, null);
  if (bt && !bt.fechou) bt.raf = requestAnimationFrame(btTick);
}

function btResponder(l, v, tSorteado = null) {
  if (!bt || bt.fechou || bt.resp[l] !== null) return;
  if (l === 'L' && bt.oferta && v === null) { bt.oferta = null; $('bt-msg').textContent = ''; }   // o tempo acabou na oferta
  // errou com Segunda chance na bolsa (1 por batalha): pergunta antes de valer o erro
  if (l === 'L' && v !== null && v !== bt.p.resposta && !bt.recusou && !bt.segundaUsada && qtdItem('segunda_chance') > 0) {
    bt.oferta = v;
    $('bt-dica').hidden = true;
    for (const b of $('bt-ops').querySelectorAll('.bt-op')) if (bt.p.opcoes[b.dataset.i] === v) { b.disabled = true; b.classList.add('errada'); }
    $('bt-msg').innerHTML = `Errou! <button class="bt-segunda" data-segunda="1">🔁 Segunda chance (${qtdItem('segunda_chance')})</button> <button class="bt-segunda nao" data-segunda="0">Não</button>`;
    tocar('erro');
    return;
  }
  const t = tSorteado ?? btAgora();
  bt.resp[l] = { v, t, ok: v === bt.p.resposta };
  const o = l === 'L' ? 'R' : 'L';
  if (bt.resp[o] === null) bt.lim[o] = Math.min(bt.lim[o], t + (cfgBatalha().depois_s ?? 6));
  if (l === 'L') {
    tocar('clique');
    for (const b of $('bt-ops').querySelectorAll('.bt-op')) {
      b.disabled = true;
      if (bt.p.opcoes[b.dataset.i] === v) b.classList.add(bt.resp.L.ok ? 'certa' : 'errada'); else b.classList.add('esmaecida');
    }
    $('bt-msg').textContent = '';
  }
  // o aluno respondeu (ou o tempo dele acabou) antes do treinador: o treinador responde junto, com o tempo que já tinha
  // sorteado — quem acertou mais rápido continua atacando primeiro. Passou do prazo dele (depois_s), fica sem resposta, como antes.
  if (l === 'L' && bt.resp.R === null && bt.npc) {
    clearTimeout(bt.npcTimer);
    if (bt.npc.t <= bt.lim.R) btResponder('R', bt.npc.v, bt.npc.t);
    else btResponder('R', null, bt.lim.R);
    return;
  }
  btStatus(l, v === null ? '⏱ tempo!' : '✔ respondeu', '');
  if (bt.resp.L !== null && bt.resp.R !== null) btFechar();
}

async function btFechar() {
  bt.fechou = true;
  cancelAnimationFrame(bt.raf);
  const R = bt.resp, p = bt.p;
  for (const b of $('bt-ops').querySelectorAll('.bt-op')) { b.disabled = true; if (p.opcoes[b.dataset.i] === p.resposta) b.classList.add('certa'); }
  for (const l of ['L', 'R']) btStatus(l, R[l].v === null ? '⏱ sem resposta' : R[l].ok ? `✔ ${R[l].t.toFixed(1)} s` : '✘ errou', R[l].ok ? 'ok' : 'bad');
  $('bt-msg').textContent = '';
  tocar(R.L.ok ? 'acerto' : 'erro');
  const c = cfgBatalha();
  // cada rodada vai para o painel da professora (acertou: null = o tempo acabou)
  bt.contas.push({ treinador: bt.t.id, tipo: p.tipo, dificuldade: p.dificuldade, conta: p.conta, certa: p.resposta, resposta: R.L.v,
    acertou: R.L.v === null ? null : R.L.ok, tempo_s: R.L.v === null ? null : +R.L.t.toFixed(1), usou: bt.usouRodada || null, data: Date.now() });
  $('bt-dica').hidden = true;
  if (!R.L.ok) bt.revisao.push({ conta: p.conta, resposta: R.L.v, certa: p.resposta, explica: p.explica, relembre: chaveRelembreConta(p.tipo, p.conta) });
  // sequência: errar ou deixar o tempo acabar zera
  bt.seq = R.L.ok ? bt.seq + 1 : 0;
  btSeq();
  btReagir(R);
  // errou: fica tonto e perde vida (tempo esgotado não pune: só não ataca)
  let tontos = 0;
  for (const l of ['L', 'R']) {
    if (R[l].ok) continue;
    const n = R[l].v === null ? (c.erro?.tempo_esgotado_perde_vida ?? 0) : (c.erro?.perde_vida ?? 5);
    if (n <= 0) continue;
    bt.hp[l] = Math.max(0, bt.hp[l] - n);
    btHp(l);
    btTonto(l, n);
    tontos++;
  }
  if (tontos) { await btEsperar(750); if (!bt) return; }
  if (bt.hp.L <= 0 || bt.hp.R <= 0) return btFim();
  // quem acertou mais rápido ataca primeiro
  const ordem = ['L', 'R'].filter(l => R[l].ok).sort((a, b) => R[a].t - R[b].t);
  if (!ordem.length) { btBanner('Ninguém acertou', '#a3a1c9'); await btEsperar(1300); }
  for (const l of ordem) {
    if (!bt || bt.hp.L <= 0 || bt.hp.R <= 0) break;
    const o = l === 'L' ? 'R' : 'L', pet = l === 'L' ? bt.pet : bt.t.pet;
    let { n, critico } = dano(R[l].t);
    const especial = l === 'L' && bt.seq >= (c.sequencia?.acertos ?? 3);
    bt.tempoTot[l] += R[l].t;
    if (especial) {   // ATAQUE ESPECIAL: cambalhota antes, projétil maior, tela treme
      n = Math.round(n * (c.sequencia?.multiplicador_dano ?? 1.5));
      bt.seq = 0;
      btBanner('ATAQUE ESPECIAL!', '#ffd700');
      if (adultoNaBatalha()) { btAbertura(); await btEsperar(1200); }   // adulto: ruge (ou voa, com o truque) no lugar da cambalhota
      else {
        btTocar('L', 'pulo_cambalhota', { loop: false, ms: 90 });
        await btEsperar(Math.max(700, quadrosDe(bt.forma, 'pulo_cambalhota').length * 90 + 120));
      }
      if (!bt) return;
      btSeq();
    }
    const fogo = temAnim(btForma(l), 'ataque_fogo');   // dragão adulto: sempre prepara e solta fogo pela boca ("Cuspir fogo" é só um truque do Meu Pet)
    if (fogo) await btAtaqueFogo(l, o, critico, especial);
    else {
      btTocar(l, 'correndo', { loop: false, ms: 110 });
      await btBote(l);
      await btProjetil(l, o, pet, critico, especial);
    }
    if (!bt) return;
    bt.hp[o] = Math.max(0, bt.hp[o] - n);
    btHp(o);
    btLevarDano(o, n, critico, fogo ? 'fogo' : pet, especial);
    if (temAnim(btForma(o), 'bravo')) btTocar(o, 'bravo', { loop: false, ms: 700 });   // o dragão adulto apanha e fica bravo
    await btEsperar(650);
    btParado(l);
  }
  if (!bt) return;
  await btEsperar(500);
  if (!bt) return;
  if (bt.hp.L <= 0 || bt.hp.R <= 0 || bt.rod >= (cfgBatalha().rodadas || 7)) return btFim();
  btRodada();
}

function btFim() {
  const { hp, tempoTot } = bt;
  const venceu = hp.L > hp.R || (hp.L === hp.R && tempoTot.L <= tempoTot.R);
  const v = venceu ? 'L' : 'R', q = venceu ? 'R' : 'L';
  bt.fim = true;
  if (v === 'L' && adultoNaBatalha()) {   // adulto: orgulhoso (ufa, se venceu com pouca vida) e depois o rugido sentado
    btTocar('L', hp.L <= bt.max.L * 0.25 ? 'ufa' : 'orgulhoso', { loop: false, ms: 1000, depois: () => btTocar('L', 'rugido_sentado', { ms: 600 }) });
  } else btTocar(v, 'orgulhoso', { ms: 130 });   // sem `orgulhoso`: feliz (reserva)
  btTocar(q, 'triste_fome', { ms: 420 }); btConfete(v);
  btFala(venceu ? bt.t.fala_perdeu : bt.t.fala_venceu, 0);
  tocar(venceu ? 'vitoria' : 'erro');
  const pr = registrarBatalha(venceu ? 'venceu' : 'perdeu');
  $('bt-ops').hidden = $('bt-conta').hidden = true;
  $('bt-msg').textContent = '';
  $('bt-calc').hidden = true; fecharCalc();
  $('bt-sair').style.visibility = 'hidden';   // some sem mudar a largura do HUD
  for (const l of ['L', 'R']) btTempoBarra(l, 0, '');
  $('bt-fim-tit').textContent = venceu ? 'Você venceu! 🎉' : `${bt.t.nome} venceu desta vez`;
  $('bt-fim-tit').classList.toggle('venceu', venceu);
  const chips = [];
  if (pr.xp) chips.push(`<span class="bt-premio xp">+${pr.xp} XP</span>`);
  if (pr.moedas) chips.push(`<span class="bt-premio mo">+${pr.moedas} ${moedaHtml()}</span>`);
  if (pr.lealdade) chips.push(`<span class="bt-premio le">+${Math.round(pr.lealdade * 10) / 10} lealdade</span>`);
  if (pr.bonusPrimeira) chips.push(`<span class="bt-premio mo">🏆 1ª vitória: +${pr.bonusPrimeira} ${moedaHtml()}</span>`);
  $('bt-premios').innerHTML = chips.join('') || '<span class="bt-premio">Sem prêmios</span>';
  const dia = diaBatalhas(), lim = cfgBatalha().limites_dia || {};
  $('bt-fim-dia').innerHTML = (pr.cortado ? '<b>Limite de prêmios de hoje atingido — amanhã tem mais!</b>' : '') +
    `<span>Prêmios de batalha hoje: ${dia.moedas} / ${lim.moedas ?? '∞'} moedas</span>`;
  $('bt-revanche').hidden = venceu;
  // revisão das contas erradas (ou "Perfeito!"); os botões só aparecem depois do "Entendi!"
  const comRevisao = cfgBatalha().revisao_no_fim !== false, revisar = comRevisao && bt.revisao.length > 0;
  $('bt-fim-perfeito').hidden = !(comRevisao && !bt.revisao.length && bt.contas.length);
  $('bt-fim-botoes').hidden = revisar;
  $('bt-fim').hidden = false;
  if (revisar) btLater(abrirRevisaoBatalha, 1600);
  if (pr.xp) darXP(pr.xp);
}

function abrirRevisaoBatalha() {
  if (!bt) return;
  $('bt-rev-lista').innerHTML = bt.revisao.map(x => `
    <div class="bt-rev-item">
      <div class="bt-rev-conta">${esc(x.conta)}</div>
      <div class="bt-rev-resps">
        <span class="bt-rev-sua">Sua resposta: <b>${x.resposta === null ? 'não respondeu (tempo)' : esc(x.resposta)}</b></span>
        <span class="bt-rev-certa">Certa: <b>${esc(x.certa)}</b></span>
      </div>
      <div class="bt-rev-explica">${esc(x.explica)}</div>
      ${x.relembre && explicacaoDe(x.relembre) ? `<button class="jr-btn-relembre" data-relembre="${x.relembre}">📖 Relembre</button>` : ''}
    </div>`).join('');
  $('bt-revisao').hidden = false;
  $('bt-rev-lista').scrollTop = 0;
  $('bt-rev-ok').focus({ preventScroll: true });
}

function fecharRevisaoBatalha() {
  $('bt-revisao').hidden = true;
  $('bt-fim-botoes').hidden = false;
}

// Salva o resultado: desafio do treinador, prêmios (dentro do limite do dia) e as contas, para a professora
function registrarBatalha(resultado) {
  const { t, d, pet } = bt;
  if (resultado === 'venceu') missaoProgresso('batalha');
  const dia = diaBatalhas();
  const c = cuidadosDe(pet);
  const pr = premios(resultado, d, dia, c?.lealdade);
  const novo = depoisDaBatalha(d, resultado);
  (estado.batalhas ||= {})[t.id] = novo;
  dia.moedas += pr.moedas; dia.lealdade += pr.lealdade; dia.xp += pr.xp;
  const patch = { [`batalhas/${t.id}`]: novo, batalhas_dia: { ...dia } };
  if (pr.moedas || pr.bonusPrimeira) {
    estado.pets.moedas = (Number(estado.pets.moedas) || 0) + pr.moedas + pr.bonusPrimeira;
    patch['pets/moedas'] = estado.pets.moedas;
    registrarGanho('batalha', pr.moedas, patch);
    registrarGanho('batalha_primeira', pr.bonusPrimeira, patch);
  }
  if (pr.lealdade && c) {
    c.lealdade = Math.min(100, (Number(c.lealdade) || 0) + pr.lealdade);
    patch[`pets/conquistados/${pet}/lealdade`] = c.lealdade;
  }
  const agora = Date.now();
  patch[`respostas/batalha-${agora}`] = {
    tipo: 'batalha', treinador: t.id, nivel: d.nivel, pet, resultado, data: agora,
    acertos: bt.contas.filter(x => x.acertou).length, erradas: bt.contas.filter(x => !x.acertou).length, contas: bt.contas,
  };
  gravar(patch);
  if (pr.lealdade) verificarMarcosLealdade(pet);
  return pr;
}

// Sair no meio: conta como derrota, sem prêmio (o treinador fica disponível para revanche)
function sairDaBatalha() {
  if (!bt || bt.fim) return;
  registrarBatalha('saiu');
  fecharBatalha(true);
}

// ============================================================
//  PESSOAS NOS MAPAS (dados/jogo/npcs.json) — paradas, piscam, conversam; 10 são treinadoras da batalha
// ============================================================
let NPCS = [];                       // lista do JSON
const PESSOA_PERTO = 70 * ESCALA_ATORES;   // px: perto assim, conversa sem andar (nos salões, × o tamanho da cena)
let pessoasMapa = [];                // { p, img, sombra, icone, alt, larg, timer }
let balaoPessoa = null;              // { o, timer }
const ultimaFalaPessoa = {};         // id → índice da última fala (não repete seguida)
let editarNpcs = false;              // ?editarNpcs=1 no modo teste (professora): arrastar e copiar posições

// Altura na tela: a imagem da pessoa (h px, na mesma escala dos personagens) × ESCALA_SPRITE
const altPessoa = (p) => (cena?.salao ? alturaSalao() * 1.05 * (Number(p.escala) || 1) : p.h * ESCALA_SPRITE);   // nos salões: adulto = 1,05 × o personagem (× escala do npcs.json)

function limparPessoas() {
  tirarDestaque();
  for (const o of pessoasMapa) clearTimeout(o.timer);
  pessoasMapa = [];
  fecharBalaoPessoa();
  $('npc-editar')?.remove();
}

function montarPessoas(n) {
  limparPessoas();
  const palco = $('cena-atores');
  // nos interiores (loja, fliperama) a posição vem do JSON do interior; nos mapas ficam só as pessoas sem interior
  const xy = (v) => (Array.isArray(v) ? v : v && Number.isFinite(v.x) ? [v.x, v.y] : null);
  const posNoInterior = (p) => xy(p.id === cfgLoja().vendedor ? LOJA?.vendedora?.pos : p.id === 'teo' ? FLIPER?.teo || FLIPER?.balcao : p.id === 'lia_cientista' ? LAB?.lia : null);
  const lista = n === 'loja' || n === 'fliperama' || n === 'laboratorio'
    ? NPCS.filter(p => p.interior === n).map(p => { const pos = posNoInterior(p); return pos ? { ...p, x: pos[0], y: pos[1] } : p; })
    : NPCS.filter(p => p.mapa === n && !p.interior);
  lista.slice(0, 9).forEach((p, i) => {
    const alt = altPessoa(p), larg = alt * p.w / p.h;
    const sombra = document.createElement('div');
    sombra.className = 'jr-pet-sombra jr-pessoa-sombra';
    const img = document.createElement('img');
    img.className = 'jr-ator jr-pessoa';
    img.alt = p.nome; img.draggable = false;
    img.src = `${IMG}/npcs/${p.id}.webp`;
    img.style.setProperty('--d', `${-(i * 0.7) % 2.4}s`);   // respiração defasada
    const o = { p, img, sombra, icone: document.createElement('div'), treinador: !!(p.treinador && treinador(p.id)), temIcone: false, alt, larg, timer: 0 };
    o.icone.className = 'jr-pessoa-icone';
    palco.append(sombra, img, o.icone);
    posicionarPessoa(o);
    if (p.piscar) { const pre = new Image(); pre.src = `${IMG}/npcs/${p.id}-piscando.webp`; agendarPiscar(o); }
    pessoasMapa.push(o);
  });
  atualizarIconesPessoas();
  if (editarNpcs) ligarEdicaoPessoas();
  if (destaquePendente) { const id = destaquePendente; destaquePendente = null; destacarPessoa(id); }
}

// ── "Ir até lá" (lista de treinadores): abre o mapa da pessoa e marca a cabeça dela por 8 s ──
let destaquePendente = null, destaque = null;   // destaque: { id, el, timer }
const mapaDoTreinador = (id) => NPCS.find(p => p.id === id)?.mapa || null;

function irAteTreinador(id) {
  const m = mapaDoTreinador(id);
  if (!m) return;
  $('bt-lista').hidden = true;
  if (NPCS.find(p => p.id === id)?.interior === 'loja' && LOJA) {   // quem mora na loja: entra pela porta do Mercado
    if (ehLoja()) { destacarPessoa(id); return; }
    destaquePendente = id;
    transicao(() => abrirLojaInterior({ tipo: 'mapa', n: portaMercado()?.mapa || m }));
    return;
  }
  if (cena?.tipo === 'mapa' && cena.n === m) { destacarPessoa(id); return; }
  destaquePendente = id;
  transicao(() => abrirMapa(m, 'entrada'));
}

function destacarPessoa(id) {
  tirarDestaque();
  const o = pessoasMapa.find(x => x.p.id === id);
  if (!o) return;
  const el = document.createElement('div');
  el.className = 'jr-pessoa-destaque';
  el.textContent = '⬇';
  const ea = escalaAtoresCena();
  Object.assign(el.style, { left: o.p.x + 'px', top: (o.p.y - o.alt - (o.temIcone ? 20 : 4) * ea) + 'px', fontSize: 20 * ea + 'px' });
  $('cena-atores').appendChild(el);
  destaque = { id, el, timer: setTimeout(tirarDestaque, 8000) };
}

function tirarDestaque() {
  if (!destaque) return;
  clearTimeout(destaque.timer);
  destaque.el.remove();
  destaque = null;
}

function posicionarPessoa(o) {
  const { p, img, sombra, icone, alt, larg } = o;
  Object.assign(img.style, { left: p.x + 'px', top: p.y + 'px', height: alt + 'px', zIndex: Math.round(p.y) });
  Object.assign(sombra.style, { left: p.x + 'px', top: p.y + 'px', width: larg * 1.1 + 'px', height: larg * 0.32 + 'px', zIndex: Math.round(p.y) - 1 });
  if (icone) Object.assign(icone.style, { left: p.x + 'px', top: (p.y - alt - 2 * escalaAtoresCena()) + 'px', fontSize: 18 * escalaAtoresCena() + 'px' });
}

// Pisca 150 ms a cada 3–6 s (às vezes duas vezes seguidas)
function agendarPiscar(o) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const normal = `${IMG}/npcs/${o.p.id}.webp`, fechado = `${IMG}/npcs/${o.p.id}-piscando.webp`;
  const piscar = (vezes) => {
    if (!o.img.isConnected) return;
    o.img.src = fechado;
    o.timer = setTimeout(() => {
      if (!o.img.isConnected) return;
      o.img.src = normal;
      o.timer = vezes > 1 ? setTimeout(() => piscar(vezes - 1), 140) : setTimeout(() => piscar(Math.random() < 0.25 ? 2 : 1), 3000 + Math.random() * 3000);
    }, 150);
  };
  o.timer = setTimeout(() => piscar(1), 1000 + Math.random() * 5000);
}

// Acima da cabeça: treinadora ⚔️ (descansando: 😴) e ❗ quando a pessoa tem pedido de ajuda
function atualizarIconesPessoas() {
  for (const o of pessoasMapa) {
    const descansa = o.treinador && situacao(desafioCom(o.p.id)) === 'descansando';
    const ped = !!pedidoDe(o.p.id);
    o.icone.innerHTML = (o.treinador ? `<span>${descansa ? '😴' : '⚔️'}</span>` : '') + (ped ? '<span class="jr-pedido-exc" aria-label="Pedido de ajuda">!</span>' : '');
    o.icone.classList.toggle('descansa', descansa && !ped);
    o.temIcone = !!o.icone.innerHTML;
    o.icone.hidden = !o.temIcone;
  }
}

function pessoaEm(pt) {
  let melhor = null, md = Infinity;
  for (const o of pessoasMapa) {
    const folga = 8 * escalaAtoresCena();
    if (Math.abs(pt.x - o.p.x) > o.larg / 2 + folga || pt.y < o.p.y - o.alt - folga || pt.y > o.p.y + folga) continue;
    const d = Math.abs(pt.x - o.p.x) + Math.abs(pt.y - o.p.y);
    if (d < md) { md = d; melhor = o; }
  }
  return melhor;
}

// Tocou na pessoa: anda até o lado dela pela trilha e ela fala
function irFalarCom(o) {
  if (perguntaAberta || transicionando || sobreposicaoAberta()) return;
  fecharBalaoPessoa();
  if (dist(jog.x, jog.y, o.p.x, o.p.y) <= PESSOA_PERTO * escalaAtoresCena() / ESCALA_ATORES) { falarCom(o); return; }
  const lado = jog.x < o.p.x ? -1 : 1;
  destinoEspecial = null;
  if (ehLoja() && o.p.id === cfgLoja().vendedor && LOJA?.vendedora?.ponto) { caminharNaTrilha(...LOJA.vendedora.ponto, () => falarCom(o)); return; }   // vai até o balcão
  if (o.p.id === 'teo' && FLIPER?.teo?.ponto) { caminharNaTrilha(...FLIPER.teo.ponto, () => falarCom(o)); return; }   // lado de fora do balcão
  if (o.p.id === 'lia_cientista' && LAB?.lia?.ponto) { caminharNaTrilha(...LAB.lia.ponto, () => falarCom(o)); return; }           // a Lia fica fora da área de andar
  caminharNaTrilha(o.p.x + lado * (o.larg / 2 + 16 * escalaAtoresCena()), o.p.y, () => falarCom(o));
  if (!jog.caminho.length && !jog.aoChegar) falarCom(o);   // sem caminho (não deveria acontecer): fala mesmo assim
}

function falarCom(o) {
  if (perguntaAberta || transicionando || cena?.tipo !== 'mapa' || !o.img.isConnected) return;
  jog.dir = o.p.x < jog.x ? 'esquerda' : 'direita';
  desenharJogador();
  const falas = o.p.falas || [];
  let i = Math.floor(Math.random() * falas.length);
  if (falas.length > 1 && i === ultimaFalaPessoa[o.p.id]) i = (i + 1 + Math.floor(Math.random() * (falas.length - 1))) % falas.length;
  ultimaFalaPessoa[o.p.id] = i;
  if (destaque?.id === o.p.id) tirarDestaque();
  const saudacao = ehLoja() && o.p.id === cfgLoja().vendedor ? `Oi, ${nomeAluno()}! O que vai ser hoje?` : null;
  const el = $('pessoa-balao');
  // pedido de ajuda: "🙋 Ajudar"; treinadora: "⚔️ Batalhar" (ou o aviso de descanso/fome); com botão, também "Agora não"
  const ped = pedidoDe(o.p.id), botoes = [];
  let aviso = '';
  if (o.p.id === cfgLoja().vendedor && lojaPronta()) botoes.push('<button class="jr-btn jr-btn-ouro" data-acao="loja">🛒 Loja</button>');
  if (o.p.id === 'teo' && FLIPER) botoes.push('<button class="jr-btn jr-btn-ouro" data-acao="recordes">🏆 Recordes</button>');
  if (o.p.id === 'lia_cientista' && PROG) botoes.push('<button class="jr-btn jr-btn-ouro" data-acao="recordes-lab">🏆 Recordes</button>', '<button class="jr-btn" data-acao="como-lab">❓ Como funciona</button>');
  if (ped) botoes.push(`<button class="jr-btn ${botoes.length ? '' : 'jr-btn-ouro'}" data-acao="ajudar">🙋 Ajudar</button>`);
  if (o.treinador) {
    const d = desafioCom(o.p.id);
    if (situacao(d) === 'descansando') aviso = `<div class="jr-pessoa-descansa">Estou descansando. Volta em ${Math.max(1, Math.ceil((d.descansa_ate - Date.now()) / 3600e3))} h!</div>`;
    else if (podeBatalhar() && barrigaDe(estado.pets.ativo) < (cfgBatalha().barriga_minima ?? 25)) { seguidor?.reagir('triste_fome', 2000); aviso = `<div class="jr-pessoa-descansa">${esc(nomePet(estado.pets.ativo))} está com fome. Dê comida antes de batalhar.</div>`; }
    else if (podeBatalhar()) botoes.push(`<button class="jr-btn ${ped ? '' : 'jr-btn-ouro'}" data-acao="batalhar">⚔️ Batalhar</button>`);
  }
  if (botoes.length) botoes.push('<button class="jr-btn jr-btn-sec" data-acao="nao">Agora não</button>');
  const extra = aviso + (botoes.length ? `<div class="jr-pessoa-botoes">${botoes.join('')}</div>` : '');
  el.innerHTML = `<b>${esc(o.p.nome)}</b><span>${esc(saudacao || falas[i] || '')}</span>${extra}`;
  el.hidden = false;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  balaoPessoa = { o, timer: setTimeout(fecharBalaoPessoa, extra.includes('data-acao') ? 9000 : 5000) };
  posicionarBalaoPessoa();
}

function posicionarBalaoPessoa() {
  if (!balaoPessoa) return;
  const { o } = balaoPessoa;
  const el = $('pessoa-balao');
  const topo = o.p.y - o.alt - (o.temIcone ? 18 : 4) * escalaAtoresCena();
  const cabeca = imagemParaTela(o.p.x, topo);
  const embaixo = cabeca.y < el.offsetHeight + 64;   // perto do topo (HUD): abre embaixo da pessoa, bico para cima
  el.classList.toggle('embaixo', embaixo);
  if (!embaixo) { posicionarNaTela(el, o.p.x, topo); return; }
  const pe = imagemParaTela(o.p.x, o.p.y + 6), meia = el.offsetWidth / 2, vw = $('cena-vp').clientWidth;
  el.style.left = clamp(pe.x, meia + 8, vw - meia - 8) + 'px';
  el.style.top = pe.y + el.offsetHeight + 8 + 'px';
}

function fecharBalaoPessoa() {
  if (balaoPessoa) clearTimeout(balaoPessoa.timer);
  balaoPessoa = null;
  const el = $('pessoa-balao');
  if (el) el.hidden = true;
}

function acaoBalaoPessoa(e) {
  e.stopPropagation();
  const b = e.target.closest('[data-acao]');
  if (!b || !balaoPessoa) return;
  const o = balaoPessoa.o, id = o.p.id;
  fecharBalaoPessoa();
  if (b.dataset.acao === 'batalhar') iniciarBatalha(id, 'pessoa');   // revanche/descanso/fome conferidos lá
  if (b.dataset.acao === 'ajudar') abrirPedido(o);
  if (b.dataset.acao === 'loja') abrirLoja(LOJA?.vendedora?.aba || 'comidas');
  if (b.dataset.acao === 'recordes') mostrarRecordes();
  if (b.dataset.acao === 'recordes-lab') mostrarRecordesLab();
  if (b.dataset.acao === 'como-lab') mostrarComoFunciona();
}

// ============================================================
//  PEDIDOS DE AJUDA — as pessoas dos mapas pedem ajuda com um problema (dados/jogo/pedidos.json;
//  regras em js/jogo-revisao/pedidos.js). Só depois de vencer o ginásio do problema; 1 por pessoa por dia.
// ============================================================
let pd = null;   // pedido aberto: { p, o, tentativa, num, dica, fim }

function diaPedidos() {
  const hoje = diaLocal();
  if (estado.pedidosDia?.data !== hoje) estado.pedidosDia = { data: hoje, moedas: 0, pessoas: {} };
  estado.pedidosDia.pessoas ||= {};
  return estado.pedidosDia;
}

const pedidoDe = (npc) => (carregouProgresso && pedidosProntos()
  ? pedidoDisponivel(npc, { venceu: (k) => !!estado.ginasios[k]?.lider.vencido, resolvidos: estado.pedidos, dia: diaPedidos() }) : null);

function abrirPedido(o) {
  const p = pedidoDe(o.p.id);
  if (!p || perguntaAberta || transicionando) return;
  const salvo = estado.pedidos[p.id] || {};
  pd = { p, o, tentativa: (Number(salvo.tentativas) || 0) + 1, num: '', dica: !!salvo.dica, fim: false };
  soltarJoystick();
  pararFalaPet();
  $('pd-busto').outerHTML = bustoHtml(`${IMG}/npcs/${p.npc}.webp`, 'pd-busto', BUSTO_NPC, false, 'pd-busto');
  $('pd-nome').textContent = o.p.nome;
  $('pd-texto').textContent = p.texto;
  $('pd-fala').hidden = true;
  $('pd-unid').textContent = p.unidade || '';
  $('pd-teclado').hidden = $('pd-resp').hidden = false;
  $('pd-fechar').hidden = true;
  $('pd-depois').hidden = false;
  const pet = estado.pets?.ativo, leal = Number(pet && cuidadosDe(pet)?.lealdade) || 0;
  $('pd-dica').hidden = !pet || pd.dica || leal < (cfgPedidos().lealdade_dica ?? 80);
  if (pet) $('pd-dica').textContent = `💡 Pedir dica a ${nomePet(pet)}`;
  $('pd-pet').hidden = true;
  if (pd.dica && pet) mostrarDicaPedido();   // já pediu antes (fechou com "Depois"): a dica continua ali
  atualizarPremioPedido();
  atualizarMoedasPedido();
  renderNumPedido();
  $('pedido').hidden = false;
}

function atualizarPremioPedido() {
  const dia = diaPedidos();
  $('pd-premio').innerHTML = limiteDoDiaAtingido(dia)
    ? 'Hoje você já ganhou o máximo de moedas com pedidos: esta ajuda vale um "obrigado"!'
    : pd.tentativa === 1 ? `Acertando de primeira: +${moedasDoPedido(1, dia)} ${moedaHtml()} · na 2ª tentativa: +${moedasDoPedido(2, dia)} ${moedaHtml()}`
      : `Última tentativa: +${moedasDoPedido(2, dia)} ${moedaHtml()}`;
}
function atualizarMoedasPedido() { $('pd-moedas').querySelector('span').textContent = Number(estado.pets?.moedas) || 0; }
function renderNumPedido() {
  const el = $('pd-num');
  el.textContent = pd.num.replace('-', '−');
  el.classList.toggle('vazio', !pd.num || pd.num === '-');
}

function teclaPedido(k) {
  if (!pd) return;
  if (k === 'depois' || k === 'fechar') { fecharPedido(); return; }
  if (pd.fim) return;
  if (/^\d$/.test(k)) { const sem = pd.num.replace('-', ''); if (sem.length < 7) pd.num = (pd.num.startsWith('-') ? '-' : '') + (sem === '0' ? k : sem + k); }
  else if (k === '±') pd.num = pd.num.startsWith('-') ? pd.num.slice(1) : '-' + pd.num;
  else if (k === '⌫') pd.num = pd.num.slice(0, -1) === '-' ? '-' : pd.num.slice(0, -1);
  else if (k === 'ok') { responderPedido(); return; }
  tocar('clique');
  renderNumPedido();
}

// a pessoa fala no balão, embaixo do problema
function falaPedido(html, tipo = '') {
  const el = $('pd-fala');
  el.innerHTML = html;
  el.className = 'pd-fala ' + tipo;
  el.hidden = false;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}

function responderPedido() {
  const v = lerResposta(pd.num);
  if (v === null) { $('pd-resp').animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 240 }); return; }
  const { p } = pd, ok = v === p.resposta, agora = Date.now();
  const patch = { [`respostas/pedido-${agora}`]: { tipo: 'pedido', id: p.id, npc: p.npc, mapa: p.mapa, tentativa: pd.tentativa, resposta_aluno: v, acertou: ok, usou_dica: pd.dica, data: agora } };
  const max = cfgPedidos().tentativas ?? 2;
  const certa = `${mostrarInteiro(p.resposta)}${p.unidade ? ' ' + esc(p.unidade) : ''}`;
  if (ok) {
    const moedas = moedasDoPedido(pd.tentativa, diaPedidos());
    finalizarPedido('acertou', moedas, patch);
    missaoProgresso('ajudar');
    tocar('acerto');
    falaPedido(`Isso mesmo, <b class="verde">${certa}</b>! Você me salvou, valeu pela ajuda!${moedas ? ` <b class="ouro">+${moedas} ${moedaHtml()}</b>` : ''}`, 'ok');
    if (moedas) voarMoedasPedido(moedas);
  } else if (pd.tentativa < max) {
    pd.tentativa++;
    estado.pedidos[p.id] = { ...(estado.pedidos[p.id] || {}), tentativas: pd.tentativa - 1, dica: pd.dica };
    patch[`pedidos/${p.id}`] = estado.pedidos[p.id];
    gravar(patch);
    tocar('erro');
    falaPedido('Hmm, acho que não é isso… confere de novo?', 'erro');
    pd.num = '';
    renderNumPedido();
    atualizarPremioPedido();
  } else {
    finalizarPedido('errou', 0, patch);
    tocar('erro');
    falaPedido(`Olha, eu fiz assim: ${esc(p.resolucao)}<br>Resposta: <b class="verde">${certa}</b>. Valeu pela ajuda mesmo assim!`, 'resolucao');
  }
}
const mostrarInteiro = (n) => (n < 0 ? '−' + Math.abs(n) : String(n));

// Resolvido (certo ou não): não volta; a pessoa só traz o próximo amanhã
function finalizarPedido(fim, moedas, patch) {
  const { p } = pd, dia = diaPedidos();
  dia.pessoas[p.npc] = (Number(dia.pessoas[p.npc]) || 0) + 1;
  dia.moedas = (Number(dia.moedas) || 0) + moedas;
  estado.pedidos[p.id] = { fim, tentativas: pd.tentativa, dica: pd.dica, data: Date.now() };
  patch[`pedidos/${p.id}`] = estado.pedidos[p.id];
  patch.pedidos_dia = { ...dia, pessoas: { ...dia.pessoas } };
  if (moedas) { estado.pets.moedas = (Number(estado.pets.moedas) || 0) + moedas; patch['pets/moedas'] = estado.pets.moedas; registrarGanho('pedido', moedas, patch); }
  gravar(patch);
  pd.fim = true;
  $('pd-teclado').hidden = $('pd-dica').hidden = $('pd-depois').hidden = true;
  $('pd-resp').hidden = fim !== 'acertou';
  $('pd-fechar').hidden = false;
  atualizarIconesPessoas();
}

function pedirDicaPedido() {
  if (!pd || pd.dica || pd.fim) return;
  pd.dica = true;   // não muda o prêmio, mas fica registrado
  estado.pedidos[pd.p.id] = { ...(estado.pedidos[pd.p.id] || {}), dica: true };
  gravar({ [`pedidos/${pd.p.id}/dica`]: true });
  $('pd-dica').hidden = true;
  mostrarDicaPedido();
}
function mostrarDicaPedido() {
  const pet = estado.pets.ativo;
  $('pd-pet').innerHTML = `<span class="jr-icone-pet"><img src="${srcIcone(formaDe(pet))}" alt="" draggable="false" data-icone-pet/></span><span><b>${esc(nomePet(pet))}:</b> Acho que começa assim: ${esc(dicaPedido(pd.p))}</span>`;
  aplicarVisualPet($('pd-pet').querySelector('img'), pet);
  $('pd-pet').hidden = false;
}

// moedas voam do busto até o contador (posições dentro da caixa: funciona com o jogo girado)
function voarMoedasPedido(n) {
  const caixa = document.querySelector('.pd-caixa');
  const pos = (el) => { let x = 0, y = 0; for (let e = el; e && e !== caixa; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; } return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2 }; };
  const de = pos($('pd-busto')), para = pos($('pd-moedas'));
  const antes = (Number(estado.pets.moedas) || 0) - n;
  $('pd-moedas').querySelector('span').textContent = antes;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'pd-moeda-voa'; s.innerHTML = moedaHtml();
    s.style.left = de.x + 'px'; s.style.top = de.y + 'px';
    caixa.appendChild(s);
    const a = s.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }, { transform: `translate(calc(-50% + ${(para.x - de.x) * 0.4}px), calc(-50% + ${(para.y - de.y) * 0.4 - 50}px)) scale(1.2)`, opacity: 1, offset: 0.35 },
      { transform: `translate(calc(-50% + ${para.x - de.x}px), calc(-50% + ${para.y - de.y}px)) scale(.8)`, opacity: 1 }], { duration: 750, delay: i * 120, easing: 'ease-in', fill: 'backwards' });
    a.onfinish = () => {
      s.remove();
      const el = $('pd-moedas');
      el.querySelector('span').textContent = antes + i + 1;
      el.classList.remove('pulsa'); void el.offsetWidth; el.classList.add('pulsa');
    };
  }
}

function fecharPedido() {
  pd = null;
  $('pedido').hidden = true;
}

// ── Modo de ajuste (só a professora, no modo teste, com ?editarNpcs=1): arrastar e copiar posições ──
function ligarEdicaoPessoas() {
  for (const o of pessoasMapa) {
    o.img.classList.add('editavel');
    o.img.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      o.img.setPointerCapture(e.pointerId);
      const mover = (ev) => {
        const q = telaParaImagem(ev.clientX, ev.clientY);
        o.p.x = Math.round(clamp(q.x, 0, W)); o.p.y = Math.round(clamp(q.y + o.alt * 0.1, 0, H));
        posicionarPessoa(o);
        $('npc-editar-pos').textContent = `${o.p.nome}: x ${o.p.x}, y ${o.p.y}`;
      };
      const soltar = () => { o.img.removeEventListener('pointermove', mover); o.img.removeEventListener('pointerup', soltar); o.img.removeEventListener('pointercancel', soltar); };
      o.img.addEventListener('pointermove', mover);
      o.img.addEventListener('pointerup', soltar);
      o.img.addEventListener('pointercancel', soltar);
    });
  }
  const caixa = document.createElement('div');
  caixa.id = 'npc-editar';
  caixa.className = 'jr-npc-editar';
  caixa.innerHTML = `<span id="npc-editar-pos">Arraste as pessoas</span><button class="jr-btn" id="npc-copiar">📋 Copiar posições</button>`;
  $('tela-cena').appendChild(caixa);
  $('npc-copiar').addEventListener('click', async () => {
    const txt = JSON.stringify(NPCS.map(p => ({ id: p.id, x: p.x, y: p.y })), null, 1);
    try { await navigator.clipboard.writeText(txt); $('npc-editar-pos').textContent = 'Copiado! Cole no npcs.json.'; }
    catch (_) { console.log(txt); $('npc-editar-pos').textContent = 'Não deu para copiar: o JSON está no console (F12).'; }
  });
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
    if (festaPendente) { const f = festaPendente; festaPendente = null; setTimeout(() => mostrarFestaMestre(f), 700); }
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

// ── Arena do duelo (só apresentação): personagem + pet à esquerda, adversário à direita ──
let pgPet = null;   // PetParado do pet na arena
const NOME_DESAFIO = { treinador1: 'Treinador 1', treinador2: 'Treinador 2', treinador3: 'Treinador 3', lider: 'Líder', revanche: 'Revanche' };

// ── Ajuda do pet (só ao pedir): ≥ 60 dá 1 dica de conteúdo; ≥ 80 também elimina 1 alternativa errada ──
let timerFalaAjuda = 0;
function lealdadeAjuda() { return Number(cuidadosDe(pg?.petAjuda)?.lealdade) || 0; }

function atualizarBotaoAjuda() {
  const b = $('perg-ajuda');
  const pet = pg?.petAjuda;
  b.hidden = !pet || pg.fim;
  if (b.hidden) return;
  const cfg = configAjuda(), l = lealdadeAjuda();
  const trancado = l < (cfg.lealdade_dica ?? 80);
  const resta = !trancado && (pg.ajuda.dicas < (cfg.max_dicas_por_desafio ?? 1) ||
    (l >= (cfg.lealdade_eliminar ?? 95) && pg.ajuda.elimin < (cfg.max_eliminar_por_desafio ?? 1)));
  b.textContent = trancado ? '🔒 Pedir ajuda' : '💡 Pedir ajuda';
  b.classList.toggle('apagado', trancado || !resta);
}

function falaAjuda(texto) {
  const el = $('perg-pet-fala');
  el.textContent = texto;
  el.hidden = false;
  el.classList.remove('nova'); void el.offsetWidth; el.classList.add('nova');
  $('perg-fala').classList.add('quieto');   // o balão do adversário dá lugar ao do pet
  clearTimeout(timerFalaAjuda);
  timerFalaAjuda = setTimeout(fecharFalaAjuda, duracaoBalao(texto));
}
function fecharFalaAjuda() {
  clearTimeout(timerFalaAjuda);
  $('perg-pet-fala').hidden = true;
  $('perg-fala').classList.remove('quieto');
}

function pedirAjuda() {
  if (!pg || pg.fim || !pg.petAjuda) return;
  const pet = pg.petAjuda, nome = nomePet(pet);
  const cfg = configAjuda(), l = lealdadeAjuda();
  const v = { pet: nome, apelido: apelidoAluno || String(sessao.nome || '').split(' ')[0] };
  if (l < (cfg.lealdade_dica ?? 80)) { falaAjuda(`Com ${cfg.lealdade_dica ?? 80} de lealdade, ${nome} pode te dar dicas`); return; }
  const q = pg.fila[0];
  const respondendo = q && !pg.travado && !$('perg-alternativas').hidden;
  const podeEliminar = l >= (cfg.lealdade_eliminar ?? 95) && pg.ajuda.elimin < (cfg.max_eliminar_por_desafio ?? 1);
  if (pg.ajuda.dicas < (cfg.max_dicas_por_desafio ?? 1)) {
    // dica de conteúdo: abertura da personalidade + um lembrete do ginásio
    const lembretes = dicaDe(pg.chave)?.lembretes || [];
    const lembrete = lembretes.length ? sortear(lembretes) : (q?.dica || '');
    const abre = fraseDe(pet, 'ajuda_dica', v) || '';
    falaAjuda(`${abre} ${lembrete}`.trim());
    pg.ajuda.dicas++;
    if (q) registrarAjuda(q, 'dica');
  } else if (podeEliminar && respondendo) {
    // eliminar: só com 3+ alternativas na tela e sem tabela; nunca a certa
    const visiveis = [...$('perg-alternativas').querySelectorAll('.jr-alt')].filter(b => !b.hidden && !b.disabled);
    const erradas = visiveis.filter(b => b.dataset.v !== String(q.resposta));
    if (q.tabela || visiveis.length <= 2 || !erradas.length) { avisoPet('Nesta pergunta não dá para eliminar alternativas. Tente pedir na próxima!'); return; }
    const alvo = sortear(erradas);
    alvo.disabled = true;
    alvo.classList.add('eliminada');
    falaAjuda(fraseDe(pet, 'ajuda_elimina', { ...v, valor: alvo.dataset.v }) || `Acho que ${alvo.dataset.v} não é.`);
    pg.ajuda.elimin++;
    registrarAjuda(q, 'eliminou');
  } else if (podeEliminar) {
    return;   // entre perguntas (explicação na tela): guarda a eliminação para a próxima
  } else {
    falaAjuda(fraseDe(pet, 'ajuda_acabou', v) || '…');
    atualizarBotaoAjuda();
    return;
  }
  pgPet?.tocar('feliz');
  tocar('clique');
  atualizarBotaoAjuda();
}

// A professora vê em respostas/{id}/ajuda se a pergunta teve ajuda ("eliminou" vale mais que "dica")
function registrarAjuda(q, tipo) {
  if (pg.ajudaEm?.[q.id] === 'eliminou') return;
  (pg.ajudaEm ||= {})[q.id] = tipo;
  gravar({ [`respostas/${q.id}/ajuda`]: tipo });
}

function montarArena() {
  const rev = pg.modo === 'revisao';
  pg.status = {};   // posição da pergunta → 'certa' (de primeira) | 'errada'
  $('perg-caixa').classList.toggle('revisao', rev);
  $('perg-jog').src = urlQuadro('direita', -1);   // no duelo, de pé virado para o adversário
  const pet = petsOk && petValido(estado?.pets?.ativo) ? estado.pets.ativo : null;
  $('perg-pet').hidden = !pet;
  document.querySelector('.jr-arena-sombra.pet').hidden = !pet;
  pgPet = null;
  const forma = pet && formaDe(pet);
  $('perg-pet').style.setProperty('--forma', fatorForma(pet, forma));   // adulto: imagem maior (quadro com asas)
  if (pet) { pgPet = new PetParado($('perg-pet')); pgPet.definir(forma); }
  aplicarVisualPet($('perg-pet'), pet, true);   // o pet do duelo tem drop-shadow no CSS
  // ajuda do pet: só nos ginásios (não na revisão da semana); contadores zeram a cada desafio
  pg.petAjuda = !rev && pet && cuidadosDe(pet) ? pet : null;
  pg.ajuda = { dicas: 0, elimin: 0 };
  fecharFalaAjuda();
  atualizarBotaoAjuda();
  if (!rev) $('perg-adv').src = `${IMG}/personagens/${pg.pers.sprite}.webp`;
  $('perg-adv-nome').textContent = rev ? 'Revisão da semana' : `${NOME_DESAFIO[pg.p] || ''} · ${D.questoes[pg.mapa].ginasios[pg.G].nome}`;
}

const posDe = (q) => q.pos ?? q.indice;

// Uma bolinha por pergunta: verde (de primeira), vermelha (errou), dourada (atual), apagada (não feita)
function desenharBolinhas() {
  if (!pg) return;
  const atual = pg.fim ? null : pg.fila[0] && posDe(pg.fila[0]);
  $('perg-bolinhas').innerHTML = Array.from({ length: pg.total }, (_, i) =>
    `<span class="jr-bolinha${pg.status[i] ? ' ' + pg.status[i] : ''}${i === atual ? ' atual' : ''}"></span>`).join('');
}

// Acerto: pet feliz e adversário treme; erro: pet confuso (quem não tem `confuso`: triste) uma vez
// Acertou: o personagem troca para comemorando.webp (~1,2 s, com pulinho) e volta. Sem a imagem: pulinho + ✨ no quadro atual.
const semComemorando = new Set();
const urlComemorando = (id = meuPersonagem()) => `${PERS.pasta}/${id}/comemorando.webp`;
function comemorarJogador() {
  const img = $('perg-jog');
  if (!img || $('pergunta').hidden) return;
  const id = meuPersonagem(), volta = img.getAttribute('src'), com = urlComemorando(id);
  clearTimeout(comemorarJogador.t);
  const pular = (brilho) => {
    if (!semMovimento()) img.animate([{ translate: '0 0' }, { translate: '0 -12%' }, { translate: '0 0' }, { translate: '0 -5%' }, { translate: '0 0' }], { duration: 750, easing: 'ease-out' });
    if (!brilho) return;
    const arena = $('perg-arena'), ra = arena.getBoundingClientRect(), ri = img.getBoundingClientRect();
    const k = ra.width / (arena.offsetWidth || ra.width);   // a tela pode estar girada/escalada
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('span');
      s.className = 'jr-faisca-jog'; s.textContent = '✨';
      const ang = (i / 5) * Math.PI * 2 + Math.random();
      s.style.left = ((ri.left - ra.left) / k + img.offsetWidth * (0.5 + 0.55 * Math.cos(ang))) + 'px';
      s.style.top = ((ri.top - ra.top) / k + img.offsetHeight * (0.42 + 0.4 * Math.sin(ang))) + 'px';
      s.style.animationDelay = (i * 0.08).toFixed(2) + 's';
      arena.appendChild(s);
      setTimeout(() => s.remove(), 1300);
    }
  };
  if (semComemorando.has(id) || !volta) { pular(true); return; }
  const t = new Image();
  t.onload = () => {
    if ($('pergunta').hidden) return;
    img.src = com; pular(false);
    comemorarJogador.t = setTimeout(() => { if (img.getAttribute('src') === com) img.src = volta; }, 1200);
  };
  t.onerror = () => { semComemorando.add(id); pular(true); };
  t.src = com;
}

function reagirArena(certo) {
  if (pgPet) {
    if (certo) pgPet.tocar(temAnim(pgPet.pet, 'animado') && Math.random() < 0.5 ? 'animado' : 'feliz');
    else if (temAnim(pgPet.pet, 'confuso')) pgPet.tocar('confuso');
    else { pgPet.tocar('triste_fome'); setTimeout(() => { if (pgPet?.anim === 'triste_fome') pgPet.tocar('sentado_girando'); }, 1400); }
  }
  if (certo && pg?.modo !== 'revisao' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $('perg-adv').animate([{ transform: 'translateX(-50%)' }, { transform: 'translateX(calc(-50% - 6px))' }, { transform: 'translateX(calc(-50% + 6px))' }, { transform: 'translateX(-50%)' }],
      { duration: 320, easing: 'ease-in-out' });
  }
}

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
  montarArena();
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
  $('perg-contador').hidden = true;   // o progresso aparece nas bolinhas da placa
  desenharBolinhas();
  $('perg-corpo').classList.remove('com-explica');
  $('perg-corpo').classList.toggle('com-tabela', !!q.tabela);
  $('perg-tabela').innerHTML = renderTabela(q.tabela);   // Mapa 13 B: tabela sorteada junto com a pergunta
  $('perg-calc').hidden = !calcLigada(q.mapa ?? pg.mapa, q.lado ?? pg.G);   // 🧮 só nos ginásios com "calculadora": true
  if ($('perg-calc').hidden) fecharCalc();   // na revisão, a pergunta seguinte pode ser de outro mapa
  $('perg-enunciado').textContent = q.enunciado;
  $('perg-enunciado').classList.toggle('longo', String(q.enunciado).length > 28);   // problemas: Inter, até 2 linhas
  $('perg-explica').hidden = true;
  $('perg-erro').hidden = true;
  setTimeout(() => { if (pg?.fila?.[0] === q) atualizarItensPergunta(); }, 0);   // 💡 Dica do pet, se tiver
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
  // curtas (até ~8 caracteres): todas numa fileira; longas: grade 2 × 2. Números em Orbitron.
  $('perg-alternativas').classList.toggle('curtas', alts.every(a => a.length <= 8));
  $('perg-alternativas').classList.toggle('numeros', alts.every(a => /^[-−+]?[\d.,/\s()]+$/.test(a)));
  $('perg-alternativas').style.setProperty('--n', alts.length);
  $('perg-alternativas').innerHTML = ordem.map(a =>
    `<button class="jr-alt" data-v="${esc(a)}">${esc(a)}</button>`).join('');
  $('perg-alternativas').hidden = false;
  $('perg-enunciado').hidden = false;
  $('perg-continuar').hidden = true;
  atualizarBotaoAjuda();
}

// Quadro "Como resolver" (só quando erra)
// ── Cartão do erro (PROMPT-45): no centro da tela, por cima da pergunta. Sua resposta × a certa, "Como resolver"
// em passos (a explicação quebrada nos ";" e "."), dica (só se não repetir os passos), 📖 Relembre e Continuar
// (só pelo botão, ativo depois de 1,5 s). Nas perguntas de coordenadas (mapa 12), uma mini-grade.
const FALAS_ERRO_CURTAS = ['Quase!', 'Não foi dessa vez.', 'Errou, mas tudo bem!'];
const ESPERA_CONTINUAR_MS = 1500;
const normTxt = (t) => String(t).toLowerCase().replace(/[^a-z0-9à-ú²³×÷+−=]/gi, '');

function passosDe(explicacao) {
  return String(explicacao || '').split(/;\s+|\.\s+|\.$/).map(t => t.trim()).filter(Boolean);
}

// posição da resposta no FIM do texto, como número/termo inteiro ("8" não vale dentro de "18" nem de "8,5"); -1 se não está lá
function posDaResposta(t, certa) {
  if (!certa) return -1;
  const lit = certa.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(?<![\\d,])' + lit + '(?!\\d|,\\d)', 'g');
  let i = -1, m;
  while ((m = re.exec(t))) i = m.index;
  return i >= 0 && /^[\s.!)]*$/.test(t.slice(i + certa.length)) ? i : -1;   // só vale no fim do passo (é o resultado)
}
// último passo: a resposta certa (ou, sem ela, o último número) em verde
function passoFinalHtml(t, certa) {
  const i = posDaResposta(t, certa);
  if (i >= 0) return esc(t.slice(0, i)) + `<b>${esc(certa)}</b>` + esc(t.slice(i + certa.length));
  const m = /^(.*?)([−-]?\d+(?:,\d+)?)(\D*)$/.exec(t);
  return m ? `${esc(m[1])}<b>${esc(m[2])}</b>${esc(m[3])}` : esc(t);
}

function mostrarCartaoErro(q, sua, certa, comOutrosNumeros) {
  const passos = passosDe(q.explicacao);
  const ultimo = passos[passos.length - 1] || '';
  if (posDaResposta(ultimo, certa) < 0) passos.push(`Resposta: ${certa}`);
  const naCalc = calcLigada(q.mapa ?? pg.mapa, q.lado ?? pg.G) ? passoCalculadora(q.enunciado) : '';
  if (naCalc) { if (/^Resposta: /.test(passos[passos.length - 1])) passos.splice(passos.length - 1, 0, naCalc); else passos.push(naCalc); }
  $('erro-enun').textContent = q.enunciado;
  $('erro-sua').textContent = sua;
  $('erro-certa').textContent = certa;
  $('erro-passos').innerHTML = passos.map((t, i) => `<li>${i === passos.length - 1 ? passoFinalHtml(t, certa) : esc(t)}</li>`).join('');
  // dica: só se não repetir o que já está nos passos
  const dica = String(q.dica || '').trim(), nd = normTxt(dica), np = normTxt(q.explicacao || '');
  const mostraDica = !!dica && !(np.includes(nd) || nd.includes(np) && np.length > 20);
  $('erro-dica').textContent = mostraDica ? `💡 ${dica}` : '';
  const rel = chaveGinasio(q.mapa ?? pg.mapa, q.lado ?? pg.G);   // na revisão da semana cada pergunta é de um ginásio
  $('erro-relembre').hidden = !explicacaoDe(rel);
  $('erro-relembre').dataset.relembre = rel;
  $('erro-linha-dica').hidden = !mostraDica && $('erro-relembre').hidden;
  $('erro-volta').textContent = `🔁 ${comOutrosNumeros ? 'Essa pergunta volta daqui a pouco, com outros números.' : 'Essa pergunta volta daqui a pouco.'}`;
  const grade = (q.mapa ?? pg.mapa) === 12 ? gradeDoErro(q.enunciado, sua, certa) : '';
  $('erro-grade').innerHTML = grade;
  $('erro-grade').hidden = !grade;
  const b = $('erro-continuar');
  b.disabled = true;
  $('perg-erro').hidden = false;
  const pgErro = pg;
  setTimeout(() => { if (pg === pgErro && !$('perg-erro').hidden) { b.disabled = false; b.focus({ preventScroll: true }); } }, ESPERA_CONTINUAR_MS);
}

// ── Calculadora 🧮 (PROMPT-57): nos ginásios com "calculadora": true no mapas.json (portas.A/B), na batalha com treinador
//    desses mapas e na revisão (pergunta que veio de lá). % como na calculadora de verdade: 80 × 15 % = 12; 80 + 10 % = 88;
//    80 − 10 % = 72; 80 ÷ 50 % = 160; 15 % sozinho = 0,15. Fechar e reabrir mantém o último número.
const calcLigada = (mapa, G) => { const pt = D.mapas?.mapas?.['mapa' + mapa]?.portas; return !!pt && (G ? !!pt[G]?.calculadora : Object.values(pt).some(x => x?.calculadora)); };
const calc = { a: null, op: null, cur: '0', conta: '', novo: true, fim: false };
const calcNum = (s) => Number(String(s).replace(',', '.'));
const calcFmt = (v) => { if (!Number.isFinite(v)) return 'Erro'; const r = Math.round(v * 1e8) / 1e8; return String(r).replace('.', ','); };
const calcOp = (a, op, b) => (op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b);
function calcTecla(k) {
  const c = calc;
  const recomeca = () => { if (c.fim) { c.a = null; c.op = null; c.conta = ''; c.fim = false; } };
  if (/^\d$/.test(k)) {
    if (c.novo || c.cur === 'Erro') { recomeca(); c.cur = k; c.novo = false; }
    else if (c.cur.replace(/\D/g, '').length < 12) c.cur = c.cur === '0' ? k : c.cur + k;
  } else if (k === ',') {
    if (c.novo || c.cur === 'Erro') { recomeca(); c.cur = '0,'; c.novo = false; } else if (!c.cur.includes(',')) c.cur += ',';
  } else if (k === 'C') Object.assign(c, { a: null, op: null, cur: '0', conta: '', novo: true, fim: false });
  else if (k === '⌫') { if (!c.novo && c.cur !== 'Erro') c.cur = c.cur.length > 1 ? c.cur.slice(0, -1) : '0'; }
  else if ('+−×÷'.includes(k)) {
    if (c.cur === 'Erro') return;
    if (c.op && !c.novo) { const r = calcOp(c.a, c.op, calcNum(c.cur)); c.cur = calcFmt(r); }
    c.a = calcNum(c.cur); c.op = k; c.novo = true; c.fim = false; c.conta = `${calcFmt(c.a)} ${k}`;
  } else if (k === '=') {
    if (!c.op || c.cur === 'Erro') return;
    const b = calcNum(c.cur), r = calcOp(c.a, c.op, b);
    c.conta = `${calcFmt(c.a)} ${c.op} ${calcFmt(b)} = ${calcFmt(r)}`; c.cur = calcFmt(r); c.a = null; c.op = null; c.novo = true; c.fim = true;
  } else if (k === '%') {
    if (c.cur === 'Erro') return;
    const b = calcNum(c.cur);
    const r = !c.op ? b / 100 : c.op === '×' ? c.a * b / 100 : c.op === '÷' ? c.a / (b / 100) : c.op === '+' ? c.a + c.a * b / 100 : c.a - c.a * b / 100;
    c.conta = c.op ? `${calcFmt(c.a)} ${c.op} ${calcFmt(b)} % = ${calcFmt(r)}` : `${calcFmt(b)} % = ${calcFmt(r)}`;
    c.cur = calcFmt(r); c.a = null; c.op = null; c.novo = true; c.fim = true;
  }
  desenharCalc();
}
function desenharCalc() {
  $('calc-conta').textContent = calc.fim ? calc.conta : calc.op ? `${calc.conta}${calc.novo ? '' : ' ' + calc.cur}` : '';
  $('calc-visor').textContent = calc.cur;
}
// aberta, a calculadora fica numa coluna à esquerda e a pergunta (ou o painel da batalha) chega para o lado: nada fica tapado
function abrirCalc() { desenharCalc(); $('calc').hidden = false; $('jr-app').classList.add('calc-aberta'); }
function fecharCalc() { $('calc').hidden = true; $('jr-app').classList.remove('calc-aberta'); }
// No cartão do erro das perguntas de porcentagem: o mesmo cálculo feito na calculadora
function passoCalculadora(enun) {
  const t = String(enun).replace(/R\$\s*/g, ''), f = (v) => calcFmt(v);
  let m = /(\d+) alunos, (\d+) faltaram/.exec(t);
  if (m) { const N = +m[1], k = +m[2]; return `Na calculadora: ${k} ÷ ${N} × 100 = ${f(k / N * 100)}`; }
  m = /(\d+)% em número decimal/.exec(t);
  if (m) return `Na calculadora: ${m[1]} ÷ 100 = ${f(m[1] / 100)}`;
  m = /(\d+)%/.exec(t);
  if (!m || /fração|por cento\?|significa|A conta/.test(t)) return '';
  const p = +m[1], n = /(\d+)/.exec(t.replace(m[0], ' '));
  if (!n) return '';
  const N = +n[1];
  if (/desconto/.test(t) && /preço final/.test(t)) return `Na calculadora: ${N} − ${p} % = ${f(N - N * p / 100)}`;
  if (/aumento/.test(t)) return `Na calculadora: ${N} + ${p} % = ${f(N + N * p / 100)}`;
  return `Na calculadora: ${N} × ${p} % = ${f(N * p / 100)}`;
}

function continuarDoErro() {
  if ($('erro-continuar').disabled) return;
  $('perg-erro').hidden = true;
  const f = pg?.aoContinuar;
  if (f) f();
}

// Mini plano cartesiano: ponto certo (verde), o marcado (vermelho) e a seta do caminho (de onde saiu até o certo)
const lerPonto = (t) => { const m = /\(\s*([−-]?\d+)\s*,\s*([−-]?\d+)\s*\)/.exec(String(t)); return m ? [m[1], m[2]].map(v => Number(v.replace('−', '-'))) : null; };
function gradeDoErro(enunciado, sua, certa) {
  let pc = lerPonto(certa), ps = lerPonto(sua);
  const pe = lerPonto(enunciado);
  const saida = /origem/i.test(enunciado) && /saindo/i.test(enunciado) ? [0, 0] : /saindo de/i.test(enunciado) ? pe : null;
  if (!pc && pe && !saida) pc = pe;   // "No ponto (x, y), qual é o valor de x?", "Em qual quadrante…": o ponto do enunciado
  if (!pc) return '';
  const pts = [pc, ps, saida].filter(Boolean);
  const R = Math.max(5, 1 + Math.max(...pts.flat().map(Math.abs)));   // −5 a 5, ou maior com uma casa de folga
  const S = 200, u = (S - 20) / (2 * R), X = (x) => 10 + (x + R) * u, Y = (y) => 10 + (R - y) * u;
  let linhas = '';
  for (let k = -R; k <= R; k++) {
    const eixo = k === 0;
    linhas += `<line x1="${X(k)}" y1="${Y(R)}" x2="${X(k)}" y2="${Y(-R)}" stroke="${eixo ? '#c9cde0' : 'rgba(255,255,255,.12)'}" stroke-width="${eixo ? 1.6 : 1}"/>` +
              `<line x1="${X(-R)}" y1="${Y(k)}" x2="${X(R)}" y2="${Y(k)}" stroke="${eixo ? '#c9cde0' : 'rgba(255,255,255,.12)'}" stroke-width="${eixo ? 1.6 : 1}"/>`;
  }
  // a seta para um pouco antes do ponto certo (a ponta não some embaixo da bolinha)
  const [ax, ay, bx, by] = saida ? [X(saida[0]), Y(saida[1]), X(pc[0]), Y(pc[1])] : [0, 0, 0, 0];
  const L = Math.hypot(bx - ax, by - ay), k = L ? Math.max(0, L - 9) / L : 0;
  const seta = saida && L > 0
    ? `<line x1="${ax}" y1="${ay}" x2="${ax + (bx - ax) * k}" y2="${ay + (by - ay) * k}" stroke="#00d4ff" stroke-width="2.4" marker-end="url(#jr-erro-seta)"/>` +
      `<circle cx="${X(saida[0])}" cy="${Y(saida[1])}" r="3.5" fill="#00d4ff"/>` : '';
  const ponto = (p, cor, r = 6) => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="${r}" fill="${cor}" stroke="#0d0f1a" stroke-width="1.5"/>`;
  return `<svg viewBox="0 0 ${S} ${S}" role="img" aria-label="Plano cartesiano com o ponto certo em verde">
    <defs><marker id="jr-erro-seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#00d4ff"/></marker></defs>
    ${linhas}<text x="${X(R) - 2}" y="${Y(0) - 4}" fill="#c9cde0" font-size="10" text-anchor="end">x</text><text x="${X(0) + 4}" y="${Y(R) + 10}" fill="#c9cde0" font-size="10">y</text>
    ${seta}${ps && (ps[0] !== pc[0] || ps[1] !== pc[1]) ? ponto(ps, '#ff5c7a') : ''}${ponto(pc, '#00e676', 7)}</svg>`;
}

const qtdItem = (id) => Number(estado?.pets?.itens?.[id]) || 0;
function gastarItem(id) {
  const n = qtdItem(id);
  if (n <= 0) return false;
  estado.pets.itens = { ...(estado.pets.itens || {}), [id]: n - 1 };
  gravar({ [`pets/itens/${id}`]: n - 1 || null });
  return true;
}
// botão "💡 Dica do pet (N)" na pergunta: só com 3+ alternativas e uma vez por pergunta
function atualizarItensPergunta() {
  const b = $('perg-usar-dica'), q = pg?.fila?.[0];
  const visiveis = [...$('perg-alternativas').querySelectorAll('.jr-alt')].filter(x => !x.hidden && !x.disabled);
  b.hidden = !q || pg.fim || pg.travado || qtdItem('dica_pet') <= 0 || pg.dicaItemEm === q.id || !!q.tabela || visiveis.length <= 2;
  if (!b.hidden) b.textContent = `💡 Dica do pet (${qtdItem('dica_pet')})`;
  $('perg-segunda').hidden = true;
}
function usarDicaPergunta() {
  const q = pg?.fila?.[0];
  if (!q || pg.travado || pg.dicaItemEm === q.id) return;
  const erradas = [...$('perg-alternativas').querySelectorAll('.jr-alt')].filter(b => !b.hidden && !b.disabled && b.dataset.v !== String(q.resposta));
  if (!erradas.length || !gastarItem('dica_pet')) return;
  const alvo = sortear(erradas);
  alvo.disabled = true;
  alvo.classList.add('eliminada');
  pg.dicaItemEm = q.id;
  gravar({ [`respostas/${q.id}/usou`]: 'dica_pet' });
  pgPet?.tocar('feliz');
  falaAjuda(`Acho que ${alvo.dataset.v} não é. 💡`);
  tocar('clique');
  atualizarItensPergunta();
}
// errou com Segunda chance na bolsa (1 por desafio): pergunta se quer tentar de novo antes de mostrar a resposta
function oferecerSegundaChance(btn, q, certa, botoes) {
  btn.classList.add('errada');
  $('perg-usar-dica').hidden = true;
  $('perg-segunda-txt').textContent = `Errou! Usar 🔁 Segunda chance (${qtdItem('segunda_chance')})?`;
  $('perg-segunda').hidden = false;
  pg.oferta = { btn, q, certa, botoes };
}
function responderSegundaChance(usar) {
  const o = pg?.oferta;
  if (!o) return;
  pg.oferta = null;
  $('perg-segunda').hidden = true;
  if (usar && gastarItem('segunda_chance')) {   // tenta de novo: o erro não conta
    pg.segundaUsada = true;
    o.btn.disabled = true;
    o.botoes.forEach(b => { if (b !== o.btn && !b.classList.contains('eliminada')) b.disabled = false; });
    gravar({ [`respostas/${o.q.id}/usou`]: 'segunda_chance' });
    pg.travado = false;
    tocar('clique');
    atualizarItensPergunta();
    return;
  }
  errarPergunta(o.btn, o.q, o.certa, o.botoes);
}

function responder(btn) {
  if (!pg || pg.travado || pg.fim) return;
  pg.travado = true;
  const q = pg.fila[0];
  const certa = String(q.resposta);
  const botoes = [...$('perg-alternativas').querySelectorAll('.jr-alt')];
  botoes.forEach(b => { b.disabled = true; });
  tocar('clique');
  $('perg-usar-dica').hidden = true;
  if (btn.dataset.v !== certa && !pg.segundaUsada && qtdItem('segunda_chance') > 0) { tocar('erro'); oferecerSegundaChance(btn, q, certa, botoes); return; }
  if (btn.dataset.v === certa) {
    btn.classList.add('certa');
    tocar('acerto');
    if (pg.modo !== 'revisao') missaoProgresso('acertar_ginasio');
    if ((Number(estado.respostas?.[q.id]?.erros) || 0) > 0) missaoProgresso('revisar_erro');   // já tinha errado esta pergunta
    const primeiroAcerto = !estado.respostas?.[q.id]?.acertou;   // moeda só na 1ª vez (antes de marcar acertou)
    const agora = Date.now();
    const patch = { [`respostas/${q.id}/acertou`]: true, [`respostas/${q.id}/ultima`]: agora };
    // revisão: acertou de primeira → sai da lista de revisão por 3 semanas
    if (pg.modo === 'revisao' && !pg.errouIds.has(q.id)) patch[`respostas/${q.id}/revisao_ok`] = agora;
    gravar(patch);
    lembrarResposta(q.id, { acertou: true, ultima: agora, ...(patch[`respostas/${q.id}/revisao_ok`] ? { revisao_ok: agora } : {}) });
    if (pg.status[posDe(q)] !== 'errada') pg.status[posDe(q)] = 'certa';
    reagirArena(true);
    comemorarJogador();
    pg.fila.shift();
    pg.acertos++;
    if (primeiroAcerto) ganharMoeda();
    falar(sortear(D.falas.acerto));
    setTimeout(() => { if (!pg) return; pg.fila.length ? renderPergunta() : vencer(); }, 1100);
  } else errarPergunta(btn, q, certa, botoes);
}

// Errou (sem Segunda chance): mostra a certa e a explicação; a pergunta volta para o fim da fila com outros números
function errarPergunta(btn, q, certa, botoes) {
  btn.classList.add('errada');
  tocar('erro');
  botoes.find(b => b.dataset.v === certa)?.classList.add('certa');
  // as outras alternativas somem para dar espaço ao "Como resolver"
  botoes.forEach(b => { if (b !== btn && b.dataset.v !== certa) b.hidden = true; });
  pg.errosPorIndice[chavePosicao(q)] = (pg.errosPorIndice[chavePosicao(q)] || 0) + 1;
  pg.errouIds.add(q.id);
  pg.status[posDe(q)] = 'errada';
  reagirArena(false);
  desenharBolinhas();
  gravar({ [`respostas/${q.id}/ultima`]: Date.now() }, q.id);   // erros += 1
  lembrarResposta(q.id, { ultima: Date.now() }, 1);
  // volta para o fim da fila com outros números (no Mapa 13 B, gerarUma dá null: repete a mesma)
  pg.fila.shift();
  const nova = pg.modo === 'revisao'
    ? gerarUma(q.mapa, q.lado, q.personagem, q.indice)
    : gerarUma(pg.mapa, pg.G, pg.p, q.indice);
  pg.fila.push(nova ? { ...nova, indice: q.indice, mapa: q.mapa, lado: q.lado, personagem: q.personagem, pos: q.pos } : q);
  falar(sortear(FALAS_ERRO_CURTAS));   // a resposta certa está no cartão: o balão do treinador fica curto
  pg.aoContinuar = renderPergunta;
  mostrarCartaoErro(q, btn.dataset.v, certa, !!nova);   // explicação da pergunta que o aluno ERROU, não da nova
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
  if (ganhou) moedasDaInsignia(ganhou);
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
  if (ganhou) { const f = verificarMestre(); if (f) festaPendente = f; }   // a 26ª insígnia (ou a 26ª dourada): festa depois da insígnia voar
  if (ganhou) publicarResumoInsignias();
  if (ganhou === 'normal') publicarNoFeed('insignia', chave);
  if (ganhou === 'dourada') publicarNoFeed('insignia_dourada', chave);
  // meta da turma: nunca no modo teste nem para alunos de teste (somarTurma também recusa TESTE e turma vazia)
  if (ganhou && !teste && carregouProgresso && sessao.turma && !ehProfessora() && !ALUNOS_TESTE.includes(sessao.uid)) {
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
  $('perg-contador').hidden = false;
  desenharBolinhas();
  $('perg-enunciado').hidden = true;
  $('perg-alternativas').hidden = true;
  $('perg-explica').hidden = true; $('perg-guiado').hidden = true; $('perg-corpo').classList.remove('guiado');
  $('perg-tabela').innerHTML = '';
  $('perg-desistir').hidden = true;
  $('perg-ajuda').hidden = true;
  $('perg-continuar').textContent = 'Continuar';
  $('perg-continuar').hidden = false;
  pg.aoContinuar = () => {
    fecharPergunta();
    if (ganhou) {
      mostrarInsigniaGanha(chave, ganhou === 'dourada');
      seguidor?.reagir('animado');
      const pa = estado.pets.ativo, fa = pa && formaDe(pa);
      if (fa && temAnim(fa, 'busto_fogo')) setTimeout(() => avisoPet(`🔥 ${nomePet(pa)} está orgulhoso da insígnia!`, true, quadrosDe(fa, 'busto_fogo')[0]), 2600);
    }
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
    $('perg-ajuda').hidden = true;
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
  fecharCalc(); $('perg-calc').hidden = true;
  $('perg-erro').hidden = true;
  pgPet = null;
  fecharFalaAjuda();
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
  $('cartao-relembre').hidden = !(g.insignia && explicacaoDe(chave));   // insígnia conquistada: revisar o conteúdo
  $('cartao-relembre').dataset.chave = chave;
  $('cartao').hidden = false;
}

// ============================================================
//  🤖 LABORATÓRIO DE ROBÓTICA e "PROGRAMA O PET" (PROMPT-50)
//  Laboratório: salão na praça (dados/jogo/laboratorio.json; área de andar = trilha-laboratorio.png). 4 computadores:
//  1 Programe o pet (25 fases em dados/jogo/programe-o-pet.json + desafio do dia), 2 Corrida (contra o fantasma do dia;
//  contra colega: ⚔️ na praça → Corrida), 3 e 4 "em breve". Tela e blocos: js/jogo-revisao/programe.js; regras:
//  programe-logica.js. Progresso do aluno em programe/fases/{id}: { estrelas, blocos, tentativas, tempo_s, xml, texto,
//  xml_atual, texto_atual, bateu, premio1, premio3 }. Ranking do dia, fantasma e corridas em jogo_revisao_praca/programe/.
//  Praça e Laboratório ficam sempre abertos (a liberação por etapas do PROMPT-34 ainda não existe no código).
// ============================================================
let PROG = null, LAB = null;
const PREMIO_PG = { estrela: 3, tres_estrelas: 5, lealdade: 1 };   // 1ª vez com ⭐ · 1ª vez com ⭐⭐⭐ · fase nova
const fasesPg = () => PROG?.fases || [];
const progFase = (id) => estado.programe?.fases?.[id] || null;
const faseResolvida = (id) => (Number(progFase(id)?.estrelas) || 0) > 0;
const faseLiberada = (i) => i === 0 || faseResolvida(fasesPg()[i - 1]?.id);
function capMaxLiberado() { let cap = 1; fasesPg().forEach((f, i) => { if (faseLiberada(i)) cap = Math.max(cap, f.cap); }); return cap; }
function blocosAteCap(cap) { const s = new Set(); for (const f of fasesPg()) if (f.cap <= cap) for (const b of f.blocos) s.add(b); return [...s]; }
const nomeCap = (cap) => PROG?.capitulos?.[cap]?.nome || `Capítulo ${cap}`;
// o que vai no desafio da praça para montar a corrida (capítulo liberado e o pet que aparece na tela do outro)
function dadosCorrida() {
  const p = petsOk && estado?.pets?.ativo;
  return { cap: PROG ? capMaxLiberado() : 1, pet: p || null, forma: p ? formaDe(p) : null, tinta: (p && cuidadosDe(p)?.tinta) || null };
}

async function abrirLaboratorio() {
  if (!LAB) return;
  sairPesca(false);
  cena = null;
  esconderBalao();
  fecharCartaoColega();
  $('btn-revanche').hidden = true;
  $('cena-aviso').hidden = true;
  $('cena-atores').innerHTML = '';
  $('cena-titulo').textContent = '🤖 Laboratório de Robótica';
  $('btn-cena-voltar').textContent = '⟵ Praça';
  $('btn-cena-voltar').hidden = false;
  $('tela-cena').classList.remove('jr-no-ginasio');
  mostrarTela('tela-cena');
  $('cena-palco').style.visibility = 'hidden';
  limparPessoas();
  sairDoMapaOnline();
  enviarOnline({ mapa: 'praca', local: 'laboratorio' });   // aqui dentro os colegas da praça não veem você
  const [grade] = await Promise.all([
    LAB.trilha ? carregarGrade(LAB.trilha).catch(() => gradeDeRetangulos(LAB.area_livre)) : Promise.resolve(gradeDeRetangulos(LAB.area_livre)),
    trocarFundo(`${IMG}/interiores/${LAB.imagem || 'laboratorio.webp'}`)]);
  const naTrilha = (x, y) => centroCelula(celulaMaisProxima(grade, x, y));
  const [px, py] = LAB.porta;
  cena = { tipo: 'mapa', n: 'laboratorio', salao: true, alturaPersonagem: LAB.altura_personagem, cfg: { entrada: LAB.entrada, saidas: [LAB.porta] }, grade, portas: {}, naTrilha,
    saidas: [{ x: px, y: py, trilha: naTrilha(px, py) }] };
  cena.computadores = (LAB.computadores || []).map(c => ({ ...c, trilha: naTrilha(...(c.ponto || [c.x, c.y + 100])) }));
  $('cena-atores').insertAdjacentHTML('beforeend', cena.computadores.map(c =>
    `<div class="jr-rotulo-porta jr-rotulo-praca" style="left:${c.x}px;top:${c.y - 60}px"><span>${c.em_breve ? '🔜' : '💻'} ${esc(c.nome)}</span></div>`).join(''));
  destinoEspecial = null;
  alvoMapa = null;
  pertoSaidaGin = false;
  montarPessoas('laboratorio');   // a Lia cientista (id lia_cientista; a pintora do mapa 8 é a lia), em laboratorio.json → lia
  posicionarJogador(LAB.entrada[0], LAB.entrada[1], 'costas');
  soltouDesdeTroca = false;
  ajustarCamera();
  $('cena-palco').style.visibility = '';
  $('btn-colegas').hidden = $('btn-reacao').hidden = true;
  atualizarBotaoPet();
}

// Painel do computador (a mesma janela das máquinas do fliperama)
function abrirComputador(id) {
  const c = (LAB?.computadores || []).find(x => x.id === id);
  if (!c) return;
  $('mq-nome').textContent = `💻 ${c.nome}`;
  $('mq-botoes').innerHTML = '';
  if (c.em_breve || !PROG) {
    $('mq-corpo').innerHTML = '<p class="mq-rec">Chegando logo! 🤖</p><p class="mq-sub">Este computador ainda está sendo montado.</p>';
  } else if (id === 'corrida') {
    $('mq-corpo').innerHTML = `<p class="mq-rec">🏁 Corrida de programação</p>
      <p class="mq-sub">Monte o programa em até 60 s. Os dois pets saem juntos: ganha quem chegar primeiro na comida (bater numa pedra custa 2 s).</p>
      <p class="mq-nota">Para correr contra um colega: na Praça, toque nele → ⚔️ → 🤖 Corrida. Sem ninguém por perto, corra contra o 👻 fantasma: o melhor programa de hoje da sua turma.</p>`;
    $('mq-botoes').innerHTML = '<button class="jr-btn jr-btn-ouro" data-pg-fantasma>👻 Correr contra o fantasma</button>';
  } else {
    const caps = [...new Set(fasesPg().map(f => f.cap))];
    $('mq-corpo').innerHTML = `<div class="pg-caps">${caps.map(cap => `<div class="pg-cap"><b>Capítulo ${cap} · ${esc(nomeCap(cap))}</b><div class="pg-fases">${
      fasesPg().map((f, i) => [f, i]).filter(([f]) => f.cap === cap).map(([f, i]) => {
        const est = Number(progFase(f.id)?.estrelas) || 0, lib = faseLiberada(i);
        return `<button class="pg-fase${est ? ' feita' : ''}" data-pg-fase="${f.id}"${lib ? '' : ' disabled'} title="${esc(f.nome)}">${lib ? f.id : '🔒'}<small>${est ? '⭐'.repeat(est) + '☆'.repeat(3 - est) : lib ? 'nova' : ''}</small></button>`;
      }).join('')}</div></div>`).join('')}</div>`;
    $('mq-botoes').innerHTML = '<button class="jr-btn jr-btn-ouro" data-pg-dia>📅 Desafio do dia</button>';
  }
  $('maquina').hidden = false;
}

// Cartão do capítulo novo (uma vez): o que o bloco novo faz
function cartaoCapitulo(cap) {
  const c = PROG?.capitulos?.[cap];
  if (!c || estado.programe.caps_vistos?.[cap]) return;
  estado.programe.caps_vistos = { ...(estado.programe.caps_vistos || {}), [cap]: true };
  gravar({ [`programe/caps_vistos/${cap}`]: true });
  $('pg-cartao-tit').textContent = `Capítulo ${cap} · ${c.nome}`;
  $('pg-cartao-txt').textContent = c.texto;
  $('pg-cartao').hidden = false;
}

async function abrirFasePrograme(id) {
  const i = fasesPg().findIndex(f => f.id === id), f = fasesPg()[i];
  if (!f || !faseLiberada(i)) return;
  const pf = progFase(id) || {}, base = `programe/fases/${id}`;
  const ok = await abrirTelaPrograme({
    modo: 'fase', fase: f, meta: f.meta_blocos, xml: pf.xml_atual || pf.xml || '', tutorial: f.id === 1 && !estado.programe.tutorial_visto,   // mãozinha ensinando
    titulo: `Fase ${f.id} · ${f.nome}`, sub: `Capítulo ${f.cap} · ${nomeCap(f.cap)}${f.dica ? ' · 💡 ' + f.dica : ''}`,
    aoExecutar: (r) => {
      const p = (estado.programe.fases[id] ||= {});
      p.tentativas = (Number(p.tentativas) || 0) + 1;
      gravar({ [`${base}/tentativas`]: p.tentativas, [`${base}/xml_atual`]: r.xml, [`${base}/texto_atual`]: r.texto, [`${base}/ultima`]: Date.now() });
    },
    aoBater: (b) => { (estado.programe.fases[id] ||= {}).bateu = { bloco: b.bloco, x: b.x, y: b.y }; gravar({ [`${base}/bateu`]: { bloco: b.bloco, x: b.x, y: b.y } }); },
    aoVencer: (r) => venceuFase(f, r),
    aoFechar: () => abrirComputador('programe_o_pet'),
  });
  if (ok) cartaoCapitulo(f.cap);
}

function venceuFase(f, r) {
  const p = (estado.programe.fases[f.id] ||= {}), base = `programe/fases/${f.id}`, patch = {}, ps = estado.pets;
  const nova = !(Number(p.estrelas) > 0);
  if (nova || r.estrelas > p.estrelas || (r.estrelas === p.estrelas && r.blocos < p.blocos)) {
    Object.assign(p, { estrelas: r.estrelas, blocos: r.blocos, xml: r.xml, texto: r.texto, tempo_s: r.tempo_s, data: Date.now() });
    for (const k of ['estrelas', 'blocos', 'xml', 'texto', 'tempo_s', 'data']) patch[`${base}/${k}`] = p[k];
  }
  if (f.id === 1 && !estado.programe.tutorial_visto) { estado.programe.tutorial_visto = true; patch['programe/tutorial_visto'] = true; }   // a mãozinha não volta mais
  let moedas = 0;
  if (!p.premio1) { p.premio1 = true; patch[`${base}/premio1`] = true; moedas += PROG.premios?.estrela ?? PREMIO_PG.estrela; }
  if (r.estrelas === 3 && !p.premio3) { p.premio3 = true; patch[`${base}/premio3`] = true; moedas += PROG.premios?.tres_estrelas ?? PREMIO_PG.tres_estrelas; }
  if (moedas) { ps.moedas = (Number(ps.moedas) || 0) + moedas; patch['pets/moedas'] = ps.moedas; registrarGanho('programe', moedas, patch); }
  if (nova && ps.ativo && cuidadosDe(ps.ativo)) ganharLealdade(ps.ativo, PROG.premios?.lealdade ?? PREMIO_PG.lealdade, patch);
  gravar(patch);
  publicarResumoPrograme();
  cartaoVitoriaFase(f, r, moedas, nova);
}

// 🎉 Cartão de vitória: pet comemorando, estrelas, blocos, moedas e "Próxima fase ▶". Os avisos do pet vêm depois do cartão.
async function cartaoVitoriaFase(f, r, moedas, nova) {
  const prox = fasesPg()[fasesPg().findIndex(x => x.id === f.id) + 1];
  const botoes = [];
  if (prox) botoes.push({ id: 'proxima', texto: 'Próxima fase ▶', classe: 'jr-btn-ouro' });
  if (r.estrelas < 3) botoes.push({ id: 'tentar', texto: '↺ Menos blocos', classe: 'jr-btn-sec' });
  botoes.push({ id: 'fases', texto: '☰ Fases', classe: 'jr-btn-sec' });
  const op = await cartaoPrograme({
    titulo: `🎉 Fase ${f.id} concluída!`, estrelas: r.estrelas, botoes,
    info: `<div>${r.blocos} blocos${moedas ? ` · <b>+${moedas} ${moedaHtml()}</b>` : ''}</div>` +
      (r.estrelas < 3 ? `<div class="dica">Dá para fazer com ${f.meta_blocos} blocos ou menos!</div>` : '') +
      (prox ? '' : '<div><b>🏆 Você terminou todas as fases!</b></div>'),
  });
  if (moedas) avisoPet(`🤖 Fase ${f.id}: ${'⭐'.repeat(r.estrelas)} +${moedas} 🪙`, true);
  if (nova && prox && prox.cap !== f.cap) avisoPet(`🔓 Capítulo ${prox.cap} liberado: ${nomeCap(prox.cap)}!`, true);
  if (op === 'proxima' && prox) abrirFasePrograme(prox.id);   // direto, sem passar pela lista (capítulo novo: o cartão do capítulo aparece)
  else if (op === 'fases') fecharTelaPrograme();             // volta para a lista (aoFechar abre o computador)
}

// Resumo para os recordes da Lia: total de estrelas e de fases resolvidas
function publicarResumoPrograme() {
  if (!entraNoRanking() && !teste) return;
  const fs = Object.values(estado.programe.fases || {}).filter(p => Number(p?.estrelas) > 0);
  set(ref(db, `${basePraca()}/programe/resumo/${sessao.uid}`), { estrelas: fs.reduce((t, p) => t + Number(p.estrelas), 0), fases: fs.length,
    nome: nomeRanking(), turma: sessao.turma || '', pers: meuPersonagem(), ts: Date.now() }).catch(e => console.warn('[jogo-revisao] resumo do Programe o pet', e?.code || e));
  delete mural.cache.programe_estrelas;
}

// 🏆 Recordes (botão do balão da Lia): top 3 do Programe o pet (estrelas), da Corrida (vitórias na semana) e do Desafio do dia
async function mostrarRecordesLab() {
  $('maquina').hidden = false;
  $('mq-nome').textContent = '🏆 Recordes do laboratório';
  $('mq-botoes').innerHTML = '';
  $('mq-corpo').innerHTML = '<p class="mq-car">Carregando…</p>';
  const daTurma = (lista) => (TURMAS_PLACAR.includes(sessao.turma) ? ordenarRanking(lista.filter(r => r.turma === sessao.turma)) : lista).slice(0, 3);
  const grupos = [['🤖 Programe o pet', 'programe_estrelas'], ['🏁 Corridas da semana', 'corridas'], ['📅 Desafio de hoje', 'programe']];
  const tops = await Promise.all(grupos.map(([, aba]) => dadosMural(aba).then(daTurma).catch(() => [])));
  if ($('maquina').hidden) return;
  $('mq-corpo').innerHTML = `<p class="mq-sub">${TURMAS_PLACAR.includes(sessao.turma) ? `Top 3 da ${esc(sessao.turma)}` : 'Top 3 da escola'}</p><div class="mq-recordes">${grupos.map(([nome], i) =>
    `<div><b>${nome}</b><ol>${tops[i].map(r => `<li>${['🥇', '🥈', '🥉'][r.pos - 1] || ''} ${esc(r.nome)} <em>${esc(r.rotulo)}</em></li>`).join('') || '<li class="mq-vazio">—</li>'}</ol></div>`).join('')}</div>`;
}

// ❓ Como funciona (botão do balão da Lia)
function mostrarComoFunciona() {
  $('maquina').hidden = false;
  $('mq-nome').textContent = '❓ Como funciona';
  $('mq-botoes').innerHTML = '';
  $('mq-corpo').innerHTML = `<div class="mq-como">
    <p><b>🧩 Blocos:</b> arraste os blocos e encaixe embaixo de <b>🏁 quando executar</b>. Aperte <b>▶ Executar</b> e o pet faz um bloco de cada vez — o bloco que está rodando fica destacado.</p>
    <p><b>⭐ Estrelas:</b> chegar na comida (pegando todos os petiscos) vale ⭐. Com poucos blocos, ⭐⭐; com a meta da fase ou menos, ⭐⭐⭐. 🔁 Repita e ⭐ F1 economizam blocos!</p>
    <p><b>🏁 Corrida:</b> você e um colega (ou o 👻 fantasma) montam o programa em até 60 s. Os pets saem juntos: ganha quem chegar primeiro na comida. Bater numa pedra custa 2 s.</p>
    <p><b>📅 Desafio do dia:</b> a mesma fase para a escola toda. No Mural, ganha quem usar menos blocos.</p></div>`;
}

// ── 📅 Desafio do dia: a mesma fase para todos (semente = data), com os blocos dos capítulos que o aluno já liberou ──
async function abrirDesafioDia() {
  const hoje = diaLocal(), cap = Math.max(2, capMaxLiberado()), blocos = blocosAteCap(cap);
  const f = faseDoDia(hoje, blocos, cap >= 3);
  const melhor = estado.programe.dia?.data === hoje ? estado.programe.dia : null;
  await abrirTelaPrograme({
    modo: 'dia', fase: f, titulo: '📅 Desafio do dia', xml: melhor?.xml || '',
    sub: melhor ? `Seu melhor hoje: ${melhor.blocos} blocos em ${melhor.tempo_s} s` : 'Ranking no Mural: menos blocos; empate, menos tempo para montar',
    aoVencer: (r) => venceuDia(hoje, r),
    aoFechar: () => abrirComputador('programe_o_pet'),
  });
}
function venceuDia(hoje, r) {
  const ant = estado.programe.dia?.data === hoje ? estado.programe.dia : null;
  const melhor = !ant || r.blocos < ant.blocos || (r.blocos === ant.blocos && r.tempo_s < ant.tempo_s);
  cartaoPrograme({
    titulo: `📅 Desafio do dia: ${r.blocos} blocos em ${r.tempo_s} s`,
    info: melhor ? '<div><b>É o seu melhor de hoje!</b> Veja o ranking no Mural.</div>' : `<div>Seu melhor hoje continua: <b>${ant.blocos} blocos</b> em ${ant.tempo_s} s.</div>`,
    botoes: [{ id: 'tentar', texto: '↺ Tentar de novo', classe: 'jr-btn-ouro' }, { id: 'sair', texto: 'Sair', classe: 'jr-btn-sec' }],
  }).then(op => { if (op === 'sair') fecharTelaPrograme(); });
  if (!melhor) return;
  estado.programe.dia = { data: hoje, blocos: r.blocos, tempo_s: r.tempo_s, xml: r.xml };
  gravar({ 'programe/dia': estado.programe.dia });
  if (!entraNoRanking() && !teste) return;
  set(ref(db, `${basePraca()}/programe/dia/${hoje}/${sessao.uid}`), { blocos: r.blocos, tempo_s: r.tempo_s, nome: nomeRanking(), turma: sessao.turma || '', pers: meuPersonagem(), ts: Date.now() })
    .catch(e => console.warn('[jogo-revisao] ranking do Programe o pet', e?.code || e));
  delete mural.cache.programe;
}

// ── 👻 Corrida contra o fantasma: o melhor programa de hoje da turma, no mapa do dia ──
const caminhoFantasma = (hoje) => `${basePraca()}/programe/fantasma/${hoje}/${(sessao.turma || 'escola').replace(/[.#$\[\]\/]/g, '_')}`;
async function abrirFantasma() {
  const hoje = diaLocal(), cap = capMaxLiberado(), f = faseDaCorrida(hoje, blocosAteCap(cap), cap >= 3);
  let g = null;
  try { const s = await get(ref(db, caminhoFantasma(hoje))); g = s.exists() ? s.val() : null; } catch (e) { console.warn('[jogo-revisao] fantasma', e?.code || e); }
  const fim = agoraServ() + 60000;
  await abrirTelaPrograme({
    modo: 'fantasma', fase: f, lado: 'a', fimEm: () => fim,
    titulo: '👻 Corrida contra o fantasma',
    sub: g ? `Fantasma de hoje: ${nomeVisivel(g.nome) || 'Colega'} (${g.chegou} passos)` : 'Ninguém correu hoje: o fantasma está parado. Seja o primeiro!',
    rival: { nome: g ? `👻 ${nomeVisivel(g.nome) || 'Colega'}` : '👻', pet: g?.pet || null, forma: g?.forma || g?.pet || null, tinta: null },
    aoPronto: (prog) => correrFantasma(hoje, f, prog, g),
    aoFechar: () => abrirComputador('corrida'),
  });
}
async function correrFantasma(hoje, f, prog, g) {
  const res = resultadoCorrida(f, prog, g ? programaDeTexto(g.prog) : { corpo: [] }, { espelharB: true });   // o fantasma corre do outro lado (espelhado)
  await mostrarCorrida(res.eventosA, res.eventosB);
  const meu = res.a.chegou;
  if (res.vencedor === 'a') mensagemCorrida(meu != null ? `🏆 Você venceu o fantasma! Chegou em ${meu} passos.` : '🏆 Você terminou mais perto da comida!', 'ok');
  else if (res.vencedor === 'b') mensagemCorrida(`👻 O fantasma venceu desta vez${meu != null ? ` (você chegou em ${meu} passos)` : ''}. Tente de novo!`, 'erro');
  else mensagemCorrida('🤝 Empate com o fantasma!', 'aviso');
  let virouFantasma = false;
  // ranking semanal: uma vitória contra o fantasma por dia conta
  if (res.vencedor === 'a' && g && estado.programe.fantasma_dia !== hoje) {
    estado.programe.fantasma_dia = hoje;
    gravar({ 'programe/fantasma_dia': hoje });
    contarVitoriaCorrida();
  }
  // virou o novo fantasma da turma (só se chegou e foi melhor)
  if (meu != null && (!g || meu < Number(g.chegou)) && (entraNoRanking() || teste)) {
    const novo = { prog: programaParaTexto(prog), chegou: meu, nome: nomeRanking(), uid: sessao.uid, ...dadosCorrida(), ts: Date.now() };
    try {
      const t = await runTransaction(ref(db, caminhoFantasma(hoje)), (cur) => (!cur || meu < Number(cur.chegou) ? novo : undefined));
      virouFantasma = t.committed;
    } catch (e) { console.warn('[jogo-revisao] fantasma', e?.code || e); }
  }
  // cartão do resultado: venceu (pet comemorando), perdeu (pet triste) ou empate; passos de cada um
  const passos = (lado) => (lado.chegou != null ? `${lado.chegou} passos` : `não chegou (faltaram ${lado.dist} casas)`);
  const op = await cartaoPrograme({
    titulo: res.vencedor === 'a' ? '🏆 Você venceu o fantasma!' : res.vencedor === 'b' ? '👻 O fantasma venceu desta vez' : '🤝 Empate!',
    anims: res.vencedor === 'b' ? ['triste_fome'] : res.vencedor === 'a' ? null : ['feliz'], confete: res.vencedor === 'a',
    info: `<div>Você: <b>${passos(res.a)}</b> · Fantasma: <b>${g ? passos(res.b) : 'parado'}</b></div>` + (virouFantasma ? '<div>👻 Agora você é o fantasma de hoje da turma!</div>' : ''),
    botoes: [{ id: 'de_novo', texto: '🏁 Correr de novo', classe: 'jr-btn-ouro' }, { id: 'sair', texto: 'Sair', classe: 'jr-btn-sec' }],
  });
  if (op === 'de_novo') abrirFantasma();
  else if (op === 'sair') fecharTelaPrograme();
}
function contarVitoriaCorrida() {
  if (!entraNoRanking() && !teste) return;
  update(ref(db, `${basePraca()}/programe/corridas/${semanaPesca()}/${sessao.uid}`), { vitorias: increment(1), nome: nomeRanking(), turma: sessao.turma || '', pers: meuPersonagem(), ts: Date.now() })
    .catch(e => console.warn('[jogo-revisao] ranking de corridas', e?.code || e));
  delete mural.cache.corridas;
}

// ── 🏁 Corrida contra um colega (o desafio da praça com modo: 'corrida') ──
// Quem desafiou (A) sorteia o mapa (semente = id do desafio) e marca o início pelo relógio do servidor. Cada um monta em até
// 60 s e envia o programa (prog/{uid}); A calcula o resultado (o mesmo cálculo nos dois aparelhos) e grava o fim.
const TEMPO_CORRIDA_MS = 60000;
function comecarCorrida(d) {
  const du = duelo;
  $('dl-conta').textContent = '🏁 Corrida de programação';
  avisoPet(`🤖 Corrida contra ${nomeCurto(du.outro.uid, du.outro.nome)}! Prepare-se…`);
  if (du.souA && d.estado === 'aceito') {
    const cap = Math.max(1, Math.min(Number(d.a.cap) || 1, Number(d.b.cap) || 1));
    du.timers.push(setTimeout(() => {
      if (duelo !== du || du.d?.fim) return;
      update(du.ref, { estado: 'jogando', semente: du.id, blocos: blocosAteCap(cap), diagonal: cap >= 3, inicio: serverTimestamp() }).catch(() => {});
    }, 2500));
  }
}
const faseDoDuelo = (d) => faseDaCorrida(d.semente, d.blocos || ['andar', 'virar_dir', 'virar_esq'], !!d.diagonal);
function atualizarCorrida(d) {
  const du = duelo;
  if (d.fim) { fimCorrida(d); return; }
  vigiarWO(d);
  if (typeof d.inicio === 'number' && !du.telaCorrida) {
    du.telaCorrida = true;
    const o = du.outro;
    abrirTelaPrograme({
      modo: 'corrida', fase: faseDoDuelo(d), lado: du.souA ? 'a' : 'b', fimEm: () => d.inicio + TEMPO_CORRIDA_MS,
      titulo: `🏁 Corrida contra ${nomeCurto(o.uid, o.nome)}`, sub: 'Monte o programa: ganha quem chegar primeiro na comida. Bater numa pedra custa 2 s.',
      rival: { nome: prefixoTitulo(o.uid) + nomeCurto(o.uid, o.nome), pet: o.pet || null, forma: o.forma || o.pet || null, tinta: o.tinta || null },
      aoPronto: (prog) => enviarProgramaCorrida(prog),
      aoFechar: () => { if (duelo === du && !du.enviou) enviarProgramaCorrida({ corpo: [] }); },   // saiu: desiste com o programa vazio
    });
  }
  if (du.souA) conduzirCorrida(d);
}
function enviarProgramaCorrida(prog) {
  const du = duelo;
  if (!du || du.enviou) return;
  du.enviou = true;
  set(ref(db, `${basePraca()}/duelos/${du.id}/prog/${sessao.uid}`), { p: programaParaTexto(prog), t: serverTimestamp() }).catch(() => { du.enviou = false; });
}
function conduzirCorrida(d) {
  const du = duelo, a = d.a.uid, b = d.b.uid;
  if (typeof d.inicio !== 'number' || d.fim) return;
  const prontos = !!d.prog?.[a] && !!d.prog?.[b], acabou = agoraServ() > d.inicio + TEMPO_CORRIDA_MS + 3000;
  if (!prontos && !acabou) { clearTimeout(du.tConduz); du.tConduz = setTimeout(() => { if (duelo === du && du.d) conduzirCorrida(du.d); }, 500); return; }
  const res = resultadoCorrida(faseDoDuelo(d), programaDeTexto(d.prog?.[a]?.p), programaDeTexto(d.prog?.[b]?.p));
  const vencedor = res.vencedor === 'a' ? a : res.vencedor === 'b' ? b : 'empate';
  finalizarCorrida(d, vencedor, { [a]: res.vencedor === 'a' ? 1 : 0, [b]: res.vencedor === 'b' ? 1 : 0 });
}
async function finalizarCorrida(d, vencedor, placar, wo = false) {
  const du = duelo, a = d.a.uid, b = d.b.uid;
  try {
    const t = await runTransaction(ref(db, `${basePraca()}/duelos/${du.id}/fim`), (cur) => (cur ? undefined : { vencedor, placar, wo, ts: serverTimestamp() }));
    if (!t.committed) return;
    await set(ref(db, `${basePraca()}/historico/${semanaPesca()}/${du.id}`), { a, b, an: d.a.nome || '', bn: d.b.nome || '', at: d.a.turma || '', bt: d.b.turma || '',
      vencedor, placar: `${placar[a]}-${placar[b]}`, wo, modo: 'corrida', ts: Date.now() });
  } catch (e) { console.warn('[jogo-revisao] fim da corrida', e?.code || e); }
}
// Fim: os dois pets correm na tela; depois o resultado e os prêmios (os mesmos do desafio da praça)
async function fimCorrida(d) {
  const du = duelo;
  if (du.fimCorrida) return;
  du.fimCorrida = true;
  du.timers.forEach(clearTimeout);
  const souA = du.souA, a = d.a.uid, b = d.b.uid;
  if (!d.fim.wo && d.prog) {
    const res = resultadoCorrida(faseDoDuelo(d), programaDeTexto(d.prog?.[a]?.p), programaDeTexto(d.prog?.[b]?.p));
    await mostrarCorrida(souA ? res.eventosA : res.eventosB, souA ? res.eventosB : res.eventosA);
    const v = d.fim.vencedor;
    mensagemCorrida(v === sessao.uid ? '🏆 Seu pet chegou primeiro!' : v === 'empate' ? '🤝 Empate!' : `🏁 ${nomeT(du.outro.uid, nomeCurto(du.outro.uid, du.outro.nome))} chegou primeiro.`, v === sessao.uid ? 'ok' : 'aviso');
    await new Promise(ok => setTimeout(ok, 2200));
  }
  if (duelo !== du) return;
  if (d.fim.vencedor === sessao.uid) contarVitoriaCorrida();
  fecharTelaPrograme(true);
  aplicarFimDuelo(d);   // prêmio, ranking de desafios e o cartão do fim (o mesmo do desafio de contas)
}

// ============================================================
//  🪙 ECONOMIA (PROMPT-47) — sem teto diário geral: cada fonte tem o próprio limite (batalha, pedidos, cavar,
//  fliperama, desafios). Ginásio: +1 só no 1º acerto de cada pergunta; insígnia +10, dourada +15 (loja.json →
//  moedas_insignia / moedas_dourada). Registro do que entrou: moedas_dia (hoje, por fonte: o aluno vê tocando no
//  contador) e moedas_semana/{segunda}/{fonte} (painel da professora).
// ============================================================
const FONTES_MOEDA = {
  ginasio: { nome: 'Ginásios (1º acerto de cada pergunta)' },
  insignia: { nome: 'Insígnias' },
  batalha: { nome: 'Batalhas', limite: () => cfgBatalha().limites_dia?.moedas },
  batalha_primeira: { nome: 'Primeira vitória contra um treinador' },
  pedido: { nome: 'Pedidos de ajuda', limite: () => cfgPedidos().limite_moedas_dia ?? 20 },
  cavar: { nome: 'Cavar e mato', limite: () => cfgCavar().moedas_cavar_dia ?? 15 },
  colecao: { nome: 'Coleção' },
  fliperama: { nome: 'Fliperama', limite: () => FLIPER?.moedas_dia ?? 10 },
  desafio: { nome: 'Desafios na praça' },
  pesca: { nome: 'Venda de peixes' },
  aovivo: { nome: 'Tabuada ao vivo' },
  missao: { nome: 'Missões do dia' },
  programe: { nome: 'Programe o pet' },
};

function registrarGanho(fonte, n, patch) {
  n = Number(n) || 0;
  if (n <= 0 || !estado) return;
  const hoje = diaLocal();
  if (estado.moedasDia?.data !== hoje || typeof estado.moedasDia.fontes !== 'object') estado.moedasDia = { data: hoje, fontes: {} };
  const fd = estado.moedasDia.fontes;
  fd[fonte] = (Number(fd[fonte]) || 0) + n;
  patch.moedas_dia = estado.moedasDia;
  const sem = semanaPesca(), s = (estado.moedasSemana[sem] ||= {});
  s[fonte] = (Number(s[fonte]) || 0) + n;
  patch[`moedas_semana/${sem}/${fonte}`] = s[fonte];
}

// Insígnia nova: +10; dourada: +15 (uma vez cada; quem já tinha antes desta regra não recebe retroativo)
function moedasDaInsignia(tipo) {
  const n = tipo === 'dourada' ? cfgLoja().moedas_dourada ?? 15 : cfgLoja().moedas_insignia ?? 10;
  if (!n || !estado?.pets) return;
  estado.pets.moedas = (Number(estado.pets.moedas) || 0) + n;
  const patch = { 'pets/moedas': estado.pets.moedas };
  registrarGanho('insignia', n, patch);
  gravar(patch);
  setTimeout(() => avisoPet(`${tipo === 'dourada' ? '🌟 Insígnia dourada' : '🏅 Insígnia nova'}! +${n} 🪙`, true), 1200);
}

function abrirMoedasHoje() {
  if (!estado) return;
  const md = estado.moedasDia?.data === diaLocal() ? estado.moedasDia.fontes || {} : {};
  const total = Object.values(md).reduce((a, n) => a + (Number(n) || 0), 0);
  const linhas = Object.entries(FONTES_MOEDA).map(([id, f]) => {
    const n = Number(md[id]) || 0, lim = f.limite?.();
    if (!n && !lim) return '';
    return `<li><span>${esc(f.nome)}</span><b>${n}${lim ? `<small>/${lim}</small>` : ''}</b></li>`;
  }).join('');
  $('moedas-hoje-caixa').innerHTML = `<div class="jr-mh-tit">Hoje você ganhou <b>${total}</b> ${moedaHtml()}</div>
    <ul class="jr-mh-lista">${linhas}</ul>
    <div class="jr-mh-nota">Cada atividade tem o próprio limite por dia. Nos ginásios, a moeda vem no 1º acerto de cada pergunta; vencer o líder dá +${cfgLoja().moedas_insignia ?? 10} e a dourada +${cfgLoja().moedas_dourada ?? 15}.</div>
    <div class="jr-mh-fechar">Toque para fechar</div>`;
  $('moedas-hoje').hidden = false;
}

// ============================================================
//  📜 MISSÕES DO DIA (PROMPT-48) — dados/jogo/missoes.json
//  `por_dia` missões por dia, sorteadas por aluno (semente: dia + uid) entre as atividades disponíveis, com pelo menos
//  uma de matemática. O progresso conta sozinho (missaoProgresso nos eventos das atividades). Zera à meia-noite (hora
//  local do aparelho, a de Brasília para os alunos). Gravado em missoes_dia (modo teste: no nó do modo teste).
//  Liberação por etapas (PROMPT-34) ainda não existe: missaoDisponivel só confere se a atividade está carregada.
//  Não há teto diário de moedas (PROMPT-47): o prêmio é pago inteiro.
// ============================================================
let MISSOES = null;
const MISSOES_MAT = ['acertar_ginasio', 'revisar_erro', 'batalha', 'fliperama'];   // pelo menos uma destas por dia

function missaoDisponivel(m) {
  const temPet = petsOk && !!estado?.pets?.ativo;
  switch (m.requer) {
    case 'ginasios': return m.id !== 'batalha' || (batalhasProntas() && temPet);
    case 'pedidos': return pedidosProntos();
    case 'loja': return lojaPronta() && temPet;
    case 'meu_pet': return temPet;
    case 'pesca': return pescaPronta();
    case 'cavar': return !!CAVAR;
    case 'desafios': return pracaPronta();
    case 'fliperama': return !!FLIPER;
    default: return true;
  }
}

// sorteio repetível: mesmo aluno + mesmo dia = mesmas missões
function sementeMissoes(txt) {
  let h = 2166136261;
  for (const c of txt) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  h = h || 1;
  return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
}
function sortearMissoes(hoje) {
  const rnd = sementeMissoes(`${hoje}|${sessao.uid}`);
  const emb = (MISSOES.missoes || []).filter(missaoDisponivel).map(m => [rnd(), m]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const mat = emb.find(m => MISSOES_MAT.includes(m.id));
  const escolhidas = (mat ? [mat, ...emb.filter(m => m !== mat)] : emb).slice(0, MISSOES.por_dia ?? 3)
    .map(m => [rnd(), m]).sort((a, b) => a[0] - b[0]).map(x => x[1]);   // a de matemática não fica sempre em 1º
  return escolhidas.map(m => { const [a, b] = m.n || [1, 1]; return { id: m.id, n: a + Math.floor(rnd() * (b - a + 1)), feito: 0 }; });
}

// Missões de hoje (sorteia e grava na primeira vez do dia)
function missoesDoDia() {
  if (!MISSOES || !estado || !carregouProgresso || !sessao?.uid) return null;
  const hoje = diaLocal();
  if (estado.missoes?.data !== hoje || !Array.isArray(estado.missoes.lista)) {
    estado.missoes = { data: hoje, lista: sortearMissoes(hoje), bonus: false, avisou: false };
    gravar({ missoes_dia: estado.missoes });
    $('btn-missoes')?.classList.add('nova');
  }
  return estado.missoes;
}
const cfgMissao = (id) => (MISSOES?.missoes || []).find(m => m.id === id);
const textoMissao = (m) => String(cfgMissao(m.id)?.texto || m.id).replace('{n}', m.n);
const missaoFeita = (m) => m.feito >= m.n;

function missaoProgresso(id, qtd = 1) {
  const md = missoesDoDia();
  const m = md?.lista.find(x => x.id === id);
  if (!m || missaoFeita(m) || !(qtd > 0)) return;
  m.feito = Math.min(m.n, (Number(m.feito) || 0) + qtd);
  const patch = {};
  if (missaoFeita(m)) concluirMissao(m, md, patch);
  patch.missoes_dia = md;
  gravar(patch);
  atualizarBotaoMissoes();
  if (!$('missoes').hidden) renderMissoes();
}

function concluirMissao(m, md, patch) {
  const pr = MISSOES.premio || {}, ps = estado.pets;
  if (pr.moedas) { ps.moedas = (Number(ps.moedas) || 0) + pr.moedas; patch['pets/moedas'] = ps.moedas; registrarGanho('missao', pr.moedas, patch); }
  if (pr.lealdade && ps.ativo && cuidadosDe(ps.ativo)) ganharLealdade(ps.ativo, pr.lealdade, patch);
  avisoPet(`📜 Missão cumprida: ${textoMissao(m)}!${pr.moedas ? ` +${pr.moedas} 🪙` : ''}`, true);
  moedasVoando(pr.moedas);
  if (md.bonus || !md.lista.every(missaoFeita)) return;
  // as 3 do dia: bônus (fica fora de qualquer teto)
  const b = MISSOES.bonus_todas || {};
  md.bonus = true;
  if (b.moedas) { ps.moedas = (Number(ps.moedas) || 0) + b.moedas; patch['pets/moedas'] = ps.moedas; registrarGanho('missao', b.moedas, patch); }
  if (b.isca) { ps.iscas = (Number(ps.iscas) || 0) + b.isca; patch['pets/iscas'] = ps.iscas; }
  avisoPet(`🏆 Todas as missões de hoje!${b.moedas ? ` +${b.moedas} 🪙` : ''}${b.isca ? ` +${b.isca} 🪱` : ''}`, true);
  moedasVoando(b.moedas);
}

// Moedas saindo do meio da tela até o botão 📜 (ou o topo)
function moedasVoando(n) {
  if (!n || semMovimento()) return;
  const alvo = $('btn-missoes'), r = alvo && !alvo.hidden ? alvo.getBoundingClientRect() : { left: innerWidth / 2, top: 0, width: 0, height: 0 };
  const tx = r.left + r.width / 2, ty = r.top + r.height / 2;
  for (let i = 0; i < Math.min(8, n); i++) {
    const s = document.createElement('span');
    s.className = 'jr-moeda-voa'; s.textContent = '🪙';
    const x0 = innerWidth / 2 + (Math.random() - 0.5) * 120, y0 = innerHeight / 2 + (Math.random() - 0.5) * 60;
    s.style.left = x0 + 'px'; s.style.top = y0 + 'px';
    $('jr-app').appendChild(s);
    s.animate([{ transform: 'translate(-50%, -50%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%, -50%) scale(1.2)', opacity: 1, offset: 0.25 },
      { transform: `translate(calc(-50% + ${tx - x0}px), calc(-50% + ${ty - y0}px)) scale(.7)`, opacity: 0.9 }],
      { duration: 900, delay: i * 80, easing: 'ease-in', fill: 'backwards' }).onfinish = () => s.remove();
  }
}

function atualizarBotaoMissoes() {
  const md = missoesDoDia(), b = $('btn-missoes');
  if (!md) return;
  const feitas = md.lista.filter(missaoFeita).length;
  $('missoes-cont').textContent = `${feitas}/${md.lista.length}`;
  b.classList.toggle('todas', feitas === md.lista.length);
  b.setAttribute('aria-label', `Missões do dia: ${feitas} de ${md.lista.length}`);
}
// A cada quadro: 📜 só nos mapas da região; o pet avisa (uma vez por dia) que tem missão nova
function atualizarHudMissoes() {
  const b = $('btn-missoes'), esconde = !(cena?.tipo === 'mapa' && MISSOES && carregouProgresso);
  if (b.hidden !== esconde) { b.hidden = esconde; if (!esconde) atualizarBotaoMissoes(); }
  const md = esconde ? null : estado.missoes;
  if (md && !md.avisou && md.data === diaLocal() && seguidor?.pet && !$('pet').hidden && !conversa.falando && !sobreposicaoAberta() && !transicionando) {
    md.avisou = true;
    gravar({ 'missoes_dia/avisou': true });
    mostrarFalaPet([{ texto: 'Hoje tem missão nova! 📜' }]);
  }
}

function abrirMissoes() {
  if (!missoesDoDia()) return;
  $('btn-missoes').classList.remove('nova');
  renderMissoes();
  $('missoes').hidden = false;
}
function renderMissoes() {
  const md = missoesDoDia();
  if (!md) return;
  const pr = MISSOES.premio || {}, b = MISSOES.bonus_todas || {};
  const premio = [pr.moedas ? `+${pr.moedas} ${moedaHtml()}` : '', pr.lealdade ? `+${pr.lealdade} de lealdade 💜` : ''].filter(Boolean).join(' · ');
  $('missoes-lista').innerHTML = md.lista.map(m => {
    const feita = missaoFeita(m), f = Math.min(m.feito, m.n);
    return `<div class="jr-mis-item${feita ? ' feita' : ''}">
      <div class="jr-mis-linha"><span>${feita ? '✅ ' : ''}${esc(textoMissao(m))}</span><span class="jr-mis-num">${f}/${m.n}</span></div>
      <div class="jr-mis-trilho"><i style="width:${f / m.n * 100}%"></i></div>
      <div class="jr-mis-premio">${feita ? 'Prêmio recebido: ' : 'Prêmio: '}${premio}</div>
    </div>`;
  }).join('');
  const bonus = [b.moedas ? `+${b.moedas} ${moedaHtml()}` : '', b.isca ? `+${b.isca} iscas 🪱` : ''].filter(Boolean).join(' ');
  $('missoes-bonus').innerHTML = md.bonus ? `🏆 Bônus de hoje recebido: ${bonus}` : `🏆 Complete as ${md.lista.length} para ganhar ${bonus}`;
  $('missoes-bonus').classList.toggle('ganho', !!md.bonus);
}

// ============================================================
//  ✨ TRUQUES (PROMPT-51) — dados/jogo/truques.json, por forma do pet (um texto no lugar da lista = usa a lista daquela forma).
//  Liberam com a lealdade do pet; só para brincar (não dão moedas nem lealdade). Avisos de "aprendeu" uma vez por truque
//  (pets/conquistados/{pet}/truques_vistos). Na batalha: "cuspir_fogo" libera o ataque de fogo e "voo_fogo" a abertura voando.
// ============================================================
let TRUQUES = {};
function truquesDe(pet) {
  if (!pet) return null;
  let l = TRUQUES?.[formaDe(pet)];
  if (typeof l === 'string') l = TRUQUES[l];
  return Array.isArray(l) && l.length ? l : null;
}
const lealdadeDe = (pet) => Number(cuidadosDe(pet)?.lealdade) || 0;
const truqueLiberado = (id, pet = estado?.pets?.ativo) => { const t = truquesDe(pet)?.find(x => x.id === id); return !!t && lealdadeDe(pet) >= t.lealdade; };

// a lealdade alcançou um truque: avisa uma vez (os de lealdade 0 e vários de uma vez: um aviso só)
function avisarTruques(pet) {
  const c = pet && cuidadosDe(pet), lista = truquesDe(pet);
  if (!c || !lista) return;
  const novos = lista.filter(t => !c.truques_vistos?.[t.id] && lealdadeDe(pet) >= t.lealdade);
  if (!novos.length) return;
  c.truques_vistos = { ...(c.truques_vistos || {}) };
  const patch = {};
  for (const t of novos) { c.truques_vistos[t.id] = true; patch[`pets/conquistados/${pet}/truques_vistos/${t.id}`] = true; }
  gravar(patch);
  const comAviso = novos.filter(t => t.lealdade > 0);
  if (comAviso.length === 1) avisoPet(`${comAviso[0].emoji} ${nomePet(pet)} aprendeu um truque: ${comAviso[0].nome}! Veja em ✨ Truques.`, true);
  else if (comAviso.length > 1) avisoPet(`✨ ${nomePet(pet)} aprendeu ${comAviso.length} truques! Veja em ✨ Truques.`, true);
}

function abrirTruques() {
  if (!mp || !truquesDe(mp.pet)) return;
  const l = lealdadeDe(mp.pet);
  $('mp-truques-lista').innerHTML = truquesDe(mp.pet).map(t => {
    const ok = l >= t.lealdade;
    return `<button class="mp-truque${ok ? '' : ' bloqueado'}" data-truque="${esc(t.id)}"${ok ? '' : ' disabled'}><span class="mp-truque-emoji">${ok ? t.emoji : '🔒'}</span>
      <b>${esc(t.nome)}</b>${ok ? '' : `<small>Lealdade ${t.lealdade}</small>`}</button>`;
  }).join('');
  $('mp-truques-painel').hidden = false;
}

// O pet faz as animações do truque, uma depois da outra; busto_fogo aparece no balão
function fazerTruque(id) {
  const t = truquesDe(mp?.pet)?.find(x => x.id === id);
  if (!mp || !t || mp.ocupado || !truqueLiberado(id, mp.pet)) return;
  $('mp-truques-painel').hidden = true;   // fecha a lista para ver o pet
  mp.estado = 'truque'; mp.ocupado = true;
  movimentoCorpo(null);
  const anims = t.anims.filter(a => a === 'busto_fogo' || temAnim(mp.forma, a));
  let i = 0, guarda = 0;
  const proximo = () => {
    clearTimeout(guarda);
    if (!mp || mp.estado !== 'truque') return;
    if (i >= anims.length) { voltarAoNormal(); return; }
    const a = anims[i++];
    if (a === 'busto_fogo') {   // o busto de fogo no balão do pet
      const b = $('mp-balao');
      b.innerHTML = `<img class="mp-balao-busto" src="${quadrosDe(mp.forma, 'busto_fogo')[0]}" alt="" draggable="false"/>${esc(nomePet(mp.pet))}!`;
      b.hidden = false;
      clearTimeout(mp.timerBalao); mp.timerBalao = setTimeout(() => { b.hidden = true; }, 2200);
      guarda = setTimeout(proximo, 1600);
      return;
    }
    mp.anim.tocar(a, proximo);
    guarda = setTimeout(proximo, 4000);   // reserva: animação que repete não chama o fim
  };
  proximo();
}

// ============================================================
//  📖 RELEMBRE — explicação curta de cada ginásio (dados/jogo/explicacoes.json: titulo, regra, exemplo, dica).
//  Não conta tempo nem tentativa. Registro em relembre/{ginásio}: visto (já apareceu na entrada), ocultar
//  ("não mostrar de novo"), aberturas (vezes que o aluno ABRIU: 📖, erro, batalha, insígnia) e ultima.
// ============================================================
let EXPLIC = {};
const explicacaoDe = (chave) => EXPLIC[chave] || null;
let relembreAberto = null;   // { chave, origem }

// Tipo de conta da batalha → ginásio do mesmo conteúdo (tabuada não tem ginásio)
const RELEMBRE_TIPO = {
  expressao_sem_parenteses: 'mapa1-A', expressao_com_parenteses: 'mapa1-B', vezes_10_100_1000: 'mapa2-A', medidas: 'mapa2-B',
  negativos_soma: 'mapa3-A', negativos_mult: 'mapa3-B', fracoes: 'mapa4-A', decimais: 'mapa4-B', potencia: 'mapa5-A', raiz: 'mapa5-B',
  multiplos_divisores: 'mapa6-A', porcentagem: 'mapa7-A', valor_numerico: 'mapa8-A', termos_semelhantes: 'mapa8-B', equacao: 'mapa9-A',
  regra_de_tres: 'mapa10-A', perimetro_area: 'mapa11-A', coordenadas: 'mapa12-A', media: 'mapa13-A',
};
const chaveRelembreConta = (tipo, conta = '') =>
  tipo === 'multiplos_divisores' && /divisor/i.test(conta) ? 'mapa6-B' : tipo === 'perimetro_area' && /área/i.test(conta) ? 'mapa11-B' : RELEMBRE_TIPO[tipo] || null;

// "5 + 2 × 3 = 5 + 6 = 11   ·   48 ÷ 10 = 4,8": em cada parte, o resultado fica em verde — o que vem depois da
// última seta (→ ⇒), ou, sem seta, depois do último "="; o que vier depois de ", porque" fica normal
function exemploRelembre(txt) {
  return String(txt).split(/\s+·\s+/).map(parte => {
    const [cabeca, ...resto] = parte.trim().split(/(?=,\s*porque\b)/);
    const cauda = esc(resto.join(''));
    const m = /[→⇒]/.test(cabeca) ? /^(.*[→⇒]\s*)([^→⇒]+)$/.exec(cabeca) : /^(.*=\s*)([^=]+)$/.exec(cabeca);
    return (m ? `${esc(m[1])}<b>${esc(m[2])}</b>` : esc(cabeca)) + cauda;
  }).join('<span class="sep">·</span>');
}

// origem: 'entrada' (sozinho, ao entrar no ginásio), 'ginasio' (📖 do interior), 'erro', 'batalha', 'insignia'
function abrirRelembre(chave, origem) {
  const e = explicacaoDe(chave);
  if (!e || !estado) return;
  relembreAberto = { chave, origem };
  $('rel-insignia').src = `${IMG}/insignias/insignia-${chave}.webp`;
  $('rel-titulo').textContent = e.titulo || '';
  $('rel-regra').textContent = e.regra || '';
  $('rel-exemplo').innerHTML = exemploRelembre(e.exemplo || '');
  $('rel-exemplo').hidden = !e.exemplo;
  $('rel-dica').textContent = e.dica ? `💡 ${e.dica}` : '';
  $('rel-dica').hidden = !e.dica;
  const pet = petsOk && estado.pets?.ativo;
  $('rel-pet-bloco').hidden = !pet;
  if (pet) { const img = $('rel-pet'); img.src = quadrosDe(formaDe(pet), 'sentado_girando')[0]; marcarForma(img, pet, formaDe(pet)); aplicarVisualPet(img, pet); }
  const r = (estado.relembre[chave] ||= {});
  $('rel-check').hidden = origem !== 'entrada' && origem !== 'ginasio';   // a caixinha só vale dentro do ginásio
  $('rel-ocultar').checked = !!r.ocultar;
  soltarJoystick();
  $('relembre').hidden = false;
  const base = `relembre/${chave}`;
  if (origem === 'entrada') { if (!r.visto) { r.visto = true; gravar({ [`${base}/visto`]: true }); } }
  else {
    r.aberturas = (Number(r.aberturas) || 0) + 1; r.ultima = Date.now();
    gravar({ [`${base}/aberturas`]: r.aberturas, [`${base}/ultima`]: r.ultima });
  }
  $('rel-ok').focus({ preventScroll: true });
}

function fecharRelembre() {
  if (!relembreAberto) return;
  const { chave } = relembreAberto;
  relembreAberto = null;
  $('relembre').hidden = true;
  if ($('rel-check').hidden) return;
  const r = (estado.relembre[chave] ||= {}), ocultar = $('rel-ocultar').checked;
  if (!!r.ocultar !== ocultar) { r.ocultar = ocultar; gravar({ [`relembre/${chave}/ocultar`]: ocultar || null }); }
}

// Ao entrar no ginásio: sempre na 1ª vez; depois, só se o aluno não marcou "não mostrar de novo"
function relembreNaEntrada(chave) {
  const r = estado?.relembre?.[chave];
  if (!explicacaoDe(chave) || (r?.visto && r.ocultar) || !$('relembre').hidden) return;
  abrirRelembre(chave, 'entrada');
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

  window.addEventListener('keydown', (e) => {
    if (!perguntaAberta || !pg || pg.travado || pg.fim || !$('perg-confirma').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    const m = /^(?:Digit|Numpad)([1-4])$/.exec(e.code);
    if (!m) return;
    const b = [...$('perg-alternativas').querySelectorAll('.jr-alt')].filter(x => !x.hidden)[Number(m[1]) - 1];
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
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
  $('btn-personagem').addEventListener('click', () => { $('estojo').hidden = true; abrirEscolhaPersonagem(); });
  $('pers-grade').addEventListener('click', (e) => { const b = e.target.closest('[data-pers]'); if (b) selecionarPersonagem(b.dataset.pers); });
  $('pers-palco').addEventListener('click', () => { pers.andarAte = performance.now() + 1600; });   // tocar = anda no lugar
  $('pers-confirmar').addEventListener('click', confirmarPersonagem);
  $('pers-cancelar').addEventListener('click', () => { $('pers-escolha').hidden = true; clearInterval(pers.timer); });
  $('btn-pet').addEventListener('click', abrirMeuPet);
  $('btn-colegas').addEventListener('click', alternarColegas);
  $('btn-reacao').addEventListener('click', abrirReacoes);
  $('reacoes').addEventListener('click', (e) => { const b = e.target.closest('[data-e]'); if (b) reagirCom(b.dataset.e); else if (!e.target.closest('.jr-reacoes-roda')) fecharReacoes(); });
  $('reacoes-roda').innerHTML = REACOES.map((e, i) => `<button class="jr-reacao" data-e="${e}" style="--i:${i}" aria-label="Reação ${e}">${e}</button>`).join('');
  window.addEventListener('keydown', (e) => { if (e.code === 'Escape') { if (!$('reacoes').hidden) fecharReacoes(); else if (!$('online-lista').hidden) $('online-lista').hidden = true; } });
  $('geral-marcadores').addEventListener('click', (e) => { const b = e.target.closest('.jr-marc-online'); if (b) { e.stopPropagation(); abrirListaOnline(Number(b.dataset.mapa)); } }, true);
  $('online-fechar').addEventListener('click', () => { $('online-lista').hidden = true; });
  $('online-ir').addEventListener('click', () => { const n = Number($('online-ir').dataset.mapa); $('online-lista').hidden = true; if (n >= 1 && n <= NUM_MAPAS) { tocar('porta'); abrirMapa(n, 'entrada'); } });
  $('mp-fechar').addEventListener('click', fecharMeuPet);
  $('mp-trocar').addEventListener('click', () => { fecharMeuPet(); colecaoDoMeuPet = true; abrirColecao(); });
  $('mp-bolsa').addEventListener('click', abrirBolsa);
  $('mp-visual').addEventListener('click', abrirVisual);
  $('mp-editar').addEventListener('click', abrirNomear);
  $('mp-bolsa-itens').addEventListener('click', (e) => {
    const d = e.target.closest('[data-dar-pet]');
    if (d) { bolsaSel = null; darComida(d.dataset.darPet); return; }
    const b = e.target.closest('[data-comida]');
    if (!b) return;
    const id = b.dataset.comida;
    if (itemDaBolsa(id)?.peixe) { bolsaSel = bolsaSel === id ? null : id; renderBolsa(); return; }   // peixe: abre as opções
    darComida(id);
  });
  $('mp-visual-painel').addEventListener('click', escolherVisual);
  $('mp-truques').addEventListener('click', abrirTruques);
  $('mp-truques-lista').addEventListener('click', (e) => { const b = e.target.closest('[data-truque]'); if (b && !b.disabled) fazerTruque(b.dataset.truque); });
  for (const id of ['mp-bolsa-fechar', 'mp-visual-fechar', 'mp-nome-cancelar', 'mp-truques-fechar']) $(id).addEventListener('click', (e) => { e.stopPropagation(); e.target.closest('.mp-sub').hidden = true; });
  $('mp-nome-salvar').addEventListener('click', () => salvarNomePet());
  $('mp-nome-padrao').addEventListener('click', () => salvarNomePet(true));
  $('mp-nome-input').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') salvarNomePet(); if (e.key === 'Escape') $('mp-nomear').hidden = true; });
  $('loja').addEventListener('click', cliqueLoja);
  $('lj-fechar').addEventListener('click', () => { $('loja').hidden = true; descerDoPedestal(); });
  $('btn-levantar').addEventListener('click', (e) => { e.stopPropagation(); sairPesca(); });
  $('btn-lancar').addEventListener('click', (e) => { e.stopPropagation(); pescaLancar(); });
  $('btn-acao-mapa').addEventListener('click', (e) => { e.stopPropagation(); usarAcaoMapa(); });
  $('mp-bolsa-abas').addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('[data-baba]'); if (b) { bolsaAba = b.dataset.baba; bolsaSel = null; renderBolsa(); } });
  $('perg-usar-dica').addEventListener('click', (e) => { e.stopPropagation(); usarDicaPergunta(); });
  $('perg-segunda').addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('[data-segunda]'); if (b) responderSegundaChance(b.dataset.segunda === '1'); });
  $('bt-dica').addEventListener('click', (e) => {   // 💡 Dica do pet na batalha: elimina 1 alternativa errada
    e.stopPropagation();
    if (!bt || bt.fechou || bt.resp.L !== null || bt.usouRodada === 'dica_pet') return;
    const erradas = [...$('bt-ops').querySelectorAll('.bt-op')].filter(b => !b.disabled && bt.p.opcoes[b.dataset.i] !== bt.p.resposta);
    if (!erradas.length || !gastarItem('dica_pet')) return;
    const alvo = sortear(erradas);
    alvo.disabled = true; alvo.classList.add('esmaecida');
    bt.usouRodada = 'dica_pet';
    $('bt-dica').hidden = true;
    tocar('clique');
  });
  $('bt-msg').addEventListener('click', (e) => {   // 🔁 Segunda chance na batalha
    const b = e.target.closest('[data-segunda]');
    if (!b || !bt || bt.oferta == null) return;
    e.stopPropagation();
    const v = bt.oferta;
    bt.oferta = null;
    $('bt-msg').textContent = '';
    if (b.dataset.segunda === '1' && gastarItem('segunda_chance')) {
      bt.segundaUsada = true; bt.usouRodada = 'segunda_chance';
      for (const x of $('bt-ops').querySelectorAll('.bt-op')) if (!x.classList.contains('errada') && !x.classList.contains('esmaecida')) x.disabled = false;
      tocar('clique');
      return;
    }
    bt.recusou = true;
    btResponder('L', v);
  });
  $('btn-praca').addEventListener('click', (e) => { e.stopPropagation(); if (cena?.tipo === 'mapa') transicao(abrirPraca); });
  $('mural-fechar').addEventListener('click', () => { $('mural').hidden = true; });
  $('mural').addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target === $('mural')) { $('mural').hidden = true; return; }
    const a = e.target.closest('[data-aba]'), f = e.target.closest('[data-filtro]');
    if (a) { mural.aba = a.dataset.aba; renderMural(); }
    else if (f) { mural.filtro = f.dataset.filtro; renderMural(); }
  });
  $('convite-sim').addEventListener('click', (e) => { e.stopPropagation(); responderConvite(true); });
  $('convite-nao').addEventListener('click', (e) => { e.stopPropagation(); responderConvite(false); });
  $('duelo').addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('.dl-op'); if (b && !b.disabled) responderDuelo(b.dataset.op); });
  $('dl-ok').addEventListener('click', (e) => { e.stopPropagation(); encerrarDueloLocal(); });
  $('maquina').addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target === $('maquina') || e.target.closest('#mq-fechar')) { $('maquina').hidden = true; return; }
    const j = e.target.closest('[data-jogar]');
    if (j) { abrirJogoEmbed(j.dataset.jogar); return; }
    const pf = e.target.closest('[data-pg-fase]');
    if (pf && !pf.disabled) { $('maquina').hidden = true; abrirFasePrograme(Number(pf.dataset.pgFase)); return; }
    if (e.target.closest('[data-pg-dia]')) { $('maquina').hidden = true; abrirDesafioDia(); return; }
    if (e.target.closest('[data-pg-fantasma]')) { $('maquina').hidden = true; abrirFantasma(); return; }
    if (e.target.closest('[data-recordes]')) mostrarRecordes();
  });
  $('jogo-embed-voltar').addEventListener('click', (e) => { e.stopPropagation(); voltarDoJogo(); });
  window.addEventListener('message', (e) => {   // fim de partida dos jogos do site abertos no fliperama (?embed=1)
    if (e.origin !== location.origin || e.data?.tipo !== 'fim-jogo' || e.source !== $('jogo-embed-frame').contentWindow) return;
    premioFliperama(e.data);
  });
  $('aovivo').addEventListener('click', cliqueAoVivo);
  $('aovivo').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && e.target.id === 'av-codigo') entrarAoVivo(e.target.value); });
  $('av-x').addEventListener('click', (e) => { e.stopPropagation(); if (av) sairAoVivo(); else $('aovivo').hidden = true; });
  $('av-convite-sim').addEventListener('click', (e) => { e.stopPropagation(); responderConviteAV(true); });
  $('av-convite-nao').addEventListener('click', (e) => { e.stopPropagation(); responderConviteAV(false); });
  $('btn-pesca-ranking').addEventListener('click', (e) => { e.stopPropagation(); abrirRankingPesca(); });
  $('fm-trofeu').addEventListener('click', verMeuTrofeu);
  $('hm-fechar').addEventListener('click', () => { $('hall-mestres').hidden = true; });
  $('hall-mestres').addEventListener('click', (e) => { e.stopPropagation(); if (e.target === $('hall-mestres')) $('hall-mestres').hidden = true; });
  // 🧮 calculadora: abre/fecha no botão; fecha tocando fora ou no ✕
  for (const id of ['perg-calc', 'bt-calc']) $(id).addEventListener('click', (e) => { e.stopPropagation(); $('calc').hidden ? abrirCalc() : fecharCalc(); });
  $('calc-teclas').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) { tocar('clique'); calcTecla(b.dataset.k); } });
  $('calc-fechar').addEventListener('click', fecharCalc);
  document.addEventListener('pointerdown', (e) => { if (!$('calc').hidden && !e.target.closest('#calc, #perg-calc, #bt-calc')) fecharCalc(); }, true);
  $('pr-fechar').addEventListener('click', () => { $('pesca-ranking').hidden = true; });
  $('pr-abas').addEventListener('click', (e) => { const b = e.target.closest('[data-pr]'); if (b) { rankingPesca.filtro = b.dataset.pr; renderRankingPesca(); } });
  $('pesca-ranking').addEventListener('click', (e) => { e.stopPropagation(); if (e.target === $('pesca-ranking')) $('pesca-ranking').hidden = true; });
  // barrinha: segurar o dedo (ou o botão do mouse) em qualquer lugar da tela sobe a zona verde
  const segurar = (v) => (e) => { if (pesca?.estado !== 'barrinha') return; e.preventDefault(); e.stopPropagation(); pesca.segurando = v; };
  $('pesca-barra').addEventListener('pointerdown', (e) => { segurar(true)(e); try { $('pesca-barra').setPointerCapture(e.pointerId); } catch (_) {} });
  // 🎣 PUXAR!: no ❗ puxa; na barrinha, segurar o botão = segurar a tela; esperando, não faz nada (não espanta o peixe)
  const bp = $('btn-puxar');
  bp.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (pesca?.estado === 'fisgada') pescaPuxar();
    if (pesca?.estado === 'barrinha') { pesca.segurando = true; try { bp.setPointerCapture(e.pointerId); } catch (_) {} }
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) bp.addEventListener(ev, () => { if (pesca?.estado === 'barrinha') pesca.segurando = false; });
  bp.addEventListener('click', (e) => e.stopPropagation());
  bp.addEventListener('contextmenu', (e) => e.preventDefault());
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) $('pesca-barra').addEventListener(ev, segurar(false));
  $('pesca-barra').addEventListener('click', (e) => e.stopPropagation());
  $('pesca-barra').addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => {   // pesca: espaço/Enter lança, puxa e (segurado) sobe a zona verde
    if (!pesca || e.ctrlKey || e.metaKey || e.altKey || !(e.code === 'Space' || e.key === 'Enter')) return;
    if (pesca.estado === 'barrinha') { e.preventDefault(); e.stopImmediatePropagation(); pesca.segurando = true; }
    else if (pesca.estado === 'fisgada') { e.preventDefault(); e.stopImmediatePropagation(); pescaPuxar(); }
    else if (pesca.estado === 'pronto' && !e.repeat && $('pesca-aviso').hidden && $('pesca-tutorial').hidden) { e.preventDefault(); e.stopImmediatePropagation(); pescaLancar(); }
  }, true);
  window.addEventListener('keyup', (e) => {
    if (pesca?.estado === 'barrinha' && (e.code === 'Space' || e.key === 'Enter')) { e.preventDefault(); pesca.segurando = false; }
  }, true);
  $('mp-carinho').addEventListener('click', carinhoPet);
  $('mp-calado').addEventListener('click', alternarPetCalado);
  $('mp-filhote').addEventListener('click', alternarFilhote);
  $('evo-ok').addEventListener('click', fecharEvolucao);
  $('meu-pet').addEventListener('click', (e) => { if (e.target === $('meu-pet')) fecharMeuPet(); });   // tocar fora do painel fecha
  $('mp-info').addEventListener('click', (e) => { e.stopPropagation(); $('mp-info-balao').hidden = !$('mp-info-balao').hidden; });
  $('meu-pet').addEventListener('click', (e) => { if (!e.target.closest('#mp-info, #mp-info-balao')) $('mp-info-balao').hidden = true; }, true);
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || $('meu-pet').hidden) return;
    const sub = [...document.querySelectorAll('#meu-pet .mp-sub')].find(x => !x.hidden);
    if (sub) sub.hidden = true; else if (!$('mp-info-balao').hidden) $('mp-info-balao').hidden = true; else fecharMeuPet();
  });
  $('pet-fala').addEventListener('click', pararFalaPet);   // tocar no balão fecha
  atualizarBotaoCalado();
  $('mp-palco').addEventListener('click', carinhoPet);   // tocar no pet = carinho
  $('colecao-opcoes').addEventListener('click', (e) => {
    const s = e.target.closest('[data-silhueta]');
    if (s) { abrirSilhueta(s.dataset.silhueta); return; }
    const b = e.target.closest('[data-pet]'); if (b) trocarPetAtivo(b.dataset.pet);
  });
  $('silhueta-fechar').addEventListener('click', () => { $('pet-silhueta').hidden = true; });
  $('gin-fechado-ir').addEventListener('click', irAoGinasioPendente);
  $('gin-fechado-fechar').addEventListener('click', () => { $('gin-fechado').hidden = true; });
  $('perg-ajuda').addEventListener('click', pedirAjuda);
  $('btn-batalhar').addEventListener('click', abrirListaBatalha);
  $('bt-lista-fechar').addEventListener('click', () => { $('bt-lista').hidden = true; });
  $('bt-cards').addEventListener('click', (e) => { const b = e.target.closest('[data-sel]'); if (b) { btSel = b.dataset.sel; renderListaBatalha(); } });
  $('bt-det').addEventListener('click', (e) => { const b = e.target.closest('[data-ir]'); if (b && !b.disabled) irAteTreinador(b.dataset.ir); });
  $('colega-cartao').addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target.closest('[data-oi]')) { fecharCartaoColega(); reagirCom('👋'); return; }
    if (!cartaoColega) return;
    if (e.target.closest('[data-presente]')) { escolherPresente(cartaoColega.c); return; }
    if (e.target.closest('[data-desafiar]')) { escolherModoDesafio(cartaoColega.c); return; }
    const md = e.target.closest('[data-modo]');
    if (md) { confirmarDesafio(cartaoColega.c, md.dataset.modo); return; }
    const dm = e.target.closest('[data-desafiar-mesmo]');
    if (dm) { desafiarColega(cartaoColega.c, dm.dataset.desafiarMesmo || 'contas'); return; }
    const dar = e.target.closest('[data-dar]');
    if (dar) darPresente(cartaoColega.c, dar.dataset.dar);
  });
  $('bt-ops').addEventListener('click', (e) => { const b = e.target.closest('.bt-op'); if (b && !b.disabled && bt?.p) btResponder('L', bt.p.opcoes[b.dataset.i]); });
  $('bt-rev-ok').addEventListener('click', fecharRevisaoBatalha);
  $('pd-teclado').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) teclaPedido(b.dataset.k); });
  $('pd-depois').addEventListener('click', () => teclaPedido('depois'));
  $('pd-fechar').addEventListener('click', () => teclaPedido('fechar'));
  $('pd-dica').addEventListener('click', pedirDicaPedido);
  window.addEventListener('keydown', (e) => {   // no computador: digitar, − troca o sinal, ⌫, Enter, Esc
    if (!pd || $('pedido').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = /^\d$/.test(e.key) ? e.key : (e.key === '-' || e.key === '+') ? '±' : e.key === 'Backspace' ? '⌫'
      : e.key === 'Enter' ? (pd.fim ? 'fechar' : 'ok') : e.key === 'Escape' ? 'depois' : null;
    if (!k) return;
    e.preventDefault(); e.stopImmediatePropagation();
    teclaPedido(k);
  }, true);
  $('bt-sair').addEventListener('click', sairDaBatalha);
  $('bt-voltar').addEventListener('click', () => fecharBatalha(true));
  $('bt-revanche').addEventListener('click', () => { const id = bt?.t.id, origem = bt?.origem; fecharBatalha(false); if (id) iniciarBatalha(id, origem); });
  $('pessoa-balao').addEventListener('click', acaoBalaoPessoa);
  $('porta-balao').addEventListener('click', acaoBalaoPorta);
  $('pesca-aviso').addEventListener('click', (e) => {
    const b = e.target.closest('[data-aviso]');
    if (!b) return;
    $('pesca-aviso').hidden = true;
    const p = pontosDoMapa(cena?.n).find(x => x.id === $('pesca-aviso').dataset.ponto);
    if (b.dataset.aviso === 'mostrar' && p) mostrarPontoPesca(p);
  });
  window.addEventListener('keydown', (e) => {   // teclas 1–4 na batalha
    if (!bt || bt.fechou || $('batalha').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    const m = /^(?:Digit|Numpad)([1-4])$/.exec(e.code);
    const b = m && $('bt-ops').querySelectorAll('.bt-op')[Number(m[1]) - 1];
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
  });
  $('perg-pet').addEventListener('click', pedirAjuda);   // tocar no pet também pede
  $('perg-pet-fala').addEventListener('click', fecharFalaAjuda);
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
  $('cartao-relembre').addEventListener('click', (e) => { e.stopPropagation(); abrirRelembre(e.currentTarget.dataset.chave, 'insignia'); });
  $('btn-relembre').addEventListener('click', () => { if (cena?.tipo === 'interior') abrirRelembre(cena.chave, 'ginasio'); });
  $('rel-ok').addEventListener('click', fecharRelembre);
  $('btn-missoes').addEventListener('click', abrirMissoes);
  $('btn-letra').addEventListener('click', alternarLetra);
  ligarBotoesPrograme();
  $('pg-cartao-ok').addEventListener('click', () => { $('pg-cartao').hidden = true; });
  // tocar em qualquer contador de moedas: "Hoje você ganhou…"
  $('jr-app').addEventListener('click', (e) => { if (e.target.closest('.jr-moedas')) { e.stopPropagation(); abrirMoedasHoje(); } });
  $('moedas-hoje').addEventListener('click', () => { $('moedas-hoje').hidden = true; });
  $('missoes-fechar').addEventListener('click', () => { $('missoes').hidden = true; });
  $('missoes').addEventListener('click', (e) => { if (e.target.id === 'missoes') $('missoes').hidden = true; });
  $('relembre').addEventListener('click', (e) => { if (e.target.id === 'relembre') fecharRelembre(); });
  $('erro-relembre').addEventListener('click', (e) => abrirRelembre(e.currentTarget.dataset.relembre, 'erro'));
  $('erro-continuar').addEventListener('click', continuarDoErro);
  $('bt-rev-lista').addEventListener('click', (e) => { const b = e.target.closest('[data-relembre]'); if (b) abrirRelembre(b.dataset.relembre, 'batalha'); });
  $('cartao').addEventListener('click', (e) => { if (e.target.id === 'cartao') $('cartao').hidden = true; });

  window.addEventListener('resize', () => {
    if (!$('tela-geral').hidden) dimensionarGeral();
    if (cena) ajustarCamera();
  });
}

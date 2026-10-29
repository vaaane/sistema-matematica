// ============================================================
//  Jogo de Revisão — motor do jogo (Parte A) + progresso no Firebase (Parte B)
//  Real: jogo_revisao/{uid}   ·   Modo teste: modo_teste_historico/{uid}/jogo_revisao
// ============================================================
import { isModoTeste, getSession } from '/js/auth.js';
import { db } from '/js/firebase-config.js';
import { ref, get, update, push, set, remove, increment, onValue, onChildAdded, onChildChanged, onChildRemoved, runTransaction, onDisconnect, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { prepararFoto, analisarMoldura } from '/js/jogo-revisao/exposicao-img.js';
import { adicionarXP } from '/js/db.js';
import { bimestreAtual, ALUNOS_TESTE, ALUNOS_POR_TURMA, bimestreJogos, pathTabuadaRanking, pathEscaladaRanking, pathTabuadaNiveis, pathTabuadaNegNiveis, pathEscaladaNiveis } from '/js/constants.js';
import { gerarQuestoes, gerarUma, assuntoDe } from '/js/jogo-revisao/geradores.js';
import { tocar, somLigado, alternarSom, tocarArquivo, pararEfeitos, musicaPara, musicaLigada, alternarMusica, pausarMusica, musicaBloqueada } from '/js/jogo-revisao/sons.js';
import { definirPausas, definirBarriga, barrigaDoPet, barrigaAntiga, faixaBarriga, rotuloLealdade, lealdadeComQueda, doDia,
  CARINHOS_POR_DIA, LEALDADE_INICIAL, LEALDADE_DIA, LEALDADE_CAMBALHOTA } from '/js/jogo-revisao/cuidados.js';
import { definirLoja, definirPeixes, lojaPronta, cfgLoja, comMult, multMoedas, comidas, tintas, efeitos, tinta, tintaAnimada, icone, efeito, itemDaBolsa, idDoPeixe, ehFavorita, semanaDe,
  motivoNaoCome, comumAte, naoCome, listaNaoCome, enche, barrigaCheia, somarLealdade, nivelAmizade, validarNomePet, temPalavraProibida } from '/js/jogo-revisao/loja.js';
import { definirPesca, pescaPronta, cfgPesca, pontosDoMapa, spritePesca, pontaVara, sortearPeixe, entre, inteiroEntre,
  semanaPesca, semanaAnterior, criarBarrinha, passoBarrinha, peixeEhRaro } from '/js/jogo-revisao/pesca.js';
import { PETS, NOME_PET, carregarSprites, petValido, quadrosDe, tamanhoQuadro, tamanhoBusto, temBusto, bustoPet, preCarregarPet, PetSeguidor, PetParado,
  temAnim, formaAdulta, formaValida, sentadoNoQuadro, escalaPet, escalaMax, quadrosSeq, sortearOcioso, temSequencia, tocarSequencia, pararSequencia, msAtePasso,
  sortearAcaoParado, EMOCOES, MS_EMOCAO, coresDragao, aceitaCor, ehFormaAdulta, formaComCor, definirNoite } from '/js/jogo-revisao/pets.js';
import { lerTodos, lerRegistro, iniciarOnline, enviarOnline, sairOnline, ouvirMapa, ouvirTodos, onlineAtivo, VALIDADE_MS } from '/js/jogo-revisao/online.js';
import { definirPedidos, pedidosProntos, cfgPedidos, pedidoDisponivel, moedasDoPedido, limiteDoDiaAtingido, limiteMoedasPedidos, dicaPedido, lerResposta } from '/js/jogo-revisao/pedidos.js';
import { definirBatalhas, batalhasProntas, cfgBatalha, treinadores, treinador, tiposDeConta, gerarConta, vidaExtraLealdade, desafioDe, situacao, forca, dano, premios, depoisDaBatalha } from '/js/jogo-revisao/batalha.js';
import { definirFalas, falasProntas, configFalas, dicaDe, montarFala, duracaoBalao, fraseDe, fraseFiltrada, configAjuda, frasesFaro, quebrarBaloes, partirTexto, duracaoDe, tempoFala, tempoLeitura } from '/js/jogo-revisao/conversa.js';
import { definirPraca, pracaPronta, cfgPraca, cfgDesafio, frasesPraca, temaDoDesafio, vencedorDaRodada, placarDe, resultadoFinal, vale, contarDesafio,
  premioDesafio, ordenarRanking } from '/js/jogo-revisao/praca.js';
import { codigoValido, premioDoPodio, pontosDaResposta, TEMPO_RODADA_MS } from '/js/jogo-revisao/aovivo.js';
import { baseAoVivo, criarSala, entrarNaSala, sairDaSala, responder as responderNaSala, ouvirSala, ouvirConviteTurma, Anfitriao, placar } from '/js/jogo-revisao/aovivo-sala.js';
import { notaJogoRevisao, formatarNota, NOTA_MAX, PESO_INSIGNIAS, PESO_XP, XP_META, XP_DIA, notaXP } from '/js/jogo-revisao/nota.js';
import { configurarPrograme, ligarBotoesPrograme, abrirTela as abrirTelaProgrameBase, fecharTela as fecharTelaPrograme, mostrarCorrida, mensagemCorrida, mostrarCartao as cartaoPrograme,
  programaParaTexto, programaDeTexto, caixaDoQuadro } from '/js/jogo-revisao/programe.js';
import { faseDoDia, faseDaCorrida, resultadoCorrida, rodadaOQueFaz } from '/js/jogo-revisao/programe-logica.js';
import { estadoInicial as estadoInicialDamas, jogadasValidas as jogadasValidasDamas, aplicar as aplicarDamas, ehValida as ehValidaDamas, fimDeJogo as fimDeJogoDamas,
  contar as contarDamas, outro as outroLadoDamas, jogadaAleatoria as jogadaAleatoriaDamas, jogadaComputador as jogadaComputadorDamas, todasCapturas as todasCapturasDamas, N as N_DAMAS } from '/js/jogo-revisao/damas-logica.js';
import { abrirQuadroEstudos, ligarQuadroEstudos } from '/js/jogo-revisao/estudos.js';
import { criarFigura } from '/js/jogo-revisao/figuras.js';
import { criarPlano, definirPetPlano, faixaPara, pontosDoCaminho, movEntre, lerPar, fmt as fmtPlano, par as parPlano, CORES_PLANO } from '/js/jogo-revisao/plano.js';
import { configurarMapaPrograme, ligarMapaPrograme, temMapaPrograme, abrirMapaPrograme, esquecerPosicaoPet, temaDaFase, temaVila, chefeDaFase,
  medalhaDoChefe } from '/js/jogo-revisao/programe-mapa.js';

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
const GW = 344, GH = 192, CEL = 4;  // grade da trilha (cada pixel = 4×4 do mapa); cenas mais largas: g.gw (sala da Exposição: 544)
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
  unicornio: 40, dragao_azul: 30,   // PROMPT-129: azul −25% (era 40) e vermelho +25% (era 50): o vermelho ≈ 2 × o azul
  dragao_vermelho: 62.5,
};
// Evolução: cada fase é 15% maior que a anterior (altura do desenho SENTADO, não do quadro). Pet novo que evoluir:
// ALT_PET[adulto] = ALT_PET[filhote] × CRESCE_EVOLUCAO (e o mesmo em DIST_PET, logo abaixo)
const CRESCE_EVOLUCAO = 1.15;
// PROMPT-63: o desenho sentado do adulto mede 622 px no quadro de 808 (sprites.json → sentado_altura); a conta antiga usava 604,
// então o adulto aparecia 622/604 ≈ 3% maior que a tabela. ADULTO_ANTES = quanto o adulto era maior que o filhote na tela.
const ADULTO_ANTES = CRESCE_EVOLUCAO * 622 / 604;
// PROMPT-81: onde o personagem e o pet aparecem juntos, o dragão adulto SENTADO (desenho visível, chifre ao pé) tem a altura
// do personagem (o desenho dele = ALT_JOGADOR_MAPA no mapa = 55 na escala base), × a escala do sprites.json
// (quadro_por_pet[forma].escala: azul 0,75; vermelho e vermelho colorido 1,75 — PROMPT-86/129). sentado_altura do JSON = 439 px
// medidos no quadro de 566.
const ALT_BASE_PERSONAGEM = ALT_JOGADOR_MAPA / ESCALA_ATORES;   // 55
ALT_PET.dragao_azul_adulto = ALT_PET.dragao_vermelho_adulto = ALT_BASE_PERSONAGEM;
const ALT_PET_PADRAO = 30;   // pet que não estiver na tabela
// cores especiais do dragão (PROMPT-74/84): a cor é só visual; o tamanho é o do dragão de base.
// dragao_vermelho_{cor}[_adulto] → dragao_vermelho[_adulto]; dragao_{cor}[_adulto] → dragao_azul[_adulto]
const formaDeTamanho = (f) => String(f || '')
  .replace(/^dragao_vermelho_(?!adulto$)[a-z]+(?=(_adulto)?$)/, 'dragao_vermelho')
  .replace(/^dragao_(?!azul|vermelho)[a-z]+(?=(_adulto)?$)/, 'dragao_azul');
const altPet = (pet) => (ALT_PET[pet] ?? ALT_PET[formaDeTamanho(pet)] ?? ALT_PET_PADRAO) * escalaPet(pet);
// O quadro (sprites.json: tamanho_quadro, 898 × 704 nos filhotes e 1402 × 801 nos adultos) tem folga em cima para os
// pulos: sentado, o pet ocupa 604 px da altura (sentado_altura). Altura da IMAGEM para o pet sentado ficar com a altura da tabela:
const altImagemPet = (pet) => altPet(pet) / sentadoNoQuadro(pet);
// Telas em que o pet tem tamanho relativo ao filhote (batalha, Meu Pet, duelo do ginásio, evolução): quanto a IMAGEM da forma
// é maior que a do filhote. O desenho sentado fica ADULTO_ANTES × escala maior (o mesmo de antes no azul; +40% no vermelho).
const fatorForma = (pet, forma) => (ehFormaAdulta(forma) ? ADULTO_ANTES * escalaPet(forma) * sentadoNoQuadro(pet) / sentadoNoQuadro(forma) : 1);
// Revisão da semana (PROMPT-80): o dragão adulto ~30% maior (o vermelho continua 1,75 / 0,75 × o azul), até 58% da arena no CSS.
const DUELO_ADULTO = 1.3;
const fatorDuelo = (pet, forma) => fatorForma(pet, forma) * (ehFormaAdulta(forma) ? DUELO_ADULTO : 1);
// Duelo do ginásio e batalha (PROMPT-81): o dragão adulto fica o maior que couber na arena (o CSS calcula com cqw/cqh).
// O de maior escala (vermelho) ocupa o máximo; os outros ficam com escala / escalaMax disso (azul = 0,75 / 1,75).
const relDuelo = (forma) => escalaPet(forma) / escalaMax();
// caixas pequenas feitas para o filhote (coleção, HUD, chips, cartões): sem a escala, para nada ser cortado
const fatorFormaCaixa = (pet, forma) => fatorForma(pet, forma) / (ehFormaAdulta(forma) ? escalaPet(forma) : 1);
// Imagem pequena numa caixa feita para o filhote (coleção, HUD, chips, cartões): o quadro do adulto é mais largo
// (asas). O CSS de img[data-adulto] usa a proporção do filhote, recorta as sobras dos lados e aumenta a partir dos pés.
const attrForma = (pet, forma) => (ehFormaAdulta(forma) ? ` data-adulto style="--cresce-img:${fatorFormaCaixa(pet, forma).toFixed(3)}"` : '');
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
  verificarCampeoes();   // 🏆 Quadro dos Campeões (PROMPT-117)
  const { conquistadas, douradas, total } = contarInsignias();
  let festa = null;
  if (conquistadas >= total && !estado.mestre) { estado.mestre = { data: Date.now() }; gravar({ mestre: estado.mestre }); festa = 'mestre'; }
  if (douradas >= total && estado.mestre && !estado.lenda) { estado.lenda = { data: Date.now() }; gravar({ lenda: estado.lenda }); festa = 'lenda'; }
  if (festa) { publicarResumoInsignias(); enviarOnline({ titulo: meuTitulo() }); if (!$('tela-geral').hidden) desenharMarcadores(); }
  return festa;
}
// ── Comemoração do pet (PROMPT-65): frase de `comemora` (ou de `venceu`) do falas-pets.json, sem repetir a última ──
function fraseComemora(pet) {
  if (!pet) return null;
  const v = { pet: nomePet(pet), apelido: apelidoAluno || String(sessao.nome || '').split(' ')[0] };
  return fraseDe(pet, 'comemora', v) || fraseDe(pet, 'venceu', v);
}
// balão em cima do pet (batalha, festa), ~1 s depois que ele começa a comemorar
function falaVitoria(img, pet, onde) {
  const frase = fraseComemora(pet);
  if (!frase || !onde) return;
  onde.querySelector('.jr-fala-vitoria')?.remove();
  setTimeout(() => {
    if (!img.isConnected || img.closest('[hidden]')) return;
    const b = document.createElement('div');
    b.className = 'jr-fala-vitoria';
    b.textContent = frase;
    onde.appendChild(b);
    if (img.offsetParent === onde) {   // em cima do próprio pet (o palco da festa também tem o personagem)
      b.style.left = img.offsetLeft + img.offsetWidth / 2 + 'px';
      b.style.bottom = 'auto';
      b.style.top = Math.max(0, img.offsetTop + img.offsetHeight * 0.12 - b.offsetHeight - 8) + 'px';
    }
  }, semMovimento() ? 0 : 1000);
}
// No mapa, no salão ou no ginásio: o pet que segue o personagem toca `vitoria` e fala (insígnia nova, duelo vencido).
// false = o pet não tem a sequência (quem chamou usa a reação de antes).
function comemorarPetNaCena() {
  if (!seguidor?.pet || $('pet').hidden || !seguidor.comemorar('vitoria')) return false;
  const frase = fraseComemora(seguidor.pet);
  if (frase) setTimeout(() => {
    if (seguidor?.acao !== 'vitoria') return;
    pararFalaPet();
    const el = $('pet-fala');
    el.textContent = frase;
    el.hidden = false;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    conversa.falando = true;
    posicionarFalaPet();
    conversa.timer = setTimeout(pararFalaPet, duracaoBalao(frase));
  }, semMovimento() ? 0 : 1000);
  return true;
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
  pararSequencia(img);
  img.parentElement.querySelector('.jr-fala-vitoria')?.remove();
  if (forma && temSequencia(forma, 'vitoria')) {   // dragão adulto: alterna de lado e nariz empinado, para se achando e fala (PROMPT-65)
    aplicarVisualPet(img, pet);
    if (semMovimento()) img.src = quadrosSeq(forma, 'vitoria').at(-1);
    else { img.src = quadrosSeq(forma, 'vitoria')[0]; tocarSequencia(img, forma, 'vitoria', { deFrente: false }); }
    falaVitoria(img, pet, img.parentElement);
  } else if (forma) {
    aplicarVisualPet(img, pet);
    const anims = ehFormaAdulta(forma) ? ['animado', 'orgulhoso', 'rugido'] : temAnim(forma, 'pulo_cambalhota') ? ['pulo_cambalhota', 'feliz'] : ['feliz'];
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
      sc.scrollTo({ left: t.x / W * palco.clientWidth - sc.clientWidth / 2, top: t.y / H * palco.clientHeight - sc.clientHeight / 2, behavior: semMovimento() ? 'auto' : 'smooth' });
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
  const adulto = ehFormaAdulta(forma);
  img.toggleAttribute('data-adulto', adulto);
  if (adulto) img.style.setProperty('--cresce-img', fatorFormaCaixa(pet, forma).toFixed(3)); else img.style.removeProperty('--cresce-img');
}
// Distância normal do pet atrás do personagem (ao longo do rastro), em px na escala base (× ESCALA_ATORES no mapa).
// Parado, o pet chega a 55% disso; acima de +10 anda 1,3× mais rápido; acima de +62 corre (pets.js).
const DIST_PET = {
  elefante: 36, gato: 36, gaviao: 36, axolote: 36, tigre: 36,
  unicornio: 55, dragao_azul: 41.25, dragao_vermelho: 68.75,   // PROMPT-129: × 0,75 e × 1,25, com o tamanho
};
// cresce junto com o tamanho (mesma proporção distância/altura do filhote vermelho; distPet ainda × a escala do vermelho)
DIST_PET.dragao_azul_adulto = DIST_PET.dragao_vermelho_adulto = DIST_PET.dragao_vermelho * ALT_PET.dragao_azul_adulto / ALT_PET.dragao_vermelho;
const DIST_PET_PADRAO = 36;
const distPet = (pet) => (DIST_PET[pet] ?? DIST_PET[formaDeTamanho(pet)] ?? DIST_PET_PADRAO) * escalaPet(pet);
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
const altJogCena = () => (cena?.salao ? alturaSalao() : ALT_JOGADOR_MAPA);   // altura do personagem (e dos colegas) nesta cena
// dragão adulto (PROMPT-81): nos salões também mede pelo personagem (sentado = altura_personagem × escala), como no mapa e no ginásio
const escalaPetCena = (forma) => (cena?.salao ? alturaSalao() / (ehFormaAdulta(forma) ? ALT_BASE_PERSONAGEM : ALT_JOGADOR_MAPA)
  : cena?.tipo === 'mapa' ? ESCALA_ATORES : ESCALA_GINASIO);
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
const D = { geral: null, mapas: null, interiores: null, falas: null, regras: null, questoes: {} };

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
      g.primeiraTentativa = Number(gs?.primeira_tentativa) || null;   // 1ª luta com o líder (PROMPT-97, painel "Travados")
    }
    for (const [chave, ins] of Object.entries(v.insignias || {})) {
      const g = estado.ginasios[chave];
      if (!g || !ins) continue;
      g.insignia = true;
      g.dourada = !!ins.dourada;
      g.dataInsignia = ins.data || null;
      g.insAcertos = Number(ins.acertos_primeira) || 0; g.insTotal = Number(ins.total) || 0;   // 🏆 placa de vencedores (PROMPT-113)
    }
    estado.sequencia = v.sequencia || null;
    { const u = estado.sequencia?.ultimo_dia; conversa.voltou = !!u && u !== diaLocal() && (paraData(diaLocal()) - paraData(u)) / 86400000 >= 3; }
    estado.respostas = v.respostas || {};
    estado.petPerguntaDia = v.pet_pergunta_dia || null;
    estado.album = v.album && typeof v.album === 'object' ? { ...v.album } : {};   // 📒 { chave: { data, dourada } } (PROMPT-98)
    estado.albumCompleto = v.album_completo || null;   // 🗨️ { data, n, ultimo } (PROMPT-96)
    estado.treino = v.treino && typeof v.treino === 'object' ? { ...v.treino, caixas: { ...(v.treino.caixas || {}) } } : {};   // 🎯 Treino do pet (PROMPT-91)
    estado.pets = lerPets(v);   // validado depois de ler o sprites.json (cachorro/porco antigos são ignorados)
    estado.petCor = typeof v.pet_cor === 'string' ? v.pet_cor : null;   // cor especial do dragão (PROMPT-74): null = normal
    estado.semConvites = !!v.sem_convites;   // "Não receber convites" (PROMPT-76)
    estado.vencedoresPublicado = !!v.vencedores_publicado;   // 🏆 as insígnias antigas já foram para a placa (PROMPT-113)
    estado.coresLiberadas = v.cores_liberadas && typeof v.cores_liberadas === 'object' ? { ...v.cores_liberadas } : {};   // { cor: true } — para sempre
    liberarCoresDaConta();
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
    estado.presentesRecebidos = Number(v.presentes_recebidos) || 0;   // 🎁 só o número (PROMPT-103)
    estado.casinha = lerCasinha(v.casinha);   // 🏠 { guardados, moveis, cama_gratis } (PROMPT-105)
    estado.pescaEspecies = v.pesca_especies && typeof v.pesca_especies === 'object' ? { ...v.pesca_especies } : null;   // 🐠 { peixe: vezes } (PROMPT-106)
    estado.desafiosDia = v.desafios_dia || null;
    estado.apostasPendentes = v.apostas_pendentes && typeof v.apostas_pendentes === 'object' ? { ...v.apostas_pendentes } : {};   // 💰 { duelo: { valor, ts } } (PROMPT-154)
    estado.damasCpuDia = v.damas_cpu_dia || null;
    estado.xpJogo = { total: Number(v.xp_jogo?.total) || 0, dia: v.xp_jogo?.dia || null, comida: v.xp_jogo?.comida || null, expo: { ...(v.xp_jogo?.expo || {}) } };   // ⭐ XP do jogo (PROMPT-156)   // ♟️ { data, n } — vitórias contra o computador que valeram moedas hoje
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
    if (!estado.pescaEspecies) {   // 🐠 1ª vez: os peixes que já estão na bolsa entram no registro do aquário (PROMPT-106)
      estado.pescaEspecies = {};
      for (const [id, n] of Object.entries(estado.pets?.bolsa || {})) if (id.startsWith('pesca_') && Number(n) > 0) estado.pescaEspecies[id.slice(6)] = Number(n);
      if (Object.keys(estado.pescaEspecies).length) gravar({ pesca_especies: estado.pescaEspecies });
    }
    if (!v.pets?.moedas_iniciais) {   // 🪙 todo jogador começa com 100 moedas — uma vez só (quem já jogava também recebe)
      estado.pets.moedas = (Number(estado.pets.moedas) || 0) + MOEDAS_INICIAIS;
      gravar({ 'pets/moedas': estado.pets.moedas, 'pets/moedas_iniciais': true });
      if (!estado.novo) setTimeout(() => avisoPet(`🎁 Presente de boas-vindas: +${MOEDAS_INICIAIS} 🪙`, true), 2500);
    }
    if (v.presente_login_dia !== diaLocal()) {   // 🎁 presente diário: +100 moedas na 1ª entrada do dia
      const patch = { presente_login_dia: diaLocal() };
      estado.pets.moedas = (Number(estado.pets.moedas) || 0) + MOEDAS_LOGIN_DIA;
      patch['pets/moedas'] = estado.pets.moedas;
      registrarGanho('login', MOEDAS_LOGIN_DIA, patch);
      gravar(patch);
      if (!estado.novo) setTimeout(() => { avisoPet(`🎁 Presente do dia: +${MOEDAS_LOGIN_DIA} 🪙`, true); moedasVoando(MOEDAS_LOGIN_DIA); }, v.pets?.moedas_iniciais ? 2500 : 5000);
    }
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
    aplicarMusicaOff(c.musica_off);   // a professora desliga a música (PROMPT-88)
    apostasOff = c.apostas_off || {};
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

// Placar das 5 turmas, no estojo (PROMPT-131: painel do kit, etiqueta colorida da turma e barra verde)
const COR_TURMA_PLACAR = { '8D': '#8a2be2', '8E': '#e0283a', '8F': '#1f9a3c', '8G': '#f07a12', '8H': '#2f3fd8' };
function renderPlacar() {
  const el = $('estojo-placar');
  const linhas = TURMAS_PLACAR
    .map(t => ({ t, ins: insigniasDaTurma(t), dour: Number(placarTurmas[t]?.douradas) || 0 }))
    .sort((a, b) => (b.ins - a.ins) || (b.dour - a.dour) || a.t.localeCompare(b.t));
  el.innerHTML = `<h2>🏆 Placar das turmas <small>meta: ${metaTurma} insígnias</small></h2>` +
    linhas.map(({ t, ins, dour }) => `
      <div class="ins-linha${t === sessao.turma ? ' minha' : ''}">
        <div class="ins-turma" style="background:${COR_TURMA_PLACAR[t] || '#5b5f86'}">${t}</div>
        <div class="ins-barra"><span style="width:${Math.min(100, ins / metaTurma * 100)}%"></span></div>
        <div class="ins-num">${ins} · <small>${dour} dourada${dour === 1 ? '' : 's'}</small></div>
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
    g.insAcertos = soma.acertos; g.insTotal = soma.total;
    publicarVencedor(chave);   // 🏆 placa do ginásio (PROMPT-113)
  }
  if (p === 'revanche' && g.dourada) { patch[`insignias/${chave}/dourada`] = true; publicarVencedor(chave); }   // ✨ na placa também
  gravar(patch);
}

// ⭐ XP do jogo (PROMPT-156): contador próprio, vale 2,0 da nota (js/jogo-revisao/nota.js). No máximo XP_DIA por dia (o que passar
// não conta). Separado do XP geral do site (darXP). Professora, modo teste e contas de teste: conta na tela, não grava.
//   xp_jogo = { total, dia: { data, n }, comida: { data, n } }   (comida: quantas vezes o alimentar já deu XP hoje)
const xpJogoGrava = () => carregouProgresso && !teste && !ehProfessora() && !contaEscondida(sessao?.uid, sessao?.nome);
function ganharXPJogo(n, motivo = '') {
  n = Math.round(Number(n) || 0);
  if (n <= 0 || !estado?.xpJogo) return 0;
  const x = estado.xpJogo, hoje = diaLocal();
  if (x.dia?.data !== hoje) x.dia = { data: hoje, n: 0 };
  const g = Math.min(n, XP_DIA - (Number(x.dia.n) || 0));
  if (g <= 0) return 0;
  x.total += g;
  x.dia = { data: hoje, n: (Number(x.dia.n) || 0) + g };
  if (xpJogoGrava()) gravar({ 'xp_jogo/total': x.total, 'xp_jogo/dia': x.dia });
  mostrarXPJogo(g, motivo);
  return g;
}
// "+N ⭐" pequeno, no canto (o "+XP" do site sobe no meio)
function mostrarXPJogo(n) {
  const el = document.createElement('div');
  el.className = 'jr-xp-jogo';
  el.textContent = `+${n} ⭐`;
  $('jr-app').appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 2600);
}
// Retroativo (uma vez por aluno, em qualquer aparelho): o XP do que já está registrado, sem o limite do dia
const XP_JOGO = { pergunta: 2, treinador: 10, lider: 20, revanche: 40, batalha: 10, peixe: 3, peixe_raro: 10, fase: 15, bug: 15 };
function xpJogoDoQueJaFez() {
  const perguntas = Object.entries(estado.respostas || {}).filter(([id, r]) => RE_ID.test(id) && r?.acertou === true).length;
  let n = perguntas * XP_JOGO.pergunta;
  for (const g of Object.values(estado.ginasios || {})) {
    for (const t of ['treinador1', 'treinador2', 'treinador3']) if (g?.[t]?.vencido) n += XP_JOGO.treinador;
    if (g?.lider?.vencido) n += XP_JOGO.lider;
    if (g?.revanche?.vencido || g?.dourada) n += XP_JOGO.revanche;
  }
  for (const b of Object.values(estado.batalhas || {})) n += (Number(b?.vitorias) || 0) * XP_JOGO.batalha;
  for (const [id, q] of Object.entries(estado.pescaEspecies || {})) n += (Number(q) || 0) * (peixeEhRaro(id) ? XP_JOGO.peixe_raro : XP_JOGO.peixe);
  n += Object.values(estado.programe?.fases || {}).filter(f => Number(f?.estrelas) > 0).length * XP_JOGO.fase;
  n += Object.values(estado.programe?.bugs || {}).filter(b => Number(b?.estrelas) > 0).length * XP_JOGO.bug;
  return n;
}
async function xpJogoRetroativo() {
  if (!xpJogoGrava() || !estado?.xpJogo || estado.avisos?.xp_jogo_retro) return;
  const n = xpJogoDoQueJaFez(), marca = { n, ts: Date.now() };
  try {   // transação: dois aparelhos ao mesmo tempo não recebem duas vezes
    const t = await runTransaction(ref(db, `${raiz()}/avisos/xp_jogo_retro`), (cur) => (cur ? undefined : marca));
    (estado.avisos ||= {}).xp_jogo_retro = t.snapshot.val() || marca;
    if (!t.committed) return;
  } catch (e) { console.warn('[jogo-revisao] XP retroativo', e?.code || e); return; }
  if (n <= 0) return;
  estado.xpJogo.total += n;
  gravar({ 'xp_jogo/total': estado.xpJogo.total });
  avisoPet(`⭐ Você ganhou ${n.toLocaleString('pt-BR')} de experiência pelo que já fez no jogo!`, true);
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
    desafiar: (uid, modo, aposta) => desafiarColega(colegas.get(uid), modo, aposta), colegas: () => [...colegas.keys()],
    mapa: (n) => abrirMapa(n, 'entrada'), pescar: () => { const p = pontosDoMapa(cena.n)[0]; if (p) sentarPesca(p); return !!p; }, pergunta: (chave, p) => abrirPergunta(chave, p),
    festa: (t) => mostrarFestaMestre(t || 'mestre'), hall: () => abrirHallMestres(), estado: () => estado, geral: () => abrirMapaGeral(),
    batalhar: (id) => iniciarBatalha(id), pg: () => pg, meuPet: () => (abrirMeuPet(), mp), mp: () => mp, carinho: () => carinhoPet(),
    truque: (id) => fazerTruque(id), comer: (id) => darComida(id) };

  try {
    const pegar = (p) => fetch(`${DADOS}/${p}`).then(r => { if (!r.ok) throw new Error(p); return r.json(); });
    const [pers, geral, mapas, interiores, geralQ, ...qs] = await Promise.all([
      pegar('personagens.json').catch(e => { console.warn('[jogo-revisao] personagens.json indisponível', e); return null; }),
      pegar('mapa-geral.json'), pegar('mapas.json'), pegar('interiores.json'),
      pegar('questoes/geral.json'),
      ...Array.from({ length: NUM_MAPAS }, (_, i) => pegar(`questoes/mapa${i + 1}.json`)),
    ]);
    Object.assign(D, { geral, mapas, interiores, falas: geralQ.falas, regras: geralQ.regras });
    qs.forEach(q => { D.questoes[q.mapa] = q; });
    if (pers) definirPersonagens(pers);
  } catch (e) {
    console.error('[jogo-revisao] erro ao carregar dados', e);
    $('jr-carregando').textContent = 'Não foi possível carregar o jogo. Tente recarregar a página.';
    return;
  }

  await carregarEstado();
  resolverApostasPendentes();   // 💰 apostas de desafios que ficaram no meio (fechou o jogo, caiu a internet)
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
  try {   // 🏠 Casinha (PROMPT-105); ?casinha=cheia (modo teste): 1 de cada móvel nos guardados, sem gastar e sem gravar
    CASA = await fetch(`${DADOS}/casinha.json`).then(r => { if (!r.ok) throw new Error('casinha.json'); return r.json(); });
    if (teste && new URLSearchParams(location.search).get('casinha') === 'cheia' && estado.casinha) {
      casaSemGravar = true;
      for (const it of CASA.itens || []) estado.casinha.guardados[it.id] = Math.max(1, Number(estado.casinha.guardados[it.id]) || 0);
    }
  } catch (e) { console.warn('[jogo-revisao] casinha indisponível', e); }
  try {   // 🏘️ Vila das Casinhas (PROMPT-109); ?vila=cheia (modo teste): 2 vizinhos de mentira, sem gravar
    VILA = await fetch(`${DADOS}/vila.json`).then(r => { if (!r.ok) throw new Error('vila.json'); return r.json(); });
    vilaCheia = teste && new URLSearchParams(location.search).get('vila') === 'cheia';
  } catch (e) { console.warn('[jogo-revisao] vila indisponível', e); }
  try { FLIPER = await fetch(`${DADOS}/fliperama.json`).then(r => { if (!r.ok) throw new Error('fliperama.json'); return r.json(); }); }
  catch (e) { console.warn('[jogo-revisao] fliperama indisponível', e); }
  try { definirBatalhas(await fetch(`${DADOS}/batalhas.json`).then(r => { if (!r.ok) throw new Error('batalhas.json'); return r.json(); })); }
  catch (e) { console.warn('[jogo-revisao] batalha de pets indisponível', e); }
  try {
    [PROG, LAB] = await Promise.all(['programe-o-pet.json', 'laboratorio.json'].map(f => fetch(`${DADOS}/${f}`).then(r => { if (!r.ok) throw new Error(f); return r.json(); })));
  } catch (e) { console.warn('[jogo-revisao] laboratório / Programe o pet indisponível', e); }
  try { BUGS = (await fetch(`${DADOS}/caca-ao-bug.json`).then(r => { if (!r.ok) throw new Error('caca-ao-bug.json'); return r.json(); })).bugs || null; }
  catch (e) { console.warn('[jogo-revisao] Caça ao bug indisponível', e); }
  try { MAPA_PG = await fetch(`${DADOS}/mapa-programe.json`).then(r => { if (!r.ok) throw new Error('mapa-programe.json'); return r.json(); }); }
  catch (e) { console.warn('[jogo-revisao] mapa da Ilha dos Robôs indisponível (fica a lista de fases)', e); }
  ESTUDOS = await fetch(`${DADOS}/estudos.json`).then(r => (r.ok ? r.json() : null)).catch(() => null);
  iniciarExposicao(await fetch(`${DADOS}/exposicao.json`).then(r => (r.ok ? r.json() : null)).catch(() => null));   // 🖼️ sem ele: sem pavilhão   // 📜 Quadro de Estudos (sem ele: nenhum quadro)
  falarCurioParam = teste && new URLSearchParams(location.search).get('falar') === 'curiosidade';
  [ALBUM, CURIO] = await Promise.all(['album.json', 'curiosidades.json'].map(f => fetch(`${DADOS}/${f}`).then(r => (r.ok ? r.json() : null)).catch(() => null)));   // 📒💡 (PROMPT-98)
  LUZES = await fetch(`${DADOS}/luzes.json`).then(r => (r.ok ? r.json() : null)).catch(() => null);   // 🌙 luzes da noite (sem ele: só a cor)
  iniciarDiaNoite();
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
    liberarCoresDaConta();   // as cores vêm do sprites.json (carregado depois do progresso)
    const [qw, qh] = tamanhoQuadro();
    document.documentElement.style.setProperty('--pet-quadro', `${qw} / ${qh}`);   // proporção do lutador na batalha
  } catch (e) { console.error('[jogo-revisao] pets indisponíveis', e); }
  configurarPrograme({
    pet: () => { const p = petsOk && estado?.pets?.ativo; return p ? { pet: p, forma: formaDe(p), tinta: tintaVisivel(p), nome: nomePet(p) } : null; },
    quadrosDe, temAnim, sentadoNoQuadro, escalaPet, escalaMax, tocar, esc, agora: agoraServ,
    temSequencia, tocarSequencia, pararSequencia, quadrosSeq, fraseComemora: (pet) => fraseComemora(pet),
    pintar: (img, p) => aplicarTinta(img, p.tinta || null),
    imgComida: (pet) => caminhoImg((comidas().find(c => pet && ehFavorita(pet, c) && c.imagem) || comidas().find(c => c.id === 'racao'))?.imagem || ''),   // a favorita com imagem (a carne é só emoji)
    imgPetisco: () => caminhoImg(comidas().find(c => c.id === 'biscoito')?.imagem || ''),
  });
  configurarMapaPrograme({
    pet: () => { const p = petsOk && !petFora() && estado?.pets?.ativo; return p ? { pet: p, forma: formaDe(p), tinta: tintaVisivel(p) } : null; },
    quadrosDe, sentadoNoQuadro, escalaPet, esc, caminho: caminhoImg,
    pintar: (img, p) => aplicarTinta(img, p.tinta || null),
    fases: fasesPg, progFase, faseLiberada, medalhas: () => estado.programe.medalhas || {},
    abrirFase: (id) => abrirFasePrograme(id), abrirDia: () => abrirDesafioDia(), abrirFantasma: () => abrirFantasma('mapa'),
    aoSair: () => sairDaIlha(),   // ✕ da Ilha: volta para onde ela foi aberta (PROMPT-132)
  }, MAPA_PG);
  preCarregarQuadros(meuPersonagem());
  ligarEventos();
  atualizarContador();
  requestAnimationFrame(loop);
  // começa na Praça, em frente à fonte (PROMPT-73); aluno ainda sem pet: o mapa geral, como antes (o pet inicial vem ao entrar num mapa)
  const salaDireto = Number(new URLSearchParams(location.search).get('sala')) || 0;   // 🖼️ ?sala=N (professora / modo teste)
  // (modo teste com ?expo=aluno: só se a sala estiver aberta para ele, como um visitante de fora)
  const comecaNaSala = !!(EXPO && salaDireto && (privilegioExpo() || teste) && podeEntrarSala(salaDireto));
  const comecaNaPraca = !comecaNaSala && pracaPronta() && petsOk && petValido(estado.pets?.ativo);
  if (comecaNaSala) abrirSalaExpo(salaDireto).catch(() => abrirMapaGeral()).finally(() => { $('jr-carregando').hidden = true; });
  else if (!comecaNaPraca) { abrirMapaGeral(); $('jr-carregando').hidden = true; }
  { const f = verificarMestre(); if (f) setTimeout(() => mostrarFestaMestre(f), 1500); }
  carregarTitulos();
  iniciarAlbum();
  iniciarPet();
  setTimeout(verificarCores, 2500);   // quem já cumpriu as condições ganha as cores (aviso uma vez)
  setTimeout(avisarCorSoVermelho, 3200);
  setTimeout(bonusMoedasRetroativo, 1800);   // 🎁 PROMPT-133
  setTimeout(xpJogoRetroativo, 6000);       // ⭐ PROMPT-156 (depois dos outros avisos da entrada)
  setTimeout(avisarTrocaPersonagem, 4200);
  if (comecaNaPraca) abrirPraca('fonte').catch(() => abrirMapaGeral()).finally(() => { $('jr-carregando').hidden = true; });
  atualizarBotaoMissoes();
  entrarOnline().catch(() => {}).then(() => { carregarPremiosPesca(); ouvirPresentes(); avisarCoracoes(); ouvirVila(); iniciarPraca(); publicarResumoInsignias(); publicarVencedoresAntigos(); migrarQuadrosV2(); ouvirConvitesAoVivo(); });
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
  'mapa7-B':  'unicornio',        // Supermercado (Mercado Central)
  'mapa9-B':  'dragao_vermelho',  // Torre do Mago (Floresta das Balanças)
  // PROMPT-146: o dragão azul deixou de ser prêmio (quem já tem continua com ele); o mapa11-B não dá mais pet
};
const INICIAIS = ['elefante', 'gato', 'gaviao'];
const MOEDAS_INICIAIS = 100;
const MOEDAS_LOGIN_DIA = 100;   // 🎁 presente diário (1ª entrada do dia)
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
    bolsa: { ...(v.pets?.bolsa || {}) }, tintas: { ...(v.pets?.tintas || {}) }, efeitos: { ...(v.pets?.efeitos || {}) }, cuidadosV2: !!v.pets?.cuidados_v2,
    expedicoesDia: v.pets?.expedicoes_dia || null };   // 🧭 { data, n } (PROMPT-92)
}

const temPet = (p) => !!(p && estado.pets.conquistados[p]);
// Já levou o pet deste ginásio? Pet fixo: já tem o pet que o ginásio dá AGORA (PROMPT-146: a tabela mudou, a `origem`
// gravada pode ser de outro ginásio). 'inicial': pela `origem`, como antes.
const conquistadoEm = (chave) => {
  const p = PETS_GINASIO[chave];
  if (p && p !== 'inicial') return temPet(p);
  return Object.values(estado.pets.conquistados).some(c => c?.origem === chave);
};
// Pet que ainda dá para conquistar (inicial ou prêmio de ginásio): os outros só aparecem na coleção para quem já tem
const petConquistavel = (p) => INICIAIS.includes(p) || Object.values(PETS_GINASIO).includes(p);

function iniciarPet() {
  if (!petsOk) return;
  seguidor = new PetSeguidor($('pet'), $('pet-sombra'));
  seguidor.evitar = (x, y) => ladoForaDaPorta(x, y, [jog.x, jog.y]);   // 🐾 não para em cima de portas (PROMPT-155)
  if (window.jogoRevisaoDev) window.jogoRevisaoDev.seguidor = seguidor;   // só no modo dev (?dev=1 no modo teste)
  $('btn-trocar-pet').hidden = false;
  // pet que não existe no sprites.json (ex.: cachorro, porco de testes antigos) é ignorado
  const ps = estado.pets;
  migrarCapivara(ps);
  for (const p of Object.keys(ps.conquistados)) if (!petValido(p)) delete ps.conquistados[p];
  liberarPetsProfessora(ps);
  if (!temPet(ps.ativo)) ps.ativo = Object.keys(ps.conquistados)[0] || null;
  if (ps.migrou && ps.ativo) gravar({ 'pets/ativo': ps.ativo, 'pets/conquistados': ps.conquistados });   // por campo: não apaga as moedas
  delete ps.migrou;
  normalizarCuidados();
  datarPetsAntigos();   // 🎂 (PROMPT-102) pet sem `data`: começa a contar hoje
  if (ps.ativo) { preCarregarPet(formaDe(ps.ativo)); seguidor.definir(petFora(ps.ativo) ? null : ps.ativo, formaDe(ps.ativo)); atualizarVisualPet(); }   // em expedição: não segue
  if (falasProntas()) verificarMarcosLealdade(ps.ativo);
  verificarEvolucao(ps.ativo);   // quem já tinha lealdade 100 (e ainda não evoluiu) evolui ao entrar
  atualizarFomeSeguidor();
}

// Login da professora (menu do professor): todos os pets na coleção e as formas adultas liberadas, sem precisar
// vencer líderes nem chegar à lealdade 100 (amizade ❤️ 1). O interruptor "Mostrar como filhote" (Meu Pet → Visual) troca entre as formas.
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
  seguidor.definir(petFora(pet) ? null : pet, formaDe(pet));   // em expedição: não segue (os outros pets podem ir junto)
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
  const ordem = PETS.filter(p => petValido(p) && (temPet(p) || petConquistavel(p))).sort((a, b) => temPet(b) - temPet(a));
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
    verificarEvolucao(pet);   // voltou a ser o ativo com lealdade 100
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
  atualizarRelogioExp();
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
// Forma na tela: o adulto depois da evolução (lealdade 100, amizade ❤️ 1), a não ser que o aluno prefira ver o filhote (Meu Pet → Visual)
// forma desenhada: filhote ou adulto (evoluiu e não pediu para mostrar o filhote) e, nos dragões, com a cor especial escolhida
const formaBase = (pet) => { const a = formaAdulta(pet), c = a && cuidadosDe(pet); return c?.evoluido && !c.mostrar_filhote ? a : pet; };
const formaDe = (pet) => formaComCor(formaBase(pet), corAtiva(pet));
// cor especial do dragão (PROMPT-74): pet_cor do aluno, só se liberada e só nos dragões; com cor, a tinta não é aplicada
const corAtiva = (pet) => (aceitaCor(pet) && estado?.petCor && estado.coresLiberadas?.[estado.petCor] && coresDragao()[estado.petCor] ? estado.petCor : null);
const tintaVisivel = (pet) => (pet && !corAtiva(pet) ? cuidadosDe(pet)?.tinta || null : null);
const barrigaDe = (pet) => { const c = cuidadosDe(pet); return c ? barrigaDoPet(c, pet === estado.pets.ativo) : 100; };

// Pet ativo com fome (barriga < fome_abaixo) fica triste quando parado no mapa
function atualizarFomeSeguidor() {
  if (seguidor) seguidor.fome = !cs?.ida?.pote && !!estado.pets.ativo && barrigaDe(estado.pets.ativo) < fomeAbaixo();   // 🥣 no pote: a fome não corta a sequência
}

// +1 moeda na PRIMEIRA vez que o aluno acerta cada pergunta (id da pergunta); refazer não dá moeda (PROMPT-47)
function ganharMoeda() {
  if (!estado?.pets) return;
  const n = comMult(1);
  estado.pets.moedas = (Number(estado.pets.moedas) || 0) + n;
  const patch = { 'pets/moedas': estado.pets.moedas };
  registrarGanho('ginasio', n, patch);
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

// ── Evolução: com lealdade 100 (amizade ❤️ 1, PROMPT-121) o pet ativo vira adulto (se houver forma adulta em sprites.json → evolucao). Uma vez por pet;
// é o mesmo pet (lealdade, barriga, amizade, nome, tinta e efeito continuam), só muda a forma. ──
const LEALDADE_EVOLUCAO = 100;
let evoPendente = null;   // pet que evolui assim que nada estiver na frente (batalha, pergunta, troca de cena)
let evo = null;           // cena em andamento: { pet, anim (PetParado do adulto), timers }

function verificarEvolucao(pet = estado?.pets?.ativo) {
  const c = pet && cuidadosDe(pet);
  // em expedição: não agora (evolui quando o jogo verificar de novo com ele de volta)
  if (!petsOk || !c || c.evoluido || pet !== estado.pets.ativo || petFora(pet) || !formaAdulta(pet) || (Number(c.lealdade) || 0) < LEALDADE_EVOLUCAO) return;
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
  const c = cuidadosDe(pet), adulto = formaComCor(formaAdulta(pet), corAtiva(pet));   // a cor especial continua no adulto
  c.evoluido = true;
  gravar({ [`pets/conquistados/${pet}/evoluido`]: true });
  preCarregarPet(adulto);
  pararFalaPet();
  soltarJoystick();
  const el = $('pet-evolucao'), palco = el.querySelector('.jr-evo-palco'), fi = $('evo-filhote'), ad = $('evo-adulto');
  fi.src = quadrosDe(formaComCor(pet, corAtiva(pet)), 'sentado_girando')[0];
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
  mp = { pet, forma, anim: new PetParado(img), estado: '', corpoAnim: null, ocupado: false, esperaAcao: null };
  img.dataset.src = '';
  mp.anim.definir(forma);
  medirMeuPet();
  for (const id of ['mp-bolsa-painel', 'mp-visual-painel', 'mp-nomear', 'mp-exp-painel', 'mp-exp-confirma']) $(id).hidden = true;
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
  renderTruques();   // a fileira de truques embaixo do pet: antes de medir o palco (ela ocupa parte da altura)
  const palco = $('mp-palco'), { pet, forma } = mp;
  let h = Math.min(palco.clientHeight * 0.78, MP_ALT_MAX);
  if (ehFormaAdulta(forma)) {
    const [qw, qh] = tamanhoQuadro(forma);
    h = Math.min(h * fatorForma(pet, forma), palco.clientWidth * 0.98 / DESENHO_NO_QUADRO * qh / qw);
    // o desenho sentado (do pé, a 10% do palco, até o chifre) não passa do topo do palco (o vermelho é 1,75 / 0,75 × o azul, PROMPT-86/129)
    // (sentado_altura + ~1% de folga embaixo do pé, em fração do quadro)
    h = Math.min(h, palco.clientHeight * 0.88 / (sentadoNoQuadro(forma) + 0.01));
  }
  $('mp-img').style.height = h + 'px';
  $('mp-palco').classList.toggle('largo', ehFormaAdulta(forma));   // adulto: asas, comida e fogo podem passar da borda do palco
}

function fecharMeuPet() {
  $('meu-pet').hidden = true;
  mp?.som?.parar(300);   // fechou o Meu Pet: o som do truque para com fade
  pararSequencia($('mp-img'));   // trocou de tela: interrompe a ação do pet
  mp?.corpoAnim?.cancel();
  mp = null;
}

function renderMeuPet() {
  if (!mp) return;
  renderTruques();
  const pet = mp.pet, c = cuidadosDe(pet);
  const b = Math.round(barrigaDe(pet)), fb = faixaBarriga(b);
  const l = Math.round(Number(c.lealdade) || 0);
  const nivel = nivelPet(pet), pp = cfgLoja().amizade?.pontos_por_nivel || 100;
  $('mp-nome').innerHTML = `${esc(nomePet(pet))}${nivel >= 10 ? ' <span class="mp-coroa" title="Amizade nível 10">👑</span>' : ''}` +
    (nivel >= 2 ? ` <span class="mp-nivel" title="Nível de amizade">❤️ ${nivel}</span>` : '');
  $('mp-palco').classList.toggle('moldura-prata', nivel >= 2 && nivel < 5);
  $('mp-palco').classList.toggle('moldura-ouro', nivel >= 5);
  renderBotaoMeusPets();
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
    [LEALDADE_CAMBALHOTA, 'aprende a cambalhota 🤸'], [100, formaAdulta(pet) && !c.evoluido ? 'começa a amizade ❤️ e vira adulto ✨' : 'começa a amizade ❤️'],
    ...(truquesDe(pet) || []).filter(t => t.lealdade > 0).map(t => [t.lealdade, `aprende o truque ${t.nome} ${t.emoji}`])]
    .filter(([v], i, t) => t.findIndex(([w]) => w === v) === i).sort((a, b) => a[0] - b[0]);
  const prox = marcos.find(([v]) => l < v);
  $('mp-marco').textContent = prox
    ? `Próximo: ${prox[0]} — ${prox[1]}`
    : `Amizade ❤️ ${nivel} — faltam ${pp - Math.floor((Number(c.amizade) || 0) % pp)} para o próximo nível`;
  $('mp-info-balao').innerHTML = `<b>Como a lealdade sobe</b> Carinho (até ${CARINHOS_POR_DIA} por dia), comida e jogar todo dia. Ficando muitos dias sem jogar, ela cai um pouco.
    <b>Marcos</b> Com ${lc}, ${esc(nomePet(pet))} começa a conversar${LEALDADE_CAMBALHOTA === lc ? ' e aprende a cambalhota' : ''}.${LEALDADE_CAMBALHOTA !== lc ? ` Com ${LEALDADE_CAMBALHOTA}, aprende a cambalhota.` : ''} Com ${ld}, dá dicas nos ginásios; com ${le}, elimina uma opção.${formaAdulta(pet) ? ` Com 100 de lealdade, ${esc(nomePet(pet))} vira adulto!` : ''}
    Acima de 100, cada ${pp} pontos sobem um nível de amizade ❤️ (moldura de prata no 2, corações ao seguir no 3, moldura dourada no 5, coroa no 10).${truquesDe(pet) ? `
    <b>Truques ✨</b> ${truquesDe(pet).map(t => `${t.emoji} ${esc(t.nome)} ${t.lealdade > 0 ? t.lealdade : '(desde o início)'}`).join(' · ')}.` : ''}`;
  atualizarBotaoTreino();
  $('mp-presentes').textContent = estado.presentesRecebidos ? `🎁 Presentes recebidos: ${estado.presentesRecebidos}` : '';
  pintarExpMeuPet();
  pintarChapeuMeuPet();
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
  const b = $('mp-letra');   // chave no Meu Pet → Visual (PROMPT-99; antes ficava no estojo de insígnias)
  if (b) { $('mp-letra-txt').textContent = `Aa Letra grande: ${g ? 'ligado' : 'desligado'}`; b.setAttribute('aria-checked', String(g)); b.classList.toggle('ligado', g); }
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

// À noite (22h às 6h, horário de Brasília) o pet dorme no Meu Pet; tocar nele acorda por alguns minutos
const ACORDADO_MS = 5 * 60e3;
function horaDeDormir() {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  return h >= 22 || h < 6;
}
const deveDormir = () => horaDeDormir() && !(mp?.acordadoAte > Date.now());
function acordarPet() {
  mp.acordadoAte = Date.now() + ACORDADO_MS;
  mp.estado = 'acordando'; mp.ocupado = true;
  falarPet('🥱 Uaaah… acordei!');
  if (temAnim(mp.forma, 'calmo')) mp.anim.tocar('calmo', voltarAoNormal); else voltarAoNormal();   // espreguiça e volta ao normal
}

// Volta ao estado de descanso: dormindo (à noite), triste (fome) ou sentado
function voltarAoNormal() {
  if (!mp) return;
  mp.ocupado = false; mp.esperaAcao = null;
  if (deveDormir()) {   // o adulto toca `dormir` em ciclo (respira, fumacinha, Zzz); os outros, a animação dormindo
    mp.estado = 'dormindo';
    if (!mp.anim.sequencia('dormir', null, { ciclo: true })) mp.anim.tocar('dormindo');
    movimentoCorpo('respira');
  } else if (barrigaDe(mp.pet) < fomeAbaixo()) { mp.estado = 'triste'; mp.anim.tocar('triste_fome'); movimentoCorpo('triste'); }
  else { mp.estado = 'parado'; mp.anim.tocar('sentado_girando'); movimentoCorpo('respira'); }
  renderMeuPet();
}

// A cada quadro (dentro do loop do jogo)
function atualizarMeuPet(dt) {
  if (!mp) return;
  mp.anim.atualizar(dt);
  if (mp.estado === 'parado' && mp.anim.anim === 'sentado_girando') {
    const aoAcabar = () => { if (mp?.estado === 'parado') voltarAoNormal(); };
    if (temSequencia(mp.forma, 'descansar')) {   // adulto: sentado de frente; a cada 6 a 10 s vira de lado (sentado_2, ~2 s) e volta;
      if (mp.esperaAcao == null) mp.esperaAcao = 6000 + Math.random() * 4000;   // a cada 3ª vez, em vez de virar, cheira, se lambe, descansa ou ruge
      mp.esperaAcao -= dt * 1000;
      if (mp.esperaAcao <= 0) {
        mp.esperaAcao = null;
        mp.viradas = (mp.viradas || 0) + 1;
        const a = mp.viradas % 3 === 0 && sortearAcaoParado(mp.forma);
        if (a) mp.anim.sequencia(a, aoAcabar); else mp.anim.tocar('sentado_2', aoAcabar);
      }
    } else if (mp.anim.ciclos >= 3) mp.anim.tocar(sortearOcioso(), aoAcabar);   // a cada 3 ciclos: fareja, se lambe, descansa… (sem repetir)
  }
  // com fome: o adulto (sequência `fome`) cheira o ar duas vezes e lambe os beiços a cada ~10 s, no lugar da pose triste parada
  if (mp.estado === 'triste' && mp.anim.anim === 'triste_fome' && temSequencia(mp.forma, 'fome')) {
    if (mp.esperaAcao == null) mp.esperaAcao = 2000 + Math.random() * 1000;   // a 1ª logo; depois ~10 s
    mp.esperaAcao -= dt * 1000;
    if (mp.esperaAcao <= 0) {
      mp.esperaAcao = null;
      mp.anim.sequencia('fome', () => { if (mp?.estado === 'triste') { voltarAoNormal(); if (mp) mp.esperaAcao = 4500 + Math.random() * 2000; } });
    }
  }
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
  b.innerHTML = `<span class="mp-balao-txt">${esc(texto)}</span>`;   // no máximo 3 linhas (o corte fica no texto: o rabinho aparece)
  b.hidden = false;
  clearTimeout(mp.timerBalao);
  mp.timerBalao = setTimeout(() => { b.hidden = true; }, tempoLeitura(texto));   // tempo de leitura (PROMPT-137)
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
  if (!mp || mp.ocupado || petFora(mp.pet)) return;   // em expedição: sem carinho
  if (mp.estado === 'dormindo') { acordarPet(); return; }   // tocar no pet dormindo: acorda
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
  // o adulto ri de lado (sequência "carinho"); os outros ficam felizes ou dão cambalhota
  if (temSequencia(mp.forma, 'carinho')) { mp.estado = 'carinho'; mp.ocupado = true; movimentoCorpo(null); mp.anim.sequencia('carinho', voltarAoNormal); }
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
  const antes = nivelAmizade(c.amizade), lealAntes = Number(c.lealdade) || 0;
  const r = somarLealdade(c.lealdade, c.amizade, n);
  c.lealdade = r.lealdade; c.amizade = r.amizade;
  const base = `pets/conquistados/${pet}`;
  patch[`${base}/lealdade`] = c.lealdade;
  if (r.amizade) patch[`${base}/amizade`] = c.amizade;
  const depois = nivelAmizade(c.amizade);
  if (depois > antes) {
    avisoPet(`❤️ Amizade com ${nomePet(pet)}: nível ${depois}!`, true);
    if (pet === estado.pets.ativo) enviarOnline(visualOnline(pet));
  }
  if (depois > antes || (lealAntes < LEALDADE_EVOLUCAO && c.lealdade >= LEALDADE_EVOLUCAO)) verificarEvolucao(pet);   // chegou a 100: começa a amizade (e o dragão vira adulto)
  return patch;
}

// O que os colegas veem do meu pet
const visualOnline = (pet) => { const c = cuidadosDe(pet); return { pet_nome: c?.nome || null, pet_nivel: nivelPet(pet), pet_tinta: tintaVisivel(pet), pet_cor: corAtiva(pet), pet_efeito: c?.efeito || null,
  pet_forma: formaDe(pet), pet_fora: petFora(pet) || null }; };   // pet_fora: em expedição, os colegas não veem o pet seguindo

// Tinta no <img> do pet (comSombra: o pet do mapa tem drop-shadow no CSS, que o filtro substituiria)
function aplicarTinta(img, tintaId, comSombra = false) {
  if (!img) return;
  const t = tintaId ? tinta(tintaId) : null;
  const animada = tintaAnimada(t);
  img.classList.toggle('jr-arco-iris', animada);
  img.style.filter = t && !animada ? t.filtro + (comSombra ? ' drop-shadow(0 1px 1px rgba(0,0,0,.35))' : '') : '';
}
// Tinta de um pet meu em qualquer tela (mapa, Meu Pet, duelo do ginásio, batalha, coleção, pedidos, HUD)
const aplicarVisualPet = (img, pet, comSombra = false) => aplicarTinta(img, tintaVisivel(pet), comSombra);
// 📐 o pet que anda no plano cartesiano (PROMPT-128): o pet ativo, com a tinta; em expedição ou sem pet, o marcador dourado
definirPetPlano(() => {
  const pet = petsOk && estado?.pets?.ativo && !petFora() ? estado.pets.ativo : null;
  if (!pet) return null;
  const forma = formaDe(pet);
  return { quadros: (pose) => (temAnim(forma, pose) ? quadrosDe(forma, pose) : null), tam: tamanhoQuadro(forma), escala: escalaPet(forma), visual: (el) => aplicarVisualPet(el, pet) };
});
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
// soMoveis (PROMPT-108): aberta pelo 🛒 da casinha — só o catálogo de móveis
function abrirLoja(aba = 'comidas', provador = false, soMoveis = false) {
  if (!lojaPronta() || !estado?.pets) return;
  $('loja').classList.toggle('so-moveis', soMoveis);
  $('loja').querySelector('.jr-pet-escolha-titulo').textContent = soMoveis ? '🛒 Móveis para a casinha' : '🛒 Loja da Dona Cida';
  lojaAba = ['comidas', 'tintas', 'efeitos', 'pesca', 'moveis', 'reformas'].includes(aba) ? aba : 'comidas'; lojaQtd = {}; lojaProva = null;
  $('lj-msg').textContent = lojaAba === 'tintas' && provador ? 'Toque numa tinta para provar no pet 🐾' : '';
  if (ehLoja() && (provador || lojaAba === 'tintas')) subirNoPedestal();   // provador: o pet sobe no pedestal
  $('loja').hidden = false;
  renderLoja();
  if (lojaAba === 'comidas') { const f = fomeDePlanta(estado.pets.ativo); if (f) avisoPet(`${nomePet(estado.pets.ativo)}: “${f}”`); }
}
const GRATIS_PROF = '<span class="lj-preco lj-gratis-prof">Grátis (professora)</span>';
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
  // 🎨 Reformas (PROMPT-112): miniatura do fundo, nome, emoji e preço; sem venda de volta
  const cartaoTema = (t) => {
    const tem = temTema(t.id), atual = tem && temaDoDono().id === t.id, v = precoCasa(t);
    return `<div class="lj-item lj-tema">
        <div class="lj-emoji"><img class="lj-tema-img" src="${imgTema(t)}" alt="" draggable="false" loading="lazy"/></div>
        <div class="lj-info"><b>${esc(t.emoji || '🎨')} ${esc(t.nome)}</b>${tem ? '' : casaGratis() ? GRATIS_PROF : preco(v)}${atual ? '<span class="lj-sub">na sua casinha agora</span>' : ''}</div>
        ${tem ? '<button class="lj-comprar ok" disabled>✔ Você já tem</button>' : botao('tema:' + t.id, v, casaGratis() ? 'Pegar' : 'Comprar')}
      </div>`;
  };
  let html = '';
  if (lojaAba === 'reformas') html = CASA ? temasCasa().map(cartaoTema).join('') : '<div class="lj-vazio">As reformas chegam logo!</div>';
  else if (lojaAba === 'comidas') {
    html = comidas().filter(c => c.venda_loja !== false).map(c => {
      const q = lojaQtd[c.id] || 1, fav = pet && ehFavorita(pet, c);
      return `<div class="lj-item">
        <div class="lj-emoji">${imgItem(c.imagem, c.emoji, 'jr-item-loja')}</div>
        <div class="lj-info"><b>${esc(c.nome)}</b>
          ${preco(c.preco * q)}
          <span>+${c.lealdade} lealdade${c.limite_semana ? ` · ${c.limite_semana}× por semana` : ''}</span>
          ${c.especial || fav ? `<span>${c.especial ? '<span class="lj-selo">come sem fome ✓</span>' : ''}${c.especial && fav ? ' ' : ''}${fav ? `<span class="lj-fav">❤️ favorita</span>` : ''}</span>` : ''}
          <em class="lj-bolsa" title="Na bolsa">${imgItem(icone('bolsa'), '🎒', 'jr-ic-moeda')} na bolsa: ${Number(estado.pets.bolsa?.[c.id]) || 0}</em></div>
        <div class="lj-qtd"><button data-menos="${c.id}" aria-label="Menos">−</button><span>${q}</span><button data-mais="${c.id}" aria-label="Mais">+</button></div>
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
        <div class="lj-info"><b>${esc(x.nome)}</b><span class="lj-preco">${moedaHtml()} <b>${comMult(x.venda)}</b> cada</span><span>na bolsa: ${x.n}</span></div>
        <button class="lj-comprar" data-vender="${esc(x.id)}">Vender 1</button>
      </div>`).join('') : '<div class="lj-vazio">Você não tem peixes na bolsa. Pesque 🎣 e venda aqui.</div>');
  } else if (lojaAba === 'moveis') {   // 🛋️ móveis da casinha (PROMPT-105): vão para os guardados; sem venda de volta
    html = CASA ? (CASA.itens || []).map(it => {
      const tem = qtdCasa(it.id), lim = Number(it.limite) || 1, cheio = tem >= lim, v = precoCasa(it);
      return `<div class="lj-item lj-movel">
        <div class="lj-emoji"><img class="lj-movel-img" src="${imgMovel(it.id, it.fases ? String(it.fases) : it.vistas[0])}" alt="" draggable="false" loading="lazy"/></div>
        <div class="lj-info"><b>${esc(it.nome)}</b>${cheio ? '' : casaGratis() && it.preco ? GRATIS_PROF : v ? preco(v) : '<span class="lj-preco">Grátis</span>'}
          ${it.dica ? `<span>${esc(it.dica)}</span>` : ''}<span class="lj-sub">você tem ${tem}${lim > 1 ? ` de ${lim}` : ''}</span></div>
        ${cheio ? '<button class="lj-comprar ok" disabled>✔ Você já tem</button>' : botao(it.id, v, v ? 'Comprar' : 'Pegar')}
      </div>`;
    }).join('') : '<div class="lj-vazio">Os móveis chegam logo!</div>';
    if (CASA) html += cartoesQuadros(preco, botao);   // 🏅 quadro de insígnia e 🏆 Quadro dos Campeões (PROMPT-117)
    if (CASA && !$('loja').classList.contains('so-moveis')) html += '<div class="lj-secao">🎨 Reformas</div>' + temasCasa().map(cartaoTema).join('');   // na Dona Cida: no fim da grade
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
      pesca: 'Iscas para pescar e Dona Cida compra os peixes que você pescou.', moveis: 'Móveis para a sua 🏠 Casinha (placa na Praça).',
      reformas: 'Um tema novo para o quarto. Os móveis continuam no lugar.' }[lojaAba] || '';
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
  const venda = comMult(item.venda);
  ps.moedas = (Number(ps.moedas) || 0) + venda;
  const patch = { [`pets/bolsa/${id}`]: n - 1 || null, 'pets/moedas': ps.moedas };
  registrarGanho('pesca', venda, patch);
  gravar(patch);
  tocar('acerto');
  renderLoja();
  $('lj-msg').textContent = `Vendeu ${comArtigo(item.nome)} por ${venda} moeda${venda === 1 ? '' : 's'}.`;
}
// 🏅 quadro de insígnia (1 por insígnia ganha; escolhe a insígnia ao comprar) e 🏆 Quadro dos Campeões (só conquistando)
function cartoesQuadros(preco, botao) {
  let html = '';
  const q = CASA.insignia_quadrinho;
  if (q) {
    const ganhas = insigniasGanhas(), livres = insigniasSemQuadro().length, v = precoCasa(q), ex = ganhas[0] || 'mapa1-A';
    const sub = !ganhas.length ? 'Ganhe uma insígnia nos ginásios primeiro' : !livres ? 'Ganhe mais insígnias para comprar outro quadro'
      : `você escolhe a insígnia · tem ${ganhas.length - livres} de ${ganhas.length}`;
    html += `<div class="lj-item lj-movel${livres ? '' : ' apagado'}">
        <div class="lj-emoji"><span class="lj-quadro-ins"><img src="${IMG}/casinha/${q.imagem}" alt="" draggable="false"/>${imgInsigniaQuadro(ex)}</span></div>
        <div class="lj-info"><b>🏅 Quadro de insígnia</b>${livres ? (casaGratis() ? GRATIS_PROF : preco(v)) : ''}<span class="lj-sub">${sub}</span></div>
        ${livres ? botao('quadro_ins', v, casaGratis() ? 'Pegar' : 'Comprar') : '<button class="lj-comprar" disabled>🔒</button>'}
      </div>`;
  }
  const qc = CASA.quadro_campeoes;
  if (qc) {
    const tem = estado.casinha?.campeoes || qtdCasa(ID_CAMPEOES) > 0, pendurado = (estado.casinha?.moveis || []).some(m => m.id === ID_CAMPEOES);
    html += `<div class="lj-item lj-movel${tem ? '' : ' apagado'}">
        <div class="lj-emoji">${miniCampeoes()}</div>
        <div class="lj-info"><b>🏆 ${esc(qc.nome || 'Quadro dos Campeões')}</b><span class="lj-sub">${tem ? '26/26 insígnias' : 'só conquistando: não está à venda'}</span></div>
        ${!tem ? '<button class="lj-comprar" disabled>🔒 Conquiste as 26 insígnias</button>' : pendurado ? '<button class="lj-comprar ok" disabled>✔ Você já tem</button>'
          : '<button class="lj-comprar ok" disabled>✔ Liberado: pendure pelo 🛠️ Arrumar</button>'}
      </div>`;
  }
  return html;
}
function comprar(id) {
  if (String(id).startsWith('tema:')) { comprarTema(id.slice(5)); return; }   // 🎨 Reformas (aba própria ou no fim dos Móveis)
  if (id === 'quadro_ins') { if (insigniasSemQuadro().length) abrirColecaoCasa(null, true); return; }   // 🏅 escolhe a insígnia (PROMPT-117)
  const ps = estado.pets, moedas = Number(ps.moedas) || 0, patch = {};
  let msg = '', comprouMovel = null;
  if (lojaAba === 'pesca') {
    const ic = cfgPesca().isca || {}, pacote = id === 'isca_pacote';
    const q = pacote ? ic.pacote ?? 5 : 1, v = pacote ? ic.preco_pacote ?? 10 : ic.preco ?? 2;
    if (moedas < v) return;
    ps.moedas = moedas - v;
    ps.iscas = iscas() + q;
    patch['pets/iscas'] = ps.iscas;
    msg = `${q === 1 ? '1 isca' : `${q} iscas`} na bolsa 🪱 (você tem ${ps.iscas})`;
    atualizarBotaoLancar();
  } else if (lojaAba === 'moveis') {
    const it = itemCasa(id), preco = precoCasa(it);   // professora / modo teste: 0 (PROMPT-114)
    if (!it || moedas < preco || qtdCasa(id) >= (Number(it.limite) || 1)) return;
    if (casaSemGravar) { $('lj-msg').textContent = 'Modo ?casinha=cheia: as compras de móveis estão desligadas.'; return; }
    ps.moedas = moedas - preco;
    const g = estado.casinha.guardados;
    g[id] = (Number(g[id]) || 0) + 1;
    patch[`casinha/guardados/${id}`] = g[id];
    if (cs && !cs.visita) cs.guardados[id] = (Number(cs.guardados[id]) || 0) + 1;   // comprou dentro da casinha
    comprouMovel = id;
    msg = `${it.nome}: comprado! Vá à sua 🏠 Casinha para colocar!`;
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
  // 🛒 da casinha: fecha o catálogo, abre o Arrumar e o móvel novo aparece no meio, selecionado
  if (comprouMovel && $('loja').classList.contains('so-moveis') && ehCasinha() && cs && !cs.visita) {
    $('loja').hidden = true;
    abrirArrumar();
    colocarNoMeio(comprouMovel);
  }
}

// ── Bolsa (no "Meu Pet"): dar comida ao pet ativo ──────────
// Dragão com planta (loja.json → barriga.nao_come): a comida sai da bolsa, não enche nem dá lealdade; ele fica bravo e bufa (`recusa`)
const animBravo = (forma) => ['bravo', 'confuso', 'triste_fome'].find(a => temAnim(forma, a)) || 'sentado_girando';
// a bufada (PROMPT-110): no passo `bufando` da sequência `recusa`; sem a sequência (filhote), na hora
const somRecusa = (forma) => (temSequencia(forma, 'recusa') ? somNaSequencia('dragao_bufando', forma, 'recusa', 'bufando', 'bravo') : tocarArquivo('dragao_bufando'));
function recusarComida(pet, item, n) {
  estado.pets.bolsa[item.id] = n - 1;
  gravar({ [`pets/bolsa/${item.id}`]: n - 1 || null });
  mp.acordadoAte = Date.now() + ACORDADO_MS;
  mp.estado = 'recusa'; mp.ocupado = true;
  movimentoCorpo(null);
  if (!mp.anim.sequencia('recusa', voltarAoNormal)) mp.anim.tocar(animBravo(mp.forma), voltarAoNormal);
  particulas(['🗑️', '💨', '🗑️'], 3);
  tocar('erro');
  somRecusa(mp.forma);
  falarPet(fraseDe(pet, 'recusa_planta', { pet: nomePet(pet), comida: String(item.nome || '').toLowerCase() }) || 'Isso eu não como!');
  renderMeuPet();
}
// Dragão com fome abrindo a bolsa ou a loja de comida: uma frase de fome que reclama de planta (uma vez por abertura)
const PLANTA_NA_FALA = /fruta|legume|verdura|planta/i;
function fomeDePlanta(pet) {
  if (!pet || barrigaDe(pet) >= fomeAbaixo() || !listaNaoCome(pet).length) return null;
  return fraseFiltrada(pet, 'fome', (f) => PLANTA_NA_FALA.test(f), { pet: nomePet(pet) });
}
function abrirBolsa() {
  if (!mp || petFora(mp.pet)) return;
  { const f = fomeDePlanta(mp.pet); if (f) falarPet(f); }
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
// Núcleo do alimentar (Meu Pet e o 🥣 pote da casinha, PROMPT-106): confere, tira da bolsa, enche a barriga e dá a lealdade.
// → null (nada a fazer) · { recusa, item, n } (dragão + planta) · { motivo, item } (não come agora) · { item, fav } (comeu)
function comerDaBolsa(pet, id) {
  const c = cuidadosDe(pet), item = itemDaBolsa(id), n = Number(estado.pets.bolsa?.[id]) || 0;
  if (!c || !item || n <= 0) return null;
  const b = barrigaDe(pet), cfg = cfgLoja().barriga || {}, hoje = diaLocal();
  if (naoCome(pet, item)) return { recusa: true, item, n };
  const motivo = motivoNaoCome(item, b, c, new Date(), doDia(c.especiais_cheio_dia, hoje), pet);
  if (motivo) return { motivo, item };
  const agora = Date.now(), base = `pets/conquistados/${pet}`;
  c.barriga = Math.min(cfg.cheia ?? 100, b + (Number(item.enche) || enche())); c.barriga_t = agora;   // a carne enche menos (loja.json → enche)
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
  return { item, fav };
}
const textoNaoCome = (pet, motivo) => ({ cheio: 'Tô cheio! 😵', sem_fome: `Ainda não tô com fome… (comida comum só com a barriga abaixo de ${comumAte(pet)})`, semana: 'Bolo só uma vez por semana!' }[motivo]);
function darComida(id) {
  if (!mp || mp.ocupado) return;
  $('mp-bolsa-painel').hidden = true;
  const pet = mp.pet, r = comerDaBolsa(pet, id);
  if (!r) return;
  if (r.recusa) { recusarComida(pet, r.item, r.n); return; }   // dragão + planta: joga fora (sem aviso antes, PROMPT-73)
  if (r.motivo) { falarPet(textoNaoCome(pet, r.motivo)); return; }
  const { item, fav } = r;
  renderMeuPet();
  mp.estado = 'comendo'; mp.ocupado = true;
  mp.acordadoAte = Date.now() + ACORDADO_MS;
  // adulto: carne → `comer_carne` (assa, morde, come no chão, ossos, lambe os beiços); as outras → `comer` (curta)
  const seqComer = item.id === 'carne' && temSequencia(mp.forma, 'comer_carne') ? 'comer_carne' : 'comer';
  if (mp.anim.sequencia(seqComer, voltarAoNormal)) movimentoCorpo(null);
  else {
    if (temAnim(mp.forma, 'assar_comida')) mp.anim.tocar('assar_comida', () => { if (mp?.estado === 'comendo') mp.anim.tocar('comendo'); });   // o dragão assa a comida antes
    else mp.anim.tocar('comendo');
    movimentoCorpo('come');
  }
  const ic = imgItem(item.imagem, item.emoji, 'jr-item-part', item.filtro);
  particulas([ic, '✨', ic, '✨'], 6);
  if (fav) setTimeout(() => particulas(['💖', '❤️', '💗', '💖', '❤️'], 10), 250);   // a favorita: um coração estoura
  const fc = falasProntas() ? montarFala(contextoFalaDe(pet), 'carinho') : null;
  falarPet(fav ? 'Minha favorita! 💖' : fc?.baloes[0]?.texto || 'Hmm, que delícia!');
  tocar('acerto');
  verificarMarcosLealdade(pet);
  xpPorComida();
}
// ⭐ alimentar o pet: 2 XP, até 5 vezes por dia (PROMPT-156)
function xpPorComida() {
  const x = estado.xpJogo, hoje = diaLocal();
  if (!x) return;
  const c = x.comida?.data === hoje ? Number(x.comida.n) || 0 : 0;
  if (c >= 5) return;
  x.comida = { data: hoje, n: c + 1 };
  if (xpJogoGrava()) gravar({ 'xp_jogo/comida': x.comida });
  ganharXPJogo(2, 'comida');
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
  const comCor = !!corAtiva(mp.pet);   // com cor especial a tinta não vale (continua guardada)
  $('mp-visual-tintas').innerHTML = chip('tinta', '', 'Nenhuma', !c.tinta) +
    ts.map(t => chip('tinta', t.id, `<img src="${src}" alt="" draggable="false" data-previa="${t.id}"${attrForma(mp.pet, mp.forma)}/>${esc(t.nome)}`, c.tinta === t.id)).join('') +
    (comCor ? '<span class="mp-cor-aviso">Tire a cor especial para usar tinta</span>' : '');
  $('mp-visual-tintas').classList.toggle('apagado', comCor);
  for (const b of $('mp-visual-tintas').querySelectorAll('[data-tinta]')) b.disabled = comCor;
  renderCores();
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
  if (seguidor && !petFora(pet)) { const { x, y } = seguidor; seguidor.definir(pet, forma); if (cena) seguidor.colocar(x, y); }
  if (mp?.pet === pet) { mp.forma = forma; mp.anim.definir(forma); medirMeuPet(); voltarAoNormal(); }
  atualizarBotaoPet();
  atualizarVisualPet();
  enviarOnline(visualOnline(pet));
}
// 🐉 Cores do dragão (só quando o pet é dragão): Normal + as cores do sprites.json; bloqueada = cinza com 🔒 e o que fazer
function renderCores() {
  const pet = mp.pet, temCores = Object.keys(coresDragao()).length > 0, ok = aceitaCor(pet) && temCores;
  const azul = !ok && temCores && pet === 'dragao_azul';   // PROMPT-129: só o vermelho tem cores; no azul, só o aviso
  $('mp-cores-bloco').hidden = !ok && !azul;
  if (azul) { $('mp-visual-cores').innerHTML = ''; $('mp-cor-msg').textContent = '✨ Cores especiais: só no dragão vermelho 🐉'; }
  if (!ok) return;
  const base = formaBase(pet), atual = corAtiva(pet);
  const mini = (forma) => `<img src="${quadrosDe(forma, 'sentado_girando')[0]}" alt="" draggable="false"${attrForma(pet, forma)}/>`;
  $('mp-visual-cores').innerHTML = `<button class="mp-chip${!atual ? ' sel' : ''}" data-cor="">${mini(base)}Normal</button>` +
    Object.entries(coresDragao()).map(([cor, c]) => {
      const lib = !!estado.coresLiberadas?.[cor];
      return `<button class="mp-chip${atual === cor ? ' sel' : ''}${lib ? '' : ' bloqueada'}" data-cor="${esc(cor)}">${mini(formaComCor(base, cor))}${lib ? '' : '🔒 '}${esc(c.nome)}</button>`;
    }).join('');
  $('mp-cor-msg').textContent = '';
}
function escolherCor(cor) {
  if (!mp) return;
  const c = cor && coresDragao()[cor];
  if (cor && !c) return;
  if (cor && !estado.coresLiberadas?.[cor]) { $('mp-cor-msg').textContent = `🔒 ${c.texto}`; return; }
  estado.petCor = cor || null;
  gravar({ pet_cor: estado.petCor });   // grátis; dá para trocar quantas vezes quiser
  aplicarForma(mp.pet);
  atualizarVisualPet();
  renderVisual();
}
// Liberar as cores (PROMPT-146): vencer o líder do 10 B, do 11 B e do 12 B (antes, PROMPT-74, eram desafios da Ilha dos Robôs —
// quem liberou por lá continua com a cor). Liberou, fica para sempre (cores_liberadas/{cor}), mesmo sem dragão; o aviso aparece uma vez.
const liderVencido = (chave) => !!(estado.ginasios?.[chave]?.lider?.vencido || estado.ginasios?.[chave]?.insignia);
const DESBLOQUEIO_COR = {
  gin_10B: () => liderVencido('mapa10-B'),
  gin_11B: () => liderVencido('mapa11-B'),
  gin_12B: () => liderVencido('mapa12-B'),
};
// Professora, modo teste e alunos de teste (PROMPT-78): todas as cores do sprites.json já liberadas, só na memória
// (não grava cores_liberadas nem mostra o aviso de cor nova: o verificarCores não as vê como novas). Cor nova no JSON também.
function liberarCoresDaConta() {
  if (!estado?.coresLiberadas || !(ehProfessora() || teste || ALUNOS_TESTE.includes(sessao?.uid))) return;
  for (const cor of Object.keys(coresDragao())) estado.coresLiberadas[cor] = true;
}
const coresLiberadas = () => Object.entries(coresDragao()).filter(([cor, c]) => estado.coresLiberadas?.[cor] || DESBLOQUEIO_COR[c.desbloqueio]?.()).map(([cor]) => cor);
function verificarCores() {
  if (!carregouProgresso || !petsOk || !estado?.ginasios) return;
  const novas = coresLiberadas().filter(cor => !estado.coresLiberadas[cor]);
  for (const cor of novas) {
    estado.coresLiberadas[cor] = true;
    gravar({ [`cores_liberadas/${cor}`]: true });
    const c = coresDragao()[cor], ativo = estado.pets.ativo;
    if (aceitaCor(ativo)) avisoPet(`🎨 Cor nova para o dragão: ${c.nome}! Escolha no Meu Pet → Visual.`, true, srcIcone(formaComCor(formaBase(ativo), cor)));
    else avisoPet(`🎨 Liberou a cor ${c.nome} para o dragão vermelho! ${c.emoji || ''}`, true);
  }
}
// 🎁 PROMPT-133: uma vez por aluno, a diferença do multiplicador de moedas (PROMPT-126) sobre o que ele já conquistou nos
// ginásios: perguntas acertadas (1 → comMult(1)), insígnias (10 → comMult(10)) e douradas (+15 → comMult(15)). Batalhas não
// entram (não há histórico). Marca avisos/bonus_moedas_mult = { n, ts } (vale em qualquer celular). Fora: modo teste,
// professora e contas de teste.
function bonusMoedasRetroativo() {
  if (!carregouProgresso || !estado?.pets || teste || ehProfessora() || contaEscondida(sessao?.uid, sessao?.nome) || estado.avisos?.bonus_moedas_mult) return;
  const perguntas = Object.entries(estado.respostas || {}).filter(([id, r]) => RE_ID.test(id) && r?.acertou === true).length;
  const gins = Object.values(estado.ginasios || {});
  const insignias = gins.filter(g => g?.insignia).length, douradas = gins.filter(g => g?.dourada).length;
  const n = perguntas * (comMult(1) - 1) + insignias * (comMult(10) - 10) + douradas * (comMult(15) - 15);
  const marca = { n, ts: Date.now() }, patch = { 'avisos/bonus_moedas_mult': marca };
  (estado.avisos ||= {}).bonus_moedas_mult = marca;
  if (n > 0) {
    estado.pets.moedas = (Number(estado.pets.moedas) || 0) + n;
    patch['pets/moedas'] = estado.pets.moedas;
    registrarGanho('bonus', n, patch);
  }
  gravar(patch);
  if (n > 0) { avisoPet(`🎁 Você recebeu ${n} moedas: agora as moedas valem mais, e você ganhou a diferença pelo que já conquistou!`, true); }
}
// PROMPT-129: as cores especiais agora são só do dragão vermelho. Quem tinha cor (pet_cor) e está com o azul: aviso uma vez.
// A cor escolhida não é apagada (continua valendo para o vermelho); o azul aparece na cor normal (corAtiva).
function avisarCorSoVermelho() {
  if (!carregouProgresso || !estado?.petCor || estado.pets?.ativo !== 'dragao_azul' || estado.avisos?.cor_so_vermelho) return;
  (estado.avisos ||= {}).cor_so_vermelho = true;
  gravar({ 'avisos/cor_so_vermelho': true });
  avisoPet('As cores especiais agora são só do dragão vermelho 🐉', true);
}
function escolherVisual(e) {
  const bc = e.target.closest('[data-cor]');
  if (bc) { escolherCor(bc.dataset.cor); return; }
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
  if (climaAgora() === 'chuva' && !avisouChuvaPesca) { avisouChuvaPesca = true; avisoPet('🌧️ Dia de chuva: peixes raros aparecem mais!'); }
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
  pescaDepois(() => { if (pesca.estado === 'fisgada') pescaEscapou(); }, (cfgPesca().tempo_fisgar_s ?? 2.0) * 1000);
}
// 3. tocou a tempo: puxa e abre o minijogo da barrinha (sem conta). Segurar sobe a zona verde; soltar, ela cai.
function pescaPuxar() {
  if (pesca?.estado !== 'fisgada') return;
  limparTimersPesca();
  pesca.estado = 'barrinha';
  pesca.exc.hidden = true;
  pescaPose('puxando');
  const f = sortearPeixe(pontoComClima(pesca.ponto));   // 🌧️ na chuva, os raros têm o dobro de chance
  pesca.peixe = f;
  pesca.barra = criarBarrinha(f?.dificuldade);
  pesca.segurando = false;
  $('pb-zona').style.height = pesca.barra.h * 100 + '%';
  $('pb-peixe').innerHTML = imgItem(f.imagem, f.raro ? '🐠' : '🐟', 'jr-item-peixe' + (f.raro ? ' raro' : ''), f.filtro);
  desenharBarrinha(pesca.barra);
  // PROMPT-147: nas 3 primeiras pescas do aluno, a dica fica maior e pisca
  let nPescas = 0;
  try { nPescas = +localStorage.getItem(`jr_pesca_dica_${sessao.uid}`) || 0; localStorage.setItem(`jr_pesca_dica_${sessao.uid}`, String(nPescas + 1)); } catch (_) {}
  $('pb-dica').classList.toggle('destaque', nPescas < 3);
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
  ganharXPJogo(f.raro ? XP_JOGO.peixe_raro : XP_JOGO.peixe, 'peixe');   // ⭐ (PROMPT-156)
  const dia = pescaDia(), lim = cfgPesca().limite_peixes_dia ?? 5, pts = Number(f.pontos) || 0;
  const esportiva = dia.n >= lim, patch = {};
  const esp = estado.pescaEspecies ||= {};   // 🐠 aquário da casinha (PROMPT-106): toda espécie pega conta, até na pesca esportiva
  esp[f.id] = (Number(esp[f.id]) || 0) + 1;
  patch[`pesca_especies/${f.id}`] = esp[f.id];
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

// ── 🎁 Presentes (PROMPT-103; antes só peixes): 1 item da bolsa por vez (comidas, peixes, iscas, itens de uso), com um recado
// pronto, para um colega; até presentes_dia por dia. Sem moedas, pets, tintas nem insígnias. Turma (de quem dá ou recebe) com
// os desafios desligados pela professora: não dá. Quem recebe: ao vivo ou ao entrar; vários de uma vez → um cartão com a lista.
// jogo_revisao_presentes/{quem recebe}/{id} = { de, de_nome, de_turma, para_nome, item, peixe?, recado, ts, recebido } (modo teste: _teste)
// (o nó é marcado como recebido, não apagado: o painel da professora conta os presentes dados e recebidos por ele)
const basePresentes = () => (teste ? 'jogo_revisao_presentes_teste' : 'jogo_revisao_presentes');
const presentesHoje = () => (estado.presentesDia?.data === diaLocal() ? Number(estado.presentesDia.n) || 0 : 0);
const RECADOS = ['Boa sorte no ginásio! 🍀', 'Para o seu pet 🐾', 'Valeu pela ajuda! 🙌', 'Você é fera! 🔥', 'Feliz aniversário do seu pet! 🎂'];
const peixesNaBolsa = () => Object.entries(estado.pets?.bolsa || {}).filter(([id, n]) => id.startsWith('pesca_') && Number(n) > 0)
  .map(([id, n]) => ({ ...itemDaBolsa(id), n: Number(n) })).filter(x => x.id);   // (a loja vende os peixes)
const comArtigo = (nome) => `${/a$/i.test(nome) ? 'uma' : 'um'} ${nome}`;
// o que dá para presentear: { id, nome, emoji, imagem, filtro, n } — comidas e peixes da bolsa, iscas e itens de uso
function itemPresente(id) {
  if (id === 'isca') { const u = (cfgLoja().itens_uso || []).find(x => x.id === 'isca'); return { id, nome: u?.nome || 'Isca', emoji: u?.emoji || '🪱', imagem: u?.imagem || null }; }
  const uso = (cfgLoja().itens_uso || []).find(x => x.id === id);
  return uso ? { id, nome: uso.nome, emoji: uso.emoji, imagem: uso.imagem || null } : itemDaBolsa(id);
}
const qtdPresente = (id) => (id === 'isca' ? iscas() : (cfgLoja().itens_uso || []).some(x => x.id === id) ? qtdItem(id) : Number(estado.pets?.bolsa?.[id]) || 0);
function mudarQtdPresente(id, d, patch) {
  const ps = estado.pets, n = Math.max(0, qtdPresente(id) + d);
  if (id === 'isca') { ps.iscas = n; patch['pets/iscas'] = n; }
  else if ((cfgLoja().itens_uso || []).some(x => x.id === id)) { ps.itens = { ...(ps.itens || {}), [id]: n }; patch[`pets/itens/${id}`] = n || null; }
  else { ps.bolsa = { ...(ps.bolsa || {}), [id]: n }; patch[`pets/bolsa/${id}`] = n || null; }
}
function itensParaPresente() {
  const ids = new Set([...Object.keys(estado.pets?.bolsa || {}), ...Object.keys(estado.pets?.itens || {}), 'isca']);
  return [...ids].map(id => { const it = itemPresente(id), n = qtdPresente(id); return it && n > 0 ? { ...it, id, n } : null; }).filter(Boolean);
}
const presenteBloqueado = (c) => !onlineAtivo() || c.uid === sessao.uid || desafiosOff?.todas || desafiosOff?.[sessao.turma] || desafiosOff?.[c.reg?.turma];

// passo 1: o item · passo 2: o recado · passo 3: confirmar
function escolherPresente(c, passo = 1, id = null, recado = null) {
  const el = $('colega-cartao');
  clearTimeout(cartaoColega.timer);
  cartaoColega.timer = setTimeout(fecharCartaoColega, 20000);
  cartaoColega.presente = { id, recado };
  const para = esc(rotuloColega(c.uid, c.reg)), lim = cfgPesca().presentes_dia ?? 3, falta = lim - presentesHoje();
  let corpo;
  if (presenteBloqueado(c)) corpo = '<small>Presentes estão desligados agora.</small>';
  else if (falta <= 0) corpo = `<small>Você já deu ${lim} presentes hoje. Amanhã tem mais!</small>`;
  else if (passo === 1) {
    const its = itensParaPresente();
    corpo = its.length ? `<span class="jr-presente-lista">${its.map(x => `<button data-dar="${esc(x.id)}">${imgItem(x.imagem, x.emoji, 'jr-item-peixe' + (x.raro ? ' raro' : ''), x.filtro)}<span>${esc(x.nome)} ×${x.n}</span></button>`).join('')}</span>
      <small>Escolha 1 item · pode dar mais ${falta} hoje</small>` : '<small>Sua bolsa está vazia. Pesque, cave ou compre na loja 🎒</small>';
  } else if (passo === 2) {
    corpo = `<span class="jr-presente-lista jr-recados">${RECADOS.map((r, k) => `<button data-recado="${k}">${esc(r)}</button>`).join('')}</span><small>Escolha um recado</small>`;
  } else {
    const it = itemPresente(id);
    corpo = `<span class="jr-presente-conf">Dar 1 ${esc(it?.nome || '')} para ${para}?<small>“${esc(RECADOS[recado] || '')}”</small></span>
      <span class="jr-presente-lista"><button data-dar-ok>🎁 Dar</button><button data-presente-voltar>Voltar</button></span>`;
  }
  el.innerHTML = `<span class="jr-colega-info jr-presente"><b>🎁 Presente para ${para}</b>${corpo}</span>`;
  posicionarCartaoColega();
}
async function darPresente(c, id, recado) {
  const item = itemPresente(id), n = qtdPresente(id), lim = cfgPesca().presentes_dia ?? 3;
  if (!item || n <= 0 || presentesHoje() >= lim || !carregouProgresso || presenteBloqueado(c) || !RECADOS[recado]) return;
  const uid = c.uid, r = c.reg || {}, para = rotuloColega(uid, r);
  fecharCartaoColega();
  // o item sai da bolsa na hora; se o envio falhar, volta
  const patch = {};
  mudarQtdPresente(id, -1, patch);
  estado.presentesDia = { data: diaLocal(), n: presentesHoje() + 1 };
  patch.presentes_dia = estado.presentesDia;
  try {
    await push(ref(db, `${basePresentes()}/${uid}`), { de: sessao.uid, de_nome: nomeRanking(), de_turma: sessao.turma || '', para_nome: r.apelido || '',
      item: id, ...(String(id).startsWith('pesca_') ? { peixe: id } : {}), recado: RECADOS[recado], ts: Date.now() });
  } catch (e) {
    console.warn('[jogo-revisao] presente indisponível', e?.code || e);
    const volta = {}; mudarQtdPresente(id, +1, volta);
    estado.presentesDia = { data: diaLocal(), n: Math.max(0, presentesHoje() - 1) };
    avisoPet('Não deu para enviar o presente agora. Tente de novo mais tarde.');
    return;
  }
  gravar(patch);
  tocar('vitoria');
  avisoPet(`🎁 Você deu ${comArtigo(item.nome)} para ${para}!`);
}
// Quem recebe: ouve a própria caixa; cada presente entra na bolsa uma vez só (recebido marcado por transação)
let pararPresentes = null, presentesChegando = [], presentesTimer = 0;
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
  const id = p.item || p.peixe, item = itemPresente(id);
  if (!item) return;
  const patch = {};
  mudarQtdPresente(id, +1, patch);
  estado.presentesRecebidos = (Number(estado.presentesRecebidos) || 0) + 1;
  patch.presentes_recebidos = estado.presentesRecebidos;
  gravar(patch);
  presentesChegando.push({ ...p, item });
  clearTimeout(presentesTimer);
  presentesTimer = setTimeout(mostrarPresentesRecebidos, 900);   // os que chegam juntos viram um cartão só
}
function mostrarPresentesRecebidos() {
  if (!presentesChegando.length) return;
  if (sobreposicaoAberta() || perguntaAberta || transicionando || !$('pres-card').hidden) { presentesTimer = setTimeout(mostrarPresentesRecebidos, 2000); return; }
  const lista = presentesChegando; presentesChegando = [];
  const quem = (p) => `<b>${esc(nomeVisivel(p.de_nome) || 'Um colega')}</b>${nomeVisivel(p.de_turma) ? ` (${esc(nomeVisivel(p.de_turma))})` : ''}`;
  const ic = (p) => imgItem(p.item.imagem, p.item.emoji || '🎁', 'jr-item-peixe', p.item.filtro);
  $('pres-tit').textContent = lista.length === 1 ? '🎁 Você ganhou um presente!' : `🎁 Você ganhou ${lista.length} presentes!`;
  $('pres-lista').innerHTML = lista.map(p => `<li>${ic(p)}<span>${quem(p)} te deu ${esc(comArtigo(p.item.nome))}!${p.recado ? `<small>“${esc(p.recado)}”</small>` : ''}</span></li>`).join('');
  $('pres-card').hidden = false;
  tocar('vitoria');
  reagirSeguidor('rapida', 'feliz');   // dragão adulto: `carinho`
  if (mp) renderMeuPet();
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
// PROMPT-130: os colegas ficam sempre visíveis (saiu o 👁 Colegas); quem tinha escondido volta a ver
try { localStorage.removeItem('jr_colegas_ocultos'); } catch (_) {}

// Etiqueta do colega: o apelido (ou primeiro nome); sem nome no registro → o primeiro nome do uid ("8F_Ana_Clara" → "Ana"),
// e só sem isso "Colega"; a conta da professora → "Professora" (nunca a palavra PROFESSOR).
const nomeDoUid = (uid) => nomeVisivel(String(uid || '').split('_')[1] || '');
const rotuloColega = (uid, r) => (/PROFESSOR/i.test(`${uid} ${r?.apelido || ''}`) ? 'Professora' : nomeVisivel(r?.apelido) || nomeDoUid(uid) || 'Colega') + medalhaPesca(uid);
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
    apelido, turma: sessao.turma || '', pet: estado.pets?.ativo || null, ...(estado.pets?.ativo ? visualOnline(estado.pets.ativo) : {}), personagem: meuPersonagem(), mapa: 'geral', local: 'geral', x: 0, y: 0, dir: 'frente', titulo: meuTitulo(), sem_convites: estado.semConvites || null,
  } });
  if (!$('tela-geral').hidden) ouvirGeral();
  else if (ehPraca()) entrarNoMapaOnline('praca');   // o jogo começou na Praça antes do online ficar pronto
}

// ── Mapa da região ──────────────────────────────────────────
// local: 'mapa' (mapas e Praça) ou, na vila (PROMPT-111), o uid do dono da vila: só quem está na mesma vila se vê
function entrarNoMapaOnline(n, local = 'mapa') {
  pararOuvirTodos(); pararOuvirTodos = () => {};
  limparColegas();
  envio.x = jog.x; envio.y = jog.y; envio.t = performance.now(); envio.parado = true;
  enviarOnline({ mapa: n, local, x: Math.round(jog.x), y: Math.round(jog.y), dir: jog.dir });
  pararOuvirMapa();
  pararOuvirMapa = ouvirMapa(n, (regs) => (n === 'vila' ? receberColegasVila(regs) : receberColegas(n, regs, local)));   // Exposição: local 'exposicao'
  $('btn-reacao').hidden = !onlineAtivo();   // sem online (sem regra/sem internet): sem botão
}

function sairDoMapaOnline() {
  pararOuvirMapa(); pararOuvirMapa = () => {};
  limparColegas();
  $('btn-reacao').hidden = true;
  fecharReacoes();
}

function limparColegas() {
  fecharCartaoColega();
  for (const c of colegas.values()) { c.el.remove(); c.nome.remove(); c.petImg.remove(); c.sombra.remove(); c.balao?.remove(); c.cavarEl?.remove(); c.seg.descartar(); }
  colegas.clear();
}

function receberColegas(n, regs, local = 'mapa') {
  if (cena?.tipo !== 'mapa' || cena.n !== n) return;
  const vistos = new Set();
  for (const [uid, r] of Object.entries(regs)) {
    if (r.local !== local || !colegaVisivel(uid, r)) continue;
    vistos.add(uid);
    let c = colegas.get(uid);
    if (!c) c = criarColega(uid, r);
    atualizarColega(c, r);
  }
  for (const [uid, c] of colegas) if (!vistos.has(uid)) { c.el.remove(); c.nome.remove(); c.petImg.remove(); c.sombra.remove(); c.balao?.remove(); c.cavarEl?.remove(); c.seg.descartar(); colegas.delete(uid); }
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
  definirPetColega(c, r.pet_fora ? null : r.pet, r.pet_forma);
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
  definirPetColega(c, r.pet_fora ? null : r.pet, r.pet_forma);
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
  const escala = 1 / (cam.s || 1), altJ = altJogCena(), esp = escalaSpriteCena();   // nos salões (Exposição) do tamanho do personagem
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
    Object.assign(c.el.style, { left: c.x + 'px', top: c.y + 'px', height: PERS.altura * esp + 'px', zIndex: Math.round(c.y) });
    // colega cavando ou arrancando mato: a pose no lugar da imagem de andar (quadros 2..6 em loop enquanto durar)
    const sp = c.reg.acao === 'cavar' && temPoseCavar(c.pers) ? CAVAR_SP : c.reg.acao === 'mato' && temPoseMato(c.pers) ? MATO_SP : null;
    const cavando = !!sp;
    if (cavando) {
      if (!c.cavarEl) { c.cavarEl = document.createElement('img'); c.cavarEl.className = 'jr-cavar-pose jr-colega'; c.cavarEl.alt = ''; c.cavarEl.draggable = false; $('cena-palco').appendChild(c.cavarEl); }
      poseAcao(sp, c.reg.acao, c.cavarEl, c.pers, c.x, c.y, 2 + Math.floor(agora / (c.reg.acao === 'mato' ? 250 : MS_CAVAR)) % 5, !!c.reg.acao_esq, esp);
    } else if (c.cavarEl) { c.cavarEl.remove(); c.cavarEl = null; }
    c.el.style.visibility = cavando ? 'hidden' : '';
    // etiqueta com o apelido: 11 px na tela, qualquer que seja o zoom da câmera
    Object.assign(c.nome.style, { left: c.x + 'px', top: (c.y - altJ - 2) + 'px', fontSize: 11 * escala + 'px', zIndex: 9000 });
    if (c.balao) Object.assign(c.balao.style, { left: c.x + 'px', top: (c.y - altJ - 16 * escala) + 'px', fontSize: (c.balao.classList.contains('frase') ? 12 : 22) * escala + 'px' });
    if (c.pet) { const e = escalaPetCena(c.seg.forma); c.seg.atualizar(dt, c.x, c.y, VEL, altImagemPet(c.seg.forma) * e, distPet(c.seg.forma) * e, e); }
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
  let melhor = null, md = Infinity;
  const h = altJogCena(), folga = 6 * ESCALA_ATORES;
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
    ${podeDesafiar() && !r.sem_convites ? '<button class="jr-colega-oi jr-colega-desafiar" data-desafiar aria-label="Desafiar" title="Desafiar">⚔️</button>' : ''}
    ${presenteBloqueado(c) ? '' : '<button class="jr-colega-oi" data-presente aria-label="Presentear" title="Presentear">🎁</button>'}
    ${casaPub(c.uid) ? BOTAO_VISITAR : ''}
    <button class="jr-colega-oi" data-oi aria-label="Acenar">👋</button>`;
  const ti = el.querySelector('img[data-tinta]');
  if (ti) aplicarTinta(ti, ti.dataset.tinta);
  el.hidden = false;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  cartaoColega = { c, timer: setTimeout(fecharCartaoColega, 4000) };
  posicionarCartaoColega();
  carregarCasasPub().then(() => {   // 🏠 a lista das casinhas chegou agora: o botão aparece
    if (cartaoColega?.c === c && casaPub(c.uid) && !el.querySelector('[data-visitar]')) el.querySelector('[data-oi]')?.insertAdjacentHTML('beforebegin', BOTAO_VISITAR);
  });
  botaoConvidarNoCartao(c, el);   // 🏡 (PROMPT-109)
}
const BOTAO_VISITAR = '<button class="jr-colega-oi" data-visitar aria-label="Visitar a casinha" title="Visitar a casinha">🏠</button>';

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


// ── Reações ─────────────────────────────────────────────────
function abrirReacoes() {
  if (performance.now() - ultimaReacao < INTERVALO_REACAO) return;
  const fr = ehPraca() || ehVila() ? frasesPraca() : [];   // as frases da Praça valem na vila (PROMPT-111)
  $('reacoes-frases').innerHTML = fr.map(f => `<button class="jr-frase" data-e="${esc(f)}">${esc(f)}</button>`).join('');
  $('reacoes-frases').hidden = !fr.length;
  $('reacoes').hidden = false;
}
function fecharReacoes() { $('reacoes').hidden = true; }

function reagirCom(e) {
  fecharReacoes();
  if (!(REACOES.includes(e) || ((ehPraca() || ehVila()) && ehFrase(e))) || performance.now() - ultimaReacao < INTERVALO_REACAO) return;
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
  Object.assign(b.style, { left: jog.x + 'px', top: (jog.y - altJogCena() - 16 * escala) + 'px', fontSize: (b.classList.contains('frase') ? 12 : 22) * escala + 'px' });
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
  $('selo-online').innerHTML = `🟢 ${Number(total) || 0}<span class="jr-on-txt"> online</span>`;
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
  $('online-lista').dataset.modo = 'regiao';
  const reg = D.geral.regioes.find(r => r.mapa === n);
  $('online-titulo').textContent = `${n}. ${reg?.nome || ''}`;
  $('online-itens').innerHTML = lista.map(r => `
    <li><span class="jr-rosto${r.local === 'ginasio' ? ' no-ginasio' : ''}">${rostoPet(petAtual(r.pet), r.pet_tinta)}</span>
      <span class="jr-online-nome">${nomeT(r.uid, rotuloColega(r.uid, r), r)}</span>
      <span class="jr-online-det">${esc(nomeVisivel(r.turma))}${petValido(petAtual(r.pet)) ? ' · ' + esc((r.pet_nome ? r.pet_nome + ' · ' : '') + NOME_PET[petAtual(r.pet)]) : ''} · ${r.local === 'ginasio' ? 'no ginásio' : 'no mapa'}</span>
      ${botaoChamar(r)}</li>`).join('')
    || '<li class="jr-online-vazio">Ninguém aqui agora.</li>';
  pintarRostos($('online-itens'));
  $('online-ir').hidden = false;
  $('online-ir').dataset.mapa = n;
  $('online-bloqueado').hidden = true;   // todos os mapas abrem (só os ginásios seguem a ordem)
  $('online-lista').hidden = false;
}

// ============================================================
//  👥 ONLINE E "CHAMAR PRA PRAÇA" (PROMPT-76)
//  Botão "👥 Online (N)" nos mapas e na Praça (no mapa geral, o selo 🟢): todo mundo online, de todas as turmas, e onde está.
//  Fora do mapa geral a lista é LIDA a cada 20 s (lerTodos), sem ouvir as posições de todo mundo ao vivo.
//  Chamado: jogo_revisao_praca/chamados/{quem recebe} = { de, de_nome, de_turma, ts, resp? } — 1 por vez (runTransaction,
//  2 min) e 1 por minuto por pessoa (trava no aparelho de quem chama). Quem recebe vê uma faixa (20 s) quando não estiver
//  ocupado; responde 'vou' / 'nao' no próprio nó, e quem chamou apaga o nó ao ver a resposta.
// ============================================================
const CHAMADO_MS = 120000, FAIXA_MS = 20000, CHAMAR_DE_NOVO_MS = 60000;
let onlineTodos = {};                 // uid → registro (fora do mapa geral)
const chamadosFeitos = new Map();     // uid → quando chamei (1 por minuto)
let chamadoPendente = null, chamadoAberto = null, pararChamados = null, ondeEnviado, tOnline = 0, tLista = 0;
const regsOnline = () => (!$('tela-geral').hidden ? onlineGeral : onlineTodos);
const NOMES_ONDE = { laboratorio: 'Laboratório', programe: 'Programe o pet', ilha: 'Ilha dos Robôs', pesca: 'Pescando', duelo: 'Num desafio', damas: 'Jogando Damas', batalha: 'Numa batalha' };
const naPracaReg = (r) => r.mapa === 'praca' && r.local === 'mapa';
function lugarDe(r) {
  const extra = r.onde && NOMES_ONDE[r.onde];
  if (extra) return Number(r.mapa) > 0 ? `Mapa ${r.mapa} · ${extra}` : r.mapa === 'praca' && r.onde !== 'laboratorio' ? `Praça · ${extra}` : extra;
  if (r.mapa === 'praca') return r.local === 'laboratorio' ? 'Laboratório' : r.local === 'casinha' ? 'Praça · na casinha' : r.local === 'vila' ? 'Praça · na vila' : 'Praça';
  if (r.mapa === 'vila') return 'Vila das Casinhas';
  if (r.local === 'exposicao') return String(r.mapa).startsWith('sala-') ? `Exposição · Sala ${String(r.mapa).slice(5)}` : 'Exposição';
  if (Number(r.mapa) > 0) return `Mapa ${r.mapa}${r.local === 'ginasio' ? ' · no ginásio' : ''}`;
  return 'Mapa geral';
}
// onde estou agora (mandado no online quando muda): telas por cima do mapa
function ondeAgora() {
  if (bt) return 'batalha';
  if (dm) return 'damas';
  if (duelo?.comecou) return 'duelo';
  if (!$('programe').hidden) return 'programe';
  if (!$('pg-mapa').hidden) return 'ilha';
  if (pesca) return 'pesca';
  if (cena?.n === 'laboratorio') return 'laboratorio';
  return null;
}
// respondendo, em batalha, duelo, corrida, Damas, Programe o pet / Caça ao bug, pescando ou com um cartão aberto: o chamado espera
const ocupadoParaChamado = () => perguntaAberta || !!bt || !!duelo || !!dm || !$('programe').hidden || !!pesca || transicionando || !!evo || sobreposicaoAberta();
function tickOnline(dt) {
  if ((tOnline += dt) < 1) return;
  tOnline = 0;
  if (!onlineAtivo()) return;
  const o = ondeAgora();
  if (o !== ondeEnviado) { ondeEnviado = o; enviarOnline({ onde: o }); }
  mostrarChamadoSePuder();
  if (cena && (tLista += 1) >= 20) { tLista = 0; atualizarOnlineTodos(); }
  else atualizarBotaoOnline();
}
async function atualizarOnlineTodos() {
  if (!onlineAtivo()) return;
  try { onlineTodos = await lerTodos(); } catch (_) {}
  atualizarBotaoOnline();
  if (!$('online-lista').hidden && $('online-lista').dataset.modo === 'todos') renderListaTodos();
}
function atualizarBotaoOnline() {
  $('online-n').textContent = Object.entries(regsOnline()).filter(([u, r]) => colegaVisivel(u, r)).length;
}
function abrirListaTodos() {
  tLista = 0;
  if ($('tela-geral').hidden) atualizarOnlineTodos();
  $('online-lista').dataset.modo = 'todos';
  $('online-titulo').textContent = '👥 Online agora';
  $('online-ir').hidden = true;
  $('online-bloqueado').hidden = true;
  renderListaTodos();
  $('online-lista').hidden = false;
}
function renderListaTodos() {
  const minha = (r) => (r.turma === sessao.turma ? 0 : 1);
  const lista = Object.entries(regsOnline()).filter(([u, r]) => colegaVisivel(u, r)).map(([uid, r]) => ({ uid, ...r }))
    .sort((a, b) => minha(a) - minha(b) || String(a.turma || '').localeCompare(String(b.turma || '')) || rotuloColega(a.uid, a).localeCompare(rotuloColega(b.uid, b)));
  const praca = lista.filter(naPracaReg), outros = lista.filter(r => !naPracaReg(r));
  const grupo = (tit, l) => `<li class="jr-online-grupo">${tit} · ${l.length}</li>` + (l.map(linhaOnline).join('') || '<li class="jr-online-vazio">Ninguém.</li>');
  $('online-itens').innerHTML = lista.length ? grupo('🏛️ Na Praça', praca) + grupo('🗺️ Em outros lugares', outros) : '<li class="jr-online-vazio">Ninguém online agora.</li>';
  pintarRostos($('online-itens'));
  carregarCasasPub().then(leu => { if (leu && !$('online-lista').hidden && $('online-lista').dataset.modo === 'todos') renderListaTodos(); });   // 🏠 Visitar
}
function linhaOnline(r) {
  const pet = petAtual(r.pet);
  return `<li><span class="jr-rosto">${rostoPet(pet, r.pet_tinta)}</span>
    <span class="jr-online-nome">${nomeT(r.uid, rotuloColega(r.uid, r), r)}</span>
    <span class="jr-online-det">${esc(nomeVisivel(r.turma))}${petValido(pet) ? ' · ' + esc((r.pet_nome ? r.pet_nome + ' · ' : '') + NOME_PET[pet]) : ''} · ${esc(lugarDe(r))}</span>
    ${botaoOnline(r)}${casaPub(r.uid) ? `<button class="jr-online-acao" data-visitar-online="${esc(r.uid)}">🏠 Visitar</button>` : ''}</li>`;
}
// na Praça (eu também lá): ⚔️ Desafiar; senão 📨 Chamar pra Praça
function botaoOnline(r) {
  if (naPracaReg(r) && ehPraca()) {
    const c = colegas.get(r.uid);
    return (c && podeDesafiar() && !r.sem_convites ? `<button class="jr-online-acao" data-desafiar-online="${esc(r.uid)}">⚔️ Desafiar</button>` : '') +
      (c && !presenteBloqueado(c) ? `<button class="jr-online-acao" data-presentear-online="${esc(r.uid)}" aria-label="Presentear">🎁</button>` : '');
  }
  return botaoChamar(r);
}
function botaoChamar(r) {
  if (!onlineAtivo() || desafiosOff?.todas || desafiosOff?.[sessao.turma] || desafiosOff?.[r.turma]) return '';   // desafios desligados para uma das turmas
  if (r.sem_convites) return '<button class="jr-online-acao" disabled>não recebe convites</button>';
  return `<button class="jr-online-acao" data-chamar="${esc(r.uid)}">📨 Chamar pra Praça</button>`;
}
function cliqueListaOnline(e) {
  const ch = e.target.closest('[data-chamar]');
  if (ch && !ch.disabled) { chamarPraPraca(ch.dataset.chamar); return; }
  const vi = e.target.closest('[data-visitar-online]');
  if (vi) { visitarCasinha(vi.dataset.visitarOnline); return; }
  const pr = e.target.closest('[data-presentear-online]');
  if (pr) { const c = colegas.get(pr.dataset.presentearOnline); $('online-lista').hidden = true; if (c) { abrirCartaoColega(c); escolherPresente(c); } return; }
  const de = e.target.closest('[data-desafiar-online]');
  if (de) {
    const c = colegas.get(de.dataset.desafiarOnline);
    $('online-lista').hidden = true;
    if (c) { abrirCartaoColega(c); escolherModoDesafio(c); }
  }
}

async function chamarPraPraca(uid) {
  const r = regsOnline()[uid] || onlineGeral[uid] || onlineTodos[uid];
  if (!r) return;
  const nome = rotuloColega(uid, r);
  if (Date.now() - (chamadosFeitos.get(uid) || 0) < CHAMAR_DE_NOVO_MS) { avisoPet(`Você já chamou ${nome}. Espere um pouquinho para chamar de novo.`); return; }
  const meu = { de: sessao.uid, de_nome: nomeRanking(), de_turma: sessao.turma || '', ts: agoraServ() };
  if (!(await gravarChamado(uid, nome, meu))) return;
  chamadosFeitos.set(uid, Date.now());
  $('online-lista').hidden = true;
  esperarRespostaChamado(uid, nome, meu.ts);
  if (!ehPraca() && pracaPronta()) { avisoPet('Te espero na Praça! 🏛️'); if (perguntaAberta) fecharPergunta(); transicao(() => abrirPraca()); }
  else avisoPet(`📨 Chamado enviado para ${nome}.`);
}
// grava chamados/{uid} só se a pessoa não tiver outro chamado com menos de 2 min (sem resposta); false = não gravou (já avisou)
async function gravarChamado(uid, nome, meu) {
  try {
    const t = await runTransaction(ref(db, `${basePraca()}/chamados/${uid}`), (cur) => (cur && !cur.resp && agoraServ() - (Number(cur.ts) || 0) < CHAMADO_MS ? undefined : meu));
    if (t.committed) return true;
    avisoPet(`${nome} já tem um convite. Tente daqui a pouco.`);
  } catch (e) { console.warn('[jogo-revisao] chamado', e?.code || e); avisoPet('Não deu para chamar agora.'); }
  return false;
}
// quem chamou: 'vou' → "está vindo"; 'nao' ou 2 min sem resposta → "não pode agora"; depois apaga o nó
function esperarRespostaChamado(uid, nome, ts) {
  const no = ref(db, `${basePraca()}/chamados/${uid}`);
  let parar = null, fim = false;
  const acabar = (resp) => {
    if (fim) return;
    fim = true; parar?.(); clearTimeout(t);
    avisoPet(resp === 'vou' ? `${nome} está vindo! 🏃` : `${nome} não pode agora.`);
    runTransaction(no, (cur) => (cur && cur.de === sessao.uid && Number(cur.ts) === ts ? null : undefined)).catch(() => {});
  };
  const t = setTimeout(() => acabar('nao'), CHAMADO_MS + 3000);
  try {
    parar = onValue(no, (s) => {
      const v = s.exists() ? s.val() : null;
      if (!v || v.de !== sessao.uid || Number(v.ts) !== ts) { if (s.exists() || v === null) acabar('nao'); return; }
      if (v.resp) acabar(v.resp);
    }, () => {});
  } catch (_) {}
}

// quem recebe: guarda o chamado e mostra a faixa quando não estiver ocupado (passou de 2 min: descarta sem mostrar)
function ouvirChamados() {
  if (pararChamados || !onlineAtivo()) return;
  try {
    pararChamados = onValue(ref(db, `${basePraca()}/chamados/${sessao.uid}`), (s) => {
      const v = s.exists() ? s.val() : null;
      if (!v || v.resp || !v.de) { if (chamadoAberto && (!v || v.ts !== chamadoAberto.ts)) fecharFaixaChamado(); return; }
      if (estado.semConvites || !desafiosLigados()) { responderChamadoNo(v, 'nao'); return; }
      if (chamadoAberto?.ts === v.ts) return;
      chamadoPendente = v;
      mostrarChamadoSePuder();
    }, () => {});
  } catch (_) { pararChamados = null; }
}
function mostrarChamadoSePuder() {
  const v = chamadoPendente;
  if (!v || chamadoAberto) return;
  if (agoraServ() - (Number(v.ts) || 0) > CHAMADO_MS) { chamadoPendente = null; return; }
  if (ocupadoParaChamado()) return;
  chamadoPendente = null;
  chamadoAberto = v;
  const turma = nomeVisivel(v.de_turma), quem = `<b>${nomeT(v.de, nomeCurto(v.de, v.de_nome))}</b>${turma ? ` (${esc(turma)})` : ''}`;
  $('chamado-txt').innerHTML = v.vila ? `👋 ${quem} te chamou para a vila!` : `🏛️ ${quem} te chamou pra Praça!`;   // 🏘️ PROMPT-111
  $('chamado-ir').textContent = v.vila ? 'Ir' : 'Ir agora';
  $('chamado').hidden = false;
  tocar('clique');
  v.timer = setTimeout(() => responderChamado(false), FAIXA_MS);   // sumiu sozinha: "agora não"
}
function fecharFaixaChamado() {
  if (chamadoAberto) clearTimeout(chamadoAberto.timer);
  chamadoAberto = null;
  $('chamado').hidden = true;
}
function responderChamadoNo(v, resp) {
  const no = ref(db, `${basePraca()}/chamados/${sessao.uid}`);
  runTransaction(no, (cur) => (cur && cur.de === v.de && cur.ts === v.ts ? { ...cur, resp } : undefined)).catch(() => {});
  // quem chamou apaga ao ver a resposta; se ele já saiu, apaga daqui a pouco
  setTimeout(() => runTransaction(no, (cur) => (cur && cur.ts === v.ts && cur.resp ? null : undefined)).catch(() => {}), 10000);
}
async function responderChamado(ir) {
  const v = chamadoAberto;
  if (!v) return;
  fecharFaixaChamado();
  responderChamadoNo(v, ir ? 'vou' : 'nao');
  if (ir && v.vila) { if (!(ehVila() && cena.vila?.dono === v.de)) { if (perguntaAberta) fecharPergunta(); irVilaDe(v.de, nomeCurto(v.de, v.de_nome)); } return; }   // 🏘️ a vila de quem chamou
  if (!ir || !pracaPronta()) return;
  // vai para a Praça e aparece ao lado de quem chamou (se ainda estiver lá); senão, na entrada
  let perto = null;
  try { const r = await lerRegistro(v.de); if (r && naPracaReg(r) && Number.isFinite(Number(r.x))) perto = { x: Number(r.x) + 34, y: Number(r.y) }; } catch (_) {}
  if (ehPraca()) { if (perto) caminharNaTrilha(...cena.naTrilha(perto.x, perto.y)); return; }
  if (perguntaAberta) fecharPergunta();
  transicao(() => abrirPraca(perto ? { perto } : undefined));
}

// "Não receber convites" (Meu Pet → Visual): sem chamados da Praça e sem convites de desafio; os colegas veem o botão cinza
function atualizarBotaoSemConvites() {
  const b = $('mp-sem-convites'), sim = !!estado?.semConvites;
  $('mp-sem-convites-txt').textContent = `Não receber convites: ${sim ? 'ligado' : 'desligado'}`;
  b.setAttribute('aria-checked', String(sim));
  b.classList.toggle('ligado', sim);
}
function alternarSemConvites() {
  estado.semConvites = !estado.semConvites;
  gravar({ sem_convites: estado.semConvites || null });
  enviarOnline({ sem_convites: estado.semConvites || null });
  atualizarBotaoSemConvites();
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
  const vencidos = ginasiosVencidos(), rv = vencidos.length ? sortear(vencidos) : null, revisar = rv && chaveGinasio(rv.mapa, rv.lado);   // um vencido qualquer, para revisar
  let est = null;
  if (barrigaDe(pet) < fomeAbaixo()) est = 'fome';
  else if (conversa.voltou && !conversa.voltouDito) est = 'voltou';
  return {
    pet, nomePet: nomePet(pet), apelido: apelidoAluno || String(sessao.nome || '').split(' ')[0],
    proximo: prox ? { chave: prox, dica: dicaDe(prox) } : null,
    errado: errado ? { chave: errado, dica: dicaDe(errado) } : null,
    revisar: revisar ? { chave: revisar, dica: dicaDe(revisar) } : null,
    sequencia: Number(estado.sequencia?.atual) || 0, agora: new Date(), estado: est,
    curiosidade: CURIO ? () => baloesCuriosidade(pet) : null,   // 💡 (PROMPT-98)
    clima: climaParaFala(),   // 🌧️ chuva / calor / vento (PROMPT-104)
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

// Mostra os balões um depois do outro (piada: abertura → pergunta, com tempo para pensar → resposta → risada).
// PROMPT-137: texto longo vira vários balões de até ~60 letras; cada um fica o tempo de leitura
function mostrarFalaPet(baloes, fome = false) {
  baloes = quebrarBaloes(baloes);
  pararFalaPet();
  conversa.falando = true;
  let i = 0;
  const el = $('pet-fala');
  const passo = () => {
    const b = baloes[i];
    if (!b || cena?.tipo !== 'mapa') { pararFalaPet(); return; }
    el.textContent = b.texto;
    el.classList.toggle('largo', !!b.largo);   // curiosidade: balão mais largo
    el.hidden = false;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    posicionarFalaPet();
    if (i === 0) { if (fome) seguidor?.reagir('triste_fome', 2000); else reagirSeguidor('rapida', 'feliz'); }   // tocar no pet: ele ri (adulto: `carinho`)
    conversa.timer = setTimeout(() => {
      i++;
      el.hidden = true;
      if (baloes[i]) conversa.timer = setTimeout(passo, baloes[i].espera || 0);
      else pararFalaPet();
    }, duracaoDe(b));
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
  if (cs?.visita) return;   // 🏠 visitando um colega: o meu pet ficou em casa
  if (cs?.ida?.fase === 'fazendo' && seguidor?.zFixo != null) return;   // 💤 dormindo na cama: não fala
  if (conversa.falando) posicionarFalaPet();
  if (pp) { atualizarPerguntaPet(); return; }   // 🗨️ pergunta rápida aberta: o pet não fala outra coisa
  if (perguntaAberta || transicionando || sobreposicaoAberta() || pesca) return;   // pescando, o pet fica quietinho
  if (conversa.evento) {
    // momento-chave (saiu do ginásio): independe do intervalo, mas respeita a lealdade
    const ev = conversa.evento;
    conversa.evento = null;
    if (petPodeFalar()) petFalar(ev);
    return;
  }
  if (petCalado || conversa.falando) return;
  // ?falar=curiosidade (modo teste): uma curiosidade na hora, ao entrar no mapa
  if (conversa.curioAgora && seguidor?.pet && !$('pet').hidden && falasProntas()) { conversa.curioAgora = false; if (petFalar('curiosidade')) return; }
  // 💡 a curiosidade não depende da lealdade: abaixo da mínima o pet só conta curiosidades (PROMPT-99)
  const pode = petPodeFalar(), soCurio = !pode && !!CURIO && falasProntas() && !!seguidor?.pet && !$('pet').hidden;
  if (!pode && !soCurio) return;
  if (performance.now() < conversa.proximaT) return;
  if ((seguidor.paradoMs || 0) < (configFalas().parado_min_s ?? 3) * 1000) return;
  if (soCurio || conversa.primeiraCurio) { conversa.primeiraCurio = false; if (petFalar('curiosidade') || soCurio) return; }   // a 1ª fala no mapa é sempre uma curiosidade
  const pertoDaAgua = cena?.tipo === 'mapa' && pescaPronta() && pontosDoMapa(cena.n).some(p => pontoLiberado(p) && dist(jog.x, jog.y, p.x, p.y) < 180);
  if (pertoDaAgua && Math.random() < 0.4 && petFalar('pesca')) return;
  if (lembrarTreino()) return;
  if (Math.random() < PP_CHANCE && perguntaDoPet()) return;   // 🗨️ às vezes, em vez de falar, o pet faz uma pergunta rápida
  petFalar();
}

function alternarPetCalado() {
  petCalado = !petCalado;
  try { localStorage.setItem(KEY_CALADO, petCalado ? '1' : '0'); } catch (_) {}
  atualizarBotaoCalado();
  avisoPet(petCalado ? '🤐 Falas do pet desligadas' : '💬 Falas do pet ligadas');
}
function atualizarBotaoCalado() {   // 💬/🤐 ao lado do nome do pet, na tela principal do Meu Pet (PROMPT-120)
  const b = $('mp-falas'), rot = `Falas do pet: ${petCalado ? 'desligadas' : 'ligadas'}`;
  b.textContent = petCalado ? '🤐' : '💬';
  b.title = rot; b.setAttribute('aria-label', rot);
  b.classList.toggle('desligado', petCalado);
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
const chavePosicao = (q) => semAdversario() ? q.id : q.indice;
// Revisão da semana e 🎯 Treino do pet: a mesma tela, sem adversário (perguntas de vários ginásios)
const semAdversario = () => pg?.modo === 'revisao' || pg?.modo === 'treino';

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
  atualizarBotaoIlha();   // 🤖 (PROMPT-132)
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

// ============================================================
//  🎯 TREINO DO PET (PROMPT-91) — 5 questões por dia com repetição espaçada (a Revisão da semana continua igual).
//  treino/caixas/{id} = { nivel 0..3, volta 'AAAA-MM-DD' }: errou (ginásio, batalha, revisão ou treino) → nível 0, volta amanhã;
//  acertou no treino (de primeira) → 0→1 (1 dia), 1→2 (3 dias), 2→3 (7 dias); acertou no 3 → sai. treino/iniciado: caixas já
//  montadas dos erros antigos (estado.respostas, nível 0, vencendo hoje). treino/dia = { data, ids, feitas, completo, ok, acertos }:
//  o conjunto do dia fica fixo (sair no meio continua de onde parou). treino/lembrete: dia em que o pet já lembrou.
//  ids: m{mapa}{lado}-{personagem}-{n} (ginásio/revisão) ou bt-{tipo}-{dificuldade} (conta de batalha).
//  Prêmio: +1 de lealdade por questão acertada, +3 ao completar (uma vez por dia). Sem moedas.
// ============================================================
const TREINO_N = 5, TREINO_ESPACO = [1, 3, 7], LEALDADE_TREINO = 1, LEALDADE_TREINO_FIM = 3;
const RE_BT = /^bt-([a-z0-9_]+)-(\d+)$/;
const somaDias = (dia, n) => { const d = paraData(dia); d.setDate(d.getDate() + n); return diaLocal(d); };
const idTreinoValido = (id) => { const m = RE_ID.exec(id); return m ? !(+m[1] === 13 && m[2] === 'B') : RE_BT.test(id); };   // 13 B: tabelas, não regeneram
function treinoEstado() {
  const t = (estado.treino ||= {});
  t.caixas ||= {};
  if (!t.iniciado && carregouProgresso) {   // 1ª vez: quem já tem erros ganha as caixas, todas vencendo hoje
    const hoje = diaLocal(), patch = { 'treino/iniciado': true };
    for (const [id, r] of Object.entries(estado.respostas || {})) {
      if (!((r?.erros || 0) > 0) || !idTreinoValido(id) || t.caixas[id]) continue;
      t.caixas[id] = { nivel: 0, volta: hoje };
      patch[`treino/caixas/${id}`] = t.caixas[id];
    }
    t.iniciado = true;
    gravar(patch);
  }
  return t;
}
function caixaErrou(id) {
  if (!carregouProgresso || !id || !idTreinoValido(id)) return;
  const t = treinoEstado(), cx = { nivel: 0, volta: somaDias(diaLocal(), 1) };
  t.caixas[id] = cx;
  gravar({ [`treino/caixas/${id}`]: cx });
}
// ginásios com o líder vencido: { mapa, lado } (sem o 13 B)
const ginasiosVencidos = () => Object.keys(estado.ginasios || {}).filter(k => estado.ginasios[k]?.lider?.vencido)
  .map(k => { const m = /^mapa(\d+)-([AB])$/.exec(k); return m && { mapa: +m[1], lado: m[2] }; }).filter(g => g && !(g.mapa === 13 && g.lado === 'B'));
// as de hoje: as que vencem (mais antigas primeiro), completadas com sorteadas de ginásios vencidos.
// null: bloqueado (sem erro nem ginásio vencido); []: nada para hoje
function idsDoTreino() {
  const t = treinoEstado(), hoje = diaLocal(), vencidos = ginasiosVencidos();
  if (!Object.keys(t.caixas).length && !vencidos.length) return null;
  const ids = Object.entries(t.caixas).filter(([id, c]) => c?.volta && c.volta <= hoje && idTreinoValido(id))
    .sort((a, b) => a[1].volta.localeCompare(b[1].volta) || a[0].localeCompare(b[0])).slice(0, TREINO_N).map(([id]) => id);
  const pers = ['treinador1', 'treinador2', 'treinador3', 'lider', 'revanche'];
  for (let tent = 0; ids.length < TREINO_N && vencidos.length && tent < 300; tent++) {
    const g = sortear(vencidos), personagem = sortear(pers), indice = Math.floor(Math.random() * (personagem === 'revanche' ? 3 : 5));
    const id = `m${g.mapa}${g.lado}-${personagem}-${indice + 1}`;
    if (!ids.includes(id) && gerarUma(g.mapa, g.lado, personagem, indice)) ids.push(id);
  }
  return ids;
}
// pergunta nova (números e alternativas sorteados de novo) a partir do id da caixinha
function questaoTreino(id) {
  const m = RE_ID.exec(id);
  if (m) {
    const t = { mapa: +m[1], lado: m[2], personagem: m[3], indice: +m[4] - 1 };
    const q = gerarUma(t.mapa, t.lado, t.personagem, t.indice);
    return q && { ...q, ...t, id };
  }
  const b = RE_BT.exec(id);
  if (!b || !batalhasProntas()) return null;
  const c = gerarConta([b[1]], +b[2]);
  return c && { id, enunciado: c.conta, resposta: c.resposta, erradas: c.opcoes.filter(v => v !== c.resposta), explicacao: c.explica || '',
    dica: '', relembre: chaveRelembreConta(c.tipo, c.conta), mapa: null };
}
function situacaoTreino() {
  if (!carregouProgresso || !estado) return { bloqueado: true };
  const t = treinoEstado();
  if (t.dia?.data === diaLocal()) return t.dia.completo ? { feito: true } : { feitas: Number(t.dia.feitas) || 0, total: t.dia.ids.length };
  const ids = idsDoTreino();
  if (!ids) return { bloqueado: true };
  return ids.length ? { feitas: 0, total: ids.length } : { vazio: true };
}
function atualizarBotaoTreino() {
  const b = $('mp-treino');
  if (!b) return;
  const st = situacaoTreino();
  b.textContent = st.bloqueado ? '🔒 Vença um ginásio para liberar o treino' : st.feito ? '✅ Treino feito! Volta amanhã'
    : st.vazio ? '✅ Nada para treinar hoje! Volta amanhã' : `🎯 Treino de hoje (${st.feitas}/${st.total})`;
  b.classList.toggle('pronto', !st.bloqueado && !st.feito && !st.vazio);
}
function tocarTreino() {
  const st = situacaoTreino();
  if (st.bloqueado || st.feito || st.vazio) { tocar('clique'); return; }
  const t = treinoEstado(), hoje = diaLocal();
  if (t.dia?.data !== hoje) {
    t.dia = { data: hoje, ids: idsDoTreino() || [], feitas: 0, completo: false, ok: [], acertos: 0 };
    gravar({ 'treino/dia': t.dia });
  }
  const dia = t.dia, ok = new Set(dia.ok || []);
  const qs = dia.ids.map((id, pos) => { const q = !ok.has(id) && questaoTreino(id); return q && { ...q, pos }; }).filter(Boolean);
  fecharMeuPet();
  if (!qs.length) { dia.completo = true; gravar({ 'treino/dia/completo': true }); return; }
  pg = { modo: 'treino', fila: qs, total: dia.ids.length, acertos: 0, errouIds: new Set(), errosPorIndice: {}, travado: false, fim: false };
  perguntaAberta = true;
  soltarJoystick();
  $('perg-confirma').querySelector('p').textContent = 'Sair do treino? Você continua de onde parou.';
  $('perg-desistir').hidden = false;
  $('perg-confirma').hidden = true;
  $('pergunta').hidden = false;
  montarArena();
  dia.ids.forEach((id, i) => { if (ok.has(id)) pg.status[i] = 'certa'; });   // as que já foram feitas hoje
  falar(dia.ok?.length ? 'Vamos continuar o treino!' : 'Treino do dia! Só 5 questões. Bora!');
  atualizarMoedasPergunta();
  renderPergunta();
  $('pergunta').querySelector('.jr-perg-caixa').scrollTop = 0;
}
// acertou uma questão do treino: sobe de caixinha (só de primeira), conta no dia e +1 de lealdade
function acertouNoTreino(q, patch) {
  const t = treinoEstado(), dia = t.dia;
  if (!dia || dia.data !== diaLocal() || (dia.ok || []).includes(q.id)) return;
  if (!pg.errouIds.has(q.id)) {
    const cx = t.caixas[q.id];
    if (cx && cx.nivel >= 3) { delete t.caixas[q.id]; patch[`treino/caixas/${q.id}`] = null; }
    else if (cx) { const n = Number(cx.nivel) || 0; t.caixas[q.id] = { nivel: n + 1, volta: somaDias(diaLocal(), TREINO_ESPACO[n]) }; patch[`treino/caixas/${q.id}`] = t.caixas[q.id]; }
    dia.acertos = (Number(dia.acertos) || 0) + 1;
    patch['treino/dia/acertos'] = dia.acertos;
  }
  dia.ok = [...(dia.ok || []), q.id];
  dia.feitas = dia.ok.length;
  patch['treino/dia/ok'] = dia.ok;
  patch['treino/dia/feitas'] = dia.feitas;
  const pet = estado.pets?.ativo;
  if (pet && cuidadosDe(pet)) { ganharLealdade(pet, LEALDADE_TREINO, patch); pg.lealdade = (pg.lealdade || 0) + LEALDADE_TREINO; }
}
function concluirTreino() {
  pg.fim = true;
  const t = treinoEstado(), dia = t.dia, patch = {};
  const pet = estado.pets?.ativo;
  if (dia && !dia.completo) {
    dia.completo = true;
    patch['treino/dia/completo'] = true;
    ganharXPJogo(20, 'treino');   // ⭐ (PROMPT-156)
    if (pet && cuidadosDe(pet)) { ganharLealdade(pet, LEALDADE_TREINO_FIM, patch); pg.lealdade = (pg.lealdade || 0) + LEALDADE_TREINO_FIM; }
  }
  gravar(patch);
  if (pet) verificarMarcosLealdade(pet);
  tocar('vitoria');
  if (pgPet && !pgPet.sequencia('vitoria')) pgPet.tocar(temAnim(pgPet.pet, 'animado') ? 'animado' : 'feliz');   // o pet comemora
  const primeira = Number(dia?.acertos) || 0, total = dia?.ids?.length || pg.total;
  falar(`Treino completo! 🎉 Você acertou ${primeira} de ${total} de primeira.`);
  $('perg-contador').textContent = `Treino completo! 🎉 ${primeira} de ${total} de primeira${pg.lealdade ? ` · ❤️ +${pg.lealdade} de lealdade` : ''}`;
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
  pg.aoContinuar = () => { fecharPergunta(); reagirSeguidor('comemora', 'feliz'); };
}
// no mapa, uma vez por dia: o pet lembra do treino (frase da personalidade: treino_lembrete)
function lembrarTreino() {
  if (cena?.tipo !== 'mapa' || !carregouProgresso) return false;
  const t = treinoEstado(), hoje = diaLocal();
  if (t.lembrete === hoje) return false;
  const st = situacaoTreino();
  if (st.bloqueado || st.feito || st.vazio) return false;
  const pet = estado.pets.ativo;
  const frase = fraseDe(pet, 'treino_lembrete', { pet: nomePet(pet), apelido: apelidoAluno || String(sessao.nome || '').split(' ')[0] });
  if (!frase) return false;
  t.lembrete = hoje;
  gravar({ 'treino/lembrete': hoje });
  mostrarFalaPet([{ texto: frase }]);
  conversa.proximaT = performance.now() + (configFalas().intervalo_min_s ?? 90) * 1000;
  return true;
}

// ============================================================
//  🧭 EXPEDIÇÃO DO PET (PROMPT-92) — o pet ativo sai por 1 h ou 2 h e volta com moedas (e comida, na de 2 h).
//  pets/conquistados/{pet}/expedicao = { inicio, fim, tipo, moedas, comida } (horário do servidor; o prêmio é sorteado ao
//  mandar e gravado junto: recarregar não sorteia de novo). pets/expedicoes_dia = { data, n } (até 2 por dia).
//  Fora: não segue no mapa (puf), HUD com relógio, Meu Pet com o cartão, sem batalha/ajuda/Programe o pet/corrida.
//  Os outros pets do aluno continuam disponíveis. Volta: moedas (fonte `expedicao`), comida na bolsa, barriga −10 / −20.
// ============================================================
const EXPEDICOES = {
  curta: { min: 60, nome: '🌲 1 hora', moedas: [10, 20], comida: false, fome: 10 },
  longa: { min: 120, nome: '🏔️ 2 horas', moedas: [25, 40], comida: true, fome: 20 },
};
const EXPEDICOES_POR_DIA = 2;
const expedicaoDe = (pet) => (pet && cuidadosDe(pet)?.expedicao) || null;
const petFora = (pet = estado?.pets?.ativo) => { const e = expedicaoDe(pet); return !!e && agoraServ() < Number(e.fim); };
const expedicoesHoje = () => (estado?.pets?.expedicoesDia?.data === diaLocal() ? Number(estado.pets.expedicoesDia.n) || 0 : 0);
const horaDe = (ms) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const faltaExp = (pet = estado?.pets?.ativo) => Math.max(0, Number(expedicaoDe(pet)?.fim) - agoraServ());   // sem pet: o ativo (o relógio do HUD mostrava NaN)
function avisoPetFora(pet = estado?.pets?.ativo) {
  const e = expedicaoDe(pet);
  avisoPet(`🧭 Seu pet está em expedição${e ? ` (volta às ${horaDe(Number(e.fim))})` : ''}.`);
}
// Programe o pet (fases, desafio do dia, corrida, Caça ao bug, O que faz): o pet anda no tabuleiro — fora, não abre
function abrirTelaPrograme(cfg) {
  if (petFora()) { avisoPetFora(); return Promise.resolve(false); }
  return abrirTelaProgrameBase(cfg);
}
// comida que o pet come (as da loja, à venda; nunca planta para o dragão)
const comidasDaExpedicao = (pet) => comidas().filter(c => (Number(c.preco) || 0) > 0 && !naoCome(pet, c));

function abrirPainelExp() {
  if (!mp) return;
  const pet = mp.pet, n = expedicoesHoje(), nome = esc(nomePet(pet));
  let aviso = '';
  if (petFora(pet)) aviso = `🧭 ${nome} já está em expedição. Volta às ${horaDe(Number(expedicaoDe(pet).fim))}.`;
  else if (n >= EXPEDICOES_POR_DIA) aviso = `Já foram ${EXPEDICOES_POR_DIA} expedições hoje. Amanhã tem mais! 🌙`;
  else if (barrigaDe(pet) < fomeAbaixo()) aviso = `${nome} está com fome. Dê comida antes!`;
  $('mp-exp-sub').textContent = `${nome} vai explorar e volta com prêmios · hoje: ${n}/${EXPEDICOES_POR_DIA}`;
  $('mp-exp-opcoes').innerHTML = (aviso ? `<p class="mp-exp-aviso">${aviso}</p>` : '') + Object.entries(EXPEDICOES).map(([id, E]) =>
    `<button class="mp-exp-op" data-exp="${id}"${aviso ? ' disabled' : ''}><b>${E.nome}</b>
      <span>volta com ${comMult(E.moedas[0])} a ${comMult(E.moedas[1])} ${moedaHtml()}${E.comida ? ' + 1 comida 🍎' : ''}</span></button>`).join('');
  $('mp-exp-painel').hidden = false;
}

function mandarExpedicao(tipo) {
  const E = EXPEDICOES[tipo], pet = estado?.pets?.ativo, c = pet && cuidadosDe(pet);
  if (!E || !c || !mp || mp.pet !== pet || petFora(pet) || expedicoesHoje() >= EXPEDICOES_POR_DIA) return;
  if (barrigaDe(pet) < fomeAbaixo()) { abrirPainelExp(); return; }
  const inicio = Math.round(agoraServ()), fim = inicio + E.min * 60000;
  const moedas = comMult(E.moedas[0] + Math.floor(Math.random() * (E.moedas[1] - E.moedas[0] + 1)));
  const lista = E.comida ? comidasDaExpedicao(pet) : [];
  const comida = lista.length ? sortear(lista).id : null;
  c.expedicao = { inicio, fim, tipo, moedas, ...(comida ? { comida } : {}) };
  estado.pets.expedicoesDia = { data: diaLocal(), n: expedicoesHoje() + 1 };
  gravar({ [`pets/conquistados/${pet}/expedicao`]: c.expedicao, 'pets/expedicoes_dia': estado.pets.expedicoesDia });
  if (estado.casinha?.publicada) publicarCasinha();   // a visita vê o selo 🧭 no quadro do pet
  tocar('porta');
  $('mp-exp-painel').hidden = true;
  pararSequencia($('mp-img'));
  renderMeuPet();
  pufSeguidor();
  enviarOnline(visualOnline(pet));
}

// sai (ou volta): uma nuvem de poeira onde o pet está e ele some (ou aparece)
function pufSeguidor() {
  if (!seguidor) return;
  const ativo = estado.pets.ativo, quer = ativo && !petFora(ativo) ? ativo : null;
  const x = seguidor.pet ? seguidor.x : jog.x - 30, y = seguidor.pet ? seguidor.y : jog.y;
  if (cena && $('cena-atores')) {
    const el = document.createElement('div');
    el.className = 'jr-puf';
    el.textContent = '💨';
    Object.assign(el.style, { left: x + 'px', top: y + 'px', zIndex: Math.round(y) + 1 });
    $('cena-atores').appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
  if (quer) { preCarregarPet(formaDe(quer)); seguidor.definir(quer, formaDe(quer)); if (cena) seguidor.colocar(x, y); }
  else seguidor.definir(null);
  atualizarBotaoPet(); atualizarFomeSeguidor(); atualizarVisualPet();
}

// Meu Pet: no lugar do pet, o cartão "em expedição" com a barra; truques, carinho e bolsa desligados
function pintarExpMeuPet() {
  if (!mp) return;
  const pet = mp.pet, fora = petFora(pet), e = expedicaoDe(pet);
  $('meu-pet').classList.toggle('mp-fora', fora);
  $('mp-exp-fora').hidden = !fora;
  $('mp-carinho').disabled = fora;
  $('mp-bolsa').disabled = fora;
  const b = $('mp-exp');
  b.textContent = fora ? `🧭 ${faltaTexto(faltaExp(pet))}` : '🧭 Expedição';
  b.classList.toggle('apagado', !fora && expedicoesHoje() >= EXPEDICOES_POR_DIA);
  if (!fora) return;
  const ini = Number(e.inicio), fim = Number(e.fim), frac = Math.min(1, Math.max(0, (agoraServ() - ini) / Math.max(1, fim - ini)));
  $('mp-exp-fora-tit').textContent = `🧭 ${nomePet(pet)} está em expedição`;
  $('mp-exp-fora-hora').textContent = `volta às ${horaDe(fim)}`;
  $('mp-exp-fora-barra').style.width = (frac * 100).toFixed(1) + '%';
}

// HUD do mapa: o rosto do pet vira um mini relógio "🧭 47 min"
function atualizarRelogioExp() {
  const b = $('btn-pet');
  if (!b) return;
  let r = b.querySelector('.jr-exp-relogio');
  const fora = !!estado?.pets?.ativo && petFora();
  b.classList.toggle('fora', fora);
  if (!fora) { if (r) r.hidden = true; return; }
  if (!r) { r = document.createElement('span'); r.className = 'jr-exp-relogio'; b.appendChild(r); }
  r.hidden = false;
  r.textContent = `🧭 ${Math.max(1, Math.ceil(faltaExp() / 60000))} min`;
}

// ↩️ Chamar de volta (PROMPT-116): o pet volta na hora, SEM prêmio (moedas e comida sorteadas são descartadas) e sem
// perder barriga; a expedição continua contando em expedicoes_dia. Se o tempo acabar com a confirmação aberta, ela fecha
// e vale a volta normal, com prêmio.
function abrirChamarExp() {
  const pet = mp?.pet, e = expedicaoDe(pet);
  if (!e || !petFora(pet)) return;
  const moedas = Math.max(0, Math.round(Number(e.moedas) || 0));
  $('mp-exp-conf-txt').innerHTML = `Se ${esc(nomePet(pet))} voltar agora, não vai trazer o prêmio (${moedas} moedas${e.comida ? ' e a comida' : ''}).`;
  $('mp-exp-confirma').dataset.pet = pet;
  $('mp-exp-confirma').hidden = false;
}
function chamarDeVolta() {
  const conf = $('mp-exp-confirma'), pet = conf.dataset.pet, c = cuidadosDe(pet);
  conf.hidden = true;
  if (!c?.expedicao || !petFora(pet)) return;   // o tempo acabou: a volta normal (com prêmio) cuida
  delete c.expedicao;
  gravar({ [`pets/conquistados/${pet}/expedicao`]: null });
  if (estado.casinha?.publicada) publicarCasinha();
  tocar('porta');
  if (pet === estado.pets.ativo) { pufSeguidor(); enviarOnline(visualOnline(pet)); }
  if (mp) renderMeuPet();
  avisoPet(`↩️ ${nomePet(pet)} voltou mais cedo. Sem prêmio desta vez.`);
  const f = fraseDe(pet, 'voltei', { pet: nomePet(pet) }) || fraseDe(pet, 'feliz', { pet: nomePet(pet) });   // sem as categorias: sem fala
  if (f && mp?.pet === pet) falarPet(f);
}

let expVolta = null;   // cartão da volta aberto: { pet }
function tickExpedicao() {
  if (!carregouProgresso || !petsOk || !estado?.pets) return;
  atualizarRelogioExp();
  { const cf = $('mp-exp-confirma'); if (!cf.hidden && !petFora(cf.dataset.pet)) cf.hidden = true; }   // acabou o tempo: fecha a confirmação
  if (mp) pintarExpMeuPet();
  if (seguidor && !seguidor.pet !== !(estado.pets.ativo && !petFora())) pufSeguidor();   // a hora da volta chegou: o pet aparece
  if (expVolta || perguntaAberta || transicionando || sobreposicaoAberta() || bt || dm || duelo?.comecou || pesca) return;
  const pet = Object.keys(estado.pets.conquistados).find(p => { const e = expedicaoDe(p); return e && agoraServ() >= Number(e.fim); });
  if (pet) voltarDaExpedicao(pet);
}

// Voltou (a hora chegou, com o jogo aberto ou na próxima vez): prêmio, fome e o cartão
function voltarDaExpedicao(pet) {
  const c = cuidadosDe(pet), e = c?.expedicao;
  if (!e) return;
  const E = EXPEDICOES[e.tipo] || EXPEDICOES.curta, base = `pets/conquistados/${pet}`, agora = Date.now();
  const patch = { [`${base}/expedicao`]: null };
  delete c.expedicao;
  c.barriga = Math.max(0, Math.round((barrigaDe(pet) - E.fome) * 10) / 10); c.barriga_t = agora;   // a viagem cansa: −10 / −20
  patch[`${base}/barriga`] = c.barriga; patch[`${base}/barriga_t`] = agora;
  const moedas = Math.max(0, Math.round(Number(e.moedas) || 0));
  if (moedas) {
    estado.pets.moedas = (Number(estado.pets.moedas) || 0) + moedas;
    patch['pets/moedas'] = estado.pets.moedas;
    registrarGanho('expedicao', moedas, patch);
  }
  const item = e.comida ? itemDaBolsa(e.comida) : null;
  if (item) {
    const n = (Number(estado.pets.bolsa?.[e.comida]) || 0) + 1;
    (estado.pets.bolsa ||= {})[e.comida] = n;
    patch[`pets/bolsa/${e.comida}`] = n;
  }
  gravar(patch);
  atualizarFomeSeguidor();
  if (pet === estado.pets.ativo) { pufSeguidor(); enviarOnline(visualOnline(pet)); }
  verificarEvolucao(pet);   // voltou com lealdade 100 e sem ter evoluído: a cena vem depois do aviso da volta
  mostrarVoltaExp(pet, moedas, item);
}

function mostrarVoltaExp(pet, moedas, item) {
  expVolta = { pet };
  const f = formaDe(pet);
  const fala = fraseDe(pet, 'expedicao_volta', { pet: nomePet(pet), apelido: apelidoAluno || String(sessao.nome || '').split(' ')[0] }) || 'Que aventura!';
  $('exp-volta-tit').textContent = `🎒 ${nomePet(pet)} voltou!`;
  const img = $('exp-volta-img');
  img.src = srcIcone(f);
  encaixarIcone(img);
  aplicarVisualPet(img, pet);
  $('exp-volta-fala').textContent = fala;
  $('exp-volta-premios').innerHTML = `<span class="exp-premio">+${moedas} ${moedaHtml()}</span>` +
    (item ? `<span class="exp-premio">+1 ${imgItem(item.imagem, item.emoji || '🍎')} ${esc(item.nome || '')}</span>` : '');
  // moedas caindo
  const chuva = $('exp-volta-chuva');
  chuva.innerHTML = Array.from({ length: Math.min(16, Math.max(6, Math.round(moedas / 2))) }, (_, i) =>
    `<i style="left:${4 + Math.random() * 92}%;animation-delay:${(i * 0.09 + Math.random() * 0.2).toFixed(2)}s">${moedaHtml()}</i>`).join('');
  $('exp-volta').hidden = false;
  tocar('vitoria');
}
function fecharVoltaExp() {
  $('exp-volta').hidden = true;
  $('exp-volta-chuva').innerHTML = '';
  const pet = expVolta?.pet;
  expVolta = null;
  if (pet && pet === estado.pets.ativo) reagirSeguidor('comemora', 'feliz');
  if (mp) renderMeuPet();
}

// ============================================================
//  🗨️ PERGUNTA RÁPIDA DO PET NO CAMINHO (PROMPT-96) — às vezes, na hora de falar (petPodeFalar), o pet pergunta uma conta
//  do assunto do mapa (ginásio A ou B em que o aluno já entrou; senão, ou na Praça, um ginásio vencido). 3 botões.
//  Acertou: +1 de lealdade e comemora. Errou: diz a certa, 📖 Relembre e a questão vai para a caixinha do Treino.
//  Ignorou: some em 20 s. Até 3 por dia, 5 min entre elas: pet_pergunta_dia = { data, n, ultimo }.
// ============================================================
const PP_MAX_DIA = 3, PP_INTERVALO_MS = 5 * 60000, PP_CHANCE = 0.3, PP_MS = 20000;
let pp = null;   // { q, chave, timer, respondeu }
const ppMapaOk = () => cena?.tipo === 'mapa' && (Number(cena.n) > 0 || cena.n === 'praca');
function podePerguntarPet() {
  if (!carregouProgresso || !ppMapaOk() || perguntaAberta || transicionando || sobreposicaoAberta() || pesca || bt || duelo || dm || rl) return false;
  if (!seguidor?.pet || $('pet').hidden || petFora()) return false;
  const d = estado.petPerguntaDia;
  if (d?.data === diaLocal() && ((Number(d.n) || 0) >= PP_MAX_DIA || Date.now() - (Number(d.ultimo) || 0) < PP_INTERVALO_MS)) return false;
  return true;
}
// já entrou no ginásio: respondeu alguma pergunta dele ou venceu algum personagem
const entrouNoGinasio = (n, G) => Object.values(estado.ginasios[chaveGinasio(n, G)] || {}).some(x => x?.vencido)
  || Object.keys(estado.respostas || {}).some(id => id.startsWith(`m${n}${G}-`));
function ginasioDaPerguntaPet() {
  const n = Number(cena.n);
  if (n > 0) for (const G of embaralhar(['A', 'B'])) if (!(n === 13 && G === 'B') && entrouNoGinasio(n, G)) return { mapa: n, lado: G };
  const v = ginasiosVencidos();
  return v.length ? sortear(v) : null;
}
function perguntaDoPet() {
  if (!podePerguntarPet()) return false;
  const g = ginasioDaPerguntaPet();
  if (!g) return false;
  let q = null;
  for (let tent = 0; tent < 12 && !(q?.erradas?.length >= 2); tent++) {   // de preferência com 2 erradas
    const pers = sortear(['treinador1', 'treinador2', 'treinador3', 'lider']);
    const nova = gerarUma(g.mapa, g.lado, pers, Math.floor(Math.random() * 5));
    if (nova && !nova.tabela && nova.erradas?.length && !(q && nova.erradas.length <= q.erradas.length)) q = nova;
  }
  if (!q) return false;
  const hoje = diaLocal(), d = estado.petPerguntaDia?.data === hoje ? estado.petPerguntaDia : { data: hoje, n: 0 };
  estado.petPerguntaDia = { data: hoje, n: (Number(d.n) || 0) + 1, ultimo: Date.now() };   // ignorar também conta
  gravar({ pet_pergunta_dia: estado.petPerguntaDia });
  pararFalaPet();
  const certa = String(q.resposta);
  pp = { q, certa, chave: chaveGinasio(g.mapa, g.lado), respondeu: false };
  const el = $('pet-pergunta');
  el.innerHTML = `Ei! Rapidinho: <span class="pp-conta">${esc(q.enunciado)}</span>?
    <div class="pp-botoes">${embaralhar([certa, ...q.erradas.slice(0, 2).map(String)]).map(v => `<button data-pp="${esc(v)}">${esc(v)}</button>`).join('')}</div>`;
  el.hidden = false;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  posicionarPerguntaPet();
  reagirSeguidor('rapida', 'feliz');
  pp.timer = setTimeout(fecharPerguntaPet, PP_MS);   // ignorou: some sem penalidade
  return true;
}
function posicionarPerguntaPet() {
  const el = $('pet-pergunta');
  if (el.hidden || !seguidor?.pet) return;
  posicionarNaTela(el, seguidor.x, seguidor.y - seguidor.altura - 2);
}
// a cada quadro: o balão acompanha o pet; trocou de mapa, abriu uma tela ou o pet sumiu → fecha
function atualizarPerguntaPet() {
  if (!ppMapaOk() || perguntaAberta || transicionando || sobreposicaoAberta() || !seguidor?.pet || $('pet').hidden) { fecharPerguntaPet(); return; }
  posicionarPerguntaPet();
}
function fecharPerguntaPet() {
  if (pp) clearTimeout(pp.timer);
  pp = null;
  $('pet-pergunta').hidden = true;
  conversa.proximaT = performance.now() + (configFalas().intervalo_min_s ?? 90) * 1000;
}
function responderPerguntaPet(b) {
  if (!pp || pp.respondeu) return;
  pp.respondeu = true;
  clearTimeout(pp.timer);
  const el = $('pet-pergunta'), botoes = [...el.querySelectorAll('[data-pp]')];
  botoes.forEach(x => { x.disabled = true; if (x.dataset.pp === pp.certa) x.classList.add('certa'); });
  const pet = estado.pets.ativo;
  if (b.dataset.pp === pp.certa) {
    tocar('acerto');
    b.classList.add('certa');
    if (pet && cuidadosDe(pet)) { gravar(ganharLealdade(pet, 1)); verificarMarcosLealdade(pet); }
    reagirSeguidor('rapida', 'feliz');   // adulto: `carinho` (ri de lado)
    el.insertAdjacentHTML('afterbegin', '<b>Isso! 🎉</b> ');
    pp.timer = setTimeout(fecharPerguntaPet, 2500);
    return;
  }
  tocar('erro');
  b.classList.add('errada');
  caixaErrou(pp.q.id);   // 🎯 volta amanhã no Treino
  seguidor?.reagir('triste_fome', 1500);
  const rel = explicacaoDe(pp.chave);
  el.innerHTML = `Quase! A certa é <span class="pp-conta">${esc(pp.certa)}</span>.
    <div class="pp-botoes">${rel ? '<button class="pp-relembre" data-pp="relembre">📖 Relembre</button>' : ''}</div>`;
  posicionarPerguntaPet();
  pp.timer = setTimeout(fecharPerguntaPet, rel ? 8000 : 4000);
}

// ============================================================
//  📒 ÁLBUM DE MATEMÁTICOS e 💡 CURIOSIDADES DO PET (PROMPT-98) — dados/jogo/album.json e curiosidades.json
//  album/{chave} = { data, dourada }: ganha ao vencer o líder; fica dourada com a insígnia dourada (a revanche), como a
//  insígnia. Quem já tinha insígnias recebe as figurinhas ao entrar (aviso uma vez: avisos/album_migrado).
//  album_completo = { data }: as 26 → insígnia especial (só um selo no estojo; não muda a nota).
//  Curiosidade: tipo de fala do pet (peso 2): abre[pet] + texto + às vezes fecha; prefere as do mapa onde o aluno está,
//  sem repetir até contar todas do grupo (no aparelho: localStorage jr_curio); se tem `album`, um 2º balão cita a figurinha.
// ============================================================
let ALBUM = null, CURIO = null, figurinhaPendente = null;
let falarCurioParam = false;   // ?falar=curiosidade (só no modo teste): o pet conta uma curiosidade ao entrar no mapa
const figurinhas = () => ALBUM?.figurinhas || {};
const CHAVES_ALBUM = () => Array.from({ length: NUM_MAPAS }, (_, i) => ['A', 'B'].map(G => chaveGinasio(i + 1, G))).flat();
const totalAlbum = () => CHAVES_ALBUM().filter(c => figurinhas()[c]).length;
const temFigurinha = (chave) => !!estado?.album?.[chave];
// garante a figurinha de quem venceu o líder (dourada se a insígnia é dourada); devolve 'nova' | 'dourada' | null
function darFigurinha(chave, patch) {
  const g = estado.ginasios[chave];
  if (!figurinhas()[chave] || !g?.insignia) return null;
  const f = estado.album[chave];
  if (!f) { estado.album[chave] = { data: Date.now(), dourada: !!g.dourada }; patch[`album/${chave}`] = estado.album[chave]; return g.dourada ? 'dourada' : 'nova'; }
  if (g.dourada && !f.dourada) { f.dourada = true; patch[`album/${chave}/dourada`] = true; return 'dourada'; }
  return null;
}
function verificarAlbumCompleto(patch) {
  if (estado.albumCompleto || !totalAlbum() || CHAVES_ALBUM().some(c => figurinhas()[c] && !temFigurinha(c))) return false;
  estado.albumCompleto = { data: Date.now() };
  patch.album_completo = estado.albumCompleto;
  return true;
}
function iniciarAlbum() {
  if (!ALBUM || !carregouProgresso) return;
  const patch = {};
  let n = 0;
  for (const c of CHAVES_ALBUM()) if (darFigurinha(c, patch) === 'nova' || patch[`album/${c}`]) n++;
  const completo = verificarAlbumCompleto(patch);
  if (!Object.keys(patch).length) return;
  estado.avisos ||= {};
  if (n && !estado.avisos.album_migrado) { estado.avisos.album_migrado = true; patch['avisos/album_migrado'] = true; setTimeout(() => avisoPet(`📒 Você ganhou ${n} figurinha${n === 1 ? '' : 's'} no Álbum!`, true), 3000); }
  gravar(patch);
  if (completo) setTimeout(() => avisoPet(`${ALBUM.insignia_completo?.emoji || '📒'} Insígnia especial: ${ALBUM.insignia_completo?.nome || 'Álbum completo'}!`, true), 6000);
}
function ganharFigurinha(chave) {
  if (!ALBUM) return;
  const patch = {}, tipo = darFigurinha(chave, patch);
  if (!tipo) return;
  const completo = verificarAlbumCompleto(patch);
  gravar(patch);
  figurinhaPendente = { chave, dourada: tipo === 'dourada', completo };
}
function cartaHtml(chave, num) {
  const f = figurinhas()[chave];
  if (!f) return '';
  const [mapaStr, G] = chave.replace('mapa', '').split('-');
  const gin = D.questoes[Number(mapaStr)]?.ginasios?.[G];
  const minha = estado.album?.[chave];
  if (!minha) return `<button class="al-carta falta" aria-label="Figurinha que falta"><div class="al-giro"><div class="al-face al-frente">
      <span class="al-simbolo">?</span><span class="al-falta">Vença o líder da <b>${esc(gin?.nome || '')}</b> (Mapa ${Number(mapaStr)})</span></div></div></button>`;
  return `<button class="al-carta${minha.dourada ? ' dourada' : ''}" style="--cor:${esc(f.cor || '#7c5cfc')}" aria-label="${esc(f.nome)}"><div class="al-giro">
      <div class="al-face al-frente"><span class="al-num">${num}</span><span class="al-simbolo">${esc(f.simbolo || '')}</span>
        <span class="al-nome">${esc(f.nome)}<small>${esc(f.epoca || '')} · ${esc(f.lugar || '')}</small></span></div>
      <div class="al-face al-verso"><b>${esc(f.nome)}</b><span>${esc(f.texto || '')}</span>
        <span class="al-de">📍 ${esc(gin?.nome || '')} · Mapa ${Number(mapaStr)}${minha.dourada ? ' · ✨ dourada' : ''}</span></div>
    </div></button>`;
}
function abrirAlbum() {
  if (!ALBUM) return;
  const chaves = CHAVES_ALBUM().filter(c => figurinhas()[c]);
  $('al-grade').innerHTML = chaves.map((c, i) => cartaHtml(c, i + 1).replace('<button class="al-carta', `<button data-i="${i}" class="al-carta`)).join('');
  const tem = chaves.filter(temFigurinha).length, dour = chaves.filter(c => estado.album[c]?.dourada).length;
  $('al-cont').textContent = `${tem}/${chaves.length} · ✨ ${dour} dourada${dour === 1 ? '' : 's'}`;
  $('album').hidden = false;
  $('al-grade').scrollLeft = 0;
}
// Cartão grande (PROMPT-99): a carta da frente à esquerda; nome, época · lugar, de onde veio e o texto_completo à direita
let alAtual = 0;
function abrirCartaoFigurinha(i) {
  const chaves = CHAVES_ALBUM().filter(c => figurinhas()[c]);
  if (!chaves.length) return;
  alAtual = (i + chaves.length) % chaves.length;
  const chave = chaves[alAtual], f = figurinhas()[chave], minha = estado.album?.[chave];
  const [mapaStr, G] = chave.replace('mapa', '').split('-');
  const gin = D.questoes[Number(mapaStr)]?.ginasios?.[G];
  $('al-cartao-carta').innerHTML = cartaHtml(chave, alAtual + 1);
  $('al-cartao-info').innerHTML = minha
    ? `<b class="al-ci-nome">${esc(f.nome)}${minha.dourada ? ' ✨' : ''}</b><span class="al-ci-sub">${esc(f.epoca || '')} · ${esc(f.lugar || '')}</span>
       <span class="al-ci-de">📍 ${esc(gin?.nome || '')} (Mapa ${Number(mapaStr)})${gin?.conteudo ? ` · ${esc(gin.conteudo)}` : ''}</span>
       <div class="al-ci-texto">${esc(f.texto_completo || f.texto || '')}</div>`
    : `<b class="al-ci-nome">?</b><div class="al-ci-texto">Vença o líder da <b>${esc(gin?.nome || '')}</b> (Mapa ${Number(mapaStr)}) para ganhar esta figurinha.</div>`;
  $('al-cartao-info').scrollTop = 0;
  $('al-cartao').hidden = false;
}
function pintarEspecialAlbum() {
  const el = $('estojo-especial'), b = $('btn-album');
  const anos = Object.keys(estado.pets?.conquistados || {}).filter(p => petValido(p) && cuidadosDe(p)?.insignia_ano).map(p => `🎂 1 ano com ${nomePet(p)}`);   // PROMPT-102
  b.hidden = !ALBUM;
  el.hidden = !ALBUM && !anos.length;
  const ic = ALBUM?.insignia_completo || {};
  el.classList.toggle('completo', !!estado.albumCompleto || anos.length > 0);
  const album = !ALBUM ? '' : estado.albumCompleto ? `${ic.emoji || '📒'} ${ic.nome || 'Álbum completo'} ✓` : `📒 Álbum: ${CHAVES_ALBUM().filter(temFigurinha).length}/${totalAlbum()} figurinhas`;
  el.textContent = [album, ...anos].filter(Boolean).join(' · ');
}
function mostrarFigurinhaPendente() {
  const fp = figurinhaPendente;
  figurinhaPendente = null;
  if (!fp) return;
  const i = CHAVES_ALBUM().filter(c => figurinhas()[c]).indexOf(fp.chave);
  $('fig-nova-tit').textContent = fp.dourada ? 'Figurinha dourada! ✨' : 'Nova figurinha!';
  $('fig-nova-carta').innerHTML = cartaHtml(fp.chave, i + 1);
  $('fig-nova').hidden = false;
  $('fig-nova')._fp = fp;
  tocar(fp.dourada ? 'dourada' : 'insignia');
}
function fecharFigurinhaNova() {
  const fp = $('fig-nova')._fp;
  $('fig-nova').hidden = true;
  if (fp?.completo) avisoPet(`${ALBUM.insignia_completo?.emoji || '📒'} Álbum completo! Insígnia especial: ${ALBUM.insignia_completo?.nome || ''}`, true);
  if (festaPendente) { const f = festaPendente; festaPendente = null; setTimeout(() => mostrarFestaMestre(f), 500); }
}

// 💡 a próxima curiosidade: o grupo do mapa onde o aluno está; acabou (ou Praça/mapa geral): gerais e os outros mapas
const CURIO_KEY = 'jr_curio';
function proximaCuriosidade() {
  const grupos = CURIO?.por_mapa || {};
  const aqui = Number(cena?.n) > 0 && cena?.tipo === 'mapa' ? 'mapa' + cena.n : null;
  const ordem = [...(aqui ? [aqui] : []), 'gerais', ...embaralhar(Object.keys(grupos).filter(g => g !== aqui))];
  const lista = (g) => (g === 'gerais' ? CURIO?.gerais : grupos[g]) || [];
  let vistas = {};
  try { vistas = JSON.parse(localStorage.getItem(CURIO_KEY) || '{}') || {}; } catch (_) {}
  const salvar = () => { try { localStorage.setItem(CURIO_KEY, JSON.stringify(vistas)); } catch (_) {} };
  for (const g of ordem) {
    const l = lista(g), ja = new Set(vistas[g] || []);
    const livres = l.map((_, i) => i).filter(i => !ja.has(i));
    if (!livres.length) continue;
    const i = sortear(livres);
    vistas[g] = [...ja, i]; salvar();
    return l[i];
  }
  // contou todas: recomeça o primeiro grupo (o do mapa, ou as gerais)
  const g = ordem.find(x => lista(x).length);
  if (!g) return null;
  const i = Math.floor(Math.random() * lista(g).length);
  vistas[g] = [i]; salvar();
  return lista(g)[i];
}
const NOMES_PROPRIOS = /^(Eratóstenes|Fibonacci|Descartes|Diofanto|Florence|Ada|Malba|Tales|Brahmagupta|Artur|Simon|Robert|Al-|IBGE|GPS|π|\d)/;
function baloesCuriosidade(pet) {
  const it = proximaCuriosidade();
  if (!it?.t) return null;
  const abre = sortear(CURIO.abre?.[pet] || []) || '';
  let t = String(it.t);
  // "…Inclusive que" + "O sinal…" → "o sinal…" (nomes próprios e siglas ficam como estão)
  if (abre && /[a-zà-ú,]$/i.test(abre.trim()) && !NOMES_PROPRIOS.test(t)) t = t.charAt(0).toLowerCase() + t.slice(1);
  let texto = abre ? `${abre.trim()} ${t}` : t;
  if (CURIO.fecha?.length && Math.random() < 0.5) texto += ` ${sortear(CURIO.fecha)}`;
  const baloes = quebrarBaloes([{ texto, espera: 0, largo: true }]);   // em pedaços de até ~60 letras, cada um com o tempo de leitura
  const f = it.album && figurinhas()[it.album];
  if (f) baloes.push({ texto: temFigurinha(it.album) ? `É da sua figurinha de ${f.nome}! 📒` : 'Tem uma figurinha sobre isso no Álbum… 👀', espera: 300 });
  return baloes;
}

// ============================================================
//  🎂 ANIVERSÁRIO DO PET (PROMPT-102) — a cada mês completo desde pets/conquistados/{pet}/data (data local; mês sem o dia →
//  o último dia do mês). A festa vem uma vez, na 1ª vez que o pet aparece no dia (mapa livre ou Meu Pet): cartão com confete,
//  chapéu, fala `aniversario`, +10 de lealdade e 1 Bolo especial; aniversarios/{n} = true. Não entrou no dia: perdeu (não acumula).
//  A cada 12 meses: "N ano(s) juntos!", +20 de lealdade; na 1ª vez, insignia_ano (selo "🎂 1 ano com {nome}" no estojo, sem nota).
//  O dia todo: chapéu de festa no mapa e no Meu Pet. ?aniversario=1 (modo teste) força a festa do pet ativo.
// ============================================================
const LEALDADE_ANIV = 10, LEALDADE_ANIV_ANO = 20;
let anivForcado = null;   // ?aniversario=1: 'pendente' → já festejou ('feito')
const ultimoDiaMes = (a, m) => new Date(a, m + 1, 0).getDate();
// n ≥ 1 se hoje é o aniversário de n meses do pet (senão 0)
function mesesDeAniversario(pet, hoje = new Date()) {
  const t = Number(cuidadosDe(pet)?.data);
  if (!t) return 0;
  const d0 = new Date(t), n = (hoje.getFullYear() - d0.getFullYear()) * 12 + hoje.getMonth() - d0.getMonth();
  if (anivForcado && pet === estado?.pets?.ativo) return Math.max(1, n);
  if (n < 1) return 0;
  return hoje.getDate() === Math.min(d0.getDate(), ultimoDiaMes(hoje.getFullYear(), hoje.getMonth())) ? n : 0;
}
const tempoJuntos = (n) => (n % 12 === 0 ? `${n / 12} ${n === 12 ? 'ano' : 'anos'}` : `${n} ${n === 1 ? 'mês' : 'meses'}`);
function datarPetsAntigos() {
  const patch = {};
  for (const [p, c] of Object.entries(estado.pets.conquistados || {})) if (c && !Number(c.data)) { c.data = Date.now(); patch[`pets/conquistados/${p}/data`] = c.data; }
  if (Object.keys(patch).length) gravar(patch);
  if (teste && new URLSearchParams(location.search).get('aniversario') === '1') anivForcado = 'pendente';
}
function tickAniversario() {
  if (!carregouProgresso || !petsOk || !estado?.pets || !$('aniv').hidden) return;
  const pet = estado.pets.ativo, c = cuidadosDe(pet);
  if (!c || petFora(pet)) return;
  const n = mesesDeAniversario(pet);
  if (!n || (c.aniversarios?.[n] && anivForcado !== 'pendente')) return;
  const noMapa = cena?.tipo === 'mapa' && seguidor?.pet === pet && !$('pet').hidden && !sobreposicaoAberta() && !perguntaAberta && !transicionando && !pesca;
  const noMeuPet = mp?.pet === pet && [...document.querySelectorAll('#meu-pet .mp-sub')].every(x => x.hidden);
  if (noMapa || noMeuPet) festaAniversario(pet, n);
}
function festaAniversario(pet, n) {
  const c = cuidadosDe(pet), base = `pets/conquistados/${pet}`, patch = {};
  if (anivForcado === 'pendente') anivForcado = 'feito';
  const ano = n % 12 === 0, nome = nomePet(pet);
  c.aniversarios = { ...(c.aniversarios || {}), [n]: true };
  patch[`${base}/aniversarios/${n}`] = true;
  const leal = ano ? LEALDADE_ANIV_ANO : LEALDADE_ANIV;
  ganharLealdade(pet, leal, patch);
  const bolo = itemDaBolsa('bolo');
  if (bolo) { const k = (Number(estado.pets.bolsa?.bolo) || 0) + 1; (estado.pets.bolsa ||= {}).bolo = k; patch['pets/bolsa/bolo'] = k; }
  const insignia = ano && !c.insignia_ano;
  if (insignia) { c.insignia_ano = { data: Date.now() }; patch[`${base}/insignia_ano`] = c.insignia_ano; }
  gravar(patch);
  verificarMarcosLealdade(pet);
  // o cartão
  $('aniv-tit').textContent = ano ? `🎂 ${tempoJuntos(n)} juntos!` : `🎂 Hoje ${nome} faz ${tempoJuntos(n)} com você!`;
  const img = $('aniv-img');
  img.src = srcIcone(formaDe(pet)); encaixarIcone(img); aplicarVisualPet(img, pet);
  $('aniv-fala').textContent = fraseDe(pet, 'aniversario', { n, tempo: tempoJuntos(n), pet: nome, apelido: apelidoAluno || String(sessao.nome || '').split(' ')[0] }) || 'Que dia feliz! 🎉';
  $('aniv-premios').innerHTML = `<span class="exp-premio">❤️ +${leal} de lealdade</span>` + (bolo ? `<span class="exp-premio">+1 ${imgItem(bolo.imagem, bolo.emoji || '🎂')} ${esc(bolo.nome || 'Bolo')}</span>` : '') +
    (insignia ? `<span class="exp-premio">🏅 Insígnia: 🎂 1 ano com ${esc(nome)}</span>` : '');
  const cores = ['#ff4d8d', '#ffd700', '#00d4ff', '#7c5cfc', '#00e676', '#ff7b2e'];
  $('aniv-confete').innerHTML = Array.from({ length: 36 }, (_, i) => `<i style="left:${(Math.random() * 100).toFixed(1)}%;background:${cores[i % cores.length]};animation-delay:${(Math.random() * 1.2).toFixed(2)}s"></i>`).join('');
  $('aniv').hidden = false;
  tocar(ano ? 'dourada' : 'vitoria');
  if (mp?.pet === pet) { if (!mp.anim.sequencia('vitoria')) mp.anim.tocar(temAnim(mp.forma, 'animado') ? 'animado' : 'feliz'); }
  else reagirSeguidor('comemora', 'feliz');   // dragão adulto: `vitoria`
  if (mp) renderMeuPet();
}
// chapéu de festa: no dia do aniversário, acima da cabeça do pet (mapa e Meu Pet)
const comChapeu = (pet) => !!pet && mesesDeAniversario(pet) > 0;
function posicionarChapeu() {
  const el = $('pet-chapeu');
  const pet = seguidor?.pet;
  const mostra = !!pet && cena?.tipo === 'mapa' && !$('pet').hidden && comChapeuCache(pet);
  el.hidden = !mostra;
  if (!mostra) return;
  const alt = seguidor.altura || 60, topo = seguidor.y - alt * Math.min(0.95, sentadoNoQuadro(seguidor.forma) || 0.8);
  el.style.setProperty('--chapeu', Math.max(12, alt * 0.24).toFixed(1) + 'px');
  el.style.left = seguidor.x + 'px';
  el.style.top = topo + 'px';
  el.style.zIndex = Math.round(seguidor.y);
}
// o dia não muda a cada quadro: guarda a resposta por pet e por dia
const chapeuCache = new Map();
function comChapeuCache(pet) {
  const k = pet + '|' + diaLocal() + '|' + (anivForcado || '');
  if (!chapeuCache.has(k)) chapeuCache.set(k, comChapeu(pet));
  return chapeuCache.get(k);
}
function pintarChapeuMeuPet() {
  const el = $('mp-chapeu');
  if (!mp || !comChapeu(mp.pet) || petFora(mp.pet)) { el.hidden = true; return; }
  const palco = $('mp-palco'), h = $('mp-img').offsetHeight || 150;
  el.style.setProperty('--chapeu', Math.max(22, h * 0.2).toFixed(1) + 'px');
  el.style.left = '50%';
  el.style.top = (palco.clientHeight * 0.9 - h * Math.min(0.95, sentadoNoQuadro(mp.forma) || 0.8)) + 'px';
  el.hidden = false;
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
  sc.scrollTop = r.y / H * ph - sc.clientHeight / 2;
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
// largura lógica da cena: 1376, ou mais na sala da Exposição (cena.w = 2176)
const larguraCena = () => Number(cena?.w) || W;
function ajustarCamera() {
  const vp = $('cena-vp');
  const vw = vp.clientWidth, vh = vp.clientHeight, LW = larguraCena();
  if (deitado()) {
    // Celular/tablet (deitado ou girado): preenche a largura e segue o jogador nos dois eixos
    // (um pouco abaixo do centro, para o personagem não ficar atrás do HUD do topo)
    cam.s = Math.max(vw / LW, vh / H);
    cam.tx = clamp(vw / 2 - focoX() * cam.s, vw - LW * cam.s, 0);
    cam.ty = clamp(vh * 0.55 - focoY() * cam.s, vh - H * cam.s, 0);
  } else if (vh > vw || LW > W) {
    // Em pé (ou a sala larga da Exposição): cena na altura da tela, rola na horizontal seguindo o jogador
    cam.s = vh / H;
    cam.ty = 0;
    cam.tx = LW * cam.s <= vw ? (vw - LW * cam.s) / 2 : clamp(vw / 2 - focoX() * cam.s, vw - LW * cam.s, 0);
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
  perguntaAberta || !$('estojo').hidden || !$('cartao').hidden || !$('insignia-ganha').hidden || !$('pet-escolha').hidden || !$('pet-colecao').hidden || !$('pet-levar').hidden || !$('meu-pet').hidden || !$('reacoes').hidden || !$('online-lista').hidden || !$('pers-escolha').hidden || !$('gin-fechado').hidden || !$('pet-silhueta').hidden || !$('bt-lista').hidden || !$('batalha').hidden || !$('pedido').hidden || !$('loja').hidden || !$('pesca-aviso').hidden || !$('pesca-tutorial').hidden || !$('pesca-ranking').hidden || !$('mural').hidden || !$('convite').hidden || !$('duelo').hidden || !$('maquina').hidden || !$('jogo-embed').hidden || !$('aovivo').hidden || !$('pet-evolucao').hidden || !$('relembre').hidden || !$('missoes').hidden || !$('moedas-hoje').hidden || !$('programe').hidden || !$('pg-mapa').hidden || !$('damas').hidden || !$('estudos').hidden || !$('exp-volta').hidden || !$('relampago').hidden || !$('album').hidden || !$('fig-nova').hidden || !$('al-cartao').hidden || !$('aniv').hidden || !$('pres-card').hidden || !!cs?.arrumando || !$('cs-colecao').hidden || !$('cs-aquario').hidden || !$('cs-comida').hidden || !$('cs-temas').hidden || !$('venc').hidden || !$('cs-menu').hidden || !$('vila-convite').hidden || !$('vila-busca').hidden || !!ex?.editando || !$('ex-cont').hidden || !$('ex-temas').hidden || !$('ex-ver').hidden;

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
    const livre = (x, y) => x >= 0 && y >= 0 && x < larguraCena() && y < H && andavel(g, Math.floor(x / CEL), Math.floor(y / CEL));
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
  tickNemAi(dt);
  tickOnline(dt);
  dmPet?.atualizar(dt);
  evo?.anim.atualizar(dt);
  tentarEvolucao();
  if ((fomeT += dt) > 10) { fomeT = 0; atualizarFomeSeguidor(); }   // a barriga cai devagar: confere a cada 10 s
  // ações do pet (cheirar, banho, rugir…): só com o mapa livre — sem balão de fala, janela por cima, pesca ou provador
  seguidor?.pausarAcoes(!cena || transicionando || sobreposicaoAberta() || conversa.falando || !!pesca || !!petNoPedestal || !!cs?.petAlvo);
  if (cs && !ehCasinha()) fecharCasinha();   // saiu da casinha
  if (expoOuvindo && cena && !ehSaguao() && !salaExpo()) pararExpo();   // 🖼️ saiu da Exposição
  if (ex && cena?.expoSala !== ex.n) fecharSalaExpo();                   // 🖼️ saiu da sala
  if (ex && cena?.expoSala === ex.n) atualizarSalaExpo(dt);
  if (cena && !perguntaAberta && !transicionando) {
    const [vx, vy] = ex?.editando ? [0, 0] : vetorEntrada();   // 🖼️ decorando: o toque é dos móveis
    if (!vx && !vy) soltouDesdeTroca = true;
    if (pesca && (vx || vy)) sairPesca();   // andar levanta da pesca
    const direto = (vx || vy) && moverDireto(dt, vx, vy);
    if (!direto) passo(dt);
    const pet = seguidor?.forma;   // o tamanho e a distância são os da forma (o adulto é maior)
    const e = escalaPetCena(pet);
    if (petNoPedestal) seguidor?.atualizar(dt, petNoPedestal[0], petNoPedestal[1], 0, altImagemPet(pet) * e, 0, e);   // no provador: fica no pedestal
    else if (cs?.petAlvo) seguidor?.atualizar(dt, cs.petAlvo[0], cs.petAlvo[1], cs.petVel, altImagemPet(pet) * e, 0, e);   // 🏠 indo para a cama / num canto (arrumando)
    else if (cs?.passeio && !cs.passeio.seguir) seguidor?.atualizar(dt, cs.passeio.lider[0], cs.passeio.lider[1], cs.passeio.vel, altImagemPet(pet) * e, 0, e);   // 🐾 solto pela casinha (PROMPT-110)
    else seguidor?.atualizar(dt, jog.x, jog.y, VEL, altImagemPet(pet) * e, distPet(pet) * e, e);
    posicionarChapeu();   // 🎂 no dia do aniversário
    petGin?.anim.atualizar(dt);
    if (cena.tipo === 'mapa') { atualizarColegas(dt); enviarPosicao(); posicionarMinhaReacao(); posicionarCartaoColega(); atualizarConversa(); efeitosDoMapa(); }
    ajustarCamera();
    if (cena?.tipo === 'mapa') {
      atualizarMapa();
      if (cena.n === 'praca') atualizarPraca();
      else if (cena.n === 'loja') atualizarLoja();
      else if (cena.n === 'casinha') atualizarCasinha(dt);
      else if (cena.n === 'vila') atualizarVila(dt);
      atualizarCavar();
      dicaEntrar();
      if (vx || vy) verificarZonaEntrada(vx, vy);   // mesmo parado contra o fim da trilha, empurrar para cima entra
      if (direto) verificarEncostou(vx, vy);
    } else if (cena) {
      atualizarSaidaGin();
      if (direto && vx < 0) verificarSaiuGin();
      atualizarBalao();
      posicionarRevanche();
    }
  }
  atualizarHudPraca();
  if (cena !== dnCena) { cenaDiaNoite(); if (pp) fecharPerguntaPet(); }   // trocou de cena: dia e noite, luzes; fecha a pergunta do pet
  if (cena?.tipo !== 'mapa' && !$('btn-acao-mapa').hidden) esconderAcaoMapa();
  requestAnimationFrame(loop);
}
// Atalho 🏛️ nos outros mapas; na praça o botão de reações vira 💬 (frases prontas)
function atualizarHudPraca() {
  const bp = $('btn-praca'), esconde = !(cena?.tipo === 'mapa' && cena.n !== 'praca' && pracaPronta());
  if (bp.hidden !== esconde) bp.hidden = esconde;
  const bo = $('btn-online'), semOnline = !(cena && onlineAtivo());   // 👥 Online (N): em qualquer mapa e na Praça
  if (bo.hidden !== semOnline) bo.hidden = semOnline;
  atualizarHudMissoes();
  const brel = $('btn-relembre'), semRel = !(cena?.tipo === 'interior' && explicacaoDe(cena.chave));   // 📖 no interior do ginásio
  if (brel.hidden !== semRel) brel.hidden = semRel;
  // faixa da casinha (fora do arrumar): ⭐ Mais curtidas (PROMPT-130) sempre; 🛠️ Arrumar e 🛒 Móveis só na minha casinha
  const naCasa = !!(ehCasinha() && cs && !cs.arrumando), sa = !(naCasa && !cs.visita), ba = $('cs-botoes');
  if (ba.hidden !== !naCasa) ba.hidden = !naCasa;
  if ($('cs-arrumar').hidden !== sa) $('cs-arrumar').hidden = $('cs-comprar').hidden = sa;
  const st = sa || meusTemas().length < 2, bt2 = $('cs-tema');   // 🎨 Tema (PROMPT-112): com mais de um tema
  if (bt2.hidden !== st) bt2.hidden = st;
  const sc = !(CASA && carregouProgresso && mapaComCasa()), bc = $('btn-casa');   // 🏠 nos mapas abertos e na Praça
  if (bc.hidden !== sc) bc.hidden = sc;
  atualizarHudExpo();   // 🖼️ 🔈 na sala da Exposição
  const ic = ehPraca() || ehVila() ? '💬' : '😊', br = $('btn-reacao');
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
async function trocarFundo(src, largura = W) {   // largura: só a sala da Exposição é mais larga (2176)
  // espera o load (decode() pode ficar pendente com a aba em segundo plano)
  const f = $('cena-fundo');
  const lw = largura === W ? '' : largura + 'px';
  if (f.style.width !== lw) f.style.width = $('cena-palco').style.width = lw;
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
  else if (cena.n === 'casinha') sairDaCasinha();
  else if (cena.n === 'vila') { if (cena.vila && !cena.vila.minha) transicao(() => abrirVila({ casa: true })); else sairDaVila(); }   // na vila de outro: ⬅ Minha vila
  else if (cena.n === 'loja') sairDaLoja();
  else if (ehSaguao()) transicao(() => abrirPraca('exposicao'));
  else if (salaExpo()) { const k = salaExpo(); transicao(() => abrirSaguao(k)); }
  else transicao(abrirMapaGeral);
}

// ============================================================
//  3.2 MAPA DA REGIÃO — trilha + A*
// ============================================================
const gradesCache = {};

// gw × gh: tamanho da grade (padrão 344 × 192 = cena de 1376 × 768); a grade guarda o seu (g.gw, g.gh)
function carregarGrade(arquivo, gw = GW, gh = GH) {
  if (gradesCache[arquivo]) return Promise.resolve(gradesCache[arquivo]);
  return new Promise((ok, falha) => {
    const im = new Image();
    im.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = gw; cv.height = gh;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(im, 0, 0, gw, gh);
      const px = ctx.getImageData(0, 0, gw, gh).data;
      const g = new Uint8Array(gw * gh);
      for (let i = 0; i < gw * gh; i++) g[i] = px[i * 4] > 127 ? 1 : 0;
      if (gw !== GW || gh !== GH) { g.gw = gw; g.gh = gh; }
      gradesCache[arquivo] = g;
      ok(g);
    };
    im.onerror = () => falha(new Error('trilha ' + arquivo));
    im.src = `${IMG}/trilhas/${arquivo}`;
  });
}

const gwDe = (g) => g?.gw || GW, ghDe = (g) => g?.gh || GH;
const andavel = (g, cx, cy) => { const gw = gwDe(g); return cx >= 0 && cy >= 0 && cx < gw && cy < ghDe(g) && g[cy * gw + cx] === 1; };
// g: a grade da célula (sem ela, ou com um número, como em .map(centroCelula): a largura padrão)
const centroCelula = (i, g) => { const gw = gwDe(g); return [(i % gw) * CEL + CEL / 2, Math.floor(i / gw) * CEL + CEL / 2]; };

function celulaMaisProxima(g, x, y) {
  const GW = gwDe(g), GH = ghDe(g);
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
  const GW = gwDe(g), N = GW * ghDe(g);
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
  const caminho = suavizar(g, [[jog.x, jog.y], ...cells.map(i => centroCelula(i, g))]).slice(1);
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
  bloquearQuadroEstudos(grade, n);   // o personagem não atravessa a base do quadro de estudos

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
  montarQuadroEstudos(n);
  montarPortaLoja(n);
  montarCavar(n);
  fecharBalaoPorta();

  if (onde === 'loja' && cena.portaLoja) posicionarJogador(cena.portaLoja.trilha[0], cena.portaLoja.trilha[1], 'frente');   // saiu da loja
  else if (onde === 'A' || onde === 'B') {
    const [x, y] = pontoAntesDaPorta(n, onde);
    posicionarJogador(x, y, 'frente');
  } else if (onde?.pos) {   // voltou da casinha pelo 🏠 (PROMPT-108): onde estava
    posicionarJogador(onde.pos.x, onde.pos.y, onde.pos.dir);
  } else {
    posicionarJogador(cfg.entrada[0], cfg.entrada[1], 'frente');
  }
  soltouDesdeTroca = false;
  ajustarCamera();
  $('cena-palco').style.visibility = '';
  atualizarBotaoPet();
  entrarNoMapaOnline(n);
  conversa.proximaT = performance.now() + 8000;   // 1ª fala no mapa pode vir depois de 8 s
  conversa.primeiraCurio = true; conversa.curioAgora = falarCurioParam;   // 💡 (PROMPT-99)
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
  cena.saidas.forEach((s, i) => lista.push({ id: 'saida-' + i, tipo: 'saida', i, x: s.x, y: s.y, trilha: s.trilha, faixa: s.faixa || null }));
  // prédios que também entram andando pelas setas: Fliperama e Loja na Praça, Loja no Mercado (o Mural é só por toque/perto)
  if (ehPraca()) for (const alvo of ['fliperama', 'loja', 'laboratorio', 'casinha']) {
    const b = cena[alvo];
    if (b) lista.push({ id: 'predio-' + alvo, tipo: 'predio', alvo, x: b.x, y: b.y, trilha: b.trilha });
  }
  if (ehVila()) for (const c of cena.casas || []) lista.push({ id: 'vila-' + c.lado, tipo: 'predio', alvo: 'vila:' + c.lado, x: c.porta[0], y: c.porta[1], trilha: c.trilha, largura: 60 });
  if (cena.n === 'laboratorio') for (const c of cena.computadores || []) lista.push({ id: 'pc-' + c.id, tipo: 'predio', alvo: 'pc:' + c.id, x: c.x, y: c.y, trilha: c.trilha });
  const ex = ehPraca() && cena.exposicao;   // 🖼️ pavilhão da Exposição
  if (ex) lista.push({ id: 'predio-exposicao', tipo: 'predio', alvo: 'exposicao', x: ex.ponto[0], y: ex.ponto[1], trilha: ex.trilha, largura: 80 });
  if (ehSaguao()) for (const p of cena.expoPortas || []) lista.push({ id: 'expo-' + p.n, tipo: 'predio', alvo: 'expo:' + p.n, x: p.ponto[0], y: p.ponto[1], trilha: p.trilha, largura: 40 });   // a zona fica no mínimo (70 × a escala ≈ 122 px): mais de 1,5 × a folha da porta (~65–70 px) sem invadir a vizinha
  const md = ehPraca() && cena.mesa_damas;
  if (md) lista.push({ id: 'predio-mesa-damas', tipo: 'predio', alvo: 'mesa_damas', x: md.x, y: md.y, trilha: md.trilha, largura: 80 });
  const qe = cena.estudos;
  if (qe) lista.push({ id: 'predio-estudos', tipo: 'predio', alvo: 'estudos', x: qe.x, y: qe.y, trilha: qe.trilha, largura: qe.largura });
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
  if (cs?.balaoCama) fecharBalaoCama();
  if (balaoVilaC) fecharBalaoVila();
  if (pesca && !tocouPescando(p)) return;   // pescando: o toque puxa a linha (ou levanta, se for longe)
  const caixote = caixoteEm(p);
  if (caixote) { irPescar(caixote); return; }
  // 🚪 perto de uma porta, saída ou prédio, a porta vale antes do pet e do próprio personagem (PROMPT-155)
  const porta = !ex?.editando && !cs?.arrumando ? destinoPertoDoToque(p) : null;
  // pet e pessoa podem estar lado a lado: vale o que estiver mais perto do toque
  const pessoa = pessoaEm(p);
  if (porta && !pessoa && (tocouNoPet(p) || tocouEmMim(p))) { irAoDestino(porta); return; }
  // 👤 eu × pet (o pet anda colado em mim): vale o que estiver mais perto do toque
  const emMim = !pessoa && tocouEmMim(p), dEu = dist(p.x, p.y, jog.x, jog.y - altJogCena() / 2);
  const noPet = tocouNoPet(p) && !(emMim && dEu < dist(p.x, p.y, seguidor.x, seguidor.y - seguidor.altura / 2));
  if (noPet && (!pessoa || dist(p.x, p.y, seguidor.x, seguidor.y - seguidor.altura / 2) < dist(p.x, p.y, pessoa.p.x, pessoa.p.y - pessoa.alt / 2))) {
    if (cs?.ida?.fixo) { balaoCama(cs.ida.m); return; }   // 🏠 pus para dormir: o balão "☀️ Acordar"
    if (cs?.ida) soltarPet();   // 🏠 dormindo sozinho na cama (ou num móvel): volta
    falarPorToque(); return;   // tocar no pet: ele fala (não anda até lá)
  }
  if (emMim) return;   // 👤 tocar em si mesmo não abre nada (PROMPT-155: a troca de personagem é no guarda-roupa da casinha)
  const colega = colegaEm(p);
  if (colega && (!pessoa || dist(p.x, p.y, colega.x, colega.y - ALT_JOGADOR_MAPA / 2) < dist(p.x, p.y, pessoa.p.x, pessoa.p.y - pessoa.alt / 2))) {
    abrirCartaoColega(colega); return;   // tocar num colega: cartão com nome · turma e o pet dele
  }
  if (pessoa && pessoa.p.id === 'engrenaldo' && !editarNpcs && cena.laboratorio && LAB && !perguntaAberta && !transicionando && !sobreposicaoAberta()) {
    fecharBalaoPessoa(); cena.pertoEng = true; falarCom(pessoa, true); return;   // o Engrenaldo fala e convida para a Ilha dos Robôs (PROMPT-89)
  }
  if (pessoa) { if (!editarNpcs) irFalarCom(pessoa); return; }   // tocar numa pessoa: vai até ela e conversa
  if (ehCasinha() && tocarMovelCasa(p)) return;   // 🏠 quadrinho, aquário, vaso, estantes, pote, caixa (PROMPT-106)
  if (ehVila() && tocarCasaVila(p)) return;        // 🏘️ porta: entra · casa: cor do telhado / visitar / deixar (PROMPT-109)
  if (tocouQuadroEstudos(p)) { irAoDestino(destinosDoMapa().find(d => d.alvo === 'estudos')); return; }
  if (ehSaguao()) { const pt = portaExpoEm(p); if (pt) { irAoDestino(destinosDoMapa().find(d => d.alvo === 'expo:' + pt.n)); return; } }   // 🖼️ placa ou porta
  if (ex && salaExpo()) {   // ✏️ quem decora: tocar num móvel já abre o editor com ele selecionado · 🖼️ os outros: foto ou texto no painel grande
    if (podeDecorar(ex.n) && !transicionando) { const id = itemExpoEm(p, true); if (id) { entrarEdicaoExpo(); selecionarExpo(id); return; } }
    const id = itemExpoEm(p); if (id) { abrirVisualizador(id); return; }
  }
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
  let perto = destinoPertoDoToque(p);
  // Tocou na fachada do ginásio (acima da porta) também vale
  if (!perto) {
    perto = destinosDoMapa().find(d => d.tipo === 'porta' &&
      Math.abs(p.x - d.x) < 70 && p.y > d.y - 170 && p.y < d.y + 10) || null;
  }
  if (perto) { irAoDestino(perto); return; }
  destinoEspecial = null;
  caminharNaTrilha(p.x, p.y);
}

// a porta/saída/prédio a até DIST_TOQUE do toque (do ponto da porta ou do fim da trilha dela)
function destinoPertoDoToque(p) {
  let perto = null, melhor = DIST_TOQUE;
  for (const d of destinosDoMapa()) {
    if (d.faixa && dentroDe(zonaSaida(d), p.x, p.y)) return d;   // 🖼️ a faixa da saída embaixo (saguão e salas da Exposição)
    const dd = Math.min(dist(p.x, p.y, d.x, d.y), dist(p.x, p.y, d.trilha[0], d.trilha[1]));
    if (dd < melhor) { melhor = dd; perto = d; }
  }
  return perto;
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
  if (jog.caminho.length && !String(d.alvo || '').startsWith('pc:') && d.alvo !== 'estudos') jog.caminho.push([d.x, d.y]);   // o quadro: para no ponto, na frente dele
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
// 👤 tocou no próprio personagem (fora de batalha, pesca e edição): não abre nada (PROMPT-155), mas o pet ao lado não "rouba" o toque
function tocouEmMim(pt) {
  if (!jog || ex?.editando || cs?.arrumando || pesca || perguntaAberta) return false;
  const h = altJogCena(), folga = 6 * ESCALA_ATORES;
  return Math.abs(pt.x - jog.x) <= h * 0.3 + folga && pt.y >= jog.y - h - folga && pt.y <= jog.y + folga;
}
// na 1ª entrada depois da atualização: como trocar de personagem agora (PROMPT-155: tocar em si mesmo não troca mais)
function avisarTrocaPersonagem() {
  if (!carregouProgresso || estado?.avisos?.dica_guarda_roupa) return;
  (estado.avisos ||= {}).dica_guarda_roupa = true;
  gravar({ 'avisos/dica_guarda_roupa': true });
  avisoPet('Para trocar de personagem, use o guarda-roupa da sua casinha! 👤🏠', true);
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
  else if (n === 'casinha') sairDaCasinha();                               // a porta da casinha: a vila (ou a placa / de onde veio)
  else if (n === 'vila') sairDaVila(true);                                 // descendo o caminho da vila: a Praça, na frente da placa
  else if (n === 'loja') sairDaLoja();                                     // a porta da loja volta para o mapa de onde veio
  else if (n === 'saguao') transicao(() => abrirPraca('exposicao'));      // 🖼️ a porta de vidro: a Praça, na frente do pavilhão
  else if (salaExpo()) { const k = salaExpo(); transicao(() => abrirSaguao(k)); }   // a sala: o saguão, na porta dela
  else transicao(abrirMapaGeral);
}

// Fliperama, Loja da Praça e Loja do Mercado (mesmo destino do toque)
function entrarNoPredio(alvo) {
  const n = cena.n;
  if (alvo === 'fliperama' && FLIPER) transicao(abrirFliperama);
  else if (alvo === 'loja' && LOJA) transicao(() => abrirLojaInterior({ tipo: 'praca' }));
  else if (alvo === 'loja-mercado' && LOJA) transicao(() => abrirLojaInterior({ tipo: 'mapa', n }));
  else if (alvo === 'laboratorio' && LAB) transicao(abrirLaboratorio);
  else if (alvo === 'casinha' && CASA) { vilaVolta = null; transicao(() => (VILA ? abrirVila('entrada') : abrirCasinha())); }
  else if (alvo.startsWith('vila:')) entrarCasaVila(alvo.slice(5));   // 🏘️ porta de uma casa da vila
  else if (alvo.startsWith('pc:')) { jog.dir = 'costas'; desenharJogador(); abrirComputador(alvo.slice(3)); }   // computador do laboratório
  else if (alvo === 'mesa_damas') { jog.dir = 'costas'; desenharJogador(); abrirMenuDamas(); }
  else if (alvo === 'estudos') { jog.dir = 'costas'; desenharJogador(); abrirEstudos(); }
  else if (alvo === 'exposicao' && EXPO) transicao(() => abrirSaguao());
  else if (alvo.startsWith('expo:')) entrarSalaExpo(Number(alvo.slice(5)));   // 🖼️ porta de uma sala
}

// Setas/joystick (PROMPT-80): portas e prédios têm uma ZONA na frente — ≈1,5 × a largura da porta (mín. 70 px), do ponto
// da trilha até 40 px abaixo dele. Na zona, empurrar para cima (vy < 0 e |vy| > |vx|) entra. A trilha de alguns prédios
// (Loja, Laboratório) termina antes da porta, então "encostar na porta" quase nunca acontecia. Passar de lado não entra.
const entraPorZona = (d) => d.tipo === 'porta' || d.tipo === 'predio';
function zonaEntrada(d) {
  // nos salões (personagem maior), a profundidade também cresce com a escala (PROMPT-155: no saguão eram 52 px para um personagem de ~120)
  const e = cena?.salao ? escalaAtoresCena() / ESCALA_ATORES : 1, w = Math.max(70, 1.5 * (Number(d.largura) || 0)) * e, [tx, ty] = d.trilha;
  return { x0: tx - w / 2, x1: tx + w / 2, y0: ty - 12 * e, y1: ty + 40 * e };
}
const naZona = (d) => { const z = zonaEntrada(d); return jog.x >= z.x0 && jog.x <= z.x1 && jog.y >= z.y0 && jog.y <= z.y1; };
// duas zonas encostadas (portas vizinhas do saguão): vale a da porta mais perto
const destinoNaZona = () => (cena?.tipo === 'mapa' ? destinosDoMapa().filter(d => entraPorZona(d) && naZona(d))
  .sort((a, b) => Math.abs(jog.x - a.trilha[0]) - Math.abs(jog.x - b.trilha[0]))[0] || null : null);
function verificarZonaEntrada(vx, vy) {
  if (!soltouDesdeTroca || !(vy < 0 && Math.abs(vy) > Math.abs(vx))) return;
  const d = destinoNaZona();
  if (d) entrarNoDestino(espDe(d));
}
// 🐾 O pet não para em cima de portas, saídas e zonas de entrada (PROMPT-155): o ponto (x, y) cai numa delas →
// um ponto ao lado, na trilha e fora de todas (o mais perto); fora delas → null
function ocupaEntrada(x, y, ds) {
  for (const d of ds) {
    if (entraPorZona(d)) { const z = zonaEntrada(d); if (x >= z.x0 - 6 && x <= z.x1 + 6 && y >= z.y0 - 30 && y <= z.y1) return true; }
    else if (d.faixa ? dentroDe(zonaSaida(d), x, y) : dist(x, y, d.x, d.y) < DIST_PORTA + 10 || dist(x, y, d.trilha[0], d.trilha[1]) < 24) return true;   // na Exposição, a faixa inteira da porta de vidro
  }
  return false;
}
function ladoForaDaPorta(x, y, longe = null) {   // longe: [x, y] do dono (o pet não para colado nele)
  if (cena?.tipo !== 'mapa' || !cena.grade || ex?.editando || cs?.arrumando) return null;
  const ds = destinosDoMapa();
  if (!ocupaEntrada(x, y, ds)) return null;
  const e = escalaAtoresCena() / ESCALA_ATORES;
  for (let r = 16; r <= 200; r += 8) for (let k = 0; k < 16; k++) {
    const a = k * Math.PI / 8, px = x + Math.cos(a) * r * e, py = y + Math.sin(a) * r * e;
    if (px < 0 || py < 0 || py >= H || !andavel(cena.grade, Math.floor(px / CEL), Math.floor(py / CEL))) continue;
    if (ocupaEntrada(px, py, ds) || (longe && dist(px, py, longe[0], longe[1]) < 26 * e)) continue;
    return [px, py];
  }
  return null;
}
// "⬆ Entrar" (⬆ Damas, ⬆ Usar) acima do personagem enquanto ele está na zona de uma porta
function dicaEntrar() {
  const ds = !destinoNaZona() && saidaNaZona(), d = destinoNaZona() || (ds?.faixa ? ds : null), atores = $('cena-atores');   // ⬇ Sair: só nas faixas da Exposição
  let el = atores.querySelector('.jr-dica-entrar');
  if (!d || conversa.falando) { if (el) el.hidden = true; return; }
  if (!el) { el = document.createElement('div'); el.className = 'jr-rotulo-porta jr-dica-entrar'; el.innerHTML = '<span></span>'; atores.appendChild(el); }
  const txt = d.tipo === 'saida' ? `${SETA_SAIDA[zonaSaida(d).lado]} Sair` : d.alvo === 'mesa_damas' ? '⬆ Damas' : d.alvo === 'estudos' ? '⬆ Ler' : String(d.alvo || '').startsWith('pc:') ? '⬆ Usar' : '⬆ Entrar';
  if (el.firstChild.textContent !== txt) el.firstChild.textContent = txt;
  const fs = 16 * escalaAtoresCena() / ESCALA_ATORES + 'px';   // maior que os rótulos: no celular deitado a cena encolhe pela metade (PROMPT-155)
  if (el.firstChild.style.fontSize !== fs) el.firstChild.style.fontSize = fs;
  const altJ = cena.salao ? alturaSalao() : ALT_JOGADOR_MAPA;
  el.style.left = jog.x + 'px'; el.style.top = (jog.y - altJ - 30 * escalaAtoresCena() / ESCALA_ATORES) + 'px';
  el.hidden = false;
}
// Saídas pela borda (PROMPT-155): uma ZONA na frente da saída — 45 px para cada lado da trilha (ou a faixa inteira, na Exposição)
// e 60 px para dentro do mapa. Na zona, empurrar para a borda (a componente para a borda maior que a de lado) sai.
// Antes só saía quem estava a 12 px do ponto da trilha: com as setas, quase nunca dava (e o aluno ficava andando na borda).
function ladoSaida(d) {
  if (d.y >= H - 80) return 'baixo';   // a porta do laboratório fica em y = 702
  if (d.x <= 40) return 'esq';
  if (d.x >= larguraCena() - 40) return 'dir';
  if (d.y <= 40) return 'cima';
  return null;
}
function zonaSaida(d) {
  const lado = ladoSaida(d);
  if (!lado) return null;
  const e = cena?.salao ? escalaAtoresCena() / ESCALA_ATORES : 1, [tx, ty] = d.trilha, fundo = 60 * e, L = larguraCena();
  const cx = d.faixa ? (d.faixa[0] + d.faixa[1]) / 2 : tx, meia = Math.max(45 * e, d.faixa ? (d.faixa[1] - d.faixa[0]) / 2 : 0);
  if (lado === 'baixo') return { lado, x0: cx - meia, x1: cx + meia, y0: ty - fundo, y1: H };
  if (lado === 'cima') return { lado, x0: cx - meia, x1: cx + meia, y0: 0, y1: ty + fundo };
  if (lado === 'esq') return { lado, x0: 0, x1: tx + fundo, y0: ty - meia, y1: ty + meia };
  return { lado, x0: tx - fundo, x1: L, y0: ty - meia, y1: ty + meia };
}
const dentroDe = (z, x, y) => !!z && x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1;
const SETA_SAIDA = { baixo: '⬇', cima: '⬆', esq: '⬅', dir: '➡' };
// quanto o vetor (vx, vy) empurra para a borda da saída e quanto vai de lado
const paraBorda = (lado, vx, vy) => (lado === 'baixo' ? [vy, vx] : lado === 'cima' ? [-vy, vx] : lado === 'esq' ? [-vx, vy] : [vx, vy]);
const saidaNaZona = () => (cena?.tipo === 'mapa' ? destinosDoMapa().find(d => d.tipo === 'saida' && dentroDe(zonaSaida(d), jog.x, jog.y)) || null : null);
// Saídas do mapa: na zona, empurrar para a borda sai; perto do ponto, encostar andando na direção dela também (como antes).
function verificarEncostou(vx, vy) {
  if (!soltouDesdeTroca) return;
  const m = Math.hypot(vx, vy);
  const ds = saidaNaZona();
  if (ds) {
    const [a, b] = paraBorda(zonaSaida(ds).lado, vx, vy);
    if (a > 0 && a >= Math.abs(b)) { entrarNoDestino(espDe(ds)); return; }
  }
  for (const d of destinosDoMapa()) {
    if (entraPorZona(d)) continue;   // portas e prédios: pela zona (verificarZonaEntrada)
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
    `<div class="jr-rotulo-porta" data-g="saida" style="left:${cena.xPorta}px;top:${yTapete - ALT_JOGADOR - 24}px" hidden><span>Saída</span></div>` +
    `<button class="jr-placa-venc" style="left:${cfg.placa?.x ?? 688}px;top:${cfg.placa?.y ?? 50}px" aria-label="Vencedores deste ginásio">🏆 Vencedores</button>`;   // PROMPT-113
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
  if (e.target.closest('.jr-placa-venc')) { abrirVencedores(cena.chave); return; }   // 🏆 placa na parede (PROMPT-113)
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
//    convites/{quem recebe} = { id, de, de_nome, aposta, ts }
//    duelos/{id} = { a, b, estado, tema, atual, rodadas: { i: { conta, opcoes, resposta, inicio, resp: { uid: { op, t } }, fim } }, on, fim,
//                    aposta: { valor, de, etapa: 'convite' | 'contra', ts } }   (estado 'contra' = contraproposta esperando quem chamou)
//    historico/{segunda}/{id} = { a, b, an, bn, at, bt, vencedor, placar, wo, aposta, ts }   para o painel da professora
// ============================================================
const ehPraca = () => cena?.tipo === 'mapa' && cena.n === 'praca';
const basePraca = () => (teste ? 'jogo_revisao_praca_teste' : 'jogo_revisao_praca');
let desafiosOff = {};   // jogo_revisao_config/global/desafios_off: { todas: true } ou { '8D': true } (painel da professora)
const desafiosLigados = () => !desafiosOff?.todas && !desafiosOff?.[sessao.turma];
// 💰 Apostas nos desafios (PROMPT-154): jogo_revisao_config/global/apostas_off, no mesmo formato de desafios_off
let apostasOff = {};
const apostasLigadas = () => !apostasOff?.todas && !apostasOff?.[sessao.turma];
const VALORES_APOSTA = [0, 5, 10, 20, 50];
const saldoMoedas = () => Number(estado?.pets?.moedas) || 0;
// professora, modo teste e contas de teste: a aposta aparece, mas não mexe em moedas (de nenhum dos dois)
const contaDeVerdade = (uid) => !!uid && uid !== UID_PROFESSORA && !contaEscondida(uid);
const apostaValeMoedas = (d) => !teste && contaDeVerdade(d?.a?.uid) && contaDeVerdade(d?.b?.uid);
const textoAposta = (v) => (v > 0 ? `${v} 🪙` : 'sem aposta');
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
  let [grade] = await Promise.all([carregarGrade(cfg.trilha), trocarFundo(`${IMG}/mapas/${C.imagem || 'praca.webp'}`)]);
  bloquearMesaDamas(grade);   // o personagem não atravessa a mesa de damas
  if (EXPO?.pavilhao) grade = bloquearPavilhao(grade);   // 🖼️ cópia da grade (a do cache fica sem o pavilhão)
  const naTrilha = (x, y) => centroCelula(celulaMaisProxima(grade, x, y));
  const saidas = cfg.saidas.map(([x, y]) => ({ x, y, trilha: naTrilha(x, y) }));
  cena = { tipo: 'mapa', n: 'praca', cfg, grade, portas: {}, saidas, naTrilha, pertoMural: false };
  destinoEspecial = null;
  alvoMapa = null;
  pertoSaidaGin = false;
  montarPessoas('praca');   // ninguém (limpa as pessoas do mapa anterior)
  montarPraca();
  if ((onde === 'fliperama' || onde === 'loja' || onde === 'laboratorio' || onde === 'casinha' || onde === 'exposicao') && cena[onde]) posicionarJogador(cena[onde].trilha[0], cena[onde].trilha[1], 'frente');
  else if (onde === 'fonte' && C.fonte?.frente) posicionarJogador(...naTrilha(...C.fonte.frente), 'frente');
  else if (onde?.pos) posicionarJogador(onde.pos.x, onde.pos.y, onde.pos.dir);   // voltou da casinha pelo 🏠 (PROMPT-108)
  else if (onde?.perto) posicionarJogador(...naTrilha(onde.perto.x, onde.perto.y), 'esquerda');   // chamado: ao lado de quem chamou   // começo do jogo: em frente à fonte
  else posicionarJogador(cfg.entrada[0], cfg.entrada[1], 'costas');
  soltouDesdeTroca = false;
  ajustarCamera();
  $('cena-palco').style.visibility = '';
  atualizarBotaoPet();
  entrarNoMapaOnline('praca');
  conversa.proximaT = performance.now() + 8000;
  conversa.primeiraCurio = true; conversa.curioAgora = falarCurioParam;   // 💡 (PROMPT-99)
  if (editarPraca) ligarEdicaoPraca();
  carregarCasasPub();   // 🏠 quem tem casinha para visitar
}

// Rótulos do mural, do fliperama e da loja (o desenho está na imagem do mapa). mural.ponto: onde o aluno para para ler.
function montarPraca() {
  const C = cfgPraca(), m = C.mural, f = C.fliperama, l = C.loja;
  cena.mural = { ...m, trilha: cena.naTrilha(...(m.ponto || [m.x, m.y + 100])) };
  cena.fliperama = f ? { ...f, trilha: cena.naTrilha(f.x, f.y + 20) } : null;
  cena.loja = l ? { ...l, trilha: cena.naTrilha(l.x, l.y + 30) } : null;
  const lb = C.laboratorio;
  cena.laboratorio = lb && LAB ? { ...lb, trilha: cena.naTrilha(lb.x, lb.y + 30) } : null;
  const ca = C.casinha;   // 🏠 placa das Casinhas (PROMPT-105)
  cena.casinha = ca && CASA ? { ...ca, trilha: cena.naTrilha(...(ca.ponto || [ca.x, ca.y])) } : null;
  const rotulo = (txt, x, y, cls) => `<div class="jr-rotulo-porta jr-rotulo-praca ${cls}" style="left:${x}px;top:${y}px"><span>${txt}</span></div>`;
  $('cena-atores').insertAdjacentHTML('beforeend', rotulo('📋 Mural da Escola', m.x, m.y - 125, 'mural') +
    (f ? rotulo('🕹️ Fliperama', f.x, f.y - 200, 'fliperama') : '') + (l ? rotulo('🛒 Loja', l.x, l.y - 140, 'loja') : '') +
    (cena.laboratorio ? rotulo('🤖 Laboratório', lb.x, lb.y - 150, 'laboratorio') : '') +
    (cena.casinha ? rotulo('🏠 Casinhas', ca.x, ca.y - 40, 'casinha') : ''));
  montarMesaDamas();
  pintarLetreiroRelampago();
  montarPavilhao();
}
function alvoPracaEm(p) {
  const { mural: m, fliperama: f, loja: l, laboratorio: lb, casinha: ca } = cena;
  if (m && Math.abs(p.x - m.x) < (m.largura || 240) / 2 && p.y > m.y - 130 && p.y < m.y + 120) return 'mural';
  if (f && Math.abs(p.x - f.x) < 90 && p.y > f.y - 220 && p.y < f.y + 30) return 'fliperama';
  if (l && Math.abs(p.x - l.x) < 80 && p.y > l.y - 150 && p.y < l.y + 30) return 'loja';
  if (lb && Math.abs(p.x - lb.x) < 90 && p.y > lb.y - 170 && p.y < lb.y + 30) return 'laboratorio';
  if (ca && Math.abs(p.x - ca.x) < 75 && p.y > ca.y - 90 && p.y < ca.y + 40) return 'casinha';
  if (tocouMesaDamas(p)) return 'mesa_damas';
  if (tocouPavilhao(p)) return 'exposicao';
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
    else if (alvo === 'casinha' && CASA) { vilaVolta = null; transicao(() => (VILA ? abrirVila('entrada') : abrirCasinha())); }   // 🏘️ (PROMPT-109)
    else if (alvo === 'mesa_damas') { jog.dir = 'costas'; desenharJogador(); abrirMenuDamas(); }
    else if (alvo === 'exposicao' && EXPO) transicao(() => abrirSaguao());
  });
}
// A cada quadro na praça: chegar perto do mural abre o painel (uma vez até se afastar); botão 💬 no lugar do 😊
function atualizarPraca() {
  const eng = pessoasMapa.find(o => o.p.id === 'engrenaldo');   // chegou perto do Engrenaldo: ele fala (uma vez até se afastar)
  if (eng) {
    const d = dist(jog.x, jog.y, eng.p.x, eng.p.y);
    if (d > PESSOA_PERTO * 1.8) cena.pertoEng = false;
    else if (d < PESSOA_PERTO && !cena.pertoEng && !balaoPessoa && !sobreposicaoAberta()) { cena.pertoEng = true; falarCom(eng); }
  }
  const m = cena.mural;
  if (!m) return;
  const d = dist(jog.x, jog.y, m.trilha[0], m.trilha[1]);
  if (d > 110) cena.pertoMural = false;
  else if (d < 40 && !cena.pertoMural && !sobreposicaoAberta()) { cena.pertoMural = true; abrirMural(); }
}

// ============================================================
//  🌙 DIA E NOITE (PROMPT-93) — pela hora do aparelho: dia 6h–17h (normal), entardecer 17h–18h30 (laranja, multiply ~18%),
//  noite 18h30–5h (azul ~40%, estrelas e luzes de dados/jogo/luzes.json), amanhecer 5h–6h (a noite some, um toque laranja).
//  Rampas de 20 min nas bordas; confere a cada minuto. Só CSS: --dn-tarde / --dn-noite (0 a 1) no :root.
//  Só nos mapas 1–13, na Praça e no mapa geral (interiores sempre normais). ?hora=20 no modo teste força a hora.
//  À noite o pet parado escolhe dormir/descansar com o dobro da chance (pets.js → definirNoite).
// ============================================================
let LUZES = null, horaForcada = null, dnCena;
const minutoDoDia = () => { if (horaForcada != null) return horaForcada * 60; const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const rampa = (m, a, b) => (m <= a ? 0 : m >= b ? 1 : (m - a) / (b - a));   // 0 → 1 entre os minutos a e b
function fasesDoDia(m) {
  const H = 60;
  let noite = 0, tarde = 0;
  if (m >= 18 * H + 20) noite = rampa(m, 18 * H + 20, 18 * H + 40);        // anoitece: 18h20–18h40
  else if (m < 5 * H) noite = 1;
  else if (m < 6 * H) noite = 1 - rampa(m, 5 * H, 6 * H);                  // amanhecer: a noite some até as 6h
  if (m >= 16 * H + 50 && m < 18 * H + 40) tarde = Math.min(rampa(m, 16 * H + 50, 17 * H + 10), 1 - rampa(m, 18 * H + 20, 18 * H + 40));
  else if (m >= 5 * H && m < 6 * H + 10) tarde = 0.6 * Math.min(rampa(m, 5 * H, 5 * H + 30), 1 - rampa(m, 5 * H + 40, 6 * H + 10));   // céu alaranjado no amanhecer
  return { tarde, noite };
}
function aplicarDiaNoite() {
  const { tarde, noite } = fasesDoDia(minutoDoDia()), raiz = document.documentElement;
  raiz.style.setProperty('--dn-tarde', tarde.toFixed(3));
  raiz.style.setProperty('--dn-noite', noite.toFixed(3));
  raiz.classList.toggle('dn-tarde-on', tarde > 0.001);   // de dia as camadas nem existem (display: none)
  raiz.classList.toggle('dn-noite-on', noite > 0.001);
  definirNoite(noite >= 0.5);
}
function iniciarDiaNoite() {
  if (teste) {   // ?hora=20 (ou 17, 5, 18.5…) só no modo teste
    const h = parseFloat(new URLSearchParams(location.search).get('hora'));
    if (Number.isFinite(h)) horaForcada = ((h % 24) + 24) % 24;
  }
  for (const el of document.querySelectorAll('.jr-dn-estrelas')) {   // ~40 pontinhos, cada um no seu ritmo
    el.innerHTML = Array.from({ length: 40 }, () => `<i${Math.random() < 0.25 ? ' class="g"' : ''} style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;` +
      `animation-delay:-${(Math.random() * 4).toFixed(2)}s;animation-duration:${(3 + Math.random() * 3).toFixed(1)}s"></i>`).join('');
  }
  aplicarDiaNoite();
  setInterval(aplicarDiaNoite, 60000);
  iniciarClima();   // 🌧️ (PROMPT-104)
}
// ============================================================
//  🌧️ CLIMA (PROMPT-104) — um por dia, o mesmo para todos (semente: a data de Brasília): ☀️ sol 60% · ☁️ nublado 20% ·
//  🌧️ chuva 15% · 🍃 vento 5%. Sol entre 12h e 15h (Brasília) vira ☀️ calor. Só no exterior (mapas 1–13, Praça) e no mapa geral,
//  como o dia e noite. Tudo em CSS: html.cl-{clima}. Chuva: o pet às vezes se sacode e os peixes raros têm o dobro de chance.
//  Falas chuva / calor / vento (peso `clima`). ?clima=chuva|sol|nublado|vento|calor (modo teste) força.
// ============================================================
const CLIMAS = [['sol', 60], ['nublado', 20], ['chuva', 15], ['vento', 5]];
const NOME_CLIMA = { sol: '☀️ Sol hoje', nublado: '☁️ Nublado hoje', chuva: '🌧️ Chuva hoje', vento: '🍃 Vento hoje', calor: '☀️ Calor agora' };
let climaForcado = null, avisouChuvaPesca = false;
const brasilia = () => new Date(agoraServ() - 3 * 3600e3);   // getUTC* = hora de Brasília
function climaDoDia() {
  const b = brasilia(), r = sementeMissoes(`clima|${b.getUTCFullYear()}-${b.getUTCMonth() + 1}-${b.getUTCDate()}`)();
  let x = r * 100;
  for (const [c, p] of CLIMAS) { if ((x -= p) < 0) return c; }
  return 'sol';
}
function climaAgora() {
  if (climaForcado) return climaForcado;
  const c = climaDoDia(), h = brasilia().getUTCHours();
  return c === 'sol' && h >= 12 && h < 15 ? 'calor' : c;
}
const climaExterior = () => (cena?.tipo === 'mapa' && (Number(cena.n) > 0 || cena.n === 'praca' || cena.n === 'vila')) || !$('tela-geral').hidden;
const climaParaFala = () => { const c = climaAgora(); return ['chuva', 'calor', 'vento'].includes(c) && climaExterior() ? c : null; };
function aplicarClima() {
  const c = climaAgora(), raiz = document.documentElement;
  for (const k of ['sol', 'nublado', 'chuva', 'vento', 'calor']) raiz.classList.toggle('cl-' + k, k === c);
}
function iniciarClima() {
  if (teste) { const f = new URLSearchParams(location.search).get('clima'); if (f && NOME_CLIMA[f]) climaForcado = f; }
  // pingos e folhas: criados uma vez (o CSS mostra os de cada clima)
  for (const el of document.querySelectorAll('.jr-cl-tela')) {
    el.innerHTML = Array.from({ length: 60 }, () => `<i class="pingo" style="left:${(Math.random() * 130).toFixed(1)}%;animation-delay:-${(Math.random() * 0.7).toFixed(2)}s;animation-duration:${(0.55 + Math.random() * 0.3).toFixed(2)}s"></i>`).join('') +
      Array.from({ length: 10 }, (_, i) => `<i class="folha" style="top:${(8 + Math.random() * 75).toFixed(1)}%;animation-delay:-${(i * 0.9 + Math.random()).toFixed(1)}s;animation-duration:${(8 + Math.random() * 5).toFixed(1)}s">🍃</i>`).join('');
  }
  aplicarClima();
  setInterval(aplicarClima, 60000);   // o calor começa às 12h e acaba às 15h
  setInterval(sacudirNaChuva, 4000);
}
// poças em pontos do caminho (sorteio fixo por dia e mapa)
function montarPocas(externo) {
  const el = $('cl-pocas');
  if (!externo || !cena?.grade) { el.innerHTML = ''; return; }
  const b = brasilia(), rnd = sementeMissoes(`pocas|${b.getUTCDate()}|${cena.n}`), pts = [];
  for (let t = 0; t < 400 && pts.length < 6; t++) {
    const cx = Math.floor(rnd() * GW), cy = Math.floor(rnd() * GH);
    if (andavel(cena.grade, cx, cy) && andavel(cena.grade, cx - 4, cy) && andavel(cena.grade, cx + 4, cy)) pts.push([cx * CEL, cy * CEL]);
  }
  el.innerHTML = pts.map(([x, y], i) => `<i style="left:${x}px;top:${y}px;animation-delay:-${i * 0.5}s"></i>`).join('');
}
// na chuva, o pet parado às vezes se sacode (balança o sprite; sem imagem nova)
function sacudirNaChuva() {
  if (climaAgora() !== 'chuva' || !climaExterior() || cena?.tipo !== 'mapa' || !seguidor?.pet || $('pet').hidden || Math.random() > 0.3) return;
  if ((seguidor.paradoMs || 0) < 1500 || conversa.falando || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  $('pet').animate([{ rotate: '0deg' }, { rotate: '-9deg' }, { rotate: '9deg' }, { rotate: '-7deg' }, { rotate: '7deg' }, { rotate: '-3deg' }, { rotate: '0deg' }], { duration: 650, easing: 'ease-in-out' });
}
// na chuva, os peixes raros têm o dobro de chance (a raridade do pesca.json; sem nenhum raro: os 2 de maior venda)
function pontoComClima(ponto) {
  if (climaAgora() !== 'chuva' || !ponto?.peixes?.length) return ponto;
  const temRaro = ponto.peixes.some(f => f.raro);
  const top2 = temRaro ? [] : [...ponto.peixes].sort((a, b) => (Number(b.venda) || 0) - (Number(a.venda) || 0)).slice(0, 2);
  return { ...ponto, peixes: ponto.peixes.map(f => (f.raro || top2.includes(f) ? { ...f, chance: (Number(f.chance) || 0) * 2 } : f)) };
}

// cena nova: externo (mapa da cidade ou Praça) liga a camada e monta as luzes; interior desliga
function cenaDiaNoite() {
  dnCena = cena;
  const externo = cena?.tipo === 'mapa' && (Number(cena.n) > 0 || cena.n === 'praca' || cena.n === 'vila');
  $('tela-cena').classList.toggle('dn-ativo', !!externo);
  const luzes = externo ? LUZES?.[Number(cena.n) > 0 ? 'mapa' + cena.n : cena.n] : null;
  montarPocas(externo);
  $('dn-luzes').innerHTML = (Array.isArray(luzes) ? luzes : []).filter(p => Array.isArray(p) && p.length >= 2)
    .map(([x, y]) => `<i style="left:${Number(x)}px;top:${Number(y)}px"></i>`).join('');
}

// ============================================================
//  📜 QUADRO DE ESTUDOS (PROMPT-90) — dados/jogo/estudos.json → mapaN.mural { x, y (centro da base), largura, ponto } e
//  o conteúdo de cada ginásio (A/B; null = "Em breve"). Painel: js/jogo-revisao/estudos.js. Sem prêmio (só estudo).
//  Brilho no quadro até o aluno abrir o daquele mapa (avisos/estudos_vistos/mapaN).
// ============================================================
let ESTUDOS = null;
const estudosDoMapa = (n) => (Number(n) > 0 && ESTUDOS?.['mapa' + n]?.mural ? ESTUDOS['mapa' + n] : null);
function bloquearQuadroEstudos(g, n) {   // ~70 × 14 na base (a grade fica em cache: fazer de novo não muda nada)
  const m = estudosDoMapa(n)?.mural;
  if (!m) return;
  const x0 = Math.floor((m.x - 35) / CEL), x1 = Math.floor((m.x + 35) / CEL), y0 = Math.floor((m.y - 12) / CEL), y1 = Math.floor(m.y / CEL);
  for (let cy = Math.max(0, y0); cy <= Math.min(GH - 1, y1); cy++) for (let cx = Math.max(0, x0); cx <= Math.min(GW - 1, x1); cx++) g[cy * GW + cx] = 0;
}
function montarQuadroEstudos(n) {
  const e = estudosDoMapa(n);
  cena.estudos = null;
  if (!e) return;
  const m = e.mural, largura = Number(m.largura) || 100;
  cena.estudos = { x: m.x, y: m.y, largura, alt: largura * 351 / 360, trilha: centroCelula(celulaMaisProxima(cena.grade, ...(m.ponto || [m.x, m.y + 24]))) };
  const img = document.createElement('img');
  img.className = 'jr-estudos-quadro' + (estado.avisos?.estudos_vistos?.['mapa' + n] ? '' : ' novo');
  img.alt = 'Quadro de Estudos'; img.draggable = false;
  img.src = `${IMG}/mapas/objetos/mural-estudos.webp`;
  Object.assign(img.style, { left: m.x + 'px', top: m.y + 'px', width: largura + 'px', zIndex: Math.round(m.y) });
  $('cena-atores').appendChild(img);
}
const tocouQuadroEstudos = (p) => { const q = cena?.tipo === 'mapa' && cena.estudos; return !!q && Math.abs(p.x - q.x) < q.largura / 2 && p.y > q.y - q.alt && p.y < q.y + 10; };
function abrirEstudos() {
  const n = cena?.n, e = estudosDoMapa(n);
  if (!e || sobreposicaoAberta()) return;
  fecharCartaoColega();
  const q = D.questoes[n];
  abrirQuadroEstudos({ dados: e, nomeMapa: q?.nome || '', ginasios: Object.keys(q?.ginasios || { A: 1, B: 1 }), aoAcertarTente: () => ganharXPJogo(3, 'tente') });
  estado.avisos ||= {};
  if (!estado.avisos.estudos_vistos?.['mapa' + n]) {   // o brilho do quadro some
    (estado.avisos.estudos_vistos ||= {})['mapa' + n] = true;
    gravar({ [`avisos/estudos_vistos/mapa${n}`]: true });
    $('cena-atores').querySelector('.jr-estudos-quadro')?.classList.remove('novo');
  }
}

// ============================================================
//  🏆 PLACA DE VENCEDORES dos ginásios (PROMPT-113) — jogo_revisao_praca(_teste)/vencedores/{chave}/{uid} =
//  { nome (apelido, como no mural), turma, data, acertos_primeira, total, dourada }. Grava ao vencer o líder e na revanche
//  dourada; quem já tinha insígnias publica uma vez ao entrar no jogo (vencedores_publicado). Contas de teste e da
//  professora não gravam (entraNoRanking) nem aparecem. Placa de madeira em CSS na parede do fundo (interiores.json → placa).
// ============================================================
const noVencedores = (chave) => `${basePraca()}/vencedores/${chave}`;
function registroVencedor(chave) {
  const g = estado.ginasios[chave];
  return { nome: nomeRanking(), turma: sessao.turma || '', data: g.dataInsignia || Date.now(), acertos_primeira: g.insAcertos || 0, total: g.insTotal || 0, dourada: !!g.dourada };
}
function publicarVencedor(chave) {
  if (!entraNoRanking() || !estado.ginasios[chave]?.insignia) return;
  set(ref(db, `${noVencedores(chave)}/${sessao.uid}`), registroVencedor(chave)).catch(e => console.warn('[jogo-revisao] placa de vencedores', e?.code || e));
}
// quem venceu antes da placa existir: publica (uma vez) as insígnias que ainda não estão lá, com a data original
async function publicarVencedoresAntigos() {
  if (!carregouProgresso || !entraNoRanking() || estado.vencedoresPublicado) return;
  try {
    await Promise.all(insigniasGanhas().map(async (k) => {
      const s = await get(ref(db, `${noVencedores(k)}/${sessao.uid}`));
      if (!s.exists()) await set(ref(db, `${noVencedores(k)}/${sessao.uid}`), registroVencedor(k));
    }));
    estado.vencedoresPublicado = true;
    gravar({ vencedores_publicado: true });
  } catch (e) { console.warn('[jogo-revisao] placa de vencedores (antigas)', e?.code || e); }
}
// "da Prefeitura", "do Farol", "da Torre do Mago"
const daGinasio = (nome) => { const p = String(nome).split(' ')[0]; return `${/a$/i.test(p) || /^torre$/i.test(p) ? 'da' : 'do'} ${nome}`; };
const dataCurta = (t) => (t ? new Date(Number(t)).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '');
async function abrirVencedores(chave) {
  if (sobreposicaoAberta()) return;
  const [n, G] = chave.replace('mapa', '').split('-'), nome = D.questoes[n]?.ginasios?.[G]?.nome || 'ginásio';
  $('venc-tit').textContent = `🏆 Vencedores ${daGinasio(nome)}`;
  $('venc-corpo').innerHTML = '<p class="venc-vazio">Carregando…</p>';
  $('venc').hidden = false;
  tocar('clique');
  let regs = {};
  try { regs = await lerNo(noVencedores(chave)); }
  catch (e) { console.warn('[jogo-revisao] placa de vencedores', e?.code || e); $('venc-corpo').innerHTML = '<p class="venc-vazio">Não deu para ver a placa agora.</p>'; return; }
  if ($('venc').hidden) return;
  const lista = Object.entries(regs).filter(([uid, r]) => r && Number(r.data) > 0 && uid !== UID_PROFESSORA && (teste || visivelNoMural(uid, r)))
    .map(([uid, r]) => ({ uid, ...r, data: Number(r.data), acertos: Number(r.acertos_primeira) || 0, total: Number(r.total) || 0 }));
  if (!lista.length) { $('venc-corpo').innerHTML = '<p class="venc-vazio">Ninguém venceu ainda. Seja o primeiro! 🏆</p>'; return; }
  const linha = (r, ic, extra) => `<li class="${r.uid === sessao.uid ? 'eu' : ''}"><span class="venc-ic">${ic}</span><b>${esc(nomeVisivel(r.nome) || 'Aluno')}${r.dourada ? ' ✨' : ''}</b><small>${[esc(nomeVisivel(r.turma)), extra].filter(Boolean).join(' · ')}</small></li>`;
  const pioneiros = [...lista].sort((a, b) => a.data - b.data).slice(0, 3);
  const pct = (r) => (r.total ? r.acertos / r.total : 0);
  const certeiros = lista.filter(r => r.total > 0).sort((a, b) => pct(b) - pct(a) || a.data - b.data).slice(0, 5);
  const semana = lista.filter(r => Date.now() - r.data < 7 * 864e5).sort((a, b) => b.data - a.data);
  $('venc-corpo').innerHTML = `
    <section class="venc-sec"><h3>🥇🥈🥉 Pioneiros</h3><ol>${pioneiros.map((r, i) => linha(r, ['🥇', '🥈', '🥉'][i], dataCurta(r.data))).join('')}</ol></section>
    <section class="venc-sec"><h3>⚡ Mais certeiros</h3><ol>${certeiros.map((r, i) => linha(r, `${i + 1}º`, `${Math.round(pct(r) * 100)}% de 1ª`)).join('') || '<li class="venc-nada">—</li>'}</ol></section>
    <section class="venc-sec"><h3>📅 Esta semana</h3><p class="venc-n">${semana.length ? (semana.length === 1 ? '1 aluno venceu esta semana' : `${semana.length} alunos venceram esta semana`) : 'Ninguém venceu esta semana ainda.'}</p>
      <ol>${semana.slice(0, 5).map(r => linha(r, '🏅', dataCurta(r.data))).join('')}</ol></section>`;
}

// ── Mural da Escola: 6 abas, top 10 + "Você" ──
const MURAL_ABAS = [['insignias', '🏅 Insígnias'], ['pesca', '🎣 Pesca'], ['tabuada', '✖️ Tabuada'], ['negativa', '➖ Tab. negativa'], ['escalada', '🧗 Escalada'], ['desafios', '⚔️ Desafios'],
  ['programe', '🤖 Programe hoje'], ['corridas', '🏁 Corridas'], ['damas', '♟️ Damas']];
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
  if (aba === 'o_que_faz') {   // 🔮 recorde de acertos seguidos (PROMPT-70)
    for (const [uid, r] of Object.entries(await lerNo(`${basePraca()}/programe/o_que_faz`))) if (teste || visivelNoMural(uid, r))
      poe(uid, r, Number(r.recorde) || 0, `${Number(r.recorde) || 0} seguidos`);
    return ordenarRanking(lista);
  }
  if (aba === 'corridas') {   // vitórias de corrida na semana
    for (const [uid, r] of Object.entries(await lerNo(`${basePraca()}/programe/corridas/${semanaPesca()}`))) if (teste || visivelNoMural(uid, r))
      poe(uid, r, Number(r.vitorias) || 0, `${Number(r.vitorias) || 0} vitória${Number(r.vitorias) === 1 ? '' : 's'}`, { vitorias: Number(r.vitorias) || 0 });
    return ordenarRanking(lista);
  }
  if (aba === 'damas') {   // ♟️ vitórias em Damas contra colegas na semana (PROMPT-72)
    for (const [uid, r] of Object.entries(await lerNo(`${basePraca()}/damas/${semanaPesca()}`))) if (teste || visivelNoMural(uid, r))
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
// ── Música de fundo por lugar (PROMPT-88) ──
// mapa: mapas, Praça, mapa geral, salões, loja, fliperama · ginásio: ginásio, batalha, perguntas, duelos, corrida, Damas
// lab: Laboratório, Programe o pet, Caça ao bug, "O que o pet vai fazer?", Ilha dos Robôs
const visivel = (id) => { const e = $(id); return !!e && !e.hidden; };
function lugarDaMusica() {
  if (visivel('batalha') || visivel('pergunta') || duelo || visivel('damas')) return 'ginasio';   // a corrida é um duelo
  if (salaExpo()) return musicaDaSala();   // 🖼️ a música da sala (caminho do arquivo) ou silêncio
  if (visivel('programe') || visivel('pg-mapa') || cena?.n === 'laboratorio') return 'lab';
  if (cena?.tipo === 'interior') return 'ginasio';
  if (cena || visivel('tela-geral')) return 'mapa';
  return null;
}
let musicaOff = {};   // jogo_revisao_config/global/musica_off: { todas: true } ou { '8D': true } (painel da professora)
function aplicarMusicaOff(v) {
  musicaOff = v || {};
  musicaBloqueada(!!(musicaOff.todas || musicaOff[sessao?.turma]));
  pintarMusica();
}
function pintarMusica() {
  const bloq = musicaBloqueada(), on = musicaLigada() && !bloq;
  document.querySelectorAll('[data-musica]').forEach(b => {
    b.classList.toggle('mudo', !on);
    b.classList.toggle('bloqueada', bloq);
    b.setAttribute('aria-label', bloq ? 'A professora desligou a música' : on ? 'Desligar a música' : 'Ligar a música');
    b.title = bloq ? 'A professora desligou a música' : '';
  });
}
let convite = null;          // convite recebido aberto: { id, de, de_nome, timer }
let pararConvites = null;
const vencidosMeus = () => Object.entries(estado.ginasios).filter(([, g]) => g.lider?.vencido).map(([k]) => k);
const nomeCurto = (uid, nome) => (/PROFESSOR/i.test(`${uid} ${nome || ''}`) ? 'Professora' : nomeVisivel(nome) || 'Colega');

function iniciarPraca() {
  try { onValue(ref(db, '.info/serverTimeOffset'), (s) => { offsetServidor = Number(s.val()) || 0; }); } catch (_) {}
  // a professora liga/desliga os desafios pelo painel: vale na hora
  try { onValue(ref(db, 'jogo_revisao_config/global/desafios_off'), (s) => { desafiosOff = (s.exists() && s.val()) || {}; }, () => {}); } catch (_) {}
  try { onValue(ref(db, 'jogo_revisao_config/global/apostas_off'), (s) => { apostasOff = (s.exists() && s.val()) || {}; }, () => {}); } catch (_) {}
  try { onValue(ref(db, 'jogo_revisao_config/global/musica_off'), (s) => aplicarMusicaOff(s.exists() ? s.val() : null), () => {}); } catch (_) {}
  if (pararConvites || !onlineAtivo()) return;
  try {
    pararConvites = onValue(ref(db, `${basePraca()}/convites/${sessao.uid}`), (s) => { if (s.exists()) receberConvite(s.val()); }, () => {});
  } catch (_) { pararConvites = null; }
  ouvirChamados();
  iniciarRelampago();
}

// ============================================================
//  ⚡ DESAFIO RELÂMPAGO (PROMPT-95) — toda hora cheia das 7h às 22h (Brasília, pelo relógio do servidor), na Praça.
//  1 min antes: na Praça, contagem + sino + Engrenaldo; fora (online, sem estar ocupado): aviso no canto com [Ir].
//  jogo_revisao_praca/relampago/{AAAA-MM-DD-HH} = { q: { enunciado, opcoes, certa }, inicio, fim } (o 1º aparelho na Praça
//  cria com runTransaction; os outros só leem) · respostas/{uid} = { op, t, nome, turma } (1 por aluno, transação)
//  · premiados/{uid}: true (cada um se paga 15/10/5 moedas, fonte `relampago`, se ficou entre os 3 primeiros acertos por t).
//  relampago/ultimo = { chave, podio: [{ nome, turma }] } → letreiro perto do mural até o próximo.
//  Pergunta: de um ginásio dos mapas 1…ceil(mediana das insígnias / 2) (alunos visíveis no mural), gerada por gerarUma.
//  Professora e contas de teste veem, mas não gravam. Desafios desligados para a turma: nada. ?relampago=agora (modo teste).
// ============================================================
const RL_HORAS = [7, 22], RL_AVISO_MS = 60000, RL_ESPERA_MS = 3000, RL_DURA_MS = 20000, RL_PODIO_MS = 5000, RL_PREMIOS = [15, 10, 5];
const BRT_MS = 3 * 3600e3;   // Brasília = UTC−3 (sem horário de verão)
let rl = null, rlForcado = null, rlUltimo = null, pararRlUltimo = null, rlIniciado = false;
const pontuaNoRelampago = () => teste || (!ehProfessora() && !ALUNOS_TESTE.includes(sessao.uid));
const dois = (n) => String(n).padStart(2, '0');
// o relâmpago de agora (de 1 min antes até o fim do pódio) ou null
function slotRelampago(t) {
  if (rlForcado) return t < rlForcado.S + RL_ESPERA_MS + RL_DURA_MS + RL_PODIO_MS + 2000 ? rlForcado : null;
  const b = new Date(t - BRT_MS), H = b.getUTCHours();
  const dia = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) + BRT_MS;
  for (const h of [H, H + 1]) {
    if (h < RL_HORAS[0] || h > RL_HORAS[1]) continue;
    const S = dia + h * 3600e3;
    if (t >= S - RL_AVISO_MS && t < S + RL_ESPERA_MS + RL_DURA_MS + RL_PODIO_MS + 2000)
      return { S, chave: `${b.getUTCFullYear()}-${dois(b.getUTCMonth() + 1)}-${dois(b.getUTCDate())}-${dois(h)}` };
  }
  return null;
}
function iniciarRelampago() {
  if (rlIniciado) return;
  rlIniciado = true;
  if (teste && new URLSearchParams(location.search).get('relampago') === 'agora') rlForcado = 'pendente';
  try {
    pararRlUltimo = onValue(ref(db, `${basePraca()}/relampago/ultimo`), (s) => { rlUltimo = s.exists() ? s.val() : null; pintarLetreiroRelampago(); }, () => {});
  } catch (_) {}
  setInterval(tickRelampago, 1000);
}
function esconderRelampago() {
  $('rl-contagem').hidden = true;
  $('rl-aviso').hidden = true;
  if (!$('relampago').hidden) $('relampago').hidden = true;
}
function tickRelampago() {
  if (!carregouProgresso || !onlineAtivo() || !desafiosLigados() || !pracaPronta()) { esconderRelampago(); return; }
  const t = agoraServ();
  if (rlForcado === 'pendente') { const b = new Date(t + RL_AVISO_MS - BRT_MS); rlForcado = { S: t + RL_AVISO_MS, chave: `${b.getUTCFullYear()}-${dois(b.getUTCMonth() + 1)}-${dois(b.getUTCDate())}-${dois(b.getUTCHours())}${dois(b.getUTCMinutes())}-teste` }; }
  const slot = slotRelampago(t);
  if (!slot) { if (rl) { rl.parar?.(); rl = null; } rlForcado = null; esconderRelampago(); return; }
  if (rl?.chave !== slot.chave) { rl?.parar?.(); rl = { ...slot, dados: null, respostas: {}, minha: null, pago: false, avisou: false, sino: false, avisoFechado: false }; }
  const naPraca = ehPraca() && !transicionando;
  // ── antes da hora: contagem (na Praça) ou aviso no canto (fora) ──
  if (t < rl.S) {
    const seg = Math.ceil((rl.S - t) / 1000);
    $('rl-contagem').innerHTML = `⚡ Relâmpago em <b>${seg}</b>`;
    $('rl-contagem').hidden = !naPraca;
    if (naPraca && !rl.sino) { rl.sino = true; tocar('insignia'); falaEngrenaldoRelampago(); }
    const fora = !naPraca && !rl.avisoFechado && !ocupadoParaChamado();
    $('rl-aviso').hidden = !fora;
    if (fora) $('rl-aviso-s').textContent = seg > 50 ? '1 min' : `${seg} s`;
    return;
  }
  $('rl-contagem').hidden = true;
  $('rl-aviso').hidden = true;
  // ── na hora: quem está na Praça cria (ou lê) a pergunta e ouve as respostas ──
  if (naPraca && !rl.ouvindo) ouvirRelampago();
  const d = rl.dados;
  if (!d?.q) return;
  const ini = Number(d.inicio), fim = Number(d.fim);
  if (t < ini) return;
  if (t < fim) {
    if (!naPraca && !rl.minha) { if (!$('relampago').hidden) $('relampago').hidden = true; return; }   // só participa quem está na Praça
    if ($('relampago').hidden && !perguntaAberta && !bt && !duelo && !dm) abrirCartaoRelampago();
    $('rl-barra').style.transform = `scaleX(${Math.max(0, (fim - t) / (fim - ini)).toFixed(3)})`;
    $('rl-status').textContent = `${Math.max(0, Math.ceil((fim - t) / 1000))} s`;
    return;
  }
  // ── acabou: a certa e o pódio por 5 s; o top 3 se paga ──
  if (!rl.final) { rl.final = true; mostrarFimRelampago(); }
  if (t >= fim + RL_PODIO_MS && !$('relampago').hidden) $('relampago').hidden = true;
}
function falaEngrenaldoRelampago() {
  const o = pessoasMapa.find(x => x.p.id === 'engrenaldo');
  if (!o || !o.img.isConnected || sobreposicaoAberta()) return;
  if (balaoPessoa) fecharBalaoPessoa();
  const el = $('pessoa-balao');
  el.innerHTML = `<b>${esc(o.p.nome)}</b><span>⚡ Relâmpago em 1 minuto!</span>`;
  el.hidden = false;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  balaoPessoa = { o, timer: setTimeout(fecharBalaoPessoa, 5000) };
  posicionarBalaoPessoa();
}
function irAoRelampago() {
  $('rl-aviso').hidden = true;
  if (rl) rl.avisoFechado = true;
  if (ehPraca() || ocupadoParaChamado() || !pracaPronta()) return;
  transicao(() => abrirPraca());
}
// mapas dos ginásios "que a maioria já venceu": 1 … ceil(mediana das insígnias / 2)
async function mapaMaxRelampago() {
  try {
    const s = await get(ref(db, `${basePraca()}/insignias`));
    const ns = Object.entries(s.exists() ? s.val() : {}).filter(([uid, r]) => teste || visivelNoMural(uid, r)).map(([, r]) => Number(r?.n) || 0).sort((a, b) => a - b);
    if (!ns.length) return 1;
    const m = ns.length % 2 ? ns[(ns.length - 1) / 2] : (ns[ns.length / 2 - 1] + ns[ns.length / 2]) / 2;
    return Math.min(NUM_MAPAS, Math.max(1, Math.ceil(m / 2)));
  } catch (_) { return 1; }
}
function perguntaRelampago(maxMapa) {
  const pers = ['treinador1', 'treinador2', 'treinador3', 'lider'];
  for (let tent = 0; tent < 40; tent++) {
    const mapa = 1 + Math.floor(Math.random() * maxMapa), lado = Math.random() < 0.5 ? 'A' : 'B';
    if (mapa === 12 || (mapa === 13 && lado === 'B')) continue;   // coordenadas (precisa da grade) e tabelas: fora
    const q = gerarUma(mapa, lado, sortear(pers), Math.floor(Math.random() * 5));
    if (!q || q.tabela || !Array.isArray(q.erradas) || q.erradas.length < 3) continue;
    const certa = String(q.resposta);
    return { enunciado: String(q.enunciado), opcoes: embaralhar([certa, ...q.erradas.slice(0, 3).map(String)]), certa, mapa, lado };
  }
  return null;
}
async function ouvirRelampago() {
  const meu = rl;
  meu.ouvindo = true;
  const no = ref(db, `${basePraca()}/relampago/${meu.chave}`);
  try {
    const q = agoraServ() < meu.S + 5000 ? perguntaRelampago(await mapaMaxRelampago()) : null;   // chegou atrasado: só lê
    if (q) {
      const inicio = Math.max(meu.S, Math.round(agoraServ())) + RL_ESPERA_MS;
      await runTransaction(no, (cur) => (cur?.q ? undefined : { ...(cur || {}), q, inicio, fim: inicio + RL_DURA_MS }));   // só o 1º grava
    }
  } catch (e) { console.warn('[jogo-revisao] relâmpago', e?.code || e); }
  if (rl !== meu) return;
  try {
    meu.parar = onValue(no, (s) => {
      if (rl !== meu) return;
      const v = s.exists() ? s.val() : null;
      meu.dados = v;
      meu.respostas = v?.respostas || {};
      if (!$('relampago').hidden) pintarOpcoesRelampago();
    }, () => {});
  } catch (_) {}
}
function abrirCartaoRelampago() {
  const q = rl.dados.q;
  $('rl-enunciado').textContent = q.enunciado;
  $('rl-podio').hidden = true;
  $('rl-msg').innerHTML = pontuaNoRelampago() ? `Responda rápido: os 3 primeiros acertos ganham 🪙 ${RL_PREMIOS.map(comMult).join(' · ')}` : 'Você vê o relâmpago, mas não pontua.';
  $('rl-opcoes').innerHTML = q.opcoes.map(o => `<button data-rl="${esc(o)}">${esc(o)}</button>`).join('');
  $('relampago').hidden = false;
  soltarJoystick();
  tocar('porta');
  pintarOpcoesRelampago();
}
function pintarOpcoesRelampago() {
  if (!rl?.dados?.q) return;
  const q = rl.dados.q, fim = !!rl.final, minha = rl.minha ?? rl.respostas?.[sessao.uid]?.op ?? null;
  for (const b of $('rl-opcoes').querySelectorAll('[data-rl]')) {
    const v = b.dataset.rl;
    b.disabled = fim || minha != null;
    b.classList.toggle('minha', v === minha);
    b.classList.toggle('certa', fim && v === String(q.certa));
    b.classList.toggle('errada', v === minha && (fim || rl.conferida) && v !== String(q.certa));
  }
}
async function responderRelampago(op) {
  if (!rl?.dados?.q || rl.final || rl.minha != null || agoraServ() >= Number(rl.dados.fim)) return;
  rl.minha = op;
  const certo = op === String(rl.dados.q.certa);
  rl.conferida = true;
  tocar(certo ? 'acerto' : 'erro');
  $('rl-msg').innerHTML = certo ? '<span class="ok">Acertou! ⚡ Vamos ver se foi dos mais rápidos…</span>' : '<span class="erro">Errou! Não dá para responder de novo.</span>';
  pintarOpcoesRelampago();
  if (!pontuaNoRelampago()) return;
  if (certo) ganharXPJogo(5, 'relampago');   // ⭐ (PROMPT-156)
  try {
    await runTransaction(ref(db, `${basePraca()}/relampago/${rl.chave}/respostas/${sessao.uid}`),
      (cur) => (cur ? undefined : { op, t: serverTimestamp(), nome: nomeRanking(), turma: sessao.turma || '' }));
  } catch (e) { console.warn('[jogo-revisao] resposta do relâmpago', e?.code || e); }
}
// os 3 primeiros acertos pelo horário do servidor
function podioRelampago() {
  const certa = String(rl?.dados?.q?.certa ?? '');
  return Object.entries(rl?.respostas || {}).filter(([uid, r]) => r && String(r.op) === certa && Number.isFinite(Number(r.t)))
    .sort((a, b) => Number(a[1].t) - Number(b[1].t) || a[0].localeCompare(b[0])).slice(0, 3).map(([uid, r]) => ({ uid, nome: r.nome || 'Colega', turma: r.turma || '' }));
}
function mostrarFimRelampago() {
  const meu = rl;
  pintarOpcoesRelampago();
  setTimeout(async () => {   // 1,5 s para as últimas respostas chegarem
    if (rl !== meu) return;
    const podio = podioRelampago(), med = ['🥇', '🥈', '🥉'];
    const lugar = podio.findIndex(p => p.uid === sessao.uid);
    if (!$('relampago').hidden) {
      $('rl-msg').innerHTML = `Resposta certa: <b class="ok">${esc(meu.dados.q.certa)}</b>`;
      $('rl-podio').innerHTML = podio.length ? podio.map((p, i) => `<li${p.uid === sessao.uid ? ' class="eu"' : ''}>${med[i]} ${esc(p.nome)}${p.turma ? ` (${esc(nomeVisivel(p.turma))})` : ''}</li>`).join('')
        : '<li>Ninguém acertou desta vez. ⚡</li>';
      $('rl-podio').hidden = false;
    }
    if (podio.length) set(ref(db, `${basePraca()}/relampago/ultimo`), { chave: meu.chave, podio: podio.map(p => ({ nome: p.nome, turma: p.turma })) }).catch(() => {});
    if (lugar >= 0 && pontuaNoRelampago() && !meu.pago) {   // cada um se paga, uma vez só
      meu.pago = true;
      try {
        const r = await runTransaction(ref(db, `${basePraca()}/relampago/${meu.chave}/premiados/${sessao.uid}`), (cur) => (cur ? undefined : true));
        if (r.committed) {
          const n = comMult(RL_PREMIOS[lugar]);
          estado.pets.moedas = (Number(estado.pets.moedas) || 0) + n;
          const patch = { 'pets/moedas': estado.pets.moedas };
          registrarGanho('relampago', n, patch);
          gravar(patch);
          tocar('vitoria');
          avisoPet(`${med[lugar]} Relâmpago! +${n} 🪙`, true);
        }
      } catch (e) { console.warn('[jogo-revisao] prêmio do relâmpago', e?.code || e); }
    }
  }, 1500);
}
// letreiro perto do mural: o pódio do último relâmpago
function pintarLetreiroRelampago() {
  if (!ehPraca() || !cena.mural) return;
  const atores = $('cena-atores');
  let el = atores.querySelector('.rl-letreiro');
  const podio = rlUltimo?.podio;
  if (!Array.isArray(podio) || !podio.length || !desafiosLigados()) { el?.remove(); return; }
  if (!el) { el = document.createElement('div'); el.className = 'jr-rotulo-porta jr-rotulo-praca rl-letreiro'; el.innerHTML = '<span></span>'; atores.appendChild(el); }
  const med = ['🥇', '🥈', '🥉'];
  el.firstChild.textContent = `⚡ Último relâmpago: ${podio.slice(0, 3).map((p, i) => `${med[i]} ${p.nome || 'Colega'}${p.turma ? ` (${nomeVisivel(p.turma)})` : ''}`).join(' · ')}`;
  el.style.left = cena.mural.x + 'px';
  el.style.top = (cena.mural.y - 170) + 'px';
}

// Cartão do colega na praça: ⚔️ Desafiar (com aviso quando não vale prêmio)
// Transação no estado do desafio: convite → novo. Quem recebeu o convite ainda não tem o desafio no aparelho, e a transação começa
// com null; devolver null (e não undefined, que cancela) faz o Firebase buscar o valor real no servidor e repetir a conta.
const deConvitePara = (novo) => (cur) => (cur === null ? null : cur === 'convite' ? novo : undefined);
const deContraPara = (novo) => (cur) => (cur === null ? null : cur === 'contra' ? novo : undefined);   // 💬 contraproposta da aposta
function podeDesafiar() { return ehPraca() && desafiosLigados() && onlineAtivo() && !duelo && carregouProgresso; }
// ⚔️ no cartão do colega: Contas (o desafio de sempre), Corrida de programação (PROMPT-50) ou Damas (PROMPT-72)
function escolherModoDesafio(c) {
  if (!podeDesafiar()) return;
  const el = $('colega-cartao');
  clearTimeout(cartaoColega.timer);
  cartaoColega.timer = setTimeout(fecharCartaoColega, 10000);
  el.innerHTML = `<span class="jr-colega-info jr-presente"><b>⚔️ Desafiar ${nomeT(c.uid, nomeCurto(c.uid, c.reg?.apelido))}</b>
    <span class="jr-presente-lista"><button data-modo="contas">✖️ Contas</button>${PROG ? '<button data-modo="corrida">🤖 Corrida</button>' : ''}<button data-modo="damas">♟️ Damas</button></span></span>`;
  posicionarCartaoColega();
}
function confirmarDesafio(c, modo = 'contas') {
  if (!podeDesafiar()) return;
  if (modo === 'corrida' && petFora()) { fecharCartaoColega(); avisoPetFora(); return; }   // a corrida precisa do pet
  if (modo === 'damas' || vale(estado.desafiosDia, diaLocal(), c.uid)) { escolherAposta(c, modo); return; }   // damas não tem prêmio: não precisa do aviso
  const el = $('colega-cartao');
  clearTimeout(cartaoColega.timer);
  cartaoColega.timer = setTimeout(fecharCartaoColega, 10000);
  el.innerHTML = `<span class="jr-colega-info jr-presente"><b>⚔️ Sem prêmio hoje</b>
    <small>Você já fez os desafios que valem prêmio hoje (ou já desafiou ${nomeT(c.uid, nomeCurto(c.uid, c.reg?.apelido))} 2 vezes). Dá para jogar só por diversão.</small>
    <span class="jr-presente-lista"><button data-desafiar-mesmo="${modo}">⚔️ Desafiar mesmo assim</button></span></span>`;
  posicionarCartaoColega();
}
// 💰 Valendo quanto? (PROMPT-154) Valores acima do saldo ficam apagados; apostas desligadas pela professora: vai direto, sem aposta
const botoesAposta = (attr, valores = VALORES_APOSTA) => valores
  .map(v => `<button ${attr}="${v}"${v > saldoMoedas() ? ' disabled' : ''}>${v ? `${v} 🪙` : 'Sem aposta'}</button>`).join('');
function escolherAposta(c, modo) {
  if (!podeDesafiar()) return;
  if (!apostasLigadas()) { desafiarColega(c, modo, 0); return; }
  const el = $('colega-cartao');
  clearTimeout(cartaoColega.timer);
  cartaoColega.timer = setTimeout(fecharCartaoColega, 10000);
  cartaoColega.modo = modo;
  el.innerHTML = `<span class="jr-colega-info jr-presente"><b>💰 Valendo quanto?</b>
    <small>Quem vencer leva as duas apostas. Você tem ${saldoMoedas()} 🪙.</small>
    <span class="jr-presente-lista">${botoesAposta('data-aposta')}</span></span>`;
  posicionarCartaoColega();
}
async function desafiarColega(c, modo = 'contas', aposta = 0) {
  if (!podeDesafiar()) return;
  fecharCartaoColega();
  aposta = apostasLigadas() && VALORES_APOSTA.includes(Number(aposta)) && Number(aposta) <= saldoMoedas() ? Number(aposta) : 0;
  const C = cfgDesafio(), base = basePraca();
  const id = push(ref(db, `${base}/duelos`)).key;
  const eu = { uid: sessao.uid, nome: nomeRanking(), turma: sessao.turma || '', pers: meuPersonagem(), vencidos: vencidosMeus(), premio: vale(estado.desafiosDia, diaLocal(), c.uid), ...dadosCorrida() };
  const nomeOutro = nomeCurto(c.uid, c.reg?.apelido);
  try {
    const m = modo === 'corrida' || modo === 'damas' ? modo : 'contas';
    await set(ref(db, `${base}/duelos/${id}`), { a: eu, b: { uid: c.uid, nome: nomeOutro }, estado: 'convite', modo: m, criado: serverTimestamp(),
      aposta: aposta ? { valor: aposta, de: sessao.uid, etapa: 'convite', ts: agoraServ() } : null });
    await set(ref(db, `${base}/convites/${c.uid}`), { id, de: sessao.uid, de_nome: eu.nome, modo: m, aposta: aposta || null, ts: serverTimestamp() });
  } catch (e) { console.warn('[jogo-revisao] desafio indisponível', e?.code || e); avisoPet('Não deu para desafiar agora.'); return; }
  avisarEm(`⚔️ Convite enviado para ${nomeOutro}${aposta ? ` valendo ${aposta} 🪙` : ''}…`, jog.x, jog.y - ALT_JOGADOR_MAPA - 10);
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
  if (!ehPraca() || duelo || dm || estado.semConvites || !desafiosLigados()) {   // dm: treinando damas contra o computador
    try { await runTransaction(ref(db, `${basePraca()}/duelos/${cv.id}/estado`), deConvitePara('ocupado')); } catch (_) {}
    remove(ref(db, `${basePraca()}/convites/${sessao.uid}`)).catch(() => {});
    return;
  }
  const premio = vale(estado.desafiosDia, diaLocal(), cv.de);
  const aposta = Number(cv.aposta) || 0;
  convite = { ...cv, premio, aposta, etapa: 'convite' };
  const quem = `<b>${nomeT(cv.de, nomeCurto(cv.de, cv.de_nome))}</b>`, valendo = aposta ? ` valendo <b>${aposta} 🪙</b>` : '';
  $('convite-txt').innerHTML = cv.modo === 'corrida' ? `${quem} te chamou para uma Corrida de programação${valendo}! 🤖`
    : cv.modo === 'damas' ? `${quem} te chamou para uma partida de Damas${valendo}! ♟️`
    : `${quem} te desafiou${valendo}! ⚔️`;
  $('convite-aviso').hidden = premio || cv.modo === 'damas';
  mostrarBotoesConvite(aposta, !!aposta);
  $('convite').hidden = false;
  tocar('vitoria');
  barraConvite(cv.id, Date.now() + exp - Math.max(0, idade), exp, () => responderConvite(false, true));
}
// barra do tempo do convite (e da contraproposta): acabou → expira
function barraConvite(id, fim, exp, expirou) {
  const barra = () => {
    if (!convite || convite.id !== id) return;
    const f = (fim - Date.now()) / exp;
    $('convite-tempo').style.width = Math.max(0, f) * 100 + '%';
    if (f <= 0) { expirou(); return; }
    requestAnimationFrame(barra);
  };
  barra();
}
// ✅ Aceitar (apagado sem saldo para a aposta) · 💬 Contraproposta (só para quem foi convidado, com aposta) · ❌ Recusar
function mostrarBotoesConvite(aposta, contra) {
  $('convite-valores').hidden = true;
  $('convite-botoes').hidden = false;
  $('convite-sim').disabled = aposta > saldoMoedas();
  $('convite-sim').textContent = aposta ? '✅ Aceitar' : '⚔️ Aceitar';
  $('convite-nao').textContent = aposta ? '❌ Recusar' : 'Agora não';
  $('convite-contra').hidden = !contra;
  $('convite-saldo').hidden = !aposta;
  $('convite-saldo').textContent = aposta > saldoMoedas() ? `Você tem só ${saldoMoedas()} 🪙.` : `Você tem ${saldoMoedas()} 🪙.`;
}
function abrirContraproposta() {
  if (!convite || convite.etapa !== 'convite') return;
  $('convite-botoes').hidden = true;
  const valores = apostasLigadas() ? VALORES_APOSTA.filter(v => v !== convite.aposta) : [0];   // apostas desligadas na minha turma: só "sem aposta"
  $('convite-valores').innerHTML = `<small>Jogar valendo quanto?</small><span class="jr-presente-lista">${botoesAposta('data-contra', valores)}</span>`;
  $('convite-valores').hidden = false;
}
// 💬 manda outro valor: o duelo fica em 'contra' esperando quem chamou (o meu lado B já vai pronto, para começar se ele aceitar)
async function enviarContraproposta(valor) {
  const cv = convite;
  if (!cv || cv.etapa !== 'convite' || valor > saldoMoedas()) return;
  convite = null;
  $('convite').hidden = true;
  const base = basePraca();
  remove(ref(db, `${base}/convites/${sessao.uid}`)).catch(() => {});
  if (duelo || !ehPraca()) return;
  if (cv.modo === 'corrida' && petFora()) { avisoPetFora(); try { await runTransaction(ref(db, `${base}/duelos/${cv.id}/estado`), deConvitePara('recusado')); } catch (_) {} return; }
  const b = { uid: sessao.uid, nome: nomeRanking(), turma: sessao.turma || '', pers: meuPersonagem(), vencidos: vencidosMeus(), premio: cv.premio, ...dadosCorrida() };
  try {
    const t = await runTransaction(ref(db, `${base}/duelos/${cv.id}`), (cur) => {
      if (cur === null) return null;   // ainda não está no aparelho: o Firebase busca e repete
      if (cur.estado !== 'convite') return;
      return { ...cur, estado: 'contra', b: { ...(cur.b || {}), ...b }, aposta: { valor, de: sessao.uid, etapa: 'contra', ts: agoraServ() } };
    });
    if (t.snapshot.val()?.estado !== 'contra') { avisoPet('O convite expirou. Fica para a próxima! ⚔️'); return; }
  } catch (e) { console.warn('[jogo-revisao] contraproposta', e?.code || e); avisoPet('Não deu para responder agora.'); return; }
  avisoPet(`💬 Você propôs jogar ${valor ? `valendo ${valor} 🪙` : 'sem aposta'}. Esperando a resposta…`);
  ouvirDuelo(cv.id, false);
  const du = duelo;
  du.timers.push(setTimeout(async () => {   // quem chamou não respondeu: expira
    if (duelo !== du || du.d?.estado !== 'contra') return;
    try { await runTransaction(ref(db, `${base}/duelos/${cv.id}/estado`), deContraPara('expirou')); } catch (_) {}
  }, (cfgDesafio().convite_expira_s ?? 20) * 1000 + 800));
}
// quem chamou recebe a contraproposta: ✅ Aceitar (só com saldo) · ❌ Recusar
function mostrarContraproposta(d) {
  const du = duelo, ap = d.aposta || {}, valor = Number(ap.valor) || 0;
  if (du.contraVista || convite) return;
  du.contraVista = true;
  const exp = (cfgDesafio().convite_expira_s ?? 20) * 1000, idade = Math.max(0, agoraServ() - (Number(ap.ts) || agoraServ()));
  convite = { id: du.id, etapa: 'contra', aposta: valor };
  $('convite-txt').innerHTML = `<b>${nomeT(d.b.uid, nomeCurto(d.b.uid, d.b.nome))}</b> quer jogar ${valor ? `valendo <b>${valor} 🪙</b>` : '<b>sem aposta</b>'}. 💬`;
  $('convite-aviso').hidden = true;
  mostrarBotoesConvite(valor, false);
  $('convite').hidden = false;
  tocar('vitoria');
  barraConvite(du.id, Date.now() + exp - idade, exp, () => responderContraproposta(false, true));
}
async function responderContraproposta(aceitar, expirou = false) {
  const cv = convite, du = duelo;
  convite = null;
  $('convite').hidden = true;
  if (!cv || !du || du.id !== cv.id) return;
  if (aceitar && cv.aposta > saldoMoedas()) aceitar = false;
  try { await runTransaction(ref(db, `${basePraca()}/duelos/${cv.id}/estado`), deContraPara(aceitar ? 'aceito' : expirou ? 'expirou' : 'recusado')); } catch (_) {}
}
function cliqueConvite(e) {
  e.stopPropagation();
  const cv = convite;
  if (!cv) return;
  const v = e.target.closest('[data-contra]');
  if (v) { if (!v.disabled) enviarContraproposta(Number(v.dataset.contra) || 0); return; }
  if (e.target.closest('#convite-contra')) { abrirContraproposta(); return; }
  const sim = e.target.closest('#convite-sim'), nao = e.target.closest('#convite-nao');
  if (!(sim && !sim.disabled) && !nao) return;
  if (cv.etapa === 'contra') responderContraproposta(!!sim);
  else responderConvite(!!sim);
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
  if (cv.modo === 'corrida' && petFora()) {   // a corrida precisa do pet: recusa com o aviso
    avisoPetFora();
    try { await runTransaction(ref(db, `${base}/duelos/${cv.id}/estado`), deConvitePara('recusado')); } catch (_) {}
    return;
  }
  if (cv.aposta > saldoMoedas()) { avisoPet('Você não tem moedas para essa aposta.'); try { await runTransaction(ref(db, `${base}/duelos/${cv.id}/estado`), deConvitePara('recusado')); } catch (_) {} return; }
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
  const venceu = !!duelo.venceu;
  duelo = null;
  $('duelo').hidden = true;
  if (venceu) comemorarPetNaCena();
}

function atualizarDuelo(d) {
  const du = duelo;
  if (!d) { encerrarDueloLocal(); return; }
  du.d = d;
  const outroLado = du.souA ? 'b' : 'a';
  if (!du.comecou && ['recusado', 'expirou', 'ocupado'].includes(d.estado)) {
    if (convite?.id === du.id) { convite = null; $('convite').hidden = true; }   // a contraproposta aberta expirou
    avisoPet(d.estado === 'ocupado' ? `${nomeCurto(d.b?.uid, d.b?.nome)} está ocupado agora. Fica para a próxima! ⚔️` : 'Fica para a próxima! ⚔️');
    encerrarDueloLocal();
    return;
  }
  if (!du.comecou && d.estado === 'contra' && du.souA) { mostrarContraproposta(d); return; }   // 💬 o colega propôs outro valor
  if (!du.comecou && (d.estado === 'aceito' || d.estado === 'jogando') && d.a?.pers && d.b?.pers) comecarDuelo(d);   // (lista vazia de vencidos não é gravada: espera o pers)
  if (!du.comecou) return;
  du.outro = d[outroLado];
  if (d.modo === 'corrida') { atualizarCorrida(d); return; }
  if (d.modo === 'damas') { atualizarDamasOnline(d); return; }
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
  if (convite?.id === du.id) { convite = null; $('convite').hidden = true; }
  apostarNoDuelo(d);
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
  if (d.modo === 'damas') { comecarDamasOnline(d); return; }   // damas: a tela do tabuleiro
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
      vencedor, placar: `${placar[a]}-${placar[b]}`, wo: !!wo, aposta: Number(d.aposta?.valor) || 0, ts: Date.now() });
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
  if (falta <= 0) {
    if (d.modo === 'damas') gravarFimDamas(d, sessao.uid, { [d.a.uid]: contarDamas(d.jogo?.tab || '', 'a'), [d.b.uid]: contarDamas(d.jogo?.tab || '', 'b') }, 'wo', true);
    else finalizarDuelo(sessao.uid);
    return;
  }
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

// 💰 Aposta (PROMPT-154): ao começar, cada um tira a aposta do próprio saldo e anota apostas_pendentes/{duelo} = { valor, ts }.
// No fim, quem vence recebe 2 × a aposta; empate devolve. Sem sinal do fim (fechou o jogo), a pendência se resolve depois.
function apostarNoDuelo(d) {
  const valor = Number(d.aposta?.valor) || 0;
  if (!valor) return;
  if (!apostaValeMoedas(d)) { avisoPet(`💰 Valendo ${valor} 🪙 (conta de teste: as moedas não mudam).`); return; }
  if (!carregouProgresso) return;
  const patch = {};
  estado.pets.moedas = Math.max(0, saldoMoedas() - valor);
  patch['pets/moedas'] = estado.pets.moedas;
  estado.apostasPendentes[duelo.id] = { valor, ts: Date.now() };
  patch[`apostas_pendentes/${duelo.id}`] = estado.apostasPendentes[duelo.id];
  gravar(patch);
  avisoPet(`💰 Aposta: −${valor} 🪙. Quem vencer leva ${2 * valor} 🪙!`);
}
// quanto volta para mim de uma aposta: venceu 2 ×, empate 1 ×, perdeu 0
const retornoAposta = (fim, valor) => (fim.vencedor === sessao.uid ? 2 * valor : fim.vencedor === 'empate' ? valor : 0);
function pagarAposta(id, fim, patch) {
  const p = estado.apostasPendentes?.[id];
  if (!p) return null;
  const valor = Number(p.valor) || 0, volta = fim ? retornoAposta(fim, valor) : valor;
  delete estado.apostasPendentes[id];
  patch[`apostas_pendentes/${id}`] = null;
  if (volta) {
    estado.pets.moedas = saldoMoedas() + volta;
    patch['pets/moedas'] = estado.pets.moedas;
    if (fim && fim.vencedor === sessao.uid) registrarGanho('aposta', volta, patch);   // devolução (empate) não é ganho
  }
  return { valor, volta };
}
// texto do fim: "+20 🪙 da aposta" / "−10 🪙 da aposta" / "aposta devolvida"
const textoFimAposta = (r) => (!r ? '' : r.volta > r.valor ? `💰 +${r.volta} 🪙 da aposta!` : r.volta === r.valor ? `💰 Aposta devolvida (${r.valor} 🪙).` : `💰 −${r.valor} 🪙 da aposta.`);
function apostaNoFim(d, patch) {
  const valor = Number(d.aposta?.valor) || 0;
  if (!valor) return '';
  if (!estado.apostasPendentes?.[duelo.id]) return apostaValeMoedas(d) ? '' : `💰 Valia ${valor} 🪙 (conta de teste: as moedas não mudam).`;
  const txt = textoFimAposta(pagarAposta(duelo.id, d.fim, patch));
  setTimeout(resolverApostasPendentes, 1500);   // aproveita para resolver alguma que tenha ficado para trás
  return txt;
}
// Ao entrar no jogo (e ao terminar um desafio): lê cada duelo pendente. Com resultado, recebe o que for dele;
// sem resultado e já parado há mais de 10 min, recebe a aposta de volta.
let resolvendoApostas = false;
async function resolverApostasPendentes() {
  if (resolvendoApostas || !carregouProgresso || !estado?.apostasPendentes) return;
  const ids = Object.keys(estado.apostasPendentes).filter(id => id !== duelo?.id);
  if (!ids.length) return;
  resolvendoApostas = true;
  const patch = {}, textos = [];
  try {
    for (const id of ids) {
      const p = estado.apostasPendentes[id];
      if (!p) continue;
      let d = null;
      try { const s = await get(ref(db, `${basePraca()}/duelos/${id}`)); d = s.exists() ? s.val() : null; } catch (_) { continue; }   // sem internet: tenta na próxima
      if (duelo?.id === id) continue;
      if (d?.fim) { const r = pagarAposta(id, d.fim, patch); if (r) textos.push(textoFimAposta(r)); }
      else if (Date.now() - (Number(p.ts) || 0) > 10 * 60000) { const r = pagarAposta(id, null, patch); if (r) textos.push(`💰 Aposta devolvida (${r.valor} 🪙): o desafio não terminou.`); }
    }
  } finally { resolvendoApostas = false; }
  if (!Object.keys(patch).length) return;
  gravar(patch);
  if (textos.length) setTimeout(() => avisoPet(textos.join(' '), true), 1800);
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
  const pd0 = premioDesafio(res, ganhas), moedas = comMult(pd0.moedas), pontos = pd0.pontos;
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
  const txtAposta = apostaNoFim(d, patch);
  gravar(patch);
  tocar(res === 'venceu' ? 'vitoria' : res === 'empate' ? 'acerto' : 'erro');
  du.venceu = res === 'venceu';   // ao fechar o resultado, o pet comemora (PROMPT-65)
  ganharXPJogo(res === 'venceu' ? 15 : 5, 'desafio');   // ⭐ jogou / venceu (PROMPT-156)
  const titulo = res === 'venceu' ? (f.wo ? '🏆 Você venceu por W.O.!' : '🏆 Você venceu!') : res === 'empate' ? '🤝 Empate!' : `${nomeT(outro, nomeCurto(outro, du.outro.nome))} venceu!`;
  $('dl-fim-titulo').innerHTML = titulo;
  $('dl-fim-placar').textContent = `${ganhas} × ${Number(f.placar?.[outro]) || 0}`;
  $('dl-fim-premio').textContent = (!valeu ? 'Sem prêmio (limite do dia) — valeu pela diversão!' : moedas || pontos ? `+${moedas} moeda${moedas === 1 ? '' : 's'} · +${pontos} pontos de Desafio 🏆` : 'Boa partida! Tente de novo.')
    + (txtAposta ? ` · ${txtAposta}` : '');
  $('dl-fim').hidden = false;
  $('duelo').hidden = false;
  du.timers.forEach(clearTimeout);
  du.parar?.();
}

// ============================================================
//  ♟️ DAMAS 8×8 NA PRAÇA (PROMPT-72; regra oficial brasileira, PROMPT-127) — mesa de pedra (praca.json → mesa_damas).
//  Regras em damas-logica.js (dama voadora, captura obrigatória com lei da maioria).
//  Treino contra o computador (fácil, médio, difícil) ou partida com um colega pelo desafio da praça (duelos/{id}, modo 'damas'):
//  o tabuleiro fica em duelos/{id}/jogo = { tab, vez, semAvanco, n, t (início da vez, relógio do servidor), autos: { a, b },
//  ultima: { de, caminho, cap, auto, lado } }. Cada jogada é gravada com runTransaction, conferindo a vez, o número da jogada e
//  se é válida. Quem desafiou é o lado A (vermelho, começa). Relógio: 15 s por jogada; acabou, uma jogada válida aleatória
//  ("jogada automática"); 3 automáticas seguidas = desistência. Contra colegas, só a aposta (PROMPT-154); contra o computador,
//  3 / 6 / 10 🪙 até 5 vitórias por dia (damas_cpu_dia = { data, n }). Vitórias contra colegas no Mural (aba ♟️ Damas):
//  jogo_revisao_praca/damas/{segunda}/{uid} = { vitorias, nome, turma, pers, ts }.
// ============================================================
const MS_JOGADA_DAMAS = 15000;
const NIVEIS_DAMAS = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
let dm = null;      // partida aberta: { tipo: 'cpu' | 'online', nivel, est, eu, sel, parcial, nVista, tVez, autos, fim, du, timer }
let dmPet = null;   // pet no cartão do fim (PetParado)

// Mesa: imagem com profundidade pelo y (o personagem passa atrás quando está acima dela) e um retângulo fora da área de andar
function montarMesaDamas() {
  const m = cfgPraca().mesa_damas;
  cena.mesa_damas = m ? { ...m, trilha: cena.naTrilha(...(m.ponto || [m.x, m.y + 40])) } : null;
  if (!m) return;
  const img = document.createElement('img');
  img.className = 'jr-mesa-damas'; img.alt = 'Mesa de damas'; img.draggable = false;
  img.src = `${IMG}/praca/mesa-damas.webp`;
  Object.assign(img.style, { left: m.x + 'px', top: m.y + 'px', width: (m.largura || 200) + 'px', zIndex: Math.round(m.y) });
  $('cena-atores').appendChild(img);
  $('cena-atores').insertAdjacentHTML('beforeend', `<div class="jr-rotulo-porta jr-rotulo-praca damas" style="left:${m.x}px;top:${m.y - 135}px"><span>♟️ Damas</span></div>`);
}
function bloquearMesaDamas(g) {   // ~180 × 40 na base da mesa (a grade fica em cache: fazer de novo não muda nada)
  const m = cfgPraca().mesa_damas;
  if (!m) return;
  const x0 = Math.floor((m.x - 90) / CEL), x1 = Math.floor((m.x + 90) / CEL), y0 = Math.floor((m.y - 40) / CEL), y1 = Math.floor(m.y / CEL);
  for (let cy = Math.max(0, y0); cy <= Math.min(GH - 1, y1); cy++) for (let cx = Math.max(0, x0); cx <= Math.min(GW - 1, x1); cx++) g[cy * GW + cx] = 0;
}
const tocouMesaDamas = (p) => { const m = cena?.mesa_damas; return !!m && Math.abs(p.x - m.x) < (m.largura || 200) / 2 && p.y > m.y - 110 && p.y < m.y + 10; };

// Menu "♟️ Damas" (a janela do computador): colega, treino, como jogar, ranking da semana
function abrirMenuDamas(aba = 'inicio') {
  $('mq-nome').textContent = '♟️ Damas';
  $('mq-botoes').innerHTML = '';
  if (aba === 'como') {
    $('mq-corpo').innerHTML = `<div class="mq-como">
      <p>1. Tabuleiro 6×6, só nas casas escuras. Cada um começa com 6 peças.</p>
      <p>2. A peça anda 1 casa na diagonal, para a frente.</p>
      <p>3. Captura: pule a peça do outro (para a frente ou para trás). Se der para capturar, <b>tem</b> que capturar — e continua pulando se der.</p>
      <p>4. Chegou na última fileira: vira 👑 dama, que anda e captura 1 casa em qualquer diagonal.</p>
      <p>5. Ganha quem capturar todas as peças do outro ou deixar o outro sem jogada. 15 s por jogada!</p></div>`;
    $('mq-botoes').innerHTML = '<button class="jr-btn jr-btn-sec" data-damas="inicio">← Voltar</button>';
  } else if (aba === 'colega') {
    const lista = [...colegas.values()].filter(c => !c.el.hidden);
    $('mq-corpo').innerHTML = !podeDesafiar() ? '<p class="mq-sub">Agora não dá para chamar colegas (os desafios estão desligados ou você está sem internet).</p>'
      : lista.length ? `<p class="mq-sub">Quem está na praça agora:</p><div class="pg-fases">${lista.map(c =>
        `<button class="jr-btn" data-damas-colega="${esc(c.uid)}">${nomeT(c.uid, nomeCurto(c.uid, c.reg?.apelido))}</button>`).join('')}</div>`
      : '<p class="mq-sub">Ninguém na praça agora. Que tal treinar contra o computador?</p>';
    $('mq-botoes').innerHTML = '<button class="jr-btn jr-btn-sec" data-damas="inicio">← Voltar</button>';
  } else if (aba === 'ranking') {
    $('mq-corpo').innerHTML = '<p class="mq-car">Carregando…</p>';
    $('mq-botoes').innerHTML = '<button class="jr-btn jr-btn-sec" data-damas="inicio">← Voltar</button>';
    dadosMural('damas').then(l => {
      if ($('maquina').hidden || $('mq-nome').textContent !== '♟️ Damas') return;
      const top = (TURMAS_PLACAR.includes(sessao.turma) ? ordenarRanking(l.filter(r => r.turma === sessao.turma)) : l).slice(0, 10);
      $('mq-corpo').innerHTML = `<p class="mq-sub">Vitórias contra colegas nesta semana${TURMAS_PLACAR.includes(sessao.turma) ? ` · ${esc(sessao.turma)}` : ''}</p>
        <div class="mq-recordes"><div><ol>${top.map(r => `<li>${['🥇', '🥈', '🥉'][r.pos - 1] || r.pos + 'º'} ${esc(r.nome)} <em>${esc(r.rotulo)}</em></li>`).join('') || '<li class="mq-vazio">Ninguém venceu ainda nesta semana.</li>'}</ol></div></div>`;
    }).catch(() => { $('mq-corpo').innerHTML = '<p class="mq-sub">Não deu para carregar o ranking agora.</p>'; });
  } else {
    $('mq-corpo').innerHTML = `<p class="mq-sub">Damas 6×6 na mesa de pedra da praça.</p>
      <div class="mq-damas-menu">
        <button class="jr-btn jr-btn-ouro" data-damas="colega">👥 Jogar com um colega</button>
        <div><b>🤖 Treinar contra o computador</b><span>${Object.entries(NIVEIS_DAMAS).map(([k, n]) => `<button class="jr-btn" data-damas-cpu="${k}">${n}</button>`).join('')}</span></div>
        <button class="jr-btn jr-btn-sec" data-damas="como">❓ Como jogar</button>
        <button class="jr-btn jr-btn-sec" data-damas="ranking">🏆 Ranking da semana</button>
      </div>`;
  }
  $('maquina').hidden = false;
}
function cliqueMenuDamas(e) {
  const a = e.target.closest('[data-damas]');
  if (a) { abrirMenuDamas(a.dataset.damas); return true; }
  const cpu = e.target.closest('[data-damas-cpu]');
  if (cpu) { $('maquina').hidden = true; abrirDamas({ tipo: 'cpu', nivel: cpu.dataset.damasCpu }); return true; }
  const col = e.target.closest('[data-damas-colega]');
  if (col) {
    const c = colegas.get(col.dataset.damasColega);
    if (!c) { $('maquina').hidden = true; return true; }
    if (!apostasLigadas()) { $('maquina').hidden = true; desafiarColega(c, 'damas', 0); return true; }
    $('mq-corpo').innerHTML = `<p class="mq-sub">💰 Valendo quanto? Quem vencer leva as duas apostas. Você tem ${saldoMoedas()} 🪙.</p>
      <div class="pg-fases">${botoesAposta('data-damas-aposta').replaceAll('<button ', `<button class="jr-btn" data-damas-para="${esc(c.uid)}" `)}</div>`;
    $('mq-botoes').innerHTML = '<button class="jr-btn jr-btn-sec" data-damas="colega">← Voltar</button>';
    return true;
  }
  const ap = e.target.closest('[data-damas-aposta]');
  if (ap) { if (ap.disabled) return true; const c = colegas.get(ap.dataset.damasPara); $('maquina').hidden = true; if (c) desafiarColega(c, 'damas', Number(ap.dataset.damasAposta) || 0); return true; }
  return false;
}

// ── Tela ──
function abrirDamas({ tipo, nivel = 'facil', est = null, eu = 'a', du = null }) {
  clearInterval(dm?.timer);
  dm = { tipo, nivel, est: est || estadoInicialDamas(), eu, du, sel: null, parcial: [], nVista: -1, tVez: Date.now(), autos: { a: 0, b: 0 }, fim: null };
  const outroNome = tipo === 'cpu' ? `🤖 Computador · ${NIVEIS_DAMAS[nivel]}` : nomeT(du.outro.uid, nomeCurto(du.outro.uid, du.outro.nome));
  $('dm-nome-outro').innerHTML = outroNome;
  $('dm-cor-eu').className = 'dm-cor ' + eu; $('dm-cor-outro').className = 'dm-cor ' + outroLadoDamas(eu);
  $('dm-fim').hidden = true;
  $('dm-sair').textContent = '🏳️ Desistir';
  dmPet = null;
  $('damas').hidden = false;
  renderDamas();
  dm.timer = setInterval(tickDamas, 250);
  if (tipo === 'cpu' && dm.est.vez !== eu) jogadaDoComputador();
}
// casa do tabuleiro na tela: o meu lado sempre embaixo (lado B vê o tabuleiro virado)
const casaNaTela = (i) => (dm.eu === 'b' ? N_DAMAS * N_DAMAS - 1 - i : i);
function renderDamas(animar = null) {
  if (!dm) return;
  const { est, eu } = dm, minha = !dm.fim && est.vez === eu && !dm.pensando;
  const js = minha ? jogadasValidasDamas(est) : [];
  const deSel = dm.sel != null ? js.filter(j => j.de === dm.sel && dm.parcial.every((c, k) => j.caminho[k] === c)) : [];
  const destinos = new Set(deSel.map(j => j.caminho[dm.parcial.length]).filter(x => x != null));
  const podem = new Set(dm.parcial.length ? [] : js.map(j => j.de));
  const ult = est.ultima ? new Set([est.ultima.de, ...(est.ultima.caminho || [])]) : new Set();
  const pos = dm.parcial.length ? dm.parcial.at(-1) : null;   // peça no meio de uma captura em sequência
  let html = '';
  for (let k = 0; k < N_DAMAS * N_DAMAS; k++) {
    const i = casaNaTela(k), l = Math.floor(i / N_DAMAS), c = i % N_DAMAS, escura = (l + c) % 2 === 1;
    let p = est.tab[i];
    if (pos != null && i === dm.sel) p = '.';
    if (pos != null && i === pos) p = est.tab[dm.sel];
    const cls = ['dm-casa', escura ? 'escura' : '', podem.has(i) ? 'pode' : '', destinos.has(i) ? 'destino' : '', i === dm.sel ? 'sel' : '', ult.has(i) ? 'ultima' : ''].join(' ');
    const peca = p !== '.' ? `<span class="dm-peca ${p.toLowerCase()}${animar?.chegou === i ? ' chegou' : ''}">${p === 'A' || p === 'B' ? '👑' : ''}</span>` : '';
    const comidas = animar?.cap?.includes(i) ? `<span class="dm-peca ${animar.lados[i]} comida"></span>` : '';
    html += `<div class="${cls}" data-i="${i}">${peca}${comidas}</div>`;
  }
  $('dm-tab').innerHTML = html;
  const nA = contarDamas(est.tab, eu), nB = contarDamas(est.tab, outroLadoDamas(eu));
  $('dm-pecas-eu').textContent = `${nA} peça${nA === 1 ? '' : 's'}`;
  $('dm-pecas-outro').textContent = `${nB} peça${nB === 1 ? '' : 's'}`;
  // lei da maioria: alguma captura menor ficou de fora → avisa para escolher a que leva mais peças
  const maioria = minha && js.some(j => j.cap.length) && todasCapturasDamas(est).length > js.length;
  if (!dm.fim) $('dm-msg').textContent = dm.aviso || (minha ? (js.some(j => j.cap.length) ? `Sua vez — é obrigatório capturar!${maioria ? ' Escolha a captura que leva mais peças.' : ''}` : 'Sua vez: toque numa peça.') : dm.tipo === 'cpu' ? '🤖 Pensando…' : 'Vez do colega…');
}
function tickDamas() {
  if (!dm || dm.fim) return;
  const agora = dm.tipo === 'online' ? agoraServ() : Date.now(), resta = MS_JOGADA_DAMAS - (agora - dm.tVez);
  const minha = dm.est.vez === dm.eu;
  for (const [id, vez] of [['dm-rel-eu', minha], ['dm-rel-outro', !minha]]) {
    const el = $(id);
    el.textContent = vez ? `${Math.max(0, Math.ceil(resta / 1000))} s` : '';
    el.classList.toggle('vez', vez); el.classList.toggle('acabando', vez && resta < 5000);
  }
  if (minha && resta <= 0 && !dm.enviando) { const j = jogadaAleatoriaDamas(dm.est); if (j) fazerJogadaDamas(j, true); }
  // online: o colega sumiu sem jogar (aba escondida): depois de 15 s + 4 s, a jogada automática dele sai daqui
  else if (!minha && dm.tipo === 'online' && resta <= -4000 && !dm.enviando && !dm.forcou) { dm.forcou = dm.est.n; const j = jogadaAleatoriaDamas(dm.est); if (j) jogadaOnlineDamas(j, true, dm.est.vez); }
}
// toque numa casa: escolhe a peça, depois o destino (capturas em sequência: um pulo de cada vez)
function tocarCasaDamas(e) {
  const el = e.target.closest('.dm-casa');
  if (!el || !dm || dm.fim || dm.est.vez !== dm.eu || dm.pensando || dm.enviando) return;
  const i = Number(el.dataset.i), js = jogadasValidasDamas(dm.est);
  dm.aviso = null;
  if (!dm.parcial.length && js.some(j => j.de === i)) { dm.sel = i; renderDamas(); tocar('clique'); return; }
  if (dm.sel == null) { if (dm.est.tab[i].toLowerCase() === dm.eu && js.some(j => j.cap.length)) { dm.aviso = 'Tem captura com outra peça: capturar é obrigatório!'; renderDamas(); } return; }
  const cand = js.filter(j => j.de === dm.sel && dm.parcial.every((c, k) => j.caminho[k] === c) && j.caminho[dm.parcial.length] === i);
  if (!cand.length) { if (!dm.parcial.length) { dm.sel = null; renderDamas(); } return; }
  dm.parcial.push(i);
  const pronta = cand.find(j => j.caminho.length === dm.parcial.length);
  if (pronta) { fazerJogadaDamas(pronta, false); return; }
  tocar('clique');
  renderDamas();   // a captura continua: o próximo pulo acende
}
function fazerJogadaDamas(j, auto) {
  dm.sel = null; dm.parcial = [];
  if (dm.tipo === 'online') { jogadaOnlineDamas(j, auto, dm.eu); return; }
  dm.autos[dm.eu] = auto ? dm.autos[dm.eu] + 1 : 0;
  aplicarNaTelaDamas(aplicarDamas(dm.est, j), j, auto);
  if (dm.autos[dm.eu] >= 3) { terminarDamas({ vencedor: outroLadoDamas(dm.eu), motivo: 'automaticas' }); return; }
  if (!verificarFimDamas()) jogadaDoComputador();
}
function aplicarNaTelaDamas(novo, j, auto) {
  const lados = Object.fromEntries(j.cap.map(c => [c, dm.est.tab[c].toLowerCase()]));
  dm.est = { ...novo, ultima: { de: j.de, caminho: j.caminho, cap: j.cap } };
  dm.tVez = dm.tipo === 'online' ? (Number(novo.t) || agoraServ()) : Date.now();
  dm.aviso = auto ? '⏱ Jogada automática (acabou o tempo).' : null;
  if (j.cap.length) tocar('acerto'); else tocar('clique');
  renderDamas({ chegou: j.caminho.at(-1), cap: j.cap, lados });
}
function jogadaDoComputador() {
  if (!dm || dm.fim || dm.tipo !== 'cpu' || dm.est.vez === dm.eu) return;
  dm.pensando = true; renderDamas();
  const d = dm;
  setTimeout(() => {   // "pensa" ~0,6 s
    if (dm !== d || d.fim) return;
    d.pensando = false;
    const j = jogadaComputadorDamas(d.est, d.nivel);
    if (!j) { verificarFimDamas(); return; }
    aplicarNaTelaDamas(aplicarDamas(d.est, j), j, false);
    verificarFimDamas();
  }, 600);
}
function verificarFimDamas() {
  const f = fimDeJogoDamas(dm.est);
  if (!f) return false;
  terminarDamas(f);
  return true;
}
// fim: cartão com o pet reagindo; online, a vitória entra no ranking da semana
function terminarDamas({ vencedor, motivo }) {
  if (!dm || dm.fim) return;
  dm.fim = { vencedor, motivo };
  clearInterval(dm.timer);
  if (dm.tipo === 'online') { finalizarDamasOnline(vencedor, motivo); return; }
  if (vencedor === dm.eu) ganharXPJogo({ facil: 5, medio: 10, dificil: 15 }[dm.nivel] || 0, 'damas');   // ⭐ (PROMPT-156)
  mostrarFimDamas(vencedor === dm.eu ? 'venceu' : vencedor === 'empate' ? 'empate' : 'perdeu', motivo, false, vencedor === dm.eu ? moedasDamasCpu(dm.nivel) : '');
}
// 🤖 vencer o computador (PROMPT-154): Fácil 3 · Médio 6 · Difícil 10 🪙 (já com o multiplicador), até 5 vitórias por dia
const MOEDAS_DAMAS_CPU = { facil: 3, medio: 6, dificil: 10 }, VITORIAS_DAMAS_CPU_DIA = 5;
function moedasDamasCpu(nivel) {
  const n = MOEDAS_DAMAS_CPU[nivel] || 0;
  if (!n || !carregouProgresso || !estado?.pets) return '';
  const hoje = diaLocal(), dia = estado.damasCpuDia?.data === hoje ? estado.damasCpuDia : { data: hoje, n: 0 };
  if ((Number(dia.n) || 0) >= VITORIAS_DAMAS_CPU_DIA) return 'Vitória! (as moedas de hoje já foram)';
  estado.damasCpuDia = { data: hoje, n: (Number(dia.n) || 0) + 1 };
  estado.pets.moedas = saldoMoedas() + n;
  const patch = { damas_cpu_dia: estado.damasCpuDia, 'pets/moedas': estado.pets.moedas };
  registrarGanho('damas', n, patch);
  gravar(patch);
  return `+${n} 🪙`;
}
function mostrarFimDamas(res, motivo, wo = false, extra = '') {
  const outro = dm.tipo === 'cpu' ? 'O computador' : nomeT(dm.du.outro.uid, nomeCurto(dm.du.outro.uid, dm.du.outro.nome));
  $('dm-fim-titulo').innerHTML = motivo === 'atualizado' ? 'Partida encerrada' : res === 'venceu' ? (wo ? 'Você venceu por W.O.! 🏆' : 'Você venceu! 🏆') : res === 'empate' ? 'Empate! 🤝' : 'Perdeu';
  $('dm-fim-info').innerHTML = { pecas: res === 'venceu' ? 'Você capturou todas as peças.' : `${outro} capturou todas as suas peças.`,
    sem_jogada: res === 'venceu' ? 'O outro lado ficou sem jogada.' : 'Você ficou sem jogada.', empate: '20 jogadas seguidas sem captura e sem peça andar.',
    automaticas: res === 'venceu' ? 'O outro lado ficou 3 jogadas sem jogar.' : '3 jogadas automáticas seguidas contam como desistência.',
    desistiu: res === 'venceu' ? 'O outro lado desistiu.' : 'Você desistiu.', wo: 'O colega saiu do jogo.',
    atualizado: 'A partida foi encerrada: as Damas foram atualizadas.' }[motivo] || '';
  if (extra) $('dm-fim-info').insertAdjacentHTML('beforeend', `<b class="dm-fim-moedas">${esc(extra)}</b>`);
  $('dm-msg').textContent = '';
  $('dm-sair').textContent = 'Sair';
  $('dm-revanche').hidden = dm.tipo === 'online' && !colegas.has(dm.du.outro.uid);
  $('dm-fim').hidden = false;
  tocar(res === 'venceu' ? 'vitoria' : res === 'empate' ? 'acerto' : 'erro');
  const pet = petsOk && !petFora() && estado.pets.ativo, img = $('dm-fim-pet');
  img.hidden = !pet;
  if (pet) {
    dmPet = new PetParado(img); dmPet.definir(formaDe(pet));
    aplicarVisualPet(img, pet);
    if (res === 'venceu') { if (!dmPet.sequencia('vitoria')) dmPet.tocar(temAnim(formaDe(pet), 'pulo_cambalhota') ? 'pulo_cambalhota' : 'feliz'); }
    else if (res === 'perdeu') dmPet.tocar('triste_fome');
  }
}
function desistirDamas() {
  if (!dm) return;
  if (dm.fim) { fecharDamas(); return; }
  terminarDamas({ vencedor: outroLadoDamas(dm.eu), motivo: 'desistiu' });
}
function fecharDamas() {
  if (!dm) { $('damas').hidden = true; return; }
  const d = dm;
  if (!d.fim && d.tipo === 'online') { desistirDamas(); return; }   // sair no meio = desistir
  clearInterval(d.timer);
  dm = null; dmPet = null;
  $('damas').hidden = true;
  if (d.tipo === 'online' && duelo === d.du) encerrarDueloLocal();
}
function revancheDamas() {
  if (!dm) return;
  const d = dm;
  if (d.tipo === 'cpu') { abrirDamas({ tipo: 'cpu', nivel: d.nivel }); return; }
  const c = colegas.get(d.du.outro.uid), aposta = Number(d.du.d?.aposta?.valor) || 0;
  fecharDamas();
  if (c) desafiarColega(c, 'damas', aposta);   // a mesma aposta (sem saldo ou apostas desligadas: sem aposta)
}

// ── Online (o desafio da praça com modo 'damas') ──
function comecarDamasOnline(d) {
  const du = duelo;
  $('dl-conta').textContent = '♟️ Damas';
  avisoPet(`♟️ Damas contra ${nomeCurto(du.outro.uid, du.outro.nome)}! Você joga com as ${du.souA ? 'vermelhas e começa' : 'azuis'}.`);
  if (du.souA && d.estado === 'aceito') du.timers.push(setTimeout(() => {
    if (duelo !== du || du.d?.fim) return;
    update(du.ref, { estado: 'jogando', jogo: { ...estadoInicialDamas(), t: agoraServ(), autos: { a: 0, b: 0 } } }).catch(() => {});
  }, 1500));
}
function atualizarDamasOnline(d) {
  const du = duelo;
  if (d.fim) { fimDamasOnline(d); return; }
  vigiarWO(d);
  const jg = d.jogo;
  if (!jg?.tab) return;
  if (!tabDamasAtual(jg)) { encerrarDamasAntiga(du); return; }
  if (!dm || dm.du !== du) abrirDamas({ tipo: 'online', est: jg, eu: du.souA ? 'a' : 'b', du });
  if (jg.n !== dm.nVista) {
    const u = jg.ultima, novo = { tab: jg.tab, vez: jg.vez, semAvanco: jg.semAvanco || 0, n: jg.n };
    dm.nVista = jg.n; dm.forcou = null;
    if (u && jg.n > 0) aplicarNaTelaDamas(novo, { de: u.de, caminho: u.caminho || [], cap: u.cap || [] }, !!u.auto && u.lado === dm.eu);
    else { dm.est = novo; dm.tVez = Number(jg.t) || agoraServ(); renderDamas(); }
    dm.tVez = Number(jg.t) || dm.tVez;
    if (u?.auto && u.lado !== dm.eu) { dm.aviso = '⏱ O colega não jogou a tempo: jogada automática.'; renderDamas(); }
    // quem fez a jogada fecha o jogo (vitória, empate ou 3 automáticas)
    if (u?.lado === dm.eu || (u?.auto && dm.forcouLado)) {
      const f = fimDeJogoDamas(novo);
      if (f) terminarDamas(f);
      else if ((jg.autos?.[u.lado] || 0) >= 3) terminarDamas({ vencedor: outroLadoDamas(u.lado), motivo: 'automaticas' });
    }
  }
}
async function jogadaOnlineDamas(j, auto, lado) {
  const du = duelo;
  if (!du || !dm || dm.enviando) return;
  dm.enviando = true; dm.forcouLado = lado !== dm.eu;
  const n0 = dm.est.n;
  try {
    await runTransaction(ref(db, `${basePraca()}/duelos/${du.id}/jogo`), (cur) => {
      if (cur === null) return null;   // ainda não carregou do servidor: o Firebase busca e repete
      const est = { tab: cur.tab, vez: cur.vez, semAvanco: cur.semAvanco || 0, n: cur.n || 0 };
      if (cur.vez !== lado || est.n !== n0 || !ehValidaDamas(est, j)) return;   // não é a vez, já mudou ou jogada inválida: cancela
      const novo = aplicarDamas(est, j), autos = { a: Number(cur.autos?.a) || 0, b: Number(cur.autos?.b) || 0 };
      autos[lado] = auto ? autos[lado] + 1 : 0;
      return { ...novo, t: agoraServ(), autos, ultima: { de: j.de, caminho: j.caminho, cap: j.cap, auto: !!auto, lado } };
    });
  } catch (e) { console.warn('[jogo-revisao] jogada de damas', e?.code || e); }
  if (dm) dm.enviando = false;
}
// partida aberta antes das Damas 8×8 (PROMPT-127): o tabuleiro gravado tem outro tamanho → encerra sem vencedor
const tabDamasAtual = (jg) => typeof jg?.tab === 'string' && jg.tab.length === N_DAMAS * N_DAMAS;
function encerrarDamasAntiga(du) {
  if (du.encerrouAntiga) return;
  du.encerrouAntiga = true;
  runTransaction(ref(db, `${basePraca()}/duelos/${du.id}/fim`), (cur) => (cur ? undefined : { vencedor: 'empate', placar: {}, wo: false, motivo: 'atualizado', ts: serverTimestamp() }))
    .catch(e => console.warn('[jogo-revisao] damas antigas', e?.code || e));
}
async function finalizarDamasOnline(vencedorLado, motivo) {
  const du = duelo, d = du?.d;
  if (!d) return;
  const uidDe = (l) => (l === 'a' ? d.a.uid : l === 'b' ? d.b.uid : 'empate');
  const vencedor = uidDe(vencedorLado), tab = dm?.est?.tab || '';
  const placar = { [d.a.uid]: contarDamas(tab, 'a'), [d.b.uid]: contarDamas(tab, 'b') };
  await gravarFimDamas(d, vencedor, placar, motivo, false);
}
async function gravarFimDamas(d, vencedor, placar, motivo, wo) {
  const a = d.a.uid, b = d.b.uid;
  try {
    const t = await runTransaction(ref(db, `${basePraca()}/duelos/${duelo.id}/fim`), (cur) => (cur ? undefined : { vencedor, placar, wo, motivo, ts: serverTimestamp() }));
    if (!t.committed) return;
    await set(ref(db, `${basePraca()}/historico/${semanaPesca()}/${duelo.id}`), { a, b, an: d.a.nome || '', bn: d.b.nome || '', at: d.a.turma || '', bt: d.b.turma || '',
      vencedor, placar: `${placar[a] ?? 0}-${placar[b] ?? 0}`, wo, modo: 'damas', aposta: Number(d.aposta?.valor) || 0, ts: Date.now() });
  } catch (e) { console.warn('[jogo-revisao] fim das damas', e?.code || e); }
}
function fimDamasOnline(d) {
  const du = duelo;
  if (du.fimDamas) return;
  du.fimDamas = true;
  du.timers.forEach(clearTimeout);
  const f = d.fim, eu = sessao.uid, res = f.vencedor === 'empate' ? 'empate' : f.vencedor === eu ? 'venceu' : 'perdeu';
  if (!dm || dm.du !== du) abrirDamas({ tipo: 'online', est: tabDamasAtual(d.jogo) ? d.jogo : estadoInicialDamas(), eu: du.souA ? 'a' : 'b', du });
  dm.fim = { vencedor: f.vencedor, motivo: f.motivo };
  clearInterval(dm.timer);
  if (res === 'venceu' && (entraNoRanking() || teste)) {
    update(ref(db, `${basePraca()}/damas/${semanaPesca()}/${eu}`), { vitorias: increment(1), nome: nomeRanking(), turma: sessao.turma || '', pers: meuPersonagem(), ts: Date.now() })
      .catch(e => console.warn('[jogo-revisao] ranking de damas', e?.code || e));
    delete mural.cache.damas;
  }
  du.venceu = res === 'venceu';   // ao fechar, o pet comemora na praça (PROMPT-65)
  if (f.motivo !== 'atualizado') ganharXPJogo(res === 'venceu' ? 15 : 5, 'desafio');   // ⭐ jogou / venceu (PROMPT-156)
  const patch = {}, txtAposta = apostaNoFim(d, patch);
  if (Object.keys(patch).length) { gravar(patch); }
  mostrarFimDamas(res, f.wo ? 'wo' : f.motivo === 'desistiu' && res === 'perdeu' ? 'desistiu' : f.motivo, !!f.wo, txtAposta);
  du.parar?.();
}

// ── Modo de ajuste da praça (?editarPraca=1, só no modo teste): arrastar e copiar o JSON ──
function ligarEdicaoPraca() {
  const C = cfgPraca();
  const obj = (o) => o && { pos: () => [o.x, o.y], por: (x, y) => { o.x = x; o.y = y; } };
  const par = (a) => a && { pos: () => a, por: (x, y) => { a[0] = x; a[1] = y; } };
  const itens = [['mural', obj(C.mural), '📋'], ['mural: onde para', par(C.mural?.ponto), '👣'], ['fliperama', obj(C.fliperama), '🕹️'], ['loja', obj(C.loja), '🛒'],
    ['casinhas', obj(C.casinha), '🏠'], ['casinhas: onde para', par(C.casinha?.ponto), '👣'],
    ['desafio A', par(C.ponto_desafio?.a), '⚔️'], ['desafio B', par(C.ponto_desafio?.b), '⚔️'], ['entrada', par(C.entrada), '🚪'],
    ...(C.bancos || []).map((b, i) => [`banco ${i + 1}`, par(b), '🪑']),
    ...(EXPO?.pavilhao ? [['exposição (base)', { pos: () => [EXPO.pavilhao.x, EXPO.pavilhao.y], por: moverPavilhao }, '🖼️'], ['exposição: onde para', par(EXPO.pavilhao.ponto), '👣']] : [])].filter(([, o]) => o);
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
    const { entrada, saidas, mural: mu, fliperama, ponto_desafio, bancos, loja, casinha } = C;
    const txt = JSON.stringify({ entrada, saidas, mural: mu, fliperama, ponto_desafio, bancos, loja, casinha }, null, 1) +
      (EXPO?.pavilhao ? '\n\n// exposicao.json → "pavilhao" (o bloqueio anda junto com a base):\n' + JSON.stringify({ pavilhao: EXPO.pavilhao }) : '');
    try { await navigator.clipboard.writeText(txt); $('npc-editar-pos').textContent = 'Copiado! Cole no praca.json.'; }
    catch (_) { console.log(txt); $('npc-editar-pos').textContent = 'Não deu para copiar: o JSON está no console (F12).'; }
  });
}

// ============================================================
//  🖼️ EXPOSIÇÃO VIRTUAL (PROMPT-EXPOSICAO-1) — dados/jogo/exposicao.json. Pavilhão na Praça → saguão (1376 × 768, 10 portas)
//  → salas (2176 × 768, câmera na horizontal). Pavilhão e saguão: todos; cada sala: o grupo dela e a professora, ou todos
//  (nas salas com grupo) com exposicao_config/visitas_abertas = true (fase pública; o botão vem na parte 2). Firebase (modo
//  teste: *_teste): exposicao_config { visitas_abertas } e exposicao_salas/{n} { tema, musica, nome, itens (parte 2) };
//  sem o nó: tema_padrao, sem música, sem nome.
//  Presença: o online.js de sempre, com local 'exposicao' e mapa 'saguao' | 'sala-{n}' (cada um vê só quem está no mesmo).
//  O grupo de cada sala vem do JSON (parte 2: de exposicao_salas, com prioridade). Tudo falha em silêncio.
// ============================================================
let EXPO = null;
let visitasAbertas = false;       // exposicao_config/visitas_abertas === true: todos entram nas salas com grupo
const expoSalas = {};             // n → { tema, musica, nome } lidos ao vivo
let expoOuvindo = false, pararOuvirExpo = () => {};
let expoMusicaMudo = false;       // 🔈 silenciar só a música da sala
let expoSoAluno = false;          // ?expo=aluno (modo teste): sem os privilégios do modo teste, para testar como aluno
let expoTesteProf = false;        // ?sala=N&teste=1 (a professora pelo "Ver sala" da página dela, no modo teste): só os nós *_teste
const noExpo = (no) => `${no}${teste || expoTesteProf ? '_teste' : ''}`;
const ehSaguao = () => cena?.tipo === 'mapa' && cena.n === 'saguao';
const salaExpo = () => (cena?.tipo === 'mapa' && cena.expoSala) || null;   // número da sala em que o aluno está
const privilegioExpo = () => ehProfessora() || (teste && !expoSoAluno);   // professora e modo teste: entram em todas
// o grupo: exposicao_salas/{n}/grupo (a página da professora) com prioridade; sem o nó, o salas do JSON. Sem integrantes: sem grupo
const expoGrupos = {};            // n → { turma, membros } lidos ao vivo (null: o nó não existe)
const grupoSala = (n) => { const g = expoGrupos[n] !== undefined && expoGrupos[n] !== null ? expoGrupos[n] : EXPO?.salas?.[n]; return g?.membros?.length ? g : null; };
const souDaSala = (n) => { const g = grupoSala(n); return !!g && g.turma === sessao.turma && (g.membros || []).includes(sessao.nome); };
const podeEntrarSala = (n) => !!grupoSala(n) && (privilegioExpo() || souDaSala(n) || visitasAbertas);   // sala sem grupo: "Em breve"
const podeDecorar = (n) => !!grupoSala(n) && (privilegioExpo() || souDaSala(n));   // ✏️ Decorar: o grupo e a professora
const estadoSala = (n) => ({ tema: EXPO?.tema_padrao, musica: null, nome: null, ...(expoSalas[n] || {}) });
const temaExpo = (id) => (EXPO.temas || []).find(t => t.id === id) || (EXPO.temas || []).find(t => t.id === EXPO.tema_padrao) || EXPO.temas[0];

function iniciarExposicao(j) {
  if (!j?.saguao || !j?.sala || !(j.temas || []).length) return;
  EXPO = j;
  expoSoAluno = teste && new URLSearchParams(location.search).get('expo') === 'aluno';
  expoTesteProf = ehProfessora() && new URLSearchParams(location.search).get('teste') === '1';
  try {
    for (const p of j.saguao.portas || []) onValue(ref(db, `${noExpo('exposicao_salas')}/${p.n}/grupo`), (s) => {
      const v = s.exists() ? s.val() : null;
      expoGrupos[p.n] = v && typeof v === 'object' ? { turma: String(v.turma || ''), membros: Object.values(v.membros || {}).filter(x => typeof x === 'string') } : null;
      conferirAprovadosExpo(p.n);   // ⭐ (PROMPT-156)
      if (ehSaguao()) desenharPlacasExpo();
    }, () => {});
    onValue(ref(db, `${noExpo('exposicao_config')}/visitas_abertas`), (s) => {
      visitasAbertas = s.exists() && s.val() === true;
      if (ehSaguao()) desenharPlacasExpo();   // ao vivo: os 🔒 das portas (quem já está numa sala continua nela)
    },
      (e) => console.warn('[jogo-revisao] exposicao_config indisponível', e?.code || e));
  } catch (e) { console.warn('[jogo-revisao] exposicao_config indisponível', e?.code || e); }
}

// ── Pavilhão na Praça ───────────────────────────────────────
function bloquearPavilhao(g0) {   // cópia (a grade da trilha fica em cache e serve a Praça sem o pavilhão)
  const g = Uint8Array.from(g0), b = EXPO.pavilhao.bloqueio;
  if (!b?.x || !b?.y) return g0;
  for (let cy = Math.max(0, Math.floor(b.y[0] / CEL)); cy <= Math.min(GH - 1, Math.floor(b.y[1] / CEL)); cy++)
    for (let cx = Math.max(0, Math.floor(b.x[0] / CEL)); cx <= Math.min(GW - 1, Math.floor(b.x[1] / CEL)); cx++) g[cy * GW + cx] = 0;
  return g;
}
function montarPavilhao() {
  cena.exposicao = null;
  if (!EXPO?.pavilhao) return;
  const P = EXPO.pavilhao, ponto = P.ponto || [P.x, P.y + 14];
  cena.exposicao = { x: P.x, y: P.y, largura: Number(P.largura) || 230, alt: 70, ponto, trilha: cena.naTrilha(...ponto) };
  // a imagem (praca/pavilhao-exposicao.webp); enquanto não existir, a placa "🖼️ Exposição"
  const el = document.createElement('div');
  el.className = 'expo-pavilhao sem-img';
  el.innerHTML = '<span class="expo-pav-placa">🖼️ Exposição</span>';
  const rot = document.createElement('div');   // o rótulo dos prédios, só com a imagem (a placa já tem o nome)
  rot.className = 'jr-rotulo-porta jr-rotulo-praca expo-pav-rotulo'; rot.hidden = true; rot.innerHTML = '<span>🖼️ Exposição</span>';
  $('cena-atores').append(el, rot);
  posicionarPavilhao(el);
  const img = new Image();
  img.alt = ''; img.draggable = false;
  img.onload = () => {
    if (!el.isConnected || !cena?.exposicao) return;
    cena.exposicao.alt = cena.exposicao.largura * img.naturalHeight / img.naturalWidth;
    el.classList.remove('sem-img'); el.prepend(img); rot.hidden = false;
    if (P.placa) el.insertAdjacentHTML('beforeend', '<span class="expo-pav-nome">Exposição</span>');   // na placa creme (em branco na imagem)
    posicionarPavilhao(el);
  };
  img.src = `${IMG}/${P.imagem || 'praca/pavilhao-exposicao.webp'}`;
}
function posicionarPavilhao(el = $('cena-atores').querySelector('.expo-pavilhao')) {
  const ex = cena?.exposicao;
  if (!el || !ex) return;
  Object.assign(el.style, { left: ex.x + 'px', top: ex.y + 'px', width: ex.largura + 'px', zIndex: Math.round(ex.y) });
  const nome = el.querySelector('.expo-pav-nome'), pl = EXPO.pavilhao.placa;   // dentro do prédio: o canto de cima da imagem é a origem
  if (nome && pl) Object.assign(nome.style, { left: (pl[0] - ex.x + ex.largura / 2) + 'px', top: (pl[1] - ex.y + ex.alt) + 'px' });
  const rot = $('cena-atores').querySelector('.expo-pav-rotulo');
  if (rot) Object.assign(rot.style, { left: ex.x + 'px', top: (ex.y - ex.alt - 6) + 'px' });
}
// ?editarPraca=1: a base anda com o bloqueio (o ponto de parar tem o seu próprio 👣)
function moverPavilhao(x, y) {
  const P = EXPO.pavilhao, dx = x - P.x, dy = y - P.y;
  P.x = x; P.y = y;
  if (P.bloqueio?.x) { P.bloqueio.x = P.bloqueio.x.map(v => v + dx); P.bloqueio.y = P.bloqueio.y.map(v => v + dy); }
  if (P.placa) P.placa = [P.placa[0] + dx, P.placa[1] + dy];
  if (cena?.exposicao) { cena.exposicao.x = x; cena.exposicao.y = y; posicionarPavilhao(); }
}
const tocouPavilhao = (p) => { const ex = cena?.exposicao; return !!ex && Math.abs(p.x - ex.x) < ex.largura / 2 && p.y > ex.y - ex.alt && p.y < ex.y + 24; };

// ── Saguão ──────────────────────────────────────────────────
// prelúdio comum das duas cenas da Exposição (como o laboratório e a vila)
function prepararCenaExpo(titulo, voltar) {
  sairPesca(false);
  cena = null;
  esconderBalao();
  fecharCartaoColega();
  fecharBalaoPorta();
  $('btn-revanche').hidden = true;
  $('cena-aviso').hidden = true;
  $('cena-atores').innerHTML = '';
  $('cena-titulo').textContent = titulo;
  $('btn-cena-voltar').textContent = voltar;
  $('btn-cena-voltar').hidden = false;
  $('tela-cena').classList.remove('jr-no-ginasio');
  mostrarTela('tela-cena');
  $('cena-palco').style.visibility = 'hidden';
  limparPessoas();
  sairDoMapaOnline();
}
// saída por uma faixa embaixo ({ y_min, x: [a, b] }): o ponto do meio, como a descida da vila
function saidaFaixa(f, entrada, naTrilha) {
  const sx = f?.x ? (f.x[0] + f.x[1]) / 2 : entrada[0], sy = Math.min(H - 4, (Number(f?.y_min) || 752) + 6);
  return { cfg: [sx, sy], saida: { x: sx, y: sy, trilha: naTrilha(sx, sy), faixa: f?.x ? [f.x[0], f.x[1]] : null } };
}
async function abrirSaguao(deSala = null) {   // deSala: voltou daquela sala (aparece na porta dela)
  if (!EXPO) return;
  const S = EXPO.saguao;
  prepararCenaExpo('🖼️ Exposição', '⟵ Praça');
  const [grade] = await Promise.all([carregarGrade(S.trilha).catch(() => gradeDeRetangulos([{ x0: 0, y0: 280, x1: W, y1: H }])), trocarFundo(`${IMG}/${S.imagem}`)]);
  const naTrilha = (x, y) => centroCelula(celulaMaisProxima(grade, x, y), grade);
  const sd = saidaFaixa(S.saida_praca, S.entrada, naTrilha);
  cena = { tipo: 'mapa', n: 'saguao', salao: true, alturaPersonagem: Number(S.altura_personagem) || 120, cfg: { entrada: S.entrada, saidas: [sd.cfg] }, grade, portas: {}, naTrilha, saidas: [sd.saida] };
  cena.expoPortas = (S.portas || []).map(p => ({ ...p, trilha: naTrilha(...p.ponto) }));
  desenharPlacasExpo();
  destinoEspecial = null;
  alvoMapa = null;
  pertoSaidaGin = false;
  const pd = deSala && cena.expoPortas.find(p => p.n === deSala);
  if (pd) posicionarJogador(pd.trilha[0], pd.trilha[1], 'frente');
  else posicionarJogador(S.entrada[0], S.entrada[1], 'costas');
  soltouDesdeTroca = false;
  ajustarCamera();
  $('cena-palco').style.visibility = '';
  atualizarBotaoPet();
  entrarNoMapaOnline('saguao', 'exposicao');
  pararExpo();   // no saguão só vale visitas_abertas (ouvida desde o começo)
  if (privilegioExpo()) ouvirPendentesExpo();   // ⏳ {n} para aprovar
}
// professora e modo teste, no saguão: quantos itens e nomes esperam aprovação (todas as salas, sem as fotos)
let expoPendN = 0;
function ouvirPendentesExpo() {
  expoOuvindo = true;
  let f = () => {};
  try {
    f = onValue(ref(db, noExpo('exposicao_salas')), (s) => {
      let n = 0;
      for (const sala of Object.values(s.val() || {})) {
        if (!sala || typeof sala !== 'object') continue;
        if (typeof sala.nome_pendente === 'string' && sala.nome_pendente) n++;
        for (const v of Object.values(sala.itens || {})) { const m = v && lerItemExpo(v); if (m?.status === 'pendente') n++; }
      }
      expoPendN = n;
    }, (e) => console.warn('[jogo-revisao] exposicao_salas indisponível', e?.code || e));
  } catch (e) { console.warn('[jogo-revisao] exposicao_salas indisponível', e?.code || e); }
  pararOuvirExpo = () => { try { f(); } catch (_) {} expoPendN = 0; };
}
// o número em cada placa (e 🔒: sala em que este aluno não pode entrar)
function desenharPlacasExpo() {
  const at = $('cena-atores');
  for (const el of at.querySelectorAll('.expo-placa')) el.remove();
  at.insertAdjacentHTML('beforeend', (cena.expoPortas || []).map(p => {
    const tranca = !podeEntrarSala(p.n);
    return `<div class="expo-placa" style="left:${p.placa[0]}px;top:${p.placa[1]}px"><b>${p.n}</b>${tranca ? '<i>🔒</i>' : ''}</div>`;
  }).join(''));
}
// toque na placa ou na porta: a porta cujo segmento placa → ponto passa mais perto do toque
function portaExpoEm(p) {
  let melhor = null, md = 50;
  for (const d of cena.expoPortas || []) {
    const [ax, ay] = d.placa, [bx, by] = d.ponto, vx = bx - ax, vy = by - ay;
    const t = clamp(((p.x - ax) * vx + (p.y - ay) * vy) / (vx * vx + vy * vy || 1), 0, 1);
    const dd = dist(p.x, p.y, ax + vx * t, ay + vy * t);
    if (dd < md) { md = dd; melhor = d; }
  }
  return melhor;
}
function entrarSalaExpo(n) {
  const p = cena.expoPortas?.find(x => x.n === n);
  if (!p) return;
  if (!grupoSala(n)) { balaoExpo(p, '🔜 Em breve'); return; }
  if (!podeEntrarSala(n)) { balaoExpo(p, '🔒 Sala do grupo — só para integrantes'); tocar('erro'); return; }
  transicao(() => abrirSalaExpo(n));
}
function balaoExpo(p, txt) {   // o balão das portas do ginásio, sem botões
  soltouDesdeTroca = false;   // segurando ⬆, não repete
  fecharBalaoPorta();
  const el = $('porta-balao');
  el.innerHTML = `<b>Sala ${p.n}</b><span>${esc(txt)}</span>`;
  el.hidden = false;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  balaoPorta = { d: { x: p.ponto[0], y: p.ponto[1] }, timer: setTimeout(fecharBalaoPorta, 2500) };
  posicionarBalaoPorta();
}

// ── Salas ───────────────────────────────────────────────────
async function abrirSalaExpo(n) {
  if (!EXPO || !grupoSala(n)) return;
  const S = EXPO.sala, LW = Number(S.tamanho?.w) || 2176, st = estadoSala(n), tema = temaExpo(st.tema);
  prepararCenaExpo(tituloSala(n), '⟵ Saguão');
  const [grade] = await Promise.all([
    carregarGrade(S.trilha, Math.round(LW / CEL), GH).catch(() => { const g = new Uint8Array(LW / CEL * GH); g.gw = LW / CEL; g.gh = GH; for (let i = 86 * g.gw; i < g.length; i++) g[i] = 1; return g; }),
    trocarFundo(`${IMG}/${tema.imagem}`, LW)]);
  const naTrilha = (x, y) => centroCelula(celulaMaisProxima(cena.grade, x, y), cena.grade);   // a grade muda com os móveis
  const sd = saidaFaixa(S.saida_saguao, S.entrada, (x, y) => centroCelula(celulaMaisProxima(grade, x, y), grade));
  cena = { tipo: 'mapa', n: 'sala-' + n, expoSala: n, tema: tema.id, salao: true, w: LW, alturaPersonagem: Number(S.altura_personagem) || 120,
    cfg: { entrada: S.entrada, saidas: [sd.cfg] }, grade, portas: {}, naTrilha, saidas: [sd.saida] };
  abrirItensSala(n, grade);   // 🖼️ móveis, fotos e textos (PROMPT-EXPOSICAO-2)
  destinoEspecial = null;
  alvoMapa = null;
  pertoSaidaGin = false;
  posicionarJogador(S.entrada[0], S.entrada[1], 'costas');
  soltouDesdeTroca = false;
  ajustarCamera();
  $('cena-palco').style.visibility = '';
  atualizarBotaoPet();
  entrarNoMapaOnline('sala-' + n, 'exposicao');
  ouvirExpo(['tema', 'musica', 'nome', 'nome_pendente', 'nome_motivo'].map(c => [String(n), c]), () => aplicarEstadoSala(n), n);
}
function tituloSala(n) { const nome = nomeSalaVisivel(n); return `🖼️ Sala ${n}${nome ? ' · ' + String(nome).slice(0, 40) : ''}`; }
// mudou no Firebase com o aluno dentro: nome na faixa, fundo do tema (a música segue em lugarDaMusica)
async function aplicarEstadoSala(n) {
  if (salaExpo() !== n) return;
  const t = tituloSala(n);
  if ($('cena-titulo').textContent !== t) $('cena-titulo').textContent = t;
  redesenharLetreiros();   // o nome e o ⏳/❌ (só redesenha o que mudou)
  if (ex?.editando) resumoAprovExpo();
  const tema = temaExpo(estadoSala(n).tema), c = cena;
  if (tema.id === c.tema) return;
  c.tema = tema.id;
  const f = $('cena-fundo');
  f.style.transition = 'opacity .18s ease'; f.style.opacity = '0';
  await new Promise(ok => setTimeout(ok, 180));
  if (cena !== c) { f.style.opacity = ''; f.style.transition = ''; return; }
  await trocarFundo(`${IMG}/${tema.imagem}`, c.w);
  f.style.opacity = '';
  setTimeout(() => { f.style.transition = ''; }, 220);
}

// ouve campos de exposicao_salas/{n} ([n, campo]) e, numa sala, os itens dela; cb a cada mudança
function ouvirExpo(campos, cb, salaItens = null) {
  pararExpo();
  expoOuvindo = true;
  const fs = [];
  const base = noExpo('exposicao_salas');
  try {
    for (const [n, campo] of campos) fs.push(onValue(ref(db, `${base}/${n}/${campo}`), (s) => {
      const o = (expoSalas[n] ||= {});
      if (!s.exists()) delete o[campo];
      else o[campo] = typeof s.val() === 'string' ? s.val().slice(0, 80) : null;
      cb();
    }, (e) => console.warn('[jogo-revisao] exposicao_salas indisponível', e?.code || e)));
    if (salaItens) {   // cada item é um nó: só aquele item é redesenhado (as fotos ficam em exposicao_imagens)
      const r = ref(db, `${base}/${salaItens}/itens`), chegou = (s) => { if (salaExpo() === salaItens) itemExpoMudou(s.key, s.val()); };
      fs.push(onChildAdded(r, chegou, () => {}), onChildChanged(r, chegou, () => {}), onChildRemoved(r, (s) => { if (salaExpo() === salaItens) itemExpoMudou(s.key, null); }, () => {}));
    }
  } catch (e) { console.warn('[jogo-revisao] exposicao_salas indisponível', e?.code || e); }
  pararOuvirExpo = () => { for (const f of fs) try { f(); } catch (_) {} };
}
function pararExpo() {
  pararOuvirExpo();
  pararOuvirExpo = () => {};
  expoOuvindo = false;
}

// 🎵 música da sala: arquivo de audio/exposicao/ (só o nome; sem extensão vira .mp3); null = silêncio
function musicaDaSala(ignorarMudo = false) {
  const n = salaExpo(), m = n && estadoSala(n).musica;
  if (!m || !/^[\w .()-]+$/.test(m) || (expoMusicaMudo && !ignorarMudo)) return null;
  return `/audio/exposicao/${encodeURIComponent(/\.(mp3|ogg|m4a|wav)$/i.test(m) ? m : m + '.mp3')}`;
}
function atualizarHudExpo() {
  const n = salaExpo(), bd = $('btn-expo-decorar'), semD = !(n && ex && !ex.editando && podeDecorar(n));
  if (bd.hidden !== semD) bd.hidden = semD;
  const bm = $('btn-expo-musica'), semM = !(n && musicaDaSala(true));
  if (bm.hidden !== semM) bm.hidden = semM;
  const bp = $('btn-expo-pend'), semP = !(ehSaguao() && expoPendN > 0 && privilegioExpo());
  if (bp.hidden !== semP) bp.hidden = semP;
  const tp = `⏳ ${expoPendN} para aprovar`;
  if (!semP && bp.textContent !== tp) bp.textContent = tp;
  const ic = expoMusicaMudo ? '🔇' : '🔈';
  if (!semM && bm.textContent !== ic) bm.textContent = ic;
}
function ligarExposicao() {
  $('btn-expo-musica').addEventListener('click', (e) => { e.stopPropagation(); expoMusicaMudo = !expoMusicaMudo; });
  $('btn-expo-pend').addEventListener('click', (e) => { e.stopPropagation(); window.open('/professor/p-exposicao.html', '_blank', 'noopener'); });   // só um aviso: a aprovação é na página
  ligarEditorExpo();
}


// ============================================================
//  🖼️ EXPOSIÇÃO — EDITOR DAS SALAS (PROMPT-EXPOSICAO-2). Itens: exposicao_salas/{n}/itens/{id}
//  { mv, x, y, vista, espelho, cor, titulo, texto, foto, fotos, por, ts } (+ mexendo / mexendo_por enquanto alguém arrasta).
//  Fotos: exposicao_imagens/{id} { dados (dataURL), sala, por, ts }, lidas só quando o id muda. Sem compra nem guardados: o
//  catálogo todo (exposicao.json → moveis), com o limite de cada item e os da sala (limites). Cada mudança grava só aquele
//  item (arrastar: ao soltar); todos ouvem onChildAdded/Changed/Removed. `por` só aparece na página da professora.
// ============================================================
let ex = null;   // a sala aberta: { n, itens: Map, els: Map, gradeBase, editando, sel, cat, arr, pan, camX, ver, conf }
const fotosExpo = new Map();   // id da foto → Promise<dataURL | null>
const catExpo = (mv) => (Array.isArray(EXPO?.moveis) ? EXPO.moveis : []).find(i => i.id === mv) || null;
const srcExpo = (mv, vista) => `${IMG}/exposicao/moveis/${mv}_${vista}.webp`;
const escalaExpo = () => Number(EXPO?.escala_moveis) || 1;
const limiteExpo = (k, padrao) => Number(EXPO?.limites?.[k]) || padrao;
const filtroExpo = (it, cor) => (it?.cor && EXPO?.cores?.[it.cor]?.[cor]) || '';
const nCoresExpo = (it) => (it?.cor && Array.isArray(EXPO?.cores?.[it.cor]) ? EXPO.cores[it.cor].length : 0);
const fotosLista = (m) => [0, 1, 2, 3].map(i => (typeof m?.fotos?.[i] === 'string' ? m.fotos[i] : null));   // varal: 4 lugares (o banco guarda {0: id, 2: id})
const fotosDoItem = (m) => [m.foto, ...fotosLista(m)].filter(Boolean);
const fotosNaSala = () => [...ex.itens.values()].reduce((t, m) => t + fotosDoItem(m).length, 0);
// ✅ aprovação (PROMPT-EXPOSICAO-3): fotos e textos só aparecem para os de fora depois que a professora aprova
const precisaAprov = (it) => it?.conteudo === 'foto' || it?.conteudo === 'fotos4' || it?.conteudo === 'texto';
const STATUS_EXPO = ['pendente', 'aprovado', 'recusado'];
const temAlgoExpo = (m) => !!(m.titulo || m.texto || fotosDoItem(m).length);
const veTudoExpo = (n = ex?.n) => !!n && podeDecorar(n);   // o grupo, a professora e o modo teste: inclusive o pendente e o recusado
const visivelExpo = (m) => !precisaAprov(catExpo(m.mv)) || m.status === 'aprovado' || veTudoExpo();
const seloExpo = (m) => (precisaAprov(catExpo(m.mv)) && veTudoExpo() ? (m.status === 'pendente' ? '⏳' : m.status === 'recusado' ? '❌' : '') : '');
// o nome da sala: o grupo vê o pendente (enquanto espera); os de fora, só o aprovado
const nomeSalaVisivel = (n) => { const st = estadoSala(n); return String((veTudoExpo(n) && st.nome_pendente) || st.nome || ''); };
const nomeDaSala = () => nomeSalaVisivel(ex.n);
const seloNomeExpo = (n) => { const st = estadoSala(n); return !veTudoExpo(n) ? '' : st.nome_pendente ? '⏳' : st.nome_motivo !== undefined && st.nome_motivo !== null ? '❌' : ''; };
// 📏 tamanhos de um objeto de chão (PROMPT-152): 1 = 100%, o tamanho do catálogo
const TAMS_EXPO = [0.6, 0.8, 1, 1.3, 1.6, 2, 2.5, 3, 3.5, 4];   // até 400%
const tamValido = (it, t) => (it?.tipo === 'chao' && TAMS_EXPO.includes(Number(t)) ? Number(t) : 1);
function tamExpo(m) {
  const it = catExpo(m.mv);
  return tamPelaLargura((Number(it?.largura) || 100) * escalaExpo() * tamValido(it, m.tam), srcExpo(m.mv, it?.vistas?.[0] || 'f'), srcExpo(m.mv, m.vista));
}
const medirItemExpo = (it) => Promise.all(it.vistas.map(v => medirImg(srcExpo(it.id, v))));
// um item lido do banco (o que não for válido some)
function lerItemExpo(v) {
  const it = catExpo(v?.mv);
  if (!it || !Number.isFinite(Number(v.x)) || !Number.isFinite(Number(v.y))) return null;
  const txt = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '');
  const m = { mv: it.id, x: Number(v.x), y: Number(v.y), vista: it.vistas.includes(v.vista) ? v.vista : it.vistas[0], espelho: !!v.espelho, tam: tamValido(it, v.tam),
    cor: clamp(Math.round(Number(v.cor) || 0), 0, Math.max(0, nCoresExpo(it) - 1)), titulo: txt(v.titulo, 40), texto: txt(v.texto, 400),
    foto: typeof v.foto === 'string' ? v.foto : null, fotos: v.fotos && typeof v.fotos === 'object' ? { ...v.fotos } : null,
    por: typeof v.por === 'string' ? v.por : '', ts: Number(v.ts) || 0, mexendo: Number(v.mexendo) || 0, mexendo_por: typeof v.mexendo_por === 'string' ? v.mexendo_por : '',
    env_por: typeof v.env_por === 'string' ? v.env_por : '', env_ts: Number(v.env_ts) || 0, motivo: txt(v.motivo, 80), rev_ts: Number(v.rev_ts) || 0 };
  // sem status (itens de antes da aprovação): com conteúdo conta como pendente
  m.status = !precisaAprov(it) ? null : STATUS_EXPO.includes(v.status) ? v.status : temAlgoExpo(m) ? 'pendente' : null;
  return m;
}
// o que vai para o banco (sem undefined; textos vazios e fotos ausentes não vão)
function gravavelExpo(m) {
  const o = { mv: m.mv, x: Math.round(m.x), y: Math.round(m.y), vista: m.vista, espelho: !!m.espelho, cor: m.cor || 0, por: sessao.uid, ts: Date.now() };
  if (m.tam && m.tam !== 1) o.tam = m.tam;
  if (m.titulo) o.titulo = m.titulo;
  if (m.texto) o.texto = m.texto;
  if (m.foto) o.foto = m.foto;
  const f = fotosLista(m);
  if (f.some(Boolean)) o.fotos = Object.fromEntries(f.map((id, i) => [i, id]).filter(([, id]) => id));
  if (m.status) o.status = m.status === 'aprovado' || m.status === 'recusado' ? m.status : 'pendente';   // o editor nunca aprova: só mantém o que a professora gravou
  if (m.status === 'recusado' && m.motivo) o.motivo = m.motivo;
  if (m.status && m.rev_ts) o.rev_ts = m.rev_ts;
  if (m.env_por) { o.env_por = m.env_por; o.env_ts = m.env_ts || Date.now(); }
  return o;
}
const refItens = () => ref(db, `${noExpo('exposicao_salas')}/${ex.n}/itens`);
const refItem = (id) => ref(db, `${noExpo('exposicao_salas')}/${ex.n}/itens/${id}`);
const refImagem = (id) => ref(db, `${noExpo('exposicao_imagens')}/${id}`);
// grava sem travar a tela: se o banco não confirmar em 6 s (ou recusar), avisa — o que está na tela fica
function salvarExpo(promessa) {
  const t = setTimeout(semConexaoExpo, 6000);
  return Promise.resolve(promessa).then(() => { clearTimeout(t); return true; }, (e) => { clearTimeout(t); console.warn('[jogo-revisao] exposição: gravar', e?.code || e); semConexaoExpo(); return false; });
}
const semConexaoExpo = () => avisoExpo('📡 Sem conexão, as mudanças não foram salvas');
let ultimoAvisoExpo = { t: '', ate: 0 };
function avisoExpo(texto) {   // o mesmo aviso não entra de novo na fila enquanto aparece (tocar várias vezes num item cheio)
  if (ultimoAvisoExpo.t === texto && performance.now() < ultimoAvisoExpo.ate) return;
  ultimoAvisoExpo = { t: texto, ate: performance.now() + 4200 };
  avisoPet(texto);
}
function fotoExpo(id) {
  if (!id) return Promise.resolve(null);
  if (!fotosExpo.has(id)) fotosExpo.set(id, get(ref(db, `${noExpo('exposicao_imagens')}/${id}/dados`))
    .then(s => (s.exists() && typeof s.val() === 'string' && s.val().startsWith('data:image/') ? s.val() : null)).catch(() => { fotosExpo.delete(id); return null; }));
  return fotosExpo.get(id);
}

// ── entrar e sair da sala ──
function abrirItensSala(n, grade) {
  fecharSalaExpo();
  ex = { n, itens: new Map(), els: new Map(), gradeBase: grade, editando: false, sel: null, cat: EXPO?.abas?.[0]?.id || 'museu', arr: null, pan: null, camX: 0, ver: null, conf: 0 };
  if (seguidor) seguidor.zCasa = Z_PET_CASA;   // o pet na frente dos móveis, como na Casinha (PROMPT-114)
}
function fecharSalaExpo() {
  if (!ex) return;
  if (ex.editando) sairEdicaoExpo(true);
  for (const el of ex.els.values()) el.remove();
  ex = null;
  if (seguidor && !cs) seguidor.zCasa = null;
  for (const id of ['ex-cont', 'ex-temas', 'ex-ver']) $(id).hidden = true;
  $('ex-faixa').hidden = $('ex-ferr').hidden = true;
}
// ⭐ item que eu mandei e a professora aprovou: +10 XP do jogo, uma vez por item (xp_jogo/expo/{sala}_{item}) (PROMPT-156)
function xpExpoAprovado(n, id, m) {
  const x = estado?.xpJogo, k = `${n}_${id}`;
  if (!x || m.status !== 'aprovado' || (m.env_por || m.por) !== sessao.uid || x.expo[k]) return;
  x.expo[k] = true;
  if (xpJogoGrava()) gravar({ [`xp_jogo/expo/${k}`]: true });
  ganharXPJogo(10, 'exposicao');
}
// fora da sala: ao saber que sou do grupo, confere uma vez os itens aprovados enquanto eu não estava lá
const expoConferida = new Set();
async function conferirAprovadosExpo(n) {
  if (expoConferida.has(n) || !souDaSala(n) || !carregouProgresso) return;
  expoConferida.add(n);
  try {
    const s = await get(ref(db, `${noExpo('exposicao_salas')}/${n}/itens`));
    for (const [id, v] of Object.entries(s.exists() ? s.val() || {} : {})) { const m = v && lerItemExpo(v); if (m) xpExpoAprovado(n, id, m); }
  } catch (e) { console.warn('[jogo-revisao] itens aprovados da Exposição', e?.code || e); }
}
// chegou do banco (ou mudou / saiu) um item
function itemExpoMudou(id, v) {
  if (!ex) return;
  const m = v ? lerItemExpo(v) : null;
  if (m) xpExpoAprovado(ex.n, id, m);
  if (ex.arr?.id === id && m) { const a = ex.itens.get(id); if (a) Object.assign(a, { ...m, x: a.x, y: a.y }); return; }   // arrastando: a posição é a minha até soltar
  if (m) ex.itens.set(id, m); else ex.itens.delete(id);
  const it = m && catExpo(m.mv);
  (it ? medirItemExpo(it) : Promise.resolve()).then(() => { if (ex) { desenharItemExpo(id); refazerGradeExpo(); if (ex.editando) { renderCatalogoExpo(); resumoAprovExpo(); } } });
  if (ex.ver) renderVisualizador();
}

// ── desenho ──
const mexendoOutro = (m) => m.mexendo && Date.now() - m.mexendo < 15000 && m.mexendo_por && m.mexendo_por !== sessao.uid;
function desenharItemExpo(id) {
  const m = ex.itens.get(id), at = $('cena-atores');
  let el = ex.els.get(id);
  if (!m) { el?.remove(); ex.els.delete(id); if (ex.sel === id) desselecionarExpo(); return; }
  const it = catExpo(m.mv), [w, h] = tamExpo(m);
  if (!el) { el = document.createElement('div'); el.dataset.ex = id; at.appendChild(el); ex.els.set(id, el); }
  el.className = `cs-movel ex-movel cs-${it.tipo}${ex.sel === id ? ' sel' : ''}${mexendoOutro(m) ? ' ex-mexendo' : ''}`;
  Object.assign(el.style, { left: m.x + 'px', top: m.y + 'px', width: w + 'px', height: h + 'px', zIndex: it.tipo === 'tapete' ? 1 : it.tipo === 'parede' ? 2 : Math.round(m.y) });
  const selo = it.conteudo === 'nome_sala' ? seloNomeExpo(ex.n) : seloExpo(m);
  const chave = JSON.stringify([m.vista, m.espelho, m.cor, fotosDoItem(m), m.foto, ex.editando, it.conteudo === 'nome_sala' ? nomeDaSala() : '', Math.round(w), visivelExpo(m), selo]);
  if (el.dataset.k === chave) return;
  el.dataset.k = chave;
  const src = srcExpo(m.mv, m.vista), comFoto = it.conteudo === 'foto' || it.conteudo === 'fotos4';
  el.innerHTML = `${comFoto ? `<div class="ex-fotos${m.espelho ? ' espelho' : ''}"></div>` : ''}<img class="ex-img${m.espelho ? ' espelho' : ''}" src="${src}" alt="" draggable="false" style="${filtroExpo(it, m.cor) ? `filter:${filtroExpo(it, m.cor)};` : ''}${comFoto ? 'visibility:hidden' : ''}"/>` +
    (it.conteudo === 'nome_sala' ? letreiroHtml(w, h) : '') + (selo ? `<span class="ex-selo" title="${selo === '⏳' ? 'Aguardando aprovação' : 'Recusado'}">${selo}</span>` : '');
  if (comFoto) montarFotosExpo(el, m, it, chave);
}
function letreiroHtml(w, h) {
  const nome = nomeDaSala(), L = EXPO.letreiro || {}, [cx, cy] = L.centro || [50, 50], larg = Number(L.largura) || 68;
  if (!nome) return ex.editando ? `<span class="ex-letreiro vazio" style="left:${cx}%;top:${cy}%;max-width:${larg}%;font-size:${(h * 0.16).toFixed(1)}px">✏️ nome da sala</span>` : '';
  const fs = Math.min(h * 0.34, (w * larg / 100) / Math.max(4, nome.length * 0.52));
  return `<span class="ex-letreiro" style="left:${cx}%;top:${cy}%;max-width:${larg}%;font-size:${fs.toFixed(1)}px">${esc(nome)}</span>`;
}
const redesenharLetreiros = () => { if (ex) for (const [id, m] of ex.itens) if (catExpo(m.mv)?.conteudo === 'nome_sala') desenharItemExpo(id); };
// as áreas verdes da moldura: a foto cobrindo cada uma (recortada pela máscara) e a moldura, sem o verde, por cima
// moldura sem foto, decorando: o papel creme com o convite (pequena demais: só o 📷)
const vazioFotoHtml = (aw, ah) => `<span style="font-size:${clamp(ah * 0.16, 7, 14).toFixed(1)}px">${aw >= 70 && ah >= 50 ? '📷 toque para pôr foto' : '📷'}</span>`;
async function montarFotosExpo(el, m, it, chave) {
  const [w, h] = tamExpo(m);
  const a = await analisarMoldura(srcExpo(m.mv, m.vista));
  if (el.dataset.k !== chave) return;
  const img = el.querySelector('.ex-img'), caixa = el.querySelector('.ex-fotos');
  img.src = a.frame; img.style.visibility = '';
  const ids = !visivelExpo(m) ? [] : it.conteudo === 'foto' ? [m.foto] : fotosLista(m);   // não aprovada (os de fora): papel creme, nada é baixado
  caixa.innerHTML = a.areas.map((ar, i) => {
    const id = ids[i] || null, mask = `url('${ar.mask}')`;
    return `<div class="ex-area" style="left:${ar.x * 100}%;top:${ar.y * 100}%;width:${ar.w * 100}%;height:${ar.h * 100}%;-webkit-mask-image:${mask};mask-image:${mask}">` +
      (id ? `<img class="ex-foto" data-foto="${esc(id)}" alt="" draggable="false"/>` : ex?.editando ? vazioFotoHtml(ar.w * w, ar.h * h) : '') + '</div>';
  }).join('');
  for (const f of caixa.querySelectorAll('img[data-foto]')) fotoExpo(f.dataset.foto).then(d => { if (d) f.src = d; else f.remove(); });
}
// a grade da sala sem a base dos móveis de chão (o personagem e o pet desviam)
let gradeExpoT = 0;
function refazerGradeExpo() {
  clearTimeout(gradeExpoT);
  gradeExpoT = setTimeout(() => {
    if (!ex || cena?.expoSala !== ex.n) return;
    const g = Uint8Array.from(ex.gradeBase);
    g.gw = ex.gradeBase.gw; g.gh = ex.gradeBase.gh;
    for (const m of ex.itens.values()) if (catExpo(m.mv)?.tipo === 'chao') { const [w, h] = tamExpo(m); zerarNaGrade(g, baseDeChao(m, w, h)); }
    cena.grade = g;
  }, 60);
}
// onde o chão começa e termina nesta altura (a trilha da sala, sem os móveis)
function larguraDoChao(y) {
  const g = ex.gradeBase, gw = gwDe(g), cy = clamp(Math.floor(y / CEL), 0, ghDe(g) - 1);
  let a = -1, b = -1;
  for (let cx = 0; cx < gw; cx++) if (g[cy * gw + cx]) { if (a < 0) a = cx; b = cx; }
  return a < 0 ? [0, larguraCena()] : [a * CEL, (b + 1) * CEL];
}
// parede: parede_fundo; chão e tapete: sala.chao (na largura do chão naquela altura)
function prenderExpo(m, x, y) {
  const it = catExpo(m.mv), [w, h] = tamExpo(m), S = EXPO.sala;
  if (it.tipo === 'parede') { prenderEmArea(m, x, y, 'parede', w, h, S.parede_fundo); return; }
  const ch = S.chao.y, yy = entreLim(y, ch[0] + (it.tipo === 'tapete' ? h * 0.55 : 6), ch[1]);
  prenderEmArea(m, x, yy, it.tipo, w, h, { x: larguraDoChao(yy), y: ch });
}

// ── editor ──
function entrarEdicaoExpo() {
  if (!ex || ex.editando || !podeDecorar(ex.n) || transicionando) return;
  ex.editando = true; ex.sel = null;
  jog.caminho = []; jog.aoChegar = null; destinoEspecial = null;
  esconderBalao();
  ex.camX = clamp(jog.x, 0, larguraCena());
  camFoco = { x: ex.camX, y: H / 2, ate: Infinity };
  $('tela-cena').classList.add('ex-editando');
  $('ex-faixa').hidden = false;
  renderCatalogoExpo();
  resumoAprovExpo();
  for (const id of ex.itens.keys()) desenharItemExpo(id);
}
function sairEdicaoExpo(calado = false) {
  if (!ex?.editando) return;
  ex.editando = false; ex.sel = null; ex.arr = ex.pan = null;
  camFoco = null;
  $('tela-cena').classList.remove('ex-editando');
  $('ex-faixa').hidden = $('ex-ferr').hidden = $('ex-resumo').hidden = true;
  for (const id of ex.itens.keys()) desenharItemExpo(id);
  if (!calado) tocar('vitoria');
}
// "⏳ 3 aguardando · ❌ 1 recusado" no alto do editor; tocar leva a câmera até o primeiro (o nome da sala: o letreiro)
function listaAprovExpo() {
  const l = [...ex.itens].filter(([, m]) => seloExpo(m)).sort((a, b) => a[1].x - b[1].x);
  const sn = seloNomeExpo(ex.n), let_ = sn && [...ex.itens].find(([, m]) => catExpo(m.mv)?.conteudo === 'nome_sala');
  return { pend: l.filter(([, m]) => m.status === 'pendente').length + (sn === '⏳' ? 1 : 0), rec: l.filter(([, m]) => m.status === 'recusado').length + (sn === '❌' ? 1 : 0),
    ids: [...(let_ ? [let_[0]] : []), ...l.map(([id]) => id)] };
}
function resumoAprovExpo() {
  const el = $('ex-resumo');
  if (!ex?.editando) { el.hidden = true; return; }
  const { pend, rec } = listaAprovExpo(), t = [pend ? `⏳ ${pend} aguardando` : '', rec ? `❌ ${rec} recusado${rec > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
  el.textContent = t; el.hidden = !t;
}
function irAoPrimeiroAprovExpo() {
  const id = ex?.editando && listaAprovExpo().ids[0], m = id && ex.itens.get(id);
  if (!m) return;
  const meia = $('cena-vp').clientWidth / 2 / cam.s, LW = larguraCena();
  ex.camX = clamp(m.x, Math.min(meia, LW / 2), Math.max(LW - meia, LW / 2));
  camFoco = { x: ex.camX, y: H / 2, ate: Infinity };
  selecionarExpo(id);
}
const qtdExpo = (mv) => [...ex.itens.values()].filter(m => m.mv === mv).length;
function renderCatalogoExpo() {
  $('ex-abas').innerHTML = (EXPO.abas || []).map(a => `<button data-ex-aba="${esc(a.id)}"${a.id === ex.cat ? ' class="ativa"' : ''}>${esc(a.nome)}</button>`).join('');
  $('ex-catalogo').innerHTML = EXPO.moveis.filter(it => it.cat === ex.cat).map(it => {
    const n = qtdExpo(it.id);   // sem limite por móvel (PROMPT-124): só quantos já estão na sala
    return `<button class="cs-guardado ex-cat" data-ex-mv="${esc(it.id)}" title="${esc(it.nome)}">
      <img src="${srcExpo(it.id, it.vistas[0])}" alt="" draggable="false" loading="lazy"/>${n ? `<b>${n}</b>` : ''}<span>${esc(it.nome)}</span></button>`;
  }).join('');
  $('ex-uso').textContent = `${ex.itens.size}/${limiteExpo('itens', 100)} itens · ${fotosNaSala()}/${limiteExpo('fotos', 12)} fotos`;
}
async function colocarItemExpo(mv) {
  const it = catExpo(mv);
  if (!ex?.editando || !it) return;
  if (ex.itens.size >= limiteExpo('itens', 100)) { avisoExpo(`Esta sala já tem o máximo de itens (${limiteExpo('itens', 100)}).`); return; }
  await medirItemExpo(it);
  if (!ex?.editando) return;
  // nasce no centro da parte visível da sala
  const vp = $('cena-vp'), cx = (vp.clientWidth / 2 - cam.tx) / cam.s, S = EXPO.sala;
  const m = { mv, x: cx, y: 0, vista: it.vistas[0], espelho: false, tam: 1, cor: 0, titulo: '', texto: '', foto: null, fotos: null, por: sessao.uid, ts: Date.now() };
  prenderExpo(m, cx, it.tipo === 'parede' ? (S.parede_fundo.y[0] + S.parede_fundo.y[1]) / 2 + tamExpo(m)[1] / 2 : (S.chao.y[0] + S.chao.y[1]) / 2);
  let id;
  try { id = push(refItens()).key; } catch (_) { semConexaoExpo(); return; }
  ex.itens.set(id, m);
  desenharItemExpo(id);
  selecionarExpo(id);
  refazerGradeExpo();
  renderCatalogoExpo();
  tocar('clique');
  salvarExpo(set(refItem(id), gravavelExpo(m)));
}
function selecionarExpo(id) {
  if (!ex) return;
  const antes = ex.sel;
  ex.sel = id; ex.conf = 0;
  if (antes && antes !== id) desenharItemExpo(antes);
  desenharItemExpo(id);
  abrirFerrExpo();
}
function desselecionarExpo() {
  if (!ex?.sel) return;
  const id = ex.sel;
  ex.sel = null;
  $('ex-ferr').hidden = true;
  if (ex.itens.has(id)) desenharItemExpo(id);
}
function abrirFerrExpo() {
  const m = ex?.itens.get(ex.sel), it = m && catExpo(m.mv), el = $('ex-ferr');
  if (!it) { el.hidden = true; return; }
  el.querySelector('[data-exf="cor"]').hidden = !nCoresExpo(it);
  el.querySelector('[data-exf="tam"]').hidden = it.tipo !== 'chao';   // parede e tapete não mudam de tamanho (não cobrem molduras e fotos)
  el.querySelector('[data-exf="conteudo"]').hidden = !it.conteudo;
  const apagar = el.querySelector('[data-exf="apagar"]');
  apagar.textContent = '🗑️'; apagar.classList.remove('confirmar');
  $('ex-cores').hidden = true;
  $('ex-tam').hidden = true;
  el.hidden = false;
  posicionarFerrExpo();
}
function posicionarFerrExpo() {
  const m = ex?.itens.get(ex.sel), el = $('ex-ferr');
  if (!m || el.hidden) return;
  posicionarNaTela(el, m.x, m.y - tamExpo(m)[1] - 6);
}
// mudou vista/espelho/cor/tamanho: redesenha e grava só esses campos (o status fica como está).
// conteudo = true (foto, título, texto): grava o item inteiro e ele volta a esperar a professora
function mudouItemExpo(id, conteudo = false) {
  const m = ex.itens.get(id);
  if (!m) return;
  m.por = sessao.uid; m.ts = Date.now();
  if (conteudo && precisaAprov(catExpo(m.mv))) {
    m.status = temAlgoExpo(m) ? 'pendente' : null; m.motivo = ''; m.rev_ts = 0;
    m.env_por = sessao.uid; m.env_ts = Date.now();
  }
  desenharItemExpo(id);
  refazerGradeExpo();
  posicionarFerrExpo();
  if (ex.editando) { renderCatalogoExpo(); resumoAprovExpo(); }   // o uso (itens e fotos) e o ⏳/❌
  if (ex.ver) renderVisualizador();
  if (conteudo) return salvarExpo(set(refItem(id), gravavelExpo(m)));
  return salvarExpo(update(refItem(id), { vista: m.vista, espelho: !!m.espelho, cor: m.cor || 0, tam: m.tam && m.tam !== 1 ? m.tam : null, x: Math.round(m.x), y: Math.round(m.y), por: m.por, ts: m.ts }));
}
// 🔄 girar: a próxima vista que existe; com uma vista só, espelha
function girarExpo() {
  const m = ex.itens.get(ex.sel), it = m && catExpo(m.mv);
  if (!it) return;
  if (it.vistas.length > 1) m.vista = it.vistas[(it.vistas.indexOf(m.vista) + 1) % it.vistas.length]; else m.espelho = !m.espelho;
  prenderExpo(m, m.x, m.y);
  regrudarExpo(ex.sel);
  mudouItemExpo(ex.sel);
  tocar('clique');
}
function espelharExpo() {
  const m = ex.itens.get(ex.sel);
  if (!m) return;
  m.espelho = !m.espelho;
  regrudarExpo(ex.sel);
  mudouItemExpo(ex.sel);
  tocar('clique');
}
// 🎨 as amostras: o próprio item com cada cor
function abrirCoresExpo() {
  const m = ex.itens.get(ex.sel), it = m && catExpo(m.mv), el = $('ex-cores');
  if (!nCoresExpo(it)) return;
  if (!el.hidden) { el.hidden = true; return; }
  // a ordem das amostras pode ser outra que a dos índices (pele: o 0 é o original, mas aparece no meio, do mais claro ao mais retinto)
  const cores = EXPO.cores[it.cor], ordem = EXPO.cores.ordem?.[it.cor]?.filter(i => i in cores) || cores.map((_, i) => i);
  el.innerHTML = ordem.map((i, n) => `<button class="ex-cor${m.cor === i ? ' sel' : ''}" data-ex-cor="${i}" aria-label="Cor ${n + 1}">` +
    `<img src="${srcExpo(m.mv, m.vista)}" alt="" draggable="false" style="${cores[i] ? `filter:${cores[i]}` : ''}"/></button>`).join('');
  el.hidden = false;
  posicionarFerrExpo();
}
// 📏 abre ➖ 100% ➕ (como o 🎨 abre as cores)
function abrirTamExpo() {
  const el = $('ex-tam');
  if (!el.hidden) { el.hidden = true; return; }
  pintarTamExpo();
  el.hidden = false;
  posicionarFerrExpo();
}
function pintarTamExpo() {
  const m = ex.itens.get(ex.sel), i = TAMS_EXPO.indexOf(m?.tam ?? 1);
  $('ex-tam-v').textContent = Math.round((m?.tam ?? 1) * 100) + '%';
  $('ex-tam').querySelector('[data-ex-tam="-1"]').disabled = i <= 0;
  $('ex-tam').querySelector('[data-ex-tam="1"]').disabled = i >= TAMS_EXPO.length - 1;
}
function tamanhoExpo(passo) {
  const m = ex.itens.get(ex.sel), it = m && catExpo(m.mv);
  if (it?.tipo !== 'chao') return;
  const i = clamp(TAMS_EXPO.indexOf(m.tam ?? 1) + passo, 0, TAMS_EXPO.length - 1);
  if (TAMS_EXPO[i] === m.tam) return;
  m.tam = TAMS_EXPO[i];
  prenderExpo(m, m.x, m.y);   // ampliado, não passa das paredes nem do chão
  regrudarExpo(ex.sel);
  pintarTamExpo();
  mudouItemExpo(ex.sel);      // como a vista e a cor: não volta a esperar aprovação
  tocar('clique');
}
function corExpo(i) {
  const m = ex.itens.get(ex.sel);
  if (!m) return;
  m.cor = clamp(i, 0, nCoresExpo(catExpo(m.mv)) - 1);
  for (const b of $('ex-cores').children) b.classList.toggle('sel', Number(b.dataset.exCor) === m.cor);
  mudouItemExpo(ex.sel);
  tocar('clique');
}
// 🗑️ com confirmação (o segundo toque apaga); as fotos do item saem do banco junto
function apagarExpo(btn) {
  if (!ex.sel) return;
  if (!btn.classList.contains('confirmar')) {
    btn.classList.add('confirmar'); btn.textContent = '🗑️ Apagar?';
    clearTimeout(ex.conf); ex.conf = setTimeout(() => { btn.classList.remove('confirmar'); btn.textContent = '🗑️'; }, 3000);
    return;
  }
  const id = ex.sel, m = ex.itens.get(id);
  desselecionarExpo();
  ex.itens.delete(id);
  desenharItemExpo(id);
  refazerGradeExpo();
  renderCatalogoExpo();
  tocar('clique');
  salvarExpo(Promise.all([remove(refItem(id)), ...fotosDoItem(m || {}).map(f => remove(refImagem(f)))]));
}

// arrastar um item (grava ao soltar; enquanto isso os outros veem o contorno)
function arrastarExpo(e, id) {
  e.preventDefault(); e.stopPropagation();
  const el = e.currentTarget, m = ex.itens.get(id);
  if (!m) return;
  try { el.setPointerCapture(e.pointerId); } catch (_) {}
  $('ex-ferr').hidden = true;
  const p0 = telaParaImagem(e.clientX, e.clientY);
  const g0 = grudeMaisPerto(id);
  ex.arr = { id, off: [m.x - p0.x, m.y - p0.y], ini: [e.clientX, e.clientY], cx: e.clientX, cy: e.clientY, moveu: false,
    grude: g0 && g0.d < 0.5 ? `${Math.round(g0.q[0])},${Math.round(g0.q[1])}` : null };
  const mover = (ev) => {
    const a = ex?.arr;
    if (!a || a.id !== id) return;
    a.cx = ev.clientX; a.cy = ev.clientY;
    if (!a.moveu && Math.hypot(ev.clientX - a.ini[0], ev.clientY - a.ini[1]) < 6) return;
    if (!a.moveu) { a.moveu = true; salvarExpo(update(refItem(id), { mexendo: Date.now(), mexendo_por: sessao.uid })); }
    seguirDedoExpo();
  };
  const soltar = () => {
    el.removeEventListener('pointermove', mover); el.removeEventListener('pointerup', soltar); el.removeEventListener('pointercancel', soltar);
    const a = ex?.arr;
    if (!a || a.id !== id) return;
    ex.arr = null;
    if (a.moveu) {
      const mm = ex.itens.get(id);
      if (mm) { mm.por = sessao.uid; mm.ts = Date.now(); salvarExpo(update(refItem(id), { x: Math.round(mm.x), y: Math.round(mm.y), por: sessao.uid, ts: mm.ts, mexendo: null, mexendo_por: null })); }
      refazerGradeExpo();
    }
    selecionarExpo(id);
  };
  el.addEventListener('pointermove', mover);
  el.addEventListener('pointerup', soltar);
  el.addEventListener('pointercancel', soltar);
}
function seguirDedoExpo() {
  const a = ex?.arr, m = a && ex.itens.get(a.id);
  if (!m || !a.moveu) return;
  const q = telaParaImagem(a.cx, a.cy);
  prenderExpo(m, q.x + a.off[0], q.y + a.off[1]);
  const g = regrudarExpo(a.id, a.grude);
  a.grude = g;
  desenharItemExpo(a.id);
}
// ── emendar os cordões (PROMPT-123) ──
// a base de cada poste na cena (catálogo "postes": fração da imagem por vista); [] para quem não tem postes
function postesExpo(m) {
  const p = catExpo(m.mv)?.postes?.[m.vista];
  if (!Array.isArray(p)) return [];
  const [w, h] = tamExpo(m);
  return p.map(([px, py]) => [m.x - w / 2 + w * (m.espelho ? 1 - px : px), m.y - h + h * py]);
}
// o par de postes mais perto (deste item com os dos outros), até 30 px da cena
function grudeMaisPerto(id) {
  const m = ex.itens.get(id), meus = m ? postesExpo(m) : [], lim = 30 * escalaExpo();
  let melhor = null;
  if (!meus.length) return null;
  for (const [oid, o] of ex.itens) {
    if (oid === id) continue;
    for (const q of postesExpo(o)) for (const p of meus) {
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (d < lim && (!melhor || d < melhor.d)) melhor = { d, dx: q[0] - p[0], dy: q[1] - p[1], q };
    }
  }
  return melhor;
}
// desloca o item para o poste coincidir; se prenderExpo o tirar do lugar, fica como ele deixou.
// devolve a chave do poste grudado (ou null); brilha e faz clique só quando gruda num poste novo
function regrudarExpo(id, antes = null) {
  const m = ex.itens.get(id), g = m && grudeMaisPerto(id);
  if (!g) return null;
  prenderExpo(m, m.x + g.dx, m.y + g.dy);
  if (!postesExpo(m).some(p => Math.hypot(p[0] - g.q[0], p[1] - g.q[1]) < 0.5)) return null;
  const chave = `${Math.round(g.q[0])},${Math.round(g.q[1])}`;
  if (chave !== antes) { tocar('clique'); brilhoGrudeExpo(g.q); }
  return chave;
}
function brilhoGrudeExpo([x, y]) {
  const b = document.createElement('div');
  b.className = 'ex-grude';
  Object.assign(b.style, { left: x + 'px', top: y + 'px' });
  $('cena-atores').appendChild(b);
  setTimeout(() => b.remove(), 650);
}
// a cada quadro na sala: perto da borda, arrastando, a câmera anda; o contorno de quem está mexendo some sozinho
function atualizarSalaExpo(dt) {
  if (!ex.editando) return;
  const vp = $('cena-vp'), vw = vp.clientWidth, LW = larguraCena(), meia = vw / 2 / cam.s;
  if (ex.arr?.moveu) {
    const x = pontoNoJogo(ex.arr.cx, ex.arr.cy).x - (girado() ? 0 : vp.getBoundingClientRect().left), borda = 70;
    const v = x < borda ? -1 : x > vw - borda ? 1 : 0;
    if (v) { ex.camX = clamp(ex.camX + v * 700 * dt, meia, LW - meia); camFoco = { x: ex.camX, y: H / 2, ate: Infinity }; seguirDedoExpo(); }
  }
  ex.camX = clamp(ex.camX, Math.min(meia, LW / 2), Math.max(LW - meia, LW / 2));
  posicionarFerrExpo();
}
function ligarEditorExpo() {
  $('btn-expo-decorar').addEventListener('click', (e) => { e.stopPropagation(); entrarEdicaoExpo(); });
  $('ex-pronto').addEventListener('click', (e) => { e.stopPropagation(); sairEdicaoExpo(); });
  $('ex-resumo').addEventListener('click', (e) => { e.stopPropagation(); irAoPrimeiroAprovExpo(); });
  $('ex-tema').addEventListener('click', (e) => { e.stopPropagation(); abrirTemasExpo(); });
  $('ex-abas').addEventListener('click', (e) => { const b = e.target.closest('[data-ex-aba]'); if (b && ex) { ex.cat = b.dataset.exAba; renderCatalogoExpo(); } });
  $('ex-catalogo').addEventListener('click', (e) => { const b = e.target.closest('[data-ex-mv]'); if (b) colocarItemExpo(b.dataset.exMv); });
  $('ex-catalogo').addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.currentTarget.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
  $('ex-ferr').addEventListener('click', (e) => {
    e.stopPropagation();
    const c = e.target.closest('[data-ex-cor]');
    if (c) { corExpo(Number(c.dataset.exCor)); return; }
    const t = e.target.closest('[data-ex-tam]');
    if (t) { tamanhoExpo(Number(t.dataset.exTam)); return; }
    const b = e.target.closest('[data-exf]');
    if (!b || !ex?.sel) return;
    if (b.dataset.exf !== 'cor') $('ex-cores').hidden = true;
    if (b.dataset.exf !== 'tam') $('ex-tam').hidden = true;
    if (b.dataset.exf !== 'apagar') { const ap = $('ex-ferr').querySelector('[data-exf="apagar"]'); ap.classList.remove('confirmar'); ap.textContent = '🗑️'; }
    ({ girar: girarExpo, espelhar: espelharExpo, cor: abrirCoresExpo, tam: abrirTamExpo, conteudo: () => abrirConteudoExpo(ex.sel), apagar: () => apagarExpo(b) })[b.dataset.exf]?.();
  });
  $('cena-atores').addEventListener('pointerdown', (e) => {
    if (!ex?.editando) return;
    const el = e.target.closest('.ex-movel');
    if (el?.dataset.ex) arrastarExpo({ preventDefault: () => e.preventDefault(), stopPropagation: () => e.stopPropagation(), currentTarget: el, pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY }, el.dataset.ex);
  });
  // decorando, fora dos itens: arrastar move a câmera; tocar tira a seleção
  $('cena-vp').addEventListener('pointerdown', (e) => {
    if (!ex?.editando || e.target.closest('.ex-movel, #ex-ferr, #ex-faixa')) return;
    ex.pan = { x0: pontoNoJogo(e.clientX, e.clientY).x, cam0: ex.camX, moveu: false };
  });
  addEventListener('pointermove', (e) => {
    const p = ex?.pan;
    if (!p) return;
    const dx = pontoNoJogo(e.clientX, e.clientY).x - p.x0;
    if (!p.moveu && Math.abs(dx) < 6) return;
    p.moveu = true;
    ex.camX = p.cam0 - dx / cam.s;
    camFoco = { x: ex.camX, y: H / 2, ate: Infinity };
  });
  addEventListener('pointerup', () => { const p = ex?.pan; if (!p) return; ex.pan = null; if (!p.moveu) desselecionarExpo(); });
  ligarConteudoExpo();
  $('ex-temas').addEventListener('click', (e) => {
    if (e.target === $('ex-temas') || e.target.closest('[data-fechar="ex-temas"]')) { $('ex-temas').hidden = true; return; }
    const b = e.target.closest('[data-ex-tema]');
    if (b) escolherTemaExpo(b.dataset.exTema);
  });
  $('ex-ver').addEventListener('click', (e) => {
    if (e.target === $('ex-ver') || e.target.closest('[data-fechar="ex-ver"]')) { $('ex-ver').hidden = true; if (ex) ex.ver = null; return; }
    const b = e.target.closest('[data-ver]');
    if (b) andarVisualizador(b.dataset.ver);
  });
}

// ── 🎨 tema da sala ──
function abrirTemasExpo() {
  if (!ex) return;
  const atual = temaExpo(estadoSala(ex.n).tema).id;
  $('ex-temas-lista').innerHTML = (EXPO.temas || []).map(t => `<button class="cs-comida-item cs-tema-item${t.id === atual ? ' atual' : ''}" data-ex-tema="${esc(t.id)}">
      <span><img src="${IMG}/${t.imagem}" alt="" draggable="false" loading="lazy"/></span><b>${esc(t.emoji || '🎨')} ${esc(t.nome)}</b><small>${t.id === atual ? '✔ Agora' : 'Toque para usar'}</small></button>`).join('');
  $('ex-temas').hidden = false;
}
function escolherTemaExpo(id) {
  $('ex-temas').hidden = true;
  if (!ex || !podeDecorar(ex.n) || !(EXPO.temas || []).some(t => t.id === id)) return;
  (expoSalas[ex.n] ||= {}).tema = id;
  aplicarEstadoSala(ex.n);
  tocar('clique');
  salvarExpo(set(ref(db, `${noExpo('exposicao_salas')}/${ex.n}/tema`), id));
}

// ⏳ / ❌ no alto do ✏️ e do visualizador (só o grupo, a professora e o modo teste chegam a ver)
const textoAprov = (selo, motivo) => (selo === '⏳' ? '⏳ Aguardando aprovação da professora' : selo === '❌' ? `❌ Recusado${motivo ? ': ' + motivo : ''}` : '');
const avisoAprovHtml = (selo, motivo) => (selo ? `<p class="ex-aprov ${selo === '⏳' ? 'pend' : 'rec'}">${esc(textoAprov(selo, motivo))}</p>` : '');

// ── ✏️ conteúdo: título e texto, fotos (moldura e varal) e o nome da sala (letreiro) ──
let contExpo = null;   // { id, slot }
function abrirConteudoExpo(id) {
  const m = ex?.itens.get(id), it = m && catExpo(m.mv);
  if (!it?.conteudo) return;
  contExpo = { id, slot: 0 };
  $('ex-cont-tit').textContent = `✏️ ${it.nome}`;
  $('ex-cont-msg').textContent = '';
  renderConteudoExpo();
  $('ex-cont').hidden = false;
}
function renderConteudoExpo() {
  const m = ex?.itens.get(contExpo?.id), it = m && catExpo(m.mv);
  if (!it) { $('ex-cont').hidden = true; return; }
  if (it.conteudo === 'nome_sala') {
    $('ex-cont-corpo').innerHTML = avisoAprovHtml(seloNomeExpo(ex.n), estadoSala(ex.n).nome_motivo) + `<label class="ex-campo">Nome da sala<input id="ex-c-nome" maxlength="30" value="${esc(nomeDaSala())}" placeholder="Ex.: Heróis da resistência"/></label>`;
    return;
  }
  const ids = it.conteudo === 'foto' ? [m.foto] : it.conteudo === 'fotos4' ? fotosLista(m) : [];
  const slots = ids.map((f, i) => `<div class="ex-slot" data-slot="${i}">${f ? `<img data-foto="${esc(f)}" alt=""/>` : '<span>sem foto</span>'}
      <div><button class="jr-btn" data-ex-foto="${i}">📷 ${f ? 'Trocar' : 'Escolher foto'}</button>${f ? `<button class="jr-btn jr-btn-sec" data-ex-tirar="${i}">✕</button>` : ''}</div></div>`).join('');
  $('ex-cont-corpo').innerHTML = avisoAprovHtml(seloExpo(m), m.motivo) + (slots ? `<div class="ex-slots${ids.length > 1 ? ' quatro' : ''}">${slots}</div>` : '') +
    `<label class="ex-campo">Título <small>(até 40)</small><input id="ex-c-titulo" maxlength="40" value="${esc(m.titulo)}"/></label>
     <label class="ex-campo">Texto <small>(até 400)</small><textarea id="ex-c-texto" maxlength="400" rows="4">${esc(m.texto)}</textarea></label>`;
  for (const f of $('ex-cont-corpo').querySelectorAll('img[data-foto]')) fotoExpo(f.dataset.foto).then(d => { if (d) f.src = d; });
}
async function salvarConteudoExpo() {
  const m = ex?.itens.get(contExpo?.id), it = m && catExpo(m.mv);
  if (!it) return;
  if (it.conteudo === 'nome_sala') {
    const nome = $('ex-c-nome').value.replace(/\s+/g, ' ').trim().slice(0, 30);
    if (temPalavraProibida(nome)) { $('ex-cont-msg').textContent = 'Revise o texto 🙂'; return; }
    // o nome novo espera a professora (nome_pendente); o aprovado continua valendo para os de fora. Apagar: na hora
    const o = (expoSalas[ex.n] ||= {}), aprovado = String(o.nome || '');
    const mud = !nome ? { nome: null, nome_pendente: null, nome_motivo: null } : nome === aprovado ? { nome_pendente: null, nome_motivo: null } : { nome_pendente: nome, nome_motivo: null };
    for (const [k, v] of Object.entries(mud)) { if (v === null) delete o[k]; else o[k] = v; }
    aplicarEstadoSala(ex.n);
    redesenharLetreiros();
    $('ex-cont').hidden = true;
    salvarExpo(update(ref(db, `${noExpo('exposicao_salas')}/${ex.n}`), mud));
    return;
  }
  const titulo = $('ex-c-titulo').value.replace(/\s+/g, ' ').trim().slice(0, 40), texto = $('ex-c-texto').value.trim().slice(0, 400);
  if (temPalavraProibida(titulo) || temPalavraProibida(texto)) { $('ex-cont-msg').textContent = 'Revise o texto 🙂'; return; }
  const mudou = m.titulo !== titulo || m.texto !== texto;
  m.titulo = titulo; m.texto = texto;
  $('ex-cont').hidden = true;
  tocar('clique');
  if (mudou) mudouItemExpo(contExpo.id, true);
}
// 📷 escolheu um arquivo: prepara (EXIF, 1000 px, WebP), grava a imagem, troca no item e apaga a antiga
async function enviarFotoExpo(file) {
  const c = contExpo, m = ex?.itens.get(c?.id), it = m && catExpo(m.mv);
  if (!it || !file) return;
  const velho = it.conteudo === 'foto' ? m.foto : fotosLista(m)[c.slot];
  if (!velho && fotosNaSala() >= limiteExpo('fotos', 12)) { $('ex-cont-msg').textContent = `Esta sala já tem o máximo de fotos (${limiteExpo('fotos', 12)}).`; return; }
  const msg = $('ex-cont-msg');
  msg.textContent = 'Enviando…';
  let foto;
  try { foto = await prepararFoto(file); } catch (e) { msg.textContent = 'Não deu para abrir essa imagem.'; return; }
  let novo;
  try { novo = push(ref(db, noExpo('exposicao_imagens'))).key; } catch (_) { msg.textContent = 'Sem conexão, as mudanças não foram salvas'; return; }
  const ok = await salvarExpo(set(refImagem(novo), { dados: foto.dados, sala: ex.n, por: sessao.uid, ts: Date.now() }));
  if (!ok || !ex || ex.itens.get(c.id) !== m) { msg.textContent = 'Sem conexão, as mudanças não foram salvas'; return; }
  fotosExpo.set(novo, Promise.resolve(foto.dados));
  if (it.conteudo === 'foto') m.foto = novo; else m.fotos = { ...(m.fotos || {}), [c.slot]: novo };
  await mudouItemExpo(c.id, true);
  if (velho) { fotosExpo.delete(velho); salvarExpo(remove(refImagem(velho))); }
  msg.textContent = `✔ Foto enviada (${Math.round(foto.bytes / 1024)} KB)`;
  renderConteudoExpo();
}
function tirarFotoExpo(slot) {
  const m = ex?.itens.get(contExpo?.id), it = m && catExpo(m.mv);
  if (!it) return;
  const velho = it.conteudo === 'foto' ? m.foto : fotosLista(m)[slot];
  if (!velho) return;
  if (it.conteudo === 'foto') m.foto = null; else { const f = { ...(m.fotos || {}) }; delete f[slot]; m.fotos = f; }
  mudouItemExpo(contExpo.id, true);
  fotosExpo.delete(velho);
  salvarExpo(remove(refImagem(velho)));
  renderConteudoExpo();
}
function ligarConteudoExpo() {
  $('ex-cont').addEventListener('click', (e) => {
    if (e.target === $('ex-cont') || e.target.closest('[data-fechar="ex-cont"]')) { $('ex-cont').hidden = true; return; }
    const f = e.target.closest('[data-ex-foto]'), t = e.target.closest('[data-ex-tirar]');
    if (f && contExpo) { contExpo.slot = Number(f.dataset.exFoto); $('ex-arquivo').value = ''; $('ex-arquivo').click(); }
    else if (t) tirarFotoExpo(Number(t.dataset.exTirar));
    else if (e.target.closest('#ex-cont-salvar')) salvarConteudoExpo();
  });
  $('ex-arquivo').addEventListener('change', (e) => { const f = e.target.files?.[0]; if (f) enviarFotoExpo(f); });
}

// ── visualizador (modo visita): foto grande, título, texto e "Sala n · turma" (nunca nomes de alunos) ──
// os de fora: só os aprovados (pendente e recusado não abrem e o ◀ ▶ pula)
const temConteudo = (m) => { const it = catExpo(m.mv); return !!it?.conteudo && it.conteudo !== 'nome_sala' && temAlgoExpo(m) && visivelExpo(m); };
const listaVisitaExpo = () => [...ex.itens].filter(([, m]) => temConteudo(m)).sort((a, b) => a[1].x - b[1].x).map(([id]) => id);
function itemExpoEm(p, todos = false) {
  let melhor = null, mz = -1;
  for (const [id, m] of ex.itens) {
    if (!todos && !temConteudo(m)) continue;
    const [w, h] = tamExpo(m), it = catExpo(m.mv), z = it.tipo === 'tapete' ? 1 : it.tipo === 'parede' ? 2 : m.y;
    if (Math.abs(p.x - m.x) <= w / 2 && p.y >= m.y - h && p.y <= m.y + 4 && z > mz) { mz = z; melhor = id; }
  }
  return melhor;
}
function abrirVisualizador(id) {
  if (!ex) return;
  ex.ver = { id, foto: 0 };
  renderVisualizador();
  $('ex-ver').hidden = false;
  tocar('clique');
}
function renderVisualizador() {
  const v = ex?.ver, m = v && ex.itens.get(v.id);
  if (!m || !temConteudo(m)) { $('ex-ver').hidden = true; if (ex) ex.ver = null; return; }
  const fotos = fotosDoItem(m), lista = listaVisitaExpo(), i = lista.indexOf(v.id), g = grupoSala(ex.n);
  v.foto = clamp(v.foto, 0, Math.max(0, fotos.length - 1));
  $('ex-ver-foto').innerHTML = fotos.length ? `<img data-foto="${esc(fotos[v.foto])}" alt=""/>` +
    (fotos.length > 1 ? `<button class="ex-ver-seta e" data-ver="foto-" aria-label="Foto anterior">◀</button><button class="ex-ver-seta d" data-ver="foto+" aria-label="Próxima foto">▶</button><small>${v.foto + 1}/${fotos.length}</small>` : '') : '';
  $('ex-ver-foto').hidden = !fotos.length;
  const im = $('ex-ver-foto').querySelector('img');
  if (im) fotoExpo(im.dataset.foto).then(d => { if (d && im.isConnected) im.src = d; });
  $('ex-ver-titulo').textContent = m.titulo || '';
  $('ex-ver-texto').textContent = m.texto || '';
  const st = $('ex-ver-status'), ta = textoAprov(seloExpo(m), m.motivo);
  st.textContent = ta; st.hidden = !ta; st.className = `ex-aprov ${m.status === 'recusado' ? 'rec' : 'pend'}`;
  $('ex-ver-rodape').textContent = `Sala ${ex.n}${g?.turma ? ' · ' + g.turma : ''}`;
  $('ex-ver-ant').disabled = i <= 0;
  $('ex-ver-prox').disabled = i < 0 || i >= lista.length - 1;
}
function andarVisualizador(o) {
  const v = ex?.ver;
  if (!v) return;
  if (o === 'foto-' || o === 'foto+') { const n = fotosDoItem(ex.itens.get(v.id) || {}).length; v.foto = (v.foto + (o === 'foto+' ? 1 : -1) + n) % n; renderVisualizador(); return; }
  const lista = listaVisitaExpo(), i = lista.indexOf(v.id) + (o === 'prox' ? 1 : -1);
  if (i >= 0 && i < lista.length) { v.id = lista[i]; v.foto = 0; renderVisualizador(); tocar('clique'); }
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
  $('btn-reacao').hidden = true;
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
    <p class="mq-nota">${taxaFliperama()} (até ${comMult(FLIPER.moedas_dia ?? 10)} por dia no fliperama)</p>`;
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
    reagirSeguidor('comemora', petTem('pulo_cambalhota') ? 'pulo_cambalhota' : 'feliz', 1800);
  }
}
const petTem = (anim) => !!(seguidor?.pet && quadrosDe(seguidor.forma, anim)?.length);
// "+3 🪙 a cada 20 acertos": o menor grupo de acertos que dá um número inteiro de moedas com o multiplicador
function taxaFliperama() {
  const por = FLIPER.acertos_por_moeda ?? 10, m = multMoedas();
  let k = 1;
  while (k < 10 && Math.abs(k * m - Math.round(k * m)) > 1e-9) k++;
  const n = Math.max(1, Math.round(k * m));
  return `+${n} 🪙 a cada ${k * por} acertos`;
}
// Fim de partida (postMessage do jogo): +1 moeda a cada 10 acertos somados no dia, até 10 por dia (× multiplicador, PROMPT-126)
function premioFliperama(d) {
  if (!jogoEmbed || !carregouProgresso) return;
  const hoje = diaLocal(), por = FLIPER.acertos_por_moeda ?? 10, lim = comMult(FLIPER.moedas_dia ?? 10);
  const fd = estado.fliperDia?.data === hoje ? { ...estado.fliperDia } : { data: hoje, acertos: 0, moedas: 0 };
  const acertosPartida = Math.max(0, Math.min(500, Math.round(Number(d.acertos) || 0)));
  fd.acertos = (Number(fd.acertos) || 0) + acertosPartida;
  missaoProgresso('fliperama', acertosPartida);
  const alvo = Math.min(lim, Math.floor(fd.acertos * multMoedas() / por + 1e-9)), ganho = alvo - (Number(fd.moedas) || 0);
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
      <p class="av-eu">${meu ? `Você ficou em ${meu.pos}º de ${todos.length} · ${meu.pontos} pts${premioDoPodio(meu.pos) ? ` · +${comMult(premioDoPodio(meu.pos))} 🪙` : ''}` : ''}</p>
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
  const n = comMult(premioDoPodio(meu.pos));
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
//  🏠 CASINHA DO PET (PROMPT-105) — quarto 1376 × 768 (dados/jogo/casinha.json): o aluno entra pela placa "🏠 Casinhas"
//  da Praça, com o pet. Móveis comprados na loja (aba 🛋️ Móveis) vão para os guardados; o modo 🛠️ Arrumar coloca, move,
//  gira e guarda. Escala de cada item = largura / largura natural da 1ª vista (vaso: fase 4); todas as vistas na mesma escala.
//  Ordem: tapete (z 1) · parede (z 2) · chão pela base (z = y). O pet anda pelo chão (grade sem a base dos móveis) e,
//  ao escolher dormir/descansar com cama no quarto, vai até ela e dorme em cima (à noite, mais vezes).
//  Estado do aluno: casinha = { guardados: { id: n }, moveis: [{ id, x, y, vista, espelho }], cama_gratis }.
//  Cópia pública (visitas, PROMPT-107): jogo_revisao_praca(_teste)/casinhas/{uid} = { moveis, pet, nome, turma, ts }.
//  ?casinha=cheia (modo teste): 1 de cada móvel nos guardados, sem gastar e sem gravar.
// ============================================================
let CASA = null;              // casinha.json
let cs = null;                // casinha aberta: { moveis, guardados, arrumando, sel, sono, petAlvo, petVel }
let casaSemGravar = false;    // ?casinha=cheia
const ehCasinha = () => cena?.n === 'casinha';
// 🏅 quadrinho de insígnia (PROMPT-106): id ins_{chave}; item de parede, só a vista f. PROMPT-117: comprado (preço do json),
// no máximo 1 por insígnia ganha; ao comprar, o aluno escolhe a insígnia. 🏆 Quadro dos Campeões: id `campeoes`, liberado
// com as 26 insígnias (casinha/campeoes), grade com todas elas
const ehQuadrinho = (id) => String(id).startsWith('ins_');
const ID_CAMPEOES = 'campeoes';
function itemCasa(id) {
  if (id === ID_CAMPEOES) {
    const q = CASA?.quadro_campeoes;
    return q ? { id, nome: q.nome || 'Quadro dos Campeões', emoji: q.emoji || '🏆', tipo: 'parede', largura: Number(q.largura) || 320, vistas: ['f'], limite: 1, campeoes: true } : null;
  }
  if (!ehQuadrinho(id)) return (CASA?.itens || []).find(i => i.id === id) || null;
  const q = CASA?.insignia_quadrinho, chave = id.slice(4), g = insDe(chave);   // na visita, as do dono
  if (!q || !g?.insignia) return null;
  const [n, G] = chave.replace('mapa', '').split('-');
  return { id, nome: D.questoes[n]?.ginasios?.[G]?.nome || chave, tipo: 'parede', largura: Number(q.largura) || 70, vistas: ['f'], quadrinho: chave };
}
// cor (PROMPT-118): {id}_{vista}_{cor}.webp; sem cor (o padrão) a imagem normal. Se a da cor não existir: onerror → a normal
const imgMovel = (id, vista, cor = '') => (ehQuadrinho(id) ? `${IMG}/casinha/${CASA.insignia_quadrinho.imagem}`
  : id === ID_CAMPEOES ? `${IMG}/casinha/${CASA.quadro_campeoes?.imagem || 'moveis/quadro_campeoes_f.webp'}` : `${IMG}/casinha/moveis/${id}_${vista}${cor ? '_' + cor : ''}.webp`);
const coresDe = (it) => (it?.cor && Array.isArray(CASA?.cores?.[it.cor]) ? CASA.cores[it.cor] : null);
const corValida = (it, cor) => (cor && coresDe(it)?.some(c => c.id === cor) ? cor : '');
// imagem de móvel com a volta para a normal se a da cor faltar
const imgComCor = (id, vista, cor, extra = '') => `<img src="${imgMovel(id, vista, cor)}"${cor ? ` onerror="if(!this.dataset.f){this.dataset.f=1;this.src='${imgMovel(id, vista)}'}"` : ''} alt="" draggable="false"${extra}/>`;
// guardados com cor: a chave é "id~cor" (ex.: sofa~azul), para o móvel voltar com a cor; sem cor, só "id"
const chaveGuardado = (id, cor) => (cor ? `${id}~${cor}` : id);
const daChave = (k) => { const [id, cor = ''] = String(k).split('~'); return { id, cor }; };
const insigniasGanhas = () => Array.from({ length: NUM_MAPAS }, (_, i) => ['A', 'B'].map(G => chaveGinasio(i + 1, G))).flat().filter(k => estado.ginasios[k]?.insignia);
const maxQuadrinhos = () => Number(CASA?.insignia_quadrinho?.max_na_parede) || 8;
const naParede = (moveis) => moveis.filter(m => ehQuadrinho(m.id)).length;
// as insígnias ganhas que ainda não estão em nenhum quadro (na parede ou guardado)
const insigniasSemQuadro = () => insigniasGanhas().filter(k => qtdCasa('ins_' + k) === 0);
// PROMPT-117: os quadrinhos automáticos saem (móveis, guardados e cópia pública), uma vez por aluno (casinha/quadros_v2)
function migrarQuadrosV2() {
  const c = estado?.casinha;
  if (!c || c.quadros_v2 || !carregouProgresso) return;
  c.moveis = c.moveis.filter(m => !ehQuadrinho(m.id));
  for (const id of Object.keys(c.guardados)) if (ehQuadrinho(id)) delete c.guardados[id];
  c.quadros_v2 = true;
  if (casaSemGravar) return;
  gravar({ 'casinha/quadros_v2': true, 'casinha/moveis': c.moveis.map(limparMovel), 'casinha/guardados': { ...c.guardados } });
  if (c.publicada) publicarCasinha();
}
// 🏆 com as 26 insígnias, o Quadro dos Campeões entra nos guardados (uma vez)
function verificarCampeoes() {
  const c = estado?.casinha;
  if (!CASA?.quadro_campeoes || !c || c.campeoes || casaSemGravar || insigniasGanhas().length < NUM_MAPAS * 2) return;
  c.campeoes = true;
  if (qtdCasa(ID_CAMPEOES) === 0) { c.guardados[ID_CAMPEOES] = 1; if (cs && !cs.visita) cs.guardados[ID_CAMPEOES] = 1; }
  gravar({ 'casinha/campeoes': true, [`casinha/guardados/${ID_CAMPEOES}`]: c.guardados[ID_CAMPEOES] || null });
  setTimeout(() => avisoPet('🏆 Você conquistou o Quadro dos Campeões! Pendure na sua casinha.', true), 1500);
}
const vistaBase = (it) => (it.fases ? String(it.fases) : it.vistas[0]);   // a escala vem da 1ª vista (no vaso, da fase 4)
const ALT_CASINHA = 150;      // altura do personagem no quarto (casinha.json → altura_personagem)
// PROMPT-114: na casinha o pet fica na frente de todos os móveis de chão (z = y da base, até 768), abaixo da noite (940),
// dos brilhos, dos balões e do HUD; o personagem continua ordenado pela base
const Z_PET_CASA = 800;
const tamImg = new Map();     // src → [largura, altura] naturais
const imgFalhou = new Set();  // imagens que não existem (o Quadro dos Campeões sem imagem: moldura em CSS)
function medirImg(src) {
  if (tamImg.has(src)) return Promise.resolve(tamImg.get(src));
  return new Promise(ok => {
    const im = new Image();
    im.onload = () => { const t = [im.naturalWidth || 100, im.naturalHeight || 100]; tamImg.set(src, t); ok(t); };
    im.onerror = () => { imgFalhou.add(src); ok([100, 100]); };
    im.src = src;
  });
}
const preCarregarMoveis = () => Promise.all([...(CASA?.itens || []).flatMap(it => it.vistas.map(v => medirImg(imgMovel(it.id, v)))),
  CASA?.insignia_quadrinho ? medirImg(imgMovel('ins_', 'f')) : null,
  CASA?.quadro_campeoes ? Promise.all([medirImg(imgMovel(ID_CAMPEOES, 'f')), medirImg(imgMovel('ins_', 'f'))]).then(([, t]) => {
    const src = imgMovel(ID_CAMPEOES, 'f');   // sem moldura_dourada_f.webp: a moldura de insígnia, dourada em CSS (mesmo tamanho)
    if (imgFalhou.has(src)) tamImg.set(src, t);
  }) : null]);
const campeoesSemImagem = () => imgFalhou.has(imgMovel(ID_CAMPEOES, 'f'));
const srcCampeoes = () => (campeoesSemImagem() ? imgMovel('ins_', 'f') : imgMovel(ID_CAMPEOES, 'f'));
// 🏆 a moldura dourada com o troféu (o quarto, o catálogo e a faixa do Arrumar)
const imgCampeoes = (extra = '') => `<img src="${srcCampeoes()}" alt="" draggable="false"${campeoesSemImagem() ? ' class="cs-camp-ouro"' : ''}${extra}/>`;
const miniCampeoes = () => `<span class="cs-mini-quadro">${imgCampeoes()}<b class="cs-mini-trofeu">🏆</b></span>`;
function lerCasinha(v) {
  const c = v && typeof v === 'object' ? v : {};
  const moveis = (Array.isArray(c.moveis) ? c.moveis : Object.values(c.moveis || {}))
    .filter(m => m && typeof m.id === 'string' && Number.isFinite(Number(m.x)) && Number.isFinite(Number(m.y)))
    .map(m => ({ id: m.id, x: Number(m.x), y: Number(m.y), vista: String(m.vista || ''), espelho: !!m.espelho, cor: typeof m.cor === 'string' ? m.cor : '' }));
  const guardados = {};
  for (const [id, n] of Object.entries(c.guardados || {})) if (Number(n) > 0) guardados[id] = Number(n);
  return { guardados, moveis, cama_gratis: !!c.cama_gratis, kit: !!c.kit, quadros: !!c.quadros, publicada: !!c.publicada,   // quadros: os 1ºs quadrinhos já foram pendurados
    quadros_v2: !!c.quadros_v2, campeoes: !!c.campeoes,   // PROMPT-117: sem quadrinhos automáticos · 🏆 Quadro dos Campeões liberado
    vaso: c.vaso && typeof c.vaso === 'object' ? { ...c.vaso } : null, brinquedo_dia: c.brinquedo_dia || null,
    coracoes_vistos: Number(c.coracoes_vistos) || 0,   // ❤️ quantos o dono já viu (PROMPT-107)
    cor: typeof c.cor === 'string' ? c.cor : null, convites: { ...(c.convites || {}) },   // 🏘️ vila (PROMPT-109): cor do telhado, convites enviados
    vizinhos_vistos: { ...(c.vizinhos_vistos || {}) }, mudou: Number(c.mudou) || 0,
    tema: typeof c.tema === 'string' ? c.tema : null, temas: { ...(c.temas || {}) } };   // 🎨 o tema aplicado e os comprados (PROMPT-112)   // 🌱 { fase, regas, ultimo_dia } · 🧸 dia do +1
}
const qtdCasa = (id) => Object.entries(estado.casinha?.guardados || {}).reduce((t, [k, n]) => t + (daChave(k).id === id ? Number(n) || 0 : 0), 0) +
  (estado.casinha?.moveis || []).filter(m => m.id === id).length;
// tamanho do móvel na vista dele (px lógicos)
function tamMovel(m) {
  const it = itemCasa(m.id);
  return tamPelaLargura(Number(it.largura) || 100, imgMovel(m.id, vistaBase(it)), imgMovel(m.id, m.vista));
}
// base retangular de um móvel de chão (o personagem e o pet desviam dela)
function baseMovel(m) {
  if (itemCasa(m.id)?.tipo !== 'chao') return null;
  const [w, h] = tamMovel(m);
  return baseDeChao(m, w, h);
}
// ── comum à Casinha e à Exposição (PROMPT-EXPOSICAO-2) ──
// tamanho pela largura do catálogo: a escala de pixels vem da vista base (todas as vistas de um item na mesma escala)
function tamPelaLargura(largura, srcBase, srcVista) {
  const [bw] = tamImg.get(srcBase) || [100], [vw, vh] = tamImg.get(srcVista) || [100, 100], k = largura / bw;
  return [vw * k, vh * k];
}
const baseDeChao = (m, w, h) => { const fundo = clamp(h * 0.3, 14, 70); return { x0: m.x - w * 0.42, x1: m.x + w * 0.42, y0: m.y - fundo, y1: m.y + 4 }; };
// tira da grade (qualquer largura) o retângulo b
function zerarNaGrade(g, b) {
  const gw = gwDe(g), gh = ghDe(g);
  for (let cy = Math.max(0, Math.floor(b.y0 / CEL)); cy < Math.min(gh, Math.ceil(b.y1 / CEL)); cy++)
    for (let cx = Math.max(0, Math.floor(b.x0 / CEL)); cx < Math.min(gw, Math.ceil(b.x1 / CEL)); cx++) g[cy * gw + cx] = 0;
}
// prende a base do móvel na área: parede { x, y } (a base embaixo, o móvel inteiro dentro) ou chão { x, y } (tapete: metade dentro)
const entreLim = (v, a, b) => (a > b ? (a + b) / 2 : clamp(v, a, b));
function prenderEmArea(m, x, y, tipo, w, h, A) {
  if (tipo === 'parede') { m.x = entreLim(x, A.x[0] + w / 2, A.x[1] - w / 2); m.y = entreLim(y, A.y[0] + h, A.y[1]); }
  else { m.x = entreLim(x, A.x[0] + w * 0.4, A.x[1] - w * 0.4); m.y = entreLim(y, A.y[0] + (tipo === 'tapete' ? h * 0.55 : 6), A.y[1]); }
}
const vistaValida = (it, v) => (it.vistas.includes(v) ? v : it.vistas[0]);

// visita (PROMPT-107): { uid, dados } — a cópia pública do colega; o quarto abre só para olhar, sem o meu pet
// volta (PROMPT-108): { n, x, y, dir } — entrou pelo 🏠 do HUD; a porta devolve para lá
async function abrirCasinha(visita = null, volta = null) {
  if (!CASA || !carregouProgresso) return;
  sairPesca(false);
  cena = null;
  esconderBalao();
  fecharCartaoColega();
  $('btn-revanche').hidden = true;
  $('cena-aviso').hidden = true;
  $('cena-atores').innerHTML = '';
  const turmaV = visita && nomeVisivel(visita.dados.turma || '');
  if (visita) $('cena-titulo').innerHTML = `🏠 Casinha de <b>${esc(nomeVisivel(visita.dados.nome) || 'colega')}</b>${turmaV ? ` (${esc(turmaV)})` : ''}`;
  else $('cena-titulo').textContent = '🏠 Minha casinha';
  $('btn-cena-voltar').textContent = volta?.n === 'vila' ? '⟵ Vila' : volta && volta.n !== 'praca' ? `⟵ Mapa ${volta.n}` : '⟵ Praça';
  $('btn-cena-voltar').hidden = false;
  $('tela-cena').classList.remove('jr-no-ginasio');
  mostrarTela('tela-cena');
  $('cena-palco').style.visibility = 'hidden';
  limparPessoas();
  sairDoMapaOnline();
  enviarOnline({ mapa: 'praca', local: 'casinha' });   // aqui dentro os colegas da praça não veem você
  await Promise.all([trocarFundo(imgTema(temaDoDono(visita))), preCarregarMoveis()]);   // 🎨 o tema de quem é a casinha (PROMPT-112)
  const c = estado.casinha ||= lerCasinha(null);
  let avisoKit = null;
  if (!visita && !c.kit && Array.isArray(CASA.kit_inicial)) {   // 🎁 kit inicial (PROMPT-108): conta no limite de cada item
    const primeira = !c.cama_gratis, ganhou = [];   // 1ª visita: já vem colocado; quem já tinha entrado: o que falta, nos guardados
    for (const k of CASA.kit_inicial) {
      const it = itemCasa(k.id);
      if (!it || qtdCasa(k.id) >= (Number(it.limite) || 1) || (!primeira && qtdCasa(k.id) > 0)) continue;
      if (primeira) c.moveis.push({ id: k.id, x: Number(k.x), y: Number(k.y), vista: vistaValida(it, String(k.vista || '')), espelho: !!k.espelho });
      else { c.guardados[k.id] = (Number(c.guardados[k.id]) || 0) + 1; ganhou.push(String(it.nome).toLowerCase()); }
    }
    c.kit = c.cama_gratis = true;
    avisoKit = primeira ? '🏠 Bem-vindo! Seu pet ganhou uma casinha mobiliada.'
      : ganhou.length ? `🎁 Presente: ${ganhou.length > 1 ? ganhou.slice(0, -1).join(', ') + ' e ' + ganhou.at(-1) : ganhou[0]}! Toque em 🛠️ Arrumar.` : null;
    if (!casaSemGravar) gravar({ 'casinha/kit': true, 'casinha/cama_gratis': true, 'casinha/moveis': c.moveis.map(limparMovel), 'casinha/guardados': { ...c.guardados } });
  }
  if (!visita) { migrarQuadrosV2(); verificarCampeoes(); }   // PROMPT-117
  const Q = CASA.quarto, [ex, ey] = Q.porta.entrada;
  cs = { visita, volta, moveis: [], guardados: visita ? {} : { ...c.guardados }, arrumando: false, sel: null, ida: null, petAlvo: null, petVel: 0, tSono: 0 };
  cs.moveis = (visita ? lerCasinha({ moveis: visita.dados.moveis }).moveis : c.moveis.map(m => ({ ...m }))).filter(m => itemCasa(m.id));
  for (const m of cs.moveis) { const it = itemCasa(m.id); m.vista = vistaValida(it, m.vista); m.cor = corValida(it, m.cor); }
  for (const m of cs.moveis) if (m.id === ID_CAMPEOES) prenderNaArea(m, m.x, m.y);   // PROMPT-119: ficou pequeno — dentro da parede
  // ?campeoes=1 (modo teste): o Quadro dos Campeões nos guardados, sem gravar
  if (!visita && teste && new URLSearchParams(location.search).get('campeoes') === '1' && !cs.moveis.some(m => m.id === ID_CAMPEOES)) cs.guardados[ID_CAMPEOES] = 1;
  cena = { tipo: 'mapa', n: 'casinha', salao: true, alturaPersonagem: Number(CASA.altura_personagem) || ALT_CASINHA, cfg: { entrada: [ex, ey], saidas: [] }, grade: null, portas: {}, naTrilha: null, saidas: [] };
  refazerGradeCasinha();
  desenharMoveis();
  destinoEspecial = null;
  alvoMapa = null;
  pertoSaidaGin = false;
  posicionarJogador(ex, ey, 'costas');
  if (!visita) cs.passeio = novoPasseio(ex, ey);   // 🐾 entra junto e depois passeia sozinho (PROMPT-110)
  soltouDesdeTroca = false;
  ajustarCamera();
  $('cena-palco').style.visibility = '';
  $('btn-reacao').hidden = true;
  atualizarBotaoPet();
  if (visita) {   // o visitante entra sem o pet dele; o pet do dono passeia pelo quarto
    $('pet').hidden = $('pet-sombra').hidden = true;
    pararFalaPet();
    criarPetDono(visita.dados.pet);
    lerCurtida();
  } else {
    if (seguidor) { seguidor.antesDaAcao = (nome) => (nome === 'dormir' || nome === 'descansar') && ehCasinha() && irDormirNaCama(); seguidor.zCasa = Z_PET_CASA; }
    if (c.publicada) publicarCasinha();   // a cópia pública fica em dia (pet, insígnias, peixes)
    pintarSeloCoracoes();
  }
  if (avisoKit) setTimeout(() => avisoPet(avisoKit, true), 600);
}
// sair: pela placa, volta à Praça; pelo 🏠 do HUD, volta ao mapa e à posição de onde veio
function sairDaCasinha() {
  const v = cs?.volta;
  transicao(() => (!v ? abrirPraca('casinha') : v.n === 'vila' ? abrirVila({ lado: v.lado, dono: v.dono, nome: v.nomeDono }) : v.n === 'praca' ? abrirPraca({ pos: v }) : abrirMapa(v.n, { pos: v })));
}
// ⬅ Voltar da vila: para onde estava antes do 🏠 (sem 🏠: a Praça, na frente da placa)
function sairDaVila(pelaPorta = false) {
  const v = pelaPorta ? null : vilaVolta;
  vilaVolta = null;
  transicao(() => (!v ? abrirPraca('casinha') : v.n === 'praca' ? abrirPraca({ pos: v }) : abrirMapa(v.n, { pos: v })));
}
function irParaCasa() {
  if (!CASA || !carregouProgresso || transicionando || perguntaAberta || sobreposicaoAberta() || !mapaComCasa()) return;
  const volta = { n: cena.n, x: jog.x, y: jog.y, dir: jog.dir };
  if (VILA) { vilaVolta = volta; transicao(() => abrirVila({ casa: true })); }   // 🏘️ na frente da minha porta (PROMPT-109)
  else transicao(() => abrirCasinha(null, volta));
}
const mapaComCasa = () => cena?.tipo === 'mapa' && (Number(cena.n) > 0 || cena.n === 'praca');   // mapas 1–13 e Praça
const limparMovel = (m) => ({ id: m.id, x: Math.round(m.x), y: Math.round(m.y), vista: m.vista, espelho: !!m.espelho, ...(m.cor ? { cor: m.cor } : {}) });   // 🎨 vai também na cópia pública
// saiu da casinha (outra cena): o pet volta ao normal
function fecharCasinha() {
  if (!cs) return;
  const v = cs.visita;
  if (v?.petDono) { v.petDono.seg.descartar(); v.petDono.img.remove(); v.petDono.sombra.remove(); }
  tirarComidaPote();
  cs = null;
  if (seguidor) { seguidor.zFixo = seguidor.zCasa = null; seguidor.antesDaAcao = null; }
  if (v) $('pet').hidden = $('pet-sombra').hidden = !seguidor?.pet;   // o meu pet volta
  fecharFerrCasa();
  $('cs-cama-balao').hidden = true;
  $('cs-faixa').hidden = true;
  $('cs-curtir').hidden = $('cs-selo').hidden = true;
  $('tela-cena').classList.remove('cs-arrumando');
}

// Grade do quarto: o chão e o corredor da porta, menos a base de cada móvel de chão
function refazerGradeCasinha() {
  const Q = CASA.quarto, ch = Q.chao, pt = Q.porta;
  const g = gradeDeRetangulos([{ x0: ch.x[0], x1: ch.x[1], y0: ch.y[0], y1: ch.y[1] }, { x0: pt.x[0] + 14, x1: pt.x[1] - 14, y0: ch.y[1] - 4, y1: H - 2 }]);
  for (const m of cs.moveis) { const b = baseMovel(m); if (b) zerarNaGrade(g, b); }
  const naTrilha = (x, y) => centroCelula(celulaMaisProxima(g, x, y));
  const sx = Q.porta.entrada[0], sy = H - 8;
  Object.assign(cena, { grade: g, naTrilha, saidas: [{ x: sx, y: sy, trilha: naTrilha(sx, sy) }] });
  cena.cfg.saidas = [[sx, sy]];
}

function desenharMoveis() {
  const atores = $('cena-atores');
  for (const el of atores.querySelectorAll('.cs-movel, .cs-brilho, .cs-noite')) el.remove();
  let html = '<div class="cs-noite" aria-hidden="true"></div>';
  const tema = temaDoDono(cs.visita);
  if (tema.janela_noite) html += `<i class="cs-brilho cs-janela cs-janela-${esc(tema.id)}" aria-hidden="true"></i>`;   // 🌙 Dark: lua · Espacial: planeta
  cs.moveis.forEach((m, i) => {
    if (m.id === 'vaso') m.vista = String(faseVaso());   // 🌱 a fase de agora (PROMPT-106)
    const it = itemCasa(m.id), [w, h] = tamMovel(m);
    const z = it.tipo === 'tapete' ? 1 : it.tipo === 'parede' ? 2 : Math.round(m.y);
    html += `<div class="cs-movel cs-${esc(it.tipo)} cs-id-${esc(m.id)}${cs.sel === m ? ' sel' : ''}${it.campeoes && todasDouradas() ? ' cs-camp-brilho' : ''}" data-i="${i}" style="left:${m.x}px;top:${m.y}px;width:${w}px;height:${h}px;z-index:${z}">` +
      (it.campeoes ? imgCampeoes() : imgComCor(m.id, m.vista, m.cor, `${m.espelho ? ' class="espelho"' : ''} data-want="${imgMovel(m.id, m.vista, m.cor)}"`)) + `${extraMovel(m, it, w, h)}</div>`;
    // 🌙 à noite: abajur e varal de luzes acendem (brilho em CSS, acima da camada escura)
    if (m.id === 'abajur') html += `<i class="cs-brilho cs-brilho-abajur" style="left:${m.x}px;top:${m.y - h * 0.86}px;width:${w * 3.2}px;height:${w * 3.2}px"></i>`;
    if (m.id === 'luzes') html += `<i class="cs-brilho cs-brilho-luzes" style="left:${m.x}px;top:${m.y - h * 0.55}px;width:${w * 1.15}px;height:${h * 1.3}px"></i>`;
  });
  atores.insertAdjacentHTML('beforeend', html);
  // 🖼️ quadro do pet: a imagem do Meu Pet, com a tinta (na visita, o pet do dono); em expedição continua, com o selo 🧭 (PROMPT-119)
  const dp = cs.visita?.dados.pet, pet = cs.visita ? (petsOk && dp && petValido(petAtual(dp.pet)) ? petAtual(dp.pet) : null) : petsOk && estado.pets?.ativo;
  for (const img of atores.querySelectorAll('img[data-foto]')) {
    if (!pet) { img.remove(); continue; }
    if (fotoFora()) img.insertAdjacentHTML('afterend', '<span class="cs-foto-selo" title="Em expedição">🧭</span>');
    if (cs.visita) { img.src = srcIcone(formaValida(pet, dp.forma)); aplicarTinta(img, dp.tinta || null); continue; }
    img.src = srcIcone(formaDe(pet));
    aplicarVisualPet(img, pet);
  }
}
// o pet da casinha está em expedição? (na visita: a cópia pública do dono, pet.fora_ate)
const fotoFora = () => (cs?.visita ? Number(cs.visita.dados.pet?.fora_ate) > Date.now() : petFora());
const nomeFotoPet = () => (cs?.visita ? cs.visita.dados.pet?.nome || NOME_PET[petAtual(cs.visita.dados.pet?.pet)] || 'O pet' : nomePet(estado.pets.ativo));
const imgInsigniaQuadro = (chave) => {
  const q = CASA.insignia_quadrinho.insignia || {}, [cx, cy] = q.centro || [50, 50];
  return `<img class="cs-ins${insDe(chave)?.dourada ? ' dourada' : ''}" src="${IMG}/insignias/insignia-${chave}.webp" alt="" draggable="false" style="left:${cx}%;top:${cy}%;width:${q.tamanho || 62}%"/>`;
};
// o que vai dentro do móvel: a insígnia do quadrinho, a foto do pet no quadro, os peixes no aquário (PROMPT-106)
// as 26 insígnias, na ordem dos mapas (1-A, 1-B, 2-A…)
const todasChaves = () => Array.from({ length: NUM_MAPAS }, (_, i) => ['A', 'B'].map(G => chaveGinasio(i + 1, G))).flat();
const todasDouradas = () => todasChaves().every(k => insDe(k)?.dourada);   // na visita, as do dono
// 🏆 Quadro dos Campeões (PROMPT-119): um 🏆 grande no círculo (trofeu.centro, tamanho em % da largura) e a faixinha "26/26"
function trofeuCampeoes(w, h) {
  const t = CASA.quadro_campeoes.trofeu || {}, [cx, cy] = t.centro || [50, 46], tam = w * (Number(t.tamanho) || 52) / 100;
  const yFaixa = cy + (tam * 0.55) / h * 100;
  return `<span class="cs-camp-trofeu" style="left:${cx}%;top:${cy}%;font-size:${(tam * 0.92).toFixed(1)}px">🏆</span>` +
    `<span class="cs-camp-faixa" style="left:${cx}%;top:${Math.min(92, yFaixa).toFixed(1)}%;font-size:${Math.max(7, w * 0.12).toFixed(1)}px">${esc(t.faixa || '26/26')}</span>`;
}
function extraMovel(m, it, w = 80, h = 80) {
  if (it.campeoes) return trofeuCampeoes(w, h);
  if (it.quadrinho) return imgInsigniaQuadro(it.quadrinho);
  if (m.id === 'quadro_foto' && Array.isArray(it.foto)) {
    const [x0, y0, x1, y1] = it.foto;
    return `<img class="cs-foto" data-foto alt="" draggable="false" style="left:${x0}%;top:${y0}%;width:${x1 - x0}%;height:${y1 - y0}%"/>`;
  }
  if (m.id === 'aquario') return aguaHtml(m.vista, m.espelho, 'cs-agua');
  return '';
}
function posicionarMovel(m) {
  const el = $('cena-atores').querySelector(`.cs-movel[data-i="${cs.moveis.indexOf(m)}"]`);
  if (!el) return;
  const it = itemCasa(m.id), [w, h] = tamMovel(m);
  Object.assign(el.style, { left: m.x + 'px', top: m.y + 'px', width: w + 'px', height: h + 'px', zIndex: it.tipo === 'chao' ? Math.round(m.y) : el.style.zIndex });
  const img = el.firstChild, quer = imgMovel(m.id, m.vista, m.cor);
  if (img.tagName === 'IMG' && img.dataset.want !== quer) {   // vista ou cor nova (a cor que faltar volta para a normal)
    img.dataset.want = quer; img.dataset.f = '';
    img.onerror = m.cor ? () => { if (!img.dataset.f) { img.dataset.f = '1'; img.src = imgMovel(m.id, m.vista); } } : null;
    img.src = quer;
  }
  img.classList.toggle('espelho', !!m.espelho);
}

// ── 🐾 O pet vai até um móvel (cama: dorme; estante, pote, caixa: PROMPT-106) e depois volta para perto do personagem ──
const noiteAgora = () => fasesDoDia(minutoDoDia()).noite >= 0.5;
const petNaCasa = () => !!seguidor?.pet && !$('pet').hidden && !petFora();
// ida = { fase: 'indo' | 'fazendo', alvo: [x, y], m (móvel), aoChegar, ms (quanto fica), limite, ate }
function petIrPara(m, alvo, aoChegar, ms = 3500, pote = false) {
  if (!cs || cs.arrumando || !petNaCasa()) return false;
  if (cs.ida) soltarPet();
  const g = cena.grade, ini = celulaMaisProxima(g, seguidor.x, seguidor.y), fim = pote ? celulaMaisProxima(g, alvo[0], alvo[1]) : celulaMaisProxima(g, m.x, m.y + 8);   // pote: direto para o lado dele
  const cells = ini >= 0 && fim >= 0 ? aEstrela(g, ini, fim) : null;
  if (!cells) return false;
  seguidor.pararAcao();
  seguidor.reacao = null;
  seguidor.rastro = [...suavizar(g, [[seguidor.x, seguidor.y], ...cells.map(centroCelula)]).slice(1), alvo];
  cs.petAlvo = alvo; cs.petVel = VEL * 0.6;
  cs.ida = { fase: 'indo', alvo, m, aoChegar, ms, pote, limite: performance.now() + 15000 };
  if (pote) seguidor.fome = false;   // 🥣 a fome não interrompe comer nem a recusa
  return true;
}
// na frente do móvel (a base dele é bloqueada: o ponto andável mais perto, um pouco abaixo)
const frenteDe = (m) => cena.naTrilha(m.x, m.y + 14);
// onde o pet deita: centralizado na almofada, com a base um pouco acima da base da cama (a borda da frente aparece)
const topoCama = (cama) => [cama.x, cama.y - tamMovel(cama)[1] * TOPO_CAMA];
const TOPO_CAMA = 0.4;   // fração da altura da cama (medido no print: o pet fica na almofada)
function deitarNaCama(cama, ms) {
  pararFalaPet();   // dormindo não fala
  seguidor.zFixo = Math.round(cama.y) + 1;   // deitado por cima da cama
  seguidor.reagir(temAnim(seguidor.forma, 'dormindo') ? 'dormindo' : 'sentado_girando', ms);
}
function irDormirNaCama() {   // sozinho, de vez em quando (ou quando escolhe dormir/descansar)
  const cama = cs?.moveis.find(m => m.id === 'cama');
  if (!cama || cs.ida) return false;
  const ms = noiteAgora() ? 50000 : 25000;
  return petIrPara(cama, topoCama(cama), () => deitarNaCama(cama, ms), ms);
}
// 💤 Pôr para dormir / ☀️ Acordar (PROMPT-108): balão com um botão em cima da cama (ou do pet dormindo)
function balaoCama(cama) {
  fecharBalaoCama();
  const el = $('cs-cama-balao'), dorme = !!cs.ida?.fixo;
  el.innerHTML = `<button class="jr-btn jr-btn-ouro" data-cama="${dorme ? 'acordar' : 'dormir'}">${dorme ? '☀️ Acordar' : '💤 Pôr para dormir'}</button>`;
  el.hidden = false;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  cs.balaoCama = { cama, timer: setTimeout(fecharBalaoCama, 6000) };
  posicionarBalaoCama();
}
function posicionarBalaoCama() {
  const b = cs?.balaoCama;
  if (b && !$('cs-cama-balao').hidden) posicionarNaTela($('cs-cama-balao'), b.cama.x, b.cama.y - tamMovel(b.cama)[1] - 6);
}
function fecharBalaoCama() {
  if (cs?.balaoCama) { clearTimeout(cs.balaoCama.timer); cs.balaoCama = null; }
  $('cs-cama-balao').hidden = true;
}
function porParaDormir(cama) {
  if (!petNaCasa()) { avisoPet(petFora() ? 'Seu pet está em expedição. 🧭' : 'Seu pet não está aqui agora.'); return; }
  if (cs.ida?.fixo) return;
  // dorme até alguém acordar (não sai para passear)
  if (petIrPara(cama, topoCama(cama), () => { deitarNaCama(cama, Infinity); mostrarZzz(); }, Infinity)) cs.ida.fixo = true;
}
function mostrarZzz() {
  cs.zzz?.remove();
  const el = cs.zzz = document.createElement('div');
  el.className = 'cs-zzz';
  el.innerHTML = '<i>z</i><i>z</i><i>Z</i>';
  Object.assign(el.style, { left: seguidor.x + seguidor.altura * 0.25 + 'px', top: seguidor.y - seguidor.altura * 0.55 + 'px', zIndex: 2000, fontSize: Math.max(14, seguidor.altura * 0.22) + 'px' });
  $('cena-atores').appendChild(el);
}
function acordarNaCasinha() {
  const s = cs?.ida;
  if (!s?.fixo) return;
  s.fixo = false;
  cs.zzz?.remove(); cs.zzz = null;
  seguidor.reacao = null;
  reagirSeguidor('carinho', 'feliz');   // espreguiça e depois desce da cama
  s.ate = performance.now() + 1600;
}
function soltarPet() {
  const s = cs?.ida;
  if (!s) return;
  cs.ida = null; cs.petAlvo = null; cs.tSono = 0;
  cs.zzz?.remove(); cs.zzz = null;
  tirarComidaPote();
  seguidor.zFixo = null;
  seguidor.reacao = null;
  // desce do móvel pela frente e volta a passear sozinho (PROMPT-110)
  const g = cena.grade, i = celulaMaisProxima(g, s.m.x, s.m.y + 8), fr = i >= 0 ? centroCelula(i) : [seguidor.x, seguidor.y];
  seguidor.rastro = [fr];
  seguidor.alcancando = false;
  if (cs.passeio) Object.assign(cs.passeio, { lider: fr, caminho: [], fazer: null, espera: 2 + Math.random() * 2 });
  if (s.pote) atualizarFomeSeguidor();
}
// a cada quadro na casinha: de vez em quando (pet parado) vai dormir na cama; no fim de cada coisa, volta
function atualizarCasinha(dt) {
  if (!cs) return;
  if (cs.visita) { andarPetDono(dt); return; }   // 🏠 visita: o pet do dono passeia
  if (cs.sel && cs.arrumando) posicionarFerrCasa();
  posicionarBalaoCama();
  if (cs.arrumando || !seguidor?.pet || $('pet').hidden) return;
  const s = cs.ida;
  if (!s) {
    passearPet(dt);
    if (seguidor.paradoMs > 5000 && !seguidor.acao && !seguidor.reacao && !sobreposicaoAberta()) {
      if ((cs.tSono += dt) > 4) { cs.tSono = 0; if (Math.random() < (noiteAgora() ? 0.5 : 0.25)) irDormirNaCama(); }   // à noite, o dobro
    } else cs.tSono = 0;
    return;
  }
  const agora = performance.now();
  if (s.fase === 'indo') {
    if (dist(seguidor.x, seguidor.y, s.alvo[0], s.alvo[1]) < 2) {
      [seguidor.x, seguidor.y] = s.alvo; seguidor.rastro = [];   // encaixa no ponto: o último passinho cortaria a sequência que vem
      s.fase = 'fazendo'; s.ate = agora + s.ms; s.aoChegar?.();
    }
    else if (agora > s.limite) soltarPet();
  } else if (agora > s.ate) soltarPet();
}

// ── 🐾 Passeio sozinho pelo quarto (PROMPT-110; na visita, o pet do dono) ──
// Um "líder" invisível anda pela grade (desviando dos móveis) e o pet o segue. Parado 4 a 8 s, escolhe outro destino: um ponto
// livre do chão ou, às vezes, um móvel (deita no tapete, olha o aquário, fica perto da cama). Parado, o pet faz as ações dele
// (sentar, descansar, cheirar); à noite, a cama vem de atualizarCasinha. O meu: perto da porta, vai até o personagem e sai junto.
// p = { lider: [x, y], caminho, espera (s), vel, cama (o do dono indo dormir), fazer ({ m, o }: ao alcançar o líder), seguir }
const novoPasseio = (x, y) => ({ lider: [x, y], caminho: [], espera: 1.5 + Math.random() * 2, vel: VEL * 0.45, cama: null, fazer: null, seguir: false });
function destinoMovel() {
  const ops = cs.moveis.filter(m => m.id === 'tapete' || m.id === 'aquario' || m.id === 'cama');
  const m = ops[Math.floor(Math.random() * ops.length)];
  if (!m) return null;
  if (m.id === 'tapete') return { m, o: 'deitar', alvo: [m.x, m.y - tamMovel(m)[1] * 0.5] };   // o meio do tapete (dá para pisar)
  return { m, o: m.id === 'aquario' ? 'olhar' : 'sentar', alvo: frenteDe(m) };
}
// o caminho do líder até o próximo destino (de = de onde sai; chanceCama: o pet do dono às vezes vai dormir)
function rotaPasseio(p, de, chanceCama = 0) {
  const g = cena.grade, ch = CASA.quarto.chao;
  const cama = chanceCama && Math.random() < chanceCama ? cs.moveis.find(m => m.id === 'cama') : null;
  const mov = !cama && Math.random() < 0.35 ? destinoMovel() : null;
  const [tx, ty] = cama ? [cama.x, cama.y + 8] : mov ? mov.alvo : [ch.x[0] + Math.random() * (ch.x[1] - ch.x[0]), ch.y[0] + 40 + Math.random() * (ch.y[1] - ch.y[0] - 40)];
  const ini = celulaMaisProxima(g, de[0], de[1]), fim = celulaMaisProxima(g, tx, ty);
  const cells = ini >= 0 && fim >= 0 ? aEstrela(g, ini, fim) : null;
  if (!cells) { p.espera = 2; return; }
  p.caminho = suavizar(g, cells.map(centroCelula));
  if (cama) { p.caminho.push(topoCama(cama)); p.cama = cama; }
  p.fazer = mov;
}
// anda o líder pelo caminho; true = chegou agora
function andarLider(p, dt) {
  if (!p.caminho.length) return false;
  let anda = p.vel * dt;
  while (anda > 0 && p.caminho.length) {
    const [qx, qy] = p.caminho[0], dd = dist(p.lider[0], p.lider[1], qx, qy);
    if (dd <= anda) { p.lider = [qx, qy]; anda -= dd; p.caminho.shift(); }
    else { p.lider = [p.lider[0] + (qx - p.lider[0]) / dd * anda, p.lider[1] + (qy - p.lider[1]) / dd * anda]; anda = 0; }
  }
  return !p.caminho.length;
}
// chegou no móvel: deita no tapete, olha o aquário (de costas), senta perto da cama
function fazerNoMovel(seg, forma, { m, o }) {
  seg.esquerda = m.x < seg.x;
  if (o === 'deitar') { if (!seg.comemorar('descansar')) seg.reagir(temAnim(forma, 'dormindo') ? 'dormindo' : 'sentado_girando', 6000); }
  else if (o === 'olhar') seg.reagir(temAnim(forma, 'costas_parado') ? 'costas_parado' : 'sentado_girando', 6000);
  else if (!seg.comemorar('cheirar')) seg.reagir(temAnim(forma, 'sentado_2') ? 'sentado_2' : 'sentado_girando', 4000);
}
// um passo do passeio (seg = o pet); true = o líder acabou de chegar ao destino
function passoPasseio(p, seg, forma, dt) {
  if (p.caminho.length) {
    if (!andarLider(p, dt)) return false;
    p.espera = p.fazer ? 7 + Math.random() * 3 : 4 + Math.random() * 4;
    return true;
  }
  if (p.fazer && dist(seg.x, seg.y, p.lider[0], p.lider[1]) < 4) { fazerNoMovel(seg, forma, p.fazer); p.fazer = null; }
  if (!seg.acao) p.espera -= dt;   // fazendo uma ação (descansar, cheirar…): espera acabar
  return false;
}
function passearPet(dt) {
  const p = cs.passeio;
  if (!p) return;
  // saindo: perto da porta, o pet vai até o personagem (pelo chão) e sai junto
  const Q = CASA.quarto, naPorta = jog.y > Q.chao.y[1] - 90 && jog.x > Q.porta.x[0] - 80 && jog.x < Q.porta.x[1] + 80;
  if (naPorta !== p.seguir) {
    p.seguir = naPorta;
    if (naPorta) {
      const g = cena.grade, ini = celulaMaisProxima(g, seguidor.x, seguidor.y), fim = celulaMaisProxima(g, jog.x, jog.y);
      const cells = ini >= 0 && fim >= 0 ? aEstrela(g, ini, fim) : null;
      seguidor.reacao = null;
      seguidor.rastro = cells ? suavizar(g, cells.map(centroCelula)) : [[jog.x, jog.y]];
    } else Object.assign(p, { lider: [seguidor.x, seguidor.y], caminho: [], fazer: null, espera: 1 + Math.random() * 2 });
  }
  if (p.seguir) return;
  passoPasseio(p, seguidor, seguidor.forma, dt);
  if (p.espera <= 0 && !p.caminho.length) rotaPasseio(p, p.lider);
}

// ── Tocar nos móveis (fora do Arrumar): quadrinho, aquário, Álbum, vaso, estante, pote e caixa (PROMPT-106) ──
const MOVEIS_ATIVOS = new Set(['cama', 'aquario', 'vaso', 'estante_album', 'estante_livros', 'pote', 'caixa_brinquedos', 'guarda_roupa']);   // guarda-roupa: trocar de personagem (PROMPT-130)
function movelEm(p) {
  if (!cs) return null;
  const z = (m) => (itemCasa(m.id).tipo === 'parede' ? 2 : m.y);
  for (const m of [...cs.moveis].sort((a, b) => z(b) - z(a))) {
    if (!ehQuadrinho(m.id) && m.id !== ID_CAMPEOES && !MOVEIS_ATIVOS.has(m.id) && !(m.id === 'quadro_foto' && fotoFora())) continue;
    const [w, h] = tamMovel(m);
    if (Math.abs(p.x - m.x) < w / 2 && p.y > m.y - h && p.y < m.y + 6) return m;
  }
  return null;
}
function tocarMovelCasa(p) {
  if (!cs || cs.arrumando) return false;
  const m = movelEm(p);
  if (!m) return false;
  destinoEspecial = null;
  if (m.id === 'quadro_foto') { avisoPet(`🧭 ${nomeFotoPet()} está em expedição`); return true; }   // PROMPT-119
  if (cs.visita) {   // na casinha do colega: só olhar (sem regar, alimentar nem arrumar)
    if (ehQuadrinho(m.id) || m.id === ID_CAMPEOES) abrirColecaoCasa();
    else if (m.id === 'aquario') abrirAquario();
    else return false;
    return true;
  }
  const semPet = () => { avisoPet(petFora() ? 'Seu pet está em expedição. 🧭' : 'Seu pet não está aqui agora.'); };
  if (m.id === 'cama') balaoCama(m);   // 💤 / ☀️ (PROMPT-108)
  else if (m.id === 'guarda_roupa') abrirEscolhaPersonagem();   // 👤 trocar de personagem (PROMPT-130)
  else if (ehQuadrinho(m.id)) abrirColecaoCasa(m);   // escolher a insígnia deste quadro
  else if (m.id === ID_CAMPEOES) abrirColecaoCasa();   // 🏆 só olhar
  else if (m.id === 'aquario') abrirAquario();
  else if (m.id === 'estante_album') abrirAlbum();
  else if (m.id === 'vaso') {   // anda até o lado do vaso e rega (já lá: rega na hora)
    const fr = cena.naTrilha(m.x - tamMovel(m)[0] / 2 - 40, m.y), regar = () => { if (cs && !cs.arrumando) { jog.dir = 'direita'; desenharJogador(); regarVaso(m); } };   // ao lado (na frente, o personagem cobre o vaso)
    if (dist(jog.x, jog.y, fr[0], fr[1]) < DIST_PERTO) regar(); else caminharNaTrilha(fr[0], fr[1], regar);
  }
  else if (m.id === 'estante_livros') { if (!petIrPara(m, frenteDe(m), () => curiosidadeNaEstante(), 7000)) semPet(); }
  else if (m.id === 'pote') { if (petNaCasa()) abrirPote(m); else semPet(); }
  else if (m.id === 'caixa_brinquedos') { if (!petIrPara(m, frenteDe(m), () => brincarNaCaixa(), 3000)) semPet(); }
  return true;
}
// 📚 estante: o pet conta uma curiosidade
function curiosidadeNaEstante() {
  const b = CURIO ? baloesCuriosidade(seguidor.pet) : null;
  mostrarFalaPet(b || [{ texto: 'Hmm… já li todos esses livros! 📚', espera: 0, fixo: 2500 }]);
  if (cs?.ida && b) cs.ida.ate = performance.now() + tempoFala(b);   // fica até acabar de contar (com as durações novas)
}
// 🧸 caixa: o pet comemora; +1 de lealdade uma vez por dia
function brincarNaCaixa() {
  const pet = seguidor.pet, c = estado.casinha, hoje = diaLocal();
  reagirSeguidor('comemora', temAnim(seguidor.forma, 'pulo_cambalhota') ? 'pulo_cambalhota' : 'feliz');
  if (c.brinquedo_dia === hoje || casaSemGravar) { mostrarFalaPet([{ texto: 'Que divertido! 🧸', espera: 0, fixo: 1800 }]); return; }
  c.brinquedo_dia = hoje;
  gravar(ganharLealdade(pet, 1, { 'casinha/brinquedo_dia': hoje }));
  verificarMarcosLealdade(pet);
  mostrarFalaPet([{ texto: 'Que divertido! 🧸', espera: 0, fixo: 1800 }]);
  avisoPet('❤️ +1 de lealdade');
}
// 🥣 pote: escolhe a comida da bolsa (o mesmo alimentar do Meu Pet) e o pet vai comer ali
function abrirPote(m) {
  const itens = Object.entries(estado.pets.bolsa || {}).filter(([, n]) => Number(n) > 0).map(([id, n]) => ({ ...itemDaBolsa(id), n: Number(n) })).filter(x => x.id);
  $('cs-comida-lista').innerHTML = itens.length ? itens.map(x => `<button class="cs-comida-item" data-comer="${esc(x.id)}">
      <span>${imgItem(x.imagem, x.emoji, 'jr-item-bolsa' + (x.raro ? ' raro' : ''), x.filtro)}</span><b>${esc(x.nome)}</b><small>× ${x.n} · +${x.lealdade} lealdade${ehFavorita(seguidor.pet, x) ? ' ❤️' : ''}</small></button>`).join('')
    : `<p class="cs-vazio">A bolsa está vazia. Compre comida na loja da Dona Cida (${esc(ondeDonaCida())}) 🛒 ou pesque peixes 🎣.</p>`;
  $('cs-comida').dataset.i = String(cs.moveis.indexOf(m));
  $('cs-comida').hidden = false;
}
// PROMPT-110: o pet vai até o pote e come ali, do lado dele e virado para ele; a comida aparece dentro do pote enquanto come.
// Dragão + planta: a comida sai da bolsa (como no Meu Pet); ele vai até o pote, cheira, fica bravo e bufa; depois volta a passear.
function comerNoPote(id) {
  const m = cs?.moveis[Number($('cs-comida').dataset.i)];
  $('cs-comida').hidden = true;
  if (!m || !petNaCasa()) return;
  const pet = seguidor.pet, forma = seguidor.forma, r = comerDaBolsa(pet, id);
  if (!r) return;
  if (r.motivo) { mostrarFalaPet([{ texto: textoNaoCome(pet, r.motivo), espera: 0, fixo: 2500 }]); return; }
  const lado = ladoDoPote(m);
  let vez = null;
  const aqui = () => cs && !cs.arrumando && (cs.ida ? cs.ida === vez : !vez);   // ainda é esta comida (não foi chamado para outra coisa)
  if (r.recusa) {
    estado.pets.bolsa[r.item.id] = r.n - 1;
    gravar({ [`pets/bolsa/${r.item.id}`]: r.n - 1 || null });
    const cheira = temAnim(forma, 'farejar') ? 1000 : 0, bravo = temSequencia(forma, 'recusa') ? msAtePasso(forma, 'recusa', () => false) : 2000;
    const recusar = () => {
      virarParaPote(lado);
      comidaNoPote(m, r.item);
      if (cheira) seguidor.reagir('farejar', cheira);   // cheira a comida…
      setTimeout(() => {
        if (!aqui()) return;
        // a fala antes: o 1º balão faz a reação rápida (`carinho`), que a recusa substitui
        mostrarFalaPet([{ texto: fraseDe(pet, 'recusa_planta', { pet: nomePet(pet), comida: String(r.item.nome || '').toLowerCase() }) || 'Isso eu não como!', espera: 0, fixo: 2500 }]);
        if (!seguidor.comemorar('recusa')) seguidor.reagir(animBravo(forma), bravo);   // …e fica bravo, bufando
        somRecusa(forma);
        tocar('erro');
        fumacinha();
      }, cheira);
      setTimeout(() => { if (aqui()) tirarComidaPote(); }, cheira + bravo);
    };
    if (petIrPara(m, lado.ponto, recusar, cheira + bravo + 600, true)) vez = cs.ida; else recusar();
    return;
  }
  const seq = r.item.id === 'carne' && temSequencia(forma, 'comer_carne') ? 'comer_carne' : 'comer';
  const ms = temSequencia(forma, seq) ? msAtePasso(forma, seq, () => false) : 3500;
  const comer = () => {
    virarParaPote(lado);
    comidaNoPote(m, r.item);
    if (!seguidor.comemorar(seq)) seguidor.reagir(temAnim(forma, 'comendo') ? 'comendo' : 'feliz', ms);
    tocar('acerto');
    setTimeout(() => {   // terminou: a comida some e ele fala
      if (!aqui()) return;
      tirarComidaPote();
      mostrarFalaPet([{ texto: r.fav ? 'Minha favorita! 💖' : 'Hmm, que delícia!', espera: 0, fixo: 2200 }]);
    }, ms);
  };
  if (petIrPara(m, lado.ponto, comer, ms + 1500, true)) vez = cs.ida; else comer();
  verificarMarcosLealdade(pet);
}
// PROMPT-114: na pata do tapetinho (casinha.json → pote.ponto_comer[vista]: x, y em % da imagem; espelhado: 100 − x),
// virado para a tigela (o centro da imagem); o caminho vai até a trilha mais perto e termina em cima da pata.
// Sem ponto_comer: do lado do pote (esquerdo ou direito, o que estiver livre), como no PROMPT-110
function ladoDoPote(m) {
  const pc = itemCasa(m.id)?.ponto_comer?.[m.vista];
  if (Array.isArray(pc)) {
    const [w, h] = tamMovel(m), fx = m.espelho ? 100 - pc[0] : pc[0], x = m.x - w / 2 + w * fx / 100, y = m.y - h + h * pc[1] / 100;
    return { ponto: [x, y], esquerda: x > m.x };
  }
  const [w] = tamMovel(m), alt = seguidor.altura || 60;
  for (const dir of [-1, 1]) {
    const x = m.x + dir * (w * 0.45 + alt * 0.2), y = m.y - 6, pt = cena.naTrilha(x, y);
    if (dist(pt[0], pt[1], x, y) < 12) return { ponto: pt, esquerda: dir > 0 };
  }
  return { ponto: frenteDe(m), esquerda: m.x < seguidor.x };
}
function virarParaPote(lado) { seguidor.esquerda = seguidor.espelhar = lado.esquerda; }   // as sequências olham para a direita
// a comida dentro do pote: a imagem do item (ou o emoji), pequena, na boca do pote
const BOCA_POTE = { d: [46, 27], f: [48, 25], l: [48, 14] };   // centro da boca, em % da imagem de cada vista (medido)
function comidaNoPote(m, item) {
  tirarComidaPote();
  const [w, h] = tamMovel(m), [bx, by] = BOCA_POTE[m.vista] || [50, 25];
  const el = cs.comidaPote = document.createElement('div');
  el.className = 'cs-pote-comida';
  el.innerHTML = imgItem(item.imagem, item.emoji, '', item.filtro);
  Object.assign(el.style, { left: m.x - w / 2 + w * (m.espelho ? 100 - bx : bx) / 100 + 'px', top: m.y - h + h * by / 100 + 'px',
    width: w * 0.26 + 'px', height: w * 0.26 + 'px', fontSize: w * 0.2 + 'px', zIndex: Math.round(m.y) + 1 });
  $('cena-atores').appendChild(el);
}
function tirarComidaPote() { cs?.comidaPote?.remove(); if (cs) cs.comidaPote = null; }
// 💨 a bufada, na cabeça do pet
function fumacinha() {
  const el = document.createElement('div'), alt = seguidor.altura || 60;
  el.className = 'jr-puf';
  el.textContent = '💨';
  Object.assign(el.style, { left: seguidor.x + (seguidor.esquerda ? -1 : 1) * alt * 0.3 + 'px', top: seguidor.y - alt * 0.45 + 'px', zIndex: 2000 });
  $('cena-atores').appendChild(el);
  setTimeout(() => el.remove(), 900);
}
// 🌱 vaso: 1 rega por dia; a cada regas_por_fase regas, a próxima fase (até a última)
const faseVaso = () => clamp(Number(cs?.visita ? cs.visita.dados.vaso : estado.casinha?.vaso?.fase) || 1, 1, Number(itemCasa('vaso')?.fases) || 4);
function regarVaso(m) {
  const it = itemCasa('vaso'), c = estado.casinha, hoje = diaLocal(), max = Number(it.fases) || 4;
  const v = c.vaso = { fase: faseVaso(), regas: Number(c.vaso?.regas) || 0, ultimo_dia: c.vaso?.ultimo_dia || null };
  if (v.ultimo_dia === hoje) { avisoPet('💧 Você já regou hoje. Volte amanhã!'); return; }
  v.ultimo_dia = hoje;
  let cresceu = false;
  if (v.fase < max && ++v.regas >= (Number(it.regas_por_fase) || 3)) { v.fase++; v.regas = 0; cresceu = true; }
  if (!casaSemGravar) {
    gravar({ 'casinha/vaso': v });
    if (cresceu && c.publicada) update(ref(db, `${basePraca()}/casinhas/${sessao.uid}`), { vaso: v.fase }).catch(e => console.warn('[jogo-revisao] vaso na cópia pública', e?.code || e));
  }
  // gotinhas em CSS caindo no vaso; o pet faz carinho
  const [, h] = tamMovel(m), gotas = document.createElement('div');
  gotas.className = 'cs-gotas';
  Object.assign(gotas.style, { left: m.x + 'px', top: m.y - h - 10 + 'px', zIndex: 939 });
  gotas.innerHTML = '<i></i><i></i><i></i><i></i><i></i>';
  $('cena-atores').appendChild(gotas);
  setTimeout(() => gotas.remove(), 1600);
  if (petNaCasa() && !cs.ida) reagirSeguidor('carinho', 'feliz');
  tocar('acerto');
  avisoPet('💧 Regou!');
  if (cresceu) setTimeout(() => {
    if (!cs) return;
    desenharMoveis();
    $('cena-atores').querySelector(`.cs-movel[data-i="${cs.moveis.indexOf(m)}"]`)?.classList.add('cs-cresceu');
    tocar('vitoria');
    avisoPet('🌱 Cresceu!');
  }, 1300);
}

// ── 🏅 Coleção das insígnias (tocar num quadrinho) ──
// m = o quadrinho tocado (na minha casinha): as ganhas podem ser tocadas e vão para este quadro
// comprar (PROMPT-117): o quadro novo — só as ganhas que ainda não estão em nenhum quadro
let colCompra = false;
function abrirColecaoCasa(m = null, comprar = false) {
  const visita = cs?.visita, linhas = [], escolher = !visita && m && ehQuadrinho(m.id);
  if (cs) cs.colQuadro = escolher ? m : null;
  colCompra = comprar;
  if (comprar) {
    for (const chave of insigniasSemQuadro()) {
      const [k, G] = chave.replace('mapa', '').split('-'), g = estado.ginasios[chave];
      linhas.push(`<button class="cs-col-item" data-comprar-ins="${chave}"><img src="${IMG}/insignias/insignia-${chave}.webp" class="${g?.dourada ? 'dourada' : ''}" alt="" loading="lazy" draggable="false"/>
        <b>${esc(D.questoes[k]?.ginasios?.[G]?.nome || chave)}</b><small>${g?.dourada ? '✨ Dourada' : 'Toque para escolher'}</small></button>`);
    }
    $('cs-col-rodape').textContent = `🏅 ${precoCasa(CASA.insignia_quadrinho) ? `${precoCasa(CASA.insignia_quadrinho)} moedas` : 'Grátis'}`;
    $('cs-col-tit').textContent = '🏅 Escolha a insígnia do quadro novo';
    $('cs-col-grade').innerHTML = linhas.join('');
    $('cs-colecao').hidden = false;
    return;
  }
  let n = 0;
  for (let k = 1; k <= NUM_MAPAS; k++) for (const G of ['A', 'B']) {
    const chave = chaveGinasio(k, G), g = insDe(chave), nome = D.questoes[k]?.ginasios?.[G]?.nome || chave;
    if (g?.insignia) n++;
    else if (visita) continue;   // na casinha do colega: só as que ele já ganhou
    const data = g?.insignia && g.dataInsignia ? new Date(g.dataInsignia).toLocaleDateString('pt-BR') : '';
    const tag = escolher && g?.insignia ? 'button' : 'div', atual = escolher && m.id === 'ins_' + chave;
    linhas.push(`<${tag} class="cs-col-item${g?.insignia ? '' : ' falta'}${atual ? ' atual' : ''}"${tag === 'button' ? ` data-escolher="${chave}"` : ''}><img src="${IMG}/insignias/insignia-${chave}.webp" class="${g?.dourada ? 'dourada' : ''}" alt="" loading="lazy" draggable="false"/>
      <b>${esc(nome)}</b><small>${atual ? '🖼️ Neste quadro' : g?.insignia ? (g.dourada ? '✨ Dourada · ' : '') + esc(data) : 'Ainda não'}</small></${tag}>`);
  }
  $('cs-col-rodape').textContent = `🏅 ${n} de 26`;
  $('cs-col-tit').textContent = visita ? `🏅 Insígnias de ${nomeVisivel(visita.dados.nome) || 'colega'}` : escolher ? '🏅 Escolha a insígnia deste quadro' : '🏅 Coleção de insígnias';
  $('cs-col-grade').innerHTML = linhas.join('');
  $('cs-colecao').hidden = false;
}

// tocou numa insígnia: vai para este quadro; se já estava em outro quadro da parede, os dois trocam; a que saiu vai para os guardados
function escolherInsigniaQuadro(chave) {
  const m = cs?.colQuadro;
  $('cs-colecao').hidden = true;
  if (!m || cs.visita || !insDe(chave)?.insignia) return;
  const novo = 'ins_' + chave, velho = m.id;
  if (novo === velho) return;
  const outro = cs.moveis.find(x => x !== m && x.id === novo), guardado = !outro && cs.guardados[novo] > 0;
  m.id = novo;
  if (outro) outro.id = velho;
  else if (guardado) { delete cs.guardados[novo]; cs.guardados[velho] = 1; estado.casinha.guardados = { ...cs.guardados }; }   // o guardado fica com a que saiu
  estado.casinha.moveis = cs.moveis.map(limparMovel);
  if (!casaSemGravar) {
    gravar({ 'casinha/moveis': estado.casinha.moveis, ...(guardado ? { 'casinha/guardados': { ...estado.casinha.guardados } } : {}) });
    if (estado.casinha.publicada) publicarCasinha();
  }
  desenharMoveis();
  tocar('clique');
  avisoPet(outro || guardado ? '🏅 Os dois quadros trocaram!' : '🏅 Quadro trocado!');
}
// 🏅 comprou o quadro com esta insígnia: vai para os guardados e, na casinha, já entra no Arrumar, no meio da parede
function comprarQuadroIns(chave) {
  $('cs-colecao').hidden = true;
  colCompra = false;
  migrarQuadrosV2();   // os automáticos antigos saem antes (senão a migração apagaria o comprado)
  const c = estado.casinha ||= lerCasinha(null), ps = estado.pets, id = 'ins_' + chave, preco = precoCasa(CASA.insignia_quadrinho), moedas = Number(ps.moedas) || 0;
  if (!estado.ginasios[chave]?.insignia || qtdCasa(id) > 0 || moedas < preco) return;
  if (casaSemGravar) { avisoPet('Modo ?casinha=cheia: as compras de móveis estão desligadas.'); return; }
  c.quadros_v2 = true;
  ps.moedas = moedas - preco;
  c.guardados[id] = 1;
  gravar({ 'pets/moedas': ps.moedas, [`casinha/guardados/${id}`]: 1, 'casinha/quadros_v2': true });
  tocar('vitoria');
  if (!$('loja').hidden) renderLoja();
  if (ehCasinha() && cs && !cs.visita) {
    cs.guardados[id] = 1;
    $('loja').hidden = true;
    abrirArrumar();
    if (naParede(cs.moveis) < maxQuadrinhos()) colocarNoMeio(id);
    else avisoPet(`🏅 Quadro guardado: no máximo ${maxQuadrinhos()} na parede.`);
  } else avisoPet('🏅 Quadro comprado! Vá à sua 🏠 Casinha para pendurar.');
}

// ── 🐠 Aquário: as espécies já pescadas nadando (no quarto e na vista ampliada) ──
const todosPeixes = () => Array.from({ length: NUM_MAPAS }, (_, i) => pontosDoMapa(i + 1)).flat().flatMap(pt => (pt.peixes || []).map(f => ({ ...f, lugar: pt.nome })));
const pescadosAquario = () => todosPeixes().filter(f => (Number(especiesCasa()[f.id]) || 0) > 0).slice(0, 9);
// peixes: indo e voltando, cada um no seu ritmo e altura (vira de lado na volta: as imagens olham para a esquerda)
function peixesHtml(lista, cls) {
  return lista.map((f, i) => `<img class="${cls}" src="${esc(caminhoImg(f.imagem))}" data-peixe="${esc(f.id)}" alt="${esc(f.nome)}" draggable="false"
    style="top:${(10 + ((i * 37) % 62)).toFixed(0)}%;left:${((i * 29) % 70).toFixed(0)}%;animation-duration:${(9 + ((i * 7) % 8)).toFixed(0)}s;animation-delay:-${(i * 2.3).toFixed(1)}s${f.filtro ? `;filter:${esc(f.filtro)}` : ''}"/>`).join('');
}
function aguaHtml(vista, espelho, cls) {
  const a = itemCasa('aquario')?.agua?.[vista];
  if (!a) return '';
  let [x0, y0, x1, y1] = a;
  if (espelho) [x0, x1] = [100 - x1, 100 - x0];   // a vista espelhada espelha a água também
  return `<div class="${cls}" style="left:${x0}%;top:${y0}%;width:${x1 - x0}%;height:${y1 - y0}%">${peixesHtml(pescadosAquario(), cls + '-peixe')}</div>`;
}
function abrirAquario() {
  const todos = todosPeixes(), pesc = new Set(pescadosAquario().map(f => f.id));
  $('cs-aq-tanque').innerHTML = `<img class="cs-aq-img" src="${imgMovel('aquario', 'f')}" alt="" draggable="false"/>` + aguaHtml('f', false, 'cs-aq-agua')
    .replace('</div>', Array.from({ length: 10 }, (_, i) => `<i class="cs-bolha" style="left:${(5 + i * 9.5).toFixed(1)}%;animation-delay:-${(i * 0.7).toFixed(1)}s;animation-duration:${(3 + (i % 4)).toFixed(0)}s"></i>`).join('') + '</div>') + '<div class="cs-aq-balao" id="cs-aq-balao" hidden></div>';
  $('cs-aq-faixa').innerHTML = `<span class="cs-aq-total">🐠 ${pesc.size} de ${todos.length}</span>` + todos.map(f => pesc.has(f.id)
    ? `<span class="cs-aq-ficha" title="${esc(f.nome)}">${imgItem(f.imagem, '🐟', '', f.filtro)}<small>${esc(f.nome)}</small></span>`
    : `<span class="cs-aq-ficha falta">${imgItem(f.imagem, '🐟')}<small>?</small></span>`).join('');
  $('cs-aq-balao').hidden = true;
  $('cs-aquario').hidden = false;
}
function tocarPeixeAquario(e) {
  const el = e.target.closest('[data-peixe]'), b = $('cs-aq-balao');
  if (!el) { b.hidden = true; return; }
  const f = todosPeixes().find(x => x.id === el.dataset.peixe), n = Number(especiesCasa()[f.id]) || 0;
  b.innerHTML = `🐟 <b>${esc(f.nome)}</b> · pescado ${n}× · ${esc(f.lugar)}`;
  // posição no tanque, em % (o jogo pode estar girado: offsets não dependem da rotação)
  const tq = $('cs-aq-tanque'), fx = (el.offsetLeft + el.offsetWidth / 2 + el.parentElement.offsetLeft) / tq.offsetWidth, fy = (el.offsetTop + el.parentElement.offsetTop) / tq.offsetHeight;
  Object.assign(b.style, { left: (fx * 100).toFixed(1) + '%', top: (fy * 100).toFixed(1) + '%' });
  b.hidden = false;
}

// ── 🛠️ Arrumar ──
function abrirArrumar() {
  if (!cs || cs.arrumando || transicionando) return;
  if (cs.ida) soltarPet();
  fecharBalaoCama();
  cs.arrumando = true; cs.sel = null;
  jog.caminho = []; jog.aoChegar = null; destinoEspecial = null;
  esconderBalao();
  // o pet espera num canto do quarto
  const ch = CASA.quarto.chao, canto = [ch.x[0] + 50, ch.y[1] - 8];
  seguidor?.colocar(canto[0], canto[1]);
  cs.petAlvo = canto; cs.petVel = 0;
  $('tela-cena').classList.add('cs-arrumando');
  $('cs-faixa').hidden = false;
  renderFaixaCasa();
}
// coloca um móvel dos guardados no meio do chão (ou da parede), já selecionado
function colocarNoMeio(chave) {
  const { id, cor } = daChave(chave), it = itemCasa(id);
  if (!it || !cs?.arrumando || !(cs.guardados[chave] > 0)) return;
  const m = { id, x: 0, y: 0, vista: it.vistas[0], espelho: false, cor: corValida(it, cor) }, Q = CASA.quarto, parede = it.tipo === 'parede', A = parede ? Q.parede : Q.chao;
  prenderNaArea(m, (A.x[0] + A.x[1]) / 2, parede ? A.y[1] : (A.y[0] + A.y[1]) / 2 + 60);
  cs.moveis.push(m);
  cs.guardados[chave]--;
  cs.sel = m;
  desenharMoveis();
  renderFaixaCasa();
  abrirFerrCasa();
}
function prontoArrumar() {
  if (!cs?.arrumando) return;
  fecharFerrCasa();
  cs.arrumando = false; cs.sel = null; cs.petAlvo = null;
  $('cs-faixa').hidden = true;
  $('tela-cena').classList.remove('cs-arrumando');
  for (const el of $('cena-atores').querySelectorAll('.cs-movel.sel')) el.classList.remove('sel');
  const c = estado.casinha;
  c.moveis = cs.moveis.map(limparMovel);
  c.guardados = Object.fromEntries(Object.entries(cs.guardados).filter(([id, n]) => n > 0 && (id !== ID_CAMPEOES || c.campeoes)));   // 🏆 do ?campeoes=1: não grava
  if (!c.campeoes) c.moveis = c.moveis.filter(m => m.id !== ID_CAMPEOES);
  if (!casaSemGravar) {
    gravar({ 'casinha/moveis': c.moveis, 'casinha/guardados': c.guardados });
    publicarCasinha();
  }
  refazerGradeCasinha();
  desenharMoveis();
  seguidor?.colocar(jog.x, jog.y);
  cs.passeio = novoPasseio(jog.x, jog.y);
  tocar('vitoria');
  avisoPet(casaSemGravar ? '✔ Pronto (modo ?casinha=cheia: nada foi gravado)' : '✔ Casinha arrumada!');
}
async function publicarCasinha() {
  if (casaSemGravar || !entraNoRanking()) return;
  const pet = petsOk && estado.pets?.ativo;   // em expedição também (fora_ate): a foto fica no quadro; o pet não passeia nem fica na porta
  const dados = { moveis: estado.casinha.moveis, pet: pet ? { pet, forma: formaDe(pet), tinta: tintaVisivel(pet) || null, nome: nomePet(pet), fora_ate: petFora(pet) ? Number(expedicaoDe(pet).fim) : null } : null,
    nome: nomeRanking(), turma: sessao.turma || '', vaso: faseVaso(), cor: estado.casinha.cor || null, tema: temaDoDono().id, ts: Date.now(),
    ins: Object.fromEntries(insigniasGanhas().map(k => [k, { d: estado.ginasios[k].dourada ? 1 : 0, t: estado.ginasios[k].dataInsignia || 0 }])),   // PROMPT-107
    peixes: { ...(estado.pescaEspecies || {}) } };
  try {
    await update(ref(db, `${basePraca()}/casinhas/${sessao.uid}`), dados);   // update: não apaga os ❤️ (PROMPT-107)
    if (!estado.casinha.publicada) { estado.casinha.publicada = true; gravar({ 'casinha/publicada': true }); }
  }
  catch (e) { console.warn('[jogo-revisao] cópia pública da casinha indisponível', e?.code || e); }
}
// ── 🎨 Reformas (PROMPT-112) — casinha.json → temas: fundos do quarto, todos com o chão, as paredes e a porta nas mesmas
//  posições do quarto.webp (as áreas e a trilha valem para todos). Clássico: grátis. Estado: casinha.tema (o aplicado) e
//  casinha.temas { id: true } (os comprados); cópia pública: tema (a visita vê o mesmo). ?casinha=cheia: todos, sem gravar.
const temasCasa = () => (CASA?.temas?.length ? CASA.temas : [{ id: 'classico', nome: 'Clássico', emoji: '🏠', preco: 0, imagem: CASA?.quarto?.imagem || 'quarto.webp' }]);
const temaCasa = (id) => temasCasa().find(t => t.id === id) || temasCasa()[0];
const imgTema = (t) => `${IMG}/casinha/${t.imagem}`;
const temTema = (id) => casaSemGravar || !(Number(temaCasa(id).preco) > 0) || !!estado.casinha?.temas?.[id];
const meusTemas = () => temasCasa().filter(t => temTema(t.id));
// o tema do quarto: na visita, o do dono (cópia pública); o meu, só se é meu mesmo
const temaDoDono = (visita = null) => (visita ? temaCasa(visita.dados.tema) : temaCasa(temTema(estado.casinha?.tema) ? estado.casinha?.tema : null));
function comprarTema(id) {
  const t = temasCasa().find(x => x.id === id), ps = estado.pets, moedas = Number(ps.moedas) || 0, preco = precoCasa(t);   // professora / modo teste: 0
  if (!t || temTema(id) || moedas < preco) return;
  const c = estado.casinha ||= lerCasinha(null);
  ps.moedas = moedas - preco;
  c.temas = { ...c.temas, [id]: true };
  gravar({ 'pets/moedas': ps.moedas, [`casinha/temas/${id}`]: true });
  tocar('vitoria');
  const naCasa = ehCasinha() && cs && !cs.visita;
  aplicarTema(id);   // já aplica
  renderLoja();
  $('lj-msg').textContent = naCasa ? `${t.nome}: reforma feita!` : `${t.nome}: reforma feita! Vá à sua 🏠 Casinha para ver.`;
  if (naCasa) $('loja').hidden = true;   // na casinha: fecha o catálogo para ver o quarto novo
  avisoPet('🎨 Reforma feita!');
}
// troca o tema (comprado): grava casinha/tema e o tema da cópia pública; na casinha, o fundo troca com um fade curto
async function aplicarTema(id) {
  const c = estado.casinha, t = temaCasa(id);
  if (!c || !temTema(t.id)) return;
  c.tema = t.id;
  if (!casaSemGravar) {
    gravar({ 'casinha/tema': t.id });
    if (c.publicada) update(ref(db, `${basePraca()}/casinhas/${sessao.uid}`), { tema: t.id }).catch(e => console.warn('[jogo-revisao] tema na cópia pública', e?.code || e));
  }
  if (!ehCasinha() || !cs || cs.visita) return;
  const f = $('cena-fundo'), ver = cs;
  f.style.transition = 'opacity .18s ease'; f.style.opacity = '0';
  await new Promise(ok => setTimeout(ok, 180));
  await trocarFundo(imgTema(t));
  f.style.opacity = '';
  setTimeout(() => { f.style.transition = ''; }, 220);
  if (cs === ver) desenharMoveis();   // o brilho da janela do tema
}
function abrirTemasCasa() {
  const atual = temaDoDono().id;
  $('cs-temas-lista').innerHTML = meusTemas().map(t => `<button class="cs-comida-item cs-tema-item${t.id === atual ? ' atual' : ''}" data-tema="${esc(t.id)}">
      <span><img src="${imgTema(t)}" alt="" draggable="false" loading="lazy"/></span><b>${esc(t.emoji || '🎨')} ${esc(t.nome)}</b><small>${t.id === atual ? '✔ Agora' : 'Toque para usar'}</small></button>`).join('');
  $('cs-temas').hidden = false;
}

// 🎁 PROMPT-114: móveis e reformas grátis para a professora (jogando como aluna) e no modo teste; gravados de verdade,
// com os mesmos limites. Para os alunos, o preço do json
const casaGratis = () => ehProfessora() || teste;
const precoCasa = (it) => (casaGratis() ? 0 : Number(it?.preco) || 0);

// faixa dos guardados (miniaturas com a quantidade)
// (PROMPT-117: os quadros de insígnia e o 🏆 também, porque são móveis comprados/ganhos)
function renderFaixaCasa() {
  const ordem = (id) => { const i = (CASA.itens || []).findIndex(x => x.id === id); return i < 0 ? 999 : i; };
  const itens = Object.keys(cs.guardados).filter(k => cs.guardados[k] > 0).map(k => ({ k, ...daChave(k) }))
    .map(g => ({ ...g, it: itemCasa(g.id) })).filter(g => g.it).sort((a, b) => ordem(a.id) - ordem(b.id) || a.k.localeCompare(b.k));
  const mini = ({ it, cor }) => (it.quadrinho ? `<span class="cs-mini-quadro"><img src="${imgMovel(it.id, 'f')}" alt="" draggable="false"/>${imgInsigniaQuadro(it.quadrinho)}</span>`
    : it.campeoes ? miniCampeoes() : imgComCor(it.id, it.fases ? '1' : it.vistas[0], it.fases ? '' : cor));   // 🎨 com a cor do móvel
  $('cs-guardados').innerHTML = itens.length ? itens.map(g => `<button class="cs-guardado" data-guardado="${esc(g.k)}" title="${esc(g.it.nome)}">
      ${mini(g)}${cs.guardados[g.k] > 1 ? `<b>${cs.guardados[g.k]}</b>` : ''}<span>${esc(g.it.quadrinho ? '🏅 ' + g.it.nome : g.it.nome)}</span></button>`).join('')
    : '<p class="cs-vazio">Nada guardado. Compre móveis na loja da Dona Cida (aba 🛋️ Móveis) ou arraste os móveis pelo quarto.</p>';
}
// prende a base do móvel na área certa (chão ou parede)
function prenderNaArea(m, x, y) {
  const it = itemCasa(m.id), [w, h] = tamMovel(m), Q = CASA.quarto;
  prenderEmArea(m, x, y, it.tipo, w, h, it.tipo === 'parede' ? Q.parede : Q.chao);
}
// arrastar (móvel do quarto ou miniatura da faixa); tocar sem arrastar: seleciona / coloca no meio
function arrastarCasa(e, m, daFaixa) {
  e.preventDefault(); e.stopPropagation();
  const alvo = e.currentTarget;
  try { alvo.setPointerCapture(e.pointerId); } catch (_) {}
  fecharFerrCasa();
  const ini = [e.clientX, e.clientY], p0 = telaParaImagem(e.clientX, e.clientY);
  let off = daFaixa ? [0, 0] : [m.x - p0.x, m.y - p0.y], moveu = false, noQuarto = !daFaixa;
  const sobreFaixa = (ev) => !!document.elementFromPoint(ev.clientX, ev.clientY)?.closest('#cs-faixa');
  const mover = (ev) => {
    if (!moveu && Math.hypot(ev.clientX - ini[0], ev.clientY - ini[1]) < 6) return;
    moveu = true;
    if (daFaixa && !noQuarto) {
      if (sobreFaixa(ev)) return;
      noQuarto = true;   // saiu da faixa: o móvel aparece debaixo do dedo
      off = [0, tamMovel(m)[1] / 2];
      cs.moveis.push(m);
      desenharMoveis();
    }
    const q = telaParaImagem(ev.clientX, ev.clientY);
    prenderNaArea(m, q.x + off[0], q.y + off[1]);
    posicionarMovel(m);
  };
  const soltar = (ev) => {
    alvo.removeEventListener('pointermove', mover); alvo.removeEventListener('pointerup', soltar); alvo.removeEventListener('pointercancel', soltar);
    if (!cs?.arrumando) return;
    if (daFaixa) {
      if (!moveu) {   // tocou na miniatura: aparece no meio do chão (ou da parede)
        const Q = CASA.quarto, A = itemCasa(m.id).tipo === 'parede' ? Q.parede : Q.chao;
        prenderNaArea(m, (A.x[0] + A.x[1]) / 2, itemCasa(m.id).tipo === 'parede' ? A.y[1] : (A.y[0] + A.y[1]) / 2 + 60);
        cs.moveis.push(m);
      } else if (!noQuarto || ev.type === 'pointercancel' || sobreFaixa(ev)) {   // soltou na faixa: volta para os guardados
        if (noQuarto) cs.moveis.splice(cs.moveis.indexOf(m), 1);
        desenharMoveis();
        return;
      }
      cs.guardados[chaveGuardado(m.id, m.cor)] = (cs.guardados[chaveGuardado(m.id, m.cor)] || 0) - 1;
      cs.sel = m;
      desenharMoveis();
      renderFaixaCasa();
      abrirFerrCasa();
      tocar('clique');
      return;
    }
    cs.sel = m;
    for (const el of $('cena-atores').querySelectorAll('.cs-movel')) el.classList.toggle('sel', el.dataset.i === String(cs.moveis.indexOf(m)));
    abrirFerrCasa();
  };
  alvo.addEventListener('pointermove', mover);
  alvo.addEventListener('pointerup', soltar);
  alvo.addEventListener('pointercancel', soltar);
}
// 🔄 Girar: d → d espelhado → f → l → l espelhado (só as vistas que existem); só d: normal ↔ espelhado; vaso: espelha
function ciclosVista(it, m) {
  if (it.tipo === 'parede') return [];
  if (it.fases) return [[m.vista, false], [m.vista, true]];
  const c = [];
  for (const v of ['d', 'f', 'l']) if (it.vistas.includes(v)) { c.push([v, false]); if (v !== 'f') c.push([v, true]); }
  return c.length === 1 ? [c[0], [c[0][0], true]] : c;
}
function girarMovel() {
  const m = cs?.sel;
  if (!m) return;
  const it = itemCasa(m.id), c = ciclosVista(it, m);
  if (c.length < 2) return;
  const i = c.findIndex(([v, e]) => v === m.vista && e === !!m.espelho);
  [m.vista, m.espelho] = c[(i + 1) % c.length];
  prenderNaArea(m, m.x, m.y);
  if (m.id === 'aquario') { desenharMoveis(); abrirFerrCasa(); } else posicionarMovel(m);   // a água muda com a vista
  tocar('clique');
}
// 🎨 cor do móvel (PROMPT-118): bolinhas com as amostras do grupo (tecido / madeira); troca na hora, grátis; grava no ✔ Pronto
function abrirCoresMovel() {
  const m = cs?.sel, it = itemCasa(m?.id), cores = coresDe(it), el = $('cs-cores');
  if (!cores) return;
  if (!el.hidden) { el.hidden = true; return; }
  // amostra_padrao (PROMPT-125): a 1ª bolinha mostra a cor original do item (a cama: cobertor bege)
  el.innerHTML = cores.map(c => (c.id === '' && it.amostra_padrao ? { ...c, nome: 'Bege', amostra: it.amostra_padrao } : c)).map(c => `<button class="cs-cor${(m.cor || '') === c.id ? ' sel' : ''}" data-cor="${esc(c.id)}" title="${esc(c.nome)}" aria-label="${esc(c.nome)}" style="--c:${esc(c.amostra)}"></button>`).join('');
  el.hidden = false;
  posicionarFerrCasa();
}
function trocarCorMovel(cor) {
  const m = cs?.sel, it = itemCasa(m?.id);
  if (!m || !coresDe(it)) return;
  m.cor = corValida(it, cor);
  posicionarMovel(m);
  for (const b of $('cs-cores').children) b.classList.toggle('sel', b.dataset.cor === (m.cor || ''));
  tocar('clique');
}
function guardarMovel() {
  const m = cs?.sel;
  if (!m) return;
  cs.moveis.splice(cs.moveis.indexOf(m), 1);
  const k = chaveGuardado(m.id, m.cor);   // guarda com a cor (PROMPT-118)
  cs.guardados[k] = (cs.guardados[k] || 0) + 1;
  cs.sel = null;
  fecharFerrCasa();
  desenharMoveis();
  renderFaixaCasa();
  tocar('clique');
}
function abrirFerrCasa() {
  const m = cs?.sel, el = $('cs-ferr');
  if (!m) return;
  el.querySelector('[data-cs="girar"]').hidden = ciclosVista(itemCasa(m.id), m).length < 2;
  el.querySelector('[data-cs="cor"]').hidden = !coresDe(itemCasa(m.id));   // 🎨 só nos que têm cor (PROMPT-118)
  $('cs-cores').hidden = true;
  el.hidden = false;
  posicionarFerrCasa();
}
function posicionarFerrCasa() {
  const m = cs?.sel, el = $('cs-ferr');
  if (!m || el.hidden) return;
  posicionarNaTela(el, m.x, m.y - tamMovel(m)[1] - 6);
}
function fecharFerrCasa() { $('cs-ferr').hidden = true; }
function ligarCasinha() {
  $('cs-arrumar').addEventListener('click', (e) => { e.stopPropagation(); abrirArrumar(); });
  $('cs-pronto').addEventListener('click', (e) => { e.stopPropagation(); prontoArrumar(); });
  $('cs-curtir').addEventListener('click', (e) => { e.stopPropagation(); alternarCurtida(); });
  $('cs-menu').addEventListener('click', (e) => { const v = e.target.closest('[data-visitar-casa]'); if (v) visitarCasinha(v.dataset.visitarCasa); });
  $('btn-curtidas').addEventListener('click', (e) => { e.stopPropagation(); abrirMaisCurtidas(); });
  $('btn-casa').addEventListener('click', (e) => { e.stopPropagation(); irParaCasa(); });
  $('cs-comprar').addEventListener('click', (e) => { e.stopPropagation(); if (cs && !cs.visita && !cs.arrumando) abrirLoja('moveis', false, true); });
  $('cs-cama-balao').addEventListener('click', (e) => {
    e.stopPropagation();
    const b = e.target.closest('[data-cama]'), cama = cs?.balaoCama?.cama;
    fecharBalaoCama();
    if (!b || !cs || cs.visita || cs.arrumando) return;
    if (b.dataset.cama === 'acordar') acordarNaCasinha(); else if (cama) porParaDormir(cama);
  });
  $('cs-col-grade').addEventListener('click', (e) => {
    const c = e.target.closest('[data-comprar-ins]');
    if (c) { comprarQuadroIns(c.dataset.comprarIns); return; }
    const b = e.target.closest('[data-escolher]'); if (b) escolherInsigniaQuadro(b.dataset.escolher);
  });
  $('cs-tema').addEventListener('click', (e) => { e.stopPropagation(); if (cs && !cs.visita && !cs.arrumando) abrirTemasCasa(); });
  $('cs-temas-lista').addEventListener('click', (e) => { const b = e.target.closest('[data-tema]'); if (!b) return; $('cs-temas').hidden = true; if (b.dataset.tema !== temaDoDono().id) { aplicarTema(b.dataset.tema); tocar('clique'); } });
  for (const id of ['cs-colecao', 'cs-aquario', 'cs-comida', 'cs-menu', 'cs-temas', 'venc']) $(id).addEventListener('click', (e) => {   // ✕ ou fora da caixa: fecha
    if (e.target === $(id) || e.target.closest(`[data-fechar="${id}"]`)) $(id).hidden = true;
  });
  $('cs-comida-lista').addEventListener('click', (e) => { const b = e.target.closest('[data-comer]'); if (b) comerNoPote(b.dataset.comer); });
  $('cs-aq-tanque').addEventListener('pointerdown', tocarPeixeAquario);
  $('cs-ferr').addEventListener('click', (e) => {
    e.stopPropagation();
    const b = e.target.closest('[data-cs]');
    const bc = e.target.closest('[data-cor]');
    if (bc) { trocarCorMovel(bc.dataset.cor); return; }
    if (b?.dataset.cs === 'cor') { abrirCoresMovel(); return; }
    $('cs-cores').hidden = true;
    if (b?.dataset.cs === 'girar') girarMovel();
    else if (b?.dataset.cs === 'guardar') guardarMovel();
  });
  $('cs-guardados').addEventListener('wheel', (e) => {   // roda do mouse: rola a faixa de lado
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.currentTarget.scrollLeft += e.deltaY; e.preventDefault();
  }, { passive: false });
  $('cs-guardados').addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-guardado]'), g = b && daChave(b.dataset.guardado);
    const it = g && itemCasa(g.id);
    if (!it || !cs?.arrumando || !(cs.guardados[b.dataset.guardado] > 0)) return;
    if (it.quadrinho && naParede(cs.moveis) >= maxQuadrinhos()) { avisoPet(`No máximo ${maxQuadrinhos()} quadros na parede. Guarde um para pendurar outro.`); return; }
    const m = { id: it.id, x: 0, y: 0, vista: it.vistas[0], espelho: false, cor: corValida(it, g.cor) };
    arrastarCasa({ preventDefault: () => e.preventDefault(), stopPropagation: () => e.stopPropagation(), currentTarget: b, pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY }, m, true);
  });
  $('cena-atores').addEventListener('pointerdown', (e) => {
    if (!cs?.arrumando) return;
    const el = e.target.closest('.cs-movel'), m = el && cs.moveis[Number(el.dataset.i)];
    if (!m) return;
    arrastarCasa({ preventDefault: () => e.preventDefault(), stopPropagation: () => e.stopPropagation(), currentTarget: el, pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY }, m, false);
  });
  // tocar no chão vazio, arrumando: tira a seleção
  $('cena-vp').addEventListener('pointerdown', (e) => {
    if (!cs?.arrumando || e.target.closest('.cs-movel, #cs-ferr, #cs-faixa')) return;
    cs.sel = null; fecharFerrCasa();
    for (const el of $('cena-atores').querySelectorAll('.cs-movel.sel')) el.classList.remove('sel');
  });
}

// ============================================================
//  🏠 VISITAR A CASINHA DE UM COLEGA + ❤️ (PROMPT-107)
//  Botão 🏠 no cartão do colega e na lista online, só se a cópia pública existe (casinhas/{uid}). Placa da Praça: menu
//  "Minha casinha" / "⭐ Mais curtidas" (as 5 da turma). A visita é só para olhar: o visitante entra pela porta sem o pet
//  dele; o pet do dono passeia (com a tinta) e às vezes dorme na cama; quadrinho → as insígnias do dono; aquário → os peixes dele.
//  ❤️ casinhas_coracoes/{dono}/{visitante} = ts, uma vez por colega (pode desfazer); casinhas/{dono}/coracoes por transação.
//  Quem curtiu nunca aparece. Dono: selo "❤️ N" na casinha e, ao entrar no jogo, "❤️ 3 colegas curtiram sua casinha!".
//  Contas de teste e da professora: não publicam (entraNoRanking) e não aparecem (visivelNoRanking). Modo teste: nós _teste.
// ============================================================
let casasPub = {}, casasPubT = 0;
const casaPub = (uid) => { const r = casasPub[uid]; return r && uid !== sessao.uid && r.moveis && visivelNoRanking(uid, r) ? r : null; };
// cópias públicas das casinhas (lidas de novo depois de 1 min); true = leu agora
async function carregarCasasPub(forca = false) {
  if (!forca && casasPubT && performance.now() - casasPubT < 60000) return false;
  casasPubT = performance.now();
  try { casasPub = await lerNo(`${basePraca()}/casinhas`); }
  catch (e) { console.warn('[jogo-revisao] casinhas indisponíveis', e?.code || e); return false; }
  return true;
}
// a insígnia de quem é o quarto aberto: na visita, a da cópia pública do dono (ins: { chave: { d: dourada, t: data } })
function insDe(chave) {
  if (cs?.visita) { const i = cs.visita.dados.ins?.[chave]; return i ? { insignia: true, dourada: !!i.d, dataInsignia: Number(i.t) || null } : null; }
  return estado.ginasios[chave];
}
const especiesCasa = () => (cs?.visita ? cs.visita.dados.peixes || {} : estado.pescaEspecies || {});

async function visitarCasinha(uid, volta = null) {   // volta: { n: 'vila', lado } — entrou pela porta da vila
  if (!CASA || !uid || uid === sessao.uid || transicionando) return;
  let d = null;
  try { const s = await get(ref(db, `${basePraca()}/casinhas/${uid}`)); d = s.exists() ? s.val() : null; }
  catch (e) { console.warn('[jogo-revisao] casinha do colega indisponível', e?.code || e); }
  if (!d?.moveis || !visivelNoRanking(uid, d)) { avisoPet('Essa casinha não está aberta para visitas agora.'); return; }
  $('cs-menu').hidden = $('online-lista').hidden = true;
  fecharCartaoColega();
  transicao(() => abrirCasinha({ uid, dados: d }, volta));
}

// ── 🐾 o pet do dono passeia pelo quarto (um "líder" invisível anda pela grade e o pet o segue) ──
function criarPetDono(p) {
  if (Number(p?.fora_ate) > Date.now()) return;   // 🧭 em expedição: não passeia (PROMPT-119)
  const pet = p && petValido(petAtual(p.pet)) ? petAtual(p.pet) : null;
  if (!pet || !cs?.visita) return;
  const forma = formaValida(pet, p.forma);
  const sombra = document.createElement('div'), img = document.createElement('img');
  sombra.className = 'jr-pet-sombra';
  img.className = 'jr-ator jr-pet'; img.alt = ''; img.draggable = false;
  $('cena-atores').append(sombra, img);
  const seg = new PetSeguidor(img, sombra);
  seg.zCasa = Z_PET_CASA;   // o pet do dono também na frente dos móveis (PROMPT-114)
  seg.evitar = (x, y) => ladoForaDaPorta(x, y, [jog.x, jog.y]);   // 🐾 nem ele para em cima da porta (PROMPT-155)
  preCarregarPet(forma);
  seg.definir(pet, forma);
  aplicarTinta(img, p.tinta || null, true);
  const ch = CASA.quarto.chao, [x, y] = cena.naTrilha((ch.x[0] + ch.x[1]) / 2 + 180, (ch.y[0] + ch.y[1]) / 2);
  seg.colocar(x, y);
  cs.visita.petDono = { seg, img, sombra, forma, passeio: novoPasseio(x, y) };
}
// o mesmo passeio do meu pet (PROMPT-110); o do dono também vai dormir na cama de vez em quando
function andarPetDono(dt) {
  const d = cs.visita.petDono;
  if (!d) return;
  const p = d.passeio;
  if (passoPasseio(p, d.seg, d.forma, dt) && p.cama) {   // chegou na cama: dorme um pouco
    const t = 15 + Math.random() * 10;
    d.seg.zFixo = Math.round(p.cama.y) + 1;
    d.seg.reagir(temAnim(d.forma, 'dormindo') ? 'dormindo' : 'sentado_girando', t * 1000);
    p.espera = t;
  }
  if (p.espera <= 0 && !p.caminho.length) {
    const deCama = p.cama;
    if (deCama) { p.cama = null; d.seg.zFixo = null; d.seg.reacao = null; }
    rotaPasseio(p, deCama ? [deCama.x, deCama.y + 8] : p.lider, deCama ? 0 : 0.25);
  }
  const e = escalaPetCena(d.forma);
  d.seg.atualizar(dt, p.lider[0], p.lider[1], p.vel, altImagemPet(d.forma) * e, 0, e);
}

// ── ❤️ Curtir ──
const podeCurtir = (turmaDono) => entraNoRanking() && !desafiosOff?.todas && !desafiosOff?.[sessao.turma] && !desafiosOff?.[turmaDono];
async function lerCurtida() {
  const v = cs?.visita, b = $('cs-curtir');
  b.hidden = true;
  if (!v || v.uid === sessao.uid || !podeCurtir(v.dados.turma)) return;
  try {
    const s = await get(ref(db, `${basePraca()}/casinhas_coracoes/${v.uid}/${sessao.uid}`));
    if (cs?.visita !== v) return;
    v.curtiu = s.exists();
  } catch (e) { console.warn('[jogo-revisao] curtida indisponível', e?.code || e); return; }
  pintarCurtir();
  b.hidden = false;
}
function pintarCurtir() {
  const v = cs?.visita, b = $('cs-curtir');
  if (!v) return;
  b.textContent = v.curtiu ? '💖 Você curtiu · desfazer' : '❤️ Curtir casinha';
  b.classList.toggle('curtiu', !!v.curtiu);
  b.setAttribute('aria-pressed', String(!!v.curtiu));
}
async function alternarCurtida() {
  const v = cs?.visita;
  if (!v || v.ocupado || !podeCurtir(v.dados.turma)) return;
  v.ocupado = true;
  const quero = !v.curtiu, base = basePraca(), no = ref(db, `${base}/casinhas_coracoes/${v.uid}/${sessao.uid}`);
  try {
    await (quero ? set(no, agoraServ()) : remove(no));
    await runTransaction(ref(db, `${base}/casinhas/${v.uid}/coracoes`), (cur) => Math.max(0, (Number(cur) || 0) + (quero ? 1 : -1)));
    v.curtiu = quero;
    tocar(quero ? 'acerto' : 'clique');
    if (quero) avisoPet('❤️ Você curtiu esta casinha!');
  } catch (e) {
    console.warn('[jogo-revisao] não deu para curtir', e?.code || e);
    avisoPet('Não deu para curtir agora. Tente de novo.');
  }
  v.ocupado = false;
  pintarCurtir();
}
// dono: o selo "❤️ N" na própria casinha
async function pintarSeloCoracoes() {
  const el = $('cs-selo');
  el.hidden = true;
  if (!estado.casinha?.publicada || casaSemGravar) return;
  try {
    const s = await get(ref(db, `${basePraca()}/casinhas/${sessao.uid}/coracoes`));
    if (!ehCasinha() || !cs || cs.visita) return;
    const n = s.exists() ? Number(s.val()) || 0 : 0;
    el.textContent = `❤️ ${n}`;
    el.title = n === 1 ? '1 colega curtiu sua casinha' : `${n} colegas curtiram sua casinha`;
    el.hidden = false;
  } catch (e) { console.warn('[jogo-revisao] corações indisponíveis', e?.code || e); }
}
// ao entrar no jogo: avisa os corações novos (sem dizer de quem)
async function avisarCoracoes() {
  if (!estado.casinha?.publicada || !entraNoRanking()) return;
  try {
    const s = await get(ref(db, `${basePraca()}/casinhas/${sessao.uid}/coracoes`));
    const n = s.exists() ? Number(s.val()) || 0 : 0, vistos = Number(estado.casinha.coracoes_vistos) || 0;
    if (n === vistos) return;
    estado.casinha.coracoes_vistos = n;
    gravar({ 'casinha/coracoes_vistos': n });
    if (n > vistos) avisoPet(`❤️ ${n - vistos === 1 ? '1 colega curtiu' : `${n - vistos} colegas curtiram`} sua casinha!`, true);
  } catch (e) { console.warn('[jogo-revisao] corações indisponíveis', e?.code || e); }
}

// ── ⭐ Mais curtidas (botão no topo da casinha): as 5 casinhas da turma com mais ❤️ ──
function abrirMaisCurtidas() {
  $('cs-menu').hidden = false;
  mostrarMaisCurtidas();
}
async function mostrarMaisCurtidas() {
  const el = $('cs-curtidas');
  el.innerHTML = '<li class="cs-curt-vazio">Carregando…</li>';
  await carregarCasasPub(true);
  if ($('cs-menu').hidden) return;
  const turma = sessao.turma || '';
  const lista = Object.entries(casasPub).filter(([uid, r]) => r?.moveis && r.turma === turma && (uid === sessao.uid || visivelNoRanking(uid, r)))
    .sort(([, a], [, b]) => (Number(b.coracoes) || 0) - (Number(a.coracoes) || 0) || (Number(b.ts) || 0) - (Number(a.ts) || 0)).slice(0, 5);
  el.innerHTML = lista.length ? lista.map(([uid, r], i) => `<li><span class="cs-curt-pos">${['🥇', '🥈', '🥉'][i] || `${i + 1}º`}</span>
      <b>${esc(nomeVisivel(r.nome) || 'Aluno')}</b><span class="cs-curt-n">❤️ ${Number(r.coracoes) || 0}</span>
      ${uid === sessao.uid ? '<em>você</em>' : `<button class="jr-btn" data-visitar-casa="${esc(uid)}">🏠 Visitar</button>`}</li>`).join('')
    : `<li class="cs-curt-vazio">Ninguém da ${esc(nomeVisivel(turma) || 'turma')} arrumou a casinha ainda.</li>`;
}

// ============================================================
//  🏘️ VILA DAS CASINHAS (PROMPT-109) — dados/jogo/vila.json. Cada aluno tem a sua vila: a casa dele no meio, os vizinhos
//  nos lados (esquerda e depois direita); lado sem vizinho = casa cinza "🏡 Disponível". Sem jogadores ao vivo: vizinho
//  online = janela acesa; o pet dele sentado na porta. Entra pela placa da Praça (na entrada) ou pelo 🏠 do HUD (na frente
//  da própria porta). Portas: a minha casinha · a do vizinho (visita, com ❤️) · Disponível (convidar).
//  jogo_revisao_praca(_teste)/vila/{uid}/vizinhos/{outro} = { lado, ts, nome, turma }   (nos dois sentidos)
//  jogo_revisao_praca(_teste)/vila_convites/{convidado}/{quem convida} = { nome, turma, ts }
//  Estado do aluno: casinha.cor · casinha.convites { uid: ts } (enviados) · casinha.vizinhos_vistos { uid: true } · casinha.mudou (ts)
//  ?vila=cheia (modo teste): 2 vizinhos falsos (um online, andando pela vila: PROMPT-111), sem gravar.
//  PROMPT-111: cada vila tem dono. "🏘️ Ir à vila de…": a casa do dono no meio, os vizinhos dele nos lados (um é você);
//  só os vizinhos do dono (e ele) entram, mesmo com o dono offline. Ao vivo: online { mapa: 'vila', local: uid do dono, x, y, dir }
//  e quem está na mesma vila se vê como na Praça (o pet na porta some se o morador está ali). Portas: as casinhas, em visita.
//  "👋 Chamar para minha vila": chamados/{uid} com vila: true (1 por vizinho a cada 2 min).
// ============================================================
let VILA = null;              // vila.json
let vilaVolta = null;         // de onde veio pelo 🏠 ({ n, x, y, dir }); null = Praça
let vizinhos = {};            // os meus: { uid: { lado, ts, nome, turma } } (ao vivo)
let vilaCheia = false, pararVizinhos = null, pararConvitesVila = null;
const convitesVistos = new Set();
const DIA_MS = 864e5;
const ehVila = () => cena?.n === 'vila';
const cfgViz = () => VILA?.vizinhos || {};
const corCasa = (c) => ((VILA?.cores || []).includes(c) ? c : VILA?.cor_padrao || 'azul');
const imgCasaVila = (cor) => `${IMG}/vila/${String(VILA.casa?.imagem || 'casa_{cor}.webp').replace('{cor}', cor)}`;
const LADOS = ['esquerda', 'direita'];
const podeVizinho = (turmaOutro) => entraNoRanking() && !desafiosOff?.todas && !desafiosOff?.[sessao.turma] && !desafiosOff?.[turmaOutro];
const VIZINHOS_FALSOS = {
  TESTE_vizinho_1: { lado: 'esquerda', nome: 'Ana', turma: '8E', online: true, cor: 'rosa', pet: { pet: 'gato', forma: 'gato', tinta: null } },
  TESTE_vizinho_2: { lado: 'direita', nome: 'João', turma: '8D', cor: 'verde', pet: { pet: 'tigre', forma: 'tigre', tinta: null } },
};
const meusVizinhos = () => (vilaCheia ? VIZINHOS_FALSOS : vizinhos);

// onde: 'entrada' (placa da Praça) · { casa: true } (🏠 do HUD: na frente da minha porta) · { lado } (saiu daquela casinha)
// + { dono, nome, viz } (PROMPT-111): a vila de outro (viz = os vizinhos dele; sem viz, lê agora); sem dono = a minha
async function abrirVila(onde = 'entrada') {
  if (!VILA || !carregouProgresso) return;
  let dono = onde?.dono && onde.dono !== sessao.uid ? onde.dono : null, viz = onde?.viz || null;
  if (dono && !viz) {
    try { const s = await get(ref(db, `${basePraca()}/vila/${dono}/vizinhos`)); viz = s.exists() ? s.val() || {} : {}; }
    catch (e) { console.warn('[jogo-revisao] vila do vizinho indisponível', e?.code || e); viz = {}; }
  }
  if (dono && !viz?.[sessao.uid]) { dono = null; avisoPet('🏘️ Você não é mais vizinho dessa vila.'); }   // deixou de ser: a minha
  const nomeDono = dono ? nomeVisivel(onde.nome || vizinhos[dono]?.nome) || 'vizinho' : '';
  sairPesca(false);
  cena = null;
  esconderBalao();
  fecharCartaoColega();
  fecharBalaoVila();
  $('btn-revanche').hidden = true;
  $('cena-aviso').hidden = true;
  $('cena-atores').innerHTML = '';
  if (dono) $('cena-titulo').innerHTML = `🏘️ Vila de <b>${esc(nomeDono)}</b>`;
  else $('cena-titulo').textContent = '🏘️ Vila das Casinhas';
  $('btn-cena-voltar').textContent = dono ? '⬅ Minha vila' : vilaVolta && vilaVolta.n !== 'praca' ? `⬅ Mapa ${vilaVolta.n}` : '⬅ Praça';
  $('btn-cena-voltar').hidden = false;
  $('tela-cena').classList.remove('jr-no-ginasio');
  mostrarTela('tela-cena');
  $('cena-palco').style.visibility = 'hidden';
  limparPessoas();
  sairDoMapaOnline();
  const [grade] = await Promise.all([carregarGrade(VILA.trilha || 'trilha-vila.png'), trocarFundo(`${IMG}/vila/${VILA.imagem || 'vila.webp'}`)]);
  const naTrilha = (x, y) => centroCelula(celulaMaisProxima(grade, x, y));
  const s = VILA.saida_praca || {}, sx = s.x ? (s.x[0] + s.x[1]) / 2 : VILA.entrada[0], sy = Math.min(H - 4, (s.y_min || 755) + 6);
  cena = { tipo: 'mapa', n: 'vila', cfg: { entrada: VILA.entrada, saidas: [[sx, sy]] }, grade, portas: {}, naTrilha, saidas: [{ x: sx, y: sy, trilha: naTrilha(sx, sy) }] };
  cena.casas = Object.entries(VILA.casas || {}).map(([lado, c]) => ({ lado, porta: c.porta, trilha: naTrilha(c.porta[0], c.porta[1] + 10) }));
  cena.vila = { dono: dono || sessao.uid, minha: !dono, nome: nomeDono, viz: dono ? viz : null };
  destinoEspecial = null;
  alvoMapa = null;
  pertoSaidaGin = false;
  const casa = onde?.casa ? 'meio' : onde?.lado;
  const cs0 = casa && cena.casas.find(c => c.lado === casa);
  if (cs0) posicionarJogador(cs0.trilha[0], cs0.trilha[1] + 6, 'frente');
  else posicionarJogador(VILA.entrada[0], VILA.entrada[1], 'costas');
  soltouDesdeTroca = false;
  if (vilaCheia && !dono) cena.falso = vizinhoAndando();   // ?vila=cheia: a Ana falsa anda pela vila
  desenharVila();
  ajustarCamera();
  $('cena-palco').style.visibility = '';
  entrarNoMapaOnline('vila', cena.vila.dono);   // ao vivo: quem está nesta vila (PROMPT-111)
  atualizarBotaoPet();
  carregarDadosVila();   // cores, pets e quem está online (a casa aparece já; os detalhes chegam depois)
}

// as 3 casas: a casa (escala e âncora do json, a porta em cima de casas.*.porta), o rótulo, a janela acesa e o pet na porta
// na vila de outro (PROMPT-111): o dono no meio, os vizinhos dele nos lados (um deles sou eu)
const vizDaVila = () => (cena.vila?.minha === false ? cena.vila.viz || {} : meusVizinhos());
function quemMora(lado) {
  const V = cena.vila || { minha: true }, eu = { eu: true, uid: sessao.uid, nome: 'Você', cor: corCasa(estado.casinha?.cor) };
  let uid, v;
  if (lado === 'meio') { if (V.minha) return eu; uid = V.dono; v = { nome: V.nome }; }
  else {
    const e = Object.entries(vizDaVila()).find(([, x]) => x?.lado === lado);
    if (!e) return null;
    [uid, v] = e;
    if (uid === sessao.uid) return eu;
  }
  const d = cena.dadosVila?.[uid] || {}, aqui = colegas.has(uid);   // aqui: andando nesta vila agora
  return { uid, nome: nomeVisivel(v.nome || d.nome) || 'Vizinho', turma: v.turma || d.turma, cor: corCasa(v.cor || d.cor), online: !!(v.online || d.online || aqui), aqui, pet: v.pet || d.pet };
}
function desenharVila() {
  const atores = $('cena-atores');
  for (const el of atores.querySelectorAll('.vila-casa, .vila-rotulo, .vila-pet')) el.remove();
  for (const o of cena.petsVila || []) o.anim = null;
  cena.petsVila = [];
  const C = VILA.casa || {}, k = Number(C.escala) || 0.9, [ax, ay] = C.ancora || [189, 430];
  let html = '';
  for (const c of cena.casas) {
    const q = quemMora(c.lado), cor = q ? q.cor : VILA.cor_disponivel || 'cinza';
    c.quem = q;
    const [px, py] = c.porta;
    html += `<div class="vila-casa${q?.online ? ' online' : ''}" data-lado="${c.lado}" style="left:${px - ax * k}px;top:${py - ay * k}px;width:${374 * k}px;height:${430 * k}px;z-index:${Math.round(py)}">
      <img src="${imgCasaVila(cor)}" alt="" draggable="false"/><i class="vila-janela e"></i><i class="vila-janela d"></i></div>
      <div class="jr-rotulo-porta jr-rotulo-praca vila-rotulo" style="left:${px}px;top:${py - 104}px"><span>${q ? `🏠 ${esc(q.nome)}` : '🏡 Disponível'}</span></div>`;
  }
  atores.insertAdjacentHTML('beforeend', html);
  // o pet do vizinho, sentado ao lado da porta, com a tinta dele (se o morador está andando aqui, o pet está com ele)
  for (const c of cena.casas) {
    const p = c.quem && !c.quem.eu && !c.quem.aqui ? c.quem.pet : null, pet = p && petValido(petAtual(p.pet)) ? petAtual(p.pet) : null;
    if (!pet) continue;
    const forma = formaValida(pet, p.forma), img = document.createElement('img');
    img.className = 'jr-ator jr-pet vila-pet'; img.alt = ''; img.draggable = false;
    const [px, py] = c.porta, alt = altImagemPet(forma) * ESCALA_ATORES;
    Object.assign(img.style, { left: px + 52 + 'px', top: py + 6 + 'px', height: alt + 'px', zIndex: Math.round(py + 6) });
    atores.appendChild(img);
    const anim = new PetParado(img);
    anim.definir(forma);
    aplicarTinta(img, p.tinta || null, true);
    cena.petsVila.push({ img, anim });
  }
}
async function carregarDadosVila() {
  const n = cena, V = cena.vila;
  const uids = (V.minha ? Object.keys(vilaCheia ? {} : vizinhos) : [V.dono, ...Object.keys(V.viz || {})]).filter(u => u !== sessao.uid);
  if (!uids.length) return;
  const [copias, online] = await Promise.all([
    Promise.all(uids.map(u => get(ref(db, `${basePraca()}/casinhas/${u}`)).then(s => (s.exists() ? s.val() : null)).catch(() => null))),
    lerTodos().catch(() => ({})),
  ]);
  if (cena !== n) return;
  cena.dadosVila = {};
  uids.forEach((u, i) => {
    const c = copias[i] || {}, r = online[u];
    const on = !!r && Date.now() - (Number(r.ts) || 0) < VALIDADE_MS;
    cena.dadosVila[u] = { nome: c.nome, turma: c.turma, cor: c.cor, online: on, pet: (c.pet && !(Number(c.pet.fora_ate) > Date.now()) ? c.pet : null) || (r?.pet && !r.pet_fora ? { pet: r.pet, forma: r.pet_forma, tinta: r.pet_tinta } : null) };   // 🧭 fora: sem pet na porta
  });
  desenharVila();
}
function atualizarVila(dt) {
  for (const o of cena.petsVila || []) o.anim?.atualizar(dt);
  posicionarBalaoVila();
  if (cena.falso) andarVizinhoFalso(dt);
}
// colegas ao vivo na vila (PROMPT-111): os registros com local = dono desta vila (+ o vizinho falso do ?vila=cheia)
function receberColegasVila(regs) {
  if (!ehVila() || !cena.vila) return;
  cena.regsVila = regs;
  const tudo = Object.fromEntries(Object.entries(regs).filter(([u]) => u !== UID_PROFESSORA));   // a professora não aparece na vila
  if (cena.falso) tudo[cena.falso.uid] = cena.falso.reg;
  const antes = [...colegas.keys()].sort().join();
  receberColegas('vila', tudo, cena.vila.dono);
  if ([...colegas.keys()].sort().join() !== antes) desenharVila();   // chegou ou saiu um morador: janela e pet na porta
}
// ?vila=cheia: a Ana falsa (TESTE_vizinho_1) anda pela trilha como um colega ao vivo
function vizinhoAndando() {
  const uid = Object.keys(VIZINHOS_FALSOS)[0], v = VIZINHOS_FALSOS[uid], c = cena.casas.find(x => x.lado === v.lado) || cena.casas[0];
  return { uid, caminho: [], espera: 1, t: 0, x: c.trilha[0], y: c.trilha[1] + 8, dir: 'frente',
    reg: { apelido: v.nome, turma: v.turma, personagem: PERS.padrao, pet: v.pet.pet, pet_forma: v.pet.forma, mapa: 'vila', local: sessao.uid, x: c.trilha[0], y: c.trilha[1] + 8, dir: 'frente', ts: Date.now() } };
}
function andarVizinhoFalso(dt) {
  const f = cena.falso, g = cena.grade;
  if (f.caminho.length) {
    let anda = VEL * 0.8 * dt;
    while (anda > 0 && f.caminho.length) {
      const [qx, qy] = f.caminho[0], dx = qx - f.x, dy = qy - f.y, d = Math.hypot(dx, dy);
      if (d > 0.5) f.dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'direita' : 'esquerda') : (dy > 0 ? 'frente' : 'costas');
      if (d <= anda) { f.x = qx; f.y = qy; anda -= d; f.caminho.shift(); }
      else { f.x += dx / d * anda; f.y += dy / d * anda; anda = 0; }
    }
    if (!f.caminho.length) f.espera = 2 + Math.random() * 3;
  } else if ((f.espera -= dt) <= 0) {
    let fim = -1;
    for (let i = 0; i < 40 && fim < 0; i++) { const k = Math.floor(Math.random() * GW * GH); if (g[k]) fim = k; }
    const ini = celulaMaisProxima(g, f.x, f.y), cells = ini >= 0 && fim >= 0 ? aEstrela(g, ini, fim) : null;
    if (cells) f.caminho = suavizar(g, cells.map(centroCelula)); else f.espera = 1;
  }
  if ((f.t += dt) < 0.25) return;   // como um colega de verdade: 4 envios por segundo
  f.t = 0;
  f.reg = { ...f.reg, x: Math.round(f.x), y: Math.round(f.y), dir: f.dir, ts: Date.now() };
  receberColegasVila(cena.regsVila || {});
}

// toque: na porta (ou andando até ela) entra; no resto da casa, o balão (minha: cor do telhado; vizinho: visitar / deixar)
function casaVilaEm(p) {
  const C = VILA.casa || {}, k = Number(C.escala) || 0.9, [ax, ay] = C.ancora || [189, 430];
  for (const c of cena.casas || []) {
    const [px, py] = c.porta, x0 = px - ax * k, y0 = py - ay * k;
    if (p.x >= x0 && p.x <= x0 + 374 * k && p.y >= y0 && p.y <= py + 12) return { c, porta: Math.abs(p.x - px) < 48 && p.y > py - 95 };
  }
  return null;
}
function tocarCasaVila(p) {
  const r = casaVilaEm(p);
  if (!r) return false;
  destinoEspecial = null;
  if (r.porta || !r.c.quem || !cena.vila.minha) irAoDestino(destinosDoMapa().find(d => d.alvo === 'vila:' + r.c.lado));   // Disponível: qualquer toque leva ao convite · vila de outro: a porta
  else balaoVila(r.c);
  return true;
}
function entrarCasaVila(lado) {
  const c = cena.casas.find(x => x.lado === lado);
  if (!c) return;
  jog.dir = 'costas'; desenharJogador();
  const q = quemMora(lado), V = cena.vila, volta = { n: 'vila', lado, dono: V.minha ? null : V.dono, nomeDono: V.nome };   // a casinha volta para esta vila
  if (!q) { if (V.minha) abrirBuscaVizinho(); else avisoPet('🏡 Esta casa está disponível.'); return; }
  if (q.eu) { transicao(() => abrirCasinha(null, volta)); return; }
  if (vilaCheia && V.minha) { avisoPet('Modo ?vila=cheia: vizinho de mentira, sem casinha.'); return; }
  visitarCasinha(q.uid, volta);
}

// ── balão sobre a casa ──
let balaoVilaC = null;
function balaoVila(c, passo = '') {
  const el = $('vila-balao'), q = c.quem;
  if (!q) return;
  let html;
  if (q.eu) html = `<b>🎨 Cor do telhado</b><div class="vila-cores">${(VILA.cores || []).map(cor => `<button class="vila-cor${corCasa(estado.casinha?.cor) === cor ? ' sel' : ''}" data-vila-cor="${cor}" aria-label="${cor}" style="--cor:var(--vila-${cor})"></button>`).join('')}</div>`;
  else if (passo === 'deixar') html = `<span>Deixar de ser vizinho de <b>${esc(q.nome)}</b>?</span><div class="jr-pessoa-botoes"><button class="jr-btn jr-btn-sec" data-vila="nao">Não</button><button class="jr-btn" data-vila="sim">📦 Sim, deixar</button></div>`;
  else html = `<b>🏠 ${esc(q.nome)}</b>${q.online ? '<span>🟢 Online agora</span>' : ''}<div class="jr-pessoa-botoes vila-botoes"><button class="jr-btn jr-btn-ouro" data-vila="visitar">🏠 Visitar a casinha</button>` +
    `<button class="jr-btn" data-vila="ir">🏘️ Ir à vila de ${esc(q.nome)}</button>` +
    (q.online && !q.aqui && podeVizinho(q.turma) ? `<button class="jr-btn" data-vila="chamar">👋 Chamar para minha vila</button>` : '') +
    `<button class="jr-btn jr-btn-sec" data-vila="deixar">📦 Deixar de ser vizinho</button></div>`;
  el.innerHTML = html;
  el.hidden = false;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  clearTimeout(balaoVilaC?.timer);
  balaoVilaC = { c, timer: setTimeout(fecharBalaoVila, 9000) };
  posicionarBalaoVila();
}
function posicionarBalaoVila() {
  if (!balaoVilaC || $('vila-balao').hidden) return;
  const C = VILA.casa || {}, k = Number(C.escala) || 0.9, [, ay] = C.ancora || [189, 430];
  posicionarNaTela($('vila-balao'), balaoVilaC.c.porta[0], balaoVilaC.c.porta[1] - ay * k * 0.55);
}
function fecharBalaoVila() {
  if (balaoVilaC) clearTimeout(balaoVilaC.timer);
  balaoVilaC = null;
  if ($('vila-balao')) $('vila-balao').hidden = true;
}
function cliqueBalaoVila(e) {
  e.stopPropagation();
  const c = balaoVilaC?.c;
  if (!c) return;
  const cor = e.target.closest('[data-vila-cor]')?.dataset.vilaCor, b = e.target.closest('[data-vila]')?.dataset.vila;
  if (cor) { escolherCorTelhado(cor); return; }
  if (b === 'visitar') { fecharBalaoVila(); irAoDestino(destinosDoMapa().find(d => d.alvo === 'vila:' + c.lado)); }
  else if (b === 'ir') { fecharBalaoVila(); irVilaDe(c.quem.uid, c.quem.nome); }
  else if (b === 'chamar') { fecharBalaoVila(); chamarParaVila(c.quem); }
  else if (b === 'deixar') balaoVila(c, 'deixar');
  else if (b === 'nao') fecharBalaoVila();
  else if (b === 'sim') { fecharBalaoVila(); deixarDeSerVizinho(c.quem.uid); }
}
// 🏘️ ir à vila de um vizinho (PROMPT-111): só se eu ainda estou entre os vizinhos dele (o dono pode estar offline)
async function irVilaDe(uid, nome) {
  if (!uid || transicionando) return;
  if (vilaCheia && VIZINHOS_FALSOS[uid]) { avisoPet('Modo ?vila=cheia: vizinho de mentira, sem vila.'); return; }
  let viz = null;
  try { const s = await get(ref(db, `${basePraca()}/vila/${uid}/vizinhos`)); viz = s.exists() ? s.val() || {} : {}; }
  catch (e) { console.warn('[jogo-revisao] vila do vizinho indisponível', e?.code || e); avisoPet('Não deu para ir agora. Tente de novo.'); return; }
  if (!viz[sessao.uid]) { avisoPet('🏘️ Só os vizinhos podem ir a essa vila.'); return; }
  transicao(() => abrirVila({ dono: uid, nome, viz }));
}
// 👋 chamar um vizinho online para a minha vila: 1 por vizinho a cada 2 min; desafios desligados numa das turmas: nada
const CHAMAR_VILA_MS = 120000, chamadasVila = new Map();
async function chamarParaVila(q) {
  if (!q?.uid || !podeVizinho(q.turma)) return;
  if (vilaCheia && VIZINHOS_FALSOS[q.uid]) { avisoPet('Modo ?vila=cheia: nada foi enviado.'); return; }
  if (Date.now() - (chamadasVila.get(q.uid) || 0) < CHAMAR_VILA_MS) { avisoPet(`Você já chamou ${q.nome}. Espere um pouquinho para chamar de novo.`); return; }
  const meu = { de: sessao.uid, de_nome: nomeRanking(), de_turma: sessao.turma || '', ts: agoraServ(), vila: true };
  if (!(await gravarChamado(q.uid, q.nome, meu))) return;
  chamadasVila.set(q.uid, Date.now());
  esperarRespostaChamado(q.uid, q.nome, meu.ts);
  tocar('clique');
  avisoPet(`👋 Chamado enviado para ${q.nome}.`);
}
// 🎨 a cor do telhado: casinha/cor e na cópia pública
function escolherCorTelhado(cor) {
  if (!(VILA.cores || []).includes(cor)) return;
  const c = estado.casinha;
  c.cor = cor;
  if (!casaSemGravar) {
    gravar({ 'casinha/cor': cor });
    if (c.publicada) update(ref(db, `${basePraca()}/casinhas/${sessao.uid}`), { cor }).catch(e => console.warn('[jogo-revisao] cor na cópia pública', e?.code || e));
  }
  tocar('clique');
  const lado = balaoVilaC?.c.lado;
  desenharVila();
  const c2 = cena.casas.find(x => x.lado === lado);
  if (c2) balaoVila(c2);
}

// ── 🏡 Vizinhos: ao vivo (os meus e os convites para mim) ──
function ouvirVila() {
  if (!VILA || !carregouProgresso || !entraNoRanking() || pararVizinhos) return;
  try {
    pararVizinhos = onValue(ref(db, `${basePraca()}/vila/${sessao.uid}/vizinhos`), (snap) => {
      vizinhos = snap.exists() ? snap.val() || {} : {};
      conferirVizinhosNovos();
      if (ehVila()) { desenharVila(); carregarDadosVila(); }
    }, () => {});
    pararConvitesVila = onValue(ref(db, `${basePraca()}/vila_convites/${sessao.uid}`), (snap) => {
      for (const [uid, cv] of Object.entries(snap.exists() ? snap.val() || {} : {})) receberConviteVila(uid, cv);
    }, () => {});
  } catch (e) { console.warn('[jogo-revisao] vila indisponível', e?.code || e); }
}
// chegou vizinho novo: "Agora vocês são vizinhos!"; saiu um: aviso neutro (sem dizer quem nem por quê)
function conferirVizinhosNovos() {
  const c = estado.casinha, vistos = { ...(c.vizinhos_vistos || {}) };
  let mudou = false;
  for (const uid of Object.keys(vizinhos)) if (!vistos[uid]) { vistos[uid] = true; mudou = true; avisoPet('🏡 Agora vocês são vizinhos!', true); }
  for (const uid of Object.keys(vistos)) if (!vizinhos[uid]) { delete vistos[uid]; mudou = true; avisoPet('🏡 A casa ao lado ficou disponível.'); }
  if (mudou) { c.vizinhos_vistos = vistos; gravar({ 'casinha/vizinhos_vistos': Object.keys(vistos).length ? vistos : null }); }
}
// convite recebido: um cartão por vez (Aceitar / Recusar); vencido some sozinho
const filaConvitesVila = [];
function receberConviteVila(uid, cv) {
  if (!cv || convitesVistos.has(uid)) return;
  const no = ref(db, `${basePraca()}/vila_convites/${sessao.uid}/${uid}`);
  if (agoraServ() - (Number(cv.ts) || 0) > (cfgViz().convite_expira_dias ?? 3) * DIA_MS || vizinhos[uid] || !visivelNoRanking(uid, cv)) { convitesVistos.add(uid); remove(no).catch(() => {}); return; }
  if (!podeVizinho(cv.turma)) return;   // desafios desligados pela professora: o convite espera (ou vence)
  convitesVistos.add(uid);
  filaConvitesVila.push({ uid, ...cv });
  mostrarConviteVila();
}
function mostrarConviteVila() {
  if (!$('vila-convite').hidden || !filaConvitesVila.length) return;
  if (perguntaAberta || transicionando || sobreposicaoAberta()) { setTimeout(mostrarConviteVila, 2000); return; }
  const cv = filaConvitesVila[0], turma = nomeVisivel(cv.turma || '');
  $('vila-conv-txt').innerHTML = `🏡 <b>${esc(nomeVisivel(cv.nome) || 'Um colega')}</b>${turma ? ` (${esc(turma)})` : ''} te convidou para ser vizinho!`;
  $('vila-convite').hidden = false;
}
async function responderConviteVila(aceitar) {
  const cv = filaConvitesVila.shift();
  $('vila-convite').hidden = true;
  if (!cv) return;
  const base = basePraca(), no = ref(db, `${base}/vila_convites/${sessao.uid}/${cv.uid}`);
  if (!aceitar) { remove(no).catch(() => {}); setTimeout(mostrarConviteVila, 400); return; }   // quem convidou não é avisado
  if (!podeVizinho(cv.turma)) { avisoPet('Os convites estão pausados agora.'); setTimeout(mostrarConviteVila, 400); return; }
  const max = cfgViz().max ?? 2, agora = agoraServ();
  // transação nos dois lados: os dois ainda têm vaga? (se o 2º não tiver, desfaz o 1º)
  const entra = (outro, dados) => (cur) => {
    cur = cur || {};
    if (cur[outro]) return cur;
    if (Object.keys(cur).length >= max) return undefined;
    const lado = LADOS.find(l => !Object.values(cur).some(v => v?.lado === l));
    if (!lado) return undefined;
    cur[outro] = { lado, ts: agora, ...dados };
    return cur;
  };
  try {
    const t1 = await runTransaction(ref(db, `${base}/vila/${sessao.uid}/vizinhos`), entra(cv.uid, { nome: cv.nome || '', turma: cv.turma || '' }));
    if (!t1.committed) { remove(no).catch(() => {}); avisoPet('🏡 Sua vila já está cheia: deixe de ser vizinho de alguém para aceitar.'); return; }
    const t2 = await runTransaction(ref(db, `${base}/vila/${cv.uid}/vizinhos`), entra(sessao.uid, { nome: nomeRanking(), turma: sessao.turma || '' }));
    if (!t2.committed) {
      await remove(ref(db, `${base}/vila/${sessao.uid}/vizinhos/${cv.uid}`));
      remove(no).catch(() => {});
      avisoPet('🏡 Não deu para aceitar: esse convite não vale mais.');
      return;
    }
    await remove(no);
    vizinhos = { ...vizinhos, [cv.uid]: t1.snapshot.val()?.[cv.uid] };
    conferirVizinhosNovos();   // "🏡 Agora vocês são vizinhos!" (uma vez)
    if (ehVila()) { desenharVila(); carregarDadosVila(); }
    tocar('vitoria');
  } catch (e) {
    console.warn('[jogo-revisao] não deu para aceitar o convite', e?.code || e);
    avisoPet('Não deu para aceitar agora. Tente de novo.');
  } finally { setTimeout(mostrarConviteVila, 600); }
}

// convidar: confere as regras e grava vila_convites/{convidado}/{eu}
async function convidarVizinho(uid, nome, turma) {
  const cfg = cfgViz(), max = cfg.max ?? 2, agora = agoraServ(), c = estado.casinha, base = basePraca();
  if (!uid || uid === sessao.uid || vizinhos[uid]) return;
  if (!podeVizinho(turma)) { avisoPet('Os convites estão pausados agora.'); return; }
  if (Object.keys(vizinhos).length >= max) { avisoPet(`🏡 Sua vila já tem ${max} vizinhos.`); return; }
  const enviados = { ...(c.convites || {}) }, ts = Number(enviados[uid]) || 0;
  const expira = (cfg.convite_expira_dias ?? 3) * DIA_MS, de_novo = ts + expira + (cfg.reconvidar_dias ?? 7) * DIA_MS;
  if (ts && agora - ts < expira) { avisoPet('📨 Você já convidou essa pessoa. Espere a resposta!'); return; }
  if (ts && agora < de_novo) { const d = Math.ceil((de_novo - agora) / DIA_MS); avisoPet(`Você poderá convidar de novo em ${d} dia${d === 1 ? '' : 's'}.`); return; }
  try {
    // pendentes: os enviados que ainda esperam resposta (o convite existe e não venceu)
    const recentes = Object.entries(enviados).filter(([u, t]) => u !== uid && agora - Number(t) < expira);
    const ainda = await Promise.all(recentes.map(([u]) => get(ref(db, `${base}/vila_convites/${u}/${sessao.uid}`)).then(s => s.exists()).catch(() => true)));
    if (ainda.filter(Boolean).length >= (cfg.convites_pendentes_max ?? 3)) { avisoPet(`📨 Você já tem ${cfg.convites_pendentes_max ?? 3} convites esperando resposta.`); return; }
    const s = await get(ref(db, `${base}/vila/${uid}/vizinhos`));
    if (s.exists() && Object.keys(s.val() || {}).length >= max) { avisoPet('🏡 Não dá para convidar essa pessoa agora.'); return; }   // neutro: não conta quantos vizinhos ela tem
    await set(ref(db, `${base}/vila_convites/${uid}/${sessao.uid}`), { nome: nomeRanking(), turma: sessao.turma || '', ts: agora });
    enviados[uid] = agora;
    for (const [u, t] of Object.entries(enviados)) if (agora - Number(t) > expira + (cfg.reconvidar_dias ?? 7) * DIA_MS) delete enviados[u];   // os velhos saem
    c.convites = enviados;
    gravar({ 'casinha/convites': enviados });
    tocar('acerto');
    avisoPet(`📨 Convite enviado para ${nomeVisivel(nome) || 'o colega'}!`);
  } catch (e) {
    console.warn('[jogo-revisao] não deu para convidar', e?.code || e);
    avisoPet('Não deu para convidar agora. Tente de novo.');
  }
}
// cartão do colega: "🏡" só se os dois têm vaga, ainda não são vizinhos e os convites estão ligados
async function botaoConvidarNoCartao(c, el) {
  if (!VILA || !c?.uid || vizinhos[c.uid] || !podeVizinho(c.reg?.turma) || Object.keys(vizinhos).length >= (cfgViz().max ?? 2)) return;
  try {
    const s = await get(ref(db, `${basePraca()}/vila/${c.uid}/vizinhos`));
    if (s.exists() && Object.keys(s.val() || {}).length >= (cfgViz().max ?? 2)) return;
  } catch (_) { return; }
  if (cartaoColega?.c !== c || el.querySelector('[data-vizinho]')) return;
  el.querySelector('[data-oi]')?.insertAdjacentHTML('beforebegin', '<button class="jr-colega-oi" data-vizinho aria-label="Convidar para ser vizinho" title="Convidar para ser vizinho">🏡</button>');
}
// casa Disponível: busca de colegas por nome (todas as turmas)
function abrirBuscaVizinho() {
  if (!entraNoRanking()) { avisoPet('🏡 Esta casa está disponível.'); return; }
  if (vilaCheia) { avisoPet('Modo ?vila=cheia: as duas casas já têm vizinhos de mentira.'); return; }
  if (desafiosOff?.todas || desafiosOff?.[sessao.turma]) { avisoPet('🏡 Os convites estão pausados agora.'); return; }
  $('vila-busca-txt').value = '';
  renderBuscaVizinho();
  $('vila-busca').hidden = false;
}
const uidAluno = (turma, nome) => (turma + '_' + nome).replace(/[.#$[\]/\s]/g, '_');
function renderBuscaVizinho() {
  const q = String($('vila-busca-txt').value || '').trim().toLowerCase();
  const sem = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const lista = [];
  if (q.length >= 2) for (const [turma, nomes] of Object.entries(ALUNOS_POR_TURMA)) {
    if (!TURMAS_PLACAR.includes(turma)) continue;
    for (const nome of nomes) {
      const uid = uidAluno(turma, nome);
      if (uid === sessao.uid || ALUNOS_TESTE.includes(uid) || /PROFESSOR|TESTE/i.test(nome) || !sem(nome.toLowerCase()).includes(sem(q))) continue;
      lista.push({ uid, nome, turma });
    }
  }
  $('vila-busca-lista').innerHTML = q.length < 2 ? '<li class="cs-curt-vazio">Digite pelo menos 2 letras do nome.</li>'
    : lista.slice(0, 20).map(a => `<li><b>${esc(a.nome)}</b><span class="cs-curt-n">${esc(a.turma)}</span>${vizinhos[a.uid] ? '<em>vizinho</em>'
      : desafiosOff?.[a.turma] ? '<em>pausado</em>' : `<button class="jr-btn" data-convidar="${esc(a.uid)}" data-nome="${esc(a.nome)}" data-turma="${esc(a.turma)}">🏡 Convidar</button>`}</li>`).join('')
      || '<li class="cs-curt-vazio">Ninguém com esse nome.</li>';
}
// deixar de ser vizinho: apaga dos dois lados; uma vez a cada mudar_dias
async function deixarDeSerVizinho(uid) {
  const c = estado.casinha, dias = cfgViz().mudar_dias ?? 7, falta = (Number(c.mudou) || 0) + dias * DIA_MS - agoraServ();
  if (vilaCheia) { avisoPet('Modo ?vila=cheia: nada foi gravado.'); return; }
  if (falta > 0) { const d = Math.ceil(falta / DIA_MS); avisoPet(`Você poderá se mudar em ${d} dia${d === 1 ? '' : 's'}.`); return; }
  try {
    const base = basePraca();
    await Promise.all([remove(ref(db, `${base}/vila/${sessao.uid}/vizinhos/${uid}`)), remove(ref(db, `${base}/vila/${uid}/vizinhos/${sessao.uid}`))]);
    const v = { ...vizinhos }; delete v[uid]; vizinhos = v;
    c.mudou = agoraServ();
    const vistos = { ...(c.vizinhos_vistos || {}) }; delete vistos[uid];   // eu saí: sem aviso para mim
    c.vizinhos_vistos = vistos;
    gravar({ 'casinha/mudou': c.mudou, 'casinha/vizinhos_vistos': Object.keys(vistos).length ? vistos : null });
    avisoPet('📦 Pronto: a casa ao lado ficou disponível.');
    if (ehVila()) desenharVila();
  } catch (e) {
    console.warn('[jogo-revisao] não deu para deixar de ser vizinho', e?.code || e);
    avisoPet('Não deu agora. Tente de novo.');
  }
}
function ligarVila() {
  $('vila-balao').addEventListener('click', cliqueBalaoVila);
  $('vila-convite').addEventListener('click', (e) => { const b = e.target.closest('[data-conv]'); if (b) responderConviteVila(b.dataset.conv === 'aceitar'); });
  $('vila-busca-txt').addEventListener('input', renderBuscaVizinho);
  $('vila-busca').addEventListener('click', (e) => {
    if (e.target === $('vila-busca') || e.target.closest('[data-fechar="vila-busca"]')) { $('vila-busca').hidden = true; return; }
    const b = e.target.closest('[data-convidar]');
    if (b) { $('vila-busca').hidden = true; convidarVizinho(b.dataset.convidar, b.dataset.nome, b.dataset.turma); }
  });
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
  $('btn-reacao').hidden = true;
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
  reagirSeguidor('rapida', 'feliz', 1200);
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
  const moedasLivres = () => Math.max(0, comMult(cfg.moedas_cavar_dia ?? 15) - (Number(cav.moedas) || 0));
  const darMoedas = (q, semLimite = false) => { const g = semLimite ? q : Math.min(q, moedasLivres()); if (!semLimite) cav.moedas = (Number(cav.moedas) || 0) + g; ps.moedas = (Number(ps.moedas) || 0) + g; patch['pets/moedas'] = ps.moedas; registrarGanho(semLimite ? 'colecao' : 'cavar', g, patch); return g; };
  if (a.tipo === 'moedas') {
    const g = darMoedas(comMult(qtdDe(a.qtd)));
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
      const g = darMoedas(comMult(cfg.repetida_moedas ?? 5), true);
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
      const g = darMoedas(comMult(cfg.repetida_moedas ?? 5), true);
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
  if (raro && onde === 'tesouro') reagirSeguidor('rapida', 'feliz', 1500);
}
function completarGrupo(grupo, patch) {
  const doGrupo = (CAVAR.colecao || []).filter(c => c.grupo === grupo);
  if (estado.colecaoGrupos?.[grupo] || !doGrupo.every(c => estado.colecao?.[c.id])) return;
  const n = comMult(cfgCavar().grupo_completo_moedas ?? 20);
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
  return `<div class="mp-album-topo">📖 Coleção: <b>${achadas}/${total}</b> · completar um grupo dá ${comMult(cfgCavar().grupo_completo_moedas ?? 20)} 🪙</div>` + grupos.map(g => {
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
const podeBatalhar = () => petsOk && batalhasProntas() && carregouProgresso && !!estado?.pets?.ativo && !petFora();   // em expedição: como sem pet
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
  $('bt-lista-dia').innerHTML = `prêmios de hoje ${dia.moedas}/${lim.moedas != null ? comMult(lim.moedas) : '∞'} ${moedaHtml()}`;
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
  const fL = $('bt-L'), [qw, qh] = tamanhoQuadro(bt.forma), adulto = ehFormaAdulta(bt.forma);
  fL.style.setProperty('--pet-quadro', `${qw} / ${qh}`);
  fL.style.setProperty('--cresce', fatorForma(bt.pet, bt.forma));
  fL.style.setProperty('--rel', relDuelo(bt.forma));   // adulto: o maior que couber na arena (CSS, PROMPT-81)
  fL.classList.toggle('adulto', adulto);
  fL.querySelector('.jr-fala-vitoria')?.remove();   // balão da comemoração da batalha anterior
  const fR = $('bt-R'), formaR = t.pet, [qwR, qhR] = tamanhoQuadro(formaR);   // o pet do treinador (hoje sempre filhote; adulto teria o mesmo cuidado)
  fR.style.setProperty('--pet-quadro', `${qwR} / ${qhR}`);
  fR.classList.toggle('adulto', ehFormaAdulta(formaR));
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
  $('bt-calc').hidden = true;   // batalha com treinador: sem 🧮 (PROMPT-94; a calculadora fica só nas perguntas dos ginásios)
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
  pararSequencia($('bt-imgL')); pararSequencia($('bt-imgR'));
  (bt.sons || []).forEach(s => s.parar(200)); bt.sons = [];   // saiu da batalha: o som para com fade
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
  pararSequencia(img);
  if (!loop && fs.length === 1 && EMOCOES.has(nomeReal)) ms = Math.max(ms, MS_EMOCAO);   // emoção de 1 quadro: 1,5 s
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
// ── Sons dos pets (PROMPT-88): arquivos em /audio/jogo/, tocados por sons.js (respeitam o 🔊) ──
// rugido da cor do dragão de BASE (PROMPT-84): o vermelho colorido ruge como o vermelho
const somRugido = (pet, opc) => tocarArquivo(`dragao_${/^dragao_vermelho/.test(pet || '') ? 'vermelho' : 'azul'}_rugido`, opc);
// ataque de um pet no momento do golpe: dragão filhote = rugido da cor cortado em 1,5 s; os outros, {pet}_ataque
const somAtaque = (pet) => (/^dragao_/.test(pet || '') ? somRugido(pet, { ate_ms: 1500, fade: 250 }) : tocarArquivo(`${pet}_ataque`));
// som que acompanha um trecho de uma sequência do sprites.json: começa no 1º passo `de` e para (fade) no 1º passo `ate`
// depois dele (sem `ate`: toca até o fim do arquivo). Mesmos tempos de tocarSequencia (msAtePasso, com o mesmo deFrente).
function somNaSequencia(nome, forma, seq, de, ate, { fade = 200, deFrente = true } = {}) {
  const total = msAtePasso(forma, seq, () => false, { deFrente });
  const t0 = msAtePasso(forma, seq, ([a]) => a === de, { deFrente });
  if (t0 >= total) return { parar() {} };   // o pet não tem esse passo na sequência
  let visto = false, ctl = null;
  const t1 = ate ? msAtePasso(forma, seq, ([a]) => { if (a === de) visto = true; return visto && a === ate; }, { deFrente }) : 0;
  const ti = setTimeout(() => { ctl = tocarArquivo(nome); }, t0);
  const tf = t1 > t0 ? setTimeout(() => ctl?.parar(fade), t1) : 0;
  return { parar(f = fade) { clearTimeout(ti); clearTimeout(tf); ctl?.parar(f); } };
}
const btSom = (som) => { if (bt) (bt.sons ||= []).push(som); return som; };   // sons da batalha: param ao sair dela

const btParado = (lado) => btTocar(lado, 'andar_direita', { ms: 420 });
const btForma = (lado) => (lado === 'L' ? bt.forma : bt.t.pet);
const adultoNaBatalha = () => !!bt && ehFormaAdulta(bt.forma) && temAnim(bt.forma, 'rugido');
// abertura do adulto: ruge
function btAbertura() {
  if (!adultoNaBatalha()) return;
  btTocar('L', 'rugido', { loop: false, ms: 260 });
}

// Ataque com fogo (pets com ataque_fogo): fica bravo ou ruge, abre a boca e o fogo sai na direção do adversário.
// O lado R é desenhado espelhado (scaleX(-1)), então o fogo sai para a esquerda sozinho.
async function btAtaqueFogo(de, para, crit, especial) {
  const forma = btForma(de);
  if (temSequencia(forma, 'ataque_batalha')) {   // adulto: prepara → cospe fogo (2 vezes) → ufa; o fogo sai no 2º quadro de cada cuspida
    clearTimeout(bt.anim[de]);
    $('bt-' + de).style.transform = de === 'R' ? 'scaleX(-1)' : '';
    (bt.seqAtaque ||= {})[de] = tocarSequencia($('bt-img' + de), forma, 'ataque_batalha', { deFrente: false });   // o turno espera o fim (btParado)
    btSom(somNaSequencia('dragao_fogo', forma, 'ataque_batalha', 'ataque_fogo', 'ufa', { fade: 200, deFrente: false }));   // som do fogo
    const [t1, t2] = msCuspidas(forma), inicio = performance.now();
    await btEsperar(t1);
    if (!bt) return;
    await btFogo(de, para, crit, especial);   // 1ª cuspida: é a que acerta
    const falta = t2 - (performance.now() - inicio);
    if (t2 > t1) btLater(() => { if (bt) btFogo(de, para, false, false); }, Math.max(0, falta));   // 2ª cuspida: só o fogo (o dano é o mesmo)
    return;
  } else {
    const antes = temAnim(forma, 'prepara_fogo') ? 'prepara_fogo' : 'rugido';   // respira fundo antes do fogo
    btTocar(de, antes, { loop: false, ms: 260, depois: () => {} });
    await btEsperar(700);
    if (!bt) return;
    btTocar(de, 'ataque_fogo', { loop: false, ms: 200, depois: () => {} });   // fica no último quadro (fogo) até btParado
    await btEsperar(200);
  }
  if (!bt) return;
  btSom(somAtaque(de === 'L' ? bt.pet : bt.t.pet));   // o golpe: dragão filhote ruge
  await btFogo(de, para, crit, especial);
}
// quando o fogo sai nas cuspidas da sequência ataque_batalha (ms desde o começo): 2º quadro do ataque_fogo, 1ª e 2ª vez
function msCuspidas(forma) {
  let n = 0;
  const t1 = msAtePasso(forma, 'ataque_batalha', ([a, q]) => a === 'ataque_fogo' && q === 2, { deFrente: false });
  const t2 = msAtePasso(forma, 'ataque_batalha', ([a, q]) => a === 'ataque_fogo' && q === 2 && ++n === 2, { deFrente: false });
  return [t1, n === 2 ? t2 : t1];
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
  if (R.L.v !== null && !R.L.ok) caixaErrou(`bt-${p.tipo}-${p.dificuldade}`);   // 🎯 treino: a conta volta amanhã
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
      if (adultoNaBatalha()) { btAbertura(); await btEsperar(1200); }   // adulto: ruge no lugar da cambalhota
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
      btSom(somAtaque(pet));   // som de ataque do pet, no bote
      await btBote(l);
      await btProjetil(l, o, pet, critico, especial);
    }
    if (!bt) return;
    bt.hp[o] = Math.max(0, bt.hp[o] - n);
    btHp(o);
    btLevarDano(o, n, critico, fogo ? 'fogo' : pet, especial);
    btSom(tocarArquivo(temSequencia(btForma(o), 'apanhou') ? 'dragao_bufando' : 'impacto'));   // o dragão adulto bufa; os outros, "pof"
    if (temSequencia(btForma(o), 'apanhou')) {   // o dragão adulto apanha: fica bravo e bufa (sequência `apanhou`), depois volta ao parado
      clearTimeout(bt.anim[o]);
      $('bt-' + o).style.transform = o === 'R' ? 'scaleX(-1)' : '';
      tocarSequencia($('bt-img' + o), btForma(o), 'apanhou', { deFrente: false }).then(fim => { if (fim && bt && !bt.fim) btParado(o); });
    } else if (temAnim(btForma(o), 'bravo')) btTocar(o, 'bravo', { loop: false, ms: 700 });
    await btEsperar(650);
    const seq = bt?.seqAtaque?.[l];   // adulto: termina a sequência do ataque (2ª cuspida e o "ufa") antes de voltar ao normal
    if (seq) { bt.seqAtaque[l] = null; await seq; }
    if (!bt) return;
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
  if (v === 'L' && temSequencia(bt.forma, 'vitoria')) {   // dragão adulto: a comemoração `vitoria` e a fala arrogante (PROMPT-65)
    clearTimeout(bt.anim.L);
    $('bt-L').style.transform = '';
    if (btReduz()) { pararSequencia($('bt-imgL')); $('bt-imgL').src = quadrosSeq(bt.forma, 'vitoria').at(-1); }
    else tocarSequencia($('bt-imgL'), bt.forma, 'vitoria', { deFrente: false });
    falaVitoria($('bt-imgL'), bt.pet, $('bt-L'));
  } else if (v === 'L' && adultoNaBatalha()) {   // adulto: orgulhoso (ufa, se venceu com pouca vida) e depois o rugido sentado
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
    `<span>Prêmios de batalha hoje: ${dia.moedas} / ${lim.moedas != null ? comMult(lim.moedas) : '∞'} moedas</span>`;
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
  if (resultado === 'venceu') { missaoProgresso('batalha'); ganharXPJogo(XP_JOGO.batalha, 'batalha'); }
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
    verificarEvolucao(pet);   // a batalha soma direto (sem ganharLealdade): chegou a 100, evolui
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
    o.icone.className = 'jr-pessoa-icone' + (p.destaque ? ' grande' : '');
    palco.append(sombra, img, o.icone);
    if (p.destaque) {   // em destaque (o Engrenaldo, PROMPT-73): brilho azul pulsando no chão, balanço leve e a placa com o nome
      img.classList.add('balanca');
      o.brilho = document.createElement('div'); o.brilho.className = 'jr-pessoa-brilho';
      palco.insertBefore(o.brilho, sombra);
    }
    if (p.placa) { o.placa = document.createElement('div'); o.placa.className = 'jr-rotulo-porta jr-rotulo-praca jr-pessoa-placa'; o.placa.innerHTML = `<span>${esc(p.placa)}</span>`; palco.appendChild(o.placa); }
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
  if (o.brilho) Object.assign(o.brilho.style, { left: p.x + 'px', top: p.y + 'px', width: larg * 1.6 + 'px', height: larg * 0.5 + 'px', zIndex: Math.round(p.y) - 2 });
  if (o.placa) Object.assign(o.placa.style, { left: p.x + 'px', top: (p.y - alt - (p.destaque ? 44 : 26) * escalaAtoresCena()) + 'px' });
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
    const ped = !!pedidoDe(o.p.id) || (o.p.id === 'engrenaldo' && !estado.avisos?.lab_visto);   // Engrenaldo: ! até entrar no laboratório
    o.icone.innerHTML = (o.treinador ? `<span>${descansa ? '😴' : '⚔️'}</span>` : '') + (ped ? '<span class="jr-pedido-exc" aria-label="Pedido de ajuda">!</span>' : '');
    o.icone.classList.toggle('descansa', descansa && !ped);
    o.temIcone = !!o.icone.innerHTML;
    o.icone.hidden = !o.temIcone;
  }
}

function pessoaEm(pt) {
  let melhor = null, md = Infinity;
  for (const o of pessoasMapa) {
    const s = escalaAtoresCena(), folga = 8 * s;
    // o ícone acima da cabeça (⚔️, 😴, !) também vale (PROMPT-155): ~22 px de altura (o "!" grande, ~34) e pelo menos 44 de largura
    const icone = o.temIcone ? (o.p.destaque ? 36 : 24) * s : 0, noIcone = icone && pt.y < o.p.y - o.alt;
    const meia = noIcone ? Math.max(o.larg / 2, 22 * s) : o.larg / 2;
    if (Math.abs(pt.x - o.p.x) > meia + folga || pt.y < o.p.y - o.alt - icone - folga || pt.y > o.p.y + folga) continue;
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

// Engrenaldo (Praça, porta do laboratório): convida até a 1ª entrada; depois lembra o desafio do dia; senão, as falas do npcs.json
function falaEngrenaldo() {
  if (!estado.avisos?.lab_visto) return '🤖 Novo! Venha programar o seu pet no Laboratório!';
  if (estado.programe?.dia?.data !== diaLocal()) return '📅 Tem desafio novo hoje!';
  return null;
}
// Reação do pet que segue o personagem (PROMPT-73): o dragão adulto (com sequências) usa `vitoria` nas comemorações e
// `carinho` (rindo de lado) nas reações rápidas — nada das poses de frente com as asas abertas. Os outros: a animação de sempre.
function reagirSeguidor(tipo, anim, ms = 0) {
  if (seguidor?.comemorar(tipo === 'comemora' ? 'vitoria' : 'carinho')) return;
  seguidor?.reagir(anim, ms);
}
// por que o "⚔️ Batalhar" não aparece (podeBatalhar() deu falso e não é descanso, expedição nem fome)
function motivoSemBatalha() {
  if (!carregouProgresso) return 'Seu progresso não carregou. Recarregue a página para batalhar.';
  if (!petsOk || !batalhasProntas()) return 'Os pets ainda estão carregando… Tente de novo daqui a pouco!';
  if (!estado?.pets?.ativo) return 'Você ainda não tem um pet para batalhar. Escolha um pet primeiro! 🐾';
  if (petFora()) return 'Seu pet está em expedição. 🧭';
  return 'Agora não dá para batalhar. Tente de novo daqui a pouco!';
}
function falarCom(o, convite = false) {   // convite: tocou no Engrenaldo → pergunta se quer ir para a Ilha dos Robôs
  if (perguntaAberta || transicionando || cena?.tipo !== 'mapa' || !o.img.isConnected) return;
  jog.dir = o.p.x < jog.x ? 'esquerda' : 'direita';
  desenharJogador();
  const falas = o.p.falas || [];
  let i = Math.floor(Math.random() * falas.length);
  if (falas.length > 1 && i === ultimaFalaPessoa[o.p.id]) i = (i + 1 + Math.floor(Math.random() * (falas.length - 1))) % falas.length;
  ultimaFalaPessoa[o.p.id] = i;
  if (destaque?.id === o.p.id) tirarDestaque();
  const saudacao = ehLoja() && o.p.id === cfgLoja().vendedor ? `Oi, ${nomeAluno()}! O que vai ser hoje?`
    : o.p.id === 'engrenaldo' ? falaEngrenaldo() : null;
  const el = $('pessoa-balao');
  // pedido de ajuda: "🙋 Ajudar"; treinadora: "⚔️ Batalhar" (ou o aviso de descanso/fome); com botão, também "Agora não"
  const ped = pedidoDe(o.p.id), botoes = [];
  let aviso = '';
  if (o.p.id === cfgLoja().vendedor && lojaPronta()) botoes.push('<button class="jr-btn jr-btn-ouro" data-acao="loja">🛒 Loja</button>');
  if (o.p.id === 'teo' && FLIPER) botoes.push('<button class="jr-btn jr-btn-ouro" data-acao="recordes">🏆 Recordes</button>');
  const ilhaOk = PROG && temMapaPrograme();   // a Ilha só precisa dos dados carregados (não há fase mínima)
  if (convite && o.p.id === 'engrenaldo') {
    aviso = `<div class="jr-pessoa-convite">${ilhaOk ? '🤖 Quer ir para a Ilha dos Robôs?' : '🔒 A Ilha dos Robôs ainda não abriu. Comece pelo Laboratório!'}</div>`;
    botoes.push(ilhaOk ? '<button class="jr-btn jr-btn-ouro" data-acao="ilha">Vamos!</button>' : '<button class="jr-btn jr-btn-ouro" data-acao="lab">Ir ao Laboratório</button>');
  }
  if (o.p.id === 'lia_cientista' && PROG) botoes.push('<button class="jr-btn jr-btn-ouro" data-acao="recordes-lab">🏆 Recordes</button>', '<button class="jr-btn" data-acao="como-lab">❓ Como funciona</button>');
  if (ped) botoes.push(`<button class="jr-btn ${botoes.length ? '' : 'jr-btn-ouro'}" data-acao="ajudar">🙋 Ajudar</button>`);
  if (o.treinador) {
    const d = desafioCom(o.p.id);
    if (situacao(d) === 'descansando') aviso = `<div class="jr-pessoa-descansa">Estou descansando. Volta em ${Math.max(1, Math.ceil((d.descansa_ate - Date.now()) / 3600e3))} h!</div>`;
    else if (petsOk && batalhasProntas() && petFora()) aviso = `<div class="jr-pessoa-descansa">Seu pet está em expedição. 🧭</div>`;
    else if (podeBatalhar() && barrigaDe(estado.pets.ativo) < (cfgBatalha().barriga_minima ?? 25)) { seguidor?.reagir('triste_fome', 2000); aviso = `<div class="jr-pessoa-descansa">${esc(nomePet(estado.pets.ativo))} está com fome. Dê comida antes de batalhar.</div>`; }
    else if (podeBatalhar()) botoes.push(`<button class="jr-btn ${ped ? '' : 'jr-btn-ouro'}" data-acao="batalhar">⚔️ Batalhar</button>`);
    else aviso = `<div class="jr-pessoa-descansa">${motivoSemBatalha()}</div>`;   // nunca um treinador sem botão e sem motivo (PROMPT-155)
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
  if (b.dataset.acao === 'ilha') irParaIlha(o);
  if (b.dataset.acao === 'lab') irAlvoPraca('laboratorio');
}
// Engrenaldo → Ilha dos Robôs direto da Praça (PROMPT-89): a Ilha abre por cima da Praça; o ✕ dela volta para a Praça,
// com o aluno na frente do Engrenaldo
function irParaIlha(o) {
  if (!PROG || !temMapaPrograme() || !ehPraca() || transicionando) return;
  ilhaOrigem = 'praca';
  transicao(() => {
    const [x, y] = cena.naTrilha(o.p.x, o.p.y + 60);
    posicionarJogador(x, y, 'costas');
    ajustarCamera();
    cena.pertoEng = true;   // ao voltar, ele não fala de novo até o aluno se afastar
    if (!estado.avisos.lab_visto) { estado.avisos.lab_visto = true; gravar({ 'avisos/lab_visto': true }); }   // o ! do Engrenaldo some
    esquecerPosicaoPet();
    return abrirMapaPrograme();   // o véu só sai quando o mapa estiver desenhado
  });
}

// 🤖 Atalho no Mapa geral (PROMPT-132): a Ilha abre por cima do Mapa geral. Onde ela foi aberta fica em ilhaOrigem
// ('geral' | 'praca' | 'lab'); só o ✕ da Ilha usa (as fases, o desafio e a corrida voltam para a Ilha, como sempre).
let ilhaOrigem = null;
const ilhaDisponivel = () => !!(PROG && temMapaPrograme());
function atualizarBotaoIlha() {
  const b = $('btn-ilha');
  if (b) b.hidden = !carregouProgresso || !ilhaDisponivel();
}
function irParaIlhaDoGeral() {
  if (!ilhaDisponivel() || transicionando || $('tela-geral').hidden || sobreposicaoAberta()) return;
  ilhaOrigem = 'geral';
  transicao(() => {
    if (!estado.avisos.lab_visto) { estado.avisos.lab_visto = true; gravar({ 'avisos/lab_visto': true }); }   // o ! do Engrenaldo some
    esquecerPosicaoPet();
    return abrirMapaPrograme();
  });
}
// a Ilha fecha por cima de quem a abriu: Praça e Laboratório continuam embaixo; do Mapa geral, garante que ele está na tela
function sairDaIlha() {
  const o = ilhaOrigem;
  ilhaOrigem = null;
  if (o === 'geral' && $('tela-geral').hidden) abrirMapaGeral();
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
  $('pd-calc').hidden = !ehPorcentagem(p.texto);   // 🧮 nos pedidos de porcentagem
  fecharCalc();
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
  fecharCalc();
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
    if (!comemorarPetNaCena()) seguidor?.reagir('pulo_cambalhota');
    mostrarAvisoSequencia();
    surgirPetSePendente();
    setTimeout(verificarCores, 1200);   // 🎨 líder do 10 B, 11 B ou 12 B vencido: cor nova do dragão (PROMPT-146)
    if (figurinhaPendente) setTimeout(mostrarFigurinhaPendente, 600);   // 📒 a carta gira; a festa (se houver) vem depois dela
    else if (festaPendente) { const f = festaPendente; festaPendente = null; setTimeout(() => mostrarFestaMestre(f), 700); }
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
  b.disabled = false;
  if (pg && !pg.fim && !semAdversario() && petsOk && petFora()) {   // 🧭 pet em expedição: botão desligado
    b.hidden = false; b.disabled = true; b.textContent = '🧭 Seu pet está em expedição'; b.classList.add('apagado');
    return;
  }
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
  const el = $('perg-pet-fala'), partes = partirTexto(texto);   // PROMPT-137: pedaços de até ~60 letras, um depois do outro
  let k = 0;
  const mostrar = () => {
    el.textContent = partes[k];
    el.hidden = false;
    el.classList.remove('nova'); void el.offsetWidth; el.classList.add('nova');
    $('perg-fala').classList.add('quieto');   // o balão do adversário dá lugar ao do pet
    clearTimeout(timerFalaAjuda);
    timerFalaAjuda = setTimeout(() => {
      if (++k >= partes.length) { fecharFalaAjuda(); return; }
      el.hidden = true;
      timerFalaAjuda = setTimeout(mostrar, 600);
    }, tempoLeitura(partes[k]));
  };
  mostrar();
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
    falaAjuda((nemAi() && fraseDe(pet, 'gin_dica', { ...v, dica: lembrete })) || `${abre} ${lembrete}`.trim());
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
    falaAjuda((nemAi() && fraseDe(pet, 'gin_elimina', { ...v, valor: alvo.dataset.v })) || fraseDe(pet, 'ajuda_elimina', { ...v, valor: alvo.dataset.v }) || `Acho que ${alvo.dataset.v} não é.`);
    pg.ajuda.elimin++;
    registrarAjuda(q, 'eliminou');
  } else if (podeEliminar) {
    return;   // entre perguntas (explicação na tela): guarda a eliminação para a próxima
  } else {
    falaAjuda(fraseDe(pet, 'ajuda_acabou', v) || '…');
    atualizarBotaoAjuda();
    return;
  }
  poseAjuda();
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
  const rev = semAdversario();
  pg.status = {};   // posição da pergunta → 'certa' (de primeira) | 'errada'
  $('perg-caixa').classList.toggle('revisao', rev);
  $('perg-jog').src = urlQuadro('direita', -1);   // no duelo, de pé virado para o adversário
  const pet = petsOk && petValido(estado?.pets?.ativo) && !petFora() ? estado.pets.ativo : null;   // em expedição: sem o pet na arena
  $('perg-pet').hidden = !pet;
  document.querySelector('.jr-arena-sombra.pet').hidden = !pet;
  pgPet = null;
  const forma = pet && formaDe(pet);
  $('perg-pet').style.setProperty('--forma', fatorDuelo(pet, forma));   // adulto na revisão: imagem maior (quadro com asas), +30% (PROMPT-80)
  // duelo do ginásio com adulto (PROMPT-81): o CSS deixa o dragão o maior que couber entre o personagem e o adversário
  const arena = $('perg-arena'), adultoDuelo = !rev && ehFormaAdulta(forma);
  arena.classList.toggle('pet-adulto', adultoDuelo);
  arena.style.setProperty('--rel', adultoDuelo ? relDuelo(forma) : 1);
  if (pet) { pgPet = new PetParado($('perg-pet')); pgPet.definir(forma); }
  pg.na = null;
  ladoNemAi();   // dragão adulto: sentado de lado, sem dar bola (PROMPT-71)
  aplicarVisualPet($('perg-pet'), pet, true);   // o pet do duelo tem drop-shadow no CSS
  // ajuda do pet: só nos ginásios (não na revisão da semana); contadores zeram a cada desafio
  pg.petAjuda = !rev && pet && cuidadosDe(pet) ? pet : null;
  pg.ajuda = { dicas: 0, elimin: 0 };
  fecharFalaAjuda();
  atualizarBotaoAjuda();
  if (!rev) {
    const adv = $('perg-adv');
    // meia largura do adversário (65% da arena de altura) para o dragão adulto crescer até ele; antes de carregar, a do mais largo
    arena.style.removeProperty('--adv-meia');
    adv.onload = () => { if (adv.naturalHeight) arena.style.setProperty('--adv-meia', (32.5 * adv.naturalWidth / adv.naturalHeight).toFixed(2) + 'cqh'); };
    adv.src = `${IMG}/personagens/${pg.pers.sprite}.webp`;
  }
  $('perg-adv-nome').textContent = pg.modo === 'treino' ? `🎯 Treino com ${pet ? nomePet(pet) : 'seu pet'}` : rev ? 'Revisão da semana' : `${NOME_DESAFIO[pg.p] || ''} · ${D.questoes[pg.mapa].ginasios[pg.G].nome}`;
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

// Dragão adulto no duelo do ginásio (treinadores, líder, revanche): acertou = cospe fogo no adversário (sequência ataque_batalha)
function ataqueArena() {
  if (!pgPet || semAdversario() || !temSequencia(pgPet.pet, 'ataque_batalha')) return false;
  const forma = pgPet.pet;
  pgPet.sequencia('ataque_batalha');
  pgSom?.parar(0); pgSom = somNaSequencia('dragao_fogo', forma, 'ataque_batalha', 'ataque_fogo', 'ufa', { fade: 200 });
  const [t1, t2] = msCuspidas(forma);
  const sacudir = () => {
    if ($('pergunta').hidden || semMovimento()) return;
    $('perg-adv').animate([{ transform: 'translateX(-50%)' }, { transform: 'translateX(calc(-50% - 6px))' }, { transform: 'translateX(calc(-50% + 6px))' }, { transform: 'translateX(-50%)' }],
      { duration: 320, easing: 'ease-in-out' });
  };
  setTimeout(() => { fogoArena(); setTimeout(sacudir, 380); }, t1);   // o adversário treme quando o fogo chega
  if (t2 > t1) setTimeout(fogoArena, t2);
  return true;
}
// fogo saindo da boca do pet (≈71% da largura, 48% da altura do quadro) até o adversário; por cima de tudo na arena
function fogoArena() {
  if ($('pergunta').hidden || semMovimento()) return;
  const arena = $('perg-arena'), pet = $('perg-pet'), adv = $('perg-adv');
  if (!arena || !pet || pet.hidden) return;
  // posições pelo layout da própria arena (offset*): valem com o jogo girado (jr-girado) ou escalado; as imagens usam translateX(-50%)
  const caixa = (el) => ({ x: el.offsetLeft - el.offsetWidth / 2, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
  const p = caixa(pet), v = caixa(adv);
  const x = p.x + p.w * 0.71, y = p.y + p.h * 0.48, bx = v.x + v.w / 2, by = v.y + v.h * 0.45;
  for (let i = 0; i < 9; i++) {
    const s = document.createElement('span');
    s.className = 'jr-fogo-arena'; s.textContent = i % 4 === 3 ? '💥' : '🔥';
    s.style.left = x + 'px'; s.style.top = y + 'px';
    arena.appendChild(s);
    const dx = bx - x + (Math.random() - 0.5) * 30, dy = by - y + (Math.random() - 0.5) * 40;
    s.animate([{ transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 },
      { transform: `translate(calc(-50% + ${dx * 0.3}px),calc(-50% + ${dy * 0.3}px)) scale(1.15)`, opacity: 1, offset: 0.2 },
      { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.7)`, opacity: 0 }], { duration: 460, delay: i * 28, easing: 'ease-out', fill: 'backwards' }).onfinish = () => s.remove();
  }
}

// ── Dragão adulto "nem aí" nas perguntas do ginásio (PROMPT-71) ──
// Sentado de lado; de vez em quando descansa, lambe a pata ou cheira (devagar, sem som). Mais de 10 s sem responder: dorme
// (`dormir` em ciclo) até o aluno errar. Acerto: nada. Erro: bufa ~1 s e reclama (gin_erro). Ajuda sem levantar (deitado ou
// lambendo a pata) com gin_dica / gin_elimina. Venceu: levanta e toca `vitoria` (gin_venceu). Perdeu: volta a dormir (gin_perdeu).
// Só os pets com a sequência `dormir` (os dragões adultos) e só nos ginásios (não na revisão). pg.na = { estado, prox, parado }
const ACOES_NEM_AI = ['descansar', 'lamber_pata', 'cheirar'];
let pgSom = null;   // som do fogo no duelo do ginásio (para ao fechar a pergunta)
const nemAi = () => !!pgPet && !!pg && !semAdversario() && temSequencia(pgPet.pet, 'dormir');
function ladoNemAi(zerar = true) {
  if (!nemAi()) return;
  pg.na = { estado: 'lado', prox: 5 + Math.random() * 4, parado: zerar ? 0 : pg.na?.parado || 0 };
  pgPet.tocar('sentado_lado');
}
function dormirNemAi() {
  if (!nemAi()) return;
  (pg.na ||= { prox: 0, parado: 0 }).estado = 'dormindo';
  pgPet.sequencia('dormir', null, { ciclo: true });
}
function tickNemAi(dt) {
  const na = pg?.na;
  if (!na || pg.fim || !nemAi()) return;
  const respondendo = !pg.travado && !$('perg-alternativas').hidden;   // a pergunta está esperando a resposta
  na.parado = respondendo ? na.parado + dt : 0;
  if (na.estado !== 'lado' && na.estado !== 'acao') return;           // dormindo ou bufando
  if (respondendo && na.parado > 10 && na.estado === 'lado') { dormirNemAi(); return; }
  if (na.estado !== 'lado' || (na.prox -= dt) > 0) return;
  const l = ACOES_NEM_AI.filter(a => temSequencia(pgPet.pet, a));
  if (!l.length) { na.prox = 8; return; }
  na.estado = 'acao';
  pgPet.sequencia(sortear(l), () => { if (pg?.na === na && na.estado === 'acao') ladoNemAi(false); });
}
function falaGin(cat) {
  const pet = estado.pets.ativo;
  const f = pet && fraseDe(pet, cat, { pet: nomePet(pet), apelido: apelidoAluno || String(sessao.nome || '').split(' ')[0] });
  if (f) falaAjuda(f);
}
function erroNemAi() {
  const na = pg.na || {};
  na.estado = 'bufando'; pg.na = na;
  pgPet.tocar(temAnim(pgPet.pet, 'bufando') ? 'bufando' : 'bravo');   // acorda / levanta a cabeça bufando
  tocarArquivo('dragao_bufando');
  falaGin('gin_erro');
  setTimeout(() => { if (pg?.na === na && na.estado === 'bufando') ladoNemAi(); }, 1000);
}
// a ajuda acontece sem ele levantar: dormindo fica deitado (dormindo, quadro 1); acordado, lambe a pata
function poseAjuda() {
  if (!nemAi()) { pgPet?.tocar('feliz'); return; }
  const na = pg.na || (pg.na = { estado: 'lado', prox: 6, parado: 0 });
  if (na.estado === 'dormindo') { pgPet.tocar('dormindo'); pgPet.lista = pgPet.lista.slice(0, 1); return; }
  na.estado = 'acao';
  if (!pgPet.sequencia('lamber_pata', () => { if (pg?.na === na && na.estado === 'acao') ladoNemAi(false); })) ladoNemAi(false);
}
// venceu o ginásio: levanta e empina o nariz (`vitoria`), com estrelas em volta e a fala de gin_venceu
function vitoriaNemAi() {
  if (!nemAi()) return;
  if (pg.na) pg.na.estado = 'vitoria';
  pgPet.sequencia('vitoria');
  falaGin('gin_venceu');
  if (semMovimento()) return;
  const arena = $('perg-arena'), img = $('perg-pet'), ra = arena.getBoundingClientRect(), ri = img.getBoundingClientRect();
  const k = ra.width / (arena.offsetWidth || ra.width);   // a tela pode estar girada/escalada
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('span');
    s.className = 'jr-faisca-jog'; s.textContent = '⭐';
    const ang = Math.PI * (1.1 + i * 0.16);   // arco por cima da cabeça
    s.style.left = ((ri.left - ra.left) / k + img.offsetWidth * (0.5 + 0.3 * Math.cos(ang))) + 'px';
    s.style.top = ((ri.top - ra.top) / k + img.offsetHeight * (0.35 + 0.25 * Math.sin(ang))) + 'px';
    s.style.animationDelay = (0.3 + i * 0.12).toFixed(2) + 's';
    arena.appendChild(s);
    setTimeout(() => s.remove(), 2200);
  }
}

function reagirArena(certo) {
  if (nemAi()) { if (!certo) erroNemAi(); return; }   // dragão adulto no ginásio: acerto não muda nada; erro: bufa e reclama
  if (certo && ataqueArena()) return;   // dragão adulto: o fogo faz o adversário tremer
  if (certo && pg?.modo === 'treino' && pgPet?.sequencia('carinho')) return;   // treino: o dragão adulto ri de lado (erro: `apanhou`, bufando)
  if (pgPet) {
    if (certo) pgPet.tocar(temAnim(pgPet.pet, 'animado') && Math.random() < 0.5 ? 'animado' : 'feliz');
    else if (pgPet.sequencia('apanhou')) tocarArquivo('dragao_bufando');   // dragão adulto: bravo e bufando
    else if (temAnim(pgPet.pet, 'confuso')) pgPet.tocar('confuso');
    else { pgPet.tocar('triste_fome'); setTimeout(() => { if (pgPet?.anim === 'triste_fome') pgPet.tocar('sentado_girando'); }, 1400); }
  }
  if (certo && !semAdversario() && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
  if (p === 'lider') {   // painel "Travados" (PROMPT-97): +1 luta com o líder; a 1ª vez fica marcada (quem já tinha histórico começa a contar agora)
    const g = estado.ginasios[chave], patch = { [`ginasios/${chave}/tentativas_lider`]: increment(1) };
    if (g && !g.primeiraTentativa) { g.primeiraTentativa = Date.now(); patch[`ginasios/${chave}/primeira_tentativa`] = g.primeiraTentativa; }
    gravar(patch);
  }
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
  $('perg-calc').hidden = !calcNaPergunta(q);   // 🧮 nos ginásios com "calculadora": true e em toda pergunta de porcentagem
  if ($('perg-calc').hidden) fecharCalc();   // na revisão, a pergunta seguinte pode ser de outro mapa
  else if (!calcAvisada) {   // 1ª pergunta com 🧮 da sessão: o botão pulsa 3 vezes e vem o aviso (PROMPT-101)
    calcAvisada = true;
    const b = $('perg-calc');
    b.classList.remove('pulsa'); void b.offsetWidth; b.classList.add('pulsa');
    setTimeout(() => b.classList.remove('pulsa'), 2300);
    setTimeout(() => { if (pg?.fila?.[0] === q && !pg.fim) falar('Pode usar a 🧮 calculadora aqui!'); }, 2200);
  }
  mostrarPlanoPergunta(q);   // 📐 mapa 12: o plano cartesiano pequeno (PROMPT-128)
  $('perg-enunciado').textContent = q.enunciado;
  $('perg-enunciado').classList.toggle('longo', String(q.enunciado).length > 28);   // problemas: Inter, até 2 linhas
  $('perg-explica').hidden = true;
  $('perg-erro').hidden = true;
  setTimeout(() => { if (pg?.fila?.[0] === q) atualizarItensPergunta(); }, 0);   // 💡 Dica do pet, se tiver
  // Revisão da semana: busto do líder e nome do ginásio de onde veio a pergunta
  const origem = $('perg-origem');
  origem.hidden = !semAdversario();
  if (semAdversario() && !q.mapa) origem.textContent = '⚔️ Conta de batalha';   // treino: conta que o aluno errou numa batalha
  else if (semAdversario()) {
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

// ── 📐 Plano nas perguntas do mapa 12 (PROMPT-128): q.plano vem dos geradores (mapas9a13.js). Antes de responder, o plano
//    mostra o ponto (com "?"), a partida (e a chegada) ou as opções; depois, a resposta: o caminho com a contagem, a guia até o
//    eixo, o eixo aceso, os quadrantes ou o ponto certo com a bandeira. ──
let pgPlano = null, planoPerg = null, erroPlano = null;   // { q, plano, rotQ }; o plano da arena; o do cartão do erro
const esperaMs = (ms) => new Promise(r => setTimeout(r, ms));
const movDoPlano = (pl) => pl.mov || (pl.chegada ? movEntre(pl.partida, pl.chegada) : []);
function pontosDoPlano(q) {
  const pl = q.plano, pts = [];
  if (pl.ponto) pts.push(pl.ponto);
  if (pl.partida) pts.push(...pontosDoCaminho(pl.partida, movDoPlano(pl)));
  const r = lerPar(q.resposta);
  if (r) pts.push(r);
  if (pl.opcoes) for (const e of q.erradas || []) { const p = lerPar(e); if (p) pts.push(p); }
  if (pl.mostra === 'quadrantes') pts.push([-3, -3], [3, 3]);   // os 4 quadrantes com espaço
  return pts;
}
function montarPlanoPergunta(plano, q, texto = 1.9) {   // texto: os números maiores, para ler no plano pequeno
  const pl = q.plano, C = CORES_PLANO;
  plano.desenhar({ ...faixaPara(pontosDoPlano(q)), texto });
  let rotQ = null;
  if (pl.partida) { plano.petEm(...pl.partida); plano.ponto(...pl.partida, C.verde, 8); plano.rotulo(...pl.partida, 'partida', C.verde, 28); }
  if (pl.chegada) { plano.ponto(...pl.chegada); plano.rotulo(...pl.chegada, parPlano(...pl.chegada), C.ouro, -28); }
  if (pl.ponto) { plano.ponto(...pl.ponto); rotQ = plano.rotulo(...pl.ponto, '?', C.ouro, -28); }
  if (pl.opcoes) for (const o of [q.resposta, ...(q.erradas || [])]) { const p = lerPar(o); if (p) { plano.ponto(...p, '#fff', 8); plano.rotulo(...p, parPlano(...p), '#fff', -28); } }
  plano.rotQ = rotQ;
}
// depois de responder (acerto ou erro): a resposta certa no plano
async function animarRespostaPlano(plano, q) {
  const pl = q.plano, C = CORES_PLANO;
  if (pl.mostra === 'caminho' && pl.partida) { await plano.mostrarCaminho(pl.partida, movDoPlano(pl), { rapido: true }); return; }
  if (pl.mostra === 'eixo_x' || pl.mostra === 'eixo_y') {
    const e = pl.mostra.slice(-1);
    plano.guias(...pl.ponto, e); plano.anelNoEixo(e, e === 'x' ? pl.ponto[0] : pl.ponto[1]);
    return;
  }
  if (pl.mostra === 'eixos' && pl.ponto) { plano.destacarEixo(pl.ponto[1] === 0 ? 'x' : 'y'); return; }
  if (pl.mostra === 'quadrantes' && pl.ponto) { plano.rotQ?.remove(); plano.desenharQuadrantes(); plano.rotulo(...pl.ponto, parPlano(...pl.ponto), C.ouro, -28); return; }
  const p = pl.mostra === 'origem' ? [0, 0] : lerPar(q.resposta);   // resposta / origem: o ponto certo
  if (p) { plano.ponto(...p); plano.guias(...p); plano.bandeira(...p); plano.rotulo(...p, parPlano(...p), C.ouro, 0, 34); }
}
// 📐 o plano (mapa 12) ou 🧱 a figura (mapa 11 e 4 A, PROMPT-135): o mesmo lugar na arena; pgPlano.animar() roda o "depois"
let figPerg = null, erroFig = null;
function mostrarPlanoPergunta(q) {
  planoPerg?.cancelar(); figPerg?.cancelar();
  let tem = !!(q.plano || q.figura);
  if (q.figura) {
    figPerg ||= criarFigura($('perg-plano'));
    tem = figPerg.mostrar(q.figura);
    if (tem) pgPlano = { q, animar: () => figPerg.animar() };
  } else if (q.plano) {
    planoPerg ||= criarPlano($('perg-plano'));
    montarPlanoPergunta(planoPerg, q);
    pgPlano = { q, animar: () => animarRespostaPlano(planoPerg, q) };
  }
  $('perg-plano-box').hidden = !tem;
  $('perg-arena').classList.toggle('com-plano', tem);
  if (!tem) pgPlano = null;
}

function mostrarCartaoErro(q, sua, certa, comOutrosNumeros) {
  const passos = passosDe(q.explicacao);
  const ultimo = passos[passos.length - 1] || '';
  if (posDaResposta(ultimo, certa) < 0) passos.push(`Resposta: ${certa}`);
  const naCalc = calcNaPergunta(q) ? passoCalculadora(q.enunciado) : '';
  if (naCalc) { if (/^Resposta: /.test(passos[passos.length - 1])) passos.splice(passos.length - 1, 0, naCalc); else passos.push(naCalc); }
  $('erro-enun').textContent = q.enunciado;
  $('erro-sua').textContent = sua;
  $('erro-certa').textContent = certa;
  $('erro-passos').innerHTML = passos.map((t, i) => `<li>${i === passos.length - 1 ? passoFinalHtml(t, certa) : esc(t)}</li>`).join('');
  // dica: só se não repetir o que já está nos passos
  const dica = String(q.dica || '').trim(), nd = normTxt(dica), np = normTxt(q.explicacao || '');
  const mostraDica = !!dica && !(np.includes(nd) || nd.includes(np) && np.length > 20);
  $('erro-dica').textContent = mostraDica ? `💡 ${dica}` : '';
  const rel = q.relembre !== undefined ? q.relembre : chaveGinasio(q.mapa ?? pg.mapa, q.lado ?? pg.G);   // na revisão cada pergunta é de um ginásio; conta de batalha: pelo tipo
  $('erro-relembre').hidden = !explicacaoDe(rel);
  $('erro-relembre').dataset.relembre = rel;
  $('erro-linha-dica').hidden = !mostraDica && $('erro-relembre').hidden;
  $('erro-volta').textContent = pg.modo === 'treino' ? `🔁 ${comOutrosNumeros ? 'Ela volta daqui a pouco, com outros números, e de novo amanhã.' : 'Ela volta daqui a pouco e de novo amanhã.'}` : `🔁 ${comOutrosNumeros ? 'Essa pergunta volta daqui a pouco, com outros números.' : 'Essa pergunta volta daqui a pouco.'}`;
  // 📐 com plano (PROMPT-128): o mesmo plano da pergunta, com a animação da resposta certa; sem plano, a mini-grade de antes
  erroPlano?.cancelar(); erroPlano = null; erroFig?.cancelar(); erroFig = null;
  const grade = q.plano || q.figura ? '<svg aria-label="Figura da pergunta"></svg>' : (q.mapa ?? pg.mapa) === 12 ? gradeDoErro(q.enunciado, sua, certa) : '';
  $('erro-grade').innerHTML = grade;
  $('erro-grade').hidden = !grade;
  $('erro-grade').classList.toggle('com-plano', !!(q.plano || q.figura));
  if (q.figura) {   // 🧱 a figura com a animação da resposta certa (PROMPT-135)
    const f = erroFig = criarFigura($('erro-grade').querySelector('svg'));
    if (f.mostrar(q.figura)) setTimeout(() => { if (erroFig === f) f.animar().catch(() => {}); }, 450);
    else $('erro-grade').hidden = true;
  } else if (q.plano) {
    erroPlano = criarPlano($('erro-grade').querySelector('svg'));
    montarPlanoPergunta(erroPlano, q, 1.6);
    const ep = erroPlano;
    setTimeout(() => { if (erroPlano === ep) animarRespostaPlano(ep, q).catch(() => {}); }, 450);
  }
  const b = $('erro-continuar');
  b.disabled = true;
  $('perg-erro').hidden = false;
  const pgErro = pg;
  setTimeout(() => { if (pg === pgErro && !$('perg-erro').hidden) { b.disabled = false; b.focus({ preventScroll: true }); } }, ESPERA_CONTINUAR_MS);
}

// ── Calculadora 🧮 (PROMPT-57): nos ginásios com "calculadora": true no mapas.json (portas.A/B), na batalha com treinador
//    desses mapas e na revisão (pergunta que veio de lá). % como na calculadora de verdade: 80 × 15 % = 12; 80 + 10 % = 88;
//    80 − 10 % = 72; 80 ÷ 50 % = 160; 15 % sozinho = 0,15. Fechar e reabrir mantém o último número.
let calcAvisada = false;   // a 🧮 já pulsou nesta sessão
const calcLigada = (mapa, G) => { const pt = D.mapas?.mapas?.['mapa' + mapa]?.portas; return !!pt && (G ? !!pt[G]?.calculadora : Object.values(pt).some(x => x?.calculadora)); };
// toda pergunta de porcentagem (de qualquer ginásio, da revisão e dos pedidos de ajuda) também tem a 🧮
const ehPorcentagem = (t) => /%|porcent|por cento/i.test(String(t || ''));
const calcNaPergunta = (q) => calcLigada(q.mapa ?? pg.mapa, q.lado ?? pg.G) || ehPorcentagem(q.enunciado);
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
  poseAjuda();
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

// 📊 PROMPT-134 (painel "Antes e depois"): na PRIMEIRA vez que o aluno responde uma pergunta de ginásio (fora do treino),
// grava respostas/{id}/primeira (quando) e de_primeira (acertou ou não). As respostas seguintes não mexem nesses campos.
function marcarPrimeiraResposta(q, acertou) {
  if (pg.modo === 'treino' || !RE_ID.test(q.id) || estado.respostas?.[q.id]) return;
  const agora = Date.now();
  gravar({ [`respostas/${q.id}/primeira`]: agora, [`respostas/${q.id}/de_primeira`]: !!acertou });
  lembrarResposta(q.id, { primeira: agora, de_primeira: !!acertou });
}
function responder(btn) {
  if (!pg || pg.travado || pg.fim) return;
  pg.travado = true;
  const q = pg.fila[0];
  const certa = String(q.resposta);
  marcarPrimeiraResposta(q, btn.dataset.v === certa);   // 📊 "de primeira" (PROMPT-134), antes da Segunda chance
  const botoes = [...$('perg-alternativas').querySelectorAll('.jr-alt')];
  botoes.forEach(b => { b.disabled = true; });
  tocar('clique');
  $('perg-usar-dica').hidden = true;
  if (btn.dataset.v !== certa && !pg.segundaUsada && qtdItem('segunda_chance') > 0) { tocar('erro'); oferecerSegundaChance(btn, q, certa, botoes); return; }
  if (btn.dataset.v === certa) {
    btn.classList.add('certa');
    tocar('acerto');
    const treino = pg.modo === 'treino';
    if (!semAdversario()) missaoProgresso('acertar_ginasio');
    if (!treino && (Number(estado.respostas?.[q.id]?.erros) || 0) > 0) missaoProgresso('revisar_erro');   // já tinha errado esta pergunta
    const primeiroAcerto = !estado.respostas?.[q.id]?.acertou;   // moeda só na 1ª vez (antes de marcar acertou)
    const agora = Date.now();
    const registra = !treino || RE_ID.test(q.id);   // conta de batalha (treino): não vai para respostas/
    const patch = registra ? { [`respostas/${q.id}/acertou`]: true, [`respostas/${q.id}/ultima`]: agora } : {};
    // revisão: acertou de primeira → sai da lista de revisão por 3 semanas
    if (pg.modo === 'revisao' && !pg.errouIds.has(q.id)) patch[`respostas/${q.id}/revisao_ok`] = agora;
    if (treino) acertouNoTreino(q, patch);
    gravar(patch);
    if (registra) lembrarResposta(q.id, { acertou: true, ultima: agora, ...(patch[`respostas/${q.id}/revisao_ok`] ? { revisao_ok: agora } : {}) });
    if (pg.status[posDe(q)] !== 'errada') pg.status[posDe(q)] = 'certa';
    reagirArena(true);
    comemorarJogador();
    pg.fila.shift();
    pg.acertos++;
    if (primeiroAcerto && !treino) { ganharMoeda(); ganharXPJogo(XP_JOGO.pergunta, 'pergunta'); }   // treino: sem moedas (o prêmio é lealdade)
    falar(sortear(D.falas.acerto));
    // 📐 com plano: espera a animação da resposta (no mínimo 1,1 s, no máximo ~3 s)
    const pgAgora = pg, segue = () => { if (!pg || pg !== pgAgora) return; pg.fila.length ? renderPergunta() : vencer(); };
    const anim = pgPlano?.q === q ? pgPlano.animar().catch(() => {}) : null;
    if (anim) Promise.race([Promise.all([anim, esperaMs(1100)]), esperaMs(3000)]).then(segue); else setTimeout(segue, 1100);
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
  if (pg.modo !== 'treino' || RE_ID.test(q.id)) {
    gravar({ [`respostas/${q.id}/ultima`]: Date.now(), [`respostas/${q.id}/assunto`]: assuntoDe(q.enunciado) }, q.id);   // erros += 1; assunto: o formato da conta (painel "Travados")
    lembrarResposta(q.id, { ultima: Date.now() }, 1);
  }
  caixaErrou(q.id);   // 🎯 a pergunta entra (ou volta) na caixinha do treino: nível 0, volta amanhã
  // volta para o fim da fila com outros números (no Mapa 13 B, gerarUma dá null: repete a mesma)
  pg.fila.shift();
  const nova = pg.modo === 'treino' ? questaoTreino(q.id)
    : pg.modo === 'revisao' ? gerarUma(q.mapa, q.lado, q.personagem, q.indice)
    : gerarUma(pg.mapa, pg.G, pg.p, q.indice);
  pg.fila.push(nova ? (pg.modo === 'treino' ? { ...nova, pos: q.pos } : { ...nova, indice: q.indice, mapa: q.mapa, lado: q.lado, personagem: q.personagem, pos: q.pos }) : q);
  falar(sortear(FALAS_ERRO_CURTAS));   // a resposta certa está no cartão: o balão do treinador fica curto
  pg.aoContinuar = renderPergunta;
  mostrarCartaoErro(q, btn.dataset.v, certa, !!nova);   // explicação da pergunta que o aluno ERROU, não da nova
}

function vencer() {
  if (pg.modo === 'revisao') { concluirRevisao(); return; }
  if (pg.modo === 'treino') { concluirTreino(); return; }
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
  if (p === 'lider' || p === 'revanche') ganharFigurinha(chave);   // 📒 a figurinha (dourada com a revanche) aparece depois da insígnia
  if (ganhou) moedasDaInsignia(ganhou);
  if (p === 'lider' || p === 'revanche') conversa.evento = 'venceu';   // o pet comenta ao sair do ginásio
  if (p === 'lider' && primeiraVez && petDoGinasio(chave)) petSurgir = chave;
  registrarDiaJogado();
  tocar('vitoria');
  vitoriaNemAi();
  // XP só na primeira vitória de cada personagem (conferido no estado carregado do Firebase)
  if (primeiraVez) {
    if (p === 'lider') darXP(XP_LIDER + (pg.errouIds.size === 0 ? XP_LIDER_PERFEITO : 0));
    else if (p === 'revanche') darXP(XP_REVANCHE);
    else darXP(XP_TREINADOR);
    ganharXPJogo(p === 'lider' ? XP_JOGO.lider : p === 'revanche' ? XP_JOGO.revanche : XP_JOGO.treinador, p);   // ⭐ (PROMPT-156)
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
      if (!temSequencia(seguidor?.forma, 'vitoria')) seguidor?.reagir('animado');   // com `vitoria`: comemora quando a insígnia some
      const pa = estado.pets.ativo, fa = pa && formaDe(pa);
      if (fa && temAnim(fa, 'busto_fogo')) setTimeout(() => avisoPet(`🔥 ${nomePet(pa)} está orgulhoso da insígnia!`, true, quadrosDe(fa, 'busto_fogo')[0]), 2600);
    }
    else { reagirSeguidor('comemora', 'feliz'); mostrarAvisoSequencia(); surgirPetSePendente(); }
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
    if (nemAi()) { dormirNemAi(); falaGin('gin_perdeu'); }   // dragão adulto: volta a dormir
    return;
  }
  const fugiuDeBatalha = !semAdversario();
  fecharPergunta();
  if (fugiuDeBatalha) { seguidor?.reagir('triste_fome', 2000); if (conversa.evento !== 'venceu') conversa.evento = 'perdeu'; }
}

function fecharPergunta() {
  $('pergunta').hidden = true;
  pgSom?.parar(200); pgSom = null;
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
// PROMPT-131: uma moldura de madeira por mapa (etiqueta com emoji e nome, número no pergaminho, as 2 insígnias nas pedras roxas)
function abrirEstojo() {
  renderPlacar();
  let conquistadas = 0, douradas = 0;
  const html = [];
  for (let n = 1; n <= NUM_MAPAS; n++) {
    const q = D.questoes[n], reg = (D.geral?.regioes || []).find(r => Number(r.mapa) === n);
    const ins = ['A', 'B'].map((G) => {
      const chave = chaveGinasio(n, G), g = estado.ginasios[chave];
      if (g.insignia) conquistadas++;
      if (g.dourada) douradas++;
      const st = g.dourada ? 'dourada' : g.insignia ? 'ganha' : 'bloqueada';
      return `<button class="insignia ${st}" data-chave="${chave}" aria-label="Insígnia ${esc(q.ginasios[G].nome)}">
          <img src="${IMG}/insignias/insignia-${chave}.webp" alt="" loading="lazy" draggable="false"/>${st === 'dourada' ? '<span class="ins-estrela">★</span>' : ''}</button>`;
    }).join('');
    html.push(`<div class="ins-cap">
      <div class="ins-cap-tag"><span>${reg?.emoji || '🗺️'}</span>${esc(q.nome)}</div>
      <div class="ins-cap-moldura"><div class="ins-cap-num">${n}</div><div class="ins-cap-pedras">${ins}</div></div>
    </div>`);
  }
  $('estojo-bandejas').innerHTML = html.join('');
  $('estojo-resumo').textContent = `${conquistadas} de 26 · ${douradas} dourada${douradas === 1 ? '' : 's'}`;
  $('estojo-barra').style.width = (conquistadas / 26 * 100) + '%';
  const xj = estado.xpJogo || { total: 0 }, hoje = xj.dia?.data === diaLocal() ? Number(xj.dia.n) || 0 : 0, fmt = (n) => n.toLocaleString('pt-BR');
  $('estojo-nota').innerHTML = `<div class="ins-nota">⭐ Nota do jogo: <b>${formatarNota(notaJogoRevisao(conquistadas, xj.total))}</b> / ${NOTA_MAX}</div>` +
    `<div class="ins-xp"><div class="ins-xp-top"><span>⭐ Experiência: <b>${fmt(Math.min(xj.total, XP_META))}</b> / ${fmt(XP_META)} → ${formatarNota(Math.round(notaXP(xj.total) * 10) / 10)} de ${PESO_XP},0</span>` +
    `<small>hoje: ${hoje} / ${XP_DIA}</small></div><div class="ins-xp-barra"><span style="width:${Math.min(100, xj.total / XP_META * 100)}%"></span></div></div>` +
    `<div class="ins-nota-legenda">Ginásios valem ${PESO_INSIGNIAS},0 · Experiência vale ${PESO_XP},0</div>`;
  pintarEspecialAlbum();
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
let PROG = null, LAB = null, MAPA_PG = null;   // MAPA_PG: dados/jogo/mapa-programe.json (Ilha dos Robôs, PROMPT-60)
let BUGS = null;   // dados/jogo/caca-ao-bug.json → bugs (🐛 Caça ao bug, PROMPT-70)
const PREMIO_PG = { estrela: 3, tres_estrelas: 5, lealdade: 1 };   // 1ª vez com ⭐ · 1ª vez com ⭐⭐⭐ · fase nova
const fasesPg = () => PROG?.fases || [];
const progFase = (id) => estado.programe?.fases?.[id] || null;
const faseResolvida = (id) => (Number(progFase(id)?.estrelas) || 0) > 0;
const faseLiberada = (i) => i === 0 || faseResolvida(fasesPg()[i - 1]?.id);
function capMaxLiberado() { let cap = 1; fasesPg().forEach((f, i) => { if (faseLiberada(i)) cap = Math.max(cap, f.cap); }); return cap; }
function blocosAteCap(cap) { const s = new Set(); for (const f of fasesPg()) if (f.cap <= cap) for (const b of f.blocos) s.add(b); return [...s]; }
const nomeCap = (cap) => PROG?.capitulos?.[cap]?.nome || `Capítulo ${cap}`;
// tema do tabuleiro (casa e obstáculo) com os caminhos prontos; desafio do dia e corridas usam o da Vila
const temaPg = (t) => (t ? { casa: caminhoImg(t.casa || ''), obstaculo: caminhoImg(t.obstaculo || '') } : null);
// fechou uma fase / o desafio / a corrida do mapa: volta para a Ilha dos Robôs (sem o mapa: a lista do computador)
function voltarAoMapaPg(opcoes) {
  if (PROG && temMapaPrograme()) abrirMapaPrograme(opcoes);
  else abrirComputador('programe_o_pet');
}
// o que vai no desafio da praça para montar a corrida (capítulo liberado e o pet que aparece na tela do outro)
function dadosCorrida() {
  const p = petsOk && estado?.pets?.ativo;
  return { cap: PROG ? capMaxLiberado() : 1, pet: p || null, forma: p ? formaDe(p) : null, tinta: tintaVisivel(p) };
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
  if (!estado.avisos.lab_visto) { estado.avisos.lab_visto = true; gravar({ 'avisos/lab_visto': true }); }   // o ! do Engrenaldo some
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
  $('btn-reacao').hidden = true;
  atualizarBotaoPet();
}

// Painel do computador (a mesma janela das máquinas do fliperama)
function abrirComputador(id) {
  const c = (LAB?.computadores || []).find(x => x.id === id);
  if (!c) return;
  $('mq-nome').textContent = `💻 ${c.nome}`;
  $('mq-botoes').innerHTML = '';
  if (id === 'programe_o_pet' && PROG && !c.em_breve && temMapaPrograme()) { ilhaOrigem = 'lab'; esquecerPosicaoPet(); abrirMapaPrograme(); return; }   // a Ilha dos Robôs
  if (c.em_breve || !PROG || (id === 'caca_bug' && !BUGS?.length)) {
    $('mq-corpo').innerHTML = '<p class="mq-rec">Chegando logo! 🤖</p><p class="mq-sub">Este computador ainda está sendo montado.</p>';
  } else if (id === 'caca_bug') {
    const travado = BUGS.find((b, i) => !bugLiberado(i));
    $('mq-corpo').innerHTML = `<p class="mq-sub">Cada programa tem <b>1 erro</b>. Execute, veja onde o pet erra e conserte tocando no bloco.</p>
      <div class="pg-fases">${BUGS.map((b, i) => {
        const est = Number(estado.programe.bugs?.[b.id]?.estrelas) || 0, lib = bugLiberado(i);
        return `<button class="pg-fase${est ? ' feita' : ''}" data-pg-bug="${b.id}"${lib ? '' : ' disabled'} title="${esc(b.nome)}">${lib ? '🐛' + b.id : '🔒'}<small>${est ? '⭐'.repeat(est) + '☆'.repeat(3 - est) : lib ? 'novo' : ''}</small></button>`;
      }).join('')}</div>${travado ? `<p class="mq-nota">🔒 O Bug ${travado.id} abre quando você resolver a fase ${travado.fase} do Programe o pet (ou consertar o bug anterior).</p>` : ''}`;
  } else if (id === 'o_que_faz') {
    const rec = Number(estado.programe.o_que_faz?.recorde) || 0;
    $('mq-corpo').innerHTML = `<p class="mq-rec">🔮 O que o pet vai fazer?</p>
      <p class="mq-sub">Leia o programa e toque na casa onde o pet vai parar. Depois ele executa e você confere. Quanto mais acertos seguidos, mais difícil fica!</p>
      <p class="mq-nota">🏆 Seu recorde: <b>${rec}</b> acerto${rec === 1 ? '' : 's'} seguido${rec === 1 ? '' : 's'} · 🪙 ${comMult(1)} moeda${comMult(1) === 1 ? '' : 's'} a cada 5 acertos seguidos (até ${MOEDAS_OQF_DIA * comMult(1)} por dia)</p>`;
    $('mq-botoes').innerHTML = '<button class="jr-btn jr-btn-ouro" data-pg-oqf>🔮 Jogar</button>';
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
    aoFechar: () => voltarAoMapaPg(),
    tema: temaPg(temaDaFase(id)),
  });
  if (!ok) return;
  cartaoCapitulo(f.cap);   // a provocação do chefe já apareceu no mapa (tela do chefe, PROMPT-66)
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
  if (!p.premio1) { p.premio1 = true; patch[`${base}/premio1`] = true; moedas += comMult(PROG.premios?.estrela ?? PREMIO_PG.estrela); }
  if (r.estrelas === 3 && !p.premio3) { p.premio3 = true; patch[`${base}/premio3`] = true; moedas += comMult(PROG.premios?.tres_estrelas ?? PREMIO_PG.tres_estrelas); }
  if (moedas) { ps.moedas = (Number(ps.moedas) || 0) + moedas; patch['pets/moedas'] = ps.moedas; registrarGanho('programe', moedas, patch); }
  if (nova && ps.ativo && cuidadosDe(ps.ativo)) ganharLealdade(ps.ativo, PROG.premios?.lealdade ?? PREMIO_PG.lealdade, patch);
  if (nova) ganharXPJogo(XP_JOGO.fase, 'fase');   // ⭐ (PROMPT-156)
  // chefe vencido pela 1ª vez: medalha da região (sem moedas extras)
  const reg = chefeDaFase(f.id), med = (estado.programe.medalhas ||= {});
  const medalhaNova = !!reg && !med[reg.id];
  if (medalhaNova) { med[reg.id] = true; patch[`programe/medalhas/${reg.id}`] = true; }
  gravar(patch);
  publicarResumoPrograme();
  cartaoVitoriaFase(f, r, moedas, nova, medalhaNova ? reg : null);   // a medalha vem depois da comemoração de vitória
}

// 🎉 Cartão de vitória: pet comemorando, estrelas, blocos, moedas e "Próxima fase ▶". Os avisos do pet vêm depois do cartão.
async function cartaoVitoriaFase(f, r, moedas, nova, medalha = null) {
  const prox = fasesPg()[fasesPg().findIndex(x => x.id === f.id) + 1];
  const botoes = [];
  if (prox) botoes.push({ id: 'proxima', texto: 'Próxima fase ▶', classe: 'jr-btn-ouro' });
  if (r.estrelas < 3) botoes.push({ id: 'tentar', texto: '↺ Menos blocos', classe: 'jr-btn-sec' });
  botoes.push({ id: 'fases', texto: temMapaPrograme() ? '🗺️ Mapa' : '☰ Fases', classe: 'jr-btn-sec' });
  const op = await cartaoPrograme({
    titulo: `🎉 Fase ${f.id} concluída!`, estrelas: r.estrelas, botoes,
    info: `<div>${r.blocos} blocos${moedas ? ` · <b>+${moedas} ${moedaHtml()}</b>` : ''}</div>` +
      (r.estrelas < 3 ? `<div class="dica">Dá para fazer com ${f.meta_blocos} blocos ou menos!</div>` : '') +
      (prox ? '' : '<div><b>🏆 Você terminou todas as fases!</b></div>'),
  });
  if (medalha) await medalhaDoChefe(medalha);   // chefe vencido pela 1ª vez: explode em estrelas e "🏅 Medalha da {região}!"
  if (moedas) avisoPet(`🤖 Fase ${f.id}: ${'⭐'.repeat(r.estrelas)} +${moedas} 🪙`, true);
  if (nova && prox && prox.cap !== f.cap) avisoPet(`🔓 Capítulo ${prox.cap} liberado: ${nomeCap(prox.cap)}!`, true);
  if (op === 'proxima' && prox) abrirFasePrograme(prox.id);   // direto, sem passar pela lista (capítulo novo: o cartão do capítulo aparece)
  else if (op === 'fases') {
    if (!temMapaPrograme()) { fecharTelaPrograme(); return; }   // volta para a lista (aoFechar abre o computador)
    // 🗺️ Mapa: o pet sai da fase vencida e anda até a seguinte
    const i = fasesPg().findIndex(x => x.id === f.id);
    fecharTelaPrograme(true);
    abrirMapaPrograme({ de: i, andarAte: prox ? i + 1 : i });
  }
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
  const grupos = [['🤖 Programe o pet', 'programe_estrelas'], ['🏁 Corridas da semana', 'corridas'], ['📅 Desafio de hoje', 'programe'], ['🔮 O que o pet vai fazer?', 'o_que_faz']];
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

// ── 🐛 Caça ao bug (PROMPT-70): programa com 1 erro (dados/jogo/caca-ao-bug.json) no mapa de uma fase; o aluno conserta tocando no bloco.
// Bug liberado quando a fase dele está resolvida ou o bug anterior foi consertado. Progresso em programe/bugs/{id}: { estrelas, execucoes, data, premio1, premio3 }.
const bugResolvido = (id) => (Number(estado.programe.bugs?.[id]?.estrelas) || 0) > 0;
const bugLiberado = (i) => !!BUGS?.[i] && (faseResolvida(BUGS[i].fase) || (i > 0 && bugResolvido(BUGS[i - 1].id)));
async function abrirBug(id) {
  const i = (BUGS || []).findIndex(b => b.id === id), b = BUGS?.[i], f = b && fasesPg().find(x => x.id === b.fase);
  if (!b || !f || !bugLiberado(i)) return;
  await abrirTelaPrograme({
    modo: 'bug', fase: f, programa: { corpo: b.programa, f1: null }, dica: b.dica, posicao: b.posicao,
    titulo: `🐛 Bug ${b.id}`, sub: 'O programa tem 1 erro. Execute, veja onde o pet erra e conserte.',
    aoVencer: (r) => venceuBug(b, r),
    aoFechar: () => abrirComputador('caca_bug'),
    tema: temaPg(temaDaFase(f.id)),
  });
}
// ⭐ consertou · ⭐⭐ em até 2 execuções · ⭐⭐⭐ de primeira (contando só as execuções depois de mexer). Prêmio igual ao das fases, uma vez por bug.
function venceuBug(b, r) {
  const bugs = (estado.programe.bugs ||= {}), p = (bugs[b.id] ||= {}), base = `programe/bugs/${b.id}`, patch = {}, ps = estado.pets;
  if (!(Number(p.estrelas) > 0)) ganharXPJogo(XP_JOGO.bug, 'bug');   // ⭐ 1º conserto deste bug (PROMPT-156)
  if (!(Number(p.estrelas) > 0) || r.estrelas > p.estrelas) {
    Object.assign(p, { estrelas: r.estrelas, execucoes: r.execs, data: Date.now() });
    for (const k of ['estrelas', 'execucoes', 'data']) patch[`${base}/${k}`] = p[k];
  }
  let moedas = 0;
  if (!p.premio1) { p.premio1 = true; patch[`${base}/premio1`] = true; moedas += comMult(PROG.premios?.estrela ?? PREMIO_PG.estrela); }
  if (r.estrelas === 3 && !p.premio3) { p.premio3 = true; patch[`${base}/premio3`] = true; moedas += comMult(PROG.premios?.tres_estrelas ?? PREMIO_PG.tres_estrelas); }
  if (moedas) { ps.moedas = (Number(ps.moedas) || 0) + moedas; patch['pets/moedas'] = ps.moedas; registrarGanho('programe', moedas, patch); }
  gravar(patch);
  const i = BUGS.indexOf(b), prox = BUGS[i + 1], botoes = [];
  if (prox && bugLiberado(i + 1)) botoes.push({ id: 'proximo', texto: 'Próximo bug ▶', classe: 'jr-btn-ouro' });
  if (r.estrelas < 3) botoes.push({ id: 'tentar', texto: '↺ De novo', classe: 'jr-btn-sec' });
  botoes.push({ id: 'lista', texto: '☰ Bugs', classe: 'jr-btn-sec' });
  cartaoPrograme({
    titulo: `🎉 Bug ${b.id} consertado!`, estrelas: r.estrelas, botoes,
    info: `<div>${r.execs <= 1 ? 'De primeira!' : `${r.execs} execuções`}${moedas ? ` · <b>+${moedas} ${moedaHtml()}</b>` : ''}</div>` +
      (r.estrelas < 3 ? '<div class="dica">⭐⭐⭐: ache o erro e conserte acertando na primeira execução.</div>' : ''),
  }).then(op => {
    if (moedas) avisoPet(`🐛 Bug ${b.id}: ${'⭐'.repeat(r.estrelas)} +${moedas} 🪙`, true);
    if (op === 'proximo') abrirBug(prox.id);
    else if (op === 'tentar') abrirBug(b.id);
    else if (op === 'lista') fecharTelaPrograme();   // aoFechar: a lista dos bugs
  });
}

// ── 🔮 O que o pet vai fazer? (PROMPT-70): rodadas sem fim geradas na hora (rodadaOQueFaz); o aluno toca na casa onde o pet vai parar.
// Recorde de acertos seguidos em programe/o_que_faz/recorde (e na praça, para os Recordes da Lia); 1 moeda a cada 5 seguidos, até 10 por dia.
let oqf = null;   // { acertos }
const MOEDAS_OQF_DIA = 10;
function abrirOQF() { oqf = { acertos: 0 }; rodadaOQF(); }
function subOQF() { return `Acertos seguidos: ${oqf?.acertos || 0} · Recorde: ${Number(estado.programe.o_que_faz?.recorde) || 0}`; }
async function rodadaOQF() {
  if (!oqf) return;
  const r = rodadaOQueFaz(`${sessao.uid}|${Date.now()}|${Math.random()}`, oqf.acertos);
  await abrirTelaPrograme({
    modo: 'prever', fase: r.fase, programa: r.prog, titulo: '🔮 O que o pet vai fazer?', sub: subOQF(),
    aoPrever: (acertou) => resultadoOQF(acertou), aoProxima: () => rodadaOQF(),
    aoFechar: () => { oqf = null; abrirComputador('o_que_faz'); },
    tema: temaPg(temaVila()),
  });
}
function resultadoOQF(acertou) {
  if (!oqf) return;
  const o = (estado.programe.o_que_faz ||= {}), patch = {}, hoje = diaLocal();
  if (acertou) {
    oqf.acertos++;
    if (oqf.acertos > (Number(o.recorde) || 0)) {
      o.recorde = oqf.acertos; patch['programe/o_que_faz/recorde'] = o.recorde;
      if (entraNoRanking() || teste) {
        set(ref(db, `${basePraca()}/programe/o_que_faz/${sessao.uid}`), { recorde: o.recorde, nome: nomeRanking(), turma: sessao.turma || '', pers: meuPersonagem(), ts: Date.now() })
          .catch(e => console.warn('[jogo-revisao] recorde do O que o pet vai fazer?', e?.code || e));
        delete mural.cache.o_que_faz;
      }
    }
    const md = o.moedas_dia?.data === hoje ? Number(o.moedas_dia.n) || 0 : 0;
    if (oqf.acertos % 5 === 0) ganharXPJogo(5, 'o_que_faz');   // ⭐ (PROMPT-156)
    if (oqf.acertos % 5 === 0 && md < MOEDAS_OQF_DIA) {
      o.moedas_dia = { data: hoje, n: md + 1 }; patch['programe/o_que_faz/moedas_dia'] = o.moedas_dia;
      const ps = estado.pets, g = comMult(1); ps.moedas = (Number(ps.moedas) || 0) + g; patch['pets/moedas'] = ps.moedas;
      registrarGanho('programe', g, patch);
      avisoPet(`🔮 ${oqf.acertos} acertos seguidos! +${g} 🪙`, true);
    }
  } else oqf.acertos = 0;
  if (Object.keys(patch).length) gravar(patch);
  $('pg-sub').textContent = subOQF();
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
    aoFechar: () => voltarAoMapaPg(),
    tema: temaPg(temaVila()),
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
async function abrirFantasma(origem = 'corrida') {   // origem: 'mapa' (🏁 da Ilha dos Robôs) ou o computador Corrida
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
    aoFechar: () => (origem === 'mapa' ? voltarAoMapaPg() : abrirComputador('corrida')),
    tema: temaPg(temaVila()),
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
      tema: temaPg(temaVila()),
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
      vencedor, placar: `${placar[a]}-${placar[b]}`, wo, modo: 'corrida', aposta: Number(d.aposta?.valor) || 0, ts: Date.now() });
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
//  moedas_insignia / moedas_dourada). Todo ganho passa por comMult (loja.json → multiplicador_moedas, PROMPT-126). Registro do que entrou: moedas_dia (hoje, por fonte: o aluno vê tocando no
//  contador) e moedas_semana/{segunda}/{fonte} (painel da professora).
// ============================================================
const FONTES_MOEDA = {
  login: { nome: '🎁 Presente do dia' },
  ginasio: { nome: 'Ginásios (1º acerto de cada pergunta)' },
  expedicao: { nome: 'Expedição do pet' },
  relampago: { nome: 'Desafio relâmpago' },
  insignia: { nome: 'Insígnias' },
  batalha: { nome: 'Batalhas', limite: () => (cfgBatalha().limites_dia?.moedas != null ? comMult(cfgBatalha().limites_dia.moedas) : undefined) },
  batalha_primeira: { nome: 'Primeira vitória contra um treinador' },
  pedido: { nome: 'Pedidos de ajuda', limite: () => limiteMoedasPedidos() },
  cavar: { nome: 'Cavar e mato', limite: () => comMult(cfgCavar().moedas_cavar_dia ?? 15) },
  colecao: { nome: 'Coleção' },
  fliperama: { nome: 'Fliperama', limite: () => comMult(FLIPER?.moedas_dia ?? 10) },
  desafio: { nome: 'Desafios na praça' },
  aposta: { nome: '💰 Apostas nos desafios' },
  damas: { nome: '♟️ Damas contra o computador', limite: () => VITORIAS_DAMAS_CPU_DIA * MOEDAS_DAMAS_CPU.dificil },
  pesca: { nome: 'Venda de peixes' },
  aovivo: { nome: 'Tabuada ao vivo' },
  missao: { nome: 'Missões do dia' },
  programe: { nome: 'Programe o pet' },
  bonus: { nome: '🎁 Bônus (moedas valendo mais)' },
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
  const n = comMult(tipo === 'dourada' ? cfgLoja().moedas_dourada ?? 15 : cfgLoja().moedas_insignia ?? 10);
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
    <div class="jr-mh-nota">Cada atividade tem o próprio limite por dia. Nos ginásios, a moeda vem no 1º acerto de cada pergunta; vencer o líder dá +${comMult(cfgLoja().moedas_insignia ?? 10)} e a dourada +${comMult(cfgLoja().moedas_dourada ?? 15)}.</div>
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
const premioMissao = (p) => ({ ...(p || {}), moedas: comMult(p?.moedas) });   // PROMPT-126: as moedas × multiplicador

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
  const pr = premioMissao(MISSOES.premio), ps = estado.pets;
  if (pr.moedas) { ps.moedas = (Number(ps.moedas) || 0) + pr.moedas; patch['pets/moedas'] = ps.moedas; registrarGanho('missao', pr.moedas, patch); }
  if (pr.lealdade && ps.ativo && cuidadosDe(ps.ativo)) ganharLealdade(ps.ativo, pr.lealdade, patch);
  avisoPet(`📜 Missão cumprida: ${textoMissao(m)}!${pr.moedas ? ` +${pr.moedas} 🪙` : ''}`, true);
  ganharXPJogo(10, 'missao');   // ⭐ (PROMPT-156)
  moedasVoando(pr.moedas);
  if (md.bonus || !md.lista.every(missaoFeita)) return;
  // as 3 do dia: bônus (fica fora de qualquer teto)
  const b = premioMissao(MISSOES.bonus_todas);
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
  const pr = premioMissao(MISSOES.premio), b = premioMissao(MISSOES.bonus_todas);
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
//  (pets/conquistados/{pet}/truques_vistos). Truque com "sequencia": toca sprites.json → sequencias[forma][nome].
// ============================================================
let TRUQUES = {};
function truquesDe(pet) {
  if (!pet) return null;
  let l = TRUQUES?.[formaBase(pet)];   // pela forma sem cor (PROMPT-84): o vermelho colorido não está no truques.json
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
  if (comAviso.length === 1) avisoPet(`${comAviso[0].emoji} ${nomePet(pet)} aprendeu um truque: ${comAviso[0].nome}! Veja no Meu Pet.`, true);
  else if (comAviso.length > 1) avisoPet(`✨ ${nomePet(pet)} aprendeu ${comAviso.length} truques! Veja no Meu Pet.`, true);
}

// Fileira de truques embaixo do pet no Meu Pet (PROMPT-75): liberado = emoji grande + nome curto; bloqueado = cinza "🔒 N"
// (N = lealdade que libera). Enquanto o pet está ocupado (um truque tocando, comendo…), os botões ficam apagados.
function renderTruques() {
  const fila = $('mp-tq-fila'), lista = mp && truquesDe(mp.pet);
  fila.hidden = !lista;
  if (!lista) { fila.innerHTML = ''; return; }
  const l = lealdadeDe(mp.pet), ocupado = !!mp.ocupado;
  fila.classList.toggle('ocupado', ocupado);
  fila.innerHTML = lista.map(t => {
    const ok = l >= t.lealdade;
    return `<button class="mp-tq${ok ? '' : ' bloqueado'}" data-truque="${esc(t.id)}"${ocupado ? ' disabled' : ''} aria-label="${esc(t.nome)}${ok ? '' : ` (libera com ${t.lealdade} de lealdade)`}" title="${esc(t.nome)}">
      <span class="mp-tq-ic">${ok ? t.emoji : `🔒<b>${t.lealdade}</b>`}</span><small>${esc(t.curto || t.nome)}</small></button>`;
  }).join('');
}
// Arrastar a fileira (dedo e mouse) mexendo no scrollLeft. Feito à mão porque, com o celular em pé, o jogo inteiro está girado
// 90° e a rolagem nativa iria pelo eixo errado: deltaNoJogo converte o movimento da tela para o eixo do jogo.
// Andou mais de 8 px: é arrasto, e o clique que vem depois não dispara o truque.
const arrastoTq = { x0: 0, y0: 0, s0: 0, ativo: false, andou: false };
function ligarArrastoTruques() {
  const fila = $('mp-tq-fila');
  fila.addEventListener('pointerdown', (e) => { Object.assign(arrastoTq, { ativo: true, andou: false, x0: e.clientX, y0: e.clientY, s0: fila.scrollLeft }); });
  addEventListener('pointermove', (e) => {
    if (!arrastoTq.ativo) return;
    const dx = deltaNoJogo(e.clientX - arrastoTq.x0, e.clientY - arrastoTq.y0).x;
    if (Math.abs(dx) > 8) arrastoTq.andou = true;
    if (arrastoTq.andou) fila.scrollLeft = arrastoTq.s0 - dx;
  });
  addEventListener('pointerup', () => { arrastoTq.ativo = false; });
  addEventListener('pointercancel', () => { arrastoTq.ativo = false; });
}
function tocarTruque(e) {
  if (arrastoTq.andou) { arrastoTq.andou = false; return; }   // foi arrasto, não toque
  const b = e.target.closest('[data-truque]');
  if (!b || b.disabled || !mp || petFora(mp.pet)) return;
  const t = truquesDe(mp.pet)?.find(x => x.id === b.dataset.truque);
  if (!t) return;
  if (!truqueLiberado(t.id, mp.pet)) { falarPet(`Libera com ${t.lealdade} de lealdade`); return; }
  fazerTruque(t.id);
}

// O pet faz as animações do truque, uma depois da outra; busto_fogo aparece no balão
// som dos truques do dragão adulto (PROMPT-88), nos tempos da sequência (PetParado usa deFrente = true)
function somDoTruque(t, pet, forma) {
  if (t.sequencia === 'rugir') return somNaSequencia(`dragao_${/^dragao_vermelho/.test(pet) ? 'vermelho' : 'azul'}_rugido`, forma, 'rugir', 'rugido', null);
  if (t.sequencia === 'cuspir_fogo') return somNaSequencia('dragao_fogo', forma, 'cuspir_fogo', 'ataque_fogo', 'ufa', { fade: 300 });
  if (t.sequencia === 'desfile') return somNaSequencia('dragao_fogo', forma, 'desfile', 'andando_fogo', 'sentado_lado', { fade: 300 });
  return null;
}
function fazerTruque(id) {
  const t = truquesDe(mp?.pet)?.find(x => x.id === id);
  if (!mp || !t || mp.ocupado || !truqueLiberado(id, mp.pet)) return;
  mp.estado = 'truque'; mp.ocupado = true; mp.acordadoAte = Date.now() + ACORDADO_MS;
  renderTruques();   // apaga os botões enquanto o truque toca (tocar no pet também não interrompe: ocupado)
  movimentoCorpo(null);
  mp.som?.parar(0); mp.som = null;
  if (t.sequencia && mp.anim.sequencia(t.sequencia, () => { if (mp?.estado === 'truque') voltarAoNormal(); })) {   // banho, cuspir fogo, rugir: sequência com tempo
    mp.som = somDoTruque(t, mp.pet, mp.forma);
    return;
  }
  if (t.id === 'rugido_campeao') mp.som = somRugido(mp.pet);   // Rugido de campeão: o rugido da cor
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
  const anim = (e.animacao?.tipo === 'plano' && e.animacao.exemplos?.length) || (e.animacao?.tipo === 'figura' && e.animacao.figura) ? e.animacao : null;   // 📐 mapa 12 (PROMPT-128) · 🧱 figura (PROMPT-135)
  $('rel-caixa').classList.toggle('com-plano', !!anim);
  $('rel-plano').hidden = $('rel-anim').hidden = !anim;
  const [, mapaRel, gRel] = /^mapa(\d+)-([AB])$/.exec(chave) || [];
  const ginRel = mapaRel && D.questoes?.[mapaRel]?.ginasios?.[gRel];
  $('relembre').querySelector('.jr-rel-cab small').textContent = anim && ginRel ? `📖 Relembre · ${ginRel.nome}` : '📖 Relembre';
  $('rel-insignia').src = `${IMG}/insignias/insignia-${chave}.webp`;
  $('rel-titulo').textContent = e.titulo || '';
  $('rel-regra').textContent = e.regra || '';
  $('rel-exemplo').innerHTML = exemploRelembre(e.exemplo || '');
  $('rel-exemplo').hidden = !e.exemplo;
  $('rel-dica').textContent = e.dica ? `💡 ${e.dica}` : '';
  $('rel-dica').hidden = !e.dica;
  const pet = petsOk && estado.pets?.ativo && !anim;   // no plano animado, o pet já está andando no plano
  $('rel-pet-bloco').hidden = !pet;
  if (pet) {   // o busto (a cabeça grande, medida e centralizada como nos ícones); sem busto, o pet sentado como antes
    const img = $('rel-pet'), forma = formaDe(pet), busto = temBusto(forma);
    img.removeAttribute('style');
    $('rel-moldura').classList.toggle('com-busto', busto);
    img.src = busto ? bustoPet(forma) : quadrosDe(forma, 'sentado_girando')[0];
    marcarForma(img, pet, busto ? pet : forma);   // o recorte do adulto (data-adulto) é só para o corpo inteiro
    aplicarVisualPet(img, pet);
    if (busto) encaixarIcone(img);
  }
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
  relAnim = anim ? { a: anim, i: 0 } : null;
  if (anim) rodarRelembrePlano(); else { relPlano?.cancelar(); relFig?.cancelar(); }
}

// ── 📐 Relembre animado (PROMPT-128): o pet monta o ponto (Forte Pirata) ou anda no plano (Observatório) ──
let relPlano = null, relFig = null, relAnim = null;   // o plano do cartão, a figura (PROMPT-135) e { a: animacao, i: exemplo }
function parRelembre(x, y, muda) {
  const v = (n, c, on) => (n === null || n === undefined ? '<span class="vazio">?</span>' : `<span class="${c}${on ? ' pisca' : ''}">${fmtPlano(n)}</span>`);
  $('rel-par').innerHTML = `( ${v(x, 'cx', muda === 'x')} , ${v(y, 'cy', muda === 'y')} )`;
}
function rodarRelembrePlano() {
  const r = relAnim;
  if (!r) return;
  relPlano?.cancelar(); relFig?.cancelar();
  const fig = r.a.tipo === 'figura';
  $('rel-par').hidden = $('relembre').querySelector('.jr-rel-legenda').hidden = fig;
  if (fig) {   // 🧱 figura (PROMPT-135): a regra e o exemplo à direita; a figura desenha e anima uma vez (↺ repete)
    const e = explicacaoDe(relembreAberto?.chave) || {};
    relFig ||= criarFigura($('rel-svg'));
    $('rel-fala').innerHTML = `<p>${esc(e.regra || '')}</p>${e.exemplo ? `<p class="jr-rel-exemplo">${exemploRelembre(e.exemplo)}</p>` : ''}${e.dica ? `<p class="jr-rel-dica">💡 ${esc(e.dica)}</p>` : ''}`;
    $('rel-pausa').textContent = '⏸';
    $('rel-pontos').innerHTML = '';
    $('rel-prox').hidden = true;
    const f = relFig;
    if (f.mostrar(r.a.figura)) setTimeout(() => { if (relAnim === r && relFig === f) f.animar().catch(() => {}); }, 700);
    return;
  }
  const ex = r.a.exemplos[r.i], monta = r.a.modo === 'monta';
  relPlano ||= criarPlano($('rel-svg'));
  $('rel-fala').innerHTML = '';
  $('rel-pausa').textContent = '⏸';
  $('rel-pontos').innerHTML = r.a.exemplos.map((_, k) => `<i class="${k === r.i ? 'on' : ''}"></i>`).join('');
  $('rel-prox').hidden = r.a.exemplos.length < 2;
  relPlano.desenhar(faixaPara(monta ? [ex] : pontosDoCaminho(ex.de, ex.mov)));
  const fala = { par: parRelembre, diz: (h) => { const p = document.createElement('p'); p.innerHTML = h; $('rel-fala').appendChild(p); $('rel-fala').scrollTop = 1e6; } };
  (monta ? relPlano.montarPonto(ex, fala) : relPlano.andarDe(ex.de, ex.mov, fala)).catch(() => {});   // cancelada: outra começou
}

function fecharRelembre() {
  if (!relembreAberto) return;
  const { chave } = relembreAberto;
  relembreAberto = null;
  relPlano?.cancelar(); relFig?.cancelar(); relAnim = null;
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
  $('btn-ilha').addEventListener('click', (e) => { e.stopPropagation(); irParaIlhaDoGeral(); });   // 🤖 (PROMPT-132)
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
  // 🎵 música de fundo (PROMPT-88): começa desligada, lembrada em localStorage 'jr_musica'; a professora pode desligar por turma
  document.querySelectorAll('[data-musica]').forEach(b => b.addEventListener('click', () => {
    if (musicaBloqueada()) { avisoTopo('A professora desligou a música'); return; }
    alternarMusica(); pintarMusica(); tocar('clique');
  }));
  pintarMusica();
  setInterval(() => { musicaPara(lugarDaMusica()); pausarMusica('embed', visivel('jogo-embed')); }, 300);
  $('btn-insignias-2').addEventListener('click', abrirEstojo);
  $('btn-cena-voltar').addEventListener('click', sairDaCena);
  ligarCasinha();   // 🏠 Arrumar (PROMPT-105)
  ligarVila();      // 🏘️ vila e vizinhos (PROMPT-109)
  ligarExposicao(); // 🖼️ 🔈 da sala (PROMPT-EXPOSICAO-1)

  $('cena-vp').addEventListener('click', (e) => {
    if (!cena || perguntaAberta) return;
    if (cs?.arrumando || ex?.editando) return;   // 🛠️ arrumando a casinha / 🖼️ decorando a sala: o toque é dos móveis
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
  $('pers-grade').addEventListener('click', (e) => { const b = e.target.closest('[data-pers]'); if (b) selecionarPersonagem(b.dataset.pers); });
  $('pers-palco').addEventListener('click', () => { pers.andarAte = performance.now() + 1600; });   // tocar = anda no lugar
  $('pers-confirmar').addEventListener('click', confirmarPersonagem);
  $('pers-cancelar').addEventListener('click', () => { $('pers-escolha').hidden = true; clearInterval(pers.timer); });
  $('btn-pet').addEventListener('click', abrirMeuPet);
  $('btn-reacao').addEventListener('click', abrirReacoes);
  $('reacoes').addEventListener('click', (e) => { const b = e.target.closest('[data-e]'); if (b) reagirCom(b.dataset.e); else if (!e.target.closest('.jr-reacoes-roda')) fecharReacoes(); });
  $('reacoes-roda').innerHTML = REACOES.map((e, i) => `<button class="jr-reacao" data-e="${e}" style="--i:${i}" aria-label="Reação ${e}">${e}</button>`).join('');
  window.addEventListener('keydown', (e) => { if (e.code === 'Escape') { if (!$('reacoes').hidden) fecharReacoes(); else if (!$('online-lista').hidden) $('online-lista').hidden = true; } });
  $('geral-marcadores').addEventListener('click', (e) => { const b = e.target.closest('.jr-marc-online'); if (b) { e.stopPropagation(); abrirListaOnline(Number(b.dataset.mapa)); } }, true);
  $('online-fechar').addEventListener('click', () => { $('online-lista').hidden = true; });
  $('online-itens').addEventListener('click', cliqueListaOnline);
  $('btn-online').addEventListener('click', abrirListaTodos);
  $('selo-online').addEventListener('click', abrirListaTodos);
  $('chamado-ir').addEventListener('click', (e) => { e.stopPropagation(); responderChamado(true); });
  $('rl-ir').addEventListener('click', (e) => { e.stopPropagation(); irAoRelampago(); });
  $('rl-aviso-x').addEventListener('click', (e) => { e.stopPropagation(); $('rl-aviso').hidden = true; if (rl) rl.avisoFechado = true; });
  $('relampago').addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('[data-rl]'); if (b) responderRelampago(b.dataset.rl); });
  $('chamado-nao').addEventListener('click', (e) => { e.stopPropagation(); responderChamado(false); });
  $('mp-sem-convites').addEventListener('click', alternarSemConvites);
  atualizarBotaoSemConvites();
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
  $('mp-tq-fila').addEventListener('click', tocarTruque);
  ligarArrastoTruques();
  for (const id of ['mp-bolsa-fechar', 'mp-visual-fechar', 'mp-nome-cancelar']) $(id).addEventListener('click', (e) => { e.stopPropagation(); e.target.closest('.mp-sub').hidden = true; });
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
  $('convite').addEventListener('click', cliqueConvite);   // ✅ / 💬 / ❌ e os valores da contraproposta (PROMPT-154)
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
    const pb = e.target.closest('[data-pg-bug]');
    if (pb && !pb.disabled) { $('maquina').hidden = true; abrirBug(Number(pb.dataset.pgBug)); return; }
    if (e.target.closest('[data-pg-oqf]')) { $('maquina').hidden = true; abrirOQF(); return; }
    if (e.target.closest('[data-recordes]')) mostrarRecordes();
    if (cliqueMenuDamas(e)) return;
  });
  $('dm-tab').addEventListener('click', tocarCasaDamas);
  $('dm-sair').addEventListener('click', desistirDamas);
  $('dm-fechar').addEventListener('click', fecharDamas);
  $('dm-revanche').addEventListener('click', revancheDamas);
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
  for (const id of ['perg-calc', 'bt-calc', 'pd-calc']) $(id).addEventListener('click', (e) => { e.stopPropagation(); $('calc').hidden ? abrirCalc() : fecharCalc(); });
  $('calc-teclas').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) { tocar('clique'); calcTecla(b.dataset.k); } });
  $('calc-fechar').addEventListener('click', fecharCalc);
  document.addEventListener('pointerdown', (e) => { if (!$('calc').hidden && !e.target.closest('#calc, #perg-calc, #bt-calc, #pd-calc')) fecharCalc(); }, true);
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
  $('mp-falas').addEventListener('click', (e) => { e.stopPropagation(); alternarPetCalado(); });
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
  $('pet-pergunta').addEventListener('click', (e) => {
    e.stopPropagation();
    const b = e.target.closest('[data-pp]');
    if (b?.dataset.pp === 'relembre') { const c = pp?.chave; fecharPerguntaPet(); if (c) abrirRelembre(c, 'pet'); }
    else if (b) responderPerguntaPet(b);
  });
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
    if (e.target.closest('[data-visitar]')) { visitarCasinha(cartaoColega.c.uid); return; }   // 🏠 (PROMPT-107)
    if (e.target.closest('[data-vizinho]')) { const c = cartaoColega.c; fecharCartaoColega(); convidarVizinho(c.uid, rotuloColega(c.uid, c.reg), c.reg?.turma); return; }   // 🏡 (PROMPT-109)
    if (e.target.closest('[data-desafiar]')) { escolherModoDesafio(cartaoColega.c); return; }
    const md = e.target.closest('[data-modo]');
    if (md) { confirmarDesafio(cartaoColega.c, md.dataset.modo); return; }
    const dm = e.target.closest('[data-desafiar-mesmo]');
    if (dm) { escolherAposta(cartaoColega.c, dm.dataset.desafiarMesmo || 'contas'); return; }
    const ap = e.target.closest('[data-aposta]');
    if (ap) { if (!ap.disabled) desafiarColega(cartaoColega.c, cartaoColega.modo || 'contas', Number(ap.dataset.aposta) || 0); return; }
    const dar = e.target.closest('[data-dar]');
    if (dar) { escolherPresente(cartaoColega.c, 2, dar.dataset.dar); return; }
    const rec = e.target.closest('[data-recado]');
    if (rec) { escolherPresente(cartaoColega.c, 3, cartaoColega.presente?.id, Number(rec.dataset.recado)); return; }
    if (e.target.closest('[data-presente-voltar]')) { escolherPresente(cartaoColega.c, 1); return; }
    if (e.target.closest('[data-dar-ok]')) darPresente(cartaoColega.c, cartaoColega.presente?.id, cartaoColega.presente?.recado);
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
  $('btn-album').addEventListener('click', (e) => { e.stopPropagation(); abrirAlbum(); });
  $('album-fechar').addEventListener('click', (e) => { e.stopPropagation(); $('album').hidden = true; });
  $('album').addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target === $('album')) { $('album').hidden = true; return; }
    const c = e.target.closest('.al-carta');
    if (c) { abrirCartaoFigurinha(Number(c.dataset.i)); tocar('clique'); }   // o cartão grande com a história completa (PROMPT-99)
  });
  $('al-cartao').addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target === $('al-cartao') || e.target.closest('#al-cartao-x')) { $('al-cartao').hidden = true; return; }
    if (e.target.closest('#al-ant')) abrirCartaoFigurinha(alAtual - 1);
    else if (e.target.closest('#al-prox')) abrirCartaoFigurinha(alAtual + 1);
  });
  window.addEventListener('keydown', (e) => {
    if ($('al-cartao').hidden) return;
    if (e.key === 'Escape') $('al-cartao').hidden = true;
    else if (e.key === 'ArrowLeft') abrirCartaoFigurinha(alAtual - 1);
    else if (e.key === 'ArrowRight') abrirCartaoFigurinha(alAtual + 1);
    else return;
    e.stopPropagation();
  });
  $('fig-nova-carta').addEventListener('click', (e) => { e.stopPropagation(); e.target.closest('.al-carta')?.classList.toggle('virada'); });
  $('fig-nova-ok').addEventListener('click', (e) => { e.stopPropagation(); fecharFigurinhaNova(); });
  $('estojo-fechar').addEventListener('click', () => {
    $('estojo').hidden = true;
    if (!$('tela-geral').hidden) desenharMarcadores();
  });
  $('estojo-bandejas').addEventListener('click', (e) => {
    const b = e.target.closest('.insignia');
    if (b) abrirCartao(b.dataset.chave);
  });
  $('cartao-fechar').addEventListener('click', () => { $('cartao').hidden = true; });
  $('cartao-relembre').addEventListener('click', (e) => { e.stopPropagation(); abrirRelembre(e.currentTarget.dataset.chave, 'insignia'); });
  $('btn-relembre').addEventListener('click', () => { if (cena?.tipo === 'interior') abrirRelembre(cena.chave, 'ginasio'); });
  $('rel-ok').addEventListener('click', fecharRelembre);
  $('rel-rev').addEventListener('click', () => rodarRelembrePlano());
  $('rel-pausa').addEventListener('click', () => { const a = relAnim?.a.tipo === 'figura' ? relFig : relPlano; if (a) $('rel-pausa').textContent = a.pausar() ? '▶' : '⏸'; });
  $('rel-prox').addEventListener('click', () => { if (relAnim) { relAnim.i = (relAnim.i + 1) % relAnim.a.exemplos.length; rodarRelembrePlano(); } });
  $('btn-missoes').addEventListener('click', abrirMissoes);
  $('mp-letra').addEventListener('click', alternarLetra);
  ligarBotoesPrograme();
  ligarMapaPrograme();
  ligarQuadroEstudos();
  $('mp-treino').addEventListener('click', (e) => { e.stopPropagation(); tocarTreino(); });
  $('mp-exp').addEventListener('click', (e) => { e.stopPropagation(); abrirPainelExp(); });
  $('mp-exp-fechar').addEventListener('click', (e) => { e.stopPropagation(); $('mp-exp-painel').hidden = true; });
  $('mp-exp-opcoes').addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('[data-exp]'); if (b && !b.disabled) mandarExpedicao(b.dataset.exp); });
  $('mp-exp-chamar').addEventListener('click', (e) => { e.stopPropagation(); abrirChamarExp(); });
  $('mp-exp-confirma').addEventListener('click', (e) => {
    e.stopPropagation();
    const b = e.target.closest('[data-exp-conf]');
    if (b?.dataset.expConf === 'sim') chamarDeVolta(); else if (b) $('mp-exp-confirma').hidden = true;
  });
  $('exp-volta-ok').addEventListener('click', (e) => { e.stopPropagation(); fecharVoltaExp(); });
  $('pres-ok').addEventListener('click', (e) => { e.stopPropagation(); $('pres-card').hidden = true; });
  $('aniv-ok').addEventListener('click', (e) => { e.stopPropagation(); $('aniv').hidden = true; $('aniv-confete').innerHTML = ''; });
  setInterval(tickAniversario, 2000);   // 🎂 a festa do dia (PROMPT-102)
  setInterval(tickExpedicao, 5000);   // relógio do HUD, cartão do Meu Pet e a volta do pet
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

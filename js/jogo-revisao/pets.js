// Jogo de Revisão — pets que seguem o personagem.
// Os quadros vêm de /img/jogo/pets/sprites.json: o número de quadros de cada animação
// é sempre lido do JSON (varia de 1 a 4). Nem todo pet tem todas as animações:
// a que faltar usa `reserva` do JSON e, se ainda faltar, sentado_girando.

export const PETS = ['elefante', 'gato', 'gaviao', 'axolote', 'tigre', 'dragao_azul', 'unicornio', 'dragao_vermelho'];
export const NOME_PET = {
  elefante: 'Elefante', gato: 'Gato', gaviao: 'Gavião',
  axolote: 'Axolote', tigre: 'Tigre', dragao_azul: 'Dragão Azul', unicornio: 'Unicórnio', dragao_vermelho: 'Dragão Vermelho',
};

const BASE = '/img/jogo/';
let SPR = null;

export async function carregarSprites() {
  if (!SPR) SPR = await fetch(BASE + 'pets/sprites.json').then(r => { if (!r.ok) throw new Error('sprites.json'); return r.json(); });
  return SPR;
}

// Pet salvo que não existe mais (ex.: cachorro, porco) conta como "sem pet"
export const petValido = (p) => !!(p && PETS.includes(p) && SPR?.pets?.[p]);

export const temAnim = (pet, anim) => !!SPR?.pets?.[pet]?.[anim]?.length;

// Evolução (sprites.json → evolucao): pet → forma adulta. O pet continua o mesmo (cuidados, nome, falas);
// só muda a FORMA, que é o id usado para os quadros e o tamanho. Pet sem adulto no JSON continua filhote.
export const formaAdulta = (pet) => { const a = SPR?.evolucao?.[pet]; return a && SPR?.pets?.[a] ? a : null; };
// Cores especiais do dragão (PROMPT-74, sprites.json → cores): só visual. O pet continua dragao_azul / dragao_vermelho
// (falas, comidas, truques, lealdade, evolução); para desenhar, a forma vira dragao_{cor}[_adulto] (azul) ou
// dragao_vermelho_{cor}[_adulto] (PROMPT-84: mesmas imagens, mas o nome guarda que é o vermelho, para o tamanho ser o dele).
export const coresDragao = () => SPR?.cores || {};
export const aceitaCor = (pet) => /^dragao_vermelho$/.test(pet || '');   // PROMPT-129: cores especiais só no dragão vermelho
export const ehFormaAdulta = (forma) => /_adulto$/.test(forma || '');
export function formaComCor(forma, cor) {
  if (!cor || !coresDragao()[cor] || !/^dragao_(azul|vermelho)(_adulto)?$/.test(forma || '')) return forma;
  const adulto = ehFormaAdulta(forma) ? '_adulto' : '';
  const f = /^dragao_vermelho/.test(forma) ? `dragao_vermelho_${cor}${adulto}` : `dragao_${cor}${adulto}`;
  if (SPR?.pets?.[f]) return f;
  const antiga = `dragao_${cor}${adulto}`;   // sprites.json sem as formas do vermelho colorido: o nome antigo
  return SPR?.pets?.[antiga] ? antiga : forma;
}
// forma recebida de fora (colegas online): só vale o próprio pet, a forma adulta dele ou (dragão) uma das cores
export function formaValida(pet, forma) {
  if (!forma || forma === pet) return pet;
  if (forma === formaAdulta(pet)) return forma;
  if (aceitaCor(pet)) for (const cor of Object.keys(coresDragao())) if (forma === formaComCor(pet, cor) || forma === formaComCor(formaAdulta(pet), cor)) return forma;
  return pet;
}

// Única forma de pedir quadros de um pet: animação → reserva[animação] → sentado_girando
export function quadrosDe(pet, anim) {
  const a = SPR?.pets?.[pet] || {};
  const reserva = SPR?.reserva?.[anim];
  const lista = a[anim]?.length ? a[anim] : a[reserva]?.length ? a[reserva] : (a.sentado_girando || []);
  return lista.map(q => BASE + q);
}
export const bustoPet = (pet) => quadrosDe(pet, 'busto_sorrindo')[0];
export const temBusto = (pet) => temAnim(pet, 'busto_sorrindo');
// tamanhos vêm do sprites.json (os números abaixo só valem se ele não carregar);
// um pet pode ter quadro próprio em quadro_por_pet (os adultos: 1686 × 808, por causa das asas e do fogo)
export const tamanhoQuadro = (forma) => SPR?.quadro_por_pet?.[forma]?.tamanho_quadro || SPR?.tamanho_quadro || [898, 704];
export const tamanhoBusto = () => SPR?.tamanho_busto || [1036, 1124];
// escala do pet na tela (sprites.json → quadro_por_pet[forma].escala, padrão 1): azul adulto 0,75, vermelho adulto 1,75 (PROMPT-129)
export const escalaPet = (forma) => Number(SPR?.quadro_por_pet?.[forma]?.escala) || 1;
export const escalaMax = () => Math.max(1, ...Object.values(SPR?.quadro_por_pet || {}).map(q => Number(q?.escala) || 1));
// fração da altura do quadro que o pet SENTADO ocupa (o resto é folga para pulos e asas)
export const sentadoNoQuadro = (forma) =>
  (SPR?.quadro_por_pet?.[forma]?.sentado_altura || SPR?.sentado_altura || 604) / tamanhoQuadro(forma)[1];

export function preCarregarPet(pet) {
  if (!SPR?.pets?.[pet]) return;
  for (const anim of Object.keys(SPR.pets[pet])) for (const u of quadrosDe(pet, anim)) { const i = new Image(); i.src = u; }
}

// Variações de quando o pet está parado (Meu Pet e seguidor no mapa). Quem não tem a animação cai na reserva do sprites.json.
export const OCIOSOS = ['farejar', 'farejar_em_pe', 'lamber_pata', 'lamber_rabo', 'lamber_ombro', 'calmo', 'sentado_2'];
let ultimoOcioso = null;
export function sortearOcioso() {   // sem repetir a anterior
  const l = OCIOSOS.filter(a => a !== ultimoOcioso);
  ultimoOcioso = l[Math.floor(Math.random() * l.length)];
  return ultimoOcioso;
}

// ── Sequências com tempo (sprites.json → sequencias[forma][nome]): cada passo = [animação, quadro (1 = primeiro), ms].
// Uma <img> toca uma sequência por vez; começar outra (ou pararSequencia) interrompe a anterior.
const SEQ = new WeakMap();   // img → sequência tocando agora
export const temSequencia = (forma, nome) => !!SPR?.sequencias?.[forma]?.[nome]?.length;
const DE_LADO = /_lado$/;
// img.dataset.seq = nome da sequência tocando: enquanto existir, ninguém mais troca nem redesenha o quadro dessa imagem
// (seguidor do mapa, Meu Pet, ocioso, "vira de lado"). Só tocar outra coisa de propósito (pararSequencia) interrompe.
export const emSequencia = (img) => !!img?.dataset?.seq;
export function pararSequencia(img) {
  const s = SEQ.get(img);
  if (!s) return;
  SEQ.delete(img); delete img.dataset.seq; clearTimeout(s.t); s.ok(false);
}
// Passos que vão ser tocados: os do sprites.json e, se o pet estava de frente e a sequência começa/termina de lado
// (parado_lado, …), uma transição de 300 ms sentado de lado. Nunca a pose de frente no meio (o sentado_girando do adulto é
// 1 quadro só: a pose de frente). tocarSequencia e msAtePasso usam esta mesma lista, então o tempo do fogo bate.
function passosDe(forma, nome, deFrente) {
  const passos = temSequencia(forma, nome) ? [...SPR.sequencias[forma][nome]] : null;
  if (!passos || !deFrente || !temAnim(forma, 'sentado_lado')) return passos;
  const transicao = (p) => DE_LADO.test(p[0]) && p[0] !== 'sentado_lado';   // já sentado de lado: não precisa
  if (transicao(passos[0])) passos.unshift(['sentado_lado', 1, 300]);
  if (transicao(passos[passos.length - 1])) passos.push(['sentado_lado', 1, 300]);
  return passos;
}
// Promise: true no fim; false se foi interrompida; null se o pet não tem a sequência (quem chamou usa a animação simples).
export function tocarSequencia(img, forma, nome, { deFrente = true } = {}) {
  pararSequencia(img);
  const passos = passosDe(forma, nome, deFrente);
  if (!passos) return Promise.resolve(null);
  return new Promise(ok => {
    const s = { ok, t: 0 };
    SEQ.set(img, s);
    img.dataset.seq = nome;
    let i = 0;
    const passo = () => {
      if (SEQ.get(img) !== s) return;
      if (i >= passos.length) { SEQ.delete(img); delete img.dataset.seq; ok(true); return; }
      const [anim, q, ms] = passos[i++], fs = quadrosDe(forma, anim);
      const src = fs[Math.min(Math.max(1, q), fs.length) - 1];
      if (src && img.getAttribute('src') !== src) img.src = src;   // (a batalha troca o src sem dataset)
      if (src) img.dataset.src = src;
      s.t = setTimeout(passo, ms);
    };
    passo();
  });
}
// até quando a sequência chega a um passo (ms desde o começo, contando o giro de entrada): ex. o fogo sair na batalha
// os quadros (src) de cada passo de uma sequência, na ordem: o 1º para medir o desenho, o último para mostrar parado
export function quadrosSeq(forma, nome) {
  return (SPR?.sequencias?.[forma]?.[nome] || []).map(([a, q]) => { const fs = quadrosDe(forma, a); return fs[Math.min(Math.max(1, q), fs.length) - 1]; });
}
export function msAtePasso(forma, nome, achar, { deFrente = true } = {}) {
  const passos = passosDe(forma, nome, deFrente) || [];
  let t = 0;
  for (const p of passos) { if (achar(p)) return t; t += p[2]; }
  return t;
}
// Ações do adulto parado (Meu Pet e mapas), sorteadas sem repetir a anterior. A lista vem do sprites.json → acoes_parado
// (uma lista para todos, ou { forma: lista }), para religar/desligar ações sem mexer no código (PROMPT-67). Nunca cuspir_fogo.
const ACOES_PARADO = ['cheirar', 'lamber_pata', 'lamber_rabo', 'banho'];
function acoesParado(forma) {
  const j = SPR?.acoes_parado, l = Array.isArray(j) ? j : j?.[forma];
  return (Array.isArray(l) ? l : ACOES_PARADO).filter(a => a !== 'cuspir_fogo');
}
let ultimaAcao = null;
export function sortearAcaoParado(forma) {
  const l = comPesoNoturno(acoesParado(forma).filter(a => a !== ultimaAcao && temSequencia(forma, a)));
  if (!l.length) return null;
  ultimaAcao = l[Math.floor(Math.random() * l.length)];
  return ultimaAcao;
}
// 🌙 À noite (PROMPT-93) o pet parado escolhe dormir / descansar com o dobro da chance (a ação entra 2 vezes no sorteio)
let noite = false;
export function definirNoite(sim) { noite = !!sim; }
const DORMIR = new Set(['dormir', 'descansar']);
const comPesoNoturno = (l) => (noite ? [...l, ...l.filter(a => DORMIR.has(a))] : l);

// Ações do pet seguindo o personagem nos mapas (personagem parado 4 s): a mesma lista do parado (acoes_parado)
const MS_ANTES_ACAO = 4000;
const MS_FOME = 5500;   // com fome: a sequência `fome` (~4,7 s: cheira o ar e lambe os beiços) começa a cada ~10 s
const temAcoesMapa = (forma) => acoesParado(forma).some(a => temSequencia(forma, a));
// aba em segundo plano: os seguidores param a ação (a sequência roda por setTimeout, que continua com a aba escondida)
const SEGUIDORES = new Set();
document.addEventListener('visibilitychange', () => { if (document.hidden) for (const s of SEGUIDORES) s.pararAcao(); });

// Emoções de 1 quadro (adultos) ficam 1,5 s na tela
export const EMOCOES = new Set(['feliz', 'bravo', 'confuso', 'assustado', 'orgulhoso', 'animado', 'ufa', 'calmo']);
export const MS_EMOCAO = 1500;

// Ritmo de cada animação: ms por quadro, se repete, quanto segura o último quadro e quantas vezes passa (vezes)
// forma: a forma desenhada (o dragão adulto anda de lado mais devagar, PROMPT-87)
function ritmo(anim, n, forma = '') {
  if ((anim === 'andar_direita' || anim === 'andar_esquerda') && ehFormaAdulta(forma)) return { ms: 200, loop: true };   // dragão adulto de lado: 200 ms por quadro
  if (anim.startsWith('andar_')) return { ms: n === 2 ? 200 : 150, loop: true };   // andar_frente/andar_costas do adulto: os 8 quadros em ciclo
  if (n === 1 && EMOCOES.has(anim)) return { ms: MS_EMOCAO, loop: false };
  switch (anim) {
    case 'correndo': return { ms: 90, loop: true };
    case 'costas_parado': return { ms: 250, loop: true };
    case 'sentado_girando': return { ms: 400, loop: true };
    case 'sentado_2': return { ms: n === 1 ? 2000 : 300, loop: false };   // adulto: 1 quadro (sentado de lado), segura ~2 s
    case 'feliz': case 'pulo_cambalhota': return { ms: 90, loop: false };
    case 'salto_pouso': return { ms: 90, loop: false, ultimo: 140 };
    case 'comendo': case 'dormindo': case 'triste_fome': return { ms: 350, loop: true };
    case 'rugido': return { ms: 260, loop: false, ultimo: 600 };
    case 'ataque_fogo': return { ms: 220, loop: false, ultimo: 650 };
    // emoções e variações (1 ou 2 quadros nos adultos; nos filhotes caem na reserva): seguram um pouco e voltam
    case 'farejar': case 'lamber_pata': case 'lamber_rabo': return { ms: 450, loop: false, vezes: n <= 2 ? 5 : 1 };   // 2 quadros (adulto): 5 vezes, ~4,5 s
    case 'bravo': case 'confuso': case 'assustado': case 'orgulhoso': case 'animado': case 'calmo': case 'ufa': case 'rugido_sentado':
    case 'prepara_fogo': case 'lamber_beicos': case 'farejar_em_pe': case 'lamber_ombro':
      return { ms: n === 1 ? 900 : 500, loop: false };
    case 'assar_comida': return { ms: n === 1 ? 1200 : 400, loop: false };
    case 'andando_fogo': return { ms: 320, loop: false, ultimo: 700 };
    default: return { ms: 300, loop: true };
  }
}

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const MAX_RASTRO = 120;   // pontos guardados do caminho do personagem

// O pet anda pelo rastro do personagem (assim não sai da trilha nem atravessa paredes)
export class PetSeguidor {
  constructor(img, sombra) {
    this.img = img; this.sombra = sombra;
    this.pet = null; this.forma = null; this.x = 0; this.y = 0;
    this.anim = 'sentado_girando'; this.q = 0; this.t = 0; this.lista = [];
    this.rastro = [];               // pontos por onde o personagem passou (mais antigo primeiro)
    this.reacao = null;             // { anim, ate } — animação especial em andamento
    this.paradoMs = 0;              // há quanto tempo o personagem está parado
    this.andandoMs = 0;             // há quanto tempo o personagem está andando
    this.ultJog = null;             // posição do personagem no quadro anterior
    this.esperar = false;           // personagem parou: ao voltar a andar, o pet espera antes de seguir
    this.alcancando = false;        // ficou para trás: anda 1,3× até voltar à distância normal
    this.fome = false;              // barriga abaixo de 40: parado, fica triste (triste_fome) ou, o adulto, toca `fome` de vez em quando
    this.proxOcioso = 8000;         // quando fazer uma variação do ocioso (farejar, se lamber, descansar…)
    this.ocioso = false;            // fazendo uma dessas variações agora
    this.espelhar = false; this.altura = 60;
    this.esquerda = false;          // último lado para onde andou (para frente/costas que caem em andar_direita)
    this.acao = null;               // sequência tocando agora (pets com `sequencias`: cheirar, banho, rugir…)
    this.ultimaAcao = null;
    this.esperaAcao = MS_ANTES_ACAO; // quanto falta, parado e sentado, para a próxima ação
    this.pausado = false;           // balão de fala, janela por cima, pescando…: sem ações
    this.zFixo = null;              // 🏠 deitado na cama da casinha (PROMPT-105): desenha por cima dela
    this.zCasa = null;              // 🏠 dentro da casinha (PROMPT-114): sempre na frente de todos os móveis de chão
    this.antesDaAcao = null;        // (nome) => true: quem chamou cuida da ação (na casinha, dormir/descansar vai para a cama)
    SEGUIDORES.add(this);
  }

  // Interrompe a sequência (personagem andou, reação, balão, janela, aba escondida) e recomeça os 4 s
  pararAcao() {
    this.esperaAcao = MS_ANTES_ACAO;
    this.fixa = false;
    if (!this.acao) return;
    this.acao = null;
    pararSequencia(this.img);
    this.trocar('sentado_girando', true); this.desenhar();
  }
  descartar() { this.pararAcao(); SEGUIDORES.delete(this); }   // pet de colega que saiu do mapa
  pausarAcoes(sim) { this.pausado = !!sim; if (sim && !this.fixa) this.pararAcao(); }
  // Comemoração (PROMPT-65: insígnia nova, duelo vencido): toca a sequência (ex. `vitoria`) uma vez. Não para com o balão
  // de fala nem com janela por cima; só se o personagem andar, vier uma reação ou a fome. false = o pet não tem a sequência.
  comemorar(nome = 'vitoria') {
    if (!this.pet || !temSequencia(this.forma, nome)) return false;
    this.pararAcao();
    this.reacao = null;
    this.acao = nome; this.fixa = true;
    tocarSequencia(this.img, this.forma, nome).then(fim => {
      if (!fim || this.acao !== nome) return;
      this.acao = null; this.fixa = false; this.esperaAcao = MS_ANTES_ACAO;
      this.trocar('sentado_girando', true); this.desenhar();
    });
    return true;
  }

  comecarAcao(nome = null) {
    if (!nome) {
      const l = comPesoNoturno(acoesParado(this.forma).filter(a => a !== this.ultimaAcao && temSequencia(this.forma, a)));
      if (!l.length) return;
      nome = this.ultimaAcao = l[Math.floor(Math.random() * l.length)];
      if (this.antesDaAcao?.(nome)) { this.esperaAcao = MS_ANTES_ACAO; return; }
    }
    this.acao = nome;
    tocarSequencia(this.img, this.forma, nome).then(fim => {
      if (!fim || this.acao !== nome) return;
      this.acao = null; this.esperaAcao = this.fome ? MS_FOME : MS_ANTES_ACAO;
      this.trocar('sentado_girando', true); this.desenhar();
    });
  }

  // pet = quem é (cuidados, nome, falas); forma = qual desenho usar (o filhote ou o adulto)
  definir(pet, forma = pet) {
    this.pararAcao();
    this.pet = pet; this.forma = pet ? forma : null;
    this.img.hidden = this.sombra.hidden = !pet;
    if (pet) { this.reacao = null; this.trocar('sentado_girando', true); this.desenhar(); }
  }

  // Ao entrar numa cena: o pet aparece junto do personagem
  colocar(x, y) {
    this.x = x; this.y = y;
    this.rastro = [[x, y]];
    this.paradoMs = 0; this.andandoMs = 0; this.ultJog = null; this.esperar = false; this.alcancando = false;
    this.pararAcao();
    if (this.pet) { this.reacao = null; this.trocar('sentado_girando', true); this.desenhar(); }
  }

  // Animação especial (feliz, pulo, triste…). Sem loop: volta ao ocioso no fim; com loop: dura `ms`.
  reagir(anim, ms = 0) {
    if (!this.pet) return;
    this.pararAcao();
    this.reacao = { anim, ate: ms ? performance.now() + ms : 0 };
    this.trocar(anim, true);
  }

  // Pet sem andar_frente/andar_costas cuja reserva é andar_direita: vira para o lado em que está indo
  andarVertical(anim) {
    if (temAnim(this.forma, anim) || SPR?.reserva?.[anim] !== 'andar_direita') return anim;
    return this.esquerda ? 'andar_esquerda' : 'andar_direita';
  }

  trocar(anim, reiniciar) {
    if (this.anim === anim && !reiniciar) return;
    this.anim = anim; this.q = 0; this.t = 0; this.vez = 1;
    this.lista = quadrosDe(this.forma, anim);
  }

  // dt em segundos; (jx, jy) = pés do personagem; vel = velocidade dele (px/s);
  // altPet = altura da imagem do pet na cena (constante do jogo, não o tamanho do arquivo);
  // distPet = distância normal atrás do personagem, medida ao longo do rastro; esc = escala da cena (2 no ginásio)
  atualizar(dt, jx, jy, vel, altPet, distPet, esc = 1) {
    if (!this.pet) return;
    this.altura = altPet;
    const [qw, qh] = tamanhoQuadro(this.forma);
    const largura = this.altura * (qw / qh);
    const ms = dt * 1000;

    // rastro do personagem (um ponto a cada 2 px andados)
    const u = this.rastro[this.rastro.length - 1];
    if (!u || dist(u[0], u[1], jx, jy) > 2) { this.rastro.push([jx, jy]); if (this.rastro.length > MAX_RASTRO) this.rastro.splice(0, this.rastro.length - MAX_RASTRO); }
    // dois contadores: tempo andando e tempo parado do personagem (comparando com o quadro anterior)
    const mexeu = !!this.ultJog && dist(this.ultJog[0], this.ultJog[1], jx, jy) > 0.01;
    this.ultJog = [jx, jy];
    if (mexeu) { this.andandoMs += ms; this.paradoMs = 0; }
    else { this.paradoMs += ms; this.andandoMs = 0; }
    const jogParado = this.paradoMs > 250;
    if (jogParado) this.esperar = true;                                  // ao voltar a andar, espera 0,5 s
    if (this.esperar && this.andandoMs >= 500) this.esperar = false;
    const esperando = this.esperar && mexeu;

    // Caminho que falta até o personagem, seguindo o rastro na ordem: pet → rastro[0] → … → personagem.
    // O pet só anda enquanto esse caminho for maior que `atras`,
    // então nunca passa do ponto nem "come" o rastro quando o personagem para.
    let falta = 0, px = this.x, py = this.y;
    for (const [qx, qy] of this.rastro) { falta += dist(px, py, qx, qy); px = qx; py = qy; }
    falta += dist(px, py, jx, jy);

    // parado: chega mais perto e senta; andando: distância normal, 1,3× quando fica para trás, corre se ficar longe
    const atras = jogParado ? Math.round(distPet * 0.55) : distPet;
    if (falta > distPet + 10 * esc) this.alcancando = true;
    else if (falta <= distPet) this.alcancando = false;
    const longe = !jogParado && falta > distPet + 62 * esc;
    const mult = jogParado ? 1 : longe ? 1.6 : this.alcancando ? 1.3 : 1;
    const x0 = this.x, y0 = this.y;
    let anda = esperando ? 0 : Math.min(falta - atras, vel * mult * dt);
    while (anda > 0.01 && this.rastro.length) {
      const [qx, qy] = this.rastro[0];
      const d = dist(this.x, this.y, qx, qy);
      if (d <= anda) { this.x = qx; this.y = qy; anda -= d; this.rastro.shift(); }
      else { this.x += (qx - this.x) / d * anda; this.y += (qy - this.y) / d * anda; anda = 0; }
    }
    const dx = this.x - x0, dy = this.y - y0;
    const andando = Math.hypot(dx, dy) > 0.05;
    if (Math.abs(dx) > 0.05) this.esquerda = dx < 0;

    // qual animação mostrar
    if (this.reacao) {
      if (this.reacao.ate && performance.now() >= this.reacao.ate) { this.reacao = null; }
      else if (andando && falta > atras + largura) { this.reacao = null; }   // personagem saiu andando: o pet vai atrás
    }
    // ação em andamento (sequência): para na hora se o personagem andar ou se a fome/uma reação entrar
    if (this.acao && (mexeu || andando || this.reacao || this.fome !== (this.acao === 'fome') || (this.pausado && !this.fixa))) this.pararAcao();
    if (this.acao) {
      this.espelhar = this.esquerda;   // as sequências são desenhadas viradas para a direita
      this.desenhar();
      return;
    }
    if (mexeu) this.esperaAcao = MS_ANTES_ACAO;
    if (!this.reacao) {
      this.espelhar = false;
      if (andando) {
        if (longe) { this.trocar('correndo'); this.espelhar = dx < 0; }   // correndo é virado para a direita
        else if (Math.abs(dx) >= Math.abs(dy)) this.trocar(dx > 0 ? 'andar_direita' : 'andar_esquerda');
        else this.trocar(this.andarVertical(dy > 0 ? 'andar_frente' : 'andar_costas'));
        this.proxOcioso = 6000 + Math.random() * 1000;   // parado há mais de ~6 s: a 1ª variação
        this.ocioso = false;
        this.esperaAcao = MS_ANTES_ACAO;
      } else if (this.fome && temSequencia(this.forma, 'fome')) {   // adulto com fome: cheira o ar e lambe os beiços a cada ~10 s
        this.ocioso = false;
        this.trocar('triste_fome');
        if (!this.pausado) {
          this.esperaAcao -= ms;
          if (this.esperaAcao <= 0) { this.comecarAcao('fome'); this.espelhar = this.esquerda; this.desenhar(); return; }
        }
      } else if (this.fome) {
        this.trocar('triste_fome');
      } else if (temAcoesMapa(this.forma)) {   // pet com sequências: 4 s sentado, depois uma ação; 4 s entre uma e outra
        this.ocioso = false;
        this.trocar('sentado_girando');
        if (!this.pausado) {
          this.esperaAcao -= ms;
          if (this.esperaAcao <= 0) { this.comecarAcao(); if (this.acao) { this.espelhar = this.esquerda; this.desenhar(); return; } this.esperaAcao = MS_ANTES_ACAO; }
        }
      } else if (!this.ocioso) {
        this.trocar('sentado_girando');
        this.proxOcioso -= dt * 1000;
        if (this.proxOcioso <= 0) { this.proxOcioso = 9000 + Math.random() * 3000; this.ocioso = true; this.trocar(sortearOcioso(), true); }   // depois, ~1 a cada 10 s
      }
    }

    // avança o quadro
    const r = ritmo(this.anim, this.lista.length, this.forma);
    const ultimo = this.q === this.lista.length - 1;
    this.t += dt * 1000;
    if (this.t >= (ultimo && r.ultimo ? r.ultimo : r.ms)) {
      this.t = 0;
      if (!ultimo) this.q++;
      else if (r.loop) this.q = 0;
      else if (this.vez < (r.vezes || 1)) { this.vez++; this.q = 0; }
      else { this.reacao = null; this.ocioso = false; this.trocar('sentado_girando', true); }   // animação de uma vez só terminou
    }
    this.desenhar();
  }

  desenhar() {
    if (!this.pet || !this.lista.length) return;
    const src = this.lista[Math.min(this.q, this.lista.length - 1)];
    if (!this.acao && !emSequencia(this.img) && this.img.dataset.src !== src) { this.img.src = src; this.img.dataset.src = src; }   // na ação, a sequência troca o quadro
    this.img.style.left = this.x + 'px';
    this.img.style.top = this.y + 'px';
    this.img.style.height = this.altura + 'px';
    this.img.style.zIndex = this.zCasa ?? this.zFixo ?? Math.round(this.y) - 1;   // empate com o personagem: o pet fica atrás
    this.img.classList.toggle('espelhado', this.espelhar);
    const s = this.sombra.style;
    s.left = this.x + 'px'; s.top = this.y + 'px';
    s.width = this.altura * 0.8 + 'px'; s.height = this.altura * 0.16 + 'px';
    s.zIndex = this.zCasa != null ? this.zCasa - 1 : this.zFixo != null ? this.zFixo - 1 : Math.round(this.y) - 2;
  }
}

// Pet parado num lugar (o que espera ao lado do líder): só anima, não segue ninguém
export class PetParado {
  constructor(img) { this.img = img; this.pet = null; this.anim = ''; this.q = 0; this.t = 0; this.lista = []; this.aoAcabar = null; this.ciclos = 0; this.vez = 1; this.emSeq = false; }

  definir(pet) { this.pet = pet; this.tocar('sentado_girando'); }

  // Animação sem loop volta para sentado_girando no fim (e chama aoAcabar)
  tocar(anim, aoAcabar = null) {
    pararSequencia(this.img); this.emSeq = false;   // interrompe a sequência que estiver tocando
    this.anim = anim; this.q = 0; this.t = 0; this.aoAcabar = aoAcabar; this.ciclos = 0; this.vez = 1;
    this.lista = quadrosDe(this.pet, anim);
    this.desenhar();
  }

  // Sequência com tempo (sprites.json → sequencias). false = o pet não tem (quem chamou usa tocar()).
  // No fim volta para sentado_girando e chama aoAcabar; interrompida (tocar/outra sequência), não chama.
  // ciclo: recomeça no fim até ser interrompida (dormir).
  sequencia(nome, aoAcabar = null, { ciclo = false } = {}) {
    if (!temSequencia(this.pet, nome)) return false;
    const anim = this.anim = 'seq:' + nome; this.emSeq = true; this.aoAcabar = null;
    const rodar = () => tocarSequencia(this.img, this.pet, nome).then(fim => {
      if (!fim) return;
      if (ciclo && this.anim === anim) { rodar(); return; }
      this.tocar('sentado_girando'); aoAcabar?.();
    });
    rodar();
    return true;
  }

  atualizar(dt) {
    if (this.emSeq || !this.lista.length) return;
    const r = ritmo(this.anim, this.lista.length, this.pet);
    const ultimo = this.q === this.lista.length - 1;
    this.t += dt * 1000;
    if (this.t < (ultimo && r.ultimo ? r.ultimo : r.ms)) return;
    this.t = 0;
    if (!ultimo) this.q++;
    else if (r.loop) { this.q = 0; this.ciclos++; }   // ciclos completos da animação em loop
    else if (this.vez < (r.vezes || 1)) { this.vez++; this.q = 0; }
    else { const f = this.aoAcabar; this.tocar('sentado_girando'); f?.(); return; }
    this.desenhar();
  }

  desenhar() {
    if (emSequencia(this.img)) return;   // a sequência é quem troca o quadro
    const src = this.lista[Math.min(this.q, this.lista.length - 1)];
    if (src && this.img.dataset.src !== src) { this.img.src = src; this.img.dataset.src = src; }
  }
}

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
// forma recebida de fora (colegas online): só vale o próprio pet ou a forma adulta dele
export const formaValida = (pet, forma) => (forma && forma === formaAdulta(pet) ? forma : pet);

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
// um pet pode ter quadro próprio em quadro_por_pet (os adultos: 1402 × 801, por causa das asas)
export const tamanhoQuadro = (forma) => SPR?.quadro_por_pet?.[forma]?.tamanho_quadro || SPR?.tamanho_quadro || [898, 704];
export const tamanhoBusto = () => SPR?.tamanho_busto || [1036, 1124];
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

// Ritmo de cada animação: ms por quadro, se repete, e quanto segura o último quadro
function ritmo(anim, n) {
  if (anim.startsWith('andar_')) return { ms: n === 2 ? 200 : 150, loop: true };
  switch (anim) {
    case 'correndo': return { ms: 90, loop: true };
    case 'costas_parado': return { ms: 250, loop: true };
    case 'sentado_girando': return { ms: 400, loop: true };
    case 'sentado_2': return { ms: 300, loop: false };
    case 'feliz': case 'pulo_cambalhota': return { ms: 90, loop: false };
    case 'salto_pouso': return { ms: 90, loop: false, ultimo: 140 };
    case 'comendo': case 'dormindo': case 'triste_fome': return { ms: 350, loop: true };
    case 'rugido': return { ms: 260, loop: false, ultimo: 600 };
    case 'ataque_fogo': return { ms: 220, loop: false, ultimo: 650 };
    // emoções e variações (1 ou 2 quadros nos adultos; nos filhotes caem na reserva): seguram um pouco e voltam
    case 'farejar': case 'lamber_pata': case 'lamber_rabo': return { ms: 350, loop: false };   // quadros repetidos no sprites.json: ~2 s
    case 'bravo': case 'confuso': case 'assustado': case 'orgulhoso': case 'animado': case 'calmo': case 'ufa': case 'rugido_sentado':
    case 'prepara_fogo': case 'lamber_beicos': case 'farejar_em_pe': case 'lamber_ombro':
      return { ms: n === 1 ? 900 : 500, loop: false };
    case 'assar_comida': return { ms: n === 1 ? 1200 : 400, loop: false };
    case 'andando_fogo': case 'voo_fogo': return { ms: 320, loop: false, ultimo: 700 };
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
    this.fome = false;              // barriga abaixo de 40: parado, fica triste (triste_fome)
    this.proxOcioso = 8000;         // quando fazer uma variação do ocioso (farejar, se lamber, descansar…)
    this.ocioso = false;            // fazendo uma dessas variações agora
    this.espelhar = false; this.altura = 60;
    this.esquerda = false;          // último lado para onde andou (para frente/costas que caem em andar_direita)
  }

  // pet = quem é (cuidados, nome, falas); forma = qual desenho usar (o filhote ou o adulto)
  definir(pet, forma = pet) {
    this.pet = pet; this.forma = pet ? forma : null;
    this.img.hidden = this.sombra.hidden = !pet;
    if (pet) { this.reacao = null; this.trocar('sentado_girando', true); this.desenhar(); }
  }

  // Ao entrar numa cena: o pet aparece junto do personagem
  colocar(x, y) {
    this.x = x; this.y = y;
    this.rastro = [[x, y]];
    this.paradoMs = 0; this.andandoMs = 0; this.ultJog = null; this.esperar = false; this.alcancando = false;
    if (this.pet) { this.reacao = null; this.trocar('sentado_girando', true); this.desenhar(); }
  }

  // Animação especial (feliz, pulo, triste…). Sem loop: volta ao ocioso no fim; com loop: dura `ms`.
  reagir(anim, ms = 0) {
    if (!this.pet) return;
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
    this.anim = anim; this.q = 0; this.t = 0;
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
    if (!this.reacao) {
      this.espelhar = false;
      if (andando) {
        if (longe) { this.trocar('correndo'); this.espelhar = dx < 0; }   // correndo é virado para a direita
        else if (Math.abs(dx) >= Math.abs(dy)) this.trocar(dx > 0 ? 'andar_direita' : 'andar_esquerda');
        else this.trocar(this.andarVertical(dy > 0 ? 'andar_frente' : 'andar_costas'));
        this.proxOcioso = 6000 + Math.random() * 1000;   // parado há mais de ~6 s: a 1ª variação
        this.ocioso = false;
      } else if (this.fome) {
        this.trocar('triste_fome');
      } else if (!this.ocioso) {
        this.trocar('sentado_girando');
        this.proxOcioso -= dt * 1000;
        if (this.proxOcioso <= 0) { this.proxOcioso = 9000 + Math.random() * 3000; this.ocioso = true; this.trocar(sortearOcioso(), true); }   // depois, ~1 a cada 10 s
      }
    }

    // avança o quadro
    const r = ritmo(this.anim, this.lista.length);
    const ultimo = this.q === this.lista.length - 1;
    this.t += dt * 1000;
    if (this.t >= (ultimo && r.ultimo ? r.ultimo : r.ms)) {
      this.t = 0;
      if (!ultimo) this.q++;
      else if (r.loop) this.q = 0;
      else { this.reacao = null; this.ocioso = false; this.trocar('sentado_girando', true); }   // animação de uma vez só terminou
    }
    this.desenhar();
  }

  desenhar() {
    if (!this.pet || !this.lista.length) return;
    const src = this.lista[Math.min(this.q, this.lista.length - 1)];
    if (this.img.dataset.src !== src) { this.img.src = src; this.img.dataset.src = src; }
    this.img.style.left = this.x + 'px';
    this.img.style.top = this.y + 'px';
    this.img.style.height = this.altura + 'px';
    this.img.style.zIndex = Math.round(this.y) - 1;   // empate com o personagem: o pet fica atrás
    this.img.classList.toggle('espelhado', this.espelhar);
    const s = this.sombra.style;
    s.left = this.x + 'px'; s.top = this.y + 'px';
    s.width = this.altura * 0.8 + 'px'; s.height = this.altura * 0.16 + 'px';
    s.zIndex = Math.round(this.y) - 2;
  }
}

// Pet parado num lugar (o que espera ao lado do líder): só anima, não segue ninguém
export class PetParado {
  constructor(img) { this.img = img; this.pet = null; this.anim = ''; this.q = 0; this.t = 0; this.lista = []; this.aoAcabar = null; this.ciclos = 0; }

  definir(pet) { this.pet = pet; this.tocar('sentado_girando'); }

  // Animação sem loop volta para sentado_girando no fim (e chama aoAcabar)
  tocar(anim, aoAcabar = null) {
    this.anim = anim; this.q = 0; this.t = 0; this.aoAcabar = aoAcabar; this.ciclos = 0;
    this.lista = quadrosDe(this.pet, anim);
    this.desenhar();
  }

  atualizar(dt) {
    if (!this.lista.length) return;
    const r = ritmo(this.anim, this.lista.length);
    const ultimo = this.q === this.lista.length - 1;
    this.t += dt * 1000;
    if (this.t < (ultimo && r.ultimo ? r.ultimo : r.ms)) return;
    this.t = 0;
    if (!ultimo) this.q++;
    else if (r.loop) { this.q = 0; this.ciclos++; }   // ciclos completos da animação em loop
    else { const f = this.aoAcabar; this.tocar('sentado_girando'); f?.(); return; }
    this.desenhar();
  }

  desenhar() {
    const src = this.lista[Math.min(this.q, this.lista.length - 1)];
    if (src && this.img.dataset.src !== src) { this.img.src = src; this.img.dataset.src = src; }
  }
}

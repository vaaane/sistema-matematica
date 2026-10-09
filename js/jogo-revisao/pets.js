// Jogo de Revisão — pets que seguem o personagem.
// Os quadros vêm de /img/jogo/pets/sprites.json: o número de quadros de cada animação
// é sempre lido do JSON (varia de 1 a 4). Nem todo pet tem todas as animações:
// a que faltar usa `reserva` do JSON e, se ainda faltar, sentado_girando.

export const PETS = ['capivara', 'gato', 'gaviao', 'axolote', 'tigre', 'dragao_azul', 'unicornio', 'dragao_vermelho'];
export const NOME_PET = {
  capivara: 'Capivara', gato: 'Gato', gaviao: 'Gavião',
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

const temAnim = (pet, anim) => !!SPR?.pets?.[pet]?.[anim]?.length;

// Única forma de pedir quadros de um pet: animação → reserva[animação] → sentado_girando
export function quadrosDe(pet, anim) {
  const a = SPR?.pets?.[pet] || {};
  const reserva = SPR?.reserva?.[anim];
  const lista = a[anim]?.length ? a[anim] : a[reserva]?.length ? a[reserva] : (a.sentado_girando || []);
  return lista.map(q => BASE + q);
}
export const bustoPet = (pet) => quadrosDe(pet, 'busto_sorrindo')[0];
export const temBusto = (pet) => temAnim(pet, 'busto_sorrindo');
// tamanhos vêm do JSON (largura, altura do quadro e do busto)
export const tamanhoQuadro = () => SPR?.tamanho_quadro || [449, 352];
export const tamanhoBusto = () => SPR?.tamanho_busto || [518, 562];

export function preCarregarPet(pet) {
  if (!petValido(pet)) return;
  for (const anim of Object.keys(SPR.pets[pet])) for (const u of quadrosDe(pet, anim)) { const i = new Image(); i.src = u; }
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
    default: return { ms: 300, loop: true };
  }
}

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const MAX_RASTRO = 120;   // pontos guardados do caminho do personagem

// O pet anda pelo rastro do personagem (assim não sai da trilha nem atravessa paredes)
export class PetSeguidor {
  constructor(img, sombra) {
    this.img = img; this.sombra = sombra;
    this.pet = null; this.x = 0; this.y = 0;
    this.anim = 'sentado_girando'; this.q = 0; this.t = 0; this.lista = [];
    this.rastro = [];               // pontos por onde o personagem passou (mais antigo primeiro)
    this.reacao = null;             // { anim, ate } — animação especial em andamento
    this.paradoMs = 0;              // há quanto tempo o personagem está parado
    this.proxOcioso = 8000;         // quando fazer a variação do ocioso (sentado_2)
    this.espelhar = false; this.altura = 60;
    this.esquerda = false;          // último lado para onde andou (para frente/costas que caem em andar_direita)
  }

  definir(pet) {
    this.pet = pet;
    this.img.hidden = this.sombra.hidden = !pet;
    if (pet) { this.reacao = null; this.trocar('sentado_girando', true); this.desenhar(); }
  }

  // Ao entrar numa cena: o pet aparece junto do personagem
  colocar(x, y) {
    this.x = x; this.y = y;
    this.rastro = [[x, y]];
    this.paradoMs = 0;
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
    if (temAnim(this.pet, anim) || SPR?.reserva?.[anim] !== 'andar_direita') return anim;
    return this.esquerda ? 'andar_esquerda' : 'andar_direita';
  }

  trocar(anim, reiniciar) {
    if (this.anim === anim && !reiniciar) return;
    this.anim = anim; this.q = 0; this.t = 0;
    this.lista = quadrosDe(this.pet, anim);
  }

  // dt em segundos; (jx, jy) = pés do personagem; vel = velocidade dele (px/s);
  // altPet = altura do pet na cena (constante do jogo, não o tamanho do arquivo);
  // atras = distância que o pet mantém, medida ao longo do rastro; correr = acima disso ele corre 1,6× mais rápido
  atualizar(dt, jx, jy, vel, altPet, atras, correr) {
    if (!this.pet) return;
    this.altura = altPet;
    const [qw, qh] = tamanhoQuadro();
    const largura = this.altura * (qw / qh);

    // rastro do personagem
    const u = this.rastro[this.rastro.length - 1];
    const andou = !u || dist(u[0], u[1], jx, jy) > 2;
    if (andou) { this.rastro.push([jx, jy]); if (this.rastro.length > MAX_RASTRO) this.rastro.splice(0, this.rastro.length - MAX_RASTRO); }
    this.paradoMs = andou ? 0 : this.paradoMs + dt * 1000;

    // Caminho que falta até o personagem, seguindo o rastro na ordem: pet → rastro[0] → … → personagem.
    // O pet só anda enquanto esse caminho for maior que `atras`,
    // então nunca passa do ponto nem "come" o rastro quando o personagem para.
    let falta = 0, px = this.x, py = this.y;
    for (const [qx, qy] of this.rastro) { falta += dist(px, py, qx, qy); px = qx; py = qy; }
    falta += dist(px, py, jx, jy);

    const longe = falta > correr;
    const x0 = this.x, y0 = this.y;
    let anda = Math.min(falta - atras, vel * (longe ? 1.6 : 1) * dt);
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
        this.proxOcioso = 6000 + Math.random() * 6000;
      } else if (this.paradoMs >= 30000) {
        this.trocar('dormindo');
      } else if (this.anim !== 'sentado_2') {
        this.trocar('sentado_girando');
        this.proxOcioso -= dt * 1000;
        if (this.proxOcioso <= 0) { this.proxOcioso = 7000 + Math.random() * 6000; this.trocar('sentado_2', true); }
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
      else { this.reacao = null; this.trocar('sentado_girando', true); }   // animação de uma vez só terminou
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
  constructor(img) { this.img = img; this.pet = null; this.anim = ''; this.q = 0; this.t = 0; this.lista = []; this.aoAcabar = null; }

  definir(pet) { this.pet = pet; this.tocar('sentado_girando'); }

  // Animação sem loop volta para sentado_girando no fim (e chama aoAcabar)
  tocar(anim, aoAcabar = null) {
    this.anim = anim; this.q = 0; this.t = 0; this.aoAcabar = aoAcabar;
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
    else if (r.loop) this.q = 0;
    else { const f = this.aoAcabar; this.tocar('sentado_girando'); f?.(); return; }
    this.desenhar();
  }

  desenhar() {
    const src = this.lista[Math.min(this.q, this.lista.length - 1)];
    if (src && this.img.dataset.src !== src) { this.img.src = src; this.img.dataset.src = src; }
  }
}

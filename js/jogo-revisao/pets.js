// Jogo de Revisão — pets que seguem o personagem.
// Os quadros vêm de /img/jogo/pets/sprites.json: o número de quadros de cada animação
// é sempre lido do JSON (varia de 1 a 4). Nem todo pet tem todas as animações:
// a que faltar usa `reserva` do JSON e, se ainda faltar, sentado_girando.

export const PETS = ['elefante', 'gato', 'gaviao', 'axolote', 'capivara', 'tigre', 'morcego', 'unicornio', 'dragao_vermelho'];   // PROMPT-159: o morcego no lugar do dragão azul; PROMPT-164: a capivara (4 B)
export const NOME_PET = {
  elefante: 'Elefante', gato: 'Gato', gaviao: 'Gavião',
  axolote: 'Axolote', capivara: 'Capivara', tigre: 'Tigre', morcego: 'Morcego', unicornio: 'Unicórnio', dragao_vermelho: 'Dragão',
};

const BASE = '/img/jogo/';
let SPR = null;

export async function carregarSprites() {
  if (!SPR) {
    const [j, cores] = await Promise.all([
      fetch(BASE + 'pets/sprites.json?v=228').then(r => { if (!r.ok) throw new Error('sprites.json'); return r.json(); }),   // ?v=: trocar ao mudar os quadros (PROMPT-227, 228)
      fetch(BASE + 'pets/sprites-pets-cores.json').then(r => (r.ok ? r.json() : null)).catch(() => null),   // 🎨 sem ele: os pets sem cores
    ]);
    for (const [f, a] of Object.entries(cores?.pets || {})) if ((petDaCor(f) || adultoDaCor(f)) && !j.pets[f]) j.pets[f] = a;
    // a forma colorida usa as sequências do pet (o sprites-pets-cores.json só tem as animações); o adulto colorido, também o quadro do adulto
    for (const f of Object.keys(j.pets)) {
      const p = petDaCor(f) || adultoDaCor(f);
      if (p && j.sequencias?.[p] && !j.sequencias[f]) j.sequencias[f] = j.sequencias[p];
      if (adultoDaCor(f) && j.quadro_por_pet?.[p] && !j.quadro_por_pet[f]) j.quadro_por_pet[f] = j.quadro_por_pet[p];
    }
    // 🐱 PROMPT-209: o adulto do gato e do axolote é o próprio filhote, 50% maior: as mesmas imagens (e as das cores),
    // com o nome {pet}_adulto[_{cor}] só para o jogo saber que evoluiu. O tamanho maior fica em jogo-revisao.js (ALT_PET/DIST_PET).
    for (const p of ADULTO_E_FILHOTE) {
      if (!j.pets[p]) continue;
      const a = `${p}_adulto`;
      j.evolucao = { ...(j.evolucao || {}), [p]: a };
      j.pets[a] = j.pets[p];
      if (j.sequencias?.[p]) j.sequencias[a] = j.sequencias[p];
      for (const c of CORES_PET[p] || []) if (j.pets[`${p}_${c}`]) {
        j.pets[`${a}_${c}`] = j.pets[`${p}_${c}`];
        if (j.sequencias?.[`${p}_${c}`] || j.sequencias?.[p]) j.sequencias[`${a}_${c}`] = j.sequencias[`${p}_${c}`] || j.sequencias[p];
      }
    }
    SPR = j;
  }
  return SPR;
}

// 🎨 Cores dos pets (PROMPT-170, sprites-pets-cores.json): a forma {pet}_{cor} é só visual (mesmos nomes de arquivo, já
// pintados); o pet continua o mesmo (falas, comidas, truques, lealdade) e o tamanho, a distância, as sequências e as ações
// são os do pet de base. Uma cor só vale se a forma existir no JSON. O morcego (PROMPT-163) tem cores próprias; o original dele é o preto.
const CORES_TODAS = ['marrom', 'cinza', 'branco', 'roxo', 'azul', 'rosa', 'verde', 'dourado', 'preto'];
export const CORES_PET = {
  elefante: CORES_TODAS, tigre: CORES_TODAS, capivara: CORES_TODAS,
  gato: ['preto'],   // 🐱 PROMPT-194: só o preto (desenho novo); as outras cores compradas voltaram em moedas
  unicornio: [],   // 🦄 PROMPT-212: sem cores (PROMPT-194 tinha tirado marrom, dourado e preto; as compradas voltaram em moedas)
  gaviao: [],   // 🦅 PROMPT-190: o gavião só no desenho original (as cores compradas voltaram em moedas)
  axolote: CORES_TODAS.filter(c => c !== 'rosa'),
  morcego: ['marrom', 'cinza', 'branco', 'roxo', 'azul', 'vermelho', 'dourado'],
};
export const NOME_COR_PET = { marrom: 'Marrom', cinza: 'Cinza', branco: 'Branco', roxo: 'Roxo', azul: 'Azul', rosa: 'Rosa', verde: 'Verde', dourado: 'Dourado', preto: 'Preto', vermelho: 'Vermelho' };
export const NOME_ORIGINAL_PET = { morcego: 'Preto' };   // o chip sem cor (o resto: Original)
// 🖼️ fundos do cartão do pet no Meu Pet (PROMPT-179): img/jogo/pets/fundos/{id}.webp (768 × 1152). Um só por aluno (pets/fundo);
// os especiais custam `preco` moedas e ficam em pets/fundos_comprados/{id}. Ordem: grátis escuros, grátis claros, especiais.
export const FUNDOS_PET = [
  ['noite', 'Noite'], ['roxo', 'Roxo'], ['mata', 'Mata'], ['grafite', 'Grafite'], ['oceano', 'Oceano'], ['aurora', 'Aurora'],
  ['dourado', 'Dourado'], ['vinho', 'Vinho'], ['palco', 'Palco'], ['chocolate', 'Chocolate'],
  ['azul_claro', 'Azul-claro'], ['lavanda', 'Lavanda'], ['menta', 'Menta'], ['pessego', 'Pêssego'], ['creme', 'Creme'], ['rosa', 'Rosa'],
  ['nuvem', 'Nuvem'], ['amanhecer', 'Amanhecer'],
  ['espaco', 'Espaço', 50], ['doces', 'Terra dos doces', 50], ['lua', 'Lua cheia', 50], ['neve', 'Neve', 50], ['floresta', 'Floresta', 50],
  ['praia', 'Praia', 50], ['jardim', 'Jardim', 50], ['quarto', 'Quarto', 50], ['ceu', 'Céu', 50], ['lilas', 'Lilás', 50],
].map(([id, nome, preco = 0]) => ({ id, nome, preco }));
// gato_azul → 'gato'; o resto (gato, dragao_azul, dragao_vermelho_sombra…) → null
export const petDaCor = (forma) => { const m = /^([a-z]+)_([a-z]+)$/.exec(forma || ''); return m && CORES_PET[m[1]]?.includes(m[2]) ? m[1] : null; };
// 🐯 adulto com cor (PROMPT-181): tigre_adulto_azul → 'tigre_adulto'; o resto → null
// 🐱 PROMPT-209: pets cujo adulto é o filhote 50% maior (sem desenho próprio de adulto)
export const ADULTO_E_FILHOTE = ['gato', 'axolote'];
export const CRESCE_ADULTO_FILHOTE = 1.5;
// gato_adulto, gato_adulto_preto, axolote_adulto_azul → o filhote com a cor (gato, gato_preto, axolote_azul); o resto → null
export const filhoteDoAdulto = (forma) => {
  const m = /^([a-z]+)_adulto(?:_([a-z]+))?$/.exec(forma || '');
  return m && ADULTO_E_FILHOTE.includes(m[1]) && (!m[2] || CORES_PET[m[1]]?.includes(m[2])) ? (m[2] ? `${m[1]}_${m[2]}` : m[1]) : null;
};
export const adultoDaCor = (forma) => { const m = /^(([a-z]+)_adulto)_([a-z]+)$/.exec(forma || ''); return m && CORES_PET[m[2]]?.includes(m[3]) ? m[1] : null; };
export const coresDoPet = (pet) => (CORES_PET[pet] || []).filter(c => SPR?.pets?.[`${pet}_${c}`]);

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
// dragao_sombra_adulto, tigre_adulto_azul. O gato e o axolote adultos (o filhote maior, PROMPT-209) contam como filhote para o
// desenho (animações, palco, sono): só o tamanho muda.
export const ehFormaAdulta = (forma) => !filhoteDoAdulto(forma) && (/_adulto$/.test(forma || '') || !!adultoDaCor(forma));
export function formaComCor(forma, cor) {
  if (cor && CORES_PET[forma]?.includes(cor) && SPR?.pets?.[`${forma}_${cor}`]) return `${forma}_${cor}`;   // 🎨 PROMPT-170
  if (cor && adultoDaCor(`${forma}_${cor}`) === forma && SPR?.pets?.[`${forma}_${cor}`]) return `${forma}_${cor}`;   // 🐯 a cor do filhote vale no adulto (PROMPT-181)
  if (!cor || !coresDragao()[cor] || !/^dragao_(azul|vermelho)(_adulto)?$/.test(forma || '')) return forma;
  const adulto = ehFormaAdulta(forma) ? '_adulto' : '';
  const f = /^dragao_vermelho/.test(forma) ? `dragao_vermelho_${cor}${adulto}` : `dragao_${cor}${adulto}`;
  if (SPR?.pets?.[f]) return f;
  const antiga = `dragao_${cor}${adulto}`;   // sprites.json sem as formas do vermelho colorido: o nome antigo
  return SPR?.pets?.[antiga] ? antiga : forma;
}
// forma recebida de fora (colegas online): só vale o próprio pet, a forma adulta dele ou uma das cores (dragão e pets)
export function formaValida(pet, forma) {
  if (!forma || forma === pet) return pet;
  if (petDaCor(forma) === pet && SPR?.pets?.[forma]) return forma;
  if (forma === formaAdulta(pet)) return forma;
  if (adultoDaCor(forma) && adultoDaCor(forma) === formaAdulta(pet) && SPR?.pets?.[forma]) return forma;
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
  SEQ.delete(img); delete img.dataset.seq; clearTimeout(s.t); img.classList.remove('quadro-alto'); s.ok(false);
}
// 🐘 PROMPT-228: animações com quadro mais alto que o do pet (sprites.json → quadro_por_pet[forma].anims_altas: { anim: altura }),
// como o ataque do elefante adulto (700 em vez de 566). Na sequência a imagem ganha .quadro-alto (o CSS de cada tela mantém a escala
// e alinha pela base); a forma com cor usa a do pet de base.
const animAlta = (forma, anim) => !!(SPR?.quadro_por_pet?.[forma]?.anims_altas || SPR?.quadro_por_pet?.[adultoDaCor(forma)]?.anims_altas)?.[anim];
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
      if (i >= passos.length) { SEQ.delete(img); delete img.dataset.seq; img.classList.remove('quadro-alto'); ok(true); return; }
      const [anim, q, ms] = passos[i++], fs = quadrosDe(forma, anim);
      const src = fs[Math.min(Math.max(1, q), fs.length) - 1];
      if (src && img.getAttribute('src') !== src) img.src = src;   // (a batalha troca o src sem dataset)
      img.classList.toggle('quadro-alto', animAlta(forma, anim));   // 🐘 PROMPT-228
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
// Ações do pet parado (Meu Pet e mapas), sorteadas sem repetir a anterior. A lista vem do sprites.json → acoes_parado
// (uma lista para todos, ou { forma: lista, _padrao: lista }), para religar/desligar ações sem mexer no código (PROMPT-67).
// Por pet (PROMPT-165): a forma com cor (pet_{cor}) usa a lista do pet; sem lista, a _padrao.
// Nunca sozinho: o fogo, o voo (fica para o combate e o Meu Pet), o ataque e o 🙃 pendurado da capivara.
const ACOES_PARADO = ['cheirar', 'lamber_pata', 'lamber_rabo', 'banho'];
// 🦄 PROMPT-212: pet que, com o personagem parado, pasta (só na grama) e depois deita e fica deitado até o personagem se mexer.
// ms = tempo com o personagem parado. Por enquanto só o unicórnio adulto.
const DEITA = { pastar: 20000, deitar: 45000 };
export const deitaParado = (forma) => /^unicornio_adulto/.test(forma || '') && temSequencia(forma, 'deitar');
// 🦄 PROMPT-213: pet que não anda atrás do personagem: espera parado e, quando fica longe (DISPARA × distPet), corre a
// CORRE_DISPARO × a velocidade do personagem até a distância normal. Por enquanto só o unicórnio adulto.
const DISPARA = 2.5, CORRE_DISPARO = 2 * 0.7;   // 🦄 PROMPT-224: 30% mais devagar (era 2 × a velocidade do personagem)
const correParaAlcancar = (forma) => /^unicornio_adulto/.test(forma || '');
// 🐘 PROMPT-224: andar de frente/de costas com uma imagem só (o sprites.json repete o quadro): os quadros ímpares saem espelhados
const ALTERNA_ESPELHO = { elefante_adulto: new Set(['andar_frente', 'andar_costas']) };
const alternaEspelho = (forma, anim) => !!ALTERNA_ESPELHO[forma]?.has(anim);
// 🐘 PROMPT-224: parou depois de andar para cima: fica parado de costas (costas_parado) até a próxima ação ou andar de novo
const paraDeCostas = (forma) => forma === 'elefante_adulto' && temAnim(forma, 'costas_parado');
const NUNCA_SOZINHO = new Set(['cuspir_fogo', 'voar', 'voo_campeao', 'ataque_batalha', 'pendurada', 'comer', 'comendo']);
function acoesParado(forma) {
  const j = SPR?.acoes_parado;
  const l = Array.isArray(j) ? j : j?.[forma] ?? j?.[String(forma || '').replace(/_[a-z]+$/, '')] ?? j?._padrao;
  return (Array.isArray(l) ? l : ACOES_PARADO).filter(a => !NUNCA_SOZINHO.has(a));
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
  // 🦄 unicórnio adulto (PROMPT-211): o triste vai deitando (4 quadros) e fica deitado; dormindo = deita e se enrola, fica enrolado
  if (/^unicornio_adulto/.test(forma) && anim === 'triste_fome') return { ms: 450, loop: true, ultimo: 6000 };
  if (/^unicornio_adulto/.test(forma) && anim === 'dormindo') return { ms: 1200, loop: true, ultimo: 8000 };
  if (/^unicornio_adulto/.test(forma) && anim.startsWith('andar_')) return { ms: 170, loop: true };   // 🦄 PROMPT-213: corre de frente/de costas; PROMPT-224: 120 → 170 ms
  // 🐘 elefante adulto (PROMPT-213): a tromba balança devagar parado; dorme alternando 1↔2; sentado triste fica 2 s
  if (/^elefante_adulto/.test(forma) && anim === 'sentado_girando') return { ms: 350, loop: true };
  if (/^elefante_adulto/.test(forma) && anim === 'dormindo') return { ms: 1200, loop: true };
  if (/^elefante_adulto/.test(forma) && anim === 'triste_fome') return { ms: 2000, loop: true };
  if (/^elefante_adulto/.test(forma) && anim === 'feliz') return { ms: 300, loop: false, vezes: 2 };   // 🐘 PROMPT-224: o feliz completo duas vezes (tocar no Meu Pet)
  switch (anim) {
    case 'correndo': return { ms: /^morcego/.test(forma) ? 120 : 90, loop: true };   // 🦇 o morcego corre voando (8 quadros, PROMPT-176)
    case 'voando': return { ms: 120, loop: true };   // 🦇 o morcego batendo as asas, de lado (8 quadros em loop)
    case 'voando_frente': return { ms: 150, loop: true };   // 🦇 voando de frente, vindo na direção da tela
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
const MAX_RASTRO = 240;   // pontos guardados do caminho do personagem (o unicórnio adulto espera até ~2,5 × a distância: PROMPT-213)

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
    this.evitar = null;             // (x, y) => [x, y] | null: parou em cima de uma porta/saída → para ao lado (PROMPT-155)
    this.desvio = null;             // indo para esse ponto ao lado
    this.desviado = false;          // já foi para o lado: fica lá até o personagem andar de novo
    this.podePastar = null;         // 🦄 (x, y) => true se o chão embaixo dos pés é grama (quem chamou olha a imagem do mapa)
    this.deitado = null;            // 🦄 'deitando' | 'deitado' | 'levantando': nada mexe nele até o personagem andar (PROMPT-212)
    this.pastou = false;            // 🦄 já pastou nesta parada (aos ~20 s)
    this.disparou = false;          // 🦄 correndo para alcançar o personagem (PROMPT-213): só para ao chegar na distância
    this.deCostas = false;          // 🐘 o último passo foi para cima: parado, fica de costas (PROMPT-224)
    SEGUIDORES.add(this);
  }

  // Interrompe a sequência (personagem andou, reação, balão, janela, aba escondida) e recomeça os 4 s
  pararAcao() {
    this.esperaAcao = MS_ANTES_ACAO;
    this.fixa = false;
    if (this.deitado) return;   // 🦄 deitado: só levanta quando o personagem se mexe (ou ao trocar de cena / de pet)
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
    if (this.deitado) return true;   // 🦄 deitado não comemora (nem fica triste): continua deitado
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
    if (this.deitado) return;
    if (!nome) {
      const l = comPesoNoturno(acoesParado(this.forma).filter(a => a !== this.ultimaAcao && temSequencia(this.forma, a)
        && (a !== 'pastar' || this.pastaAqui())));   // 🦄 pastar só em cima da grama
      if (!l.length) return;
      nome = this.ultimaAcao = l[Math.floor(Math.random() * l.length)];
      if (this.antesDaAcao?.(nome)) { this.esperaAcao = MS_ANTES_ACAO; return; }
    }
    this.acao = nome; this.deCostas = false;   // 🐘 a ação começa de frente
    tocarSequencia(this.img, this.forma, nome).then(fim => {
      if (!fim || this.acao !== nome) return;
      this.acao = null; this.esperaAcao = this.fome ? MS_FOME : MS_ANTES_ACAO;
      this.trocar('sentado_girando', true); this.desenhar();
    });
  }

  pastaAqui() { return !!this.podePastar?.(this.x, this.y); }
  // 🦄 deita devagar (triste_fome 1→4) e fica `deitado` (olho fechado), parado, sem ações
  deitar() {
    this.pararAcao();
    this.reacao = null; this.ocioso = false;
    this.deitado = 'deitando';
    this.espelhar = this.esquerda;   // as sequências olham para a direita
    tocarSequencia(this.img, this.forma, 'deitar').then(() => {
      if (this.deitado !== 'deitando') return;
      this.deitado = 'deitado';
      this.trocar('deitado', true); this.desenhar();
    });
  }
  // 🦄 o personagem se mexeu: levanta rápido (triste_fome 4→1) e volta a seguir
  levantar() {
    this.deitado = 'levantando';
    tocarSequencia(this.img, this.forma, 'levantar').then((fim) => {
      if (this.deitado !== 'levantando') return;
      this.deitado = null; this.pastou = false; this.esperaAcao = MS_ANTES_ACAO;
      this.trocar('sentado_girando', true); this.desenhar();
    });
  }
  sairDoChao() { if (!this.deitado) return; this.deitado = null; this.pastou = false; pararSequencia(this.img); }   // troca de cena / de pet

  // pet = quem é (cuidados, nome, falas); forma = qual desenho usar (o filhote ou o adulto)
  definir(pet, forma = pet) {
    this.sairDoChao();
    this.pararAcao();
    this.pet = pet; this.forma = pet ? forma : null;
    this.img.hidden = this.sombra.hidden = !pet;
    if (pet) { this.reacao = null; this.trocar('sentado_girando', true); this.desenhar(); }
  }

  // Ao entrar numa cena: o pet aparece junto do personagem
  colocar(x, y) {
    this.x = x; this.y = y;
    this.rastro = [[x, y]];
    this.paradoMs = 0; this.andandoMs = 0; this.ultJog = null; this.esperar = false; this.alcancando = false; this.disparou = false;
    this.desvio = null; this.desviado = false;
    this.sairDoChao();
    this.pararAcao();
    if (this.pet) { this.reacao = null; this.trocar('sentado_girando', true); this.desenhar(); }
  }

  // Animação especial (feliz, pulo, triste…). Sem loop: volta ao ocioso no fim; com loop: dura `ms`.
  reagir(anim, ms = 0) {
    if (!this.pet || this.deitado) return;   // 🦄 deitado: clique e reações não tiram ele do chão
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
    if (mexeu) { this.andandoMs += ms; this.paradoMs = 0; this.desvio = null; this.desviado = false; }
    else { this.paradoMs += ms; this.andandoMs = 0; }
    const jogParado = this.paradoMs > 250;
    if (jogParado) this.esperar = true;                                  // ao voltar a andar, espera 0,5 s
    if (this.esperar && this.andandoMs >= 500) this.esperar = false;
    const esperando = this.esperar && mexeu;
    if (mexeu) this.pastou = false;

    // 🦄 deitado (PROMPT-212): não anda nem faz nada; o personagem se mexeu → levanta (e só depois segue)
    if (this.deitado) {
      if (mexeu && this.deitado !== 'levantando') this.levantar();
      this.desenhar();
      return;
    }

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
    // 🦄 PROMPT-213: o unicórnio adulto espera parado; longe (2,5 × distPet), dispara a 2× até a distância normal
    // (personagem parado: até os 55%, como os outros). Não para no meio da corrida.
    const dispara = correParaAlcancar(this.forma);
    if (dispara) {
      if (falta <= atras + 0.5) this.disparou = false;
      else if (jogParado || falta > distPet * DISPARA) this.disparou = true;
    } else this.disparou = false;
    const longe = dispara ? this.disparou : !jogParado && falta > distPet + 62 * esc;
    const mult = dispara ? CORRE_DISPARO : jogParado ? 1 : longe ? 1.6 : this.alcancando ? 1.3 : 1;
    const x0 = this.x, y0 = this.y;
    let anda = (dispara ? !this.disparou : esperando) || this.desviado ? 0 : Math.min(falta - atras, vel * mult * dt);
    if (dispara && this.disparou && falta - atras <= vel * mult * dt) this.disparou = false;   // 🦄 chega neste quadro: para e volta a esperar
    while (anda > 0.01 && this.rastro.length) {
      const [qx, qy] = this.rastro[0];
      const d = dist(this.x, this.y, qx, qy);
      if (d <= anda) { this.x = qx; this.y = qy; anda -= d; this.rastro.shift(); }
      else { this.x += (qx - this.x) / d * anda; this.y += (qy - this.y) / d * anda; anda = 0; }
    }
    // parou em cima de uma porta, saída ou zona de entrada: anda até o ponto ao lado (e fica lá enquanto o personagem não andar)
    if (this.desvio) {
      const [qx, qy] = this.desvio, d = dist(this.x, this.y, qx, qy), passo = vel * 0.7 * dt;
      if (d <= passo) { this.x = qx; this.y = qy; this.desvio = null; }
      else { this.x += (qx - this.x) / d * passo; this.y += (qy - this.y) / d * passo; }
    } else if (jogParado && this.evitar && !this.desviado && dist(this.x, this.y, x0, y0) < 0.05) {
      const p = this.evitar(this.x, this.y);
      if (p) { this.desvio = p; this.desviado = true; }
    }
    const dx = this.x - x0, dy = this.y - y0;
    const andando = Math.hypot(dx, dy) > 0.05;
    if (Math.abs(dx) > 0.05) this.esquerda = dx < 0;
    else if (dispara && mexeu && Math.abs(jx - this.x) > largura * 0.3) this.esquerda = jx < this.x;   // 🦄 esperando: olha para o personagem
    // 🦄 PROMPT-212: personagem parado e o pet já no lugar: ~20 s → pasta (só na grama, uma vez por parada); ~45 s → deita
    if (deitaParado(this.forma) && !this.pausado && !this.fixa && !mexeu && !andando) {
      if (this.paradoMs >= DEITA.deitar) { this.deitar(); this.desenhar(); return; }
      if (this.paradoMs >= DEITA.pastar && !this.pastou && !this.acao && !this.reacao && this.pastaAqui()) {
        this.pastou = true; this.comecarAcao('pastar');
        if (this.acao) { this.espelhar = this.esquerda; this.desenhar(); return; }
      }
    }

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
      this.espelhar = dispara && !andando && this.esquerda;   // 🦄 parado de lado (parado_lado é virado para a direita)
      if (andando) {
        // 🦇 vindo para baixo (na direção da tela): o morcego voa de frente no lugar de andar_frente (PROMPT-176)
        const deFrente = dy > 0 && Math.abs(dy) > Math.abs(dx) && temAnim(this.forma, 'voando_frente');
        if (deFrente) this.trocar('voando_frente');
        else if (dispara && Math.abs(dy) > Math.abs(dx)) this.trocar(dy > 0 ? 'andar_frente' : 'andar_costas');   // 🦄 corre de frente / de costas
        else if (longe || dispara) { this.trocar(temAnim(this.forma, 'voando') ? 'voando' : 'correndo'); this.espelhar = dx < 0; }   // correndo (e o voando do morcego) é virado para a direita
        else if (Math.abs(dx) >= Math.abs(dy)) this.trocar(dx > 0 ? 'andar_direita' : 'andar_esquerda');
        else this.trocar(this.andarVertical(dy > 0 ? 'andar_frente' : 'andar_costas'));
        this.deCostas = this.anim === 'andar_costas';   // 🐘 PROMPT-224: qualquer outra direção tira o de costas
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
        this.trocar(this.deCostas && paraDeCostas(this.forma) ? 'costas_parado' : 'sentado_girando');
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
    this.img.classList.toggle('espelhado', this.espelhar !== (!this.acao && alternaEspelho(this.forma, this.anim) && this.q % 2 === 1));   // 🐘 PROMPT-224
    const s = this.sombra.style;
    s.left = this.x + 'px'; s.top = this.y + 'px';
    s.width = this.altura * 0.8 + 'px'; s.height = this.altura * 0.16 + 'px';
    s.zIndex = this.zCasa != null ? this.zCasa - 1 : this.zFixo != null ? this.zFixo - 1 : Math.round(this.y) - 2;
  }
}

// Pet parado num lugar (o que espera ao lado do líder): só anima, não segue ninguém
export class PetParado {
  constructor(img) { this.img = img; this.pet = null; this.anim = ''; this.q = 0; this.t = 0; this.lista = []; this.aoAcabar = null; this.ciclos = 0; this.vez = 1; this.emSeq = false; this.repouso = null; }

  // repouso: pose de espera no lugar do sentado_girando, em loop, { anim, ms } (o morcego no duelo voa parado: PROMPT-162)
  get parado() { return this.repouso?.anim || 'sentado_girando'; }

  definir(pet) { this.pet = pet; this.tocar(this.parado); }

  // Animação sem loop volta para sentado_girando no fim (e chama aoAcabar)
  tocar(anim, aoAcabar = null) {
    pararSequencia(this.img); this.emSeq = false;   // interrompe a sequência que estiver tocando
    this.anim = anim; this.q = 0; this.t = 0; this.aoAcabar = aoAcabar; this.ciclos = 0; this.vez = 1;
    this.lista = quadrosDe(this.pet, anim);
    this.voo(anim);
    this.desenhar();
  }
  // voando (a espera e o ataque): um pouco acima do chão, flutuando (CSS .pet-voando)
  voo(anim) { this.img.classList.toggle('pet-voando', !!this.repouso && (anim === this.repouso.anim || anim === 'seq:ataque_batalha')); }

  // Sequência com tempo (sprites.json → sequencias). false = o pet não tem (quem chamou usa tocar()).
  // No fim volta para sentado_girando e chama aoAcabar; interrompida (tocar/outra sequência), não chama.
  // ciclo: recomeça no fim até ser interrompida (dormir).
  sequencia(nome, aoAcabar = null, { ciclo = false } = {}) {
    if (!temSequencia(this.pet, nome)) return false;
    const anim = this.anim = 'seq:' + nome; this.emSeq = true; this.aoAcabar = null;
    this.voo(anim);
    const rodar = () => tocarSequencia(this.img, this.pet, nome).then(fim => {
      if (!fim) return;
      if (ciclo && this.anim === anim) { rodar(); return; }
      this.tocar(this.parado); aoAcabar?.();
    });
    rodar();
    return true;
  }

  atualizar(dt) {
    if (this.emSeq || !this.lista.length) return;
    const r = this.repouso && this.anim === this.repouso.anim ? { ms: this.repouso.ms, loop: true } : ritmo(this.anim, this.lista.length, this.pet);
    const ultimo = this.q === this.lista.length - 1;
    this.t += dt * 1000;
    if (this.t < (ultimo && r.ultimo ? r.ultimo : r.ms)) return;
    this.t = 0;
    if (!ultimo) this.q++;
    else if (r.loop) { this.q = 0; this.ciclos++; }   // ciclos completos da animação em loop
    else if (this.vez < (r.vezes || 1)) { this.vez++; this.q = 0; }
    else { const f = this.aoAcabar; this.tocar(this.parado); f?.(); return; }
    this.desenhar();
  }

  desenhar() {
    if (emSequencia(this.img)) return;   // a sequência é quem troca o quadro
    const src = this.lista[Math.min(this.q, this.lista.length - 1)];
    if (src && this.img.dataset.src !== src) { this.img.src = src; this.img.dataset.src = src; }
  }
}

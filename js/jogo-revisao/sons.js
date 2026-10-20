// Jogo de Revisão — sons sintetizados com Web Audio API e, desde o PROMPT-88, arquivos de /audio/jogo/ (efeitos e música).
//   tocar('acerto' | 'erro' | 'vitoria' | 'insignia' | 'dourada' | 'porta' | 'clique')
//   somLigado() → true/false        alternarSom() → novo estado (lembrado em localStorage 'jr_som')
//   tocarArquivo(nome, { vol, ate_ms }) → controle { parar(fadeMs) }   (efeitos; respeita o 🔊)
//   musicaPara('mapa' | 'ginasio' | 'lab' | null)   musicaLigada() / alternarMusica() ('jr_musica', começa desligada)
//   pausarMusica(motivo, sim)   musicaBloqueada(sim): a professora desligou a música da turma
// O AudioContext só é criado no primeiro toque/clique/tecla (exigência do iPhone e do Chrome).

const VOL = 0.15;   // ganho máximo de qualquer som
const INTERVALO_MIN = 60;   // ms: ignora o mesmo som repetido em menos tempo que isso

// notas (Hz)
const N = {
  F3: 174.61, A3: 220.0,
  C5: 523.25, E5: 659.25, G5: 783.99,
  C6: 1046.5, E6: 1318.51, G6: 1567.98,
  C7: 2093.0, E7: 2637.02, G7: 3135.96, C8: 4186.01,
};

let ctx = null;
let saida = null;   // todos os sons passam por aqui: teto suave que segura a soma em 0,15
let ligado = true;
try { ligado = localStorage.getItem('jr_som') !== '0'; } catch (_) { /* aba anônima: fica ligado */ }
const ultimoToque = {};

function desbloquear() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      // teto suave: até 0,10 passa igual; acima disso é comprimido e nunca passa de 0,15
      // (quando dois sons tocam juntos, ex.: clique + erro). Sem ganho extra, ao contrário do compressor.
      const teto = ctx.createWaveShaper();
      const curva = new Float32Array(4096);
      for (let i = 0; i < curva.length; i++) {
        const x = (i / (curva.length - 1)) * 2 - 1, ax = Math.abs(x);
        const y = ax <= 0.1 ? ax : 0.1 + (VOL - 0.1) * Math.tanh((ax - 0.1) / (VOL - 0.1));
        curva[i] = Math.sign(x) * y;
      }
      teto.curve = curva;
      teto.connect(ctx.destination);
      saida = teto;
      // arquivos: ganho próprio (não passam pelo teto de 0,15 dos bipes, senão o rugido fica baixo)
      ganhoEfeitos = ctx.createGain(); ganhoEfeitos.gain.value = VOL_EFEITOS; ganhoEfeitos.connect(ctx.destination);
      ganhoMusica = ctx.createGain(); ganhoMusica.gain.value = VOL_MUSICA; ganhoMusica.connect(ctx.destination);
    } catch (_) { ctx = null; saida = null; return; }
  }
  if (ctx.state === 'suspended' && !document.hidden) ctx.resume().then(atualizarMusica).catch(() => {});
  else atualizarMusica();
}
for (const ev of ['pointerdown', 'touchstart', 'keydown']) {
  addEventListener(ev, desbloquear, { capture: true, passive: true });
}

export function somLigado() { return ligado; }

export function alternarSom() {
  ligado = !ligado;
  try { localStorage.setItem('jr_som', ligado ? '1' : '0'); } catch (_) {}
  if (!ligado) pararEfeitos(150);
  atualizarMusica();   // a música da sala da Exposição segue o 🔊
  return ligado;
}

// uma nota com envelope (ataque curto e queda exponencial)
function nota(freq, inicio, dur, tipo = 'square', vol = VOL, freqFim = null) {
  const t0 = ctx.currentTime + inicio;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqFim) osc.frequency.exponentialRampToValueAtTime(freqFim, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.min(vol, VOL), t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(saida);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// "whoosh": ruído branco num passa-banda que desce de 1200 para 300 Hz
function whoosh(dur = 0.25) {
  const t0 = ctx.currentTime;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.Q.value = 1.2;
  filtro.frequency.setValueAtTime(1200, t0);
  filtro.frequency.exponentialRampToValueAtTime(300, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(VOL, t0 + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filtro).connect(g).connect(saida);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// fanfarra: três notas subindo e um acorde final de 400 ms (o acorde divide o volume)
function fanfarra(notas, acorde, brilho) {
  notas.forEach((f, i) => nota(f, i * 0.11, 0.12, 'square', VOL * 0.8));
  const ini = notas.length * 0.11;
  acorde.forEach(f => nota(f, ini, 0.4, 'square', VOL / acorde.length));
  if (brilho) nota(brilho, ini, 0.6, 'sine', 0.03);
}

const SONS = {
  acerto:   () => { nota(N.C6, 0, 0.08, 'square', VOL * 0.7); nota(N.E6, 0.08, 0.08, 'square', VOL * 0.7); },
  erro:     () => nota(N.A3, 0, 0.22, 'triangle', VOL, N.F3),
  vitoria:  () => [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => nota(f, i * 0.09, 0.1, 'square', VOL * 0.7)),
  insignia: () => fanfarra([N.G5, N.C6, N.E6], [N.C6, N.E6, N.G6]),
  dourada:  () => fanfarra([N.G6, N.C7, N.E7], [N.C7, N.E7, N.G7], N.C8),
  porta:    () => whoosh(0.25),
  clique:   () => nota(N.C7, 0, 0.03, 'square', VOL * 0.4),
};

export function tocar(nome) {
  if (!ligado || !ctx || ctx.state !== 'running' || !SONS[nome]) return;
  const agora = performance.now();
  if (agora - (ultimoToque[nome] || 0) < INTERVALO_MIN) return;
  ultimoToque[nome] = agora;
  try { SONS[nome](); } catch (_) { /* nunca quebrar o jogo por causa do som */ }
}

// ============================================================
//  Arquivos de áudio (PROMPT-88): /audio/jogo/{nome}.mp3, baixados só quando tocam pela 1ª vez (cache)
// ============================================================
// Os MP3 têm volume igualado (RMS ~0,11–0,28): × 0,6 ficam no nível dos bipes de acerto/erro (RMS ~0,09–0,1).
const VOL_EFEITOS = 0.6;
const VOL_MUSICA = VOL_EFEITOS * 0.25;   // música baixa; efeitos e fala tocam por cima sem abaixar a música
const PASTA_AUDIO = '/audio/jogo/';
let ganhoEfeitos = null, ganhoMusica = null;
const buffers = new Map();   // nome → Promise<AudioBuffer | null>
function carregar(nome) {
  if (!buffers.has(nome)) {
    buffers.set(nome, fetch(nome.startsWith('/') ? nome : PASTA_AUDIO + nome + '.mp3')   // '/…': caminho completo (música da sala da Exposição)
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(nome))))
      .then(b => new Promise((ok, erro) => ctx.decodeAudioData(b, ok, erro)))   // forma com callback: vale no Safari antigo
      .catch(() => null));   // não carregou: falha em silêncio (e não tenta de novo)
  }
  return buffers.get(nome);
}
const tocando = new Map();   // nome → controle (o mesmo som não toca de novo enquanto ainda está tocando)
const NADA = { parar() {}, tocando: false };

// Toca um efeito. vol: 0–1 (sobre o ganho dos efeitos); ate_ms: corta com fade nesse tempo; fade: ms do corte.
export function tocarArquivo(nome, { vol = 1, ate_ms = 0, fade = 150 } = {}) {
  if (!ligado || !ctx || ctx.state !== 'running' || !ganhoEfeitos) return NADA;
  if (tocando.has(nome)) return tocando.get(nome);
  let src = null, g = null, parado = false;
  const controle = {
    tocando: true,
    parar(fadeMs = 150) {
      if (parado) return;
      parado = true; controle.tocando = false;
      if (tocando.get(nome) === controle) tocando.delete(nome);
      if (!src) return;   // ainda carregando: nem começa
      try {
        const t = ctx.currentTime;
        g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(0, t + fadeMs / 1000);
        src.stop(t + fadeMs / 1000 + 0.02);
      } catch (_) {}
    },
  };
  tocando.set(nome, controle);
  carregar(nome).then(buf => {
    if (parado || !buf || !ctx || !ligado) { controle.parar(0); return; }
    try {
      src = ctx.createBufferSource(); src.buffer = buf;
      g = ctx.createGain(); g.gain.value = vol;
      src.connect(g).connect(ganhoEfeitos);
      src.onended = () => { if (tocando.get(nome) === controle) tocando.delete(nome); controle.tocando = false; parado = true; };
      src.start();
      if (ate_ms > 0 && ate_ms < buf.duration * 1000) setTimeout(() => controle.parar(fade), Math.max(0, ate_ms - fade));
    } catch (_) { controle.parar(0); }
  });
  return controle;
}
export function pararEfeitos(fadeMs = 150) { for (const c of [...tocando.values()]) c.parar(fadeMs); }

// ── Música de fundo: um loop por lugar ('mapa' | 'ginasio' | 'lab'), começa DESLIGADA ──
let musicaOn = false;
try { musicaOn = localStorage.getItem('jr_musica') === '1'; } catch (_) {}
let bloqueada = false;          // a professora desligou a música da turma (jogo_revisao_config/global/musica_off)
const pausas = new Set();       // motivos para silenciar por um tempo (ex.: 'embed' = mini-jogo do fliperama aberto)
let lugarPedido = null;         // o lugar onde o aluno está
let faixa = null;               // { lugar, src, g } tocando agora
let geracao = 0;                // descarta carregamentos que chegaram depois de uma troca

export const musicaLigada = () => musicaOn;
export function alternarMusica() {
  musicaOn = !musicaOn;
  try { localStorage.setItem('jr_musica', musicaOn ? '1' : '0'); } catch (_) {}
  atualizarMusica();
  return musicaOn;
}
export function musicaBloqueada(sim) {
  if (sim === undefined) return bloqueada;
  bloqueada = !!sim; atualizarMusica(); return bloqueada;
}
export function musicaPara(lugar) {
  if ((lugar || null) === lugarPedido) return;
  lugarPedido = lugar || null; atualizarMusica();
}
export function pausarMusica(motivo, sim) {
  if (sim === pausas.has(motivo)) return;
  if (sim) pausas.add(motivo); else pausas.delete(motivo);
  atualizarMusica();
}
function soltarFaixa(fadeMs) {
  const f = faixa; faixa = null;
  if (!f) return;
  try {
    const t = ctx.currentTime;
    f.g.gain.cancelScheduledValues(t); f.g.gain.setValueAtTime(f.g.gain.value, t);
    f.g.gain.linearRampToValueAtTime(0, t + fadeMs / 1000);   // fade-out de 400 ms
    f.src.stop(t + fadeMs / 1000 + 0.05);
  } catch (_) {}
}
// lugar '/audio/exposicao/…' (sala da Exposição): toca com o 🔊 ligado (o 🎵 geral começa desligado e calaria a sala)
const podeTocar = (lugar) => (String(lugar || '').startsWith('/') ? ligado : musicaOn) && !bloqueada && !pausas.size;
function atualizarMusica() {
  if (!ctx || !ganhoMusica) return;
  const lugar = podeTocar(lugarPedido) ? lugarPedido : null;
  if ((faixa?.lugar || null) === lugar) return;   // a mesma música continua, sem recomeçar
  soltarFaixa(400);
  if (!lugar || ctx.state !== 'running') return;
  const minha = ++geracao;
  carregar(lugar.startsWith('/') ? lugar : 'musica_' + lugar).then(buf => {
    if (!buf || minha !== geracao || faixa || !ctx || ctx.state !== 'running') return;
    if (!(podeTocar(lugar) && lugarPedido === lugar)) return;
    try {
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;   // loop contínuo, sem buraco
      const g = ctx.createGain(), t = ctx.currentTime;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.6);   // fade-in de 600 ms
      src.connect(g).connect(ganhoMusica);
      src.start();
      faixa = { lugar, src, g };
    } catch (_) {}
  });
}
// aba escondida ou celular bloqueado: tudo pausa (o AudioContext inteiro); ao voltar, continua de onde parou
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) { if (ctx.state === 'running') ctx.suspend().catch(() => {}); }
  else if (ctx.state === 'suspended') ctx.resume().then(atualizarMusica).catch(() => {});
});

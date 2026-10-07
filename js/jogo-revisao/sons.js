// Jogo de Revisão — sons sintetizados com Web Audio API (sem arquivos de áudio).
//   tocar('acerto' | 'erro' | 'vitoria' | 'insignia' | 'dourada' | 'porta' | 'clique')
//   somLigado() → true/false        alternarSom() → novo estado (lembrado em localStorage 'jr_som')
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
    } catch (_) { ctx = null; saida = null; return; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}
for (const ev of ['pointerdown', 'touchstart', 'keydown']) {
  addEventListener(ev, desbloquear, { capture: true, passive: true });
}

export function somLigado() { return ligado; }

export function alternarSom() {
  ligado = !ligado;
  try { localStorage.setItem('jr_som', ligado ? '1' : '0'); } catch (_) {}
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

// Jogo de Revisão — 📜 Quadro de Estudos dos mapas (PROMPT-90). Conteúdo em dados/jogo/estudos.json → mapaN.{A,B}.
//   abrirQuadroEstudos({ dados, nomeMapa, ginasios })   fecharQuadroEstudos()
// Painel deitado: abas dos ginásios, menu à esquerda (⭐ Regra · 🎟️ Pensa assim · ✏️ Exemplos · ⚠️ Armadilha · 🎯 Tente você),
// uma seção por vez. Textos do JSON: **negrito**, [[destaque laranja]], {{verde}} — o resto é escapado.
// Sem prêmio: o "Tente você" é só treino.

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// "2 × 3" e "6 ÷ 2" não quebram no meio
const juntar = (s) => s.replace(/ ([×÷]) /g, ' $1 ');
function marcar(txt) {
  return juntar(esc(txt))
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\[\[(.+?)\]\]/g, '<span class="qe-hl">$1</span>')
    .replace(/\{\{(.+?)\}\}/g, '<span class="qe-ok">$1</span>');
}

const SECOES = [
  ['regra', '⭐', 'Regra', 'ouro'], ['pensa', '🎟️', 'Pensa assim', 'cyan'], ['exemplos', '✏️', 'Exemplos', 'roxo'],
  ['armadilha', '⚠️', 'Armadilha', 'verm'], ['tente', '🎯', 'Tente você', 'verde'],
];
const SELO = { regra: '⭐ Regra de ouro', pensa: '🎟️ Pensa assim', exemplos: '✏️ Resolvendo junto · toque nos passos', armadilha: '⚠️ Armadilha clássica', tente: '🎯 Tente você' };

let qe = null;   // { dados, G, sec, vistas:Set, ex, tente, anim }

export const quadroEstudosAberto = () => !!qe;

export function abrirQuadroEstudos({ dados, nomeMapa, ginasios = ['A', 'B'] }) {
  fecharQuadroEstudos();
  const G = ginasios.find(g => dados[g]) || ginasios[0];
  qe = { dados, ginasios, G, sec: 'regra', vistas: new Set(), ex: 0, tente: null, anim: null };
  $('qe-mapa').textContent = nomeMapa || '';
  $('estudos').hidden = false;
  desenharAbas();
  desenharGinasio();
}

export function fecharQuadroEstudos() {
  pararFila();
  qe = null;
  if ($('estudos')) $('estudos').hidden = true;
}

function desenharAbas() {
  $('qe-abas').innerHTML = qe.ginasios.map(g => {
    const nome = qe.dados[g]?.aba || `🏠 Ginásio ${g}`;
    return `<button class="qe-aba${g === qe.G ? ' on' : ''}" data-qe-g="${g}">${esc(nome)}</button>`;
  }).join('');
}

function desenharGinasio() {
  pararFila();
  const d = qe.dados[qe.G];
  $('qe-corpo').hidden = !d;
  $('qe-embreve').hidden = !!d;
  if (!d) return;
  qe.sec = 'regra'; qe.vistas = new Set(); qe.ex = 0; qe.tente = null;
  $('qe-menu').innerHTML = SECOES.filter(([s]) => d[s]).map(([s, ic, nome, cor]) =>
    `<button class="qe-mi" data-qe-s="${s}" style="--c:var(--jr-${cor})" title="${nome}"><span class="qe-ic">${ic}</span><span class="qe-mn">${nome}</span></button>`).join('');
  irSecao(qe.sec);
}

function irSecao(s) {
  for (const b of $('qe-menu').children) {
    if (b.classList.contains('on') && b.dataset.qeS !== s) { qe.vistas.add(b.dataset.qeS); b.classList.add('feito'); }
    b.classList.toggle('on', b.dataset.qeS === s);
  }
  qe.sec = s;
  pararFila();
  const d = qe.dados[qe.G], tela = $('qe-tela');
  tela.className = `qe-tela qe-s-${s}`;
  const selo = `<span class="qe-selo">${SELO[s]}</span>`;
  if (s === 'regra') {
    const r = d.regra;
    tela.innerHTML = `${selo}<h2>${marcar(r.titulo)}</h2><p>${marcar(r.texto)}</p>
      <div class="qe-degraus">${(r.degraus || []).map((g, i) => `<div class="qe-degrau ${g.cor === 'cyan' ? 'c' : 'l'}"><span class="qe-n">${i + 1}º</span>
        <div>${(g.ops || []).map(o => `<span class="qe-op">${esc(o)}</span>`).join('')}<br>${marcar(g.texto)}${g.obs ? `<div class="qe-obs">${marcar(g.obs)}</div>` : ''}</div></div>`).join('')}</div>`;
  } else if (s === 'pensa') {
    const p = d.pensa, a = p.animacao;
    // duas colunas (PROMPT-99): o palco da fila à esquerda; legenda, controles e o "Por quê?" à direita — sem rolar
    tela.innerHTML = `${selo}<h2>${marcar(p.titulo)}</h2>
      <div class="qe-pensa">
        ${a?.tipo === 'fila' ? `<div class="qe-palco" id="qe-palco"><div class="qe-balcao">🛎️ ATENDIMENTO</div></div>` : ''}
        <div class="qe-pensa-lado">
          ${a?.tipo === 'fila' ? `<div class="qe-leg"><span class="qe-num" id="qe-pnum">1</span><span id="qe-pleg"></span></div>
          <div class="qe-ctrl"><div class="qe-pts" id="qe-pts"></div><button class="qe-mini" data-qe-pausa>⏸ pausar</button><button class="qe-mini" data-qe-inicio>↺ do início</button></div>` : ''}
          ${p.porque ? `<p class="qe-porque">${marcar(p.porque)}</p>` : ''}
        </div>
      </div>`;
    if (a?.tipo === 'fila') iniciarFila(a);
  } else if (s === 'exemplos') {
    tela.innerHTML = `${selo}<div class="qe-chips" id="qe-chips"></div><div class="qe-trilha" id="qe-trilha"></div>`;
    desenharExemplo();
  } else if (s === 'armadilha') {
    const a = d.armadilha;
    tela.innerHTML = `${selo}<div class="qe-grande">${marcar(a.conta)}</div>${a.texto ? `<p class="qe-centro">${marcar(a.texto)}</p>` : ''}
      <div class="qe-caminhos"><div class="qe-cam errado"><span class="qe-t">❌ NA ORDEM DE LEITURA</span><span class="qe-v qe-riscado">${marcar(a.errado)}</span></div>
      <div class="qe-cam certo"><span class="qe-t">✅ COM A PRIORIDADE</span><span class="qe-v">${marcar(a.certo)}</span></div></div>
      ${a.nota ? `<p class="qe-nota">${marcar(a.nota)}</p>` : ''}`;
  } else if (s === 'tente') {
    tela.innerHTML = `${selo}<div class="qe-grande" id="qe-tq"></div><div class="qe-opcoes" id="qe-opcoes"></div><div class="qe-resp" id="qe-resp"></div>`;
    sortearTente();
  }
}

// ── ✏️ Exemplos: CONTA ➜ PASSO 1 ➜ PASSO 2 ➜ RESULTADO, cada caixa abre ao toque, só a próxima ativa ──
function desenharExemplo() {
  const lista = qe.dados[qe.G].exemplos || [], x = lista[qe.ex];
  $('qe-chips').innerHTML = lista.map((e, i) => `<button class="qe-chip${i === qe.ex ? ' on' : ''}" data-qe-ex="${i}">${esc(juntar(e.conta))}</button>`).join('');
  if (!x) { $('qe-trilha').innerHTML = ''; return; }
  const n = x.passos.length;
  $('qe-trilha').innerHTML = `<div class="qe-caixa enun"><span class="qe-r">CONTA</span><span class="qe-cv">${marcar(x.conta)}</span></div>` +
    x.passos.map((p, k) => `<span class="qe-seta">➜</span><div class="qe-caixa fech${k ? ' bloq' : ''}${k === n - 1 ? ' res' : ''}" data-qe-k="${k}">
      <span class="qe-r">${k === n - 1 ? 'RESULTADO' : 'PASSO ' + (k + 1)}</span><span class="qe-cv">${marcar(p.conta)}</span><span class="qe-x">${marcar(p.nota || '')}</span></div>`).join('');
  caberContas();
}
// o texto da conta encolhe até caber na caixa (nunca quebra)
function caberContas() {
  for (const v of $('qe-trilha').querySelectorAll('.qe-cv')) {
    v.style.fontSize = '';
    let f = parseFloat(getComputedStyle(v).fontSize);
    while (f > 11 && v.scrollWidth > v.clientWidth + 1) { f -= 1; v.style.fontSize = f + 'px'; }
  }
}
function abrirCaixa(c) {
  if (!c || !c.classList.contains('fech') || c.classList.contains('bloq')) return;
  c.classList.remove('fech');
  $('qe-trilha').querySelector(`.qe-caixa[data-qe-k="${+c.dataset.qeK + 1}"]`)?.classList.remove('bloq');
}

// ── 🎯 Tente você: sorteia uma questão (sem prêmio) ──
function sortearTente() {
  const lista = qe.dados[qe.G].tente || [];
  if (!lista.length) return;
  let i = Math.floor(Math.random() * lista.length);
  if (lista.length > 1 && i === qe.tente?.i) i = (i + 1 + Math.floor(Math.random() * (lista.length - 1))) % lista.length;
  qe.tente = { i, q: lista[i], certo: false };
  $('qe-tq').innerHTML = marcar(lista[i].conta + ' = ?');
  $('qe-opcoes').innerHTML = lista[i].opcoes.map(v => `<button class="qe-opc" data-qe-v="${esc(v)}">${esc(v)}</button>`).join('');
  $('qe-resp').innerHTML = '';
}
function responderTente(b) {
  const t = qe.tente;
  if (!t || t.certo) return;
  const v = b.dataset.qeV;
  if (v === String(t.q.certa)) {
    t.certo = true;
    b.classList.add('certa');
    $('qe-resp').innerHTML = `<span class="qe-ok">${marcar(t.q.acerto || 'Isso! 🎉')}</span> <button class="qe-outra" data-qe-outra>Outra ▶</button>`;
  } else {
    b.classList.remove('errada'); void b.offsetWidth; b.classList.add('errada');
    $('qe-resp').innerHTML = `<span class="qe-erro">${marcar(t.q.erros?.[v] || t.q.erro_padrao || 'Quase! Tente de novo.')}</span>`;
  }
}

// ── 🎟️ Animação "fila" (genérica): fichas na fila → a VIP acende → vai ao atendimento → vira vip_vira → volta → final ──
const ESPERA = 1900, ESPERA_FIM = 2600, BASE = 26;
function iniciarFila(a) {
  const palco = $('qe-palco');
  const fichas = (a.fichas || []).map((t, i) => {
    const el = document.createElement('div');
    el.className = 'qe-ficha';
    el.innerHTML = i === a.vip ? `<span class="qe-tk">🎟️ VIP</span><span class="qe-ft"></span>` : `<span class="qe-ft"></span>`;
    el.querySelector('.qe-ft').textContent = juntar(String(t));
    palco.appendChild(el);
    return el;
  });
  const fim = document.createElement('div');
  fim.className = 'qe-ficha qe-final';
  fim.textContent = String(a.final ?? '');
  palco.appendChild(fim);
  // posições da fila pela largura real de cada ficha
  const lefts = [];
  let x = 16;
  for (const el of fichas) { lefts.push(x); x += el.offsetWidth + 10; }
  fim.style.left = `calc(50% - ${fim.offsetWidth / 2}px)`;
  const vip = fichas[a.vip], tv = vip?.querySelector('.qe-ft');
  const balcao = palco.querySelector('.qe-balcao');
  const leg = a.legendas || [];
  const passos = [
    () => {
      fichas.forEach((el, i) => { el.style.left = lefts[i] + 'px'; el.classList.remove('some', 'vip'); });
      if (tv) tv.textContent = juntar(String(a.fichas[a.vip]));
      fim.style.transition = 'none'; fim.classList.remove('on'); void fim.offsetWidth; fim.style.transition = '';
    },
    () => vip?.classList.add('vip'),
    () => { if (vip) vip.style.left = (balcao.offsetLeft + balcao.offsetWidth / 2 - vip.offsetWidth / 2) + 'px'; },
    () => { if (tv) tv.textContent = juntar(String(a.vip_vira ?? '')); },
    () => { if (vip) { vip.classList.remove('vip'); vip.style.left = lefts[a.vip] + 'px'; } },
    () => { fichas.forEach(el => el.classList.add('some')); fim.classList.add('on'); },
  ];
  qe.anim = { i: 0, timer: 0, pausado: false, passos, leg };
  rodarFila();
}
function passoFila() {
  const an = qe.anim;
  an.passos[an.i]();
  $('qe-pleg').innerHTML = marcar(an.leg[an.i] || '');
  $('qe-pnum').textContent = an.i + 1;
  $('qe-pts').innerHTML = an.passos.map((_, k) => `<i class="${k <= an.i ? 'on' : ''}"></i>`).join('');
}
function rodarFila() {
  const an = qe?.anim;
  if (!an) return;
  clearTimeout(an.timer);
  passoFila();
  if (an.pausado) return;
  an.timer = setTimeout(() => { an.i = (an.i + 1) % an.passos.length; rodarFila(); }, an.i === an.passos.length - 1 ? ESPERA_FIM : ESPERA);
}
function pararFila() { if (qe?.anim) { clearTimeout(qe.anim.timer); qe.anim = null; } }
function pausarFila(b) {
  const an = qe?.anim;
  if (!an) return;
  an.pausado = !an.pausado;
  b.textContent = an.pausado ? '▶ continuar' : '⏸ pausar';
  if (an.pausado) clearTimeout(an.timer);
  else { an.i = (an.i + 1) % an.passos.length; rodarFila(); }
}

// ── Eventos (uma vez) ──
export function ligarQuadroEstudos(aoFechar) {
  const caixa = $('estudos');
  const fechar = () => { fecharQuadroEstudos(); aoFechar?.(); };
  $('qe-fechar').addEventListener('click', (e) => { e.stopPropagation(); fechar(); });
  caixa.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!qe) return;
    if (e.target === caixa) { fechar(); return; }   // tocar fora
    const t = e.target;
    const aba = t.closest('[data-qe-g]');
    if (aba) { qe.G = aba.dataset.qeG; desenharAbas(); desenharGinasio(); return; }
    const mi = t.closest('[data-qe-s]');
    if (mi) { irSecao(mi.dataset.qeS); return; }
    const chip = t.closest('[data-qe-ex]');
    if (chip) { qe.ex = +chip.dataset.qeEx; desenharExemplo(); return; }
    const cx = t.closest('.qe-caixa');
    if (cx) { abrirCaixa(cx); return; }
    const op = t.closest('[data-qe-v]');
    if (op) { responderTente(op); return; }
    if (t.closest('[data-qe-outra]')) { sortearTente(); return; }
    if (t.closest('[data-qe-pausa]')) { pausarFila(t.closest('[data-qe-pausa]')); return; }
    if (t.closest('[data-qe-inicio]')) {
      const an = qe.anim; if (!an) return;
      an.i = 0; an.pausado = false; caixa.querySelector('[data-qe-pausa]').textContent = '⏸ pausar'; rodarFila();
    }
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && qe) { e.stopPropagation(); fechar(); } });
  window.addEventListener('resize', () => { if (qe?.sec === 'exemplos') caberContas(); });
}

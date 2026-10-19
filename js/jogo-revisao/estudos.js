// Jogo de Revisão — 📜 Quadro de Estudos dos mapas (PROMPT-90). Conteúdo em dados/jogo/estudos.json → mapaN.{A,B}.
//   abrirQuadroEstudos({ dados, nomeMapa, ginasios })   fecharQuadroEstudos()
// Painel deitado: abas dos ginásios, menu à esquerda (⭐ Regra · 🎟️ Pensa assim · ✏️ Exemplos · ⚠️ Armadilha · 🎯 Tente você),
// uma seção por vez. Textos do JSON: **negrito**, [[destaque laranja]], {{verde}} — o resto é escapado.
// Sem prêmio: o "Tente você" é só treino.
// Animações do "Pensa assim": fila (PROMPT-90) · caixas, casas e sapo (PROMPT-113), todas com o mesmo ritmo, legendas
// numeradas e controles; com prefers-reduced-motion, só a etapa final.

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
    const p = d.pensa, a = p.animacao, tem = !!ANIMACOES[a?.tipo];
    // duas colunas (PROMPT-99): o palco da animação à esquerda; legenda, controles e o "Por quê?" à direita — sem rolar
    tela.innerHTML = `${selo}<h2>${marcar(p.titulo)}</h2>
      <div class="qe-pensa">
        ${tem ? `<div class="qe-palco qe-p-${a.tipo}" id="qe-palco">${a.tipo === 'fila' ? '<div class="qe-balcao">🛎️ ATENDIMENTO</div>' : ''}</div>` : ''}
        <div class="qe-pensa-lado">
          ${tem ? `<div class="qe-leg"><span class="qe-num" id="qe-pnum">1</span><span id="qe-pleg"></span></div>
          <div class="qe-ctrl"><div class="qe-pts" id="qe-pts"></div><button class="qe-mini" data-qe-pausa>⏸ pausar</button><button class="qe-mini" data-qe-inicio>↺ do início</button></div>` : ''}
          ${p.porque ? `<p class="qe-porque">${marcar(p.porque)}</p>` : ''}
        </div>
      </div>`;
    if (tem) ANIMACOES[a.tipo](a);
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
  // PROMPT-100: posições em % do palco (o centro de cada ficha; o CSS centraliza com translate). A fila ocupa de 3% a 70%;
  // o balcão "ATENDIMENTO", os ~28% da direita (centro em 85%). Medido de novo a cada volta (e quando o palco ainda não
  // tem tamanho, no quadro seguinte) — antes, em px, as fichas se empilhavam e o 2 × 3 começava dentro do balcão.
  const vip = fichas[a.vip], tv = vip?.querySelector('.qe-ft');
  const leg = a.legendas || [];
  let centros = [];
  const medirFila = () => {
    const W = palco.clientWidth;
    if (!W) return false;
    palco.style.setProperty('--esc', '1');
    const gap = 0.025 * W, ini = 0.03 * W, fimFila = 0.70 * W;
    const ws = fichas.map(el => el.offsetWidth || 0.12 * W);
    const total = ws.reduce((t, w) => t + w, 0) + gap * Math.max(0, ws.length - 1);
    const esc = Math.min(1, (fimFila - ini) / total);   // não cabe: as fichas encolhem
    palco.style.setProperty('--esc', esc.toFixed(3));
    let x = ini;
    centros = ws.map(w => { const c = x + w * esc / 2; x += w * esc + gap * esc; return c / W * 100; });
    return true;
  };
  const colocarNaFila = () => fichas.forEach((el, i) => { el.style.left = (centros[i] ?? 10 + 20 * i).toFixed(2) + '%'; });
  const passos = [
    () => {
      fichas.forEach(el => el.classList.remove('some', 'vip'));
      if (!medirFila()) requestAnimationFrame(() => { medirFila(); colocarNaFila(); });
      colocarNaFila();
      if (tv) tv.textContent = juntar(String(a.fichas[a.vip]));
      fim.style.transition = 'none'; fim.classList.remove('on'); void fim.offsetWidth; fim.style.transition = '';
    },
    () => vip?.classList.add('vip'),
    () => { if (vip) vip.style.left = '85%'; },   // só agora vai ao atendimento (centro do balcão)
    () => { if (tv) tv.textContent = juntar(String(a.vip_vira ?? '')); },
    () => { if (vip) { vip.classList.remove('vip'); vip.style.left = (centros[a.vip] ?? 40).toFixed(2) + '%'; } },
    () => { fichas.forEach(el => el.classList.add('some')); fim.classList.add('on'); },
  ];
  qe.anim = { i: 0, timer: 0, pausado: false, passos, leg };
  rodarFila();
}
// ── PROMPT-113: caixas, casas e sapo (mesmo motor da fila: passos + legendas, ESPERA entre eles) ──
const calmo = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// começa a animação; sem movimento: roda todos os passos de uma vez e para na etapa final
function comecarAnim(passos, leg) {
  qe.anim = { i: 0, timer: 0, pausado: false, passos, leg, sub: [] };
  if (calmo()) {
    $('qe-palco').classList.add('qe-calmo');
    for (let k = 0; k < passos.length - 1; k++) passos[k]();
    qe.anim.i = passos.length - 1; qe.anim.pausado = true;
  }
  rodarFila();
}
// um pedaço de um passo, um pouco depois (sem movimento: na hora)
function depois(ms, fn) {
  const an = qe?.anim;
  if (!an || calmo()) { fn(); return; }
  an.sub.push(setTimeout(fn, ms));
}
const contaTxt = (s) => juntar(String(s ?? ''));
// o pedaço que mudou de uma conta para a outra (o resultado que entrou no lugar da caixa)
function diferenca(a, b) {
  let i = 0, j = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
  return b.slice(i, b.length - j).trim() || b;
}
// 📦 caixas: a conta grande; a cada etapa o trecho `acende` ganha uma caixa (laranja → ciano → verde), "abre" com um
// pulinho e, na etapa seguinte, dá lugar ao resultado; a última etapa fica verde
const CORES_CAIXA = ['laranja', 'cyan', 'verde'];
function iniciarCaixas(a) {
  const palco = $('qe-palco'), el = document.createElement('div');
  el.className = 'qe-cx-conta';
  palco.appendChild(el);
  const mostrar = (conta, trecho = null, cls = '') => {
    const C = contaTxt(conta), T = trecho ? contaTxt(trecho) : '', i = T ? C.indexOf(T) : -1;
    el.innerHTML = i < 0 ? `<span class="${cls ? 'qe-cx-' + cls : ''}">${esc(C)}</span>`
      : `${esc(C.slice(0, i))}<span class="qe-cx-${cls}">${esc(T)}</span>${esc(C.slice(i + T.length))}`;
    el.style.fontSize = '';   // não cabe: encolhe
    let f = parseFloat(getComputedStyle(el).fontSize);
    while (f > 14 && el.scrollWidth > el.clientWidth + 1) { f -= 2; el.style.fontSize = f + 'px'; }
  };
  const et = a.etapas || [], fim = et[et.length - 1];
  const passos = [() => mostrar(et[0]?.conta)];
  let cor = 0, corAntes = null;
  et.forEach((e, k) => {
    if (!e.acende || e === fim) return;
    const c = CORES_CAIXA[cor++ % CORES_CAIXA.length], antes = corAntes, ant = et[k - 1];
    corAntes = c;
    passos.push(k === 0 ? () => mostrar(e.conta, e.acende, 'caixa ' + c)
      : () => { mostrar(e.conta, diferenca(ant.conta, e.conta), 'res ' + antes); depois(900, () => mostrar(e.conta, e.acende, 'caixa ' + c)); });
  });
  if (fim) passos.push(() => mostrar(fim.conta, null, 'fim'));
  comecarAnim(passos, a.legendas || []);
}
// 🧮 casas: o quadro de valor posicional (colunas M C D U) com os algarismos em fichas, alinhados à direita; × 10 desliza
// as fichas uma casa para a esquerda e o 0 novo entra nas unidades (÷: para a direita, os zeros do fim saem)
function iniciarCasas(a) {
  const cols = a.colunas || ['M', 'C', 'D', 'U'], n = cols.length, palco = $('qe-palco');
  palco.insertAdjacentHTML('beforeend', `<div class="qe-cs-op" id="qe-cs-op"></div>
    <div class="qe-cs-quadro" style="--n:${n}">${cols.map(c => `<div class="qe-cs-col"><b>${esc(c)}</b><span></span></div>`).join('')}<div class="qe-cs-fichas" id="qe-cs-fichas"></div></div>
    <div class="qe-cs-num" id="qe-cs-num"></div>`);
  const box = $('qe-cs-fichas'), dig = (s) => String(s ?? '').replace(/\D/g, '').split('');
  const pos = (c) => ((c + 0.5) / n * 100).toFixed(2) + '%';
  let fichas = [];
  const ficha = (d, col, novo) => {
    const el = document.createElement('div');
    el.className = 'qe-cs-ficha' + (novo ? ' novo' : '');
    el.textContent = d; el.style.left = pos(col);
    box.appendChild(el);
    return { el, col };
  };
  const numero = (txt, ok = false) => { $('qe-cs-num').textContent = txt; $('qe-cs-num').classList.toggle('ok', ok); };
  const op = (t) => { $('qe-cs-op').textContent = t; $('qe-cs-op').classList.toggle('on', !!t); };
  const montar = (num) => { box.innerHTML = ''; const ds = dig(num); fichas = ds.map((d, i) => ficha(d, n - ds.length + i)); numero(String(num)); };
  const deslizar = (k) => {
    for (const f of fichas) { f.col -= k; f.el.style.left = pos(f.col); if (f.col >= n) f.el.classList.add('sai'); }
    fichas = fichas.filter(f => f.col < n || (setTimeout(() => f.el.remove(), 500), false));
  };
  const completar = (num, ok) => {
    const ds = dig(num), faltam = ds.length - fichas.length;
    for (let i = 0; i < faltam; i++) fichas.push(ficha(ds[ds.length - faltam + i], n - faltam + i, true));
    numero(String(num), ok);
  };
  const et = a.etapas || [], leg = a.legendas || [], nOps = et.filter((e, k) => k && e.op).length;
  const separar = leg.length >= 1 + 2 * nOps;   // uma legenda para deslizar e outra para o 0 entrar
  const passos = [() => { op(''); montar(et[0]?.numero); }];
  let primeira = true;
  et.forEach((e, k) => {
    if (!k) return;
    const ultima = k === et.length - 1;
    if (!e.op) { passos.push(() => { op(''); montar(e.numero); }); return; }
    const k2 = dig(e.numero).length - dig(et[k - 1].numero).length;
    const desliza = () => { op(e.op); deslizar(k2); }, entra = () => completar(e.numero, ultima);
    if (separar || primeira) { passos.push(desliza); passos.push(entra); }
    else passos.push(() => { desliza(); depois(700, entra); });
    primeira = false;
  });
  comecarAnim(passos, leg);
}
// 🐸 sapo: o número em fichas e a vírgula é um sapinho entre elas; × pula para a direita, ÷ para a esquerda (pulos casas);
// faltou casa: entra um 0; no fim, o número certo em verde. Número inteiro: o sapo começa escondido no fim
function iniciarSapo(a) {
  const palco = $('qe-palco');
  palco.insertAdjacentHTML('beforeend', `<div class="qe-sp-op" id="qe-sp-op"></div><div class="qe-sp-linha" id="qe-sp-linha"><span class="qe-sp-sapo" id="qe-sp-sapo">🐸</span></div><div class="qe-sp-num" id="qe-sp-num"></div>`);
  const linha = $('qe-sp-linha'), sapo = $('qe-sp-sapo');
  let ds = [], f = 0;   // fichas (algarismos) e onde está o sapo (quantos algarismos à esquerda dele)
  const W = () => Math.min(15, 86 / Math.max(ds.length, f, 1));
  const arrumar = () => {
    const w = W(), ini = 50 - ds.length * w / 2;
    ds.forEach((d, i) => { d.el.style.left = (ini + (i + 0.5) * w).toFixed(2) + '%'; d.el.style.width = (w * 0.86).toFixed(2) + '%'; });
    sapo.style.left = (ini + f * w).toFixed(2) + '%';
  };
  const ficha = (t, novo) => { const el = document.createElement('div'); el.className = 'qe-sp-ficha' + (novo ? ' novo' : ''); el.textContent = t; linha.appendChild(el); return { el, t }; };
  const numero = (t, ok = false) => { $('qe-sp-num').textContent = t; $('qe-sp-num').classList.toggle('ok', ok); };
  const op = (t) => { $('qe-sp-op').textContent = t; $('qe-sp-op').classList.toggle('on', !!t); };
  const montar = (num) => {
    for (const d of ds) d.el.remove();
    const [int, dec = null] = String(num).split(',');
    ds = [...int, ...(dec ?? '')].map(t => ficha(t));
    f = int.length;
    sapo.classList.toggle('escondido', dec == null);   // inteiro: o sapo fica escondido no fim
    arrumar(); numero(String(num)); op('');
  };
  const pular = (dir, vezes, aoFim) => {
    sapo.classList.remove('escondido');
    for (let k = 0; k < vezes; k++) depois(450 + k * 480, () => {
      f += dir;
      sapo.classList.remove('pula'); void sapo.offsetWidth; sapo.classList.add('pula');
      arrumar();
    });
    depois(450 + vezes * 480, aoFim);
  };
  // faltou casa: zeros entram (na frente, ou no fim); 0 na frente sobrando sai; inteiro no fim: o sapo se esconde
  const completar = (num) => {
    while (f <= 0) { ds.unshift(ficha('0', true)); f++; }
    while (f > ds.length) ds.push(ficha('0', true));
    while (ds.length > 1 && f > 1 && ds[0].t === '0') { const d = ds.shift(); d.el.classList.add('sai'); setTimeout(() => d.el.remove(), 400); f--; }
    sapo.classList.toggle('escondido', f === ds.length);
    arrumar(); numero(String(num), true);
  };
  const et = a.etapas || [], passos = [() => montar(et[0]?.numero)];
  et.forEach((e, k) => {
    if (!k) return;
    if (!e.op) { passos.push(() => montar(e.numero)); return; }
    const dir = e.lado === 'esquerda' ? -1 : 1, vezes = Number(e.pulos) || 1;
    // simula: vai faltar casa? então os zeros entram num passo próprio (a legenda "…faltou casa")
    const [int, dec = ''] = String(et[k - 1].numero).split(','), destino = int.length + dir * vezes, falta = destino <= 0 || destino > int.length + dec.length;
    if (falta) { passos.push(() => { op(e.op); pular(dir, vezes, () => {}); }); passos.push(() => completar(e.numero)); }
    else passos.push(() => { op(e.op); pular(dir, vezes, () => completar(e.numero)); });
  });
  comecarAnim(passos, a.legendas || []);
}
const ANIMACOES = { fila: (a) => iniciarFila(a), caixas: iniciarCaixas, casas: iniciarCasas, sapo: iniciarSapo };

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
  for (const t of an.sub || []) clearTimeout(t);
  if (an.sub) an.sub.length = 0;
  passoFila();
  if (an.pausado) return;
  an.timer = setTimeout(() => { an.i = (an.i + 1) % an.passos.length; rodarFila(); }, an.i === an.passos.length - 1 ? ESPERA_FIM : ESPERA);
}
function pararFila() { if (qe?.anim) { clearTimeout(qe.anim.timer); for (const t of qe.anim.sub || []) clearTimeout(t); qe.anim = null; } }
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

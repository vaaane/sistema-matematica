// Jogo de Revisão — 📜 Quadro de Estudos dos mapas (PROMPT-90). Conteúdo em dados/jogo/estudos.json → mapaN.{A,B}.
//   abrirQuadroEstudos({ dados, nomeMapa, ginasios })   fecharQuadroEstudos()
// Painel deitado: abas dos ginásios, menu à esquerda (⭐ Regra · 🎟️ Pensa assim · ✏️ Exemplos · ⚠️ Armadilha · 🎯 Tente você),
// uma seção por vez. Textos do JSON: **negrito**, [[destaque laranja]], {{verde}} — o resto é escapado.
// Sem moedas: o "Tente você" é treino; o acerto dá 3 XP do jogo (aoAcertarTente, PROMPT-156).
// Animações do "Pensa assim": fila (PROMPT-90) · caixas, casas e sapo (PROMPT-113), todas com o mesmo ritmo, legendas
// numeradas e controles; com prefers-reduced-motion, só a etapa final. termometro, sinais, pizza e alinhar (PROMPT-115,
// mapas 3 e 4): desenhadas em SVG no palco, no mesmo motor. potencia, raiz_quadrado, reta_pulos e arranjos (PROMPT-136,
// mapas 5 e 6): com `exemplos` e o botão "Outro exemplo ▶" (as legendas do JSON valem para o 1º; nos outros, geradas).
// plano (PROMPT-128, mapa 12): o pet anda no plano
// cartesiano (plano.js), um exemplo depois do outro. "Tente você" do mapa 12 (tente_plano): tocar no ponto (alvos) ou
// tocar onde o pet para (perguntas), no lugar da múltipla escolha.
import { criarPlano, faixaPara, pontosDoCaminho, par, fmt, textoMov, CORES_PLANO as COR } from './plano.js';

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

export function abrirQuadroEstudos({ dados, nomeMapa, ginasios = ['A', 'B'], aoAcertarTente = null }) {   // aoAcertarTente: ⭐ XP do jogo (PROMPT-156)
  fecharQuadroEstudos();
  const G = ginasios.find(g => dados[g]) || ginasios[0];
  qe = { dados, ginasios, G, sec: 'regra', vistas: new Set(), ex: 0, tente: null, anim: null, aoAcertarTente };
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
  $('qe-menu').innerHTML = SECOES.filter(([s]) => d[s] || (s === 'tente' && d.tente_plano)).map(([s, ic, nome, cor]) =>
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
          <div class="qe-ctrl"><div class="qe-pts" id="qe-pts"></div><button class="qe-mini" data-qe-pausa>⏸ pausar</button><button class="qe-mini" data-qe-inicio>↺ do início</button>${a.exemplos?.length > 1 && a.tipo !== 'plano' ? '<button class="qe-mini" data-qe-outro>Outro exemplo ▶</button>' : ''}</div>` : ''}
          ${p.porque ? `<p class="qe-porque">${marcar(p.porque)}</p>` : ''}
        </div>
      </div>`;
    qe.exAnim = 0;
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
  } else if (s === 'tente' && d.tente_plano) {
    abrirTentePlano(selo, d.tente_plano);
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
    qe.aoAcertarTente?.();
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
// 📐 plano (PROMPT-128): modo "monta" (o pet sai da origem: x, depois y) ou "andar" (a cada casa, só um número muda);
// a legenda é a última fala; no fim de um exemplo, espera e passa para o próximo
function iniciarPlano(a) {
  const palco = $('qe-palco');
  palco.innerHTML = '<svg class="qe-pl-svg" aria-label="Plano cartesiano"></svg>';
  const p = criarPlano(palco.querySelector('svg'));
  qe.anim = { plano: p, a, i: 0, timer: 0 };
  rodarPlano();
}
function rodarPlano() {
  const an = qe?.anim;
  if (!an?.plano) return;
  clearTimeout(an.timer);
  const ex = an.a.exemplos[an.i], monta = an.a.modo === 'monta';
  $('qe-pnum').textContent = an.i + 1;
  $('qe-pts').innerHTML = an.a.exemplos.map((_, k) => `<i class="${k <= an.i ? 'on' : ''}"></i>`).join('');
  $('qe-pleg').innerHTML = '';
  an.plano.desenhar({ ...faixaPara(monta ? [ex] : pontosDoCaminho(ex.de, ex.mov)), texto: 1.15 });
  const fala = { diz: (h) => { if (qe?.anim === an) $('qe-pleg').innerHTML = h; } };
  const fim = monta ? an.plano.montarPonto(ex, fala) : an.plano.andarDe(ex.de, ex.mov, fala);
  fim.then(() => {
    if (qe?.anim !== an) return;
    an.timer = setTimeout(() => { if (qe?.anim === an) { an.i = (an.i + 1) % an.a.exemplos.length; rodarPlano(); } }, ESPERA_FIM);
  }).catch(() => {});   // cancelada: outra começou
}

// 🎯 Tente você no plano (PROMPT-128): alvos = "Toque no ponto (x, y)" (Forte Pirata); perguntas = "Saindo de …, ando …:
// toque onde eu paro" (Observatório). Sem prêmio; 🔥 conta os acertos seguidos.
function abrirTentePlano(selo, tp) {
  const alvos = !!tp.alvos?.length, lista = alvos ? tp.alvos : tp.perguntas || [];
  if (!lista.length) return;
  // uma faixa só para todas (o tamanho do plano não entrega a resposta), com folga só em cima (o pet e a bandeira):
  // as casas maiores para tocar
  const pts = [[0, 0], ...(alvos ? lista : lista.flatMap(q => pontosDoCaminho(q.de, q.mov)))], xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  const faixa = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) + 1 };
  $('qe-tela').innerHTML = `${selo}<div class="qe-tp">
    <div class="qe-tp-plano"><svg id="qe-tp-svg" aria-label="Plano cartesiano"></svg></div>
    <div class="qe-tp-lado"><h2 id="qe-tp-tit"></h2><div class="qe-tp-fala" id="qe-tp-fala"></div><div class="qe-tp-resp" id="qe-tp-resp"></div>
      <div class="qe-tp-fogo" id="qe-tp-fogo"></div><button class="qe-outra" data-qe-tp-outra>${alvos ? 'Outro ponto' : 'Outra'} ▶</button></div></div>`;
  const plano = criarPlano($('qe-tp-svg'));
  const ant = qe.tente;
  qe.tente = { plano, tp, alvos, lista, faixa, i: ant?.plano ? ant.i : -1, seguidos: ant?.plano ? ant.seguidos : 0 };
  qe.anim = { plano };   // pararFila cancela a animação
  proximoTentePlano();
}
function proximoTentePlano() {
  const t = qe?.tente;
  if (!t?.plano) return;
  t.i = (t.i + 1) % t.lista.length;
  t.feito = false;
  const p = t.plano, item = t.lista[t.i];
  p.desenhar({ ...t.faixa, texto: 1.3 });
  $('qe-tp-resp').innerHTML = '';
  if (t.alvos) {
    const [X, Y] = item;
    p.petEm(0, 0); p.anelOrigem();
    $('qe-tp-tit').innerHTML = `Toque no ponto ${esc(par(X, Y))}`;
    $('qe-tp-fala').innerHTML = `Toque no <b>cruzamento</b> das linhas onde fica o ponto <b>(<span class="cx">${fmt(X)}</span>, <span class="cy">${fmt(Y)}</span>)</b>.<p class="qe-tp-nota">Lembre: <span class="cx">x</span> é o lado, <span class="cy">y</span> é cima ou baixo.</p>`;
  } else {
    p.petEm(...item.de); p.ponto(...item.de, COR.verde, 8); p.rotulo(...item.de, 'partida', COR.verde, 28);
    $('qe-tp-tit').innerHTML = esc(t.tp.titulo || 'Onde eu paro?');
    $('qe-tp-fala').innerHTML = `Saindo de <b>${esc(par(...item.de))}</b>, ${textoMov(item.mov)}. <b>Toque onde eu paro.</b>`;
  }
  fogo();
}
const fogo = () => { const n = qe.tente.seguidos; $('qe-tp-fogo').textContent = `🔥 ${n} seguido${n === 1 ? '' : 's'}`; };
// o caminho de (x0, y0) até (X, Y): primeiro o x, depois o y
const movAte = ([x0, y0], [X, Y]) => [[Math.sign(X - x0), 0, Math.abs(X - x0)], [0, Math.sign(Y - y0), Math.abs(Y - y0)]].filter(m => m[2]);
async function tocarTentePlano(e) {
  const t = qe?.tente;
  if (!t?.plano || t.feito) return;
  const c = t.plano.casaDoToque(e);
  if (!c) return;
  const [x, y] = c, p = t.plano, item = t.lista[t.i], resp = $('qe-tp-resp');
  if (t.alvos) {
    const [X, Y] = item;
    if (x === X && y === Y) {
      t.feito = true; t.seguidos++; fogo(); qe.aoAcertarTente?.();
      resp.className = 'qe-tp-resp qe-ok';
      resp.innerHTML = `Acertou! ${esc(par(X, Y))}: ${X ? `${Math.abs(X)} para a ${X > 0 ? 'direita' : 'esquerda'}` : 'não anda para o lado'} e ${Y ? `${Math.abs(Y)} para ${Y > 0 ? 'cima' : 'baixo'}` : 'não sobe'}.`;
      try { await p.mostrarCaminho([0, 0], movAte([0, 0], [X, Y]), { rapido: true }); } catch (_) { return; }
      if (qe?.tente === t) setTimeout(() => { if (qe?.tente === t && t.feito) proximoTentePlano(); }, 1400);
    } else {
      t.seguidos = 0; fogo();
      p.xis(x, y); p.rotulo(x, y, par(x, y), COR.verm, -28);
      const dica = x === Y && y === X && X !== Y ? 'Você trocou a ordem: o x (lado) vem primeiro!'
        : x !== X ? `O x está errado: o ${fmt(X)} manda andar ${Math.abs(X)} para a ${X > 0 ? 'direita' : 'esquerda'}${X === 0 ? ' (0 = não anda)' : ''}.`
        : `O x está certo, mas o y não: ${fmt(Y)} = ${Math.abs(Y)} para ${Y > 0 ? 'cima' : 'baixo'}.`;
      resp.className = 'qe-tp-resp qe-erro';
      resp.innerHTML = `Você tocou em <b>${esc(par(x, y))}</b>. ${esc(dica)} Tente de novo.`;
    }
    return;
  }
  // perguntas: marca o toque e o pet faz o caminho para conferir
  t.feito = true;
  const fimX = item.de[0] + item.mov.reduce((s, m) => s + m[0] * m[2], 0), fimY = item.de[1] + item.mov.reduce((s, m) => s + m[1] * m[2], 0);
  const certo = x === fimX && y === fimY;
  if (!certo) { p.xis(x, y); p.rotulo(x, y, par(x, y), COR.verm, -28); }
  t.seguidos = certo ? t.seguidos + 1 : 0; fogo();
  if (certo) qe.aoAcertarTente?.();
  resp.className = 'qe-tp-resp';
  resp.innerHTML = 'Vamos conferir…';
  try { await p.mostrarCaminho(item.de, item.mov, { rapido: true }); } catch (_) { return; }
  if (qe?.tente !== t) return;
  resp.className = `qe-tp-resp ${certo ? 'qe-ok' : 'qe-erro'}`;
  resp.innerHTML = certo ? `Isso! Parei em <b>${esc(par(fimX, fimY))}</b>. 🎉` : `Eu parei em <b>${esc(par(fimX, fimY))}</b>, não em ${esc(par(x, y))}. Lado muda o x; cima/baixo muda o y.`;
}

// ── PROMPT-115 (mapas 3 e 4): termômetro, sinais, pizza e alinhar. SVG no palco (viewBox 600 × 240), o mesmo motor de passos ──
const SVGNS = 'http://www.w3.org/2000/svg';
const CQ = { lar: 'var(--jr-laranja, #ff7b2e)', az: 'var(--jr-cyan, #00d4ff)', verde: 'var(--jr-verde, #00e676)', verm: '#ff4d5e', ouro: 'var(--jr-ouro, #ffd700)' };
function svgPalco(w = 600, h = 240) {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('viewBox', `0 0 ${w} ${h}`); s.setAttribute('class', 'qe-anim-svg');
  $('qe-palco').appendChild(s);
  return s;
}
function sv(tag, at = {}, pai) { const e = document.createElementNS(SVGNS, tag); for (const k in at) e.setAttribute(k, at[k]); if (pai) pai.appendChild(e); return e; }
function st(texto, x, y, at = {}, pai) { const e = sv('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'Inter, sans-serif', 'font-weight': 800, fill: '#fff', ...at }, pai); e.textContent = texto; return e; }
// uma mudança suave ao longo de ms (0 → 1); sem movimento ou com outra animação: vai direto ao fim
function tween(ms, fn) {
  const an = qe?.anim;
  if (!an || calmo()) { fn(1); return; }
  const t0 = performance.now();
  const passo = (agora) => { if (qe?.anim !== an) return; const k = Math.min(1, (agora - t0) / ms); fn(k < 1 ? k * k * (3 - 2 * k) : 1); if (k < 1) requestAnimationFrame(passo); };
  requestAnimationFrame(passo);
}
const numTxt = (v) => (v < 0 ? '−' + Math.abs(v) : String(v));

// 🌡️ termômetro em pé, de min a max: acima de zero laranja (quente), abaixo azul (frio); o líquido sobe ou desce até o valor
function iniciarTermometro(a) {
  const s = svgPalco(360, 240), mn = Number(a.min ?? -10), mx = Number(a.max ?? 10), y0 = 14, y1 = 226, X = 140;
  const Y = (v) => y1 - (v - mn) / (mx - mn) * (y1 - y0);
  sv('rect', { x: X - 16, y: y0 - 8, width: 32, height: y1 - y0 + 16, rx: 16, fill: 'rgba(255,255,255,.08)', stroke: '#fff', 'stroke-width': 3 }, s);
  const liq = sv('rect', { x: X - 9, width: 18, rx: 9 }, s);
  for (let v = mn; v <= mx; v++) {
    const zero = v === 0;
    sv('line', { x1: X + 18, x2: X + (zero ? 46 : 28), y1: Y(v), y2: Y(v), stroke: zero ? '#fff' : 'rgba(255,255,255,.5)', 'stroke-width': zero ? 3 : 1.5 }, s);
    if (zero || (mx - mn <= 20) || v % 2 === 0) st(numTxt(v), X + (zero ? 52 : 34), Y(v), { 'font-size': zero ? 17 : 12, fill: zero ? '#fff' : v > 0 ? CQ.lar : CQ.az, 'text-anchor': 'start' }, s);
  }
  sv('line', { x1: X - 26, x2: X + 18, y1: Y(0), y2: Y(0), stroke: '#fff', 'stroke-width': 2, 'stroke-dasharray': '4 3' }, s);
  const grande = st('', 280, 120, { 'font-size': 34, 'font-family': 'Orbitron, sans-serif' }, s);
  const op = st('', 52, 120, { 'font-size': 26, 'font-family': 'Orbitron, sans-serif', fill: CQ.lar }, s);
  let atual = Number(a.etapas?.[0]?.valor ?? 0);
  const pintar = (v) => {
    const topo = Y(v), base = Y(0);
    liq.setAttribute('y', Math.min(topo, base)); liq.setAttribute('height', Math.max(4, Math.abs(base - topo)));
    liq.setAttribute('fill', v >= 0 ? CQ.lar : CQ.az);
    grande.textContent = `${numTxt(Math.round(v))} °C`; grande.setAttribute('fill', Math.round(v) > 0 ? CQ.lar : Math.round(v) < 0 ? CQ.az : '#fff');
  };
  const ir = (v) => { const de = atual; atual = v; tween(1300, (k) => pintar(de + (v - de) * k)); };
  const et = a.etapas || [];
  const passos = [() => { op.textContent = ''; atual = Number(et[0]?.valor ?? 0); pintar(atual); }];
  et.slice(1).forEach((e) => {
    passos.push(() => { op.textContent = e.op || ''; op.setAttribute('fill', /^[−-]/.test(e.op || '') ? CQ.az : CQ.lar); });
    passos.push(() => ir(Number(e.valor)));
  });
  comecarAnim(passos, a.legendas || []);
}

// 😊😠 sinais: duas fichas (verde + / vermelha −) se aproximam e, ao se encontrarem, aparece a do resultado
function iniciarSinais(a) {
  const s = svgPalco(440, 240), cor = (x) => (x === '+' ? CQ.verde : CQ.verm), cara = (x) => (x === '+' ? '😊' : '😠');
  const ficha = (x, cx) => { const g = sv('g', { style: `transform: translate(${cx}px, 96px); transition: transform .9s ease, opacity .4s` }, s);
    sv('circle', { r: 42, fill: cor(x), stroke: '#fff', 'stroke-width': 3 }, g); st(x === '+' ? '+' : '−', 0, -10, { 'font-size': 34, fill: '#10142a' }, g); st(cara(x), 0, 22, { 'font-size': 24 }, g); return g; };
  let fichas = [];
  const texto = st('', 220, 206, { 'font-size': 20, 'font-weight': 700 }, s);
  const passos = (a.etapas || []).map((e) => () => {
    for (const f of fichas) f.remove();
    texto.textContent = '';
    const fa = ficha(e.a, 70), fb = ficha(e.b, 370);
    fichas = [fa, fb];
    // aproximam-se do centro; ao se encontrarem, aparece o resultado
    depois(80, () => { fa.style.transform = 'translate(172px, 96px)'; fb.style.transform = 'translate(268px, 96px)'; });
    depois(1050, () => {
      fa.style.opacity = fb.style.opacity = '.35';
      const fr = ficha(e.r, 220); fr.style.transform = 'translate(220px, 96px) scale(1.15)'; fichas.push(fr);
      texto.textContent = e.texto || ''; texto.setAttribute('fill', cor(e.r));
    });
  });
  comecarAnim(passos, a.legendas || []);
}

// 🍕 pizza em fatias: as pintadas com queijo e calabresa; com op, as novas se pintam uma a uma; quando as partes mudam,
// os cortes que sobram somem com fade (4/8 é a mesma área de 1/2)
function iniciarPizza(a) {
  const s = svgPalco(), cx = 190, cy = 120, r = 100;
  sv('circle', { cx, cy, r: r + 4, fill: 'none', stroke: '#c0702a', 'stroke-width': 9 }, s);   // a borda (só contorno)
  const gF = sv('g', {}, s), gC = sv('g', {}, s), gCal = sv('g', {}, s);
  sv('circle', { cx, cy, r, fill: 'none', stroke: '#7a3e00', 'stroke-width': 3 }, s);
  const fr = st('', 430, 110, { 'font-size': 42, 'font-family': 'Orbitron, sans-serif' }, s), opT = st('', 430, 62, { 'font-size': 24, fill: CQ.lar }, s);
  let n = 0, fatias = [], cortes = [];
  const fatia = (i, N) => { const a0 = -Math.PI / 2 + i * 2 * Math.PI / N, a1 = a0 + 2 * Math.PI / N;
    return `M${cx} ${cy} L${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`; };
  const pintar = (f, sim) => { f.setAttribute('fill', sim ? '#f5c542' : 'rgba(255,255,255,.04)'); };
  const calabresas = (pintadas, N) => { gCal.innerHTML = ''; for (let i = 0; i < pintadas; i++) { const am = -Math.PI / 2 + (i + 0.5) * 2 * Math.PI / N;
    const pos = N <= 4 ? [[0.32, 0], [0.62, -0.35], [0.62, 0.35], [0.85, 0]] : [[0.45, 0], [0.72, 0]];
    for (const [d, da] of pos) { const ang = am + da * Math.PI / N; sv('circle', { cx: cx + r * d * Math.cos(ang), cy: cy + r * d * Math.sin(ang), r: Math.min(12, Math.max(5, 30 / Math.sqrt(N))), fill: '#c0392b', stroke: '#7a1e12', 'stroke-width': 1.5 }, gCal); } } };
  const montar = (N, pintadas) => {
    gF.innerHTML = ''; gC.innerHTML = ''; n = N;
    fatias = Array.from({ length: N }, (_, i) => { const f = sv('path', { d: fatia(i, N), stroke: 'none' }, gF); pintar(f, i < pintadas); return f; });
    cortes = Array.from({ length: N }, (_, i) => { const ang = -Math.PI / 2 + i * 2 * Math.PI / N; return sv('line', { x1: cx, y1: cy, x2: cx + r * Math.cos(ang), y2: cy + r * Math.sin(ang), stroke: '#7a3e00', 'stroke-width': 3, style: 'transition: opacity .9s' }, gC); });
    calabresas(pintadas, N);
  };
  const et = a.etapas || [];
  let pint = 0;
  const passos = et.map((e, k) => () => {
    fr.textContent = e.texto || ''; opT.textContent = e.op || '';
    const N = Number(e.partes), P = Number(e.pintadas);
    if (!k || (N === n && !e.op)) { montar(N, P); pint = P; return; }
    if (N === n) {   // op: as novas se pintam uma a uma
      for (let i = pint; i < P; i++) depois(250 + (i - pint) * 320, () => { pintar(fatias[i], true); calabresas(i + 1, N); });
      pint = P; return;
    }
    // menos partes: os cortes que não servem para a divisão nova somem com fade, a área pintada é a mesma
    const passo = n / N;
    cortes.forEach((c, i) => { if (i % passo) c.style.opacity = '0'; });
    depois(1000, () => { montar(N, P); pint = P; });
  });
  comecarAnim(passos, a.legendas || []);
}

// ➕ alinhar pela vírgula: os números chegam tortos, descem e se alinham; as casas vazias viram 0; a soma vai coluna por
// coluna, da direita para a esquerda, e o resultado aparece embaixo, em verde
function iniciarAlinhar(a) {
  const s = svgPalco(360, 200), nums = (a.numeros || []).map(String), comp = (a.completa || nums).map(String), res = String(a.resultado ?? '');
  const casasDec = Math.max(...comp.map(x => (x.split(',')[1] || '').length), (res.split(',')[1] || '').length);
  const casasInt = Math.max(...comp.map(x => x.split(',')[0].length), res.split(',')[0].length);
  const CW = 28, xVir = 180, lin0 = 40, LH = 42;
  const xCol = (j) => xVir + (j < 0 ? (j + 0.5) * CW : (j + 0.5) * CW + 6);   // j < 0: inteiros (−1 = unidade); j ≥ 0: decimais
  const guia = sv('line', { x1: xVir + 3, x2: xVir + 3, y1: 18, y2: lin0 + LH * (nums.length + 0.6), stroke: CQ.ouro, 'stroke-width': 3, 'stroke-dasharray': '6 5', opacity: 0, style: 'transition: opacity .3s' }, s);
  const linhas = nums.map((x, i) => {
    const [int, dec = ''] = comp[i].split(','), [, decOrig = ''] = x.split(','), g = sv('g', { style: 'transition: transform 1s ease' }, s);
    const y = lin0 + i * LH, chars = [];
    [...int].forEach((d, k) => chars.push(st(d, xCol(k - int.length), y, { 'font-size': 26, 'font-family': 'Orbitron, sans-serif' }, g)));
    st(',', xVir + 3, y, { 'font-size': 26, 'font-family': 'Orbitron, sans-serif' }, g);
    const zeros = [];
    [...dec].forEach((d, k) => { const e = st(d, xCol(k), y, { 'font-size': 26, 'font-family': 'Orbitron, sans-serif' }, g); chars.push(e); if (k >= decOrig.length) { e.setAttribute('opacity', 0); zeros.push(e); } });
    if (i === nums.length - 1) st(a.op || '+', xCol(-casasInt - 1), y, { 'font-size': 26, fill: CQ.lar }, g);
    return { g, zeros, desloca: (i % 2 ? 1 : -1) * (40 + 30 * i) };
  });
  const yTraco = lin0 + LH * (nums.length - 0.4);
  sv('line', { x1: xCol(-casasInt - 1) - 16, x2: xCol(casasDec - 1) + 18, y1: yTraco, y2: yTraco, stroke: '#fff', 'stroke-width': 3 }, s);
  const yRes = yTraco + 30, gRes = sv('g', {}, s), [rInt, rDec = ''] = res.split(',');
  const torto = () => linhas.forEach((l, i) => { l.g.style.transform = `translate(${l.desloca}px, ${-10 - i * 6}px) rotate(${i % 2 ? 4 : -4}deg)`; });
  const destaque = sv('rect', { x: 0, y: lin0 - LH / 2, width: CW, height: LH * nums.length + 40, rx: 8, fill: 'rgba(255,215,0,.12)', stroke: CQ.ouro, 'stroke-width': 2, opacity: 0 }, s);
  const passos = [
    () => { gRes.innerHTML = ''; guia.setAttribute('opacity', 0); destaque.setAttribute('opacity', 0); linhas.forEach(l => l.zeros.forEach(z => { z.setAttribute('opacity', 0); z.setAttribute('fill', '#fff'); })); torto(); },
    () => { linhas.forEach(l => { l.g.style.transform = 'none'; }); guia.setAttribute('opacity', 1); let k = 0; const pisca = () => { if (k++ < 6) { guia.setAttribute('opacity', k % 2 ? 0.3 : 1); depois(300, pisca); } }; depois(1000, pisca); },
    () => linhas.forEach(l => l.zeros.forEach(z => { z.setAttribute('opacity', 1); z.setAttribute('fill', CQ.lar); })),
    () => {   // coluna por coluna, da direita para a esquerda
      gRes.innerHTML = '';
      const cols = [...Array.from({ length: casasDec }, (_, k) => casasDec - 1 - k), ...Array.from({ length: casasInt }, (_, k) => -1 - k)];
      cols.forEach((j, q) => depois(q * 420, () => {
        destaque.setAttribute('x', xCol(j) - CW / 2); destaque.setAttribute('opacity', 1);
        const d = j >= 0 ? rDec[j] : rInt[rInt.length + j];
        if (d != null) st(d, xCol(j), yRes, { 'font-size': 26, 'font-family': 'Orbitron, sans-serif', fill: CQ.verde }, gRes);
        if (j === 0) st(',', xVir + 3, yRes, { 'font-size': 26, 'font-family': 'Orbitron, sans-serif', fill: CQ.verde }, gRes);
      }));
    },
    () => { destaque.setAttribute('opacity', 0); gRes.innerHTML = ''; [...rInt].forEach((d, k) => st(d, xCol(k - rInt.length), yRes, { 'font-size': 26, 'font-family': 'Orbitron, sans-serif', fill: CQ.verde }, gRes));
      st(',', xVir + 3, yRes, { 'font-size': 26, 'font-family': 'Orbitron, sans-serif', fill: CQ.verde }, gRes); [...rDec].forEach((d, k) => st(d, xCol(k), yRes, { 'font-size': 26, 'font-family': 'Orbitron, sans-serif', fill: CQ.verde }, gRes)); },
  ];
  comecarAnim(passos, a.legendas || []);
}

// ── PROMPT-136 (mapas 5 e 6): potência, raiz quadrada, pulos na reta e arranjos. Cada uma tem `exemplos`; as legendas do
// JSON valem para o 1º exemplo e, nos outros, o mesmo texto com os números do exemplo ──
const exemploAnim = (a) => a.exemplos?.[qe.exAnim % a.exemplos.length] || a;
const legendasAnim = (a, geradas) => (qe.exAnim % (a.exemplos?.length || 1) === 0 && a.legendas?.length ? a.legendas : geradas);
function outroExemploAnim() {
  const a = qe?.dados?.[qe.G]?.pensa?.animacao;
  if (!a?.exemplos?.length || !ANIMACOES[a.tipo]) return;
  pararFila();
  qe.exAnim = (qe.exAnim + 1) % a.exemplos.length;
  $('qe-palco').innerHTML = '';
  $('qe-palco').classList.remove('qe-calmo');
  const b = $('estudos').querySelector('[data-qe-pausa]'); if (b) b.textContent = '⏸ pausar';
  ANIMACOES[a.tipo](a);
}
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).split('').map(d => SUP[d] ?? d).join('');
// ⛏️ potência: a base entra `exp` vezes como fichas; elas se juntam duas a duas com o resultado parcial; no fim, bᵉ = v
function iniciarPotencia(a) {
  const ex = exemploAnim(a), b = Number(ex.base), n = Number(ex.exp), s = svgPalco(), dez = b === 10;
  const parciais = []; let v = b; for (let k = 1; k < n; k++) { parciais.push([v, v * b]); v *= b; }
  const leg = legendasAnim(a, [`${b}${sup(n)}: o ${b} entra ${n} ${n === 1 ? 'vez' : 'vezes'}`,
    n > 2 ? parciais.slice(0, -1).map(([x, y]) => `${x} × ${b} = ${y}`).join(' → ') + '…' : `${b} × ${b} = ${b * b}…`,
    n > 2 ? `…${parciais.at(-1)[0]} × ${b} = ${v}${dez ? ` (1 seguido de ${n} zeros)` : ''} ✅` : `${b}${sup(n)} = ${v}${dez ? ` (1 seguido de ${n} zeros)` : ''} ✅`]);
  const g = sv('g', {}, s), fim = sv('g', {}, s);
  const W = 600, R = Math.min(38, 230 / n), x0 = W / 2 - (n - 1) * (R * 2.4) / 2;
  const ficha = (txt, x, cor = CQ.lar, r = R) => { const e = sv('g', { style: `transform: translate(${x}px, 96px); transition: transform .6s ease, opacity .4s` }, g);
    sv('circle', { r, fill: 'rgba(255,255,255,.06)', stroke: cor, 'stroke-width': 4 }, e); st(String(txt), 0, 0, { 'font-size': Math.min(26, r * 0.75), 'font-family': 'Orbitron, sans-serif' }, e); return e; };
  const caber = (f) => { const tx = f.querySelector('text'); tx.setAttribute('font-size', Math.min(26, R * 0.75, 2.6 * R / Math.max(1, tx.textContent.length))); };   // 1000 cabe na ficha
  let fichas = [];
  const montar = () => { g.innerHTML = ''; fim.innerHTML = ''; fichas = Array.from({ length: n }, (_, k) => ficha(b, x0 + k * R * 2.4, '#fff')); };
  const passos = [
    () => { montar(); fichas.forEach((f, k) => depois(250 + k * 380, () => { f.querySelector('circle').setAttribute('stroke', CQ.lar); st(`${k + 1}ª`, x0 + k * R * 2.4, 96 + R + 18, { 'font-size': 16, fill: CQ.lar }, g); })); },
    () => {   // junta as fichas, uma a uma, com o resultado parcial (menos a última conta)
      montar();
      const nJ = n > 2 ? n - 2 : 1;
      for (let k = 0; k < nJ; k++) depois(200 + k * 650, () => {
        fichas[0].style.transform = `translate(${x0 + (k + 1) * R * 1.2}px, 96px)`; fichas[k + 1].style.opacity = '0';
        fichas[0].querySelector('text').textContent = String(parciais[k][1]); caber(fichas[0]); fichas[0].querySelector('circle').setAttribute('stroke', CQ.az);
      });
    },
    () => {
      montar(); fichas.forEach((f, k) => { if (k) f.style.opacity = '0'; });
      fichas[0].style.transform = `translate(${W / 2}px, 96px)`; fichas[0].querySelector('text').textContent = String(v); caber(fichas[0]); fichas[0].querySelector('circle').setAttribute('stroke', CQ.verde);
      const tb = st('', W / 2, 196, { 'font-size': 34, 'font-family': 'Orbitron, sans-serif' }, fim);
      const t1 = sv('tspan', { fill: '#fff' }, tb); t1.textContent = String(b);
      const t2 = sv('tspan', { fill: CQ.lar, dy: -14, 'font-size': 22 }, tb); t2.textContent = String(n);
      const t3 = sv('tspan', { fill: CQ.verde, dy: 14 }, tb); t3.textContent = dez ? ' = 1' : ` = ${v}`;
      if (dez) for (let k = 0; k < n; k++) depois(300 + k * 300, () => { t3.textContent += '0'; });
    },
  ];
  comecarAnim(passos, leg);
}
// 🗼 raiz quadrada: `area` quadradinhos soltos se arrumam num quadrado; o lado acende contando; √A = l
function iniciarRaizQuadrado(a) {
  const ex = exemploAnim(a), A = Number(ex.area), l = Math.round(Math.sqrt(A)), s = svgPalco();
  const leg = legendasAnim(a, [`${A} quadradinhos…`, '…montados num quadrado:', `${l} de cada lado → √${A} = ${l} ✅`]);
  const u = Math.min(36, 190 / l), gx = 300 - l * u / 2, gy = 120 - l * u / 2;
  let semente = A * 7 + 3; const rnd = () => (semente = (semente * 9301 + 49297) % 233280) / 233280;
  const soltos = Array.from({ length: A }, () => [30 + rnd() * 520, 20 + rnd() * 180, rnd() * 50 - 25]);
  const cel = Array.from({ length: A }, () => sv('rect', { width: u - 3, height: u - 3, rx: 4, fill: 'rgba(255,123,46,.75)', stroke: '#fff', 'stroke-width': 1.5, style: 'transition: transform .9s ease' }, s));
  const lados = sv('g', {}, s), conta = st('', 300, 222, { 'font-size': 20, 'font-weight': 800 }, s);
  const espalhar = () => cel.forEach((c, k) => { const [x, y, r] = soltos[k]; c.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg)`; });
  const arrumar = () => cel.forEach((c, k) => { c.style.transform = `translate(${gx + (k % l) * u}px, ${gy + Math.floor(k / l) * u}px)`; });
  const passos = [
    () => { lados.innerHTML = ''; conta.textContent = ''; espalhar(); },
    () => { lados.innerHTML = ''; conta.textContent = ''; arrumar(); },
    () => {
      arrumar(); lados.innerHTML = ''; conta.textContent = '';
      for (let k = 0; k < l; k++) depois(200 + k * 260, () => {
        st(String(k + 1), gx + k * u + u / 2 - 1.5, gy + l * u + 12, { 'font-size': 14, fill: CQ.lar }, lados);
        st(String(k + 1), gx - 12, gy + k * u + u / 2 - 1.5, { 'font-size': 14, fill: CQ.az }, lados);
      });
      depois(250 + l * 260, () => { conta.textContent = `√${A} = ${l}, porque ${l} × ${l} = ${A}`; conta.setAttribute('fill', CQ.verde); });
    },
  ];
  comecarAnim(passos, leg);
}
// 🐸 pulos na reta: o sapo pula de `passo` em `passo` a partir do 0 e marca onde pisa; os números de `teste` acendem
function iniciarRetaPulos(a) {
  const ex = exemploAnim(a), p = Number(ex.passo), N = Number(ex.ate), testes = (ex.teste || []).map(Number), s = svgPalco();
  const X = (v) => 30 + v * 540 / N, Yr = 140;
  const pisados = Array.from({ length: Math.floor(N / p) }, (_, k) => (k + 1) * p);
  const fala = (v) => (v % p === 0 ? `o ${v} foi pisado: é múltiplo ✅` : `o ${v} não: não é ❌`);
  const leg = legendasAnim(a, [`Pulando de ${p} em ${p} a partir do 0…`, `…ele pisa no ${pisados.join(', ')}`, testes.map((v, i) => (i ? fala(v) : fala(v).replace(/^o/, 'O'))).join(' · ')]);
  sv('line', { x1: X(0) - 8, x2: X(N) + 8, y1: Yr, y2: Yr, stroke: '#fff', 'stroke-width': 3 }, s);
  for (let v = 0; v <= N; v++) {
    sv('line', { x1: X(v), x2: X(v), y1: Yr - (v % 5 ? 6 : 10), y2: Yr + (v % 5 ? 6 : 10), stroke: 'rgba(255,255,255,.7)', 'stroke-width': v % 5 ? 1.5 : 2.5 }, s);
    if (N <= 20 || v % 5 === 0 || v % p === 0) st(String(v), X(v), Yr + 24, { 'font-size': N > 20 ? 12 : 14, fill: 'rgba(255,255,255,.8)' }, s);
  }
  const marcas = sv('g', {}, s), arcos = sv('g', {}, s), avisos = sv('g', {}, s);
  const sapo = st('🐸', X(0), Yr - 22, { 'font-size': 28, style: 'transition: transform .32s ease' }, s);
  const posSapo = (v, alto = false) => { sapo.style.transform = `translate(${X(v) - X(0)}px, ${alto ? -30 : 0}px)`; };
  const limpar = () => { marcas.innerHTML = ''; arcos.innerHTML = ''; avisos.innerHTML = ''; };
  const marcar = (v) => { sv('circle', { cx: X(v), cy: Yr, r: 8, fill: CQ.lar }, marcas); sv('path', { d: `M${X(v - p)} ${Yr - 4} Q ${(X(v - p) + X(v)) / 2} ${Yr - 60} ${X(v)} ${Yr - 4}`, fill: 'none', stroke: CQ.lar, 'stroke-width': 2, 'stroke-dasharray': '5 4' }, arcos); };
  const passos = [
    () => { limpar(); posSapo(0); },
    () => {
      limpar(); posSapo(0);
      const ms = Math.min(300, 1500 / pisados.length);
      pisados.forEach((v, k) => { depois(150 + k * ms, () => posSapo(v - p / 2, true)); depois(150 + k * ms + ms / 2, () => { posSapo(v); marcar(v); }); });
    },
    () => {
      limpar(); pisados.forEach(marcar); posSapo(pisados.at(-1) ?? 0);
      testes.forEach((v, k) => depois(200 + k * 500, () => {
        const ok = v % p === 0;
        sv('circle', { cx: X(v), cy: Yr, r: 13, fill: 'none', stroke: ok ? CQ.verde : CQ.verm, 'stroke-width': 4 }, avisos);
        st(`${v} ${ok ? '✅' : '❌'}`, X(v), Yr + 58, { 'font-size': 18, fill: ok ? CQ.verde : CQ.verm }, avisos);
      }));
    },
  ];
  comecarAnim(passos, leg);
}
// 🪓 arranjos: `n` lenhas em fileiras iguais (1, 2, … até a raiz); sem sobra → os 2 divisores entram na lista; com sobra → vermelho e some
function iniciarArranjos(a) {
  const ex = exemploAnim(a), n = Number(ex.n), s = svgPalco(440, 240), CX = 220;
  const ks = []; for (let k = 2; k * k <= n; k++) ks.push(k);
  const bons = ks.filter(k => n % k === 0), divs = [...new Set([1, n, ...bons, ...bons.map(k => n / k)])].sort((x, y) => x - y);
  const leg = legendasAnim(a, [`${n} lenhas em 1 fileira de ${n}`,
    bons.length ? bons.map(k => `${k} fileiras de ${n / k}`).join(' · ') + '…' : `${ks.length ? ks.join(' e ') + ' fileiras: sempre sobra…' : 'não dá outra arrumação…'}`,
    divs.length === 2 ? `Só 1 × ${n} → ${n} tem 2 divisores ✅` : `Divisores de ${n}: ${divs.join(', ')} ✅`]);
  const area = sv('g', {}, s), lista = st('', CX, 222, { 'font-size': 18, 'font-weight': 800 }, s);
  const LH = 20;
  const desenhar = (k, sobraVermelha = false) => {   // k fileiras: as completas em marrom; a sobra em vermelho
    area.innerHTML = '';
    const porFila = Math.floor(n / k) || n, w = Math.min(54, 400 / porFila), x0 = CX - porFila * w / 2, y0 = 100 - k * (LH + 6) / 2;
    for (let i = 0; i < n; i++) {
      const fila = Math.floor(i / porFila), col = i % porFila, sobra = fila >= k;
      const x = sobra ? CX + (col - (n % k) / 2) * w : x0 + col * w, y = sobra ? y0 + k * (LH + 6) + 8 : y0 + fila * (LH + 6);
      sv('rect', { x: x + 2, y, width: w - 4, height: LH, rx: 7, fill: sobra && sobraVermelha ? CQ.verm : '#8a5a2a', stroke: sobra && sobraVermelha ? '#fff' : '#3e220c', 'stroke-width': 2 }, area);
    }
    st(n % k === 0 ? `${k} × ${n / k}` : `${k} fileiras: sobra ${n % k}`, CX, y0 - 16, { 'font-size': 18, fill: n % k === 0 ? CQ.lar : CQ.verm }, area);
  };
  const achados = [];
  const mostrarLista = (fim = false) => { lista.textContent = fim ? (divs.length === 2 ? `só 1 × ${n} → 2 divisores` : `Divisores de ${n}: ${divs.join(', ')}`) : `Divisores: ${[...achados].sort((x, y) => x - y).join(', ')}`; lista.setAttribute('fill', fim ? CQ.verde : '#fff'); };
  const passos = [
    () => { achados.length = 0; achados.push(1, n); desenhar(1); mostrarLista(); },
    () => {
      achados.length = 0; achados.push(1, n); desenhar(1); mostrarLista();
      ks.forEach((k, q) => depois(200 + q * 750, () => {
        const ok = n % k === 0;
        desenhar(k, !ok);
        if (ok) { achados.push(k, n / k); mostrarLista(); }
        else depois(450, () => desenhar(1));
      }));
    },
    () => { desenhar(bons.at(-1) || 1); mostrarLista(true); },
  ];
  comecarAnim(passos, leg);
}

const ANIMACOES = { fila: (a) => iniciarFila(a), caixas: iniciarCaixas, casas: iniciarCasas, sapo: iniciarSapo, plano: iniciarPlano,
  termometro: iniciarTermometro, sinais: iniciarSinais, pizza: iniciarPizza, alinhar: iniciarAlinhar,
  potencia: iniciarPotencia, raiz_quadrado: iniciarRaizQuadrado, reta_pulos: iniciarRetaPulos, arranjos: iniciarArranjos };

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
function pararFila() { if (qe?.anim) { clearTimeout(qe.anim.timer); for (const t of qe.anim.sub || []) clearTimeout(t); qe.anim.plano?.cancelar(); qe.anim = null; } }
function pausarFila(b) {
  const an = qe?.anim;
  if (!an) return;
  if (an.plano) { b.textContent = an.plano.pausar() ? '▶ continuar' : '⏸ pausar'; return; }
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
    if (t.closest('[data-qe-tp-outra]')) { proximoTentePlano(); return; }
    if (t.closest('#qe-tp-svg')) { tocarTentePlano(e); return; }
    if (t.closest('[data-qe-pausa]')) { pausarFila(t.closest('[data-qe-pausa]')); return; }
    if (t.closest('[data-qe-outro]')) { outroExemploAnim(); return; }
    if (t.closest('[data-qe-inicio]')) {
      const an = qe.anim; if (!an) return;
      caixa.querySelector('[data-qe-pausa]').textContent = '⏸ pausar';
      if (an.plano) { an.i = 0; rodarPlano(); return; }
      an.i = 0; an.pausado = false; rodarFila();
    }
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && qe) { e.stopPropagation(); fechar(); } });
  window.addEventListener('resize', () => { if (qe?.sec === 'exemplos') caberContas(); });
}

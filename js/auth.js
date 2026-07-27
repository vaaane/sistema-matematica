// ── Sessão em sessionStorage (limpa ao fechar o navegador) ───
export function getSession() {
  try { return JSON.parse(sessionStorage.getItem("sm_session") || "null"); } catch(e) { return null; }
}
export function setSession(data) {
  sessionStorage.setItem("sm_session", JSON.stringify(data));
  if (data.modo === 'aluno' && data.session_token) {
    localStorage.setItem('sm_login_broadcast', JSON.stringify({
      token: data.session_token,
      aluno: data.alunos?.[0],
      turma: data.turma,
      ts:    Date.now()
    }));
    setTimeout(() => localStorage.removeItem('sm_login_broadcast'), 500);
  }
}
export function clearSession() {
  sessionStorage.removeItem("sm_session");
  localStorage.removeItem("modoTeste");
  localStorage.removeItem("sm_dupla_duelo");
  sessionStorage.removeItem("sm_jogo");
}

export function isModoTeste() {
  return localStorage.getItem('modoTeste') === 'true';
}

export function lerDuplaAtiva() {
  const s = getSession();
  try {
    const d = JSON.parse(localStorage.getItem('sm_dupla_duelo') || 'null');
    if (!d) return null;
    if (d.dono_nome && (d.dono_nome !== s?.alunos?.[0] || d.dono_turma !== s?.turma)) {
      localStorage.removeItem('sm_dupla_duelo');
      return null;
    }
    // Dupla só é válida se pertencer à sessão atual (token do login mais recente).
    // Qualquer dupla de uma sessão anterior é descartada — aluno logado nunca fica em dupla antiga.
    if (!d.session_token || d.session_token !== s?.session_token) {
      localStorage.removeItem('sm_dupla_duelo');
      return null;
    }
    return d;
  } catch(_) { return null; }
}

export function requireAluno(redirectTo = "/index.html") {
  const s = getSession();
  if (!s || s.modo !== "aluno") { window.location.href = redirectTo; return null; }
  return s;
}
export function requireProfessor(redirectTo = "/index.html") {
  const s = getSession();
  if (!s || s.modo !== "professor") { window.location.href = redirectTo; return null; }
  return s;
}

// ── Estado do jogo em sessionStorage ────────────────────────
export function getJogo() {
  try { return JSON.parse(sessionStorage.getItem("sm_jogo") || "null"); } catch(e) { return null; }
}
export function setJogo(data) {
  sessionStorage.setItem("sm_jogo", JSON.stringify(data));
}
export function clearJogo() {
  sessionStorage.removeItem("sm_jogo");
}

// ── Mobile nav (hambúrguer + backdrop) ──────────────────────
function setupMobileNav(sidebarId) {
  // Cria o backdrop se ainda não existe
  if (!document.getElementById('sidebar-backdrop')) {
    const bd = document.createElement('div');
    bd.className = 'sidebar-backdrop';
    bd.id = 'sidebar-backdrop';
    document.body.appendChild(bd);
  }

  // Injeta botão hambúrguer na topbar se ainda não existe
  const topbar = document.querySelector('.topbar');
  if (topbar && !document.getElementById('hamburger-btn')) {
    const btn = document.createElement('button');
    btn.className = 'hamburger';
    btn.id = 'hamburger-btn';
    btn.setAttribute('aria-label', 'Abrir menu');
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>`;
    topbar.prepend(btn);

    const sidebar = document.getElementById(sidebarId);
    const backdrop = document.getElementById('sidebar-backdrop');

    const openMenu  = () => { sidebar.classList.add('open');    backdrop.classList.add('open'); };
    const closeMenu = () => { sidebar.classList.remove('open'); backdrop.classList.remove('open'); };

    btn.addEventListener('click', openMenu);
    backdrop.addEventListener('click', closeMenu);

    // Fecha ao clicar em um item de nav no mobile
    sidebar.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => { if (window.innerWidth <= 768) closeMenu(); });
    });
    // Fecha ao clicar em "Sair"
    const btnSair = sidebar.querySelector('.btn-sair');
    if (btnSair) btnSair.addEventListener('click', closeMenu);
  }
}

// ── Sidebar helpers ──────────────────────────────────────────
export function renderSidebarAluno(containerId, activePage) {
  const s = getSession();
  if (!s) return;
  const alunos = s.alunos || [];
  const turma  = s.turma || "";
  const nav = [
    { id:"inicio",     href:"/aluno/menu.html",       label:"Início",     icon:`<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>` },
    { id:"atividades", href:"/aluno/a-atividades.html",  label:"Atividades", icon:`<path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/>` },
    { id:"torneios",   href:"/aluno/torneios.html",    label:"Torneios",   icon:`<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>` },
    { id:"historico",  href:"/aluno/a-historico.html",   label:"Histórico",      icon:`<path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21L13 13.04V8h-1z"/>` },
    { id:"notas",      href:"/aluno/a-notas.html",        label:"Notas",          icon:`<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>` },
    { id:"ranking",    href:"/aluno/a-ranking.html",     label:"Ranking",    icon:`<path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/>` },
    { id:"jogos",      href:"/aluno/a-jogos.html",       label:"Jogos",      icon:`<path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5S16.33 15 15.5 15zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 9 18.5 9s1.5.67 1.5 1.5S19.33 12 18.5 12z"/>` },
    { id:"duelos",      href:"/aluno/duelos.html",      label:"Duelos",     icon:`<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18L19 6.3V11c0 4.52-2.98 8.69-7 9.93C7.98 19.69 5 15.52 5 11V6.3l7-3.12z"/>` },
    { id:"certificados", href:"/aluno/a-certificados.html", label:"Certificados", icon:`<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 13l-4-4 1.41-1.41L10 11.17l6.59-6.59L18 6l-8 8z"/>` },
    { id:"aquecimento", href:"/aluno/aquecimento.html", label:"Treino Diário", icon:`<path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>` },
    { id:"guia",       href:"/aluno/guia.html",         label:"Guia",          icon:`<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>` },
    { id:"config",     href:"/aluno/a-config.html",      label:"Configurações", icon:`<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>` },
  ];
  if (localStorage.getItem('sm_pref_robotica') === '1') {
    nav.push({ divider: true });
    nav.push({ id:"robotica", href:"/aluno/a-robotica.html", label:"🤖 Robótica", icon:`<path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm6 0c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z"/>` });
  }
  const isMT = isModoTeste();
  const _duplaAtiva = lerDuplaAtiva();
  const userHtml = isMT
    ? '<div class="user-name">Professora<span>Conta Teste</span></div>'
    : alunos.map((a,i) => `<div class="user-name">${a}<span>Aluno${alunos.length>1?' '+(i+1):''}</span></div>`).join('')
      + `<div id="sidebar-dupla-badge" style="display:${_duplaAtiva ? 'block' : 'none'};margin-top:4px;opacity:.8"><span class="dupla-nome" style="color:#00d4ff;font-size:11px;font-weight:700">👥 Em dupla com ${_duplaAtiva?.nome || ''}</span><span class="dupla-sub" style="display:block;font-size:10px;color:#64748b">${_duplaAtiva?.turma || ''} · só em Duelos</span></div>`;
  const navHtml  = nav.map(n => n.divider
    ? '<div class="nav-divider"></div>'
    : `<a class="nav-item${activePage===n.id?' active-orange':''}" href="${n.href}"><svg viewBox="0 0 24 24">${n.icon}</svg>${n.label}</a>`
  ).join('');
  document.getElementById(containerId).innerHTML = `
    <div class="sidebar-brand">
      <div class="brand-icon"><img src="/logo_fundotransparente.png" style="width:56px;height:56px;object-fit:contain;"></div>
      <div class="brand-title">Sistema de Matemática</div>
      <div class="brand-sub">Plataforma Educacional</div>
    </div>
    <div class="sidebar-user">
      <div class="role-badge aluno"><svg viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18V17h2v-4.82L9 13.36V17c0 1.1 1.35 2 3 2s3-.9 3-2v-3.64l2-1.09V17h2v-5.82L23 9 12 3z"/></svg>${isMT ? '🧪 Modo Teste' : 'Turma ' + turma}</div>
      ${userHtml}
    </div>
    <nav class="sidebar-nav">
      <div class="nav-label">Navegação</div>
      ${navHtml}
    </nav>
    <div class="sidebar-footer">
      <button class="btn-sair" onclick="sair()">
        <svg viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
        Sair
      </button>
    </div>`;
  setupMobileNav(containerId);
  injetarFaixaDupla();
  if (!isMT && alunos.length > 0) {
    const _sessUid = (turma + '_' + alunos[0]).replace(/[.#$[\]/\s]/g, '_');
    iniciarVerificacaoSessao(_sessUid).catch(() => {});
    const _paginasJogo = ['/aluno/tabuada.html', '/aluno/avaliacao_plus.html',
                          '/aluno/competicao_plus.html', '/aluno/duelo_partida.html'];
    if (!_paginasJogo.some(p => location.pathname.includes(p))) {
      iniciarTimeoutInatividade(5);
    }
  }
  // Inject disponibilidade toggle into topbar-right (before avatar)
  const _topbarRight = document.querySelector('.topbar-right');
  if (_topbarRight && !document.getElementById('duelo-avail-toggle')) {
    const _tDiv = document.createElement('div');
    _tDiv.innerHTML = `<div id="duelo-avail-toggle" onclick="toggleDueloDisp()" title="Disponível para duelos" style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:20px;border:1px solid var(--border);cursor:pointer;transition:all .2s;font-size:12px;font-weight:600;margin-right:8px;"><span style="font-size:14px">⚔️</span><div id="duelo-avail-dot" style="width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 5px #22c55e;"></div></div>`;
    _topbarRight.insertBefore(_tDiv.firstElementChild, _topbarRight.firstChild);
  }
  if (isModoTeste()) {
    if (!localStorage.getItem('tema')) {
      localStorage.setItem('tema', 'escuro');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }
  if (isModoTeste() && !document.getElementById('modo-teste-banner')) {
    const main = document.querySelector('.main');
    if (main) {
      const banner = document.createElement('div');
      banner.id = 'modo-teste-banner';
      banner.style.cssText = 'background:#7C3AED;color:#fff;padding:6px 16px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:8px;letter-spacing:0.2px;flex-shrink:0;z-index:50;';
      banner.innerHTML = '🧪 Modo Teste <span style="opacity:.7;font-weight:400;flex:1">· seus dados não aparecem para os alunos</span><button onclick="window.sair&&window.sair()" style="flex-shrink:0;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;padding:3px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Sair</button>';
      const topbar = main.querySelector('.topbar');
      if (topbar) main.insertBefore(banner, topbar.nextSibling);
      else main.insertBefore(banner, main.firstChild);
    }
  }
}

function _avisarRompimentoDupla(msg) {
  try {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.textContent = '👥 ' + msg;
    el.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:24px', 'transform:translateX(-50%)',
      'background:#7C3AED', 'color:#fff', 'padding:12px 18px', 'border-radius:10px',
      'font-size:13px', 'font-weight:600', 'font-family:inherit', 'z-index:99999',
      'box-shadow:0 6px 24px rgba(0,0,0,.35)', 'max-width:90vw', 'text-align:center',
      'opacity:0', 'transition:opacity .2s ease'
    ].join(';');
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 250); }, 5000);
  } catch(_) {}
}

// ── Faixa global de dupla ────────────────────────────────────
export async function injetarFaixaDupla() {
  // Ouvir notificação de desconexão de dupla (parceiro fez login)
  try {
    const s = getSession();
    if (s?.uid_perfil || s?.alunos) {
      const _myUid = s.uid_perfil ||
        (s.turma + '_' + s.alunos[0]).replace(/[.#$[\]/\s]/g, '_');
      const { db: _db } = await import('/js/firebase-config.js');
      const { ref: _ref, onValue: _onValue, set: _set } =
        await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
      _onValue(_ref(_db, `notif_dupla/${_myUid}`), snap => {
        if (!snap.exists()) return;
        const n = snap.val();
        if (!n?.ts) return;
        _set(_ref(_db, `notif_dupla/${_myUid}`), null).catch(() => {});
        localStorage.removeItem('sm_dupla_duelo');
        document.getElementById('faixa-dupla-global')?.remove();
        const badge = document.getElementById('sidebar-dupla-badge');
        if (badge) badge.style.display = 'none';
        if (typeof atualizarBadgeDupla === 'function') atualizarBadgeDupla();
        _avisarRompimentoDupla(n.msg || 'Seu parceiro fez login e a dupla foi desfeita.');
      });
    }
  } catch(_) {}

  const _paginaAtual = window.location.pathname;
  const _paginasIgnorar = ['/aluno/duelo_partida.html', '/aluno/avaliacao_plus.html',
                            '/aluno/competicao_plus.html', '/aluno/competicao.html',
                            '/aluno/jogar.html', '/aluno/tabuada.html'];
  if (_paginasIgnorar.some(p => _paginaAtual.includes(p))) return;
  document.getElementById('faixa-dupla-global')?.remove();
  const d = lerDuplaAtiva();
  if (!d) return;

  const faixa = document.createElement('div');
  faixa.id = 'faixa-dupla-global';
  faixa.style.cssText = 'background:linear-gradient(90deg,rgba(0,212,255,.15),rgba(0,212,255,.08));border-bottom:1.5px solid rgba(0,212,255,.3);padding:8px 20px;display:flex;align-items:center;gap:10px;font-size:12px;font-weight:600;color:#00d4ff;z-index:100';
  faixa.innerHTML = `<span style="font-size:16px">👥</span><span style="flex:1">Em dupla com <strong>${d.nome}</strong> · ${d.turma}<span style="opacity:.6;font-weight:400"> — ativo só em Duelos</span></span><button id="faixa-dupla-cancelar" style="background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);color:#ef4444;border-radius:8px;padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">✕ Cancelar dupla</button>`;

  const topbar = document.querySelector('.topbar');
  if (topbar) topbar.insertAdjacentElement('afterend', faixa);
  else document.body.prepend(faixa);

  document.getElementById('faixa-dupla-cancelar').addEventListener('click', async () => {
    localStorage.removeItem('sm_dupla_duelo');
    faixa.remove();
    try {
      const { atualizarPresenca } = await import('/js/presenca.js');
      await atualizarPresenca({ parceiro_nome: null, parceiro_turma: null });
    } catch(_) {}
    const badge = document.getElementById('sidebar-dupla-badge');
    if (badge) badge.style.display = 'none';
    if (typeof restaurarEstadoDupla === 'function') restaurarEstadoDupla();
    if (typeof window.removerDuplaUI === 'function') window.removerDuplaUI();
  });
}

// ── Faixa global: duelo aguardando resposta ──────────────────
export async function injetarFaixaDuelo() {
  const _paginaAtual = window.location.pathname;
  const _paginasIgnorar = [
    '/aluno/duelos.html',
    '/aluno/duelo_partida.html',
    '/aluno/avaliacao_plus.html',
    '/aluno/competicao_plus.html',
    '/aluno/competicao.html',
    '/aluno/jogar.html',
    '/aluno/tabuada.html',
  ];
  if (_paginasIgnorar.some(p => _paginaAtual.includes(p))) return;

  document.getElementById('faixa-duelo-global')?.remove();

  let _dadosDuelo = null;
  try { _dadosDuelo = JSON.parse(sessionStorage.getItem('sm_duelo_aguardando') || 'null'); } catch(_) {}

  if (!_dadosDuelo?.id || !_dadosDuelo?.expira_em) return;
  if (_dadosDuelo.expira_em <= Date.now()) {
    sessionStorage.removeItem('sm_duelo_aguardando'); return;
  }

  try {
    const { db: _db } = await import('/js/firebase-config.js');
    const { ref: _ref, get: _get } =
      await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
    const _snap = await _get(_ref(_db, `duelos/${_dadosDuelo.id}/status`));
    if (_snap.val() !== 'aguardando') {
      sessionStorage.removeItem('sm_duelo_aguardando'); return;
    }
  } catch(_) { return; }

  const faixa = document.createElement('div');
  faixa.id = 'faixa-duelo-global';
  faixa.style.cssText = 'background:linear-gradient(90deg,rgba(124,92,252,.18),rgba(124,92,252,.08));border-bottom:1.5px solid rgba(124,92,252,.35);padding:7px 20px;display:flex;align-items:center;gap:10px;font-size:12px;font-weight:600;color:#c4b5fd;z-index:100;position:relative';

  const nomeAdv = _dadosDuelo.adversario_nome || 'adversário';
  faixa.innerHTML = `<span style="font-size:15px;flex-shrink:0">⚔️</span><span style="flex:1">Aguardando resposta de <strong>${nomeAdv}</strong></span><span id="faixa-duelo-timer" style="font-family:'Orbitron',monospace;font-size:12px;font-weight:700;color:#e9d5ff;flex-shrink:0;margin-right:8px"></span><button id="faixa-duelo-cancelar" style="background:rgba(124,92,252,.15);border:1px solid rgba(124,92,252,.4);color:#a78bfa;border-radius:8px;padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">✕ Cancelar</button>`;

  const topbar = document.querySelector('.topbar');
  if (topbar) topbar.insertAdjacentElement('afterend', faixa);
  else document.body.prepend(faixa);

  const _timerInterval = setInterval(() => {
    const rest = Math.max(0, _dadosDuelo.expira_em - Date.now());
    const m = Math.floor(rest / 60000);
    const s = Math.floor((rest % 60000) / 1000);
    const el = document.getElementById('faixa-duelo-timer');
    if (el) el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
    if (rest <= 0) {
      clearInterval(_timerInterval);
      sessionStorage.removeItem('sm_duelo_aguardando');
      faixa.remove();
    }
  }, 1000);

  document.getElementById('faixa-duelo-cancelar').addEventListener('click', async () => {
    clearInterval(_timerInterval);
    sessionStorage.removeItem('sm_duelo_aguardando');
    faixa.remove();
    try {
      const { db: _db } = await import('/js/firebase-config.js');
      const { ref: _ref, update: _update } =
        await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
      await _update(_ref(_db, `duelos/${_dadosDuelo.id}`), {
        status: 'expirado',
        cancelado_por: getSession()?.alunos?.[0] || '',
      });
    } catch(_) {}
  });
}

// ── Notificação de desafio: inicialização centralizada ────────
export async function iniciarNotifDueloGlobal() {
  const s = getSession();
  if (!s?.alunos?.[0] || !s?.turma) return;
  const uid = (s.turma + '_' + s.alunos[0]).replace(/[.#$[\]/\s]/g, '_');
  try {
    const { getPerfil } = await import('/js/db.js');
    const { iniciarNotifDuelo } = await import('/js/duelo_notif.js');
    const _p = await getPerfil(uid).catch(() => ({}));
    const apelido = _p?.apelido_ativo || s.alunos[0];
    if (_p?.duelos_disponivel !== false) iniciarNotifDuelo(uid, apelido);
  } catch(_) {}
}

// ── Badge de dupla reativo ───────────────────────────────────
export function atualizarBadgeDupla() {
  const badge = document.getElementById('sidebar-dupla-badge');
  if (!badge) return;
  const d = lerDuplaAtiva();
  if (d) {
    badge.style.display = 'block';
    badge.querySelector('.dupla-nome').textContent = `👥 Em dupla com ${d.nome}`;
    badge.querySelector('.dupla-sub').textContent  = `${d.turma} · só em Duelos`;
  } else {
    badge.style.display = 'none';
  }
}

// ── Verificação de sessão única ──────────────────────────────
export async function iniciarVerificacaoSessao(uid) {
  const s = getSession();
  if (!s?.session_token) return;
  const myToken = s.session_token;

  // Detectar novo login em outra aba do mesmo browser
  window.addEventListener('storage', (e) => {
    if (e.key === 'sm_login_broadcast' && e.newValue) {
      try {
        const broadcast = JSON.parse(e.newValue);
        if (broadcast.aluno === s.alunos?.[0]
            && broadcast.turma === s.turma
            && broadcast.token !== myToken) {
          clearSession();
          localStorage.removeItem('sm_dupla_duelo');
          window.location.href = '/index.html?motivo=novo_login';
        }
      } catch(_) {}
    }
  });

  const verificar = async () => {
    try {
      const { db } = await import('/js/firebase-config.js');
      const { ref, get } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
      const snap = await get(ref(db, `perfis/${uid}/session_token`));
      if (snap.val() && snap.val() !== myToken) {
        clearSession();
        localStorage.removeItem('sm_dupla_duelo');
        window.location.href = '/index.html?motivo=novo_login';
      }
    } catch(_) {}
  };
  setInterval(verificar, 5_000);
  await verificar();
}

// ── Timeout de inatividade ──────────────────────────────────
export function iniciarTimeoutInatividade(minutos = 5) {
  const MS = minutos * 60 * 1000;
  let _timer = null;
  const resetar = () => {
    clearTimeout(_timer);
    _timer = setTimeout(() => {
      clearSession();
      localStorage.removeItem('sm_dupla_duelo');
      window.location.href = '/index.html?motivo=inatividade';
    }, MS);
  };
  ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(ev => {
    document.addEventListener(ev, resetar, { passive: true });
  });
  resetar();
}

// ── Hash e geração de senha de aluno ─────────────────────────
export async function hashSenha(turma, nome, pin) {
  const data = new TextEncoder().encode(turma + '|' + nome + '|' + pin);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function gerarSenhaAleatoria() {
  return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
}

export function renderSidebarProfessor(containerId, activePage) {
  const nav = [
    { id:"dashboard",      href:"/professor/dashboard.html",      label:"Dashboard",      icon:`<path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>` },
    { id:"atividades",     href:"/professor/p-atividades.html",     label:"Atividades",     icon:`<path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/>` },
    { id:"torneio",        href:"/professor/p-torneio.html",        label:"Torneio",        icon:`<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>` },
    { id:"acomp_aval",    href:"/professor/acompanhamento_avaliacao.html", label:"Avaliação ao vivo", icon:`<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>` },
    { id:"ranking",        href:"/professor/p-ranking.html",        label:"Ranking",        icon:`<path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/>` },
    { id:"acompanhamento", href:"/professor/acompanhamento.html", label:"Acompanhamento", icon:`<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>` },
    { id:"notas",          href:"/professor/p-notas.html",          label:"Notas",           icon:`<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>` },
    { id:"relatorio",      href:"/professor/relatorio.html",      label:"Relatório",      icon:`<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>` },
  ];
  const navExtra = [
    { id:"vistos",       href:"/professor/p-vistos.html",     label:"Vistos de Caderno", icon:`<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7.5 12.5l1.4-1.4 1.6 1.6 4.6-4.6 1.4 1.4-6 6-3-3z"/>` },
    { id:"aulas",        href:"/professor/p-aulas.html",      label:"Diário de Aulas",   icon:`<path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H6V4h5v8l2.5-1.5L16 12V4h2v16z"/>` },
    { id:"conteudos",    href:"/professor/p-conteudos.html",  label:"Biblioteca",        icon:`<path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>` },
    { id:"mapeamento",   href:"/professor/mapeamento.html",   label:"Mapa de Sala",    icon:`<path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>` },
    { id:"historico",    href:"/professor/p-historico.html",    label:"Histórico Geral", icon:`<path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21L13 13.04V8h-1z"/>` },
    { id:"certificados", href:"/professor/p-certificados.html", label:"Certificados",     icon:`<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 13l-4-4 1.41-1.41L10 11.17l6.59-6.59L18 6l-8 8z"/>` },
    { id:"config",       href:"/professor/p-config.html",       label:"Configurações",   icon:`<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>` },
    { id:"robotica",     href:"/professor/p-robotica.html",     label:"Robótica",        icon:`<path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm6 0c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z"/>` },
  ];
  const navJogos = [
    { id:"jogos",     href:"/professor/tabuada.html",         label:"Tabuada",   icon:`<path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5S16.33 15 15.5 15zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 9 18.5 9s1.5.67 1.5 1.5S19.33 12 18.5 12z"/>` },
    { id:"jogos_neg", href:"/professor/jogos_negativos.html", label:"Negativos", icon:`<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>` },
    { id:"runner",    href:"/professor/p-runner.html",          label:"Runner",    icon:`<path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/>` },
  ];
  const navHtml   = nav.map(n => `<a class="nav-item${activePage===n.id?' active-blue':''}" href="${n.href}"><svg viewBox="0 0 24 24">${n.icon}</svg>${n.label}</a>`).join('');
  const extraHtml = navExtra.map(n => `<a class="nav-item${activePage===n.id?' active-blue':''}" href="${n.href}"><svg viewBox="0 0 24 24">${n.icon}</svg>${n.label}</a>`).join('');
  const jogosHtml = navJogos.map(n => `<a class="nav-item${activePage===n.id?' active-blue':''}" href="${n.href}"><svg viewBox="0 0 24 24">${n.icon}</svg>${n.label}</a>`).join('');
  document.getElementById(containerId).innerHTML = `
    <div class="sidebar-brand">
      <div class="brand-icon"><img src="/logo_fundotransparente.png" style="width:56px;height:56px;object-fit:contain;"></div>
      <div class="brand-title">Sistema de Matemática</div>
      <div class="brand-sub">Plataforma Educacional</div>
    </div>
    <div class="sidebar-user">
      <div class="role-badge professor"><svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>Professor</div>
      <div class="user-name">Área Administrativa<span>Acesso completo</span></div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-label">Navegação</div>
      ${navHtml}
      <div class="nav-divider"></div>
      ${extraHtml}
      <div class="nav-divider"></div>
      <div class="nav-label">🎮 Jogos</div>
      ${jogosHtml}
    </nav>
    <div class="sidebar-footer">
      <button class="btn-sair" onclick="sair()">
        <svg viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
        Sair
      </button>
    </div>`;
  setupMobileNav(containerId);
}

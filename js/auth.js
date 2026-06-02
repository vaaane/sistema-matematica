// ── Sessão em localStorage ───────────────────────────────────
export function getSession() {
  try { return JSON.parse(localStorage.getItem("sm_session") || "null"); } catch(e) { return null; }
}
export function setSession(data) {
  localStorage.setItem("sm_session", JSON.stringify(data));
}
export function clearSession() {
  localStorage.removeItem("sm_session");
  sessionStorage.removeItem("sm_jogo");
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
    { id:"atividades", href:"/aluno/atividades.html",  label:"Atividades", icon:`<path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/>` },
    { id:"historico",  href:"/aluno/historico.html",   label:"Histórico",  icon:`<path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21L13 13.04V8h-1z"/>` },
    { id:"ranking",    href:"/aluno/ranking.html",     label:"Ranking",    icon:`<path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/>` },
    { id:"jogos",      href:"/aluno/jogos.html",       label:"Jogos",      icon:`<path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5S16.33 15 15.5 15zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 9 18.5 9s1.5.67 1.5 1.5S19.33 12 18.5 12z"/>` },
    { id:"config",     href:"/aluno/config.html",      label:"Configurações", icon:`<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>` },
  ];
  if (localStorage.getItem('sm_pref_robotica') === '1') {
    nav.push({ divider: true });
    nav.push({ id:"robotica", href:"/aluno/robotica.html", label:"🤖 Robótica", icon:`<path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm6 0c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z"/>` });
  }
  const userHtml = alunos.map((a,i) => `<div class="user-name">${a}<span>Aluno${alunos.length>1?' '+(i+1):''}</span></div>`).join('');
  const navHtml  = nav.map(n => n.divider
    ? '<div class="nav-divider"></div>'
    : `<a class="nav-item${activePage===n.id?' active-orange':''}" href="${n.href}"><svg viewBox="0 0 24 24">${n.icon}</svg>${n.label}</a>`
  ).join('');
  document.getElementById(containerId).innerHTML = `
    <div class="sidebar-brand">
      <div class="brand-icon"><svg viewBox="0 0 24 24"><path d="M19 3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-3.5-7H7v-1.5h2.5l3 6 2-4H17V12h-2l-3 5z"/></svg></div>
      <div class="brand-title">Sistema de Matemática</div>
      <div class="brand-sub">Plataforma Educacional</div>
    </div>
    <div class="sidebar-user">
      <div class="role-badge aluno"><svg viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18V17h2v-4.82L9 13.36V17c0 1.1 1.35 2 3 2s3-.9 3-2v-3.64l2-1.09V17h2v-5.82L23 9 12 3z"/></svg>Turma ${turma}</div>
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
    { id:"atividades",     href:"/professor/atividades.html",     label:"Atividades",     icon:`<path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/>` },
    { id:"acomp_aval",    href:"/professor/acompanhamento_avaliacao.html", label:"Avaliação ao vivo", icon:`<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>` },
    { id:"ranking",        href:"/professor/ranking.html",        label:"Ranking",        icon:`<path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/>` },
    { id:"acompanhamento", href:"/professor/acompanhamento.html", label:"Acompanhamento", icon:`<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>` },
    { id:"relatorio",      href:"/professor/relatorio.html",      label:"Relatório",      icon:`<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>` },
  ];
  const navExtra = [
    { id:"historico",    href:"/professor/historico.html",    label:"Histórico Geral", icon:`<path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21L13 13.04V8h-1z"/>` },
    { id:"config",       href:"/professor/config.html",       label:"Configurações",   icon:`<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>` },
    { id:"robotica",     href:"/professor/robotica.html",     label:"Robótica",        icon:`<path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm6 0c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z"/>` },
  ];
  const navJogos = [
    { id:"jogos",             href:"/professor/jogos.html",             label:"Jogar · Tabuada",     icon:`<path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5S16.33 15 15.5 15zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 9 18.5 9s1.5.67 1.5 1.5S19.33 12 18.5 12z"/>` },
    { id:"tabuada_relatorio", href:"/professor/tabuada_relatorio.html", label:"Tabuada · Relatório", icon:`<path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5S16.33 15 15.5 15zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 9 18.5 9s1.5.67 1.5 1.5S19.33 12 18.5 12z"/>` },
    { id:"analytics",         href:"/professor/analytics.html",         label:"Tabuada · Analytics", icon:`<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>` },
  ];
  const navHtml   = nav.map(n => `<a class="nav-item${activePage===n.id?' active-blue':''}" href="${n.href}"><svg viewBox="0 0 24 24">${n.icon}</svg>${n.label}</a>`).join('');
  const extraHtml = navExtra.map(n => `<a class="nav-item${activePage===n.id?' active-blue':''}" href="${n.href}"><svg viewBox="0 0 24 24">${n.icon}</svg>${n.label}</a>`).join('');
  const jogosHtml = navJogos.map(n => `<a class="nav-item${activePage===n.id?' active-blue':''}" href="${n.href}"><svg viewBox="0 0 24 24">${n.icon}</svg>${n.label}</a>`).join('');
  document.getElementById(containerId).innerHTML = `
    <div class="sidebar-brand">
      <div class="brand-icon"><svg viewBox="0 0 24 24"><path d="M19 3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-3.5-7H7v-1.5h2.5l3 6 2-4H17V12h-2l-3 5z"/></svg></div>
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

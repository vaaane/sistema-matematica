import { db } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const POS_BG = [
  'linear-gradient(135deg,#F59E0B,#D97706)',
  'linear-gradient(135deg,#9CA3AF,#6B7280)',
  'linear-gradient(135deg,#CD853F,#92400E)',
];

function buildTop3(snap) {
  const best = {};
  snap.forEach(child => {
    const v = child.val();
    if (!v.concluido || !v.aluno) return;
    if (!best[v.aluno]) best[v.aluno] = { aluno: v.aluno, turma: v.turma || '?', porAtiv: {} };
    const pts = v.pontuacao || 0;
    if (pts > (best[v.aluno].porAtiv[v.atividade] || 0))
      best[v.aluno].porAtiv[v.atividade] = pts;
  });
  return Object.values(best)
    .map(a => ({
      aluno: a.aluno, turma: a.turma,
      total: Object.values(a.porAtiv).reduce((s, v) => s + v, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);
}

function getEvents(prev, cur) {
  if (!prev) return [];
  const pm = Object.fromEntries(prev.map((p, i) => [p.aluno, i]));
  const cm = Object.fromEntries(cur.map((p, i) => [p.aluno, i]));
  const events = [];
  for (const p of cur) {
    const cp = cm[p.aluno];
    if (pm[p.aluno] === undefined) {
      events.push(cp === 0
        ? { tipo: 'lider',  aluno: p.aluno, pos: 1, turma: p.turma }
        : { tipo: 'entrou', aluno: p.aluno, pos: cp + 1, turma: p.turma });
    } else if (cp === 0 && pm[p.aluno] !== 0) {
      events.push({ tipo: 'lider', aluno: p.aluno, pos: 1, turma: p.turma });
    }
  }
  return events;
}

function fmtEv(ev) {
  const medals = ['🥇', '🥈', '🥉'];
  if (ev.tipo === 'lider')
    return { icon: '🥇', bg: POS_BG[0], msg: `${ev.aluno} assumiu o 1º lugar! (Turma ${ev.turma})` };
  if (ev.tipo === 'entrou')
    return { icon: medals[ev.pos - 1] || '🏅', bg: POS_BG[ev.pos - 1] || POS_BG[2], msg: `${ev.aluno} entrou no top 3! (Turma ${ev.turma})` };
  return null;
}

function ensureCSS() {
  if (document.getElementById('topnotif-css')) return;
  const s = document.createElement('style');
  s.id = 'topnotif-css';
  s.textContent = `
.tn-wrap{position:fixed;top:72px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:340px;}
.tn-toast{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.28);cursor:pointer;pointer-events:all;transform:translateX(380px);transition:transform .35s cubic-bezier(.22,1,.36,1),opacity .35s;opacity:0;}
.tn-toast.tn-in{transform:translateX(0);opacity:1;}
.tn-toast.tn-out{transform:translateX(380px);opacity:0;}
.tn-ti{font-size:22px;flex-shrink:0;}
.tn-tm{font-size:13px;font-weight:700;color:#fff;flex:1;line-height:1.3;}
.tn-tx{font-size:14px;color:rgba(255,255,255,.8);flex-shrink:0;padding:0 4px;line-height:1;}
.tn-banner{position:fixed;top:0;left:0;right:0;z-index:9999;display:flex;align-items:center;justify-content:center;gap:10px;padding:12px 18px;font-size:15px;font-weight:800;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.25);transform:translateY(-100%);opacity:0;transition:transform .3s cubic-bezier(.22,1,.36,1),opacity .3s;pointer-events:none;letter-spacing:.01em;}
.tn-banner.tn-in{transform:translateY(0);opacity:1;}
.tn-hr{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px;cursor:pointer;}
.tn-hr:last-child{border-bottom:none;}
.tn-hr:hover{opacity:.75;}
.tn-hi{font-size:15px;flex-shrink:0;}
.tn-hm{flex:1;font-weight:600;line-height:1.3;}
.tn-ht{font-size:10px;color:var(--text-muted);flex-shrink:0;white-space:nowrap;}
.tn-tv-banner{position:fixed;top:64px;left:50%;transform:translateX(-50%) translateY(-20px);z-index:9999;background:linear-gradient(135deg,rgba(250,184,0,.18),rgba(250,184,0,.06));border:2px solid rgba(250,184,0,.5);border-radius:14px;padding:12px 40px;font-family:'Orbitron',monospace;font-size:17px;font-weight:900;color:#FFD700;letter-spacing:2px;text-align:center;box-shadow:0 0 60px rgba(250,184,0,.12);opacity:0;transition:opacity .4s,transform .4s;pointer-events:none;white-space:nowrap;}
.tn-tv-banner.tn-in{opacity:1;transform:translateX(-50%) translateY(0);}
.tn-confetti-wrap{position:fixed;top:0;left:50%;pointer-events:none;z-index:9998;width:0;height:0;}
.tn-cp{position:absolute;width:10px;height:10px;border-radius:2px;animation:tn-fall var(--dur,2s) var(--delay,0s) ease-in both;}
@keyframes tn-fall{0%{transform:translateX(var(--cx,0px)) translateY(-10px) rotate(0deg);opacity:1}100%{transform:translateX(var(--cx,0px)) translateY(100vh) rotate(720deg);opacity:0}}
@media(max-width:560px){.tn-wrap{right:8px;left:8px;max-width:unset;}.tn-toast{max-width:100%;}}
  `;
  document.head.appendChild(s);
}

function showConfetti() {
  ensureCSS();
  const wrap = document.createElement('div');
  wrap.className = 'tn-confetti-wrap';
  const colors = ['#F59E0B','#3B82F6','#EF4444','#22C55E','#8B5CF6','#EC4899','#FFD700','#FF6B6B'];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.className = 'tn-cp';
    const cx = (Math.random() - 0.5) * 360;
    const dur = (1.8 + Math.random() * 1.4).toFixed(2);
    const delay = (Math.random() * 0.7).toFixed(2);
    p.style.cssText = `background:${colors[i % colors.length]};--cx:${cx}px;--dur:${dur}s;--delay:${delay}s`;
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 4500);
}

export function initTopNotif({ mode = 'aluno', historyEl = null, alunoNome = null } = {}) {
  ensureCSS();

  let prevTop3 = null;
  const hist = [];

  // ── Professor: floating toast ──────────────────────────────
  let toastWrap = null;
  if (mode === 'professor') {
    toastWrap = document.createElement('div');
    toastWrap.className = 'tn-wrap';
    document.body.appendChild(toastWrap);
  }

  // ── Aluno: full-width banner ───────────────────────────────
  let bannerEl = null, bannerTimer = null;
  if (mode === 'aluno') {
    bannerEl = document.createElement('div');
    bannerEl.className = 'tn-banner';
    document.body.appendChild(bannerEl);
  }

  // ── TV: compact overlay banner ─────────────────────────────
  let tvBannerEl = null, tvBannerTimer = null;
  if (mode === 'tv') {
    tvBannerEl = document.createElement('div');
    tvBannerEl.className = 'tn-tv-banner';
    document.body.appendChild(tvBannerEl);
  }

  function renderHist() {
    if (!historyEl) return;
    if (!hist.length) {
      historyEl.innerHTML = '<p style="font-size:12px;color:var(--text-muted);padding:6px 0">Nenhuma notificação recente.</p>';
      return;
    }
    const now = Date.now();
    historyEl.innerHTML = hist.map(h => {
      const sec = Math.floor((now - h.ts) / 1000);
      const ago = sec < 60 ? 'agora' : sec < 3600 ? `${Math.floor(sec / 60)}min` : `${Math.floor(sec / 3600)}h`;
      const href = h.aluno ? `/professor/acompanhamento.html?aluno=${encodeURIComponent(h.aluno)}` : '#';
      return `<div class="tn-hr" onclick="window.location.href='${href}'">
        <span class="tn-hi">${h.icon}</span>
        <span class="tn-hm">${h.msg}</span>
        <span class="tn-ht">${ago}</span>
      </div>`;
    }).join('');
  }

  function showToast(fmt, aluno) {
    const t = document.createElement('div');
    t.className = 'tn-toast';
    t.style.background = fmt.bg;
    t.innerHTML = `<span class="tn-ti">${fmt.icon}</span><span class="tn-tm">${fmt.msg}</span><span class="tn-tx" onclick="this.closest('.tn-toast').remove()">✕</span>`;
    t.addEventListener('click', e => {
      if (e.target.classList.contains('tn-tx')) return;
      window.location.href = `/professor/acompanhamento.html?aluno=${encodeURIComponent(aluno || '')}`;
    });
    toastWrap.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('tn-in')));
    setTimeout(() => {
      t.classList.remove('tn-in'); t.classList.add('tn-out');
      setTimeout(() => t.remove(), 400);
    }, 5000);
  }

  function showBanner(fmt) {
    if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null; }
    bannerEl.style.background = fmt.bg;
    bannerEl.innerHTML = `<span style="font-size:26px">${fmt.icon}</span><span>${fmt.msg}</span>`;
    bannerEl.classList.remove('tn-in');
    void bannerEl.offsetWidth;
    bannerEl.classList.add('tn-in');
    bannerTimer = setTimeout(() => {
      bannerEl.classList.remove('tn-in');
      bannerTimer = null;
    }, 4000);
  }

  function showTvBanner() {
    if (tvBannerTimer) { clearTimeout(tvBannerTimer); tvBannerTimer = null; }
    tvBannerEl.textContent = '🏆 MUDANÇA NO PÓDIO!';
    tvBannerEl.classList.remove('tn-in');
    void tvBannerEl.offsetWidth;
    tvBannerEl.classList.add('tn-in');
    tvBannerTimer = setTimeout(() => {
      tvBannerEl.classList.remove('tn-in');
      tvBannerTimer = null;
    }, 8000);
  }

  renderHist();

  const unsub = onValue(ref(db, 'resultados'), snap => {
    const cur = buildTop3(snap);
    const events = getEvents(prevTop3, cur);
    prevTop3 = cur;
    for (const ev of events) {
      const fmt = fmtEv(ev);
      if (!fmt) continue;
      hist.unshift({ ...fmt, aluno: ev.aluno, ts: Date.now() });
      if (hist.length > 10) hist.pop();
      if (mode === 'professor') { showToast(fmt, ev.aluno); renderHist(); }
      else if (mode === 'aluno') {
        showBanner(fmt);
        if (alunoNome && ev.aluno === alunoNome) showConfetti();
      }
      else if (mode === 'tv') showTvBanner();
    }
  });

  window.addEventListener('beforeunload', unsub);
  return unsub;
}

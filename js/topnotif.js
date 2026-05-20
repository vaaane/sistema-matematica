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
    const pts = v.pontuacao_bruta || v.pontuacao || 0;
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

// Returns change events between two top-3 snapshots.
// Skips on first call (prev===null) to avoid flooding on page load.
function getEvents(prev, cur) {
  if (!prev) return [];
  const pm = Object.fromEntries(prev.map((p, i) => [p.aluno, i])); // 0-indexed
  const cm = Object.fromEntries(cur.map((p, i) => [p.aluno, i]));
  const events = [];
  for (const p of cur) {
    const cp = cm[p.aluno];
    if (pm[p.aluno] === undefined) {
      // Entered top 3 fresh — either took 1st or entered at 2nd/3rd
      events.push(cp === 0
        ? { tipo: 'lider',  aluno: p.aluno, pos: 1, turma: p.turma }
        : { tipo: 'entrou', aluno: p.aluno, pos: cp + 1, turma: p.turma });
    } else if (cp === 0 && pm[p.aluno] !== 0) {
      // Was already in top 3, climbed to 1st
      events.push({ tipo: 'lider', aluno: p.aluno, pos: 1, turma: p.turma });
    }
  }
  for (const p of prev) {
    if (cm[p.aluno] === undefined)
      events.push({ tipo: 'saiu', aluno: p.aluno });
  }
  return events;
}

function fmtEv(ev) {
  const medals = ['🥇', '🥈', '🥉'];
  if (ev.tipo === 'lider')
    return { icon: '🥇', bg: POS_BG[0], msg: `${ev.aluno} assumiu o 1º lugar! (Turma ${ev.turma})` };
  if (ev.tipo === 'entrou')
    return { icon: medals[ev.pos - 1] || '🏅', bg: POS_BG[ev.pos - 1] || POS_BG[2], msg: `${ev.aluno} entrou no top 3! (Turma ${ev.turma})` };
  if (ev.tipo === 'saiu')
    return { icon: '⚠️', bg: 'linear-gradient(135deg,#6B7280,#4B5563)', msg: `${ev.aluno} saiu do top 3` };
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
@media(max-width:560px){.tn-wrap{right:8px;left:8px;max-width:unset;}.tn-toast{max-width:100%;}}
  `;
  document.head.appendChild(s);
}

export function initTopNotif({ mode = 'aluno', historyEl = null } = {}) {
  ensureCSS();

  let prevTop3 = null;
  const hist = []; // last 10 events

  // ── Professor: floating toast container ───────────────────────
  let toastWrap = null;
  if (mode === 'professor') {
    toastWrap = document.createElement('div');
    toastWrap.className = 'tn-wrap';
    document.body.appendChild(toastWrap);
  }

  // ── Aluno: full-width banner ──────────────────────────────────
  let bannerEl = null, bannerTimer = null;
  if (mode === 'aluno') {
    bannerEl = document.createElement('div');
    bannerEl.className = 'tn-banner';
    document.body.appendChild(bannerEl);
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
    // Double rAF ensures the initial translateX(380px) is painted before transition fires
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
    void bannerEl.offsetWidth; // force reflow to restart transition
    bannerEl.classList.add('tn-in');
    bannerTimer = setTimeout(() => {
      bannerEl.classList.remove('tn-in');
      bannerTimer = null;
    }, 4000);
  }

  renderHist(); // Initialize history panel with empty state

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
      else showBanner(fmt);
    }
  });

  window.addEventListener('beforeunload', unsub);
  return unsub;
}

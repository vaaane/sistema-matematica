// Banner persistente de Avaliação+ ativa — aparece em todas as telas do aluno
import { db } from "/js/firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getLiberadasParaTurma } from "/js/db.js";

const DURACAO_MS    = 25 * 60 * 1000;
const MIN_TENT_MS   = 8  * 60 * 1000;
const MAX_TENT      = 3;
const WARN_RED_MS   = 9  * 60 * 1000;
const WARN_YEL_MS   = 10 * 60 * 1000; // amarelo ao chegar em 10 min restantes

function avKey(s) {
  return btoa(unescape(encodeURIComponent(s))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}

export async function initAvBanner(turma, aluno, liberadasJaObtidas) {
  // Skip if already on the avaliacao page
  if (window.location.pathname.includes('avaliacao_plus')) return;

  const liberadas = liberadasJaObtidas ?? await getLiberadasParaTurma(turma);
  const avLibs = liberadas.filter(l => l.modo === 'avaliacao_plus' && l.status !== 'encerrada');
  if (!avLibs.length) return;

  // Find first active controle for this student
  let activeCtrl = null, activeAtiv = null;

  for (const lib of avLibs) {
    const ctrlRef = ref(db, `avaliacao_controle/${avKey(turma+'|'+lib.atividade)}/${avKey(aluno)}`);
    await new Promise(resolve => {
      const unsub = onValue(ctrlRef, snap => {
        unsub();
        if (snap.exists()) {
          const ctrl = snap.val();
          const gRest = DURACAO_MS - (Date.now() - ctrl.inicio_global);
          if (gRest > 0 && (ctrl.tentativas_realizadas || 0) < MAX_TENT) {
            activeCtrl = ctrl;
            activeAtiv = lib.atividade;
          }
        }
        resolve();
      }, { onlyOnce: true });
    });
    if (activeCtrl) break;
  }

  if (!activeCtrl) return;

  // ── Criar banner ───────────────────────────────────────────
  let banner = document.createElement('div');
  banner.id = 'av-global-banner';
  banner.style.cssText = [
    'position:fixed;bottom:0;left:0;right:0;z-index:9000',
    'display:flex;align-items:center;gap:12px',
    'padding:9px 16px 9px 18px',
    "font-family:'Inter',sans-serif;font-size:13px;font-weight:600;color:#fff",
    'box-shadow:0 -3px 16px rgba(0,0,0,.22)',
    'transition:background .4s ease',
  ].join(';');
  document.body.appendChild(banner);

  // Garante que conteúdo não fique atrás do banner
  const mainEl = document.querySelector('.main') || document.querySelector('.content');
  if (mainEl) mainEl.style.paddingBottom = '64px';

  let tickInterval = null;
  let unsub = null;
  let warned10 = false;

  function beepBanner(freq, dur) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.frequency.value = freq;
      g.gain.setValueAtTime(.18, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + dur/1000);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur/1000);
    } catch(e) {}
  }

  function remover() {
    if (banner) { banner.remove(); banner = null; }
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
    if (unsub) { unsub(); unsub = null; }
    if (mainEl) mainEl.style.paddingBottom = '';
  }

  function atualizar() {
    if (!banner || !activeCtrl) return;
    const gRestMs        = Math.max(0, DURACAO_MS - (Date.now() - activeCtrl.inicio_global));
    const tentUsadas     = activeCtrl.tentativas_realizadas || 0;
    const tentRestantes  = MAX_TENT - tentUsadas;

    if (gRestMs <= 0 || tentRestantes <= 0) { remover(); return; }

    // Alerta de 10 minutos (dispara uma vez)
    if (!warned10 && gRestMs <= WARN_YEL_MS && gRestMs > 0) {
      warned10 = true;
      beepBanner(900, 120); setTimeout(() => beepBanner(700, 120), 220); setTimeout(() => beepBanner(500, 200), 440);
      const toast = document.createElement('div');
      toast.style.cssText = [
        'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);z-index:9500',
        'background:#92400E;border:1.5px solid #F59E0B;border-radius:10px',
        'padding:10px 18px;font-family:"Inter",sans-serif;font-size:13px;font-weight:700',
        'color:#FEF3C7;box-shadow:0 4px 20px rgba(0,0,0,.5);text-align:center;white-space:nowrap',
      ].join(';');
      toast.textContent = '⚠️ 10 minutos restantes — última tentativa completa possível';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 8000);
    }

    const totalS = Math.ceil(gRestMs / 1000);
    const mins   = Math.floor(totalS / 60);
    const secs   = totalS % 60;
    const tempoStr = `${mins}min${secs > 0 ? ` ${String(secs).padStart(2,'0')}s` : ''}`;
    const pct    = (gRestMs / DURACAO_MS * 100).toFixed(1);

    let bgColor, barColor, pulso;
    if (gRestMs <= WARN_RED_MS) {
      bgColor  = '#DC2626';
      barColor = '#FCA5A5';
      pulso    = 'animation:av-banner-pulso 1.2s ease infinite';
    } else if (gRestMs <= WARN_YEL_MS) {
      bgColor  = '#D97706';
      barColor = '#FCD34D';
      pulso    = '';
    } else {
      bgColor  = '#16A34A';
      barColor = '#86EFAC';
      pulso    = '';
    }

    banner.style.background = bgColor;
    banner.style.cssText += `;${pulso}`;
    banner.innerHTML = `
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;line-height:1.3">
          <span>📝 <strong>${activeAtiv}</strong></span>
          <span style="opacity:.25">|</span>
          <span>⏱ <strong>${tempoStr}</strong></span>
          <span style="opacity:.25">|</span>
          <span><strong>${tentRestantes}</strong> tentativa${tentRestantes !== 1 ? 's' : ''} restante${tentRestantes !== 1 ? 's' : ''}</span>
        </div>
        <div style="margin-top:5px;height:3px;background:rgba(255,255,255,.2);border-radius:2px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${barColor};border-radius:2px;transition:width 1s linear"></div>
        </div>
      </div>
      <a href="/aluno/avaliacao_plus.html?ativ=${encodeURIComponent(activeAtiv)}"
         style="flex-shrink:0;background:rgba(255,255,255,.18);border:1.5px solid rgba(255,255,255,.4);
                border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;color:#fff;
                text-decoration:none;white-space:nowrap">
        Abrir →
      </a>`;
  }

  // Animação de pulso para vermelho
  if (!document.getElementById('av-banner-style')) {
    const s = document.createElement('style');
    s.id = 'av-banner-style';
    s.textContent = `@keyframes av-banner-pulso{0%,100%{opacity:1}50%{opacity:.82}}`;
    document.head.appendChild(s);
  }

  // Listener em tempo real para tentativas (muda quando o aluno conclui uma tentativa)
  const activeRef = ref(db, `avaliacao_controle/${avKey(turma+'|'+activeAtiv)}/${avKey(aluno)}`);
  unsub = onValue(activeRef, snap => {
    if (!snap.exists()) { remover(); return; }
    activeCtrl = snap.val();
    const gRest = DURACAO_MS - (Date.now() - activeCtrl.inicio_global);
    if (gRest <= 0 || (activeCtrl.tentativas_realizadas || 0) >= MAX_TENT) { remover(); return; }
    atualizar();
  });

  atualizar();
  tickInterval = setInterval(atualizar, 1000);
}

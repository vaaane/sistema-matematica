import { db } from '/js/firebase-config.js';
import { ref, onValue, update, get } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

/**
 * Inicializa o listener de desafios em qualquer página do aluno.
 * Mostra um banner flutuante quando receber um desafio.
 * @param {string} uid
 * @param {string} apelido
 */
export function iniciarNotifDuelo(uid, apelido) {
  if (!document.getElementById('duelo-notif-style')) {
    const style = document.createElement('style');
    style.id = 'duelo-notif-style';
    style.textContent = `
      .duelo-notif-banner {
        position: fixed; bottom: 20px; right: 20px; z-index: 9999;
        background: #151828;
        border: 1px solid rgba(239,68,68,.5);
        border-radius: 16px;
        padding: 16px 18px;
        box-shadow: 0 8px 32px rgba(239,68,68,.2);
        display: flex; align-items: center; gap: 14px;
        max-width: 360px; width: calc(100vw - 40px);
        animation: slideInRight .35s cubic-bezier(.4,0,.2,1);
        font-family: 'Segoe UI', system-ui, sans-serif;
        color: #e8eaf0;
      }
      @keyframes slideInRight {
        from { opacity:0; transform:translateX(30px); }
        to   { opacity:1; transform:translateX(0); }
      }
      .dnb-info { flex:1; min-width:0; }
      .dnb-title { font-size:13px; font-weight:800; margin-bottom:3px; }
      .dnb-title span { color:#ef4444; }
      .dnb-sub { font-size:11px; color:#6b7280; }
      .dnb-timer { font-size:20px; font-weight:900; color:#ef4444;
                   font-variant-numeric:tabular-nums; min-width:36px; text-align:center; }
      .dnb-btns { display:flex; gap:7px; flex-direction:column; }
      .dnb-aceitar {
        padding:7px 14px; border-radius:8px; border:none;
        background:#22c55e; color:#fff; font-size:12px; font-weight:800;
        cursor:pointer; white-space:nowrap;
      }
      .dnb-recusar {
        padding:7px 12px; border-radius:8px;
        border:1px solid rgba(255,255,255,.1);
        background:transparent; color:#6b7280; font-size:11px;
        font-weight:600; cursor:pointer;
      }
    `;
    document.head.appendChild(style);
  }

  if (!document.getElementById('duelo-notif-container')) {
    const container = document.createElement('div');
    container.id = 'duelo-notif-container';
    container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;align-items:flex-end;pointer-events:none;';
    document.body.appendChild(container);
  }

  const vistos = new Set();

  onValue(ref(db, 'duelos'), snap => {
    const agora = Date.now();
    snap.forEach(child => {
      const d  = child.val();
      const id = child.key;
      if (vistos.has(id)) return;
      if (d.status !== 'aguardando') return;
      if (d.criador_uid === uid) return;
      if (d.expira_em < agora) return;
      if (d.tipo === 'direto' && d.adversario_uid !== uid) return;

      vistos.add(id);
      mostrarBanner(id, d, uid);
    });
  });
}

function mostrarBanner(id, duelo, uid) {
  const container = document.getElementById('duelo-notif-container');
  if (!container) return;

  const DIFF_LABEL = { facil:'🟢 Fácil · 3 min', medio:'🟡 Médio · 4 min', dificil:'🔴 Difícil · 5 min' };

  const banner = document.createElement('div');
  banner.className = 'duelo-notif-banner';
  banner.id = `dnb-${id}`;
  banner.style.pointerEvents = 'auto';
  banner.innerHTML = `
    <div class="dnb-info">
      <div class="dnb-title"><span>${escapeHtml(duelo.criador_nome)}</span> te desafiou!</div>
      <div class="dnb-sub">${DIFF_LABEL[duelo.dificuldade] || duelo.dificuldade}</div>
    </div>
    <div class="dnb-timer" id="dnb-timer-${id}"></div>
    <div class="dnb-btns">
      <button class="dnb-aceitar" onclick="aceitarDueloBanner('${id}')">⚔️ Aceitar</button>
      <button class="dnb-recusar" onclick="recusarDueloBanner('${id}')">Recusar</button>
    </div>
  `;
  container.appendChild(banner);

  const interval = setInterval(() => {
    const rest = Math.max(0, duelo.expira_em - Date.now());
    const m = Math.floor(rest / 60000);
    const s = Math.floor((rest % 60000) / 1000);
    const el = document.getElementById(`dnb-timer-${id}`);
    if (el) el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
    if (rest <= 0) {
      clearInterval(interval);
      banner.remove();
    }
  }, 1000);

  banner._interval = interval;
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

window.aceitarDueloBanner = async function(id) {
  const banner = document.getElementById(`dnb-${id}`);

  const { runTransaction, ref: fbRef } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
  const { db: fbDb } = await import('/js/firebase-config.js');

  const sess = JSON.parse(
    sessionStorage.getItem('sm_session') ||
    localStorage.getItem('sm_session') || '{}'
  );
  const { alunos = [], turma = '' } = sess;
  const uid     = (turma + '_' + alunos[0]).replace(/[.#$[\]/\s]/g, '_');
  const apelido = alunos[0];

  try {
    const dueloRef = fbRef(fbDb, `duelos/${id}`);
    const result   = await runTransaction(dueloRef, (duelo) => {
      if (!duelo) return;
      if (duelo.status !== 'aguardando') return;
      duelo.status          = 'em_jogo';
      duelo.adversario_uid  = uid;
      duelo.adversario_nome = apelido;
      duelo.ts_aceito       = Date.now();
      return duelo;
    });

    if (!result.committed) {
      if (banner) { clearInterval(banner._interval); banner.remove(); }
      const t = document.createElement('div');
      t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1c2035;border:1px solid rgba(239,68,68,.4);color:#e8eaf0;padding:9px 16px;border-radius:10px;font-size:12px;font-weight:600;z-index:9999;white-space:nowrap';
      t.textContent = '⚡ Desafio já aceito por outro aluno!';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 3000);
      return;
    }

    if (banner) { clearInterval(banner._interval); banner.remove(); }
    const { atualizarPresenca } = await import('/js/presenca.js');
    await atualizarPresenca({ em_duelo: true, status: 'ocupado' });
    window.location.href = `/aluno/duelo_partida.html?id=${id}`;

  } catch(e) {
    console.error('[Aceitar banner]', e);
  }
};

window.recusarDueloBanner = async function(id) {
  const banner = document.getElementById(`dnb-${id}`);
  if (banner) { clearInterval(banner._interval); banner.remove(); }

  try {
    const [{ update, get, ref: fbRef }, { db: fbDb }] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js'),
      import('/js/firebase-config.js'),
    ]);
    const snap = await get(fbRef(fbDb, `duelos/${id}`));
    if (snap.exists() && snap.val().tipo === 'direto') {
      await update(fbRef(fbDb, `duelos/${id}`), { status: 'recusado' });
    }
  } catch(e) { console.warn('[Recusa duelo]', e); }
};

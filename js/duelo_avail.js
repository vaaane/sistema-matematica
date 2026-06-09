import { db } from '/js/firebase-config.js';
import { ref, get, update } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

let _disponivel = true;
let _uid        = null;

export async function initDueloAvail(uid) {
  _uid = uid;
  const snap = await get(ref(db, `perfis/${uid}/duelos_disponivel`));
  _disponivel = snap.val() !== false;
  renderToggle();
}

export async function toggleDueloDisp() {
  if (!_uid) return;
  _disponivel = !_disponivel;
  renderToggle();

  await update(ref(db, `perfis/${_uid}`), {
    duelos_disponivel: _disponivel,
  });

  try {
    const { atualizarPresenca } = await import('/js/presenca.js');
    await atualizarPresenca({
      status: _disponivel ? 'disponivel' : 'indisponivel',
    });
  } catch(e) {}
}

export async function forcarIndisponivel() {
  try {
    const { atualizarPresenca } = await import('/js/presenca.js');
    await atualizarPresenca({ status: 'indisponivel' });
  } catch(e) {}
}

function renderToggle() {
  const dot  = document.getElementById('duelo-avail-dot');
  const wrap = document.getElementById('duelo-avail-toggle');
  if (!dot || !wrap) return;

  if (_disponivel) {
    dot.style.background   = '#22c55e';
    dot.style.boxShadow    = '0 0 5px #22c55e';
    wrap.style.borderColor = 'rgba(34,197,94,.4)';
    wrap.title             = 'Disponível para duelos — clique para desativar';
  } else {
    dot.style.background   = '#6b7280';
    dot.style.boxShadow    = 'none';
    wrap.style.borderColor = 'var(--border)';
    wrap.title             = 'Indisponível para duelos — clique para ativar';
  }
}

export function estaDisponivel() { return _disponivel; }

window.toggleDueloDisp = toggleDueloDisp;

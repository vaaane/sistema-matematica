// ─────────────────────────────────────────────────────────────
// Seletor de bimestre reutilizável (pílulas 1º 2º 3º 4º)
//
// Uso simples (recarrega a página com ?bim=N ao trocar):
//   import { montarSeletorBimestre } from '/js/bimestre-seletor.js';
//   const bim = montarSeletorBimestre('bimTabs');   // devolve o bimestre selecionado
//
// Uso com callback (sem recarregar — a página re-renderiza sozinha):
//   montarSeletorBimestre('bimTabs', { onChange: (b) => recarregarDados(b) });
//
// Opções:
//   min          menor bimestre exibido (default 1)
//   max          maior bimestre exibido (default: bimestre atual)
//   mostrarTodos se true, mostra 1..4 fixos; senão 1..atual (default false)
//   onChange     callback(bim). Se ausente, recarrega via ?bim=
//   param        nome do parâmetro na URL (default 'bim')
// ─────────────────────────────────────────────────────────────
import { bimestreAtual } from '/js/constants.js';

// injeta o CSS uma vez (mesmo visual das pílulas de Jogos/Minhas Aulas)
function injetarCSS() {
  if (document.getElementById('bim-seletor-css')) return;
  const st = document.createElement('style');
  st.id = 'bim-seletor-css';
  st.textContent = `
    .bim-tabs{display:flex;gap:5px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:3px;flex-wrap:wrap}
    .bim-tab{padding:6px 13px;border-radius:7px;font-size:13px;font-weight:700;color:var(--text-muted,#8a8aa8);cursor:pointer;border:none;background:transparent;font-family:'Inter',sans-serif;transition:.15s}
    .bim-tab:hover:not(.active){background:rgba(255,255,255,.06);color:var(--text,#e8eaf6)}
    .bim-tab.active{background:var(--purple,#7c5cfc);color:#fff}
    @media(max-width:520px){ .bim-tab{padding:6px 11px;font-size:12.5px} }
  `;
  document.head.appendChild(st);
}

export function bimestreSelecionado(param = 'bim') {
  const n = parseInt(new URLSearchParams(location.search).get(param), 10);
  return (n >= 1 && n <= 4) ? n : bimestreAtual();
}

export function montarSeletorBimestre(elOuId, opts = {}) {
  injetarCSS();
  const el = typeof elOuId === 'string' ? document.getElementById(elOuId) : elOuId;
  const param = opts.param || 'bim';
  const atual = bimestreAtual();
  const sel = opts.selecionado || bimestreSelecionado(param);

  // lista de bimestres a exibir: explícita (opts.bimestres) ou intervalo min..max
  let lista;
  if (Array.isArray(opts.bimestres) && opts.bimestres.length) {
    lista = opts.bimestres.slice().sort((a, b) => a - b);
  } else {
    const min = opts.min || 1;
    const max = opts.mostrarTodos ? 4 : (opts.max || atual);
    lista = [];
    for (let b = min; b <= max; b++) lista.push(b);
  }

  if (!el) return sel;

  el.classList.add('bim-tabs');
  el.innerHTML = lista
    .map(b => `<button class="bim-tab ${b === sel ? 'active' : ''}" data-b="${b}">${b}º</button>`)
    .join('');

  el.querySelectorAll('.bim-tab').forEach(bt => {
    bt.onclick = () => {
      const b = parseInt(bt.dataset.b, 10);
      if (b === sel) return;
      if (typeof opts.onChange === 'function') {
        el.querySelectorAll('.bim-tab').forEach(x => x.classList.toggle('active', +x.dataset.b === b));
        opts.onChange(b);
      } else {
        const u = new URL(location.href);
        u.searchParams.set(param, String(b));
        location.href = u.toString();
      }
    };
  });

  return sel;
}

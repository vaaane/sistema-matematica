// Modo ?embed=1 (PROMPT-30): o jogo abre dentro do Fliperama do Jogo de Revisão (iframe).
// Esconde o menu/cabeçalho do site e, ao terminar uma partida, avisa o jogo pai.
// Fora do embed nada muda: avisarFimJogo não faz nada.
export const EMBED = new URLSearchParams(location.search).get('embed') === '1' && window.parent !== window;

if (EMBED) {
  document.documentElement.classList.add('jr-embed');
  const st = document.createElement('style');
  st.textContent = `
    .jr-embed .sidebar, .jr-embed #sidebar-backdrop, .jr-embed .hamburger, .jr-embed #btn-voltar, .jr-embed .btn-voltar,
    .jr-embed .topbar-title, .jr-embed .topbar-sub, .jr-embed .topbar .title { display: none !important; }
    .jr-embed .main { margin-left: 0 !important; }`;
  document.head.appendChild(st);
}

// { jogo, pontos, acertos, erros, resultado } → jogo pai (mesma origem)
export function avisarFimJogo(dados) {
  if (!EMBED) return;
  try { window.parent.postMessage({ tipo: 'fim-jogo', ...dados }, location.origin); } catch (_) {}
}

function injectRankCSS() {
  if (document.getElementById('toprank-css')) return;
  const s = document.createElement('style');
  s.id = 'toprank-css';
  s.textContent = `.avatar{position:relative;overflow:visible!important;}`;
  document.head.appendChild(s);
}

export function saveRankPos(alunos, rankAll) {
  const posArr = alunos.map(n => rankAll.findIndex(r => r.aluno === n) + 1).filter(p => p > 0);
  const melhor = posArr.length ? Math.min(...posArr) : null;
  localStorage.setItem('rankPos', JSON.stringify({ melhor }));
}

export function applyTopRankVisuals() {
  try {
    injectRankCSS();
    const raw = localStorage.getItem('rankPos');
    if (!raw) return;
    const { melhor } = JSON.parse(raw);
    if (!melhor || melhor > 3) return;
    const colors = ['#F59E0B', '#9CA3AF', '#CD853F'];
    const emojis = ['🥇', '🥈', '🥉'];
    document.documentElement.style.setProperty('--top-color', colors[melhor - 1]);
    if (!document.getElementById('top-rank-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'top-rank-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;border:3px solid var(--top-color,#F59E0B);animation:top-border-pulse 2.4s ease-in-out infinite;';
      document.body.appendChild(overlay);
    }
    if (!document.getElementById('top-rank-badge')) {
      const d = document.createElement('div');
      d.id = 'top-rank-badge';
      d.className = 'top-rank-badge';
      d.textContent = `${emojis[melhor - 1]} #${melhor} Geral`;
      document.body.appendChild(d);
    }
    document.querySelectorAll('.avatar').forEach(a => {
      a.classList.add(`avatar-ring-${melhor}`);
    });
  } catch (_) {}
}

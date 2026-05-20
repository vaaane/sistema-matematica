export function saveRankPos(alunos, rankAll) {
  const posArr = alunos.map(n => rankAll.findIndex(r => r.aluno === n) + 1).filter(p => p > 0);
  const melhor = posArr.length ? Math.min(...posArr) : null;
  localStorage.setItem('rankPos', JSON.stringify({ melhor }));
}

export function applyTopRankVisuals() {
  try {
    const raw = localStorage.getItem('rankPos');
    if (!raw) return;
    const { melhor } = JSON.parse(raw);
    if (!melhor || melhor > 3) return;
    const colors = ['#F59E0B', '#9CA3AF', '#CD853F'];
    const emojis = ['🥇', '🥈', '🥉'];
    document.documentElement.style.setProperty('--top-color', colors[melhor - 1]);
    document.body.classList.add('top-rank-glow');
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

function injectRankCSS() {
  if (document.getElementById('toprank-css')) return;
  const s = document.createElement('style');
  s.id = 'toprank-css';
  s.textContent = `
.avatar{position:relative;overflow:visible!important;}
.avatar-ring-1::after,.avatar-ring-2::after,.avatar-ring-3::after{
  content:'';position:absolute;top:-14px;left:50%;transform:translateX(-50%);
  font-size:17px;line-height:1;
}
.avatar-ring-1::after{content:'👑';}
.avatar-ring-2::after{content:'🥈';}
.avatar-ring-3::after{content:'🥉';}
  `;
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

import { db } from '/js/firebase-config.js';
import { ref, get, set } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

export const CONQUISTAS_DEF = [
  // Duelos
  { id: 'primeiro_duelo',    emoji: '⚔️',  nome: 'Primeiro duelo',       desc: 'Complete seu primeiro duelo',                meta: null  },
  { id: 'duelos_5',          emoji: '🥊',  nome: '5 vitórias',           desc: 'Vença 5 duelos',                             meta: 5     },
  { id: 'duelos_10',         emoji: '🏅',  nome: '10 vitórias',          desc: 'Vença 10 duelos',                            meta: 10    },
  { id: 'duelos_25',         emoji: '🏆',  nome: '25 vitórias',          desc: 'Vença 25 duelos',                            meta: 25    },
  { id: 'duelos_50',         emoji: '👑',  nome: '50 vitórias',          desc: 'Vença 50 duelos',                            meta: 50    },
  // Tabuada
  { id: 'tabuada_50',        emoji: '🎯',  nome: 'Nível 50',             desc: 'Chegue ao nível 50 na tabuada',              meta: null  },
  { id: 'tabuada_100',       emoji: '💯',  nome: 'Nível 100',            desc: 'Chegue ao nível 100 na tabuada',             meta: null  },
  { id: 'tabuada_300',       emoji: '🌟',  nome: 'Nível máximo',         desc: 'Chegue ao nível 300 na tabuada',             meta: null  },
  // Atividades
  { id: 'primeira_atividade',emoji: '📝',  nome: 'Primeira atividade',   desc: 'Complete sua primeira atividade',            meta: null  },
  { id: 'atividade_100pct',  emoji: '🎖️', nome: 'Perfeito!',            desc: 'Tire 100% em uma atividade',                meta: null  },
  // Streak
  { id: 'streak_3',          emoji: '🔥',  nome: 'Aquecendo',            desc: 'Faça atividades por 3 dias seguidos',        meta: 3     },
  { id: 'streak_7',          emoji: '🔥🔥', nome: 'Em chamas',           desc: 'Faça atividades por 7 dias seguidos',        meta: 7     },
  { id: 'streak_30',         emoji: '💥',  nome: 'Imparável',            desc: 'Faça atividades por 30 dias seguidos',       meta: 30    },
  // Perfil
  { id: 'nivel_perfil_5',    emoji: '⭐',  nome: 'Estrategista',         desc: 'Chegue ao nível 5 de perfil',               meta: null  },
  { id: 'nivel_perfil_10',   emoji: '🌠',  nome: 'Lenda',                desc: 'Chegue ao nível máximo de perfil',          meta: null  },
];

/**
 * Verifica e desbloqueia conquistas para um aluno.
 * Chamar após qualquer ação relevante.
 */
export async function verificarConquistas(uid, contexto = {}) {
  try {
    const [perfSnap, conquSnap] = await Promise.all([
      get(ref(db, `perfis/${uid}`)),
      get(ref(db, `conquistas/${uid}`)),
    ]);

    const perf   = perfSnap.val()  || {};
    const conqus = conquSnap.val() || {};

    const novas = [];

    const tem = (id) => conqus[id]?.conquistado === true;

    // ── Duelos ───────────────────────────────────────────────
    const vitorias = perf.duelos_vitorias || 0;
    const total    = perf.duelos_total    || 0;

    if (!tem('primeiro_duelo') && total >= 1)  novas.push('primeiro_duelo');
    if (!tem('duelos_5')  && vitorias >= 5)    novas.push('duelos_5');
    if (!tem('duelos_10') && vitorias >= 10)   novas.push('duelos_10');
    if (!tem('duelos_25') && vitorias >= 25)   novas.push('duelos_25');
    if (!tem('duelos_50') && vitorias >= 50)   novas.push('duelos_50');

    // ── Tabuada ──────────────────────────────────────────────
    const nivelTab = contexto.nivelTabuada || 0;
    if (!tem('tabuada_50')  && nivelTab >= 50)  novas.push('tabuada_50');
    if (!tem('tabuada_100') && nivelTab >= 100) novas.push('tabuada_100');
    if (!tem('tabuada_300') && nivelTab >= 300) novas.push('tabuada_300');

    // ── Atividades ───────────────────────────────────────────
    if (!tem('primeira_atividade') && contexto.completouAtividade)
      novas.push('primeira_atividade');
    if (!tem('atividade_100pct') && contexto.cem_pct)
      novas.push('atividade_100pct');

    // ── Streak ───────────────────────────────────────────────
    const streak = perf.streak_atual || 0;
    if (!tem('streak_3')  && streak >= 3)  novas.push('streak_3');
    if (!tem('streak_7')  && streak >= 7)  novas.push('streak_7');
    if (!tem('streak_30') && streak >= 30) novas.push('streak_30');

    // ── Nível de perfil ──────────────────────────────────────
    const nivelPerf = perf.nivel || 1;
    if (!tem('nivel_perfil_5')  && nivelPerf >= 5)  novas.push('nivel_perfil_5');
    if (!tem('nivel_perfil_10') && nivelPerf >= 10) novas.push('nivel_perfil_10');

    for (const id of novas) {
      await set(ref(db, `conquistas/${uid}/${id}`), {
        conquistado: true,
        ts: Date.now(),
      });

      const def  = CONQUISTAS_DEF.find(c => c.id === id);
      const nome = perf.apelido_ativo || perf.nome || uid;
      if (def) {
        try {
          const { push } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
          await set(push(ref(db, 'feed_global')), {
            tipo:  'conquista',
            uid,
            nome,
            texto: `${def.emoji} ${nome} desbloqueou: ${def.nome}!`,
            ts:    Date.now(),
          });
        } catch(e) {}
      }
    }

    return novas;
  } catch(e) {
    console.warn('[Conquistas]', e);
    return [];
  }
}

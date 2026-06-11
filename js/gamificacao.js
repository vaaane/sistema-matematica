/*
  PATHS FIREBASE — Sistema de Gamificação
  ─────────────────────────────────────────────────────────────
  perfis/{uid}/
    xp:                  number       ← XP total acumulado
    nivel:               number       ← nível calculado (1-10), atualizado ao ganhar XP
    avatar:              object       ← { skin, top, acc, cloth, clothColor, bg }
    apelido_ativo:       string       ← apelido aprovado e visível publicamente
    apelido_pendente:    string       ← aguardando aprovação da professora
    apelido_status:      string       ← 'pendente' | 'aprovado' | 'rejeitado'
    apelido_motivo:      string       ← motivo do recuse (opcional)
    apelido_trocas_bim:  number       ← quantas trocas usou no bimestre atual (max 1)
    duelos_disponivel:   boolean      ← preferência do aluno (toggle manual)
    streak_atual:        number       ← dias consecutivos com atividade
    streak_maximo:       number       ← maior streak já atingido
    streak_ultimo_dia:   string       ← ISO date do último dia com atividade (YYYY-MM-DD)

  presenca_online/{uid}/
    nome:                string
    apelido:             string
    turma:               string
    status:              string       ← 'disponivel' | 'ocupado' | 'indisponivel'
    pagina:              string       ← página atual do aluno
    em_duelo:            boolean
    ts:                  number       ← timestamp do último heartbeat

  duelos/{duelo_id}/
    tipo:                string       ← 'aberto' | 'direto'
    dificuldade:         string       ← 'facil' | 'medio' | 'dificil'
    criador_uid:         string
    criador_nome:        string
    criador_turma:       string
    adversario_uid:      string       ← preenchido ao aceitar
    status:              string       ← 'aguardando' | 'em_jogo' | 'encerrado' | 'expirado'
    ts_criado:           number
    ts_aceito:           number
    resultado/{uid}/
      pares:             number
      tempo_ms:          number
    vencedor_uid:        string

  conquistas/{uid}/{conquista_id}/
    conquistado:         boolean
    ts:                  number
    progresso:           number       ← para conquistas com meta numérica

  feed_global/
    {entry_id}/
      tipo:              string       ← 'duelo' | 'nivel' | 'atividade' | 'streak'
      uid:               string
      nome:              string
      apelido:           string
      turma:             string
      texto:             string       ← texto já formatado para exibição
      ts:                number
*/

// ── Níveis de perfil ──────────────────────────────────────────
export const NIVEIS_PERFIL = [
  { n:1,  nome:'Aprendiz',     xpMin:0    },
  { n:2,  nome:'Estudante',    xpMin:120  },
  { n:3,  nome:'Calculista',   xpMin:280  },
  { n:4,  nome:'Algebrista',   xpMin:500  },
  { n:5,  nome:'Estrategista', xpMin:800  },
  { n:6,  nome:'Especialista', xpMin:1200 },
  { n:7,  nome:'Mestre',       xpMin:1700 },
  { n:8,  nome:'Grão-Mestre',  xpMin:2350 },
  { n:9,  nome:'Campeão',      xpMin:3100 },
  { n:10, nome:'Lenda',        xpMin:4000 },
];

export const NIVEL_PERFIL_MAX = 10;

// ── XP por ação ───────────────────────────────────────────────
export const XP_ATIVIDADE_COMPLETA  = 20;
export const XP_ATIVIDADE_100PCT    = 40; // bônus por nota máxima (substitui o de cima)
export const XP_STREAK_DIA          = 10;

export const XP_DUELO = {
  facil:  { vitoria: 15, derrota: -3  },
  medio:  { vitoria: 25, derrota: -5  },
  dificil:{ vitoria: 40, derrota: -8  },
};

// ── Configurações de duelo ────────────────────────────────────
export const DUELO_DURACAO_SEGUNDOS = {
  facil:   3 * 60,
  medio:   4 * 60,
  dificil: 5 * 60,
};
export const DUELO_TIMEOUT_ACEITAR_S = 3 * 60; // 3 min para aceitar
export const DUELO_ERRO_PENALIDADE   = 0.5;    // pares descontados por erro

// ── Funções utilitárias ───────────────────────────────────────

export function calcularNivelPerfil(xp) {
  let nivel = NIVEIS_PERFIL[0];
  for (const n of NIVEIS_PERFIL) {
    if (xp >= n.xpMin) nivel = n;
    else break;
  }
  const idx      = NIVEIS_PERFIL.indexOf(nivel);
  const proximo  = NIVEIS_PERFIL[idx + 1] || null;
  const xpProximo = proximo ? proximo.xpMin : nivel.xpMin;
  const progresso = proximo
    ? Math.min(100, Math.round((xp - nivel.xpMin) / (proximo.xpMin - nivel.xpMin) * 100))
    : 100;
  return { ...nivel, xpProximo, progresso };
}

export function aplicarXP(xpAtual, delta) {
  return Math.max(0, (xpAtual || 0) + delta);
}

const SKIN_HEX = {
  tanned:    'fd9841', yellow:    'f8d25c', pale:      'fddbb4',
  light:     'edb98a', brown:     'd08b5b', darkBrown: 'ae5d29',
  black:     '614335',
};

export function avatarUrl(config = {}) {
  const params = new URLSearchParams();
  params.set('skinColor',       SKIN_HEX[config.skin] || SKIN_HEX.light);
  params.set('top',             config.top        || 'shortFlat');
  params.set('backgroundColor', config.bg         || 'b6e3f4');
  params.set('backgroundType',  'solid');
  params.set('eyes',            config.eyes       || 'default');
  params.set('mouth',           config.mouth      || 'smile');
  params.set('clothing',        config.cloth      || 'hoodie');
  params.set('clothesColor',    config.clothColor || 'blue03');

  const acc = config.acc || 'blank';
  if (acc && acc !== 'blank' && acc !== 'none') {
    params.set('accessories',            acc);
    params.set('accessoriesProbability', '100');
  } else {
    params.set('accessoriesProbability', '0');
  }

  if (config.facial && config.facial !== 'none') {
    params.set('facialHair',            config.facial);
    params.set('facialHairProbability', '100');
  } else {
    params.set('facialHairProbability', '0');
  }

  return `https://api.dicebear.com/9.x/avataaars/svg?${params}`;
}

export function avatarHtml(config = {}, fallbackLetra = '?', tamanho = '100%') {
  const url   = avatarUrl(config);
  const letra = (fallbackLetra || '?')[0].toUpperCase();
  return `<img src="${url}" alt="avatar" style="width:${tamanho};height:${tamanho};object-fit:cover;display:block" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:16px;font-weight:800">${letra}</span>`;
}

export function avatarConfigDefault() {
  return { skin: 'light', top: 'shortFlat', acc: 'blank', bg: 'b6e3f4', eyes: 'default', mouth: 'smile', facial: 'none', cloth: 'hoodie', clothColor: '25557c' };
}

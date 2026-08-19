export const UID_PROFESSOR_TESTE = 'PROFESSOR_TESTE';
export const NIVEL_MAX = 300; // Último nível disponível na tabuada

export const FATOR_ATRASO = { dia: 1.0, anterior: 0.75, antiga: 0.5 };
export const LABEL_TIPO   = { dia: "do dia", anterior: "anterior", antiga: "antiga" };
export const BASES = { 1: 10, 2: 20, 3: 30 };
export const FATORES_TENTATIVA = [1.0, 0.75, 0.5, 0.25];
export const MAX_TENTATIVAS_ATIVIDADE = 2;

export const LISTA_ATIVIDADES = [
  { nome: "Atividade 4 - Geometria",              cor: "purple", modo: "competicao_plus", bim: 2 },
  { nome: "Atividade 5 - Geometria: Triângulos",  cor: "blue",   modo: "competicao_plus", bim: 2 },
  { nome: "Atividade 6 - Porcentagem",            cor: "purple", modo: "atividade_plus",  bim: 3 },
  { nome: "Atividade 7 - Equações do 1º Grau",    cor: "purple", modo: "equacoes",        bim: 3 },
];

export const ARQUIVO_QUESTOES = {
  "Atividade 4 - Geometria":             "/dados/questoes_competicao.json",
  "Atividade 5 - Geometria: Triângulos": "/dados/questoes_atividade5.json",
  "Atividade 6 - Porcentagem":           "/dados/questoes_atividade6.json",
  "Atividade 7 - Equações do 1º Grau":   "/dados/questoes_equacoes.json",
};

// ===== ALUNOS_POR_TURMA (ordem oficial SEDF, ativos) =====
export const ALUNOS_POR_TURMA = {
  "8D": ["Alice Tavares", "Alice Paz", "Ana Julia", "Arthur", "Francisco", "Isaac", "João Pedro", "Karolinny", "Ketelly", "Leticia", "Lucas Gabriel", "Lucas Matheus", "Luis Gabriel", "Luis Miguel", "Miguel Henrique", "Miguel Nascimento", "Wanderson", "Izabelly Monik", "Nixmarys"],
  "8E": ["Ana Beatriz", "Arthur", "Caio", "Davi Felipe", "Davi Francisco", "Davi Henrique", "Gabriel", "Gustavo", "Isaque", "Jonathan", "Kauã", "Lívia", "Luiz Felipe", "Manuella", "Maria Clara", "Maria Eduarda", "Maria Luisa", "Mateus", "Matheus", "Natanael", "Natielle", "Nicollas", "Paulo", "Rafaela", "Rafael", "Raissa", "Rebeca", "Sofia", "Sophie", "Talysson", "Vicktor", "Victor Bernardo", "Victor Manuel", "William", "Yago", "Yasmin", "João Gabriel"],
  "8F": ["Ana Beatriz", "Ana Clara", "Arthur Daniel", "Arthur Martins", "Carlos", "Evellyn", "Fábio", "Fellype", "Guilherme", "Heitor", "Joao Pedro", "Joaquim", "Kayla", "Luana", "Maria Elisangela", "Maria Santa", "Marlon", "Miguel", "Mycaela", "Nathalia", "Pedro Lucas", "Rafael", "Renato", "Ryan", "Sara", "Sofia", "Victor Conceicao", "Victor Hugo", "Wesley", "Ycaro", "Pedro Lukas"],
  "8G": ["Ana Clara", "Ana Gabryella", "Ana Maria", "Davi Emanoel", "Davi Francisco", "Helena", "Isabela", "Karlos", "Ketelen", "Lorran", "Maria Clara", "Maria Eduarda", "Maria Laura", "Maria Sophia", "Natalya", "Pablo", "Paulo Henrique", "Pedro Gabriel", "Pedro Vaz", "Pedro Henryque", "Pietro", "Pyetro", "Renan", "Sandra", "Sophia", "Thays", "Victor", "Beatriz", "Letícia", "Erik"],
  "8H": ["Ana Beatriz", "Ana Clara", "Ana Gabrieli", "Anderson", "Bruno", "Emanuelle", "Esllinder", "Honny", "Laryssa", "Leonardo", "Levi", "Marcus Vinicius", "Maria Fernanda", "Matheus Henrique", "Murillo", "Nicolas", "Nicolle", "Nicolly", "Pedro Jorge", "Pedro Willian", "Rana", "Riquelme", "Samuel", "Sophia", "Thayanne", "Victor Gabriel", "Victor Hugo", "Victória", "Vinícius", "Yann", "Yasmin", "Yoxiris", "Dandara", "Jessier", "Mary Ana"],
};

// ===== Nº da chamada oficial (SEDF) por aluno — pode ter lacunas =====
export const NUM_CHAMADA = {
  "8D": {"Alice Tavares":1, "Alice Paz":2, "Ana Julia":3, "Arthur":4, "Francisco":6, "Isaac":7, "João Pedro":10, "Karolinny":11, "Ketelly":12, "Leticia":14, "Lucas Gabriel":16, "Lucas Matheus":17, "Luis Gabriel":18, "Luis Miguel":19, "Miguel Henrique":22, "Miguel Nascimento":23, "Wanderson":25, "Izabelly Monik":26, "Nixmarys":27},
  "8E": {"Ana Beatriz":1, "Arthur":2, "Caio":3, "Davi Felipe":4, "Davi Francisco":5, "Davi Henrique":6, "Gabriel":7, "Gustavo":8, "Isaque":10, "Jonathan":11, "Kauã":12, "Lívia":14, "Luiz Felipe":15, "Manuella":16, "Maria Clara":17, "Maria Eduarda":18, "Maria Luisa":19, "Mateus":21, "Matheus":22, "Natanael":23, "Natielle":24, "Nicollas":25, "Paulo":26, "Rafaela":27, "Rafael":28, "Raissa":29, "Rebeca":30, "Sofia":31, "Sophie":32, "Talysson":33, "Vicktor":34, "Victor Bernardo":35, "Victor Manuel":36, "William":37, "Yago":38, "Yasmin":39, "João Gabriel":40},
  "8F": {"Ana Beatriz":1, "Ana Clara":2, "Arthur Daniel":4, "Arthur Martins":5, "Carlos":6, "Evellyn":7, "Fábio":8, "Fellype":9, "Guilherme":10, "Heitor":11, "Joao Pedro":12, "Joaquim":13, "Kayla":14, "Luana":15, "Maria Elisangela":17, "Maria Santa":18, "Marlon":19, "Miguel":21, "Mycaela":22, "Nathalia":23, "Pedro Lucas":25, "Rafael":26, "Renato":27, "Ryan":28, "Sara":29, "Sofia":30, "Victor Conceicao":31, "Victor Hugo":33, "Wesley":34, "Ycaro":35, "Pedro Lukas":36},
  "8G": {"Ana Clara":1, "Ana Gabryella":2, "Ana Maria":3, "Davi Emanoel":4, "Davi Francisco":5, "Helena":8, "Isabela":9, "Karlos":10, "Ketelen":11, "Lorran":13, "Maria Clara":15, "Maria Eduarda":16, "Maria Laura":17, "Maria Sophia":18, "Natalya":20, "Pablo":21, "Paulo Henrique":22, "Pedro Gabriel":23, "Pedro Vaz":24, "Pedro Henryque":25, "Pietro":26, "Pyetro":27, "Renan":29, "Sandra":30, "Sophia":32, "Thays":33, "Victor":34, "Beatriz":35, "Letícia":37, "Erik":38},
  "8H": {"Ana Beatriz":1, "Ana Clara":2, "Ana Gabrieli":3, "Anderson":4, "Bruno":5, "Emanuelle":6, "Esllinder":7, "Honny":9, "Laryssa":12, "Leonardo":13, "Levi":14, "Marcus Vinicius":15, "Maria Fernanda":16, "Matheus Henrique":17, "Murillo":18, "Nicolas":19, "Nicolle":20, "Nicolly":21, "Pedro Jorge":22, "Pedro Willian":24, "Rana":25, "Riquelme":26, "Samuel":27, "Sophia":28, "Thayanne":29, "Victor Gabriel":30, "Victor Hugo":31, "Victória":32, "Vinícius":33, "Yann":34, "Yasmin":35, "Yoxiris":36, "Dandara":37, "Jessier":38, "Mary Ana":39},
};

// Nº da chamada de um aluno (string vazia se não encontrado)
export function numeroChamada(turma, nome) {
  return (NUM_CHAMADA[turma] || {})[nome] ?? "";
}

export function intercalarPorDificuldade(perguntas) {
  const faceis   = perguntas.filter(p => p.dificuldade === 1);
  const medias   = perguntas.filter(p => p.dificuldade === 2);
  const dificeis = perguntas.filter(p => p.dificuldade === 3);
  const shuffle  = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
  shuffle(faceis); shuffle(medias); shuffle(dificeis);
  const grupos = [faceis, medias, dificeis].filter(g => g.length > 0).map(g => [...g]);
  const res = [];
  while (grupos.some(g => g.length > 0)) {
    for (const g of grupos) { if (g.length > 0) res.push(g.shift()); }
  }
  return res;
}

export async function carregarPerguntas(nomeAtividade) {
  const caminho = ARQUIVO_QUESTOES[nomeAtividade];
  const resp = await fetch(caminho);
  const perguntas = await resp.json();
  return intercalarPorDificuldade(perguntas);
}

export function respostasEquivalentes(a, c) {
  a = a.trim(); c = c.trim();
  if (a === c) return true;
  try {
    const parse = s => {
      s = s.trim();
      if (s.includes('/')) {
        const [n, d] = s.split('/').map(Number);
        return n / d;
      }
      return parseFloat(s);
    };
    const va = parse(a), vc = parse(c);
    return !isNaN(va) && !isNaN(vc) && Math.abs(va - vc) < 1e-9;
  } catch(e) { return false; }
}

export function formatarTempo(segundos) {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export function dataAgora() {
  const now = new Date();
  return now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
}

// ─────────────────────────────────────────────────────────────
// CALENDÁRIO LETIVO — fonte única de verdade dos bimestres.
// Datas em ISO (YYYY-MM-DD). Comparação lexicográfica funciona nesse formato.
// (Há um recesso entre 11/07 e 26/07 que não pertence a nenhum bimestre.)
// ─────────────────────────────────────────────────────────────
export const BIMESTRES = [
  { n: 1, inicio: "2026-02-12", fim: "2026-04-29" },
  { n: 2, inicio: "2026-04-30", fim: "2026-07-10" },
  { n: 3, inicio: "2026-07-27", fim: "2026-10-05" },
  { n: 4, inicio: "2026-10-06", fim: "2026-12-21" },
];

// Número do bimestre de uma data ISO, ou null se cair em recesso/fora do ano.
export function bimestreDeData(iso) {
  const b = BIMESTRES.find(b => iso >= b.inicio && iso <= b.fim);
  return b ? b.n : null;
}

// Bimestre "corrente" pela data de hoje. Em recesso, aponta para o próximo
// que ainda vai começar; se o ano acabou, fica no último.
export function bimestreAtual(hojeIso) {
  const hoje = hojeIso || new Date().toISOString().slice(0, 10);
  const dentro = bimestreDeData(hoje);
  if (dentro) return dentro;
  const prox = BIMESTRES.find(b => hoje < b.inicio);
  return prox ? prox.n : BIMESTRES[BIMESTRES.length - 1].n;
}

// ─────────────────────────────────────────────────────────────
// Paths de dados por bimestre (tabuada e afins)
// Regra histórica: bimestres 1 e 2 usam o path GLOBAL (dados antigos, sem
// separação por bimestre); do 3º em diante, cada bimestre tem seu próprio nó
// `..._b/${bim}`. Estes helpers centralizam a regra para que páginas novas —
// e os próximos bimestres/anos — "só funcionem" sem repetir o `if`.
export function pathTabuadaNiveis(uid, bim = bimestreAtual()) {
  return bim <= 2 ? `tabuada_niveis/${uid}` : `tabuada_niveis_b/${bim}/${uid}`;
}
// Nó RAIZ de níveis (sem uid) — para ler todos os alunos de uma vez.
export function pathTabuadaNiveisRaiz(bim = bimestreAtual()) {
  return bim <= 2 ? `tabuada_niveis` : `tabuada_niveis_b/${bim}`;
}
export function pathTabuadaRanking(bim = bimestreAtual()) {
  return bim <= 2 ? `tabuada_ranking` : `tabuada_ranking_b/${bim}`;
}
export function pathTabuadaNegNiveis(uid, bim = bimestreAtual()) {
  return bim <= 2 ? `tabuada_negativos_niveis/${uid}` : `tabuada_negativos_niveis_b/${bim}/${uid}`;
}
export function pathTabuadaSprintRanking(bim = bimestreAtual()) {
  return bim <= 2 ? `tabuada_sprint_ranking` : `tabuada_sprint_ranking_b/${bim}`;
}

// Grade semanal fixa por turma. 0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sáb.
// (Centralizado aqui para o Diário e futuras telas usarem o mesmo horário.)
export const GRADE_TURMAS = {
  "8D": [1, 3, 5],  // seg, qua, sex
  "8E": [1, 2, 5],  // seg, ter, sex
  "8F": [2, 3, 4],  // ter, qua, qui
  "8G": [1, 3, 4],  // seg, ter, qui
  "8H": [2, 4, 5],  // ter, qui, sex
};

// ===== Horários dos tempos (para abrir na turma da aula atual) =====
export const HORARIOS = [
  { t:1, ini:"07:15", fim:"08:00" },
  { t:2, ini:"08:00", fim:"08:40" },
  { t:3, ini:"08:40", fim:"09:20" },
  { t:4, ini:"10:00", fim:"10:45" },
  { t:5, ini:"10:45", fim:"11:30" },
  { t:6, ini:"11:30", fim:"12:15" },
];
// Grade por dia da semana (0=dom..6=sáb) → { tempo: turma }. Inclui MAT e PD1.
export const GRADE_HORARIO = {
  1: { 1:"8D", 3:"8G", 4:"8E", 6:"8E" },                 // segunda
  2: { 1:"8E", 2:"8F", 3:"8F", 4:"8F", 5:"8H" },         // terça
  3: { 1:"8G", 2:"8G", 3:"8F", 4:"8D", 6:"8G" },         // quarta
  4: { 1:"8H", 2:"8F", 4:"8H", 5:"8G", 6:"8G" },         // quinta
  5: { 1:"8E", 2:"8E", 3:"8D", 4:"8D", 5:"8H", 6:"8H" }, // sexta
};
// Turma da aula acontecendo agora; senão a próxima do dia; senão null (fim de semana / fora de horário).
export function turmaAgora() {
  const now = new Date();
  const grade = GRADE_HORARIO[now.getDay()];
  if (!grade) return null;
  const min = now.getHours() * 60 + now.getMinutes();
  const toMin = s => { const [h,m] = s.split(":").map(Number); return h*60 + m; };
  const slots = HORARIOS.filter(h => grade[h.t]).map(h => ({ ini:toMin(h.ini), fim:toMin(h.fim), turma:grade[h.t] }));
  for (const s of slots) if (min >= s.ini && min < s.fim) return s.turma;  // aula agora
  for (const s of slots) if (min < s.ini) return s.turma;                  // próxima aula do dia
  return null;                                                             // acabaram as aulas
}

// Dia da eletiva PD1 por turma (só sinalização; NÃO afeta a contagem de dias).
export const PD1_TURMAS = {
  "8D": [5],  // sexta
  "8E": [1],  // segunda
  "8F": [2],  // terça
  "8G": [3],  // quarta
  "8H": [4],  // quinta
};

// Tipos de dia não-letivo (usados no Diário na Etapa 2).
export const TIPOS_NAO_LETIVO = {
  feriado:     { rotulo: "Feriado",           emoji: "🚫" },
  recesso:     { rotulo: "Recesso",           emoji: "🌴" },
  paralisacao: { rotulo: "Paralisação",       emoji: "✊" },
  movel:       { rotulo: "Dia Letivo Móvel",  emoji: "🔄" },
};

// ── Atestados médicos ────────────────────────────────────────────────
// Estrutura no Firebase: atestados/{turma}/{aluno} = [ {inicio,fim,ts,obs} ]
export function dentroDoAtestado(data, lista) {
  if (!data || !Array.isArray(lista)) return false;
  return lista.some(a => a && a.inicio && a.fim && data >= a.inicio && data <= a.fim);
}
export function normalizarAtestados(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  Object.entries(raw).forEach(([aluno, val]) => {
    if (Array.isArray(val)) out[aluno] = val.filter(Boolean);
    else if (val && typeof val === "object") out[aluno] = Object.values(val).filter(Boolean);
  });
  return out;
}

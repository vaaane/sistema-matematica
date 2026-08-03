export const UID_PROFESSOR_TESTE = 'PROFESSOR_TESTE';
export const NIVEL_MAX = 300; // Último nível disponível na tabuada

export const FATOR_ATRASO = { dia: 1.0, anterior: 0.75, antiga: 0.5 };
export const LABEL_TIPO   = { dia: "do dia", anterior: "anterior", antiga: "antiga" };
export const BASES = { 1: 10, 2: 20, 3: 30 };
export const FATORES_TENTATIVA = [1.0, 0.75, 0.5, 0.25];
export const MAX_TENTATIVAS_ATIVIDADE = 2;

export const LISTA_ATIVIDADES = [
  { nome: "Atividade 4 - Geometria",              cor: "purple", modo: "competicao_plus" },
  { nome: "Atividade 5 - Geometria: Triângulos",  cor: "blue",   modo: "competicao_plus" },
  { nome: "Atividade 6 - Porcentagem",            cor: "purple", modo: "atividade_plus" },
];

export const ARQUIVO_QUESTOES = {
  "Atividade 4 - Geometria":             "/dados/questoes_competicao.json",
  "Atividade 5 - Geometria: Triângulos": "/dados/questoes_atividade5.json",
  "Atividade 6 - Porcentagem":           "/dados/questoes_atividade6.json",
};

export const ALUNOS_POR_TURMA = {
  "8D": [
    "Alice Tavares", "Alice Paz", "Ana Julia",
    "Arthur", "Francisco",
    "Isaac", "Izabelly Monik", "João Pedro", "Karolinny",
    "Ketelly", "Leticia", "Lucas Gabriel",
    "Lucas Matheus", "Luis Gabriel", "Luis Miguel",
    "Miguel Henrique", "Miguel Nascimento", "Thayna",
    "Wanderson", "teste1", "teste2",
  ],
  "8E": [
    "Ana Beatriz", "Arthur", "Caio",
    "Davi Felipe", "Davi Francisco", "Davi Henrique",
    "Gabriel", "Gustavo", "Isaque",
    "Jonathan", "Kauã", "Lívia",
    "Luiz Felipe", "Manuella", "Maria Clara",
    "Maria Eduarda", "Maria Luisa", "Mateus",
    "Matheus", "Natanael", "Natielle",
    "Nicollas", "Paulo", "Rafaela",
    "Rafael", "Raissa", "Rebeca",
    "Sofia", "Sophie", "Talysson",
    "Vicktor", "Victor Bernardo", "Victor Manuel",
    "William", "Yago", "Yasmin",
    "João Gabriel",
  ],
  "8F": [
    "Ana Beatriz", "Ana Clara", "Anna Beatriz",
    "Arthur Daniel", "Arthur Martins", "Carlos",
    "Evellyn", "Fábio", "Fellype",
    "Guilherme", "Heitor", "Joao Pedro",
    "Joaquim", "Kayla", "Luana",
    "Maria Elisangela", "Maria Santa", "Marlon",
    "Miguel", "Mycaela", "Nathalia",
    "Pedro Lucas", "Pedro Lukas", "Rafael",
    "Renato", "Ryan", "Sara",
    "Sofia", "Victor Conceicao", "Victor Hugo",
    "Wesley", "Ycaro",
  ],
  "8G": [
    "Ana Clara", "Ana Gabryella", "Ana Maria",
    "Beatriz",
    "Davi Emanoel", "Davi Francisco", "Davi Lukas",
    "Helena", "Isabela", "Karlos",
    "Ketelen", "Laiza", "Lorran",
    "Maria Clara", "Maria Eduarda", "Maria Laura",
    "Maria Sophia", "Natalya", "Pablo",
    "Paulo Henrique", "Pedro Gabriel", "Pedro Vaz",
    "Pedro Henryque", "Pietro", "Pyetro",
    "Renan", "Sandra", "Santiago",
    "Sophia", "Thays", "Victor",
  ],
  "8H": [
    "Ana Beatriz", "Ana Clara", "Ana Gabrieli",
    "Anderson", "Bruno", "Dandara", "Emanuelle",
    "Esllinder", "Honny", "Jessier Francisco Avendano Araya", "Laryssa",
    "Leonardo", "Levi", "Marcus Vinicius",
    "Maria Fernanda", "Mary Ana", "Matheus Henrique", "Murillo",
    "Nicolas", "Nicolle", "Nicolly",
    "Pedro Jorge", "Pedro Riquelme", "Pedro Willian",
    "Rana", "Ricardo", "Riquelme", "Samuel",
    "Sophia", "Thayanne", "Victor Gabriel",
    "Victor Hugo", "Victória", "Vinícius",
    "Yann", "Yasmin", "Yoxiris",
  ],
};

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

// Grade semanal fixa por turma. 0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sáb.
// (Centralizado aqui para o Diário e futuras telas usarem o mesmo horário.)
export const GRADE_TURMAS = {
  "8D": [1, 3, 5],  // seg, qua, sex
  "8E": [1, 2, 5],  // seg, ter, sex
  "8F": [2, 3, 4],  // ter, qua, qui
  "8G": [1, 2, 4],  // seg, ter, qui
  "8H": [2, 4, 5],  // ter, qui, sex
};

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

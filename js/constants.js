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
    "Esllinder", "Honny", "Laryssa",
    "Leonardo", "Levi", "Marcus Vinicius",
    "Maria Fernanda", "Matheus Henrique", "Murillo",
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

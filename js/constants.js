export const FATOR_ATRASO = { dia: 1.0, anterior: 0.75, antiga: 0.5 };
export const LABEL_TIPO   = { dia: "do dia", anterior: "anterior", antiga: "antiga" };
export const BASES = { 1: 10, 2: 20, 3: 30 };
export const FATORES_TENTATIVA = [1.0, 0.75, 0.5, 0.25];
export const MAX_TENTATIVAS_ATIVIDADE = 2;

export const LISTA_ATIVIDADES = [
  { nome: "Atividade 4 - Geometria", cor: "purple", modo: "competicao" },
];

export const ARQUIVO_QUESTOES = {
  "Atividade 4 - Geometria": "/dados/questoes_competicao.json",
};

export const ALUNOS_POR_TURMA = {
  "8D": [
    "Alice Tavares", "Alice Paz", "Ana Julia", "Arthur", "Dandara",
    "Francisco", "Isaac", "João Pedro", "Karolinny", "Ketelly",
    "Letícia", "Lucas Marinho", "Lucas Oliveira", "Luís Oliveira", "Luís Freitas",
    "Miguel Ferreira", "Miguel Pereira", "Thayna", "Wanderson",
  ],
  "8E": [
    "Ana Beatriz", "Arthur", "Caio", "Davi Costa", "Davi Almeida", "Davi Araújo",
    "Gabriel", "Gustavo", "Isaque", "Jonathan", "Kauã", "Lívia",
    "Luiz", "Manuella", "Maria Clara", "Maria Eduarda", "Maria Luísa",
    "Mateus", "Matheus", "Natanael", "Natielle", "Nicollas",
    "Paulo", "Rafaela", "Rafael", "Raissa", "Rebeca",
    "Sofia", "Sophie", "Talysson", "Vicktor", "Victor Conrado", "Victor Teixeira",
    "William", "Yago", "Yasmin", "João Gabriel",
  ],
  "8F": [
    "Ana Beatriz", "Ana Clara", "Anna Beatriz", "Arthur Candido", "Arthur Silva",
    "Carlos", "Evellyn", "Fábio", "Fellype", "Guilherme",
    "Heitor", "João Pedro", "Joaquim", "Kayla", "Luana",
    "Maria Elisangela", "Maria Santa", "Marlon", "Miguel", "Mycaela",
    "Nathalia", "Pedro", "Rafael", "Renato", "Ryan",
    "Sara", "Sofia", "Victor Hugo", "Vitor Hugo", "Wesley", "Ycaro",
  ],
  "8G": [
    "Ana Clara", "Ana Gabryella", "Ana Maria", "Davi Emanoel", "Davi Francisco", "Davi Lukas",
    "Helena", "Isabela", "Karlos", "Ketelen", "Laiza", "Lorran",
    "Maria Clara", "Maria Eduarda", "Maria Laura", "Maria Sophia",
    "Natalya", "Pablo", "Paulo", "Pedro Gabriel", "Pedro Henrique", "Pedro Henryque",
    "Pietro", "Pyetro", "Renan", "Sandra", "Santiago", "Sophia", "Thays", "Victor",
  ],
  "8H": [
    "Ana Beatriz", "Ana Clara", "Ana Gabrieli", "Anderson", "Bruno",
    "Emanuelle", "Esllinder", "Honny", "Laryssa", "Leonardo",
    "Levi", "Marcus", "Maria Fernanda", "Matheus", "Murillo",
    "Nicolas", "Nicolle", "Nicolly", "Pedro Jorge", "Pedro Riquelme", "Pedro Willian",
    "Rana", "Riquelme", "Samuel", "Sophia", "Thayanne",
    "Victor Gabriel", "Victor Hugo", "Victória", "Vinícius", "Yann", "Yasmin", "Yoxiris",
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

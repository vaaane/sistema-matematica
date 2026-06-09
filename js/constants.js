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
];

export const ARQUIVO_QUESTOES = {
  "Atividade 4 - Geometria":             "/dados/questoes_competicao.json",
  "Atividade 5 - Geometria: Triângulos": "/dados/questoes_atividade5.json",
};

export const ALUNOS_POR_TURMA = {
  "8D": [
    "Alice da Costa Tavares", "Alice Szervinsk Marra Paz", "Ana Julia Pires da Costa",
    "Arthur Souza Linhares", "Dandara Morena Freitas Silva", "Francisco Wallison Carvalho dos Santos",
    "Isaac Carvalho Amorim", "João Pedro Candido Martins Nunes", "Karolinny Brandao Fernandes",
    "Ketelly Emanuelly Magalhaes de Souza", "Leticia Amancio Vieira", "Lucas Gabriel Sales Marinho",
    "Lucas Matheus dos Santos Oliveira", "Luis Gabriel Alves de Oliveira", "Luis Miguel dos Santos Freitas",
    "Miguel Henrique Martins Ferreira", "Miguel Nascimento de Jesus Pereira", "Thayna Pereira Araujo",
    "Wanderson Bruno da Silva Santos",
  ],
  "8E": [
    "Ana Beatriz Ferreira Araújo", "Arthur Marques de Sousa", "Caio dos Santos Ferreira",
    "Davi Felipe Mendes Costa", "Davi Francisco Carence Almeida", "Davi Henrique Maciel Araujo",
    "Gabriel Louzeiro Martins", "Gustavo Xavier Alves", "Isaque Soares Gois",
    "Jonathan Vitor Almeida Costa", "Kauã Estevan Mendes Rodrigues", "Lívia Eduarda da Silva Freitas",
    "Luiz Felipe Virginia Alves", "Manuella Fernandes de Souza Silva", "Maria Clara dos Santos Silva",
    "Maria Eduarda Rodrigues Schmitt", "Maria Luisa Conceicao da Silva", "Mateus Lima Viana",
    "Matheus de Oliveira Matte", "Natanael Alves Pereira", "Natielle Castelhiano Silva",
    "Nicollas Henrique Lima", "Paulo Rocha Lima da Silva", "Rafaela Sousa Pereira",
    "Rafael da Silva Macedo", "Raissa Gomes dos Santos", "Rebeca Ribeiro de Carvalho",
    "Sofia Ferreira de Souza", "Sophie Nascimento Silva", "Talysson Iago Belarmino Cavalcante",
    "Vicktor Gustavo de Jesus Soares", "Victor Bernardo Sousa Conrado", "Victor Manuel dos Santos Teixeira",
    "William Borges dos Santos", "Yago Henrique Teixeira Brito", "Yasmin Barros Estevao",
    "João Gabriel Soares da Silva",
  ],
  "8F": [
    "Ana Beatriz Lima da Silva", "Ana Clara de Jesus Lima", "Anna Beatriz Santos de Jesus",
    "Arthur Daniel Cristino dos Santos Candido", "Arthur Martins da Silva", "Carlos Francisco Vieira Santanna",
    "Evellyn Emmanuelle Graciliano Oliveira", "Fábio Jesus Santos da Silva", "Fellype Ferreira Guedes da Silva",
    "Guilherme Silva Velozo da Cruz", "Heitor Emanuel Alves dos Santos", "Joao Pedro Silva dos Santos",
    "Joaquim Souza Galiza", "Kayla Sofia Fiel Bispo", "Luana Brito Romao",
    "Maria Elisangela Nascimento dos Santos", "Maria Santa Silva Lima", "Marlon Miguel Machado de Carvalho",
    "Miguel Alves Ribeiro Neto", "Mycaela Geovana Gomes Melo", "Nathalia Fernanda Gomes Mendes",
    "Pedro Lucas Ramos Silva", "Pedro Lukas", "Rafael Sousa de Brito",
    "Renato Renner Junior Silva Soares", "Ryan Lucas Caldeira dos Santos", "Sara Lidia da Silva dos Reis",
    "Sofia da Silva Oliveira", "Victor Hugo Andrade da Conceicao", "Vitor Hugo Ferreira Braga de Souza",
    "Wesley Fernando Sousa Reis", "Ycaro Júnior Francisca Sobrinho",
  ],
  "8G": [
    "Ana Clara de Sousa Rosario", "Ana Gabryella Silva de Oliveira", "Ana Maria de Souza Alves",
    "Davi Emanoel Vieira Veras", "Davi Francisco da Silva", "Davi Lukas Alves Ribeiro",
    "Helena Carvalho Gouveia Mendes", "Isabela Souza Franca", "Karlos Andre Alves Mourato",
    "Ketelen Cristine Carvalho Costa", "Laiza Fernanda Gonçalves de Sousa", "Lorran Carvalho Sena",
    "Maria Clara Oliveira Gomes", "Maria Eduarda Vidal Sousa de Jesus", "Maria Laura de Oliveira Carvalho",
    "Maria Sophia Oliveira Fontinele", "Natalya Fernandes da Silva Santos", "Pablo Henrique das Chagas Santos",
    "Paulo Henrique Gonçalves Castro", "Pedro Gabriel de Jesus Abreu Araújo", "Pedro Henrique Pires de Oliveira Vaz",
    "Pedro Henryque Sampaio Fernandes de Sousa", "Pietro Alves Ferreira", "Pyetro Emanoel Mendes de Souza",
    "Renan Carlos Neves Cavalcante", "Sandra Soares de Almeida", "Santiago Josue Ulacio Pulgar",
    "Sophia Rodrigues do Nascimento", "Thays Oliveira Costa", "Victor Silva Ribeiro",
  ],
  "8H": [
    "Ana Beatriz Sampaio Queiroz", "Ana Clara Sampaio Queiroz", "Ana Gabrieli Nunes Gomes",
    "Anderson Maranhão Araújo", "Bruno Henrique de Aquino Bastos", "Emanuelle Rodrigues de Jesus Pereira",
    "Esllinder Esmirna Arvelaez Pineda", "Honny Ruth Adrian Hurtado", "Laryssa Costa dos Reis",
    "Leonardo Figueiredo Costa", "Levi Dias de Araújo Sousa Santos", "Marcus Vinicius de Lima Primo",
    "Maria Fernanda Barbosa de Sousa", "Matheus Henrique de Souza Costa", "Murillo Alves da Silva",
    "Nicolas Gabriel Mendes dos Santos", "Nicolle Kristine Lopes Sobrinho", "Nicolly Moreira dos Santos",
    "Pedro Jorge Souza Freitas", "Pedro Riquelme Costa Santos", "Pedro Willian Hiert da Costa",
    "Rana Melícia Alves Nunes", "Riquelme Silva Souza", "Samuel de Sousa Cruz",
    "Sophia Caroline Oliveira Lima", "Thayanne Victoria Pinto Graca", "Victor Gabriel dos Santos de Souza",
    "Victor Hugo Ribeiro da Silva", "Victória Sophya Rodrigues dos Santos", "Vinícius Mendes Ribeiro",
    "Yann Teixeira Lima", "Yasmin Eloise Lourenço de Sousa", "Yoxiris Andreina López Barrios",
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

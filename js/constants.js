export const FATOR_ATRASO = { dia: 1.0, anterior: 0.75, antiga: 0.5 };
export const LABEL_TIPO   = { dia: "do dia", anterior: "anterior", antiga: "antiga" };
export const BASES = { 1: 10, 2: 20, 3: 30 };
export const FATORES_TENTATIVA = [1.0, 0.75, 0.5, 0.25];
export const MAX_TENTATIVAS_ATIVIDADE = 2;

export const LISTA_ATIVIDADES = [
  { nome: "Atividade 1 - Frações",   cor: "blue"   },
  { nome: "Atividade 2 - Equações",  cor: "green"  },
  { nome: "Atividade 3 - Geometria", cor: "orange" },
];

export const ARQUIVO_QUESTOES = {
  "Atividade 1 - Frações":   "/dados/questoes_atividade1.json",
  "Atividade 2 - Equações":  "/dados/questoes_atividade2.json",
  "Atividade 3 - Geometria": "/dados/questoes_atividade3.json",
};

export const ALUNOS_POR_TURMA = {
  "A": ["Bianca","Camila","Daniela","Diego","Edvaldo","Elisa","Emanuel","Giovana","Karen","Nathalia","Omar","Otávio","Sabrina","Sérgio","Talita","Vera","Zeila"],
  "B": ["Alice","Aline","Camila","Diego","Débora","Emanuel","Hana","Henrique","Karen","Laura","Marcos","Nathalia","Nathan","Paloma","Sofia","Talita","Ursula","Victor","Yuri","Zeila"],
  "C": ["Bianca","Dara","Eric","Fernanda","Igor","Isabela","Ivo","Kevin","Marcos","Mariana","Nathalia","Olga","Paula","Renata","Samuel","Tiago","Ulisses","William","Ximena","Yuri","Zeca"],
  "D": ["Bernardo","Elisa","Fabio","Fernanda","Graça","Ingrid","Ivo","Joaquim","João","Karen","Kevin","Lucas","Nathan","Valentina","Victor","William","Ximena","Yuri"],
  "F": ["Bianca","Diego","Eduardo","Fabio","Giovana","Helena","Joana","João","Julia","Lucas","Milena","Pedro","Quésia","Renata","Samuel","Vera","Victor","Wendy","Yuri"],
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

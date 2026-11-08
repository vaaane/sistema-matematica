// Checagem dos enunciados do Jogo de Revisão (PROMPT-209).
// Gera 50 questões de cada gerador (mapas 1 a 13, A e B, todos os personagens),
// lê os JSONs de dados/jogo/questoes/ e lista os enunciados suspeitos.
// Também confere o texto do "Ei! Rapidinho" do pet (que mostra o enunciado e um "?" só quando ele não termina em pontuação).
// Uso (na raiz do projeto):  node scripts/checar-enunciados.js
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const RAIZ = path.resolve(__dirname, '..');
const url = p => pathToFileURL(path.join(RAIZ, p)).href;
const N = 50;

// ---- regras de suspeita
// "m" fica de fora: no 8-B é letra ("7m + 3m"); metro grudado é conferido à parte (seguido de pontuação ou palavra)
const UNIDADES = 'kg|g|mg|km|cm|mm|L|ml|mL|min|h|°C|m²|cm²|km²|m³';
const REGRAS = [
  ['". ?", "?." ou "??"', s => /\.\s*\?|\?\s*\.|\?\s*\?|!\s*\?|:\s*\?$/.test(s)],
  ['espaço antes de pontuação', s => /\s[.,;:!](?!\d)/.test(s) || /[a-zà-ú]\s\?/i.test(s)],
  ['espaço duplo / nas pontas', s => /\S {2,}\S/.test(s) || s !== s.trim()],
  ['palavra repetida', s => /(^|[^\p{L}])(\p{L}{2,})\s+\2(?![\p{L}])/iu.test(s)],
  ['unidade grudada no número', s => new RegExp(`\\d(?:${UNIDADES})(?![\\p{L}\\d²³])`, 'u').test(s) || !/termos semelhantes/.test(s) && /\dm(?=[.,;]|\s+(?!e(?![\p{L}]))\p{L})/u.test(s) || /R\$\d/.test(s)],
  ['sem espaço depois da pontuação', s => /[\p{L}][,;:][\p{L}]/u.test(s) || /[a-zà-ú]\.[A-ZÀ-Ú]/.test(s)],
  ['acento / crase suspeito', s => /(^|[^\p{L}])(voce|nao|tambem|ate|numero|media|fracao|equacao|à partir|à ele|à um|à uma|à cada|as vezes|à vezes)(?![\p{L}])/iu.test(s)],
  ['sem pergunta no final', s => semPergunta(s)],
];
// "Situação sem pergunta": é uma frase (tem palavras) e não termina em "?" nem em ":" (lista que segue).
// Expressões puras ("5 + 2 × 3", "2³") não precisam de pergunta: a tela mostra "= ?".
function semPergunta(s) {
  const t = s.trim();
  const palavras = (t.match(/\p{L}{3,}/gu) || []).filter(w => !/^(de|da|do|em|kg|km|cm|mm|min)$/i.test(w));
  if (palavras.length < 2) return false;
  return !/[?:]$/.test(t) && !/^(calcule|resolva|simplifique|qual|quanto|quantos|quantas|ache|encontre|escreva|marque)\b/i.test(t);
}

function checar(s) { return REGRAS.filter(([, f]) => f(String(s))).map(([n]) => n); }

(async () => {
  globalThis.localStorage = { getItem: () => null, setItem() {} };
  const { MAPAS_1_4 } = await import(url('js/jogo-revisao/mapas1a4.js'));
  const { MAPAS_5_8 } = await import(url('js/jogo-revisao/mapas5a8.js'));
  const { MAPAS_9_13, perguntasTabela } = await import(url('js/jogo-revisao/mapas9a13.js'));
  const BANCO = { ...MAPAS_1_4, ...MAPAS_5_8, ...MAPAS_9_13 };

  const achados = new Map();   // chave = regra|formato → { regra, onde, exemplo, n }
  const anotar = (onde, enun, extra = '') => {
    for (const regra of checar(enun)) {
      const formato = String(enun).replace(/[−-]?\d+(?:[.,]\d+)*/g, '#');
      const k = regra + '|' + onde.split(' ')[0] + '|' + formato;
      const a = achados.get(k);
      if (a) a.n++; else achados.set(k, { regra, onde, exemplo: enun + extra, n: 1 });
    }
  };
  // o "Ei! Rapidinho" mostra o enunciado e "?" só se ele não termina em ? : . ! (js/jogo-revisao.js → perguntaDoPet)
  const rapidinho = (onde, enun) => { const e = String(enun).trim(), s = /[?:.!]$/.test(e) ? e : `${e}?`; if (/\.\s*\?|\?\s*\?|!\s*\?|:\s*\?$/.test(s)) anotar(onde + ' (Rapidinho)', s); };

  let total = 0;
  for (const [mapa, lados] of Object.entries(BANCO)) for (const [lado, g] of Object.entries(lados)) {
    if (g === 'tabelas') {
      for (const pers of ['treinador1', 'treinador2', 'treinador3', 'lider', 'revanche']) for (let i = 0; i < N; i++)
        for (const q of perguntasTabela(pers, 8)) { total++; anotar(`gerador ${mapa}${lado} ${pers}`, q.enunciado); }
      continue;
    }
    for (const [pers, fns] of Object.entries(g)) fns.forEach((f, idx) => {
      for (let i = 0; i < N; i++) {
        const q = f(); if (!q) continue; total++;
        anotar(`gerador ${mapa}${lado} ${pers} #${idx + 1}`, q.enunciado);
        if (pers !== 'revanche') rapidinho(`gerador ${mapa}${lado} ${pers} #${idx + 1}`, q.enunciado);
      }
    });
  }
  // JSONs fixos
  const dir = path.join(RAIZ, 'dados/jogo/questoes');
  for (const arq of fs.readdirSync(dir).filter(a => a.endsWith('.json'))) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, arq), 'utf8'));
    const visitar = (o, cam) => {
      if (Array.isArray(o)) return o.forEach((x, i) => visitar(x, cam));
      if (o && typeof o === 'object') {
        if (typeof o.enunciado === 'string') { total++; anotar(`${arq} ${o.id || cam}`, o.enunciado); }
        for (const [k, v] of Object.entries(o)) if (k !== 'enunciado') visitar(v, o.id || k);
      }
    };
    visitar(d, arq);
  }

  const lista = [...achados.values()].sort((a, b) => a.regra.localeCompare(b.regra) || a.onde.localeCompare(b.onde, 'pt', { numeric: true }));
  console.log(`${total} enunciados conferidos · ${lista.length} formatos suspeitos\n`);
  let regra = '';
  for (const a of lista) {
    if (a.regra !== regra) { regra = a.regra; console.log(`\n== ${regra} ==`); }
    console.log(`  ${a.onde}${a.n > 1 ? ` (${a.n}×)` : ''}\n      ${a.exemplo}`);
  }
  process.exitCode = lista.length ? 1 : 0;
})();

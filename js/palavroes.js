// 🚫 Filtro de palavrões e ofensas (PROMPT-246: recados do livro de visitas da Exposição).
// temPalavrao(texto) → true quando o texto tem um palavrão, uma ofensa ou um insulto racista.
// Normaliza antes de comparar: minúsculas, sem acento, números no lugar de letras (p0rr4), letras repetidas
// (merdaaa), letras separadas (p o r r a) e pontuação no meio (p.o.r.r.a).

// palavras inteiras (depois de normalizar)
const INTEIRAS = new Set([
  'porra', 'caralho', 'caralha', 'merda', 'bosta', 'cu', 'cus', 'foda', 'fodase', 'foder', 'fode', 'fodido', 'fudido', 'fuder',
  'puta', 'putas', 'puto', 'putaria', 'buceta', 'boceta', 'xoxota', 'xereca', 'piroca', 'cacete', 
  'viado', 'viadinho', 'veado', 'bicha', 'boiola', 'sapatao', 'traveco', 'arrombado', 'arrombada', 'corno', 'corna',
  'vagabundo', 'vagabunda', 'vadia', 'piranha', 'safado', 'safada', 'otario', 'otaria', 'babaca', 'idiota', 'imbecil',
  'retardado', 'retardada', 'mongol', 'burro', 'burra', 'nojento', 'nojenta', 'desgraca', 'desgracado', 'desgracada',
  'fdp', 'pqp', 'vsf', 'vtnc', 'tnc', 'krl', 'crl', 'prr', 'mrd', 'cuzao', 'cuzona', 'bct', 'pnc', 
  // insultos racistas (escravo, senzala, preto, negro, nega/nego, macumba ficam liberados: são do tema e do dia a dia)
  'macaco', 'macaca', 'macacos', 'crioulo', 'crioula', 'tiziu', 'neguinho', 'neguinha', 'pretinho', 'cabelo ruim',
  'macumbeiro', 'macumbeira', 'favelado', 'favelada',
]);
// pedaços que já bastam dentro de qualquer palavra
const PEDACOS = ['porr', 'caralh', 'buceta', 'boceta', 'fdp', 'filhodaputa', 'filhadaputa', 'vaitomarnocu', 'tomarnocu', 'vtnc',
  'arromb', 'putaria', 'xoxot', 'piroc', 'cuzao', 'fodas', 'merdinh', 'krlh', 'macaquinh', 'macacada', 'criol'];

// expressões de mais de uma palavra (comparadas com as palavras juntas)
const FRASES = ['cabeloruim', 'cabelodebombril', 'servicodepreto', 'coisadepreto', 'voltapraafrica', 'voltaparaafrica', 'lugardepretoe'];

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i' };
function normalizar(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[0134578@$!]/g, (c) => LEET[c] || c)
    .replace(/(\p{L})[.\-_*]+(?=\p{L})/gu, '$1')          // p.o.r.r.a → porra
    .replace(/[^a-z\s]/g, ' ')
    .replace(/([a-z])\1{2,}/g, '$1');                      // merdaaa → merda (rr de porra fica)
}
const sem2 = (w) => w.replace(/([a-z])\1+/g, '$1');      // sem letras dobradas: merdda, porrra
export function temPalavrao(texto) {
  const n = normalizar(texto);
  const palavras = n.split(/\s+/).filter(Boolean);
  // letras soltas seguidas (p o r r a) viram uma palavra
  const juntas = [];
  let acc = '';
  for (const w of palavras) { if (w.length === 1) acc += w; else { if (acc) juntas.push(acc); acc = ''; juntas.push(w); } }
  if (acc) juntas.push(acc);
  const tudo = juntas.join('');
  for (const w of juntas) {
    if (INTEIRAS.has(w) || INTEIRAS.has(sem2(w))) return true;
    if (PEDACOS.some(p => w.includes(p) || sem2(w).includes(sem2(p)))) return true;
  }
  return FRASES.some(f => tudo.includes(f)) || PEDACOS.some(p => p.length >= 6 && tudo.includes(p));
}

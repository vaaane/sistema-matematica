// Jogo de Revisão — loja da Dona Cida, bolsa, comida, amizade e nome do pet: regras puras.
// Todos os números vêm de dados/jogo/loja.json (e os peixes, de dados/jogo/pesca.json).

let L = null;
let PEIXES = {};   // id → { nome, lealdade, raro } (todos os pontos de pesca)
export function definirLoja(json) { L = json; }
export function definirPeixes(pesca) {
  PEIXES = {};
  for (const pt of pesca?.pontos || []) for (const f of pt.peixes || []) PEIXES[f.id] = f;
}
export const lojaPronta = () => !!L?.comidas;
export const cfgLoja = () => L || {};
export const comidas = () => L?.comidas || [];
export const tintas = () => L?.tintas || [];
export const efeitos = () => L?.efeitos || [];
export const tinta = (id) => tintas().find(t => t.id === id) || null;
export const efeito = (id) => efeitos().find(e => e.id === id) || null;

// Itens da bolsa: comidas da loja pelo id; peixes pescados como "pesca_{id}" (comida especial)
export const idDoPeixe = (id) => `pesca_${id}`;
export function itemDaBolsa(id) {
  if (String(id).startsWith('pesca_')) {
    const f = PEIXES[id.slice(6)];
    return f ? { id, nome: f.nome, emoji: f.raro ? '🐠' : '🐟', lealdade: Number(f.lealdade) || 0, especial: true, peixe: true, raro: !!f.raro } : null;
  }
  const c = comidas().find(x => x.id === id);
  return c ? { ...c, lealdade: Number(c.lealdade) || 0 } : null;
}

// Favorita: o id da comida, ou "peixe" = qualquer peixe (pescado ou o peixe fresco da loja)
export function ehFavorita(pet, item) {
  const f = L?.favoritas?.[pet];
  return !!f && !!item && (f === item.id || (f === 'peixe' && (item.peixe || /peixe/.test(item.id))));
}

// Semana do ano (ISO), para o limite por semana (bolo)
export function semanaDe(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dia = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dia);
  const ini = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-S${String(Math.ceil(((t - ini) / 864e5 + 1) / 7)).padStart(2, '0')}`;
}

// Pode comer agora? null = pode; senão 'cheio' | 'sem_fome' (comum só com a barriga baixa) | 'semana'
// c.semana: { [itemId]: { semana, n } } (do próprio pet)
export function motivoNaoCome(item, barriga, c, agora = new Date()) {
  const b = L?.barriga || {};
  if (barriga >= (b.cheia ?? 100) - 0.5) return 'cheio';
  if (!item.especial && barriga >= (b.comum_ate ?? 60)) return 'sem_fome';
  if (item.limite_semana) {
    const s = c?.semana?.[item.id];
    if (s?.semana === semanaDe(agora) && (Number(s.n) || 0) >= item.limite_semana) return 'semana';
  }
  return null;
}
export const enche = () => L?.barriga?.cada_comida_enche ?? 20;

// Lealdade máxima 100; o que passar vira pontos de amizade (que nunca caem)
export function somarLealdade(lealdade, amizade, n) {
  const l = (Number(lealdade) || 0) + n, a = Number(amizade) || 0;
  return l <= 100 ? { lealdade: l, amizade: a } : { lealdade: 100, amizade: a + (l - 100) };
}
export const nivelAmizade = (pontos) => 1 + Math.floor((Number(pontos) || 0) / (L?.amizade?.pontos_por_nivel || 100));

// Nome do pet: 2–12 letras (só letras, espaços e acentos), sem palavras proibidas
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function validarNomePet(txt) {
  const cfg = L?.nome_pet || {};
  const nome = String(txt || '').replace(/\s+/g, ' ').trim();
  const min = cfg.min ?? 2, max = cfg.max ?? 12;
  if (nome.length < min || nome.length > max) return { erro: `O nome precisa ter de ${min} a ${max} letras.` };
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ ]+$/.test(nome)) return { erro: 'Use só letras e espaços.' };
  const proib = new Set((cfg.proibidas || []).map(semAcento));
  const palavras = semAcento(nome).split(' ');
  if (palavras.some(p => proib.has(p)) || proib.has(semAcento(nome).replace(/ /g, ''))) return { erro: 'Escolha outro nome 🙂' };
  return { nome };
}

// Jogo de Revisão — o que o pet fala. Todo o texto vem de dados/jogo/falas-pets.json;
// aqui só se escolhe e se monta (nenhuma frase escrita no código).
// fala = lista de balões: [{ texto, espera }] (espera = ms antes deste balão, contada do fim do anterior)

let F = null;
const ultimaDe = {};          // categoria → última frase usada (não repetir duas vezes seguidas)
const KEY_PIADAS = 'jr_piadas_usadas';

export function definirFalas(json) { F = json; }
export const falasProntas = () => !!F;
export const configFalas = () => F?.config || {};
export const dicaDe = (chave) => F?.dicas?.[chave] || null;

const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];

// Sorteia sem repetir a última frase da mesma categoria
function pegar(cat, lista) {
  if (!lista?.length) return null;
  const opcoes = lista.length > 1 ? lista.filter(f => f !== ultimaDe[cat]) : lista;
  const f = sortear(opcoes);
  ultimaDe[cat] = f;
  return f;
}

function trocar(texto, v) {
  return texto.replace(/\{(apelido|pet|ginasio|mapa|conteudo|dias|valor)\}/g, (m, k) => (v[k] ?? m));
}

const juntar = (a, b) => `${a.trim()} ${b.trim()}`;

// Piada que ainda não saiu (índices usados ficam no aparelho; quando todas saírem, recomeça)
function proximaPiada() {
  const n = F.piadas?.length || 0;
  if (!n) return null;
  let usadas = [];
  try { usadas = JSON.parse(localStorage.getItem(KEY_PIADAS) || '[]'); } catch (_) {}
  if (!Array.isArray(usadas) || usadas.length >= n) usadas = [];
  const livres = [...Array(n).keys()].filter(i => !usadas.includes(i));
  const i = sortear(livres);
  usadas.push(i);
  try { localStorage.setItem(KEY_PIADAS, JSON.stringify(usadas)); } catch (_) {}
  return F.piadas[i];
}

// ctx: { pet, apelido, nomePet, proximo: { dica, chave }, errado: { dica } | null, sequencia, agora: Date,
//        estado: 'fome' | 'voltou' | null }
// tipoForcado: 'venceu' | 'perdeu' | 'carinho' | 'fome' | 'voltou' (momentos-chave)
export function montarFala(ctx, tipoForcado = null) {
  if (!F) return null;
  const P = F.personalidades?.[ctx.pet];
  if (!P) return null;
  const v = { apelido: ctx.apelido, pet: ctx.nomePet, dias: ctx.sequencia };
  if (ctx.proximo?.dica) Object.assign(v, { ginasio: ctx.proximo.dica.ginasio, mapa: ctx.proximo.dica.mapa, conteudo: ctx.proximo.dica.conteudo });
  const um = (cat, lista, extra) => { const f = pegar(cat, lista); return f ? { tipo: extra || cat, baloes: [{ texto: trocar(f, v), espera: 0 }] } : null; };

  // momentos-chave e estado têm prioridade
  const tipoEstado = tipoForcado || ctx.estado;
  if (tipoEstado === 'voltou') return um('voltou', F.dia?.voltou, 'estado');
  if (tipoEstado) return um(tipoEstado, P[tipoEstado], tipoEstado === 'fome' ? 'fome' : 'estado');

  // sorteio pelos pesos, só entre os tipos possíveis agora
  const pesos = F.config?.pesos || {};
  const possivel = {
    dica: !!ctx.proximo?.dica,
    lembrete: !!(ctx.proximo?.dica?.lembretes?.length || ctx.errado?.dica?.lembretes?.length),
    dia: true, piada: !!F.piadas?.length, aleatorio: !!P.aleatorio?.length,
  };
  const tipos = Object.keys(possivel).filter(t => possivel[t] && (pesos[t] || 0) > 0);
  let r = Math.random() * tipos.reduce((a, t) => a + pesos[t], 0);
  const tipo = tipos.find(t => (r -= pesos[t]) < 0) || 'aleatorio';

  if (tipo === 'dica') {
    const abre = pegar('abre_dica', P.abre_dica);
    // "{abre_dica} no {ginasio} ({mapa}) vão cair questões de {conteudo}."
    const baloes = [{ texto: trocar(juntar(abre, 'no {ginasio} ({mapa}) vão cair questões de {conteudo}.'), v), espera: 0 }];
    const ft = ctx.proximo.dica.falas_treinadores;
    if (ft?.length && Math.random() < 0.5) baloes.push({ texto: `“${pegar('treinador', ft)}”`, espera: 400 });
    return { tipo, baloes };
  }
  if (tipo === 'lembrete') {
    const fonte = ctx.errado?.dica?.lembretes?.length && (Math.random() < 0.5 || !ctx.proximo?.dica?.lembretes?.length) ? ctx.errado.dica : ctx.proximo.dica;
    return { tipo, baloes: [{ texto: trocar(juntar(pegar('lembrete', P.lembrete), pegar('lembretes', fonte.lembretes)), v), espera: 0 }] };
  }
  if (tipo === 'dia') {
    const d = ctx.agora, h = d.getHours(), dow = d.getDay();
    if (ctx.sequencia >= 3 && F.dia?.sequencia?.length && Math.random() < 0.3) return um('dia_sequencia', F.dia.sequencia, 'dia');
    if ((dow === 0 || dow === 6) && F.dia?.fim_de_semana?.length && Math.random() < 0.5) return um('dia_fds', F.dia.fim_de_semana, 'dia');
    if (dow === 1 && F.dia?.segunda?.length && Math.random() < 0.5) return um('dia_segunda', F.dia.segunda, 'dia');
    if (dow === 5 && F.dia?.sexta?.length && Math.random() < 0.5) return um('dia_sexta', F.dia.sexta, 'dia');
    const per = h >= 5 && h < 12 ? 'manha' : h >= 12 && h < 18 ? 'tarde' : 'noite';
    return um(per, P[per], 'dia');
  }
  if (tipo === 'piada') {
    const pd = proximaPiada();
    if (!pd) return um('aleatorio', P.aleatorio);
    return { tipo, baloes: [
      { texto: trocar(juntar(pegar('abre_piada', P.abre_piada), pd.pergunta), v), espera: 0, fixo: 2500 },   // resposta 2,5 s depois
      { texto: pd.resposta, espera: 0 },
      { texto: trocar(pegar('ri', P.ri), v), espera: 300 },
    ] };
  }
  return um('aleatorio', P.aleatorio);
}

// Uma frase de uma lista da personalidade (ajuda_dica, ajuda_elimina, ajuda_acabou, sem_lealdade…),
// com os placeholders trocados. v: { apelido, pet, valor, … }. Sem a lista no JSON: null.
export function fraseDe(pet, cat, v = {}) {
  const f = pegar(cat, F?.personalidades?.[pet]?.[cat]);
  return f ? trocar(f, v) : null;
}
export const configAjuda = () => F?.config?.ajuda_ginasio || {};

// Duração do balão: duracao_balao_s + 1 s a cada 60 caracteres
export const duracaoBalao = (texto) => ((F?.config?.duracao_balao_s || 5) + Math.floor(texto.length / 60)) * 1000;

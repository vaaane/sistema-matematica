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
  return texto.replace(/\{(apelido|pet|ginasio|mapa|conteudo|dias|valor|dica|comida|n|tempo)\}/g, (m, k) => (v[k] ?? m));
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

// Lembrete de um ginásio que ainda não saiu (PROMPT-99): não repete nenhum dos 8 até usar todos (índices no aparelho, por ginásio)
const KEY_LEMBRETES = 'jr_lembretes_usados';
function proximoLembrete(chave, lista) {
  if (!lista?.length) return null;
  let usados = {};
  try { usados = JSON.parse(localStorage.getItem(KEY_LEMBRETES) || '{}') || {}; } catch (_) {}
  let u = Array.isArray(usados[chave]) ? usados[chave].filter(i => i < lista.length) : [];
  if (u.length >= lista.length) u = [];
  const i = sortear([...Array(lista.length).keys()].filter(k => !u.includes(k)));
  usados[chave] = [...u, i];
  try { localStorage.setItem(KEY_LEMBRETES, JSON.stringify(usados)); } catch (_) {}
  return lista[i];
}
// Dica e lembrete do MESMO ginásio: no máximo 1 vez a cada 5 min (senão vira curiosidade ou aleatório)
const MESMO_GIN_MS = 5 * 60000;
const ginFalado = {};   // chave do ginásio → quando o pet falou dele por último
const ginLivre = (chave) => !chave || Date.now() - (ginFalado[chave] || 0) >= MESMO_GIN_MS;

// ctx: { pet, apelido, nomePet, proximo: { dica, chave }, errado: { dica, chave } | null, revisar: { dica, chave } | null
//        (um ginásio vencido qualquer), sequencia, agora: Date, estado: 'fome' | 'voltou' | null, curiosidade: () => balões }
// tipoForcado: 'venceu' | 'perdeu' | 'carinho' | 'fome' | 'voltou' (momentos-chave)
export function montarFala(ctx, tipoForcado = null) {
  if (!F) return null;
  const P = F.personalidades?.[ctx.pet];
  if (!P) return null;
  const v = { apelido: ctx.apelido, pet: ctx.nomePet, dias: ctx.sequencia };
  if (ctx.proximo?.dica) Object.assign(v, { ginasio: ctx.proximo.dica.ginasio, mapa: ctx.proximo.dica.mapa, conteudo: ctx.proximo.dica.conteudo });
  const um = (cat, lista, extra) => { const f = pegar(cat, lista); return f ? { tipo: extra || cat, baloes: [{ texto: trocar(f, v), espera: 0 }] } : null; };

  const curiosidade = () => { const baloes = typeof ctx.curiosidade === 'function' ? ctx.curiosidade() : null; return baloes?.length ? { tipo: 'curiosidade', baloes } : null; };
  // 💡 pedida (primeira fala no mapa, ?falar=curiosidade no modo teste, lealdade baixa)
  if (tipoForcado === 'curiosidade') return curiosidade() || um('aleatorio', P.aleatorio);

  // momentos-chave têm prioridade; o estado (fome) entra no sorteio com o peso `estado` (PROMPT-99: não barra as outras falas)
  if (tipoForcado || ctx.estado === 'voltou') {
    const t = tipoForcado || ctx.estado;
    if (t === 'voltou') return um('voltou', F.dia?.voltou, 'estado');
    if (t === 'pesca') return um('pesca', P.pesca?.length ? P.pesca : F.pesca, 'pesca');   // perto da água
    return um(t, P[t], t === 'fome' ? 'fome' : 'estado');
  }

  // sorteio pelos pesos, só entre os tipos possíveis agora
  const pesos = F.config?.pesos || {};
  const temLemb = (x) => !!x?.dica?.lembretes?.length;
  const possivel = {
    estado: !!ctx.estado && !!P[ctx.estado]?.length,
    clima: !!ctx.clima && !!P[ctx.clima]?.length,   // 🌧️ chuva / calor / vento (PROMPT-104), só quando o clima do dia combina
    dica: !!ctx.proximo?.dica,
    lembrete: temLemb(ctx.proximo) || temLemb(ctx.errado) || temLemb(ctx.revisar),
    dia: true, piada: !!F.piadas?.length, aleatorio: !!P.aleatorio?.length,
    curiosidade: typeof ctx.curiosidade === 'function',   // 💡 curiosidades.json (PROMPT-98): quem monta é o jogo (mapa, sem repetir, figurinha)
  };
  const peso = (t) => pesos[t] ?? (t === 'curiosidade' || t === 'clima' ? 2 : 0);
  const tipos = Object.keys(possivel).filter(t => possivel[t] && peso(t) > 0);
  let r = Math.random() * tipos.reduce((a, t) => a + peso(t), 0);
  const tipo = tipos.find(t => (r -= peso(t)) < 0) || 'aleatorio';
  const outra = () => curiosidade() || um('aleatorio', P.aleatorio);   // o mesmo ginásio há menos de 5 min: troca

  if (tipo === 'clima') return um(ctx.clima, P[ctx.clima], 'clima');
  if (tipo === 'estado') return um(ctx.estado, P[ctx.estado], ctx.estado === 'fome' ? 'fome' : 'estado');
  if (tipo === 'curiosidade') return outra();

  if (tipo === 'dica') {
    if (!ginLivre(ctx.proximo.chave)) return outra();
    ginFalado[ctx.proximo.chave] = Date.now();
    const abre = pegar('abre_dica', P.abre_dica);
    // "{abre_dica} no {ginasio} ({mapa}) vão cair questões de {conteudo}."
    const baloes = [{ texto: trocar(juntar(abre, 'no {ginasio} ({mapa}) vão cair questões de {conteudo}.'), v), espera: 0 }];
    const ft = ctx.proximo.dica.falas_treinadores;
    if (ft?.length && Math.random() < 0.5) baloes.push({ texto: `“${pegar('treinador', ft)}”`, espera: 400 });
    return { tipo, baloes };
  }
  if (tipo === 'lembrete') {
    // de onde: às vezes (~30%) um ginásio vencido qualquer (para revisar); senão, o próximo ou o mais errado
    const base = [ctx.proximo, ctx.errado].filter(temLemb);
    const fonte = temLemb(ctx.revisar) && (Math.random() < 0.3 || !base.length) ? ctx.revisar : sortear(base);
    if (!fonte || !ginLivre(fonte.chave)) return outra();
    if (fonte.chave) ginFalado[fonte.chave] = Date.now();
    const l = proximoLembrete(fonte.chave || fonte.dica.ginasio, fonte.dica.lembretes);
    return { tipo, baloes: [{ texto: trocar(juntar(pegar('lembrete', P.lembrete), l), v), espera: 0 }] };
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
// Uma frase só entre as da lista que passam no filtro (ex.: as de fome que reclamam de planta). Nenhuma: null.
export function fraseFiltrada(pet, cat, filtro, v = {}) {
  const l = (F?.personalidades?.[pet]?.[cat] || []).filter(filtro);
  return l.length ? trocar(l[Math.floor(Math.random() * l.length)], v) : null;
}
export const configAjuda = () => F?.config?.ajuda_ginasio || {};
// Faro (PROMPT-32): o pet sente um tesouro escondido — frases da personalidade ou as gerais (falas-pets.json → faro)
export const frasesFaro = (pet) => (F?.personalidades?.[pet]?.faro?.length ? F.personalidades[pet].faro : F?.faro || []);

// Duração do balão: duracao_balao_s + 1 s a cada 60 caracteres
export const duracaoBalao = (texto) => ((F?.config?.duracao_balao_s || 5) + Math.floor(texto.length / 60)) * 1000;

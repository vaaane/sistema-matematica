// 🛡️ Equipes (PROMPT-235): duplas e trios para a torre em grupo e os duelos em grupo (PROMPT-236).
// Usado pelo jogo (js/jogo-revisao.js) e pela página da professora (professor/p-jogo-revisao.html).
//
//   jogo_revisao_equipes/{id}               { nome, nome_pedido, nome_recusado, emblema, cor, dono, membros: { 1|2|3: uid },
//                                             entrou: { uid: ms }, convidados: { uid: ms }, criada }
//   jogo_revisao_equipes_contador           o número da próxima "Equipe N" (transação)
//   jogo_revisao_alunos/{uid}/equipe        id (de leitura pública: a busca sabe quem já tem equipe)
//   jogo_revisao_convites_equipe/{destino}/{id}   { nome, emblema, cor, de, data }
//   modo teste: os mesmos nós com _teste.
//
// Nome: ao criar, "Equipe N" (N do contador). O dono só PEDE um nome (nome_pedido, um por vez, pode trocar enquanto espera);
// a professora aprova (vira o nome) ou recusa (nome_recusado = true: os membros veem "tente outro"). Emblema e cor: livres.
// Regras: 2 ou 3 alunos (a equipe nasce só com quem criou e vale para a torre e os duelos a partir de 2); um aluno em uma
// equipe só; o dono edita, convida e tira; quem sai perde a equipe; se sobra 1, a equipe é apagada; se o dono sai, a equipe
// passa para o membro mais antigo. Sair, tirar e apagar são uma gravação só (update em vários caminhos).
// Vagas fixas (as regras do Realtime Database não contam filhos): entrar ocupa a primeira vaga livre numa transação
// (dois aceitando juntos não passam de 3) e depois grava o "equipe" do aluno; sair libera a vaga.
// Os alunos não usam o Firebase Auth: "só o dono edita" é garantido aqui; as regras do banco garantem o formato,
// no máximo 3 membros e que só entra quem tem convite (database.rules.json).
import { db } from '/js/firebase-config.js';
import { ref, get, update, runTransaction } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { temPalavraProibida } from '/js/jogo-revisao/loja.js';

export const MAX_MEMBROS = 3, MIN_VALE = 2, NOME_MAX = 20, MAX_CONVIDADOS = 4;
export const EMBLEMAS = [
  { id: 'escudo', e: '🛡️', nome: 'Escudo' }, { id: 'estrela', e: '⭐', nome: 'Estrela' }, { id: 'raio', e: '⚡', nome: 'Raio' },
  { id: 'coroa', e: '👑', nome: 'Coroa' }, { id: 'chama', e: '🔥', nome: 'Chama' }, { id: 'dragao', e: '🐉', nome: 'Dragão' },
  { id: 'leao', e: '🦁', nome: 'Leão' }, { id: 'lua', e: '🌙', nome: 'Lua' }, { id: 'diamante', e: '💎', nome: 'Diamante' },
  { id: 'foguete', e: '🚀', nome: 'Foguete' }, { id: 'alvo', e: '🎯', nome: 'Alvo' }, { id: 'espiral', e: '🌀', nome: 'Espiral' },
];
export const CORES_EQUIPE = [
  { cor: '#7c5cfc', nome: 'Roxo' }, { cor: '#00d4ff', nome: 'Ciano' }, { cor: '#ff7b2e', nome: 'Laranja' }, { cor: '#ffd700', nome: 'Dourado' },
  { cor: '#00e676', nome: 'Verde' }, { cor: '#ff4d6d', nome: 'Vermelho' }, { cor: '#ff6ec7', nome: 'Rosa' }, { cor: '#3d7bff', nome: 'Azul' },
];
export const emblemaDe = (id) => EMBLEMAS.find(x => x.id === id) || EMBLEMAS[0];
export const corValida = (c) => CORES_EQUIPE.some(x => x.cor === c) ? c : CORES_EQUIPE[0].cor;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// o emblema pequeno: o emoji num círculo da cor da equipe (emoji não muda de cor)
export const htmlEmblema = (emblema, cor, cls = '') =>
  `<span class="eq-emb${cls ? ' ' + cls : ''}" style="--eq:${corValida(cor)}" aria-hidden="true">${emblemaDe(emblema).e}</span>`;
export const rotuloEquipe = (eq) => eq ? `${emblemaDe(eq.emblema).e} ${eq.nome || 'Equipe'}` : '';
export const htmlRotuloEquipe = (eq) => eq ? `${htmlEmblema(eq.emblema, eq.cor)} <b>${esc(eq.nome || 'Equipe')}</b>` : '';

export const bases = (teste) => {
  const s = teste ? '_teste' : '';
  return { eq: `jogo_revisao_equipes${s}`, al: `jogo_revisao_alunos${s}`, cv: `jogo_revisao_convites_equipe${s}`, n: `jogo_revisao_equipes_contador${s}` };
};
export const VAGAS = ['1', '2', '3'];
// membros { 1: uid, 2: uid } volta do Firebase como array ([null, uid, uid]): os dois jeitos servem
const vagasDe = (m) => Object.fromEntries(VAGAS.map(v => [v, typeof m?.[v] === 'string' && m[v] ? m[v] : null]));
export const membrosDe = (eq) => Object.values(vagasDe(eq?.membros)).filter(Boolean);
export const vagaDe = (eq, uid) => VAGAS.find(v => vagasDe(eq?.membros)[v] === uid) || null;
export const naEquipe = (eq, uid) => !!uid && !!vagaDe(eq, uid);
export const equipeVale = (eq) => membrosDe(eq).length >= MIN_VALE;   // torre e duelos em grupo
// o membro mais antigo (sem o "entrou": a ordem alfabética do uid, sempre a mesma em todos os aparelhos)
const maisAntigo = (eq, fora) => membrosDe(eq).filter(u => u !== fora)
  .sort((a, b) => (Number(eq.entrou?.[a]) || 0) - (Number(eq.entrou?.[b]) || 0) || a.localeCompare(b))[0] || null;

// Nome da equipe: 1 a 20 caracteres, sem palavrão (o filtro dos pets, com números no lugar de letras e letras separadas)
export function validarNomeEquipe(txt) {
  const nome = String(txt || '').replace(/\s+/g, ' ').trim();
  if (!nome) return { erro: 'Dê um nome para a equipe.' };
  if (nome.length > NOME_MAX) return { erro: `O nome pode ter até ${NOME_MAX} letras.` };
  if (!/^[\p{L}\p{N} !?.'-]+$/u.test(nome)) return { erro: 'Use letras, números e espaços.' };
  if (temPalavraProibida(nome)) return { erro: 'Escolha outro nome.' };
  return { nome };
}

const lerVal = async (p) => { const s = await get(ref(db, p)); return s.exists() ? s.val() : null; };
export const lerEquipe = (teste, id) => (id ? lerVal(`${bases(teste).eq}/${id}`) : Promise.resolve(null));
export const lerEquipeDe = (teste, uid) => lerVal(`${bases(teste).al}/${uid}/equipe`);
export async function lerTodas(teste) { return (await lerVal(bases(teste).eq)) || {}; }
export async function lerAlunos(teste) { return (await lerVal(bases(teste).al)) || {}; }

const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// o número da equipe nova: o contador sobe numa transação (duas equipes criadas juntas não pegam o mesmo número)
async function proximoNumero(teste) {
  const r = await runTransaction(ref(db, bases(teste).n), (v) => (Number(v) || 0) + 1);
  if (!r.committed) throw new Error('Não deu para criar agora. Tente de novo.');
  return Number(r.snapshot.val()) || 1;
}
export async function criarEquipe(teste, uid, { emblema, cor }) {
  if (await lerEquipeDe(teste, uid)) throw new Error('Você já tem uma equipe.');
  const B = bases(teste), id = novoId(), agora = Date.now(), n = await proximoNumero(teste);
  await update(ref(db), {
    [`${B.eq}/${id}`]: { nome: `Equipe ${n}`, emblema: emblemaDe(emblema).id, cor: corValida(cor), dono: uid, membros: { 1: uid }, entrou: { [uid]: agora }, criada: agora },
    [`${B.al}/${uid}/equipe`]: id,
  });
  return id;
}
// o dono: emblema e cor mudam na hora
export async function editarEquipe(teste, id, { emblema, cor }) {
  await update(ref(db, `${bases(teste).eq}/${id}`), { emblema: emblemaDe(emblema).id, cor: corValida(cor) });
}
// o dono pede um nome (troca o pedido que estiver esperando)
export async function pedirNome(teste, id, nome) {
  const v = validarNomeEquipe(nome);
  if (v.erro) throw new Error(v.erro);
  await update(ref(db, `${bases(teste).eq}/${id}`), { nome_pedido: v.nome, nome_recusado: null });
  return v.nome;
}
export const cancelarPedidoNome = (teste, id) => update(ref(db, `${bases(teste).eq}/${id}`), { nome_pedido: null });
// convidar: a equipe não está completa, o colega não tem equipe e ainda não foi convidado
export async function convidar(teste, id, eq, destino, deNome) {
  const B = bases(teste);
  if (membrosDe(eq).length >= MAX_MEMBROS) throw new Error('A equipe já tem 3 alunos.');
  if (naEquipe(eq, destino)) throw new Error('Já está na equipe.');
  if (Object.keys(eq.convidados || {}).length >= MAX_CONVIDADOS) throw new Error('Espere os convites que você já mandou.');
  if (await lerEquipeDe(teste, destino)) throw new Error('Esse colega já tem equipe.');
  const agora = Date.now();
  await update(ref(db), {
    [`${B.cv}/${destino}/${id}`]: { nome: eq.nome, emblema: eq.emblema, cor: eq.cor, de: String(deNome || '').slice(0, 30), data: agora },
    [`${B.eq}/${id}/convidados/${destino}`]: agora,
  });
}
export async function cancelarConvite(teste, id, destino) {
  const B = bases(teste);
  await update(ref(db), { [`${B.cv}/${destino}/${id}`]: null, [`${B.eq}/${id}/convidados/${destino}`]: null });
}
// recusar (ou o convite de uma equipe que não existe mais)
export async function recusarConvite(teste, uid, id) {
  const B = bases(teste), eq = await lerEquipe(teste, id).catch(() => null);
  const p = { [`${B.cv}/${uid}/${id}`]: null };
  if (eq) p[`${B.eq}/${id}/convidados/${uid}`] = null;
  await update(ref(db), p);
}
// aceitar: ocupa a primeira vaga livre numa transação (se ainda couber); depois o "equipe" dele e os outros convites somem
export async function aceitarConvite(teste, uid, id) {
  const B = bases(teste);
  const [eq, minha, convites] = await Promise.all([lerEquipe(teste, id), lerEquipeDe(teste, uid), lerVal(`${B.cv}/${uid}`)]);
  const tirarConvite = () => update(ref(db), { [`${B.cv}/${uid}/${id}`]: null, ...(eq ? { [`${B.eq}/${id}/convidados/${uid}`]: null } : {}) });
  if (!eq) { await tirarConvite(); throw new Error('Essa equipe não existe mais.'); }
  if (minha) { await tirarConvite(); throw new Error('Você já tem uma equipe.'); }
  const r = await runTransaction(ref(db, `${B.eq}/${id}/membros`), (m) => {
    const v = vagasDe(m);
    if (Object.values(v).includes(uid)) return;   // já está: nada a gravar
    const livre = VAGAS.find(x => !v[x]);
    if (!livre) return;                            // sem vaga: desiste
    v[livre] = uid;
    return Object.fromEntries(Object.entries(v).filter(([, u]) => u));
  });
  if (!naEquipe({ membros: r.snapshot.val() }, uid)) { await tirarConvite(); throw new Error('A equipe já está completa.'); }
  const limpar = {};
  for (const outro of Object.keys(convites || {})) { limpar[`${B.cv}/${uid}/${outro}`] = null; if (outro !== id) limpar[`${B.eq}/${outro}/convidados/${uid}`] = null; }
  try {
    await update(ref(db), { ...limpar, [`${B.eq}/${id}/entrou/${uid}`]: Date.now(), [`${B.eq}/${id}/convidados/${uid}`]: null, [`${B.al}/${uid}/equipe`]: id });
  } catch (e) {   // não gravou o "equipe" dele: devolve a vaga
    const vg = vagaDe({ membros: r.snapshot.val() }, uid);
    if (vg) update(ref(db), { [`${B.eq}/${id}/membros/${vg}`]: null }).catch(() => {});
    throw e;
  }
  return eq;
}
// apagar a equipe inteira: ela, o "equipe" de cada membro e os convites que ainda esperam
function patchApagar(teste, id, eq, convitesDe = null) {
  const B = bases(teste), p = { [`${B.eq}/${id}`]: null };
  for (const u of membrosDe(eq)) p[`${B.al}/${u}/equipe`] = null;
  for (const u of Object.keys(eq?.convidados || {})) p[`${B.cv}/${u}/${id}`] = null;
  for (const u of convitesDe || []) p[`${B.cv}/${u}/${id}`] = null;
  return p;
}
// sair (ou a professora/o dono tirar alguém): se sobra 1, apaga; se quem sai é o dono, passa para o mais antigo
export async function tirarMembro(teste, id, uid, { apagaSeSobrarUm = true } = {}) {
  const B = bases(teste), eq = await lerEquipe(teste, id);
  if (!eq) { await update(ref(db), { [`${B.al}/${uid}/equipe`]: null }); return 'sem-equipe'; }
  if (!naEquipe(eq, uid)) { if (await lerEquipeDe(teste, uid) === id) await update(ref(db), { [`${B.al}/${uid}/equipe`]: null }); return 'nao-membro'; }   // não mexe na equipe dos outros
  const ficam = membrosDe(eq).filter(u => u !== uid);
  if (ficam.length === 0 || (apagaSeSobrarUm && ficam.length === 1)) {
    await update(ref(db), { ...patchApagar(teste, id, eq), [`${B.al}/${uid}/equipe`]: null });
    return 'apagada';
  }
  const vg = vagaDe(eq, uid);
  const p = { [`${B.eq}/${id}/entrou/${uid}`]: null, [`${B.al}/${uid}/equipe`]: null };
  if (vg) p[`${B.eq}/${id}/membros/${vg}`] = null;
  if (eq.dono === uid) p[`${B.eq}/${id}/dono`] = maisAntigo(eq, uid);
  await update(ref(db), p);
  return eq.dono === uid ? 'novo-dono' : 'saiu';
}
export const sairDaEquipe = (teste, id, uid) => tirarMembro(teste, id, uid);
// o dono tira um membro: a equipe continua (mesmo que fique só ele, como recém-criada)
export const expulsar = (teste, id, uid) => tirarMembro(teste, id, uid, { apagaSeSobrarUm: false });

// professora: aprovar ou recusar o nome pedido, renomear e apagar qualquer equipe
export async function aprovarNome(teste, id) {
  const eq = await lerEquipe(teste, id);
  const v = validarNomeEquipe(eq?.nome_pedido);
  if (!eq || v.erro) throw new Error('Esse pedido não existe mais.');
  await update(ref(db, `${bases(teste).eq}/${id}`), { nome: v.nome, nome_pedido: null, nome_recusado: null });
  return v.nome;
}
export const recusarNome = (teste, id) => update(ref(db, `${bases(teste).eq}/${id}`), { nome_pedido: null, nome_recusado: true });
export async function renomearEquipe(teste, id, nome) {
  const v = validarNomeEquipe(nome);
  if (v.erro) throw new Error(v.erro);
  await update(ref(db, `${bases(teste).eq}/${id}`), { nome: v.nome, nome_pedido: null, nome_recusado: null });
  return v.nome;
}
export async function apagarEquipe(teste, id) {
  const B = bases(teste), [eq, cvs] = await Promise.all([lerEquipe(teste, id), lerVal(B.cv)]);
  const comConvite = Object.entries(cvs || {}).filter(([, v]) => v && v[id]).map(([u]) => u);
  await update(ref(db), patchApagar(teste, id, eq || {}, comConvite));
}

// ✔ Aprovações da professora (PROMPT-278): as MESMAS funções usadas pelo dashboard ("✔ Para aprovar"),
// por professor/p-jogo-revisao.html (✔ Nomes para aprovar) e por professor/p-exposicao.html. Uma regra só para cada tipo.
//
//   🎮 apelido        perfis/{uid}: apelido_status 'pendente' + apelido_pendente
//   🐾 nome de pet    jogo_revisao_nomes_pets/{uid}__{pet} (o pedido) e o pet em jogo_revisao/{uid}/pets/conquistados/{pet}
//   🛡️ nome de equipe jogo_revisao_equipes/{id}/nome_pedido (aprovarNome / recusarNome de js/jogo-revisao/equipes.js)
//   📝 nome do desafio da Exposição (alunos e visitantes)  exposicao_nomes/{uid} sem exposicao_nomes_status/{uid}
//   📖 recado do livro da Exposição  exposicao_livro/recados/{uid} sem ok = true
//   🏠 quadro com foto da casinha    jogo_revisao_casinha_fotos/{id}.status 'pendente' (a imagem em exposicao_imagens/{id})
// Modo teste: os mesmos nós com _teste (o apelido não tem nó de teste).
import { db } from '/js/firebase-config.js';
import { ref, get, set, update, remove } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { definirLoja, validarNomePet } from '/js/jogo-revisao/loja.js';
export { aprovarNome as aprovarNomeEquipe, recusarNome as recusarNomeEquipe } from '/js/jogo-revisao/equipes.js';

const sufixo = (teste) => (teste ? '_teste' : '');

// as palavras proibidas (validarNomePet / validarNomeEquipe) vêm da loja.json: carrega uma vez antes de aprovar
let lojaPronta = null;
export function garantirLoja() {
  if (!lojaPronta) lojaPronta = fetch('/dados/jogo/loja.json').then(r => r.json()).then(definirLoja).catch(e => { lojaPronta = null; throw e; });
  return lojaPronta;
}

// ── 🎮 Apelidos ───────────────────────────────────────────────
export async function aprovarApelido(uid) {
  const snap = await get(ref(db, `perfis/${uid}`));
  const p = snap.val();
  if (!p) return null;
  await update(ref(db, `perfis/${uid}`), {
    apelido_ativo:      p.apelido_pendente,
    apelido_status:     'aprovado',
    apelido_pendente:   null,
    apelido_motivo:     null,
    apelido_trocas_bim: (p.apelido_trocas_bim || 0) + 1,
  });
  return p;
}
export function recusarApelido(uid, motivo) {
  return update(ref(db, `perfis/${uid}`), {
    apelido_status:   'rejeitado',
    apelido_motivo:   motivo || '',
    apelido_pendente: null,
  });
}

// ── 🐾 Nomes de pets (PROMPT-235) ─────────────────────────────
// ✔ o pedido vira o nome (nome_aviso = 'aprovado') · ✖ nome_recusado = true (nome_aviso = 'recusado': "tente outro")
export const basePedidosPets = (teste) => `jogo_revisao_nomes_pets${sufixo(teste)}`;
export const caminhoPet = (teste, uid, pet) => `${teste ? `modo_teste_historico/${uid}/jogo_revisao` : `jogo_revisao/${uid}`}/pets/conquistados/${pet}`;
export async function decidirNomePet(teste, k, v, aprova) {
  if (!v) return;
  const caminho = caminhoPet(teste, v.uid, v.pet), s = await get(ref(db, caminho)), p = { [`${basePedidosPets(teste)}/${k}`]: null };
  if (s.exists() && s.val()?.nome_pedido === v.nome) {   // o pet ainda existe e o pedido é o mesmo (o aluno não trocou depois)
    if (aprova) {
      const r = validarNomePet(v.nome);
      if (r.erro) throw new Error(r.erro);
      Object.assign(p, { [`${caminho}/nome`]: r.nome, [`${caminho}/nome_pedido`]: null, [`${caminho}/nome_recusado`]: null, [`${caminho}/nome_aviso`]: 'aprovado' });
    } else Object.assign(p, { [`${caminho}/nome_pedido`]: null, [`${caminho}/nome_recusado`]: true, [`${caminho}/nome_aviso`]: 'recusado' });
  }
  await update(ref(db), p);
}

// ── 📝 Exposição: nomes do desafio e 📖 recados do livro (PROMPT-257 / 262) ──
export const decidirNomeExpo = (teste, uid, aprova) => set(ref(db, `exposicao_nomes_status${sufixo(teste)}/${uid}`), aprova ? 'aprovado' : 'recusado');
export const decidirRecado = (teste, uid, aprova) => {
  const base = `exposicao_livro${sufixo(teste)}/recados/${uid}`;
  return aprova ? set(ref(db, `${base}/ok`), true) : remove(ref(db, base));
};

// ── 🏠 Quadros com foto das casinhas (PROMPT-184) ─────────────
// Recusar apaga a imagem (o aluno vê ❌ e pode escolher outra). Devolve { mudou: true } se o pedido não está mais pendente.
export const lerFotoExpo = (teste, id) => get(ref(db, `exposicao_imagens${sufixo(teste)}/${id}/dados`))
  .then(s => (s.exists() && String(s.val()).startsWith('data:image/') ? s.val() : null)).catch(() => null);
export async function decidirCasaFoto(teste, id, aprova, motivo = '') {
  const r = ref(db, `jogo_revisao_casinha_fotos${sufixo(teste)}/${id}`), v = await get(r).then(s => s.val()).catch(() => null);
  if (!v || v.status !== 'pendente') return { mudou: true };
  if (aprova) { await update(r, { status: 'aprovado', rev_ts: Date.now(), motivo: null }); return { ok: true, v }; }
  await update(r, { status: 'recusado', rev_ts: Date.now(), motivo: motivo || null });
  await remove(ref(db, `exposicao_imagens${sufixo(teste)}/${id}`)).catch(e => console.warn('[aprovações] apagar a imagem', e?.code || e));
  return { ok: true, v };
}

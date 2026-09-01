// ══════════════════════════════════════════════════════════════════
//  gate-resolucao.js
//  Libera as resoluções de uma página de ATIVIDADE somente quando o
//  professor marcou aquela atividade como "corrigido" na p-vistos,
//  PARA A TURMA do aluno logado.
//
//  Como usar numa página de conteúdo (só em atividades com resolução):
//    <script type="module">
//      import { gateResolucao } from "/js/gate-resolucao.js";
//      gateResolucao();   // opcional: gateResolucao({ arquivo: "meu-arquivo.html" })
//    </script>
//
//  Marcação no HTML:
//    • Cada bloco de resolução deve ficar dentro de .res-gate
//      (o botão "Ver resposta" + a caixa .ex-answer juntos).
//    • O CSS esconde .res-gate por padrão; este módulo revela quando corrigido.
//    • Um aviso #res-aviso é inserido automaticamente no topo do conteúdo
//      enquanto não estiver liberado.
//
//  Contrato de dados (igual à p-vistos):
//    vistos/{turma}/{bimestre}/atividades/{id} = { ..., materialRef, corrigido }
//    materialRef aponta para "/conteudos/<arquivo>.html".
//    A turma vem da sessão do aluno (getSession().turma).
// ══════════════════════════════════════════════════════════════════

const norm = s => (s || "").toString().trim().replace(/[?#].*$/, "").toLowerCase();

// nome do arquivo atual, sem query/hash, ex.: "razao-e-proporcao-atividade-parte-1.html"
function arquivoAtual(override) {
  if (override) return norm(override).split("/").pop();
  return norm(location.pathname).split("/").pop();
}

// Um materialRef casa com este arquivo se terminar no mesmo nome de arquivo.
function refCasa(materialRef, arqAtual) {
  const r = norm(materialRef);
  if (!r) return false;
  return r === arqAtual || r.endsWith("/" + arqAtual) || r.split("/").pop() === arqAtual;
}

// Procura em todos os bimestres da turma a atividade vinculada a este arquivo.
// Retorna { encontrado:boolean, corrigido:boolean }.
async function consultarStatus(db, ref, get, turma, arqAtual) {
  for (const bim of [1, 2, 3, 4]) {
    let snap;
    try { snap = await get(ref(db, `vistos/${turma}/${bim}/atividades`)); }
    catch (_) { continue; }
    if (!snap || !snap.exists()) continue;
    let achou = null;
    snap.forEach(child => {
      const a = child.val() || {};
      if (refCasa(a.materialRef, arqAtual)) achou = a;
    });
    if (achou) return { encontrado: true, corrigido: !!achou.corrigido };
  }
  return { encontrado: false, corrigido: false };
}

function mostrarAviso(texto) {
  const host = document.querySelector(".au") || document.querySelector(".content") || document.body;
  if (!host || document.getElementById("res-aviso")) return;
  const box = document.createElement("div");
  box.id = "res-aviso";
  box.className = "res-aviso";
  box.innerHTML = `<span class="res-aviso-ic">🔒</span><div><b>Resolução disponível após a correção.</b><br>
    As respostas comentadas aparecem aqui assim que a atividade for corrigida em sala.</div>`;
  const hero = host.querySelector(".au-hero");
  if (hero && hero.nextSibling) host.insertBefore(box, hero.nextSibling);
  else host.insertBefore(box, host.firstChild);
}

function liberar() {
  document.documentElement.classList.add("res-liberado");
  const aviso = document.getElementById("res-aviso");
  if (aviso) aviso.remove();
}

export async function gateResolucao(opts = {}) {
  const arq = arquivoAtual(opts.arquivo);

  // Sem blocos .res-gate na página → nada a fazer (atividade sem resolução).
  if (!document.querySelector(".res-gate")) return;

  let getSession, isModoTeste, db, ref, get;
  try {
    ({ getSession, isModoTeste } = await import("/js/auth.js"));
    ({ db } = await import("/js/firebase-config.js"));
    ({ ref, get } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js"));
  } catch (_) {
    // Ambiente de preview / sem Firebase: mantém escondido e avisa.
    mostrarAviso();
    return;
  }

  // Professor em Modo Teste vê as resoluções liberadas (para conferência).
  if (typeof isModoTeste === "function" && isModoTeste()) { liberar(); return; }

  const sess = (typeof getSession === "function") ? getSession() : null;
  const turma = sess && sess.turma;

  // Sem turma na sessão → mantém travado com aviso.
  if (!turma) { mostrarAviso(); return; }

  let status;
  try { status = await consultarStatus(db, ref, get, turma, arq); }
  catch (_) { mostrarAviso(); return; }

  if (status.corrigido) liberar();
  else mostrarAviso();
}

// Auto-inicia se marcado com data-auto no script (conveniência).
if (document.currentScript && document.currentScript.dataset.auto !== undefined) {
  gateResolucao();
}

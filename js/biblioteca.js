// ─────────────────────────────────────────────────────────────────────────
// biblioteca.js — FONTE ÚNICA DA VERDADE das aulas.
// Toda tela que mostra NOME, TIPO (etiqueta) ou LINK de uma aula deve derivar
// daqui. A "biblioteca" (nó /biblioteca no Firebase, editada em p-conteudos)
// é o centro; vistos e diário apenas referenciam um item dela.
// ─────────────────────────────────────────────────────────────────────────
import { db } from "/js/firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

export const bibNorm = s => (s || "").toString().toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

const _url  = a => { a = a || ""; return a ? (a.startsWith("/") ? a : "/conteudos/" + a) : ""; };
const _path = p => { p = (p || "").toString().trim().replace(/[?#].*$/, ""); if (!p) return ""; if (!p.startsWith("/")) p = "/conteudos/" + p; return p.toLowerCase(); };
const _ehPath = r => typeof r === "string" && (r.startsWith("/") || /\.html?($|[?#])/i.test(r));

// Tipo canônico → classe CSS + rótulo. Use SEMPRE isto para desenhar a etiqueta,
// para que todas as telas fiquem idênticas.
export function tipoInfo(tipo) {
  const t = (tipo || "").toString().toLowerCase();
  if (t === "teorica" || t === "teoria")                      return { cls: "teorica",    label: "Teoria" };
  if (t === "exercicios" || t === "exercicio" || t === "atividade") return { cls: "exercicios", label: "Exercícios" };
  if (t === "projeto")                                        return { cls: "projeto",    label: "Projeto" };
  return { cls: "", label: "" };
}

// Heurística de RESERVA (só quando a aula não casa com nenhum item da biblioteca).
export function tipoPorNome(nome) {
  const n = bibNorm(nome);
  if (/teorica|teoria/.test(n)) return "teorica";
  if (/projeto|canudos|maquete|estruturas/.test(n)) return "projeto";
  if (/exerc|lista|problema|atividade|revis|questo/.test(n)) return "exercicios";
  return "";
}

// Constrói índices a partir de um mapa achatado { id: {nome, arquivo, tipo} }.
export function indexarBiblioteca(bibMap) {
  const porId = {}, porPath = {}, porNome = {};
  for (const id in (bibMap || {})) {
    const b = bibMap[id]; if (!b) continue;
    const item = { id, nome: b.nome || "", arquivo: _url(b.arquivo), tipo: b.tipo || "" };
    porId[id] = item;
    if (item.arquivo) porPath[_path(item.arquivo)] = item;
    if (item.nome)    porNome[bibNorm(item.nome)] = item;
  }
  return { porId, porPath, porNome };
}

// Carrega o nó "biblioteca" e devolve os índices (cacheado por página).
let _cache = null;
export async function carregarBibliotecaMapa(force = false) {
  if (_cache && !force) return _cache;
  const flat = {};
  try {
    const snap = await get(ref(db, "biblioteca"));
    if (snap.exists()) {
      const v = snap.val();
      for (const id in v) { const b = v[id]; if (!b) continue; flat[id] = { nome: b.nome || "", arquivo: b.arquivo || "", tipo: b.tipo || "" }; }
    }
  } catch (e) { console.warn("biblioteca:", e); }
  _cache = indexarBiblioteca(flat);
  return _cache;
}

// Resolve UMA atividade/aula contra a biblioteca (por id, por caminho, ou por nome).
// Retorna { nome, url, tipo, fonte } — SEMPRE priorizando a biblioteca.
// `atv` deve ter ao menos { materialRef, materialTitulo?, nome? }.
export function resolverAula(atv, idx) {
  idx = idx || { porId: {}, porPath: {}, porNome: {} };
  const materialRef = (atv && atv.materialRef) || "";
  const frozen = (atv && (atv.materialTitulo || atv.nome)) || "";
  let b = null;
  if (materialRef && idx.porId[materialRef]) b = idx.porId[materialRef];
  else if (_ehPath(materialRef) && idx.porPath[_path(materialRef)]) b = idx.porPath[_path(materialRef)];
  else b = idx.porNome[bibNorm(frozen)] || idx.porNome[bibNorm(atv && atv.nome)] || null;

  if (b) {
    return { nome: b.nome || frozen, url: b.arquivo || "", tipo: b.tipo || tipoPorNome(b.nome || frozen), fonte: "biblioteca" };
  }
  const url = _ehPath(materialRef) ? (materialRef.startsWith("/") ? materialRef : "/conteudos/" + materialRef) : "";
  return { nome: frozen, url, tipo: tipoPorNome(frozen), fonte: "congelado" };
}

#!/usr/bin/env node
/**
 * Gera conteudos/index.json a partir dos arquivos .html da pasta /conteudos.
 *
 * Como usar (na raiz do repositório):
 *   node gerar-index-conteudos.js
 *
 * Para dar título e tipo a um conteúdo, coloque na PRIMEIRA linha do .html
 * um comentário assim (opcional):
 *   <!-- titulo: Teoria — Números Complexos | tipo: teoria -->
 *
 * tipos sugeridos: teoria | atividade | outro
 * Se não houver comentário, o título vira o nome do arquivo e o tipo fica "outro".
 */
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "conteudos");

function meta(html, arquivo) {
  const m = html.match(/<!--\s*titulo:\s*(.*?)\s*(?:\|\s*tipo:\s*(.*?)\s*)?-->/i);
  let titulo = m && m[1] ? m[1].trim() : null;
  let tipo = m && m[2] ? m[2].trim().toLowerCase() : "outro";
  if (!titulo) {
    titulo = arquivo.replace(/\.html?$/i, "").replace(/[-_]+/g, " ").trim();
    titulo = titulo.charAt(0).toUpperCase() + titulo.slice(1);
  }
  if (!["teoria", "atividade", "outro"].includes(tipo)) tipo = "outro";
  return { titulo, tipo };
}

function main() {
  if (!fs.existsSync(DIR)) {
    console.error("Pasta 'conteudos/' não encontrada. Rode este script na raiz do repositório.");
    process.exit(1);
  }
  const arquivos = fs.readdirSync(DIR).filter(f => /\.html?$/i.test(f)).sort();
  const itens = arquivos.map(arquivo => {
    const html = fs.readFileSync(path.join(DIR, arquivo), "utf8");
    const { titulo, tipo } = meta(html, arquivo);
    return {
      id: arquivo.replace(/\.html?$/i, ""),
      arquivo: `/conteudos/${arquivo}`,
      titulo,
      tipo,
    };
  });
  const saida = { geradoEm: new Date().toISOString(), total: itens.length, itens };
  fs.writeFileSync(path.join(DIR, "index.json"), JSON.stringify(saida, null, 2) + "\n", "utf8");
  console.log(`✅ index.json gerado com ${itens.length} conteúdo(s):`);
  itens.forEach(i => console.log(`   • [${i.tipo}] ${i.titulo}  (${i.arquivo})`));
}

main();

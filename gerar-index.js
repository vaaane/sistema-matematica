#!/usr/bin/env node
/**
 * gerar-index.js — monta o index.json lendo a "ficha da aula" de cada HTML.
 *
 * Uso:
 *   node gerar-index.js [pasta_dos_htmls] [caminho_do_index]
 * Padrão:
 *   node gerar-index.js ./conteudos ./index.json
 *
 * Cada HTML precisa ter no <head>:
 *   <meta name="aula:id"       content="...">   (= nome do arquivo sem .html)
 *   <meta name="aula:tipo"     content="teoria|atividade">
 *   <meta name="aula:eixo"     content="numeros|algebra|geometria|grandezas|probestat">
 *   <meta name="aula:bimestre" content="1|2|3|4">
 *   <meta name="aula:titulo"   content="...">
 */

const fs = require('fs');
const path = require('path');

const PASTA = process.argv[2] || './conteudos';
const SAIDA = process.argv[3] || './index.json';
// prefixo da URL no site; ajuste se servir os arquivos em /aluno/conteudos/
const URL_BASE = '/conteudos';

const TIPOS_OK = new Set(['teoria', 'atividade']);
const EIXOS_OK = new Set(['numeros', 'algebra', 'geometria', 'grandezas', 'probestat']);

function meta(html, nome) {
  // aceita name antes ou depois do content, aspas simples ou duplas
  const re = new RegExp(
    '<meta[^>]*name=["\']' + nome + '["\'][^>]*content=["\']([^"\']*)["\']' +
    '|<meta[^>]*content=["\']([^"\']*)["\'][^>]*name=["\']' + nome + '["\']',
    'i'
  );
  const m = html.match(re);
  return m ? (m[1] ?? m[2]).trim() : null;
}

const itens = [];
const avisos = [];

for (const f of fs.readdirSync(PASTA)) {
  if (!f.endsWith('.html') || f.startsWith('_')) continue; // ignora _MODELO.html
  const html = fs.readFileSync(path.join(PASTA, f), 'utf8');

  const id = meta(html, 'aula:id');
  if (!id) { avisos.push(`${f}: sem ficha (aula:id) — ignorado`); continue; }

  const esperado = f.replace(/\.html$/, '');
  if (id !== esperado) avisos.push(`${f}: aula:id "${id}" != nome do arquivo "${esperado}"`);

  const tipo = meta(html, 'aula:tipo');
  const eixo = meta(html, 'aula:eixo');
  const bimRaw = meta(html, 'aula:bimestre');
  const titulo = meta(html, 'aula:titulo');
  const resumo = meta(html, 'aula:resumo');
  const tema = meta(html, 'aula:tema');
  const bimestre = bimRaw ? Number(bimRaw) : null;

  if (!TIPOS_OK.has(tipo)) avisos.push(`${f}: tipo inválido "${tipo}"`);
  if (eixo && !EIXOS_OK.has(eixo)) avisos.push(`${f}: eixo inválido "${eixo}"`);
  if (bimestre && ![1, 2, 3, 4].includes(bimestre)) avisos.push(`${f}: bimestre inválido "${bimRaw}"`);

  itens.push({
    id,
    arquivo: `${URL_BASE}/${f}`,
    titulo: titulo || id,
    resumo: resumo || null,
    tipo,
    tema: tema || null,
    eixo: eixo || null,
    bimestre,
  });
}

// base da aula = id sem o sufixo de tipo (agrupa teoria + lista da mesma aula)
const baseAula = (id) => id.replace(/[-_](teoria|lista|revisao|gabarito|jogo|prova)$/, '');
// ordena: bimestre -> tema -> aula -> teoria antes de atividade -> título
const ordemTipo = { teoria: 0, atividade: 1 };
itens.sort((a, b) =>
  (a.bimestre ?? 99) - (b.bimestre ?? 99) ||
  String(a.tema).localeCompare(String(b.tema)) ||
  baseAula(a.id).localeCompare(baseAula(b.id)) ||
  (ordemTipo[a.tipo] ?? 9) - (ordemTipo[b.tipo] ?? 9) ||
  a.titulo.localeCompare(b.titulo)
);

const out = {
  geradoEm: new Date().toISOString(),
  total: itens.length,
  itens,
};

fs.writeFileSync(SAIDA, JSON.stringify(out, null, 2) + '\n', 'utf8');

console.log(`index.json gerado: ${itens.length} itens em ${SAIDA}`);
if (avisos.length) {
  console.log('\nAvisos:');
  for (const a of avisos) console.log('  - ' + a);
}

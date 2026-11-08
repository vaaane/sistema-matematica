// Conferência do 3º bimestre (PROMPT-209) — SÓ LEITURA, não grava nada.
// Compara, para todos os alunos, a nota do 3º bimestre que o ALUNO vê (página de Notas a-notas.html e o
// resumo do menu.html: os dois usam montarBoletim de js/notas.js) com o Total da página de notas da
// PROFESSORA (professor/p-notas.html, que calcula na própria página).
//
// Como usar: abra professor/p-notas.html logada como professora, abra o console (F12) e cole este arquivo inteiro.
// No fim aparece uma tabela com os alunos que têm diferença (turma, nome, nota do aluno, nota da professora).
(async () => {
  const N = await import('/js/notas.js');
  const { ALUNOS_POR_TURMA } = await import('/js/constants.js');
  const TURMAS = ['8D', '8E', '8F', '8G', '8H'];
  const esperar = (ms) => new Promise(r => setTimeout(r, ms));
  const bimSel = document.getElementById('bimSel'), turmaSel = document.getElementById('turmaSel'), status = document.getElementById('status');
  if (!bimSel || !turmaSel) { console.error('Abra professor/p-notas.html antes de colar o script.'); return; }
  const bimAntes = bimSel.value, turmaAntes = turmaSel.value;
  const carregar = async (turma) => {
    turmaSel.value = turma; turmaSel.dispatchEvent(new Event('change'));
    await esperar(400);
    for (let i = 0; i < 120 && /Buscando|Carregando/i.test(status?.textContent || ''); i++) await esperar(250);
    await esperar(800);
  };
  bimSel.value = '3'; bimSel.dispatchEvent(new Event('change'));
  await esperar(500);
  const dif = [], todos = [];
  for (const turma of TURMAS) {
    await carregar(turma);
    for (const nome of ALUNOS_POR_TURMA[turma] || []) {
      if (/PROFESSOR|TESTE/i.test(nome)) continue;
      const prof = document.getElementById(`total-${N.slugNome(nome)}`)?.textContent?.trim() ?? '—';
      let aluno = '—';
      try { const bo = await N.montarBoletim(turma, nome, { ignorarLiberacao: true, bimestre: 3 }); aluno = bo ? N.fmtNota(bo.total) : '—'; }
      catch (e) { aluno = 'erro: ' + (e?.message || e); }
      const linha = { turma, nome, 'nota do aluno (ficha/notas/menu)': aluno, 'nota da professora (p-notas)': prof };
      todos.push(linha);
      if (aluno !== prof) dif.push(linha);
    }
  }
  bimSel.value = bimAntes; bimSel.dispatchEvent(new Event('change'));
  if (turmaAntes) { turmaSel.value = turmaAntes; turmaSel.dispatchEvent(new Event('change')); }
  console.log(`3º bimestre: ${todos.length} alunos conferidos · ${dif.length} com diferença`);
  if (dif.length) console.table(dif);
  window.conferencia3bim = { dif, todos };
  return { conferidos: todos.length, diferencas: dif };
})();

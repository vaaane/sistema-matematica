export const CONQUISTAS = {
  sessao_perfeita: { id: 'sessao_perfeita', icon: '🎯', nome: 'Sessão Perfeita',  desc: '0 erros na sessão' },
  dominio_total:   { id: 'dominio_total',   icon: '🎓', nome: 'Domínio Total',    desc: '100% de acerto (mín. 5 questões)' },
  relampago:       { id: 'relampago',       icon: '⚡', nome: 'Relâmpago',        desc: '10+ acertos rápidos' },
  recorde_pessoal: { id: 'recorde_pessoal', icon: '🏆', nome: 'Recorde Pessoal',  desc: 'Novo recorde pessoal' },
  imparavel:       { id: 'imparavel',       icon: '🔥', nome: 'Imparável',        desc: '5+ acertos seguidos' },
  em_evolucao:     { id: 'em_evolucao',     icon: '📈', nome: 'Em Evolução',      desc: '3 sessões melhorando' },
  persistente:     { id: 'persistente',     icon: '💪', nome: 'Persistente',      desc: '3ª sessão nesta atividade' },
  lider_turma:     { id: 'lider_turma',     icon: '👑', nome: 'Líder da Turma',   desc: '1º lugar na turma' },
  elite:           { id: 'elite',           icon: '🌟', nome: 'Elite',            desc: 'Top 3 no ranking geral' },
};

/**
 * @param {object} sessao  { aluno, pontuacao_bruta, acertos, erros, respondidas,
 *                           acertos_rapidos, combo_max, novoMelhor, prevMelhor }
 * @param {Array}  prevAtiv  sessões anteriores concluídas para este aluno+atividade (sem a atual), ordenadas por criadoEm
 * @param {Array}  rankTurma  [{ aluno, pontuacao }] desc, somente a turma atual
 * @param {Array}  rankGeral  [{ aluno, pontuacao }] desc, todas as turmas
 * @returns {string[]} IDs de conquistas ganhas
 */
export function calcularConquistas(sessao, prevAtiv, rankTurma, rankGeral) {
  const earned = [];
  const { aluno, acertos, erros, respondidas, acertos_rapidos, combo_max, novoMelhor, prevMelhor, pontuacao_bruta } = sessao;

  if (erros === 0 && respondidas >= 1) earned.push('sessao_perfeita');
  if (respondidas >= 5 && erros === 0 && acertos === respondidas) earned.push('dominio_total');
  if ((acertos_rapidos || 0) >= 10) earned.push('relampago');
  if (novoMelhor && prevMelhor > 0) earned.push('recorde_pessoal');
  if ((combo_max || 0) >= 5) earned.push('imparavel');

  if (prevAtiv.length >= 2) {
    const sorted = [...prevAtiv].sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0));
    const last2pts = sorted.slice(-2).map(r => r.pontuacao_bruta || r.pontuacao || 0);
    if (last2pts[1] > last2pts[0] && (pontuacao_bruta || 0) > last2pts[1]) earned.push('em_evolucao');
  }

  if (prevAtiv.length >= 2) earned.push('persistente');
  if (rankTurma.length > 0 && rankTurma[0].aluno === aluno) earned.push('lider_turma');

  const elitePos = rankGeral.findIndex(r => r.aluno === aluno);
  if (elitePos >= 0 && elitePos < 3) earned.push('elite');

  return earned;
}

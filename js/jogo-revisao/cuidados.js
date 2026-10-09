// Jogo de Revisão — cuidados com o pet: barriga (fome) e lealdade.
// Só contas, sem tela nem Firebase. Sábado, domingo e as datas de `pausas`
// (jogo_revisao_config/global/pausas: feriados, férias) não contam.

export const HORAS_BARRIGA = 72;      // de 100 a 0 em 72 horas úteis
export const PRECO_REFEICAO = 5;      // moedas
export const REFEICOES_POR_DIA = 2;   // por pet
export const CARINHOS_POR_DIA = 3;    // que contam lealdade, por pet
export const LEALDADE_INICIAL = 20;
export const LEALDADE_MIN = 10;
export const LEALDADE_DIA = 5;        // 1º dia de jogo de cada dia, pet ativo
export const LEALDADE_CAMBALHOTA = 60;

let pausas = new Set();
// aceita lista ["2026-12-25", …] ou objeto { "2026-12-25": true } (como o Firebase guarda)
export function definirPausas(v) {
  const s = new Set();
  if (Array.isArray(v)) v.forEach(d => s.add(String(d)));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) s.add(/^\d{4}-\d{2}-\d{2}$/.test(k) ? k : String(x));
  pausas = s;
}

export const diaDe = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const diaUtil = (d) => d.getDay() !== 0 && d.getDay() !== 6 && !pausas.has(diaDe(d));

// Horas entre dois instantes contando só os dias úteis (hora do aparelho)
export function horasUteis(desde, ate = Date.now()) {
  if (!(ate > desde)) return 0;
  let ms = 0;
  let ini = new Date(desde);
  while (ini.getTime() < ate) {
    const fimDia = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 1).getTime();
    const fim = Math.min(fimDia, ate);
    if (diaUtil(ini)) ms += fim - ini.getTime();
    ini = new Date(fim);
  }
  return ms / 3600000;
}

// Barriga de 0 a 100, calculada na hora (nunca salva)
export const barriga = (ultimaRefeicao, agora = Date.now()) =>
  Math.max(0, Math.min(100, 100 - 100 * horasUteis(ultimaRefeicao, agora) / HORAS_BARRIGA));

export function faixaBarriga(b) {
  if (b >= 70) return { rotulo: 'Satisfeito', cor: 'verde' };
  if (b >= 40) return { rotulo: 'Com fominha', cor: 'amarelo' };
  if (b >= 15) return { rotulo: 'Com fome', cor: 'laranja' };
  return { rotulo: 'Faminto', cor: 'vermelho' };
}

export function rotuloLealdade(l) {
  if (l >= 90) return 'Melhores amigos';
  if (l >= 60) return 'Parceiros';
  if (l >= 25) return 'Amigos';
  return 'Conhecidos';
}

const paraData = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d, 12); };

// Dias úteis depois de `de` (exclusivo) até `ate` (inclusivo), datas AAAA-MM-DD
export function diasUteisEntre(de, ate) {
  if (!de || !ate || ate <= de) return 0;
  let n = 0;
  const d = paraData(de), fim = paraData(ate);
  for (d.setDate(d.getDate() + 1); d <= fim; d.setDate(d.getDate() + 1)) if (diaUtil(d)) n++;
  return n;
}

// Quanto a lealdade perdeu até `dia` desde o último dia jogado: −2 por dia útil sem jogar, a partir do 3º
const perdaAte = (ultimoJogado, dia) => 2 * Math.max(0, diasUteisEntre(ultimoJogado, dia) - 2);

// Aplica a queda que ainda não foi aplicada (de `lealdade_dia` até hoje). Devolve null se nada mudou.
export function lealdadeComQueda(c, hoje) {
  const desde = c.lealdade_dia || c.ultimo_dia_jogado;
  const queda = perdaAte(c.ultimo_dia_jogado, hoje) - perdaAte(c.ultimo_dia_jogado, desde);
  if (queda <= 0) return null;
  return Math.max(LEALDADE_MIN, Math.min(c.lealdade, c.lealdade - queda));
}

// Contador por dia ({ dia, n }) — zera quando muda o dia
export const doDia = (cont, hoje) => (cont?.dia === hoje ? cont.n || 0 : 0);

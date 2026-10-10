// Jogo de Revisão — pedidos de ajuda das pessoas nos mapas: regras puras (quem tem pedido, prêmio, dica).
// Dados em dados/jogo/pedidos.json; a tela fica em js/jogo-revisao.js.

let P = null;
export function definirPedidos(json) { P = json; }
export const pedidosProntos = () => !!P?.pedidos?.length;
export const cfgPedidos = () => P?.config || {};
export const pedidoPorId = (id) => P?.pedidos?.find(p => p.id === id) || null;
export const todosPedidos = () => P?.pedidos || [];

// Primeiro pedido disponível da pessoa, na ordem do JSON:
// ginásio de libera_apos vencido, ainda não resolvido e a pessoa ainda não fez pedido hoje.
// venceu(chave) → bool; resolvidos: { id: { fim } }; dia: { pessoas: { npc: n } } (de hoje)
export function pedidoDisponivel(npc, { venceu, resolvidos, dia }) {
  if (!P) return null;
  if ((Number(dia?.pessoas?.[npc]) || 0) >= (cfgPedidos().pedidos_por_pessoa_dia ?? 1)) return null;
  return P.pedidos.find(p => p.npc === npc && venceu(p.libera_apos) && !resolvidos?.[p.id]?.fim) || null;
}

// Moedas de um acerto na tentativa 1 ou 2, dentro do limite do dia (só moedas de pedidos)
export function moedasDoPedido(tentativa, dia) {
  const c = cfgPedidos();
  const base = tentativa === 1 ? (c.moedas_primeira ?? 5) : (c.moedas_segunda ?? 2);
  return Math.max(0, Math.min(base, (c.limite_moedas_dia ?? 20) - (Number(dia?.moedas) || 0)));
}
export const limiteDoDiaAtingido = (dia) => (Number(dia?.moedas) || 0) >= (cfgPedidos().limite_moedas_dia ?? 20);

// Número como aparece no texto: sinal "−", milhar opcional com ponto (1000 ou 1.000)
function padraoNumero(n) {
  const abs = String(Math.abs(n)), comPonto = abs.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const corpo = abs === comPonto ? abs : `(?:${abs}|${comPonto.replace(/\./g, '\\.')})`;
  return (n < 0 ? '[−-]' : '') + corpo + '(?!\\d|,\\d)';   // 12 sim; 125 e 12,5 não
}

// Dica do pet: a primeira frase da resolução (até ";" ou "."), sem o número final (a resposta vira "?")
export function dicaPedido(p) {
  const seg = String(p?.resolucao || '').split(/;|\.(?=\s|$)/)[0].trim();
  const m = new RegExp(`(=|→|\\sé)\\s*(?:x\\s*=\\s*)?${padraoNumero(Number(p?.resposta))}`).exec(seg);
  return m ? `${seg.slice(0, m.index).trimEnd()} ${m[1].trim()} ?` : seg;
}

// O que o aluno digitou ("−12", "40") → inteiro, ou null
export function lerResposta(txt) {
  const s = String(txt || '').replace('−', '-').trim();
  return /^-?\d+$/.test(s) ? Number(s) : null;
}

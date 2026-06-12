# Sistema de Matemática — Contexto Geral para Claude Code

> Última atualização: consolidação após depuração do sistema de Duelos/Duplas (junho/2026).

## Projeto
Plataforma educacional web para alunos do 8º ano.
- Firebase Realtime Database + HTML + JavaScript (ES modules)
- Repositório: github.com/vaaane/sistema-matematica
- URL: quizdematematica.com

## Estrutura principal
- `index.html` — login individual do aluno
- `aluno/` — páginas do aluno (menu, atividades, tabuada, duelos, histórico…)
- `professor/` — painel da professora + páginas de manutenção
- `js/` — módulos compartilhados (auth.js, db.js, presenca.js, gamificacao.js, constants.js…)
- `dados/` — JSONs de questões

## Regras do sistema
- Login sempre individual, senha obrigatória, nunca salva (sessionStorage)
- Sessão expira ao fechar aba/browser
- Timeout de 5 minutos de inatividade → logout automático (limpa sessão E dupla)
- Login único absoluto: `session_token` no Firebase invalida sessões anteriores em 5s
- Broadcast entre abas via localStorage para logout imediato
- Atividade 4 excluída de todos os rankings
- Notas de atividades: somente Fase 1 (`nota_quiz`, escala 0–10); Fase 2 (`pontuacao`) ignorada
- Tabuada: individual, sem dupla
- Concluintes tabuada (nível 300) ficam só no Hall da Fama, fora do ranking em progresso
- UID do professor teste (`PROFESSOR_TESTE`) filtrado de listas públicas
- Tema escuro obrigatório (`#0d0f1a`)
- **Apelidos:** o sistema exibe `apelido_ativo || nome`. Há a página `professor/migrar_apelidos.html` que iguala `apelido_ativo` ao nome real de todos os alunos (mantendo a possibilidade de troca futura via perfil).

## Sistema de Duplas (Duelos)
- Login sempre individual; parceiro adicionado via mini-login em `duelos.html`
- Parceiro salvo em `localStorage` como `sm_dupla_duelo`, com campos: `nome`, `turma`, `dono_nome`, `dono_turma`, **`session_token`**
- `lerDuplaAtiva()` em `auth.js` valida: (a) dono == sessão atual, **(b) `session_token` == token da sessão atual**. Qualquer dupla de sessão anterior é descartada — aluno logado nunca fica em dupla órfã.
- A dupla persiste entre navegações (vem do localStorage)
- **Presença e dupla (importante):** o vínculo da dupla aparece para os outros via `presenca_online/{uid}/parceiro_nome`. `iniciarPresenca` (em `presenca.js`) **reidrata** esse campo a partir do `sm_dupla_duelo`, mas SÓ se: for o DONO da dupla E o `session_token` bater. Isso mantém a dupla visível ao navegar/voltar de partida, sem ressuscitar dupla órfã.
- Faixa global em todas as páginas mostrando dupla ativa (via `injetarFaixaDupla` em `auth.js`)
- Parceiro de duelo pode ser de qualquer turma
- Ao confirmar/remover dupla: cancela todos os desafios pendentes
- Objeto do duelo no Firebase: `criador_uid/nome/turma`, `criador_parceiro_nome/turma`, `adversario_uid/nome/turma`, `adversario_parceiro_nome/turma`, `status`, `vencedor_uid`, `encerrado_por_abandono`, `resultado/{uid}`, `placar_live/{uid}`
- Resultado salvo para os 4 envolvidos (uid principal + parceiro de cada lado); XP, ranking, conquistas e feed para os 4

### Desfazer dupla quando o parceiro reloga (regra crítica)
Quando o parceiro (ex.: Arthur) faz login, a dupla do dono (ex.: Murillo) deve ser desfeita IMEDIATAMENTE. Há duas defesas que se reforçam:
1. **`index.html` no login:** limpa `parceiro_nome` da presença de quem tem o aluno como parceiro E da própria presença; envia `notif_dupla` ao dono.
2. **`duelos.html` — reconciliação por presença:** o listener `onValue('presenca_online')` detecta quando o parceiro da dupla ativa aparece online (presença recente, < 120s) e desfaz a dupla na hora — remove `sm_dupla_duelo`, faixa, badge, limpa `parceiro_nome` da própria presença, e mostra: *"Sua dupla foi desconectada porque fez login em outro dispositivo."* Não depende do `notif_dupla` chegar.
- Listeners `notif_dupla` (em `auth.js` e `duelos.html`) NÃO têm teto de tempo — qualquer notificação válida é honrada.

## Sistema de Duplas (Atividades)
- Parceiro adicionado via mini-login em `atividades.html` (mesma turma apenas)
- Salvo em `sessionStorage` como `sm_dupla_temp` com campo `dono_nome`
- `sm_dupla_temp` limpo após salvar resultado da atividade
- Resultado salvo para os dois alunos automaticamente

## Mecânica e pontuação dos Duelos
- XP por dificuldade (`XP_DUELO` em `gamificacao.js`): fácil {vitória +15, derrota −8}, médio {+25, −13}, difícil {+40, −20}
- Duração: fácil 3min, médio 4min, difícil 5min. Timeout para aceitar: 3min.
- **Penalidade por erro:** `DUELO_ERRO_PENALIDADE = 0.5` pares descontados por erro. Por isso placares fracionários (ex.: 6.5) são LEGÍTIMOS, não bug. `fmtPts` exibe `6.5` como "6.5" e "7.0" como "7".

### Histórico de duelos — comportamento de abandono (consolidado)
Há dois caminhos de abandono, AMBOS gravam de forma idêntica e completa:
- **Botão "Sair do duelo"** → `confirmarSair()`
- **Sair navegando / botão voltar** → `encerrarPartida('abandono')`

Os dois caminhos gravam os 4 registros (quem desiste + parceiro; adversário + parceiro) com:
- Quem desiste: `resultado:'derrota'`, `abandono:true`, dados de dupla (`parceiro_nome`, `adv_parceiro_nome` etc.), e **placar real do momento** (`meus_pares: estado.meusPontos`, `adv_pares: estado.advPontos`)
- Adversário (venceu por abandono): `resultado:'vitoria'`, `ganhou_abandono:true`, dados de dupla, placar real **com perspectiva invertida** (`meus_pares: estado.advPontos`, `adv_pares: estado.meusPontos`)
- **`confirmarSair` grava `vencedor_uid` + `encerrado_por_abandono:true` no objeto do duelo** (essencial para a tag "adv. desistiu" propagar)
- `salvarHistoricoLocal` **preserva** `ganhou_abandono` se o registro já existir com a tag (evita que o fluxo `onValue` do vencedor apague a tag por corrida de escrita)

**XP na vitória por abandono = 50%** do XP normal (`Math.round(XP_DUELO[dificuldade].vitoria * 0.5)`), tanto no `xp_delta` gravado quanto no `adicionarXP` creditado, nos dois caminhos. Vitória/derrota NORMAIS continuam com XP cheio.

**Exibição do histórico (`duelos.html`):**
- Tag: `abandono` → "você desistiu"; senão `ganhou_abandono` → "adv. desistiu"
- "👥 dupla com {parceiro}" aparece sempre que `parceiro_nome` existe
- **XP exibido usa `d.xp_delta` salvo** (cai na tabela fixa só para registros antigos sem o campo) — isso garante que a vitória por abandono mostre +13 (50%), não +25
- Placar mostrado quando `meus_pares`/`adv_pares` != null

## Presença Online
- Heartbeat a cada 10s, TTL de 25s (`filtrarOnline`)
- `onDisconnect(presRef).remove()` remove a presença ao desconectar
- Alunos indisponíveis (toggle ⚔️) não aparecem na lista de online
- `iniciarPresenca` recria a presença a cada página — e reidrata `parceiro_nome` da dupla (ver Sistema de Duplas)

## Sessão e Segurança
- `sm_session` em `sessionStorage`; `session_token` no Firebase (novo login invalida anterior em 5s)
- `iniciarVerificacaoSessao(uid)` e `iniciarTimeoutInatividade(5)` em todas as páginas do aluno
- NÃO aplicar verificação/timeout em: `avaliacao_plus.html`, `competicao_plus.html`, `duelo_partida.html`, `tabuada.html`, `jogar.html`, `resultado.html`
- Professora pode encerrar todas as sessões pelo painel

## Páginas de manutenção (professor/)
- `migrar_apelidos.html` — iguala `apelido_ativo` ao nome real de todos os alunos
- `limpar_duelos_teste.html` — apaga `historico_duelos`, zera `duelos_total`/`duelos_vitorias`, e (opcional) `duelos`, `feed_global`, `notif_dupla`. Usar para limpar dados de teste sem inflar ranking.

## ⚠️ REGRAS CRÍTICAS — NÃO VIOLAR
- NÃO modificar nenhum arquivo além dos indicados
- NÃO alterar rankings, pontuação ou Firebase dos sistemas existentes sem necessidade real
- NÃO refatorar código existente
- NÃO fazer commit ou push sem permissão explícita
- Em caso de dúvida: não alterar, perguntar

## Como trabalhar com a Vanessa (preferências de entrega)
- **Entregar ARQUIVOS COMPLETOS prontos para substituir, não `.md` de patch.** O agente que aplica `.md` reinterpreta e quebra; arquivos inteiros já validados são seguros.
- **Sempre validar a sintaxe** do `<script type="module">` antes de entregar (ex.: `node --check`).
- **Confirmar o escopo da mudança** (diff) — só os blocos pretendidos devem mudar; definições e exibições intactas.
- Partir SEMPRE do estado real do projeto (não de zips antigos) — a numeração de linhas muda.
- Páginas de aplicação (ex.: `duelo_partida.html`) não funcionam abertas soltas como `file://` — precisam do servidor, Firebase e parâmetros de URL. Testar sempre no servidor.
- Registros antigos no Firebase NÃO mudam retroativamente — correções valem para dados novos.

## Aprendizados de depuração (duelos/duplas)
- **Duas fontes de verdade da dupla:** `sm_dupla_duelo` (localStorage, mostra a faixa) e `presenca_online/{uid}/parceiro_nome` (Firebase, mostra o card online). Elas divergem facilmente — manter ambas em sincronia.
- **localStorage é compartilhado entre abas da mesma origem** (inclusive anônimas). Testar múltiplos alunos exige navegadores/dispositivos diferentes, senão as duplas se cruzam (`sm_dupla_duelo` é chave global, sem uid).
- **Inspecionar o Firebase direto** via `fetch('https://…firebaseio.com/CAMINHO.json')` no console é a forma mais rápida de achar a causa real (campos vazios, flags ausentes).
- Corridas de escrita: quando dois lados gravam o mesmo registro, o último vence — gravar na fonte + preservar campos críticos.

## Próximos passos / ideias pendentes
- **Ver informações do oponente antes de desafiar (UX):** na tela de duelos (`aluno/duelos.html`), ao ver um colega no card "ONLINE AGORA" / antes de clicar em "Desafiar", mostrar dados que ajudem o aluno a decidir o confronto. A definir QUAIS informações: taxa de vitória, nível/XP, total de duelos, e/ou histórico de confrontos diretos (head-to-head) entre os dois. Decidir também o formato: número simples ao lado do nome vs. mini-card/tooltip que abre com vários dados. Fonte dos dados: `perfis/{uid}` (`duelos_total`, `duelos_vitorias`, `xp`, `nivel`). Escopo depende do formato escolhido (pequeno = só exibir números já existentes; maior = tela/modal novo).
- **Banco Firebase separado para testes (recomendado):** produção e local compartilham o mesmo `databaseURL`, então testes mexem em dados reais. Criar um projeto Firebase de desenvolvimento e trocar o `databaseURL` no `firebase-config.js` de dev evita esse risco.
- **`abrirDuplaPanel is not defined`:** erro de console observado no botão "+ Adicionar parceiro de dupla" / fechar painel. Verificar se a função está exposta no escopo certo (`window`) — bug pequeno e independente.

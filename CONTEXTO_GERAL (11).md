# Sistema de Matemática — Contexto Geral para Claude Code

> Última atualização: consolidação após depuração do sistema de Duelos/Duplas (junho/2026).
> Complemento (junho/2026): jogo Labirinto Matemático integrado + projeto futuro de Multiplayer via WebSocket (ver seções ao final). Conteúdo anterior preservado integralmente.
> Complemento (junho/2026): documentado o Sistema de login dos alunos (duas listas) ao final. Conteúdo anterior preservado integralmente.

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

---

# Jogo: Labirinto Matemático (`aluno/labirinto.html`)

> Adicionado em junho/2026, substituindo o jogo "Fugindo dos Problemas" (`aluno/runner.html`) no card de `aluno/jogos.html`. O `runner.html` foi mantido no repositório (não apagado).

## O que é
Jogo educacional onde o aluno atravessa um labirinto até o bloco com a resposta certa da operação. Timer de 10s por operação, vidas, zona segura, itens (velocidade, escudo, x2, bomba), paredes que crescem. `score` = nº de ACERTOS (não pontuação ponderada). Origem: arquivo standalone HTML+JS puro, integrado ao sistema seguindo o padrão do `runner.html`.

## Integração com o sistema (copiada do `runner.html`)
- `<script type="module">` com imports reais: `requireAluno, renderSidebarAluno, clearSession, isModoTeste, injetarFaixaDuelo, iniciarNotifDueloGlobal` (auth.js); `adicionarXP, getPerfil` (db.js); `avatarUrl, avatarConfigDefault` (gamificacao.js); `iniciarPresenca` (presenca.js); `db` (firebase-config.js).
- Chrome do sistema: `<aside class="sidebar">` + `.main` + `.topbar` (título + avatar) + `.content`. CSS de `/css/main.css`.
- `uid = (turma + '_' + alunoNome).replace(/[.#$[\]/\s]/g, '_')` — mesmo padrão de todo o sistema.
- **NÃO aplica** verificação de sessão/timeout de inatividade (é página de jogo em ação, igual `runner.html`, `tabuada.html` etc.).
- **Dois módulos `<script type="module">` separados:** o 1º faz a integração e expõe helpers em `window` (escopos de module são isolados — ver abaixo); o 2º é a lógica do jogo. A ponte entre eles é via `window._labi*`.

## Persistência (Firebase, sem localStorage)
- Recorde: `perfis/{uid}/labirinto_record`. Ao superar, credita XP via `adicionarXP` (mesma fórmula do runner: `Math.min(Math.max(Math.floor(pontos/20),5),40)`, delta vs recorde antigo, mínimo 5).
- Sessões (cada partida, p/ análise da professora): push em `perfis/{uid}/labirinto_sessoes` com `{ts, pontos, nivel_max, acertos, modo}`.
- Ranking: lido de `perfis/*/labirinto_record` (top-5, exibe `apelido_ativo || nome`). NÃO salva nome/turma no payload — já estão no uid.
- Helpers expostos em `window` pelo módulo de integração: `_labiAluno`, `_labiGetRecorde`, `_labiSalvarRecorde`, `_labiSalvarSessao`, `_labiLerRanking`.

## Controles (3 métodos: WASD, setas, mouse)
- A lógica de movimento lê `keys[p.keys.up/down/left/right]` no loop. Cada método é um keymap (`KEYMAP.wasd`/`.setas`/`.mouse`); o mouse usa chaves sintéticas (`mUp`/`mDown`/…) setadas só pelo d-pad clicável.
- **Solo:** o aluno usa qualquer método. Mobile entra direto no solo com d-pad de toque.
- **Duo (só PC):** cada jogador escolhe UM método, sem repetir (escolher trava pro outro). Tela de escolha em `#duo-ctrl-pick` aparece ao clicar "Dupla".
- **D-pad na tela aparece SÓ para quem escolheu mouse** (WASD/setas movem pelo teclado, não precisam de botão). Se ninguém usa mouse, a caixa `#desktop-dpad-box` é escondida. No mobile, o d-pad de toque aparece sempre (não há teclado físico).
- **Exposição em `window` (crítico — script é module):** todas as funções de `onclick` inline (`selectMode`, `startGame`, `cancelGame`, `labiPickCtrl`) DEVEM estar em `window`, senão os botões não funcionam. `selectMode`/`startGame` são envolvidas (wrapper) para aplicar os métodos de controle e reconstruir os d-pads.

## Layout responsivo
- **Desktop:** 3 colunas — `#side-panel` (status: nível/operação/acertos/vidas/rankings) à esquerda, `#canvas-area` no meio, `#right-panel` (d-pads de quem usa mouse) à direita. Tudo cabe na tela sem rolagem: `#wrapper` usa `height:calc(100vh - 64px - 24px)` (64px ≈ topbar do sistema — ajustar se a topbar real divergir) e o canvas se limita à altura via `aspect-ratio:1/1`. O mapa encolhe via CSS sem mexer na lógica (continua 20×20 células internas).
- **Mobile (`@media max-width:760px`):** painel lateral some, vira `#mobile-hud` (1 linha: nível · acertos · vidas + barra de tempo). Canvas na largura cheia. D-pad flutuante (`#mobile-dpad`) no rodapé, fora do mapa. Botão "Dupla" desabilitado (precisa de 2 teclados) — força solo.

## Anti-pausa por troca de aba (regra pedagógica)
- O jogo NÃO continua rodando com a aba escondida (limitação do navegador: `requestAnimationFrame` é suspenso em aba oculta — não há como contornar, e `setInterval` é estrangulado a 1×/s).
- Para impedir que o aluno use "trocar de aba" como pausa para pensar: no `visibilitychange`, ao **sair** grava `performance.now()`; ao **voltar**, aplica todo o tempo real decorrido chamando `update()` em fatias de 0.05s (mesmas do loop) — processa timeouts de operação, perda de vida e crescimento de paredes idênticos ao jogo normal. O `while` checa `gameRunning` a cada fatia, então `endGame()` (chamado dentro de `update` quando as vidas zeram) interrompe corretamente. Resultado: sair da aba não dá vantagem; o relógio correu igual.

## Bug pré-existente corrigido na integração
- `startGame` não inicializava `players=[]` junto dos outros arrays, então `spawnTeleports()`→`freeCell()` fazia `players.forEach` sobre `undefined` e quebrava (`Cannot read properties of undefined (reading 'forEach')`). Correção: adicionar `players=[]` na linha de inicialização dos arrays, antes de `spawnTeleports()`. Era bug do jogo original, mascarado no modo standalone; só apareceu no fluxo do sistema. Lição: `node --check` valida sintaxe, não ordem de inicialização em runtime — testar SEMPRE no navegador.

## Multiplayer entre dispositivos: ADIADO (ver seção WebSocket abaixo)
- O modo "duo" atual é só PC (2 jogadores no mesmo teclado/mouse). Jogar com colega em dispositivos diferentes é o próximo grande passo, via WebSocket (não Firebase).

---

# Projeto futuro: Multiplayer em tempo real via WebSocket

> Planejado em junho/2026. Objetivo duplo: (1) habilitar o labirinto multiplayer entre dispositivos; (2) aprendizado intencional de construção de sistemas online (meta da Vanessa). **Fundamentos JÁ aprendidos via piloto "quadradinhos" (passos 2 e 3 feitos — Node+Socket.IO no ar no Render). Falta o passo 4: aplicar ao labirinto.**

## Por que WebSocket e não Firebase
- O Firebase Realtime Database NÃO foi feito para estado de jogo em tempo real (posições a ~30×/seg): fica caro e com lag perceptível. É a ferramenta errada para isso.
- WebSocket mantém uma "linha aberta" bidirecional entre cliente e servidor — é o que jogos online, chats ao vivo e editores colaborativos usam. Stack típica: Node.js + Socket.IO.
- Aprender WebSocket é o que separa "site estático" de "sistema online de verdade". É o aprendizado que a Vanessa busca neste projeto.

## Duas arquiteturas possíveis (decidir antes de codar)
- **Opção A — placares sincronizados (acessível):** cada aluno joga seu próprio mapa; só um número (placar combinado/da dupla) trafega entre eles. É essencialmente o que o sistema de DUELOS já faz (cada lado isolado + `placar_live`). Reusa padrões já dominados (presença, dupla, reconciliação). Dias de trabalho.
- **Opção B — mesmo mapa ao vivo (difícil):** os dois jogadores compartilham o mesmo tabuleiro e veem o personagem um do outro se mover em tempo real. Exige sincronizar estado grande muitas vezes por segundo. Três problemas difíceis e inerentes (independentes da ferramenta): **latência** (o outro aparece "no passado"), **autoridade de estado** (quem decide onde nascem paredes/blocos, senão os mapas divergem), **interpolação de movimento** (disfarçar o lag). Semanas + habilidade nova.
- Recomendação: fazer a Opção A no labirinto primeiro (consolida fundamentos no terreno conhecido), e só depois encarar a Opção B com WebSocket.

## O que muda no projeto atual: NADA é alterado
- Hoje o projeto é ESTÁTICO (HTML/JS no navegador + Firebase como serviço pronto). O WebSocket adiciona uma peça NOVA e ISOLADA: um servidor Node.js ligado o tempo todo. Ele vive AO LADO do projeto, não dentro.
- **Firebase continua:** dono dos dados que persistem (login, recordes, XP, rankings, perfis). **WebSocket cuida só do efêmero:** posições/estado em tempo real durante a partida. Ao fim, o resultado é salvo no Firebase como sempre.
- **Login não muda:** o aluno entra no sistema do jeito atual; o jogo apenas "apresenta" o aluno já logado (nome/turma) ao servidor WebSocket. Não há segundo sistema de login.
- **Só o modo multiplayer do labirinto** conversa com o servidor. Tabuada, duelos, atividades, rankings, e os modos solo/duo-PC do labirinto não tocam nele.

## O que é genuinamente novo (infra)
- Hospedar e MANTER um servidor Node.js rodando. A hospedagem estática atual (quizdematematica.com) não faz isso. Serviços com plano grátis para começar: Render, Railway, Fly.io.
- Aprender a colocar um servidor no ar é parte valiosa do aprendizado.

## Plano de aprendizado recomendado (camadas)
1. Terminar o labirinto duo-PC atual (Firebase, sem servidor). FEITO/em finalização.
2. **Projeto-piloto separado, NÃO começar pelo labirinto:** o "dois quadradinhos" — a coisa mais simples possível que prove mover algo na tela de um e ver na tela do outro via WebSocket. O labirinto tem muita lógica de jogo que esconderia o que o WebSocket faz. Quando os quadradinhos funcionarem, o conceito está entendido. **FEITO (junho/2026 — ver "Piloto quadradinhos" abaixo).**
3. Subir esse piloto num Render/Railway (aprender deploy de servidor). **FEITO (Render, junho/2026).**
4. Só então aplicar ao labirinto (Opção A primeiro). **← PRÓXIMO PASSO.**
- Ressalva honesta: mesmo com WebSocket, o tempo-real tem armadilhas de design (latência, autoridade) difíceis por natureza. A diferença é lutar o problema real (WebSocket) em vez do problema + a ferramenta errada (Firebase RTDB).

## Piloto "quadradinhos" — passos 2 e 3 concluídos (junho/2026)
> Prova de conceito isolada, fora do `sistema-matematica` (repositório próprio `vaaane/quadradinhos`). Prova que dá pra mover algo na tela de um aparelho e ver no outro em tempo real. O labirinto NÃO foi tocado.

- **Stack:** Node.js + Express (serve a página estática de `/public`) + Socket.IO (a "linha aberta" bidirecional). `server.js` + `public/index.html` (canvas, arrastar com mouse/dedo).
- **O que o servidor faz (e o que NÃO faz):** só recebe a posição de um cliente (`mover`) e repassa aos outros (`broadcast` de `moveu`). Não decide lógica de jogo — toda a lógica fica no navegador. Estado efêmero em memória (`jogadores[socket.id]`), nada persiste. Confirma o princípio do plano: WebSocket cuida só do efêmero.
- **Porta:** `process.env.PORT || 3000`. NUNCA fixar porta em produção — o Render injeta a dele via env var. Foi o único ajuste necessário entre rodar local e rodar no Render.
- **Deploy:** Render, Web Service, plano Free. Build `npm install`, start `npm start`. Lê direto do GitHub (push → redeploy automático). HTTPS automático no domínio `*.onrender.com`.

### Duas armadilhas reais encontradas (guardar para o passo 4)
- **HTTP local vs HTTPS no celular:** abrindo pelo IP da rede local (`http://192.168.x.x:3000`), o navegador do celular force-upgrade para HTTPS e dá "não foi possível estabelecer uma conexão segura". O servidor de teste é HTTP puro. Contornos: digitar `http://` na unha (sem autocompletar), aba anônima, ou Firefox. **Some de vez no Render** (HTTPS de verdade). Roteamento 5G via hotspot Wi-Fi funciona (mesma rede); USB tethering tende a não deixar o celular acessar o PC de volta.
- **Cold start do Render Free:** o serviço hiberna após ~15 min sem tráfego; a 1ª abertura depois disso demora ~1 min pra acordar. Não é erro. Para usar com a turma: abrir o link alguns minutos antes da aula.

- Ressalva honesta sobre o piloto: ele esconde os 3 problemas difíceis da Opção B (latência, autoridade de estado, interpolação) porque move um só quadrado sem regras. O passo 4 (Opção A — placares sincronizados) reusa padrões dos duelos; a Opção B (mesmo mapa ao vivo) é onde esses problemas aparecem de verdade.

---

# Sistema de login dos alunos (duas listas — estado atual)

> Documentado em junho/2026. Houve uma tentativa de unificar as duas listas numa só; foi **revertida**. O sistema usa DUAS listas e está funcionando assim — não reunificar sem necessidade real.

## Como funciona
- Auth **customizado** — NÃO usa Firebase Auth.
- Login individual: turma + nome (dropdown) + senha (PIN). Senha nunca salva (sessionStorage).

## As duas listas (ambas precisam estar em sincronia)
1. **`ALUNOS_POR_TURMA` em `js/constants.js`** (hardcoded) — popula o **dropdown** de alunos por turma em `index.html`. É a lista local; NÃO carrega do Firebase.
2. **`aluno_senhas/{base64key}` no Firebase** — guarda a senha de cada aluno; é a fonte da verdade da **autenticação**. Objeto `{ turma, nome, hash }` (algumas entradas têm também `enc`). Chave base64: `btoa(UTF8("turma|nome"))` com `=` removido, `+`→`-`, `/`→`_`. Hash: SHA-256 de `"turma|nome|pin"`.
- Há ainda `js/nomes_completos.js` (NOMES_COMPLETOS + NOMES_POR_TURMA_COMPLETOS + `getNomeCompleto`) — usado só para o **nome completo nos diplomas**, não para login.
- Perfil do aluno: `perfis/{uid}` (XP, nível, streak, avatar…), uid = `"turma_nome"`. Criado no primeiro cadastro. (Obs.: NÃO existe `alunos/{uid}` — o path correto é `perfis/{uid}`.)

## Criar um aluno novo: atualizar OS DOIS
1. Firebase `aluno_senhas/` (para autenticar)
2. `ALUNOS_POR_TURMA` em `js/constants.js` (para aparecer no dropdown)
- O skill `/criar-aluno` (`.claude/commands/criar-aluno.md`) já faz os dois passos.
- **Risco conhecido:** se as duas listas divergirem, o aluno some do dropdown (falta no constants) ou aparece mas não loga (falta no Firebase, senha não casa). Sempre os dois.

## Aprendizado de depuração (junho/2026)
- Editar o `ALUNOS_POR_TURMA`/`constants.js` e quebrar o `export` (ou removê-lo) derruba TODAS as páginas que o importam de uma vez (`index`, `duelos`, `atividades`, várias do professor) com `does not provide an export named 'ALUNOS_POR_TURMA'`. `node --check` passa (sintaxe ok) mas o import falha — só o navegador acusa. Conferir o `export` ao editar.

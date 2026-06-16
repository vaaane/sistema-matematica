# Sistema de Matemática — quizdematematica.com

## ⚠️ REGRA ABSOLUTA — GIT
**NUNCA executar `git commit`, `git push`, ou qualquer operação git sem a professora pedir explicitamente.**
Isso inclui: commit automático após mudanças, push após commit, amend, stash push, ou qualquer variação.
Se precisar salvar trabalho: apenas informar "alterações prontas para commit quando você quiser".

---

## Instruções gerais
- Sempre mostrar o que foi alterado antes de qualquer operação git
- Perguntar antes de modificar arquivos fora do escopo da tarefa
- Reportar inconsistências encontradas antes de corrigir

---

## Stack
- HTML/CSS/JS puro (sem frameworks frontend)
- Firebase Realtime Database + Firebase Auth
- Deploy via Cloudflare Pages (repositório GitHub: vaaane/sistema-matematica)
- Servidor local: `http-server` na porta 8080

---

## Estrutura de pastas
```
/
├── aluno/          # Páginas do aluno
├── professor/      # Páginas do professor
├── js/             # Scripts compartilhados (auth.js, db.js, etc)
├── css/            # Estilos globais (main.css)
├── torneios/       # Arquivos JSON de configuração de torneios
│   └── torneio_negativos.json
├── teste.html      # Acesso rápido ao modo teste
└── CLAUDE.md       # Este arquivo
```

---

## Design e tema
- Tema: **dark** — fundo `#0d0f1a`, nunca usar fundo branco
- Fontes: Rajdhani (títulos), Orbitron (números), Inter (texto)
- Paleta: roxo `#7c5cfc`, cyan `#00d4ff`, laranja `#ff7b2e`, dourado `#ffd700`, verde `#00e676`
- Mobile-first: breakpoint principal em 768px
- Usar `dvh` em vez de `vh` para mobile
- Sem frameworks CSS externos — usar variáveis CSS do `main.css`

---

## Firebase — estrutura de dados principal

### Alunos e auth
- `ranking_geral/{uid}`: ranking geral do quiz
- `ranking_turmas/{turma}/{uid}`: ranking por turma

### Sistema de login dos alunos
- Auth customizado — **não usa Firebase Auth**
- `aluno_senhas/{base64key}`: senha cadastrada — objeto `{ turma, nome, hash }`
  - Chave base64: `btoa(UTF8("turma|nome"))` sem `=`, `+`→`-`, `/`→`_`
  - Hash: SHA-256 de `"turma|nome|pin"`
- `perfis/{uid}`: perfil do aluno (XP, nível, streak, avatar…) — uid = `"turma_nome"`
  - Criado no primeiro cadastro; só existe após o aluno ser registrado
- O dropdown de login (`index.html`) usa a lista **local** `ALUNOS_POR_TURMA` de `js/constants.js`
  - **Não** carrega do Firebase — é hardcoded
- Para criar um aluno novo: obrigatório atualizar **os dois**:
  1. Firebase `aluno_senhas/` (para autenticar)
  2. `ALUNOS_POR_TURMA` em `js/constants.js` (para aparecer no dropdown)
- Usar o skill `/criar-aluno` — já faz os dois passos

### Tabuada
- `tabuada_niveis/{uid}`: progresso individual (nivel_atual, melhor_nivel, historico)
- `tabuada_ranking/{uid}`: ranking público (nome, turma, nivel_atual, melhor_nivel)
- `tabuada_sessoes/{timestamp}`: sessões jogadas
- `tabuada_presenca/{uid}`: presença online
- `tabuada_config/global`: configurações globais (tempo_base, dificuldade)
- `professor_tabuada_niveis/{uid}`: progresso do professor (separado dos alunos)

### Quiz / Atividades
- `resultados/{uid}/{sessaoId}`: resultados das atividades
- `avaliacoes_sessoes/{atividadeId}/{uid}`: sessões de avaliação (tentativas, timestamps)
- `quiz_sessoes/{timestamp}`: sessões de quiz para analytics

### Torneios
- `torneio_ativo/{turma}/{torneioId}`: torneios liberados por turma
- `torneio_resultados/{torneioId}/{uid}`: pontuação em tempo real
- `torneio_historico/{torneioId}`: resultados finais
- `torneio_historico/{torneioId}/turmas/{turma}/ranking`: ranking por turma
- `torneio_recordes/{uid}/{tipoTorneio}`: recordes pessoais

### Analytics
- `analytics/tabuada/{date}/{uid}_{timestamp}`: sessões da tabuada
- `analytics/quiz/{date}/{uid}_{timestamp}`: sessões do quiz

### Modo teste
- `modo_teste_historico/{uid}/atividades/{timestamp}`: histórico de atividades no modo teste
- `modo_teste_historico/{uid}/tabuada/{timestamp}`: histórico da tabuada no modo teste
- `modo_teste_historico/{uid}/torneios/{timestamp}`: histórico de torneios no modo teste
- `professor_tabuada_config/tempo_override/{nivel}`: ajustes de tempo por nível

---

## Regras críticas de negócio

### Atividade 4
- **NUNCA incluir no ranking geral, por turma, ou em qualquer estatística pública**
- Pode aparecer apenas no histórico individual do aluno (com aviso discreto)
- Filtrar por: `atividade.id === 'Atividade 4'` ou `atividade.nome.includes('Atividade 4')`

### Modo teste
- Usuário Firebase: `professor.teste@quizdematematica.com`
- Senha: `professorteste2426`
- Identificar com: `localStorage.getItem('modoTeste') === 'true'`
- Helper: `isModoTeste()` — disponível em arquivo compartilhado
- **NUNCA salvar dados do modo teste em paths reais dos alunos**
- **NUNCA exibir usuário modo teste em rankings ou listas públicas**
- Filtrar por uid do professor.teste em todas as queries públicas
- Dados do modo teste vão para `modo_teste_historico/{uid}/...`

### PROFESSOR_TESTE
- Filtrar de todas as listas públicas onde nome contém 'PROFESSOR' ou 'TESTE'
- Não exibir em rankings, histórico geral, ou estatísticas

### Duplas
- Sistema de duplas na tabuada: ao jogar em dupla, selecionar qual aluno salva o progresso
- O nível do tabuleiro é gerado baseado no aluno selecionado para salvar
- Migração de duplas: `professor/migrar_duplas.html`

---

## Tabuada — regras de nível

### Grid
- Níveis normais: máximo 6×4 desktop / 4×6 mobile = 24 cards = 12 pares
- Chefão GRANDE: máximo 6×6 desktop / 4×6 mobile
- Chefão DIFÍCIL: 5×4 desktop / 4×5 mobile = 20 cards = 10 pares
- Chefão RÁPIDO: 6×4 desktop / 4×6 mobile = 24 cards
- `cols × rows` deve ser SEMPRE número par
- Usar `visibility: hidden` ao eliminar pares (não `display: none`) para evitar buracos

### Progressão de dificuldade
- Níveis 1-79: progressão normal
- Níveis 80-121: dificuldade do 79 + tempo +20s a partir do 80
- Níveis 122-129: dificuldade do 121, tempo = tempo_121 + 20s
- Nível 130+: sistema de chefões a cada múltiplo de 10
  - 130, 160, 190... = Chefão RÁPIDO (tempo -15s)
  - 140, 170, 200... = Chefão DIFÍCIL (operações mais complexas)
  - 150, 180, 210... = Chefão GRANDE (grid maior)
- Níveis 122+: faixas de 10 com mesma dificuldade
- **Nível 400**: conquista especial — bônus +0,5 na média final

### Conquistas especiais
- Nível 400: `tabuada_conquistas/{uid}/nivel400: true` — notificar professor

---

## Quiz / Avaliação+

### Atividade 5 — Geometria: Triângulos
- Modo: Avaliação+
- 8 questões: 2 fáceis + 4 médias + 1 difícil = 10pts máximo
- Pontuação: fácil/médio = 1pt, difícil = 3pts
- 3 tentativas OU 25 minutos (o que acabar primeiro)
- Timer por tentativa: 8 minutos
- Ao esgotar 8min: salvar nota parcial, permitir nova tentativa
- Aluno escolhe qual tentativa usar como nota final
- Mapa de questões: aluno escolhe a ordem

### Ranking
- Considerar apenas Atividade 5 em diante (não Atividade 4)
- Formato: "X / Y pts" onde Y = atividades realizadas × 10
- Desempate: maior pontuação → mais sessões → alfabético

---

## Torneio

### Arquivo de configuração
- `torneios/torneio_negativos.json`: configuração do torneio de números negativos
- Progressão: níveis 1-5 (sem duplo negativo), 6-10 (com duplo negativo), 11-15 (+multiplicação), 16-20 (+divisão), 21+ (tudo)
- Pares: níveis 1-10 = 6 pares, 11-20 = 10 pares, 21+ = aumenta gradativamente

### Regras
- Torneio é aberto por turma independentemente
- `torneio_ativo/{turma}/{torneioId}` — cada turma tem seu próprio status
- Pontuação: acerto +1pt, erro -0,5pt (mínimo 0), combo 3+ = +0,5 extra, tabuleiro perfeito = +2pts
- Modo teste: `torneio_ativo/TESTE/{torneioId}` com `status: 'teste_permanente'`
- Torneio de teste sempre disponível, sem necessidade de iniciar pelo professor

---

## Páginas principais

### Aluno
- `aluno/menu.html`: página inicial
- `aluno/atividades.html`: lista de atividades
- `aluno/torneios.html`: lista de torneios
- `aluno/historico.html`: histórico de atividades + torneios (não tabuada)
- `aluno/jogos.html`: hub da tabuada (ranking, mapa de níveis, estatísticas)
- `aluno/tabuada.html`: jogo da tabuada
- `aluno/torneio.html`: página do torneio
- `aluno/ranking.html`: ranking (abas: Tabuada, Fase 1, Fase 2, Por Atividade)
- `aluno/avaliacao_plus.html`: modo avaliação do quiz

### Professor
- `professor/dashboard.html`: visão geral
- `professor/atividades.html`: gerenciar atividades
- `professor/torneio.html`: criar e controlar torneios
- `professor/torneio_tv.html`: tela da TV para torneios
- `professor/acompanhamento.html`: progresso individual dos alunos
- `professor/acompanhamento_avaliacao.html`: acompanhamento ao vivo das avaliações
- `professor/tabuada_relatorio.html`: relatório da tabuada
- `professor/analytics.html`: analytics gerais
- `professor/jogos.html`: modo professor para jogar tabuada
- `professor/migrar_duplas.html`: migração de dados de duplas

### Acesso especial
- `teste.html`: acesso rápido ao modo teste (senha: professorteste2426)

---

## Padrões de código

### CSS
- Usar variáveis CSS definidas em `main.css`
- Sidebar sticky: `position: sticky; left: 0; z-index: 2`
- Tabelas largas: `overflow-x: auto` no container
- Layout sem scroll na tabuada: `display: grid; grid-template-rows: auto auto auto 1fr auto; height: 100dvh`

### JavaScript
- Verificar auth Firebase antes de qualquer operação
- Sempre usar try/catch em operações Firebase
- Skeleton loading: sempre chamar `esconderSkeleton()` no `finally`
- Event delegation para elementos gerados dinamicamente
- Nunca usar `position: absolute` em cards do grid da tabuada

### Firebase
- Leitura: `get(ref(db, path))`
- Escrita: `set()` ou `push()`
- Tempo real: `onValue()` ou `onSnapshot()`
- Sempre verificar `.exists()` antes de `.val()`

---

## Turmas
- 8D, 8E, 8F, 8G, 8H
- Turma especial: TESTE (modo teste)

## Duplas conhecidas (8D) — dados migrados
- João Pedro ↔ Lucas Gabriel
- Ana Júlia ↔ Ketelly
- Alice Tavares ↔ Alice Paz

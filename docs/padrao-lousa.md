# Padrão das lousas (resumos das Aulas e cartão do erro)

Este padrão vale para **todas** as lousas do modelo novo (`layout: "v2"`, `js/jogo-revisao/quadro.js`): 4-A, 4-B, 5-A, 10-A, 10-B, 11-A, 11-B, 12-A, 12-B, 13-A e 13-B, e as próximas.
Os tamanhos estão em **% da largura da lousa** (`cqw`). Assim ficam iguais no PC e no celular.

## Conteúdo (como montar as páginas)
- **Uma situação por página.** Figuras ou problemas diferentes (ex.: a cerca de um terreno e a volta numa quadra; a sala, o terreno e o lado) vão em páginas separadas. Se precisar comparar, as duas figuras aparecem juntas.
- **A regra vem antes do exercício.** Primeiro uma página que explica (ex.: por que os ângulos do triângulo somam 180°), depois a página do exercício.
- **Nada é usado antes de ser explicado** (ex.: o ângulo reto é explicado antes dos quadriláteros).
- **Primeiro o jeito "na mão", depois o jeito rápido** (ex.: contar os quadradinhos de 1 a 12, depois 3 × 4).

## Áreas
| Área | Onde | O que vai |
|---|---|---|
| Etiqueta | no alto, **faixa do meio** (de 26% a 74% da largura) | nome do conceito (MÉDIA, MODA…) e o subtítulo curto |
| Pergunta | embaixo da etiqueta, faixa do meio | a pergunta da vez, **uma frase por linha**; quebra se for comprida |
| Histórico | esquerda, **desde o alto da lousa** até a linha pontilhada | as contas que já foram, em ordem |
| Foco (centro) | entre o histórico e a lateral, embaixo da pergunta | a conta da vez (o único lugar com animação) |
| Lateral | direita, embaixo da pergunta | tabuada, tabela, pilhas, contagem |
| Base | embaixo da **linha pontilhada** | as regras |

- **Nada passa da linha pontilhada nem fica em cima dela.** A linha pode descer se precisar.
- A pergunta **não vai para o histórico**: fica no alto enquanto vale. Quando muda, troca no alto.
- Tabela de 4 colunas: a lateral fica mais larga (35%) para a letra não ficar abaixo do mínimo.
- Página sem histórico (ex.: "Qual afirmação é verdadeira?"): o foco usa a largura que sobra.
- **Figura grande** (perímetro e área no 11, plano cartesiano no 12): fica na lateral larga (35%) **desde o alto da lousa**, para ficar grande. Nessas páginas, a etiqueta e a pergunta ficam centradas sobre a área da conta (entre o histórico e a figura), e a conta fica mais afastada da figura (o foco termina em 41%) e um pouco menor (5,2).
- **Vitrine (comparar várias figuras):** sem histórico e sem lateral. A figura grande é feita no alto, à esquerda (ex.: o ângulo abrindo, o polígono com os lados contados), e uma cópia pequena voa para o seu lugar numa fileira embaixo, centralizada; depois aparecem o nome e a explicação.

## Letras
| Texto | Tamanho | Cor |
|---|---|---|
| Etiqueta | 2,3 (subtítulo 2,2) | azul (subtítulo branco) |
| Pergunta | **3,1** (as **medidas** sublinhadas em amarelo: 3 cm, 12 m, 50°) | branca, letra de mão |
| Conta do centro | 6 (diminui só se não couber na largura ou na altura) | branca |
| Passo (some no passo seguinte) | 2,6 | branca, letra de mão |
| Detalhe (fica) | 2,4; no histórico **2** | amarela, letra de mão |
| Resposta final | 5,2; **nunca menor que 3,5** (se não couber, quebra em 2 linhas) | **verde**, numa caixa verde |
| Regra | 2,5 | amarela, sublinhada |
| Lateral | 2 a 2,2 | branca |
| Histórico | a conta a 50% (nunca menor que o mínimo) | branca (o verde é só da resposta final) |
| Contagem 1, 2, 3…, rótulo de seta (× 5, ÷ 2), número da tabela | mínimo 2 | azul |
| **Mínimo para qualquer texto** | **2** (≈ 14 px num celular deitado) | — |

- **Mínimo no histórico:** a conta não encolhe abaixo do mínimo. Os detalhes não encolhem com ela: vão **embaixo da conta**, no tamanho mínimo. Se não couber, **a conta mais antiga sai**; a letra não diminui.
- Nada de rótulo pequeno dentro da conta (ex.: "meninos:"). O rótulo vira detalhe embaixo dela.
- Conta larga no histórico: **quebra em linhas** (nunca fica cortada nem diminui abaixo do mínimo).
- A conta **nasce no tamanho certo** (nunca aparece grande e diminui depois).
- Na resposta final, o **número e a unidade nunca se separam** (14&nbsp;cm).

## Cores
- **Verde**: só a resposta final (e o ✔).
- **Amarelo**: detalhe, regra, vírgula que anda, o que é destaque (moda circulada).
- **Azul**: etiqueta, setas, contagem.
- **Vermelho**: erro (✖, riscado, pegadinha).
- Apagadinho (opacidade baixa): o que não é a resposta (ex.: números que não são moda).
- **Comparação:** cada coisa comparada tem a sua cor (laranja e lilás) na pergunta (com moldura), na figura e na conta.
- **Coordenadas: x sempre laranja (`#ffa45c`), y sempre lilás (`#d4a6ff`)**: no ponto (x, y), nos nomes e no destaque dos eixos, no caminho do ponto (para o lado laranja, para cima/baixo lilás), na contagem das casas, na linha tracejada até o eixo e nas contas `x: …` / `y: …`.

## Comportamento
- **Pergunta nova:** espera o aluno ler antes da primeira anotação. A pausa é 2 s + 0,16 s por palavra no protótipo; no jogo fica × 2 em 1×, como todos os tempos.
- **Fim de toda página:** a resposta certa aparece no centro, na caixa verde, com **a pergunta no alto**. A tabuada sai. Tabela, pilhas e barras ficam, e a contagem da moda sai.
- **Pegadinha:** nunca termina no erro. O jeito certo aparece embaixo, com ✔.
- **Média:** sempre conta quantos números são (1, 2, 3… embaixo de cada um).
- **Setas:** o número de destino ocupa o lugar dele (invisível) antes de a seta ser desenhada. O rótulo da seta fica fora dos números.
- **Expressão:** cada "=" começa uma linha nova.
- **Regra de três:** sempre os mesmos 3 passos, com o mesmo texto: **1º monta a tabela** (cada grandeza numa coluna, o x em amarelo) → **2º setas** (a da coluna do x para baixo; a outra no mesmo sentido se for direta, oposta em vermelho se for inversa, e aí **inverte a coluna**: os dois números trocam de lugar) → **3º multiplica cruzado** (linhas laranja e lilás) e resolve, um "=" por linha. A tabela fica no quadro até o fim (não vai para o histórico), com a resposta embaixo.
- **Direta ou inversa vem antes da regra de três**, em páginas só sobre isso, sem conta: tabela com 3 linhas, as setas uma por vez, "dobrou → dobrou" ou "dobrou → caiu pela metade". **A seta aponta para o número maior.** Pergunta sempre igual: "aumenta ou diminui?" → mesma direção (direta) ou contrária (inversa). As duas diminuindo **também é direta**.
- **Equação:**
  - **balança** na lateral: caixa laranja = x, quadradinho azul = 1, "menos" = quadradinho tracejado vermelho (o que falta), x ÷ 2 = meia caixa;
  - cada passo aparece na balança: o que sai dos dois lados fica apagado com borda vermelha, o que entra fica amarelo, e na divisão cada caixa ganha um grupo de quadradinhos de uma cor;
  - primeiro "na mão" (tira dos dois lados), depois o atalho: o termo que passa fica destacado e uma **seta curva** leva ele para depois do "=", com o rótulo ("passa e vira − 7");
  - duas etapas: **primeiro o + ou −, depois o × ou ÷**, cada etapa num cartão;
  - toda página termina com a linha "confere: … ✔" antes da resposta verde.
- **Frase → equação:** a frase é dividida em pedaços e cada pedaço acende com o sinal embaixo; depois a equação aparece inteira. Esses pedaços saem antes de a conta ir para o histórico (ficariam menores que o mínimo).
- **Expressão com letra:** a letra é uma **caixa** (laranja; a 2ª letra, lilás). `2x` = duas caixas, `x ÷ 2` = meia caixa, `x²` = quadrado de lado x. Cada coisa da lateral tem o rótulo em cima.
- **Valor numérico:** a caixa abre e mostra o número (amarelo); na conta, o número que entrou no lugar da letra também fica amarelo. Negativo entra sempre entre parênteses.
- **Simplificar:** desde a primeira linha, os termos de cada grupo têm a mesma cor (x laranja, números ou 2ª letra lilás); o sinal vai pintado junto com o termo.
- **Múltiplo e divisor:** sempre mostra a divisão e o resto ("sobra 0 ✔" / "sobra 2 ✖"). Na lateral, os quadradinhos em fileiras (cada fileira de uma cor, contadas 1, 2, 3…); o que sobra fica com borda vermelha. Múltiplos também como pulos na reta.
- **Porcentagem:** a grade de 100 na lateral, pintando a parte. Cada atalho (÷ 2, ÷ 10, ÷ 4, ÷ 5, ÷ 100) vem com o "1 parte de quantas".
- **Testar opções:** quando a pergunta tem opções, testa uma por linha; as que não servem ficam apagadinhas.
- **× e ÷ por 10, 100, 1000:** o quadro das casas (M C D U , d c) na lateral; cada resultado entra numa linha nova com os algarismos já na casa certa (amarelos) e o rótulo "← 2 casas" / "vírgula →".
- **Negativos:** toda soma e subtração é feita na reta: ponto de partida, pulos contados, ponto de chegada. Reta longa: números de 2 em 2 (ou de 5 em 5) e contagem de 5 em 5. × e ÷: sempre "1º a conta sem sinal, 2º os sinais".
- **Expressões:** a lista "A ordem" fica na lateral e acende o passo da vez. Na conta, a parte que vai ser feita fica sublinhada em amarelo na própria linha (não escreve a linha de novo); o resultado entra na linha seguinte, em amarelo.
- **Perímetro:** uma linha amarela **percorre o contorno** (com uma bolinha na ponta) e cada lado entra na soma quando ela passa.
- **Plano cartesiano:** o ponto anda casa por casa (primeiro o x, depois o y) e as casas são contadas. Com negativos, os eixos mostram só os números pares para a letra não ficar abaixo do mínimo.
- **Celular deitado:** o jogo gira a tela. Toda posição (setas, número voando, ida para o histórico) é medida **nas coordenadas da lousa** (função `mapa()` do protótipo), nunca direto com `getBoundingClientRect`.
- **Velocidade:** 1× (padrão) é a metade da antiga, e também tem 2× e 4×.

## Protótipos de referência
`referencia/lousa-10a.html`, `lousa-10b.html`, `lousa-11a.html`, `lousa-11b.html`, `lousa-12a.html`, `lousa-12b.html`, `lousa-13a.html` e `lousa-13b.html` (abrir com `?girar` no fim do endereço para ver a lousa girada como no celular).

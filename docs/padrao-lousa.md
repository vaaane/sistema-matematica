# Padrão das lousas (resumos das Aulas e cartão do erro)

Este padrão vale para **todas** as lousas do modelo novo (`layout: "v2"`, `js/jogo-revisao/quadro.js`): 4-A, 4-B, 5-A, 12-A, 12-B, 13-A e 13-B, e as próximas.
Os tamanhos estão em **% da largura da lousa** (`cqw`). Assim ficam iguais no PC e no celular.

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
- **Plano cartesiano** (12-A, 12-B): fica na lateral larga (35%) **desde o alto da lousa**, para ficar grande. Nessas páginas, a etiqueta e a pergunta ficam centradas sobre a área da conta (entre o histórico e o plano).

## Letras
| Texto | Tamanho | Cor |
|---|---|---|
| Etiqueta | 2,3 (subtítulo 2,2) | azul (subtítulo branco) |
| Pergunta | **3,1** | branca, letra de mão |
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

## Cores
- **Verde**: só a resposta final (e o ✔).
- **Amarelo**: detalhe, regra, vírgula que anda, o que é destaque (moda circulada).
- **Azul**: etiqueta, setas, contagem.
- **Vermelho**: erro (✖, riscado, pegadinha).
- Apagadinho (opacidade baixa): o que não é a resposta (ex.: números que não são moda).
- **Coordenadas: x sempre laranja (`#ffa45c`), y sempre lilás (`#d4a6ff`)**: no ponto (x, y), nos nomes e no destaque dos eixos, no caminho do ponto (para o lado laranja, para cima/baixo lilás), na contagem das casas, na linha tracejada até o eixo e nas contas `x: …` / `y: …`.

## Comportamento
- **Pergunta nova:** espera o aluno ler antes da primeira anotação. A pausa é 2 s + 0,16 s por palavra no protótipo; no jogo fica × 2 em 1×, como todos os tempos.
- **Fim de toda página:** a resposta certa aparece no centro, na caixa verde, com **a pergunta no alto**. A tabuada sai. Tabela, pilhas e barras ficam, e a contagem da moda sai.
- **Pegadinha:** nunca termina no erro. O jeito certo aparece embaixo, com ✔.
- **Média:** sempre conta quantos números são (1, 2, 3… embaixo de cada um).
- **Setas:** o número de destino ocupa o lugar dele (invisível) antes de a seta ser desenhada. O rótulo da seta fica fora dos números.
- **Expressão:** cada "=" começa uma linha nova.
- **Plano cartesiano:** o ponto anda casa por casa (primeiro o x, depois o y) e as casas são contadas. Com negativos, os eixos mostram só os números pares para a letra não ficar abaixo do mínimo.
- **Celular deitado:** o jogo gira a tela. Toda posição (setas, número voando, ida para o histórico) é medida **nas coordenadas da lousa** (função `mapa()` do protótipo), nunca direto com `getBoundingClientRect`.
- **Velocidade:** 1× (padrão) é a metade da antiga, e também tem 2× e 4×.

## Protótipos de referência
`referencia/lousa-12a.html`, `lousa-12b.html`, `lousa-13a.html` e `lousa-13b.html` (abrir com `?girar` no fim do endereço para ver a lousa girada como no celular).

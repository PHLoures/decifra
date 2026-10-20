# Decifra

Jogo de palavras em português com cara de placar de estádio, alma de fliperama e cores em tons pastel. Todo dia sai uma **rodada** nova com 7 fases, de palavras de 4 a 10 letras, em três modos: Clássico, **Dueto** e **Quarteto**. Você gasta **fichas** para chutar, pode pedir **dicas** e soma **pontos** no placar do dia.

## Outros jogos da coleção

O botão de controle no topo abre o menu com os outros jogos, todos no mesmo visual:

- **Conexões** (`conexoes/`): um desafio por dia com 16 palavras para separar em 4 grupos escondidos. São 4 erros permitidos e os grupos vão do fácil (amarelo) à pegadinha (roxo). Os desafios ficam em `conexoes/desafios.js`; para acrescentar, siga a regra comentada no topo do arquivo, que garante uma solução única.
- **Campo Minado** (`campo-minado/`): no estilo do Campo Minado do Google, com Fácil (10×8, 10 minas), Médio (18×14, 40), Difícil (24×20, 99) e Impossível (36×30, 250), grama quadriculada e terrinha voando ao cavar. Tocar cava; segurar, clique direito ou a ferramenta **bandeira** marca. O primeiro toque nunca é mina, as minas estouram uma a uma quando você perde, e tem cronômetro e melhor tempo por nível.
- **Cobrinha** (`cobrinha/`): no estilo do Snake do Google, com movimento suave, setas, W A S D, deslizar o dedo ou botões. Menu de opções com tamanho do campo (pequeno/fácil, médio, grande/difícil e gigante/impossível, 40×34), velocidade, modo (clássico, sem bordas, muros), quantas frutas aparecem (1, 3, 5 ou a bomba, que explode num monte de frutas — cerca de 10% do campo — que renascem a cada uma comida), a fruta, a cor da cobra e o tema. O recorde vale para cada combinação de tamanho, velocidade e modo.
- **Tetris** (`tetris/`): regras modernas, com sacola de 7 peças, giro com ajuste nas paredes, peça fantasma, peça guardada e as 3 próximas. No teclado: setas ou W A S D, espaço para soltar de vez, X/Z (ou E/Q) para girar, C para guardar e P para pausar; no celular, botões na tela ou gestos no campo (tocar gira, arrastar move, deslizar para baixo solta). Quatro dificuldades pelo nível inicial (1, 5, 10 e 15); o nível sobe a cada 10 linhas, e o recorde de pontos fica guardado por dificuldade.
- **Memória** (`memoria/`): cartas que viram em 3D com 18 desenhos feitos à mão. Fácil (6 pares), Médio (8), Difícil (12) e Impossível (18). Errou? Tocar na próxima carta já esconde o par errado. Cronômetro, jogadas e recordes de tempo e de jogadas por nível.
- **Flappy** (`flappy/`): em tela cheia, com o céu de ponta a ponta (no celular em pé o céu cresce para cima; no computador aparecem mais canos à frente) e um botão para esconder a barra do navegador. Toque em qualquer lugar, clique, espaço, ↑ ou W para bater asa e passar entre os canos. Fácil, Médio, Difícil e Impossível (vão menor, cenário mais rápido e, no Impossível, canos que sobem e descem). Durante o voo o cenário acelera 1% por segundo, até 60% mais rápido, com um aviso a cada 10%. Medalhas de bronze (10), prata (20), ouro (40) e platina (80), e recorde por nível.

## Como funciona o Decifra

- **Fases:** uma palavra por tamanho (4, 5, 6, 7, 8, 9 e 10 letras), na ordem que você quiser.
- **Modos:** **Clássico** (1 palavra), **Dueto** (2 palavras ao mesmo tempo, 1 ficha a mais) e **Quarteto** (4 palavras, 3 fichas a mais), cada um com fases de 4 a 10 letras. No Dueto e no Quarteto cada chute vale para todos os tabuleiros, e cada tecla mostra a situação da letra em cada um.
- **Fichas:** cada chute gasta uma ficha. São 6 fichas nas fases de 4 e 5 letras, 7 nas de 6 e 7, e 8 nas de 8 a 10.
- **As letras acendem:**
  - menta (verde-claro) com um traço embaixo: a letra está no lugar certo;
  - pêssego com um ponto embaixo: a letra está na palavra, mas em outro lugar;
  - apagada: a letra não está na palavra.
- **Dica:** revela a próxima letra ainda desconhecida (no Dueto e no Quarteto, do primeiro tabuleiro em aberto) e custa uma ficha. Não dá para usar na última ficha.
- **Pontos:** `100 × letras` por palavra decifrada e, fechando a fase, mais `50 × letras` por ficha que sobrou, para cada palavra. No Dueto e no Quarteto as palavras decifradas pontuam mesmo se a fase não fechar. A soma das fases é o placar do dia, e o melhor dia vira recorde.
- **Compartilhar:** um resumo da rodada, com as fichas usadas e os pontos de cada fase.

A rodada muda todo dia à meia-noite (horário de Brasília) e é a mesma para todo mundo.

## Recursos

- Acentos e cedilha preenchidos sozinhos (digite `aviao`, aparece `AVIÃO`)
- Milhares de palavras aceitas como palpite em cada tamanho, com plurais e conjugações
- Toque numa peça para escolher onde escrever
- Histórico com recorde, dias seguidos e desempenho por fase
- Sons sintetizados no navegador: clique de teclado mecânico com notinhas que sobem conforme você digita (e descem quando apaga), letras que acendem com som e jingles de fliperama
- Alto contraste e opção de ENTER à esquerda
- Funciona sem internet e pode ser instalado no celular (PWA)
- Sem servidor, sem cadastro e sem rastreamento: tudo fica no navegador

## Rodar no computador

As listas de palavras são carregadas por `fetch`, então o jogo precisa de um servidor local. Só é preciso ter o [Node.js](https://nodejs.org):

```bash
node ferramentas/servidor.js
```

Depois abra http://localhost:8765.

## Testes

```bash
node --test testes/*.test.js
```

## Listas de palavras

Os arquivos `dados/4.txt` a `dados/10.txt` são gerados a partir da coleção [fserb/pt-br](https://github.com/fserb/pt-br) (licença MIT, veja `LICENSE-palavras.txt`). Cada um tem duas linhas: as respostas possíveis (já embaralhadas) e todas as palavras aceitas como palpite.

```bash
git clone https://github.com/fserb/pt-br /tmp/pt-br
python3 ferramentas/gerar_palavras.py /tmp/pt-br
```

- Para tirar uma palavra das respostas, coloque-a em `ferramentas/fora.txt`, na seção do tamanho dela.
- Para incluir uma, use `ferramentas/extras.txt`: ela entra no fim da lista, sem mudar as palavras dos dias já jogados.

## Publicar

O jogo é um site estático: dá para publicar no GitHub Pages (Settings → Pages → branch `main`, pasta `/`) ou em qualquer hospedagem de arquivos. Ao mudar a lista de arquivos do jogo, aumente a `VERSAO` em `sw.js`.

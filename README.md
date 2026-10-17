# Decifra

Jogo de palavras em português com cara de placar de estádio e alma de fliperama. Todo dia sai uma **rodada** nova com 7 fases, de palavras de 4 a 10 letras, em três modos: Clássico, **Dueto** e **Quarteto**. Você gasta **fichas** para chutar, pode pedir **dicas** e soma **pontos** no placar do dia.

## Como funciona

- **Fases:** uma palavra por tamanho (4, 5, 6, 7, 8, 9 e 10 letras), na ordem que você quiser.
- **Modos:** **Clássico** (1 palavra), **Dueto** (2 palavras ao mesmo tempo, 1 ficha a mais) e **Quarteto** (4 palavras, 3 fichas a mais), cada um com fases de 4 a 10 letras. No Dueto e no Quarteto cada chute vale para todos os tabuleiros, e cada tecla mostra a situação da letra em cada um.
- **Fichas:** cada chute gasta uma ficha. São 6 fichas nas fases de 4 e 5 letras, 7 nas de 6 e 7, e 8 nas de 8 a 10.
- **As letras acendem:**
  - verde com um traço embaixo: a letra está no lugar certo;
  - dourada com um ponto embaixo: a letra está na palavra, mas em outro lugar;
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
node --test testes/logica.test.js
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

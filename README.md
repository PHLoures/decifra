# Decifra

Jogo de decifrar a palavra do dia, em português, com visual de placar de estádio e um toque de fliperama. Você tem 6 tentativas para descobrir uma palavra de 5 letras; a cada palpite as peças acendem mostrando o quão perto você chegou.

- 🟩 verde: a letra está na palavra e na posição certa
- 🟨 dourado: a letra está na palavra, mas em outra posição
- 🟦 apagada: a letra não está na palavra

## Modos

| Modo     | Palavras | Tentativas |
|----------|----------|------------|
| Solo     | 1        | 6          |
| Dueto    | 2        | 7          |
| Quarteto | 4        | 9          |

A palavra muda todo dia à meia-noite (horário de Brasília) e é a mesma para todo mundo.

## Recursos

- Acentos e cedilha preenchidos sozinhos (digite `aviao`, aparece `AVIÃO`)
- Mais de 10 mil palavras aceitas como palpite (com plurais e conjugações) e cerca de 1.400 respostas escolhidas entre as mais comuns
- Toque numa peça para escolher onde escrever; setas, Home e End também funcionam
- Estatísticas por modo, sequência de vitórias e resultado para compartilhar
- Modo difícil, alto contraste e opção de ENTER à esquerda
- Funciona sem internet e pode ser instalado no celular (PWA)
- Sem servidor, sem cadastro e sem rastreamento: tudo fica no navegador

## Rodar no computador

Não precisa instalar nada além do [Node.js](https://nodejs.org):

```bash
node ferramentas/servidor.js
```

Depois abra http://localhost:8765. Também dá para abrir o `index.html` direto no navegador, só que sem o modo offline.

## Testes

```bash
node --test testes/logica.test.js
```

## Lista de palavras

O arquivo `js/palavras.js` é gerado a partir da coleção [fserb/pt-br](https://github.com/fserb/pt-br) (licença MIT, veja `LICENSE-palavras.txt`):

```bash
git clone https://github.com/fserb/pt-br /tmp/pt-br
python3 ferramentas/gerar_palavras.py /tmp/pt-br
```

Para tirar uma palavra das respostas, coloque-a em `FORA`; para incluir uma, use `EXTRAS` (assim as palavras dos dias já jogados não mudam).

## Publicar

O jogo é um site estático: dá para publicar no GitHub Pages (Settings → Pages → branch `main`, pasta `/`) ou em qualquer hospedagem de arquivos. Ao mudar a lista de arquivos do jogo, aumente a `VERSAO` em `sw.js`.

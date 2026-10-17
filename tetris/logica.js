// Regras do Tetris, sem nada de tela (testadas em testes/tetris.test.js).
// Segue as regras modernas: sacola de 7 peças, giro SRS com ajuste nas paredes,
// peça guardada, fantasma, pontuação clássica e nível subindo a cada 10 linhas.
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.LogicaTetris = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const COLS = 10;
  const LINHAS = 22; // as 2 primeiras ficam escondidas, acima do campo
  const ESCONDIDAS = 2;

  // Posição 0 de cada peça dentro da sua caixa (4×4 para I e O, 3×3 para as outras)
  const BASE = {
    I: { caixa: 4, celulas: [[0, 1], [1, 1], [2, 1], [3, 1]] },
    O: { caixa: 4, celulas: [[1, 0], [2, 0], [1, 1], [2, 1]] },
    T: { caixa: 3, celulas: [[1, 0], [0, 1], [1, 1], [2, 1]] },
    S: { caixa: 3, celulas: [[1, 0], [2, 0], [0, 1], [1, 1]] },
    Z: { caixa: 3, celulas: [[0, 0], [1, 0], [1, 1], [2, 1]] },
    J: { caixa: 3, celulas: [[0, 0], [0, 1], [1, 1], [2, 1]] },
    L: { caixa: 3, celulas: [[2, 0], [0, 1], [1, 1], [2, 1]] },
  };
  const TIPOS = Object.keys(BASE);

  // As 4 rotações de cada peça (girando a caixa no sentido horário)
  const ROTACOES = {};
  for (const t of TIPOS) {
    const { caixa, celulas } = BASE[t];
    const estados = [celulas];
    for (let r = 1; r < 4; r++) estados.push(estados[r - 1].map(([x, y]) => [caixa - 1 - y, x]));
    ROTACOES[t] = t === "O" ? [celulas, celulas, celulas, celulas] : estados;
  }

  // Ajustes de parede do SRS (y para baixo). Chave: "de>para".
  const AJUSTES = {
    "0>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "1>0": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    "1>2": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    "2>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "2>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    "3>2": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "3>0": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "0>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  };
  const AJUSTES_I = {
    "0>1": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    "1>0": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    "1>2": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    "2>1": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    "2>3": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    "3>2": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    "3>0": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    "0>3": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  };

  const PONTOS_LINHAS = [0, 100, 300, 500, 800];
  // Dificuldade inicial: nível em que a partida começa
  const DIFICULDADES = {
    facil: { nome: "Fácil", nivel: 1 },
    medio: { nome: "Médio", nivel: 5 },
    dificil: { nome: "Difícil", nivel: 10 },
    impossivel: { nome: "Impossível", nivel: 15 },
  };

  // Tempo (ms) para a peça cair uma linha, como nas versões modernas
  const intervaloQueda = (nivel) => Math.max(16, Math.round(1000 * Math.pow(0.8 - (Math.min(nivel, 20) - 1) * 0.007, Math.min(nivel, 20) - 1)));

  const celulasDe = (p) => ROTACOES[p.tipo][p.rot].map(([x, y]) => [p.x + x, p.y + y]);

  function colide(e, p) {
    return celulasDe(p).some(([x, y]) => x < 0 || x >= COLS || y >= LINHAS || (y >= 0 && e.grade[y][x]));
  }

  // Sacola: as 7 peças embaralhadas, uma de cada antes de repetir
  function novaSacola(aleatorio) {
    const s = [...TIPOS];
    for (let i = s.length - 1; i > 0; i--) {
      const j = Math.floor(aleatorio() * (i + 1));
      [s[i], s[j]] = [s[j], s[i]];
    }
    return s;
  }
  function puxar(e) {
    while (e.fila.length < 7) e.fila.push(...novaSacola(e.aleatorio));
    return e.fila.shift();
  }

  function nascer(e, tipo) {
    e.atual = { tipo, rot: 0, x: 3, y: 0 };
    e.podeGuardar = true;
    if (colide(e, e.atual)) e.fim = true;
  }

  function criar({ dificuldade = "facil", aleatorio = Math.random } = {}) {
    const nivelInicial = (DIFICULDADES[dificuldade] || DIFICULDADES.facil).nivel;
    const e = {
      grade: Array.from({ length: LINHAS }, () => Array(COLS).fill(null)),
      fila: [],
      aleatorio,
      guardada: null,
      podeGuardar: true,
      pontos: 0,
      linhas: 0,
      nivelInicial,
      nivel: nivelInicial,
      fim: false,
      atual: null,
    };
    nascer(e, puxar(e));
    return e;
  }

  function mover(e, dx) {
    const p = { ...e.atual, x: e.atual.x + dx };
    if (e.fim || colide(e, p)) return false;
    e.atual = p;
    return true;
  }

  // Gira (+1 horário, -1 anti-horário) tentando os ajustes de parede do SRS
  function girar(e, sentido) {
    if (e.fim || e.atual.tipo === "O") return false;
    const de = e.atual.rot;
    const para = (de + sentido + 4) % 4;
    const tabela = e.atual.tipo === "I" ? AJUSTES_I : AJUSTES;
    for (const [dx, dy] of tabela[`${de}>${para}`]) {
      const p = { ...e.atual, rot: para, x: e.atual.x + dx, y: e.atual.y + dy };
      if (!colide(e, p)) {
        e.atual = p;
        return true;
      }
    }
    return false;
  }

  // Desce uma linha; devolve false se já está apoiada
  function cair(e) {
    const p = { ...e.atual, y: e.atual.y + 1 };
    if (e.fim || colide(e, p)) return false;
    e.atual = p;
    return true;
  }
  const noChao = (e) => colide(e, { ...e.atual, y: e.atual.y + 1 });

  // Linha onde a peça pararia se caísse direto (para o fantasma)
  function fantasma(e) {
    let p = { ...e.atual };
    while (!colide(e, { ...p, y: p.y + 1 })) p = { ...p, y: p.y + 1 };
    return p;
  }

  // Descida rápida (soft drop): 1 ponto por linha
  function descer(e) {
    if (!cair(e)) return false;
    e.pontos += 1;
    return true;
  }

  // Queda direta (hard drop): 2 pontos por linha; a peça trava em seguida
  function soltar(e) {
    let n = 0;
    while (cair(e)) n++;
    e.pontos += 2 * n;
    return n;
  }

  // Fixa a peça no campo e devolve as linhas que ficaram cheias (ainda não removidas,
  // para a tela poder piscá-las antes)
  function travar(e) {
    for (const [x, y] of celulasDe(e.atual)) if (y >= 0) e.grade[y][x] = e.atual.tipo;
    // Travou inteira acima do campo visível: fim de jogo
    if (celulasDe(e.atual).every(([, y]) => y < ESCONDIDAS)) e.fim = true;
    const cheias = [];
    for (let y = 0; y < LINHAS; y++) if (e.grade[y].every(Boolean)) cheias.push(y);
    return cheias;
  }

  // Remove as linhas cheias, pontua, sobe de nível e traz a próxima peça
  function concluir(e, cheias) {
    for (const y of cheias) {
      e.grade.splice(y, 1);
      e.grade.unshift(Array(COLS).fill(null));
    }
    const subiuDeNivel = Math.floor((e.linhas + cheias.length) / 10) > Math.floor(e.linhas / 10);
    e.pontos += PONTOS_LINHAS[cheias.length] * e.nivel;
    e.linhas += cheias.length;
    e.nivel = e.nivelInicial + Math.floor(e.linhas / 10);
    if (!e.fim) nascer(e, puxar(e));
    return { subiuDeNivel, tetris: cheias.length === 4 };
  }

  // Guarda a peça atual (uma vez por peça); se já havia uma guardada, troca
  function guardar(e) {
    if (e.fim || !e.podeGuardar) return false;
    const tipo = e.atual.tipo;
    if (e.guardada) nascer(e, e.guardada);
    else nascer(e, puxar(e));
    e.guardada = tipo;
    e.podeGuardar = false;
    return true;
  }

  const proximas = (e, n = 3) => {
    while (e.fila.length < n) e.fila.push(...novaSacola(e.aleatorio));
    return e.fila.slice(0, n);
  };

  return {
    COLS, LINHAS, ESCONDIDAS, TIPOS, ROTACOES, DIFICULDADES, PONTOS_LINHAS, intervaloQueda,
    celulasDe, colide, criar, mover, girar, cair, noChao, fantasma, descer, soltar, travar, concluir, guardar, proximas,
  };
});

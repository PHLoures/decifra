// Regras da Cobrinha, sem nada de tela (testadas em testes/cobrinha.test.js).
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.LogicaCobrinha = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const DIRECOES = { cima: [0, -1], baixo: [0, 1], esquerda: [-1, 0], direita: [1, 0] };
  const OPOSTA = { cima: "baixo", baixo: "cima", esquerda: "direita", direita: "esquerda" };
  // Milissegundos por passo
  const VELOCIDADES = {
    lenta: { nome: "Lenta", ms: 165 },
    normal: { nome: "Normal", ms: 120 },
    rapida: { nome: "Rápida", ms: 82 },
  };
  // Tamanhos do campo, como no Snake do Google (largura × altura, deitado)
  const TAMANHOS = {
    pequeno: { nome: "Pequeno", nivel: "fácil", cols: 10, linhas: 9 },
    medio: { nome: "Médio", nivel: "médio", cols: 17, linhas: 15 },
    grande: { nome: "Grande", nivel: "difícil", cols: 24, linhas: 21 },
  };
  // classico: bater na borda perde · sem-bordas: atravessa para o outro lado · muros: cada fruta cria um bloco
  const MODOS = {
    classico: { nome: "Clássico" },
    "sem-bordas": { nome: "Sem bordas" },
    muros: { nome: "Muros" },
  };
  const QUANTIDADES = [1, 3, 5];

  const mesma = (a, b) => a.x === b.x && a.y === b.y;
  const ocupada = (e, x, y) =>
    e.cobra.some((p) => p.x === x && p.y === y) ||
    e.muros.some((p) => p.x === x && p.y === y) ||
    e.comidas.some((p) => p.x === x && p.y === y);

  // Casa livre ao acaso; "longeDaCabeca" evita que algo nasça bem na frente da cobra
  function sortearLivre(e, aleatorio = Math.random, longeDaCabeca = 0) {
    const cab = e.cobra[0];
    const livres = [];
    for (let y = 0; y < e.linhas; y++) {
      for (let x = 0; x < e.cols; x++) {
        if (ocupada(e, x, y)) continue;
        if (longeDaCabeca && Math.abs(x - cab.x) + Math.abs(y - cab.y) < longeDaCabeca) continue;
        livres.push({ x, y });
      }
    }
    return livres.length ? livres[Math.floor(aleatorio() * livres.length)] : null;
  }

  // Começa com 4 gomos no meio da esquerda, indo para a direita, com a primeira fruta à frente
  function criar(cols, linhas, opcoes = {}, aleatorio = Math.random) {
    const y = Math.floor(linhas / 2);
    const x = Math.max(3, Math.floor(cols / 4) + 2);
    const e = {
      cols, linhas,
      modo: MODOS[opcoes.modo] ? opcoes.modo : "classico",
      cobra: [{ x, y }, { x: x - 1, y }, { x: x - 2, y }, { x: x - 3, y }],
      dir: "direita",
      fila: [],
      muros: [],
      comidas: [],
      pontos: 0,
      vivo: true,
      venceu: false,
    };
    e.comidas.push({ x: Math.min(cols - 2, x + Math.max(2, Math.floor(cols / 3))), y });
    const quantas = Math.max(1, opcoes.frutas || 1);
    while (e.comidas.length < quantas) {
      const c = sortearLivre(e, aleatorio, 2);
      if (!c) break;
      e.comidas.push(c);
    }
    return e;
  }

  // Guarda até 3 viradas, para curvas rápidas não se perderem entre um passo e outro.
  // Não deixa voltar para trás (bateria no próprio corpo).
  function virar(e, dir) {
    if (!DIRECOES[dir]) return false;
    const ultima = e.fila.length ? e.fila[e.fila.length - 1] : e.dir;
    if (dir === ultima || dir === OPOSTA[ultima] || e.fila.length >= 3) return false;
    e.fila.push(dir);
    return true;
  }

  function passo(e, aleatorio) {
    if (!e.vivo) return { parado: true };
    if (e.fila.length) e.dir = e.fila.shift();
    const [dx, dy] = DIRECOES[e.dir];
    let cabeca = { x: e.cobra[0].x + dx, y: e.cobra[0].y + dy };
    let atravessou = false;
    if (e.modo === "sem-bordas") {
      const nx = (cabeca.x + e.cols) % e.cols;
      const ny = (cabeca.y + e.linhas) % e.linhas;
      atravessou = nx !== cabeca.x || ny !== cabeca.y;
      cabeca = { x: nx, y: ny };
    }
    const qual = e.comidas.findIndex((c) => mesma(c, cabeca));
    const comeu = qual >= 0;
    // O rabo sai do lugar neste passo (a não ser que a cobra cresça), então dá para encostar nele
    const corpo = comeu ? e.cobra : e.cobra.slice(0, -1);
    const fora = cabeca.x < 0 || cabeca.y < 0 || cabeca.x >= e.cols || cabeca.y >= e.linhas;
    if (fora || corpo.some((p) => mesma(p, cabeca)) || e.muros.some((p) => mesma(p, cabeca))) {
      e.vivo = false;
      return { bateu: true };
    }
    e.cobra.unshift(cabeca);
    let muro = null;
    if (comeu) {
      e.pontos++;
      e.comidas.splice(qual, 1);
      const nova = sortearLivre(e, aleatorio, 2) || sortearLivre(e, aleatorio);
      if (nova) e.comidas.push(nova);
      if (e.modo === "muros") {
        muro = sortearLivre(e, aleatorio, 4);
        if (muro) e.muros.push(muro);
      }
      if (!e.comidas.length) {
        e.venceu = true;
        e.vivo = false;
      }
    } else {
      e.cobra.pop();
    }
    return { comeu, atravessou, muro };
  }

  return { DIRECOES, OPOSTA, VELOCIDADES, TAMANHOS, MODOS, QUANTIDADES, criar, virar, passo, sortearLivre };
});

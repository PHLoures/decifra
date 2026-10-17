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

  const mesma = (a, b) => a.x === b.x && a.y === b.y;

  function sortearComida(e, aleatorio = Math.random) {
    const livres = [];
    for (let y = 0; y < e.linhas; y++) {
      for (let x = 0; x < e.cols; x++) if (!e.cobra.some((p) => p.x === x && p.y === y)) livres.push({ x, y });
    }
    return livres.length ? livres[Math.floor(aleatorio() * livres.length)] : null;
  }

  // Começa com 4 gomos no meio da esquerda, indo para a direita
  function criar(cols, linhas, aleatorio) {
    const y = Math.floor(linhas / 2);
    const x = Math.floor(cols / 4) + 2;
    const e = {
      cols, linhas,
      cobra: [{ x, y }, { x: x - 1, y }, { x: x - 2, y }, { x: x - 3, y }],
      dir: "direita",
      fila: [],
      pontos: 0,
      vivo: true,
      venceu: false,
    };
    e.comida = { x: Math.min(cols - 2, x + Math.floor(cols / 3)), y };
    if (e.cobra.some((p) => mesma(p, e.comida))) e.comida = sortearComida(e, aleatorio);
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
    const cabeca = { x: e.cobra[0].x + dx, y: e.cobra[0].y + dy };
    const comeu = e.comida && mesma(cabeca, e.comida);
    // O rabo sai do lugar neste passo (a não ser que a cobra cresça), então dá para encostar nele
    const corpo = comeu ? e.cobra : e.cobra.slice(0, -1);
    const fora = cabeca.x < 0 || cabeca.y < 0 || cabeca.x >= e.cols || cabeca.y >= e.linhas;
    if (fora || corpo.some((p) => mesma(p, cabeca))) {
      e.vivo = false;
      return { bateu: true };
    }
    e.cobra.unshift(cabeca);
    if (comeu) {
      e.pontos++;
      e.comida = sortearComida(e, aleatorio);
      if (!e.comida) {
        e.venceu = true;
        e.vivo = false;
      }
    } else {
      e.cobra.pop();
    }
    return { comeu };
  }

  return { DIRECOES, OPOSTA, VELOCIDADES, criar, virar, passo, sortearComida };
});

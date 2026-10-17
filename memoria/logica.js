// Regras do Jogo da Memória, sem nada de tela (testadas em testes/memoria.test.js).
// Vira duas cartas por jogada: se forem iguais ficam abertas; se não, voltam a esconder.
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.LogicaMemoria = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Tamanho deitado (no celular em pé, linhas e colunas trocam)
  const NIVEIS = {
    facil: { nome: "Fácil", pares: 6, cols: 4, linhas: 3 },
    medio: { nome: "Médio", pares: 8, cols: 4, linhas: 4 },
    dificil: { nome: "Difícil", pares: 12, cols: 6, linhas: 4 },
    impossivel: { nome: "Impossível", pares: 18, cols: 6, linhas: 6 },
  };

  const SIMBOLOS = [
    "estrela", "coracao", "lua", "sol", "folha", "peixe", "flor", "nota", "gota",
    "raio", "nuvem", "diamante", "coroa", "sino", "cogumelo", "balao", "maca", "casa",
  ];

  function embaralhar(lista, aleatorio) {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(aleatorio() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Sorteia quais desenhos entram e embaralha os pares na mesa
  function criar({ pares = 6, aleatorio = Math.random } = {}) {
    const escolhidos = embaralhar(SIMBOLOS, aleatorio).slice(0, pares);
    const cartas = embaralhar([...escolhidos, ...escolhidos], aleatorio).map((simbolo) => ({ simbolo, aberta: false, achada: false }));
    return { cartas, viradas: [], jogadas: 0, erros: 0, achados: 0, pares, sequencia: 0, melhorSequencia: 0 };
  }

  // Esconde o par errado que ficou aberto; devolve as posições escondidas
  function esconder(e) {
    if (e.viradas.length < 2) return [];
    const escondidas = e.viradas;
    for (const i of escondidas) e.cartas[i].aberta = false;
    e.viradas = [];
    return escondidas;
  }

  // Vira a carta i. Devolve "primeira", "par", "errou" ou "ignorado".
  function virar(e, i) {
    const c = e.cartas[i];
    if (!c || c.aberta || c.achada || venceu(e)) return "ignorado";
    // Tocar numa terceira carta já esconde o par errado na hora
    esconder(e);
    c.aberta = true;
    e.viradas.push(i);
    if (e.viradas.length === 1) return "primeira";
    e.jogadas++;
    const [a, b] = e.viradas;
    if (e.cartas[a].simbolo === e.cartas[b].simbolo) {
      e.cartas[a].achada = e.cartas[b].achada = true;
      e.viradas = [];
      e.achados++;
      e.sequencia++;
      e.melhorSequencia = Math.max(e.melhorSequencia, e.sequencia);
      return "par";
    }
    e.erros++;
    e.sequencia = 0;
    return "errou";
  }

  const venceu = (e) => e.achados === e.pares;

  return { NIVEIS, SIMBOLOS, criar, virar, esconder, venceu };
});

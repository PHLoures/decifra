// Regras do Conexões, sem nada de tela (testadas em testes/conexoes.test.js).
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.LogicaConexoes = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const MAX_ERROS = 4;
  const NIVEIS = ["amarelo", "verde", "azul", "roxo"];
  const EMOJI = ["🟨", "🟩", "🟦", "🟪"];

  // Um desafio por dia, em ordem; depois do último volta ao primeiro
  const desafioDoDia = (desafios, dia) => desafios[(dia - 1) % desafios.length];

  const grupoDe = (desafio, palavra) => desafio.findIndex(([, palavras]) => palavras.includes(palavra));

  // Confere 4 palavras: acerto (índice do grupo) ou, se errou, se faltou só uma
  function conferir(desafio, selecao) {
    const contagem = {};
    for (const p of selecao) {
      const g = grupoDe(desafio, p);
      contagem[g] = (contagem[g] || 0) + 1;
    }
    const [grupo, maior] = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0];
    if (maior === 4) return { acerto: Number(grupo), quase: false };
    return { acerto: null, quase: maior === 3 };
  }

  const mesmaSelecao = (a, b) => a.length === b.length && a.every((p) => b.includes(p));

  // Situação a partir das tentativas salvas (cada tentativa é uma lista de 4 palavras)
  function situacao(desafio, tentativas) {
    const resolvidos = [];
    let erros = 0;
    for (const t of tentativas) {
      const r = conferir(desafio, t);
      if (r.acerto !== null) resolvidos.push(r.acerto);
      else erros++;
    }
    const venceu = resolvidos.length === desafio.length;
    return { resolvidos, erros, restantes: MAX_ERROS - erros, venceu, fim: venceu || erros >= MAX_ERROS };
  }

  // Linhas de emoji para compartilhar: a cor de cada palavra em cada tentativa
  const linhasEmoji = (desafio, tentativas) => tentativas.map((t) => t.map((p) => EMOJI[grupoDe(desafio, p)]).join(""));

  return { MAX_ERROS, NIVEIS, EMOJI, desafioDoDia, grupoDe, conferir, mesmaSelecao, situacao, linhasEmoji };
});

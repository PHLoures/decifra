// Regras do Campo Minado, sem nada de tela (testadas em testes/campo-minado.test.js).
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.LogicaMinado = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Mesmos tamanhos do Campo Minado do Google (largura × altura, deitado); no celular em pé, a tela gira o campo
  const NIVEIS = {
    facil: { nome: "Fácil", cols: 10, linhas: 8, minas: 10 },
    medio: { nome: "Médio", cols: 18, linhas: 14, minas: 40 },
    dificil: { nome: "Difícil", cols: 24, linhas: 20, minas: 99 },
  };

  function criar(cols, linhas, minas) {
    return {
      cols, linhas, minas,
      celulas: Array.from({ length: cols * linhas }, () => ({ mina: false, numero: 0, aberta: false, bandeira: false })),
      plantado: false,
      explodiu: null, // índice da mina que explodiu
    };
  }

  function vizinhos(c, i) {
    const x = i % c.cols;
    const y = Math.floor(i / c.cols);
    const lista = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < c.cols && ny < c.linhas) lista.push(ny * c.cols + nx);
      }
    }
    return lista;
  }

  // As minas só são plantadas no primeiro toque, longe dele: o primeiro toque nunca perde
  // e sempre abre uma área (a casa e as vizinhas ficam livres).
  function plantar(c, seguro, aleatorio = Math.random) {
    const proibidas = new Set([seguro, ...vizinhos(c, seguro)]);
    let livres = c.celulas.map((_, i) => i).filter((i) => !proibidas.has(i));
    if (livres.length < c.minas) livres = c.celulas.map((_, i) => i).filter((i) => i !== seguro);
    for (let k = 0; k < c.minas; k++) {
      const j = k + Math.floor(aleatorio() * (livres.length - k));
      [livres[k], livres[j]] = [livres[j], livres[k]];
      c.celulas[livres[k]].mina = true;
    }
    c.celulas.forEach((cel, i) => { cel.numero = vizinhos(c, i).filter((v) => c.celulas[v].mina).length; });
    c.plantado = true;
  }

  // Abre uma casa; se for vazia (0), abre a vizinhança em cascata. Devolve as casas abertas.
  function abrir(c, i, aleatorio) {
    if (!c.plantado) plantar(c, i, aleatorio);
    const cel = c.celulas[i];
    if (cel.aberta || cel.bandeira || c.explodiu !== null) return [];
    if (cel.mina) {
      cel.aberta = true;
      c.explodiu = i;
      return [i];
    }
    const abertas = [];
    const fila = [i];
    while (fila.length) {
      const k = fila.shift();
      const atual = c.celulas[k];
      if (atual.aberta || atual.bandeira) continue;
      atual.aberta = true;
      abertas.push(k);
      if (atual.numero === 0) for (const v of vizinhos(c, k)) if (!c.celulas[v].aberta) fila.push(v);
    }
    return abertas;
  }

  // Tocar num número já aberto com as bandeiras certas em volta abre o resto da vizinhança
  function acorde(c, i) {
    const cel = c.celulas[i];
    if (!cel.aberta || cel.numero === 0) return [];
    const viz = vizinhos(c, i);
    const bandeiras = viz.filter((v) => c.celulas[v].bandeira).length;
    if (bandeiras !== cel.numero) return [];
    return viz.flatMap((v) => abrir(c, v));
  }

  function alternarBandeira(c, i) {
    const cel = c.celulas[i];
    if (cel.aberta || c.explodiu !== null) return false;
    cel.bandeira = !cel.bandeira;
    return true;
  }

  const bandeiras = (c) => c.celulas.filter((cel) => cel.bandeira).length;
  const venceu = (c) => c.plantado && c.explodiu === null && c.celulas.every((cel) => cel.mina || cel.aberta);

  return { NIVEIS, criar, vizinhos, plantar, abrir, acorde, alternarBandeira, bandeiras, venceu };
});

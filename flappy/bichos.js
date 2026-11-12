// Bichinhos do Flappy: passarinhos de várias cores e outros animais, todos desenhados à mão
// no canvas, olhando para a direita e do mesmo tamanho (a batida vale igual para todos).
(function (raiz) {
  "use strict";

  const TAU = Math.PI * 2;
  const elipse = (g, x, y, rx, ry, rot, cor) => { g.fillStyle = cor; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); };
  const bola = (g, x, y, r, cor) => elipse(g, x, y, r, r, 0, cor);
  const sombra = (g, rx = 13, ry = 11) => elipse(g, 1, 3, rx, ry, 0, "rgba(20, 22, 36, .25)");

  // Olho com brilho; depois da batida vira um "x"
  function olho(g, x, y, r, morto, corPupila = "#2b2f45", fundo = "#fff") {
    bola(g, x, y, r, fundo);
    if (morto) {
      g.strokeStyle = corPupila; g.lineWidth = Math.max(1.2, r * 0.32); g.lineCap = "round";
      const d = r * 0.5;
      g.beginPath(); g.moveTo(x - d, y - d); g.lineTo(x + d, y + d); g.moveTo(x + d, y - d); g.lineTo(x - d, y + d); g.stroke();
      return;
    }
    bola(g, x + r * 0.3, y, r * 0.46, corPupila);
    bola(g, x + r * 0.42, y - r * 0.2, r * 0.16, "#fff");
  }

  function passarinho(cores) {
    return (g, asa, morto) => {
      sombra(g);
      elipse(g, 0, 0, 14, 12, 0, cores.corpo);
      elipse(g, 2, 5, 8.7, 5, 0, cores.barriga);
      elipse(g, -5, 1 - asa * 4, 7.5, 4.6 + asa * 1.5, -0.3 + asa * 0.35, cores.asa);
      olho(g, 6, -5, 5, morto);
      g.fillStyle = cores.bico;
      g.beginPath(); g.moveTo(10, -1); g.quadraticCurveTo(19, 1, 10, 5); g.closePath(); g.fill();
    };
  }

  const abelha = (g, asa, morto) => {
    // asas transparentes batendo por cima
    g.globalAlpha = 0.75;
    elipse(g, -3, -11 - asa * 3, 6, 9, -0.5 + asa * 0.4, "#eaf6ff");
    elipse(g, 3, -11 - asa * 3, 5, 8, 0.4 - asa * 0.3, "#d6ecff");
    g.globalAlpha = 1;
    sombra(g);
    g.fillStyle = "#3b3550"; // ferrão
    g.beginPath(); g.moveTo(-13, 1); g.lineTo(-19, 3); g.lineTo(-13, 5); g.fill();
    g.save();
    g.beginPath(); g.ellipse(0, 1, 14, 11, 0, 0, TAU); g.clip();
    g.fillStyle = "#f6d061"; g.fillRect(-15, -11, 30, 24);
    g.fillStyle = "#3b3550";
    for (const x of [-9, -2]) g.fillRect(x, -11, 4, 24);
    g.restore();
    g.strokeStyle = "#3b3550"; g.lineWidth = 1.6; g.lineCap = "round";
    g.beginPath(); g.moveTo(8, -8); g.quadraticCurveTo(10, -15, 14, -16); g.stroke();
    bola(g, 14, -16, 1.8, "#3b3550");
    olho(g, 7, -3, 4.2, morto);
    elipse(g, 9, 4, 2.2, 1.4, 0, "#f59a9a");
  };

  const morcego = (g, asa, morto) => {
    // asa de trás, recortada
    const a = asa * 7;
    g.fillStyle = "#4d4170";
    g.beginPath();
    g.moveTo(-2, -2); g.lineTo(-20, -9 - a); g.quadraticCurveTo(-16, -3 - a, -17, 1 - a * 0.5);
    g.quadraticCurveTo(-12, -1, -11, 4); g.quadraticCurveTo(-7, 1, -4, 6); g.closePath(); g.fill();
    sombra(g, 12, 11);
    elipse(g, 0, 1, 12, 11, 0, "#6c5b98");
    g.fillStyle = "#6c5b98"; // orelhas
    g.beginPath(); g.moveTo(-1, -8); g.lineTo(1, -18); g.lineTo(5, -9); g.moveTo(4, -9); g.lineTo(9, -16); g.lineTo(10, -6); g.fill();
    elipse(g, 2, 5, 6.5, 4.5, 0, "#8b7bb5");
    olho(g, 7, -3, 3.6, morto, "#2b2f45", "#f6dc8a");
    g.fillStyle = "#fff"; // presinhas
    g.beginPath(); g.moveTo(8, 4); g.lineTo(9, 7.5); g.lineTo(10, 4); g.fill();
    g.fillStyle = "#5a4a86"; // asa da frente
    g.beginPath();
    g.moveTo(-1, 0); g.lineTo(-15, -6 - a); g.quadraticCurveTo(-11, -1 - a, -12, 3 - a * 0.5);
    g.quadraticCurveTo(-7, 1, -6, 6); g.closePath(); g.fill();
  };

  const pinguim = (g, asa, morto) => {
    sombra(g, 12, 13);
    elipse(g, -8, 11, 4, 2, 0.2, "#fbbb84"); // pezinhos
    elipse(g, 2, 12, 4, 2, 0.1, "#fbbb84");
    elipse(g, 0, 0, 12, 14, 0, "#3b4566");
    elipse(g, 3, 3, 7.5, 9.5, 0, "#f4f1ea");
    elipse(g, -6, 2 - asa * 4, 3.5, 8, 0.5 + asa * 0.5, "#2e3654"); // nadadeira
    olho(g, 6, -6, 3.4, morto);
    g.fillStyle = "#f6a35e";
    g.beginPath(); g.moveTo(10, -4); g.lineTo(17, -2); g.lineTo(10, 0); g.fill();
    elipse(g, 8, 1, 2, 1.2, 0, "#f5a3c0");
  };

  const coruja = (g, asa, morto) => {
    sombra(g, 13, 12);
    elipse(g, 0, 1, 13, 12, 0, "#b88b6a");
    g.fillStyle = "#b88b6a"; // tufinhos
    g.beginPath(); g.moveTo(-4, -8); g.lineTo(-3, -16); g.lineTo(2, -9); g.moveTo(5, -9); g.lineTo(11, -15); g.lineTo(10, -5); g.fill();
    elipse(g, 1, 6, 8, 5.5, 0, "#e9d2b4");
    g.fillStyle = "#9a7052";
    for (const [x, y] of [[-2, 5], [2, 7], [5, 5], [0, 9]]) { g.beginPath(); g.arc(x, y, 1.2, 0, Math.PI); g.fill(); }
    elipse(g, -7, 1 - asa * 4, 7, 4.5 + asa * 1.5, -0.3 + asa * 0.35, "#94694c");
    // olhões de frente
    bola(g, 3, -4, 5.3, "#f6dc8a");
    bola(g, 11, -4, 4.6, "#f6dc8a");
    olho(g, 3, -4, 3.6, morto);
    olho(g, 11, -4, 3.2, morto);
    g.fillStyle = "#f0a24a";
    g.beginPath(); g.moveTo(6, -1); g.lineTo(8.5, -1); g.lineTo(7.2, 3); g.fill();
  };

  const porquinho = (g, asa, morto) => {
    // asinhas de anjo
    elipse(g, -4, -9 - asa * 3, 7, 4, -0.6 + asa * 0.4, "#fbfaff");
    sombra(g);
    g.strokeStyle = "#f08fb0"; g.lineWidth = 1.6; g.lineCap = "round"; // rabinho
    g.beginPath(); g.moveTo(-13, 0); g.bezierCurveTo(-19, -3, -17, -8, -15, -5); g.stroke();
    elipse(g, 0, 0, 14, 11.5, 0, "#f7b2c8");
    g.fillStyle = "#f39abb"; // orelha
    g.beginPath(); g.moveTo(1, -10); g.lineTo(4, -17); g.lineTo(8, -9); g.fill();
    elipse(g, 13, 2, 4.2, 5, 0, "#f39abb"); // focinho
    bola(g, 12.5, 0.5, 1, "#c45f86");
    bola(g, 12.5, 3.7, 1, "#c45f86");
    olho(g, 5, -4, 3.6, morto);
    elipse(g, 5, 4, 2.4, 1.4, 0, "#f08fb0");
    elipse(g, -6, 9, 2.4, 3, 0, "#f39abb"); // patinhas
    elipse(g, 2, 10, 2.4, 3, 0, "#f39abb");
  };

  const fantasma = (g, asa, morto) => {
    g.globalAlpha = 0.95;
    g.fillStyle = "#f4f1fb";
    g.beginPath();
    g.moveTo(-12, 10);
    g.lineTo(-12, -1);
    g.arc(0, -1, 12, Math.PI, 0);
    g.lineTo(12, 10);
    // barrinha ondulada, que mexe com a asa
    const o = asa * 1.5;
    for (let i = 0; i < 4; i++) {
      const x = 12 - i * 6;
      g.quadraticCurveTo(x - 1.5, 14 + o * (i % 2 ? 1 : -1), x - 3, 10);
      g.quadraticCurveTo(x - 4.5, 7, x - 6, 10);
    }
    g.closePath(); g.fill();
    g.globalAlpha = 1;
    elipse(g, -11, 2 - asa * 3, 4, 2.6, -0.5, "#e6e1f5"); // bracinho
    if (morto) { olho(g, 3, -3, 3.4, true); olho(g, 9, -3, 3, true); }
    else { elipse(g, 3, -3, 2.3, 3.4, 0, "#2b2f45"); elipse(g, 9, -3, 2, 3, 0, "#2b2f45"); }
    elipse(g, 1, 3, 2.2, 1.3, 0, "#f5a3c0");
    elipse(g, 11, 3, 1.8, 1.2, 0, "#f5a3c0");
    elipse(g, 6, 4.5, 1.6, morto ? 1.6 : 1, 0, "#7a6f9a");
  };

  const dragao = (g, asa, morto) => {
    const a = asa * 6;
    g.fillStyle = "#4fae84"; // asa
    g.beginPath(); g.moveTo(-3, -3); g.lineTo(-12, -16 - a); g.lineTo(-10, -9 - a); g.lineTo(-17, -12 - a); g.lineTo(-11, -2); g.closePath(); g.fill();
    sombra(g);
    g.fillStyle = "#6bc89b"; // rabo
    g.beginPath(); g.moveTo(-11, 2); g.quadraticCurveTo(-18, 2, -20, -3); g.lineTo(-16, 6); g.fill();
    elipse(g, 0, 0, 14, 11.5, 0, "#7fdcae");
    elipse(g, 2, 5, 8.5, 4.6, 0, "#e7f7c8");
    g.fillStyle = "#f6dc8a"; // chifrinhos
    g.beginPath(); g.moveTo(2, -10); g.lineTo(1, -16); g.lineTo(5, -10.5); g.moveTo(6, -10); g.lineTo(7, -15); g.lineTo(9, -9); g.fill();
    g.fillStyle = "#5bbd8f"; // escamas nas costas
    for (const x of [-9, -4]) { g.beginPath(); g.moveTo(x - 2, -9); g.lineTo(x, -13); g.lineTo(x + 2, -10); g.fill(); }
    olho(g, 6, -4, 4.4, morto);
    elipse(g, 13, 1, 3.8, 3.2, 0, "#7fdcae"); // focinho
    bola(g, 14.5, 0, 0.9, "#3e7d60");
    elipse(g, -4, 1 - asa * 3, 6, 4, -0.3 + asa * 0.3, "#5bbd8f");
  };

  const peixe = (g, asa, morto) => {
    sombra(g);
    g.fillStyle = "#4fa6e6"; // rabo batendo
    g.beginPath(); g.moveTo(-10, 0); g.lineTo(-20, -8 - asa * 3); g.lineTo(-18, 0); g.lineTo(-20, 8 + asa * 3); g.closePath(); g.fill();
    elipse(g, 0, 0, 14, 10.5, 0, "#8ccbf5");
    elipse(g, 2, 4, 9, 4.5, 0, "#cfeafb");
    g.fillStyle = "#4fa6e6"; // barbatana de cima
    g.beginPath(); g.moveTo(-6, -9); g.quadraticCurveTo(0, -17, 5, -9.5); g.fill();
    elipse(g, -2, 2 - asa * 2, 5, 3, -0.4 + asa * 0.3, "#5eb3ec");
    olho(g, 7, -3, 4, morto);
    g.strokeStyle = "#3b7fb8"; g.lineWidth = 1.4;
    g.beginPath(); g.arc(13, 3, 2.5, 1.9, 3.6); g.stroke();
  };

  const LISTA = [
    { id: "passarinho", nome: "Pêssego", tipo: "passarinho", desenhar: passarinho({ corpo: "#fbbb84", barriga: "#fde0c2", asa: "#f59a6a", bico: "#f0857c" }) },
    { id: "azul", nome: "Azulão", tipo: "passarinho", desenhar: passarinho({ corpo: "#8ccbf5", barriga: "#dff1fd", asa: "#5eb3ec", bico: "#f6c177" }) },
    { id: "menta", nome: "Menta", tipo: "passarinho", desenhar: passarinho({ corpo: "#7fdcae", barriga: "#e2f8ec", asa: "#4fbf88", bico: "#f6c177" }) },
    { id: "lilas", nome: "Lilás", tipo: "passarinho", desenhar: passarinho({ corpo: "#c4b0f5", barriga: "#efe9fd", asa: "#9f86e8", bico: "#fbbb84" }) },
    { id: "rosa", nome: "Rosinha", tipo: "passarinho", desenhar: passarinho({ corpo: "#f5a3c0", barriga: "#fde3ec", asa: "#ec7ca4", bico: "#f6c177" }) },
    { id: "canario", nome: "Canário", tipo: "passarinho", desenhar: passarinho({ corpo: "#f6dc8a", barriga: "#fdf3d2", asa: "#efc04f", bico: "#f0857c" }) },
    { id: "corvo", nome: "Corvo", tipo: "passarinho", desenhar: passarinho({ corpo: "#4a4f6e", barriga: "#6c7193", asa: "#363a55", bico: "#f6c177" }) },
    { id: "abelha", nome: "Abelha", tipo: "animal", desenhar: abelha },
    { id: "morcego", nome: "Morcego", tipo: "animal", desenhar: morcego },
    { id: "pinguim", nome: "Pinguim", tipo: "animal", desenhar: pinguim },
    { id: "coruja", nome: "Coruja", tipo: "animal", desenhar: coruja },
    { id: "porquinho", nome: "Porquinho", tipo: "animal", desenhar: porquinho },
    { id: "fantasma", nome: "Fantasminha", tipo: "animal", desenhar: fantasma },
    { id: "dragao", nome: "Dragãozinho", tipo: "animal", desenhar: dragao },
    { id: "peixe", nome: "Peixe voador", tipo: "animal", desenhar: peixe },
  ];
  const PORID = Object.fromEntries(LISTA.map((b) => [b.id, b]));

  // Desenha o bicho em (0, 0), já transladado e girado por quem chama
  function desenhar(g, id, asa, morto) {
    (PORID[id] || LISTA[0]).desenhar(g, asa, morto);
  }

  raiz.BichosFlappy = { LISTA, desenhar, existe: (id) => Boolean(PORID[id]) };
})(typeof self !== "undefined" ? self : this);

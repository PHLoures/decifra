// Frutas desenhadas no canvas (sem emoji), em traço chapado e tons pastel.
// Cada desenho é centrado em (0, 0) e cabe num círculo de raio r.
(function (raiz) {
  "use strict";

  const VERDE = "#7fdcae";
  const VERDE_ESCURO = "#4fb784";
  const CABO = "#8a6a55";

  function folha(g, x, y, w, h, angulo, cor = VERDE) {
    g.save();
    g.translate(x, y);
    g.rotate(angulo);
    g.fillStyle = cor;
    g.beginPath();
    g.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  function brilho(g, x, y, rr) {
    g.fillStyle = "rgba(255, 255, 255, .55)";
    g.beginPath();
    g.ellipse(x, y, rr, rr * 0.62, -0.6, 0, Math.PI * 2);
    g.fill();
  }
  function cabo(g, x1, y1, x2, y2, cx, cy, largura, cor = CABO) {
    g.strokeStyle = cor;
    g.lineWidth = largura;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(x1, y1);
    g.quadraticCurveTo(cx, cy, x2, y2);
    g.stroke();
  }

  const FRUTAS = {
    maca: {
      nome: "Maçã",
      desenhar(g, r) {
        g.fillStyle = "#f0857c";
        g.beginPath();
        g.moveTo(0, -0.55 * r);
        g.bezierCurveTo(0.55 * r, -1.0 * r, 1.15 * r, -0.3 * r, 0.85 * r, 0.4 * r);
        g.bezierCurveTo(0.65 * r, 0.95 * r, 0.25 * r, 1.0 * r, 0, 0.82 * r);
        g.bezierCurveTo(-0.25 * r, 1.0 * r, -0.65 * r, 0.95 * r, -0.85 * r, 0.4 * r);
        g.bezierCurveTo(-1.15 * r, -0.3 * r, -0.55 * r, -1.0 * r, 0, -0.55 * r);
        g.fill();
        cabo(g, 0, -0.55 * r, 0.12 * r, -0.98 * r, 0.02 * r, -0.8 * r, 0.13 * r);
        folha(g, 0.36 * r, -0.86 * r, 0.3 * r, 0.14 * r, -0.5);
        brilho(g, -0.42 * r, -0.12 * r, 0.17 * r);
      },
    },
    banana: {
      nome: "Banana",
      desenhar(g, r) {
        g.fillStyle = "#f6d26b";
        g.strokeStyle = "#e3b649";
        g.lineWidth = 0.07 * r;
        g.lineJoin = "round";
        g.beginPath();
        g.moveTo(-0.72 * r, -0.72 * r);
        g.quadraticCurveTo(-0.55 * r, 0.75 * r, 0.9 * r, 0.42 * r);
        g.quadraticCurveTo(1.0 * r, 0.32 * r, 0.9 * r, 0.18 * r);
        g.quadraticCurveTo(-0.12 * r, 0.42 * r, -0.42 * r, -0.78 * r);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = CABO;
        g.beginPath();
        g.arc(-0.58 * r, -0.8 * r, 0.11 * r, 0, Math.PI * 2);
        g.arc(0.93 * r, 0.3 * r, 0.07 * r, 0, Math.PI * 2);
        g.fill();
        brilho(g, -0.38 * r, 0.05 * r, 0.12 * r);
      },
    },
    abacaxi: {
      nome: "Abacaxi",
      desenhar(g, r) {
        g.fillStyle = VERDE;
        for (const [x, a] of [[-0.24, -0.45], [0, 0], [0.24, 0.45]]) {
          g.save();
          g.translate(x * r, -0.55 * r);
          g.rotate(a);
          g.beginPath();
          g.moveTo(-0.13 * r, 0);
          g.lineTo(0, -0.5 * r);
          g.lineTo(0.13 * r, 0);
          g.closePath();
          g.fill();
          g.restore();
        }
        g.save();
        g.beginPath();
        g.ellipse(0, 0.2 * r, 0.56 * r, 0.72 * r, 0, 0, Math.PI * 2);
        g.fillStyle = "#f6c177";
        g.fill();
        g.clip();
        g.strokeStyle = "rgba(170, 110, 40, .38)";
        g.lineWidth = 0.07 * r;
        for (let k = -3; k <= 3; k++) {
          g.beginPath();
          g.moveTo(-r + k * 0.36 * r, -0.6 * r);
          g.lineTo(r + k * 0.36 * r, 1.0 * r);
          g.moveTo(r + k * 0.36 * r, -0.6 * r);
          g.lineTo(-r + k * 0.36 * r, 1.0 * r);
          g.stroke();
        }
        g.restore();
        brilho(g, -0.24 * r, -0.05 * r, 0.12 * r);
      },
    },
    uva: {
      nome: "Uva",
      desenhar(g, r) {
        cabo(g, 0, -0.45 * r, 0.1 * r, -0.92 * r, 0.12 * r, -0.65 * r, 0.11 * r);
        folha(g, 0.34 * r, -0.78 * r, 0.3 * r, 0.14 * r, -0.4);
        const bagos = [[-0.36, -0.28], [0, -0.32], [0.36, -0.28], [-0.18, 0.06], [0.18, 0.06], [0, 0.4]];
        for (const [x, y] of bagos) {
          g.fillStyle = "#b59cf0";
          g.beginPath();
          g.arc(x * r, y * r, 0.27 * r, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = "rgba(255, 255, 255, .35)";
          g.beginPath();
          g.arc(x * r - 0.08 * r, y * r - 0.08 * r, 0.07 * r, 0, Math.PI * 2);
          g.fill();
        }
      },
    },
    morango: {
      nome: "Morango",
      desenhar(g, r) {
        g.fillStyle = "#f27d8a";
        g.beginPath();
        g.moveTo(0, 0.95 * r);
        g.bezierCurveTo(-0.6 * r, 0.55 * r, -0.95 * r, 0.0, -0.75 * r, -0.42 * r);
        g.quadraticCurveTo(0, -0.7 * r, 0.75 * r, -0.42 * r);
        g.bezierCurveTo(0.95 * r, 0.0, 0.6 * r, 0.55 * r, 0, 0.95 * r);
        g.fill();
        g.fillStyle = "#fff1b8";
        for (const [x, y] of [[-0.35, -0.15], [0.05, -0.2], [0.42, -0.12], [-0.2, 0.2], [0.22, 0.22], [0, 0.55], [-0.48, 0.12], [0.48, 0.15]]) {
          g.beginPath();
          g.ellipse(x * r, y * r, 0.05 * r, 0.08 * r, 0, 0, Math.PI * 2);
          g.fill();
        }
        for (const a of [-1.1, -0.4, 0.4, 1.1]) folha(g, Math.sin(a) * 0.32 * r, -0.55 * r, 0.24 * r, 0.1 * r, a, VERDE);
        cabo(g, 0, -0.55 * r, 0.05 * r, -0.88 * r, 0, -0.75 * r, 0.1 * r, VERDE_ESCURO);
      },
    },
    cereja: {
      nome: "Cereja",
      desenhar(g, r) {
        cabo(g, -0.38 * r, 0.05 * r, 0.12 * r, -0.85 * r, -0.3 * r, -0.5 * r, 0.09 * r, VERDE_ESCURO);
        cabo(g, 0.42 * r, 0.12 * r, 0.12 * r, -0.85 * r, 0.42 * r, -0.4 * r, 0.09 * r, VERDE_ESCURO);
        folha(g, 0.42 * r, -0.85 * r, 0.3 * r, 0.13 * r, -0.2);
        for (const [x, y] of [[-0.38, 0.42], [0.42, 0.5]]) {
          g.fillStyle = "#e8697a";
          g.beginPath();
          g.arc(x * r, y * r, 0.4 * r, 0, Math.PI * 2);
          g.fill();
          brilho(g, x * r - 0.15 * r, y * r - 0.14 * r, 0.1 * r);
        }
      },
    },
    laranja: {
      nome: "Laranja",
      desenhar(g, r) {
        g.fillStyle = "#fbab62";
        g.beginPath();
        g.arc(0, 0.08 * r, 0.8 * r, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "rgba(255, 255, 255, .22)";
        for (const [x, y] of [[0.3, 0.3], [-0.2, 0.45], [0.45, -0.1], [0.05, 0.6], [-0.45, 0.2]]) {
          g.beginPath();
          g.arc(x * r, y * r, 0.05 * r, 0, Math.PI * 2);
          g.fill();
        }
        folha(g, 0.22 * r, -0.78 * r, 0.3 * r, 0.13 * r, -0.4);
        g.fillStyle = CABO;
        g.beginPath();
        g.arc(0, -0.7 * r, 0.08 * r, 0, Math.PI * 2);
        g.fill();
        brilho(g, -0.38 * r, -0.22 * r, 0.17 * r);
      },
    },
    melancia: {
      nome: "Melancia",
      desenhar(g, r) {
        const cy = -0.28 * r;
        const fatia = (raio, cor) => {
          g.fillStyle = cor;
          g.beginPath();
          g.moveTo(-raio, cy);
          g.arc(0, cy, raio, Math.PI, 0, true);
          g.closePath();
          g.fill();
        };
        fatia(0.98 * r, VERDE_ESCURO);
        fatia(0.86 * r, "#e8f8ef");
        fatia(0.76 * r, "#f27d8a");
        g.fillStyle = "#3b3f55";
        for (const [x, y] of [[-0.35, 0.05], [0, 0.18], [0.35, 0.05], [-0.15, 0.4], [0.17, 0.38]]) {
          g.beginPath();
          g.ellipse(x * r, y * r, 0.05 * r, 0.09 * r, x, 0, Math.PI * 2);
          g.fill();
        }
      },
    },
  };

  // Desenha uma fruta num canvas pequeno (ícones do placar e do menu)
  function pintarIcone(canvas, tipo) {
    const dpr = raiz.devicePixelRatio || 1;
    const tam = canvas.clientWidth || canvas.width;
    canvas.width = Math.round(tam * dpr);
    canvas.height = Math.round(tam * dpr);
    const g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, tam, tam);
    g.translate(tam / 2, tam / 2);
    FRUTAS[tipo].desenhar(g, tam * 0.42);
  }

  raiz.Frutas = { FRUTAS, pintarIcone };
})(typeof self !== "undefined" ? self : this);

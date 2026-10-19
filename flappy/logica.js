// Regras do Flappy, sem nada de tela (testadas em testes/flappy.test.js).
// O mundo tem 512 unidades de altura e a largura da tela (288 no formato clássico);
// anda em passos de 1/60 s.
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.LogicaFlappy = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const L = 288;
  const A = 512;
  const CHAO = 448; // topo do chão
  const GRAVIDADE = 0.42;
  const PULO = -7.4;
  const QUEDA_MAX = 10;
  const RAIO = 12;
  const CANO_L = 52;
  const PASSARO_X = 80;
  // Em telas largas o passarinho fica um pouco mais para dentro, mas sempre perto da esquerda
  const posicaoX = (largura) => Math.round(Math.max(PASSARO_X, Math.min(largura * 0.28, 210)));

  // vão = abertura entre os canos; vel = quanto o cenário anda por passo; dist = espaço entre canos
  const NIVEIS = {
    facil: { nome: "Fácil", vao: 150, vel: 1.8, dist: 185 },
    medio: { nome: "Médio", vao: 128, vel: 2.2, dist: 175 },
    dificil: { nome: "Difícil", vao: 110, vel: 2.6, dist: 165 },
    impossivel: { nome: "Impossível", vao: 98, vel: 3.0, dist: 160, sobeDesce: true },
  };

  // teto: em telas compridas o céu continua acima do 0 (valor negativo)
  function criar({ nivel = "facil", aleatorio = Math.random, largura = L, teto = 0 } = {}) {
    return {
      cfg: NIVEIS[nivel] || NIVEIS.facil,
      aleatorio,
      L: largura,
      teto,
      passaro: { x: posicaoX(largura), y: 230, vy: 0 },
      canos: [],
      pontos: 0,
      iniciado: false,
      fim: false,
      passos: 0,
    };
  }

  function novoCano(e, x) {
    const margem = 70;
    const meio = margem + e.cfg.vao / 2 + e.aleatorio() * (CHAO - 2 * margem - e.cfg.vao);
    e.canos.push({ x, meio, base: meio, fase: e.aleatorio() * Math.PI * 2, passou: false });
  }

  function pular(e) {
    if (e.fim) return false;
    if (!e.iniciado) {
      e.iniciado = true;
      novoCano(e, e.L + 40);
    }
    e.passaro.vy = PULO;
    return true;
  }

  // Bateu num retângulo? (círculo um pouco menor que o desenho: dá uma folguinha)
  function bate(px, py, r, x0, y0, x1, y1) {
    const cx = Math.max(x0, Math.min(px, x1));
    const cy = Math.max(y0, Math.min(py, y1));
    return (px - cx) ** 2 + (py - cy) ** 2 < r * r;
  }

  function colideCano(e, c) {
    const p = e.passaro;
    const r = RAIO * 0.82;
    const topo = c.meio - e.cfg.vao / 2;
    const fundo = c.meio + e.cfg.vao / 2;
    return bate(p.x, p.y, r, c.x, e.teto - 200, c.x + CANO_L, topo) || bate(p.x, p.y, r, c.x, fundo, c.x + CANO_L, CHAO);
  }

  // Avança 1/60 s. Devolve { ponto, bateu }.
  function passo(e) {
    const r = { ponto: false, bateu: false };
    e.passos++;
    const p = e.passaro;
    if (!e.iniciado) {
      p.y = 230 + Math.sin(e.passos / 9) * 6; // flutuando antes de começar
      return r;
    }
    if (e.fim) {
      // Depois de bater, cai até o chão
      if (p.y + RAIO < CHAO) {
        p.vy = Math.min(p.vy + GRAVIDADE * 1.4, QUEDA_MAX * 1.3);
        p.y = Math.min(p.y + p.vy, CHAO - RAIO);
      }
      return r;
    }
    p.vy = Math.min(p.vy + GRAVIDADE, QUEDA_MAX);
    p.y += p.vy;
    if (p.y - RAIO < e.teto) { p.y = e.teto + RAIO; p.vy = 0; } // o teto não mata, só segura

    for (const c of e.canos) {
      c.x -= e.cfg.vel;
      if (e.cfg.sobeDesce) {
        const amp = 38;
        const lim = 60 + e.cfg.vao / 2;
        c.meio = Math.max(lim, Math.min(CHAO - lim, c.base + Math.sin(e.passos / 40 + c.fase) * amp));
      }
      if (!c.passou && c.x + CANO_L < p.x) {
        c.passou = true;
        e.pontos++;
        r.ponto = true;
      }
    }
    e.canos = e.canos.filter((c) => c.x + CANO_L > -10);
    const ultimo = e.canos[e.canos.length - 1];
    // O próximo cano nasce sempre fora da tela, à direita
    if (!ultimo || ultimo.x + e.cfg.dist <= e.L + 40) novoCano(e, ultimo ? ultimo.x + e.cfg.dist : e.L + 40);

    if (p.y + RAIO >= CHAO || e.canos.some((c) => colideCano(e, c))) {
      if (p.y + RAIO >= CHAO) p.y = CHAO - RAIO;
      e.fim = true;
      r.bateu = true;
    }
    return r;
  }

  // A tela mudou de tamanho: os próximos canos nascem na nova borda direita
  function redimensionar(e, largura, teto = 0) {
    e.L = largura;
    e.teto = teto;
    if (!e.iniciado) e.passaro.x = posicaoX(largura);
  }

  // Medalha pelos pontos
  const medalha = (pontos) => (pontos >= 80 ? "platina" : pontos >= 40 ? "ouro" : pontos >= 20 ? "prata" : pontos >= 10 ? "bronze" : null);

  return { L, A, CHAO, RAIO, CANO_L, PASSARO_X, NIVEIS, criar, pular, passo, colideCano, redimensionar, medalha };
});

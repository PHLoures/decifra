// Efeitos sonoros de fliperama, sintetizados na hora (sem arquivos de áudio).
(function (raiz) {
  "use strict";

  let contexto = null;
  let ligado = true;

  // O navegador só libera áudio depois de um toque ou tecla do jogador
  function ctx() {
    if (!ligado) return null;
    const Ctx = raiz.AudioContext || raiz.webkitAudioContext;
    if (!Ctx) return null;
    if (!contexto) contexto = new Ctx();
    if (contexto.state === "suspended") contexto.resume();
    return contexto;
  }

  function nota(freq, { duracao = 0.08, tipo = "square", volume = 0.035, atraso = 0, ate = null } = {}) {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime + atraso;
    const osc = c.createOscillator();
    const ganho = c.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, t);
    if (ate) osc.frequency.exponentialRampToValueAtTime(ate, t + duracao);
    ganho.gain.setValueAtTime(volume, t);
    ganho.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
    osc.connect(ganho).connect(c.destination);
    osc.start(t);
    osc.stop(t + duracao + 0.02);
  }

  raiz.Som = {
    ligar(v) { ligado = v; },
    tecla() { nota(520, { duracao: 0.03, volume: 0.02 }); },
    apagar() { nota(300, { duracao: 0.04, volume: 0.02 }); },
    erro() { nota(160, { duracao: 0.18, tipo: "sawtooth", volume: 0.03, ate: 110 }); },
    acende(estado, i) {
      const base = { certa: 880, lugar: 660, errada: 247 }[estado];
      nota(base * (1 + i * 0.02), { duracao: estado === "errada" ? 0.05 : 0.09, tipo: estado === "errada" ? "triangle" : "square", volume: estado === "errada" ? 0.03 : 0.035 });
    },
    dica() {
      nota(988, { duracao: 0.08, tipo: "sine", volume: 0.05 });
      nota(1319, { duracao: 0.14, tipo: "sine", volume: 0.05, atraso: 0.08 });
    },
    vitoria() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => nota(f, { duracao: 0.12, volume: 0.04, atraso: i * 0.09 }));
    },
    derrota() {
      [392, 330, 262, 196].forEach((f, i) => nota(f, { duracao: 0.18, tipo: "triangle", volume: 0.05, atraso: i * 0.16 }));
    },
    moeda() { nota(1568, { duracao: 0.04, volume: 0.015 }); },
    recorde() {
      [784, 988, 1175, 1568].forEach((f, i) => nota(f, { duracao: 0.1, tipo: "square", volume: 0.04, atraso: 0.5 + i * 0.07 }));
    },
  };
})(typeof self !== "undefined" ? self : this);

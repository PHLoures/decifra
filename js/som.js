// Efeitos sonoros sintetizados na hora (sem arquivos de áudio):
// cliques de teclado mecânico, notinhas que sobem conforme a palavra cresce e jingles de fliperama.
(function (raiz) {
  "use strict";

  let contexto = null;
  let saida = null;
  let ruido = null;
  let ligado = true;

  // Escala pentatônica (semitons): qualquer sequência de notas soa bem
  const ESCALA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const nota = (base, grau) => base * Math.pow(2, ESCALA[Math.min(grau, ESCALA.length - 1)] / 12);
  const variar = (x, quanto = 0.03) => x * (1 + (Math.random() * 2 - 1) * quanto);

  // O navegador só libera áudio depois de um toque ou tecla do jogador
  function ctx() {
    if (!ligado) return null;
    const Ctx = raiz.AudioContext || raiz.webkitAudioContext;
    if (!Ctx) return null;
    if (!contexto) {
      contexto = new Ctx();
      // Compressor suaviza picos quando vários sons tocam juntos
      const comp = contexto.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      saida = contexto.createGain();
      saida.gain.value = 0.9;
      saida.connect(comp).connect(contexto.destination);
      // Ruído branco reaproveitado em todos os cliques
      ruido = contexto.createBuffer(1, contexto.sampleRate * 0.25, contexto.sampleRate);
      const dados = ruido.getChannelData(0);
      for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
    }
    if (contexto.state === "suspended") contexto.resume();
    return contexto;
  }

  function tom(freq, { duracao = 0.08, tipo = "sine", volume = 0.05, atraso = 0, ate = null, ataque = 0.004 } = {}) {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime + atraso;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, t);
    if (ate) osc.frequency.exponentialRampToValueAtTime(ate, t + duracao);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
    osc.connect(g).connect(saida);
    osc.start(t);
    osc.stop(t + duracao + 0.02);
  }

  // Estalo de ruído filtrado: a "batida" da tecla
  function estalo({ freq = 2200, q = 1.2, duracao = 0.03, volume = 0.3, tipo = "bandpass", atraso = 0 } = {}) {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime + atraso;
    const fonte = c.createBufferSource();
    fonte.buffer = ruido;
    fonte.playbackRate.value = variar(1, 0.1);
    const filtro = c.createBiquadFilter();
    filtro.type = tipo;
    filtro.frequency.value = variar(freq, 0.08);
    filtro.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
    fonte.connect(filtro).connect(g).connect(saida);
    fonte.start(t, Math.random() * 0.15);
    fonte.stop(t + duracao + 0.01);
  }

  raiz.Som = {
    ligar(v) { ligado = v; },

    // Tecla: clique mecânico + "toc" grave + notinha que sobe com a posição na palavra
    tecla(posicao = 0) {
      estalo({ freq: 2600, q: 1.4, duracao: 0.022, volume: 0.32 });
      tom(variar(170, 0.05), { duracao: 0.05, volume: 0.13, ate: 85 });
      tom(nota(523, posicao), { duracao: 0.11, tipo: "triangle", volume: 0.045, atraso: 0.004 });
    },
    // Apagar: clique mais abafado e a notinha descendo
    apagar(posicao = 0) {
      estalo({ freq: 900, q: 0.8, duracao: 0.03, volume: 0.28, tipo: "lowpass" });
      tom(variar(130, 0.05), { duracao: 0.06, volume: 0.12, ate: 60 });
      const f = nota(392, posicao);
      tom(f, { duracao: 0.09, tipo: "triangle", volume: 0.035, ate: f * 0.84 });
    },
    // Enter: "clack" encorpado
    enviar() {
      estalo({ freq: 1500, q: 0.9, duracao: 0.05, volume: 0.4 });
      tom(110, { duracao: 0.09, volume: 0.18, ate: 55 });
    },
    erro() {
      tom(196, { duracao: 0.09, tipo: "square", volume: 0.035 });
      tom(147, { duracao: 0.14, tipo: "square", volume: 0.035, atraso: 0.1 });
    },
    // Cada letra acende com um som: sino para a certa, dedilhado para a de outro lugar, baque para a errada
    acende(estado, i) {
      if (estado === "certa") {
        const f = nota(784, i);
        tom(f, { duracao: 0.28, volume: 0.06 });
        tom(f * 2, { duracao: 0.16, volume: 0.02 });
      } else if (estado === "lugar") {
        tom(nota(587, i), { duracao: 0.18, tipo: "triangle", volume: 0.06 });
      } else {
        estalo({ freq: 500, q: 0.7, duracao: 0.05, volume: 0.18, tipo: "lowpass" });
        tom(110, { duracao: 0.07, volume: 0.07, ate: 70 });
      }
    },
    dica() {
      [1319, 1568, 2093].forEach((f, i) => tom(f, { duracao: 0.16, volume: 0.04, atraso: i * 0.06 }));
    },
    resolvido() {
      [784, 988, 1175].forEach((f, i) => tom(f, { duracao: 0.14, tipo: "triangle", volume: 0.05, atraso: i * 0.07 }));
    },
    vitoria() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tom(f, { duracao: 0.16, tipo: "square", volume: 0.03, atraso: i * 0.09 }));
      tom(1568, { duracao: 0.5, volume: 0.05, atraso: 0.45 });
    },
    derrota() {
      [392, 330, 262, 196].forEach((f, i) => tom(f, { duracao: 0.22, tipo: "triangle", volume: 0.06, atraso: i * 0.17 }));
    },
    // Moedinha clássica de fliperama (os pontos subindo)
    moeda() {
      tom(988, { duracao: 0.05, tipo: "square", volume: 0.018 });
      tom(1319, { duracao: 0.09, tipo: "square", volume: 0.018, atraso: 0.045 });
    },
    recorde() {
      [784, 988, 1175, 1568].forEach((f, i) => tom(f, { duracao: 0.12, tipo: "square", volume: 0.035, atraso: 0.5 + i * 0.07 }));
    },
  };
})(typeof self !== "undefined" ? self : this);

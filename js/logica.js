// Regras do jogo, sem nada de tela: dá para testar no Node (testes/) e usar no navegador.
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.Logica = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const TAMANHO = 5;
  const MODOS = {
    solo: { nome: "Solo", tabuleiros: 1, tentativas: 6 },
    dueto: { nome: "Dueto", tabuleiros: 2, tentativas: 7 },
    quarteto: { nome: "Quarteto", tabuleiros: 4, tentativas: 9 },
  };
  // Dia 1 do jogo. A virada é à meia-noite de Brasília, para todo mundo ao mesmo tempo.
  const ESTREIA = Date.UTC(2026, 9, 14);
  const FUSO = "America/Sao_Paulo";
  const DIA_MS = 864e5;

  const semAcento = (p) => p.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  // Mesmo critério do Termo: verdes primeiro; amarelos só até acabar a quantidade daquela letra
  function avaliar(palpite, resposta) {
    const r = Array(TAMANHO).fill("errada");
    const sobra = {};
    for (let i = 0; i < TAMANHO; i++) {
      if (palpite[i] === resposta[i]) r[i] = "certa";
      else sobra[resposta[i]] = (sobra[resposta[i]] || 0) + 1;
    }
    for (let i = 0; i < TAMANHO; i++) {
      if (r[i] !== "certa" && sobra[palpite[i]]) {
        r[i] = "lugar";
        sobra[palpite[i]]--;
      }
    }
    return r;
  }

  const formatoSP = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  function partesSP(data) {
    const o = {};
    for (const p of formatoSP.formatToParts(data)) o[p.type] = Number(p.value);
    return o;
  }

  function diaDoJogo(data = new Date()) {
    const o = partesSP(data);
    return Math.max(1, Math.round((Date.UTC(o.year, o.month - 1, o.day) - ESTREIA) / DIA_MS) + 1);
  }

  function msAteProximoDia(data = new Date()) {
    const o = partesSP(data);
    return DIA_MS - ((o.hour * 3600 + o.minute * 60 + o.second) * 1000 + data.getMilliseconds());
  }

  // Cada modo anda pela lista num passo e ponto de partida próprios: no mesmo dia,
  // as palavras dos tabuleiros são sempre diferentes entre si.
  function palavrasDoDia(respostas, dia, tabuleiros) {
    const n = respostas.length;
    const inicio = { 1: 0, 2: Math.floor(n / 3), 4: Math.floor((2 * n) / 3) }[tabuleiros];
    return Array.from({ length: tabuleiros }, (_, b) => respostas[(inicio + tabuleiros * (dia - 1) + b) % n]);
  }

  // Situação de cada letra num tabuleiro, considerando só os palpites até ele ser resolvido
  function letrasDoTabuleiro(palpites, resposta) {
    const peso = { errada: 1, lugar: 2, certa: 3 };
    const letras = {};
    for (const p of palpites) {
      avaliar(p, resposta).forEach((s, i) => {
        if (!letras[p[i]] || peso[s] > peso[letras[p[i]]]) letras[p[i]] = s;
      });
      if (p === resposta) break;
    }
    return letras;
  }

  // Modo difícil: dicas reveladas precisam ser usadas nos palpites seguintes
  function violaModoDificil(palpite, palpites, resposta) {
    for (const anterior of palpites) {
      const av = avaliar(anterior, resposta);
      for (let i = 0; i < TAMANHO; i++) {
        if (av[i] === "certa" && palpite[i] !== anterior[i]) {
          return `a ${i + 1}ª letra deve ser ${anterior[i].toUpperCase()}`;
        }
      }
      const exigidas = {};
      av.forEach((s, i) => { if (s !== "errada") exigidas[anterior[i]] = (exigidas[anterior[i]] || 0) + 1; });
      for (const [letra, qtd] of Object.entries(exigidas)) {
        if ([...palpite].filter((c) => c === letra).length < qtd) return `a palavra deve ter ${letra.toUpperCase()}`;
      }
    }
    return null;
  }

  // Situação de um jogo a partir dos palpites e respostas (nada disso fica salvo, é sempre recalculado)
  function situacao(palpites, respostas, tentativas) {
    const resolvidos = respostas.map((r) => palpites.indexOf(r));
    const venceu = resolvidos.every((i) => i >= 0);
    const fim = venceu || palpites.length >= tentativas;
    return { resolvidos, venceu, fim };
  }

  return { TAMANHO, MODOS, semAcento, avaliar, diaDoJogo, msAteProximoDia, palavrasDoDia, letrasDoTabuleiro, violaModoDificil, situacao };
});

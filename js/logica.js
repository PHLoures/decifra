// Regras do jogo, sem nada de tela: dá para testar no Node (testes/) e usar no navegador.
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.Logica = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Rodada do dia: uma fase para cada tamanho de palavra e duas fases bônus com várias palavras
  // ao mesmo tempo. "fichas" são as tentativas; palavras maiores dão um pouco mais de fôlego.
  const FASES = [
    { id: "4", tamanho: 4, palavras: 1, fichas: 6, nome: "4 letras", curto: "4" },
    { id: "5", tamanho: 5, palavras: 1, fichas: 6, nome: "5 letras", curto: "5" },
    { id: "6", tamanho: 6, palavras: 1, fichas: 7, nome: "6 letras", curto: "6" },
    { id: "7", tamanho: 7, palavras: 1, fichas: 7, nome: "7 letras", curto: "7" },
    { id: "8", tamanho: 8, palavras: 1, fichas: 8, nome: "8 letras", curto: "8" },
    { id: "9", tamanho: 9, palavras: 1, fichas: 8, nome: "9 letras", curto: "9" },
    { id: "10", tamanho: 10, palavras: 1, fichas: 8, nome: "10 letras", curto: "10" },
    { id: "dueto", tamanho: 5, palavras: 2, fichas: 7, nome: "Dueto", curto: "2×" },
    { id: "quarteto", tamanho: 5, palavras: 4, fichas: 9, nome: "Quarteto", curto: "4×" },
  ];
  const fase = (id) => FASES.find((f) => f.id === String(id));
  const TAMANHOS = [...new Set(FASES.map((f) => f.tamanho))];

  // Dia 1 do jogo. A virada é à meia-noite de Brasília, para todo mundo ao mesmo tempo.
  const ESTREIA = Date.UTC(2026, 9, 14);
  const FUSO = "America/Sao_Paulo";
  const DIA_MS = 864e5;

  const semAcento = (p) => p.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  // Verdes primeiro; amarelos só até acabar a quantidade daquela letra na resposta
  function avaliar(palpite, resposta) {
    const n = resposta.length;
    const r = Array(n).fill("errada");
    const sobra = {};
    for (let i = 0; i < n; i++) {
      if (palpite[i] === resposta[i]) r[i] = "certa";
      else sobra[resposta[i]] = (sobra[resposta[i]] || 0) + 1;
    }
    for (let i = 0; i < n; i++) {
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

  // As listas já vêm embaralhadas. A fase solo usa a palavra N no dia N; Dueto e Quarteto
  // andam pela mesma lista com outro ponto de partida e passo. Sorteando na ordem solo,
  // dueto, quarteto e pulando o que já saiu, nenhuma palavra se repete no mesmo dia.
  function palavrasDoDia(respostas, dia, quantas = 1) {
    const n = respostas.length;
    const usadas = new Set();
    for (const q of [1, 2, 4]) {
      const lista = [];
      let k = { 1: 0, 2: Math.floor(n / 3), 4: Math.floor((2 * n) / 3) }[q] + q * (dia - 1);
      while (lista.length < q) {
        const p = respostas[k++ % n];
        if (!usadas.has(p)) {
          lista.push(p);
          usadas.add(p);
        }
      }
      if (q === quantas) return lista;
    }
    throw new Error(`quantidade de palavras inválida: ${quantas}`);
  }

  // Uma fase em andamento: { palpites: [], dicas: [[tabuleiro, posição], ...] }
  function situacao(estado, respostas, fichas) {
    const resolvidos = respostas.map((r) => estado.palpites.indexOf(r));
    const gastas = estado.palpites.length + estado.dicas.length;
    const venceu = resolvidos.every((i) => i >= 0);
    return {
      total: fichas, gastas, restantes: fichas - gastas, resolvidos,
      quantasResolvidas: resolvidos.filter((i) => i >= 0).length,
      venceu, fim: venceu || gastas >= fichas,
    };
  }

  // Pontos: cada palavra decifrada vale 100 × letras; fechando a fase, cada ficha que sobrou
  // vale 50 × letras por palavra.
  function pontos(tamanho, palavras, resolvidas, restantes) {
    const venceu = resolvidas === palavras;
    return 100 * tamanho * resolvidas + (venceu ? 50 * tamanho * restantes * palavras : 0);
  }

  // Palpites que contam para um tabuleiro: até o que o resolveu
  function palpitesDoTabuleiro(estado, resposta) {
    const i = estado.palpites.indexOf(resposta);
    return i >= 0 ? estado.palpites.slice(0, i + 1) : estado.palpites;
  }

  // Posições já descobertas num tabuleiro (verde em algum palpite ou reveladas por dica)
  function posicoesConhecidas(estado, resposta, b = 0) {
    const conhecidas = new Set(estado.dicas.filter(([t]) => t === b).map(([, i]) => i));
    for (const p of palpitesDoTabuleiro(estado, resposta)) {
      for (let i = 0; i < resposta.length; i++) if (p[i] === resposta[i]) conhecidas.add(i);
    }
    return conhecidas;
  }

  // A dica revela a primeira posição desconhecida do primeiro tabuleiro ainda não resolvido
  function proximaDica(estado, respostas) {
    for (let b = 0; b < respostas.length; b++) {
      if (estado.palpites.includes(respostas[b])) continue;
      const conhecidas = posicoesConhecidas(estado, respostas[b], b);
      for (let i = 0; i < respostas[b].length; i++) if (!conhecidas.has(i)) return [b, i];
    }
    return null;
  }

  // Situação de cada letra num tabuleiro, para o teclado: errada < lugar < certa
  function letrasConhecidas(estado, resposta, b = 0) {
    const peso = { errada: 1, lugar: 2, certa: 3 };
    const letras = {};
    const marcar = (l, s) => { if (!letras[l] || peso[s] > peso[letras[l]]) letras[l] = s; };
    for (const p of palpitesDoTabuleiro(estado, resposta)) avaliar(p, resposta).forEach((s, i) => marcar(p[i], s));
    for (const [t, i] of estado.dicas) if (t === b) marcar(resposta[i], "certa");
    return letras;
  }

  return {
    FASES, TAMANHOS, fase, semAcento, avaliar, diaDoJogo, msAteProximoDia, palavrasDoDia,
    situacao, pontos, palpitesDoTabuleiro, posicoesConhecidas, proximaDica, letrasConhecidas,
  };
});

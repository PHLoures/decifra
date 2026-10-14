// Regras do jogo, sem nada de tela: dá para testar no Node (testes/) e usar no navegador.
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.Logica = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Rodada do dia: uma fase para cada tamanho de palavra
  const FASES = [4, 5, 6, 7, 8, 9, 10];
  // Fichas (tentativas) de cada fase; palavras maiores dão um pouco mais de fôlego
  const FICHAS = { 4: 6, 5: 6, 6: 7, 7: 7, 8: 8, 9: 8, 10: 8 };
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

  // A lista de cada tamanho já vem embaralhada: o dia N usa a palavra N
  const palavraDoDia = (respostas, dia) => respostas[(dia - 1) % respostas.length];

  // Uma fase em andamento: { palpites: [], dicas: [posições reveladas] }
  function situacao(fase, resposta) {
    const total = FICHAS[resposta.length];
    const gastas = fase.palpites.length + fase.dicas.length;
    const venceu = fase.palpites.includes(resposta);
    return { total, gastas, restantes: total - gastas, venceu, fim: venceu || gastas >= total };
  }

  // Pontos: base pelo tamanho + bônus por ficha que sobrou
  function pontos(tamanho, restantes, venceu) {
    if (!venceu) return 0;
    return 100 * tamanho + 50 * tamanho * restantes;
  }

  // Posições já descobertas (verde em algum palpite ou reveladas por dica)
  function posicoesConhecidas(fase, resposta) {
    const conhecidas = new Set(fase.dicas);
    for (const p of fase.palpites) {
      for (let i = 0; i < resposta.length; i++) if (p[i] === resposta[i]) conhecidas.add(i);
    }
    return conhecidas;
  }

  // A dica revela a primeira posição ainda desconhecida (-1 se não há o que revelar)
  function proximaDica(fase, resposta) {
    const conhecidas = posicoesConhecidas(fase, resposta);
    for (let i = 0; i < resposta.length; i++) if (!conhecidas.has(i)) return i;
    return -1;
  }

  // Situação de cada letra para o teclado: errada < lugar < certa
  function letrasConhecidas(fase, resposta) {
    const peso = { errada: 1, lugar: 2, certa: 3 };
    const letras = {};
    const marcar = (l, s) => { if (!letras[l] || peso[s] > peso[letras[l]]) letras[l] = s; };
    for (const p of fase.palpites) avaliar(p, resposta).forEach((s, i) => marcar(p[i], s));
    for (const i of fase.dicas) marcar(resposta[i], "certa");
    return letras;
  }

  return {
    FASES, FICHAS, semAcento, avaliar, diaDoJogo, msAteProximoDia, palavraDoDia,
    situacao, pontos, posicoesConhecidas, proximaDica, letrasConhecidas,
  };
});

// Tela do Tetris: desenho no canvas, queda e travamento com tempo de ajuste,
// movimento contínuo ao segurar (teclado e botões), gestos no celular e recordes.
(() => {
  "use strict";

  const C = window.Comum;
  const T = window.LogicaTetris;
  const { $, el, guardado, tocar } = C;

  const CORES = {
    I: "#8ccbf5", O: "#f6dc8a", T: "#c4b0f5", S: "#7fdcae", Z: "#f59a9a", J: "#8fa3f0", L: "#fbbb84",
  };
  const ATRASO_TRAVA = 500; // ms que a peça fica apoiada antes de travar
  const MAX_AJUSTES = 15; // quantas vezes mover/girar no chão adia a trava
  const DAS = 220; // ms segurando até começar a repetir o movimento (toque curto anda 1 casa só)
  const ARR = 50; // ms entre repetições
  const LIMPEZA = 260; // ms da animação de linhas completas

  let dificuldade = guardado.ler("tetris:dificuldade", "facil");
  if (!T.DIFICULDADES[dificuldade]) dificuldade = "facil";

  let jogo;
  let estadoTela = "pronto"; // pronto | jogando | pausado | fim
  let ultimoQuadro = 0;
  let quedaAcum = 0;
  let travaDesde = null;
  let ajustes = 0;
  let linhaMaisBaixa = 0; // ao descer mais que isso, os ajustes no chão recomeçam
  let pecaVista = 0;
  let limpando = null; // { linhas, desde }
  let segurando = null; // { dir, desde, ultimo }
  let descendo = false;
  let casa = 24;
  let mini = 14;
  let nivelAntes = 1;
  let pedidoQuadro = 0;

  const tela = $("#tela");
  const ctx = tela.getContext("2d");
  const telaGuardada = $("#tela-guardada");
  const telaProximas = $("#tela-proximas");

  /* ---------- Tamanho ---------- */

  function dimensionar() {
    const area = $("#area");
    const largura = area.clientWidth - 16;
    const altura = area.clientHeight - 20;
    const visiveis = T.LINHAS - T.ESCONDIDAS;
    // Campo de 10 casas + duas colunas laterais com peças pela metade do tamanho
    casa = Math.max(10, Math.floor(Math.min((largura - 32) / (T.COLS + 4.4), (altura - 12) / visiveis, 34)));
    mini = Math.max(8, Math.floor(Math.min(casa * 0.7, (largura - 32 - casa * T.COLS) / 2 / 4.4)));
    const dpr = window.devicePixelRatio || 1;
    const ajustar = (c, w, h) => {
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    ajustar(tela, casa * T.COLS, casa * visiveis);
    ajustar(telaGuardada, mini * 4.4, mini * 3.4);
    ajustar(telaProximas, mini * 4.4, mini * 3.2 * 3 + mini * 0.4);
    // As laterais começam na altura do topo do campo
    const alturaCampo = `${$("#moldura").offsetHeight}px`;
    document.querySelectorAll(".lado").forEach((l) => { l.style.height = alturaCampo; });
    desenhar(performance.now());
  }

  /* ---------- Partida ---------- */

  function preparar() {
    jogo = T.criar({ dificuldade });
    nivelAntes = jogo.nivel;
    estadoTela = "pronto";
    quedaAcum = 0;
    travaDesde = null;
    ajustes = 0;
    limpando = null;
    $("#dif-nome").textContent = T.DIFICULDADES[dificuldade].nome;
    montarListaDificuldades();
    atualizarPlacar();
    mostrarSobreposicao("Tetris", "toque em jogar para começar", "Jogar");
    desenhar(performance.now());
  }

  function comecar() {
    if (estadoTela === "fim") preparar();
    if (estadoTela === "jogando") return;
    estadoTela = "jogando";
    $("#sobreposicao").hidden = true;
    ultimoQuadro = performance.now();
    cancelAnimationFrame(pedidoQuadro);
    pedidoQuadro = requestAnimationFrame(quadro);
  }

  function pausar() {
    if (estadoTela !== "jogando") return;
    estadoTela = "pausado";
    segurando = null;
    descendo = false;
    mostrarSobreposicao("Pausa", "aperte P ou continuar", "Continuar");
  }

  function mostrarSobreposicao(titulo, texto, botao) {
    $("#sob-titulo").textContent = titulo;
    $("#sob-texto").textContent = texto;
    $("#btn-jogar").textContent = botao;
    $("#sobreposicao").hidden = false;
  }

  function atualizarPlacar() {
    $("#pontos").textContent = jogo.pontos.toLocaleString("pt-BR");
    $("#linhas").textContent = jogo.linhas;
    $("#nivel").textContent = jogo.nivel;
  }

  // Peça nova: a seta que ainda estava segurada não a joga direto para a parede,
  // e os ajustes no chão recomeçam sempre que a peça desce mais do que já tinha descido
  function vigiarPeca(agora) {
    if (jogo.pecas !== pecaVista) {
      pecaVista = jogo.pecas;
      linhaMaisBaixa = jogo.atual.y;
      ajustes = 0;
      if (segurando) segurando.desde = segurando.ultimo = agora;
    } else if (jogo.atual.y > linhaMaisBaixa) {
      linhaMaisBaixa = jogo.atual.y;
      ajustes = 0;
    }
  }

  // Mover ou girar com a peça apoiada adia a trava (até um limite)
  function depoisDeAjustar() {
    if (T.noChao(jogo)) {
      if (ajustes < MAX_AJUSTES) {
        travaDesde = performance.now();
        ajustes++;
      }
    } else {
      travaDesde = null;
    }
  }

  const acoes = {
    esquerda: () => { if (T.mover(jogo, -1)) { tocar("tecla", 1); depoisDeAjustar(); } },
    direita: () => { if (T.mover(jogo, 1)) { tocar("tecla", 2); depoisDeAjustar(); } },
    girar: () => { if (T.girar(jogo, 1)) { tocar("tecla", 5); depoisDeAjustar(); } },
    "girar-anti": () => { if (T.girar(jogo, -1)) { tocar("tecla", 4); depoisDeAjustar(); } },
    baixo: () => { if (T.descer(jogo)) { quedaAcum = 0; atualizarPlacar(); } },
    soltar: () => {
      T.soltar(jogo);
      tocar("enviar");
      atualizarPlacar();
      travarPeca(performance.now());
    },
    guardar: () => {
      if (T.guardar(jogo)) {
        tocar("dica");
        travaDesde = null;
        ajustes = 0;
        quedaAcum = 0;
        if (jogo.fim) terminar();
      }
    },
  };

  function agir(acao) {
    if (acao === "pausa") return estadoTela === "jogando" ? pausar() : comecar();
    if (estadoTela !== "jogando") {
      if (estadoTela !== "fim") comecar();
      return;
    }
    if (limpando) return;
    acoes[acao]();
    if (estadoTela === "jogando" && !limpando) vigiarPeca(performance.now());
    desenhar(performance.now());
  }

  function travarPeca(agora) {
    const cheias = T.travar(jogo);
    travaDesde = null;
    ajustes = 0;
    quedaAcum = 0;
    if (jogo.fim) return terminar();
    if (cheias.length) {
      limpando = { linhas: cheias, desde: agora };
      tocar(cheias.length === 4 ? "vitoria" : "resolvido");
    } else {
      tocar("apagar", 0);
      T.concluir(jogo, []);
      if (jogo.fim) terminar();
    }
  }

  function quadro(agora) {
    if (estadoTela !== "jogando") return;
    const dt = Math.min(agora - ultimoQuadro, 100);
    ultimoQuadro = agora;

    if (limpando) {
      if (agora - limpando.desde >= LIMPEZA) {
        const r = T.concluir(jogo, limpando.linhas);
        limpando = null;
        atualizarPlacar();
        if (r.subiuDeNivel) tocar("recorde");
        if (jogo.fim) return terminar();
      }
    } else {
      vigiarPeca(agora);
      // Segurando ← ou →: depois de um tempinho, o movimento se repete
      if (segurando && agora - segurando.desde >= DAS && agora - segurando.ultimo >= ARR) {
        segurando.ultimo = agora;
        acoes[segurando.dir]();
      }
      const intervalo = descendo ? Math.min(40, T.intervaloQueda(jogo.nivel)) : T.intervaloQueda(jogo.nivel);
      if (T.noChao(jogo)) {
        if (travaDesde === null) travaDesde = agora;
        if (agora - travaDesde >= ATRASO_TRAVA) travarPeca(agora);
      } else {
        travaDesde = null;
        quedaAcum += dt;
        while (quedaAcum >= intervalo && !T.noChao(jogo)) {
          quedaAcum -= intervalo;
          if (descendo) T.descer(jogo);
          else T.cair(jogo);
        }
        vigiarPeca(agora);
        if (descendo) atualizarPlacar();
      }
    }
    if (estadoTela !== "jogando") return;
    desenhar(agora);
    pedidoQuadro = requestAnimationFrame(quadro);
  }

  function terminar() {
    estadoTela = "fim";
    segurando = null;
    descendo = false;
    desenhar(performance.now());
    const recordes = lerRecordes();
    const r = recordes[dificuldade];
    r.jogos++;
    const recorde = jogo.pontos > r.melhor;
    if (recorde) {
      r.melhor = jogo.pontos;
      r.linhas = jogo.linhas;
    }
    guardado.gravar("tetris:recordes", recordes);
    tocar("derrota");
    setTimeout(() => mostrarSobreposicao(
      recorde && jogo.pontos > 0 ? "Novo recorde!" : "Fim de jogo",
      `${jogo.pontos.toLocaleString("pt-BR")} pontos · ${jogo.linhas} linhas · nível ${jogo.nivel}\nrecorde: ${r.melhor.toLocaleString("pt-BR")}`,
      "Jogar de novo"
    ), 700);
  }

  function lerRecordes() {
    const base = {};
    for (const k of Object.keys(T.DIFICULDADES)) base[k] = { jogos: 0, melhor: 0, linhas: 0 };
    const salvo = guardado.ler("tetris:recordes", {});
    for (const k of Object.keys(base)) Object.assign(base[k], salvo[k] || {});
    return base;
  }

  /* ---------- Desenho ---------- */

  function bloco(g, x, y, tam, cor, alfa = 1) {
    const m = Math.max(1, tam * 0.06);
    g.globalAlpha = alfa;
    g.fillStyle = cor;
    g.beginPath();
    g.roundRect(x + m, y + m, tam - 2 * m, tam - 2 * m, tam * 0.2);
    g.fill();
    // Brilho em cima e sombra embaixo: volume suave
    g.fillStyle = "rgba(255, 255, 255, .28)";
    g.beginPath();
    g.roundRect(x + m * 2.2, y + m * 2.2, tam - m * 4.4, tam * 0.22, tam * 0.1);
    g.fill();
    g.fillStyle = "rgba(0, 0, 0, .12)";
    g.beginPath();
    g.roundRect(x + m * 2.2, y + tam - m * 2.2 - tam * 0.14, tam - m * 4.4, tam * 0.14, tam * 0.07);
    g.fill();
    g.globalAlpha = 1;
  }

  function desenhar(agora) {
    if (!jogo) return;
    const visiveis = T.LINHAS - T.ESCONDIDAS;
    const L = T.COLS * casa;
    const A = visiveis * casa;
    ctx.fillStyle = "#272b41";
    ctx.fillRect(0, 0, L, A);
    // Grade bem discreta
    ctx.strokeStyle = "rgba(255, 255, 255, .04)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < T.COLS; x++) { ctx.moveTo(x * casa + 0.5, 0); ctx.lineTo(x * casa + 0.5, A); }
    for (let y = 1; y < visiveis; y++) { ctx.moveTo(0, y * casa + 0.5); ctx.lineTo(L, y * casa + 0.5); }
    ctx.stroke();

    // Peças já travadas
    for (let y = T.ESCONDIDAS; y < T.LINHAS; y++) {
      for (let x = 0; x < T.COLS; x++) {
        const t = jogo.grade[y][x];
        if (t) bloco(ctx, x * casa, (y - T.ESCONDIDAS) * casa, casa, CORES[t], estadoTela === "fim" ? 0.55 : 1);
      }
    }

    // Linhas completas piscando antes de sumir
    if (limpando) {
      const k = Math.min(1, (agora - limpando.desde) / LIMPEZA);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * (1 - k)})`;
      for (const y of limpando.linhas) if (y >= T.ESCONDIDAS) ctx.fillRect(0, (y - T.ESCONDIDAS) * casa, L, casa);
    } else if (estadoTela !== "fim" || !jogo.fim) {
      // Fantasma e peça atual
      const f = T.fantasma(jogo);
      const cor = CORES[jogo.atual.tipo];
      for (const [x, y] of T.celulasDe(f)) {
        if (y < T.ESCONDIDAS) continue;
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = cor;
        ctx.lineWidth = Math.max(1.5, casa * 0.07);
        ctx.beginPath();
        ctx.roundRect(x * casa + casa * 0.12, (y - T.ESCONDIDAS) * casa + casa * 0.12, casa * 0.76, casa * 0.76, casa * 0.18);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      for (const [x, y] of T.celulasDe(jogo.atual)) {
        if (y >= T.ESCONDIDAS) bloco(ctx, x * casa, (y - T.ESCONDIDAS) * casa, casa, cor);
      }
    }
    desenharMini(telaGuardada, jogo.guardada ? [jogo.guardada] : [], !jogo.podeGuardar);
    desenharMini(telaProximas, T.proximas(jogo, 3), false);
  }

  // Peças pequenas centralizadas nas laterais
  function desenharMini(c, tipos, apagada) {
    const g = c.getContext("2d");
    const w = parseFloat(c.style.width);
    const h = parseFloat(c.style.height);
    g.clearRect(0, 0, w, h);
    const alturaSlot = tipos.length > 1 ? (h - mini * 0.4) / 3 : h;
    tipos.forEach((t, i) => {
      const celulas = T.ROTACOES[t][0];
      const xs = celulas.map(([x]) => x);
      const ys = celulas.map(([, y]) => y);
      const largura = (Math.max(...xs) - Math.min(...xs) + 1) * mini;
      const altura = (Math.max(...ys) - Math.min(...ys) + 1) * mini;
      const ox = (w - largura) / 2 - Math.min(...xs) * mini;
      const oy = i * alturaSlot + (alturaSlot - altura) / 2 - Math.min(...ys) * mini + (tipos.length > 1 ? mini * 0.2 : 0);
      for (const [x, y] of celulas) bloco(g, ox + x * mini, oy + y * mini, mini, CORES[t], apagada ? 0.35 : 1);
    });
  }

  /* ---------- Dificuldade (seletor com setinha) ---------- */

  function montarListaDificuldades() {
    const lista = $("#lista-dif");
    lista.innerHTML = "";
    for (const [k, d] of Object.entries(T.DIFICULDADES)) {
      const op = el("button", `opcao-letras${k === dificuldade ? " atual" : ""}`);
      op.type = "button";
      op.setAttribute("role", "option");
      op.setAttribute("aria-selected", k === dificuldade ? "true" : "false");
      op.append(el("strong", "", d.nome), el("span", "", `começa no nível ${d.nivel}`));
      op.addEventListener("click", () => {
        fecharLista();
        if (k === dificuldade) return;
        dificuldade = k;
        guardado.gravar("tetris:dificuldade", dificuldade);
        tocar("dica");
        preparar();
      });
      lista.appendChild(op);
    }
  }
  function fecharLista() {
    $("#lista-dif").hidden = true;
    $("#btn-dif").setAttribute("aria-expanded", "false");
  }
  $("#btn-dif").addEventListener("click", (e) => {
    e.stopPropagation();
    pausar();
    const lista = $("#lista-dif");
    lista.hidden = !lista.hidden;
    $("#btn-dif").setAttribute("aria-expanded", String(!lista.hidden));
  });
  document.addEventListener("click", (e) => { if (!$("#seletor-dif").contains(e.target)) fecharLista(); });

  /* ---------- Teclado ---------- */

  const TECLAS = {
    ArrowLeft: "esquerda", ArrowRight: "direita", ArrowDown: "baixo", ArrowUp: "girar",
    a: "esquerda", A: "esquerda", d: "direita", D: "direita", s: "baixo", S: "baixo", w: "girar", W: "girar",
    x: "girar", X: "girar", z: "girar-anti", Z: "girar-anti", q: "girar-anti", Q: "girar-anti", e: "girar", E: "girar",
    " ": "soltar", c: "guardar", C: "guardar", Shift: "guardar", p: "pausa", P: "pausa", Escape: "pausa",
  };
  function apertar(acao) {
    if (acao === "esquerda" || acao === "direita") {
      segurando = { dir: acao, desde: performance.now(), ultimo: performance.now() };
    }
    if (acao === "baixo") descendo = true;
    agir(acao);
  }
  function soltarTecla(acao) {
    if (segurando && segurando.dir === acao) segurando = null;
    if (acao === "baixo") descendo = false;
  }
  document.addEventListener("keydown", (e) => {
    if (document.querySelector("dialog[open]")) return;
    const acao = TECLAS[e.key];
    if (!acao) {
      if (e.key === "Enter" && estadoTela !== "jogando") comecar();
      return;
    }
    e.preventDefault();
    if (e.repeat) return; // a repetição é feita pelo próprio jogo (mais suave que a do sistema)
    apertar(acao);
  });
  document.addEventListener("keyup", (e) => {
    const acao = TECLAS[e.key];
    if (acao) soltarTecla(acao);
  });

  /* ---------- Botões na tela ---------- */

  document.querySelectorAll(".ctl").forEach((b) => {
    const acao = b.dataset.acao;
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      b.classList.add("apertado");
      b.setPointerCapture && b.setPointerCapture(e.pointerId);
      apertar(acao);
    });
    const largar = () => { b.classList.remove("apertado"); soltarTecla(acao); };
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((t) => b.addEventListener(t, largar));
    b.addEventListener("contextmenu", (e) => e.preventDefault());
  });

  /* ---------- Gestos no campo: tocar gira, arrastar move, deslizar para baixo solta ---------- */

  let gesto = null;
  const moldura = $("#moldura");
  moldura.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    gesto = { x0: e.clientX, y0: e.clientY, x: e.clientX, t: performance.now(), moveu: false };
  });
  moldura.addEventListener("pointermove", (e) => {
    if (!gesto || estadoTela !== "jogando") return;
    const passo = casa * 0.9;
    while (e.clientX - gesto.x >= passo) { agir("direita"); gesto.x += passo; gesto.moveu = true; }
    while (gesto.x - e.clientX >= passo) { agir("esquerda"); gesto.x -= passo; gesto.moveu = true; }
  });
  moldura.addEventListener("pointerup", (e) => {
    if (!gesto) return;
    const dy = e.clientY - gesto.y0;
    const dx = e.clientX - gesto.x0;
    const rapido = performance.now() - gesto.t < 300;
    if (dy > casa * 2.5 && Math.abs(dy) > Math.abs(dx) * 1.5 && rapido) agir("soltar");
    else if (!gesto.moveu && Math.hypot(dx, dy) < 10) agir("girar");
    gesto = null;
  });
  moldura.addEventListener("pointercancel", () => { gesto = null; });

  /* ---------- Eventos ---------- */

  $("#btn-jogar").addEventListener("click", comecar);
  document.addEventListener("visibilitychange", () => { if (document.hidden) pausar(); });
  $("#btn-ajuda").addEventListener("click", () => { pausar(); C.abrir("#dlg-ajuda"); });
  $("#btn-comecar").addEventListener("click", () => $("#dlg-ajuda").close());
  $("#dlg-ajuda").addEventListener("close", () => guardado.gravar("tetris:viuAjuda", true));
  $("#btn-estatisticas").addEventListener("click", () => {
    pausar();
    const recordes = lerRecordes();
    const raiz = $("#est-lista");
    raiz.innerHTML = "";
    for (const [k, d] of Object.entries(T.DIFICULDADES)) {
      const r = recordes[k];
      const linha = el("div");
      const texto = el("div");
      texto.append(el("strong", "", d.nome), el("span", "", r.jogos ? `${r.jogos} ${r.jogos === 1 ? "partida" : "partidas"} · ${r.linhas} linhas no recorde` : "ainda não jogou"));
      linha.append(texto, el("em", "", r.melhor.toLocaleString("pt-BR")));
      raiz.appendChild(linha);
    }
    C.abrir("#dlg-estatisticas");
  });
  new ResizeObserver(dimensionar).observe($("#area"));

  C.prepararJanelas();
  C.ligarBotaoSom($("#btn-som"));
  preparar();
  dimensionar();
  if (!guardado.ler("tetris:viuAjuda", false)) C.abrir("#dlg-ajuda");
  C.registrarOffline("../sw.js");
})();

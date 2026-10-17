// Tela da Cobrinha: desenho suave no canvas (a cobra desliza entre as casas), controles e recordes.
(() => {
  "use strict";

  const C = window.Comum;
  const S = window.LogicaCobrinha;
  const { $, el, guardado, tocar } = C;

  const CORES = {
    casaA: "#323752",
    casaB: "#2e3249",
    cobra: "#7fdcae",
    cobraEscura: "#5fbf91",
    olho: "#1f3b30",
    fruta: "#f59a9a",
    frutaBrilho: "#fbc4c4",
    folha: "#7fdcae",
  };

  let vel = guardado.ler("cobrinha:velocidade", "normal");
  if (!S.VELOCIDADES[vel]) vel = "normal";
  let jogo = null;
  let anterior = null; // posições antes do último passo, para deslizar entre as casas
  let estadoTela = "pronto"; // pronto | jogando | pausado | fim
  let acumulado = 0;
  let ultimoQuadro = 0;
  let casa = 24;
  let comeuEm = 0;
  const tela = $("#tela");
  const ctx = tela.getContext("2d");

  /* ---------- Tamanho do campo ---------- */

  // Em pé: 15 colunas × 17 linhas; deitado: 17 × 15 (como o Snake do Google)
  function dimensoes() {
    const area = $("#area");
    return area.clientWidth >= area.clientHeight ? [17, 15] : [15, 17];
  }

  function dimensionar() {
    if (!jogo) return;
    const area = $("#area");
    const largura = area.clientWidth - 24 - 14;
    const altura = area.clientHeight - 20 - 14;
    casa = Math.max(10, Math.floor(Math.min(largura / jogo.cols, altura / jogo.linhas, 40)));
    const dpr = window.devicePixelRatio || 1;
    tela.style.width = `${casa * jogo.cols}px`;
    tela.style.height = `${casa * jogo.linhas}px`;
    tela.width = Math.round(casa * jogo.cols * dpr);
    tela.height = Math.round(casa * jogo.linhas * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    desenhar(1);
  }

  /* ---------- Partida ---------- */

  function preparar() {
    const [cols, linhas] = dimensoes();
    jogo = S.criar(cols, linhas);
    anterior = jogo.cobra.map((p) => ({ ...p }));
    acumulado = 0;
    estadoTela = "pronto";
    $("#chip").textContent = S.VELOCIDADES[vel].nome.toLowerCase();
    document.querySelectorAll("#velocidades .modo").forEach((b) => b.classList.toggle("atual", b.dataset.vel === vel));
    atualizarPlacar();
    mostrarSobreposicao("Cobrinha", "deslize ou use as setas para começar", "Jogar");
    dimensionar();
  }

  function comecar() {
    if (estadoTela === "fim") preparar();
    if (estadoTela === "jogando") return;
    estadoTela = "jogando";
    $("#sobreposicao").hidden = true;
    $("#btn-pausa").setAttribute("aria-label", "Pausar");
    ultimoQuadro = performance.now();
    requestAnimationFrame(quadro);
  }

  function pausar() {
    if (estadoTela !== "jogando") return;
    estadoTela = "pausado";
    $("#btn-pausa").setAttribute("aria-label", "Continuar");
    mostrarSobreposicao("Pausa", "toque em continuar ou aperte espaço", "Continuar");
  }

  function mostrarSobreposicao(titulo, texto, botao) {
    $("#sob-titulo").textContent = titulo;
    $("#sob-texto").textContent = texto;
    $("#btn-jogar").textContent = botao;
    $("#sobreposicao").hidden = false;
  }

  function virar(dir) {
    if (estadoTela === "fim") return;
    if (estadoTela !== "jogando") {
      // A primeira direção também já começa o jogo (meia-volta não vale)
      if (dir !== S.OPOSTA[jogo.dir]) S.virar(jogo, dir);
      comecar();
      return;
    }
    S.virar(jogo, dir);
  }

  function quadro(agora) {
    if (estadoTela !== "jogando") return;
    const passoMs = S.VELOCIDADES[vel].ms;
    acumulado += Math.min(agora - ultimoQuadro, 250);
    ultimoQuadro = agora;
    while (acumulado >= passoMs && estadoTela === "jogando") {
      acumulado -= passoMs;
      anterior = jogo.cobra.map((p) => ({ ...p }));
      const r = S.passo(jogo);
      if (r.comeu) {
        comeuEm = agora;
        tocar("moeda");
        atualizarPlacar();
      }
      if (r.bateu || !jogo.vivo) return terminar();
    }
    desenhar(acumulado / passoMs);
    requestAnimationFrame(quadro);
  }

  function terminar() {
    estadoTela = "fim";
    desenhar(1);
    const e = lerRecordes();
    const r = e[vel];
    r.jogos++;
    const recorde = jogo.pontos > r.melhor;
    if (recorde) r.melhor = jogo.pontos;
    guardado.gravar("cobrinha:recordes", e);
    atualizarPlacar();
    tocar(jogo.venceu ? "vitoria" : "erro");
    setTimeout(() => tocar(recorde && jogo.pontos > 0 ? "recorde" : "derrota"), 200);
    const pontos = `${jogo.pontos} ${jogo.pontos === 1 ? "fruta" : "frutas"}`;
    setTimeout(() => {
      mostrarSobreposicao(
        jogo.venceu ? "Zerou!" : recorde && jogo.pontos > 0 ? "Novo recorde!" : "Bateu!",
        `${pontos} · recorde ${r.melhor}`,
        "Jogar de novo"
      );
    }, 450);
  }

  function lerRecordes() {
    const base = {};
    for (const k of Object.keys(S.VELOCIDADES)) base[k] = { jogos: 0, melhor: 0 };
    const salvo = guardado.ler("cobrinha:recordes", {});
    for (const k of Object.keys(base)) Object.assign(base[k], salvo[k] || {});
    return base;
  }

  function atualizarPlacar() {
    $("#pontos").textContent = jogo.pontos;
    $("#recorde").textContent = Math.max(lerRecordes()[vel].melhor, jogo.pontos);
  }

  /* ---------- Desenho ---------- */

  function desenhar(t) {
    if (!jogo) return;
    const L = jogo.cols * casa;
    const A = jogo.linhas * casa;
    // Campo quadriculado
    for (let y = 0; y < jogo.linhas; y++) {
      for (let x = 0; x < jogo.cols; x++) {
        ctx.fillStyle = (x + y) % 2 ? CORES.casaA : CORES.casaB;
        ctx.fillRect(x * casa, y * casa, casa, casa);
      }
    }
    desenharFruta();

    // Cada gomo desliza da casa anterior para a atual; o resultado é uma linha contínua e arredondada
    const pontos = jogo.cobra.map((p, i) => {
      const a = anterior[i] || p;
      const k = estadoTela === "fim" ? 1 : t;
      return { x: (a.x + (p.x - a.x) * k + 0.5) * casa, y: (a.y + (p.y - a.y) * k + 0.5) * casa };
    });
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = CORES.cobraEscura;
    ctx.lineWidth = casa * 0.78;
    tracar(pontos);
    ctx.strokeStyle = CORES.cobra;
    ctx.lineWidth = casa * 0.64;
    tracar(pontos);

    // Olhos na direção do movimento
    const cabeca = pontos[0];
    const [dx, dy] = S.DIRECOES[jogo.dir];
    const lado = { x: -dy, y: dx };
    for (const s of [-1, 1]) {
      const ox = cabeca.x + dx * casa * 0.12 + lado.x * s * casa * 0.17;
      const oy = cabeca.y + dy * casa * 0.12 + lado.y * s * casa * 0.17;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(ox, oy, casa * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = CORES.olho;
      ctx.beginPath();
      ctx.arc(ox + dx * casa * 0.04, oy + dy * casa * 0.04, casa * 0.065, 0, Math.PI * 2);
      ctx.fill();
    }

    if (estadoTela === "fim" && !jogo.venceu) {
      ctx.fillStyle = "rgba(43, 47, 69, .35)";
      ctx.fillRect(0, 0, L, A);
    }
  }

  function tracar(pontos) {
    ctx.beginPath();
    ctx.moveTo(pontos[0].x, pontos[0].y);
    for (let i = 1; i < pontos.length; i++) ctx.lineTo(pontos[i].x, pontos[i].y);
    if (pontos.length === 1) ctx.lineTo(pontos[0].x + 0.01, pontos[0].y);
    ctx.stroke();
  }

  function desenharFruta() {
    if (!jogo.comida) return;
    const cx = (jogo.comida.x + 0.5) * casa;
    const cy = (jogo.comida.y + 0.55) * casa;
    // Pulsa de leve; logo depois de comer, a nova fruta "nasce" crescendo
    const desde = performance.now() - comeuEm;
    const nasce = Math.min(1, desde / 220);
    const r = casa * 0.34 * (0.6 + 0.4 * nasce) * (1 + 0.04 * Math.sin(performance.now() / 180));
    ctx.fillStyle = CORES.fruta;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CORES.frutaBrilho;
    ctx.beginPath();
    ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CORES.folha;
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.3, cy - r * 1.05, r * 0.42, r * 0.2, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ---------- Controles ---------- */

  const TECLAS = {
    ArrowUp: "cima", ArrowDown: "baixo", ArrowLeft: "esquerda", ArrowRight: "direita",
    w: "cima", s: "baixo", a: "esquerda", d: "direita", W: "cima", S: "baixo", A: "esquerda", D: "direita",
  };
  document.addEventListener("keydown", (e) => {
    if (document.querySelector("dialog[open]")) return;
    if (TECLAS[e.key]) {
      e.preventDefault();
      virar(TECLAS[e.key]);
    } else if (e.key === " " || e.key === "p" || e.key === "P") {
      e.preventDefault();
      if (estadoTela === "jogando") pausar();
      else comecar();
    } else if (e.key === "Enter" && estadoTela !== "jogando") {
      e.preventDefault();
      comecar();
    }
  });

  // Deslizar o dedo no campo
  let toque = null;
  const moldura = $("#moldura");
  moldura.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    toque = { x: e.clientX, y: e.clientY };
  });
  moldura.addEventListener("pointermove", (e) => {
    if (!toque) return;
    const dx = e.clientX - toque.x;
    const dy = e.clientY - toque.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    virar(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "direita" : "esquerda") : dy > 0 ? "baixo" : "cima");
    toque = { x: e.clientX, y: e.clientY };
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((t) => moldura.addEventListener(t, () => { toque = null; }));

  document.querySelectorAll(".seta-dir[data-dir]").forEach((b) => {
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); virar(b.dataset.dir); });
  });
  $("#btn-pausa").addEventListener("click", () => (estadoTela === "jogando" ? pausar() : comecar()));
  $("#btn-jogar").addEventListener("click", comecar);

  document.querySelectorAll("#velocidades .modo").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.vel === vel && estadoTela !== "jogando") return;
    vel = b.dataset.vel;
    guardado.gravar("cobrinha:velocidade", vel);
    tocar("dica");
    preparar();
  }));

  // Sai da aba: pausa sozinho
  document.addEventListener("visibilitychange", () => { if (document.hidden) pausar(); });

  $("#btn-ajuda").addEventListener("click", () => { pausar(); C.abrir("#dlg-ajuda"); });
  $("#btn-comecar").addEventListener("click", () => $("#dlg-ajuda").close());
  $("#dlg-ajuda").addEventListener("close", () => guardado.gravar("cobrinha:viuAjuda", true));
  $("#btn-estatisticas").addEventListener("click", () => {
    pausar();
    const e = lerRecordes();
    const raiz = $("#est-velocidades");
    raiz.innerHTML = "";
    for (const [k, v] of Object.entries(S.VELOCIDADES)) {
      const linha = el("div");
      linha.append(el("strong", "", v.nome), el("span", "", e[k].jogos ? `${e[k].jogos} partidas` : "ainda não jogou"), el("em", "", e[k].melhor));
      raiz.appendChild(linha);
    }
    C.abrir("#dlg-estatisticas");
  });
  new ResizeObserver(dimensionar).observe($("#area"));

  // A fruta pulsa mesmo com o jogo parado
  (function animarParado() {
    if (estadoTela !== "jogando") desenhar(1);
    requestAnimationFrame(animarParado);
  })();

  C.prepararJanelas();
  C.ligarBotaoSom($("#btn-som"));
  preparar();
  if (!guardado.ler("cobrinha:viuAjuda", false)) C.abrir("#dlg-ajuda");
  C.registrarOffline("../sw.js");
})();

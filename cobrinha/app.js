// Tela da Cobrinha: menu de opções (no estilo do Snake do Google), desenho suave no canvas,
// controles e recordes.
(() => {
  "use strict";

  const C = window.Comum;
  const S = window.LogicaCobrinha;
  const { $, el, guardado, tocar } = C;

  /* ---------- Opções ---------- */

  const FRUTAS = ["🍎", "🍌", "🍍", "🍇", "🍓", "🍒", "🍊", "🍉"];
  const CORES = {
    // "claro": tons mais fortes da mesma cor, para aparecer bem nos temas Dia e Neve
    menta: { nome: "Menta", corpo: "#7fdcae", borda: "#5fbf91", claro: ["#4cc28a", "#2f9a68"] },
    ceu: { nome: "Céu", corpo: "#8ccbf5", borda: "#68acdb", claro: ["#55a8e6", "#3486c4"] },
    lilas: { nome: "Lilás", corpo: "#c4b0f5", borda: "#a590dc", claro: ["#9c80e6", "#7a5dcb"] },
    pessego: { nome: "Pêssego", corpo: "#fbbb84", borda: "#e09a62", claro: ["#f39a52", "#d2793a"] },
    rosa: { nome: "Rosa", corpo: "#f5a3c0", borda: "#dc82a2", claro: ["#e8749f", "#c85580"] },
  };
  const TEMAS = {
    noite: { nome: "Noite", icone: "🌙", a: "#323752", b: "#2e3249", muro: "#5c6290", junta: "#454a6c", fim: "rgba(43, 47, 69, .35)" },
    dia: { nome: "Dia", icone: "☀️", claro: true, a: "#e2efd9", b: "#d5e7cb", muro: "#a3b39a", junta: "#8b9b83", fim: "rgba(255, 255, 255, .3)" },
    neve: { nome: "Neve", icone: "❄️", claro: true, a: "#e9f0fa", b: "#dbe6f4", muro: "#a8b7ce", junta: "#91a1ba", fim: "rgba(255, 255, 255, .3)" },
    vulcao: { nome: "Vulcão", icone: "🌋", a: "#3f2c35", b: "#37252d", muro: "#8a5a52", junta: "#6e463f", fim: "rgba(30, 18, 24, .35)" },
  };
  const ICONES_VEL = { lenta: "🐢", normal: "🐍", rapida: "🐇" };
  const ICONES_MODO = { classico: "🏆", "sem-bordas": "🌀", muros: "🧱" };
  const PADRAO = { tamanho: "medio", velocidade: "normal", modo: "classico", frutas: 1, fruta: "🍎", cor: "menta", tema: "noite" };

  // Cada escolha do menu: nome, valores possíveis e como desenhar o quadradinho
  const ESCOLHAS = [
    { chave: "tamanho", nome: "Tamanho do campo (dificuldade)", valores: Object.keys(S.TAMANHOS), tile: (v) => tileTamanho(v) },
    { chave: "velocidade", nome: "Velocidade", valores: Object.keys(S.VELOCIDADES), tile: (v) => [ICONES_VEL[v], S.VELOCIDADES[v].nome] },
    { chave: "modo", nome: "Modo", valores: Object.keys(S.MODOS), tile: (v) => [ICONES_MODO[v], S.MODOS[v].nome] },
    { chave: "frutas", nome: "Frutas no campo", valores: S.QUANTIDADES, tile: (v) => [String(v), v === 1 ? "uma" : `${v} juntas`] },
    { chave: "fruta", nome: "Fruta", valores: FRUTAS, tile: (v) => [v, null] },
    { chave: "cor", nome: "Cor da cobra", valores: Object.keys(CORES), tile: (v) => tileCor(v) },
    { chave: "tema", nome: "Tema", valores: Object.keys(TEMAS), tile: (v) => [TEMAS[v].icone, TEMAS[v].nome] },
  ];

  function carregarOpcoes() {
    const o = Object.assign({}, PADRAO, guardado.ler("cobrinha:opcoes", {}));
    // Valor salvo que não existe mais volta ao padrão
    for (const e of ESCOLHAS) if (!e.valores.includes(o[e.chave])) o[e.chave] = PADRAO[e.chave];
    return o;
  }
  let opcoes = carregarOpcoes();
  let rascunho = { ...opcoes }; // o que está marcado no menu antes de apertar "Jogar"

  /* ---------- Estado ---------- */

  let jogo = null;
  let anterior = null; // posições antes do último passo, para deslizar entre as casas
  let estadoTela = "pronto"; // pronto | jogando | pausado | fim
  let acumulado = 0;
  let ultimoQuadro = 0;
  let casa = 24;
  let comeuEm = 0;
  const tela = $("#tela");
  const ctx = tela.getContext("2d");

  const chaveRecorde = () => `${opcoes.tamanho}|${opcoes.velocidade}|${opcoes.modo}`;
  const lerRecordes = () => guardado.ler("cobrinha:recordes2", {});

  /* ---------- Tamanho do campo ---------- */

  // Deitado usa o tamanho do Google (ex.: 17 × 15); em pé, gira o campo (15 × 17)
  function dimensoes() {
    const t = S.TAMANHOS[opcoes.tamanho];
    const area = $("#area");
    return area.clientWidth >= area.clientHeight ? [t.cols, t.linhas] : [t.linhas, t.cols];
  }

  function dimensionar() {
    if (!jogo) return;
    const area = $("#area");
    const largura = area.clientWidth - 24 - 14;
    const altura = area.clientHeight - 20 - 14;
    casa = Math.max(8, Math.floor(Math.min(largura / jogo.cols, altura / jogo.linhas, 44)));
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
    jogo = S.criar(cols, linhas, { modo: opcoes.modo, frutas: opcoes.frutas });
    anterior = jogo.cobra.map((p) => ({ ...p }));
    acumulado = 0;
    estadoTela = "pronto";
    $("#chip").textContent = `${S.TAMANHOS[opcoes.tamanho].nome.toLowerCase()} · ${S.VELOCIDADES[opcoes.velocidade].nome.toLowerCase()}`;
    $("#fruta-placar").textContent = opcoes.fruta;
    atualizarPlacar();
    mostrarSobreposicao("Cobrinha", `${S.MODOS[opcoes.modo].nome} · deslize ou use as setas para começar`, "Jogar");
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
    if (estadoTela === "fim" || document.querySelector("dialog[open]")) return;
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
    const passoMs = S.VELOCIDADES[opcoes.velocidade].ms;
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
    const recordes = lerRecordes();
    const chave = chaveRecorde();
    const antes = (recordes[chave] && recordes[chave].melhor) || 0;
    const recorde = jogo.pontos > antes;
    recordes[chave] = { melhor: Math.max(antes, jogo.pontos), jogos: ((recordes[chave] && recordes[chave].jogos) || 0) + 1 };
    guardado.gravar("cobrinha:recordes2", recordes);
    atualizarPlacar();
    tocar(jogo.venceu ? "vitoria" : "erro");
    setTimeout(() => tocar(recorde ? "recorde" : "derrota"), 200);
    const frutas = `${jogo.pontos} ${jogo.pontos === 1 ? "fruta" : "frutas"}`;
    setTimeout(() => {
      mostrarSobreposicao(
        jogo.venceu ? "Zerou!" : recorde ? "Novo recorde!" : "Bateu!",
        `${frutas} · recorde ${recordes[chave].melhor}`,
        "Jogar de novo"
      );
    }, 450);
  }

  function atualizarPlacar() {
    const r = lerRecordes()[chaveRecorde()];
    $("#pontos").textContent = jogo.pontos;
    $("#recorde").textContent = Math.max((r && r.melhor) || 0, jogo.pontos);
  }

  /* ---------- Desenho ---------- */

  function desenhar(t) {
    if (!jogo) return;
    const tema = TEMAS[opcoes.tema];
    const cor = CORES[opcoes.cor];
    // Campo quadriculado
    for (let y = 0; y < jogo.linhas; y++) {
      for (let x = 0; x < jogo.cols; x++) {
        ctx.fillStyle = (x + y) % 2 ? tema.a : tema.b;
        ctx.fillRect(x * casa, y * casa, casa, casa);
      }
    }
    for (const m of jogo.muros) desenharMuro(m, tema);
    for (const c of jogo.comidas) desenharFruta(c);

    // Cada gomo desliza da casa anterior para a atual, formando uma linha contínua.
    // No modo sem bordas, quando um gomo atravessa, ele aparece direto do outro lado.
    const k = estadoTela === "fim" ? 1 : t;
    const pontos = jogo.cobra.map((p, i) => {
      const a = anterior[i] || p;
      const pulou = Math.abs(a.x - p.x) > 1 || Math.abs(a.y - p.y) > 1;
      const base = pulou ? p : a;
      return { x: (base.x + (p.x - base.x) * k + 0.5) * casa, y: (base.y + (p.y - base.y) * k + 0.5) * casa };
    });
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const [corpo, borda] = tema.claro ? cor.claro : [cor.corpo, cor.borda];
    ctx.strokeStyle = borda;
    ctx.lineWidth = casa * 0.78;
    tracar(pontos);
    ctx.strokeStyle = corpo;
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
      ctx.fillStyle = "#24283e";
      ctx.beginPath();
      ctx.arc(ox + dx * casa * 0.04, oy + dy * casa * 0.04, casa * 0.065, 0, Math.PI * 2);
      ctx.fill();
    }

    if (estadoTela === "fim" && !jogo.venceu) {
      ctx.fillStyle = tema.fim;
      ctx.fillRect(0, 0, jogo.cols * casa, jogo.linhas * casa);
    }
  }

  // Linha da cobra; no modo sem bordas, quebra o traço onde ela atravessa a borda
  function tracar(pontos) {
    ctx.beginPath();
    ctx.moveTo(pontos[0].x, pontos[0].y);
    for (let i = 1; i < pontos.length; i++) {
      const salto = Math.abs(pontos[i].x - pontos[i - 1].x) > casa * 1.5 || Math.abs(pontos[i].y - pontos[i - 1].y) > casa * 1.5;
      if (salto) ctx.moveTo(pontos[i].x, pontos[i].y);
      else ctx.lineTo(pontos[i].x, pontos[i].y);
    }
    if (pontos.length === 1) ctx.lineTo(pontos[0].x + 0.01, pontos[0].y);
    ctx.stroke();
  }

  function desenharMuro(m, tema) {
    const x = m.x * casa + casa * 0.06;
    const y = m.y * casa + casa * 0.06;
    const l = casa * 0.88;
    ctx.fillStyle = tema.muro;
    ctx.beginPath();
    ctx.roundRect(x, y, l, l, casa * 0.18);
    ctx.fill();
    // Juntas dos tijolos
    ctx.strokeStyle = tema.junta;
    ctx.lineWidth = Math.max(1, casa * 0.06);
    ctx.beginPath();
    ctx.moveTo(x + l * 0.08, y + l / 2);
    ctx.lineTo(x + l * 0.92, y + l / 2);
    ctx.moveTo(x + l / 2, y + l * 0.12);
    ctx.lineTo(x + l / 2, y + l / 2);
    ctx.moveTo(x + l * 0.28, y + l / 2);
    ctx.lineTo(x + l * 0.28, y + l * 0.88);
    ctx.moveTo(x + l * 0.72, y + l / 2);
    ctx.lineTo(x + l * 0.72, y + l * 0.88);
    ctx.stroke();
  }

  function desenharFruta(c) {
    const cx = (c.x + 0.5) * casa;
    const cy = (c.y + 0.5) * casa;
    // Pulsa de leve; logo depois de comer, a nova fruta "nasce" crescendo
    const nasce = Math.min(1, (performance.now() - comeuEm) / 220);
    const escala = (0.6 + 0.4 * nasce) * (1 + 0.05 * Math.sin(performance.now() / 180));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(escala, escala);
    ctx.font = `${Math.round(casa * 0.8)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(opcoes.fruta, 0, casa * 0.04);
    ctx.restore();
  }

  /* ---------- Menu de opções ---------- */

  function tileTamanho(v) {
    const t = S.TAMANHOS[v];
    const n = { pequeno: 3, medio: 4, grande: 6 }[v];
    const grade = el("span", "grade-mini");
    grade.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    for (let i = 0; i < n * n; i++) grade.appendChild(el("i"));
    return [grade, t.nivel.charAt(0).toUpperCase() + t.nivel.slice(1)];
  }
  function tileCor(v) {
    const bola = el("span", "bola");
    bola.style.background = CORES[v].corpo;
    bola.style.boxShadow = `inset 0 0 0 3px ${CORES[v].borda}`;
    return [bola, CORES[v].nome];
  }

  function desenharOpcoes() {
    const raiz = $("#grupos-opcoes");
    raiz.innerHTML = "";
    for (const e of ESCOLHAS) {
      const grupo = el("div", "grupo-opcao");
      grupo.appendChild(el("span", "", e.nome));
      const fileira = el("div", "fileira-opcoes");
      fileira.setAttribute("role", "radiogroup");
      fileira.setAttribute("aria-label", e.nome);
      for (const v of e.valores) {
        const [icone, rotulo] = e.tile(v);
        const b = el("button", "opcao-tile");
        b.type = "button";
        b.setAttribute("aria-pressed", rascunho[e.chave] === v ? "true" : "false");
        b.setAttribute("aria-label", rotulo || String(v));
        if (typeof icone === "string") b.appendChild(el("span", "grande", icone));
        else b.appendChild(icone);
        if (rotulo) b.appendChild(el("small", "", rotulo));
        b.addEventListener("click", () => {
          rascunho[e.chave] = v;
          tocar("tecla", e.valores.indexOf(v));
          desenharOpcoes();
        });
        fileira.appendChild(b);
      }
      grupo.appendChild(fileira);
      raiz.appendChild(grupo);
    }
  }

  function abrirOpcoes() {
    pausar();
    rascunho = { ...opcoes };
    desenharOpcoes();
    C.abrir("#dlg-opcoes");
  }

  function aplicarOpcoes() {
    opcoes = { ...rascunho };
    guardado.gravar("cobrinha:opcoes", opcoes);
    $("#dlg-opcoes").close();
    preparar();
    comecar();
  }

  $("#btn-opcoes").addEventListener("click", abrirOpcoes);
  $("#btn-sob-opcoes").addEventListener("click", abrirOpcoes);
  $("#btn-aplicar").addEventListener("click", aplicarOpcoes);
  $("#btn-sortear").addEventListener("click", () => {
    for (const e of ESCOLHAS) rascunho[e.chave] = e.valores[Math.floor(Math.random() * e.valores.length)];
    tocar("dica");
    desenharOpcoes();
  });
  $("#btn-redefinir").addEventListener("click", () => {
    rascunho = { ...PADRAO };
    tocar("apagar", 0);
    desenharOpcoes();
  });

  /* ---------- Recordes ---------- */

  $("#btn-estatisticas").addEventListener("click", () => {
    pausar();
    const recordes = lerRecordes();
    const raiz = $("#est-lista");
    raiz.innerHTML = "";
    const lista = Object.entries(recordes).filter(([, r]) => r.melhor > 0).sort((a, b) => b[1].melhor - a[1].melhor).slice(0, 10);
    if (!lista.length) raiz.appendChild(el("p", "vazio", "Jogue uma partida para começar a marcar recordes."));
    for (const [chave, r] of lista) {
      const [tam, vel, modo] = chave.split("|");
      if (!S.TAMANHOS[tam] || !S.VELOCIDADES[vel] || !S.MODOS[modo]) continue;
      const linha = el("div");
      const texto = el("div");
      texto.append(
        el("strong", "", `${S.TAMANHOS[tam].nome} · ${S.VELOCIDADES[vel].nome}`),
        el("span", "", `${S.MODOS[modo].nome} · ${r.jogos} ${r.jogos === 1 ? "partida" : "partidas"}`)
      );
      linha.append(texto, el("em", "", r.melhor));
      raiz.appendChild(linha);
    }
    C.abrir("#dlg-estatisticas");
  });

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

  // Sai da aba: pausa sozinho
  document.addEventListener("visibilitychange", () => { if (document.hidden) pausar(); });

  $("#btn-ajuda").addEventListener("click", () => { pausar(); C.abrir("#dlg-ajuda"); });
  $("#btn-comecar").addEventListener("click", () => $("#dlg-ajuda").close());
  $("#dlg-ajuda").addEventListener("close", () => guardado.gravar("cobrinha:viuAjuda", true));
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

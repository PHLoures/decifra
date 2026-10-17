// Tela da Cobrinha: menu de opções (no estilo do Snake do Google), desenho suave no canvas,
// controles sem atraso e recordes.
(() => {
  "use strict";

  const C = window.Comum;
  const S = window.LogicaCobrinha;
  const F = window.Frutas;
  const { $, el, guardado, tocar } = C;

  /* ---------- Opções ---------- */

  const CORES = {
    // "claro": tons mais fortes da mesma cor, para aparecer bem nos temas Dia e Neve
    menta: { nome: "Menta", corpo: "#7fdcae", borda: "#5fbf91", claro: ["#4cc28a", "#2f9a68"] },
    ceu: { nome: "Céu", corpo: "#8ccbf5", borda: "#68acdb", claro: ["#55a8e6", "#3486c4"] },
    lilas: { nome: "Lilás", corpo: "#c4b0f5", borda: "#a590dc", claro: ["#9c80e6", "#7a5dcb"] },
    pessego: { nome: "Pêssego", corpo: "#fbbb84", borda: "#e09a62", claro: ["#f39a52", "#d2793a"] },
    rosa: { nome: "Rosa", corpo: "#f5a3c0", borda: "#dc82a2", claro: ["#e8749f", "#c85580"] },
  };
  const TEMAS = {
    noite: { nome: "Noite", a: "#323752", b: "#2e3249", muro: "#5c6290", junta: "#454a6c", fim: "rgba(43, 47, 69, .35)" },
    dia: { nome: "Dia", claro: true, a: "#e2efd9", b: "#d5e7cb", muro: "#a3b39a", junta: "#8b9b83", fim: "rgba(255, 255, 255, .3)" },
    neve: { nome: "Neve", claro: true, a: "#e9f0fa", b: "#dbe6f4", muro: "#a8b7ce", junta: "#91a1ba", fim: "rgba(255, 255, 255, .3)" },
    vulcao: { nome: "Vulcão", a: "#3f2c35", b: "#37252d", muro: "#8a5a52", junta: "#6e463f", fim: "rgba(30, 18, 24, .35)" },
  };
  // Ícones de linha (SVG) para o menu
  const ICONES = {
    lenta: '<path d="M10 6l6 6-6 6"/>',
    normal: '<path d="M6 6l6 6-6 6M13 6l6 6-6 6"/>',
    rapida: '<path d="M3 6l6 6-6 6M9.5 6l6 6-6 6M16 6l6 6-6 6"/>',
    classico: '<rect x="4" y="4" width="16" height="16" rx="2.5"/>',
    "sem-bordas": '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><path d="M8 12h8M13 9l3 3-3 3"/>',
    muros: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 12h18M9 5v7M15 12v7"/>',
    noite: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    dia: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
    neve: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2"/>',
    vulcao: '<path d="M3 20l6-10h6l6 10z"/><path d="M10 10l2-3 2 3M12 4V2M8.5 5L7 3.5M15.5 5L17 3.5"/>',
  };
  const PADRAO = { tamanho: "medio", velocidade: "normal", modo: "classico", frutas: 1, fruta: "maca", cor: "menta", tema: "noite" };

  const svg = (desenho) => {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = desenho;
    return s;
  };
  const iconeFruta = (tipo, tam = 28) => {
    const c = el("canvas");
    c.style.width = `${tam}px`;
    c.style.height = `${tam}px`;
    c.width = tam;
    requestAnimationFrame(() => F.pintarIcone(c, tipo));
    return c;
  };

  // Cada escolha do menu: nome, valores possíveis e como desenhar o quadradinho
  const ESCOLHAS = [
    { chave: "tamanho", nome: "Tamanho do campo (dificuldade)", valores: Object.keys(S.TAMANHOS), tile: (v) => tileTamanho(v) },
    { chave: "velocidade", nome: "Velocidade", valores: Object.keys(S.VELOCIDADES), tile: (v) => [svg(ICONES[v]), S.VELOCIDADES[v].nome] },
    { chave: "modo", nome: "Modo", valores: Object.keys(S.MODOS), tile: (v) => [svg(ICONES[v]), S.MODOS[v].nome] },
    { chave: "frutas", nome: "Frutas no campo", valores: S.QUANTIDADES, tile: (v) => tileQuantidade(v) },
    { chave: "fruta", nome: "Fruta", valores: Object.keys(F.FRUTAS), tile: (v) => [iconeFruta(v), F.FRUTAS[v].nome] },
    { chave: "cor", nome: "Cor da cobra", valores: Object.keys(CORES), tile: (v) => tileCor(v) },
    { chave: "tema", nome: "Tema", valores: Object.keys(TEMAS), tile: (v) => [svg(ICONES[v]), TEMAS[v].nome] },
  ];

  function carregarOpcoes() {
    const o = Object.assign({}, PADRAO, guardado.ler("cobrinha:opcoes", {}));
    // Valor salvo que não existe mais (ex.: as frutas antigas em emoji) volta ao padrão
    for (const e of ESCOLHAS) if (!e.valores.includes(o[e.chave])) o[e.chave] = PADRAO[e.chave];
    return o;
  }
  let opcoes = carregarOpcoes();
  let rascunho = { ...opcoes }; // o que está marcado no menu antes de apertar "Jogar"

  /* ---------- Estado ---------- */

  let jogo = null;
  let anterior = null; // posições antes do último passo, para deslizar entre as casas
  let antesDoPasso = null; // cópia do jogo antes do último passo (para virar sem atraso)
  let ultimoPasso = null;
  let estadoTela = "pronto"; // pronto | jogando | pausado | fim
  let acumulado = 0;
  let ultimoQuadro = 0;
  let casa = 24;
  let comeuEm = 0;
  const tela = $("#tela");
  const ctx = tela.getContext("2d");

  const chaveRecorde = () => `${opcoes.tamanho}|${opcoes.velocidade}|${opcoes.modo}`;
  const lerRecordes = () => guardado.ler("cobrinha:recordes2", {});
  const passoMs = () => S.VELOCIDADES[opcoes.velocidade].ms;
  const copiar = (e) => ({
    ...e,
    cobra: e.cobra.map((p) => ({ ...p })),
    fila: [...e.fila],
    muros: e.muros.map((p) => ({ ...p })),
    comidas: e.comidas.map((p) => ({ ...p })),
  });

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
    antesDoPasso = null;
    ultimoPasso = null;
    acumulado = 0;
    estadoTela = "pronto";
    $("#chip").textContent = `${S.TAMANHOS[opcoes.tamanho].nome.toLowerCase()} · ${S.VELOCIDADES[opcoes.velocidade].nome.toLowerCase()}`;
    F.pintarIcone($("#fruta-placar"), opcoes.fruta);
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

  // Um passo da cobra, guardando o necessário para animar e para poder refazê-lo
  function darPasso(agora) {
    antesDoPasso = copiar(jogo);
    anterior = jogo.cobra.map((p) => ({ ...p }));
    const r = S.passo(jogo);
    ultimoPasso = r;
    return tratarPasso(r, agora);
  }
  const NOMES_DIR = { cima: "para cima", baixo: "para baixo", esquerda: "para a esquerda", direita: "para a direita" };
  function tratarPasso(r, agora) {
    tela.dataset.direcao = jogo.dir;
    tela.setAttribute("aria-label", `Cobrinha indo ${NOMES_DIR[jogo.dir]}, ${jogo.pontos} ${jogo.pontos === 1 ? "fruta" : "frutas"}`);
    if (r.comeu) {
      comeuEm = agora;
      tocar("moeda");
      atualizarPlacar();
    }
    if (r.bateu || !jogo.vivo) {
      terminar();
      return false;
    }
    return true;
  }

  // Virar sem atraso: no começo de um passo, ele é refeito já virando; mais para o fim,
  // a virada entra no próximo passo (sem adiantar, para a cobra não acelerar).
  function virarJa(dir) {
    const filaVazia = jogo.fila.length === 0;
    if (!S.virar(jogo, dir) || !filaVazia) return;
    const t = acumulado / passoMs();
    const agora = performance.now();
    const podeRefazer = antesDoPasso && ultimoPasso && !ultimoPasso.comeu && antesDoPasso.dir === jogo.dir && antesDoPasso.fila.length === 0;
    if (t < 0.5 && podeRefazer && S.virar(antesDoPasso, dir)) {
      const fila = jogo.fila.slice(1);
      jogo = copiar(antesDoPasso);
      jogo.fila.push(...fila);
      const r = S.passo(jogo);
      ultimoPasso = r;
      tratarPasso(r, agora);
    }
    desenhar(acumulado / passoMs());
  }

  function virar(dir) {
    if (estadoTela === "fim" || document.querySelector("dialog[open]")) return;
    if (estadoTela !== "jogando") {
      // A primeira direção também já começa o jogo (meia-volta não vale)
      if (dir !== S.OPOSTA[jogo.dir]) S.virar(jogo, dir);
      comecar();
      return;
    }
    virarJa(dir);
  }

  function quadro(agora) {
    if (estadoTela !== "jogando") return;
    acumulado += Math.min(agora - ultimoQuadro, 250);
    ultimoQuadro = agora;
    while (acumulado >= passoMs() && estadoTela === "jogando") {
      acumulado -= passoMs();
      if (!darPasso(agora)) return;
    }
    desenhar(acumulado / passoMs());
    requestAnimationFrame(quadro);
  }

  // Batida no estilo do Google: tranco da cabeça, a cobra pisca e só depois vem o fim
  let morteEm = 0;
  function animarBatida(agora) {
    if (estadoTela !== "fim") return;
    desenhar(1);
    if (agora - morteEm < 1500) requestAnimationFrame(animarBatida);
  }
  function terminar() {
    estadoTela = "fim";
    morteEm = performance.now();
    requestAnimationFrame(animarBatida);
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
    }, 1500);
  }

  function atualizarPlacar() {
    const r = lerRecordes()[chaveRecorde()];
    $("#pontos").textContent = jogo.pontos;
    $("#recorde").textContent = Math.max((r && r.melhor) || 0, jogo.pontos);
  }

  /* ---------- Desenho ---------- */

  const centro = (p) => ({ x: (p.x + 0.5) * casa, y: (p.y + 0.5) * casa });
  const misturar = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
  const saltou = (a, b) => Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1;

  // Trilho do corpo: a cabeça desliza para a casa nova, o meio segue exatamente o centro das
  // casas (curvas em ângulo reto, arredondadas) e a ponta do rabo desliza para fora da casa antiga.
  function trilho(t) {
    const atual = jogo.cobra;
    const n = atual.length;
    const pontos = [];
    const cab = atual[0];
    const cabAntes = anterior[0] || cab;
    pontos.push(saltou(cabAntes, cab) ? centro(cab) : centro(misturar(cabAntes, cab, t)));
    for (let i = 1; i < n; i++) pontos.push(centro(atual[i]));
    if (n > 1) {
      const rabo = atual[n - 1];
      const raboAntes = anterior[n - 1];
      // Se cresceu, o rabo fica parado; senão, sai devagar da casa em que estava
      pontos.push(!raboAntes || saltou(raboAntes, rabo) ? centro(rabo) : centro(misturar(raboAntes, rabo, t)));
    }
    return pontos;
  }

  function desenhar(t) {
    if (!jogo) return;
    const tema = TEMAS[opcoes.tema];
    const cor = CORES[opcoes.cor];
    for (let y = 0; y < jogo.linhas; y++) {
      for (let x = 0; x < jogo.cols; x++) {
        ctx.fillStyle = (x + y) % 2 ? tema.a : tema.b;
        ctx.fillRect(x * casa, y * casa, casa, casa);
      }
    }
    for (const m of jogo.muros) desenharMuro(m, tema);
    for (const c of jogo.comidas) desenharFruta(c);

    const pontos = trilho(estadoTela === "fim" ? 1 : Math.max(0, Math.min(1, t)));
    const desdeBatida = estadoTela === "fim" && !jogo.venceu ? performance.now() - morteEm : Infinity;
    if (desdeBatida < 220) {
      // Tranco: a cabeça avança um pouco contra o obstáculo e volta
      const [dx, dy] = S.DIRECOES[jogo.dir];
      const k = Math.sin((desdeBatida / 220) * Math.PI) * casa * 0.28;
      pontos[0] = { x: pontos[0].x + dx * k, y: pontos[0].y + dy * k };
    }
    // Depois do tranco, pisca três vezes
    const apagada = desdeBatida >= 220 && desdeBatida < 1200 && Math.floor((desdeBatida - 220) / 160) % 2 === 0;
    const [corpo, borda] = tema.claro ? cor.claro : [cor.corpo, cor.borda];
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = apagada ? 0.25 : 1;
    ctx.strokeStyle = borda;
    ctx.lineWidth = casa * 0.76;
    tracar(pontos);
    ctx.strokeStyle = corpo;
    ctx.lineWidth = casa * 0.62;
    tracar(pontos);
    desenharOlhos(pontos[0], desdeBatida < Infinity);
    ctx.globalAlpha = 1;

    if (estadoTela === "fim" && !jogo.venceu) {
      ctx.fillStyle = tema.fim;
      ctx.fillRect(0, 0, jogo.cols * casa, jogo.linhas * casa);
    }
  }

  // No modo sem bordas, o traço é interrompido onde a cobra atravessa a borda
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

  function desenharOlhos(cabeca, tonta) {
    if (tonta) {
      // Olhos em X depois de bater
      const [dx, dy] = S.DIRECOES[jogo.dir];
      const lado = { x: -dy, y: dx };
      ctx.strokeStyle = "#24283e";
      ctx.lineWidth = casa * 0.07;
      for (const s of [-1, 1]) {
        const ox = cabeca.x + dx * casa * 0.1 + lado.x * s * casa * 0.16;
        const oy = cabeca.y + dy * casa * 0.1 + lado.y * s * casa * 0.16;
        const d = casa * 0.08;
        ctx.beginPath();
        ctx.moveTo(ox - d, oy - d); ctx.lineTo(ox + d, oy + d);
        ctx.moveTo(ox + d, oy - d); ctx.lineTo(ox - d, oy + d);
        ctx.stroke();
      }
      return;
    }
    const [dx, dy] = S.DIRECOES[jogo.dir];
    const lado = { x: -dy, y: dx };
    for (const s of [-1, 1]) {
      const ox = cabeca.x + dx * casa * 0.1 + lado.x * s * casa * 0.16;
      const oy = cabeca.y + dy * casa * 0.1 + lado.y * s * casa * 0.16;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(ox, oy, casa * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#24283e";
      ctx.beginPath();
      ctx.arc(ox + dx * casa * 0.04, oy + dy * casa * 0.04, casa * 0.065, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function desenharMuro(m, tema) {
    const x = m.x * casa + casa * 0.06;
    const y = m.y * casa + casa * 0.06;
    const l = casa * 0.88;
    ctx.fillStyle = tema.muro;
    ctx.beginPath();
    ctx.roundRect(x, y, l, l, casa * 0.18);
    ctx.fill();
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
    // Respira de leve; logo depois de comer, a fruta nova "nasce" crescendo
    const nasce = Math.min(1, (performance.now() - comeuEm) / 220);
    const escala = (0.6 + 0.4 * nasce) * (1 + 0.04 * Math.sin(performance.now() / 220));
    ctx.save();
    ctx.translate((c.x + 0.5) * casa, (c.y + 0.5) * casa);
    ctx.scale(escala, escala);
    F.FRUTAS[opcoes.fruta].desenhar(ctx, casa * 0.4);
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
  function tileQuantidade(v) {
    const caixa = el("span", "com-numero");
    caixa.append(String(v), iconeFruta(rascunho.fruta, 20));
    return [caixa, v === 1 ? "uma" : "juntas"];
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
        b.appendChild(icone);
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
      if (!e.repeat) virar(TECLAS[e.key]);
    } else if (e.key === " " || e.key === "p" || e.key === "P") {
      e.preventDefault();
      if (estadoTela === "jogando") pausar();
      else comecar();
    } else if (e.key === "Enter" && estadoTela !== "jogando") {
      e.preventDefault();
      comecar();
    }
  });

  // Deslizar o dedo no campo: reage logo no começo do gesto
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
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
    virar(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "direita" : "esquerda") : dy > 0 ? "baixo" : "cima");
    toque = { x: e.clientX, y: e.clientY };
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((t) => moldura.addEventListener(t, () => { toque = null; }));

  // Botões de direção respondem no toque (pointerdown), sem esperar soltar o dedo
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

  // A fruta respira mesmo com o jogo parado
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

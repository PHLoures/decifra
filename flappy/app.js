// Tela do Flappy: céu com paralaxe, canos, passarinho batendo asa, pontos grandes no topo,
// batida com clarão e tremida, painel de fim com medalha e recordes por nível.
(() => {
  "use strict";

  const C = window.Comum;
  const F = window.LogicaFlappy;
  const { $, el, guardado, tocar } = C;

  const PASSO = 1000 / 60;
  const MEDALHAS = { bronze: "bronze", prata: "prata", ouro: "ouro", platina: "platina" };

  let nivel = guardado.ler("flappy:nivel", "facil");
  if (!F.NIVEIS[nivel]) nivel = "facil";
  let jogo;
  let escala = 1;
  let largura = F.L; // largura do mundo, em unidades (a altura é sempre F.A)
  let topoLivre = 30; // primeira altura do mundo abaixo do topo e do seletor
  let ceuExtra = 0; // em telas compridas, quanto de céu sobra acima do mundo clássico
  let acumulado = 0;
  let ultimo = performance.now();
  let rolagem = 0; // quanto o cenário já andou (para as camadas do fundo)
  let rolagemAntes = 0;
  let antes = null; // posições do passo anterior, para desenhar suave entre passos
  let batidaEm = null;
  let aceleradoEm = null; // quando apareceu o último aviso de "mais rápido!"
  let podeReiniciar = true;
  let painelTimer = null;

  const tela = $("#tela");
  const ctx = tela.getContext("2d");
  const cfg = () => F.NIVEIS[nivel];

  // Estrelas fixas e nuvens sorteadas uma vez
  const sorteio = C.sorteador(7);
  // (posições em fração da tela, para servir em qualquer largura)
  const ESTRELAS = Array.from({ length: 70 }, () => ({ x: sorteio(), y: sorteio() * 280, r: 0.6 + sorteio() * 1.2, f: sorteio() * 6 }));
  const NUVENS = Array.from({ length: 12 }, () => ({ x: sorteio(), y: 250 + sorteio() * 70, l: 70 + sorteio() * 50 }));

  /* ---------- Tamanho ---------- */

  // Tela cheia: a altura do mundo cabe na tela e a largura acompanha a da tela
  function dimensionar() {
    const area = $("#area");
    const cw = area.clientWidth;
    const ch = area.clientHeight;
    if (!cw || !ch) return;
    if (cw / ch >= F.L / F.A) {
      escala = ch / F.A;
      ceuExtra = 0;
    } else {
      // Tela comprida (celular em pé): mantém a largura clássica e o céu cresce para cima
      escala = cw / F.L;
      ceuExtra = ch / escala - F.A;
    }
    largura = cw / escala;
    const dpr = window.devicePixelRatio || 1;
    tela.style.width = `${cw}px`;
    tela.style.height = `${ch}px`;
    tela.width = Math.round(cw * dpr);
    tela.height = Math.round(ch * dpr);
    const sy = tela.height / (F.A + ceuExtra);
    ctx.setTransform(tela.width / largura, 0, 0, sy, 0, ceuExtra * sy);
    topoLivre = Math.max(20 - ceuExtra, ($(".barra-flappy").getBoundingClientRect().bottom + 6) / escala - ceuExtra);
    if (jogo) F.redimensionar(jogo, largura, -ceuExtra);
  }

  /* ---------- Partida ---------- */

  function novo() {
    clearTimeout(painelTimer);
    jogo = F.criar({ nivel, largura, teto: -ceuExtra });
    antes = null;
    batidaEm = null;
    aceleradoEm = null;
    $("#painel-fim").hidden = true;
    $("#nivel-nome").textContent = cfg().nome;
    $("#rodape").textContent = "toque em qualquer lugar, clique ou aperte espaço para voar";
    document.body.classList.remove("voando");
    $("#recorde").textContent = lerRecordes()[nivel].melhor;
    montarListaNiveis();
  }

  function voar() {
    if (!$("#painel-fim").hidden) return;
    if (jogo.fim) return;
    fecharLista();
    if (F.pular(jogo)) {
      tocar("tecla", 7);
      document.body.classList.add("voando");
    }
  }

  function lembrar() {
    antes = {
      y: jogo.passaro.y,
      canos: new Map(jogo.canos.map((c) => [c, { x: c.x, meio: c.meio }])),
    };
    rolagemAntes = rolagem;
  }

  function quadro(agora) {
    acumulado += Math.min(agora - ultimo, 120);
    ultimo = agora;
    while (acumulado >= PASSO) {
      acumulado -= PASSO;
      lembrar();
      const estavaVivo = !jogo.fim;
      if (!jogo.fim) rolagem += jogo.iniciado ? jogo.vel : 1;
      const r = F.passo(jogo);
      if (r.ponto) {
        tocar("moeda");
        $("#rodape").textContent = jogo.pontos === 1 ? "1 cano vencido" : `${jogo.pontos} canos vencidos`;
      }
      if (r.acelerou) {
        aceleradoEm = agora;
        tocar("dica");
      }
      if (r.bateu && estavaVivo) bater(agora);
    }
    desenhar(acumulado / PASSO, agora);
    requestAnimationFrame(quadro);
  }

  function bater(agora) {
    batidaEm = agora;
    podeReiniciar = false;
    document.body.classList.remove("voando");
    tocar("erro");
    try { navigator.vibrate && navigator.vibrate(40); } catch { /* sem vibração */ }
    const todos = lerRecordes();
    const r = todos[nivel];
    r.jogos++;
    const recorde = jogo.pontos > r.melhor;
    if (recorde) r.melhor = jogo.pontos;
    guardado.gravar("flappy:recordes", todos);
    $("#recorde").textContent = r.melhor;
    painelTimer = setTimeout(() => {
      const m = F.medalha(jogo.pontos);
      $("#fim-titulo").textContent = recorde && jogo.pontos > 0 ? "Novo recorde!" : "Fim de jogo";
      $("#fim-pontos").textContent = jogo.pontos;
      $("#fim-recorde").textContent = r.melhor;
      $("#medalha").className = `medalha${m ? ` ${MEDALHAS[m]}` : ""}`;
      $("#medalha").title = m ? `medalha de ${m}` : "sem medalha (faça 10 pontos)";
      $("#painel-fim").hidden = false;
      tocar(recorde && jogo.pontos > 0 ? "recorde" : "derrota");
      setTimeout(() => { podeReiniciar = true; }, 450);
    }, 750);
  }

  function lerRecordes() {
    const base = {};
    for (const k of Object.keys(F.NIVEIS)) base[k] = { jogos: 0, melhor: 0 };
    const salvo = guardado.ler("flappy:recordes", {});
    for (const k of Object.keys(base)) Object.assign(base[k], salvo[k] || {});
    return base;
  }

  /* ---------- Desenho ---------- */

  const lerp = (a, b, t) => a + (b - a) * t;

  function desenhar(t, agora) {
    const g = ctx;
    const LW = jogo.L;
    const tremida = batidaEm && agora - batidaEm < 260 ? (1 - (agora - batidaEm) / 260) * 5 : 0;
    g.save();
    if (tremida) g.translate((Math.random() - 0.5) * tremida, (Math.random() - 0.5) * tremida);

    // Céu
    const ceu = g.createLinearGradient(0, -ceuExtra, 0, F.CHAO);
    ceu.addColorStop(0, "#272b45");
    ceu.addColorStop(0.65, "#3e3d66");
    ceu.addColorStop(1, "#5b5384");
    g.fillStyle = ceu;
    g.fillRect(-10, -ceuExtra - 10, LW + 20, F.CHAO + ceuExtra + 10);
    const rol = lerp(rolagemAntes, rolagem, t);

    // Estrelas piscando e lua
    for (const s of ESTRELAS) {
      g.globalAlpha = 0.35 + 0.35 * Math.sin(agora / 700 + s.f);
      g.fillStyle = "#eceaf5";
      g.beginPath();
      g.arc(s.x * LW, s.y * (1 + ceuExtra / 280) - ceuExtra, s.r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    g.fillStyle = "#f6dc8a";
    const luaX = LW - 62;
    const luaY = topoLivre + 44;
    g.beginPath(); g.arc(luaX, luaY, 20, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#3a3a5f";
    g.beginPath(); g.arc(luaX + 10, luaY - 6, 17, 0, Math.PI * 2); g.fill();

    // Nuvens (bem devagar) e morros (um pouco mais rápido)
    g.fillStyle = "rgba(196, 176, 245, .16)";
    const volta = Math.max(LW + 140, 420);
    for (const n of NUVENS.slice(0, Math.max(5, Math.ceil(LW / 80)))) {
      const x = ((((n.x * volta - rol * 0.15) % volta) + volta) % volta) - 120;
      nuvem(g, x, n.y, n.l);
    }
    morros(g, rol * 0.35, 372, 46, "#4a4677", 140);
    morros(g, rol * 0.6, 400, 34, "#52507f", 96);

    // Canos
    for (const c of jogo.canos) {
      const a = antes && antes.canos.get(c);
      cano(g, a ? lerp(a.x, c.x, t) : c.x, a ? lerp(a.meio, c.meio, t) : c.meio);
    }

    // Chão listrado
    g.fillStyle = "#3a3f5c";
    g.fillRect(-10, F.CHAO, LW + 20, F.A - F.CHAO + 10);
    g.fillStyle = "#7fdcae";
    g.fillRect(-10, F.CHAO, LW + 20, 12);
    g.fillStyle = "#6bc89b";
    const off = rol % 24;
    for (let x = -off - 24; x < LW + 24; x += 24) {
      g.beginPath();
      g.moveTo(x, F.CHAO + 12); g.lineTo(x + 12, F.CHAO + 12); g.lineTo(x + 20, F.CHAO); g.lineTo(x + 8, F.CHAO);
      g.fill();
    }
    g.fillStyle = "rgba(0, 0, 0, .18)";
    g.fillRect(-10, F.CHAO + 12, LW + 20, 3);

    // Passarinho
    const p = jogo.passaro;
    const y = antes ? lerp(antes.y, p.y, t) : p.y;
    passarinho(g, p.x, y, p.vy, agora);

    // Pontos grandes no topo
    if (jogo.iniciado) {
      g.font = "800 52px 'Barlow Condensed', sans-serif";
      g.textAlign = "center";
      g.textBaseline = "top";
      g.fillStyle = "rgba(20, 22, 36, .45)";
      g.fillText(jogo.pontos, LW / 2, topoLivre + 4);
      g.fillStyle = "#eceaf5";
      g.fillText(jogo.pontos, LW / 2, topoLivre);
      // Aviso de que acelerou, logo abaixo dos pontos
      if (aceleradoEm && agora - aceleradoEm < 1400 && !jogo.fim) {
        const k = (agora - aceleradoEm) / 1400;
        g.globalAlpha = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
        g.font = "italic 800 20px 'Barlow Condensed', sans-serif";
        g.fillStyle = "#8ccbf5";
        const vezes = (jogo.vel / cfg().vel).toFixed(1).replace(".", ",");
        g.fillText(`MAIS RÁPIDO! ${vezes}×`, LW / 2, topoLivre + 62 - k * 6);
        g.globalAlpha = 1;
      }
    } else {
      // Tela inicial: convite para tocar
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = "italic 800 38px 'Barlow Condensed', sans-serif";
      g.fillStyle = "rgba(20, 22, 36, .45)";
      const yPronto = Math.max(152, topoLivre + 60);
      g.fillText("PRONTO?", LW / 2, yPronto + 3);
      g.fillStyle = "#fbbb84";
      g.fillText("PRONTO?", LW / 2, yPronto);
      g.font = "500 15px 'Space Grotesk', sans-serif";
      g.fillStyle = "#eceaf5";
      g.globalAlpha = 0.6 + 0.4 * Math.sin(agora / 260);
      g.fillText("toque para voar", LW / 2, 296);
      g.globalAlpha = 1;
    }
    g.restore();

    // Clarão da batida
    if (batidaEm && agora - batidaEm < 220) {
      g.fillStyle = `rgba(255, 255, 255, ${0.7 * (1 - (agora - batidaEm) / 220)})`;
      g.fillRect(0, -ceuExtra, LW, F.A + ceuExtra);
    }
  }

  function nuvem(g, x, y, l) {
    g.beginPath();
    g.arc(x + l * 0.25, y, l * 0.2, 0, Math.PI * 2);
    g.arc(x + l * 0.5, y - l * 0.1, l * 0.26, 0, Math.PI * 2);
    g.arc(x + l * 0.75, y, l * 0.2, 0, Math.PI * 2);
    g.rect(x + l * 0.25, y, l * 0.5, l * 0.2);
    g.fill();
  }

  function morros(g, rol, base, alt, cor, passo) {
    g.fillStyle = cor;
    g.beginPath();
    g.moveTo(-10, F.CHAO);
    const off = rol % passo;
    for (let x = -off - passo; x <= jogo.L + passo; x += passo) {
      g.lineTo(x, base);
      g.quadraticCurveTo(x + passo / 2, base - alt * 2, x + passo, base);
    }
    g.lineTo(jogo.L + 10, F.CHAO);
    g.closePath();
    g.fill();
  }

  function cano(g, x, meio) {
    const vao = cfg().vao;
    const topo = meio - vao / 2;
    const fundo = meio + vao / 2;
    const w = F.CANO_L;
    const corpo = (y0, y1) => {
      const grad = g.createLinearGradient(x, 0, x + w, 0);
      grad.addColorStop(0, "#9be8c3");
      grad.addColorStop(0.35, "#7fdcae");
      grad.addColorStop(1, "#5bbd8f");
      g.fillStyle = grad;
      g.fillRect(x + 3, y0, w - 6, y1 - y0);
    };
    const boca = (y) => {
      const grad = g.createLinearGradient(x - 4, 0, x + w + 4, 0);
      grad.addColorStop(0, "#a8eccb");
      grad.addColorStop(0.35, "#86e0b4");
      grad.addColorStop(1, "#5bbd8f");
      g.fillStyle = grad;
      g.beginPath();
      g.roundRect(x - 3, y, w + 6, 22, 6);
      g.fill();
      g.fillStyle = "rgba(255, 255, 255, .35)";
      g.fillRect(x + 4, y + 4, 5, 14);
    };
    corpo(-ceuExtra - 10, topo - 22);
    boca(topo - 22);
    corpo(fundo + 22, F.CHAO);
    boca(fundo);
    g.fillStyle = "rgba(255, 255, 255, .25)";
    g.fillRect(x + 8, -ceuExtra - 10, 4, topo - 22 + ceuExtra + 10);
    g.fillRect(x + 8, fundo + 22, 4, F.CHAO - fundo - 22);
  }

  function passarinho(g, x, y, vy, agora) {
    const r = F.RAIO + 1;
    const ang = jogo.iniciado ? Math.max(-0.45, Math.min(1.3, vy * 0.085)) : 0;
    // Asa: bate rápido subindo, fica parada caindo
    const batendo = !jogo.fim && (!jogo.iniciado || vy < 3);
    const asa = batendo ? Math.sin(agora / 55) : 0.2;
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    // sombra suave
    g.fillStyle = "rgba(20, 22, 36, .25)";
    g.beginPath(); g.ellipse(1, 3, r, r * 0.9, 0, 0, Math.PI * 2); g.fill();
    // corpo
    g.fillStyle = "#fbbb84";
    g.beginPath(); g.ellipse(0, 0, r + 1, r * 0.92, 0, 0, Math.PI * 2); g.fill();
    // barriga
    g.fillStyle = "#fde0c2";
    g.beginPath(); g.ellipse(2, 5, r * 0.62, r * 0.42, 0, 0, Math.PI * 2); g.fill();
    // asa
    g.fillStyle = "#f59a6a";
    g.beginPath(); g.ellipse(-5, 1 - asa * 4, 7.5, 4.6 + asa * 1.5, -0.3 + asa * 0.35, 0, Math.PI * 2); g.fill();
    // olho
    g.fillStyle = "#fff";
    g.beginPath(); g.arc(6, -5, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#2b2f45";
    g.beginPath(); g.arc(jogo.fim ? 6 : 7.5, -5, 2.3, 0, Math.PI * 2); g.fill();
    if (jogo.fim) {
      // olhinho de "x" depois da batida
      g.strokeStyle = "#2b2f45"; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(3.5, -7.5); g.lineTo(8.5, -2.5); g.moveTo(8.5, -7.5); g.lineTo(3.5, -2.5); g.stroke();
    }
    // bico
    g.fillStyle = "#f0857c";
    g.beginPath(); g.moveTo(10, -1); g.quadraticCurveTo(19, 1, 10, 5); g.closePath(); g.fill();
    g.restore();
  }

  /* ---------- Nível (seletor com setinha) ---------- */

  function montarListaNiveis() {
    const lista = $("#lista-niveis");
    lista.innerHTML = "";
    const todos = lerRecordes();
    for (const [k, n] of Object.entries(F.NIVEIS)) {
      const op = el("button", `opcao-letras${k === nivel ? " atual" : ""}`);
      op.type = "button";
      op.setAttribute("role", "option");
      op.setAttribute("aria-selected", k === nivel ? "true" : "false");
      op.append(el("strong", "", n.nome), el("span", "", `recorde ${todos[k].melhor}`));
      op.addEventListener("click", (e) => {
        e.stopPropagation();
        fecharLista();
        nivel = k;
        guardado.gravar("flappy:nivel", nivel);
        tocar("dica");
        novo();
      });
      lista.appendChild(op);
    }
  }
  function fecharLista() {
    $("#lista-niveis").hidden = true;
    $("#btn-nivel").setAttribute("aria-expanded", "false");
  }
  $("#btn-nivel").addEventListener("click", (e) => {
    e.stopPropagation();
    if (jogo.iniciado && !jogo.fim) return; // não troca no meio do voo
    const lista = $("#lista-niveis");
    lista.hidden = !lista.hidden;
    $("#btn-nivel").setAttribute("aria-expanded", String(!lista.hidden));
  });
  document.addEventListener("click", (e) => { if (!$("#seletor-nivel").contains(e.target)) fecharLista(); });

  /* ---------- Controles ---------- */

  // Tocar em qualquer lugar da tela voa (menos nos botões, no seletor e no painel de fim)
  document.addEventListener("pointerdown", (e) => {
    if (e.button > 0 || document.querySelector("dialog[open]")) return;
    if (e.target.closest("button, a, dialog, .seletor-nivel, .painel-fim")) return;
    e.preventDefault();
    voar();
  });

  /* ---------- Tela cheia de verdade (esconde a barra do navegador, onde der) ---------- */

  const raizDoc = document.documentElement;
  const pedirTelaCheia = raizDoc.requestFullscreen || raizDoc.webkitRequestFullscreen;
  const sairTelaCheia = document.exitFullscreen || document.webkitExitFullscreen;
  const emTelaCheia = () => document.fullscreenElement || document.webkitFullscreenElement;
  const botaoTela = $("#btn-tela-cheia");
  if (!pedirTelaCheia || !(document.fullscreenEnabled || document.webkitFullscreenEnabled)) botaoTela.hidden = true;
  const ICONE_ABRIR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  const ICONE_FECHAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
  const atualizarBotaoTela = () => {
    botaoTela.innerHTML = emTelaCheia() ? ICONE_FECHAR : ICONE_ABRIR;
    botaoTela.setAttribute("aria-label", emTelaCheia() ? "Sair da tela cheia" : "Tela cheia");
  };
  botaoTela.addEventListener("click", () => {
    try {
      if (emTelaCheia()) sairTelaCheia.call(document);
      else pedirTelaCheia.call(raizDoc);
    } catch { /* o navegador não deixou */ }
  });
  document.addEventListener("fullscreenchange", atualizarBotaoTela);
  document.addEventListener("webkitfullscreenchange", atualizarBotaoTela);
  atualizarBotaoTela();
  document.addEventListener("keydown", (e) => {
    if (document.querySelector("dialog[open]") || e.repeat) return;
    if ([" ", "ArrowUp", "w", "W"].includes(e.key)) {
      e.preventDefault();
      if (!$("#painel-fim").hidden) { if (podeReiniciar) novo(); return; }
      voar();
    } else if (e.key === "Enter" && !$("#painel-fim").hidden && podeReiniciar) {
      e.preventDefault();
      novo();
    }
  });

  /* ---------- Eventos ---------- */

  $("#btn-de-novo").addEventListener("click", () => { if (podeReiniciar) novo(); });
  $("#btn-compartilhar").addEventListener("click", () => {
    const m = F.medalha(jogo.pontos);
    C.compartilhar(`FLAPPY · ${cfg().nome}\n${jogo.pontos} ${jogo.pontos === 1 ? "cano vencido" : "canos vencidos"}${m ? ` · medalha de ${m}` : ""}\n\n${location.origin}${location.pathname}`);
  });
  $("#btn-ajuda").addEventListener("click", () => C.abrir("#dlg-ajuda"));
  $("#btn-comecar").addEventListener("click", () => $("#dlg-ajuda").close());
  $("#dlg-ajuda").addEventListener("close", () => guardado.gravar("flappy:viuAjuda", true));
  $("#btn-estatisticas").addEventListener("click", () => {
    const todos = lerRecordes();
    const raiz = $("#est-niveis");
    raiz.innerHTML = "";
    for (const [k, n] of Object.entries(F.NIVEIS)) {
      const r = todos[k];
      const m = F.medalha(r.melhor);
      const linha = el("div");
      linha.append(
        el("strong", "", n.nome),
        el("span", "", r.jogos ? `${r.jogos} ${r.jogos === 1 ? "voo" : "voos"}${m ? ` · ${m}` : ""}` : "ainda não jogou"),
        el("em", "", String(r.melhor))
      );
      raiz.appendChild(linha);
    }
    C.abrir("#dlg-estatisticas");
  });
  new ResizeObserver(dimensionar).observe($("#area"));

  C.prepararJanelas();
  C.ligarBotaoSom($("#btn-som"));
  novo();
  dimensionar();
  requestAnimationFrame((t) => { ultimo = t; quadro(t); });
  if (!guardado.ler("flappy:viuAjuda", false)) C.abrir("#dlg-ajuda");
  C.registrarOffline("../sw.js");
})();

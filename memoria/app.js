// Tela do Jogo da Memória: distribui as cartas, vira em 3D, marca os pares,
// esconde o par errado (na hora, se tocar em outra carta) e guarda os recordes por nível.
(() => {
  "use strict";

  const C = window.Comum;
  const M = window.LogicaMemoria;
  const D = window.DesenhosMemoria;
  const { $, el, guardado, tocar } = C;

  const ESPERA_ERRO = 900; // ms que o par errado fica à mostra
  const PROPORCAO = 1.25; // altura / largura da carta
  const TITULOS = ["Memória de elefante!", "Achou tudo!", "Mandou bem!", "Que memória!"];

  let nivel = guardado.ler("memoria:nivel", "facil");
  if (!M.NIVEIS[nivel]) nivel = "facil";
  let jogo;
  let botoes = [];
  let layout = [4, 3];
  let inicio = null;
  let fim = null;
  let timer = null;
  let esconderDepois = null;

  const mesa = $("#mesa");
  const cfg = () => M.NIVEIS[nivel];
  const formatar = (ms) => {
    const s = Math.floor(ms / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${C.dois(s % 60)}`;
  };

  /* ---------- Mesa ---------- */

  // Em pé (celular), a mesa gira: 4×3 vira 3×4
  function dimensoes() {
    const area = $("#area");
    const { cols, linhas } = cfg();
    return area.clientWidth >= area.clientHeight ? [cols, linhas] : [linhas, cols];
  }

  function dimensionar() {
    const area = $("#area");
    const [cols, linhas] = layout;
    const largura = area.clientWidth - 24;
    const altura = area.clientHeight - 28;
    const vao = Math.max(6, Math.min(12, Math.floor(Math.min(largura, altura) / 42)));
    const l = Math.floor(Math.min((largura - vao * (cols - 1)) / cols, (altura - vao * (linhas - 1)) / linhas / PROPORCAO, 124));
    mesa.style.setProperty("--cols", cols);
    mesa.style.setProperty("--vao-carta", `${vao}px`);
    document.documentElement.style.setProperty("--carta-l", `${l}px`);
    document.documentElement.style.setProperty("--carta-a", `${Math.floor(l * PROPORCAO)}px`);
  }

  function novo() {
    clearInterval(timer);
    clearTimeout(esconderDepois);
    jogo = M.criar({ pares: cfg().pares });
    inicio = fim = null;
    layout = dimensoes();
    mesa.innerHTML = "";
    mesa.classList.remove("venceu");
    botoes = jogo.cartas.map((c, i) => {
      const b = el("button", "carta chegando");
      b.type = "button";
      b.style.setProperty("--i", i);
      b.style.setProperty("--cor", D.COR[c.simbolo]);
      b.setAttribute("aria-label", "carta virada para baixo");
      b.innerHTML = `<span class="giro"><span class="face verso"></span><span class="face frente">${D.svg(c.simbolo)}</span></span>`;
      b.addEventListener("animationend", (e) => { if (e.animationName === "distribuir") b.classList.remove("chegando"); });
      b.addEventListener("click", () => tocarCarta(i));
      mesa.appendChild(b);
      return b;
    });
    $("#nivel-nome").textContent = cfg().nome;
    $("#rodape").textContent = "encontre os pares com o menor número de jogadas";
    montarListaNiveis();
    dimensionar();
    atualizarPlacar();
    tocar("enviar");
  }

  function atualizarCarta(i) {
    const c = jogo.cartas[i];
    const b = botoes[i];
    b.classList.toggle("aberta", c.aberta && !c.achada);
    b.classList.toggle("achada", c.achada);
    if (!c.aberta) b.classList.remove("errou");
    b.setAttribute("aria-label", c.aberta || c.achada ? D.NOMES[c.simbolo] : "carta virada para baixo");
  }

  function atualizarPlacar() {
    $("#pares").textContent = `${jogo.achados}/${jogo.pares}`;
    $("#jogadas").textContent = jogo.jogadas;
    atualizarTempo();
  }
  function atualizarTempo() {
    $("#tempo").textContent = inicio ? formatar((fim || Date.now()) - inicio) : "0s";
  }

  function esconderErradas() {
    clearTimeout(esconderDepois);
    const escondidas = M.esconder(jogo);
    escondidas.forEach(atualizarCarta);
    if (escondidas.length) tocar("apagar", 1);
  }

  function tocarCarta(i) {
    if (M.venceu(jogo)) return;
    // Par errado ainda à mostra: a carta nova já esconde as duas
    const antes = jogo.viradas.length === 2 ? [...jogo.viradas] : [];
    const r = M.virar(jogo, i);
    if (r === "ignorado") return;
    clearTimeout(esconderDepois);
    antes.forEach(atualizarCarta);
    if (!inicio) {
      inicio = Date.now();
      timer = setInterval(atualizarTempo, 250);
    }
    atualizarCarta(i);

    if (r === "primeira") {
      tocar("tecla", 3);
    } else if (r === "par") {
      const par = botoes.map((_, k) => k).filter((k) => jogo.cartas[k].simbolo === jogo.cartas[i].simbolo);
      par.forEach((k) => {
        atualizarCarta(k);
        const b = botoes[k];
        setTimeout(() => b.classList.add("descansada"), 1200);
      });
      setTimeout(() => tocar("moeda"), 180);
      try { navigator.vibrate && navigator.vibrate(15); } catch { /* sem vibração */ }
      $("#rodape").textContent = jogo.sequencia >= 2 ? `${jogo.sequencia} pares seguidos!` : `par de ${D.NOMES[jogo.cartas[i].simbolo]}!`;
      if (M.venceu(jogo)) vencer();
    } else {
      tocar("tecla", 0);
      jogo.viradas.forEach((k) => botoes[k].classList.add("errou"));
      $("#rodape").textContent = "não foi dessa vez";
      esconderDepois = setTimeout(esconderErradas, ESPERA_ERRO);
    }
    atualizarPlacar();
  }

  function vencer() {
    fim = Date.now();
    clearInterval(timer);
    atualizarTempo();
    const recorde = registrar();
    // Onda pelas cartas, na diagonal
    const [cols] = layout;
    botoes.forEach((b, k) => b.style.setProperty("--ordem", (k % cols) + Math.floor(k / cols)));
    const este = jogo;
    setTimeout(() => {
      if (jogo !== este) return;
      tocar("vitoria");
      mesa.classList.add("venceu");
    }, 650);
    setTimeout(() => { if (jogo === este) abrirFim(recorde); }, 1900);
  }

  /* ---------- Recordes ---------- */

  function lerRecordes() {
    const base = {};
    for (const k of Object.keys(M.NIVEIS)) base[k] = { vitorias: 0, tempo: null, jogadas: null };
    const salvo = guardado.ler("memoria:recordes", {});
    for (const k of Object.keys(base)) Object.assign(base[k], salvo[k] || {});
    return base;
  }

  // Recorde de tempo e de jogadas contam separados
  function registrar() {
    const todos = lerRecordes();
    const r = todos[nivel];
    const ms = fim - inicio;
    r.vitorias++;
    const recordeTempo = r.tempo == null || ms < r.tempo;
    const recordeJogadas = r.jogadas == null || jogo.jogadas < r.jogadas;
    if (recordeTempo) r.tempo = ms;
    if (recordeJogadas) r.jogadas = jogo.jogadas;
    guardado.gravar("memoria:recordes", todos);
    return { tempo: recordeTempo && r.vitorias > 1, jogadas: recordeJogadas && r.vitorias > 1 };
  }

  function abrirFim(recorde) {
    const r = lerRecordes()[nivel];
    const perfeito = jogo.jogadas === jogo.pares;
    $("#fim-rotulo").textContent = `memória · ${cfg().nome.toLowerCase()}`;
    $("#fim-titulo").textContent = perfeito ? "Perfeito!" : recorde.tempo || recorde.jogadas ? "Novo recorde!" : TITULOS[Math.floor(Math.random() * TITULOS.length)];
    $("#fim-tempo").textContent = formatar(fim - inicio);
    $("#fim-jogadas").textContent = jogo.jogadas;
    $("#fim-tempo-rotulo").textContent = recorde.tempo ? "tempo · recorde" : "tempo";
    $("#fim-jogadas-rotulo").textContent = recorde.jogadas ? "jogadas · recorde" : "jogadas";
    const erros = jogo.erros === 0 ? "nenhum erro" : `${jogo.erros} ${jogo.erros === 1 ? "erro" : "erros"}`;
    $("#fim-detalhes").textContent = `${erros} · melhor sequência: ${jogo.melhorSequencia} ${jogo.melhorSequencia === 1 ? "par" : "pares"}\nrecordes: ${formatar(r.tempo)} · ${r.jogadas} jogadas`;
    C.abrir("#dlg-fim");
  }

  function abrirRecordes() {
    const todos = lerRecordes();
    const raiz = $("#est-niveis");
    raiz.innerHTML = "";
    for (const [k, n] of Object.entries(M.NIVEIS)) {
      const r = todos[k];
      const linha = el("div");
      linha.append(
        el("strong", "", n.nome),
        el("span", "", r.vitorias ? `${r.jogadas} jogadas · ${r.vitorias} ${r.vitorias === 1 ? "vez" : "vezes"}` : "ainda não jogou"),
        el("em", "", r.tempo != null ? formatar(r.tempo) : "–")
      );
      raiz.appendChild(linha);
    }
    C.abrir("#dlg-estatisticas");
  }

  /* ---------- Seletor de nível (com setinha) ---------- */

  function montarListaNiveis() {
    const lista = $("#lista-niveis");
    lista.innerHTML = "";
    for (const [k, n] of Object.entries(M.NIVEIS)) {
      const op = el("button", `opcao-letras${k === nivel ? " atual" : ""}`);
      op.type = "button";
      op.setAttribute("role", "option");
      op.setAttribute("aria-selected", k === nivel ? "true" : "false");
      op.append(el("strong", "", n.nome), el("span", "", `${n.pares} pares`));
      // Escolher o mesmo nível embaralha de novo
      op.addEventListener("click", () => {
        fecharLista();
        nivel = k;
        guardado.gravar("memoria:nivel", nivel);
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
    const lista = $("#lista-niveis");
    lista.hidden = !lista.hidden;
    $("#btn-nivel").setAttribute("aria-expanded", String(!lista.hidden));
  });
  document.addEventListener("click", (e) => { if (!$("#seletor-nivel").contains(e.target)) fecharLista(); });

  /* ---------- Eventos ---------- */

  $("#btn-de-novo").addEventListener("click", () => { $("#dlg-fim").close(); novo(); });
  $("#btn-ajuda").addEventListener("click", () => C.abrir("#dlg-ajuda"));
  $("#btn-comecar").addEventListener("click", () => $("#dlg-ajuda").close());
  $("#dlg-ajuda").addEventListener("close", () => guardado.gravar("memoria:viuAjuda", true));
  $("#btn-estatisticas").addEventListener("click", abrirRecordes);
  $("#btn-compartilhar").addEventListener("click", () => {
    C.compartilhar(`MEMÓRIA · ${cfg().nome}\n⏱ ${formatar(fim - inicio)} · ${jogo.jogadas} jogadas para ${jogo.pares} pares\n\n${location.origin}${location.pathname}`);
  });
  // Se a tela virar antes da primeira carta, a mesa gira junto
  new ResizeObserver(() => {
    if (!jogo) return;
    const [cols] = dimensoes();
    if (!inicio && cols !== layout[0]) novo();
    else dimensionar();
  }).observe($("#area"));

  C.prepararJanelas();
  C.ligarBotaoSom($("#btn-som"));
  novo();
  if (!guardado.ler("memoria:viuAjuda", false)) C.abrir("#dlg-ajuda");
  C.registrarOffline("../sw.js");
})();

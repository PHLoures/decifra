// Tela do Conexões: grade de palavras, seleção, faixas dos grupos e estatísticas.
(() => {
  "use strict";

  const C = window.Comum;
  const L = window.LogicaConexoes;
  const { $, el, guardado, tocar } = C;

  const dia = window.Logica.diaDoJogo();
  const desafio = L.desafioDoDia(window.DESAFIOS, dia);
  const rodada = `#${String(dia).padStart(3, "0")}`;

  let estado = guardado.ler("conexoes:jogo", null);
  if (!estado || estado.dia !== dia) estado = { dia, tentativas: [] };
  let selecao = [];

  // Ordem inicial sorteada pelo dia (a mesma para todo mundo); "Embaralhar" sorteia de novo
  function embaralhar(lista, aleatorio = Math.random) {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(aleatorio() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  let ordem = embaralhar(desafio.flatMap(([, palavras]) => palavras), C.sorteador(dia * 7919 + 13));

  const situacao = () => L.situacao(desafio, estado.tentativas);
  const salvar = () => guardado.gravar("conexoes:jogo", estado);

  function faixa(g, revelada) {
    const [nome, palavras] = desafio[g];
    const f = el("div", `faixa nivel-${g}${revelada ? " revelada" : ""}`);
    f.append(el("strong", "", nome), el("span", "", palavras.join(", ")));
    return f;
  }

  function desenhar() {
    const sit = situacao();
    $("#chip").textContent = `rodada ${rodada}`;

    // Faixas: grupos achados na ordem em que saíram; no fim, os que faltaram aparecem revelados
    const grupos = $("#grupos");
    grupos.innerHTML = "";
    sit.resolvidos.forEach((g) => grupos.appendChild(faixa(g, false)));
    if (sit.fim && !sit.venceu) {
      desafio.forEach((_, g) => { if (!sit.resolvidos.includes(g)) grupos.appendChild(faixa(g, true)); });
    }

    // Grade com as palavras que ainda não foram agrupadas
    const grade = $("#grade");
    grade.innerHTML = "";
    grade.classList.toggle("fim", sit.fim);
    if (!sit.fim) {
      const usadas = new Set(sit.resolvidos.flatMap((g) => desafio[g][1]));
      for (const p of ordem) {
        if (usadas.has(p)) continue;
        const tamanho = p.length > 9 ? " longa" : p.length > 7 ? " media" : "";
        const b = el("button", `palavra${tamanho}${selecao.includes(p) ? " selecionada" : ""}`, p);
        b.type = "button";
        b.setAttribute("aria-pressed", selecao.includes(p) ? "true" : "false");
        b.addEventListener("click", () => alternar(p));
        grade.appendChild(b);
      }
    }

    const bolinhas = $("#bolinhas");
    bolinhas.innerHTML = "";
    for (let i = 0; i < L.MAX_ERROS; i++) bolinhas.appendChild(el("i", i < sit.restantes ? "" : "gasta"));
    bolinhas.setAttribute("aria-label", `${sit.restantes} de ${L.MAX_ERROS} erros restantes`);

    $("#btn-enviar").disabled = sit.fim || selecao.length !== 4;
    $("#btn-limpar").disabled = sit.fim || selecao.length === 0;
    $("#btn-embaralhar").disabled = sit.fim;
  }

  function alternar(p) {
    if (situacao().fim) return;
    if (selecao.includes(p)) {
      selecao = selecao.filter((x) => x !== p);
      tocar("apagar", selecao.length);
    } else {
      if (selecao.length >= 4) return;
      selecao.push(p);
      tocar("tecla", selecao.length - 1);
    }
    desenhar();
  }

  function selecionadas() {
    return [...document.querySelectorAll(".palavra.selecionada")];
  }

  function enviar() {
    if (selecao.length !== 4 || situacao().fim) return;
    if (estado.tentativas.some((t) => L.mesmaSelecao(t, selecao))) {
      C.avisar("você já tentou essa");
      return;
    }
    tocar("enviar");
    const r = L.conferir(desafio, selecao);
    estado.tentativas.push([...selecao]);
    salvar();
    if (r.acerto !== null) {
      // As 4 palavras pulam em sequência e viram a faixa do grupo
      const botoes = selecionadas();
      botoes.forEach((b, i) => { b.style.animationDelay = `${i * 70}ms`; b.classList.add("pula"); });
      setTimeout(() => {
        selecao = [];
        tocar("resolvido");
        desenhar();
        $("#leitor").textContent = `Grupo encontrado: ${desafio[r.acerto][0]}.`;
        terminouTalvez();
      }, C.semMovimento() ? 0 : 450);
    } else {
      tocar("erro");
      selecionadas().forEach((b) => {
        b.classList.remove("treme");
        void b.offsetWidth;
        b.classList.add("treme");
      });
      C.avisar(r.quase ? "faltou uma!" : "não é um grupo", 1600);
      desenhar();
      terminouTalvez();
    }
  }

  /* ---------- Fim e estatísticas ---------- */

  function lerEstatisticas() {
    return Object.assign({ jogos: 0, vitorias: 0, perfeitos: 0, seq: 0, melhorSeq: 0, ultimaVitoria: 0 }, guardado.ler("conexoes:estatisticas", {}));
  }

  function terminouTalvez() {
    const sit = situacao();
    if (!sit.fim || estado.contabilizado) return;
    estado.contabilizado = true;
    salvar();
    const e = lerEstatisticas();
    e.jogos++;
    if (sit.venceu) {
      e.vitorias++;
      if (sit.erros === 0) e.perfeitos++;
      e.seq = e.ultimaVitoria === dia - 1 ? e.seq + 1 : 1;
      e.melhorSeq = Math.max(e.melhorSeq, e.seq);
      e.ultimaVitoria = dia;
    } else {
      e.seq = 0;
    }
    guardado.gravar("conexoes:estatisticas", e);
    setTimeout(() => tocar(sit.venceu ? "vitoria" : "derrota"), 250);
    setTimeout(abrirFim, sit.venceu ? 1100 : 1400);
  }

  function preencherNumeros(alvo) {
    const e = lerEstatisticas();
    const seq = e.ultimaVitoria >= dia - 1 ? e.seq : 0;
    const raiz = $(alvo);
    raiz.innerHTML = "";
    [
      [e.jogos, "jogos"],
      [`${e.jogos ? Math.round((100 * e.vitorias) / e.jogos) : 0}%`, "de vitórias"],
      [seq, "sequência"],
      [e.perfeitos, "sem erros"],
    ].forEach(([n, t]) => {
      const d = el("div");
      d.append(el("strong", "", n), el("span", "", t));
      raiz.appendChild(d);
    });
  }

  let timerContagem;
  function abrirFim() {
    const sit = situacao();
    $("#fim-rotulo").textContent = `conexões · rodada ${rodada}`;
    $("#fim-titulo").textContent = !sit.venceu ? "Não foi dessa vez" : sit.erros === 0 ? "Perfeito!" : sit.erros === 3 ? "No sufoco!" : "Conectou tudo!";
    $("#dlg-fim").classList.toggle("derrota", !sit.venceu);
    const mosaico = $("#fim-mosaico");
    mosaico.innerHTML = "";
    for (const t of estado.tentativas) {
      const linha = el("div");
      t.forEach((p) => linha.appendChild(el("i", `nivel-${L.grupoDe(desafio, p)}`)));
      mosaico.appendChild(linha);
    }
    $("#fim-detalhes").textContent = sit.venceu
      ? `${sit.erros === 0 ? "nenhum erro" : `${sit.erros} ${sit.erros === 1 ? "erro" : "erros"}`} · ${estado.tentativas.length} tentativas`
      : `achou ${sit.resolvidos.length} de 4 grupos`;
    preencherNumeros("#fim-numeros");
    const contar = () => {
      const s = Math.floor(window.Logica.msAteProximoDia() / 1000);
      $("#fim-contagem").textContent = `${C.dois(Math.floor(s / 3600))}:${C.dois(Math.floor(s / 60) % 60)}:${C.dois(s % 60)}`;
      if (window.Logica.diaDoJogo() !== dia) location.reload();
    };
    contar();
    clearInterval(timerContagem);
    timerContagem = setInterval(contar, 1000);
    C.abrir("#dlg-fim");
  }

  function textoCompartilhar() {
    const sit = situacao();
    const linhas = L.linhasEmoji(desafio, estado.tentativas).join("\n");
    const placar = sit.venceu ? `${sit.erros} ${sit.erros === 1 ? "erro" : "erros"}` : "✕";
    return `CONEXÕES ${rodada} · ${placar}\n\n${linhas}\n\n${location.origin}${location.pathname}`;
  }

  /* ---------- Eventos ---------- */

  $("#btn-enviar").addEventListener("click", enviar);
  $("#btn-limpar").addEventListener("click", () => { selecao = []; tocar("apagar", 0); desenhar(); });
  $("#btn-embaralhar").addEventListener("click", () => { ordem = embaralhar(ordem); tocar("dica"); desenhar(); });
  $("#btn-ajuda").addEventListener("click", () => C.abrir("#dlg-ajuda"));
  $("#btn-comecar").addEventListener("click", () => $("#dlg-ajuda").close());
  $("#btn-estatisticas").addEventListener("click", () => {
    if (situacao().fim) return abrirFim();
    preencherNumeros("#est-numeros");
    C.abrir("#dlg-estatisticas");
  });
  $("#btn-compartilhar").addEventListener("click", () => C.compartilhar(textoCompartilhar()));
  $("#dlg-fim").addEventListener("close", () => clearInterval(timerContagem));
  $("#dlg-ajuda").addEventListener("close", () => guardado.gravar("conexoes:viuAjuda", true));
  document.addEventListener("keydown", (e) => {
    if (document.querySelector("dialog[open]")) return;
    if (e.key === "Enter") { e.preventDefault(); enviar(); }
    if (e.key === "Escape") { selecao = []; desenhar(); }
  });
  // Quem deixa a aba aberta de um dia para o outro recebe o desafio novo
  document.addEventListener("visibilitychange", () => { if (!document.hidden && window.Logica.diaDoJogo() !== dia) location.reload(); });

  C.prepararJanelas();
  C.ligarBotaoSom($("#btn-som"));
  desenhar();
  if (situacao().fim) setTimeout(abrirFim, 400);
  else if (!guardado.ler("conexoes:viuAjuda", false)) C.abrir("#dlg-ajuda");
  C.registrarOffline("../sw.js");
})();

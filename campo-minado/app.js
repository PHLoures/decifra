// Tela do Campo Minado: campo, toques (abrir/bandeira), cronômetro e recordes.
(() => {
  "use strict";

  const C = window.Comum;
  const M = window.LogicaMinado;
  const { $, el, guardado, tocar } = C;

  const SVG_BANDEIRA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="bandeira" d="M7 20V4l10 4-10 4"/><path d="M7 20V4" stroke="#eceaf5" stroke-width="2" stroke-linecap="round"/></svg>';
  const SVG_MINA = '<svg viewBox="0 0 24 24" aria-hidden="true"><g class="mina"><circle cx="12" cy="12" r="5.5"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"/></g></svg>';

  let nivel = guardado.ler("minado:nivel", "facil");
  if (!M.NIVEIS[nivel]) nivel = "facil";
  let campo;
  let casas = [];
  let inicio = null;
  let fim = null;
  let timer = null;
  let acabou = false;
  let modoBandeira = false;

  const cfg = () => M.NIVEIS[nivel];
  const formatar = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${C.dois(s % 60)}`;
  };

  /* ---------- Jogo ---------- */

  function novo() {
    acabou = false;
    inicio = null;
    fim = null;
    clearInterval(timer);
    campo = M.criar(cfg().cols, cfg().linhas, cfg().minas);
    $("#chip").textContent = cfg().nome.toLowerCase();
    document.querySelectorAll("#niveis .modo").forEach((b) => {
      const atual = b.dataset.nivel === nivel;
      b.classList.toggle("atual", atual);
      if (atual) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    });
    montar();
    atualizarPlacar();
  }

  function montar() {
    const raiz = $("#campo");
    raiz.innerHTML = "";
    raiz.classList.remove("vitoria");
    raiz.style.setProperty("--cols", campo.cols);
    casas = campo.celulas.map((_, i) => {
      const b = el("button", "casa");
      b.type = "button";
      b.setAttribute("role", "gridcell");
      ligarToques(b, i);
      raiz.appendChild(b);
      return b;
    });
    casas.forEach((_, i) => desenharCasa(i));
    dimensionar();
  }

  function dimensionar() {
    if (!campo) return;
    const area = $("#area");
    const largura = area.clientWidth - 24 - 16;
    const altura = area.clientHeight - 24 - 16;
    let vao = 3;
    let tam = Math.floor(Math.min((largura - (campo.cols - 1) * vao) / campo.cols, (altura - (campo.linhas - 1) * vao) / campo.linhas, 46));
    if (tam < 24) {
      vao = 2;
      tam = Math.floor(Math.min((largura - (campo.cols - 1) * vao) / campo.cols, (altura - (campo.linhas - 1) * vao) / campo.linhas));
    }
    const raiz = $("#campo");
    raiz.style.setProperty("--casa", `${Math.max(14, tam)}px`);
    raiz.style.setProperty("--vao-casa", `${vao}px`);
  }

  function desenharCasa(i, extra = "") {
    const cel = campo.celulas[i];
    const b = casas[i];
    b.innerHTML = "";
    b.className = "casa";
    if (cel.aberta) {
      b.classList.add("aberta");
      if (cel.mina) {
        b.classList.add(i === campo.explodiu ? "explodiu" : "mina-aberta");
        b.innerHTML = SVG_MINA;
      } else if (cel.numero) {
        b.classList.add(`n${cel.numero}`);
        b.textContent = cel.numero;
      }
    } else if (cel.bandeira) {
      b.innerHTML = SVG_BANDEIRA;
    }
    if (extra) b.classList.add(extra);
    const nome = cel.aberta ? (cel.mina ? "mina" : cel.numero ? `${cel.numero}` : "vazia") : cel.bandeira ? "bandeira" : "fechada";
    b.setAttribute("aria-label", `linha ${Math.floor(i / campo.cols) + 1}, coluna ${(i % campo.cols) + 1}: ${nome}`);
  }

  function atualizarPlacar() {
    $("#minas").textContent = Math.max(0, campo.minas - M.bandeiras(campo));
    atualizarTempo();
  }
  function atualizarTempo() {
    const ms = inicio ? (fim || Date.now()) - inicio : 0;
    $("#tempo").textContent = formatar(ms);
  }

  function tocarCasa(i, comoBandeira) {
    if (acabou) return;
    const cel = campo.celulas[i];
    if (comoBandeira && !cel.aberta) {
      if (M.alternarBandeira(campo, i)) {
        tocar(cel.bandeira ? "dica" : "apagar", 2);
        if (navigator.vibrate) navigator.vibrate(12);
        desenharCasa(i);
        atualizarPlacar();
      }
      return;
    }
    if (cel.bandeira) return;
    const abertas = cel.aberta ? M.acorde(campo, i) : M.abrir(campo, i);
    if (!abertas.length) return;
    if (!inicio) {
      inicio = Date.now();
      timer = setInterval(atualizarTempo, 250);
    }
    abertas.forEach((k) => desenharCasa(k));
    if (campo.explodiu !== null) return perder();
    if (M.venceu(campo)) return vencer();
    // Mais casas abertas de uma vez, nota mais aguda
    tocar("tecla", Math.min(9, Math.floor(Math.log2(abertas.length + 1) * 2)));
  }

  function encerrar() {
    acabou = true;
    fim = Date.now();
    clearInterval(timer);
    atualizarTempo();
  }

  function perder() {
    encerrar();
    tocar("erro");
    // As outras minas aparecem em onda a partir da que explodiu
    const ex = campo.explodiu;
    const dist = (i) => Math.hypot((i % campo.cols) - (ex % campo.cols), Math.floor(i / campo.cols) - Math.floor(ex / campo.cols));
    const minas = campo.celulas.map((c, i) => i).filter((i) => campo.celulas[i].mina && i !== ex).sort((a, b) => dist(a) - dist(b));
    const passo = C.semMovimento() ? 0 : Math.min(45, 900 / Math.max(1, minas.length));
    minas.forEach((i, n) => setTimeout(() => {
      if (!campo.celulas[i].bandeira) {
        campo.celulas[i].aberta = true;
        desenharCasa(i);
      }
    }, n * passo));
    campo.celulas.forEach((c, i) => { if (c.bandeira && !c.mina) desenharCasa(i, "bandeira-errada"); });
    registrar(false);
    setTimeout(() => tocar("derrota"), 300);
    setTimeout(() => abrirFim(false), minas.length * passo + 900);
  }

  function vencer() {
    encerrar();
    campo.celulas.forEach((c, i) => {
      if (c.mina && !c.bandeira) {
        c.bandeira = true;
        desenharCasa(i);
      }
    });
    atualizarPlacar();
    $("#campo").classList.add("vitoria");
    tocar("vitoria");
    const recorde = registrar(true);
    setTimeout(() => abrirFim(true, recorde), 1100);
  }

  /* ---------- Recordes ---------- */

  function lerEstatisticas() {
    const base = {};
    for (const k of Object.keys(M.NIVEIS)) base[k] = { jogos: 0, vitorias: 0, melhor: null, seq: 0 };
    const salvo = guardado.ler("minado:estatisticas", {});
    for (const k of Object.keys(base)) Object.assign(base[k], salvo[k] || {});
    return base;
  }

  function registrar(venceu) {
    const e = lerEstatisticas();
    const n = e[nivel];
    n.jogos++;
    let recorde = false;
    if (venceu) {
      n.vitorias++;
      n.seq++;
      const ms = fim - inicio;
      if (n.melhor == null || ms < n.melhor) {
        recorde = n.melhor != null || n.vitorias === 1;
        n.melhor = ms;
      }
    } else {
      n.seq = 0;
    }
    guardado.gravar("minado:estatisticas", e);
    return recorde;
  }

  function abrirFim(venceu, recorde) {
    const e = lerEstatisticas()[nivel];
    $("#fim-rotulo").textContent = `campo minado · ${cfg().nome.toLowerCase()}`;
    $("#fim-titulo").textContent = venceu ? (recorde ? "Novo recorde!" : "Campo limpo!") : "Boom!";
    $("#dlg-fim").classList.toggle("derrota", !venceu);
    $("#fim-tempo").textContent = formatar(fim - inicio);
    const abertas = campo.celulas.filter((c) => c.aberta && !c.mina).length;
    const livres = campo.celulas.length - campo.minas;
    $("#fim-detalhes").textContent = venceu ? `${campo.minas} minas desviadas` : `abriu ${Math.round((100 * abertas) / livres)}% do campo`;
    const numeros = $("#fim-numeros");
    numeros.innerHTML = "";
    [
      [e.jogos, "jogos"],
      [`${e.jogos ? Math.round((100 * e.vitorias) / e.jogos) : 0}%`, "de vitórias"],
      [e.seq, "seguidas"],
      [e.melhor != null ? formatar(e.melhor) : "–", "melhor tempo"],
    ].forEach(([n, t]) => {
      const d = el("div");
      d.append(el("strong", "", n), el("span", "", t));
      numeros.appendChild(d);
    });
    $("#btn-compartilhar").hidden = !venceu;
    C.abrir("#dlg-fim");
  }

  function abrirRecordes() {
    const e = lerEstatisticas();
    const raiz = $("#est-niveis");
    raiz.innerHTML = "";
    for (const [k, n] of Object.entries(M.NIVEIS)) {
      const r = e[k];
      const linha = el("div");
      linha.append(
        el("strong", "", n.nome),
        el("span", "", r.jogos ? `${r.vitorias} de ${r.jogos} vencidos` : "ainda não jogou"),
        el("em", "", r.melhor != null ? formatar(r.melhor) : "–")
      );
      raiz.appendChild(linha);
    }
    C.abrir("#dlg-estatisticas");
  }

  /* ---------- Toques: tocar abre, segurar põe bandeira ---------- */

  function ligarToques(b, i) {
    let espera = null;
    let segurou = false;
    const cancelar = () => { clearTimeout(espera); espera = null; };
    b.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      segurou = false;
      cancelar();
      espera = setTimeout(() => {
        segurou = true;
        tocarCasa(i, !modoBandeira);
      }, 380);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((t) => b.addEventListener(t, cancelar));
    b.addEventListener("click", () => {
      cancelar();
      if (segurou) { segurou = false; return; }
      tocarCasa(i, modoBandeira);
    });
    b.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      cancelar();
      if (!segurou) tocarCasa(i, true);
      segurou = false;
    });
  }

  /* ---------- Eventos ---------- */

  document.querySelectorAll("#niveis .modo").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.nivel === nivel && !inicio) return;
    nivel = b.dataset.nivel;
    guardado.gravar("minado:nivel", nivel);
    tocar("dica");
    novo();
  }));
  $("#btn-novo").addEventListener("click", () => { tocar("enviar"); novo(); });
  $("#btn-de-novo").addEventListener("click", () => { $("#dlg-fim").close(); novo(); });
  $("#btn-bandeira").addEventListener("click", (e) => {
    modoBandeira = !modoBandeira;
    e.currentTarget.setAttribute("aria-pressed", String(modoBandeira));
    $("#dica-controle").textContent = modoBandeira ? "toque para pôr bandeira · segure para abrir" : "toque para abrir · segure para pôr bandeira";
    tocar("dica");
  });
  $("#btn-ajuda").addEventListener("click", () => C.abrir("#dlg-ajuda"));
  $("#btn-comecar").addEventListener("click", () => $("#dlg-ajuda").close());
  $("#dlg-ajuda").addEventListener("close", () => guardado.gravar("minado:viuAjuda", true));
  $("#btn-estatisticas").addEventListener("click", abrirRecordes);
  $("#btn-compartilhar").addEventListener("click", () => {
    C.compartilhar(`CAMPO MINADO · ${cfg().nome}\n⏱ ${formatar(fim - inicio)} · ${campo.minas} minas desviadas\n\n${location.origin}${location.pathname}`);
  });
  new ResizeObserver(dimensionar).observe($("#area"));

  C.prepararJanelas();
  C.ligarBotaoSom($("#btn-som"));
  novo();
  if (!guardado.ler("minado:viuAjuda", false)) C.abrir("#dlg-ajuda");
  C.registrarOffline("../sw.js");
})();

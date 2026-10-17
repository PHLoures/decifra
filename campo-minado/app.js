// Tela do Campo Minado no estilo do Google: seletor de dificuldade, pá ou bandeira,
// terrinha voando ao cavar, minas estourando uma a uma e recordes por nível.
(() => {
  "use strict";

  const C = window.Comum;
  const M = window.LogicaMinado;
  const { $, el, guardado, tocar } = C;

  const SVG_BANDEIRA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="haste" d="M8 20V4"/><path class="pano" d="M8 4l10 4.5L8 13z"/></svg>';
  const CORES_MINA = ["#f0857c", "#f6c177", "#8ccbf5", "#c4b0f5", "#f5a3c0", "#7fdcae", "#fbbb84"];
  const CORES_TERRA = ["#a6e3c3", "#7fcea3", "#e9d2b4", "#d9bd99"];

  let nivel = guardado.ler("minado:nivel", "facil");
  if (!M.NIVEIS[nivel]) nivel = "facil";
  let campo;
  let casas = [];
  let inicio = null;
  let fim = null;
  let timer = null;
  let acabou = false;
  let ferramenta = "pa"; // pa | bandeira

  const cfg = () => M.NIVEIS[nivel];
  const segundos = (ms) => Math.floor(ms / 1000);
  const formatar = (ms) => {
    const s = segundos(ms);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${C.dois(s % 60)}`;
  };

  /* ---------- Jogo ---------- */

  // Em pé (celular), o campo gira: 10×8 vira 8×10
  function dimensoes() {
    const area = $("#area");
    const { cols, linhas } = cfg();
    return area.clientWidth >= area.clientHeight ? [cols, linhas] : [linhas, cols];
  }

  function novo() {
    acabou = false;
    inicio = null;
    fim = null;
    clearInterval(timer);
    const [cols, linhas] = dimensoes();
    campo = M.criar(cols, linhas, cfg().minas);
    $("#nivel-nome").textContent = cfg().nome;
    montarListaNiveis();
    montar();
    atualizarPlacar();
  }

  function montar() {
    const raiz = $("#campo");
    raiz.innerHTML = "";
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
    const largura = area.clientWidth - 24 - 12;
    const altura = area.clientHeight - 24 - 12;
    const tam = Math.floor(Math.min(largura / campo.cols, altura / campo.linhas, 48));
    $("#campo").style.setProperty("--casa", `${Math.max(12, tam)}px`);
  }

  function desenharCasa(i, extra = "") {
    const cel = campo.celulas[i];
    const b = casas[i];
    const x = i % campo.cols;
    const y = Math.floor(i / campo.cols);
    b.innerHTML = "";
    b.className = `casa${(x + y) % 2 ? " b" : ""}`;
    if (cel.aberta && !cel.mina) {
      b.classList.add("aberta");
      if (cel.numero) {
        b.classList.add(`n${cel.numero}`);
        b.textContent = cel.numero;
      }
    } else if (cel.aberta && cel.mina) {
      b.classList.add("mina");
    } else if (cel.bandeira) {
      b.innerHTML = SVG_BANDEIRA;
    }
    if (extra) b.classList.add(...extra.split(" "));
    const nome = cel.aberta ? (cel.mina ? "mina" : cel.numero ? `${cel.numero}` : "vazia") : cel.bandeira ? "bandeira" : "fechada";
    b.setAttribute("aria-label", `linha ${y + 1}, coluna ${x + 1}: ${nome}`);
  }

  function atualizarPlacar() {
    $("#minas").textContent = campo.minas - M.bandeiras(campo);
    atualizarTempo();
  }
  function atualizarTempo() {
    const ms = inicio ? (fim || Date.now()) - inicio : 0;
    $("#tempo").textContent = String(Math.min(999, segundos(ms))).padStart(3, "0");
  }

  // Pedacinhos de grama e terra voando de onde a casa foi cavada
  function terrinha(indices) {
    if (C.semMovimento()) return;
    const raiz = $("#particulas");
    const tam = parseFloat(getComputedStyle($("#campo")).getPropertyValue("--casa")) || 30;
    for (const i of indices.slice(0, 14)) {
      const cx = 6 + ((i % campo.cols) + 0.5) * tam;
      const cy = 6 + (Math.floor(i / campo.cols) + 0.5) * tam;
      for (let k = 0; k < 3; k++) {
        const p = el("i");
        p.style.left = `${cx}px`;
        p.style.top = `${cy}px`;
        p.style.background = CORES_TERRA[Math.floor(Math.random() * CORES_TERRA.length)];
        raiz.appendChild(p);
        const dx = (Math.random() - 0.5) * tam * 2.2;
        const dy = -Math.random() * tam * 1.8 - tam * 0.4;
        p.animate(
          [
            { transform: "translate(-50%, -50%) rotate(0)", opacity: 1 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${(Math.random() - 0.5) * 360}deg)`, opacity: 1, offset: 0.5 },
            { transform: `translate(calc(-50% + ${dx * 1.3}px), calc(-50% + ${dy + tam * 2}px)) rotate(${(Math.random() - 0.5) * 540}deg)`, opacity: 0 },
          ],
          { duration: 650 + Math.random() * 250, easing: "cubic-bezier(.2, .7, .4, 1)" }
        ).onfinish = () => p.remove();
      }
    }
  }

  function tocarCasa(i, comoBandeira) {
    if (acabou) return;
    const cel = campo.celulas[i];
    if (comoBandeira && !cel.aberta) {
      if (M.alternarBandeira(campo, i)) {
        tocar(cel.bandeira ? "dica" : "apagar", 2);
        try { navigator.vibrate && navigator.vibrate(12); } catch { /* sem vibração */ }
        desenharCasa(i, cel.bandeira ? "plantando" : "");
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
    terrinha(abertas);
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

  // Como no Google: as minas estouram uma a uma, cada uma de uma cor, a partir da primeira
  function perder() {
    encerrar();
    tocar("erro");
    const ex = campo.explodiu;
    const corDe = () => CORES_MINA[Math.floor(Math.random() * CORES_MINA.length)];
    casas[ex].style.setProperty("--cor-mina", corDe());
    const dist = (i) => Math.hypot((i % campo.cols) - (ex % campo.cols), Math.floor(i / campo.cols) - Math.floor(ex / campo.cols));
    const minas = campo.celulas.map((_, i) => i).filter((i) => campo.celulas[i].mina && i !== ex && !campo.celulas[i].bandeira).sort((a, b) => dist(a) - dist(b));
    const passo = C.semMovimento() ? 0 : Math.max(25, Math.min(140, 2200 / Math.max(1, minas.length)));
    minas.forEach((i, n) => setTimeout(() => {
      campo.celulas[i].aberta = true;
      casas[i].style.setProperty("--cor-mina", corDe());
      desenharCasa(i);
      if (n % 2 === 0) tocar("tecla", n % 10);
    }, 250 + n * passo));
    campo.celulas.forEach((c, i) => { if (c.bandeira && !c.mina) desenharCasa(i, "bandeira-errada"); });
    registrar(false);
    setTimeout(() => tocar("derrota"), 250 + minas.length * passo);
    setTimeout(() => abrirFim(false), 250 + minas.length * passo + 900);
  }

  function vencer() {
    encerrar();
    campo.celulas.forEach((c, i) => {
      if (c.mina && !c.bandeira) {
        c.bandeira = true;
        desenharCasa(i, "plantando");
      }
    });
    atualizarPlacar();
    tocar("vitoria");
    const recorde = registrar(true);
    setTimeout(() => abrirFim(true, recorde), 1100);
  }

  /* ---------- Recordes ---------- */

  function lerEstatisticas() {
    const base = {};
    for (const k of Object.keys(M.NIVEIS)) base[k] = { jogos: 0, vitorias: 0, melhor: null };
    // Recordes antigos eram de campos de outro tamanho: começam do zero
    const salvo = guardado.ler("minado:estatisticas2", {});
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
      const ms = fim - inicio;
      if (n.melhor == null || ms < n.melhor) {
        recorde = true;
        n.melhor = ms;
      }
    }
    guardado.gravar("minado:estatisticas2", e);
    return recorde;
  }

  function abrirFim(venceu, recorde) {
    const e = lerEstatisticas()[nivel];
    $("#fim-rotulo").textContent = `campo minado · ${cfg().nome.toLowerCase()}`;
    $("#fim-titulo").textContent = venceu ? (recorde ? "Novo recorde!" : "Campo limpo!") : "Boom!";
    $("#dlg-fim").classList.toggle("derrota", !venceu);
    $("#fim-tempo").textContent = venceu ? formatar(fim - inicio) : "—";
    $("#fim-melhor").textContent = e.melhor != null ? formatar(e.melhor) : "—";
    const abertas = campo.celulas.filter((c) => c.aberta && !c.mina).length;
    const livres = campo.celulas.length - campo.minas;
    $("#fim-detalhes").textContent = venceu
      ? `${campo.minas} minas desviadas · ${e.vitorias} de ${e.jogos} vencidos`
      : `cavou ${Math.round((100 * abertas) / livres)}% do campo`;
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

  /* ---------- Seletor de dificuldade (com setinha) ---------- */

  function montarListaNiveis() {
    const lista = $("#lista-niveis");
    lista.innerHTML = "";
    for (const [k, n] of Object.entries(M.NIVEIS)) {
      const op = el("button", `opcao-letras${k === nivel ? " atual" : ""}`);
      op.type = "button";
      op.setAttribute("role", "option");
      op.setAttribute("aria-selected", k === nivel ? "true" : "false");
      op.append(el("strong", "", n.nome), el("span", "", `${n.minas} minas`));
      op.addEventListener("click", () => {
        fecharLista();
        if (k === nivel) return;
        nivel = k;
        guardado.gravar("minado:nivel", nivel);
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
    const lista = $("#lista-niveis");
    lista.hidden = !lista.hidden;
    $("#btn-nivel").setAttribute("aria-expanded", String(!lista.hidden));
  });
  document.addEventListener("click", (e) => { if (!$("#seletor-nivel").contains(e.target)) fecharLista(); });

  /* ---------- Toques: tocar usa a ferramenta, segurar faz o contrário ---------- */

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
        tocarCasa(i, ferramenta !== "bandeira");
      }, 380);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((t) => b.addEventListener(t, cancelar));
    b.addEventListener("click", () => {
      cancelar();
      if (segurou) { segurou = false; return; }
      tocarCasa(i, ferramenta === "bandeira");
    });
    b.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      cancelar();
      if (!segurou) tocarCasa(i, true);
      segurou = false;
    });
  }

  function escolherFerramenta(f) {
    ferramenta = f;
    $("#btn-pa").setAttribute("aria-pressed", String(f === "pa"));
    $("#btn-bandeira").setAttribute("aria-pressed", String(f === "bandeira"));
    $("#dica-controle").textContent = f === "bandeira"
      ? "tocar põe bandeira · segure para cavar"
      : "segure uma casa (ou clique com o botão direito) para pôr bandeira";
    tocar("dica");
  }

  /* ---------- Eventos ---------- */

  $("#btn-pa").addEventListener("click", () => escolherFerramenta("pa"));
  $("#btn-bandeira").addEventListener("click", () => escolherFerramenta("bandeira"));
  $("#btn-de-novo").addEventListener("click", () => { $("#dlg-fim").close(); novo(); });
  $("#btn-ajuda").addEventListener("click", () => C.abrir("#dlg-ajuda"));
  $("#btn-comecar").addEventListener("click", () => $("#dlg-ajuda").close());
  $("#dlg-ajuda").addEventListener("close", () => guardado.gravar("minado:viuAjuda", true));
  $("#btn-estatisticas").addEventListener("click", abrirRecordes);
  $("#btn-compartilhar").addEventListener("click", () => {
    C.compartilhar(`CAMPO MINADO · ${cfg().nome}\n⏱ ${formatar(fim - inicio)} · ${campo.minas} minas desviadas\n\n${location.origin}${location.pathname}`);
  });
  // Se a tela virar antes do primeiro toque, o campo gira junto
  new ResizeObserver(() => {
    if (!campo) return;
    const [cols] = dimensoes();
    if (!inicio && cols !== campo.cols) novo();
    else dimensionar();
  }).observe($("#area"));

  C.prepararJanelas();
  C.ligarBotaoSom($("#btn-som"));
  novo();
  if (!guardado.ler("minado:viuAjuda", false)) C.abrir("#dlg-ajuda");
  C.registrarOffline("../sw.js");
})();

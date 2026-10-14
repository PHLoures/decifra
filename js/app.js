// Tela do jogo: tabuleiros, teclado, janelas e armazenamento local.
(() => {
  "use strict";

  const L = window.Logica;
  const { TAMANHO, MODOS } = L;
  const NOME = "Decifra";
  const PREFIXO = "decifra";
  const ATRASO_PECA = 230; // ms entre uma peça e outra ao revelar
  const VIRADA = ATRASO_PECA * (TAMANHO - 1) + 450; // tempo total da revelação
  const FILAS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
  // Do acerto mais rápido para o mais suado; a última tentativa é sempre "Ufa!"
  const ELOGIOS = ["Gol de placa!", "Golaço!", "Craque!", "Na mosca!", "Mandou bem!"];
  const EMOJI = { certa: "🟩", lugar: "🟨", errada: "🟦" };
  const EMOJI_CONTRASTE = { certa: "🟧", lugar: "🟦", errada: "⬛" };

  // Dicionário: chave sem acento -> grafia certa
  const RESPOSTAS = window.PALAVRAS.respostas.split(" ").map(L.semAcento);
  const GRAFIA = new Map();
  for (const p of window.PALAVRAS.validas.split(" ")) GRAFIA.set(L.semAcento(p), p.normalize("NFC"));
  for (const p of window.PALAVRAS.respostas.split(" ")) GRAFIA.set(L.semAcento(p), p.normalize("NFC"));
  const grafia = (chave) => {
    const letras = [...(GRAFIA.get(chave) || chave)];
    return letras.length === TAMANHO ? letras : [...chave];
  };

  // localStorage pode faltar (aba anônima, bloqueio): o jogo funciona mesmo assim
  const guardado = {
    ler(k, padrao) {
      try { const v = localStorage.getItem(`${PREFIXO}:${k}`); return v ? JSON.parse(v) : padrao; } catch { return padrao; }
    },
    gravar(k, v) {
      try { localStorage.setItem(`${PREFIXO}:${k}`, JSON.stringify(v)); } catch { /* sem armazenamento */ }
    },
  };

  const $ = (s) => document.querySelector(s);
  const el = (tag, classe, texto) => {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  };
  const semMovimento = matchMedia("(prefers-reduced-motion: reduce)");

  const ajustes = Object.assign({ dificil: false, contraste: false, enterEsquerda: false }, guardado.ler("ajustes", {}));

  // Estado da partida aberta
  let modo, cfg, dia, respostas, jogo;
  let atual = [];
  let cursor = 0;
  let revelando = false;
  let linhaRevelando = -1; // a linha que está acendendo não é redesenhada até acabar
  let partida = 0; // muda a cada troca de modo/dia, para descartar animações pendentes
  let tabuleiros = []; // [{ el, linhas: [[peca x5] x tentativas] }]
  let teclas = new Map();

  /* ---------- Partida ---------- */

  function modoDaUrl() {
    const h = location.hash.slice(1);
    return MODOS[h] ? h : "solo";
  }

  function iniciar() {
    partida++;
    modo = modoDaUrl();
    cfg = MODOS[modo];
    dia = L.diaDoJogo();
    respostas = L.palavrasDoDia(RESPOSTAS, dia, cfg.tabuleiros);
    jogo = guardado.ler(`jogo:${modo}`, null);
    if (!jogo || jogo.dia !== dia) jogo = { dia, palpites: [], contabilizado: false };
    atual = Array(TAMANHO).fill("");
    cursor = 0;
    revelando = false;
    linhaRevelando = -1;

    document.title = modo === "solo" ? NOME : `${NOME} · ${cfg.nome}`;
    $("#chip").textContent = `dia #${String(dia).padStart(3, "0")}`;
    document.querySelectorAll(".modos a").forEach((a) => {
      if (a.dataset.modo === modo) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    limparAviso();
    montarTabuleiros();
    montarTeclado();
    desenhar();
    desenharTeclado(jogo.palpites);

    const sit = situacao();
    if (sit.fim) {
      avisoFinal(sit);
      setTimeout(() => abrir("#dlg-estatisticas"), 700);
    }
  }

  const situacao = () => L.situacao(jogo.palpites, respostas, cfg.tentativas);
  const salvar = () => guardado.gravar(`jogo:${modo}`, jogo);

  /* ---------- Tabuleiros ---------- */

  function montarTabuleiros() {
    const raiz = $("#tabuleiros");
    raiz.innerHTML = "";
    raiz.dataset.n = cfg.tabuleiros;
    tabuleiros = respostas.map((_, b) => {
      const tab = el("div", "tabuleiro");
      tab.setAttribute("aria-label", cfg.tabuleiros > 1 ? `Tabuleiro ${b + 1}` : "Tabuleiro");
      const linhas = [];
      for (let l = 0; l < cfg.tentativas; l++) {
        const linha = el("div", "linha");
        const pecas = [];
        for (let c = 0; c < TAMANHO; c++) {
          const peca = el("div", "peca");
          peca.addEventListener("click", () => {
            if (!linha.classList.contains("ativa")) return;
            cursor = c;
            desenhar();
          });
          linha.appendChild(peca);
          pecas.push(peca);
        }
        tab.appendChild(linha);
        linhas.push(pecas);
      }
      raiz.appendChild(tab);
      return { el: tab, linhas };
    });
    dimensionar();
  }

  // Peças do maior tamanho que caiba entre o topo e o teclado
  function dimensionar() {
    const area = $("#area");
    const raiz = $("#tabuleiros");
    const n = cfg.tabuleiros;
    const colunas = n === 1 ? 1 : 2;
    const fileiras = n === 4 ? 2 : 1;
    const vao = n === 4 ? 3 : n === 2 ? 4 : 5;
    const largura = area.clientWidth - 24;
    const altura = area.clientHeight - 8;
    const porLargura = (largura - (colunas * TAMANHO - colunas) * vao - (colunas - 1) * vao * 3) / (colunas * TAMANHO);
    const linhas = fileiras * cfg.tentativas;
    const porAltura = (altura - (linhas - fileiras) * vao - (fileiras - 1) * vao * 3) / linhas;
    const peca = Math.max(16, Math.floor(Math.min(porLargura, porAltura, 64)));
    raiz.style.setProperty("--peca", `${peca}px`);
    raiz.style.setProperty("--vao", `${vao}px`);
  }

  function desenhar(revelar = -1) {
    const sit = situacao();
    const animar = revelar >= 0 && !semMovimento.matches;
    respostas.forEach((resposta, b) => {
      const resolvidoEm = sit.resolvidos[b];
      const ultima = resolvidoEm >= 0 ? resolvidoEm : Infinity;
      const tab = tabuleiros[b];
      tab.el.classList.toggle("resolvido", resolvidoEm >= 0);
      tab.linhas.forEach((pecas, l) => {
        if (revelar < 0 && l === linhaRevelando) return;
        const palpite = l <= ultima ? jogo.palpites[l] : undefined;
        const ativa = !sit.fim && resolvidoEm < 0 && l === jogo.palpites.length;
        pecas[0].parentNode.className = "linha" + (ativa ? " ativa" : palpite ? "" : " futura");
        const cores = palpite && L.avaliar(palpite, resposta);
        const letras = palpite && grafia(palpite);
        pecas.forEach((peca, c) => {
          peca.style.animationDelay = "";
          if (palpite) {
            peca.textContent = letras[c];
            if (animar && l === revelar) {
              // Cada peça "acende" na sua vez, como as lâmpadas de um placar
              peca.className = "peca cheia";
              setTimeout(() => { peca.className = `peca acende ${cores[c]}`; }, c * ATRASO_PECA);
            } else {
              peca.className = `peca ${cores[c]}`;
            }
          } else if (ativa) {
            peca.textContent = atual[c];
            peca.className = "peca" + (atual[c] ? " cheia" : "") + (c === cursor ? " cursor" : "");
          } else {
            peca.textContent = "";
            peca.className = "peca";
          }
        });
      });
    });
  }

  function comemorar(b, linha) {
    if (semMovimento.matches) return;
    tabuleiros[b].linhas[linha].forEach((peca, c) => {
      peca.classList.remove("acende");
      void peca.offsetWidth;
      peca.style.animationDelay = `${c * 90}ms`;
      peca.classList.add("pula");
    });
  }

  function tremer() {
    const l = jogo.palpites.length;
    tabuleiros.forEach((tab) => {
      const linha = tab.linhas[l] && tab.linhas[l][0].parentNode;
      if (!linha || !linha.classList.contains("ativa")) return;
      linha.classList.remove("treme");
      void linha.offsetWidth;
      linha.classList.add("treme");
    });
  }

  /* ---------- Teclado ---------- */

  function montarTeclado() {
    const raiz = $("#teclado");
    raiz.innerHTML = "";
    teclas = new Map();
    const botao = (k, classe, conteudo, rotulo) => {
      const b = el("button", `tecla ${classe || ""}`.trim());
      b.type = "button";
      b.dataset.k = k;
      b.setAttribute("aria-label", rotulo || k);
      if (cfg.tabuleiros > 1 && k.length === 1) {
        const partes = el("span", "partes");
        partes.dataset.n = cfg.tabuleiros;
        for (let i = 0; i < cfg.tabuleiros; i++) partes.appendChild(el("i"));
        b.appendChild(partes);
      }
      if (typeof conteudo === "string") b.appendChild(el("span", "rotulo", conteudo));
      else b.appendChild(conteudo);
      // Não pega o foco: assim o Enter do teclado físico não aperta a última tecla clicada
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => tecla(k));
      if (k.length === 1) teclas.set(k, b);
      return b;
    };
    const iconeApagar = () => {
      const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      s.setAttribute("viewBox", "0 0 24 24");
      s.setAttribute("aria-hidden", "true");
      s.innerHTML = '<path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z"/><path d="M12 9.5l5 5M17 9.5l-5 5"/>';
      return s;
    };
    FILAS.forEach((letras, i) => {
      const fila = el("div", "fila");
      if (i === 2 && ajustes.enterEsquerda) fila.appendChild(botao("Enter", "larga", "enter", "Enviar"));
      for (const k of letras) fila.appendChild(botao(k, "", k));
      if (i === 1) fila.appendChild(botao("Backspace", "apagar", iconeApagar(), "Apagar"));
      if (i === 2 && !ajustes.enterEsquerda) fila.appendChild(botao("Enter", "larga", "enter", "Enviar"));
      raiz.appendChild(fila);
    });
  }

  function desenharTeclado(palpites) {
    const estados = respostas.map((r) => L.letrasDoTabuleiro(palpites, r));
    for (const [k, b] of teclas) {
      if (cfg.tabuleiros === 1) {
        b.className = `tecla ${estados[0][k] || ""}`.trim();
      } else {
        [...b.querySelector(".partes").children].forEach((parte, i) => { parte.className = estados[i][k] || ""; });
        b.classList.toggle("toda-errada", estados.every((e) => e[k] === "errada"));
      }
    }
  }

  /* ---------- Entrada ---------- */

  function tecla(k) {
    if (situacao().fim || document.querySelector("dialog[open]")) return;
    // Dá para ir digitando o próximo palpite enquanto as peças acendem; só o Enter espera
    if (k === "Enter") return revelando ? undefined : enviar();
    if (k === "Backspace") {
      if (!atual[cursor] && cursor > 0) cursor--;
      atual[cursor] = "";
    } else if (k === "Delete") {
      atual[cursor] = "";
    } else if (k === "ArrowLeft") {
      cursor = Math.max(0, cursor - 1);
    } else if (k === "ArrowRight") {
      cursor = Math.min(TAMANHO - 1, cursor + 1);
    } else if (k === "Home") {
      cursor = 0;
    } else if (k === "End") {
      cursor = TAMANHO - 1;
    } else {
      const letra = L.semAcento(k);
      if (!/^[a-z]$/.test(letra)) return;
      atual[cursor] = letra;
      // Vai para a próxima casa vazia à direita; se não houver, só avança uma
      const vazia = atual.findIndex((x, i) => i > cursor && !x);
      cursor = vazia >= 0 ? vazia : Math.min(TAMANHO - 1, cursor + 1);
    }
    desenhar();
  }

  function enviar() {
    const palavra = atual.join("");
    let erro = null;
    if (palavra.length < TAMANHO) erro = "só palavras com 5 letras";
    else if (!GRAFIA.has(palavra)) erro = "essa palavra não é aceita";
    else if (jogo.palpites.includes(palavra)) erro = "você já tentou essa palavra";
    else if (modo === "solo" && ajustes.dificil) erro = L.violaModoDificil(palavra, jogo.palpites, respostas[0]);
    if (erro) {
      avisar(erro);
      tremer();
      return;
    }

    const antes = situacao();
    jogo.palpites.push(palavra);
    const linha = jogo.palpites.length - 1;
    const sit = situacao();
    if (sit.fim && !jogo.contabilizado) {
      contabilizar(sit);
      jogo.contabilizado = true;
    }
    salvar();
    atual = Array(TAMANHO).fill("");
    cursor = 0;
    limparAviso();

    revelando = true;
    linhaRevelando = linha;
    desenhar(linha);
    const espera = semMovimento.matches ? 0 : VIRADA;
    const desta = partida;
    setTimeout(() => {
      if (desta !== partida) return;
      revelando = false;
      linhaRevelando = -1;
      desenhar();
      desenharTeclado(jogo.palpites);
      anunciar(palavra);
      respostas.forEach((_, b) => {
        if (antes.resolvidos[b] < 0 && sit.resolvidos[b] === linha) comemorar(b, linha);
      });
      if (sit.fim) {
        avisoFinal(sit);
        setTimeout(() => { if (desta === partida) abrir("#dlg-estatisticas"); }, sit.venceu ? 1600 : 2200);
      }
    }, espera);
  }

  function avisoFinal(sit) {
    if (sit.venceu) {
      const t = jogo.palpites.length;
      const extra = t - cfg.tabuleiros;
      avisar(t === cfg.tentativas ? "Ufa!" : ELOGIOS[Math.min(extra, ELOGIOS.length - 1)], 0);
    } else {
      const nomes = respostas.map((r) => grafia(r).join("").toUpperCase());
      avisar(nomes.length === 1 ? `Fim de jogo · era ${nomes[0]}` : `Fim de jogo · ${nomes.join(" · ")}`, 0);
    }
  }

  // Para leitores de tela: diz o resultado de cada letra
  function anunciar(palpite) {
    const nomes = { certa: "certa", lugar: "em outro lugar", errada: "não tem" };
    const partes = respostas.map((r, b) => {
      if (situacao().resolvidos[b] >= 0 && situacao().resolvidos[b] < jogo.palpites.length - 1) return "";
      const av = L.avaliar(palpite, r);
      const letras = grafia(palpite).map((x, i) => `${x.toUpperCase()} ${nomes[av[i]]}`).join(", ");
      return cfg.tabuleiros > 1 ? `Tabuleiro ${b + 1}: ${letras}.` : `${letras}.`;
    });
    $("#leitor").textContent = `${grafia(palpite).join("").toUpperCase()}. ${partes.join(" ")}`;
  }

  /* ---------- Avisos ---------- */

  let timerAviso;
  function avisar(msg, duracao = 1800) {
    const a = $("#aviso");
    a.innerHTML = "";
    a.appendChild(el("span", "", msg));
    clearTimeout(timerAviso);
    if (duracao) timerAviso = setTimeout(limparAviso, duracao);
  }
  function limparAviso() {
    clearTimeout(timerAviso);
    $("#aviso").innerHTML = "";
  }

  /* ---------- Estatísticas ---------- */

  function lerEstatisticas(m = modo) {
    const vazio = { jogos: 0, vitorias: 0, seq: 0, melhor: 0, ultimaVitoria: 0, dist: Array(MODOS[m].tentativas + 1).fill(0) };
    return Object.assign(vazio, guardado.ler(`estatisticas:${m}`, {}));
  }

  function contabilizar(sit) {
    const e = lerEstatisticas();
    e.jogos++;
    if (sit.venceu) {
      e.vitorias++;
      e.seq = e.ultimaVitoria === dia - 1 ? e.seq + 1 : 1;
      e.melhor = Math.max(e.melhor, e.seq);
      e.ultimaVitoria = dia;
      e.dist[jogo.palpites.length - 1]++;
    } else {
      e.seq = 0;
      e.dist[cfg.tentativas]++;
    }
    guardado.gravar(`estatisticas:${modo}`, e);
  }

  function desenharEstatisticas() {
    const e = lerEstatisticas();
    const sit = situacao();
    const seq = e.ultimaVitoria >= dia - 1 ? e.seq : 0;
    const titulo = $("#est-titulo");
    titulo.textContent = "Estatísticas";
    if (modo !== "solo") titulo.appendChild(el("small", "", cfg.nome));
    const numeros = $("#est-numeros");
    numeros.innerHTML = "";
    [
      [e.jogos, "jogos"],
      [`${e.jogos ? Math.round((100 * e.vitorias) / e.jogos) : 0}%`, "de vitórias"],
      [seq, "sequência"],
      [e.melhor, "melhor sequência"],
    ].forEach(([n, t]) => {
      const d = el("div");
      d.append(el("strong", "", n), el("span", "", t));
      numeros.appendChild(d);
    });

    const dist = $("#est-distribuicao");
    dist.innerHTML = "";
    const maximo = Math.max(1, ...e.dist);
    const destaque = sit.venceu ? jogo.palpites.length - 1 : -1;
    for (let i = cfg.tabuleiros - 1; i <= cfg.tentativas; i++) {
      const linha = el("div", "barra");
      const barra = el("div", i === destaque ? "destaque" : "", e.dist[i]);
      barra.style.width = `${Math.max(7, (100 * e.dist[i]) / maximo)}%`;
      linha.append(el("span", "", i === cfg.tentativas ? "×" : i + 1), barra);
      linha.setAttribute("aria-label", `${i === cfg.tentativas ? "derrotas" : `${i + 1} tentativas`}: ${e.dist[i]}`);
      dist.appendChild(linha);
    }
    $("#est-rodape").hidden = !sit.fim;
    atualizarContagem();
  }

  function atualizarContagem() {
    const ms = L.msAteProximoDia();
    const s = Math.floor(ms / 1000);
    const dois = (n) => String(n).padStart(2, "0");
    $("#est-contagem").textContent = `${dois(Math.floor(s / 3600))}:${dois(Math.floor(s / 60) % 60)}:${dois(s % 60)}`;
  }

  function textoCompartilhar() {
    const emoji = ajustes.contraste ? EMOJI_CONTRASTE : EMOJI;
    const sit = situacao();
    const linhasDe = (b) => {
      const fim = sit.resolvidos[b] >= 0 ? sit.resolvidos[b] + 1 : jogo.palpites.length;
      return jogo.palpites.slice(0, fim).map((p) => L.avaliar(p, respostas[b]).map((s) => emoji[s]).join(""));
    };
    const placar = (b) => (sit.resolvidos[b] >= 0 ? sit.resolvidos[b] + 1 : "X");
    const endereco = location.origin + location.pathname + (modo === "solo" ? "" : `#${modo}`);
    if (cfg.tabuleiros === 1) {
      const dificil = ajustes.dificil ? "*" : "";
      return `${NOME} #${dia} ${placar(0)}/${cfg.tentativas}${dificil}\n\n${linhasDe(0).join("\n")}\n\n${endereco}`;
    }
    const placares = respostas.map((_, b) => placar(b)).join(cfg.tabuleiros === 2 ? "&" : "·");
    const blocos = [];
    for (let b = 0; b < cfg.tabuleiros; b += 2) {
      const esq = linhasDe(b);
      const dir = linhasDe(b + 1);
      const altura = Math.max(esq.length, dir.length);
      const vazio = "⬜".repeat(TAMANHO);
      blocos.push(Array.from({ length: altura }, (_, i) => `${esq[i] || vazio} ${dir[i] || vazio}`).join("\n"));
    }
    return `${NOME} ${cfg.nome} #${dia} ${placares}/${cfg.tentativas}\n\n${blocos.join("\n\n")}\n\n${endereco}`;
  }

  async function compartilhar() {
    const texto = textoCompartilhar();
    const toque = matchMedia("(pointer: coarse)").matches;
    if (toque && navigator.share) {
      try { await navigator.share({ text: texto }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const area = el("textarea");
      area.value = texto;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    fechar("#dlg-estatisticas");
    avisar("resultado copiado!", 2000);
  }

  /* ---------- Janelas e ajustes ---------- */

  let timerContagem;
  function abrir(seletor) {
    const d = $(seletor);
    if (d.open) return;
    document.querySelectorAll("dialog[open]").forEach((x) => x.close());
    if (seletor === "#dlg-estatisticas") {
      desenharEstatisticas();
      clearInterval(timerContagem);
      timerContagem = setInterval(() => {
        if (L.diaDoJogo() !== dia) location.reload();
        atualizarContagem();
      }, 1000);
    }
    if (seletor === "#dlg-ajustes") desenharAjustes();
    d.showModal();
  }
  function fechar(seletor) {
    const d = $(seletor);
    if (d.open) d.close();
  }

  function desenharAjustes() {
    const jogoSolo = modo === "solo" ? jogo : guardado.ler("jogo:solo", null);
    const emAndamento = jogoSolo && jogoSolo.dia === dia && jogoSolo.palpites.length > 0 && !jogoSolo.contabilizado;
    $("#opt-dificil").checked = ajustes.dificil;
    $("#opt-dificil").disabled = !!emAndamento;
    $("#opt-contraste").checked = ajustes.contraste;
    $("#opt-enter").checked = ajustes.enterEsquerda;
  }

  function aplicarAjustes() {
    document.documentElement.classList.toggle("contraste", ajustes.contraste);
    guardado.gravar("ajustes", ajustes);
  }

  function ligarEventos() {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector("dialog[open]")) return;
      const k = e.key;
      if (["Enter", "Backspace", "Delete", "ArrowLeft", "ArrowRight", "Home", "End"].includes(k) || k.length === 1) {
        if (k === "Enter" || k === "Backspace" || k === " ") e.preventDefault();
        tecla(k);
      }
    });

    $("#btn-ajuda").addEventListener("click", () => abrir("#dlg-ajuda"));
    $("#btn-estatisticas").addEventListener("click", () => abrir("#dlg-estatisticas"));
    $("#btn-ajustes").addEventListener("click", () => abrir("#dlg-ajustes"));
    $("#btn-compartilhar").addEventListener("click", compartilhar);

    document.querySelectorAll("dialog").forEach((d) => {
      d.querySelector(".fechar").addEventListener("click", () => d.close());
      // Clique fora da caixa fecha
      d.addEventListener("click", (e) => {
        const r = d.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
      });
      d.addEventListener("close", () => {
        if (d.id === "dlg-estatisticas") clearInterval(timerContagem);
        if (d.id === "dlg-ajuda") guardado.gravar("viuAjuda", true);
      });
    });

    $("#opt-dificil").addEventListener("change", (e) => { ajustes.dificil = e.target.checked; aplicarAjustes(); });
    $("#opt-contraste").addEventListener("change", (e) => { ajustes.contraste = e.target.checked; aplicarAjustes(); });
    $("#opt-enter").addEventListener("change", (e) => {
      ajustes.enterEsquerda = e.target.checked;
      aplicarAjustes();
      montarTeclado();
      desenharTeclado(jogo.palpites);
    });

    // Troca de modo pelos links do topo
    window.addEventListener("hashchange", iniciar);

    // Ajusta o tamanho das peças quando a janela muda
    new ResizeObserver(() => dimensionar()).observe($("#area"));

    // Quem deixa a aba aberta de um dia para o outro recebe a palavra nova
    const conferirDia = () => { if (!document.hidden && L.diaDoJogo() !== dia) iniciar(); };
    document.addEventListener("visibilitychange", conferirDia);
    setInterval(conferirDia, 60_000);
  }

  aplicarAjustes();
  ligarEventos();
  iniciar();
  if (!guardado.ler("viuAjuda", false)) abrir("#dlg-ajuda");

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();

// Tela do jogo: fases, tabuleiro, teclado, janelas e armazenamento local.
(() => {
  "use strict";

  const L = window.Logica;
  const Som = window.Som;
  const NOME = "Decifra";
  const PREFIXO = "decifra";
  const FILAS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
  const fmt = new Intl.NumberFormat("pt-BR");

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
  const dois = (n) => String(n).padStart(2, "0");
  const led = (n) => String(n).padStart(5, "0");

  const ajustes = Object.assign({ sons: true, contraste: false, enterEsquerda: false }, guardado.ler("ajustes", {}));

  // Estado da fase aberta
  let dia, tamanho, resposta, dicionario, fase;
  let atual = [];
  let cursor = 0;
  let revelando = false;
  let linhaRevelando = -1; // a linha que está acendendo não é redesenhada até acabar
  let partida = 0; // muda a cada troca de fase/dia, para descartar animações e carregamentos pendentes
  let linhas = []; // [[peça x tamanho] x fichas]
  let teclas = new Map();
  let teclaDica = null;

  /* ---------- Dicionários (um arquivo por tamanho, carregado sob demanda) ---------- */

  const dicionarios = new Map();
  async function carregar(t) {
    if (dicionarios.has(t)) return dicionarios.get(t);
    const resp = await fetch(`dados/${t}.txt`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const [linhaRespostas, linhaValidas] = (await resp.text()).split("\n");
    const grafia = new Map();
    for (const p of linhaValidas.split(" ")) grafia.set(L.semAcento(p), p.normalize("NFC"));
    for (const p of linhaRespostas.split(" ")) grafia.set(L.semAcento(p), p.normalize("NFC"));
    const d = { respostas: linhaRespostas.split(" ").map(L.semAcento), grafia };
    dicionarios.set(t, d);
    return d;
  }
  const letrasDe = (chave) => {
    const letras = [...((dicionario && dicionario.grafia.get(chave)) || chave)];
    return letras.length === chave.length ? letras : [...chave];
  };

  /* ---------- Estado salvo ---------- */

  function lerFase(t) {
    const f = guardado.ler(`fase:${t}`, null);
    if (f && f.dia === dia) return f;
    return { dia, palpites: [], dicas: [], inicio: null, fim: null, pontos: 0, contabilizado: false };
  }
  const salvarFase = () => guardado.gravar(`fase:${tamanho}`, fase);

  function statusFase(t) {
    const f = t === tamanho && fase ? fase : lerFase(t);
    if (f.contabilizado) return f.pontos > 0 ? "limpa" : "perdida";
    return f.palpites.length || f.dicas.length ? "andando" : "nova";
  }
  const placarDoDia = () => L.FASES.reduce((soma, t) => soma + (t === tamanho && fase ? fase : lerFase(t)).pontos, 0);

  function lerHistorico() {
    return Object.assign(
      { recorde: 0, seq: 0, melhorSeq: 0, ultimoDiaVitoria: 0, pontosTotais: 0, fases: {} },
      guardado.ler("historico", {})
    );
  }

  /* ---------- Fases ---------- */

  function faseDaUrl() {
    const t = Number(location.hash.slice(1));
    return L.FASES.includes(t) ? t : null;
  }
  // Sem fase na URL: a primeira que ainda não terminou hoje
  function faseInicial() {
    return faseDaUrl() || L.FASES.find((t) => ["nova", "andando"].includes(statusFase(t))) || 5;
  }

  async function iniciar(t) {
    const desta = ++partida;
    dia = L.diaDoJogo();
    tamanho = t;
    fase = lerFase(t);
    dicionario = null;
    revelando = false;
    linhaRevelando = -1;
    fecharTudo();
    limparAviso();
    $("#chip").textContent = `rodada #${String(dia).padStart(3, "0")}`;
    document.title = `${NOME} · ${t} letras`;
    desenharFases();
    desenharPainel();
    montarTabuleiro();
    montarTeclado();
    $("#tabuleiro").classList.add("carregando");

    try {
      const d = await carregar(t);
      if (desta !== partida) return;
      dicionario = d;
    } catch {
      if (desta !== partida) return;
      avisar("não deu para carregar as palavras. abra o jogo por um servidor (veja o README)", 0);
      return;
    }
    $("#tabuleiro").classList.remove("carregando");
    resposta = L.palavraDoDia(dicionario.respostas, dia);
    novaLinha();
    desenhar();
    desenharTeclado();
    if (situacao().fim) setTimeout(() => { if (desta === partida) abrirResultado(false); }, 350);
  }

  const situacao = () => L.situacao(fase, resposta);

  function desenharFases() {
    const raiz = $("#fases");
    raiz.innerHTML = "";
    L.FASES.forEach((t, i) => {
      const status = statusFase(t);
      const b = el("button", `fase ${status}${t === tamanho ? " atual" : ""}`);
      b.type = "button";
      const nomes = { nova: "nova", andando: "em andamento", limpa: "limpa", perdida: "perdida" };
      b.setAttribute("aria-label", `Fase ${i + 1}, ${t} letras, ${nomes[status]}`);
      if (t === tamanho) b.setAttribute("aria-current", "step");
      b.append(el("strong", "", t), el("span", "marca", { limpa: "✓", perdida: "✕", andando: "•", nova: "" }[status]));
      b.addEventListener("click", () => {
        if (t === tamanho) return;
        location.hash = `#${t}`;
      });
      raiz.appendChild(b);
    });
  }

  function desenharPainel() {
    const total = L.FICHAS[tamanho];
    const gastas = fase.palpites.length + fase.dicas.length;
    const moedas = $("#moedas");
    moedas.innerHTML = "";
    for (let i = 0; i < total; i++) moedas.appendChild(el("i", i < total - gastas ? "moeda" : "moeda gasta"));
    moedas.setAttribute("aria-label", `${total - gastas} de ${total} fichas`);
    $("#placar").textContent = led(placarDoDia());
  }

  /* ---------- Tabuleiro ---------- */

  function montarTabuleiro() {
    const raiz = $("#tabuleiro");
    raiz.innerHTML = "";
    raiz.style.setProperty("--colunas", tamanho);
    linhas = [];
    for (let l = 0; l < L.FICHAS[tamanho]; l++) {
      const linha = el("div", "linha oculta");
      const pecas = [];
      for (let c = 0; c < tamanho; c++) {
        const peca = el("div", "peca");
        peca.addEventListener("click", () => {
          if (!linha.classList.contains("ativa")) return;
          cursor = c;
          desenhar();
        });
        linha.appendChild(peca);
        pecas.push(peca);
      }
      raiz.appendChild(linha);
      linhas.push(pecas);
    }
    dimensionar();
  }

  // Peças do maior tamanho que caiba entre o painel e o teclado
  function dimensionar() {
    const area = $("#area");
    const vao = tamanho >= 8 ? 4 : 6;
    const fileiras = L.FICHAS[tamanho];
    const porLargura = (area.clientWidth - 24 - (tamanho - 1) * vao) / tamanho;
    const porAltura = (area.clientHeight - 8 - (fileiras - 1) * vao) / fileiras;
    const peca = Math.max(18, Math.floor(Math.min(porLargura, porAltura, 60)));
    const raiz = $("#tabuleiro");
    raiz.style.setProperty("--peca", `${peca}px`);
    raiz.style.setProperty("--vao", `${vao}px`);
  }

  // Casa com a letra revelada pela dica (enquanto ninguém escrever outra por cima)
  const ehDica = (i) => fase.dicas.includes(i) && atual[i] === resposta[i];

  // Começa uma linha nova: letras reveladas por dica já vêm preenchidas
  function novaLinha() {
    atual = Array(tamanho).fill("");
    for (const i of fase.dicas) atual[i] = resposta[i];
    cursor = 0;
  }

  function desenhar(revelar = -1) {
    if (!resposta) return;
    const sit = situacao();
    const ativa = sit.fim ? -1 : fase.palpites.length;
    const animar = revelar >= 0 && !semMovimento.matches;
    const atraso = Math.min(200, 1100 / tamanho);
    linhas.forEach((pecas, l) => {
      if (revelar < 0 && l === linhaRevelando) return;
      const palpite = fase.palpites[l];
      const linha = pecas[0].parentNode;
      linha.className = "linha" + (l === ativa ? " ativa" : palpite ? "" : " oculta");
      const cores = palpite && L.avaliar(palpite, resposta);
      const letras = palpite && letrasDe(palpite);
      pecas.forEach((peca, c) => {
        if (palpite) {
          peca.textContent = letras[c];
          if (animar && l === revelar) {
            // Cada peça acende na sua vez, como as lâmpadas de um placar
            peca.className = "peca cheia";
            setTimeout(() => {
              peca.className = `peca acende ${cores[c]}`;
              if (ajustes.sons) Som.acende(cores[c], c);
            }, c * atraso);
          } else {
            peca.className = `peca ${cores[c]}`;
          }
        } else if (l === ativa) {
          peca.textContent = atual[c];
          peca.className = "peca" + (ehDica(c) ? " dica" : atual[c] ? " cheia" : "") + (c === cursor ? " cursor" : "");
        } else {
          peca.textContent = "";
          peca.className = "peca";
        }
      });
    });
    return atraso * (tamanho - 1) + 450;
  }

  function comemorar(linha) {
    if (semMovimento.matches) return;
    linhas[linha].forEach((peca, c) => {
      peca.classList.remove("acende");
      void peca.offsetWidth;
      peca.style.animationDelay = `${c * 70}ms`;
      peca.classList.add("pula");
    });
  }

  function tremer() {
    const l = fase.palpites.length;
    const linha = linhas[l] && linhas[l][0].parentNode;
    if (!linha) return;
    linha.classList.remove("treme");
    void linha.offsetWidth;
    linha.classList.add("treme");
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
      if (typeof conteudo === "string") b.appendChild(el("span", "rotulo", conteudo));
      else b.appendChild(conteudo);
      // Não pega o foco: assim o Enter do teclado físico não aperta a última tecla clicada
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => tecla(k));
      if (k.length === 1) teclas.set(k, b);
      return b;
    };
    const svg = (desenho) => {
      const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      s.setAttribute("viewBox", "0 0 24 24");
      s.setAttribute("aria-hidden", "true");
      s.innerHTML = desenho;
      return s;
    };
    const dica = () => {
      const f = document.createDocumentFragment();
      f.append(svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>'), el("span", "rotulo", "dica"));
      teclaDica = botao("Dica", "larga dica", f, "Usar dica (gasta uma ficha)");
      return teclaDica;
    };
    FILAS.forEach((letras, i) => {
      const fila = el("div", "fila");
      if (i === 2) fila.appendChild(ajustes.enterEsquerda ? botao("Enter", "larga enter", "enter", "Enviar") : dica());
      for (const k of letras) fila.appendChild(botao(k, "", k));
      if (i === 1) fila.appendChild(botao("Backspace", "apagar", svg('<path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z"/><path d="M12 9.5l5 5M17 9.5l-5 5"/>'), "Apagar"));
      if (i === 2) fila.appendChild(ajustes.enterEsquerda ? dica() : botao("Enter", "larga enter", "enter", "Enviar"));
      raiz.appendChild(fila);
    });
  }

  function desenharTeclado() {
    const estados = resposta ? L.letrasConhecidas(fase, resposta) : {};
    for (const [k, b] of teclas) b.className = `tecla ${estados[k] || ""}`.trim();
    if (teclaDica) {
      const sit = resposta ? situacao() : null;
      const pode = sit && !sit.fim && sit.restantes > 1 && L.proximaDica(fase, resposta) >= 0;
      teclaDica.classList.toggle("sem", !pode);
    }
  }

  /* ---------- Entrada ---------- */

  function tecla(k) {
    if (!resposta || situacao().fim || document.querySelector("dialog[open]")) return;
    if (k === "Enter") return revelando ? undefined : enviar();
    if (k === "Dica") return revelando ? undefined : usarDica();
    if (k === "Backspace") {
      if (!atual[cursor] && cursor > 0) cursor--;
      atual[cursor] = "";
      if (ajustes.sons) Som.apagar();
    } else if (k === "Delete") {
      atual[cursor] = "";
    } else if (k === "ArrowLeft") {
      cursor = Math.max(0, cursor - 1);
    } else if (k === "ArrowRight") {
      cursor = Math.min(tamanho - 1, cursor + 1);
    } else {
      const letra = L.semAcento(k);
      if (!/^[a-z]$/.test(letra)) return;
      // Escreve em sequência, inclusive por cima das letras da dica
      atual[cursor] = letra;
      cursor = Math.min(tamanho - 1, cursor + 1);
      if (!fase.inicio) fase.inicio = Date.now();
      if (ajustes.sons) Som.tecla();
    }
    desenhar();
  }

  function recusar(msg) {
    avisar(msg);
    tremer();
    if (ajustes.sons) Som.erro();
  }

  function enviar() {
    const palavra = atual.join("");
    if (palavra.length < tamanho) return recusar("faltam letras");
    if (!dicionario.grafia.has(palavra)) return recusar("essa não está no dicionário");
    if (fase.palpites.includes(palavra)) return recusar("você já chutou essa");

    fase.palpites.push(palavra);
    const linha = fase.palpites.length - 1;
    const sit = situacao();
    let resultado = null;
    if (sit.fim && !fase.contabilizado) resultado = contabilizar(sit);
    salvarFase();
    novaLinha();
    limparAviso();
    desenharPainel();

    revelando = true;
    linhaRevelando = linha;
    const duracao = desenhar(linha);
    const desta = partida;
    setTimeout(() => {
      if (desta !== partida) return;
      revelando = false;
      linhaRevelando = -1;
      desenhar();
      desenharTeclado();
      anunciar(palavra);
      if (sit.venceu) comemorar(linha);
      if (sit.fim) {
        desenharFases();
        if (ajustes.sons) (sit.venceu ? Som.vitoria : Som.derrota)();
        setTimeout(() => { if (desta === partida) abrirResultado(true, resultado); }, sit.venceu ? 900 : 500);
      }
    }, semMovimento.matches ? 0 : duracao);
  }

  function usarDica() {
    const sit = situacao();
    const i = L.proximaDica(fase, resposta);
    if (i < 0) return recusar("nada a revelar");
    if (sit.restantes <= 1) return recusar("última ficha: sem dica");
    fase.dicas.push(i);
    if (!fase.inicio) fase.inicio = Date.now();
    salvarFase();
    atual[i] = resposta[i];
    if (ajustes.sons) Som.dica();
    avisar(`dica: a ${i + 1}ª letra é ${letrasDe(resposta)[i].toUpperCase()} · −1 ficha`, 2400);
    desenhar();
    desenharTeclado();
    desenharPainel();
    const peca = linhas[fase.palpites.length] && linhas[fase.palpites.length][i];
    if (peca && !semMovimento.matches) {
      peca.classList.add("acende");
    }
  }

  // Para leitores de tela: diz o resultado de cada letra
  function anunciar(palpite) {
    const nomes = { certa: "certa", lugar: "em outro lugar", errada: "não tem" };
    const av = L.avaliar(palpite, resposta);
    const letras = letrasDe(palpite);
    $("#leitor").textContent = `${letras.join("").toUpperCase()}: ${letras.map((x, i) => `${x.toUpperCase()} ${nomes[av[i]]}`).join(", ")}.`;
  }

  /* ---------- Pontos e histórico ---------- */

  function contabilizar(sit) {
    fase.contabilizado = true;
    fase.fim = Date.now();
    fase.pontos = L.pontos(tamanho, sit.restantes, sit.venceu);
    salvarFase();

    const h = lerHistorico();
    const pf = h.fases[tamanho] || (h.fases[tamanho] = { jogos: 0, vitorias: 0, melhor: null });
    pf.jogos++;
    if (sit.venceu) {
      pf.vitorias++;
      pf.melhor = pf.melhor == null ? sit.gastas : Math.min(pf.melhor, sit.gastas);
      if (h.ultimoDiaVitoria !== dia) {
        h.seq = h.ultimoDiaVitoria === dia - 1 ? h.seq + 1 : 1;
        h.ultimoDiaVitoria = dia;
        h.melhorSeq = Math.max(h.melhorSeq, h.seq);
      }
    }
    h.pontosTotais += fase.pontos;
    const total = placarDoDia();
    const novoRecorde = fase.pontos > 0 && total > h.recorde;
    if (novoRecorde) h.recorde = total;
    guardado.gravar("historico", h);
    return { novoRecorde };
  }

  const proximaFase = () => {
    const i = L.FASES.indexOf(tamanho);
    const ordem = [...L.FASES.slice(i + 1), ...L.FASES.slice(0, i)];
    return ordem.find((t) => ["nova", "andando"].includes(statusFase(t)));
  };

  function abrirResultado(animar, resultado) {
    const sit = situacao();
    const i = L.FASES.indexOf(tamanho);
    $("#res-rotulo").textContent = `fase ${i + 1} · ${tamanho} letras`;
    const titulo = !sit.venceu ? "Fichas esgotadas"
      : fase.palpites.length === 1 && !fase.dicas.length ? "De primeira!"
      : sit.restantes === 0 ? "No sufoco!"
      : "Fase limpa!";
    $("#res-titulo").textContent = titulo;
    $("#dlg-fase").classList.toggle("derrota", !sit.venceu);

    const palavra = $("#res-palavra");
    palavra.innerHTML = "";
    palavra.style.setProperty("--colunas", tamanho);
    letrasDe(resposta).forEach((x, c) => {
      const p = el("span", `peca ${sit.venceu ? "certa" : "revelada"}`, x);
      if (animar && !semMovimento.matches) p.style.animationDelay = `${c * 60}ms`;
      palavra.appendChild(p);
    });

    const alvo = fase.pontos;
    const caixa = $("#res-pontos");
    $("#res-conta").textContent = sit.venceu
      ? `${fmt.format(100 * tamanho)} da palavra + ${sit.restantes} ${sit.restantes === 1 ? "ficha" : "fichas"} × ${50 * tamanho}`
      : `a palavra era ${letrasDe(resposta).join("").toUpperCase()}`;
    const detalhes = [`${sit.gastas} de ${sit.total} fichas`];
    if (fase.dicas.length) detalhes.push(`${fase.dicas.length} ${fase.dicas.length === 1 ? "dica" : "dicas"}`);
    if (fase.inicio && fase.fim) {
      const s = Math.max(1, Math.round((fase.fim - fase.inicio) / 1000));
      detalhes.push(`${Math.floor(s / 60)}:${dois(s % 60)}`);
    }
    $("#res-detalhes").textContent = detalhes.join(" · ");
    $("#res-dia").textContent = led(placarDoDia());
    const recorde = $("#res-recorde");
    recorde.hidden = !(resultado && resultado.novoRecorde);
    if (!recorde.hidden && ajustes.sons) Som.recorde();

    // Pontos sobem como num placar de fliperama
    if (animar && alvo > 0 && !semMovimento.matches) {
      const inicio = performance.now();
      const duracao = 900;
      let ultimoSom = 0;
      const passo = (agora) => {
        const p = Math.min(1, (agora - inicio) / duracao);
        caixa.textContent = `+${fmt.format(Math.round(alvo * (1 - Math.pow(1 - p, 3))))}`;
        if (ajustes.sons && agora - ultimoSom > 70 && p < 1) { Som.moeda(); ultimoSom = agora; }
        if (p < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
      // Com a aba em segundo plano a animação pausa: garante o valor final
      setTimeout(() => { caixa.textContent = `+${fmt.format(alvo)}`; }, duracao + 150);
    } else {
      caixa.textContent = alvo > 0 ? `+${fmt.format(alvo)}` : "0";
    }

    const prox = proximaFase();
    const btn = $("#btn-proxima");
    btn.textContent = prox ? `Próxima: ${prox} letras ▸` : "Ver histórico";
    btn.onclick = () => {
      if (prox) location.hash = `#${prox}`;
      else abrir("#dlg-historico");
    };
    abrir("#dlg-fase");
  }

  function desenharHistorico() {
    const h = lerHistorico();
    const seq = h.ultimoDiaVitoria >= dia - 1 ? h.seq : 0;
    const limpas = Object.values(h.fases).reduce((s, f) => s + f.vitorias, 0);
    const numeros = $("#hist-numeros");
    numeros.innerHTML = "";
    [
      [fmt.format(h.recorde), "recorde em um dia"],
      [seq, seq === 1 ? "dia seguido" : "dias seguidos"],
      [limpas, limpas === 1 ? "fase limpa" : "fases limpas"],
      [fmt.format(h.pontosTotais), "pontos no total"],
    ].forEach(([n, t]) => {
      const d = el("div");
      d.append(el("strong", "", n), el("span", "", t));
      numeros.appendChild(d);
    });

    const lista = $("#hist-fases");
    lista.innerHTML = "";
    for (const t of L.FASES) {
      const f = h.fases[t] || { jogos: 0, vitorias: 0, melhor: null };
      const linha = el("div", "linha-fase");
      const taxa = f.jogos ? f.vitorias / f.jogos : 0;
      const barra = el("span", "medidor");
      const cheio = el("i");
      cheio.style.width = `${Math.round(taxa * 100)}%`;
      barra.appendChild(cheio);
      linha.append(
        el("strong", "", t),
        el("span", "texto", f.jogos ? `limpou ${f.vitorias} de ${f.jogos}` : "ainda não jogou"),
        barra,
        el("span", "melhor", f.melhor != null ? `melhor: ${f.melhor} ${f.melhor === 1 ? "ficha" : "fichas"}` : "")
      );
      lista.appendChild(linha);
    }
  }

  /* ---------- Compartilhar ---------- */

  function textoRodada() {
    const linhasTexto = L.FASES.map((t) => {
      const f = t === tamanho ? fase : lerFase(t);
      const total = L.FICHAS[t];
      const gastas = f.palpites.length + f.dicas.length;
      const rotulo = String(t).padStart(2, " ");
      if (!f.contabilizado) return `${rotulo} ${f.palpites.length ? "em jogo" : "—"}`;
      if (!f.pontos) return `${rotulo} ✕ fichas esgotadas`;
      const barra = "▰".repeat(gastas) + "▱".repeat(total - gastas);
      return `${rotulo} ${barra} +${fmt.format(f.pontos)}${f.dicas.length ? " 💡" : ""}`;
    });
    const endereco = location.origin + location.pathname;
    return `${NOME.toUpperCase()} · rodada #${String(dia).padStart(3, "0")}\n⚡ ${fmt.format(placarDoDia())} pontos\n\n${linhasTexto.join("\n")}\n\n${endereco}`;
  }

  async function compartilhar() {
    const texto = textoRodada();
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
    fecharTudo();
    avisar("rodada copiada!", 2000);
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

  /* ---------- Janelas e ajustes ---------- */

  let timerContagem;
  function atualizarContagem() {
    const s = Math.floor(L.msAteProximoDia() / 1000);
    $("#res-contagem").textContent = `${dois(Math.floor(s / 3600))}:${dois(Math.floor(s / 60) % 60)}:${dois(s % 60)}`;
  }
  function abrir(seletor) {
    const d = $(seletor);
    if (d.open) return;
    fecharTudo();
    if (seletor === "#dlg-fase") {
      atualizarContagem();
      clearInterval(timerContagem);
      timerContagem = setInterval(() => {
        if (L.diaDoJogo() !== dia) location.reload();
        atualizarContagem();
      }, 1000);
    }
    if (seletor === "#dlg-historico") desenharHistorico();
    if (seletor === "#dlg-ajustes") desenharAjustes();
    d.showModal();
  }
  function fecharTudo() {
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
  }

  function desenharAjustes() {
    $("#opt-sons").checked = ajustes.sons;
    $("#opt-contraste").checked = ajustes.contraste;
    $("#opt-enter").checked = ajustes.enterEsquerda;
  }
  function aplicarAjustes() {
    document.documentElement.classList.toggle("contraste", ajustes.contraste);
    Som.ligar(ajustes.sons);
    guardado.gravar("ajustes", ajustes);
  }

  function ligarEventos() {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector("dialog[open]")) return;
      const k = e.key;
      if (["Enter", "Backspace", "Delete", "ArrowLeft", "ArrowRight"].includes(k) || k.length === 1) {
        if (k === "Enter" || k === "Backspace" || k === " ") e.preventDefault();
        tecla(k);
      }
    });

    $("#btn-ajuda").addEventListener("click", () => abrir("#dlg-ajuda"));
    $("#btn-historico").addEventListener("click", () => abrir("#dlg-historico"));
    $("#btn-ajustes").addEventListener("click", () => abrir("#dlg-ajustes"));
    $("#btn-comecar").addEventListener("click", () => $("#dlg-ajuda").close());
    $("#btn-compartilhar").addEventListener("click", compartilhar);
    $("#btn-compartilhar-hist").addEventListener("click", compartilhar);

    document.querySelectorAll("dialog").forEach((d) => {
      d.querySelector(".fechar").addEventListener("click", () => d.close());
      // Clique fora da caixa fecha
      d.addEventListener("click", (e) => {
        const r = d.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
      });
      d.addEventListener("close", () => {
        if (d.id === "dlg-fase") clearInterval(timerContagem);
        if (d.id === "dlg-ajuda") guardado.gravar("viuAjuda", true);
      });
    });

    $("#opt-sons").addEventListener("change", (e) => { ajustes.sons = e.target.checked; aplicarAjustes(); if (ajustes.sons) Som.dica(); });
    $("#opt-contraste").addEventListener("change", (e) => { ajustes.contraste = e.target.checked; aplicarAjustes(); });
    $("#opt-enter").addEventListener("change", (e) => {
      ajustes.enterEsquerda = e.target.checked;
      aplicarAjustes();
      montarTeclado();
      desenharTeclado();
    });

    window.addEventListener("hashchange", () => iniciar(faseDaUrl() || faseInicial()));
    new ResizeObserver(() => dimensionar()).observe($("#area"));

    // Quem deixa a aba aberta de um dia para o outro recebe a rodada nova
    const conferirDia = () => { if (!document.hidden && L.diaDoJogo() !== dia) iniciar(faseInicial()); };
    document.addEventListener("visibilitychange", conferirDia);
    setInterval(conferirDia, 60_000);
  }

  dia = L.diaDoJogo();
  aplicarAjustes();
  ligarEventos();
  iniciar(faseInicial()).then(() => {
    if (!guardado.ler("viuAjuda", false)) abrir("#dlg-ajuda");
  });

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();

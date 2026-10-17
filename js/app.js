// Tela do jogo: fases, tabuleiros, teclado, janelas e armazenamento local.
(() => {
  "use strict";

  const L = window.Logica;
  const Som = window.Som;
  const NOME = "Decifra";
  const PREFIXO = "decifra";
  const FILAS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
  const IDS = L.FASES.map((f) => f.id);
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
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  const ajustes = Object.assign({ sons: true, contraste: false, enterEsquerda: false }, guardado.ler("ajustes", {}));

  // Fase aberta
  let dia, info, tamanho, respostas, dicionario, estado;
  let atual = [];
  let cursor = 0;
  let revelando = false;
  let linhaRevelando = -1; // a linha que está acendendo não é redesenhada até acabar
  let partida = 0; // muda a cada troca de fase/dia, para descartar animações e carregamentos pendentes
  let tabuleiros = []; // [{ el, linhas: [[peça x tamanho] x fichas] }]
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

  function lerEstado(id) {
    const f = guardado.ler(`fase:${id}`, null);
    if (f && f.dia === dia) {
      // Versão anterior guardava a dica só como posição
      f.dicas = f.dicas.map((d) => (Array.isArray(d) ? d : [0, d]));
      return f;
    }
    return { dia, palpites: [], dicas: [], inicio: null, fim: null, pontos: 0, contabilizado: false };
  }
  const estadoDe = (id) => (info && id === info.id && estado ? estado : lerEstado(id));
  const salvar = () => guardado.gravar(`fase:${info.id}`, estado);

  function statusFase(id) {
    const f = estadoDe(id);
    if (f.contabilizado) return f.pontos > 0 && f.venceu !== false ? "limpa" : "perdida";
    return f.palpites.length || f.dicas.length ? "andando" : "nova";
  }
  const placarDoDia = () => IDS.reduce((soma, id) => soma + estadoDe(id).pontos, 0);

  function lerHistorico() {
    return Object.assign(
      { recorde: 0, seq: 0, melhorSeq: 0, ultimoDiaVitoria: 0, pontosTotais: 0, fases: {} },
      guardado.ler("historico", {})
    );
  }

  /* ---------- Fases ---------- */

  function faseDaUrl() {
    const id = decodeURIComponent(location.hash.slice(1));
    return L.fase(id) ? id : null;
  }
  // Sem fase na URL: a primeira que ainda não terminou hoje
  const faseInicial = () => faseDaUrl() || IDS.find((id) => ["nova", "andando"].includes(statusFase(id))) || "5";

  async function iniciar(id) {
    const desta = ++partida;
    dia = L.diaDoJogo();
    info = L.fase(id);
    tamanho = info.tamanho;
    estado = lerEstado(id);
    dicionario = null;
    respostas = null;
    revelando = false;
    linhaRevelando = -1;
    fecharTudo();
    limparAviso();
    $("#chip").textContent = `rodada #${String(dia).padStart(3, "0")}`;
    document.title = `${NOME} · ${info.nome}`;
    desenharFases();
    desenharPainel();
    montarTabuleiros();
    montarTeclado();
    $("#tabuleiros").classList.add("carregando");

    try {
      const d = await carregar(tamanho);
      if (desta !== partida) return;
      dicionario = d;
    } catch {
      if (desta !== partida) return;
      avisar("não deu para carregar as palavras. abra o jogo por um servidor (veja o README)", 0);
      return;
    }
    $("#tabuleiros").classList.remove("carregando");
    respostas = L.palavrasDoDia(dicionario.respostas, dia, info.palavras);
    novaLinha();
    desenhar();
    desenharTeclado();
    if (situacao().fim) setTimeout(() => { if (desta === partida) abrirResultado(false); }, 350);
  }

  const situacao = () => L.situacao(estado, respostas, info.fichas);

  // Ícones dos modos: 1, 2 e 4 quadradinhos
  const ICONES = {
    classico: '<rect x="7" y="7" width="10" height="10" rx="2"/>',
    dueto: '<rect x="3" y="7" width="8" height="10" rx="2"/><rect x="13" y="7" width="8" height="10" rx="2"/>',
    quarteto: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  };
  const MARCAS = { limpa: "✓", perdida: "✕", andando: "•", nova: "" };
  const NOMES_STATUS = { nova: "nova", andando: "em andamento", limpa: "limpa", perdida: "perdida" };
  const SOLOS = L.FASES.filter((f) => f.palavras === 1);

  function desenharFases() {
    const modoAtual = info.palavras === 1 ? "classico" : info.id;

    // Seletor de modo: Clássico (fases de 4 a 10 letras), Dueto e Quarteto
    const modos = $("#modos");
    modos.innerHTML = "";
    const feitas = SOLOS.filter((f) => ["limpa", "perdida"].includes(statusFase(f.id))).length;
    [
      { id: "classico", nome: "Clássico", selo: feitas ? `${feitas}/${SOLOS.length}` : "", status: feitas === SOLOS.length ? "limpa" : "" },
      ...L.FASES.filter((f) => f.palavras > 1).map((f) => ({ id: f.id, nome: f.nome, selo: MARCAS[statusFase(f.id)], status: statusFase(f.id) })),
    ].forEach((m) => {
      const b = el("button", `modo${m.id === modoAtual ? " atual" : ""}${m.status ? ` ${m.status}` : ""}`);
      b.type = "button";
      if (m.id === modoAtual) b.setAttribute("aria-current", "page");
      const icone = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icone.setAttribute("viewBox", "0 0 24 24");
      icone.setAttribute("aria-hidden", "true");
      icone.innerHTML = ICONES[m.id];
      b.append(icone, el("span", "", m.nome));
      if (m.selo) b.appendChild(el("em", "selo", m.selo));
      b.addEventListener("click", () => {
        if (m.id === modoAtual) return;
        if (m.id !== "classico") location.hash = `#${m.id}`;
        else {
          // Volta para a primeira fase do clássico que ainda não terminou
          const prox = SOLOS.find((f) => ["nova", "andando"].includes(statusFase(f.id))) || SOLOS[1];
          location.hash = `#${prox.id}`;
        }
      });
      modos.appendChild(b);
    });

    // Linha de baixo: as fases do clássico ou a explicação do bônus
    const fases = $("#fases");
    const bonus = $("#bonus-info");
    // No bônus, depois do primeiro chute as etiquetas saem para sobrar espaço aos tabuleiros
    $(".subfaixa").classList.toggle("recolhida", modoAtual !== "classico" && (estado.palpites.length > 0 || estado.dicas.length > 0));
    fases.hidden = modoAtual !== "classico";
    bonus.hidden = modoAtual === "classico";
    fases.innerHTML = "";
    if (modoAtual === "classico") {
      SOLOS.forEach((f, i) => {
        const status = statusFase(f.id);
        const b = el("button", `fase ${status}${f.id === info.id ? " atual" : ""}`);
        b.type = "button";
        b.setAttribute("aria-label", `Fase ${i + 1}, ${f.nome}, ${NOMES_STATUS[status]}`);
        if (f.id === info.id) b.setAttribute("aria-current", "step");
        b.append(el("strong", "", f.curto), el("span", "marca", MARCAS[status]));
        b.addEventListener("click", () => {
          if (f.id !== info.id) location.hash = `#${f.id}`;
        });
        fases.appendChild(b);
      });
    } else {
      bonus.innerHTML = "";
      for (const [n, t] of [[info.palavras, "palavras juntas"], [info.tamanho, "letras cada"], [info.fichas, "fichas"]]) {
        const etiqueta = el("span", "etiqueta");
        etiqueta.append(el("strong", "", n), el("span", "", t));
        bonus.appendChild(etiqueta);
      }
    }
  }

  function desenharPainel() {
    const total = info.fichas;
    const gastas = estado.palpites.length + estado.dicas.length;
    const moedas = $("#moedas");
    moedas.innerHTML = "";
    for (let i = 0; i < total; i++) moedas.appendChild(el("i", i < total - gastas ? "moeda" : "moeda gasta"));
    moedas.setAttribute("aria-label", `${total - gastas} de ${total} fichas`);
    $("#placar").textContent = led(placarDoDia());
  }

  /* ---------- Tabuleiros ---------- */

  function montarTabuleiros() {
    const raiz = $("#tabuleiros");
    raiz.innerHTML = "";
    raiz.dataset.n = info.palavras;
    raiz.style.setProperty("--colunas", tamanho);
    tabuleiros = Array.from({ length: info.palavras }, (_, b) => {
      const tab = el("div", "tabuleiro");
      if (info.palavras > 1) tab.setAttribute("aria-label", `Tabuleiro ${b + 1}`);
      const linhas = [];
      for (let l = 0; l < info.fichas; l++) {
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
        tab.appendChild(linha);
        linhas.push(pecas);
      }
      raiz.appendChild(tab);
      return { el: tab, linhas };
    });
    dimensionar();
  }

  // Peças do maior tamanho que caiba entre o painel e o teclado
  function dimensionar() {
    if (!info) return;
    const area = $("#area");
    const n = info.palavras;
    const vao = n === 4 ? 3 : n === 2 || tamanho >= 8 ? 4 : 6;
    const estilo = getComputedStyle(area);
    const largura = area.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
    const altura = area.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom) - 4;
    // Dueto/Quarteto: cada palavra num painel próprio, bem separado dos outros
    const largo = largura >= 600;
    const gapTab = n > 1 ? (largo ? 28 : 14) : 0;
    const padTab = n > 1 ? (largo ? 12 : 6) : 0;

    // Tamanho da peça para uma disposição; "linhasDe" diz quantas linhas cada tabuleiro ocupa
    const medir = (colunas, fileiras, linhasDe) => {
      let linhas = 0;
      for (let f = 0; f < fileiras; f++) {
        let maior = 1;
        for (let c = 0; c < colunas; c++) maior = Math.max(maior, linhasDe(f * colunas + c));
        linhas += maior;
      }
      const porLargura = (largura - (colunas - 1) * gapTab - colunas * 2 * padTab - colunas * (tamanho - 1) * vao) / (colunas * tamanho);
      const porAltura = (altura - (fileiras - 1) * gapTab - fileiras * 2 * padTab - (linhas - fileiras) * vao) / linhas;
      return Math.min(porLargura, porAltura, 58);
    };

    // Quarteto: as 4 palavras lado a lado, cada uma na sua coluna; em tela estreita
    // (onde 4 colunas deixariam as peças minúsculas) fica 2 em cima e 2 embaixo.
    // A escolha olha o pior caso (todas as fichas usadas), para não trocar no meio do jogo.
    let colunas = n === 1 ? 1 : 2;
    if (n === 4) {
      const cheio = () => info.fichas;
      const emColunas = medir(4, 1, cheio);
      colunas = emColunas >= 22 || emColunas >= medir(2, 2, cheio) ? 4 : 2;
    }
    const fileiras = n / colunas;

    // Espaço reservado para todas as linhas: as que faltam aparecem tracejadas
    const peca = Math.max(12, Math.floor(medir(colunas, fileiras, () => info.fichas)));
    const raiz = $("#tabuleiros");
    raiz.style.setProperty("--peca", `${peca}px`);
    raiz.style.setProperty("--vao", `${vao}px`);
    raiz.style.setProperty("--cols", colunas);
    raiz.style.setProperty("--gap-tab", `${gapTab}px`);
    raiz.style.setProperty("--pad-tab", `${padTab}px`);
    // As teclas divididas seguem a mesma disposição dos tabuleiros
    $("#teclado").dataset.layout = colunas === 4 ? "colunas" : "grade";
    // Peças muito pequenas: sem as marquinhas, só a cor
    raiz.classList.toggle("miuda", peca < 26);
  }

  function linhasVisiveis(b) {
    if (!respostas) return 1;
    const sit = situacao();
    if (sit.resolvidos[b] >= 0) return sit.resolvidos[b] + 1;
    return Math.max(1, sit.fim ? estado.palpites.length : estado.palpites.length + 1);
  }

  const solo = () => info.palavras === 1;
  const temDica = (b, i) => estado.dicas.some(([t, p]) => t === b && p === i);

  // Começa uma linha nova. No solo, as letras da dica já vêm preenchidas; com vários
  // tabuleiros elas aparecem "fantasmas" só no tabuleiro delas.
  function novaLinha() {
    atual = Array(tamanho).fill("");
    if (solo()) for (const [, i] of estado.dicas) atual[i] = respostas[0][i];
    cursor = 0;
  }

  function desenhar(revelar = -1) {
    if (!respostas) return 0;
    const sit = situacao();
    const animar = revelar >= 0 && !semMovimento.matches;
    const atraso = Math.min(200, 1100 / tamanho);
    let somTocando = false; // com vários tabuleiros, só um toca o som de cada letra
    respostas.forEach((resposta, b) => {
      const resolvidoEm = sit.resolvidos[b];
      const ultima = resolvidoEm >= 0 ? resolvidoEm : Infinity;
      const tab = tabuleiros[b];
      tab.el.classList.toggle("resolvido", resolvidoEm >= 0 && !(animar && resolvidoEm === revelar));
      tab.linhas.forEach((pecas, l) => {
        if (revelar < 0 && l === linhaRevelando) return;
        const palpite = l <= ultima ? estado.palpites[l] : undefined;
        const ativa = !sit.fim && resolvidoEm < 0 && l === estado.palpites.length;
        pecas[0].parentNode.className = "linha" + (ativa ? " ativa" : palpite ? "" : " oculta");
        const cores = palpite && L.avaliar(palpite, resposta);
        const letras = palpite && letrasDe(palpite);
        const tocar = animar && l === revelar && palpite && !somTocando;
        if (tocar) somTocando = true;
        pecas.forEach((peca, c) => {
          peca.style.animationDelay = "";
          if (palpite) {
            peca.textContent = letras[c];
            if (animar && l === revelar) {
              // Cada peça acende na sua vez, como as lâmpadas de um placar
              peca.className = "peca cheia";
              setTimeout(() => {
                peca.className = `peca acende ${cores[c]}`;
                if (tocar && ajustes.sons) Som.acende(cores[c], c);
              }, c * atraso);
            } else {
              peca.className = `peca ${cores[c]}`;
            }
          } else if (ativa) {
            const dica = temDica(b, c);
            if (atual[c]) {
              peca.textContent = atual[c];
              peca.className = "peca" + (dica && atual[c] === resposta[c] ? " dica" : " cheia");
            } else if (dica) {
              peca.textContent = resposta[c];
              peca.className = "peca dica fantasma";
            } else {
              peca.textContent = "";
              peca.className = "peca";
            }
            if (c === cursor) peca.classList.add("cursor");
          } else {
            peca.textContent = "";
            peca.className = "peca";
          }
        });
      });
    });
    if (info.palavras > 1) dimensionar();
    return atraso * (tamanho - 1) + 450;
  }

  function comemorar(b, linha) {
    tabuleiros[b].el.classList.add("resolvido");
    if (semMovimento.matches) return;
    tabuleiros[b].linhas[linha].forEach((peca, c) => {
      peca.classList.remove("acende");
      void peca.offsetWidth;
      peca.style.animationDelay = `${c * 70}ms`;
      peca.classList.add("pula");
    });
  }

  function tremer() {
    const l = estado.palpites.length;
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
      if (info.palavras > 1 && k.length === 1) {
        const partes = el("span", "partes");
        partes.dataset.n = info.palavras;
        for (let i = 0; i < info.palavras; i++) partes.appendChild(el("i"));
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
    const estados = respostas ? respostas.map((r, b) => L.letrasConhecidas(estado, r, b)) : [{}];
    for (const [k, b] of teclas) {
      if (estados.length === 1) {
        b.className = `tecla ${estados[0][k] || ""}`.trim();
      } else {
        [...b.querySelector(".partes").children].forEach((parte, i) => { parte.className = estados[i][k] || ""; });
        b.classList.toggle("toda-errada", estados.every((e) => e[k] === "errada"));
        b.classList.toggle("alguma", estados.some((e) => e[k] && e[k] !== "errada"));
      }
    }
    if (teclaDica) {
      const sit = respostas ? situacao() : null;
      const pode = sit && !sit.fim && sit.restantes > 1 && L.proximaDica(estado, respostas) !== null;
      teclaDica.classList.toggle("sem", !pode);
    }
  }

  /* ---------- Entrada ---------- */

  // Casa com a letra da dica no solo: fica travada (não é apagada nem substituída)
  const travada = (i) => solo() && temDica(0, i) && atual[i] === respostas[0][i];
  const vazia = (i) => !atual[i];

  // Para onde o cursor vai depois de uma letra: a próxima casa vazia (ou com dica, para quem
  // digita a palavra inteira) à direita; se não houver, a primeira vazia desde o começo.
  function proximoPouso(de) {
    for (let i = de + 1; i < tamanho; i++) if (vazia(i) || travada(i)) return i;
    for (let i = 0; i < de; i++) if (vazia(i)) return i;
    return Math.min(de + 1, tamanho - 1);
  }
  function proximaVazia(de) {
    for (let i = de + 1; i < tamanho; i++) if (vazia(i)) return i;
    for (let i = 0; i < de; i++) if (vazia(i)) return i;
    return -1;
  }

  function tecla(k) {
    if (!respostas || situacao().fim || document.querySelector("dialog[open]")) return;
    if (k === "Enter") return revelando ? undefined : enviar();
    if (k === "Dica") return revelando ? undefined : usarDica();
    if (k === "Backspace") {
      // Apaga a casa do cursor; se ela estiver vazia, a letra anterior (pulando as da dica)
      if (vazia(cursor) || travada(cursor)) {
        let i = cursor - 1;
        while (i >= 0 && (travada(i) || vazia(i))) i--;
        if (i < 0) return;
        cursor = i;
      }
      if (ajustes.sons) Som.apagar(cursor);
      atual[cursor] = "";
    } else if (k === "Delete") {
      if (!travada(cursor)) atual[cursor] = "";
    } else if (k === "ArrowLeft") {
      cursor = Math.max(0, cursor - 1);
    } else if (k === "ArrowRight" || k === " ") {
      // Espaço pula para a próxima casa, como a seta para a direita
      cursor = Math.min(tamanho - 1, cursor + 1);
    } else {
      const letra = L.semAcento(k);
      if (!/^[a-z]$/.test(letra)) return;
      let alvo = cursor;
      // Em cima da letra da dica: a mesma letra só confirma; outra vai para a próxima casa vazia
      if (travada(alvo) && letra !== atual[alvo]) {
        alvo = proximaVazia(alvo);
        if (alvo < 0) return;
      }
      if (ajustes.sons) Som.tecla(alvo);
      if (!travada(alvo)) atual[alvo] = letra;
      cursor = proximoPouso(alvo);
      if (!estado.inicio) estado.inicio = Date.now();
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
    if (estado.palpites.includes(palavra)) return recusar("você já chutou essa");
    if (ajustes.sons) Som.enviar();

    const antes = situacao();
    estado.palpites.push(palavra);
    const linha = estado.palpites.length - 1;
    const sit = situacao();
    let resultado = null;
    if (sit.fim && !estado.contabilizado) resultado = contabilizar(sit);
    salvar();
    novaLinha();
    limparAviso();
    desenharPainel();
    if (linha === 0) desenharFases();

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
      const novos = respostas.map((_, b) => b).filter((b) => antes.resolvidos[b] < 0 && sit.resolvidos[b] === linha);
      novos.forEach((b) => comemorar(b, linha));
      if (sit.fim) {
        desenharFases();
        if (ajustes.sons) (sit.venceu ? Som.vitoria : Som.derrota)();
        setTimeout(() => { if (desta === partida) abrirResultado(true, resultado); }, sit.venceu ? 900 : 500);
      } else if (novos.length) {
        if (ajustes.sons) Som.resolvido();
        avisar(info.palavras > 1 ? `decifrou ${sit.quantasResolvidas} de ${info.palavras}!` : "boa!", 1400);
      }
    }, semMovimento.matches ? 0 : duracao);
  }

  function usarDica() {
    const sit = situacao();
    const proxima = L.proximaDica(estado, respostas);
    if (!proxima) return recusar("nada a revelar");
    if (sit.restantes <= 1) return recusar("última ficha: sem dica");
    const [b, i] = proxima;
    estado.dicas.push([b, i]);
    if (!estado.inicio) estado.inicio = Date.now();
    salvar();
    desenharFases();
    if (solo()) atual[i] = respostas[0][i];
    if (ajustes.sons) Som.dica();
    const letra = letrasDe(respostas[b])[i].toUpperCase();
    avisar(`${info.palavras > 1 ? `tabuleiro ${b + 1}: ` : ""}a ${i + 1}ª letra é ${letra} · −1 ficha`, 2600);
    desenhar();
    desenharTeclado();
    desenharPainel();
    const peca = tabuleiros[b].linhas[estado.palpites.length] && tabuleiros[b].linhas[estado.palpites.length][i];
    if (peca && !semMovimento.matches) peca.classList.add("acende");
  }

  // Para leitores de tela: diz o resultado de cada letra
  function anunciar(palpite) {
    const nomes = { certa: "certa", lugar: "em outro lugar", errada: "não tem" };
    const letras = letrasDe(palpite);
    const sit = situacao();
    const partes = respostas.map((r, b) => {
      if (sit.resolvidos[b] >= 0 && sit.resolvidos[b] < estado.palpites.length - 1) return "";
      const av = L.avaliar(palpite, r);
      const texto = letras.map((x, i) => `${x.toUpperCase()} ${nomes[av[i]]}`).join(", ");
      return info.palavras > 1 ? `Tabuleiro ${b + 1}: ${texto}.` : `${texto}.`;
    });
    $("#leitor").textContent = `${letras.join("").toUpperCase()}. ${partes.join(" ")}`;
  }

  /* ---------- Pontos e histórico ---------- */

  function contabilizar(sit) {
    estado.contabilizado = true;
    estado.venceu = sit.venceu;
    estado.fim = Date.now();
    estado.pontos = L.pontos(tamanho, info.palavras, sit.quantasResolvidas, sit.restantes);
    salvar();

    const h = lerHistorico();
    const pf = h.fases[info.id] || (h.fases[info.id] = { jogos: 0, vitorias: 0, melhor: null });
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
    h.pontosTotais += estado.pontos;
    const total = placarDoDia();
    const novoRecorde = estado.pontos > 0 && total > h.recorde;
    if (novoRecorde) h.recorde = total;
    guardado.gravar("historico", h);
    return { novoRecorde };
  }

  const proximaFase = () => {
    const i = IDS.indexOf(info.id);
    return [...IDS.slice(i + 1), ...IDS.slice(0, i)].find((id) => ["nova", "andando"].includes(statusFase(id)));
  };

  function abrirResultado(animar, resultado) {
    const sit = situacao();
    const n = info.palavras;
    const i = IDS.indexOf(info.id);
    $("#res-rotulo").textContent = n > 1 ? `bônus · ${n} palavras de ${tamanho} letras` : `fase ${i + 1} · ${tamanho} letras`;
    const titulo = !sit.venceu ? "Fichas esgotadas"
      : estado.palpites.length === n && !estado.dicas.length ? (n > 1 ? "Perfeito!" : "De primeira!")
      : sit.restantes === 0 ? "No sufoco!"
      : "Fase limpa!";
    $("#res-titulo").textContent = titulo;
    $("#dlg-fase").classList.toggle("derrota", !sit.venceu);

    const palavras = $("#res-palavras");
    palavras.innerHTML = "";
    palavras.style.setProperty("--colunas", tamanho);
    palavras.dataset.n = n;
    respostas.forEach((r, b) => {
      const linha = el("div", "res-palavra");
      letrasDe(r).forEach((x, c) => {
        const p = el("span", `peca ${sit.resolvidos[b] >= 0 ? "certa" : "revelada"}`, x);
        if (animar && !semMovimento.matches) p.style.animationDelay = `${(b * tamanho + c) * 50}ms`;
        linha.appendChild(p);
      });
      palavras.appendChild(linha);
    });

    const alvo = estado.pontos;
    const caixa = $("#res-pontos");
    const porPalavra = 100 * tamanho;
    const porFicha = 50 * tamanho * n;
    let conta;
    if (sit.venceu) {
      conta = n > 1 ? `${n} palavras × ${fmt.format(porPalavra)}` : `${fmt.format(porPalavra)} da palavra`;
      conta += ` + ${plural(sit.restantes, "ficha", "fichas")} × ${fmt.format(porFicha)}`;
    } else if (n > 1) {
      const faltaram = respostas.filter((_, b) => sit.resolvidos[b] < 0).map((r) => letrasDe(r).join("").toUpperCase());
      conta = `decifrou ${sit.quantasResolvidas} de ${n} · ${faltaram.length === 1 ? "faltou" : "faltaram"} ${faltaram.join(", ")}`;
    } else {
      conta = `a palavra era ${letrasDe(respostas[0]).join("").toUpperCase()}`;
    }
    $("#res-conta").textContent = conta;
    const detalhes = [`${sit.gastas} de ${sit.total} fichas`];
    if (estado.dicas.length) detalhes.push(plural(estado.dicas.length, "dica", "dicas"));
    if (estado.inicio && estado.fim) {
      const s = Math.max(1, Math.round((estado.fim - estado.inicio) / 1000));
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
        if (ajustes.sons && agora - ultimoSom > 90 && p < 1) { Som.moeda(); ultimoSom = agora; }
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
    const proxInfo = prox && L.fase(prox);
    btn.textContent = !proxInfo ? "Ver histórico" : proxInfo.palavras > 1 ? `Próxima: bônus ${proxInfo.nome} ▸` : `Próxima: ${proxInfo.nome} ▸`;
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
    for (const f of L.FASES) {
      const r = h.fases[f.id] || { jogos: 0, vitorias: 0, melhor: null };
      const linha = el("div", "linha-fase");
      const barra = el("span", "medidor");
      const cheio = el("i");
      cheio.style.width = `${Math.round((r.jogos ? r.vitorias / r.jogos : 0) * 100)}%`;
      barra.appendChild(cheio);
      linha.append(
        el("strong", "", f.curto),
        el("span", "texto", r.jogos ? `limpou ${r.vitorias} de ${r.jogos}` : f.palavras > 1 ? `${f.nome}: ainda não jogou` : "ainda não jogou"),
        barra,
        el("span", "melhor", r.melhor != null ? `melhor: ${plural(r.melhor, "ficha", "fichas")}` : "")
      );
      lista.appendChild(linha);
    }
  }

  /* ---------- Compartilhar ---------- */

  function textoRodada() {
    const linhasTexto = L.FASES.map((f) => {
      const e = estadoDe(f.id);
      const gastas = e.palpites.length + e.dicas.length;
      const rotulo = f.curto.padStart(2, " ");
      if (!e.contabilizado) return `${rotulo} ${e.palpites.length ? "em jogo" : "—"}`;
      const dica = e.dicas.length ? " 💡" : "";
      if (e.venceu === false || !e.pontos) {
        return e.pontos ? `${rotulo} ✕ parcial +${fmt.format(e.pontos)}${dica}` : `${rotulo} ✕ fichas esgotadas`;
      }
      const barra = "▰".repeat(gastas) + "▱".repeat(f.fichas - gastas);
      return `${rotulo} ${barra} +${fmt.format(e.pontos)}${dica}`;
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

    window.addEventListener("hashchange", () => iniciar(faseInicial()));
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

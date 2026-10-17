// Peças compartilhadas pelos jogos novos (Conexões, Campo Minado, Cobrinha):
// armazenamento local, avisos, janelas, som ligado/desligado e compartilhar.
(function (raiz) {
  "use strict";

  const PREFIXO = "decifra";

  // localStorage pode faltar (aba anônima, bloqueio): os jogos funcionam mesmo assim
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
  const dois = (n) => String(n).padStart(2, "0");
  const semMovimento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Ajustes valem para todos os jogos (mesma chave do Decifra)
  const ajustes = Object.assign({ sons: true, contraste: false }, guardado.ler("ajustes", {}));
  const aplicarAjustes = () => {
    document.documentElement.classList.toggle("contraste", !!ajustes.contraste);
    if (raiz.Som) raiz.Som.ligar(ajustes.sons);
  };
  aplicarAjustes();
  const tocar = (nome, ...args) => { if (ajustes.sons && raiz.Som && raiz.Som[nome]) raiz.Som[nome](...args); };

  // Botão de som (alto-falante) presente no topo dos jogos novos
  function ligarBotaoSom(botao) {
    const desenhar = () => {
      botao.innerHTML = ajustes.sons
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
      botao.setAttribute("aria-label", ajustes.sons ? "Desligar sons" : "Ligar sons");
    };
    botao.addEventListener("click", () => {
      ajustes.sons = !ajustes.sons;
      guardado.gravar("ajustes", Object.assign(guardado.ler("ajustes", {}), { sons: ajustes.sons }));
      aplicarAjustes();
      desenhar();
      tocar("dica");
    });
    desenhar();
  }

  // Aviso flutuante (#aviso)
  let timerAviso;
  function avisar(msg, duracao = 1800) {
    const a = $("#aviso");
    if (!a) return;
    a.innerHTML = "";
    a.appendChild(el("span", "", msg));
    clearTimeout(timerAviso);
    if (duracao) timerAviso = setTimeout(() => { a.innerHTML = ""; }, duracao);
  }

  // Janelas: botão × e clique fora fecham
  function prepararJanelas() {
    document.querySelectorAll("dialog").forEach((d) => {
      const x = d.querySelector(".fechar");
      if (x) x.addEventListener("click", () => d.close());
      d.addEventListener("click", (e) => {
        const r = d.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
      });
    });
  }
  function abrir(seletor) {
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
    const d = $(seletor);
    if (d && !d.open) d.showModal();
  }

  async function compartilhar(texto) {
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
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
    avisar("resultado copiado!", 2000);
  }

  // Embaralhar com semente: o mesmo dia gera sempre a mesma ordem
  function sorteador(semente) {
    let s = semente >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // O modo offline vale para o site todo
  function registrarOffline(caminhoSw) {
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
      navigator.serviceWorker.register(caminhoSw).catch(() => {});
    }
  }

  raiz.Comum = {
    guardado, $, el, dois, semMovimento, ajustes, tocar, ligarBotaoSom, avisar,
    prepararJanelas, abrir, compartilhar, sorteador, registrarOffline,
  };
})(typeof self !== "undefined" ? self : this);

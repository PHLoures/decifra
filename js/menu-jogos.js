// Menu com todos os jogos da coleção, aberto pelo botão de controle (#btn-jogos) no topo.
(() => {
  "use strict";

  // Este arquivo fica em js/, então a raiz do site é a pasta acima dele
  const raiz = new URL("..", document.currentScript.src);
  const JOGOS = [
    {
      id: "decifra", nome: "Decifra", descricao: "Descubra a palavra do dia", caminho: "",
      icone: '<rect x="3" y="7" width="5" height="10" rx="1.5"/><rect x="9.5" y="7" width="5" height="10" rx="1.5"/><rect x="16" y="7" width="5" height="10" rx="1.5"/>',
    },
    {
      id: "conexoes", nome: "Conexões", descricao: "Separe 16 palavras em 4 grupos", caminho: "conexoes/",
      icone: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6h7M6 8.5v7M18 8.5v7M8.5 18h7"/>',
    },
    {
      id: "campo-minado", nome: "Campo Minado", descricao: "Abra o campo sem pisar nas minas", caminho: "campo-minado/",
      icone: '<circle cx="12" cy="13" r="6"/><path d="M12 3v3M12 20v1M4 13H3M21 13h-1M6.3 7.3l1.4 1.4M16.3 8.7l1.4-1.4"/><circle cx="10" cy="11" r="1.2"/>',
    },
    {
      id: "cobrinha", nome: "Cobrinha", descricao: "Coma as frutas e cresça sem bater", caminho: "cobrinha/",
      icone: '<path d="M4 17h9a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h8"/><circle cx="19" cy="5" r="1.6"/>',
    },
    {
      id: "tetris", nome: "Tetris", descricao: "Encaixe as peças e complete linhas", caminho: "tetris/",
      icone: '<rect x="3" y="13" width="6" height="6" rx="1"/><rect x="9" y="13" width="6" height="6" rx="1"/><rect x="15" y="13" width="6" height="6" rx="1"/><rect x="9" y="7" width="6" height="6" rx="1"/>',
    },
    {
      id: "memoria", nome: "Memória", descricao: "Vire as cartas e ache os pares", caminho: "memoria/",
      icone: '<rect x="3" y="6" width="9" height="13" rx="2"/><path d="M14.5 5.5l3.4.9a2 2 0 0 1 1.4 2.4l-2.4 9.1a2 2 0 0 1-2.4 1.4l-.5-.1"/><path d="M7.5 10.5l1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2-1.5-1.4 2-.3z"/>',
    },
    {
      id: "flappy", nome: "Flappy", descricao: "Voe entre os canos sem bater", caminho: "flappy/",
      icone: '<path d="M4 3v6M4 15v6M20 3v4M20 13v8"/><circle cx="11" cy="12" r="4"/><path d="M15 11.5l2.5.5-2.5 1M9 12.5c-1 1.5-2.5 1.5-3.5.5"/>',
    },
  ];
  const atual = document.body.dataset.jogo;

  const svg = (desenho) => `<svg viewBox="0 0 24 24" aria-hidden="true">${desenho}</svg>`;
  const dialogo = document.createElement("dialog");
  dialogo.id = "dlg-jogos";
  dialogo.className = "menu-jogos";
  dialogo.setAttribute("aria-labelledby", "jogos-titulo");
  dialogo.innerHTML = `
    <button class="fechar" aria-label="Fechar">×</button>
    <h2 id="jogos-titulo" tabindex="-1" autofocus>Jogos</h2>
    <div class="lista-jogos">
      ${JOGOS.map((j) => `
        <a class="cartao-jogo${j.id === atual ? " atual" : ""}" href="${new URL(j.caminho, raiz).href}"${j.id === atual ? ' aria-current="page"' : ""}>
          <span class="icone-jogo">${svg(j.icone)}</span>
          <span class="texto-jogo"><strong>${j.nome}</strong><small>${j.descricao}</small></span>
          <span class="seta-jogo" aria-hidden="true">${j.id === atual ? "jogando" : "›"}</span>
        </a>`).join("")}
    </div>`;
  document.body.appendChild(dialogo);

  dialogo.querySelector(".fechar").addEventListener("click", () => dialogo.close());
  dialogo.addEventListener("click", (e) => {
    const r = dialogo.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialogo.close();
  });
  dialogo.querySelector(".cartao-jogo.atual")?.addEventListener("click", (e) => {
    e.preventDefault();
    dialogo.close();
  });

  const botao = document.getElementById("btn-jogos");
  if (botao) {
    botao.innerHTML = svg('<path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><path d="M17.3 5H6.7a4 4 0 0 0-3.9 3.2l-1.3 6.5A2.6 2.6 0 0 0 4 18c.9 0 1.7-.4 2.2-1.1L8 15h8l1.8 1.9c.5.7 1.3 1.1 2.2 1.1a2.6 2.6 0 0 0 2.5-3.3l-1.3-6.5A4 4 0 0 0 17.3 5z"/>');
    botao.addEventListener("click", () => {
      document.querySelectorAll("dialog[open]").forEach((d) => d.close());
      dialogo.showModal();
    });
  }
})();

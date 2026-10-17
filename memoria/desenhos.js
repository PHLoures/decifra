// Desenhos das cartas da memória (SVG 48×48), um de cada cor para facilitar a memória visual.
(function (raiz) {
  "use strict";

  const brilho = 'fill="#fff" fill-opacity=".55"';
  const DESENHOS = {
    estrela: `<path fill="#f4b740" stroke="#f4b740" stroke-width="3" stroke-linejoin="round" d="M24 6l5.4 11.4 12.4 1.5-9.2 8.6 2.4 12.3L24 33.7l-11 6.1 2.4-12.3-9.2-8.6 12.4-1.5z"/>
      <path ${brilho} d="M24 12.5l-2.6 5.6c-.3.6-.9 1-1.6 1.1l-3.6.4c1.8.6 3.8.4 5.4-.8 1.6-1.3 2.4-3.6 2.4-6.3z"/>`,
    coracao: `<path fill="#ec6a73" d="M24 41.5S6.5 31 6.5 18.6A9.6 9.6 0 0 1 24 13.3a9.6 9.6 0 0 1 17.5 5.3C41.5 31 24 41.5 24 41.5z"/>
      <ellipse ${brilho} cx="15" cy="18" rx="3.4" ry="2.2" transform="rotate(-35 15 18)"/>`,
    lua: `<path fill="#7f8ae6" d="M30.5 6.5a18 18 0 1 0 11.6 28.7A15 15 0 0 1 30.5 6.5z"/>
      <circle fill="#fff" fill-opacity=".35" cx="17" cy="20" r="2.4"/><circle fill="#fff" fill-opacity=".35" cx="21" cy="32" r="3.2"/><circle fill="#fff" fill-opacity=".35" cx="13" cy="29" r="1.6"/>`,
    sol: `<g stroke="#f58f4a" stroke-width="3.6" stroke-linecap="round"><path d="M24 4.5v5M24 38.5v5M4.5 24h5M38.5 24h5M10.2 10.2l3.5 3.5M34.3 34.3l3.5 3.5M37.8 10.2l-3.5 3.5M13.7 34.3l-3.5 3.5"/></g>
      <circle fill="#f58f4a" cx="24" cy="24" r="10"/><circle ${brilho} cx="20.5" cy="20.5" r="3"/>`,
    folha: `<path fill="#4cbf7f" d="M9 39C9 20.5 21 8.5 40.5 8c0 19-11.5 31-31.5 31z"/>
      <path fill="none" stroke="#e8f8ee" stroke-width="2.6" stroke-linecap="round" d="M11 37L31.5 16.5M20 28h7.5M20 28v-7.5"/>`,
    peixe: `<path fill="#4fa6e6" d="M15 24L4.5 15v18z"/>
      <ellipse fill="#4fa6e6" cx="27" cy="24" rx="15" ry="10.5"/>
      <path fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2.4" stroke-linecap="round" d="M23 17.5c-2.5 4-2.5 9 0 13"/>
      <circle fill="#fff" cx="34.5" cy="21.5" r="3"/><circle fill="#28405a" cx="35.2" cy="21.5" r="1.5"/>`,
    flor: `<g fill="#ef7fb0"><circle cx="24" cy="13" r="7"/><circle cx="34.5" cy="20.6" r="7"/><circle cx="30.5" cy="33" r="7"/><circle cx="17.5" cy="33" r="7"/><circle cx="13.5" cy="20.6" r="7"/></g>
      <circle fill="#f6d061" cx="24" cy="24" r="6.4"/><circle ${brilho} cx="22" cy="22" r="2"/>`,
    nota: `<path fill="none" stroke="#9b7be6" stroke-width="3.6" stroke-linejoin="round" d="M18.5 34V12.5l18-4.5v22"/>
      <path fill="#9b7be6" d="M18.5 12.5l18-4.5v6l-18 4.5z"/>
      <ellipse fill="#9b7be6" cx="13" cy="34.5" rx="6.6" ry="5" transform="rotate(-20 13 34.5)"/>
      <ellipse fill="#9b7be6" cx="31" cy="30.5" rx="6.6" ry="5" transform="rotate(-20 31 30.5)"/>`,
    gota: `<path fill="#39b8c8" d="M24 5s-13.5 15.6-13.5 25a13.5 13.5 0 0 0 27 0C37.5 20.6 24 5 24 5z"/>
      <path fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.8" stroke-linecap="round" d="M17 30.5a7 7 0 0 0 6 6.5"/>`,
    raio: `<path fill="#e9c432" stroke="#e9c432" stroke-width="2.4" stroke-linejoin="round" d="M28 4.5L11 27.5h11.5L19 43.5 37 19.5H25.5z"/>
      <path ${brilho} d="M26 9l-9.5 13.5h3.8z"/>`,
    nuvem: `<path fill="#9fb3cc" d="M14 37.5a8.5 8.5 0 0 1-1-17 11.5 11.5 0 0 1 22-2.5 9.8 9.8 0 0 1 1.5 19.5z"/>
      <path ${brilho} d="M16 24a7 7 0 0 1 7-6.5c-4.6 1.4-6 3.3-7 6.5z"/>`,
    diamante: `<path fill="#5cc8d6" d="M14 9h20l9 10.5L24 41 5 19.5z"/>
      <path fill="#fff" fill-opacity=".35" d="M14 9l4.5 10.5h11L34 9zM5 19.5h13.5L24 41z"/>
      <path fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.6" stroke-linejoin="round" d="M5 19.5h38M18.5 19.5L24 41l5.5-21.5"/>`,
    coroa: `<path fill="#e8a93a" stroke="#e8a93a" stroke-width="2.4" stroke-linejoin="round" d="M7 16l9 8 8-13 8 13 9-8-4 21H11z"/>
      <rect fill="#d48f22" x="11" y="35" width="26" height="5" rx="2"/>
      <circle fill="#ec6a73" cx="24" cy="28" r="2.8"/><circle fill="#5cc8d6" cx="16" cy="30" r="2"/><circle fill="#5cc8d6" cx="32" cy="30" r="2"/>`,
    sino: `<path fill="#e97f5a" d="M24 7a3 3 0 0 1 3 3v.6c6 1.4 9.5 6.6 9.5 13v6.4l4 5H7.5l4-5v-6.4c0-6.4 3.5-11.6 9.5-13V10a3 3 0 0 1 3-3z"/>
      <circle fill="#e97f5a" cx="24" cy="39" r="4"/>
      <path fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.6" stroke-linecap="round" d="M17 27v-3.5c0-3 1.5-5.8 4-7"/>`,
    cogumelo: `<path fill="#f3e6cf" stroke="#d9c4a2" stroke-width="1.8" d="M18 27h12l2 11a3.5 3.5 0 0 1-3.5 4h-9A3.5 3.5 0 0 1 16 38z"/>
      <path fill="#e85d5d" d="M5.5 26C6 15.5 14 8 24 8s18 7.5 18.5 18c.1 1.6-1.2 2.5-2.6 2.5H8.1c-1.4 0-2.7-.9-2.6-2.5z"/>
      <g fill="#fff"><circle cx="16" cy="18" r="3.2"/><circle cx="28" cy="14" r="2.6"/><circle cx="33" cy="22" r="2.4"/><circle cx="23" cy="23" r="1.8"/></g>`,
    balao: `<path fill="none" stroke="#b9a7c9" stroke-width="2" stroke-linecap="round" d="M24 35.5c-2.5 3-1 5 1 7"/>
      <ellipse fill="#f06aa0" cx="24" cy="19" rx="12" ry="14"/>
      <path fill="#f06aa0" d="M21.5 32.2h5L28 36h-8z"/>
      <ellipse ${brilho} cx="18.5" cy="13" rx="3" ry="4.6" transform="rotate(25 18.5 13)"/>`,
    maca: `<path fill="none" stroke="#9a6a48" stroke-width="3" stroke-linecap="round" d="M24 15c0-3.5 1-6 3-8"/>
      <path fill="#5cc27e" d="M26.5 12.5c1-4.5 5-7 10-6.5-1 4.5-5 7-10 6.5z"/>
      <path fill="#e0524f" d="M24 15.5c-3-2-6.5-2.5-9.5-1.2C8 17 7 24.5 9.2 31 11.5 38 16 42 19.5 42c2 0 3-1 4.5-1s2.5 1 4.5 1C32 42 36.5 38 38.8 31 41 24.5 40 17 33.5 14.3c-3-1.3-6.5-.8-9.5 1.2z"/>
      <ellipse ${brilho} cx="15.5" cy="22" rx="2.6" ry="4.2" transform="rotate(20 15.5 22)"/>`,
    casa: `<path fill="#f3c98b" d="M11 22h26v19H11z"/>
      <path fill="#e07a5f" stroke="#e07a5f" stroke-width="2.6" stroke-linejoin="round" d="M6 24L24 8l18 16z"/>
      <rect fill="#8a5a44" x="20" y="29" width="8" height="12" rx="1.6"/>
      <rect fill="#8ccbf5" x="30" y="27" width="5" height="5" rx="1"/><rect fill="#8ccbf5" x="13" y="27" width="5" height="5" rx="1"/>`,
  };

  // Cor principal de cada desenho (para o brilho quando o par é encontrado)
  const COR = {
    estrela: "#f4b740", coracao: "#ec6a73", lua: "#7f8ae6", sol: "#f58f4a", folha: "#4cbf7f", peixe: "#4fa6e6",
    flor: "#ef7fb0", nota: "#9b7be6", gota: "#39b8c8", raio: "#e9c432", nuvem: "#9fb3cc", diamante: "#5cc8d6",
    coroa: "#e8a93a", sino: "#e97f5a", cogumelo: "#e85d5d", balao: "#f06aa0", maca: "#e0524f", casa: "#e07a5f",
  };

  const NOMES = {
    estrela: "estrela", coracao: "coração", lua: "lua", sol: "sol", folha: "folha", peixe: "peixe", flor: "flor",
    nota: "nota musical", gota: "gota", raio: "raio", nuvem: "nuvem", diamante: "diamante", coroa: "coroa",
    sino: "sino", cogumelo: "cogumelo", balao: "balão", maca: "maçã", casa: "casinha",
  };

  const svg = (nome) => `<svg viewBox="0 0 48 48" aria-hidden="true">${DESENHOS[nome]}</svg>`;

  raiz.DesenhosMemoria = { DESENHOS, COR, NOMES, svg };
})(typeof self !== "undefined" ? self : this);

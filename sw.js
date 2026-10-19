// Deixa o jogo funcionando sem internet. Ao mudar a lista de ARQUIVOS, aumente a VERSAO.
const VERSAO = "v35";
const CACHE = `decifra-${VERSAO}`;
const ARQUIVOS = [
  "./",
  "index.html",
  "css/estilo.css",
  "js/logica.js",
  "js/som.js",
  "js/app.js",
  "js/comum.js",
  "js/menu-jogos.js",
  "conexoes/",
  "conexoes/estilo.css",
  "conexoes/desafios.js",
  "conexoes/logica.js",
  "conexoes/app.js",
  "campo-minado/",
  "campo-minado/estilo.css",
  "campo-minado/logica.js",
  "campo-minado/app.js",
  "cobrinha/",
  "cobrinha/estilo.css",
  "cobrinha/logica.js",
  "cobrinha/frutas.js",
  "cobrinha/app.js",
  "tetris/",
  "tetris/estilo.css",
  "tetris/logica.js",
  "tetris/app.js",
  "memoria/",
  "memoria/estilo.css",
  "memoria/logica.js",
  "memoria/desenhos.js",
  "memoria/app.js",
  "flappy/",
  "flappy/estilo.css",
  "flappy/logica.js",
  "flappy/app.js",
  // As listas mais jogadas já ficam guardadas; as outras entram no cache na primeira vez
  "dados/4.txt",
  "dados/5.txt",
  "dados/6.txt",
  "manifest.webmanifest",
  "icone-d.svg",
  "icone-192.png",
  "icone-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k.startsWith("decifra-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Arquivos do jogo: tenta a rede (sempre a versão mais nova) e usa o cache sem internet.
// Fonte do Google: cache primeiro, porque não muda.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const fonte = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !fonte) return;

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      if (fonte) {
        const guardada = await cache.match(req);
        if (guardada) return guardada;
      }
      try {
        // "no-cache": sempre confere com o servidor se o arquivo mudou (o GitHub Pages
        // manda guardar por 10 min, e sem isso um recarregar comum mostraria a versão antiga)
        const resp = await fetch(req, fonte ? undefined : { cache: "no-cache" });
        if (resp.ok || resp.type === "opaque") cache.put(req, resp.clone());
        return resp;
      } catch (erro) {
        const guardada = await cache.match(req, { ignoreSearch: true });
        if (guardada) return guardada;
        throw erro;
      }
    })
  );
});

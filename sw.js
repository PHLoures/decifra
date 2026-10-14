// Deixa o jogo funcionando sem internet. Ao mudar a lista de ARQUIVOS, aumente a VERSAO.
const VERSAO = "v7";
const CACHE = `decifra-${VERSAO}`;
const ARQUIVOS = [
  "./",
  "index.html",
  "css/estilo.css",
  "js/logica.js",
  "js/som.js",
  "js/app.js",
  // As listas mais jogadas já ficam guardadas; as outras entram no cache na primeira vez
  "dados/4.txt",
  "dados/5.txt",
  "dados/6.txt",
  "manifest.webmanifest",
  "icone.svg",
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
        const resp = await fetch(req);
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

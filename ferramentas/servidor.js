// Servidor local para testar: node ferramentas/servidor.js [porta]
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.resolve(__dirname, "..");
const PORTA = Number(process.argv[2]) || 8765;
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};

http.createServer((req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let arquivo = path.join(RAIZ, caminho.endsWith("/") ? `${caminho}index.html` : caminho);
  if (!arquivo.startsWith(RAIZ)) return res.writeHead(403).end();
  fs.readFile(arquivo, (erro, dados) => {
    if (erro) return res.writeHead(404).end("não encontrado");
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(arquivo)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(dados);
  });
}).listen(PORTA, "127.0.0.1", () => console.log(`http://localhost:${PORTA}`));

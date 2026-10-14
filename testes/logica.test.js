// Rode com: node --test testes/logica.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const L = require("../js/logica.js");

// Listas de cada tamanho, como o jogo carrega
const DADOS = {};
for (const t of L.FASES) {
  const [respostas, validas] = fs.readFileSync(path.join(__dirname, "..", "dados", `${t}.txt`), "utf8").split("\n");
  DADOS[t] = { respostas: respostas.split(" ").map(L.semAcento), validas: new Set(validas.split(" ").map(L.semAcento)) };
}

const cores = (palpite, resposta) => L.avaliar(palpite, resposta).map((s) => ({ certa: "V", lugar: "A", errada: "-" })[s]).join("");
const nova = () => ({ palpites: [], dicas: [] });

test("avaliação em qualquer tamanho", () => {
  assert.equal(cores("ouvia", "assim"), "---VA");
  assert.equal(cores("mosca", "assim"), "A-V-A");
  assert.equal(cores("casa", "saca"), "AVAV");
  assert.equal(cores("caderno", "cadeira"), "VVVVA--");
  assert.equal(cores("estrelas", "estrelas"), "VVVVVVVV");
});

test("letras repetidas: verde tem prioridade e amarelo não passa da quantidade", () => {
  assert.equal(cores("sasss", "assim"), "AAV--");
  assert.equal(cores("aaaaa", "casal"), "-V-V-");
  assert.equal(cores("arara", "casal"), "A-A--");
});

test("acentos não contam", () => {
  assert.equal(L.semAcento("Ação"), "acao");
  assert.equal(L.semAcento("ÔNIBUS"), "onibus");
});

test("dia do jogo vira à meia-noite de Brasília", () => {
  assert.equal(L.diaDoJogo(new Date("2026-10-14T03:00:00Z")), 1);
  assert.equal(L.diaDoJogo(new Date("2026-10-15T02:59:59Z")), 1);
  assert.equal(L.diaDoJogo(new Date("2026-10-15T03:00:00Z")), 2);
  assert.equal(L.diaDoJogo(new Date("2025-01-01T12:00:00Z")), 1);
  assert.equal(L.msAteProximoDia(new Date("2026-10-15T02:59:00Z")), 60_000);
});

test("cada fase passa por toda a lista antes de repetir", () => {
  for (const t of L.FASES) {
    const r = DADOS[t].respostas;
    const vistas = new Set();
    for (let dia = 1; dia <= r.length; dia++) vistas.add(L.palavraDoDia(r, dia));
    assert.equal(vistas.size, r.length, `${t} letras`);
    assert.equal(L.palavraDoDia(r, r.length + 1), L.palavraDoDia(r, 1));
  }
});

test("listas de palavras", () => {
  const minimo = { 4: 300, 5: 1000, 6: 500, 7: 500, 8: 400, 9: 350, 10: 300 };
  for (const t of L.FASES) {
    const { respostas, validas } = DADOS[t];
    assert.ok(respostas.length >= minimo[t], `${t} letras: só ${respostas.length} respostas`);
    assert.equal(new Set(respostas).size, respostas.length, `${t} letras: resposta repetida`);
    for (const r of respostas) {
      assert.equal(r.length, t, `${r} não tem ${t} letras`);
      assert.match(r, /^[a-z]+$/, r);
      assert.ok(validas.has(r), `${r} não é aceita como palpite`);
    }
  }
  for (const p of ["casa", "gatos", "assim", "falou", "nacao", "cidade", "caderno", "estrelas", "computador"]) {
    assert.ok(DADOS[p.length]?.validas.has(p), p);
  }
  assert.ok(!DADOS[5].validas.has("aysim"));
  assert.ok(!DADOS[5].validas.has("carra"));
});

test("fichas, vitória e derrota", () => {
  const f = nova();
  assert.deepEqual(L.situacao(f, "assim"), { total: 6, gastas: 0, restantes: 6, venceu: false, fim: false });
  f.palpites.push("termo", "assim");
  assert.deepEqual(L.situacao(f, "assim"), { total: 6, gastas: 2, restantes: 4, venceu: true, fim: true });
  const d = { palpites: ["a", "b", "c", "d", "e"], dicas: [0] };
  assert.equal(L.situacao(d, "assim").fim, true);
  assert.equal(L.situacao(d, "assim").venceu, false);
  assert.equal(L.FICHAS[10], 8);
});

test("pontos", () => {
  assert.equal(L.pontos(5, 4, true), 500 + 1000);
  assert.equal(L.pontos(10, 0, true), 1000);
  assert.equal(L.pontos(7, 3, false), 0);
});

test("dica revela a primeira letra ainda desconhecida", () => {
  const f = nova();
  assert.equal(L.proximaDica(f, "assim"), 0);
  f.palpites.push("acaso"); // A verde na 1ª
  assert.equal(L.proximaDica(f, "assim"), 1);
  f.dicas.push(1);
  assert.equal(L.proximaDica(f, "assim"), 2);
  assert.deepEqual([...L.posicoesConhecidas(f, "assim")].sort(), [0, 1]);
  const tudo = { palpites: [], dicas: [0, 1, 2, 3] };
  assert.equal(L.proximaDica(tudo, "casa"), -1);
});

test("teclado: dica conta como letra certa e a melhor informação vence", () => {
  const f = { palpites: ["sasss"], dicas: [] };
  assert.equal(L.letrasConhecidas(f, "assim").s, "certa");
  assert.equal(L.letrasConhecidas(f, "assim").a, "lugar");
  f.dicas.push(4);
  assert.equal(L.letrasConhecidas(f, "assim").m, "certa");
  assert.equal(L.letrasConhecidas({ palpites: ["termo"], dicas: [] }, "assim").t, "errada");
});

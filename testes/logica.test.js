// Rode com: node --test testes/logica.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const L = require("../js/logica.js");

// Listas de cada tamanho, como o jogo carrega
const DADOS = {};
for (const t of L.TAMANHOS) {
  const [respostas, validas] = fs.readFileSync(path.join(__dirname, "..", "dados", `${t}.txt`), "utf8").split("\n");
  DADOS[t] = { respostas: respostas.split(" ").map(L.semAcento), validas: new Set(validas.split(" ").map(L.semAcento)) };
}

const cores = (palpite, resposta) => L.avaliar(palpite, resposta).map((s) => ({ certa: "V", lugar: "A", errada: "-" })[s]).join("");
const nova = () => ({ palpites: [], dicas: [] });

test("fases da rodada: três modos com 4 a 10 letras", () => {
  assert.equal(L.FASES.length, 21);
  assert.deepEqual(L.FASES.filter((f) => f.modo === "classico").map((f) => f.id), ["4", "5", "6", "7", "8", "9", "10"]);
  assert.deepEqual(L.TAMANHOS, [4, 5, 6, 7, 8, 9, 10]);
  assert.equal(L.fase("quarteto-10").palavras, 4);
  assert.equal(L.fase("quarteto-10").fichas, 11);
  assert.equal(L.fase("dueto-4").fichas, 7);
  assert.equal(L.fase(10).fichas, 8);
  // Endereços antigos continuam funcionando
  assert.equal(L.fase("dueto").id, "dueto-5");
  assert.equal(L.fase("quarteto").fichas, 9);
});

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

test("cada fase solo passa por toda a lista antes de repetir", () => {
  for (const t of L.TAMANHOS) {
    const r = DADOS[t].respostas;
    const vistas = new Set();
    for (let dia = 1; dia <= r.length; dia++) vistas.add(L.palavrasDoDia(r, dia)[0]);
    assert.equal(vistas.size, r.length, `${t} letras`);
  }
});

test("Dueto e Quarteto: palavras diferentes entre si e da fase solo no mesmo dia", () => {
  for (const t of L.TAMANHOS) {
  const r = DADOS[t].respostas;
  for (let dia = 1; dia <= 1500; dia++) {
    const solo = L.palavrasDoDia(r, dia, 1);
    const dueto = L.palavrasDoDia(r, dia, 2);
    const quarteto = L.palavrasDoDia(r, dia, 4);
    assert.equal(new Set([...solo, ...dueto, ...quarteto]).size, 7, `${t} letras, dia ${dia}`);
  }
  }
});

test("listas de palavras", () => {
  const minimo = { 4: 300, 5: 1000, 6: 500, 7: 500, 8: 400, 9: 350, 10: 300 };
  for (const t of L.TAMANHOS) {
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
  assert.equal(L.situacao(f, ["assim"], 6).restantes, 6);
  f.palpites.push("termo", "assim");
  const s = L.situacao(f, ["assim"], 6);
  assert.deepEqual([s.gastas, s.restantes, s.venceu, s.fim, s.quantasResolvidas], [2, 4, true, true, 1]);
  const d = { palpites: ["a", "b", "c", "d", "e"], dicas: [[0, 0]] };
  assert.deepEqual([L.situacao(d, ["assim"], 6).fim, L.situacao(d, ["assim"], 6).venceu], [true, false]);
});

test("vários tabuleiros: cada palavra resolve no seu palpite", () => {
  const f = { palpites: ["termo", "assim", "praia"], dicas: [] };
  const s = L.situacao(f, ["praia", "assim"], 7);
  assert.deepEqual(s.resolvidos, [2, 1]);
  assert.equal(s.venceu, true);
  const meio = L.situacao({ palpites: ["assim"], dicas: [] }, ["praia", "assim", "termo", "salto"], 9);
  assert.deepEqual([meio.quantasResolvidas, meio.venceu, meio.fim], [1, false, false]);
});

test("pontos", () => {
  assert.equal(L.pontos(5, 1, 1, 4), 500 + 1000);
  assert.equal(L.pontos(10, 1, 1, 0), 1000);
  assert.equal(L.pontos(7, 1, 0, 3), 0);
  // Dueto fechado com 2 fichas sobrando: 2 × 500 + 2 fichas × 250 × 2 palavras
  assert.equal(L.pontos(5, 2, 2, 2), 1000 + 1000);
  // Quarteto perdido com 3 de 4 palavras: só as palavras contam
  assert.equal(L.pontos(5, 4, 3, 0), 1500);
});

test("dica revela a primeira letra desconhecida do primeiro tabuleiro em aberto", () => {
  const f = nova();
  assert.deepEqual(L.proximaDica(f, ["assim"]), [0, 0]);
  f.palpites.push("acaso"); // A verde na 1ª
  assert.deepEqual(L.proximaDica(f, ["assim"]), [0, 1]);
  f.dicas.push([0, 1]);
  assert.deepEqual(L.proximaDica(f, ["assim"]), [0, 2]);
  // Tabuleiro 0 resolvido: a dica vai para o 1
  const m = { palpites: ["praia"], dicas: [] };
  assert.deepEqual(L.proximaDica(m, ["praia", "assim"]), [1, 0]);
  assert.equal(L.proximaDica({ palpites: [], dicas: [[0, 0], [0, 1], [0, 2], [0, 3]] }, ["casa"]), null);
});

test("teclado: dica conta como letra certa só no seu tabuleiro", () => {
  const f = { palpites: ["sasss"], dicas: [] };
  assert.equal(L.letrasConhecidas(f, "assim").s, "certa");
  assert.equal(L.letrasConhecidas(f, "assim").a, "lugar");
  f.dicas.push([0, 4]);
  assert.equal(L.letrasConhecidas(f, "assim", 0).m, "certa");
  assert.equal(L.letrasConhecidas(f, "assim", 1).m, undefined);
  // Depois de resolvido, os palpites seguintes não mudam o teclado daquele tabuleiro
  const r = { palpites: ["assim", "zebra"], dicas: [] };
  assert.equal(L.letrasConhecidas(r, "assim").z, undefined);
});

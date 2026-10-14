// Rode com: node --test testes/logica.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../js/logica.js");

global.window = {};
require("../js/palavras.js");
const RESPOSTAS = window.PALAVRAS.respostas.split(" ").map(L.semAcento);
const VALIDAS = new Set(window.PALAVRAS.validas.split(" ").map(L.semAcento));

const cores = (palpite, resposta) => L.avaliar(palpite, resposta).map((s) => ({ certa: "V", lugar: "A", errada: "-" })[s]).join("");

test("avaliação básica", () => {
  assert.equal(cores("termo", "termo"), "VVVVV");
  assert.equal(cores("ouvia", "assim"), "---VA");
  assert.equal(cores("mosca", "assim"), "A-V-A");
});

test("letras repetidas seguem a regra do Termo", () => {
  // Só um S amarelo quando a resposta tem um S fora do lugar
  assert.equal(cores("sasss", "assim"), "AAV--");
  // Verde tem prioridade sobre amarelo da mesma letra
  assert.equal(cores("aaaaa", "casal"), "-V-V-");
  assert.equal(cores("arara", "casal"), "A-A--");
});

test("acentos não contam", () => {
  assert.equal(L.semAcento("Ação"), "acao");
  assert.equal(L.semAcento("ÔNIBUS"), "onibus");
});

test("dia do jogo vira à meia-noite de Brasília", () => {
  assert.equal(L.diaDoJogo(new Date("2026-10-14T03:00:00Z")), 1); // 00:00 em Brasília
  assert.equal(L.diaDoJogo(new Date("2026-10-15T02:59:59Z")), 1); // 23:59 em Brasília
  assert.equal(L.diaDoJogo(new Date("2026-10-15T03:00:00Z")), 2);
  assert.equal(L.diaDoJogo(new Date("2025-01-01T12:00:00Z")), 1); // antes da estreia
  assert.equal(L.msAteProximoDia(new Date("2026-10-15T02:59:00Z")), 60_000);
});

test("palavras do dia: diferentes entre tabuleiros e determinísticas", () => {
  for (let dia = 1; dia <= 800; dia++) {
    for (const n of [1, 2, 4]) {
      const p = L.palavrasDoDia(RESPOSTAS, dia, n);
      assert.equal(p.length, n);
      assert.equal(new Set(p).size, n);
      assert.deepEqual(p, L.palavrasDoDia(RESPOSTAS, dia, n));
    }
  }
});

test("solo não repete palavra antes de passar por toda a lista", () => {
  const vistas = new Set();
  for (let dia = 1; dia <= RESPOSTAS.length; dia++) vistas.add(L.palavrasDoDia(RESPOSTAS, dia, 1)[0]);
  assert.equal(vistas.size, RESPOSTAS.length);
});

test("lista de palavras", () => {
  assert.ok(RESPOSTAS.length > 1000);
  assert.equal(new Set(RESPOSTAS).size, RESPOSTAS.length, "resposta repetida");
  for (const r of RESPOSTAS) {
    assert.match(r, /^[a-z]{5}$/, r);
    assert.ok(VALIDAS.has(r), `${r} não é aceita como palpite`);
  }
  for (const p of ["assim", "casas", "gatos", "falou", "ouvia", "unhas", "amore", "nacao"]) assert.ok(VALIDAS.has(p), p);
  for (const p of ["aysim", "xxxxx", "carra"]) assert.ok(!VALIDAS.has(p), p);
});

test("teclado de um tabuleiro para quando ele é resolvido", () => {
  const letras = L.letrasDoTabuleiro(["termo", "assim", "zebra"], "assim");
  assert.equal(letras.a, "certa");
  assert.equal(letras.t, "errada");
  assert.equal(letras.z, undefined);
  // A melhor informação vence: errada < lugar < certa
  assert.equal(L.letrasDoTabuleiro(["sasss", "assim"], "assim").s, "certa");
});

test("modo difícil", () => {
  const r = "assim";
  assert.equal(L.violaModoDificil("termo", [], r), null);
  // OUVIA: I verde na 4ª, A amarelo
  assert.equal(L.violaModoDificil("termo", ["ouvia"], r), "a 4ª letra deve ser I");
  assert.equal(L.violaModoDificil("mosio", ["ouvia"], r), "a palavra deve ter A");
  assert.equal(L.violaModoDificil("assim", ["ouvia"], r), null);
});

test("situação da partida", () => {
  const s = L.situacao(["termo", "assim"], ["assim", "termo"], 7);
  assert.deepEqual(s, { resolvidos: [1, 0], venceu: true, fim: true });
  const p = L.situacao(["termo"], ["assim", "termo"], 7);
  assert.equal(p.fim, false);
  const d = L.situacao(Array(6).fill("termo"), ["assim"], 6);
  assert.deepEqual(d, { resolvidos: [-1], venceu: false, fim: true });
});

// Rode com: node --test testes/
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../conexoes/logica.js");

global.window = {};
require("../conexoes/desafios.js");
const DESAFIOS = window.DESAFIOS;

test("desafios bem formados: 4 grupos de 4 e 16 palavras diferentes", () => {
  assert.ok(DESAFIOS.length >= 30);
  DESAFIOS.forEach((d, i) => {
    assert.equal(d.length, 4, `desafio ${i + 1}: deve ter 4 grupos`);
    const todas = [];
    for (const [nome, palavras] of d) {
      assert.ok(nome.trim().length > 2, `desafio ${i + 1}: grupo sem nome`);
      assert.equal(palavras.length, 4, `desafio ${i + 1}: "${nome}" deve ter 4 palavras`);
      for (const p of palavras) {
        assert.equal(p, p.toUpperCase(), `desafio ${i + 1}: "${p}" deve estar em maiúsculas`);
        todas.push(p);
      }
    }
    assert.equal(new Set(todas).size, 16, `desafio ${i + 1}: palavra repetida`);
  });
});

test("um desafio por dia, em ordem", () => {
  assert.equal(L.desafioDoDia(DESAFIOS, 1), DESAFIOS[0]);
  assert.equal(L.desafioDoDia(DESAFIOS, DESAFIOS.length + 1), DESAFIOS[0]);
});

test("conferir: acerto, quase e erro", () => {
  const d = DESAFIOS[0];
  assert.deepEqual(L.conferir(d, ["CAJU", "GOIABA", "PITANGA", "ACEROLA"]), { acerto: 0, quase: false });
  // MANGA é a pegadinha: parece fruta, mas é parte da camisa
  assert.deepEqual(L.conferir(d, ["CAJU", "GOIABA", "PITANGA", "MANGA"]), { acerto: null, quase: true });
  assert.deepEqual(L.conferir(d, ["CAJU", "GOIABA", "PIANO", "MANGA"]), { acerto: null, quase: false });
});

test("situação: erros, vitória e derrota", () => {
  const d = DESAFIOS[0];
  const grupos = d.map(([, p]) => p);
  const errada = ["CAJU", "GOIABA", "PITANGA", "MANGA"];
  let s = L.situacao(d, [errada, grupos[0]]);
  assert.deepEqual([s.erros, s.restantes, s.resolvidos, s.fim], [1, 3, [0], false]);
  s = L.situacao(d, grupos);
  assert.deepEqual([s.venceu, s.fim], [true, true]);
  const outras = [["CAJU", "GOLA", "PIANO", "REMO"], ["GOIABA", "PUNHO", "TECLADO", "FAROL"], ["PITANGA", "BOLSO", "SANFONA", "DOMINÓ"]];
  s = L.situacao(d, [errada, ...outras]);
  assert.deepEqual([s.erros, s.venceu, s.fim], [4, false, true]);
});

test("mesma seleção em outra ordem conta como repetida", () => {
  assert.ok(L.mesmaSelecao(["A", "B", "C", "D"], ["D", "C", "B", "A"]));
  assert.ok(!L.mesmaSelecao(["A", "B", "C", "D"], ["A", "B", "C", "E"]));
});

test("emoji de compartilhar segue a cor de cada palavra", () => {
  const d = DESAFIOS[0];
  assert.deepEqual(L.linhasEmoji(d, [["CAJU", "GOIABA", "PITANGA", "MANGA"]]), ["🟨🟨🟨🟩"]);
});

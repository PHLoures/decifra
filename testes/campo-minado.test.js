// Rode com: node --test testes/
const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../campo-minado/logica.js");

// Sorteio previsível para os testes
const semente = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

test("vizinhos nas bordas e no meio", () => {
  const c = M.criar(3, 3, 1);
  assert.deepEqual(M.vizinhos(c, 0).sort(), [1, 3, 4]);
  assert.equal(M.vizinhos(c, 4).length, 8);
});

test("primeiro toque nunca é mina e abre uma área", () => {
  for (let s = 1; s <= 200; s++) {
    const c = M.criar(8, 10, 10);
    const abertas = M.abrir(c, 37, semente(s));
    assert.equal(c.explodiu, null);
    assert.equal(c.celulas.filter((x) => x.mina).length, 10);
    assert.ok(!c.celulas[37].mina);
    assert.ok(M.vizinhos(c, 37).every((v) => !c.celulas[v].mina));
    assert.ok(abertas.length >= 1);
  }
});

test("números contam as minas vizinhas", () => {
  const c = M.criar(8, 10, 10);
  M.plantar(c, 0, semente(7));
  c.celulas.forEach((cel, i) => {
    assert.equal(cel.numero, M.vizinhos(c, i).filter((v) => c.celulas[v].mina).length);
  });
});

test("abrir mina explode; bandeira protege a casa", () => {
  const c = M.criar(4, 4, 3);
  M.plantar(c, 0, semente(3));
  const mina = c.celulas.findIndex((x) => x.mina);
  M.alternarBandeira(c, mina);
  assert.deepEqual(M.abrir(c, mina), []);
  M.alternarBandeira(c, mina);
  M.abrir(c, mina);
  assert.equal(c.explodiu, mina);
});

test("vitória quando todas as casas sem mina estão abertas", () => {
  const c = M.criar(5, 5, 4);
  M.plantar(c, 12, semente(11));
  c.celulas.forEach((cel, i) => { if (!cel.mina) M.abrir(c, i); });
  assert.ok(M.venceu(c));
});

test("acorde abre a vizinhança quando as bandeiras batem com o número", () => {
  const c = M.criar(6, 6, 5);
  M.plantar(c, 0, semente(5));
  const i = c.celulas.findIndex((cel) => !cel.mina && cel.numero > 0);
  c.celulas[i].aberta = true;
  M.vizinhos(c, i).forEach((v) => { if (c.celulas[v].mina) c.celulas[v].bandeira = true; });
  M.acorde(c, i);
  assert.equal(c.explodiu, null);
  assert.ok(M.vizinhos(c, i).every((v) => c.celulas[v].mina || c.celulas[v].aberta));
});

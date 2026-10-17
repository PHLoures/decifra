// Rode com: node --test testes/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../cobrinha/logica.js");

const naCobra = (e, c) => e.cobra.some((p) => p.x === c.x && p.y === c.y);

test("começa no meio, indo para a direita, com a fruta à frente", () => {
  for (const t of Object.values(S.TAMANHOS)) {
    const e = S.criar(t.cols, t.linhas);
    assert.equal(e.cobra.length, 4);
    assert.equal(e.dir, "direita");
    assert.equal(e.comidas[0].y, e.cobra[0].y);
    assert.ok(e.comidas[0].x > e.cobra[0].x, `${t.nome}: fruta deve estar à frente`);
    assert.ok(e.comidas[0].x < t.cols);
  }
});

test("quantidade de frutas no campo", () => {
  for (const n of S.QUANTIDADES) {
    const e = S.criar(17, 15, { frutas: n });
    assert.equal(e.comidas.length, n);
    assert.equal(new Set(e.comidas.map((c) => `${c.x},${c.y}`)).size, n);
    assert.ok(e.comidas.every((c) => !naCobra(e, c)));
  }
});

test("anda um passo e não deixa dar meia-volta", () => {
  const e = S.criar(15, 17);
  const x = e.cobra[0].x;
  S.passo(e);
  assert.equal(e.cobra[0].x, x + 1);
  assert.equal(S.virar(e, "esquerda"), false);
  assert.equal(S.virar(e, "cima"), true);
  assert.equal(S.virar(e, "baixo"), false);
  S.passo(e);
  assert.equal(e.dir, "cima");
});

test("comer faz crescer, pontuar e repõe a fruta", () => {
  const e = S.criar(15, 17, { frutas: 3 });
  const tamanho = e.cobra.length;
  e.comidas[0] = { x: e.cobra[0].x + 1, y: e.cobra[0].y };
  const r = S.passo(e, () => 0);
  assert.ok(r.comeu);
  assert.equal(e.pontos, 1);
  assert.equal(e.cobra.length, tamanho + 1);
  assert.equal(e.comidas.length, 3);
  assert.ok(e.comidas.every((c) => !naCobra(e, c)));
});

test("clássico: bater na parede termina o jogo", () => {
  const e = S.criar(6, 6);
  e.comidas = [{ x: 0, y: 0 }];
  let r = {};
  for (let i = 0; i < 10 && e.vivo; i++) r = S.passo(e);
  assert.ok(r.bateu);
});

test("sem bordas: atravessa para o outro lado", () => {
  const e = S.criar(6, 6, { modo: "sem-bordas" });
  e.comidas = [{ x: 0, y: 0 }];
  let atravessou = false;
  for (let i = 0; i < 4; i++) atravessou = S.passo(e).atravessou || atravessou;
  assert.ok(e.vivo);
  assert.ok(atravessou);
  assert.ok(e.cobra[0].x < 3);
});

test("muros: cada fruta comida cria um bloco longe da cabeça, e bater nele perde", () => {
  const e = S.criar(17, 15, { modo: "muros" });
  e.comidas = [{ x: e.cobra[0].x + 1, y: e.cobra[0].y }];
  const r = S.passo(e);
  assert.ok(r.comeu && r.muro);
  assert.equal(e.muros.length, 1);
  const d = Math.abs(r.muro.x - e.cobra[0].x) + Math.abs(r.muro.y - e.cobra[0].y);
  assert.ok(d >= 4);
  e.muros = [{ x: e.cobra[0].x + 1, y: e.cobra[0].y }];
  e.comidas = [{ x: 0, y: 0 }];
  assert.ok(S.passo(e).segurou);
  assert.ok(S.passo(e).bateu);
});

test("bater no próprio corpo termina, mas encostar no rabo que está saindo não", () => {
  const e = S.criar(10, 10);
  e.comidas = [{ x: 9, y: 9 }];
  e.cobra = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 4, y: 4 }, { x: 5, y: 4 }];
  e.dir = "cima";
  assert.ok(!S.passo(e).bateu);
  const f = S.criar(10, 10);
  f.comidas = [{ x: 9, y: 9 }];
  f.cobra = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }];
  f.dir = "cima";
  assert.ok(S.passo(f).segurou);
  assert.ok(S.passo(f).bateu);
});

test("carência: antes de bater a cobra segura um passo, e virar a tempo salva", () => {
  const e = S.criar(6, 6);
  e.comidas = [{ x: 0, y: 5 }];
  e.cobra = [{ x: 5, y: 2 }, { x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }];
  e.dir = "direita";
  const cabeca = { ...e.cobra[0] };
  assert.ok(S.passo(e).segurou);
  assert.deepEqual(e.cobra[0], cabeca);
  assert.ok(e.vivo);
  S.virar(e, "baixo");
  const r = S.passo(e);
  assert.ok(!r.bateu && e.vivo);
  assert.deepEqual(e.cobra[0], { x: 5, y: 3 });
});

test("fruta nunca nasce em cima da cobra nem de um muro", () => {
  const e = S.criar(5, 5);
  e.muros = [{ x: 0, y: 0 }, { x: 4, y: 4 }];
  e.comidas = [];
  for (let i = 0; i < 200; i++) {
    const c = S.sortearLivre(e);
    assert.ok(!naCobra(e, c));
    assert.ok(!e.muros.some((m) => m.x === c.x && m.y === c.y));
  }
});

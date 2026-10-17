// Rode com: node --test testes/
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../cobrinha/logica.js");

test("começa no meio, indo para a direita, com a comida à frente", () => {
  const e = S.criar(15, 17);
  assert.equal(e.cobra.length, 4);
  assert.equal(e.dir, "direita");
  assert.equal(e.comida.y, e.cobra[0].y);
  assert.ok(e.comida.x > e.cobra[0].x);
});

test("anda um passo e não deixa dar meia-volta", () => {
  const e = S.criar(15, 17);
  const x = e.cobra[0].x;
  S.passo(e);
  assert.equal(e.cobra[0].x, x + 1);
  assert.equal(S.virar(e, "esquerda"), false);
  assert.equal(S.virar(e, "cima"), true);
  // Depois de "cima", "baixo" seria meia-volta
  assert.equal(S.virar(e, "baixo"), false);
  S.passo(e);
  assert.equal(e.dir, "cima");
});

test("comer faz crescer e pontuar", () => {
  const e = S.criar(15, 17);
  const tamanho = e.cobra.length;
  e.comida = { x: e.cobra[0].x + 1, y: e.cobra[0].y };
  const r = S.passo(e, () => 0);
  assert.ok(r.comeu);
  assert.equal(e.pontos, 1);
  assert.equal(e.cobra.length, tamanho + 1);
  assert.ok(!e.cobra.some((p) => p.x === e.comida.x && p.y === e.comida.y));
});

test("bater na parede termina o jogo", () => {
  const e = S.criar(6, 6);
  e.comida = { x: 0, y: 0 };
  let r = {};
  for (let i = 0; i < 10 && e.vivo; i++) r = S.passo(e);
  assert.ok(r.bateu);
  assert.equal(e.vivo, false);
});

test("bater no próprio corpo termina, mas encostar no rabo que está saindo não", () => {
  const e = S.criar(10, 10);
  e.comida = { x: 9, y: 9 };
  // Cobra de 4 fazendo um quadrado: a cabeça entra onde o rabo acabou de sair
  e.cobra = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 4, y: 4 }, { x: 5, y: 4 }];
  e.dir = "cima";
  assert.ok(!S.passo(e).bateu);
  // Agora com um corpo maior, voltar para dentro dele bate
  const f = S.criar(10, 10);
  f.comida = { x: 9, y: 9 };
  f.cobra = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }];
  f.dir = "cima";
  assert.ok(S.passo(f).bateu);
});

test("comida nunca nasce em cima da cobra", () => {
  const e = S.criar(5, 5);
  for (let i = 0; i < 200; i++) {
    const c = S.sortearComida(e);
    assert.ok(!e.cobra.some((p) => p.x === c.x && p.y === c.y));
  }
});

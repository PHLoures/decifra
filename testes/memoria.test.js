// Rode com: node --test testes/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../memoria/logica.js");

const semente = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
// Posições das duas cartas de cada desenho
const posicoes = (e) => {
  const p = {};
  e.cartas.forEach((c, i) => (p[c.simbolo] = p[c.simbolo] || []).push(i));
  return p;
};

test("cada nível cabe certinho na mesa e tem desenhos suficientes", () => {
  for (const [k, n] of Object.entries(M.NIVEIS)) {
    assert.equal(n.cols * n.linhas, n.pares * 2, k);
    assert.ok(n.pares <= M.SIMBOLOS.length, k);
  }
  assert.equal(new Set(M.SIMBOLOS).size, M.SIMBOLOS.length);
});

test("a mesa tem exatamente dois de cada desenho", () => {
  const e = M.criar({ pares: 8, aleatorio: semente(1) });
  assert.equal(e.cartas.length, 16);
  for (const lista of Object.values(posicoes(e))) assert.equal(lista.length, 2);
});

test("acertar o par deixa as duas abertas e conta a jogada", () => {
  const e = M.criar({ pares: 6, aleatorio: semente(2) });
  const [a, b] = Object.values(posicoes(e))[0];
  assert.equal(M.virar(e, a), "primeira");
  assert.equal(M.virar(e, a), "ignorado"); // a mesma carta não conta duas vezes
  assert.equal(M.virar(e, b), "par");
  assert.ok(e.cartas[a].achada && e.cartas[b].achada);
  assert.equal(e.jogadas, 1);
  assert.equal(e.achados, 1);
  assert.equal(M.virar(e, b), "ignorado");
});

test("errar: as duas ficam abertas até esconder ou virar outra", () => {
  const e = M.criar({ pares: 6, aleatorio: semente(3) });
  const p = Object.values(posicoes(e));
  const [x] = p[0];
  const [y] = p[1];
  const [z] = p[2];
  M.virar(e, x);
  assert.equal(M.virar(e, y), "errou");
  assert.ok(e.cartas[x].aberta && e.cartas[y].aberta);
  assert.equal(e.erros, 1);
  // Terceira carta: o par errado se esconde na hora
  assert.equal(M.virar(e, z), "primeira");
  assert.ok(!e.cartas[x].aberta && !e.cartas[y].aberta);
  assert.deepEqual(e.viradas, [z]);
  M.esconder(e);
  assert.deepEqual(e.viradas, [z]); // com uma só virada, esconder não faz nada
});

test("vence ao achar todos os pares, e a sequência é contada", () => {
  const e = M.criar({ pares: 12, aleatorio: semente(4) });
  const p = Object.values(posicoes(e));
  // Erra uma vez no começo, depois acerta tudo
  M.virar(e, p[0][0]);
  M.virar(e, p[1][0]);
  M.esconder(e);
  for (const [a, b] of p) {
    assert.ok(!M.venceu(e));
    M.virar(e, a);
    M.virar(e, b);
  }
  assert.ok(M.venceu(e));
  assert.equal(e.jogadas, 13);
  assert.equal(e.melhorSequencia, 12);
  assert.equal(M.virar(e, 0), "ignorado");
});

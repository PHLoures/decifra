// Rode com: node --test testes/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../tetris/logica.js");

const semente = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const vazia = () => Array.from({ length: T.LINHAS }, () => Array(T.COLS).fill(null));

test("todas as peças têm 4 quadradinhos em cada rotação", () => {
  for (const t of T.TIPOS) {
    for (const r of T.ROTACOES[t]) assert.equal(r.length, 4, t);
  }
});

test("sacola de 7: cada peça aparece uma vez a cada 7", () => {
  const e = T.criar({ aleatorio: semente(3) });
  const vistas = [e.atual.tipo, ...T.proximas(e, 6)];
  assert.equal(new Set(vistas).size, 7);
});

test("peça nasce no topo, no meio, e anda até a parede", () => {
  const e = T.criar({ aleatorio: semente(1) });
  assert.equal(e.atual.x, 3);
  let passos = 0;
  while (T.mover(e, -1)) passos++;
  assert.ok(passos >= 2);
  assert.equal(T.mover(e, -1), false);
  assert.ok(T.celulasDe(e.atual).some(([x]) => x === 0));
});

test("girar encostado na parede usa o ajuste e não atravessa", () => {
  const e = T.criar({ aleatorio: semente(1) });
  e.atual = { tipo: "T", rot: 1, x: -1, y: 5 }; // em pé, colado na parede esquerda
  assert.ok(!T.colide(e, e.atual));
  assert.ok(T.girar(e, 1));
  assert.ok(T.celulasDe(e.atual).every(([x]) => x >= 0 && x < T.COLS));
});

test("queda direta pontua 2 por linha e a peça para no fundo", () => {
  const e = T.criar({ aleatorio: semente(1) });
  e.atual = { tipo: "O", rot: 0, x: 3, y: 0 };
  const n = T.soltar(e);
  assert.equal(e.pontos, 2 * n);
  assert.ok(T.noChao(e));
  assert.ok(T.celulasDe(e.atual).some(([, y]) => y === T.LINHAS - 1));
});

test("fantasma mostra onde a peça vai cair", () => {
  const e = T.criar({ aleatorio: semente(1) });
  const f = T.fantasma(e);
  T.soltar(e);
  assert.deepEqual(T.celulasDe(f), T.celulasDe(e.atual));
});

test("completar linhas: remove, pontua pelo nível e conta linhas", () => {
  const e = T.criar({ aleatorio: semente(2) });
  e.grade = vazia();
  // Duas linhas do fundo cheias, menos as colunas 4 e 5
  for (const y of [T.LINHAS - 1, T.LINHAS - 2]) for (let x = 0; x < T.COLS; x++) if (x !== 4 && x !== 5) e.grade[y][x] = "L";
  e.atual = { tipo: "O", rot: 0, x: 3, y: 0 }; // O ocupa as colunas 4 e 5
  T.soltar(e);
  const antes = e.pontos;
  const cheias = T.travar(e);
  assert.equal(cheias.length, 2);
  T.concluir(e, cheias);
  assert.equal(e.linhas, 2);
  assert.equal(e.pontos - antes, 300 * 1);
  assert.ok(e.grade[T.LINHAS - 1].every((c) => c === null));
});

test("nível sobe a cada 10 linhas e a queda fica mais rápida", () => {
  const e = T.criar({ dificuldade: "medio", aleatorio: semente(4) });
  assert.equal(e.nivel, 5);
  e.linhas = 9;
  e.grade = vazia();
  for (let x = 0; x < T.COLS; x++) e.grade[T.LINHAS - 1][x] = "I";
  const r = T.concluir(e, [T.LINHAS - 1]);
  assert.ok(r.subiuDeNivel);
  assert.equal(e.nivel, 6);
  assert.ok(T.intervaloQueda(15) < T.intervaloQueda(5));
  assert.ok(T.intervaloQueda(1) === 1000);
});

test("guardar: troca a peça, uma vez só até a próxima travar", () => {
  const e = T.criar({ aleatorio: semente(5) });
  const primeira = e.atual.tipo;
  assert.ok(T.guardar(e));
  assert.equal(e.guardada, primeira);
  assert.equal(T.guardar(e), false);
  const segunda = e.atual.tipo;
  T.soltar(e);
  T.concluir(e, T.travar(e));
  assert.ok(T.guardar(e));
  assert.equal(e.atual.tipo, primeira);
  assert.notEqual(e.guardada, undefined);
  assert.ok(segunda);
});

test("fim de jogo quando a peça nova não cabe", () => {
  const e = T.criar({ aleatorio: semente(6) });
  for (let y = 0; y < T.LINHAS; y++) for (let x = 0; x < T.COLS; x++) if (x !== 0) e.grade[y][x] = "Z";
  T.soltar(e);
  T.concluir(e, T.travar(e));
  assert.ok(e.fim);
});

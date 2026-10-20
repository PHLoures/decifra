// Rode com: node --test testes/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../flappy/logica.js");

const semente = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

test("antes do primeiro toque o passarinho só flutua", () => {
  const e = F.criar({ aleatorio: semente(1) });
  for (let i = 0; i < 300; i++) F.passo(e);
  assert.ok(!e.fim);
  assert.equal(e.canos.length, 0);
});

test("sem pular, cai e bate no chão", () => {
  const e = F.criar({ aleatorio: semente(2) });
  F.pular(e);
  let bateu = false;
  for (let i = 0; i < 200 && !bateu; i++) bateu = F.passo(e).bateu;
  assert.ok(bateu && e.fim);
  assert.equal(e.passaro.y + F.RAIO, F.CHAO);
  assert.equal(F.pular(e), false);
});

test("o teto segura mas não mata", () => {
  const e = F.criar({ aleatorio: semente(3) });
  e.canos = [];
  F.pular(e);
  e.canos = [];
  for (let i = 0; i < 20; i++) { F.pular(e); F.passo(e); e.canos = []; }
  assert.ok(!e.fim);
  assert.ok(e.passaro.y >= F.RAIO);
});

test("passar pelo vão vale ponto; encostar no cano termina", () => {
  const e = F.criar({ aleatorio: semente(4) });
  F.pular(e);
  // Piloto automático: pula quando está abaixo do meio do próximo vão
  let pontos = 0;
  for (let i = 0; i < 3000 && !e.fim; i++) {
    const alvo = e.canos.find((c) => c.x + F.CANO_L > e.passaro.x - F.RAIO);
    if (alvo && e.passaro.y > alvo.meio + 10 && e.passaro.vy > 0) F.pular(e);
    if (F.passo(e).ponto) pontos++;
  }
  assert.ok(!e.fim, "o piloto deveria sobreviver no fácil");
  assert.ok(pontos >= 10);
  assert.equal(pontos, e.pontos);
  // Agora encosta no cano
  const c = e.canos.find((k) => k.x > e.passaro.x);
  e.passaro.x = c.x + 5;
  e.passaro.y = c.meio - e.cfg.vao / 2 - 4;
  assert.ok(F.colideCano(e, c));
});

test("tela larga: canos nascem na borda direita e o passarinho fica perto da esquerda", () => {
  const e = F.criar({ aleatorio: semente(5), largura: 800 });
  assert.ok(e.passaro.x > F.PASSARO_X && e.passaro.x <= 210);
  F.pular(e);
  assert.equal(e.canos[0].x, 840);
  for (let i = 0; i < 400; i++) { if (e.passaro.vy > 0 && e.passaro.y > 200) F.pular(e); F.passo(e); }
  assert.ok(e.canos.length >= 4, "cabem vários canos numa tela larga");
  F.redimensionar(e, 300);
  const ultimo = e.canos[e.canos.length - 1].x;
  assert.ok(ultimo > 300 - e.cfg.dist);
});

test("tela comprida: o céu continua para cima e o teto sobe junto", () => {
  const e = F.criar({ aleatorio: semente(6), teto: -100 });
  F.pular(e);
  for (let i = 0; i < 80; i++) { F.pular(e); F.passo(e); e.canos = []; }
  assert.ok(!e.fim);
  assert.equal(e.passaro.y, -100 + F.RAIO);
});

test("o cenário acelera com o tempo, avisa a cada 10% e para em 60% a mais", () => {
  const e = F.criar({ aleatorio: semente(7) });
  F.pular(e);
  let avisos = 0;
  const vel = [];
  for (let i = 1; i <= 60 * 90; i++) {
    e.canos = [];
    if (e.passaro.vy > 0 && e.passaro.y > 220) F.pular(e);
    if (F.passo(e).acelerou) avisos++;
    if (i % 600 === 0) vel.push(e.vel);
  }
  assert.ok(!e.fim);
  for (let i = 1; i < vel.length; i++) assert.ok(vel[i] >= vel[i - 1]);
  assert.ok(Math.abs(vel[0] / e.cfg.vel - 1.1) < 0.01, "depois de 10 s, 10% mais rápido");
  assert.ok(Math.abs(e.vel / e.cfg.vel - 1.6) < 1e-9, "não passa de 60% a mais");
  assert.equal(avisos, 6);
});

test("medalhas", () => {
  assert.equal(F.medalha(9), null);
  assert.equal(F.medalha(10), "bronze");
  assert.equal(F.medalha(25), "prata");
  assert.equal(F.medalha(40), "ouro");
  assert.equal(F.medalha(100), "platina");
});

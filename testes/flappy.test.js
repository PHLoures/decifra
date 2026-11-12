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

// Busca exata: existe alguma sequência de toques que vença "alvo" canos?
// (todos os ramos têm os mesmos canos, então basta guardar um ramo por posição do passarinho)
function existeCaminho(nivel, s, alvo) {
  const sorteios = [];
  const r = semente(s);
  for (let i = 0; i < 400; i++) sorteios.push(r());
  const comSorte = (e) => { e.aleatorio = () => sorteios[(e.n = (e.n || 0) + 1) - 1]; return e; };
  const clonar = (e) => comSorte({ ...e, passaro: { ...e.passaro }, canos: e.canos.map((c) => ({ ...c })) });
  const e0 = comSorte(F.criar({ nivel }));
  F.pular(e0);
  let fronteira = [e0];
  for (let t = 0; t < 60 * 60 && fronteira.length; t++) {
    const prox = new Map();
    for (const e of fronteira) for (const pula of [false, true]) {
      const n = clonar(e);
      if (pula) F.pular(n);
      F.passo(n);
      if (n.fim) continue;
      if (n.pontos >= alvo) return true;
      const chave = `${Math.round(n.passaro.y * 2)},${Math.round(n.passaro.vy * 4)}`;
      if (!prox.has(chave)) prox.set(chave, n);
    }
    fronteira = [...prox.values()];
  }
  return false;
}

test("Insano é mais difícil que o Impossível, mas sempre tem caminho", () => {
  const imp = F.NIVEIS.impossivel;
  const ins = F.NIVEIS.insano;
  assert.ok(ins.vao < imp.vao && ins.vel > imp.vel && ins.dist < imp.dist);
  assert.ok(ins.sobeDesce.amp > imp.sobeDesce.amp && ins.sobeDesce.ritmo < imp.sobeDesce.ritmo);
  for (const s of [11, 22, 33]) assert.ok(existeCaminho("insano", s, 15), `partida ${s} sem saída`);
});

test("Insano: o vão de um cano nunca fica longe demais do anterior", () => {
  const e = F.criar({ nivel: "insano", aleatorio: semente(9) });
  F.pular(e);
  const vistos = [];
  for (let i = 0; i < 60 * 40; i++) {
    e.passaro.y = 200; e.passaro.vy = 0; // fica fora do caminho, só para ver os canos
    F.passo(e);
    e.fim = false;
    for (const c of e.canos) if (!vistos.includes(c)) vistos.push(c);
  }
  for (let i = 1; i < vistos.length; i++) assert.ok(Math.abs(vistos[i].base - vistos[i - 1].base) <= F.NIVEIS.insano.salto + 1e-9);
});

test("medalhas", () => {
  assert.equal(F.medalha(9), null);
  assert.equal(F.medalha(10), "bronze");
  assert.equal(F.medalha(25), "prata");
  assert.equal(F.medalha(40), "ouro");
  assert.equal(F.medalha(100), "platina");
});

test("bichinhos: todos desenham sem erro, vivos e depois da batida", () => {
  global.self = global;
  require("../flappy/bichos.js");
  const B = global.BichosFlappy;
  assert.ok(B.LISTA.length >= 12);
  assert.equal(new Set(B.LISTA.map((b) => b.id)).size, B.LISTA.length);
  const g = new Proxy({}, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => ((o[k] = v), true) });
  for (const b of B.LISTA) for (const morto of [false, true]) B.desenhar(g, b.id, 0.5, morto);
  assert.ok(B.existe("dragao") && !B.existe("unicornio"));
});

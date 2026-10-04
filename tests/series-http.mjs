import assert from "node:assert/strict";
import { PUZZLES } from "../lib/puzzles.ts";
const origin = process.env.GAME_TEST_URL ?? "http://localhost:5173";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function post(op, args = {}, session) {
  const r = await fetch(origin + "/api/game", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op, id: crypto.randomUUID(), ...session, ...args }),
  });
  const data = await r.json();
  return { status: r.status, ...data };
}
const h = await post("create", {
  name: "Series Host",
  mode: "race",
  fillBots: false,
  bestOfThree: true,
  freshPuzzles: false,
});
assert.equal(h.status, 200, h.error);
const b = await post("join", { code: h.session.code, name: "Series Guest" });
async function state(p) {
  const d = await post("state", {}, p.session);
  assert.equal(d.status, 200, d.error);
  return d.game;
}
const key = (g) => `${g.run}:${g.phase}:${g.roomIndex}:${g.punishment}`;
for (let round = 1; round <= 2; round++) {
  await Promise.all(
    [h, b].map((p) => post("ready", { ready: true }, p.session)),
  );
  const start = await post("start", {}, h.session);
  assert.equal(start.status, 200, start.error);
  assert.equal(start.game.series.round, round);
  for (let room = 0; room < 5; room++) {
    for (const q of PUZZLES.junior[room]) {
      await pause(850);
      for (const p of [h, b]) {
        const view = await state(p);
        const d = await post(
          "answer",
          { puzzleId: q.id, answer: String(q.answer), phaseKey: key(view) },
          p.session,
        );
        assert.equal(d.status, 200, d.error);
      }
    }
    if (room < 4) await pause(3100);
  }
  const done = await state(h);
  assert.equal(done.matchComplete, true);
  assert.equal(
    done.series.standings.find((p) => p.playerId === h.session.playerId).wins,
    round,
  );
  assert.equal(done.accuracy, 1);
  assert.equal(done.bestStreak, 15);
  const frozen = done.elapsedSeconds;
  await pause(50);
  assert.equal((await state(h)).elapsedSeconds, frozen);
  if (round === 1) {
    const voted = await post(
      "rematch",
      { ready: true, phaseKey: key(done) },
      h.session,
    );
    assert.equal(voted.game.phase, "won");
    const guest = await state(b);
    const both = await post(
      "rematch",
      { ready: true, phaseKey: key(guest) },
      b.session,
    );
    assert.equal(both.game.phase, "lobby");
    assert.equal(both.game.series.round, 2);
    assert.ok(both.game.players.every((p) => !p.ready));
    const blocked = await post(
      "settings",
      { gameDifficulty: "hard" },
      h.session,
    );
    assert.equal(blocked.status, 400);
    console.log(
      "PASS: first series round, recap, rematch consensus, retained wins, and renewed readiness.",
    );
  } else {
    assert.equal(done.series.complete, true);
    assert.equal(done.series.championId, h.session.playerId);
    assert.equal(done.series.rounds.length, 2);
    const newSeries = await post("restart", {}, h.session);
    assert.equal(newSeries.game.series, null);
  }
}
await Promise.all([h, b].map((p) => post("leave", {}, p.session)));
console.log(
  "PASS: complete HTTP best-of-three lifecycle; first to two wins, no duplicate awards, and retained player sessions.",
);

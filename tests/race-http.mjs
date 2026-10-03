import assert from "node:assert/strict";
const url = process.env.GAME_TEST_URL || "http://localhost:5173";
async function post(a, status = 200) {
  const r = await fetch(url + "/api/game", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: crypto.randomUUID(), ...a }),
  });
  const d = await r.json();
  assert.equal(r.status, status, JSON.stringify(d));
  return d;
}
const h = await post({ op: "create", name: "Host", freshPuzzles:false });
assert.equal(h.game.mode, "race");
assert.equal(h.game.gameDifficulty, "medium");
assert.equal(h.game.botSkill, "medium");
assert.equal(h.game.fillBots, true);
assert.equal(h.game.players.length, 8);
const b = await post({ op: "join", code: h.session.code, name: "Guest" });
assert.equal(b.game.players.filter((p) => p.kind === "bot").length, 6);
assert.equal(b.game.players.filter((p) => p.kind === "human").length, 2);
await post({ op: "start", ...h.session }, 400);
await post({ op: "settings", ...b.session, gameDifficulty: "hard" }, 403);
await post({ op: "settings", ...h.session, gameDifficulty: "nightmare" }, 400);
await post({ op: "ready", ...h.session, ready: true });
await post({ op: "ready", ...b.session, ready: true });
const start = await post({ op: "start", ...h.session });
const key = (g) => `${g.run}:${g.phase}:${g.roomIndex}:${g.punishment}`;
await post({ op: "join", code: h.session.code, name: "Late" }, 409);
const actions = [h, b].map((p) => ({
  op: "answer",
  ...p.session,
  phaseKey: key(start.game),
  puzzleId: "j0a",
  answer: "26",
  id: crypto.randomUUID(),
}));
const results = await Promise.all(actions.map((a) => post(a)));
assert.ok(results.every((r) => r.game.score === 100));
await post(actions[0]);
const again = await post({ op: "state", ...h.session });
assert.equal(again.game.score, 100);
await post({
  op: "hint",
  ...h.session,
  phaseKey: key(again.game),
  puzzleId: "j0b",
});
const guest = await post({ op: "state", ...b.session });
assert.equal(guest.game.puzzles[1].hint, null);
assert.equal(guest.game.hintCount, 0);
for (const p of [h, b]) {
  const view = await post({ op: "state", ...p.session });
  const raw = JSON.stringify(view.game);
  for (const token of [h.session.token, b.session.token])
    assert.ok(!raw.includes(token));
  for (const k of [
    '"token"',
    '"rng"',
    "nextAttemptAt",
    '"answer"',
    '"progress"',
  ])
    assert.ok(!raw.includes(k));
  assert.ok(view.game.leaderboard.length === 8);
}
await post({ op: "settings", ...h.session, mode: "coop" }, 400);
await post({ op: "leave", ...h.session });
const migrated = await post({ op: "state", ...b.session });
assert.equal(migrated.game.hostId, b.session.playerId);
assert.equal(
  migrated.game.leaderboard.find((p) => p.playerId === h.session.playerId)
    .phase,
  "left",
);
const eight = await post({ op: "create", name: "Human0" });
const people = [eight];
for (let i = 1; i < 8; i++)
  people.push(
    await post({ op: "join", code: eight.session.code, name: "Human" + i }),
  );
assert.equal(people[7].game.players.filter((p) => p.kind === "bot").length, 0);
await post({ op: "join", code: eight.session.code, name: "Ninth" }, 409);
await Promise.all(
  people.map((p) => post({ op: "ready", ...p.session, ready: true })),
);
const eightStart = await post({ op: "start", ...eight.session });
assert.equal(eightStart.game.players.length, 8);
assert.equal(eightStart.game.leaderboard.length, 8);
console.log(
  "PASS: Race defaults, two humans + six bots, eight humans, bot replacement, settings permissions, simultaneous independent scoring, idempotency, private snapshots, and host migration.",
);

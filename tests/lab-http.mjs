import assert from "node:assert/strict";
import { waitForLab } from "./http-helpers.mjs";
const origin = process.env.GAME_TEST_URL ?? "http://localhost:5173";
async function post(args, status = 200) {
  const r = await fetch(origin + "/api/game", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: crypto.randomUUID(), ...args }),
  });
  const d = await r.json();
  assert.equal(r.status, status, JSON.stringify(d));
  return d;
}
const h = await post({
  op: "create",
  name: "Solo Explorer",
  freshPuzzles: false,
});
assert.equal(h.game.players.filter((p) => p.kind === "bot").length, 7);
const request = {
  op: "ready",
  ...h.session,
  ready: true,
  id: crypto.randomUUID(),
};
const ready = await post(request);
assert.equal(ready.game.phase, "loading");
assert.ok(ready.game.entryAt - ready.game.serverNow === 10000);
assert.deepEqual(ready.game.puzzles, []);
assert.equal(ready.game.deadline, null);
const duplicate = await post(request);
assert.equal(duplicate.game.entryAt, ready.game.entryAt);
await post(
  {
    op: "answer",
    ...h.session,
    puzzleId: "j0a",
    answer: "26",
    phaseKey: `${ready.game.run}:loading:0:0`,
  },
  400,
);
await post({ op: "settings", ...h.session, gameDifficulty: "easy" }, 400);
await post({ op: "join", code: h.session.code, name: "Late Arrival" }, 409);
const opened = await waitForLab(() => post({ op: "state", ...h.session }));
assert.equal(opened.game.deadline, ready.game.entryAt + 240000);
assert.equal(opened.game.entryAt, null);
assert.equal(opened.game.puzzles.length, 3);
const key = `${opened.game.run}:main:0:0`;
const found = await post({
  op: "claim",
  ...h.session,
  puzzleId: "j0a",
  phaseKey: key,
});
assert.deepEqual(found.game.discovered, ["j0a"]);
const again = await post({ op: "state", ...h.session });
assert.deepEqual(again.game.discovered, ["j0a"]);
assert.equal(again.game.score, 0);
const solved = await post({
  op: "answer",
  ...h.session,
  puzzleId: "j0a",
  answer: "26",
  phaseKey: key,
});
assert.equal(solved.game.score, 100);
assert.equal(solved.game.puzzles[0].solved, true);
for (const key of [
  h.session.token,
  '"answer"',
  '"rng"',
  "nextAttemptAt",
  '"progress"',
])
  assert.ok(!JSON.stringify(solved.game).includes(key));
await post({ op: "leave", ...h.session });
console.log(
  "PASS: solo bot Race, automatic ten-second countdown, duplicate readiness, hidden puzzles, rejected early actions, exact timer start, persisted clue discovery, and private snapshots.",
);

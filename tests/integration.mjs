import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const origin = process.env.GAME_TEST_URL ?? "http://127.0.0.1:5173";
async function request(op, args = {}, session) {
  const response = await fetch(`${origin}/api/game`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op, id: randomUUID(), ...session, ...args }),
  });
  return { status: response.status, ...(await response.json()) };
}
const created = await request("create", {
  name: "Integration Host",
  mode:"coop",
  difficulty: "junior",
});
assert.equal(created.status, 200, created.error);
const host = created.session,
  players = [host];
for (let n = 1; n <= 7; n++) {
  const joined = await request("join", { code: host.code, name: `Guest ${n}` });
  assert.equal(joined.status, 200, joined.error);
  players.push(joined.session);
}
assert.equal(
  (await request("join", { code: host.code, name: "Ninth Player" })).status,
  409,
);
assert.equal(
  (await request("state", {}, { ...host, token: "invalid" })).status,
  401,
);
assert.equal((await request("start", {}, players[1])).status, 403);
assert.equal((await request("start", {}, host)).status, 400);
const ready = await Promise.all(
  players.map((p) => request("ready", { ready: true }, p)),
);
ready.forEach((r) => assert.equal(r.status, 200, r.error));
const started = await request("start", {}, host);
assert.equal(started.status, 200, started.error);
const key = `${started.game.run}:main:0:0`;
const submissions = await Promise.all(
  players.map((p) =>
    request("answer", { puzzleId: "j0a", answer: "26", phaseKey: key }, p),
  ),
);
submissions.forEach((r) => assert.equal(r.status, 200, r.error));
let state = await request("state", {}, host);
assert.equal(state.game.score, 100);
assert.equal(state.game.deadline, started.game.deadline + 20000);
assert.ok(state.game.players.every((p) => !("token" in p)));
assert.ok(state.game.puzzles.every((p) => !("answer" in p)));
const hints = await Promise.all(
  players.map((p) => request("hint", { puzzleId: "j0b", phaseKey: key }, p)),
);
hints.forEach((r) => assert.equal(r.status, 200, r.error));
state = await request("state", {}, host);
assert.equal(state.game.hintCount, 1);
assert.equal(state.game.deadline, started.game.deadline + 5000);
const chat = await request(
  "chat",
  { text: "I will work on the missing page." },
  players[1],
);
assert.equal(chat.status, 200);
assert.ok(chat.game.events.some((e) => e.text.includes("missing page")));
const replayId = randomUUID();
const wrong = await request(
  "answer",
  { id: replayId, puzzleId: "j0c", answer: "999", phaseKey: key },
  players[2],
);
assert.equal(wrong.status, 200, wrong.error);
const replay = await request(
  "answer",
  { id: replayId, puzzleId: "j0c", answer: "999", phaseKey: key },
  players[2],
);
assert.equal(replay.game.wrongCount, 1);
assert.equal(replay.game.deadline, wrong.game.deadline);
// One deliberate pause honours the per-player submission interval.
await new Promise((resolve) => setTimeout(resolve, 850));
const remaining = await Promise.all([
  request(
    "answer",
    { puzzleId: "j0b", answer: "24", phaseKey: key },
    players[3],
  ),
  request(
    "answer",
    { puzzleId: "j0c", answer: "37", phaseKey: key },
    players[4],
  ),
]);
remaining.forEach((r) => assert.equal(r.status, 200, r.error));
state = await request("state", {}, host);
assert.equal(state.game.phase, "cleared");
assert.equal(state.game.solvedCount, 3);
assert.ok(state.game.score > 500);
assert.equal((await request("next", {}, players[1])).status, 403);
const next = await request("next", {}, host);
assert.equal(next.game.roomIndex, 1);
assert.equal(next.game.phase, "main");
assert.equal(
  (await request("join", { code: host.code, name: "Late Student" })).status,
  409,
);
assert.equal(
  (
    await request(
      "answer",
      { puzzleId: "j0a", answer: "26", phaseKey: key },
      host,
    )
  ).status,
  409,
);
await Promise.all(players.map((p) => request("leave", {}, p)));
console.log(
  "PASS: eight independent players, capacity, ready/start permissions, concurrent scoring, shared hints/chat, replay protection, next-room transitions and stale submissions.",
);

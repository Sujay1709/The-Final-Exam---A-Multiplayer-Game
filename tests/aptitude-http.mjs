import assert from "node:assert/strict";
import { PUZZLES } from "../lib/puzzles.ts";
import { waitForLab } from "./http-helpers.mjs";
const origin = process.env.GAME_TEST_URL ?? "http://localhost:5173";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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
function choiceFromVisibleFacts(q, room) {
  if (room === 0) {
    const who = q.prompt.match(/How is (\w+) related to (\w+)/)[1];
    return { Mira: "Aunt", Arun: "Grandfather", Riya: "Niece" }[who];
  }
  if (room === 1) {
    const compass = ["north", "east", "south", "west"],
      start = compass.indexOf(q.prompt.match(/face (\w+)/)[1]);
    const turns = [...q.prompt.matchAll(/90° (right|left)/g)].map((m) =>
      m[1] === "right" ? 1 : -1,
    );
    return ["North", "East", "South", "West"][
      (start + turns.reduce((a, b) => a + b, 0) + 8) % 4
    ];
  }
  if (room === 2) {
    const [a, b] = q.prompt.match(/\d+/g).map(Number);
    return String(a + b - 1);
  }
  if (room === 3) {
    const letters = q.prompt
      .match(/shows (.*), __/)[1]
      .split(", ")
      .map((l) => l.charCodeAt(0));
    return String.fromCharCode(letters[3] + letters[3] - letters[2]);
  }
  return "Mira wears an ID badge";
}
const h = await post({
  op: "create",
  name: "Logic Host",
  fillBots: false,
  freshPuzzles: false,
});
assert.equal(h.game.aptitudePuzzles, true);
const b = await post({ op: "join", code: h.session.code, name: "Logic Guest" });
await post({ op: "settings", ...b.session, aptitudePuzzles: false }, 403);
await post({ op: "settings", ...h.session, aptitudePuzzles: "yes" }, 400);
await Promise.all(
  [h, b].map((p) => post({ op: "ready", ...p.session, ready: true })),
);
const open = await waitForLab(() => post({ op: "state", ...h.session }));
const other = await post({ op: "state", ...b.session });
assert.deepEqual(open.game.puzzles, other.game.puzzles);
assert.ok(open.game.puzzles[2].diagram);
const key = (g) => `${g.run}:${g.phase}:${g.roomIndex}:${g.punishment}`;
const invalid = await post(
  {
    op: "answer",
    ...h.session,
    phaseKey: key(open.game),
    puzzleId: "j0c",
    answer: "5",
  },
  400,
);
assert.equal(invalid.game.wrongCount, 0);
for (let room = 0; room < 5; room++) {
  for (let i = 0; i < 3; i++) {
    await pause(850);
    for (const player of [h, b]) {
      const view = (await post({ op: "state", ...player.session })).game;
      assert.equal(view.roomIndex, room);
      const q = view.puzzles[i];
      const answer = q.choices
        ? String(q.choices.indexOf(choiceFromVisibleFacts(q, room)) + 1)
        : String(PUZZLES.junior[room][i].answer);
      const d = await post({
        op: "answer",
        ...player.session,
        puzzleId: q.id,
        answer,
        phaseKey: key(view),
      });
      assert.equal(d.game.correctCount, room * 3 + i + 1);
      if (q.choices) {
        assert.ok(d.game.puzzles[i].solution);
        if (player === h) {
          const other = (await post({ op: "state", ...b.session })).game;
          assert.equal(other.puzzles[i].solution, null);
        }
      }
      for (const secret of [
        h.session.token,
        b.session.token,
        '"answer"',
        '"puzzleRooms"',
        '"rng"',
      ])
        assert.ok(!JSON.stringify(d.game).includes(secret));
    }
  }
  if (room < 4) await pause(3100);
}
const end = (await post({ op: "state", ...h.session })).game;
assert.equal(end.phase, "won");
assert.equal(end.matchComplete, true);
assert.equal(end.solvedCount, 15);
assert.equal(end.accuracy, 1);
await Promise.all([h, b].map((p) => post({ op: "leave", ...p.session })));
for (const asset of [
  "fraction-factory",
  "algebra-alarm",
  "geometry-trap",
  "final-study",
  "detention-warning",
  "detention-isolation",
  "detention-probation",
]) {
  const r = await fetch(`${origin}/lab/${asset}.webp`);
  assert.equal(r.status, 200);
  assert.ok(r.headers.get("content-type").includes("image/webp"));
}
console.log(
  "PASS: mixed-mode defaults, five rooms of aptitude/math validated from visible facts, private choices/solutions, invalid-option rejection, full Race completion, and seven room artwork URLs.",
);

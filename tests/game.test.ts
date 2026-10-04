import { defaultAvatar } from "../lib/profiles.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  mutateGame,
  advanceClock,
  snapshot,
  phaseKey,
  parseAnswer,
  GameError,
} from "../lib/game.ts";
import { PUZZLES, DETENTION } from "../lib/puzzles.ts";
const T = 1000000;
function fixture(difficulty: "junior" | "senior" = "junior") {
  const g = createGame("ABCDEF", "Host", difficulty, "token", "host", T);
  g.players.push({
    id: "guest",
    name: "Guest",
    kind:"human",
    avatar:defaultAvatar(),
    token: "guest-token",
    ready: true,
    lastSeen: T,
    working: null,
    lastAnswer: 0,
  });
  g.players[0].ready = true;
  mutateGame(g, { op: "start", token: "token" }, T - 10000);
  advanceClock(g, T);
  return g;
}
function answer(
  g: ReturnType<typeof fixture>,
  id: string,
  value: number,
  now: number,
  receipt = crypto.randomUUID(),
) {
  return mutateGame(
    g,
    {
      op: "answer",
      token: "token",
      puzzleId: id,
      answer: String(value),
      phaseKey: phaseKey(g),
      id: receipt,
    },
    now,
  );
}
test("cannot start alone or with an unready player; host alone controls start", () => {
  const g = createGame("ABCDEF", "Host", "junior", "token", "host", T);
  assert.throws(
    () => mutateGame(g, { op: "start", token: "token" }, T),
    GameError,
  );
  g.players.push({
    id: "guest",
    name: "Guest",
    kind:"human",
    avatar:defaultAvatar(),
    token: "guest-token",
    ready: false,
    lastSeen: T,
    working: null,
    lastAnswer: 0,
  });
  assert.throws(() => mutateGame(g, { op: "start", token: "token" }, T));
  assert.throws(() => mutateGame(g, { op: "start", token: "guest-token" }, T));
});
test("numeric parser accepts equivalent fractions and rejects expressions and nonfinite values", () => {
  assert.equal(parseAnswer("3 / 8"), 0.375);
  assert.equal(parseAnswer("-0.5"), -0.5);
  for (const s of ["1/0", "NaN", "Infinity", "1+2", "2 cm", "", "0x10"])
    assert.equal(parseAnswer(s), null);
});
test("wrong answers and hints affect time once; duplicate solutions do not double award", () => {
  const g = fixture();
  const puzzle = PUZZLES.junior[0][0];
  answer(g, puzzle.id, 0, T + 1000);
  assert.equal(g.deadline, T + 230000);
  assert.equal(g.score, 0);
  mutateGame(
    g,
    { op: "hint", token: "token", puzzleId: puzzle.id, phaseKey: phaseKey(g) },
    T + 2000,
  );
  mutateGame(
    g,
    {
      op: "hint",
      token: "guest-token",
      puzzleId: puzzle.id,
      phaseKey: phaseKey(g),
    },
    T + 2000,
  );
  assert.equal(g.deadline, T + 215000);
  assert.equal(g.hintCount, 1);
  answer(g, puzzle.id, puzzle.answer, T + 3000, "same");
  const score = g.score,
    deadline = g.deadline;
  mutateGame(
    g,
    {
      op: "answer",
      token: "guest-token",
      puzzleId: puzzle.id,
      answer: String(puzzle.answer),
      phaseKey: phaseKey(g),
      id: "another",
    },
    T + 3000,
  );
  answer(g, puzzle.id, puzzle.answer, T + 4000, "same");
  assert.equal(g.score, score);
  assert.equal(g.deadline, deadline);
});
test("timeout adds detention, clamps score, preserves solved main puzzles and resumes with two minutes", () => {
  const g = fixture();
  answer(g, "j0a", 26, T + 1000);
  const expiry = g.deadline!;
  advanceClock(g, expiry);
  assert.equal(g.phase, "detention");
  assert.equal(g.punishment, 1);
  assert.equal(g.score, 0);
  assert.equal(g.solved.j0a, "host");
  answer(g, "d1a", 54, expiry + 1000);
  assert.equal(g.phase, "main");
  assert.equal(g.deadline, expiry + 121000);
  assert.equal(g.solved.j0a, "host");
});
test("three escalations gate the decode step and the fourth main timeout ends the game", () => {
  const g = fixture();
  let now = T;
  for (let level = 1; level <= 3; level++) {
    now = g.deadline!;
    advanceClock(g, now);
    assert.equal(g.punishment, level);
    assert.equal(g.deadline, now + [60000, 90000, 120000][level - 1]);
    if (level === 3)
      assert.throws(() => answer(g, "d3c", 67, now + 1000), /fragments/);
    for (const p of DETENTION[level - 1]) {
      now += 1000;
      answer(g, p.id, p.answer, now);
    }
    assert.equal(g.phase, "main");
  }
  advanceClock(g, g.deadline!);
  assert.equal(g.phase, "lost");
  assert.equal(g.punishment, 4);
});
test("detention expiry ends the game and stale room submissions cannot alter the next stage", () => {
  const g = fixture();
  const oldKey = phaseKey(g);
  advanceClock(g, g.deadline!);
  assert.throws(
    () =>
      mutateGame(
        g,
        {
          op: "answer",
          token: "token",
          puzzleId: "j0a",
          answer: "26",
          phaseKey: oldKey,
        },
        g.deadline! - 1000,
      ),
    /room changed/,
  );
  advanceClock(g, g.deadline!);
  assert.equal(g.phase, "lost");
});
test("an answer received at the deadline cannot rescue an expired main room", () => {
  const g = fixture(),
    at = g.deadline!;
  assert.throws(() => answer(g, "j0a", 26, at), /room changed/);
  assert.equal(g.phase, "detention");
  assert.equal(g.solved.j0a, undefined);
});
test("both difficulty paths complete all fifteen locks, award bonuses, and restart fairly", () => {
  for (const d of ["junior", "senior"] as const) {
    const g = fixture(d);
    let now = T;
    for (let room = 0; room < 5; room++) {
      for (const p of PUZZLES[d][room]) {
        now += 1000;
        answer(g, p.id, p.answer, now);
      }
      if (room < 4) {
        assert.equal(g.phase, "cleared");
        now += 1000;
        mutateGame(g, { op: "next", token: "token" }, now);
      }
    }
    assert.equal(g.phase, "won");
    assert.equal(g.score, 2985);
    assert.equal(snapshot(g, 1, now).solvedCount, 15);
    mutateGame(g, { op: "restart", token: "token" }, now);
    assert.equal(g.phase, "lobby");
    assert.equal(g.score, 0);
    assert.equal(g.run, 2);
    assert.equal(g.players[0].ready, false);
  }
});
test("snapshots never expose session tokens, answer keys or unpurchased hints", () => {
  const g = fixture(),
    s = snapshot(g, 1, T);
  assert.ok(!JSON.stringify(s).includes("guest-token"));
  assert.equal(s.puzzles[0].hint, null);
  assert.equal(s.puzzles[0].solution, null);
  assert.ok(!("answer" in s.puzzles[0]));
});
test("host role transfers when disconnected, and unauthorized sessions cannot mutate state", () => {
  const g = fixture();
  mutateGame(g, { op: "state", token: "guest-token" }, T + 31000);
  assert.equal(g.hostId, "guest");
  assert.throws(
    () => mutateGame(g, { op: "ready", token: "bad" }, T + 31000),
    /invalid/,
  );
});

test("profile updates are owned by the session, validated, unique, and lobby-only",()=>{
 const g=createGame("ABCDEF","Host","junior","token","host",T);
 g.players.push({id:"guest",name:"Guest",kind:"human",avatar:defaultAvatar(),token:"guest-token",ready:false,lastSeen:T,working:null,lastAnswer:0});
 const before=JSON.stringify(g.players[1]);
 mutateGame(g,{op:"profile",token:"token",name:"QuietOwl",avatar:{...defaultAvatar(7),accessory:"glasses"}},T);
 assert.equal(g.players[0].name,"QuietOwl"); assert.equal(JSON.stringify(g.players[1]),before);
 assert.throws(()=>mutateGame(g,{op:"profile",token:"token",name:"guest",avatar:defaultAvatar()},T),/already/);
 assert.throws(()=>mutateGame(g,{op:"profile",token:"token",name:"Host",avatar:{...defaultAvatar(),skin:"url(evil)"}},T),/colors/);
 g.phase="main";assert.throws(()=>mutateGame(g,{op:"profile",token:"token",name:"Changed"},T),/lobby/);
});

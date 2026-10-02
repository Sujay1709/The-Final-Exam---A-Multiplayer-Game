import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  joinGame,
  mutateGame,
  advanceClock,
  phaseKey,
  snapshot,
  currentPuzzles,
  normalizeGame,
  type GameState,
} from "../lib/game.ts";
import { defaultAvatar } from "../lib/profiles.ts";
import { GAME_RULES, BOT_RULES } from "../lib/game-settings.ts";
import { PUZZLES, DETENTION } from "../lib/puzzles.ts";
const T = 1000000;
function race(fillBots = true) {
  const g = createGame(
    "ABCDEF",
    "Host",
    "junior",
    "h-token",
    "h",
    T,
    defaultAvatar(),
    { mode: "race", fillBots },
  );
  joinGame(g, "Guest", defaultAvatar(1), "b-token", "b", T);
  g.seed = 42;
  g.players.forEach((p, i) => {
    p.ready = true;
    if (p.kind === "bot") p.rng = 42 + i;
  });
  mutateGame(g, { op: "start", token: "h-token" }, T);
  return g;
}
function submit(
  g: GameState,
  id: string,
  puzzleId: string,
  answer: number,
  at: number,
  receipt = crypto.randomUUID(),
) {
  const p = g.players.find((p) => p.id === id)!;
  return mutateGame(
    g,
    {
      op: "answer",
      token: p.token,
      puzzleId,
      answer: String(answer),
      phaseKey: phaseKey(g, id),
      id: receipt,
    },
    at,
  );
}
test("race fills two humans plus six bots; human joins replace seats up to eight humans", () => {
  const g = createGame(
    "ABCDEF",
    "Host",
    "junior",
    "h-token",
    "h",
    T,
    defaultAvatar(),
    { mode: "race", fillBots: true },
  );
  assert.equal(g.players.length, 8);
  assert.throws(
    () => mutateGame(g, { op: "start", token: "h-token" }, T),
    /human/,
  );
  for (let i = 1; i < 8; i++) {
    joinGame(g, "Human" + i, defaultAvatar(i), "token" + i, "human" + i, T);
    assert.equal(g.players.length, 8);
    assert.equal(g.players.filter((p) => p.kind === "bot").length, 7 - i);
  }
  assert.throws(
    () => joinGame(g, "Extra", defaultAvatar(), "x", "x", T),
    /full/,
  );
  g.players.forEach((p) => (p.ready = true));
  mutateGame(g, { op: "start", token: "h-token" }, T);
  assert.ok(g.players.every((p) => p.progress?.deadline === T + 240000));
});
test("all pressure settings preserve scoring and apply exact wrong, hint, detention and recovery times", () => {
  for (const skill of ["easy", "medium", "hard"] as const) {
    const rules = GAME_RULES[skill];
    const g = createGame(
      "ABCDEF",
      "Host",
      "junior",
      "h-token",
      "h",
      T,
      defaultAvatar(),
      { gameDifficulty: skill },
    );
    joinGame(g, "Guest", defaultAvatar(), "b-token", "b", T);
    g.players.forEach((p) => (p.ready = true));
    mutateGame(g, { op: "start", token: "h-token" }, T);
    assert.equal(g.deadline, T + rules.main * 1000);
    submit(g, "h", "j0a", 0, T + 1000);
    assert.equal(g.deadline, T + (rules.main - rules.wrong) * 1000);
    mutateGame(
      g,
      { op: "hint", token: "h-token", puzzleId: "j0a", phaseKey: phaseKey(g) },
      T + 1500,
    );
    assert.equal(
      g.deadline,
      T + (rules.main - rules.wrong - rules.hint) * 1000,
    );
    submit(g, "h", "j0a", 26, T + 2000);
    assert.equal(g.score, 100);
    let at = T;
    for (let level = 1; level <= 3; level++) {
      at = g.deadline!;
      advanceClock(g, at);
      assert.equal(g.punishment, level);
      assert.equal(g.deadline, at + rules.detention[level - 1] * 1000);
      for (const q of DETENTION[level - 1]) {
        at += 1000;
        submit(g, "h", q.id, q.answer, at);
      }
      assert.equal(g.deadline, at + rules.resume * 1000);
      assert.equal(g.solved.j0a, "h");
    }
    advanceClock(g, g.deadline!);
    assert.equal(g.phase, "lost");
    assert.equal(g.punishment, 4);
  }
});
test("simultaneous racers own scoring, hints, and explanations; receipts cannot double award", () => {
  const g = race(false);
  submit(g, "h", "j0a", 26, T + 1000, "same");
  submit(g, "b", "j0a", 26, T + 1000, "same");
  assert.equal(g.players[0].progress!.score, 100);
  assert.equal(g.players[1].progress!.score, 100);
  submit(g, "h", "j0a", 26, T + 2000, "same");
  assert.equal(g.players[0].progress!.score, 100);
  mutateGame(
    g,
    {
      op: "hint",
      token: "h-token",
      puzzleId: "j0b",
      phaseKey: phaseKey(g, "h"),
    },
    T + 2200,
  );
  const h = snapshot(g, 1, T + 2200, "h"),
    b = snapshot(g, 1, T + 2200, "b");
  assert.ok(h.puzzles[1].hint);
  assert.equal(b.puzzles[1].hint, null);
  assert.equal(b.hintCount, 0);
  submit(g, "h", "j0b", 24, T + 3000);
  assert.equal(snapshot(g, 2, T + 3000, "b").puzzles[1].solution, null);
  const json = JSON.stringify(b);
  for (const secret of [
    "h-token",
    "b-token",
    "nextAttemptAt",
    "rng",
    '"token"',
    '"answer"',
    '"progress"',
  ])
    assert.ok(!json.includes(secret), secret);
  assert.throws(() => snapshot(g, 1, T), /viewer/);
});
test("detention is independent and reconnect catches up exact deadlines without free time", () => {
  const g = race(false);
  const h = g.players[0].progress!,
    b = g.players[1].progress!;
  h.deadline = T + 1000;
  advanceClock(g, T + 1000);
  assert.equal(h.phase, "detention");
  assert.equal(b.phase, "main");
  assert.equal(h.deadline, T + 61000);
  submit(g, "h", "d1a", 54, T + 2000);
  assert.equal(h.deadline, T + 122000);
  assert.equal(b.deadline, T + 240000);
  advanceClock(g, T + 400000);
  assert.equal(h.phase, "lost");
  assert.equal(b.phase, "lost");
  assert.equal(h.finishedAt, T + 212000);
  assert.equal(b.finishedAt, T + 300000);
  mutateGame(g, { op: "state", token: "h-token" }, T + 400000);
  assert.equal(snapshot(g, 1, T + 400000, "h").phase, "lost");
  assert.equal(g.phase, "lost");
});
test("race summaries advance at exactly three seconds and old-phase submissions are rejected", () => {
  const g = race(false);
  for (let i = 0; i < 3; i++) {
    const q = PUZZLES.junior[0][i];
    submit(g, "h", q.id, q.answer, T + (i + 1) * 1000);
  }
  const p = g.players[0].progress!;
  assert.equal(p.phase, "cleared");
  assert.equal(p.nextRoomAt, T + 6000);
  const old = phaseKey(g, "h");
  advanceClock(g, T + 5999);
  assert.equal(p.roomIndex, 0);
  advanceClock(g, T + 6000);
  assert.equal(p.roomIndex, 1);
  assert.equal(p.deadline, T + 246000);
  assert.throws(
    () =>
      mutateGame(
        g,
        {
          op: "answer",
          token: "h-token",
          phaseKey: old,
          puzzleId: "j0a",
          answer: "26",
        },
        T + 7000,
      ),
    /room changed/,
  );
  assert.equal(snapshot(g, 1, T + 7000, "h").review.length, 3);
});
function finish(g: GameState, id: string, at: number) {
  for (let room = 0; room < 5; room++) {
    for (const q of PUZZLES.junior[room]) {
      at += 1000;
      submit(g, id, q.id, q.answer, at);
    }
    if (room < 4) {
      at += 3000;
      advanceClock(g, at);
    }
  }
  return at;
}
test("first escape wins while others continue; final ordering and restart are retained", () => {
  const g = race(false);
  let at = finish(g, "h", T);
  assert.equal(g.winnerId, "h");
  assert.equal(g.phase, "main");
  assert.equal(snapshot(g, 1, at, "h").matchComplete, false);
  assert.throws(
    () => mutateGame(g, { op: "restart", token: "h-token" }, at),
    /Finish/,
  );
  at = finish(g, "b", at + 1000);
  assert.equal(g.winnerId, "h");
  assert.equal(g.phase, "won");
  const s = snapshot(g, 1, at, "b");
  assert.equal(s.matchComplete, true);
  assert.deepEqual(
    s.leaderboard.map((p) => p.place),
    [1, 2],
  );
  assert.equal(s.review.length, 15);
  mutateGame(g, { op: "restart", token: "h-token" }, at);
  assert.equal(g.phase, "lobby");
  assert.ok(g.players.every((p) => !p.ready && !p.progress));
});
test("seeded bots give identical outcomes with frequent polling and a single delayed catch-up", () => {
  const fast = race(),
    slow = structuredClone(fast);
  for (let t = T; t <= T + 900000; t += 1000) advanceClock(fast, t);
  advanceClock(slow, T + 900000);
  const digest = (g: GameState) => ({
    winner: g.winnerId,
    phase: g.phase,
    players: g.players.map((p) => ({
      id: p.id,
      rng: p.rng,
      next: p.nextAttemptAt,
      progress: p.progress ? { ...p.progress, events: [] } : null,
    })),
  });
  assert.deepEqual(digest(fast), digest(slow));
  const before = JSON.stringify(digest(slow));
  advanceClock(slow, T + 900000);
  assert.equal(JSON.stringify(digest(slow)), before);
  assert.ok(
    fast.players.some((p) => p.kind === "bot" && p.progress!.wrongCount > 0),
  );
});
test("bot schedules match configured ranges and bots never acquire the host role", () => {
  for (const skill of ["easy", "medium", "hard"] as const) {
    const g = createGame(
      "ABCDEF",
      "Host",
      "junior",
      "h-token",
      "h",
      T,
      defaultAvatar(),
      { mode: "race", fillBots: true, botSkill: skill },
    );
    joinGame(g, "Guest", defaultAvatar(), "b-token", "b", T);
    g.players.forEach((p) => (p.ready = true));
    mutateGame(g, { op: "start", token: "h-token" }, T);
    for (const bot of g.players.filter((p) => p.kind === "bot"))
      assert.ok(
        bot.nextAttemptAt! >= T + BOT_RULES[skill].min * 1000 &&
          bot.nextAttemptAt! <= T + BOT_RULES[skill].max * 1000,
      );
    mutateGame(g, { op: "state", token: "b-token" }, T + 31000);
    assert.equal(g.hostId, "b");
    assert.throws(
      () => mutateGame(g, { op: "state", token: "" }, T + 31000),
      /invalid/,
    );
  }
});
test("left racers remain in final results, and all humans leaving stops bot activity", () => {
  const g = race();
  mutateGame(g, { op: "leave", token: "h-token" }, T + 1000);
  assert.equal(g.hostId, "b");
  assert.equal(
    snapshot(g, 1, T + 1000, "b").leaderboard.find((p) => p.playerId === "h")!
      .phase,
    "left",
  );
  assert.throws(
    () => mutateGame(g, { op: "state", token: "h-token" }, T + 1000),
    /invalid/,
  );
  mutateGame(g, { op: "leave", token: "b-token" }, T + 2000);
  assert.equal(g.phase, "lost");
  assert.ok(g.players.every((p) => p.nextAttemptAt == null));
  const before = JSON.stringify(g);
  advanceClock(g, T + 1000000);
  assert.equal(JSON.stringify(g), before);
});
test("old JSON rooms normalize to cooperative Medium with human default avatars", () => {
  const g = createGame("ABCDEF", "Host", "junior", "h-token", "h", T);
  const raw = JSON.parse(JSON.stringify(g));
  for (const key of ["mode", "gameDifficulty", "botSkill", "fillBots"])
    delete raw[key];
  delete raw.players[0].kind;
  delete raw.players[0].avatar;
  normalizeGame(raw);
  assert.equal(raw.mode, "coop");
  assert.equal(raw.gameDifficulty, "medium");
  assert.equal(raw.players[0].kind, "human");
  assert.deepEqual(raw.players[0].avatar, defaultAvatar());
});

test("a scheduled bot escape is ordered before a later human submission",()=>{
 const g=race();const bot=g.players.find(p=>p.kind==="bot")!,h=g.players[0];
 for(const player of [bot,h]){const p=player.progress!;p.roomIndex=4;p.solved={j4a:player.id,j4b:player.id};}
 bot.rng=1;bot.nextAttemptAt=T+1000;
 const q=PUZZLES.junior[4][2];submit(g,"h",q.id,q.answer,T+2000);
 assert.equal(g.winnerId,bot.id);assert.equal(bot.progress!.finishedAt,T+1000);assert.equal(h.progress!.place,2);
});
test("a bot attempt at its deadline cannot rescue an expired room",()=>{
 const g=race();const bot=g.players.find(p=>p.kind==="bot")!;bot.progress!.deadline=T+1000;bot.nextAttemptAt=T+1000;bot.rng=1;
 advanceClock(g,T+1000);assert.equal(bot.progress!.phase,"detention");assert.equal(bot.progress!.solved.j0a,undefined);
});

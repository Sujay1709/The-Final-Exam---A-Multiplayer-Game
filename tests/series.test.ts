import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  joinGame,
  mutateGame,
  phaseKey,
  snapshot,
  currentPuzzles,
  advanceClock,
  type GameState,
} from "../lib/game.ts";
import { defaultAvatar } from "../lib/profiles.ts";
const T = 1000000;
function fixture(humans = 2, bots = false) {
  const g = createGame(
    "ABCDEF",
    "Human 0",
    "junior",
    "t0",
    "h0",
    T,
    defaultAvatar(),
    { mode: "race", fillBots: bots, bestOfThree: true, freshPuzzles: true },
  );
  for (let i = 1; i < humans; i++)
    joinGame(g, `Human ${i}`, defaultAvatar(i), `t${i}`, `h${i}`, T);
  readyStart(g, T);
  return g;
}
function action(
  g: GameState,
  playerId: string,
  op: string,
  at: number,
  args: Record<string, unknown> = {},
) {
  const player = g.players.find((p) => p.id === playerId)!;
  return mutateGame(
    g,
    {
      op,
      token: player.token,
      id: crypto.randomUUID(),
      phaseKey: phaseKey(g, playerId),
      ...args,
    },
    at,
  );
}
function readyStart(g: GameState, at: number) {
  for (const p of g.players.filter((p) => p.kind === "human" && !p.left))
    action(g, p.id, "ready", at, { ready: true });
  action(g, g.hostId, "start", at);
  advanceClock(g, at + 10000);
}
function finishRound(g: GameState, winner: string, at: number) {
  at = Math.max(at, g.startedAt!);
  const players = g.players
    .filter((p) => p.kind === "human" && !p.left)
    .sort((a, b) => Number(b.id === winner) - Number(a.id === winner));
  for (let room = 0; room < 5; room++) {
    for (const q of currentPuzzles(g, players[0].progress!)) {
      at += 1000;
      for (const p of players)
        action(g, p.id, "answer", at, {
          puzzleId: q.id,
          answer: String(q.answer),
        });
    }
    if (room < 4) {
      at += 3000;
      advanceClock(g, at);
    }
  }
  return at;
}
function voteAll(g: GameState, at: number) {
  for (const p of g.players.filter((p) => p.kind === "human" && !p.left))
    action(g, p.id, "rematch", at, { ready: true });
}
test("two round wins end the rivalry; unanimous votes retain profiles, settings, and require readiness", () => {
  const g = fixture();
  let at = finishRound(g, "h0", T);
  assert.equal(g.series!.standings.find((p) => p.playerId === "h0")!.wins, 1);
  assert.equal(g.series!.complete, false);
  const old = snapshot(g, 1, at, "h0");
  assert.equal(old.accuracy, 1);
  assert.equal(old.elapsedSeconds, 27);
  assert.equal(old.bestStreak, 15);
  action(g, "h0", "state", at);
  action(g, "h1", "state", at);
  assert.equal(g.series!.rounds.length, 1);
  assert.throws(() => action(g, g.hostId, "restart", at), /Vote/);
  action(g, "h0", "rematch", at, { ready: true });
  assert.equal(g.phase, "won");
  action(g, "h0", "rematch", at, { ready: false });
  assert.equal(g.rematchVotes.length, 0);
  voteAll(g, at);
  assert.equal(g.phase, "lobby");
  assert.equal(g.series!.round, 2);
  assert.ok(g.players.every((p) => !p.ready && !p.progress));
  assert.throws(() => action(g, g.hostId, "start", at), /ready/);
  assert.throws(
    () => action(g, g.hostId, "settings", at, { gameDifficulty: "easy" }),
    /fixed/,
  );
  assert.throws(
    () => joinGame(g, "Late", defaultAvatar(), "late", "late", at),
    /rivalry/,
  );
  const avatar = defaultAvatar(7);
  action(g, "h0", "profile", at, { name: "Quiet Owl", avatar });
  readyStart(g, at);
  assert.notEqual(JSON.stringify(g.puzzleRooms), JSON.stringify(old.puzzles));
  at = finishRound(g, "h0", at);
  assert.equal(g.series!.rounds.length, 2);
  assert.equal(g.series!.complete, true);
  assert.equal(g.series!.championId, "h0");
  assert.equal(snapshot(g, 2, at, "h0").series!.standings[0].name, "Quiet Owl");
  assert.throws(
    () => action(g, "h1", "rematch", at, { ready: true }),
    /complete/,
  );
  action(g, g.hostId, "restart", at);
  assert.equal(g.series, null);
  assert.equal(g.bestOfThree, true);
  assert.deepEqual(g.players.find((p) => p.id === "h0")!.avatar, avatar);
});
test("three different winners yield a draw; stale-round votes never advance a later round", () => {
  const g = fixture(3);
  let at = T;
  const originalKey = phaseKey(g, "h0");
  for (let round = 0; round < 3; round++) {
    at = finishRound(g, `h${round}`, at);
    assert.equal(g.series!.rounds.length, round + 1);
    if (round < 2) {
      voteAll(g, at);
      readyStart(g, at);
    }
  }
  assert.equal(g.series!.complete, true);
  assert.equal(g.series!.championId, null);
  assert.deepEqual(
    g.series!.standings.map((p) => p.wins),
    [1, 1, 1],
  );
  assert.throws(
    () =>
      action(g, "h0", "rematch", at, { ready: true, phaseKey: originalKey }),
    /round changed/,
  );
});
test("no-escape rounds, disconnected votes, and host migration settle without invented wins", () => {
  const g = fixture();
  const expiry = T + 310000;
  advanceClock(g, expiry);
  assert.equal(g.phase, "lost");
  assert.equal(g.series!.rounds[0].winnerId, null);
  assert.equal(snapshot(g, 1, expiry, "h0").accuracy, null);
  assert.equal(snapshot(g, 1, expiry, "h0").elapsedSeconds, 300);
  action(g, "h0", "rematch", expiry, { ready: true });
  assert.equal(g.phase, "lost");
  action(g, "h1", "rematch", expiry + 31000, { ready: true });
  assert.equal(g.hostId, "h1");
  assert.equal(g.phase, "lost");
  action(g, "h0", "state", expiry + 31000);
  assert.equal(g.phase, "lobby");
  assert.equal(g.series!.round, 2);
  readyStart(g, expiry + 31000);
  advanceClock(g, expiry + 341000);
  action(g, g.hostId, "endSeries", expiry + 341000);
  assert.equal(g.series, null);
  assert.equal(g.bestOfThree, false);
  assert.equal(g.phase, "lobby");
});
test("bot round wins are recorded once and catch-up timing stays deterministic", () => {
  const g = fixture(2, true),
    fast = structuredClone(g),
    slow = structuredClone(g);
  for (let at = T; at <= T + 900000; at += 1000) advanceClock(fast, at);
  advanceClock(slow, T + 900000);
  assert.ok(fast.winnerId?.startsWith("bot-"));
  assert.deepEqual(fast.series, slow.series);
  assert.equal(fast.series!.rounds.length, 1);
  assert.equal(
    fast.series!.standings.find((p) => p.playerId === fast.winnerId)!.wins,
    1,
  );
  advanceClock(fast, T + 1000000);
  assert.equal(fast.series!.rounds.length, 1);
  const names = fast.players
    .filter((p) => p.kind === "human")
    .map((p) => p.name);
  voteAll(fast, T + 1000000);
  assert.equal(fast.players.filter((p) => p.kind === "bot").length, 6);
  assert.deepEqual(
    fast.players.filter((p) => p.kind === "human").map((p) => p.name),
    names,
  );
  assert.equal(fast.series!.round, 2);
});
test("rematch voting works outside series; only human sessions can vote and only the host can end a rivalry", () => {
  const g = fixture();
  assert.throws(() => action(g, "h1", "endSeries", T), /host/);
  assert.throws(
    () => action(g, "h0", "rematch", T, { ready: true }),
    /every racer/,
  );
  let at = finishRound(g, "h0", T);
  assert.throws(
    () => mutateGame(g, { op: "rematch", token: "", ready: true }, at),
    /invalid/,
  );
  action(g, g.hostId, "endSeries", at);
  readyStart(g, at);
  at = finishRound(g, "h1", at);
  voteAll(g, at);
  assert.equal(g.phase, "lobby");
  assert.equal(g.series, null);
});

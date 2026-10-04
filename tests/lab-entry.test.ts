import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  joinGame,
  mutateGame,
  snapshot,
  phaseKey,
  advanceClock,
  normalizeGame,
} from "../lib/game.ts";
import { defaultAvatar } from "../lib/profiles.ts";
const T = 1000000;
const solo = () =>
  createGame(
    "ABCDEF",
    "Host",
    "junior",
    "host-token",
    "host",
    T,
    defaultAvatar(),
    { mode: "race", fillBots: true },
  );
const act = (
  g: ReturnType<typeof solo>,
  op: string,
  at = T,
  args: Record<string, unknown> = {},
  token = "host-token",
) =>
  mutateGame(
    g,
    {
      op,
      token,
      id: crypto.randomUUID(),
      phaseKey: phaseKey(g, token === "host-token" ? "host" : "guest"),
      ...args,
    },
    at,
  );

test("one ready human plus seven bots automatically enters a ten-second sealed countdown", () => {
  const g = solo();
  assert.equal(g.players.filter((p) => p.kind === "bot").length, 7);
  act(g, "ready", T, { ready: true });
  const loading = snapshot(g, 1, T, "host");
  assert.equal(loading.phase, "loading");
  assert.equal(loading.entryAt, T + 10000);
  assert.equal(loading.deadline, null);
  assert.equal(loading.elapsedSeconds, null);
  assert.deepEqual(loading.puzzles, []);
  assert.ok(
    g.players.every((p) => p.nextAttemptAt == null && p.progress?.score === 0),
  );
  assert.throws(
    () => act(g, "answer", T + 1000, { puzzleId: "j0a", answer: "26" }),
    /no longer/,
  );
  assert.throws(
    () => joinGame(g, "Late", defaultAvatar(), "late", "late", T + 1000),
    /started/,
  );
  act(g, "start", T + 8000);
  assert.equal(g.entryAt, T + 10000);
  advanceClock(g, T + 9999);
  assert.equal(g.phase, "loading");
  advanceClock(g, T + 10000);
  assert.equal(g.phase, "main");
  const opened = snapshot(g, 2, T + 10000, "host");
  assert.equal(opened.entryAt, null);
  assert.equal(opened.deadline, T + 250000);
  assert.equal(opened.elapsedSeconds, 0);
  assert.equal(opened.puzzles.length, 3);
  assert.ok(
    g.players
      .filter((p) => p.kind === "bot")
      .every((p) => p.nextAttemptAt! >= T + 24000),
  );
});
test("Co-op and races without bots require two connected ready humans; the last ready action starts everyone", () => {
  for (const mode of ["coop", "race"] as const) {
    const g = createGame(
      "ABCDEF",
      "Host",
      "junior",
      "host-token",
      "host",
      T,
      defaultAvatar(),
      { mode, fillBots: false },
    );
    act(g, "ready", T, { ready: true });
    assert.equal(g.phase, "lobby");
    joinGame(g, "Guest", defaultAvatar(), "guest-token", "guest", T);
    act(g, "state", T + 31000);
    assert.equal(g.phase, "lobby");
    act(g, "ready", T + 31000, { ready: true }, "guest-token");
    assert.equal(g.phase, "loading");
    assert.equal(snapshot(g, 1, T + 31000, "guest").entryAt, T + 41000);
    advanceClock(g, T + 41000);
    assert.equal(snapshot(g, 2, T + 41000, "host").deadline, T + 281000);
  }
});
test("JSON reconnect and extra polls preserve entry time, seeded bot schedules, and offline deadlines", () => {
  const g = solo();
  g.seed = 42;
  act(g, "ready", T, { ready: true });
  const frequent = JSON.parse(JSON.stringify(g)),
    delayed = JSON.parse(JSON.stringify(g));
  for (let at = T; at <= T + 600000; at += 250) advanceClock(frequent, at);
  advanceClock(delayed, T + 600000);
  const digest = (x: typeof g) =>
    x.players.map((p) => ({
      rng: p.rng,
      next: p.nextAttemptAt,
      progress: { ...p.progress, events: [] },
    }));
  assert.deepEqual(digest(frequent), digest(delayed));
  const host = delayed.players[0].progress!;
  assert.equal(host.phase, "lost");
  assert.equal(host.startedAt, T + 10000);
  assert.equal(host.finishedAt, T + 310000);
  assert.equal(snapshot(delayed, 1, T + 600000, "host").elapsedSeconds, 300);
});
test("clue discoveries persist and stay private in Race, shared in Co-op; early claims and forged sessions fail", () => {
  for (const mode of ["race", "coop"] as const) {
    let g = createGame(
      "ABCDEF",
      "Host",
      "junior",
      "host-token",
      "host",
      T,
      defaultAvatar(),
      { mode, fillBots: false },
    );
    joinGame(g, "Guest", defaultAvatar(), "guest-token", "guest", T);
    act(g, "ready", T, { ready: true });
    act(g, "ready", T, { ready: true }, "guest-token");
    assert.throws(
      () => act(g, "claim", T + 1, { puzzleId: "j0a" }),
      /no longer/,
    );
    advanceClock(g, T + 10000);
    act(g, "claim", T + 10001, { puzzleId: "j0a" });
    act(g, "claim", T + 10002, { puzzleId: "j0a" });
    g = normalizeGame(JSON.parse(JSON.stringify(g)));
    assert.deepEqual(snapshot(g, 1, T + 10002, "host").discovered, ["j0a"]);
    assert.deepEqual(
      snapshot(g, 1, T + 10002, "guest").discovered,
      mode === "race" ? [] : ["j0a"],
    );
    assert.equal(snapshot(g, 1, T + 10002, "host").puzzles[0].solution, null);
    const raw = JSON.stringify(snapshot(g, 1, T + 10002, "guest"));
    for (const secret of [
      "host-token",
      "guest-token",
      '"puzzleRooms"',
      '"rng"',
      '"answer"',
    ])
      assert.ok(!raw.includes(secret));
    assert.throws(
      () => act(g, "claim", T + 10003, { puzzleId: "j0b" }, "forged"),
      /invalid/,
    );
  }
});
test("a human leaving during loading never starts later; all humans leaving stops the queued game", () => {
  const g = solo();
  act(g, "ready", T, { ready: true });
  act(g, "leave", T + 2000);
  assert.equal(g.phase, "lost");
  assert.equal(g.entryAt, null);
  advanceClock(g, T + 500000);
  assert.ok(
    g.players.every(
      (p) => p.nextAttemptAt === null && p.progress?.phase === "lost",
    ),
  );
});

test("legacy lobby readiness resets once for auto-start; ongoing matches keep their deadlines", () => {
  const old = solo();
  old.players[0].ready = true;
  delete (old as Partial<typeof old>).entryAt;
  normalizeGame(old);
  assert.equal(old.players[0].ready, false);
  act(old, "ready", T, { ready: true });
  assert.equal(old.phase, "loading");
  const restored = normalizeGame(JSON.parse(JSON.stringify(old)));
  assert.equal(restored.players[0].ready, true);
  assert.equal(restored.entryAt, T + 10000);
  advanceClock(restored, T + 10000);
  const deadline = restored.players[0].progress!.deadline;
  delete (restored as Partial<typeof restored>).entryAt;
  normalizeGame(restored);
  assert.equal(restored.players[0].progress!.deadline, deadline);
});
test("host leave preserves countdown for the guest, and solo bot rematches require renewed readiness", () => {
  const g = solo();
  joinGame(g, "Guest", defaultAvatar(), "guest-token", "guest", T);
  act(g, "ready", T, { ready: true });
  act(g, "ready", T, { ready: true }, "guest-token");
  act(g, "leave", T + 2000);
  assert.equal(g.hostId, "guest");
  assert.equal(g.entryAt, T + 10000);
  advanceClock(g, T + 10000);
  assert.equal(g.players.find((p) => p.id === "host")!.progress!.phase, "lost");
  assert.equal(snapshot(g, 1, T + 10000, "guest").phase, "main");
  advanceClock(g, T + 2000000);
  act(g, "rematch", T + 2000000, { ready: true }, "guest-token");
  assert.equal(g.phase, "lobby");
  assert.equal(g.players.filter((p) => p.kind === "bot").length, 7);
  assert.equal(g.players.find((p) => p.id === "guest")!.ready, false);
  act(g, "ready", T + 2000000, { ready: true }, "guest-token");
  assert.equal(g.phase, "loading");
  assert.equal(g.entryAt, T + 2010000);
});

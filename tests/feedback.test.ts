import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame, joinGame, mutateGame, phaseKey, snapshot, advanceClock } from "../lib/game.ts";
import { defaultAvatar } from "../lib/profiles.ts";
const T = 1000000;
test("streaks are cosmetic, private in Race, shared in Co-op, and replay safe", () => {
  for (const mode of ["race", "coop"] as const) {
    const g = createGame("ABCDEF", "Host", "junior", "host-token", "host", T, defaultAvatar(), { mode, fillBots:false });
    joinGame(g, "Guest", defaultAvatar(), "guest-token", "guest", T);
    g.players.forEach(p => p.ready = true);
    mutateGame(g, { op:"start", token:"host-token" }, T - 10000);
    advanceClock(g, T);
    const submit = (puzzleId:string, value:number, at:number, id:string) => mutateGame(g, { op:"answer", token:"host-token", puzzleId, answer:String(value), phaseKey:phaseKey(g,"host"), id }, at);
    submit("j0a", 26, T+1000, "one");
    const p = mode === "race" ? g.players[0].progress! : g;
    assert.equal(p.score, 100);
    assert.equal(p.deadline, T+260000);
    assert.equal(p.streak, 1);
    submit("j0a", 26, T+2000, "one");
    assert.equal(p.correctCount, 1);
    submit("j0b", 24, T+3000, "two");
    assert.equal(p.streak, 2);
    assert.equal(p.bestStreak, 2);
    submit("j0c", 0, T+4000, "wrong");
    assert.equal(p.streak, 0);
    assert.equal(p.bestStreak, 2);
    const me = snapshot(g, 1, T+4000, "host"), other = snapshot(g, 1, T+4000, "guest");
    assert.equal(me.lastAnswer?.correct, false);
    assert.equal(other.correctCount, mode === "race" ? 0 : 2);
    assert.equal(other.lastAnswer, mode === "race" ? null : me.lastAnswer);
    advanceClock(g, p.deadline!);
    assert.equal(p.streak, 0);
  }
});

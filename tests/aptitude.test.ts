import { test } from "node:test";
import assert from "node:assert/strict";
import { withAptitude } from "../lib/aptitude-puzzles.ts";
import { PUZZLES } from "../lib/puzzles.ts";
import { createGame } from "./legacy-game.ts";
import {
  joinGame,
  mutateGame,
  advanceClock,
  currentPuzzles,
  snapshot,
  phaseKey,
  normalizeGame,
} from "../lib/game.ts";
import { NEW_ROOM_SETTINGS } from "../lib/game-settings.ts";
import { defaultAvatar } from "../lib/profiles.ts";
import type { FamilyTreeDiagram } from "../lib/aptitude-types.ts";
import {
  ROOM_SCENES,
  DETENTION_SCENES,
  roomScene,
} from "../lib/room-scenes.ts";
import { existsSync } from "node:fs";

// Independently derive kinship from graph edges, rather than repeating the question's key.
function relationship(tree: FamilyTreeDiagram, from: string, to: string) {
  const id = (name: string) => tree.people.find((p) => p.name === name)!.id;
  const a = id(from),
    b = id(to);
  const parents = (x: string) =>
    tree.links
      .filter((l) => l.relation === "parent" && l.to === x)
      .map((l) => l.from);
  const siblings = (x: string, y: string) =>
    x !== y &&
    (tree.links.some(
      (l) =>
        l.relation === "sibling" &&
        ((l.from === x && l.to === y) || (l.from === y && l.to === x)),
    ) ||
      parents(x).some((p) => parents(y).includes(p)));
  const female = ["Woman", "Daughter"].includes(
    tree.people.find((p) => p.id === a)!.detail,
  );
  if (parents(b).some((p) => parents(p).includes(a))) return "Grandfather";
  if (parents(b).some((p) => siblings(a, p))) return female ? "Aunt" : "Uncle";
  if (parents(a).some((p) => siblings(b, p)))
    return female ? "Niece" : "Nephew";
  if (parents(a).some((p) => parents(b).some((q) => siblings(p, q))))
    return "Cousin";
  assert.fail("Unexpected family graph");
}
test("mixed banks retain two math locks per room and have independently correct aptitude choices across 500 seeds", () => {
  const familyAnswers = new Set<string>();
  for (const difficulty of ["junior", "senior"] as const)
    for (let n = 1; n <= 500; n++) {
      const seed = Math.imul(n, 2654435761) >>> 0;
      const bank = withAptitude(PUZZLES[difficulty], difficulty, seed);
      assert.deepEqual(
        bank,
        withAptitude(PUZZLES[difficulty], difficulty, seed),
      );
      assert.equal(bank.flat().length, 15);
      bank.forEach((room, i) => {
        assert.deepEqual(room.slice(0, 2), PUZZLES[difficulty][i].slice(0, 2));
        const q = room[2],
          choices = q.choices!;
        assert.equal(new Set(choices).size, 4);
        assert.ok(Number.isInteger(q.answer) && q.answer >= 1 && q.answer <= 4);
        const selected = choices[q.answer - 1];
        if (i === 0) {
          const [, from, to] = q.prompt.match(
            /How is (\w+) related to (\w+)\?/,
          )!;
          assert.equal(selected, relationship(q.diagram!, from, to));
          familyAnswers.add(selected);
          const nodes = new Set(q.diagram!.people.map((p) => p.id));
          assert.ok(
            q.diagram!.links.every((l) => nodes.has(l.from) && nodes.has(l.to)),
          );
        } else if (i === 1) {
          const compass = ["north", "east", "south", "west"];
          const start = compass.indexOf(q.prompt.match(/face (\w+)/)![1]);
          const turns = [...q.prompt.matchAll(/90° (right|left)/g)].map((m) =>
            m[1] === "right" ? 1 : -1,
          );
          assert.equal(
            selected.toLowerCase(),
            compass[(start + turns.reduce((a, b) => a + b, 0) + 8) % 4],
          );
        } else if (i === 2) {
          const [front, back] = q.prompt.match(/\d+/g)!.map(Number);
          assert.equal(Number(selected), front + back - 1);
        } else if (i === 3) {
          const letters = q.prompt
            .match(/shows (.*), __/)![1]
            .split(", ")
            .map((x) => x.charCodeAt(0));
          const last = letters[3] - letters[2],
            prior = letters[2] - letters[1];
          const next = difficulty === "junior" ? last : last + (last - prior);
          assert.equal(selected.charCodeAt(0), letters[3] + next);
        } else
          assert.equal(
            selected,
            difficulty === "junior"
              ? "Mira wears an ID badge"
              : "No prism card opens the red vault",
          );
        assert.ok(q.solution.startsWith(selected + "."));
      });
    }
  assert.deepEqual([...familyAnswers].sort(), [
    "Aunt",
    "Cousin",
    "Grandfather",
    "Niece",
    "Uncle",
  ]);
});
const T = 1000000;
function fixture(mode: "race" | "coop" = "race", bots = false) {
  const g = createGame(
    "ABCDEF",
    "Host",
    "junior",
    "h-token",
    "h",
    T,
    defaultAvatar(),
    { mode, fillBots: bots, aptitudePuzzles: true, freshPuzzles: true },
  );
  joinGame(g, "Guest", defaultAvatar(), "b-token", "b", T);
  g.players.forEach((p) => (p.ready = true));
  mutateGame(g, { op: "start", token: "h-token" }, T);
  advanceClock(g, T + 10000);
  return g;
}
test("choice submissions reject forged options, preserve normal penalties, replay safety, and Race privacy", () => {
  for (const mode of ["race", "coop"] as const) {
    let g = fixture(mode),
      q = currentPuzzles(g, g.players[0].progress)[2];
    const act = (answer: string, at: number, id = crypto.randomUUID()) =>
      mutateGame(
        g,
        {
          op: "answer",
          token: "h-token",
          puzzleId: q.id,
          answer,
          phaseKey: phaseKey(g, "h"),
          id,
        },
        at,
      );
    const initial = snapshot(g, 1, T + 10000, "h");
    for (const answer of ["0", "5", "2.5", "NaN", "A", "999"])
      assert.throws(() => act(answer, T + 10001), /displayed answer/);
    assert.equal(snapshot(g, 2, T + 10001, "h").wrongCount, 0);
    act(String((Number(q.answer) % 4) + 1), T + 11000);
    const wrong = snapshot(g, 3, T + 11000, "h");
    assert.equal(wrong.deadline, initial.deadline! - 10000);
    assert.equal(wrong.wrongCount, 1);
    act(String(q.answer), T + 12000, "correct");
    act(String(q.answer), T + 13000, "correct");
    const solved = snapshot(g, 4, T + 13000, "h"),
      other = snapshot(g, 4, T + 13000, "b");
    assert.equal(solved.score, 100);
    assert.equal(solved.puzzles[2].solution, q.solution);
    assert.equal(
      other.puzzles[2].solution,
      mode === "race" ? null : q.solution,
    );
    g = normalizeGame(JSON.parse(JSON.stringify(g)));
    assert.deepEqual(
      snapshot(g, 5, T + 13000, "h").puzzles[2],
      solved.puzzles[2],
    );
    const raw = JSON.stringify(other);
    for (const key of [
      '"answer"',
      '"puzzleRooms"',
      '"seed"',
      '"rng"',
      "h-token",
      "b-token",
    ])
      assert.ok(!raw.includes(key));
  }
});
test("legacy aptitude banks remain readable, new treasure rooms disable it, and old games retain their bank", () => {
  assert.equal(NEW_ROOM_SETTINGS.aptitudePuzzles, false);
  const g = fixture(),
    before = JSON.stringify(g.puzzleRooms);
  delete (g as Partial<typeof g>).aptitudePuzzles;
  normalizeGame(g);
  assert.equal(g.aptitudePuzzles, false);
  assert.equal(JSON.stringify(g.puzzleRooms), before);
  const math = createGame("ABCDEF", "Host", "junior", "h-token", "h", T);
  assert.equal(math.aptitudePuzzles, false);
  assert.ok(currentPuzzles(math).every((q) => !q.choices));
});
test("seeded bots process mixed-choice banks identically with frequent or delayed polling", () => {
  const fast = fixture("race", true),
    slow = structuredClone(fast);
  for (let at = T + 10000; at <= T + 900000; at += 1000) advanceClock(fast, at);
  advanceClock(slow, T + 900000);
  const digest = (g: typeof fast) =>
    g.players.map((p) => ({
      rng: p.rng,
      progress: { ...p.progress, events: [] },
      next: p.nextAttemptAt,
    }));
  assert.deepEqual(digest(fast), digest(slow));
  assert.ok(
    fast.players.some((p) => p.kind === "bot" && p.progress!.correctCount >= 3),
  );
});
test("all eight environments have unique local artwork and matching accessible search targets", () => {
  const scenes = [...ROOM_SCENES, ...DETENTION_SCENES];
  assert.equal(new Set(scenes.map((s) => s.image)).size, 8);
  for (const scene of scenes) {
    assert.ok(existsSync(new URL(`../public${scene.image}`, import.meta.url)));
    assert.ok(scene.alt.length > 40);
    assert.ok(
      scene.objects.every(
        (o) =>
          o.name && o.note && o.x >= 8 && o.x <= 92 && o.y >= 14 && o.y <= 82,
      ),
    );
  }
  for (let i = 0; i < 5; i++) assert.equal(roomScene(i), ROOM_SCENES[i]);
  for (let i = 1; i <= 3; i++)
    assert.equal(roomScene(0, i), DETENTION_SCENES[i - 1]);
});

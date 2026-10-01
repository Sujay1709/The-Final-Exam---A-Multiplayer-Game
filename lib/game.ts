import { PUZZLES, DETENTION, type Puzzle } from "./puzzles.ts";
import {
  ROOM_INFO,
  type Difficulty,
  type Player,
  type Snapshot,
  type Phase,
  type GameEvent,
} from "./game-types.ts";
interface PrivatePlayer extends Player {
  token: string;
  lastAnswer: number;
}
export interface GameState {
  code: string;
  difficulty: Difficulty;
  phase: Phase;
  roomIndex: number;
  hostId: string;
  players: PrivatePlayer[];
  score: number;
  punishment: number;
  deadline: number | null;
  solved: Record<string, string>;
  hinted: string[];
  events: GameEvent[];
  result: string | null;
  wrongCount: number;
  hintCount: number;
  run: number;
  receipts: string[];
  createdAt: number;
}
export interface Action {
  op: string;
  name?: string;
  difficulty?: string;
  token?: string;
  id?: string;
  puzzleId?: string;
  answer?: string;
  ready?: boolean;
  text?: string;
  phaseKey?: string;
}
export class GameError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export const phaseKey = (g: GameState) =>
  `${g.run}:${g.phase}:${g.roomIndex}:${g.punishment}`;
function event(
  g: GameState,
  text: string,
  kind: GameEvent["kind"],
  now: number,
) {
  g.events.push({ id: crypto.randomUUID(), text, kind, at: now });
  g.events = g.events.slice(-40);
}
function clearWorking(g: GameState) {
  g.players.forEach((p) => (p.working = null));
}
export function createGame(
  code: string,
  name: string,
  difficulty: Difficulty,
  token: string,
  id: string,
  now: number,
): GameState {
  return {
    code,
    difficulty,
    phase: "lobby",
    roomIndex: 0,
    hostId: id,
    players: [
      {
        id,
        name,
        token,
        ready: false,
        lastSeen: now,
        working: null,
        lastAnswer: 0,
      },
    ],
    score: 0,
    punishment: 0,
    deadline: null,
    solved: {},
    hinted: [],
    events: [],
    result: null,
    wrongCount: 0,
    hintCount: 0,
    run: 1,
    receipts: [],
    createdAt: now,
  };
}
export function currentPuzzles(g: GameState): Puzzle[] {
  return g.phase === "detention"
    ? DETENTION[g.punishment - 1]
    : PUZZLES[g.difficulty][g.roomIndex];
}
export function advanceClock(g: GameState, now: number) {
  if (
    (g.phase !== "main" && g.phase !== "detention") ||
    g.deadline === null ||
    now < g.deadline
  )
    return;
  clearWorking(g);
  if (g.phase === "detention") {
    g.phase = "lost";
    g.deadline = null;
    g.result =
      "Detention expired. Voss has kept your team for another semester.";
    event(g, g.result, "warning", now);
    return;
  }
  g.punishment++;
  g.score = Math.max(0, g.score - 100);
  if (g.punishment >= 4) {
    g.phase = "lost";
    g.deadline = null;
    g.result = "Four missed deadlines. The professor has ended the experiment.";
    event(g, g.result, "warning", now);
    return;
  }
  g.phase = "detention";
  g.deadline = now + [60, 90, 120][g.punishment - 1] * 1000;
  // Each detention visit starts afresh; main-room progress is retained.
  DETENTION[g.punishment - 1].forEach((p) => {
    delete g.solved[p.id];
    g.hinted = g.hinted.filter((id) => id !== p.id);
  });
  event(
    g,
    `Deadline missed. −100 points. Detention level ${g.punishment}: ${["Warning", "Detention", "Final probation"][g.punishment - 1]}.`,
    "warning",
    now,
  );
}
export function parseAnswer(input: unknown): number | null {
  if (typeof input !== "string" || input.length > 40) return null;
  const s = input.trim();
  if (
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\s*\/\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+))?$/.test(
      s,
    )
  )
    return null;
  const parts = s.split("/").map(Number);
  const n = parts.length === 2 ? parts[0] / parts[1] : parts[0];
  return Number.isFinite(n) ? n : null;
}
export function mutateGame(g: GameState, a: Action, now: number): GameState {
  const player = g.players.find((p) => p.token === a.token);
  if (!player)
    throw new GameError(
      "Your player session is invalid. Join again from the home screen.",
      401,
    );
  player.lastSeen = now;
  const connected = g.players.filter((p) => now - p.lastSeen < 30000);
  if (!connected.some((p) => p.id === g.hostId) && connected.length) {
    g.hostId = connected[0].id;
    event(g, `${connected[0].name} is now the host.`, "story", now);
  }
  advanceClock(g, now);
  if (a.op === "state") return g;
  if (a.id && g.receipts.includes(a.id)) return g;
  if (a.op === "ready") {
    if (g.phase !== "lobby")
      throw new GameError("The experiment has already started.");
    player.ready = !!a.ready;
  } else if (a.op === "start") {
    requireHost(g, player);
    if (g.phase !== "lobby") return g;
    if (g.players.length < 2 || g.players.length > 8)
      throw new GameError("Gather 2–8 players before starting.");
    if (g.players.some((p) => !p.ready || now - p.lastSeen > 30000))
      throw new GameError("Every player must be connected and ready.");
    g.phase = "main";
    g.deadline = now + 240000;
    event(g, ROOM_INFO[0].quote, "story", now);
  } else if (a.op === "next") {
    requireHost(g, player);
    if (g.phase !== "cleared")
      throw new GameError("Solve every lock before moving on.");
    g.roomIndex++;
    g.phase = "main";
    g.deadline = now + 240000;
    clearWorking(g);
    event(g, ROOM_INFO[g.roomIndex].quote, "story", now);
  } else if (a.op === "restart") {
    requireHost(g, player);
    if (g.phase !== "won" && g.phase !== "lost")
      throw new GameError("Finish the current experiment before restarting.");
    g.phase = "lobby";
    g.roomIndex = 0;
    g.score = 0;
    g.punishment = 0;
    g.deadline = null;
    g.solved = {};
    g.hinted = [];
    g.wrongCount = 0;
    g.hintCount = 0;
    g.run++;
    g.result = null;
    g.events = [];
    clearWorking(g);
    g.players.forEach((p) => {
      p.ready = false;
      p.lastAnswer = 0;
    });
  } else if (a.op === "leave") {
    if (g.players.length === 1) {
      g.phase = "lost";
      g.deadline = null;
      g.result = "All players left the experiment.";
    }
    g.players = g.players.filter((p) => p.id !== player.id);
    if (g.hostId === player.id && g.players.length) g.hostId = g.players[0].id;
    event(g, `${player.name} left the laboratory.`, "story", now);
  } else if (a.op === "chat") {
    if (typeof a.text !== "string" || !a.text.trim() || a.text.length > 240)
      throw new GameError("Messages must be 1–240 characters.");
    const last = g.events
      .filter((e) => e.kind === "chat" && e.text.startsWith(`${player.name}: `))
      .at(-1);
    if (last && now - last.at < 1000)
      throw new GameError(
        "Give your team a moment before sending another message.",
        429,
      );
    event(g, `${player.name}: ${a.text.trim()}`, "chat", now);
  } else if (["answer", "hint", "claim"].includes(a.op)) {
    if (g.phase !== "main" && g.phase !== "detention")
      throw new GameError("This room is no longer accepting answers.");
    if (a.phaseKey !== phaseKey(g))
      throw new GameError(
        "The room changed. Review the new puzzle before submitting.",
        409,
      );
    const puzzle = currentPuzzles(g).find((p) => p.id === a.puzzleId);
    if (!puzzle) throw new GameError("That lock does not belong to this room.");
    if (g.solved[puzzle.id]) return g;
    if (puzzle.requires?.some((id) => !g.solved[id]))
      throw new GameError("Solve both code fragments first.");
    if (a.op === "claim") {
      player.working = puzzle.id;
    }
    if (a.op === "hint" && !g.hinted.includes(puzzle.id)) {
      g.hinted.push(puzzle.id);
      g.hintCount++;
      g.deadline! -= 15000;
      event(g, `${player.name} revealed a hint. −15 seconds.`, "warning", now);
    }
    if (a.op === "answer") {
      const answer = parseAnswer(a.answer);
      if (answer === null)
        throw new GameError(
          "Enter a number, decimal, or fraction such as 3/8. Leave out units.",
        );
      if (now - player.lastAnswer < 800)
        throw new GameError("Take a moment before submitting again.", 429);
      player.lastAnswer = now;
      if (
        Math.abs(answer - puzzle.answer) <=
        1e-7 * Math.max(1, Math.abs(puzzle.answer))
      ) {
        g.solved[puzzle.id] = player.id;
        g.deadline! += 20000;
        g.players
          .filter((p) => p.working === puzzle.id)
          .forEach((p) => (p.working = null));
        if (g.phase === "main") g.score += 100;
        event(
          g,
          `${player.name} solved ${puzzle.title}. +20 seconds${g.phase === "main" ? ", +100 points" : ""}.`,
          "success",
          now,
        );
        if (currentPuzzles(g).every((p) => g.solved[p.id])) {
          if (g.phase === "detention") {
            g.phase = "main";
            g.deadline = now + 120000;
            clearWorking(g);
            event(
              g,
              "Detention cleared. Back to the unfinished room. You have two minutes.",
              "success",
              now,
            );
          } else {
            const bonus = Math.max(0, Math.floor((g.deadline! - now) / 1000));
            g.score += bonus;
            g.deadline = null;
            clearWorking(g);
            if (g.roomIndex === 4) {
              g.phase = "won";
              g.result =
                "The exit opens. Voss reads the letter and finally understands: his teammates never forgot him. You escaped together.";
              event(g, g.result, "success", now);
            } else {
              g.phase = "cleared";
              event(
                g,
                `Room cleared. +${bonus} time bonus points.`,
                "success",
                now,
              );
            }
          }
        }
      } else {
        g.wrongCount++;
        g.deadline! -= 10000;
        event(
          g,
          `${player.name}: incorrect answer to ${puzzle.title}. −10 seconds.`,
          "warning",
          now,
        );
      }
    }
    advanceClock(g, now);
  } else throw new GameError("Unknown game action.");
  if (a.id) {
    g.receipts.push(a.id);
    g.receipts = g.receipts.slice(-64);
  }
  return g;
}
function requireHost(g: GameState, p: PrivatePlayer) {
  if (g.hostId !== p.id) throw new GameError("Only the host can do that.", 403);
}
export function snapshot(g: GameState, version: number, now: number): Snapshot {
  const end = g.phase === "won" || g.phase === "lost";
  return {
    code: g.code,
    difficulty: g.difficulty,
    phase: g.phase,
    roomIndex: g.roomIndex,
    hostId: g.hostId,
    score: g.score,
    punishment: g.punishment,
    deadline: g.deadline,
    serverNow: now,
    version,
    run: g.run,
    players: g.players.map(({ id, name, ready, lastSeen, working }) => ({
      id,
      name,
      ready,
      lastSeen,
      working,
    })),
    puzzles:
      g.phase === "lobby"
        ? []
        : currentPuzzles(g).map((p) => ({
            id: p.id,
            title: p.title,
            topic: p.topic,
            prompt: p.prompt,
            solved: !!g.solved[p.id],
            solvedBy: g.solved[p.id] ?? null,
            hint: g.hinted.includes(p.id) || end ? p.hint : null,
            solution: g.solved[p.id] || end ? p.solution : null,
            locked: !!p.requires?.some((id) => !g.solved[id]),
          })),
    solvedCount: Object.keys(g.solved).filter((id) => !id.startsWith("d"))
      .length,
    wrongCount: g.wrongCount,
    hintCount: g.hintCount,
    events: g.events,
    result: g.result,
  };
}

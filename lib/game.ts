import { PUZZLES, DETENTION, type Puzzle } from "./puzzles.ts";
import { generatePuzzleRooms } from "./puzzle-variations.ts";
import {
  ROOM_INFO,
  type Difficulty,
  type Player,
  type Snapshot,
  type Phase,
  type GameEvent,
  type AnswerFeedback,
  type SeriesView,
} from "./game-types.ts";
import {
  defaultAvatar,
  validateAvatar,
  type AvatarProfile,
} from "./profiles.ts";
import {
  GAME_RULES,
  LAB_ENTRY_SECONDS,
  minimumHumans,
  BOT_RULES,
  validateSettings,
  type GameSettings,
} from "./game-settings.ts";

// The same rules operate on shared co-op progress or one private racer.
export interface Progress {
  phase: Phase;
  startedAt: number | null;
  roomIndex: number;
  score: number;
  punishment: number;
  deadline: number | null;
  solved: Record<string, string>;
  hinted: string[];
  discovered: string[];
  events: GameEvent[];
  result: string | null;
  correctCount: number;
  streak: number;
  bestStreak: number;
  lastAnswerFeedback: AnswerFeedback | null;
  wrongCount: number;
  hintCount: number;
  nextRoomAt: number | null;
  finishedAt: number | null;
  place: number | null;
}
export interface PrivatePlayer extends Player {
  token: string;
  lastAnswer: number;
  progress?: Progress;
  rng?: number;
  nextAttemptAt?: number | null;
}
export interface GameState extends Progress, GameSettings {
  code: string;
  difficulty: Difficulty;
  hostId: string;
  players: PrivatePlayer[];
  run: number;
  receipts: string[];
  createdAt: number;
  seed: number;
  winnerId: string | null;
  finishCount: number;
  puzzleRooms?: Puzzle[][];
  series: SeriesView | null;
  rematchVotes: string[];
  entryAt: number | null;
}
export interface Action extends Partial<GameSettings> {
  op: string;
  name?: string;
  avatar?: unknown;
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
const terminal = (p: Progress) => p.phase === "won" || p.phase === "lost";
const freshProgress = (): Progress => ({
  phase: "lobby",
  startedAt: null,
  roomIndex: 0,
  score: 0,
  punishment: 0,
  deadline: null,
  solved: {},
  hinted: [],
  discovered: [],
  events: [],
  result: null,
  correctCount: 0,
  streak: 0,
  bestStreak: 0,
  lastAnswerFeedback: null,
  wrongCount: 0,
  hintCount: 0,
  nextRoomAt: null,
  finishedAt: null,
  place: null,
});
export const phaseKey = (g: GameState, playerId?: string) => {
  const p =
    g.mode === "race" && playerId
      ? (g.players.find((x) => x.id === playerId)?.progress ?? g)
      : g;
  return `${g.run}:${p.phase}:${p.roomIndex}:${p.punishment}`;
};
function event(
  p: Progress,
  text: string,
  kind: GameEvent["kind"],
  now: number,
) {
  p.events.push({ id: crypto.randomUUID(), text, kind, at: now });
  p.events = p.events.slice(-40);
}
export function normalizeGame(g: GameState): GameState {
  // Old JSON rooms preserve their approved cooperative rules.
  g.mode ??= "coop";
  g.gameDifficulty ??= "medium";
  g.botSkill ??= "medium";
  g.fillBots ??= false;
  g.freshPuzzles ??= false;
  g.bestOfThree ??= false;
  g.series ??= null;
  // Readiness from the old host-start lobby does not imply consent to an
  // automatic start after an upgrade. Existing active deadlines remain intact.
  if (g.entryAt === undefined && g.phase === "lobby")
    g.players.filter((p) => p.kind !== "bot").forEach((p) => (p.ready = false));
  g.entryAt ??= null;
  g.rematchVotes ??= [];
  g.seed ??= 1;
  g.winnerId ??= null;
  g.finishCount ??= 0;
  g.nextRoomAt ??= null;
  g.finishedAt ??= null;
  g.place ??= null;
  const normalizeProgress = (p: Progress) => {
    p.startedAt ??= null;
    p.discovered ??= [];
    p.correctCount ??= Object.keys(p.solved).length;
    p.streak ??= 0;
    p.bestStreak ??= 0;
    p.lastAnswerFeedback ??= null;
  };
  normalizeProgress(g);
  g.players.forEach((p) => {
    if (p.progress) normalizeProgress(p.progress);
    p.kind ??= "human";
    p.avatar ??= defaultAvatar();
  });
  return g;
}
export function createGame(
  code: string,
  name: string,
  difficulty: Difficulty,
  token: string,
  id: string,
  now: number,
  avatar: AvatarProfile = defaultAvatar(),
  settings: Partial<GameSettings> = {},
): GameState {
  const g: GameState = {
    ...freshProgress(),
    ...validateSettings(settings, {
      mode: "coop",
      gameDifficulty: "medium",
      botSkill: "medium",
      fillBots: false,
      freshPuzzles: false,
      bestOfThree: false,
    }),
    code,
    difficulty,
    hostId: id,
    players: [
      {
        id,
        name,
        kind: "human",
        avatar,
        token,
        ready: false,
        lastSeen: now,
        working: null,
        lastAnswer: 0,
      },
    ],
    run: 1,
    receipts: [],
    createdAt: now,
    seed: crypto.getRandomValues(new Uint32Array(1))[0] || 1,
    winnerId: null,
    finishCount: 0,
    series: null,
    rematchVotes: [],
    entryAt: null,
  };
  syncBots(g);
  return g;
}
export function syncBots(g: GameState) {
  const humans = g.players.filter((p) => p.kind !== "bot"),
    bots = g.players.filter((p) => p.kind === "bot");
  const count = g.mode === "race" && g.fillBots ? 8 - humans.length : 0;
  const names = ["Nova", "Kai", "Mira", "Echo", "Rin", "Axel", "Zuri", "Theo"];
  for (let i = bots.length; i < count; i++) {
    let seat = 0;
    while (bots.some((b) => b.id === `bot-${g.run}-${seat}`)) seat++;
    let name = `Voss ${names[seat % 8]}`;
    while (
      [...humans, ...bots].some(
        (p) => p.name.toLowerCase() === name.toLowerCase(),
      )
    )
      name += " B";
    bots.push({
      id: `bot-${g.run}-${seat}`,
      name,
      kind: "bot",
      avatar: defaultAvatar(seat),
      token: "",
      ready: true,
      lastSeen: g.createdAt,
      working: null,
      lastAnswer: 0,
      rng: (g.seed ^ ((seat + 1) * 2654435761)) >>> 0 || 1,
      nextAttemptAt: null,
    });
  }
  g.players = [...humans, ...bots.slice(0, count)];
}
export function joinGame(
  g: GameState,
  name: string,
  avatar: AvatarProfile,
  token: string,
  id: string,
  now: number,
) {
  normalizeGame(g);
  if (g.series && g.series.rounds.length && !g.series.complete)
    throw new GameError(
      "This rivalry has started. Join a new series instead.",
      409,
    );
  if (g.phase !== "lobby")
    throw new GameError(
      "This experiment has started. Reconnect on your original device.",
      409,
    );
  if (g.players.filter((p) => p.kind === "human").length >= 8)
    throw new GameError("This room is full (8 players).", 409);
  if (g.players.some((p) => p.name.toLowerCase() === name.toLowerCase()))
    throw new GameError(
      "That name is already in this room. Choose another.",
      409,
    );
  g.players.push({
    id,
    name,
    avatar,
    kind: "human",
    token,
    ready: false,
    lastSeen: now,
    working: null,
    lastAnswer: 0,
  });
  syncBots(g);
}
export function currentPuzzles(g: GameState, p: Progress = g): Puzzle[] {
  return p.phase === "detention"
    ? DETENTION[p.punishment - 1]
    : (g.puzzleRooms ?? PUZZLES[g.difficulty])[p.roomIndex];
}
function clearWorking(g: GameState, p: Progress) {
  g.players
    .filter((x) => g.mode === "coop" || x.progress === p)
    .forEach((x) => (x.working = null));
}
function timeout(g: GameState, p: Progress, at: number) {
  const rules = GAME_RULES[g.gameDifficulty];
  clearWorking(g, p);
  p.streak = 0;
  if (p.phase === "detention") {
    p.phase = "lost";
    if (g.mode === "coop") p.finishedAt = at;
    p.deadline = null;
    p.result = "Detention expired. Voss has kept you for another semester.";
    event(p, p.result, "warning", at);
    return;
  }
  p.punishment++;
  p.score = Math.max(0, p.score - 100);
  if (p.punishment >= 4) {
    p.phase = "lost";
    if (g.mode === "coop") p.finishedAt = at;
    p.deadline = null;
    p.result = "Four missed deadlines. The professor has ended the experiment.";
    event(p, p.result, "warning", at);
    return;
  }
  p.phase = "detention";
  p.deadline = at + rules.detention[p.punishment - 1] * 1000;
  DETENTION[p.punishment - 1].forEach((q) => {
    delete p.solved[q.id];
    p.hinted = p.hinted.filter((id) => id !== q.id);
  });
  event(
    p,
    `Deadline missed. −100 points. Detention level ${p.punishment}.`,
    "warning",
    at,
  );
}
function nextRoom(g: GameState, p: Progress, at: number) {
  p.roomIndex++;
  p.phase = "main";
  p.nextRoomAt = null;
  p.deadline = at + GAME_RULES[g.gameDifficulty].main * 1000;
  clearWorking(g, p);
  event(p, ROOM_INFO[p.roomIndex].quote, "story", at);
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
  const parts = s.split("/").map(Number),
    n = parts.length === 2 ? parts[0] / parts[1] : parts[0];
  return Number.isFinite(n) ? n : null;
}
function solve(
  g: GameState,
  p: Progress,
  player: PrivatePlayer,
  puzzle: Puzzle,
  value: number,
  at: number,
) {
  if (p.solved[puzzle.id]) return;
  if (!p.discovered.includes(puzzle.id)) p.discovered.push(puzzle.id);
  const rules = GAME_RULES[g.gameDifficulty];
  const correct =
    Math.abs(value - puzzle.answer) <=
    1e-7 * Math.max(1, Math.abs(puzzle.answer));
  p.lastAnswerFeedback = {
    id: `${g.run}:${player.id}:${p.correctCount + p.wrongCount + 1}`,
    puzzleId: puzzle.id,
    playerId: player.id,
    correct,
    main: p.phase === "main",
    at,
  };
  if (correct) {
    p.correctCount++;
    p.streak++;
    p.bestStreak = Math.max(p.bestStreak, p.streak);
    p.solved[puzzle.id] = player.id;
    p.deadline! += 20000;
    if (p.phase === "main") p.score += 100;
    g.players
      .filter(
        (x) =>
          (g.mode === "coop" || x.id === player.id) && x.working === puzzle.id,
      )
      .forEach((x) => (x.working = null));
    event(
      p,
      `${player.name} solved ${puzzle.title}. +20 seconds${p.phase === "main" ? ", +100 points" : ""}.`,
      "success",
      at,
    );
    if (currentPuzzles(g, p).every((q) => p.solved[q.id])) {
      if (p.phase === "detention") {
        p.phase = "main";
        p.deadline = at + rules.resume * 1000;
        clearWorking(g, p);
        event(
          p,
          `Detention cleared. ${rules.resume} seconds to finish the room.`,
          "success",
          at,
        );
      } else {
        const bonus = Math.max(0, Math.floor((p.deadline! - at) / 1000));
        p.score += bonus;
        p.deadline = null;
        clearWorking(g, p);
        if (p.roomIndex === 4) {
          p.phase = "won";
          if (g.mode === "coop") p.finishedAt = at;
          p.result =
            "The exit opens. Voss reads the letter and finally understands: his teammates never forgot him.";
          event(p, p.result, "success", at);
        } else {
          p.phase = "cleared";
          p.nextRoomAt = g.mode === "race" ? at + 3000 : null;
          event(p, `Room cleared. +${bonus} time bonus points.`, "success", at);
        }
      }
    }
  } else {
    p.wrongCount++;
    p.streak = 0;
    p.deadline! -= rules.wrong * 1000;
    event(
      p,
      `${player.name}: incorrect answer to ${puzzle.title}. −${rules.wrong} seconds.`,
      "warning",
      at,
    );
  }
  // A penalty crossing zero expires now, not at a retroactive timestamp.
  if (p.deadline !== null && p.deadline <= at) timeout(g, p, at);
}
function random(player: PrivatePlayer) {
  let x = player.rng!;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  player.rng = x >>> 0 || 1;
  return player.rng / 4294967296;
}
function schedule(g: GameState, p: PrivatePlayer, at: number) {
  const b = BOT_RULES[g.botSkill];
  p.nextAttemptAt =
    at + Math.round((b.min + (b.max - b.min) * random(p)) * 1000);
}
function settleRace(g: GameState, at: number) {
  for (const player of g.players) {
    const p = player.progress;
    if (!p || !terminal(p) || p.finishedAt !== null) continue;
    p.finishedAt = at;
    player.nextAttemptAt = null;
    if (p.phase === "won") {
      p.place = ++g.finishCount;
      g.winnerId ??= player.id;
      event(g, `${player.name} escaped in place ${p.place}.`, "success", at);
    }
  }
  if (
    g.phase !== "lobby" &&
    g.players.every((x) => x.progress && terminal(x.progress))
  ) {
    g.phase = g.winnerId ? "won" : "lost";
    g.result = g.winnerId
      ? "The race is complete."
      : "No one escaped the experiment.";
    recordSeriesRound(g);
  }
}
function canBegin(g: GameState, now: number) {
  const humans = g.players.filter((p) => p.kind === "human" && !p.left);
  return (
    humans.length >= minimumHumans(g) &&
    humans.length <= 8 &&
    humans.every((p) => p.ready && now - p.lastSeen < 30000)
  );
}
function beginCountdown(g: GameState, now: number) {
  g.puzzleRooms = g.freshPuzzles
    ? generatePuzzleRooms(
        g.difficulty,
        (g.seed ^ Math.imul(g.run, 2654435761)) >>> 0,
      )
    : undefined;
  g.phase = "loading";
  g.entryAt = now + LAB_ENTRY_SECONDS * 1000;
  if (g.bestOfThree && !g.series) {
    g.series = {
      round: 1,
      complete: false,
      championId: null,
      rounds: [],
      standings: g.players.map((p) => ({
        playerId: p.id,
        name: p.name,
        kind: p.kind,
        wins: 0,
      })),
    };
  }
  if (g.mode === "race")
    g.players.forEach((p) => {
      p.progress = { ...freshProgress(), phase: "loading" };
      p.nextAttemptAt = null;
    });
  event(
    g,
    "All humans ready. Voss is sealing the laboratory. Doors open in 10 seconds.",
    "story",
    now,
  );
}
function maybeBegin(g: GameState, now: number) {
  if (g.phase === "lobby" && canBegin(g, now)) beginCountdown(g, now);
}
function openLaboratory(g: GameState, at: number) {
  g.phase = "main";
  g.startedAt = at;
  g.entryAt = null;
  const enter = (p: Progress) => {
    p.phase = "main";
    p.startedAt = at;
    p.deadline = at + GAME_RULES[g.gameDifficulty].main * 1000;
    event(p, ROOM_INFO[0].quote, "story", at);
  };
  if (g.mode === "race")
    g.players
      .filter((p) => !p.left)
      .forEach((p) => {
        enter(p.progress!);
        if (p.kind === "bot") schedule(g, p, at);
      });
  else enter(g);
}
export function advanceClock(g: GameState, now: number) {
  normalizeGame(g);
  if (g.phase === "loading") {
    if (g.entryAt === null || now < g.entryAt) return;
    openLaboratory(g, g.entryAt);
  }
  if (g.mode === "coop") {
    // Catch up from actual deadlines, including a detention expiry while disconnected.
    while (
      (g.phase === "main" || g.phase === "detention") &&
      g.deadline !== null &&
      g.deadline <= now
    )
      timeout(g, g, g.deadline);
    return;
  }
  if (g.phase === "lobby" || terminal(g)) return;
  // Process a single chronological event stream; poll frequency cannot change bot results.
  while (true) {
    let due: {
      player: PrivatePlayer;
      at: number;
      kind: "deadline" | "next" | "bot";
      priority: number;
    } | null = null;
    for (const player of g.players) {
      const p = player.progress;
      if (!p || terminal(p)) continue;
      const candidates = [
        { at: p.deadline, kind: "deadline" as const, priority: 0 },
        { at: p.nextRoomAt, kind: "next" as const, priority: 1 },
        {
          at:
            player.kind === "bot" &&
            (p.phase === "main" || p.phase === "detention")
              ? player.nextAttemptAt
              : null,
          kind: "bot" as const,
          priority: 2,
        },
      ];
      for (const c of candidates)
        if (
          c.at !== null &&
          c.at !== undefined &&
          c.at <= now &&
          (!due ||
            c.at < due.at ||
            (c.at === due.at &&
              (c.priority < due.priority ||
                (c.priority === due.priority && player.id < due.player.id))))
        )
          due = { player, at: c.at, kind: c.kind, priority: c.priority };
    }
    if (!due) break;
    const { player, at, kind } = due,
      p = player.progress!;
    if (kind === "deadline") {
      timeout(g, p, at);
      // A main-room attempt cannot spill into the newly entered detention.
      if (player.kind === "bot" && !terminal(p)) schedule(g, player, at);
    } else if (kind === "next") {
      nextRoom(g, p, at);
      if (player.kind === "bot") schedule(g, player, at);
    } else {
      const q = currentPuzzles(g, p).find(
        (q) => !p.solved[q.id] && !q.requires?.some((id) => !p.solved[id]),
      );
      if (q)
        solve(
          g,
          p,
          player,
          q,
          random(player) < BOT_RULES[g.botSkill].accuracy
            ? q.answer
            : q.answer + 1,
          at,
        );
      if (!terminal(p) && p.phase !== "cleared") schedule(g, player, at);
      else player.nextAttemptAt = null;
    }
    settleRace(g, at);
    if (terminal(g)) break;
  }
}
function recordSeriesRound(g: GameState) {
  const series = g.series;
  if (!series || !terminal(g) || series.rounds.some((r) => r.run === g.run))
    return;
  const winner = g.players.find((p) => p.id === g.winnerId);
  series.rounds.push({
    run: g.run,
    round: series.round,
    winnerId: g.winnerId,
    winnerName: winner?.name ?? null,
  });
  if (winner) {
    const standing = series.standings.find((p) => p.playerId === winner.id);
    if (standing) standing.wins++;
  }
  const maxWins = Math.max(0, ...series.standings.map((p) => p.wins));
  series.complete = maxWins >= 2 || series.rounds.length >= 3;
  if (series.complete) {
    const leaders = series.standings.filter((p) => p.wins === maxWins);
    series.championId =
      maxWins > 0 && leaders.length === 1 ? leaders[0].playerId : null;
  }
}
function resetRound(g: GameState) {
  Object.assign(g, freshProgress());
  g.run++;
  g.winnerId = null;
  g.finishCount = 0;
  g.receipts = [];
  g.rematchVotes = [];
  g.entryAt = null;
  g.puzzleRooms = undefined;
  if (g.series && !g.series.complete) g.series.round++;
  g.players = g.players.filter((p) => !p.left);
  g.players.forEach((p) => {
    p.ready = false;
    p.lastAnswer = 0;
    p.working = null;
    delete p.progress;
    p.nextAttemptAt = null;
  });
  syncBots(g);
}
function maybeRematch(g: GameState, now: number) {
  if (!terminal(g) || g.series?.complete) return;
  const humans = g.players.filter((p) => p.kind === "human" && !p.left);
  if (
    humans.length < minimumHumans(g) ||
    humans.some(
      (p) => now - p.lastSeen >= 30000 || !g.rematchVotes.includes(p.id),
    )
  )
    return;
  resetRound(g);
}
function requireHost(g: GameState, p: PrivatePlayer) {
  if (g.hostId !== p.id || p.kind !== "human")
    throw new GameError("Only the host can do that.", 403);
}
export function mutateGame(g: GameState, a: Action, now: number): GameState {
  normalizeGame(g);
  const player = g.players.find(
    (p) => p.kind === "human" && !p.left && p.token === a.token,
  );
  if (!player)
    throw new GameError(
      "Your player session is invalid. Join again from the home screen.",
      401,
    );
  player.lastSeen = now;
  const humans = g.players.filter((p) => p.kind === "human" && !p.left),
    connected = humans.filter((p) => now - p.lastSeen < 30000);
  if (!connected.some((p) => p.id === g.hostId) && connected.length) {
    g.hostId = connected[0].id;
    event(g, `${connected[0].name} is now the host.`, "story", now);
  }
  advanceClock(g, now);
  if (a.op === "state") {
    maybeRematch(g, now);
    maybeBegin(g, now);
    return g;
  }
  const receipt = a.id ? `${player.id}:${a.id}` : null;
  if (receipt && g.receipts.includes(receipt)) return g;
  const p = g.mode === "race" ? (player.progress ?? g) : g;
  if (a.op === "profile") {
    if (g.phase !== "lobby")
      throw new GameError("Character changes are available in the lobby.");
    const name =
      typeof a.name === "string" ? a.name.trim().replace(/\s+/g, " ") : "";
    if (!name || name.length > 20)
      throw new GameError("Choose a name with 1–20 characters.");
    if (
      g.players.some(
        (x) =>
          x.id !== player.id && x.name.toLowerCase() === name.toLowerCase(),
      )
    )
      throw new GameError(
        "That alias is already in this room. Choose another.",
        409,
      );
    let avatar: AvatarProfile;
    try {
      avatar = validateAvatar(a.avatar);
    } catch (e) {
      throw new GameError((e as Error).message);
    }
    player.name = name;
    player.avatar = avatar;
  } else if (a.op === "settings") {
    requireHost(g, player);
    if (g.phase !== "lobby")
      throw new GameError("Room settings can change only in the lobby.");
    if (g.series && g.series.rounds.length && !g.series.complete)
      throw new GameError(
        "Room settings stay fixed during a rivalry. End it to change them.",
      );
    let settings: GameSettings;
    try {
      settings = validateSettings({
        mode: a.mode ?? g.mode,
        gameDifficulty: a.gameDifficulty ?? g.gameDifficulty,
        botSkill: a.botSkill ?? g.botSkill,
        fillBots: a.fillBots ?? g.fillBots,
        freshPuzzles: a.freshPuzzles ?? g.freshPuzzles,
        bestOfThree: a.bestOfThree ?? g.bestOfThree,
      });
    } catch (e) {
      throw new GameError((e as Error).message);
    }
    if (
      a.difficulty !== undefined &&
      !["junior", "senior"].includes(a.difficulty)
    )
      throw new GameError("Choose Junior or Senior.");
    Object.assign(g, settings);
    if (a.difficulty) g.difficulty = a.difficulty as Difficulty;
    humans.forEach((x) => (x.ready = false));
    syncBots(g);
    event(
      g,
      "Room settings changed. Humans must ready up again.",
      "story",
      now,
    );
  } else if (a.op === "ready") {
    if (g.phase !== "lobby")
      throw new GameError("The experiment has already started.");
    if (typeof a.ready !== "boolean")
      throw new GameError("Choose whether you are ready.");
    player.ready = a.ready;
  } else if (a.op === "start") {
    requireHost(g, player);
    if (g.phase !== "lobby") return g;
    if (humans.length < minimumHumans(g) || humans.length > 8)
      throw new GameError(
        g.mode === "race" && g.fillBots
          ? "Gather 1–8 human players before starting a bot race."
          : "Gather 2–8 human players before starting.",
      );
    if (!canBegin(g, now))
      throw new GameError("Every human player must be connected and ready.");
    beginCountdown(g, now);
  } else if (a.op === "next") {
    requireHost(g, player);
    if (g.mode === "race")
      throw new GameError(
        "Race rooms advance automatically after three seconds.",
      );
    if (g.phase !== "cleared")
      throw new GameError("Solve every lock before moving on.");
    nextRoom(g, g, now);
  } else if (a.op === "restart") {
    requireHost(g, player);
    if (!terminal(g))
      throw new GameError("Finish the current experiment before restarting.");
    if (g.series && !g.series.complete)
      throw new GameError(
        "Vote for the next round or explicitly end the rivalry.",
      );
    g.series = null;
    resetRound(g);
  } else if (a.op === "endSeries") {
    requireHost(g, player);
    if (a.phaseKey !== phaseKey(g, player.id))
      throw new GameError(
        "The round changed. Review the current results.",
        409,
      );
    if (!terminal(g) || !g.series)
      throw new GameError(
        "Finish the current round before ending the rivalry.",
      );
    g.series = null;
    g.bestOfThree = false;
    resetRound(g);
  } else if (a.op === "rematch") {
    if (a.phaseKey !== phaseKey(g, player.id))
      throw new GameError(
        "The round changed. Review the current results.",
        409,
      );
    if (!terminal(g))
      throw new GameError(
        "Wait for every racer to finish or leave before voting.",
      );
    if (g.series?.complete)
      throw new GameError(
        "The rivalry is complete. The host can start a new series.",
      );
    if (typeof a.ready !== "boolean")
      throw new GameError("Choose whether to vote for a rematch.");
    g.rematchVotes = g.rematchVotes.filter((id) => id !== player.id);
    if (a.ready) g.rematchVotes.push(player.id);
    maybeRematch(g, now);
  } else if (a.op === "leave") {
    if (g.mode === "race" && player.progress && !terminal(player.progress)) {
      player.progress.phase = "lost";
      player.progress.deadline = null;
      player.progress.result = "You left the race.";
      settleRace(g, now);
    }
    if (g.mode === "race" && g.phase !== "lobby") {
      player.left = true;
      player.token = "";
    } else g.players = g.players.filter((x) => x.id !== player.id);
    const remaining = g.players.filter((x) => x.kind === "human" && !x.left);
    if (g.hostId === player.id) g.hostId = remaining[0]?.id ?? "";
    if (!remaining.length) {
      g.phase = g.winnerId ? "won" : "lost";
      g.deadline = null;
      g.result = "All human players left the experiment.";
      g.entryAt = null;
      g.players.forEach((x) => {
        x.nextAttemptAt = null;
        if (x.progress && !terminal(x.progress)) {
          x.progress.phase = "lost";
          x.progress.deadline = null;
          x.progress.finishedAt = now;
        }
      });
    } else if (g.phase === "lobby") syncBots(g);
    else if (g.mode === "race") settleRace(g, now);
    g.rematchVotes = g.rematchVotes.filter((id) => id !== player.id);
    recordSeriesRound(g);
    maybeRematch(g, now);
    event(g, `${player.name} left the laboratory.`, "story", now);
  } else if (a.op === "chat") {
    if (typeof a.text !== "string" || !a.text.trim() || a.text.length > 240)
      throw new GameError("Messages must be 1–240 characters.");
    const last = g.events
      .filter((e) => e.kind === "chat" && e.text.startsWith(`${player.name}: `))
      .at(-1);
    if (last && now - last.at < 1000)
      throw new GameError(
        "Give the room a moment before sending another message.",
        429,
      );
    event(g, `${player.name}: ${a.text.trim()}`, "chat", now);
  } else if (["answer", "hint", "claim"].includes(a.op)) {
    if (p.phase !== "main" && p.phase !== "detention")
      throw new GameError("This room is no longer accepting answers.");
    if (a.phaseKey !== phaseKey(g, player.id))
      throw new GameError(
        "The room changed. Review the new puzzle before submitting.",
        409,
      );
    const q = currentPuzzles(g, p).find((q) => q.id === a.puzzleId);
    if (!q) throw new GameError("That lock does not belong to this room.");
    if (p.solved[q.id]) return g;
    if (q.requires?.some((id) => !p.solved[id]))
      throw new GameError("Solve both code fragments first.");
    if (!p.discovered.includes(q.id)) p.discovered.push(q.id);
    if (a.op === "claim") player.working = q.id;
    if (a.op === "hint" && !p.hinted.includes(q.id)) {
      p.hinted.push(q.id);
      p.hintCount++;
      p.deadline! -= GAME_RULES[g.gameDifficulty].hint * 1000;
      event(
        p,
        `${player.name} revealed a hint. −${GAME_RULES[g.gameDifficulty].hint} seconds.`,
        "warning",
        now,
      );
      if (p.deadline! <= now) timeout(g, p, now);
    }
    if (a.op === "answer") {
      const value = parseAnswer(a.answer);
      if (value === null)
        throw new GameError(
          "Enter a number, decimal, or fraction such as 3/8. Leave out units.",
        );
      if (now - player.lastAnswer < 800)
        throw new GameError("Take a moment before submitting again.", 429);
      player.lastAnswer = now;
      solve(g, p, player, q, value, now);
    }
    if (g.mode === "race") settleRace(g, now);
  } else throw new GameError("Unknown game action.");
  maybeBegin(g, now);
  if (receipt) {
    g.receipts.push(receipt);
    g.receipts = g.receipts.slice(-512);
  }
  return g;
}
export function snapshot(
  g: GameState,
  version: number,
  now: number,
  viewerId?: string,
): Snapshot {
  normalizeGame(g);
  const viewer = g.players.find((x) => x.id === viewerId);
  // A race snapshot requires an authenticated viewer. No implicit first-player fallback.
  if (g.mode === "race" && g.phase !== "lobby" && !viewer)
    throw new GameError("Missing race viewer.", 401);
  const p = g.mode === "race" ? (viewer?.progress ?? g) : g,
    end = terminal(p);
  const locks = (x: Progress) =>
    Object.keys(x.solved).filter((id) => !id.startsWith("d")).length;
  const leaderboard =
    g.mode === "race"
      ? g.players
          .map((x) => ({
            playerId: x.id,
            phase: x.left ? ("left" as const) : (x.progress?.phase ?? "lobby"),
            roomIndex: x.progress?.roomIndex ?? 0,
            solvedCount: x.progress ? locks(x.progress) : 0,
            score: x.progress?.score ?? 0,
            punishment: x.progress?.punishment ?? 0,
            finishedAt: x.progress?.finishedAt ?? null,
            place: x.progress?.place ?? null,
          }))
          .sort(
            (a, b) =>
              (a.place ?? Infinity) - (b.place ?? Infinity) ||
              (a.phase === "lost" || a.phase === "left" ? 1 : 0) -
                (b.phase === "lost" || b.phase === "left" ? 1 : 0) ||
              b.solvedCount - a.solvedCount ||
              b.score - a.score ||
              a.playerId.localeCompare(b.playerId),
          )
      : [];
  const review = (g.puzzleRooms ?? PUZZLES[g.difficulty]).flatMap(
    (questions, i) =>
      questions
        .filter((q) => p.solved[q.id])
        .map((q) => ({
          id: q.id,
          title: q.title,
          prompt: q.prompt,
          solution: q.solution,
          room: ROOM_INFO[i].title,
        })),
  );
  return {
    code: g.code,
    difficulty: g.difficulty,
    mode: g.mode,
    gameDifficulty: g.gameDifficulty,
    botSkill: g.botSkill,
    fillBots: g.fillBots,
    freshPuzzles: g.freshPuzzles,
    bestOfThree: g.bestOfThree,
    series: g.series
      ? {
          ...g.series,
          rounds: g.series.rounds.map((r) => ({ ...r })),
          standings: g.series.standings
            .map((s) => ({
              ...s,
              name: g.players.find((p) => p.id === s.playerId)?.name ?? s.name,
            }))
            .sort(
              (a, b) => b.wins - a.wins || a.playerId.localeCompare(b.playerId),
            ),
        }
      : null,
    rematchVotes: [...g.rematchVotes],
    accuracy:
      p.correctCount + p.wrongCount > 0
        ? p.correctCount / (p.correctCount + p.wrongCount)
        : null,
    elapsedSeconds:
      p.startedAt !== null
        ? Math.max(0, Math.floor(((p.finishedAt ?? now) - p.startedAt) / 1000))
        : null,
    phase: p.phase,
    roomIndex: p.roomIndex,
    hostId: g.hostId,
    score: p.score,
    punishment: p.punishment,
    deadline: p.deadline,
    entryAt: g.phase === "loading" ? g.entryAt : null,
    discovered: [...p.discovered],
    serverNow: now,
    version,
    run: g.run,
    matchComplete: terminal(g),
    winnerId: g.winnerId,
    leaderboard,
    review,
    nextRoomAt: p.nextRoomAt,
    players: g.players.map((x) => ({
      id: x.id,
      name: x.name,
      kind: x.kind,
      left: !!x.left,
      avatar: x.avatar,
      ready: x.ready,
      lastSeen: x.kind === "bot" ? now : x.lastSeen,
      working: g.mode === "race" && x.id !== viewerId ? null : x.working,
    })),
    puzzles:
      p.phase === "lobby" || p.phase === "loading"
        ? []
        : currentPuzzles(g, p).map((q) => ({
            id: q.id,
            title: q.title,
            topic: q.topic,
            prompt: q.prompt,
            solved: !!p.solved[q.id],
            solvedBy: p.solved[q.id] ?? null,
            hint: p.hinted.includes(q.id) || end ? q.hint : null,
            solution: p.solved[q.id] || end ? q.solution : null,
            locked: !!q.requires?.some((id) => !p.solved[id]),
          })),
    solvedCount: locks(p),
    correctCount: p.correctCount,
    streak: p.streak,
    bestStreak: p.bestStreak,
    lastAnswer: p.lastAnswerFeedback,
    wrongCount: p.wrongCount,
    hintCount: p.hintCount,
    events: (p === g ? g.events : [...g.events, ...p.events])
      .sort((a, b) => a.at - b.at)
      .slice(-40),
    result: p.result,
  };
}

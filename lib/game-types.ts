import type { AvatarProfile } from "./profiles.ts";
export type Difficulty = "junior" | "senior";
export type Phase = "lobby" | "main" | "detention" | "cleared" | "won" | "lost";
export interface Player {
  id: string;
  name: string;
  avatar: AvatarProfile;
  ready: boolean;
  lastSeen: number;
  working: string | null;
}
export interface PuzzleView {
  id: string;
  title: string;
  topic: string;
  prompt: string;
  solved: boolean;
  solvedBy: string | null;
  hint: string | null;
  solution: string | null;
  locked: boolean;
}
export interface GameEvent {
  id: string;
  text: string;
  kind: "story" | "success" | "warning" | "chat";
  at: number;
}
export interface Snapshot {
  code: string;
  difficulty: Difficulty;
  phase: Phase;
  roomIndex: number;
  hostId: string;
  players: Player[];
  score: number;
  punishment: number;
  deadline: number | null;
  serverNow: number;
  version: number;
  run: number;
  puzzles: PuzzleView[];
  solvedCount: number;
  wrongCount: number;
  hintCount: number;
  events: GameEvent[];
  result: string | null;
}
export interface Session {
  code: string;
  token: string;
  playerId: string;
}
export const ROOM_INFO = [
  {
    title: "The Locked Classroom",
    topic: "Arithmetic & patterns",
    quote:
      "A reunion? How touching. Take your seats. The door has other plans.",
    story:
      "The invitation promised a reunion dinner. Instead, three locks click shut. Voss's old grade book sits open: your names are circled in green ink.",
  },
  {
    title: "The Fraction Factory",
    topic: "Fractions, ratios & percentages",
    quote: "You took your share of my research. Now calculate mine.",
    story:
      "Behind the door: a laboratory of strange mixtures and incorrectly labelled bottles. An old photograph shows your college team celebrating a research prize. Voss has been cut out.",
  },
  {
    title: "The Algebra Alarm",
    topic: "Equations & powers",
    quote: "There are unknowns in every betrayal. Find them.",
    story:
      "The alarms hum in unison. A framed research paper bears every teammate's name except Voss's. Below it is his handwritten draft, dated a year earlier.",
  },
  {
    title: "The Geometry Trap",
    topic: "Angles & measurements",
    quote: "Every friendship has an angle. Mine was apparently zero.",
    story:
      "A grid of lights divides the laboratory. Beyond it, an unopened envelope reads: 'Elias, we tried to tell you.' Three measurements stand between you and the letter.",
  },
  {
    title: "The Final Exam",
    topic: "The ultimate mixed challenge",
    quote: "One final answer. Then we will see who deserves to leave.",
    story:
      "The letter reveals a printing error: his name was omitted, and the team tried to correct it. Voss never opened their messages. Solve the final locks and show him that cooperation was the answer all along.",
  },
] as const;
export const PUNISHMENT_NAMES = [
  "Clear record",
  "Warning",
  "Detention",
  "Final probation",
];

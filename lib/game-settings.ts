export type GameMode = "coop" | "race";
export type Skill = "easy" | "medium" | "hard";
export interface GameSettings {
  mode: GameMode;
  gameDifficulty: Skill;
  botSkill: Skill;
  fillBots: boolean;
  freshPuzzles: boolean;
  bestOfThree: boolean;
}
export const NEW_ROOM_SETTINGS: GameSettings = {
  mode: "race",
  gameDifficulty: "medium",
  botSkill: "medium",
  fillBots: true,
  freshPuzzles: true,
  bestOfThree: false,
};
export const GAME_RULES = {
  easy: {
    main: 300,
    wrong: 5,
    hint: 10,
    detention: [90, 120, 150],
    resume: 150,
  },
  medium: {
    main: 240,
    wrong: 10,
    hint: 15,
    detention: [60, 90, 120],
    resume: 120,
  },
  hard: { main: 180, wrong: 15, hint: 20, detention: [45, 60, 90], resume: 90 },
} as const;
export const BOT_RULES = {
  easy: { min: 25, max: 45, accuracy: 0.55 },
  medium: { min: 14, max: 25, accuracy: 0.75 },
  hard: { min: 8, max: 16, accuracy: 0.9 },
} as const;
export function validateSettings(
  value: Partial<GameSettings>,
  defaults = NEW_ROOM_SETTINGS,
): GameSettings {
  const s = { ...defaults, ...value };
  if (
    !["coop", "race"].includes(s.mode) ||
    !["easy", "medium", "hard"].includes(s.gameDifficulty) ||
    !["easy", "medium", "hard"].includes(s.botSkill) ||
    typeof s.fillBots !== "boolean" ||
    typeof s.freshPuzzles !== "boolean" ||
    typeof s.bestOfThree !== "boolean"
  )
    throw new Error("Choose valid room settings.");
  if (s.bestOfThree && s.mode !== "race")
    throw new Error("Best-of-three rivalries require Race mode.");
  return s;
}

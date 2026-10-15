import { createGame as createCurrentGame } from "../lib/game.ts";
export function createGame(...args: Parameters<typeof createCurrentGame>) {
  const game = createCurrentGame(...args);
  game.puzzleKind = "legacy";
  return game;
}

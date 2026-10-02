import { validateSettings, NEW_ROOM_SETTINGS } from "@/lib/game-settings";
import { validateAvatar } from "@/lib/profiles";
import { env } from "cloudflare:workers";
import {
  createGame,
  normalizeGame,
  joinGame,
  mutateGame,
  snapshot,
  GameError,
  type GameState,
  type Action,
} from "@/lib/game";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
function nameOf(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.trim().length < 1 ||
    value.trim().length > 20
  )
    throw new GameError("Choose a name with 1–20 characters.");
  return value.trim().replace(/\s+/g, " ");
}
function db(): D1Database {
  if (!env.DB) throw new Error("Game database is not configured.");
  return env.DB;
}
export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 4096) return json({ error: "Request too large." }, 413);
    let a: Action & { code?: string };
    try {
      a = JSON.parse(text);
    } catch {
      return json({ error: "Invalid request." }, 400);
    }
    if (!a || typeof a !== "object" || typeof a.op !== "string")
      throw new GameError("Choose a game action.");
    let avatar;
    try {
      avatar = validateAvatar(a.avatar);
    } catch (e) {
      throw new GameError((e as Error).message);
    }
    const database = db();
    if (a.op === "create") {
      const name = nameOf(a.name);
      a.difficulty ??= "junior";
      if (a.difficulty !== "junior" && a.difficulty !== "senior")
        throw new GameError("Choose Junior or Senior.");
      const token = crypto.randomUUID() + crypto.randomUUID(),
        playerId = crypto.randomUUID();
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
      for (let attempt = 0; attempt < 5; attempt++) {
        const bytes = crypto.getRandomValues(new Uint8Array(6));
        const code = Array.from(
          bytes,
          (b) => alphabet[b % alphabet.length],
        ).join("");
        const now = Date.now();
        let settings;
        try {
          settings = validateSettings({
            mode: a.mode ?? NEW_ROOM_SETTINGS.mode,
            gameDifficulty:
              a.gameDifficulty ?? NEW_ROOM_SETTINGS.gameDifficulty,
            botSkill: a.botSkill ?? NEW_ROOM_SETTINGS.botSkill,
            fillBots: a.fillBots ?? NEW_ROOM_SETTINGS.fillBots,
          });
        } catch (e) {
          throw new GameError((e as Error).message);
        }
        const game = createGame(
          code,
          name,
          a.difficulty,
          token,
          playerId,
          now,
          avatar,
          settings,
        );
        const saved = await database
          .prepare(
            "INSERT OR IGNORE INTO rooms (code,state,version,created_at) VALUES (?,?,0,?)",
          )
          .bind(code, JSON.stringify(game), now)
          .run();
        if (saved.meta.changes) {
          await database
            .prepare("DELETE FROM rooms WHERE created_at < ?")
            .bind(now - 86400000)
            .run();
          return json({
            session: { code, token, playerId },
            game: snapshot(game, 0, now, playerId),
          });
        }
      }
      throw new GameError("Could not create a room. Please try again.", 503);
    }
    if (typeof a.code !== "string" || !/^[A-Z]{6}$/.test(a.code))
      throw new GameError("Enter a six-letter room code.");
    if (
      a.op !== "join" &&
      (typeof a.token !== "string" || a.token.length > 100)
    )
      throw new GameError("Missing player session.", 401);
    if (
      a.op !== "state" &&
      a.op !== "join" &&
      (typeof a.id !== "string" || a.id.length > 80)
    )
      throw new GameError("Missing action identifier.");
    const joinToken = crypto.randomUUID() + crypto.randomUUID(),
      joinId = crypto.randomUUID();
    // Compare-and-swap makes each update atomic: concurrent players retry against the latest state.
    for (let attempt = 0; attempt < 12; attempt++) {
      const row = await database
        .prepare("SELECT state,version,created_at FROM rooms WHERE code = ?")
        .bind(a.code)
        .first<{ state: string; version: number; created_at: number }>();
      if (!row || Date.now() - row.created_at > 86400000)
        throw new GameError(
          "Room not found or expired. Check the code with your host.",
          404,
        );
      const game: GameState = normalizeGame(JSON.parse(row.state)),
        now = Date.now();
      let error: GameError | null = null;
      try {
        if (a.op === "join") {
          const name = nameOf(a.name);
          joinGame(game, name, avatar, joinToken, joinId, now);
        } else mutateGame(game, a, now);
      } catch (e) {
        if (e instanceof GameError) error = e;
        else throw e;
      }
      if (error?.status === 401 || (a.op === "join" && error))
        return json({ error: error.message }, error.status);
      const saved = await database
        .prepare(
          "UPDATE rooms SET state = ?, version = version + 1 WHERE code = ? AND version = ?",
        )
        .bind(JSON.stringify(game), a.code, row.version)
        .run();
      if (!saved.meta.changes) continue;
      const viewerId =
        a.op === "join"
          ? joinId
          : game.players.find((p) => p.kind === "human" && p.token === a.token)
              ?.id;
      const view =
        a.op === "leave"
          ? null
          : snapshot(game, row.version + 1, now, viewerId);
      if (error)
        return json({ error: error.message, game: view }, error.status);
      return json({
        game: view,
        ...(a.op === "join"
          ? { session: { code: a.code, token: joinToken, playerId: joinId } }
          : {}),
      });
    }
    return json({ error: "Your team is very busy. Please try again." }, 409);
  } catch (e) {
    if (e instanceof GameError) return json({ error: e.message }, e.status);
    console.error(
      "Game request failed",
      e instanceof Error ? e.message : "unknown error",
    );
    return json(
      {
        error:
          "The laboratory connection is unavailable. Your answers are preserved. Try again shortly.",
      },
      503,
    );
  }
}

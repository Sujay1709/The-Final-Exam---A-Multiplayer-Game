import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export type DatabaseConfig =
  | { kind: "remote"; url: string; authToken: string }
  | { kind: "local"; file: string };

export function localDatabasePath(root: string, override?: string) {
  if (override?.trim()) return path.resolve(root, override.trim());
  const legacyDir = path.join(
    root,
    ".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
  );
  const files = existsSync(legacyDir)
    ? readdirSync(legacyDir).filter(
        (file) => file.endsWith(".sqlite") && file !== "metadata.sqlite",
      )
    : [];
  if (files.length > 1)
    throw new Error(
      "Several local databases found. Set GAME_SQLITE_PATH explicitly.",
    );
  // Reuse the existing D1 SQLite file; no destructive data conversion is needed.
  return files.length === 1
    ? path.join(legacyDir, files[0])
    : path.join(root, ".data/rooms.sqlite");
}

export function databaseConfig(
  env: Readonly<Record<string, string | undefined>>,
  root: string,
): DatabaseConfig {
  const url = env.TURSO_DATABASE_URL?.trim();
  const authToken = env.TURSO_AUTH_TOKEN?.trim();
  if (url || authToken) {
    if (!url || !authToken)
      throw new Error("Set both TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.");
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("Invalid remote database URL.");
    }
    if (
      !["libsql:", "https:"].includes(parsed.protocol) ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error(
        "Use a libsql:// or https:// database URL without embedded credentials.",
      );
    }
    return { kind: "remote", url, authToken };
  }
  // A function-local file would silently split the room across Vercel instances.
  if (
    env.VERCEL ||
    (env.NODE_ENV === "production" && !env.GAME_SQLITE_PATH?.trim())
  ) {
    throw new Error(
      "Hosted multiplayer requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.",
    );
  }
  return { kind: "local", file: localDatabasePath(root, env.GAME_SQLITE_PATH) };
}

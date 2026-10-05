import { createClient } from "@libsql/client/web";
import { createRoomStore } from "./sql-store.ts";

export function remoteRoomStore(url: string, authToken: string) {
  const client = createClient({ url, authToken, intMode: "number" });
  let initialized: Promise<void> | undefined;
  const ensureSchema = () => {
    // A new hosted database starts empty; concurrent first requests share this setup.
    initialized ??= client
      .execute(`CREATE TABLE IF NOT EXISTS rooms (
        code TEXT PRIMARY KEY NOT NULL,
        state TEXT NOT NULL,
        version INTEGER DEFAULT 0 NOT NULL,
        created_at INTEGER NOT NULL
      )`)
      .then(() => {})
      .catch((error) => {
        initialized = undefined;
        throw error;
      });
    return initialized;
  };
  return createRoomStore(async (sql, args) => {
    await ensureSchema();
    const result = await client.execute({ sql, args });
    return { rows: result.rows, rowsAffected: result.rowsAffected };
  });
}

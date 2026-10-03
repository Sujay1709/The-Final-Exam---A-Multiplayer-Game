import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createRoomStore } from "./sql-store.ts";

export function openLocalRoomStore(file: string) {
  mkdirSync(path.dirname(file), { recursive: true });
  const database = new DatabaseSync(file);
  database.exec("PRAGMA busy_timeout = 5000");
  database.exec(`CREATE TABLE IF NOT EXISTS rooms (
    code TEXT PRIMARY KEY NOT NULL,
    state TEXT NOT NULL,
    version INTEGER DEFAULT 0 NOT NULL,
    created_at INTEGER NOT NULL
  )`);
  const store = createRoomStore(async (sql, args) => {
    const statement = database.prepare(sql);
    if (sql.startsWith("SELECT")) {
      return { rows: statement.all(...args), rowsAffected: 0 };
    }
    return { rows: [], rowsAffected: Number(statement.run(...args).changes) };
  });
  return { store, close: () => database.close() };
}

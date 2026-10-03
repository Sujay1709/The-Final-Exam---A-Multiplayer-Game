export type SqlValue = string | number;
export type SqlExecutor = (
  sql: string,
  args: SqlValue[],
) => Promise<{ rows: Record<string, unknown>[]; rowsAffected: number }>;

export type RoomRecord = { state: string; version: number; created_at: number };
export type RoomStore = ReturnType<typeof createRoomStore>;

// Both backends run the same SQL, including the atomic version check.
export function createRoomStore(execute: SqlExecutor) {
  return {
    async createRoom(code: string, state: string, createdAt: number) {
      const result = await execute(
        "INSERT OR IGNORE INTO rooms (code,state,version,created_at) VALUES (?,?,0,?)",
        [code, state, createdAt],
      );
      return result.rowsAffected === 1;
    },
    async readRoom(code: string): Promise<RoomRecord | null> {
      const result = await execute(
        "SELECT state,version,created_at FROM rooms WHERE code = ?",
        [code],
      );
      const row = result.rows[0];
      if (!row) return null;
      if (
        typeof row.state !== "string" ||
        typeof row.version !== "number" ||
        typeof row.created_at !== "number"
      )
        throw new Error("Invalid room record.");
      return {
        state: row.state,
        version: row.version,
        created_at: row.created_at,
      };
    },
    async updateRoom(code: string, state: string, expectedVersion: number) {
      const result = await execute(
        "UPDATE rooms SET state = ?, version = version + 1 WHERE code = ? AND version = ?",
        [state, code, expectedVersion],
      );
      return result.rowsAffected === 1;
    },
    async deleteExpired(cutoff: number) {
      await execute("DELETE FROM rooms WHERE created_at < ?", [cutoff]);
    },
  };
}

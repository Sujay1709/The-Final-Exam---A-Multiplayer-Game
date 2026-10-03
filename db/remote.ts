import { createClient } from "@libsql/client/web";
import { createRoomStore } from "./sql-store.ts";

export function remoteRoomStore(url: string, authToken: string) {
  const client = createClient({ url, authToken, intMode: "number" });
  return createRoomStore(async (sql, args) => {
    const result = await client.execute({ sql, args });
    return { rows: result.rows, rowsAffected: result.rowsAffected };
  });
}

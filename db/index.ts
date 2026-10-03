import "server-only";
import { databaseConfig } from "./config";
import type { RoomStore } from "./sql-store";

let pendingStore: Promise<RoomStore> | undefined;

export function getRoomStore(): Promise<RoomStore> {
  pendingStore ??= openStore().catch((error) => {
    pendingStore = undefined;
    throw error;
  });
  return pendingStore;
}

async function openStore(): Promise<RoomStore> {
  const config = databaseConfig(process.env, process.cwd());
  if (config.kind === "remote") {
    const { remoteRoomStore } = await import("./remote");
    return remoteRoomStore(config.url, config.authToken);
  }
  const { openLocalRoomStore } = await import("./local");
  return openLocalRoomStore(config.file).store;
}

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { databaseConfig, localDatabasePath } from "../db/config.ts";
import { openLocalRoomStore } from "../db/local.ts";

function temporaryRoot() {
  return mkdtempSync(path.join(tmpdir(), "final-exam-store-"));
}

test("hosted storage fails closed without a shared database", () => {
  for (const env of [
    { VERCEL: "1" },
    { VERCEL: "1", GAME_SQLITE_PATH: "/tmp/rooms.sqlite" },
    { NODE_ENV: "production" as const },
  ])
    assert.throws(
      () => databaseConfig(env, "/tmp"),
      /Hosted multiplayer requires/,
    );
});

test("remote configuration requires both credentials and a secure URL", () => {
  const valid = {
    TURSO_DATABASE_URL: "libsql://test.turso.io",
    TURSO_AUTH_TOKEN: "private-test-token",
    VERCEL: "1",
  };
  assert.deepEqual(databaseConfig(valid, "/tmp"), {
    kind: "remote",
    url: valid.TURSO_DATABASE_URL,
    authToken: valid.TURSO_AUTH_TOKEN,
  });
  assert.throws(
    () =>
      databaseConfig({ TURSO_DATABASE_URL: valid.TURSO_DATABASE_URL }, "/tmp"),
    /Set both/,
  );
  assert.throws(
    () => databaseConfig({ TURSO_AUTH_TOKEN: "token" }, "/tmp"),
    /Set both/,
  );
  for (const url of [
    "file:/tmp/room.sqlite",
    "http://insecure.example",
    "https://name:secret@example.com",
    "https://example.com?token=secret",
    "invalid",
  ]) {
    assert.throws(() =>
      databaseConfig({ ...valid, TURSO_DATABASE_URL: url }, "/tmp"),
    );
  }
});

test("local storage discovers the preserved D1 file without changing its data", async (t) => {
  const root = temporaryRoot();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const legacy = path.join(
    root,
    ".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
  );
  mkdirSync(legacy, { recursive: true });
  const file = path.join(legacy, "original.sqlite");
  let connection = openLocalRoomStore(file);
  assert.equal(
    await connection.store.createRoom("ABCDEF", '{"preserved":true}', 123),
    true,
  );
  connection.close();
  assert.equal(localDatabasePath(root), file);
  connection = openLocalRoomStore(localDatabasePath(root));
  assert.deepEqual(await connection.store.readRoom("ABCDEF"), {
    state: '{"preserved":true}',
    version: 0,
    created_at: 123,
  });
  connection.close();
});

test("ambiguous legacy databases require an explicit selection", (t) => {
  const root = temporaryRoot();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = path.join(
    root,
    ".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
  );
  for (const name of ["a.sqlite", "b.sqlite", "metadata.sqlite"]) {
    openLocalRoomStore(path.join(directory, name)).close();
  }
  assert.throws(() => localDatabasePath(root), /Several local databases/);
  assert.equal(
    localDatabasePath(root, ".data/custom.sqlite"),
    path.join(root, ".data/custom.sqlite"),
  );
});

test("room creation is collision-safe and state survives a reopened connection", async (t) => {
  const root = temporaryRoot();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, "rooms.sqlite");
  const first = openLocalRoomStore(file);
  assert.equal(
    await first.store.createRoom("ABCDEF", '{"score":0}', 200),
    true,
  );
  assert.equal(
    await first.store.createRoom("ABCDEF", '{"score":999}', 300),
    false,
  );
  first.close();
  const second = openLocalRoomStore(file);
  assert.deepEqual(await second.store.readRoom("ABCDEF"), {
    state: '{"score":0}',
    version: 0,
    created_at: 200,
  });
  assert.equal(await second.store.readRoom("MISSING"), null);
  second.close();
});

test("concurrent stores accept one versioned update and reject stale writes", async (t) => {
  const root = temporaryRoot();
  const file = path.join(root, "rooms.sqlite");
  const first = openLocalRoomStore(file),
    second = openLocalRoomStore(file);
  t.after(() => {
    first.close();
    second.close();
    rmSync(root, { recursive: true, force: true });
  });
  await first.store.createRoom("ABCDEF", "initial", 100);
  const attempts = await Promise.all(
    Array.from({ length: 16 }, (_, index) =>
      (index % 2 ? first : second).store.updateRoom(
        "ABCDEF",
        `winner-${index}`,
        0,
      ),
    ),
  );
  assert.equal(attempts.filter(Boolean).length, 1);
  assert.deepEqual(await second.store.readRoom("ABCDEF"), {
    state: "winner-0",
    version: 1,
    created_at: 100,
  });
  assert.equal(await first.store.updateRoom("ABCDEF", "stale", 0), false);
  assert.equal(await second.store.updateRoom("ABCDEF", "next", 1), true);
  assert.equal((await first.store.readRoom("ABCDEF"))?.version, 2);
});

test("expiry removes only older rooms and SQL parameters cannot change the query", async (t) => {
  const root = temporaryRoot();
  const connection = openLocalRoomStore(path.join(root, "rooms.sqlite"));
  t.after(() => {
    connection.close();
    rmSync(root, { recursive: true, force: true });
  });
  await connection.store.createRoom("OLDER", "old", 99);
  await connection.store.createRoom("ABCDEF", "current", 100);
  const injection = "'; DELETE FROM rooms; --";
  await connection.store.createRoom(injection, "literal", 101);
  await connection.store.deleteExpired(100);
  assert.equal(await connection.store.readRoom("OLDER"), null);
  assert.equal((await connection.store.readRoom("ABCDEF"))?.state, "current");
  assert.equal((await connection.store.readRoom(injection))?.state, "literal");
});

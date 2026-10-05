import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { remoteRoomStore } from "../db/remote.ts";

// Exercise the real web SDK against the documented Hrana HTTP wire protocol.
// This fixture is not a claim that a live Turso account has been provisioned.
test("remote web client preserves SQL types, atomic updates, expiry, and auth failures", async (t) => {
  const database = new DatabaseSync(":memory:");
  // Start empty so the first request also proves hosted schema initialization.
  const token = "fixture-only-token";
  let calls = 0;
  const server = createServer(async (request, response) => {
    try {
      assert.match(request.url || "", /\/v[23]\/pipeline$/);
      if (request.headers.authorization !== `Bearer ${token}`) {
        response.writeHead(401).end("Unauthorized fixture request");
        return;
      }
      calls++;
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const body = JSON.parse(Buffer.concat(chunks).toString());
      const results = body.requests.map(
        (operation: {
          type: string;
          stmt: {
            sql: string;
            args: { type: string; value: string | number }[];
          };
        }) => {
          if (operation.type === "close")
            return { type: "ok", response: { type: "close" } };
          assert.equal(operation.type, "execute");
          const { sql, args } = operation.stmt;
          const values = args.map((arg) =>
            arg.type === "integer" ? Number(arg.value) : arg.value,
          );
          const statement = database.prepare(sql);
          const cols = statement
            .columns()
            .map((column) => ({ name: column.name, decltype: column.type }));
          let rows: { type: string; value: string }[][] = [],
            affected = 0;
          if (sql.startsWith("SELECT")) {
            rows = statement.all(...values).map((row) =>
              cols.map((column) => {
                const value = row[column.name];
                return typeof value === "number"
                  ? { type: "integer", value: String(value) }
                  : { type: "text", value: String(value) };
              }),
            );
          } else {
            affected = Number(statement.run(...values).changes);
          }
          return {
            type: "ok",
            response: {
              type: "execute",
              result: {
                cols,
                rows,
                affected_row_count: affected,
                last_insert_rowid: "0",
              },
            },
          };
        },
      );
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ baton: null, base_url: null, results }));
    } catch {
      response.writeHead(500).end("Invalid fixture request");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    database.close();
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}`;
  const first = remoteRoomStore(url, token),
    second = remoteRoomStore(url, token);
  assert.equal(await first.createRoom("ABCDEF", '{"score":0}', 100), true);
  assert.equal(await second.createRoom("ABCDEF", "overwrite", 101), false);
  assert.deepEqual(await second.readRoom("ABCDEF"), {
    state: '{"score":0}',
    version: 0,
    created_at: 100,
  });
  assert.deepEqual(
    await Promise.all([
      first.updateRoom("ABCDEF", "first", 0),
      second.updateRoom("ABCDEF", "second", 0),
    ]).then((values) => values.filter(Boolean).length),
    1,
  );
  const saved = await first.readRoom("ABCDEF");
  assert.equal(saved?.version, 1);
  assert.ok(["first", "second"].includes(saved?.state || ""));
  await first.deleteExpired(100);
  assert.ok(await first.readRoom("ABCDEF"));
  await second.deleteExpired(101);
  assert.equal(await first.readRoom("ABCDEF"), null);
  await assert.rejects(() =>
    remoteRoomStore(url, "wrong-fixture-token").readRoom("ABCDEF"),
  );
  assert.ok(calls >= 9);
});
